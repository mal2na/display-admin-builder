'use client';

import { useMemo, useState, useTransition, useRef, Fragment } from 'react';
import Link from 'next/link';
import { Search, PenLine, Type, AlignLeft, Sparkles, BarChart3, ChevronRight, Plus, Library, Wand2, X, MapPin, Grid3x3, List, Download, Upload } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { cn } from '@/lib/utils';
import { CVM_TARGET_HINTS } from '@/lib/display-taxonomy';
import { toggleTitleVariant, toggleAtomVariant, addTitleVariant, addAtomVariant, importMessages, setTitleBase, setAtomBase } from './actions';

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

// 유형 정렬·표기 — 정책 PI-DSP-CMP-001의 Atom 유형(텍스트·버튼(CTA)·배지·정보값(설명))을 앞에,
//  '타이틀'은 아톰이 아니라 코너 속성이므로 맨 뒤에 '코너 타이틀'로 구분 표기.
const USE_ORDER = ['텍스트', 'CTA', '배지', '설명'];
const useRank = (u: string) => (u === '타이틀' ? 99 : USE_ORDER.indexOf(u) < 0 ? 50 : USE_ORDER.indexOf(u));
const useLabel = (u: string) => (u === '타이틀' ? '코너 타이틀' : u);

export function MessagesCatalog({ items, library }: { items: MsgItem[]; library: LibEntry[] }) {
  const [q, setQ] = useState('');
  const [useF, setUseF] = useState('전체');
  const [onlyVar, setOnlyVar] = useState(true);
  const [selId, setSelId] = useState<string | null>(null);
  const [mode, setMode] = useState<'matrix' | 'edit'>('matrix'); // 매트릭스(타겟 커버리지) ↔ 편집
  const [, start] = useTransition();

  const uses = useMemo(() => ['전체', ...Array.from(new Set(items.map((i) => i.use))).sort((a, b) => useRank(a) - useRank(b))], [items]);

  // 타겟 컬럼 = 데이터에 실제 쓰인 세그먼트에서 동적 생성(고정 6 폐기). CVM 세그 카탈로그 순서 우선, 그 외는 뒤에.
  //  실서비스 세그 값·매칭은 CVM 소유(PI-DSP-PER-001) — 여기 라벨은 CVM 세그 참조(예시)일 뿐이다.
  const targetCols = useMemo(() => {
    const present = new Set<string>();
    for (const it of items) for (const v of it.variants) if (v.target) present.add(v.target);
    const order = CVM_TARGET_HINTS.map((t) => t.key);
    return [...present].sort((a, b) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b, 'ko');
    });
  }, [items]);

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
    return [...m.entries()].sort((a, b) => useRank(a[0]) - useRank(b[0]));
  }, [list]);

  const withVar = items.filter((i) => i.variants.length > 0).length;
  const totalVars = items.reduce((n, i) => n + i.variants.length, 0);
  const excluded = items.reduce((n, i) => n + i.variants.filter((v) => !v.enabled).length, 0);

  const toggle = (it: MsgItem, index: number) => start(() => {
    if (it.kind === 'title') toggleTitleVariant(it.cornerId, index);
    else toggleAtomVariant(it.id, index);
  });

  // ── 엑셀(CSV) 다운로드 — 현재 목록을 문구ID + 기본 + (실제 쓰인) 타겟 열로 ──
  const exportCsv = () => {
    const cols = ['문구ID', '유형', '사용처', '기본', ...targetCols];
    const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [cols.map(esc).join(',')];
    for (const it of list) {
      const byT = new Map(it.variants.map((v) => [v.target, v.text]));
      lines.push([it.id, it.use, it.usages.join(' | '), it.base, ...targetCols.map((c) => byT.get(c) ?? '')].map(esc).join(','));
    }
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `문구_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };
  // ── 엑셀(CSV) 업로드 — 밀어넣기 ──
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    setBusy(true);
    try {
      const res = await importMessages(await f.text());
      alert(res.ok ? `문구 ${res.updated}개 반영${res.skipped ? ` · ${res.skipped}개 건너뜀` : ''}` : '업로드 실패 — CSV 형식(문구ID·타겟 열)을 확인하세요.');
    } finally { setBusy(false); }
  };

  return (
    <div className="flex h-full flex-col p-6">
      <PageHeader
        trail={['전시 관리', '문구 관리']}
        title="문구 관리"
        subtitle={<>문구를 <b>Atom(표준 단위)</b>로 관리합니다 — 유형별로 모으고, 재사용·사용처로 추적. 하나를 고치면 쓰이는 모든 코너에 반영. 매칭·성과는 CVM.</>}
      />

      {/* 유형 필터 + 요약 */}
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border bg-card p-2.5 text-[12px]">
        <div className="flex flex-wrap items-center gap-1">
          {uses.map((u) => (
            <Fragment key={u}>
              {u === '타이틀' && <span className="mx-0.5 h-4 w-px self-center bg-slate-200" title="아래는 아톰 유형이 아니라 코너 속성" />}
              <button onClick={() => setUseF(u)} className={cn('rounded-md px-2.5 py-1 font-medium', useF === u ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100')}>{useLabel(u)}</button>
            </Fragment>
          ))}
        </div>
        <span className="ml-1 text-muted-foreground">문구 <b className="text-foreground">{withVar}</b></span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> 노출 {totalVars - excluded}</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-slate-400" /> 제외 {excluded}</span>
        <div className="ml-auto flex items-center gap-2">
          {/* 엑셀 업/다운로드 — 대량 관리 */}
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
          <button onClick={() => fileRef.current?.click()} disabled={busy} className="inline-flex h-8 items-center gap-1 rounded-lg border bg-white px-2.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"><Upload className="h-3.5 w-3.5" /> {busy ? '반영 중…' : '엑셀 업로드'}</button>
          <button onClick={exportCsv} className="inline-flex h-8 items-center gap-1 rounded-lg border bg-white px-2.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50"><Download className="h-3.5 w-3.5" /> 엑셀 다운로드</button>
          {/* 뷰 토글 — 매트릭스(타겟 커버리지) ↔ 편집 */}
          <div className="flex rounded-lg border bg-white p-0.5">
            <button onClick={() => setMode('matrix')} className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium', mode === 'matrix' ? 'bg-indigo-600 text-white' : 'text-slate-500')} title="매트릭스"><Grid3x3 className="h-3.5 w-3.5" /> 매트릭스</button>
            <button onClick={() => setMode('edit')} className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium', mode === 'edit' ? 'bg-indigo-600 text-white' : 'text-slate-500')} title="편집"><List className="h-3.5 w-3.5" /> 편집</button>
          </div>
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

      {mode === 'matrix' ? (
        <Matrix groups={groups} targetCols={targetCols} onOpen={(id) => { setSelId(id); setMode('edit'); }} />
      ) : (
        <div className="mt-4 grid min-h-0 flex-1 grid-cols-[340px_minmax(0,1fr)] gap-4">
          <div className="min-h-0 space-y-3 overflow-y-auto pr-1">
            {groups.length === 0 && <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">문구가 없습니다.</div>}
            {groups.map(([g, its]) => (
              <div key={g}>
                <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{useLabel(g)} <span className="text-slate-300">{its.length}</span></p>
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
      )}
    </div>
  );
}

// ── 매트릭스 뷰 — 행=문구(유형별 그룹), 열=기본 + 실제 쓰인 타겟(동적). 행 클릭 → 편집. ──
//  타겟 컬럼은 CVM 세그 카탈로그 참조(예시)이며 고정 스키마가 아니다(PI-DSP-PER-001 · A안).
function Matrix({ groups, targetCols, onOpen }: { groups: [string, MsgItem[]][]; targetCols: string[]; onOpen: (id: string) => void }) {
  const span = 2 + targetCols.length;
  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col">
      <p className="mb-1.5 px-1 text-[11px] text-muted-foreground">
        <span className="font-semibold text-slate-500">타겟 컬럼</span> = 문구에 실제 쓰인 세그먼트(<b className="text-indigo-600">CVM 세그 참조 · 예시</b>) · 고정 스키마 아님 — 실제 매칭은 CVM
      </p>
      <div className="min-h-0 flex-1 overflow-auto rounded-xl border bg-card">
        <table className="w-full border-separate border-spacing-0 text-[12px]" style={{ minWidth: 400 + targetCols.length * 150 }}>
          <thead className="sticky top-0 z-10">
            <tr className="[&>th]:border-b-2 [&>th]:border-slate-200 [&>th]:bg-slate-50 [&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-bold [&>th]:text-slate-600">
              <th className="sticky left-0 z-20 min-w-[240px]">문구</th>
              <th className="min-w-[160px]">기본 <span className="font-normal text-slate-400">· 폴백</span></th>
              {targetCols.map((c) => <th key={c} className="min-w-[150px]">{c}</th>)}
              {targetCols.length === 0 && <th className="min-w-[150px] font-normal text-slate-400">타겟 문구 없음</th>}
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 && <tr><td colSpan={span} className="p-8 text-center text-sm text-muted-foreground">문구가 없습니다.</td></tr>}
            {groups.map(([g, its]) => (
              <Fragment key={g}>
                <tr><td colSpan={span} className="border-b bg-slate-100/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{useLabel(g)} · {its.length}</td></tr>
                {its.map((it) => {
                  const byT = new Map(it.variants.map((v) => [v.target, v]));
                  return (
                    <tr key={it.id} className="group cursor-pointer" onClick={() => onOpen(it.id)}>
                      <td className="sticky left-0 z-10 max-w-[240px] border-b border-slate-100 bg-white px-3 py-2 align-top group-hover:bg-indigo-50/40">
                        <span className="block truncate font-semibold text-slate-800">{it.label}</span>
                        <span className="block truncate text-[10px] text-slate-400">{it.base || '—'}</span>
                      </td>
                      <td className="max-w-[160px] truncate border-b border-slate-100 px-3 py-2 align-top text-slate-500 group-hover:bg-indigo-50/40">{it.base || '—'}</td>
                      {targetCols.map((c) => {
                        const v = byT.get(c);
                        return (
                          <td key={c} className={cn('max-w-[150px] border-b border-l border-slate-100 px-3 py-2 align-top group-hover:bg-indigo-50/40', v ? (v.enabled ? 'text-slate-700' : 'text-slate-400') : 'text-slate-300')}>
                            {v ? <span className={cn('line-clamp-2 whitespace-pre-line', !v.enabled && 'line-through')}>{v.text}</span> : '—'}
                          </td>
                        );
                      })}
                      {targetCols.length === 0 && <td className="border-b border-l border-slate-100 px-3 py-2 text-slate-300">—</td>}
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Detail({ item, onToggle, library }: { item: MsgItem; onToggle: (it: MsgItem, i: number) => void; library: LibEntry[] }) {
  const rule = USE_RULE[item.use];
  const [, startBase] = useTransition();
  const saveBase = (text: string) => {
    if (text.trim() === (item.base ?? '').trim()) return;
    startBase(() => { if (item.kind === 'title') setTitleBase(item.cornerId, text); else setAtomBase(item.id, text); });
  };
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-3 border-b p-5">
        <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', item.kind === 'title' ? 'bg-indigo-100 text-indigo-600' : 'bg-sky-100 text-sky-600')}>{item.kind === 'title' ? <Type className="h-4 w-4" /> : <AlignLeft className="h-4 w-4" />}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-foreground">{item.label} <span className="text-[12px] font-normal text-muted-foreground">· {useLabel(item.use)}</span></p>
          {rule && <p className="mt-0.5 text-[11px] text-muted-foreground">표기 제한: {rule.hint} · 최대 {rule.max}자</p>}
        </div>
        <Link href={item.editHref} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border px-3 text-[12px] font-medium text-muted-foreground hover:bg-secondary"><PenLine className="h-3.5 w-3.5" /> 빌더에서 보기</Link>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {/* 기본(폴백) — 여기(문구 관리)가 편집 장소. 빌더는 가져오기만. */}
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">기본 <span className="font-normal normal-case text-slate-400">· CVM 미매칭·실패 시 폴백 · 여기서 편집</span></p>
          <textarea key={item.id} defaultValue={item.base} onBlur={(e) => saveBase(e.target.value)} placeholder="기본 문구를 입력하세요"
            className="min-h-[52px] w-full resize-y whitespace-pre-line rounded-md border border-slate-200 bg-slate-50 p-2.5 text-[13px] text-slate-800 outline-none focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-200" />
        </div>

        {/* 타겟별 배리에이션 */}
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-indigo-700"><Sparkles className="h-3.5 w-3.5" /> 타겟별 배리에이션 <span className="font-normal text-indigo-400">· 타겟 = CVM 세그 참조(예시) · 매칭·택1은 CVM</span></p>
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
