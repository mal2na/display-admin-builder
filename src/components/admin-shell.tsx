'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { AdminTopbar } from '@/components/admin-topbar';
import { AdminSidebar } from '@/components/admin-sidebar';
import { AdminMain } from '@/components/admin-main';
import { AiCommunicatorRail } from '@/components/ai-communicator-rail';
import { AiRailContext } from '@/components/ai-rail-context';

/**
 * 관리자 셸 — GNB(상단) + LNB(좌측) + 콘텐츠 + AI Communicator 우측 레일.
 * 사이드바/AI 레일 접기 상태를 여기서 소유한다.
 * 페이지는 AiRailContext.setRail 로 레일에 자기 콘텐츠(예: 배너 어시스턴트)를 꽂을 수 있다.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  // 레일은 기본 숨김. 페이지가 setRail 로 콘텐츠를 꽂을 때만 우측에 나타난다(배너 등록 등).
  const [rail, setRailState] = useState<{ id: string; node: ReactNode } | null>(null);

  const setRail = useCallback((id: string, node: ReactNode | null) => {
    setRailState((cur) => {
      if (node == null) return cur && cur.id === id ? null : cur; // 자기 소유일 때만 비움
      return { id, node };
    });
  }, []);

  return (
    <AiRailContext.Provider value={{ setRail }}>
      <div className="flex h-screen flex-col">
        <AdminTopbar collapsed={collapsed} onToggleSidebar={() => setCollapsed((v) => !v)} />
        <div className="flex min-h-0 flex-1">
          <AdminSidebar collapsed={collapsed} />
          <AdminMain>{children}</AdminMain>
          <AiCommunicatorRail content={rail?.node ?? null} />
        </div>
      </div>
    </AiRailContext.Provider>
  );
}
