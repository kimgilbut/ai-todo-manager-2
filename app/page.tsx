'use client';

import React, { useState, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  SortAsc, 
  CheckSquare, 
  Plus,
  Bell,
  Settings,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TodoForm, TodoList, TodoAnalysis } from '@/components/todo';
import { Todo } from '@/components/todo';
import AuthHeader from '@/components/auth/AuthHeader';
import AuthGuard from '@/components/auth/AuthGuard';
import { useTodos } from '@/hooks/useTodos';
import { CreateTodoData } from '@/lib/services/todoService';
import { toast } from 'sonner';

/**
 * 메인 페이지 컴포넌트
 * @description AI Todo Manager의 메인 대시보드 화면을 제공합니다.
 */
export default function Home() {
  const [showTodoForm, setShowTodoForm] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending' | 'overdue'>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'due_date' | 'title' | 'priority'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);

  // 할 일 관리 훅 사용
  const {
    todos,
    loading,
    error,
    createTodo,
    updateTodo,
    deleteTodo,
    toggleTodoComplete,
    updateFilters,
  } = useTodos({
    search: searchQuery,
    status: filterStatus,
    sortBy,
    sortOrder,
  });

  /**
   * 할 일 추가 핸들러
   */
  const handleAddTodo = useCallback(async (formData: CreateTodoData) => {
    await createTodo(formData);
    setShowTodoForm(false);
    setEditingTodo(null);
  }, [createTodo]);

  /**
   * 할 일 수정 핸들러
   */
  const handleUpdateTodo = useCallback(async (formData: CreateTodoData) => {
    if (editingTodo) {
      await updateTodo(editingTodo.id, formData);
      setShowTodoForm(false);
      setEditingTodo(null);
    }
  }, [editingTodo, updateTodo]);

  /**
   * 할 일 완료 토글 핸들러
   */
  const handleToggleComplete = useCallback(async (id: string) => {
    await toggleTodoComplete(id);
  }, [toggleTodoComplete]);

  /**
   * 할 일 수정 시작 핸들러
   */
  const handleEditTodo = useCallback((todo: Todo) => {
    setEditingTodo(todo);
    setShowTodoForm(true);
  }, []);

  /**
   * 할 일 삭제 핸들러
   */
  const handleDeleteTodo = useCallback(async (id: string) => {
    if (window.confirm('정말로 이 할 일을 삭제하시겠습니까?')) {
      await deleteTodo(id);
    }
  }, [deleteTodo]);

  /**
   * 검색어 변경 핸들러
   */
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    updateFilters({ search: value });
  }, [updateFilters]);

  /**
   * 필터 변경 핸들러
   */
  const handleFilterChange = useCallback((value: 'all' | 'completed' | 'pending' | 'overdue') => {
    setFilterStatus(value);
    updateFilters({ status: value });
  }, [updateFilters]);

  /**
   * 정렬 변경 핸들러
   */
  const handleSortChange = useCallback((value: 'created_at' | 'due_date' | 'title' | 'priority') => {
    setSortBy(value);
    updateFilters({ sortBy: value });
  }, [updateFilters]);

  /**
   * 정렬 순서 토글 핸들러
   */
  const handleSortOrderToggle = useCallback(() => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newOrder);
    updateFilters({ sortOrder: newOrder });
  }, [sortOrder, updateFilters]);

  /**
   * 폼 취소 핸들러
   */
  const handleCancelForm = useCallback(() => {
    setShowTodoForm(false);
    setEditingTodo(null);
  }, []);

  /**
   * AI 요약 실행 핸들러
   */
  const handleAISummary = useCallback(async () => {
    setAiSummaryLoading(true);
    try {
      // TODO: 실제 AI API 연동
      await new Promise(resolve => setTimeout(resolve, 2000)); // 임시 지연
      
      const completedToday = todos.filter(todo => {
        if (!todo.completed) return false;
        const today = new Date();
        const completedDate = new Date(todo.created_at);
        return completedDate.toDateString() === today.toDateString();
      }).length;

      const pendingCount = todos.filter(todo => !todo.completed).length;
      const overdueCount = todos.filter(todo => {
        if (todo.completed || !todo.due_date) return false;
        return new Date(todo.due_date) < new Date();
      }).length;

      toast.success(`AI 분석 완료! 오늘 ${completedToday}개 완료, ${pendingCount}개 진행 중, ${overdueCount}개 지연`);
    } catch (error) {
      toast.error('AI 요약 생성 중 오류가 발생했습니다.');
    } finally {
      setAiSummaryLoading(false);
    }
  }, [todos]);


  return (
    <AuthGuard requireAuth={true}>
    <div className="min-h-screen bg-background">
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <AuthHeader />
          
          {/* 추가 액션 버튼들 */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* 툴바 */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* 검색 및 필터 */}
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="할 일 검색..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
              
              <Select value={filterStatus} onValueChange={handleFilterChange}>
                <SelectTrigger className="w-full sm:w-32">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="pending">진행 중</SelectItem>
                  <SelectItem value="completed">완료</SelectItem>
                  <SelectItem value="overdue">지연</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-full sm:w-32">
                  <SortAsc className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">생성일</SelectItem>
                  <SelectItem value="due_date">마감일</SelectItem>
                  <SelectItem value="title">제목</SelectItem>
                  <SelectItem value="priority">우선순위</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={handleSortOrderToggle}
                className="px-3"
                title={`정렬 순서: ${sortOrder === 'asc' ? '오름차순' : '내림차순'}`}
              >
                <SortAsc className={`h-4 w-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
              </Button>
            </div>

            {/* 액션 버튼들 */}
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={handleAISummary}
                disabled={aiSummaryLoading || todos.length === 0}
              >
                {aiSummaryLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                    분석중
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI 요약
                  </>
                )}
              </Button>
              
              <Button onClick={() => {
                setEditingTodo(null);
                setShowTodoForm(!showTodoForm);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                할 일 추가
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 좌측: TodoForm 또는 AI 분석 */}
          <div className="lg:col-span-1 space-y-6">
            {showTodoForm && (
              <div className="sticky top-24">
                <TodoForm
                  todo={editingTodo || undefined}
                  onSubmit={editingTodo ? handleUpdateTodo : handleAddTodo}
                  onCancel={handleCancelForm}
                />
              </div>
            )}
            
            {!showTodoForm && (
              <div className="sticky top-24">
                <TodoAnalysis />
              </div>
            )}
          </div>

          {/* 우측: TodoList */}
          <div className="lg:col-span-2">
            <TodoList
              todos={todos}
              loading={loading}
              onToggleComplete={handleToggleComplete}
              onEdit={handleEditTodo}
              onDelete={handleDeleteTodo}
              onCreateNew={() => {
                setEditingTodo(null);
                setShowTodoForm(true);
              }}
            />
          </div>
        </div>
      </main>
    </div>
    </AuthGuard>
  );
}