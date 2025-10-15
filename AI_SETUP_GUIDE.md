# AI 기능 설정 가이드

## 1. Google Gemini API 키 설정

### 1.1 API 키 발급
1. [Google AI Studio](https://aistudio.google.com/)에 접속
2. Google 계정으로 로그인
3. "Get API Key" 버튼 클릭
4. 새 API 키 생성 또는 기존 키 사용

### 1.2 환경 변수 설정
프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가:

```env
# Supabase 설정 (기존)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Google Gemini AI API 키 (새로 추가)
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key_here
```

### 1.3 API 키 보안
- `.env.local` 파일은 `.gitignore`에 포함되어 있어 Git에 커밋되지 않습니다
- API 키를 절대 공개 저장소에 업로드하지 마세요
- 프로덕션 환경에서는 환경 변수로 설정하세요

## 2. AI 기능 사용법

### 2.1 할 일 추가 시 AI 모드 활성화
1. 메인 페이지에서 "할 일 추가" 버튼 클릭
2. TodoForm에서 "AI 모드" 스위치를 ON으로 설정
3. 자연어로 할 일을 입력 (예: "내일 오후 3시까지 중요한 팀 회의 준비하기")
4. "AI로 할 일 생성" 버튼 클릭

### 2.2 AI 파싱 결과
AI가 자동으로 다음 정보를 추출합니다:
- **제목**: 핵심 키워드 추출
- **설명**: 상세 내용 (있는 경우)
- **마감일**: 상대적 표현을 절대 날짜로 변환
- **마감시간**: 명시되지 않은 경우 09:00 기본값
- **우선순위**: 문맥 기반 자동 판단
- **카테고리**: 내용 기반 자동 분류

### 2.3 입력 예시
```
✅ 좋은 예시:
- "내일 오후 3시까지 중요한 팀 회의 준비하기"
- "다음주 월요일 오전 10시에 프로젝트 발표 준비"
- "오늘 저녁 7시에 헬스장 가기"
- "내일까지 긴급한 보고서 작성"

❌ 피해야 할 예시:
- "할 일" (너무 간단)
- "123456789" (의미 없는 문자)
- "" (빈 문자열)
```

## 3. 오류 처리

### 3.1 일반적인 오류
- **API 키 오류**: 환경 변수 `GOOGLE_GENERATIVE_AI_API_KEY` 확인
- **사용량 한도**: Google AI Studio에서 사용량 확인
- **네트워크 오류**: 인터넷 연결 상태 확인

### 3.2 디버깅
개발자 도구 콘솔에서 오류 메시지를 확인할 수 있습니다:
```javascript
// AI 파싱 오류 로그
console.error('AI 파싱 오류:', error);
```

## 4. 성능 최적화

### 4.1 API 호출 최적화
- AI 파싱은 사용자가 명시적으로 요청할 때만 실행
- 로딩 상태로 중복 요청 방지
- 에러 발생 시 사용자에게 명확한 피드백 제공

### 4.2 비용 관리
- Gemini API는 사용량 기반 과금
- 개발 환경에서는 테스트용으로만 사용
- 프로덕션 환경에서는 사용량 모니터링 권장

## 5. 확장 가능성

### 5.1 추가 AI 기능
- 할 일 우선순위 자동 조정
- 마감일 임박 알림
- 할 일 완료율 분석
- 개인화된 할 일 추천

### 5.2 모델 업그레이드
현재 `gemini-2.0-flash-exp` 모델을 사용하며, 필요에 따라 다른 모델로 변경 가능:
- `gemini-1.5-pro`: 더 정확한 분석
- `gemini-1.5-flash`: 더 빠른 응답

## 6. 문제 해결

### 6.1 API 키 관련
```bash
# 환경 변수 확인
echo $GOOGLE_GENERATIVE_AI_API_KEY
```

### 6.2 개발 서버 재시작
환경 변수 변경 후 개발 서버를 재시작하세요:
```bash
npm run dev
```

### 6.3 로그 확인
API Route에서 상세한 오류 로그를 확인할 수 있습니다:
```typescript
console.error('AI 파싱 오류:', error);
```
