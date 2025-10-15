'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CheckSquare, Square, Trash2, Edit2, Calendar, Clock, Flag, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

/**
 * 할 일 데이터 타입 정의 (PRD 기준)
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
 * TodoCard 컴포넌트의 props 타입
 */
interface TodoCardProps {
  todo: Todo;
  onToggleComplete: (id: string) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
  className?: string;
}

/**
 * 개별 할 일을 표시하는 카드 컴포넌트
 * @description 할 일의 제목, 설명, 마감일, 우선순위, 카테고리, 완료 상태를 표시하고 완료/수정/삭제 기능을 제공합니다.
 */
const TodoCard = ({ 
  todo, 
  onToggleComplete, 
  onEdit, 
  onDelete, 
  className 
}: TodoCardProps) => {
  const [isClient, setIsClient] = useState(false);

  // 클라이언트 사이드에서만 렌더링되도록 보장
  useEffect(() => {
    setIsClient(true);
  }, []);

  /**
   * 마감일이 임박했는지 확인하는 함수
   */
  const isDueSoon = (dueDate: string) => {
    if (!isValidDate(dueDate)) return false;
    const due = new Date(dueDate);
    const now = new Date();
    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours <= 24 && diffHours > 0;
  };

  /**
   * 마감일이 지났는지 확인하는 함수
   */
  const isOverdue = (dueDate: string) => {
    if (!isValidDate(dueDate)) return false;
    const due = new Date(dueDate);
    const now = new Date();
    return due < now && !todo.completed;
  };

  /**
   * 우선순위에 따른 색상 반환
   */
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case '높음': return 'destructive';
      case '중간': return 'secondary';
      case '낮음': return 'outline';
      default: return 'outline';
    }
  };

  /**
   * 카테고리에 따른 색상 반환
   */
  const getCategoryColor = (category: string) => {
    switch (category) {
      case '업무': return 'default';
      case '개인': return 'secondary';
      case '학습': return 'outline';
      case '건강': return 'destructive';
      default: return 'outline';
    }
  };

  /**
   * 날짜 유효성 검사 함수
   */
  const isValidDate = (dateString: string): boolean => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  };

  /**
   * 마감일 포맷팅 함수 (클라이언트 사이드에서만 실행)
   */
  const formatDueDate = (dueDate: string) => {
    if (!isClient) return '로딩 중...';
    if (!isValidDate(dueDate)) return '날짜 없음';
    const date = new Date(dueDate);
    return format(date, 'MM월 dd일 HH:mm', { locale: ko });
  };

  /**
   * 생성/수정일 포맷팅 함수 (클라이언트 사이드에서만 실행)
   */
  const formatDateTime = (dateString: string) => {
    if (!isClient) return '로딩 중...';
    if (!isValidDate(dateString)) return '날짜 없음';
    const date = new Date(dateString);
    return format(date, 'MM/dd HH:mm', { locale: ko });
  };

  return (
    <Card 
      className={cn(
        "transition-all duration-200 hover:shadow-md",
        todo.completed && "opacity-75 bg-muted/50",
        isOverdue(todo.due_date || '') && "border-destructive/50 bg-destructive/5",
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <Checkbox
              checked={todo.completed}
              onCheckedChange={() => onToggleComplete(todo.id)}
              className="mt-1"
              aria-label={todo.completed ? '완료됨' : '미완료'}
            />
            <div className="flex-1 min-w-0">
              <h3 className={cn(
                "font-semibold text-lg leading-tight",
                todo.completed && "line-through text-muted-foreground"
              )}>
                {todo.title}
              </h3>
              {todo.description && (
                <p className={cn(
                  "text-sm text-muted-foreground mt-1",
                  todo.completed && "line-through"
                )}>
                  {todo.description}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* 우선순위 배지 */}
            <Badge variant={getPriorityColor(todo.priority)} className="text-xs">
              <Flag className="h-3 w-3 mr-1" />
              {todo.priority}
            </Badge>
            
            {/* 카테고리 배지 */}
            <Badge variant={getCategoryColor(todo.category)} className="text-xs">
              <Tag className="h-3 w-3 mr-1" />
              {todo.category}
            </Badge>
            
            {/* 마감일 배지 */}
            {todo.due_date && (
              <Badge 
                variant={isOverdue(todo.due_date) ? "destructive" : 
                        isDueSoon(todo.due_date) ? "secondary" : "outline"}
                className="text-xs"
              >
                <Calendar className="h-3 w-3 mr-1" />
                {formatDueDate(todo.due_date)}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              생성: {formatDateTime(todo.created_at)}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(todo)}
              className="h-8 w-8 p-0"
              aria-label="할 일 수정"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(todo.id)}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              aria-label="할 일 삭제"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TodoCard;
