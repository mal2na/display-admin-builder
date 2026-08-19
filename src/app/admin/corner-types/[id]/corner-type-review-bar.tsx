'use client';

import { useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CORNER_TYPE_STATUS_LABEL, CORNER_TYPE_STATUS_COLOR, deriveCornerTypeUsage } from '@/lib/display-taxonomy';
import { Send, Check, X, AlertTriangle, ShieldCheck, Undo2, Hourglass, Eye, EyeOff, RotateCcw, Rocket, FlaskConical } from 'lucide-react';
import {
  requestCornerTypeReview,
  approveCornerType,
  rejectCornerType,
  publishCornerType,
  reopenCornerType,
} from './corner-type-review-actions';

export type CornerTypeReviewIssue = { field: string; detail: string };

// 승인 요청 필수값 (서버 gateIssues와 동일 규칙) — 클라이언트 미리 표시용
export function cornerTypeReviewIssues(row: { name: string; baseCategory: string; componentType: string | null }): CornerTypeReviewIssue[] {
  const issues: CornerTypeReviewIssue[] = [];
  if (!row.name?.trim()) issues.push({ field: '유형명', detail: '코너 유형 이름이 비어 있습니다.' });
  if (!row.baseCategory?.trim()) issues.push({ field: '코너 유형', detail: '기준 코너 유형(8종)이 지정되지 않았습니다.' });
  if (!row.componentType?.trim()) issues.push({ field: '구성 컴포넌트', detail: '구성 컴포넌트 유형이 지정되지 않았습니다.' });
  return issues;
}

const fmt = (s?: string | null) => (s ? s.replace('T', ' ').slice(0, 16) : '');

export type CornerTypeReviewData = {
  id: string;
  status: string;
  active: boolean;
  liveVersion: number | null;
  workingVersion: number;
  rejectReason: string | null;
  reviewedAt: string | null;
  liveAt: string | null;
  issues: CornerTypeReviewIssue[];
};

