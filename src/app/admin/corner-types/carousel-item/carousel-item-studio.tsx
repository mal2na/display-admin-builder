'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Image as ImageIcon, RotateCcw } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// 코너 유형(상품형 가로형+배너) 속성 스튜디오. Figma DS CardHome + CarouselItem.
//  구성: 1. 기본 정보(미리보기 + 기본 정보 필드 + 코너 정보=CardHome) · 2. 코너 속성(CarouselItem 51).
//  코너 유형 = 껍데기: 어떤 요소를 쓸지(Show)·형태를 정의. 값은 미리보기용 샘플(실데이터는 빌더/CVM).
// ─────────────────────────────────────────────────────────────

// 가로형(CarouselItem)=Small/Medium/Large · 세로형(CardHomeItem)=Profile/Data/Barcode
type Variant = 'Small' | 'Medium' | 'Large' | 'Profile' | 'Data' | 'Barcode';
const H_VARIANTS = ['Small', 'Medium', 'Large'] as const;
const V_VARIANTS = ['Profile', 'Data', 'Barcode'] as const;
// 레이아웃 문자열이 세로형이면 true (세로형 · 세로형+배너 · 세로형+칩 …)
const isVertical = (layout?: string) => /세로/.test(layout ?? '');
type Tone = 'Neutral' | 'Brand' | 'Danger' | 'Positive';
type Hierarchy = 'Primary' | 'Secondary';
type Toggle<T = Record<string, never>> = { show: boolean } & T;
type BadgeItem = { show: boolean; tone: Tone; hierarchy: Hierarchy; label: string };

export type CarouselItemSpec = {
  variant: Variant;
  imageSrc: string;
  title: string;
  subTitle: Toggle<{ value: string }>;
  priceGroup: Toggle<{
    price: string;
    priceCaption: Toggle<{ value: string }>;
    discountRate: Toggle<{ value: string }>;
    pricePeriod: Toggle<{ value: string }>;
  }>;
  subText01: Toggle<{ value: string }>;
  subText02: Toggle<{ value: string }>;
  caption: Toggle<{
    value: string;
    icon: Toggle;
    caption02: Toggle<{ value: string }>;
    caption03: Toggle<{ value: string }>;
  }>;
  count: Toggle<{ value: string }>;
  badgeGroup: Toggle<{ labelCount: number; items: BadgeItem[] }>;
};

export type CardHomeSpec = {
  title: string;
  buttonText: Toggle<{ label: string }>; // 라벨 텍스트(ButtonText) — 타이틀 바로 밑. 필수(고정)
  cta: Toggle<{ label: string }>;         // CTA 버튼(Label ›) — 옵션(배너·칩·CTA 3종만 옵션, 빌더 토글). 2026-10-28
  bannerSrc: string;
  bannerOn: boolean;                      // 배너 옵션 On/Off — 옵션(빌더 토글). 2026-10-28
  chipOn: boolean;                        // 칩 옵션 On/Off — 옵션(상단 카테고리 탭). 2026-10-28
  item: CarouselItemSpec;
};

const emptyBadges = () => Array.from({ length: 5 }, (_, i) => ({ show: i < 3, tone: (i === 0 ? 'Positive' : 'Neutral') as Tone, hierarchy: 'Secondary' as Hierarchy, label: 'Label' }));

// 가로형 초기값 — DS 실제 케이스(단말 추천): 이미지·타이틀·가격(99,999원)·할인율(99%)·서브텍스트2. 기간·캡션·개수 off.
const carousel = (title: string): CarouselItemSpec => ({
  variant: 'Small',
  imageSrc: '',
  title,
  subTitle: { show: false, value: 'SubTitle' },
  priceGroup: { show: true, price: '99,999원', priceCaption: { show: false, value: 'Caption01' }, discountRate: { show: true, value: '99%' }, pricePeriod: { show: false, value: '/월' } },
  subText01: { show: false, value: 'SubText01' },
  subText02: { show: true, value: 'SubText02' },
  caption: { show: false, value: '5.0', icon: { show: false }, caption02: { show: false, value: '예매율 99.9%' }, caption03: { show: false, value: 'Caption03' } },
  count: { show: false, value: '+2' },
  badgeGroup: { show: false, labelCount: 3, items: emptyBadges() },
});

// 세로형 초기값 — DS 요금제 케이스: 이미지·타이틀·캡션(무제한)·캡션2 + 가격 옵션(기본 On: 99% 99,999원/Period).
const cardHomeItem = (title: string): CarouselItemSpec => ({
  variant: 'Profile',
  imageSrc: '',
  title,
  subTitle: { show: false, value: 'SubTitle' },
  priceGroup: { show: true, price: '99,999원', priceCaption: { show: false, value: 'Caption01' }, discountRate: { show: true, value: '99%' }, pricePeriod: { show: true, value: '/Period' } },
  subText01: { show: false, value: 'SubText01' },
  subText02: { show: false, value: 'SubText02' },
  caption: { show: true, value: '데이터 500GB', icon: { show: false }, caption02: { show: true, value: '넷플릭스 프리미엄 제공' }, caption03: { show: false, value: 'Caption03' } },
  count: { show: false, value: '+2' },
  badgeGroup: { show: false, labelCount: 3, items: emptyBadges() },
});

