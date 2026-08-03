'use client';

import { useState } from 'react';
import { ICON_CATEGORIES, ICON_TOTAL, IconGlyph, type IconDef } from '@/lib/icon-library';
import { cn } from '@/lib/utils';
import { X, Search } from 'lucide-react';

export function IconPickerModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (def: IconDef) => void;
}) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('all');
  if (!open) return null;

  const query = q.trim().toLowerCase();
  const sections = ICON_CATEGORIES.filter((c) => cat === 'all' || c.key === cat)
    .map((c) => ({ ...c, icons: c.icons.filter((i) => !query || i.label.toLowerCase().includes(query)) }))
    .filter((c) => c.icons.length > 0);

  const pick = (def: IconDef) => {
    onSelect(def);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[82vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center gap-2 border-b px-5 py-3">
          <h2 className="text-sm font-semibold">아이콘</h2>
          <span className="text-xs text-muted-foreground">{ICON_TOTAL}개 · 라이브러리에서 끌어오기</span>
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
              placeholder="아이콘 검색…"
              className="h-9 flex-1 bg-transparent text-sm outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* 카테고리 필터 */}
        <div className="flex flex-wrap gap-1.5 px-5 py-3">
          <FilterChip active={cat === 'all'} onClick={() => setCat('all')} label="전체" count={ICON_TOTAL} />
          {ICON_CATEGORIES.map((c) => (
            <FilterChip key={c.key} active={cat === c.key} onClick={() => setCat(c.key)} label={c.label} count={c.icons.length} />
          ))}
        </div>

        {/* 아이콘 그리드 */}
        <div className="flex-1 overflow-y-auto border-t px-5 py-4">
          {sections.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">검색 결과가 없습니다.</p>}
          {sections.map((c) => (
            <div key={c.key} className="mb-5">
              <div className="mb-2 flex items-center gap-1.5">
                <span className="text-xs font-semibold">{c.label}</span>
                <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">{c.icons.length}</span>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                {c.icons.map((ic) => (
                  <button
                    key={ic.key}
                    type="button"
                    onClick={() => pick(ic)}
                    className="flex flex-col items-center gap-1 rounded-lg border border-transparent p-2 hover:border-primary/40 hover:bg-accent"
                    title={ic.label}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-muted/50">
                      <IconGlyph name={ic.key} className="h-5 w-5 text-slate-700" />
                    </span>
                    <span className="w-full truncate text-center text-[10px] text-muted-foreground">{ic.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
        active ? 'bg-primary text-primary-foreground' : 'border bg-background text-muted-foreground hover:bg-secondary',
      )}
    >
      {label}
      <span className={cn('rounded-full px-1 text-[10px]', active ? 'bg-white/25' : 'bg-muted')}>{count}</span>
    </button>
  );
}
