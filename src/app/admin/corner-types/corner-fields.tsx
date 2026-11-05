'use client';

// 코너 유형 세부 항목 — '코너유형정리' 표 기준 SSOT(CORNER_TYPE_SPECS)에서 구동.
//  2026-10-28 사용자 규칙: 세부 항목 = 표의 필수(red)만, 전부 고정(상세에서 못 끔). 유일한 토글 = 옵션(배너·칩·CTA).
//  2026-10-29 사용자 요청: UI = 사용/미사용 라디오 쌍 + 형태(Variants) 라디오 그룹.
//  2026-10-29(2) 사용자 요청: '기본 정보'(TRow)와 같은 테이블로 — 라벨 셀(회색 150px) + 컨트롤 셀, 가로줄 보더.
//  코너(카드)/아이템(요소) 그룹으로 분리.
import { Children, useEffect, useState } from 'react';
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
function FieldTableRow({ label, keyName, tag, children, bare }: {
  label: string; keyName?: string; tag?: { text: string; color: string }; children: React.ReactNode; bare?: boolean;
}) {
  return (
    <div className={cn('grid items-stretch', bare ? 'h-full grid-cols-[150px_1fr]' : 'grid-cols-[150px_1fr] border-b border-[#eef1f4] last:border-b-0')}>
      <div className="flex h-full flex-col justify-center gap-0.5 bg-[#f8f9fb] px-3 py-2.5">
        <span className="flex flex-wrap items-center gap-1.5 text-[14px] font-medium leading-[1.2] text-[#454f59]">
          {label}
          {tag && (
            <span className="rounded-[4px] px-1 py-[1px] text-[10px] font-semibold" style={{ backgroundColor: `${tag.color}1a`, color: tag.color }}>{tag.text}</span>
          )}
        </span>
        {keyName && <span className="text-[10.5px] font-normal leading-tight text-slate-400">({keyName})</span>}
      </div>
      <div className="flex min-w-0 items-center px-3 py-2">{children}</div>
    </div>
  );
}

// Y/N 라디오 쌍 — 컨트롤 셀 내용(SB v13 표기).
function UsePair({ name, used, disabled, onChange }: { name: string; used: boolean; disabled?: boolean; onChange?: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-4">
      <Radio name={name} label="Y" checked={used} disabled={disabled} onPick={() => onChange?.(true)} />
      <Radio name={name} label="N" checked={!used} disabled={disabled} onPick={() => onChange?.(false)} />
    </div>
  );
}

// 2열 래퍼 — 같은 종류(옵션/고정)끼리만 짝지어 한 줄에 2칸. 홀수면 마지막 칸은 비움(SB v13: 옵션끼리·고정끼리 2열).
function Pairs({ children }: { children: React.ReactNode }) {
  const arr = Children.toArray(children);
  const rows: React.ReactNode[][] = [];
  for (let i = 0; i < arr.length; i += 2) rows.push([arr[i], arr[i + 1] ?? null]);
  return (
    <>
      {rows.map((r, i) => (
        r[1] == null ? (
          // 홀수(짝 없음) — 전폭 1열(가운데 보더 없음, 흰 영역 길게).
          <div key={i} className="border-b border-[#eef1f4] last:border-b-0">{r[0]}</div>
        ) : (
          <div key={i} className="grid grid-cols-2 border-b border-[#eef1f4] last:border-b-0 [&>*:first-child]:border-r [&>*:first-child]:border-[#eef1f4]">
            {r[0]}
            {r[1]}
          </div>
        )
      ))}
    </>
  );
}