// 상품형 item 정규화 — 가로형: 가격·할인율·서브텍스트2 고정. 세로형: 캡션·캡션2 고정 + 가격은 옵션(토글, 저장값 유지).
//  선택/미사용(서브타이틀·보조텍스트1·가격설명·캡션아이콘·캡션3·배지)은 끈다. 2026-10-28 사용자 확정.
function normalizeProductItem(it: CarouselItemSpec, vertical: boolean): CarouselItemSpec {
  return {
    ...it,
    subTitle: { ...it.subTitle, show: false },
    subText01: { ...it.subText01, show: false },
    // 서브텍스트2 = 가로형만(단말 추천).
    subText02: { ...it.subText02, show: !vertical },
    priceGroup: vertical
      // 세로형: 가격은 옵션(토글) → 저장값 유지, 가격설명만 끔.
      ? { ...it.priceGroup, priceCaption: { ...it.priceGroup.priceCaption, show: false } }
      // 가로형: 가격·할인율은 옵션(토글) → 저장값 유지(2026-10-29(2) 사용자 요청). 가격설명·기간만 끔.
      : { ...it.priceGroup, priceCaption: { ...it.priceGroup.priceCaption, show: false },
          pricePeriod: { ...it.priceGroup.pricePeriod, show: false } },
    // 캡션·캡션2 = 세로형 고정. 캡션3 미사용.
    caption: { ...it.caption, show: vertical, icon: { show: false }, caption02: { ...it.caption.caption02, show: vertical }, caption03: { ...it.caption.caption03, show: false } },
    count: { ...it.count, show: false },
    badgeGroup: { ...it.badgeGroup, show: false },
  };
}

// 레이아웃별 초기 스펙 — 세로형=CardHomeItem, 가로형=CarouselItem. 배너=옵션(기본값은 '+배너' 레이아웃이면 On).
function defaultSpec(layout?: string): CardHomeSpec {
  return {
    title: 'Title',
    buttonText: { show: true, label: 'Label' }, // 라벨 텍스트 = 필수(고정)
    cta: { show: true, label: 'Label' },         // CTA = 옵션
    bannerSrc: '',
    bannerOn: layout == null || /배너/.test(layout), // 배너 = 옵션
    chipOn: false,                                // 칩 = 옵션(상단 카테고리 탭)
    item: isVertical(layout) ? cardHomeItem('Title') : carousel('Title'),
  };
}

const DEFAULT_SPEC: CardHomeSpec = defaultSpec();

const TONE: Record<Tone, { soft: string; solid: string }> = {
  Neutral: { soft: 'bg-[#eef0f3] text-[#697582]', solid: 'bg-[#697582] text-white' },
  Brand: { soft: 'bg-[#ece8ff] text-[#3617ce]', solid: 'bg-[#3617ce] text-white' },
  Danger: { soft: 'bg-[#ffe2e2] text-[#ed3b3e]', solid: 'bg-[#ed3b3e] text-white' },
  Positive: { soft: 'bg-[#c8f6e1] text-[#038e52]', solid: 'bg-[#00a058] text-white' },
};

