/**
 * 조건 관리 — 목록 데이터 모델 (조건 항목 / 조건 유형 / 조건 템플릿).
 *  프로모션 관리(src/lib/promotion/model.ts)와 같은 방식으로, 시드 행 + 파생 행을
 *  모듈 로드 시 한 번 만들어 클라이언트에서 필터·페이지네이션만 한다.
 */

/* ────────────────────────────── 공통 ────────────────────────────── */

const REG = '김지원';

/** 사용 여부 필터 옵션 (전 페이지 공통) */
export const USE_OPTS = ['전체', 'Y', 'N'] as const;

/* ═══════════════════════════ 1. 조건 항목 관리 ═══════════════════════════ */

/** 조건 항목 분류 — 필터 셀렉트 옵션(순서 고정). */
export const ITEM_CATEGORIES = [
  '전체', '미지정', '고객 기본', '멤버십', '회선', '상품·서비스 상태', '과거 행동 이력',
  '이벤트 이력', '기간 유지', '운영 결과', '상품·서비스 행동 이력', '사전예약 대상',
  '결제 연계 행동', '상담', '서비스 집계', '거래 추가 제한', '상품 행동',
  '서비스 · 혜택 행동', '상담 행동',
];

export type CondItem = {
  id: string;
  name: string;
  cat: string;
  /** 입력 변수 — 각 줄로 표시 */
  vars: string[];
  ret: string;
  /** 회원 전용 */
  memberOnly: boolean;
  /** 사용 여부 */
  use: boolean;
  reg: string;
  regAt: string;
  mod: string;
  modAt: string;
};

// [id, name, cat, vars, ret, memberOnly, regAt, modAt]
type ItemSeed = [string, string, string, string[], string, boolean, string, string];

const ITEM_SEED: ItemSeed[] = [
  ['CI0001', '만 나이 조회', '고객 기본', ['고객 CI', '조회 기준 시점'], '만 나이', false, '2026.10.20 09:10', '2026.10.20 14:32'],
  ['CI0002', '생년월일 조회', '고객 기본', ['고객 CI'], '생년월일', false, '2026.10.20 09:10', '2026.10.20 14:32'],
  ['CI0003', '성별 조회', '고객 기본', ['고객 CI'], '성별', false, '2026.10.19 09:11', '2026.10.20 14:32'],
  ['CI0004', '고객 유형 조회', '고객 기본', ['고객 CI'], '고객 유형', false, '2026.10.18 09:12', '2026.10.20 14:32'],
  ['CI0005', '고객 상태 조회', '고객 기본', ['고객 CI', '조회 기준 시점'], '고객 상태', false, '2026.10.17 09:13', '2026.10.20 14:32'],
  ['CI0006', 'T 멤버십 회원 여부 조회', '멤버십', ['고객 CI', '조회 기준 시점'], '회원 여부', true, '2026.10.20 09:14', '2026.10.20 14:35'],
  ['CI0007', '멤버십 등급 조회', '멤버십', ['멤버십 카드 번호', '조회 기준 시점', '조회 구분 코드'], '등급', true, '2026.10.19 09:15', '2026.10.20 14:35'],
  ['CI0008', '멤버십 혜택 유형 조회', '멤버십', ['멤버십 카드 번호'], '혜택 유형', true, '2026.10.18 09:16', '2026.10.20 14:35'],
  ['CI0009', '보유 회선 조회', '회선', ['고객 CI', '조회 기준 시점'], '보유 회선', true, '2026.10.17 09:17', '2026.10.20 14:41'],
  ['CI0010', '회선 상태 조회', '회선', ['서비스 관리 번호', '조회 기준 시점'], '상태', true, '2026.10.20 09:18', '2026.10.20 14:41'],
];

