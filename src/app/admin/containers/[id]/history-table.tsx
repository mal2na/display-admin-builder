'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export type HistoryRow = {
  id: string;
  version: number;
  approvalId: string;
  target: string;
  actor: string;
  status: string;
  result: string;
  approver: string | null;
  requestedAt: string;
  processedAt: string;
  before: string | null;
  after: string | null;
  reason: string | null;
};

const RESULT_COLOR: Record<string, string> = {
  CREATED: 'bg-emerald-100 text-emerald-700',
  UPDATED: 'bg-sky-100 text-sky-700',
  DELETED: 'bg-rose-100 text-rose-700',
  REVIEW_REQUESTED: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
  SCHEDULED: 'bg-sky-100 text-sky-700',
  PUBLISHED: 'bg-indigo-100 text-indigo-700',
  SUSPENDED: 'bg-orange-100 text-orange-800',
  ROLLED_BACK: 'bg-violet-100 text-violet-700',
};

export function HistoryTable({ rows }: { rows: HistoryRow[] }) {
  const [sel, setSel] = useState<HistoryRow | null>(null);

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold">이력 관리</h2>
      <p className="mb-2 text-xs text-muted-foreground">
        이 전시화면과 소속 Template의 승인·상태 변경 이력입니다. <b>승인ID</b>를 클릭하면 상세를 볼 수 있습니다. (PI-DSP-AUD-002)
      </p>
      <div className="overflow-x-auto rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              {['버전', '승인ID', '승인요청자', '승인요청일시', '승인상태', '승인 담당자', '처리 일시'].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">이력이 없습니다.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-muted/30">
                <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-700">{r.version}</td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <button onClick={() => setSel(r)} className="font-mono text-xs text-primary underline underline-offset-2 hover:opacity-80">
                    {r.approvalId}
                  </button>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-700">{r.actor}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-500">{r.requestedAt}</td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', RESULT_COLOR[r.result] ?? 'bg-muted')}>{r.status}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-700">{r.approver ?? '-'}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-500">{r.processedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 승인ID 상세 모달 */}
      {sel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSel(null)}>
          <div className="w-full max-w-lg overflow-hidden rounded-xl bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b px-5 py-3">
              <h3 className="text-sm font-semibold">승인 이력 상세</h3>
              <span className="font-mono text-xs text-muted-foreground">{sel.approvalId}</span>
              <button onClick={() => setSel(null)} className="ml-auto text-muted-foreground hover:text-foreground" aria-label="닫기">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="divide-y">
              <DRow label="버전" value={`v${sel.version}`} />
              <DRow label="대상" value={sel.target} />
              <DRow
                label="승인상태"
                value={<span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', RESULT_COLOR[sel.result] ?? 'bg-muted')}>{sel.status}</span>}
              />
              <DRow label="상태 변화" value={sel.before || sel.after ? `${sel.before ?? '-'} → ${sel.after ?? '-'}` : '-'} />
              <DRow label="승인요청자" value={sel.actor} />
              <DRow label="승인요청일시" value={sel.requestedAt} />
              <DRow label="승인 담당자" value={sel.approver ?? '-'} />
              <DRow label="처리 일시" value={sel.processedAt} />
              <DRow label="사유" value={sel.reason ?? '-'} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function DRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-center gap-3 px-5 py-2.5">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <span className="break-all text-sm text-slate-800">{value}</span>
    </div>
  );
}
