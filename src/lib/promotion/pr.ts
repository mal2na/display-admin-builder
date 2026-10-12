/**
 * 참여 · 리워드 (참여ㆍ리워드형 전용) — 상태 모델 · 연동 규칙 · 검증.
 *  (프로토타입의 prSection / rewardBlock / syncRules / syncRewards / allocSync / lineSync 이식)
 *
 * 규칙이 서로 얽혀 있다. 한 곳(applyRules)에서만 풀고 나머지는 결과만 읽는다.
 *   참여 방식 '행동 연동(자동)'  → 실시간 선정 불가 · 선택형 불가
 *   참여 행동에 룰렛             → 추첨 + 자동 추첨 + 실시간 선정으로 고정 · 선택형 불가 · 리워드 정보 1개
 *   추첨 + 수동 추첨             → 실시간 선정 불가
 *   리워드 유형                  → 쓸 수 있는 지급 방식이 제한된다(PAY_OK)
 *   지급 방식 '수기/대행사'      → '대상자 선정 시' 지급 불가 → '추후'
 *   지급 방식 '고객 수령'        → 지급 일시 대신 수령 가능 기간
 */

/* ── 참여 행동 ─────────────────────────────────────────────────── */
export const JA_TYPES = ['버튼 참여', '설문', '정보 입력', '즉시 결과형(룰렛)', '공유 참여'] as const;
export type JaType = typeof JA_TYPES[number];

/** 설문 마스터 (예시 데이터) */
export const SEL_SRC = [
  { id: 'SV0012', q: '이번 달 가장 기대되는 혜택은?' },
  { id: 'SV0018', q: '요금제 선택 시 가장 중요한 기준은?' },
  { id: 'SV0021', q: '최근 3개월 내 이용한 제휴 서비스는?' },
  { id: 'SV0030', q: 'T 멤버십에서 더 보고 싶은 혜택은?' },
];
/** 리뷰를 쓰는 상품 페이지 (예시 데이터) */
export const RV_PAGES = [
  { id: 'PG000711', name: 'Galaxy S26 상세', cnt: 1284 },
  { id: 'PG000712', name: 'iPhone 18 Pro 상세', cnt: 2033 },
  { id: 'PG000730', name: 'Galaxy Watch8 상세', cnt: 412 },
];

export type RoulResult = { id: number; name: string; pay: 'Y' | 'N' };
export type JaItem = {
  id: number;
  type: JaType;
  /** 설문 */ selId: string;
  /** 정보 입력 */ inKind: '기존 입력 구성요소' | '코드 입력';
  comp: '이벤트 댓글' | '상품 리뷰';
  pgId: string;
  codeKind: '공통 코드 1개' | '개별 코드 일괄 생성' | '외부 발급 코드';
  codeVal: string;
  codeQty: string;
  /** 룰렛 */ results: RoulResult[];
};

let jaSeq = 0; let rrSeq = 0;
export const newRoulResult = (name = '', pay: 'Y' | 'N' = 'Y'): RoulResult => ({ id: (rrSeq += 1), name, pay });
export function newJaItem(type: JaType = '버튼 참여'): JaItem {
  jaSeq += 1;
  return {
    id: jaSeq, type,
    selId: '', inKind: '기존 입력 구성요소', comp: '이벤트 댓글', pgId: '',
    codeKind: '공통 코드 1개', codeVal: '', codeQty: '100',
    results: [newRoulResult('1등'), newRoulResult('2등'), newRoulResult('3등'), newRoulResult('꽝', 'N')],
  };
}

/** 참여 행동별 안내 — 누르기만 하는 참여는 하단 CTA, 화면에서 조작하는 참여는 빌더 컴포넌트 */
export function jaHint(it: JaItem): string {
  switch (it.type) {
    case '버튼 참여': return "하단 CTA에 '이벤트 참여 버튼'이 자동으로 추가돼요";
    case '공유 참여': return '카카오톡 공유 전송 완료 시 참여로 인정해요 (개발 확인 필요)';
    case '설문': return "빌더 상세 영역에 '설문 컴포넌트'를 배치해야 FO에 노출돼요 (컴포넌트 안 '제출'로 참여)";
    case '즉시 결과형(룰렛)': return "빌더 상세 영역에 '룰렛 컴포넌트'를 배치해야 FO에 노출돼요 (컴포넌트 안 '돌리기'로 참여)";
    case '정보 입력':
      return it.inKind === '코드 입력'
        ? "빌더 상세 영역에 '코드 입력 컴포넌트'를 배치해야 FO에 노출돼요 (컴포넌트 안 '등록'으로 참여)"
        : '';
    default: return '';
  }
}

