// 댓글 상세·수정 공용 — 프로모션 정보(읽기전용). SB EVTMSN: 프로모션 ID/명(링크)·유형·전시여부·전시/참여기간·댓글 사용/차단여부.
import Link from 'next/link';
import { OpsSection, FieldRow, ReadValue } from '@/components/ops-ui';

export type CommentPromotion = {
  id: string;
  name: string;
  pageId: string | null;
  kind: string; // 이벤트 | 미션
  type: string; // programType
  displayState: string; // 노출 | 미노출
  displayStart: string;
  displayEnd: string;
  joinStart: string;
  joinEnd: string;
  commentUse: boolean;
};

const range = (a: string, b: string) => (a || b ? `${a || '-'} ~ ${b || '-'}` : '-');

export function CommentPromotionInfo({ promo }: { promo: CommentPromotion }) {
  const detailHref = promo.pageId ? `/admin/events/pages/${promo.pageId}?tab=info` : null;
  const IdLink = ({ children }: { children: React.ReactNode }) =>
    detailHref ? <Link href={detailHref} className="text-[var(--ac)] underline hover:opacity-80">{children}</Link> : <span className="text-[var(--ink)]">{children}</span>;

  return (
    <OpsSection title="프로모션 정보">
      <div className="grid grid-cols-2">
        <FieldRow label="프로모션 ID"><ReadValue value={<IdLink>{promo.id}</IdLink>} /></FieldRow>
        <FieldRow label="프로모션명"><ReadValue value={<IdLink>{promo.name}</IdLink>} /></FieldRow>
        <FieldRow label="프로모션 유형"><ReadValue value={`${promo.kind}${promo.type ? ` · ${promo.type}` : ''}`} /></FieldRow>
        <FieldRow label="전시여부"><ReadValue value={promo.displayState === '노출' ? 'Y' : 'N'} /></FieldRow>
        <FieldRow label="전시 기간"><ReadValue value={range(promo.displayStart, promo.displayEnd)} /></FieldRow>
        <FieldRow label="참여 기간"><ReadValue value={range(promo.joinStart, promo.joinEnd)} /></FieldRow>
        <FieldRow label="댓글 사용여부"><ReadValue value={promo.commentUse ? 'Y' : 'N'} /></FieldRow>
        <FieldRow label="댓글 차단여부"><ReadValue value="N" /></FieldRow>
      </div>
    </OpsSection>
  );
}
