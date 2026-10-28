'use client';

// 코너 유형 세부 항목 — '코너유형정리' 표 기준 SSOT(CORNER_TYPE_SPECS)에서 구동.
//  2026-10-28 사용자 규칙: 세부 항목 = 표의 필수(red)만, 전부 고정(상세에서 못 끔). 유일한 토글 = 옵션(배너·칩·CTA).
//  UI = 상품형 스튜디오와 동일한 체크박스 한 줄(고정=비활성 체크 · 옵션=활성 체크). 코너(카드)/아이템(요소) 그룹으로 분리.
//  editable=true(편집 폼): 옵션을 클릭형 체크박스(On/Off)로. 읽기(상세): 옵션도 비활성 체크로 '있음'만 표시.
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { cornerFieldSpec, type CornerFieldDef, type CornerOption } from '@/lib/display-taxonomy';

// 체크박스 한 줄 — 상품형 스튜디오 ChkRow 와 동일 스타일.
function CheckRow({ label, keyName, checked, disabled, kind, asIs, note, onChange }: {
  label: string; keyName?: string; checked: boolean; disabled?: boolean; kind: '고정' | '옵션'; asIs?: string; note?: string; onChange?: (v: boolean) => void;
}) {
  return (
    <label className={cn('flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md px-2 py-1.5 text-[13px]', disabled ? 'cursor-default' : 'cursor-pointer hover:bg-[#f8f9fb]')}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange?.(e.target.checked)} className="h-4 w-4 accent-[#3617ce]" />
      <span className={checked ? 'font-medium text-slate-800' : 'text-slate-400'}>
        {label}
        {keyName && <span className="ml-1 font-mono text-[11px] text-slate-400">({keyName})</span>}
      </span>
      {kind === '고정' && <span className="text-[11px] text-slate-400">· 고정</span>}
      {kind === '옵션' && <span className="text-[11px] font-semibold text-[#3617ce]">· 옵션</span>}
      {asIs && asIs !== keyName && <span className="text-[11px] text-slate-400">· AS-IS {asIs}</span>}
      {note && <span className="text-[11px] text-slate-400">· {note}</span>}
    </label>
  );
}

function GroupHead({ badge, color, title, desc }: { badge: string; color: string; title: string; desc: string }) {
  return (
    <div className="mb-1 flex items-center gap-1.5 rounded-md bg-[#f8f9fb] px-2 py-1.5">
      <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] text-[10px] font-bold" style={{ backgroundColor: `${color}1a`, color }}>{badge}</span>
      <span className="text-[12px] font-bold text-[#454f59]">{title}</span>
      <span className="text-[11px] text-[#8b949e]">· {desc}</span>
    </div>
  );
}

// 옵션(배너·칩·CTA) — editable 이면 클릭형 체크박스(On/Off, 로컬 보존), 아니면 비활성 체크(있음 표시).
function OptionRows({ options, editable, storageKey }: { options: readonly CornerOption[]; editable?: boolean; storageKey?: string }) {
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries(options.map((o) => [o, true])));
  useEffect(() => {
    if (!editable || !storageKey) return;
    try { const raw = localStorage.getItem(storageKey); if (raw) setOn((p) => ({ ...p, ...JSON.parse(raw) })); } catch { /* noop */ }
  }, [editable, storageKey]);
  const toggle = (o: string) => setOn((p) => {
    const next = { ...p, [o]: !p[o] };
    if (storageKey) { try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* noop */ } }
    return next;
  });
  return (
    <>
      {options.map((o) => {
        const checked = editable ? (on[o] ?? true) : true;
        return (
          <div key={o}>
            <CheckRow label={o} checked={checked} disabled={!editable} kind="옵션" onChange={editable ? () => toggle(o) : undefined} />
            {editable && <input type="hidden" name={`opt_${o}`} value={checked ? 'on' : ''} />}
          </div>
        );
      })}
    </>
  );
}

