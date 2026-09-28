import { prisma } from '@/lib/prisma';

// 배너 캠페인이 실제로 편성된 위치(전시화면 > 템플릿 > 코너). 배너 상세/목록의 '노출 위치'에 쓴다.
export type BannerUsage = {
  containerId: string; containerName: string; containerType: string | null;
  templateId: string; templateName: string; templateStatus: string;
  cornerName: string;
  sizeDetail: string | null; // 이 위치에서 쓰는 유형상세(규격) = Corner.layoutDetail
};

// 배너 캠페인 → Component.sourceCampaignId ← CornerComponent → Corner ← TemplateCorner → Template → Container 로 역참조.
// 보관(archived)된 템플릿은 제외. 반환값: campaignId → 노출 위치 배열(중복 제거).
export async function getBannerUsage(campaignIds: string[]): Promise<Record<string, BannerUsage[]>> {
  if (campaignIds.length === 0) return {};
  const comps = await prisma.component.findMany({
    where: { sourceCampaignId: { in: campaignIds } },
    select: {
      sourceCampaignId: true,
      cornerComponents: {
        select: {
          corner: {
            select: {
              name: true, mainTitle: true, layoutDetail: true,
              templateCorners: {
                select: {
                  template: {
                    select: {
                      id: true, name: true, status: true, archivedAt: true,
                      container: { select: { id: true, name: true, containerType: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  const map: Record<string, BannerUsage[]> = {};
  const seen: Record<string, Set<string>> = {};
  for (const c of comps) {
    const cid = c.sourceCampaignId;
    if (!cid) continue;
    for (const cc of c.cornerComponents) {
      const cornerName = cc.corner.mainTitle?.split('\n')[0]?.trim() || cc.corner.name;
      for (const tc of cc.corner.templateCorners) {
        const t = tc.template;
        if (t.archivedAt) continue; // 보관된 템플릿 제외
        const key = `${t.container.id}|${t.id}|${cornerName}`;
        (seen[cid] ??= new Set<string>());
        if (seen[cid].has(key)) continue;
        seen[cid].add(key);
        (map[cid] ??= []).push({
          containerId: t.container.id, containerName: t.container.name, containerType: t.container.containerType,
          templateId: t.id, templateName: t.name, templateStatus: t.status, cornerName,
          sizeDetail: cc.corner.layoutDetail ?? null,
        });
      }
    }
  }
  return map;
}
