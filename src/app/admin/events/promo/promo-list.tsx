'use client';

/**
 * 프로모션 관리 › 목록 — 프로토타입 조회 화면 React 이식본.
 *  필터: 이벤트 유형 · 미션 유형 · 프로모션 상태는 멀티셀렉트 드롭다운(2026-10-20 프로토타입 개정),
 *  기간/전시상태/댓글 · 검색어. 이벤트·미션 유형은 서로 OR.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  FilterPanel, ListHeader, ListBottom, StatusPill, YN,
  THEAD_TR_CLS, TBODY_TR_CLS, TABLE_CLS,
} from '@/components/ops-ui';
import { CHIP_BASE } from '@/lib/display-taxonomy';
import {
  promoRows, filterPromos, fullYmd, PROMO_F0,
  EVENT_TYPES, MISSION_TYPES, STATUSES, PERIOD_TYPES, KEY_TYPES, STATUS_TONE,
  type PromoFilter, type PromoRow,
} from '@/lib/promotion/model';

const SEL = 'sel h-[38px] rounded-[var(--r-field)] border border-[var(--line3)] bg-white pl-[14px] pr-8 text-[14px]';
const INP = 'inp h-[38px] rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-[14px] text-[14px]';
const BTN = 'h-[38px] shrink-0 rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-5 text-[14px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)] disabled:pointer-events-none disabled:text-[var(--ink5)]';
const BTN_PRI = 'h-[38px] shrink-0 rounded-[var(--r-field)] bg-[var(--ac)] px-6 text-[14px] font-semibold text-white hover:bg-[var(--ac-h)]';
const PER = 10;

/** 전체 ↔ 하위 연동 멀티셀렉트 드롭다운 (프로토타입 .msel 이식, 어드민 SEL 규격) */
export function MultiSelect({ opts, value, onChange, width = 170 }: { opts: string[]; value: string[]; onChange: (v: string[]) => void; width?: number }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);
  const all = opts.every((o) => value.includes(o));
  const first = opts.find((o) => value.includes(o));
  const label = all ? '전체' : value.length === 0 ? '선택해주세요' : value.length === 1 ? (first ?? value[0]) : `${first} 외 ${value.length - 1}`;
  // 순서는 opts 기준으로 유지
  const toggle = (o: string) => onChange(opts.filter((x) => (x === o ? !value.includes(o) : value.includes(x))));
  return (
    <div ref={ref} className="relative inline-block" style={{ width }}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open}
        className={cn(SEL, 'w-full overflow-hidden text-ellipsis whitespace-nowrap text-left', open && 'border-[var(--ac)] ring-2 ring-[var(--ac2)]')}>
        {label}
      </button>
      {open && (
        <div role="listbox" aria-multiselectable className="absolute left-0 top-[calc(100%+4px)] z-40 min-w-full rounded-[8px] border border-[var(--line2)] bg-white p-1.5 shadow-[0_6px_18px_rgba(0,0,0,.12)]">
          <label className="mb-1 flex h-[34px] cursor-pointer items-center gap-2 whitespace-nowrap rounded-[6px] border-b border-[var(--line2)] px-2.5 text-[14px] font-semibold hover:bg-[var(--th)]">
            <input type="checkbox" checked={all} onChange={() => onChange(all ? [] : opts.slice())} className="h-[15px] w-[15px]" /> 전체
          </label>
          {opts.map((o) => (
            <label key={o} className="flex h-[34px] cursor-pointer items-center gap-2 whitespace-nowrap rounded-[6px] px-2.5 text-[14px] hover:bg-[var(--th)]">
              <input type="checkbox" checked={value.includes(o)} onChange={() => toggle(o)} className="h-[15px] w-[15px]" /> {o}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function PromoList({ onToast, onOpenExample, onRegister }: {
  onToast: (m: string) => void;
  onOpenExample: (row: PromoRow) => void;
  onRegister: () => void;
}) {
  const rows = promoRows();
  const [draft, setDraft] = React.useState<PromoFilter>(PROMO_F0);
  const [applied, setApplied] = React.useState<PromoFilter>(PROMO_F0);
  const [page, setPage] = React.useState(1);
  const [dateWarn, setDateWarn] = React.useState(false);
  const set = (p: Partial<PromoFilter>) => setDraft((d) => ({ ...d, ...p }));

  const result = React.useMemo(() => filterPromos(rows, applied), [rows, applied]);
  const totalPages = Math.max(1, Math.ceil(result.length / PER));
  const cur = Math.min(page, totalPages);
  const shown = result.slice((cur - 1) * PER, cur * PER);

  const search = () => {
    if (draft.from && draft.to && draft.from > draft.to) { setDateWarn(true); return; }
    setDateWarn(false);
    setApplied(draft); setPage(1);
    onToast(`${filterPromos(rows, draft).length.toLocaleString('ko-KR')}건이 조회됐어요.`);
  };
  const reset = () => {
    setDraft(PROMO_F0); setDateWarn(false);
    onToast('검색 조건을 초기화했어요. 조회를 눌러 적용하세요.');
  };

  return (
    <>
      <FilterPanel
        rows={[
          [
            ['이벤트 유형', <MultiSelect key="ev" opts={EVENT_TYPES} value={draft.ev} onChange={(v) => set({ ev: v })} />],
            ['미션 유형', <MultiSelect key="ms" opts={MISSION_TYPES} value={draft.ms} onChange={(v) => set({ ms: v })} />],
            ['프로모션 상태', <MultiSelect key="st" opts={STATUSES} value={draft.st} onChange={(v) => set({ st: v })} />],
          ],
          [
            ['기간', (
              <span key="pd" className="flex items-center gap-2">
                {/* 기간·전시상태·댓글 사용여부가 한 줄에 들어가도록 폭을 줄였다 */}
                <select value={draft.periodType} onChange={(e) => set({ periodType: e.target.value })} className={cn(SEL, '!min-w-[120px]')}>
                  {PERIOD_TYPES.map((o) => <option key={o}>{o}</option>)}
                </select>
                <input type="date" value={draft.from} onChange={(e) => set({ from: e.target.value })} className={cn(INP, '!w-[136px]')} />
                <span className="text-[var(--ink3)]">~</span>
                <input type="date" value={draft.to} onChange={(e) => set({ to: e.target.value })} className={cn(INP, '!w-[136px]')} />
              </span>
            )],
            ['전시상태', (
              <select key="ds" value={draft.disp} onChange={(e) => set({ disp: e.target.value })} className={cn(SEL, 'w-[120px]')}>
                {['전체', '전시', '미전시'].map((o) => <option key={o}>{o}</option>)}
              </select>
            )],
            ['댓글 사용여부', (
              <select key="cm" value={draft.cmt} onChange={(e) => set({ cmt: e.target.value })} className={cn(SEL, 'w-[120px]')}>
                {['전체', '사용', '미사용'].map((o) => <option key={o}>{o}</option>)}
              </select>
            )],
          ],
          [
            ['검색 항목', (
              <span key="kw" className="flex items-center gap-2">
                <select value={draft.keyType} onChange={(e) => set({ keyType: e.target.value })} className={cn(SEL, 'w-[150px]')}>
                  {KEY_TYPES.map((o) => <option key={o}>{o}</option>)}
                </select>
                <input
                  value={draft.keyword}
                  onChange={(e) => set({ keyword: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') search(); }}
                  placeholder="내용을 입력하세요."
                  className={cn(INP, 'w-[300px] max-w-full')}
                />
              </span>
            ), 3],
          ],
        ]}
        onReset={reset}
        onSearch={search}
      />
      {dateWarn && <p className="mt-2 text-[13px] text-[var(--bad)]">시작일이 종료일보다 늦어요. 기간을 다시 선택해 주세요.</p>}

      <ListHeader title="검색 결과" count={result.length.toLocaleString('ko-KR')} />

      <div className="overflow-x-auto border-t border-[var(--line2)]">
        <table className={cn(TABLE_CLS, 'min-w-[1600px] whitespace-nowrap')}>
          <thead>
            <tr className={THEAD_TR_CLS}>
              {['번호', '프로모션 ID', '전시기간', '참여기간', '프로모션 유형', '프로모션 명', '전시상태',
                '댓글 사용여부', '댓글 수', '등록자', '등록일시', '최종수정자', '최종수정일시', '프로모션 상태']
                .map((h) => <th key={h} className={h === '프로모션 명' ? 'text-left' : 'text-center'}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={14} className="px-3 py-16 text-center leading-[22px] text-[var(--ink3)]">
                  조회 조건에 맞는 프로모션이 없어요.<br />
                  이벤트 유형·미션 유형·프로모션 상태 중 선택한 항목이 있는지 확인해 주세요.
                </td>
              </tr>
            ) : shown.map((r) => (
              <tr
                key={r.id}
                title={r.ex ? '클릭하면 설정 예시가 열려요' : undefined}
                onClick={() => r.ex && onOpenExample(r)}
                className={cn(TBODY_TR_CLS, 'text-center', r.ex && 'cursor-pointer')}
              >
                <td className="tabular-nums text-[var(--ink3)]">{r.no}</td>
                <td className="font-mono tabular-nums">{r.id}</td>
                <td className="tabular-nums text-[var(--ink2)]">{fullYmd(r.disp)}</td>
                <td className="tabular-nums text-[var(--ink2)]">{fullYmd(r.join)}</td>
                <td>{r.cat} &gt; {r.sub}</td>
                <td className="max-w-[320px] truncate text-left" title={r.name}>
                  {r.ex && <span className={cn(CHIP_BASE, 'mr-1.5 bg-[var(--ac2)] text-[var(--ac)]')}>예시</span>}
                  {r.name.replace('[예시] ', '')}
                </td>
                <td><YN yes={r.dispSt === '전시'} label={r.dispSt} /></td>
                {/* 댓글 사용여부 — 사용=blue, 미사용=red (2026-10-20 프로토타입 개정) */}
                <td><StatusPill label={r.cmt} tone={r.cmt === '사용' ? 'info' : 'negative'} /></td>
                <td className="tabular-nums">{r.cmtCnt}</td>
                <td className="text-[var(--ink2)]">{r.reg}</td>
                <td className="tabular-nums text-[var(--ink2)]">{r.regAt}</td>
                <td className="text-[var(--ink2)]">{r.mod}</td>
                <td className="tabular-nums text-[var(--ink2)]">{r.modAt}</td>
                <td><StatusPill label={r.st} tone={STATUS_TONE[r.st]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ListBottom page={cur} totalPages={totalPages} onPageChange={setPage}>
        <button type="button" className={BTN} disabled={!result.length}
          onClick={() => onToast(`조회된 ${result.length.toLocaleString('ko-KR')}건을 엑셀로 내려받아요. (프로토타입에서는 파일이 생성되지 않아요)`)}>
          엑셀 다운로드
        </button>
        <button type="button" className={BTN_PRI} onClick={onRegister}>등록</button>
      </ListBottom>
    </>
  );
}
