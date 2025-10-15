'use client';

import { useEffect } from 'react';

/**
 * HTTPS 접속을 HTTP로 리다이렉트하는 컴포넌트
 * @description 개발 환경에서 HTTPS 접속 시 HTTP로 자동 리다이렉트합니다.
 */
const HTTPSRedirect = () => {
  useEffect(() => {
    // 개발 환경에서만 실행
    if (process.env.NODE_ENV === 'development') {
      // HTTPS로 접속한 경우 HTTP로 리다이렉트
      if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
        const httpUrl = window.location.href.replace('https:', 'http:');
        window.location.replace(httpUrl);
      }
    }
  }, []);

  return null;
};

export default HTTPSRedirect;
