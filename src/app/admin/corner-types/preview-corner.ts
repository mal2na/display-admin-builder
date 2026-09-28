import type { PreviewCorner } from '@/components/preview/blocks';

// 실제 Corner(+banner·cornerComponents·atoms include) → 미리보기 PreviewCorner.
//  목록 카드 썸네일과 상세 미리보기가 '같은 실제 코너'를 렌더하도록 공용으로 쓴다(썸네일=상세 일치).
//  필요한 include: banner{imageUrl}, cornerComponents{order, component{componentAtoms{order, atom}}}.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cornerToPreviewCorner(c: any): PreviewCorner {
  return {
    id: c.id, name: c.name, cornerType: c.cornerType, title: c.title, maxItems: c.maxItems,
    mainTitle: c.mainTitle, subTitle: c.subTitle, cornerLayout: c.cornerLayout, layoutDetail: c.layoutDetail,
    subTitleIcon: c.subTitleIcon, moreButtonUse: c.moreButtonUse, moreButtonLabel: c.moreButtonLabel,
    bigBanner: c.bigBanner, cardShape: c.cardShape, titleLines: c.titleLines,
    bannerImageUrl: c.banner?.imageUrl ?? null, bannerOptions: c.bannerOptions,
    recSource: c.recSource, recSourcePlan: c.recSourcePlan, showRecReason: c.showRecReason,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    components: c.cornerComponents.map((cc: any) => ({
      id: cc.component.id, name: cc.component.name, componentType: cc.component.componentType,
      selectedIndex: cc.component.selectedIndex, chipRows: cc.component.chipRows,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      atoms: cc.component.componentAtoms.map((ca: any) => ({
        id: ca.atom.id, name: ca.atom.name, atomType: ca.atom.atomType, content: ca.atom.content,
        imageUrl: ca.atom.imageUrl, altText: ca.atom.altText, linkUrl: ca.atom.linkUrl, menuRole: ca.menuRole,
      })),
    })),
  };
}

// 코너 유형 상세/목록에서 '실제 배치된 코너'를 뽑을 때 공용으로 쓰는 include + 정렬.
export const PLACED_CORNER_INCLUDE = {
  banner: { select: { imageUrl: true } },
  templateCorners: {
    select: { template: { select: { name: true, container: { select: { name: true } } } } },
  },
  cornerComponents: {
    orderBy: { order: 'asc' as const },
    include: { component: { include: { componentAtoms: { orderBy: { order: 'asc' as const }, include: { atom: true } } } } },
  },
};
// 대표 코너 정렬 — 목록 썸네일과 상세 첫 타일이 동일 코너가 되도록 동률 시 id로 고정.
export const PLACED_CORNER_ORDER = [{ updatedAt: 'desc' as const }, { id: 'asc' as const }];
