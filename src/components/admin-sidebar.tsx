'use client';

import { NavLink } from '@/components/nav-link';
import { MonitorSmartphone, LayoutGrid, ScrollText, Ticket, ListTree } from 'lucide-react';
import { cn } from '@/lib/utils';

// 좌측 사이드바 — GNB와 같은 라벤더(#ebeef6) 배경. 브랜드/접기 토글은 GNB로 이동했다.
// 접기 상태는 AdminShell이 소유하고 prop으로 내려준다.
export function AdminSidebar({ collapsed }: { collapsed: boolean }) {
  return (
    <aside className={cn('flex shrink-0 flex-col bg-[#ebeef6] transition-[width] duration-200', collapsed ? 'w-14' : 'w-56')}>
      <nav className="flex flex-1 flex-col gap-1 p-2 pt-3">
        {/* 전시 관리 */}
        {collapsed ? <div className="my-1 h-px bg-border" /> : <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">전시 관리</p>}
        <NavLink href="/admin/containers" icon={<MonitorSmartphone className="h-4 w-4" />} label="전시화면 관리" collapsed={collapsed} />
        <NavLink href="/admin/corner-types" icon={<LayoutGrid className="h-4 w-4" />} label="코너 유형 관리" collapsed={collapsed} />
        <NavLink href="/admin/menus" icon={<ListTree className="h-4 w-4" />} label="전체 메뉴 관리" collapsed={collapsed} />

        {/* 프로모션 관리 */}
        {collapsed ? <div className="my-1 h-px bg-border" /> : <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">프로모션 관리</p>}
        <NavLink href="/admin/events" icon={<Ticket className="h-4 w-4" />} label="프로모션 관리" collapsed={collapsed} />

        {/* 공통 */}
        <div className="mt-auto" />
        {collapsed ? <div className="my-1 h-px bg-border" /> : <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">공통</p>}
        <NavLink href="/admin/audit-log" icon={<ScrollText className="h-4 w-4" />} label="감사 로그" collapsed={collapsed} />
      </nav>

      <div className="border-t p-3 text-center text-xs text-muted-foreground">{collapsed ? 'v0.31' : 'POL-DSP v0.31'}</div>
    </aside>
  );
}
