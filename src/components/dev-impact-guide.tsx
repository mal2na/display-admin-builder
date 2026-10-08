'use client';

import { useState } from 'react';
import { ChevronDown, ShieldCheck, Lock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ADMIN_EDITABLE, DEV_REQUIRED, CVM_UNAVAILABLE, DEV_IMPACT_PRINCIPLE, type ImpactItem } from '@/lib/dev-impact';

// 개발 영향 안내 — 이 화면(빌더)에서 어드민이 무중단으로 바꿀 수 있는 것과, 개발이 필요한 것을 구분해 보여준다.
//  기본 접힘. 펼치면 세 묶음(어드민 / 개발 / CVM 범위 밖)이 각각 접이식으로 쌓인다.
//  2026-10-08 재검증 — 최대 노출 개수는 코너 유형 관리 소유라 '개발'로 옮기고,
//  CVM 협의로 확정된 '요청해도 못 받는 것'을 세 번째 묶음으로 분리했다.
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
        <span className="text-[12.5px] font-semibold text-emerald-800">개발 작업 없이 바꿀 수 있는 것</span>
        <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">승인 후 반영</span>
        <ChevronDown className={cn('ml-auto h-4 w-4 shrink-0 text-emerald-500 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-emerald-100 px-3 py-3">
          <Bucket
            tone="admin"
            title="어드민에서 바꾼다"
            sub="검수·승인 후 반영 · 새 개발 작업 없음"
            items={ADMIN_EDITABLE}
          />
          <Bucket
            tone="dev"
            title="개발이 필요하다"
            sub="코너 유형 관리 · DS 반영 후 사용"
            items={DEV_REQUIRED}
          />
          <Bucket
            tone="cvm"
            title="CVM이 주지 않는다"
            sub="요청해도 못 받음 · 어드민 룰이나 데이터실로"
            items={CVM_UNAVAILABLE}
          />
          <p className="rounded-md bg-white/70 px-2.5 py-2 text-[11px] text-slate-500" title={DEV_IMPACT_PRINCIPLE}>
            <b className="text-slate-600">기준</b> — 이미 등록된 블록을 고르고 채우고 켜고 끄면 어드민, 새 모양·새 유형이 필요하면 개발.
          </p>
        </div>
      )}
    </div>
  );
}

// 묶음 하나 — 접이식. 좁은 패널에서 세 덩어리를 한 번에 펼치면 벽이 되므로 기본은 접어둔다.
const BUCKET_TONE = {
  admin: { ring: 'border-emerald-200', head: 'text-emerald-700', dot: 'bg-emerald-400', Icon: ShieldCheck },
  dev: { ring: 'border-slate-200', head: 'text-slate-500', dot: 'bg-slate-300', Icon: Lock },
  cvm: { ring: 'border-amber-200', head: 'text-amber-700', dot: 'bg-amber-400', Icon: Sparkles },
} as const;

function Bucket({ tone, title, sub, items }: { tone: keyof typeof BUCKET_TONE; title: string; sub: string; items: ImpactItem[] }) {
  const t = BUCKET_TONE[tone];
  return (
    <details className={cn('rounded-lg border bg-white', t.ring)}>
      <summary className="flex cursor-pointer items-center gap-1.5 px-2.5 py-2">
        <t.Icon className={cn('h-3.5 w-3.5 shrink-0', t.head)} />
        <span className={cn('text-[12px] font-bold', t.head)}>{title}</span>
        <span className="rounded bg-slate-100 px-1 text-[11px] font-semibold text-slate-500">{items.length}</span>
      </summary>
      <p className="px-2.5 pb-1.5 text-[11px] text-slate-400">{sub}</p>
      <ul className="space-y-1 px-2.5 pb-2.5">
        {items.map((it) => (
          <li key={it.label} className="flex items-start gap-1.5 text-[11px] text-slate-600" title={it.note}>
            <span className={cn('mt-[6px] h-1 w-1 shrink-0 rounded-full', t.dot)} />
            <span className="min-w-0">{it.label}</span>
          </li>
        ))}
      </ul>
    </details>
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
