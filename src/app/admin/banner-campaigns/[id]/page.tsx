// SB BO-AIM-ETC-PG061 배너캠페인 상세 (기본 정보 / 추가 정보 / 이력 관리) · 전시관리
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { BannerDetail, type BannerTypeDetail } from '../banner-detail';

export const dynamic = 'force-dynamic';

export default async function BannerCampaignDetailPage({ params }: { params: { id: string } }) {
  const b = await prisma.bannerCampaign.findUnique({ where: { id: params.id }, include: { history: { orderBy: { createdAt: 'desc' } } } });
  if (!b) notFound();
  let typeDetails: BannerTypeDetail[] = [];
  try { if (b.typeDetails) typeDetails = JSON.parse(b.typeDetails); } catch { typeDetails = []; }

  return (
    <div className="px-8 py-6">
      <BannerDetail
        d={{
          id: b.id, campaignCode: b.campaignCode, title: b.title, subtitle: b.subtitle, purpose: b.purpose, platform: b.platform,
          exposeYn: b.exposeYn, publishStart: b.publishStart?.toISOString() ?? null, publishEnd: b.publishEnd?.toISOString() ?? null,
          approvalStatus: b.approvalStatus, approvalRequester: b.approvalRequester, approvalManager: b.approvalManager,
          approvalRequestedAt: b.approvalRequestedAt?.toISOString() ?? null, approvalProcessedAt: b.approvalProcessedAt?.toISOString() ?? null,
          landingType: b.landingType, landingUrl: b.landingUrl, pageType: b.pageType, bannerAlt: b.bannerAlt,
          typeDetails,
          createdBy: b.createdBy, createdAt: b.createdAt.toISOString(), updatedBy: b.updatedBy, updatedAt: b.updatedAt.toISOString(),
        }}
        history={b.history.map((h) => ({
          id: h.id, approvalId: h.approvalId, version: h.version, status: h.status, requester: h.requester, manager: h.manager,
          requestedAt: h.requestedAt?.toISOString() ?? null, processedAt: h.processedAt?.toISOString() ?? null,
          processReason: h.processReason, changeNote: h.changeNote,
        }))}
      />
    </div>
  );
}
