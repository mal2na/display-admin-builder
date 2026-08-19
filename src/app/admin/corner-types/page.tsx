import { prisma } from '@/lib/prisma';
import { CornerTypeManager, type CornerTypeRow } from './corner-type-manager';
import { getBuiltCornerOptions } from './built-options';

export const dynamic = 'force-dynamic';

export default async function CornerTypesPage() {
  const [rows, auditRows, builtOptions] = await Promise.all([
    prisma.cornerType.findMany({ orderBy: { typeId: 'asc' } }),
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

  const types: CornerTypeRow[] = rows.map((r) => ({
    id: r.id,
    typeId: r.typeId,
    name: r.name,
    baseCategory: r.baseCategory,
    componentType: r.componentType ?? null,
    typeDetail: r.typeDetail,
    bigBanner: r.bigBanner ?? false,
    markupId: r.markupId,
    layout: r.layout,
    description: r.description,
    channels: r.channels,
    platforms: r.platforms,
    active: r.active,
    useMainTitle: r.useMainTitle,
    useSubTitle: r.useSubTitle,
    useMinItems: r.useMinItems,
    useMaxItems: r.useMaxItems,
    useNoDisplay: r.useNoDisplay,
    useMoreButton: r.useMoreButton,
    defaultMinItems: r.defaultMinItems ?? null,
    defaultMaxItems: r.defaultMaxItems ?? null,
    defaultSortStrategy: r.defaultSortStrategy ?? null,
    defaultMoreButton: r.defaultMoreButton ?? false,
    defaultMoreButtonLabel: r.defaultMoreButtonLabel ?? null,
    cvmFields: r.cvmFields ?? '',
    sampleImageUrl: r.sampleImageUrl,
    status: r.status,
    workingVersion: r.workingVersion ?? 1,
    liveVersion: r.liveVersion ?? null,
    liveAt: r.liveAt ? r.liveAt.toISOString() : null,
    createdBy: r.createdBy,
    updatedBy: lastActor.get(r.id) ?? r.createdBy ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return (
    <div className="p-6">
      <CornerTypeManager types={types} builtOptions={builtOptions} />
    </div>
  );
}
