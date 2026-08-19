import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { CornerTypeDetail, type HistoryRow } from './corner-type-detail';
import { type CornerTypeRow } from '../corner-type-manager';
import { getBuiltCornerOptions, getRegisteredCombos } from '../built-options';

export const dynamic = 'force-dynamic';

export default async function CornerTypeDetailPage({ params }: { params: { id: string } }) {
  const [ct, logs, builtOptions, registered] = await Promise.all([
    prisma.cornerType.findUnique({ where: { id: params.id } }),
    prisma.auditLog.findMany({
      where: { targetType: 'CornerType', targetId: params.id },
      orderBy: { changedAt: 'desc' },
    }),
    getBuiltCornerOptions(),
    getRegisteredCombos(),
  ]);
  if (!ct) notFound();

  const row: CornerTypeRow = {
    id: ct.id,
    typeId: ct.typeId,
    name: ct.name,
    baseCategory: ct.baseCategory,
    componentType: ct.componentType ?? null,
    typeDetail: ct.typeDetail,
    bigBanner: ct.bigBanner ?? false,
    markupId: ct.markupId,
    layout: ct.layout,
    description: ct.description,
    channels: ct.channels,
    platforms: ct.platforms,
    active: ct.active,
    useMainTitle: ct.useMainTitle,
    useSubTitle: ct.useSubTitle,
    useMinItems: ct.useMinItems,
    useMaxItems: ct.useMaxItems,
    useNoDisplay: ct.useNoDisplay,
    useMoreButton: ct.useMoreButton,
    defaultMinItems: ct.defaultMinItems ?? null,
    defaultMaxItems: ct.defaultMaxItems ?? null,
    defaultSortStrategy: ct.defaultSortStrategy ?? null,
    defaultMoreButton: ct.defaultMoreButton ?? false,
    defaultMoreButtonLabel: ct.defaultMoreButtonLabel ?? null,
    cvmFields: ct.cvmFields ?? '',
    sampleImageUrl: ct.sampleImageUrl,
    status: ct.status,
    rejectReason: ct.rejectReason ?? null,
    reviewedBy: ct.reviewedBy ?? null,
    reviewedAt: ct.reviewedAt ? ct.reviewedAt.toISOString() : null,
    workingVersion: ct.workingVersion ?? 1,
    liveVersion: ct.liveVersion ?? null,
    liveAt: ct.liveAt ? ct.liveAt.toISOString() : null,
    createdBy: ct.createdBy,
  };

  const history: HistoryRow[] = logs.map((l) => ({
    id: l.id,
    changedAt: l.changedAt.toISOString(),
    actor: l.actor,
    result: l.result,
    reason: l.reason,
  }));

  return (
    <div className="p-6">
      <CornerTypeDetail row={row} history={history} builtOptions={builtOptions} registered={registered} />
    </div>
  );
}
