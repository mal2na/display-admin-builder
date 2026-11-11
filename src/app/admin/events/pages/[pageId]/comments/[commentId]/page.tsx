// SB BO-AIM-ETC-PG121 프로모션 상세_댓글관리(Tab) 상세 — 댓글정보·답글정보(읽기전용) + 수정.
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/page-header';
import { OpsSection, FieldRow, ReadValue, StatusPill } from '@/components/ops-ui';
import { Pencil, ChevronLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

const fmt = (d: Date | null) => (d ? d.toISOString().slice(0, 16).replace('T', ' ') : '-');
const commentType = (content: string) => (/[?？]|문의|어떻게|하나요|되나요|인가요/.test(content) ? '문의' : '반응');

export default async function CommentDetailPage({ params }: { params: { pageId: string; commentId: string } }) {
  const c = await prisma.eventComment.findUnique({
    where: { id: params.commentId },
    include: { replies: { orderBy: { createdAt: 'asc' } } },
  });
  if (!c) notFound();

  const backHref = `/admin/events/pages/${params.pageId}?tab=comments`;

  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader trail={['프로모션 관리', '프로모션', '프로모션 상세', '댓글 관리', '댓글 상세']} title="댓글 상세" />

      {/* 댓글정보 (읽기전용) */}
      <OpsSection title="댓글정보">
        <div className="grid grid-cols-2">
          <FieldRow label="멤버십 채널 ID"><ReadValue value={c.memberChannelId} /></FieldRow>
          <FieldRow label="댓글유형"><ReadValue value={commentType(c.content)} /></FieldRow>
          <FieldRow label="등록일시"><ReadValue value={fmt(c.createdAt)} /></FieldRow>
          <FieldRow label="좋아요"><ReadValue value={c.likeCount} /></FieldRow>
          <div className="col-span-2"><FieldRow label="댓글내용"><ReadValue value={c.content} /></FieldRow></div>
          <div className="col-span-2"><FieldRow label="노출 상태"><StatusPill label={c.exposed ? '노출' : '미노출'} /></FieldRow></div>
        </div>
      </OpsSection>

      {/* 답글정보 (읽기전용) */}
      <OpsSection title="답글정보">
        {c.replies.length === 0 ? (
          <div className="border-b border-[#dce0e5] px-4 py-5 text-center text-[13px] text-[var(--ink3)]">등록된 답글이 없습니다.</div>
        ) : (
          c.replies.map((r, i) => (
            <div key={r.id} className={i > 0 ? 'mt-4' : ''}>
              <div className="grid grid-cols-2">
                <FieldRow label="답글 등록자"><ReadValue value={r.author} /></FieldRow>
                <FieldRow label="답글 등록일시"><ReadValue value={fmt(r.createdAt)} /></FieldRow>
                <div className="col-span-2"><FieldRow label="댓글내용"><ReadValue value={r.content} /></FieldRow></div>
                <div className="col-span-2"><FieldRow label="노출 상태"><StatusPill label={r.exposed ? '노출' : '미노출'} /></FieldRow></div>
              </div>
            </div>
          ))
        )}
      </OpsSection>

      {/* 하단 — 목록 / 수정 */}
      <div className="flex items-center justify-between pt-2">
        <Link href={backHref} className="inline-flex h-[38px] items-center gap-1.5 rounded-[8px] border border-[#c4c9cf] bg-white px-4 text-[13px] font-semibold text-slate-600 transition hover:bg-[#f8f9fb]">
          <ChevronLeft className="h-4 w-4" /> 목록
        </Link>
        <Link href={`/admin/events/pages/${params.pageId}/comments/${params.commentId}/edit`} className="inline-flex h-[38px] items-center gap-1.5 rounded-[8px] bg-[var(--ac)] px-5 text-[13px] font-semibold text-white transition hover:bg-[var(--ac-h)]">
          <Pencil className="h-3.5 w-3.5" /> 수정
        </Link>
      </div>
    </div>
  );
}
