'use client';

/**
 * 프로모션 관리 — 루트.
 *  목록은 React 로 이식했고(2026-10-08), 등록·상세(조건 빌더·리워드·CTA·추천 구조)는
 *  아직 public/promotion-prototype.html 프로토타입을 그대로 쓴다. 목록에서 [등록]·[예시 행]을
 *  누르면 그 화면만 딥링크(#reg · #ex=<key>)로 띄운다.
 */
import * as React from 'react';
import { PageHeader } from '@/components/page-header';
import { PromoList } from './promo-list';
import type { PromoRow } from '@/lib/promotion/model';

export function PromoAdmin() {
  const [proto, setProto] = React.useState<string | null>(null);
  const [toastMsg, setToastMsg] = React.useState<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = React.useCallback((m: string) => {
    setToastMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastMsg(null), 2600);
  }, []);
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  if (proto) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center gap-3 border-b border-[var(--line)] px-12 py-3">
          <button
            type="button"
            onClick={() => setProto(null)}
            className="h-[38px] rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-5 text-[14px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]"
          >
            ← 목록으로
          </button>
          <span className="text-[13px] text-[var(--ink3)]">등록·상세 화면은 아직 프로토타입을 사용합니다.</span>
        </div>
        <iframe
          key={proto}
          src={`/promotion-prototype.html${proto}`}
          title="프로모션 등록"
          className="min-h-0 flex-1 border-0 bg-white"
        />
      </div>
    );
  }

  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader trail={['프로모션 관리']} title="프로모션 관리" />
      <div className="mt-6">
        <PromoList
          onToast={toast}
          onRegister={() => setProto('#reg')}
          onOpenExample={(r: PromoRow) => setProto(`#ex=${encodeURIComponent(r.ex ?? '')}`)}
        />
      </div>

      {toastMsg && (
        <div className="pointer-events-none fixed bottom-10 left-1/2 z-[90] -translate-x-1/2">
          <div className="rounded-[8px] bg-[var(--toast-bg)] px-4 py-2.5 text-[14px] leading-[20px] text-white shadow-[var(--dlg-shadow)]">
            {toastMsg}
          </div>
        </div>
      )}
    </div>
  );
}
