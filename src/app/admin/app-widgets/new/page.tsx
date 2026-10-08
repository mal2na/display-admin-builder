// SB-ETC-096 App 위젯 관리 등록 · 운영 관리
import { prisma } from '@/lib/prisma';
import { AppWidgetForm } from '../app-widget-form';
import { createAppWidget } from '../actions';
import { PageHeader } from '@/components/page-header';

export const dynamic = 'force-dynamic';

export default async function AppWidgetNewPage() {
  const types = await prisma.widgetType.findMany({ where: { useYn: true }, orderBy: { createdAt: 'asc' }, select: { id: true, typeName: true } });
  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader
        trail={['운영 관리', 'App 위젯 관리', 'App 위젯 관리 등록']}
        title="App 위젯 관리 등록"
      />
      <AppWidgetForm mode="new" action={createAppWidget} widgetTypes={types.map((t) => ({ id: t.id, name: t.typeName }))} />
    </div>
  );
}
