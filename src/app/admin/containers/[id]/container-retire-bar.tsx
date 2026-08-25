'use client';

import { useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Check, X, RotateCcw, AlertTriangle, Send } from 'lucide-react';
import { CONTAINER_RETIRE_STATUS_LABEL } from '@/lib/display-taxonomy';
import { requestContainerRetire, approveContainerRetire, rejectContainerRetire, cancelContainerRetire, restoreContainerRetire } from '../actions';

const COLOR: Record<string, string> = {
  REVIEW: 'bg-amber-100 text-amber-800',
  RETIRED: 'bg-rose-100 text-rose-700',
};
const fmt = (s?: string | null) => (s ? s.replace('T', ' ').slice(0, 16) : '');

// 컨테이너 폐기(삭제 대체) 승인 절차 바.
//   컨테이너는 물리 삭제하지 않는다. '폐기'는 승인 필요 — 운영자 요청 → BSS 승인 시 미전시(soft-delete).
export function ContainerRetireBar({
  id, retireStatus, retireReason, retireRequestedAt, retiredBy, retiredAt,
}: {
  id: string;
  retireStatus: string | null;
  retireReason: string | null;
  retireRequestedAt: string | null;
  retiredBy: string | null;
  retiredAt: string | null;
}) {
  const [pending, start] = useTransition();
  const [reqOpen, setReqOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const run = (fn: () => Promise<void>, okText: string, after?: () => void) =>
    start(async () => {
      try { await fn(); setMsg({ kind: 'ok', text: okText }); after?.(); }
      catch (e) { setMsg({ kind: 'error', text: (e as Error)?.message || '처리 중 오류가 발생했습니다.' }); }
    });

  const isNormal = !retireStatus;
  const isReview = retireStatus === 'REVIEW';
  const isRetired = retireStatus === 'RETIRED';

  return (
    <div className={cn(
      'px-4 py-1.5',
      isReview ? 'rounded-lg border border-amber-200 bg-amber-50/40 py-2.5'
        : isRetired ? 'rounded-lg border border-rose-200 bg-rose-50/40 py-2.5'
        : 'text-muted-foreground', // 정상: 테두리·배경 없이 조용하게
    )}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground"><Trash2 className="h-3.5 w-3.5" /> 폐기(삭제) 절차</span>
        {retireStatus ? (
          <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', COLOR[retireStatus] ?? 'bg-muted')}>
            {CONTAINER_RETIRE_STATUS_LABEL[retireStatus] ?? retireStatus}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">정상 (폐기 요청 없음)</span>
        )}
        {isReview && retireRequestedAt && <span className="text-xs text-muted-foreground">요청: {fmt(retireRequestedAt)}</span>}
        {isReview && retireReason && <span className="text-xs text-amber-700">사유: {retireReason}</span>}
        {isRetired && <span className="text-xs text-rose-600">폐기: {retiredBy ?? '-'} · {fmt(retiredAt)}</span>}

        <div className="ml-auto flex items-center gap-1.5">
          {isNormal && (
            <button
              type="button"
              onClick={() => { setReqOpen((o) => !o); setMsg(null); }}
              disabled={pending}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-rose-600 hover:underline disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" /> 폐기 요청
            </button>
          )}
          {isReview && (
            <>
              <Button size="sm" onClick={() => run(() => approveContainerRetire(id), '폐기 승인 완료 — 미전시 처리됨')} disabled={pending}>
                <Check className="mr-1 h-3.5 w-3.5" /> 폐기 승인
              </Button>
              <Button size="sm" variant="destructive" onClick={() => { setRejectOpen((o) => !o); setMsg(null); }} disabled={pending}>
                <X className="mr-1 h-3.5 w-3.5" /> 반려
              </Button>
              <Button size="sm" variant="secondary" onClick={() => run(() => cancelContainerRetire(id), '폐기 요청을 취소했습니다')} disabled={pending}>
                요청 취소
              </Button>
            </>
          )}
          {isRetired && (
            <Button size="sm" variant="secondary" onClick={() => run(() => restoreContainerRetire(id), '폐기를 취소(복구)했습니다 · 미전시 상태')} disabled={pending}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" /> 폐기 취소(복구)
            </Button>
          )}
        </div>
      </div>

      {reqOpen && isNormal && (
        <div className="mt-2 space-y-1.5 rounded-md border border-rose-200 bg-rose-50/50 p-2">
          <label className="text-xs font-medium text-rose-700">폐기 사유 (필수) — 승인 후 미전시 처리되며, 채널에서 더 이상 호출되지 않습니다.</label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[48px] text-xs" placeholder="예) 서비스 종료 · 개편으로 미사용 · 중복 컨테이너 정리" />
          <Button size="sm" variant="destructive" disabled={pending || !reason.trim()}
            onClick={() => run(() => requestContainerRetire(id, reason), '폐기 요청 완료 → 폐기 승인 대기', () => { setReqOpen(false); setReason(''); })}>
            <Send className="mr-1 h-3.5 w-3.5" /> 폐기 승인 요청
          </Button>
        </div>
      )}

      {rejectOpen && isReview && (
        <div className="mt-2 space-y-1.5 rounded-md border bg-muted/30 p-2">
          <label className="text-xs font-medium">반려 사유 (필수)</label>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="min-h-[48px] text-xs" placeholder="예) 아직 노출 중인 채널이 있어 폐기 불가" />
          <Button size="sm" variant="destructive" disabled={pending || !rejectReason.trim()}
            onClick={() => run(() => rejectContainerRetire(id, rejectReason), '폐기 반려 처리 완료', () => { setRejectOpen(false); setRejectReason(''); })}>
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
