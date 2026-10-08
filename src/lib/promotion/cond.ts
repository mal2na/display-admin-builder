/**
 * 조건 빌더 — 판정 항목 마스터와 조건 상태 모델.
 *  (public/promotion-prototype.html 의 condBuilder / cbRowText / cbRowErr 를 React 용으로 옮긴 것)
 *
 * 접근(access) · 참여(join) · 지급(pay) 조건이 **같은 판정 항목 마스터 하나**를 공유한다.
 * 조건은 두 모양이다.
 *   · 단독 행(row)        — 연령 · 멤버십 등급 · 회선 상태처럼 혼자 판정하는 조건
 *   · 묶음(group)         — 상품 조건 / 서비스 조건. 여기에 행동 조건(구매·개통·가입…)이 달라붙는다.
 * 행동 조건은 반드시 묶음에 속하고, 묶음의 상품 유형이 맞아야 붙일 수 있다(gFits).
 */

export type CondCtx = 'access' | 'join' | 'pay';
export const CB_CTX: Record<CondCtx, string> = { access: '접근', join: '참여', pay: '지급' };
export const CB_WHEN: Record<CondCtx, string> = { access: '진입 시', join: '참여 시', pay: '지급 판정 시' };
export const CB_KEY: Record<CondCtx, 'A' | 'J' | 'P'> = { access: 'A', join: 'J', pay: 'P' };
export const CB_CATS = ['고객', '상품', '서비스', '행동', '업무 결과', '참여 이력'];

/* ── 마스터 (예시 데이터) ───────────────────────────────────────── */
export const PROD_TYPES = ['단말', '기기·액세서리', '부가 상품', '요금제', '부가·구독', '유선 상품'];
export const PRODUCTS: Record<string, string[]> = {
  단말: ['Galaxy S26', 'Galaxy S26+', 'Galaxy S26 Ultra', 'Galaxy Z Fold8', 'Galaxy Z Flip8', 'iPhone 18', 'iPhone 18 Pro', 'iPhone 17e'],
  '기기·액세서리': ['Galaxy Watch8', 'Galaxy Buds4', 'Apple TV 4K'],
  '부가 상품': ['T 데이터쿠폰 1GB', 'T 데이터쿠폰 3GB'],
  요금제: ['5GX 프라임', '5GX 플래티넘', '5GX 레귤러', '0 청년 69', '다이렉트5G 48', 'ZEM플랜 스마트'],
  '유선 상품': ['인터넷 기가', '인터넷 500M', 'B tv All', 'B tv 이코노미'],
  '부가·구독': ['T 우주패스 올인원', 'T 우주패스 free', 'V 컬러링', '티빙 (T 우주)', 'baro 로밍'],
};
export const EVENT_MASTER: Record<string, string[]> = {
  'T멤버십': ['밀크T 0원 무료체험', '밀크T 무료체험하고 상품권 3만원 받기', '[T day] 마이스마트콜3 신규 가입 응모', '2026년 새해맞이 T 멤버십 첫 가입 이벤트'],
  'T 다이렉트': ['Galaxy Fold8 삼성카드 결제 캐시백', 'New Galaxy 사전예약 기념 스페셜 라이브', '사전예약 쓰던 폰 특별 보상'],
  TDS: ['갤럭시 S26 자급제 구매 고객 혜택', 'ZEM플랜 새 번호 개통 프로모션'],
  T우주: ['T 우주패스 올인원 첫 달 무료', '우주패스 재가입 웰컴 혜택'],
};
export const PAYMENTS: Record<string, string[]> = {
  카드: ['삼성카드 개인 신용', '삼성카드 개인 체크', '신한카드 개인 신용', '현대카드 개인 신용', 'KB국민카드 개인 신용', '롯데카드 개인 신용', '법인카드'],
  포인트: ['OK캐쉬백', 'T 멤버십 포인트', '레인보우 포인트'],
};
/** 서비스별 판정 가능한 행동과 기능 (예시값 · 현업 확인 필요) */
export const SERVICES: Record<string, { acts: string[]; features: Record<string, string[]> }> = {
  에이닷: { acts: ['join', 'login', 'link', 'setting', 'attend', 'use'], features: { setting: ['구독 캘린더', '통화 요약', '스팸 차단'], use: ['영화 예매', 'AI 전화 통역', '퀴즈 참여'] } },
  ZEM: { acts: ['join', 'login', 'attend', 'use'], features: { use: ['자녀 위치 확인', '스마트폰 사용 시간 관리'] } },
};