// CI0011–CI0046 — 분류 전반에 걸친 생성 행. [name, cat, vars, ret, memberOnly]
type ItemGen = [string, string, string[], string, boolean];
const ITEM_GEN: ItemGen[] = [
  ['상품 구매 완료 여부 조회', '상품·서비스 행동 이력', ['고객 CI', '대상 상품 코드', '인정 기간'], '구매 완료 여부', false],
  ['단말 개통 완료 여부 조회', '상품·서비스 행동 이력', ['고객 CI', '대상 단말 코드', '가입 유형'], '개통 완료 여부', false],
  ['요금제 가입 여부 조회', '상품·서비스 상태', ['고객 CI', '대상 요금제 코드', '조회 기준 시점'], '가입 여부', false],
  ['사전예약 완료 여부 조회', '사전예약 대상', ['고객 CI', '사전예약 캠페인 ID'], '예약 완료 여부', false],
  ['출석 집계 조회', '서비스 집계', ['고객 CI', '집계 기간', '이벤트 ID'], '누적 출석일 수', false],
  ['배송 결과 조회', '운영 결과', ['주문 번호', '조회 기준 시점'], '배송 상태', false],
  ['상담 완료 여부 조회', '상담', ['고객 CI', '상담 유형 코드', '조회 기간'], '상담 완료 여부', false],
  ['이벤트 참여 이력 조회', '이벤트 이력', ['고객 CI', '이벤트 ID', '조회 기간'], '참여 여부', false],
  ['가입 유지 여부 조회', '기간 유지', ['고객 CI', '대상 상품 코드', '유지 기간(개월)'], '유지 여부', false],
  ['해지 이력 여부 조회', '과거 행동 이력', ['고객 CI', '대상 상품 코드', '조회 기간'], '해지 이력 여부', false],
  ['멤버십 포인트 잔액 조회', '멤버십', ['멤버십 카드 번호', '조회 기준 시점'], '포인트 잔액', true],
  ['멤버십 사용 이력 조회', '서비스 · 혜택 행동', ['멤버십 카드 번호', '조회 기간'], '사용 횟수', true],
  ['보유 단말 조회', '회선', ['고객 CI', '조회 기준 시점'], '보유 단말 목록', true],
  ['회선 요금제 조회', '회선', ['서비스 관리 번호', '조회 기준 시점'], '요금제 명', true],
  ['결제 수단 등록 여부 조회', '결제 연계 행동', ['고객 CI', '조회 기준 시점'], '등록 여부', true],
  ['자동 결제 등록 여부 조회', '결제 연계 행동', ['고객 CI', '대상 상품 코드'], '등록 여부', true],
  ['미납 여부 조회', '상품·서비스 상태', ['고객 CI', '조회 기준 시점'], '미납 여부', true],
  ['부가서비스 가입 여부 조회', '상품·서비스 상태', ['서비스 관리 번호', '대상 부가서비스 코드'], '가입 여부', false],
  ['구독 상품 이용 여부 조회', '상품·서비스 상태', ['고객 CI', '대상 구독 상품 코드', '조회 기준 시점'], '이용 여부', false],
  ['리뷰 작성 이력 조회', '상품 행동', ['고객 CI', '대상 상품 코드', '조회 기간'], '작성 여부', false],
  ['장바구니 담기 이력 조회', '상품 행동', ['고객 CI', '대상 상품 코드', '조회 기간'], '담기 여부', false],
  ['혜택 수령 이력 조회', '서비스 · 혜택 행동', ['고객 CI', '대상 혜택 코드', '조회 기간'], '수령 여부', true],
  ['쿠폰 사용 이력 조회', '서비스 · 혜택 행동', ['고객 CI', '대상 쿠폰 코드', '조회 기간'], '사용 여부', true],
  ['상담 신청 이력 조회', '상담 행동', ['고객 CI', '상담 유형 코드', '조회 기간'], '신청 여부', false],
  ['상담 만족도 조회', '상담 행동', ['상담 접수 번호'], '만족도 점수', false],
  ['누적 결제 금액 조회', '서비스 집계', ['고객 CI', '집계 기간'], '누적 결제 금액', false],
  ['누적 구매 횟수 조회', '서비스 집계', ['고객 CI', '집계 기간'], '누적 구매 횟수', false],
  ['일 거래 한도 초과 여부 조회', '거래 추가 제한', ['고객 CI', '조회 기준 시점'], '초과 여부', true],
  ['중복 참여 제한 여부 조회', '거래 추가 제한', ['고객 CI', '이벤트 ID'], '제한 여부', false],
  ['최근 로그인 일시 조회', '과거 행동 이력', ['고객 CI'], '최근 로그인 일시', false],
  ['앱 푸시 동의 여부 조회', '고객 기본', ['고객 CI', '조회 기준 시점'], '동의 여부', false],
  ['마케팅 수신 동의 여부 조회', '고객 기본', ['고객 CI', '조회 기준 시점'], '동의 여부', false],
  ['번호이동 가입 여부 조회', '상품·서비스 행동 이력', ['고객 CI', '조회 기간', '채널 코드'], '가입 여부', false],
  ['신규 가입 여부 조회', '상품·서비스 행동 이력', ['고객 CI', '조회 기간'], '가입 여부', false],
  ['멤버십 혜택 사용 가능 여부 조회', '멤버십', ['멤버십 카드 번호', '대상 혜택 코드'], '사용 가능 여부', true],
  ['미지정 임시 항목 조회', '미지정', ['고객 CI'], '반환값 미정', false],
];

