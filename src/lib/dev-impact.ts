// 개발 영향 구분 — 어드민이 빌더에서 '무중단(개발 영향 없음)'으로 바꿀 수 있는 것과,
//  '개발 필요(어드민 제어 불가)'를 명확히 나눈다.
//
// 대원칙: 코너 유형 관리/DS에 '등록된(개발된) 블록'을 조립하고 그 안의 콘텐츠·노출을 바꾸는 것은 무중단.
//  블록 자체의 '모양(레이아웃)'이나 'DS에 없는 새 유형'이 필요하면 개발(코너 유형 관리/DS 반영 → 배포).
//
// 판단 기준(한 줄): "이미 있는 걸 고르고/채우고/켜고 끄는가?"(무중단) vs "새 모양·새 유형을 만드는가?"(개발).

export type ImpactLevel = 'admin' | 'dev';

export type ImpactItem = { label: string; note?: string };

// 어드민 편집 → 검수·승인 후 반영 (새 개발 작업·앱 릴리즈 불필요).
//  구조도 F/O 기준: 어드민 변경은 승인 후 개발이 반영 (즉시 배포 아님) — 'DS에 없는 새 작업'이 없을 뿐.
export const ADMIN_EDITABLE: ImpactItem[] = [
  { label: '문구 · 이미지 세트 불러오기', note: '상품 원장 항목 1개 = 텍스트·설명·이미지 한 세트' },
  { label: '문구 베리에이션 후보 등록', note: '실서비스에서 CVM이 택1' },
  { label: '대체텍스트' },
  { label: '링크 · 랜딩 URL' },
  { label: '노출 on/off · 순서 재배치' },
  { label: '미노출 조건(코너별)' },
  { label: '코너 타이틀 · 서브타이틀' },
  { label: '콘텐츠 수급 방식', note: 'CVM 데이터 연동 / CVM 콘텐츠 연동 / 운영자 편성' },
  { label: 'CVM 요청 설정', note: '중분류 · 개수 · 구좌 ID · 폴백' },
  { label: '노출 타입 베리에이션', note: '등록된 배열 중 택1' },
  { label: '배너 노출 방식 · 규격', note: '등록된 규격 중 선택' },
  { label: '코너 · 상품 · 배너 불러오기 / 교체' },
  { label: '코너별 표시 항목', note: '상품 카드 요소 on/off' },
];

// 개발 필요 — 어드민 제어 불가. 코너 유형 관리/DS 반영 + 개발 배포 후 사용
export const DEV_REQUIRED: ImpactItem[] = [
  { label: 'DS에 없는 새 레이아웃 · 배열 생성' },
  { label: '컴포넌트 내부 구조 변경', note: '요소 위치 · 추가 · 삭제' },
  { label: '새 컴포넌트 유형 · 새 코너 유형' },
  { label: '새 아톰 유형 · 새 DS 컴포넌트' },
  { label: '최대 노출 개수 · 배열', note: '코너 유형 관리에서 정의 — 빌더는 읽기 전용' },
];

// CVM 범위 밖 — 개발이 아니라 '요청해도 못 받는 것'. 어드민 룰이나 데이터실로 풀어야 한다.
//  (2026-10-08 CVM 협의. 상세·대안은 display-taxonomy 의 CVM_OUT_OF_SCOPE)
export const CVM_UNAVAILABLE: ImpactItem[] = [
  { label: '세그먼트(고객군)', note: 'CVM은 개별 고객 단위 판정만 → 어드민 룰' },
  { label: '고객 성향 · 인사이트', note: 'C360 · 데이터실' },
  { label: '제휴 콘텐츠(영화 등)', note: 'EPC 밖 → 운영자 편성' },
  { label: '레이아웃 개인화', note: '어드민 룰' },
  { label: '문구만 따로 베리에이션', note: '고객·오퍼·시점·채널이 한 세트' },
];

export const DEV_IMPACT_PRINCIPLE =
  '등록된(개발된) 블록을 조립하고 콘텐츠·노출을 바꾸는 건 검수·승인 후 반영(새 앱 릴리즈·개발 작업 불필요). 블록의 모양(레이아웃)이나 새 유형이 필요하면 개발(코너 유형 관리/DS)에서 처리합니다. (어드민 변경도 승인 후 개발이 반영 — 즉시 배포 아님)';

// 빌더 편집 영역 키 → 개발 영향 등급. UI에서 잠금/배지 판단에 사용.
export type BuilderCapability =
  | 'content' | 'image' | 'link' | 'altText' | 'visibility' | 'reorder'
  | 'cornerTitle' | 'displayCondition' | 'maxItems' | 'recSource'
  | 'contentVariants' | 'displayVariants' | 'bannerOptions' | 'bannerSize'
  | 'showItems' | 'loadCorner' | 'loadComponent' | 'loadBanner' | 'cvmContract' | 'setLoad'
  // 개발 영향
  | 'newLayout' | 'componentStructure' | 'newComponentType' | 'newCornerType' | 'newAtomType';

const DEV_CAPS = new Set<BuilderCapability>([
  // maxItems 는 코너 유형 관리 소유 — 빌더에선 읽기 전용이라 개발(정의) 영역으로 둔다(2026-10-08 재검증).
  'newLayout', 'componentStructure', 'newComponentType', 'newCornerType', 'newAtomType', 'maxItems',
]);

export function impactOf(cap: BuilderCapability): ImpactLevel {
  return DEV_CAPS.has(cap) ? 'dev' : 'admin';
}

export function isAdminEditable(cap: BuilderCapability): boolean {
  return impactOf(cap) === 'admin';
}
