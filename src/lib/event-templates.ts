/**
 * 이벤트 페이지 빌더 — 템플릿 카탈로그.
 *
 * 구조: 이벤트 유형(EVENT_TYPES) = 그룹. 한 유형 안에 여러 등록 템플릿이 들어간다.
 *   빌딩 = 등록 템플릿을 끌어와 배치 + 디테일만 수정.
 * 유형 = EVT Contents Architecture 3 "이벤트 유형" 밴드 / 정책서 PG-EVTMSN-PROG-001.
 */
import { defaultPropsFor, GROUP_CORNER, type NodeType } from './event-components';

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
  const sections: NodeSpec[] = rest.map((blk, i) => ({
    type: 'CORNER',
    props: { ...defaultPropsFor('CORNER'), cornerType: GROUP_CORNER, title: `섹션 ${i + 1}` },
    children: [blk],
  }));
  return [slot('SLOT_THUMB'), slot('SLOT_HEADER'), ...sections, slot('SLOT_CTA')];
}
const notice = (text: string, header = '유의사항') => n('ACCORDION', { header, open: false }, [n('TEXT', { text, size: 12, color: '#64748b' })]);
const tag = (t: string) => n('TEXT', { text: t, size: 12, weight: 'bold', color: '#6366f1', align: 'center' });
const steps = (arr: string[]) => n('CARD', { mb: 8 }, [n('VSTACK', { gap: 8 }, arr.map((s) => n('TEXT', { text: s, size: 13, weight: 'semibold' })))]);

export const TEMPLATES: TemplateDef[] = [
  { key: 'blank', label: '빈 페이지에서 시작', eventType: '', desc: '아무것도 없는 상태에서 직접 구성합니다.', build: () => [] },

  // ══ 안내형 (혜택·행사·제휴처 정보 전달) — arch3: 신규 제휴사 / 상품 / 할인 혜택 / 전시 ══
  {
    key: 'info-partner', label: '신규 제휴사 소개', eventType: '안내형', desc: '이번 달 새 제휴처와 혜택을 안내',
    build: () => [
      n('IMAGE', { height: 200, overlay: true, overlayText: '2026년 T멤버십 신규 제휴사', radius: 0, mb: 8 }),
      tag('T멤버십 안내'),
      n('TEXT', { text: '신규 제휴사 혜택 안내', size: 20, weight: 'bold', align: 'center', mb: 8 }),
      n('TABLE', { variant: '카드형', headers: ['제휴처', '기본', 'VIP'], rows: [['카페', '10%', '20%'], ['영화', '2,000원', '4,000원'], ['편의점', '5%', '10%']] }),
      n('IMAGE', { height: 160, radius: 12, overlay: true, overlayText: '제휴처 안내 이미지', mt: 8 }),
      notice('· 혜택은 제휴처 사정에 따라 변경될 수 있습니다.'),
    ],
  },
  {
    key: 'info-product', label: '상품 안내', eventType: '안내형', desc: '구독 상품 이용 방법 안내 (T 우주패스)',
    build: () => [
      n('IMAGE', { height: 220, overlay: true, overlayText: 'T 우주패스 free는 영원히 0원', radius: 0, mb: 8 }),
      tag('APP 전용'),
      n('TEXT', { text: 'T 우주패스 free를 구독하는 방법', size: 18, weight: 'bold', align: 'center', mb: 8 }),
      steps(['STEP 1. T 우주패스 free 선택', 'STEP 2. 매월 받을 무료 상품 선택', 'STEP 3. 구독 완료 — 즉시 이용 시작']),
      n('IMAGE', { height: 200, radius: 12, overlay: true, overlayText: '우주패스 소개' }),
      n('BUTTON', { label: '지금 구독하기', bg: '#0ea5e9', full: true, mt: 8 }),
      notice('· 혜택 상품은 매월 1회 변경할 수 있습니다.'),
    ],
  },
  {
    key: 'info-discount', label: '할인 혜택 안내', eventType: '안내형', desc: '제휴처 요금 할인 안내 (에버랜드)',
    build: () => [
      n('IMAGE', { height: 200, overlay: true, overlayText: '에버랜드 파크이용권 50% 할인', radius: 0, mb: 8 }),
      tag('T멤버십'),
      n('TEXT', { text: '파크이용권 할인 혜택', size: 18, weight: 'bold', align: 'center', mb: 8 }),
      n('TABLE', { variant: '가로줄', headers: ['구분', '정상가', '할인가'], rows: [['본인', '62,000원', '31,000원'], ['동반 1인', '62,000원', '37,200원']] }),
      n('VSTACK', { gap: 8, mt: 8 }, [n('IMAGE', { height: 120, radius: 8, overlay: true, overlayText: '파크 이미지 1' }), n('IMAGE', { height: 120, radius: 8, overlay: true, overlayText: '파크 이미지 2' })]),
      notice('· 현장 매표소에서는 할인이 적용되지 않습니다.'),
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
