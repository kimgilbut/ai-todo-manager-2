-- AI Todo Manager - Supabase Database Schema 
-- PRD 문서 기반 데이터베이스 구조

-- =============================================
-- 1. 사용자 프로필 테이블 (public.users)
-- =============================================

-- auth.users와 1:1로 연결되는 사용자 프로필 테이블
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================
-- 2. 할 일 관리 테이블 (public.todos) - PRD v2.0 업데이트
-- =============================================

-- 기존 테이블이 있는지 확인하고 적절히 처리
DO $$
BEGIN
    -- 기존 todos 테이블이 있는지 확인
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'todos') THEN
        -- 기존 테이블의 컬럼 구조 확인
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'todos' AND column_name = 'is_completed') THEN
            RAISE NOTICE '기존 v1.0 스키마가 감지되었습니다. migration_v1_to_v2.sql 파일을 먼저 실행해주세요.';
            RAISE EXCEPTION '기존 스키마 마이그레이션이 필요합니다. migration_v1_to_v2.sql을 실행하세요.';
        END IF;
    END IF;
END $$;

-- 각 사용자별 할 일을 관리하는 테이블 (우선순위, 카테고리 추가)
CREATE TABLE IF NOT EXISTS public.todos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    priority VARCHAR(10) NOT NULL DEFAULT '중간' CHECK (priority IN ('높음', '중간', '낮음')),
    category VARCHAR(50) NOT NULL DEFAULT '업무' CHECK (category IN ('업무', '개인', '학습')),
    completed BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================
-- 3. 인덱스 생성 (성능 최적화)
-- =============================================

-- users 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- todos 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON public.todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_completed ON public.todos(completed);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON public.todos(due_date);
CREATE INDEX IF NOT EXISTS idx_todos_created_at ON public.todos(created_at);
CREATE INDEX IF NOT EXISTS idx_todos_priority ON public.todos(priority);
CREATE INDEX IF NOT EXISTS idx_todos_category ON public.todos(category);
CREATE INDEX IF NOT EXISTS idx_todos_user_completed ON public.todos(user_id, completed);
CREATE INDEX IF NOT EXISTS idx_todos_user_priority ON public.todos(user_id, priority);
CREATE INDEX IF NOT EXISTS idx_todos_user_category ON public.todos(user_id, category);

-- =============================================
-- 4. RLS (Row Level Security) 활성화
-- =============================================

-- users 테이블 RLS 활성화
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- todos 테이블 RLS 활성화
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 5. RLS 정책 설정
-- =============================================

-- users 테이블 정책: 사용자는 자신의 프로필만 조회/수정 가능
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- todos 테이블 정책: 사용자는 자신의 할 일만 조회/수정/삭제 가능
CREATE POLICY "Users can view own todos" ON public.todos
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own todos" ON public.todos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own todos" ON public.todos
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own todos" ON public.todos
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 6. 사용자 프로필 자동 생성 함수
-- =============================================

-- 새 사용자 가입 시 자동으로 프로필 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.users에 새 사용자 추가 시 트리거
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 7. 뷰 생성 (편의성 향상) - PRD v2.0 업데이트
-- =============================================

-- 사용자별 할 일 통계 뷰 (우선순위, 카테고리 통계 포함)
CREATE OR REPLACE VIEW public.user_todo_stats AS
SELECT 
    u.id as user_id,
    u.email,
    COUNT(t.id) as total_todos,
    COUNT(CASE WHEN t.completed = true THEN 1 END) as completed_todos,
    COUNT(CASE WHEN t.completed = false THEN 1 END) as pending_todos,
    COUNT(CASE WHEN t.due_date < NOW() AND t.completed = false THEN 1 END) as overdue_todos,
    -- 우선순위별 통계
    COUNT(CASE WHEN t.priority = '높음' THEN 1 END) as high_priority_todos,
    COUNT(CASE WHEN t.priority = '중간' THEN 1 END) as medium_priority_todos,
    COUNT(CASE WHEN t.priority = '낮음' THEN 1 END) as low_priority_todos,
    -- 카테고리별 통계
    COUNT(CASE WHEN t.category = '업무' THEN 1 END) as work_todos,
    COUNT(CASE WHEN t.category = '개인' THEN 1 END) as personal_todos,
    COUNT(CASE WHEN t.category = '학습' THEN 1 END) as study_todos
FROM public.users u
LEFT JOIN public.todos t ON u.id = t.user_id
GROUP BY u.id, u.email;

-- RLS 정책을 뷰에도 적용
ALTER VIEW public.user_todo_stats SET (security_invoker = true);

-- =============================================
-- 8. 유틸리티 함수 (AI 요약 및 분석용)
-- =============================================

