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
  'BARCODE', // 바코드 — 회원별 런타임 발급(동적). 어드민은 정책만 관리, 값은 미입력.
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
  BARCODE: '바코드',
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
  // 바코드 값은 회원 인증 기반으로 런타임 발급 → 어드민에서 값 입력 없음(정책은 별도 관리)
  BARCODE: { content: false, image: false, link: false },
};

// 런타임에 데이터 바인딩되는(어드민이 값을 직접 입력하지 않는) 동적 Atom 유형
export const DYNAMIC_ATOM_TYPES: readonly AtomType[] = ['BARCODE'];

// ── CVM(고객관리) 데이터 바인딩 ──────────────────────────────────────────────
// 어드민이 직접 입력하지 않고 CVM에서 회원별로 가져오는 필드 카탈로그.
// 바인딩된 Atom은 content에 "@cvm:<key>" 토큰을 저장한다. 빌더 미리보기는 sample로 대체 표시.
export const CVM_FIELDS = [
  { key: 'customer.name', label: '고객 이름', sample: '김지훈', category: '기본' },
  { key: 'customer.phone', label: '휴대폰 번호', sample: '010-****-5678', category: '기본' },
  { key: 'membership.number', label: '멤버십 번호', sample: '1234 4561 1506 4932', category: '멤버십' },
  { key: 'membership.grade', label: '멤버십 등급', sample: 'VIP', category: '멤버십' },
  { key: 'membership.point', label: '멤버십 포인트', sample: '13,500P', category: '멤버십' },
  { key: 'bill.amount', label: '실시간 이용요금', sample: '39,250원', category: '요금' },
  { key: 'data.remaining', label: '데이터 잔여량', sample: '6.5GB', category: '데이터' },
  { key: 'combine.count', label: '결합 가족 수', sample: '4명', category: '결합' },
] as const;
export type CvmFieldKey = (typeof CVM_FIELDS)[number]['key'];
export const CVM_FIELD_BY_KEY: Record<string, (typeof CVM_FIELDS)[number]> = Object.fromEntries(CVM_FIELDS.map((f) => [f.key, f]));

const CVM_PREFIX = '@cvm:';
export const isCvmBinding = (v?: string | null): v is string => !!v && v.startsWith(CVM_PREFIX);
export const cvmBindingKey = (v?: string | null): string | null => (isCvmBinding(v) ? v.slice(CVM_PREFIX.length) : null);
// 바인딩 토큰이면 CVM 라벨(예: "멤버십 번호"), 아니면 null
export function cvmBindingLabel(v?: string | null): string | null {
  const k = cvmBindingKey(v);
  return k ? (CVM_FIELD_BY_KEY[k]?.label ?? k) : null;
}
// 미리보기 표시값: 바인딩이면 CVM sample로, 아니면 원문 그대로
export function resolveCvmSample(v?: string | null): string {
  const k = cvmBindingKey(v);
  if (!k) return v ?? '';
  return CVM_FIELD_BY_KEY[k]?.sample ?? (v ?? '');
}

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

// 코너 유형별 '목적' — 정책서 코너 유형 표(목적 컬럼)의 문구를 그대로 사용(임의 변경 금지).
export const CORNER_TYPE_PURPOSE: Record<CornerType, string> = {
  상품형: '상품, 요금제, 단말, 부가서비스 후보를 탐색하게 한다.',
  배너형: '기간성 이벤트, 공지, 프로모션을 노출한다.',
  '혜택·오퍼형': '고객이 받을 수 있는 혜택, 쿠폰, 제휴 오퍼를 제안한다.',
  '업무 진입형': '조회, 변경, 신청, 납부 같은 업무로 바로 이동하게 한다.',
  '상태 안내형': '고객 상태, 보유 정보, 진행 상태, 제한 사유를 안내한다.',
  '콘텐츠 안내형': '이용 가이드, 설명, 추천 콘텐츠를 제공한다.',
  '개인화 추천형': '고객 상태와 행동에 따라 후보와 순서를 다르게 보여준다.',
  '고정·필수 노출형': '필수 고지, 장애 안내, 보안 안내처럼 안정적으로 유지해야 하는 정보를 노출한다.',
};
export function cornerTypePurpose(cornerType?: string | null): string {
  if (!cornerType) return '';
  return (CORNER_TYPE_PURPOSE as Record<string, string>)[cornerType] ?? '';
}

