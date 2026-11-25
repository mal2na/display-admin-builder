'use client';
// 혜택형 코너 유형 미리보기/속성 — 기존 코너 유형 관리의 렌더러를 '그대로' 재사용(2026-11-23 사용자 요청).
//  혜택형(중분류·레이아웃) → 기존 baseCategory/typeDetail/componentType로 매핑 → cornerRowPreview + DevicePreview(미리보기) · CornerFieldList(코너 속성).
import { cornerRowPreview, EMPTY_CORNER_TYPE, type CornerTypeRow } from './corner-type-manager';
import { benefitMap } from '@/lib/benefit-corner-types';
import { BenefitPreviewCard, type BenefitDesign } from '@/components/preview/benefit-card';
import type { PreviewCorner, PreviewAtom, PreviewComponent } from '@/components/preview/blocks';

export function benefitCornerRow(mid: string, layout: string, typeId: string, name: string): CornerTypeRow {
  const m = benefitMap(mid, layout);
  return {
    ...EMPTY_CORNER_TYPE,
    id: typeId, typeId, name,
    baseCategory: m.base, componentType: m.comp, typeDetail: m.detail,
    presetDesignId: null, sampleImageUrl: null,
    useMainTitle: true, useSubTitle: true, useImage: true, usePrice: m.price !== false, useDesc: true,
    useBarcode: m.barcode ?? false,
    defaultMaxItems: m.items ?? null,
    active: true, status: 'APPROVED',
  };
}

const CONTEXT_MIDS = new Set(['제휴사형', '이벤트형', '혜택프로그램형']);
const atom = (id: string, content: string): PreviewAtom => ({ id, name: content, atomType: 'TEXT', content, imageUrl: null, altText: null, linkUrl: null } as PreviewAtom);
const comp = (id: string, componentType: string, atoms: PreviewAtom[], name = ''): PreviewComponent => ({ id, name, componentType, atoms });

// 혜택형 코너 유형 미리보기 — 정적 SB 이미지가 아니라 '코드(BenefitPreviewCard)'로 렌더(2026-11-25 사용자 요청: 전부 코드).
//  유형 상세/리스트의 '껍데기(필드 코드)' 프리뷰이므로 모든 요소를 켜 전체 구조를 보여준다.
export function BenefitCornerPreview({ mid, layout, variant }: { mid: string; layout: string; typeId?: string; name?: string; variant: 'list' | 'detail'; image?: string | null }) {
  const design: BenefitDesign = layout === '캐러셀형' ? 'carousel'
    : layout === '출석체크형' ? 'attendance'
    : layout === '룰렛형' ? 'roulette'
    : layout === '바코드형' ? 'barcode' : 'list';
  const square = mid === '이벤트형' || mid === '이용지원형';
  const hasCtx = CONTEXT_MIDS.has(mid);
  // 제휴사형·바코드형은 카피(타이틀) 밑 서브 CTA 버튼 없음 — 그 자리에 다양한 혜택이 노출(2026-11-25 SB, ButtonText hidden).
  const hasSubCta = mid !== '제휴사형' && design !== 'barcode';
  // 타이틀 플레이스홀더를 중분류에 맞게(제휴사/이벤트/미션/혜택 프로그램/이용 지원).
  const tWord = ({ 제휴사형: '제휴사', 이벤트형: '이벤트', 미션형: '미션', 혜택프로그램형: '혜택 프로그램', 이용지원형: '이용 지원' } as Record<string, string>)[mid] ?? mid.replace('형', '');

  const iWord = ({ 제휴사형: '혜택 프로그램', 이벤트형: '이벤트', 미션형: '미션', 혜택프로그램형: '혜택 프로그램', 이용지원형: '이용 지원' } as Record<string, string>)[mid] ?? tWord;
  const chips = comp('chip', '선택형', ['{Label}', '{Label}', '{Label}', '{Label}', '{Label}'].map((c, i) => atom(`c${i}`, c)));
  // 아이템 플레이스홀더도 중분류에 맞게({미션 내용} 등). title·sub 두 아톰.
  const items = [0, 1, 2].map((i) => comp(`it${i}`, '상품형', [atom(`t${i}`, `{${iWord} 내용}`), atom(`s${i}`, `{${iWord} 내용}`)]));
  const corner: PreviewCorner = {
    id: 'preview', name: '미리보기', cornerType: '혜택형', title: null, maxItems: null,
    mainTitle: `{${tWord} 타이틀\n${tWord} 타이틀}`, subTitle: hasSubCta ? '{Label}' : null,
    components: [chips, ...items],
    bigBanner: true,
    contextHeader: hasCtx,
    information: true,
    moreButtonUse: design !== 'barcode',
  };

  const itemBtn = !!benefitMap(mid, layout).itemButton; // 미션형 리스트 = 아이템 우측 {Label} pill
  const card = <BenefitPreviewCard corner={corner} design={design} squareThumb={square} itemButton={itemBtn} />;
  // 리스트(유형 목록 썸네일)는 zoom으로 축소 — transform scale과 달리 레이아웃 높이까지 줄어 '안 잘림'(2026-11-25 사용자 요청).
  if (variant === 'list') {
    return (
      <div className="pointer-events-none w-[300px]" style={{ zoom: 0.5 }}>{card}</div>
    );
  }
  return <div className="w-full">{card}</div>;
}

// cornerRowPreview는 다른 곳에서 쓰므로 import 유지(미사용 경고 방지용 no-op 참조).
void cornerRowPreview;
