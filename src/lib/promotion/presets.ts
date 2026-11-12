/**
 * 프로모션 설정 예시 프리셋 — public/promotion-prototype.html 의 PRESETS(EX) 를 PromoForm 으로 옮긴 것.
 *  목록의 「예시」 행(ex 키)을 누르면 이 프리셋으로 상세/FO 미리보기가 채워진다(2026-11-12).
 *  공개/참여 조건은 프로토타입이 텍스트로만 들고 있어(CondNode 아님) 비워두고, 눈에 보이는
 *  값(서브타이틀·기간·채널·유의사항·CTA·리워드/추천 구성)을 채운다.
 */
import { emptyForm, newCta, normalize, type PromoForm } from './form';
import { newLine, newItem, newBlock, newRefCard, type RewardBlock, type RewardItem, type RewardLine, type RefCard } from './pr';
import { newRow, newGroup, type CondNode, type Picked } from './cond';
import type { JoinMode } from './reg-start';
import type { CtaBlock } from './form';

type RawLine = { type?: string; method?: string; detail?: string; text?: string; code?: string; url?: string; btn?: string; payAt?: string };
type RawItem = { name: string; cnt?: number; lines: RawLine[] };
type RawBlock = { way: string; at: string; entry?: string; items: RawItem[] };
type RawCard = { name: string; thr?: number; lines: RawLine[] };
type RawCta = { type: string; name: string; url?: string };
type RawCb = { key: string; prods?: { name: string; type: string }[]; acts?: string[] };

/** 프로토타입 cbJoin(구조화 조건) → 조건 빌더 CondNode[]. 상품 묶음 + 고객 조건만 간단히 옮긴다. */
function cbToCond(cb: RawCb[]): CondNode[] {
  return cb.map((c) => {
    if (c.key === 'prod') {
      const g = newGroup('prod');
      g.v = { ...g.v, prods: (c.prods ?? []).map((p) => ({ name: p.name, type: p.type })) as Picked[] };
      return g;
    }
    return newRow(c.key); // grade·ctype 등 고객 조건은 기본값으로
  });
}
type Preset = {
  type: string; name: string; sub: string; ch: string[];
  disp: [string, string]; join?: [string, string]; img: string; cmt: string;
  caution: string; cta: RawCta[]; tags: string[]; src: string;
  pr?: { cond?: string; way?: string; max?: number; dup?: string; blocks: RawBlock[]; cbJoin?: RawCb[] };
  ref?: {
    invcond?: string; inecond?: string; way?: string; limit?: string; dup?: string; inepay?: string;
    inviter: RawCard[]; invitee: RawCard;
  };
};

const line = (r: RawLine): RewardLine => ({
  ...newLine(),
  type: r.type ?? '', method: r.method ?? '',
  detail: r.detail ?? r.text ?? '',
  code: r.code ?? '', url: r.url ?? '', btn: r.btn ?? '',
  payWhen: '추후', payAt: r.payAt ?? '',
});
const item = (r: RawItem): RewardItem => ({ ...newItem(), name: r.name, cnt: r.cnt != null ? String(r.cnt) : '', lines: r.lines.map(line) });
const block = (r: RawBlock): RewardBlock => ({
  ...newBlock(),
  selM: r.entry === '선택 응모' ? '선택형' : '구간형',
  winWay: (r.way as RewardBlock['winWay']) ?? '전원',
  winAt: (r.at as RewardBlock['winAt']) ?? '실시간',
  items: r.items.map(item),
});
const card = (r: RawCard): RefCard => ({ ...newRefCard(), name: r.name, thr: r.thr != null ? String(r.thr) : '', lines: r.lines.map(line) });
const cta = (type: string, r: RawCta): CtaBlock => ({ ...newCta(type), type: r.type, name: r.name, ...(r.url ? { link: 'URL', url: r.url } : {}) });

export function presetForm(p: Preset): PromoForm {
  const jm: JoinMode = p.type === '참여ㆍ리워드형' ? '행동' : '직접';
  const base = emptyForm(p.type, jm);
  const f: PromoForm = {
    ...base,
    name: p.name, sub: p.sub, channels: p.ch.slice(),
    dispS: p.disp[0], dispE: p.disp[1], dispNoEnd: false,
    joinS: p.join?.[0] ?? '', joinE: p.join?.[1] ?? '',
    img: p.img, cmt: p.cmt === '사용' ? '사용' : '미사용',
    caution: p.caution,
    cta: p.cta.length ? '사용' : '미사용',
    ctas: p.cta.length ? p.cta.map((c) => cta(p.type, c)) : base.ctas,
    tags: p.tags.slice(),
    ogDesc: p.sub,
  };
  if (p.pr) {
    f.maxJoin = p.pr.max != null ? String(p.pr.max) : '';
    if (p.pr.dup) f.dup = p.pr.dup as PromoForm['dup'];
    f.blocks = p.pr.blocks.map(block);
    if (p.pr.cbJoin?.length) f.joinCond = cbToCond(p.pr.cbJoin);
  }
  if (p.ref) {
    f.ref = {
      ...base.ref,
      invLimit: p.ref.limit === '제한' ? '제한' : '제한 없음',
      inviter: p.ref.inviter.map(card),
      invitee: card(p.ref.invitee),
    };
  }
  return normalize(f);
}

