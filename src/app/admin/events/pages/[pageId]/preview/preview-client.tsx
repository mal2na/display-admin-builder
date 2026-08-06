'use client';

import { useState } from 'react';
import { User } from 'lucide-react';
import { EventNodeView, DeviceShell, type NodeView } from '@/components/preview/event-node';
import { type Viewer } from '@/lib/event-layers';

// FO 미리보기 (클라이언트) — 프로모션은 로그인/비로그인 대상 토글로 노출 조건을 확인한다.
export function PreviewClient({ tree, name, mode }: { tree: NodeView[]; name: string; mode: string }) {
  const [viewer, setViewer] = useState<Viewer>('로그인');
  const isEvent = mode !== 'display';

  return (
    <div>
      <div className="mb-3 flex flex-col items-center gap-2">
        <p className="text-sm font-semibold">{name}</p>
        {isEvent ? (
          <div className="flex overflow-hidden rounded-md border">
            {(['로그인', '비로그인'] as Viewer[]).map((v) => (
              <button
                key={v}
                onClick={() => setViewer(v)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium ${viewer === v ? (v === '로그인' ? 'bg-blue-600 text-white' : 'bg-orange-500 text-white') : 'bg-white hover:bg-slate-100'}`}
              >
                <User className="h-3 w-3" /> {v}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">FO 미리보기</p>
        )}
      </div>
      <DeviceShell width={393} height={760} headerLabel={name}>
        {tree.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">구성된 내용이 없습니다.</div>
        ) : (
          <div className="space-y-2">
            {tree.map((n) => <EventNodeView key={n.id} node={n} viewer={isEvent ? viewer : undefined} />)}
          </div>
        )}
      </DeviceShell>
    </div>
  );
}
