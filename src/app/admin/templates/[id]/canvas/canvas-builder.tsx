'use client';

import { useState } from 'react';
import { Plus, Sparkles, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CornerBlock, DeviceFrame, type PreviewCorner } from '@/components/preview/blocks';

type CornerData = { preview: PreviewCorner; variants: { label: string; typeName?: string }[]; contentVariantCount: number };

export function CanvasBuilder({ templateName, corners }: { templateName: string; corners: CornerData[] }) {
  const [selectedId, setSelectedId] = useState<string>(corners[0]?.preview.id ?? '');
  const selected = corners.find((c) => c.preview.id === selectedId) ?? corners[0];

  return (
    <div className="flex min-h-0 flex-1">
      {/* 좌측 — 코너 빠른 이동 */}
      <aside className="w-40 shrink-0 space-y-1 overflow-y-auto border-r bg-card p-2">
        <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">코너 {corners.length}</p>
        {corners.map((c) => (
          <button key={c.preview.id} type="button" onClick={() => setSelectedId(c.preview.id)}
            className={cn('flex w-full flex-col items-start gap-0.5 rounded-lg border px-2.5 py-1.5 text-left transition-colors',
              selectedId === c.preview.id ? 'border-violet-400 bg-violet-50' : 'border-transparent hover:bg-secondary')}>
            <span className={cn('text-xs font-medium', selectedId === c.preview.id && 'text-violet-700')}>{c.preview.name}</span>
            <span className="text-[10px] text-muted-foreground">{c.preview.cornerType}</span>
          </button>
        ))}
      </aside>

      {/* 캔버스 — 작은 디바이스(전체 맥락) + 선택 코너를 노출 타입별로 옆에 렌더 */}
      <div className="min-w-0 flex-1 overflow-auto p-6">
        <div className="flex items-start gap-8">

          {/* 작은 디바이스 */}
          <div className="shrink-0">
            <p className="mb-2 text-[11px] font-semibold text-muted-foreground">전체 화면 (축소)</p>
            <DeviceFrame width={240} bodyHeight={460} headerLabel={templateName}>
              {corners.map((c) => (
                <button key={c.preview.id} type="button" onClick={() => setSelectedId(c.preview.id)}
                  className={cn('block w-full rounded-lg text-left transition-all', selectedId === c.preview.id && 'outline outline-2 outline-violet-500')}>
                  <CornerBlock corner={c.preview} />
                </button>
              ))}
            </DeviceFrame>
          </div>

          {/* 선택 코너 — 노출 타입별 카드가 옆으로 펼쳐짐 */}
          {selected && (
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">{selected.preview.cornerType}</span>
                <span className="text-sm font-semibold">{selected.preview.name}</span>
                {selected.preview.recSource === 'CVM 기반' && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-600"><Sparkles className="h-3 w-3" /> CVM</span>
                )}
                <span className="ml-auto text-[11px] text-muted-foreground">노출 타입별 · 실서비스는 CVM이 고객마다 택1</span>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-2">
                {/* 기본 + 등록된 노출 타입 베리에이션 */}
                {[{ label: '기본', typeName: selected.preview.layoutDetail || '기본' }, ...selected.variants].map((v, i) => (
                  <div key={i} className="w-[280px] shrink-0">
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <span className={cn('inline-flex h-5 items-center rounded px-1.5 text-[10px] font-bold', i === 0 ? 'bg-violet-600 text-white' : 'bg-amber-100 text-amber-700')}>{i === 0 ? '기본' : `타입 ${i + 1}`}</span>
                      <span className="truncate text-[11px] text-muted-foreground">{v.typeName || v.label}</span>
                    </div>
                    <div className={cn('rounded-2xl border-2 bg-slate-100 p-2', i === 0 ? 'border-violet-300' : 'border-amber-200')}>
                      <CornerBlock corner={selected.preview} />
                    </div>
                    {i > 0 && <p className="mt-1 text-center text-[9px] text-amber-600">CVM 후보 · 프로토타입은 동일 콘텐츠</p>}
                  </div>
                ))}

                {/* 노출 타입 추가 */}
                <button type="button" className="flex w-[140px] shrink-0 flex-col items-center justify-center gap-1.5 self-stretch rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/40 p-3 text-amber-700 hover:bg-amber-50">
                  <Layers className="h-5 w-5" />
                  <span className="text-[11px] font-medium"><Plus className="mr-0.5 inline h-3 w-3" />노출 타입</span>
                  <span className="text-center text-[9px] text-amber-600/80">코너 유형 관리에서 선택</span>
                </button>
              </div>

              <div className="mt-3 space-y-1 rounded-lg border bg-card p-3">
                <p className="text-[11px] font-semibold">이 코너 편집</p>
                <p className="text-[10px] text-muted-foreground">
                  컴포넌트 {selected.preview.components.length}개
                  {selected.contentVariantCount > 0 && ` · 문구 베리에이션 ${selected.contentVariantCount}개`}
                  {selected.preview.recSource === 'CVM 기반' && ' · CVM 개인화(미리보기는 폴백)'}
                </p>
                <p className="text-[10px] text-muted-foreground">＋문구·＋컴포넌트·상품 불러오기 등 실제 편집은 저장 배관 연결 시 이 자리에 인라인으로 붙습니다. (지금은 방향 확인용)</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
