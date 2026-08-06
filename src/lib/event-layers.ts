/**
 * 5단계 계층 개념을 공유 빌더 엔진(노드 트리)에 매핑한다.
 *   Container(프로젝트) → Template(페이지) → Corner(코너) → Component(그룹/내 컴포넌트) → Atom(기본 블록)
 * 이벤트/전시 두 모드 모두 같은 엔진 위에서 이 5단계로 구조를 본다.
 */

export type LayerRole = 'CONTAINER' | 'TEMPLATE' | 'CORNER' | 'COMPONENT' | 'ATOM' | 'FIXED';

export const LAYER_LABEL: Record<LayerRole, string> = {
  CONTAINER: '컨테이너',
  TEMPLATE: '템플릿',
  CORNER: '코너',
  COMPONENT: '컴포넌트',
  ATOM: '아톰',
  FIXED: '고정',
};

// 계층 배지 색 (구조 트리/브레드크럼 공용) — soft 파스텔 톤
export const LAYER_COLOR: Record<LayerRole, string> = {
  CONTAINER: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200',
  TEMPLATE: 'bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-200',
  CORNER: 'bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200',
  COMPONENT: 'bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-200',
  ATOM: 'bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-200',
  FIXED: 'bg-zinc-100 text-zinc-500 ring-1 ring-inset ring-zinc-300', // 개발 고정(잠금)
};

const COMPONENT_TYPES = ['CARD', 'HROW', 'VSTACK', 'ACCORDION'];

// 개발에서 고정된 영역(위치 표시 슬롯) — 운영자가 위치/내용을 제어할 수 없다.
export function isFixedNode(nodeType: string): boolean {
  return nodeType.startsWith('SLOT_');
}

/** 노드 type → 5단계 역할 (SLOT_*는 개발 고정 영역 = FIXED) */
export function layerRole(nodeType: string): Extract<LayerRole, 'CORNER' | 'COMPONENT' | 'ATOM' | 'FIXED'> {
  if (isFixedNode(nodeType)) return 'FIXED'; // 썸네일·헤더·CTA 등 개발 고정 영역
  if (nodeType === 'CORNER') return 'CORNER';
  if (COMPONENT_TYPES.includes(nodeType)) return 'COMPONENT'; // Atom을 조합한 기능/레이아웃 모듈
  return 'ATOM'; // 텍스트·이미지·버튼·표 등 기본 표시 요소
}

export const LAYERS_ORDER: LayerRole[] = ['CONTAINER', 'TEMPLATE', 'CORNER', 'COMPONENT', 'ATOM'];

// ── 노출 조건(audience) — 프로모션 로그인/비로그인 분기 ──
//    정책 v0.19: 로그인/비로그인은 별도 화면(액터)이 아니라 "상태·조건"으로 관리(§3 액터).
//    화면은 공통 1개이고, 각 노드에 노출 조건을 달아 로그인 상태별로 보이거나 숨긴다.
//    (PG-EVTMSN-ELIG-AUTH-001 고객 식별·비회원 참여 / CTA 라벨 매트릭스)
export type Viewer = '로그인' | '비로그인';
export const AUDIENCES = ['공통', '로그인', '비로그인'] as const; // 노드 노출 조건
export const AUDIENCE_LABEL: Record<string, string> = { 공통: '공통', 로그인: '로그인 전용', 비로그인: '비로그인 전용' };
export const AUDIENCE_BADGE: Record<string, string> = {
  로그인: 'bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-200',
  비로그인: 'bg-orange-50 text-orange-600 ring-1 ring-inset ring-orange-200',
};

export function nodeAudience(props: Record<string, unknown> | undefined | null): string {
  const a = props?.['audience'];
  return a === '로그인' || a === '비로그인' ? a : '공통';
}

/** 노드의 노출 조건이 현재 미리보기 대상(로그인/비로그인)에게 보이는가 */
export function audienceVisible(audience: string, viewer: Viewer): boolean {
  return audience === '공통' || audience === viewer;
}

// 로그인 유도 CTA 기본 라벨 (CTA 라벨 매트릭스 · 비로그인/식별 전 고객)
export const GUEST_CTA_LABEL = '로그인 후 참여하기';
export const MEMBER_CTA_LABEL = '참여하기';
