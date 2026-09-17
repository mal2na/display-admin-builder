// 위젯 유형 관리 목록 · 운영 관리
import { prisma } from '@/lib/prisma';
import { WidgetTypeList, type TypeRow } from './widget-type-list';

export const dynamic = 'force-dynamic';

export default async function WidgetTypesPage() {
  const rows = await prisma.widgetType.findMany({ orderBy: { updatedAt: 'desc' } });
  const data: TypeRow[] = rows.map((r) => ({
    id: r.id, typeName: r.typeName, description: r.description, useYn: r.useYn,
    updatedBy: r.updatedBy, updatedAt: r.updatedAt.toISOString(),
  }));
  return (
    <div className="mx-auto max-w-6xl p-6">
      <nav className="mb-1 text-[12px] text-muted-foreground">홈 › 운영 관리 › 위젯 유형 관리</nav>
      <h1 className="mb-5 text-2xl font-bold">위젯 유형 관리</h1>
      <WidgetTypeList rows={data} />
    </div>
  );
}