-- 사용자별 오늘 완료된 할 일 조회 함수
CREATE OR REPLACE FUNCTION public.get_today_completed_todos(user_uuid UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    completed_at TIMESTAMPTZ,
    priority VARCHAR(10),
    category VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.title,
        t.created_at as completed_at, -- completed 필드가 true일 때의 시간
        t.priority,
        t.category
    FROM public.todos t
    WHERE t.user_id = user_uuid 
        AND t.completed = true
        AND DATE(t.created_at) = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 사용자별 주간 통계 함수
CREATE OR REPLACE FUNCTION public.get_weekly_stats(user_uuid UUID)
RETURNS TABLE (
    week_start DATE,
    total_todos INTEGER,
    completed_todos INTEGER,
    completion_rate NUMERIC,
    high_priority_completed INTEGER,
    work_todos_completed INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE_TRUNC('week', t.created_at)::DATE as week_start,
        COUNT(*)::INTEGER as total_todos,
        COUNT(CASE WHEN t.completed = true THEN 1 END)::INTEGER as completed_todos,
        ROUND(
            (COUNT(CASE WHEN t.completed = true THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 
            2
        ) as completion_rate,
        COUNT(CASE WHEN t.completed = true AND t.priority = '높음' THEN 1 END)::INTEGER as high_priority_completed,
        COUNT(CASE WHEN t.completed = true AND t.category = '업무' THEN 1 END)::INTEGER as work_todos_completed
    FROM public.todos t
    WHERE t.user_id = user_uuid 
        AND t.created_at >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY DATE_TRUNC('week', t.created_at)
    ORDER BY week_start DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 9. 샘플 데이터 (개발용 - 선택사항)
-- =============================================

-- 개발 환경에서만 실행하려면 아래 주석을 해제하세요
/*
-- 샘플 사용자 (실제 auth.users에 사용자가 있을 때만 작동)
INSERT INTO public.users (id, email) VALUES 
    ('00000000-0000-0000-0000-000000000001', 'test@example.com')
ON CONFLICT (id) DO NOTHING;

-- 샘플 할 일 (우선순위, 카테고리 포함)
INSERT INTO public.todos (user_id, title, description, due_date, priority, category, completed) VALUES 
    ('00000000-0000-0000-0000-000000000001', '프로젝트 기획서 작성', '다음 주까지 완료해야 할 기획서', NOW() + INTERVAL '7 days', '높음', '업무', false),
    ('00000000-0000-0000-0000-000000000001', '팀 회의 준비', '회의 자료 정리 및 발표 준비', NOW() + INTERVAL '2 days', '중간', '업무', false),
    ('00000000-0000-0000-0000-000000000001', '코드 리뷰', 'PR 리뷰 및 피드백 제공', NOW() + INTERVAL '1 day', '높음', '업무', true),
    ('00000000-0000-0000-0000-000000000001', '운동하기', '헬스장에서 1시간 운동', NOW() + INTERVAL '3 days', '낮음', '개인', false),
    ('00000000-0000-0000-0000-000000000001', 'React 학습', 'Next.js 15 새로운 기능 학습', NOW() + INTERVAL '5 days', '중간', '학습', false)
ON CONFLICT DO NOTHING;
*/

-- =============================================
-- 10. 기존 스키마 마이그레이션 (v1.0 → v2.0)
-- =============================================

-- 기존 스키마가 있다면 다음 명령어로 마이그레이션하세요
/*
-- 1. 기존 todos 테이블 백업
CREATE TABLE public.todos_backup AS SELECT * FROM public.todos;

-- 2. 기존 todos 테이블 삭제
DROP TABLE IF EXISTS public.todos CASCADE;

-- 3. 새로운 todos 테이블 생성 (위의 CREATE TABLE 명령어 실행)

-- 4. 데이터 마이그레이션
INSERT INTO public.todos (id, user_id, title, description, due_date, priority, category, completed, created_at)
SELECT 
    gen_random_uuid() as id,
    user_id,
    title,
    description,
    due_date,
    '중간' as priority,  -- 기본값
    '업무' as category,  -- 기본값
    is_completed as completed,
    created_at
FROM public.todos_backup;

-- 5. 백업 테이블 삭제
DROP TABLE public.todos_backup;
*/

-- =============================================
-- 스키마 생성 완료
-- =============================================

-- 생성된 테이블 확인
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('users', 'todos')
ORDER BY tablename;

-- 생성된 뷰 확인
SELECT 
    schemaname,
    viewname,
    viewowner
FROM pg_views 
WHERE schemaname = 'public' 
    AND viewname = 'user_todo_stats';

-- 생성된 함수 확인
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name IN ('handle_new_user', 'get_today_completed_todos', 'get_weekly_stats')
ORDER BY routine_name;

