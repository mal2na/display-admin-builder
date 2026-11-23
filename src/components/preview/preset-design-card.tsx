// SB 프리셋(NC-DSP-001-2 v0.37 JSON) 설계도를 '그대로' 렌더하는 카드 — 혜택 프리셋 미리보기(2026-11-19 사용자 요청).
//  스캐폴드/재구성이 아니라 SB 익스포트 JSON(src/lib/benefit-preset-designs.json)의 컴포넌트 트리(DisplayCard + 슬롯)를 1:1로 그린다.
//  지원 컴포넌트: DisplayCard(루트) · DisplayCardItem(혜택/상품/바코드) · CellRightTable · DividerInset · CellDescription · Button · IndicatorItem
//   · CellTitle · GraphBarHorizontalPeriod · DisplayCardTitle · DisplayCardRewardProgress · CellProduct · CarouselItem(가로 스크롤).
import * as React from 'react';
import { ChevronRight, Info, MapPin } from 'lucide-react';
import designs from '@/lib/benefit-preset-designs.json';
import presetNames from '@/lib/preset-names.json';

type Props = Record<string, unknown>;
type Node = { cid: string; props: Props | null; children: Node[] };
type Design = { name: string; tree: Node };

const DESIGNS = designs as Record<string, Design>;
const PRESET_NAMES = presetNames as Record<string, string>;
export function hasPresetDesign(id?: string | null): boolean {
  return !!id && !!DESIGNS[id];
}
// 신규 67 프리셋 이름(preset-names.json) 우선, 없으면 구 설계도 JSON. 접두어([..][혜택]) 제거.
export function presetDesignName(id?: string | null): string {
  if (!id) return '';
  const raw = PRESET_NAMES[id] ?? DESIGNS[id]?.name ?? '';
  return raw.replace(/^\[[^\]]*\]\s*\[혜택\]\s*/, '').replace(/^\[혜택\]\s*/, '');
}

const s = (p: Props | null, k: string): string => { const v = p?.[k]; return typeof v === 'string' ? v : ''; };
const on = (v: unknown): boolean => v === 'true' || v === true;

// 혜택/상품 카드(DisplayCardItem) — [썸네일] [타이틀 / 서브타이틀]. variant=barcode 는 하단 바코드 줄무늬.
function CardItem({ p }: { p: Props }) {
  const isBarcode = s(p, 'variant') === 'barcode';
  const img = s(p, 'imageSrc');
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[14px] bg-[#eef0f6]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold leading-[1.35] text-[#1a1a1a]">{s(p, 'title') || '혜택 내용'}</p>
          {on(p.showSubTitle) && s(p, 'subTitle') && <p className="truncate text-[13px] leading-[1.35] text-[#8b949e]">{s(p, 'subTitle')}</p>}
        </div>
      </div>
      {isBarcode && (
        <div className="pt-1">
          <div className="h-11 w-full bg-[repeating-linear-gradient(90deg,#0b1324_0,#0b1324_2.5px,transparent_2.5px,transparent_5px)]" />
          <div className="mt-2 flex items-center justify-between text-[12px] text-[#8b949e]"><span className="tracking-[2px]">1234 4561 1506 4932</span><span className="font-semibold text-[#3617ce]">19:58</span></div>
        </div>
      )}
    </div>
  );
}

// 가로 스크롤 상품 카드(CarouselItem 연속) — 기기 지원금 등.
function Carousel({ items }: { items: Node[] }) {
  return (
    <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
      {items.map((n, i) => (
        <div key={i} className="w-[128px] shrink-0">
          <div className="mb-2 aspect-square w-full rounded-[14px] bg-[#eef0f6]" />
          <p className="text-[13px] font-bold leading-tight text-[#1a1a1a]">{s(n.props, 'title')}</p>
          <p className="mt-1 text-[12px] text-[#3617ce]">{s(n.props, 'priceCaption')}</p>
          <p className="text-[13px] font-bold text-[#1a1a1a]">99% <span className="font-semibold">99,999원</span></p>
        </div>
      ))}
    </div>
  );
}

