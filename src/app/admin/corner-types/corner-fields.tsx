'use client';

// 코너 유형 세부 항목 — '코너유형정리' 표 기준 SSOT(CORNER_TYPE_SPECS)에서 구동.
//  2026-10-28 사용자 규칙(상품형에서 확정 → 7종 공통): 세부 항목 = 표의 필수(red)만, 전부 고정(상세에서 못 끔).
//  유일한 토글 = 옵션(배너·칩·CTA — 유형마다 다름). 배열별로 그 배열의 필수만 보여준다(가로형/세로형 등). 상세·편집기 공용.
import { cornerFieldSpec, type CornerFieldDef } from '@/lib/display-taxonomy';

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

// 코너 유형 + 배열 → 그 배열의 필수(고정) 항목(코너/아이템) + 옵션(배너·칩·CTA) + 노출 개수.
export function CornerFieldList({ cornerType, layout }: { cornerType?: string | null; layout?: string | null }) {
  const m = cornerFieldSpec(cornerType, layout);
  if (!m) return null;
  const rows = (group: 'corner' | 'item') => m.required.filter((f) => f.group === group);
  return (
    <div className="space-y-3">
      {m.note && <p className="rounded-md border border-dashed border-[#dce0e5] bg-[#f8f9fb] px-2.5 py-1.5 text-[12px] text-slate-400">{m.note}</p>}
      <Group badge="코" color="#3617ce" title="코너 정보" desc="코너에 1개 (배너·타이틀·라벨·CTA)" rows={rows('corner')} />
      <Group badge="아" color="#00a058" title="아이템 정보" desc="개별 아이템 (이미지·타이틀·가격)" rows={rows('item')} />
      {m.options.length > 0 && (
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
        {m.options.length > 0 && <> · <span className="font-semibold text-[#3617ce]">옵션</span>만 빌더에서 On/Off</>}
        {m.minItems != null && <> · 노출 개수 <b className="text-[#454f59]">{m.minItems}~{m.maxItems}개</b></>}
        {m.rows != null && <> · 로우 <b className="text-[#454f59]">{m.rows}</b></>}
      </p>
    </div>
  );
}
