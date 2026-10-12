/**
 * 프로모션 등록 폼 — 상태 모델 · 기본값 · 검증.
 *  (public/promotion-prototype.html 의 renderForm / validate 를 React 용으로 옮긴 것)
 *
 * 유형(안내형 / 참여ㆍ리워드형 / 추천형)에 따라 보이는 섹션이 달라진다.
 * 지금 옮긴 범위는 **기본정보 · 하단 CTA · 검색 및 태그 정보** 와 그 검증이다.
 * 참여 정보 · 리워드 · 추천 구조는 아직 프로토타입에 있다(CLAUDE.md 진행 상황 표 참고).
 */
import type { CondNode } from './cond';
import { validate as validateCond } from './cond';
import type { EventType, JoinMode } from './reg-start';
import {
  newJaItem, newBlock, applyRules, validatePr, needJoinCta, needClaimCta,
  emptyRef, validateRef,
  type JaItem, type RewardBlock, type PrState, type RefState,
} from './pr';
import { GUEST_TERM_FIX, initialGuestFields, termById, initialReq, type TermMap, type GuestField } from './terms';

export const CHANNELS = ['PC', 'MO', '에이닷'];
export const CTA_MAX = 4;
export const CTA_AT_ONCE = 2;
export const CTA_JOIN = '이벤트 참여 버튼';
export const CTA_CLAIM = '혜택 지급 버튼';

/** 유형별 고를 수 있는 하단 CTA 유형 */
export function ctaOpts(type: string): string[] {
  if (type === '안내형') return ['링크 버튼'];
  if (type === '추천형') return ['링크 버튼', '추천 코드 발급 버튼', '추천 코드 입력 버튼'];
  return ['링크 버튼', CTA_CLAIM, CTA_JOIN];
}

/** 유의사항 템플릿 (예시 데이터) */
export const CAU_TPL = [
  { id: 'NT0007', name: '안내형 기본 유의사항', cat: '안내형', body: '· 본 페이지의 혜택 및 내용은 사전 고지 없이 변경될 수 있습니다.\n· 상세 조건은 각 상품·서비스 안내 페이지를 확인해주세요.' },
  { id: 'NT0001', name: '이벤트 공통 유의사항', cat: '공통', body: '· 본 이벤트는 당사 사정에 따라 사전 고지 없이 변경 또는 조기 종료될 수 있습니다.\n· 부정한 방법으로 참여한 경우 당첨이 취소될 수 있습니다.\n· 이벤트 관련 문의는 고객센터(114)로 연락해주세요.' },
  { id: 'NT0002', name: '응모형 기본 유의사항', cat: '참여ㆍ리워드형', body: '· 이벤트 기간 내 1인 최대 참여 횟수 내에서 응모할 수 있습니다.\n· 중복 참여 시 1회로 인정됩니다.\n· 응모 완료 후에는 취소할 수 없습니다.' },
  { id: 'NT0003', name: '경품 지급 유의사항 (제세공과금)', cat: '참여ㆍ리워드형', body: '· 경품 가액이 5만 원을 초과하는 경우 제세공과금(22%)은 당첨자 부담입니다.\n· 당첨자 정보 입력 기한 내 미입력 시 당첨이 취소될 수 있습니다.\n· 경품은 사정에 따라 동급 상품으로 대체될 수 있습니다.' },
  { id: 'NT0004', name: 'T+포인트 지급 유의사항', cat: '참여ㆍ리워드형', body: '· T+포인트는 지급일로부터 1년간 사용할 수 있습니다.\n· 지급 시점에 T 멤버십 회원이 아닌 경우 지급되지 않습니다.' },
  { id: 'NT0005', name: '추천 이벤트 유의사항', cat: '추천형', body: '· 본인 추천은 인정되지 않습니다.\n· 피추천인은 이벤트 기간 내 1회만 인정됩니다.\n· 부정 추천이 확인될 경우 혜택이 회수될 수 있습니다.' },
  { id: 'NT0006', name: '단말 개통 이벤트 유의사항', cat: '참여ㆍ리워드형', body: '· 개통 후 31일 이내 해지·기기변경 시 혜택이 회수될 수 있습니다.\n· 법인 명의 개통 건은 이벤트 대상에서 제외됩니다.\n· 사전예약 후 기간 내 미개통 시 혜택이 제공되지 않습니다.' },
];

