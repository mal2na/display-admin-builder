'use client';

import { useState } from 'react';
import { Plus, Image as ImageIcon, Type, Layers, Sparkles, Package, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type Atom = { id: string; name: string; atomType: string; content: string; imageUrl: string | null; contentVariants: string[] };
type Component = { id: string; name: string; componentType: string; atoms: Atom[] };
type Corner = { id: string; name: string; cornerType: string; layoutDetail: string; mainTitle: string; recSource: string | null; variantCount: number; components: Component[] };

const TEXT_ATOMS = new Set(['TEXT', 'BENEFIT_TEXT', 'INFO', 'PRICE', 'CTA', 'BADGE', 'BUTTON']);

export function CanvasBuilder({ templateId, corners }: { templateId: string; corners: Corner[] }) {
  const [selectedId, setSelectedId] = useState<string>(corners[0]?.id ?? '');
  // 프로토타입 로컬 상태 — 저장 미연동. 방향 확인용으로 ＋가 반응하도록.
  const [extraVars, setExtraVars] = useState<Record<string, string[]>>({});

  const addVar = (atomId: string) => setExtraVars((m) => ({ ...m, [atomId]: [...(m[atomId] ?? []), ''] }));

  return (
    <div className="flex min-h-0 flex-1">
      {/* 좌측 — 코너 빠른 이동 */}
      <aside className="w-44 shrink-0 space-y-1 overflow-y-auto border-r bg-card p-2">
        <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">코너 {corners.length}</p>
        {corners.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedId(c.id)}
            className={cn(
              'flex w-full flex-col items-start gap-0.5 rounded-lg border px-2.5 py-1.5 text-left transition-colors',
              selectedId === c.id ? 'border-violet-400 bg-violet-50' : 'border-transparent hover:bg-secondary',
            )}
          >
            <span className={cn('text-xs font-medium', selectedId === c.id && 'text-violet-700')}>{c.name}</span>
            <span className="text-[10px] text-muted-foreground">{c.cornerType}{c.layoutDetail ? ` · ${c.layoutDetail}` : ''}</span>
          </button>
        ))}
      </aside>

      {/* 중앙 — 캔버스: 코너들이 세로로, 선택한 코너 옆에 구성이 펼쳐짐 */}
      <div className="min-w-0 flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-5xl space-y-3">
          {corners.map((c) => {
            const on = selectedId === c.id;
            return (
              <div key={c.id} className="flex items-stretch gap-3">
                {/* 코너 카드 (캔버스 블록) */}
                <button
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={cn(
                    'flex w-56 shrink-0 flex-col rounded-xl border-2 bg-card p-3 text-left transition-all',
                    on ? 'border-violet-500 shadow-md' : 'border-border hover:border-violet-200',
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold">{c.name}</span>
                    {c.recSource === 'CVM 기반' && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-px text-[9px] font-semibold text-violet-600"><Sparkles className="h-2.5 w-2.5" /> CVM</span>
                    )}
                  </div>
                  <span className="mt-0.5 text-[10px] text-muted-foreground">{c.cornerType}{c.layoutDetail ? ` · ${c.layoutDetail}` : ''}</span>
                  {/* 미니 표현 — 컴포넌트 수 */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {c.components.length === 0 ? (
                      <span className="text-[10px] text-muted-foreground">구성 없음</span>
                    ) : (
                      c.components.slice(0, 4).map((cp) => (
                        <span key={cp.id} className="rounded bg-secondary px-1.5 py-0.5 text-[9px] text-muted-foreground">{cp.componentType}</span>
                      ))
                    )}
                  </div>
                  {c.variantCount > 0 && (
                    <span className="mt-1.5 inline-flex w-fit items-center gap-0.5 rounded bg-amber-50 px-1.5 py-px text-[9px] font-medium text-amber-700"><Layers className="h-2.5 w-2.5" /> 노출 타입 {c.variantCount + 1}종</span>
                  )}
                </button>

                {/* 펼침 화살표 + 구성 패널 (선택 시) */}
                {on && (
                  <>
                    <div className="flex items-center text-violet-300"><ChevronRight className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1 rounded-xl border bg-card p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-muted-foreground">{c.name} · 구성</p>
                        {/* 노출 타입 베리에이션 */}
                        <button type="button" className="inline-flex items-center gap-0.5 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700 hover:bg-amber-100">
                          <Plus className="h-3 w-3" /> 노출 타입
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {c.components.map((cp) => (
                          <div key={cp.id} className="w-64 shrink-0 rounded-lg border bg-muted/20 p-2.5">
                            <div className="mb-1.5 flex items-center gap-1">
                              <span className="rounded bg-violet-100 px-1.5 py-px text-[9px] font-semibold text-violet-700">{cp.componentType}</span>
                              <span className="truncate text-[11px] font-medium">{cp.name}</span>
                            </div>
                            <div className="space-y-1.5">
                              {cp.atoms.map((a) => {
                                const isImg = a.atomType === 'IMAGE' || a.atomType === 'ICON';
                                const localVars = extraVars[a.id] ?? [];
                                return (
                                  <div key={a.id}>
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-10 shrink-0 text-[9px] text-muted-foreground">{isImg ? '이미지' : a.atomType === 'CTA' || a.atomType === 'BUTTON' ? 'CTA' : '문구'}</span>
                                      {isImg ? (
                                        a.imageUrl
                                          ? <span className="flex h-7 flex-1 items-center gap-1 rounded border bg-card px-1.5 text-[9px] text-muted-foreground"><ImageIcon className="h-3 w-3" /> {a.name}</span>
                                          : <span className="flex h-7 flex-1 items-center gap-1 rounded border border-dashed bg-card px-1.5 text-[9px] text-muted-foreground"><ImageIcon className="h-3 w-3" /> 이미지 지정</span>
                                      ) : (
                                        <span className="flex h-7 flex-1 items-center truncate rounded border bg-card px-2 text-[10px]">{a.content || <span className="text-muted-foreground">문구 입력</span>}</span>
                                      )}
                                    </div>
                                    {/* 문구 베리에이션 (텍스트 아톰만) */}
                                    {TEXT_ATOMS.has(a.atomType) && (
                                      <div className="mt-1 space-y-1 pl-10">
                                        {[...a.contentVariants, ...localVars].map((v, i) => (
                                          <span key={i} className="flex h-6 items-center truncate rounded border border-dashed border-violet-200 bg-violet-50/40 px-2 text-[10px] text-violet-700">{v || '대체 문구'}</span>
                                        ))}
                                        <button type="button" onClick={() => addVar(a.id)} className="inline-flex items-center gap-0.5 rounded border border-violet-300 bg-white px-1.5 py-0.5 text-[9px] font-medium text-violet-700 hover:bg-violet-100">
                                          <Plus className="h-2.5 w-2.5" /> 문구 <span className="text-violet-400">CVM 택1</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}

                        {/* 추가 어포던스 */}
                        <div className="flex w-40 shrink-0 flex-col gap-1.5">
                          <button type="button" className="inline-flex items-center justify-center gap-1 rounded-lg border border-dashed bg-card px-2 py-2 text-[11px] font-medium text-muted-foreground hover:border-violet-300 hover:text-violet-700">
                            <Plus className="h-3.5 w-3.5" /> 컴포넌트 추가
                          </button>
                          <button type="button" className="inline-flex items-center justify-center gap-1 rounded-lg border border-dashed bg-card px-2 py-2 text-[11px] font-medium text-muted-foreground hover:border-violet-300 hover:text-violet-700">
                            <Package className="h-3.5 w-3.5" /> 상품 불러오기
                          </button>
                        </div>
                      </div>

                      {c.recSource === 'CVM 기반' && (
                        <p className="mt-2 flex items-center gap-1 rounded-md bg-violet-50 px-2 py-1 text-[10px] text-violet-600">
                          <Sparkles className="h-3 w-3 shrink-0" /> CVM 개인화 코너 — 미리보기는 폴백(운영자 편성), 실서비스는 고객마다 CVM이 조합·택1
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