const pad = (n: number) => String(n).padStart(2, '0');

let _items: CondItem[] | null = null;
export function condItems(): CondItem[] {
  if (_items) return _items;
  const rows: CondItem[] = ITEM_SEED.map((s) => ({
    id: s[0], name: s[1], cat: s[2], vars: s[3], ret: s[4],
    memberOnly: s[5], use: true, reg: REG, regAt: s[6], mod: REG, modAt: s[7],
  }));
  ITEM_GEN.forEach((g, i) => {
    const n = 11 + i; // CI0011 …
    const day = 10 + ((i * 2) % 21); // 2026.10.10 ~ 2026.10.30 범위
    const hour = 9 + (i % 9);
    const min = (i * 7) % 60;
    const modDay = Math.min(31, day + 1);
    const regAt = `2026.10.${pad(day)} ${pad(hour)}:${pad(min)}`;
    const modAt = `2026.10.${pad(modDay)} ${pad((hour + 5) % 24)}:${pad((min + 11) % 60)}`;
    // 생성 행 중 일부만 미사용(N)으로 — 필터 체감용
    const use = !(i % 9 === 4);
    rows.push({
      id: `CI${String(n).padStart(4, '0')}`,
      name: g[0], cat: g[1], vars: g[2], ret: g[3],
      memberOnly: g[4], use, reg: REG, regAt, mod: REG, modAt,
    });
  });
  _items = rows;
  return rows;
}

export type ItemFilter = { name: string; cat: string; use: string };
export const ITEM_F0: ItemFilter = { name: '', cat: '전체', use: '전체' };

export function filterItems(rows: CondItem[], f: ItemFilter): CondItem[] {
  const kw = f.name.trim();
  return rows.filter((r) => {
    if (kw && !r.name.includes(kw)) return false;
    if (f.cat !== '전체' && r.cat !== f.cat) return false;
    if (f.use === 'Y' && !r.use) return false;
    if (f.use === 'N' && r.use) return false;
    return true;
  });
}

/* ═══════════════════════════ 2. 조건 유형 관리 ═══════════════════════════ */

export type CondType = {
  id: string;
  name: string;
  count: number;
  summary: string;
  period: string;
  use: boolean;
  reg: string;
  regAt: string;
};

