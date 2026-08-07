'use client';

import { useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import * as Icons from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { renderNodeBody, DeviceShell, type NodeView } from '@/components/preview/event-node';
import { CATALOG, componentDef, componentLabel, isContainer, DEVICES, CORNER_TYPES, allowedComponentsFor, PROMO_CORNER_OPTIONS, GROUP_CORNER } from '@/lib/event-components';
import { layerRole, LAYER_LABEL, LAYER_COLOR, isFixedNode, type Viewer, nodeAudience, AUDIENCE_BADGE } from '@/lib/event-layers';
import { addNode, addCornerNode, updateNodeProps, deleteNode, duplicateNode, updatePageMeta, addConditionPage, saveEventDraft, restoreEventVersion, reorderNodes } from '../../../actions';
import { ProgramInfoEdit, type ProgramInfo } from './program-info-edit';
import { PropertiesPanel } from './properties';

type CondPage = { id: string; name: string; conditionGroup: string; isDefault: boolean };
type VersionRow = { id: string; version: number; label: string; createdLabel: string };
type Meta = { pageId: string; pageName: string; device: string; projectId: string; projectName: string; env: string; mode: string; conditionGroup: string; pages: CondPage[]; versions: VersionRow[]; program: ProgramInfo };

// 조건그룹 프리셋 (로그인/비로그인) — 전시 컨테이너 조건그룹에 대응
const CONDITION_PRESETS = ['로그인', '비로그인'];

// 임시저장 + 저장본(버전) 목록/복원
function DraftControls({ meta }: { meta: Meta }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => start(() => saveEventDraft(meta.pageId))}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-50"
      >
        <Icons.Save className="h-3.5 w-3.5" /> 임시저장
      </button>
      <div className="relative">
        <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-secondary" title="저장본(임시저장) 목록">
          <Icons.History className="h-3.5 w-3.5" /> 저장본 {meta.versions.length > 0 && <span className="rounded bg-secondary px-1 text-[10px]">{meta.versions.length}</span>}
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-9 z-50 w-64 overflow-hidden rounded-lg border bg-white shadow-xl">
              <p className="border-b px-3 py-2 text-[11px] font-semibold text-muted-foreground">임시저장본 ({meta.versions.length})</p>
              {meta.versions.length === 0 ? (
                <p className="px-3 py-4 text-center text-[11px] text-muted-foreground">저장된 임시저장본이 없습니다.</p>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {meta.versions.map((v) => (
                    <div key={v.id} className="flex items-center justify-between gap-2 border-b px-3 py-2 last:border-0">
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-medium">v{v.version} · {v.label}</p>
                        <p className="text-[10px] text-muted-foreground">{v.createdLabel}</p>
                      </div>
                      <button
                        onClick={() => { if (confirm(`v${v.version}(으)로 복원할까요? 현재 상태는 자동 저장됩니다.`)) start(() => restoreEventVersion(meta.pageId, v.id).then(() => setOpen(false))); }}
                        disabled={pending}
                        className="shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium hover:bg-secondary"
                      >
                        복원
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// 상단 조건그룹 스위처 — 프로그램의 조건그룹 페이지 전환 + 추가 + 비교
function ConditionSwitcher({ meta }: { meta: Meta }) {
  const [pending, start] = useTransition();
  const [openAdd, setOpenAdd] = useState(false);
  const present = new Set(meta.pages.map((p) => p.conditionGroup));
  const addable = CONDITION_PRESETS.filter((g) => !present.has(g));
  const condLabel = (g: string) => (g === '전체' ? '기본(전체)' : g); // '전체' = 모든 사용자 공통 기본 화면
  const onlyBase = meta.pages.length <= 1;
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] font-medium text-muted-foreground" title="로그인/비로그인 등 조건에 따라 다른 화면을 분기합니다. '기본(전체)'은 모든 사용자에게 보이는 기본 화면입니다.">조건그룹</span>
      <div className="flex overflow-hidden rounded-md border">
        {meta.pages.map((p) => (
          <Link
            key={p.id}
            href={`/admin/events/pages/${p.id}/builder`}
            title={p.conditionGroup === '전체' ? '모든 사용자에게 보이는 기본 화면' : `${p.conditionGroup} 조건 화면`}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium ${p.id === meta.pageId ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-secondary'}`}
          >
            {p.isDefault && <Icons.Star className="h-3 w-3" />}
            {condLabel(p.conditionGroup)}
          </Link>
        ))}
        {addable.length > 0 && (
          <div className="relative">
            <button onClick={() => setOpenAdd((v) => !v)} disabled={pending} className="inline-flex h-full items-center gap-0.5 border-l bg-card px-2 py-1.5 text-xs text-primary hover:bg-secondary" title="조건그룹 추가">
              <Icons.Plus className="h-3.5 w-3.5" />
            </button>
            {openAdd && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpenAdd(false)} />
                <div className="absolute left-0 top-9 z-50 w-32 overflow-hidden rounded-md border bg-white text-xs shadow-lg">
                  {addable.map((g) => (
                    <button
                      key={g}
                      onClick={() => { setOpenAdd(false); start(() => addConditionPage(meta.projectId, g, meta.pageId)); }}
                      className="flex w-full items-center gap-1.5 px-3 py-2 hover:bg-secondary"
                    >
                      <Icons.Plus className="h-3 w-3" /> {g} 추가
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {meta.pages.length >= 2 ? (
        <Link href={`/admin/events/pages/${meta.pageId}/compare`} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-secondary" title="조건그룹별 화면 비교">
          <Icons.Columns2 className="h-3.5 w-3.5" /> 비교
        </Link>
      ) : onlyBase && addable.length > 0 ? (
        <span className="text-[10px] text-muted-foreground">＋로 로그인/비로그인 분기 추가</span>
      ) : null}
    </div>
  );
}

function LucideIcon({ name, className }: { name: string; className?: string }) {
  const Ic = (Icons as any)[name] ?? Icons.Square;
  return <Ic className={className} />;
}

function LayerBadge({ role }: { role: keyof typeof LAYER_COLOR }) {
  return <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${LAYER_COLOR[role]}`}>{LAYER_LABEL[role]}</span>;
}

// ── 드래그앤드롭 순서 변경 (구조 트리) — 고정(FIXED) 노드는 위치 잠금 ──
function SortableGroup({ nodes, pageId, depth, selectedId, onSelect }: { nodes: NodeView[]; pageId: string; depth: number; selectedId: string | null; onSelect: (id: string) => void }) {
  const [, start] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const movableIds = nodes.filter((n) => !isFixedNode(n.type)).map((n) => n.id);
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldI = movableIds.indexOf(String(active.id));
    const newI = movableIds.indexOf(String(over.id));
    if (oldI < 0 || newI < 0) return;
    const nextMovable = arrayMove(movableIds, oldI, newI);
    let mi = 0;
    const fullOrder = nodes.map((n) => (isFixedNode(n.type) ? n.id : nextMovable[mi++])); // 고정은 원위치 유지
    start(() => reorderNodes(pageId, fullOrder));
  };
  return (
    <DndContext id={`dnd-${pageId}-${depth}-${nodes[0]?.id ?? 'e'}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={movableIds} strategy={verticalListSortingStrategy}>
        {nodes.map((n) => (
          <SortableRow key={n.id} node={n} pageId={pageId} depth={depth} selectedId={selectedId} onSelect={onSelect} />
        ))}
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({ node, pageId, depth, selectedId, onSelect }: { node: NodeView; pageId: string; depth: number; selectedId: string | null; onSelect: (id: string) => void }) {
  const fixed = isFixedNode(node.type);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id, disabled: fixed });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1, zIndex: isDragging ? 20 : undefined, position: 'relative' as const };
  const role = layerRole(node.type);
  const isCorner = node.type === 'CORNER';
  const hasChildren = node.children.length > 0;
  const label =
    node.type === 'CORNER'
      ? node.props.cornerType === GROUP_CORNER
        ? `${node.props.title ?? '그룹'}`
        : `${node.props.title ?? '코너'} · ${node.props.cornerType}`
      : componentLabel(node.type);

  // 헤더 행 (드래그 핸들 + 라벨) — 코너는 카드 헤더, 그 외는 단순 행
  const headerRow = (
    <div className={`group flex items-center gap-1 rounded-md py-1.5 pl-1.5 pr-2 text-[12px] ${selectedId === node.id ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted/60'}`}>
      {fixed ? (
        <Icons.Lock className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
      ) : (
        <button {...attributes} {...listeners} className="cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing" title="드래그로 순서 변경 (같은 그룹 안에서만)" onClick={(e) => e.stopPropagation()}>
          <Icons.GripVertical className="h-3.5 w-3.5" />
        </button>
      )}
      <button onClick={() => onSelect(node.id)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
        <LayerBadge role={role} />
        <span className="truncate">{label}</span>
        {(() => { const a = nodeAudience(node.props); return a !== '공통' ? <span className={`ml-auto shrink-0 rounded px-1 py-0.5 text-[8px] font-bold ${AUDIENCE_BADGE[a]}`}>{a}</span> : null; })()}
      </button>
    </div>
  );

  // 자식(컴포넌트/아톰)은 왼쪽 레일로 '이 안에 묶여 있음'을 명시 → 자기 그룹 안에서만 재정렬
  const childGroup = hasChildren && (
    <div className={`ml-2.5 border-l border-dashed pl-1 ${isCorner ? 'border-emerald-200 pb-1' : 'border-slate-200'}`}>
      <SortableGroup nodes={node.children} pageId={pageId} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} />
    </div>
  );

  // 코너 = 하나의 그룹 박스(카드). 드래그하면 카드 전체가 한 덩어리로 이동, 코너끼리만 자리 교환.
  if (isCorner) {
    return (
      <div ref={setNodeRef} style={style} className={`mb-1.5 overflow-hidden rounded-lg border bg-emerald-50/30 shadow-sm ${isDragging ? 'border-emerald-300 ring-2 ring-emerald-200' : 'border-emerald-200/70'}`}>
        {headerRow}
        {childGroup}
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'rounded-md ring-2 ring-sky-200' : undefined}>
      {headerRow}
      {childGroup}
    </div>
  );
}

// ── 구조(레이어) 탭: 5단계 트리 (컨테이너▸템플릿▸코너▸컴포넌트▸아톰) ──
function StructureRow({ node, depth, selectedId, onSelect, right }: { node: NodeView; depth: number; selectedId: string | null; onSelect: (id: string) => void; right?: ReactNode }) {
  const role = layerRole(node.type);
  const label =
    node.type === 'CORNER'
      ? node.props.cornerType === GROUP_CORNER
        ? `${node.props.title ?? '그룹'}`
        : `${node.props.title ?? '코너'} · ${node.props.cornerType}`
      : componentLabel(node.type);
  return (
    <>
      <div
        style={{ paddingLeft: 8 + depth * 14 }}
        className={`group flex items-center gap-1.5 rounded-md py-1.5 pr-2 text-[12px] ${selectedId === node.id ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted/60'}`}
      >
        <button onClick={() => onSelect(node.id)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
          <LayerBadge role={role} />
          <span className="truncate">{label}</span>
        </button>
        {right}
      </div>
      {node.children.map((c) => (
        <StructureRow key={c.id} node={c} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </>
  );
}

function StructureTree({ tree, meta, selectedId, onSelect }: { tree: NodeView[]; meta: Meta; selectedId: string | null; onSelect: (id: string) => void }) {
  // 전시(거버넌스) 모드는 기존 매핑(컨테이너=프로젝트, 템플릿=페이지) 유지.
  if (meta.mode === 'display') {
    return (
      <div className="space-y-0.5">
        <div className="flex items-center gap-1.5 rounded-md bg-slate-900/90 px-2 py-1.5 text-[12px] font-semibold text-white">
          <LayerBadge role="CONTAINER" /> <span className="truncate">{meta.projectName}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-md bg-indigo-50 px-2 py-1.5 text-[12px] font-semibold text-indigo-700" style={{ marginLeft: 10 }}>
          <LayerBadge role="TEMPLATE" /> <span className="truncate">{meta.pageName}</span>
        </div>
        <div style={{ marginLeft: 10 }}>
          {tree.length === 0 ? (
            <p className="px-2 py-3 text-[11px] text-muted-foreground">아직 배치된 노드가 없습니다.</p>
          ) : (
            tree.map((n) => <StructureRow key={n.id} node={n} depth={1} selectedId={selectedId} onSelect={onSelect} />)
          )}
        </div>
        <p className="pt-2 text-[10px] leading-snug text-muted-foreground">컨테이너(프로젝트) ▸ 템플릿(페이지) ▸ 코너 ▸ 컴포넌트(그룹) ▸ 아톰(기본 블록)</p>
      </div>
    );
  }

  // 프로모션(오픈) 모드: 템플릿(프로모션)▸코너(그룹)▸컴포넌트▸아톰 — 컨테이너 표기 없음
  return (
    <div className="space-y-0.5">
      {/* 템플릿 = 프로모션 (최상단) */}
      <div className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-2 py-1.5 text-[12px] font-semibold text-white">
        <LayerBadge role="TEMPLATE" /> <span className="truncate">{meta.projectName}</span>
      </div>
      <div style={{ marginLeft: 10 }}>
        {tree.length === 0 ? (
          <p className="px-2 py-3 text-[11px] leading-snug text-muted-foreground">아직 코너가 없습니다.<br />오른쪽 <b>추가</b>에서 코너(그룹)를 만들어 콘텐츠를 묶으세요.</p>
        ) : (
          <SortableGroup nodes={tree} pageId={meta.pageId} depth={1} selectedId={selectedId} onSelect={onSelect} />
        )}
      </div>
      <p className="pt-2 text-[10px] leading-snug text-muted-foreground">템플릿(프로모션) ▸ 코너(그룹) ▸ 컴포넌트 ▸ 아톰 · <b>드래그</b>로 순서 변경</p>
    </div>
  );
}

// ── 선택 경로 브레드크럼 (레퍼런스의 '카드 · 카드 · 구분선' 대응 + 5단계 라벨) ──
function LayerBreadcrumb({ chain, meta, onSelect }: { chain: NodeView[]; meta: Meta; onSelect: (id: string | null) => void }) {
  const promo = meta.mode !== 'display';
  return (
    <div className="mb-3 flex flex-wrap items-center gap-1 rounded-lg border bg-muted/40 p-2 text-[11px]">
      {promo ? (
        <>
          <span className="inline-flex items-center gap-1"><LayerBadge role="TEMPLATE" /><span className="text-muted-foreground">{meta.projectName}</span></span>
        </>
      ) : (
        <>
          <span className="inline-flex items-center gap-1"><LayerBadge role="CONTAINER" /><span className="text-muted-foreground">{meta.projectName}</span></span>
          <Icons.ChevronRight className="h-3 w-3 text-border" />
          <span className="inline-flex items-center gap-1"><LayerBadge role="TEMPLATE" /><span className="text-muted-foreground">{meta.pageName}</span></span>
        </>
      )}
      {chain.map((nd) => (
        <span key={nd.id} className="inline-flex items-center gap-1">
          <Icons.ChevronRight className="h-3 w-3 text-border" />
          <button onClick={() => onSelect(nd.id)} className="inline-flex items-center gap-1 hover:underline">
            <LayerBadge role={layerRole(nd.type)} />
            <span className="font-medium">{nd.type === 'CORNER' ? nd.props.cornerType : componentLabel(nd.type)}</span>
          </button>
        </span>
      ))}
    </div>
  );
}

// ── 편집 가능한 노드 (선택/툴바 + 재귀) ──
function EditableNode({ node, meta, selectedId, onSelect, viewer }: { node: NodeView; meta: Meta; selectedId: string | null; onSelect: (id: string) => void; viewer: Viewer }) {
  const [pending, start] = useTransition();
  const selected = selectedId === node.id;
  const container = isContainer(node.type);
  const fixed = isFixedNode(node.type); // 개발 고정 영역(썸네일·헤더·CTA) — 이동/복제/삭제 불가
  const def = componentDef(node.type);
  const audience = nodeAudience(node.props); // 노출 조건 (공통/로그인/비로그인)
  const hiddenForViewer = false; // 미리보기 대상 토글 제거 — 빌더는 구성된 화면을 그대로 표시(로그인/비로그인 분기는 이전 단계에서)

  const childrenEls = container ? (
    node.children.length > 0 ? (
      node.children.map((c) => <EditableNode key={c.id} node={c} meta={meta} selectedId={selectedId} onSelect={onSelect} viewer={viewer} />)
    ) : (
      <div className="rounded-lg border-2 border-dashed border-slate-300 py-4 text-center text-[11px] text-slate-400">비어 있음{selected ? ' — 좌측에서 컴포넌트를 추가하세요' : ''}</div>
    )
  ) : null;

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
      className={`group relative cursor-pointer rounded-lg transition ${selected ? 'outline outline-2 outline-primary' : 'hover:outline hover:outline-1 hover:outline-primary/40'} ${hiddenForViewer ? 'opacity-40 grayscale' : ''}`}
    >
      {/* 라벨 — 고정 영역은 자물쇠 표시(개발 고정, 제어 불가) */}
      <span className={`absolute -top-0 left-0 z-20 inline-flex items-center gap-1 rounded-br-md rounded-tl-md px-1.5 py-0.5 text-[10px] font-semibold ${fixed ? 'bg-zinc-500 text-white' : 'bg-primary text-primary-foreground'} ${selected ? '' : 'opacity-0 group-hover:opacity-100'}`}>
        {fixed ? <Icons.Lock className="h-3 w-3" /> : <LucideIcon name={def?.icon ?? 'Square'} className="h-3 w-3" />} {fixed ? '고정' : def?.label}
      </span>
      {/* 노출 조건 배지 — 공통이 아니면 로그인/비로그인 전용 표시 */}
      {audience !== '공통' && (
        <span className={`absolute -top-0 right-0 z-20 inline-flex items-center gap-1 rounded-bl-md rounded-tr-md px-1.5 py-0.5 text-[9px] font-bold ${AUDIENCE_BADGE[audience]}`}>
          <Icons.User className="h-2.5 w-2.5" /> {audience}{hiddenForViewer ? ' · 숨김' : ''}
        </span>
      )}
      {/* 툴바 — 고정 영역은 이동/복제/삭제 불가 */}
      {selected && !fixed && (
        <div className="absolute -top-3 right-1 z-30 flex items-center gap-0.5 rounded-md bg-white p-0.5 shadow-md ring-1 ring-slate-200" onClick={(e) => e.stopPropagation()}>
          <button disabled={pending} onClick={() => start(() => duplicateNode(meta.pageId, node.id))} className="p-1 text-slate-500 hover:text-primary" title="복제"><Icons.Copy className="h-3.5 w-3.5" /></button>
          <button disabled={pending} onClick={() => start(() => deleteNode(meta.pageId, node.id))} className="p-1 text-slate-500 hover:text-destructive" title="삭제"><Icons.Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      )}
      {renderNodeBody(node.type, node.props, childrenEls, viewer)}
    </div>
  );
}

export function EventEditor({ meta, tree }: { meta: Meta; tree: NodeView[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<'node' | 'add'>('add');
  const [q, setQ] = useState('');
  const [device, setDevice] = useState(DEVICES.find((d) => d.key === meta.device) ?? DEVICES[0]);
  const [viewer] = useState<Viewer>('로그인'); // 빌더 렌더 기준(로그인) — 미리보기 대상 토글은 제거됨
  const [, start] = useTransition();

  const display = meta.mode === 'display';

  // 선택 노드 + 조상 체인 탐색
  function findChain(nodes: NodeView[], id: string, chain: NodeView[] = []): NodeView[] | null {
    for (const n of nodes) {
      if (n.id === id) return [...chain, n];
      const f = findChain(n.children, id, [...chain, n]);
      if (f) return f;
    }
    return null;
  }
  const chain = selectedId ? findChain(tree, selectedId) : null;
  const selected = chain ? chain[chain.length - 1] : null;
  // 거버넌스: 대상 코너 = 선택 노드(또는 조상) 중 가장 가까운 CORNER
  const targetCorner = chain ? [...chain].reverse().find((n) => n.type === 'CORNER') ?? null : null;

  // 컴포넌트 추가
  function add(type: string) {
    // 거버넌스 모드: 컴포넌트는 대상 코너 안에만
    const parentId = display
      ? targetCorner?.id ?? null
      : selected && isContainer(selected.type)
        ? selected.id
        : targetCorner?.id ?? null; // 프로모션: 선택 컨테이너 → 없으면 가장 가까운 코너
    if (display && !parentId) return; // 코너 없으면 무시
    start(async () => {
      const id = await addNode(meta.pageId, type, parentId);
      if (id) setSelectedId(id);
    });
    setTab('node');
  }
  // 거버넌스 모드: 루트에 코너 추가
  function addCorner(cornerType: string) {
    start(async () => {
      const id = await addCornerNode(meta.pageId, cornerType);
      if (id) setSelectedId(id);
    });
    setTab('node');
  }


  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border bg-slate-50 shadow-sm" onClick={() => setSelectedId(null)}>
      {/* 상단 바 — 흰 배경 없이 블렌드(가운데 디바이스 드롭다운만 떠 보이게) */}
      <div className="flex items-center gap-3 px-4 py-2.5">
        <Link href="/admin/events" className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
          <Icons.ChevronLeft className="h-4 w-4" /> 목록
        </Link>
        <span className="text-sm font-semibold">{meta.projectName}</span>
        {!display && <ProgramInfoEdit program={meta.program} />}
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${display ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
          {display ? '전시 · 거버넌스 모드' : '이벤트 · 오픈 모드'}
        </span>
        {display && (
          <div className="ml-2">
            <ConditionSwitcher meta={meta} />
          </div>
        )}
        <div className="mx-auto">
          <select
            value={device.key}
            onChange={(e) => { const d = DEVICES.find((x) => x.key === e.target.value)!; setDevice(d); start(() => updatePageMeta(meta.pageId, { device: d.key })); }}
            className="rounded-md border bg-white px-3 py-1.5 text-sm font-medium"
          >
            {DEVICES.map((d) => <option key={d.key} value={d.key}>{d.key}</option>)}
          </select>
        </div>
        <DraftControls meta={meta} />
        <a
          href={`/admin/events/pages/${meta.pageId}/preview`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Icons.Eye className="h-3.5 w-3.5" /> 미리보기
        </a>
      </div>

      <div className="grid flex-1 grid-cols-[300px_1fr_320px] overflow-hidden">
        {/* 좌측: 구조 전용 — 전시/관리 빌더와 동일 (전체 높이) */}
        <div className="flex flex-col overflow-hidden border-r bg-card" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between border-b px-3 py-2.5">
            <p className="text-[12px] font-semibold">구조</p>
            <span className="text-[10px] text-muted-foreground">{display ? '코너 거버넌스' : '5단계 계층'}</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            <StructureTree tree={tree} meta={meta} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
          {/* 코너 추가 — 전시화면 관리처럼 구조(좌측) 하단에 배치 */}
          <details className="border-t p-3" open>
            <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">＋ 코너 추가</summary>
            <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto">
              {(display
                ? CORNER_TYPES.map((c) => ({ key: c.key, label: c.label, governed: true }))
                : PROMO_CORNER_OPTIONS
              ).map((ct) => (
                <button
                  key={ct.key}
                  onClick={() => addCorner(ct.key)}
                  className="flex w-full items-center gap-2 rounded-lg border bg-card p-2 text-left text-[13px] font-medium transition hover:border-primary/60 hover:bg-accent"
                >
                  <LucideIcon name={ct.governed ? 'LayoutGrid' : 'Group'} className="h-4 w-4 text-primary" />
                  <span className="flex-1">{ct.label}</span>
                  <Icons.Plus className="h-3.5 w-3.5 text-primary" />
                </button>
              ))}
            </div>
          </details>
        </div>

        {/* 중앙 캔버스 */}
        <div className="flex flex-col overflow-hidden bg-[radial-gradient(circle,#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]">
          <div className="flex-1 overflow-y-auto p-8">
            <div className="mx-auto w-fit" onClick={(e) => e.stopPropagation()}>
              <DeviceShell width={device.w} height={device.h - 110} headerLabel={meta.projectName}>
                {tree.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                    <p className="text-sm font-semibold text-slate-500">이 페이지가 비어 있습니다</p>
                    <p className="text-[11px] text-slate-400">{display ? "오른쪽 '추가' 탭에서 코너를 추가하세요" : "오른쪽 '추가' 탭에서 컴포넌트를 추가하세요"}</p>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {display
                        ? CORNER_TYPES.map((ct) => (
                            <button key={ct.key} onClick={() => addCorner(ct.key)} className="rounded-full border border-primary/40 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary hover:text-primary-foreground">
                              + {ct.label} 코너
                            </button>
                          ))
                        : ['CARD', 'TEXT', 'IMAGE', 'BUTTON', 'HROW', 'VSTACK'].map((t) => (
                            <button key={t} onClick={() => add(t)} className="rounded-full border border-primary/40 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary hover:text-primary-foreground">
                              + {componentDef(t)?.label}
                            </button>
                          ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tree.map((n) => <EditableNode key={n.id} node={n} meta={meta} selectedId={selectedId} onSelect={setSelectedId} viewer={viewer} />)}
                  </div>
                )}
              </DeviceShell>
            </div>
          </div>
        </div>

        {/* 우측 속성 */}
        <div className="flex flex-col overflow-hidden border-l bg-card" onClick={(e) => e.stopPropagation()}>
          <div className="flex border-b text-[13px]">
            <button onClick={() => setTab('node')} className={`flex-1 border-b-2 py-2.5 font-medium ${tab === 'node' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>선택 속성</button>
            <button onClick={() => setTab('add')} className={`flex-1 border-b-2 py-2.5 font-medium ${tab === 'add' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>추가</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {tab === 'add' ? (
              <div className="space-y-4">
                <div className="relative">
                  <Icons.Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="컴포넌트 검색 (예: 카드, 버튼)" className="h-9 w-full rounded-md border pl-8 pr-2 text-xs" />
                </div>
                {/* 코너 추가는 좌측 구조 하단으로 이동. 여기서는 선택 코너에 넣을 컴포넌트만. */}
                {targetCorner ? (
                  <p className="rounded bg-accent px-2 py-1 text-[10px] text-accent-foreground">
                    선택 코너: <b>{String(targetCorner.props.title ?? targetCorner.props.cornerType)}</b> — 아래 컴포넌트가 이 코너에 추가됩니다.
                  </p>
                ) : (
                  <p className="rounded-lg border border-dashed p-3 text-center text-[11px] text-muted-foreground">
                    {display ? '왼쪽에서 코너를 추가·선택하면 허용 컴포넌트가 나타납니다.' : '왼쪽에서 코너를 추가·선택한 뒤 컴포넌트를 넣으세요.'}
                  </p>
                )}
                {targetCorner && targetCorner.props.cornerType && targetCorner.props.cornerType !== GROUP_CORNER ? (
                  <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">컴포넌트 · 허용</p>
                    <div className="grid grid-cols-2 gap-2">
                      {allowedComponentsFor(String(targetCorner.props.cornerType)).map((c) => (
                        <button key={c.type} onClick={() => add(c.type)} className="flex flex-col items-center gap-1 rounded-lg border bg-card p-3 text-center transition hover:border-primary/60 hover:bg-accent">
                          <LucideIcon name={c.icon} className="h-5 w-5 text-primary" />
                          <span className="text-[12px] font-semibold">{c.label}</span>
                          <span className="line-clamp-1 text-[10px] text-muted-foreground">{c.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  // Contents Catalog 7 카테고리 (자유 구간 모듈)
                  CATALOG.map((cat) => {
                    const q2 = q.trim();
                    const defs = cat.types.map((t) => componentDef(t)).filter(Boolean) as ReturnType<typeof componentDef>[];
                    const items = defs.filter((c) => !q2 || c!.label.includes(q2) || c!.sub.includes(q2));
                    if (!items.length) return null;
                    return (
                      <div key={cat.key}>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{cat.key}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {items.map((c) => (
                            <button key={c!.type} onClick={() => add(c!.type)} className="flex flex-col items-center gap-1 rounded-lg border bg-card p-3 text-center transition hover:border-primary/60 hover:bg-accent">
                              <LucideIcon name={c!.icon} className="h-5 w-5 text-primary" />
                              <span className="text-[12px] font-semibold">{c!.label}</span>
                              <span className="line-clamp-1 text-[10px] text-muted-foreground">{c!.sub}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : selected ? (
              <>
                <LayerBreadcrumb chain={chain ?? []} meta={meta} onSelect={setSelectedId} />
                <PropertiesPanel pageId={meta.pageId} node={selected} onDelete={() => setSelectedId(null)} />
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                <Icons.MousePointerClick className="mb-2 h-8 w-8 opacity-40" />
                <p className="text-sm">캔버스에서 컴포넌트를 선택하세요.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
