import { useState, useEffect, useCallback } from 'react';
import { todoService, Todo, TodoFilters, CreateTodoData, UpdateTodoData } from '@/lib/services/todoService';
import { useAuth } from '@/components/auth/AuthProvider';

/**
 * 할 일 관리를 위한 커스텀 훅
 */
export const useTodos = (initialFilters: TodoFilters = {}) => {
  const { user, loading: authLoading } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TodoFilters>(initialFilters);

  /**
   * 할 일 목록 조회
   */
  const fetchTodos = useCallback(async () => {
    // 인증 상태가 로딩 중이거나 사용자가 로그인하지 않은 경우 API 호출하지 않음
    if (authLoading || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await todoService.getTodos(filters);
      setTodos(data);
    } catch (err: any) {
      setError(err.message || '할 일 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [filters, authLoading, user]);

  /**
   * 필터 업데이트
   */
  const updateFilters = useCallback((newFilters: Partial<TodoFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  /**
   * 새 할 일 생성
   */
  const createTodo = useCallback(async (todoData: CreateTodoData) => {
    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }
    const newTodo = await todoService.createTodo(todoData);
    if (newTodo) {
      setTodos(prev => [newTodo, ...prev]);
    }
    return newTodo;
  }, [user]);

  /**
   * 할 일 수정
   */
  const updateTodo = useCallback(async (id: string, todoData: UpdateTodoData) => {
    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }
    const updatedTodo = await todoService.updateTodo(id, todoData);
    if (updatedTodo) {
      setTodos(prev => prev.map(todo => 
        todo.id === id ? updatedTodo : todo
      ));
    }
    return updatedTodo;
  }, [user]);

  /**
   * 할 일 삭제
   */
  const deleteTodo = useCallback(async (id: string) => {
    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }
    const success = await todoService.deleteTodo(id);
    if (success) {
      setTodos(prev => prev.filter(todo => todo.id !== id));
    }
    return success;
  }, [user]);

  /**
   * 할 일 완료 상태 토글
   */
  const toggleTodoComplete = useCallback(async (id: string) => {
    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const updatedTodo = await todoService.updateTodo(id, { completed: !todo.completed });
    if (updatedTodo) {
      setTodos(prev => prev.map(t => 
        t.id === id ? updatedTodo : t
      ));
    }
    return updatedTodo;
  }, [todos, user]);

  /**
   * 초기 로드 및 필터 변경 시 데이터 조회
   */
  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  return {
    todos,
    loading,
    error,
    filters,
    updateFilters,
    createTodo,
    updateTodo,
    deleteTodo,
    toggleTodoComplete,
    refetch: fetchTodos,
  };
};
