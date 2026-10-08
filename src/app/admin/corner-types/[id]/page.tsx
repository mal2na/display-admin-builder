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

  // 형제 케이스 — 같은 껍데기(base+typeDetail)의 다른 코너 유형들. 목록이 껍데기 하나로 합쳐지므로,
  //  상세의 '쓰는 전시화면'은 이 껍데기를 쓰는 '모든 형제 유형'의 코너를 빠짐없이 맵핑한다(2026-10-06 사용자 요청).
  const siblings = await prisma.cornerType.findMany({
    where: { baseCategory: ct.baseCategory, typeDetail: ct.typeDetail },
    orderBy: { typeId: 'asc' },
    select: { id: true, name: true },
  });
  const siblingIds = siblings.map((s) => s.id);
  // 껍데기 전체(형제 유형 모두)로 만든 실제 코너 — 상세 '상세 정보' 맵핑용.
  const shellUsageCorners = await prisma.corner.findMany({
    where: { sourceCornerTypeId: { in: siblingIds.length ? siblingIds : [params.id] } },
    include: PLACED_CORNER_INCLUDE,
    orderBy: PLACED_CORNER_ORDER,
  });

  // 사용처 rows: 배치된 곳마다 (컨테이너 · 템플릿 · 코너명 + 템플릿 id). 미배치 코너는 템플릿/컨테이너 null.
  //  templateId로 상세에서 '전시화면 관리(빌더)' 바로가기 링크를 건다(2026-10-06 사용자 요청).
  const usage: { container: string | null; template: string | null; corner: string; templateId: string | null }[] = [];
  for (const c of usageCorners) {
    if (c.templateCorners.length === 0) usage.push({ container: null, template: null, corner: c.name, templateId: null });
    for (const tc of c.templateCorners) usage.push({ container: tc.template.container.name, template: tc.template.name, corner: c.name, templateId: tc.template.id });
  }

  // 실제 사용 코너의 구성을 미리보기로 매핑 — 배너형 외 유형(예: 혜택·오퍼형)은 상세에서 실제 코너들을 보여준다(한 유형 = 여러 케이스).
  //  전시화면(템플릿)에 배치된 코너만 — 미배치(orphan) 코너는 제외.
  const usagePreviews: PreviewCorner[] = usageCorners.filter((c) => c.templateCorners.length > 0).map(cornerToPreviewCorner);

  // 상세 '상세 정보' — 이 껍데기(형제 유형 전부)로 '실제 만든 코너' + 그 코너가 올라간 전시화면(클릭 시 빌더).
  //  배치된(화면에 올라간) 코너만 — 미배치 코너는 제외(전시화면 맵핑이 목적). 2026-10-06 사용자 요청(빠짐없이).
  const usageByCorner = shellUsageCorners
    .filter((c) => c.templateCorners.length > 0)
    .map((c) => ({
      cornerName: c.name,
      preview: cornerToPreviewCorner(c),
      screens: c.templateCorners.map((tc) => ({ templateId: tc.template.id, container: tc.template.container.name, template: tc.template.name })),
    }));

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
    <div className="px-12 py-9 pb-28">
      <CornerTypeDetail row={row} history={history} builtOptions={builtOptions} registered={registered} bannerCampaigns={bannerCampaigns} productOptions={productOptions} usage={usage} usageByCorner={usageByCorner} bannerPreviews={bannerPreviews} usagePreviews={usagePreviews} siblings={siblings} />
    </div>
  );
}
