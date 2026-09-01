'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { Search, PenLine, Type, AlignLeft, Sparkles, ShieldCheck, BarChart3, ChevronRight } from 'lucide-react';
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

type KindFilter = 'all' | 'title' | 'atom';

export function MessagesCatalog({ rows }: { rows: MessageRow[] }) {
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<KindFilter>('all');
  const [onlyVariants, setOnlyVariants] = useState(true);
  const [selId, setSelId] = useState<string | null>(null);
  const [, start] = useTransition();

  const list = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (onlyVariants && r.variants.length === 0) return false;
      if (kind !== 'all' && r.kind !== kind) return false;
      if (!kw) return true;
      const hay = [r.label, r.base, ...r.variants.map((v) => `${v.target ?? ''} ${v.text}`)].join(' ').toLowerCase();
      return hay.includes(kw);
    });
  }, [rows, q, kind, onlyVariants]);

  const key = (r: MessageRow) => `${r.kind}:${r.holderId}`;
  const selected = list.find((r) => key(r) === selId) ?? list[0] ?? null;

  const totalVars = rows.reduce((n, r) => n + r.variants.length, 0);
  const excluded = rows.reduce((n, r) => n + r.variants.filter((v) => !v.enabled).length, 0);
  const rowsWithVar = rows.filter((r) => r.variants.length > 0).length;

  const toggle = (r: MessageRow, index: number) => {
    start(() => {
      if (r.kind === 'title') toggleTitleVariant(r.holderId, index);
      else toggleAtomVariant(r.holderId, index);
    });
  };

  return (
    <div className="flex h-full flex-col p-6">
      <PageHeader
        trail={['전시 관리', '문구 관리']}
        title="문구 관리"
        subtitle={<>채널이 <b>문구 후보</b>를 보유하고 <b>노출/제외</b>를 통제하는 판입니다. 세그먼트 매칭과 성과·반응률은 CVM이 관리 — 문구 텍스트 편집은 코너·컴포넌트에서.</>}
      />

      {/* 역할 3줄 (회의 모델) */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <RoleCard icon={<Sparkles className="h-4 w-4" />} title="채널 = 재료" desc="문구 후보를 만들어 보유 (UX 라이팅)" />
        <RoleCard icon={<ShieldCheck className="h-4 w-4" />} title="채널 = 통제" desc="어떤 문구가 노출될지 노출/제외" />
        <RoleCard icon={<BarChart3 className="h-4 w-4" />} title="CVM = 매칭·성과" desc="세그 매칭·반응률 원장" muted />
      </div>

      {/* 필터/요약 */}
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border bg-card p-2.5">
        <div className="flex rounded-lg border bg-white p-0.5 text-[12px]">
          {([['all', '전체'], ['title', '타이틀'], ['atom', '문구']] as [KindFilter, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setKind(k)} className={cn('rounded-md px-2.5 py-1 font-medium', kind === k ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-700')}>{l}</button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
          <span>후보 문구 <b className="text-foreground">{rowsWithVar}</b></span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> 노출 {totalVars - excluded}</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-slate-400" /> 제외 {excluded}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground">
            <input type="checkbox" checked={onlyVariants} onChange={(e) => setOnlyVariants(e.target.checked)} className="accent-violet-600" />
            후보 있는 것만 <span className="text-slate-400">(끄면 전체 {rows.length})</span>
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="문구·타겟 검색" className="h-8 w-44 rounded-lg border bg-white pl-7 pr-2 text-xs outline-none focus:ring-2 focus:ring-violet-200" />
          </div>
        </div>
      </div>

      {/* 마스터-디테일 */}
      <div className="mt-4 grid min-h-0 flex-1 grid-cols-[340px_minmax(0,1fr)] gap-4">
        {/* 좌: 목록 */}
        <div className="min-h-0 space-y-1.5 overflow-y-auto pr-1">
          {list.length === 0 && <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">문구가 없습니다.</div>}
          {list.map((r) => {
            const on = r.variants.filter((v) => v.enabled).length;
            const off = r.variants.length - on;
            const sel = selected && key(selected) === key(r);
            return (
              <button key={key(r)} onClick={() => setSelId(key(r))}
                className={cn('flex w-full items-start gap-2 rounded-xl border p-3 text-left transition-colors', sel ? 'border-violet-400 bg-violet-50/50 ring-1 ring-violet-200' : 'bg-card hover:border-slate-300')}>
                <span className={cn('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md', r.kind === 'title' ? 'bg-violet-100 text-violet-600' : 'bg-sky-100 text-sky-600')}>
                  {r.kind === 'title' ? <Type className="h-3.5 w-3.5" /> : <AlignLeft className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-semibold text-foreground">{r.label}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{r.kind === 'title' ? '타이틀' : r.sub}</span>
                  </span>
                  <span className="mt-0.5 line-clamp-1 text-[12px] text-slate-500">{r.base || '(기본 없음)'}</span>
                  <span className="mt-1 flex items-center gap-2 text-[10px]">
                    <span className="text-muted-foreground">후보 {r.variants.length}</span>
                    {on > 0 && <span className="text-emerald-600">노출 {on}</span>}
                    {off > 0 && <span className="text-slate-400">제외 {off}</span>}
                  </span>
                </span>
                <ChevronRight className={cn('mt-2 h-4 w-4 shrink-0', sel ? 'text-violet-400' : 'text-slate-300')} />
              </button>
            );
          })}
        </div>

        {/* 우: 상세 */}
        <div className="min-h-0 overflow-y-auto rounded-xl border bg-card">
          {!selected ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">왼쪽에서 문구를 선택하세요.</div>
          ) : (
            <Detail row={selected} onToggle={toggle} />
          )}
        </div>
      </div>
    </div>
  );
}

function RoleCard({ icon, title, desc, muted }: { icon: React.ReactNode; title: string; desc: string; muted?: boolean }) {
  return (
    <div className={cn('flex items-start gap-2 rounded-xl border p-3', muted ? 'border-dashed bg-slate-50/60' : 'bg-card')}>
      <span className={cn('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg', muted ? 'bg-slate-200 text-slate-500' : 'bg-violet-100 text-violet-600')}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[12px] font-bold text-foreground">{title}</p>
        <p className="text-[11px] leading-tight text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function Detail({ row, onToggle }: { row: MessageRow; onToggle: (r: MessageRow, i: number) => void }) {
  return (
    <div className="flex h-full flex-col">
      {/* 헤더 */}
      <div className="flex items-start gap-3 border-b p-5">
        <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', row.kind === 'title' ? 'bg-violet-100 text-violet-600' : 'bg-sky-100 text-sky-600')}>
          {row.kind === 'title' ? <Type className="h-4 w-4" /> : <AlignLeft className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-foreground">{row.label} <span className="text-[12px] font-normal text-muted-foreground">· {row.kind === 'title' ? '코너 타이틀' : row.sub}</span></p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
            <span className="font-medium">사용처</span>
            {row.usages.map((u, i) => <span key={i} className="rounded bg-secondary px-1.5 py-0.5">{u}</span>)}
          </p>
        </div>
        {row.editHref && (
          <Link href={row.editHref} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border px-3 text-[12px] font-medium text-muted-foreground hover:bg-secondary">
            <PenLine className="h-3.5 w-3.5" /> 빌더에서 편집
          </Link>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {/* 기본(폴백) */}
        <div className="mb-4 rounded-lg border bg-slate-50 p-3">
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">기본 <span className="font-normal normal-case text-slate-400">· CVM 미매칭·실패 시 폴백</span></p>
          <p className="whitespace-pre-line text-[13px] text-slate-800">{row.base || <span className="text-slate-400">(기본 문구 없음)</span>}</p>
        </div>

        {/* 타겟별 후보 */}
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-violet-700"><Sparkles className="h-3.5 w-3.5" /> 타겟별 후보 <span className="font-normal text-violet-400">· CVM이 세그 매칭해 택1</span></p>
        {row.variants.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-[12px] text-muted-foreground">등록된 후보가 없습니다. <Link href={row.editHref} className="text-violet-600 underline">빌더에서 추가</Link></div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-[12px]">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
                <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-semibold">
                  <th className="w-24">타겟</th><th>문구</th><th className="w-40">성과 (반응률)</th><th className="w-20 text-center">노출</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {row.variants.map((v) => (
                  <tr key={v.index} className={cn('align-middle', !v.enabled && 'bg-slate-50/60 opacity-60')}>
                    <td className="px-3 py-2.5">
                      {v.target ? <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">{v.target}</span> : <span className="text-[11px] text-slate-400">타겟없음</span>}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">{v.text || <span className="text-slate-400">(빈 문구)</span>}</td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-400"><BarChart3 className="h-3 w-3" /> CVM 연동 예정</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button onClick={() => onToggle(row, v.index)}
                        className={cn('rounded px-2 py-1 text-[10px] font-bold', v.enabled ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-200 text-slate-500 hover:bg-slate-300')}
                        title={v.enabled ? '노출 가능 — 클릭하면 제외' : '노출 제외 — 클릭하면 노출'}>{v.enabled ? '노출' : '제외'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          <b>노출/제외</b>는 채널 통제입니다(삭제 아님). 제외한 후보는 CVM 매칭에서 빠지고 기본으로 폴백합니다. 문구 <b>추가·수정</b>은 빌더/컴포넌트에서, <b>세그 매칭·성과 원장</b>은 CVM에서.
        </p>
      </div>
    </div>
  );
}
