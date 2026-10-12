'use client';

/** 프로모션 등록 폼 전용 소형 UI — 섹션 · 라벨/값 행 · 라디오 · 체크박스 · 버튼. */
import * as React from 'react';
import { cn } from '@/lib/utils';

export const BTN = 'h-[38px] shrink-0 rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-5 text-[14px] font-semibold text-[var(--ink2)] transition hover:bg-[var(--th)] disabled:pointer-events-none disabled:text-[var(--ink5)]';
export const BTN_PRI = 'h-[38px] shrink-0 rounded-[var(--r-field)] bg-[var(--ac)] px-6 text-[14px] font-semibold text-white transition hover:bg-[var(--ac-h)] disabled:bg-[var(--line2)] disabled:text-[var(--ink4)]';
export const BTN_SM = 'h-7 shrink-0 rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-2.5 text-[13px] font-semibold text-[var(--ink2)] transition hover:bg-[var(--th)]';
export const BTN_PILL = 'h-7 shrink-0 rounded-[var(--r-full)] border border-[var(--line3)] bg-white px-3 text-[13px] font-semibold text-[var(--ink2)] transition hover:bg-[var(--th)]';
export const INP = 'inp h-[38px] rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-[14px] text-[14px]';
export const SEL = 'sel h-[38px] rounded-[var(--r-field)] border border-[var(--line3)] bg-white pl-[14px] pr-8 text-[14px]';
export const DT = 'h-[38px] rounded-[var(--r-field)] border border-[var(--line3)] px-[12px] text-[14px]';

export function Sect({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 first:mt-0">
      <h3 className="mb-3 text-[16px] font-bold leading-[24px] tracking-[-0.2px] text-[var(--ink)]">{title}</h3>
      <div className="border-t border-[var(--line2)]">{children}</div>
    </section>
  );
}

/** 라벨/값 한 행 — 필수는 라벨에 별표, 오류는 값 아래 */
export function Row({ label, req, err, children }: {
  label: string; req?: boolean; err?: string; children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[160px_1fr] border-b border-[var(--line)]">
      <div className="flex items-start bg-[var(--th)] px-4 py-3 text-[14px] font-semibold leading-[20px] text-[var(--ink2)]">
        {label}{req && <span className="ml-0.5 text-[var(--bad)]">*</span>}
      </div>
      <div className="min-w-0 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2 text-[14px] leading-[20px] text-[var(--ink)]">{children}</div>
        {err && <p className="mt-1.5 text-[13px] leading-[18px] text-[var(--bad)]">{err}</p>}
      </div>
    </div>
  );
}

export const Hint = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[13px] leading-[18px] text-[var(--ink3)]">{children}</span>
);
export const Note = ({ children }: { children: React.ReactNode }) => (
  <p className="w-full text-[13px] leading-[18px] text-[var(--ink3)]">{children}</p>
);

export function Rd({ on, onChange, children, disabled }: {
  on: boolean; onChange: () => void; children: React.ReactNode; disabled?: boolean;
}) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap', disabled && 'cursor-not-allowed opacity-45')}>
      <input type="radio" checked={on} disabled={disabled} onChange={onChange} className="h-4 w-4" />
      {children}
    </label>
  );
}
export function Ck({ on, onChange, children, disabled }: {
  on: boolean; onChange: () => void; children: React.ReactNode; disabled?: boolean;
}) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap', disabled && 'cursor-not-allowed opacity-45')}>
      <input type="checkbox" checked={on} disabled={disabled} onChange={onChange} className="h-4 w-4" />
      {children}
    </label>
  );
}

/** 사용/미사용 같은 2지선다 */
export function RdPair<T extends string>({ value, opts, onChange, disabled }: {
  value: T; opts: readonly T[]; onChange: (v: T) => void; disabled?: boolean;
}) {
  return (
    <span className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {opts.map((o) => <Rd key={o} on={value === o} disabled={disabled} onChange={() => onChange(o)}>{o}</Rd>)}
    </span>
  );
}

/** 모달 껍데기 */
export function Dialog({ title, sub, width = 520, children, foot, onClose }: {
  title: string; sub?: string; width?: number; children: React.ReactNode; foot?: React.ReactNode; onClose: () => void;
}) {
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/35 p-6" onMouseDown={onClose}>
      <div
        role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()} style={{ width }}
        className="flex max-h-[86vh] max-w-full flex-col overflow-hidden rounded-[var(--dlg-r)] bg-white shadow-[var(--dlg-shadow)]"
      >
        <div className="px-6 pt-6">
          <h3 className="m-0 text-[20px] font-bold leading-[28px] tracking-[-0.6px] text-[var(--ink)]">{title}</h3>
          {sub && <p className="mt-1 text-[13px] text-[var(--ink3)]">{sub}</p>}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{children}</div>
        <div className="flex justify-end gap-2 px-6 pb-6">{foot}</div>
      </div>
    </div>
  );
}
