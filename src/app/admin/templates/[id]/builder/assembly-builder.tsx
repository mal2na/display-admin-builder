'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DeviceFrame, CornerBlock, type PreviewCorner } from '@/components/preview/blocks';
import { addExistingCorner, reorderCorners, removeCorner } from '../../actions';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CORNER_TYPES, DISPLAY_STATUS_LABEL, type DisplayStatusKey } from '@/lib/display-taxonomy';
import { GripVertical, Trash2, ChevronLeft, Layers, Columns, Plus, Search } from 'lucide-react';

type PlacedCorner = PreviewCorner & { templateCornerId: string; componentCount: number };
type PaletteCorner = { id: string; name: string; cornerType: string; componentCount: number };
type Meta = {
  id: string;
  name: string;
  conditionGroup: string;
  isDefault: boolean;
  status: string;
  startAt: string;
  endAt: string;
  containerId: string;
  containerName: string;
};

const DEVICES = [
  { key: 'ip15pro', label: 'iPhone 15 Pro', w: 393, h: 852 },
  { key: 'android', label: 'Android', w: 360, h: 800 },
  { key: 'ipse', label: 'iPhone SE', w: 375, h: 667 },
];

// ── 왼쪽 팔레트: 드래그(또는 클릭)로 담는 Corner 카드 ──
function PaletteCard({ corner, onAdd }: { corner: PaletteCorner; onAdd: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `p:${corner.id}`,
    data: { type: 'palette', cornerId: corner.id },
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onAdd(corner.id)}
      title="드래그하거나 클릭해서 추가"
      className={`cursor-grab rounded-md border bg-card p-2 active:cursor-grabbing ${isDragging ? 'opacity-40' : 'hover:border-primary/60 hover:bg-accent'}`}
    >
      <div className="flex items-center gap-1.5">
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate text-sm font-medium">{corner.name}</span>
        <Plus className="h-4 w-4 shrink-0 text-primary" />
      </div>
      <div className="mt-1 flex items-center gap-1.5 pl-5">
        <Badge variant="outline">{corner.cornerType}</Badge>
        <span className="text-[11px] text-muted-foreground">Component {corner.componentCount}</span>
      </div>
    </div>
  );
}

// ── 중앙: 배치된 Corner (정렬 + 삭제) ──
function PlacedCornerCard({ corner, templateId }: { corner: PlacedCorner; templateId: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: corner.templateCornerId,
    data: { type: 'placed' },
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <div className="absolute right-1 top-1 z-10 flex gap-1 rounded-md bg-white/90 p-0.5 opacity-0 shadow-sm ring-1 ring-slate-200 transition group-hover:opacity-100">
        <button {...attributes} {...listeners} className="cursor-grab p-1 text-slate-500 active:cursor-grabbing" aria-label="순서 변경">
          <GripVertical className="h-4 w-4" />
        </button>
        <form action={removeCorner.bind(null, templateId, corner.templateCornerId)}>
          <button className="p-1 text-slate-500 hover:text-destructive" aria-label="Corner 제거">
            <Trash2 className="h-4 w-4" />
          </button>
        </form>
      </div>
      <CornerBlock corner={corner} />
    </div>
  );
}

