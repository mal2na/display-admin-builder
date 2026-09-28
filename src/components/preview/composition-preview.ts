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
    components,
  };
}
