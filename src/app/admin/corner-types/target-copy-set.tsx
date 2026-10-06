'use client';

import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Plus, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CVM_TARGET_HINTS } from '@/lib/display-taxonomy';

// ── 타겟별 문구 세트 (문구 세그) — 가안 ────────────────────────────────────────────
//  타이틀 + 상품·혜택 문구를 '타겟(세그먼트)' 하나로 묶어 한 세트로 관리(2026-10-06 사용자 요청).
//   - 왜: CVM이 고객을 한 세그먼트로 판정하면 코너 전체 문구(타이틀·아이템)가 '그 타겟 세트'로 한꺼번에 바뀐다.
//     그래서 문구를 아이템별로 흩어 두지 않고, '타겟 → 전체 문구 세트' 축으로 모아 한번에 컨트롤.
//   - 기본(폴백) 세트 = 미리보기 기준. 등록된 타겟은 실서비스에서 CVM이 택1.
//   - 실제 저장(Corner.mainTitleVariants + 각 Atom.contentVariants)·정식 승인 연동 전 프로토타입 → localStorage 보관.
const AI_GEN_PREFIX: Record<string, string> = {
  '시니어': '어르신께 딱! ',
  '2030': '요즘 핫한 ',
  '재방문': '또 오셨네요, ',
  '위치 인근': '지금 근처에서 ',
  '혜택 보유': '보유 혜택으로 ',
  '신규': '첫 방문 선물, ',
};

export type CopySlot = { key: string; label: string; base: string };
export type CopySeed = { targets: string[]; copy: Record<string, Record<string, string>> };
type Store = { targets: string[]; copy: Record<string, Record<string, string>>; sentAt?: Record<string, string> };

