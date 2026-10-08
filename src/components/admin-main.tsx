'use client';

import { usePathname } from 'next/navigation';

/**
 * 관리자 콘텐츠 셸.
 * LNB/GNB는 라벤더 크롬(var(--bg)), 콘텐츠는 그 위에 뜬 흰 패널.
 * ── 패널 라운드 기준 (2026-10-08 사용자 요청) ──
 *   전시화면 관리(컨테이너 목록 패널 rounded-2xl = 16px)를 기준으로 전 메뉴를 통일한다.
 *   하단·우측 라벤더 여백 + 흰 패널 라운드 16px (전 메뉴 동일).
 * 빌더는 자체 풀높이 레이아웃이라 그대로 렌더.
 */
export function AdminMain({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? '';
  const isBuilder = path.includes('/builder');
  // 전시화면 관리는 자체 레이아웃(컨테이너 목록 + 콘텐츠 2패널)이 라운드를 직접 들고 있다.
  const ownsLayout = path.startsWith('/admin/containers');

  if (isBuilder) {
    // 빌더: 라벤더 여백 위에 자식(루트 div)이 라운드 패널로 뜬다.
    return <main className="min-h-0 flex-1 overflow-hidden bg-[var(--bg)] p-3">{children}</main>;
  }
  if (ownsLayout) {
    return <main className="min-h-0 flex-1 overflow-hidden bg-[var(--bg)]">{children}</main>;
  }
  // 프로모션 관리(iframe)를 포함한 나머지 전 메뉴 — 동일한 흰 패널 + 좌상단 16px 라운드.
  // 전시화면 관리와 동일: 하단·우측에 라벤더 여백을 두고 흰 패널은 라운드 16px.
  return (
    <main className="min-h-0 flex-1 overflow-hidden bg-[var(--bg)] pb-3 pr-3">
      <div className="h-full overflow-y-auto rounded-2xl bg-[var(--panel)]">{children}</div>
    </main>
  );
}
