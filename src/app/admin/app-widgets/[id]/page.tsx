// App 위젯 상세 — 상세정보 탭 (SB BO-AIM-DSP-PG476) · 읽기 전용, 수정은 '수정' 화면에서.
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { OpsSection, FieldRow, ReadValue, StatusPill } from '@/components/ops-ui';
import { APPROVAL_STATUS, EXPOSE_LABEL, LINK_TYPES, fmtDateTime, fmtPeriod } from '@/lib/widget-taxonomy';
import { WidgetDetailTabs } from '../detail-tabs';
import { WidgetDetailActions } from '../detail-actions';

export const dynamic = 'force-dynamic';

export default async function AppWidgetDetailPage({ params }: { params: { id: string } }) {
  const w = await prisma.appWidget.findUnique({ where: { id: params.id }, include: { widgetType: { select: { typeName: true } } } });
  if (!w) notFound();
  const ap = APPROVAL_STATUS[w.approvalStatus as keyof typeof APPROVAL_STATUS] ?? APPROVAL_STATUS.draft;
  const linkLabel = LINK_TYPES.find((l) => l.value === w.linkType)?.label ?? w.linkType;

  return (
    <div className="px-8 py-6">
      <nav className="mb-1 text-[12px] text-muted-foreground">홈 › 운영 관리 › App 위젯 관리 › App 위젯 상세</nav>
      <h1 className="mb-3 text-2xl font-bold">App 위젯 상세</h1>
      <WidgetDetailTabs id={w.id} />

      {/* 승인 정보 */}
      <OpsSection title="승인 정보">
        <div className="grid grid-cols-2">
          <FieldRow label="승인 요청자"><ReadValue value={w.approvalRequester ?? '-'} /></FieldRow>
          <FieldRow label="승인 요청일"><ReadValue value={fmtDateTime(w.approvalRequestedAt)} /></FieldRow>
          <FieldRow label="승인 담당자"><ReadValue value={w.approvalManager ?? '-'} /></FieldRow>
          <FieldRow label="승인 처리일"><ReadValue value={fmtDateTime(w.approvalProcessedAt)} /></FieldRow>
          <FieldRow label="승인 상태"><StatusPill label={ap.label} tone={ap.tone} /></FieldRow>
        </div>
      </OpsSection>

      {/* 기본 정보 */}
      <OpsSection title="기본 정보">
        <div className="grid grid-cols-2">
          <FieldRow label="OS 유형" required><ReadValue value={w.osType} /></FieldRow>
          <FieldRow label="게시여부" required><ReadValue value={EXPOSE_LABEL[String(w.exposeYn) as 'true' | 'false']} /></FieldRow>
          <FieldRow label="위젯 유형" required><ReadValue value={w.widgetType?.typeName ?? '-'} /></FieldRow>
          <FieldRow label="게시기간" required><ReadValue value={fmtPeriod(w.publishStart, w.publishEnd)} /></FieldRow>
        </div>
      </OpsSection>

      {/* 배너 정보 */}
      <OpsSection title="배너 정보">
        <div className="grid grid-cols-2">
          <FieldRow label="배너명" required><ReadValue value={w.bannerName} /></FieldRow>
          <FieldRow label="BG용 RGB 색상코드"><ReadValue value={w.bgColorCode ?? '-'} /></FieldRow>
        </div>
        {/* 배너 이미지 — 미리보기 + ALT/파일명 */}
        <div className="grid grid-cols-[140px_1fr] border-b border-slate-100">
          <div className="flex items-center bg-slate-50/60 px-4 py-3 text-[13px] font-medium text-slate-600">배너 이미지<span className="ml-0.5 text-rose-500">*</span></div>
          <div className="px-4 py-3">
            {w.bannerImageUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={w.bannerImageUrl} alt={w.bannerImageAlt ?? ''} className="max-h-40 rounded-lg border border-slate-200 object-contain" />
              : <div className="flex h-24 w-40 items-center justify-center rounded-lg border border-dashed border-slate-200 text-[12px] text-slate-400">이미지 없음</div>}
            {w.bannerImageAlt && <p className="mt-1.5 text-[12px] text-slate-500">ALT: {w.bannerImageAlt}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2">
          <FieldRow label="링크 URL" required><ReadValue value={<span>{linkLabel}{w.linkUrl ? ` · ${w.linkUrl}` : ''}</span>} /></FieldRow>
          <div />
        </div>
        {/* T월드 영역 */}
        <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-2 text-[11px] font-semibold text-slate-500">T월드 영역</div>
        <div className="grid grid-cols-2">
          <FieldRow label="통계코드"><ReadValue value={w.statCode ?? '-'} /></FieldRow>
          <FieldRow label="랜딩위치"><ReadValue value={w.landingPosition ?? '-'} /></FieldRow>
          <FieldRow label="타겟 캠페인ID"><ReadValue value={w.targetCampaignId ?? '-'} /></FieldRow>
          <FieldRow label="비고"><ReadValue value={w.note ?? '-'} /></FieldRow>
        </div>
      </OpsSection>

      {/* 담당자 정보 */}
      <OpsSection title="담당자 정보">
        <div className="grid grid-cols-2">
          <FieldRow label="등록자"><ReadValue value={w.createdBy ?? '-'} /></FieldRow>
          <FieldRow label="등록일시"><ReadValue value={fmtDateTime(w.createdAt)} /></FieldRow>
          <FieldRow label="최근 수정자"><ReadValue value={w.updatedBy ?? '-'} /></FieldRow>
          <FieldRow label="최근 수정일시"><ReadValue value={fmtDateTime(w.updatedAt)} /></FieldRow>
        </div>
      </OpsSection>

      <WidgetDetailActions id={w.id} approvalStatus={w.approvalStatus} />
    </div>
  );
}
