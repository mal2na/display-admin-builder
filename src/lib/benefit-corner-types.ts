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
    });
  }
  return out;
}

export function benefitTypeByKey(key: string): BenefitType | undefined {
  return benefitTypes().find((t) => t.presetKey === key);
}

// 혜택형(중분류 > 레이아웃) → 기존 코너 유형 관리의 baseCategory/typeDetail/componentType 매핑.
//  미리보기(cornerRowPreview+DevicePreview)·코너 속성(CornerFieldList)을 기존 렌더러로 그대로 그리기 위함(2026-11-23 사용자 요청).
export function benefitMap(mid: string, layout: string): { base: string; detail: string; comp: string; barcode?: boolean; items?: number; price?: boolean; render?: 'special'; itemButton?: boolean; carousel?: boolean } {
  switch (`${mid} > ${layout}`) {
    // detail = 저장값(표시 라벨 아님). '세로형+배너'=상단 이미지형. '상단 이미지형' 문자열은 noTitle 조건('이미지형')에 걸리므로 금지.
    // 풀스펙: 상단 이미지(+배너) + 카테고리(칩) + CTA(혜택·오퍼형 세로+카테고리 → moreButton 노출).
    case '제휴사형 > 세로형': return { base: '혜택·오퍼형', detail: '세로형(카테고리형)+배너', comp: '혜택형', items: 1, price: false };
    // 바코드형: 배너+타이틀+아이템 1개 위에 멤버십 바코드. 가격·할인율 없음(혜택 문구만).
    case '제휴사형 > 바코드형': return { base: '혜택형', detail: '세로형+배너', comp: '혜택형', barcode: true, items: 1, price: false };
    // 미션형 세로형: 풀옵션(배너+카테고리+CTA) + 아이템 1개 + 아이템 우측 버튼(Label).
    case '미션형 > 세로형': return { base: '혜택·오퍼형', detail: '세로형(카테고리형)+배너', comp: '혜택형', items: 1, itemButton: true, price: false };
    // 출석체크형(게이지/요일)은 기존 CornerBlock에 없는 레이아웃 → 전용 껍데기 목업(FullsetPreview: 진행바/요일체크 위젯).
    case '미션형 > 출석체크형(게이지)': return { base: '혜택·오퍼형', detail: '세로형', comp: '혜택형', render: 'special', price: false };
    case '미션형 > 출석체크형(요일)': return { base: '혜택·오퍼형', detail: '세로형', comp: '혜택형', render: 'special', price: false };
    // 이벤트형 세로형: 배너 없음(프리셋 0040·0041·0042·0045·0062), 카테고리 있음(0045), 가격 없음(혜택 문구).
    case '이벤트형 > 세로형': return { base: '혜택·오퍼형', detail: '세로형(카테고리형)', comp: '혜택형', price: false };
    case '이벤트형 > 좌우 리스트형': return { base: '혜택·오퍼형', detail: '세로형', comp: '혜택형', render: 'special', price: false };
    // 혜택프로그램 세로형: 배너 있음(0007·0047~49), 카테고리 있음(0050·0055·0060), 혜택 브랜드 문구(가격 없음).
    case '혜택프로그램형 > 세로형': return { base: '혜택·오퍼형', detail: '세로형(카테고리형)+배너', comp: '혜택형', items: 1, price: false };
    // 가로형: 카테고리 + 가로 카드. 상단 배너 없음(프리셋 0035·0036 기준).
    case '혜택프로그램형 > 가로형': return { base: '혜택·오퍼형', detail: '가로형(카테고리형)', comp: '상품형' };
    // 캐러셀형: 세로 리스트(혜택 문구 + 브랜드)를 스와이프하는 캐러셀. 배너·카테고리·가격 없음 + 스와이프 점.
    case '혜택프로그램형 > 캐러셀형': return { base: '혜택·오퍼형', detail: '세로형', comp: '혜택형', price: false, carousel: true };
    // 이용지원형은 상단 이미지(배너) 없음 — 카테고리·CTA만, 가격 없음(안내).
    case '이용지원형 > 세로형': return { base: '혜택·오퍼형', detail: '세로형(카테고리형)', comp: '혜택형', items: 1, price: false };
    default: return { base: '혜택·오퍼형', detail: '세로형', comp: '혜택형' };
  }
}

