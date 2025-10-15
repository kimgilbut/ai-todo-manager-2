import { Todo } from '@/components/todo';

/**
 * Mock 할 일 데이터
 */
export const mockTodos: Todo[] = [
  {
    id: '1',
    user_id: 'user-1',
    title: '프로젝트 기획서 작성',
    description: 'AI Todo Manager 프로젝트의 상세 기획서를 작성하고 요구사항을 정리합니다.',
    due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2일 후
    priority: '높음',
    category: '업무',
    completed: false,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2일 전
  },
  {
    id: '2',
    user_id: 'user-1',
    title: '데이터베이스 스키마 설계',
    description: 'Supabase 데이터베이스의 테이블 구조와 관계를 설계합니다.',
    due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1일 후
    priority: '높음',
    category: '업무',
    completed: true,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3일 전
  },
  {
    id: '3',
    user_id: 'user-1',
    title: 'UI 컴포넌트 개발',
    description: 'Shadcn/ui를 활용한 할 일 관리 컴포넌트들을 개발합니다.',
    due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3일 후
    priority: '중간',
    category: '업무',
    completed: false,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1일 전
  },
  {
    id: '4',
    user_id: 'user-1',
    title: 'AI API 연동',
    description: 'Google Gemini API를 활용한 자연어 처리 기능을 구현합니다.',
    due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5일 후
    priority: '중간',
    category: '학습',
    completed: false,
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4시간 전
  },
  {
    id: '5',
    user_id: 'user-1',
    title: '테스트 코드 작성',
    description: '단위 테스트와 통합 테스트 코드를 작성합니다.',
    due_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1일 전 (지연됨)
    priority: '낮음',
    category: '업무',
    completed: false,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5일 전
  },
  {
    id: '6',
    user_id: 'user-1',
    title: '배포 환경 설정',
    description: 'Vercel을 활용한 배포 환경을 설정하고 CI/CD 파이프라인을 구축합니다.',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7일 후
    priority: '중간',
    category: '업무',
    completed: false,
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), // 6일 전
  },
];

/**
 * Mock 사용자 데이터
 */
export const mockUser = {
  id: 'user-1',
  name: '김개발',
  email: 'developer@example.com',
  avatar: null,
};
