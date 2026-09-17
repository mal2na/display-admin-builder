// 위젯 유형 관리 상세(수정) · 운영 관리
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { WidgetTypeForm } from '../widget-type-form';
import { updateWidgetType } from '../actions';
import { OpsSection, FieldRow, ReadValue, StatusPill } from '@/components/ops-ui';
import { APPROVAL_STATUS, fmtDateTime } from '@/lib/widget-taxonomy';

export const dynamic = 'force-dynamic';

export default async function WidgetTypeDetailPage({ params }: { params: { id: string } }) {
  const t = await prisma.widgetType.findUnique({ where: { id: params.id } });
  if (!t) notFound();
  const ap = APPROVAL_STATUS[t.approvalStatus as keyof typeof APPROVAL_STATUS] ?? APPROVAL_STATUS.draft;

  const approvalSection = (
    <OpsSection no={1} title="승인 정보">
      <div className="grid grid-cols-2">
        <FieldRow label="승인 요청자"><ReadValue value={t.approvalRequester ?? '-'} /></FieldRow>
        <FieldRow label="승인 요청일"><ReadValue value={fmtDateTime(t.approvalRequestedAt)} /></FieldRow>
        <FieldRow label="승인 담당자"><ReadValue value={t.approvalManager ?? '-'} /></FieldRow>
        <FieldRow label="승인 처리일"><ReadValue value={fmtDateTime(t.approvalProcessedAt)} /></FieldRow>
        <FieldRow label="승인 상태"><StatusPill label={ap.label} tone={ap.tone} /></FieldRow>
      </div>
    </OpsSection>
  );
  const managerSection = (
    <OpsSection no={4} title="담당자 정보">
      <div className="grid grid-cols-2">
        <FieldRow label="등록자"><ReadValue value={t.createdBy ?? '-'} /></FieldRow>
        <FieldRow label="등록일시"><ReadValue value={fmtDateTime(t.createdAt)} /></FieldRow>
        <FieldRow label="최근 수정자"><ReadValue value={t.updatedBy ?? '-'} /></FieldRow>
        <FieldRow label="최근 수정일시"><ReadValue value={fmtDateTime(t.updatedAt)} /></FieldRow>
      </div>
    </OpsSection>
  );

  return (
    <div className="mx-auto max-w-5xl p-6">
      <nav className="mb-1 text-[12px] text-muted-foreground">홈 › 운영 관리 › 위젯 유형 관리 › 위젯 유형 상세</nav>
      <h1 className="mb-3 text-2xl font-bold">위젯 유형 관리 상세</h1>
      <div className="mb-5 flex gap-5 border-b text-sm">
        <span className="-mb-px border-b-2 border-indigo-600 pb-2 font-semibold text-indigo-700">상세정보</span>
        <span className="pb-2 text-muted-foreground">변경/승인이력</span>
      </div>
      <WidgetTypeForm
        mode="edit"
        action={updateWidgetType.bind(null, t.id)}
        topExtra={approvalSection}
        bottomExtra={managerSection}
        value={{
          typeName: t.typeName, description: t.description, useYn: t.useYn, typeCode: t.typeCode,
          osType: t.osType, sizeLabel: t.sizeLabel, nativeWidgetId: t.nativeWidgetId, widgetSpec: t.widgetSpec, bannerArea: t.bannerArea,
        }}
      />
    </div>
  );
}
