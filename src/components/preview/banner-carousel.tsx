'use client';

// 배너 캐러셀 (미리보기) — 한 배너형 코너의 여러 배너를 노출.
//  · swipe: 좌우 수동 스와이프(스냅) + 인디케이터
//  · auto : 위 + 자동 슬라이드(intervalSec 간격, loop면 끝에서 처음으로)
//  1장이면 옵션과 무관하게 단일 노출. 실서비스에선 이 옵션대로 FO가 렌더한다.
//  배너 카드는 blocks.tsx에서 렌더해 items로 넘긴다(순환 import 방지).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { BannerOptions } from '@/lib/banner-options';

export function BannerCarousel({ items, options }: { items: ReactNode[]; options: BannerOptions }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const count = items.length;

  // 현재 보이는 배너(스크롤 위치 기준)로 인디케이터를 갱신
  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const w = el.clientWidth || 1;
    setActive(Math.round(el.scrollLeft / w));
  };

  const goTo = (i: number, smooth = true) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
  };

  // 자동 슬라이드 — mode='auto' & 2장 이상일 때만. 간격마다 다음 장(끝이면 loop 여부에 따라 처음/정지).
  useEffect(() => {
    if (options.mode !== 'auto' || count < 2) return;
    const id = setInterval(() => {
      setActive((cur) => {
        const next = cur + 1;
        if (next >= count) {
          if (!options.loop) return cur; // 루프 아니면 마지막에서 멈춤
          goTo(0);
          return 0;
        }
        goTo(next);
        return next;
      });
    }, options.intervalSec * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.mode, options.intervalSec, options.loop, count]);

  if (count === 0) return null;
  if (count === 1) return <>{items[0]}</>;

  return (
    <div>
      <div
        ref={scroller}
        onScroll={onScroll}
        className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        {items.map((node, i) => (
          <div key={i} className="w-[92%] shrink-0 snap-center">
            {node}
          </div>
        ))}
      </div>
      {options.showIndicator && (
        <div className="mt-2 flex items-center justify-center gap-1.5">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1}번째 배너로`}
              onClick={() => { setActive(i); goTo(i); }}
              className={cn('h-1.5 rounded-full transition-all', i === active ? 'w-4 bg-indigo-500' : 'w-1.5 bg-slate-300')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
