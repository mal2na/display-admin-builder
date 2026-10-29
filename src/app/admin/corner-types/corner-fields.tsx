'use client';

// 코너 유형 세부 항목 — '코너유형정리' 표 기준 SSOT(CORNER_TYPE_SPECS)에서 구동.
//  2026-10-28 사용자 규칙: 세부 항목 = 표의 필수(red)만, 전부 고정(상세에서 못 끔). 유일한 토글 = 옵션(배너·칩·CTA).
//  2026-10-29 사용자 요청: UI = 사용/미사용 라디오 쌍 + 형태(Variants) 라디오 그룹.
//  2026-10-29(2) 사용자 요청: '기본 정보'(TRow)와 같은 테이블로 — 라벨 셀(회색 150px) + 컨트롤 셀, 가로줄 보더.
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

// 표 한 행 — '기본 정보'(TRow)와 동일 규격: 라벨 셀(회색 150px) + 컨트롤 셀. tag = 옵션/고정 배지(라벨 옆).
function FieldTableRow({ label, keyName, tag, children }: {
  label: string; keyName?: string; tag?: { text: string; color: string }; children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[150px_1fr] items-stretch border-b border-[#eef1f4] last:border-b-0">
      <div className="flex h-full flex-col justify-center gap-0.5 bg-[#f8f9fb] px-3.5 py-2.5">
        <span className="flex flex-wrap items-center gap-1.5 text-[14px] font-medium leading-[1.25] text-[#454f59]">
          {label}
          {tag && (
            <span className="rounded-[4px] px-1 py-[1px] text-[10px] font-semibold" style={{ backgroundColor: `${tag.color}1a`, color: tag.color }}>{tag.text}</span>
          )}
        </span>
        {keyName && <span className="font-mono text-[11px] font-normal text-slate-400">({keyName})</span>}
      </div>
      <div className="flex min-w-0 items-center px-3.5 py-2.5">{children}</div>
    </div>
  );
}

// 사용/미사용 라디오 쌍 — 컨트롤 셀 내용.
function UsePair({ name, used, disabled, onChange }: { name: string; used: boolean; disabled?: boolean; onChange?: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-5">
      <Radio name={name} label="사용" checked={used} disabled={disabled} onPick={() => onChange?.(true)} />
      <Radio name={name} label="미사용" checked={!used} disabled={disabled} onPick={() => onChange?.(false)} />
    </div>
  );
}

// 형태(Variants) — 가로형=Small/Medium/Large, 세로형=Profile/Data/Barcode. 단일 선택이라 라디오.
function VariantControl({ layout }: { layout?: string | null }) {
  const vertical = /세로/.test(layout ?? '');
  const opts = vertical ? ['Profile', 'Data', 'Barcode'] : ['Small', 'Medium', 'Large'];
  const [val, setVal] = useState(opts[0]);
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
      {opts.map((o) => (
        <label key={o} className="flex cursor-pointer items-center gap-1.5 text-[13px]">
          <input type="radio" name="variantSel" checked={val === o} onChange={() => setVal(o)} className="h-4 w-4 accent-[#3617ce]" />
          <span className={cn('whitespace-nowrap', val === o ? 'font-medium text-slate-700' : 'text-slate-500')}>{o}</span>
        </label>
      ))}
    </div>
  );
}