/* ── 리워드 ────────────────────────────────────────────────────── */
export const RTYPES = ['제휴사 쿠폰', '제휴사 바우처', 'SKT 쿠폰·이용권', 'T 플러스 포인트', '데이터 혜택', '실물 경품'];
export const PAY_M = ['자동 지급', 'SKT 담당자 수기 지급', '대행사·제휴사 지급', '고객 수령'];
/** 유형별로 쓸 수 있는 지급 방식 (리뷰어 v28 혜택 정책 기준) */
export const PAY_OK: Record<string, string[]> = {
  '제휴사 쿠폰': ['자동 지급', 'SKT 담당자 수기 지급', '대행사·제휴사 지급', '고객 수령'],
  '제휴사 바우처': ['자동 지급', 'SKT 담당자 수기 지급', '대행사·제휴사 지급', '고객 수령'],
  'SKT 쿠폰·이용권': ['자동 지급', 'SKT 담당자 수기 지급', '고객 수령'],
  'T 플러스 포인트': ['자동 지급'],
  '데이터 혜택': ['자동 지급'],
  '실물 경품': ['SKT 담당자 수기 지급', '대행사·제휴사 지급'],
};
/** 마스터 조회가 필요한 유형 — [키, 라벨, 버튼명] */
export const RPICK: Record<string, [string, string, string]> = {
  'SKT 쿠폰·이용권': ['skt', '쿠폰·이용권', 'SKT 쿠폰·이용권 조회'],
};
/** 조회 팝업 예시값 */
export const RPICK_SAMPLE: Record<string, string[]> = {
  skt: ['T다이렉트샵 2만원 이용권', 'T 멤버십 영화 예매권', '데이터 쿠폰 1GB'],
};

export type RewardLine = {
  id: number;
  type: string;
  method: string;
  /** 유형 상세 */
  pick: string[];            // RPICK 유형
  detail: string;            // 실물 경품 경품명
  point: string; usable: string; expire: string;   // T 플러스 포인트
  dataAmt: string; dataUnit: 'GB' | 'MB'; dataExp: string; // 데이터 혜택
  code: string; url: string; btn: string;          // 제휴사 쿠폰·바우처
  /** 지급 시점 */
  payWhen: '대상자 선정 시' | '추후';
  payAt: string;
  claimS: string; claimE: string;
};
export type RewardItem = { id: number; name: string; cnt: string; lines: RewardLine[]; roulId?: number };
export type RewardBlock = {
  id: number;
  selM: '구간형' | '선택형';
  selN: string;
  winWay: '전원' | '선착순' | '추첨';
  draw: '수동' | '자동';
  tot: string;
  winAt: '실시간' | '사후';
  notice: string;
  payCond: import('./cond').CondNode[];
  items: RewardItem[];
};

let rlSeq = 0; let itSeq = 0; let rbSeq = 0;
export function newLine(): RewardLine {
  rlSeq += 1;
  return {
    id: rlSeq, type: '', method: '',
    pick: [], detail: '',
    point: '', usable: '즉시 지급', expire: '',
    dataAmt: '', dataUnit: 'GB', dataExp: '',
    code: '', url: '', btn: '',
    payWhen: '대상자 선정 시', payAt: '', claimS: '', claimE: '',
  };
}
export function newItem(): RewardItem { itSeq += 1; return { id: itSeq, name: '', cnt: '', lines: [newLine()] }; }
export function newBlock(): RewardBlock {
  rbSeq += 1;
  return {
    id: rbSeq, selM: '구간형', selN: '', winWay: '전원', draw: '수동', tot: '',
    winAt: '실시간', notice: '일반 선정 안내', payCond: [], items: [newItem()],
  };
}

/* ── 연동 규칙 ─────────────────────────────────────────────────── */
export type PrState = { jm: '직접' | '행동'; ja: JaItem[]; blocks: RewardBlock[] };