export const ROUTES = ['온라인 샵', '고객센터', '대리점'];
export const PERS = ['전체 이력', '최근 기간', '직접 지정'];

/* ── 판정 항목 마스터 ───────────────────────────────────────────── */
export type CondItem = {
  cat: string; name: string; kind: string;
  /** 쓸 수 있는 조건 맥락 — A 접근 / J 참여 / P 지급 */
  use: string;
  freq: number; desc: string;
  verb?: string; types?: string[]; svc?: boolean; joinType?: boolean | 'plan';
  route?: boolean; pay?: boolean; sk?: string;
  /** 비회원은 판정할 수 없는 조건 */
  memberOnly?: boolean;
};

export const CB_ITEMS: Record<string, CondItem> = {
  age: { cat: '고객', name: '연령', kind: 'age', use: 'AJP', freq: 296, desc: '만 나이 기준 이상·이하·범위·같음' },
  ctype: { cat: '고객', name: '고객 유형', kind: 'ctype', use: 'AJP', freq: 6, desc: '개인(내국인)·법인·외국인 중 여러 개 선택' },
  grade: { cat: '고객', name: '멤버십 등급', kind: 'grade', use: 'AJP', freq: 1157, desc: 'T 멤버십 등급 (전체 = 등급 무관)' },
  btype: { cat: '고객', name: '멤버십 혜택 유형', kind: 'btype', use: 'AJP', freq: 0, desc: '고객의 현재 멤버십 혜택 유형 (할인형·적립형)' },
  lineOwn: { cat: '고객', name: '회선 보유 여부', kind: 'lineOwn', use: 'AJP', freq: 2, desc: 'SKT 이동전화·air 회선 기준 (알뜰폰 제외)' },
  lineState: { cat: '고객', name: '회선 상태', kind: 'lineState', use: 'AJP', freq: 108, desc: '정상·정지·해지 중 해당 상태 선택' },
  lineChg: { cat: '고객', name: '회선 변경 이력', kind: 'lineChg', use: 'AJP', freq: 108, desc: '번호 변경·명의 변경 이력 (기간 지정 · 포함 또는 제외)' },
  share: { cat: '참여 이력', name: '이벤트 공유', kind: 'share', use: 'JP', freq: 0, desc: '이 이벤트 또는 지정한 이벤트를 공유했는지 (카카오톡 공유 전송 완료 기준)' },
  evhist: { cat: '참여 이력', name: '이벤트 참여 이력', kind: 'evhist', use: 'AJP', freq: 97, desc: '지정한 이벤트의 참여·당첨 이력 (기체험자 제외, 재참여 제한 등)' },
  prod: { cat: '상품', name: '상품 조건', kind: 'prod', use: 'AJP', freq: 150, desc: '대상 상품 선택 · 행동 조건을 붙여 함께 판정' },
  svc: { cat: '서비스', name: '서비스 조건', kind: 'svc', use: 'AJP', freq: 47, desc: '대상 서비스(에이닷·ZEM 등) 선택 · 행동 조건을 붙여 함께 판정' },
  preorder: { cat: '행동', name: '사전예약', kind: 'act', verb: '사전예약', types: ['단말'], route: true, pay: true, use: 'AJP', freq: 28, desc: '대상 단말 사전예약 · 포함 또는 제외' },
  purchase: { cat: '행동', name: '구매', kind: 'act', verb: '구매', types: ['단말', '기기·액세서리', '부가 상품', '부가·구독'], route: true, pay: true, use: 'AJP', freq: 20, desc: '단말·기기·부가 상품·구독 구매(결제) · 포함 또는 제외' },
  open: { cat: '행동', name: '개통', kind: 'act', verb: '개통', types: ['단말'], joinType: true, route: true, use: 'AJP', freq: 36, desc: '대상 단말 개통 (신규·번호이동·기기변경) · 포함 또는 제외' },
  join: { cat: '행동', name: '가입', kind: 'act', verb: '가입', types: ['요금제', '부가·구독', '유선 상품'], svc: true, joinType: 'plan', route: true, use: 'AJP', freq: 42, desc: '요금제·부가·구독·유선 상품·서비스 가입 · 포함 또는 제외' },
  install: { cat: '행동', name: '설치 완료', kind: 'act', verb: '설치', types: ['유선 상품'], use: 'AJP', freq: 0, desc: '인터넷·B tv 등 유선 상품 설치 완료 · 포함 또는 제외 (유선 상품만)' },
  cancel: { cat: '행동', name: '해지', kind: 'act', verb: '해지', types: ['요금제', '부가·구독', '유선 상품'], use: 'AJP', freq: 20, desc: '요금제·부가·구독 해지 · 포함(윈백) 또는 제외 (회선 해지와 별개)' },
  own: { cat: '행동', name: '보유/이용', kind: 'own', types: ['단말', '요금제', '부가·구독', '유선 상품'], use: 'AJP', freq: 27, desc: '단말 보유·상품 이용 중 여부 또는 N일·N개월 이상 보유·이용' },
  login: { cat: '행동', name: '로그인', kind: 'sact', sk: 'login', types: [], svc: true, use: 'AJP', freq: 7, desc: '서비스 로그인' },
  link: { cat: '행동', name: '계정 연결', kind: 'sact', sk: 'link', types: [], svc: true, use: 'AJP', freq: 16, desc: '서비스에 T 멤버십·T 아이디 등 계정 연결' },
  setting: { cat: '행동', name: '설정', kind: 'sact', sk: 'setting', types: [], svc: true, use: 'AJP', freq: 16, desc: '서비스 기능 설정 (현재 설정 중 / 설정한 적 있음)' },
  attend: { cat: '행동', name: '출석', kind: 'sact', sk: 'attend', types: [], svc: true, use: 'AJP', freq: 14, desc: '서비스 출석 N회 이상 (누적 / 연속)' },
  delivery: { cat: '업무 결과', name: '배송 결과', kind: 'deliv', use: 'JP', freq: 0, desc: '배송 관리 시스템에서 확인된 이벤트 주문의 배송 결과' },
  consult: { cat: '업무 결과', name: '상담', kind: 'consult', use: 'JP', freq: 0, desc: '상담 신청 완료·상담 완료·미진행 상태 포함 또는 제외' },
  use: { cat: '행동', name: '기능 이용', kind: 'sact', sk: 'use', types: [], svc: true, use: 'AJP', freq: 11, desc: '서비스 기능 이용 (예: 영화 예매)' },
};
/** 비회원도 판정할 수 있는 조건 — 나머지는 회원 전용(FO에서 로그인·회원가입 유도) */
const GUEST_OK = ['age', 'evhist'];
Object.entries(CB_ITEMS).forEach(([k, v]) => { v.memberOnly = !GUEST_OK.includes(k); });