// ── 풀셋(슬롯 구성) — 상세 '코너 미리보기'를 프리셋 더미 대신 '껍데기 1벌'로 보여주기 위한 슬롯 정의(2026-11-23 사용자 요청).
//  각 유형이 담는 구조 슬롯(배너·타이틀·버튼 텍스트·아이템·하단 CTA 등)을 라벨과 함께 한 벌만 노출한다.
export type SlotKind = 'banner' | 'title' | 'buttonText' | 'items' | 'reward' | 'cta' | 'barcode' | 'progress' | 'checks' | 'metrics' | 'carousel';
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
    // 둘 다 출석체크 미션(쉐입만 다름): 게이지=누적 출석, 요일=요일 도장.
    case '미션형 > 출석체크형(게이지)':
      return [title, buttonText, { kind: 'progress', label: '출석 진행바(게이지)', note: '누적 출석 + 보상 마일스톤' }, { kind: 'reward', label: '보상 아이템', note: '보상명 + 조건 + 받기 버튼' }];
    case '미션형 > 출석체크형(요일)':
      return [title, buttonText, { kind: 'checks', label: '출석 요일 체크', note: '출석 도장' }, { kind: 'reward', label: '보상 아이템', note: '보상명 + 조건 + 받기 버튼' }];
    case '이벤트형 > 세로형':
      return [title, buttonText, { kind: 'items', label: '이벤트 아이템', note: '어드민 프로모션' }];
    case '이벤트형 > 좌우 리스트형':
      return [title, buttonText, { kind: 'metrics', label: '지표(좌우 리스트)', note: '잔여/예정 등' }, cta];
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

// ── 코너 속성(표시 항목) — 코너 카드에 들어가는 항목 + 옵션 표시(2026-11-23 사용자 요청).
//  Y/N 라디오가 아니라 '필수/옵션' 태그로. 상단 이미지·CTA·카테고리 등 토글 가능한 건 옵션.
export type AttrRow = { label: string; code: string; option: boolean };
export type CornerAttrs = { card: AttrRow[]; item: AttrRow[] };

export function cornerAttrs(mid: string, layout: string): CornerAttrs {
  const m = benefitMap(mid, layout);
  const d = m.detail;
  const hasBanner = d.includes('배너');
  const hasCategory = d.includes('카테고리');
  const isBarcode = m.barcode === true;
  const card: AttrRow[] = [
    { label: '코너 타이틀', code: 'CornerTitle', option: false },
    { label: '버튼 텍스트', code: 'ButtonText', option: false },
  ];
  if (hasBanner) card.push({ label: '상단 이미지', code: 'Banner', option: true });
  if (hasCategory) card.push({ label: '카테고리', code: 'Category', option: true });
  if (isBarcode) card.push({ label: '바코드', code: 'Barcode', option: true });
  else card.push({ label: 'CTA', code: 'CallToAction', option: true });
  // 아이템(반복 카드). 가격·할인율은 유형에 따라 없을 수 있다(바코드형=혜택 문구만).
  const item: AttrRow[] = [
    { label: '컴포넌트 이미지', code: 'ImageSrc', option: false },
    { label: '컴포넌트 타이틀', code: 'ItemTitle', option: false },
    { label: '서브텍스트', code: 'SubText', option: true },
  ];
  if (m.price !== false) {
    item.push({ label: '가격', code: 'Price', option: true });
    item.push({ label: '할인율', code: 'DiscountRate', option: true });
  }
  return { card, item };
}
