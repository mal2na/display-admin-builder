/**
 * 전시 도메인 분류/상태 상수 — 단일 진실 원본(source of truth).
 *
 * SQLite + Prisma 조합은 native enum을 지원하지 않으므로, 유형/상태는 DB에 String으로
 * 저장하고 허용값은 여기서 상수로 관리한다. UI(Phase 2~)와 시드는 이 상수를 import 해서
 * 검증한다. 실제 DB로 교체하면 이 상수를 기준으로 native enum으로 승격할 수 있다.
 *
 * 개념 정의: 루트 CLAUDE.md / 정책서 POL-DSP v0.31.
 */

// ── Atom 유형 (9종) ─────────────────────────────────────────
// 정책서 대표 유형(텍스트/버튼/이미지/정보)을 디자인 라이브러리 기준(ACT-DSP-005)에 맞춰
// 운영자가 실제로 고르는 9종으로 확장한다. DB 저장값은 영문 키, 화면 표기는 한글 라벨.
export const ATOM_TYPES = [
  'TEXT', // 텍스트
  'BUTTON', // 버튼
  'IMAGE', // 이미지
  'ICON', // 아이콘
  'BADGE', // 배지
  'PRICE', // 가격
  'BENEFIT_TEXT', // 혜택문구
  'CTA', // CTA
  'INFO', // 정보값
] as const;
export type AtomType = (typeof ATOM_TYPES)[number];

export const ATOM_TYPE_LABELS: Record<AtomType, string> = {
  TEXT: '텍스트',
  BUTTON: '버튼',
  IMAGE: '이미지',
  ICON: '아이콘',
  BADGE: '배지',
  PRICE: '가격',
  BENEFIT_TEXT: '혜택문구',
  CTA: 'CTA',
  INFO: '정보값',
};

// 유형별로 폼에서 어떤 입력을 쓰는지 힌트 (UI 렌더링용)
export const ATOM_TYPE_FIELDS: Record<AtomType, { content: boolean; image: boolean; link: boolean }> = {
  TEXT: { content: true, image: false, link: false },
  BUTTON: { content: true, image: false, link: true },
  IMAGE: { content: false, image: true, link: true },
  ICON: { content: false, image: true, link: false },
  BADGE: { content: true, image: false, link: false },
  PRICE: { content: true, image: false, link: false },
  BENEFIT_TEXT: { content: true, image: false, link: false },
  CTA: { content: true, image: false, link: true },
  INFO: { content: true, image: false, link: false },
};

// 대체텍스트가 필수인 Atom 유형 (없으면 draft는 허용, review 전환 차단 — PI-DSP-CMP-004)
export const ALT_TEXT_REQUIRED_ATOM_TYPES: readonly AtomType[] = ['IMAGE', 'ICON'];

/**
 * PI-DSP-CMP-004 검수 준비 판정.
 * 이미지/아이콘 Atom인데 대체텍스트가 없으면 "검수 요청 불가"(review 차단 대상).
 */
export function isAtomReviewReady(atomType: string, altText: string | null | undefined): boolean {
  if ((ALT_TEXT_REQUIRED_ATOM_TYPES as readonly string[]).includes(atomType)) {
    return !!altText && altText.trim().length > 0;
  }
  return true;
}

// ── Component 유형 (6종) ────────────────────────────────────
export const COMPONENT_TYPES = [
  '정보형',
  '행동형',
  '혜택형',
  '선택형',
  '배너형',
  '상품형',
] as const;
export type ComponentType = (typeof COMPONENT_TYPES)[number];

// ── Corner 유형 (8종) ───────────────────────────────────────
export const CORNER_TYPES = [
  '상품형',
  '배너형',
  '혜택·오퍼형',
  '업무 진입형',
  '상태 안내형',
  '콘텐츠 안내형',
  '개인화 추천형',
  '고정·필수 노출형',
] as const;
export type CornerType = (typeof CORNER_TYPES)[number];

// ── 코너 유형 카탈로그 (T우주 "코너 유형 관리") 부가 상수 ──
// 코너 유형 등록/승인 상태 (T우주 이미지: 임시저장/승인대기/승인완료/승인반려)
export const CORNER_TYPE_STATUSES = [
  { key: 'DRAFT', label: '임시저장' },
  { key: 'REVIEW', label: '승인대기' },
  { key: 'APPROVED', label: '승인완료' },
  { key: 'REJECTED', label: '승인반려' },
] as const;
export type CornerTypeStatusKey = (typeof CORNER_TYPE_STATUSES)[number]['key'];
export const CORNER_TYPE_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  CORNER_TYPE_STATUSES.map((s) => [s.key, s.label]),
);

