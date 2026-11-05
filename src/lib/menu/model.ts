// 메뉴 관리(전체메뉴) 모델 — FO '전체메뉴'(마이/혜택/상품/고객지원 분류 → 페이지 그룹 → 페이지)를 운영자가
//  노출·순서·분류 이동으로 편성하고 승인 요청하는 어드민. SB: BO-AIM-DSP-PG529(편집)·PG530(조회)·PG531(이력).
//  백엔드 모델 미연동 — 프로토타입 mock(세션 메모리). 저장/승인은 데모.

export type MenuPage = {
  id: string;
  name: string; // 운영자가 GNB에 노출할 페이지명
  originName: string; // 원본 페이지명(전체 페이지 관리)
  pageId: string; // PG000111
  url: string;
  foVisible: boolean; // FO 노출 여부(Y/N)
  blocked?: boolean; // 서비스 차단(노출 설정 불가)
};

export type PageGroup = {
  id: string;
  name: string; // 데이터·통화 / 요금 ...
  visible: boolean; // 페이지 그룹 노출(Toggle)
  pages: MenuPage[];
};

export type MenuCategory = {
  id: string;
  name: string; // 마이 / 혜택 / 상품 / 고객지원
  visible: boolean; // 메뉴 분류 노출(Toggle)
  groups: PageGroup[];
};

// 노출 판정 — 서비스 차단이 아니고, 페이지·상위 그룹·분류가 모두 켜져 있을 때만 FO 노출.
export function isPageExposed(cat: MenuCategory, grp: PageGroup, pg: MenuPage): boolean {
  return !pg.blocked && pg.foVisible && grp.visible && cat.visible;
}
// 페이지 그룹 노출 판정 — 그룹 노출이 켜져 있고 노출 가능한 페이지가 1건 이상.
export function isGroupExposed(cat: MenuCategory, grp: PageGroup): boolean {
  return grp.visible && cat.visible && grp.pages.some((p) => !p.blocked && p.foVisible);
}

let seq = 100;
const PG = (o: Partial<MenuPage> & { name: string }): MenuPage => ({
  id: `p${++seq}`,
  originName: o.name,
  pageId: `PG${String(100 + seq).padStart(6, '0')}`,
  url: o.url ?? `/my/${seq}`,
  foVisible: o.foVisible ?? true,
  blocked: o.blocked,
  ...o,
});

// FO 전체메뉴 샘플 — 사용자 제공 전체메뉴 화면 기준(마이: 데이터·통화/요금, 혜택·상품·고객지원).
export function seedCategories(): MenuCategory[] {
  seq = 100;
  return [
    {
      id: 'c-my', name: '마이', visible: true,
      groups: [
        { id: 'g-data', name: '데이터·통화', visible: true, pages: [
          PG({ name: '나의 데이터/통화', url: '/mydata', foVisible: true }),
          PG({ name: '실시간 잔여량', url: '/myremain', foVisible: true }),
          PG({ name: 'T끼리 데이터 선물', url: '/mydata/gift', foVisible: true }),
          PG({ name: '리필 쿠폰', url: '/refill', foVisible: true }),
          PG({ name: '최근 충전/선물 내역', url: '/charge/history', foVisible: true }),
        ] },
        { id: 'g-bill', name: '요금', visible: true, pages: [
          PG({ name: '나의 요금', url: '/bill', foVisible: true }),
          PG({ name: '요금 안내서', url: '/bill/guide', foVisible: true }),
          PG({ name: '실시간 이용요금', url: '/bill/realtime', foVisible: true }),
          PG({ name: '납부 방법', url: '/bill/pay', foVisible: true }),
          PG({ name: '휴대폰 결제/콘텐츠 이용료', url: '/bill/content', foVisible: true }),
          PG({ name: '요금납부내역 조회/발급', url: '/bill/receipt', foVisible: true }),
          PG({ name: '요금제 추천', url: '/plan/reco', foVisible: false, blocked: true }),
        ] },
      ],
    },
    {
      id: 'c-benefit', name: '혜택', visible: true,
      groups: [
        { id: 'g-mem', name: '멤버십·이벤트', visible: true, pages: [
          PG({ name: '멤버십 홈', url: '/membership' }), PG({ name: 'VIP Pick', url: '/vip' }),
          PG({ name: '0 Week', url: '/0week' }), PG({ name: '이벤트', url: '/event' }),
          PG({ name: '제휴 혜택', url: '/partner' }), PG({ name: 'T DAY', url: '/tday' }),
        ] },
        { id: 'g-point', name: '할인·포인트', visible: true, pages: [
          PG({ name: '포인트 조회', url: '/point' }), PG({ name: '할인 혜택', url: '/discount' }), PG({ name: '쿠폰함', url: '/coupon' }),
        ] },
      ],
    },
    {
      id: 'c-product', name: '상품', visible: true,
      groups: [
        { id: 'g-roam', name: '로밍·쇼핑', visible: true, pages: [
          PG({ name: '로밍', url: '/roaming' }), PG({ name: '쇼핑', url: '/shop' }),
        ] },
        { id: 'g-plan', name: '요금제', visible: true, pages: [
          PG({ name: '요금제 변경', url: '/plan/change' }), PG({ name: '부가서비스', url: '/addon' }),
        ] },
      ],
    },
    {
      id: 'c-support', name: '고객지원', visible: false,
      groups: [
        { id: 'g-ask', name: '문의하기', visible: true, pages: [
          PG({ name: '1:1 문의', url: '/ask' }), PG({ name: '챗봇 상담', url: '/chatbot' }),
        ] },
        { id: 'g-faq', name: '자주 묻는 질문', visible: true, pages: [
          PG({ name: 'FAQ', url: '/faq' }),
        ] },
      ],
    },
  ];
}