export const hasRoulette = (s: PrState) => s.jm === '직접' && s.ja.some((j) => j.type === '즉시 결과형(룰렛)');
/** 룰렛 결과 중 리워드 지급 Y 만 — 첫 리워드 블록의 구간이 된다 */
export const roulYs = (s: PrState): RoulResult[] =>
  (hasRoulette(s) ? (s.ja.find((j) => j.type === '즉시 결과형(룰렛)')?.results ?? []) : []).filter((r) => r.pay === 'Y');

/** 선택형(고객이 리워드를 고름) */
export const isPick = (b: RewardBlock) => b.selM === '선택형';
/** 전원 지급 — 항목별 수령 인원을 받지 않는다 */
export const isAll = (b: RewardBlock) => b.winWay === '전원';
/** 전체 수령 인원 입력 줄을 보여줄지 */
export const showTot = (b: RewardBlock) => !isAll(b) && !isPick(b);

/** 블록별로 지금 쓸 수 있는 값과 잠김 사유 */
export type BlockLock = {
  roul: boolean; auto: boolean;
  winWayLocked: boolean; drawLocked: boolean;
  realtimeLocked: boolean; postLocked: boolean; pickLocked: boolean;
  wayNote: string; drawNote: string; winAtNote: string; selMNote: string;
};
export function blockLock(s: PrState, b: RewardBlock, first: boolean): BlockLock {
  const roul = hasRoulette(s) && first;
  const auto = s.jm === '행동';
  const manDraw = b.winWay === '추첨' && b.draw === '수동';
  const realtimeLocked = auto || manDraw;
  return {
    roul, auto,
    winWayLocked: roul, drawLocked: roul,
    realtimeLocked, postLocked: roul,
    pickLocked: auto || roul,
    wayNote: roul ? '참여 행동에 룰렛이 있으면 추첨으로 고정돼요' : '',
    drawNote: roul ? '룰렛은 참여 즉시 시스템이 추첨해요' : '',
    winAtNote: roul
      ? '룰렛은 참여 즉시 결과가 나와 실시간 선정만 설정할 수 있어요.'
      : realtimeLocked
        ? `${auto && manDraw ? "참여 방식 '행동 연동(자동)', 추첨 방식 '수동'" : auto ? "참여 방식 '행동 연동(자동)'" : "추첨 방식 '수동'"}이면 사후 선정만 설정할 수 있어요.`
        : '',
    selMNote: auto
      ? "참여 방식 '행동 연동(자동)'이면 고객이 리워드를 고를 단계가 없어 구간형만 설정할 수 있어요."
      : roul ? '참여 행동에 룰렛이 있으면 구간형만 설정할 수 있어요.' : '',
  };
}

/** 잠긴 값들을 실제로 밀어넣는다 — 상태를 바꿀 때마다 한 번 통과시킨다 */
export function applyRules(s: PrState): PrState {
  const blocks = s.blocks.map((b, i) => {
    const L = blockLock(s, b, i === 0);
    let n = { ...b };
    if (L.roul) n = { ...n, winWay: '추첨', draw: '자동', winAt: '실시간' };
    else if (L.realtimeLocked && n.winAt === '실시간') n = { ...n, winAt: '사후' };
    if (L.pickLocked && n.selM === '선택형') {
      n = { ...n, selM: '구간형' };
      if (n.winWay === '전원' && n.items.length > 1) n = { ...n, winWay: '추첨' };
    }
    if (isAll(n)) n = { ...n, items: n.items.map((it) => ({ ...it, cnt: '' })) };
    if (!showTot(n)) n = { ...n, tot: '' };
    if (!isPick(n)) n = { ...n, selN: '' };
    // 리워드 줄 — 유형이 지급 방식을 제한하고, 수기 지급은 '추후'만
    n = {
      ...n,
      items: n.items.map((it) => ({
        ...it,
        lines: it.lines.map((l) => {
          let x = { ...l };
          const ok = PAY_OK[x.type] ?? PAY_M;
          if (x.type && x.method && !ok.includes(x.method)) x.method = ok[0];
          const manual = x.method === 'SKT 담당자 수기 지급' || x.method === '대행사·제휴사 지급';
          if (manual && x.payWhen === '대상자 선정 시') x = { ...x, payWhen: '추후' };
          if (x.payWhen !== '추후') x = { ...x, payAt: '' };
          if (x.method !== '고객 수령') x = { ...x, claimS: '', claimE: '' };
          return x;
        }),
      })),
    };
    return n;
  });

  // 룰렛이면 첫 블록의 구간 = 지급 Y 결과 순서, 리워드 정보는 1개만
  const ys = roulYs(s);
  if (ys.length && blocks[0]) {
    const cur = blocks[0].items;
    const byRoul = new Map(cur.filter((c) => c.roulId).map((c) => [c.roulId as number, c]));
    const free = cur.filter((c) => !c.roulId);
    const items = ys.map((y) => {
      const hit = byRoul.get(y.id);
      if (hit) return hit;
      const next = free.shift() ?? newItem();
      return { ...next, roulId: y.id };
    });
    blocks[0] = { ...blocks[0], items };
  } else if (blocks[0]) {
    blocks[0] = { ...blocks[0], items: blocks[0].items.map(({ roulId: _r, ...rest }) => rest) };
  }

  return { ...s, blocks };
}

