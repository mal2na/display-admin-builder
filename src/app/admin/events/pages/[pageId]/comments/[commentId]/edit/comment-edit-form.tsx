'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { OpsSection, FieldRow, ReadValue } from '@/components/ops-ui';
import { Plus, Trash2, ChevronLeft, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { saveCommentReplies } from '../../../../../actions';

export type EditComment = {
  id: string;
  memberChannelId: string;
  type: string;
  createdAt: string;
  likeCount: number;
  content: string;
  exposed: boolean;
  replies: { id: string; author: string | null; createdAt: string; content: string; exposed: boolean }[];
};

type ReplyDraft = { rid: string; content: string; exposed: boolean; author?: string | null; createdAt?: string; isNew: boolean };
type CommentStatus = '노출' | '검수중' | '미노출';

// 라디오 — 노출 상태(댓글 3상태 / 답글 2상태)
function StatusRadio({ value, onChange, name, options }: { value: string; onChange: (v: string) => void; name: string; options: string[] }) {
  return (
    <div className="flex items-center gap-4 py-1.5">
      {options.map((o) => (
        <label key={o} className="flex cursor-pointer items-center gap-1.5 text-[14px]">
          <input type="radio" name={name} checked={value === o} onChange={() => onChange(o)} className="h-4 w-4 accent-[var(--ac)]" />
          <span className={value === o ? 'text-[var(--ink)]' : 'text-[var(--ink3)]'}>{o}</span>
        </label>
      ))}
    </div>
  );
}

export function CommentEditForm({ pageId, comment }: { pageId: string; comment: EditComment }) {
  const router = useRouter();
  const backHref = `/admin/events/pages/${pageId}?tab=comments`;
  const [status, setStatus] = useState<CommentStatus>(comment.exposed ? '노출' : '미노출');
  const [replies, setReplies] = useState<ReplyDraft[]>(
    comment.replies.length
      ? comment.replies.map((r) => ({ rid: `e${r.id}`, content: r.content, exposed: r.exposed, author: r.author, createdAt: r.createdAt, isNew: false }))
      : [{ rid: 'n0', content: '', exposed: true, isNew: true }],
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [delTarget, setDelTarget] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const commentExposed = status === '노출';
  const up = (i: number, patch: Partial<ReplyDraft>) => setReplies((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const add = () => setReplies((rs) => [...rs, { rid: `n${Date.now()}${rs.length}`, content: '', exposed: true, isNew: true }]);
  // 입력 내용 있으면 확인 모달, 없으면 즉시 삭제(SB PG059 2-2).
  const tryDelete = (i: number) => { if (replies[i].content.trim()) setDelTarget(i); else doDelete(i); };
  const doDelete = (i: number) => {
    setDelTarget(null);
    setReplies((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : [{ rid: `n${Date.now()}`, content: '', exposed: true, isNew: true }]));
  };

  const doSave = () => {
    setConfirmOpen(false);
    start(async () => {
      await saveCommentReplies(pageId, comment.id, commentExposed, replies.map((r) => ({ content: r.content, exposed: r.exposed })));
      setToast('변경사항이 저장되었습니다.');
      setTimeout(() => router.push(backHref), 600);
    });
  };

  return (
    <div>
      {/* 댓글정보 — 읽기전용 + 노출 상태(편집) */}
      <OpsSection title="댓글정보">
        <div className="grid grid-cols-2">
          <FieldRow label="멤버십 채널 ID"><ReadValue value={comment.memberChannelId} /></FieldRow>
          <FieldRow label="댓글유형"><ReadValue value={comment.type} /></FieldRow>
          <FieldRow label="등록일시"><ReadValue value={comment.createdAt} /></FieldRow>
          <FieldRow label="좋아요"><ReadValue value={comment.likeCount} /></FieldRow>
          <div className="col-span-2"><FieldRow label="댓글내용"><ReadValue value={comment.content} /></FieldRow></div>
          <div className="col-span-2"><FieldRow label="노출 상태"><StatusRadio name="comment-status" value={status} onChange={(v) => setStatus(v as CommentStatus)} options={['노출', '검수중', '미노출']} /></FieldRow></div>
        </div>
      </OpsSection>

      {/* 답글정보 — 추가/수정/삭제 */}
      <OpsSection title="답글정보">
        <div className="space-y-5">
          {replies.map((r, i) => (
            <div key={r.rid} className="rounded-[10px] border border-[var(--line2)] bg-white">
              <div className="grid grid-cols-1">
                {!r.isNew && (
                  <div className="grid grid-cols-2">
                    <FieldRow label="답글 등록자"><ReadValue value={r.author ?? '-'} /></FieldRow>
                    <FieldRow label="답글 등록일시"><ReadValue value={r.createdAt ?? '-'} /></FieldRow>
                  </div>
                )}
                <FieldRow label="답글내용">
                  <textarea value={r.content} onChange={(e) => up(i, { content: e.target.value })} rows={3} maxLength={1000}
                    placeholder="1000자 이내로 입력해주세요"
                    className="w-full rounded-[6px] border border-[var(--line3)] px-3 py-2 text-[14px] outline-none focus:border-[var(--ac)]" />
                </FieldRow>
                <FieldRow label="노출 상태">
                  {/* 댓글이 미노출/검수중이면 답글도 미노출 고정(단독 노출 방지) */}
                  <div className={cn(!commentExposed && 'opacity-50')}>
                    <StatusRadio name={`reply-status-${r.rid}`} value={commentExposed ? (r.exposed ? '노출' : '미노출') : '미노출'}
                      onChange={(v) => commentExposed && up(i, { exposed: v === '노출' })} options={['노출', '미노출']} />
                  </div>
                  {!commentExposed && <p className="mt-0.5 text-[11px] text-rose-500">· 댓글 미노출 → 답글도 미노출</p>}
                </FieldRow>
              </div>
              {/* 행 우측 하단 — 추가 / 삭제(SB PG059 2-2: 최초 1개는 추가만, 이후 삭제+추가) */}
              <div className="flex items-center justify-end gap-2 border-t border-[var(--line2)] px-4 py-2.5">
                {(replies.length > 1 || !r.isNew) && (
                  <button type="button" onClick={() => tryDelete(i)} className="inline-flex h-[32px] items-center gap-1 rounded-[6px] border border-[var(--line2)] bg-white px-3 text-[12px] font-medium text-[var(--ink3)] hover:bg-[var(--th)]"><Trash2 className="h-3.5 w-3.5" /> 삭제</button>
                )}
                {i === replies.length - 1 && (
                  <button type="button" onClick={add} className="inline-flex h-[32px] items-center gap-1 rounded-[6px] border border-[var(--line2)] bg-white px-3 text-[12px] font-medium text-[var(--ink2)] hover:bg-[var(--th)]"><Plus className="h-3.5 w-3.5" /> 추가</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </OpsSection>

      {/* 하단 — 목록 / 저장 */}
      <div className="flex items-center justify-between pt-2">
        <Link href={backHref} className="inline-flex h-[38px] items-center gap-1.5 rounded-[8px] border border-[#c4c9cf] bg-white px-4 text-[13px] font-semibold text-slate-600 transition hover:bg-[#f8f9fb]"><ChevronLeft className="h-4 w-4" /> 목록</Link>
        <button type="button" onClick={() => setConfirmOpen(true)} disabled={pending} className="inline-flex h-[38px] items-center rounded-[8px] bg-[var(--ac)] px-5 text-[13px] font-semibold text-white transition hover:bg-[var(--ac-h)] disabled:opacity-60">{pending ? '저장 중…' : '저장'}</button>
      </div>

      {/* 저장 확인 */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-start justify-between gap-2">
              <h3 className="text-[16px] font-bold text-[var(--ink)]">저장하시겠습니까?</h3>
              <button onClick={() => setConfirmOpen(false)} className="text-[var(--ink3)] hover:text-[var(--ink)]"><X className="h-4 w-4" /></button>
            </div>
            <p className="mb-5 text-[13px] text-[var(--ink3)]">변경 사항은 즉시 적용됩니다.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmOpen(false)} className="h-[38px] rounded-[8px] border border-[var(--line3)] bg-white px-4 text-[13px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]">취소</button>
              <button onClick={doSave} className="h-[38px] rounded-[8px] bg-[var(--ac)] px-5 text-[13px] font-semibold text-white hover:bg-[var(--ac-h)]">확인</button>
            </div>
          </div>
        </div>
      )}

      {/* 답글 삭제 확인 */}
      {delTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDelTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[16px] font-bold text-[var(--ink)]">삭제하시겠습니까?</h3>
            <p className="mb-5 mt-1.5 text-[13px] text-[var(--ink3)]">삭제한 뒤에는 복구할 수 없습니다.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDelTarget(null)} className="h-[38px] rounded-[8px] border border-[var(--line3)] bg-white px-4 text-[13px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]">취소</button>
              <button onClick={() => doDelete(delTarget)} className="h-[38px] rounded-[8px] bg-[var(--bad)] px-5 text-[13px] font-semibold text-white hover:opacity-90">삭제</button>
            </div>
          </div>
        </div>
      )}

      {/* 저장 토스트 */}
      {toast && (
        <div className="pointer-events-none fixed bottom-20 left-1/2 z-[90] -translate-x-1/2">
          <div className="rounded-[10px] bg-[var(--toast-bg)] px-4 py-2.5 text-[13px] text-white shadow-lg">{toast}</div>
        </div>
      )}
    </div>
  );
}
