// SB BO-AIM-ETC-PG061 배너 캠페인 관리 목록
import { prisma } from '@/lib/prisma';
import { BannerList, type BannerRow } from './banner-list';

export const dynamic = 'force-dynamic';

const APPROVAL_LABEL: Record<string, string> = { requested: '승인요청', approved: '승인완료', rejected: '반려', cancelled: '요청취소', draft: '임시저장' };
const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : null);

// 목록 썸네일(2026-10-06 사용자 요청: 어떤 배너인지 보이게) — 대표 유형상세 1개를 뽑아 이미지형/텍스트형 프리뷰로 넘긴다.
function previewOf(typeDetails: string | null, thumbnailUrl: string | null): BannerRow['preview'] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let arr: any[] = [];
  try { const a = JSON.parse(typeDetails ?? ''); if (Array.isArray(a)) arr = a; } catch { /* noop */ }
  const rep = arr.find((t) => t && t.useYn !== false && (t.imageUrl || t.title || t.rightImageUrl)) ?? arr.find((t) => t && t.useYn !== false) ?? arr[0];
  if (rep) {
    if (rep.imageUrl) return { imageUrl: rep.imageUrl, f: null, detail: rep.detail ?? null };
    return { imageUrl: null, f: rep, detail: rep.detail ?? null };
  }
  if (thumbnailUrl) return { imageUrl: thumbnailUrl, f: null, detail: null };
  return null;
}

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
    preview: previewOf(r.typeDetails, r.thumbnailUrl),
  }));
  return <BannerList rows={list} />;
}
