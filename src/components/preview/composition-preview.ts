// 코너 유형의 '컴포넌트 조합'(CompositionBlock[]) → 미리보기용 PreviewCorner.
// 조합 에디터에서 실제 렌더러(CornerBlock)로 라이브 미리보기를 그리기 위한 클라이언트 헬퍼.
// 아톰은 자리표시자 내용(빈 값/샘플)만 채운다 — 실제 내용은 빌더에서 입력.
import type { Composition, CompositionBlock } from '@/lib/display-taxonomy';
import type { PreviewAtom, PreviewComponent, PreviewCorner } from './blocks';
import { chipTypeOf } from '@/lib/chip-types';

let uid = 0;
const nid = () => `cp-${uid++}`;
const atom = (a: Partial<PreviewAtom> & { atomType: string; name: string }): PreviewAtom => ({
  id: nid(),
  content: null,
  imageUrl: null,
  altText: null,
  linkUrl: null,
  ...a,
});

// 상품형 카드 이미지(단말·요금제·구독) / 콘텐츠 무비 포스터 — 유형별로 카테고리 맞춰 배정
const PRODUCT_POOL = ['/assets/ds/device-iphone.png', '/assets/ds/plan-5gx.png', '/assets/ds/sub-tving.png', '/assets/ds/sub-streaming.png'];
// 상품형 · 세로형 — SKT 요금제 안내 리스트(참고 이미지). 아이콘 타일 + 안내 문구 + 구간·가격.
const PLAN_ITEMS: { icon: string; title: string; sub: string }[] = [
  { icon: '/assets/ds/plan-unlimited.png', title: '데이터 걱정 없이 마음껏 사용해요', sub: '무제한 | 69,000원 부터' },
  { icon: '/assets/ds/plan-video.png', title: '영상도 보고 여유 있게 사용해요', sub: '50~100GB | 48,000원 부터' },
  { icon: '/assets/ds/plan-messenger.png', title: '메신저 위주로 가볍게 사용해요', sub: '5~10GB | 34,000원 부터' },
  { icon: '/assets/ds/plan-search.png', title: '원하는 요금제를 직접 찾아볼게요', sub: '19,000원 부터' },
];
// 상품형 · 세로형+배너 — 상단 히어로 배너 + 요금제(상품) 리스트(썸네일 라벨 + 이름 + 월가격 + 스펙). 참고: 약정 만료.
const PLAN_HERO = '/assets/ds/plan-hero-expire.png';
const PLAN_BANNER_ITEMS: { thumb: string; badge: string; name: string; price: string; spec: string }[] = [
  { thumb: '/assets/ds/plan-card-unlimited.png', badge: '무제한', name: '0 청년 109 (넷플릭스)', price: '월 99,000원', spec: '데이터 500GB | 넷플릭스 프리미엄 제공 +2' },
  { thumb: '/assets/ds/plan-card-150gb.png', badge: '150GB', name: '0 청년 109 (네이버 플러스 스토어)', price: '월 99,000원', spec: '데이터 500GB | 넷플릭스 프리미엄 제공 +2' },
];
// 상품형 · 가로형+배너 — 상단 히어로(아이폰) + 가로 상품 카드(단말기 추천). 참고: 최근 본 아이폰.
const DEVICE_HERO = '/assets/ds/hero-device.png';
const DEVICE_BANNER_ITEMS: { img: string; name: string; discount: string; price: string }[] = [
  { img: '/assets/ds/device-iphone.png', name: 'iPhone 20 Air', discount: '7%', price: '1,165,600원' },
  { img: '/assets/ds/device-iphone.png', name: 'iPhone 20 Air', discount: '7%', price: '1,165,600원' },
  { img: '/assets/ds/device-iphone.png', name: 'iPhone 20 Air', discount: '7%', price: '1,165,600원' },
];
// 혜택·오퍼형 · 세로형 = 제휴 혜택 리스트(로고 + 혜택 문구 + 브랜드). 참고: 0 Week.
const BENEFIT_ITEMS: { logo: string; text: string; brand: string }[] = [
  { logo: '/assets/brand-gongcha.png', text: '인기 음료 6종 50% 할인', brand: '공차' },
  { logo: '/assets/brand-tlj.png', text: '브라우니 1개 증정', brand: '뚜레쥬르' },
  { logo: '/assets/brand-nol.png', text: '전시회 40% 할인', brand: 'NOL 티켓' },
];
// 혜택·오퍼형 · 가로형 = 기프티콘(상품) 가로 카드. 참고: 기프티콘 추천.
const GIFTICON_ITEMS: { img: string; name: string; discount: string; price: string }[] = [
  { img: '/assets/gift-perfume.png', name: '영 메모리즈 오드 퍼퓸 100ml', discount: '20%', price: '235,000원' },
  { img: '/assets/gift-humidifier.png', name: 'SNOWMAN8 Portable WARMGREY TAIL', discount: '5%', price: '46,550원' },
  { img: '/assets/gift-body.png', name: '로즈마리 리프레시 바디 세트', discount: '', price: '83,160원' },
];
// 콘텐츠 안내형 무비 3편 (토이스토리 · 인크레더블 · 둠스데이) — public/assets 실제 포스터.
const MOVIE_POOL = ['/assets/movie-toystory.jpg', '/assets/movie-incredibles.jpg', '/assets/movie-avengers.jpg'];
const MOVIES: [string, string][] = [['토이스토리 5', '평점 4.8 · 예매율 32.1%'], ['인크레더블', '평점 4.6 · 예매율 18.4%'], ['어벤져스: 둠스데이', '2026.12 개봉 예정']];
const LOGO_POOL = [
  '/assets/ds/logo-gongcha.png', '/assets/ds/logo-baskin.png', '/assets/ds/logo-paulbassett.png',
  '/assets/ds/logo-tlj.png', '/assets/ds/logo-nol.png', '/assets/ds/logo-domino.png', '/assets/ds/logo-tmap.png',
];
const pick = (arr: string[], i: number) => arr[(i - 1 + arr.length * 100) % arr.length];
// 혜택·오퍼형 대표 제휴 3종 (AROMATICA · 디퓨저 · NONFICTION)
// 이미지는 public/assets/ds/ 에 아래 파일명으로 넣어주면 그대로 노출됨(첨부 사진).
const BENEFIT_BRANDS: { logo: string; text: string; brand: string }[] = [
  { logo: '/assets/ds/benefit-aromatica.png', text: '아로마티카 라벤더 바디케어 세트', brand: 'AROMATICA' },
  { logo: '/assets/ds/benefit-diffuser.png', text: '릴렉싱 홈 디퓨저 기프트', brand: '디퓨저' },
  { logo: '/assets/ds/benefit-nonfiction.png', text: '논픽션 영 메모리즈 향수', brand: 'NONFICTION' },
];

