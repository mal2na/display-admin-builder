// BSS 상품(혜택 브랜드) 카탈로그 — SSOT.
//  '혜택 브랜드' 화면(EAT/BUY/PLAY + 세부 카테고리, "한눈에 보기")의 제휴 브랜드를 빌더 '코너 구성'의
//  [BSS 상품 불러오기] 모달에서 골라 로고·이름·대표 혜택을 컴포넌트로 삽입한다.
//  ※ 로고는 브랜드 이미지 에셋이 없어 카테고리 대표 아이콘(icon:<key>)으로 대체(프로토타입).
//    일부 브랜드는 아이콘 라이브러리의 로고 뱃지 사용(세븐일레븐·CU·FLO·T우주). 실제 로고 URL로 교체 가능.

export type BssCategory = 'EAT' | 'BUY' | 'PLAY';

export type BssProduct = {
  key: string;
  name: string;
  category: BssCategory;
  sub: string; // 세부 카테고리 (베이커리·쇼핑·테마파크 등)
  logo: string; // 아이콘 ref(icon:<key>) 또는 이미지 URL
  benefit: string; // 대표 혜택 요약(한 줄) — 알려진 경우만
  badges: string[]; // 혜택 종류 (할인 · 적립 · 사용 · VIP PICK)
};

export const BSS_CATEGORY_LABELS: Record<BssCategory, string> = {
  EAT: 'EAT 뭐먹지?',
  BUY: 'BUY 뭐사지?',
  PLAY: 'PLAY 뭐하지?',
};

// 세부 카테고리 (혜택 브랜드 화면 기준)
export const BSS_SUBCATEGORIES: Record<BssCategory, string[]> = {
  EAT: ['베이커리', '외식', '카페/아이스크림', '피자/치킨'],
  BUY: ['교통', '금융/통신', '반려동물', '생활/건강', '쇼핑', '패션/뷰티', '편의점'],
  PLAY: ['교육', '여행', '영화/공연/전시', '콘텐츠', '키즈(ZEM)', '테마파크'],
};

// 세부 카테고리 → 대표 아이콘 (브랜드 로고 에셋 대체)
const SUB_ICON: Record<string, string> = {
  베이커리: 'icon:general/Store',
  외식: 'icon:general/Store',
  '카페/아이스크림': 'icon:general/Store',
  '피자/치킨': 'icon:general/Store',
  교통: 'icon:general/Location',
  '금융/통신': 'icon:general/Won',
  반려동물: 'icon:general/Heart',
  '생활/건강': 'icon:general/Home',
  쇼핑: 'icon:general/Cart',
  '패션/뷰티': 'icon:general/Star',
  편의점: 'icon:general/Store',
  교육: 'icon:general/Info',
  여행: 'icon:general/Roaming',
  '영화/공연/전시': 'icon:general/Movie',
  콘텐츠: 'icon:general/Play',
  '키즈(ZEM)': 'icon:general/Family',
  테마파크: 'icon:general/Vip',
};

// 아이콘 라이브러리에 로고 뱃지가 있는 브랜드는 개별 매핑
const LOGO_OVERRIDE: Record<string, string> = {
  세븐일레븐: 'icon:logo/7eleven',
  CU: 'icon:logo/CU',
  FLO: 'icon:logo/Flo',
  'T 우주 신한카드': 'icon:logo/Tuniverse',
};

// 대표 혜택·배지가 알려진 브랜드(혜택 브랜드 상세 화면 기준). 나머지는 기본값(할인).
const KNOWN: Record<string, { benefit: string; badges: string[] }> = {
  배스킨라빈스: { benefit: '싱글레귤러 50% 할인(2,000원)', badges: ['할인', '적립', '사용'] },
  파리바게뜨: { benefit: '천원당 100원 할인(모바일카드)', badges: ['할인', '적립', '사용', 'VIP PICK'] },
  '아웃백 스테이크하우스': { benefit: '전 메뉴 15% 즉시 할인', badges: ['할인', '적립', '사용'] },
  이마트: { benefit: '짝수월 7%, 홀수월 3% 할인', badges: ['할인', '적립'] },
  세븐일레븐: { benefit: '1천 원당 100원 할인', badges: ['할인', '적립', '사용'] },
  CGV: { benefit: '영화 관람권 예매 시 할인', badges: ['할인', 'VIP PICK'] },
  '롯데월드 어드벤처': { benefit: '종합이용권 본인 40% + 동반 3인 30%', badges: ['할인'] },
  SK렌터카: { benefit: '제주 주중/주말 최대 85% 할인', badges: ['할인', '적립', '사용'] },
};

// 혜택 브랜드 '한눈에 보기' 목록 (category · sub · 브랜드명)
const RAW: { category: BssCategory; sub: string; names: string[] }[] = [
  // ── EAT ──
  { category: 'EAT', sub: '베이커리', names: ['파리바게뜨', '뚜레쥬르', '파리크라상', '빌리엔젤', '열린베이커리', '브레댄코'] },
  { category: 'EAT', sub: '외식', names: ['아웃백 스테이크하우스', '롯데리아', 'VIPS', '유가네닭갈비', '매드포갈릭', '온더보더', '라그릴리아', '사보텐', '크래버대게나라', '타코벨', '샐러디', '히바린', '도원스타일'] },
  { category: 'EAT', sub: '카페/아이스크림', names: ['배스킨라빈스', '공차', '폴 바셋', '던킨', '메가MGC커피', '엔제리너스', '백미당', '드롭탑', '아티제', '파스쿠찌', '더벤티', '미스터힐링'] },
  { category: 'EAT', sub: '피자/치킨', names: ['도미노피자', '피자헛', '파파존스피자', 'bhc', '멕시카나', '미스터피자', '반올림피자', '피자알볼로'] },
  // ── BUY ──
  { category: 'BUY', sub: '교통', names: ['스피드메이트', '티맵모빌리티', '에버온', '오토카지'] },
  { category: 'BUY', sub: '금융/통신', names: ['T 우주 신한카드', 'T 멤버십 더블 체크카드(하나)', 'T 멤버십 라이프 신한카드', 'Touch1카드(하나)', 'T 멤버십 더블 롯데 카드', 'SK국제전화 00700', 'T 멤버십 더블 롯데 체크카드'] },
  { category: 'BUY', sub: '반려동물', names: ['핏펫', '로렌츠', '어바웃펫', '반려생활', '멍타냥택시', '국개대표', '21그램'] },
  { category: 'BUY', sub: '생활/건강', names: ['퍼블로그', '청소연구소', '미니창고 다락', '스코피', '리바이북', '런드리고', '어떠케어', '후지필름몰', '오붓'] },
  { category: 'BUY', sub: '쇼핑', names: ['이마트', '11번가', '기프티콘', '텐바이텐', '컬처랜드', 'SK스토아', '그리팅', '풀무원', '톤28', '제주삼다수', '동구밭', '뉴퍼마켓', '동원몰', '해피오더', '허닭', '광동상회', '슈퍼키친', '후디스몰', '디자인밀', 'SK매직', '위미트', 'T 다이렉트 샵'] },
  { category: 'BUY', sub: '패션/뷰티', names: ['이랜드몰', '이니스프리', '제오헤어', '안경매니저', '하프클럽', '헉슬리', '아떼', '아로마티카', '쿤달', '셀퓨전씨', '에필로우', 'VOG Hair', '컨티뉴', '아이피아', '키디키디 몰', '아이러브탠'] },
  { category: 'BUY', sub: '편의점', names: ['CU', '세븐일레븐', 'GS25'] },
  // ── PLAY ──
  { category: 'PLAY', sub: '교육', names: ['파고다', 'YBM 전화화상', '사람인 멘토링매치', '스피쿠스', '인터뷰박스', '월스트리트 잉글리시', '노트미', '해커스'] },
  { category: 'PLAY', sub: '여행', names: ['SK렌터카', '제주항공', '티웨이항공', 'G car', '신라면세점', '마티나 라운지', '신세계면세점', '롯데면세점', '워커힐호텔앤리조트', '롯데렌터카', '빌리카', '신라아이파크면세점', '여행자 보험', '노랑풍선 시티버스', '현대면세점', '제주관광공사 인터넷면세점', '투어비스', '여행가자고', '더라운지'] },
  { category: 'PLAY', sub: '영화/공연/전시', names: ['CGV', '메가박스', '씨네Q', '뮤지엄 원', '르 스페이스', '플래시백 게림'] },
  { category: 'PLAY', sub: '콘텐츠', names: ['FLO', '원스토어', 'SK브로드밴드 B tv', '원스토리', 'B tv cable'] },
  { category: 'PLAY', sub: '키즈(ZEM)', names: ['키자니아', '뽀로로파크', '주렁주렁', '타요키즈카페', '티니핑월드 인 판교', '보리보리', '허그맘허그인', '자란다', '엘리하이/엠베스트', '캐리마켓', '코드모스'] },
  { category: 'PLAY', sub: '테마파크', names: ['롯데월드 어드벤처', '롯데월드 아쿠아리움', '에버랜드', '이월드', '롯데월드 서울스카이', '서울랜드', '아쿠아플라넷', '아쿠아필드', '제주신화월드', '설악워터피아'] },
];

