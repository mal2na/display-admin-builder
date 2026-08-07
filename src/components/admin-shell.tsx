'use client';

import { useState } from 'react';
import { AdminTopbar } from '@/components/admin-topbar';
import { AdminSidebar } from '@/components/admin-sidebar';
import { AdminMain } from '@/components/admin-main';

/**
 * 관리자 셸 — GNB(상단) + LNB(좌측) + 콘텐츠.
 * 사이드바 접기 상태를 여기서 소유하고, 토글 버튼은 GNB에, 반응은 LNB에 전달한다.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="flex h-screen flex-col">
      <AdminTopbar collapsed={collapsed} onToggleSidebar={() => setCollapsed((v) => !v)} />
      <div className="flex min-h-0 flex-1">
        <AdminSidebar collapsed={collapsed} />
        <AdminMain>{children}</AdminMain>
      </div>
    </div>
  );
}