// 운영 채널 / 운영 플랫폼 (코너 유형 정보 - 기본 정보)
export const OPERATION_CHANNELS = ['전체', 'FO', 'BO'] as const;
export const OPERATION_PLATFORMS = ['전체', '모바일', 'PC'] as const;

// 코너 유형 세부 항목(항목별 사용여부) 정의 — 폼/표기 공용
export const CORNER_TYPE_FEATURES = [
  { key: 'useMainTitle', label: '메인 타이틀' },
  { key: 'useSubTitle', label: '서브 타이틀' },
  { key: 'useMinItems', label: '최소 노출 개수' },
  { key: 'useMaxItems', label: '최대 노출 개수' },
  { key: 'useNoDisplay', label: '미 노출 기준' },
  { key: 'useMoreButton', label: '더보기 여부' },
] as const;

// 우리 8분류(CORNER_TYPES) → T우주 이미지의 코너 유형 표기명 매핑.
// 이미지에 대응 유형이 있으면 그 이름을, 없으면 우리 이름을 쓴다(코너 유형 카탈로그 seed 기본값).
export const CORNER_TYPE_IMAGE_NAME: Partial<Record<CornerType, string>> = {
  상품형: '상품형',
  배너형: '배너형',
  '혜택·오퍼형': '혜택 컨텐츠형',
  '개인화 추천형': '개인화 컨텍스트',
  '고정·필수 노출형': '관리용(고정형)',
};
export function cornerTypeDisplayName(baseCategory: string): string {
  return CORNER_TYPE_IMAGE_NAME[baseCategory as CornerType] ?? baseCategory;
}

// ── 코너 정보 부가 옵션 (T우주 코너1·코너2 참고) ──
// 유형 상세: 코너 유형 안에서의 레이아웃 변형
export const CORNER_LAYOUT_DETAILS = [
  '가로형(2.5배열)',
  '단일강조(1.5배열)',
  '세로형',
  '세로형(배너)',
  '이미지형',
  '이미지형/빅배너',
  '팝업배너형',
  '스몰배너',
  '묶음형(키워드)',
  '패스형',
  '고정형(탭)',
] as const;
export type CornerLayoutDetail = (typeof CORNER_LAYOUT_DETAILS)[number];

// 코너 레이아웃: 노출 방식
export const CORNER_LAYOUTS = ['가로 SWIPE형', '세로 리스트형', '그리드형', '단일형', '단일 고정형'] as const;
export type CornerLayout = (typeof CORNER_LAYOUTS)[number];

// 미 노출 조건 (상품형 코너3)
export const NO_DISPLAY_CONDITIONS = ['선택 없음', '재고 소진 시', '혜택 종료 시', '개인화 제한 시'] as const;

// 서브 타이틀 아이콘
export const SUBTITLE_ICONS = ['사용안함', '말줄임표', '화살표', '정보'] as const;
export type SubtitleIcon = (typeof SUBTITLE_ICONS)[number];

// 코너 유형을 3개 패밀리로 묶는다 (컬럼/유형상세가 패밀리별로 달라짐)
//  - product : 상품형
//  - banner  : 배너형
//  - manage  : 그 외(관리·콘텐츠형) — 혜택·오퍼/업무진입/상태안내/콘텐츠안내/개인화추천/고정필수
export type CornerFamily = 'product' | 'banner' | 'manage';
export function cornerFamily(cornerType: string): CornerFamily {
  if (cornerType === '상품형') return 'product';
  if (cornerType === '배너형') return 'banner';
  return 'manage';
}

// 유형 상세: 패밀리별로 선택지가 다르다 (상품형 > 세로형/묶음형 …)
export const LAYOUT_DETAILS_BY_FAMILY: Record<CornerFamily, string[]> = {
  product: ['단일강조(1.5배열)', '세로형', '세로형(배너)', '세로형(카테고리탭)', '그리드형', '묶음형(키워드)', '패스형'],
  banner: ['이미지형', '이미지형/빅배너', '팝업배너형', '스몰배너', '텍스트배너'],
  manage: ['고정형(탭)', '세로형', '리스트형', '카드형', '아코디언형'],
};

