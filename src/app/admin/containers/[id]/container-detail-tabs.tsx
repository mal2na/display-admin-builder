'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

// 컨테이너 상세 — 상세정보 / 변경·승인 이력 2탭 (SB PG488·PG499).
export function ContainerDetailTabs({ info, history }: { info: React.ReactNode; history?: React.ReactNode }) {
  const [tab, setTab] = useState<'info' | 'history'>('info');
  const TABS = [
    ['info', '상세정보'],
    ['history', '변경·승인 이력'],
  ] as const;
  return (
    <div className="space-y-4">
      <div className="flex gap-4 border-b border-[var(--line)]">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={cn(
              '-mb-px border-b-2 px-1 pb-2.5 pt-1 text-[15px] font-semibold transition-colors',
              tab === k ? 'border-[var(--ac)] text-[var(--ac)]' : 'border-transparent text-[var(--ink3)] hover:text-[var(--ink2)]',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'info' ? info : history}
    </div>
  );
}
