'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, Search, ImageIcon, Link2, Check } from 'lucide-react';

export type ImageAsset = { url: string; alt: string | null; name: string };
export type LinkAsset = { url: string; label: string };

const isRenderableImg = (src?: string | null) => !!src && (src.startsWith('data:') || src.startsWith('http'));

// 이미지(jpg 등) / 이동 URL을 라이브러리에서 "불러오기"로 선택하는 공용 모달.
export function AssetPickerModal({
  open,
  kind,
  images,
  links,
  onClose,
  onSelect,
}: {
  open: boolean;
  kind: 'image' | 'link';
  images: ImageAsset[];
  links: LinkAsset[];
  onClose: () => void;
  onSelect: (v: { url: string; alt?: string | null }) => void;
}) {
  const [q, setQ] = useState('');
  // 직접 입력 값
  const [manualUrl, setManualUrl] = useState('');
  const [manualAlt, setManualAlt] = useState('');
  if (!open) return null;

  const query = q.trim().toLowerCase();
  const imgList = images.filter(
    (i) => !query || `${i.name} ${i.alt ?? ''} ${i.url}`.toLowerCase().includes(query),
  );
  const linkList = links.filter((l) => !query || `${l.label} ${l.url}`.toLowerCase().includes(query));

  const pick = (v: { url: string; alt?: string | null }) => {
    onSelect(v);
    onClose();
  };
  const applyManual = () => {
    if (!manualUrl.trim()) return;
    pick(kind === 'image' ? { url: manualUrl.trim(), alt: manualAlt.trim() || null } : { url: manualUrl.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center gap-2 border-b px-5 py-3">
          {kind === 'image' ? <ImageIcon className="h-4 w-4 text-primary" /> : <Link2 className="h-4 w-4 text-primary" />}
          <h2 className="text-sm font-semibold">{kind === 'image' ? '이미지 라이브러리' : '이동 URL'}</h2>
          <span className="text-xs text-muted-foreground">
            {(kind === 'image' ? images.length : links.length)}개 · 라이브러리에서 끌어오기
          </span>
          <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground" aria-label="닫기">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 검색 */}
        <div className="px-5 pt-3">
          <div className="flex items-center gap-2 rounded-md border bg-background px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={kind === 'image' ? '이미지 이름·대체텍스트 검색…' : 'URL·이름 검색…'}
              className="h-9 flex-1 bg-transparent text-sm outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto border-t px-5 py-4">
          {kind === 'image' ? (
            <>
              {imgList.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">검색 결과가 없습니다.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {imgList.map((im) => (
                  <button
                    key={im.url + im.name}
                    type="button"
                    onClick={() => pick({ url: im.url, alt: im.alt })}
                    className="flex flex-col overflow-hidden rounded-lg border border-transparent text-left hover:border-primary/40 hover:bg-accent"
                    title={im.alt ?? im.name}
                  >
                    {isRenderableImg(im.url) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={im.url} alt={im.alt ?? ''} className="aspect-[4/3] w-full object-cover" />
                    ) : (
                      <span className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-indigo-100 to-slate-200 px-1 text-center text-[10px] text-slate-500">
                        {im.url.split('/').pop()}
                      </span>
                    )}
                    <span className="truncate px-1.5 py-1 text-[11px] font-medium">{im.name}</span>
                  </button>
                ))}
                </div>
              )}
            </>
          ) : linkList.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">검색 결과가 없습니다.</p>
          ) : (
            <div className="space-y-1">
              {linkList.map((l) => (
                <button
                  key={l.url + l.label}
                  type="button"
                  onClick={() => pick({ url: l.url })}
                  className="flex w-full items-center gap-2 rounded-md border border-transparent px-2.5 py-2 text-left hover:border-primary/40 hover:bg-accent"
                >
                  <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{l.label}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{l.url}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 직접 입력 (라이브러리에 없을 때) */}
        <div className="border-t bg-muted/30 px-5 py-3">
          <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">직접 입력</p>
          <div className="flex items-center gap-1.5">
            <input
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder={kind === 'image' ? '이미지 경로/URL' : '이동 링크 URL (예: /movie)'}
              className="h-8 flex-1 rounded-md border bg-background px-2.5 text-xs outline-none"
            />
            {kind === 'image' && (
              <input
                value={manualAlt}
                onChange={(e) => setManualAlt(e.target.value)}
                placeholder="대체텍스트"
                className="h-8 w-32 rounded-md border bg-background px-2.5 text-xs outline-none"
              />
            )}
            <button
              type="button"
              onClick={applyManual}
              disabled={!manualUrl.trim()}
              className={cn(
                'inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-3 text-xs font-medium',
                manualUrl.trim() ? 'bg-primary text-primary-foreground' : 'cursor-not-allowed bg-muted text-muted-foreground',
              )}
            >
              <Check className="h-3.5 w-3.5" /> 적용
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
