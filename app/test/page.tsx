import Link from 'next/link';

export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">테스트 페이지</h1>
      <p>이 페이지가 보인다면 Next.js가 정상적으로 작동하고 있습니다.</p>
      <div className="mt-4 space-x-4">
        <Link href="/" className="text-blue-500 underline">홈페이지</Link>
        <Link href="/login" className="text-blue-500 underline">로그인</Link>
        <Link href="/signup" className="text-blue-500 underline">회원가입</Link>
      </div>
    </div>
  );
}