/** 리워드별 수령 인원 합계 배지 */
export function allocBadge(b: RewardBlock): { tone: 'sum' | 'ok' | 'bad'; text: string } | null {
  if (isAll(b)) return null;
  const f = (v: number) => v.toLocaleString('ko-KR');
  const sum = b.items.reduce((a, it) => a + (Number(it.cnt) || 0), 0);
  if (isPick(b)) return { tone: 'sum', text: `합계 ${f(sum)}명` };
  const tot = Number(b.tot) || 0;
  if (!tot) return { tone: 'sum', text: `배분 ${f(sum)}명` };
  if (sum === tot) return { tone: 'ok', text: `배분 ${f(sum)} / ${f(tot)}명 · 완료` };
  return {
    tone: 'bad',
    text: sum < tot ? `배분 ${f(sum)} / ${f(tot)}명 · ${f(tot - sum)}명 남음` : `배분 ${f(sum)} / ${f(tot)}명 · ${f(sum - tot)}명 초과`,
  };
}

/** 하단 CTA 자동 추가가 필요한지 */
export const needJoinCta = (s: PrState) => s.jm === '직접' && s.ja.some((j) => j.type === '버튼 참여');
export const needClaimCta = (s: PrState) =>
  s.blocks.some((b) => b.items.some((it) => it.lines.some((l) => l.method === '고객 수령')));

