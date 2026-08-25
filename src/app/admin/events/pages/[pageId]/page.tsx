import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PromotionDetail, type PromotionInfo, type HistoryRow } from './promotion-detail';

export const dynamic = 'force-dynamic';

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 16) : null);

export default async function PromotionDetailPage({ params }: { params: { pageId: string } }) {
  const page = await prisma.eventPage.findUnique({
    where: { id: params.pageId },
    include: {
      program: {
        select: {
          id: true, name: true, programKind: true, programType: true, purpose: true, partnerBrand: true,
          thumbnail: true, thumbnailAlt: true, startAt: true, endAt: true,
          displayStartAt: true, displayEndAt: true, displayNoEndDate: true, displayState: true, commentUse: true,
          searchExposed: true, searchTags: true, metaKeywords: true, metaDescription: true,
          ogTitle: true, ogDescription: true, ogSiteName: true, ogImage: true,
          reward: true, target: true, usageSteps: true, notice: true, contact: true,
          ctaLabel: true, ctaUrl: true, entryConfig: true,
        },
      },
    },
  });
  if (!page) notFound();
  const pr = page.program;

  const auditRows = await prisma.auditLog.findMany({
    where: { targetType: 'EventProgram', targetId: pr.id },
    orderBy: { changedAt: 'desc' },
    take: 30,
    select: { changedAt: true, actor: true, reason: true, result: true },
  }).catch(() => []);

  const history: HistoryRow[] = auditRows.map((a) => ({
    at: a.changedAt.toISOString().slice(0, 16).replace('T', ' '),
    actor: a.actor,
    reason: a.reason ?? '-',
    result: a.result ?? '-',
  }));

  const program: PromotionInfo = {
    id: pr.id,
    name: pr.name,
    programKind: pr.programKind,
    programType: pr.programType,
    purpose: pr.purpose,
    partnerBrand: pr.partnerBrand,
    thumbnail: pr.thumbnail,
    thumbnailAlt: pr.thumbnailAlt,
    startAt: iso(pr.startAt),
    endAt: iso(pr.endAt),
    displayStartAt: iso(pr.displayStartAt),
    displayEndAt: iso(pr.displayEndAt),
    displayNoEndDate: pr.displayNoEndDate,
    displayState: pr.displayState,
    commentUse: pr.commentUse,
    searchExposed: pr.searchExposed,
    searchTags: pr.searchTags,
    metaKeywords: pr.metaKeywords,
    metaDescription: pr.metaDescription,
    ogTitle: pr.ogTitle,
    ogDescription: pr.ogDescription,
    ogSiteName: pr.ogSiteName,
    ogImage: pr.ogImage,
    reward: pr.reward,
    target: pr.target,
    usageSteps: pr.usageSteps,
    notice: pr.notice,
    contact: pr.contact,
    ctaLabel: pr.ctaLabel,
    ctaUrl: pr.ctaUrl,
    entryConfig: pr.entryConfig,
  };

  return (
    <PromotionDetail
      program={program}
      pageId={page.id}
      status={page.status}
      builderHref={`/admin/events/pages/${page.id}/builder`}
      history={history}
    />
  );
}
