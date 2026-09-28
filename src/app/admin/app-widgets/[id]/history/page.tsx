// App 위젯 상세 — 변경/승인이력 탭 (SB BO-AIM-DSP-PG052)
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { WidgetDetailTabs } from '../../detail-tabs';
import { WidgetHistoryTable } from '../../widget-history-table';

export const dynamic = 'force-dynamic';

export default async function AppWidgetHistoryPage({ params }: { params: { id: string } }) {
  const w = await prisma.appWidget.findUnique({
    where: { id: params.id },
    include: { history: { orderBy: { seq: 'desc' } } },
  });
  if (!w) notFound();

  const rows = w.history.map((h) => ({
    id: h.id, seq: h.seq, version: h.version, status: h.status,
    requester: h.requester, manager: h.manager,
    requestedAt: h.requestedAt?.toISOString() ?? null,
    requestReason: h.requestReason,
    processedAt: h.processedAt?.toISOString() ?? null,
    processReason: h.processReason,
    changeNote: h.changeNote,
  }));

  return (
    <div className="px-8 py-6">
      <nav className="mb-1 text-[12px] text-muted-foreground">홈 › 운영 관리 › App 위젯 관리 › App 위젯 상세</nav>
      <h1 className="mb-3 text-2xl font-bold">App 위젯 상세</h1>
      <WidgetDetailTabs id={w.id} />
      <p className="mb-2 text-sm font-semibold">{w.bannerName} <span className="ml-1 text-[12px] font-normal text-muted-foreground">변경/승인 이력 {rows.length}건</span></p>
      <WidgetHistoryTable rows={rows} />
    </div>
  );
}
