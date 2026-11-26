'use client';
// 혜택형 코너 유형 미리보기/속성 — 기존 코너 유형 관리의 렌더러를 '그대로' 재사용(2026-11-23 사용자 요청).
//  혜택형(중분류·레이아웃) → 기존 baseCategory/typeDetail/componentType로 매핑 → cornerRowPreview + DevicePreview(미리보기) · CornerFieldList(코너 속성).
import { cornerRowPreview, EMPTY_CORNER_TYPE, type CornerTypeRow } from './corner-type-manager';
import { benefitMap, hasLandingLink } from '@/lib/benefit-corner-types';
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
  // 바코드형은 독립 중분류(레이아웃=리스트형)라 레이아웃 문자열이 아니라 benefitMap.barcode로 판정(2026-11-26).
  const design: BenefitDesign = benefitMap(mid, layout).barcode ? 'barcode'
    : layout === '캐러셀형' ? 'carousel'
    : layout === '출석체크형' ? 'attendance'
    : layout === '룰렛형' ? 'roulette' : 'list';
  const square = mid === '이벤트형' || mid === '이용지원형';
  const hasCtx = CONTEXT_MIDS.has(mid);
  // 코너 랜딩 링크 버튼(타이틀 옆) — 개념 스왑(2026-11-26): 혜택프로그램형=있음 / 제휴사형=없음. 바코드형 제외.
  const hasSubCta = hasLandingLink(mid) && design !== 'barcode';
  // 타이틀 플레이스홀더를 중분류에 맞게(제휴사/이벤트/미션/혜택 프로그램/이용 지원).
  const tWord = ({ 제휴사형: '제휴사', 이벤트형: '이벤트', 미션형: '미션', 혜택프로그램형: '혜택 프로그램', 이용지원형: '이용 지원', 바코드형: '바코드' } as Record<string, string>)[mid] ?? mid.replace('형', '');

  // 바코드형 아이템 = 제휴사 리스트(멤버십 바코드는 별도 요소)(2026-11-26).
  const iWord = ({ 제휴사형: '제휴사', 이벤트형: '이벤트', 미션형: '미션', 혜택프로그램형: '혜택 프로그램', 이용지원형: '이용 지원', 바코드형: '제휴사' } as Record<string, string>)[mid] ?? tWord;
  const chips = comp('chip', '선택형', ['{Label}', '{Label}', '{Label}', '{Label}', '{Label}'].map((c, i) => atom(`c${i}`, c)));
  // 아이템 플레이스홀더도 중분류에 맞게({미션 내용} 등). title·sub 두 아톰. 혜택프로그램형은 개별 혜택이라 '{혜택명}'(2026-11-26 사용자 요청).
  const itemPh = mid === '혜택프로그램형' ? '{혜택명}' : `{${iWord} 내용}`;
  const items = [0, 1].map((i) => comp(`it${i}`, '상품형', [atom(`t${i}`, itemPh), atom(`s${i}`, itemPh)]));
  const corner: PreviewCorner = {
    id: 'preview', name: '미리보기', cornerType: '혜택형', title: null, maxItems: null,
    mainTitle: `{${tWord} 타이틀}`, subTitle: hasSubCta ? '{Label}' : null,
    components: [chips, ...items],
    bigBanner: true,
    contextHeader: hasCtx,
    information: true,
    moreButtonUse: design !== 'barcode',
  };

  const itemBtn = !!benefitMap(mid, layout).itemButton; // 미션형 리스트 = 아이템 우측 {Label} pill
  const card = <BenefitPreviewCard corner={corner} design={design} squareThumb={square} itemButton={itemBtn} />;
  // 리스트(유형 목록 썸네일)는 zoom으로 축소 — 레이아웃 높이까지 줄어 '안 잘림'(2026-11-25 사용자 요청).
  if (variant === 'list') {
    return (
      <div className="pointer-events-none w-[300px]" style={{ zoom: 0.5 }}>{card}</div>
    );
  }
  return <div className="w-full">{card}</div>;
}

// cornerRowPreview는 다른 곳에서 쓰므로 import 유지(미사용 경고 방지용 no-op 참조).
void cornerRowPreview;
