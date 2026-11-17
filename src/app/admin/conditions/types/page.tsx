'use client';

/** 조건 관리 › 조건 유형 관리 — 조건 항목을 AND/OR로 묶은 판정 유형 목록. 배포 프로토타입 1:1(2026-11-13). */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { FilterPanel, ListHeader, ListBottom, YN, THEAD_TR_CLS, TBODY_TR_CLS, TABLE_CLS } from '@/components/ops-ui';
import { condTypes, filterTypes, USE_OPTS, TYPE_F0, type TypeFilter } from '@/lib/conditions/model';

const SEL = 'sel h-[38px] rounded-[var(--r-field)] border border-[var(--line3)] bg-white pl-[14px] pr-8 text-[14px]';
const INP = 'inp h-[38px] rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-[14px] text-[14px]';
const BTN_PRI = 'h-[38px] shrink-0 rounded-[var(--r-field)] bg-[var(--ac)] px-6 text-[14px] font-semibold text-white hover:bg-[var(--ac-h)]';
const PER = 10;

export default function ConditionTypesPage() {
  const rows = condTypes();
  const [draft, setDraft] = React.useState<TypeFilter>(TYPE_F0);
  const [applied, setApplied] = React.useState<TypeFilter>(TYPE_F0);
  const [page, setPage] = React.useState(1);
  const [toast, setToast] = React.useState<string | null>(null);
  const set = (p: Partial<TypeFilter>) => setDraft((d) => ({ ...d, ...p }));
  const say = (m: string) => { setToast(m); window.clearTimeout((say as unknown as { t?: number }).t); (say as unknown as { t?: number }).t = window.setTimeout(() => setToast(null), 2400); };

  const result = React.useMemo(() => filterTypes(rows, applied), [rows, applied]);
  const totalPages = Math.max(1, Math.ceil(result.length / PER));
  const cur = Math.min(page, totalPages);
  const shown = result.slice((cur - 1) * PER, cur * PER);

  const search = () => { setApplied(draft); setPage(1); say(`${filterTypes(rows, draft).length}건이 조회됐어요.`); };
  const reset = () => { setDraft(TYPE_F0); say('검색 조건을 초기화했어요. 조회를 눌러 적용하세요.'); };

  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader trail={['프로모션 관리', '조건 관리', '조건 유형 관리']} title="조건 유형 관리" divider={false} />
      <div className="mt-6">
        <FilterPanel
          rows={[[
            ['조건 유형명', <input key="nm" value={draft.name} onChange={(e) => set({ name: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') search(); }} placeholder="조건 유형명을 입력하세요." className={cn(INP, 'w-[300px] max-w-full')} />],
            ['사용 여부', <select key="use" value={draft.use} onChange={(e) => set({ use: e.target.value })} className={cn(SEL, 'w-[120px]')}>{USE_OPTS.map((o) => <option key={o}>{o}</option>)}</select>],
          ]]}
          onReset={reset}
          onSearch={search}
        />
        <ListHeader title="검색 결과" count={result.length} />
        <div className="overflow-x-auto border-t border-[var(--line2)]">
          <table className={cn(TABLE_CLS, 'min-w-[1100px] whitespace-nowrap')}>
            <thead>
              <tr className={THEAD_TR_CLS}>
                {['조건 유형 ID', '조건 유형명', '조건 수', '조건 요약', '처리 가능일', '사용 여부', '등록자', '등록일시']
                  .map((h) => <th key={h} className={h === '조건 유형명' || h === '조건 요약' ? 'text-left' : 'text-center'}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-16 text-center text-[var(--ink3)]">조회 조건에 맞는 조건 유형이 없어요.</td></tr>
              ) : shown.map((r) => (
                <tr key={r.id} className={cn(TBODY_TR_CLS, 'text-center')}>
                  <td className="font-mono tabular-nums">{r.id}</td>
                  <td className="text-left font-medium text-[var(--ink)]">{r.name}</td>
                  <td className="tabular-nums text-[var(--ink2)]">{r.count}</td>
                  <td className="max-w-[460px] whitespace-normal text-left text-[13px] leading-[19px] text-[var(--ink2)]">{r.summary}</td>
                  <td className="tabular-nums text-[var(--ink2)]">{r.period}</td>
                  <td><YN yes={r.use} label={r.use ? 'Y' : 'N'} /></td>
                  <td className="text-[var(--ink2)]">{r.reg}</td>
                  <td className="tabular-nums text-[var(--ink2)]">{r.regAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ListBottom page={cur} totalPages={totalPages} onPageChange={setPage}>
          <button type="button" className={BTN_PRI} onClick={() => say('조건 유형 등록 화면은 준비 중입니다.')}>등록</button>
        </ListBottom>
      </div>
      {toast && (
        <div className="pointer-events-none fixed bottom-10 left-1/2 z-[90] -translate-x-1/2">
          <div className="rounded-[10px] bg-[var(--toast-bg)] px-5 py-4 text-[14px] text-[#fcfcfd] shadow-[var(--dlg-shadow)]">{toast}</div>
        </div>
      )}
    </div>
  );
}