/** 서비스 내부 페이지 (CTA 연결용 · 예시 데이터) */
export const SVC_PAGES = [
  { id: 'PG000120', name: '요금제 추천', svc: 'T world' },
  { id: 'PG000230', name: '쇼핑 홈', svc: 'T world' },
  { id: 'PG000310', name: 'T 멤버십', svc: 'T world' },
  { id: 'PG000323', name: '전체 혜택', svc: 'T world' },
  { id: 'PG000420', name: '1:1 문의', svc: '고객지원' },
  { id: 'PG000500', name: '이벤트', svc: 'T world' },
];

export type CtaBlock = {
  id: number;
  type: string;
  name: string;
  per: '상시 노출' | '직접 지정';
  ps: string; pe: string;
  link: 'URL' | '서비스 내부 페이지';
  url: string; pg: string;
  open: '현재 창' | '새 창';
  bg: string; bgDef: boolean;
  fg: string; fgDef: boolean;
  /** 참여 행동·리워드에 맞춰 자동으로 붙은 CTA — 유형을 바꿀 수 없다 */
  auto?: boolean;
};

export type TargetFile = { name: string; total: number; ok: number; ng: number };

export type PromoForm = {
  type: EventType | string;
  jm: JoinMode;
  name: string;
  sub: string;
  channels: string[];
  disp: '전시' | '미전시';
  scope: '전체 공개' | '제한 공개';
  access: '조건 고객' | '지정 고객';
  accessCond: CondNode[];
  target: TargetFile | null;
  share: '사용' | '미사용';
  dispS: string; dispE: string; dispNoEnd: boolean;
  joinS: string; joinE: string;
  img: string; imgTag: string;
  cmt: '사용' | '미사용';
  block: '사용' | '미사용';
  blockS: string; blockE: string;
  caution: string; cauApplied: string;
  cta: '사용' | '미사용';
  ctas: CtaBlock[];
  search: '노출' | '미노출';
  tags: string[];
  keywords: string; ogTitle: string; ogDesc: string;
  /* ── 참여ㆍ리워드형 전용 ── */
  ja: JaItem[];
  joinCond: CondNode[];
  cycle: '기간 전체' | '주기별';
  cycleUnit: '일' | '주' | '월';
  maxJoin: string;
  dup: '고객 기준(CI)' | '멤버십 카드 기준';
  blocks: RewardBlock[];
  /** 이벤트 약관 매핑 (2-16) — 안내형 제외 */
  terms: TermMap[];
  /* ── 비회원 참여 ── */
  guest: '허용' | '허용 안 함';
  guestFields: GuestField[];
  guestAuth: string;
  guestTerms: TermMap[];
  /** 추천형 전용 */
  ref: RefState;
};

let ctaSeq = 0;
export function newCta(type: string): CtaBlock {
  ctaSeq += 1;
  return {
    id: ctaSeq, type: ctaOpts(type)[0], name: '',
    per: '상시 노출', ps: '', pe: '',
    link: 'URL', url: '', pg: '', open: '현재 창',
    bg: '#000000', bgDef: true, fg: '#FFFFFF', fgDef: true,
  };
}

export function emptyForm(type: string, jm: JoinMode): PromoForm {
  return {
    type, jm,
    name: '', sub: '',
    channels: CHANNELS.slice(),
    disp: '전시',
    scope: '전체 공개',
    access: '조건 고객',
    accessCond: [],
    target: null,
    share: '사용',
    dispS: '', dispE: '', dispNoEnd: false,
    joinS: '', joinE: '',
    img: '', imgTag: '',
    cmt: '사용',
    block: '사용', blockS: '', blockE: '',
    caution: '', cauApplied: '',
    cta: '사용', ctas: [newCta(type)],
    search: '노출',
    tags: [],
    keywords: '', ogTitle: '', ogDesc: '',
    ja: [newJaItem('버튼 참여')],
    joinCond: [],
    cycle: '기간 전체', cycleUnit: '월', maxJoin: '',
    dup: '고객 기준(CI)',
    blocks: [newBlock()],
    terms: [],
    guest: '허용 안 함',
    guestFields: initialGuestFields(),
    guestAuth: '휴대폰 본인인증(CI)',
    // 비회원 개인정보 수집·이용 동의는 고정으로 들어간다
    guestTerms: [{ id: GUEST_TERM_FIX, req: initialReq(termById(GUEST_TERM_FIX)!) }],
    ref: emptyRef(),
  };
}

