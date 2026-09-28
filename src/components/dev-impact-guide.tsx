'use client';

import { useState } from 'react';
import { ChevronDown, ShieldCheck, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ADMIN_EDITABLE, DEV_REQUIRED, DEV_IMPACT_PRINCIPLE } from '@/lib/dev-impact';

// 개발 영향 안내 — 이 화면(빌더)에서 어드민이 무중단으로 바꿀 수 있는 것과, 개발이 필요한 것을 구분해 보여준다.
//  기본 접힘. 헤더에 '무중단 편집' 요약, 펼치면 2열(어드민 편집 / 개발 필요) + 대원칙.
export function DevImpactGuide({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
        <span className="text-[12.5px] font-semibold text-emerald-800">개발 영향 없이 바꿀 수 있는 것</span>
        <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">무중단 배포</span>
        <ChevronDown className={cn('ml-auto h-4 w-4 shrink-0 text-emerald-500 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-emerald-100 px-3 py-3">
          <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
            {/* 어드민 편집(무중단) */}
            <div className="rounded-lg border border-emerald-200 bg-white p-2.5">
              <p className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-bold text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" /> 어드민 편집 · 무중단
              </p>
              <ul className="space-y-1">
                {ADMIN_EDITABLE.map((it) => (
                  <li key={it.label} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-600">
                    <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                    <span>{it.label}{it.note && <span className="text-slate-400"> · {it.note}</span>}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* 개발 필요(잠금) */}
            <div className="rounded-lg border border-slate-200 bg-white p-2.5">
              <p className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-bold text-slate-500">
                <Lock className="h-3.5 w-3.5" /> 개발 필요 · 어드민 불가
              </p>
              <ul className="space-y-1">
                {DEV_REQUIRED.map((it) => (
                  <li key={it.label} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
                    <Lock className="mt-[2px] h-2.5 w-2.5 shrink-0 text-slate-300" />
                    <span>{it.label}{it.note && <span className="text-slate-400"> · {it.note}</span>}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="rounded-md bg-white/70 px-2.5 py-2 text-[11px] leading-relaxed text-slate-500">
            <b className="text-slate-600">기준</b> — {DEV_IMPACT_PRINCIPLE}
          </p>
        </div>
      )}
    </div>
  );
}

// 개발 영향 잠금 배지 — 개발이 필요해 어드민이 못 바꾸는 지점에 붙인다.
export function DevLockBadge({ reason = '레이아웃 변경은 개발 영향', className }: { reason?: string; className?: string }) {
  return (
    <span
      title={reason}
      className={cn('inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500', className)}
    >
      <Lock className="h-2.5 w-2.5" /> 개발 필요
    </span>
  );
}
