'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { Search, PenLine, Type, AlignLeft, Sparkles, BarChart3, ChevronRight, Plus, Library, Wand2, X, MapPin } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { cn } from '@/lib/utils';
import { CVM_TARGET_HINTS } from '@/lib/display-taxonomy';
import { toggleTitleVariant, toggleAtomVariant, addTitleVariant, addAtomVariant } from './actions';

export type MsgVariant = { text: string; target?: string; enabled: boolean; index: number };
export type LibEntry = { text: string; use: string; target?: string; sources: string[] };
export type MsgItem = {
  id: string; kind: 'title' | 'atom'; use: string; label: string;
  base: string; variants: MsgVariant[]; usages: string[]; editHref: string; cornerId: string;
};

// 용도별 표기 규칙(권장) — 표기 검증 PG-DSP-ACC-001
const USE_RULE: Record<string, { max: number; hint: string }> = {
  '타이틀': { max: 40, hint: '핵심 메시지 · 2줄 이내' },
  'CTA': { max: 14, hint: '행동 유도 · 아주 짧게' },
  '텍스트': { max: 30, hint: '한 줄 권장' },
  '설명': { max: 40, hint: '값·조건 간결히' },
};
const useIcon = (kind: string) => (kind === 'title' ? Type : AlignLeft);

