'use client';

import { useTransition } from 'react';
import { Trash2, Plus, Minus, Lock } from 'lucide-react';
import type { NodeView } from '@/components/preview/event-node';
import { componentDef, variantsFor } from '@/lib/event-components';
import { AUDIENCES, AUDIENCE_LABEL, nodeAudience, GUEST_CTA_LABEL, MEMBER_CTA_LABEL } from '@/lib/event-layers';
import { updateNodeProps, deleteNode } from '../../../actions';

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

export function PropertiesPanel({ pageId, node, onDelete, onPatch }: { pageId: string; node: NodeView; onDelete: () => void; onPatch?: (nodeId: string, patch: Record<string, unknown>) => void }) {
  const [, start] = useTransition();
  const p = node.props ?? {};
  const def = componentDef(node.type);

  // onPatch가 있으면 낙관적 반영(미리보기 즉시 갱신) + 백그라운드 저장 경로로 위임
  const set = (patch: Record<string, unknown>) => {
    if (onPatch) onPatch(node.id, patch);
    else start(() => updateNodeProps(pageId, node.id, patch));
  };
  const num = (v: string) => (v === '' ? 0 : Number(v));

  const fixed = node.type.startsWith('SLOT_'); // 개발 고정 영역 — 삭제/여백 제어 불가
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-bold">{def?.label ?? node.type}</h3>
        {fixed ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-500 ring-1 ring-inset ring-zinc-300"><Lock className="h-3.5 w-3.5" /> 고정</span>
        ) : (
          <button
            onClick={() => start(() => deleteNode(pageId, node.id).then(onDelete))}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" /> 삭제
          </button>
        )}
      </div>

      {fixed && (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3 text-[12px] text-zinc-600">
          <p className="font-semibold">개발 고정 영역</p>
          <p className="mt-1 leading-snug">{String(p.note ?? '이 영역은 개발에서 고정되어 위치·내용을 변경할 수 없습니다.')}</p>
        </div>
      )}

      {/* 노출 조건 (로그인 상태 분기) — 정책 v0.19: 화면 공통, 노드별 조건으로 로그인/비로그인 분기 */}
      {!fixed && (
        <div>
          <p className="mb-1.5 text-[12px] font-semibold">노출 조건 <span className="font-normal text-muted-foreground">· 로그인 상태</span></p>
          <div className="flex overflow-hidden rounded-lg border">
            {AUDIENCES.map((a) => (
              <button
                key={a}
                onClick={() => set({ audience: a })}
                className={`flex-1 px-2 py-1.5 text-[12px] font-medium ${nodeAudience(p) === a ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
              >
                {AUDIENCE_LABEL[a]}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[10px] leading-snug text-muted-foreground">공통은 모두에게, 로그인/비로그인 전용은 해당 상태에서만 노출됩니다. 상단 <b>미리보기 대상</b> 토글로 확인하세요.</p>
        </div>
      )}

      {/* CTA 라벨 — SLOT_CTA는 위치는 고정이지만 문구는 운영자가 관리. 비로그인 시 로그인 유도 CTA 자동 노출 */}
      {node.type === 'SLOT_CTA' && (
        <div className="space-y-2">
          <p className="text-[12px] font-semibold">CTA 라벨</p>
          <label className="block text-[11px] text-muted-foreground">로그인 상태
            <input defaultValue={p.label ?? MEMBER_CTA_LABEL} onBlur={(e) => set({ label: e.target.value })} className={inputCls} />
          </label>
          <label className="block text-[11px] text-muted-foreground">비로그인 (로그인 유도 CTA)
            <input defaultValue={p.guestLabel ?? GUEST_CTA_LABEL} onBlur={(e) => set({ guestLabel: e.target.value })} className={inputCls} />
          </label>
          <p className="text-[10px] leading-snug text-muted-foreground">비로그인 대상에겐 자동으로 로그인 유도 문구가 노출됩니다 (CTA 라벨 매트릭스).</p>
        </div>
      )}

      {/* 공통 설정 — 여백 (margin/padding) — 고정 영역은 제외 */}
      {!fixed && (
      <div>
        <p className="mb-2 text-[12px] font-semibold">공통 설정</p>
        <p className="mb-1.5 text-[10px] text-muted-foreground">여백 — 바깥(margin) · 안쪽(padding)</p>
        <div className="rounded-lg border p-3">
          <p className="mb-1 text-center text-[9px] text-muted-foreground">바깥 margin</p>
          <div className="grid grid-cols-3 items-center gap-1">
            <span />
            <input type="number" defaultValue={p.mt ?? 0} onChange={(e) => set({ mt: num(e.target.value) })} className="h-7 rounded border px-1 text-center text-[11px]" />
            <span />
            <input type="number" defaultValue={p.ml ?? 0} onChange={(e) => set({ ml: num(e.target.value) })} className="h-7 rounded border px-1 text-center text-[11px]" />
            <div className="rounded bg-slate-100 p-2">
              <p className="mb-1 text-center text-[9px] text-muted-foreground">안쪽 padding</p>
              <div className="grid grid-cols-3 items-center gap-1">
                <span />
                <input type="number" defaultValue={p.pt ?? 0} onChange={(e) => set({ pt: num(e.target.value) })} className="h-6 rounded border px-1 text-center text-[10px]" />
                <span />
                <input type="number" defaultValue={p.pl ?? 0} onChange={(e) => set({ pl: num(e.target.value) })} className="h-6 rounded border px-1 text-center text-[10px]" />
                <span className="text-center text-[9px] text-slate-400">{def?.label}</span>
                <input type="number" defaultValue={p.pr ?? 0} onChange={(e) => set({ pr: num(e.target.value) })} className="h-6 rounded border px-1 text-center text-[10px]" />
                <span />
                <input type="number" defaultValue={p.pb ?? 0} onChange={(e) => set({ pb: num(e.target.value) })} className="h-6 rounded border px-1 text-center text-[10px]" />
                <span />
              </div>
            </div>
            <input type="number" defaultValue={p.mr ?? 0} onChange={(e) => set({ mr: num(e.target.value) })} className="h-7 rounded border px-1 text-center text-[11px]" />
            <span />
            <input type="number" defaultValue={p.mb ?? 0} onChange={(e) => set({ mb: num(e.target.value) })} className="h-7 rounded border px-1 text-center text-[11px]" />
            <span />
          </div>
        </div>
      </div>
      )}

      {/* 세부 설정 — 유형별 (고정 영역은 편집 항목 없음) */}
      {!fixed && (
      <div className="space-y-3">
        <p className="text-[12px] font-semibold">세부 설정</p>
        <TypeFields type={node.type} p={p} set={set} num={num} />
      </div>
      )}
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
    case 'BENEFIT_ITEM':
      return (
        <>
          <Row label="혜택 이름"><input defaultValue={p.name} onBlur={(e) => set({ name: e.target.value })} className={inputCls} /></Row>
          <Row label="설명(선택)"><input defaultValue={p.desc} onBlur={(e) => set({ desc: e.target.value })} className={inputCls} /></Row>
          <Row label="배지(예: 무료 · 20%)"><input defaultValue={p.badge} onBlur={(e) => set({ badge: e.target.value })} className={inputCls} /></Row>
          <Row label="이미지 URL"><input defaultValue={p.image} onBlur={(e) => set({ image: e.target.value })} placeholder="URL 입력 또는 붙여넣기" className={inputCls} /></Row>
        </>
      );
    case 'BRAND':
      return (
        <>
          <Row label="카테고리"><input defaultValue={p.category} onBlur={(e) => set({ category: e.target.value })} placeholder="예: 건강 · 교육 · 여행" className={inputCls} /></Row>
          <Row label="브랜드명"><input defaultValue={p.brand} onBlur={(e) => set({ brand: e.target.value })} className={inputCls} /></Row>
          <Row label="등급 (VGS)">
            <select defaultValue={p.grade} onChange={(e) => set({ grade: e.target.value })} className={inputCls}>
              <option value="ALL">전체 등급</option>
              <option value="VVIP">VVIP</option>
              <option value="VIP">VIP</option>
              <option value="GOLD">GOLD</option>
              <option value="SILVER">SILVER</option>
            </select>
          </Row>
          <Row label="브랜드 로고 이미지 등록">
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
              <div className="mb-2 flex items-center gap-3">
                {p.logo ? (
                  <img src={p.logo} alt="" className="h-10 w-10 rounded-full object-cover ring-1 ring-slate-200" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[9px] text-slate-400 ring-1 ring-slate-200">로고</div>
                )}
                <span className="text-[11px] leading-snug text-muted-foreground">브랜드 로고 이미지 URL을 등록하면<br />여기와 미리보기에 반영됩니다.</span>
              </div>
              <input defaultValue={p.logo} onBlur={(e) => set({ logo: e.target.value })} placeholder="이미지 URL 입력 또는 붙여넣기" className={inputCls} />
            </div>
          </Row>
          <Row label="혜택 목록 (줄바꿈으로 구분)"><textarea defaultValue={(p.benefits ?? []).join('\n')} onBlur={(e) => set({ benefits: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })} rows={4} className="w-full rounded-md border p-2 text-[12px]" /></Row>
          <div className="grid grid-cols-2 gap-2">
            <Row label="자세히보기 라벨"><input defaultValue={p.moreLabel} onBlur={(e) => set({ moreLabel: e.target.value })} className={inputCls} /></Row>
            <Row label="링크"><input defaultValue={p.moreLink} onBlur={(e) => set({ moreLink: e.target.value })} placeholder="/brand/..." className={inputCls} /></Row>
          </div>
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
          <Row label="코너 타이틀"><input defaultValue={p.title} onBlur={(e) => set({ title: e.target.value })} placeholder="예: ‘free’ 하게 누리는 14가지 혜택" className={inputCls} /></Row>
          <Row label="설명(캡션)"><input defaultValue={p.subTitle} onBlur={(e) => set({ subTitle: e.target.value })} placeholder="캡션 정보를 적어주세요 (선택)" className={inputCls} /></Row>
          {p.cornerType === '그룹' && (
            <Row label="레이아웃 (아이템 배치)">
              <select defaultValue={p.layout ?? 'list'} onChange={(e) => set({ layout: e.target.value })} className={inputCls}>
                <option value="list">리스트 (세로)</option>
                <option value="grid">2열 그리드</option>
                <option value="scroll">가로 스크롤</option>
              </select>
            </Row>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Row label="최대 노출 개수(0=제한없음)"><input type="number" defaultValue={p.maxItems} onBlur={(e) => set({ maxItems: num(e.target.value) })} className={inputCls} /></Row>
            <Row label="정렬"><select defaultValue={p.sort} onChange={(e) => set({ sort: e.target.value })} className={inputCls}><option value="수동">수동</option><option value="우선순위">우선순위</option><option value="최신순">최신순</option></select></Row>
          </div>
          <p className="rounded-md border border-dashed bg-muted/30 px-2.5 py-2 text-[11px] leading-snug text-muted-foreground">전시화면처럼 이 코너에 <b>혜택 항목·상품·브랜드</b> 등을 <b>‘추가’ 탭에서 하나씩</b> 넣고, 위 레이아웃으로 배치하세요. 순서는 드래그로 변경됩니다.</p>

          {/* 빅배너 — 코너 부속 배너(TM-DSP-019). 유형은 그대로 두고 '구분자'로 배너를 얹는다. */}
          <div className="rounded-lg border p-3">
            <label className="flex items-center gap-2 text-[12px] font-semibold">
              <input type="checkbox" defaultChecked={!!p.bigBanner} onChange={(e) => set({ bigBanner: e.target.checked })} className="accent-primary" />
              빅배너 추가 <span className="font-normal text-muted-foreground">· 상품형 등 코너에 배너를 얹는 구분자</span>
            </label>
            <div className="mt-2 space-y-2">
              <Row label="배너 문구"><input defaultValue={p.bannerTitle} onBlur={(e) => set({ bannerTitle: e.target.value })} placeholder="예: iPhone 20 사전 예약 시 에어팟 프로 증정" className={inputCls} /></Row>
              <Row label="배너 서브문구"><input defaultValue={p.bannerSub} onBlur={(e) => set({ bannerSub: e.target.value })} placeholder="예: 사전예약 클립 멤버십 혜택" className={inputCls} /></Row>
              <Row label="배너 이미지 URL"><input defaultValue={p.bannerImage} onBlur={(e) => set({ bannerImage: e.target.value })} placeholder="URL 입력 (없으면 그라데이션)" className={inputCls} /></Row>
              <Row label="배너 링크"><input defaultValue={p.bannerLink} onBlur={(e) => set({ bannerLink: e.target.value })} placeholder="/..." className={inputCls} /></Row>
            </div>
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
