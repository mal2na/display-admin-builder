'use client';

import { useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Check, X, AlertTriangle, ShieldCheck, Undo2, Hourglass, Eye, EyeOff, FlaskConical } from 'lucide-react';
import { requestReview, approveTemplate, rejectTemplate, type ReviewIssue } from './workflow-actions';

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600 border-slate-200',
  REVIEW: 'bg-amber-100 text-amber-800 border-amber-200',
  REJECTED: 'bg-rose-100 text-rose-700 border-rose-200',
  APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  SCHEDULED: 'bg-sky-100 text-sky-700 border-sky-200',
  PUBLISHED: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  SUSPENDED: 'bg-orange-100 text-orange-800 border-orange-200',
  ENDED: 'bg-slate-200 text-slate-600 border-slate-300',
  ROLLED_BACK: 'bg-violet-100 text-violet-700 border-violet-200',
  PERSONALIZATION_LIMITED: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
};

// 운영자 관점 라벨 (요청/대기)
function statusText(status: string) {
  if (status === 'DRAFT') return '초안 작성중';
  if (status === 'REVIEW') return '승인 대기';
  if (status === 'REJECTED') return '반려됨';
  if (status === 'APPROVED') return '승인 완료';
  if (status === 'SCHEDULED') return '게시 예약';
  if (status === 'PUBLISHED') return '게시 중';
  return status;
}

export type TemplateReviewData = {
  templateId: string;
  status: string;
  rejectReason: string | null;
  issues: ReviewIssue[];
};

export function TemplateReviewBar(props: TemplateReviewData) {
  const { status } = props;
  const [pending, start] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState<{ kind: 'error' | 'ok'; text: string; issues?: ReviewIssue[] } | null>(null);

  const run = (fn: () => Promise<void>) => start(async () => { await fn(); });

  const onRequest = () =>
    run(async () => {
      const r = await requestReview(props.templateId);
      if (!r.ok) setMsg({ kind: 'error', text: `승인 요청 불가 — 필수값 ${r.issues.length}건 누락`, issues: r.issues });
      else setMsg({ kind: 'ok', text: 'BSS로 승인 요청을 보냈습니다 → 승인 대기' });
    });

  // BSS 응답(승인/반려) — 실제로는 BSS에서 처리. 아래는 프로토타입 데모용 모의 응답.
  const onBssApprove = () => run(async () => { await approveTemplate(props.templateId); setMsg({ kind: 'ok', text: 'BSS 승인 결과 수신 — 승인 완료' }); });
  const onBssReject = () =>
    run(async () => {
      const r = await rejectTemplate(props.templateId, reason);
      if (!r.ok) setMsg({ kind: 'error', text: r.error });
      else { setMsg({ kind: 'ok', text: 'BSS 반려 결과 수신 — 수정 필요' }); setRejectOpen(false); setReason(''); }
    });

  const gateOk = props.issues.length === 0;
  const isLive = status === 'PUBLISHED';
  const canGoLive = status === 'APPROVED' || status === 'SCHEDULED' || status === 'PUBLISHED';

  return (
    <div className="border-b bg-card px-6 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground">템플릿 승인</span>
        <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-semibold', STATUS_COLOR[status] ?? 'bg-muted')}>
          {statusText(status)}
        </span>
        {/* 고객 노출 게이트 */}
        {isLive ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600"><Eye className="h-3 w-3" /> 고객 노출 중</span>
        ) : canGoLive ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600"><Eye className="h-3 w-3" /> 승인됨 · 게시 가능</span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><EyeOff className="h-3 w-3" /> 고객 노출 전 · BSS 승인 필요</span>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {(status === 'DRAFT' || status === 'REJECTED' || status === 'ROLLED_BACK') && (
            <Button size="sm" onClick={onRequest} disabled={pending || !gateOk} title="BSS로 승인 요청을 전송합니다">
              <Send className="mr-1 h-3.5 w-3.5" /> {status === 'REJECTED' ? '재승인 요청' : '승인 요청'}
            </Button>
          )}
          {status === 'REVIEW' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
              <Hourglass className="h-3.5 w-3.5" /> BSS 심사 중
            </span>
          )}
        </div>
      </div>

      {/* 승인 대기 안내 */}
      {status === 'REVIEW' && (
        <p className="mt-2 flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          <Hourglass className="h-3.5 w-3.5 shrink-0" /> BSS로 승인 요청을 보냈습니다. 승인/반려 결과를 기다리는 중입니다.
        </p>
      )}

      {/* 반려 사유 (BSS) */}
      {status === 'REJECTED' && props.rejectReason && (
        <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
          <p className="flex items-center gap-1 font-semibold"><Undo2 className="h-3.5 w-3.5" /> BSS 반려 사유</p>
          <p className="mt-0.5 whitespace-pre-wrap">{props.rejectReason}</p>
        </div>
      )}

      {/* 승인 요청 전 필수값 안내 */}
      {(status === 'DRAFT' || status === 'REJECTED') && !msg && (
        gateOk ? (
          <p className="mt-2 flex items-center gap-1 text-xs text-emerald-600"><ShieldCheck className="h-3.5 w-3.5" /> 필수값 충족 — 승인 요청 가능</p>
        ) : (
          <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
            <p className="mb-1 flex items-center gap-1 font-semibold"><AlertTriangle className="h-3.5 w-3.5" /> 승인 요청 전 채워야 할 값 {props.issues.length}건</p>
            <IssueList issues={props.issues} />
          </div>
        )
      )}

      {msg && (
        <div className={cn('mt-2 rounded-md border p-2 text-xs', msg.kind === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>
          <div className="flex items-center gap-1 font-semibold">
            {msg.kind === 'error' ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
            {msg.text}
          </div>
          {msg.issues && <IssueList issues={msg.issues} />}
        </div>
      )}

      {/* ── BSS 응답 모의 (프로토타입 전용) — 실제로는 BSS에서 처리 ── */}
      {status === 'REVIEW' && (
        <div className="mt-2 rounded-md border border-dashed border-slate-300 bg-slate-50 p-1.5">
          <p className="mb-1 flex items-center gap-1 text-[10px] font-medium text-slate-400">
            <FlaskConical className="h-3 w-3" /> BSS 응답 모의 · 프로토타입 전용 (실제로는 BSS에서 처리)
          </p>
          <div className="flex items-center gap-1.5">
            <button onClick={onBssApprove} disabled={pending} className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100 disabled:opacity-50">승인 응답</button>
            <button onClick={() => { setRejectOpen((v) => !v); setMsg(null); }} disabled={pending} className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100 disabled:opacity-50">반려 응답</button>
          </div>
          {rejectOpen && (
            <div className="mt-1.5 space-y-1.5">
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[40px] text-xs" placeholder="반려 사유 (예: 대체텍스트 누락, 랜딩 링크 오류…)" />
              <button onClick={onBssReject} disabled={pending || !reason.trim()} className="rounded bg-rose-500 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-rose-600 disabled:opacity-50">반려 응답 전송</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IssueList({ issues }: { issues: ReviewIssue[] }) {
  return (
    <ul className="mt-1 space-y-0.5">
      {issues.map((it, i) => (
        <li key={i} className="flex gap-1.5">
          <span className="rounded bg-white/70 px-1 font-medium">{it.field}</span>
          <span>{it.corner !== '-' ? `[${it.corner}] ` : ''}{it.detail}</span>
        </li>
      ))}
    </ul>
  );
}
