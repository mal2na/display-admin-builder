// SB-ETC-076 App 위젯 관리 목록 · 운영 관리 · 정책 AIM
import { prisma } from '@/lib/prisma';
import { AppWidgetList, type WidgetRow } from './app-widget-list';

export const dynamic = 'force-dynamic';

export default async function AppWidgetsPage() {
  const [rows, types] = await Promise.all([
    prisma.appWidget.findMany({ orderBy: { displayOrder: 'desc' }, include: { widgetType: { select: { typeName: true } } } }),
    prisma.widgetType.findMany({ orderBy: { createdAt: 'asc' }, select: { id: true, typeName: true } }),
  ]);

  const data: WidgetRow[] = rows.map((r) => ({
    id: r.id,
    displayOrder: r.displayOrder,
    bannerName: r.bannerName,
    widgetTypeId: r.widgetTypeId,
    widgetTypeName: r.widgetType?.typeName ?? null,
    exposeYn: r.exposeYn,
    deployStatus: r.deployStatus,
    publishStart: r.publishStart?.toISOString() ?? null,
    publishEnd: r.publishEnd?.toISOString() ?? null,
    updatedBy: r.updatedBy,
    updatedAt: r.updatedAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-6xl p-6">
      <nav className="mb-1 text-[12px] text-muted-foreground">홈 › 운영 관리 › App 위젯 관리</nav>
      <h1 className="mb-5 text-2xl font-bold">App 위젯 관리</h1>
      <AppWidgetList rows={data} widgetTypes={types.map((t) => ({ id: t.id, name: t.typeName }))} />
    </div>
  );
}
