'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Save, X, Sparkles } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Todo } from './TodoCard';

/**
 * TodoForm 컴포넌트의 props 타입
 */
interface TodoFormProps {
  todo?: Todo;
  onSubmit: (data: TodoFormData) => void;
  onCancel: () => void;
  loading?: boolean;
  className?: string;
}

/**
 * 폼 데이터 타입
 */
export interface TodoFormData {
  title: string;
  description?: string;
  due_date?: string;
  priority: '높음' | '중간' | '낮음';
  category: '업무' | '개인' | '학습' | '건강';
  completed: boolean;
}

/**
 * 할 일 추가/편집 폼 컴포넌트
 * @description 할 일을 생성하거나 수정하는 폼을 제공하며, AI 모드와 수동 모드를 지원합니다.
 */
const TodoForm = ({ 
  todo, 
  onSubmit, 
  onCancel, 
  loading = false, 
  className 
}: TodoFormProps) => {
  const [formData, setFormData] = useState<TodoFormData>({
    title: '',
    description: '',
    due_date: '',
    priority: '중간',
    category: '업무',
    completed: false
  });
  
  const [errors, setErrors] = useState<Partial<TodoFormData>>({});
  const [isAIMode, setIsAIMode] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isAIParsing, setIsAIParsing] = useState(false);

  /**
   * 컴포넌트 마운트 시 기존 할 일 데이터로 폼 초기화
   */
  useEffect(() => {
    if (todo) {
      setFormData({
        title: todo.title,
        description: todo.description || '',
        due_date: todo.due_date || '',
        priority: todo.priority,
        category: todo.category,
        completed: todo.completed
      });
    }
  }, [todo]);

  /**
   * 입력값 검증 함수
   */
  const validateForm = (): boolean => {
    const newErrors: Partial<TodoFormData> = {};

    if (!formData.title.trim()) {
      newErrors.title = '할 일 제목을 입력해주세요.';
    } else if (formData.title.length > 100) {
      newErrors.title = '할 일 제목은 100자 이하로 입력해주세요.';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = '설명은 500자 이하로 입력해주세요.';
    }

    if (formData.due_date) {
      const dueDate = new Date(formData.due_date);
      const now = new Date();
      if (dueDate < now) {
        newErrors.due_date = '마감일은 현재 시간 이후로 설정해주세요.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * 폼 제출 핸들러
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSubmit(formData);
  };

  /**
   * AI 모드에서 자연어 입력 처리
   */
  const handleAISubmit = async () => {
    if (!aiInput.trim()) {
      setErrors({ title: 'AI 모드에서는 자연어로 할 일을 입력해주세요.' });
      return;
    }

    setIsAIParsing(true);
    setErrors({});

    try {
      // AI API 호출
      const response = await fetch('/api/ai/parse-todo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: aiInput }),
      });

      const result = await response.json();

      // 오류 응답 처리
      if (!response.ok || !result.success) {
        const errorMessage = result.error || 'AI 파싱에 실패했습니다.';
        throw new Error(errorMessage);
      }

      // 성공 응답 처리
      if (result.data) {
        // AI 파싱 결과를 폼 데이터에 적용
        setFormData(prev => ({
          ...prev,
          title: result.data.title,
          description: result.data.description || '',
          due_date: result.data.due_date,
          priority: result.data.priority,
          category: result.data.category,
        }));
        
        setAiInput('');
        setIsAIMode(false);
        setErrors({}); // 에러 초기화
      } else {
        throw new Error('AI 파싱 결과가 올바르지 않습니다.');
      }
    } catch (error: unknown) {
      console.error('AI 파싱 오류:', error);
      
      const err = error as Error;
      // 사용자 친화적인 오류 메시지 표시
      let errorMessage = err.message || 'AI 파싱에 실패했습니다.';
      
      // 네트워크 오류 처리
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorMessage = '네트워크 연결을 확인해주세요.';
      }
      
      setErrors({ title: errorMessage });
    } finally {
      setIsAIParsing(false);
    }
  };


  /**
   * 입력 필드 변경 핸들러
   */
  const handleInputChange = (field: keyof TodoFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 에러 메시지 제거
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
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
   * 날짜 포맷팅 함수 (클라이언트 사이드에서만 실행)
   */
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    if (!isValidDate(dateString)) return '유효하지 않은 날짜';
    const date = new Date(dateString);
    return format(date, 'yyyy-MM-dd HH:mm', { locale: ko });
  };

  return (
    <Card className={cn("w-full max-w-2xl mx-auto", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {todo ? '할 일 수정' : '새 할 일 추가'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="ai-mode" className="text-sm font-medium">
              AI 모드
            </Label>
            <Switch
              id="ai-mode"
              checked={isAIMode}
              onCheckedChange={setIsAIMode}
            />
            {isAIMode && (
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                AI
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {isAIMode ? (
            /* AI 모드 */
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="ai-input" className="text-sm font-medium">
                    자연어로 할 일을 입력하세요
                  </Label>
                  <span className={cn(
                    "text-xs",
                    aiInput.length > 500 ? "text-destructive font-medium" : "text-muted-foreground"
                  )}>
                    {aiInput.length} / 500자
                  </span>
                </div>
                <Textarea
                  id="ai-input"
                  placeholder="예: 내일 오전 10시에 팀 회의 준비하기"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  className={cn("mt-1", aiInput.length > 500 && "border-destructive")}
                  rows={3}
                  disabled={isAIParsing}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  AI가 자연어를 분석하여 할 일을 구조화합니다.
                </p>
                {errors.title && (
                  <p className="text-sm text-destructive mt-2 font-medium">{errors.title}</p>
                )}
              </div>
              
              <Button
                type="button"
                onClick={handleAISubmit}
                disabled={!aiInput.trim() || loading || isAIParsing}
                className="w-full"
              >
                {isAIParsing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                    AI 분석 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI로 할 일 생성
                  </>
                )}
              </Button>
            </div>
          ) : (
            /* 수동 모드 */
            <>
              {/* 제목 */}
              <div>
                <Label htmlFor="title" className="text-sm font-medium">
                  제목 *
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="할 일 제목을 입력하세요"
                  className={cn("mt-1", errors.title && "border-destructive")}
                />
                {errors.title && (
                  <p className="text-sm text-destructive mt-1">{errors.title}</p>
                )}
              </div>

              {/* 설명 */}
              <div>
                <Label htmlFor="description" className="text-sm font-medium">
                  설명
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="할 일에 대한 상세 설명을 입력하세요"
                  className={cn("mt-1", errors.description && "border-destructive")}
                  rows={3}
                />
                {errors.description && (
                  <p className="text-sm text-destructive mt-1">{errors.description}</p>
                )}
              </div>

              {/* 우선순위와 카테고리 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">우선순위</Label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={(value: '높음' | '중간' | '낮음') => handleInputChange('priority', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="높음">높음</SelectItem>
                      <SelectItem value="중간">중간</SelectItem>
                      <SelectItem value="낮음">낮음</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">카테고리</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value: '업무' | '개인' | '학습' | '건강') => handleInputChange('category', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="업무">업무</SelectItem>
                      <SelectItem value="개인">개인</SelectItem>
                      <SelectItem value="학습">학습</SelectItem>
                      <SelectItem value="건강">건강</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 마감일 */}
              <div>
                <Label className="text-sm font-medium">마감일</Label>
                <div className="mt-1 flex gap-2 items-center">
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal",
                          !formData.due_date && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4 shrink-0" />
                        <span className="truncate">
                          {formData.due_date ? formatDate(formData.due_date) : "마감일 선택"}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={formData.due_date ? new Date(formData.due_date) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const dateTime = new Date(date);
                            dateTime.setHours(23, 59, 59, 999);
                            handleInputChange('due_date', dateTime.toISOString());
                          }
                          setIsCalendarOpen(false);
                        }}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  
                  {formData.due_date && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      onClick={() => handleInputChange('due_date', '')}
                      aria-label="마감일 지우기"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {errors.due_date && (
                  <p className="text-sm text-destructive mt-1">{errors.due_date}</p>
                )}
              </div>

              {/* 완료 상태 (수정 모드에서만) */}
              {todo && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="completed"
                    checked={formData.completed}
                    onCheckedChange={(checked) => handleInputChange('completed', checked)}
                  />
                  <Label htmlFor="completed" className="text-sm font-medium">
                    완료됨
                  </Label>
                </div>
              )}
            </>
          )}

          {/* 버튼 그룹 */}
          {!isAIMode && (
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                <X className="h-4 w-4 mr-2" />
                취소
              </Button>
              <Button
                type="submit"
                disabled={loading || !formData.title.trim()}
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? '저장 중...' : (todo ? '수정' : '추가')}
              </Button>
            </div>
          )}
          
          {isAIMode && (
            <div className="flex justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading || isAIParsing}
              >
                <X className="h-4 w-4 mr-2" />
                취소
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export default TodoForm;
