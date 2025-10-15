'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

/**
 * 인증 컨텍스트 타입 정의
 */
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

/**
 * 인증 컨텍스트 생성
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * 인증 상태를 관리하는 Provider 컴포넌트
 * @description 전역적으로 사용자 인증 상태를 관리하고 페이지 접근 권한을 제어합니다.
 */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  /**
   * 로그아웃 처리
   */
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  /**
   * 인증 상태 초기화 및 감지
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // 현재 세션 확인
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        
        // 클라이언트 사이드에서만 리다이렉트 처리
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          const isPublicPage = currentPath === '/login' || currentPath === '/signup';
          
          // 로그인하지 않은 사용자가 보호된 페이지에 접근한 경우 리다이렉트
          if (!session?.user && !isPublicPage) {
            router.push('/login');
          }
        }
      } catch (error) {
        console.error('인증 상태 초기화 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // 인증 상태 변화 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);

        // 클라이언트 사이드에서만 리다이렉트 처리
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          const isPublicPage = currentPath === '/login' || currentPath === '/signup';

          // 인증 상태에 따른 리다이렉트 처리
          if (event === 'SIGNED_IN' && session?.user) {
            // 로그인 성공 시 현재 경로가 로그인/회원가입 페이지면 메인으로 리다이렉트
            if (isPublicPage) {
              router.push('/');
            }
          } else if (event === 'SIGNED_OUT') {
            // 로그아웃 시 로그인 페이지로 리다이렉트
            router.push('/login');
          } else if (!session?.user && !isPublicPage) {
            // 로그인하지 않은 사용자가 보호된 페이지에 접근한 경우 리다이렉트
            router.push('/login');
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router, supabase.auth]);

  const value = {
    user,
    loading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * 인증 컨텍스트를 사용하는 커스텀 훅
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
