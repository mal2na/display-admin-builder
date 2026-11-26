'use client';
// 조건 항목 관리 목록 — SB Figma(BO-AIM-EVTMSN). 검색(분류·사용여부·회원전용·기간·검색어) + 테이블 + [등록].
import * as React from 'react';
import { FilterPanel, ListHeader, Pager, YN, TABLE_CLS, THEAD_TR_CLS, TBODY_TR_CLS, type FilterCell } from '@/components/ops-ui';
import {
  CONDITION_ROWS, CONDITION_TOTAL, COND_CATEGORIES, COND_PERIOD_FIELDS, COND_SEARCH_FIELDS, type ConditionRow,
} from '@/lib/promotion/condition';

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
// 전체/Y/N 라디오
function YNRadio({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <span className="flex items-center gap-3 text-[14px] text-[var(--ink2)]">
      {['전체', 'Y', 'N'].map((o) => (
        <label key={o} className="flex items-center gap-1.5">
          <input type="radio" checked={value === o} onChange={() => onChange(o)} className="h-4 w-4 accent-[var(--ac)]" />{o}
        </label>
      ))}
    </span>
  );
}

export function ConditionList({ onOpen, onRegister }: { onOpen?: (r: ConditionRow) => void; onRegister?: () => void }) {
  const [category, setCategory] = React.useState('전체');
  const [use, setUse] = React.useState('전체');
  const [memberOnly, setMemberOnly] = React.useState('전체');
  const [periodField, setPeriodField] = React.useState<string>(COND_PERIOD_FIELDS[0]);
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [field, setField] = React.useState<string>(COND_SEARCH_FIELDS[0]);
  const [q, setQ] = React.useState('');
  const [applied, setApplied] = React.useState({ category: '전체', use: '전체', memberOnly: '전체', field: COND_SEARCH_FIELDS[0] as string, q: '' });
  const [page, setPage] = React.useState(1);

  const rows = React.useMemo(() => CONDITION_ROWS.filter((r) => {
    if (applied.category !== '전체' && r.category !== applied.category) return false;
    if (applied.use !== '전체' && (r.use ? 'Y' : 'N') !== applied.use) return false;
    if (applied.memberOnly !== '전체' && (r.memberOnly ? 'Y' : 'N') !== applied.memberOnly) return false;
    if (applied.q.trim()) {
      const hay = applied.field === '조건 항목 ID' ? r.id : applied.field === '등록자' ? r.editor : applied.field === '최종 수정자' ? r.modifier : r.name;
      if (!hay.toLowerCase().includes(applied.q.trim().toLowerCase())) return false;
    }
    return true;
  }), [applied]);

  const search = () => { setApplied({ category, use, memberOnly, field, q }); setPage(1); };
  const reset = () => {
    setCategory('전체'); setUse('전체'); setMemberOnly('전체'); setPeriodField(COND_PERIOD_FIELDS[0]); setFrom(''); setTo(''); setField(COND_SEARCH_FIELDS[0]); setQ('');
    setApplied({ category: '전체', use: '전체', memberOnly: '전체', field: COND_SEARCH_FIELDS[0], q: '' }); setPage(1);
  };
  const isAll = applied.category === '전체' && applied.use === '전체' && applied.memberOnly === '전체' && !applied.q.trim();
  const count = isAll ? CONDITION_TOTAL : rows.length;

  const dateCls = `${FIELD} w-[130px] tabular-nums`;
  const filterRows: FilterCell[][] = [
    [
      ['조건 항목 분류', <Select key="c" value={category} onChange={setCategory} options={COND_CATEGORIES} w={160} />],
      ['사용 여부', <YNRadio key="u" value={use} onChange={setUse} />],
      ['회원 전용 여부', <YNRadio key="m" value={memberOnly} onChange={setMemberOnly} />],
      ['기간', <span key="d" className="flex items-center gap-2">
        <Select value={periodField} onChange={setPeriodField} options={COND_PERIOD_FIELDS} w={130} />
        <input type="text" placeholder="YYYY.MM.DD" value={from} onChange={(e) => setFrom(e.target.value)} className={dateCls} />
        <span className="text-[var(--ink4)]">~</span>
        <input type="text" placeholder="YYYY.MM.DD" value={to} onChange={(e) => setTo(e.target.value)} className={dateCls} />
      </span>],
    ],
    [
      ['검색 항목', <span key="q" className="flex items-center gap-2">
        <Select value={field} onChange={setField} options={COND_SEARCH_FIELDS} w={150} />
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
      <ListHeader title="조회 결과" count={count} right={
        <button type="button" onClick={onRegister} className="h-[38px] rounded-[var(--r-field)] bg-[var(--ac)] px-5 text-[14px] font-semibold text-white hover:bg-[var(--ac-h)]">등록</button>
      } />
      <div className="overflow-x-auto border-y border-[var(--line2)] bg-white">
        <table className={TABLE_CLS}>
          <thead>
            <tr className={THEAD_TR_CLS}>
              <Th className="w-14">No.</Th>
              <Th>조건 항목 ID</Th>
              <Th>조건 항목 분류</Th>
              <Th>조건 항목명</Th>
              <Th>입력 변수</Th>
              <Th>반환값</Th>
              <Th className="text-center">사용 여부</Th>
              <Th className="text-center">회원 전용 여부</Th>
              <Th>등록자</Th>
              <Th>등록 일시</Th>
              <Th>최종 수정자</Th>
              <Th>최종 수정 일시</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={12} className="px-3 py-12 text-center text-[14px] text-[var(--ink4)]">조회 결과가 없습니다.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className={`${TBODY_TR_CLS} cursor-pointer`} onClick={() => onOpen?.(r)}>
                <td className="px-3 py-3 align-middle tabular-nums text-[var(--ink3)]">{r.no}</td>
                <td className="whitespace-nowrap px-3 py-3 align-middle font-mono text-[13px] text-[var(--ink2)]">{r.id}</td>
                <td className="whitespace-nowrap px-3 py-3 align-middle text-[var(--ink2)]">{r.category}</td>
                <td className="px-3 py-3 align-middle font-medium text-[var(--ink)]">{r.name}</td>
                <td className="px-3 py-3 align-middle text-[var(--ink2)]">{r.inputVars}</td>
                <td className="whitespace-nowrap px-3 py-3 align-middle text-[var(--ink2)]">{r.returnVal}</td>
                <td className="px-3 py-3 text-center align-middle"><YN yes={r.use} label={r.use ? '사용' : '미사용'} /></td>
                <td className="px-3 py-3 text-center align-middle"><YN yes={r.memberOnly} label={r.memberOnly ? '회원 전용' : '전체'} /></td>
                <td className="whitespace-nowrap px-3 py-3 align-middle text-[var(--ink2)]">{r.editor}</td>
                <td className="whitespace-nowrap px-3 py-3 align-middle tabular-nums text-[var(--ink3)]">{r.createdAt}</td>
                <td className="whitespace-nowrap px-3 py-3 align-middle text-[var(--ink2)]">{r.modifier}</td>
                <td className="whitespace-nowrap px-3 py-3 align-middle tabular-nums text-[var(--ink3)]">{r.modifiedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4"><Pager page={page} totalPages={Math.max(1, Math.ceil(count / 10))} onChange={setPage} /></div>
    </>
  );
}
