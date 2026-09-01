'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { Search, PenLine, Type, AlignLeft, Sparkles, BarChart3, ChevronRight, LayoutGrid, Plus, Library, Wand2, X } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { cn } from '@/lib/utils';
import { CVM_TARGET_HINTS } from '@/lib/display-taxonomy';
import { toggleTitleVariant, toggleAtomVariant, addTitleVariant, addAtomVariant } from './actions';

export type MsgVariant = { text: string; target?: string; enabled: boolean; index: number };
export type Slot = { kind: 'title' | 'atom'; holderId: string; label: string; sub: string; base: string; variants: MsgVariant[] };
export type CornerNode = {
  cornerId: string; cornerName: string; cornerType: string;
  container: string; template: string; editHref: string;
  slots: Slot[]; variantCount: number; excludedCount: number;
};

export function MessagesCatalog({ corners, library }: { corners: CornerNode[]; library: string[] }) {
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
            <CornerDetail corner={selected} onToggle={toggle} library={library} />
          )}
        </div>
      </div>
    </div>
  );
}

function CornerDetail({ corner, onToggle, library }: { corner: CornerNode; onToggle: (cornerId: string, slot: Slot, i: number) => void; library: string[] }) {
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
              {s.variants.length > 0 && (
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
              {/* 후보 추가 — 직접입력 / 라이브러리 불러오기 / AI 제안 */}
              <AddVariant slot={s} cornerId={corner.cornerId} library={library} />
            </div>
          </section>
        ))}
        <p className="flex items-center gap-1.5 pt-1 text-[11px] leading-relaxed text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-400" />
          <span>텍스트는 채널이 <b>author</b>(직접입력·라이브러리 재사용·AI 제안) — CVM은 텍스트를 주지 않고 <b>세그 매칭·성과</b>만. <b>노출/제외</b>는 채널 통제(삭제 아님), 제외 시 기본으로 폴백.</span>
        </p>
      </div>
    </div>
  );
}

// 타겟별 목소리 힌트 → AI 제안(예시) 접두. 실서비스는 정책 US-DSP-AI-001의 AI가 생성.
const TARGET_TONE: Record<string, string> = {
  '시니어': '어르신도 편하게', '2030': '요즘 뜨는', '재방문': '다시 오신 김에',
  '위치 인근': '지금 근처에서', '혜택 보유': '보유 혜택으로', '신규': '처음이라면',
};
function aiSuggest(base: string, target?: string): string[] {
  const b = (base || '').replace(/\r?\n/g, ' ').trim();
  if (!b) return [];
  const tone = target ? TARGET_TONE[target] : '';
  const head = b.split(/[.!?·,]/)[0].trim();
  const out = [
    tone ? `${tone}, ${b}` : `${b} 지금 확인하세요`,
    target ? `${head} · ${target} 맞춤` : head,
    `${head}, 놓치지 마세요`,
  ];
  return [...new Set(out.filter((s) => s && s !== b))].slice(0, 3);
}

