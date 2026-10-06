import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { CornerTypeDetail, type HistoryRow, type BannerPreview } from './corner-type-detail';
import { type CornerTypeRow } from '../corner-type-manager';
import { getBuiltCornerOptions, getRegisteredCombos, getBannerCampaignOptions, getProductOptions } from '../built-options';
import { type PreviewCorner } from '@/components/preview/blocks';
import { cornerToPreviewCorner, PLACED_CORNER_INCLUDE, PLACED_CORNER_ORDER } from '../preview-corner';

export const dynamic = 'force-dynamic';

export default async function CornerTypeDetailPage({ params }: { params: { id: string } }) {
  const [ct, logs, builtOptions, registered, bannerCampaigns, productOptions, usageCorners] = await Promise.all([
    prisma.cornerType.findUnique({ where: { id: params.id } }),
    prisma.auditLog.findMany({
      where: { targetType: 'CornerType', targetId: params.id },
      orderBy: { changedAt: 'desc' },
    }),
    getBuiltCornerOptions(),
    getRegisteredCombos(),
    getBannerCampaignOptions(),
    getProductOptions(),
    // 사용처: 이 코너 유형으로 생성된 코너 + 배치된 템플릿/컨테이너 + 실제 구성(미리보기용)
    prisma.corner.findMany({
      where: { sourceCornerTypeId: params.id },
      include: PLACED_CORNER_INCLUDE,
      orderBy: PLACED_CORNER_ORDER,
    }),
  ]);
  if (!ct) notFound();

  // 형제 케이스 — 같은 배열(base+typeDetail)의 다른 코너 유형들. 상세 상단 탭으로 좌우 전환(중간 '고르기' 페이지 제거).
  const siblings = await prisma.cornerType.findMany({
    where: { baseCategory: ct.baseCategory, typeDetail: ct.typeDetail },
    orderBy: { typeId: 'asc' },
    select: { id: true, name: true },
  });

  // 사용처 rows: 배치된 곳마다 (컨테이너 · 템플릿 · 코너명). 미배치 코너는 템플릿/컨테이너 null.
  const usage: { container: string | null; template: string | null; corner: string }[] = [];
  for (const c of usageCorners) {
    if (c.templateCorners.length === 0) usage.push({ container: null, template: null, corner: c.name });
    for (const tc of c.templateCorners) usage.push({ container: tc.template.container.name, template: tc.template.name, corner: c.name });
  }

  // 실제 사용 코너의 구성을 미리보기로 매핑 — 배너형 외 유형(예: 혜택·오퍼형)은 상세에서 실제 코너들을 보여준다(한 유형 = 여러 케이스).
  //  전시화면(템플릿)에 배치된 코너만 — 미배치(orphan) 코너는 제외.
  const usagePreviews: PreviewCorner[] = usageCorners.filter((c) => c.templateCorners.length > 0).map(cornerToPreviewCorner);

  const row: CornerTypeRow = {
    id: ct.id,
    typeId: ct.typeId,
    name: ct.name,
    baseCategory: ct.baseCategory,
    componentType: ct.componentType ?? null,
    typeDetail: ct.typeDetail,
    bigBanner: ct.bigBanner ?? false,
    componentLayoutMode: ct.componentLayoutMode ?? '고정형',
    markupId: ct.markupId,
    layout: ct.layout,
    description: ct.description,
    channels: ct.channels,
    platforms: ct.platforms,
    active: ct.active,
    useMainTitle: ct.useMainTitle,
    useSubTitle: ct.useSubTitle,
    useMinItems: ct.useMinItems,
    useMaxItems: ct.useMaxItems,
    useNoDisplay: ct.useNoDisplay,
    useMoreButton: ct.useMoreButton,
    useBadge: ct.useBadge ?? false,
    useImage: ct.useImage ?? true,
    usePrice: ct.usePrice ?? true,
    useDesc: ct.useDesc ?? true,
    defaultMinItems: ct.defaultMinItems ?? null,
    defaultMaxItems: ct.defaultMaxItems ?? null,
    defaultSortStrategy: ct.defaultSortStrategy ?? null,
    defaultRecSource: ct.defaultRecSource ?? null,
    defaultMoreButton: ct.defaultMoreButton ?? false,
    defaultMoreButtonLabel: ct.defaultMoreButtonLabel ?? null,
    defaultMainTitle: ct.defaultMainTitle ?? null,
    defaultSubTitle: ct.defaultSubTitle ?? null,
    defaultSubTitleIcon: ct.defaultSubTitleIcon ?? null,
    defaultCardShape: ct.defaultCardShape ?? null,
    defaultBannerOptions: ct.defaultBannerOptions ?? null,
    cvmFields: ct.cvmFields ?? '',
    composition: ct.composition ?? null,
    userCustomizable: ct.userCustomizable ?? false,
    userMinItems: ct.userMinItems ?? null,
    userMaxItems: ct.userMaxItems ?? null,
    sampleImageUrl: ct.sampleImageUrl,
    status: ct.status,
    rejectReason: ct.rejectReason ?? null,
    reviewedBy: ct.reviewedBy ?? null,
    reviewedAt: ct.reviewedAt ? ct.reviewedAt.toISOString() : null,
    workingVersion: ct.workingVersion ?? 1,
    liveVersion: ct.liveVersion ?? null,
    liveAt: ct.liveAt ? ct.liveAt.toISOString() : null,
    createdBy: ct.createdBy,
    // 수정 폼에서 '문구 베리에이션'(타이틀 하단)을 보여주려면 실제 배치 코너 미리보기가 필요(2026-10-06 #2).
    previewCorner: usagePreviews[0] ?? null,
  };

  const history: HistoryRow[] = logs.map((l) => ({
    id: l.id,
    changedAt: l.changedAt.toISOString(),
    actor: l.actor,
    result: l.result,
    reason: l.reason,
  }));

  // 배너형도 케이스별로 분리됨(배너 5종 각각) → 각 케이스는 자기 배너를 usagePreviews(실제 코너 렌더)로 보여준다.
  //  (예전엔 배너형 한 유형이 모든 캠페인 배너를 모아 보여줬으나, 케이스 분리로 불필요해져 제거.)
  const bannerPreviews: BannerPreview[] = [];

  return (
    <div className="px-8 py-6">
      <CornerTypeDetail row={row} history={history} builtOptions={builtOptions} registered={registered} bannerCampaigns={bannerCampaigns} productOptions={productOptions} usage={usage} bannerPreviews={bannerPreviews} usagePreviews={usagePreviews} siblings={siblings} />
    </div>
  );
}
