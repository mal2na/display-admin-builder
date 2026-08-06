/**
 * 시드: T앱 "혜택" 홈 화면(예시1·2·3)을 5단 계층 모델로 표현한다.
 *
 *   Container "혜택 홈"
 *     └─ Template "혜택 기본" (isDefault, 로그인)
 *          1. 상단 퀵메뉴        (업무 진입형)   → 선택형(탭)
 *          2. 영화 예매          (상품형)        → 상품형 카드 ×3
 *          3. 0 Week 전용 혜택    (상품형·세로형)  → 상품형 ×3
 *          4. 제휴 혜택 배너      (배너형)        → 배너형 ×1
 *          5. T Week 소멸 혜택    (배너형)        → 배너형 ×1
 *          6. T DAY 멤버십        (혜택·오퍼형)   → 혜택형 ×2
 *          7. AirPods 사전예약    (배너형)        → 배너형 ×1
 *          8. 카테고리별 혜택      (개인화 추천형) → 선택형(탭) + 혜택형 ×3
 *
 * 모든 Corner↔Component 조합은 CORNER_COMPONENT_MAP(PI-DSP-CMP-003)를 통과해야 한다.
 */
import { PrismaClient } from '@prisma/client';
import {
  isComponentAllowedInCorner,
  CORNER_COMPONENT_MAP,
  cornerTypeDisplayName,
  type ComponentType,
  type CornerType,
} from '../src/lib/display-taxonomy';
import { seedEvents } from './seed-events';

const prisma = new PrismaClient();

async function resetAll() {
  await prisma.auditLog.deleteMany();
  await prisma.cornerComponentRule.deleteMany();
  await prisma.componentAtom.deleteMany();
  await prisma.cornerComponent.deleteMany();
  await prisma.templateCorner.deleteMany();
  await prisma.container.updateMany({ data: { defaultTemplateId: null } });
  await prisma.template.deleteMany();
  await prisma.container.deleteMany();
  await prisma.corner.deleteMany();
  await prisma.component.deleteMany();
  await prisma.atom.deleteMany();
  await prisma.cornerType.deleteMany();
}

type AtomInput = {
  name: string;
  atomType: 'TEXT' | 'BUTTON' | 'IMAGE' | 'ICON' | 'BADGE' | 'PRICE' | 'BENEFIT_TEXT' | 'CTA' | 'INFO';
  content?: string;
  imageUrl?: string;
  altText?: string;
  linkUrl?: string;
};

async function comp(name: string, componentType: ComponentType, atoms: AtomInput[], opts?: { chipRows?: number; selectedIndex?: number }) {
  const c = await prisma.component.create({
    data: { name, componentType, status: 'active', ...(opts?.chipRows != null ? { chipRows: opts.chipRows } : {}), ...(opts?.selectedIndex != null ? { selectedIndex: opts.selectedIndex } : {}) },
  });
  for (let i = 0; i < atoms.length; i++) {
    const a = await prisma.atom.create({ data: { ...atoms[i], status: 'active' } });
    await prisma.componentAtom.create({ data: { componentId: c.id, atomId: a.id, order: i, isRequired: true } });
  }
  return c;
}

async function corner(
  input: {
    name: string;
    cornerType: CornerType;
    title?: string;
    maxItems?: number;
    mainTitle?: string;
    subTitle?: string;
    layoutDetail?: string;
    cornerLayout?: string;
    subTitleIcon?: string;
    description?: string;
    markupId?: string;
    minItems?: number;
    noDisplayCondition?: string;
    moreButtonUse?: boolean;
    moreButtonLabel?: string;
    moreButtonLink?: string;
    sortStrategy?: string;
    typeLabel?: string;
  },
  components: { id: string; componentType: ComponentType }[],
) {
  for (const comp of components) {
    if (!isComponentAllowedInCorner(input.cornerType, comp.componentType)) {
      throw new Error(
        `[PI-DSP-CMP-003 위반] ${input.name}(${input.cornerType}) ← ${comp.componentType}. 허용: ${CORNER_COMPONENT_MAP[input.cornerType].join(', ')}`,
      );
    }
  }
  const cn = await prisma.corner.create({ data: { ...input, sortStrategy: input.sortStrategy ?? 'MANUAL' } });
  await prisma.cornerComponent.createMany({
    data: components.map((c, i) => ({ cornerId: cn.id, componentId: c.id, order: i })),
  });
  return cn;
}

