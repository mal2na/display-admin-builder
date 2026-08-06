/**
 * 이벤트 페이지 빌더 — 컴포넌트 카탈로그 (SSOT).
 * 레퍼런스: nebula-builder (Event Builder) 좌측 컴포넌트 팔레트.
 *
 * 페이지는 EventNode 트리로 구성된다. 각 노드는 type + props(JSON)를 가진다.
 * 컨테이너(CARD/HROW/VSTACK/ACCORDION)는 children을 중첩할 수 있다.
 */
import {
  CORNER_TYPES as DSP_CORNER_TYPES,
  CORNER_COMPONENT_MAP,
  type CornerType as DspCornerType,
  type ComponentType as DspComponentType,
} from './display-taxonomy';

export type NodeType =
  | 'TEXT'
  | 'TABLE'
  | 'IMAGE'
  | 'BUTTON'
  | 'ACCORDION'
  | 'CARD'
  | 'HROW'
  | 'VSTACK'
  | 'DIVIDER'
  | 'HTML'
  | 'ROULETTE'
  // ── 위치 표시(등록정보/시스템 관리 — 빌더에서 편집 불가, 위치만 표시) ──
  | 'SLOT_HEADER' // 헤더: 제목·운영기간·대상 (등록정보)
  | 'SLOT_THUMB' // 썸네일: 대표 이미지 (등록정보)
  | 'SLOT_NOTICE' // 유의사항: 필수 고지
  | 'SLOT_CONSENT' // 개인정보·제휴사 제공 동의
  | 'SLOT_REWARD' // 보상·지급 일정
  | 'SLOT_CTA' // 하단 고정 CTA (Label)
  // ── 전시(거버넌스 모드) 전용 ──
  | 'CORNER' // 거버넌스 컨테이너: cornerType + 허용 컴포넌트 제약 + 재사용
  | 'BANNER' // 배너형
  | 'PRODUCT' // 상품형
  | 'BENEFIT' // 혜택형
  | 'CHIP'; // 선택형(탭/칩)

export type ComponentDef = {
  type: NodeType;
  label: string;
  sub: string; // 팔레트 보조 설명
  group: string; // 콘텐츠 | Button | 레이아웃 | 고급 | 게임
  icon: string; // lucide icon name (아래 ICON_MAP에서 매핑)
  container: boolean; // children 중첩 가능 여부
  defaultProps: Record<string, unknown>;
};

// 공통 여백 기본값 (margin/padding). 우측 속성 "공통 설정"에서 편집.
const SPACING = { mt: 0, mr: 0, mb: 0, ml: 0, pt: 0, pr: 0, pb: 0, pl: 0 };