// 형태(Variants) — 가로형=Small/Medium/Large, 세로형=Profile/Data/Barcode. 단일 선택이라 라디오.
function VariantControl({ layout, value, onChange, disabled }: { layout?: string | null; value?: string; onChange?: (v: string) => void; disabled?: boolean }) {
  const vertical = /세로/.test(layout ?? '');
  const opts = vertical ? ['Profile', 'Data', 'Barcode'] : ['Small', 'Medium', 'Large'];
  const [local, setLocal] = useState(opts[0]);
  const val = value ?? local;
  const pick = (o: string) => { setLocal(o); onChange?.(o); };
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
      {opts.map((o) => (
        <label key={o} className={cn('flex items-center gap-1.5 text-[13px]', disabled ? 'cursor-default' : 'cursor-pointer')}>
          <input type="radio" name="variantSel" checked={val === o} disabled={disabled} onChange={() => pick(o)} className="h-4 w-4 accent-[#3617ce]" />
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
// 코너 유형 + 배열 → 코너(카드)/아이템(요소) 속성 테이블 + 형태(Variants) + 노출 개수(아이템에 묶음).
export function CornerFieldList({ cornerType, layout, editable, optionKey, onOptionsChange, variantKey, onVariantChange }: { cornerType?: string | null; layout?: string | null; editable?: boolean; optionKey?: string; onOptionsChange?: (o: Record<string, boolean>) => void; variantKey?: string; onVariantChange?: (v: string) => void }) {
  const m = cornerFieldSpec(cornerType, layout);
  const opts = m?.options ?? [];
  // 옵션 아이템 필드(가격·할인율·기간 등) — 배열별 On/Off(2026-11-02 SB 옵션화). 코너(카드) 옵션(배너·칩·CTA)과 같은 저장소(optOn)에 보존.
  const itemOpts = m?.optional?.filter((f) => f.group === 'item') ?? [];
  // 옵션(배너·칩·CTA) + 옵션 아이템 필드 사용/미사용 — editable 이면 전환+로컬 보존, 아니면 '사용' 고정 표시.
  const [optOn, setOptOn] = useState<Record<string, boolean>>(() => Object.fromEntries([...opts.map((o) => [o, true]), ...itemOpts.map((f) => [f.key, f.defaultOn !== false])]));
  useEffect(() => {
    if (!editable || !optionKey) return;
    try { const raw = localStorage.getItem(optionKey); if (raw) setOptOn((p) => ({ ...p, ...JSON.parse(raw) })); } catch { /* noop */ }
  }, [editable, optionKey]);
  // 옵션 변경 → 상위(미리보기)로 전달. 배너·칩·CTA 토글을 코너 미리보기에 반영(2026-10-29(2) 사용자 요청).
  useEffect(() => { onOptionsChange?.(optOn); }, [optOn, onOptionsChange]);
  // 형태(Variants) — 가로형 Small/Medium/Large / 세로형 Profile/Data/Barcode. 선택값을 미리보기(카드 크기)로 전달(2026-10-29(2) 사용자 요청).
  const variantOpts = /세로/.test(layout ?? '') ? ['Profile', 'Data', 'Barcode'] : ['Small', 'Medium', 'Large'];
  const [variant, setVariant] = useState<string>(variantOpts[0]);
  const safeVariant = variantOpts.includes(variant) ? variant : variantOpts[0];
  useEffect(() => {
    if (!editable || !variantKey) return;
    try { const raw = localStorage.getItem(variantKey); if (raw) setVariant(raw); } catch { /* noop */ }
  }, [editable, variantKey]);
  useEffect(() => { onVariantChange?.(safeVariant); }, [safeVariant, onVariantChange]);
  const chooseVariant = (v: string) => { setVariant(v); if (variantKey) { try { localStorage.setItem(variantKey, v); } catch { /* noop */ } } };
  const setOpt = (o: string, v: boolean) => setOptOn((p) => {
    const next = { ...p, [o]: v };
    if (optionKey) { try { localStorage.setItem(optionKey, JSON.stringify(next)); } catch { /* noop */ } }
    return next;
  });

  if (!m) return null;
  const cornerFields = m.required.filter((f) => f.group === 'corner');
  const itemFields = m.required.filter((f) => f.group === 'item');

  // 읽기 모드(비편집)에선 옵션/고정 배지 미표시(라벨 터짐 방지 — 상품형 읽기와 동일) 2026-10-29(2) 사용자 요청.
  const fixedRow = (f: CornerFieldDef, bare?: boolean) => (
    <FieldTableRow key={`fx-${f.group}-${f.ko}-${f.key}`} label={f.ko} keyName={f.key} tag={editable ? { text: '고정', color: '#8b949e' } : undefined} bare={bare}>
      <UsePair name={`fld_${f.group}_${f.key}`} used disabled />
    </FieldTableRow>
  );
  // 옵션 라벨 — 상품형(CornerStudio)과 동일 표기: 배너→배너이미지(BannerSrc)·칩→칩(Chip)·CTA→CTA(CTA).
  const OPT_META: Record<string, { ko: string; code: string }> = {
    '배너': { ko: '배너', code: 'Banner' }, '칩': { ko: '칩', code: 'Chip' }, 'CTA': { ko: 'CTA', code: 'CallToAction' },
  };
  const optionRow = (o: string, bare?: boolean) => {
    const used = editable ? (optOn[o] ?? true) : true;
    const meta = OPT_META[o] ?? { ko: o, code: o };
    return (
      <FieldTableRow key={`opt-${o}`} label={meta.ko} keyName={meta.code} tag={editable ? { text: '옵션', color: '#3617ce' } : undefined} bare={bare}>
        <UsePair name={`opt_${o}_r`} used={used} disabled={!editable} onChange={editable ? (v) => setOpt(o, v) : undefined} />
        {editable && <input type="hidden" name={`opt_${o}`} value={used ? 'on' : ''} />}
      </FieldTableRow>
    );
  };
  // 옵션 아이템 필드 행 — 코너(카드) 옵션과 동일한 '옵션' 배지 + Y/N. key 로 저장(opt_item_<key>).
  const itemOptionRow = (f: CornerFieldDef, bare?: boolean) => {
    // dependsOn(예: 할인율→가격): 상위가 N이면 비활성 + 강제 N.
    const depOff = !!f.dependsOn && optOn[f.dependsOn] === false;
    const used = editable ? (depOff ? false : (optOn[f.key] ?? f.defaultOn !== false)) : true;
    return (
      <FieldTableRow key={`iopt-${f.key}`} label={f.ko} keyName={f.key} tag={editable ? { text: '옵션', color: '#3617ce' } : undefined} bare={bare}>
        <UsePair name={`iopt_${f.key}_r`} used={used} disabled={!editable || depOff} onChange={editable && !depOff ? (v) => setOpt(f.key, v) : undefined} />
        {editable && <input type="hidden" name={`opt_item_${f.key}`} value={used ? 'on' : ''} />}
      </FieldTableRow>
    );
  };
  // 가격 그룹(가격·할인율·기간) — 한 줄에 묶어 N열. 할인율은 가격 종속(SB v13).
  const priceGroupRow = () => (
    <div className="grid border-b border-[#eef1f4] last:border-b-0 [&>*:not(:first-child)]:border-l [&>*:not(:first-child)]:border-[#eef1f4]"
      style={{ gridTemplateColumns: `repeat(${itemOpts.length}, minmax(0,1fr))` }}>
      {itemOpts.map((f) => itemOptionRow(f, true))}
    </div>
  );

  // 세부 항목 없음(배너형·업무진입형 칩형/리스트형 등) — 옵션·필드 모두 없음. 노출 개수는 빌더에서 관리(2026-11-05 사용자 요청).
  if (m.required.length === 0 && m.options.length === 0) {
    return (
      <div className="space-y-2">
        <p className="rounded-md border border-dashed border-[#dce0e5] bg-[#f8f9fb] px-2.5 py-2 text-[12px] text-slate-400">
          {m.note || '세부 항목은 빌더에서 입력 또는 선택해 주세요.'}
        </p>
        {editable && m.minItems != null && (
          <>
            <input type="hidden" name="defaultMinItems" value={m.minItems} readOnly />
            <input type="hidden" name="defaultMaxItems" value={m.maxItems ?? m.minItems} readOnly />
          </>
        )}
      </div>
    );
  }

  const hasCorner = m.options.length > 0 || cornerFields.length > 0;

  return (
    <div className="space-y-3">
      {m.note && <p className="rounded-md border border-dashed border-[#dce0e5] bg-[#f8f9fb] px-2.5 py-1.5 text-[12px] text-slate-400">{m.note}</p>}
      {/* 코너(카드) — 옵션(배너·칩·CTA)끼리 2열, 고정(타이틀·버튼)끼리 2열(SB v13). */}
      {hasCorner && (
        <GroupBox badge="코" color="#3617ce" title="코너(카드)" desc="카드 전체에 1개 (배너·타이틀·버튼)">
          {m.options.length > 0 && <Pairs>{m.options.map((o) => optionRow(o, true))}</Pairs>}
          {cornerFields.length > 0 && <Pairs>{cornerFields.map((f) => fixedRow(f, true))}</Pairs>}
        </GroupBox>
      )}
      {/* 아이템(요소) — 형태(Variants) + 고정 2열 + 가격 그룹(가격·할인율·기간) 한 줄. 노출 개수 범위는 코너 유형 관리에서 제거(빌더에서 정함, 2026-11-05 사용자 요청). */}
      {(itemFields.length > 0 || itemOpts.length > 0) && (
        <GroupBox badge="아" color="#00a058" title="아이템(요소)" desc="리스트에서 반복되는 카드 1개 (이미지·타이틀·가격)">
          {/* 형태(Variants) = 이미지 카드 크기(Small/Medium/Large)만 — 아이템 이미지가 있는 가로형 한정. 세로형·리스트형(이미지 없음)은 숨김. */}
          {itemFields.some((f) => f.key === 'ImageSrc') && !/세로/.test((m.layout ?? layout) ?? '') && (
            <FieldTableRow label="이미지 형태" keyName="Variants">
              <VariantControl layout={m.layout ?? layout} value={safeVariant} onChange={editable ? chooseVariant : undefined} disabled={!editable} />
            </FieldTableRow>
          )}
          {/* 아이템 이미지(ImageSrc)·아이템 타이틀(ItemTitle) = 위아래(각 전체폭)로, 나머지 고정 필드는 2열(2026-11-05 사용자 요청). */}
          {itemFields.filter((f) => f.key === 'ImageSrc' || f.key === 'ItemTitle').map((f) => fixedRow(f))}
          {(() => {
            const rest = itemFields.filter((f) => f.key !== 'ImageSrc' && f.key !== 'ItemTitle');
            return rest.length > 0 ? <Pairs>{rest.map((f) => fixedRow(f, true))}</Pairs> : null;
          })()}
          {itemOpts.length > 0 && priceGroupRow()}
        </GroupBox>
      )}
      {/* 노출 개수 범위 UI는 제거하되 저장값은 hidden으로 보존 — 빌더에서 관리(2026-11-05 사용자 요청). */}
      {editable && m.minItems != null && (
        <>
          <input type="hidden" name="defaultMinItems" value={m.minItems} readOnly />
          <input type="hidden" name="defaultMaxItems" value={m.maxItems ?? m.minItems} readOnly />
        </>
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
