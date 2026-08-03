'use client';

import { useState, useTransition } from 'react';
import { DISPLAY_STATUS_LABEL, type DisplayStatusKey } from '@/lib/display-taxonomy';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Send,
  Check,
  X,
  CalendarClock,
  Rocket,
  OctagonAlert,
  Undo2,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import {
  requestReview,
  approveTemplate,
  rejectTemplate,
  scheduleTemplate,
  publishArrived,
  suspendTemplate,
  rollbackTemplate,
  type ReviewIssue,
  type OverlapHit,
} from './workflow-actions';

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  REVIEW: 'bg-amber-100 text-amber-800',
  REJECTED: 'bg-rose-100 text-rose-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  SCHEDULED: 'bg-sky-100 text-sky-700',
  PUBLISHED: 'bg-indigo-100 text-indigo-700',
  SUSPENDED: 'bg-orange-100 text-orange-800',
  ENDED: 'bg-slate-200 text-slate-600',
  ROLLED_BACK: 'bg-violet-100 text-violet-700',
  PERSONALIZATION_LIMITED: 'bg-fuchsia-100 text-fuchsia-700',
};

const fmt = (s?: string | null) => (s ? s.replace('T', ' ').slice(0, 16) : '상시');

export type WorkflowData = {
  templateId: string;
  status: string;
  startAt: string | null;
  endAt: string | null;
  rejectReason: string | null;
  suspendReason: string | null;
  suspendedBy: string | null;
  suspendedAt: string | null;
  lastApprovedVersion: number | null;
  issues: ReviewIssue[];
  overlaps: OverlapHit[];
};

