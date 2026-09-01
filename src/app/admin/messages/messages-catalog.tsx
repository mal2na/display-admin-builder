'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { List, Search, PenLine, Type, Tag, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { cn } from '@/lib/utils';
import { toggleTitleVariant, toggleAtomVariant } from './actions';

export type MsgVariant = { text: string; target?: string; enabled: boolean; index: number };
export type MessageRow = {
  kind: 'title' | 'atom';
  holderId: string;
  label: string;
  sub: string;
  base: string;
  variants: MsgVariant[];
  usages: string[];
  editHref: string;
};

export function MessagesCatalog({ rows }: { rows: MessageRow[] }) {
  const [q, setQ] = useState('');
  const [onlyVariants, setOnlyVariants] = useState(false);
  const [, start] = useTransition();

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (onlyVariants && r.variants.length === 0) return false;
      if (!kw) return true;
      const hay = [r.label, r.base, ...r.variants.map((v) => `${v.target ?? ''} ${v.text}`)].join(' ').toLowerCase();
      return hay.includes(kw);
    });
  }, [rows, q, onlyVariants]);

  const totalVars = rows.reduce((n, r) => n + r.variants.length, 0);
  const excluded = rows.reduce((n, r) => n + r.variants.filter((v) => !v.enabled).length, 0);

  const toggle = (r: MessageRow, index: number) => {
    start(() => {
      if (r.kind === 'title') toggleTitleVariant(r.holderId, index);
      else toggleAtomVariant(r.holderId, index);
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        trail={['전시 관리', '문구 관리']}
        title="문구 관리"
        subtitle={
          <>전 코너의 문구 후보를 한 화면에서 조망하고 <b>노출/제외</b>를 통제합니다. 문구 <b>편집</b>은 각 코너·컴포넌트에서, 최종 매칭·성과는 CVM.</>
        }
      />

      {/* 요약 + 필터 */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 font-semibold"><List className="h-4 w-4 text-violet-500" /> 문구 {rows.length}종</span>
          <span className="text-muted-foreground">타겟 후보 {totalVars}개</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> 노출 {totalVars - excluded}</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-slate-400" /> 제외 {excluded}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" checked={onlyVariants} onChange={(e) => setOnlyVariants(e.target.checked)} className="accent-violet-600" />
            베리에이션 있는 것만
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="문구·타겟 검색" className="h-8 w-48 rounded-lg border bg-white pl-7 pr-2 text-xs outline-none focus:ring-2 focus:ring-violet-200" />
          </div>
        </div>
      </div>

      {/* 카탈로그 */}
      <div className="space-y-2.5">
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">문구가 없습니다.</div>
        )}
        {filtered.map((r) => (
          <div key={`${r.kind}:${r.holderId}`} className="rounded-xl border bg-card p-3.5">
            <div className="flex flex-wrap items-start gap-2">
              {/* 종류 뱃지 */}
              <span className={cn('inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-[11px] font-semibold',
                r.kind === 'title' ? 'bg-violet-100 text-violet-700' : 'bg-sky-100 text-sky-700')}>
                {r.kind === 'title' ? <Type className="h-3 w-3" /> : <Tag className="h-3 w-3" />}
                {r.kind === 'title' ? '타이틀' : '문구'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{r.label} <span className="font-normal text-muted-foreground">· {r.sub}</span></p>
                <p className="mt-0.5 whitespace-pre-line text-[13px] text-slate-700">{r.base || <span className="text-slate-400">(기본 문구 없음)</span>}</p>
              </div>
              {r.editHref && (
                <Link href={r.editHref} className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border px-2 text-[11px] font-medium text-muted-foreground hover:bg-secondary">
                  <PenLine className="h-3 w-3" /> 빌더에서 편집
                </Link>
              )}
            </div>

            {/* 타겟 후보 (노출/제외 통제) */}
            {r.variants.length > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t pt-2.5">
                <span className="flex items-center gap-1 text-[10px] font-semibold text-violet-600"><Sparkles className="h-3 w-3" /> 타겟 후보</span>
                {r.variants.map((v) => (
                  <span key={v.index} className={cn('inline-flex items-center gap-1.5 rounded-lg border py-1 pl-2 pr-1 text-[11px]',
                    v.enabled ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50 opacity-60')}>
                    {v.target && <span className="rounded bg-rose-100 px-1 py-0.5 text-[9px] font-bold text-rose-600">{v.target}</span>}
                    <span className="max-w-[220px] truncate text-slate-700">{v.text || <span className="text-slate-400">(빈 문구)</span>}</span>
                    <button
                      type="button"
                      onClick={() => toggle(r, v.index)}
                      className={cn('rounded px-1.5 py-0.5 text-[9px] font-bold', v.enabled ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-200 text-slate-500 hover:bg-slate-300')}
                      title={v.enabled ? '노출 가능 — 클릭하면 제외' : '노출 제외 — 클릭하면 노출'}
                    >{v.enabled ? '노출' : '제외'}</button>
                  </span>
                ))}
              </div>
            )}

            {/* 사용처 */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="font-medium">사용처</span>
              {r.usages.map((u, i) => (
                <span key={i} className="rounded bg-secondary px-1.5 py-0.5">{u}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
        이 화면은 <b>채널 통제 판</b>입니다 — 어떤 문구가 노출될 수 있는지 켜고 끕니다(삭제 아님). 문구 <b>텍스트 편집</b>은 각 코너·컴포넌트에서, 세그먼트 매칭과 반응·성과 원장은 <b>CVM</b>이 관리합니다.
      </p>
    </div>
  );
}
