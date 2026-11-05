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

// 메뉴 카탈로그 — 업무 진입형(상단 퀵메뉴·리스트) '불러오기'에서 고를 FO 전체메뉴 후보(2026-11-05 사용자 요청).
//  분류 = 마이 / 스토어 / 혜택 / 고객지원 (FO 전체메뉴 탭 기준). brand = 서브그룹.
//  아이콘 = 각 메뉴 텍스트에 맞는 벡터 아이콘(lucide). 'lucide:<Name>'로 저장 → 렌더 측에서 컴포넌트로(2026-11-05 사용자 요청: 아이콘이 텍스트와 안 맞음).
const lu = (n: string) => `lucide:${n}`;
const MENU_CATALOG: ProductOption[] = [
  // 마이
  { key: 'menu-my-data', brand: '이용 현황', title: '내 데이터/통화', imageUrl: lu('Signal'), price: null, badge: null, category: '마이' },
  { key: 'menu-my-realtime', brand: '이용 현황', title: '실시간 이용요금', imageUrl: lu('Gauge'), price: null, badge: null, category: '마이' },
  { key: 'menu-my-bill', brand: '이용 현황', title: '나의 요금', imageUrl: lu('Receipt'), price: null, badge: null, category: '마이' },
  { key: 'menu-my-billguide', brand: '이용 현황', title: '요금안내서', imageUrl: lu('FileText'), price: null, badge: null, category: '마이' },
  { key: 'menu-my-join', brand: '가입/서비스 관리', title: '내 가입 정보', imageUrl: lu('IdCard'), price: null, badge: null, category: '마이' },
  { key: 'menu-my-planchange', brand: '가입/서비스 관리', title: '요금제 변경', imageUrl: lu('RefreshCw'), price: null, badge: null, category: '마이' },
  { key: 'menu-my-sub', brand: '가입/서비스 관리', title: '나의 구독', imageUrl: lu('Repeat'), price: null, badge: null, category: '마이' },
  { key: 'menu-my-roaming', brand: '가입/서비스 관리', title: '로밍 이용 현황', imageUrl: lu('Globe'), price: null, badge: null, category: '마이' },
  { key: 'menu-my-membership', brand: '멤버십 혜택', title: '나의 T멤버십', imageUrl: lu('Crown'), price: null, badge: null, category: '마이' },
  // 스토어
  { key: 'menu-store-plan', brand: '가입/변경', title: '요금제', imageUrl: lu('Tag'), price: null, badge: null, category: '스토어' },
  { key: 'menu-store-device', brand: '가입/변경', title: '휴대폰', imageUrl: lu('Smartphone'), price: null, badge: null, category: '스토어' },
  { key: 'menu-store-accessory', brand: '가입/변경', title: '액세서리', imageUrl: lu('Headphones'), price: null, badge: null, category: '스토어' },
  { key: 'menu-store-sub', brand: '구독·쇼핑', title: '구독 상품', imageUrl: lu('Repeat'), price: null, badge: null, category: '스토어' },
  { key: 'menu-store-shop', brand: '구독·쇼핑', title: '쇼핑', imageUrl: lu('ShoppingBag'), price: null, badge: null, category: '스토어' },
  { key: 'menu-store-roaming', brand: '구독·쇼핑', title: '로밍', imageUrl: lu('Globe'), price: null, badge: null, category: '스토어' },
  // 혜택
  { key: 'menu-benefit-month', brand: '혜택 홈', title: '이달의 혜택', imageUrl: lu('Gift'), price: null, badge: null, category: '혜택' },
  { key: 'menu-benefit-pick', brand: '혜택 홈', title: '혜택 줍기', imageUrl: lu('Coins'), price: null, badge: null, category: '혜택' },
  { key: 'menu-category', brand: '혜택 홈', title: '카테고리', imageUrl: lu('LayoutGrid'), price: null, badge: null, category: '혜택' },
  { key: 'menu-vip', brand: '멤버십', title: 'VIP Pick', imageUrl: lu('Crown'), price: null, badge: null, category: '혜택' },
  { key: 'menu-tday', brand: '멤버십', title: 'T day', imageUrl: lu('CalendarDays'), price: null, badge: null, category: '혜택' },
  { key: 'menu-event', brand: '이벤트', title: '이벤트', imageUrl: lu('Ticket'), price: null, badge: null, category: '혜택' },
  { key: 'menu-membership', brand: '멤버십', title: '멤버십', imageUrl: lu('BadgeCheck'), price: null, badge: null, category: '혜택' },
  { key: 'menu-roaming-benefit', brand: '제휴', title: '로밍 혜택', imageUrl: lu('Plane'), price: null, badge: null, category: '혜택' },
  // 고객지원
  { key: 'menu-cs-ask', brand: '상담', title: '1:1 문의', imageUrl: lu('MessageCircle'), price: null, badge: null, category: '고객지원' },
  { key: 'menu-cs-chatbot', brand: '상담', title: '챗봇 상담', imageUrl: lu('Bot'), price: null, badge: null, category: '고객지원' },
  { key: 'menu-cs-faq', brand: '도움말', title: '자주 묻는 질문', imageUrl: lu('HelpCircle'), price: null, badge: null, category: '고객지원' },
  { key: 'menu-cs-billview', brand: '업무', title: '요금 조회', imageUrl: lu('Receipt'), price: null, badge: null, category: '고객지원' },
  { key: 'menu-cs-join', brand: '업무', title: '가입 신청', imageUrl: lu('UserPlus'), price: null, badge: null, category: '고객지원' },
];

