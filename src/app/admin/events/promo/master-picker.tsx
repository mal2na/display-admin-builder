'use client';

/**
 * 마스터 조회 팝업 — 상품 / 결제 수단 / 이벤트.
 *  상품은 "한 조건에 같은 유형만" 규칙이 있어 먼저 고른 항목의 유형으로 탭이 잠긴다.
 *  이벤트는 유형 탭 없이 전체를 평평하게 보여준다.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { PRODUCTS, PAYMENTS, EVENT_MASTER, PROD_TYPES, type Picked } from '@/lib/promotion/cond';

export type PickerMode = 'prod' | 'pay' | 'event';

const LABEL: Record<PickerMode, [string, string, string]> = {
  prod: ['상품 조회', '상품 마스터 연계 (예시 데이터)', '상품명 검색'],
  pay: ['결제 수단 조회', '결제 수단 마스터 연계 (예시 데이터)', '결제 수단 검색'],
  event: ['이벤트 조회', '이벤트 목록 연계 (예시 데이터)', '이벤트명 검색'],
};

const BTN = 'h-[38px] shrink-0 rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-5 text-[14px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]';
const BTN_PRI = 'h-[38px] shrink-0 rounded-[var(--r-field)] bg-[var(--ac)] px-6 text-[14px] font-semibold text-white hover:bg-[var(--ac-h)]';

export function MasterPicker({ mode, types, value, onApply, onClose }: {
  mode: PickerMode;
  /** 상품 조회에서 보여줄 유형 탭 (행동 조건이 허용하는 상품 유형) */
  types?: string[];
  value: Picked[];
  onApply: (picked: Picked[]) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = React.useState<Picked[]>(value);
  const [q, setQ] = React.useState('');
  const tabs = mode === 'pay' ? Object.keys(PAYMENTS) : (types ?? PROD_TYPES);
  const [tab, setTab] = React.useState(() => (picked.length && tabs.includes(picked[0].type) ? picked[0].type : tabs[0]));
  const [warn, setWarn] = React.useState('');

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // 상품은 한 조건에 같은 유형만 — 먼저 고른 유형으로 탭이 잠긴다
  const lock = mode === 'prod' && picked.length ? picked[0].type : null;
  const kw = q.trim().toLowerCase();

  const rows: { id: string; name: string; type: string }[] = React.useMemo(() => {
    if (mode === 'event') {
      return Object.entries(EVENT_MASTER)
        .flatMap(([d, l]) => l.map((n) => ({ n, d })))
        .filter((x) => !kw || x.n.toLowerCase().includes(kw))
        .map((x, i) => ({ id: `E${String(i + 1).padStart(4, '0')}`, name: x.n, type: x.d }));
    }
    const M = mode === 'pay' ? PAYMENTS : PRODUCTS;
    const prefix = mode === 'pay' ? `M${Object.keys(PAYMENTS).indexOf(tab) + 1}` : `P${PROD_TYPES.indexOf(tab) + 1}`;
    return (M[tab] ?? [])
      .filter((n) => !kw || n.toLowerCase().includes(kw))
      .map((n, i) => ({ id: `${prefix}${String(i + 1).padStart(3, '0')}`, name: n, type: tab }));
  }, [mode, tab, kw]);

  const toggle = (row: { name: string; type: string }) => {
    setWarn('');
    setPicked((p) => (p.some((x) => x.name === row.name) ? p.filter((x) => x.name !== row.name) : p.concat({ name: row.name, type: row.type })));
  };

  const apply = () => {
    if (!picked.length) {
      setWarn(mode === 'event' ? '이벤트를 1개 이상 선택해주세요' : mode === 'pay' ? '결제 수단을 1개 이상 선택해주세요' : '상품을 1개 이상 선택해주세요');
      return;
    }
    onApply(picked);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/35 p-6" onMouseDown={onClose}>
      <div
        role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}
        className="flex max-h-[86vh] w-[720px] max-w-full flex-col overflow-hidden rounded-[var(--dlg-r)] bg-white shadow-[var(--dlg-shadow)]"
      >
        <div className="flex items-start gap-3 px-6 pt-6">
          <div>
            <h3 className="m-0 text-[20px] font-bold leading-[28px] tracking-[-0.6px] text-[var(--ink)]">{LABEL[mode][0]}</h3>
            <p className="mt-1 text-[13px] text-[var(--ink3)]">{LABEL[mode][1]}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기" className="ml-auto text-[var(--ink3)] hover:text-[var(--ink)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 pt-4">
          <input
            autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={LABEL[mode][2]}
            className="inp h-[38px] w-full rounded-[var(--r-field)] border border-[var(--line3)] px-[14px] text-[14px]"
          />
          {mode !== 'event' && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tabs.map((t) => {
                const off = !!lock && t !== lock;
                return (
                  <button
                    key={t} type="button" disabled={off} aria-pressed={tab === t}
                    onClick={() => setTab(t)}
                    className={cn('h-8 rounded-[var(--r-full)] border px-3.5 text-[13px] font-semibold transition',
                      tab === t ? 'border-[var(--ac)] bg-[var(--ac2)] text-[var(--ac)]' : 'border-[var(--line2)] bg-white text-[var(--ink2)] hover:bg-[var(--th)]',
                      off && 'cursor-not-allowed opacity-40 hover:bg-white')}
                  >{t}</button>
                );
              })}
            </div>
          )}
          {lock && <p className="mt-2 text-[13px] text-[var(--ink3)]">한 조건에는 같은 유형의 상품만 담을 수 있어요 (현재: {lock})</p>}
          {warn && <p className="mt-2 text-[13px] text-[var(--bad)]">{warn}</p>}
        </div>

        <div className="mt-3 min-h-[220px] flex-1 overflow-y-auto px-6">
          {rows.length === 0 ? (
            <p className="py-12 text-center text-[14px] text-[var(--ink3)]">검색 결과가 없어요.</p>
          ) : (
            <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {rows.map((row) => {
                const on = picked.some((p) => p.name === row.name);
                return (
                  <li key={row.id}>
                    <label className="flex cursor-pointer items-center gap-3 py-2.5 text-[14px]">
                      <input type="checkbox" checked={on} onChange={() => toggle(row)} className="h-4 w-4" />
                      <span className="w-[72px] shrink-0 font-mono text-[12px] text-[var(--ink3)]">{row.id}</span>
                      <b className="min-w-0 flex-1 truncate font-semibold">{row.name}</b>
                      <small className="shrink-0 text-[12px] text-[var(--ink3)]">{row.type}</small>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-2 px-6 py-4">
          <span className="text-[13px] text-[var(--ink3)]">{picked.length}개 선택</span>
          <div className="ml-auto flex gap-2">
            <button type="button" className={BTN} onClick={onClose}>취소</button>
            <button type="button" className={BTN_PRI} onClick={apply}>확인</button>
          </div>
        </div>
      </div>
    </div>
  );
}
