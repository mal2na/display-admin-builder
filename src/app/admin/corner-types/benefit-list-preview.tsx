// 혜택형 리스트형 공식 프리뷰(SB DSP_03) — 이벤트/미션/혜택프로그램/이용지원 4종의 필드 코드 목업(2026-11-24 사용자 제공 디자인).
//  배너 + (추천 맥락 헤더) + {타이틀} + {Label}> + 카테고리 {Label}×5 + 아이템 3(아이콘+내용, 미션=우측 버튼) + 스와이프 점 + ⓘ Information + {Label} CTA.
import { ImageIcon, Scan, Info } from 'lucide-react';

export type BenefitKind = '이벤트' | '미션' | '혜택 프로그램' | '이용 지원';

const CFG: Record<BenefitKind, { context: boolean; circle: boolean; itemBtn: boolean }> = {
  '이벤트': { context: true, circle: false, itemBtn: false },
  '미션': { context: false, circle: true, itemBtn: true },
  '혜택 프로그램': { context: true, circle: true, itemBtn: false },
  '이용 지원': { context: false, circle: false, itemBtn: false },
};

export function kindOfMid(mid: string): BenefitKind | null {
  if (mid === '이벤트형') return '이벤트';
  if (mid === '미션형') return '미션';
  if (mid === '혜택프로그램형') return '혜택 프로그램';
  if (mid === '이용지원형') return '이용 지원';
  return null;
}

export function BenefitListPreview({ kind, size = 'lg' }: { kind: BenefitKind; size?: 'sm' | 'lg' }) {
  const lg = size === 'lg';
  const cfg = CFG[kind];
  const t = (l: string, s: string) => (lg ? l : s);

  return (
    <div className={`mx-auto overflow-hidden rounded-[18px] bg-white shadow-[0_3px_14px_rgba(20,22,40,0.10)] ${lg ? 'w-[300px]' : 'w-[150px]'}`}>
      {/* 상단 배너 이미지 */}
      <div className={`bg-gradient-to-b from-[#c6c3d8] via-[#dedbea] to-white ${lg ? 'h-[92px]' : 'h-[46px]'}`} />

      <div className={lg ? 'px-4 pb-4 pt-1' : 'px-2.5 pb-2.5 pt-1'}>
        {/* 추천 맥락 헤더 — 이벤트/혜택프로그램만 */}
        {cfg.context && (
          <div className={`mb-1 flex items-center gap-1 text-[#8b949e] ${t('text-[11px]', 'text-[8px]')}`}>
            <Scan className={lg ? 'h-3.5 w-3.5' : 'h-2.5 w-2.5'} /><span>{'{추천 맥락 헤더(검색, 매장방문)}'}</span>
          </div>
        )}

        {/* 타이틀(2줄) + 버튼 텍스트 */}
        <div className={`font-bold leading-tight text-[#1a1a1a] ${t('text-[15px]', 'text-[11px]')}`}>
          <div>{`{${kind} 타이틀`}</div>
          <div>{`${kind} 타이틀}`}</div>
        </div>
        <div className={`mt-0.5 text-[#8b949e] ${t('text-[12px]', 'text-[9px]')}`}>{'{Label}'} ›</div>

        {/* 카테고리 칩 */}
        <div className={`mt-2 flex gap-1 overflow-hidden ${t('text-[11px]', 'text-[8px]')}`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={`shrink-0 rounded-full border ${lg ? 'px-2.5 py-1' : 'px-1.5 py-0.5'} ${i === 0 ? 'border-[#1a1a1a] font-bold text-[#1a1a1a]' : 'border-[#e3e6ea] text-[#b3b9c0]'}`}>{'{Label}'}</span>
          ))}
        </div>

        {/* 아이템 리스트 (3) */}
        <div className={`mt-2 ${lg ? 'space-y-2' : 'space-y-1'}`}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={`flex shrink-0 items-center justify-center bg-[#f1f3f5] text-[#c4c9cf] ${cfg.circle ? 'rounded-full' : 'rounded-lg'} ${lg ? 'h-9 w-9' : 'h-6 w-6'}`}><ImageIcon className={lg ? 'h-4 w-4' : 'h-3 w-3'} /></span>
              <div className="min-w-0 flex-1">
                <div className={`font-bold text-[#1a1a1a] ${t('text-[13px]', 'text-[9px]')}`}>{`{${kind} 내용}`}</div>
                <div className={`text-[#b3b9c0] ${t('text-[12px]', 'text-[8px]')}`}>{`{${kind} 내용}`}</div>
              </div>
              {cfg.itemBtn && <span className={`shrink-0 rounded-full bg-[#eceef5] font-semibold text-[#697582] ${lg ? 'px-2.5 py-1 text-[11px]' : 'px-1.5 py-0.5 text-[8px]'}`}>{'{Label}'}</span>}
            </div>
          ))}
        </div>

        {/* 스와이프 인디케이터 */}
        <div className="mt-2 flex items-center justify-center gap-1">
          <span className={`rounded-full bg-[#1a1a1a] ${lg ? 'h-1.5 w-4' : 'h-1 w-3'}`} />
          <span className={`rounded-full bg-[#d7dbe0] ${lg ? 'h-1.5 w-1.5' : 'h-1 w-1'}`} />
          <span className={`rounded-full bg-[#d7dbe0] ${lg ? 'h-1.5 w-1.5' : 'h-1 w-1'}`} />
        </div>

        {/* Information 성격 디스크립션 */}
        <div className={`mt-2 flex items-center gap-1.5 font-medium text-[#3617ce] ${t('text-[13px]', 'text-[8px]')}`}>
          <Info className={lg ? 'h-4 w-4' : 'h-2.5 w-2.5'} /><span>{'{Information 성격 디스크립션}'}</span>
        </div>

        {/* 하단 CTA */}
        <div className={`mt-2 rounded-lg border border-[#dce0e5] text-center font-bold text-[#1a1a1a] ${lg ? 'py-2.5 text-[13px]' : 'py-1.5 text-[9px]'}`}>{'{Label}'}</div>
      </div>
    </div>
  );
}