// ── UI 프리미티브 ─────────────────────────────────────────────
function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
      className={cn('relative inline-flex h-[22px] w-[40px] shrink-0 items-center rounded-full transition', on ? 'bg-[#3617ce]' : 'bg-[#dce0e5]')}>
      <span className={cn('inline-block h-[16px] w-[16px] rounded-full bg-white shadow transition', on ? 'translate-x-[21px]' : 'translate-x-[3px]')} />
    </button>
  );
}
function Seg<T extends string>({ value, options, onChange }: { value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex overflow-hidden rounded-[6px] border border-[#dce0e5] bg-white">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)}
          className={cn('px-2.5 py-1 text-[11px] font-semibold transition', value === o ? 'bg-[#3617ce] text-white' : 'text-[#697582] hover:bg-[#f1f3f5]')}>{o}</button>
      ))}
    </div>
  );
}
function TextInput({ value, onChange, placeholder, multiline }: { value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  // 내용 높이에 맞춰 자동 리사이즈 — 한 줄이면 한 줄만, 빈 줄 공간 제거(2026-10-19 사용자 요청)
  useLayoutEffect(() => {
    if (!multiline || !taRef.current) return;
    taRef.current.style.height = 'auto';
    taRef.current.style.height = `${taRef.current.scrollHeight}px`;
  }, [value, multiline]);
  if (multiline) return (
    <textarea ref={taRef} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={1}
      className="w-full resize-none overflow-hidden rounded-[6px] border border-[#dce0e5] bg-white px-2.5 py-1.5 text-[12px] leading-[20px] text-[#1a1a1a] outline-none focus:border-[#3617ce]" />
  );
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="h-[30px] w-full rounded-[6px] border border-[#dce0e5] bg-white px-2.5 text-[12px] text-[#1a1a1a] outline-none focus:border-[#3617ce]" />
  );
}
// 테이블 행 — 좌: 라벨(음영) · 우: 컨트롤 (기본 정보 테이블/Figma SEO 표 스타일)
function Prop({ name, desc, sub, children }: { name: string; desc?: string; sub?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[150px_minmax(0,1fr)] items-start border-b border-[#eef0f3] last:border-b-0">
      <div className={cn('flex min-w-0 flex-col gap-0.5 bg-[#f8f9fb] px-3.5 py-3', sub && 'pl-5')}>
        <span className="text-[12px] font-medium text-[#1a1a1a]">{name}</span>
        {desc && <span className="text-[10.5px] leading-tight text-[#8b949e]">{desc}</span>}
      </div>
      <div className="flex min-w-0 items-center px-3.5 py-3">{children}</div>
    </div>
  );
}
function Group({ title, sub, children, defaultOpen = true }: { title: string; sub?: boolean; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)}
        className={cn('flex w-full items-center gap-1.5 border-b border-[#dce0e5] bg-[#f1f3f5] px-3.5 py-2 text-[12px] font-semibold text-[#1a1a1a]', sub && 'pl-5')}>
        {sub && <span className="text-[#b3b9c0]">└</span>}
        <span className="flex-1 text-left">{title}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-[#8b949e] transition', !open && '-rotate-90')} />
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}
// 번호 섹션 제목
function SecH({ n, title, aside }: { n: number; title: string; aside?: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3617ce] text-[12px] font-bold text-white">{n}</span>
      <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
      {aside}
    </div>
  );
}
// 접고 펼치는 섹션 패널 (SEO 설정 패널 스타일) — 헤더: 번호+제목+힌트 · 우측: aside+셰브런
function Panel({ n, title, hint, aside, defaultOpen = true, bodyClass, children }: {
  n?: number; title: string; hint?: string; aside?: React.ReactNode; defaultOpen?: boolean; bodyClass?: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="overflow-hidden rounded-[16px] border border-[#dce0e5] bg-white">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 bg-[#f8f9fb] px-5 py-4 text-left transition hover:bg-[#f1f3f5]">
        {n != null && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3617ce] text-[12px] font-bold text-white">{n}</span>}
        <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
        {hint && <span className="text-[11px] text-[#8b949e]">{hint}</span>}
        <span className="ml-auto flex items-center gap-3">
          {aside}
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-[#8b949e] transition-transform', open ? 'rotate-180' : '')} />
        </span>
      </button>
      {open && <div className={cn('border-t border-[#eef0f3]', bodyClass ?? 'px-5 py-4')}>{children}</div>}
    </section>
  );
}

// ── 미리보기: CarouselItem 카드 ───────────────────────────────
// 가로형 카드 크기 = Variants(Small/Medium/Large). DS CarouselItem 형태 변형(2026-10-28 사용자 요청).
const H_VARIANT_WIDTH: Record<string, number> = { Small: 112, Medium: 140, Large: 170 };
function ItemCard({ s, w }: { s: CarouselItemSpec; w?: number }) {
  const pg = s.priceGroup; const cap = s.caption;
  const line1 = [cap.show ? cap.value : null, cap.caption02.show ? cap.caption02.value : null].filter(Boolean);
  const line2 = [cap.caption03.show ? cap.caption03.value : null].filter(Boolean);
  const width = w ?? H_VARIANT_WIDTH[s.variant] ?? 118; // Small/Medium/Large 로 카드 폭 변경
  return (
    <div className="flex shrink-0 flex-col gap-1.5" style={{ width }}>
      <div className="flex aspect-square w-full items-center justify-center rounded-[12px] bg-[#eceef1] text-[#b3b9c0]">
        {s.imageSrc ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={s.imageSrc} alt={s.title} className="h-full w-full rounded-[12px] object-cover" /> : <ImageIcon className="h-5 w-5" />}
      </div>
      <div className="flex flex-col gap-0.5">
        {s.subTitle.show && <span className="text-[11px] text-[#8b949e]">{s.subTitle.value}</span>}
        <span className="text-[13px] font-bold leading-tight text-[#1a1a1a]">{s.title}</span>
        {pg.show && (<>
          {pg.priceCaption.show && <span className="text-[11px] text-[#8b949e]">{pg.priceCaption.value}</span>}
          <span className="flex items-baseline gap-1">
            {pg.discountRate.show && <span className="text-[13px] font-bold text-[#3617ce]">{pg.discountRate.value}</span>}
            <span className="text-[13px] font-bold text-[#1a1a1a]">{pg.price}</span>
          </span>
          {pg.pricePeriod.show && <span className="text-[11px] text-[#8b949e]">{pg.pricePeriod.value}</span>}
        </>)}
        {s.subText01.show && <span className="text-[11px] text-[#8b949e]">{s.subText01.value}</span>}
        {s.subText02.show && <span className="text-[11px] text-[#8b949e]">{s.subText02.value}</span>}
        {line1.length > 0 && <span className="text-[11px] text-[#8b949e]">{line1.join(' · ')}</span>}
        {(line2.length > 0 || s.count.show) && (
          <span className="flex items-center gap-1 text-[11px] text-[#8b949e]">{line2.join(' · ')}{s.count.show && <span className="font-semibold text-[#697582]">{s.count.value}</span>}</span>
        )}
        {s.badgeGroup.show && (
          <span className="mt-0.5 flex flex-wrap gap-1">
            {s.badgeGroup.items.filter((b) => b.show).map((b, i) => (
              <span key={i} className={cn('rounded-[4px] px-1.5 py-0.5 text-[10px] font-semibold', b.hierarchy === 'Primary' ? TONE[b.tone].solid : TONE[b.tone].soft)}>{b.label}</span>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}

// ── 미리보기: 바코드(세로형 Barcode 베리에이션) ──────────────────
function Barcode() {
  const bars = Array.from({ length: 56 }, (_, i) => ((i * 53) % 7 < 3 ? 3 : 1));
  return (
    <div className="w-full px-1 py-1">
      <div className="flex h-12 w-full items-stretch gap-[2px]">
        {bars.map((w, i) => <span key={i} className="bg-[#1a1a1a]" style={{ width: w }} />)}
      </div>
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-[#697582]"><span>1234 4561 1506 4932</span><span className="font-semibold text-[#3617ce]">19:58</span></div>
    </div>
  );
}

// ── 미리보기: CardHomeItem 행(세로형) — 이미지 좌 + 텍스트 우, Barcode 베리에이션 지원 ──
function ItemRow({ s }: { s: CarouselItemSpec }) {
  const pg = s.priceGroup; const cap = s.caption;
  const caps = [cap.show ? cap.value : null, cap.caption02.show ? cap.caption02.value : null, cap.caption03.show ? cap.caption03.value : null].filter(Boolean);
  if (s.variant === 'Barcode') return <Barcode />;
  return (
    <div className="flex w-full items-start gap-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-[#eceef1] text-[#b3b9c0]">
        {s.imageSrc ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={s.imageSrc} alt={s.title} className="h-full w-full object-cover" /> : <ImageIcon className="h-4 w-4" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {s.subTitle.show && <span className="truncate text-[11px] text-[#8b949e]">{s.subTitle.value}</span>}
        <span className="truncate text-[14px] font-bold leading-tight text-[#1a1a1a]">{s.title}</span>
        {pg.show && (
          <span className="flex items-baseline gap-1">
            {pg.discountRate.show && <span className="text-[14px] font-bold text-[#3617ce]">{pg.discountRate.value}</span>}
            <span className="text-[14px] font-bold text-[#1a1a1a]">{pg.price}</span>
            {pg.pricePeriod.show && <span className="text-[12px] font-medium text-[#697582]">{pg.pricePeriod.value}</span>}
          </span>
        )}
        {(caps.length > 0 || s.count.show) && <span className="truncate text-[11px] text-[#8b949e]">{caps.join(' | ')}{s.count.show ? ` ${s.count.value}` : ''}</span>}
        {s.badgeGroup.show && (
          <span className="mt-0.5 flex flex-wrap gap-1">
            {s.badgeGroup.items.filter((b) => b.show).map((b, i) => (
              <span key={i} className={cn('rounded-[4px] px-1.5 py-0.5 text-[10px] font-semibold', b.hierarchy === 'Primary' ? TONE[b.tone].solid : TONE[b.tone].soft)}>{b.label}</span>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}

// ── 미리보기: CardHome(전체 카드) — 배너 풀블리드 · 가로형=캐러셀 / 세로형=세로 리스트. 클릭으로 코너 정보/속성 전환(읽기 전용이면 비활성) ──
function CardPreview({ spec, sel, onCard, onItem, layout }: { spec: CardHomeSpec; sel?: 'card' | 'item'; onCard?: () => void; onItem?: () => void; layout?: string }) {
  const ro = !onCard && !onItem; // 읽기 전용(상세 미리보기)
  const vertical = isVertical(layout);
  // 배너 = 옵션(배너·칩·CTA 3종만 옵션). spec.bannerOn 으로 노출 결정(2026-10-28). 레거시 스펙(bannerOn 없음)은 layout 로 방어.
  const hasBanner = spec.bannerOn ?? (layout == null || /배너/.test(layout));
  // 세로형 = 행 구분선(divide-y)만 · 박스 테두리 없음(2026-10-19 사용자 요청). 선택 표시는 ring/bg로(테두리는 divide 색과 충돌).
  //  가로형 = 캐러셀 카드 → 선택 테두리 박스 유지.
  const itemBtnCls = () => vertical
    ? cn('w-full p-2 text-left transition', ro ? '' : cn('cursor-pointer rounded-[10px]', sel === 'item' ? 'bg-[#f1f2ff] ring-1 ring-inset ring-[#3617ce]' : 'hover:bg-[#f8f9fb]'))
    : cn('shrink-0 rounded-[12px] border-2 p-0.5 text-left transition', ro ? 'border-transparent' : cn('cursor-pointer', sel === 'item' ? 'border-[#3617ce]' : 'border-transparent hover:border-[#c4c9cf]'));
  return (
    <div onClick={onCard} title={ro ? undefined : '카드 전체 = 코너 정보'}
      className={cn('overflow-hidden rounded-[16px] border-2 bg-white transition', ro ? 'border-[#dce0e5]' : cn('cursor-pointer', sel === 'card' ? 'border-[#3617ce]' : 'border-[#dce0e5] hover:border-[#c4c9cf]'))}>
      {hasBanner && (spec.bannerSrc ? (
        /* eslint-disable-next-line @next/next/no-img-element */ <img src={spec.bannerSrc} alt="banner" className="h-[160px] w-full object-cover" />
      ) : (
        <div className="flex h-[160px] w-full items-center justify-center bg-[#eceef1] text-[11px] text-[#b3b9c0]">Banner</div>
      ))}
      <p className="whitespace-pre-line px-3 pt-3 text-[15px] font-bold leading-tight text-[#1a1a1a]">{spec.title}</p>
      {/* 버튼 텍스트(ButtonText) — 타이틀 바로 밑 텍스트. 모든 레이아웃 공통(2026-10-28 사용자 요청: CTA와 분리). */}
      {spec.buttonText.show && <p className="mt-1 px-3 text-[12px] text-[#697582]">{spec.buttonText.label} ›</p>}
      {/* 칩(Chip) 옵션 — 상단 카테고리 탭(2026-10-28 사용자 요청: 배너·칩·CTA 옵션 가로/세로 공통) */}
      {spec.chipOn && (
        <div className="mt-2 flex gap-1.5 overflow-x-auto px-3">
          {['전체', 'Label', 'Label'].map((c, i) => (
            <span key={i} className={cn('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold', i === 0 ? 'bg-[#3617ce] text-white' : 'bg-[#f1f3f5] text-[#697582]')}>{c}</span>
          ))}
        </div>
      )}
      {vertical ? (
        // 세로형 = 세로 리스트. 행 구분선 제거(2026-10-28 사용자 요청). 실제 노출 개수는 빌더에서, 미리보기는 대표 4건.
        <div className="mt-1 flex flex-col px-3 pb-2">
          {[0, 1, 2, 3].map((i) => (
            <button key={i} type="button" disabled={ro} onClick={(e) => { e.stopPropagation(); onItem?.(); }} title={ro ? undefined : '카드 안 컴포넌트 = 코너 속성'} className={itemBtnCls()}>
              <ItemRow s={spec.item} />
            </button>
          ))}
        </div>
      ) : (
      <div className="mt-2 flex gap-2 overflow-x-auto px-3 pb-2">
        {[0, 1].map((i) => (
          <button key={i} type="button" disabled={ro} onClick={(e) => { e.stopPropagation(); onItem?.(); }} title={ro ? undefined : '카드 안 컴포넌트 = 코너 속성'} className={itemBtnCls()}>
            <ItemCard s={spec.item} />
          </button>
        ))}
      </div>
      )}
      {/* CTA — 카드 하단 전체폭 버튼(Label ›). 버튼 텍스트와 별개(2026-10-28 사용자 요청). 레거시 스펙(cta 없음) 방어. */}
      {spec.cta?.show && (
        <div className="px-3 pb-3 pt-1">
          <div className="flex w-full items-center justify-center gap-0.5 rounded-[10px] border border-[#dce0e5] bg-white py-2 text-[12px] font-medium text-[#697582]">{spec.cta?.label || 'Label'} <span className="text-[#b3b9c0]">›</span></div>
        </div>
      )}
    </div>
  );
}

// 저장된 코너 스펙 로드(로컬) — 스튜디오가 저장한 ct:<id> 를 상세·빌더에서 재사용. 미저장이면 레이아웃별 초기값.
export function loadCornerSpec(storageKey: string, layout?: string): CardHomeSpec {
  const base = defaultSpec(layout);
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const merged = { ...base, ...JSON.parse(raw) } as CardHomeSpec;
      // 레이아웃과 저장된 item variant가 안 맞으면(가로↔세로) item을 레이아웃 기본값으로.
      const variants = isVertical(layout) ? V_VARIANTS : H_VARIANTS;
      if (!(variants as readonly string[]).includes(merged.item?.variant)) merged.item = base.item;
      // 필수(고정) 항목만 — 선택 항목 제거, 라벨 텍스트 항상 ON(2026-10-28).
      merged.item = normalizeProductItem(merged.item, isVertical(layout));
      merged.buttonText = { ...merged.buttonText, show: true };
      return merged;
    }
  } catch { /* ignore */ }
  return base;
}

// 상세/목록 '미리보기·조합 결과'용 읽기 전용 프리뷰 — 저장된 스펙을 폰 프레임 없이 카드 그대로 렌더(2026-10-19 사용자 요청).
export function CornerSpecPreview({ storageKey, layout }: { storageKey: string; layout?: string }) {
  const [spec, setSpec] = useState<CardHomeSpec | null>(null);
  useEffect(() => { setSpec(loadCornerSpec(storageKey, layout)); }, [storageKey, layout]);
  return (
    <div className="mx-auto w-full max-w-[300px]">
      {spec ? <CardPreview spec={spec} layout={layout} /> : <div className="h-[360px] animate-pulse rounded-[16px] bg-[#f1f3f5]" />}
    </div>
  );
}

// 목록 썸네일 — 상세와 '동일한' CardPreview 를 셀에 꽉 차게(contain) 축소해 넣는다(2026-10-19 사용자 요청).
export function CornerSpecThumb({ storageKey, layout }: { storageKey: string; layout?: string }) {
  const [spec, setSpec] = useState<CardHomeSpec | null>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  useEffect(() => { setSpec(loadCornerSpec(storageKey, layout)); }, [storageKey, layout]);
  useLayoutEffect(() => {
    if (!spec || !outerRef.current || !innerRef.current) return;
    const o = outerRef.current.getBoundingClientRect();
    const h = innerRef.current.scrollHeight || 1; // transform은 scrollHeight에 영향 없음(원본 높이)
    setScale(Math.min(o.width / 300, o.height / h));
  }, [spec]);
  if (!spec) return <div className="h-full w-full animate-pulse rounded bg-[#f1f3f5]" />;
  return (
    <div ref={outerRef} className="flex h-full w-full items-center justify-center overflow-hidden">
      <div ref={innerRef} className="w-[300px] shrink-0 origin-center" style={{ transform: `scale(${scale})` }}>
        <CardPreview spec={spec} layout={layout} />
      </div>
    </div>
  );
}

// 표시 항목 체크박스 한 줄 — 껐다 켜기만(2026-10-27 사용자 요청: 코너 정보/속성을 체크박스 on/off로).
//  고정(disabled)=항상 노출되는 구조 항목. indent=하위 항목.
function ChkRow({ label, checked, onChange, disabled, indent, initial, option }: { label: string; checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean; indent?: boolean; initial?: boolean; option?: boolean }) {
  // 필수=고정(disabled, 항상 노출)·옵션(option, 배너·칩·CTA, 항상 노출·토글)만 노출. 선택 항목은 아예 안 보임(2026-10-28 사용자 요청).
  if (!disabled && !checked && !initial && !option) return null;
  // 2026-10-29(2) 사용자 요청: 체크박스 나열 → '기본 정보'(TRow)·형태(Prop)와 같은 테이블 행. 라벨 셀(회색 150px) + 컨트롤 셀.
  //  라벨 "배너이미지(BannerSrc)" → 국문(ko) + 코드(key) 분리.
  const m = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(label);
  const ko = m ? m[1] : label;
  const key = m ? m[2] : undefined;
  return (
    <div className="grid grid-cols-[150px_minmax(0,1fr)] items-stretch border-b border-[#eef0f3] last:border-b-0">
      <div className={cn('flex min-w-0 flex-col justify-center gap-0.5 bg-[#f8f9fb] px-3.5 py-3', indent && 'pl-6')}>
        <span className="flex flex-wrap items-center gap-1.5 text-[12px] font-medium leading-[1.2] text-[#1a1a1a]">
          {ko}
          {disabled && <span className="rounded-[4px] bg-[#8b949e]/15 px-1 py-[1px] text-[10px] font-semibold text-[#8b949e]">고정</span>}
          {option && <span className="rounded-[4px] bg-[#3617ce]/10 px-1 py-[1px] text-[10px] font-semibold text-[#3617ce]">옵션</span>}
        </span>
        {key && <span className="font-mono text-[10.5px] leading-tight text-[#8b949e]">({key})</span>}
      </div>
      <div className="flex min-w-0 items-center px-3.5 py-3">
        {/* 사용/미사용 라디오 쌍. 고정(disabled)이면 '사용' 선택 + 비활성(못 끔)으로 표기(2026-10-29(2) 사용자 요청). */}
        <div className="flex items-center gap-5">
          <label className={cn('flex items-center gap-1.5 text-[13px]', disabled ? 'cursor-default' : 'cursor-pointer')}>
            <input type="radio" name={`cs_${label}`} checked={checked} disabled={disabled} onChange={() => onChange?.(true)} className="h-4 w-4 accent-[#3617ce]" />
            <span className={cn('whitespace-nowrap', checked ? (disabled ? 'text-slate-400' : 'text-slate-700') : 'text-slate-400')}>사용</span>
          </label>
          <label className={cn('flex items-center gap-1.5 text-[13px]', disabled ? 'cursor-default' : 'cursor-pointer')}>
            <input type="radio" name={`cs_${label}`} checked={!checked} disabled={disabled} onChange={() => onChange?.(false)} className="h-4 w-4 accent-[#3617ce]" />
            <span className={cn('whitespace-nowrap', !checked ? (disabled ? 'text-slate-400' : 'text-slate-700') : 'text-slate-400')}>미사용</span>
          </label>
        </div>
      </div>
    </div>
  );
}

// ── 코너 정보(CardHome) 본문 — 체크박스 on/off 목록 ──────────────
function CornerInfoBody({ spec, onChange }: { spec: CardHomeSpec; onChange: (s: CardHomeSpec) => void; layout?: string }) {
  const set = (p: Partial<CardHomeSpec>) => onChange({ ...spec, ...p });
  return (
    <div>
      {/* 옵션(배너·칩·CTA — 상품형·혜택형 공통). 맨 위에 두고 클릭으로 On/Off(2026-10-28 사용자 확정). */}
      <ChkRow label="배너이미지(BannerSrc)" option checked={spec.bannerOn ?? false} onChange={(v) => set({ bannerOn: v })} />
      <ChkRow label="칩(Chip)" option checked={spec.chipOn ?? false} onChange={(v) => set({ chipOn: v })} />
      <ChkRow label="CTA(CTA)" option checked={spec.cta?.show ?? false} onChange={(v) => set({ cta: { ...(spec.cta ?? { label: 'Label' }), show: v } })} />
      {/* 필수(고정) — 코너 메인 타이틀 · 라벨 텍스트 */}
      <ChkRow label="코너 메인 타이틀(Title)" checked disabled />
      <ChkRow label="라벨 텍스트(ButtonText)" checked disabled />
    </div>
  );
}

// 한 행에 나란히 놓는 사용/미사용 라디오 단위 — 소제목(title) + 라디오 쌍. 비활성이면 회색.
function UseUnit({ title, on, disabled, onPick }: { title: string; on: boolean; disabled?: boolean; onPick: (v: boolean) => void }) {
  const name = `csu_${title}`;
  return (
    <div className="flex items-center gap-2.5">
      <span className={cn('text-[12px] font-medium', disabled ? 'text-slate-300' : 'text-[#454f59]')}>{title}</span>
      <div className="flex items-center gap-4">
        <label className={cn('flex items-center gap-1.5 text-[13px]', disabled ? 'cursor-default' : 'cursor-pointer')}>
          <input type="radio" name={name} checked={on} disabled={disabled} onChange={() => onPick(true)} className="h-4 w-4 accent-[#3617ce]" />
          <span className={cn('whitespace-nowrap', on ? (disabled ? 'text-slate-400' : 'text-slate-700') : 'text-slate-400')}>사용</span>
        </label>
        <label className={cn('flex items-center gap-1.5 text-[13px]', disabled ? 'cursor-default' : 'cursor-pointer')}>
          <input type="radio" name={name} checked={!on} disabled={disabled} onChange={() => onPick(false)} className="h-4 w-4 accent-[#3617ce]" />
          <span className={cn('whitespace-nowrap', !on ? (disabled ? 'text-slate-400' : 'text-slate-700') : 'text-slate-400')}>미사용</span>
        </label>
      </div>
    </div>
  );
}

// ── 코너 속성(CarouselItem 51) 본문 ───────────────────────────
function CarouselItemBody({ s, onChange, layout }: { s: CarouselItemSpec; onChange: (v: CarouselItemSpec) => void; layout?: string }) {
  const set = <K extends keyof CarouselItemSpec,>(k: K, v: CarouselItemSpec[K]) => onChange({ ...s, [k]: v });
  // 세로형(CardHomeItem)=Profile/Data/Barcode, 가로형(CarouselItem)=Small/Medium/Large
  const vertical = isVertical(layout);
  const variantOpts = vertical ? V_VARIANTS : H_VARIANTS;
  const variantVal = (variantOpts as readonly Variant[]).includes(s.variant) ? s.variant : variantOpts[0];
  const pg = s.priceGroup;
  const setPg = (p: Partial<typeof pg>) => set('priceGroup', { ...pg, ...p });
  // 아이템 정보 — 가로형(단말 추천)=가격·할인율·서브텍스트2(고정). 세로형(요금제)=캡션·캡션2(고정) + 가격은 옵션(토글).
  //  세로형은 케이스별로 가격을 쓰기도(넷플릭스 요금제) 안 쓰기도(데이터량 안내) 해서 가격을 옵션으로 둔다(2026-10-28 사용자 요청).
  return (
    <div>
        <Prop name="형태(Variants)" desc={vertical ? '프로필 · 데이터 · 바코드' : '카드 크기'}><Seg value={variantVal} options={variantOpts} onChange={(v) => set('variant', v)} /></Prop>
        <ChkRow label="아이템 이미지(ImageSrc)" checked disabled />
        <ChkRow label="아이템 타이틀(Title)" checked disabled />
        {/* 가격·할인율 — 한 행에 나란히. 가격 off ⇒ 할인율도 off, 할인율 off ⇒ 가격 유지(2026-10-29(2) 사용자 요청). */}
        {!vertical && (
          <div className="grid grid-cols-[150px_minmax(0,1fr)] items-stretch border-b border-[#eef0f3] last:border-b-0">
            <div className="flex min-w-0 flex-col justify-center gap-0.5 bg-[#f8f9fb] px-3.5 py-3">
              <span className="flex flex-wrap items-center gap-1.5 text-[12px] font-medium leading-[1.2] text-[#1a1a1a]">
                가격 · 할인율
                <span className="rounded-[4px] bg-[#3617ce]/10 px-1 py-[1px] text-[10px] font-semibold text-[#3617ce]">옵션</span>
              </span>
              <span className="font-mono text-[10.5px] leading-tight text-[#8b949e]">(Price · DiscountRate)</span>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-x-8 gap-y-2 px-3.5 py-3">
              <UseUnit title="가격" on={pg.show} onPick={(v) => setPg(v ? { show: true } : { show: false, discountRate: { ...pg.discountRate, show: false } })} />
              <UseUnit title="할인율" on={pg.show && pg.discountRate.show} disabled={!pg.show} onPick={(v) => setPg({ discountRate: { ...pg.discountRate, show: v } })} />
            </div>
          </div>
        )}
        {!vertical && <ChkRow label="서브텍스트2(SubText02)" checked disabled />}
        {vertical && <ChkRow label="캡션(Caption01)" checked disabled />}
        {vertical && <ChkRow label="캡션2(Caption02)" checked disabled />}
        {/* 세로형 가격 = 옵션(토글). 켜면 할인율·기간까지. */}
        {vertical && <ChkRow label="가격(TextPriceGroup)" option checked={pg.show} onChange={(v) => setPg({ show: v })} />}
        {vertical && pg.show && <ChkRow label="할인율(Discount)" option indent checked={pg.discountRate.show} onChange={(v) => setPg({ discountRate: { ...pg.discountRate, show: v } })} />}
        {vertical && pg.show && <ChkRow label="기간(Period)" option indent checked={pg.pricePeriod.show} onChange={(v) => setPg({ pricePeriod: { ...pg.pricePeriod, show: v } })} />}
    </div>
  );
}

// ── 탭 버튼 ───────────────────────────────────────────────────
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('-mb-px border-b-2 px-2.5 py-2 text-[13px] font-bold transition', active ? 'border-[#3617ce] text-[#3617ce]' : 'border-transparent text-[#8b949e] hover:text-[#454f59]')}>{children}</button>
  );
}

// ── 스튜디오 — 좌: 고정 미리보기 · 우: 1.기본 정보 + 2.코너 정보/속성(클릭 전환) ──
export function CornerStudio({ storageKey = 'cornerspec-v1', basicInfo, registerResult, contentSource, layout }: { storageKey?: string; basicInfo?: React.ReactNode; registerResult?: React.ReactNode; contentSource?: React.ReactNode; layout?: string }) {
  const [spec, setSpec] = useState<CardHomeSpec>(() => defaultSpec(layout));
  const [sel, setSel] = useState<'card' | 'item'>('card'); // 미리보기 클릭 → 코너 정보(card) / 코너 속성(item)
  useEffect(() => {
    const base = defaultSpec(layout);
    try {
      const raw = localStorage.getItem(storageKey);
      const merged = raw ? { ...base, ...JSON.parse(raw) } as CardHomeSpec : base;
      // 레이아웃(세로/가로)이 저장된 item variant와 안 맞으면 item을 레이아웃 기본값으로 재설정.
      const variants = isVertical(layout) ? V_VARIANTS : H_VARIANTS;
      if (!(variants as readonly string[]).includes(merged.item?.variant)) merged.item = base.item;
      // 필수(고정) 항목만 남게 정규화 — 저장값에 남은 선택 항목 제거. 라벨 텍스트=필수(고정)이므로 항상 ON(2026-10-28).
      merged.item = normalizeProductItem(merged.item, isVertical(layout));
      merged.buttonText = { ...merged.buttonText, show: true };
      setSpec(merged);
    } catch { setSpec(base); }
    setSel('card');
  }, [storageKey, layout]);
  const save = (next: CardHomeSpec) => { setSpec(next); try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ } };
  const reset = () => save(defaultSpec(layout)); // 레이아웃별 초기 설정값으로 되돌리기

  return (
    <div className="flex flex-wrap items-start gap-5">
      {/* 좌측: 미리보기 — 스크롤해도 따라오게 sticky 고정. 카드/컴포넌트 클릭으로 코너 정보↔속성 전환. */}
      <div className="w-[340px] max-w-full shrink-0 self-start lg:sticky lg:top-3">
        <p className="mb-1.5 text-[11px] font-medium text-[#697582]">미리보기 · <b className="text-[#454f59]">카드=코너 정보 · 안쪽 카드=코너 속성</b></p>
        <div className="rounded-[14px] border border-[#dce0e5] bg-[#f3f4f7] p-4">
          <CardPreview spec={spec} sel={sel} onCard={() => setSel('card')} onItem={() => setSel('item')} layout={layout} />
        </div>
        <button type="button" onClick={reset}
          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-[8px] border border-[#dce0e5] bg-white px-3 py-2 text-[12px] font-semibold text-[#454f59] transition hover:bg-[#f8f9fb]">
          <RotateCcw className="h-3.5 w-3.5" /> 초기 설정값으로 돌리기
        </button>
        <p className="mt-2 text-[10.5px] leading-relaxed text-[#8b949e]">코너 유형 = 껍데기 — <b className="text-[#697582]">어떤 요소를 쓸지(Show)·형태</b>를 정의합니다. 값은 샘플이고, 실제 문구·이미지는 빌더/CVM이 채웁니다.</p>
      </div>

      {/* 우측(스크롤): 각 섹션은 SEO 설정 패널처럼 접고 펼치는 Panel. 미리보기 sticky가 끝까지 따라옴 */}
      <div className="min-w-[320px] flex-1 space-y-4">
        {/* 1. 기본 정보 — 헤더 우측에 현재 선택 상태값(유형·레이아웃) 칩 · 본문 테이블 여백 */}
        {basicInfo && (
          <Panel n={1} title="기본 정보" aside={registerResult}>{basicInfo}</Panel>
        )}

        {/* 2. 코너 정보 · 속성 — 하나로 합쳐 '현재 쓰는 항목'만 노출(2026-10-27 사용자 요청). 탭 제거. */}
        <Panel n={2} title="코너 정보 · 속성" hint="이 코너 유형이 쓰는 표시 항목" bodyClass="">
          {/* 코너(카드)=카드 전체에 1개 · 아이템(요소)=리스트에서 반복되는 카드 1개. 같은 '타이틀'이라도 소속이 달라 그룹으로 구분(2026-10-27 사용자 요청). */}
          <div className="space-y-3 p-4">
            <div className="overflow-hidden rounded-[10px] border border-[#dce0e5]">
              <div className="flex items-center gap-1.5 border-b border-[#eef0f3] bg-[#f8f9fb] px-3 py-2">
                <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] bg-[#3617ce]/10 text-[10px] font-bold text-[#3617ce]">코</span>
                <span className="text-[12px] font-bold text-[#454f59]">코너(카드)</span>
                <span className="text-[11px] text-[#8b949e]">· 카드 전체에 1개 (배너·타이틀·버튼)</span>
              </div>
              <CornerInfoBody spec={spec} onChange={save} layout={layout} />
            </div>
            <div className="overflow-hidden rounded-[10px] border border-[#dce0e5]">
              <div className="flex items-center gap-1.5 border-b border-[#eef0f3] bg-[#f8f9fb] px-3 py-2">
                <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] bg-[#00a058]/10 text-[10px] font-bold text-[#00a058]">아</span>
                <span className="text-[12px] font-bold text-[#454f59]">아이템(요소)</span>
                <span className="text-[11px] text-[#8b949e]">· 리스트에서 반복되는 카드 1개 (상품 이미지·타이틀·가격)</span>
              </div>
              <CarouselItemBody s={spec.item} onChange={(ni) => save({ ...spec, item: ni })} layout={layout} />
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
