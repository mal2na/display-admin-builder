'use client';

// 코너 유형 세부 항목 — '코너유형정리' 표 기준 SSOT(CORNER_TYPE_SPECS)에서 구동.
//  2026-10-28 사용자 규칙: 세부 항목 = 표의 필수(red)만, 전부 고정(상세에서 못 끔). 유일한 토글 = 옵션(배너·칩·CTA).
//  2026-10-29 사용자 요청: UI = 사용/미사용 라디오 쌍 + 형태(Variants) 라디오 그룹, 2열 표. 고정=사용 선택+비활성 · 옵션=사용/미사용 전환.
//  코너(카드)/아이템(요소) 그룹으로 분리.
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { cornerFieldSpec, type CornerFieldDef } from '@/lib/display-taxonomy';

// 사용/미사용 라디오 1개.
function Radio({ name, label, checked, disabled, onPick }: {
  name: string; label: string; checked: boolean; disabled?: boolean; onPick?: () => void;
}) {
  return (
    <label className={cn('flex items-center gap-1.5 text-[13px]', disabled ? 'cursor-default' : 'cursor-pointer')}>
      <input type="radio" name={name} checked={checked} disabled={disabled} onChange={() => onPick?.()} className="h-4 w-4 accent-[#3617ce]" />
      <span className={cn('whitespace-nowrap', checked ? (disabled ? 'text-slate-400' : 'text-slate-700') : 'text-slate-400')}>{label}</span>
    </label>
  );
}

// 필드 한 칸 — 라벨(국문+코드) + 사용/미사용 라디오 쌍.
function RadioRow({ label, keyName, used, disabled, name, onChange }: {
  label: string; keyName?: string; used: boolean; disabled?: boolean; name: string; onChange?: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 text-[13px]">
      <span className="min-w-0 flex-1 leading-[1.25]">
        <span className={cn('font-medium', used ? 'text-slate-700' : 'text-slate-400')}>{label}</span>
        {keyName && <span className="block font-mono text-[11px] text-slate-400">({keyName})</span>}
      </span>
      <div className="flex shrink-0 items-center gap-4">
        <Radio name={name} label="사용" checked={used} disabled={disabled} onPick={() => onChange?.(true)} />
        <Radio name={name} label="미사용" checked={!used} disabled={disabled} onPick={() => onChange?.(false)} />
      </div>
    </div>
  );
}

// 형태(Variants) 라디오 그룹 — 가로형=Small/Medium/Large, 세로형=Profile/Data/Barcode. 단일 선택이라 라디오. 2열 표에서 한 줄 전체(full) 차지.
function VariantRow({ layout }: { layout?: string | null }) {
  const vertical = /세로/.test(layout ?? '');
  const opts = vertical ? ['Profile', 'Data', 'Barcode'] : ['Small', 'Medium', 'Large'];
  const [val, setVal] = useState(opts[0]);
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 text-[13px]">
      <span className="min-w-0 flex-1 leading-[1.25]">
        <span className="font-medium text-slate-700">이미지 형태</span>
        <span className="block font-mono text-[11px] text-slate-400">(Variants)</span>
      </span>
      <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-1">
        {opts.map((o) => (
          <label key={o} className="flex cursor-pointer items-center gap-1.5">
            <input type="radio" name="variantSel" checked={val === o} onChange={() => setVal(o)} className="h-4 w-4 accent-[#3617ce]" />
            <span className={cn('whitespace-nowrap', val === o ? 'font-medium text-slate-700' : 'text-slate-500')}>{o}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function GroupHead({ badge, color, title, desc }: { badge: string; color: string; title: string; desc: string }) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5 rounded-md bg-[#f8f9fb] px-2 py-1.5">
      <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] text-[10px] font-bold" style={{ backgroundColor: `${color}1a`, color }}>{badge}</span>
      <span className="text-[12px] font-bold text-[#454f59]">{title}</span>
      <span className="text-[11px] text-[#8b949e]">· {desc}</span>
    </div>
  );
}

// 2열 표 — 필드 칸을 왼→오 흐름으로. full=true 칸은 한 줄 전체.
type Cell = { key: string; node: React.ReactNode; full?: boolean };
function FieldGrid({ cells }: { cells: Cell[] }) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-md border-l border-t border-[#eef1f4]">
      {cells.map((c) => (
        <div key={c.key} className={cn('border-b border-r border-[#eef1f4]', c.full && 'col-span-2')}>
          {c.node}
        </div>
      ))}
    </div>
  );
}

// 노출 개수 — 편집 폼(editable)에서는 직접 설정(최소~최대 입력), 읽기(상세)에서는 범위 표시.
function CountRow({ min, max, editable }: { min: number; max: number; editable?: boolean }) {
  if (editable) {
    return (
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px]">
        <span className="font-medium text-slate-800">노출 개수</span>
        <input name="defaultMinItems" type="number" min={0} max={50} defaultValue={min} className="h-7 w-16 rounded-[6px] border border-[#dce0e5] bg-white px-2 text-[12px]" />
        <span className="text-slate-400">~</span>
        <input name="defaultMaxItems" type="number" min={0} max={50} defaultValue={max} className="h-7 w-16 rounded-[6px] border border-[#dce0e5] bg-white px-2 text-[12px]" />
        <span className="text-[12px] text-slate-500">개</span>
        <span className="text-[11px] text-slate-400">· 코너에 노출할 개수</span>
      </div>
    );
  }
  return (
    <div className="mt-1.5 flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px]">
      <span className="font-medium text-slate-800">노출 개수</span>
      <span className="rounded-[4px] bg-[#f1f3f5] px-2 py-0.5 text-[12px] font-semibold text-[#454f59]">{min}~{max}개</span>
      <span className="text-[11px] text-slate-400">· 실제 개수는 빌더에서</span>
    </div>
  );
}

