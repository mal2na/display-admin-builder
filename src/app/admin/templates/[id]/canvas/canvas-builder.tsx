'use client';

import { useState } from 'react';
import { Plus, Sparkles, Layers, Minus, Package, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CornerBlock, DeviceFrame, type PreviewCorner } from '@/components/preview/blocks';

type CornerData = { preview: PreviewCorner; variants: { label: string; typeName?: string }[]; contentVariantCount: number };

const TEXT_ATOMS = new Set(['TEXT', 'BENEFIT_TEXT', 'INFO', 'PRICE', 'CTA', 'BADGE', 'BUTTON']);

export function CanvasBuilder({ templateName, corners }: { templateName: string; corners: CornerData[] }) {
  const [selectedId, setSelectedId] = useState<string>(corners[0]?.preview.id ?? '');
  const [deviceW, setDeviceW] = useState(220);
  const [extraVars, setExtraVars] = useState<Record<string, number>>({});
  const selected = corners.find((c) => c.preview.id === selectedId) ?? corners[0];
  const bodyH = Math.round(deviceW * 1.9);
  const addVar = (id: string) => setExtraVars((m) => ({ ...m, [id]: (m[id] ?? 0) + 1 }));

  return (
    <div className="flex min-h-0 flex-1">
      {/* 좌측 — 코너 목록 (독립 스크롤) */}
      <aside className="w-36 shrink-0 space-y-1 overflow-y-auto border-r bg-card p-2">
        <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">코너 {corners.length}</p>
        {corners.map((c) => (
          <button key={c.preview.id} type="button" onClick={() => setSelectedId(c.preview.id)}
            className={cn('flex w-full flex-col items-start gap-0.5 rounded-lg border px-2 py-1.5 text-left transition-colors',
              selectedId === c.preview.id ? 'border-violet-400 bg-violet-50' : 'border-transparent hover:bg-secondary')}>
            <span className={cn('text-[11px] font-medium', selectedId === c.preview.id && 'text-violet-700')}>{c.preview.name}</span>
            <span className="text-[9px] text-muted-foreground">{c.preview.cornerType}</span>
          </button>
        ))}
      </aside>

      {/* 캔버스 — 렌더 전용, 독립 스크롤. 디바이스(축소) + 선택 코너 노출 타입별 렌더 */}
      <div className="min-w-0 flex-1 overflow-auto bg-muted/30 p-6">
        {/* 디바이스 크기 제어 */}
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground">디바이스</span>
          <div className="inline-flex items-center gap-1 rounded-md border bg-card px-1 py-0.5">
            <button type="button" onClick={() => setDeviceW((w) => Math.max(160, w - 30))} className="flex h-5 w-5 items-center justify-center rounded hover:bg-secondary"><Minus className="h-3 w-3" /></button>
            <span className="w-8 text-center text-[10px] tabular-nums">{Math.round((deviceW / 220) * 100)}%</span>
            <button type="button" onClick={() => setDeviceW((w) => Math.min(360, w + 30))} className="flex h-5 w-5 items-center justify-center rounded hover:bg-secondary"><Plus className="h-3 w-3" /></button>
          </div>
        </div>

        <div className="flex items-start gap-8">
          {/* 디바이스 (자체 내부 스크롤 — bodyHeight 고정) */}
          <div className="shrink-0">
            <DeviceFrame width={deviceW} bodyHeight={bodyH} headerLabel={templateName}>
              {corners.map((c) => (
                <button key={c.preview.id} type="button" onClick={() => setSelectedId(c.preview.id)}
                  className={cn('block w-full rounded-lg text-left transition-all', selectedId === c.preview.id && 'outline outline-2 outline-violet-500')}>
                  <CornerBlock corner={c.preview} />
                </button>
              ))}
            </DeviceFrame>
          </div>

          {/* 선택 코너 — 노출 타입별 카드 (가로 스크롤) */}
          {selected && (
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-semibold">{selected.preview.name}</span>
                {selected.preview.recSource === 'CVM 기반' && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-600"><Sparkles className="h-3 w-3" /> CVM 택1</span>
                )}
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {[{ label: '기본', typeName: selected.preview.layoutDetail || '기본' }, ...selected.variants].map((v, i) => (
                  <div key={i} className="w-[260px] shrink-0">
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <span className={cn('inline-flex h-5 items-center rounded px-1.5 text-[10px] font-bold', i === 0 ? 'bg-violet-600 text-white' : 'bg-amber-100 text-amber-700')}>{i === 0 ? '기본' : `타입 ${i + 1}`}</span>
                      <span className="truncate text-[11px] text-muted-foreground">{v.typeName || v.label}</span>
                    </div>
                    <div className={cn('rounded-2xl border-2 bg-slate-100 p-2', i === 0 ? 'border-violet-300' : 'border-amber-200')}>
                      <CornerBlock corner={selected.preview} />
                    </div>
                  </div>
                ))}
                <button type="button" className="flex w-[130px] shrink-0 flex-col items-center justify-center gap-1.5 self-stretch rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/40 p-3 text-amber-700 hover:bg-amber-50">
                  <Layers className="h-5 w-5" />
                  <span className="text-[11px] font-medium"><Plus className="mr-0.5 inline h-3 w-3" />노출 타입</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 우측 — 고정 인스펙터 (코너 빌딩). 캔버스와 독립 스크롤 → 안 무너짐 */}
      {selected && (
        <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-l bg-card">
          <div className="border-b p-3">
            <div className="mb-1 flex items-center gap-1.5">
              <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">{selected.preview.cornerType}</span>
              <span className="text-sm font-semibold">{selected.preview.name}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">{selected.preview.layoutDetail || '레이아웃 미지정'}</p>
            {selected.preview.recSource === 'CVM 기반' && (
              <p className="mt-1.5 flex items-center gap-1 rounded bg-violet-50 px-2 py-1 text-[10px] text-violet-600"><Sparkles className="h-3 w-3 shrink-0" /> CVM 개인화 — 미리보기는 폴백(운영자 편성)</p>
            )}
          </div>

          <div className="flex-1 space-y-2 p-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-muted-foreground">코너 구성 · 컴포넌트 {selected.preview.components.length}</p>
              <button type="button" className="inline-flex items-center gap-0.5 rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 hover:bg-amber-100"><Layers className="h-3 w-3" /> 노출 타입</button>
            </div>

            {selected.preview.components.map((cp) => (
              <div key={cp.id} className="rounded-lg border bg-muted/20 p-2">
                <div className="mb-1.5 flex items-center gap-1">
                  <span className="rounded bg-violet-100 px-1.5 py-px text-[9px] font-semibold text-violet-700">{cp.componentType}</span>
                  <span className="truncate text-[11px] font-medium">{cp.name}</span>
                </div>
                <div className="space-y-1.5">
                  {cp.atoms.map((a) => {
                    const isImg = a.atomType === 'IMAGE' || a.atomType === 'ICON';
                    const extra = extraVars[a.id] ?? 0;
                    return (
                      <div key={a.id}>
                        <div className="flex items-center gap-1.5">
                          <span className="w-9 shrink-0 text-[9px] text-muted-foreground">{isImg ? '이미지' : a.atomType === 'CTA' || a.atomType === 'BUTTON' ? 'CTA' : '문구'}</span>
                          {isImg ? (
                            <span className="flex h-6 flex-1 items-center gap-1 truncate rounded border bg-card px-1.5 text-[9px] text-muted-foreground"><ImageIcon className="h-3 w-3 shrink-0" /> {a.name}</span>
                          ) : (
                            <span className="flex h-6 flex-1 items-center truncate rounded border bg-card px-2 text-[10px]">{a.content || <span className="text-muted-foreground">문구 입력</span>}</span>
                          )}
                        </div>
                        {TEXT_ATOMS.has(a.atomType) && (
                          <div className="mt-1 space-y-1 pl-[42px]">
                            {Array.from({ length: extra }).map((_, k) => (
                              <span key={k} className="flex h-5 items-center rounded border border-dashed border-violet-200 bg-violet-50/40 px-2 text-[9px] text-violet-500">대체 문구</span>
                            ))}
                            <button type="button" onClick={() => addVar(a.id)} className="inline-flex items-center gap-0.5 rounded border border-violet-300 bg-white px-1.5 py-0.5 text-[9px] font-medium text-violet-700 hover:bg-violet-100"><Plus className="h-2.5 w-2.5" /> 문구 <span className="text-violet-400">CVM 택1</span></button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <button type="button" className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-dashed bg-card px-2 py-2 text-[11px] font-medium text-muted-foreground hover:border-violet-300 hover:text-violet-700"><Plus className="h-3.5 w-3.5" /> 컴포넌트 추가</button>
            <button type="button" className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-dashed bg-card px-2 py-2 text-[11px] font-medium text-muted-foreground hover:border-violet-300 hover:text-violet-700"><Package className="h-3.5 w-3.5" /> 상품 불러오기</button>
            <p className="pt-1 text-[9px] leading-relaxed text-muted-foreground">프로토타입 — 편집·저장은 미연동. 인스펙터는 캔버스와 <b>독립 스크롤</b>이라 코너가 길어도 여기서 안정적으로 편집합니다.</p>
          </div>
        </aside>
      )}
    </div>
  );
}