export const BSS_PRODUCTS: BssProduct[] = RAW.flatMap((r) =>
  r.names.map((name) => ({
    key: name,
    name,
    category: r.category,
    sub: r.sub,
    logo: LOGO_OVERRIDE[name] ?? SUB_ICON[r.sub] ?? 'icon:general/Store',
    benefit: KNOWN[name]?.benefit ?? '',
    badges: KNOWN[name]?.badges ?? ['할인'],
  })),
);

export const bssProductByKey = (key: string): BssProduct | undefined => BSS_PRODUCTS.find((p) => p.key === key);

// ─────────────────────────────────────────────────────────────
// T 디바이스 카탈로그 — '상품형' 코너(단말기 추천 등)에서 상품 불러오기 시 사용.
//  출처: NC-Channel Product Admin 번들 생성(bundle-create3) 상품 원장의 '기기서비스 · 약정형' 전량.
//  모델 102종 / 용량·색상 조합(SKU) 565개. 혜택 브랜드와 동일한 카드 구조(PickerItem)로 노출한다.
//  ※ 액세서리형(케이스·필름·배터리 등)은 디바이스가 아니므로 제외.
export type PickerItem = {
  key: string;
  name: string;
  category: string; // 디바이스=제조사 · 그 외=상품유형(요금제형·월정액형 등)
  sub: string;      // 디바이스=기기유형 · 그 외=세부 카테고리(라이트·혜택/편의 등)
  /** 상품 영역 — 상품 불러오기의 최상위 축(디바이스 · 이동전화 · 부가서비스 · 로밍 · T우주). */
  area: string;
  logo: string;
  benefit: string;
  badges: string[];
  /** 용량 / 색상 조합(SKU). 상품 불러오기 후 세부 선택·표기에 쓴다. 디바이스만 가짐. */
  variants?: string[];
  /** 회선 구분(이동전화 · 태블릿 · 웨어러블 · 데이터전용) */
  line?: string;
  /** 망 구분(5G · LTE) */
  net?: string;
};

// 상품 영역 — 상품형 '상품 불러오기'의 최상위 탭. 디바이스 + SKT 판매 상품(무료형 제외).
export const PRODUCT_AREAS = ['디바이스', '이동전화', '부가서비스', '로밍', 'T우주'] as const;
export type ProductArea = (typeof PRODUCT_AREAS)[number];

// 영역별 대표 아이콘 (상품 원장 로고 에셋 대체)
const AREA_ICON: Record<string, string> = {
  디바이스: 'icon:general/Device',
  이동전화: 'icon:general/Won',
  부가서비스: 'icon:general/Star',
  로밍: 'icon:general/Roaming',
  T우주: 'icon:general/Vip',
};

export const DEVICE_MAKERS = ['Apple', 'Samsung', 'Xiaomi', 'Motorola', 'SK텔레콤'] as const;
export const DEVICE_TYPES = ['스마트폰', '태블릿·노트북', '워치', '키즈폰', '휴대용 와이파이'] as const;

// 유형별 대표 아이콘
const DEVICE_TYPE_ICON: Record<string, string> = {
  '스마트폰': 'icon:general/Device',
  '태블릿·노트북': 'icon:general/Device',
  '워치': 'icon:general/Device',
  '키즈폰': 'icon:general/Family',
  '휴대용 와이파이': 'icon:general/Roaming',
};

type DeviceRaw = { name: string; maker: string; type: string; line: string; net: string; variants: string[] };

