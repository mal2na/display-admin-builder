/**
 * 전체페이지 관리 — 도메인 모델 (public/page-menu-b.html 프로토타입의 React 이식본).
 *
 * 프로토타입과 동일하게 **모듈 수준의 가변 스토어**를 쓴다.
 *  · 페이지 트리는 부모/자식이 서로를 참조하고, 경로 이동 한 번이 하위 전체의 메뉴 플래그를
 *    바꾸는 구조라 불변 업데이트로 바꾸면 규칙이 흩어진다. 규칙을 그대로 옮기는 쪽을 택했다.
 *  · 화면 쪽은 변경 후 `bump()` 를 호출해 다시 그린다 (page-menu-admin.tsx).
 * 서버 저장은 아직 없다 — 목업과 같은 세션 메모리 데이터다.
 */

export const MENU_MAX = 3;

export const CH: [string, string][] = [['pcweb', 'PC웹'], ['mweb', '모바일웹'], ['aos', 'Android앱'], ['ios', 'iOS앱']];
export const BIZ: [string, string][] = [
  ['join', '가입/신청'], ['change', '변경(UKEY처리)'], ['cancel', '해지(UKEY처리)'], ['view', '조회(UKEY/CDRS)'],
  ['guide', '안내'], ['special', '채널특화'], ['none', '해당사항없음(메인/서브메인)'], ['etc', '기타'],
];
export const NAV: [string, string][] = [['show', '노출'], ['eng', 'Eng.ver']];
export const LINES: [string, string][] = [
  ['all', '전체'], ['A', '통화내역(A)'], ['B', '모바일(B)'], ['C', 'T월드 법인실사용자(C)'], ['D', 'SKT법인(D)'],
  ['E', '법인실사용자_비회선(E)'], ['P', 'PPS(P)'], ['S', '유선서비스 인터넷/IPTV/집전화(S)'], ['N', '준회원(회선없음N)'],
];
export const AUTHS = ['비로그인', '로그인', '간편로그인'];
export const ATTR_LABEL: Record<string, string> = { html: 'HTML', node: 'NODE_HTML', native: 'Native', bp: 'BP/외부' };
export const FORMS = ['Action Sheet', 'Page', 'Popup', 'Tab', 'Iframe'];
export const PTYPE: Record<string, string> = { dev: '개발 화면', builder: '전시 컨테이너' };
export const PROC: [string, string][] = [
  ['', '선택'], ['join', '가입'], ['change', '변경'], ['cancel', '해지'], ['view', '조회'], ['etc', '기타'],
];
export const CVM_REASON: Record<string, string> = {
  'CVM-2026-0412': 'RS0412 · 데이터 한도 안내',
  'CVM-2026-0090': 'RS0090 · 멤버십 혜택 안내',
  'CVM-2026-0311': 'RS0311 · 요금제 변경 유도',
};
/** 마스킹 코드 사전 — [코드, 이름, 등급, 인증 전, 인증 후] */
export const MK: Record<string, [string, string, string, string, string]> = {
  phone: ['MK-PHONE', '휴대폰번호', '2등급', '010-****-1234', '010-2345-1234'],
  name: ['MK-NAME', '고객명', '1등급', '김*윤', '김혜윤'],
  birth: ['MK-BIRTH', '생년월일', '2등급', '1990.**.**', '1990.03.15'],
  addr: ['MK-ADDR', '주소', '2등급', '서울시 중구 ****', '서울시 중구 을지로 65'],
  email: ['MK-EMAIL', '이메일', '3등급', 'hy***@sk.com', 'hyeyoon.kim@sk.com'],
  card: ['MK-CARD', '카드번호', '1등급', '9410-****-****-1234', '9410-1234-5678-1234'],
  acct: ['MK-ACCT', '계좌번호', '1등급', '110-***-****56', '110-123-456756'],
  imei: ['MK-IMEI', '단말 IMEI', '3등급', '35-209900-****-12', '35-209900-176148-12'],
  usim: ['MK-USIM', 'USIM 일련번호', '3등급', '8982****1234', '898205161234'],
};

