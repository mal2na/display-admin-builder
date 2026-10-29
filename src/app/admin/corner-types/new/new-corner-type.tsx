'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { CORNER_TYPES, componentTypesForCorner, componentLayoutDetails } from '@/lib/display-taxonomy';
import { isEventCornerFamily } from '@/lib/event-taxonomy';
import {
  CornerTypeForm,
  EMPTY_CORNER_TYPE,
  type BuiltCornerOption,
  type RegisteredCombo,
  type BannerCampaignOption,
  type ProductOption,
  type CornerTypeRow,
} from '../corner-type-manager';

/**
 * 코너 유형 등록 — 별도 페이지(/admin/corner-types/new).
 * 목록 위 인라인 폼이 아니라 독립 페이지라, 하단에 기존 코너 유형 목록이 보이지 않는다.
 */
export function NewCornerType({ builtOptions, registered = [], bannerCampaigns = [], productOptions = [] }: { builtOptions: BuiltCornerOption[]; registered?: RegisteredCombo[]; bannerCampaigns?: BannerCampaignOption[]; productOptions?: ProductOption[] }) {
  const router = useRouter();
  // 등록 시작값 — 유형별 그룹 뷰의 '배열·레이아웃 추가'에서 넘어온 유형/배열·레이아웃(base·detail)으로 prefill.
  const sp = useSearchParams();
  const preBase = sp.get('base');
  const preDetail = sp.get('detail');
  const baseValid = preBase && ((CORNER_TYPES as readonly string[]).includes(preBase) || isEventCornerFamily(preBase));
  // 배열·레이아웃(detail)을 담을 수 있는 컴포넌트 유형을 추론 → detail 라디오까지 prefill되게(base→컴포넌트→상세 캐스케이드).
  const preComp = baseValid && preDetail
    ? componentTypesForCorner(preBase!).find((c) => componentLayoutDetails(c).includes(preDetail)) ?? null
    : null;
  const createRow: CornerTypeRow = {
    ...EMPTY_CORNER_TYPE,
    baseCategory: baseValid ? preBase! : EMPTY_CORNER_TYPE.baseCategory,
    componentType: preComp ?? EMPTY_CORNER_TYPE.componentType,
    typeDetail: baseValid && preDetail ? preDetail : null,
  };

  return (
    <div>
      {/* 상단 브레드크럼 제거 — 하단 좌측 '목록'(뒤로가기)으로 대체(2026-10-29(2) 사용자 요청: 상품형·비상품형 상단 간격 차이 해소) */}
      <CornerTypeForm
        row={createRow}
        builtOptions={builtOptions}
        registered={registered}
        bannerCampaigns={bannerCampaigns}
        productOptions={productOptions}
        onClose={() => router.push('/admin/corner-types')}
      />
    </div>
  );
}