const DEV_RAW: DeviceRaw[] = [
  { name: 'iPhone 18 Pro Max', maker: 'Apple', type: '스마트폰', line: '이동전화', net: '5G', variants: ['256G / 버건디', '256G / 글레이서', '256G / 실버', '256G / 블랙', '512G / 버건디', '512G / 글레이서', '512G / 실버', '512G / 블랙', '1T / 버건디', '1T / 글레이서', '1T / 실버', '1T / 블랙', '2T / 버건디', '2T / 글레이서', '2T / 실버', '2T / 블랙'] },
  { name: 'iPhone 18 Pro', maker: 'Apple', type: '스마트폰', line: '이동전화', net: '5G', variants: ['256G / 버건디', '256G / 글레이셔', '256G / 실버', '256G / 블랙', '512G / 버건디', '512G / 글레이셔', '512G / 실버', '512G / 블랙', '1T / 버건디', '1T / 글레이셔', '1T / 실버', '1T / 블랙', '2T / 버건디', '2T / 글레이셔', '2T / 실버', '2T / 블랙'] },
  { name: 'iPhone 17e', maker: 'Apple', type: '스마트폰', line: '이동전화', net: '5G', variants: ['256G / 블랙', '256G / 화이트', '256G / 소프트 핑크', '512G / 블랙', '512G / 화이트', '512G / 소프트 핑크'] },
  { name: 'iPhone 17', maker: 'Apple', type: '스마트폰', line: '이동전화', net: '5G', variants: ['256G / 세이지', '256G / 라벤더', '256G / 미스트 블루', '256G / 화이트', '256G / 블랙', '512G / 세이지', '512G / 라벤더', '512G / 미스트 블루', '512G / 화이트', '512G / 블랙'] },
  { name: 'iPhone Air', maker: 'Apple', type: '스마트폰', line: '이동전화', net: '5G', variants: ['256G / 스카이 블루', '256G / 라이트 골드', '256G / 클라우드 화이트', '256G / 스페이스 블랙', '512G / 스카이 블루', '512G / 라이트 골드', '512G / 클라우드 화이트', '512G / 스페이스 블랙', '1T / 스카이 블루', '1T / 라이트 골드', '1T / 클라우드 화이트', '1T / 스페이스 블랙'] },
  { name: 'iPhone 17 Pro', maker: 'Apple', type: '스마트폰', line: '이동전화', net: '5G', variants: ['256G / 딥 블루', '256G / 코스믹 오렌지', '256G / 실버', '512G / 딥 블루', '512G / 코스믹 오렌지', '512G / 실버', '1T / 딥 블루', '1T / 코스믹 오렌지', '1T / 실버'] },
  { name: 'iPhone 17 Pro Max', maker: 'Apple', type: '스마트폰', line: '이동전화', net: '5G', variants: ['256G / 딥 블루', '256G / 코스믹 오렌지', '256G / 실버', '512G / 딥 블루', '512G / 코스믹 오렌지', '512G / 실버', '1T / 딥 블루', '1T / 코스믹 오렌지', '1T / 실버', '2T / 딥 블루', '2T / 코스믹 오렌지', '2T / 실버'] },
  { name: 'iPhone 16e', maker: 'Apple', type: '스마트폰', line: '이동전화', net: '5G', variants: ['128G / 화이트', '128G / 블랙', '256G / 화이트', '256G / 블랙', '512G / 화이트', '512G / 블랙'] },
  { name: 'iPhone 16 Pro Max', maker: 'Apple', type: '스마트폰', line: '이동전화', net: '5G', variants: ['256G / 블랙 티타늄', '256G / 화이트 티타늄', '256G / 내츄럴 티타늄', '256G / 데저트 티타늄', '512G / 블랙 티타늄', '512G / 화이트 티타늄', '512G / 내츄럴 티타늄', '512G / 데저트 티타늄', '1T / 블랙 티타늄', '1T / 화이트 티타늄', '1T / 내츄럴 티타늄', '1T / 데저트 티타늄'] },
  { name: 'iPhone 16 Pro', maker: 'Apple', type: '스마트폰', line: '이동전화', net: '5G', variants: ['128G / 블랙 티타늄', '128G / 화이트 티타늄', '128G / 내츄럴 티타늄', '128G / 데저트 티타늄', '256G / 블랙 티타늄', '256G / 화이트 티타늄', '256G / 내츄럴 티타늄', '256G / 데저트 티타늄', '512G / 블랙 티타늄', '512G / 화이트 티타늄', '512G / 내츄럴 티타늄', '512G / 데저트 티타늄', '1T / 블랙 티타늄', '1T / 화이트 티타늄', '1T / 내츄럴 티타늄', '1T / 데저트 티타늄'] },
  { name: 'iPhone 16', maker: 'Apple', type: '스마트폰', line: '이동전화', net: '5G', variants: ['128G / 블랙', '128G / 핑크', '128G / 화이트', '128G / 울트라마린', '128G / 틸', '256G / 블랙', '256G / 핑크', '256G / 화이트', '256G / 울트라마린', '256G / 틸', '512G / 블랙', '512G / 핑크', '512G / 화이트', '512G / 울트라마린', '512G / 틸'] },
  { name: 'iPhone 15', maker: 'Apple', type: '스마트폰', line: '이동전화', net: '5G', variants: ['128G / 블랙', '128G / 블루', '128G / 핑크', '128G / 옐로', '128G / 그린', '256G / 블랙', '256G / 블루', '256G / 핑크', '256G / 옐로', '256G / 그린', '512G / 블랙', '512G / 블루', '512G / 핑크', '512G / 옐로', '512G / 그린'] },
  { name: 'iPhone 15 Plus', maker: 'Apple', type: '스마트폰', line: '이동전화', net: '5G', variants: ['128G / 블랙', '128G / 블루', '128G / 핑크', '128G / 옐로', '128G / 그린', '256G / 블랙', '256G / 블루', '256G / 핑크', '256G / 옐로', '256G / 그린', '512G / 블랙', '512G / 블루', '512G / 핑크', '512G / 옐로', '512G / 그린'] },
  { name: 'iPhone 15 Pro', maker: 'Apple', type: '스마트폰', line: '이동전화', net: '5G', variants: ['128G / 블루 티타늄', '128G / 블랙 티타늄', '128G / 화이트 티타늄', '128G / 내추럴 티타늄', '256G / 블루 티타늄', '256G / 블랙 티타늄', '256G / 화이트 티타늄', '256G / 내추럴 티타늄', '512G / 블루 티타늄', '512G / 블랙 티타늄', '512G / 화이트 티타늄', '512G / 내추럴 티타늄', '1T / 블루 티타늄', '1T / 블랙 티타늄', '1T / 화이트 티타늄', '1T / 내추럴 티타늄'] },
  { name: '갤럭시 S26 FE', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['256G / 그라파이트', '256G / 피스타치오', '256G / 블루베리'] },
  { name: '갤럭시 퀀텀7', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['128G / 어썸 그레이', '128G / 어썸 아이스블루', '128G / 어썸 라일락'] },
  { name: '갤럭시 Z 플립8', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['256G / 핑크', '256G / 크림', '256G / 그라파이트', '512G / 핑크', '512G / 크림', '512G / 그라파이트'] },
  { name: '갤럭시 Z 폴드8', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['256G / 라벤더', '256G / 크림', '256G / 그라파이트', '512G / 라벤더', '512G / 크림', '512G / 그라파이트', '1T / 라벤더', '1T / 크림', '1T / 그라파이트'] },
  { name: '갤럭시 Z 폴드8 울트라', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['256G / 크림', '256G / 바이올렛 쉐도우', '256G / 그라파이트', '512G / 크림', '512G / 바이올렛 쉐도우', '512G / 그라파이트', '1T / 크림', '1T / 바이올렛 쉐도우', '1T / 그라파이트'] },
  { name: '갤럭시 와이드9', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['128G / 블랙', '128G / 실버'] },
  { name: '갤럭시 A37', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['128G / 어썸 라벤더', '128G / 어썸 화이트', '128G / 어썸 차콜'] },
  { name: '갤럭시 S26 울트라', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['256G / 코발트 바이올렛', '256G / 블랙', '256G / 화이트', '256G / 스카이 블루', '512G / 코발트 바이올렛', '512G / 블랙', '512G / 화이트', '512G / 스카이 블루', '1T / 코발트 바이올렛', '1T / 블랙', '1T / 화이트', '1T / 스카이 블루'] },
  { name: '갤럭시 S26+', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['256G / 코발트 바이올렛', '256G / 블랙', '256G / 화이트', '256G / 스카이 블루', '512G / 코발트 바이올렛', '512G / 블랙', '512G / 화이트', '512G / 스카이 블루'] },
  { name: '갤럭시 S26', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['256G / 코발트 바이올렛', '256G / 블랙', '256G / 화이트', '256G / 스카이 블루', '512G / 코발트 바이올렛', '512G / 블랙', '512G / 화이트', '512G / 스카이 블루'] },
  { name: '갤럭시 S25 FE', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['256G / 아이스블루', '256G / 화이트', '256G / 네이비', '256G / 제트블랙'] },
  { name: '갤럭시 퀀텀6', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['128G / 어썸 라이트그레이', '128G / 어썸 그라파이트'] },
  { name: '갤럭시 Z 플립7 FE', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['256G / 화이트', '256G / 블랙'] },
  { name: '갤럭시 Z 플립7', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['256G / 코랄레드', '256G / 블루 쉐도우', '256G / 제트블랙', '512G / 코랄레드', '512G / 블루 쉐도우', '512G / 제트블랙'] },
  { name: '갤럭시 Z 폴드7', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['256G / 제트블랙', '256G / 실버 쉐도우', '256G / 블루 쉐도우', '512G / 제트블랙', '512G / 실버 쉐도우', '512G / 블루 쉐도우', '1T / 제트블랙', '1T / 실버 쉐도우', '1T / 블루 쉐도우'] },
  { name: '갤럭시 와이드8', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['128G / 라이트 그린', '128G / 라이트 핑크', '128G / 블랙'] },
  { name: '갤럭시 A36', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['128G / 어썸 라벤더', '128G / 어썸 화이트', '128G / 어썸 블랙'] },
  { name: '갤럭시 S25 엣지', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['256G / 티타늄 실버', '256G / 티타늄 아이스블루', '256G / 티타늄 제트블랙', '512G / 티타늄 실버', '512G / 티타늄 아이스블루', '512G / 티타늄 제트블랙'] },
  { name: '갤럭시 S25', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['256G / 실버 쉐도우', '256G / 네이비', '256G / 아이스블루', '256G / 민트', '512G / 실버 쉐도우', '512G / 네이비', '512G / 아이스블루', '512G / 민트'] },
  { name: '갤럭시 S25+', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['256G / 실버 쉐도우', '256G / 네이비', '256G / 아이스블루', '256G / 민트', '512G / 실버 쉐도우', '512G / 네이비', '512G / 아이스블루', '512G / 민트'] },
  { name: '갤럭시 S25 울트라', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['256G / 티타늄 블랙', '256G / 티타늄 화이트실버', '256G / 티타늄 그레이', '256G / 티타늄 실버블루', '512G / 티타늄 블랙', '512G / 티타늄 화이트실버', '512G / 티타늄 그레이', '512G / 티타늄 실버블루', '1T / 티타늄 블랙', '1T / 티타늄 화이트실버', '1T / 티타늄 그레이', '1T / 티타늄 실버블루'] },
  { name: '갤럭시 S24 FE', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['256G / 블루', '256G / 옐로우', '256G / 그레이', '256G / 그라파이트'] },
  { name: '갤럭시 퀀텀5', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['128G / 어썸 아이스블루', '128G / 네이비', '128G / 어썸 라일락'] },
  { name: '갤럭시 Z 플립6', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['256G / 블루', '256G / 민트', '256G / 옐로우', '256G / 실버 쉐도우', '512G / 블루', '512G / 민트', '512G / 옐로우', '512G / 실버 쉐도우'] },
  { name: '갤럭시 A35 5G', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['128G / 어썸 아이스블루', '128G / 어썸 라일락', '128G / 어썸 네이비'] },
  { name: '갤럭시 S24+ 5G', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['256G / 오닉스 블랙', '256G / 마블 그레이', '256G / 코발트 바이올렛', '256G / 앰버 옐로우', '512G / 오닉스 블랙', '512G / 마블 그레이', '512G / 코발트 바이올렛', '512G / 앰버 옐로우'] },
  { name: '갤럭시 S24 5G', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['256G / 오닉스 블랙', '256G / 마블 그레이', '256G / 코발트 바이올렛', '256G / 앰버 옐로우', '512G / 오닉스 블랙', '512G / 마블 그레이', '512G / 코발트 바이올렛', '512G / 앰버 옐로우'] },
  { name: '갤럭시 S24 울트라 5G', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['256G / 티타늄 블랙', '256G / 티타늄 그레이', '256G / 티타늄 바이올렛', '256G / 티타늄 옐로우', '512G / 티타늄 블랙', '512G / 티타늄 그레이', '512G / 티타늄 바이올렛', '512G / 티타늄 옐로우', '1T / 티타늄 블랙', '1T / 티타늄 그레이', '1T / 티타늄 바이올렛', '1T / 티타늄 옐로우'] },
  { name: '갤럭시 A25 5G', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['128G / 옐로우', '128G / 라이트 블루', '128G / 블루 블랙'] },
  { name: 'MOTO G86 power 5G', maker: 'Motorola', type: '스마트폰', line: '이동전화', net: '5G', variants: ['256G / PANTONE 스펠바운드', '256G / PANTONE 코스믹 스카이'] },
  { name: '홍미노트 14', maker: 'Xiaomi', type: '스마트폰', line: '이동전화', net: '5G', variants: ['256G / 라벤더 퍼플', '256G / 코랄 그린', '256G / 미드나이트 블랙'] },
  { name: '홍미노트 14 프로 5G', maker: 'Xiaomi', type: '스마트폰', line: '이동전화', net: '5G', variants: ['256G / 미드나이트 블랙', '256G / 라벤더 퍼플', '256G / 코랄 그린'] },
  { name: '갤럭시 A17', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['128G / 라이트 블루', '128G / 그레이', '128G / 블랙'] },
  { name: '스타일 폴더2', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['32G / 화이트', '32G / 블랙'] },
  { name: '갤럭시 A16', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['128G / 라이트 그린', '128G / 그레이', '128G / 블랙'] },
  { name: '홍미 14C (4GB RAM)', maker: 'Xiaomi', type: '스마트폰', line: '이동전화', net: '5G', variants: ['128G / 미드나잇 블랙', '128G / 스태리 블루', '128G / 세이지 그린'] },
  { name: '갤럭시 A15', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['128G / 옐로우', '128G / 라이트블루', '128G / 블루블랙'] },
  { name: '홍미노트 13', maker: 'Xiaomi', type: '스마트폰', line: '이동전화', net: '5G', variants: ['256G / 미드나잇 블랙', '256G / 민트 그린'] },
  { name: '갤럭시 A24', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['128G / 블랙', '128G / 라이트 그린', '128G / 다크 레드'] },
  { name: '스타일 폴더', maker: 'Samsung', type: '스마트폰', line: '이동전화', net: '5G', variants: ['32G / 블랙', '32G / 화이트'] },
  { name: 'ZEM폰 포켓피스', maker: 'Samsung', type: '키즈폰', line: '이동전화', net: 'LTE', variants: ['128G / 라이트 블루'] },
  { name: 'ZEM폰 포켓몬에디션3', maker: 'Samsung', type: '키즈폰', line: '이동전화', net: 'LTE', variants: ['128G / 화이트'] },
  { name: 'ZEM폰 포켓몬에디션2', maker: 'Samsung', type: '키즈폰', line: '이동전화', net: 'LTE', variants: ['128G / 화이트'] },
  { name: 'iPad Air 13 (M4)', maker: 'Apple', type: '태블릿·노트북', line: '태블릿', net: '5G', variants: ['128G / 스페이스 그레이', '128G / 스타라이트', '128G / 블루', '128G / 퍼플', '256G / 스페이스 그레이', '256G / 스타라이트', '256G / 블루', '256G / 퍼플', '512G / 스페이스 그레이', '512G / 스타라이트', '512G / 블루', '512G / 퍼플', '1T / 스페이스 그레이', '1T / 스타라이트', '1T / 블루', '1T / 퍼플'] },
  { name: 'iPad Air 11 (M4)', maker: 'Apple', type: '태블릿·노트북', line: '태블릿', net: '5G', variants: ['128G / 스페이스 그레이', '128G / 스타라이트', '128G / 블루', '128G / 퍼플', '256G / 스페이스 그레이', '256G / 스타라이트', '256G / 블루', '256G / 퍼플', '512G / 스페이스 그레이', '512G / 스타라이트', '512G / 블루', '512G / 퍼플', '1T / 스페이스 그레이', '1T / 스타라이트', '1T / 블루', '1T / 퍼플'] },
  { name: '갤럭시 탭 A11+', maker: 'Samsung', type: '태블릿·노트북', line: '태블릿', net: '5G', variants: ['128G / 그레이'] },
  { name: 'iPad Pro 13 (M5)', maker: 'Apple', type: '태블릿·노트북', line: '태블릿', net: '5G', variants: ['256G / 실버', '256G / 스페이스 블랙', '512G / 실버', '512G / 스페이스 블랙', '1T / 실버', '1T / 스페이스 블랙'] },
  { name: 'iPad Pro 11 (M5)', maker: 'Apple', type: '태블릿·노트북', line: '태블릿', net: '5G', variants: ['256G / 실버', '256G / 스페이스 블랙', '512G / 실버', '512G / 스페이스 블랙', '1T / 실버', '1T / 스페이스 블랙'] },
  { name: '갤럭시 탭 S11 Ultra', maker: 'Samsung', type: '태블릿·노트북', line: '태블릿', net: '5G', variants: ['256G / 그레이', '512G / 그레이'] },
  { name: '갤럭시 탭 S11', maker: 'Samsung', type: '태블릿·노트북', line: '태블릿', net: '5G', variants: ['128G / 그레이', '256G / 그레이'] },
  { name: '갤럭시 탭 S10 FE+', maker: 'Samsung', type: '태블릿·노트북', line: '태블릿', net: '5G', variants: ['128G / 그레이'] },
  { name: '갤럭시 탭 S10 FE', maker: 'Samsung', type: '태블릿·노트북', line: '태블릿', net: '5G', variants: ['128G / 그레이'] },
  { name: 'iPad Pro 13 (M4 모델) NEW', maker: 'Apple', type: '태블릿·노트북', line: '태블릿', net: '5G', variants: ['256G / 실버', '256G / 스페이스 블랙', '512G / 실버', '512G / 스페이스 블랙'] },
  { name: 'iPad Pro 11 (M4 모델) NEW', maker: 'Apple', type: '태블릿·노트북', line: '태블릿', net: '5G', variants: ['256G / 실버', '256G / 스페이스 블랙', '512G / 실버', '512G / 스페이스 블랙', '1T / 실버', '1T / 스페이스 블랙'] },
  { name: 'iPad (A16 모델)', maker: 'Apple', type: '태블릿·노트북', line: '태블릿', net: '5G', variants: ['128G / 블루', '128G / 실버', '128G / 핑크', '128G / 옐로', '256G / 블루', '256G / 실버', '256G / 핑크', '256G / 옐로'] },
  { name: 'iPad Air 13 (M3 모델)', maker: 'Apple', type: '태블릿·노트북', line: '태블릿', net: '5G', variants: ['128G / 퍼플', '128G / 블루', '128G / 스타라이트', '128G / 스페이스 그레이', '256G / 퍼플', '256G / 블루', '256G / 스타라이트', '256G / 스페이스 그레이', '512G / 퍼플', '512G / 블루', '512G / 스타라이트', '512G / 스페이스 그레이', '1T / 퍼플', '1T / 블루', '1T / 스타라이트', '1T / 스페이스 그레이'] },
  { name: 'iPad Air 11 (M3 모델)', maker: 'Apple', type: '태블릿·노트북', line: '태블릿', net: '5G', variants: ['128G / 퍼플', '128G / 블루', '128G / 스타라이트', '128G / 스페이스 그레이', '256G / 퍼플', '256G / 블루', '256G / 스타라이트', '256G / 스페이스 그레이', '512G / 퍼플', '512G / 블루', '512G / 스타라이트', '512G / 스페이스 그레이', '1T / 퍼플', '1T / 블루', '1T / 스타라이트', '1T / 스페이스 그레이'] },
  { name: '갤럭시 탭 S10+', maker: 'Samsung', type: '태블릿·노트북', line: '태블릿', net: '5G', variants: ['256G / 문스톤 그레이'] },
  { name: '갤럭시 탭 S10 Ultra', maker: 'Samsung', type: '태블릿·노트북', line: '태블릿', net: '5G', variants: ['256G / 문스톤 그레이'] },
  { name: 'iPad Pro 11 (M4 모델)', maker: 'Apple', type: '태블릿·노트북', line: '태블릿', net: '5G', variants: ['256G / 스페이스 블랙', '256G / 실버', '512G / 스페이스 블랙', '512G / 실버', '1T / 스페이스 블랙', '1T / 실버'] },
  { name: 'iPad Air 13 (M2 모델)', maker: 'Apple', type: '태블릿·노트북', line: '태블릿', net: '5G', variants: ['128G / 스타라이트', '128G / 블루', '128G / 퍼플', '512G / 스타라이트', '512G / 블루', '512G / 퍼플'] },
  { name: '갤럭시 북3 Go 5G', maker: 'Samsung', type: '태블릿·노트북', line: '태블릿', net: '5G', variants: ['128G / 실버'] },
  { name: '갤럭시 탭 A9+ 5G', maker: 'Samsung', type: '태블릿·노트북', line: '태블릿', net: '5G', variants: ['64G / 그라파이트'] },
  { name: 'iPad (9세대) NEW', maker: 'Apple', type: '태블릿·노트북', line: '태블릿', net: 'LTE', variants: ['64G / 스페이스 그레이', '64G / 실버', '256G / 스페이스 그레이', '256G / 실버'] },
  { name: '갤럭시탭 A8 (2023)', maker: 'Samsung', type: '태블릿·노트북', line: '태블릿', net: 'LTE', variants: ['64G / 그레이'] },
  { name: 'Apple Watch Ultra 4', maker: 'Apple', type: '워치', line: '웨어러블', net: 'LTE', variants: ['64G / 내추럴 티타늄', '64G / 블랙 티타늄'] },
  { name: 'Apple Watch Series 12', maker: 'Apple', type: '워치', line: '웨어러블', net: 'LTE', variants: ['(티타늄, 46mm) / 64G / 내추럴 티타늄', '(알루미늄, 46mm) / 64G / 스페이스 그레이', '(알루미늄, 46mm) / 64G / 라이트 골드', '(알루미늄, 46mm) / 64G / 다크 브론즈', '(알루미늄, 46mm) / 64G / 블랙', '(티타늄, 42mm) / 64G / 래디언트 골드 티타늄', '(티타늄, 42mm) / 64G / 내추럴 티타늄', '(알루미늄, 42mm) / 64G / 블랙', '(알루미늄, 42mm) / 64G / 다크 브론즈', '(알루미늄, 42mm) / 64G / 라이트 골드'] },
  { name: '갤럭시 워치 울트라2', maker: 'Samsung', type: '워치', line: '웨어러블', net: 'LTE', variants: ['64G / 티타늄 실버', '64G / 티타늄 그레이'] },
  { name: '갤럭시 워치9 44MM', maker: 'Samsung', type: '워치', line: '웨어러블', net: 'LTE', variants: ['32G / 그라파이트', '32G / 실버'] },
  { name: '갤럭시 워치9 40MM', maker: 'Samsung', type: '워치', line: '웨어러블', net: 'LTE', variants: ['32G / 그라파이트', '32G / 크림'] },
  { name: 'Apple Watch SE 3 44mm', maker: 'Apple', type: '워치', line: '웨어러블', net: 'LTE', variants: ['64G / 미드나이트', '64G / 스타라이트'] },
  { name: 'Apple Watch SE 3 40mm', maker: 'Apple', type: '워치', line: '웨어러블', net: 'LTE', variants: ['64G / 미드나이트', '64G / 스타라이트'] },
  { name: 'Apple Watch Ultra 3', maker: 'Apple', type: '워치', line: '웨어러블', net: 'LTE', variants: ['64G / 내추럴', '64G / 블랙'] },
  { name: 'Apple Watch Series 11', maker: 'Apple', type: '워치', line: '웨어러블', net: 'LTE', variants: ['(티타늄, 46mm) / 64G / 내추럴', '(티타늄, 46mm) / 64G / 슬레이트', '(알루미늄, 46mm) / 64G / 실버', '(알루미늄, 46mm) / 64G / 제트 블랙', '(티타늄, 42mm) / 64G / 내추럴', '(티타늄, 42mm) / 64G / 슬레이트', '(알루미늄, 42mm) / 64G / 실버', '(알루미늄, 42mm) / 64G / 제트 블랙'] },
  { name: '갤럭시 워치 울트라 47mm (2025)', maker: 'Samsung', type: '워치', line: '웨어러블', net: 'LTE', variants: ['64G / 티타늄 블루'] },
  { name: '갤럭시 워치8 클래식 46mm', maker: 'Samsung', type: '워치', line: '웨어러블', net: 'LTE', variants: ['64G / 화이트', '64G / 블랙'] },
  { name: '갤럭시 워치8 44mm', maker: 'Samsung', type: '워치', line: '웨어러블', net: 'LTE', variants: ['32G / 그라파이트', '32G / 실버'] },
  { name: '갤럭시 워치8 40mm', maker: 'Samsung', type: '워치', line: '웨어러블', net: 'LTE', variants: ['32G / 그라파이트', '32G / 실버'] },
  { name: '갤럭시 워치7 44mm', maker: 'Samsung', type: '워치', line: '웨어러블', net: 'LTE', variants: ['32G / 실버', '32G / 그린'] },
  { name: '갤럭시 워치7 40mm', maker: 'Samsung', type: '워치', line: '웨어러블', net: 'LTE', variants: ['32G / 그린', '32G / 크림'] },
  { name: '갤럭시 워치 울트라 47mm', maker: 'Samsung', type: '워치', line: '웨어러블', net: 'LTE', variants: ['32G / 티타늄 화이트', '32G / 티타늄 실버', '32G / 티타늄 그레이'] },
  { name: 'Apple Watch SE 44mm (2023)', maker: 'Apple', type: '워치', line: '웨어러블', net: 'LTE', variants: ['32G / 미드나이트', '32G / 실버'] },
  { name: '갤럭시 워치6 44mm', maker: 'Samsung', type: '워치', line: '웨어러블', net: 'LTE', variants: ['16G / 그라파이트', '16G / 실버'] },
  { name: '갤럭시 워치6 40mm', maker: 'Samsung', type: '워치', line: '웨어러블', net: 'LTE', variants: ['16G / 골드', '16G / 그라파이트'] },
  { name: '갤럭시 워치6 클래식 47mm', maker: 'Samsung', type: '워치', line: '웨어러블', net: 'LTE', variants: ['16G / 블랙', '16G / 실버'] },
  { name: '갤럭시 워치6 클래식 43mm', maker: 'Samsung', type: '워치', line: '웨어러블', net: 'LTE', variants: ['16G / 블랙', '16G / 실버'] },
  { name: 'Apple Watch Series 8', maker: 'Apple', type: '워치', line: '웨어러블', net: 'LTE', variants: ['(스테인리스, 45mm) / 32G / 그래파이트', '(알루미늄, 41mm) / 32G / 미드나이트', '(알루미늄, 41mm) / 32G / 실버'] },
  { name: 'T 포켓파이 B', maker: 'SK텔레콤', type: '휴대용 와이파이', line: '데이터전용', net: 'LTE', variants: ['- / 글레이셔화이트'] },
];

