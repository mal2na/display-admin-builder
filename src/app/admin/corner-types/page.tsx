import { prisma } from '@/lib/prisma';
import { CornerTypeManager, type CornerTypeRow, type BannerUsageEntry } from './corner-type-manager';
import { getBuiltCornerOptions } from './built-options';
import { toCornerTypeRow } from './row-map';
import { getBannerUsage } from '../banner-campaigns/banner-usage';

export const dynamic = 'force-dynamic';

export default async function CornerTypesPage() {
  const [rows, auditRows, builtOptions, campaigns] = await Promise.all([
    // 배너형도 정식 코너 유형(2026-09-28) → 목록에 노출. 배너 소재·문구는 배너 캠페인 관리가 소유.
    prisma.cornerType.findMany({ orderBy: { typeId: 'asc' } }),
    prisma.auditLog.findMany({
      where: { targetType: 'CornerType' },
      orderBy: { changedAt: 'desc' },
      select: { targetId: true, actor: true },
    }),
    // 전시화면관리(빌더)에서 실제로 만들어진 Corner의 유형 조합만 등록 후보로 사용
    getBuiltCornerOptions(),
    prisma.bannerCampaign.findMany({ orderBy: { campaignCode: 'asc' }, select: { id: true, campaignCode: true, title: true, typeDetails: true } }),
  ]);
  // 최근 수정자 = 해당 코너 유형의 가장 최근 감사 로그 변경자 (없으면 등록자)
  const lastActor = new Map<string, string>();
  for (const a of auditRows) if (a.targetId && !lastActor.has(a.targetId)) lastActor.set(a.targetId, a.actor);

  const types: CornerTypeRow[] = rows.map((r) => toCornerTypeRow(r, lastActor.get(r.id) ?? null));

  // 배너형 코너 유형 = 여러 배너가 '어디에 노출되고 있는지'를 보여준다(배너 캠페인 관리와 달리 유형 전체 관점).
  //  실제 빌더 코너에 편성된(사용 중인) 배너만.
  const usageMap = await getBannerUsage(campaigns.map((c) => c.id));
  const bannerUsage: BannerUsageEntry[] = campaigns
    .map((c) => {
      let thumb: string | null = null;
      try {
        const td = c.typeDetails ? (JSON.parse(c.typeDetails) as { imageUrl?: string; rightImageUrl?: string }[]) : [];
        thumb = td[0]?.rightImageUrl || td[0]?.imageUrl || null;
      } catch { thumb = null; }
      return { id: c.id, campaignCode: c.campaignCode, title: c.title, thumb, usage: usageMap[c.id] ?? [] };
    })
    .filter((b) => b.usage.length > 0);

  return (
    <div className="p-6">
      <CornerTypeManager types={types} builtOptions={builtOptions} bannerUsage={bannerUsage} />
    </div>
  );
}