export type Bff = {
  kind: string; id: string; api: string; url: string; scope: string;
  mg: string; md: string; mo: string; ag: string; ad: string; ao: string;
};
export const BFF_SAMPLE: Bff[] = [
  { kind: '조회', id: 'BFF-MY-0012', api: '요금 조회', url: '/bff/my/fee', scope: '회선', mg: '본인인증', md: 'PASS', mo: 'SMS 대체', ag: '간편인증', ad: '생체인증', ao: 'PIN 대체' },
  { kind: '변경', id: 'BFF-MY-0031', api: '요금제 변경', url: '/bff/my/plan/change', scope: '명의', mg: '본인인증', md: 'PASS', mo: '—', ag: '본인인증', ad: 'PASS', ao: '—' },
  { kind: '조회', id: 'BFF-BEN-0007', api: '혜택 내역 조회', url: '/bff/benefit/history', scope: '회선', mg: '로그인', md: '—', mo: '—', ag: '로그인', ad: '—', ao: '—' },
];

export type DevSetting = { proc: string; both: boolean; wjob: string; mjob: string; ajob: string; guide: string; bff: Bff[] };
export type Block = { from: string; to: string; reason: string };

export type Page = {
  id: string;
  name: string;
  ptype: string;        // dev | builder
  ct: string;           // 컨테이너 ID (전시 컨테이너만)
  ctState: string;
  url: string;
  fixed: boolean;       // URL 확정 여부
  use: boolean;
  channels: string[];
  search: boolean;
  form: string;
  attr: string;
  remark: string;
  auths: string[];
  share: boolean;
  biz: string[];
  popCh: string[];
  nav: string[];
  lines: string[];
  cvm: string;
  reason: string;
  tooltips: string[];
  cs: string[];
  shortUrls: string[];
  maskOn: boolean;
  maskWay: string;
  maskAuth: string;
  maskItems?: string[];
  tagUse: boolean;
  tags: string[];
  keywords: string;
  ogTitle: string;
  ogDesc: string;
  menuOn: boolean;
  inMenu: boolean;
  morder: number;
  icon: string | null;
  alt: string;
  rejected: boolean;
  state: string;        // draft | pending | live
  live: Partial<Page> | null;
  order: number;
  parent: string | null;
  created: string;
  updated: string;
  liveAt?: string;
  editor?: string;
  dropped?: boolean;
  block?: Block;
  dev?: DevSetting;
  /** 폼 전용 임시 플래그 */
  nourl?: boolean;
  _sub?: boolean;
};

export function P(o: Partial<Page>): Page {
  return Object.assign({
    ptype: 'dev', ct: '', ctState: '', url: '', fixed: false, use: true,
    channels: ['pcweb', 'mweb', 'aos', 'ios'], search: false, form: 'Page', attr: 'html',
    remark: '', auths: ['비로그인', '로그인', '간편로그인'], share: false, biz: ['none'], popCh: [], nav: [],
    lines: ['all'], cvm: '', reason: '', tooltips: [], cs: [], shortUrls: [],
    maskOn: false, maskWay: '', maskAuth: '', tagUse: false, tags: [], keywords: '', ogTitle: '', ogDesc: '',
    menuOn: false, inMenu: false, morder: 0, icon: null, alt: '', rejected: false, state: 'draft',
    live: null, order: 0, parent: null, created: '2026.01.04', updated: '2026.04.01 09:00',
    id: '', name: '',
  }, o) as Page;
}

/* ── 스토어 ─────────────────────────────────────────────────────────── */
type Store = { pages: Page[]; seq: number; ctSeq: number };
export const store: Store = { pages: [], seq: 300, ctSeq: 110 };