export const MO_TITLE = '비회원은 판정할 수 없는 조건이에요. 비회원이 진입하면 FO에서 로그인·회원가입으로 안내해요';
export const CIRC = '①②③④⑤⑥⑦⑧⑨⑩';

/* ── 한국어 조사 ────────────────────────────────────────────────── */
/** 받침 유무 — 1: 받침 있음 / 0: 없음 / -1: 알 수 없음 */
function hb(w: string): number {
  const t = w.replace(/[\s)\]]+$/, '');
  const ch = t[t.length - 1] || '';
  const c = ch.charCodeAt(0) - 0xac00;
  if (c >= 0 && c < 11172) return c % 28 ? 1 : 0;
  if (/[0-9]/.test(ch)) return '013678'.includes(ch) ? 1 : 0;
  if (/[a-z]/i.test(ch)) return /[lmn]/i.test(ch) ? 1 : 0;
  return ch === '+' ? 0 : -1;
}
/** 을/를 */
export const obj = (w: string) => w + (hb(w) === 1 ? '을' : hb(w) === 0 ? '를' : '을(를)');
/** (으)로 */
export const ro = (w: string) => {
  const t = w.replace(/[\s)\]]+$/, '');
  const c = t.charCodeAt(t.length - 1) - 0xac00;
  if (c >= 0 && c < 11172) return c % 28 && c % 28 !== 8 ? '으로' : '로';
  return hb(t) === 1 && !/[178l]$/i.test(t) ? '으로' : '로';
};
const dt = (s: string) => s.replace(/-/g, '.');

/* ── 조건 상태 ──────────────────────────────────────────────────── */
export type Picked = { name: string; type: string };
export type CondVals = Record<string, unknown>;

