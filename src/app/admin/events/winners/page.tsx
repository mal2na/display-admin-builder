// 프로모션 관리 › 당첨자 관리 — SB Figma(BO-AIM-EVT-PG082/089). 목록 ↔ 상세(5탭).
'use client';
import * as React from 'react';
import { PageHeader } from '@/components/page-header';
import { WinnerList } from './winner-list';
import { WinnerDetail } from './winner-detail';
import type { WinnerRow } from '@/lib/promotion/winner';

export default function WinnersPage() {
  const [sel, setSel] = React.useState<WinnerRow | null>(null);
  const [toastMsg, setToastMsg] = React.useState<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = React.useCallback((m: string) => { setToastMsg(m); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setToastMsg(null), 2400); }, []);
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const Toast = toastMsg ? (
    <div className="pointer-events-none fixed bottom-10 left-1/2 z-[90] -translate-x-1/2">
      <div className="rounded-[10px] bg-[var(--toast-bg,#000b14cf)] px-4 py-2.5 text-[14px] leading-[20px] text-white shadow-[var(--dlg-shadow)]">{toastMsg}</div>
    </div>
  ) : null;

  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader trail={['프로모션 관리', '당첨자 관리', ...(sel ? ['당첨자 관리 상세'] : [])]} title={sel ? '당첨자 관리 상세' : '당첨자 관리'} />
      <div className="mt-6">
        {sel ? <WinnerDetail row={sel} onBack={() => setSel(null)} onToast={toast} /> : <WinnerList onOpen={(r) => setSel(r)} />}
      </div>
      {Toast}
    </div>
  );
}
