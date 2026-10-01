'use client';

// SB PG460(메뉴 정보 관리) + PG462(변경·승인 이력) — 메뉴 관리.
//  디자인 시스템: accent #3a2ee6 · 헤더/필터 #f6f7fb · 보더 #e3e6ef · 13px 레귤러.
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, ImageIcon, X } from 'lucide-react';

export type MenuNode = {
  id: string; pageCode: string; menuCode: string | null; menuName: string; path: string;
  depth: number; sortOrder: number; parentId: string | null; category: string | null;
  frontExposeYn: boolean; channels: string[]; iconUrl: string | null; landingType: string | null; landingUrl: string | null;
};
export type MenuHistoryRow = {
  id: string; seq: number; statusLabel: string; requester: string; manager: string;
  requestedAt: string | null; requestReason: string; processedAt: string | null; processReason: string; changeNote: string | null; version: string;
};
type HeadInfo = { reflectedAt: string | null; updatedBy: string; updatedAt: string | null; approvalLabel: string };

const HIST_TONE: Record<string, string> = {
  승인요청: 'bg-[#eceef3] text-[#5d6275]', 승인완료: 'bg-[#e3f6ea] text-[#1f8a4c]', 반려: 'bg-[#ffe9e9] text-[#d93b3b]', 요청취소: 'bg-[#fff0de] text-[#c46a0b]',
};
function fmtDT(iso: string | null) {
  if (!iso) return '-';
  const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function MenuManager({ nodes, headInfo, history }: { nodes: MenuNode[]; headInfo: HeadInfo; history: MenuHistoryRow[] }) {
  const [tab, setTab] = useState<'menu' | 'history'>('menu');
  return (
    <div className="px-8 py-6">
      <nav className="mb-1 text-[12px] text-slate-400">홈 › 전시관리 › 메뉴 관리</nav>
      <h1 className="mb-4 text-[22px] font-bold text-slate-900">메뉴 관리</h1>
      <div className="mb-5 flex gap-1 border-b border-[#e3e6ef]">
        {([['menu', '메뉴 정보 관리'], ['history', '변경/승인 이력']] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            className={cn('-mb-px border-b-2 px-4 py-2.5 text-[14px] font-semibold', tab === k ? 'border-[#3a2ee6] text-[#3a2ee6]' : 'border-transparent text-slate-500 hover:text-slate-700')}>{label}</button>
        ))}
      </div>
      {tab === 'menu' ? <MenuInfoTab nodes={nodes} headInfo={headInfo} /> : <HistoryTab history={history} />}
    </div>
  );
}

