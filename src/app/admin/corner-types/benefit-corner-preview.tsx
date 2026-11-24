'use client';
// 혜택형 코너 유형 미리보기/속성 — 기존 코너 유형 관리의 렌더러를 '그대로' 재사용(2026-11-23 사용자 요청).
//  혜택형(중분류·레이아웃) → 기존 baseCategory/typeDetail/componentType로 매핑 → cornerRowPreview + DevicePreview(미리보기) · CornerFieldList(코너 속성).
import { DevicePreview, cornerRowPreview, EMPTY_CORNER_TYPE, type CornerTypeRow } from './corner-type-manager';
import { benefitMap, fullsetSlots } from '@/lib/benefit-corner-types';
import { FullsetPreview } from './fullset-preview';
import { BenefitListPreview, kindOfMid } from './benefit-list-preview';

export function benefitCornerRow(mid: string, layout: string, typeId: string, name: string): CornerTypeRow {
  const m = benefitMap(mid, layout);
  return {
    ...EMPTY_CORNER_TYPE,
    id: typeId, typeId, name,
    baseCategory: m.base, componentType: m.comp, typeDetail: m.detail,
    presetDesignId: null, sampleImageUrl: null, // 스캐폴드(필드코드) 미리보기 — 설계도/이미지 아님
    useMainTitle: true, useSubTitle: true, useImage: true, usePrice: m.price !== false, useDesc: true,
    useBarcode: m.barcode ?? false, // 멤버십 바코드 옵션(바코드형) — base='혜택형'+상단이미지에서 하단 바코드
    defaultMaxItems: m.items ?? null, // 미리보기 아이템 개수(바코드형=1)
    active: true, status: 'APPROVED',
  };
}

// 기존 미리보기 — DevicePreview(cornerRowPreview). variant=list(균일 고정) | detail(패널 가득).
//  render:'image'(기존 렌더러에 없는 레이아웃=출석체크·진행바·좌우리스트)면 실제 프리셋 설계 이미지를 썸네일로.
export function BenefitCornerPreview({ mid, layout, typeId, name, variant, image }: { mid: string; layout: string; typeId: string; name: string; variant: 'list' | 'detail'; image?: string | null }) {
  const m = benefitMap(mid, layout);

  // 리스트형 — SB 공식 프리뷰(이벤트/미션/혜택프로그램/이용지원)로 렌더(2026-11-24).
  const sbKind = layout === '리스트형' ? kindOfMid(mid) : null;
  if (sbKind) {
    return <BenefitListPreview kind={sbKind} size={variant === 'list' ? 'sm' : 'lg'} />;
  }

  // 기존 CornerBlock에 없는 레이아웃(진행바·출석체크·좌우리스트) → 전용 껍데기 목업(필드 코드 + 위젯).
  if (m.render === 'special') {
    return <FullsetPreview slots={fullsetSlots(mid, layout)} size={variant === 'list' ? 'sm' : 'lg'} />;
  }

  const corner = cornerRowPreview(benefitCornerRow(mid, layout, typeId, name));
  // 미리보기 아이템 개수 제한(껍데기 가이드는 1개면 충분 등). 카테고리 칩(선택형)은 유지하고 반복 아이템 카드만 m.items개로 자른다.
  if (m.items != null && Array.isArray(corner.components)) {
    let n = 0;
    corner.components = corner.components.filter((c) => {
      if (c.componentType === '선택형') return true; // 상단 카테고리 칩 유지
      n += 1; return n <= m.items!;
    });
  }
  // 아이템 우측 버튼(Label) — 각 아이템 컴포넌트에 CTA 아톰 주입(BenefitRow가 CTA 있으면 우측 pill 렌더).
  if (m.itemButton && Array.isArray(corner.components)) {
    corner.components.forEach((c, i) => {
      if (c.componentType === '선택형') return;
      if (!c.atoms.some((a) => a.atomType === 'CTA')) c.atoms = [...c.atoms, { id: `cta-${i}`, name: 'CTA', atomType: 'CTA', content: 'Label' } as (typeof c.atoms)[number]];
    });
  }
  // 캐러셀형 스와이프 인디케이터(페이지 점) — 카드 아래 노출해 '옆으로 넘길 수 있음'을 표시.
  const Dots = () => (
    <div className="flex items-center justify-center gap-1.5">
      <span className="h-1.5 w-4 rounded-full bg-[#3617ce]" />
      <span className="h-1.5 w-1.5 rounded-full bg-[#c4c9cf]" />
      <span className="h-1.5 w-1.5 rounded-full bg-[#c4c9cf]" />
    </div>
  );

  if (variant === 'list') {
    // 리스트 썸네일 — 고정 박스(contain 축소)만. 바깥 흰 박스 제거 → 톤 셀 위에 카드(자체 라운드·쉐도우) 1장만.
    return <div className="pointer-events-none mx-auto flex flex-col items-center gap-2">
      <div className={`overflow-hidden ${m.carousel ? 'h-[196px]' : 'h-[220px]'} w-[150px]`}><DevicePreview corner={corner} fit="contain" align="center-middle" /></div>
      {m.carousel && <Dots />}
    </div>;
  }
  // 상세 — autoHeight. 카드(CornerBlock)가 자체 그림자를 가지므로 추가 필터 없이 그대로(필터는 스케일 카드에 비뚤게 입혀짐).
  return <div className="flex w-full flex-col items-center gap-3"><DevicePreview corner={corner} fit="autoHeight" />{m.carousel && <Dots />}</div>;
}
