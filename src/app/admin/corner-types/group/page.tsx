import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { toCornerTypeRow } from '../row-map';
import { GroupDetail } from './group-detail';

export const dynamic = 'force-dynamic';

// 코너 유형(거버넌스) 상세 — 그 유형의 베리에이션 모음. 목록의 유형 카드 클릭 시 진입.
export default async function CornerTypeGroupPage({ searchParams }: { searchParams: { base?: string } }) {
  const base = (searchParams.base ?? '').trim();
  if (!base) notFound();
  const [rows, auditRows] = await Promise.all([
    prisma.cornerType.findMany({ where: { baseCategory: base }, orderBy: { typeId: 'asc' } }),
    prisma.auditLog.findMany({ where: { targetType: 'CornerType' }, orderBy: { changedAt: 'desc' }, select: { targetId: true, actor: true } }),
  ]);
  if (rows.length === 0) notFound();
  const lastActor = new Map<string, string>();
  for (const a of auditRows) if (a.targetId && !lastActor.has(a.targetId)) lastActor.set(a.targetId, a.actor);
  const variations = rows.map((r) => toCornerTypeRow(r, lastActor.get(r.id) ?? null));

  return (
    <div className="p-6">
      <GroupDetail base={base} variations={variations} />
    </div>
  );
}
