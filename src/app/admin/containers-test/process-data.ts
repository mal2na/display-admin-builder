// 전시화면 관리 (테스트) — order3-create(주문 프로세스 등록) 레이아웃용 데이터 로더.
//  혜택 홈 등 실제 Container + Template + 배치 코너를 가져와 ProcessBuilder 에 주입(2026-10-20).
import { prisma } from '@/lib/prisma';
import { cornerToPreviewCorner, PLACED_CORNER_INCLUDE } from '../corner-types/preview-corner';

// 신규 '껍데기(스캐폴드)' 아톰의 플레이스홀더 내용 — 이게 전부면 아직 안 채워진 코너로 본다(buildComp 기본값과 1:1).
const SCAFFOLD_PLACEHOLDERS = new Set<string>([
  '전체', '카테고리1', '카테고리2', '카테고리3', '브랜드', '상품 1', '상품 2', '상품 3',
  '선택 약정 12개월 기준', '/12개월', '256GB | 512GB | 1TB',
  '혜택 1 문구를 입력하세요', '혜택 2 문구를 입력하세요', '혜택 3 문구를 입력하세요',
  '브랜드 1', '브랜드 2', '브랜드 3', '배너 타이틀', '배너 설명 문구', '자세히 보기', '라벨', '주요 값',
]);
// 코너가 '실제 내용'으로 채워졌는지 판정 — 실제 에셋 이미지(/로 시작) 또는 플레이스홀더가 아닌 실제 텍스트가 하나라도 있으면 채워진 것.
//  채워진 코너는 저장 콘텐츠로(그대로), 신규 껍데기는 코너 유형 관리와 동일한 가이드로 렌더(2026-11-05 사용자 요청).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cornerIsFilled(c: any): boolean {
  for (const cc of c.cornerComponents ?? []) {
    for (const ca of cc.component?.componentAtoms ?? []) {
      const a = ca.atom;
      if (!a) continue;
      if (typeof a.imageUrl === 'string' && a.imageUrl.startsWith('/')) return true;
      const t = (a.content ?? '').trim();
      if (t && !SCAFFOLD_PLACEHOLDERS.has(t)) return true;
    }
  }
  return false;
}
import { normalizeRecSource, isCvmSource, effectiveFallback, deriveZone, defaultComposition, componentTypesForCorner, CORNER_TYPES, type Zone } from '@/lib/display-taxonomy';
import { compositionToPreviewCorner } from '@/components/preview/composition-preview';
import { getProductOptions } from '../corner-types/built-options';
import type { PreviewCorner } from '@/components/preview/blocks';
import type { ProductOption } from '../corner-types/corner-type-manager';

// 코너 불러오기 '껍데기 가이드' — 코너 = 껍데기(규격)라 콘텐츠 없이 placeholder 슬롯으로만 미리보기.
//  불러오면 코너 유형(레이아웃·노출 타입)만 들어오고 내용은 빌더 '②수급'에서 채운다(2026-10-28 사용자 요청).
//  ★ 코너 유형 관리의 '코너 미리보기'(cornerRowPreview)와 똑같이 맞춘다(2026-11-05 사용자 요청) —
//     라벨=CornerTitle/ButtonText, 배지 제외, noTitle(탭·칩·프로필·상태 등) 처리까지 동일.
//     process-data는 서버 모듈이라 client의 cornerRowPreview를 직접 import하지 않고 동일 로직을 복제한다.
function guideCornerPreview(base: string, detail: string | null, component: string | null): PreviewCorner {
  const dStr = detail ?? '';
  const noTitle =
    base === '배너형' ||
    base === '바코드형' ||
    /탭|칩/.test(dStr) ||
    ['아이콘', '이미지형', '팝업', '띠', '텍스트배너', '프로필', '바코드', '상태'].some((k) => dStr.includes(k));
  const comp = component || componentTypesForCorner(base)[0] || null; // 없으면 유형 기본 컴포넌트로 레이아웃 가이드가 뜨게
  const c = compositionToPreviewCorner({
    base,
    detail,
    composition: defaultComposition(comp, detail, { badge: false }), // 배지 없음(어느 유형에도 배지 컬럼 없음)
    mainTitle: noTitle ? null : 'CornerTitle',
    subTitle: noTitle ? null : 'ButtonText',
    placeholder: true,
    emptyImages: true,
  });
  return { ...c, showImage: true, showPrice: true, showBadge: false, showDesc: true, moreButtonUse: noTitle ? false : true, moreButtonLabel: 'CTA' };
}