/** 단독 행 또는 묶음에 붙은 행동 행 */
export type CondRow = { id: string; key: string; v: CondVals };
/** 상품·서비스 묶음 — 행동 행을 품는다 */
export type CondGroup = { id: string; key: 'prod' | 'svc'; v: CondVals; acts: CondRow[] };
export type CondNode = CondRow | CondGroup;
export const isGroup = (n: CondNode): n is CondGroup => (n as CondGroup).acts !== undefined;

let seq = 0;
export const nextId = () => `c${++seq}`;

/** 조건을 새로 만들 때의 초기값 — 프로토타입 기본 선택과 같다 */
export function defaults(key: string): CondVals {
  const i = CB_ITEMS[key];
  const base: CondVals = { when: '판정 시점', wdate: '' };
  switch (i.kind) {
    case 'prod': return { prods: [] as Picked[], inc: '포함', pt: '' };
    case 'svc': return { svc: '', inc: '포함', pt: '' };
    case 'age': return { ...base, op: '이상', a1: '', a2: '' };
    case 'ctype': return { ...base, ct: ['개인(내국인)'] };
    case 'grade': return { ...base, gall: false, v: ['VIP', 'GOLD', 'SILVER'] };
    case 'btype': return { ...base, v: ['할인형', '적립형'] };
    case 'lineOwn': return { ...base, sel: '보유' };
    case 'lineState': return { ...base, v: ['정상'] };
    case 'lineChg': return { ...base, lc: ['번호 변경', '명의 변경'], lcinc: '제외', per: '최근 기간', rn: '3', ru: '개월', ps: '', pe: '' };
    case 'deliv': return { ...base, sel: '보장일 내 도착' };
    case 'consult': return { ...base, sel: '상담 신청 완료', inc: '포함' };
    case 'share': return { ...base, shev: '이 이벤트', evs: [] as Picked[], n: '1' };
    case 'evhist': return { ...base, evs: [] as Picked[], evk: '참여', evinc: '제외', per: '전체 이력', rn: '', ru: '개월', ps: '', pe: '' };
    case 'own': return { ...base, tgt: '', km: '현재 보유·이용 중', num: '', unit: '개월' };
    case 'sact': return {
      ...base, tgt: '', per: '전체 이력', rn: '', ru: '개월', ps: '', pe: '',
      link: 'T 멤버십', feat: '', sm: '설정한 적 있음', am: '누적', ac: '',
    };
    default: // act
      return {
        ...base, tgt: '', per: '전체 이력', rn: '', ru: '개월', ps: '', pe: '',
        jt: ['신규', '번호이동', '기기변경'],
        rall: true, rt: ROUTES.slice(),
        via: '무관', viam: '모든 이벤트', viaEvs: [] as Picked[],
        pay: '전체', pays: [] as Picked[], pm: ['일시불', '할부'], i1: '2', i2: '12', easy: true,
      };
  }
}

export const newRow = (key: string): CondRow => ({ id: nextId(), key, v: defaults(key) });
export const newGroup = (key: 'prod' | 'svc'): CondGroup => ({ id: nextId(), key, v: defaults(key), acts: [] });

/* ── 묶음 ↔ 행동 짝 맞추기 ──────────────────────────────────────── */
/** 묶음의 유형 — 상품이면 상품 유형, 서비스면 'svc:<서비스명>' */
export function gType(g: CondGroup): string {
  if (g.key === 'svc') { const s = g.v.svc as string; return s ? `svc:${s}` : ''; }
  return (g.v.pt as string) || '';
}
export const gIsSvc = (g: CondGroup) => g.key === 'svc';
export const gSvc = (g: CondGroup) => (gIsSvc(g) ? ((g.v.svc as string) || '') : '');

/** 이 행동(k)을 유형 t 의 묶음에 붙일 수 있나 */
export function actOk(k: string, t: string): boolean {
  if (!t) return false;
  if (t.startsWith('svc:')) { const sv = SERVICES[t.slice(4)]; return !!(sv && sv.acts.includes(k)); }
  return (CB_ITEMS[k].types || []).includes(t);
}
/** 유형이 맞고, 같은 행동이 아직 없는 묶음인가 */
export function gFits(g: CondGroup, k: string, self?: CondRow): boolean {
  return actOk(k, gType(g)) && !g.acts.some((a) => a !== self && a.key === k);
}
export function gLabel(g: CondGroup, no: string): string {
  if (gIsSvc(g)) return `${no} ${gSvc(g) || '서비스 미선택'}`;
  const ps = (g.v.prods as Picked[]) || [];
  return `${no} ${ps.length ? ps[0].name + (ps.length > 1 ? ` 외 ${ps.length - 1}` : '') : '상품 미선택'}`;
}
export const hasCard = (v: CondVals) => ((v.pays as Picked[]) || []).some((p) => p.type === '카드');

