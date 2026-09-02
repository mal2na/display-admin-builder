// SB-ETC-089 댓글·리뷰 관리 — 댓글/리뷰/차단(신고·차단 이력)을 탭으로 묶은 관리 화면 (시안).
//  프로모션·상품 상세에 달린 댓글/리뷰를 조회·노출통제·답글하고, 파생되는 신고 접수·사용자 차단을 관리.
import { prisma } from '@/lib/prisma';
import { CommentAdmin } from './comment-admin';

export const dynamic = 'force-dynamic';

export default async function CommentsPage() {
  // 시안 링크 대상 = 룰렛 응모 이벤트 상세. ID는 DB마다 다르므로 이름으로 조회(없으면 프로모션 목록).
  const roulette = await prisma.eventPage
    .findFirst({ where: { program: { name: { contains: '룰렛' } } }, select: { id: true } })
    .catch(() => null);
  const promoHref = roulette ? `/admin/events/pages/${roulette.id}` : '/admin/events';
  return <CommentAdmin promoHref={promoHref} />;
}
