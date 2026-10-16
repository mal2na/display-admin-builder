'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronLeft, Image as ImageIcon } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// 코너 유형 관리(상품형 가로형+배너) 컴포넌트 속성 스튜디오 — Figma DS 2단 구조.
//  · 카드 전체 클릭 = CardHome(PROPERTIES 18) + 슬롯 구성(스택·CarouselItem 리스트)
//  · 카드 안 컴포넌트 클릭 = CarouselItem(PROPERTIES 51) 상세
//  코너 유형 = 껍데기: 어떤 요소를 쓸지(Show)·형태를 정의. 값은 미리보기용 샘플(실데이터는 빌더/CVM).
// ─────────────────────────────────────────────────────────────

type Variant = 'Small' | 'Medium' | 'Large';
type Tone = 'Neutral' | 'Brand' | 'Danger' | 'Positive';
type Hierarchy = 'Primary' | 'Secondary';
type Toggle<T = Record<string, never>> = { show: boolean } & T;
type BadgeItem = { tone: Tone; hierarchy: Hierarchy; label: string };

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

type CardVariant = 'Task' | 'My' | 'Contents';
export type CardHomeSpec = {
  variant: CardVariant;
  title: string;
  buttonText: Toggle<{ label: string }>;
  bannerSrc: string;
  slot: { direction: '세로' | '가로' | '그리드'; gap: string; scroll: boolean };
  items: CarouselItemSpec[];
};

const carousel = (title: string): CarouselItemSpec => ({
  variant: 'Small',
  imageSrc: '',
  title,
  subTitle: { show: false, value: 'SubTitle' },
  priceGroup: {
    show: true,
    price: '99,999원',
    priceCaption: { show: true, value: 'Caption01' },
    discountRate: { show: true, value: '99%' },
    pricePeriod: { show: false, value: '/Period' },
  },
  subText01: { show: false, value: 'SubText01' },
  subText02: { show: true, value: 'SubText02' },
  caption: {
    show: true,
    value: '5.0',
    icon: { show: false },
    caption02: { show: true, value: '예매율 99.9%' },
    caption03: { show: true, value: 'Caption03' },
  },
  count: { show: true, value: '+2' },
  badgeGroup: {
    show: true,
    labelCount: 3,
    items: Array.from({ length: 5 }, (_, i) => ({ tone: (i === 0 ? 'Positive' : 'Neutral') as Tone, hierarchy: 'Secondary' as Hierarchy, label: 'Label' })),
  },
});

const DEFAULT_CARDHOME: CardHomeSpec = {
  variant: 'Contents',
  title: '최근 본 아이폰을\n혜택으로 만나보세요.',
  buttonText: { show: true, label: '단말기 추천' },
  bannerSrc: '',
  slot: { direction: '가로', gap: 'Gap 2 · 8px', scroll: true },
  items: [carousel('iPhone 20 Air'), carousel('iPhone 17e'), carousel('iPhone 16')],
};

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
  if (multiline) return (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2}
      className="w-full resize-none rounded-[6px] border border-[#dce0e5] bg-white px-2.5 py-1.5 text-[12px] text-[#1a1a1a] outline-none focus:border-[#3617ce]" />
  );
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="h-[30px] w-full rounded-[6px] border border-[#dce0e5] bg-white px-2.5 text-[12px] text-[#1a1a1a] outline-none focus:border-[#3617ce]" />
  );
}
function Prop({ name, desc, sub, children }: { name: string; desc?: string; sub?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2.5">
      <div className={cn('flex min-w-0 flex-1 flex-col', sub && 'pl-2')}>
        <span className="truncate text-[12px] font-medium text-[#1a1a1a]">{name}</span>
        {desc && <span className="text-[10.5px] leading-tight text-[#8b949e]">{desc}</span>}
      </div>
      <div className="flex shrink-0 items-center justify-end" style={{ minWidth: 150 }}>{children}</div>
    </div>
  );
}
function Group({ title, sub, children, defaultOpen = true }: { title: string; sub?: boolean; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)}
        className={cn('flex w-full items-center gap-1.5 border-y border-[#eef0f3] bg-[#f8f9fb] px-3 py-2 text-[12px] font-semibold text-[#1a1a1a]', sub && 'pl-5')}>
        {sub && <span className="text-[#b3b9c0]">└</span>}
        <span className="flex-1 text-left">{title}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-[#8b949e] transition', !open && '-rotate-90')} />
      </button>
      {open && <div className="divide-y divide-[#f1f3f5]">{children}</div>}
    </div>
  );
}