// 한 블록의 한 인스턴스(i번째) → PreviewComponent. buildComp(서버)과 같은 아톰 구성.
function blockComp(b: CompositionBlock, i: number, ctx?: { base?: string; detail?: string | null }): PreviewComponent {
  const badge = b.badge ? [atom({ name: '배지', atomType: 'BADGE', content: i === 1 ? 'NEW' : '' })] : [];
  const base = { id: nid(), componentType: b.componentType };
  const isMovie = ctx?.base === '콘텐츠 안내형' || /무비/.test(ctx?.detail ?? '');
  // 상품형 · 세로형 = SKT 요금제 안내 리스트(참고 이미지). 세로형+배너/칩/카테고리탭은 제외.
  const isPlan = ctx?.base === '상품형' && ctx?.detail === '세로형';
  // 상품형 · 세로형+배너 = 상단 히어로 배너 + 요금제(상품) 리스트.
  const isPlanBanner = ctx?.base === '상품형' && /세로형\+배너|세로형\(배너\)/.test(ctx?.detail ?? '');
  // 상품형 · 가로형+배너 = 상단 히어로(아이폰) + 가로 상품 카드.
  const isDeviceBanner = ctx?.base === '상품형' && /가로형\+배너|가로형\(배너\)/.test(ctx?.detail ?? '');
  // 혜택·오퍼형 · 세로형 = 제휴 혜택 리스트 / 가로형 = 기프티콘 카드. (componentType가 상품형이어도 혜택·오퍼형이면 이쪽)
  const isBenefitVertical = ctx?.base === '혜택·오퍼형' && (ctx?.detail ?? '').includes('세로형');
  const isGifticon = ctx?.base === '혜택·오퍼형' && (ctx?.detail ?? '').includes('가로형');
  switch (b.componentType) {
    case '선택형': {
      // 업무 진입형 — 메뉴형은 세로 메뉴 라벨. 칩 계열(ChipHome/Contents/Filter/Page)은 종류별로 다르게. 그 외는 카테고리 탭.
      if (/메뉴/.test(ctx?.detail ?? '')) {
        return { ...base, name: '메뉴', atoms: ['데이터/통화 관리', '나의 요금제/부가서비스', '약정할인/기기 할부 정보', '나의 PASS지갑', '나의 쇼핑'].map((c) => atom({ name: c, atomType: 'TEXT', content: c })) };
      }
      const T = (labels: string[]) => labels.map((c) => atom({ name: c, atomType: 'TEXT', content: c }));
      const chipKind = chipTypeOf(ctx?.detail ?? '') ?? (ctx?.base === '업무 진입형' ? 'ChipHome' : null);
      // ChipHome — DS ChipHome. 아이콘+라벨 퀵칩 2행. Normal/<Icon> → icon:general/<Icon>.
      if (chipKind === 'ChipHome') {
        const items: [string, string][] = [
          ['장바구니', 'Cart'], ['검색', 'Search'], ['이벤트', 'Event'], ['혜택', 'Star'],
          ['VIP', 'Vip'], ['영화', 'Movie'], ['구독', 'Subscribe'], ['가족', 'Family'],
        ];
        return { ...base, name: 'ChipHome', selectedIndex: 0, chipRows: 2, chipVariant: 'home', atoms: items.map(([label, icon]) => atom({ name: label, atomType: 'TEXT', content: label, imageUrl: `icon:general/${icon}` })) };
      }
      // ChipContents — 콘텐츠 필터 칩(선택 1개 강조). DS Selection="1" → 인덱스 1.
      if (chipKind === 'ChipContents') {
        return { ...base, name: 'ChipContents', selectedIndex: 1, chipVariant: 'contents', atoms: T(['전체', '인기', '신상', '할인', '브랜드', '추천', '베스트', '이벤트']) };
      }
      // ChipPage — 페이지 탭 칩(선택 언더라인).
      if (chipKind === 'ChipPage') {
        return { ...base, name: 'ChipPage', selectedIndex: 0, chipVariant: 'page', atoms: T(['전체', '인기', '신상', '할인', '브랜드', '추천']) };
      }
      // ChipFilter — 필터 칩(아웃라인 + 필터 글리프).
      if (chipKind === 'ChipFilter') {
        return { ...base, name: 'ChipFilter', selectedIndex: 0, chipVariant: 'filter', atoms: T(['카테고리', '가격대', '브랜드', '혜택', '배송']) };
      }
      // 카테고리 탭(기본 선택형) — 콘텐츠 필터 칩 스타일.
      return { ...base, name: '카테고리 탭', selectedIndex: 0, chipVariant: 'contents', atoms: T(['전체', '카테고리1', '카테고리2', '카테고리3']) };
    }
    case '상품형':
      // 혜택·오퍼형 · 세로형 — 제휴 혜택 리스트(로고 + 혜택 문구 + 브랜드). BenefitRow로 렌더.
      if (isBenefitVertical) {
        const bd = BENEFIT_ITEMS[(i - 1) % BENEFIT_ITEMS.length];
        return { ...base, name: bd.brand, atoms: [
          atom({ name: '로고', atomType: 'ICON', imageUrl: bd.logo }),
          atom({ name: '혜택 문구', atomType: 'BENEFIT_TEXT', content: bd.text }),
          atom({ name: '브랜드', atomType: 'INFO', content: bd.brand }),
        ] };
      }
      // 혜택·오퍼형 · 가로형 — 기프티콘 상품 카드(이미지 + 이름 + 할인율 + 가격). ProductCard로 렌더.
      if (isGifticon) {
        const g = GIFTICON_ITEMS[(i - 1) % GIFTICON_ITEMS.length];
        return { ...base, name: g.name, atoms: [
          ...(b.image !== false ? [atom({ name: '상품 이미지', atomType: 'IMAGE', imageUrl: g.img })] : []),
          atom({ name: '상품명', atomType: 'TEXT', content: g.name }),
          ...(g.discount ? [atom({ name: '할인율', atomType: 'TEXT', content: g.discount })] : []),
          ...(b.price !== false ? [atom({ name: '가격', atomType: 'PRICE', content: g.price })] : []),
        ] };
      }
      // 상품형 · 세로형+배너 — 요금제(상품) 행: 카드 썸네일 + 이름 + 월가격 + 스펙. PlanBannerRow로 렌더.
      if (isPlanBanner) {
        const pb = PLAN_BANNER_ITEMS[(i - 1) % PLAN_BANNER_ITEMS.length];
        return { ...base, name: pb.name, atoms: [
          atom({ name: '카드 이미지', atomType: 'IMAGE', imageUrl: pb.thumb }),
          atom({ name: '라벨', atomType: 'BADGE', content: pb.badge }),
          atom({ name: '요금제명', atomType: 'TEXT', content: pb.name }),
          atom({ name: '월정액', atomType: 'PRICE', content: pb.price }),
          atom({ name: '스펙', atomType: 'INFO', content: pb.spec }),
        ] };
      }
      // 상품형 · 가로형+배너 — 가로 상품 카드(이미지 + 이름 + 할인율 + 가격). ProductCard로 렌더.
      if (isDeviceBanner) {
        const db = DEVICE_BANNER_ITEMS[(i - 1) % DEVICE_BANNER_ITEMS.length];
        return { ...base, name: db.name, atoms: [
          ...(b.image !== false ? [atom({ name: '상품 이미지', atomType: 'IMAGE', imageUrl: db.img })] : []),
          atom({ name: '상품명', atomType: 'TEXT', content: db.name }),
          ...(b.price !== false ? [
            atom({ name: '할인율', atomType: 'TEXT', content: db.discount }),
            atom({ name: '가격', atomType: 'PRICE', content: db.price }),
          ] : []),
        ] };
      }
      // 상품형 · 세로형 — 요금제 안내 리스트(아이콘 + 안내 문구 + 구간·가격). BenefitRow로 렌더.
      if (isPlan) {
        const p = PLAN_ITEMS[(i - 1) % PLAN_ITEMS.length];
        return { ...base, name: p.title, atoms: [
          atom({ name: '아이콘', atomType: 'ICON', imageUrl: p.icon }),
          atom({ name: '안내 문구', atomType: 'TEXT', content: p.title }),
          atom({ name: '구간·가격', atomType: 'INFO', content: p.sub }),
        ] };
      }
      // 콘텐츠 안내형(무비) — 포스터 + 영화 제목 + 평점·예매율 (가격 없음)
      if (isMovie) {
        const m = MOVIES[(i - 1) % MOVIES.length];
        return { ...base, name: `영화 ${i}`, atoms: [
          ...(b.image !== false ? [atom({ name: '상품 이미지', atomType: 'IMAGE', imageUrl: pick(MOVIE_POOL, i) })] : []),
          atom({ name: '상품명', atomType: 'TEXT', content: m[0] }),
          atom({ name: '용량', atomType: 'INFO', content: m[1] }),
        ] };
      }
      // DS ListProductGrid 기준 — 브랜드·상품명·가격기준·할인율·가격·기간·서브텍스트·용량 캡션.
      return {
        ...base,
        name: `상품 ${i}`,
        atoms: [
          ...(b.image !== false ? [atom({ name: '상품 이미지', atomType: 'IMAGE', imageUrl: '/assets/ds/device-iphone.png' })] : []),
          atom({ name: '브랜드', atomType: 'TEXT', content: 'Apple' }),
          atom({ name: '상품명', atomType: 'TEXT', content: 'iPhone 20 Pro' }),
          ...badge,
          ...(b.price !== false ? [
            atom({ name: '가격 기준', atomType: 'INFO', content: '선택 약정 12개월 기준' }),
            atom({ name: '할인율', atomType: 'TEXT', content: '99%' }),
            atom({ name: '가격', atomType: 'PRICE', content: '99,999원' }),
            atom({ name: '기간', atomType: 'INFO', content: '/12개월' }),
          ] : []),
          ...(b.desc !== false ? [atom({ name: '용량', atomType: 'INFO', content: '256GB | 512GB | 1TB' })] : []),
        ],
      };
    case '혜택형': {
      // 혜택·오퍼형 대표 제휴 브랜드 — 공차 · 뚜레쥬르 · 놀 티켓
      const bd = BENEFIT_BRANDS[(i - 1) % BENEFIT_BRANDS.length];
      return {
        ...base,
        name: bd.brand,
        atoms: [
          atom({ name: '로고', atomType: 'ICON', imageUrl: bd.logo }),
          ...badge,
          atom({ name: '혜택 문구', atomType: 'BENEFIT_TEXT', content: bd.text }),
          atom({ name: '브랜드', atomType: 'INFO', content: bd.brand }),
        ],
      };
    }
    case '배너형': {
      // 콤포즈형 혜택 배너(제목 좌 + 로고/제품 우) — 롯데월드·AirPods. 배너 캠페인 관리 소재와 동일한 룩.
      const BANNERS = [
        { title: '이번 주말, 가족 나들이에\n쓰기 좋은 혜택', sub: '제휴사별 혜택 더보기', img: '/assets/lotteworld.png' },
        { title: 'AirPods Max3\n사전 예약 하셨나요?', sub: '사전예약 클럽 멤버십 혜택', img: '/assets/ds/product-airpodsmax.png' },
      ];
      const bn = BANNERS[(i - 1) % BANNERS.length];
      return {
        ...base,
        name: i > 1 ? `배너 ${i}` : '배너',
        atoms: [
          atom({ name: '배너 타이틀', atomType: 'TEXT', content: bn.title }),
          atom({ name: '배너 설명', atomType: 'INFO', content: bn.sub }),
          atom({ name: '배너 이미지', atomType: 'IMAGE', imageUrl: bn.img }),
        ],
      };
    }
    case '정보형': {
      // 상태 안내형 — 금액/포인트 + 상태 배지 + 라벨 + 아이콘 (마이 홈 상태 카드 기준)
      const STATUS: [string, string, string][] = [
        ['67,500원', 'T 우주 월 구독료', '3개 상품 구독중'],
        ['39,250원', '실시간 이용요금', '3월 납부완료'],
        ['13,500P', 'T멤버십 포인트', '누적할인 1,700원'],
        ['23,800원', '휴대폰 결제 / 콘텐츠 이용료', '80,000원 한도'],
      ];
      const s = STATUS[(i - 1) % STATUS.length];
      return {
        ...base,
        name: i > 1 ? `상태 ${i}` : '상태 카드',
        atoms: [
          atom({ name: '값', atomType: 'PRICE', content: s[0] }),
          atom({ name: '상태배지', atomType: 'BADGE', content: s[2] }),
          atom({ name: '라벨', atomType: 'TEXT', content: s[1] }),
          atom({ name: '아이콘', atomType: 'ICON', imageUrl: 'icon:general/Info' }),
        ],
      };
    }
    case '행동형':
      return {
        ...base,
        name: i > 1 ? `바로가기 ${i}` : '바로가기',
        atoms: [
          atom({ name: '제목', atomType: 'TEXT', content: '업무 바로가기' }),
          atom({ name: '버튼', atomType: 'CTA', content: '바로가기', linkUrl: '/' }),
        ],
      };
    default:
      return { ...base, name: `${b.componentType} ${i}`, atoms: [] };
  }
}