// 코너 유형(8종) → Chip 색상. 같은 유형이면 코너 유형 관리·빌더 어디서든 같은 색으로 보이게 하는 SSOT.
// 부드러운 톤(bg-50/text-700/border-200) — BSS UI 라벤더/인디고 크롬과 충돌하지 않는 8색.
export const CORNER_TYPE_CHIP: Record<CornerType, string> = {
  상품형: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  배너형: 'bg-rose-50 text-rose-700 border-rose-200',
  '혜택·오퍼형': 'bg-amber-50 text-amber-700 border-amber-200',
  '업무 진입형': 'bg-sky-50 text-sky-700 border-sky-200',
  '상태 안내형': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  '콘텐츠 안내형': 'bg-violet-50 text-violet-700 border-violet-200',
  '개인화 추천형': 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  '고정·필수 노출형': 'bg-slate-100 text-slate-700 border-slate-300',
};
// 코너 유형 → Chip className. 알 수 없는 값은 중립(회색)으로.
export function cornerTypeChipClass(cornerType?: string | null): string {
  if (!cornerType) return 'bg-slate-100 text-slate-600 border-slate-200';
  return (CORNER_TYPE_CHIP as Record<string, string>)[cornerType] ?? 'bg-slate-100 text-slate-600 border-slate-200';
}

// ── 코너 유형 카탈로그 (T우주 "코너 유형 관리") 부가 상수 ──
// 코너 유형 등록/승인 상태 (T우주 이미지: 임시저장/승인대기/승인완료/승인반려)
// 전시 정책서(TM-DSP-020) 승인 상태값: 임시저장 · 승인요청 · 승인완료 · 반려.
// 목록 상단 탭 노출 순서: 승인완료 → 승인요청 → 반려 → 임시저장 (전체는 코드에서 앞에 붙임).
export const CORNER_TYPE_STATUSES = [
  { key: 'APPROVED', label: '승인완료' },
  { key: 'REVIEW', label: '승인요청' },
  { key: 'REJECTED', label: '반려' },
  { key: 'DRAFT', label: '임시저장' },
] as const;
export type CornerTypeStatusKey = (typeof CORNER_TYPE_STATUSES)[number]['key'];
export const CORNER_TYPE_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  CORNER_TYPE_STATUSES.map((s) => [s.key, s.label]),
);
export const CORNER_TYPE_STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600 border-slate-200',
  REVIEW: 'bg-amber-100 text-amber-800 border-amber-200',
  APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-rose-100 text-rose-700 border-rose-200',
};

// 코너 유형 거버넌스는 두 축이다:
//  (1) status = 편집본(작업본)의 승인 상태 (임시저장/승인대기/승인완료/승인반려)
//  (2) 라이브 승인본 존재/버전 = 실제 사용 가능 여부. 재검수 중에도 라이브는 유지된다.
// 승인완료는 곧 사용이 아니라, 운영자가 '반영(사용)'을 눌러야 라이브로 승격(수동 게시)된다.
export function deriveCornerTypeUsage(o: { status: string; active: boolean; liveVersion: number | null; workingVersion: number }) {
  const live = o.liveVersion != null && o.active; // 사용 중(반영된 승인본 존재 + 사용 ON)
  const needsPublish = o.status === 'APPROVED' && (o.liveVersion ?? -1) !== o.workingVersion; // 승인완료·미반영 → 반영 필요
  const changeInReview = o.status === 'REVIEW' && o.liveVersion != null; // 라이브 유지 중 변경 검수 중
  return { live, needsPublish, changeInReview };
}

