'use client';

import { useMemo, useState } from 'react';
import {
  ChevronDown, ChevronRight, ChevronUp, AlertTriangle, GripVertical,
  RotateCcw, Plus, Search, X, Check, Image as ImageIcon, Undo2,
} from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  seedFixed, childrenOf, badgesOf, validateValue, infoChanged, orderChanged, isNewNode, isIncomplete, hasChange,
  infoDiffRows, linkText, LOGIN_LABEL, LINK_LABEL, GRADES, LINES, OS_OPTS, CONTAINERS, menuValue,
  DRAFT_BADGE, DRAFT_LABEL, BADGE_TONE,
  type MenuNode, type MenuValue, type Channel, type LinkKind, type DraftState, type Badge as ChangeBadge,
  type HistoryEntry, type ApprovalResult,
} from './mock-menus';

/* ------------------------------------------------------------------ */
/* 공통                                                                */
/* ------------------------------------------------------------------ */
function stamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function Tbd() {
  return <span className="ml-1 inline-flex items-center rounded bg-amber-50 px-1 py-px text-[9px] font-semibold text-amber-600 ring-1 ring-inset ring-amber-200">TBD</span>;
}
function BadgeChip({ b }: { b: ChangeBadge }) {
  return <span className={cn('inline-flex items-center rounded-md px-1.5 py-px text-[10px] font-medium ring-1 ring-inset', BADGE_TONE[b])}>{b}</span>;
}
function DraftChip({ s }: { s: DraftState }) {
  return <Badge variant={DRAFT_BADGE[s]}>{DRAFT_LABEL[s]}</Badge>;
}
function Modal({ title, children, onClose, footer, wide }: { title: React.ReactNode; children: React.ReactNode; onClose: () => void; footer?: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className={cn('flex max-h-[86vh] w-full flex-col overflow-hidden rounded-xl bg-card shadow-2xl', wide ? 'max-w-2xl' : 'max-w-md')} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3.5"><h3 className="text-sm font-bold">{title}</h3><button className="text-muted-foreground hover:text-foreground" onClick={onClose}><X className="h-4 w-4" /></button></div>
        <div className="min-h-0 flex-1 overflow-auto px-5 py-4 text-sm">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t bg-muted/40 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
function Alert({ title, body, onClose, onConfirm, confirmText = '확인', danger }: { title: string; body?: React.ReactNode; onClose: () => void; onConfirm?: () => void; confirmText?: string; danger?: boolean }) {
  return (
    <Modal title={title} onClose={onClose} footer={<>{onConfirm && <Button size="sm" variant="outline" onClick={onClose}>취소</Button>}<Button size="sm" variant={danger ? 'destructive' : 'primary'} onClick={() => { onConfirm?.(); onClose(); }}>{confirmText}</Button></>}>
      {body && <p className="text-sm text-muted-foreground">{body}</p>}
    </Modal>
  );
}
const ReadRow = ({ label, children, tbd }: { label: React.ReactNode; children: React.ReactNode; tbd?: boolean }) => (
  <div className={cn('grid grid-cols-[130px_minmax(0,1fr)] gap-3 border-b px-3 py-2.5 text-sm last:border-0', tbd && 'bg-accent/40')}>
    <span className="font-semibold text-muted-foreground">{label}{tbd && <Tbd />}</span>
    <span className="min-w-0 break-words">{children}</span>
  </div>
);
const Field = ({ label, req, children, hint }: { label: React.ReactNode; req?: boolean; children: React.ReactNode; hint?: string }) => (
  <div className="grid grid-cols-[110px_minmax(0,1fr)] items-start gap-3 py-2">
    <label className="pt-2 text-[13px] font-semibold text-muted-foreground">{label}{req && <span className="text-destructive"> *</span>}</label>
    <div className="min-w-0">{children}{hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}</div>
  </div>
);
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><div className="mb-1 border-b pb-1.5"><h4 className="text-sm font-bold">{title}</h4></div><div>{children}</div></section>;
}

/* ------------------------------------------------------------------ */
/* 메인                                                                */
/* ------------------------------------------------------------------ */
export function MenuAdmin() {
  const [nodes, setNodes] = useState<MenuNode[]>(() => seedFixed());
  const [draft, setDraft] = useState<DraftState>('임시저장'); // 시드에 변경 존재 → 임시저장
  const [rejectReason, setRejectReason] = useState<string | null>(null);
  const [reflectedAt, setReflectedAt] = useState('2026-08-25 09:30:08');

  const [view, setView] = useState<'수정본' | '승인본'>('승인본');
  const [mode, setMode] = useState<'read' | 'edit'>('read');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['m1', 'm1-1']));

  // 검색/필터
  const [searchField, setSearchField] = useState('전체');
  const [q, setQ] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fUse, setFUse] = useState('ALL');
  const [fChannel, setFChannel] = useState('ALL');
  const [fLogin, setFLogin] = useState('ALL');

  const [alert, setAlert] = useState<null | { kind: string; payload?: any }>(null);
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  // 운영 이력
  const [history, setHistory] = useState<HistoryEntry[]>(() => seedHistory());
  const [diffEntry, setDiffEntry] = useState<HistoryEntry | null>(null);
  const [containerPick, setContainerPick] = useState<null | { nodeId: string }>(null);

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const selected = selectedId ? byId.get(selectedId) ?? null : null;

  const changeCount = nodes.filter(hasChange).length;
  const incompleteCount = nodes.filter(isIncomplete).length;
  const hasDraftContent = changeCount > 0 || draft !== '없음';
  const editable = draft === '임시저장' || draft === '승인반려' || draft === '없음';

  /* ---------- 검색 매칭 ---------- */
  const matchSet = useMemo(() => {
    const s = new Set<string>(); const term = q.trim().toLowerCase();
    for (const n of nodes) {
      let ok = true;
      if (term) {
        const hay = searchField === '메뉴 코드' ? n.code : searchField === '메뉴명' ? n.working.name : `${n.working.name} ${n.code}`;
        ok = hay.toLowerCase().includes(term);
      }
      if (ok && fUse !== 'ALL') ok = fUse === 'USE' ? n.working.active : !n.working.active;
      if (ok && fChannel !== 'ALL') ok = n.working.channels.includes(fChannel as Channel);
      if (ok && fLogin !== 'ALL') ok = fLogin === 'LOGIN' ? n.working.loginCond === 'LOGIN' : n.working.loginCond === 'ALL';
      if (ok) s.add(n.id);
    }
    return s;
  }, [nodes, q, searchField, fUse, fChannel, fLogin]);
  const hasFilter = q.trim() !== '' || fUse !== 'ALL' || fChannel !== 'ALL' || fLogin !== 'ALL';
  const ancestorsExpanded = useMemo(() => {
    if (!hasFilter) return expanded;
    const s = new Set(expanded);
    for (const id of matchSet) { let p = byId.get(id)?.parentId ?? null; while (p) { s.add(p); p = byId.get(p)?.parentId ?? null; } }
    return s;
  }, [expanded, matchSet, hasFilter, byId]);

  const kids = (pid: string | null) => childrenOf(nodes, pid, view === '승인본');
  const toggleExpand = (id: string) => setExpanded((p) => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const expandAll = () => setExpanded(new Set(nodes.filter((n) => kids(n.id).length).map((n) => n.id)));
  const collapseAll = () => setExpanded(new Set());
  const resetFilters = () => { setQ(''); setFUse('ALL'); setFChannel('ALL'); setFLogin('ALL'); };

  const selectNode = (id: string) => { setSelectedId(id); setExpanded((p) => new Set(p).add(id)); };

  /* ---------- 편집 조작 ---------- */
  const patchWorking = (id: string, patch: Partial<MenuValue>) =>
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, working: { ...n.working, ...patch } } : n)));

  // 형제 그룹 순서 재배치 (드래그 앤 드롭 — 같은 부모 안에서만)
  const applyReorder = (parentId: string | null, orderedIds: string[]) => {
    const orderMap = new Map(orderedIds.map((x, i) => [x, i + 1]));
    setNodes((prev) => prev.map((x) => (x.parentId === parentId && orderMap.has(x.id) ? { ...x, order: orderMap.get(x.id)! } : x)));
  };

  const revert = (id: string) => {
    const n = byId.get(id)!;
    if (isNewNode(n)) { setNodes((prev) => prev.filter((x) => x.id !== id)); if (selectedId === id) setSelectedId(null); }
    else setNodes((prev) => prev.map((x) => (x.id === id ? { ...x, working: { ...x.approved! }, order: x.approvedOrder! } : x)));
    flash('선택 메뉴를 승인본 상태로 되돌렸습니다.');
  };

  const addMenu = (depth: 1 | 2 | 3, parentId: string | null) => {
    const id = `m-new-${Math.random().toString(36).slice(2, 6)}`;
    const sibs = kids(parentId);
    setNodes((prev) => [...prev, {
      id, code: `MNU-NEW-${prev.length}`, depth, parentId, approved: null, approvedOrder: null,
      order: sibs.length + 1, working: menuValue({ name: '', nameChecked: false, container: '' }), org: '전시운영팀', owner: 'P213980',
    }]);
    setSelectedId(id); setMode('edit');
  };

  /* ---------- 워크플로우 ---------- */
  const startEdit = () => {
    if (draft === '승인대기') { setAlert({ kind: 'edit-while-review' }); return; }
    setMode('edit');
  };
  const doSaveDraft = () => {
    if (incompleteCount > 0) { setAlert({ kind: 'incomplete', payload: incompleteCount }); return; }
    if (changeCount === 0) { setAlert({ kind: 'no-change' }); return; }
    setDraft('임시저장'); setMode('read');
    addHistory('임시저장', '승인대기' as ApprovalResult); // 임시저장은 결과 없음 → 아래 보정
    flash('임시저장했습니다.');
  };
  const requestApproval = () => {
    if (changeCount === 0) { setAlert({ kind: 'no-change' }); return; }
    if (incompleteCount > 0) { setAlert({ kind: 'incomplete', payload: incompleteCount }); return; }
    setAlert({ kind: 'confirm-request' });
  };
  const doRequest = () => {
    setDraft('승인대기'); setMode('read'); setRejectReason(null);
    addHistory('승인요청', '승인대기');
    flash(`변경 세트 ${changeCount}건을 한 건의 승인 요청으로 BSS에 전송했습니다.`);
  };
  const cancelRequest = () => {
    setDraft('임시저장');
    setHistory((prev) => prev.map((h, i) => (i === 0 && h.result === '승인대기' ? { ...h, result: '요청취소' } : h)));
    addHistory('취소요청', '요청취소');
    flash('승인 요청을 철회했습니다.');
  };
  const bssApprove = () => {
    setNodes((prev) => prev.map((n) => ({ ...n, approved: { ...n.working }, approvedOrder: n.order })));
    setDraft('없음');
    setHistory((prev) => prev.map((h, i) => (i === 0 ? { ...h, result: '승인완료', approver: 'BSS 검수자', processedAt: stamp(), version: (Math.max(0, ...prev.map((x) => x.version ?? 0)) + 1) } : h)));
    flash('BSS 승인 완료(모의). 채널 즉시 업데이트로 FO에 반영할 수 있습니다.');
  };
  const bssReject = () => {
    setDraft('승인반려'); setRejectReason('정책 미협의 — 외부 랜딩 전환 불가 (모의)');
    setHistory((prev) => prev.map((h, i) => (i === 0 ? { ...h, result: '승인반려', approver: 'BSS 검수자', processedAt: stamp(), reason: '정책 미협의 — 외부 랜딩 전환 불가 (모의)' } : h)));
    flash('BSS 반려(모의).');
  };
  const channelUpdate = () => {
    if (draft !== '없음' || nodes.every((n) => n.approvedOrder != null)) {
      // 승인 완료된 미반영 변경이 있는지 (모의: 승인완료 상태면 반영 가능)
      if (draft === '없음') { setReflectedAt(stamp()); flash('채널 즉시 업데이트 완료 — 승인분 캐시(Redis)를 갱신했습니다.'); return; }
    }
    setAlert({ kind: 'no-update' });
  };

  function addHistory(kind: HistoryEntry['kind'], result: ApprovalResult) {
    const info = nodes.filter((n) => infoChanged(n)).length;
    const order = nodes.filter((n) => orderChanged(n)).length;
    const add = nodes.filter((n) => isNewNode(n)).length;
    setHistory((prev) => [{
      id: `h${Date.now()}`, version: null, kind, requester: '김지훈 (SSP2332)', requestedAt: stamp(),
      approver: null, result: kind === '임시저장' ? ('임시저장' as any) : result, processedAt: null, reason: null,
      summary: { info, order, add },
    }, ...prev]);
  }

  /* ---------- 렌더 ---------- */
  return (
    <div className="space-y-4">
      <PageHeader trail={['전시 관리', '전체 메뉴 관리']} title="전체 메뉴 관리"
        subtitle="전체 메뉴의 운영 정보와 노출 순서를 조회하고, 변동 사항을 모아 한 번에 승인 요청합니다. (FN-DSP-MNU-001)" />

      <>
          {/* 검색 */}
          <div className="space-y-3 rounded-xl border bg-card px-5 py-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
              <span className="text-[13px] font-semibold text-muted-foreground">검색 항목</span>
              <Select className="h-9 w-32" value={searchField} onChange={(e) => setSearchField(e.target.value)}><option>전체</option><option>메뉴명</option><option>메뉴 코드</option></Select>
              <div className="relative min-w-[240px] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="h-9 pl-9" placeholder="메뉴 명, 메뉴 코드를 검색해주세요." value={q} onChange={(e) => setQ(e.target.value)} /></div>
              <button className="ml-auto flex items-center gap-1 rounded-md px-2 py-1.5 text-[13px] font-semibold text-primary hover:bg-accent" onClick={() => setFiltersOpen((o) => !o)}>{filtersOpen ? '접기' : '펼치기'} {filtersOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}</button>
              {!filtersOpen && <FilterActions onReset={resetFilters} />}
            </div>
            {filtersOpen && (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t pt-3.5">
                <FilterSel label="사용 여부" value={fUse} onChange={setFUse} opts={[['ALL', '전체'], ['USE', '사용'], ['UNUSE', '미사용']]} />
                <FilterSel label="운영 채널" value={fChannel} onChange={setFChannel} opts={[['ALL', '전체'], ['PC', 'PC'], ['APP', 'APP']]} />
                <FilterSel label="로그인 조건" value={fLogin} onChange={setFLogin} opts={[['ALL', '전체'], ['ALLSHOW', '전체 노출'], ['LOGIN', '로그인 시 노출']]} />
                <div className="ml-auto"><FilterActions onReset={resetFilters} /></div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[400px_minmax(0,1fr)]">
            {/* 좌: 트리 */}
            <div className="flex flex-col rounded-xl border bg-card">
              <div className="flex items-center gap-2 border-b p-3">
                {mode === 'edit'
                  ? <Button size="sm" variant="primary" onClick={() => setAlert({ kind: 'add-menu' })}><Plus className="h-4 w-4" /> 메뉴 등록</Button>
                  : <VersionToggle view={view} setView={setView} hasDraft={hasDraftContent} />}
                <div className="ml-auto flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={expandAll}>전체 펼치기</Button>
                  <Button size="sm" variant="outline" onClick={collapseAll}>전체 접기</Button>
                </div>
              </div>

              {mode === 'edit' && (
                <div className="flex items-center gap-2 border-b bg-accent/60 px-3 py-2 text-[11px] font-semibold text-accent-foreground">
                  편집 모드 · 같은 Depth 안에서만 순서 이동 · 변경 <b>{changeCount}</b>건{incompleteCount > 0 && <span className="text-destructive"> / 미완료 {incompleteCount}건</span>}
                </div>
              )}

              <div className="min-h-[320px] flex-1 overflow-auto p-2">
                {mode === 'edit' ? (
                  <EditTree parentId={null} depth={0} nodes={nodes} expanded={ancestorsExpanded} selectedId={selectedId}
                    kidsOf={kids} onToggle={toggleExpand} onSelect={selectNode} onReorder={applyReorder} onRevert={revert} />
                ) : (
                  kids(null).map((n) => (
                    <TreeRow key={n.id} node={n} nodes={nodes} depth={0} view={view}
                      expanded={ancestorsExpanded} selectedId={selectedId} matchSet={matchSet} hasFilter={hasFilter}
                      kidsOf={kids} onToggle={toggleExpand} onSelect={selectNode} />
                  ))
                )}
              </div>

              {/* 하단 */}
              <div className="flex flex-wrap items-center gap-2 border-t p-3">
                {mode === 'edit' ? (
                  <>
                    <span className="text-[12px] text-muted-foreground">변경 <b className="text-foreground">{changeCount}</b>건{incompleteCount > 0 && <b className="text-destructive"> / 미완료 {incompleteCount}건</b>}</span>
                    <div className="ml-auto flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setAlert({ kind: 'cancel-edit' })}>취소</Button>
                      <Button size="sm" variant="outline" onClick={doSaveDraft}>임시저장</Button>
                      <Button size="sm" variant="primary" onClick={requestApproval}>승인 요청</Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="tblue" onClick={channelUpdate}><RotateCcw className="h-4 w-4" /> 채널 즉시 업데이트</Button>
                    <span className="ml-auto flex items-center gap-1.5 text-[12px] text-muted-foreground">승인 상태 <DraftChip s={draft} /></span>
                  </>
                )}
              </div>
            </div>

            {/* 우: 상세/편집 */}
            <div className="rounded-xl border bg-card">
              {!selected ? (
                <div className="flex h-full min-h-[420px] items-center justify-center px-6 text-center text-sm text-muted-foreground">메뉴명을 클릭하면 상세 정보를 볼 수 있습니다.</div>
              ) : mode === 'edit' ? (
                <EditForm node={selected} nodes={nodes} draft={draft} changeCount={changeCount} incompleteCount={incompleteCount}
                  onPatch={patchWorking} onRevert={revert} onPickContainer={() => setContainerPick({ nodeId: selected.id })}
                  onCancel={() => setAlert({ kind: 'cancel-edit' })} onSaveDraft={doSaveDraft} onRequest={requestApproval} />
              ) : (
                <DetailRead node={selected} view={view} draft={draft} rejectReason={rejectReason}
                  reflectedAt={reflectedAt} onEdit={startEdit} onChannelUpdate={channelUpdate}
                  onBssApprove={bssApprove} onBssReject={bssReject} onCancelRequest={cancelRequest} onReason={() => setAlert({ kind: 'reason', payload: rejectReason })} />
              )}
            </div>
          </div>
        </>

      {/* 컨테이너 불러오기 */}
      {containerPick && (
        <ContainerPicker onClose={() => setContainerPick(null)} onPick={(c) => { patchWorking(containerPick.nodeId, { linkKind: 'CONTAINER', container: `${c.name} / ${c.id}`, linkApproved: c.on }); setContainerPick(null); }} />
      )}
      {/* 변경사항 팝업 */}
      {diffEntry && <ChangeDiffModal entry={diffEntry} nodes={nodes} onClose={() => setDiffEntry(null)} />}

      {/* 알림 */}
      {alert?.kind === 'add-menu' && <AddMenuModal nodes={nodes} onClose={() => setAlert(null)} onAdd={(d, p) => { addMenu(d, p); setAlert(null); }} />}
      {alert?.kind === 'cancel-edit' && <Alert title="수정을 취소하시겠습니까?" body="취소 시 변경 내용은 이전 상태로 모두 원복됩니다." confirmText="확인" onConfirm={() => { setNodes(seedFixed()); setMode('read'); setDraft('임시저장'); }} onClose={() => setAlert(null)} />}
      {alert?.kind === 'no-change' && <Alert title="변경 사항이 없습니다." onClose={() => setAlert(null)} />}
      {alert?.kind === 'incomplete' && <Alert title={`변경이 완료되지 않은 메뉴가 ${alert.payload}건 있습니다.`} body="모두 변경을 완료해주세요. (필수값·중복확인·URL 검증)" onClose={() => setAlert(null)} />}
      {alert?.kind === 'confirm-request' && <Alert title="승인 요청 하시겠습니까?" body={<>변경 세트 <b>{changeCount}</b>건 전체를 한 건의 승인 요청으로 BSS에 전송합니다. 승인 전에는 FO에 반영되지 않습니다. (PI-DSP-MNU-003)</>} confirmText="승인 요청" onConfirm={doRequest} onClose={() => setAlert(null)} />}
      {alert?.kind === 'edit-while-review' && <Alert title="승인 대기 중인 변경 내용이 있습니다." body="수정할 경우 이 승인 요청은 취소됩니다. 이어서 수정하시겠습니까?" confirmText="이어서 수정" onConfirm={() => { setDraft('임시저장'); setMode('edit'); }} onClose={() => setAlert(null)} />}
      {alert?.kind === 'no-update' && <Alert title="새롭게 업데이트할 승인 완료 변경 내용이 없습니다." onClose={() => setAlert(null)} />}
      {alert?.kind === 'reason' && <Alert title="반려 사유" body={alert.payload ?? '사유 없음'} onClose={() => setAlert(null)} />}

      {toast && <div className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-xl">{toast}</div>}
    </div>
  );
}

function seedHistory(): HistoryEntry[] {
  return [
    { id: 'h3', version: 1, kind: '승인요청', requester: '김지훈 (SSP2332)', requestedAt: '2026-08-25 15:22:03', approver: '정지솔 (SSP12344)', result: '승인완료', processedAt: '2026-08-25 15:40:04', reason: null, summary: { info: 3, order: 2, add: 1 } },
    { id: 'h2', version: null, kind: '승인요청', requester: '김지훈 (SSP2332)', requestedAt: '2026-08-22 10:21:04', approver: '정지솔 (SSP12344)', result: '승인반려', processedAt: '2026-08-22 12:00:04', reason: '정책 미협의 — 외부 랜딩 전환 불가', summary: { info: 2, order: 0, add: 0 } },
    { id: 'h1', version: null, kind: '임시저장', requester: '김지훈 (SSP2332)', requestedAt: '2026-08-20 08:30:08', approver: null, result: '임시저장' as any, processedAt: null, reason: null, summary: { info: 1, order: 0, add: 0 } },
  ];
}

/* ------------------------------------------------------------------ */
/* 수정본/승인본 토글 (3-1)                                            */
/* ------------------------------------------------------------------ */
function VersionToggle({ view, setView, hasDraft }: { view: '수정본' | '승인본'; setView: (v: '수정본' | '승인본') => void; hasDraft: boolean }) {
  return (
    <div className="flex overflow-hidden rounded-md border">
      {/* 승인본이 기본(고정) — 먼저 온다. 수정본은 승인 전 변경분이 있을 때만 활성화. */}
      <button onClick={() => setView('승인본')} className={cn('px-3 py-1.5 text-[13px] font-semibold', view === '승인본' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted')}>승인본</button>
      <button disabled={!hasDraft} onClick={() => setView('수정본')} title={!hasDraft ? '승인되지 않은 수정본이 없습니다.' : undefined}
        className={cn('border-l px-3 py-1.5 text-[13px] font-semibold disabled:opacity-40', view === '수정본' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted')}>수정본</button>
    </div>
  );
}

function FilterSel({ label, value, onChange, opts }: { label: string; value: string; onChange: (v: string) => void; opts: [string, string][] }) {
  return <label className="flex items-center gap-2 text-[13px]"><span className="shrink-0 font-semibold text-muted-foreground">{label}</span><Select className="h-9 w-32" value={value} onChange={(e) => onChange(e.target.value)}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></label>;
}
function FilterActions({ onReset }: { onReset: () => void }) {
  return <div className="flex items-center gap-2"><button title="초기화" onClick={onReset} className="flex h-9 w-9 items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-muted"><RotateCcw className="h-4 w-4" /></button><Button size="sm" variant="primary" className="h-9 px-5"><Search className="h-4 w-4" /> 조회</Button></div>;
}

/* ------------------------------------------------------------------ */
/* 트리 행                                                             */
/* ------------------------------------------------------------------ */
/* 읽기 모드 트리 — 평면 들여쓰기 */
function TreeRow({ node, nodes, depth, view, expanded, selectedId, matchSet, hasFilter, kidsOf, onToggle, onSelect }: {
  node: MenuNode; nodes: MenuNode[]; depth: number; view: '수정본' | '승인본';
  expanded: Set<string>; selectedId: string | null; matchSet: Set<string>; hasFilter: boolean;
  kidsOf: (p: string | null) => MenuNode[]; onToggle: (id: string) => void; onSelect: (id: string) => void;
}) {
  const kids = kidsOf(node.id);
  const open = expanded.has(node.id);
  const isSel = node.id === selectedId;
  const dim = hasFilter && !matchSet.has(node.id);
  const val = view === '승인본' && node.approved ? node.approved : node.working;
  const isNewInApproved = view === '승인본' && node.approved === null;
  const badges = view === '수정본' ? badgesOf(node) : [];
  if (isNewInApproved) return null;
  return (
    <>
      <div className={cn('group flex items-center gap-1 rounded-md py-1.5 pr-2 text-sm cursor-pointer hover:bg-muted',
        isSel && 'bg-accent font-semibold text-accent-foreground', dim && 'opacity-40', !val.active && 'text-muted-foreground')}
        style={{ paddingLeft: 6 + depth * 16 }} onClick={() => onSelect(node.id)}>
        {kids.length > 0 ? <button className="shrink-0 text-muted-foreground" onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}>{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button> : <span className="w-4 shrink-0" />}
        <span className={cn('truncate', node.depth === 1 && 'font-semibold')}>{val.name || '(이름 없음)'}</span>
        {!val.active && <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-px text-[10px] font-medium text-slate-400 ring-1 ring-inset ring-slate-200">미사용</span>}
        <span className="ml-1 flex shrink-0 items-center gap-1">{badges.map((b) => <BadgeChip key={b} b={b} />)}</span>
      </div>
      {open && kids.map((k) => (
        <TreeRow key={k.id} node={k} nodes={nodes} depth={depth + 1} view={view} expanded={expanded} selectedId={selectedId} matchSet={matchSet} hasFilter={hasFilter} kidsOf={kidsOf} onToggle={onToggle} onSelect={onSelect} />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 편집 모드 트리 — 드래그 앤 드롭 + 그룹핑                            */
/*   형제 그룹마다 별도 DndContext → 2Depth가 3Depth 그룹으로 못 감    */
/* ------------------------------------------------------------------ */
type EditTreeProps = {
  parentId: string | null; depth: number; nodes: MenuNode[]; expanded: Set<string>; selectedId: string | null;
  kidsOf: (p: string | null) => MenuNode[]; onToggle: (id: string) => void; onSelect: (id: string) => void;
  onReorder: (parentId: string | null, ids: string[]) => void; onRevert: (id: string) => void;
};
function EditTree({ parentId, depth, nodes, expanded, selectedId, kidsOf, onToggle, onSelect, onReorder, onRevert }: EditTreeProps) {
  const sibs = kidsOf(parentId);
  const ids = sibs.map((n) => n.id);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id)), to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return; // 다른 그룹으로는 이동 불가
    onReorder(parentId, arrayMove(ids, from, to));
  };
  return (
    <DndContext id={`dnd-${parentId ?? 'root'}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className={cn('space-y-1.5', depth > 0 && 'ml-4 mt-1.5 rounded-lg border border-dashed border-border/70 bg-muted/20 p-1.5')}>
          {sibs.map((n) => (
            <EditRow key={n.id} node={n} depth={depth} expanded={expanded} selectedId={selectedId}
              kidsOf={kidsOf} onToggle={onToggle} onSelect={onSelect} onReorder={onReorder} onRevert={onRevert} nodes={nodes} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
function EditRow({ node, depth, expanded, selectedId, kidsOf, onToggle, onSelect, onReorder, onRevert, nodes }: Omit<EditTreeProps, 'parentId'> & { node: MenuNode }) {
  const kids = kidsOf(node.id);
  const open = expanded.has(node.id);
  const isSel = node.id === selectedId;
  const badges = badgesOf(node);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id });
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 20 : undefined };
  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div className={cn('flex items-center gap-1.5 rounded-lg border bg-card px-2 py-2 text-sm', isSel ? 'border-primary ring-1 ring-primary/30' : 'border-border', isDragging && 'shadow-md')}>
        <button className="shrink-0 cursor-grab touch-none text-slate-300 hover:text-slate-500 active:cursor-grabbing" aria-label="드래그하여 순서 변경" {...attributes} {...listeners}><GripVertical className="h-4 w-4" /></button>
        {kids.length > 0 ? <button className="shrink-0 text-muted-foreground" onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}>{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button> : <span className="w-4 shrink-0" />}
        <button className="min-w-0 flex-1 truncate text-left" onClick={() => onSelect(node.id)}>
          <span className={cn(node.depth === 1 && 'font-semibold', isNewNode(node) && 'text-muted-foreground')}>{node.working.name || '(이름 없음)'}</span>
          {!node.working.active && <span className="ml-1.5 rounded-md bg-slate-100 px-1.5 py-px text-[10px] font-medium text-slate-400 ring-1 ring-inset ring-slate-200">미사용</span>}
        </button>
        <span className="flex shrink-0 items-center gap-1">{badges.map((b) => <BadgeChip key={b} b={b} />)}</span>
        {hasChange(node) && <button className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-primary" title="이전 상태로 원복" onClick={(e) => { e.stopPropagation(); onRevert(node.id); }}><Undo2 className="h-3.5 w-3.5" /></button>}
      </div>
      {open && kids.length > 0 && (
        <EditTree parentId={node.id} depth={depth + 1} nodes={nodes} expanded={expanded} selectedId={selectedId}
          kidsOf={kidsOf} onToggle={onToggle} onSelect={onSelect} onReorder={onReorder} onRevert={onRevert} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 상세(읽기)                                                          */
/* ------------------------------------------------------------------ */
function DetailRead({ node, view, draft, rejectReason, reflectedAt, onEdit, onChannelUpdate, onBssApprove, onBssReject, onCancelRequest, onReason }: {
  node: MenuNode; view: '수정본' | '승인본'; draft: DraftState; rejectReason: string | null; reflectedAt: string;
  onEdit: () => void; onChannelUpdate: () => void; onBssApprove: () => void; onBssReject: () => void; onCancelRequest: () => void; onReason: () => void;
}) {
  const v = view === '승인본' && node.approved ? node.approved : node.working;
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b px-5 py-3.5">
        <span className="text-lg font-bold">{v.name || '(이름 없음)'}</span>
        <Badge variant="outline" className="text-[10px]">{node.code}</Badge>
        <span className="ml-auto text-xs text-muted-foreground">최종 반영일 : {reflectedAt}</span>
        <span className="text-xs text-muted-foreground">승인 상태</span><DraftChip s={draft} />
      </div>
      {draft === '승인반려' && rejectReason && (
        <button onClick={onReason} className="mx-5 mt-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-badge-bg-negative px-3 py-2 text-left text-xs font-semibold text-badge-text-negative hover:bg-badge-bg-negative/80">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> 반려 사유 : {rejectReason} · 자세히 보기
        </button>
      )}
      <div className="min-h-0 flex-1 overflow-auto p-5">
        <div className="rounded-lg border">
          <ReadRow label="메뉴명">{v.name}</ReadRow>
          <ReadRow label="메뉴 코드">{node.code}</ReadRow>
          {node.depth === 1 && <ReadRow label="메뉴 아이콘" tbd>{v.icon ? <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-muted"><ImageIcon className="h-4 w-4 text-muted-foreground" /></span> : <span className="text-muted-foreground">미설정</span>}</ReadRow>}
          <ReadRow label="연결 유형">{LINK_LABEL[v.linkKind]}</ReadRow>
          <ReadRow label="랜딩 URL / 컨테이너 ID">{v.linkKind === 'CONTAINER' ? (v.container || '—') : (v.url || '—')}{v.linkKind === 'CONTAINER' && v.container && !v.linkApproved && <Badge variant="warning" className="ml-2 text-[9px]">미승인 연결</Badge>}</ReadRow>
          <ReadRow label="사용 여부">{v.active ? '사용' : '미사용'}</ReadRow>
          <ReadRow label="운영 채널">{v.channels.join(' · ') || '—'}</ReadRow>
          <ReadRow label="OS" tbd>{v.os.join(' · ')}</ReadRow>
          <ReadRow label="로그인 조건">{LOGIN_LABEL[v.loginCond]}{v.easyLogin ? ' (간편로그인 포함)' : ''}</ReadRow>
          <ReadRow label="권한 조건" tbd>회원 등급: {v.grades.join('/')} / 회선: {v.lines.join('/')}</ReadRow>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t px-5 py-3.5">
        <Button size="sm" variant="tblue" onClick={onChannelUpdate}><RotateCcw className="h-4 w-4" /> 채널 즉시 업데이트</Button>
        {/* BSS 응답 모의 — 승인대기에서만 */}
        {draft === '승인대기' && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">BSS 응답(모의)</span>
            <Button size="sm" variant="outline" onClick={onBssApprove}><Check className="h-3.5 w-3.5" /> 승인</Button>
            <Button size="sm" variant="outline" onClick={onBssReject}>반려</Button>
          </div>
        )}
        <div className="ml-auto flex gap-2">
          {draft === '승인대기' && <Button size="sm" variant="outline" onClick={onCancelRequest}>승인 요청 취소</Button>}
          <Button size="sm" variant="primary" onClick={onEdit}>수정</Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 상세(편집)                                                          */
/* ------------------------------------------------------------------ */
function EditForm({ node, nodes, draft, changeCount, incompleteCount, onPatch, onRevert, onPickContainer, onCancel, onSaveDraft, onRequest }: {
  node: MenuNode; nodes: MenuNode[]; draft: DraftState; changeCount: number; incompleteCount: number;
  onPatch: (id: string, p: Partial<MenuValue>) => void; onRevert: (id: string) => void; onPickContainer: () => void;
  onCancel: () => void; onSaveDraft: () => void; onRequest: () => void;
}) {
  const w = node.working;
  const up = (p: Partial<MenuValue>) => onPatch(node.id, p);
  const toggle = <T,>(arr: T[], v: T): T[] => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const [dupMsg, setDupMsg] = useState<null | { ok: boolean; msg: string }>(w.nameChecked ? { ok: true, msg: '사용 가능한 메뉴명입니다.' } : null);
  const [urlMsg, setUrlMsg] = useState<null | { ok: boolean; msg: string }>(null);
  const issues = validateValue(w);

  const checkDup = () => {
    if (!w.name.trim()) return;
    const dup = nodes.some((n) => n.id !== node.id && n.working.name === w.name.trim());
    up({ nameChecked: !dup });
    setDupMsg({ ok: !dup, msg: dup ? '중복 사용 중인 메뉴명입니다. 변경 후 다시 확인해주세요.' : '사용 가능한 메뉴명입니다.' });
  };
  const verifyUrl = () => {
    const ok = /^https?:\/\/.+\..+/.test(w.url.trim()) || (w.linkKind === 'INTERNAL' && w.url.trim().startsWith('/'));
    up({ urlVerified: ok });
    setUrlMsg({ ok, msg: ok ? '연결 가능한 URL입니다.' : '연결 불가한 URL입니다. 수정 후 다시 확인해주세요.' });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b px-5 py-3.5">
        <span className="text-lg font-bold">메뉴 상세</span>
        <Badge variant="outline" className="text-[10px]">{node.code}</Badge>
        <span className="ml-1 flex items-center gap-1">{badgesOf(node).map((b) => <BadgeChip key={b} b={b} />)}</span>
        {hasChange(node) && <Button size="sm" variant="outline" className="ml-auto" onClick={() => onRevert(node.id)}><Undo2 className="h-3.5 w-3.5" /> 이전 상태로 원복</Button>}
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-auto px-5 py-4">
        <Section title="기본 정보">
          <Field label="메뉴명" req>
            <div className="flex gap-2">
              <Input value={w.name} placeholder="메뉴명을 입력해 주세요." className="h-9" onChange={(e) => { up({ name: e.target.value, nameChecked: false }); setDupMsg(null); }} />
              <Button size="sm" variant="outline" className="shrink-0" disabled={!w.name.trim()} onClick={checkDup}>중복 확인</Button>
            </div>
            {dupMsg && <p className={cn('mt-1 text-[11px] font-semibold', dupMsg.ok ? 'text-badge-text-success' : 'text-destructive')}>{dupMsg.msg}</p>}
          </Field>
          {node.depth === 1 && (
            <Field label={<>메뉴 아이콘 <Tbd /></>}>
              <button className={cn('flex h-14 w-14 items-center justify-center rounded-md border-2 border-dashed', w.icon ? 'border-primary bg-accent' : 'border-input bg-muted/40')} onClick={() => up({ icon: !w.icon })}>{w.icon ? <ImageIcon className="h-5 w-5 text-primary" /> : <Plus className="h-4 w-4 text-muted-foreground" />}</button>
            </Field>
          )}
        </Section>

        <Section title="연결 설정">
          <Field label="연결 유형" req>
            <div className="flex flex-col gap-1.5">
              {([['CONTAINER', '승인 컨테이너'], ['INTERNAL', '내부 랜딩 URL'], ['EXTERNAL', '외부 랜딩 URL']] as [LinkKind, string][]).map(([k, l]) => (
                <label key={k} className="flex items-center gap-1.5 text-sm"><input type="radio" className="accent-primary" checked={w.linkKind === k} onChange={() => { up({ linkKind: k, urlVerified: false }); setUrlMsg(null); }} />{l}</label>
              ))}
            </div>
          </Field>
          {w.linkKind === 'CONTAINER' ? (
            <Field label="컨테이너 명 / ID" req>
              <div className="flex gap-2"><Input readOnly value={w.container} placeholder="불러오기 버튼을 선택하세요." className="h-9 bg-muted/40" /><Button size="sm" variant="outline" className="shrink-0" onClick={onPickContainer}>불러오기</Button></div>
              {w.container && !w.linkApproved && <p className="mt-1 text-[11px] font-semibold text-destructive">미승인 컨테이너입니다 (게시 불가).</p>}
            </Field>
          ) : (
            <Field label="랜딩 URL" req>
              <div className="flex gap-2"><Input value={w.url} placeholder="연결 URL 링크를 입력하세요." className="h-9" onChange={(e) => { up({ url: e.target.value, urlVerified: false }); setUrlMsg(null); }} /><Button size="sm" variant="outline" className="shrink-0" disabled={!w.url.trim()} onClick={verifyUrl}>URL 검증</Button></div>
              {urlMsg && <p className={cn('mt-1 text-[11px] font-semibold', urlMsg.ok ? 'text-badge-text-success' : 'text-destructive')}>{urlMsg.msg}</p>}
            </Field>
          )}
        </Section>

        <Section title="노출 설정">
          <Field label="사용 여부" req>
            <div className="flex gap-4">{[[true, '사용'], [false, '미사용']].map(([v, l]) => <label key={String(v)} className="flex items-center gap-1.5 text-sm"><input type="radio" className="accent-primary" checked={w.active === v} onChange={() => up({ active: v as boolean })} />{l as string}</label>)}</div>
          </Field>
          <Field label="운영 채널" req>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-1.5 text-sm"><Checkbox checked={w.channels.length === 2} onChange={(e) => up({ channels: e.target.checked ? ['PC', 'APP'] : [] })} /> 전체</label>
              {(['PC', 'APP'] as Channel[]).map((c) => <label key={c} className="flex items-center gap-1.5 text-sm"><Checkbox checked={w.channels.includes(c)} disabled={!w.active} onChange={() => up({ channels: toggle(w.channels, c) })} /> {c}</label>)}
            </div>
          </Field>
          <Field label={<>OS <Tbd /></>}>
            <div className="flex flex-wrap gap-4">{OS_OPTS.map((o) => <label key={o} className="flex items-center gap-1.5 text-sm text-muted-foreground"><Checkbox checked={w.os.includes(o)} onChange={() => up({ os: o === '전체' ? ['전체'] : toggle(w.os.filter((x) => x !== '전체'), o) })} /> {o}</label>)}</div>
          </Field>
        </Section>

        <Section title="권한 조건 설정">
          <Field label="로그인 조건" req>
            <div className="flex gap-4">{([['ALL', '전체 노출'], ['LOGIN', '로그인 시 노출']] as ['ALL' | 'LOGIN', string][]).map(([v, l]) => <label key={v} className="flex items-center gap-1.5 text-sm"><input type="radio" className="accent-primary" checked={w.loginCond === v} onChange={() => up({ loginCond: v })} />{l}</label>)}</div>
            <label className="mt-2 flex items-center gap-1.5 rounded-md bg-accent/40 px-2 py-1.5 text-sm text-muted-foreground"><Checkbox checked={w.easyLogin} onChange={(e) => up({ easyLogin: e.target.checked })} /> 간편 로그인 포함 <Tbd /></label>
          </Field>
          <Field label={<>회원 등급 <Tbd /></>}><div className="flex flex-wrap gap-3">{GRADES.map((g) => <label key={g} className="flex items-center gap-1.5 text-sm text-muted-foreground"><Checkbox checked={w.grades.includes(g)} onChange={() => up({ grades: g === '전체' ? ['전체'] : toggle(w.grades.filter((x) => x !== '전체'), g) })} /> {g}</label>)}</div></Field>
          <Field label={<>회선 조건 <Tbd /></>}><div className="flex flex-wrap gap-x-3 gap-y-1.5">{LINES.map((l) => <label key={l} className="flex items-center gap-1.5 text-[13px] text-muted-foreground"><Checkbox checked={w.lines.includes(l)} onChange={() => up({ lines: l === '전체' ? ['전체'] : toggle(w.lines.filter((x) => x !== '전체'), l) })} /> {l}</label>)}</div></Field>
        </Section>

        {issues.length > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
            <b>변경 미완료</b> — {issues.join(' · ')}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t px-5 py-3.5">
        <span className="text-[12px] text-muted-foreground">변경 <b className="text-foreground">{changeCount}</b>건{incompleteCount > 0 && <b className="text-destructive"> / 미완료 {incompleteCount}건</b>}</span>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={onCancel}>취소</Button>
          <Button size="sm" variant="outline" onClick={onSaveDraft}>임시 저장</Button>
          <Button size="sm" variant="primary" onClick={onRequest}>승인 요청</Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 메뉴 등록 팝업 (1-1)                                                */
/* ------------------------------------------------------------------ */
function AddMenuModal({ nodes, onClose, onAdd }: { nodes: MenuNode[]; onClose: () => void; onAdd: (depth: 1 | 2 | 3, parentId: string | null) => void }) {
  const [depth, setDepth] = useState<1 | 2 | 3>(3);
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const d1 = nodes.filter((n) => n.depth === 1);
  const d2 = nodes.filter((n) => n.depth === 2 && n.parentId === p1);
  const ok = depth === 1 || (depth === 2 && p1) || (depth === 3 && p1 && p2);
  const submit = () => {
    const parentId = depth === 1 ? null : depth === 2 ? p1 : p2;
    onAdd(depth, parentId);
  };
  return (
    <Modal title="메뉴 등록" onClose={onClose} footer={<><Button size="sm" variant="outline" onClick={onClose}>취소</Button><Button size="sm" variant="primary" disabled={!ok} onClick={submit}>확인</Button></>}>
      <div className="space-y-4">
        <div className="flex gap-4">{[1, 2, 3].map((d) => <label key={d} className="flex items-center gap-1.5 text-sm"><input type="radio" className="accent-primary" checked={depth === d} onChange={() => setDepth(d as 1 | 2 | 3)} />{d} Depth</label>)}</div>
        {depth >= 2 && <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">1 Depth 선택 *</label><Select className="h-9" value={p1} onChange={(e) => { setP1(e.target.value); setP2(''); }}><option value="">1 Depth 선택</option>{d1.map((n) => <option key={n.id} value={n.id}>{n.working.name}</option>)}</Select></div>}
        {depth === 3 && <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">2 Depth 선택 *</label><Select className="h-9" value={p2} onChange={(e) => setP2(e.target.value)} disabled={!p1}><option value="">2 Depth 선택</option>{d2.map((n) => <option key={n.id} value={n.id}>{n.working.name}</option>)}</Select></div>}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* 컨테이너 불러오기 (SB 4)                                            */
/* ------------------------------------------------------------------ */
function ContainerPicker({ onClose, onPick }: { onClose: () => void; onPick: (c: (typeof CONTAINERS)[number]) => void }) {
  const [sel, setSel] = useState<number | null>(null);
  const [kw, setKw] = useState('');
  const rows = CONTAINERS.filter((c) => !kw || c.name.includes(kw) || c.id.includes(kw));
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3.5"><h3 className="text-sm font-bold">승인 컨테이너 불러오기</h3><button className="text-muted-foreground hover:text-foreground" onClick={onClose}><X className="h-4 w-4" /></button></div>
        <div className="flex items-center gap-2 border-b px-5 py-3"><span className="text-[13px] font-semibold text-muted-foreground">검색어</span><Input className="h-9" placeholder="컨테이너 명, 컨테이너 ID를 검색하세요" value={kw} onChange={(e) => setKw(e.target.value)} /></div>
        <div className="min-h-0 flex-1 overflow-auto px-5 py-3">
          <table className="w-full text-xs">
            <thead><tr className="border-b bg-muted/60 text-left text-muted-foreground"><th className="px-2 py-2"></th><th className="px-2 py-2 font-semibold">컨테이너명</th><th className="px-2 py-2 font-semibold">컨테이너 ID</th><th className="px-2 py-2 font-semibold">전시 기간</th><th className="px-2 py-2 font-semibold">전시여부</th></tr></thead>
            <tbody>{rows.map((c, i) => (
              <tr key={i} className={cn('border-b last:border-0', c.on ? 'cursor-pointer hover:bg-muted' : 'opacity-40', sel === i && 'bg-accent')} onClick={() => c.on && setSel(i)}>
                <td className="px-2 py-2"><input type="radio" className="accent-primary" checked={sel === i} readOnly disabled={!c.on} /></td>
                <td className="px-2 py-2 font-semibold">{c.name}</td><td className="px-2 py-2 font-mono text-[11px] text-muted-foreground">{c.id}</td><td className="px-2 py-2 text-muted-foreground">{c.period}</td>
                <td className="px-2 py-2"><Badge variant={c.on ? 'success' : 'neutral'}>{c.on ? '전시' : '미전시'}</Badge></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div className="flex justify-end gap-2 border-t bg-muted/40 px-5 py-3"><Button size="sm" variant="outline" onClick={onClose}>취소</Button><Button size="sm" variant="primary" disabled={sel === null} onClick={() => sel !== null && onPick(rows[sel])}>선택 완료</Button></div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 운영 이력 탭 (SB 5)                                                 */
/* ------------------------------------------------------------------ */
function HistoryTab({ history, draft, onApprove, onReject, onCancel, onDiff, onReason }: {
  history: HistoryEntry[]; draft: DraftState; onApprove: () => void; onReject: () => void; onCancel: () => void;
  onDiff: (e: HistoryEntry) => void; onReason: (r: string | null) => void;
}) {
  const resultTone = (r: ApprovalResult | string) => /승인완료/.test(r) ? 'success' : /승인대기/.test(r) ? 'warning' : /승인반려/.test(r) ? 'negative' : 'neutral';
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-5 py-4">
        <span className="text-[13px] font-semibold text-muted-foreground">변경 일자</span>
        <Input type="date" className="h-9 w-40" defaultValue="2026-08-01" /><span className="text-muted-foreground">~</span><Input type="date" className="h-9 w-40" defaultValue="2026-08-25" />
        <span className="ml-2 text-[13px] font-semibold text-muted-foreground">검색어</span>
        <div className="relative min-w-[220px] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="h-9 pl-9" placeholder="요청자 명, P사번을 검색하세요." /></div>
        <button className="flex h-9 w-9 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted"><RotateCcw className="h-4 w-4" /></button>
        <Button size="sm" variant="primary" className="h-9 px-5"><Search className="h-4 w-4" /> 조회</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[900px] text-xs">
          <thead><tr className="border-b bg-muted/60 text-left text-muted-foreground">
            {['구분', '요청자', '요청/저장 일시', '승인자', '승인여부', '승인/반려 처리 일시', '취소/반려 사유', '변경사항', '버전', ''].map((h) => <th key={h} className="whitespace-nowrap px-3 py-2.5 font-semibold">{h}</th>)}
          </tr></thead>
          <tbody>{history.map((h, i) => {
            const pending = h.result === '승인대기' && i === 0;
            return (
              <tr key={h.id} className="border-b last:border-0 align-top">
                <td className="whitespace-nowrap px-3 py-2.5 font-medium">{h.kind}</td>
                <td className="whitespace-nowrap px-3 py-2.5">{h.requester}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{h.requestedAt}</td>
                <td className="whitespace-nowrap px-3 py-2.5">{h.approver ?? '-'}</td>
                <td className="whitespace-nowrap px-3 py-2.5"><Badge variant={resultTone(h.result) as any}>{h.result}</Badge></td>
                <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{h.processedAt ?? '-'}</td>
                <td className="whitespace-nowrap px-3 py-2.5">{h.reason ? <Button size="sm" variant="outline" onClick={() => onReason(h.reason)}>{h.kind === '취소요청' ? '취소 사유' : '반려 사유'}</Button> : '-'}</td>
                <td className="whitespace-nowrap px-3 py-2.5">{h.kind === '임시저장' && i !== 0 ? '-' : <Button size="sm" variant="outline" onClick={() => onDiff(h)}>변경사항</Button>}</td>
                <td className="whitespace-nowrap px-3 py-2.5">{h.version ? `v.${h.version}` : '-'}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right">
                  {pending ? (
                    <span className="flex gap-1">
                      <Button size="sm" variant="primary" onClick={onApprove}>승인</Button>
                      <Button size="sm" variant="outline" onClick={onReject}>반려</Button>
                      <Button size="sm" variant="outline" onClick={onCancel}>승인 요청 취소</Button>
                    </span>
                  ) : '-'}
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 변경사항 팝업 (SB 5b)                                               */
/* ------------------------------------------------------------------ */
function ChangeDiffModal({ entry, nodes, onClose }: { entry: HistoryEntry; nodes: MenuNode[]; onClose: () => void }) {
  const info = nodes.filter((n) => infoChanged(n));
  const order = nodes.filter((n) => orderChanged(n));
  const add = nodes.filter((n) => isNewNode(n));
  const rawTabs: [string, number][] = [['정보 변경', info.length], ['순서 변경', order.length], ['신규 등록', add.length]];
  const tabs = rawTabs.filter(([, n]) => n > 0);
  const [tab, setTab] = useState(tabs[0]?.[0] ?? '정보 변경');
  const pathOf = (n: MenuNode): string => { const chain: string[] = []; let cur: MenuNode | undefined = n; while (cur) { chain.unshift(cur.working.name); cur = cur.parentId ? nodes.find((x) => x.id === cur!.parentId) : undefined; } return chain.join(' > '); };

  return (
    <Modal title="변경사항 보기" onClose={onClose} wide footer={<Button size="sm" variant="outline" onClick={onClose}>닫기</Button>}>
      <div className="mb-3 rounded-lg border">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 p-3 text-[12px]">
          <div><span className="text-muted-foreground">구분</span> <b className="ml-1">{entry.kind}</b></div>
          <div><span className="text-muted-foreground">변경 사항</span> <b className="ml-1">{entry.summary.info + entry.summary.order + entry.summary.add}건</b> <span className="text-muted-foreground">(메뉴등록 {entry.summary.add} / 정보변경 {entry.summary.info} / 순서변경 {entry.summary.order})</span></div>
          <div><span className="text-muted-foreground">요청자</span> <b className="ml-1">{entry.requester}</b></div>
          <div><span className="text-muted-foreground">요청 일시</span> <b className="ml-1">{entry.requestedAt}</b></div>
          <div><span className="text-muted-foreground">승인자</span> <b className="ml-1">{entry.approver ?? '-'}</b></div>
          <div><span className="text-muted-foreground">처리 일시</span> <b className="ml-1">{entry.processedAt ?? '-'} {entry.processedAt && `(${entry.result})`}</b></div>
        </div>
      </div>

      {tabs.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">이 이력 시점의 변경 내역이 없습니다.</p> : (
        <>
          <div className="mb-3 flex gap-4 border-b">
            {tabs.map(([t, n]) => <button key={t} onClick={() => setTab(t)} className={cn('flex items-center gap-1 border-b-2 py-2 text-[13px] font-semibold', tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>{t} <span className="rounded-full bg-muted px-1.5 text-[10px]">{n}</span></button>)}
          </div>

          {tab === '정보 변경' && (
            <div className="space-y-3">{info.map((n) => (
              <div key={n.id} className="overflow-hidden rounded-lg border">
                <div className="border-b bg-muted/40 px-3 py-2 text-[12px] font-semibold">{pathOf(n)}</div>
                <div className="grid grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)] bg-muted/30 text-[11px] font-semibold text-muted-foreground"><div className="px-3 py-1.5">항목 명</div><div className="px-3 py-1.5">변경 전</div><div className="px-3 py-1.5">변경 후</div></div>
                {infoDiffRows(n).map((r) => <div key={r.field} className="grid grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)] border-t text-[12px]"><div className="px-3 py-1.5 font-semibold text-muted-foreground">{r.field}</div><div className="px-3 py-1.5 text-badge-text-negative line-through">{r.before}</div><div className="px-3 py-1.5 font-semibold">{r.after}</div></div>)}
              </div>
            ))}</div>
          )}
          {tab === '순서 변경' && (
            <div className="overflow-hidden rounded-lg border">
              <div className="grid grid-cols-[minmax(0,1fr)_120px_120px] bg-muted/30 text-[11px] font-semibold text-muted-foreground"><div className="px-3 py-1.5">메뉴명</div><div className="px-3 py-1.5">변경 전 순서</div><div className="px-3 py-1.5">변경 후 순서</div></div>
              {order.map((n) => <div key={n.id} className="grid grid-cols-[minmax(0,1fr)_120px_120px] border-t text-[12px]"><div className="px-3 py-1.5">{pathOf(n)}</div><div className="px-3 py-1.5 text-muted-foreground">{n.approvedOrder}</div><div className="px-3 py-1.5 font-semibold">{n.order}</div></div>)}
            </div>
          )}
          {tab === '신규 등록' && (
            <div className="space-y-3">{add.map((n) => (
              <div key={n.id} className="overflow-hidden rounded-lg border">
                <div className="border-b bg-muted/40 px-3 py-2 text-[12px] font-semibold">{pathOf(n)}</div>
                <div className="divide-y text-[12px]">
                  {[['메뉴명', n.working.name], ['메뉴 코드', n.code], ['연결', linkText(n.working)], ['사용 여부', n.working.active ? '사용' : '미사용'], ['운영 채널', n.working.channels.join('·') || '-'], ['로그인 조건', LOGIN_LABEL[n.working.loginCond]]].map(([k, v]) => <div key={k} className="grid grid-cols-[120px_minmax(0,1fr)] px-3 py-1.5"><span className="font-semibold text-muted-foreground">{k}</span><span>{v}</span></div>)}
                </div>
              </div>
            ))}</div>
          )}
        </>
      )}
    </Modal>
  );
}
