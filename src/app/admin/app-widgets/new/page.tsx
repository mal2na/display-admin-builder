// SB-ETC-096 App 위젯 관리 등록 · 운영 관리
import { prisma } from '@/lib/prisma';
import { AppWidgetForm } from '../app-widget-form';
import { createAppWidget } from '../actions';

export const dynamic = 'force-dynamic';

export default async function AppWidgetNewPage() {
  const types = await prisma.widgetType.findMany({ where: { useYn: true }, orderBy: { createdAt: 'asc' }, select: { id: true, typeName: true } });
  return (
    <div className="mx-auto max-w-5xl p-6">
      <nav className="mb-1 text-[12px] text-muted-foreground">홈 › 운영 관리 › App 위젯 관리 › App 위젯 관리 등록</nav>
      <h1 className="mb-5 text-2xl font-bold">App 위젯 관리 등록</h1>
      <AppWidgetForm mode="new" action={createAppWidget} widgetTypes={types.map((t) => ({ id: t.id, name: t.typeName }))} />
    </div>
  );
}
