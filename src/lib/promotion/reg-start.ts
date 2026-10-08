/**
 * 프로모션 등록 시작 — 유형 결정 모델.
 *  두 가지 길이 있다.
 *   · 직접 선택 : 생성 대상(이벤트/미션/기획전) → (이벤트면) 유형 3종 → (참여ㆍ리워드형이면) 참여 방식
 *   · 문답      : what → (이벤트면) join → (참여면) invite 순으로 묻고 유형을 추천
 *  답에 따라 질문이 생략되므로 스테퍼는 "최대 질문 수 + 결과 1칸"으로 고정하고 생략 칸을 점선으로 둔다.
 */

export type CatKey = '이벤트' | '미션' | '기획전';
export type EventType = '안내형' | '참여ㆍ리워드형' | '추천형';
/** 참여 방식 — 직접(수동) / 행동(자동) */
export type JoinMode = '직접' | '행동';

export const CATS: { k: CatKey; d: string }[] = [
  { k: '이벤트', d: '안내, 참여ㆍ리워드, 추천 등 고객 대상 이벤트' },
  { k: '미션', d: '출석, 누적, 단계 완료 등 고객이 달성하는 미션' },
  { k: '기획전', d: '여러 상품이나 이벤트를 한 페이지에 묶어 노출' },
];

export const TYPES: { k: EventType; d: string }[] = [
  { k: '안내형', d: '고객 참여 없이 신규 서비스, 이벤트 소식, 상품 모음 등 정보를 안내' },
  { k: '참여ㆍ리워드형', d: '응모, 구매/가입, 초청 등 고객이 참여 조건을 충족하면 리워드를 지급' },
  { k: '추천형', d: '친구를 초대(추천)하면 초대자와 피초대자 모두에게 리워드를 지급' },
];

export const JM_LABEL: Record<JoinMode, string> = { 직접: '직접 참여(수동)', 행동: '행동 연동(자동)' };
export const JM_GUIDE: Record<JoinMode, string> = {
  직접: '이벤트 화면에서 응모·설문·룰렛 등을 해야 참여가 완료돼요',
  행동: '구매·예약·가입·개통 등의 결과로 참여 처리돼요',
};

export const JM_OPTS: [JoinMode, string, string][] = [
  ['직접', '이벤트 화면에서 직접 참여해요', '응모·설문·룰렛 등을 해야 참여가 완료돼요'],
  ['행동', '다른 화면에서 행동을 완료하면 참여돼요', '구매·예약·가입·개통 등의 결과로 참여 처리돼요'],
];

export type QKey = 'what' | 'join' | 'invite';
export type QOpt = { v: string; l: string; ic: string; d: string; ex?: string[] };
export const Q: Record<QKey, { t: string; s: string; opts: QOpt[] }> = {
  what: {
    t: '무엇을 생성하시나요?',
    s: '생성할 대상에 따라 이어지는 질문이 달라져요.',
    opts: [
      { v: '이벤트', l: '이벤트', ic: '이벤트', d: '고객에게 소식을 알리거나 참여를 받아 리워드를 지급해요' },
      { v: '미션', l: '미션', ic: '미션', d: '고객이 정해진 행동을 달성하면 보상을 받아요' },
      { v: '기획전', l: '기획전', ic: '기획전', d: '여러 이벤트와 혜택을 한 페이지에 묶어 노출해요' },
    ],
  },
  join: {
    t: '고객이 이벤트에 참여하는 과정이 있나요?',
    s: '응모, 구매·가입, 친구 초대처럼 고객의 참여 이력이 남는지 확인해요.',
    opts: [
      { v: '네', l: '네, 참여 과정이 있어요', ic: '참여ㆍ리워드형', d: '고객이 참여하고, 조건에 따라 리워드를 받아요', ex: ['경품 응모', '구매·가입 인증', '초청 이벤트', '친구 초대'] },
      { v: '아니요', l: '아니요, 정보만 전달해요', ic: '안내형', d: '참여 이력 없이 소식이나 혜택, 상품 정보를 보여줘요', ex: ['신규 서비스 오픈 안내', '혜택 소식', '상품 모음 페이지'] },
    ],
  },
  invite: {
    t: '고객의 참여는 어떻게 이루어지나요?',
    s: '참여가 언제 완료되는지에 따라 등록 화면의 참여 설정이 달라져요.',
    opts: [
      { v: '직접', l: '이벤트 화면에서 직접 참여해요', ic: '참여ㆍ리워드형', d: '고객이 이벤트 화면에서 응모·설문·룰렛 등을 해야 참여가 완료돼요', ex: ['응모 버튼', '설문', '룰렛'] },
      { v: '행동', l: '다른 화면에서 행동을 완료하면 참여돼요', ic: '참여ㆍ리워드형', d: '구매·예약·가입·개통 등의 결과를 확인해 참여로 처리해요', ex: ['자동응모', '사전예약', '외부 서비스'] },
      { v: '추천', l: '친구 초대(추천)로 참여해요', ic: '추천형', d: '초대한 사람과 초대받은 사람이 나뉘고, 각각 리워드 조건이 있어요', ex: ['추천 코드 입력', '초대 링크 공유'] },
    ],
  },
};

export type Answers = Partial<Record<QKey, string>>;

/** 답에 따라 실제로 묻게 되는 질문 순서 */
export function qaPath(a: Answers): QKey[] {
  const p: QKey[] = ['what'];
  if (a.what === '이벤트') { p.push('join'); if (a.join === '네') p.push('invite'); }
  return p;
}

/** 지금까지의 답으로 확정되는 유형 (아직이면 null) */
export function qaResult(a: Answers): CatKey | EventType | null {
  if (a.what === '미션' || a.what === '기획전') return a.what as CatKey;
  if (a.what === '이벤트') {
    if (a.join === '아니요') return '안내형';
    if (a.join === '네' && a.invite) return a.invite === '추천' ? '추천형' : '참여ㆍ리워드형';
  }
  return null;
}

/** 가능한 최대 질문 수 (스테퍼 칸 수 계산용) */
function maxDepth(a: Answers): number {
  const p = qaPath(a);
  if (p.every((k) => a[k])) return p.length;
  const k = p.find((x) => !a[x]) as QKey;
  return Math.max(...Q[k].opts.map((o) => maxDepth({ ...a, [k]: o.v })));
}
export const MAX_Q = maxDepth({});

export const isEventType = (t: string): t is EventType => TYPES.some((x) => x.k === t);
export const typeLabel = (t: string) => (isEventType(t) ? `이벤트 > ${t}` : t);
export const catOf = (t: string): CatKey => (isEventType(t) ? '이벤트' : (t as CatKey));
