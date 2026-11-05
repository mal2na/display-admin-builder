'use client';

// 메뉴 관리(전체메뉴) — 운영 관리. SB BO-AIM-DSP-PG530(조회)·PG529(편집)·PG531(변경/승인 이력).
//  FO '전체메뉴'(마이/혜택/상품/고객지원 → 페이지 그룹 → 페이지)를 노출·순서·분류로 편성하고 승인 요청.
//  백엔드 미연동 프로토타입 — 저장/승인/이동은 세션 상태(데모).

import * as React from 'react';
import { cn } from '@/lib/utils';
import { StatusPill, Pager } from '@/components/ops-ui';
import {
  seedCategories, catPageCount, isPageExposed, isGroupExposed,
  HISTORY, REFLECTED, type MenuCategory, type PageGroup, type MenuPage,
} from '@/lib/menu/model';
import {
  GripVertical, ChevronRight, ChevronDown, Plus, Trash2, Check, X, Pencil, Lock,
} from 'lucide-react';

/* ───────── 공용 소품 ───────── */
function Toggle({ on, onClick, disabled }: { on: boolean; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className={cn('relative h-[20px] w-[34px] shrink-0 rounded-full transition-colors', disabled && 'opacity-40',
        on ? 'bg-[var(--ac)]' : 'bg-[var(--line3)]')} title={on ? '노출' : '미노출'}>
      <span className={cn('absolute top-[2px] h-[16px] w-[16px] rounded-full bg-white shadow-sm transition-all', on ? 'left-[16px]' : 'left-[2px]')} />
    </button>
  );
}
const Tag = ({ label, tone }: { label: string; tone: 'ok' | 'bad' | 'warn' | 'mute' }) => (
  <span className={cn('inline-flex items-center rounded-[5px] px-1.5 py-0.5 text-[11px] font-semibold',
    tone === 'ok' && 'bg-[#c8f6e1] text-[#038e52]', tone === 'bad' && 'bg-[#ffdcdc] text-[#ed3b3e]',
    tone === 'warn' && 'bg-[#ffe4c4] text-[#d66400]', tone === 'mute' && 'bg-[#eceef1] text-[#697582]')}>{label}</span>
);
const Panel = ({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) => (
  <section className="flex min-h-0 min-w-0 flex-1 flex-col">
    <div className="mb-2 flex items-center gap-2">
      <h3 className="text-[15px] font-bold text-[var(--ink)]">{title}</h3>
      {right}
    </div>
    <div className="min-h-0 flex-1">{children}</div>
  </section>
);

/* ───────── 루트 ───────── */
export function MenuManager() {
  const [tab, setTab] = React.useState<'menu' | 'history'>('menu');
  return (
    <div className="rounded-[16px] border border-[var(--line2)] bg-white">
      <div className="px-6 pb-6 pt-5">
        {/* 1 페이지 헤더 */}
        <nav className="flex flex-wrap items-center gap-1.5 text-[13px] leading-[18px] text-[var(--ink3)]">
          <span>홈</span><ChevronRight className="h-3.5 w-3.5 opacity-50" />
          <span>운영 관리</span><ChevronRight className="h-3.5 w-3.5 opacity-50" />
          <b className="font-semibold text-[var(--ink)]">메뉴 관리</b>
        </nav>
        <h1 className="mb-4 mt-1.5 text-[20px] font-bold leading-[28px] tracking-[-0.3px] text-[var(--ink)]">메뉴 관리</h1>

        {/* 2 탭 */}
        <div className="mb-5 flex gap-5 border-b border-[var(--line2)]">
          {([['menu', '메뉴 노출 관리'], ['history', '변경/승인 이력']] as const).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={cn('-mb-px border-b-2 px-1 pb-2.5 text-[15px] font-bold transition',
                tab === k ? 'border-[var(--ac)] text-[var(--ac)]' : 'border-transparent text-[var(--ink4)] hover:text-[var(--ink2)]')}>{label}</button>
          ))}
        </div>

        {tab === 'menu' ? <MenuExposure /> : <HistoryTab />}
      </div>
    </div>
  );
}