// 그룹 — 헤더 바 + 행을 한 박스로 붙임(2026-10-29(2) 사용자 요청: 헤더·테이블 붙이기, 좌우 보더 없이 위아래만).
function GroupBox({ badge, color, title, desc, children }: { badge: string; color: string; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="border-y border-[#eef1f4]">
      <div className="flex items-center gap-1.5 border-b border-[#eef0f3] bg-[#f8f9fb] px-3 py-2">
        <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] text-[10px] font-bold" style={{ backgroundColor: `${color}1a`, color }}>{badge}</span>
        <span className="text-[12px] font-bold text-[#454f59]">{title}</span>
        <span className="text-[11px] text-[#8b949e]">· {desc}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

// 테이블 외곽 — 둥근 보더로 묶어 '기본 정보' 테이블과 같은 덩어리감.
function FieldTable({ children }: { children: React.ReactNode }) {
  // 좌우 보더 없이 위아래만(2026-10-29(2) 사용자 고정 규칙 — 읽기·수정 테이블 공통).
  return <div className="border-y border-[#eef1f4]">{children}</div>;
}

// 노출 개수 범위 — 코너 유형은 '허용 범위(가드레일)'만. 실제 개수는 빌더/CVM이 정함(2026-10-29(2) 사용자 확정: 범위만 남기고 실제는 빌더).
function CountRow({ min, max, editable }: { min: number; max: number; editable?: boolean }) {
  return (
    <FieldTableRow label="노출 개수 범위" keyName="count">
      {editable ? (
        <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
          <input name="defaultMinItems" type="number" min={0} max={50} defaultValue={min} className="h-7 w-16 rounded-[6px] border border-[#dce0e5] bg-white px-2 text-[12px]" />
          <span className="text-slate-400">~</span>
          <input name="defaultMaxItems" type="number" min={0} max={50} defaultValue={max} className="h-7 w-16 rounded-[6px] border border-[#dce0e5] bg-white px-2 text-[12px]" />
          <span className="text-[12px] text-slate-500">개</span>
          <span className="text-[11px] text-slate-400">· 허용 범위(가드레일). 실제 개수는 빌더/CVM에서 정함</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-[13px]">
          <span className="rounded-[4px] bg-[#f1f3f5] px-2 py-0.5 text-[12px] font-semibold text-[#454f59]">{min}~{max}개</span>
          <span className="text-[11px] text-slate-400">· 허용 범위 · 실제 개수는 빌더/CVM</span>
        </div>
      )}
    </FieldTableRow>
  );
}

// 코너 유형 + 배열 → 코너(카드)/아이템(요소) 속성 테이블 + 형태(Variants) + 노출 개수(아이템에 묶음).
export function CornerFieldList({ cornerType, layout, editable, optionKey, onOptionsChange }: { cornerType?: string | null; layout?: string | null; editable?: boolean; optionKey?: string; onOptionsChange?: (o: Record<string, boolean>) => void }) {
  const m = cornerFieldSpec(cornerType, layout);
  const opts = m?.options ?? [];
  // 옵션(배너·칩·CTA) 사용/미사용 — editable 이면 전환+로컬 보존, 아니면 '사용' 고정 표시.
  const [optOn, setOptOn] = useState<Record<string, boolean>>(() => Object.fromEntries(opts.map((o) => [o, true])));
  useEffect(() => {
    if (!editable || !optionKey) return;
    try { const raw = localStorage.getItem(optionKey); if (raw) setOptOn((p) => ({ ...p, ...JSON.parse(raw) })); } catch { /* noop */ }
  }, [editable, optionKey]);
  // 옵션 변경 → 상위(미리보기)로 전달. 배너·칩·CTA 토글을 코너 미리보기에 반영(2026-10-29(2) 사용자 요청).
  useEffect(() => { onOptionsChange?.(optOn); }, [optOn, onOptionsChange]);
  const setOpt = (o: string, v: boolean) => setOptOn((p) => {
    const next = { ...p, [o]: v };
    if (optionKey) { try { localStorage.setItem(optionKey, JSON.stringify(next)); } catch { /* noop */ } }
    return next;
  });

  if (!m) return null;
  const cornerFields = m.required.filter((f) => f.group === 'corner');
  const itemFields = m.required.filter((f) => f.group === 'item');

  // 읽기 모드(비편집)에선 옵션/고정 배지 미표시(라벨 터짐 방지 — 상품형 읽기와 동일) 2026-10-29(2) 사용자 요청.
  const fixedRow = (f: CornerFieldDef) => (
    <FieldTableRow key={`fx-${f.group}-${f.ko}-${f.key}`} label={f.ko} keyName={f.key} tag={editable ? { text: '고정', color: '#8b949e' } : undefined}>
      <UsePair name={`fld_${f.group}_${f.key}`} used disabled />
    </FieldTableRow>
  );
  // 옵션 라벨 — 상품형(CornerStudio)과 동일 표기: 배너→배너이미지(BannerSrc)·칩→칩(Chip)·CTA→CTA(CTA).
  const OPT_META: Record<string, { ko: string; code: string }> = {
    '배너': { ko: '배너이미지', code: 'BannerSrc' }, '칩': { ko: '칩', code: 'Chip' }, 'CTA': { ko: 'CTA', code: 'CTA' },
  };
  const optionRow = (o: string) => {
    const used = editable ? (optOn[o] ?? true) : true;
    const meta = OPT_META[o] ?? { ko: o, code: o };
    return (
      <FieldTableRow key={`opt-${o}`} label={meta.ko} keyName={meta.code} tag={editable ? { text: '옵션', color: '#3617ce' } : undefined}>
        <UsePair name={`opt_${o}_r`} used={used} disabled={!editable} onChange={editable ? (v) => setOpt(o, v) : undefined} />
        {editable && <input type="hidden" name={`opt_${o}`} value={used ? 'on' : ''} />}
      </FieldTableRow>
    );
  };

  // 세부 항목 없음(배너형·업무진입형 탭형·리스트형 등) — 옵션·필드 모두 없음. 노출 개수만 있으면 그것만 설정.
  if (m.required.length === 0 && m.options.length === 0) {
    return (
      <div className="space-y-2">
        <p className="rounded-md border border-dashed border-[#dce0e5] bg-[#f8f9fb] px-2.5 py-2 text-[12px] text-slate-400">
          {m.note || (m.minItems != null ? '노출 개수만 설정합니다 — 소재·문구는 빌더에서 채웁니다.' : '세부 항목 없음 — 내용은 빌더에서 채웁니다.')}
        </p>
        {m.minItems != null && <FieldTable><CountRow min={m.minItems} max={m.maxItems ?? m.minItems} editable={editable} /></FieldTable>}
      </div>
    );
  }

  const hasCorner = m.options.length > 0 || cornerFields.length > 0;

  return (
    <div className="space-y-3">
      {m.note && <p className="rounded-md border border-dashed border-[#dce0e5] bg-[#f8f9fb] px-2.5 py-1.5 text-[12px] text-slate-400">{m.note}</p>}
      {/* 코너(카드) — 옵션(배너·칩·CTA) 먼저, 그 다음 고정(타이틀·라벨) */}
      {hasCorner && (
        <GroupBox badge="코" color="#3617ce" title="코너(카드)" desc="카드 전체에 1개 (배너·타이틀·버튼)">
          {m.options.map(optionRow)}
          {cornerFields.map(fixedRow)}
        </GroupBox>
      )}
      {/* 아이템(요소) — 형태(Variants) + 고정 필드 + 노출 개수(아이템에 묶음) */}
      {itemFields.length > 0 && (
        <GroupBox badge="아" color="#00a058" title="아이템(요소)" desc="리스트에서 반복되는 카드 1개 (이미지·타이틀·가격)">
          <FieldTableRow label="이미지 형태" keyName="Variants">
            <VariantControl layout={m.layout ?? layout} />
          </FieldTableRow>
          {itemFields.map(fixedRow)}
          {m.minItems != null && <CountRow min={m.minItems} max={m.maxItems ?? m.minItems} editable={editable} />}
        </GroupBox>
      )}
      {editable && (
        <p className="px-2 text-[11px] text-[#8b949e]">
          <span className="text-slate-400">고정 = 사용 고정(못 끔)</span>
          {m.options.length > 0 && <> · <span className="font-semibold text-[#3617ce]">옵션</span> = 빌더에서 사용/미사용</>}
        </p>
      )}
    </div>
  );
}