function seed(): Page[] {
  const pages: Page[] = [
    P({ id: 'PG000100', menuOn: true, name: 'MY', order: 0, created: '2026.01.14' }),
    P({ id: 'PG000110', menuOn: true, name: '나의 데이터/통화', parent: 'PG000100', order: 0, created: '2026.01.13' }),
    P({ id: 'PG000111', name: 'T 가족모아 데이터', parent: 'PG000110', url: '/myt-data/familydata/limit', fixed: true, order: 0, menuOn: true, updated: '2026.04.15 17:45' }),
    P({ id: 'PG000112', name: '이용한도 설정', parent: 'PG000110', url: '/myt-data/limit', fixed: true, order: 1, menuOn: true, updated: '2026.04.14 15:20', share: true, biz: ['change', 'view'], popCh: ['aos', 'ios'], nav: ['show'], lines: ['A', 'B'], cvm: 'CVM-2026-0412', reason: 'RS0412 · 데이터 한도 안내', tooltips: ['TT-00213', 'TT-00214'], cs: ['CS-4410'], shortUrls: ['SU-00871'], maskOn: true, maskWay: '휴대폰 인증', maskAuth: 'PASS', tagUse: true, tags: ['데이터', '이용한도', '한도설정', '가족모아'], keywords: '이용한도, 데이터 한도, 가족모아', ogTitle: '이용한도 설정 | T world', ogDesc: 'T 가족모아 데이터 이용한도를 설정합니다.' }),
    P({ id: 'PG000120', updated: '2026.10.05 18:20', name: '요금제 추천', parent: 'PG000100', url: '/my/plan/recommend', fixed: true, order: 1, menuOn: true }),
    P({ id: 'PG000130', menuOn: true, name: '이용 안내', parent: 'PG000100', order: 2 }),
    P({ id: 'PG000131', name: '상담하기', parent: 'PG000130', url: '/my/guide/consult', fixed: true, order: 0, menuOn: true }),
    P({ id: 'PG000132', name: '공지 사항', parent: 'PG000130', url: '/notice/list', fixed: true, order: 1, menuOn: true }),
    P({ id: 'PG000200', menuOn: true, name: '상품서비스', order: 1, created: '2026.01.13' }),
    P({ id: 'PG000210', menuOn: true, name: '요금제 추천', parent: 'PG000200', order: 0 }),
    P({ id: 'PG000211', name: '상세', parent: 'PG000210', url: '/product/list/detail', fixed: true, order: 0, menuOn: true }),
    P({ id: 'PG000220', name: '로밍', parent: 'PG000200', url: '/product/roaming', fixed: false, order: 1, state: 'draft' }),
    P({ id: 'PG000230', ptype: 'builder', ct: 'CT-00105', name: '쇼핑 홈', parent: 'PG000200', url: '/shop/home', fixed: true, order: 2, menuOn: false, created: '2026.10.02', updated: '2026.10.05 14:10' }),
    P({ id: 'PG000300', menuOn: true, name: '혜택', order: 2, created: '2026.01.10' }),
    P({ id: 'PG000310', ptype: 'builder', ct: 'CT-00031', name: 'T 멤버십', parent: 'PG000300', url: '/benefit/membership', fixed: true, order: 0, menuOn: true, share: true, biz: ['guide'], nav: ['show', 'eng'], cvm: 'CVM-2026-0090', reason: 'RS0090 · 멤버십 혜택 안내', tagUse: true, tags: ['멤버십', 'T멤버십', '혜택'], keywords: 'T 멤버십, 멤버십 혜택', ogTitle: 'T 멤버십 | T world' }),
    P({ id: 'PG000320', menuOn: true, name: '혜택', parent: 'PG000300', order: 1, created: '2026.01.08' }),
    P({ id: 'PG000305', ptype: 'builder', ct: 'CT-00108', name: '혜택 홈', parent: 'PG000300', url: '/benefit/home', fixed: true, order: 2, menuOn: false, created: '2026.10.05', updated: '2026.10.06 09:10' }),
    P({ id: 'PG000321', name: '나의 혜택/할인', parent: 'PG000320', url: '/my/benefits', fixed: true, order: 0, menuOn: true }),
    P({ id: 'PG000322', name: '레인보우 포인트', parent: 'PG000321', url: '/my/benefits/rainbow', fixed: true, order: 0 }),
    P({ id: 'PG000323', ptype: 'builder', ct: 'CT-00027', name: '전체 혜택', parent: 'PG000320', url: '/benefit/all', fixed: true, order: 1, menuOn: true }),
    P({ id: 'PG000324', name: 'T 장기고객 프로그램', parent: 'PG000320', url: '/my/benefits/loyal', fixed: true, order: 2, menuOn: true, channels: ['mweb'] }),
    P({ id: 'PG000400', menuOn: true, name: '고객지원', order: 3 }),
    P({ id: 'PG000410', menuOn: true, name: '자주 묻는 질문', parent: 'PG000400', order: 0 }),
    P({ id: 'PG000411', updated: '2026.10.06 08:50', name: '요금 FAQ', parent: 'PG000410', url: '/support/faq/fee', fixed: true, order: 0, menuOn: true }),
    P({ id: 'PG000412', name: '청구서 보는 법', parent: 'PG000411', url: '/support/faq/fee/bill', fixed: true, order: 0 }),
    P({ id: 'PG000413', name: '결합 FAQ', parent: 'PG000410', url: '/support/faq/combine', fixed: true, order: 1, menuOn: true }),
    P({ id: 'PG000420', attr: 'bp', name: '1:1 문의', parent: 'PG000400', url: '/support/inquiry', fixed: true, order: 1, menuOn: true }),
    P({ id: 'PG000430', name: '환경설정', parent: 'PG000400', url: '/setting', fixed: false, order: 2, state: 'draft' }),
    P({ id: 'PG000500', name: '이벤트', url: '/event/list', fixed: true, order: 4, use: false }),
    P({ id: 'PG000510', ptype: 'builder', ct: 'CT-00109', name: '가을 이벤트', url: '/event/autumn', fixed: false, order: 5, state: 'draft', created: '2026.10.06', updated: '2026.10.06 10:20' }),
  ];
  return pages;
}