/** 참여·리워드 상태만 떼어 본다 */
export const prOf = (f: PromoForm): PrState => ({ jm: f.jm, ja: f.ja, blocks: f.blocks });

/**
 * 값이 바뀔 때마다 한 번 통과시키는 정리 단계.
 *  · 참여·리워드의 잠기는 값(룰렛·자동 참여 등)을 실제로 밀어넣고
 *  · '버튼 참여' / '고객 수령' 에 맞춰 하단 CTA 를 자동으로 붙이거나 뗀다.
 */
export function normalize(f: PromoForm): PromoForm {
  if (f.type !== '참여ㆍ리워드형') return f;
  const pr = applyRules(prOf(f));
  let ctas = f.ctas.slice();

  const sync = (type: string, need: boolean, name: string) => {
    const owned = ctas.filter((c) => c.auto && c.type === type);
    if (!need && owned.length) {
      ctas = ctas.length > owned.length
        ? ctas.filter((c) => !owned.includes(c))
        : ctas.map((c) => (owned.includes(c) ? { ...c, auto: false, type: '링크 버튼', name: c.name === name ? '' : c.name } : c));
      return;
    }
    if (need && !owned.length) {
      if (ctas.length >= CTA_MAX) return;
      // 비어 있는 링크 버튼 한 칸이 있으면 그 자리를 쓴다
      const blank = ctas.find((c) => !c.auto && c.type === '링크 버튼' && !c.name.trim() && !c.url.trim());
      if (blank) ctas = ctas.map((c) => (c === blank ? { ...c, type, name, url: '', auto: true } : c));
      else ctas = [{ ...newCta(f.type), type, name, auto: true }, ...ctas];
    }
  };
  sync(CTA_JOIN, needJoinCta(pr), '응모하기');
  sync(CTA_CLAIM, needClaimCta(pr), '혜택 받기');

  const hasAuto = ctas.some((c) => c.auto);
  return { ...f, ja: pr.ja, blocks: pr.blocks, ctas, cta: hasAuto ? '사용' : f.cta };
}

/* ── 검증 ──────────────────────────────────────────────────────── */
export const hexOk = (v: string) => (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test((v || '').trim()) ? v.trim() : null);

export type FormErrors = Record<string, string>;
export type ValidateResult = { errors: FormErrors; condErrors: Record<string, string>; alert: string | null };

/** 기간 한 쌍 검증 */
function period(s: string, e: string, name: string, noEnd?: boolean): string {
  if (!s || (!e && !noEnd)) return `${name}을 설정하여 주시길 바랍니다`;
  if (e && s > e) return '기간 설정이 올바르지 않습니다. 종료일이 시작일보다 빠를 수 없습니다.';
  return '';
}

