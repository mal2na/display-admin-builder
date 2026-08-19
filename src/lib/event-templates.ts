/**
 * 이벤트 페이지 빌더 — 템플릿 카탈로그.
 *
 * 구조: 이벤트 유형(EVENT_TYPES) = 그룹. 한 유형 안에 여러 등록 템플릿이 들어간다.
 *   빌딩 = 등록 템플릿을 끌어와 배치 + 디테일만 수정.
 * 유형 = EVT Contents Architecture 3 "이벤트 유형" 밴드 / 정책서 PG-EVTMSN-PROG-001.
 */
import { defaultPropsFor, componentDef, GROUP_CORNER, type NodeType } from './event-components';

export type NodeSpec = { type: NodeType; props?: Record<string, unknown>; children?: NodeSpec[] };

export const EVENT_TYPES = ['안내형', '초청형', '기획전형', '응모형', '추천형', '구매/가입 연계형'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

// 프로그램 등록 정책 (PI-EVTMSN-ADMIN-001-02): 이벤트·미션 구분 + 유형 선택
export const PROGRAM_KINDS = ['이벤트', '미션'] as const;
export const MISSION_TYPES = ['행동완료형', '출석형', '누적형', '단계완료형', '전환형', '유지형', '탐험형', '협업형', '개인화형', '성장형'] as const;

export function typesForKind(kind: string): readonly string[] {
  return kind === '미션' ? MISSION_TYPES : EVENT_TYPES;
}

// 유형별 메타 — 정책서 "이벤트/미션 유형 정의·대표 목적·적용 기준" 표 기준 요약 + 대표 아이콘.
//   (PG-EVTMSN-PROG-001 유형 정의)
export const TYPE_META: Record<string, { desc: string; icon: string }> = {
  // 이벤트 6종
  안내형: { desc: '혜택·행사·제휴처 프로모션 정보를 전달', icon: 'Megaphone' },
  초청형: { desc: '지정 고객·시각·세션 안에서만 노출되는 비공개 랜딩', icon: 'Lock' },
  기획전형: { desc: '상품·혜택·브랜드·시즌 주제를 묶어 전시', icon: 'LayoutGrid' },
  응모형: { desc: '조건 충족 후 응모 → 추첨·선정·심사로 보상', icon: 'Ticket' },
  추천형: { desc: '친구 추천·초대 링크·추천 코드로 참여·보상', icon: 'Share2' },
  '구매/가입 연계형': { desc: '구매·가입·개통·신청 완료를 조건으로 참여·혜택', icon: 'CreditCard' },
  // 미션 10종
  행동완료형: { desc: '특정 행동 1건 완료로 결과 확인·보상 수령', icon: 'CircleCheck' },
  출석형: { desc: '출석·스탬프 누적 (진행률·이어하기·완료 인정)', icon: 'CalendarCheck' },
  누적형: { desc: '횟수·금액·일수·실적·걸음수 등 누적 달성', icon: 'TrendingUp' },
  단계완료형: { desc: '순차 단계 수행 후 최종 완료 보상', icon: 'ListChecks' },
  전환형: { desc: '가입·구독·로밍·서비스 활성화 등 전환 유도', icon: 'ArrowRightLeft' },
  유지형: { desc: '일정 기간 유지·연속 이용·재방문 지속', icon: 'CalendarClock' },
  탐험형: { desc: '새 기능·카테고리·혜택을 탐색하게 유도', icon: 'Compass' },
  협업형: { desc: '가족·친구와 함께/관계 기반으로 완수', icon: 'Users' },
  개인화형: { desc: '고객 상태·성향·이력 기반 맞춤 과업 제시', icon: 'UserCog' },
  성장형: { desc: '배지·등급·컬렉션·누적 자산 성장과 연결', icon: 'Award' },
};

// 상태 생성 여부 — 유형으로 자동 결정 (PI-EVTMSN-PROG-001-06)
//   안내형·(보상/응모 없는)기획전형 = 참여 상태 생성 안 함, 나머지 이벤트·모든 미션 = 생성.
export function createsStateFor(programKind: string, programType: string): boolean {
  if (programKind === '미션') return true;
  return !(programType === '안내형' || programType === '기획전형');
}

export type TemplateDef = {
  key: string;
  label: string; // 템플릿명 (등록 사례명)
  eventType: string; // 소속 이벤트 유형(그룹). '' = 빈 페이지
  desc: string;
  build: () => NodeSpec[];
};

const n = (type: NodeType, props?: Record<string, unknown>, children?: NodeSpec[]): NodeSpec => ({ type, props, children });

// 프로모션 골조 = 고정 영역(위치 표시 슬롯) + 자유 조립 구간(섹션 1개 = 코너 1개 = 모듈 1개).
//   EVT Contents Architecture: 헤더/썸네일/태그·타이틀/CTA는 등록정보·시스템 고정, 본문만 섹션으로.
export function toPromotionSkeleton(body: NodeSpec[]): NodeSpec[] {
  const rest = [...body];
  if (rest[0]?.type === 'IMAGE') rest.shift(); // 선두 이미지 = 썸네일(고정)로 흡수
  let consumed = 0;
  while (rest[0]?.type === 'TEXT' && consumed < 2) { rest.shift(); consumed++; } // 선두 태그/타이틀 = 헤더(고정)
  const slot = (type: NodeType): NodeSpec => ({ type, props: { ...defaultPropsFor(type) } });
  const sections: NodeSpec[] = rest.map((blk, i) =>
    // 이미 CORNER면 그대로 섹션으로 통과(제목·레이아웃·아이템 유지), 아니면 단일 모듈을 그룹 코너로 감싼다.
    blk.type === 'CORNER'
      ? { ...blk, props: { ...defaultPropsFor('CORNER'), cornerType: GROUP_CORNER, ...(blk.props ?? {}) } }
      : { type: 'CORNER', props: { ...defaultPropsFor('CORNER'), cornerType: GROUP_CORNER, title: `섹션 ${i + 1}` }, children: [blk] },
  );
  return [slot('SLOT_THUMB'), slot('SLOT_HEADER'), ...sections, slot('SLOT_CTA')];
}
const notice = (text: string, header = '유의사항') => n('ACCORDION', { header, open: false }, [n('TEXT', { text, size: 12, color: '#64748b' })]);
const tag = (t: string) => n('TEXT', { text: t, size: 12, weight: 'bold', color: '#6366f1', align: 'center' });
// 제목·레이아웃을 가진 '코너'와 낱개 '혜택 항목' — 전시화면 방식(코너 + 아이템 N개)으로 작곡할 때 사용.
const corner = (title: string, layout: 'list' | 'grid' | 'scroll', children: NodeSpec[], extra?: Record<string, unknown>): NodeSpec =>
  n('CORNER', { cornerType: GROUP_CORNER, title, layout, ...(extra ?? {}) }, children);
const benefitItem = (name: string, badge = '', desc = ''): NodeSpec => n('BENEFIT_ITEM', { name, badge, desc });
const steps = (arr: string[]) => n('CARD', { mb: 8 }, [n('VSTACK', { gap: 8 }, arr.map((s) => n('TEXT', { text: s, size: 13, weight: 'semibold' })))]);

// ── 프로모션 전용 코너 카탈로그 (프로토타입) ─────────────────────────────
// 프로모션 빌더의 '코너 불러오기'가 쓰는 프리셋. 각 프리셋 = GROUP_CORNER(자유형) + 모듈 스캐폴딩.
// 렌더 가능한 실제 컴포넌트 타입만 사용. 이후 코너 유형 관리와 병합 예정(용도 태그).
export const PROMOTION_CORNER_PRESETS: { key: string; label: string; desc: string; children: NodeSpec[] }[] = [
  {
    key: 'hero',
    label: '이벤트 히어로',
    desc: '키비주얼 + 제목 + 참여 버튼',
    children: [
      n('IMAGE', { overlay: true, overlayText: '이벤트 키비주얼' }),
      n('TEXT', { text: '이벤트 제목을 입력하세요', size: 20, weight: 'bold', align: 'center' }),
      n('TEXT', { text: '혜택·부제 요약', align: 'center', color: '#64748b' }),
      n('BUTTON', { label: '참여하기' }),
    ],
  },
  {
    key: 'entry',
    label: '참여·응모',
    desc: '안내 + 응모 입력 + 동의 + 응모 버튼',
    children: [n('TEXT', { text: '응모 방법을 안내하세요', weight: 'semibold' }), n('INPUT'), n('SLOT_CONSENT'), n('BUTTON', { label: '응모하기' })],
  },
  {
    key: 'mission',
    label: '미션 진행',
    desc: '미션명 + 단계 + 미션 버튼',
    children: [n('TEXT', { text: '미션명', weight: 'bold' }), n('STEPS'), n('BUTTON', { label: '미션 하러가기' })],
  },
  {
    key: 'reward',
    label: '보상 안내',
    desc: '제목 + 보상/경품 항목',
    children: [n('TEXT', { text: '이런 혜택을 드려요', weight: 'bold' }), n('SLOT_REWARD')],
  },
  {
    key: 'roulette',
    label: '룰렛 이벤트',
    desc: '제목 + 룰렛 + 돌리기 버튼',
    children: [n('TEXT', { text: '룰렛 돌리고 경품 받기', weight: 'bold', align: 'center' }), n('ROULETTE'), n('BUTTON', { label: '룰렛 돌리기' })],
  },
  {
    key: 'notice',
    label: '유의사항',
    desc: '이벤트 유의사항 고지',
    children: [n('SLOT_NOTICE')],
  },
];
export const PROMOTION_CORNER_PRESET_BY_KEY: Record<string, (typeof PROMOTION_CORNER_PRESETS)[number]> = Object.fromEntries(
  PROMOTION_CORNER_PRESETS.map((p) => [p.key, p]),
);

export const TEMPLATES: TemplateDef[] = [
  { key: 'blank', label: '빈 페이지에서 시작', eventType: '', desc: '아무것도 없는 상태에서 직접 구성합니다.', build: () => [] },

  // ══ 안내형 (혜택·행사·제휴처 정보 전달) — arch3: 신규 제휴사 / 상품 / 할인 혜택 / 전시 ══
  {
    key: 'info-partner', label: '신규 제휴사 소개', eventType: '안내형', desc: '이번 달 새 제휴처와 혜택을 브랜드별로 안내',
    build: () => [
      n('IMAGE', { height: 200, overlay: true, overlayText: '2026년 T멤버십 신규 제휴사', radius: 0, mb: 8 }),
      tag('NEW'),
      n('TEXT', { text: 'T 멤버십 신규 제휴사', size: 20, weight: 'bold', align: 'center', mb: 8 }),
      n('BRAND', { category: '건강', brand: '오본', grade: 'VIP', benefits: ['전국 1,300개+ 오가닉 딜리버리·헬스 지원 이용권'] }),
      n('BRAND', { category: '교육', brand: '해커스', grade: 'VIP', benefits: ['패키지·수강권 수강료 최대 30% 할인', '해커스인강 모든 토익 컨텐츠(인강+중등/체험 상품) 20% 할인'] }),
      n('BRAND', { category: '영화·음악·공연', brand: '플래시백 게임', grade: 'VIP', benefits: ['R.I.C 라이트존 전시', '<FLASHBACK : GYERIM> 본인+동반 1인 30% 할인'] }),
      n('BRAND', { category: '생활·건강', brand: '후지필름', grade: 'VIP', benefits: ['프리미엄 인화 40% 할인', '사진 인화 20% 할인', '액자·달력 10% 할인', '20,000원 이상 결제 시 무료 배송 쿠폰'] }),
      n('BRAND', { category: '카페·베이커리', brand: '더렌티', grade: 'VIP', benefits: ['10% 할인 혜택', 'T 플러스포인트 사용'] }),
      n('BRAND', { category: '테마파크', brand: '루덴시아', grade: 'VIP', benefits: ['입장권 최대 50% 할인'] }),
      n('BRAND', { category: '여행', brand: '더라운지', grade: 'VIP', benefits: ['국내 공항 라운지 2,000원 할인', '해외 공항 라운지 2,000원 할인', '다이닝 500원 할인'] }),
      n('BRAND', { category: '패션·뷰티', brand: '키디키디', grade: 'VIP', benefits: ['10% 할인', '50,000원 이상 구매 시 최대 5,000원 할인'] }),
      n('BRAND', { category: '음식', brand: '도원스타일', grade: 'VIP', benefits: ['30,000원 이상 결제 시 10% 할인 (최대 30,000원)'] }),
      n('BRAND', { category: '카페·베이커리', brand: '파스쿠찌', grade: 'VIP', benefits: ['10% 할인 혜택', 'T 플러스포인트 사용'] }),
      notice('· 제휴처 및 혜택 내용은 사정에 따라 변경될 수 있습니다.'),
    ],
  },
  {
    key: 'info-product', label: '상품 안내', eventType: '안내형', desc: 'T 우주패스 free 구독 방법·혜택 안내',
    build: () => [
      n('IMAGE', { height: 220, overlay: true, overlayText: 'APP 전용 · T 우주패스 free', radius: 0, mb: 8 }),
      tag('APP 전용'),
      n('TEXT', { text: 'T 우주패스 free는 영원히 0원!', size: 20, weight: 'bold', align: 'center', mb: 4 }),
      n('TEXT', { text: '단 T 우주 앱이 아닌 외부 채널로 이용 시 매월 이용료가 청구됩니다.', size: 12, color: '#94a3b8', align: 'center' }),
      n('IMAGE', { height: 180, radius: 16, overlay: true, overlayText: '0 free' }),
      n('CARD', { mb: 8, pt: 16, pr: 16, pb: 16, pl: 16 }, [
        n('TEXT', { text: 'How to subscribe', size: 11, weight: 'bold', color: '#6366f1', align: 'center' }),
        n('TEXT', { text: 'T 우주패스 free를 구독하는 방법', size: 15, weight: 'bold', align: 'center', mb: 8 }),
        n('IMAGE', { height: 120, radius: 12, overlay: true, overlayText: 'Step 1. 앱 다운로드' }),
        n('IMAGE', { height: 120, radius: 12, overlay: true, overlayText: 'Step 2. T 우주패스 free 가입', mt: 8 }),
      ]),
      // 제목 + 낱개 혜택 항목 = 하나의 그리드 코너 (별도 타이틀 섹션 없음, 항목은 하나씩 추가·삭제 가능)
      corner('‘free’ 하게 골라 누리는 14가지 혜택', 'grid', [
        benefitItem('왕감귤제스트 쿠폰', '무료'),
        benefitItem('B사 5천원 할인 쿠폰', '5천원'),
        benefitItem('영화 5천원 관람권', '5천원'),
        benefitItem('3천원 할인 쿠폰', '3천원'),
        benefitItem('3천원 할인 쿠폰', '3천원'),
        benefitItem('5천원 할인 쿠폰', '5천원'),
        benefitItem('3천원 적립금', '적립'),
        benefitItem('1만원 할인 쿠폰', '1만원'),
      ], { mt: 8 }),
      n('IMAGE', { height: 180, radius: 16, overlay: true, overlayText: 'T 우주 앱에서 만나보실 수 있어요', mt: 8 }),
      n('BUTTON', { label: '자세히 보러 가기', bg: '#6366f1', full: true, mt: 8 }),
      notice('· T 우주 앱에서 free 구독 후 이용 가능하며, 외부 채널 이용 시 요금이 청구됩니다.'),
    ],
  },
  {
    key: 'info-discount', label: '할인 혜택 안내', eventType: '안내형', desc: '파크이용권 할인 안내 (서울랜드)',
    build: () => [
      n('IMAGE', { height: 200, overlay: true, overlayText: '서울랜드 본인 50% · 동반 2인 40% 할인', radius: 0, mb: 8 }),
      tag('T membership × 서울랜드'),
      n('TEXT', { text: '파크이용권 할인 혜택', size: 20, weight: 'bold', align: 'center', mb: 4 }),
      n('TEXT', { text: 'T 멤버십 바코드를 이용하여 현장에서 바로 할인 받으실 수 있습니다.', size: 13, color: '#475569', align: 'center' }),
      n('TABLE', { variant: '카드형', headers: ['파크이용권', '정상요금', '본인(50%)', '동반인(40%)'], rows: [
        ['종일 어른', '52,000원', '26,000원', '31,200원'],
        ['종일 청소년', '46,000원', '23,000원', '27,600원'],
        ['종일 어린이', '43,000원', '21,500원', '25,800원'],
        ['야간 어른', '45,000원', '22,500원', '27,000원'],
        ['야간 청소년', '39,000원', '19,500원', '23,400원'],
        ['야간 어린이', '36,000원', '18,000원', '21,600원'],
      ] }),
      n('TEXT', { text: '2026 서울랜드 여름밤 · 로맨틱 루나 불꽃 판타지!', size: 16, weight: 'bold', align: 'center', mt: 8 }),
      n('VSTACK', { gap: 8 }, [n('IMAGE', { height: 120, radius: 12, overlay: true, overlayText: '불꽃 이미지 1' }), n('IMAGE', { height: 120, radius: 12, overlay: true, overlayText: '불꽃 이미지 2' })]),
      n('TEXT', { text: '짜릿한 즐거움! T 멤버십으로 즐기는 익사이팅 어트랙션', size: 16, weight: 'bold', align: 'center', mt: 8 }),
      n('VSTACK', { gap: 8 }, [n('IMAGE', { height: 120, radius: 12, overlay: true, overlayText: '어트랙션 이미지 1' }), n('IMAGE', { height: 120, radius: 12, overlay: true, overlayText: '어트랙션 이미지 2' })]),
      notice('· 어른(만 19~64세)·청소년(만 13~18세)·어린이(36개월~12세) 기준. 현장 확인 서류 필요. 문의: 서울랜드 고객센터', '이용 안내·유의사항'),
    ],
  },
  {
    key: 'info-exhibit', label: '전시 안내', eventType: '안내형', desc: '전시·콘텐츠 안내 (PODO MUSEUM)',
    build: () => [
      n('IMAGE', { height: 240, overlay: true, overlayText: '우리 이토록 작은 존재들', radius: 0, mb: 8 }),
      tag('PODO MUSEUM 기획전'),
      n('TEXT', { text: 'We, Such Fragile Beings', size: 16, weight: 'bold', align: 'center', mb: 8 }),
      n('HTML', { html: '<div style="background:#0f172a;color:#fff;padding:16px;border-radius:12px"><b>Artist List</b><br/><span style="font-size:12px;opacity:.85">강이연 · 김민경 · 로버트 몽고메리</span></div>' }),
      notice('· 전시장 내 촬영 시 플래시를 사용할 수 없습니다.', '관람 유의사항'),
    ],
  },

  // ══ 초청형 (특정 고객 초청) — arch3: 콘서트 데이 / 컬처 ══
  {
    key: 'invite-concert', label: '콘서트 데이', eventType: '초청형', desc: '장기고객 단독 초청 공연',
    build: () => [
      n('IMAGE', { height: 220, overlay: true, overlayText: '가수 이승철과 함께하는 콘서트 데이', radius: 0, mb: 8 }),
      tag('T장기고객 초청'),
      n('TEXT', { text: '콘서트 데이 초대', size: 20, weight: 'bold', align: 'center', mb: 8 }),
      n('CARD', { mb: 8 }, [n('TEXT', { text: '행사 개요', size: 15, weight: 'bold', mb: 6 }), n('VSTACK', { gap: 8 }, [
        n('TEXT', { text: '· 일시 : 2026년 3월 15일 (토) 19:00', size: 13 }), n('TEXT', { text: '· 장소 : 올림픽홀', size: 13 }), n('TEXT', { text: '· 응모 : 대상 고객 중 추첨', size: 13 })])]),
      n('BUTTON', { label: '초청 응모하기', bg: '#6366f1', full: true }),
      notice('· 초청 대상 고객만 응모할 수 있습니다.'),
    ],
  },
  {
    key: 'invite-culture', label: '공연/전시 할인', eventType: '초청형', desc: '장기고객 컬처 — 공연·전시 예매 할인',
    build: () => [
      n('IMAGE', { height: 200, overlay: true, overlayText: '공연/전시 할인 · SK텔레콤 × NOL', radius: 0, mb: 8 }),
      tag('T장기고객 컬처'),
      n('TEXT', { text: '이 달의 공연/전시 할인', size: 18, weight: 'bold', align: 'center', mb: 8 }),
      n('TABLE', { variant: '가로줄', headers: ['공연', '할인'], rows: [['헬스키친', '30%'], ['오이디푸스', '20%'], ['그날의 재즈', '2+1']] }),
      n('BUTTON', { label: '예매하러 가기', bg: '#6366f1', full: true, mt: 8 }),
      notice('· 예매 수량은 1인 2매로 제한됩니다.'),
    ],
  },

  // ══ 기획전형 (상품·혜택 묶음 전시) — arch3: 제휴카드 혜택 모음 / 다이렉트 플랜 ══
  {
    key: 'curation-card', label: '제휴카드 혜택 모음', eventType: '기획전형', desc: '카드 혜택을 한 주제로 묶은 기획전',
    build: () => [
      n('IMAGE', { height: 200, overlay: true, overlayText: '부담을 덜어주는 카드 혜택 모음', radius: 0, mb: 8 }),
      tag('다이렉트 기획전'),
      n('TEXT', { text: '나에게 맞는 카드 혜택 찾기', size: 18, weight: 'bold', align: 'center', mb: 8 }),
      n('CARD', { mb: 8 }, [n('IMAGE', { height: 90, radius: 10, overlay: true, overlayText: 'T PREMIUM 카드', mb: 8 }), n('TEXT', { text: 'T PREMIUM 상담카드', size: 14, weight: 'bold' }), n('TEXT', { text: '월 최대 17,000원 통신 요금 할인', size: 12, color: '#94a3b8' }), n('BUTTON', { label: '자세히 보기', bg: '#0ea5e9', full: true, mt: 8 })]),
      n('CARD', { mb: 8 }, [n('IMAGE', { height: 90, radius: 10, overlay: true, overlayText: 'T 카드', mb: 8 }), n('TEXT', { text: 'T 카드', size: 14, weight: 'bold' }), n('TEXT', { text: '전월 실적 30만원 이상 시 15,000원 할인', size: 12, color: '#94a3b8' }), n('BUTTON', { label: '자세히 보기', bg: '#0ea5e9', full: true, mt: 8 })]),
      notice('· 카드 혜택은 카드사 정책에 따라 달라질 수 있습니다.'),
    ],
  },
  {
    key: 'curation-direct', label: '온라인 다이렉트 플랜', eventType: '기획전형', desc: '온라인 전용 요금제 기획전',
    build: () => [
      n('IMAGE', { height: 200, overlay: true, overlayText: '온라인 전용 다이렉트 플랜', radius: 0, mb: 8 }),
      tag('비대면 다이렉트'),
      n('TEXT', { text: '다이렉트 플랜이 특별한 이유', size: 18, weight: 'bold', align: 'center', mb: 8 }),
      steps(['이용료 월 7,000원 할인', '약정·위약금 없음', '온라인 100% 비대면 개통']),
      n('TABLE', { variant: '카드형', headers: ['플랜', '데이터', '월정액'], rows: [['다이렉트 5G', '무제한', '45,000원'], ['다이렉트 LTE', '11GB', '33,000원']] }),
      n('BUTTON', { label: '가입하기', bg: '#7c3aed', full: true, mt: 8 }),
      notice('· 다이렉트 요금제는 온라인에서만 가입할 수 있습니다.'),
    ],
  },

  // ══ 응모형 (조건 충족 후 응모·추첨) ══
  {
    key: 'entry-roulette', label: '룰렛 응모', eventType: '응모형', desc: '출석/응모 후 룰렛 추첨',
    build: () => [
      n('IMAGE', { height: 160, overlay: true, overlayText: '룰렛으로 스마트하게!', radius: 0, mb: 8 }),
      n('TEXT', { text: '출석체크하면 룰렛 응모 기회!', size: 16, weight: 'bold', align: 'center', mb: 4 }),
      n('ROULETTE', {}),
      n('BUTTON', { label: '응모하기', bg: '#ef4444', full: true, mt: 8 }),
      n('TEXT', { text: '경품 안내', size: 16, weight: 'bold', mt: 8, mb: 4 }),
      n('TABLE', { variant: '가로줄', headers: ['경품', '수량'], rows: [['갤럭시 탭 S11', '1명'], ['갤럭시 워치8', '2명'], ['T 플러스포인트 5,000P', '100명']] }),
      notice('· 당첨자 발표 후 순차 지급됩니다.'),
    ],
  },

  // ══ 추천형 (친구 추천·초대) ══
  {
    key: 'referral-relay', label: '친구 추천 릴레이', eventType: '추천형', desc: '추천 코드 공유로 양쪽 보상',
    build: () => [
      n('IMAGE', { height: 200, overlay: true, overlayText: '알뜰한 티다 친구 추천 릴레이', radius: 0, mb: 8 }),
      tag('추천 이벤트'),
      n('TEXT', { text: '친구 추천하고 혜택 받으세요', size: 18, weight: 'bold', align: 'center', mb: 8 }),
      steps(['STEP 1. 내 추천 코드 확인', 'STEP 2. 친구에게 코드 공유', 'STEP 3. 친구 가입 시 양쪽 모두 혜택!']),
      n('BUTTON', { label: '내 추천 코드 복사하기', bg: '#6366f1', full: true }),
      n('TABLE', { variant: '가로줄', headers: ['구분', '혜택'], rows: [['추천한 친구', 'T 플러스포인트 3,000P'], ['가입한 친구', '데이터 1GB']] }),
      notice('· 부정 추천은 혜택에서 제외됩니다.'),
    ],
  },

  // ══ 구매/가입 연계형 (구매·가입·개통 조건) — arch3: 럭키 페스티벌 / 여름휴가 ══
  {
    key: 'purchase-lucky', label: '럭키 페스티벌', eventType: '구매/가입 연계형', desc: '개통 시 특별 보상',
    build: () => [
      n('IMAGE', { height: 220, overlay: true, overlayText: '써든 폰 바꾸고 최대 15만 원 특별 보상', radius: 0, mb: 8 }),
      tag('T다이렉트샵'),
      n('TEXT', { text: '티다 럭키 페스티벌', size: 20, weight: 'bold', align: 'center', mb: 8 }),
      n('CARD', { mb: 8 }, [n('TEXT', { text: '이용 방법 안내', size: 15, weight: 'bold', mb: 6 }), n('VSTACK', { gap: 8 }, [n('TEXT', { text: '· 대상 : 기간 내 온라인 개통 고객', size: 13 }), n('TEXT', { text: '· 기간 : 2026.07.01 ~ 07.31', size: 13 })])]),
      n('TABLE', { variant: '카드형', headers: ['구분', '보상'], rows: [['5G 개통', '최대 15만 원'], ['LTE 개통', '최대 10만 원']] }),
      n('BUTTON', { label: '특별 보상 신청하기', bg: '#7c3aed', full: true, mt: 8 }),
      notice('· 개통 후 14일 이내 신청해야 합니다.'),
    ],
  },
  {
    key: 'purchase-summer', label: '여름휴가 이벤트', eventType: '구매/가입 연계형', desc: '개통 시 데이터 쿠폰 증정',
    build: () => [
      n('IMAGE', { height: 200, overlay: true, overlayText: '여름휴가 이벤트 · T데이터쿠폰', radius: 0, mb: 8 }),
      tag('T우주'),
      n('TEXT', { text: '개통하고 데이터 쿠폰 받기', size: 18, weight: 'bold', align: 'center', mb: 8 }),
      steps(['STEP 1. 기간 내 요금제 개통', 'STEP 2. 응모 페이지에서 신청', 'STEP 3. T데이터쿠폰 즉시 지급']),
      n('BUTTON', { label: '쿠폰 받기', bg: '#0ea5e9', full: true }),
      notice('· 쿠폰은 지급일로부터 30일간 유효합니다.'),
    ],
  },
];

// ── 전시(거버넌스 모드) PoC 템플릿 — 코너 기반 ──
export const DISPLAY_TEMPLATE: TemplateDef = {
  key: 'display', label: '전시 홈 (거버넌스)', eventType: '', desc: '코너 = 거버넌스 컨테이너 (PoC)',
  build: () => [
    n('CORNER', { cornerType: '배너형', title: '메인 배너' }, [n('BANNER', { title: 'T멤버십 8월 혜택', sub: '이달의 제휴 혜택을 모았어요', cta: '자세히', bg: '#eef2ff' })]),
    n('CORNER', { cornerType: '상품형', title: '추천 상품' }, [n('CHIP', { items: ['전체', '구독', '기기'], selected: 0 }), n('PRODUCT', { name: '갤럭시 버즈3', price: '149,000원' }), n('PRODUCT', { name: '갤럭시 워치8', price: '299,000원' }), n('PRODUCT', { name: '갤럭시 탭 S11', price: '899,000원' })]),
    n('CORNER', { cornerType: '혜택·오퍼형', title: '이달의 혜택' }, [n('BENEFIT', { title: '스타벅스 20% 할인', brand: '스타벅스' }), n('BENEFIT', { title: 'CGV 2,000원 할인', brand: 'CGV' }), n('BANNER', { title: '제휴카드 혜택 모음', sub: '최대 17,000원 통신 할인', cta: '보러가기', bg: '#fef3c7' })]),
  ],
};

export const TEMPLATE_BY_KEY: Record<string, TemplateDef> = Object.fromEntries([...TEMPLATES, DISPLAY_TEMPLATE].map((t) => [t.key, t]));

// ─────────────────────────────────────────────────────────────
// 이벤트 섹션(코너) 유형 — 전시/관리의 코너 유형처럼, 이벤트 모듈을 성격별로 그루핑한다.
//   (레퍼런스 "이벤트 상세" 한 판 정리 기준: 주요 대표 / 상세 콘텐츠 / 일반 콘텐츠 / 입력·참여 / 안내·고지)
//   각 모듈(NodeType)이 어떤 섹션 유형에 속하는지 매핑 — 빌더 팔레트 그루핑·구성 미리보기의 근거.
// ─────────────────────────────────────────────────────────────
export const EVENT_SECTION_GROUPS = ['주요 대표', '상세 콘텐츠', '일반 콘텐츠', '입력·참여', '안내·고지'] as const;
export type EventSectionGroup = (typeof EVENT_SECTION_GROUPS)[number];

const MODULE_SECTION_GROUP: Record<string, EventSectionGroup> = {
  // 주요 대표 — 이벤트 핵심을 대표하는 영역(이용방법·대표 혜택카드·게임)
  STEPS: '주요 대표',
  BENEFIT_CARD: '주요 대표',
  ROULETTE: '주요 대표',
  BRAND: '상세 콘텐츠',
  // 상세 콘텐츠 — 상품/혜택을 묶어 보여주는 상세 구좌
  CARD: '상세 콘텐츠',
  HROW: '상세 콘텐츠',
  VSTACK: '상세 콘텐츠',
  PRODUCT: '상세 콘텐츠',
  BENEFIT: '상세 콘텐츠',
  BENEFIT_ITEM: '상세 콘텐츠',
  // 일반 콘텐츠 — 문구·표·이미지 등 정보 전달
  TEXT: '일반 콘텐츠',
  TABLE: '일반 콘텐츠',
  IMAGE: '일반 콘텐츠',
  HTML: '일반 콘텐츠',
  DIVIDER: '일반 콘텐츠',
  BANNER: '일반 콘텐츠',
  CHIP: '일반 콘텐츠',
  // 입력·참여 — 참여 유도 입력/버튼
  INPUT: '입력·참여',
  BUTTON: '입력·참여',
  // 안내·고지 — 마무리 유의사항
  ACCORDION: '안내·고지',
};

export function moduleSectionGroup(type: string): EventSectionGroup {
  return MODULE_SECTION_GROUP[type] ?? '일반 콘텐츠';
}
// 구성 미리보기에서 더 읽기 좋은 라벨 오버라이드 (빌더 팔레트 라벨과 별개)
const MODULE_LABEL_OVERRIDE: Record<string, string> = {
  ACCORDION: '유의사항·FAQ',
  STEPS: '이용 방법 안내',
  INPUT: '입력·인증',
  BENEFIT_CARD: '혜택·상품 카드',
};
export function moduleLabel(type: string): string {
  return MODULE_LABEL_OVERRIDE[type] ?? componentDef(type)?.label ?? type;
}

// 템플릿의 최상위 섹션 구성을 요약 — 카드 호버 '구성 미리보기'용.
//   컨테이너(CARD/HROW/VSTACK/CORNER)는 대표 자식으로 라벨을 보강한다.
export type StructureItem = { type: string; group: EventSectionGroup; label: string };
export function describeTemplate(key: string): StructureItem[] {
  const tpl = TEMPLATE_BY_KEY[key];
  if (!tpl) return [];
  const body = tpl.build();
  const CONTAINERS = new Set(['CARD', 'HROW', 'VSTACK', 'CORNER']);
  return body.map((n): StructureItem => {
    let label = moduleLabel(n.type);
    let type = n.type as string;
    if (CONTAINERS.has(n.type) && n.children?.length) {
      // 컨테이너면 첫 실질 자식 유형으로 성격을 표시 (예: 카드 안 이미지+버튼 → '이미지·버튼 카드')
      const kids = n.children.map((c) => moduleLabel(c.type));
      label = `${label} · ${kids.slice(0, 2).join('·')}`;
      const primaryChild = n.children.find((c) => MODULE_SECTION_GROUP[c.type]);
      if (primaryChild) type = primaryChild.type;
    }
    return { type, group: moduleSectionGroup(type), label };
  });
}

export async function insertNodes(
  prisma: { eventNode: { create: (a: any) => Promise<{ id: string }> } },
  pageId: string,
  specs: NodeSpec[],
  parentId: string | null = null,
): Promise<void> {
  let order = 0;
  for (const spec of specs) {
    const props = { ...defaultPropsFor(spec.type), ...(spec.props ?? {}) };
    const created = await prisma.eventNode.create({ data: { pageId, parentId, type: spec.type, order: order++, props: JSON.stringify(props) } });
    if (spec.children?.length) await insertNodes(prisma, pageId, spec.children, created.id);
  }
}
