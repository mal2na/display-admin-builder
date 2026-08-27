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
