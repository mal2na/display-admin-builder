'use client';

import { useTransition } from 'react';
import { Trash2, Plus, Minus } from 'lucide-react';
import type { NodeView } from '@/components/preview/event-node';
import { componentDef, variantsFor } from '@/lib/event-components';

function VariantRow({ type, p, set }: { type: string; p: Record<string, any>; set: (patch: Record<string, unknown>) => void }) {
  const vs = variantsFor(type);
  if (!vs.length) return null;
  return (
    <Row label="Variant (배리언스)">
      <select defaultValue={p.variant ?? vs[0]} onChange={(e) => set({ variant: e.target.value })} className={inputCls}>
        {vs.map((v) => <option key={v} value={v}>{v}</option>)}
      </select>
    </Row>
  );
}
import { updateNodeProps, deleteNode } from '../../../actions';

// 작은 폼 헬퍼
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
const inputCls = 'h-8 w-full rounded-md border px-2 text-[12px]';

export function PropertiesPanel({ pageId, node, onDelete }: { pageId: string; node: NodeView; onDelete: () => void }) {
  const [, start] = useTransition();
  const p = node.props ?? {};
  const def = componentDef(node.type);

  const set = (patch: Record<string, unknown>) => start(() => updateNodeProps(pageId, node.id, patch));
  const num = (v: string) => (v === '' ? 0 : Number(v));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-bold">{def?.label ?? node.type}</h3>
        <button
          onClick={() => start(() => deleteNode(pageId, node.id).then(onDelete))}
          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" /> 삭제
        </button>
      </div>

      {/* 공통 설정 — 여백 (margin/padding) */}
      <div>
        <p className="mb-2 text-[12px] font-semibold">공통 설정</p>
        <p className="mb-1.5 text-[10px] text-muted-foreground">여백 — 바깥(margin) · 안쪽(padding)</p>
        <div className="rounded-lg border p-3">
          <p className="mb-1 text-center text-[9px] text-muted-foreground">바깥 margin</p>
          <div className="grid grid-cols-3 items-center gap-1">
            <span />
            <input type="number" defaultValue={p.mt ?? 0} onBlur={(e) => set({ mt: num(e.target.value) })} className="h-7 rounded border px-1 text-center text-[11px]" />
            <span />
            <input type="number" defaultValue={p.ml ?? 0} onBlur={(e) => set({ ml: num(e.target.value) })} className="h-7 rounded border px-1 text-center text-[11px]" />
            <div className="rounded bg-slate-100 p-2">
              <p className="mb-1 text-center text-[9px] text-muted-foreground">안쪽 padding</p>
              <div className="grid grid-cols-3 items-center gap-1">
                <span />
                <input type="number" defaultValue={p.pt ?? 0} onBlur={(e) => set({ pt: num(e.target.value) })} className="h-6 rounded border px-1 text-center text-[10px]" />
                <span />
                <input type="number" defaultValue={p.pl ?? 0} onBlur={(e) => set({ pl: num(e.target.value) })} className="h-6 rounded border px-1 text-center text-[10px]" />
                <span className="text-center text-[9px] text-slate-400">{def?.label}</span>
                <input type="number" defaultValue={p.pr ?? 0} onBlur={(e) => set({ pr: num(e.target.value) })} className="h-6 rounded border px-1 text-center text-[10px]" />
                <span />
                <input type="number" defaultValue={p.pb ?? 0} onBlur={(e) => set({ pb: num(e.target.value) })} className="h-6 rounded border px-1 text-center text-[10px]" />
                <span />
              </div>
            </div>
            <input type="number" defaultValue={p.mr ?? 0} onBlur={(e) => set({ mr: num(e.target.value) })} className="h-7 rounded border px-1 text-center text-[11px]" />
            <span />
            <input type="number" defaultValue={p.mb ?? 0} onBlur={(e) => set({ mb: num(e.target.value) })} className="h-7 rounded border px-1 text-center text-[11px]" />
            <span />
          </div>
        </div>
      </div>

      {/* 세부 설정 — 유형별 */}
      <div className="space-y-3">
        <p className="text-[12px] font-semibold">세부 설정</p>
        <TypeFields type={node.type} p={p} set={set} num={num} />
      </div>
    </div>
  );
}

