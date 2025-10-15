'use client';

import React from 'react';
import { useAuth } from './AuthProvider';

/**
 * 인증 가드 컴포넌트의 props 타입
 */
interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean; // true: 로그인 필요, false: 비로그인 필요
  redirectTo?: string;   // 리다이렉트할 경로
}

/**
 * 인증 상태에 따라 페이지 접근을 제어하는 가드 컴포넌트
 * @description 로그인 상태에 따라 자동으로 리다이렉트하거나 페이지를 보호합니다.
 */
const AuthGuard = ({ 
  children, 
  requireAuth = true, 
  redirectTo 
}: AuthGuardProps) => {
  const { user, loading } = useAuth();

  // 로딩 중일 때는 로딩 화면 표시
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 로그인이 필요한 페이지인데 로그인하지 않은 경우
  if (requireAuth && !user) {
    // 리다이렉트는 AuthProvider에서 처리되므로 여기서는 null 반환
    return null;
  }

  // 비로그인이 필요한 페이지(로그인/회원가입)인데 로그인한 경우
  if (!requireAuth && user) {
    // 리다이렉트는 AuthProvider에서 처리되므로 여기서는 null 반환
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;
