'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { StatusPill, FilterPanel, ListHeader, THEAD_TR_CLS } from '@/components/ops-ui';
import { PUBLISH_STATUS, PUBLISH_STATUS_OPTIONS, DEPLOY_STATUS, fmtPeriod, fmtDateTime, computePublishStatus, type PublishStatus } from '@/lib/widget-taxonomy';
import { reorderAppWidgets, redisReloadAppWidgets } from './actions';
import { cn } from '@/lib/utils';
import { RotateCcw, Search, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export type WidgetRow = {
  id: string;
  displayOrder: number;
  bannerName: string;
  widgetTypeId: string | null;
  widgetTypeName: string | null;
  approvalLabel: string;
  exposeYn: boolean;
  deployStatus: string;
  publishStart: string | null;
  publishEnd: string | null;
  updatedBy: string | null;
  updatedAt: string;
};

const PER_PAGE = 10;
// 승인상태 배지 톤 (ops-ui StatusPill)
const APPROVAL_TONE: Record<string, string> = { 승인완료: 'green', 승인요청: 'blue', 임시저장: 'slate', 반려: 'red', 요청취소: 'amber' };

type ViewRow = WidgetRow & { publishStatus: PublishStatus; rank: number };

// 드래그 가능한 목록 행 — 노출순서 셀에 드래그 핸들. 배너명 클릭 시 상세로 이동.
function SortableRow({ r, onOpen }: { r: ViewRow; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: r.id });
  const ps = PUBLISH_STATUS[r.publishStatus];
  const style = { transform: CSS.Transform.toString(transform), transition } as React.CSSProperties;
  return (
    <tr ref={setNodeRef} style={style} className={cn('border-b border-[#e6e7ec] hover:bg-[#f6f7f9] [&>td]:h-11', isDragging && 'relative z-10 bg-[#efedfe] shadow-lg')}>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1.5">
          <button type="button" className="cursor-grab touch-none text-slate-300 hover:text-slate-500 active:cursor-grabbing" {...attributes} {...listeners} aria-label="드래그하여 순서 변경">
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="tabular-nums text-slate-700">{r.rank}</span>
        </div>
      </td>
      <td className="px-3 py-2 text-slate-700">{r.widgetTypeName ?? '-'}</td>
      <td className="px-3 py-2"><StatusPill label={r.approvalLabel} tone={APPROVAL_TONE[r.approvalLabel] ?? 'slate'} /></td>
      <td className="px-3 py-2"><StatusPill label={ps.label} tone={ps.tone} dot={r.publishStatus === 'live' || r.publishStatus === 'unpublished'} /></td>
      <td className="px-3 py-2 text-slate-600">{DEPLOY_STATUS[r.deployStatus as keyof typeof DEPLOY_STATUS]?.label ?? r.deployStatus}</td>
      <td className="cursor-pointer px-3 py-2 text-slate-800 hover:text-[#3a2fd8]" onClick={onOpen}>{r.bannerName}</td>
      <td className="px-3 py-2 text-slate-500">{fmtPeriod(r.publishStart, r.publishEnd)}</td>
      <td className="px-3 py-2 text-slate-600">{r.updatedBy ?? '-'}</td>
      <td className="px-3 py-2 text-slate-500">{fmtDateTime(r.updatedAt)}</td>
    </tr>
  );
}

