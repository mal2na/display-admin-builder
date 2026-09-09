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

// 미리보기용 실제 샘플 이미지 풀(main-concept 데모에서 추출 · public/assets/concept). 인덱스로 돌려가며 배정.
const IMAGE_POOL = [
  '/assets/concept/img02.png', '/assets/concept/img03.png', '/assets/concept/img04.png', '/assets/concept/img26.png',
  '/assets/concept/img24.png', '/assets/concept/img30.png', '/assets/concept/img19.png',
];
const LOGO_POOL = ['/assets/concept/img14.png', '/assets/concept/img20.png', '/assets/concept/img22.png', '/assets/concept/img25.png'];
const pick = (arr: string[], i: number) => arr[(i - 1 + arr.length * 100) % arr.length];

// 한 블록의 한 인스턴스(i번째) → PreviewComponent. buildComp(서버)과 같은 아톰 구성.
function blockComp(b: CompositionBlock, i: number): PreviewComponent {
  const badge = b.badge ? [atom({ name: '배지', atomType: 'BADGE', content: i === 1 ? 'NEW' : '' })] : [];
  const base = { id: nid(), componentType: b.componentType };
  switch (b.componentType) {
    case '선택형':
      return { ...base, name: '카테고리 탭', selectedIndex: 0, atoms: ['전체', '카테고리1', '카테고리2', '카테고리3'].map((c) => atom({ name: c, atomType: 'TEXT', content: c })) };
    case '상품형':
      return {
        ...base,
        name: `상품 ${i}`,
        atoms: [
          ...(b.image !== false ? [atom({ name: '상품 이미지', atomType: 'IMAGE', imageUrl: pick(IMAGE_POOL, i) })] : []),
          atom({ name: '상품명', atomType: 'TEXT', content: `상품 ${i}` }),
          ...badge,
          ...(b.price !== false ? [atom({ name: '가격', atomType: 'PRICE', content: '99,999원' })] : []),
          ...(b.desc !== false ? [atom({ name: '설명', atomType: 'INFO', content: '설명' })] : []),
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
    case '정보형':
      return {
        ...base,
        name: i > 1 ? `정보 카드 ${i}` : '정보 카드',
        atoms: [
          atom({ name: '아이콘', atomType: 'ICON', imageUrl: 'icon:general/Info' }),
          atom({ name: '값', atomType: 'PRICE', content: '주요 값' }),
          ...badge,
          atom({ name: '라벨', atomType: 'TEXT', content: '라벨' }),
        ],
      };
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
  for (const b of opts.composition) for (let i = 1; i <= b.count; i++) components.push(blockComp(b, i));
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