function AddVariant({ slot, cornerId, library }: { slot: Slot; cornerId: string; library: string[] }) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState('');
  const [text, setText] = useState('');
  const [mode, setMode] = useState<null | 'lib' | 'ai'>(null);
  const [libQ, setLibQ] = useState('');
  const [, start] = useTransition();

  const add = (t?: string) => {
    const val = (t ?? text).trim();
    if (!val) return;
    start(() => {
      if (slot.kind === 'title') addTitleVariant(cornerId, val, target || undefined);
      else addAtomVariant(slot.holderId, val, target || undefined);
    });
    setText(''); setMode(null); setOpen(false);
  };

  const libHits = library.filter((p) => p.toLowerCase().includes(libQ.trim().toLowerCase())).slice(0, 30);
  const aiHits = aiSuggest(slot.base, target || undefined);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-2 inline-flex items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700 hover:bg-violet-100">
        <Plus className="h-3 w-3" /> 후보 추가
      </button>
    );
  }
  return (
    <div className="mt-2 rounded-lg border border-violet-200 bg-violet-50/40 p-2.5">
      <div className="flex items-center gap-1.5">
        <select value={target} onChange={(e) => setTarget(e.target.value)} className="h-8 w-28 shrink-0 rounded-md border bg-white px-1.5 text-[11px]">
          <option value="">타겟 없음</option>
          {CVM_TARGET_HINTS.map((t) => <option key={t.key} value={t.key}>{t.key}</option>)}
        </select>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} placeholder="문구 직접 입력 / 아래에서 불러오기" className="h-8 min-w-0 flex-1 rounded-md border bg-white px-2 text-[12px] outline-none focus:ring-2 focus:ring-violet-200" />
        <button type="button" onClick={() => setMode(mode === 'lib' ? null : 'lib')} className={cn('inline-flex h-8 shrink-0 items-center gap-1 rounded-md border px-2 text-[11px] font-medium', mode === 'lib' ? 'border-violet-400 bg-white text-violet-700' : 'bg-white text-slate-600 hover:bg-slate-50')} title="문구 라이브러리에서 불러오기"><Library className="h-3.5 w-3.5" /> 라이브러리</button>
        <button type="button" onClick={() => setMode(mode === 'ai' ? null : 'ai')} className={cn('inline-flex h-8 shrink-0 items-center gap-1 rounded-md border px-2 text-[11px] font-medium', mode === 'ai' ? 'border-violet-400 bg-white text-violet-700' : 'bg-white text-slate-600 hover:bg-slate-50')} title="AI 문구 제안(예시)"><Wand2 className="h-3.5 w-3.5" /> AI 제안</button>
        <button type="button" onClick={() => add()} disabled={!text.trim()} className="h-8 shrink-0 rounded-md bg-violet-600 px-3 text-[11px] font-semibold text-white disabled:opacity-40">추가</button>
        <button type="button" onClick={() => { setOpen(false); setMode(null); }} className="grid h-8 w-7 shrink-0 place-items-center rounded-md border bg-white text-slate-400 hover:text-slate-600"><X className="h-3.5 w-3.5" /></button>
      </div>

      {mode === 'lib' && (
        <div className="mt-2 rounded-md border bg-white p-2">
          <div className="mb-1.5 flex items-center gap-1.5">
            <Library className="h-3.5 w-3.5 text-violet-500" />
            <span className="text-[10px] font-semibold text-slate-500">문구 라이브러리 <span className="font-normal text-slate-400">· 우리가 만든 문구 재사용</span></span>
            <input value={libQ} onChange={(e) => setLibQ(e.target.value)} placeholder="검색" className="ml-auto h-6 w-32 rounded border px-2 text-[11px] outline-none" />
          </div>
          <div className="max-h-40 space-y-0.5 overflow-y-auto">
            {libHits.length === 0 && <p className="py-2 text-center text-[11px] text-slate-400">일치하는 문구 없음</p>}
            {libHits.map((p, i) => (
              <button key={i} type="button" onClick={() => setText(p)} className="block w-full truncate rounded px-2 py-1 text-left text-[12px] text-slate-700 hover:bg-violet-50">{p}</button>
            ))}
          </div>
        </div>
      )}

      {mode === 'ai' && (
        <div className="mt-2 rounded-md border bg-white p-2">
          <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500"><Wand2 className="h-3.5 w-3.5 text-violet-500" /> AI 제안 <span className="font-normal text-slate-400">· {target || '타겟없음'} 기준 · 예시(실서비스는 AI 생성) · 클릭해 채택</span></p>
          {aiHits.length === 0 ? (
            <p className="py-2 text-center text-[11px] text-slate-400">기본 문구가 있어야 제안할 수 있어요</p>
          ) : (
            <div className="space-y-0.5">
              {aiHits.map((p, i) => (
                <button key={i} type="button" onClick={() => setText(p)} className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[12px] text-slate-700 hover:bg-violet-50">
                  <Sparkles className="h-3 w-3 shrink-0 text-violet-400" /> <span className="truncate">{p}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
