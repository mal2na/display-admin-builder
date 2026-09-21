import { prisma } from '@/lib/prisma';
import { CornerTypeManager, type CornerTypeRow } from './corner-type-manager';
import { getBuiltCornerOptions } from './built-options';
import { toCornerTypeRow } from './row-map';

export const dynamic = 'force-dynamic';

export default async function CornerTypesPage() {
  const [rows, auditRows, builtOptions] = await Promise.all([
    // '배너형'은 배너 캠페인 관리(전시관리)로 분리 → 코너 유형 관리 목록에서 숨김
    prisma.cornerType.findMany({ where: { baseCategory: { not: '배너형' } }, orderBy: { typeId: 'asc' } }),
    prisma.auditLog.findMany({
      where: { targetType: 'CornerType' },
      orderBy: { changedAt: 'desc' },
      select: { targetId: true, actor: true },
    }),
    // 전시화면관리(빌더)에서 실제로 만들어진 Corner의 유형 조합만 등록 후보로 사용
    getBuiltCornerOptions(),
  ]);
  // 최근 수정자 = 해당 코너 유형의 가장 최근 감사 로그 변경자 (없으면 등록자)
  const lastActor = new Map<string, string>();
  for (const a of auditRows) if (a.targetId && !lastActor.has(a.targetId)) lastActor.set(a.targetId, a.actor);

  const types: CornerTypeRow[] = rows.map((r) => toCornerTypeRow(r, lastActor.get(r.id) ?? null));

  return (
    <div className="p-6">
      <CornerTypeManager types={types} builtOptions={builtOptions} />
    </div>
  );
}
