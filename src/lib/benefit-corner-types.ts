// 혜택형 코너 유형(11종) 공용 정의 — 코너 유형 관리 메인 리스트와 상세가 같은 ID·순서를 쓰도록 SSOT로 둔다(2026-11-23).
//  SSOT = preset-shape-groups.ts. 라벨 `혜택형 > <중분류> > <레이아웃>` → 혜택형(top) 하위 중분류·레이아웃 유형.
import { PRESET_SHAPE_GROUPS } from './preset-shape-groups';

export type BenefitType = {
  typeId: string;      // 표시용 코너 유형 ID (CYH001…)
  top: '혜택형';
  mid: string;         // 중분류 (제휴사형·미션형…)
  layout: string;      // 배열·레이아웃
  name: string;        // "중분류 · 레이아웃"
  source: string;      // 바라보는 원장
  presetKey: string;   // 상세 경로 key = PresetShapeGroup.key
  presetIds: string[]; // 등록된 프리셋
  unused?: boolean;    // 안씀(미사용) — Figma 최종본에 없으나 보존(바코드형 등)
};

export function benefitTypes(): BenefitType[] {
  const out: BenefitType[] = [];
  let n = 0;
  for (const g of PRESET_SHAPE_GROUPS) {
    const parts = g.label.split('>').map((s) => s.trim());
    if (parts[0] !== '혜택형' || parts.length < 3) continue;
    n += 1;
    const mid = parts[1];
    const layout = parts[parts.length - 1];
    out.push({
      typeId: `CYH${String(n).padStart(3, '0')}`,
      top: '혜택형',
      mid,
      layout,
      name: `${mid} · ${layout}`,
      source: g.source,
      presetKey: g.key,
      presetIds: g.presetIds,
      unused: g.unused ?? false,
    });
  }
  return out;
}

export function benefitTypeByKey(key: string): BenefitType | undefined {
  return benefitTypes().find((t) => t.presetKey === key);
}

// ── 운영여부(개인화/수동) — 유형이 어느 영역에 들어갈 수 있나(2026-11-25 사용자 요청).
//  개인화 = 개인화 영역 + 운영 영역 둘 다 가능 / 수동 = 운영(운영자 지정) 영역만, 개인화 영역 불가.
//  이용지원형 = 수동만. 미션 출석체크·룰렛 = 개인화(전용). 그 외 = 개인화/수동.
export type OperMode = '개인화/수동' | '개인화' | '수동';
export function operModeOf(mid: string, layout: string): OperMode {
  if (mid === '이용지원형') return '수동';
  if (layout === '출석체크형' || layout === '룰렛형') return '개인화';
  return '개인화/수동';
}
// 개인화 영역에 들어갈 수 있는가(= 운영여부에 '개인화' 포함). 수동 전용이면 false.
export function canPersonalize(mid: string, layout: string): boolean {
  return operModeOf(mid, layout) !== '수동';
}

// 유형별 노출 규격(가이드) — SB 프리셋 정책 기준. 인디케이터·아이템 개수·옵션 규칙(2026-11-24).
export function benefitGuide(mid: string, layout: string): string {
  switch (layout) {
    case '리스트형':
      return '세로 리스트. 아이템 기본 3개·최대 4개 이하 권장. 상단 이미지·카테고리·CTA는 옵션.';
    case '캐러셀형':
      return '가로 스크롤 카드. 아이템 3~10개. 카테고리는 옵션.';
    case '바코드형':
      return '아이템 1개 + 멤버십 바코드(값은 런타임 발급). 상단 이미지·추천 맥락 헤더는 옵션.';
    case '출석체크형':
      return '출석 누적 게이지(예: 출석 N일차, 출석 불규칙) + 마일스톤 보상. 보상 아이템은 가격 없음.';
    case '룰렛형':
      return '룰렛 돌림판 + 당첨 보상. 당첨 결과는 런타임 발급. 보상 아이템은 가격 없음.';
    default:
      return '세로 리스트. 상단 이미지·카테고리·CTA는 옵션.';
  }
}