const TYPE_SEED: CondType[] = [
  {
    id: 'TG0001', name: '서비스 장기 이용 성인 고객', count: 2,
    summary: '(서비스 이용 개월 수 ≥ 12 개월 [대상 서비스 : 에이닷] AND 만 나이 ≥ 20 세) OR (상품 구매 완료 여부 = Y [대상 : 이벤트에서 입력 / 인정 기간 : 이벤트에서 입력 (선택) / 채널 : 이벤트에서 입력 (선택) / 취소 건 : 제외])',
    period: '2026.01.01 ~ 2026.12.31', use: true, reg: '김지원', regAt: '2026.10.21 10:20',
  },
  {
    id: 'TG0002', name: '멤버십 우수 성인 고객', count: 1,
    summary: '(등급 IN VIP, GOLD OR 회원 여부 = Y) AND 만 나이 ≥ 19 세',
    period: '2026.01.01 ~ 2026.12.31', use: true, reg: '이수민', regAt: '2026.10.22 15:04',
  },
  {
    id: 'TG0003', name: '최근 해지 고객', count: 1,
    summary: '해지 이력 여부 = Y [대상 : 이벤트에서 입력 / 조회 기간 : 이벤트에서 입력]',
    period: '2026.01.01 ~ 2026.06.30', use: false, reg: '김지원', regAt: '2026.10.23 09:41',
  },
  {
    id: 'TG0004', name: '다이렉트샵 신규 · 번호이동 개통 고객', count: 1,
    summary: '단말 개통 완료 여부 = Y [대상 : 이벤트에서 입력 / 인정 기간 : 이벤트에서 입력 (선택) / 가입 유형 : 신규, 번호이동 / 채널 : T 다이렉트샵]',
    period: '2026.01.01 ~ 2026.12.31', use: true, reg: '박민호', regAt: '2026.10.28 13:20',
  },
  {
    id: 'TG0005', name: '정상 회선 개인 고객', count: 1,
    summary: '고객 유형 = 개인 AND 상태 = 정상',
    period: '2026.01.01 ~ 2026.12.31', use: true, reg: '이수민', regAt: '2026.10.29 10:05',
  },
  {
    id: 'TG0006', name: '신규 가입 대상 고객', count: 1,
    summary: '가입 이력 여부 = N [대상 : 이벤트에서 입력 / 조회 기간 : 2026.01.01 ~ 2026.10.31 (변경 가능)]',
    period: '2026.01.01 ~ 2026.12.31', use: true, reg: '김지원', regAt: '2026.10.30 16:42',
  },
  {
    id: 'TG0007', name: '출석 이벤트 우수 참여 고객', count: 1,
    summary: '누적 출석일 수 ≥ 10 일 (변경 가능) [대상 : 이벤트에서 입력 / 집계 기간 : 이벤트에서 입력]',
    period: '2026.03.01 ~ 2026.12.31', use: true, reg: '홍길동', regAt: '2026.11.02 11:18',
  },
  {
    id: 'TG0008', name: '배송 또는 상담 완료 고객', count: 2,
    summary: '(배송 결과 = 배송 완료 [대상 : 이벤트에서 입력]) OR (상담 완료 여부 = Y [대상 : 이벤트에서 입력])',
    period: '2026.01.01 ~ 2026.12.31', use: true, reg: '박민호', regAt: '2026.11.03 09:27',
  },
  {
    id: 'TG0009', name: '12개월 가입 유지 고객', count: 1,
    summary: '유지 여부 = Y [대상 : 이벤트에서 입력 / 유지 기간(개월) : 12]',
    period: '2026.01.01 ~ 2026.09.30', use: false, reg: '이수민', regAt: '2026.11.04 14:55',
  },
];

export function condTypes(): CondType[] {
  return TYPE_SEED;
}

export type TypeFilter = { name: string; use: string };
export const TYPE_F0: TypeFilter = { name: '', use: '전체' };

export function filterTypes(rows: CondType[], f: TypeFilter): CondType[] {
  const kw = f.name.trim();
  return rows.filter((r) => {
    if (kw && !r.name.includes(kw)) return false;
    if (f.use === 'Y' && !r.use) return false;
    if (f.use === 'N' && r.use) return false;
    return true;
  });
}

/* ═══════════════════════════ 3. 조건 템플릿 관리 ═══════════════════════════ */

export type CondTemplate = {
  id: string;
  name: string;
  summary: string;
  typeCount: number;
  /** 사용 가능 위치 — 공개 조건 / 참여 조건 / 지급 조건 */
  usableAt: string[];
  memberOnly: boolean;
  version: string;
  use: boolean;
  /** 승인 상태 — '승인 완료' | '저장' */
  approval: string;
  reg: string;
  regAt: string;
};

