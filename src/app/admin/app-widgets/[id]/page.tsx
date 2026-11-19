// SB BO-AIM-DSP-PG476 App 위젯 상세 · PG052 변경/승인이력(TAB) · 운영 관리
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { OpsSection, FieldRow, ReadValue, StatusPill } from '@/components/ops-ui';
import { fmtDateTime, fmtPeriod } from '@/lib/widget-taxonomy';
import { exposeStatus, WIDGET_APPROVAL_LABEL } from '../widget-helpers';
import { widgetCodeOf } from '../widget-code-server';
import { WidgetDetailTabs, type WidgetHistRow } from '../widget-detail-tabs';
import { ImageIcon } from 'lucide-react';
import { PageHeader } from '@/components/page-header';

export const dynamic = 'force-dynamic';

const APPROVAL_TONE: Record<string, string> = { 승인완료: 'success', 승인대기: 'info', 임시저장: 'neutral', 승인반려: 'negative', 요청취소: 'warning' };
const EXPOSE_TONE: Record<string, string> = { 노출중: 'success', 예정: 'info', 종료: 'neutral', 중지: 'warning', 미노출: 'neutral' };
const LANDING_LABEL: Record<string, string> = { direct: '직접(URL)', product: '상품형', event: '이벤트형', none: '없음' };
const PAGE_LABEL: Record<string, string> = { current: '내부', external: '외부', none: '없음' };

export default async function AppWidgetDetailPage({ params }: { params: { id: string } }) {
  const w = await prisma.appWidget.findUnique({
    where: { id: params.id },
    include: { widgetType: { select: { typeName: true } }, history: { orderBy: { createdAt: 'desc' } } },
  });
  if (!w) notFound();

  const widgetCode = await widgetCodeOf(w.createdAt);
  const banner = w.targetCampaignId ? await prisma.bannerCampaign.findUnique({ where: { id: w.targetCampaignId } }) : null;
  const approvalLabel = WIDGET_APPROVAL_LABEL[w.approvalStatus] ?? w.approvalStatus;
  const exposeState = exposeStatus(w.approvalStatus, w.exposeYn, w.publishStart, w.publishEnd);

  const oldestId = w.history.length ? w.history[w.history.length - 1].id : null;
  const historyRows: WidgetHistRow[] = w.history.map((h) => ({
    id: h.id, seq: h.seq, version: h.version, status: h.status,
    requester: h.requester, requestedAt: h.requestedAt?.toISOString() ?? null, requestReason: h.requestReason,
    manager: h.manager, processedAt: h.processedAt?.toISOString() ?? null, processReason: h.processReason,
    changeNote: h.changeNote, canDiff: h.id !== oldestId,
  }));

  const detail = (
    <div>
      {/* 승인 정보 — 승인상태 + 노출상태 배지 · 등록/수정 정보 */}
      <OpsSection title="승인 정보">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#dce0e5] bg-[var(--th)] px-4 py-3">
          <StatusPill label={approvalLabel} tone={APPROVAL_TONE[approvalLabel] ?? 'neutral'} />
          {w.approvalStatus === 'approved' && exposeState !== '미노출' && <StatusPill label={exposeState} tone={EXPOSE_TONE[exposeState] ?? 'neutral'} />}
        </div>
        <div className="grid grid-cols-2">
          <FieldRow label="등록자"><ReadValue value={w.createdBy ?? '-'} /></FieldRow>
          <FieldRow label="등록일시"><ReadValue value={fmtDateTime(w.createdAt)} /></FieldRow>
          <FieldRow label="최종 수정자"><ReadValue value={w.updatedBy ?? '-'} /></FieldRow>
          <FieldRow label="최종 수정일시"><ReadValue value={fmtDateTime(w.updatedAt)} /></FieldRow>
        </div>
      </OpsSection>

      {/* 기본 정보 */}
      <OpsSection title="기본 정보">
        <div className="grid grid-cols-2">
          <FieldRow label="위젯 ID"><ReadValue value={widgetCode} /></FieldRow>
          <FieldRow label="위젯 유형"><ReadValue value={w.widgetType?.typeName ?? '-'} /></FieldRow>
          <FieldRow label="노출 여부"><ReadValue value={w.exposeYn ? 'Y' : 'N'} /></FieldRow>
          <FieldRow label="노출 기간"><ReadValue value={fmtPeriod(w.publishStart, w.publishEnd)} /></FieldRow>
        </div>
      </OpsSection>

      {/* 위젯배너 정보 — 배너캠페인 연동 */}
      <OpsSection title="위젯배너 정보">
        {banner ? (
          <div className="grid grid-cols-2">
            <FieldRow label="배너 캠페인명"><ReadValue value={banner.title} /></FieldRow>
            <FieldRow label="배너 캠페인 ID"><ReadValue value={banner.campaignCode} /></FieldRow>
            <div className="col-span-2">
              <FieldRow label="배너 이미지">
                <div className="flex items-start gap-3">
                  <div className="flex h-24 w-40 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    {banner.thumbnailUrl ? <img src={banner.thumbnailUrl} alt={banner.bannerAlt ?? ''} className="max-h-full max-w-full object-contain" /> : <ImageIcon className="h-7 w-7 text-slate-300" />}
                  </div>
                  <p className="pt-1 text-[12px] text-slate-500">{banner.bannerAlt ?? '-'}</p>
                </div>
              </FieldRow>
            </div>
            <FieldRow label="전시기간"><ReadValue value={fmtPeriod(banner.publishStart, banner.publishEnd)} /></FieldRow>
            <FieldRow label="BG용 RGB 색상코드"><ReadValue value="기본컬러" /></FieldRow>
            <FieldRow label="랜딩유형"><ReadValue value={LANDING_LABEL[banner.landingType ?? ''] ?? banner.landingType ?? '-'} /></FieldRow>
            <FieldRow label="랜딩 URL"><ReadValue value={banner.landingUrl ?? '-'} /></FieldRow>
            <FieldRow label="페이지타입"><ReadValue value={PAGE_LABEL[banner.pageType ?? ''] ?? banner.pageType ?? '-'} /></FieldRow>
            <FieldRow label="통계코드"><ReadValue value={<span className="flex items-center gap-2">{banner.statCode ?? '-'}<span className="rounded border border-[#f0a04a] bg-[#fff7ed] px-1.5 py-0.5 text-[10px] font-semibold text-[#b45309]">TBD</span></span>} /></FieldRow>
          </div>
        ) : (
          <div className="border-b border-[#dce0e5] px-4 py-6 text-center text-[13px] text-slate-400">연동된 배너 캠페인이 없습니다.</div>
        )}
      </OpsSection>
    </div>
  );

  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader
        trail={['운영관리', 'App 위젯 관리', 'App 위젯 상세']}
        title="App 위젯 상세"
      />
      <WidgetDetailTabs id={w.id} approvalStatus={w.approvalStatus} detail={detail} historyRows={historyRows} />
    </div>
  );
}
