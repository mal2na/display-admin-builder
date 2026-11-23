// 코너 미리보기(풀셋 목업) — 기존 코너 유형 관리 상세의 '껍데기 가이드'와 동일하게 필드 코드 placeholder로 1벌만 보여준다(2026-11-23).
//  필드 코드: Banner · CornerTitle · SubTitle · ButtonText · ItemTitle · SubText · Price(99% 99,999원) · CTA · Barcode …
//  크기 고정(uniform)이라 리스트에서 행마다 들쭉날쭉하지 않는다. 리스트=sm, 상세=lg.
import { ImageIcon } from 'lucide-react';
import type { Slot } from '@/lib/benefit-corner-types';

// 가격만 값으로(그 외 필드는 영문 코드) — preview-text-field-codes 규격.
function Price({ lg }: { lg: boolean }) {
  return <div className={lg ? 'text-[12px]' : 'text-[10px]'}><span className="font-bold text-[#3617ce]">99%</span> <b className="text-[#1a1a1a]">99,999원</b></div>;
}

function ItemRow({ lg }: { lg: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`flex shrink-0 items-center justify-center rounded-full bg-[#f1f3f5] text-[#c4c9cf] ${lg ? 'h-8 w-8' : 'h-6 w-6'}`}><ImageIcon className={lg ? 'h-4 w-4' : 'h-3 w-3'} /></span>
      <div className="min-w-0 flex-1">
        <div className={`font-semibold text-[#454f59] ${lg ? 'text-[12px]' : 'text-[10px]'}`}>ItemTitle</div>
        <div className={`text-[#b3b9c0] ${lg ? 'text-[11px]' : 'text-[9px]'}`}>SubText</div>
      </div>
      <Price lg={lg} />
    </div>
  );
}

function ItemCard({ lg }: { lg: boolean }) {
  return (
    <div className={`shrink-0 ${lg ? 'w-24' : 'w-16'}`}>
      <div className={`flex items-center justify-center rounded-lg bg-[#f1f3f5] text-[#c4c9cf] ${lg ? 'h-20' : 'h-12'}`}><ImageIcon className={lg ? 'h-5 w-5' : 'h-4 w-4'} /></div>
      <div className={`mt-1 font-semibold text-[#454f59] ${lg ? 'text-[11px]' : 'text-[9px]'}`}>ItemTitle</div>
      <Price lg={lg} />
      <div className={`text-[#b3b9c0] ${lg ? 'text-[10px]' : 'text-[8px]'}`}>SubText</div>
    </div>
  );
}

