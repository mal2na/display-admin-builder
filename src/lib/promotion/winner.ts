// 당첨자 관리 — SB Figma(BO-AIM-EVT-PG082, node 26334-136208) 기반 모델.
//  당첨자 선정·리워드 지급 대상 프로모션(이벤트 > 참여·리워드형 / 추천형) 조회 목록. 데모 샘플.

export type WinnerPromoType = '이벤트 > 추천형' | '이벤트 > 참여·리워드형';
export type PromoStatus = '진행예정' | '진행 중' | '일시 중단' | '즉시 종료' | '기간 종료' | '완료';
export type ApprovalStatus = '선정 대기' | '승인 대기' | '승인 완료' | '반려' | '-';
export type ProcessStatus = '선정 대기' | '진행 중' | '지급 완료';

export type WinnerRow = {
  no: number;
  promoId: string;
  promoType: WinnerPromoType;
  promoName: string;
  promoStatus: PromoStatus;
  joinPeriod: string;       // 2026.08.05 ~ 2026.08.10
  approval: ApprovalStatus; // 승인 상태(Badge)
  process: ProcessStatus;   // 처리 상태
  joinCount: number;        // 참여자 수
  paid: number;             // 지급 인원
  total: number | '전체';   // 전체 참여자 수(지급 현황 분모)
  editor: string;           // 최종 수정자
  editedAt: string;         // 2026.10.14 17:45
};

// 검색 옵션
export const WINNER_PROMO_TYPES: ('전체' | WinnerPromoType)[] = ['전체', '이벤트 > 추천형', '이벤트 > 참여·리워드형'];
export const WINNER_PROMO_STATUSES: ('전체' | PromoStatus)[] = ['전체', '진행예정', '진행 중', '일시 중단', '즉시 종료', '기간 종료', '완료'];
export const WINNER_PROCESS_STATUSES: ('전체' | ProcessStatus)[] = ['전체', '선정 대기', '진행 중', '지급 완료'];
export const WINNER_SEARCH_FIELDS = ['프로모션명', '프로모션 ID', '최종 수정자'] as const;

// 승인 상태 → 칩 톤(Figma: 승인 완료=초록, 승인 대기=파랑, 반려=빨강).
export const approvalTone = (a: ApprovalStatus): 'success' | 'info' | 'negative' | 'neutral' => (
  a === '승인 완료' ? 'success' : a === '반려' ? 'negative' : a === '-' ? 'neutral' : 'info'
);

export const WINNER_ROWS: WinnerRow[] = [
  { no: 28, promoId: 'ENV123456', promoType: '이벤트 > 추천형', promoName: '10월 고객 감사 경품 이벤트', promoStatus: '진행 중', joinPeriod: '2026.08.05 ~ 2026.08.10', approval: '승인 완료', process: '선정 대기', joinCount: 1280, paid: 0, total: 350, editor: '홍길동(P123456)', editedAt: '2026.10.14 17:45' },
  { no: 27, promoId: 'ENV123455', promoType: '이벤트 > 추천형', promoName: 'T day 참여 혜택 프로모션', promoStatus: '진행 중', joinPeriod: '2026.07.05 ~ 2026.07.19', approval: '승인 대기', process: '선정 대기', joinCount: 956, paid: 0, total: '전체', editor: '홍길동(P123456)', editedAt: '2026.10.14 16:20' },
  { no: 24, promoId: 'ENV123454', promoType: '이벤트 > 참여·리워드형', promoName: '가정양육 추첨 프로모션', promoStatus: '완료', joinPeriod: '2026.06.05 ~ 2026.06.19', approval: '승인 대기', process: '지급 완료', joinCount: 2345, paid: 100, total: 100, editor: '홍길동(P123456)', editedAt: '2026.10.14 14:05' },
  { no: 23, promoId: 'ENV123453', promoType: '이벤트 > 참여·리워드형', promoName: '신규 가입 고객 이벤트', promoStatus: '진행 중', joinPeriod: '2026.05.05 ~ 2026.05.19', approval: '반려', process: '진행 중', joinCount: 734, paid: 10, total: 500, editor: '홍길동(P123456)', editedAt: '2026.10.13 18:10' },
  { no: 22, promoId: 'ENV123452', promoType: '이벤트 > 참여·리워드형', promoName: '캠퍼싱 참여 액션', promoStatus: '완료', joinPeriod: '2026.05.05 ~ 2026.05.19', approval: '승인 완료', process: '진행 중', joinCount: 1552, paid: 800, total: '전체', editor: '홍길동(P123456)', editedAt: '2026.10.13 15:30' },
  { no: 21, promoId: 'ENV123451', promoType: '이벤트 > 참여·리워드형', promoName: '주말 응모 추첨 이벤트', promoStatus: '진행 중', joinPeriod: '2026.05.05 ~ 2026.05.19', approval: '승인 완료', process: '진행 중', joinCount: 887, paid: 90, total: 850, editor: '홍길동(P123456)', editedAt: '2026.10.12 11:25' },
  { no: 20, promoId: 'ENV123450', promoType: '이벤트 > 추천형', promoName: '고객 감사 절반 프로모션', promoStatus: '완료', joinPeriod: '2026.04.05 ~ 2026.04.19', approval: '승인 완료', process: '진행 중', joinCount: 1934, paid: 70, total: 350, editor: '홍길동(P123456)', editedAt: '2026.10.11 16:40' },
  { no: 19, promoId: 'ENV123449', promoType: '이벤트 > 추천형', promoName: '제휴 서비스 체험 이벤트', promoStatus: '즉시 종료', joinPeriod: '2026.03.05 ~ 2026.05.19', approval: '반려', process: '진행 중', joinCount: 648, paid: 800, total: '전체', editor: '홍길동(P123456)', editedAt: '2026.10.10 13:15' },
  { no: 18, promoId: 'ENV123448', promoType: '이벤트 > 참여·리워드형', promoName: '장기 고객 7월 혜택 프로모션', promoStatus: '완료', joinPeriod: '2026.02.05 ~ 2026.02.10', approval: '승인 완료', process: '지급 완료', joinCount: 1208, paid: 800, total: 800, editor: '홍길동(P123456)', editedAt: '2026.10.09 10:50' },
  { no: 17, promoId: 'ENV123447', promoType: '이벤트 > 추천형', promoName: '월간 참여 추첨 이벤트', promoStatus: '기간 종료', joinPeriod: '2026.02.01 ~ 2026.11.01', approval: '승인 대기', process: '지급 완료', joinCount: 775, paid: 700, total: 700, editor: '홍길동(P123456)', editedAt: '2026.10.08 17:05' },
];

export const WINNER_TOTAL = 639; // 전체 건수(Figma)
