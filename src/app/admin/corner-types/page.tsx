import { prisma } from '@/lib/prisma';
import { CornerTypeManager, type CornerTypeRow } from './corner-type-manager';
import { getBuiltCornerOptions } from './built-options';
import { toCornerTypeRow } from './row-map';
import { cornerToPreviewCorner, PLACED_CORNER_INCLUDE, PLACED_CORNER_ORDER } from './preview-corner';

export const dynamic = 'force-dynamic';

export default async function CornerTypesPage() {
  const [rows, auditRows, builtOptions, placedCorners] = await Promise.all([
    // 배너형도 정식 코너 유형(2026-09-28) → 목록에 노출. 배너 소재·문구는 배너 캠페인 관리가 소유.
    prisma.cornerType.findMany({ orderBy: { typeId: 'asc' } }),
    prisma.auditLog.findMany({
      where: { targetType: 'CornerType' },
      orderBy: { changedAt: 'desc' },
      select: { targetId: true, actor: true },
    }),
    // 전시화면관리(빌더)에서 실제로 만들어진 Corner의 유형 조합만 등록 후보로 사용
    getBuiltCornerOptions(),
    // 유형별 대표 코너(실제 배치분) — 목록 썸네일을 상세와 같은 실제 코너로 렌더하기 위함(썸네일=상세 일치).
    prisma.corner.findMany({
      where: { sourceCornerTypeId: { not: null }, templateCorners: { some: {} } },
      include: PLACED_CORNER_INCLUDE,
      orderBy: PLACED_CORNER_ORDER,
    }),
  ]);
  // 최근 수정자 = 해당 코너 유형의 가장 최근 감사 로그 변경자 (없으면 등록자)
  const lastActor = new Map<string, string>();
  for (const a of auditRows) if (a.targetId && !lastActor.has(a.targetId)) lastActor.set(a.targetId, a.actor);
  // 유형(id) → 대표 실제 코너 미리보기. 상세와 동일 정렬(updatedAt desc, id asc)이라 첫 코너가 상세 첫 타일과 일치.
  const previewByType = new Map<string, ReturnType<typeof cornerToPreviewCorner>>();
  for (const c of placedCorners) {
    if (c.sourceCornerTypeId && !previewByType.has(c.sourceCornerTypeId)) previewByType.set(c.sourceCornerTypeId, cornerToPreviewCorner(c));
  }

  const types: CornerTypeRow[] = rows.map((r) => ({ ...toCornerTypeRow(r, lastActor.get(r.id) ?? null), previewCorner: previewByType.get(r.id) ?? null }));

  return (
    <div className="px-12 py-9 pb-28">
      <CornerTypeManager types={types} builtOptions={builtOptions} />
    </div>
  );
}
