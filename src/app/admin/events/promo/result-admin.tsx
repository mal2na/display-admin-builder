'use client';

/**
 * 프로모션 관리 › 결과 관리 — 별도 LNB 메뉴(2026-10-20 사용자 요청: 프로모션 관리에서 분리).
 *  목록(ResultList) + 상세(ResultDetail) + 토스트를 담은 루트.
 */
import * as React from 'react';
import { PageHeader } from '@/components/page-header';
import { ResultList } from './result-list';
import { ResultDetail } from './result-detail';
import type { ResultRow } from '@/lib/promotion/result';

export function ResultAdmin() {
  const [rsDetail, setRsDetail] = React.useState<ResultRow | null>(null);
  const [toastMsg, setToastMsg] = React.useState<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = React.useCallback((m: string) => {
    setToastMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastMsg(null), 2600);
  }, []);
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const Toast = toastMsg ? (
    <div className="pointer-events-none fixed bottom-10 left-1/2 z-[90] -translate-x-1/2">
      <div className="rounded-[8px] bg-[var(--toast-bg)] px-4 py-2.5 text-[14px] leading-[20px] text-white shadow-[var(--dlg-shadow)]">{toastMsg}</div>
    </div>
  ) : null;

  if (rsDetail) {
    return (<><ResultDetail x={rsDetail} onBack={() => setRsDetail(null)} onToast={toast} />{Toast}</>);
  }

  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader trail={['프로모션 관리', '결과 관리']} title="결과 관리" />
      <div className="mt-6">
        <ResultList onToast={toast} onOpen={(r) => setRsDetail(r)} />
      </div>
      {Toast}
    </div>
  );
}