// 복합형(개인화 추천형) 전용 유형 상세.
// 하나의 코너 안에 [헤더(제목/배너) + (탭 칩) + 본문(리스트/그리드/상품)]을 조합한 케이스.
// 레퍼런스(메인) 기준: 'VIP 지훈님…'=제목+탭+리스트, 'T Week 소멸 혜택'=배너+리스트.
// (명칭은 운영 편의상 조정 가능)
export const COMPOSITE_LAYOUT_DETAILS = [
  '제목+리스트', // 제목 + 혜택 리스트 (기본 복합)
  '제목+탭+리스트', // 제목 + 카테고리 탭(칩) + 리스트 — VIP형
  '제목+탭+그리드', // 제목 + 탭 + 2열 그리드 카드
  '배너+리스트', // 상단 배너(히어로) + 리스트 — T Week형
  '배너+탭+리스트', // 배너 + 탭 + 리스트
  '탭+상품카드', // 탭 + 상품 가로 스와이프
  '배너+상품카드', // 배너 + 상품 카드
] as const;

export function layoutDetailsFor(cornerType: string): string[] {
  if (cornerType === '개인화 추천형') return [...COMPOSITE_LAYOUT_DETAILS];
  return LAYOUT_DETAILS_BY_FAMILY[cornerFamily(cornerType)];
}

// 복합형 유형 상세 → 본문 레이아웃 힌트 (미리보기 렌더링에 사용)
export function compositeBodyLayout(layoutDetail?: string | null): 'grid' | 'horizontal' | 'list' {
  if (!layoutDetail) return 'list';
  if (layoutDetail.includes('그리드')) return 'grid';
  if (layoutDetail.includes('상품카드')) return 'horizontal';
  return 'list';
}

// 상품 노출 순서 (상품형 코너 전용 컬럼 — img9 참고)
export const PRODUCT_SORT_OPTIONS = ['낮은 가격순', '높은 가격순', '최신순', '인기순', '수동(배치 순서)'] as const;

// ── corner_type → 허용 component_type 매핑 (PI-DSP-CMP-003) ──
// 정책서 baseline. Corner 유형을 고르면 여기 없는 Component 유형은 붙일 수 없다.
export const CORNER_COMPONENT_MAP: Record<CornerType, readonly ComponentType[]> = {
  // 상품형: 상품 컴포넌트 + 상단 카테고리 탭(선택형) 허용 — '세로형(카테고리탭)' 유형 지원
  상품형: ['상품형', '선택형'],
  배너형: ['배너형'],
  '혜택·오퍼형': ['혜택형', '정보형', '행동형', '배너형'],
  '업무 진입형': ['행동형', '정보형', '선택형'],
  '상태 안내형': ['정보형', '행동형'],
  '콘텐츠 안내형': ['정보형', '행동형', '배너형'],
  '개인화 추천형': ['정보형', '혜택형', '선택형', '행동형', '배너형'],
  '고정·필수 노출형': ['정보형', '행동형'],
};

export function isComponentAllowedInCorner(
  cornerType: CornerType,
  componentType: ComponentType,
): boolean {
  return CORNER_COMPONENT_MAP[cornerType].includes(componentType);
}

/**
 * 역방향 조회: 이 Component 유형을 담을 수 있는 Corner 유형 목록.
 * Component.allowedCornerTypes 체크박스에서 "고를 수 있는" 후보를 이걸로 제한한다
 * (PI-DSP-CMP-003을 넘어서는 값은 애초에 못 고르게 한다).
 */
export function cornerTypesForComponent(componentType: ComponentType): CornerType[] {
  return CORNER_TYPES.filter((ct) => CORNER_COMPONENT_MAP[ct].includes(componentType));
}

// ── 전시 상태 10단계 (ST-DSP-001 ~ 010) ────────────────────
// key = DB 저장값(Template.status). code = 정책서 상태 코드. label = 화면 표기.
export const DISPLAY_STATUSES = [
  { key: 'DRAFT', code: 'ST-DSP-001', label: '초안 작성중' },
  { key: 'REVIEW', code: 'ST-DSP-002', label: '검수 대기' },
  { key: 'REJECTED', code: 'ST-DSP-003', label: '수정 필요' },
  { key: 'APPROVED', code: 'ST-DSP-004', label: '승인 완료' },
  { key: 'SCHEDULED', code: 'ST-DSP-005', label: '예약 대기' },
  { key: 'PUBLISHED', code: 'ST-DSP-006', label: '게시 중' },
  { key: 'SUSPENDED', code: 'ST-DSP-007', label: '게시 중지' },
  { key: 'ENDED', code: 'ST-DSP-008', label: '종료' },
  { key: 'ROLLED_BACK', code: 'ST-DSP-009', label: '롤백 완료' },
  { key: 'PERSONALIZATION_LIMITED', code: 'ST-DSP-010', label: '개인화 제한' },
] as const;