// 영화 카탈로그 — 콘텐츠 안내형(영화 예매 등) '불러오기'. 지금 프로젝트에 있는 포스터로 영화만 쭉(2026-11-05 사용자 요청).
const MV = { toy: '/assets/movie-toystory.jpg', inc: '/assets/movie-incredibles.jpg', av: '/assets/movie-avengers.jpg' };
const MOVIE_CATALOG: ProductOption[] = [
  { key: 'mv-toy5', brand: '평점 4.8 · 예매율 32.1%', title: '토이스토리 5', imageUrl: MV.toy, price: null, badge: null, category: '영화' },
  { key: 'mv-inc3', brand: '평점 4.6 · 예매율 18.4%', title: '인크레더블 3', imageUrl: MV.inc, price: null, badge: null, category: '영화' },
  { key: 'mv-avengers', brand: '2026.12 개봉 예정', title: '어벤져스: 둠스데이', imageUrl: MV.av, price: null, badge: 'NEW', category: '영화' },
  { key: 'mv-inside3', brand: '평점 4.7 · 예매율 24.0%', title: '인사이드 아웃 3', imageUrl: MV.inc, price: null, badge: null, category: '영화' },
  { key: 'mv-frozen3', brand: '평점 4.5 · 예매율 15.2%', title: '겨울왕국 3', imageUrl: MV.toy, price: null, badge: null, category: '영화' },
  { key: 'mv-deadpool4', brand: '2026.11 개봉 예정', title: '데드풀 4', imageUrl: MV.av, price: null, badge: null, category: '영화' },
];

