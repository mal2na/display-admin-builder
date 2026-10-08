'use client';

/**
 * 전체페이지 관리 전용 소형 UI — 폼 테이블 · 태그 · 모달 · 토스트.
 *  색·치수는 전부 globals.css 토큰과 공용 컴포넌트(CHIP_BASE/TONES)를 쓴다. 하드코딩 금지.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { CHIP_BASE } from '@/lib/display-taxonomy';
import { TONES, type Tone } from '@/components/ops-ui';

/* ── 섹션 · 폼 테이블 ────────────────────────────────────────────── */
export function Sect({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="m-0 text-[16px] font-bold leading-[24px] tracking-[-0.2px] text-[var(--ink)]">{title}</h2>
        {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
      </div>
      {children}
    </section>
  );
}

export function FTable({ children }: { children: React.ReactNode }) {
  return <div className="border-t border-[var(--line2)]">{children}</div>;
}

const K_CLS = 'flex items-center bg-[var(--th)] px-4 py-3 text-[14px] font-semibold leading-[20px] text-[var(--ink2)]';
const V_CLS = 'flex min-w-0 flex-wrap items-center gap-2 px-4 py-2.5 text-[14px] leading-[20px] text-[var(--ink)]';

export function FRow({ k, children, required }: { k: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="grid grid-cols-[180px_1fr] border-b border-[var(--line)]">
      <div className={K_CLS}>{k}{required && <span className="ml-0.5 text-[var(--bad)]">*</span>}</div>
      <div className={V_CLS}>{children}</div>
    </div>
  );
}

export function FRow2({ k1, v1, k2, v2 }: { k1: string; v1: React.ReactNode; k2: string; v2: React.ReactNode }) {
  return (
    <div className="grid border-b border-[var(--line)] md:grid-cols-[180px_1fr_180px_1fr]">
      <div className={K_CLS}>{k1}</div>
      <div className={V_CLS}>{v1}</div>
      <div className={K_CLS}>{k2}</div>
      <div className={V_CLS}>{v2}</div>
    </div>
  );
}

/** 값 영역 안의 보조 설명 */
export function Hint({ children, tone }: { children: React.ReactNode; tone?: 'warn' }) {
  return <span className={cn('text-[13px] leading-[18px]', tone === 'warn' ? 'text-[var(--warn)]' : 'text-[var(--ink3)]')}>{children}</span>;
}
/** 값 아래 줄로 떨어지는 안내 블록 */
export function Block({ children, tone }: { children: React.ReactNode; tone?: 'warn' | 'acc' }) {
  return (
    <div className={cn(
      'w-full rounded-[var(--r-field)] px-3 py-2 text-[13px] leading-[18px]',
      tone === 'warn' ? 'bg-[var(--warnbg)] text-[var(--warn)]'
        : tone === 'acc' ? 'bg-[var(--ac2)] text-[var(--ac)]'
          : 'bg-[var(--th)] text-[var(--ink3)]',
    )}>{children}</div>
  );
}

export const Mono = ({ children }: { children: React.ReactNode }) => (
  <span className="font-mono text-[13px] tabular-nums">{children}</span>
);

/** 참조 ID 링크 모양 (실제 이동은 없고 목업 토스트) */
export function Lnk({ children, onClick, title }: { children: React.ReactNode; onClick?: () => void; title?: string }) {
  return (
    <button type="button" title={title} onClick={onClick}
      className="rounded-[4px] bg-[var(--ac2)] px-1.5 py-0.5 font-mono text-[13px] text-[var(--ac)] hover:bg-[var(--ac3)]">
      {children}
    </button>
  );
}

/* ── 태그 ───────────────────────────────────────────────────────── */
export function Tag({ tone = 'neutral', title, children, className }: {
  tone?: Tone; title?: string; children: React.ReactNode; className?: string;
}) {
  return <span title={title} className={cn(CHIP_BASE, TONES[tone], className)}>{children}</span>;
}

/** 채널 칩 — 앱 계열은 글자만 브랜드 블루 (Figma TD_L_Input) */
export function ChannelChips({ channels }: { channels: string[] }) {
  const out: string[] = [];
  if (channels.includes('pcweb')) out.push('PC웹');
  if (channels.includes('mweb')) out.push('모바일웹');
  const a = channels.includes('aos'); const i = channels.includes('ios');
  if (a && i) out.push('Android / iOS 앱'); else if (a) out.push('Android 앱'); else if (i) out.push('iOS 앱');
  if (!out.length) return <Hint>—</Hint>;
  return (
    // 한 줄 유지 — 목록 행 높이를 48 로 고정하기 위해 줄바꿈하지 않는다(표는 가로 스크롤).
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      {out.map((c) => (
        <span key={c} className={cn(CHIP_BASE, 'bg-[var(--th)] px-2',
          c.includes('앱') ? 'text-[var(--ac)]' : 'text-[var(--ink2)]')}>{c}</span>
      ))}
    </span>
  );
}

export function Chips({ items, tone = 'neutral' }: { items: string[]; tone?: Tone }) {
  if (!items.length) return <Hint>—</Hint>;
  return <span className="flex flex-wrap items-center gap-1">{items.map((t) => <Tag key={t} tone={tone}>{t}</Tag>)}</span>;
}

/* ── 입력 ───────────────────────────────────────────────────────── */
export function Opt({ checked, onChange, type = 'radio', disabled, children }: {
  checked: boolean; onChange: () => void; type?: 'radio' | 'checkbox'; disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-[14px] leading-[20px]',
      disabled && 'cursor-not-allowed opacity-45')}>
      <input type={type} checked={checked} disabled={disabled} onChange={onChange} className="h-4 w-4" />
      {children}
    </label>
  );
}