/* ───────── 메뉴 노출 관리 (조회 PG530 ↔ 편집 PG529) ───────── */
function MenuExposure() {
  const [edit, setEdit] = React.useState(false);
  const [cats, setCats] = React.useState<MenuCategory[]>(() => seedCategories());
  const [snapshot, setSnapshot] = React.useState<MenuCategory[]>(cats);
  const [selCat, setSelCat] = React.useState(cats[0].id);
  const [selPage, setSelPage] = React.useState<string | null>(cats[0].groups[0].pages[0].id);
  const [hideUnexposed, setHideUnexposed] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [checked, setChecked] = React.useState<Set<string>>(new Set());
  const [toast, setToast] = React.useState<string | null>(null);
  const [leaveAsk, setLeaveAsk] = React.useState(false);
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const cat = cats.find((c) => c.id === selCat) ?? cats[0];
  const located = locate(cats, selPage);

  // ── 뮤테이션(편집 모드) ──
  const mutate = (fn: (draft: MenuCategory[]) => void) => setCats((prev) => { const d = clone(prev); fn(d); return d; });
  const toggleCat = (id: string) => mutate((d) => { const c = d.find((x) => x.id === id); if (c) c.visible = !c.visible; });
  const toggleGrp = (gid: string) => mutate((d) => { for (const c of d) { const g = c.groups.find((x) => x.id === gid); if (g) g.visible = !g.visible; } });
  const togglePage = (pid: string) => mutate((d) => { const l = locate(d, pid); if (l && !l.pg.blocked) l.pg.foVisible = !l.pg.foVisible; });
  const renameCat = (id: string, name: string) => mutate((d) => { const c = d.find((x) => x.id === id); if (c) c.name = name; });
  const addCat = () => { const id = `c-${Date.now()}`; mutate((d) => d.push({ id, name: '새 메뉴 분류', visible: true, groups: [] })); setSelCat(id); };
  const removeCat = (id: string) => { mutate((d) => { const i = d.findIndex((x) => x.id === id); if (i >= 0) d.splice(i, 1); }); if (selCat === id) setSelCat(cats[0]?.id); };
  const addGroup = () => mutate((d) => { const c = d.find((x) => x.id === selCat); if (c) c.groups.push({ id: `g-${Date.now()}`, name: '새 페이지 그룹', visible: true, pages: [] }); });
  const removeGroup = (gid: string) => mutate((d) => { const c = d.find((x) => x.id === selCat); if (c) c.groups = c.groups.filter((g) => g.id !== gid); });
  const addPage = (gid: string) => mutate((d) => { const c = d.find((x) => x.id === selCat); const g = c?.groups.find((x) => x.id === gid); if (g) { const n = g.pages.length + 1; g.pages.push({ id: `p-${Date.now()}`, name: `새 페이지 ${n}`, originName: `새 페이지 ${n}`, pageId: `PG${String(900 + n).padStart(6, '0')}`, url: '/new', foVisible: true }); } });
  const removePage = (pid: string) => { mutate((d) => { const l = locate(d, pid); if (l) l.grp.pages = l.grp.pages.filter((p) => p.id !== pid); }); if (selPage === pid) setSelPage(null); };
  const setPageField = (pid: string, patch: Partial<MenuPage>) => mutate((d) => { const l = locate(d, pid); if (l) Object.assign(l.pg, patch); });

  const startEdit = () => { setSnapshot(clone(cats)); setEdit(true); setChecked(new Set()); };
  const cancelEdit = () => { setCats(snapshot); setEdit(false); setLeaveAsk(false); setChecked(new Set()); };
  const dirty = JSON.stringify(cats) !== JSON.stringify(snapshot);

  return (
    <div className="relative">
      {/* 3 반영 정보 (조회 전용) */}
      {!edit && (
        <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-1.5 rounded-[10px] border border-[var(--line2)] bg-[var(--th)] px-4 py-3 text-[13px]">
          <StatusPill label={REFLECTED.status} />
          <span className="text-[var(--ink3)]">승인 요청자 <b className="ml-1 font-semibold text-[var(--ink)]">{REFLECTED.requester}</b></span>
          <span className="text-[var(--ink3)]">승인 담당자 <b className="ml-1 font-semibold text-[var(--ink)]">{REFLECTED.approver}</b></span>
          <span className="ml-auto text-[var(--ink4)]">{REFLECTED.processedAt}</span>
        </div>
      )}

      {/* 12 검색 (조회 전용) */}
      {!edit && (
        <div className="mb-4 flex items-center gap-2 rounded-[10px] border border-[var(--line2)] bg-white px-4 py-3">
          <label className="shrink-0 text-[13px] font-medium text-[var(--ink2)]">페이지명</label>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="페이지명을 검색해주세요"
            className="h-[38px] flex-1 rounded-[var(--r-field)] border border-[var(--line3)] px-3 text-[14px] focus:border-[var(--ac)] focus:outline-none" />
          <button type="button" className="h-[38px] shrink-0 rounded-[8px] bg-[var(--ac)] px-4 text-[13px] font-semibold text-white hover:bg-[var(--ac-h)]">조회</button>
          <button type="button" onClick={() => setQ('')} className="h-[38px] shrink-0 rounded-[8px] border border-[var(--line3)] bg-white px-4 text-[13px] font-medium text-[var(--ink3)] hover:bg-[var(--th)]">초기화</button>
        </div>
      )}

      {edit && (
        <div className="mb-3 flex items-center gap-1 rounded-[8px] bg-[#f3f0ff] px-3 py-2 text-[12px] text-[var(--ac)]">
          <Pencil className="h-3.5 w-3.5" /> 편집 모드 — 노출·순서·분류를 바꾼 뒤 <b>승인요청</b>하면 검토 후 FO에 반영됩니다.
        </div>
      )}

      {/* 3열 — 메뉴 분류 / 페이지 목록 / 페이지 상세 */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)_minmax(280px,340px)]">
        {/* 4 메뉴 분류 */}
        <Panel title="메뉴 분류">
          <div className="space-y-2">
            {cats.map((c) => {
              const active = c.id === selCat;
              return (
                <div key={c.id} onClick={() => { setSelCat(c.id); }}
                  className={cn('cursor-pointer rounded-[10px] border bg-white p-3 transition',
                    active ? 'border-[var(--ac)] ring-1 ring-[var(--ac)]' : 'border-[var(--line2)] hover:border-[var(--line3)]')}>
                  <div className="flex items-center gap-2">
                    {edit && <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-[var(--ink4)]" />}
                    {edit ? (
                      <input value={c.name} onClick={(e) => e.stopPropagation()} onChange={(e) => renameCat(c.id, e.target.value)}
                        className="min-w-0 flex-1 rounded-[6px] border border-transparent bg-transparent px-1 text-[14px] font-bold hover:border-[var(--line3)] focus:border-[var(--ac)] focus:outline-none" />
                    ) : (
                      <span className={cn('min-w-0 flex-1 truncate text-[14px] font-bold', c.visible ? 'text-[var(--ink)]' : 'text-[var(--ink4)]')}>{c.name}</span>
                    )}
                    <span className="shrink-0 text-[12px] font-semibold tabular-nums text-[var(--ink3)]">{catPageCount(c)}</span>
                    <Toggle on={c.visible} onClick={edit ? () => toggleCat(c.id) : undefined} disabled={!edit} />
                    {edit && c.groups.length === 0 && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); removeCat(c.id); }} className="shrink-0 rounded-[6px] p-0.5 text-[var(--ink4)] hover:text-[var(--bad)]"><Trash2 className="h-3.5 w-3.5" /></button>
                    )}
                  </div>
                  {!c.visible && <p className="mt-1 text-[10.5px] text-[var(--ink4)]">미노출 — 하위 페이지도 FO에 안 보임</p>}
                </div>
              );
            })}
            {edit && (
              <button type="button" onClick={addCat} className="flex w-full items-center justify-center gap-1 rounded-[10px] border border-dashed border-[var(--line3)] py-2.5 text-[12px] font-medium text-[var(--ink4)] hover:border-[var(--ac)] hover:text-[var(--ac)]"><Plus className="h-3.5 w-3.5" /> 메뉴 분류 추가</button>
            )}
          </div>
        </Panel>

        {/* 5 페이지 목록 */}
        <Panel title="페이지 목록"
          right={<>
            <span className="text-[12px] text-[var(--ink4)]">{cat?.name} · 페이지 그룹 {cat?.groups.length ?? 0}건 · 페이지 {cat ? catPageCount(cat) : 0}건</span>
            <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-[12px] text-[var(--ink3)]">
              <input type="checkbox" checked={hideUnexposed} onChange={(e) => setHideUnexposed(e.target.checked)} className="h-3.5 w-3.5 accent-[var(--ac)]" /> 미노출 제외
            </label>
          </>}>
          <div className="rounded-[10px] border border-[var(--line2)]">
            {cat?.groups.map((g) => (
              <PageGroupBlock key={g.id} cat={cat} grp={g} edit={edit} hideUnexposed={hideUnexposed} q={q}
                selPage={selPage} onSelPage={setSelPage} checked={checked} onCheck={(id) => setChecked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; })}
                onToggleGrp={() => toggleGrp(g.id)} onTogglePage={togglePage} onAddPage={() => addPage(g.id)} onRemoveGroup={() => removeGroup(g.id)} />
            ))}
            {edit && (
              <button type="button" onClick={addGroup} className="flex w-full items-center justify-center gap-1 border-t border-[var(--line2)] py-2.5 text-[12px] font-medium text-[var(--ink3)] hover:bg-[var(--th)]"><Plus className="h-3.5 w-3.5" /> 페이지 그룹 추가</button>
            )}
            {!cat?.groups.length && <p className="px-4 py-8 text-center text-[13px] text-[var(--ink4)]">페이지가 없습니다. 페이지 그룹을 추가해 주세요.</p>}
          </div>
          {/* 6 선택 페이지 이동 */}
          {edit && checked.size > 0 && (
            <div className="mt-2 flex items-center gap-2 rounded-[8px] bg-[#f3f0ff] px-3 py-2 text-[12px]">
              <span className="font-semibold text-[var(--ac)]">{checked.size}개 선택</span>
              <select className="h-7 rounded-[6px] border border-[var(--line3)] bg-white px-2 text-[12px]">
                {cats.filter((c) => c.id !== selCat).flatMap((c) => c.groups.map((g) => <option key={g.id} value={g.id}>{c.name} &gt; {g.name}</option>))}
              </select>
              <button type="button" onClick={() => { say(`${checked.size}개 페이지를 이동했습니다 (데모)`); setChecked(new Set()); }} className="rounded-[6px] bg-[var(--ac)] px-2.5 py-1 font-semibold text-white">으로 이동</button>
              <button type="button" onClick={() => setChecked(new Set())} className="rounded-[6px] border border-[var(--line3)] bg-white px-2.5 py-1 text-[var(--ink3)]">선택 해제</button>
            </div>
          )}
        </Panel>

        {/* 9 페이지 상세 */}
        <Panel title="페이지 상세">
          {located ? <PageDetail key={located.pg.id} cat={located.cat} grp={located.grp} pg={located.pg} edit={edit}
            onField={(patch) => setPageField(located.pg.id, patch)} onDelete={() => removePage(located.pg.id)} /> : (
            <div className="rounded-[10px] border border-dashed border-[var(--line2)] p-6 text-center text-[13px] text-[var(--ink4)]">페이지를 선택하세요.</div>
          )}
        </Panel>
      </div>

      {/* 하단 액션 */}
      <div className="mt-6 flex justify-end gap-2">
        {!edit ? (
          <button type="button" onClick={startEdit} className="inline-flex items-center gap-1.5 rounded-[10px] bg-[var(--ac)] px-5 py-2.5 text-[14px] font-bold text-white hover:bg-[var(--ac-h)]"><Pencil className="h-4 w-4" /> 편집</button>
        ) : (<>
          <button type="button" onClick={() => (dirty ? setLeaveAsk(true) : cancelEdit())} className="rounded-[10px] border border-[var(--line3)] bg-white px-5 py-2.5 text-[14px] font-medium text-[var(--ink2)] hover:bg-[var(--th)]">취소</button>
          <button type="button" onClick={() => { setEdit(false); setSnapshot(clone(cats)); say('승인요청을 보냈습니다 (데모)'); }} className="rounded-[10px] bg-[var(--ac)] px-5 py-2.5 text-[14px] font-bold text-white hover:bg-[var(--ac-h)]">승인요청</button>
        </>)}
      </div>

      {/* 15 토스트 */}
      {toast && (
        <div className="pointer-events-none fixed bottom-20 left-1/2 z-[90] -translate-x-1/2">
          <div className="rounded-[10px] bg-[#000b14cf] px-4 py-2.5 text-[13px] text-white shadow-lg">{toast}</div>
        </div>
      )}
      {/* 16 편집 취소 팝업 */}
      {leaveAsk && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/30" onClick={() => setLeaveAsk(false)}>
          <div className="w-[320px] rounded-[16px] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-[15px] font-bold text-[var(--ink)]">변경사항을 저장하지 않고 나가시겠습니까?</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--ink3)]">편집 중인 전체가 취소됩니다. 삭제한 내용은 복구할 수 없습니다.</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setLeaveAsk(false)} className="flex-1 rounded-[10px] border border-[var(--line3)] bg-white py-2.5 text-[13px] font-medium text-[var(--ink2)]">취소</button>
              <button type="button" onClick={cancelEdit} className="flex-1 rounded-[10px] bg-[var(--ac)] py-2.5 text-[13px] font-bold text-white">확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 페이지 그룹 블록 ── */
