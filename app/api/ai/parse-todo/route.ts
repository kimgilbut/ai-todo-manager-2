import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

// 상수 정의
const INPUT_MIN_LENGTH = 2;
const INPUT_MAX_LENGTH = 500;
const TITLE_MIN_LENGTH = 2;
const TITLE_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 500;

// AI 파싱 결과 스키마 정의
const TodoParseSchema = z.object({
  title: z.string().describe('할 일의 제목 (간결하고 명확하게, 10~30자 권장)'),
  description: z.string().optional().describe('할 일에 대한 상세 설명 (입력 텍스트의 맥락과 부가 정보를 포함하여 작성, 가능한 한 빈 문자열 지양)'),
  due_date: z.string().describe('마감일 (YYYY-MM-DD 형식, 날짜가 명시되지 않으면 오늘 날짜 사용)'),
  due_time: z.string().describe('마감 시간 (HH:MM 형식, 24시간제, 구체적인 시간이 없으면 09:00 사용)'),
  priority: z.enum(['높음', '중간', '낮음']).describe('우선순위 (급함/중요 키워드 → 높음, 여유/천천히 → 낮음, 기본 → 중간)'),
  category: z.enum(['업무', '개인', '학습', '건강']).describe('카테고리 (키워드 기반으로 가장 적합한 카테고리 선택)'),
});

/**
 * 입력 텍스트 전처리 함수
 */
function preprocessInput(input: string): string {
  // 앞뒤 공백 제거
  let processed = input.trim();
  
  // 연속된 공백을 하나로 통합
  processed = processed.replace(/\s+/g, ' ');
  
  // 연속된 줄바꿈을 하나로 통합
  processed = processed.replace(/\n+/g, '\n');
  
  return processed;
}

/**
 * 입력 텍스트 검증 함수
 */
function validateInput(input: string): { valid: boolean; error?: string } {
  // 빈 문자열 체크
  if (!input || input.length === 0) {
    return {
      valid: false,
      error: '할 일 내용을 입력해주세요.',
    };
  }
  
  // 최소 길이 체크
  if (input.length < INPUT_MIN_LENGTH) {
    return {
      valid: false,
      error: `할 일 내용은 최소 ${INPUT_MIN_LENGTH}자 이상이어야 합니다.`,
    };
  }
  
  // 최대 길이 체크
  if (input.length > INPUT_MAX_LENGTH) {
    return {
      valid: false,
      error: `할 일 내용은 최대 ${INPUT_MAX_LENGTH}자까지 입력 가능합니다. (현재: ${input.length}자)`,
    };
  }
  
  // 의미 있는 문자가 있는지 체크 (한글, 영문, 숫자, 한자 등)
  // 이모지는 허용하되, 실제 텍스트 문자가 있는지 확인
  const hasKorean = /[\u3131-\u318E\uAC00-\uD7A3]/u.test(input); // 한글
  const hasAlphabetic = /[a-zA-Z]/u.test(input); // 영문
  const hasNumeric = /[0-9]/u.test(input); // 숫자
  const hasChinese = /[\u4E00-\u9FFF]/u.test(input); // 한자
  const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF]/u.test(input); // 일본어
  
  // 한글, 영문, 숫자, 한자, 일본어 중 하나라도 있으면 유효한 입력
  const hasMeaningfulText = hasKorean || hasAlphabetic || hasNumeric || hasChinese || hasJapanese;
  
  if (!hasMeaningfulText) {
    return {
      valid: false,
      error: '할 일 내용에 텍스트를 포함해주세요. (한글, 영문, 숫자 등)',
    };
  }
  
  return { valid: true };
}

/**
 * 제목 후처리 함수
 */
function postprocessTitle(title: string): string {
  let processed = title.trim();
  
  // 제목이 너무 짧은 경우 (최소 길이 보장)
  if (processed.length < TITLE_MIN_LENGTH) {
    processed = '새 할 일';
  }
  
  // 제목이 너무 긴 경우 자동 조정
  if (processed.length > TITLE_MAX_LENGTH) {
    processed = processed.substring(0, TITLE_MAX_LENGTH - 3) + '...';
  }
  
  return processed;
}

