// App 위젯 — 위젯ID 표기(WE-YYYYMM-NNN) · 노출상태 계산 (SB PG007 4-2/4-4)
//  prisma 의존 없음(클라이언트 목록에서도 import). 단건 코드 계산은 server 페이지에서 widgetCodeFrom으로 조립.

// 위젯ID — 생성 월(YYYYMM) + 그 달의 생성 순번(3자리). 저장 시 자동 부여(SB 1-1).
export function widgetCodeFrom(createdAt: Date, seqInMonth: number): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `WE-${createdAt.getFullYear()}${p(createdAt.getMonth() + 1)}-${String(seqInMonth).padStart(3, '0')}`;
}

// 전체 위젯에 대해 id→위젯코드 맵을 만든다(월별 생성순 번호).
export function buildWidgetCodeMap(rows: { id: string; createdAt: Date }[]): Record<string, string> {
  const byMonth: Record<string, { id: string; createdAt: Date }[]> = {};
  for (const r of rows) {
    const k = `${r.createdAt.getFullYear()}-${r.createdAt.getMonth()}`;
    (byMonth[k] ??= []).push(r);
  }
  const map: Record<string, string> = {};
  for (const k of Object.keys(byMonth)) {
    const list = byMonth[k].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    list.forEach((r, i) => { map[r.id] = widgetCodeFrom(r.createdAt, i + 1); });
  }
  return map;
}

// 노출상태 (SB 4-4) — 승인완료 건만 실제 상태, 그 외 미노출.
//  미노출 / 중지(승인완료+노출N) / 예정 / 노출중 / 종료
export function exposeStatus(approvalStatus: string, exposeYn: boolean, start: Date | null, end: Date | null, now: Date = new Date()): string {
  if (approvalStatus !== 'approved') return '미노출';
  if (!exposeYn) return '중지';
  if (start && now < start) return '예정';
  if (end && now > end) return '종료';
  return '노출중';
}

// App 위젯 승인상태 라벨 (SB 4-6) — 임시저장/승인대기/승인완료/승인반려/요청취소
export const WIDGET_APPROVAL_LABEL: Record<string, string> = {
  draft: '임시저장', requested: '승인대기', approved: '승인완료', rejected: '승인반려', cancelled: '요청취소',
};