const SNAP_SKIP = ['live', 'state', 'dropped', 'rejected', 'ct', 'ctState', 'block', 'liveAt', 'editor', 'dev', 'nourl', '_sub'];
export function snap(p: Page): Partial<Page> {
  const o: Record<string, unknown> = {};
  Object.keys(p).forEach((k) => { if (!SNAP_SKIP.includes(k)) o[k] = (p as Record<string, unknown>)[k]; });
  return JSON.parse(JSON.stringify(o)) as Partial<Page>;
}

function init() {
  store.pages = seed();
  store.seq = 300;
  store.ctSeq = 110;
  store.pages.forEach((p) => {
    p.morder = p.order; p.inMenu = p.menuOn;
    if (!p.parent) { p.icon = `icon_${p.id.slice(-3)}.png`; p.alt = `${p.name} 아이콘`; }
  });
  // 메뉴 미등록 예시: 이용한도 설정 · 결합 FAQ(등록 후보), T 장기고객 프로그램은 등록됐지만 미노출
  ['PG000112', 'PG000413'].forEach((id) => { const p = byId(id); p.inMenu = false; p.menuOn = false; });
  byId('PG000324').menuOn = false;

  const patches: [string, Partial<Page>][] = [
    ['PG000111', { cvm: 'CVM-2026-0311', reason: 'RS0311 · 요금제 변경 유도', tooltips: ['TT-00101', 'TT-00102', 'TT-00109'], cs: ['CS-4401', 'CS-4402'], shortUrls: ['SU-00410'], maskOn: true, maskWay: '휴대폰 인증', maskAuth: 'PASS', maskItems: ['phone', 'name', 'birth'] }],
    ['PG000112', { tooltips: ['TT-00213', 'TT-00214', 'TT-00215'], cs: ['CS-4410', 'CS-4411'], shortUrls: ['SU-00871', 'SU-00872'], maskItems: ['phone', 'name', 'usim', 'imei'] }],
    ['PG000120', { cvm: 'CVM-2026-0412', reason: 'RS0412 · 데이터 한도 안내', tooltips: ['TT-00120'], cs: ['CS-3120', 'CS-3121', 'CS-3125'], shortUrls: ['SU-00501', 'SU-00502', 'SU-00503'] }],
    ['PG000131', { tooltips: ['TT-00131'], cs: ['CS-1001', 'CS-1002', 'CS-1003', 'CS-1004'], shortUrls: ['SU-00131'], maskOn: true, maskWay: '간편 인증', maskAuth: '생체인증 · PIN', maskItems: ['name', 'phone', 'email', 'addr'] }],
    ['PG000211', { cvm: 'CVM-2026-0215', reason: 'RS0215 · 신규 요금제 안내', tooltips: ['TT-00211', 'TT-00212'], shortUrls: ['SU-00211'] }],
    ['PG000230', { cvm: 'CVM-2026-0230', reason: 'RS0230 · 쇼핑 기획전 안내', tooltips: ['TT-00230'], shortUrls: ['SU-00230', 'SU-00231'] }],
    ['PG000305', { tooltips: ['TT-00305', 'TT-00306'], cs: ['CS-5305'], shortUrls: ['SU-00305'] }],
    ['PG000310', { tooltips: ['TT-00310', 'TT-00311', 'TT-00312'], cs: ['CS-5310'], shortUrls: ['SU-00310', 'SU-00311'], maskOn: true, maskWay: '휴대폰 인증', maskAuth: 'PASS · SMS', maskItems: ['name', 'phone', 'birth'] }],
    ['PG000321', { cvm: 'CVM-2026-0321', reason: 'RS0321 · 할인 혜택 만료 안내', tooltips: ['TT-00321'], cs: ['CS-5321', 'CS-5322'], maskOn: true, maskWay: '휴대폰 인증', maskAuth: 'PASS', maskItems: ['name', 'phone', 'card', 'acct'] }],
    ['PG000322', { tooltips: ['TT-00322'], shortUrls: ['SU-00322'] }],
    ['PG000411', { tooltips: ['TT-00411', 'TT-00412'], cs: ['CS-6411', 'CS-6412', 'CS-6413'], shortUrls: ['SU-00411'] }],
    ['PG000412', { cs: ['CS-6420'], shortUrls: ['SU-00420'], maskOn: true, maskWay: '본인 인증', maskAuth: '공동인증서 · PASS', maskItems: ['name', 'addr', 'acct', 'card'] }],
    ['PG000420', { cvm: 'CVM-2026-0420', reason: 'RS0420 · 상담 예약 안내', tooltips: ['TT-00420'], cs: ['CS-7001', 'CS-7002', 'CS-7003'], shortUrls: ['SU-00701'], maskOn: true, maskWay: '휴대폰 인증', maskAuth: 'PASS', maskItems: ['name', 'phone', 'email', 'birth', 'addr'] }],
    // 목록 첫 페이지(최근 수정 10건)는 연결 정보 · 마스킹 정보를 모두 채운다
    ['PG000510', { cvm: 'CVM-2026-0510', reason: 'RS0510 · 가을 이벤트 참여 안내', tooltips: ['TT-00510', 'TT-00511'], cs: ['CS-8510'], shortUrls: ['SU-00510', 'SU-00511'], maskOn: true, maskWay: '휴대폰 인증', maskAuth: 'PASS', maskItems: ['name', 'phone', 'email'] }],
    ['PG000305', { cvm: 'CVM-2026-0305', reason: 'RS0305 · 혜택 홈 개인화 추천', maskOn: true, maskWay: '간편 인증', maskAuth: '생체인증 · PIN', maskItems: ['name', 'phone', 'card'] }],
    ['PG000411', { cvm: 'CVM-2026-0411', reason: 'RS0411 · 요금 문의 유입 안내', maskOn: true, maskWay: '휴대폰 인증', maskAuth: 'PASS', maskItems: ['name', 'phone', 'acct'] }],
    ['PG000120', { maskOn: true, maskWay: '휴대폰 인증', maskAuth: 'PASS · SMS', maskItems: ['name', 'phone', 'birth', 'usim'] }],
    ['PG000230', { cs: ['CS-2230', 'CS-2231'], maskOn: true, maskWay: '본인 인증', maskAuth: '공동인증서 · PASS', maskItems: ['name', 'addr', 'phone', 'card'] }],
    ['PG000500', { cvm: 'CVM-2026-0500', reason: 'RS0500 · 이벤트 목록 재방문 유도', tooltips: ['TT-00500'], cs: ['CS-8500', 'CS-8501'], shortUrls: ['SU-00500'], maskOn: true, maskWay: '휴대폰 인증', maskAuth: 'PASS', maskItems: ['name', 'phone'] }],
    ['PG000430', { cvm: 'CVM-2026-0430', reason: 'RS0430 · 알림 설정 안내', tooltips: ['TT-00430', 'TT-00431'], cs: ['CS-6430'], shortUrls: ['SU-00430'], maskOn: true, maskWay: '간편 인증', maskAuth: 'PIN', maskItems: ['name', 'email', 'phone', 'imei'] }],
  ];
  patches.forEach(([id, patch]) => Object.assign(byId(id), patch));

  store.pages.forEach((p) => { if (noUrl(p) || p.fixed) { p.live = snap(p); p.state = 'live'; p.liveAt = p.updated; } });

  /* 서비스 차단 예시 (설정된 기간 동안 접근 차단 · 기간 종료 시 자동 해제)
     · 요금제 추천: 이 페이지 하나만 차단
     · 자주 묻는 질문: 상위를 차단 → 요금 FAQ · 청구서 보는 법 · 결합 FAQ도 함께 차단 */
  byId('PG000120').block = { from: '2026.10.05 00:00', to: '2026.10.12 23:59', reason: '요금제 개편 반영 작업' };
  byId('PG000410').block = { from: '2026.10.06 09:00', to: '2026.10.08 18:00', reason: 'FAQ 콘텐츠 일괄 점검' };
  byId('PG000112').editor = '홍길동(P299999)';
}

