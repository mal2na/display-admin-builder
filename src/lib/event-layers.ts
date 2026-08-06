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
