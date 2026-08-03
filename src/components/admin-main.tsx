'use client';

import { usePathname } from 'next/navigation';

/**
 * 관리자 콘텐츠 셸. 디자인1(BO) 기준: 단일 페이지는 큰 흰색 라운드 패널 안에 담는다.
 * 빌더(/builder)와 전시화면(/containers)은 자체 풀높이 레이아웃이라 패널 없이 그대로 렌더.
 */
export function AdminMain({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? '';
  const fullBleed = path.includes('/builder') || path.startsWith('/admin/containers');

  if (fullBleed) {
    return <main className="flex-1 overflow-x-hidden bg-background">{children}</main>;
  }
  return (
    <main className="flex-1 overflow-y-auto bg-background p-4">
      <div className="mx-auto min-h-[calc(100vh-2rem)] max-w-[1400px] overflow-hidden rounded-2xl border bg-card shadow-sm">
        {children}
      </div>
    </main>
  );
}
