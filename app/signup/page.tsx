'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, User, Sparkles, CheckSquare, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { createClient } from '@/lib/supabase/client';
import AuthGuard from '@/components/auth/AuthGuard';

/**
 * 회원가입 페이지 컴포넌트
 * @description 새로운 사용자 계정 생성을 위한 회원가입 화면을 제공합니다.
 */
export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /**
   * 입력 필드 변경 핸들러
   */
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 에러 메시지 제거
    if (error) setError(null);
    if (success) setSuccess(false);
  };

  /**
   * 폼 제출 핸들러
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // 입력값 검증
      if (!validateForm()) {
        return;
      }

      // Supabase Auth를 통한 회원가입
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
          }
        }
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        setSuccess(true);
        // 이메일 확인이 필요한 경우를 대비해 성공 메시지 표시
        // 실제 프로젝트 설정에 따라 즉시 로그인 처리하거나 이메일 확인 안내
        setTimeout(() => {
          router.push('/');
        }, 2000);
      }

    } catch (err: unknown) {
      // Supabase 오류 메시지를 사용자 친화적으로 변환
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 입력값 검증
   */
  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('이름을 입력해주세요.');
      return false;
    }
    if (formData.name.trim().length < 2) {
      setError('이름은 최소 2자 이상이어야 합니다.');
      return false;
    }
    if (!formData.email.trim()) {
      setError('이메일을 입력해주세요.');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('올바른 이메일 형식을 입력해주세요.');
      return false;
    }
    if (!formData.password.trim()) {
      setError('비밀번호를 입력해주세요.');
      return false;
    }
    if (formData.password.length < 8) {
      setError('비밀번호는 최소 8자 이상이어야 합니다.');
      return false;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      setError('비밀번호는 대문자, 소문자, 숫자를 포함해야 합니다.');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return false;
    }
    return true;
  };

  /**
   * Supabase 오류 메시지를 사용자 친화적으로 변환
   */
  const getErrorMessage = (error: unknown): string => {
    const err = error as Error;
    if (err?.message) {
      const message = err.message.toLowerCase();
      
      if (message.includes('user already registered')) {
        return '이미 등록된 이메일입니다. 로그인을 시도해보세요.';
      }
      if (message.includes('invalid email')) {
        return '올바른 이메일 형식을 입력해주세요.';
      }
      if (message.includes('password')) {
        return '비밀번호가 너무 약합니다. 더 강한 비밀번호를 사용해주세요.';
      }
      if (message.includes('network') || message.includes('fetch')) {
        return '네트워크 연결을 확인해주세요.';
      }
      if (message.includes('rate limit')) {
        return '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.';
      }
      
      return err.message;
    }
    
    return '회원가입 중 오류가 발생했습니다. 다시 시도해주세요.';
  };


  return (
    <AuthGuard requireAuth={false}>
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* 서비스 로고 및 소개 */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <CheckSquare className="h-7 w-7 text-primary-foreground" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-foreground">AI Todo Manager</h1>
              <p className="text-sm text-muted-foreground">스마트한 할 일 관리</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">회원가입</h2>
            <p className="text-sm text-muted-foreground">
              자연어로 입력하면 AI가 자동으로 구조화하는<br />
              스마트한 할 일 관리 시스템에 함께하세요
            </p>
          </div>
        </div>

        {/* 회원가입 폼 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">새 계정 만들기</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 성공 메시지 */}
              {success && (
                <Alert className="border-green-200 bg-green-50 text-green-800">
                  <CheckSquare className="h-4 w-4" />
                  <AlertDescription>
                    회원가입이 완료되었습니다! 잠시 후 메인 페이지로 이동합니다.
                  </AlertDescription>
                </Alert>
              )}

              {/* 에러 메시지 */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* 이름 입력 */}
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="이름을 입력하세요"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="pl-10"
                    disabled={loading || success}
                  />
                </div>
              </div>

              {/* 이메일 입력 */}
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="이메일을 입력하세요"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="pl-10"
                    disabled={loading || success}
                  />
                </div>
              </div>

              {/* 비밀번호 입력 */}
              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="비밀번호를 입력하세요"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="pl-10 pr-10"
                    disabled={loading || success}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading || success}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* 비밀번호 확인 */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="비밀번호를 다시 입력하세요"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className="pl-10 pr-10"
                    disabled={loading || success}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading || success}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* 회원가입 버튼 */}
              <Button
                type="submit"
                className="w-full"
                disabled={loading || success || !formData.name || !formData.email || !formData.password || !formData.confirmPassword}
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                    회원가입 중...
                  </>
                ) : success ? (
                  <>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    회원가입 완료
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    회원가입
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <Separator className="my-6" />

            {/* 로그인 링크 */}
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                이미 계정이 있으신가요?
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/login">
                  로그인
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 서비스 특징 */}
        <div className="grid grid-cols-1 gap-4 text-center">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">AI Todo Manager의 특징</h3>
            <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div className="flex items-center justify-center gap-1 p-2 rounded-lg bg-muted/50">
                <Sparkles className="h-3 w-3 text-primary" />
                <span>AI 자연어 처리</span>
              </div>
              <div className="flex items-center justify-center gap-1 p-2 rounded-lg bg-muted/50">
                <CheckSquare className="h-3 w-3 text-primary" />
                <span>우선순위 관리</span>
              </div>
              <div className="flex items-center justify-center gap-1 p-2 rounded-lg bg-muted/50">
                <div className="h-3 w-3 rounded-full bg-primary" />
                <span>카테고리 분류</span>
              </div>
              <div className="flex items-center justify-center gap-1 p-2 rounded-lg bg-muted/50">
                <div className="h-3 w-3 rounded border-2 border-primary" />
                <span>스마트 분석</span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground space-y-2">
              <div className="p-3 rounded-lg bg-muted/30 border border-muted">
                <p className="font-medium text-foreground mb-1">💡 AI 기능 예시</p>
                <p className="text-xs">입력: &quot;내일 오전 10시에 팀 회의 준비&quot;</p>
                <p className="text-xs">→ AI가 자동으로 제목, 마감일, 우선순위, 카테고리 설정</p>
              </div>
              <div className="space-y-1">
                <p>• 자연어로 할 일을 입력하면 AI가 자동으로 구조화</p>
                <p>• 우선순위(높음/중간/낮음)와 카테고리(업무/개인/학습) 관리</p>
                <p>• AI 요약 및 분석으로 생산성 향상</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="font-medium text-primary mb-1">🎉 회원가입 혜택</p>
                <div className="space-y-1 text-xs">
                  <p>• Google Gemini 2.5 Flash AI 엔진 활용</p>
                  <p>• 무제한 할 일 생성 및 관리</p>
                  <p>• 실시간 AI 분석 및 인사이트 제공</p>
                  <p>• 반응형 웹/모바일 지원</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </AuthGuard>
  );
}
