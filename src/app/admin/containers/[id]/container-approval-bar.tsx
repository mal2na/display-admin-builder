'use client';

import { useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Check, X, RotateCcw, AlertTriangle } from 'lucide-react';
import { CONTAINER_APPROVAL_STATUS_LABEL } from '@/lib/display-taxonomy';
import { requestContainerApproval, approveContainer, rejectContainer, reopenContainerApproval } from '../actions';

const COLOR: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  REVIEW: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
};

const fmt = (s?: string | null) => (s ? s.replace('T', ' ').slice(0, 16) : '');

export function ContainerApprovalBar({
  id,
  approvalStatus,
  rejectReason,
  approvedBy,
  approvedAt,
  approvalRequestedAt,
}: {
  id: string;
  approvalStatus: string;
  rejectReason: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  approvalRequestedAt: string | null;
}) {
  const [pending, start] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const run = (fn: () => Promise<void>, okText: string) =>
    start(async () => {
      try {
        await fn();
        setMsg({ kind: 'ok', text: okText });
      } catch (e) {
        setMsg({ kind: 'error', text: (e as Error)?.message || '처리 중 오류가 발생했습니다.' });
      }
    });

  return (
    <div className="rounded-lg border bg-card px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">승인 상태</span>
        <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', COLOR[approvalStatus] ?? 'bg-muted')}>
          {CONTAINER_APPROVAL_STATUS_LABEL[approvalStatus] ?? approvalStatus}
        </span>
        {approvalStatus === 'REVIEW' && approvalRequestedAt && (
          <span className="text-xs text-muted-foreground">요청: {fmt(approvalRequestedAt)}</span>
        )}
        {approvalStatus === 'APPROVED' && (
          <span className="text-xs text-emerald-700">승인: {approvedBy ?? '-'} · {fmt(approvedAt)}</span>
        )}
        {approvalStatus === 'REJECTED' && rejectReason && (
          <span className="text-xs text-rose-600">반려 사유: {rejectReason}</span>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {(approvalStatus === 'DRAFT' || approvalStatus === 'REJECTED') && (
            <Button size="sm" onClick={() => run(() => requestContainerApproval(id), '승인 요청 완료 → 승인 대기')} disabled={pending}>
              <Send className="mr-1 h-3.5 w-3.5" /> 승인 요청
            </Button>
          )}
          {approvalStatus === 'REVIEW' && (
            <>
              <Button size="sm" onClick={() => run(() => approveContainer(id), '승인 완료')} disabled={pending}>
                <Check className="mr-1 h-3.5 w-3.5" /> 승인
              </Button>
              <Button size="sm" variant="destructive" onClick={() => { setRejectOpen((o) => !o); setMsg(null); }} disabled={pending}>
                <X className="mr-1 h-3.5 w-3.5" /> 반려
              </Button>
            </>
          )}
          {approvalStatus === 'APPROVED' && (
            <Button size="sm" variant="secondary" onClick={() => run(() => reopenContainerApproval(id), '작성중으로 되돌림')} disabled={pending}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" /> 다시 작성
            </Button>
          )}
        </div>
      </div>

      {rejectOpen && approvalStatus === 'REVIEW' && (
        <div className="mt-2 space-y-1.5 rounded-md border bg-muted/30 p-2">
          <label className="text-xs font-medium">반려 사유 (필수)</label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[48px] text-xs" placeholder="예) 메타 정보 누락, 전시 기간 미설정…" />
          <Button
            size="sm"
            variant="destructive"
            disabled={pending || !reason.trim()}
            onClick={() => run(async () => { await rejectContainer(id, reason); }, '반려 처리 완료')}
          >
            반려 처리
          </Button>
        </div>
      )}

      {msg && (
        <div className={cn('mt-2 flex items-center gap-1 rounded-md border p-2 text-xs font-medium', msg.kind === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>
          {msg.kind === 'error' ? <AlertTriangle className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />} {msg.text}
        </div>
      )}
    </div>
  );
}