/**
 * 설명 후처리 함수
 */
function postprocessDescription(description: string | undefined): string {
  if (!description) return '';
  
  let processed = description.trim();
  
  // 설명이 너무 긴 경우 자동 조정
  if (processed.length > DESCRIPTION_MAX_LENGTH) {
    processed = processed.substring(0, DESCRIPTION_MAX_LENGTH - 3) + '...';
  }
  
  return processed;
}

/**
 * 날짜 계산 헬퍼 함수
 */
function getDateHelpers() {
  // 현재 시각 (로컬 시간대)
  const now = new Date();
  
  // 시간대 문제 없이 정확한 오늘 날짜 계산
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // 오늘, 내일, 모레
  const tomorrow = new Date(today.getTime());
  tomorrow.setDate(today.getDate() + 1);
  
  const dayAfterTomorrow = new Date(today.getTime());
  dayAfterTomorrow.setDate(today.getDate() + 2);
  
  // 이번 주 특정 요일 찾기 (0: 일요일, 1: 월요일, ..., 6: 토요일)
  const getCurrentWeekDay = (targetDay: number) => {
    const currentDay = today.getDay();
    const diff = targetDay - currentDay;
    const result = new Date(today.getTime());
    result.setDate(today.getDate() + (diff >= 0 ? diff : 7 + diff));
    return result;
  };
  
  // 다음 주 특정 요일 찾기
  const getNextWeekDay = (targetDay: number) => {
    const result = getCurrentWeekDay(targetDay);
    result.setDate(result.getDate() + 7);
    return result;
  };
  
  // YYYY-MM-DD 형식으로 변환 (로컬 시간대 사용)
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  return {
    today: formatDate(today),
    tomorrow: formatDate(tomorrow),
    dayAfterTomorrow: formatDate(dayAfterTomorrow),
    thisMonday: formatDate(getCurrentWeekDay(1)),
    thisTuesday: formatDate(getCurrentWeekDay(2)),
    thisWednesday: formatDate(getCurrentWeekDay(3)),
    thisThursday: formatDate(getCurrentWeekDay(4)),
    thisFriday: formatDate(getCurrentWeekDay(5)),
    thisSaturday: formatDate(getCurrentWeekDay(6)),
    thisSunday: formatDate(getCurrentWeekDay(0)),
    nextMonday: formatDate(getNextWeekDay(1)),
    nextTuesday: formatDate(getNextWeekDay(2)),
    nextWednesday: formatDate(getNextWeekDay(3)),
    nextThursday: formatDate(getNextWeekDay(4)),
    nextFriday: formatDate(getNextWeekDay(5)),
    nextSaturday: formatDate(getNextWeekDay(6)),
    nextSunday: formatDate(getNextWeekDay(0)),
    currentDayOfWeek: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'][now.getDay()],
    currentYear: now.getFullYear(),
    currentMonth: now.getMonth() + 1,
    currentDate: now.getDate(),
  };
}

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
          error: '잘못된 요청 형식입니다. JSON 형식으로 데이터를 전송해주세요.' 
        },
        { status: 400 }
      );
    }

    const { input } = body;

    // 입력 타입 검증
    if (!input || typeof input !== 'string') {
      return NextResponse.json(
        { 
          success: false,
          error: '할 일 내용은 문자열이어야 합니다.' 
        },
        { status: 400 }
      );
    }

    // 입력 전처리
    const processedInput = preprocessInput(input);

    // 입력 검증
    const validation = validateInput(processedInput);
    if (!validation.valid) {
      return NextResponse.json(
        { 
          success: false,
          error: validation.error 
        },
        { status: 400 }
      );
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

    // 날짜 계산 헬퍼
    const dates = getDateHelpers();
    const now = new Date();

    // AI를 통한 자연어 파싱
    const result = await generateObject({
      model,
      schema: TodoParseSchema,
      prompt: `
당신은 한국어 자연어를 구조화된 할 일 데이터로 변환하는 전문가입니다.
아래 규칙을 **정확히** 따라 입력을 분석해주세요.

### 입력
"${processedInput}"

### 현재 시점 정보 (중요!)
- **오늘 날짜: ${dates.today} (${dates.currentYear}년 ${dates.currentMonth}월 ${dates.currentDate}일, ${dates.currentDayOfWeek})**
- 현재 시간: ${now.toLocaleTimeString('ko-KR', { hour12: false })}
- 내일: ${dates.tomorrow}
- 모레: ${dates.dayAfterTomorrow}

### ⚠️ 중요 규칙 ⚠️
1. **절대로 과거 날짜를 생성하지 마세요!**
2. **날짜가 명시되지 않은 경우 반드시 오늘(${dates.today})을 사용하세요!**
3. **"오늘"이라는 단어가 없어도, 날짜 표현이 없으면 오늘(${dates.today})입니다!**

### 분석 규칙

**1. 날짜 처리 규칙 (반드시 준수)**
상대적 날짜 표현을 다음과 같이 **정확히** 변환하세요:

기본 규칙:
- **날짜 표현이 전혀 없는 경우** → ${dates.today} (반드시!)
- "오늘" → ${dates.today}
- "내일" → ${dates.tomorrow}
- "모레" → ${dates.dayAfterTomorrow}

이번 주 요일:
- "이번 주 월요일" 또는 "이번주 월요일" → ${dates.thisMonday}
- "이번 주 화요일" 또는 "이번주 화요일" → ${dates.thisTuesday}
- "이번 주 수요일" 또는 "이번주 수요일" → ${dates.thisWednesday}
- "이번 주 목요일" 또는 "이번주 목요일" → ${dates.thisThursday}
- "이번 주 금요일" 또는 "이번주 금요일" → ${dates.thisFriday}
- "이번 주 토요일" 또는 "이번주 토요일" → ${dates.thisSaturday}
- "이번 주 일요일" 또는 "이번주 일요일" → ${dates.thisSunday}

다음 주 요일:
- "다음 주 월요일" 또는 "다음주 월요일" → ${dates.nextMonday}
- "다음 주 화요일" 또는 "다음주 화요일" → ${dates.nextTuesday}
- "다음 주 수요일" 또는 "다음주 수요일" → ${dates.nextWednesday}
- "다음 주 목요일" 또는 "다음주 목요일" → ${dates.nextThursday}
- "다음 주 금요일" 또는 "다음주 금요일" → ${dates.nextFriday}
- "다음 주 토요일" 또는 "다음주 토요일" → ${dates.nextSaturday}
- "다음 주 일요일" 또는 "다음주 일요일" → ${dates.nextSunday}

**예시**:
- "급하게 보고서 제출하기" → 날짜 없음 → ${dates.today}
- "보고서 작성" → 날짜 없음 → ${dates.today}
- "프로젝트 준비" → 날짜 없음 → ${dates.today}

**2. 시간 처리 규칙 (반드시 준수)**
시간 표현을 다음과 같이 변환하세요:
- 구체적인 시간이 명시된 경우 **최우선 적용**:
  * "1시", "오전 1시" → 01:00
  * "오후 1시", "오후 한시" → 13:00
  * "2시", "오전 2시" → 02:00
  * "오후 2시" → 14:00
  * "3시", "오전 3시" → 03:00
  * "오후 3시", "오후 세시" → 15:00
  * "15시", "15:00" → 15:00
  * "오후 5시", "저녁 5시" → 17:00
  * "밤 11시", "오후 11시" → 23:00
- 시간대만 명시된 경우 (구체적 시간 없음):
  * "아침" → 09:00
  * "점심" → 12:00
  * "오후" → 14:00
  * "저녁" → 18:00
  * "밤" → 21:00
- 시간이 전혀 명시되지 않은 경우 → 09:00

**중요**: "오후 3시", "저녁 7시"처럼 구체적인 시간이 있으면 반드시 그 시간을 사용하세요!

**3. 우선순위 키워드 (반드시 준수)**
다음 키워드를 기준으로 우선순위를 판단하세요:
- **높음 (high)**: "급하게", "중요한", "빨리", "꼭", "반드시", "긴급", "시급", "데드라인", "마감" 등이 포함된 경우
- **중간 (medium)**: "보통", "적당히" 또는 우선순위 관련 키워드가 없는 경우 (기본값)
- **낮음 (low)**: "여유롭게", "천천히", "언젠가", "나중에", "시간 있을 때" 등이 포함된 경우

**4. 카테고리 분류 키워드 (반드시 준수)**
다음 키워드를 기준으로 카테고리를 판단하세요:
- **업무**: "회의", "보고서", "프로젝트", "업무", "발표", "미팅", "클라이언트", "제안서", "회사" 등
- **개인**: "쇼핑", "친구", "가족", "개인", "취미", "영화", "데이트", "약속" 등
- **건강**: "운동", "병원", "건강", "요가", "헬스", "필라테스", "검진", "약", "치료" 등
- **학습**: "공부", "책", "강의", "학습", "교육", "자격증", "시험", "과제", "독서" 등
- 키워드가 애매한 경우 문맥을 고려하여 가장 적합한 카테고리 선택

**5. 제목 생성 규칙**
- 핵심 키워드만 추출하여 간결하게 작성 (10~30자 권장)
- 불필요한 조사나 부가 설명은 제외
- 예: "내일 오전에 팀 회의 준비해야 함" → "팀 회의 준비"

**6. 설명 생성 규칙 (중요!)**
사용자의 입력을 분석하여 가능한 한 설명을 생성해주세요:

**설명에 포함할 내용**:
- 제목에 포함되지 않은 부가 정보나 맥락
- 구체적인 행동이나 준비 사항
- 목적이나 이유
- 관련된 사람이나 장소
- 주의사항이나 참고사항

**설명 생성 방법**:
1. 입력 텍스트가 짧고 단순한 경우 (예: "보고서 작성"):
   - 일반적인 맥락 추가: "보고서를 작성하고 검토합니다"
   
2. 입력에 부가 정보가 있는 경우:
   - 제목: 핵심 키워드
   - 설명: 나머지 맥락과 세부사항
   
3. 시간/장소/목적 등이 있는 경우:
   - 제목: 주요 행동
   - 설명: 시간, 장소, 목적 등의 세부사항

**예시**:
- 입력: "급하게 보고서 제출하기"
  * 제목: "보고서 제출"
  * 설명: "급하게 처리해야 하는 보고서를 준비하고 제출합니다"
  
- 입력: "내일 회의 준비"
  * 제목: "회의 준비"
  * 설명: "내일 있을 회의를 위한 자료를 준비하고 검토합니다"
  
- 입력: "친구랑 저녁 약속"
  * 제목: "친구와 저녁 약속"
  * 설명: "친구들과 함께 저녁 식사 약속이 있습니다"

**중요**: 설명은 가능한 한 비워두지 말고, 최소한의 맥락이라도 제공해주세요!

**7. JSON 출력 형식 (반드시 준수)**
다음 JSON 구조를 정확히 따라주세요:
{
  "title": "할 일 제목",
  "description": "상세 설명 (선택사항)",
  "due_date": "YYYY-MM-DD",
  "due_time": "HH:MM",
  "priority": "높음" | "중간" | "낮음",
  "category": "업무" | "개인" | "학습" | "건강"
}

### 예시

**입력 예시 1**: "내일 오전 10시에 중요한 팀 회의"
**출력**:
{
  "title": "팀 회의",
  "description": "내일 오전에 있을 중요한 팀 회의에 참석합니다",
  "due_date": "${dates.tomorrow}",
  "due_time": "10:00",
  "priority": "높음",
  "category": "업무"
}

**입력 예시 2**: "내일 오후 3시까지 프로젝트 발표 준비하기"
**출력**:
{
  "title": "프로젝트 발표 준비",
  "description": "프로젝트 발표를 위한 자료를 준비하고 검토합니다",
  "due_date": "${dates.tomorrow}",
  "due_time": "15:00",
  "priority": "중간",
  "category": "업무"
}

**입력 예시 3**: "이번 주 금요일 저녁에 친구들이랑 저녁 약속"
**출력**:
{
  "title": "친구들과 저녁 약속",
  "description": "친구들과 함께 저녁 식사를 하며 시간을 보냅니다",
  "due_date": "${dates.thisFriday}",
  "due_time": "18:00",
  "priority": "중간",
  "category": "개인"
}

**입력 예시 4**: "다음 주 월요일 아침에 운동하기"
**출력**:
{
  "title": "운동하기",
  "description": "다음 주 월요일 아침에 규칙적인 운동을 시작합니다",
  "due_date": "${dates.nextMonday}",
  "due_time": "09:00",
  "priority": "중간",
  "category": "건강"
}

**입력 예시 5**: "오후 5시에 급하게 보고서 제출"
**출력**:
{
  "title": "보고서 제출",
  "description": "급하게 처리해야 하는 보고서를 작성하고 제출합니다",
  "due_date": "${dates.today}",
  "due_time": "17:00",
  "priority": "높음",
  "category": "업무"
}

**입력 예시 6**: "급하게 보고서 제출하기"
**분석**: 날짜 표현 없음 → 오늘 날짜 사용, 시간 표현 없음 → 기본 09:00
**출력**:
{
  "title": "보고서 제출",
  "description": "급하게 처리해야 하는 보고서를 준비하고 제출합니다",
  "due_date": "${dates.today}",
  "due_time": "09:00",
  "priority": "높음",
  "category": "업무"
}

**입력 예시 7**: "프로젝트 발표 준비"
**분석**: 날짜 표현 없음 → 오늘 날짜 사용, 시간 표현 없음 → 기본 09:00
**출력**:
{
  "title": "프로젝트 발표 준비",
  "description": "프로젝트 발표를 위한 자료와 내용을 준비합니다",
  "due_date": "${dates.today}",
  "due_time": "09:00",
  "priority": "중간",
  "category": "업무"
}

**입력 예시 8**: "장 보러 가기"
**분석**: 간단한 입력에도 맥락 추가
**출력**:
{
  "title": "장 보러 가기",
  "description": "필요한 물건들을 구매하기 위해 마트에 갑니다",
  "due_date": "${dates.today}",
  "due_time": "09:00",
  "priority": "중간",
  "category": "개인"
}

**중요 사항 재확인**:
- **날짜가 명시되지 않으면 무조건 오늘(${dates.today})을 사용하세요!**
- **과거 날짜(${dates.today} 이전)는 절대 생성하지 마세요!**
- **설명(description)은 가능한 한 생성해주세요! 빈 문자열은 지양합니다!**
- "~까지", "~에", "~전에" 등의 조사는 제목에서 제거하세요
- 구체적인 시간(예: "3시", "15시")이 있으면 반드시 정확히 변환하세요
- "내일", "오늘" 등의 날짜 표현을 정확한 YYYY-MM-DD 형식으로 변환하세요
- 제목은 핵심 동작만 남기고 간결하게 작성하세요
- 설명은 사용자의 의도를 파악하여 도움이 되는 맥락을 추가하세요

위 규칙을 반드시 준수하여 자연어를 구조화된 데이터로 변환해주세요.
`,
    });

    // 결과 검증 및 후처리
    const parsedData = result.object;

    // 개발 환경에서 AI 파싱 결과 로그
    if (process.env.NODE_ENV === 'development') {
      console.log('=== AI 파싱 결과 ===');
      console.log('원본 입력:', input);
      console.log('전처리 후:', processedInput);
      console.log('AI 파싱 결과:', JSON.stringify(parsedData, null, 2));
    }

    // 날짜 유효성 검사
    const dueDate = new Date(parsedData.due_date);
    if (isNaN(dueDate.getTime())) {
      console.error('유효하지 않은 날짜:', parsedData.due_date);
      return NextResponse.json(
        { 
          success: false,
          error: 'AI가 유효하지 않은 날짜를 생성했습니다. 다시 시도해주세요.' 
        },
        { status: 400 }
      );
    }

    // 과거 날짜 검증 및 교정
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    
    if (dueDateOnly < today) {
      console.warn('⚠️ 과거 날짜 감지:', parsedData.due_date, '→ 오늘 날짜로 교정:', dates.today);
      parsedData.due_date = dates.today;
    }

    // 시간 유효성 검사 및 기본값 설정
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(parsedData.due_time)) {
      console.warn('유효하지 않은 시간 형식:', parsedData.due_time, '→ 기본값 09:00 사용');
      parsedData.due_time = '09:00';
    }

    // 제목 후처리 (필수 필드)
    const processedTitle = postprocessTitle(parsedData.title || '');
    
    // 설명 후처리 (선택 필드)
    const processedDescription = postprocessDescription(parsedData.description);

    // 우선순위 기본값 설정
    const processedPriority = parsedData.priority || '중간';

    // 카테고리 기본값 설정
    const processedCategory = parsedData.category || '개인';

    // 날짜와 시간을 결합하여 ISO 문자열 생성
    const [year, month, day] = parsedData.due_date.split('-');
    const [hours, minutes] = parsedData.due_time.split(':');
    const combinedDateTime = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hours),
      parseInt(minutes)
    );

    // 최종 결과 반환
    const finalResult = {
      title: processedTitle,
      description: processedDescription,
      due_date: combinedDateTime.toISOString(),
      priority: processedPriority,
      category: processedCategory,
    };

    // 개발 환경에서 최종 결과 로그
    if (process.env.NODE_ENV === 'development') {
      console.log('후처리 완료:');
      console.log('- 제목:', processedTitle);
      console.log('- 설명:', processedDescription);
      console.log('- 마감일:', combinedDateTime.toISOString());
      console.log('최종 결과:', JSON.stringify(finalResult, null, 2));
      console.log('====================\n');
    }

    return NextResponse.json({
      success: true,
      data: finalResult,
    });

  } catch (error: unknown) {
    console.error('AI 파싱 오류:', error);

    const err = error as Error;

    // 개발 환경에서 상세 오류 로그
    if (process.env.NODE_ENV === 'development') {
      console.error('상세 오류 정보:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
      });
    }

    // AI API 인증 오류
    if (err.message?.includes('API key') || err.message?.includes('authentication')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'AI 서비스 인증에 실패했습니다. 잠시 후 다시 시도해주세요.' 
        },
        { status: 401 }
      );
    }

    // AI API 사용량 한도 초과
    if (err.message?.includes('quota') || err.message?.includes('limit') || err.message?.includes('429')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'AI 서비스 사용량이 일시적으로 초과되었습니다. 잠시 후 다시 시도해주세요.' 
        },
        { status: 429 }
      );
    }

    // AI API 타임아웃
    if (err.message?.includes('timeout') || err.message?.includes('ETIMEDOUT')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'AI 서비스 응답 시간이 초과되었습니다. 다시 시도해주세요.' 
        },
        { status: 504 }
      );
    }

    // 네트워크 오류
    if (err.message?.includes('network') || err.message?.includes('ECONNREFUSED')) {
      return NextResponse.json(
        { 
          success: false,
          error: '네트워크 연결에 문제가 발생했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.' 
        },
        { status: 503 }
      );
    }

    // JSON 파싱 오류 (AI 응답 형식 문제)
    if (err.name === 'SyntaxError' || err.message?.includes('JSON')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'AI 응답을 처리하는 중 오류가 발생했습니다. 입력 내용을 다르게 표현하여 다시 시도해주세요.' 
        },
        { status: 500 }
      );
    }

    // 일반적인 서버 오류
    return NextResponse.json(
      { 
        success: false,
        error: 'AI 할 일 생성 중 예상치 못한 오류가 발생했습니다. 다시 시도해주세요.' 
      },
      { status: 500 }
    );
  }
}