// 상품형·혜택형 코너 유형에서 '상품 담기'로 선택할 후보(2026-09-29 사용자 결정).
//  = BSS 혜택 브랜드(제휴 혜택) + 디바이스·단말(SKT 판매 상품). category로 구분(디바이스/혜택).
//  브랜드명·대표 혜택/모델·이미지를 코너 유형 composition.items에 저장. 랜딩 URL은 담은 뒤 수동 편집.
// BSS 대분류(EAT/BUY/PLAY) → 모달에서 구분해 보여줄 한글 카테고리(2026-09-30 사용자 요청: 디바이스·음식 등 구분).
const BSS_CAT_KO: Record<string, string> = { EAT: '음식', BUY: '쇼핑', PLAY: '문화·여가' };
// 대표 제휴 혜택 — 미리보기(composition-preview BENEFIT_ITEMS)와 '동일'하게 맞춘 3종(2026-11-05 사용자 요청: 0 Week ③채우기 = 미리보기와 일치).
//  혜택·오퍼형 세로형 ③채우기가 이 3종으로 '채워진 채' 시작한다(카탈로그 맨 앞). 불러오기 모달에도 맨 위에 노출.
const REP_BENEFITS: ProductOption[] = [
  { key: 'rep-gongcha', title: '인기 음료 6종 50% 할인', brand: '공차', imageUrl: '/assets/brand-gongcha.png', price: null, badge: '할인', category: '음식' },
  { key: 'rep-tlj', title: '브라우니 1개 증정', brand: '뚜레쥬르', imageUrl: '/assets/brand-tlj.png', price: null, badge: '증정', category: '음식' },
  { key: 'rep-nol', title: '전시회 40% 할인', brand: 'NOL 티켓', imageUrl: '/assets/brand-nol.png', price: null, badge: '할인', category: '문화·여가' },
];
// 혜택 카탈로그 — 혜택 = 가입·등급·이용·행동·조건에 따라 추가로 받는 가치(Value 중심). 제휴 할인·멤버십 혜택(음식/쇼핑/문화).
//  맨 앞 3종은 미리보기와 일치하는 대표 혜택(REP_BENEFITS), 그 뒤로 전체 제휴 브랜드.
function benefitCatalog(): ProductOption[] {
  return [
    ...REP_BENEFITS,
    ...BSS_PRODUCTS.map((p) => ({
      key: p.key,
      title: p.benefit || p.name,
      brand: p.name,
      imageUrl: p.logo || null,
      price: null,
      badge: p.badges[0] ?? null,
      category: BSS_CAT_KO[p.category] ?? '혜택',
    })),
  ];
}
// 배너 카탈로그 — 배너형은 '배너 캠페인 관리'에 등록된 배너를 '가져오기'로만 채운다(2026-11-05 사용자 요청: 직접 입력 없음, 캠페인에서 가져옴).
const BANNER_CATALOG: ProductOption[] = [
  { key: 'bn-lotte', title: '이번 주말, 가족 나들이에 쓰기 좋은 혜택', brand: 'LOTTE WORLD ADVENTURE', imageUrl: '/assets/lotteworld.png', price: null, badge: '제휴', category: '배너' },
  { key: 'bn-airpods', title: 'AirPods Max3 사전 예약 하셨나요?', brand: '사전예약 클럽 멤버십 혜택', imageUrl: '/assets/airpods-max.png', price: null, badge: '사전예약', category: '배너' },
  { key: 'bn-ott', title: 'OTT 무제한, 지금 요금제 하나로', brand: '0 Week 전용 혜택', imageUrl: '/assets/banner-plan-ott.svg', price: null, badge: '혜택', category: '배너' },
  { key: 'bn-sbux', title: '스타벅스 제휴 — 최대 20% 할인', brand: 'T 멤버십', imageUrl: '/assets/banner-starbucks.svg', price: null, badge: '제휴', category: '배너' },
];
// 상태 안내형(업무 진입형) 카탈로그 — 마이 홈의 '내 상태' 카드를 뭉텅이로 가져온다(2026-11-05 사용자 요청: 클릭하면 데이터가 한 번에).
//  값·보조문구는 런타임 고객 데이터(@cvm)로 자동 표시, 여기선 어떤 상태 카드를 노출할지만 고른다.
const STATUS_CATALOG: ProductOption[] = [
  { key: 'st-tuniverse', title: 'T 우주 구독료', brand: '67,500원 · 3개 상품 구독중', imageUrl: 'lucide:Boxes', price: null, badge: '구독', category: '상태' },
  { key: 'st-phonebill', title: '휴대폰 결제·이용료', brand: '23,800원 · 80,000원 한도', imageUrl: 'lucide:CreditCard', price: null, badge: null, category: '상태' },
  { key: 'st-livefee', title: '실시간 이용요금', brand: '39,250원 · 3월 납부완료', imageUrl: 'lucide:Receipt', price: null, badge: null, category: '상태' },
  { key: 'st-tpoint', title: 'T멤버십 포인트', brand: '13,500P · 3월 누적할인 1,700원', imageUrl: 'lucide:Coins', price: null, badge: null, category: '상태' },
  { key: 'st-data', title: '실시간 데이터 잔여량', brand: '6.5GB · 월 20GB', imageUrl: 'lucide:Gauge', price: null, badge: null, category: '상태' },
  { key: 'st-family', title: '결합가족', brand: '4명 · 15,000원 할인', imageUrl: 'lucide:Users', price: null, badge: null, category: '상태' },
];
// 코너 유형 '채우기' 카탈로그 — 상품형=상품 분류(9)만, 혜택·오퍼형=혜택 분류만, 그 외/미지정=둘 다(2026-10-28 사용자 정의).
//  "상품형을 클릭하면 상품 정보만 채울 수 있다" — 혜택 브랜드는 상품형에서 제외.
export async function getProductOptions(cornerType?: string): Promise<ProductOption[]> {
  if (cornerType === '상태 안내형') return STATUS_CATALOG; // 업무 진입형 상태 안내형 전용(2026-11-05)
  if (cornerType === '상품형') return PRODUCT_CATALOG;
  if (cornerType === '혜택·오퍼형' || cornerType === '혜택형') return benefitCatalog();
  if (cornerType === '업무 진입형') return MENU_CATALOG; // 메뉴 카탈로그(혜택·업무 메뉴)
  if (cornerType === '콘텐츠 안내형') return MOVIE_CATALOG; // 콘텐츠 안내형 = 영화만 불러오기(2026-11-05 사용자 요청)
  if (cornerType === '배너형') return BANNER_CATALOG; // 배너형 = 배너 캠페인 관리에서 가져오기(2026-11-05 사용자 요청)
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
