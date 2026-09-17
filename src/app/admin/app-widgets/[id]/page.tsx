// SB-ETC-110 App 위젯 관리 상세(수정) · 운영 관리
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { AppWidgetForm } from '../app-widget-form';
import { updateAppWidget } from '../actions';
import { OpsSection, FieldRow, ReadValue, StatusPill } from '@/components/ops-ui';
import { APPROVAL_STATUS, fmtDateTime } from '@/lib/widget-taxonomy';

export const dynamic = 'force-dynamic';

export default async function AppWidgetDetailPage({ params }: { params: { id: string } }) {
  const [w, types] = await Promise.all([
    prisma.appWidget.findUnique({ where: { id: params.id } }),
    prisma.widgetType.findMany({ orderBy: { createdAt: 'asc' }, select: { id: true, typeName: true } }),
  ]);
  if (!w) notFound();
  const ap = APPROVAL_STATUS[w.approvalStatus as keyof typeof APPROVAL_STATUS] ?? APPROVAL_STATUS.draft;

  const approvalSection = (
    <OpsSection no={1} title="승인 정보">
      <div className="grid grid-cols-2">
        <FieldRow label="승인 요청자"><ReadValue value={w.approvalRequester ?? '-'} /></FieldRow>
        <FieldRow label="승인 요청일"><ReadValue value={fmtDateTime(w.approvalRequestedAt)} /></FieldRow>
        <FieldRow label="승인 담당자"><ReadValue value={w.approvalManager ?? '-'} /></FieldRow>
        <FieldRow label="승인 처리일"><ReadValue value={fmtDateTime(w.approvalProcessedAt)} /></FieldRow>
        <FieldRow label="승인 상태"><StatusPill label={ap.label} tone={ap.tone} /></FieldRow>
      </div>
    </OpsSection>
  );
  const managerSection = (
    <OpsSection no={5} title="담당자 정보">
      <div className="grid grid-cols-2">
        <FieldRow label="등록자"><ReadValue value={w.createdBy ?? '-'} /></FieldRow>
        <FieldRow label="등록일시"><ReadValue value={fmtDateTime(w.createdAt)} /></FieldRow>
        <FieldRow label="최근 수정자"><ReadValue value={w.updatedBy ?? '-'} /></FieldRow>
        <FieldRow label="최근 수정일시"><ReadValue value={fmtDateTime(w.updatedAt)} /></FieldRow>
      </div>
    </OpsSection>
  );

  return (
    <div className="mx-auto max-w-5xl p-6">
      <nav className="mb-1 text-[12px] text-muted-foreground">홈 › 운영 관리 › App 위젯 관리 › App 위젯 관리 상세</nav>
      <h1 className="mb-3 text-2xl font-bold">App 위젯 관리 상세</h1>
      {/* 탭 */}
      <div className="mb-5 flex gap-5 border-b text-sm">
        <span className="-mb-px border-b-2 border-indigo-600 pb-2 font-semibold text-indigo-700">상세정보</span>
        <span className="pb-2 text-muted-foreground">변경/승인이력</span>
      </div>
      <AppWidgetForm
        mode="edit"
        action={updateAppWidget.bind(null, w.id)}
        widgetTypes={types.map((t) => ({ id: t.id, name: t.typeName }))}
        topExtra={approvalSection}
        bottomExtra={managerSection}
        value={{
          osType: w.osType, exposeYn: w.exposeYn, widgetTypeId: w.widgetTypeId,
          publishStart: w.publishStart?.toISOString() ?? null, publishEnd: w.publishEnd?.toISOString() ?? null,
          bannerName: w.bannerName, bgColorCode: w.bgColorCode, bannerImageUrl: w.bannerImageUrl, bannerImageAlt: w.bannerImageAlt,
          linkType: w.linkType, linkUrl: w.linkUrl, statCode: w.statCode, landingPosition: w.landingPosition,
          targetCampaignId: w.targetCampaignId, note: w.note,
        }}
      />
    </div>
  );
}
