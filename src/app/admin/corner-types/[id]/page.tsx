import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { CornerTypeDetail, type HistoryRow, type BannerPreview } from './corner-type-detail';
import { type CornerTypeRow } from '../corner-type-manager';
import { getBuiltCornerOptions, getRegisteredCombos } from '../built-options';
import { getBannerUsage } from '../../banner-campaigns/banner-usage';
import { type PreviewCorner } from '@/components/preview/blocks';

export const dynamic = 'force-dynamic';

export default async function CornerTypeDetailPage({ params }: { params: { id: string } }) {
  const [ct, logs, builtOptions, registered, usageCorners] = await Promise.all([
    prisma.cornerType.findUnique({ where: { id: params.id } }),
    prisma.auditLog.findMany({
      where: { targetType: 'CornerType', targetId: params.id },
      orderBy: { changedAt: 'desc' },
    }),
    getBuiltCornerOptions(),
    getRegisteredCombos(),
    // 사용처: 이 코너 유형으로 생성된 코너 + 배치된 템플릿/컨테이너 + 실제 구성(미리보기용)
    prisma.corner.findMany({
      where: { sourceCornerTypeId: params.id },
      include: {
        banner: { select: { imageUrl: true } },
        templateCorners: {
          select: { template: { select: { name: true, container: { select: { name: true } } } } },
        },
        cornerComponents: {
          orderBy: { order: 'asc' },
          include: { component: { include: { componentAtoms: { orderBy: { order: 'asc' }, include: { atom: true } } } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);
  if (!ct) notFound();

  // 사용처 rows: 배치된 곳마다 (컨테이너 · 템플릿 · 코너명). 미배치 코너는 템플릿/컨테이너 null.
  const usage: { container: string | null; template: string | null; corner: string }[] = [];
  for (const c of usageCorners) {
    if (c.templateCorners.length === 0) usage.push({ container: null, template: null, corner: c.name });
    for (const tc of c.templateCorners) usage.push({ container: tc.template.container.name, template: tc.template.name, corner: c.name });
  }

  // 실제 사용 코너의 구성을 미리보기로 매핑 — 배너형 외 유형(예: 혜택·오퍼형)은 상세에서 실제 코너들을 보여준다(한 유형 = 여러 케이스).
  const usagePreviews: PreviewCorner[] = usageCorners.map((c) => ({
    id: c.id, name: c.name, cornerType: c.cornerType, title: c.title, maxItems: c.maxItems,
    mainTitle: c.mainTitle, subTitle: c.subTitle, cornerLayout: c.cornerLayout, layoutDetail: c.layoutDetail,
    subTitleIcon: c.subTitleIcon, moreButtonUse: c.moreButtonUse, moreButtonLabel: c.moreButtonLabel,
    bigBanner: c.bigBanner, cardShape: c.cardShape, titleLines: c.titleLines,
    bannerImageUrl: c.banner?.imageUrl ?? null, bannerOptions: c.bannerOptions,
    recSource: c.recSource, recSourcePlan: c.recSourcePlan, showRecReason: c.showRecReason,
    components: c.cornerComponents.map((cc) => ({
      id: cc.component.id, name: cc.component.name, componentType: cc.component.componentType,
      selectedIndex: cc.component.selectedIndex, chipRows: cc.component.chipRows,
      atoms: cc.component.componentAtoms.map((ca) => ({
        id: ca.atom.id, name: ca.atom.name, atomType: ca.atom.atomType, content: ca.atom.content,
        imageUrl: ca.atom.imageUrl, altText: ca.atom.altText, linkUrl: ca.atom.linkUrl, menuRole: ca.menuRole,
      })),
    })),
  }));

  const row: CornerTypeRow = {
    id: ct.id,
    typeId: ct.typeId,
    name: ct.name,
    baseCategory: ct.baseCategory,
    componentType: ct.componentType ?? null,
    typeDetail: ct.typeDetail,
    bigBanner: ct.bigBanner ?? false,
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
  };

  const history: HistoryRow[] = logs.map((l) => ({
    id: l.id,
    changedAt: l.changedAt.toISOString(),
    actor: l.actor,
    result: l.result,
    reason: l.reason,
  }));

  // 배너형 코너 유형 = 실제로 편성돼 쓰이는 배너들(콤포즈)을 미리보기에 모두 보여준다(한 유형이 여러 배너로 쓰임).
  let bannerPreviews: BannerPreview[] = [];
  if (ct.baseCategory === '배너형') {
    const campaigns = await prisma.bannerCampaign.findMany({ orderBy: { campaignCode: 'asc' }, select: { id: true, title: true, typeDetails: true } });
    const usageMap = await getBannerUsage(campaigns.map((c) => c.id));
    bannerPreviews = campaigns.flatMap((c) => {
      if ((usageMap[c.id] ?? []).length === 0) return [];
      let fields: Record<string, unknown> | null = null;
      try {
        const td = c.typeDetails ? (JSON.parse(c.typeDetails) as Record<string, unknown>[]) : [];
        fields = td.find((t) => t.type === '리스트형') ?? td[0] ?? null;
      } catch { fields = null; }
      return fields ? [{ id: c.id, title: c.title, fields }] : [];
    });
  }

  return (
    <div className="p-6">
      <CornerTypeDetail row={row} history={history} builtOptions={builtOptions} registered={registered} usage={usage} bannerPreviews={bannerPreviews} usagePreviews={usagePreviews} />
    </div>
  );
}
