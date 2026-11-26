'use client';
// 당첨자 관리 목록 — SB Figma(BO-AIM-EVT-PG082). 검색 영역 + 조회 결과 테이블 + 페이저.
//  행 클릭 → 당첨자 관리 상세(추후). 공용 ops-ui(FilterPanel·ListHeader·StatusPill·Pager) 재사용.
import * as React from 'react';
import { FilterPanel, ListHeader, StatusPill, Pager, TABLE_CLS, THEAD_TR_CLS, TBODY_TR_CLS, type FilterCell } from '@/components/ops-ui';
import {
  WINNER_ROWS, WINNER_TOTAL, WINNER_PROMO_TYPES, WINNER_PROMO_STATUSES, WINNER_PROCESS_STATUSES, WINNER_SEARCH_FIELDS,
  approvalTone, type WinnerRow,
} from '@/lib/promotion/winner';

const FIELD = 'h-[38px] rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-3 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--focus-border)]';

function Select({ value, onChange, options, w = 160 }: { value: string; onChange: (v: string) => void; options: readonly string[]; w?: number }) {
  return (
    <span className="relative" style={{ width: w }}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${FIELD} w-full appearance-none pr-8`}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <svg className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink4)]" viewBox="0 0 20 20" fill="none"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </span>
  );
}

export function WinnerList({ onOpen }: { onOpen?: (r: WinnerRow) => void }) {
  const [promoType, setPromoType] = React.useState('전체');
  const [promoStatus, setPromoStatus] = React.useState('전체');
  const [process, setProcess] = React.useState('전체');
  const [periodFrom, setPeriodFrom] = React.useState('');
  const [periodTo, setPeriodTo] = React.useState('');
  const [field, setField] = React.useState<string>(WINNER_SEARCH_FIELDS[0]);
  const [q, setQ] = React.useState('');
  // 적용된 필터(조회 버튼 눌러야 반영)
  const [applied, setApplied] = React.useState({ promoType: '전체', promoStatus: '전체', process: '전체', field: WINNER_SEARCH_FIELDS[0] as string, q: '' });
  const [page, setPage] = React.useState(1);

  const rows = React.useMemo(() => WINNER_ROWS.filter((r) => {
    if (applied.promoType !== '전체' && r.promoType !== applied.promoType) return false;
    if (applied.promoStatus !== '전체' && r.promoStatus !== applied.promoStatus) return false;
    if (applied.process !== '전체' && r.process !== applied.process) return false;
    if (applied.q.trim()) {
      const hay = applied.field === '프로모션 ID' ? r.promoId : applied.field === '최종 수정자' ? r.editor : r.promoName;
      if (!hay.toLowerCase().includes(applied.q.trim().toLowerCase())) return false;
    }
    return true;
  }), [applied]);

  const search = () => { setApplied({ promoType, promoStatus, process, field, q }); setPage(1); };
  const reset = () => {
    setPromoType('전체'); setPromoStatus('전체'); setProcess('전체'); setPeriodFrom(''); setPeriodTo(''); setField(WINNER_SEARCH_FIELDS[0]); setQ('');
    setApplied({ promoType: '전체', promoStatus: '전체', process: '전체', field: WINNER_SEARCH_FIELDS[0], q: '' });
    setPage(1);
  };

  // 전체 조회(필터 없음)면 Figma 전체 건수(639), 필터 걸리면 결과 수.
  const isAll = applied.promoType === '전체' && applied.promoStatus === '전체' && applied.process === '전체' && !applied.q.trim();
  const count = isAll ? WINNER_TOTAL : rows.length;

  const dateCls = `${FIELD} w-[130px] tabular-nums`;
  const filterRows: FilterCell[][] = [
    [
      ['프로모션 유형', <Select key="t" value={promoType} onChange={setPromoType} options={WINNER_PROMO_TYPES} w={190} />],
      ['프로모션 상태', <Select key="s" value={promoStatus} onChange={setPromoStatus} options={WINNER_PROMO_STATUSES} w={140} />],
      ['처리 상태', <Select key="p" value={process} onChange={setProcess} options={WINNER_PROCESS_STATUSES} w={130} />],
    ],
    [
      ['기간', <span key="d" className="flex items-center gap-2">
        <span className="text-[13px] text-[var(--ink3)]">참여 기간</span>
        <input type="text" placeholder="YYYY.MM.DD" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} className={dateCls} />
        <span className="text-[var(--ink4)]">~</span>
        <input type="text" placeholder="YYYY.MM.DD" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} className={dateCls} />
      </span>],
      ['검색 항목', <span key="q" className="flex items-center gap-2">
        <Select value={field} onChange={setField} options={WINNER_SEARCH_FIELDS} w={150} />
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="내용을 입력하세요" className={`${FIELD} w-[280px]`} />
      </span>, 1],
    ],
  ];

  const Th = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <th className={`whitespace-nowrap px-3 py-2.5 text-left text-[13px] font-semibold text-[var(--ink3)] ${className}`}>{children}</th>
  );

  return (
    <>
      <FilterPanel rows={filterRows} onReset={reset} onSearch={search} />
      <ListHeader title="조회 결과" count={count} />
      <div className="overflow-x-auto border-y border-[var(--line2)] bg-white">
        <table className={TABLE_CLS}>
          <thead>
            <tr className={THEAD_TR_CLS}>
              <Th className="w-14">No.</Th>
              <Th>프로모션 ID</Th>
              <Th>프로모션 유형</Th>
              <Th>프로모션명</Th>
              <Th>프로모션 상태</Th>
              <Th>참여 기간</Th>
              <Th>승인 상태</Th>
              <Th>처리 상태</Th>
              <Th className="text-right">참여자 수</Th>
              <Th>지급 현황</Th>
              <Th>최종 수정자</Th>
              <Th>최종 수정일시</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={12} className="px-3 py-12 text-center text-[14px] text-[var(--ink4)]">조회 결과가 없습니다.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.promoId} className={`${TBODY_TR_CLS} cursor-pointer`} onClick={() => onOpen?.(r)}>
                <td className="px-3 py-3 align-middle tabular-nums text-[var(--ink3)]">{r.no}</td>
                <td className="whitespace-nowrap px-3 py-3 align-middle font-mono text-[13px] text-[var(--ink2)]">{r.promoId}</td>
                <td className="whitespace-nowrap px-3 py-3 align-middle text-[var(--ink2)]">{r.promoType}</td>
                <td className="px-3 py-3 align-middle font-medium text-[var(--ink)]">{r.promoName}</td>
                <td className="whitespace-nowrap px-3 py-3 align-middle text-[var(--ink2)]">{r.promoStatus}</td>
                <td className="whitespace-nowrap px-3 py-3 align-middle tabular-nums text-[var(--ink2)]">{r.joinPeriod}</td>
                <td className="px-3 py-3 align-middle">{r.approval === '-' ? <span className="text-[var(--ink4)]">-</span> : <StatusPill label={r.approval} tone={approvalTone(r.approval)} />}</td>
                <td className="whitespace-nowrap px-3 py-3 align-middle text-[var(--ink2)]">{r.process}</td>
                <td className="px-3 py-3 text-right align-middle tabular-nums text-[var(--ink)]">{r.joinCount.toLocaleString()}</td>
                <td className="whitespace-nowrap px-3 py-3 align-middle tabular-nums text-[var(--ink2)]">{r.paid.toLocaleString()} / {typeof r.total === 'number' ? r.total.toLocaleString() : r.total}</td>
                <td className="whitespace-nowrap px-3 py-3 align-middle text-[var(--ink2)]">{r.editor}</td>
                <td className="whitespace-nowrap px-3 py-3 align-middle tabular-nums text-[var(--ink3)]">{r.editedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <Pager page={page} totalPages={Math.max(1, Math.ceil(count / 10))} onChange={setPage} />
      </div>
    </>
  );
}