function TypeFields({ type, p, set, num }: { type: string; p: Record<string, any>; set: (patch: Record<string, unknown>) => void; num: (v: string) => number }) {
  // 위치 표시 슬롯 — 내용은 등록정보/시스템에서 관리(편집 불가), 여기서는 위치·여백만 조절
  if (type.startsWith('SLOT_')) {
    return (
      <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3 text-[12px] text-amber-800">
        <p className="font-semibold">{p.label ?? '위치 표시'}</p>
        <p className="mt-1 leading-snug">이 항목은 <b>빌더 밖(기본 정보 등록)</b>에서 관리됩니다. 빌더에서는 <b>위치(순서)·여백</b>만 조절하고 내용은 편집할 수 없습니다.</p>
        <p className="mt-1 text-[11px] opacity-80">{p.note}</p>
      </div>
    );
  }
  switch (type) {
    case 'TEXT':
      return (
        <>
          <Row label="내용"><textarea defaultValue={p.text} onBlur={(e) => set({ text: e.target.value })} rows={3} className="w-full rounded-md border p-2 text-[12px]" /></Row>
          <div className="grid grid-cols-2 gap-2">
            <Row label="크기(px)"><input type="number" defaultValue={p.size} onBlur={(e) => set({ size: num(e.target.value) })} className={inputCls} /></Row>
            <Row label="굵기">
              <select defaultValue={p.weight} onChange={(e) => set({ weight: e.target.value })} className={inputCls}>
                <option value="normal">보통</option><option value="semibold">중간</option><option value="bold">굵게</option>
              </select>
            </Row>
            <Row label="정렬">
              <select defaultValue={p.align} onChange={(e) => set({ align: e.target.value })} className={inputCls}>
                <option value="left">왼쪽</option><option value="center">가운데</option><option value="right">오른쪽</option>
              </select>
            </Row>
            <Row label="색상"><input type="color" defaultValue={p.color} onChange={(e) => set({ color: e.target.value })} className="h-8 w-full rounded-md border" /></Row>
          </div>
        </>
      );
    case 'TABLE':
      return (<><VariantRow type="TABLE" p={p} set={set} /><TableFields p={p} set={set} /></>);
    case 'STEPS':
      return (
        <>
          <VariantRow type="STEPS" p={p} set={set} />
          <Row label="제목"><input defaultValue={p.title} onBlur={(e) => set({ title: e.target.value })} className={inputCls} /></Row>
          <Row label="단계 (줄바꿈으로 구분)"><textarea defaultValue={(p.steps ?? []).join('\n')} onBlur={(e) => set({ steps: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })} rows={5} className="w-full rounded-md border p-2 text-[12px]" /></Row>
        </>
      );
    case 'BENEFIT_CARD':
      return (
        <>
          <VariantRow type="BENEFIT_CARD" p={p} set={set} />
          <Row label="항목 (한 줄에 하나: 이름 | 설명 | 가격)">
            <textarea
              defaultValue={(p.items ?? []).map((it: any) => [it.name, it.desc, it.price].filter(Boolean).join(' | ')).join('\n')}
              onBlur={(e) => set({ items: e.target.value.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [name, desc, price] = l.split('|').map((x) => x.trim()); return { name: name ?? '', desc: desc ?? '', price: price ?? '' }; }) })}
              rows={5}
              className="w-full rounded-md border p-2 text-[12px]"
            />
          </Row>
        </>
      );
    case 'INPUT':
      return (
        <>
          <VariantRow type="INPUT" p={p} set={set} />
          <Row label="라벨"><input defaultValue={p.label} onBlur={(e) => set({ label: e.target.value })} className={inputCls} /></Row>
          <Row label="입력 placeholder"><input defaultValue={p.placeholder} onBlur={(e) => set({ placeholder: e.target.value })} className={inputCls} /></Row>
          <Row label="객관식 보기 (줄바꿈으로 구분)"><textarea defaultValue={(p.options ?? []).join('\n')} onBlur={(e) => set({ options: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })} rows={4} className="w-full rounded-md border p-2 text-[12px]" /></Row>
        </>
      );
    case 'IMAGE':
      return (
        <>
          <VariantRow type="IMAGE" p={p} set={set} />
          <Row label="이미지 URL"><input defaultValue={p.url} onBlur={(e) => set({ url: e.target.value })} placeholder="URL 입력 또는 붙여넣기" className={inputCls} /></Row>
          <Row label="영역 높이(px, 비우면 자동)"><input defaultValue={p.height === 'auto' ? '' : p.height} onBlur={(e) => set({ height: e.target.value === '' ? 'auto' : num(e.target.value) })} placeholder="자동" className={inputCls} /></Row>
          <Row label="모서리 라운드(px)"><input type="number" defaultValue={p.radius} onBlur={(e) => set({ radius: num(e.target.value) })} className={inputCls} /></Row>
          <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" defaultChecked={!!p.overlay} onChange={(e) => set({ overlay: e.target.checked })} /> 어두운 오버레이</label>
          <Row label="오버레이 텍스트"><input defaultValue={p.overlayText} onBlur={(e) => set({ overlayText: e.target.value })} className={inputCls} /></Row>
        </>
      );
    case 'BUTTON':
      return (
        <>
          <Row label="버튼 문구"><input defaultValue={p.label} onBlur={(e) => set({ label: e.target.value })} className={inputCls} /></Row>
          <Row label="링크(href)"><input defaultValue={p.href} onBlur={(e) => set({ href: e.target.value })} className={inputCls} /></Row>
          <div className="grid grid-cols-2 gap-2">
            <Row label="배경색"><input type="color" defaultValue={p.bg} onChange={(e) => set({ bg: e.target.value })} className="h-8 w-full rounded-md border" /></Row>
            <Row label="글자색"><input type="color" defaultValue={p.color} onChange={(e) => set({ color: e.target.value })} className="h-8 w-full rounded-md border" /></Row>
            <Row label="라운드(px)"><input type="number" defaultValue={p.radius} onBlur={(e) => set({ radius: num(e.target.value) })} className={inputCls} /></Row>
          </div>
          <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" defaultChecked={!!p.full} onChange={(e) => set({ full: e.target.checked })} /> 가로 꽉 채우기</label>
        </>
      );
    case 'DIVIDER':
      return (
        <div className="grid grid-cols-2 gap-2">
          <Row label="스타일">
            <select defaultValue={p.style} onChange={(e) => set({ style: e.target.value })} className={inputCls}><option value="solid">실선</option><option value="dashed">점선</option><option value="dotted">점</option></select>
          </Row>
          <Row label="두께(px)"><input type="number" defaultValue={p.thickness} onBlur={(e) => set({ thickness: num(e.target.value) })} className={inputCls} /></Row>
          <Row label="색상"><input type="color" defaultValue={p.color} onChange={(e) => set({ color: e.target.value })} className="h-8 w-full rounded-md border" /></Row>
        </div>
      );
    case 'HTML':
      return <Row label="HTML / CSS / JS 코드"><textarea defaultValue={p.html} onBlur={(e) => set({ html: e.target.value })} rows={8} className="w-full rounded-md border p-2 font-mono text-[11px]" /></Row>;
    case 'ROULETTE':
      return (
        <>
          <Row label="시작 버튼 문구"><input defaultValue={p.startLabel} onBlur={(e) => set({ startLabel: e.target.value })} className={inputCls} /></Row>
          <Row label="구간(줄바꿈으로 구분)"><textarea defaultValue={(p.segments ?? []).join('\n')} onBlur={(e) => set({ segments: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })} rows={5} className="w-full rounded-md border p-2 text-[12px]" /></Row>
        </>
      );
    case 'ACCORDION':
      return (
        <>
          <Row label="헤더 문구"><input defaultValue={p.header} onBlur={(e) => set({ header: e.target.value })} className={inputCls} /></Row>
          <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" defaultChecked={!!p.open} onChange={(e) => set({ open: e.target.checked })} /> 기본 펼침</label>
          <div className="grid grid-cols-2 gap-2">
            <Row label="헤더 배경"><input type="color" defaultValue={p.headerBg} onChange={(e) => set({ headerBg: e.target.value })} className="h-8 w-full rounded-md border" /></Row>
            <Row label="헤더 글자색"><input type="color" defaultValue={p.headerColor} onChange={(e) => set({ headerColor: e.target.value })} className="h-8 w-full rounded-md border" /></Row>
          </div>
        </>
      );
    case 'CARD':
      return (
        <>
          <Row label="배경색"><input type="color" defaultValue={p.bg} onChange={(e) => set({ bg: e.target.value })} className="h-8 w-full rounded-md border" /></Row>
          <Row label="라운드(px)"><input type="number" defaultValue={p.radius} onBlur={(e) => set({ radius: num(e.target.value) })} className={inputCls} /></Row>
          <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" defaultChecked={!!p.shadow} onChange={(e) => set({ shadow: e.target.checked })} /> 그림자</label>
        </>
      );
    case 'HROW':
      return (
        <>
          <Row label="자식 간격(px)"><input type="number" defaultValue={p.gap} onBlur={(e) => set({ gap: num(e.target.value) })} className={inputCls} /></Row>
          <Row label="정렬(교차축)"><select defaultValue={p.align} onChange={(e) => set({ align: e.target.value })} className={inputCls}><option value="start">start</option><option value="center">center</option><option value="end">end</option><option value="stretch">stretch</option></select></Row>
          <Row label="분배(주축)"><select defaultValue={p.justify} onChange={(e) => set({ justify: e.target.value })} className={inputCls}><option value="start">start</option><option value="center">center</option><option value="end">end</option><option value="between">between</option></select></Row>
          <Row label="가로 넘침"><select defaultValue={p.wrap} onChange={(e) => set({ wrap: e.target.value })} className={inputCls}><option value="nowrap">줄바꿈 안함</option><option value="wrap">줄바꿈</option></select></Row>
        </>
      );
    case 'VSTACK':
      return <Row label="자식 간격(px)"><input type="number" defaultValue={p.gap} onBlur={(e) => set({ gap: num(e.target.value) })} className={inputCls} /></Row>;
    // ── 전시(거버넌스) ──
    case 'CORNER':
      return (
        <>
          <div className="rounded-md bg-accent px-2.5 py-1.5 text-[11px] text-accent-foreground">
            {p.cornerType === '그룹' ? '그룹(자유) 코너 · 모든 컴포넌트 허용' : <>코너 유형 <b>{p.cornerType}</b> · 허용 컴포넌트가 제한됩니다 (거버넌스)</>}
          </div>
          <Row label="주요태그"><input defaultValue={p.tag} onBlur={(e) => set({ tag: e.target.value })} placeholder="예: 주요태그 (선택)" className={inputCls} /></Row>
          <Row label="코너 타이틀"><input defaultValue={p.title} onBlur={(e) => set({ title: e.target.value })} className={inputCls} /></Row>
          <Row label="설명(캡션)"><input defaultValue={p.subTitle} onBlur={(e) => set({ subTitle: e.target.value })} placeholder="캡션 정보를 적어주세요 (선택)" className={inputCls} /></Row>
          <div className="grid grid-cols-2 gap-2">
            <Row label="최대 노출 개수(0=제한없음)"><input type="number" defaultValue={p.maxItems} onBlur={(e) => set({ maxItems: num(e.target.value) })} className={inputCls} /></Row>
            <Row label="정렬"><select defaultValue={p.sort} onChange={(e) => set({ sort: e.target.value })} className={inputCls}><option value="수동">수동</option><option value="우선순위">우선순위</option><option value="최신순">최신순</option></select></Row>
          </div>
        </>
      );
    case 'BANNER':
      return (
        <>
          <Row label="타이틀"><input defaultValue={p.title} onBlur={(e) => set({ title: e.target.value })} className={inputCls} /></Row>
          <Row label="서브 문구"><input defaultValue={p.sub} onBlur={(e) => set({ sub: e.target.value })} className={inputCls} /></Row>
          <Row label="CTA"><input defaultValue={p.cta} onBlur={(e) => set({ cta: e.target.value })} className={inputCls} /></Row>
          <Row label="이미지 URL"><input defaultValue={p.image} onBlur={(e) => set({ image: e.target.value })} className={inputCls} /></Row>
          <Row label="배경색"><input type="color" defaultValue={p.bg} onChange={(e) => set({ bg: e.target.value })} className="h-8 w-full rounded-md border" /></Row>
        </>
      );
    case 'PRODUCT':
      return (
        <>
          <Row label="상품명"><input defaultValue={p.name} onBlur={(e) => set({ name: e.target.value })} className={inputCls} /></Row>
          <Row label="가격"><input defaultValue={p.price} onBlur={(e) => set({ price: e.target.value })} className={inputCls} /></Row>
          <Row label="이미지 URL"><input defaultValue={p.image} onBlur={(e) => set({ image: e.target.value })} className={inputCls} /></Row>
        </>
      );
    case 'BENEFIT':
      return (
        <>
          <Row label="혜택 문구"><input defaultValue={p.title} onBlur={(e) => set({ title: e.target.value })} className={inputCls} /></Row>
          <Row label="브랜드"><input defaultValue={p.brand} onBlur={(e) => set({ brand: e.target.value })} className={inputCls} /></Row>
        </>
      );
    case 'CHIP':
      return (
        <>
          <Row label="칩(줄바꿈 구분)"><textarea defaultValue={(p.items ?? []).join('\n')} onBlur={(e) => set({ items: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })} rows={4} className="w-full rounded-md border p-2 text-[12px]" /></Row>
          <Row label="선택 인덱스"><input type="number" defaultValue={p.selected} onBlur={(e) => set({ selected: num(e.target.value) })} className={inputCls} /></Row>
        </>
      );
    default:
      return <p className="text-[12px] text-muted-foreground">추가 속성이 없습니다.</p>;
  }
}

