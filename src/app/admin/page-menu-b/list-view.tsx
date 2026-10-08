'use client';

/** 전체페이지 관리 › 상세검색 — 전체 페이지 원장 목록. */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { FilterPanel, ListHeader, ListBottom, THEAD_TR_CLS, TBODY_TR_CLS, TABLE_CLS } from '@/components/ops-ui';
import { Tag, ChannelChips, BTN, BTN_PRI } from './ui';
import { StateChip, UseChip, TypeChip, CtLink, BlockMark } from './chips';
import { usePm } from './ctx';
import {
  store, CH, crumb, noUrl, blockInfo, effUse, stateKey, type Page,
} from '@/lib/page-menu/model';

const PER = 10;
export type ListFilter = { field: string; q: string; state: string; use: string; ch: string; ptype: string; blk: string; page: number };
export const F0: ListFilter = { field: 'name', q: '', state: '', use: '', ch: '', ptype: '', blk: '', page: 1 };

const SEL = 'sel h-[38px] rounded-[var(--r-field)] border border-[var(--line3)] bg-white pl-[14px] pr-8 text-[14px]';
const INP = 'inp h-[38px] rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-[14px] text-[14px]';

export function ListView({ f, setF }: { f: ListFilter; setF: (f: ListFilter) => void }) {
  const pm = usePm();
  const [draft, setDraft] = React.useState<ListFilter>(f);
  React.useEffect(() => setDraft(f), [f]);

  // 스토어가 가변이라 memo 를 걸면 승인·수정 후 목록이 멈춘다 — 렌더마다 다시 거른다.
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

  return (
    <>
      <FilterPanel
        rows={[
          [
            ['검색 항목', (
              <span key="q" className="flex items-center gap-2">
                <select value={draft.field} onChange={(e) => set({ field: e.target.value })} className={cn(SEL, 'w-[140px]')}>
                  <option value="name">메뉴명</option>
                  <option value="id">페이지 ID</option>
                  <option value="url">URL</option>
                </select>
                <input
                  value={draft.q}
                  onChange={(e) => set({ q: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') apply(); }}
                  placeholder="검색어를 입력해주세요"
                  className={cn(INP, 'w-[300px] max-w-full')}
                />
              </span>
            ), 3],
          ],
          [
            ['상태', (
              <select key="st" value={draft.state} onChange={(e) => set({ state: e.target.value })} className={cn(SEL, 'w-[150px]')}>
                <option value="">전체</option>
                <option value="url">URL 확정 대기</option>
                <option value="temp">임시저장</option>
                <option value="pending">승인 대기</option>
                <option value="live">승인 완료</option>
                <option value="rejected">반려</option>
              </select>
            )],
            ['사용 여부', (
              <select key="use" value={draft.use} onChange={(e) => set({ use: e.target.value })} className={cn(SEL, 'w-[120px]')}>
                <option value="">전체</option>
                <option value="true">Y</option>
                <option value="false">N</option>
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
        onReset={() => { setDraft(F0); setF(F0); }}
        onSearch={apply}
      />

      <ListHeader title="조회결과" count={rows.length} />

      <div className="overflow-x-auto border-t border-[var(--line2)]">
        {/* 긴 경로·URL 은 줄바꿈 대신 가로 스크롤 — 모든 행 높이를 48 로 유지한다(공식 표 규격) */}
        <table className={cn(TABLE_CLS, 'min-w-[1240px] whitespace-nowrap')}>
          <thead>
            <tr className={THEAD_TR_CLS}>
              <th className="w-14 text-center">NO</th>
              <th className="text-left">페이지 ID</th>
              <th className="text-left">메뉴명</th>
              <th className="text-center">등록 유형</th>
              <th className="text-left">컨테이너 ID</th>
              <th className="min-w-[160px] text-left">경로</th>
              <th className="text-left">URL</th>
              <th className="text-center">상태</th>
              <th className="text-center">사용 여부</th>
              <th className="text-left">운영 채널</th>
              <th className="text-left">최종 수정일자</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr><td colSpan={11} className="px-3 py-16 text-center text-[var(--ink3)]">등록 및 검색 결과가 없습니다.</td></tr>
            ) : shown.map((p: Page, i: number) => (
              <tr
                key={p.id}
                onClick={() => pm.goDetail(p.id)}
                className={cn(TBODY_TR_CLS, 'cursor-pointer', !effUse(p) && 'text-[var(--ink4)]')}
              >
                <td className="text-center tabular-nums text-[var(--ink3)]">{rows.length - ((page - 1) * PER + i)}</td>
                <td className="whitespace-nowrap font-mono tabular-nums">{p.id}</td>
                <td className="whitespace-nowrap">{p.name}<BlockMark p={p} /></td>
                <td className="text-center"><TypeChip p={p} /></td>
                <td className="whitespace-nowrap"><CtLink p={p} onGo={(ct) => pm.toast(`화면 빌더 › ${ct} 상세로 이동합니다`)} /></td>
                <td className="text-[var(--ink2)]">{crumb(p)}</td>
                <td className="whitespace-nowrap font-mono text-[13px]">
                  {noUrl(p) ? <Tag tone="neutral">URL 미등록</Tag> : p.url}
                </td>
                <td className="text-center"><StateChip p={p} /></td>
                <td className="text-center"><UseChip p={p} /></td>
                <td className="whitespace-nowrap"><ChannelChips channels={p.channels} /></td>
                <td className="whitespace-nowrap text-[var(--ink2)]">{p.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ListBottom page={page} totalPages={max} onPageChange={(n) => setF({ ...f, page: n })}>
        <button type="button" className={BTN} disabled={!rows.length} onClick={() => pm.toast('엑셀 다운로드 (목업)')}>엑셀다운로드</button>
        <button type="button" className={BTN_PRI} onClick={() => pm.go('create')}>등록</button>
      </ListBottom>
    </>
  );
}
