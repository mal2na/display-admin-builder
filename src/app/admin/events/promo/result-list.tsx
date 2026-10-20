'use client';

/**
 * 프로모션 관리 › 결과 관리 › 목록 — 프로토타입 결과 관리 조회 화면 React 이식(2026-10-20).
 *  필터: 프로모션 유형·상태(멀티셀렉트) · 결과 처리 상태 · 기간 · 검색. 행 클릭 → 결과 상세.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  FilterPanel, ListHeader, ListBottom, StatusPill,
  THEAD_TR_CLS, TBODY_TR_CLS, TABLE_CLS,
} from '@/components/ops-ui';
import { MultiSelect } from './promo-list';
import { STATUS_TONE } from '@/lib/promotion/model';
import {
  resultRows, filterResults, RESULT_F0,
  RS_TYPES, RS_ST, RS_PROC, RS_PERIODS, RS_KEY_TYPES, PROC_TONE, APV_TONE,
  type ResultFilter, type ResultRow,
} from '@/lib/promotion/result';

const SEL = 'sel h-[38px] rounded-[var(--r-field)] border border-[var(--line3)] bg-white pl-[14px] pr-8 text-[14px]';
const INP = 'inp h-[38px] rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-[14px] text-[14px]';
const PER = 10;
const nf = (n: number) => n.toLocaleString('ko-KR');

export function ResultList({ onToast, onOpen }: { onToast: (m: string) => void; onOpen: (row: ResultRow) => void }) {
  const rows = React.useMemo(() => resultRows(), []);
  const [draft, setDraft] = React.useState<ResultFilter>(RESULT_F0);
  const [applied, setApplied] = React.useState<ResultFilter>(RESULT_F0);
  const [page, setPage] = React.useState(1);
  const [dateWarn, setDateWarn] = React.useState(false);
  const set = (p: Partial<ResultFilter>) => setDraft((d) => ({ ...d, ...p }));

  const result = React.useMemo(() => filterResults(rows, applied), [rows, applied]);
  const totalPages = Math.max(1, Math.ceil(result.length / PER));
  const cur = Math.min(page, totalPages);
  const shown = result.slice((cur - 1) * PER, cur * PER);

  const search = () => {
    if (draft.from && draft.to && draft.from > draft.to) { setDateWarn(true); return; }
    setDateWarn(false); setApplied(draft); setPage(1);
    onToast(`${nf(filterResults(rows, draft).length)}건이 조회됐어요.`);
  };
  const reset = () => { setDraft(RESULT_F0); setDateWarn(false); onToast('검색 조건을 초기화했어요. 조회를 눌러 적용하세요.'); };

  return (
    <>
      <FilterPanel
        rows={[
          [
            ['프로모션 유형', <MultiSelect key="ty" opts={RS_TYPES} value={draft.ty} onChange={(v) => set({ ty: v })} width={190} />],
            ['프로모션 상태', <MultiSelect key="st" opts={RS_ST} value={draft.st} onChange={(v) => set({ st: v })} width={190} />],
            ['결과 처리 상태', (
              <select key="pc" value={draft.proc} onChange={(e) => set({ proc: e.target.value })} className={cn(SEL, 'w-[150px]')}>
                {RS_PROC.map((o) => <option key={o}>{o}</option>)}
              </select>
            )],
          ],
          [
            ['기간', (
              <span key="pd" className="flex items-center gap-2">
                <select value={draft.period} onChange={(e) => set({ period: e.target.value })} className={cn(SEL, '!min-w-[130px]')}>
                  {RS_PERIODS.map((o) => <option key={o}>{o}</option>)}
                </select>
                <input type="date" value={draft.from} onChange={(e) => set({ from: e.target.value })} className={cn(INP, '!w-[150px]')} />
                <span className="text-[var(--ink3)]">~</span>
                <input type="date" value={draft.to} onChange={(e) => set({ to: e.target.value })} className={cn(INP, '!w-[150px]')} />
              </span>
            ), 3],
          ],
          [
            ['검색 항목', (
              <span key="kw" className="flex items-center gap-2">
                <select value={draft.keyType} onChange={(e) => set({ keyType: e.target.value })} className={cn(SEL, 'w-[150px]')}>
                  {RS_KEY_TYPES.map((o) => <option key={o}>{o}</option>)}
                </select>
                <input value={draft.keyword} onChange={(e) => set({ keyword: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') search(); }}
                  placeholder="내용을 입력하세요." className={cn(INP, 'w-[300px] max-w-full')} />
              </span>
            ), 3],
          ],
        ]}
        onReset={reset}
        onSearch={search}
      />
      {dateWarn && <p className="mt-2 text-[13px] text-[var(--bad)]">시작일이 종료일보다 늦어요. 기간을 다시 선택해 주세요.</p>}

      <ListHeader title="검색 결과" count={nf(result.length)} />

      <div className="overflow-x-auto border-t border-[var(--line2)]">
        <table className={cn(TABLE_CLS, 'min-w-[1480px] whitespace-nowrap')}>
          <thead>
            <tr className={THEAD_TR_CLS}>
              {['번호', '프로모션 ID', '프로모션 유형', '프로모션 명', '프로모션 상태', '참여 기간', '승인 상태', '결과 처리 상태',
                '참여자 수', '당첨자 수', '지급 현황', '결과 발표', '최종 처리자', '최종 처리일시']
                .map((h) => <th key={h} className={h === '프로모션 명' ? 'text-left' : 'text-center'}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={14} className="px-3 py-16 text-center leading-[22px] text-[var(--ink3)]">
                  조회 조건에 맞는 프로모션이 없어요.<br />
                  프로모션 유형·프로모션 상태 중 선택한 항목이 있는지 확인해 주세요.
                </td>
              </tr>
            ) : shown.map((x) => (
              <tr key={x.id} onClick={() => onOpen(x)} className={cn(TBODY_TR_CLS, 'cursor-pointer text-center')}>
                <td className="tabular-nums text-[var(--ink3)]">{x.no}</td>
                <td className="font-mono tabular-nums text-[var(--ac)]">{x.id}</td>
                <td>이벤트 &gt; {x.type}</td>
                <td className="max-w-[300px] truncate text-left text-[var(--ac)]" title={x.name}>{x.name}</td>
                <td><StatusPill label={x.st} tone={STATUS_TONE[x.st]} /></td>
                <td className="tabular-nums text-[var(--ink2)]">{x.join}</td>
                <td>{x.apv === '-' ? '-' : <StatusPill label={x.apv} tone={APV_TONE[x.apv]} />}</td>
                <td>{x.proc === '-' ? '-' : <StatusPill label={x.proc} tone={PROC_TONE[x.proc]} />}</td>
                <td className="tabular-nums">{nf(x.part)}</td>
                <td className="tabular-nums">{nf(x.win)} / {x.cap == null ? '전체' : nf(x.cap)}</td>
                <td className="tabular-nums">{nf(x.paid)} / {nf(x.win)}</td>
                <td className="tabular-nums text-[var(--ink2)]">{x.announce}</td>
                <td className="text-[var(--ink2)]">{x.worker}</td>
                <td className="tabular-nums text-[var(--ink2)]">{x.workAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ListBottom page={cur} totalPages={totalPages} onPageChange={setPage} />
    </>
  );
}
