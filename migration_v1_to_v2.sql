-- AI Todo Manager - Supabase Database Migration v1.0 → v2.0
-- 기존 스키마를 PRD v2.0 구조로 마이그레이션

-- =============================================
-- 1. 기존 테이블 구조 확인
-- =============================================

-- 현재 todos 테이블의 컬럼 정보 확인
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'todos'
ORDER BY ordinal_position;

-- =============================================
-- 2. 기존 데이터 백업
-- =============================================

-- 기존 todos 테이블 백업
CREATE TABLE IF NOT EXISTS public.todos_backup AS 
SELECT * FROM public.todos;

-- 백업 확인
SELECT COUNT(*) as backup_count FROM public.todos_backup;

-- =============================================
-- 3. 기존 테이블 삭제 (CASCADE로 관련 객체도 함께 삭제)
-- =============================================

-- 기존 todos 테이블과 관련된 모든 객체 삭제
DROP TABLE IF EXISTS public.todos CASCADE;

-- =============================================
-- 4. 새로운 todos 테이블 생성 (PRD v2.0 구조)
-- =============================================

-- PRD v2.0에 맞는 새로운 todos 테이블 생성
CREATE TABLE public.todos (
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
-- 5. 인덱스 재생성
-- =============================================

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
-- 6. RLS 활성화 및 정책 재생성
-- =============================================

-- RLS 활성화
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- RLS 정책 재생성
CREATE POLICY "Users can view own todos" ON public.todos
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own todos" ON public.todos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own todos" ON public.todos
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own todos" ON public.todos
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 7. 기존 데이터 마이그레이션
-- =============================================

-- 백업된 데이터를 새로운 구조로 마이그레이션
INSERT INTO public.todos (id, user_id, title, description, due_date, priority, category, completed, created_at)
SELECT 
    gen_random_uuid() as id,  -- 새로운 UUID 생성
    user_id,
    title,
    description,
    due_date,
    '중간' as priority,  -- 기본값: 중간
    '업무' as category,  -- 기본값: 업무
    COALESCE(is_completed, false) as completed,  -- is_completed → completed
    COALESCE(created_at, NOW()) as created_at
FROM public.todos_backup
WHERE user_id IS NOT NULL;  -- user_id가 있는 데이터만 마이그레이션

-- 마이그레이션 결과 확인
SELECT 
    COUNT(*) as migrated_count,
    COUNT(CASE WHEN completed = true THEN 1 END) as completed_count,
    COUNT(CASE WHEN completed = false THEN 1 END) as pending_count
FROM public.todos;

-- =============================================
-- 8. 통계 뷰 재생성
-- =============================================

-- 기존 뷰 삭제 (있다면)
DROP VIEW IF EXISTS public.user_todo_stats;

-- 새로운 통계 뷰 생성
CREATE VIEW public.user_todo_stats AS
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
-- 9. AI 요약 및 분석용 함수 재생성
-- =============================================

-- 오늘 완료된 할 일 조회 함수
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
        t.created_at as completed_at,
        t.priority,
        t.category
    FROM public.todos t
    WHERE t.user_id = user_uuid 
        AND t.completed = true
        AND DATE(t.created_at) = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 주간 통계 함수
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
-- 10. 마이그레이션 검증
-- =============================================

-- 테이블 구조 확인
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'todos'
ORDER BY ordinal_position;

-- 데이터 개수 확인
SELECT 
    'Original' as source, 
    COUNT(*) as count 
FROM public.todos_backup
UNION ALL
SELECT 
    'Migrated' as source, 
    COUNT(*) as count 
FROM public.todos;

-- 샘플 데이터 확인
SELECT 
    id, 
    title, 
    priority, 
    category, 
    completed, 
    created_at
FROM public.todos 
LIMIT 5;

-- =============================================
-- 11. 백업 테이블 정리 (선택사항)
-- =============================================

-- 마이그레이션이 성공적으로 완료되었다면 백업 테이블 삭제
-- 주의: 이 명령어는 백업 데이터를 완전히 삭제합니다!
-- DROP TABLE IF EXISTS public.todos_backup;

-- =============================================
-- 마이그레이션 완료
-- =============================================

-- 최종 확인
SELECT 
    'Migration completed successfully!' as status,
    (SELECT COUNT(*) FROM public.todos) as total_todos,
    (SELECT COUNT(*) FROM public.todos WHERE completed = true) as completed_todos,
    (SELECT COUNT(*) FROM public.todos WHERE priority = '높음') as high_priority_todos,
    (SELECT COUNT(*) FROM public.todos WHERE category = '업무') as work_todos;