/** 조건 추가 목록에서 이 항목을 못 고르는 이유 */
export function pickWhy(nodes: CondNode[], k: string): string {
  if (CB_ITEMS[k].cat !== '행동') return '';
  const gs = nodes.filter(isGroup);
  if (!gs.length) return '상품 또는 서비스 조건을 먼저 추가하세요';
  if (!gs.some((g) => gFits(g, k))) {
    const i = CB_ITEMS[k];
    return `추가한 조건에 쓸 수 없어요 (${[...(i.types || []), ...(i.svc ? ['서비스'] : [])].join('·')} · 이미 추가된 행동 제외)`;
  }
  return '';
}

/* ── 문장 만들기 ────────────────────────────────────────────────── */
function periodText(v: CondVals): string | null {
  const pd = v.per as string;
  if (pd === '최근 기간') { const n = v.rn as string; if (!n || +n < 1) return null; return `최근 ${n}${v.ru} 내 `; }
  if (pd === '직접 지정') {
    const a = v.ps as string; const b = v.pe as string;
    if (!a || !b || a > b) return null;
    return `${dt(a)}~${dt(b)}에 `;
  }
  return '';
}
function whenPre(v: CondVals): string | null {
  if (v.when === '지정일') { const d = v.wdate as string; return d ? `${dt(d)} 기준 ` : null; }
  return '';
}

/** 행동 1개 → [앞말, 본문]. last=false 면 "~하고" 연결형 */
export function actClause(r: CondRow, g: CondGroup, last: boolean, neg?: boolean): [string, string] | null {
  const item = CB_ITEMS[r.key]; const v = r.v; const t = gType(g);

  if (item.kind === 'own') {
    const pre = whenPre(v); if (pre === null) return null;
    const dv = t === '단말' ? '보유' : '이용';
    const ng = neg && last;
    if (v.km === '현재 보유·이용 중') {
      return [pre, ng ? (last ? `${dv}하지 않는` : `${dv}하지 않고`) : (last ? `${dv} 중인` : `${dv} 중이고`)];
    }
    const n = v.num as string; if (!n || +n < 1) return null;
    return [pre, `${n}${v.unit} 이상 ` + (ng ? (last ? `${dv}하지 않은` : `${dv}하지 않고`) : (last ? `${dv}한` : `${dv}하고`))];
  }

  let jt = '';
  if (item.joinType && !(item.joinType === 'plan' && t !== '요금제')) {
    const j = (v.jt as string[]) || [];
    if (!j.length) return null;
    if (j.length < 3) jt = `${j.join('·')}으로 `;
  }
  let rt = '';
  if (item.route && !gIsSvc(g) && !v.rall) {
    const x = (v.rt as string[]) || [];
    if (!x.length) return null;
    rt = `${x.join('·')}에서 `;
  }
  let via = '';
  if (item.route && !gIsSvc(g)) {
    const vv = v.via as string;
    if (vv === '다른 이벤트 경유' && v.viam === '지정 이벤트') {
      const ev = ((v.viaEvs as Picked[]) || []).map((x) => x.name);
      if (!ev.length) return null;
      via = `${ev.join('·')} 경유로 `;
    } else if (vv === '이 이벤트 경유') via = '이 이벤트 경유로 ';
    else if (vv === '다른 이벤트 경유') via = '다른 이벤트 경유로 ';
  }
  const per = periodText(v); if (per === null) return null;
  const pre = whenPre(v); if (pre === null) return null;

  let py = '';
  if (item.pay && v.pay === '지정') {
    const ps = ((v.pays as Picked[]) || []).map((p) => p.name);
    if (!ps.length) return null;
    const nm = ps.join('·');
    const det: string[] = [];
    if (hasCard(v)) {
      const pm = (v.pm as string[]) || [];
      if (!pm.length) return null;
      const i1 = v.i1 as string; const i2 = v.i2 as string;
      if (pm.includes('할부') && (!i1 || !i2 || +i1 > +i2)) return null;
      pm.forEach((x) => det.push(x === '할부' ? `${i1}~${i2}개월 할부` : x));
      if (v.easy) det.push('간편결제 제외');
    }
    py = `${nm}${det.length ? `(${det.join(', ')})` : ''}${ro(nm)} `;
  }

  let core = `${rt}${via}${py}${jt}${item.verb ?? ''}`;
  let st: [string, string, string] | null = null;
  if (item.kind === 'sact') {
    const fv = v.feat as string;
    const needsFeat = item.sk === 'setting' || item.sk === 'use';
    if (needsFeat && !fv) return null;
    if (item.sk === 'login') core = '로그인';
    if (item.sk === 'link') core = `${obj(v.link as string)} 연결`;
    if (item.sk === 'use') core = `${obj(fv)} 이용`;
    if (item.sk === 'attend') {
      const n = v.ac as string; if (!n || +n < 1) return null;
      core = v.am === '연속' ? `${n}일 연속 출석` : `${n}회 이상 출석`;
    }
    if (item.sk === 'setting') {
      if (v.sm === '현재 설정 중') st = [`${obj(fv)} 설정 중인`, `${obj(fv)} 설정 중이고`, `${obj(fv)} 설정 중이지 않은`];
      else core = `${obj(fv)} 설정`;
    }
  }
  if (st) return [pre + per, last ? (neg ? st[2] : st[0]) : st[1]];
  return [pre + per, core + (last ? (neg ? '한 적 없는' : '한') : '하고')];
}

