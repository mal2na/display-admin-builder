// SB BO-AIM-DSP-PG007 App 위젯 관리 목록 · 운영 관리 · 정책 AIM
import { prisma } from '@/lib/prisma';
import { AppWidgetList, type WidgetRow } from './app-widget-list';
import { buildWidgetCodeMap, WIDGET_APPROVAL_LABEL } from './widget-helpers';
import { PageHeader } from '@/components/page-header';

export const dynamic = 'force-dynamic';

export default async function AppWidgetsPage() {
  const rows = await prisma.appWidget.findMany({ orderBy: { displayOrder: 'desc' }, include: { widgetType: { select: { typeName: true } } } });
  const codeMap = buildWidgetCodeMap(rows.map((r) => ({ id: r.id, createdAt: r.createdAt })));

  const data: WidgetRow[] = rows.map((r) => ({
    id: r.id,
    widgetCode: codeMap[r.id] ?? '-',
    displayOrder: r.displayOrder,
    bannerName: r.bannerName,
    widgetTypeName: r.widgetType?.typeName ?? null,
    approvalStatus: r.approvalStatus,
    approvalLabel: WIDGET_APPROVAL_LABEL[r.approvalStatus] ?? r.approvalStatus,
    exposeYn: r.exposeYn,
    publishStart: r.publishStart?.toISOString() ?? null,
    publishEnd: r.publishEnd?.toISOString() ?? null,
    updatedBy: r.updatedBy,
    updatedAt: r.updatedAt.toISOString(),
  }));

  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader
        trail={['운영관리', 'App 위젯 관리']}
        title="App 위젯 관리"
      />
      <AppWidgetList rows={data} />
    </div>
  );
}