/* ── 조회 ───────────────────────────────────────────────────────────── */
export function byId(id: string | null): Page { return store.pages.filter((p) => p.id === id)[0]; }
export function children(pid: string | null): Page[] {
  return store.pages.filter((p) => p.parent === pid).sort((a, b) => a.order - b.order);
}
export function descendants(pid: string): Page[] {
  let out: Page[] = [];
  children(pid).forEach((c) => { out.push(c); out = out.concat(descendants(c.id)); });
  return out;
}
export function tree(pid: string | null): Page[] {
  let out: Page[] = [];
  children(pid).forEach((c) => { out.push(c); out = out.concat(tree(c.id)); });
  return out;
}
export function depth(p: Page): number { let d = 1, n: Page | null = p; while (n?.parent) { n = byId(n.parent); d += 1; } return d; }
export function crumb(p: Page): string { const a: string[] = []; let n: Page | null = p; while (n) { a.unshift(n.name); n = n.parent ? byId(n.parent) : null; } return a.join(' > '); }
export function revCrumb(p: Partial<Page>): string {
  const a: string[] = []; let n: Partial<Page> | null = p;
  while (n) { a.push(n.name ?? ''); n = n.parent ? byId(n.parent) : null; }
  return a.join(' < ');
}
export function noUrl(p: Page): boolean { return !p.url; }
export function parentCrumb(p: Page): string { return p.parent ? crumb(byId(p.parent)) : '—'; }
export function labelsOf(defs: [string, string][], keys: string[]): string[] {
  return defs.filter((d) => keys.indexOf(d[0]) !== -1).map((d) => d[1]);
}
export function effUse(p: Page): boolean { let n: Page | null = p; while (n) { if (!n.use) return false; n = n.parent ? byId(n.parent) : null; } return true; }
export function isChanged(p: Page): boolean { return !p.live || JSON.stringify(snap(p)) !== JSON.stringify(p.live); }
export function movePending(p: Page): boolean { return !!(p.live && p.live.parent !== p.parent); }
export function moveAncestorPending(p: Page): Page | null {
  let n = p.parent ? byId(p.parent) : null;
  while (n) { if (movePending(n)) return n; n = n.parent ? byId(n.parent) : null; }
  return null;
}
export function sibInfo(p: Page) { const sb = children(p.parent); return { n: sb.length, i: sb.indexOf(p) }; }
export function posText(p: Page) { const si = sibInfo(p); return `D${depth(p)} · 같은 상위 ${si.n}개 중 ${si.i + 1}번째`; }
export function editorOf(p: Page) { return p.editor || '김혜윤(P217326)'; }