export function AppWidgetList({ rows, widgetTypes }: { rows: WidgetRow[]; widgetTypes: { id: string; name: string }[] }) {
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [typeId, setTypeId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [name, setName] = useState('');
  const [applied, setApplied] = useState({ status: '', typeId: '', from: '', to: '', name: '' });
  const [page, setPage] = useState(1);
  const [pending, start] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const byId = useMemo(() => Object.fromEntries(rows.map((r) => [r.id, r])), [rows]);
  // 노출순서(displayOrder) 내림차순 = 위가 우선. orderedIds가 현재(드래그 반영) 순서의 원본.
  const initialOrder = useMemo(() => [...rows].sort((a, b) => b.displayOrder - a.displayOrder).map((r) => r.id), [rows]);
  const [orderedIds, setOrderedIds] = useState<string[]>(initialOrder);
  const dirty = useMemo(() => orderedIds.join(',') !== initialOrder.join(','), [orderedIds, initialOrder]);

  const statusOf = (r: WidgetRow) => computePublishStatus(r.exposeYn, r.publishStart ? new Date(r.publishStart) : null, r.publishEnd ? new Date(r.publishEnd) : null) as PublishStatus;

  // 검색 필터를 통과하는 id 집합
  const matchedIds = useMemo(() => {
    const f = applied;
    return new Set(rows.filter((r) => {
      if (f.status && statusOf(r) !== f.status) return false;
      if (f.typeId && r.widgetTypeId !== f.typeId) return false;
      if (f.name && !r.bannerName.toLowerCase().includes(f.name.toLowerCase())) return false;
      if (f.from && (r.publishEnd ?? r.publishStart ?? '') < f.from) return false;
      if (f.to && (r.publishStart ?? r.publishEnd ?? '') > f.to + 'T23:59') return false;
      return true;
    }).map((r) => r.id));
  }, [rows, applied]);

  // 화면 순서 = orderedIds에서 검색 통과분만. rank는 전체 순서 기준 위치(1부터).
  const orderedView: ViewRow[] = useMemo(() =>
    orderedIds
      .map((id, idx) => ({ id, rank: idx + 1 }))
      .filter((o) => byId[o.id] && matchedIds.has(o.id))
      .map((o) => ({ ...byId[o.id], publishStatus: statusOf(byId[o.id]), rank: o.rank })),
  [orderedIds, byId, matchedIds]);

  const totalPages = Math.max(1, Math.ceil(orderedView.length / PER_PAGE));
  const pageRows = orderedView.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const doSearch = () => { setApplied({ status, typeId, from, to, name }); setPage(1); };
  const doReset = () => { setStatus(''); setTypeId(''); setFrom(''); setTo(''); setName(''); setApplied({ status: '', typeId: '', from: '', to: '', name: '' }); setPage(1); };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setOrderedIds((ids) => {
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return ids;
      return arrayMove(ids, oldIndex, newIndex);
    });
  };

  const saveOrder = () => {
    // 화면 위(=rank 1)가 가장 큰 displayOrder → 내림차순 정렬 시 순서 유지.
    const n = orderedIds.length;
    const orders = orderedIds.map((id, i) => ({ id, order: n - i }));
    start(async () => {
      await reorderAppWidgets(orders);
      alert('저장되었습니다.');
      router.refresh();
    });
  };
  const redisReload = () => start(async () => { await redisReloadAppWidgets(); alert('Redis Reload 요청되었습니다. (배포 공통 프로세스 확정 후 실제 연동)'); });

  return (
    <div>
      {/* 검색 영역 — 참고 디자인 .ft 폼 테이블 + .sbtn */}
      <div className="mt-6">
        <FilterPanel
          rows={[
            [
              ['게시상태', (
                <Select key="st" value={status} onChange={(e) => setStatus(e.target.value)} className="w200">
                  <option value="">전체</option>
                  {PUBLISH_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              )],
              ['위젯유형', (
                <Select key="ty" value={typeId} onChange={(e) => setTypeId(e.target.value)} className="w200">
                  <option value="">전체</option>
                  {widgetTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
              )],
            ],
            [
              ['게시기간', (
                <span key="pd" className="rng">
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[150px]" />
                  <span className="text-[var(--ink3)]">~</span>
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[150px]" />
                </span>
              )],
              ['배너명', (
                <Input key="nm" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch()} placeholder="배너명을 입력하세요" className="w-[340px] max-w-full" />
              )],
            ],
          ]}
          onReset={doReset}
          onSearch={doSearch}
        />
      </div>

      {/* 테이블 정보 */}
      <ListHeader
        title="조회결과"
        count={orderedView.length}
        right={
          <>
            {dirty && <span className="text-[12px] font-medium text-amber-600">순서가 변경되었습니다. ‘순서저장’을 눌러 반영하세요.</span>}
          </>
        }
      />

      {/* 목록 — 드래그앤드롭 순서 변경 */}
      <div className="overflow-x-auto border-t border-[#e6e7ec]">
        <table className="w-full min-w-[1120px] text-[13px] font-normal whitespace-nowrap">
          <thead>
            <tr className={THEAD_TR_CLS}>
              <th className="w-24 h-11 px-3 text-left font-semibold">노출순서</th>
              <th className="h-11 px-3 text-left font-semibold">위젯유형</th>
              <th className="w-24 h-11 px-3 text-left font-semibold">승인상태</th>
              <th className="w-24 h-11 px-3 text-left font-semibold">게시상태</th>
              <th className="w-24 h-11 px-3 text-left font-semibold">배포상태</th>
              <th className="h-11 px-3 text-left font-semibold">배너명</th>
              <th className="h-11 px-3 text-left font-semibold">게시기간</th>
              <th className="h-11 px-3 text-left font-semibold">최근 수정자</th>
              <th className="h-11 px-3 text-left font-semibold">최근 수정일시</th>
            </tr>
          </thead>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={pageRows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr><td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">조회 결과가 없습니다.</td></tr>
                ) : pageRows.map((r) => (
                  <SortableRow key={r.id} r={r} onOpen={() => router.push(`/admin/app-widgets/${r.id}`)} />
                ))}
              </tbody>
            </SortableContext>
          </DndContext>
        </table>
      </div>

      {/* 페이지네이션 + 액션 — 표에서 32px 띄운다(목록 공통 규격) */}
      <div className="mt-8 flex items-center justify-between">
        <div className="flex items-center gap-1 text-sm">
          {totalPages > 1 && Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 10).map((p) => (
            <button key={p} onClick={() => setPage(p)} className={`h-8 w-8 rounded-md text-xs ${p === page ? 'bg-[#3a2fd8] text-white' : 'hover:bg-secondary'}`}>{p}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={redisReload} disabled={pending}>Redis Reload</Button>
          <Button type="button" variant="outline" onClick={saveOrder} disabled={pending || !dirty}>순서저장</Button>
          <Button type="button" onClick={() => router.push('/admin/app-widgets/new')}>등록</Button>
        </div>
      </div>
    </div>
  );
}