export const BSS_DEVICES: PickerItem[] = DEV_RAW.map((d) => ({
  key: `dev:${d.name}`,
  name: d.name,
  category: d.maker,
  sub: d.type,
  area: '디바이스',
  logo: DEVICE_TYPE_ICON[d.type] ?? 'icon:general/Device',
  // 카드 한 줄 요약 — 망/회선 + 선택 가능한 조합 수
  benefit: [d.net, d.line, d.variants.length > 1 ? `${d.variants.length}종 선택 가능` : d.variants[0]]
    .filter(Boolean)
    .join(' · '),
  badges: [],
  variants: d.variants,
  line: d.line,
  net: d.net,
}));

export const deviceByKey = (key: string): PickerItem | undefined => BSS_DEVICES.find((d) => d.key === key);

// ─────────────────────────────────────────────────────────────
// SKT 판매 상품(디바이스 외) — '상품형' 코너 상품 불러오기에서 디바이스와 함께 노출.
//  정책 공식: "혜택 = 무료로 하는 것(혜택형 코너) / 상품 = SKT에서 판매하는 것(상품형 코너)".
//  출처: NC-Channel Product Admin 상품 원장(items-v3) 전량에서 기기서비스(디바이스=위 DEV_RAW)와
//        '무료형'(= 혜택으로 분류)을 제외한 580종. 영역 → 상품유형(type) → 세부(cat) 3단 분류.
//  ※ 상품 원장이 소유(SSOT)하는 이름만 싣는다. 이미지·가격·판매여부는 전시 어드민이 조립하지 않는다.
type ProdRaw = { area: ProductArea; types: { type: string; cats: { cat: string; names: string[] }[] }[] };

