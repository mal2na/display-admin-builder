'use client';

import { useState } from 'react';
import { ImageIcon } from 'lucide-react';

/**
 * 미리보기용 이미지 — 실제 파일이 없으면(404) 깨진 이미지 대신 깔끔한 영역 + 슬러그 라벨을 보여준다.
 * 라벨은 파일명 슬러그(brand-baemin 등)를 우선 사용해 '자리 표시'임을 명확히 한다.
 */
// 브랜드 로고 폴백 팔레트 — 실제 로고 파일이 없을 때 브랜드 색/이니셜 타일로(저작권 안전·회색 여백 방지, 2026-11-09 사용자 요청).
const BRAND_PALETTE = ['#3617ce', '#e4572e', '#1d7874', '#d4418e', '#2a9d8f', '#8338ec', '#ff6b35', '#06a77d', '#c1121f', '#1982c4', '#6a4c93', '#e09f3e'];
function brandColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return BRAND_PALETTE[h % BRAND_PALETTE.length];
}
// 이니셜 — 영문/숫자는 첫 글자 대문자, 한글은 첫 음절. 공백/괄호는 건너뛴다.
function brandInitial(name: string) {
  const s = (name || '').replace(/^[\s([{]+/, '').trim();
  if (!s) return '•';
  const ch = s[0];
  return /[a-z]/i.test(ch) ? ch.toUpperCase() : ch;
}

export function PreviewImage({
  src,
  alt,
  label,
  brand,
  className,
}: {
  src?: string | null;
  alt?: string | null;
  label?: string | null;
  brand?: string | null; // 지정하면 파일이 없을 때 회색 아이콘 대신 브랜드 색/이니셜 타일로 폴백
  className?: string;
}) {
  const [err, setErr] = useState(false);
  // 실제 존재하는 파일만: data URI · 외부 http · /assets/corner-samples · /assets/concept(추출 샘플).
  // 그 외 /assets/movie-*·brand-* 등 시드 자리표시자는 파일이 없어 렌더하지 않음(불필요한 404 방지).
  const renderable = !!src && (src.startsWith('data:') || src.startsWith('http') || src.startsWith('/assets/'));

  if (renderable && !err) {
    // className에 object-fit이 지정돼 있으면 그걸 존중(예: 와이드 워드마크 로고는 object-contain). 없으면 기본 cover.
    const hasFit = /\bobject-(cover|contain|fill|none|scale-down)\b/.test(className ?? '');
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src!} alt={alt ?? ''} className={`${hasFit ? '' : 'object-cover'} ${className ?? ''}`} onError={() => setErr(true)} />;
  }
  // 브랜드 폴백 — 로고 파일이 없는 제휴 브랜드는 브랜드 색 + 이니셜 타일(깨진 이미지·회색 여백 대신).
  const bn = (brand ?? '').trim();
  if (bn) {
    return (
      <div className={`flex items-center justify-center font-bold leading-none text-white ${className ?? ''}`} style={{ backgroundColor: brandColor(bn) }}>
        <span className="text-[16px]">{brandInitial(bn)}</span>
      </div>
    );
  }
  // 슬러그: 경로/확장자 제거 → 없으면 alt → 기본
  const slug = src ? src.split('/').pop()?.replace(/\.(png|jpe?g|svg|webp|gif|avif)$/i, '') : null;
  const text = label || slug || alt || '이미지';
  return (
    <div className={`flex flex-col items-center justify-center gap-1 bg-slate-100 text-slate-400 ${className ?? ''}`}>
      <ImageIcon className="h-4 w-4 opacity-60" />
      <span className="line-clamp-2 px-1 text-center text-[9px] font-medium leading-tight">{text}</span>
    </div>
  );
}