// 형태(Variants) 세그먼트 — 가로형=Small/Medium/Large, 세로형=Profile/Data/Barcode(상품형 스튜디오와 동일 UI).
function VariantSeg({ layout }: { layout?: string | null }) {
  const vertical = /세로/.test(layout ?? '');
  const opts = vertical ? ['Profile', 'Data', 'Barcode'] : ['Small', 'Medium', 'Large'];
  const [val, setVal] = useState(opts[0]);
  return (
    <div className="flex items-center gap-3 rounded-md px-2 py-1.5">
      <span className="text-[13px] font-medium text-slate-800">형태(Variants) <span className="ml-1 text-[11px] font-normal text-slate-400">· {vertical ? '프로필·데이터·바코드' : '카드 크기'}</span></span>
      <div className="inline-flex overflow-hidden rounded-[6px] border border-[#dce0e5]">
        {opts.map((o) => (
          <button key={o} type="button" onClick={() => setVal(o)} className={`px-2.5 py-1 text-[12px] font-semibold ${val === o ? 'bg-[#3617ce] text-white' : 'bg-white text-[#697582] hover:bg-[#f8f9fb]'}`}>{o}</button>
        ))}
      </div>
    </div>
  );
}

function CountRow({ min, max }: { min: number; max: number }) {
  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px]">
      <span className="font-medium text-slate-800">노출 개수</span>
      <span className="rounded-[4px] bg-[#f1f3f5] px-2 py-0.5 text-[12px] font-semibold text-[#454f59]">{min}~{max}개</span>
      <span className="text-[11px] text-slate-400">· 실제 개수는 빌더에서</span>
    </div>
  );
}

// 코너 유형 + 배열 → 코너(카드)/아이템(요소) 체크박스 목록 + 형태(Variants) + 노출 개수(아이템에 묶음).
export function CornerFieldList({ cornerType, layout, editable, optionKey }: { cornerType?: string | null; layout?: string | null; editable?: boolean; optionKey?: string }) {
  const m = cornerFieldSpec(cornerType, layout);
  if (!m) return null;
  const cornerFields = m.required.filter((f) => f.group === 'corner');
  const itemFields = m.required.filter((f) => f.group === 'item');
  const row = (f: CornerFieldDef) => <CheckRow key={`${f.group}-${f.ko}-${f.key}`} label={f.ko} keyName={f.key} checked disabled kind="고정" asIs={f.asIs} note={f.note} />;

  // 세부 항목 없음(배너형·업무진입형 탭형 등) — 옵션·필드 모두 없음. 노출 개수만 있으면 그것만.
  if (m.required.length === 0 && m.options.length === 0) {
    return (
      <div className="space-y-2">
        <p className="rounded-md border border-dashed border-[#dce0e5] bg-[#f8f9fb] px-2.5 py-2 text-[12px] text-slate-400">
          {m.note || '세부 항목 없음 — 내용은 빌더에서 채웁니다.'}
        </p>
        {m.minItems != null && <CountRow min={m.minItems} max={m.maxItems ?? m.minItems} />}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {m.note && <p className="rounded-md border border-dashed border-[#dce0e5] bg-[#f8f9fb] px-2.5 py-1.5 text-[12px] text-slate-400">{m.note}</p>}
      {/* 코너(카드) — 옵션(배너·칩·CTA) 먼저, 그 다음 고정(타이틀·라벨) */}
      <div>
        <GroupHead badge="코" color="#3617ce" title="코너(카드)" desc="카드 전체에 1개 (배너·타이틀·버튼)" />
        <div className="space-y-0.5">
          {m.options.length > 0 && <OptionRows options={m.options} editable={editable} storageKey={optionKey} />}
          {cornerFields.map(row)}
        </div>
      </div>
      {/* 아이템(요소) — 형태(Variants) + 고정 필드 + 노출 개수(아이템에 묶음, 2026-10-28 사용자 요청) */}
      {itemFields.length > 0 && (
        <div>
          <GroupHead badge="아" color="#00a058" title="아이템(요소)" desc="리스트에서 반복되는 카드 1개 (이미지·타이틀·가격)" />
          <div className="space-y-0.5">
            <VariantSeg layout={m.layout ?? layout} />
            {itemFields.map(row)}
            {m.minItems != null && <CountRow min={m.minItems} max={m.maxItems ?? m.minItems} />}
          </div>
        </div>
      )}
      <p className="px-2 text-[11px] text-[#8b949e]">
        <span className="text-slate-400">고정 = 못 끔</span>
        {m.options.length > 0 && <> · <span className="font-semibold text-[#3617ce]">옵션</span> = 빌더에서 On/Off</>}
      </p>
    </div>
  );
}
