// SB-ETC-076 App 위젯 관리 목록 · 운영 관리 · 정책 AIM
import { prisma } from '@/lib/prisma';
import { AppWidgetList, type WidgetRow } from './app-widget-list';
import { WidgetTabs } from './widget-tabs';

export const dynamic = 'force-dynamic';

export default async function AppWidgetsPage() {
  const [rows, types] = await Promise.all([
    prisma.appWidget.findMany({ orderBy: { displayOrder: 'desc' }, include: { widgetType: { select: { typeName: true } } } }),
    prisma.widgetType.findMany({ orderBy: { createdAt: 'asc' }, select: { id: true, typeName: true } }),
  ]);

  const APPROVAL_LABEL: Record<string, string> = { draft: '임시저장', requested: '승인요청', approved: '승인완료', rejected: '반려', cancelled: '요청취소' };
  const data: WidgetRow[] = rows.map((r) => ({
    id: r.id,
    displayOrder: r.displayOrder,
    bannerName: r.bannerName,
    widgetTypeId: r.widgetTypeId,
    widgetTypeName: r.widgetType?.typeName ?? null,
    approvalLabel: APPROVAL_LABEL[r.approvalStatus] ?? r.approvalStatus,
    exposeYn: r.exposeYn,
    deployStatus: r.deployStatus,
    publishStart: r.publishStart?.toISOString() ?? null,
    publishEnd: r.publishEnd?.toISOString() ?? null,
    updatedBy: r.updatedBy,
    updatedAt: r.updatedAt.toISOString(),
  }));

  return (
    <div className="px-8 py-6">
      <nav className="mb-1 text-[12px] text-slate-400">홈 › 운영 관리 › App 위젯 관리</nav>
      <h1 className="mb-4 text-[22px] font-bold text-slate-900">App 위젯 관리</h1>
      <WidgetTabs />
      <AppWidgetList rows={data} widgetTypes={types.map((t) => ({ id: t.id, name: t.typeName }))} />
    </div>
  );
}
