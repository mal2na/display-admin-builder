// SB BO-AIM-EVTMSN-PG(댓글관리 목록) 댓글·리뷰 관리 — 전역 댓글 목록(전 프로모션). 행 클릭→댓글 상세(프로모션 정보 포함).
import { prisma } from '@/lib/prisma';
import { CommentAdmin, type GlobalCommentRow } from './comment-admin';

export const dynamic = 'force-dynamic';

const fmt = (d: Date | null) => (d ? d.toISOString().slice(0, 16).replace('T', ' ') : '');
const commentType = (content: string) => (/[?？]|문의|어떻게|하나요|되나요|인가요/.test(content) ? '문의' : '반응');

export default async function CommentsPage() {
  const [rows, pages] = await Promise.all([
    prisma.eventComment.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, programId: true, memberChannelId: true, content: true, likeCount: true, exposed: true, answered: true,
        replyContent: true, replyAuthor: true, replyCount: true, replyAt: true, createdAt: true,
        program: { select: { id: true, name: true } },
      },
    }).catch(() => []),
    prisma.eventPage.findMany({ select: { id: true, programId: true } }).catch(() => []),
  ]);
  const pageByProgram = new Map(pages.map((p) => [p.programId, p.id]));
  const total = rows.length;
  const comments: GlobalCommentRow[] = rows.map((c, i) => ({
    id: c.id,
    no: total - i,
    ch: c.memberChannelId,
    promoId: c.program.id,
    promoName: c.program.name,
    promoPageId: pageByProgram.get(c.programId) ?? null,
    type: commentType(c.content),
    content: c.content,
    likes: c.likeCount,
    at: fmt(c.createdAt),
    status: c.exposed ? '노출' : '미노출',
    reply: c.replyContent ?? '',
    replyBy: c.replyAuthor ?? '',
    replyCount: c.replyCount,
    replyAt: fmt(c.replyAt),
    answered: c.answered ? '답변완료' : '답변대기',
  }));

  return <CommentAdmin comments={comments} />;
}
