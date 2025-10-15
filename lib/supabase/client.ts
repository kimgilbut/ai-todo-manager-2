import { createBrowserClient } from '@supabase/ssr';

/**
 * 클라이언트 컴포넌트용 Supabase 클라이언트
 * @description 클라이언트 사이드에서 사용하는 Supabase 클라이언트를 생성합니다.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