export function validateForm(f: PromoForm): ValidateResult {
  const E: FormErrors = {};
  let condErrors: Record<string, string> = {};

  // 같은 기간에 노출되는 하단 CTA는 최대 2개
  if (f.cta !== '미사용' && f.ctas.length) {
    const iv = f.ctas.map((c, i) => ({
      nm: c.name.trim() || `하단 CTA ${i + 1}`,
      a: c.per === '직접 지정' ? (c.ps || '0000') : '0000',
      z: c.per === '직접 지정' ? (c.pe || '9999') : '9999',
    }));
    for (const t of Array.from(new Set(iv.map((x) => x.a)))) {
      const on = iv.filter((x) => x.a <= t && t <= x.z);
      if (on.length > CTA_AT_ONCE) {
        return {
          errors: E, condErrors,
          alert: `같은 기간에 노출되는 하단 CTA는 최대 ${CTA_AT_ONCE}개입니다.\n${on.map((x) => `'${x.nm}'`).join(', ')}의 노출 기간이 겹칩니다.\n노출 기간을 확인해 주세요.`,
        };
      }
    }
  }

  if (!f.name.trim()) E.name = '프로모션 명을 입력하여 주시길 바랍니다';
  if (!f.sub.trim()) E.sub = '서브 타이틀을 입력하여 주시길 바랍니다';
  if (!f.channels.length) E.channels = '전시 채널을 선택하여 주시길 바랍니다';

  const d = period(f.dispS, f.dispE, '전시 기간', f.dispNoEnd);
  if (d) E.disp = d;

  if (f.scope === '제한 공개') {
    if (f.access === '지정 고객' && !f.target) E.target = '대상자 명단 파일을 업로드하여 주시길 바랍니다';
    if (f.access === '조건 고객') {
      const r = validateCond(f.accessCond, true);
      condErrors = r.errors;
      if (r.top) E.accessCond = r.top;
    }
  }

  if (f.type !== '안내형') {
    const j = period(f.joinS, f.joinE, '참여 기간');
    if (j) E.join = j;
  }
  if (f.cmt === '사용' && f.block === '사용') {
    const b = period(f.blockS, f.blockE, '댓글 차단 기간');
    if (b) E.block = b;
  }
  if (!f.img) E.img = '이벤트 목록 이미지를 등록하여 주시길 바랍니다.';

  if (f.cta !== '미사용') {
    f.ctas.forEach((c) => {
      if (!c.name.trim()) E[`ctaName${c.id}`] = 'CTA명을 입력하여 주시길 바랍니다';
      if (c.type === '링크 버튼') {
        if (c.link === 'URL') { if (!c.url.trim()) E[`ctaUrl${c.id}`] = 'CTA URL을 입력하여 주시길 바랍니다'; }
        else if (!c.pg) E[`ctaPg${c.id}`] = '연결할 페이지를 조회해 선택해주세요';
      }
      if (c.per === '직접 지정') {
        if (!c.ps || !c.pe) E[`ctaPer${c.id}`] = '노출 기간을 입력해주세요';
        else if (c.ps > c.pe) E[`ctaPer${c.id}`] = '노출 기간의 종료일이 시작일보다 빠를 수 없습니다.';
      }
      if (!hexOk(c.bg)) E[`ctaBg${c.id}`] = '#을 포함한 6자리 HEX 코드로 입력해 주세요 (예: #3A2EE6)';
      if (!hexOk(c.fg)) E[`ctaFg${c.id}`] = '#을 포함한 6자리 HEX 코드로 입력해 주세요 (예: #3A2EE6)';
    });
  }

  // 제한 공개는 검색에 노출되지 않으므로 태그도 받지 않는다
  if (f.scope !== '제한 공개' && f.search === '노출' && !f.tags.length) {
    E.tags = '검색 태그를 등록하여 주시길 바랍니다';
  }

  if (f.type !== '안내형' && f.guest === '허용' && !f.guestFields.some((g) => g.use)) {
    E.guestField = '개인정보 입력 항목을 1개 이상 사용으로 설정해주세요';
  }

  if (f.type === '추천형') {
    Object.assign(E, validateRef(f.ref));
    [f.ref.invCond, f.ref.ineCond, f.ref.invPayCond, f.ref.inePayCond].forEach((nodes, i) => {
      const r = validateCond(nodes);
      if (r.top) { E[`refCond${i}`] = r.top; Object.assign(condErrors, r.errors); }
    });
  }

  if (f.type === '참여ㆍ리워드형') {
    const r = validatePr(prOf(f), f.maxJoin);
    if (r.alert) return { errors: E, condErrors, alert: r.alert };
    Object.assign(E, r.errors);
    // 참여 조건 · 지급 조건은 선택 입력 — 값이 틀렸을 때만 막는다
    const jc = validateCond(f.joinCond);
    if (jc.top) { E.joinCond = jc.top; Object.assign(condErrors, jc.errors); }
    f.blocks.forEach((b) => {
      const pc = validateCond(b.payCond);
      if (pc.top) { E[`payCond${b.id}`] = pc.top; Object.assign(condErrors, pc.errors); }
    });
  }

  return { errors: E, condErrors, alert: null };
}
