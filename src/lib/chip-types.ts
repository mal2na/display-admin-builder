// 칩(Chip) 계열 4종 — DS @skt/ds-ui 컴포넌트 기준. 업무 진입형/선택형 코너의 배열(변형).
//  ChipHome(홈 퀵메뉴·아이콘+라벨 2행) / ChipContents(콘텐츠 필터·선택 강조) /
//  ChipFilter(필터 칩) / ChipPage(페이지 탭·선택+아이콘 옵션).
export type ChipTypeKey = 'ChipHome' | 'ChipContents' | 'ChipFilter' | 'ChipPage';

export type ChipTypeDef = {
  key: ChipTypeKey;
  typeDetail: string; // 카탈로그 typeDetail 저장값(=화면 라벨). '칩형(<Key>)'.
  short: string;      // 짧은 표기
  desc: string;       // 코너 유형 카드 설명
};

export const CHIP_TYPES: ChipTypeDef[] = [
  { key: 'ChipHome', typeDetail: '칩형(ChipHome)', short: 'ChipHome', desc: '홈 퀵메뉴 — 아이콘+라벨 칩을 최대 2행으로. 자주 쓰는 업무로 바로 이동.' },
  { key: 'ChipContents', typeDetail: '칩형(ChipContents)', short: 'ChipContents', desc: '콘텐츠 필터 칩 — 선택 1개를 강조해 목록을 필터링.' },
  { key: 'ChipFilter', typeDetail: '칩형(ChipFilter)', short: 'ChipFilter', desc: '필터 칩 — 조건을 골라 목록을 좁히는 필터.' },
  { key: 'ChipPage', typeDetail: '칩형(ChipPage)', short: 'ChipPage', desc: '페이지 탭 칩 — 선택 상태 + 아이콘(옵션)으로 페이지를 전환.' },
];

export const CHIP_TYPE_MAP: Record<string, ChipTypeDef> = Object.fromEntries(CHIP_TYPES.map((t) => [t.key, t]));

// 컨테이너 유형(홈=MAIN)별 허용 칩 — 제어(거버넌스). 지정 없으면 전체 허용.
//  전시관리 빌더 '홈'(MAIN)에서는 ChipHome만 쓸 수 있다. (2026-09-28 사용자 결정)
export const CHIP_ALLOW_BY_CONTAINER: Partial<Record<string, ChipTypeKey[]>> = {
  MAIN: ['ChipHome'],
};

// typeDetail 문자열 → 칩 종류. 레거시 '칩형'/'카테고리 탭'도 흡수.
export function chipTypeOf(detail?: string | null): ChipTypeKey | null {
  if (!detail) return null;
  for (const t of CHIP_TYPES) if (detail.includes(t.key)) return t.key;
  if (/칩/.test(detail)) return 'ChipHome'; // legacy '칩형'
  return null;
}

// 이 컨테이너에서 허용되는 칩 종류. containerType 미지정/미등록이면 전체.
export function allowedChipTypes(containerType?: string | null): ChipTypeKey[] {
  return CHIP_ALLOW_BY_CONTAINER[containerType ?? ''] ?? CHIP_TYPES.map((t) => t.key);
}

// 이 배열(typeDetail)이 주어진 컨테이너에서 허용되는가. 칩이 아니면 항상 허용.
export function isChipAllowed(detail: string | null | undefined, containerType?: string | null): boolean {
  const k = chipTypeOf(detail);
  if (!k) return true;
  return allowedChipTypes(containerType).includes(k);
}
