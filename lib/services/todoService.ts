import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

/**
 * 할 일 데이터 타입 정의
 */
export interface Todo {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: '높음' | '중간' | '낮음';
  category: '업무' | '개인' | '학습' | '건강';
  completed: boolean;
  created_at: string;
}

/**
 * 할 일 생성 데이터 타입
 */
export interface CreateTodoData {
  title: string;
  description?: string;
  due_date?: string;
  priority: '높음' | '중간' | '낮음';
  category: '업무' | '개인' | '학습' | '건강';
  completed?: boolean;
}

/**
 * 할 일 수정 데이터 타입
 */
export interface UpdateTodoData {
  title?: string;
  description?: string;
  due_date?: string;
  priority?: '높음' | '중간' | '낮음';
  category?: '업무' | '개인' | '학습' | '건강';
  completed?: boolean;
}

/**
 * 할 일 검색/필터 옵션 타입
 */
export interface TodoFilters {
  search?: string;
  status?: 'all' | 'completed' | 'pending' | 'overdue';
  sortBy?: 'created_at' | 'due_date' | 'title' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Supabase를 사용한 할 일 관리 서비스
 */
class TodoService {
  private supabase = createClient();

  /**
   * 현재 로그인한 사용자의 할 일 목록 조회
   */
  async getTodos(filters: TodoFilters = {}): Promise<Todo[]> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      
      if (!user) {
        throw new Error('로그인이 필요합니다.');
      }

      let query = this.supabase
        .from('todos')
        .select('*')
        .eq('user_id', user.id);

      // 검색 필터 적용
      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      // 상태 필터 적용
      if (filters.status && filters.status !== 'all') {
        switch (filters.status) {
          case 'completed':
            query = query.eq('completed', true);
            break;
          case 'pending':
            query = query.eq('completed', false);
            break;
          case 'overdue':
            query = query
              .eq('completed', false)
              .not('due_date', 'is', null)
              .lt('due_date', new Date().toISOString());
            break;
        }
      }

      // 정렬 적용
      const sortBy = filters.sortBy || 'created_at';
      const sortOrder = filters.sortOrder || 'desc';
      
      if (sortBy === 'priority') {
        // 우선순위 정렬은 클라이언트 사이드에서 처리
        query = query.order('created_at', { ascending: false });
      } else {
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      let todos = data || [];

      // 우선순위 정렬이 필요한 경우 클라이언트 사이드에서 처리
      if (sortBy === 'priority') {
        const priorityOrder: Record<'높음' | '중간' | '낮음', number> = { '높음': 3, '중간': 2, '낮음': 1 };
        todos = todos.sort((a: Todo, b: Todo) => {
          const aPriority = priorityOrder[a.priority] || 0;
          const bPriority = priorityOrder[b.priority] || 0;
          return sortOrder === 'asc' ? aPriority - bPriority : bPriority - aPriority;
        });
      }

      return todos;
    } catch (error: unknown) {
      console.error('할 일 목록 조회 오류:', error);
      this.handleError(error);
      return [];
    }
  }

  /**
   * 새 할 일 생성
   */
  async createTodo(todoData: CreateTodoData): Promise<Todo | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      
      if (!user) {
        throw new Error('로그인이 필요합니다.');
      }

      const { data, error } = await this.supabase
        .from('todos')
        .insert({
          user_id: user.id,
          title: todoData.title,
          description: todoData.description,
          due_date: todoData.due_date,
          priority: todoData.priority,
          category: todoData.category,
          completed: todoData.completed || false,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast.success('할 일이 추가되었습니다.');
      return data;
    } catch (error: unknown) {
      console.error('할 일 생성 오류:', error);
      this.handleError(error);
      return null;
    }
  }

  /**
   * 할 일 수정
   */
  async updateTodo(id: string, todoData: UpdateTodoData): Promise<Todo | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      
      if (!user) {
        throw new Error('로그인이 필요합니다.');
      }

      const { data, error } = await this.supabase
        .from('todos')
        .update(todoData)
        .eq('id', id)
        .eq('user_id', user.id) // 본인 소유의 할 일만 수정 가능
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('할 일을 찾을 수 없거나 수정 권한이 없습니다.');
      }

      toast.success('할 일이 수정되었습니다.');
      return data;
    } catch (error: unknown) {
      console.error('할 일 수정 오류:', error);
      this.handleError(error);
      return null;
    }
  }

  /**
   * 할 일 삭제
   */
  async deleteTodo(id: string): Promise<boolean> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      
      if (!user) {
        throw new Error('로그인이 필요합니다.');
      }

      const { error } = await this.supabase
        .from('todos')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id); // 본인 소유의 할 일만 삭제 가능

      if (error) {
        throw error;
      }

      toast.success('할 일이 삭제되었습니다.');
      return true;
    } catch (error: unknown) {
      console.error('할 일 삭제 오류:', error);
      this.handleError(error);
      return false;
    }
  }

  /**
   * 할 일 완료 상태 토글
   */
  async toggleTodoComplete(id: string, isCompleted: boolean): Promise<Todo | null> {
    return this.updateTodo(id, { completed: isCompleted });
  }

  /**
   * 오류 처리
   */
  private handleError(error: unknown): void {
    const err = error as Error;
    if (err?.message) {
      const message = err.message.toLowerCase();
      
      if (message.includes('jwt') || message.includes('token')) {
        toast.error('인증이 만료되었습니다. 다시 로그인해주세요.');
      } else if (message.includes('network') || message.includes('fetch')) {
        toast.error('네트워크 연결을 확인해주세요.');
      } else if (message.includes('permission') || message.includes('unauthorized')) {
        toast.error('접근 권한이 없습니다.');
      } else {
        toast.error(err.message);
      }
    } else {
      toast.error('예상치 못한 오류가 발생했습니다.');
    }
  }
}

// 싱글톤 인스턴스 생성
export const todoService = new TodoService();
