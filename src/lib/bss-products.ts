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
  category: string; // 제조사
  sub: string;      // 디바이스 유형
  logo: string;
  benefit: string;
  badges: string[];
  /** 용량 / 색상 조합(SKU). 상품 불러오기 후 세부 선택·표기에 쓴다. */
  variants?: string[];
  /** 회선 구분(이동전화 · 태블릿 · 웨어러블 · 데이터전용) */
  line?: string;
  /** 망 구분(5G · LTE) */
  net?: string;
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

// 코드화 아이템(혜택 브랜드 + 디바이스) 공용 조회 — 빌더 상품 불러오기 삽입(addBssProduct)용.
export function pickerItemByKey(key: string): { name: string; logo: string; benefit: string } | undefined {
  const p = bssProductByKey(key);
  if (p) return { name: p.name, logo: p.logo, benefit: p.benefit };
  const d = deviceByKey(key);
  if (d) return { name: d.name, logo: d.logo, benefit: d.benefit };
  return undefined;
}