export const COMPONENTS: ComponentDef[] = [
  // ── 콘텐츠 ──
  {
    type: 'TEXT',
    label: '텍스트',
    sub: '자유 텍스트',
    group: '콘텐츠',
    icon: 'Type',
    container: false,
    defaultProps: { text: '텍스트를 입력하세요', size: 15, weight: 'normal', align: 'left', color: '#334155', ...SPACING },
  },
  {
    type: 'TABLE',
    label: '표',
    sub: '행·열 표(요금표 등)',
    group: '콘텐츠',
    icon: 'Table',
    container: false,
    defaultProps: {
      variant: '기본', // 기본 | 가로줄 | 카드형 | 미니멀
      headerRange: 1,
      headers: ['구분', '항목 A', '항목 B'],
      rows: [
        ['내용 1', '10,000원', '20,000원'],
        ['내용 2', '30,000원', '40,000원'],
      ],
      ...SPACING,
      pt: 8, pb: 8,
    },
  },
  {
    type: 'IMAGE',
    label: '이미지',
    sub: '사진·포스터·앱',
    group: '콘텐츠',
    icon: 'Image',
    container: false,
    defaultProps: { url: '', height: 'auto', overlayText: '', overlay: false, radius: 12, ...SPACING },
  },
  // ── Button ──
  {
    type: 'BUTTON',
    label: '버튼',
    sub: 'CTA 버튼',
    group: 'Button',
    icon: 'Sparkles',
    container: false,
    defaultProps: { label: '참여하기', href: '', bg: '#6366f1', color: '#ffffff', radius: 12, full: true, ...SPACING, pt: 4, pb: 4 },
  },
  {
    type: 'ACCORDION',
    label: '접이식 버튼',
    sub: '접었다 펴는 컨테이너',
    group: 'Button',
    icon: 'ListCollapse',
    container: true,
    defaultProps: { header: '접이식 버튼', open: false, headerBg: '#f1f5f9', headerColor: '#334155', ...SPACING },
  },
  // ── 레이아웃 ──
  {
    type: 'CARD',
    label: '카드',
    sub: '블록을 담는 카드',
    group: '레이아웃',
    icon: 'Square',
    container: true,
    defaultProps: { bg: '#ffffff', radius: 16, shadow: true, ...SPACING, pt: 16, pr: 16, pb: 16, pl: 16 },
  },
  {
    type: 'HROW',
    label: '가로 묶음',
    sub: '자식을 가로로 묶는 컨테이너',
    group: '레이아웃',
    icon: 'Columns3',
    container: true,
    defaultProps: { gap: 12, align: 'center', justify: 'start', grow: false, wrap: 'nowrap', ...SPACING },
  },
  {
    type: 'VSTACK',
    label: '세로 묶음',
    sub: '자식을 세로로 묶는 컨테이너',
    group: '레이아웃',
    icon: 'Rows3',
    container: true,
    defaultProps: { gap: 12, align: 'stretch', ...SPACING },
  },
  {
    type: 'DIVIDER',
    label: '구분선',
    sub: '실선·점선 라인',
    group: '레이아웃',
    icon: 'Minus',
    container: false,
    defaultProps: { style: 'solid', color: '#e2e8f0', thickness: 1, ...SPACING, pt: 8, pb: 8 },
  },
  // ── 고급 ──
  {
    type: 'HTML',
    label: 'HTML',
    sub: '임의 HTML/스크립트',
    group: '고급',
    icon: 'Code',
    container: false,
    defaultProps: { html: '<div style="text-align:center;padding:24px">\n  <h3>커스텀 섹션</h3>\n  <p>HTML/CSS/JS를 자유롭게 작성하세요</p>\n</div>', height: 'auto', ...SPACING },
  },
  // ── 게임 ──
  {
    type: 'ROULETTE',
    label: '룰렛',
    sub: '돌림판 게임 — 결과룰렛',
    group: '게임',
    icon: 'Dices',
    container: false,
    defaultProps: {
      segments: ['5P', '갤럭시 탭', '5,000원권', '갤럭시 워치', '1,000원권', '꽝', '20만원권', '꽝'],
      colors: ['#f87171', '#fb923c', '#fbbf24', '#34d399', '#22d3ee', '#818cf8', '#c084fc', '#f472b6'],
      startLabel: 'START',
      ...SPACING,
      pt: 8, pb: 8,
    },
  },

  // ── 위치 표시 (등록정보·시스템에서 관리 — 빌더는 위치만 표시, 내용 편집 불가) ──
  {
    type: 'SLOT_HEADER',
    label: '헤더',
    sub: '제목·기간·대상 (등록정보)',
    group: '위치 표시',
    icon: 'LayoutPanelTop',
    container: false,
    defaultProps: { slotKey: 'header', label: '헤더 (제목·운영기간·대상)', note: '등록정보(기본 정보)에서 관리됩니다.', ...SPACING },
  },
  {
    type: 'SLOT_THUMB',
    label: '썸네일',
    sub: '대표 이미지 (등록정보)',
    group: '위치 표시',
    icon: 'Image',
    container: false,
    defaultProps: { slotKey: 'thumb', label: '썸네일 (대표 이미지)', note: '등록정보의 썸네일이 노출됩니다.', ...SPACING },
  },
  {
    type: 'SLOT_NOTICE',
    label: '유의사항',
    sub: '필수 고지',
    group: '위치 표시',
    icon: 'TriangleAlert',
    container: false,
    defaultProps: { slotKey: 'notice', label: '유의사항 (필수 고지)', note: '등록정보의 유의사항이 노출됩니다. 삭제 불가 고지.', ...SPACING },
  },
  {
    type: 'SLOT_CONSENT',
    label: '동의',
    sub: '개인정보·제휴사 제공 동의',
    group: '위치 표시',
    icon: 'ShieldCheck',
    container: false,
    defaultProps: { slotKey: 'consent', label: '개인정보·제휴사 제공 동의', note: '시스템 동의 모듈이 노출됩니다. 필수 고지.', ...SPACING },
  },
  {
    type: 'SLOT_REWARD',
    label: '보상·지급',
    sub: '보상·지급 일정',
    group: '위치 표시',
    icon: 'Gift',
    container: false,
    defaultProps: { slotKey: 'reward', label: '보상·지급 일정', note: '보상/지급 일정이 시스템에서 노출됩니다.', ...SPACING },
  },
  {
    type: 'SLOT_CTA',
    label: 'CTA',
    sub: '하단 고정 버튼',
    group: '위치 표시',
    icon: 'MousePointerClick',
    container: false,
    defaultProps: { slotKey: 'cta', label: 'CTA (하단 고정 버튼)', note: '참여/이동 버튼 — 시스템 고정 영역.', ...SPACING },
  },

  // ═══ 전시(거버넌스 모드) 컴포넌트 — group '전시' 라 이벤트 팔레트에는 안 뜬다 ═══
  {
    type: 'CORNER',
    label: '코너',
    sub: '거버넌스 영역(유형·허용 제약)',
    group: '전시',
    icon: 'LayoutGrid',
    container: true,
    defaultProps: { cornerType: '혜택·오퍼형', title: '코너 제목', tag: '', subTitle: '', maxItems: 0, sort: '수동', ...SPACING, mb: 8 },
  },
  {
    type: 'BANNER',
    label: '배너',
    sub: '배너형',
    group: '전시',
    icon: 'GalleryHorizontalEnd',
    container: false,
    defaultProps: { title: '배너 타이틀', sub: '서브 문구', cta: '자세히', image: '', bg: '#eef2ff', ...SPACING },
  },
  {
    type: 'PRODUCT',
    label: '상품 카드',
    sub: '상품형',
    group: '전시',
    icon: 'ShoppingBag',
    container: false,
    defaultProps: { name: '상품명', price: '999,999원', image: '', ...SPACING },
  },
  {
    type: 'BENEFIT',
    label: '혜택 리스트',
    sub: '혜택형',
    group: '전시',
    icon: 'Gift',
    container: false,
    defaultProps: { title: '혜택 문구', brand: '브랜드', ...SPACING },
  },
  {
    type: 'CHIP',
    label: '탭/칩',
    sub: '선택형',
    group: '전시',
    icon: 'Tags',
    container: false,
    defaultProps: { items: ['전체', '혜택', '쇼핑'], selected: 0, ...SPACING },
  },
];

