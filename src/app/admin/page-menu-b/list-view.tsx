'use client';

/** 전체페이지 관리 › 상세검색 (SB BO-AIM-DSP-PG548) — 전체 페이지 원장 목록. */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { FilterPanel, ListHeader, Pager, THEAD_TR_CLS, TBODY_TR_CLS, TABLE_CLS } from '@/components/ops-ui';
import { Tag, ChannelChips, BTN, BTN_PRI } from './ui';
import { StateChip, UseChip, TypeChip, CtLink, BlockMark } from './chips';
import { usePm } from './ctx';
import {
  store, CH, crumb, noUrl, blockInfo, effUse, stateKey, requestApproval, type Page,
} from '@/lib/page-menu/model';

const PER = 10;
export type ListFilter = { field: string; q: string; state: string; use: string; ch: string; ptype: string; blk: string; page: number };
export const F0: ListFilter = { field: 'name', q: '', state: '', use: '', ch: '', ptype: '', blk: '', page: 1 };

const SEL = 'sel h-[38px] rounded-[var(--r-field)] border border-[var(--line3)] bg-white pl-[14px] pr-8 text-[14px]';
const INP = 'inp h-[38px] rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-[14px] text-[14px]';

const PH: Record<string, string> = { name: '페이지명을 입력하세요', id: '페이지 ID를 입력하세요', url: '메뉴 URL을 입력하세요' };

// 선택 가능 = 승인상태 '저장(임시저장)' + URL 확정 여부 'Y' (SB 6/10)
const canSelect = (p: Page) => stateKey(p) === 'temp' && p.fixed;

