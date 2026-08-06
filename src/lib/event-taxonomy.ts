/**
 * 이벤트·미션 프로그램 도메인 분류/상태 상수 — 단일 진실 원본(source of truth).
 *
 * 정책서: NC_이벤트미션프로그램_정책서_간소화_v0.19.html (POL-EVTMSN v0.19)
 *
 * 빌딩 5단 계층 (전시빌더 Atom→Component→Corner→Template→Container 와 1:1 대응):
 *   Module(모듈) → Mechanic(메커닉) → Section(섹션) → Page(페이지) → Program(프로그램)
 *   근거: PG-EVTMSN-ADMIN-001-01 "공통 → 이벤트·미션 구분 → 유형 → 전시 컴포넌트 → 프로그램 인스턴스"
 *
 * SQLite/Postgres 공용을 위해 유형/상태는 DB에 String으로 저장하고 허용값을 여기서 관리한다.
 * (전시빌더 display-taxonomy.ts 와 동일한 운영 방식)
 */

// ─────────────────────────────────────────────────────────────
// 0. 프로그램 구분 — 이벤트 / 미션 (TM-EVTMSN-001 / TM-EVTMSN-002)
// ─────────────────────────────────────────────────────────────
export const PROGRAM_KINDS = ['이벤트', '미션'] as const;
export type ProgramKind = (typeof PROGRAM_KINDS)[number];

