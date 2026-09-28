// SB BO-AIM-ETC-PG061 배너 캠페인 관리 목록 · 운영 관리
import { prisma } from '@/lib/prisma';
import { BannerList } from './banner-list';
import { getBannerUsage } from './banner-usage';

export const dynamic = 'force-dynamic';

export default async function BannerCampaignsPage() {
  const rows = await prisma.bannerCampaign.findMany({ orderBy: { createdAt: 'desc' } });
  const usage = await getBannerUsage(rows.map((r) => r.id));
  return (
    <div className="px-8 py-6">
      <nav className="mb-1 text-[12px] text-muted-foreground">홈 › 전시관리 › 배너 캠페인 관리</nav>
      <h1 className="mb-5 text-2xl font-bold">배너 캠페인 관리</h1>
      <BannerList rows={rows.map((r) => {
        // 썸네일 프리뷰 = 대표(첫) 유형상세. 이미지형이면 이미지 URL, 직접 만들기(리스트형)면 조립 결과를 라이브 렌더.
        let preview: import('./banner-list').BannerPreview = null;
        try {
          const td = r.typeDetails ? JSON.parse(r.typeDetails) as any[] : [];
          const first = td[0];
          if (first) {
            if (first.type === '이미지형' && first.imageUrl) preview = { kind: 'image', url: first.imageUrl };
            else if (first.type === '리스트형') preview = { kind: 'compose', f: first };
            else { const withImg = td.find((t) => t.imageUrl); if (withImg?.imageUrl) preview = { kind: 'image', url: withImg.imageUrl }; }
          }
        } catch { preview = null; }
        if (!preview && r.thumbnailUrl) preview = { kind: 'image', url: r.thumbnailUrl };
        return {
          id: r.id, campaignCode: r.campaignCode, title: r.title, exposeYn: r.exposeYn,
          publishStart: r.publishStart?.toISOString() ?? null, publishEnd: r.publishEnd?.toISOString() ?? null,
          approvalStatus: r.approvalStatus, approvalManager: r.approvalManager, preview,
          usage: usage[r.id] ?? [],
          createdBy: r.createdBy, createdAt: r.createdAt.toISOString(), updatedBy: r.updatedBy, updatedAt: r.updatedAt.toISOString(),
        };
      })} />
    </div>
  );
}