export function ListView({ f, setF }: { f: ListFilter; setF: (f: ListFilter) => void }) {
  const pm = usePm();
  const [draft, setDraft] = React.useState<ListFilter>(f);
  const [sel, setSel] = React.useState<Set<string>>(new Set());
  React.useEffect(() => setDraft(f), [f]);

  const rows = store.pages.filter((p) => {
    if (f.use && String(p.use) !== f.use) return false;
    if (f.state && stateKey(p) !== f.state) return false;
    if (f.ch && p.channels.indexOf(f.ch) === -1) return false;
    if (f.ptype && p.ptype !== f.ptype) return false;
    if (f.blk === 'y' && !blockInfo(p)) return false;
    if (f.blk === 'n' && blockInfo(p)) return false;
    if (f.q) {
      const hay = f.field === 'id' ? p.id : f.field === 'url' ? p.url : `${p.name} ${crumb(p)}`;
      if (hay.indexOf(f.q) === -1) return false;
    }
    return true;
  }).sort((a, b) => (a.updated < b.updated ? 1 : -1));

  const max = Math.max(1, Math.ceil(rows.length / PER));
  const page = Math.min(f.page, max);
  const shown = rows.slice((page - 1) * PER, page * PER);

  const apply = () => setF({ ...draft, page: 1 });
  const set = (p: Partial<ListFilter>) => setDraft((d) => ({ ...d, ...p }));

  const selectable = shown.filter(canSelect);
  const allSel = selectable.length > 0 && selectable.every((p) => sel.has(p.id));
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setSel((s) => { const n = new Set(s); if (allSel) selectable.forEach((p) => n.delete(p.id)); else selectable.forEach((p) => n.add(p.id)); return n; });
  const reqSelected = () => {
    const ids = [...sel]; let ok = 0;
    ids.forEach((id) => { const p = store.pages.find((x) => x.id === id); if (p && requestApproval(p).ok) ok++; });
    setSel(new Set()); pm.bump();
    pm.toast(`선택한 ${ids.length}건 중 ${ok}건 승인 요청`);
  };

  return (
    <>
      <FilterPanel
        rows={[
          [
            ['검색 항목', (
              <span key="q" className="flex items-center gap-2">
                <select value={draft.field} onChange={(e) => set({ field: e.target.value })} className={cn(SEL, 'w-[130px]')}>
                  <option value="name">페이지명</option>
                  <option value="id">페이지 ID</option>
                  <option value="url">메뉴 URL</option>
                </select>
                <input value={draft.q} onChange={(e) => set({ q: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') apply(); }} placeholder={PH[draft.field]} className={cn(INP, 'w-[220px]')} />
              </span>
            )],
            ['사용 여부', (
              <span key="use" className="flex items-center gap-4 text-[14px]">
                {([['', '전체'], ['true', 'Y'], ['false', 'N']] as const).map(([v, l]) => (
                  <label key={l} className="flex items-center gap-1.5"><input type="radio" name="use" checked={draft.use === v} onChange={() => set({ use: v })} className="accent-indigo-600" />{l}</label>
                ))}
              </span>
            )],
            ['승인 상태', (
              <select key="st" value={draft.state} onChange={(e) => set({ state: e.target.value })} className={cn(SEL, 'w-[150px]')}>
                <option value="">전체</option>
                <option value="temp">임시저장</option>
                <option value="url">저장</option>
                <option value="pending">승인대기</option>
                <option value="live">승인완료</option>
                <option value="rejected">승인반려</option>
              </select>
            )],
            ['운영 채널', (
              <select key="ch" value={draft.ch} onChange={(e) => set({ ch: e.target.value })} className={cn(SEL, 'w-[140px]')}>
                <option value="">전체</option>
                {CH.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            )],
            ['등록 유형', (
              <select key="pt" value={draft.ptype} onChange={(e) => set({ ptype: e.target.value })} className={cn(SEL, 'w-[150px]')}>
                <option value="">전체</option>
                <option value="dev">개발 화면</option>
                <option value="builder">전시 컨테이너</option>
              </select>
            )],
          ],
        ]}
        onReset={() => { setDraft(F0); setF(F0); setSel(new Set()); }}
        onSearch={apply}
      />

      <ListHeader title="조회 결과" count={rows.length} />

      <div className="overflow-x-auto border-t border-[var(--line2)]">
        <table className={cn(TABLE_CLS, 'min-w-[1480px] whitespace-nowrap')}>
          <thead>
            <tr className={THEAD_TR_CLS}>
              <th className="w-10 text-center"><input type="checkbox" checked={allSel} onChange={toggleAll} disabled={selectable.length === 0} className="accent-indigo-600" /></th>
              <th className="w-14 text-center">No.</th>
              <th className="text-left">페이지 ID</th>
              <th className="text-left">페이지명</th>
              <th className="min-w-[160px] text-left">페이지 경로</th>
              <th className="text-left">URL</th>
              <th className="text-center">URL 확정 여부</th>
              <th className="text-center">사용 여부</th>
              <th className="text-center">승인 상태</th>
              <th className="text-left">운영 채널</th>
              <th className="text-center">등록 유형</th>
              <th className="text-left">컨테이너 ID</th>
              <th className="text-left">등록 일시</th>
              <th className="text-left">최종 수정일시</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr><td colSpan={14} className="px-3 py-16 text-center text-[var(--ink3)]">등록 및 조회 결과가 없습니다.</td></tr>
            ) : shown.map((p: Page, i: number) => (
              <tr key={p.id} onClick={() => pm.goDetail(p.id)} className={cn(TBODY_TR_CLS, 'cursor-pointer', !effUse(p) && 'text-[var(--ink4)]')}>
                <td className="text-center" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} disabled={!canSelect(p)} className="accent-indigo-600 disabled:opacity-30" />
                </td>
                <td className="text-center tabular-nums text-[var(--ink3)]">{rows.length - ((page - 1) * PER + i)}</td>
                <td className="whitespace-nowrap font-mono tabular-nums">{p.id}</td>
                <td className="whitespace-nowrap">{p.name}<BlockMark p={p} /></td>
                <td className="text-[var(--ink2)]">{crumb(p)}</td>
                <td className="whitespace-nowrap font-mono text-[13px]">{noUrl(p) ? <Tag tone="neutral">URL 미등록</Tag> : p.url}</td>
                <td className="text-center text-[var(--ink2)]">{noUrl(p) ? '-' : p.fixed ? 'Y' : 'N'}</td>
                <td className="text-center"><UseChip p={p} /></td>
                <td className="text-center"><StateChip p={p} /></td>
                <td className="whitespace-nowrap"><ChannelChips channels={p.channels} /></td>
                <td className="text-center"><TypeChip p={p} /></td>
                <td className="whitespace-nowrap"><CtLink p={p} onGo={(ct) => pm.toast(`화면 빌더 › ${ct} 상세로 이동합니다`)} /></td>
                <td className="whitespace-nowrap text-[var(--ink2)]">{p.created}</td>
                <td className="whitespace-nowrap text-[var(--ink2)]">{p.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 하단 — 페이저(가운데) · 좌: 선택 승인 요청·엑셀다운로드 / 우: 등록 (SB 8/9/10) */}
      <div className="mt-8">
        <Pager page={page} totalPages={max} onChange={(n) => setF({ ...f, page: n })} />
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button type="button" className={BTN} disabled={sel.size === 0} onClick={reqSelected}>선택 승인 요청({sel.size})</button>
          <button type="button" className={BTN} disabled={!rows.length} onClick={() => pm.toast('엑셀 다운로드 (목업)')}>엑셀다운로드</button>
          <button type="button" className={cn(BTN_PRI, 'ml-auto')} onClick={() => pm.go('create')}>등록</button>
        </div>
      </div>
    </>
  );
}