// ── 이벤트 유형 (6종) — PI-EVTMSN-PROG-001-01 ────────────────
export const EVENT_TYPES = [
  '안내형',
  '기획전형',
  '응모형',
  '초청형',
  '추천형',
  '구매/가입연계형',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_DESC: Record<EventType, string> = {
  안내형: '혜택·행사·제휴처 프로모션 정보를 전달. 참여완료·당첨·보상 판정을 두지 않는다.',
  기획전형: '상품·혜택·브랜드·시즌 주제를 묶어 전시. 탐색·비교·전환 유도.',
  응모형: '조건 충족 후 응모 등록 → 추첨·선정·심사로 보상 지급.',
  초청형: '특정 고객군에게만 참여 기회 제공. 비초청 고객에게 비노출.',
  추천형: '친구 추천·초대 링크·추천 코드로 참여·보상 연결.',
  '구매/가입연계형': '구매·가입·개통·신청 완료를 조건으로 참여·혜택 연결.',
};

// ── 미션 유형 (10종) — PI-EVTMSN-PROG-001-02 ─────────────────
export const MISSION_TYPES = [
  '행동완료형',
  '출석형',
  '누적형',
  '단계완료형',
  '전환형',
  '유지형',
  '탐험형',
  '협업형',
  '개인화형',
  '성장형',
] as const;
export type MissionType = (typeof MISSION_TYPES)[number];

export const MISSION_TYPE_DESC: Record<MissionType, string> = {
  행동완료형: '지정 행동 1회 수행으로 완료 인정.',
  출석형: '출석체크·체크인을 반복 수행(연속/누적).',
  누적형: '스탬프·카운트 등 목표값까지 누적.',
  단계완료형: '여러 단계를 순차 완료.',
  전환형: '구매·가입 등 전환 행동을 목표로 수행.',
  유지형: '일정 기간 상태·조건을 유지.',
  탐험형: '여러 콘텐츠·서비스를 탐색 수행.',
  협업형: '가족·친구와 공동 목표(팀 진행률·개인 기여도).',
  개인화형: '고객별 맞춤 과업 제시.',
  성장형: '레벨·시즌을 거치며 성장.',
};

/** 프로그램 구분에 따른 유형 목록 (등록 폼 select 용) */
export function programTypesFor(kind: string): readonly string[] {
  return kind === '미션' ? MISSION_TYPES : EVENT_TYPES;
}

// ─────────────────────────────────────────────────────────────
// 1. Module(모듈) — Atom급 표시 요소. Mechanic의 재료로만 쓰인다.
//    상세페이지 최소 전시 요소 — PI-EVTMSN-ADMIN-DISPLAY-001-02
// ─────────────────────────────────────────────────────────────
export const MODULE_TYPES = [
  'TEXT', // 텍스트(문구/제목)
  'IMAGE', // 이미지(키비주얼·상품·배경)
  'ICON', // 아이콘
  'BADGE', // 유형 라벨/배지
  'CTA', // CTA 버튼
  'PERIOD', // 운영 기간
  'TARGET', // 대상 조건
  'COUNTER', // 카운터(응모 기회/추가 응모 기회)
  'REWARD_ITEM', // 보상/경품 항목
  'PROGRESS', // 진행률/목표값 (미션)
  'WHEEL_SEGMENT', // 룰렛 휠 조각(보상 연출)
  'NOTICE_TEXT', // 유의사항 문구 (필수 고지)
  'CONSENT', // 동의 항목 (필수 고지)
] as const;
export type ModuleType = (typeof MODULE_TYPES)[number];

export const MODULE_TYPE_LABELS: Record<ModuleType, string> = {
  TEXT: '텍스트',
  IMAGE: '이미지',
  ICON: '아이콘',
  BADGE: '유형 라벨',
  CTA: 'CTA 버튼',
  PERIOD: '운영 기간',
  TARGET: '대상 조건',
  COUNTER: '카운터',
  REWARD_ITEM: '보상 항목',
  PROGRESS: '진행률',
  WHEEL_SEGMENT: '룰렛 조각',
  NOTICE_TEXT: '유의사항',
  CONSENT: '동의',
};

// 폼 입력 힌트 (전시빌더 ATOM_TYPE_FIELDS 패턴)
export const MODULE_TYPE_FIELDS: Record<ModuleType, { content: boolean; image: boolean; link: boolean }> = {
  TEXT: { content: true, image: false, link: false },
  IMAGE: { content: false, image: true, link: true },
  ICON: { content: false, image: true, link: false },
  BADGE: { content: true, image: false, link: false },
  CTA: { content: true, image: false, link: true },
  PERIOD: { content: true, image: false, link: false },
  TARGET: { content: true, image: false, link: false },
  COUNTER: { content: true, image: false, link: false },
  REWARD_ITEM: { content: true, image: true, link: true },
  PROGRESS: { content: true, image: false, link: false },
  WHEEL_SEGMENT: { content: true, image: true, link: false },
  NOTICE_TEXT: { content: true, image: false, link: false },
  CONSENT: { content: true, image: false, link: true },
};

// 대체텍스트 필수 모듈 (이미지성). 없으면 draft 허용, 검수 요청(승인대기) 전환 차단.
//   전시빌더 PI-DSP-CMP-004 에 대응. 이벤트미션은 PI-EVTMSN-APPROVAL-001-02 검수 Gate(접근성).
export const ALT_TEXT_REQUIRED_MODULE_TYPES: readonly ModuleType[] = ['IMAGE', 'ICON', 'WHEEL_SEGMENT'];

// 페이지 빌더에서 삭제할 수 없는 필수 고지 모듈 — PI-EVTMSN-ADMIN-DISPLAY-001-02
//   "조건, 제한, 보상, 지급 일정, 개인정보·제휴사 제공 동의, 유의사항 필수 고지 모듈은 삭제할 수 없다."
export const MANDATORY_MODULE_TYPES: readonly ModuleType[] = ['NOTICE_TEXT', 'CONSENT', 'TARGET', 'PERIOD'];

export function isModuleReviewReady(moduleType: string, altText: string | null | undefined): boolean {
  if ((ALT_TEXT_REQUIRED_MODULE_TYPES as readonly string[]).includes(moduleType)) {
    return !!altText && altText.trim().length > 0;
  }
  return true;
}
export function isModuleMandatory(moduleType: string): boolean {
  return (MANDATORY_MODULE_TYPES as readonly string[]).includes(moduleType);
}

// ─────────────────────────────────────────────────────────────
// 2. Mechanic(메커닉) — Component급 기능 모듈. 반드시 4개 kind 중 하나.
//    참여 방식 / 인터랙션 / 보상 / 콘텐츠(전시)
//    근거: PG-EVTMSN-ACTION-001(참여방식) · PG-EVTMSN-INTERACT-001(인터랙션)
//          PG-EVTMSN-REWARD-001(보상) · PG-EVTMSN-ADMIN-MODULE-001(재사용 모듈)
// ─────────────────────────────────────────────────────────────
export const MECHANIC_KINDS = ['참여방식', '인터랙션', '보상', '콘텐츠'] as const;
export type MechanicKind = (typeof MECHANIC_KINDS)[number];

// 참여 방식 (PG-EVTMSN-ACTION-001) — 분류: 이벤트중심/미션중심/공통/조건부
export const PARTICIPATION_METHODS = [
  { key: '응모', category: '이벤트 중심' },
  { key: '선착순 신청', category: '이벤트 중심' },
  { key: '즉시 받기', category: '이벤트 중심' },
  { key: '다운로드', category: '조건부' },
  { key: '체크인', category: '미션 중심' },
  { key: '스탬프', category: '미션 중심' },
  { key: '단계 완료', category: '미션 중심' },
  { key: '누적 카운트', category: '미션 중심' },
  { key: '추천', category: '공통' },
  { key: '코드 입력', category: '공통' },
] as const;
export const PARTICIPATION_CATEGORIES = ['이벤트 중심', '미션 중심', '공통', '조건부', '원칙 제외'] as const;

// 인터랙션 요소 (PG-EVTMSN-INTERACT-001, 11종). 룰렛은 상위 유형이 아니라 인터랙션 모듈.
export const INTERACTION_ELEMENTS = [
  '룰렛',
  '퀴즈',
  '터치',
  '연속 달성',
  '선택하기',
  '코드 입력',
  '공유하기',
  '즉시 받기',
  '보상 선택형',
  '스크래치',
  '박스 열기',
] as const;
export type InteractionElement = (typeof INTERACTION_ELEMENTS)[number];

// 보상 유형 (PG-EVTMSN-REWARD-001, 7종)
export const REWARD_TYPES = [
  'T 플러스포인트',
  'SKT 발급 쿠폰·이용권',
  '외부 제휴사 쿠폰·이용권',
  '제휴사 포인트',
  '데이터',
  '상품·요금 할인 자동 적용',
  '경품',
] as const;
export type RewardType = (typeof REWARD_TYPES)[number];

/** Mechanic kind 별 세부 유형 선택지 (등록 폼) */
export function mechanicSubtypesFor(kind: string): readonly string[] {
  switch (kind) {
    case '참여방식':
      return PARTICIPATION_METHODS.map((m) => m.key);
    case '인터랙션':
      return INTERACTION_ELEMENTS;
    case '보상':
      return REWARD_TYPES;
    default:
      return [];
  }
}

// ─────────────────────────────────────────────────────────────
// 3. Section(섹션) — Corner급 화면 영역. 상세페이지 전시 모듈 영역.
//    Section 유형이 담을 수 있는 Mechanic kind 를 제한한다 (전시빌더 CORNER_COMPONENT_MAP 대응).
//    근거: PI-EVTMSN-ADMIN-DISPLAY-001-02 상세 페이지 전시 모듈 기준
// ─────────────────────────────────────────────────────────────
export const SECTION_TYPES = [
  '키비주얼',
  '참여·플레이',
  '보상·경품 안내',
  '조건·자격 안내',
  '미션 진행',
  '참여 내역',
  '후속·공유',
  '필수 고지',
] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

export const SECTION_TYPE_DESC: Record<SectionType, string> = {
  키비주얼: '상단 히어로 — 키비주얼·프로그램명·유형 라벨·핵심 혜택 요약·기간.',
  '참여·플레이': '룰렛·퀴즈·응모 등 인터랙션/참여 영역 + 응모 기회 카운터.',
  '보상·경품 안내': '경품·보상 목록과 지급 기준.',
  '조건·자격 안내': '대상 조건·참여 방법·응모 기회 안내.',
  '미션 진행': '진행률·목표값·남은 기간·이어하기·시즌/회차(미션).',
  '참여 내역': '고객 참여 이력.',
  '후속·공유': '공유·딥링크·후속 행동 CTA.',
  '필수 고지': '유의사항·동의·지급 일정 (삭제 불가 고지).',
};

// Section 유형 → 허용 Mechanic kind (PI-EVTMSN-ADMIN-DISPLAY-001-02)
export const SECTION_MECHANIC_MAP: Record<SectionType, readonly MechanicKind[]> = {
  키비주얼: ['콘텐츠'],
  '참여·플레이': ['인터랙션', '참여방식', '콘텐츠'],
  '보상·경품 안내': ['보상', '콘텐츠'],
  '조건·자격 안내': ['콘텐츠'],
  '미션 진행': ['참여방식', '콘텐츠'],
  '참여 내역': ['콘텐츠'],
  '후속·공유': ['참여방식', '콘텐츠'],
  '필수 고지': ['콘텐츠'],
};

// 페이지에서 삭제할 수 없는 섹션 유형 (필수 고지). PI-EVTMSN-ADMIN-DISPLAY-001-02
export const MANDATORY_SECTION_TYPES: readonly SectionType[] = ['필수 고지'];

export function isMechanicAllowedInSection(sectionType: SectionType, kind: MechanicKind): boolean {
  return (SECTION_MECHANIC_MAP[sectionType] ?? []).includes(kind);
}
export function isSectionMandatory(sectionType: string): boolean {
  return (MANDATORY_SECTION_TYPES as readonly string[]).includes(sectionType);
}
/** 이 Mechanic kind 를 담을 수 있는 Section 유형 목록 (역방향) */
export function sectionTypesForMechanic(kind: MechanicKind): SectionType[] {
  return SECTION_TYPES.filter((s) => SECTION_MECHANIC_MAP[s].includes(kind));
}

// ─────────────────────────────────────────────────────────────
// 4. 운영자 워크플로우 상태 (12단계) — Page(페이지)에 부착.
//    PI-EVTMSN-APPROVAL-001-01: 작성·검수요청·검수반려·승인대기·승인완료·
//    배포예약·배포중·배포완료·중지·재개·종료·롤백
//    (전시빌더 Template.status 10단계에 대응하는 이벤트미션판)
// ─────────────────────────────────────────────────────────────
export const OPS_STATUSES = [
  { key: 'DRAFT', label: '작성' },
  { key: 'REVIEW_REQUESTED', label: '검수 요청' },
  { key: 'REVIEW_REJECTED', label: '검수 반려' },
  { key: 'APPROVAL_WAITING', label: '승인 대기' },
  { key: 'APPROVED', label: '승인 완료' },
  { key: 'DEPLOY_SCHEDULED', label: '배포 예약' },
  { key: 'DEPLOYING', label: '배포 중' },
  { key: 'DEPLOYED', label: '배포 완료' },
  { key: 'SUSPENDED', label: '중지' },
  { key: 'RESUMED', label: '재개' },
  { key: 'ENDED', label: '종료' },
  { key: 'ROLLED_BACK', label: '롤백' },
] as const;
export type OpsStatusKey = (typeof OPS_STATUSES)[number]['key'];

export const OPS_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  OPS_STATUSES.map((s) => [s.key, s.label]),
);