function SlotBlock({ slot, lg }: { slot: Slot; lg: boolean }) {
  switch (slot.kind) {
    case 'banner':
      return <div className={`flex items-center justify-center rounded-lg bg-gradient-to-b from-[#c3c8d2] to-[#eef0f6] text-white/70 ${lg ? 'h-16' : 'h-10'}`}><span className={`inline-flex items-center gap-1 rounded bg-black/15 px-1.5 py-0.5 font-semibold ${lg ? 'text-[11px]' : 'text-[9px]'}`}><ImageIcon className={lg ? 'h-3.5 w-3.5' : 'h-3 w-3'} />Banner</span></div>;
    case 'title':
      return <div><div className={`font-bold text-[#1a1a1a] ${lg ? 'text-[15px]' : 'text-[12px]'}`}>CornerTitle</div><div className={`text-[#b3b9c0] ${lg ? 'text-[12px]' : 'text-[10px]'}`}>SubTitle</div></div>;
    case 'buttonText':
      return <div className={`font-medium text-[#8b949e] ${lg ? 'text-[12px]' : 'text-[10px]'}`}>ButtonText ›</div>;
    case 'items':
      return <div className={lg ? 'space-y-2.5' : 'space-y-1.5'}>{Array.from({ length: lg ? 3 : 2 }).map((_, i) => <ItemRow key={i} lg={lg} />)}</div>;
    case 'reward':
      // 보상 아이템 — 가격 없이 [아이콘 + 보상명/조건 + 우측 받기 버튼]
      return (
        <div className="flex items-center gap-2">
          <span className={`flex shrink-0 items-center justify-center rounded-full bg-[#f1f3f5] text-[#c4c9cf] ${lg ? 'h-8 w-8' : 'h-6 w-6'}`}><ImageIcon className={lg ? 'h-4 w-4' : 'h-3 w-3'} /></span>
          <div className="min-w-0 flex-1">
            <div className={`font-semibold text-[#454f59] ${lg ? 'text-[12px]' : 'text-[10px]'}`}>ItemTitle</div>
            <div className={`text-[#b3b9c0] ${lg ? 'text-[11px]' : 'text-[9px]'}`}>SubText</div>
          </div>
          <span className={`shrink-0 rounded-full bg-[#eef0ff] font-semibold text-[#3617ce] ${lg ? 'px-2.5 py-1 text-[10px]' : 'px-2 py-0.5 text-[9px]'}`}>받기</span>
        </div>
      );
    case 'carousel':
      return <div className={`flex overflow-hidden ${lg ? 'gap-2.5' : 'gap-1.5'}`}>{Array.from({ length: 3 }).map((_, i) => <ItemCard key={i} lg={lg} />)}</div>;
    case 'cta':
      return <div className={`rounded-lg border border-[#dce0e5] text-center font-medium text-[#8b949e] ${lg ? 'py-2 text-[12px]' : 'py-1.5 text-[10px]'}`}>CTA ›</div>;
    case 'barcode':
      return <div className="rounded-lg bg-[#f8f9fb] p-2"><div className={lg ? 'h-10' : 'h-7'} style={{ backgroundImage: 'repeating-linear-gradient(90deg,#1a1a1a 0 2px,transparent 2px 5px)' }} /><div className={`mt-1 text-center tracking-[0.2em] text-[#b3b9c0] ${lg ? 'text-[10px]' : 'text-[8px]'}`}>BarcodeValue</div></div>;
    case 'progress':
      return <div><div className="h-2 overflow-hidden rounded-full bg-[#e8ecef]"><div className="h-2 w-1/2 rounded-full bg-[#3617ce]" /></div><div className={`mt-1 flex justify-between text-[#b3b9c0] ${lg ? 'text-[10px]' : 'text-[8px]'}`}><span>0P</span><span>100P</span><span>200P</span><span>300P</span></div></div>;
    case 'checks':
      return <div className="flex justify-between">{['월', '화', '수', '목', '금', '토', '일'].map((d, i) => <div key={d} className="flex flex-col items-center gap-0.5"><span className={`rounded-full ${lg ? 'h-5 w-5' : 'h-3.5 w-3.5'} ${i < 4 ? 'bg-[#3617ce]' : 'bg-[#e8ecef]'}`} /><span className={`text-[#b3b9c0] ${lg ? 'text-[9px]' : 'text-[7px]'}`}>{d}</span></div>)}</div>;
    case 'metrics':
      return <div className={lg ? 'space-y-2' : 'space-y-1'}>{['잔여 혜택', '예정 혜택'].map((m) => <div key={m} className="flex items-center justify-between"><span className={`text-[#697582] ${lg ? 'text-[12px]' : 'text-[10px]'}`}>Label</span><span className={`font-bold text-[#1a1a1a] ${lg ? 'text-[12px]' : 'text-[10px]'}`}>00</span></div>)}</div>;
    default:
      return null;
  }
}

export function FullsetPreview({ slots, size = 'lg' }: { slots: Slot[]; size?: 'sm' | 'lg' }) {
  const lg = size === 'lg';
  return (
    <div
      className={`mx-auto flex flex-col overflow-hidden rounded-[18px] bg-white shadow-[0_3px_14px_rgba(20,22,40,0.10)] ${lg ? 'w-[300px] gap-3 p-4' : 'w-[150px] gap-2 p-3'}`}
    >
      {slots.map((s, i) => <SlotBlock key={i} slot={s} lg={lg} />)}
    </div>
  );
}
