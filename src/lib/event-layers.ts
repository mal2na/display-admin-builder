/**
 * 5단계 계층 개념을 공유 빌더 엔진(노드 트리)에 매핑한다.
 *   Container(프로젝트) → Template(페이지) → Corner(코너) → Component(그룹/내 컴포넌트) → Atom(기본 블록)
 * 이벤트/전시 두 모드 모두 같은 엔진 위에서 이 5단계로 구조를 본다.
 */

export type LayerRole = 'CONTAINER' | 'TEMPLATE' | 'CORNER' | 'COMPONENT' | 'ATOM';

export const LAYER_LABEL: Record<LayerRole, string> = {
  CONTAINER: '컨테이너',
  TEMPLATE: '템플릿',
  CORNER: '코너',
  COMPONENT: '컴포넌트',
  ATOM: '아톰',
};

// 계층 배지 색 (구조 트리/브레드크럼 공용)
export const LAYER_COLOR: Record<LayerRole, string> = {
  CONTAINER: 'bg-slate-800 text-white',
  TEMPLATE: 'bg-indigo-600 text-white',
  CORNER: 'bg-emerald-600 text-white',
  COMPONENT: 'bg-sky-500 text-white',
  ATOM: 'bg-amber-500 text-white',
};

const COMPONENT_TYPES = ['CARD', 'HROW', 'VSTACK', 'ACCORDION'];

/** 노드 type → 5단계 역할 (노드 레벨은 CORNER/COMPONENT/ATOM 중 하나) */
export function layerRole(nodeType: string): Extract<LayerRole, 'CORNER' | 'COMPONENT' | 'ATOM'> {
  if (nodeType === 'CORNER') return 'CORNER';
  if (COMPONENT_TYPES.includes(nodeType)) return 'COMPONENT'; // Atom을 조합한 기능/레이아웃 모듈
  return 'ATOM'; // 텍스트·이미지·버튼·표 등 기본 표시 요소
}

export const LAYERS_ORDER: LayerRole[] = ['CONTAINER', 'TEMPLATE', 'CORNER', 'COMPONENT', 'ATOM'];