// 허용 전이 (PI-EVTMSN-APPROVAL-001 / PG-EVTMSN-DEPLOY-001)
//  작성 → 검수요청 → (반려 → 작성) → 승인대기 → 승인완료 → 배포예약/배포중 → 배포완료
//  배포완료 → 중지 → 재개(배포중 복귀) / 롤백 ; 배포완료 → 종료
export const OPS_STATUS_TRANSITIONS: Record<OpsStatusKey, OpsStatusKey[]> = {
  DRAFT: ['REVIEW_REQUESTED'],
  REVIEW_REQUESTED: ['APPROVAL_WAITING', 'REVIEW_REJECTED'],
  REVIEW_REJECTED: ['DRAFT'],
  APPROVAL_WAITING: ['APPROVED', 'REVIEW_REJECTED'],
  APPROVED: ['DEPLOY_SCHEDULED', 'DEPLOYING'],
  DEPLOY_SCHEDULED: ['DEPLOYING', 'SUSPENDED'],
  DEPLOYING: ['DEPLOYED', 'SUSPENDED'],
  DEPLOYED: ['SUSPENDED', 'ENDED'],
  SUSPENDED: ['RESUMED', 'ROLLED_BACK', 'ENDED'],
  RESUMED: ['DEPLOYED', 'SUSPENDED'],
  ENDED: [],
  ROLLED_BACK: ['DRAFT'], // 롤백 후 재작성
};

