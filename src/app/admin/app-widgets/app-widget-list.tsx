'use client';

// SB BO-AIM-DSP-PG007 — App 위젯 관리 목록
//   검색(검색항목+검색어, 노출상태, 노출기간, 승인상태) + 목록(No 드래그·위젯ID·위젯유형·배너캠페인명·노출상태·노출기간·승인상태·최종수정자/일시) + Redis/순서저장/등록.
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { StatusPill, FilterPanel, ListHeader, ListBottom, THEAD_TR_CLS, TBODY_TR_CLS } from '@/components/ops-ui';
import { fmtPeriod, fmtDateTime } from '@/lib/widget-taxonomy';
import { exposeStatus } from './widget-helpers';
import { reorderAppWidgets, redisReloadAppWidgets } from './actions';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export type WidgetRow = {
  id: string;
  widgetCode: string;
  displayOrder: number;
  bannerName: string;
  widgetTypeName: string | null;
  approvalStatus: string;
  approvalLabel: string;
  exposeYn: boolean;
  publishStart: string | null;
  publishEnd: string | null;
  updatedBy: string | null;
  updatedAt: string;
};

const PER_PAGE = 10;
// 노출상태 배지 톤
const EXPOSE_TONE: Record<string, string> = { 노출중: 'green', 예정: 'blue', 종료: 'slate', 중지: 'amber', 미노출: 'muted' };
// 승인상태 배지 톤
const APPROVAL_TONE: Record<string, string> = { 승인완료: 'green', 승인대기: 'blue', 임시저장: 'muted', 승인반려: 'red', 요청취소: 'amber' };

type ViewRow = WidgetRow & { exposeState: string; no: number };

function SortableRow({ r, onOpen }: { r: ViewRow; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: r.id });
  const style = { transform: CSS.Transform.toString(transform), transition } as React.CSSProperties;
  return (
    <tr ref={setNodeRef} style={style} className={cn(TBODY_TR_CLS, 'text-center', isDragging && 'relative z-10 bg-[#f1f2ff] shadow-lg')}>
      <td className="px-3 py-2">
        <div className="flex items-center justify-center gap-1.5">
          <button type="button" className="cursor-grab touch-none text-slate-300 hover:text-slate-500 active:cursor-grabbing" {...attributes} {...listeners} aria-label="드래그하여 순서 변경"><GripVertical className="h-4 w-4" /></button>
          <span className="tabular-nums text-slate-500">{r.no}</span>
        </div>
      </td>
      <td className="cursor-pointer px-3 py-2 tabular-nums text-slate-700 hover:text-[#3617ce]" onClick={onOpen}>{r.widgetCode}</td>
      <td className="px-3 py-2 text-slate-700">{r.widgetTypeName ?? '-'}</td>
      <td className="cursor-pointer px-3 py-2 text-slate-800 hover:text-[#3617ce]" onClick={onOpen}>{r.bannerName || '-'}</td>
      <td className="px-3 py-2">{r.exposeState === '미노출' ? <span className="text-slate-400">미노출</span> : <StatusPill label={r.exposeState} tone={EXPOSE_TONE[r.exposeState] ?? 'muted'} />}</td>
      <td className="px-3 py-2 text-slate-500">{fmtPeriod(r.publishStart, r.publishEnd)}</td>
      <td className="px-3 py-2"><StatusPill label={r.approvalLabel} tone={APPROVAL_TONE[r.approvalLabel] ?? 'muted'} /></td>
      <td className="px-3 py-2 text-slate-600">{r.updatedBy ?? '-'}</td>
      <td className="px-3 py-2 text-slate-500">{fmtDateTime(r.updatedAt)}</td>
    </tr>
  );
}

const SEARCH_PH: Record<string, string> = {
  위젯ID: '위젯 ID를 입력하세요. 예: WE-202604-001', 배너캠페인명: '배너 캠페인명을 입력하세요', 최종수정자: '최종 수정자 이름을 입력하세요',
};

