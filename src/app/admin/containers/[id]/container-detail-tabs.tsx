'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Info, History } from 'lucide-react';

export function ContainerDetailTabs({
  info,
  history,
  historyCount,
}: {
  info: React.ReactNode;
  history: React.ReactNode;
  historyCount: number;
}) {
  const [tab, setTab] = useState<'info' | 'history'>('info');
  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setTab('info')}
          className={cn(
            '-mb-px inline-flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium',
            tab === 'info' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <Info className="h-3.5 w-3.5" /> 기본 정보
        </button>
        <button
          onClick={() => setTab('history')}
          className={cn(
            '-mb-px inline-flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium',
            tab === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <History className="h-3.5 w-3.5" /> 이력 관리 <span className="text-[10px] text-muted-foreground">({historyCount})</span>
        </button>
      </div>
      <div>{tab === 'info' ? info : history}</div>
    </div>
  );
}