// 배포 방식 (PI-EVTMSN-DEPLOY-001-01)
export const DEPLOY_MODES = ['즉시 배포', '예약 배포', '단계 배포', '일부 채널 선배포'] as const;
// 중지 구분 (PI-EVTMSN-DEPLOY-001-02)
export const SUSPEND_SCOPES = ['신규 노출 중지', '신규 참여 중지', '보상 지급 보류', '전체 프로그램 중지'] as const;

// ─────────────────────────────────────────────────────────────
// 5. 고객 표시 상태 (20단계, ST-EVTMSN-001~020) — 미리보기/참조용.
//    운영자 워크플로우와 별개(참여 라이프사이클). 라. 상태 전이표.
// ─────────────────────────────────────────────────────────────
export const CUSTOMER_STATUSES = [
  { code: 'ST-EVTMSN-001', label: '참여 가능' },
  { code: 'ST-EVTMSN-002', label: '상세 확인 중' },
  { code: 'ST-EVTMSN-003', label: '참여 불가' },
  { code: 'ST-EVTMSN-004', label: '참여 제한' },
  { code: 'ST-EVTMSN-005', label: '참여 진행 중' },
  { code: 'ST-EVTMSN-006', label: '참여 미완료' },
  { code: 'ST-EVTMSN-007', label: '참여 완료' },
  { code: 'ST-EVTMSN-008', label: '미션 진행 중' },
  { code: 'ST-EVTMSN-009', label: '미션 완료 인정 대기' },
  { code: 'ST-EVTMSN-010', label: '미션 실패' },
  { code: 'ST-EVTMSN-011', label: '미션 완료' },
  { code: 'ST-EVTMSN-012', label: '결과 확정 대기' },
  { code: 'ST-EVTMSN-013', label: '미당첨' },
  { code: 'ST-EVTMSN-014', label: '보상 지급 예정' },
  { code: 'ST-EVTMSN-015', label: '보상 지급 완료' },
  { code: 'ST-EVTMSN-016', label: '보상 사용 불가' },
  { code: 'ST-EVTMSN-017', label: '보상 보정 대기' },
  { code: 'ST-EVTMSN-018', label: '보상 조정 검토' },
  { code: 'ST-EVTMSN-019', label: '부정 참여 의심' },
  { code: 'ST-EVTMSN-020', label: '운영 중지' },
] as const;

