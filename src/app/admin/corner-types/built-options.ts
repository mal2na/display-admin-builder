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

// 디바이스·단말 카탈로그(SKT 판매 상품) → 상품형 코너 유형에서 '상품 담기'로 선택할 후보(2026-09-29 사용자 요청).
//  ※ 브랜드 이미지 에셋이 제한적이라 대표 단말 이미지로 대체(프로토타입). 실제 상품 원장 연동 시 교체.
const DEVICE_PRODUCTS: ProductOption[] = [
  { key: 'iPhone 20 Pro', brand: 'Apple', title: 'iPhone 20 Pro', imageUrl: '/assets/ds/device-iphone.png', price: '1,550,000원', badge: 'NEW' },
  { key: 'iPhone 20 Air', brand: 'Apple', title: 'iPhone 20 Air', imageUrl: '/assets/ds/device-iphone.png', price: '1,165,600원', badge: null },
  { key: 'iPhone 20', brand: 'Apple', title: 'iPhone 20', imageUrl: '/assets/ds/device-iphone.png', price: '1,250,000원', badge: null },
  { key: 'Galaxy S26 Ultra', brand: 'Samsung', title: 'Galaxy S26 Ultra', imageUrl: '/assets/ds/hero-device.png', price: '1,698,400원', badge: 'NEW' },
  { key: 'Galaxy S26', brand: 'Samsung', title: 'Galaxy S26', imageUrl: '/assets/ds/hero-device.png', price: '1,155,000원', badge: null },
  { key: 'Galaxy Z Flip8', brand: 'Samsung', title: 'Galaxy Z Flip8', imageUrl: '/assets/ds/hero-device.png', price: '1,485,000원', badge: null },
  { key: 'Galaxy Z Fold8', brand: 'Samsung', title: 'Galaxy Z Fold8', imageUrl: '/assets/ds/hero-device.png', price: '2,398,000원', badge: null },
  { key: 'AirPods Pro 3', brand: 'Apple', title: 'AirPods Pro 3', imageUrl: '/assets/ds/product-airpodspro.png', price: '359,000원', badge: null },
  { key: 'AirPods Max 3', brand: 'Apple', title: 'AirPods Max 3', imageUrl: '/assets/ds/product-airpodsmax.png', price: '769,000원', badge: null },
  { key: 'Galaxy Watch8', brand: 'Samsung', title: 'Galaxy Watch8', imageUrl: '/assets/ds/hero-device.png', price: '399,300원', badge: null },
];

// 상품형·혜택형 코너 유형에서 '상품 담기'로 선택할 후보(2026-09-29 사용자 결정).
//  = BSS 혜택 브랜드(제휴 혜택) + 디바이스·단말(SKT 판매 상품). category로 구분(디바이스/혜택).
//  브랜드명·대표 혜택/모델·이미지를 코너 유형 composition.items에 저장. 랜딩 URL은 담은 뒤 수동 편집.
export async function getProductOptions(): Promise<ProductOption[]> {
  const benefits: ProductOption[] = BSS_PRODUCTS.map((p) => ({
    key: p.key,
    title: p.benefit || p.name, // 대표 혜택이 있으면 그걸 타이틀로, 없으면 브랜드명
    brand: p.name,
    imageUrl: p.logo || null,
    price: null,
    badge: p.badges[0] ?? null,
    category: '혜택',
  }));
  const devices: ProductOption[] = DEVICE_PRODUCTS.map((d) => ({ ...d, category: '디바이스' }));
  // 디바이스를 먼저(상품형에서 자주 씀) 노출.
  return [...devices, ...benefits];
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