/* ── 검증 ──────────────────────────────────────────────────────── */
export function validatePr(s: PrState, maxJoin: string): { errors: Record<string, string>; alert: string | null } {
  const E: Record<string, string> = {};

  if (hasRoulette(s) && s.blocks.length > 1) {
    return { errors: E, alert: '참여 행동에 룰렛이 있으면 리워드 정보는 1개만 등록할 수 있습니다.\n추가한 리워드 정보를 삭제해 주세요.' };
  }
  for (const b of s.blocks) {
    if (!isPick(b)) continue;
    const v = Number(b.selN);
    if (v && v >= b.items.length) {
      return { errors: E, alert: `리워드 선택 가능 수는 리워드 항목 수(${b.items.length}개)보다 적게 입력해 주세요.` };
    }
  }

  // 참여 행동
  if (s.jm === '직접') {
    const msgs: string[] = [];
    const multi = s.ja.length > 1;
    s.ja.forEach((it, k) => {
      const pre = multi ? `참여 행동 ${k + 1}: ` : '';
      let m = '';
      if (it.type === '설문' && !it.selId) m = '설문을 조회해 선택해주세요';
      if (it.type === '정보 입력' && it.inKind === '코드 입력' && it.codeKind === '공통 코드 1개' && !it.codeVal.trim()) m = '참여 코드를 입력하거나 자동 생성해주세요';
      if (it.type === '정보 입력' && it.inKind === '기존 입력 구성요소' && it.comp === '상품 리뷰' && !it.pgId) m = '리뷰 페이지를 조회해 선택해주세요';
      if (it.type === '즉시 결과형(룰렛)' && it.results.some((r) => !r.name.trim())) m = '결과 항목명을 입력해주세요';
      if (m) msgs.push(pre + m);
    });
    if (msgs.length) E.ja = msgs.join(' / ');
  }
  if (!maxJoin) E.maxJoin = '참여횟수를 입력해주시길 바랍니다.';

  s.blocks.forEach((b) => {
    if (isPick(b) && !b.selN) E[`selN${b.id}`] = '리워드 선택 가능 수를 입력해주세요';
    if (!isPick(b) && isAll(b) && b.items.length > 1) {
      E[`rb${b.id}`] = "대상자 선정 방식이 '전원'인 통합 응모는 리워드 항목을 1개만 설정할 수 있습니다.";
    }
    if (showTot(b)) {
      const tot = Number(b.tot) || 0;
      if (!tot) E[`tot${b.id}`] = '전체 리워드 수령 인원을 입력해주세요';
      else {
        const cs = b.items.map((it) => it.cnt);
        if (cs.length >= 2 && cs.every((c) => c !== '')) {
          const sum = cs.reduce((a, c) => a + (Number(c) || 0), 0);
          if (sum !== tot && !E[`rb${b.id}`]) {
            E[`rb${b.id}`] = `리워드별 수령 인원 합계(${sum.toLocaleString('ko-KR')}명)가 전체 리워드 수령 인원(${tot.toLocaleString('ko-KR')}명)과 일치해야 해요.`;
          }
        }
      }
    }
    b.items.forEach((it) => {
      if (!it.name.trim()) E[`it${it.id}_name`] = '사용자 노출명을 입력해주세요';
      if (!isAll(b) && !it.cnt) E[`it${it.id}_cnt`] = '리워드 수령 인원을 입력해주세요';
      it.lines.forEach((l) => {
        const k = `rw${l.id}`;
        if (!l.type) E[`${k}_type`] = '유형을 선택해주세요';
        if (RPICK[l.type] && !l.pick.length) E[`${k}_pick`] = `${RPICK[l.type][1]}을(를) 선택해주세요`;
        if (l.type === '실물 경품' && !l.detail.trim()) E[`${k}_detail`] = '경품명을(를) 입력해주세요';
        if (l.type === 'T 플러스 포인트') {
          if (!l.point.trim()) E[`${k}_point`] = '지급 포인트을(를) 입력해주세요';
          if (!l.expire) E[`${k}_expire`] = '소멸 예정일을(를) 입력해주세요';
        }
        if (l.type === '데이터 혜택') {
          if (!l.dataAmt.trim()) E[`${k}_dataAmt`] = '데이터 용량을(를) 입력해주세요';
          if (!l.dataExp) E[`${k}_dataExp`] = '사용 기한을(를) 입력해주세요';
        }
        if (l.type === '제휴사 쿠폰' || l.type === '제휴사 바우처') {
          const kind = l.type === '제휴사 바우처' ? '제휴사 바우처 연동코드' : '제휴사 쿠폰 연동코드';
          if (!l.code.trim()) E[`${k}_code`] = `${kind}을(를) 입력해주세요`;
          if (!l.url.trim()) E[`${k}_url`] = '제휴사 URL을(를) 입력해주세요';
          if (!l.btn.trim()) E[`${k}_btn`] = '제휴사 URL 버튼명을(를) 입력해주세요';
        }
        if (!l.method) E[`${k}_method`] = '지급 방식을 선택해주세요';
        if (l.method === '고객 수령') {
          if (!l.claimS || !l.claimE) E[`${k}_payAt`] = '수령 가능 기간을 입력해주세요';
          else if (l.claimS > l.claimE) E[`${k}_payAt`] = '수령 가능 기간의 종료일이 시작일보다 빠를 수 없습니다.';
        } else if (l.payWhen === '추후' && !l.payAt) E[`${k}_payAt`] = '지급 일시를 입력해주세요';
      });
    });
  });

  return { errors: E, alert: null };
}


/* ── 추천형 ────────────────────────────────────────────────────── */
/** 초대자는 단계(달성 인원 수)를 갖고, 피초대자는 단계 없이 1장이다 */
export type RefCard = { id: number; name: string; thr: string; lines: RewardLine[] };

export type RefState = {
  invCond: import('./cond').CondNode[];
  ineCond: import('./cond').CondNode[];
  invLimit: '제한 없음' | '제한';
  maxInvite: string;
  invPayCond: import('./cond').CondNode[];
  inePayCond: import('./cond').CondNode[];
  inviter: RefCard[];
  invitee: RefCard;
};

let refSeq = 0;
export function newRefCard(): RefCard { refSeq += 1; return { id: 10000 + refSeq, name: '', thr: '', lines: [newLine()] }; }

export function emptyRef(): RefState {
  return {
    invCond: [], ineCond: [],
    invLimit: '제한 없음', maxInvite: '',
    invPayCond: [], inePayCond: [],
    inviter: [newRefCard()],
    invitee: newRefCard(),
  };
}