// ─────────────────────────────────────────────────────────────
// 6. 공개 범위 / 노출 진입점 — PI-EVTMSN-ADMIN-DISPLAY-001-01
// ─────────────────────────────────────────────────────────────
export const VISIBILITY_SCOPES = ['전체 공개', '일부 고객 전용', '초청 대상 전용', '운영 검수 전 비공개'] as const;
export type VisibilityScope = (typeof VISIBILITY_SCOPES)[number];

export const ENTRY_POINTS = [
  '허브',
  '목록',
  '상세',
  '페이지',
  '팝업',
  '배너',
  '알림',
  '알림 랜딩',
  '시크릿 URL',
  'QR',
  '외부 유입 링크',
] as const;

// 초청형 운영 방식 (PI-EVTMSN-ADMIN-DISPLAY-001-01)
export const INVITE_MODES = ['상시 재진입형', '시점 한정 시크릿 페이지형'] as const;

// ── 프로그램/재료 상태 (전시빌더와 동일 운영: soft-delete = 상태값) ──
export const PROGRAM_STATUSES = ['active', 'inactive'] as const;
export type ProgramStatus = (typeof PROGRAM_STATUSES)[number];

// 프로그램 승인 워크플로우 (프로그램 단위 — 전시빌더 Container 승인과 동일 구조)
export const PROGRAM_APPROVAL_STATUSES = [
  { key: 'DRAFT', label: '작성중' },
  { key: 'REVIEW', label: '승인 대기' },
  { key: 'APPROVED', label: '승인 완료' },
  { key: 'REJECTED', label: '반려' },
] as const;
export type ProgramApprovalStatusKey = (typeof PROGRAM_APPROVAL_STATUSES)[number]['key'];
export const PROGRAM_APPROVAL_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  PROGRAM_APPROVAL_STATUSES.map((s) => [s.key, s.label]),
);
export const PROGRAM_APPROVAL_TRANSITIONS: Record<string, ProgramApprovalStatusKey[]> = {
  DRAFT: ['REVIEW'],
  REVIEW: ['APPROVED', 'REJECTED'],
  REJECTED: ['REVIEW'],
  APPROVED: ['DRAFT'],
};

// 재료(Module/Mechanic/Section) 사용/미사용
export const MATERIAL_STATUSES = ['active', 'inactive'] as const;
export const MATERIAL_STATUS_LABELS: Record<string, string> = { active: '사용', inactive: '미사용' };
