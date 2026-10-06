'use client';

import { useEffect, useState } from 'react';
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
  // 세그먼트 추천(추천 정책서 TM-REC-012)
  '장기': '오래 함께한 분께, ',
  '고가치': 'VIP 전용, ',
  '이탈위험': '다시 만나서 반가워요, ',
  '결합·가족': '가족과 함께, ',
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
  const [picking, setPicking] = useState(false); // '타겟 불러오기' 피커 열림
  const [picked, setPicked] = useState<string[]>([]); // 피커에서 선택(다중)
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

  // 타겟 등록은 '타겟 불러오기'에서 여러 개를 한 번의 업데이트로 추가(아래 참조). 개별 추가는 더 이상 쓰지 않음.
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
        {/* 타겟 추가 = '불러오기' 형식 — 등록된 세그먼트에서 여러 개를 골라 한번에 가져온다(+ 직접 입력). 2026-10-06 사용자 요청. */}
        <div className="relative flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-500">타겟 추가</span>
          <button type="button" onClick={() => { setPicking((v) => !v); setPicked([]); setCustom(''); }}
            className="inline-flex items-center gap-1 rounded-full border border-[#c9c3f5] bg-[#f6f4ff] px-2.5 py-0.5 text-[12px] font-semibold text-[#3616cd] hover:bg-[#efeaff]">
            <Plus className="h-3 w-3" /> 타겟 불러오기
          </button>
          {picking && (
            <div className="absolute left-14 top-6 z-20 w-72 rounded-xl border border-[#d9d0ff] bg-white p-2.5 shadow-lg">
              <p className="mb-1.5 text-[11px] font-semibold text-slate-600">등록된 세그먼트에서 선택 <span className="font-normal text-slate-400">· 여러 개 선택</span></p>
              <ul className="max-h-44 space-y-0.5 overflow-y-auto">
                {CVM_TARGET_HINTS.map((h) => {
                  const already = store.targets.includes(h.key);
                  const checked = already || picked.includes(h.key);
                  return (
                    <li key={h.key}>
                      <label className={cn('flex items-start gap-2 rounded-md px-1.5 py-1 text-[12px]', already ? 'opacity-50' : 'cursor-pointer hover:bg-slate-50')}>
                        <input type="checkbox" disabled={already} checked={checked} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, h.key] : p.filter((x) => x !== h.key)))} className="mt-0.5 accent-[#3616cd]" />
                        <span className="min-w-0 flex-1">
                          <span className="font-medium text-slate-700">{h.key}</span>{already && <span className="ml-1 text-[10px] font-semibold text-emerald-600">· 등록됨</span>}
                          <span className="block text-[10px] text-slate-400">{h.axis} · {h.note}</span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              {/* 직접 입력(커스텀 세그먼트) — Enter로 선택 목록에 추가 */}
              <div className="mt-1.5 border-t border-slate-100 pt-1.5">
                <input value={custom} onChange={(e) => setCustom(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const t = custom.trim(); if (t && !store.targets.includes(t) && !picked.includes(t)) setPicked((p) => [...p, t]); setCustom(''); } }}
                  placeholder="목록에 없으면 직접 입력 후 Enter (예: VIP·신혼)" className="h-7 w-full rounded-md border border-[#e8ebef] px-2 text-[12px]" />
                {picked.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {picked.map((t) => (
                      <span key={t} className="inline-flex items-center gap-0.5 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-600">{t}
                        <button type="button" onClick={() => setPicked((p) => p.filter((x) => x !== t))} className="text-violet-400 hover:text-violet-600"><X className="h-2.5 w-2.5" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-2 flex justify-end gap-1.5">
                <button type="button" onClick={() => { setPicking(false); setPicked([]); setCustom(''); }} className="rounded-md border px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-50">취소</button>
                <button type="button" disabled={picked.length === 0} onClick={() => {
                  // 여러 타겟을 한 번의 업데이트로 추가(개별 addTarget 반복은 stale store로 마지막 것만 남는 버그).
                  const toAdd = picked.filter((t) => !store.targets.includes(t));
                  if (toAdd.length) {
                    const copy = { ...store.copy };
                    toAdd.forEach((t) => { copy[t] = Object.fromEntries(slots.map((s) => [s.key, gen(t, s.base)])); });
                    persist({ ...store, targets: [...store.targets, ...toAdd], copy });
                    setSel(toAdd[0]);
                  }
                  setPicking(false); setPicked([]); setCustom('');
                }}
                  className="rounded-md bg-[#3616cd] px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-40">불러오기{picked.length > 0 ? ` (${picked.length})` : ''}</button>
              </div>
            </div>
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
