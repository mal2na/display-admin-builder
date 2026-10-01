'use client';

import { usePathname } from 'next/navigation';

/**
 * 관리자 콘텐츠 셸. 참고 화면(번호이동 관리) 기준: LNB·GNB는 라벤더 크롬, 콘텐츠는 그 위에 뜬 흰 라운드 패널.
 * 라벤더 여백(p-3)이 LNB와 콘텐츠 사이에 보이고, 흰 패널의 라운드 코너가 그 경계를 만든다.
 * 빌더(/builder)와 전시화면(/containers)은 자체 풀높이 레이아웃이라 그대로 렌더.
 */
export function AdminMain({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? '';
  // 프로모션 관리(/admin/events)는 정적 프로토타입(자체 풀페이지 크롬)이라 여백 없이 edge-to-edge로 렌더.
  const fullBleed = path.includes('/builder') || path.startsWith('/admin/containers') || path.startsWith('/admin/events');

  if (fullBleed) {
    // 컨테이너·프로모션 영역은 자체 레이아웃(또는 프로토타입)이 전체를 채운다 → 여백 없이 그대로.
    if (path.startsWith('/admin/containers') || path.startsWith('/admin/events')) {
      return <main className="min-h-0 flex-1 overflow-hidden bg-background">{children}</main>;
    }
    // 빌더·새 프로모션: 라벤더 여백 위에 자식(루트 div)이 라운드 패널로 뜬다.
    return <main className="min-h-0 flex-1 overflow-hidden bg-[#ebeef6] p-3">{children}</main>;
  }
  // 흰 패널을 LNB 바로 옆·헤더 바로 밑에 붙인다(좌/상 여백 제거). 우/하 라벤더 여백만 유지.
  //  단, 좌상단 모서리는 라운드 유지(2026-10-01 사용자 요청) — LNB 접힘 영역 옆이 둥글게.
  return (
    <main className="min-h-0 flex-1 overflow-hidden bg-[#ebeef6] pb-3 pr-3">
      <div className="h-full overflow-y-auto rounded-2xl border border-l-0 border-t-0 bg-card shadow-sm">{children}</div>
    </main>
  );
}
