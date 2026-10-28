'use client';

// 코너 유형 세부 항목 — '코너유형정리' 표 기준 SSOT(CORNER_TYPE_SPECS)에서 구동.
//  2026-10-28 사용자 규칙(상품형에서 확정 → 7종 공통): 세부 항목 = 표의 필수(red)만, 전부 고정(상세에서 못 끔).
//  유일한 토글 = 옵션(배너·칩·CTA — 유형마다 다름). 배열별로 그 배열의 필수만 보여준다(가로형/세로형 등). 상세·편집기 공용.
//  editable=true(편집 폼): 옵션을 클릭형 체크박스(On/Off)로 표시한다(2026-10-28 사용자 요청).
import { useEffect, useState } from 'react';
import { cornerFieldSpec, type CornerFieldDef, type CornerOption } from '@/lib/display-taxonomy';

function FieldRow({ f }: { f: CornerFieldDef }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px]">
      <span className="font-medium text-slate-700">
        {f.ko}
        <span className="ml-1 font-mono text-[11px] text-slate-400">({f.key})</span>
      </span>
      <span className="text-[11px] font-normal text-slate-400">· 고정</span>
      {f.asIs && f.asIs !== f.key && <span className="text-[11px] text-slate-400">· AS-IS {f.asIs}</span>}
      {f.note && <span className="text-[11px] text-slate-400">· {f.note}</span>}
    </div>
  );
}

function Group({ badge, color, title, desc, rows }: { badge: string; color: string; title: string; desc: string; rows: CornerFieldDef[] }) {
  if (!rows.length) return null;
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] text-[10px] font-bold" style={{ backgroundColor: `${color}1a`, color }}>{badge}</span>
        <span className="text-[12px] font-bold text-[#454f59]">{title}</span>
        <span className="text-[11px] text-[#8b949e]">· {desc}</span>
      </div>
      <div className="space-y-1 pl-0.5">{rows.map((f) => <FieldRow key={`${f.group}-${f.ko}-${f.key}`} f={f} />)}</div>
    </div>
  );
}

// 옵션 체크박스(클릭형) — 편집 폼에서 배너·칩·CTA를 On/Off로 보여준다. 기본 On. storageKey 있으면 로컬 보존.
function OptionChecks({ options, storageKey }: { options: readonly CornerOption[]; storageKey?: string }) {
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries(options.map((o) => [o, true])));
  useEffect(() => {
    if (!storageKey) return;
    try { const raw = localStorage.getItem(storageKey); if (raw) setOn((p) => ({ ...p, ...JSON.parse(raw) })); } catch { /* noop */ }
  }, [storageKey]);
  const toggle = (o: string) => setOn((p) => {
    const next = { ...p, [o]: !p[o] };
    if (storageKey) { try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* noop */ } }
    return next;
  });
  return (
    <div className="space-y-1">
      {options.map((o) => {
        const checked = on[o] ?? true;
        return (
          <button key={o} type="button" onClick={() => toggle(o)} className="flex w-full cursor-pointer items-center gap-2 text-left text-[13px]">
            <span className={`flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border transition ${checked ? 'border-[#3617ce] bg-[#3617ce]' : 'border-[#c4c9cf] bg-white'}`}>
              {checked && <svg viewBox="0 0 12 12" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.5 6.5l2.5 2.5 4.5-5" /></svg>}
            </span>
            <span className="font-medium text-slate-700">{o}</span>
            <span className="text-[11px] font-semibold text-[#3617ce]">· 옵션</span>
            <span className={`text-[11px] ${checked ? 'text-[#00a058]' : 'text-slate-400'}`}>· {checked ? 'On' : 'Off'}</span>
            <input type="hidden" name={`opt_${o}`} value={checked ? 'on' : ''} />
          </button>
        );
      })}
    </div>
  );
}

// 코너 유형 + 배열 → 그 배열의 필수(고정) 항목(코너/아이템) + 옵션(배너·칩·CTA) + 노출 개수.
//  editable: 옵션을 클릭형 체크박스로(편집 폼). optionKey: 옵션 On/Off 로컬 보존 키(편집 폼 전용).
export function CornerFieldList({ cornerType, layout, editable, optionKey }: { cornerType?: string | null; layout?: string | null; editable?: boolean; optionKey?: string }) {
  const m = cornerFieldSpec(cornerType, layout);
  if (!m) return null;
  const rows = (group: 'corner' | 'item') => m.required.filter((f) => f.group === group);
  return (
    <div className="space-y-3">
      {m.note && <p className="rounded-md border border-dashed border-[#dce0e5] bg-[#f8f9fb] px-2.5 py-1.5 text-[12px] text-slate-400">{m.note}</p>}
      {/* 옵션 — 편집 폼은 클릭형 체크박스로 맨 위에, 상세(읽기)는 아래 칩으로. */}
      {editable && m.options.length > 0 && (
        <div>
          <div className="mb-1.5 text-[12px] font-bold text-[#454f59]">옵션 <span className="text-[11px] font-normal text-[#8b949e]">· 클릭으로 On/Off</span></div>
          <OptionChecks options={m.options} storageKey={optionKey} />
        </div>
      )}
      <Group badge="코" color="#3617ce" title="코너 정보" desc="코너에 1개 (배너·타이틀·라벨·CTA)" rows={rows('corner')} />
      <Group badge="아" color="#00a058" title="아이템 정보" desc="개별 아이템 (이미지·타이틀·가격)" rows={rows('item')} />
      {!editable && m.options.length > 0 && (
        <div>
          <div className="mb-1.5 text-[12px] font-bold text-[#454f59]">옵션 <span className="text-[11px] font-normal text-[#8b949e]">· 빌더에서 On/Off</span></div>
          <div className="flex flex-wrap gap-1.5">
            {m.options.map((o) => (
              <span key={o} className="inline-flex items-center rounded-[4px] bg-[#ece8ff] px-2 py-0.5 text-[11px] font-semibold text-[#3617ce]">{o}</span>
            ))}
          </div>
        </div>
      )}
      <p className="text-[11px] text-[#8b949e]">
        <span className="text-slate-400">고정 = 모든 필수 항목(상세에서 못 끔)</span>
        {m.options.length > 0 && <> · <span className="font-semibold text-[#3617ce]">옵션</span>만 {editable ? '클릭으로' : '빌더에서'} On/Off</>}
        {m.minItems != null && <> · 노출 개수 <b className="text-[#454f59]">{m.minItems}~{m.maxItems}개</b></>}
        {m.rows != null && <> · 로우 <b className="text-[#454f59]">{m.rows}</b></>}
      </p>
    </div>
  );
}
