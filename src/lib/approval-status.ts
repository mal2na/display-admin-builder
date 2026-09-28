// 승인 상태 어휘 통일(2026-09-28) — 전 영역(코너 유형·배너 캠페인·App 스플래시·전시 코너)이
//  같은 표준 어휘로 '표시'되도록 한다. 저장값은 영역마다 다를 수 있어(대문자/소문자) 정규화로 흡수한다.
//  표준 키: DRAFT · REVIEW · APPROVED · REJECTED · CANCELLED

export type ApprovalKey = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

// tone은 공용 StatusPill 톤 어휘(muted/blue/green/red/amber)와 일치시킨다.
export const APPROVAL_STATUS: Record<ApprovalKey, { label: string; en: string; tone: string }> = {
  DRAFT: { label: '임시저장', en: 'Draft', tone: 'muted' },
  REVIEW: { label: '승인요청', en: 'In Review', tone: 'blue' },
  APPROVED: { label: '승인완료', en: 'Approved', tone: 'green' },
  REJECTED: { label: '반려', en: 'Rejected', tone: 'red' },
  CANCELLED: { label: '요청취소', en: 'Cancelled', tone: 'amber' },
};

export const APPROVAL_ORDER: ApprovalKey[] = ['APPROVED', 'REVIEW', 'REJECTED', 'DRAFT', 'CANCELLED'];

// 저장값(대문자/소문자/영역별 별칭) → 표준 키. 못 맞추면 DRAFT.
export function normalizeApproval(raw?: string | null): ApprovalKey {
  const s = (raw ?? '').trim().toLowerCase();
  switch (s) {
    case 'approved': return 'APPROVED';
    case 'rejected': return 'REJECTED';
    case 'cancelled':
    case 'canceled': return 'CANCELLED';
    case 'requested':
    case 'review': return 'REVIEW';
    case 'draft':
    case '': return 'DRAFT';
    default: return 'DRAFT';
  }
}

export function approvalLabel(raw?: string | null): string {
  return APPROVAL_STATUS[normalizeApproval(raw)].label;
}
export function approvalTone(raw?: string | null): string {
  return APPROVAL_STATUS[normalizeApproval(raw)].tone;
}
// "승인완료 (Approved)" 병기
export function approvalBi(raw?: string | null): string {
  const s = APPROVAL_STATUS[normalizeApproval(raw)];
  return `${s.label} (${s.en})`;
}
// 표준 표시값 {label, en, tone} — StatusPill 등에 그대로 전달
export function approvalDisplay(raw?: string | null): { label: string; en: string; tone: string } {
  return APPROVAL_STATUS[normalizeApproval(raw)];
}
