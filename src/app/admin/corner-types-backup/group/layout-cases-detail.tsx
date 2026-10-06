'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cornerTypeChipClass, cornerTypePurpose, layoutBi } from '@/lib/display-taxonomy';
import { VariationCard, type CornerTypeRow } from '../corner-type-manager';
import { CORNER_TYPE_INFO } from '../corner-type-manager';

// 배열(레이아웃) 상세 — 같은 배열에 묶인 케이스(코너)들을 '합쳐서' 보여준다.
//  각 케이스는 VariationCard로 렌더 → 개별 미리보기 + 상태 + 인라인 승인/반려/반영, 클릭 시 케이스 상세([id])로 편집.
export function LayoutCasesDetail({ base, detail, cases }: { base: string; detail: string; cases: CornerTypeRow[] }) {
  const router = useRouter();
  const info = CORNER_TYPE_INFO[base];
  return (
    <div className="space-y-4">
      <nav className="text-[12px] text-muted-foreground">홈 › 전시관리 › 코너 유형 관리 › {base} › {layoutBi(detail) || detail}</nav>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => router.push('/admin/corner-types-backup')} className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-slate-700"><ChevronLeft className="h-3.5 w-3.5" />코너 유형 관리</button>
        <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-[15px] font-bold', cornerTypeChipClass(base))}>{base}</span>
        <span className="text-[14px] font-semibold text-slate-700">{layoutBi(detail) || detail}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[12px] font-medium tabular-nums text-slate-600">{cases.length}개 케이스</span>
      </div>

      {/* 배열 공통 정보 — 목적·허용 컴포넌트(케이스가 공유). */}
      {info && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-[13px] leading-relaxed text-slate-600 shadow-sm">
          <p>{cornerTypePurpose(base) || info.purpose}</p>
          <p className="mt-1 text-[12px] text-slate-400">허용 컴포넌트: {info.allow}</p>
        </div>
      )}

      {/* 케이스 목록 — 각 케이스는 개별 승인·편집(승인을 케이스별로 날린다). */}
      <div>
        <p className="mb-2 text-[12px] font-medium text-muted-foreground">이 배열의 케이스 — 각각 승인·편집할 수 있어요</p>
        <div className="grid grid-cols-4 gap-3 max-xl:grid-cols-3 max-md:grid-cols-2">
          {cases.map((v) => (
            <VariationCard key={v.id} v={v} onOpen={() => router.push(`/admin/corner-types-backup/${v.id}`)} />
          ))}
        </div>
      </div>
    </div>
  );
}