/** 프로토타입 EX 와 같은 6개 예시(fc·ktm·pubg·run·iphone·jp). */
export const PRESETS: Record<string, Preset> = {
  jp: {
    type: '안내형', name: '[예시] T 멤버십 9월 일본 여행 혜택', sub: '후쿠오카·도쿄·오사카 제휴처에서 멤버십만 보여주세요', ch: ['PC', 'MO'],
    disp: ['2026-09-01T00:00', '2026-09-30T23:59'], img: 'japan_travel_list.png', cmt: '미사용',
    caution: '· T 멤버십 카드를 제휴처에 제시하면 혜택을 받을 수 있어요.\n· 일부 혜택은 바로 로밍 요금제 이용 고객만 받을 수 있어요.\n· 제휴처 사정에 따라 혜택이 조기 종료될 수 있어요.',
    cta: [{ type: '링크 버튼', name: '바로 로밍 요금제 보기', url: 'https://example.com/roaming' }], tags: ['일본여행', 'T멤버십', '로밍'],
    src: 'SKT 뉴스룸 · 9월 T 멤버십 혜택 (2026.09.01)',
  },
  iphone: {
    type: '참여ㆍ리워드형', name: '[예시] 아이폰18 개통 고객 카카오페이 쿠폰 증정', sub: '개통하면 전원 쿠폰, 추첨으로 한 번 더!', ch: ['PC', 'MO', '에이닷'],
    disp: ['2026-09-12T21:00', '2026-10-18T23:59'], join: ['2026-09-12T21:00', '2026-10-18T23:59'], img: 'iphone18_kakaopay.png', cmt: '미사용',
    pr: {
      way: '자동', max: 1, dup: '고객 기준(CI)',
      cbJoin: [{ key: 'prod', prods: [{ name: 'iPhone 18', type: '단말' }, { name: 'iPhone 18 Pro', type: '단말' }], acts: ['open'] }, { key: 'grade' }],
      blocks: [
        { way: '전원', at: '사후', items: [{ name: '기본 쿠폰 (1,000원 × 5장)', lines: [{ type: '제휴사 쿠폰', method: '자동 지급', code: 'KAKAOPAY_BASE_1000', url: 'https://example.com/kakaopay', btn: '쿠폰 등록하기', text: '카카오페이 1,000원 쿠폰 5장', payAt: '2026-09-19T10:00' }] }] },
        { way: '추첨', at: '사후', items: [{ name: '추가 쿠폰 (10,000원 × 5장)', cnt: 100, lines: [{ type: '제휴사 쿠폰', method: '자동 지급', code: 'KAKAOPAY_BONUS_10000', url: 'https://example.com/kakaopay', btn: '쿠폰 등록하기', text: '카카오페이 10,000원 쿠폰 5장', payAt: '2026-10-24T10:00' }] }] },
      ],
    },
    caution: '· 이벤트 기간 내 개통을 완료한 고객에게 자동으로 응모돼요.\n· 기본 쿠폰은 개통 고객 전원, 추가 쿠폰은 추첨 100명에게 지급해요.',
    cta: [{ type: '링크 버튼', name: '아이폰18 구매하기', url: 'https://example.com/iphone18' }], tags: ['아이폰18', '카카오페이', '개통혜택'],
    src: 'SKT 뉴스룸 · 아이폰18 사전예약 혜택 (2026.09.11)',
  },
  run: {
    type: '참여ㆍ리워드형', name: '[예시] 런메이트 가민 런 코리아 참가권 응모', sub: '10km·하프 중 원하는 코스를 골라 응모하세요', ch: ['PC', 'MO'],
    disp: ['2026-09-17T00:00', '2026-10-12T23:59'], join: ['2026-09-17T00:00', '2026-10-11T23:59'], img: 'runmate_garmin.png', cmt: '사용',
    pr: {
      way: '수동', max: 1, dup: '고객 기준(CI)',
      blocks: [
        { way: '추첨', at: '사후', entry: '선택 응모', items: [
          { name: '10km 참가권', cnt: 250, lines: [{ type: '실물 경품', detail: '2026 가민 런 코리아 10km 참가권', payAt: '2026-10-13T10:00' }] },
          { name: '하프 참가권', cnt: 250, lines: [{ type: '실물 경품', detail: '2026 가민 런 코리아 하프 참가권', payAt: '2026-10-13T10:00' }] },
        ] },
        { way: '추첨', at: '사후', items: [{ name: '러닝화', cnt: 20, lines: [{ type: '실물 경품', detail: '아디다스 아디제로 EVO SL', payAt: '2026-10-20T10:00' }] }] },
      ],
    },
    caution: '· 당첨자 발표: 2026.10.12\n· 대회일: 2026.11.15 (고양종합운동장)\n· 코스별 당첨 인원은 예시 값이에요.',
    cta: [{ type: '이벤트 참여 버튼', name: '응모하기' }], tags: ['런메이트', '러닝', '가민런'],
    src: 'SKT 뉴스룸 · 런메이트 러너 혜택 (2026.09.20)',
  },
  pubg: {
    type: '참여ㆍ리워드형', name: '[예시] Only One Choice — 의상 세트 골라 받기', sub: '붕대 6번 사용하고 6종 중 원하는 의상을 받으세요', ch: ['PC', 'MO'],
    disp: ['2026-09-10T00:00', '2026-11-04T23:59'], join: ['2026-09-10T00:00', '2026-11-04T23:59'], img: 'pubg_one_choice.png', cmt: '미사용',
    pr: {
      cond: '신규 플레이어(시작 14일 이내) · 붕대 6회 사용', way: '수동', max: 1, dup: '고객 기준(CI)',
      blocks: [{ way: '전원', at: '실시간', entry: '선택 응모', items: ['A', 'B', 'C', 'D', 'E', 'F'].map((x) => ({ name: `의상 세트 ${x}`, lines: [{ type: '실물 경품', detail: `한정 의상 세트 ${x}`, payAt: '2026-09-10T10:00' }] })) }],
    },
    caution: '· 6종 중 1개만 선택할 수 있어요.\n· 보상은 게임 내 보관함으로 지급돼요.',
    cta: [{ type: '이벤트 참여 버튼', name: '의상 선택하기' }], tags: ['PUBG', '의상', '신규'],
    src: 'PUBG 이벤트 공지 · 특별 보급 2026년 9월',
  },
  ktm: {
    type: '추천형', name: '[예시] 친구 초대하고 둘 다 포인트 받기', sub: '친구가 개통하면 나도 친구도 M마켓 포인트!', ch: ['PC', 'MO'],
    disp: ['2026-09-01T00:00', '2026-12-31T23:59'], join: ['2026-09-01T00:00', '2026-12-31T23:59'], img: 'friend_invite.png', cmt: '미사용',
    ref: {
      invcond: 'KT M모바일 이용 고객', inecond: '다이렉트몰 신규 개통 고객', way: '초대 링크', limit: '제한 없음', dup: '고객 기준(CI)',
      inepay: '지급 전 해지·명의변경·요금제 변경 없는 고객',
      inviter: [{ thr: 1, name: '친구 1명 개통', lines: [{ type: '실물 경품', detail: 'M마켓 포인트 (요금제별 차등)', payAt: '2026-10-31T10:00' }] }],
      invitee: { name: '개통 축하 포인트', lines: [{ type: '실물 경품', detail: 'M마켓 포인트 (요금제별 차등)', payAt: '2026-10-31T10:00' }] },
    },
    caution: '· 초대한 친구가 개통한 달의 다음 달 말에 포인트를 지급해요. (예: 9월 개통 → 10월 말 지급)\n· 초대자와 명의가 같은 고객은 초대할 수 없어요.',
    cta: [{ type: '추천 코드 발급 버튼', name: '친구 초대 링크 만들기' }, { type: '링크 버튼', name: '다이렉트몰에서 개통하기', url: 'https://example.com/directmall' }], tags: ['친구초대', '포인트'],
    src: 'KT M모바일 · 친구 초대 (상시)',
  },
  fc: {
    type: '추천형', name: '[예시] 신규·복귀 추천인 코드 이벤트', sub: '추천인 코드를 등록하면 바로 500FC!', ch: ['PC', 'MO'],
    disp: ['2026-09-10T10:00', '2026-10-28T23:59'], join: ['2026-09-10T10:00', '2026-10-28T23:59'], img: 'fc_referral.png', cmt: '미사용',
    ref: {
      invcond: '기존 유저', inecond: '신규·복귀 유저', way: '추천 코드', limit: '제한 없음', dup: '고객 기준(CI)',
      inviter: [{ thr: 1, name: '추천 보상 (예시)', lines: [{ type: '실물 경품', detail: '추천 보상 아이템 (비공개 · 예시 값)', payAt: '2026-10-29T10:00' }] }],
      invitee: { name: '추천인 코드 등록 보상', lines: [{ type: '실물 경품', detail: '500FC (기간제, 2026.11.11까지)', payAt: '2026-09-10T10:00' }] },
    },
    caution: '· 추천인 코드는 계정당 1회만 등록할 수 있어요.\n· 지급된 기간제 FC는 2026.11.11 23:59에 소멸돼요.',
    cta: [{ type: '추천 코드 발급 버튼', name: '내 추천인 코드 확인' }, { type: '추천 코드 입력 버튼', name: '추천인 코드 등록' }], tags: ['추천인코드', '신규', '복귀'],
    src: '넥슨 EA SPORTS FC ONLINE · 신규/복귀 이벤트',
  },
};

/** ex 키 → PromoForm (없으면 null). */
export function presetFormByKey(key: string | undefined): PromoForm | null {
  if (!key || !PRESETS[key]) return null;
  return presetForm(PRESETS[key]);
}