// ── SB DSP_03 Figma 프레임 export 이미지 맵(2026-11-24) — `${mid} > ${layout}` → public/assets/sb-preview/<key>.png.
//  코너 유형 관리 미리보기 + 빌더 코너 불러오기 모달이 공용으로 쓴다(서버 모듈이라 여기에 둔다).
export const SB_PREVIEW: Record<string, string> = {
  '제휴사형 > 리스트형': '/assets/sb-preview/affiliate.png',       // node 27811
  '이벤트형 > 리스트형': '/assets/sb-preview/event.png',           // node 27920
  '미션형 > 리스트형': '/assets/sb-preview/mission.png',           // node 28036
  '미션형 > 출석체크형': '/assets/sb-preview/attendance.png',       // node 28693
  '미션형 > 룰렛형': '/assets/sb-preview/roulette.png',             // node 28813
  '혜택프로그램형 > 리스트형': '/assets/sb-preview/program.png',     // node 28274
  '혜택프로그램형 > 캐러셀형': '/assets/sb-preview/program-carousel.png', // node 28312
  '제휴사형 > 바코드형': '/assets/sb-preview/program-barcode.png', // node 28912:21916 (바코드형 제휴사형으로 이동 2026-11-25)
  '이용지원형 > 리스트형': '/assets/sb-preview/support.png',         // node 28582
  '이용지원형 > 캐러셀형': '/assets/sb-preview/support-carousel.png',    // node 28620
};

export function sbPreviewSrc(mid: string, layout: string): string | null {
  return SB_PREVIEW[`${mid} > ${layout}`] ?? null;
}

// 혜택형(중분류 > 레이아웃) → 기존 코너 유형 관리의 baseCategory/typeDetail/componentType 매핑.
//  미리보기(cornerRowPreview+DevicePreview)·코너 속성(CornerFieldList)을 기존 렌더러로 그대로 그리기 위함(2026-11-23 사용자 요청).
export function benefitMap(mid: string, layout: string): { base: string; detail: string; comp: string; barcode?: boolean; items?: number; price?: boolean; render?: 'special'; itemButton?: boolean; carousel?: boolean } {
  switch (`${mid} > ${layout}`) {
    // 레이아웃 = 리스트형(세로 리스트, 인디케이터 있어도) / 캐러셀형(가로 스크롤) (2026-11-24 SB DSP_03 기준).
    //  detail은 기존 렌더러용 저장값('세로형'·'가로형'…). '상단 이미지형' 문자열은 noTitle 조건에 걸리므로 금지.
    // 제휴사형 리스트형: 배너·카테고리 옵션, 아이템 1, 혜택 문구(가격 없음).
    case '제휴사형 > 리스트형': return { base: '혜택·오퍼형', detail: '세로형(카테고리형)+배너', comp: '혜택형', items: 1, price: false };
    //  바코드형: 안씀(미사용) 보존 — Figma 최종본 미포함.
    case '제휴사형 > 바코드형': return { base: '혜택형', detail: '세로형+배너', comp: '혜택형', barcode: true, items: 1, price: false };
    // 미션형 리스트형: 배너+카테고리 + 아이템 1 + 우측 버튼(Label).
    case '미션형 > 리스트형': return { base: '혜택·오퍼형', detail: '세로형(카테고리형)+배너', comp: '혜택형', items: 1, itemButton: true, price: false };
    // 미션형 출석체크형(통합)·룰렛형 — 기존 CornerBlock에 없는 레이아웃 → 전용 껍데기 목업(진행바·룰렛 위젯).
    case '미션형 > 출석체크형': return { base: '혜택·오퍼형', detail: '세로형', comp: '혜택형', render: 'special', price: false };
    case '미션형 > 룰렛형': return { base: '혜택·오퍼형', detail: '세로형', comp: '혜택형', render: 'special', price: false };
    // 이벤트형 리스트형: 배너 옵션 + 카테고리(0045), 가격 없음(혜택 문구).
    case '이벤트형 > 리스트형': return { base: '혜택·오퍼형', detail: '세로형(카테고리형)+배너', comp: '혜택형', price: false };
    // 혜택프로그램 리스트형: 세로 리스트(배너·카테고리 옵션) + 스와이프 인디케이터(구 세로형+캐러셀 통합).
    case '혜택프로그램형 > 리스트형': return { base: '혜택·오퍼형', detail: '세로형(카테고리형)+배너', comp: '혜택형', items: 1, price: false, carousel: true };
    // 혜택프로그램 캐러셀형: 가로 스크롤 상품 카드(호텔·공연 가격, 카테고리). 배너 없음(0035·0036).
    case '혜택프로그램형 > 캐러셀형': return { base: '혜택·오퍼형', detail: '가로형(카테고리형)', comp: '상품형' };
    // 혜택프로그램 바코드형(신규, 2026-11-25): 아이템 1 + 멤버십 바코드(값 런타임 발급).
    case '혜택프로그램형 > 바코드형': return { base: '혜택형', detail: '세로형+배너', comp: '혜택형', barcode: true, items: 1, price: false };
    // 이용지원형 리스트형: 배너 없음 — 카테고리만, 가격 없음(안내).
    case '이용지원형 > 리스트형': return { base: '혜택·오퍼형', detail: '세로형(카테고리형)', comp: '혜택형', items: 1, price: false };
    // 이용지원형 캐러셀형(신규): 가로 스크롤 카드, 카테고리, 가격 없음(안내).
    case '이용지원형 > 캐러셀형': return { base: '혜택·오퍼형', detail: '가로형(카테고리형)', comp: '혜택형', price: false };
    default: return { base: '혜택·오퍼형', detail: '세로형', comp: '혜택형' };
  }
}

