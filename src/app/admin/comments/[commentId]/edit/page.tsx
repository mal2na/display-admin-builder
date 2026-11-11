// SB BO-AIM-EVTMSN(댓글 수정) 댓글·리뷰 관리 → 댓글 수정 — 프로모션 정보 + 댓글정보(읽기+노출상태) + 답글 추가/수정/삭제.
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/page-header';
import { CommentEditForm, type EditComment } from '@/app/admin/events/pages/[pageId]/comments/[commentId]/edit/comment-edit-form';
import { CommentPromotionInfo, type CommentPromotion } from '../../comment-promotion-info';

export const dynamic = 'force-dynamic';

const fmt = (d: Date | null) => (d ? d.toISOString().slice(0, 16).replace('T', ' ') : '');
const commentType = (content: string) => (/[?？]|문의|어떻게|하나요|되나요|인가요/.test(content) ? '문의' : '반응');

export default async function GlobalCommentEditPage({ params }: { params: { commentId: string } }) {
  const c = await prisma.eventComment.findUnique({
    where: { id: params.commentId },
    include: {
      replies: { orderBy: { createdAt: 'asc' } },
      program: { select: { id: true, name: true, programKind: true, programType: true, displayState: true, displayStartAt: true, displayEndAt: true, startAt: true, endAt: true, commentUse: true } },
    },
  });
  if (!c) notFound();
  const page = await prisma.eventPage.findFirst({ where: { programId: c.programId }, select: { id: true } });

  const comment: EditComment = {
    id: c.id,
    memberChannelId: c.memberChannelId,
    type: commentType(c.content),
    createdAt: fmt(c.createdAt),
    likeCount: c.likeCount,
    content: c.content,
    exposed: c.exposed,
    replies: c.replies.map((r) => ({ id: r.id, author: r.author, createdAt: fmt(r.createdAt), content: r.content, exposed: r.exposed })),
  };

  const promo: CommentPromotion = {
    id: c.program.id, name: c.program.name, pageId: page?.id ?? null,
    kind: c.program.programKind, type: c.program.programType, displayState: c.program.displayState,
    displayStart: fmt(c.program.displayStartAt), displayEnd: fmt(c.program.displayEndAt),
    joinStart: fmt(c.program.startAt), joinEnd: fmt(c.program.endAt), commentUse: c.program.commentUse,
  };

  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader trail={['운영 관리', '댓글·리뷰 관리', '댓글 상세', '댓글 수정']} title="댓글 수정" />
      <CommentEditForm
        pageId={page?.id ?? ''}
        comment={comment}
        backHref="/admin/comments"
        promotionInfo={<CommentPromotionInfo promo={promo} />}
      />
    </div>
  );
}
