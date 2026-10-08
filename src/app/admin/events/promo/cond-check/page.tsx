'use client';
import * as React from 'react';
import { CondBuilder } from '../cond-builder';
import { validate, type CondNode } from '@/lib/promotion/cond';

export default function CondCheck() {
  const [nodes, setNodes] = React.useState<CondNode[]>([]);
  const [res, setRes] = React.useState<{ errors: Record<string, string>; top: string } | null>(null);
  return (
    <div className="px-12 py-9">
      <h1 className="mb-4 text-[24px] font-bold">조건 빌더 확인용</h1>
      <CondBuilder ctx="access" value={nodes} onChange={setNodes} required errors={res?.errors} error={res?.top} joinRange={['2026-10-01', '2026-10-31']} />
      <button type="button" className="mt-4 h-[38px] rounded-[6px] bg-[var(--ac)] px-6 text-white" onClick={() => setRes(validate(nodes, true))}>검증</button>
      <pre className="mt-4 overflow-auto rounded bg-[var(--th)] p-3 text-[12px]">{JSON.stringify(nodes, null, 1)}</pre>
    </div>
  );
}
