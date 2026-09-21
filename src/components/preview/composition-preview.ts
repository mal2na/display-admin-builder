// 코너 유형의 '컴포넌트 조합'(CompositionBlock[]) → 미리보기용 PreviewCorner.
// 조합 에디터에서 실제 렌더러(CornerBlock)로 라이브 미리보기를 그리기 위한 클라이언트 헬퍼.
// 아톰은 자리표시자 내용(빈 값/샘플)만 채운다 — 실제 내용은 빌더에서 입력.
import type { Composition, CompositionBlock } from '@/lib/display-taxonomy';
import type { PreviewAtom, PreviewComponent, PreviewCorner } from './blocks';

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

// 미리보기용 실제 샘플 이미지 풀(DS 포털 라이브러리에서 추출 · public/assets/ds). 인덱스로 돌려가며 배정.
const IMAGE_POOL = [
  '/assets/ds/device-iphone.png', '/assets/ds/plan-5gx.png', '/assets/ds/pack-baemin.png',
  '/assets/ds/movie-cgv.png', '/assets/ds/banner-activation.png',
];
// 상품형 카드 이미지(단말·요금제·구독) / 콘텐츠 무비 포스터 — 유형별로 카테고리 맞춰 배정
const PRODUCT_POOL = ['/assets/ds/device-iphone.png', '/assets/ds/plan-5gx.png', '/assets/ds/sub-tving.png', '/assets/ds/sub-streaming.png'];
const MOVIE_POOL = ['/assets/ds/movie-still-1.png', '/assets/ds/movie-still-2.png', '/assets/ds/movie-cgv.png'];
const MOVIES: [string, string][] = [['인크레더블 3', '평점 4.7 · 예매율 21.4%'], ['토이스토리 5', '평점 3.6 · 예매율 18.7%'], ['어벤져스 엔드', '평점 4.2 · 예매율 15.1%']];
const LOGO_POOL = [
  '/assets/ds/logo-gongcha.png', '/assets/ds/logo-baskin.png', '/assets/ds/logo-paulbassett.png',
  '/assets/ds/logo-tlj.png', '/assets/ds/logo-nol.png', '/assets/ds/logo-domino.png', '/assets/ds/logo-tmap.png',
];
const pick = (arr: string[], i: number) => arr[(i - 1 + arr.length * 100) % arr.length];

// 한 블록의 한 인스턴스(i번째) → PreviewComponent. buildComp(서버)과 같은 아톰 구성.
function blockComp(b: CompositionBlock, i: number, ctx?: { base?: string; detail?: string | null }): PreviewComponent {
  const badge = b.badge ? [atom({ name: '배지', atomType: 'BADGE', content: i === 1 ? 'NEW' : '' })] : [];
  const base = { id: nid(), componentType: b.componentType };
  const isMovie = ctx?.base === '콘텐츠 안내형' || /무비/.test(ctx?.detail ?? '');
  switch (b.componentType) {
    case '선택형': {
      // 업무 진입형 — 메뉴형은 세로 메뉴 라벨, 칩형은 아이콘+텍스트 퀵링크. 그 외는 카테고리 탭.
      if (/메뉴/.test(ctx?.detail ?? '')) {
        return { ...base, name: '메뉴', atoms: ['데이터/통화 관리', '나의 요금제/부가서비스', '약정할인/기기 할부 정보', '나의 PASS지갑', '나의 쇼핑'].map((c) => atom({ name: c, atomType: 'TEXT', content: c })) };
      }
      const chips = /칩/.test(ctx?.detail ?? '') || ctx?.base === '업무 진입형'
        ? ['4월혜택', '혜택줍기', '카테고리', '이벤트', '영화예매', 'VIP']
        : ['전체', '카테고리1', '카테고리2', '카테고리3'];
      return { ...base, name: '카테고리 탭', selectedIndex: 0, atoms: chips.map((c) => atom({ name: c, atomType: 'TEXT', content: c })) };
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
          ...(b.image !== false ? [atom({ name: '상품 이미지', atomType: 'IMAGE', imageUrl: pick(PRODUCT_POOL, i) })] : []),
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
    case '혜택형':
      return {
        ...base,
        name: `혜택 ${i}`,
        atoms: [
          atom({ name: '로고', atomType: 'ICON', imageUrl: pick(LOGO_POOL, i) }),
          ...badge,
          atom({ name: '혜택 문구', atomType: 'BENEFIT_TEXT', content: `혜택 ${i} 문구` }),
          atom({ name: '브랜드', atomType: 'INFO', content: `브랜드 ${i}` }),
        ],
      };
    case '배너형':
      return {
        ...base,
        name: i > 1 ? `배너 ${i}` : '배너',
        atoms: [
          atom({ name: '배너 타이틀', atomType: 'TEXT', content: '배너 타이틀' }),
          atom({ name: '배너 설명', atomType: 'INFO', content: '배너 설명 문구' }),
          atom({ name: '배너 CTA', atomType: 'CTA', content: '자세히 보기', linkUrl: '/' }),
          atom({ name: '배너 이미지', atomType: 'IMAGE', imageUrl: pick(IMAGE_POOL, i) }),
        ],
      };
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