export function catPageCount(c: MenuCategory): number {
  return c.groups.reduce((n, g) => n + g.pages.length, 0);
}

// 변경/승인 이력(PG531)
export type ApprovalStatus = '승인대기' | '저장' | '승인완료' | '반려' | '요청취소';
export type MenuHistory = {
  no: number; status: ApprovalStatus; version?: string;
  requester: string; requestedAt: string; reason: string;
  approver: string; processedAt: string; processReason: string;
};

export const HISTORY: MenuHistory[] = [
  { no: 9, status: '승인대기', requester: '김지훈 (SSP2332)', requestedAt: '2026.07.28 11:24:11', reason: '연말 프로모션 기간 혜택 메뉴 1순위 노출', approver: '정지출(SSP12344)', processedAt: '-', processReason: '' },
  { no: 8, status: '요청취소', requester: '-', requestedAt: '-', reason: 'Shop 하위 기획전 메뉴 추가 준비', approver: '-', processedAt: '-', processReason: '' },
  { no: 7, status: '승인완료', version: 'V.2', requester: '김지훈 (SSP2332)', requestedAt: '2026.07.25 10:10:06', reason: 'MY 메뉴 연결 화면을 개편 화면으로 교체', approver: '정지출(SSP12344)', processedAt: '2026.07.25 10:10:06', processReason: '연결 화면 확인했습니다' },
  { no: 6, status: '반려', requester: '김지훈 (SSP2332)', requestedAt: '2026.07.25 10:10:06', reason: 'Shop 하위 기획전 메뉴 신규 노출', approver: '정지출(SSP12344)', processedAt: '2026.07.25 10:10:06', processReason: '연결된 기획전 화면이 미승인 상태입니다' },
  { no: 5, status: '반려', requester: '김지훈 (SSP2332)', requestedAt: '2026.07.23 15:22:03', reason: '혜택 메뉴명을 혜택/이벤트로 변경', approver: '정지출(SSP12344)', processedAt: '2026.07.23 15:22:03', processReason: '메뉴명과 연결 화면 내용이 맞지 않습니다' },
  { no: 4, status: '승인완료', version: 'V.1', requester: '김지훈 (SSP2332)', requestedAt: '2026.07.22 10:21:04', reason: 'MY 메뉴를 로그인 고객에게만 노출', approver: '정지출(SSP12344)', processedAt: '2026.07.22 10:21:04', processReason: '-' },
  { no: 3, status: '요청취소', requester: '김지훈 (SSP2332)', requestedAt: '2026.06.30 08:30:08', reason: '혜택 하위 메뉴 노출 순서 조정', approver: '정지출(SSP12344)', processedAt: '2026.06.30 08:30:08', processReason: '노출 순서 재검토 후 다시 요청하겠습니다' },
  { no: 2, status: '반려', requester: '김지훈 (SSP2332)', requestedAt: '2026.06.30 08:30:08', reason: '종료된 이벤트 메뉴 미사용 전환', approver: '정지출(SSP12344)', processedAt: '2026.06.30 08:30:08', processReason: '' },
  { no: 1, status: '요청취소', requester: '김지훈 (SSP2332)', requestedAt: '2026.06.30 08:30:08', reason: '', approver: '정지출(SSP12344)', processedAt: '2026.06.30 08:30:08', processReason: '' },
];

// 현재 반영 정보(조회 화면 상단)
export const REFLECTED = {
  status: '승인완료' as ApprovalStatus,
  requester: '김지훈 (PDFDS23243)',
  approver: '신지출 (PSDGQ34217)',
  processedAt: '2026.08.25 14:10:47',
};
