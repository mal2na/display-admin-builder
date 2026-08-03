'use client';

import { useState } from 'react';
import Link from 'next/link';
import { NavLink } from '@/components/nav-link';
import { MonitorSmartphone, LayoutGrid, ScrollText, PanelLeftClose, PanelLeftOpen, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

// 좌측 사이드바 — 접기/펴기 지원 (전체폭 ↔ 아이콘 레일)
export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn('flex shrink-0 flex-col border-r bg-card transition-[width] duration-200', collapsed ? 'w-14' : 'w-56')}>
      <div className="flex h-14 items-center gap-1 border-b px-2.5">
        <Link href="/admin/containers" className="flex min-w-0 items-center gap-2 font-semibold">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <LayoutDashboard className="h-4 w-4" />
          </span>
          {!collapsed && <span className="truncate tracking-wide">ADMIN</span>}
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
          aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
          className={cn('rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground', collapsed ? 'mx-auto' : 'ml-auto')}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-2">
        <NavLink href="/admin/containers" icon={<MonitorSmartphone className="h-4 w-4" />} label="전시화면 관리" collapsed={collapsed} />
        <NavLink href="/admin/corner-types" icon={<LayoutGrid className="h-4 w-4" />} label="코너 유형 관리" collapsed={collapsed} />
        <NavLink href="/admin/audit-log" icon={<ScrollText className="h-4 w-4" />} label="감사 로그" collapsed={collapsed} />
      </nav>

      <div className="border-t p-3 text-center text-xs text-muted-foreground">{collapsed ? 'v0.31' : 'POL-DSP v0.31'}</div>
    </aside>
  );
}