// 팔레트(추가) 그룹 — nebula-builder 기준: 콘텐츠 / Button / 레이아웃 / 고급 / 게임.
//   '위치 표시' 슬롯은 골조에 자동 배치되는 고정 영역이라 수동 추가 팔레트에는 넣지 않는다.
export const COMPONENT_GROUPS = ['콘텐츠', 'Button', '레이아웃', '고급', '게임'] as const;

export const COMPONENT_BY_TYPE: Record<string, ComponentDef> = Object.fromEntries(COMPONENTS.map((c) => [c.type, c]));

export function componentDef(type: string): ComponentDef | undefined {
  return COMPONENT_BY_TYPE[type];
}
export function isContainer(type: string): boolean {
  return !!COMPONENT_BY_TYPE[type]?.container;
}
export function defaultPropsFor(type: string): Record<string, unknown> {
  const d = COMPONENT_BY_TYPE[type]?.defaultProps ?? {};
  return JSON.parse(JSON.stringify(d));
}
export function componentLabel(type: string): string {
  return COMPONENT_BY_TYPE[type]?.label ?? type;
}

// ═════════════════════════════════════════════════════════════
// 코너 거버넌스 — 전시/이벤트 공통 SSOT에서 파생 (통일)
//   코너 규칙의 단일 진실 원본은 display-taxonomy.ts:
//     · CORNER_TYPES (8종) · CORNER_COMPONENT_MAP (코너유형→허용 Component 6종, PI-DSP-CMP-003)
//   이벤트 빌더는 "노드 타입"으로 조립하므로, 노드 타입 ↔ Component 6종 브리지를 두고
//   그 브리지를 통해 위 매핑을 그대로 적용한다. → 전시/이벤트가 같은 8코너·같은 허용규칙 사용.
//   코너 "밖"(자유 구간)은 제약 없음(자유형 유지). 코너 "안"에서만 거버넌스가 걸린다.
// ═════════════════════════════════════════════════════════════