export function OptGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-x-5 gap-y-2">{children}</div>;
}

/* ── 모달 ───────────────────────────────────────────────────────── */
export type ModalSpec = {
  title: string;
  body?: React.ReactNode;
  okText?: string;
  cancelText?: string;
  noCancel?: boolean;
  okDisabled?: boolean;
  width?: number;
  onOk?: () => void;
  onCancel?: () => void;
};

export function Modal({ spec, onClose }: { spec: ModalSpec; onClose: () => void }) {
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-6" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ width: spec.width ?? 520 }}
        className="max-h-[86vh] max-w-full overflow-hidden rounded-[var(--dlg-r)] bg-white shadow-[var(--dlg-shadow)]"
      >
        <div className="flex items-center gap-3 px-6 pt-6">
          <h3 className="m-0 text-[20px] font-bold leading-[28px] tracking-[-0.6px] text-[var(--ink)]">{spec.title}</h3>
        </div>
        <div className="max-h-[62vh] overflow-y-auto px-6 pb-2 pt-4 text-[14px] leading-[20px] text-[var(--ink2)]">
          {spec.body}
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6 pt-4">
          {!spec.noCancel && (
            <button type="button" onClick={() => { spec.onCancel?.(); onClose(); }}
              className="h-[38px] rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-5 text-[14px] font-semibold text-[var(--ink3)] hover:bg-[var(--th)]">
              {spec.cancelText ?? '취소'}
            </button>
          )}
          <button type="button" disabled={spec.okDisabled} onClick={() => { spec.onOk?.(); onClose(); }}
            className="h-[38px] rounded-[var(--r-field)] bg-[var(--ac)] px-6 text-[14px] font-semibold text-white hover:bg-[var(--ac-h)] disabled:bg-[var(--line2)] disabled:text-[var(--ink4)]">
            {spec.okText ?? '확인'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 토스트 ─────────────────────────────────────────────────────── */
export function Toast({ msg }: { msg: string }) {
  return (
    <div className="pointer-events-none fixed bottom-10 left-1/2 z-[90] -translate-x-1/2">
      <div className="rounded-[8px] bg-[var(--toast-bg)] px-4 py-2.5 text-[14px] leading-[20px] text-white shadow-[var(--dlg-shadow)]">
        {msg}
      </div>
    </div>
  );
}

/* ── 하단 액션 바 ───────────────────────────────────────────────── */
export function FormActions({ left, children }: { left?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-6">
      {left}
      <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export const BTN = 'h-[38px] shrink-0 rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-5 text-[14px] font-semibold text-[var(--ink2)] transition hover:bg-[var(--th)] disabled:pointer-events-none disabled:text-[var(--ink5)]';
export const BTN_PRI = 'h-[38px] shrink-0 rounded-[var(--r-field)] bg-[var(--ac)] px-6 text-[14px] font-semibold text-white transition hover:bg-[var(--ac-h)] disabled:bg-[var(--line2)] disabled:text-[var(--ink4)]';
export const BTN_SM = 'h-7 shrink-0 rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-2.5 text-[13px] font-semibold text-[var(--ink2)] transition hover:bg-[var(--th)] disabled:pointer-events-none disabled:text-[var(--ink5)]';
