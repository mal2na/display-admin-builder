'use client';

import { useState } from 'react';
import { ImageIcon } from 'lucide-react';

/**
 * 미리보기용 이미지 — 실제 파일이 없으면(404) 깨진 이미지 대신 깔끔한 영역 + 슬러그 라벨을 보여준다.
 * 라벨은 파일명 슬러그(brand-baemin 등)를 우선 사용해 '자리 표시'임을 명확히 한다.
 */
export function PreviewImage({
  src,
  alt,
  label,
  className,
}: {
  src?: string | null;
  alt?: string | null;
  label?: string | null;
  className?: string;
}) {
  const [err, setErr] = useState(false);
  // 실제 존재하는 파일만: data URI · 외부 http · /assets/corner-samples · /assets/concept(추출 샘플).
  // 그 외 /assets/movie-*·brand-* 등 시드 자리표시자는 파일이 없어 렌더하지 않음(불필요한 404 방지).
  const renderable = !!src && (src.startsWith('data:') || src.startsWith('http') || src.startsWith('/assets/'));

  if (renderable && !err) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src!} alt={alt ?? ''} className={`object-cover ${className ?? ''}`} onError={() => setErr(true)} />;
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