const TEMPLATE_SEED: CondTemplate[] = [
  {
    id: 'TP0001', name: '장기 이용 성인 · 멤버십 우수 고객',
    summary: '(서비스 장기 이용 성인 고객 OR 멤버십 우수 성인 고객) AND NOT (최근 해지 고객)',
    typeCount: 3, usableAt: ['참여 조건'], memberOnly: true, version: 'v2', use: true,
    approval: '승인 완료', reg: '김지원', regAt: '2026.10.24 11:02',
  },
  {
    id: 'TP0002', name: '서비스 장기 이용 성인 고객',
    summary: '(서비스 장기 이용 성인 고객)',
    typeCount: 1, usableAt: ['참여 조건', '지급 조건'], memberOnly: true, version: 'v1', use: true,
    approval: '승인 완료', reg: '이수민', regAt: '2026.10.25 16:40',
  },
  {
    id: 'TP0003', name: '멤버십 우수 성인 고객 공개',
    summary: '(멤버십 우수 성인 고객)',
    typeCount: 1, usableAt: ['공개 조건'], memberOnly: true, version: 'v1', use: true,
    approval: '승인 완료', reg: '김지원', regAt: '2026.10.26 10:15',
  },
  {
    id: 'TP0004', name: '다이렉트샵 개통 개인 고객 또는 신규 가입 멤버십 우수 고객',
    summary: '(다이렉트샵 신규 · 번호이동 개통 고객 AND 정상 회선 개인 고객) OR (신규 가입 대상 고객 AND 멤버십 우수 성인 고객)',
    typeCount: 4, usableAt: ['참여 조건'], memberOnly: true, version: 'v1', use: true,
    approval: '승인 완료', reg: '박민호', regAt: '2026.11.04 10:12',
  },
  {
    id: 'TP0005', name: '출석 우수 또는 배송 · 상담 완료 정상 회선 고객',
    summary: '(출석 이벤트 우수 참여 고객 OR 배송 또는 상담 완료 고객) AND (정상 회선 개인 고객)',
    typeCount: 3, usableAt: ['지급 조건'], memberOnly: true, version: 'v2', use: true,
    approval: '승인 완료', reg: '홍길동', regAt: '2026.11.05 14:30',
  },
  {
    id: 'TP0006', name: '해지 이력 없는 신규 가입 대상 고객',
    summary: '(신규 가입 대상 고객 AND 정상 회선 개인 고객) AND NOT (최근 해지 고객)',
    typeCount: 3, usableAt: ['공개 조건', '참여 조건'], memberOnly: true, version: 'v1', use: true,
    approval: '저장', reg: '이수민', regAt: '2026.11.06 09:48',
  },
  {
    id: 'TP0007', name: '다이렉트샵 개통 고객 (최근 해지 제외)',
    summary: '(다이렉트샵 신규 · 번호이동 개통 고객) AND NOT (최근 해지 고객)',
    typeCount: 2, usableAt: ['참여 조건', '지급 조건'], memberOnly: true, version: 'v1', use: true,
    approval: '승인 완료', reg: '박민호', regAt: '2026.11.06 15:20',
  },
  {
    id: 'TP0008', name: '출석 이벤트 우수 참여 고객',
    summary: '(출석 이벤트 우수 참여 고객)',
    typeCount: 1, usableAt: ['참여 조건', '지급 조건'], memberOnly: true, version: 'v1', use: true,
    approval: '승인 완료', reg: '홍길동', regAt: '2026.11.06 16:05',
  },
  {
    id: 'TP0009', name: '신규 가입 대상 또는 출석 우수 고객',
    summary: '(신규 가입 대상 고객 OR 출석 이벤트 우수 참여 고객)',
    typeCount: 2, usableAt: ['공개 조건', '참여 조건'], memberOnly: true, version: 'v1', use: true,
    approval: '승인 완료', reg: '김지원', regAt: '2026.11.07 10:30',
  },
  {
    id: 'TP0010', name: '배송 또는 상담 완료 고객',
    summary: '(배송 또는 상담 완료 고객)',
    typeCount: 1, usableAt: ['지급 조건'], memberOnly: true, version: 'v1', use: true,
    approval: '승인 완료', reg: '이수민', regAt: '2026.11.07 11:42',
  },
];

export function condTemplates(): CondTemplate[] {
  return TEMPLATE_SEED;
}

export type TemplateFilter = { name: string; use: string };
export const TEMPLATE_F0: TemplateFilter = { name: '', use: '전체' };

export function filterTemplates(rows: CondTemplate[], f: TemplateFilter): CondTemplate[] {
  const kw = f.name.trim();
  return rows.filter((r) => {
    if (kw && !r.name.includes(kw)) return false;
    if (f.use === 'Y' && !r.use) return false;
    if (f.use === 'N' && r.use) return false;
    return true;
  });
}
