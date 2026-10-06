import type { PreviewCorner } from '@/components/preview/blocks';
import { chipIconForLabel } from '@/components/preview/composition-preview';

// 실제 Corner(+banner·cornerComponents·atoms include) → 미리보기 PreviewCorner.
//  목록 카드 썸네일과 상세 미리보기가 '같은 실제 코너'를 렌더하도록 공용으로 쓴다(썸네일=상세 일치).
//  필요한 include: banner{imageUrl}, cornerComponents{order, component{componentAtoms{order, atom}}}.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cornerToPreviewCorner(c: any): PreviewCorner {
  // 업무 진입형(퀵메뉴)의 선택형 칩은 아이콘 뱃지 퀵칩(ChipHome)으로 — 아이콘 미저장(시드) 칩도 라벨에서 자동 유추.
  const isQuickMenu = c.cornerType === '업무 진입형';
  return {
    id: c.id, name: c.name, cornerType: c.cornerType, title: c.title, maxItems: c.maxItems,
    mainTitle: c.mainTitle, subTitle: c.subTitle, cornerLayout: c.cornerLayout,
    // 코너 타이틀 문구 베리에이션(Corner.mainTitleVariants JSON) — 상세 미리보기에서 함께 노출(2026-10-06).
    mainTitleVariants: (() => { try { const v = JSON.parse(c.mainTitleVariants ?? ''); return Array.isArray(v) && v.length ? v : undefined; } catch { return undefined; } })(),
    // 코너 유형 관리 미리보기에서 배너형 이미지는 672×214(띠배너) 비율로 통일 노출(2026-09-29 사용자 요청). 실제 코너 규격은 그대로.
    layoutDetail: c.cornerType === '배너형' ? '띠배너 (672×214)' : c.layoutDetail,
    subTitleIcon: c.subTitleIcon, moreButtonUse: c.moreButtonUse, moreButtonLabel: c.moreButtonLabel,
    bigBanner: c.bigBanner, cardShape: c.cardShape, titleLines: c.titleLines,
    bannerImageUrl: c.banner?.imageUrl ?? null, bannerOptions: c.bannerOptions,
    // 코너 유형 관리 미리보기에서는 CVM/추천 수급 배지를 표시하지 않는다(2026-09-28 사용자 요청 "cvm 빼줘"). 값은 비워 배지 렌더를 막음.
    recSource: null, recSourcePlan: null, showRecReason: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    components: c.cornerComponents.map((cc: any) => {
      const isChip = cc.component.componentType === '선택형' && isQuickMenu;
      return {
        id: cc.component.id, name: cc.component.name, componentType: cc.component.componentType,
        selectedIndex: cc.component.selectedIndex, chipRows: isChip ? (cc.component.chipRows ?? 2) : cc.component.chipRows,
        ...(isChip ? { chipVariant: 'home' as const } : {}),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        atoms: cc.component.componentAtoms.map((ca: any) => ({
          id: ca.atom.id, name: ca.atom.name, atomType: ca.atom.atomType, content: ca.atom.content,
          // 퀵메뉴 칩: 아이콘 미저장 시 라벨에서 자동 유추(레퍼런스 퀵칩 아이콘 뱃지).
          imageUrl: isChip && ca.atom.atomType === 'TEXT' ? (ca.atom.imageUrl ?? chipIconForLabel(ca.atom.content ?? ca.atom.name)) : ca.atom.imageUrl,
          altText: ca.atom.altText, linkUrl: ca.atom.linkUrl, menuRole: ca.menuRole,
          // 문구 베리에이션(타겟별 CVM 택1) — JSON 파싱. 코너 유형 상세 미리보기에서 함께 보여주기 위해 포함(2026-10-06).
          contentVariants: (() => { try { const v = JSON.parse(ca.atom.contentVariants ?? ''); return Array.isArray(v) && v.length ? v : undefined; } catch { return undefined; } })(),
        })),
      };
    }),
  };
}

// 코너 유형 상세/목록에서 '실제 배치된 코너'를 뽑을 때 공용으로 쓰는 include + 정렬.
export const PLACED_CORNER_INCLUDE = {
  banner: { select: { imageUrl: true } },
  templateCorners: {
    select: { template: { select: { id: true, name: true, container: { select: { id: true, name: true } } } } },
  },
  cornerComponents: {
    orderBy: { order: 'asc' as const },
    include: { component: { include: { componentAtoms: { orderBy: { order: 'asc' as const }, include: { atom: true } } } } },
  },
};
// 대표 코너 정렬 — 목록 썸네일과 상세 첫 타일이 동일 코너가 되도록 동률 시 id로 고정.
export const PLACED_CORNER_ORDER = [{ updatedAt: 'desc' as const }, { id: 'asc' as const }];
