// 전시화면 관리 (테스트) — order3-create(주문 프로세스 등록) 레이아웃용 데이터 로더.
//  혜택 홈 등 실제 Container + Template + 배치 코너를 가져와 ProcessBuilder 에 주입(2026-10-20).
import { prisma } from '@/lib/prisma';
import { cornerToPreviewCorner, PLACED_CORNER_INCLUDE } from '../corner-types/preview-corner';
import { normalizeRecSource, isCvmSource, effectiveFallback, deriveZone, defaultComposition, componentTypesForCorner, type Zone } from '@/lib/display-taxonomy';
import { compositionToPreviewCorner } from '@/components/preview/composition-preview';
import { getProductOptions } from '../corner-types/built-options';
import type { PreviewCorner } from '@/components/preview/blocks';
import type { ProductOption } from '../corner-types/corner-type-manager';

// 코너 불러오기 '껍데기 가이드' — 코너 = 껍데기(규격)라 콘텐츠 없이 placeholder 슬롯으로만 미리보기.
//  불러오면 코너 유형(레이아웃·노출 타입)만 들어오고 내용은 빌더 '②수급'에서 채운다(2026-10-28 사용자 요청).
function guideCornerPreview(base: string, detail: string | null, component: string | null): PreviewCorner {
  const noTitle = base === '배너형' || base === '고정·필수 노출형';
  const comp = component || componentTypesForCorner(base)[0] || null; // 없으면 유형 기본 컴포넌트로 레이아웃 가이드가 뜨게
  return compositionToPreviewCorner({
    base,
    detail,
    composition: defaultComposition(comp, detail),
    mainTitle: noTitle ? null : '타이틀',
    subTitle: noTitle ? null : '디스크립션',
    placeholder: true,
    emptyImages: true,
  });
}

export type PCorner = {
  id: string; templateCornerId: string; name: string; cornerType: string; layout: string | null; layoutDetail: string | null; maxItems: number | null; preview: PreviewCorner;
  /** 수급 방식(정규화) · CVM 연동 여부 · CVM 비었을 때 폴백 — 폴백 UI용(2026-10-20) */
  recSource: string | null; isCvm: boolean; fallback: '미노출' | '운영자 편성으로 대체';
  /** 전시 존(Fixed/Dynamic/Semi) — 코너 리스트 밴드용(2026-10-21) */
  zone: Zone;
};
/** 코너 불러오기 모달용 — 코너 유형 관리의 선택 가능한 코너(+미리보기) */
export type LibCorner = { id: string; name: string; cornerType: string; layout: string | null; layoutDetail: string | null; maxItems: number | null; preview: PreviewCorner };
export type PTemplate = {
  id: string; name: string; conditionGroup: string | null; isDefault: boolean; status: string; corners: PCorner[];
  /** 템플릿 기본 정보 필드 */
  memo: string | null; displayOn: boolean; startAt: string | null; endAt: string | null; startAtOnApproval: boolean;
};
export type ProcessData = {
  containerId: string; containerName: string; containerType: string; platform: string;
  status: string; description: string | null; previewUrl: string | null; activeTemplateId: string;
  templates: PTemplate[]; libCorners: LibCorner[];
  /** 상품형 코너 '채우기 → 불러오기'에서 고를 상품 카탈로그(상품 9분류). 2026-10-28 사용자 요청 */
  productCatalog: ProductOption[];
};

const TYPE_LABELS: Record<string, string> = { MAIN: '메인화면', MENU: '메뉴', CURATION: '기획전', BENEFIT: '혜택 영역' };

export async function loadProcessData(containerId: string, activeTemplateId?: string): Promise<ProcessData | null> {
  const container = await prisma.container.findUnique({
    where: { id: containerId },
    include: {
      templates: {
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        include: {
          templateCorners: {
            orderBy: { order: 'asc' },
            include: { corner: { include: PLACED_CORNER_INCLUDE } },
          },
        },
      },
    },
  });
  if (!container) return null;

  const templates: PTemplate[] = container.templates.map((t) => ({
    id: t.id,
    name: t.name,
    conditionGroup: t.conditionGroup,
    isDefault: t.isDefault,
    status: t.status,
    memo: t.memo ?? null,
    displayOn: t.displayOn ?? true,
    startAt: t.startAt ? t.startAt.toISOString() : null,
    endAt: t.endAt ? t.endAt.toISOString() : null,
    startAtOnApproval: t.startAtOnApproval ?? false,
    corners: t.templateCorners.map((tc) => ({
      id: tc.corner.id,
      templateCornerId: tc.id,
      name: tc.corner.name,
      cornerType: tc.corner.cornerType,
      layout: tc.corner.cornerLayout,
      layoutDetail: tc.corner.layoutDetail,
      maxItems: tc.corner.maxItems,
      preview: cornerToPreviewCorner(tc.corner),
      recSource: tc.corner.recSource ? normalizeRecSource(tc.corner.recSource) : null,
      isCvm: isCvmSource(tc.corner.recSource),
      fallback: effectiveFallback(tc.corner.cornerType, tc.corner.cvmFallback),
      zone: (tc.zone as Zone) ?? deriveZone(tc.corner.cornerType, tc.corner.recSource),
    })),
  }));

  const active = (activeTemplateId && templates.some((t) => t.id === activeTemplateId))
    ? activeTemplateId
    : (templates.find((t) => t.isDefault)?.id ?? templates[0]?.id ?? '');

  // 코너 불러오기 모달용 — 활성 코너를 이름 기준 중복 제거, 미리보기 포함
  const rawLib = await prisma.corner.findMany({
    where: { status: 'active' },
    orderBy: [{ cornerType: 'asc' }, { updatedAt: 'desc' }],
    include: PLACED_CORNER_INCLUDE,
    take: 300,
  });
  const seen = new Set<string>();
  const libCorners: LibCorner[] = [];
  for (const c of rawLib) {
    if (seen.has(c.name)) continue;
    seen.add(c.name);
    // 미리보기 = 껍데기 가이드(빈 슬롯). 실데이터(cornerToPreviewCorner)가 아니라 유형 규격만 보여준다(2026-10-28 사용자 요청).
    libCorners.push({ id: c.id, name: c.name, cornerType: c.cornerType, layout: c.cornerLayout, layoutDetail: c.layoutDetail, maxItems: c.maxItems, preview: guideCornerPreview(c.cornerType, c.layoutDetail, c.componentType) });
  }

  return {
    containerId: container.id,
    containerName: container.name,
    containerType: container.kind ?? TYPE_LABELS[container.containerType ?? ''] ?? '메인화면',
    platform: container.platform ?? container.channel ?? '모바일',
    status: container.status,
    description: container.metaDescription,
    previewUrl: container.previewUrl,
    activeTemplateId: active,
    templates,
    libCorners,
    productCatalog: await getProductOptions('상품형'),
  };
}

/** 템플릿 id 로 소속 Container 를 찾아 데이터 로드 (트리 템플릿 링크용) */
export async function loadProcessDataByTemplate(templateId: string): Promise<ProcessData | null> {
  const t = await prisma.template.findUnique({ where: { id: templateId }, select: { containerId: true } });
  if (!t) return null;
  return loadProcessData(t.containerId, templateId);
}
