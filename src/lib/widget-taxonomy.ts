// 운영 관리 — App 위젯 관리 / 위젯 유형 관리 허용값(상수).
// SQLite는 enum 미지원 → 모든 유형/상태는 String으로 저장하고 여기 상수로 검증·표기한다.

// ── OS 유형 ──
export const OS_TYPES = ['Android', 'IOS'] as const;
export type OsType = (typeof OS_TYPES)[number];

// ── 게시여부(노출여부) ──
export const EXPOSE_LABEL = { true: '노출', false: '미노출' } as const;

// ── 링크 URL 유형 ──
export const LINK_TYPES = [
  { value: 'internal', label: '내부' },
  { value: 'external', label: '외부' },
  { value: 'none', label: '없음' },
] as const;
export type LinkType = (typeof LINK_TYPES)[number]['value'];

// ── 게시상태 (계산값) ──
export const PUBLISH_STATUS = {
  unpublished: { label: '미게시', tone: 'muted' },
  scheduled: { label: '게시예정', tone: 'amber' },
  live: { label: '게시중', tone: 'blue' },
  ended: { label: '게시종료', tone: 'slate' },
} as const;
export type PublishStatus = keyof typeof PUBLISH_STATUS;
export const PUBLISH_STATUS_OPTIONS = Object.entries(PUBLISH_STATUS).map(([value, v]) => ({ value, label: v.label }));

// 게시여부 + 기간으로 게시상태 계산 (미노출이면 미게시)
export function computePublishStatus(exposeYn: boolean, start: Date | null, end: Date | null, now: Date = new Date()): PublishStatus {
  if (!exposeYn) return 'unpublished';
  if (start && now < start) return 'scheduled';
  if (end && now > end) return 'ended';
  return 'live';
}

// ── 배포상태 ──
export const DEPLOY_STATUS = {
  waiting: { label: '배포대기' },
  done: { label: '배포완료' },
} as const;
export type DeployStatus = keyof typeof DEPLOY_STATUS;

// ── 승인상태 ──
export const APPROVAL_STATUS = {
  draft: { label: '임시저장', tone: 'muted' },
  requested: { label: '승인요청', tone: 'amber' },
  approved: { label: '승인완료', tone: 'green' },
} as const;
export type ApprovalStatus = keyof typeof APPROVAL_STATUS;

// ── 사용여부(위젯 유형) ──
export const USE_LABEL = { true: '사용', false: '미사용' } as const;

// ── 위젯 유형: App 위젯 관리 사이즈(참고 목록) ──
export const WIDGET_SIZES = ['SMALL', 'MEDIUM', 'LARGE', '5X1 멤버십형', '5X2 배너형', '5X4 배너형'] as const;

// ── 랜딩위치(참고 옵션) ──
export const LANDING_POSITIONS = ['T world', '멤버십', '쇼핑', '혜택', '마이'] as const;

// 날짜 표기 YYYY.MM.DD HH:MM:SS
export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return '-';
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return '-';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${t.getFullYear()}.${p(t.getMonth() + 1)}.${p(t.getDate())} ${p(t.getHours())}:${p(t.getMinutes())}:${p(t.getSeconds())}`;
}
// 게시기간 표기
export function fmtPeriod(start: Date | string | null | undefined, end: Date | string | null | undefined): string {
  if (!start && !end) return '-';
  return `${fmtDateTime(start)} ~ ${fmtDateTime(end)}`;
}
// datetime-local input value (YYYY-MM-DDTHH:MM)
export function toLocalInput(d: Date | string | null | undefined): string {
  if (!d) return '';
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}T${p(t.getHours())}:${p(t.getMinutes())}`;
}

// ── App 스플래시: 승인상태 ──
export const SPLASH_APPROVAL = {
  draft: { label: '임시저장', tone: 'muted' },
  requested: { label: '승인대기', tone: 'amber' },
  approved: { label: '승인완료', tone: 'green' },
  rejected: { label: '반려', tone: 'red' },
  cancelled: { label: '요청취소', tone: 'slate' },
} as const;
export type SplashApproval = keyof typeof SPLASH_APPROVAL;

// ── App 스플래시: 적용상태 (계산값) ──
export const APPLY_STATUS = {
  none: { label: '-' },
  scheduled: { label: '적용예정' }, // 승인완료 + 적용시작일 미래
  applying: { label: '적용중' },    // 승인완료 + 적용시작일 지남 + 다음 버전 없음
  ended: { label: '적용종료' },     // 다음 버전 있음
} as const;
export type ApplyStatus = keyof typeof APPLY_STATUS;

// 적용상태 계산: 승인완료가 아니면 none. hasNewer면 ended. 시작 미래면 scheduled, 아니면 applying.
export function computeApplyStatus(approvalStatus: string, applyStartAt: Date | null, hasNewerApproved: boolean, now: Date = new Date()): ApplyStatus {
  if (approvalStatus !== 'approved') return 'none';
  if (hasNewerApproved) return 'ended';
  if (applyStartAt && now < applyStartAt) return 'scheduled';
  return 'applying';
}

// ── App 스플래시 이력: 상태 표기 (SPLASH_APPROVAL과 동일 톤) ──
export const SPLASH_HISTORY_STATUS = {
  draft: { label: '임시저장', tone: 'muted' },
  requested: { label: '승인요청', tone: 'blue' },
  approved: { label: '승인완료', tone: 'green' },
  rejected: { label: '반려', tone: 'red' },
  cancelled: { label: '요청취소', tone: 'amber' },
} as const;
