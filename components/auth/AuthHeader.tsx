'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, LogOut, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from './AuthProvider';
import { toast } from 'sonner';

/**
 * 사용자 인증 상태를 관리하는 헤더 컴포넌트
 * @description 로그인 상태에 따라 사용자 정보와 로그아웃 기능을 제공합니다.
 */
const AuthHeader = () => {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [logoutLoading, setLogoutLoading] = useState(false);

  /**
   * 로그아웃 처리
   */
  const handleLogout = async () => {
    setLogoutLoading(true);
    
    try {
      await signOut();
      toast.success('로그아웃되었습니다.');
    } catch (error: unknown) {
      console.error('로그아웃 오류:', error);
      toast.error('로그아웃 중 오류가 발생했습니다.');
    } finally {
      setLogoutLoading(false);
    }
  };

  /**
   * 사용자 이름의 첫 글자를 가져오는 함수
   */
  const getUserInitials = (user: { user_metadata?: { name?: string }; email?: string } | null) => {
    if (user?.user_metadata?.name) {
      return user.user_metadata.name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  /**
   * 사용자 표시 이름을 가져오는 함수
   */
  const getUserDisplayName = (user: { user_metadata?: { name?: string }; email?: string } | null) => {
    if (user?.user_metadata?.name) {
      return user.user_metadata.name;
    }
    if (user?.email) {
      return user.email;
    }
    return '사용자';
  };

  // 로딩 중일 때는 아무것도 렌더링하지 않음
  if (loading) {
    return null;
  }

  // 로그인하지 않은 경우 로그인 버튼 표시
  if (!user) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <CheckSquare className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg">AI Todo Manager</span>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => router.push('/login')}
        >
          로그인
        </Button>
      </div>
    );
  }

  // 로그인한 경우 사용자 메뉴 표시
  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <CheckSquare className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="font-semibold text-lg">AI Todo Manager</span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {getUserInitials(user)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <div className="flex items-center justify-start gap-2 p-2">
            <div className="flex flex-col space-y-1 leading-none">
              <p className="font-medium">{getUserDisplayName(user)}</p>
              <p className="w-[200px] truncate text-sm text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={handleLogout}
            disabled={logoutLoading}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>{logoutLoading ? '로그아웃 중...' : '로그아웃'}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default AuthHeader;
