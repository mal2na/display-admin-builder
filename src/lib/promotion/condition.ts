// 조건 관리 > 조건 항목 관리 — SB Figma(BO-AIM-EVTMSN, node 24458-33900) 기반 모델. 데모 샘플.
//  조건 항목(프로모션 접근·참여·지급 조건에 쓰는 항목)을 조회하는 목록. 행 클릭→상세, [등록]→등록 화면(추후).

export type ConditionCategory = '고객 기본' | '멤버십' | '혜택' | '상품';

export type ConditionRow = {
  no: number;
  id: string;            // CI001
  category: ConditionCategory;
  name: string;          // 조건 항목명
  inputVars: string;     // 입력 변수 (2개 이상이면 'xxx 외 N 건')
  returnVal: string;     // 반환값
  use: boolean;          // 사용 여부
  memberOnly: boolean;   // 회원 전용 여부
  editor: string;        // 등록자
  createdAt: string;     // 등록 일시
  modifier: string;      // 최종 수정자
  modifiedAt: string;    // 최종 수정 일시
};

export const COND_CATEGORIES: ('전체' | ConditionCategory)[] = ['전체', '고객 기본', '멤버십', '혜택', '상품'];
export const COND_PERIOD_FIELDS = ['등록일', '최종 수정일'] as const;
export const COND_SEARCH_FIELDS = ['조건 항목 ID', '조건 항목명', '등록자', '최종 수정자'] as const;

export const CONDITION_ROWS: ConditionRow[] = [
  { no: 23, id: 'CI001', category: '고객 기본', name: '고객 만 나이 조회', inputVars: '고객 CI 외 1건', returnVal: '만 나이', use: true, memberOnly: true, editor: '홍길동(P123465)', createdAt: '2026.04.18 13:10', modifier: '홍길동(P123465)', modifiedAt: '2026.04.18 13:10' },
  { no: 22, id: 'CI002', category: '고객 기본', name: '생년월일 조회', inputVars: '고객 CI', returnVal: '생년월일', use: true, memberOnly: true, editor: '홍길동(P123465)', createdAt: '2026.04.18 13:10', modifier: '홍길동(P123465)', modifiedAt: '2026.04.18 11:30' },
  { no: 21, id: 'CI003', category: '고객 기본', name: '성별 조회', inputVars: '고객 CI', returnVal: '성별', use: true, memberOnly: true, editor: '홍길동(P123465)', createdAt: '2026.04.18 13:10', modifier: '홍길동(P123465)', modifiedAt: '2026.04.17 16:20' },
  { no: 20, id: 'CI004', category: '고객 기본', name: '고객 유형 조회', inputVars: '고객 CI', returnVal: '고객 유형', use: true, memberOnly: true, editor: '홍길동(P123465)', createdAt: '2026.04.18 13:10', modifier: '홍길동(P123465)', modifiedAt: '2026.04.16 14:05' },
  { no: 19, id: 'CI005', category: '멤버십', name: '고객 상태 조회', inputVars: '조회 기준 시점의 1건', returnVal: '고객 상태', use: true, memberOnly: true, editor: '홍길동(P123465)', createdAt: '2026.04.18 13:10', modifier: '홍길동(P123465)', modifiedAt: '2026.04.16 10:25' },
  { no: 18, id: 'CI006', category: '멤버십', name: 'T 멤버십 회원 여부 조회', inputVars: '고객 CI 외 1건', returnVal: '회원 여부', use: true, memberOnly: true, editor: '홍길동(P123465)', createdAt: '2026.04.18 13:10', modifier: '홍길동(P123465)', modifiedAt: '2026.04.15 17:45' },
  { no: 17, id: 'CI007', category: '멤버십', name: '멤버십 등급 조회', inputVars: '멤버십 번호 외 3건', returnVal: '등급', use: true, memberOnly: true, editor: '홍길동(P123465)', createdAt: '2026.04.18 13:10', modifier: '홍길동(P123465)', modifiedAt: '2026.04.15 12:15' },
  { no: 16, id: 'CI008', category: '혜택', name: '멤버십 혜택 유형 조회', inputVars: '멤버십 카드 번호', returnVal: '혜택 유형', use: true, memberOnly: true, editor: '홍길동(P123465)', createdAt: '2026.04.18 13:10', modifier: '홍길동(P123465)', modifiedAt: '2026.04.15 12:15' },
  { no: 15, id: 'CI009', category: '상품', name: '보유 회선 조회', inputVars: '고객 CI 외 1건', returnVal: '보유 회선', use: true, memberOnly: true, editor: '홍길동(P123465)', createdAt: '2026.04.18 13:10', modifier: '홍길동(P123465)', modifiedAt: '2026.04.15 12:15' },
  { no: 14, id: 'CI010', category: '상품', name: '회선 상태', inputVars: '서비스 관리 번호 외 1건', returnVal: '상태', use: true, memberOnly: true, editor: '홍길동(P123465)', createdAt: '2026.04.18 13:10', modifier: '홍길동(P123465)', modifiedAt: '2026.04.15 12:15' },
];

export const CONDITION_TOTAL = 23;