const PROD_RAW: ProdRaw[] = [
  { area: '이동전화', types: [
    { type: '요금제형', cats: [
      { cat: '라이트', names: ['라이트 79', '라이트 69', '라이트 59 75GB업', '라이트 59 50GB업', '라이트 59 30GB업', '라이트 59 13GB업', '라이트 59', '라이트 55', '라이트 49', '라이트 45', '라이트 39'] },
      { cat: '전용', names: ['T플랜 세이브', '뉴 T끼리 맞춤형(100분+250MB)', '표준요금제', 'ZEM플랜 퍼펙트', 'ZEM플랜 베스트', 'ZEM플랜 스마트', '손누리 1.5G', '손누리 3.0G', '소리누리 1.2G', '소리누리 2.4G', 'Easy XL', 'Easy L', 'Easy M', 'Easy S', 'PPS스마트폰 프리미엄', 'PPS스마트폰 레귤러', 'PPS스마트폰 플러스', 'PPS스마트폰 프랜즈', 'PPS스마트폰 라이트', 'PPS스마트폰 일반', 'PPS프리미엄', 'PPS레귤러', 'PPS플러스', 'PPS프랜즈', 'PPS라이트', 'PPS일반요금제'] },
      { cat: '스마트기기', names: ['LTE Watch(공유)', 'LTE Watch(공유II)', 'LTE Watch(단독)', 'T Tab 9', 'T Tab 18(공유)', 'T Tab 18', '5G Tab 4GB(공유)', '5G Tab 4GB(단독)', '스마트폰 함께쓰기', '태블릿 함께쓰기', '마이투넘버'] },
      { cat: '다이렉트', names: ['다이렉트5G 76(유튜브 프리미엄)', '다이렉트5G 76(넷플릭스)', '다이렉트5G 69(넷플릭스)', '다이렉트5G 62(넷플릭스)', '0 청년 다이렉트 69(넷플릭스)', '0 청년 다이렉트 62(넷플릭스)', '다이렉트5G 76(티빙)', '다이렉트5G 69(티빙)', '0 청년 다이렉트 69(티빙)', '다이렉트5G 76(디즈니+)', '다이렉트5G 69(디즈니+)', '0 청년 다이렉트 69(디즈니+)', '다이렉트5G 76(T 우주)', '다이렉트5G 69(T 우주)', '0 청년 다이렉트 69(T 우주)', '다이렉트5G 76(스마트기기)', '다이렉트5G 62', '다이렉트5G 55', '다이렉트5G 48', '다이렉트5G 42', '다이렉트5G 38', '다이렉트5G 34', '다이렉트5G 31', '다이렉트5G 27', '다이렉트LTE 22', '0 청년 다이렉트 62', '0 청년 다이렉트 55', '0 청년 다이렉트 48', '0 청년 다이렉트 42', '0 청년 다이렉트 34', '0 청년 다이렉트 30'] },
      { cat: '베스트', names: ['베스트 Max(Google AI) + 유튜브 프리미엄/넷플릭스/디즈니/티빙/웨이브 중 택 1', '베스트 Pro(Google AI) + 유튜브 프리미엄/넷플릭스/디즈니/티빙/웨이브 중 택 1', '베스트 Max(유튜브 프리미엄) + 넷플릭스/디즈니/티빙/웨이브/중 택 1 가능', '베스트 Pro(유튜브 프리미엄) + 넷플릭스/디즈니/티빙/웨이브/중 택 1 가능', '베스트 109(유튜브 프리미엄) + 혜택없음', '베스트 Max(넷플릭스) + 유투브/티빙/디즈니/웨이브 중 택 1', '베스트 Pro(넷플릭스) + 유투브/티빙/디즈니/웨이브 중 택 1', '베스트 109(넷플릭스) + 혜택없음', '베스트 99(넷플릭스) + 혜택없음', '베스트 89(넷플릭스) + 혜택없음', '베스트 Max(티빙&웨이브) + 유튜브 프리미엄/넷플릭스/디즈니중 택1', '베스트 Pro(티빙&웨이브) + 유튜브 프리미엄/넷플릭스/디즈니중 택1', '베스트 109(티빙&웨이브) + 혜택없음', '베스트 99(티빙&웨이브) + 혜택없음', '베스트 89(티빙&웨이브) + 혜택없음', '베스트 Max(디즈니+) + 유튜브 프리미엄/넷플릭스/티빙/웨이브 중 택1', '베스트 Pro(디즈니+) + 유튜브 프리미엄/넷플릭스/티빙/웨이브 중 택1', '베스트 109(디즈니+) + 혜택없음', '베스트 99(디즈니+) + 혜택없음', '베스트 89(디즈니+) + 혜택없음', '베스트 Max (T 우주) + CU/스타벅스/BR/배민/올리브영/CGV 시그니처 팝콘콤보 쿠폰', '베스트 Pro (T 우주) + CU/스타벅스/BR/배민/올리브영', '베스트 109 (T 우주) + 세븐일레븐 할인/투썸플레이스 할인/파리바게뜨 할인/배달의민족 쿠폰팩', '베스트 99 (T 우주) + 세븐일레븐 할인/투썸플레이스 할인/파리바게뜨 할인', '베스트 89 (T 우주) + 세븐일레븐 할인/투썸플레이스 할인/파리바게뜨 할인((월 4,950원에 이용))', '베스트 Max (스마트기기) + 스마트기기 할부금 24,000원 할인', '베스트 Pro (스마트기기) + 스마트기기 할부금 18,000원 할인', '베스트 109 (스마트기기) + 스마트기기 할부금 12,000원 할인'] },
    ] },
  ] },
  { area: '부가서비스', types: [
    { type: '월정액형', cats: [
      { cat: '혜택/편의', names: ['PASS 안심클라우드', '안심클라우드', '멍과함께', '디톡스케어', '이동의재미', '생활의재미', 'PASS 오피스도우미', '오피스도우미', '휴대폰 결제 멤버십 플래티넘', '휴대폰 결제 멤버십', '무비와컬처', '해외주식노트', 'PASS 연금투자정보', '연금투자정보', 'AI가족안부전화', '공모주정보', 'PASS 공모주정보', '휴대폰쿠폰지갑', 'PASS 펫케어', '펫케어', '생활정보', 'PASS생활정보', '쇼핑레터', '블랙박스분석', '퀀트업-미국주식', '부동산경매노트', '빌레터 생활건강', '마인드케어', '부동산레터', '주식레터', '스마트안심쇼핑', '주식투자노트', '주식투자마스터', 'PASS 프라임', '아파트청약케어', '오토레터', 'PASS 해외주식정보', 'T렌탈', 'PASS 주식정보', '지켜줘서 고마워_현역플랜', 'T 쿠폰', '스마트기기 이용요금 할인(모)', '친구찾기정액제(1,500)', 'T끼리 T내는 요금', 'LTE골든 지정번호할인', 'T 시그니처(구) OCB 적립(신청)'] },
      { cat: '콘텐츠이용', names: ['V 프로필', '투자 시그널', '애니팡4 콘텐츠 팩', '애니팡3 콘텐츠 팩', '애니팡2 콘텐츠 팩', '문화혜택정보', 'PASS문화혜택정보', '전월세안심케어', 'PASS전월세안심케어', '일상플러스', 'PASS 일상플러스', '세이브쇼핑', 'PASS 세이브쇼핑', '에코레터', 'Wavve 콘텐츠 팩 플러스', 'Wavve 콘텐츠 팩 프리미엄', 'Wavve 콘텐츠 팩', '빌레터 마이풀', 'Wavve 앤 데이터 프리미엄', 'Wavve 앤 데이터', 'Wavve 앤 데이터 플러스', '원스토리 앤 데이터_신청', 'FLO 앤 데이터', 'FLO 앤 데이터 플러스', '벅스 앤 데이터 플러스', '멜론 익스트리밍 플러스', '멜론 익스트리밍', '미디어 & 데이터 팩', '미디어 데이터팩(할인)', '팅 미디어 데이터팩'] },
      { cat: '데이터', names: ['안심데이터100', '안심데이터150', '안심데이터190', '모비데이터팩', 'EBS 속도제어해제', 'LTE 안심옵션', 'LTE 팅 안심옵션', '팅 안심옵션 프리미엄', '안심옵션 프리미엄', '미디어 데이터 팩 속도해제', '미디어 데이터 팩(할인)속도해제', 'LTE안심옵션(퍼펙트무한)', '출퇴근 프리', 'T데이터쿠폰', 'LTE 데이터130', 'LTE 데이터180', 'LTE 데이터250', 'LTE 데이터330', '함께쓰기1GB,2.5GB차단(3G전용)', '함께쓰기1GB,2.5GB차단(LTE전용)', '함께쓰기베이직차단해제(3G용)', '함께쓰기베이직차단해제(LTE용)', 'T데이터모아', 'band 타임 프리', 'Data 35_이월정액제', 'Data 70_이월정액제', 'T가족모아데이터'] },
      { cat: '통화/메시지', names: ['스마트 콜키퍼', '시니어 컬러링무제한팩', '컬러링슬림팩', '컬러링슬림', '컬러링', '컬러링무제한2', '컬러링프라임', '벨링베이직팩', '벨링베이직', '마이스마트콜3', '마이스마트콜', '마이스마트콜_O', 'V 컬러링 라이트', 'V 컬러링 플러스', 'V 컬러링', '오토콜', '헬로링 Basic', '헬로링', '스마트콜Pick', '콜링플러스', '콜링', '마이스마트콜II', '콜키퍼 플러스', '콜키퍼', '콜키퍼_O', '퍼펙트콜라이트', '퍼펙트콜플러스', '착신전환(Voice only)', '착신전환일반', '내맘대로오토링', '네임컬러링', '오토컬러링', '컬러링플러스2', '무제한컬러링플러스', 'T ARS', 'T ARS 라이트', '소리샘플러스', 'T메모링', 'T메모링 프리미엄', '개별통화수신거부', '긴통화무료옵션', '넘버플러스II', '메시지 프리미엄 1200', '메시지라이트', '메시지레귤러', '메시지프리미엄', '문자매니저 일반', '문자매니저 프리미엄', '부가음성 100', '안심문자', '웹문자라이트', '웹문자프리미엄', '자동연결(유료)', '통화가능통보', '통화가능통보플러스'] },
      { cat: '안심/보험', names: ['인포세이프박스', 'AI딥페이크안심보호', 'T나는 폰교체 안내', '여가생활안심보호', '휴대폰약속번호', '소호지키미', 'PASS 소호지키미', '정보유출안심케어', '더치트 프리미엄', '휴대폰통신비안심', '스마트안티피싱', 'PASS 신용지키미', '신용지키미', 'PASS 신용지키미_O', '부동산지키미', 'PASS 부동산지키미', '휴대폰가족보호', '안심키퍼서비스', '건강지키미', 'PASS 건강지키미', '세이프가드', 'PASS 세이프가드', '세이프캐시', 'PASS 세이프캐시', '내정보지키미', 'T&캡스', '스마트피싱보호', 'T안심콜', 'T안심콜 라이트', 'T 자녀안심', '원키퍼'] },
      { cat: '인증/결제', names: ['스마트안전결제', '모션키', 'MyOTP', '로그인보호서비스', '로그인플러스', '안전결제 프리미엄', '스마트 사인', '스마트공동인증', 'USIM 스마트인증', '휴대폰인증서서비스', '전화번호 안심로그인', '휴대폰간편로그인', '휴대폰번호보호', '휴대폰 인증보호'] },
    ] },
    { type: '종량/충전형', cats: [
      { cat: '데이터', names: ['라이트 59 데이터 충전 13GB', '라이트 59 데이터 충전 30GB', '라이트 59 데이터 충전 50GB', '라이트 59 데이터 충전 75GB', '라이트 39 데이터 충전 1GB', '라이트 45 데이터 충전 2GB', '라이트 49 데이터 충전 3GB', '라이트 55 데이터 충전 4GB', '슬림 데이터 충전 4GB', '베이직 데이터 충전 3GB', '컴팩트플러스 데이터 충전 2GB', '컴팩트 데이터 충전 1GB', '0 청년 49 데이터 충전 4GB', '0 청년 43 데이터 충전 2GB', '0 청년 37 데이터 충전 1GB', '0 청년 59 데이터 충전 100GB', '0 청년 59 데이터 충전 60GB', '0 청년 59 데이터 충전 36GB', '0 청년 59 데이터 충전 15GB', '베이직플러스 데이터 충전 75GB', '베이직플러스 데이터 충전 50GB', '베이직플러스 데이터 충전 30GB', '베이직플러스 데이터 충전 13GB'] },
    ] },
    { type: '제휴 보험형', cats: [
      { cat: '안심/보험', names: ['파손6 i파손(온라인)', '파손6 파손(온라인)', '파손6 파손F(온라인)', '분실파손6 i일반(온라인)', '분실파손6 i고급(온라인)', '분실파손6 일반(온라인)', '분실파손6 고급(온라인)', '분실파손6 플립(온라인)', '분실파손6 폴드(온라인)', 'T 올케어+6 스위치 i파손 온라인', 'T 올케어+6 스위치 i일반 온라인', 'T 올케어+6 스위치 i고급 온라인', 'T 올케어+6스위치 파손 온라인', 'T 올케어+6 스위치 파손F 온라인', 'T 올케어+6 스위치 일반(온라인)', 'T 올케어+6 스위치 고급(온라인)', 'T 올케어+6 스위치 플립(온라인)', 'T 올케어+6 스위치 폴드(온라인)', 'T 올케어+6 i파손(온라인)', 'T 올케어+6 i일반(온라인)', 'T 올케어+6 i고급(온라인)', 'T 올케어+6 파손(온라인)', 'T 올케어+6 파손F(온라인)', 'T 올케어+6 일반(온라인)', 'T 올케어+6 고급(온라인)', 'T 올케어+6 플립(온라인)', 'T 올케어+6 폴드(온라인)', 'T 올케어플러스 파손 F7', 'T 올케어플러스 파손S25', 'T 아이폰파손 16e', 'T 아이폰파손 16 Pro', 'T 아이폰파손 16 Plus', 'T 아이폰파손 16N', 'T 아이폰파손 SE 2022S', 'T 아이폰파손 LiteN', 'T 아이폰케어 16e', 'T 아이폰케어 16 Pro', 'T 아이폰케어 16 Plus', 'T 아이폰케어 16N', 'T 아이폰케어 SE 2022S', '중고파손보험 i', '중고파손보험 A', '퍼펙트클럽 갤럭시S21분실파손형', '퍼펙트클럽 갤럭시S21 파손형'] },
      { cat: '혜택/편의', names: ['T 올케어플러스 포인트'] },
      { cat: '인증/결제', names: ['휴대폰분실보호'] },
    ] },
    { type: '제휴 클럽형', cats: [
      { cat: '안심/보험', names: ['T나는 폰교체 AI클럽', '5GX클럽 갤럭시S21', 'NEW프리미엄클럽3_A', 'NEW프리미엄클럽3_R'] },
      { cat: '혜택/편의', names: ['인피니티 클럽'] },
    ] },
  ] },
  { area: '로밍', types: [
    { type: '로밍 옵션형', cats: [
      { cat: '데이터', names: ['T 기내 Wi-Fi', 'T 로밍 데이터 12시간', '청년로밍할인 신청', '데이터로밍무조건차단', '데이터로밍월상한'] },
      { cat: 'SMS', names: ['T 로밍 도착알리미', 'T 로밍 음성사용량 안내문자 차단', '태블릿로밍문자안내'] },
      { cat: '음성', names: ['로밍완전차단', 'T 로밍 음성수발신차단', '로밍 현지시각 안내서비스', '로밍안내방송서비스'] },
    ] },
    { type: '로밍 요금제형', cats: [
      { cat: '데이터', names: ['baro 요금제', '가족로밍(대표 회선)', 'OnePass 500 기본형', 'OnePass 500 기간형', 'OnePass VIP 기본형', 'OnePass VIP 기간형', 'OnePass Data VIP 기본형', 'OnePass Data VIP 기간형', 'T 괌사이판 국내처럼', 'T 괌사이판 5천원'] },
    ] },
    { type: '로밍 충전형', cats: [
      { cat: '데이터', names: ['baro 3GB 충전', 'baro 2GB 충전', 'baro 1GB 충전'] },
    ] },
  ] },
  { area: 'T우주', types: [
    { type: '단일 구독형', cats: [
      { cat: '가공식품', names: ['드롭탑 925 캡슐커피 Family 정기배송', '간편 육수팩 정기배송'] },
      { cat: '이용권', names: ['11번가 혜택', '웰컴기프트', '교보문고 sam 이용권', 'Netflix 프리미엄 이용권', 'Netflix 스탠다드 이용권', 'Netflix 광고형 스탠다드 이용권', '밀리의서재 이용권', '바이버 혜택팩', '크레마클럽 30일 이용권', '원스토리 패스', '윌라 패밀리 멤버십', '윌라 베이직 멤버십', 'YouTube Premium', 'EVcheck 프리미엄 이용권', '클래스101 이용권', 'TVING 광고형 스탠다드 (대한적십자사)', '티빙 광고형 스탠다드(나라사랑카드)', '티빙 스탠다드', '티빙 프리미엄(나라사랑카드)', '티빙 스탠다드(나라사랑카드)', '티빙 프리미엄', '티빙 광고형 스탠다드', 'TVING 프리미엄 (결합)', 'TVING 스탠다드 (결합)', 'TVING 광고형 스탠다드 (결합)', 'TVING 프리미엄(결합)', 'TVING 광고형 스탠다드(결합)', 'TVING 스탠다드(결합)', '한컴독스 이용권', '11번가/ Amazon 혜택', 'Disney+ 프리미엄', 'Disney+ 스탠다드', 'FLO 콘텐츠 팩 (YTPL)', 'FLO 콘텐츠 팩', 'FLO 앤 데이터 플러스', 'FLO 콘텐츠 팩 플러스', 'FLO 앤 데이터', 'FLO 콘텐츠 팩 플러스 (YTPL)', 'Google AI Plus (400GB)', 'Google AI Plus (2TB)', 'Google AI Pro', 'Google One 100GB', 'Google One 100GB (라이트할부 혜택)', 'HD현대오일뱅크 카앤 혜택팩', 'Melon 모바일 스트리밍클럽', 'Melon 스트리밍클럽', 'Melon 스트리밍클럽 (YTPL)', 'Melon 모바일 스트리밍클럽 (YPTL)', 'Spatial Touch™ Pro 이용권', 'Wavve 앤 데이터 프리미엄', 'Wavve 앤 데이터 플러스', 'Wavve 앤 데이터', 'Wavve 광고형 스탠다드 (대한적십자사)', 'Wavve 콘텐츠 팩 프리미엄', 'Wavve 콘텐츠 팩 플러스', 'Wavve 콘텐츠 팩', 'Wavve 콘텐츠 팩 프리미엄 (결합)', 'Wavve 광고형 스탠다드 (결합)', 'Wavve 콘텐츠 팩 연간', 'Wavve 콘텐츠 팩 프리미엄 연간', 'Wavve 콘텐츠 팩 플러스 연간', 'Wavve 콘텐츠 팩 플러스 (결합)', 'Wavve 콘텐츠 팩 플러스(이벤트)', 'Wavve 콘텐츠 팩 프리미엄(결합)', 'Wavve 콘텐츠 팩 플러스(결합)', 'Wavve 광고형 스탠다드(결합)', 'Wavve 콘텐츠 팩(이벤트)', 'YouTube Premium Lite'] },
      { cat: '취미/생활', names: ['에이닷 펫 영양제 멤버십 (프리미엄)', '에이닷 펫 영양제 멤버십 (베이직)', '에이닷 펫 보험형 멤버십 (올케어)', '에이닷 펫 보험형 멤버십 (영케어)'] },
    ] },
    { type: '이용권형', cats: [
      { cat: '쿠폰/할인', names: ['국개대표 쿠폰팩', '굽네치킨 쿠폰팩', '그리팅몰 쿠폰팩', '꾸까 쿠폰팩', '네이버웹툰 쿠키 (나라사랑카드)', '네이버웹툰 쿠키', '하나로마트 쿠폰팩', '더중앙플러스 이용권', '더티니핑 쿠폰팩', '도미노피자 쿠폰', '또래오래 쿠폰', '런드리고 세탁 쿠폰', '런드리고 운동화세탁 쿠폰', '런드리고 이불세탁 쿠폰', '롯데월드 Flex 패키지 쿠폰팩', '롱블랙 이용권', '리디 셀렉트 이용권', '리디셀렉트 이용권', '리브인리프 쿠폰팩', '맘시터 쿠폰팩', '맥널티커피 쿠폰팩', '메가MGC커피 쿠폰팩', '메가MGC커피 할인', '모아진 프리미엄 이용권', '모아진 베이직 이용권', '모아진 초이스 이용권', '바른치킨 쿠폰', '바이슈코 쿠폰팩', '바프독 3만원 할인 쿠폰팩', '반올림피자 쿠폰', '배달의민족 쿠폰팩', '배스킨라빈스 싱글레귤러 교환권', '배스킨라빈스 쿠폰', '버킷스토어 혜택', '베베쿡 쿠폰팩', '보틀웍스 쿠폰팩', '보틀웍스 쿠폰', '빽다방 쿠폰', '설로인 쿠폰팩', '세븐일레븐 1,000원 당 300원 할인', '세븐일레븐 1,000원 당 200원 할인', '쉐이크쉑 쿠폰', 'SNOW VIP 이용권', '스타벅스 할인', '스피킹맥스 이용권', '쑥쑥찰칵 프리미엄 플러스 이용권', '쑥쑥찰칵 애드프리 플러스 이용권', '아모레몰 쿠폰', '아모레몰 쿠폰팩', '얼라이브 공식몰 쿠폰팩', '에버랜드 솜포인트 구독', '오토카지 쿠폰팩', '올리브영 3종 쿠폰팩', '요기요 쿠폰팩', '요기요 혜택팩', '이마트24 할인', '이모티콘 플러스 1개월 이용권', '자담치킨 쿠폰팩', '청연 쿠폰팩', '청연 서비스 쿠폰', '카모아 쿠폰', '카앤피플 쿠폰', '카카오웹툰 캐시', '카카오페이지 캐시', '커버링 쿠폰팩', '클럽클리오 쿠폰팩', '투썸플레이스 30% 할인', '투썸플레이스 20% 할인', '파리바게뜨 1,000원당 300원 할인', '파리바게뜨 1,000원 당 200원 할인', '폴 바셋 할인', '폴인 이용권', '플라이북 쿠폰', '필그램 혜택', '필그램 쿠폰', '하나투어 쿠폰', '해피독TV', '해피문데이 쿠폰', '해피문데이 쿠폰팩', '허닭 쿠폰팩', '현대백화점 혜택팩', '현대아울렛, 커넥트현대 쿠폰', 'B tv 혜택', 'CGV 시그니처 팝콘콤보 교환권', 'CGV 쿠폰팩', 'CGV 쿠폰', 'CU 할인', 'HD 현대오일뱅크 쿠폰', 'SK스토아 쿠폰', 'SK스토아 쿠폰팩', 'SK일렉링크 쿠폰', 'SK일렉링크 쿠폰팩'] },
    ] },
    { type: '결합 구독형', cats: [
      { cat: '우주패스', names: ['T 우주패스 DIY (기본 2 + 추가 1~2)', 'T 우주 Big 4', 'T 우주패스 편의점&카페 (월간)', 'T 우주패스 편의점&카페 (연간)', 'T 우주패스 미디어'] },
    ] },
  ] },
];