// ── 메뉴 정보 관리 탭 (PG460) — 3분할 ─────────────────────────
function MenuInfoTab({ nodes, headInfo }: { nodes: MenuNode[]; headInfo: HeadInfo }) {
  const CHANNELS = ['전체', 'App', '모바일웹', 'PC'];
  const [channel, setChannel] = useState('전체');
  const [frontOnly, setFrontOnly] = useState(false);
  const [redisOpen, setRedisOpen] = useState(false);

  const roots = useMemo(() => nodes.filter((n) => n.depth === 1).sort((a, b) => b.sortOrder - a.sortOrder), [nodes]);
  const [sel1, setSel1] = useState<string | null>(roots[0]?.id ?? null);
  const kids = (pid: string) => nodes.filter((n) => n.parentId === pid).sort((a, b) => b.sortOrder - a.sortOrder);
  const depth2 = useMemo(() => (sel1 ? kids(sel1) : []), [sel1, nodes]);
  const [selNode, setSelNode] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const detail = nodes.find((n) => n.id === selNode) ?? nodes.find((n) => n.id === sel1) ?? null;

  const visible = (n: MenuNode) => (!frontOnly || n.frontExposeYn) && (channel === '전체' || true);
  const toggle = (id: string) => setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const expandAll = () => setExpanded(new Set(depth2.filter((n) => kids(n.id).length).map((n) => n.id)));
  const collapseAll = () => setExpanded(new Set());

  const pick1 = (id: string) => { setSel1(id); setSelNode(id); setExpanded(new Set()); };

  return (
    <>
      {/* 검색영역 */}
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-[#e3e6ef] bg-[#f6f7fb] p-4">
        <div className="flex items-center gap-2"><span className="text-[12.5px] font-medium text-slate-600">운영채널</span>
          <select value={channel} onChange={(e) => setChannel(e.target.value)} className="h-[34px] w-32 rounded-lg border border-[#cfd3e0] bg-white px-2.5 text-[12.5px] text-slate-700">{CHANNELS.map((c) => <option key={c}>{c}</option>)}</select>
        </div>
        <label className="flex items-center gap-1.5 text-[12.5px] text-slate-600"><input type="checkbox" checked={frontOnly} onChange={(e) => setFrontOnly(e.target.checked)} className="h-4 w-4 rounded accent-[#3a2ee6]" />Front 노출메뉴만 보기</label>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" className="h-[34px] rounded-lg bg-[#3a2ee6] px-5 text-[12.5px] font-medium text-white hover:brightness-110">조회</button>
          <button type="button" onClick={() => { setChannel('전체'); setFrontOnly(false); }} className="h-[34px] rounded-lg border border-[#cfd3e0] bg-white px-4 text-[12.5px] font-medium text-slate-600 hover:bg-[#f6f7fb]">초기화</button>
        </div>
      </div>

      <div className="mb-2 flex justify-center gap-2">
        <button type="button" onClick={expandAll} className="h-8 rounded-lg border border-[#cfd3e0] bg-white px-3 text-[12px] font-medium text-slate-600 hover:bg-[#f6f7fb]">전체 펼치기</button>
        <button type="button" onClick={collapseAll} className="h-8 rounded-lg border border-[#cfd3e0] bg-white px-3 text-[12px] font-medium text-slate-600 hover:bg-[#f6f7fb]">전체 접기</button>
      </div>

      {/* 3분할 */}
      <div className="grid grid-cols-[minmax(220px,1fr)_minmax(240px,1fr)_minmax(320px,1.3fr)] gap-0 overflow-hidden rounded-xl border border-[#e3e6ef]">
        {/* 1 Depth */}
        <div className="border-r border-[#e3e6ef]">
          <div className="border-b border-[#e3e6ef] bg-[#f6f7fb] px-4 py-2.5 text-center text-[13px] text-[#6b7086]">1 Depth</div>
          <ul>
            {roots.map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => pick1(n.id)}
                  className={cn('flex w-full items-center gap-1.5 border-b border-[#e3e6ef] px-4 py-3 text-left text-[13px]', sel1 === n.id ? 'bg-[#fff7e6] font-semibold text-slate-900' : 'hover:bg-[#f6f7fb]', !n.frontExposeYn && 'text-slate-400')}>
                  {n.menuName}
                  {!n.frontExposeYn && <span className="rounded bg-[#ffe9e9] px-1.5 py-0.5 text-[10px] font-medium text-[#d93b3b]">미노출</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
        {/* 2/3 Depth */}
        <div className="border-r border-[#e3e6ef]">
          <div className="border-b border-[#e3e6ef] bg-[#f6f7fb] px-4 py-2.5 text-center text-[13px] text-[#6b7086]">2 Depth</div>
          <ul>
            {depth2.filter(visible).map((n) => {
              const sub = kids(n.id);
              const open = expanded.has(n.id);
              return (
                <li key={n.id}>
                  <div className={cn('flex items-center justify-between border-b border-[#e3e6ef] px-4 py-3 text-[13px]', selNode === n.id ? 'bg-[#fff7e6]' : 'hover:bg-[#f6f7fb]', !n.frontExposeYn && 'text-slate-400')}>
                    <button type="button" onClick={() => setSelNode(n.id)} className="flex items-center gap-1.5 text-left">
                      {n.menuName}
                      {!n.frontExposeYn && <span className="rounded bg-[#ffe9e9] px-1.5 py-0.5 text-[10px] font-medium text-[#d93b3b]">미노출</span>}
                    </button>
                    {sub.length > 0 && <button type="button" onClick={() => toggle(n.id)} className="text-slate-400 hover:text-slate-600">{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>}
                  </div>
                  {open && sub.filter(visible).map((c) => (
                    <button key={c.id} type="button" onClick={() => setSelNode(c.id)}
                      className={cn('flex w-full items-center gap-1.5 border-b border-[#e3e6ef] py-2.5 pl-9 pr-4 text-left text-[13px]', selNode === c.id ? 'bg-[#fff7e6] font-medium text-slate-900' : 'bg-white hover:bg-[#f6f7fb]', !c.frontExposeYn && 'text-slate-400')}>
                      {c.menuName}
                      {!c.frontExposeYn && <span className="rounded bg-[#ffe9e9] px-1.5 py-0.5 text-[10px] font-medium text-[#d93b3b]">미노출</span>}
                    </button>
                  ))}
                </li>
              );
            })}
            {depth2.length === 0 && <li className="px-4 py-10 text-center text-[12px] text-slate-400">하위 메뉴가 없습니다.</li>}
          </ul>
        </div>
        {/* 상세 */}
        <div>
          <div className="border-b border-[#e3e6ef] px-4 py-3 text-[15px] font-bold text-slate-900">{detail?.menuName ?? '-'}</div>
          {detail && (
            <div className="grid grid-cols-[120px_1fr]">
              <Cell label>페이지 ID</Cell><Cell><span className="text-[#3a2ee6] underline">{detail.pageCode}</span></Cell>
              <Cell label>메뉴명</Cell><Cell>{detail.menuName}</Cell>
              <Cell label>경로</Cell><Cell>{detail.path}</Cell>
              <Cell label>Front 노출여부</Cell><Cell>{detail.frontExposeYn ? '노출' : '미노출'}</Cell>
              <Cell label>운영채널</Cell><Cell><div className="flex flex-wrap gap-1">{detail.channels.length ? detail.channels.map((c) => <span key={c} className="inline-flex items-center rounded border border-[#e3e6ef] bg-white px-1.5 py-0.5 text-[11px] text-slate-600">{c}</span>) : '-'}</div></Cell>
              {detail.depth === 1 && (<>
                <Cell label>메뉴 아이콘</Cell>
                <Cell><div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#e3e6ef] bg-[#f6f7fb]">{detail.iconUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={detail.iconUrl} alt="" className="h-full w-full rounded object-contain" /> : <ImageIcon className="h-5 w-5 text-slate-300" />}</div></Cell>
              </>)}
            </div>
          )}
        </div>
      </div>

      {/* 이력 바 + Redis/수정 */}
      <div className="mt-4 flex flex-wrap items-center justify-end gap-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px] text-slate-500">
          <span>최종 반영일 <b className="text-slate-700">{fmtDT(headInfo.reflectedAt)}</b></span>
          <span>최종 수정자 <b className="text-slate-700">{headInfo.updatedBy}</b></span>
          <span>최종 수정일시 <b className="text-slate-700">{fmtDT(headInfo.updatedAt)}</b></span>
          <span>승인상태 <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[12px]', HIST_TONE[headInfo.approvalLabel] ?? 'bg-[#eceef3] text-[#5d6275]')}>{headInfo.approvalLabel}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setRedisOpen(true)} className="inline-flex h-9 items-center rounded-lg border border-[#cfd3e0] bg-white px-4 text-[13px] font-medium text-slate-600 hover:bg-[#f6f7fb]">Redis Reload</button>
          <button type="button" className="inline-flex h-9 items-center rounded-lg bg-[#3a2ee6] px-5 text-[13px] font-semibold text-white hover:brightness-110">수정</button>
        </div>
      </div>

      {redisOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setRedisOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[15px] font-bold text-slate-900">현재 변경된 최신 데이터를 Redis 캐시에 업데이트하시겠습니까?</h3>
            <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500">승인 완료된 변경 사항을 캐시(Redis) 갱신으로 프론트 화면에 즉시 반영합니다. 미승인 변경은 반영 대상에서 제외됩니다.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setRedisOpen(false)} className="h-9 rounded-lg border border-[#cfd3e0] bg-white px-4 text-[13px] font-medium text-slate-600">취소</button>
              <button onClick={() => setRedisOpen(false)} className="h-9 rounded-lg bg-[#3a2ee6] px-5 text-[13px] font-semibold text-white">확인</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Cell({ label, children }: { label?: boolean; children: React.ReactNode }) {
  return <div className={cn('border-b border-[#e3e6ef] px-4 py-3 text-[13px]', label ? 'flex items-center bg-[#f6f7fb] font-medium text-slate-600' : 'text-slate-800')}>{children}</div>;
}

// ── 변경/승인 이력 탭 (PG462) ─────────────────────────────────
function HistoryTab({ history }: { history: MenuHistoryRow[] }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState<MenuHistoryRow | null>(null);

  const filtered = history.filter((h) => {
    if (q.trim() && !h.requester.toLowerCase().includes(q.trim().toLowerCase())) return false;
    const d = h.requestedAt?.slice(0, 10) ?? '';
    if (from && d && d < from) return false;
    if (to && d && d > to) return false;
    return true;
  });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-[#e3e6ef] bg-[#f6f7fb] p-4">
        <div className="flex items-center gap-2"><span className="text-[12.5px] font-medium text-slate-600">변경일자</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-[34px] w-[150px] rounded-lg border border-[#cfd3e0] bg-white px-3 text-[12.5px]" />
          <span className="text-slate-400">~</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-[34px] w-[150px] rounded-lg border border-[#cfd3e0] bg-white px-3 text-[12.5px]" />
        </div>
        <div className="flex flex-1 items-center gap-2"><span className="text-[12.5px] font-medium text-slate-600">검색어</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="요청자 명, P사번을 검색하세요." className="h-[34px] min-w-[220px] flex-1 rounded-lg border border-[#cfd3e0] bg-white px-3 text-[12.5px] placeholder:text-slate-400" />
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => { setFrom(''); setTo(''); setQ(''); }} className="h-[34px] rounded-lg border border-[#cfd3e0] bg-white px-4 text-[12.5px] font-medium text-slate-600 hover:bg-[#f6f7fb]">초기화</button>
          <button type="button" className="h-[34px] rounded-lg bg-[#3a2ee6] px-5 text-[12.5px] font-medium text-white hover:brightness-110">조회</button>
        </div>
      </div>

      <div className="overflow-x-auto border-t border-[#e3e6ef]">
        <table className="w-full min-w-[1100px] text-[13px] font-normal whitespace-nowrap">
          <thead>
            <tr className="border-b border-[#e3e6ef] bg-[#f6f7fb] text-[#6b7086]">
              {['', '상태', '승인 요청자', '승인 담당자', '요청 일시', '요청 사유', '처리 일시', '처리 사유', '변경내용', '버전'].map((h, i) => (
                <th key={i} className={cn('h-11 px-3 font-normal', h === '요청 사유' || h === '처리 사유' ? 'text-left' : 'text-center')}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((h) => (
              <tr key={h.id} className="border-b border-[#e3e6ef] text-center text-slate-700">
                <td className="h-11 px-3 tabular-nums text-slate-400">{h.seq}</td>
                <td className="h-11 px-3"><span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[12px]', HIST_TONE[h.statusLabel] ?? 'bg-[#eceef3] text-[#5d6275]')}>{h.statusLabel}</span></td>
                <td className="h-11 px-3">{h.requester}</td>
                <td className="h-11 px-3">{h.manager}</td>
                <td className="h-11 px-3 text-slate-500">{fmtDT(h.requestedAt)}</td>
                <td className="h-11 px-3 text-left text-slate-600">{h.requestReason}</td>
                <td className="h-11 px-3 text-slate-500">{fmtDT(h.processedAt)}</td>
                <td className="h-11 px-3 text-left text-slate-600">{h.processReason}</td>
                <td className="h-11 px-3"><button type="button" onClick={() => setDetail(h)} className="inline-flex h-7 items-center rounded-md border border-[#cfd3e0] bg-white px-2.5 text-[11.5px] font-medium text-slate-600 hover:bg-[#f6f7fb]">상세보기</button></td>
                <td className="h-11 px-3 tabular-nums text-[#3a2ee6]">{h.version}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && <ChangePopup h={detail} onClose={() => setDetail(null)} />}
    </>
  );
}

// 변경사항 보기 팝업 (PG462-PU01) — 이력 정보 + 변경 사항 요약
function ChangePopup({ h, onClose }: { h: MenuHistoryRow; onClose: () => void }) {
  const [open, setOpen] = useState(true);
  // changeNote 예: "정보 변경 2 / 순서 변경 2 / 신규 등록 1" → 탭 카운트
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    (h.changeNote ?? '').split('/').forEach((seg) => { const mt = seg.trim().match(/(.+?)\s*(\d+)$/); if (mt) m[mt[1].trim()] = Number(mt[2]); });
    return m;
  }, [h.changeNote]);
  const tabs = Object.entries(counts).filter(([, v]) => v > 0);
  const [tab, setTab] = useState(tabs[0]?.[0] ?? '정보 변경');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#e3e6ef] px-6 py-4">
          <h3 className="text-[16px] font-bold text-slate-900">변경사항 보기</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto px-6 py-5">
          {/* 이력 정보 */}
          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-[14px] font-bold text-slate-900">이력 정보</h4>
              <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-[12px] text-slate-500">{open ? '접기' : '펼치기'}{open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}</button>
            </div>
            <div className="grid grid-cols-[120px_1fr_120px_1fr] overflow-hidden rounded-lg border border-[#e3e6ef]">
              <Cell label>구분</Cell><Cell>{h.statusLabel}</Cell><Cell label>변경 사항</Cell><Cell>{h.changeNote ?? '-'}</Cell>
              {open && (<>
                <Cell label>요청자</Cell><Cell>{h.requester}</Cell><Cell label>요청/저장 일시</Cell><Cell>{fmtDT(h.requestedAt)}</Cell>
                <Cell label>승인자</Cell><Cell>{h.manager}</Cell><Cell label>승인/반려 처리 일시</Cell><Cell>{fmtDT(h.processedAt)}{h.version ? ` (승인완료)` : ''}</Cell>
              </>)}
            </div>
          </div>
          {/* 변경 사항 탭 */}
          <h4 className="mb-2 text-[14px] font-bold text-slate-900">변경 사항</h4>
          {tabs.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[#e3e6ef] px-4 py-8 text-center text-[12.5px] text-slate-400">표시할 변경 상세가 없습니다.</p>
          ) : (<>
            <div className="mb-3 flex gap-4 border-b border-[#e3e6ef]">
              {tabs.map(([k, v]) => (
                <button key={k} type="button" onClick={() => setTab(k)} className={cn('-mb-px flex items-center gap-1.5 border-b-2 px-1 py-2 text-[13px] font-medium', tab === k ? 'border-[#3a2ee6] text-[#3a2ee6]' : 'border-transparent text-slate-500')}>{k}<span className="rounded-full bg-[#e3f6ea] px-1.5 text-[10px] font-bold text-[#1f8a4c]">{v}</span></button>
              ))}
            </div>
            <p className="rounded-lg bg-[#f6f7fb] px-4 py-6 text-center text-[12.5px] text-slate-500">「{tab}」 {counts[tab]}건 — 회차 스냅샷 기준 변경 내역(항목·변경 전/후)이 표시됩니다.</p>
          </>)}
        </div>
        <div className="flex justify-end border-t border-[#e3e6ef] px-6 py-4">
          <button onClick={onClose} className="h-9 rounded-lg bg-[#3a2ee6] px-6 text-[13px] font-semibold text-white hover:brightness-110">닫기</button>
        </div>
      </div>
    </div>
  );
}