// ── 풀셋(슬롯 구성) — 상세 '코너 미리보기'를 프리셋 더미 대신 '껍데기 1벌'로 보여주기 위한 슬롯 정의(2026-11-23 사용자 요청).
//  각 유형이 담는 구조 슬롯(배너·타이틀·버튼 텍스트·아이템·하단 CTA 등)을 라벨과 함께 한 벌만 노출한다.
export type SlotKind = 'banner' | 'title' | 'buttonText' | 'items' | 'reward' | 'cta' | 'barcode' | 'progress' | 'checks' | 'metrics' | 'carousel' | 'roulette';
export type Slot = { kind: SlotKind; label: string; note?: string };

export function fullsetSlots(mid: string, layout: string): Slot[] {
  const title: Slot = { kind: 'title', label: '타이틀', note: '+ 서브타이틀' };
  const buttonText: Slot = { kind: 'buttonText', label: '버튼 텍스트', note: '타이틀 옆 링크' };
  const cta: Slot = { kind: 'cta', label: '하단 CTA' };
  const banner: Slot = { kind: 'banner', label: '배너', note: '상단 이미지 · EPC 원장' };
  const itemSource = '운영자 편성 / CVM';

  switch (`${mid} > ${layout}`) {
    case '제휴사형 > 세로형':
      return [banner, title, buttonText, { kind: 'items', label: '제휴사 아이템', note: itemSource }, cta];
    case '제휴사형 > 바코드형':
      return [title, buttonText, { kind: 'items', label: '제휴사 아이템', note: itemSource }, { kind: 'barcode', label: '멤버십 바코드', note: '런타임 발급' }];
    case '미션형 > 세로형':
      return [title, buttonText, { kind: 'items', label: '미션 아이템', note: itemSource }, cta];
    // 출석체크형(통합) — 누적 출석 게이지 + 마일스톤 보상.
    case '미션형 > 출석체크형':
      return [title, buttonText, { kind: 'progress', label: '출석 진행바(게이지)', note: '누적 출석(불규칙) + 보상 마일스톤' }, { kind: 'reward', label: '보상 아이템', note: '보상명 + 조건 + 받기 버튼' }];
    // 룰렛형(신규) — 돌림판 + 당첨 보상.
    case '미션형 > 룰렛형':
      return [title, buttonText, { kind: 'roulette', label: '룰렛 돌림판', note: '당첨 결과 런타임 발급' }, { kind: 'reward', label: '당첨 보상', note: '보상명 + 조건 + 받기 버튼' }];
    case '이벤트형 > 세로형':
      return [title, buttonText, { kind: 'items', label: '이벤트 아이템', note: '어드민 프로모션' }];
    case '혜택프로그램형 > 세로형':
      return [banner, title, buttonText, { kind: 'items', label: '혜택 아이템', note: itemSource }, cta];
    case '혜택프로그램형 > 가로형':
      return [banner, title, buttonText, { kind: 'carousel', label: '혜택 아이템(가로)', note: itemSource }];
    case '혜택프로그램형 > 캐러셀형':
      return [title, buttonText, { kind: 'carousel', label: '혜택 아이템(캐러셀)', note: itemSource }];
    case '이용지원형 > 세로형':
      return [title, buttonText, { kind: 'items', label: '안내 항목', note: '앱 내 페이지 링크' }, cta];
    default:
      return [title, buttonText, { kind: 'items', label: '아이템', note: itemSource }, cta];
  }
}

