import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 분석 기간 타입
 */
type AnalysisPeriod = 'today' | 'week';

/**
 * 할 일 분석 결과 타입
 */
interface AnalysisResult {
  summary: string;
  urgentTasks: string[];
  insights: string[];
  recommendations: string[];
}

/**
 * 날짜 범위 계산 함수
 */
function getDateRange(period: AnalysisPeriod): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  if (period === 'today') {
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    return { start: today, end };
  }
  
  // 이번 주 (월요일부터 일요일)
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 월요일로 조정
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  return { start: weekStart, end: weekEnd };
}

/**
 * AI를 통한 할 일 분석
 */
export async function POST(request: NextRequest) {
  try {
    // 요청 바디 파싱
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { 
          success: false,
          error: '잘못된 요청 형식입니다.' 
        },
        { status: 400 }
      );
    }

    const { period } = body;

    // 기간 검증
    if (!period || !['today', 'week'].includes(period)) {
      return NextResponse.json(
        { 
          success: false,
          error: '분석 기간을 선택해주세요. (today 또는 week)' 
        },
        { status: 400 }
      );
    }

    // Supabase 클라이언트 생성
    const supabase = await createClient();

    // 현재 사용자 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { 
          success: false,
          error: '로그인이 필요합니다.' 
        },
        { status: 401 }
      );
    }

    // 날짜 범위 계산
    const dateRange = getDateRange(period as AnalysisPeriod);

    // 사용자의 할 일 조회
    const { data: todos, error: todosError } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (todosError) {
      console.error('할 일 조회 오류:', todosError);
      return NextResponse.json(
        { 
          success: false,
          error: '할 일 데이터를 불러오는데 실패했습니다.' 
        },
        { status: 500 }
      );
    }

    // 할 일이 없는 경우
    if (!todos || todos.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          summary: '아직 등록된 할 일이 없습니다.',
          urgentTasks: [],
          insights: ['새로운 할 일을 추가해보세요!'],
          recommendations: ['할 일을 추가하고 효율적으로 관리해보세요.'],
        },
      });
    }

    // 기간에 맞는 할 일 필터링
    const filteredTodos = todos.filter(todo => {
      if (!todo.due_date) return false;
      const dueDate = new Date(todo.due_date);
      return dueDate >= dateRange.start && dueDate <= dateRange.end;
    });

    // 필터링된 할 일이 없는 경우
    if (filteredTodos.length === 0) {
      const periodText = period === 'today' ? '오늘' : '이번 주';
      return NextResponse.json({
        success: true,
        data: {
          summary: `${periodText}에 예정된 할 일이 없습니다.`,
          urgentTasks: [],
          insights: [`${periodText}의 일정이 비어있습니다.`],
          recommendations: ['새로운 할 일을 계획해보세요.'],
        },
      });
    }

    // Google API 키 확인
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      console.error('Google API 키가 설정되지 않음');
      return NextResponse.json(
        { 
          success: false,
          error: '서버 설정 오류입니다. 관리자에게 문의해주세요.' 
        },
        { status: 500 }
      );
    }

    // AI 모델 초기화
    const model = google('gemini-2.5-flash');

    // 할 일 데이터 요약
    const todosData = filteredTodos.map(todo => ({
      title: todo.title,
      description: todo.description,
      due_date: todo.due_date,
      priority: todo.priority,
      category: todo.category,
      completed: todo.completed,
      created_at: todo.created_at,
    }));

    const now = new Date();
    const periodText = period === 'today' ? '오늘' : '이번 주';

    // 통계 계산
    const totalCount = filteredTodos.length;
    const completedCount = filteredTodos.filter(t => t.completed).length;
    const pendingCount = totalCount - completedCount;
    const completionRate = totalCount > 0 ? ((completedCount / totalCount) * 100).toFixed(1) : '0';

    // 우선순위별 통계
    const highPriorityTotal = filteredTodos.filter(t => t.priority === '높음').length;
    const highPriorityCompleted = filteredTodos.filter(t => t.priority === '높음' && t.completed).length;
    const mediumPriorityTotal = filteredTodos.filter(t => t.priority === '중간').length;
    const mediumPriorityCompleted = filteredTodos.filter(t => t.priority === '중간' && t.completed).length;
    const lowPriorityTotal = filteredTodos.filter(t => t.priority === '낮음').length;
    const lowPriorityCompleted = filteredTodos.filter(t => t.priority === '낮음' && t.completed).length;

    // 카테고리별 통계
    const categoryStats = filteredTodos.reduce((acc, todo) => {
      const category = todo.category;
      if (!acc[category]) {
        acc[category] = { total: 0, completed: 0 };
      }
      acc[category].total++;
      if (todo.completed) acc[category].completed++;
      return acc;
    }, {} as Record<string, { total: number; completed: number }>);

    // 마감일 분석
    const overdueTasks = filteredTodos.filter(t => {
      if (!t.due_date || t.completed) return false;
      return new Date(t.due_date) < now;
    }).length;

    const todayTasks = filteredTodos.filter(t => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      return dueDateOnly.getTime() === today.getTime();
    }).length;

    // 시간대별 분석 (due_date의 시간 기준)
    const morningTasks = filteredTodos.filter(t => {
      if (!t.due_date) return false;
      const hour = new Date(t.due_date).getHours();
      return hour >= 6 && hour < 12;
    }).length;

    const afternoonTasks = filteredTodos.filter(t => {
      if (!t.due_date) return false;
      const hour = new Date(t.due_date).getHours();
      return hour >= 12 && hour < 18;
    }).length;

    const eveningTasks = filteredTodos.filter(t => {
      if (!t.due_date) return false;
      const hour = new Date(t.due_date).getHours();
      return hour >= 18 && hour < 24;
    }).length;

    // AI 프롬프트 생성
    const prompt = `
당신은 생산성 코치이자 데이터 분석 전문가입니다. 사용자의 할 일 목록을 깊이 있게 분석하여 실용적이고 긍정적인 피드백을 제공해주세요.

### 📊 분석 기간 및 현황
**기간**: ${periodText} (${dateRange.start.toLocaleDateString('ko-KR')} ~ ${dateRange.end.toLocaleDateString('ko-KR')})
**현재 시각**: ${now.toLocaleString('ko-KR')}

### 📈 통계 데이터

**전체 현황**
- 총 할 일: ${totalCount}개
- 완료: ${completedCount}개
- 미완료: ${pendingCount}개
- 완료율: ${completionRate}%

**우선순위별 완료 현황**
- 높음: ${highPriorityCompleted}/${highPriorityTotal}개 완료 ${highPriorityTotal > 0 ? `(${((highPriorityCompleted / highPriorityTotal) * 100).toFixed(1)}%)` : ''}
- 중간: ${mediumPriorityCompleted}/${mediumPriorityTotal}개 완료 ${mediumPriorityTotal > 0 ? `(${((mediumPriorityCompleted / mediumPriorityTotal) * 100).toFixed(1)}%)` : ''}
- 낮음: ${lowPriorityCompleted}/${lowPriorityTotal}개 완료 ${lowPriorityTotal > 0 ? `(${((lowPriorityCompleted / lowPriorityTotal) * 100).toFixed(1)}%)` : ''}

**카테고리별 분포**
${Object.entries(categoryStats).map(([cat, stat]) => {
  const s = stat as { total: number; completed: number };
  return `- ${cat}: ${s.completed}/${s.total}개 완료 (${s.total > 0 ? ((s.completed / s.total) * 100).toFixed(1) : 0}%)`;
}).join('\n')}

**마감일 분석**
- 오늘 마감: ${todayTasks}개
- 연체된 작업: ${overdueTasks}개

**시간대별 작업 분포**
- 오전 (6~12시): ${morningTasks}개
- 오후 (12~18시): ${afternoonTasks}개
- 저녁 (18~24시): ${eveningTasks}개

### 📋 할 일 상세 데이터
${JSON.stringify(todosData, null, 2)}

### 🎯 분석 요청사항

${period === 'today' ? `
**오늘의 요약 특화 분석**
오늘 하루에 집중하여 다음을 분석해주세요:
- 오늘 남은 시간 동안 집중해야 할 우선순위
- 현재까지의 진행 상황 평가
- 오늘 안에 완료 가능한 작업 식별
- 내일로 미루는 게 나은 작업 제안
` : `
**이번 주 요약 특화 분석**
주간 전체를 조망하여 다음을 분석해주세요:
- 주간 생산성 패턴 (요일별 경향)
- 이번 주 목표 달성도 평가
- 다음 주를 위한 준비 사항
- 주간 업무 밸런스 개선 방안
`}

#### 1. 요약 (summary)
- **완료율과 진행 상황을 긍정적으로 표현**
- 사용자가 잘하고 있는 부분을 먼저 언급
- 한 문장으로 간결하게 (예: "총 8개 중 5개 완료! 62.5%의 좋은 진척을 보이고 있어요 👍")

#### 2. 긴급 작업 (urgentTasks)
- 우선순위 "높음" 미완료 작업
- 마감일이 임박하거나 지난 미완료 작업
- 최대 5개까지, 중요도 순으로 정렬
- 없으면 빈 배열 반환

#### 3. 인사이트 (insights) - 3~6개
다음 관점에서 **구체적이고 데이터 기반** 인사이트 제공:

**완료율 분석**
- 전체 완료율 평가 및 긍정적 피드백
- 우선순위별 완료 패턴 파악
- 카테고리별 완료율 비교

**시간 관리 분석**
- 마감일 준수 현황 평가
- 연체된 작업이 있다면 패턴 분석
- 시간대별 작업 집중도 (오전/오후/저녁)

**생산성 패턴**
- 자주 완료하는 작업 유형 식별
- 미완료로 남는 작업의 공통점
- 업무 분산 현황 (한 카테고리에 집중되었는지 등)

**작성 스타일**:
- 친근하고 격려하는 톤
- "~하고 있어요", "~네요", "~는 것 같아요" 등 부드러운 표현
- 긍정적인 면을 먼저 언급하고 개선점은 격려하며 제시

#### 4. 추천 사항 (recommendations) - 3~6개
**실행 가능하고 구체적인 조언** 제공:

**우선순위 관리**
- 긴급 작업부터 처리하는 순서 제안
- 중요하지만 급하지 않은 작업의 시간 배분 조언

**시간 관리 전략**
- 시간대별 최적 작업 배치 (집중력이 높은 시간 활용)
- 업무 과부하 방지를 위한 작업 분산 제안
- 연체된 작업의 마감일 재조정 권유

**실천 가능한 팁**
- 오늘/이번 주에 바로 적용할 수 있는 구체적인 방법
- 작은 성취부터 시작하는 전략
- 휴식과 재충전 시간 확보 제안

**동기부여 메시지**
- 사용자의 노력을 인정하고 격려
- 작은 진전도 축하하는 메시지
- 지속 가능한 생산성 유지 응원

**작성 스타일**:
- "~해보세요", "~하는 것을 추천드려요", "~하면 좋을 것 같아요"
- 압박감 없는 부드러운 제안
- 실행 가능성을 고려한 현실적인 조언

### 📝 출력 형식

반드시 다음 JSON 형식으로만 응답하세요:

{
  "summary": "긍정적이고 격려하는 한 문장 요약",
  "urgentTasks": ["긴급 작업 1", "긴급 작업 2"],
  "insights": [
    "데이터 기반의 구체적인 인사이트 1",
    "긍정적인 톤의 인사이트 2",
    "실용적인 패턴 분석 3",
    "격려하는 메시지를 포함한 인사이트 4"
  ],
  "recommendations": [
    "바로 실천 가능한 구체적인 추천 1",
    "우선순위를 고려한 실용적 조언 2",
    "시간 관리 전략 3",
    "동기부여 메시지를 담은 제안 4"
  ]
}

**중요 규칙**:
1. 순수한 JSON만 반환 (마크다운, 코드 블록 불포함)
2. 모든 텍스트는 자연스러운 한국어로
3. 긍정적이고 격려하는 톤 유지
4. 구체적이고 실행 가능한 내용 제공
5. 사용자의 노력을 인정하고 동기부여
`;


    // AI 분석 실행
    const result = await generateText({
      model,
      prompt,
      temperature: 0.8, // 더 창의적인 응답
    });

    // 응답 파싱
    let analysisResult: AnalysisResult;
    try {
      // 마크다운 코드 블록 제거
      let cleanedText = result.text.trim();
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      analysisResult = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('AI 응답 파싱 오류:', parseError);
      console.error('원본 응답:', result.text);
      
      // 파싱 실패 시 기본 응답 반환
      return NextResponse.json({
        success: true,
        data: {
          summary: `${periodText} 총 ${totalCount}개의 할 일 중 ${completedCount}개 완료 (${completionRate}%)`,
          urgentTasks: filteredTodos
            .filter(t => !t.completed && t.priority === '높음')
            .slice(0, 5)
            .map(t => t.title),
          insights: [
            `완료율은 ${completionRate}%입니다.`,
            `${totalCount - completedCount}개의 할 일이 아직 남아있습니다.`,
          ],
          recommendations: [
            '우선순위가 높은 작업부터 처리해보세요.',
            '작은 할 일부터 하나씩 완료하며 성취감을 느껴보세요.',
          ],
        },
      });
    }

    // 개발 환경에서 로그
    if (process.env.NODE_ENV === 'development') {
      console.log('=== AI 할 일 분석 결과 ===');
      console.log('기간:', periodText);
      console.log('할 일 개수:', totalCount);
      console.log('완료율:', completionRate + '%');
      console.log('우선순위별 완료율:');
      console.log(`  - 높음: ${highPriorityCompleted}/${highPriorityTotal}`);
      console.log(`  - 중간: ${mediumPriorityCompleted}/${mediumPriorityTotal}`);
      console.log(`  - 낮음: ${lowPriorityCompleted}/${lowPriorityTotal}`);
      console.log('연체된 작업:', overdueTasks);
      console.log('시간대별 분포: 오전', morningTasks, '/ 오후', afternoonTasks, '/ 저녁', eveningTasks);
      console.log('분석 결과:', JSON.stringify(analysisResult, null, 2));
      console.log('========================\n');
    }

    return NextResponse.json({
      success: true,
      data: analysisResult,
    });

  } catch (error: unknown) {
    console.error('AI 분석 오류:', error);

    const err = error as Error;

    // 개발 환경에서 상세 오류 로그
    if (process.env.NODE_ENV === 'development') {
      console.error('상세 오류 정보:', {
        message: err.message,
        stack: err.stack,
      });
    }

    // AI API 오류 처리
    if (err.message?.includes('quota') || err.message?.includes('limit')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'AI 서비스 사용량이 일시적으로 초과되었습니다. 잠시 후 다시 시도해주세요.' 
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'AI 분석 중 오류가 발생했습니다. 다시 시도해주세요.' 
      },
      { status: 500 }
    );
  }
}

