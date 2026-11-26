// 개인화 옵션 분류 — SKT NC_정보 분류 시트 '템플릿 유형별 - 개인맞춤 옵션'(2026-11-26) 기반.
//  코너 유형(중분류)마다 '개인화 옵션(대분류)'이 다르다(회의: 추천 로직은 코너에 붙는다). 빌더에서 운영자가 '복수 선택'해 CVM에 제안한다.
//  대분류만 복수 선택(2026-11-26 사용자 확정). 세부 항목은 참고용 표시.
export type PersoCategory = { category: string; items: string[] };

// 중분류(혜택형 mid) → 개인화 옵션(대분류) + 세부 항목. 시트 블록 순서대로.
export const PERSO_OPTIONS_BY_MID: Record<string, PersoCategory[]> = {
  제휴사형: [
    { category: '실시간 상황 기반', items: ['현재 위치', '위치·거리', '시간·상황'] },
    { category: '구매 이력 기반', items: ['브랜드 구매', '구매 빈도', '구매 금액'] },
    { category: '이용 이력 기반', items: ['브랜드 방문', '혜택 이용', '브랜드 조회'] },
    { category: '관심사 기반', items: ['브랜드 선호', '카테고리 관심'] },
    { category: '가입·보유 정보 기반', items: ['멤버십 자격', '혜택 이용 자격'] },
    { category: '고객 프로필 기반', items: ['고객 특성'] },
  ],
  이벤트형: [
    { category: '실시간 상황 기반', items: ['이벤트 시점'] },
    { category: '구매 이력 기반', items: ['이벤트 연계 구매', '구매 브랜드'] },
    { category: '이용 이력 기반', items: ['이벤트 참여', '당첨·미당첨 이력', '이벤트 조회'] },
    { category: '관심사 기반', items: ['이벤트 카테고리', '검색 키워드'] },
    { category: '가입·보유 정보 기반', items: ['참여 자격'] },
    { category: '고객 프로필 기반', items: ['고객 특성'] },
  ],
  미션형: [
    { category: '이용 패턴 기반', items: ['서비스 이용 빈도', '기능 이용 패턴'] },
    { category: '구매 이력 기반', items: ['미션 연계 구매'] },
    { category: '이용 이력 기반', items: ['과거 미션 수행', '서비스 이용'] },
    { category: '관심사 기반', items: ['미션 관심 분야'] },
    { category: '가입·보유 정보 기반', items: ['서비스 가입 상태'] },
    { category: '고객 프로필 기반', items: ['고객 세그먼트'] },
  ],
  혜택프로그램형: [
    { category: '실시간 상황 기반', items: ['위치 정보', '시간·상황'] },
    { category: '구매 이력 기반', items: ['제휴 브랜드 구매', '프로그램 연계 구매'] },
    { category: '이용 이력 기반', items: ['프로그램 참여', '혜택 선택', '혜택 사용'] },
    { category: '관심사 기반', items: ['브랜드 선호', '혜택 카테고리'] },
    { category: '가입·보유 정보 기반', items: ['멤버십 등급', '서비스 가입 상태', '이용 자격'] },
    { category: '고객 프로필 기반', items: ['고객 특성'] },
  ],
  바코드형: [
    { category: '실시간 상황 기반', items: ['현재 위치', '사용 가능 시간'] },
    { category: '이용 이력 기반', items: ['바코드 사용', '혜택 사용'] },
    { category: '가입·보유 정보 기반', items: ['멤버십 가입', '멤버십 등급', '혜택 자격'] },
    { category: '고객 프로필 기반', items: ['고객 식별 정보'] },
  ],
};

// 시트 미정의 유형(종합형·이용지원형 등) 기본값 = 공통 6 대분류.
export const PERSO_OPTIONS_DEFAULT: PersoCategory[] = [
  { category: '실시간 상황 기반', items: ['현재 위치', '시간·상황'] },
  { category: '구매 이력 기반', items: ['구매 브랜드', '구매 빈도'] },
  { category: '이용 이력 기반', items: ['조회·방문', '혜택 이용'] },
  { category: '관심사 기반', items: ['브랜드·카테고리 관심'] },
  { category: '가입·보유 정보 기반', items: ['멤버십 자격'] },
  { category: '고객 프로필 기반', items: ['고객 특성'] },
];

export function persoOptionsFor(mid?: string | null): PersoCategory[] {
  return (mid && PERSO_OPTIONS_BY_MID[mid]) || PERSO_OPTIONS_DEFAULT;
}
