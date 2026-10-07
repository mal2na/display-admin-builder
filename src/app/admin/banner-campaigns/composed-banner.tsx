'use client';

import { Image as ImageIcon } from 'lucide-react';

// 직접 만들기(조립형) 배너의 편집 가능한 속성
export type ComposeFields = {
  bgColor?: string;
  bgColor2?: string;
  bgType?: string; // 'solid' | 'gradient'
  title?: string;
  subtitle?: string;
  titleColor?: string;
  subColor?: string;
  titleSize?: string; // 'sm' | 'md' | 'lg'
  align?: string; // 'left' | 'center'
  imagePos?: string; // 'left' | 'right' | 'top' | 'bottom'
  imgSize?: string; // 'sm' | 'md' | 'lg'
  imgShape?: string; // 'square' | 'circle'
  badgeText?: string;
  badgeColor?: string;
  ctaText?: string;
  ctaColor?: string;
  rightImageUrl?: string;
};

export function composeBg(f: ComposeFields): string {
  const c1 = f.bgColor || '#EEF1F8';
  if (f.bgType === 'gradient') return `linear-gradient(135deg, ${c1}, ${f.bgColor2 || '#DDE3F0'})`;
  return c1;
}

const IMG_PX: Record<string, number> = { sm: 36, md: 52, lg: 76 };
const TITLE_CLS: Record<string, string> = { sm: 'text-[11px]', md: 'text-[14px]', lg: 'text-[18px]', xl: 'text-[22px]' };

// 폼 미리보기와 상세 화면이 동일하게 쓰는 렌더러
// preview=true(폼): 비어있는 제목에 자리표시자 노출 / false(실제): 값이 있을 때만 렌더
export function ComposedBanner({ f, width, height, preview = false }: { f: ComposeFields; width: number; height: number; preview?: boolean }) {
  const pos = f.imagePos || 'right';
  const vertical = pos === 'top' || pos === 'bottom';
  // 좌정렬이 표준 — 가운데는 align='center'일 때만(세로 배치도 자동 센터 금지). 미리보기가 text-center 컨테이너
  //  안에 있어도 상속으로 가운데 밀리지 않게, 아래 textBlock에 text-left를 '명시'한다(2026-10-07 사용자 요청).
  const center = f.align === 'center';
  const basePx = IMG_PX[f.imgSize ?? 'md'] ?? 52;
  const imgPx = Math.min(basePx, Math.max(20, (vertical ? height / 2 : height) - 16));
  const titleCls = TITLE_CLS[f.titleSize ?? 'md'] ?? 'text-[13px]';
  const circle = f.imgShape === 'circle';
  const compact = height < 96; // 낮은 규격은 CTA 숨김

  const titleText = f.title || (preview ? '배너 타이틀' : '');

  const imageEl = f.rightImageUrl
    ? /* eslint-disable-next-line @next/next/no-img-element */
      <img src={f.rightImageUrl} alt="" className={'shrink-0 object-contain ' + (circle ? 'rounded-full' : '')} style={{ width: imgPx, height: imgPx }} />
    : <div className={'flex shrink-0 items-center justify-center bg-white/50 text-slate-300 ' + (circle ? 'rounded-full' : 'rounded-lg')} style={{ width: imgPx, height: imgPx }}><ImageIcon className="h-1/2 w-1/2" /></div>;

  const textBlock = (
    <div className={'min-w-0 ' + (vertical ? 'w-full ' : 'flex-1 ') + (center ? 'text-center' : 'text-left')}>
      {f.badgeText && <span className="mb-1 inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold text-white" style={{ backgroundColor: f.badgeColor || '#4F46E5' }}>{f.badgeText}</span>}
      {titleText && <p className={'line-clamp-2 whitespace-pre-line font-bold leading-snug ' + titleCls} style={{ color: f.titleColor || '#0F172A' }}>{titleText}</p>}
      {f.subtitle && <p className="mt-1 line-clamp-1 text-[11px]" style={{ color: f.subColor || '#64748B' }}>{f.subtitle}</p>}
      {f.ctaText && !compact && (
        <span className="mt-2 inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold text-white" style={{ backgroundColor: f.ctaColor || '#4F46E5' }}>{f.ctaText}</span>
      )}
    </div>
  );

  // 배너 라운드 = 레퍼런스(T우주 앱) 카드와 동일 28px, 단 작은 썸네일에선 과하지 않게 높이에 비례(최대 28). 전시화면 카드 radius와 통일.
  const radius = Math.min(28, Math.round(height / 4));
  return (
    <div
      className={'flex overflow-hidden px-4 shadow-sm ring-1 ring-white ' + (vertical ? 'flex-col items-center justify-center gap-2 py-3' : 'items-center gap-3')}
      style={{ background: composeBg(f), width, height, borderRadius: radius }}
    >
      {(pos === 'left' || pos === 'top') && imageEl}
      {textBlock}
      {(pos === 'right' || pos === 'bottom') && imageEl}
    </div>
  );
}
