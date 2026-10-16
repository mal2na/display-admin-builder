'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Image as ImageIcon, RotateCcw } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// 코너 유형(상품형 가로형+배너) 속성 스튜디오. Figma DS CardHome + CarouselItem.
//  구성: 1. 기본 정보(미리보기 + 기본 정보 필드 + 코너 정보=CardHome) · 2. 코너 속성(CarouselItem 51).
//  코너 유형 = 껍데기: 어떤 요소를 쓸지(Show)·형태를 정의. 값은 미리보기용 샘플(실데이터는 빌더/CVM).
// ─────────────────────────────────────────────────────────────

type Variant = 'Small' | 'Medium' | 'Large';
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

// 초기 설정값(이미지 244) — 노출: 타이틀 · 가격(할인율+가격) · SubText02 만 ON, 나머지 OFF.
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
  badgeGroup: { show: false, labelCount: 3, items: Array.from({ length: 5 }, (_, i) => ({ show: i < 3, tone: (i === 0 ? 'Positive' : 'Neutral') as Tone, hierarchy: 'Secondary' as Hierarchy, label: 'Label' })) },
});

const DEFAULT_SPEC: CardHomeSpec = {
  title: 'Title',
  buttonText: { show: true, label: 'Label' },
  bannerSrc: '',
  item: carousel('Title'),
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
        className={cn('flex w-full items-center gap-1.5 border-b border-[#e8ecef] bg-[#f1f3f5] px-3.5 py-2 text-[12px] font-semibold text-[#1a1a1a]', sub && 'pl-5')}>
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
    <section className="overflow-hidden rounded-[16px] border border-[#e8ecef] bg-white">
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

// ── 미리보기: CardHome(전체 카드) — 배너 풀블리드 · 클릭으로 코너 정보/속성 전환(읽기 전용이면 비활성) ──
function CardPreview({ spec, sel, onCard, onItem }: { spec: CardHomeSpec; sel?: 'card' | 'item'; onCard?: () => void; onItem?: () => void }) {
  const ro = !onCard && !onItem; // 읽기 전용(상세 미리보기)
  return (
    <div onClick={onCard} title={ro ? undefined : '카드 전체 = 코너 정보'}
      className={cn('overflow-hidden rounded-[16px] border-2 bg-white transition', ro ? 'border-[#e8ecef]' : cn('cursor-pointer', sel === 'card' ? 'border-[#3617ce]' : 'border-[#e8ecef] hover:border-[#c4c9cf]'))}>
      {spec.bannerSrc ? (
        /* eslint-disable-next-line @next/next/no-img-element */ <img src={spec.bannerSrc} alt="banner" className="h-[160px] w-full object-cover" />
      ) : (
        <div className="flex h-[160px] w-full items-center justify-center bg-[#eceef1] text-[11px] text-[#b3b9c0]">Banner</div>
      )}
      <p className="whitespace-pre-line px-3 pt-3 text-[15px] font-bold leading-tight text-[#1a1a1a]">{spec.title}</p>
      {spec.buttonText.show && <p className="mt-1 px-3 text-[12px] text-[#697582]">{spec.buttonText.label} ›</p>}
      <div className="mt-2 flex gap-2 overflow-x-auto px-3 pb-3">
        {[0, 1].map((i) => (
          <button key={i} type="button" disabled={ro} onClick={(e) => { e.stopPropagation(); onItem?.(); }} title={ro ? undefined : '카드 안 컴포넌트 = 코너 속성'}
            className={cn('shrink-0 rounded-[12px] border-2 p-0.5 text-left transition', ro ? 'border-transparent' : cn('cursor-pointer', sel === 'item' ? 'border-[#3617ce]' : 'border-transparent hover:border-[#c4c9cf]'))}>
            <ItemCard s={spec.item} />
          </button>
        ))}
      </div>
    </div>
  );
}

// 저장된 코너 스펙 로드(로컬) — 스튜디오가 저장한 ct:<id> 를 상세·빌더에서 재사용.
export function loadCornerSpec(storageKey: string): CardHomeSpec {
  try { const raw = localStorage.getItem(storageKey); if (raw) return { ...DEFAULT_SPEC, ...JSON.parse(raw) }; } catch { /* ignore */ }
  return DEFAULT_SPEC;
}

// 상세 '미리보기·조합 결과'용 읽기 전용 프리뷰 — 저장된 스펙을 폰 프레임 안에 렌더.
export function CornerSpecPreview({ storageKey }: { storageKey: string }) {
  const [spec, setSpec] = useState<CardHomeSpec | null>(null);
  useEffect(() => { setSpec(loadCornerSpec(storageKey)); }, [storageKey]);
  return (
    <div className="mx-auto w-full max-w-[300px] rounded-[26px] border-[7px] border-[#1a1a1a] bg-white p-2 shadow-sm">
      {spec ? <CardPreview spec={spec} /> : <div className="h-[360px] animate-pulse rounded-[16px] bg-[#f1f3f5]" />}
    </div>
  );
}

// ── 코너 정보(CardHome) 본문 ──────────────────────────────────
function CornerInfoBody({ spec, onChange }: { spec: CardHomeSpec; onChange: (s: CardHomeSpec) => void }) {
  const set = (p: Partial<CardHomeSpec>) => onChange({ ...spec, ...p });
  return (
    <div>
      <Group title="타이틀(Title)">
        <Prop name="타이틀(Title)" desc="타이틀 텍스트"><TextInput value={spec.title} onChange={(v) => set({ title: v })} multiline /></Prop>
      </Group>
      <Group title="버튼 텍스트(ButtonText)">
        <Prop name="버튼 표시(ShowButtonText)" desc="표시 여부"><Switch on={spec.buttonText.show} onChange={(v) => set({ buttonText: { ...spec.buttonText, show: v } })} /></Prop>
        <Prop name="라벨(Label)" desc="라벨 텍스트"><TextInput value={spec.buttonText.label} onChange={(v) => set({ buttonText: { ...spec.buttonText, label: v } })} /></Prop>
      </Group>
      <Group title="배너(BannerSrc)">
        <Prop name="배너 이미지(BannerSrc)" desc="이미지/미디어 경로"><TextInput value={spec.bannerSrc} onChange={(v) => set({ bannerSrc: v })} placeholder="이미지 주소 입력" /></Prop>
      </Group>
    </div>
  );
}

// ── 코너 속성(CarouselItem 51) 본문 ───────────────────────────
function CarouselItemBody({ s, onChange }: { s: CarouselItemSpec; onChange: (v: CarouselItemSpec) => void }) {
  const set = <K extends keyof CarouselItemSpec,>(k: K, v: CarouselItemSpec[K]) => onChange({ ...s, [k]: v });
  return (
    <div className="max-h-[520px] overflow-y-auto">
        <Prop name="형태(Variants)" desc="카드 크기"><Seg value={s.variant} options={['Small', 'Medium', 'Large'] as const} onChange={(v) => set('variant', v)} /></Prop>
        <Group title="이미지(ImageSrc)">
          <Prop name="이미지 경로(ImageSrc)" desc="이미지/미디어 경로"><TextInput value={s.imageSrc} onChange={(v) => set('imageSrc', v)} placeholder="이미지 주소 입력" /></Prop>
        </Group>
        <Group title="상품 텍스트(TextProductGroup)">
          <Prop name="타이틀(Title)" desc="타이틀 텍스트"><TextInput value={s.title} onChange={(v) => set('title', v)} /></Prop>
          <Group title="서브타이틀(SubTitle)" sub>
            <Prop name="서브타이틀 표시(ShowSubTitle)" desc="표시 여부" sub><Switch on={s.subTitle.show} onChange={(v) => set('subTitle', { ...s.subTitle, show: v })} /></Prop>
            <Prop name="서브타이틀(SubTitle)" desc="서브 타이틀 텍스트" sub><TextInput value={s.subTitle.value} onChange={(v) => set('subTitle', { ...s.subTitle, value: v })} /></Prop>
          </Group>
        </Group>
        <Group title="가격 텍스트(TextPriceGroup)" sub>
          <Prop name="가격 표시(ShowTextPriceGroup)" desc="표시 여부" sub><Switch on={s.priceGroup.show} onChange={(v) => set('priceGroup', { ...s.priceGroup, show: v })} /></Prop>
          <Prop name="가격(Price)" desc="가격 텍스트" sub><TextInput value={s.priceGroup.price} onChange={(v) => set('priceGroup', { ...s.priceGroup, price: v })} /></Prop>
          <Group title="가격 설명(PriceCaption)" sub>
            <Prop name="가격 설명 표시(ShowPriceCaption)" desc="표시 여부" sub><Switch on={s.priceGroup.priceCaption.show} onChange={(v) => set('priceGroup', { ...s.priceGroup, priceCaption: { ...s.priceGroup.priceCaption, show: v } })} /></Prop>
            <Prop name="가격 설명(PriceCaption)" desc="설명 텍스트" sub><TextInput value={s.priceGroup.priceCaption.value} onChange={(v) => set('priceGroup', { ...s.priceGroup, priceCaption: { ...s.priceGroup.priceCaption, value: v } })} /></Prop>
          </Group>
          <Group title="할인율(DiscountRate)" sub>
            <Prop name="할인율 표시(ShowDiscountRate)" desc="표시 여부" sub><Switch on={s.priceGroup.discountRate.show} onChange={(v) => set('priceGroup', { ...s.priceGroup, discountRate: { ...s.priceGroup.discountRate, show: v } })} /></Prop>
            <Prop name="할인율(DiscountRate)" desc="할인율 텍스트" sub><TextInput value={s.priceGroup.discountRate.value} onChange={(v) => set('priceGroup', { ...s.priceGroup, discountRate: { ...s.priceGroup.discountRate, value: v } })} /></Prop>
          </Group>
          <Group title="가격 기간(PricePeriod)" sub>
            <Prop name="기간 표시(ShowPricePeriod)" desc="표시 여부" sub><Switch on={s.priceGroup.pricePeriod.show} onChange={(v) => set('priceGroup', { ...s.priceGroup, pricePeriod: { ...s.priceGroup.pricePeriod, show: v } })} /></Prop>
            <Prop name="가격 기간(PricePeriod)" desc="기간 텍스트" sub><TextInput value={s.priceGroup.pricePeriod.value} onChange={(v) => set('priceGroup', { ...s.priceGroup, pricePeriod: { ...s.priceGroup.pricePeriod, value: v } })} /></Prop>
          </Group>
        </Group>
        <Group title="보조 텍스트1(SubText01)" sub>
          <Prop name="표시(ShowSubText01)" desc="표시 여부" sub><Switch on={s.subText01.show} onChange={(v) => set('subText01', { ...s.subText01, show: v })} /></Prop>
          <Prop name="보조 텍스트1(SubText01)" desc="보조 텍스트 (1번째)" sub><TextInput value={s.subText01.value} onChange={(v) => set('subText01', { ...s.subText01, value: v })} /></Prop>
        </Group>
        <Group title="보조 텍스트2(SubText02)" sub>
          <Prop name="표시(ShowSubText02)" desc="표시 여부" sub><Switch on={s.subText02.show} onChange={(v) => set('subText02', { ...s.subText02, show: v })} /></Prop>
          <Prop name="보조 텍스트2(SubText02)" desc="보조 텍스트 (2번째)" sub><TextInput value={s.subText02.value} onChange={(v) => set('subText02', { ...s.subText02, value: v })} /></Prop>
        </Group>
        <Group title="캡션(Caption)" sub>
          <Prop name="캡션 표시(ShowCaption)" desc="표시 여부" sub><Switch on={s.caption.show} onChange={(v) => set('caption', { ...s.caption, show: v })} /></Prop>
          <Prop name="캡션1(Caption01)" desc="캡션 텍스트 (1번째)" sub><TextInput value={s.caption.value} onChange={(v) => set('caption', { ...s.caption, value: v })} /></Prop>
          <Group title="캡션 아이콘(Caption01IconItem)" sub>
            <Prop name="아이콘 표시(ShowCaption01IconItem)" desc="표시 여부" sub><Switch on={s.caption.icon.show} onChange={(v) => set('caption', { ...s.caption, icon: { show: v } })} /></Prop>
          </Group>
          <Group title="캡션2(Caption02)" sub>
            <Prop name="표시(ShowCaption02)" desc="표시 여부" sub><Switch on={s.caption.caption02.show} onChange={(v) => set('caption', { ...s.caption, caption02: { ...s.caption.caption02, show: v } })} /></Prop>
            <Prop name="캡션2(Caption02)" desc="캡션 텍스트 (2번째)" sub><TextInput value={s.caption.caption02.value} onChange={(v) => set('caption', { ...s.caption, caption02: { ...s.caption.caption02, value: v } })} /></Prop>
          </Group>
          <Group title="캡션3(Caption03)" sub>
            <Prop name="표시(ShowCaption03)" desc="표시 여부" sub><Switch on={s.caption.caption03.show} onChange={(v) => set('caption', { ...s.caption, caption03: { ...s.caption.caption03, show: v } })} /></Prop>
            <Prop name="캡션3(Caption03)" desc="캡션 텍스트 (3번째)" sub><TextInput value={s.caption.caption03.value} onChange={(v) => set('caption', { ...s.caption, caption03: { ...s.caption.caption03, value: v } })} /></Prop>
          </Group>
        </Group>
        <Group title="개수(Count)" sub>
          <Prop name="개수 표시(ShowCount)" desc="표시 여부" sub><Switch on={s.count.show} onChange={(v) => set('count', { ...s.count, show: v })} /></Prop>
          <Prop name="개수(Count)" desc="개수 텍스트" sub><TextInput value={s.count.value} onChange={(v) => set('count', { ...s.count, value: v })} /></Prop>
        </Group>
        <Group title="배지(BadgeGroup)" sub>
          <Prop name="배지 표시(ShowBadgeGroup)" desc="표시 여부" sub><Switch on={s.badgeGroup.show} onChange={(v) => set('badgeGroup', { ...s.badgeGroup, show: v })} /></Prop>
          {s.badgeGroup.items.map((b, i) => (
            <Group key={i} title={`배지${i + 1}(BadgeItem0${i + 1})`} sub>
              <Prop name={`배지${i + 1} 표시(ShowBadgeItem)`} desc="표시 여부" sub><Switch on={b.show} onChange={(v) => { const items = [...s.badgeGroup.items]; items[i] = { ...b, show: v }; set('badgeGroup', { ...s.badgeGroup, items }); }} /></Prop>
              <Prop name="톤(Tone)" desc="색 톤" sub><Seg value={b.tone} options={['Neutral', 'Brand', 'Danger', 'Positive'] as const} onChange={(v) => { const items = [...s.badgeGroup.items]; items[i] = { ...b, tone: v }; set('badgeGroup', { ...s.badgeGroup, items }); }} /></Prop>
              <Prop name="위계(Hierarchy)" desc="강조 단계" sub><Seg value={b.hierarchy} options={['Primary', 'Secondary'] as const} onChange={(v) => { const items = [...s.badgeGroup.items]; items[i] = { ...b, hierarchy: v }; set('badgeGroup', { ...s.badgeGroup, items }); }} /></Prop>
              <Prop name="라벨(Label)" desc="라벨 텍스트" sub><TextInput value={b.label} onChange={(v) => { const items = [...s.badgeGroup.items]; items[i] = { ...b, label: v }; set('badgeGroup', { ...s.badgeGroup, items }); }} /></Prop>
            </Group>
          ))}
        </Group>
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
export function CornerStudio({ storageKey = 'cornerspec-v1', basicInfo, registerResult, contentSource }: { storageKey?: string; basicInfo?: React.ReactNode; registerResult?: React.ReactNode; contentSource?: React.ReactNode }) {
  const [spec, setSpec] = useState<CardHomeSpec>(DEFAULT_SPEC);
  const [sel, setSel] = useState<'card' | 'item'>('card'); // 미리보기 클릭 → 코너 정보(card) / 코너 속성(item)
  useEffect(() => {
    try { const raw = localStorage.getItem(storageKey); setSpec(raw ? { ...DEFAULT_SPEC, ...JSON.parse(raw) } : DEFAULT_SPEC); } catch { /* ignore */ }
    setSel('card');
  }, [storageKey]);
  const save = (next: CardHomeSpec) => { setSpec(next); try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ } };
  const reset = () => save(DEFAULT_SPEC); // 초기 설정값으로 되돌리기

  return (
    <div className="flex flex-wrap items-start gap-5">
      {/* 좌측: 미리보기 — 스크롤해도 따라오게 sticky 고정. 카드/컴포넌트 클릭으로 코너 정보↔속성 전환. */}
      <div className="w-[300px] max-w-full shrink-0 self-start lg:sticky lg:top-3">
        <p className="mb-1.5 text-[11px] font-medium text-[#697582]">미리보기 · <b className="text-[#454f59]">카드=코너 정보 · 안쪽 카드=코너 속성</b></p>
        <div className="rounded-[14px] border border-[#e8ecef] bg-[#f3f4f7] p-4">
          <CardPreview spec={spec} sel={sel} onCard={() => setSel('card')} onItem={() => setSel('item')} />
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
            <div className="overflow-hidden rounded-[10px] border border-[#e8ecef]">
              {sel === 'card' ? <CornerInfoBody spec={spec} onChange={save} /> : <CarouselItemBody s={spec.item} onChange={(ni) => save({ ...spec, item: ni })} />}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
