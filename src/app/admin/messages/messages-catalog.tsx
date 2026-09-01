'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { Search, PenLine, Type, AlignLeft, Sparkles, BarChart3, ChevronRight, LayoutGrid } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { cn } from '@/lib/utils';
import { toggleTitleVariant, toggleAtomVariant } from './actions';

export type MsgVariant = { text: string; target?: string; enabled: boolean; index: number };
export type Slot = { kind: 'title' | 'atom'; holderId: string; label: string; sub: string; base: string; variants: MsgVariant[] };
export type CornerNode = {
  cornerId: string; cornerName: string; cornerType: string;
  container: string; template: string; editHref: string;
  slots: Slot[]; variantCount: number; excludedCount: number;
};

export function MessagesCatalog({ corners }: { corners: CornerNode[] }) {
  const [q, setQ] = useState('');
  const [onlyWith, setOnlyWith] = useState(true);
  const [selId, setSelId] = useState<string | null>(null);
  const [, start] = useTransition();

  const list = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return corners.filter((c) => {
      if (onlyWith && c.variantCount === 0) return false;
      if (!kw) return true;
      const hay = [c.cornerName, c.container, c.template, ...c.slots.flatMap((s) => [s.base, ...s.variants.map((v) => `${v.target ?? ''} ${v.text}`)])].join(' ').toLowerCase();
      return hay.includes(kw);
    });
  }, [corners, q, onlyWith]);

  const selected = list.find((c) => c.cornerId === selId) ?? list[0] ?? null;

  // 화면(컨테이너·템플릿)별 그룹
  const groups = useMemo(() => {
    const m = new Map<string, CornerNode[]>();
    for (const c of list) {
      const g = `${c.container} · ${c.template}`;
      (m.get(g) ?? m.set(g, []).get(g)!).push(c);
    }
    return [...m.entries()];
  }, [list]);

  const cornersWith = corners.filter((c) => c.variantCount > 0).length;
  const totalVars = corners.reduce((n, c) => n + c.variantCount, 0);
  const excluded = corners.reduce((n, c) => n + c.excludedCount, 0);

  const toggle = (cornerId: string, slot: Slot, index: number) => {
    start(() => {
      if (slot.kind === 'title') toggleTitleVariant(cornerId, index);
      else toggleAtomVariant(slot.holderId, index);
    });
  };

  return (
    <div className="flex h-full flex-col p-6">
      <PageHeader
        trail={['전시 관리', '문구 관리']}
        title="문구 관리"
        subtitle={<>화면(코너)을 고르면 <b>그 코너의 문구만</b> 봅니다. 채널은 노출/제외를 통제 — 세그 매칭·성과는 CVM, 문구 편집은 빌더에서.</>}
      />

      {/* 요약 */}
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border bg-card p-2.5 text-[12px]">
        <span className="flex items-center gap-1.5 font-semibold"><LayoutGrid className="h-4 w-4 text-violet-500" /> 후보 있는 코너 <b className="text-foreground">{cornersWith}</b></span>
        <span className="text-muted-foreground">타겟 후보 {totalVars}개</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> 노출 {totalVars - excluded}</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-slate-400" /> 제외 {excluded}</span>
        <div className="ml-auto flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground">
            <input type="checkbox" checked={onlyWith} onChange={(e) => setOnlyWith(e.target.checked)} className="accent-violet-600" />
            후보 있는 코너만 <span className="text-slate-400">(끄면 전체 {corners.length})</span>
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="코너·문구·타겟 검색" className="h-8 w-48 rounded-lg border bg-white pl-7 pr-2 text-xs outline-none focus:ring-2 focus:ring-violet-200" />
          </div>
        </div>
      </div>

      {/* 좌: 코너 목록(화면별) / 우: 선택 코너 문구 */}
      <div className="mt-4 grid min-h-0 flex-1 grid-cols-[320px_minmax(0,1fr)] gap-4">
        <div className="min-h-0 space-y-3 overflow-y-auto pr-1">
          {groups.length === 0 && <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">코너가 없습니다.</div>}
          {groups.map(([g, cs]) => (
            <div key={g}>
              <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{g}</p>
              <div className="space-y-1.5">
                {cs.map((c) => {
                  const sel = selected?.cornerId === c.cornerId;
                  const on = c.variantCount - c.excludedCount;
                  return (
                    <button key={c.cornerId} onClick={() => setSelId(c.cornerId)}
                      className={cn('flex w-full items-center gap-2 rounded-xl border p-2.5 text-left transition-colors', sel ? 'border-violet-400 bg-violet-50/50 ring-1 ring-violet-200' : 'bg-card hover:border-slate-300')}>
                      <span className="min-w-0 flex-1">
                        <span className="truncate text-[13px] font-semibold text-foreground">{c.cornerName}</span>
                        <span className="mt-0.5 flex items-center gap-2 text-[10px]">
                          <span className="rounded bg-slate-100 px-1 py-0.5 font-medium text-slate-500">{c.cornerType}</span>
                          <span className="text-muted-foreground">문구 {c.slots.length}</span>
                          {c.variantCount > 0 && <span className="text-violet-600">후보 {c.variantCount}</span>}
                          {c.excludedCount > 0 && <span className="text-slate-400">제외 {c.excludedCount}</span>}
                        </span>
                      </span>
                      <ChevronRight className={cn('h-4 w-4 shrink-0', sel ? 'text-violet-400' : 'text-slate-300')} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="min-h-0 overflow-y-auto rounded-xl border bg-card">
          {!selected ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">왼쪽에서 코너를 선택하세요.</div>
          ) : (
            <CornerDetail corner={selected} onToggle={toggle} />
          )}
        </div>
      </div>
    </div>
  );
}

function CornerDetail({ corner, onToggle }: { corner: CornerNode; onToggle: (cornerId: string, slot: Slot, i: number) => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-3 border-b p-5">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[16px] font-bold text-foreground">{corner.cornerName} <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[11px] font-semibold text-violet-700">{corner.cornerType}</span></p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{corner.container} · {corner.template} · 문구 {corner.slots.length}종 · 타겟 후보 {corner.variantCount}개</p>
        </div>
        <Link href={corner.editHref} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border px-3 text-[12px] font-medium text-muted-foreground hover:bg-secondary">
          <PenLine className="h-3.5 w-3.5" /> 빌더에서 편집
        </Link>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        {corner.slots.map((s) => (
          <section key={`${s.kind}:${s.holderId}`} className="rounded-xl border">
            <div className="flex items-center gap-2 border-b bg-slate-50/60 px-4 py-2.5">
              <span className={cn('grid h-6 w-6 place-items-center rounded-md', s.kind === 'title' ? 'bg-violet-100 text-violet-600' : 'bg-sky-100 text-sky-600')}>
                {s.kind === 'title' ? <Type className="h-3.5 w-3.5" /> : <AlignLeft className="h-3.5 w-3.5" />}
              </span>
              <span className="text-[13px] font-semibold">{s.label}</span>
              <span className="text-[11px] text-muted-foreground">· {s.kind === 'title' ? '타이틀' : s.sub}</span>
            </div>
            <div className="p-4">
              {/* 기본(폴백) */}
              <div className="mb-3 flex items-start gap-2">
                <span className="mt-0.5 shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">기본</span>
                <span className="whitespace-pre-line text-[13px] text-slate-800">{s.base || <span className="text-slate-400">(기본 문구 없음)</span>}</span>
              </div>
              {/* 타겟별 후보 */}
              {s.variants.length === 0 ? (
                <p className="rounded-lg border border-dashed py-3 text-center text-[11px] text-muted-foreground">타겟 후보 없음 · <Link href={corner.editHref} className="text-violet-600 underline">빌더에서 추가</Link></p>
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-[12px]">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
                      <tr className="[&>th]:px-3 [&>th]:py-1.5 [&>th]:text-left [&>th]:font-semibold">
                        <th className="w-24">타겟</th><th>문구</th><th className="w-36">성과 (반응률)</th><th className="w-16 text-center">노출</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {s.variants.map((v) => (
                        <tr key={v.index} className={cn(!v.enabled && 'bg-slate-50/60 opacity-60')}>
                          <td className="px-3 py-2">{v.target ? <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">{v.target}</span> : <span className="text-[11px] text-slate-400">타겟없음</span>}</td>
                          <td className="px-3 py-2 text-slate-700">{v.text || <span className="text-slate-400">(빈 문구)</span>}</td>
                          <td className="px-3 py-2"><span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-400"><BarChart3 className="h-3 w-3" /> CVM 연동 예정</span></td>
                          <td className="px-3 py-2 text-center">
                            <button onClick={() => onToggle(corner.cornerId, s, v.index)}
                              className={cn('rounded px-2 py-1 text-[10px] font-bold', v.enabled ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-200 text-slate-500 hover:bg-slate-300')}
                              title={v.enabled ? '노출 가능 — 클릭하면 제외' : '노출 제외 — 클릭하면 노출'}>{v.enabled ? '노출' : '제외'}</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        ))}
        <p className="flex items-center gap-1.5 pt-1 text-[11px] leading-relaxed text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-400" />
          <span><b>노출/제외</b>는 채널 통제(삭제 아님) — 제외 후보는 CVM 매칭에서 빠지고 기본으로 폴백. 문구 추가·수정은 <b>빌더</b>, 세그 매칭·성과는 <b>CVM</b>.</span>
        </p>
      </div>
    </div>
  );
}