// ── 미리보기: CarouselItem 카드 ───────────────────────────────
function ItemCard({ s, w = 132 }: { s: CarouselItemSpec; w?: number }) {
  const pg = s.priceGroup; const cap = s.caption;
  const line1 = [cap.show ? cap.value : null, cap.caption02.show ? cap.caption02.value : null].filter(Boolean);
  const line2 = [cap.caption03.show ? cap.caption03.value : null].filter(Boolean);
  return (
    <div className="flex shrink-0 flex-col gap-1.5" style={{ width: w }}>
      <div className="flex aspect-square w-full items-center justify-center rounded-[12px] bg-[#eceef1] text-[#b3b9c0]">
        {s.imageSrc ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={s.imageSrc} alt={s.title} className="h-full w-full rounded-[12px] object-cover" /> : <ImageIcon className="h-6 w-6" />}
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
            {s.badgeGroup.items.slice(0, s.badgeGroup.labelCount).map((b, i) => (
              <span key={i} className={cn('rounded-[4px] px-1.5 py-0.5 text-[10px] font-semibold', b.hierarchy === 'Primary' ? TONE[b.tone].solid : TONE[b.tone].soft)}>{b.label}</span>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}

// ── 미리보기: CardHome(전체 카드) ─────────────────────────────
function CardHomePreview({ spec, sel, onCard, onItem }: { spec: CardHomeSpec; sel: 'card' | number; onCard: () => void; onItem: (i: number) => void }) {
  return (
    <div onClick={onCard} className={cn('cursor-pointer overflow-hidden rounded-[16px] border-2 bg-white transition', sel === 'card' ? 'border-[#3617ce]' : 'border-transparent hover:border-[#dce0e5]')}>
      {/* 배너 — 카드 가로폭에 꽉 차게(full-bleed), 패딩 없이 상단 전체 */}
      {spec.bannerSrc ? (
        /* eslint-disable-next-line @next/next/no-img-element */ <img src={spec.bannerSrc} alt="banner" className="h-[120px] w-full object-cover" />
      ) : (
        <div className="flex h-[120px] w-full items-center justify-center bg-[#eceef1] text-[11px] text-[#b3b9c0]">Banner</div>
      )}
      <p className="whitespace-pre-line px-3 pt-3 text-[15px] font-bold leading-tight text-[#1a1a1a]">{spec.title}</p>
      {spec.buttonText.show && <p className="mt-1 px-3 text-[12px] text-[#697582]">{spec.buttonText.label} ›</p>}
      <div className={cn('mt-2 flex gap-2 px-3 pb-3', spec.slot.direction === '세로' ? 'flex-col' : spec.slot.direction === '그리드' ? 'flex-wrap' : 'overflow-x-auto')}>
        {spec.items.map((it, i) => (
          <button key={i} type="button" onClick={(e) => { e.stopPropagation(); onItem(i); }}
            className={cn('rounded-[12px] border-2 p-0.5 text-left transition', sel === i ? 'border-[#3617ce]' : 'border-transparent hover:border-[#c4c9cf]')}>
            <ItemCard s={it} w={spec.slot.direction === '세로' ? 240 : 120} />
          </button>
        ))}
      </div>
    </div>
  );
}

// ── CardHome 인스펙터(18) ─────────────────────────────────────
//  슬롯 구성은 제거(2026-10-16 사용자 요청). CarouselItem 편집은 미리보기에서 카드를 눌러 진입한다.
function CardHomeInspector({ spec, onChange }: { spec: CardHomeSpec; onChange: (s: CardHomeSpec) => void }) {
  const set = (p: Partial<CardHomeSpec>) => onChange({ ...spec, ...p });
  return (
    <div className="flex flex-col overflow-hidden rounded-[12px] border border-[#e8ecef] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#eef0f3] px-3 py-2.5">
        <span className="text-[13px] font-bold text-[#1a1a1a]">CardHome</span>
        <span className="text-[10.5px] font-semibold tracking-wide text-[#8b949e]">PROPERTIES</span>
      </div>
      <div>
        {/* Variants · ListSlot · BannerSlot 제거(2026-10-16 사용자 요청) */}
        <Group title="Title">
          <Prop name="Title" desc="타이틀 텍스트"><TextInput value={spec.title} onChange={(v) => set({ title: v })} multiline /></Prop>
        </Group>
        <Group title="ButtonText">
          <Prop name="ShowButtonText" desc="ButtonText 표시 여부"><Switch on={spec.buttonText.show} onChange={(v) => set({ buttonText: { ...spec.buttonText, show: v } })} /></Prop>
          <Prop name="Label" desc="라벨 텍스트"><TextInput value={spec.buttonText.label} onChange={(v) => set({ buttonText: { ...spec.buttonText, label: v } })} /></Prop>
        </Group>
        <Group title="BannerSrc">
          <Prop name="BannerSrc" desc="Banner 이미지/미디어 경로"><TextInput value={spec.bannerSrc} onChange={(v) => set({ bannerSrc: v })} placeholder="이미지 주소 입력" /></Prop>
        </Group>
      </div>
    </div>
  );
}

// ── CarouselItem 인스펙터(51) ─────────────────────────────────
function CarouselItemInspector({ s, index, onChange, onBack }: { s: CarouselItemSpec; index: number; onChange: (v: CarouselItemSpec) => void; onBack: () => void }) {
  const set = <K extends keyof CarouselItemSpec>(k: K, v: CarouselItemSpec[K]) => onChange({ ...s, [k]: v });
  return (
    <div className="flex flex-col overflow-hidden rounded-[12px] border border-[#e8ecef] bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-[#eef0f3] px-3 py-2.5">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#697582] hover:text-[#3617ce]"><ChevronLeft className="h-3.5 w-3.5" /> CardHome</button>
        <span className="text-[#c4c9cf]">/</span>
        <span className="text-[13px] font-bold text-[#1a1a1a]">CarouselItem {String(index + 1).padStart(2, '0')}</span>
        <span className="ml-auto text-[10.5px] font-semibold tracking-wide text-[#8b949e]">PROPERTIES (51)</span>
      </div>
      <div className="max-h-[560px] overflow-y-auto">
        <Prop name="Variants" desc="형태 변환"><Seg value={s.variant} options={['Small', 'Medium', 'Large'] as const} onChange={(v) => set('variant', v)} /></Prop>
        <Group title="ImageSrc">
          <Prop name="ImageSrc" desc="Image 이미지/미디어 경로"><TextInput value={s.imageSrc} onChange={(v) => set('imageSrc', v)} placeholder="이미지 주소 입력" /></Prop>
        </Group>
        <Group title="TextProductGroup">
          <Prop name="Title" desc="타이틀 텍스트"><TextInput value={s.title} onChange={(v) => set('title', v)} /></Prop>
          <Group title="SubTitle" sub>
            <Prop name="ShowSubTitle" desc="SubTitle 표시 여부" sub><Switch on={s.subTitle.show} onChange={(v) => set('subTitle', { ...s.subTitle, show: v })} /></Prop>
            <Prop name="SubTitle" desc="Sub 타이틀 텍스트" sub><TextInput value={s.subTitle.value} onChange={(v) => set('subTitle', { ...s.subTitle, value: v })} /></Prop>
          </Group>
        </Group>
        <Group title="TextPriceGroup" sub>
          <Prop name="ShowTextPriceGroup" desc="TextPriceGroup 표시 여부" sub><Switch on={s.priceGroup.show} onChange={(v) => set('priceGroup', { ...s.priceGroup, show: v })} /></Prop>
          <Prop name="Price" sub><TextInput value={s.priceGroup.price} onChange={(v) => set('priceGroup', { ...s.priceGroup, price: v })} /></Prop>
          <Group title="PriceCaption" sub>
            <Prop name="ShowPriceCaption" desc="PriceCaption 표시 여부" sub><Switch on={s.priceGroup.priceCaption.show} onChange={(v) => set('priceGroup', { ...s.priceGroup, priceCaption: { ...s.priceGroup.priceCaption, show: v } })} /></Prop>
            <Prop name="PriceCaption" sub><TextInput value={s.priceGroup.priceCaption.value} onChange={(v) => set('priceGroup', { ...s.priceGroup, priceCaption: { ...s.priceGroup.priceCaption, value: v } })} /></Prop>
          </Group>
          <Group title="DiscountRate" sub>
            <Prop name="ShowDiscountRate" desc="DiscountRate 표시 여부" sub><Switch on={s.priceGroup.discountRate.show} onChange={(v) => set('priceGroup', { ...s.priceGroup, discountRate: { ...s.priceGroup.discountRate, show: v } })} /></Prop>
            <Prop name="DiscountRate" sub><TextInput value={s.priceGroup.discountRate.value} onChange={(v) => set('priceGroup', { ...s.priceGroup, discountRate: { ...s.priceGroup.discountRate, value: v } })} /></Prop>
          </Group>
          <Group title="PricePeriod" sub>
            <Prop name="ShowPricePeriod" desc="PricePeriod 표시 여부" sub><Switch on={s.priceGroup.pricePeriod.show} onChange={(v) => set('priceGroup', { ...s.priceGroup, pricePeriod: { ...s.priceGroup.pricePeriod, show: v } })} /></Prop>
            <Prop name="PricePeriod" sub><TextInput value={s.priceGroup.pricePeriod.value} onChange={(v) => set('priceGroup', { ...s.priceGroup, pricePeriod: { ...s.priceGroup.pricePeriod, value: v } })} /></Prop>
          </Group>
        </Group>
        <Group title="SubText01" sub>
          <Prop name="ShowSubText01" desc="SubText 표시 여부 (1번째)" sub><Switch on={s.subText01.show} onChange={(v) => set('subText01', { ...s.subText01, show: v })} /></Prop>
          <Prop name="SubText01" desc="Sub 텍스트 (1번째)" sub><TextInput value={s.subText01.value} onChange={(v) => set('subText01', { ...s.subText01, value: v })} /></Prop>
        </Group>
        <Group title="SubText02" sub>
          <Prop name="ShowSubText02" desc="SubText 표시 여부 (2번째)" sub><Switch on={s.subText02.show} onChange={(v) => set('subText02', { ...s.subText02, show: v })} /></Prop>
          <Prop name="SubText02" desc="Sub 텍스트 (2번째)" sub><TextInput value={s.subText02.value} onChange={(v) => set('subText02', { ...s.subText02, value: v })} /></Prop>
        </Group>
        <Group title="Caption" sub>
          <Prop name="ShowCaption" desc="Caption 표시 여부" sub><Switch on={s.caption.show} onChange={(v) => set('caption', { ...s.caption, show: v })} /></Prop>
          <Prop name="Caption01" desc="캡션 텍스트 (1번째)" sub><TextInput value={s.caption.value} onChange={(v) => set('caption', { ...s.caption, value: v })} /></Prop>
          <Group title="Caption01IconItem" sub>
            <Prop name="ShowCaption01IconItem" desc="Caption01IconItem 표시 여부" sub><Switch on={s.caption.icon.show} onChange={(v) => set('caption', { ...s.caption, icon: { show: v } })} /></Prop>
          </Group>
          <Group title="Caption02" sub>
            <Prop name="ShowCaption02" desc="Caption 표시 여부 (2번째)" sub><Switch on={s.caption.caption02.show} onChange={(v) => set('caption', { ...s.caption, caption02: { ...s.caption.caption02, show: v } })} /></Prop>
            <Prop name="Caption02" desc="캡션 텍스트 (2번째)" sub><TextInput value={s.caption.caption02.value} onChange={(v) => set('caption', { ...s.caption, caption02: { ...s.caption.caption02, value: v } })} /></Prop>
          </Group>
          <Group title="Caption03" sub>
            <Prop name="ShowCaption03" desc="Caption 표시 여부 (3번째)" sub><Switch on={s.caption.caption03.show} onChange={(v) => set('caption', { ...s.caption, caption03: { ...s.caption.caption03, show: v } })} /></Prop>
            <Prop name="Caption03" desc="캡션 텍스트 (3번째)" sub><TextInput value={s.caption.caption03.value} onChange={(v) => set('caption', { ...s.caption, caption03: { ...s.caption.caption03, value: v } })} /></Prop>
          </Group>
        </Group>
        <Group title="Count" sub>
          <Prop name="ShowCount" desc="Count 표시 여부" sub><Switch on={s.count.show} onChange={(v) => set('count', { ...s.count, show: v })} /></Prop>
          <Prop name="Count" desc="개수" sub><TextInput value={s.count.value} onChange={(v) => set('count', { ...s.count, value: v })} /></Prop>
        </Group>
        <Group title="BadgeGroup" sub>
          <Prop name="ShowBadgeGroup" desc="BadgeGroup 표시 여부" sub><Switch on={s.badgeGroup.show} onChange={(v) => set('badgeGroup', { ...s.badgeGroup, show: v })} /></Prop>
          <Prop name="Label 개수" sub><Seg value={`${s.badgeGroup.labelCount}Label` as `${number}Label`} options={['1Label', '2Label', '3Label', '4Label', '5Label'] as const} onChange={(v) => set('badgeGroup', { ...s.badgeGroup, labelCount: Number(v[0]) })} /></Prop>
          {s.badgeGroup.items.slice(0, s.badgeGroup.labelCount).map((b, i) => (
            <Group key={i} title={`BadgeItem0${i + 1}`} sub>
              <Prop name="Tone" sub><Seg value={b.tone} options={['Neutral', 'Brand', 'Danger', 'Positive'] as const} onChange={(v) => { const items = [...s.badgeGroup.items]; items[i] = { ...b, tone: v }; set('badgeGroup', { ...s.badgeGroup, items }); }} /></Prop>
              <Prop name="Hierarchy" sub><Seg value={b.hierarchy} options={['Primary', 'Secondary'] as const} onChange={(v) => { const items = [...s.badgeGroup.items]; items[i] = { ...b, hierarchy: v }; set('badgeGroup', { ...s.badgeGroup, items }); }} /></Prop>
              <Prop name="Label" desc={`BadgeItem0${i + 1} 라벨 텍스트`} sub><TextInput value={b.label} onChange={(v) => { const items = [...s.badgeGroup.items]; items[i] = { ...b, label: v }; set('badgeGroup', { ...s.badgeGroup, items }); }} /></Prop>
            </Group>
          ))}
        </Group>
      </div>
    </div>
  );
}

// ── 스튜디오(2단: CardHome ↔ CarouselItem) ────────────────────
export function CarouselItemStudio({ storageKey = 'cardhome-spec-v1' }: { storageKey?: string }) {
  const [spec, setSpec] = useState<CardHomeSpec>(DEFAULT_CARDHOME);
  const [sel, setSel] = useState<'card' | number>('card');
  useEffect(() => {
    try { const raw = localStorage.getItem(storageKey); setSpec(raw ? { ...DEFAULT_CARDHOME, ...JSON.parse(raw) } : DEFAULT_CARDHOME); } catch { /* ignore */ }
    setSel('card');
  }, [storageKey]);
  const save = (next: CardHomeSpec) => { setSpec(next); try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ } };
  const idx = typeof sel === 'number' && sel < spec.items.length ? sel : null;

  return (
    <div className="flex flex-wrap items-start gap-5">
      {/* 미리보기 — 카드 전체 vs 내부 컴포넌트 선택 */}
      <div className="w-[300px] max-w-full shrink-0">
        <p className="mb-1.5 text-[11px] font-medium text-[#697582]">미리보기 · {idx !== null ? `CarouselItem ${idx + 1}` : 'CardHome'} <span className="text-[#b3b9c0]">· 카드=전체, 안쪽 카드=컴포넌트</span></p>
        <div className="rounded-[14px] border border-[#e8ecef] bg-[#f3f4f7] p-4">
          <CardHomePreview spec={spec} sel={sel} onCard={() => setSel('card')} onItem={(i) => setSel(i)} />
        </div>
        <p className="mt-2 text-[10.5px] leading-relaxed text-[#8b949e]">코너 유형 = 껍데기 — 여기선 <b className="text-[#697582]">어떤 요소를 쓸지(Show)·형태·구성</b>을 정의합니다. 값은 샘플이고, 실제 문구·이미지는 빌더/CVM이 채웁니다.</p>
      </div>

      {/* 인스펙터 — 선택에 따라 CardHome / CarouselItem */}
      <div className="min-w-[320px] flex-1">
        {idx !== null ? (
          <CarouselItemInspector s={spec.items[idx]} index={idx} onBack={() => setSel('card')} onChange={(ni) => { const items = [...spec.items]; items[idx] = ni; save({ ...spec, items }); }} />
        ) : (
          <CardHomeInspector spec={spec} onChange={save} />
        )}
      </div>
    </div>
  );
}
