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

// ── 상품 카탈로그(SKT 판매 상품) — 상품형 코너 '채우기'에서 고를 수 있는 후보 ────────────────
//  상품 = 고객이 가입·구매·변경해 새로 계약/소유하는 대상(Object 중심). 2026-10-28 사용자 정의.
//  분류(9): 요금제 · 휴대폰 · 인터넷/B tv · 구독 상품 · 악세사리 · 다이렉트 플랜 · USIM/eSIM · 로밍 · 부가서비스.
//  혜택 브랜드(제휴 할인·음식/쇼핑/문화)는 상품이 아니라 혜택 → 상품형 카탈로그에서 제외(혜택형으로).
//  ※ 이미지 에셋 제한으로 대표 이미지 대체(프로토타입). 실제 상품 원장(EPC) 연동 시 교체.
const PRODUCT_CATALOG: ProductOption[] = [
  // 요금제
  { key: 'plan-5g-premium', brand: '요금제', title: '5GX 프리미엄', imageUrl: null, price: '89,000원', badge: null, category: '요금제' },
  { key: 'plan-5g-slim', brand: '요금제', title: '5G 슬림', imageUrl: null, price: '55,000원', badge: null, category: '요금제' },
  { key: 'plan-0-youth', brand: '요금제', title: '0 청년 109', imageUrl: null, price: '109,000원', badge: 'NEW', category: '요금제' },
  { key: 'plan-lte-data', brand: '요금제', title: 'LTE 데이터 선택', imageUrl: null, price: '43,000원', badge: null, category: '요금제' },
  // 휴대폰
  { key: 'iPhone 20 Pro', brand: 'Apple', title: 'iPhone 20 Pro', imageUrl: '/assets/ds/device-iphone.png', price: '1,550,000원', badge: 'NEW', category: '휴대폰' },
  { key: 'iPhone 20 Air', brand: 'Apple', title: 'iPhone 20 Air', imageUrl: '/assets/ds/device-iphone.png', price: '1,165,600원', badge: null, category: '휴대폰' },
  { key: 'Galaxy S26 Ultra', brand: 'Samsung', title: 'Galaxy S26 Ultra', imageUrl: '/assets/ds/hero-device.png', price: '1,698,400원', badge: 'NEW', category: '휴대폰' },
  { key: 'Galaxy Z Flip8', brand: 'Samsung', title: 'Galaxy Z Flip8', imageUrl: '/assets/ds/hero-device.png', price: '1,485,000원', badge: null, category: '휴대폰' },
  // 인터넷/B tv
  { key: 'net-giga', brand: '인터넷', title: '기가 인터넷 1G', imageUrl: null, price: '36,300원', badge: null, category: '인터넷/B tv' },
  { key: 'btv-basic', brand: 'B tv', title: 'B tv 베이직', imageUrl: null, price: '13,200원', badge: null, category: '인터넷/B tv' },
  // 구독 상품
  { key: 'sub-universe', brand: '우주패스', title: '우주패스 all', imageUrl: null, price: '9,900원', badge: null, category: '구독 상품' },
  { key: 'sub-netflix', brand: 'Netflix', title: '넷플릭스 프리미엄', imageUrl: null, price: '17,000원', badge: null, category: '구독 상품' },
  { key: 'sub-youtube', brand: 'YouTube', title: '유튜브 프리미엄', imageUrl: null, price: '14,900원', badge: null, category: '구독 상품' },
  // 악세사리
  { key: 'AirPods Pro 3', brand: 'Apple', title: 'AirPods Pro 3', imageUrl: '/assets/ds/product-airpodspro.png', price: '359,000원', badge: null, category: '악세사리' },
  { key: 'AirPods Max 3', brand: 'Apple', title: 'AirPods Max 3', imageUrl: '/assets/ds/product-airpodsmax.png', price: '769,000원', badge: null, category: '악세사리' },
  { key: 'Galaxy Watch8', brand: 'Samsung', title: 'Galaxy Watch8', imageUrl: '/assets/ds/hero-device.png', price: '399,300원', badge: null, category: '악세사리' },
  // 다이렉트 플랜
  { key: 'direct-5g-55', brand: '다이렉트', title: '다이렉트 5G 55', imageUrl: null, price: '55,000원', badge: null, category: '다이렉트 플랜' },
  { key: 'direct-5g-30', brand: '다이렉트', title: '다이렉트 5G 30', imageUrl: null, price: '30,000원', badge: null, category: '다이렉트 플랜' },
  // USIM/eSIM
  { key: 'usim', brand: 'USIM', title: 'USIM (실물)', imageUrl: null, price: '7,700원', badge: null, category: 'USIM/eSIM' },
  { key: 'esim', brand: 'eSIM', title: 'eSIM (다운로드)', imageUrl: null, price: '2,750원', badge: null, category: 'USIM/eSIM' },
  // 로밍
  { key: 'roaming-baro', brand: '로밍', title: 'baro 요금제', imageUrl: null, price: '29,000원', badge: null, category: '로밍' },
  { key: 'roaming-pass', brand: '로밍', title: 'T로밍 하루 pass', imageUrl: null, price: '9,900원', badge: null, category: '로밍' },
  // 부가서비스
  { key: 'add-safe', brand: '부가서비스', title: '안심 옵션', imageUrl: null, price: '2,900원', badge: null, category: '부가서비스' },
  { key: 'add-coloring', brand: '부가서비스', title: '컬러링', imageUrl: null, price: '1,100원', badge: null, category: '부가서비스' },
];