export function CornerTypeReviewBar(props: CornerTypeReviewData) {
  const { status } = props;
  const [pending, start] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reqOpen, setReqOpen] = useState(false); // 승인 요청 메모 모달
  const [reqNote, setReqNote] = useState('');
  const [msg, setMsg] = useState<{ kind: 'error' | 'ok'; text: string; issues?: CornerTypeReviewIssue[] } | null>(null);

  const { live, needsPublish, changeInReview } = deriveCornerTypeUsage(props);
  const run = (fn: () => Promise<void>) => start(async () => { await fn(); });

  const onRequest = () =>
    run(async () => {
      const r = await requestCornerTypeReview(props.id, reqNote);
      if (!r.ok) setMsg({ kind: 'error', text: `승인 요청 불가 — 필수값 ${r.issues.length}건 누락`, issues: r.issues });
      else { setMsg({ kind: 'ok', text: 'BSS로 승인 요청을 보냈습니다 → 승인 대기' }); setReqOpen(false); setReqNote(''); }
    });
  const onBssApprove = () => run(async () => { await approveCornerType(props.id); setMsg({ kind: 'ok', text: 'BSS 승인 결과 수신 — 승인 완료 (‘반영’을 눌러 사용하세요)' }); });
  const onBssReject = () =>
    run(async () => {
      const r = await rejectCornerType(props.id, reason);
      if (!r.ok) setMsg({ kind: 'error', text: r.error });
      else { setMsg({ kind: 'ok', text: 'BSS 반려 결과 수신 — 반려됨' }); setRejectOpen(false); setReason(''); }
    });
  const onPublish = () =>
    run(async () => {
      const r = await publishCornerType(props.id);
      if (!r.ok) setMsg({ kind: 'error', text: r.error });
      else setMsg({ kind: 'ok', text: `반영 완료 — v${props.workingVersion} 사용 중` });
    });
  const onReopen = () => run(async () => { await reopenCornerType(props.id); setMsg(null); });

  const gateOk = props.issues.length === 0;

  return (
    <div className="rounded-lg border bg-card p-3">
      {/* 상태 헤더 — (1) 승인 상태 뱃지 + (2) 사용(라이브) 뱃지 두 축 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground">코너 승인</span>
        <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-semibold', CORNER_TYPE_STATUS_COLOR[status] ?? 'bg-muted')}>
          {CORNER_TYPE_STATUS_LABEL[status] ?? status}
        </span>
        {/* 승인/반영(라이브) 축 — 실제 노출 on/off는 아래 '사용 여부'에서 관리 */}
        {props.liveVersion != null ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
            <Rocket className="h-3 w-3" /> 라이브 · v{props.liveVersion}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            <EyeOff className="h-3 w-3" /> 미반영
          </span>
        )}
        {changeInReview && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700"><Hourglass className="h-3 w-3" /> 변경 v{props.workingVersion} 검수 중</span>
        )}

        {/* 액션 */}
        <div className="ml-auto flex items-center gap-1.5">
          {(status === 'DRAFT' || status === 'REJECTED') && (
            <Button size="sm" onClick={() => { setReqNote(''); setMsg(null); setReqOpen(true); }} disabled={pending || !gateOk} title="변경 사항 메모를 적고 BSS로 승인 요청을 보냅니다">
              <Send className="mr-1 h-3.5 w-3.5" /> {status === 'REJECTED' ? '재승인 요청' : '승인 요청'}
            </Button>
          )}
          {status === 'REVIEW' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700"><Hourglass className="h-3.5 w-3.5" /> BSS 심사 중</span>
          )}
          {status === 'APPROVED' && needsPublish && (
            <Button size="sm" onClick={onPublish} disabled={pending} title="승인된 최신본을 라이브로 반영(게시)합니다">
              <Rocket className="mr-1 h-3.5 w-3.5" /> 반영
            </Button>
          )}
          {status === 'APPROVED' && !needsPublish && (
            <Button size="sm" variant="secondary" onClick={onReopen} disabled={pending} title="수정하려면 새 편집본을 시작합니다(라이브는 사용 중 유지)">
              <RotateCcw className="mr-1 h-3.5 w-3.5" /> 수정 착수
            </Button>
          )}
        </div>
      </div>

      {/* 반영(라이브) 게이트 안내 — 실제 노출 on/off는 '사용 여부'에서 관리 */}
      <div className="mt-2 space-y-1">
        {changeInReview ? (
          <p className="flex items-center gap-1 text-xs text-emerald-600"><Eye className="h-3.5 w-3.5" /> 기존 승인본 v{props.liveVersion}은 계속 <b>라이브</b>입니다 — 검수 동안 화면이 끊기지 않아요.</p>
        ) : props.liveVersion != null ? (
          <p className="flex items-center gap-1 text-xs text-emerald-600"><Eye className="h-3.5 w-3.5" /> v{props.liveVersion} 라이브 — 이 유형으로 코너를 만들 수 있습니다. (노출 on/off는 <b>사용 여부</b>)</p>
        ) : (
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><EyeOff className="h-3.5 w-3.5" /> 미반영 — 승인 후 <b>반영</b>을 눌러야 라이브가 됩니다.</p>
        )}
        {needsPublish && (
          <p className="flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 p-2 text-xs text-indigo-700">
            <Rocket className="h-3.5 w-3.5 shrink-0" /> 승인 완료 · 반영 대기 — <b>반영</b>을 누르면 v{props.workingVersion}이 라이브로 교체됩니다.
          </p>
        )}
      </div>

      {status === 'REVIEW' && (
        <p className="mt-2 flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          <Hourglass className="h-3.5 w-3.5 shrink-0" /> BSS로 승인 요청을 보냈습니다. 승인/반려 결과를 기다리는 중입니다.
        </p>
      )}

      {status === 'REJECTED' && props.rejectReason && (
        <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
          <p className="flex items-center gap-1 font-semibold"><Undo2 className="h-3.5 w-3.5" /> BSS 반려 사유</p>
          <p className="mt-0.5 whitespace-pre-wrap">{props.rejectReason}</p>
          {props.reviewedAt && <p className="mt-1 text-[10px] text-rose-500">BSS · {fmt(props.reviewedAt)}</p>}
        </div>
      )}

      {(status === 'DRAFT' || status === 'REJECTED') && !msg && (
        gateOk ? (
          <p className="mt-2 flex items-center gap-1 text-xs text-emerald-600"><ShieldCheck className="h-3.5 w-3.5" /> 필수값 충족 — 승인 요청 가능</p>
        ) : (
          <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
            <p className="mb-1 flex items-center gap-1 font-semibold"><AlertTriangle className="h-3.5 w-3.5" /> 승인 요청 전 채워야 할 값 {props.issues.length}건</p>
            <ul className="mt-1 space-y-0.5">
              {props.issues.map((it, i) => (
                <li key={i} className="flex gap-1.5"><span className="rounded bg-white/70 px-1 font-medium">{it.field}</span><span>{it.detail}</span></li>
              ))}
            </ul>
          </div>
        )
      )}

      {msg && (
        <div className={cn('mt-2 rounded-md border p-2 text-xs', msg.kind === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>
          <div className="flex items-center gap-1 font-semibold">
            {msg.kind === 'error' ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
            {msg.text}
          </div>
          {msg.issues && (
            <ul className="mt-1 space-y-0.5">
              {msg.issues.map((it, i) => (
                <li key={i} className="flex gap-1.5"><span className="rounded bg-white/70 px-1 font-medium">{it.field}</span><span>{it.detail}</span></li>
              ))}
            </ul>
          )}
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
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[40px] text-xs" placeholder="반려 사유 (예: 매핑 규칙 위반, 필수 항목 누락…)" />
              <button onClick={onBssReject} disabled={pending || !reason.trim()} className="rounded bg-rose-500 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-rose-600 disabled:opacity-50">반려 응답 전송</button>
            </div>
          )}
        </div>
      )}

      {/* 승인 요청 메모 모달 — 변경 사항(재승인 시 "어디를 고쳐 다시 보냄")을 적어 함께 전송 */}
      {reqOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={() => !pending && setReqOpen(false)}>
          <div className="w-full max-w-md rounded-xl bg-card p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-center gap-1.5">
              <Send className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">{status === 'REJECTED' ? '재승인 요청' : '승인 요청'}</h3>
            </div>
            <p className="mb-3 text-[11px] text-muted-foreground">
              {status === 'REJECTED'
                ? '반려 후 무엇을 변경해 다시 보내는지 적어주세요. 검수자가 변경 이력으로 확인합니다.'
                : '변경/요청 사항 메모를 남기면 검수자가 참고합니다. (선택)'}
            </p>
            <Textarea
              value={reqNote}
              onChange={(e) => setReqNote(e.target.value)}
              autoFocus
              className="min-h-[96px] text-xs"
              placeholder={status === 'REJECTED' ? '예) 배너형 컴포넌트 매핑 제거, 대체텍스트 보완 후 재요청합니다.' : '예) 신규 등록 — 요금제 안내 카드 유형'}
            />
            <div className="mt-3 flex justify-end gap-1.5">
              <Button size="sm" variant="secondary" onClick={() => setReqOpen(false)} disabled={pending}>취소</Button>
              <Button size="sm" onClick={onRequest} disabled={pending || (status === 'REJECTED' && !reqNote.trim())} title={status === 'REJECTED' && !reqNote.trim() ? '재승인은 변경 사항 메모가 필요합니다' : undefined}>
                <Send className="mr-1 h-3.5 w-3.5" /> BSS로 승인 요청
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
