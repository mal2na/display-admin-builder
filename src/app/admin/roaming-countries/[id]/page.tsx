// SB BO-AIM-DSP-PG565(국가정보)/561~564(서비스)/566(임대로밍)/559(이력) — 로밍국가 관리 상세
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { RoamingDetailTabs, type RoamingDetail, type RoamingHistRow } from '../roaming-detail-tabs';
import { parseService } from '@/lib/roaming';
import { PageHeader } from '@/components/page-header';

export const dynamic = 'force-dynamic';

export default async function RoamingDetailPage({ params }: { params: { id: string } }) {
  const r = await prisma.roamingCountry.findUnique({
    where: { id: params.id },
    include: { sites: { orderBy: { seq: 'asc' } }, history: { orderBy: { createdAt: 'desc' } } },
  });
  if (!r) notFound();

  const oldestId = r.history.length ? r.history[r.history.length - 1].id : null;
  const historyRows: RoamingHistRow[] = r.history.map((h) => ({
    id: h.id, seq: h.seq, version: h.version, status: h.status,
    requester: h.requester, requestedAt: h.requestedAt?.toISOString() ?? null, requestReason: h.requestReason,
    manager: h.manager, processedAt: h.processedAt?.toISOString() ?? null, processReason: h.processReason,
    changeNote: h.changeNote, canDiff: h.id !== oldestId,
  }));

  const d: RoamingDetail = {
    id: r.id,
    continent: r.continent, nameKo: r.nameKo, nameEn: r.nameEn, countryCode: r.countryCode, mccCode: r.mccCode, gmt: r.gmt, timeDiff: r.timeDiff,
    searchYn: r.searchYn, detailYn: r.detailYn, adjacentCountries: r.adjacentCountries, currencyCode: r.currencyCode,
    countryImageUrl: r.countryImageUrl, countryImageAlt: r.countryImageAlt, bgImageUrl: r.bgImageUrl, bgImageAlt: r.bgImageAlt,
    countryImage2Url: r.countryImage2Url, countryImage2Alt: r.countryImage2Alt, buttonImageUrl: r.buttonImageUrl, buttonImageAlt: r.buttonImageAlt,
    faultNoticeYn: r.faultNoticeYn, faultNoticeStart: r.faultNoticeStart?.toISOString() ?? null, faultNoticeEnd: r.faultNoticeEnd?.toISOString() ?? null, faultNoticeContent: r.faultNoticeContent,
    services: {
      WCDMA: parseService(r.wcdma), GSM: parseService(r.gsm), LTE: parseService(r.lte), CDMA: parseService(r.cdma), 임대로밍: parseService(r.lease),
    },
    approvalStatus: r.approvalStatus, approvalRequester: r.approvalRequester, approvalManager: r.approvalManager,
    approvalRequestedAt: r.approvalRequestedAt?.toISOString() ?? null, approvalProcessedAt: r.approvalProcessedAt?.toISOString() ?? null,
    sites: r.sites.map((s) => ({ id: s.id, siteName: s.siteName, link: s.link, exposeYn: s.exposeYn })),
  };

  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader trail={['운영관리', '로밍국가 관리', '로밍국가 관리 상세']} title="로밍국가 관리 상세" />
      <RoamingDetailTabs d={d} historyRows={historyRows} />
    </div>
  );
}
