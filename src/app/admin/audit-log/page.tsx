import { prisma } from '@/lib/prisma';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

const TARGET_TYPES = ['Template', 'CornerType', 'Container', 'Corner', 'Component', 'Atom'];

const RESULT_LABEL: Record<string, string> = {
  CREATED: '생성',
  UPDATED: '수정',
  DELETED: '삭제',
  REVIEW_REQUESTED: '검수 요청',
  APPROVED: '승인',
  REJECTED: '반려',
  SCHEDULED: '예약',
  PUBLISHED: '게시',
  SUSPENDED: '게시 중지',
  ROLLED_BACK: '롤백',
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: '초안 작성중', REVIEW: '검수 대기', REJECTED: '수정 필요', APPROVED: '승인 완료',
  SCHEDULED: '예약 대기', PUBLISHED: '게시 중', SUSPENDED: '게시 중지', ENDED: '종료',
  ROLLED_BACK: '롤백 완료', PERSONALIZATION_LIMITED: '개인화 제한',
};

function statusOf(json: string | null): string | null {
  if (!json) return null;
  try {
    const o = JSON.parse(json);
    return o?.status ? STATUS_LABEL[o.status] ?? o.status : null;
  } catch {
    return null;
  }
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { target?: string; from?: string; to?: string };
}) {
  const target = searchParams.target && TARGET_TYPES.includes(searchParams.target) ? searchParams.target : '';
  const from = searchParams.from || '';
  const to = searchParams.to || '';

  const where: Record<string, unknown> = {};
  if (target) where.targetType = target;
  const changedAt: Record<string, Date> = {};
  if (from) changedAt.gte = new Date(from);
  if (to) changedAt.lte = new Date(to + 'T23:59:59');
  if (Object.keys(changedAt).length) where.changedAt = changedAt;

  const logs = await prisma.auditLog.findMany({ where, orderBy: { changedAt: 'desc' }, take: 200 });

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-lg font-semibold">감사 로그</h1>
        <p className="text-sm text-muted-foreground">
          모든 상태 변경 이력 (변경자·일시·대상·이전값·이후값·사유·승인자·결과) — PI-DSP-AUD-002
        </p>
      </div>

      {/* 필터: 대상별 / 기간별 */}
      <form className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3 text-sm">
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">대상 타입</label>
          <select name="target" defaultValue={target} className="h-9 rounded-md border bg-background px-2 text-xs">
            <option value="">전체</option>
            {TARGET_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">시작일</label>
          <input type="date" name="from" defaultValue={from} className="h-9 rounded-md border bg-background px-2 text-xs" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">종료일</label>
          <input type="date" name="to" defaultValue={to} className="h-9 rounded-md border bg-background px-2 text-xs" />
        </div>
        <button className="h-9 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">조회</button>
        <span className="ml-auto text-xs text-muted-foreground">검색결과: <b className="text-foreground">{logs.length}건</b></span>
      </form>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              {['변경일시', '변경자', '대상', '결과', '상태 변화', '사유', '승인자'].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">로그가 없습니다.</td></tr>
            )}
            {logs.map((l) => {
              const b = statusOf(l.beforeValue);
              const a = statusOf(l.afterValue);
              return (
                <tr key={l.id} className="align-top hover:bg-muted/30">
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                    {l.changedAt.toISOString().replace('T', ' ').slice(0, 19)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">{l.actor}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">
                    <Badge variant="outline">{l.targetType}</Badge>
                    <span className="ml-1 font-mono text-[10px] text-muted-foreground">{l.targetId.slice(-6)}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <Badge>{RESULT_LABEL[l.result] ?? l.result}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">
                    {b || a ? <span>{b ?? '-'} <span className="text-muted-foreground">→</span> {a ?? '-'}</span> : '-'}
                  </td>
                  <td className="max-w-[280px] px-3 py-2 text-xs text-muted-foreground">{l.reason ?? '-'}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">{l.approver ?? '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
