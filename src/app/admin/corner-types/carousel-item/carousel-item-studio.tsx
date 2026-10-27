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
  buttonText: Toggle<{ label: string }>;
  bannerSrc: string;
  item: CarouselItemSpec;
};

const emptyBadges = () => Array.from({ length: 5 }, (_, i) => ({ show: i < 3, tone: (i === 0 ? 'Positive' : 'Neutral') as Tone, hierarchy: 'Secondary' as Hierarchy, label: 'Label' }));

// 가로형(이미지 244) 초기값 — 노출: 타이틀 · 가격(할인율+가격) · SubText02.
const carousel = (title: string): CarouselItemSpec => ({
  variant: 'Small',
  imageSrc: '',
  title,
  subTitle: { show: false, value: 'SubTitle' },
  priceGroup: { show: true, price: '99,999원', priceCaption: { show: false, value: 'Caption01' }, discountRate: { show: true, value: '99%' }, pricePeriod: { show: false, value: '/Period' } },
  subText01: { show: false, value: 'SubText01' },
  subText02: { show: true, value: 'SubText02' },
  caption: { show: false, value: '5.0', icon: { show: false }, caption02: { show: false, value: '예매율 99.9%' }, caption03: { show: false, value: 'Caption03' } },
  count: { show: false, value: '+2' },
  badgeGroup: { show: false, labelCount: 3, items: emptyBadges() },
});

// 세로형(이미지 265/266 CardHomeItem) 초기값 — TextPriceGroup OFF, Caption ON(무제한 · 69,000원 부터). 가격 미노출.
const cardHomeItem = (title: string): CarouselItemSpec => ({
  variant: 'Profile',
  imageSrc: '',
  title,
  subTitle: { show: false, value: 'SubTitle' },
  priceGroup: { show: false, price: '99,999원', priceCaption: { show: false, value: 'Caption01' }, discountRate: { show: true, value: '99%' }, pricePeriod: { show: false, value: '/Period' } },
  subText01: { show: false, value: 'SubText01' },
  subText02: { show: false, value: 'SubText02' },
  caption: { show: true, value: '무제한', icon: { show: false }, caption02: { show: true, value: '69,000원 부터' }, caption03: { show: false, value: 'Caption03' } },
  count: { show: false, value: '+2' },
  badgeGroup: { show: false, labelCount: 3, items: emptyBadges() },
});

