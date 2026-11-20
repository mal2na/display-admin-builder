// 코너 유형 관리(프리셋) — SB 혜택 프리셋 묶음(2026-11-20 사용자 요청).
//  상위 분류: 혜택형(제휴사/프로모션) · 개인형(내 데이터 기반) · 상품형. 모양(배너 유무 등)은 하위 뎁스.
//   · 배너형에는 상단 배너가 있는 프리셋만. 배너 없는 모양은 각자 유형으로 분리.
//   · '데이터' 이름(내 데이터 선물·나눔·리필·기념일 데이터)은 제휴 혜택이 아니라 '개인형'으로 모음(2026-11-20).
//   · 0012 경품 배송지=프로모션 세로형 · 0026 룰렛=프로모션 배너리스트 · 0010 출석미션=프로모션 그래프.
//   · 0014·0028·0027·0001=상품형(맨 아래).
//  이미지 = public/assets/preset-images/<CN-DSP-id>.png · 이름 = benefit-preset-designs.json.
// source = 이 유형의 아이템 데이터를 가져오는 '원장(SSOT)'. 지금까지 협의 기준(2026-11-20):
//  제휴사=어드민 제휴사 카테고리 관리 · 프로모션형=어드민 프로모션 관리 · 개인형=CVM·고객 원장(@cvm:key) · 상품형=EPC 원장.
export type PresetShapeGroup = { key: string; label: string; note: string; source: string; presetIds: string[] };

export const PRESET_SHAPE_GROUPS: PresetShapeGroup[] = [
  {
    key: 'affiliate-banner',
    label: '혜택형 > 제휴사 > 배너·세로형',
    note: '상단 배너 + 세로형 제휴사 혜택 (바코드·혜택카드)',
    source: '어드민 · 제휴사 카테고리 관리 (할인, 쿠폰)',
    presetIds: ['CN-DSP-0004', 'CN-DSP-0011', 'CN-DSP-0018', 'CN-DSP-0009'],
  },
  {
    key: 'affiliate-triple',
    label: '혜택형 > 제휴사 > 세로형',
    note: '배너 없음 · 세로 혜택 카드(±안내, ±버튼)',
    source: '어드민 · 제휴사 카테고리 관리 (할인, 쿠폰, 로밍)',
    presetIds: ['CN-DSP-0020', 'CN-DSP-0021'],
  },
  {
    key: 'program',
    label: '혜택형 > 프로그램형 > 세로형',
    note: 'VIP Pick·T데이 등 이름 가진 내부 프로그램 · 혜택(모아보기·큐레이션) / 미션(출석체크 적립) · 세로형 + CTA',
    source: '내부 프로그램 (혜택 프로그램, 미션 프로그램)',
    presetIds: ['CN-DSP-0024', 'CN-DSP-0025', 'CN-DSP-0010'],
  },
  {
    key: 'program-banner',
    label: '혜택형 > 프로그램형 > 배너·세로형',
    note: '돈 버는 교통 등 적립 미션 · 상단 배너 + 세로형 + CTA → 내부 메뉴 진입',
    source: '내부 프로그램 (미션 프로그램)',
    presetIds: ['CN-DSP-0002'],
  },
  {
    key: 'promotion-banner-list',
    label: '혜택형 > 프로모션형 > 배너 · 좌우 리스트형',
    note: '참여/응모형(룰렛 등) · 상단 배너 + 좌우 리스트 + 버튼',
    source: '하이브리드 · 어드민 프로모션 관리 + 고객 원장(응모·참여 내역)',
    presetIds: ['CN-DSP-0026'],
  },
  {
    key: 'promotion-vertical',
    label: '혜택형 > 프로모션형 > 세로형',
    note: '이벤트·경품 안내 카드 · 세로 카드 + 안내 + CTA(배송지 입력 등)',
    source: '어드민 · 프로모션 관리',
    presetIds: ['CN-DSP-0012'],
  },
  {
    key: 'personal-data',
    label: '개인형 > 데이터 > 세로형',
    note: '제휴 혜택이 아닌 내 데이터 기반 — 데이터 선물·나눔·리필·기념일 데이터',
    source: '고객 원장(내 데이터 잔여·선물·나눔)',
    presetIds: ['CN-DSP-0017', 'CN-DSP-0022', 'CN-DSP-0023', 'CN-DSP-0016'],
  },
  {
    key: 'personal-point',
    label: '개인형 > 포인트 > 좌우 리스트형',
    note: '내 포인트 기반 · 좌 라벨/우 값 적립·소멸 내역 리스트 + 안내문구',
    source: '고객 원장(포인트 적립·소멸 내역)',
    presetIds: ['CN-DSP-0019'],
  },
  {
    key: 'product-sub',
    label: '상품형 > 구독상품',
    note: 'T우주 등 구독 상품 (미활성화·외부 앱 등)',
    source: 'EPC 원장 (구독)',
    presetIds: ['CN-DSP-0014', 'CN-DSP-0006'],
  },
  {
    key: 'product-device',
    label: '상품형 > 디바이스',
    note: '기기 지원금·단말 보상(안심보상) · 약정 종료',
    source: 'EPC 원장 (기기 지원금, 안심보상)',
    presetIds: ['CN-DSP-0028', 'CN-DSP-0027'],
  },
  {
    key: 'product-roaming',
    label: '상품형 > 로밍형',
    note: '클럽T로밍 멤버십 등 로밍 상품',
    source: 'EPC 원장 (로밍 멤버십)',
    presetIds: ['CN-DSP-0001'],
  },
];