export function compositionToPreviewCorner(opts: {
  base: string;
  detail?: string | null;
  layout?: string | null;
  mainTitle?: string | null;
  subTitle?: string | null;
  composition: Composition;
}): PreviewCorner {
  uid = 0;
  const components: PreviewComponent[] = [];
  const ctx = { base: opts.base, detail: opts.detail };
  for (const b of opts.composition) for (let i = 1; i <= b.count; i++) components.push(blockComp(b, i, ctx));
  // 세로형+배너 = 요금제 히어로, 가로형+배너 = 아이폰 히어로. 둘 다 상단 히어로 배너(빅배너) 자동 표시.
  const isPlanBanner = opts.base === '상품형' && /세로형\+배너|세로형\(배너\)/.test(opts.detail ?? '');
  const isDeviceBanner = opts.base === '상품형' && /가로형\+배너|가로형\(배너\)/.test(opts.detail ?? '');
  // 혜택·오퍼형 세로형+배너 = 상단 소멸 히어로(T Week형) — 이미지 미첨부 시 CornerBlock이 그라데이션 히어로로 렌더.
  const isBenefitBanner = opts.base === '혜택·오퍼형' && /세로형\+배너|세로형\(배너\)/.test(opts.detail ?? '');
  return {
    id: 'composition-preview',
    name: opts.base,
    cornerType: opts.base,
    title: null,
    maxItems: null,
    mainTitle: opts.mainTitle ?? null,
    subTitle: opts.subTitle ?? null,
    layoutDetail: opts.detail ?? null,
    cornerLayout: opts.layout ?? null,
    bigBanner: isPlanBanner || isDeviceBanner || isBenefitBanner || undefined,
    bannerImageUrl: isPlanBanner ? PLAN_HERO : isDeviceBanner ? DEVICE_HERO : undefined,
    components,
  };
}