export const SKT_PRODUCTS: PickerItem[] = PROD_RAW.flatMap((a) =>
  a.types.flatMap((t) =>
    t.cats.flatMap((c) =>
      c.names.map((name) => ({
        key: `prod:${name}`,
        name,
        category: t.type, // 상품유형 (요금제형 · 월정액형 등)
        sub: c.cat,       // 세부 카테고리 (라이트 · 혜택/편의 등)
        area: a.area,
        logo: AREA_ICON[a.area] ?? 'icon:general/Store',
        benefit: [t.type, c.cat].filter(Boolean).join(' · '),
        badges: [],
      })),
    ),
  ),
);

const sktProductByKey = (key: string): PickerItem | undefined => SKT_PRODUCTS.find((p) => p.key === key);

// 상품형 상품 불러오기 전체 카탈로그 — 디바이스 + SKT 판매 상품(무료형 제외).
export const PRODUCT_CATALOG: PickerItem[] = [...BSS_DEVICES, ...SKT_PRODUCTS];

// 코드화 아이템(혜택 브랜드 + 디바이스 + SKT 상품) 공용 조회 — 빌더 상품 불러오기 삽입(addBssProduct)용.
export function pickerItemByKey(key: string): { name: string; logo: string; benefit: string } | undefined {
  const p = bssProductByKey(key);
  if (p) return { name: p.name, logo: p.logo, benefit: p.benefit };
  const d = deviceByKey(key);
  if (d) return { name: d.name, logo: d.logo, benefit: d.benefit };
  const s = sktProductByKey(key);
  if (s) return { name: s.name, logo: s.logo, benefit: s.benefit };
  return undefined;
}