// 브리지: 이벤트 노드 타입 → 전시 Component 6종. (거버넌스 대상 노드만 매핑)
export const NODE_TO_COMPONENT_KIND: Partial<Record<NodeType, DspComponentType>> = {
  PRODUCT: '상품형',
  BANNER: '배너형',
  BENEFIT: '혜택형',
  CHIP: '선택형',
  BUTTON: '행동형',
  TEXT: '정보형',
  IMAGE: '정보형',
  TABLE: '정보형',
};
// 역브리지: Component 6종 → 이벤트 노드 타입들.
const KIND_TO_NODES: Record<DspComponentType, NodeType[]> = {
  상품형: ['PRODUCT'],
  배너형: ['BANNER'],
  혜택형: ['BENEFIT'],
  선택형: ['CHIP'],
  행동형: ['BUTTON'],
  정보형: ['TEXT', 'IMAGE', 'TABLE'],
};
// 순수 레이아웃 프리미티브 — 거버넌스 대상이 아니며 어떤 코너에서도 배치 허용(구조용).
const NEUTRAL_LAYOUT: NodeType[] = ['CARD', 'HROW', 'VSTACK', 'DIVIDER'];

export function nodeComponentKind(nodeType: string): DspComponentType | undefined {
  return NODE_TO_COMPONENT_KIND[nodeType as NodeType];
}

function layoutForCorner(cornerType: string): 'stack' | 'scroll' | 'grid' {
  if (cornerType === '상품형') return 'scroll';
  if (cornerType === '업무 진입형') return 'grid';
  return 'stack';
}

export type CornerTypeDef = { key: string; label: string; allowed: NodeType[]; kinds: DspComponentType[]; layout: 'stack' | 'scroll' | 'grid' };

// 8코너를 전시 SSOT에서 그대로 생성. allowed(노드) = 허용 Component 6종 → 노드 브리지 + 레이아웃 프리미티브.
export const CORNER_TYPES: CornerTypeDef[] = DSP_CORNER_TYPES.map((ct: DspCornerType) => {
  const kinds = [...CORNER_COMPONENT_MAP[ct]];
  const allowed = [...new Set([...kinds.flatMap((k) => KIND_TO_NODES[k]), ...NEUTRAL_LAYOUT])];
  return { key: ct, label: ct, allowed, kinds, layout: layoutForCorner(ct) };
});
export const CORNER_TYPE_BY_KEY: Record<string, CornerTypeDef> = Object.fromEntries(CORNER_TYPES.map((c) => [c.key, c]));

// 그룹형(자유) 코너 — 프로모션에서 콘텐츠를 묶는 그룹 컨테이너. 거버넌스 제약 없이 모든 컴포넌트 허용.
export const GROUP_CORNER = '그룹';
// 프로모션 팔레트에 뜨는 컴포넌트 그룹 (전시 전용·위치 표시 슬롯 제외)
const PROMO_GROUPS = ['콘텐츠', 'Button', '레이아웃', '고급', '게임'];

export function cornerAllows(cornerType: string, nodeType: string): boolean {
  if (!cornerType || cornerType === GROUP_CORNER) return true; // 그룹형은 모두 허용
  const def = CORNER_TYPE_BY_KEY[cornerType];
  return !!def && (def.allowed as string[]).includes(nodeType);
}
export function allowedComponentsFor(cornerType: string): ComponentDef[] {
  if (!cornerType || cornerType === GROUP_CORNER) {
    return COMPONENTS.filter((c) => PROMO_GROUPS.includes(c.group));
  }
  const allowed = CORNER_TYPE_BY_KEY[cornerType]?.allowed ?? [];
  return allowed.map((t) => COMPONENT_BY_TYPE[t]).filter(Boolean);
}

// 프로모션에서 고를 수 있는 코너: 그룹형(자유) + 거버넌스 8종(전시와 동일)
export const PROMO_CORNER_OPTIONS = [
  { key: GROUP_CORNER, label: '그룹 (자유)', governed: false },
  ...CORNER_TYPES.map((c) => ({ key: c.key, label: c.label, governed: true })),
];
export function cornerLayout(cornerType: string): 'stack' | 'scroll' | 'grid' {
  return CORNER_TYPE_BY_KEY[cornerType]?.layout ?? 'stack';
}

export const BUILD_MODES = ['event', 'display'] as const;
export type BuildMode = (typeof BUILD_MODES)[number];

// 디바이스 프리셋 (상단 디바이스 선택)
export const DEVICES = [
  { key: 'iPhone 17 Pro', w: 393, h: 852 },
  { key: 'iPhone SE', w: 375, h: 667 },
  { key: 'Galaxy S24', w: 360, h: 800 },
] as const;

// 배포 환경
export const ENVS = ['LOCAL', 'DEV', 'STG', 'PRD'] as const;
export type Env = (typeof ENVS)[number];

// 템플릿 카테고리 (새 프로젝트 필터)
export const TEMPLATE_CATEGORIES = ['전체', 'T멤버십', 'T우주', 'TDS', 'TWORLD'] as const;
