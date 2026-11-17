'use client';

/** 조건 관리 공용 토스트 훅 — 프로모션 관리(promo-admin)와 동일한 규격의 하단 토스트. */
import * as React from 'react';

export function useToast() {
  const [msg, setMsg] = React.useState<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = React.useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2600);
  }, []);
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const toastNode = msg ? (
    <div className="pointer-events-none fixed bottom-10 left-1/2 z-[90] -translate-x-1/2">
      <div className="rounded-[8px] bg-[var(--toast-bg)] px-4 py-2.5 text-[14px] leading-[20px] text-white shadow-[var(--dlg-shadow)]">
        {msg}
      </div>
    </div>
  ) : null;

  return { toast, toastNode };
}