// ── 코너 속성/컴포넌트 요소 — 기획(SB DSP_03) 기준 On/Off 가능 항목 + 의존 규칙(2026-11-24 전수 반영).
//  state: 'required'(항상 노출) | 'toggle'(운영자가 On/Off). default=토글 기본값. rules=의존 규칙(빌더 enforce).
//  핵심 규칙: ①카테고리 칩 노출 시 인디케이터 사용 불가(배타) ②액션버튼↔코너 랜딩 링크 택1 필수 ③인디케이터는 리스트 3개 이상.
export type AttrState = 'required' | 'toggle';
export type AttrRow = { label: string; code: string; state: AttrState; default?: boolean; note?: string };
export type CornerAttrSpec = { card: AttrRow[]; item: AttrRow[]; rules: string[] };

// 중분류별 '추천 맥락 헤더' 보유(이벤트/제휴사/혜택프로그램만 · 미션·이용지원 없음 — SB 프리뷰 기준).
const CONTEXT_MIDS = new Set(['제휴사형', '이벤트형', '혜택프로그램형']);

export function cornerAttrSpec(mid: string, layout: string): CornerAttrSpec {
  const m = benefitMap(mid, layout);
  const isList = layout === '리스트형';
  const isCarousel = layout === '캐러셀형';
  const isAttendance = layout === '출석체크형';
  const isRoulette = layout === '룰렛형';
  const isBarcode = m.barcode === true;
  const listLike = isList || isCarousel;            // 반복 아이템 리스트/캐러셀
  const hasChip = listLike;                         // 카테고리 칩(탭)
  // 인디케이터(스와이프)는 제외 — 리스트 코너에서 사용 안 함(2026-11-25 Slack 확정).
  const hasContext = (listLike || isBarcode) && CONTEXT_MIDS.has(mid);

  // ── 코너(카드) 공통 속성 — 카드 상단→하단 시각 순서로 나열(2026-11-25 사용자 요청): 상단 이미지 → 추천 맥락 헤더 → 코너 타이틀 → 카테고리 칩 → 추가 인포메이션 → 랜딩/액션 버튼.
  const card: AttrRow[] = [];
  card.push({ label: '상단 이미지', code: 'Image', state: 'toggle', default: false, note: '원장 이미지 또는 운영 등록 · 기본 OFF' });
  if (hasContext) card.push({ label: '추천 맥락 헤더', code: 'ContextHeader', state: 'toggle', default: false, note: '추천 근거(거리·검색·매장방문) 노출 · API 활동기록' });
  card.push({ label: '코너 타이틀', code: 'CornerTitle', state: 'required' });
  // 카테고리 칩(탭)은 컴포넌트(요소)로 이동(2026-11-25 사용자 요청) — 아래 item 배열에서 push.
  if (isBarcode) card.push({ label: '바코드', code: 'Barcode', state: 'required', note: '멤버십 바코드 · 값 런타임 발급' });
  if (!isBarcode) card.push({ label: '추가 인포메이션', code: 'Information', state: 'toggle', default: false, note: '운영 정보성 영역' }); // 바코드형은 성격 디스크립션 없음(2026-11-25 SB)
  // 코너 랜딩 링크 버튼 — 모든 중분류에 포함(2026-11-25 사용자 요청: 있는 거 다 넣기). 코너 유형에서 On/Off 가능(toggle).
  card.push({ label: '코너 랜딩 링크 버튼', code: 'LandingLink', state: 'toggle', default: true, note: '액션 버튼과 택1 필수 · On/Off' });
  card.push({ label: '하단 CTA', code: 'ActionButton', state: 'toggle', default: false, note: '코너 랜딩 링크와 택1 필수 · On/Off' });

  // ── 컴포넌트(아이템) 요소
  let item: AttrRow[] = [];
  if (isAttendance) {
    item = [
      { label: '출석 진행(요일·게이지)', code: 'Attendance', state: 'required' },
      { label: '보상 아이템(썸네일·보상명·조건)', code: 'Reward', state: 'required' },
      { label: '받기 버튼', code: 'RewardButton', state: 'required' },
    ];
  } else if (isRoulette) {
    item = [
      { label: '응모 기회 지표(남은/추가)', code: 'EntryMetric', state: 'required' },
    ];
  } else if (isBarcode) {
    item = [
      { label: '썸네일', code: 'Thumbnail', state: 'required' },
      { label: '컴포넌트 타이틀', code: 'ItemTitle', state: 'required' },
      { label: '컴포넌트 내용', code: 'ItemDesc', state: 'required' },
      { label: '멤버십 바코드', code: 'Barcode', state: 'required', note: '값은 런타임 발급' },
    ];
  } else if (listLike) {
    item = [
      // 카테고리 칩(탭) — 리스트 상단 카테고리 구분(컴포넌트로 이동, 2026-11-25 사용자 요청).
      ...(hasChip ? [{ label: '카테고리 탭', code: 'Category', state: 'toggle' as const, default: false, note: '카테고리 구분' }] : []),
      { label: '썸네일', code: 'Thumbnail', state: 'required' },
      { label: '컴포넌트 타이틀', code: 'ItemTitle', state: 'required' },
      { label: '컴포넌트 내용', code: 'ItemDesc', state: 'required' },
      // 상세 링크(ItemLink) 제외 — 원장(EPC) 소유 값이라 기획 On/Off 대상 아님(2026-11-25 사용자 요청).
    ];
    if (m.itemButton) item.push({ label: '우측 버튼(Label)', code: 'ItemButton', state: 'toggle', default: true });
    if (m.price !== false) {
      item.push({ label: '가격', code: 'Price', state: 'toggle', default: true });
      item.push({ label: '할인율', code: 'DiscountRate', state: 'toggle', default: true });
    }
  }

  // ── 의존 규칙(빌더 enforce)
  const rules: string[] = [];
  rules.push('코너 랜딩 링크 버튼과 액션 버튼 중 최소 1개는 필수 노출입니다 (택1).');
  if (listLike) rules.push('리스트는 기본 3개, 최대 4개 이하 권장입니다.');

  return { card, item, rules };
}