// 표 편집기 (variant + 행/열 + 셀 값)
function TableFields({ p, set }: { p: Record<string, any>; set: (patch: Record<string, unknown>) => void }) {
  const headers: string[] = p.headers ?? [];
  const rows: string[][] = p.rows ?? [];
  const cols = headers.length;

  const setHeader = (i: number, v: string) => { const h = [...headers]; h[i] = v; set({ headers: h }); };
  const setCell = (r: number, c: number, v: string) => { const rr = rows.map((row) => [...row]); rr[r][c] = v; set({ rows: rr }); };
  const addRow = () => set({ rows: [...rows, Array(cols).fill('내용')] });
  const delRow = () => rows.length > 1 && set({ rows: rows.slice(0, -1) });
  const addCol = () => set({ headers: [...headers, `항목 ${cols}`], rows: rows.map((r) => [...r, '내용']) });
  const delCol = () => cols > 1 && set({ headers: headers.slice(0, -1), rows: rows.map((r) => r.slice(0, -1)) });

  return (
    <>
      <Row label="스타일">
        <div className="flex gap-1">
          {['기본', '가로줄', '카드형', '미니멀'].map((v) => (
            <button key={v} onClick={() => set({ variant: v })} className={`rounded-md border px-2 py-1 text-[11px] ${p.variant === v ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}>{v}</button>
          ))}
        </div>
      </Row>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-[11px]">
          <thead>
            <tr>{headers.map((h, i) => <th key={i} className="border-b p-1"><input value={h} onChange={(e) => setHeader(i, e.target.value)} className="w-full rounded bg-slate-50 px-1 py-0.5 text-center font-semibold" /></th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>{r.map((c, ci) => <td key={ci} className="border-b p-1"><input value={c} onChange={(e) => setCell(ri, ci, e.target.value)} className="w-full rounded px-1 py-0.5" /></td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-1">
        <button onClick={addRow} className="inline-flex items-center gap-0.5 rounded-md border px-2 py-1 text-[11px] hover:bg-secondary"><Plus className="h-3 w-3" />행</button>
        <button onClick={delRow} className="inline-flex items-center gap-0.5 rounded-md border px-2 py-1 text-[11px] hover:bg-secondary"><Minus className="h-3 w-3" />행</button>
        <button onClick={addCol} className="inline-flex items-center gap-0.5 rounded-md border px-2 py-1 text-[11px] hover:bg-secondary"><Plus className="h-3 w-3" />열</button>
        <button onClick={delCol} className="inline-flex items-center gap-0.5 rounded-md border px-2 py-1 text-[11px] hover:bg-secondary"><Minus className="h-3 w-3" />열</button>
      </div>
    </>
  );
}