// 운영 채널 / 운영 플랫폼 (코너 유형 정보 - 기본 정보)
export const OPERATION_CHANNELS = ['전체', 'FO', 'BO'] as const;
export const OPERATION_PLATFORMS = ['전체', '모바일', 'PC'] as const;

// 코너 유형 세부 항목(항목별 사용여부) 정의 — 폼/표기 공용
// 노출 개수(최소/최대)는 코너 유형이 아니라 빌더에서 코너별로 조정한다 → 세부 항목에서 제외.
// 더보기 → 'CTA 노출'로 일반화(전체보기·바로가기 등 포함, moreButton* 필드 재사용).
export const CORNER_TYPE_FEATURES = [
  { key: 'useMainTitle', label: '타이틀' },
  { key: 'useSubTitle', label: '서브타이틀' },
  { key: 'useNoDisplay', label: '미 노출 기준' },
  { key: 'useMoreButton', label: 'CTA 노출' },
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
  // 혜택·오퍼형: 혜택 홈 정리(카테고리 탭+제휴 상품 카드)처럼 상품형·선택형 결합 허용 — 상세설계 확정(정책 baseline 확장)
  '혜택·오퍼형': ['혜택형', '정보형', '행동형', '배너형', '상품형', '선택형'],
  // 업무 진입형: 상단 탭·메뉴 등 '선택/이동' 컴포넌트만 담는다 → 선택형 단일
  '업무 진입형': ['선택형'],
  '상태 안내형': ['정보형', '행동형'],
  // 콘텐츠 안내형: 레퍼런스(영화 예매 혜택 등)처럼 상품형 카드 결합 허용 — 상세설계 확정(정책 baseline 확장)
  '콘텐츠 안내형': ['정보형', '행동형', '배너형', '상품형'],
  // 개인화 추천형: 0 Week('지훈님에게만' 개인화) 등 상품형 카드 결합 허용 — 상세설계 확정(정책 baseline 확장)
  '개인화 추천형': ['정보형', '혜택형', '선택형', '행동형', '배너형', '상품형'],
  '고정·필수 노출형': ['정보형', '행동형'],
};

export function isComponentAllowedInCorner(
  cornerType: CornerType,
  componentType: ComponentType,
): boolean {
  return CORNER_COMPONENT_MAP[cornerType].includes(componentType);
}

// ─────────────────────────────────────────────────────────────
// 코너 세부 유형(typeDetail) SSOT — "정확한 룰"의 단일 출처.
//  · 코너 유형 8종(위 CORNER_TYPES/CORNER_COMPONENT_MAP)은 정책서 근거: PI-DSP-CMP-003 / TM-DSP-021.
//  · 그러나 '세부 유형'은 정책서가 "상세 설계에서 확정한다"고만 규정 → 정책서에 고정값이 없다.
//    따라서 아래 목록이 우리 서비스의 세부 유형 확정 카탈로그(상세 설계 산출물)다.
//    새 세부 유형은 반드시 여기 추가한 뒤 코너 등록/빌더에서 사용한다(임의 문자열 금지).
export const CORNER_TYPE_DETAILS: Record<CornerType, readonly string[]> = {
  상품형: ['가로형(2.5배열)', '세로형', '단일강조(1.5배열)', '세로형(배너)', '세로형(카테고리탭)', '단일 상품'],
  배너형: ['이미지형', '이미지형/빅배너', '팝업배너형', '띠배너형'],
  '혜택·오퍼형': ['세로형', '그리드형'],
  '업무 진입형': ['고정형(탭)', '세로 리스트형', '메뉴 리스트'],
  '상태 안내형': ['금액형', '사용량형', '카드형'],
  '콘텐츠 안내형': ['리스트형', '아코디언형'],
  '개인화 추천형': ['복합형(세로)'],
  '고정·필수 노출형': ['프로필형', '바코드', '고지형'],
};
export function cornerTypeDetails(cornerType: string): readonly string[] {
  return (CORNER_TYPE_DETAILS as Record<string, readonly string[]>)[cornerType] ?? [];
}