export type BlockInfo = { self: boolean; b: Block; src: Page };
export function blockInfo(p: Page): BlockInfo | null {
  if (p.block) return { self: true, b: p.block, src: p };
  let n = p.parent ? byId(p.parent) : null;
  while (n) { if (n.block) return { self: false, b: n.block, src: n }; n = n.parent ? byId(n.parent) : null; }
  return null;
}
export function blockText(p: Page) {
  const bi = blockInfo(p); if (!bi) return '';
  return `${bi.b.from} ~ ${bi.b.to}${bi.self ? ' · 이 페이지 차단' : ` · 상위 「${bi.src.name}」(${bi.src.id}) 차단으로 함께 차단`}${bi.b.reason ? ` · ${bi.b.reason}` : ''}`;
}

/** 상태 라벨 — 목록 필터 키와 1:1 */
export function stateKey(p: Page): 'rejected' | 'url' | 'pending' | 'temp' | 'live' {
  if (p.rejected) return 'rejected';
  if (!noUrl(p) && !p.fixed) return 'url';
  if (p.state === 'pending') return 'pending';
  if (p.state !== 'live' || isChanged(p)) return 'temp';
  return 'live';
}
export const STATE_LABEL: Record<string, string> = {
  rejected: '반려', url: 'URL 확정 대기', pending: '승인 대기', temp: '임시저장', live: '승인 완료',
};