async function main() {
  // 이미 데이터가 있으면 시드 건너뛰기 (배포 재빌드 시 기존 데이터·편집 보존).
  // 강제로 다시 시드하려면 FORCE_SEED=1 로 실행.
  const existingContainers = await prisma.container.count().catch(() => 0);
  if (existingContainers > 0 && !process.env.FORCE_SEED) {
    console.log(`↷ 이미 데이터가 있어 시드를 건너뜁니다 (containers=${existingContainers}). 재시드하려면 FORCE_SEED=1`);
    return;
  }

  await resetAll();

  await prisma.cornerComponentRule.createMany({
    data: Object.entries(CORNER_COMPONENT_MAP).flatMap(([cornerType, comps]) =>
      comps.map((componentType) => ({ cornerType, componentType })),
    ),
  });

  // 1) 상단 퀵메뉴 (탭)
  const topMenu = await comp('혜택 상단 탭', '선택형', [
    { name: '탭:4월 혜택', atomType: 'TEXT', content: '4월 혜택' },
    { name: '탭:혜택 줍기', atomType: 'TEXT', content: '혜택 줍기' },
    { name: '탭:카테고리', atomType: 'TEXT', content: '카테고리' },
    { name: '탭:VIP Pick', atomType: 'TEXT', content: 'VIP Pick' },
    { name: '탭:0 Week', atomType: 'TEXT', content: '0 Week' },
    { name: '탭:이벤트', atomType: 'TEXT', content: '이벤트' },
    { name: '탭:영화 예매', atomType: 'TEXT', content: '영화 예매' },
    { name: '탭:글로벌 여행', atomType: 'TEXT', content: '글로벌 여행' },
  ]);
  const cornerTop = await corner(
    { name: '상단 퀵메뉴', cornerType: '업무 진입형', maxItems: 10, layoutDetail: '고정형(탭)', subTitleIcon: '사용안함' },
    [{ id: topMenu.id, componentType: '선택형' }],
  );

  // 2) 영화 예매 (상품형)
  const movie1 = await comp('인크레더블 3', '상품형', [
    { name: '인크레더블3 포스터', atomType: 'IMAGE', imageUrl: '/assets/movie-incredibles.jpg', altText: '인크레더블 3 영화 포스터' },
    { name: '인크레더블3 제목', atomType: 'TEXT', content: '인크레더블 3' },
    { name: '인크레더블3 지표', atomType: 'INFO', content: '평점 4.7 · 예매율 21.4%' },
  ]);
  const movie2 = await comp('토이스토리 5', '상품형', [
    { name: '토이스토리5 포스터', atomType: 'IMAGE', imageUrl: '/assets/movie-toystory.jpg', altText: '토이스토리 5 영화 포스터' },
    { name: '토이스토리5 제목', atomType: 'TEXT', content: '토이스토리 5' },
    { name: '토이스토리5 지표', atomType: 'INFO', content: '평점 3.6 · 예매율 18.7%' },
  ]);
  const movie3 = await comp('어벤져스: 둠스데이', '상품형', [
    { name: '어벤져스 포스터', atomType: 'IMAGE', imageUrl: '/assets/movie-avengers.jpg', altText: '어벤져스 둠스데이 영화 포스터' },
    { name: '어벤져스 제목', atomType: 'TEXT', content: '어벤져스: 둠스데이' },
    { name: '어벤져스 지표', atomType: 'INFO', content: '평점 4.2 · 예매율 18.7%' },
  ]);
  const cornerMovie = await corner(
    {
      name: '영화 예매',
      cornerType: '상품형',
      minItems: 1,
      maxItems: 10,
      mainTitle: '불금인 오늘 명동 CGV에서\n무료 영화 어때요?',
      subTitle: 'T 영화예매',
      layoutDetail: '단일강조(1.5배열)',
      cornerLayout: '가로 SWIPE형',
      subTitleIcon: '화살표',
      sortStrategy: '인기순',
      noDisplayCondition: '선택 없음',
      moreButtonUse: true,
      moreButtonLabel: '영화 전체보기',
      moreButtonLink: '/movie',
    },
    [
      { id: movie1.id, componentType: '상품형' },
      { id: movie2.id, componentType: '상품형' },
      { id: movie3.id, componentType: '상품형' },
    ],
  );

  // 3) 0 Week 전용 혜택 (상품형 · 세로형)
  const b1 = await comp('공차 음료 혜택', '상품형', [
    { name: '공차 로고', atomType: 'ICON', imageUrl: '/assets/brand-gongcha.png', altText: '공차 로고' },
    { name: '공차 혜택문구', atomType: 'BENEFIT_TEXT', content: '인기 음료 6종 50% 할인' },
    { name: '공차 브랜드', atomType: 'TEXT', content: '공차' },
  ]);
  const b2 = await comp('뚜레쥬르 혜택', '상품형', [
    { name: '뚜레쥬르 로고', atomType: 'ICON', imageUrl: '/assets/brand-tlj.png', altText: '뚜레쥬르 로고' },
    { name: '뚜레쥬르 혜택문구', atomType: 'BENEFIT_TEXT', content: '브라우니 1개 증정' },
    { name: '뚜레쥬르 브랜드', atomType: 'TEXT', content: '뚜레쥬르' },
  ]);
  const b3 = await comp('NOL 티켓 혜택', '상품형', [
    { name: 'NOL 로고', atomType: 'ICON', imageUrl: '/assets/brand-nol.png', altText: 'NOL 티켓 로고' },
    { name: 'NOL 혜택문구', atomType: 'BENEFIT_TEXT', content: '전시회 40% 할인' },
    { name: 'NOL 브랜드', atomType: 'TEXT', content: 'NOL 티켓' },
  ]);
  const cornerZeroWeek = await corner(
    {
      name: '0 Week',
      cornerType: '상품형',
      maxItems: 6,
      mainTitle: '6월 8일까지 지훈님에게만\n보이는 혜택이에요',
      subTitle: '0 Week',
      layoutDetail: '세로형',
      cornerLayout: '세로 리스트형',
      subTitleIcon: '화살표',
    },
    [
      { id: b1.id, componentType: '상품형' },
      { id: b2.id, componentType: '상품형' },
      { id: b3.id, componentType: '상품형' },
    ],
  );

  // 4) 제휴 혜택 배너 (배너형)
  const banner1 = await comp('가족 나들이 혜택 배너', '배너형', [
    { name: '가족나들이 제목', atomType: 'TEXT', content: '이번 주말, 가족 나들이에 쓰기 좋은 혜택' },
    { name: '가족나들이 서브', atomType: 'INFO', content: '제휴사별 혜택 더보기' },
    { name: '롯데월드 이미지', atomType: 'IMAGE', imageUrl: '/assets/lotteworld.png', altText: '롯데월드 어드벤처' },
  ]);
  const cornerBanner1 = await corner(
    { name: '제휴 혜택 배너', cornerType: '배너형', maxItems: 3, layoutDetail: '이미지형' },
    [{ id: banner1.id, componentType: '배너형' }],
  );

  // 5) T Week 소멸 혜택 — 상단 배너 + 상품형 리스트 (상품형 · 세로형(배너))
  const tweekBenefit = await comp('배민 치킨 혜택', '상품형', [
    { name: '배민 로고', atomType: 'ICON', imageUrl: '/assets/brand-baemin.png', altText: '배달의민족 로고' },
    { name: '배민 혜택문구', atomType: 'BENEFIT_TEXT', content: '치킨 프랜차이즈 20% 할인' },
    { name: '배민 브랜드', atomType: 'TEXT', content: '배달의 민족' },
  ]);
  const cornerTWeek = await corner(
    {
      name: 'T Week 소멸 혜택',
      cornerType: '상품형', // 표시명: 상품형 · 세로형(배너) (상단 배너 + 상품 리스트)
      maxItems: 6,
      mainTitle: '오늘이 지나면\n다시 없는 혜택이에요',
      subTitle: 'T Week · 오늘 소멸 예정',
      layoutDetail: '세로형(배너)',
      cornerLayout: '세로 리스트형',
      subTitleIcon: '화살표',
    },
    [{ id: tweekBenefit.id, componentType: '상품형' }],
  );

  // 6) T DAY 멤버십 (상품형 · 세로형)
  const m1 = await comp('아웃백 혜택', '상품형', [
    { name: '아웃백 로고', atomType: 'ICON', imageUrl: '/assets/brand-outback.png', altText: '아웃백 스테이크하우스 로고' },
    { name: '아웃백 혜택문구', atomType: 'BENEFIT_TEXT', content: '전 메뉴 15% 즉시 할인' },
    { name: '아웃백 브랜드', atomType: 'TEXT', content: '아웃백 스테이크 하우스' },
  ]);
  const m2 = await comp('티맵 충전 혜택', '상품형', [
    { name: '티맵 로고', atomType: 'ICON', imageUrl: '/assets/brand-tmap.png', altText: '티맵모빌리티 로고' },
    { name: '티맵 혜택문구', atomType: 'BENEFIT_TEXT', content: '전기차 충전 최대 10% 할인' },
    { name: '티맵 브랜드', atomType: 'TEXT', content: '티맵모빌리티' },
  ]);
  const cornerTDay = await corner(
    {
      name: 'T DAY 멤버십',
      cornerType: '상품형',
      maxItems: 6,
      mainTitle: '오늘의 T DAY 멤버십\n혜택을 만나보세요',
      subTitle: '제휴사별 혜택',
      layoutDetail: '세로형',
      cornerLayout: '세로 리스트형',
      subTitleIcon: '화살표',
    },
    [
      { id: m1.id, componentType: '상품형' },
      { id: m2.id, componentType: '상품형' },
    ],
  );

  // 7) AirPods 사전예약 (배너형)
  const banner3 = await comp('에어팟 사전예약 배너', '배너형', [
    { name: '에어팟 제목', atomType: 'TEXT', content: 'AirPods Max3 사전 예약 하셨나요?' },
    { name: '에어팟 서브', atomType: 'INFO', content: '사전예약 클럽 멤버십 혜택' },
    { name: '에어팟 이미지', atomType: 'IMAGE', imageUrl: '/assets/airpods-max.png', altText: 'AirPods Max3 헤드폰' },
  ]);
  const cornerAirpods = await corner(
    { name: 'AirPods 사전예약', cornerType: '배너형', maxItems: 3, layoutDetail: '이미지형/빅배너' },
    [{ id: banner3.id, componentType: '배너형' }],
  );

  // 8) 카테고리별 혜택 (개인화 추천형)
  const catTab = await comp('카테고리 탭', '선택형', [
    { name: '카테고리:카페', atomType: 'TEXT', content: '카페' },
    { name: '카테고리:베이커리', atomType: 'TEXT', content: '베이커리' },
    { name: '카테고리:외식', atomType: 'TEXT', content: '외식' },
    { name: '카테고리:쇼핑', atomType: 'TEXT', content: '쇼핑' },
    { name: '카테고리:문화생활', atomType: 'TEXT', content: '문화생활' },
    { name: '카테고리:교통', atomType: 'TEXT', content: '교통' },
    { name: '카테고리:피자·치킨', atomType: 'TEXT', content: '피자·치킨' },
  ], { chipRows: 2 }); // 카테고리 탭은 전체 칩이 보이도록 2줄 표시
  // 상품형/세로형(카테고리탭) 코너의 카드 = 상품형 컴포넌트 (map: 상품형 ← 상품형·선택형)
  const c1 = await comp('배스킨라빈스 혜택', '상품형', [
    { name: '배라 로고', atomType: 'ICON', imageUrl: '/assets/brand-br.png', altText: '배스킨라빈스 로고' },
    { name: '배라 혜택문구', atomType: 'BENEFIT_TEXT', content: '월 1회 싱글레귤러 50% 할인' },
    { name: '배라 브랜드', atomType: 'TEXT', content: '배스킨라빈스' },
  ]);
  const c2 = await comp('공차 카페 혜택', '상품형', [
    { name: '공차 로고2', atomType: 'ICON', imageUrl: '/assets/brand-gongcha.png', altText: '공차 로고' },
    { name: '공차 혜택문구2', atomType: 'BENEFIT_TEXT', content: '1일 1회 사용제한 없이 10% 할인' },
    { name: '공차 브랜드2', atomType: 'TEXT', content: '공차' },
  ]);
  const c3 = await comp('폴바셋 혜택', '상품형', [
    { name: '폴바셋 로고', atomType: 'ICON', imageUrl: '/assets/brand-paulbassett.png', altText: '폴바셋 로고' },
    { name: '폴바셋 혜택문구', atomType: 'BENEFIT_TEXT', content: '아메리카노 20% 할인' },
    { name: '폴바셋 브랜드', atomType: 'TEXT', content: '폴바셋' },
  ]);
  const cornerCategory = await corner(
    {
      name: '카테고리별 혜택',
      cornerType: '상품형',
      maxItems: 10,
      mainTitle: 'VIP 지훈님,\n최대 할인 혜택만 모았어요',
      subTitle: '카테고리별 혜택',
      layoutDetail: '세로형(카테고리탭)',
      subTitleIcon: '화살표',
    },
    [
      { id: catTab.id, componentType: '선택형' },
      { id: c1.id, componentType: '상품형' },
      { id: c2.id, componentType: '상품형' },
      { id: c3.id, componentType: '상품형' },
    ],
  );

  // 라이브러리에만 남겨둘 미배치 Corner (빌더 왼쪽 팔레트 검증용)
  const evComp = await comp('이벤트 응모 배너', '배너형', [
    { name: '이벤트 제목', atomType: 'TEXT', content: '여름 이벤트 응모하고 선물 받기' },
    { name: '이벤트 서브', atomType: 'INFO', content: '매주 추첨' },
    { name: '이벤트 이미지', atomType: 'IMAGE', imageUrl: '/assets/event.png', altText: '여름 이벤트 배너' },
  ]);
  const cornerEvent = await corner(
    { name: '이벤트 배너', cornerType: '배너형', maxItems: 3, layoutDetail: '팝업배너형' },
    [{ id: evComp.id, componentType: '배너형' }],
  );

  const noticeComp = await comp('서비스 점검 안내', '정보형', [
    { name: '점검 제목', atomType: 'TEXT', content: '8/1(금) 02:00~04:00 시스템 점검' },
    { name: '점검 내용', atomType: 'INFO', content: '해당 시간 일부 서비스 이용이 제한됩니다' },
  ]);
  const cornerNotice = await corner(
    { name: '공지/안내', cornerType: '고정·필수 노출형', title: '꼭 확인해 주세요', maxItems: 2 },
    [{ id: noticeComp.id, componentType: '정보형' }],
  );

  const recoComp = await comp('오늘의 추천 상품', '상품형', [
    { name: '추천상품 이미지', atomType: 'IMAGE', imageUrl: '/assets/reco.png', altText: '추천 상품 이미지' },
    { name: '추천상품 제목', atomType: 'TEXT', content: '아이폰 20 Pro' },
    { name: '추천상품 가격', atomType: 'PRICE', content: '월 39,000원' },
  ]);
  const cornerReco = await corner(
    {
      name: '추천 상품',
      cornerType: '상품형',
      minItems: 2,
      maxItems: 8,
      mainTitle: '당신을 위한 추천',
      subTitle: '추천',
      layoutDetail: '가로형(2.5배열)',
      cornerLayout: '가로 SWIPE형',
      subTitleIcon: '화살표',
      sortStrategy: '낮은 가격순',
      moreButtonUse: true,
      moreButtonLabel: '추천 더보기',
      moreButtonLink: '/reco',
    },
    [{ id: recoComp.id, componentType: '상품형' }],
  );
  void cornerNotice;
  void cornerReco;

  // 배너 라이브러리 샘플. 미리보기가 실제로 보이도록 data-URI(SVG) 이미지로 생성한다.
  // 상위 배너(히어로)는 실제로 히어로가 있는 코너에만 연결한다.
  const escSvg = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const bannerSvg = (title: string, sub: string, from: string, to: string) =>
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='672' height='294' viewBox='0 0 672 294'>` +
        `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${from}'/><stop offset='1' stop-color='${to}'/></linearGradient></defs>` +
        `<rect width='672' height='294' rx='28' fill='url(#g)'/>` +
        `<circle cx='560' cy='60' r='120' fill='#fff' opacity='0.12'/><circle cx='120' cy='250' r='90' fill='#fff' opacity='0.10'/>` +
        `<text x='40' y='150' font-family='sans-serif' font-size='34' font-weight='700' fill='#fff'>${escSvg(title)}</text>` +
        `<text x='40' y='192' font-family='sans-serif' font-size='18' fill='#fff' opacity='0.85'>${escSvg(sub)}</text>` +
        `</svg>`,
    );

  // T Week 소멸 히어로 — 심플: 그레이 배경 + 텍스트만 (프로토타입 플레이스홀더)
  const tweekHeroSvg =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='672' height='294' viewBox='0 0 672 294'>` +
        `<rect width='672' height='294' rx='28' fill='#e5e7eb'/>` +
        `<text x='336' y='142' text-anchor='middle' font-family='sans-serif' font-size='24' font-weight='700' fill='#475569'>T Week 오늘 소멸 히어로</text>` +
        `<text x='336' y='174' text-anchor='middle' font-family='sans-serif' font-size='14' fill='#94a3b8'>오늘 자정 소멸 예정</text>` +
        `</svg>`,
    );

  // 여러 이름의 큐레이션 배너 (라이브러리 드롭다운 선택지 + 미리보기)
  const bannerTWeek = await prisma.banner.create({
    data: { name: 'T Week 오늘 소멸 히어로', imageUrl: tweekHeroSvg, linkUrl: '/tweek', status: 'active' },
  });
  const bannerSummer = await prisma.banner.create({
    data: { name: '여름 이벤트 배너', imageUrl: bannerSvg('여름 이벤트 배너', '시원한 여름 혜택 모음', '#0ea5e9', '#22d3ee'), linkUrl: '/event', status: 'active' },
  });
  for (const b of [
    { name: '주말 특가 혜택', sub: '주말 한정 특별가', from: '#6366f1', to: '#a855f7', link: '/weekend' },
    { name: '신규 가입 웰컴 혜택', sub: '첫 방문 감사 혜택', from: '#10b981', to: '#0ea5e9', link: '/welcome' },
    { name: 'VIP 전용 프로모션', sub: '멤버십 전용 혜택', from: '#7c3aed', to: '#db2777', link: '/vip' },
    { name: '카운트다운 마감 임박', sub: '마감 임박 · 서두르세요', from: '#ef4444', to: '#7c3aed', link: '/countdown' },
  ]) {
    await prisma.banner.create({
      data: { name: b.name, imageUrl: bannerSvg(b.name, b.sub, b.from, b.to), linkUrl: b.link, status: 'active' },
    });
  }
  await prisma.corner.update({ where: { id: cornerTWeek.id }, data: { bannerId: bannerTWeek.id } });
  await prisma.corner.update({ where: { id: cornerEvent.id }, data: { bannerId: bannerSummer.id } });

  // Container + Template + 배치
  const container = await prisma.container.create({
    data: {
      name: '혜택 홈', containerType: 'MAIN', channel: 'APP', status: 'active',
      previewUrl: 'https://main-concept1.vercel.app/',
      metaUse: true,
      searchTags: '#혜택 #홈 #추천 #멤버십',
      metaKeywords: '혜택,홈,추천,멤버십,T우주',
      metaDescription: '매일 새로워지는 맞춤 혜택을 한 곳에서 확인하세요.',
      ogTitle: '혜택 홈',
      ogDescription: '지훈님을 위한 맞춤 혜택 홈',
      ogSiteName: 'T우주',
      ogImage: 'https://main-concept1.vercel.app/og.png',
    },
  });
  const template = await prisma.template.create({
    data: {
      containerId: container.id,
      name: '혜택 기본',
      conditionGroup: '로그인',
      isDefault: true,
      status: 'DRAFT',
      version: 1,
      templateCorners: {
        create: [
          { cornerId: cornerTop.id, order: 0 },
          { cornerId: cornerMovie.id, order: 1 },
          { cornerId: cornerZeroWeek.id, order: 2 },
          { cornerId: cornerBanner1.id, order: 3 },
          { cornerId: cornerTWeek.id, order: 4 },
          { cornerId: cornerTDay.id, order: 5 },
          { cornerId: cornerAirpods.id, order: 6 },
          { cornerId: cornerCategory.id, order: 7 },
        ],
      },
    },
  });
  await prisma.container.update({ where: { id: container.id }, data: { defaultTemplateId: template.id } });

  // 두 번째 Template (비로그인) — 조건 그룹 비교 화면 검증용. 일부 Corner만 배치.
  await prisma.template.create({
    data: {
      containerId: container.id,
      name: '비로그인 기본',
      conditionGroup: '비로그인',
      isDefault: false,
      status: 'DRAFT',
      version: 1,
      templateCorners: {
        create: [
          { cornerId: cornerTop.id, order: 0 },
          { cornerId: cornerMovie.id, order: 1 },
          { cornerId: cornerEvent.id, order: 2 },
          { cornerId: cornerAirpods.id, order: 3 },
        ],
      },
    },
  });

  // ═══════════════════════════════════════════════════════════
  // 쇼핑 홈 (Container) — 혜택 홈과 동일 포맷 (Container + 기본 Template + Corner 배치)
  // ═══════════════════════════════════════════════════════════
  // 1) 상단 카테고리 탭 (업무 진입형 · 선택형)
  const shopTab = await comp('쇼핑 상단 탭', '선택형', [
    { name: '쇼핑탭:추천', atomType: 'TEXT', content: '추천' },
    { name: '쇼핑탭:패션', atomType: 'TEXT', content: '패션' },
    { name: '쇼핑탭:뷰티', atomType: 'TEXT', content: '뷰티' },
    { name: '쇼핑탭:디지털', atomType: 'TEXT', content: '디지털' },
    { name: '쇼핑탭:식품', atomType: 'TEXT', content: '식품' },
    { name: '쇼핑탭:리빙', atomType: 'TEXT', content: '리빙' },
    { name: '쇼핑탭:유아동', atomType: 'TEXT', content: '유아동' },
  ]);
  const shopCornerTab = await corner(
    { name: '쇼핑 상단 탭', cornerType: '업무 진입형', maxItems: 10, layoutDetail: '고정형(탭)', subTitleIcon: '사용안함' },
    [{ id: shopTab.id, componentType: '선택형' }],
  );

  // 2) 쇼핑 히어로 배너 (배너형 · 이미지형/빅배너)
  const shopHeroBanner = await prisma.banner.create({
    data: { name: '쇼핑 여름 특가 히어로', imageUrl: bannerSvg('여름 맞이 최대 70%', '오늘만 이 가격 · TODAY SALE', '#2563eb', '#06b6d4'), linkUrl: '/shop/summer', status: 'active' },
  });
  const shopHero = await comp('쇼핑 히어로 배너', '배너형', [
    { name: '쇼핑히어로 제목', atomType: 'TEXT', content: '여름 맞이 최대 70% 특가' },
    { name: '쇼핑히어로 서브', atomType: 'INFO', content: '오늘만 이 가격, 지금 확인하세요' },
    { name: '쇼핑히어로 이미지', atomType: 'IMAGE', imageUrl: '/assets/shop-hero.png', altText: '여름 특가 히어로 배너' },
  ]);
  const shopCornerHero = await corner(
    { name: '쇼핑 히어로 배너', cornerType: '배너형', maxItems: 3, layoutDetail: '이미지형/빅배너' },
    [{ id: shopHero.id, componentType: '배너형' }],
  );

  // 3) 오늘의 특가 (상품형 · 가로형(2.5배열))
  const sp1 = await comp('갤럭시 버즈4 프로', '상품형', [
    { name: '버즈 이미지', atomType: 'IMAGE', imageUrl: '/assets/prod-buds.png', altText: '갤럭시 버즈4 프로' },
    { name: '버즈 제목', atomType: 'TEXT', content: '갤럭시 버즈4 프로' },
    { name: '버즈 가격', atomType: 'PRICE', content: '189,000원' },
    { name: '버즈 배지', atomType: 'BADGE', content: '25%' },
  ]);
  const sp2 = await comp('스탠리 텀블러', '상품형', [
    { name: '텀블러 이미지', atomType: 'IMAGE', imageUrl: '/assets/prod-tumbler.png', altText: '스탠리 텀블러' },
    { name: '텀블러 제목', atomType: 'TEXT', content: '스탠리 퀜처 940ml' },
    { name: '텀블러 가격', atomType: 'PRICE', content: '44,900원' },
    { name: '텀블러 배지', atomType: 'BADGE', content: '30%' },
  ]);
  const sp3 = await comp('나이키 에어맥스', '상품형', [
    { name: '운동화 이미지', atomType: 'IMAGE', imageUrl: '/assets/prod-shoes.png', altText: '나이키 에어맥스 DN' },
    { name: '운동화 제목', atomType: 'TEXT', content: '나이키 에어맥스 DN' },
    { name: '운동화 가격', atomType: 'PRICE', content: '159,000원' },
    { name: '운동화 배지', atomType: 'BADGE', content: '20%' },
  ]);
  const shopCornerDeal = await corner(
    {
      name: '오늘의 특가',
      cornerType: '상품형',
      minItems: 1,
      maxItems: 10,
      mainTitle: '오늘의 특가\n지금 아니면 못 사요',
      subTitle: 'TODAY SALE',
      layoutDetail: '가로형(2.5배열)',
      cornerLayout: '가로 SWIPE형',
      subTitleIcon: '화살표',
      sortStrategy: '낮은 가격순',
      noDisplayCondition: '재고 소진 시',
      moreButtonUse: true,
      moreButtonLabel: '특가 전체보기',
      moreButtonLink: '/shop/deal',
    },
    [
      { id: sp1.id, componentType: '상품형' },
      { id: sp2.id, componentType: '상품형' },
      { id: sp3.id, componentType: '상품형' },
    ],
  );

  // 4) 카테고리 기획전 배너 (배너형 · 이미지형)
  const shopCurationBanner = await prisma.banner.create({
    data: { name: '뷰티 페어 기획전', imageUrl: bannerSvg('뷰티 페어 최대 50%', '인기 브랜드 한정 특가', '#db2777', '#f472b6'), linkUrl: '/shop/beauty', status: 'active' },
  });
  const shopCuration = await comp('카테고리 기획전 배너', '배너형', [
    { name: '기획전 제목', atomType: 'TEXT', content: '뷰티 페어, 인기 브랜드 최대 50%' },
    { name: '기획전 서브', atomType: 'INFO', content: '이번 주 한정 특가' },
    { name: '기획전 이미지', atomType: 'IMAGE', imageUrl: '/assets/shop-beauty.png', altText: '뷰티 페어 기획전 배너' },
  ]);
  const shopCornerCuration = await corner(
    { name: '카테고리 기획전', cornerType: '배너형', maxItems: 3, layoutDetail: '이미지형' },
    [{ id: shopCuration.id, componentType: '배너형' }],
  );

  // 5) 베스트셀러 (상품형 · 세로형)
  const sb1 = await comp('정관장 홍삼정', '상품형', [
    { name: '홍삼 이미지', atomType: 'IMAGE', imageUrl: '/assets/prod-hongsam.png', altText: '정관장 홍삼정' },
    { name: '홍삼 제목', atomType: 'TEXT', content: '정관장 홍삼정 에브리타임' },
    { name: '홍삼 가격', atomType: 'PRICE', content: '89,000원' },
  ]);
  const sb2 = await comp('리큐 세제', '상품형', [
    { name: '세제 이미지', atomType: 'IMAGE', imageUrl: '/assets/prod-detergent.png', altText: '리큐 진한겔' },
    { name: '세제 제목', atomType: 'TEXT', content: '리큐 진한겔 대용량' },
    { name: '세제 가격', atomType: 'PRICE', content: '19,900원' },
  ]);
  const sb3 = await comp('카누 커피', '상품형', [
    { name: '커피 이미지', atomType: 'IMAGE', imageUrl: '/assets/prod-coffee.png', altText: '카누 마일드' },
    { name: '커피 제목', atomType: 'TEXT', content: '카누 마일드 200개입' },
    { name: '커피 가격', atomType: 'PRICE', content: '27,800원' },
  ]);
  const shopCornerBest = await corner(
    {
      name: '베스트셀러',
      cornerType: '상품형',
      maxItems: 8,
      mainTitle: '지금 가장 많이 담은\n베스트셀러',
      subTitle: '실시간 베스트',
      layoutDetail: '세로형',
      cornerLayout: '세로 리스트형',
      subTitleIcon: '화살표',
      sortStrategy: '인기순',
    },
    [
      { id: sb1.id, componentType: '상품형' },
      { id: sb2.id, componentType: '상품형' },
      { id: sb3.id, componentType: '상품형' },
    ],
  );

  // 6) 브랜드 위크 혜택 (혜택·오퍼형 · 혜택형)
  const sbrand1 = await comp('Apple 브랜드위크', '혜택형', [
    { name: '애플 아이콘', atomType: 'ICON', imageUrl: '/assets/brand-apple.png', altText: 'Apple 로고' },
    { name: '애플 혜택문구', atomType: 'BENEFIT_TEXT', content: '카드 청구할인 최대 10%' },
    { name: '애플 브랜드', atomType: 'TEXT', content: 'Apple 공식스토어' },
  ]);
  const sbrand2 = await comp('Dyson 브랜드위크', '혜택형', [
    { name: '다이슨 아이콘', atomType: 'ICON', imageUrl: '/assets/brand-dyson.png', altText: 'Dyson 로고' },
    { name: '다이슨 혜택문구', atomType: 'BENEFIT_TEXT', content: '사은품 증정 + 무이자 12개월' },
    { name: '다이슨 브랜드', atomType: 'TEXT', content: 'Dyson' },
  ]);
  const shopCornerBrand = await corner(
    {
      name: '브랜드 위크',
      cornerType: '혜택·오퍼형',
      maxItems: 6,
      mainTitle: '이번 주 브랜드 위크',
      subTitle: '브랜드 혜택',
      layoutDetail: '세로형',
      subTitleIcon: '화살표',
    },
    [
      { id: sbrand1.id, componentType: '혜택형' },
      { id: sbrand2.id, componentType: '혜택형' },
    ],
  );

  const shopContainer = await prisma.container.create({
    data: {
      name: '쇼핑 홈', containerType: 'MAIN', channel: 'APP', status: 'active',
      metaUse: true,
      searchTags: '#쇼핑 #홈 #특가 #세일',
      metaKeywords: '쇼핑,홈,특가,세일,커머스',
      metaDescription: '오늘의 특가와 추천 상품을 쇼핑 홈에서 만나보세요.',
      ogTitle: '쇼핑 홈',
      ogDescription: '오늘의 특가·추천 상품 모음',
      ogSiteName: 'T우주',
    },
  });
  const shopTemplate = await prisma.template.create({
    data: {
      containerId: shopContainer.id,
      name: '쇼핑 기본',
      conditionGroup: '로그인',
      isDefault: true,
      status: 'DRAFT',
      version: 1,
      templateCorners: {
        create: [
          { cornerId: shopCornerTab.id, order: 0 },
          { cornerId: shopCornerHero.id, order: 1 },
          { cornerId: shopCornerDeal.id, order: 2 },
          { cornerId: shopCornerCuration.id, order: 3 },
          { cornerId: shopCornerBest.id, order: 4 },
          { cornerId: shopCornerBrand.id, order: 5 },
        ],
      },
    },
  });
  await prisma.container.update({ where: { id: shopContainer.id }, data: { defaultTemplateId: shopTemplate.id } });
  await prisma.corner.update({ where: { id: shopCornerHero.id }, data: { bannerId: shopHeroBanner.id } });
  await prisma.corner.update({ where: { id: shopCornerCuration.id }, data: { bannerId: shopCurationBanner.id } });
  await prisma.auditLog.create({
    data: { actor: 'marina.kim@sk.com', targetType: 'Template', targetId: shopTemplate.id, afterValue: JSON.stringify({ name: '쇼핑 기본', status: 'DRAFT', corners: 6 }), reason: '쇼핑 홈 초안 생성', result: 'CREATED' },
  });

  // ═══════════════════════════════════════════════════════════
  // 마이 홈 (Container) — 혜택 홈과 동일 포맷
  // ═══════════════════════════════════════════════════════════
  // 1) 내 멤버십 요약 (고정·필수 노출형 · 정보형)
  const myProfile = await comp('내 멤버십 요약', '정보형', [
    { name: '마이 이름', atomType: 'TEXT', content: '지훈님, 안녕하세요' },
    { name: '마이 등급', atomType: 'BADGE', content: 'VIP' },
    { name: '마이 포인트', atomType: 'INFO', content: '보유 포인트 12,340P · 등급 혜택 보기' },
  ]);
  const myCornerProfile = await corner(
    { name: '내 멤버십 요약', cornerType: '고정·필수 노출형', title: '내 정보', maxItems: 1, subTitleIcon: '사용안함' },
    [{ id: myProfile.id, componentType: '정보형' }],
  );

  // 2) 빠른 메뉴 (업무 진입형 · 선택형)
  const myQuick = await comp('마이 빠른 메뉴', '선택형', [
    { name: '마이메뉴:주문내역', atomType: 'TEXT', content: '주문내역' },
    { name: '마이메뉴:찜', atomType: 'TEXT', content: '찜' },
    { name: '마이메뉴:쿠폰', atomType: 'TEXT', content: '쿠폰' },
    { name: '마이메뉴:리뷰', atomType: 'TEXT', content: '리뷰' },
    { name: '마이메뉴:1:1문의', atomType: 'TEXT', content: '1:1문의' },
  ]);
  const myCornerQuick = await corner(
    { name: '빠른 메뉴', cornerType: '업무 진입형', maxItems: 10, layoutDetail: '고정형(탭)', subTitleIcon: '사용안함' },
    [{ id: myQuick.id, componentType: '선택형' }],
  );

  // 3) 포인트 요약 (상태 안내형 · 정보형)
  const myPoint = await comp('포인트 현황', '정보형', [
    { name: '포인트 값', atomType: 'INFO', content: '12,340 P 보유' },
    { name: '포인트 소멸', atomType: 'TEXT', content: '이번 달 소멸 예정 500P' },
    { name: '포인트 CTA', atomType: 'CTA', content: '포인트 사용처 보기', linkUrl: '/my/point' },
  ]);
  const myCornerPoint = await corner(
    {
      name: '포인트 요약',
      cornerType: '상태 안내형',
      maxItems: 2,
      mainTitle: '포인트 현황',
      subTitle: '나의 포인트',
      layoutDetail: '카드형',
      subTitleIcon: '화살표',
    },
    [{ id: myPoint.id, componentType: '정보형' }],
  );

  // 4) 내 쿠폰함 (혜택·오퍼형 · 혜택형)
  const myCoupon1 = await comp('10% 할인 쿠폰', '혜택형', [
    { name: '쿠폰1 아이콘', atomType: 'ICON', imageUrl: '/assets/ic-coupon.png', altText: '할인 쿠폰' },
    { name: '쿠폰1 혜택문구', atomType: 'BENEFIT_TEXT', content: '전 상품 10% 할인 (~8/31)' },
    { name: '쿠폰1 대상', atomType: 'TEXT', content: '전 상품' },
  ]);
  const myCoupon2 = await comp('무료배송 쿠폰', '혜택형', [
    { name: '쿠폰2 아이콘', atomType: 'ICON', imageUrl: '/assets/ic-truck.png', altText: '무료배송 쿠폰' },
    { name: '쿠폰2 혜택문구', atomType: 'BENEFIT_TEXT', content: '3만원 이상 무료배송' },
    { name: '쿠폰2 대상', atomType: 'TEXT', content: '전 상품' },
  ]);
  const myCornerCoupon = await corner(
    {
      name: '내 쿠폰함',
      cornerType: '혜택·오퍼형',
      maxItems: 6,
      mainTitle: '지금 쓸 수 있는 쿠폰\n2장이 있어요',
      subTitle: '내 쿠폰함',
      layoutDetail: '세로형',
      subTitleIcon: '화살표',
    },
    [
      { id: myCoupon1.id, componentType: '혜택형' },
      { id: myCoupon2.id, componentType: '혜택형' },
    ],
  );

  // 5) 최근 주문 (상품형 · 세로형)
  const myOrder1 = await comp('최근 주문 - 버즈', '상품형', [
    { name: '주문1 이미지', atomType: 'IMAGE', imageUrl: '/assets/prod-buds.png', altText: '갤럭시 버즈4 프로' },
    { name: '주문1 제목', atomType: 'TEXT', content: '갤럭시 버즈4 프로' },
    { name: '주문1 상태', atomType: 'INFO', content: '배송 완료 · 7/29 도착' },
  ]);
  const myOrder2 = await comp('최근 주문 - 텀블러', '상품형', [
    { name: '주문2 이미지', atomType: 'IMAGE', imageUrl: '/assets/prod-tumbler.png', altText: '스탠리 텀블러' },
    { name: '주문2 제목', atomType: 'TEXT', content: '스탠리 퀜처 940ml' },
    { name: '주문2 상태', atomType: 'INFO', content: '배송 중 · 오늘 도착 예정' },
  ]);
  const myCornerOrder = await corner(
    {
      name: '최근 주문',
      cornerType: '상품형',
      maxItems: 8,
      mainTitle: '최근 주문한 상품',
      subTitle: '주문/배송',
      layoutDetail: '세로형',
      cornerLayout: '세로 리스트형',
      subTitleIcon: '화살표',
      moreButtonUse: true,
      moreButtonLabel: '주문 전체보기',
      moreButtonLink: '/my/orders',
    },
    [
      { id: myOrder1.id, componentType: '상품형' },
      { id: myOrder2.id, componentType: '상품형' },
    ],
  );

  // 6) 고객센터·설정 (콘텐츠 안내형 · 정보형)
  const mySupport = await comp('고객센터·설정', '정보형', [
    { name: '지원 공지', atomType: 'TEXT', content: '자주 묻는 질문 · 1:1 문의' },
    { name: '지원 안내', atomType: 'INFO', content: '평일 09:00~18:00 상담 가능' },
    { name: '설정 CTA', atomType: 'CTA', content: '앱 설정 바로가기', linkUrl: '/my/settings' },
  ]);
  const myCornerSupport = await corner(
    {
      name: '고객센터·설정',
      cornerType: '콘텐츠 안내형',
      maxItems: 4,
      mainTitle: '도움이 필요하신가요?',
      subTitle: '고객센터',
      layoutDetail: '리스트형',
      subTitleIcon: '화살표',
    },
    [{ id: mySupport.id, componentType: '정보형' }],
  );

  const myContainer = await prisma.container.create({
    data: {
      name: '마이 홈', containerType: 'MAIN', channel: 'APP', status: 'active',
      metaUse: true,
      searchTags: '#마이 #내정보 #멤버십',
      metaKeywords: '마이,내정보,멤버십,포인트,등급',
      metaDescription: '내 등급·포인트·주문내역을 마이 홈에서 관리하세요.',
      ogTitle: '마이 홈',
      ogDescription: '내 멤버십·포인트·주문 관리',
      ogSiteName: 'T우주',
    },
  });
  const myTemplate = await prisma.template.create({
    data: {
      containerId: myContainer.id,
      name: '마이 기본',
      conditionGroup: '로그인',
      isDefault: true,
      status: 'DRAFT',
      version: 1,
      templateCorners: {
        create: [
          { cornerId: myCornerProfile.id, order: 0 },
          { cornerId: myCornerQuick.id, order: 1 },
          { cornerId: myCornerPoint.id, order: 2 },
          { cornerId: myCornerCoupon.id, order: 3 },
          { cornerId: myCornerOrder.id, order: 4 },
          { cornerId: myCornerSupport.id, order: 5 },
        ],
      },
    },
  });
  await prisma.container.update({ where: { id: myContainer.id }, data: { defaultTemplateId: myTemplate.id } });
  await prisma.auditLog.create({
    data: { actor: 'marina.kim@sk.com', targetType: 'Template', targetId: myTemplate.id, afterValue: JSON.stringify({ name: '마이 기본', status: 'DRAFT', corners: 6 }), reason: '마이 홈 초안 생성', result: 'CREATED' },
  });

  // 코너 유형 카탈로그 (T우주 "코너 유형 관리") — 이 Container에 실제 배치된 유형만 정리한다.
  const placed = await prisma.templateCorner.findMany({
    where: { template: { containerId: container.id } },
    include: { corner: true },
  });
  // (기준분류 · 유형상세) 조합별로 카탈로그를 정리한다 — 코너에 쓰인 유형이 그대로 유형 관리에 반영된다.
  const repByType = new Map<string, (typeof placed)[number]['corner']>();
  for (const tc of placed) {
    const key = `${tc.corner.cornerType}|${tc.corner.layoutDetail ?? ''}`;
    if (!repByType.has(key)) repByType.set(key, tc.corner);
  }
  let typeIdx = 1;
  const seenBase = new Map<string, number>();
  for (const [, rep] of repByType) {
    const base = rep.cornerType;
    // 개인화 추천형(VIP 지훈님 섹션)은 "타이틀 + 칩(선택형) + 혜택 리스트(혜택형)" 복합형으로 등록
    const isComposite = base === '개인화 추천형';
    const detail = rep.layoutDetail ?? (isComposite ? '세로형' : null);
    const baseName = isComposite ? '복합형' : cornerTypeDisplayName(base); // 이미지에 있으면 그 이름, 없으면 우리 이름
    const seen = seenBase.get(base) ?? 0;
    const name = seen > 0 && detail ? `${baseName} · ${detail}` : baseName; // 같은 기준분류가 여러 개면 유형상세로 구분
    seenBase.set(base, seen + 1);
    await prisma.cornerType.create({
      data: {
        typeId: 'CY' + String(typeIdx).padStart(7, '0'),
        name,
        baseCategory: base,
        markupId: rep.markupId,
        typeDetail: detail,
        layout: rep.cornerLayout ?? (isComposite ? '세로 리스트형' : null),
        description: isComposite
          ? '타이틀 + 카테고리 칩(선택형) + 혜택 리스트(혜택형) 복합 구성 · 예: VIP 지훈님, 최대 할인 혜택만 모았어요'
          : null,
        channels: 'FO',
        platforms: '모바일',
        active: true,
        status: 'APPROVED',
        createdBy: '김마리나',
      },
    });
    typeIdx += 1;
  }

  await prisma.auditLog.create({
    data: {
      actor: 'marina.kim@sk.com',
      targetType: 'Template',
      targetId: template.id,
      afterValue: JSON.stringify({ name: '혜택 기본', status: 'DRAFT', corners: 8 }),
      reason: '혜택 홈 초안 생성(예시1·2·3 기반)',
      result: 'CREATED',
    },
  });

  console.log('✅ 시드 완료 (혜택 홈 · 쇼핑 홈 · 마이 홈):', {
    containers: await prisma.container.count(),
    templates: await prisma.template.count(),
    corners: await prisma.corner.count(),
    cornerTypes: await prisma.cornerType.count(),
    components: await prisma.component.count(),
    atoms: await prisma.atom.count(),
  });

  // 이벤트·미션 빌더 시드 (룰렛)
  await seedEvents(prisma);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
