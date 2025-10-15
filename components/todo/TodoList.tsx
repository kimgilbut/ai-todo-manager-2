'use client';

import React, { useState, useMemo } from 'react';
import { Search, Filter, SortAsc, SortDesc, CheckSquare, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import TodoCard, { Todo } from './TodoCard';

/**
 * TodoList 컴포넌트의 props 타입
 */
interface TodoListProps {
  todos: Todo[];
  loading?: boolean;
  onToggleComplete: (id: string) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
  onCreateNew?: () => void;
  className?: string;
}

/**
 * 정렬 옵션 타입
 */
type SortOption = 'created_at' | 'due_date' | 'title' | 'priority';

/**
 * 필터 옵션 타입
 */
type FilterOption = 'all' | 'completed' | 'pending' | 'overdue';

/**
 * 할 일 목록을 표시하고 관리하는 컴포넌트
 * @description 할 일 목록을 표시하며, 검색, 필터링, 정렬 기능을 제공합니다.
 */
const TodoList = ({
  todos,
  loading = false,
  onToggleComplete,
  onEdit,
  onDelete,
  onCreateNew,
  className
}: TodoListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  /**
   * 할 일을 필터링하고 정렬하는 함수
   */
  const filteredAndSortedTodos = useMemo(() => {
    let filtered = todos;

    // 검색 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(todo =>
        todo.title.toLowerCase().includes(query) ||
        (todo.description && todo.description.toLowerCase().includes(query))
      );
    }

    // 상태 필터
    switch (filterBy) {
      case 'completed':
        filtered = filtered.filter(todo => todo.completed);
        break;
      case 'pending':
        filtered = filtered.filter(todo => !todo.completed);
        break;
      case 'overdue':
        filtered = filtered.filter(todo => {
          if (!todo.due_date || todo.completed) return false;
          return new Date(todo.due_date) < new Date();
        });
        break;
      default:
        // 'all' - 필터링 없음
        break;
    }

    // 우선순위 필터
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(todo => todo.priority === priorityFilter);
    }

    // 카테고리 필터
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(todo => todo.category === categoryFilter);
    }

    // 정렬
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'due_date':
          if (!a.due_date && !b.due_date) comparison = 0;
          else if (!a.due_date) comparison = 1;
          else if (!b.due_date) comparison = -1;
          else comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          break;
        case 'priority':
          const priorityOrder = { '높음': 3, '중간': 2, '낮음': 1 };
          comparison = priorityOrder[b.priority] - priorityOrder[a.priority];
          break;
        case 'created_at':
        default:
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [todos, searchQuery, sortBy, sortOrder, filterBy, priorityFilter, categoryFilter]);

  /**
   * 통계 정보 계산
   */
  const stats = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter(todo => todo.completed).length;
    const pending = total - completed;
    const overdue = todos.filter(todo => {
      if (!todo.due_date || todo.completed) return false;
      return new Date(todo.due_date) < new Date();
    }).length;

    return { total, completed, pending, overdue };
  }, [todos]);

  /**
   * 빈 상태 컴포넌트
   */
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
        <CheckSquare className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">
        {searchQuery || filterBy !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all' 
          ? '검색 결과가 없습니다' 
          : '할 일이 없습니다'
        }
      </h3>
      <p className="text-muted-foreground mb-4">
        {searchQuery || filterBy !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all'
          ? '다른 검색어나 필터를 시도해보세요.' 
          : '새로운 할 일을 추가해보세요!'
        }
      </p>
      {onCreateNew && (
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          할 일 추가하기
        </Button>
      )}
    </div>
  );

  /**
   * 로딩 스켈레톤 컴포넌트
   */
  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="border rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-4 w-4 rounded mt-1" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* 헤더 및 통계 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">할 일 목록</h2>
          <div className="flex items-center gap-4 mt-2">
            <Badge variant="outline" className="text-xs">
              전체 {stats.total}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              완료 {stats.completed}
            </Badge>
            <Badge variant="outline" className="text-xs">
              진행 중 {stats.pending}
            </Badge>
            {stats.overdue > 0 && (
              <Badge variant="destructive" className="text-xs">
                지연 {stats.overdue}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="할 일 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Select value={filterBy} onValueChange={(value: FilterOption) => setFilterBy(value)}>
            <SelectTrigger className="w-32">
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

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="우선순위" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="높음">높음</SelectItem>
              <SelectItem value="중간">중간</SelectItem>
              <SelectItem value="낮음">낮음</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="카테고리" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="업무">업무</SelectItem>
              <SelectItem value="개인">개인</SelectItem>
              <SelectItem value="학습">학습</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
            <SelectTrigger className="w-32">
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
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3"
          >
            {sortOrder === 'asc' ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* 할 일 목록 */}
      {filteredAndSortedTodos.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {filteredAndSortedTodos.map((todo) => (
            <TodoCard
              key={todo.id}
              todo={todo}
              onToggleComplete={onToggleComplete}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TodoList;
