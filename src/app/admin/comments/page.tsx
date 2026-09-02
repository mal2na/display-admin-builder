// SB-ETC-089 댓글·리뷰 관리 — 댓글/리뷰/차단(신고·차단 이력)을 탭으로 묶은 관리 화면 (시안).
//  프로모션·상품 상세에 달린 댓글/리뷰를 조회·노출통제·답글하고, 파생되는 신고 접수·사용자 차단을 관리.
import { CommentAdmin } from './comment-admin';

export const dynamic = 'force-dynamic';

export default function CommentsPage() {
  return <CommentAdmin />;
}