// 코너 유형 + 배열 → 코너(카드)/아이템(요소) 라디오 표 + 형태(Variants) + 노출 개수(아이템에 묶음).
export function CornerFieldList({ cornerType, layout, editable, optionKey }: { cornerType?: string | null; layout?: string | null; editable?: boolean; optionKey?: string }) {
  const m = cornerFieldSpec(cornerType, layout);
  const opts = m?.options ?? [];
  // 옵션(배너·칩·CTA) 사용/미사용 — editable 이면 전환+로컬 보존, 아니면 '사용' 고정 표시.
  const [optOn, setOptOn] = useState<Record<string, boolean>>(() => Object.fromEntries(opts.map((o) => [o, true])));
  useEffect(() => {
    if (!editable || !optionKey) return;
    try { const raw = localStorage.getItem(optionKey); if (raw) setOptOn((p) => ({ ...p, ...JSON.parse(raw) })); } catch { /* noop */ }
  }, [editable, optionKey]);
  const setOpt = (o: string, v: boolean) => setOptOn((p) => {
    const next = { ...p, [o]: v };
    if (optionKey) { try { localStorage.setItem(optionKey, JSON.stringify(next)); } catch { /* noop */ } }
    return next;
  });

  if (!m) return null;
  const cornerFields = m.required.filter((f) => f.group === 'corner');
  const itemFields = m.required.filter((f) => f.group === 'item');

  const fixedCell = (f: CornerFieldDef): Cell => ({
    key: `fx-${f.group}-${f.ko}-${f.key}`,
    node: <RadioRow label={f.ko} keyName={f.key} used disabled name={`fld_${f.group}_${f.key}`} />,
  });
  const optionCell = (o: string): Cell => {
    const used = editable ? (optOn[o] ?? true) : true;
    return {
      key: `opt-${o}`,
      node: (
        <>
          <RadioRow label={o} used={used} disabled={!editable} name={`opt_${o}_r`} onChange={editable ? (v) => setOpt(o, v) : undefined} />
          {editable && <input type="hidden" name={`opt_${o}`} value={used ? 'on' : ''} />}
        </>
      ),
    };
  };

  // 세부 항목 없음(배너형·업무진입형 탭형·리스트형 등) — 옵션·필드 모두 없음. 노출 개수만 있으면 그것만 설정.
  if (m.required.length === 0 && m.options.length === 0) {
    return (
      <div className="space-y-2">
        <p className="rounded-md border border-dashed border-[#dce0e5] bg-[#f8f9fb] px-2.5 py-2 text-[12px] text-slate-400">
          {m.note || (m.minItems != null ? '노출 개수만 설정합니다 — 소재·문구는 빌더에서 채웁니다.' : '세부 항목 없음 — 내용은 빌더에서 채웁니다.')}
        </p>
        {m.minItems != null && <CountRow min={m.minItems} max={m.maxItems ?? m.minItems} editable={editable} />}
      </div>
    );
  }

  const cornerCells: Cell[] = [...m.options.map(optionCell), ...cornerFields.map(fixedCell)];
  const itemCells: Cell[] = [{ key: 'variants', node: <VariantRow layout={m.layout ?? layout} />, full: true }, ...itemFields.map(fixedCell)];

  return (
    <div className="space-y-3">
      {m.note && <p className="rounded-md border border-dashed border-[#dce0e5] bg-[#f8f9fb] px-2.5 py-1.5 text-[12px] text-slate-400">{m.note}</p>}
      {/* 코너(카드) — 옵션(배너·칩·CTA) 먼저, 그 다음 고정(타이틀·라벨) */}
      {cornerCells.length > 0 && (
        <div>
          <GroupHead badge="코" color="#3617ce" title="코너(카드)" desc="카드 전체에 1개 (배너·타이틀·버튼)" />
          <FieldGrid cells={cornerCells} />
        </div>
      )}
      {/* 아이템(요소) — 형태(Variants) + 고정 필드 + 노출 개수(아이템에 묶음) */}
      {itemFields.length > 0 && (
        <div>
          <GroupHead badge="아" color="#00a058" title="아이템(요소)" desc="리스트에서 반복되는 카드 1개 (이미지·타이틀·가격)" />
          <FieldGrid cells={itemCells} />
          {m.minItems != null && <CountRow min={m.minItems} max={m.maxItems ?? m.minItems} editable={editable} />}
        </div>
      )}
      <p className="px-2 text-[11px] text-[#8b949e]">
        <span className="text-slate-400">고정 = 사용 고정(못 끔)</span>
        {m.options.length > 0 && <> · <span className="font-semibold text-[#3617ce]">옵션</span> = 빌더에서 사용/미사용</>}
      </p>
    </div>
  );
}