export type PCorner = {
  id: string; templateCornerId: string; name: string; cornerType: string; layout: string | null; layoutDetail: string | null; maxItems: number | null; preview: PreviewCorner;
  /** 수급 방식(정규화) · CVM 연동 여부 · CVM 비었을 때 폴백 — 폴백 UI용(2026-10-20) */
  recSource: string | null; isCvm: boolean; fallback: '미노출' | '운영자 편성으로 대체';
  /** 전시 존(Fixed/Dynamic/Semi) — 코너 리스트 밴드용(2026-10-21) */
  zone: Zone;
};
/** 코너 불러오기 모달용 — 코너 유형 관리의 선택 가능한 코너(+미리보기) */
export type LibCorner = { id: string; name: string; cornerType: string; layout: string | null; layoutDetail: string | null; maxItems: number | null; preview: PreviewCorner; bannerCount: number };
export type PTemplate = {
  id: string; name: string; conditionGroup: string | null; isDefault: boolean; status: string; corners: PCorner[];
  /** 템플릿 기본 정보 필드 */
  memo: string | null; displayOn: boolean; startAt: string | null; endAt: string | null; startAtOnApproval: boolean;
};
export type ProcessData = {
  containerId: string; containerName: string; containerType: string; platform: string;
  status: string; description: string | null; previewUrl: string | null; activeTemplateId: string;
  templates: PTemplate[]; libCorners: LibCorner[];
  /** 코너 '채우기 → 불러오기' 카탈로그 — 유형별. 상품형=상품 9분류, 혜택·오퍼형=혜택 분류. 2026-10-28 사용자 요청 */
  catalogByType: Record<string, ProductOption[]>;
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
      // 채워진 코너는 저장 콘텐츠 그대로, 신규 껍데기(스캐폴드)는 코너 유형 관리와 동일한 가이드로 렌더(2026-11-05 사용자 요청: 기존 채워진 건 그대로, 신규 등록만 코너 유형 관리처럼).
      //  Corner에는 componentType 컬럼이 없으므로 스캐폴드 컴포넌트(선택형 칩 제외)의 유형을 가이드 조합에 넘겨 코너 유형 관리와 일치시킨다.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      preview: cornerIsFilled(tc.corner)
        ? cornerToPreviewCorner(tc.corner)
        : guideCornerPreview(tc.corner.cornerType, tc.corner.layoutDetail ?? tc.corner.cornerLayout,
            ((tc.corner.cornerComponents ?? []).find((cc: any) => cc.component?.componentType !== '선택형')?.component?.componentType)
            ?? (tc.corner.cornerComponents ?? [])[0]?.component?.componentType ?? null),
      recSource: tc.corner.recSource ? normalizeRecSource(tc.corner.recSource) : null,
      isCvm: isCvmSource(tc.corner.recSource),
      fallback: effectiveFallback(tc.corner.cornerType, tc.corner.cvmFallback),
      zone: (tc.zone as Zone) ?? deriveZone(tc.corner.cornerType, tc.corner.recSource),
    })),
  }));

  const active = (activeTemplateId && templates.some((t) => t.id === activeTemplateId))
    ? activeTemplateId
    : (templates.find((t) => t.isDefault)?.id ?? templates[0]?.id ?? '');

  // 코너 불러오기 모달 = 코너 유형 관리(카탈로그)와 연동(2026-10-28 사용자 요청).
  //  배치된 코너가 아니라 '등록된 코너 유형'을 불러온다 → 목록이 코너 유형 관리와 1:1. 추가 시 그 유형으로 새 코너를 만든다(addCornersFromTypes).
  //  미리보기는 껍데기 가이드(빈 슬롯). id = cornerType.id.
  const rawTypes = await prisma.cornerType.findMany({
    where: { active: true, baseCategory: { in: [...CORNER_TYPES] } }, // 전시 7종만(이벤트·미션 코너 유형 제외)
    orderBy: [{ baseCategory: 'asc' }, { typeId: 'asc' }],
    take: 300,
  });
  const libCorners: LibCorner[] = rawTypes.map((ct) => ({
    id: ct.id,
    name: ct.name,
    cornerType: ct.baseCategory,
    layout: ct.layout,
    layoutDetail: ct.typeDetail,
    maxItems: ct.defaultMaxItems,
    preview: guideCornerPreview(ct.baseCategory, ct.typeDetail, ct.componentType),
    bannerCount: 0, // 배너형은 카탈로그 typeDetail(배너 단일형/스와이프형)로 이미 구분됨
  }));

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
    catalogByType: {
      '상품형': await getProductOptions('상품형'),
      '혜택·오퍼형': await getProductOptions('혜택·오퍼형'),
      '혜택형': await getProductOptions('혜택형'),
      '업무 진입형': await getProductOptions('업무 진입형'),
      '상태 안내형': await getProductOptions('상태 안내형'), // 업무 진입형 상태 안내형 전용 상태 카드(2026-11-05)
      '콘텐츠 안내형': await getProductOptions('콘텐츠 안내형'),
      '배너형': await getProductOptions('배너형'), // 배너 가져오기(배너 캠페인 관리) 카탈로그 — 누락돼 가져오기 안 되던 문제 수정(2026-11-05)
    },
  };
}

/** 템플릿 id 로 소속 Container 를 찾아 데이터 로드 (트리 템플릿 링크용) */
export async function loadProcessDataByTemplate(templateId: string): Promise<ProcessData | null> {
  const t = await prisma.template.findUnique({ where: { id: templateId }, select: { containerId: true } });
  if (!t) return null;
  return loadProcessData(t.containerId, templateId);
}
