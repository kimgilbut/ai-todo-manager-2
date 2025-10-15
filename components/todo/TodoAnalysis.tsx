'use client';

import React, { useState } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  AlertCircle, 
  Lightbulb, 
  RefreshCw,
  Target,
  CheckCircle2,
  Clock,
  Calendar,
  Zap,
  TrendingDown,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/**
 * 분석 결과 타입
 */
interface AnalysisData {
  summary: string;
  urgentTasks: string[];
  insights: string[];
  recommendations: string[];
}

/**
 * AI 할 일 분석 컴포넌트
 * @description 사용자의 할 일 목록을 AI가 분석하여 요약과 인사이트를 제공합니다.
 */
const TodoAnalysis = () => {
  const [period, setPeriod] = useState<'today' | 'week'>('today');
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * AI 분석 실행
   */
  const handleAnalyze = async (selectedPeriod: 'today' | 'week') => {
    setLoading(true);
    setError(null);
    setPeriod(selectedPeriod);

    try {
      const response = await fetch('/api/ai/analyze-todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ period: selectedPeriod }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'AI 분석에 실패했습니다.');
      }

      setAnalysisData(result.data);
      toast.success('AI 분석이 완료되었습니다!');
    } catch (err: unknown) {
      console.error('AI 분석 오류:', err);
      const error = err as Error;
      const errorMessage = error.message || 'AI 분석 중 오류가 발생했습니다.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 로딩 스켈레톤 UI
   */
  const LoadingSkeleton = () => (
    <div className="space-y-6 animate-pulse">
      {/* 완료율 섹션 */}
      <div className="space-y-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-2 w-full" />
      </div>
      
      {/* 카드 섹션 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      
      {/* 리스트 섹션 */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );

  /**
   * 완료율을 계산하는 헬퍼 함수
   */
  const getCompletionRate = (summary: string): number => {
    const match = summary.match(/(\d+\.?\d*)%/);
    return match ? parseFloat(match[1]) : 0;
  };

  /**
   * 인사이트 아이콘 가져오기
   */
  const getInsightIcon = (insight: string, index: number) => {
    const lower = insight.toLowerCase();
    if (lower.includes('완료') || lower.includes('성취')) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    } else if (lower.includes('시간') || lower.includes('오전') || lower.includes('오후')) {
      return <Clock className="h-4 w-4 text-blue-500" />;
    } else if (lower.includes('우선순위') || lower.includes('긴급')) {
      return <Zap className="h-4 w-4 text-yellow-500" />;
    } else if (lower.includes('주의') || lower.includes('연체')) {
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    } else if (lower.includes('패턴') || lower.includes('트렌드')) {
      return <Activity className="h-4 w-4 text-purple-500" />;
    }
    return <Lightbulb className="h-4 w-4 text-yellow-500" />;
  };

  /**
   * 오늘의 요약 결과 렌더링
   */
  const renderTodayAnalysis = (data: AnalysisData) => {
    const completionRate = getCompletionRate(data.summary);
    
    return (
      <div className="space-y-6">
        {/* 완료율 */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">완료율</h3>
              </div>
              <div className="text-4xl font-bold text-primary">
                {completionRate.toFixed(0)}%
              </div>
            </div>
            
            <Progress value={completionRate} className="h-3 mb-3" />
            
            <p className="text-sm text-muted-foreground leading-relaxed">
              {data.summary}
            </p>
          </CardContent>
        </Card>

        {/* 오늘 집중해야 할 작업 (긴급 작업) */}
        {data.urgentTasks.length > 0 && (
          <Card className="border-l-4 border-l-destructive">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-destructive" />
                  <CardTitle className="text-lg">🔥 오늘 집중해야 할 작업</CardTitle>
                </div>
                <Badge variant="destructive">
                  {data.urgentTasks.length}개
                </Badge>
              </div>
              <CardDescription>
                우선순위가 높거나 마감이 임박한 작업입니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.urgentTasks.map((task, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 hover:bg-destructive/15 transition-colors"
                  >
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-destructive text-destructive-foreground text-xs font-bold shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-sm font-medium flex-1 leading-relaxed">
                      {task}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 인사이트 - 하나의 카드로 통합 */}
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-lg">💡 인사이트</CardTitle>
            </div>
            <CardDescription>
              오늘의 생산성 분석 결과입니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3 pb-3 last:pb-0 border-b last:border-0">
                  {getInsightIcon(insight, index)}
                  <p className="text-sm text-muted-foreground flex-1 leading-relaxed">
                    {insight}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 추천 사항 */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">🎯 실천 가이드</CardTitle>
            </div>
            <CardDescription>
              오늘 바로 적용할 수 있는 추천 사항입니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recommendations.map((recommendation, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors border border-primary/10"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed">
                      {recommendation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 다시 분석 버튼 */}
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => handleAnalyze('today')}
          disabled={loading}
          className="w-full"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          다시 분석하기
        </Button>
      </div>
    );
  };

  /**
   * 이번 주 요약 결과 렌더링
   */
  const renderWeekAnalysis = (data: AnalysisData) => {
    const completionRate = getCompletionRate(data.summary);
    
    return (
      <div className="space-y-6">
        {/* 주간 완료율과 트렌드 */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* 완료율 */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">주간 완료율</h3>
              </div>
              <div className="text-4xl font-bold text-primary mb-3">
                {completionRate.toFixed(0)}%
              </div>
              <Progress value={completionRate} className="h-2" />
            </CardContent>
          </Card>

          {/* 생산성 트렌드 */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
                <h3 className="font-semibold">생산성 패턴</h3>
              </div>
              <div className="flex items-baseline gap-2 mb-3">
                {completionRate >= 70 ? (
                  <>
                    <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                      상승 추세 📈
                    </span>
                  </>
                ) : completionRate >= 40 ? (
                  <>
                    <Activity className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                      안정적 유지
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    <span className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                      개선 필요 💪
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                이번 주 활동 기록을 기반으로 분석했어요
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 요약 */}
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {data.summary}
            </p>
          </CardContent>
        </Card>

        {/* 이번 주 긴급 작업 */}
        {data.urgentTasks.length > 0 && (
          <Card className="border-l-4 border-l-destructive">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <CardTitle className="text-lg">⚠️ 이번 주 긴급 작업</CardTitle>
                </div>
                <Badge variant="destructive">
                  {data.urgentTasks.length}개
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.urgentTasks.map((task, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
                  >
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-destructive text-destructive-foreground text-xs font-bold shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-sm font-medium flex-1 leading-relaxed">
                      {task}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 주간 인사이트 */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg">📊 주간 생산성 분석</CardTitle>
            </div>
            <CardDescription>
              이번 주 활동 패턴과 인사이트입니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3 pb-3 last:pb-0 border-b last:border-0">
                  {getInsightIcon(insight, index)}
                  <p className="text-sm text-muted-foreground flex-1 leading-relaxed">
                    {insight}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 다음 주 계획 (추천 사항) */}
        <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <CardTitle className="text-lg">🗓️ 다음 주 전략</CardTitle>
            </div>
            <CardDescription>
              더 나은 한 주를 위한 실천 계획입니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recommendations.map((recommendation, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-gray-900 border border-purple-200 dark:border-purple-800 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed">
                      {recommendation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 다시 분석 버튼 */}
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => handleAnalyze('week')}
          disabled={loading}
          className="w-full"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          다시 분석하기
        </Button>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI 요약 및 분석
            </CardTitle>
            <CardDescription className="mt-1">
              AI가 할 일 목록을 분석하여 인사이트와 추천 사항을 제공합니다
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="today">오늘의 요약</TabsTrigger>
            <TabsTrigger value="week">이번 주 요약</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-4">
            {!analysisData || period !== 'today' ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="mb-6 relative">
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                  <Calendar className="relative h-16 w-16 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">오늘의 할 일 분석</h3>
                <p className="text-muted-foreground mb-6 max-w-sm">
                  AI가 오늘의 할 일을 분석하여 집중해야 할 우선순위와 실천 가능한 조언을 제공합니다
                </p>
                <Button 
                  onClick={() => handleAnalyze('today')}
                  disabled={loading}
                  size="lg"
                  className="gap-2"
                >
                  {loading && period === 'today' ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      분석 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      AI 요약 시작
                    </>
                  )}
                </Button>
              </div>
            ) : loading ? (
              <LoadingSkeleton />
            ) : error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{error}</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleAnalyze('today')}
                    className="ml-4"
                  >
                    재시도
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              renderTodayAnalysis(analysisData)
            )}
          </TabsContent>

          <TabsContent value="week" className="space-y-4">
            {!analysisData || period !== 'week' ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="mb-6 relative">
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                  <Activity className="relative h-16 w-16 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">이번 주 할 일 분석</h3>
                <p className="text-muted-foreground mb-6 max-w-sm">
                  AI가 이번 주 전체의 할 일을 분석하여 주간 패턴과 다음 주를 위한 전략을 제공합니다
                </p>
                <Button 
                  onClick={() => handleAnalyze('week')}
                  disabled={loading}
                  size="lg"
                  className="gap-2"
                >
                  {loading && period === 'week' ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      분석 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      AI 요약 시작
                    </>
                  )}
                </Button>
              </div>
            ) : loading ? (
              <LoadingSkeleton />
            ) : error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{error}</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleAnalyze('week')}
                    className="ml-4"
                  >
                    재시도
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              renderWeekAnalysis(analysisData)
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TodoAnalysis;

