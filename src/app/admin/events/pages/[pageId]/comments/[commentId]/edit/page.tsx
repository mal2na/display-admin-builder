// SB BO-AIM-ETC-PG059 프로모션 상세_댓글관리(Tab) 수정 — 댓글정보(읽기)+노출상태, 답글 추가/수정/삭제.
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/page-header';
import { CommentEditForm, type EditComment } from './comment-edit-form';

export const dynamic = 'force-dynamic';

const fmt = (d: Date | null) => (d ? d.toISOString().slice(0, 16).replace('T', ' ') : '');
const commentType = (content: string) => (/[?？]|문의|어떻게|하나요|되나요|인가요/.test(content) ? '문의' : '반응');

export default async function CommentEditPage({ params }: { params: { pageId: string; commentId: string } }) {
  const c = await prisma.eventComment.findUnique({
    where: { id: params.commentId },
    include: { replies: { orderBy: { createdAt: 'asc' } } },
  });
  if (!c) notFound();

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

  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader trail={['프로모션 관리', '프로모션', '프로모션 상세', '댓글 관리', '댓글 상세', '댓글 수정']} title="댓글 수정" />
      <CommentEditForm pageId={params.pageId} comment={comment} />
    </div>
  );
}
