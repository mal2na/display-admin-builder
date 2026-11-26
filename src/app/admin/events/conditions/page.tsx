// 프로모션 관리 › 조건 관리 › 조건 항목 관리 — SB Figma(BO-AIM-EVTMSN). 목록 ↔ 등록/수정 폼.
'use client';
import * as React from 'react';
import { PageHeader } from '@/components/page-header';
import { ConditionList } from './condition-list';
import { ConditionForm } from './condition-form';
import type { ConditionRow } from '@/lib/promotion/condition';

export default function ConditionsPage() {
  const [view, setView] = React.useState<{ mode: 'list' } | { mode: 'form'; row: ConditionRow | null }>({ mode: 'list' });
  const [toastMsg, setToastMsg] = React.useState<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = React.useCallback((m: string) => { setToastMsg(m); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setToastMsg(null), 2400); }, []);
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const Toast = toastMsg ? (
    <div className="pointer-events-none fixed bottom-10 left-1/2 z-[90] -translate-x-1/2">
      <div className="rounded-[10px] bg-[var(--toast-bg,#000b14cf)] px-4 py-2.5 text-[14px] leading-[20px] text-white shadow-[var(--dlg-shadow)]">{toastMsg}</div>
    </div>
  ) : null;

  const isForm = view.mode === 'form';
  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader
        trail={['프로모션 관리', '조건 관리', isForm ? (view.row ? '조건 항목 수정' : '조건 항목 등록') : '조건 항목 관리']}
        title={isForm ? (view.row ? '조건 항목 수정' : '조건 항목 등록') : '조건 항목 관리'}
      />
      <div className="mt-6">
        {view.mode === 'list' ? (
          <ConditionList onOpen={(r) => setView({ mode: 'form', row: r })} onRegister={() => setView({ mode: 'form', row: null })} />
        ) : (
          <ConditionForm row={view.row} onBack={() => setView({ mode: 'list' })} onToast={toast} />
        )}
      </div>
      {Toast}
    </div>
  );
}