export function AppWidgetList({ rows }: { rows: WidgetRow[] }) {
  const router = useRouter();
  const [field, setField] = useState('위젯ID');
  const [kw, setKw] = useState('');
  const [exp, setExp] = useState('');
  const [appr, setAppr] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [applied, setApplied] = useState({ field: '위젯ID', kw: '', exp: '', appr: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [pending, start] = useTransition();
  const [reloadOpen, setReloadOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const byId = useMemo(() => Object.fromEntries(rows.map((r) => [r.id, r])), [rows]);
  const initialOrder = useMemo(() => [...rows].sort((a, b) => b.displayOrder - a.displayOrder).map((r) => r.id), [rows]);
  const [orderedIds, setOrderedIds] = useState<string[]>(initialOrder);
  const dirty = useMemo(() => orderedIds.join(',') !== initialOrder.join(','), [orderedIds, initialOrder]);

  const expOf = (r: WidgetRow) => exposeStatus(r.approvalStatus, r.exposeYn, r.publishStart ? new Date(r.publishStart) : null, r.publishEnd ? new Date(r.publishEnd) : null);

  const matchedIds = useMemo(() => {
    const f = applied;
    return new Set(rows.filter((r) => {
      if (f.exp && expOf(r) !== f.exp) return false;
      if (f.appr && r.approvalLabel !== f.appr) return false;
      if (f.kw.trim()) {
        const q = f.kw.trim().toLowerCase();
        const hay = f.field === '배너캠페인명' ? r.bannerName : f.field === '최종수정자' ? (r.updatedBy ?? '') : r.widgetCode;
        if (!hay.toLowerCase().includes(q)) return false;
      }
      if (f.from && (r.publishEnd ?? r.publishStart ?? '') < f.from) return false;
      if (f.to && (r.publishStart ?? r.publishEnd ?? '') > f.to + 'T23:59') return false;
      return true;
    }).map((r) => r.id));
  }, [rows, applied]);

  const orderedView: ViewRow[] = useMemo(() =>
    orderedIds
      .map((id, idx) => ({ id, no: orderedIds.length - idx }))
      .filter((o) => byId[o.id] && matchedIds.has(o.id))
      .map((o) => ({ ...byId[o.id], exposeState: expOf(byId[o.id]), no: o.no })),
  [orderedIds, byId, matchedIds]);

  const totalPages = Math.max(1, Math.ceil(orderedView.length / PER_PAGE));
  const pageRows = orderedView.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const doSearch = () => { setApplied({ field, kw, exp, appr, from, to }); setPage(1); };
  const doReset = () => { setField('위젯ID'); setKw(''); setExp(''); setAppr(''); setFrom(''); setTo(''); setApplied({ field: '위젯ID', kw: '', exp: '', appr: '', from: '', to: '' }); setPage(1); };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setOrderedIds((ids) => {
      const oi = ids.indexOf(String(active.id)), ni = ids.indexOf(String(over.id));
      if (oi < 0 || ni < 0) return ids;
      return arrayMove(ids, oi, ni);
    });
  };
  const saveOrder = () => {
    const n = orderedIds.length;
    const orders = orderedIds.map((id, i) => ({ id, order: n - i }));
    start(async () => { await reorderAppWidgets(orders); alert('저장되었습니다.'); router.refresh(); });
  };
  const redisReload = () => setReloadOpen(true);

  return (
    <div>
      {/* 검색 영역 */}
      <div className="mt-6">
        <FilterPanel
          rows={[
            [
              ['검색 항목', (
                <span key="sf" className="rng">
                  <Select value={field} onChange={(e) => { setField(e.target.value); setKw(''); }}>{['위젯ID', '배너캠페인명', '최종수정자'].map((o) => <option key={o}>{o}</option>)}</Select>
                  <Input value={kw} onChange={(e) => setKw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch()} placeholder={SEARCH_PH[field]} className="w-[220px]" />
                </span>
              ), 2],
              ['노출상태', <Select key="ex" value={exp} onChange={(e) => setExp(e.target.value)}><option value="">전체</option>{['예정', '노출중', '종료', '중지'].map((o) => <option key={o}>{o}</option>)}</Select>],
              ['승인상태', <Select key="ap" value={appr} onChange={(e) => setAppr(e.target.value)}><option value="">전체</option>{['승인대기', '승인완료', '승인반려', '요청취소', '임시저장'].map((o) => <option key={o}>{o}</option>)}</Select>],
              ['노출기간', (
                <span key="pd" className="rng">
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                  <span className="text-[var(--ink3)]">~</span>
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </span>
              )],
            ],
          ]}
          onReset={doReset}
          onSearch={doSearch}
        />
      </div>

      <ListHeader title="조회 결과" count={orderedView.length} right={dirty ? <span className="text-[12px] font-medium text-amber-600">순서가 변경되었습니다. ‘순서저장’을 눌러 반영하세요.</span> : undefined} />

      <div className="overflow-x-auto border-t border-[#dce0e5]">
        <table className="w-full min-w-[1180px] text-[13px] font-normal whitespace-nowrap">
          <thead>
            <tr className={THEAD_TR_CLS}>
              {['No.', '위젯 ID', '위젯 유형', '배너 캠페인명', '노출상태', '노출 기간', '승인상태', '최종 수정자', '최종 수정일시'].map((h) => (
                <th key={h} className="h-11 px-3 text-center font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={pageRows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr><td colSpan={9} className="px-3 py-16 text-center text-slate-400">등록 및 조회 결과가 없습니다.</td></tr>
                ) : pageRows.map((r) => (
                  <SortableRow key={r.id} r={r} onOpen={() => router.push(`/admin/app-widgets/${r.id}`)} />
                ))}
              </tbody>
            </SortableContext>
          </DndContext>
        </table>
      </div>

      <ListBottom page={page} totalPages={totalPages} onPageChange={setPage}>
        <Button type="button" variant="outline" onClick={redisReload} disabled={pending}>Redis Reload</Button>
        <Button type="button" variant="outline" onClick={saveOrder} disabled={pending || !dirty}>순서저장</Button>
        <Button type="button" onClick={() => router.push('/admin/app-widgets/new')}>등록</Button>
      </ListBottom>

      {reloadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setReloadOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[15px] font-bold text-slate-900">현재 변경된 최신 데이터를 Redis 캐시에 업데이트하시겠습니까?</h3>
            <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500">승인 완료된 변경 사항을 캐시(Redis) 갱신으로 프론트 화면에 즉시 반영합니다. 미승인 변경은 반영 대상에서 제외됩니다.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setReloadOpen(false)} className="h-9 rounded-lg border border-[#dce0e5] bg-white px-4 text-[13px] font-medium text-slate-600 hover:bg-[#f8f9fb]">취소</button>
              <button onClick={() => { setReloadOpen(false); start(async () => { await redisReloadAppWidgets(); }); }} className="h-9 rounded-lg bg-[#3617ce] px-5 text-[13px] font-semibold text-white hover:brightness-110">확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