export function groupText(g: CondGroup): string | null {
  const svc = gIsSvc(g);
  const ps: { name: string }[] = svc ? (gSvc(g) ? [{ name: gSvc(g) }] : []) : ((g.v.prods as Picked[]) || []);
  const acts = g.acts;
  if (!ps.length || !acts.length) return null;
  const neg = g.v.inc === '제외';
  const whole = neg && acts.length > 1;
  const raw = acts.map((a, i) => actClause(a, g, i === acts.length - 1, neg && !whole));
  if (raw.some((c) => !c)) return null;
  let prev: string | null = null;
  const cl = (raw as [string, string][]).map(([pf, b]) => {
    const o = (pf === prev ? '' : (pf || (prev ? '전체 이력 중 ' : ''))) + b;
    prev = pf;
    return o;
  });
  const pn = ps.length > 1 ? `${ps.map((x) => x.name).join('·')} 중 하나` : ps[0].name;
  const k0 = acts[0].key;
  const head = svc
    ? pn + (k0 === 'join' || k0 === 'login' ? '에' : '에서')
    : (CB_ITEMS[k0].verb === '가입' ? `${pn}에` : obj(pn));
  return `${head} ${cl.join(' ')}${whole ? ' 경우가 아닌' : ''}`;
}

export function rowText(r: CondRow): string | null {
  const item = CB_ITEMS[r.key]; const v = r.v;
  if (['prod', 'svc', 'act', 'own', 'sact'].includes(item.kind)) return null;
  const pre = whenPre(v); if (pre === null) return null;
  let t: string | null = null;
  switch (item.kind) {
    case 'age': {
      const op = v.op as string; const a = v.a1 as string; const b = v.a2 as string;
      if (a === '' || (op === '범위' && b === '')) return null;
      if (+a < 0 || +a > 99 || (op === '범위' && (+b < 0 || +b > 99 || +a > +b))) return null;
      t = op === '이상' ? `만 ${a}세 이상인` : op === '이하' ? `만 ${a}세 이하인` : op === '범위' ? `만 ${a}~${b}세인` : `만 ${a}세인(해당 나이만)`;
      break;
    }
    case 'ctype': { const c = v.ct as string[]; if (!c.length) return null; t = `고객 유형이 ${c.join('·')}인`; break; }
    case 'evhist': {
      const ev = ((v.evs as Picked[]) || []).map((x) => x.name);
      if (!ev.length) return null;
      const per = periodText(v); if (per === null) return null;
      const nm = `「${ev[0]}」${ev.length > 1 ? ` 외 ${ev.length - 1}건` : ''}`;
      const inc = v.evinc === '포함';
      t = v.evk === '참여'
        ? `${per}이벤트 ${nm}에 참여${inc ? '한' : '한 적 없는'}`
        : `${per}이벤트 ${nm}에서 당첨·혜택을 받${inc ? '은' : '은 적 없는'}`;
      break;
    }
    case 'grade': {
      if (v.gall) { t = 'T 멤버십 회원(등급 무관)인'; break; }
      const g = v.v as string[]; if (!g.length) return null;
      t = `멤버십 등급이 ${g.join('·')}인`; break;
    }
    case 'btype': { const c = v.v as string[]; if (!c.length) return null; t = `멤버십 혜택 유형이 ${c.join('·')}인`; break; }
    case 'deliv': t = `배송 결과가 ${v.sel}인`; break;
    case 'share': {
      const sp = v.shev === '지정 이벤트';
      let tg = '이 이벤트를';
      if (sp) {
        const ev = ((v.evs as Picked[]) || []).map((x) => x.name);
        if (!ev.length) return null;
        tg = `이벤트 「${ev[0]}」${ev.length > 1 ? ` 외 ${ev.length - 1}건` : ''}을`;
      }
      const n = v.n as string; if (!n || +n < 1) return null;
      t = `${tg} ${+n > 1 ? `${n}회 이상 ` : ''}공유한`;
      break;
    }
    case 'consult': {
      const st = v.sel as string; const inc = v.inc === '포함';
      t = st === '상담 완료' ? (inc ? '상담을 완료한' : '상담을 완료하지 않은')
        : st === '미진행' ? (inc ? '상담이 미진행된' : '상담이 미진행 상태가 아닌')
          : (inc ? '상담 신청을 완료한' : '상담 신청을 완료하지 않은');
      break;
    }
    case 'lineOwn': t = v.sel === '보유' ? 'SKT 회선을 보유한' : 'SKT 회선을 보유하지 않은'; break;
    case 'lineState': { const s = v.v as string[]; if (!s.length) return null; t = `회선이 ${s.join('·')} 상태인`; break; }
    case 'lineChg': {
      const c = v.lc as string[]; if (!c.length) return null;
      const per = periodText(v); if (per === null) return null;
      t = `${per}${c.map((x) => x.replace(' 변경', '')).join('·')} 변경 이력이 ${v.lcinc === '제외' ? '없는' : '있는'}`;
      break;
    }
    default: return null;
  }
  return t ? pre + t : null;
}