// 가로 막대 그래프(기간/잔여) — 데이터 잔여 등. 설계값(startLabel·endLabel·markerLabel) 그대로.
function GraphBar({ p }: { p: Props }) {
  return (
    <div className="pt-1">
      <div className="mb-1 text-right text-[12px] font-bold text-[#3617ce]">{s(p, 'markerLabel') || '{남은 데이터}GB'}</div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[#eef0f6]"><div className="h-full w-1/3 rounded-full bg-[#3617ce]" /></div>
      <div className="mt-1.5 flex justify-between text-[12px] text-[#8b949e]"><span>{s(p, 'startLabel') || '전체'}</span><span>{s(p, 'endLabel') || '잔여'}</span></div>
    </div>
  );
}

// 출석 보상 진행바(DisplayCardRewardProgress) — 단계형(0일/10일/20일/한달).
function RewardProgress() {
  const steps = [['0일', '0P'], ['10일', '100P'], ['20일', '200P'], ['한달', '300P']];
  return (
    <div className="pt-1">
      <div className="mb-2 text-[15px] font-bold text-[#3617ce]">출석 <span>18</span>일차</div>
      <div className="relative h-2 w-full rounded-full bg-[#eef0f6]"><div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[#6a4bff] to-[#3617ce]" /></div>
      <div className="mt-1.5 flex justify-between text-[11px] text-[#8b949e]">{steps.map(([d, pt]) => <span key={d} className="text-center leading-tight">{d}<br /><b className="text-[#454f59]">{pt}</b></span>)}</div>
    </div>
  );
}

function Child({ n, siblings, idx }: { n: Node; siblings: Node[]; idx: number }) {
  const p = n.props ?? {};
  switch (n.cid) {
    case 'DisplayCardItem':
      return <CardItem p={p} />;
    case 'CellRightTable':
      return (
        <div className="flex items-center justify-between py-0.5">
          <span className="text-[14px] text-[#697582]">{s(p, 'title')}</span>
          <span className="text-[14px] font-semibold tabular-nums text-[#1a1a1a]">{s(p, 'description')}</span>
        </div>
      );
    case 'DividerInset':
      return <div className="my-1 border-t border-dashed border-[#e8ecef]" />;
    case 'CellDescription':
      return (
        <div className="flex items-start gap-1.5 text-[#3617ce]"><Info className="mt-[1px] h-3.5 w-3.5 shrink-0" /><span className="text-[12px] leading-[1.4]">{s(p, 'description')}</span></div>
      );
    case 'CellTitle':
      return (
        <div className="pt-1"><p className="text-[15px] font-bold text-[#1a1a1a]">{s(p, 'title')}</p>{s(p, 'subTitle') && <p className="text-[12px] text-[#8b949e]">{s(p, 'subTitle')}</p>}</div>
      );
    case 'CellProduct':
      return (
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 shrink-0 rounded-[14px] bg-[#eef0f6]" />
          <div className="min-w-0 flex-1"><p className="text-[15px] font-bold text-[#1a1a1a]">{s(p, 'title')}</p><p className="text-[12px] text-[#8b949e]">{s(p, 'subTitle')}</p><p className="mt-0.5 text-[15px] font-bold text-[#1a1a1a]">{s(p, 'price')}</p></div>
        </div>
      );
    case 'GraphBarHorizontalPeriod':
      return <GraphBar p={p} />;
    case 'DisplayCardRewardProgress':
      return <RewardProgress />;
    case 'DisplayCardTitle':
      return null; // 진행바(RewardProgress)가 제목을 품음
    case 'CarouselItem': {
      if (idx > 0 && siblings[idx - 1]?.cid === 'CarouselItem') return null; // 첫 CarouselItem에서 묶어 렌더
      const group: Node[] = [];
      for (let i = idx; i < siblings.length && siblings[i].cid === 'CarouselItem'; i++) group.push(siblings[i]);
      return <Carousel items={group} />;
    }
    case 'Button':
      return <button type="button" className="mt-1 h-[42px] w-full rounded-[12px] border border-[#c4c9cf] text-[14px] font-semibold text-[#454f59]">{s(p, 'label') || 'CTA'}</button>;
    case 'IndicatorItem': {
      const cnt = Math.max(1, Math.min(6, Number(p.count) || 3));
      return <div className="flex justify-center gap-1 pt-1">{Array.from({ length: cnt }).map((_, i) => <span key={i} className={i === 0 ? 'h-1.5 w-4 rounded-full bg-[#3617ce]' : 'h-1.5 w-1.5 rounded-full bg-[#dce0e5]'} />)}</div>;
    }
    default:
      return null;
  }
}

/** SB 프리셋 설계도(DisplayCard)를 그대로 렌더. designId 예: 'CN-DSP-0019'. */
export function PresetDesignCard({ designId }: { designId: string }) {
  const design = DESIGNS[designId];
  if (!design) return null;
  const { tree } = design;
  const p = tree.props ?? {};
  const hasBanner = s(p, 'variant') === 'contentWithBanner';
  const hasHeaderItem = on(p.showDisplayCardHeaderItem);
  const kids = tree.children;

  return (
    <section className="overflow-hidden rounded-[22px] bg-white shadow-[0_2px_10px_rgba(34,34,34,0.06)]">
      {hasBanner && <div className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-[#eef0ff] to-[#f8f9fb] text-[12px] font-medium text-[#8b949e]">Banner</div>}
      <div className="flex flex-col gap-3 px-5 py-5">
        {hasHeaderItem && s(p, 'headerItemDescription') && (
          <div className="flex items-center gap-1 text-[12px] font-medium text-[#3617ce]"><MapPin className="h-3.5 w-3.5" />{s(p, 'headerItemDescription')}</div>
        )}
        <h3 className="whitespace-pre-line text-[17px] font-bold leading-[1.4] text-[#1a1a1a]">{s(p, 'title')}</h3>
        <span className="flex w-fit items-center gap-0.5 text-[13px] text-[#697582]">{s(p, 'label') || 'Label'} <ChevronRight className="h-3.5 w-3.5" /></span>
        <div className="flex flex-col gap-2.5 pt-1">
          {kids.map((c, i) => <Child key={i} n={c} siblings={kids} idx={i} />)}
        </div>
      </div>
    </section>
  );
}
