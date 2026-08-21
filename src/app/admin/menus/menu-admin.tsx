'use client';

import { useMemo, useState } from 'react';
import {
  ChevronDown, ChevronRight, ChevronUp, AlertTriangle, GripVertical,
  Eye, RotateCcw, Plus, Search, X, Check, Image as ImageIcon, ListChecks,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { PreviewOverlay } from './preview-overlay';
import {
  seedMenus, diffOf, STATUS_LABEL, STATUS_DESC, LOGIN_LABEL,
  type MenuNode, type MenuStatus, type Channel, type LinkType,
} from './mock-menus';

/* ------------------------------------------------------------------ */
/* 상수 · 공통 프리미티브                                              */
/* ------------------------------------------------------------------ */

// 승인 컨테이너 불러오기 카탈로그 (SB 6-1)
const CONTAINERS = [
  { id: '0sxl75swte1', name: '혜택', period: '상시', on: true },
  { id: '0sxl75swte1', name: 'Shop', period: '상시', on: true },
  { id: '0sxl75swte2', name: 'MY', period: '상시', on: true },
  { id: '0sxl75swte2', name: 'VIP Pick', period: '상시', on: false },
  { id: '0sxl75swte2', name: 'VIP Pick', period: '2026.07.28 ~ 2026.07.28', on: true },
  { id: '0sxl75swte3', name: '고객지원', period: '상시', on: true },
] as const;

const GRADES = ['전체', 'VIP', 'GOLD', 'SILVER'] as const;
const LINES = ['전체', '통화내역', '모바일', 'SKT법인', '법인실사용자', 'PPS', '유선서비스', '준회원(회선없음)'] as const;
const OS_OPTS = ['전체', 'Android', 'iOS'] as const;

function stamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// 승인 상태 칩 — 점(dot) + 라벨, 소프트 톤. (디자인 정돈)
const STATUS_TONE: Record<MenuStatus, { chip: string; dot: string }> = {
  DRAFT: { chip: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
  REVIEW: { chip: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  APPROVED: { chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  REJECTED: { chip: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
  CANCELED: { chip: 'bg-slate-100 text-slate-500 ring-slate-200', dot: 'bg-slate-300' },
};
function StatusChip({ s, size = 'md' }: { s: MenuStatus; size?: 'sm' | 'md' }) {
  const t = STATUS_TONE[s];
  return (
    <span title={`${STATUS_LABEL[s]} — ${STATUS_DESC[s]}`}
      className={cn('inline-flex items-center gap-1 rounded-full font-medium ring-1 ring-inset', t.chip,
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]')}>
      <span className={cn('h-1.5 w-1.5 rounded-full', t.dot)} />
      {STATUS_LABEL[s]}
    </span>
  );
}

// 승인본 대비 변경 태그 — 얇고 소프트하게. 기준: 현재 작업본 값 vs 마지막 승인본 스냅샷(diffOf).
const DIFF_TONE: Record<string, string> = {
  추가: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  순서변경: 'bg-sky-50 text-sky-600 ring-sky-100',
  명칭변경: 'bg-violet-50 text-violet-600 ring-violet-100',
  노출변경: 'bg-amber-50 text-amber-700 ring-amber-100',
  연결변경: 'bg-amber-50 text-amber-700 ring-amber-100',
  조건변경: 'bg-amber-50 text-amber-700 ring-amber-100',
};
const DIFF_DESC: Record<string, string> = {
  추가: '승인된 적 없는 신규 노출',
  순서변경: '승인본 대비 정렬 순서 변경',
  명칭변경: '승인본 대비 메뉴명 변경',
  노출변경: '승인본 대비 사용 여부 변경',
  연결변경: '승인본 대비 연결 대상 변경',
  조건변경: '승인본 대비 노출 조건 변경',
};
function DiffTag({ d }: { d: string }) {
  return <span title={DIFF_DESC[d] ?? '승인본 대비 변경'}
    className={cn('inline-flex items-center rounded-md px-1.5 py-px text-[10px] font-medium ring-1 ring-inset', DIFF_TONE[d] ?? 'bg-slate-50 text-slate-500 ring-slate-100')}>{d}</span>;
}

function UnusedTag() {
  return <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-px text-[10px] font-medium text-slate-400 ring-1 ring-inset ring-slate-200">미사용</span>;
}

/** TBD 표기 — 정책 미확정 항목 (SB 다수 TBD) */
function Tbd() {
  return <span className="ml-1 inline-flex items-center rounded bg-amber-50 px-1 py-px text-[9px] font-semibold text-amber-600 ring-1 ring-inset ring-amber-200">TBD</span>;
}

function Modal({
  title, children, onClose, footer, wide,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className={cn('flex max-h-[86vh] w-full flex-col overflow-hidden rounded-xl bg-card shadow-2xl', wide ? 'max-w-2xl' : 'max-w-md')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <h3 className="text-sm font-bold">{title}</h3>
          <button className="text-muted-foreground hover:text-foreground" onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-5 py-4 text-sm">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t bg-muted/40 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/** 간단 안내 alert (SB의 확인용 얼럿) */
function Alert({ title, body, onClose, onConfirm, confirmText = '확인', danger }: {
  title: string; body?: React.ReactNode; onClose: () => void; onConfirm?: () => void; confirmText?: string; danger?: boolean;
}) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          {onConfirm && <Button size="sm" variant="outline" onClick={onClose}>취소</Button>}
          <Button size="sm" variant={danger ? 'destructive' : 'primary'} onClick={() => { onConfirm?.(); onClose(); }}>{confirmText}</Button>
        </>
      }
    >
      {body && <p className="text-sm text-muted-foreground">{body}</p>}
    </Modal>
  );
}

const Field = ({ label, req, children, hint }: { label: React.ReactNode; req?: boolean; children: React.ReactNode; hint?: string }) => (
  <div className="grid grid-cols-[110px_minmax(0,1fr)] items-start gap-3 py-2">
    <label className="pt-2 text-[13px] font-semibold text-muted-foreground">
      {label}{req && <span className="text-destructive"> *</span>}
    </label>
    <div className="min-w-0">
      {children}
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  </div>
);

/** 상세 읽기 전용 행 */
const ReadRow = ({ label, children, tbd }: { label: React.ReactNode; children: React.ReactNode; tbd?: boolean }) => (
  <div className={cn('grid grid-cols-[130px_minmax(0,1fr)] gap-3 border-b px-3 py-2.5 text-sm last:border-0', tbd && 'bg-accent/40')}>
    <span className="font-semibold text-muted-foreground">{label}{tbd && <Tbd />}</span>
    <span className="min-w-0 break-words">{children}</span>
  </div>
);

/* ------------------------------------------------------------------ */
/* 등록/편집 패널 폼 타입                                              */
/* ------------------------------------------------------------------ */

type LinkKind = 'CONTAINER' | 'INTERNAL' | 'EXTERNAL';
type PanelForm = {
  mode: 'create' | 'edit';
  editId?: string;
  depth: 1 | 2 | 3;
  parentName: string;
  name: string;
  nameChecked: boolean;
  hasIcon: boolean;
  linkKind: LinkKind;
  container: string;
  url: string;
  urlVerified: boolean;
  active: boolean;
  channels: Channel[];
  os: string[];
  loginCond: 'ALL' | 'LOGIN';
  easyLogin: boolean;
  grades: string[];
  lines: string[];
};

function blankForm(mode: 'create' | 'edit'): PanelForm {
  return {
    mode, depth: 3, parentName: '', name: '', nameChecked: false, hasIcon: false,
    linkKind: 'CONTAINER', container: '', url: '', urlVerified: false,
    active: true, channels: ['PC', 'APP'], os: ['전체'], loginCond: 'ALL', easyLogin: true,
    grades: ['전체'], lines: ['전체'],
  };
}

/* ------------------------------------------------------------------ */
/* 메인                                                                */
/* ------------------------------------------------------------------ */

export function MenuAdmin() {
  const [nodes, setNodes] = useState<MenuNode[]>(() => seedMenus());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<'basic' | 'history'>('basic');

  // 검색/필터 (SB 1)
  const [searchField, setSearchField] = useState<'메뉴명' | '메뉴 코드' | '연결값'>('메뉴명');
  const [q, setQ] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [fUse, setFUse] = useState<'ALL' | 'USE' | 'UNUSE'>('ALL');
  const [fChannel, setFChannel] = useState<'ALL' | 'PC' | 'APP'>('ALL'); // 운영 채널
  const [fLogin, setFLogin] = useState<'ALL' | 'ALLSHOW' | 'LOGIN'>('ALL'); // 로그인 조건
  const [fStatus, setFStatus] = useState<'ALL' | MenuStatus>('ALL');

  const [expanded, setExpanded] = useState<Set<string>>(new Set(['m-benefit', 'm-benefit-membership']));

  // 순서 수정 모드 (SB 07)
  const [reorder, setReorder] = useState(false);
  const [reorderDraft, setReorderDraft] = useState<MenuNode[] | null>(null);

  // 등록/편집 패널
  const [panel, setPanel] = useState<PanelForm | null>(null);

  // 미리보기
  const [preview, setPreview] = useState(false);

  // 얼럿/모달 상태
  const [alert, setAlert] = useState<null | { kind: string; payload?: any }>(null);
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const activeNodes = reorder && reorderDraft ? reorderDraft : nodes;
  const selected = activeNodes.find((n) => n.id === selectedId) ?? null;

  /* ---------- 검색/필터 매칭 (SB 1: 일치 하이라이트 + 상위 자동 펼침 + 미일치 Dim) ---------- */
  const matchSet = useMemo(() => {
    const s = new Set<string>();
    const term = q.trim().toLowerCase();
    for (const n of nodes) {
      let ok = true;
      if (term) {
        const hay =
          searchField === '메뉴명' ? n.name : searchField === '메뉴 코드' ? n.code : (n.linkTarget ?? '');
        ok = hay.toLowerCase().includes(term);
      }
      if (ok && fUse !== 'ALL') ok = fUse === 'USE' ? n.active : !n.active;
      if (ok && fChannel !== 'ALL') ok = n.channels.includes(fChannel);
      if (ok && fLogin !== 'ALL') ok = fLogin === 'LOGIN' ? n.loginCond === 'LOGIN' : n.loginCond === 'ALL';
      if (ok && fStatus !== 'ALL') ok = n.status === fStatus;
      if (ok) s.add(n.id);
    }
    return s;
  }, [nodes, q, searchField, fUse, fChannel, fLogin, fStatus]);

  const hasFilter = q.trim() !== '' || fUse !== 'ALL' || fChannel !== 'ALL' || fLogin !== 'ALL' || fStatus !== 'ALL';

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const ancestorsExpanded = useMemo(() => {
    if (!hasFilter) return expanded;
    const s = new Set(expanded);
    for (const id of matchSet) {
      let p = byId.get(id)?.parentId ?? null;
      while (p) { s.add(p); p = byId.get(p)?.parentId ?? null; }
    }
    return s;
  }, [expanded, matchSet, hasFilter, byId]);

  const childrenOf = (parentId: string | null, list: MenuNode[]) =>
    list.filter((n) => n.parentId === parentId).sort((a, b) => a.order - b.order);

  const resetFilters = () => {
    setQ(''); setFUse('ALL'); setFChannel('ALL'); setFLogin('ALL'); setFStatus('ALL');
  };

  /* ---------- 트리 조작 ---------- */
  const toggleExpand = (id: string) =>
    setExpanded((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const expandAll = () => setExpanded(new Set(nodes.filter((n) => childrenOf(n.id, nodes).length).map((n) => n.id)));
  const collapseAll = () => setExpanded(new Set());

  const selectNode = (id: string) => {
    if (reorder) return;
    setSelectedId(id);
    setTab('basic');
    // 하위 뎁스 자동 펼침 (SB 2)
    setExpanded((prev) => new Set(prev).add(id));
  };

  /* ---------- 순서 수정 (형제 그룹 내 이동만 — 같은 Depth) ---------- */
  const startReorder = () => { setReorderDraft(nodes.map((n) => ({ ...n }))); setReorder(true); };
  const cancelReorder = () => setAlert({ kind: 'reorder-cancel' });
  const doCancelReorder = () => { setReorder(false); setReorderDraft(null); };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // 형제 그룹의 새 정렬을 draft에 반영 (▲▼ 버튼과 DnD 공용)
  const applyReorder = (parentId: string | null, orderedIds: string[]) => {
    if (!reorderDraft) return;
    const orderMap = new Map(orderedIds.map((id, i) => [id, i + 1]));
    setReorderDraft(reorderDraft.map((n) => (n.parentId === parentId && orderMap.has(n.id) ? { ...n, order: orderMap.get(n.id)! } : n)));
  };

  // 드래그 앤 드롭 — 같은 Depth(같은 상위) 안에서만 이동 (SB 07 / PI-DSP-MNU-001)
  const onDragEnd = (e: DragEndEvent) => {
    if (!reorderDraft) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const a = reorderDraft.find((n) => n.id === active.id);
    const b = reorderDraft.find((n) => n.id === over.id);
    if (!a || !b || a.parentId !== b.parentId) return; // 다른 Depth로는 이동 불가
    const sibs = childrenOf(a.parentId, reorderDraft);
    const ids = sibs.map((n) => n.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    applyReorder(a.parentId, ids);
  };

  // 순서 변경분(형제 그룹 세트) → 승인요청 1건 (확정된 정책 해석)
  const reorderChanges = useMemo(() => {
    if (!reorderDraft) return [];
    return reorderDraft.filter((d) => {
      const o = nodes.find((n) => n.id === d.id);
      return o && o.order !== d.order;
    });
  }, [reorderDraft, nodes]);

  const submitReorder = () => {
    if (!reorderDraft || reorderChanges.length === 0) { flash('변경된 순서가 없습니다.'); return; }
    setAlert({ kind: 'reorder-submit' });
  };
  const doSubmitReorder = () => {
    if (!reorderDraft) return;
    const changedIds = new Set(reorderChanges.map((n) => n.id));
    const groups = Array.from(new Set(reorderChanges.map((n) => n.parentId ?? 'root')));
    const now = stamp();
    setNodes(reorderDraft.map((n) => {
      if (!changedIds.has(n.id)) return n;
      const o = nodes.find((x) => x.id === n.id)!;
      return {
        ...n,
        status: 'REVIEW' as MenuStatus,
        changeReason: '메뉴 정렬 순서 변경',
        updatedAt: now,
        history: [
          { at: now, actor: 'P213980', field: '정렬 순서', before: String(o.order), after: String(n.order),
            reason: `정렬 순서 변경 (형제 그룹 세트 ${changedIds.size}건)`, approver: null, result: '승인요청' },
          ...n.history,
        ],
      };
    }));
    setReorder(false); setReorderDraft(null);
    flash(`순서 변경 승인요청 완료 — 형제 그룹 ${groups.length}곳 · ${changedIds.size}건을 한 건으로 BSS에 전송했습니다.`);
  };

  /* ---------- 편집/등록 패널 열기 ---------- */
  const openCreate = () => setPanel(blankForm('create'));
  const openEdit = (n: MenuNode) => {
    setPanel({
      mode: 'edit', editId: n.id, depth: n.depth, parentName: byId.get(n.parentId ?? '')?.name ?? '',
      name: n.name, nameChecked: true, hasIcon: !!n.icon,
      linkKind: (n.linkType ?? 'CONTAINER') as LinkKind,
      container: n.linkType === 'CONTAINER' ? (n.linkTarget ?? '') : '',
      url: n.linkType !== 'CONTAINER' ? (n.linkTarget ?? '') : '', urlVerified: true,
      active: n.active, channels: [...n.channels], os: ['전체'],
      loginCond: n.loginCond, easyLogin: true, grades: ['전체'], lines: ['전체'],
    });
  };

  /* ---------- 상세 액션: 요청취소 / 롤백 / BSS 모의 ---------- */
  const patch = (id: string, up: Partial<MenuNode>, hist?: MenuNode['history'][number]) =>
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...up, history: hist ? [hist, ...n.history] : n.history } : n)));

  const cancelRequest = (n: MenuNode) => {
    const now = stamp();
    patch(n.id, { status: 'CANCELED', updatedAt: now },
      { at: now, actor: 'P213980', field: '승인 요청', before: '승인요청', after: '요청취소', reason: '요청자 철회', approver: null, result: '요청취소' });
    flash('승인 요청을 철회했습니다.');
  };
  const bssApprove = (n: MenuNode) => {
    const now = stamp();
    patch(n.id, { status: 'APPROVED', updatedAt: now, approved: snapOf(n) },
      { at: now, actor: 'BSS', field: '검수', before: '승인요청', after: '승인완료', reason: n.changeReason ?? '-', approver: 'BSS 검수자', result: '승인완료' });
    flash('BSS 승인 완료(모의). FO 반영 버튼으로 캐시에 반영할 수 있습니다.');
  };
  const bssReject = (n: MenuNode) => {
    const now = stamp();
    patch(n.id, { status: 'REJECTED', updatedAt: now, rejectReason: '정책 미협의 — 반려(모의)' },
      { at: now, actor: 'BSS', field: '검수', before: '승인요청', after: '반려', reason: '정책 미협의 — 반려(모의)', approver: 'BSS 검수자', result: '반려' });
    flash('BSS 반려(모의).');
  };

  /* ---------- FO 반영 (캐시 갱신) ---------- */
  const approvedCount = nodes.filter((n) => n.status === 'APPROVED' && diffOf(n).length > 0).length;

  /* ---------- 승인 요청 현황 — 변경 요청(change set)을 묶음으로 ---------- */
  const [reviewOpen, setReviewOpen] = useState(false);
  const pendingSets = useMemo(() => {
    const pending = nodes.filter((n) => n.status === 'REVIEW');
    const orderGroups = new Map<string, MenuNode[]>();
    const itemSets: MenuNode[] = [];
    for (const n of pending) {
      if (n.changeReason === '메뉴 정렬 순서 변경') {
        const key = n.parentId ?? 'root';
        orderGroups.set(key, [...(orderGroups.get(key) ?? []), n]);
      } else itemSets.push(n);
    }
    const sets: Array<
      | { kind: 'ORDER'; key: string; parentName: string; moved: MenuNode[]; sequence: MenuNode[] }
      | { kind: 'ITEM'; key: string; node: MenuNode }
    > = [];
    for (const [key, moved] of orderGroups) {
      const parentId = key === 'root' ? null : key;
      sets.push({
        kind: 'ORDER', key,
        parentName: parentId ? (byId.get(parentId)?.name ?? '-') : '최상위(1Depth)',
        moved,
        sequence: childrenOf(parentId, nodes),
      });
    }
    for (const n of itemSets) sets.push({ kind: 'ITEM', key: n.id, node: n });
    return sets;
  }, [nodes, byId]);
  const pendingCount = pendingSets.length;

  /* ---------- 렌더 ---------- */
  return (
    <div className="space-y-5">
      <PageHeader
        trail={['메뉴 관리', '전체 메뉴 관리']}
        title="전체 메뉴 관리"
        subtitle="앱·웹 전체 메뉴의 구조와 노출/연결 정보를 조회하고 변경 건을 검토·승인 요청합니다. (FN-DSP-MNU-001 · PI-DSP-MNU-001)"
      />

      {/* ── 검색 조건 (SB 1 · 노바 필터 가이드) ── */}
      <div className="space-y-3 rounded-xl border bg-card px-5 py-4">
        {/* Row 1 — 필수 조회 조건 + 펼치기/접기 (우측) */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
          <span className="text-[13px] font-semibold text-muted-foreground">조회 조건<span className="text-destructive"> *</span></span>
          <Select className="h-9 w-32" value={searchField} onChange={(e) => setSearchField(e.target.value as any)}>
            <option>메뉴명</option><option>메뉴 코드</option><option>연결값</option>
          </Select>
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-9 pl-9" placeholder="검색어 입력" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button
            className="ml-auto flex items-center gap-1 rounded-md px-2 py-1.5 text-[13px] font-semibold text-primary hover:bg-accent"
            onClick={() => setFiltersOpen((o) => !o)}
          >
            {filtersOpen ? '접기' : '펼치기'} {filtersOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {!filtersOpen && <FilterActions onReset={resetFilters} />}
        </div>

        {/* Row 2 — 옵션 조건 + 초기화·조회 (우측) */}
        {filtersOpen && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t pt-3.5">
            <FilterSel label="사용 여부" value={fUse} onChange={(v) => setFUse(v as any)}
              opts={[['ALL', '전체'], ['USE', '사용'], ['UNUSE', '미사용']]} />
            <FilterSel label="운영 채널" value={fChannel} onChange={(v) => setFChannel(v as any)}
              opts={[['ALL', '전체'], ['PC', 'PC'], ['APP', 'APP']]} />
            <FilterSel label="로그인 조건" value={fLogin} onChange={(v) => setFLogin(v as any)}
              opts={[['ALL', '전체'], ['ALLSHOW', '전체 노출'], ['LOGIN', '로그인 시 노출']]} />
            <FilterSel label="승인 상태" value={fStatus} onChange={(v) => setFStatus(v as any)}
              opts={[['ALL', '전체'], ['APPROVED', '승인완료'], ['REVIEW', '승인대기'], ['REJECTED', '반려'], ['DRAFT', '임시저장'], ['CANCELED', '요청취소']]} />
            <div className="ml-auto"><FilterActions onReset={resetFilters} /></div>
          </div>
        )}
      </div>

      {/* ── 본문: 좌 트리 / 우 상세 ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* 좌: 트리 */}
        <div className="flex flex-col rounded-xl border bg-card">
          <div className="flex items-center gap-2 border-b p-3">
            <Button size="sm" variant="primary" onClick={openCreate} disabled={reorder}>
              <Plus className="h-4 w-4" /> 메뉴 등록
            </Button>
            <Button size="sm" variant="outline" onClick={expandAll} disabled={reorder}>전체 펼치기</Button>
            <Button size="sm" variant="outline" onClick={collapseAll} disabled={reorder}>전체 접기</Button>
          </div>

          {!reorder && pendingCount > 0 && (
            <button
              onClick={() => setReviewOpen(true)}
              className="flex items-center gap-2 border-b bg-amber-50 px-3 py-2 text-left text-[11px] font-semibold text-amber-800 hover:bg-amber-100"
            >
              <ListChecks className="h-3.5 w-3.5 shrink-0" />
              승인 대기 중인 변경 요청 {pendingCount}건
              <span className="ml-auto rounded-md bg-white px-2 py-0.5 text-[10px] text-amber-700 ring-1 ring-inset ring-amber-200">묶음으로 보기</span>
            </button>
          )}

          {reorder && (
            <div className="border-b bg-accent/60 px-3 py-2 text-[11px] font-semibold text-accent-foreground">
              순서 수정 모드 · 같은 Depth 안에서만 이동합니다. 변경 {reorderChanges.length}건 → 형제 그룹 세트 1건으로 승인 요청됩니다. (PI-DSP-MNU-002)
            </div>
          )}

          <div className="min-h-[300px] flex-1 overflow-auto p-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={childrenOf(null, activeNodes).map((n) => n.id)} strategy={verticalListSortingStrategy}>
                {childrenOf(null, activeNodes).map((n) => (
                  <TreeRow
                    key={n.id}
                    node={n}
                    list={activeNodes}
                    depth={0}
                    expanded={ancestorsExpanded}
                    selectedId={selectedId}
                    matchSet={matchSet}
                    hasFilter={hasFilter}
                    reorder={reorder}
                    childrenOf={childrenOf}
                    onToggle={toggleExpand}
                    onSelect={selectNode}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          {/* 하단 액션 (SB 5·6·7) */}
          <div className="flex flex-wrap items-center gap-2 border-t p-3">
            {!reorder ? (
              <>
                <Button size="sm" variant="outline" onClick={startReorder}>메뉴 순서 수정</Button>
                <Button size="sm" variant="outline" onClick={() => setPreview(true)}><Eye className="h-4 w-4" /> 미리보기</Button>
                <Button size="sm" variant="tblue" className="ml-auto" onClick={() => setAlert({ kind: 'fo-reflect' })}>
                  <RotateCcw className="h-4 w-4" /> FO 반영{approvedCount > 0 && <span className="ml-0.5">({approvedCount})</span>}
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={cancelReorder}>취소</Button>
                <Button size="sm" variant="primary" className="ml-auto" onClick={submitReorder}>승인요청</Button>
              </>
            )}
          </div>
        </div>

        {/* 우: 상세 */}
        <div className="rounded-xl border bg-card">
          {!selected ? (
            <div className="flex h-full min-h-[420px] items-center justify-center px-6 text-center text-sm text-muted-foreground">
              좌측에서 메뉴명을 클릭하면<br />상세 정보를 볼 수 있습니다.
            </div>
          ) : (
            <DetailPanel
              node={selected}
              tab={tab}
              setTab={setTab}
              disabledEdit={reorder}
              onEdit={() => openEdit(selected)}
              onCancelReq={() => cancelRequest(selected)}
              onRollback={(entry) => setAlert({ kind: 'rollback', payload: { node: selected, entry } })}
              onBssApprove={() => bssApprove(selected)}
              onBssReject={() => bssReject(selected)}
              parentName={byId.get(selected.parentId ?? '')?.name}
            />
          )}
        </div>
      </div>

      {/* ── 등록/편집 사이드 패널 ── */}
      {panel && (
        <RegisterPanel
          form={panel}
          setForm={setPanel as any}
          nodes={nodes}
          onClose={() => setPanel(null)}
          onAlert={setAlert}
          onSaveDraft={(f) => { commitPanel(f, 'DRAFT'); }}
          onRequest={(f) => { commitPanel(f, 'REVIEW'); }}
        />
      )}

      {/* ── 미리보기 ── */}
      {preview && <PreviewOverlay nodes={nodes} onClose={() => setPreview(false)} cvmFail={false} />}

      {/* ── 승인 요청 현황(묶음) ── */}
      {reviewOpen && (
        <ReviewSummary
          sets={pendingSets}
          onClose={() => setReviewOpen(false)}
          onSelect={(id) => { setReviewOpen(false); setSelectedId(id); setTab('history'); }}
        />
      )}

      {/* ── 얼럿/모달 ── */}
      {alert?.kind === 'reorder-cancel' && (
        <Alert title="취소 하시겠습니까?" body="변경된 순서는 저장되지 않습니다." confirmText="확인"
          onConfirm={doCancelReorder} onClose={() => setAlert(null)} />
      )}
      {alert?.kind === 'reorder-submit' && (
        <Alert title="순서 변경을 승인 요청할까요?"
          body={`드래그로 바뀐 형제 그룹의 새 정렬(${reorderChanges.length}건)을 한 건의 승인 요청으로 BSS에 전송합니다. 승인 전에는 FO에 반영되지 않습니다. (PI-DSP-MNU-003)`}
          confirmText="승인요청" onConfirm={doSubmitReorder} onClose={() => setAlert(null)} />
      )}
      {alert?.kind === 'fo-reflect' && (
        <Alert title="FO 반영 하시겠습니까?"
          body={<>승인 완료된 변경 내용을 <b>캐시(Redis) 갱신</b>으로 채널(FO)에 즉시 반영합니다. 미승인 변경은 반영 대상에서 제외됩니다. (PI-DSP-MNU-003){approvedCount === 0 && <><br /><br /><span className="text-destructive">현재 반영할 승인 완료 변경분이 없습니다.</span></>}</>}
          confirmText="FO 반영" onConfirm={() => { setNodes((prev) => prev.map((n) => (n.status === 'APPROVED' ? { ...n, approved: snapOf(n) } : n))); flash('FO 반영 완료 — 승인분 캐시(Redis)를 갱신했습니다.'); }}
          onClose={() => setAlert(null)} />
      )}
      {alert?.kind === 'rollback' && (
        <RollbackModal node={alert.payload.node} entry={alert.payload.entry} onClose={() => setAlert(null)}
          onConfirm={() => {
            const n: MenuNode = alert.payload.node;
            if (n.approved) patch(n.id, { ...n.approved, status: 'APPROVED', updatedAt: stamp() },
              { at: stamp(), actor: 'P213980', field: '롤백', before: n.name, after: n.approved.name, reason: '이전 승인 버전으로 롤백', approver: 'BSS 검수자', result: '롤백 완료' });
            flash('이전 승인 버전으로 롤백했습니다.');
            setAlert(null);
          }} />
      )}
      {/* 등록 패널에서 올라오는 얼럿들 */}
      {alert?.kind === 'need-dupcheck' && <Alert title="메뉴명 중복 확인을 해주세요" body="메뉴명 중복 확인이 완료되지 않았습니다. 확인 후 다시 저장해주세요." onClose={() => setAlert(null)} />}
      {alert?.kind === 'dup' && <Alert title="동일한 메뉴명이 존재합니다" body="메뉴명을 변경한 후, 다시 확인해주세요." onClose={() => setAlert(null)} />}
      {alert?.kind === 'dup-ok' && <Alert title="사용 가능한 메뉴명입니다" onClose={() => setAlert(null)} />}
      {alert?.kind === 'need-required' && <Alert title="필수 항목을 입력해주세요" body={<>필수 항목이 비어 있습니다. 입력 후 다시 저장해주세요.<br /><span className="text-[12px] text-muted-foreground">{alert.payload}</span></>} onClose={() => setAlert(null)} />}
      {alert?.kind === 'need-url' && <Alert title="URL 연결값 검증을 해주세요" body="연결 URL 검증이 완료되지 않았습니다. 확인 후 다시 저장해주세요." onClose={() => setAlert(null)} />}
      {alert?.kind === 'url-bad' && <Alert title="랜딩 URL을 확인해주세요" body="입력하신 URL이 올바른 형식이 아닙니다. http:// 또는 https:// 로 시작하는지, 도메인이 정확한지 확인한 뒤 다시 입력해주세요." onClose={() => setAlert(null)} />}
      {alert?.kind === 'url-ok' && <Alert title="URL 검증 완료" body="정상적으로 연결 가능한 URL입니다." onClose={() => setAlert(null)} />}
      {alert?.kind === 'panel-cancel' && <Alert title="취소 하시겠습니까?" body="취소 시 입력한 정보는 모두 삭제됩니다." confirmText="확인" onConfirm={() => setPanel(null)} onClose={() => setAlert(null)} />}
      {alert?.kind === 'request-confirm' && <Alert title="승인 요청 하시겠습니까?" body="필수값·연결값 검증 후 BSS로 승인 요청을 전송합니다." confirmText="확인" onConfirm={() => alert.payload?.()} onClose={() => setAlert(null)} />}

      {/* ── 토스트 ── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );

  /* ---------- 패널 커밋 ---------- */
  function commitPanel(f: PanelForm, target: 'DRAFT' | 'REVIEW') {
    // 필수값·검증 (SB 신규등록/편집 alerts + PI-DSP-MNU-002)
    if (!f.name.trim()) return setAlert({ kind: 'need-required', payload: '메뉴명이 비어 있습니다.' });
    if (!f.nameChecked) return setAlert({ kind: 'need-dupcheck' });
    if (f.linkKind === 'CONTAINER' && !f.container) return setAlert({ kind: 'need-required', payload: '연결 컨테이너를 선택해주세요.' });
    if (f.linkKind !== 'CONTAINER' && !f.url.trim()) return setAlert({ kind: 'need-required', payload: '랜딩 URL을 입력해주세요.' });
    if (f.linkKind !== 'CONTAINER' && !f.urlVerified) return setAlert({ kind: 'need-url' });
    if (!f.channels.length) return setAlert({ kind: 'need-required', payload: '운영 채널을 1개 이상 선택해주세요.' });

    const now = stamp();
    const linkTarget = f.linkKind === 'CONTAINER' ? f.container : f.url;
    const linkType: LinkType = f.linkKind;
    const linkApproved = f.linkKind === 'CONTAINER' ? !!CONTAINERS.find((c) => `${c.name} · ${c.id}` === f.container || c.name === f.container) : true;
    const statusLabel = target === 'REVIEW' ? '승인요청' : '초안 저장';

    if (f.mode === 'edit' && f.editId) {
      setNodes((prev) => prev.map((n) => n.id === f.editId ? {
        ...n, name: f.name, icon: f.hasIcon ? (n.icon ?? 'ic_menu') : null,
        linkType, linkTarget, linkApproved, active: f.active, channels: [...f.channels], channelCond: [...f.channels],
        loginCond: f.loginCond, status: target, updatedAt: now, changeReason: n.changeReason ?? '메뉴 정보 수정',
        history: [{ at: now, actor: 'P213980', field: '메뉴 편집', before: '-', after: f.name, reason: '메뉴 정보 수정', approver: null, result: statusLabel }, ...n.history],
      } : n));
      flash(target === 'REVIEW' ? '승인 요청을 전송했습니다.' : '임시저장했습니다.');
    } else {
      const id = `m-new-${Math.random().toString(36).slice(2, 7)}`;
      const parent = nodes.find((n) => n.name === f.parentName && n.depth === f.depth - 1);
      const sibs = childrenOf(parent?.id ?? null, nodes);
      const node: MenuNode = {
        id, code: `MNU-NEW-${sibs.length + 1}`, name: f.name, depth: f.depth,
        parentId: parent?.id ?? null, order: sibs.length + 1, active: f.active, visibility: '공개',
        linkType, linkTarget, linkApproved, icon: f.hasIcon ? 'ic_menu' : null, iconAlt: f.hasIcon ? f.name : null,
        caption: null, channels: [...f.channels], loginCond: f.loginCond, authCond: 'NONE', segment: '전체',
        channelCond: [...f.channels], org: '전시운영팀', owner: 'P213980', status: target,
        changeReason: '신규 메뉴 노출', rejectReason: null, updatedAt: now, updatedBy: 'P213980',
        isNew: true, approved: null,
        history: [{ at: now, actor: 'P213980', field: '노출 등록', before: '-', after: f.name, reason: '신규 메뉴 노출', approver: null, result: statusLabel }],
      };
      setNodes((prev) => [...prev, node]);
      setSelectedId(id);
      flash(target === 'REVIEW' ? '신규 메뉴 승인 요청을 전송했습니다.' : '신규 메뉴를 임시저장했습니다.');
    }
    setPanel(null);
  }
}

/** 현재 노드 값을 승인 스냅샷으로 */
function snapOf(n: MenuNode) {
  return {
    name: n.name, order: n.order, active: n.active, linkType: n.linkType, linkTarget: n.linkTarget,
    caption: n.caption, channels: [...n.channels], loginCond: n.loginCond, authCond: n.authCond,
    segment: n.segment, channelCond: [...n.channelCond],
  };
}

/* ------------------------------------------------------------------ */
/* 필터 select                                                         */
/* ------------------------------------------------------------------ */
function FilterSel({ label, value, onChange, opts }: {
  label: string; value: string; onChange: (v: string) => void; opts: [string, string][];
}) {
  return (
    <label className="flex items-center gap-2 text-[13px]">
      <span className="shrink-0 font-semibold text-muted-foreground">{label}</span>
      <Select className="h-9 w-32" value={value} onChange={(e) => onChange(e.target.value)}>
        {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </Select>
    </label>
  );
}

// 초기화(아이콘) + 조회 — 노바 가이드: 마지막 행 우측
function FilterActions({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button title="초기화" onClick={onReset}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:bg-muted">
        <RotateCcw className="h-4 w-4" />
      </button>
      <Button size="sm" variant="primary" className="h-9 px-5"><Search className="h-4 w-4" /> 조회</Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 트리 행                                                             */
/* ------------------------------------------------------------------ */
function TreeRow({
  node, list, depth, expanded, selectedId, matchSet, hasFilter, reorder, childrenOf, onToggle, onSelect,
}: {
  node: MenuNode; list: MenuNode[]; depth: number;
  expanded: Set<string>; selectedId: string | null; matchSet: Set<string>; hasFilter: boolean; reorder: boolean;
  childrenOf: (p: string | null, l: MenuNode[]) => MenuNode[];
  onToggle: (id: string) => void; onSelect: (id: string) => void;
}) {
  const kids = childrenOf(node.id, list);
  const open = expanded.has(node.id);
  const isSel = node.id === selectedId;
  const dim = hasFilter && !matchSet.has(node.id);
  const diffs = diffOf(node);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id, disabled: !reorder });
  const dragStyle: React.CSSProperties = {
    paddingLeft: 6 + depth * 16,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 20 : undefined,
    position: 'relative',
  };

  return (
    <>
      <div
        ref={setNodeRef}
        className={cn(
          'group flex items-center gap-1 rounded-md py-1.5 pr-2 text-sm',
          !reorder && 'cursor-pointer hover:bg-muted',
          isSel && !reorder && 'bg-accent font-semibold text-accent-foreground',
          reorder && 'border border-transparent hover:border-border hover:bg-muted/60',
          isDragging && 'bg-card shadow-md ring-1 ring-primary/40',
          dim && 'opacity-40',
        )}
        style={dragStyle}
        onClick={() => !reorder && onSelect(node.id)}
      >
        {reorder && (
          <button
            className="shrink-0 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
            aria-label="드래그하여 순서 변경"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        )}
        {kids.length > 0 ? (
          <button className="shrink-0 text-muted-foreground" onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}>
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : <span className="w-4 shrink-0" />}

        <span className={cn('truncate', node.depth === 1 && 'font-semibold', !node.active && 'text-muted-foreground')}>{node.name}</span>

        {!reorder && (
          <span className="ml-1.5 flex shrink-0 items-center gap-1">
            {!node.active && <UnusedTag />}
            {node.status !== 'APPROVED' && <StatusChip s={node.status} size="sm" />}
            {diffs.map((d) => <DiffTag key={d} d={d} />)}
          </span>
        )}

        {reorder && diffs.includes('순서변경') && <DiffTag d="순서변경" />}
        {reorder && <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">드래그하여 이동</span>}
      </div>

      {open && kids.length > 0 && (
        <SortableContext items={kids.map((k) => k.id)} strategy={verticalListSortingStrategy}>
          {kids.map((k) => (
            <TreeRow key={k.id} node={k} list={list} depth={depth + 1}
              expanded={expanded} selectedId={selectedId} matchSet={matchSet} hasFilter={hasFilter} reorder={reorder}
              childrenOf={childrenOf} onToggle={onToggle} onSelect={onSelect} />
          ))}
        </SortableContext>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 상세 패널 (기본정보 / 변경이력)                                     */
/* ------------------------------------------------------------------ */
function DetailPanel({
  node, tab, setTab, disabledEdit, onEdit, onCancelReq, onRollback, onBssApprove, onBssReject, parentName,
}: {
  node: MenuNode; tab: 'basic' | 'history'; setTab: (t: 'basic' | 'history') => void;
  disabledEdit: boolean; onEdit: () => void; onCancelReq: () => void;
  onRollback: (entry: MenuNode['history'][number]) => void; onBssApprove: () => void; onBssReject: () => void;
  parentName?: string;
}) {
  const linkLabel = node.linkType === 'CONTAINER' ? '승인 컨테이너' : node.linkType === 'INTERNAL' ? '내부 랜딩' : '외부 랜딩';
  const editBlocked = disabledEdit || node.status === 'REVIEW'; // 승인요청 상태 = 수정 불가 (SB 05)

  return (
    <div className="flex h-full flex-col">
      {/* 상세 헤더 */}
      <div className="flex flex-wrap items-center gap-2 border-b px-5 py-3.5">
        <span className="text-lg font-bold">{node.name}</span>
        <Badge variant="outline" className="text-[10px]">{node.code}</Badge>
        <span className="ml-auto text-xs text-muted-foreground">최종 반영일 : {node.approved ? node.updatedAt : '—'}</span>
        <span className="text-xs text-muted-foreground">승인 상태</span>
        <StatusChip s={node.status} />
      </div>

      {/* 반려 사유 (SB 03 1-3) */}
      {node.status === 'REJECTED' && node.rejectReason && (
        <div className="mx-5 mt-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-badge-bg-negative px-3 py-2 text-xs font-semibold text-badge-text-negative">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> 반려 사유 : {node.rejectReason}
        </div>
      )}

      {/* 탭 */}
      <div className="flex gap-4 border-b px-5">
        {(['basic', 'history'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('border-b-2 py-2.5 text-sm font-semibold', tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {t === 'basic' ? '기본 정보' : '변경 이력'}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-5">
        {tab === 'basic' ? (
          <div className="rounded-lg border">
            <ReadRow label="메뉴명">{node.name}</ReadRow>
            <ReadRow label="메뉴 코드">{node.code}</ReadRow>
            {node.depth === 1 && (
              <ReadRow label="메뉴 아이콘" tbd>
                {node.icon
                  ? <span className="inline-flex items-center gap-1"><span className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-muted"><ImageIcon className="h-4 w-4 text-muted-foreground" /></span><span className="text-xs text-muted-foreground">{node.iconAlt ?? '대체텍스트 없음'}</span></span>
                  : <span className="text-muted-foreground">미설정</span>}
              </ReadRow>
            )}
            <ReadRow label="연결 유형">{linkLabel}</ReadRow>
            <ReadRow label="랜딩 URL / 컨테이너 ID">
              {node.linkTarget ?? <span className="text-destructive">연결 대상 없음 (PI-DSP-MNU-002)</span>}
              {node.linkTarget && !node.linkApproved && <Badge variant="warning" className="ml-2 text-[9px]">미승인 연결</Badge>}
            </ReadRow>
            <ReadRow label="사용 여부">{node.active ? '사용' : '미사용'}</ReadRow>
            <ReadRow label="로그인 조건">{LOGIN_LABEL[node.loginCond]}</ReadRow>
            <ReadRow label="운영 채널">{node.channels.join(' · ') || '—'}</ReadRow>
            <ReadRow label="OS" tbd>전체</ReadRow>
            <ReadRow label="권한 조건" tbd>
              로그인 조건: {LOGIN_LABEL[node.loginCond]} / 회원 등급: 전체 / 회선: 전체
            </ReadRow>

            <div className="flex items-center justify-end gap-2 border-t px-3 py-3">
              {/* BSS 응답 모의 — 승인요청 상태에서만 (데모용) */}
              {node.status === 'REVIEW' && (
                <div className="mr-auto flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">BSS 응답(모의)</span>
                  <Button size="sm" variant="outline" onClick={onBssApprove}><Check className="h-3.5 w-3.5" /> 승인</Button>
                  <Button size="sm" variant="outline" onClick={onBssReject}>반려</Button>
                </div>
              )}
              <Button size="sm" variant="outline" onClick={onEdit} disabled={editBlocked} title={editBlocked ? '승인요청 상태에서는 수정할 수 없습니다' : undefined}>수정</Button>
            </div>
          </div>
        ) : (
          <HistoryTab node={node} onCancelReq={onCancelReq} onRollback={onRollback} />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 변경 이력 탭 (SB 03)                                                */
/* ------------------------------------------------------------------ */
function HistoryTab({ node, onCancelReq, onRollback }: {
  node: MenuNode; onCancelReq: () => void; onRollback: (e: MenuNode['history'][number]) => void;
}) {
  if (node.history.length === 0)
    return <p className="py-10 text-center text-sm text-muted-foreground">변경 이력이 없습니다.</p>;

  // 버전 부여: 승인완료 이력에만 역순 번호 (SB: 요청취소·반려는 버전 미부여)
  let v = node.history.filter((h) => h.result === '승인완료' || h.result === '승인 완료' || h.result === '롤백 완료').length;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[720px] text-xs">
        <thead>
          <tr className="border-b bg-muted/60 text-left text-muted-foreground">
            {['버전', '요청자', '요청 일시', '요청 사유', '승인 상태', '담당자', '처리 일시', ''].map((h) => (
              <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {node.history.map((h, i) => {
            const approvedRow = h.result === '승인완료' || h.result === '승인 완료' || h.result === '롤백 완료';
            const ver = approvedRow ? v-- : null;
            const reviewing = h.result === '승인요청' || h.result === '검수 요청';
            return (
              <tr key={i} className="border-b last:border-0 align-top">
                <td className="px-3 py-2">{ver ? <button className="font-semibold text-primary underline underline-offset-2">{ver}</button> : <span className="text-muted-foreground">-</span>}</td>
                <td className="whitespace-nowrap px-3 py-2">{h.actor}</td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{h.at}</td>
                <td className="px-3 py-2">
                  <span className="block max-w-[180px] truncate" title={h.reason}>{h.reason}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2"><HistBadge result={h.result} /></td>
                <td className="whitespace-nowrap px-3 py-2">{h.approver ?? '-'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{approvedRow || h.result === '반려' ? h.at : '-'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  {reviewing && i === 0 ? <Button size="sm" variant="outline" onClick={onCancelReq}>요청취소</Button>
                    : approvedRow ? <Button size="sm" variant="outline" onClick={() => onRollback(h)}>롤백하기</Button>
                      : <span className="text-muted-foreground">-</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function HistBadge({ result }: { result: string }) {
  const tone = /승인완료|승인 완료|롤백/.test(result) ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : /승인요청|검수 요청/.test(result) ? 'bg-amber-50 text-amber-700 ring-amber-200'
      : /반려/.test(result) ? 'bg-rose-50 text-rose-700 ring-rose-200'
        : 'bg-slate-100 text-slate-600 ring-slate-200';
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', tone)}>{result}</span>;
}

/* ------------------------------------------------------------------ */
/* 롤백 diff 모달 (SB 03 1-4)                                          */
/* ------------------------------------------------------------------ */
function RollbackModal({ node, entry, onClose, onConfirm }: {
  node: MenuNode; entry: MenuNode['history'][number]; onClose: () => void; onConfirm: () => void;
}) {
  const a = node.approved;
  const raw: [string, string, string][] = a ? [
    ['메뉴명', node.name, a.name],
    ['정렬 순서', String(node.order), String(a.order)],
    ['사용 여부', node.active ? '사용' : '미사용', a.active ? '사용' : '미사용'],
    ['연결 대상', node.linkTarget ?? '-', a.linkTarget ?? '-'],
    ['로그인 조건', LOGIN_LABEL[node.loginCond], LOGIN_LABEL[a.loginCond]],
  ] : [];
  const rows = raw.filter(([, cur, prev]) => cur !== prev);

  return (
    <Modal title="이전 승인 버전으로 롤백" onClose={onClose} wide
      footer={<><Button size="sm" variant="outline" onClick={onClose}>취소</Button><Button size="sm" variant="primary" onClick={onConfirm}>롤백 진행</Button></>}>
      <p className="mb-3 text-sm text-muted-foreground">현재 버전 대비 변경 내용(diff)입니다. 롤백 시 승인 버전 값으로 되돌립니다.</p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">승인 버전과 현재 값의 차이가 없습니다.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border text-sm">
          <div className="grid grid-cols-[110px_minmax(0,1fr)_minmax(0,1fr)] bg-muted/60 font-semibold text-muted-foreground">
            <div className="px-3 py-2">항목</div><div className="px-3 py-2">현재</div><div className="px-3 py-2">승인 버전(롤백 후)</div>
          </div>
          {rows.map(([k, cur, prev]) => (
            <div key={k} className="grid grid-cols-[110px_minmax(0,1fr)_minmax(0,1fr)] border-t">
              <div className="px-3 py-2 font-semibold text-muted-foreground">{k}</div>
              <div className="px-3 py-2 text-badge-text-negative line-through">{cur}</div>
              <div className="px-3 py-2 font-semibold">{prev}</div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* 등록/편집 사이드 패널 (SB 신규 메뉴 등록 / 메뉴 편집)               */
/* ------------------------------------------------------------------ */
function RegisterPanel({
  form, setForm, nodes, onClose, onAlert, onSaveDraft, onRequest,
}: {
  form: PanelForm; setForm: (f: PanelForm) => void; nodes: MenuNode[];
  onClose: () => void; onAlert: (a: { kind: string; payload?: any }) => void;
  onSaveDraft: (f: PanelForm) => void; onRequest: (f: PanelForm) => void;
}) {
  const [containerOpen, setContainerOpen] = useState(false);
  const up = (p: Partial<PanelForm>) => setForm({ ...form, ...p });
  const toggle = <T,>(arr: T[], v: T): T[] => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const d1 = nodes.filter((n) => n.depth === 1);
  const d2 = nodes.filter((n) => n.depth === 2 && (!form.parentName || byName(nodes, form.parentName, 1)?.id === n.parentId));

  const checkDup = () => {
    if (!form.name.trim()) return;
    const dup = nodes.some((n) => n.name === form.name.trim() && n.id !== form.editId);
    up({ nameChecked: true });
    onAlert({ kind: dup ? 'dup' : 'dup-ok' });
    if (dup) up({ nameChecked: false });
  };
  const verifyUrl = () => {
    const ok = /^https?:\/\/.+\..+/.test(form.url.trim()) || (form.linkKind === 'INTERNAL' && form.url.trim().startsWith('/'));
    up({ urlVerified: ok });
    onAlert({ kind: ok ? 'url-ok' : 'url-bad' });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="flex h-full w-full max-w-[480px] flex-col bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="flex items-center gap-2 border-b px-5 py-4">
          <Badge variant={form.mode === 'create' ? 'info' : 'warning'}>{form.mode === 'create' ? '신규' : '편집'}</Badge>
          <h3 className="text-base font-bold">{form.mode === 'create' ? '신규 메뉴 등록' : '메뉴 편집'}</h3>
          <button className="ml-auto text-muted-foreground hover:text-foreground" onClick={onClose}><X className="h-5 w-5" /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-auto px-5 py-4">
          {form.mode === 'create' && (
            <Section title="Depth 설정" note="Depth·상위 메뉴는 채널 구조 기준값입니다. (PI-DSP-MNU-001)">
              <Field label="Depth 기준">
                <div className="flex gap-3">
                  {[1, 2, 3].map((d) => (
                    <label key={d} className="flex items-center gap-1.5 text-sm">
                      <input type="radio" className="accent-primary" checked={form.depth === d} onChange={() => up({ depth: d as 1 | 2 | 3 })} />{d} Depth
                    </label>
                  ))}
                </div>
              </Field>
              {form.depth >= 2 && (
                <Field label="상위 1Depth" req>
                  <Select className="h-9" value={form.parentName} onChange={(e) => up({ parentName: e.target.value })}>
                    <option value="">1Depth 선택</option>
                    {d1.map((n) => <option key={n.id} value={n.name}>{n.name}</option>)}
                  </Select>
                </Field>
              )}
              {form.depth === 3 && (
                <Field label="상위 2Depth" req>
                  <Select className="h-9" value={''} onChange={() => {}}>
                    <option value="">2Depth 선택</option>
                    {d2.map((n) => <option key={n.id} value={n.name}>{n.name}</option>)}
                  </Select>
                </Field>
              )}
            </Section>
          )}

          <Section title="기본 표시 정보">
            <Field label="메뉴명" req>
              <div className="flex gap-2">
                <Input value={form.name} placeholder="메뉴명을 입력해 주세요." className="h-9"
                  onChange={(e) => up({ name: e.target.value, nameChecked: false })} />
                <Button size="sm" variant="outline" className="shrink-0" disabled={!form.name.trim()} onClick={checkDup}>중복 확인</Button>
              </div>
              {form.nameChecked && <p className="mt-1 text-[11px] font-semibold text-badge-text-success">사용 가능한 메뉴명입니다.</p>}
            </Field>
            {form.depth === 1 && (
              <Field label={<>메뉴 아이콘 <Tbd /></>}>
                <button
                  className={cn('flex h-16 w-16 items-center justify-center rounded-md border-2 border-dashed', form.hasIcon ? 'border-primary bg-accent' : 'border-input bg-muted/40')}
                  onClick={() => up({ hasIcon: !form.hasIcon })}
                >
                  {form.hasIcon ? <ImageIcon className="h-6 w-6 text-primary" /> : <Plus className="h-5 w-5 text-muted-foreground" />}
                </button>
              </Field>
            )}
          </Section>

          <Section title="연결 설정 및 유효성 검증">
            <Field label="연결 유형" req>
              <div className="flex flex-col gap-1.5">
                {([['CONTAINER', '승인 컨테이너'], ['INTERNAL', '내부 랜딩 URL'], ['EXTERNAL', '외부 랜딩 URL']] as [LinkKind, string][]).map(([k, l]) => (
                  <label key={k} className="flex items-center gap-1.5 text-sm">
                    <input type="radio" className="accent-primary" checked={form.linkKind === k} onChange={() => up({ linkKind: k, urlVerified: false })} />{l}
                  </label>
                ))}
              </div>
            </Field>
            {form.linkKind === 'CONTAINER' ? (
              <Field label="컨테이너 ID" req>
                <div className="flex gap-2">
                  <Input readOnly value={form.container} placeholder="불러오기 버튼을 선택하세요." className="h-9 bg-muted/40" />
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => setContainerOpen(true)}>불러오기</Button>
                </div>
              </Field>
            ) : (
              <Field label="랜딩 URL" req>
                <div className="flex gap-2">
                  <Input value={form.url} placeholder="연결 URL 링크를 입력하세요." className="h-9"
                    onChange={(e) => up({ url: e.target.value, urlVerified: false })} />
                  <Button size="sm" variant="outline" className="shrink-0" disabled={!form.url.trim()} onClick={verifyUrl}>URL 검증</Button>
                </div>
                {form.urlVerified && <p className="mt-1 text-[11px] font-semibold text-badge-text-success">연결 가능한 URL입니다.</p>}
              </Field>
            )}
          </Section>

          <Section title="노출 설정">
            <Field label="사용 여부" req>
              <div className="flex gap-4">
                {[[true, '사용'], [false, '미사용']].map(([v, l]) => (
                  <label key={String(v)} className="flex items-center gap-1.5 text-sm">
                    <input type="radio" className="accent-primary" checked={form.active === v} onChange={() => up({ active: v as boolean })} />{l as string}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="운영 채널" req>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-1.5 text-sm">
                  <Checkbox checked={form.channels.length === 2} onChange={(e) => up({ channels: e.target.checked ? ['PC', 'APP'] : [] })} /> 전체
                </label>
                {(['PC', 'APP'] as Channel[]).map((c) => (
                  <label key={c} className="flex items-center gap-1.5 text-sm">
                    <Checkbox checked={form.channels.includes(c)} disabled={!form.active}
                      onChange={() => up({ channels: toggle(form.channels, c) })} /> {c}
                  </label>
                ))}
              </div>
            </Field>
            <Field label={<>OS <Tbd /></>}>
              <div className="flex flex-wrap gap-4">
                {OS_OPTS.map((o) => (
                  <label key={o} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Checkbox checked={form.os.includes(o)} onChange={() => up({ os: o === '전체' ? ['전체'] : toggle(form.os.filter((x) => x !== '전체'), o) })} /> {o}
                  </label>
                ))}
              </div>
            </Field>
          </Section>

          <Section title="권한 조건 설정">
            <Field label="로그인 조건" req>
              <div className="flex gap-4">
                {([['ALL', '전체 노출'], ['LOGIN', '로그인 시 노출']] as ['ALL' | 'LOGIN', string][]).map(([v, l]) => (
                  <label key={v} className="flex items-center gap-1.5 text-sm">
                    <input type="radio" className="accent-primary" checked={form.loginCond === v} onChange={() => up({ loginCond: v })} />{l}
                  </label>
                ))}
              </div>
              <label className="mt-2 flex items-center gap-1.5 rounded-md bg-accent/40 px-2 py-1.5 text-sm text-muted-foreground">
                <Checkbox checked={form.easyLogin} onChange={(e) => up({ easyLogin: e.target.checked })} /> 간편 로그인 포함 <Tbd />
              </label>
            </Field>
            <Field label={<>회원 등급 <Tbd /></>}>
              <div className="flex flex-wrap gap-3">
                {GRADES.map((g) => (
                  <label key={g} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Checkbox checked={form.grades.includes(g)} onChange={() => up({ grades: g === '전체' ? ['전체'] : toggle(form.grades.filter((x) => x !== '전체'), g) })} /> {g}
                  </label>
                ))}
              </div>
            </Field>
            <Field label={<>회선 조건 <Tbd /></>}>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                {LINES.map((l) => (
                  <label key={l} className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                    <Checkbox checked={form.lines.includes(l)} onChange={() => up({ lines: l === '전체' ? ['전체'] : toggle(form.lines.filter((x) => x !== '전체'), l) })} /> {l}
                  </label>
                ))}
              </div>
            </Field>
          </Section>
        </div>

        {/* 액션 (SB 하단 고정) */}
        <div className="flex items-center gap-2 border-t px-5 py-3.5">
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setForm(blankForm(form.mode))}>초기화</Button>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onAlert({ kind: 'panel-cancel' })}>취소</Button>
            <Button size="sm" variant="outline" onClick={() => onSaveDraft(form)}>임시저장</Button>
            <Button size="sm" variant="primary" onClick={() => onAlert({ kind: 'request-confirm', payload: () => onRequest(form) })}>승인요청</Button>
          </div>
        </div>
      </div>

      {/* 컨테이너 불러오기 (SB 6-1) */}
      {containerOpen && (
        <ContainerPicker onClose={() => setContainerOpen(false)} onPick={(c) => { up({ container: `${c.name} · ${c.id}` }); setContainerOpen(false); }} />
      )}
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-1 flex items-center gap-2 border-b pb-1.5">
        <h4 className="text-sm font-bold">{title}</h4>
        {note && <span className="text-[11px] text-muted-foreground">{note}</span>}
      </div>
      <div className="divide-y divide-transparent">{children}</div>
    </section>
  );
}

function ContainerPicker({ onClose, onPick }: { onClose: () => void; onPick: (c: (typeof CONTAINERS)[number]) => void }) {
  const [sel, setSel] = useState<number | null>(null);
  const [kw, setKw] = useState('');
  const rows = CONTAINERS.filter((c) => !kw || c.name.includes(kw) || c.id.includes(kw));
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <h3 className="text-sm font-bold">승인 컨테이너 불러오기</h3>
          <button className="text-muted-foreground hover:text-foreground" onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <div className="flex items-center gap-2 border-b px-5 py-3">
          <span className="text-[13px] font-semibold text-muted-foreground">검색어</span>
          <Input className="h-9" placeholder="컨테이너 명, 컨테이너 ID를 검색하세요" value={kw} onChange={(e) => setKw(e.target.value)} />
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-5 py-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/60 text-left text-muted-foreground">
                <th className="px-2 py-2"></th><th className="px-2 py-2 font-semibold">컨테이너명</th>
                <th className="px-2 py-2 font-semibold">컨테이너 ID</th><th className="px-2 py-2 font-semibold">전시 기간</th>
                <th className="px-2 py-2 font-semibold">전시 여부</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c, i) => (
                <tr key={i} className={cn('cursor-pointer border-b last:border-0 hover:bg-muted', sel === i && 'bg-accent')} onClick={() => setSel(i)}>
                  <td className="px-2 py-2"><input type="radio" className="accent-primary" checked={sel === i} readOnly /></td>
                  <td className="px-2 py-2 font-semibold">{c.name}</td>
                  <td className="px-2 py-2 font-mono text-[11px] text-muted-foreground">{c.id}</td>
                  <td className="px-2 py-2 text-muted-foreground">{c.period}</td>
                  <td className="px-2 py-2"><Badge variant={c.on ? 'success' : 'neutral'}>{c.on ? '전시' : '미전시'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-2 border-t bg-muted/40 px-5 py-3">
          <Button size="sm" variant="outline" onClick={onClose}>취소</Button>
          <Button size="sm" variant="primary" disabled={sel === null} onClick={() => sel !== null && onPick(rows[sel])}>선택 완료</Button>
        </div>
      </div>
    </div>
  );
}

function byName(nodes: MenuNode[], name: string, depth: number) {
  return nodes.find((n) => n.name === name && n.depth === depth);
}

/* ------------------------------------------------------------------ */
/* 승인 요청 현황 — 변경 요청(change set)을 묶음으로 한눈에             */
/* ------------------------------------------------------------------ */
type PendingSet =
  | { kind: 'ORDER'; key: string; parentName: string; moved: MenuNode[]; sequence: MenuNode[] }
  | { kind: 'ITEM'; key: string; node: MenuNode };

function ReviewSummary({ sets, onClose, onSelect }: {
  sets: PendingSet[]; onClose: () => void; onSelect: (id: string) => void;
}) {
  return (
    <Modal title={<span className="flex items-center gap-2">승인 요청 현황 <Badge variant="warning">{sets.length}건</Badge></span>} onClose={onClose} wide
      footer={<Button size="sm" variant="outline" onClick={onClose}>닫기</Button>}>
      <p className="mb-3 text-xs text-muted-foreground">
        BSS 승인 대기 중인 변경 요청입니다. <b>순서 변경은 형제 그룹 세트가 1건</b>으로 묶여 있어, 하나씩 들어가지 않고 여기서 한눈에 볼 수 있습니다. (PI-DSP-MNU-002·003)
      </p>
      {sets.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">승인 대기 중인 요청이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {sets.map((s) => s.kind === 'ORDER' ? (
            <div key={s.key} className="rounded-lg border">
              <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
                <Badge variant="info">정렬 순서 변경</Badge>
                <span className="text-sm font-semibold">{s.parentName} 그룹</span>
                <span className="text-xs text-muted-foreground">형제 {s.sequence.length}개 · 이동 {s.moved.length}건 · 승인 요청 1건</span>
                <StatusChip s="REVIEW" size="sm" />
              </div>
              <ol className="divide-y">
                {s.sequence.map((n, i) => {
                  const before = n.approved?.order;
                  const changed = before != null && before !== i + 1;
                  return (
                    <li key={n.id} className={cn('flex items-center gap-2 px-3 py-1.5 text-sm', changed && 'bg-sky-50/60')}>
                      <span className="w-5 text-center text-xs font-semibold text-muted-foreground">{i + 1}</span>
                      <span className={cn('truncate', changed && 'font-semibold')}>{n.name}</span>
                      {changed && (
                        <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-sky-600">
                          <span className="rounded bg-white px-1 ring-1 ring-inset ring-sky-200">{before}</span>→<span className="rounded bg-sky-100 px-1">{i + 1}</span>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : (
            <div key={s.key} className="rounded-lg border">
              <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
                <Badge variant="outline" className="text-[10px]">{s.node.code}</Badge>
                <span className="text-sm font-semibold">{s.node.name}</span>
                <StatusChip s="REVIEW" size="sm" />
                <button className="ml-auto text-[11px] font-semibold text-primary hover:underline" onClick={() => onSelect(s.node.id)}>변경 이력 보기 ›</button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 px-3 py-2">
                {diffOf(s.node).length ? diffOf(s.node).map((d) => <DiffTag key={d} d={d} />) : <span className="text-xs text-muted-foreground">신규 등록</span>}
                <span className="ml-1 text-xs text-muted-foreground">· {s.node.changeReason ?? '-'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
