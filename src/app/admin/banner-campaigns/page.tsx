// SB BO-AIM-ETC-PG061 배너 캠페인 관리 목록
import { prisma } from '@/lib/prisma';
import { BannerList, type BannerRow } from './banner-list';

export const dynamic = 'force-dynamic';

const APPROVAL_LABEL: Record<string, string> = { requested: '승인요청', approved: '승인완료', rejected: '반려', cancelled: '요청취소', draft: '임시저장' };
const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : null);

export default async function BannerCampaignsPage() {
  const rows = await prisma.bannerCampaign.findMany({ orderBy: { createdAt: 'desc' } });
  const list: BannerRow[] = rows.map((r) => ({
    id: r.id,
    campaignCode: r.campaignCode,
    title: r.title,
    exposeYn: r.exposeYn,
    publishStart: iso(r.publishStart),
    publishEnd: iso(r.publishEnd),
    approvalLabel: APPROVAL_LABEL[r.approvalStatus] ?? r.approvalStatus,
    createdBy: r.createdBy ?? '-',
    createdAt: iso(r.createdAt),
    updatedBy: r.updatedBy ?? r.createdBy ?? '-',
    updatedAt: iso(r.updatedAt),
  }));
  return <BannerList rows={list} />;
}