export type DisplayStatusKey = (typeof DISPLAY_STATUSES)[number]['key'];

export const DISPLAY_STATUS_LABEL: Record<DisplayStatusKey, string> = Object.fromEntries(
  DISPLAY_STATUSES.map((s) => [s.key, s.label]),
) as Record<DisplayStatusKey, string>;

// 허용 상태 전이 (정책서 "마. 상태 전이표"). 워크플로우 로직(Phase 4)에서 사용.
export const DISPLAY_STATUS_TRANSITIONS: Record<DisplayStatusKey, DisplayStatusKey[]> = {
  DRAFT: ['REVIEW'],
  REVIEW: ['APPROVED', 'REJECTED'],
  REJECTED: ['REVIEW'],
  APPROVED: ['SCHEDULED', 'PUBLISHED'], // 예약 또는 즉시 게시
  SCHEDULED: ['PUBLISHED', 'REJECTED'], // 도래 시 게시, 충돌 발견 시 수정 필요로 회귀
  PUBLISHED: ['ENDED', 'SUSPENDED', 'PERSONALIZATION_LIMITED'],
  SUSPENDED: ['ROLLED_BACK'], // Draft/Review/Rejected로는 롤백 불가 (PI-DSP-RBK-002)
  ENDED: [],
  ROLLED_BACK: ['REVIEW'], // 롤백 후 수정본을 재검수 대상으로
  PERSONALIZATION_LIMITED: ['PUBLISHED'], // 제한 만료/해제 시 복귀
};

// ── Container 유형 / 상태 ───────────────────────────────────
export const CONTAINER_TYPES = ['MAIN', 'MENU', 'CURATION', 'BENEFIT'] as const;
export type ContainerType = (typeof CONTAINER_TYPES)[number];

export const CONTAINER_STATUSES = ['active', 'inactive'] as const;
export type ContainerStatus = (typeof CONTAINER_STATUSES)[number];

// 컨테이너 승인 워크플로우 상태 — 전시(active/inactive)와 별개. 승인 후에 전시로 나갈 수 있다.
export const CONTAINER_APPROVAL_STATUSES = [
  { key: 'DRAFT', label: '작성중' },
  { key: 'REVIEW', label: '승인 대기' },
  { key: 'APPROVED', label: '승인 완료' },
  { key: 'REJECTED', label: '반려' },
] as const;
export type ContainerApprovalStatusKey = (typeof CONTAINER_APPROVAL_STATUSES)[number]['key'];
export const CONTAINER_APPROVAL_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  CONTAINER_APPROVAL_STATUSES.map((s) => [s.key, s.label]),
);
// 허용 전이: 작성중/반려 → 승인 대기 → 승인 완료/반려. 승인 완료 후 수정 시 작성중으로 회귀.
export const CONTAINER_APPROVAL_TRANSITIONS: Record<string, ContainerApprovalStatusKey[]> = {
  DRAFT: ['REVIEW'],
  REVIEW: ['APPROVED', 'REJECTED'],
  REJECTED: ['REVIEW'],
  APPROVED: ['DRAFT'],
};

// T우주 컨테이너 등록 화면 기준 (컨테이너정보 참고)
export const CONTAINER_KINDS = ['일반', '코너관리용'] as const; // 컨테이너 타입
export const CONTAINER_PLATFORMS = ['모바일', 'PC'] as const; // 플랫폼

// ── 재료(Atom/Component/Corner) 상태 = 사용/미사용 ──────────
// 10단계 워크플로우 상태는 Template에만 붙는다(Phase 1 결정). 재료는 라이브러리 자산이므로
// 사용(active)/미사용(inactive) 만 가진다.
export const MATERIAL_STATUSES = ['active', 'inactive'] as const;
export type MaterialStatus = (typeof MATERIAL_STATUSES)[number];

export const MATERIAL_STATUS_LABELS: Record<MaterialStatus, string> = {
  active: '사용',
  inactive: '미사용',
};