// 레이아웃별 초기 스펙 — 세로형은 CardHomeItem(가격 OFF·캡션), 그 외는 CarouselItem(가격).
function defaultSpec(layout?: string): CardHomeSpec {
  return {
    title: 'Title',
    buttonText: { show: true, label: 'Label' },
    bannerSrc: '',
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
        className="flex w-full items-center gap-2 px-5 py-4 text-left transition hover:bg-[#fafbfc]">
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
function ItemCard({ s, w = 118 }: { s: CarouselItemSpec; w?: number }) {
  const pg = s.priceGroup; const cap = s.caption;
  const line1 = [cap.show ? cap.value : null, cap.caption02.show ? cap.caption02.value : null].filter(Boolean);
  const line2 = [cap.caption03.show ? cap.caption03.value : null].filter(Boolean);
  return (
    <div className="flex shrink-0 flex-col gap-1.5" style={{ width: w }}>
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
  // 배너는 '+배너' 레이아웃(가로형+배너·세로형+배너)만. 그냥 세로형/가로형은 배너 없음(2026-10-19 사용자 요청). layout 미지정(단독 스튜디오)은 배너 유지.
  const hasBanner = layout == null || /배너/.test(layout);
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
      {spec.buttonText.show && <p className="mt-1 px-3 text-[12px] text-[#697582]">{spec.buttonText.label} ›</p>}
      {vertical ? (
        // 세로형 = 세로 리스트(레퍼런스 4건·행 구분선). 실제 노출 개수는 빌더/노출 개수에서 결정, 미리보기는 대표 4건.
        <div className="mt-1 flex flex-col divide-y divide-[#f1f3f5] px-3 pb-2">
          {[0, 1, 2, 3].map((i) => (
            <button key={i} type="button" disabled={ro} onClick={(e) => { e.stopPropagation(); onItem?.(); }} title={ro ? undefined : '카드 안 컴포넌트 = 코너 속성'} className={itemBtnCls()}>
              <ItemRow s={spec.item} />
            </button>
          ))}
        </div>
      ) : (
      <div className="mt-2 flex gap-2 overflow-x-auto px-3 pb-3">
        {[0, 1].map((i) => (
          <button key={i} type="button" disabled={ro} onClick={(e) => { e.stopPropagation(); onItem?.(); }} title={ro ? undefined : '카드 안 컴포넌트 = 코너 속성'} className={itemBtnCls()}>
            <ItemCard s={spec.item} />
          </button>
        ))}
      </div>
      )}
    </div>
  );
}

// 저장된 코너 스펙 로드(로컬) — 스튜디오가 저장한 ct:<id> 를 상세·빌더에서 재사용. 미저장이면 레이아웃별 초기값.
export function loadCornerSpec(storageKey: string, layout?: string): CardHomeSpec {
  const base = defaultSpec(layout);
  try { const raw = localStorage.getItem(storageKey); if (raw) return { ...base, ...JSON.parse(raw) }; } catch { /* ignore */ }
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

// ── 코너 정보(CardHome) 본문 ──────────────────────────────────
function CornerInfoBody({ spec, onChange, layout }: { spec: CardHomeSpec; onChange: (s: CardHomeSpec) => void; layout?: string }) {
  const set = (p: Partial<CardHomeSpec>) => onChange({ ...spec, ...p });
  const hasBanner = layout == null || /배너/.test(layout); // '+배너' 레이아웃만 배너 필드 노출
  // 레이아웃이 쓰는 항목만 고정 노출(2026-10-27 사용자 요청): 표시 토글 제거, show=true 필드만 렌더.
  return (
    <div>
      <Group title="타이틀(Title)">
        <Prop name="타이틀(Title)" desc="타이틀 텍스트"><TextInput value={spec.title} onChange={(v) => set({ title: v })} multiline /></Prop>
      </Group>
      {spec.buttonText.show && (
        <Group title="버튼 텍스트(ButtonText)">
          <Prop name="라벨(Label)" desc="라벨 텍스트"><TextInput value={spec.buttonText.label} onChange={(v) => set({ buttonText: { ...spec.buttonText, label: v } })} /></Prop>
        </Group>
      )}
      {hasBanner && (
        <Group title="배너(BannerSrc)">
          <Prop name="배너 이미지(BannerSrc)" desc="이미지/미디어 경로"><TextInput value={spec.bannerSrc} onChange={(v) => set({ bannerSrc: v })} placeholder="이미지 주소 입력" /></Prop>
        </Group>
      )}
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
  // 레이아웃이 쓰는 항목만 고정 노출(2026-10-27 사용자 요청): 표시 토글 제거, show=true 필드만 렌더.
  const pg = s.priceGroup; const cap = s.caption;
  return (
    <div className="max-h-[520px] overflow-y-auto">
        <Prop name="형태(Variants)" desc={vertical ? '프로필 · 데이터 · 바코드' : '카드 크기'}><Seg value={variantVal} options={variantOpts} onChange={(v) => set('variant', v)} /></Prop>
        <Group title="이미지(ImageSrc)">
          <Prop name="이미지 경로(ImageSrc)" desc="이미지/미디어 경로"><TextInput value={s.imageSrc} onChange={(v) => set('imageSrc', v)} placeholder="이미지 주소 입력" /></Prop>
        </Group>
        <Group title="상품 텍스트(TextProductGroup)">
          <Prop name="타이틀(Title)" desc="타이틀 텍스트"><TextInput value={s.title} onChange={(v) => set('title', v)} /></Prop>
          {s.subTitle.show && (
            <Group title="서브타이틀(SubTitle)" sub>
              <Prop name="서브타이틀(SubTitle)" desc="서브 타이틀 텍스트" sub><TextInput value={s.subTitle.value} onChange={(v) => set('subTitle', { ...s.subTitle, value: v })} /></Prop>
            </Group>
          )}
        </Group>
        {pg.show && (
          <Group title="가격 텍스트(TextPriceGroup)" sub>
            <Prop name="가격(Price)" desc="가격 텍스트" sub><TextInput value={pg.price} onChange={(v) => set('priceGroup', { ...pg, price: v })} /></Prop>
            {pg.priceCaption.show && (
              <Group title="가격 설명(PriceCaption)" sub>
                <Prop name="가격 설명(PriceCaption)" desc="설명 텍스트" sub><TextInput value={pg.priceCaption.value} onChange={(v) => set('priceGroup', { ...pg, priceCaption: { ...pg.priceCaption, value: v } })} /></Prop>
              </Group>
            )}
            {pg.discountRate.show && (
              <Group title="할인율(DiscountRate)" sub>
                <Prop name="할인율(DiscountRate)" desc="할인율 텍스트" sub><TextInput value={pg.discountRate.value} onChange={(v) => set('priceGroup', { ...pg, discountRate: { ...pg.discountRate, value: v } })} /></Prop>
              </Group>
            )}
            {pg.pricePeriod.show && (
              <Group title="가격 기간(PricePeriod)" sub>
                <Prop name="가격 기간(PricePeriod)" desc="기간 텍스트" sub><TextInput value={pg.pricePeriod.value} onChange={(v) => set('priceGroup', { ...pg, pricePeriod: { ...pg.pricePeriod, value: v } })} /></Prop>
              </Group>
            )}
          </Group>
        )}
        {s.subText01.show && (
          <Group title="보조 텍스트1(SubText01)" sub>
            <Prop name="보조 텍스트1(SubText01)" desc="보조 텍스트 (1번째)" sub><TextInput value={s.subText01.value} onChange={(v) => set('subText01', { ...s.subText01, value: v })} /></Prop>
          </Group>
        )}
        {s.subText02.show && (
          <Group title="보조 텍스트2(SubText02)" sub>
            <Prop name="보조 텍스트2(SubText02)" desc="보조 텍스트 (2번째)" sub><TextInput value={s.subText02.value} onChange={(v) => set('subText02', { ...s.subText02, value: v })} /></Prop>
          </Group>
        )}
        {cap.show && (
          <Group title="캡션(Caption)" sub>
            <Prop name="캡션1(Caption01)" desc="캡션 텍스트 (1번째)" sub><TextInput value={cap.value} onChange={(v) => set('caption', { ...cap, value: v })} /></Prop>
            {cap.caption02.show && (
              <Group title="캡션2(Caption02)" sub>
                <Prop name="캡션2(Caption02)" desc="캡션 텍스트 (2번째)" sub><TextInput value={cap.caption02.value} onChange={(v) => set('caption', { ...cap, caption02: { ...cap.caption02, value: v } })} /></Prop>
              </Group>
            )}
            {cap.caption03.show && (
              <Group title="캡션3(Caption03)" sub>
                <Prop name="캡션3(Caption03)" desc="캡션 텍스트 (3번째)" sub><TextInput value={cap.caption03.value} onChange={(v) => set('caption', { ...cap, caption03: { ...cap.caption03, value: v } })} /></Prop>
              </Group>
            )}
          </Group>
        )}
        {s.count.show && (
          <Group title="개수(Count)" sub>
            <Prop name="개수(Count)" desc="개수 텍스트" sub><TextInput value={s.count.value} onChange={(v) => set('count', { ...s.count, value: v })} /></Prop>
          </Group>
        )}
        {s.badgeGroup.show && (
          <Group title="배지(BadgeGroup)" sub>
            {s.badgeGroup.items.map((b, i) => (b.show ? (
              <Group key={i} title={`배지${i + 1}(BadgeItem0${i + 1})`} sub>
                <Prop name="톤(Tone)" desc="색 톤" sub><Seg value={b.tone} options={['Neutral', 'Brand', 'Danger', 'Positive'] as const} onChange={(v) => { const items = [...s.badgeGroup.items]; items[i] = { ...b, tone: v }; set('badgeGroup', { ...s.badgeGroup, items }); }} /></Prop>
                <Prop name="위계(Hierarchy)" desc="강조 단계" sub><Seg value={b.hierarchy} options={['Primary', 'Secondary'] as const} onChange={(v) => { const items = [...s.badgeGroup.items]; items[i] = { ...b, hierarchy: v }; set('badgeGroup', { ...s.badgeGroup, items }); }} /></Prop>
                <Prop name="라벨(Label)" desc="라벨 텍스트" sub><TextInput value={b.label} onChange={(v) => { const items = [...s.badgeGroup.items]; items[i] = { ...b, label: v }; set('badgeGroup', { ...s.badgeGroup, items }); }} /></Prop>
              </Group>
            ) : null))}
          </Group>
        )}
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
    try { const raw = localStorage.getItem(storageKey); setSpec(raw ? { ...base, ...JSON.parse(raw) } : base); } catch { setSpec(base); }
    setSel('card');
  }, [storageKey, layout]);
  const save = (next: CardHomeSpec) => { setSpec(next); try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ } };
  const reset = () => save(defaultSpec(layout)); // 레이아웃별 초기 설정값으로 되돌리기

  return (
    <div className="flex flex-wrap items-start gap-5">
      {/* 좌측: 미리보기 — 스크롤해도 따라오게 sticky 고정. 카드/컴포넌트 클릭으로 코너 정보↔속성 전환. */}
      <div className="w-[300px] max-w-full shrink-0 self-start lg:sticky lg:top-3">
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

        {/* 2. 코너 정보 · 코너 속성 (미리보기 클릭으로 전환, 탭으로도 전환) */}
        <Panel n={2} title="코너 정보 · 속성" hint="미리보기에서 카드/컴포넌트를 눌러 전환" bodyClass="">
          <div className="flex flex-wrap items-center gap-1 border-b border-[#eef0f3] px-3">
            <TabBtn active={sel === 'card'} onClick={() => setSel('card')}>코너 정보</TabBtn>
            <TabBtn active={sel === 'item'} onClick={() => setSel('item')}>코너 속성</TabBtn>
          </div>
          {/* 탭바는 꽉차게, 표는 패널 안쪽으로 여백 + 테두리 */}
          <div className="p-4">
            <div className="overflow-hidden rounded-[10px] border border-[#dce0e5]">
              {sel === 'card' ? <CornerInfoBody spec={spec} onChange={save} layout={layout} /> : <CarouselItemBody s={spec.item} onChange={(ni) => save({ ...spec, item: ni })} layout={layout} />}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