function PageGroupBlock({ cat, grp, edit, hideUnexposed, q, selPage, onSelPage, checked, onCheck, onToggleGrp, onTogglePage, onAddPage, onRemoveGroup }: {
  cat: MenuCategory; grp: PageGroup; edit: boolean; hideUnexposed: boolean; q: string;
  selPage: string | null; onSelPage: (id: string) => void; checked: Set<string>; onCheck: (id: string) => void;
  onToggleGrp: () => void; onTogglePage: (id: string) => void; onAddPage: () => void; onRemoveGroup: () => void;
}) {
  const [open, setOpen] = React.useState(true);
  const exposed = isGroupExposed(cat, grp);
  let pages = grp.pages;
  if (q) pages = pages.filter((p) => p.name.includes(q) || p.originName.includes(q));
  if (hideUnexposed) pages = pages.filter((p) => isPageExposed(cat, grp, p));
  if (q && pages.length === 0) return null;
  return (
    <div className="border-b border-[var(--line2)] last:border-b-0">
      {/* 그룹 헤더 */}
      <div className="flex items-center gap-2 bg-[var(--th)] px-3 py-2">
        {edit && <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-[var(--ink4)]" />}
        <button type="button" onClick={() => setOpen((v) => !v)} className="text-[var(--ink3)]">{open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</button>
        <span className="text-[13px] font-bold text-[var(--ink2)]">{grp.name}</span>
        {exposed ? <Tag label="노출" tone="ok" /> : <Tag label="미노출" tone="bad" />}
        <div className="ml-auto flex items-center gap-1.5">
          {edit && <Toggle on={grp.visible} onClick={onToggleGrp} />}
          {edit && <button type="button" onClick={onAddPage} className="rounded-[6px] border border-[var(--line3)] bg-white px-2 py-0.5 text-[11px] font-medium text-[var(--ink3)] hover:bg-white">페이지 추가</button>}
          {edit && grp.pages.length === 0 && <button type="button" onClick={onRemoveGroup} className="rounded-[6px] p-0.5 text-[var(--ink4)] hover:text-[var(--bad)]"><Trash2 className="h-3.5 w-3.5" /></button>}
        </div>
      </div>
      {/* 페이지 행 */}
      {open && pages.map((p) => {
        const sel = p.id === selPage;
        const pexposed = isPageExposed(cat, grp, p);
        return (
          <div key={p.id} onClick={() => onSelPage(p.id)}
            className={cn('flex cursor-pointer items-center gap-2 border-t border-[var(--line2)] px-3 py-2.5 pl-8 transition first:border-t-0',
              sel ? 'bg-[#f3f0ff]' : 'hover:bg-[var(--th)]', p.blocked && 'opacity-70')}>
            {edit && <input type="checkbox" checked={checked.has(p.id)} onClick={(e) => e.stopPropagation()} onChange={() => onCheck(p.id)} className="h-3.5 w-3.5 accent-[var(--ac)]" />}
            {edit && <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-[var(--ink4)]" />}
            <span className={cn('min-w-0 flex-1 truncate text-[13px]', pexposed ? 'font-medium text-[var(--ink)]' : 'text-[var(--ink4)]')}>{p.name}</span>
            {p.blocked ? <Tag label="서비스 차단" tone="bad" /> : (edit ? <Toggle on={p.foVisible} onClick={() => onTogglePage(p.id)} /> : <Tag label={pexposed ? '노출' : '미노출'} tone={pexposed ? 'ok' : 'mute'} />)}
          </div>
        );
      })}
    </div>
  );
}

/* ── 페이지 상세 ── */
function PageDetail({ cat, grp, pg, edit, onField, onDelete }: {
  cat: MenuCategory; grp: PageGroup; pg: MenuPage; edit: boolean; onField: (p: Partial<MenuPage>) => void; onDelete: () => void;
}) {
  const exposed = isPageExposed(cat, grp, pg);
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-2 border-b border-[var(--line2)] py-2.5 last:border-b-0">
      <span className="text-[12px] font-medium text-[var(--ink3)]">{label}</span>
      <div className="min-w-0 text-[13px] text-[var(--ink)]">{children}</div>
    </div>
  );
  return (
    <div className="rounded-[10px] border border-[var(--line2)] p-4">
      {/* 10-1 / A1·A2 안내 배너 */}
      {pg.blocked && <div className="mb-3 flex items-start gap-1.5 rounded-[8px] bg-[#ffecec] px-3 py-2 text-[12px] text-[#c0392b]"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" /> 서비스 차단 페이지로 FO에 노출되지 않습니다.</div>}
      {!pg.blocked && pg.foVisible && !exposed && <div className="mb-3 rounded-[8px] bg-[#fff6e5] px-3 py-2 text-[12px] text-[#b7791f]">⚠ 상위 메뉴 분류 또는 페이지 그룹 미노출로 FO에 노출되지 않습니다.</div>}

      <Row label="페이지명">
        {edit ? <input value={pg.name} onChange={(e) => onField({ name: e.target.value })} className="h-[32px] w-full rounded-[6px] border border-[var(--line3)] px-2 text-[13px] focus:border-[var(--ac)] focus:outline-none" /> : <b className="font-semibold">{pg.name}</b>}
      </Row>
      <Row label="원본명"><span className="text-[var(--ink3)]">{pg.originName}</span></Row>
      <Row label="페이지 ID"><span className="font-mono text-[12px] text-[var(--ac)] underline">{pg.pageId}</span></Row>
      <Row label="페이지 위치"><span className="text-[12px] text-[var(--ink3)]">마이 &gt; {cat.name} &gt; {grp.name} &gt; {pg.name}</span></Row>
      <Row label="URL"><span className="font-mono text-[12px] text-[var(--ink3)]">{pg.url}</span></Row>
      <Row label="FO 노출 여부">
        {edit && !pg.blocked ? (
          <div className="flex items-center gap-4 text-[13px]">
            {([['Y', true], ['N', false]] as const).map(([l, v]) => (
              <label key={l} className="flex cursor-pointer items-center gap-1.5">
                <input type="radio" name={`fo-${pg.id}`} checked={pg.foVisible === v} onChange={() => onField({ foVisible: v })} className="h-4 w-4 accent-[var(--ac)]" />
                <span className={pg.foVisible === v ? 'font-medium text-[var(--ink)]' : 'text-[var(--ink4)]'}>{l}</span>
              </label>
            ))}
          </div>
        ) : <span className="font-semibold">{pg.blocked ? '— (서비스 차단)' : pg.foVisible ? 'Y' : 'N'}</span>}
      </Row>
      {edit && (
        <div className="mt-3 flex justify-end">
          <button type="button" onClick={onDelete} className="inline-flex items-center gap-1 rounded-[8px] border border-[#f1c0c0] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[var(--bad)] hover:bg-[#fff0f1]"><Trash2 className="h-3.5 w-3.5" /> 페이지 삭제</button>
        </div>
      )}
    </div>
  );
}

/* ───────── 변경/승인 이력 (PG531) ───────── */
function HistoryTab() {
  const [page, setPage] = React.useState(1);
  return (
    <div>
      <div className="overflow-x-auto rounded-[10px] border border-[var(--line2)]">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[var(--line2)] bg-[var(--th)] text-left text-[12px] font-semibold text-[var(--ink3)]">
              {['No.', '상태', 'Ver.', '승인 요청자', '요청 일시', '요청 사유', '승인 담당자', '처리 일시', '처리 사유', '변경사항'].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HISTORY.map((h) => (
              <tr key={h.no} className="border-b border-[var(--line2)] last:border-b-0 hover:bg-[var(--th)]">
                <td className="px-3 py-3 tabular-nums text-[var(--ink3)]">{h.no}</td>
                <td className="px-3 py-3"><StatusPill label={h.status} /></td>
                <td className="px-3 py-3 font-semibold text-[var(--ink2)]">{h.version ?? ''}</td>
                <td className="whitespace-nowrap px-3 py-3 text-[var(--ink2)]">{h.requester}</td>
                <td className="whitespace-nowrap px-3 py-3 tabular-nums text-[var(--ink3)]">{h.requestedAt}</td>
                <td className="px-3 py-3 text-[var(--ink2)]">{h.reason || '-'}</td>
                <td className="whitespace-nowrap px-3 py-3 text-[var(--ink3)]">{h.approver}</td>
                <td className="whitespace-nowrap px-3 py-3 tabular-nums text-[var(--ink3)]">{h.processedAt}</td>
                <td className="px-3 py-3 text-[var(--ink3)]">{h.processReason || ''}</td>
                <td className="px-3 py-3"><button type="button" className="rounded-[6px] border border-[var(--line3)] bg-white px-2 py-1 text-[11px] font-medium text-[var(--ink3)] hover:bg-[var(--th)]">변경사항</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-center">
        <Pager page={page} totalPages={1} onChange={setPage} />
      </div>
    </div>
  );
}

/* ───────── 헬퍼 ───────── */
function clone<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }
function locate(cats: MenuCategory[], pid: string | null): { cat: MenuCategory; grp: PageGroup; pg: MenuPage } | null {
  if (!pid) return null;
  for (const cat of cats) for (const grp of cat.groups) { const pg = grp.pages.find((p) => p.id === pid); if (pg) return { cat, grp, pg }; }
  return null;
}