// 메뉴 카탈로그 — 업무 진입형(상단 퀵메뉴·리스트) '불러오기'에서 고를 앱 메뉴 후보(2026-10-28 사용자 요청: 실제 모달).
//  혜택 메뉴(이달의 혜택·카테고리·VIP 등) + 업무 메뉴(요금조회·납부·가입 등). 랜딩은 담은 뒤 연결.
const MENU_CATALOG: ProductOption[] = [
  { key: 'menu-benefit-month', brand: '혜택', title: '이달의 혜택', imageUrl: null, price: null, badge: null, category: '혜택 메뉴' },
  { key: 'menu-benefit-pick', brand: '혜택', title: '혜택 줍기', imageUrl: null, price: null, badge: null, category: '혜택 메뉴' },
  { key: 'menu-category', brand: '혜택', title: '카테고리', imageUrl: null, price: null, badge: null, category: '혜택 메뉴' },
  { key: 'menu-vip', brand: '혜택', title: 'VIP Pick', imageUrl: null, price: null, badge: null, category: '혜택 메뉴' },
  { key: 'menu-tday', brand: '혜택', title: 'T day', imageUrl: null, price: null, badge: null, category: '혜택 메뉴' },
  { key: 'menu-event', brand: '혜택', title: '이벤트', imageUrl: null, price: null, badge: null, category: '혜택 메뉴' },
  { key: 'menu-membership', brand: '혜택', title: '멤버십', imageUrl: null, price: null, badge: null, category: '혜택 메뉴' },
  { key: 'menu-roaming', brand: '혜택', title: '로밍 혜택', imageUrl: null, price: null, badge: null, category: '혜택 메뉴' },
  { key: 'menu-bill-view', brand: '업무', title: '요금 조회', imageUrl: null, price: null, badge: null, category: '업무 메뉴' },
  { key: 'menu-bill-pay', brand: '업무', title: '요금 납부', imageUrl: null, price: null, badge: null, category: '업무 메뉴' },
  { key: 'menu-join', brand: '업무', title: '가입 신청', imageUrl: null, price: null, badge: null, category: '업무 메뉴' },
  { key: 'menu-usage', brand: '업무', title: '사용량 조회', imageUrl: null, price: null, badge: null, category: '업무 메뉴' },
  { key: 'menu-plan-change', brand: '업무', title: '요금제 변경', imageUrl: null, price: null, badge: null, category: '업무 메뉴' },
  { key: 'menu-device', brand: '업무', title: '기기 변경', imageUrl: null, price: null, badge: null, category: '업무 메뉴' },
];

// 상품형·혜택형 코너 유형에서 '상품 담기'로 선택할 후보(2026-09-29 사용자 결정).
//  = BSS 혜택 브랜드(제휴 혜택) + 디바이스·단말(SKT 판매 상품). category로 구분(디바이스/혜택).
//  브랜드명·대표 혜택/모델·이미지를 코너 유형 composition.items에 저장. 랜딩 URL은 담은 뒤 수동 편집.
// BSS 대분류(EAT/BUY/PLAY) → 모달에서 구분해 보여줄 한글 카테고리(2026-09-30 사용자 요청: 디바이스·음식 등 구분).
const BSS_CAT_KO: Record<string, string> = { EAT: '음식', BUY: '쇼핑', PLAY: '문화·여가' };
// 혜택 카탈로그 — 혜택 = 가입·등급·이용·행동·조건에 따라 추가로 받는 가치(Value 중심). 제휴 할인·멤버십 혜택(음식/쇼핑/문화).
function benefitCatalog(): ProductOption[] {
  return BSS_PRODUCTS.map((p) => ({
    key: p.key,
    title: p.benefit || p.name,
    brand: p.name,
    imageUrl: p.logo || null,
    price: null,
    badge: p.badges[0] ?? null,
    category: BSS_CAT_KO[p.category] ?? '혜택',
  }));
}
// 코너 유형 '채우기' 카탈로그 — 상품형=상품 분류(9)만, 혜택·오퍼형=혜택 분류만, 그 외/미지정=둘 다(2026-10-28 사용자 정의).
//  "상품형을 클릭하면 상품 정보만 채울 수 있다" — 혜택 브랜드는 상품형에서 제외.
export async function getProductOptions(cornerType?: string): Promise<ProductOption[]> {
  if (cornerType === '상품형') return PRODUCT_CATALOG;
  if (cornerType === '혜택·오퍼형' || cornerType === '혜택형') return benefitCatalog();
  if (cornerType === '업무 진입형') return MENU_CATALOG; // 메뉴 카탈로그(혜택·업무 메뉴)
  if (cornerType === '콘텐츠 안내형') return benefitCatalog(); // 콘텐츠(영화 등)는 혜택 카탈로그 재사용(임시)
  // 미지정(신규 등록 등)은 상품 먼저 + 혜택 — 유형 선택 후 좁혀진다.
  return [...PRODUCT_CATALOG, ...benefitCatalog()];
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