/** FO 메뉴 노출 라벨 */
export function foLabel(p: Page): string {
  if (!p.inMenu) return '미등록';
  if (!effUse(p) || depth(p) > MENU_MAX || p.state !== 'live') return '미노출';
  if (movePending(p) || moveAncestorPending(p)) return '승인 대기';
  return p.menuOn ? '노출' : '미노출';
}

/* ── 변경 ───────────────────────────────────────────────────────────── */
export function now(): string {
  const d = new Date(); const z = (n: number) => (n < 10 ? '0' : '') + n;
  return `${d.getFullYear()}.${z(d.getMonth() + 1)}.${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`;
}
/** 수정 직후 공통 처리 — 승인 대기 중 수정이면 요청이 취소된다 */
export function afterEdit(p: Page): string | null {
  p.updated = now(); p.editor = '김혜윤(P217326)'; p.rejected = false;
  if (p.state === 'pending') { p.state = p.live ? 'live' : 'draft'; return '승인 대기 중 수정 — 승인 요청이 취소되었습니다'; }
  return null;
}
export function placeAt(p: Page, idx: number) {
  const sb = children(p.parent).filter((x) => x !== p);
  const i = Math.max(0, Math.min(idx, sb.length));
  const prev = sb[i - 1]; const next = sb[i];
  p.order = prev && next ? (prev.order + next.order) / 2 : prev ? prev.order + 1 : next ? next.order - 1 : 0;
}
export function mkPage(o: { name: string; parent: string | null; url?: string }): { ok: boolean; msg?: string; id?: string; p?: Page } {
  store.seq += 1;
  const p = P({ id: `PG000${store.seq}`, name: o.name, parent: o.parent || null, url: o.url || '', created: now().slice(0, 10), updated: now() });
  if (p.parent && !byId(p.parent).use) return { ok: false, msg: '사용안함 상태인 상위 페이지에는 하위를 추가할 수 없습니다' };
  p.order = children(p.parent).length;
  store.pages.push(p);
  return { ok: true, id: p.id, p };
}
/** 전시 컨테이너는 페이지 ID 생성 시 컨테이너 ID도 함께 생성 → 화면 빌더에 자동 추가 */
export function ensureCt(p: Page): boolean {
  if (p.ptype === 'builder' && !p.ct) { store.ctSeq += 1; p.ct = `CT-00${store.ctSeq}`; return true; }
  return false;
}

