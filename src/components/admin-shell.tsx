'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';

const SIDEBAR_KEY = 'admin.sidebarCollapsed';
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
  // 사이드바 접힘 — SSR은 기본값(false)으로 그리고, 마운트 후 localStorage 값으로 동기화(하이드레이션 불일치 방지).
  //  접어두면 새로고침해도 접힌 채 유지(2026-10-13 사용자 요청).
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try { if (localStorage.getItem(SIDEBAR_KEY) === '1') setCollapsed(true); } catch { /* 접근 불가(프라이빗 등) 시 무시 */ }
  }, []);
  const toggleSidebar = useCallback(() => {
    setCollapsed((v) => {
      const next = !v;
      try { localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0'); } catch { /* 무시 */ }
      return next;
    });
  }, []);
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
        <AdminTopbar collapsed={collapsed} onToggleSidebar={toggleSidebar} />
        <div className="flex min-h-0 flex-1">
          <AdminSidebar collapsed={collapsed} />
          <AdminMain>{children}</AdminMain>
          <AiCommunicatorRail content={rail?.node ?? null} />
        </div>
      </div>
    </AiRailContext.Provider>
  );
}