export function TargetCopySet({ cornerTypeId, slots, seed }: { cornerTypeId: string; slots: CopySlot[]; seed?: CopySeed }) {
  const storeKey = `targetCopy:${cornerTypeId}`;
  // 초기값: localStorage(운영자 편집) 우선, 없으면 seed(기존 등록된 베리에이션에서 유추). → 현재 등록된 타겟을 그대로 노출.
  const [store, setStore] = useState<Store>({ targets: [], copy: {} });
  const [sel, setSel] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [adding, setAdding] = useState(false); // '직접 추가' 입력 열림
  const [custom, setCustom] = useState('');
  useEffect(() => {
    let s: Store | null = null;
    try { const r = localStorage.getItem(storeKey); if (r) s = JSON.parse(r) as Store; } catch { /* noop */ }
    if (!s && seed && seed.targets.length) s = { targets: seed.targets, copy: seed.copy };
    if (s) { setStore(s); setSel(s.targets[0] ?? null); }
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeKey]);
  const persist = (s: Store) => { setStore(s); try { localStorage.setItem(storeKey, JSON.stringify(s)); } catch { /* noop */ } };

  const gen = (target: string, base: string) => (AI_GEN_PREFIX[target] ?? '') + base;
  const addable = useMemo(() => CVM_TARGET_HINTS.filter((h) => !store.targets.includes(h.key)), [store.targets]);

  // 타겟 등록 = 모든 슬롯(타이틀+아이템)에 그 타겟 문구를 한꺼번에 생성(AI 기본 생성). "한번에 적용".
  const addTarget = (t: string) => {
    if (store.targets.includes(t)) return;
    const copy = { ...store.copy, [t]: Object.fromEntries(slots.map((s) => [s.key, gen(t, s.base)])) };
    persist({ ...store, targets: [...store.targets, t], copy });
    setSel(t);
  };
  const removeTarget = (t: string) => {
    const copy = { ...store.copy }; delete copy[t];
    const targets = store.targets.filter((x) => x !== t);
    persist({ ...store, targets, copy });
    if (sel === t) setSel(targets[0] ?? null);
  };
  const editSlot = (t: string, key: string, text: string) => {
    persist({ ...store, copy: { ...store.copy, [t]: { ...(store.copy[t] ?? {}), [key]: text } } });
  };
  const regenTarget = (t: string) => {
    persist({ ...store, copy: { ...store.copy, [t]: Object.fromEntries(slots.map((s) => [s.key, gen(t, s.base)])) } });
  };
  const submit = (t: string) => {
    const now = new Date().toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });
    persist({ ...store, sentAt: { ...(store.sentAt ?? {}), [t]: now } });
  };

  if (!loaded) return null;
  const selCopy = sel ? store.copy[sel] ?? {} : {};
  const filledCount = (t: string) => slots.filter((s) => (store.copy[t]?.[s.key] ?? '').trim()).length;

  return (
    <div className="mt-2 rounded-xl border border-[#d9d0ff] bg-[#f6f4ff] p-3">
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[12.5px] font-bold text-[#3616cd]"><Sparkles className="h-4 w-4" /> 타겟별 문구 세트</span>
        <span className="rounded bg-[#3616cd] px-1.5 py-0.5 text-[9px] font-bold text-white">가안</span>
        <span className="text-[11px] text-slate-400">타겟을 고르면 타이틀·상품·혜택 문구가 <b className="font-semibold text-slate-500">한 세트</b>로 적용 · 실서비스 CVM 택1 · 미리보기는 기본(폴백)</span>
      </div>

      {/* 기본(폴백) 세트 — 이 코너의 문구 슬롯 전체(타이틀 + 상품·혜택). 상품은 아래 묶기에 있지만 문구는 여기 한곳에 모아 본다. */}
      <div className="rounded-lg border border-[#e8ebef] bg-white p-2.5">
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">기본</span>
          기본(폴백) 문구 세트 <span className="font-normal text-slate-400">· 타이틀 + 상품·혜택 {slots.length}개</span>
        </p>
        <ul className="space-y-1">
          {slots.map((s) => (
            <li key={s.key} className="flex items-start gap-2 text-[12px]">
              <span className="mt-[1px] w-14 shrink-0 rounded bg-slate-50 px-1.5 py-0.5 text-center text-[10px] font-semibold text-slate-400">{s.label}</span>
              <span className="min-w-0 flex-1 text-slate-600">{s.base.replace(/\s*\n\s*/g, ' ') || '—'}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 타겟 관리 — 현재 등록된 타겟 / 추가 등록 가능한 타겟 */}
      <div className="mt-2.5 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-500">현재 등록된 타겟</span>
          {store.targets.length === 0 && <span className="text-[11px] text-slate-400">아직 없음 — 아래에서 타겟을 추가하세요</span>}
          {store.targets.map((t) => (
            <span key={t} className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] font-medium transition', sel === t ? 'border-[#3616cd] bg-[#3616cd] text-white' : 'border-violet-200 bg-violet-50 text-violet-700')}>
              <button type="button" onClick={() => setSel(t)} className="inline-flex items-center gap-1">
                {t}<span className={cn('rounded px-1 text-[9px] font-bold', filledCount(t) === slots.length ? (sel === t ? 'bg-white/25' : 'bg-emerald-100 text-emerald-600') : 'bg-amber-100 text-amber-600')}>{filledCount(t)}/{slots.length}</span>
              </button>
              <button type="button" onClick={() => removeTarget(t)} title="타겟 제거" className={cn('ml-0.5', sel === t ? 'text-white/80 hover:text-white' : 'text-violet-300 hover:text-violet-600')}><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
        {/* 추가 등록 — 남은 추천 타겟 칩 + 항상 쓸 수 있는 '직접 추가'(커스텀 타겟). 모든 추천 타겟이 등록돼도 직접 추가 가능(2026-10-06). */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-500">타겟 추가</span>
          {addable.map((h) => (
            <button key={h.key} type="button" onClick={() => addTarget(h.key)} title={`${h.axis} · ${h.note}`}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 bg-white px-2 py-0.5 text-[12px] font-medium text-slate-500 hover:border-[#3616cd] hover:text-[#3616cd]">
              <Plus className="h-3 w-3" />{h.key}
            </button>
          ))}
          {!adding ? (
            <button type="button" onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#c9c3f5] bg-[#f6f4ff] px-2 py-0.5 text-[12px] font-semibold text-[#3616cd] hover:bg-[#efeaff]">
              <Plus className="h-3 w-3" />직접 추가
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#c9c3f5] bg-white px-1.5 py-0.5">
              <input autoFocus value={custom} onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const t = custom.trim(); if (t && !store.targets.includes(t)) addTarget(t); setCustom(''); setAdding(false); } if (e.key === 'Escape') { setCustom(''); setAdding(false); } }}
                placeholder="타겟 이름 (예: VIP·신혼)" className="h-5 w-32 min-w-0 border-0 p-0 text-[12px] outline-none placeholder:text-slate-300" />
              <button type="button" onClick={() => { const t = custom.trim(); if (t && !store.targets.includes(t)) addTarget(t); setCustom(''); setAdding(false); }} className="rounded bg-[#3616cd] px-1.5 py-0.5 text-[10px] font-semibold text-white">추가</button>
              <button type="button" onClick={() => { setCustom(''); setAdding(false); }} className="text-slate-300 hover:text-slate-500"><X className="h-3 w-3" /></button>
            </span>
          )}
        </div>
      </div>

      {/* 선택된 타겟 세트 편집 — 전체 문구(타이틀+아이템)를 한 화면에서 한번에 */}
      {sel && (
        <div className="mt-2.5 rounded-lg border border-[#e8ebef] bg-white p-2.5">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[11px] font-bold text-violet-700">{sel}</span>
            <span className="text-[11.5px] font-semibold text-slate-600">타겟 문구 세트</span>
            <button type="button" onClick={() => regenTarget(sel)} className="ml-auto inline-flex items-center gap-1 rounded-md border border-[#d9d0ff] bg-[#f6f4ff] px-2 py-1 text-[11px] font-semibold text-[#3616cd] hover:bg-[#efeaff]">
              <Sparkles className="h-3 w-3" /> AI로 전체 생성
            </button>
          </div>
          <div className="space-y-2">
            {slots.map((s) => (
              <div key={s.key}>
                <div className="mb-0.5 flex items-center gap-1.5">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">{s.label}</span>
                  <span className="truncate text-[10px] text-slate-400">기본: {s.base.replace(/\s*\n\s*/g, ' ') || '—'}</span>
                </div>
                <input value={selCopy[s.key] ?? ''} onChange={(e) => editSlot(sel, s.key, e.target.value)} placeholder={gen(sel, s.base)}
                  className="h-8 w-full rounded-md border border-[#e8ebef] px-2 text-[12px]" />
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10.5px] text-slate-400">{store.sentAt?.[sel] ? <span className="inline-flex items-center gap-1 text-emerald-600"><Check className="h-3 w-3" /> 승인 요청됨 · {store.sentAt[sel]}</span> : '타이틀·상품·혜택 문구가 이 타겟 세트로 한번에 적용됩니다'}</span>
            <button type="button" onClick={() => submit(sel)} className="rounded-md bg-emerald-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-emerald-700">이 세트 승인 요청</button>
          </div>
        </div>
      )}
    </div>
  );
}