export function AssemblyBuilder({
  meta,
  placed,
  palette,
}: {
  meta: Meta;
  placed: PlacedCorner[];
  palette: PaletteCorner[];
}) {
  const templateId = meta.id;
  const [order, setOrder] = useState(placed.map((p) => p.templateCornerId));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [device, setDevice] = useState(DEVICES[0]);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const { setNodeRef: setFrameRef, isOver } = useDroppable({ id: 'frame' });

  async function addCorner(cornerId: string) {
    const fd = new FormData();
    fd.set('cornerId', cornerId);
    await addExistingCorner(templateId, fd);
  }

  // 배치 코너 순서 동기화
  if (order.length !== placed.length) setOrder(placed.map((p) => p.templateCornerId));
  const byId = new Map(placed.map((p) => [p.templateCornerId, p]));
  const ordered = order.map((id) => byId.get(id)).filter(Boolean) as PlacedCorner[];
  for (const p of placed) if (!order.includes(p.templateCornerId)) ordered.push(p);

  const filteredPalette = palette.filter(
    (c) => (!q || c.name.toLowerCase().includes(q.toLowerCase())) && (!typeFilter || c.cornerType === typeFilter),
  );

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }
  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const activeIdStr = String(active.id);
    if (activeIdStr.startsWith('p:')) {
      // 팔레트 → 프레임: 추가
      await addCorner(activeIdStr.slice(2));
      return;
    }
    // 배치된 코너 재정렬
    if (active.id !== over.id && order.includes(String(over.id))) {
      const oldIndex = order.indexOf(activeIdStr);
      const newIndex = order.indexOf(String(over.id));
      const next = arrayMove(order, oldIndex, newIndex);
      setOrder(next);
      await reorderCorners(templateId, next);
    }
  }

  const activePalette = activeId?.startsWith('p:') ? palette.find((c) => `p:${c.id}` === activeId) : null;

  return (
    <div className="flex h-full flex-col">
      {/* 상단 바 */}
      <div className="flex items-center gap-3 border-b bg-card px-5 py-3">
        <Link href={`/admin/containers/${meta.containerId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ChevronLeft className="h-4 w-4" /> {meta.containerName}
        </Link>
        <div className="h-4 w-px bg-border" />
        <h1 className="text-sm font-semibold">{meta.name}</h1>
        <Badge>{meta.conditionGroup}</Badge>
        {meta.isDefault && <Badge variant="secondary">기본</Badge>}
        <Badge variant="outline">{DISPLAY_STATUS_LABEL[meta.status as DisplayStatusKey] ?? meta.status}</Badge>
        <div className="ml-auto flex items-center gap-2">
          <Link href={`/admin/templates/${templateId}`} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-secondary">
            <Layers className="h-3.5 w-3.5" /> 코너 내부 편집
          </Link>
          <Link href={`/admin/containers/${meta.containerId}/compare`} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-secondary">
            <Columns className="h-3.5 w-3.5" /> 조건그룹 비교
          </Link>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="grid flex-1 grid-cols-[280px_1fr] overflow-hidden">
          {/* 왼쪽: 팔레트 */}
          <div className="flex flex-col overflow-hidden border-r bg-card">
            <div className="border-b p-3">
              <p className="mb-2 text-sm font-semibold">Corner 팔레트</p>
              <div className="relative mb-2">
                <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름 검색" className="h-8 pl-7 text-xs" />
              </div>
              <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-8 text-xs">
                <option value="">모든 유형</option>
                {CORNER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {filteredPalette.length === 0 && (
                <p className="pt-6 text-center text-xs text-muted-foreground">끌어올 Corner가 없습니다.</p>
              )}
              {filteredPalette.map((c) => (
                <PaletteCard key={c.id} corner={c} onAdd={addCorner} />
              ))}
              <p className="pt-2 text-center text-[11px] text-muted-foreground">프레임으로 드래그하거나 카드를 클릭해 추가</p>
            </div>
          </div>

          {/* 가운데: 디바이스 프레임 */}
          <div className="flex flex-col overflow-hidden bg-background">
            <div className="flex items-center justify-center gap-2 border-b bg-card py-2">
              {DEVICES.map((d) => (
                <button
                  key={d.key}
                  onClick={() => setDevice(d)}
                  className={`rounded-md px-3 py-1 text-xs font-medium ${device.key === d.key ? 'bg-primary text-primary-foreground' : 'border hover:bg-secondary'}`}
                >
                  {d.label} <span className="opacity-70">{d.w}×{d.h}</span>
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div
                ref={setFrameRef}
                className={`mx-auto w-fit rounded-[2.4rem] ${isOver ? 'ring-4 ring-primary/40' : ''}`}
              >
                <DeviceFrame width={device.w} bodyHeight={device.h - 150} headerLabel={meta.containerName}>
                  <SortableContext items={order} strategy={verticalListSortingStrategy}>
                    {ordered.length === 0 ? (
                      <div className="flex h-full items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
                        왼쪽 팔레트에서 Corner를<br />이 영역으로 드래그하세요
                      </div>
                    ) : (
                      ordered.map((c) => <PlacedCornerCard key={c.templateCornerId} corner={c} templateId={templateId} />)
                    )}
                  </SortableContext>
                </DeviceFrame>
              </div>
            </div>
          </div>
        </div>

        <DragOverlay>
          {activePalette ? (
            <div className="rounded-md border bg-card p-2 shadow-lg">
              <span className="text-sm font-medium">{activePalette.name}</span>
              <Badge variant="outline" className="ml-1.5">
                {activePalette.cornerType}
              </Badge>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
