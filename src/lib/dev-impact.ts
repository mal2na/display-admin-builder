// 개발 영향 구분 — 어드민이 빌더에서 '무중단(개발 영향 없음)'으로 바꿀 수 있는 것과,
//  '개발 필요(어드민 제어 불가)'를 명확히 나눈다.
//
// 대원칙: 코너 유형 관리/DS에 '등록된(개발된) 블록'을 조립하고 그 안의 콘텐츠·노출을 바꾸는 것은 무중단.
//  블록 자체의 '모양(레이아웃)'이나 'DS에 없는 새 유형'이 필요하면 개발(코너 유형 관리/DS 반영 → 배포).
//
// 판단 기준(한 줄): "이미 있는 걸 고르고/채우고/켜고 끄는가?"(무중단) vs "새 모양·새 유형을 만드는가?"(개발).

export type ImpactLevel = 'admin' | 'dev';

export type ImpactItem = { label: string; note?: string };

// 무중단 — 어드민 편집 → 검수·승인 후 바로 배포 (개발 영향 없음)
export const ADMIN_EDITABLE: ImpactItem[] = [
  { label: '문구(제목·서브·아톰 텍스트)', note: '문구 관리/컴포넌트 편집' },
  { label: '문구 베리에이션(타겟별·CVM 택1)' },
  { label: '이미지·아이콘·대체텍스트' },
  { label: '링크·랜딩 URL' },
  { label: '노출 on/off(숨김)·순서(재배치)' },
  { label: '코너 타이틀·서브타이틀·노출 조건·최대 노출 개수' },
  { label: '추천 수급 방식(CVM / 운영자 편성)' },
  { label: '노출 타입 베리에이션(등록된 배열 중 택1)' },
  { label: '배너 노출 방식(스와이프·자동)·규격(등록된 규격)' },
  { label: '코너·컴포넌트·배너 불러오기/교체(등록된 유형)' },
  { label: '코너별 표시 항목(상품 카드 요소 on/off)' },
];

// 개발 필요 — 어드민 제어 불가. 코너 유형 관리/DS 반영 + 개발 배포 후 사용
export const DEV_REQUIRED: ImpactItem[] = [
  { label: 'DS에 없는 새 레이아웃·배열 생성', note: '레이아웃이 달라짐' },
  { label: '컴포넌트 내부 구조 변경(요소 위치·추가·삭제)', note: '레이아웃이 달라짐' },
  { label: '새 컴포넌트 유형(정보형·행동형 외 신규)' },
  { label: '새 코너 유형 정의(7종 외)' },
  { label: '새 아톰 유형·새 DS 컴포넌트' },
];

export const DEV_IMPACT_PRINCIPLE =
  '등록된(개발된) 블록을 조립하고 콘텐츠·노출을 바꾸는 건 무중단 배포. 블록의 모양(레이아웃)이나 새 유형이 필요하면 개발(코너 유형 관리/DS)에서 처리합니다.';

// 빌더 편집 영역 키 → 개발 영향 등급. UI에서 잠금/배지 판단에 사용.
export type BuilderCapability =
  | 'content' | 'image' | 'link' | 'altText' | 'visibility' | 'reorder'
  | 'cornerTitle' | 'displayCondition' | 'maxItems' | 'recSource'
  | 'contentVariants' | 'displayVariants' | 'bannerOptions' | 'bannerSize'
  | 'showItems' | 'loadCorner' | 'loadComponent' | 'loadBanner'
  // 개발 영향
  | 'newLayout' | 'componentStructure' | 'newComponentType' | 'newCornerType' | 'newAtomType';

const DEV_CAPS = new Set<BuilderCapability>([
  'newLayout', 'componentStructure', 'newComponentType', 'newCornerType', 'newAtomType',
]);

export function impactOf(cap: BuilderCapability): ImpactLevel {
  return DEV_CAPS.has(cap) ? 'dev' : 'admin';
}

export function isAdminEditable(cap: BuilderCapability): boolean {
  return impactOf(cap) === 'admin';
}