/** 조건 빌더 전체 문장 */
export function sentence(nodes: CondNode[]): string | null {
  const parts = nodes.map((n) => (isGroup(n) ? groupText(n) : rowText(n))).filter(Boolean) as string[];
  return parts.length ? `${parts.join(', ')} 고객` : null;
}

/* ── 검증 ──────────────────────────────────────────────────────── */
function periodErr(v: CondVals): string {
  const pd = v.per as string;
  if (pd === '최근 기간' && !(+(v.rn as string) >= 1)) return '최근 기간을 입력해주세요';
  if (pd === '직접 지정') {
    const a = v.ps as string; const b = v.pe as string;
    if (!a || !b) return '인정 기간을 입력해주세요';
    if (a > b) return '인정 기간의 시작일이 종료일보다 늦어요';
  }
  return '';
}
const whenErr = (v: CondVals) => (v.when === '지정일' && !v.wdate ? '확인 시점 지정일을 입력해주세요' : '');

export function rowErr(r: CondRow, g: CondGroup | null): string {
  const item = CB_ITEMS[r.key]; const v = r.v;

  if (item.kind === 'act' || item.kind === 'own' || item.kind === 'sact') {
    if (!g) return '대상 상품·서비스 조건을 다시 선택해주세요';
    if (item.kind === 'own') {
      const w = whenErr(v); if (w) return w;
      if (v.km === '기간 이상 보유·이용' && !(+(v.num as string) >= 1)) return '기간을 입력해주세요';
      return actClause(r, g, true) ? '' : '조건 값을 입력해주세요';
    }
    const t = gType(g);
    if (item.joinType && !(item.joinType === 'plan' && t !== '요금제') && !((v.jt as string[]) || []).length) return '가입 유형을 1개 이상 선택해주세요';
    if (item.route && !gIsSvc(g) && !v.rall && !((v.rt as string[]) || []).length) return '가입·구매 채널을 1개 이상 선택해주세요';
    if (item.route && !gIsSvc(g) && v.via === '다른 이벤트 경유' && v.viam === '지정 이벤트' && !((v.viaEvs as Picked[]) || []).length) return '경유할 이벤트를 선택해주세요';
    if (item.pay && v.pay === '지정') {
      if (!((v.pays as Picked[]) || []).length) return '결제 수단을 선택해주세요';
      if (hasCard(v)) {
        const pm = (v.pm as string[]) || [];
        if (!pm.length) return '결제 방식을 1개 이상 선택해주세요';
        if (pm.includes('할부')) {
          const a = +(v.i1 as string); const b = +(v.i2 as string);
          if (!a || !b || a > b) return '할부 개월을 확인해주세요';
        }
      }
    }
    if ((item.sk === 'setting' || item.sk === 'use') && !v.feat) return '기능을 선택해주세요';
    if (item.sk === 'attend' && !(+(v.ac as string) >= 1)) return '출석 횟수를 입력해주세요';
    const pe = periodErr(v); if (pe) return pe;
    const w = whenErr(v); if (w) return w;
    return actClause(r, g, true) ? '' : '조건 값을 입력해주세요';
  }

  const w = whenErr(v); if (w) return w;
  if (item.kind === 'age') {
    const op = v.op as string; const a = v.a1 as string; const b = v.a2 as string;
    if (a === '' || (op === '범위' && b === '')) return '나이를 입력해주세요';
    if (+a < 0 || +a > 99 || (b !== '' && (+b < 0 || +b > 99))) return '나이는 0~99 사이로 입력해주세요';
    if (op === '범위' && +a > +b) return '최소 나이는 최대 나이보다 클 수 없어요';
  }
  if (item.kind === 'evhist') {
    if (!((v.evs as Picked[]) || []).length) return '대상 이벤트를 선택해주세요';
    const pe = periodErr(v); if (pe) return pe;
  }
  if (item.kind === 'ctype' && !((v.ct as string[]) || []).length) return '고객 유형을 1개 이상 선택해주세요';
  if (item.kind === 'grade' && !v.gall && !((v.v as string[]) || []).length) return '등급을 1개 이상 선택해주세요';
  if (item.kind === 'share') {
    if (v.shev === '지정 이벤트' && !((v.evs as Picked[]) || []).length) return '대상 이벤트를 선택해주세요';
    if (!(+(v.n as string) >= 1)) return '공유 횟수를 입력해주세요';
  }
  if (item.kind === 'btype' && !((v.v as string[]) || []).length) return '혜택 유형을 1개 이상 선택해주세요';
  if (item.kind === 'lineState' && !((v.v as string[]) || []).length) return '상태를 1개 이상 선택해주세요';
  if (item.kind === 'lineChg') {
    if (!((v.lc as string[]) || []).length) return '변경 유형을 1개 이상 선택해주세요';
    const pe = periodErr(v); if (pe) return pe;
  }
  return rowText(r) ? '' : '조건 값을 입력해주세요';
}

