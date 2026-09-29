import { prisma } from '@/lib/prisma';
import type { BuiltCornerOption, RegisteredCombo, BannerCampaignOption, ProductOption } from './corner-type-manager';
import { BSS_PRODUCTS } from '@/lib/bss-products';

/**
 * 전시화면관리(빌더)에서 실제로 만들어진 Corner의 유형 조합을 코너 유형 등록 후보로 반환한다.
 * cornerType → 만들어진 유형 상세(layoutDetail) 목록. layoutDetail이 null인 코너가 있으면 allowEmpty=true.
 * 코너 유형 등록/수정 폼의 드롭다운을 이 목록으로 제한한다 (전시화면관리에서 만들어진 유형만).
 */
export async function getBuiltCornerOptions(): Promise<BuiltCornerOption[]> {
  const corners = await prisma.corner.findMany({ select: { cornerType: true, layoutDetail: true } });
  const map = new Map<string, Set<string>>();
  for (const c of corners) {
    if (c.cornerType === '배너형') continue; // 배너형은 배너 캠페인 관리로 분리 → 코너 유형 등록 후보에서 제외
    if (!map.has(c.cornerType)) map.set(c.cornerType, new Set());
    map.get(c.cornerType)!.add(c.layoutDetail ?? '');
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'ko'))
    .map(([cornerType, set]) => ({
      cornerType,
      allowEmpty: set.has(''),
      details: [...set].filter(Boolean).sort((a, b) => a.localeCompare(b, 'ko')),
    }));
}

// 배너 캠페인 관리에 등록된 캠페인 → 스와이프형 코너 유형에서 '배너 묶기'로 선택할 후보.
//  각 캠페인의 대표 이미지·랜딩 URL을 그대로 끌어와(스냅샷) 코너 유형 composition.banners에 저장한다.
export async function getBannerCampaignOptions(): Promise<BannerCampaignOption[]> {
  const rows = await prisma.bannerCampaign.findMany({
    where: { exposeYn: true },
    select: { id: true, title: true, landingUrl: true, typeDetails: true },
    orderBy: { campaignCode: 'asc' },
  });
  return rows.map((r) => {
    let sizes: { detail?: string; imageUrl?: string; rightImageUrl?: string }[] = [];
    try { sizes = r.typeDetails ? JSON.parse(r.typeDetails) : []; } catch { sizes = []; }
    const first = sizes[0];
    return { id: r.id, title: r.title, linkUrl: r.landingUrl ?? null, imageUrl: first?.imageUrl || first?.rightImageUrl || null, size: first?.detail ?? null };
  });
}

// BSS 혜택 브랜드 카탈로그 → 상품형·혜택형 코너 유형에서 '상품 담기'로 선택할 후보(2026-09-29 사용자 결정).
//  브랜드명·대표 혜택·로고를 그대로 끌어와 코너 유형 composition.items에 저장. 랜딩 URL은 담은 뒤 수동 편집.
export async function getProductOptions(): Promise<ProductOption[]> {
  return BSS_PRODUCTS.map((p) => ({
    key: p.key,
    title: p.benefit || p.name, // 대표 혜택이 있으면 그걸 타이틀로, 없으면 브랜드명
    brand: p.name,
    imageUrl: p.logo || null,
    price: null,
    badge: p.badges[0] ?? null,
  }));
}

/**
 * 등록된 코너 유형(코너 유형 관리 = 마스터)의 (코너유형·컴포넌트·배열) 조합.
 * 등록 폼의 ② 구성 컴포넌트 / ③ 배열 상세를 "그 코너 유형에 실제 등록된 것"으로 좁히는 데 쓴다.
 */
export async function getRegisteredCombos(): Promise<RegisteredCombo[]> {
  return prisma.cornerType.findMany({
    select: { baseCategory: true, componentType: true, typeDetail: true, bigBanner: true },
    orderBy: { typeId: 'asc' },
  });
}