// ── 3단 계층 ③: 구성 컴포넌트 유형(②) → 배열/레이아웃 상세 SSOT ──
//  코너 유형(①) → CORNER_COMPONENT_MAP → 컴포넌트 유형(②) → 여기 → 배열 상세(③).
//  같은 '상품형'이라도 ①(상품 코너 자체)과 ②(다른 코너 안 상품 모듈)는 계층이 다르며,
//  배열 상세는 언제나 ②(컴포넌트) 기준으로 정한다. (예: 콘텐츠 안내형 · 상품형 · 단일강조(1.5배열))
//  어휘는 CORNER_TYPE_DETAILS / LAYOUT_DETAILS_BY_FAMILY와 동일하게 유지(임의 문자열 금지).
export const COMPONENT_LAYOUT_DETAILS: Record<ComponentType, readonly string[]> = {
  // 빅배너는 배열이 아니라 '구분자'(bigBanner)로 분리 → 여기엔 순수 배열만 둔다.
  상품형: ['가로형(2.5배열)', '세로형', '단일강조(1.5배열)', '세로형(카테고리탭)', '그리드형', '단일 상품'],
  배너형: ['이미지형', '이미지형/빅배너', '팝업배너형', '띠배너형', '텍스트배너'],
  정보형: ['아이콘형', '금액형', '사용량형', '카드형', '리스트형', '프로필형', '바코드', '고지형'],
  행동형: ['버튼형', '메뉴 리스트', '고정형(탭)', '바로가기'],
  혜택형: ['혜택 카드', '세로형', '그리드형', '쿠폰형'],
  선택형: ['카테고리 탭', '메뉴 리스트'],
};
export function componentLayoutDetails(componentType?: string | null): readonly string[] {
  if (!componentType) return [];
  return (COMPONENT_LAYOUT_DETAILS as Record<string, readonly string[]>)[componentType] ?? [];
}
// 코너 유형(①) → 담을 수 있는 컴포넌트 유형(②) 후보 (CORNER_COMPONENT_MAP 그대로)
export function componentTypesForCorner(cornerType: string): readonly ComponentType[] {
  return (CORNER_COMPONENT_MAP as Record<string, readonly ComponentType[]>)[cornerType] ?? [];
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

// ── 코너 검수 워크플로우 상태 ─────────────────────────────
// 코너 단위 생성 → 검수 요청 → 승인/반려. 운영자는 "검수 요청"만 보내고,
// 승인/반려는 승인권자가 처리한다(정책서 PI-DSP-WFL-002). 반려 시 사유를 남긴다.
export const CORNER_REVIEW_STATUSES = [
  { key: 'DRAFT', code: 'ST-DSP-001', label: '초안 작성중' },
  { key: 'REVIEW', code: 'ST-DSP-002', label: '검수 대기' },
  { key: 'REJECTED', code: 'ST-DSP-003', label: '수정 필요' },
  { key: 'APPROVED', code: 'ST-DSP-004', label: '승인 완료' },
] as const;
export type CornerReviewStatusKey = (typeof CORNER_REVIEW_STATUSES)[number]['key'];
export const CORNER_REVIEW_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  CORNER_REVIEW_STATUSES.map((s) => [s.key, s.label]),
);
// 검수 상태 뱃지 색 (전시 워크플로우 STATUS_COLOR와 톤 일치)
export const CORNER_REVIEW_STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600 border-slate-200',
  REVIEW: 'bg-amber-100 text-amber-800 border-amber-200',
  REJECTED: 'bg-rose-100 text-rose-700 border-rose-200',
  APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};
// 허용 전이: 작성중/반려 → 검수 대기 → 승인 완료/수정 필요. 승인 후 수정 시 작성중 회귀.
export const CORNER_REVIEW_TRANSITIONS: Record<string, CornerReviewStatusKey[]> = {
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
