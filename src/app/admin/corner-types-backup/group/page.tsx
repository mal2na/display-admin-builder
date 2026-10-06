import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { toCornerTypeRow } from '../row-map';
import { GroupDetail } from './group-detail';
import { LayoutCasesDetail } from './layout-cases-detail';
import { cornerToPreviewCorner, PLACED_CORNER_INCLUDE, PLACED_CORNER_ORDER } from '../preview-corner';

export const dynamic = 'force-dynamic';

// 코너 유형(거버넌스) 상세 — 그 유형의 베리에이션 모음. 목록의 유형 카드 클릭 시 진입.
//  detail이 주어지면(배열 그룹 카드 클릭) 그 배열의 '케이스들'을 합쳐 보여준다(각각 승인·편집).
export default async function CornerTypeGroupPage({ searchParams }: { searchParams: { base?: string; detail?: string } }) {
  const base = (searchParams.base ?? '').trim();
  const detail = (searchParams.detail ?? '').trim();
  if (!base) notFound();
  const [rows, auditRows, placedCorners] = await Promise.all([
    prisma.cornerType.findMany({
      where: detail ? { baseCategory: base, typeDetail: detail } : { baseCategory: base },
      orderBy: { typeId: 'asc' },
    }),
    prisma.auditLog.findMany({ where: { targetType: 'CornerType' }, orderBy: { changedAt: 'desc' }, select: { targetId: true, actor: true } }),
    // 케이스 미리보기 = 실제 배치된 대표 코너(목록·상세와 동일 정렬 → 썸네일 일치).
    prisma.corner.findMany({ where: { sourceCornerTypeId: { not: null }, templateCorners: { some: {} } }, include: PLACED_CORNER_INCLUDE, orderBy: PLACED_CORNER_ORDER }),
  ]);
  if (rows.length === 0) notFound();
  const lastActor = new Map<string, string>();
  for (const a of auditRows) if (a.targetId && !lastActor.has(a.targetId)) lastActor.set(a.targetId, a.actor);
  const previewByType = new Map<string, ReturnType<typeof cornerToPreviewCorner>>();
  for (const c of placedCorners) {
    if (c.sourceCornerTypeId && !previewByType.has(c.sourceCornerTypeId)) previewByType.set(c.sourceCornerTypeId, cornerToPreviewCorner(c));
  }
  const variations = rows.map((r) => ({ ...toCornerTypeRow(r, lastActor.get(r.id) ?? null), previewCorner: previewByType.get(r.id) ?? null }));

  return (
    <div className="px-8 py-6">
      {detail
        ? <LayoutCasesDetail base={base} detail={detail} cases={variations} />
        : <GroupDetail base={base} variations={variations} />}
    </div>
  );
}
