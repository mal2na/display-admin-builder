/**
 * 약관 — 마스터 · 매핑 모델.
 *  이벤트 약관(2-16)과 비회원 약관이 같은 조회 팝업·같은 마스터를 쓴다.
 *  필수 여부는 **약관 마스터의 '필수 여부 변경' 설정**을 따른다. 고지형은 항상 필수(변경 불가).
 */

export const TERM_TYPES = ['서비스 약관', '상품 약관', '제휴사 입점', '이벤트/프로모션', '개인정보처리방침', '개인정보 약관'];
export const TERM_CONS = ['필수동의(선택형)', '필수동의(고지형)', '선택동의'];

export type Term = { id: string; name: string; type: string; cons: string; chg: '허용' | '미허용' };

export const TERMS: Term[] = ([
  ['POLI2609000010', '이벤트 참여 약관', '이벤트/프로모션', '필수동의(선택형)', '미허용'],
  ['POLI2609000011', '경품 제세공과금 안내', '이벤트/프로모션', '필수동의(고지형)', '미허용'],
  ['POLI2608000001', '개인정보 수집 및 이용 동의', '개인정보 약관', '필수동의(선택형)', '미허용'],
  ['POLI2603000001', '배송 정보 수집 및 이용 동의', '개인정보 약관', '필수동의(선택형)', '미허용'],
  ['POLI2607000001', '마케팅 수신동의 여부', '서비스 약관', '선택동의', '허용'],
  ['POLI2510000001', '개인정보 제3자(제휴사) 제공 동의', '개인정보 약관', '선택동의', '허용'],
  ['POLI2604000001', '개인정보 제3자(11pay) 제공 동의', '개인정보 약관', '선택동의', '허용'],
  ['POLI2609000004', '프로모션 정상가격 자동 결제 동의', '상품 약관', '필수동의(고지형)', '미허용'],
  ['POLI2609000012', 'T 우주 구독 서비스 이용약관', '서비스 약관', '선택동의', '허용'],
  ['POLI2609000013', '제휴사 입점 이용 약관', '제휴사 입점', '선택동의', '허용'],
  ['POLI2609000014', '개인정보처리방침', '개인정보처리방침', '필수동의(고지형)', '미허용'],
  ['POLI2609000020', '비회원 개인정보 수집·이용 동의', '개인정보 약관', '필수동의(선택형)', '미허용'],
] as const).map(([id, name, type, cons, chg]) => ({ id, name, type, cons, chg: chg as Term['chg'] }));

/** 비회원 약관에 항상 들어가는 고정 약관 */
export const GUEST_TERM_FIX = 'POLI2609000020';

export const termById = (id: string) => TERMS.find((t) => t.id === id);
/** 고지형 — 필수 고정이고 바꿀 수 없다 */
export const isNotice = (cons: string) => cons === '필수동의(고지형)';
/** 동의 구분에서 온 기본 필수 여부 */
export const baseReq = (cons: string) => (cons === '선택동의' ? '선택' : '필수');
/** 이벤트에서 필수·선택을 바꿀 수 있는 약관인가 */
export const canChange = (t: Term) => t.chg === '허용' && !isNotice(t.cons);

export type TermMap = { id: string; req: string };
/** 새로 매핑할 때의 필수 여부 */
export const initialReq = (t: Term) => (isNotice(t.cons) ? '필수(고지)' : baseReq(t.cons));

/* ── 비회원 참여 ───────────────────────────────────────────────── */
/** [항목명, 기본 필수 여부, 비고, 고정 여부] */
export const GUEST_FIELDS: [string, '필수' | '선택', string, boolean][] = [
  ['휴대전화번호', '필수', '비회원 식별·중복 참여 판별 기준 (고정)', true],
  ['이름', '필수', '', false],
  ['이메일', '선택', '', false],
  ['배송지', '선택', '경품 배송 시', false],
  ['생년월일', '선택', '연령 조건 판정 시', false],
];

export type GuestField = {
  name: string; use: boolean;
  req: '필수' | '선택'; at: '참여 시' | '혜택 지급 시';
  fixed: boolean; note: string;
  /** 마스터의 기본 필수 여부 — 잠김 판정은 바뀐 값이 아니라 이 값으로 한다 */
  defReq: '필수' | '선택';
};

export function initialGuestFields(): GuestField[] {
  return GUEST_FIELDS.map(([name, req, note, fixed]) => ({
    name,
    // 고정이거나 기본이 필수인 항목만 처음부터 사용
    use: fixed || req === '필수',
    req, defReq: req,
    at: name === '배송지' ? '혜택 지급 시' : '참여 시',
    fixed,
    note,
  }));
}
/** 고정이거나 마스터 기본이 '선택'인 항목은 필수 여부·수집 시점을 바꿀 수 없다 */
export const guestFieldLocked = (g: GuestField) => g.fixed || g.defReq !== '필수';
