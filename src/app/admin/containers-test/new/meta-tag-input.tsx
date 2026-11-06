'use client';

import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// 메타 태그 입력 (SB PG486 ② 메타 태그) — 태그 칩 + Enter 추가 + 'AI 추천' 버튼.
//  칩들을 공백으로 join해 hidden input(name)에 담아 서버로 보낸다. keywords/title은 시스템이 이 태그로 파생.
//  AI 추천은 스펙상 스텁 — 대표 키워드를 몇 개 제안해 채운다.
const AI_SUGGEST = ['#SKT', '#혜택', '#멤버십', '#우주', '#이벤트'];

export function MetaTagInput({ name, defaultValue = '' }: { name: string; defaultValue?: string }) {
  const [tags, setTags] = useState<string[]>(() => defaultValue.split(/\s+/).map((t) => t.trim()).filter(Boolean));
  const [draft, setDraft] = useState('');

  const add = (raw: string) => {
    const t = raw.trim().replace(/^#?/, '#');
    if (t.length <= 1) return;
    setTags((prev) => (prev.includes(t) ? prev : [...prev, t]));
  };
  const remove = (t: string) => setTags((prev) => prev.filter((x) => x !== t));
  const aiSuggest = () => setTags((prev) => Array.from(new Set([...prev, ...AI_SUGGEST])));

  return (
    <div className="space-y-1.5">
      <input type="hidden" name={name} value={tags.join(' ')} />
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-[var(--line3)] bg-white px-2 py-1.5">
        <button type="button" onClick={aiSuggest}
          className="inline-flex shrink-0 items-center gap-1 rounded-[6px] border border-[var(--ac)] bg-[var(--ac2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ac)] hover:bg-[var(--ac)] hover:text-white">
          <Sparkles className="h-3 w-3" /> AI 추천
        </button>
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-[6px] bg-[var(--th)] px-2 py-0.5 text-[11px] font-medium text-[var(--ink2)]">
            {t}
            <button type="button" onClick={() => remove(t)} className="text-[var(--ink3)] hover:text-[var(--ink)]" aria-label={`${t} 삭제`}><X className="h-3 w-3" /></button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(draft); setDraft(''); } }}
          onBlur={() => { if (draft.trim()) { add(draft); setDraft(''); } }}
          placeholder={tags.length ? '태그 입력 후 Enter' : '#키워드 입력 후 Enter (ex. #SKT #혜택)'}
          className={cn('min-w-[140px] flex-1 border-0 bg-transparent px-1 text-xs outline-none placeholder:text-[var(--ink3)]')}
        />
      </div>
      <p className="text-[11px] text-[var(--ink3)]">AI 추천으로 대표 키워드를 채우거나 직접 입력하세요. keywords·title은 이 태그로 자동 생성됩니다.</p>
    </div>
  );
}
