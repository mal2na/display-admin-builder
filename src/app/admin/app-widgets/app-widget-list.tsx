'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { StatusPill } from '@/components/ops-ui';
import { PUBLISH_STATUS, PUBLISH_STATUS_OPTIONS, DEPLOY_STATUS, fmtPeriod, fmtDateTime, computePublishStatus, type PublishStatus } from '@/lib/widget-taxonomy';
import { reorderAppWidgets, redisReloadAppWidgets } from './actions';
import { RotateCcw, Search } from 'lucide-react';

export type WidgetRow = {
  id: string;
  displayOrder: number;
  bannerName: string;
  widgetTypeId: string | null;
  widgetTypeName: string | null;
  exposeYn: boolean;
  deployStatus: string;
  publishStart: string | null;
  publishEnd: string | null;
  updatedBy: string | null;
  updatedAt: string;
};

const PER_PAGE = 10;

export function AppWidgetList({ rows, widgetTypes }: { rows: WidgetRow[]; widgetTypes: { id: string; name: string }[] }) {
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [typeId, setTypeId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [name, setName] = useState('');
  const [applied, setApplied] = useState({ status: '', typeId: '', from: '', to: '', name: '' });
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<Record<string, number>>(() => Object.fromEntries(rows.map((r) => [r.id, r.displayOrder])));
  const [pending, start] = useTransition();

  const withStatus = useMemo(
    () => rows.map((r) => ({ ...r, publishStatus: computePublishStatus(r.exposeYn, r.publishStart ? new Date(r.publishStart) : null, r.publishEnd ? new Date(r.publishEnd) : null) as PublishStatus })),
    [rows],
  );

  const filtered = useMemo(() => {
    const f = applied;
    return withStatus
      .filter((r) => (f.status ? r.publishStatus === f.status : true))
      .filter((r) => (f.typeId ? r.widgetTypeId === f.typeId : true))
      .filter((r) => (f.name ? r.bannerName.toLowerCase().includes(f.name.toLowerCase()) : true))
      .filter((r) => (f.from ? (r.publishEnd ?? r.publishStart ?? '') >= f.from : true))
      .filter((r) => (f.to ? (r.publishStart ?? r.publishEnd ?? '') <= f.to + 'T23:59' : true))
      .sort((a, b) => (orders[b.id] ?? 0) - (orders[a.id] ?? 0));
  }, [withStatus, applied, orders]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageRows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const doSearch = () => { setApplied({ status, typeId, from, to, name }); setPage(1); };
  const doReset = () => { setStatus(''); setTypeId(''); setFrom(''); setTo(''); setName(''); setApplied({ status: '', typeId: '', from: '', to: '', name: '' }); setPage(1); };

  const saveOrder = () => start(async () => { await reorderAppWidgets(Object.entries(orders).map(([id, order]) => ({ id, order: Number(order) || 0 }))); alert('저장되었습니다.'); router.refresh(); });
  const redisReload = () => start(async () => { await redisReloadAppWidgets(); alert('Redis Reload 요청되었습니다. (배포 공통 프로세스 확정 후 실제 연동)'); });

  return (
    <div className="space-y-4">
      {/* 검색 영역 */}
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-[12px] text-muted-foreground">게시상태
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 w-32 text-sm">
              <option value="">전체</option>
              {PUBLISH_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-muted-foreground">위젯유형
            <Select value={typeId} onChange={(e) => setTypeId(e.target.value)} className="h-9 w-44 text-sm">
              <option value="">전체</option>
              {widgetTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-muted-foreground">게시기간
            <div className="flex items-center gap-1">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-36 text-sm" />
              <span className="text-muted-foreground">-</span>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-36 text-sm" />
            </div>
          </label>
          <label className="flex flex-1 flex-col gap-1 text-[12px] text-muted-foreground">배너명
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="배너명을 입력하세요" className="h-9 text-sm" />
          </label>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={doReset}><RotateCcw className="mr-1 h-3.5 w-3.5" />초기화</Button>
            <Button type="button" onClick={doSearch}><Search className="mr-1 h-3.5 w-3.5" />조회</Button>
          </div>
        </div>
      </div>

      {/* 테이블 정보 */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">App 위젯 관리 목록 <span className="text-indigo-600">{filtered.length}건</span></p>
      </div>

      {/* 목록 */}
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-[12px] text-slate-500">
              <th className="w-24 px-3 py-2.5 text-left font-medium">노출순서</th>
              <th className="px-3 py-2.5 text-left font-medium">배너명</th>
              <th className="px-3 py-2.5 text-left font-medium">위젯유형</th>
              <th className="w-24 px-3 py-2.5 text-left font-medium">게시상태</th>
              <th className="w-24 px-3 py-2.5 text-left font-medium">배포상태</th>
              <th className="px-3 py-2.5 text-left font-medium">게시기간</th>
              <th className="px-3 py-2.5 text-left font-medium">최근 수정자</th>
              <th className="px-3 py-2.5 text-left font-medium">최근 수정일시</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">조회 결과가 없습니다.</td></tr>
            ) : pageRows.map((r) => {
              const ps = PUBLISH_STATUS[r.publishStatus];
              const canEditOrder = r.deployStatus === 'done'; // 배포되어야 저장 반영
              return (
                <tr key={r.id} className="border-b last:border-b-0 hover:bg-slate-50/60">
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <Input value={orders[r.id] ?? 0} onChange={(e) => setOrders((o) => ({ ...o, [r.id]: Number(e.target.value.replace(/\D/g, '')) || 0 }))}
                      disabled={!canEditOrder} title={canEditOrder ? undefined : '배포완료 건만 순서 저장 가능'} className="h-8 w-16 text-center text-xs disabled:bg-slate-100" />
                  </td>
                  <td className="cursor-pointer px-3 py-2 font-medium text-slate-800" onClick={() => router.push(`/admin/app-widgets/${r.id}`)}>{r.bannerName}</td>
                  <td className="px-3 py-2 text-slate-600">{r.widgetTypeName ?? '-'}</td>
                  <td className="px-3 py-2"><StatusPill label={ps.label} tone={ps.tone} dot={r.publishStatus === 'live' || r.publishStatus === 'unpublished'} /></td>
                  <td className="px-3 py-2 text-slate-600">{DEPLOY_STATUS[r.deployStatus as keyof typeof DEPLOY_STATUS]?.label ?? r.deployStatus}</td>
                  <td className="px-3 py-2 text-[12px] text-slate-500">{fmtPeriod(r.publishStart, r.publishEnd)}</td>
                  <td className="px-3 py-2 text-slate-600">{r.updatedBy ?? '-'}</td>
                  <td className="px-3 py-2 text-[12px] text-slate-500">{fmtDateTime(r.updatedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 + 액션 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-sm">
          {totalPages > 1 && Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 10).map((p) => (
            <button key={p} onClick={() => setPage(p)} className={`h-8 w-8 rounded-md text-xs ${p === page ? 'bg-indigo-600 text-white' : 'hover:bg-secondary'}`}>{p}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={redisReload} disabled={pending}>Redis Reload</Button>
          <Button type="button" variant="outline" onClick={saveOrder} disabled={pending}>순서저장</Button>
          <Button type="button" onClick={() => router.push('/admin/app-widgets/new')}>등록</Button>
        </div>
      </div>
    </div>
  );
}