export type MoveImpact = { kin: Page[]; all: Page[]; out3: Page[]; shown: Page[]; keep: Page[]; lost: Page[]; parentOk: boolean };
export function moveImpact(p: Page, np: string | null): MoveImpact {
  const kin = descendants(p.id); const all = [p].concat(kin);
  const base = np ? depth(byId(np)) + 1 : 1;
  const rel: Record<string, number> = { [p.id]: 0 };
  kin.forEach((c) => { rel[c.id] = rel[c.parent as string] + 1; });
  const out3 = all.filter((x) => base + rel[x.id] > MENU_MAX);
  const shown = all.filter((x) => x.inMenu && x.menuOn && effUse(x));
  let parentOk = true; let n = np ? byId(np) : null;
  while (n) { if (!n.inMenu) { parentOk = false; break; } n = n.parent ? byId(n.parent) : null; }
  const keep = parentOk ? shown.filter((x) => out3.indexOf(x) === -1) : [];
  const lost = shown.filter((x) => keep.indexOf(x) === -1);
  return { kin, all, out3, shown, keep, lost, parentOk };
}
export function moveCheck(p: Page, np: string | null): { ok: boolean; msg?: string } {
  if (np === p.id || descendants(p.id).some((c) => c.id === np)) return { ok: false, msg: '자기 자신이나 하위를 상위로 지정할 수 없습니다' };
  if (np && !byId(np).use) return { ok: false, msg: '사용안함 상태인 상위 페이지에는 하위를 둘 수 없습니다' };
  if (np === p.parent) return { ok: false, msg: '현재 경로와 같습니다' };
  return { ok: true };
}
/** 안 B(유지형) — 옮겨도 메뉴 노출이 따라간다. 3뎁스 밖·상위 미등록이면 메뉴에서 빠진다 */
export function movePage(p: Page, np: string | null): { ok: boolean; msg: string } {
  const c = moveCheck(p, np); if (!c.ok) return { ok: false, msg: c.msg ?? '' };
  const im = moveImpact(p, np);
  p.parent = np;
  p.order = children(np).length - 1;
  p.morder = mkids(np).reduce((m, x) => (x === p ? m : Math.max(m, x.morder + 1)), 0);
  im.out3.forEach((x) => { x.menuOn = false; x.inMenu = false; });
  if (!im.parentOk) im.all.forEach((x) => { x.menuOn = false; x.inMenu = false; });
  afterEdit(p);
  return {
    ok: true,
    msg: `${p.name}${im.kin.length ? ` (하위 ${im.kin.length}개 포함)` : ''} → ${np ? byId(np).name : '최상위'}`
      + (im.lost.length ? ` · 3뎁스 밖 ${im.lost.length}건 메뉴에서 빠짐` : ' · 메뉴 유지')
      + ' — 승인 후 반영',
  };
}
export function mkids(pid: string | null): Page[] { return children(pid).slice().sort((a, b) => a.morder - b.morder); }

export function requestApproval(p: Page): { ok: boolean; msg: string } {
  if (!noUrl(p) && !p.fixed) return { ok: false, msg: 'URL 확정 전에는 승인 요청을 할 수 없습니다' };
  if (p.state === 'pending') return { ok: false, msg: '이미 승인 대기 중입니다' };
  if (!isChanged(p)) return { ok: false, msg: '반영본과 다른 내용이 없습니다' };
  p.state = 'pending';
  return { ok: true, msg: `${p.id} 승인 요청` };
}
/** 이동 승인 = 하위의 메뉴 플래그도 함께 반영 */
export function approvePage(p: Page): { ok: boolean; msg: string } {
  if (p.state !== 'pending') return { ok: false, msg: '승인 대기 상태가 아닙니다' };
  const moved = movePending(p);
  p.live = snap(p); p.state = 'live'; p.liveAt = now();
  if (moved) descendants(p.id).forEach((c) => { if (c.live) { c.live.menuOn = c.menuOn; c.live.inMenu = c.inMenu; } });
  return { ok: true, msg: `${p.id} 승인 · FO 반영${moved ? ' — FO 메뉴가 새 자리로 바뀜' : ''}` };
}

/* 최초 1회 초기화 (HMR 에서도 한 번만) */
if (store.pages.length === 0) init();
