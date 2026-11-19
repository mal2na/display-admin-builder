// App 위젯 수정 (SB BO-AIM-DSP-PG051) · 운영 관리
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { AppWidgetForm } from '../../app-widget-form';
import { updateAppWidget } from '../../actions';
import { bannersForPick, widgetCodeOf } from '../../widget-code-server';
import { PageHeader } from '@/components/page-header';

export const dynamic = 'force-dynamic';

export default async function AppWidgetEditPage({ params }: { params: { id: string } }) {
  const [w, types, banners] = await Promise.all([
    prisma.appWidget.findUnique({ where: { id: params.id } }),
    prisma.widgetType.findMany({ orderBy: { createdAt: 'asc' }, select: { id: true, typeName: true } }),
    bannersForPick(),
  ]);
  if (!w) notFound();
  const widgetCode = await widgetCodeOf(w.createdAt);
  const banner = banners.find((b) => b.id === w.targetCampaignId) ?? null;

  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader
        trail={['운영관리', 'App 위젯 관리', 'App 위젯 수정']}
        title="App 위젯 수정"
      />
      <div className="mt-6" />
      <AppWidgetForm
        action={updateAppWidget.bind(null, w.id)}
        widgetTypes={types.map((t) => ({ id: t.id, name: t.typeName }))}
        banners={banners}
        value={{
          widgetCode,
          widgetTypeId: w.widgetTypeId,
          exposeYn: w.exposeYn,
          publishStart: w.publishStart?.toISOString() ?? null,
          publishEnd: w.publishEnd?.toISOString() ?? null,
          noEnd: !w.publishEnd,
          banner,
        }}
      />
    </div>
  );
}