/** 단계는 앞 단계보다 큰 인원이어야 한다 */
export function thrErrors(inviter: RefCard[]): Record<string, string> {
  const E: Record<string, string> = {};
  let prev: number | null = null; let prevIdx = 0;
  inviter.forEach((c, idx) => {
    const v = c.thr;
    if (v && prev !== null && +v <= prev) E[`it${c.id}_thr`] = `${prevIdx}단계(${prev}명)보다 큰 수를 입력해주세요`;
    if (v) { prev = +v; prevIdx = idx + 1; }
  });
  return E;
}

/** 리워드 줄 하나 검증 — 리워드 목록과 추천형이 같이 쓴다 */
export function lineErrors(l: RewardLine): Record<string, string> {
  const E: Record<string, string> = {};
  const k = `rw${l.id}`;
  if (!l.type) E[`${k}_type`] = '유형을 선택해주세요';
  if (RPICK[l.type] && !l.pick.length) E[`${k}_pick`] = `${RPICK[l.type][1]}을(를) 선택해주세요`;
  if (l.type === '실물 경품' && !l.detail.trim()) E[`${k}_detail`] = '경품명을(를) 입력해주세요';
  if (l.type === 'T 플러스 포인트') {
    if (!l.point.trim()) E[`${k}_point`] = '지급 포인트을(를) 입력해주세요';
    if (!l.expire) E[`${k}_expire`] = '소멸 예정일을(를) 입력해주세요';
  }
  if (l.type === '데이터 혜택') {
    if (!l.dataAmt.trim()) E[`${k}_dataAmt`] = '데이터 용량을(를) 입력해주세요';
    if (!l.dataExp) E[`${k}_dataExp`] = '사용 기한을(를) 입력해주세요';
  }
  if (l.type === '제휴사 쿠폰' || l.type === '제휴사 바우처') {
    const kind = l.type === '제휴사 바우처' ? '제휴사 바우처 연동코드' : '제휴사 쿠폰 연동코드';
    if (!l.code.trim()) E[`${k}_code`] = `${kind}을(를) 입력해주세요`;
    if (!l.url.trim()) E[`${k}_url`] = '제휴사 URL을(를) 입력해주세요';
    if (!l.btn.trim()) E[`${k}_btn`] = '제휴사 URL 버튼명을(를) 입력해주세요';
  }
  if (!l.method) E[`${k}_method`] = '지급 방식을 선택해주세요';
  if (l.method === '고객 수령') {
    if (!l.claimS || !l.claimE) E[`${k}_payAt`] = '수령 가능 기간을 입력해주세요';
    else if (l.claimS > l.claimE) E[`${k}_payAt`] = '수령 가능 기간의 종료일이 시작일보다 빠를 수 없습니다.';
  } else if (l.payWhen === '추후' && !l.payAt) E[`${k}_payAt`] = '지급 일시를 입력해주세요';
  return E;
}

/** 리워드 줄의 잠김 규칙 — 지급 방식 제한, 수기 지급은 '추후'만 */
export function normalizeLine(l: RewardLine): RewardLine {
  let x = { ...l };
  const ok = PAY_OK[x.type] ?? PAY_M;
  if (x.type && x.method && !ok.includes(x.method)) x.method = ok[0];
  const manual = x.method === 'SKT 담당자 수기 지급' || x.method === '대행사·제휴사 지급';
  if (manual && x.payWhen === '대상자 선정 시') x = { ...x, payWhen: '추후' };
  if (x.payWhen !== '추후') x = { ...x, payAt: '' };
  if (x.method !== '고객 수령') x = { ...x, claimS: '', claimE: '' };
  return x;
}

export function validateRef(r: RefState): Record<string, string> {
  const E: Record<string, string> = {};
  if (r.invLimit === '제한' && !r.maxInvite) E.maxInvite = '최대 초대 인정 수를 입력해주세요';
  const cards = [...r.inviter, r.invitee];
  cards.forEach((c) => {
    if (!c.name.trim()) E[`it${c.id}_name`] = '사용자 노출명을 입력해주세요';
    c.lines.forEach((l) => Object.assign(E, lineErrors(l)));
  });
  r.inviter.forEach((c) => { if (!c.thr) E[`it${c.id}_thr`] = '달성 인원 수를 입력해주세요'; });
  Object.assign(E, thrErrors(r.inviter));
  return E;
}