export function groupErr(g: CondGroup): string {
  if (gIsSvc(g)) {
    if (!gSvc(g)) return '서비스를 선택해주세요';
    if (!g.acts.length) return '행동 조건을 1개 이상 추가해주세요';
    return '';
  }
  if (!((g.v.prods as Picked[]) || []).length) return '대상 상품을 선택해주세요';
  if (!g.acts.length) return '행동 조건을 1개 이상 추가해주세요';
  return '';
}

/** 조건 빌더 하나의 검증 결과 — { [노드 id]: 메시지 } */
export function validate(nodes: CondNode[], required?: boolean): { errors: Record<string, string>; top: string } {
  const errors: Record<string, string> = {};
  if (!nodes.length) return { errors, top: required ? '조건을 1개 이상 추가해주세요' : '' };
  let bad = false;
  nodes.forEach((n) => {
    if (isGroup(n)) {
      const m = groupErr(n);
      if (m) { errors[n.id] = m; bad = true; }
      n.acts.forEach((a) => { const am = rowErr(a, n); if (am) { errors[a.id] = am; bad = true; } });
    } else {
      const m = rowErr(n, null);
      if (m) { errors[n.id] = m; bad = true; }
    }
  });
  return { errors, top: bad ? '입력하지 않았거나 올바르지 않은 조건 값이 있어요' : '' };
}
