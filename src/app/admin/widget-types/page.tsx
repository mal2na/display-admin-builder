// 위젯 유형 관리 목록 · 운영 관리
import { prisma } from '@/lib/prisma';
import { WidgetTypeList, type TypeRow } from './widget-type-list';
import { WidgetTabs } from '../app-widgets/widget-tabs';
import { PageHeader } from '@/components/page-header';

export const dynamic = 'force-dynamic';

export default async function WidgetTypesPage() {
  const rows = await prisma.widgetType.findMany({ orderBy: { updatedAt: 'desc' } });
  const data: TypeRow[] = rows.map((r) => ({
    id: r.id, typeName: r.typeName, description: r.description, useYn: r.useYn,
    updatedBy: r.updatedBy, updatedAt: r.updatedAt.toISOString(),
  }));
  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader
        trail={['운영 관리', 'App 위젯 관리']}
        title="App 위젯 관리"
      />
      <WidgetTabs />
      <WidgetTypeList rows={data} />
    </div>
  );
}