export function MessagesCatalog({ items, library }: { items: MsgItem[]; library: LibEntry[] }) {
  const [q, setQ] = useState('');
  const [useF, setUseF] = useState('전체');
  const [onlyVar, setOnlyVar] = useState(true);
  const [selId, setSelId] = useState<string | null>(null);
  const [, start] = useTransition();

  const uses = useMemo(() => ['전체', ...Array.from(new Set(items.map((i) => i.use)))], [items]);

  const list = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return items.filter((it) => {
      if (onlyVar && it.variants.length === 0) return false;
      if (useF !== '전체' && it.use !== useF) return false;
      if (!kw) return true;
      return [it.label, it.base, ...it.variants.map((v) => `${v.target ?? ''} ${v.text}`), ...it.usages].join(' ').toLowerCase().includes(kw);
    });
  }, [items, q, useF, onlyVar]);

  const selected = list.find((i) => i.id === selId) ?? list[0] ?? null;

  const groups = useMemo(() => {
    const m = new Map<string, MsgItem[]>();
    for (const it of list) (m.get(it.use) ?? m.set(it.use, []).get(it.use)!).push(it);
    return [...m.entries()];
  }, [list]);

  const withVar = items.filter((i) => i.variants.length > 0).length;
  const totalVars = items.reduce((n, i) => n + i.variants.length, 0);
  const excluded = items.reduce((n, i) => n + i.variants.filter((v) => !v.enabled).length, 0);

  const toggle = (it: MsgItem, index: number) => start(() => {
    if (it.kind === 'title') toggleTitleVariant(it.cornerId, index);
    else toggleAtomVariant(it.id, index);
  });

  return (
    <div className="flex h-full flex-col p-6">
      <PageHeader
        trail={['전시 관리', '문구 관리']}
        title="문구 관리"
        subtitle={<>문구를 <b>Atom(표준 단위)</b>로 관리합니다 — 유형별로 모으고, 재사용·사용처로 추적. 하나를 고치면 쓰이는 모든 코너에 반영. 매칭·성과는 CVM.</>}
      />

      {/* 유형 필터 + 요약 */}
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border bg-card p-2.5 text-[12px]">
        <div className="flex flex-wrap gap-1">
          {uses.map((u) => (
            <button key={u} onClick={() => setUseF(u)} className={cn('rounded-md px-2.5 py-1 font-medium', useF === u ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100')}>{u}</button>
          ))}
        </div>
        <span className="ml-1 text-muted-foreground">문구 <b className="text-foreground">{withVar}</b></span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> 노출 {totalVars - excluded}</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-slate-400" /> 제외 {excluded}</span>
        <div className="ml-auto flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground">
            <input type="checkbox" checked={onlyVar} onChange={(e) => setOnlyVar(e.target.checked)} className="accent-indigo-600" />
            배리에이션 있는 것만 <span className="text-slate-400">(끄면 전체 {items.length})</span>
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="문구·타겟·사용처 검색" className="h-8 w-52 rounded-lg border bg-white pl-7 pr-2 text-xs outline-none focus:ring-2 focus:ring-indigo-200" />
          </div>
        </div>
      </div>

      {/* 좌: 문구(유형별) / 우: 상세 */}
      <div className="mt-4 grid min-h-0 flex-1 grid-cols-[340px_minmax(0,1fr)] gap-4">
        <div className="min-h-0 space-y-3 overflow-y-auto pr-1">
          {groups.length === 0 && <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">문구가 없습니다.</div>}
          {groups.map(([g, its]) => (
            <div key={g}>
              <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{g} <span className="text-slate-300">{its.length}</span></p>
              <div className="space-y-1.5">
                {its.map((it) => {
                  const Icon = useIcon(it.kind);
                  const sel = selected?.id === it.id;
                  const off = it.variants.filter((v) => !v.enabled).length;
                  return (
                    <button key={it.id} onClick={() => setSelId(it.id)}
                      className={cn('flex w-full items-start gap-2 rounded-xl border p-2.5 text-left transition-colors', sel ? 'border-indigo-400 bg-indigo-50/50 ring-1 ring-indigo-200' : 'bg-card hover:border-slate-300')}>
                      <span className={cn('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md', it.kind === 'title' ? 'bg-indigo-100 text-indigo-600' : 'bg-sky-100 text-sky-600')}><Icon className="h-3.5 w-3.5" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-foreground">{it.base || it.label}</span>
                        <span className="mt-0.5 flex items-center gap-2 text-[10px]">
                          {it.variants.length > 0 && <span className="text-indigo-600">후보 {it.variants.length}</span>}
                          {off > 0 && <span className="text-slate-400">제외 {off}</span>}
                          <span className="flex items-center gap-0.5 text-muted-foreground"><MapPin className="h-2.5 w-2.5" />{it.usages.length}곳</span>
                        </span>
                      </span>
                      <ChevronRight className={cn('mt-1.5 h-4 w-4 shrink-0', sel ? 'text-indigo-400' : 'text-slate-300')} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="min-h-0 overflow-y-auto rounded-xl border bg-card">
          {!selected ? <div className="flex h-full items-center justify-center text-sm text-muted-foreground">왼쪽에서 문구를 선택하세요.</div> : <Detail item={selected} onToggle={toggle} library={library} />}
        </div>
      </div>
    </div>
  );
}

function Detail({ item, onToggle, library }: { item: MsgItem; onToggle: (it: MsgItem, i: number) => void; library: LibEntry[] }) {
  const rule = USE_RULE[item.use];
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-3 border-b p-5">
        <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', item.kind === 'title' ? 'bg-indigo-100 text-indigo-600' : 'bg-sky-100 text-sky-600')}>{item.kind === 'title' ? <Type className="h-4 w-4" /> : <AlignLeft className="h-4 w-4" />}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-foreground">{item.label} <span className="text-[12px] font-normal text-muted-foreground">· {item.use}</span></p>
          {rule && <p className="mt-0.5 text-[11px] text-muted-foreground">표기 제한: {rule.hint} · 최대 {rule.max}자</p>}
        </div>
        <Link href={item.editHref} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border px-3 text-[12px] font-medium text-muted-foreground hover:bg-secondary"><PenLine className="h-3.5 w-3.5" /> 빌더에서 편집</Link>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {/* 기본(폴백) */}
        <div className="mb-4 rounded-lg border bg-slate-50 p-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">기본 <span className="font-normal normal-case text-slate-400">· CVM 미매칭·실패 시 폴백</span></p>
          <p className="whitespace-pre-line text-[13px] text-slate-800">{item.base || <span className="text-slate-400">(기본 문구 없음)</span>}</p>
        </div>

        {/* 타겟별 배리에이션 */}
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-indigo-700"><Sparkles className="h-3.5 w-3.5" /> 타겟별 배리에이션 <span className="font-normal text-indigo-400">· CVM이 세그 매칭해 택1</span></p>
        {item.variants.length > 0 && (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-[12px]">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
                <tr className="[&>th]:px-3 [&>th]:py-1.5 [&>th]:text-left [&>th]:font-semibold"><th className="w-24">타겟</th><th>문구</th><th className="w-36">성과</th><th className="w-16 text-center">노출</th></tr>
              </thead>
              <tbody className="divide-y">
                {item.variants.map((v) => (
                  <tr key={v.index} className={cn(!v.enabled && 'bg-slate-50/60 opacity-60')}>
                    <td className="px-3 py-2">{v.target ? <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-500">{v.target}</span> : <span className="text-[11px] text-slate-400">타겟없음</span>}</td>
                    <td className="px-3 py-2 text-slate-700">{v.text || <span className="text-slate-400">(빈 문구)</span>}</td>
                    <td className="px-3 py-2"><span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-400"><BarChart3 className="h-3 w-3" /> CVM 연동 예정</span></td>
                    <td className="px-3 py-2 text-center"><button onClick={() => onToggle(item, v.index)} className={cn('rounded px-2 py-1 text-[10px] font-bold', v.enabled ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-200 text-slate-500 hover:bg-slate-300')}>{v.enabled ? '노출' : '제외'}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <AddVariant item={item} library={library} />

        {/* 사용처 (운영 영향 범위 — FN-DSP-CMP-001) */}
        <div className="mt-5 rounded-lg border bg-slate-50/60 p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-600"><MapPin className="h-3.5 w-3.5 text-slate-400" /> 사용처 <span className="font-normal text-slate-400">· 이 문구를 고치면 아래 전부에 반영</span></p>
          <div className="flex flex-wrap gap-1.5">
            {item.usages.map((u, i) => <span key={i} className="rounded bg-white px-2 py-1 text-[11px] text-slate-600 ring-1 ring-slate-200">{u}</span>)}
          </div>
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">문구 텍스트는 채널이 author(직접입력·라이브러리 재사용·AI 제안), <b>노출/제외</b>는 채널 통제 — 세그 매칭·성과 원장은 CVM. (정책 PI-DSP-CMP-001 · FN-DSP-CMP-001 · PI-DSP-AI-001)</p>
      </div>
    </div>
  );
}

// 타겟 톤 → AI 제안(예시). 실서비스는 PI-DSP-AI-001의 AI가 생성.
const TARGET_TONE: Record<string, string> = { '시니어': '어르신도 편하게', '2030': '요즘 뜨는', '재방문': '다시 오신 김에', '위치 인근': '지금 근처에서', '혜택 보유': '보유 혜택으로', '신규': '처음이라면' };
function aiSuggest(base: string, target?: string): string[] {
  const b = (base || '').replace(/\r?\n/g, ' ').trim();
  if (!b) return [];
  const tone = target ? TARGET_TONE[target] : '';
  const head = b.split(/[.!?·,]/)[0].trim();
  return [...new Set([tone ? `${tone}, ${b}` : `${b} 지금 확인하세요`, target ? `${head} · ${target} 맞춤` : head, `${head}, 놓치지 마세요`].filter((s) => s && s !== b))].slice(0, 3);
}

function AddVariant({ item, library }: { item: MsgItem; library: LibEntry[] }) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState('');
  const [text, setText] = useState('');
  const [mode, setMode] = useState<null | 'lib' | 'ai'>(null);
  const [libQ, setLibQ] = useState('');
  const [, start] = useTransition();
  const rule = USE_RULE[item.use];
  const over = rule ? text.trim().length > rule.max : false;

  const add = (t?: string) => {
    const val = (t ?? text).trim(); if (!val) return;
    start(() => { if (item.kind === 'title') addTitleVariant(item.cornerId, val, target || undefined); else addAtomVariant(item.id, val, target || undefined); });
    setText(''); setMode(null); setOpen(false);
  };
  const own = new Set([item.base, ...item.variants.map((v) => v.text)]);
  const libHits = library.filter((e) => e.use === item.use && !own.has(e.text) && e.text.toLowerCase().includes(libQ.trim().toLowerCase())).slice(0, 40);
  const aiHits = aiSuggest(item.base, target || undefined);

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="mt-2 inline-flex items-center gap-1 rounded-md border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100"><Plus className="h-3 w-3" /> 후보 추가</button>;
  return (
    <div className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50/40 p-2.5">
      <div className="flex items-center gap-1.5">
        <select value={target} onChange={(e) => setTarget(e.target.value)} className="h-8 w-28 shrink-0 rounded-md border bg-white px-1.5 text-[11px]"><option value="">타겟 없음</option>{CVM_TARGET_HINTS.map((t) => <option key={t.key} value={t.key}>{t.key}</option>)}</select>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !over) add(); }} placeholder="문구 직접 입력 / 아래에서 불러오기" className={cn('h-8 min-w-0 flex-1 rounded-md border bg-white px-2 text-[12px] outline-none focus:ring-2', over ? 'border-rose-300 focus:ring-rose-200' : 'focus:ring-indigo-200')} />
        <button type="button" onClick={() => setMode(mode === 'lib' ? null : 'lib')} className={cn('inline-flex h-8 shrink-0 items-center gap-1 rounded-md border px-2 text-[11px] font-medium', mode === 'lib' ? 'border-indigo-400 bg-white text-indigo-700' : 'bg-white text-slate-600 hover:bg-slate-50')}><Library className="h-3.5 w-3.5" /> 라이브러리</button>
        <button type="button" onClick={() => setMode(mode === 'ai' ? null : 'ai')} className={cn('inline-flex h-8 shrink-0 items-center gap-1 rounded-md border px-2 text-[11px] font-medium', mode === 'ai' ? 'border-indigo-400 bg-white text-indigo-700' : 'bg-white text-slate-600 hover:bg-slate-50')}><Wand2 className="h-3.5 w-3.5" /> AI 제안</button>
        <button type="button" onClick={() => add()} disabled={!text.trim() || over} className="h-8 shrink-0 rounded-md bg-indigo-600 px-3 text-[11px] font-semibold text-white disabled:opacity-40">추가</button>
        <button type="button" onClick={() => { setOpen(false); setMode(null); }} className="grid h-8 w-7 shrink-0 place-items-center rounded-md border bg-white text-slate-400 hover:text-slate-600"><X className="h-3.5 w-3.5" /></button>
      </div>
      {rule && <p className={cn('mt-1.5 pl-1 text-[10px]', over ? 'text-rose-500' : 'text-muted-foreground')}>용도 <b>{item.use}</b> · {rule.hint} · {text.trim().length}/{rule.max}자{over ? ' — 초과' : ''}</p>}
      {mode === 'lib' && (
        <div className="mt-2 rounded-md border bg-white p-2">
          <div className="mb-1.5 flex items-center gap-1.5"><Library className="h-3.5 w-3.5 text-indigo-500" /><span className="text-[10px] font-semibold text-slate-500">라이브러리 <span className="font-normal text-slate-400">· 같은 용도(<b className="text-indigo-600">{item.use}</b>)만</span></span><input value={libQ} onChange={(e) => setLibQ(e.target.value)} placeholder="검색" className="ml-auto h-6 w-32 rounded border px-2 text-[11px] outline-none" /></div>
          <div className="max-h-40 space-y-0.5 overflow-y-auto">
            {libHits.length === 0 && <p className="py-2 text-center text-[11px] text-slate-400">이 용도의 재사용 문구 없음</p>}
            {libHits.map((e, i) => <button key={i} type="button" onClick={() => setText(e.text)} className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left hover:bg-indigo-50"><span className="min-w-0 flex-1 truncate text-[12px] text-slate-700">{e.text}</span>{e.target && <span className="shrink-0 rounded bg-rose-50 px-1 text-[9px] font-bold text-rose-500">{e.target}</span>}<span className="shrink-0 text-[9px] text-slate-400">{e.sources[0]}{e.sources.length > 1 ? ` 외 ${e.sources.length - 1}` : ''}</span></button>)}
          </div>
        </div>
      )}
      {mode === 'ai' && (
        <div className="mt-2 rounded-md border bg-white p-2">
          <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500"><Wand2 className="h-3.5 w-3.5 text-indigo-500" /> AI 제안 <span className="font-normal text-slate-400">· {target || '타겟없음'} · 예시(실서비스는 AI 생성) · 클릭해 채택</span></p>
          {aiHits.length === 0 ? <p className="py-2 text-center text-[11px] text-slate-400">기본 문구가 있어야 제안</p> : <div className="space-y-0.5">{aiHits.map((p, i) => <button key={i} type="button" onClick={() => setText(p)} className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[12px] text-slate-700 hover:bg-indigo-50"><Sparkles className="h-3 w-3 shrink-0 text-indigo-400" /> <span className="truncate">{p}</span></button>)}</div>}
        </div>
      )}
    </div>
  );
}