export function WorkflowBar(props: WorkflowData) {
  const { status } = props;
  const [pending, start] = useTransition();
  const [panel, setPanel] = useState<null | 'review' | 'reject' | 'schedule' | 'suspend'>(null);
  const [reason, setReason] = useState('');
  const [startAt, setStartAt] = useState(props.startAt ?? '');
  const [endAt, setEndAt] = useState(props.endAt ?? '');
  const [msg, setMsg] = useState<{ kind: 'error' | 'warn' | 'ok'; text: string; issues?: ReviewIssue[]; overlaps?: OverlapHit[] } | null>(null);
  const [confirmForce, setConfirmForce] = useState(false);

  const run = (fn: () => Promise<void>) => start(async () => { await fn(); });

  const onRequestReview = () =>
    run(async () => {
      const r = await requestReview(props.templateId);
      if (!r.ok) setMsg({ kind: 'error', text: `검수 요청 불가 — 필수값 ${r.issues.length}건 누락`, issues: r.issues });
      else setMsg({ kind: 'ok', text: '검수 요청 완료 → 검수 대기' });
    });

  const onApprove = () => run(async () => { await approveTemplate(props.templateId); setMsg({ kind: 'ok', text: '승인 완료' }); });

  const onReject = () =>
    run(async () => {
      const r = await rejectTemplate(props.templateId, reason);
      if (!r.ok) setMsg({ kind: 'error', text: r.error });
      else { setMsg({ kind: 'ok', text: '반려 처리 → 수정 필요' }); setPanel(null); setReason(''); }
    });

  const onSchedule = () =>
    run(async () => {
      const r = await scheduleTemplate(props.templateId, startAt, endAt);
      if (!r.ok) setMsg({ kind: 'error', text: r.error });
      else {
        setPanel(null);
        if (r.overlaps.length) setMsg({ kind: 'warn', text: `예약 완료 — 동일 조건 그룹에 게시 기간이 겹치는 Template ${r.overlaps.length}건`, overlaps: r.overlaps });
        else setMsg({ kind: 'ok', text: '게시 예약 완료 → 예약 대기' });
      }
    });

  const onPublish = (force = false) =>
    run(async () => {
      const r = await publishArrived(props.templateId, force);
      if (!r.ok && r.blocked) { setConfirmForce(true); setMsg({ kind: 'warn', text: `게시 중인 Template과 기간이 겹칩니다 (동일 조건 그룹 중복 게시 금지)`, overlaps: r.overlaps }); }
      else if (r.ok) { setConfirmForce(false); setMsg({ kind: r.overlaps.length ? 'warn' : 'ok', text: r.overlaps.length ? '경고를 무시하고 게시 중으로 전환' : '게시 시각 도래 → 게시 중' }); }
    });

  const onSuspend = () =>
    run(async () => {
      const r = await suspendTemplate(props.templateId, reason);
      if (!r.ok) setMsg({ kind: 'error', text: r.error });
      else { setMsg({ kind: 'ok', text: '긴급 중지 완료 → 게시 중지' }); setPanel(null); setReason(''); }
    });

  const onRollback = () =>
    run(async () => {
      const r = await rollbackTemplate(props.templateId);
      if (!r.ok) setMsg({ kind: 'error', text: r.error });
      else setMsg({ kind: 'ok', text: `롤백 완료 (직전 승인 v${props.lastApprovedVersion ?? '-'})` });
    });

  return (
    <div className="border-b bg-card px-6 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">워크플로우</span>
        <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', STATUS_COLOR[status] ?? 'bg-muted')}>
          {DISPLAY_STATUS_LABEL[status as DisplayStatusKey] ?? status}
        </span>

        {(status === 'SCHEDULED' || status === 'PUBLISHED') && (
          <span className="text-xs text-muted-foreground">게시 기간 {fmt(props.startAt)} ~ {fmt(props.endAt)}</span>
        )}
        {status === 'REJECTED' && props.rejectReason && (
          <span className="text-xs text-rose-600">반려 사유: {props.rejectReason}</span>
        )}
        {status === 'SUSPENDED' && (
          <span className="text-xs text-orange-700">
            중지: {props.suspendReason} · {props.suspendedBy} · {fmt(props.suspendedAt)}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {(status === 'DRAFT' || status === 'REJECTED' || status === 'ROLLED_BACK') && (
            <Button size="sm" onClick={onRequestReview} disabled={pending}>
              <Send className="mr-1 h-3.5 w-3.5" /> 검수 요청
            </Button>
          )}
          {status === 'REVIEW' && (
            <>
              <Button size="sm" onClick={onApprove} disabled={pending}>
                <Check className="mr-1 h-3.5 w-3.5" /> 승인
              </Button>
              <Button size="sm" variant="destructive" onClick={() => { setPanel(panel === 'reject' ? null : 'reject'); setMsg(null); }} disabled={pending}>
                <X className="mr-1 h-3.5 w-3.5" /> 반려
              </Button>
            </>
          )}
          {status === 'APPROVED' && (
            <Button size="sm" onClick={() => { setPanel(panel === 'schedule' ? null : 'schedule'); setMsg(null); }} disabled={pending}>
              <CalendarClock className="mr-1 h-3.5 w-3.5" /> 게시 예약
            </Button>
          )}
          {status === 'SCHEDULED' && (
            <Button size="sm" onClick={() => onPublish(false)} disabled={pending}>
              <Rocket className="mr-1 h-3.5 w-3.5" /> 게시 시각 도래 (시뮬레이션)
            </Button>
          )}
          {status === 'PUBLISHED' && (
            <Button size="sm" variant="destructive" onClick={() => { setPanel(panel === 'suspend' ? null : 'suspend'); setMsg(null); }} disabled={pending}>
              <OctagonAlert className="mr-1 h-3.5 w-3.5" /> 긴급 중지
            </Button>
          )}
          {status === 'SUSPENDED' && (
            <Button size="sm" variant="secondary" onClick={onRollback} disabled={pending}>
              <Undo2 className="mr-1 h-3.5 w-3.5" /> 롤백 (직전 승인 버전)
            </Button>
          )}
        </div>
      </div>

      {/* 검수 요청 전, 누락 필수값 미리 안내 (DRAFT/REJECTED) */}
      {(status === 'DRAFT' || status === 'REJECTED') && props.issues.length > 0 && !msg && (
        <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          <p className="mb-1 flex items-center gap-1 font-semibold"><AlertTriangle className="h-3.5 w-3.5" /> 검수 요청 전 채워야 할 값 {props.issues.length}건</p>
          <IssueList issues={props.issues} />
        </div>
      )}
      {(status === 'DRAFT' || status === 'REJECTED') && props.issues.length === 0 && !msg && (
        <p className="mt-2 flex items-center gap-1 text-xs text-emerald-600"><ShieldCheck className="h-3.5 w-3.5" /> 필수값 충족 — 검수 요청 가능</p>
      )}

      {/* 반려 사유 입력 */}
      {panel === 'reject' && (
        <div className="mt-2 space-y-1.5 rounded-md border bg-muted/30 p-2">
          <label className="text-xs font-medium">반려 사유 (필수)</label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[48px] text-xs" placeholder="예) 대체텍스트 누락, 랜딩 링크 오류…" />
          <Button size="sm" variant="destructive" onClick={onReject} disabled={pending || !reason.trim()}>반려 처리</Button>
        </div>
      )}

      {/* 게시 예약 입력 */}
      {panel === 'schedule' && (
        <div className="mt-2 flex flex-wrap items-end gap-2 rounded-md border bg-muted/30 p-2">
          <div className="space-y-1">
            <label className="text-xs font-medium">시작 시각</label>
            <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">종료 시각</label>
            <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className="h-8 text-xs" />
          </div>
          <Button size="sm" onClick={onSchedule} disabled={pending}>예약 확정</Button>
        </div>
      )}

      {/* 긴급 중지 입력 */}
      {panel === 'suspend' && (
        <div className="mt-2 space-y-1.5 rounded-md border bg-muted/30 p-2">
          <label className="text-xs font-medium">중지 사유 (필수 · 실행자/시각 자동 기록)</label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[48px] text-xs" placeholder="예) 오노출, 링크 오류, 심의 이슈…" />
          <Button size="sm" variant="destructive" onClick={onSuspend} disabled={pending || !reason.trim()}>긴급 중지 실행</Button>
        </div>
      )}

      {/* 결과/경고 메시지 */}
      {msg && (
        <div
          className={cn(
            'mt-2 rounded-md border p-2 text-xs',
            msg.kind === 'error' && 'border-rose-200 bg-rose-50 text-rose-700',
            msg.kind === 'warn' && 'border-amber-200 bg-amber-50 text-amber-800',
            msg.kind === 'ok' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
          )}
        >
          <div className="flex items-center gap-1 font-semibold">
            {msg.kind === 'error' ? <X className="h-3.5 w-3.5" /> : msg.kind === 'warn' ? <AlertTriangle className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
            {msg.text}
          </div>
          {msg.issues && <IssueList issues={msg.issues} />}
          {msg.overlaps && msg.overlaps.length > 0 && (
            <ul className="mt-1 list-disc pl-4">
              {msg.overlaps.map((o) => (
                <li key={o.id}>
                  {o.name} · {DISPLAY_STATUS_LABEL[o.status as DisplayStatusKey] ?? o.status} · {fmt(o.startAt)} ~ {fmt(o.endAt)}
                </li>
              ))}
            </ul>
          )}
          {confirmForce && (
            <Button size="sm" variant="destructive" className="mt-2" onClick={() => onPublish(true)} disabled={pending}>
              경고 무시하고 게시
            </Button>
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
