import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { EventEditor } from './editor';
import type { NodeView } from '@/components/preview/event-node';

export const dynamic = 'force-dynamic';

export default async function EditorPage({ params }: { params: { pageId: string } }) {
  const page = await prisma.eventPage.findUnique({
    where: { id: params.pageId },
    include: {
      program: {
        select: {
          id: true, name: true, env: true, mode: true,
          programKind: true, programType: true, purpose: true, partnerBrand: true,
          thumbnail: true, thumbnailAlt: true, startAt: true, endAt: true,
          displayStartAt: true, displayEndAt: true, displayNoEndDate: true, displayState: true, commentUse: true,
          searchExposed: true, searchTags: true, metaKeywords: true, metaDescription: true,
          ogTitle: true, ogDescription: true, ogSiteName: true, ogImage: true,
        },
      },
      nodes: { orderBy: { order: 'asc' } },
    },
  });
  if (!page) notFound();

  // 같은 프로그램의 조건그룹 페이지들 (로그인/비로그인 스위처용)
  const siblingPages = await prisma.eventPage.findMany({
    where: { programId: page.program.id, archivedAt: null },
    orderBy: [{ isDefault: 'desc' }, { conditionGroup: 'asc' }],
    select: { id: true, name: true, conditionGroup: true, isDefault: true },
  });

  // 임시저장(버전) 목록
  const versionRows = await prisma.eventPageVersion.findMany({
    where: { pageId: page.id },
    orderBy: { version: 'desc' },
    take: 20,
    select: { id: true, version: true, label: true, createdAt: true },
  });
  const versions = versionRows.map((v) => ({
    id: v.id,
    version: v.version,
    label: v.label ?? '임시저장',
    createdLabel: v.createdAt.toISOString().slice(5, 16).replace('T', ' '),
  }));

  // flat → nested 트리
  const byId = new Map<string, NodeView>();
  for (const n of page.nodes) byId.set(n.id, { id: n.id, type: n.type, props: n.props ? JSON.parse(n.props) : {}, children: [] });
  const roots: NodeView[] = [];
  for (const n of page.nodes) {
    const view = byId.get(n.id)!;
    if (n.parentId && byId.has(n.parentId)) byId.get(n.parentId)!.children.push(view);
    else roots.push(view);
  }

  const pr = page.program;
  const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 16) : null);

  return (
    <EventEditor
      meta={{
        pageId: page.id,
        pageName: page.name,
        device: page.device,
        projectId: pr.id,
        projectName: pr.name,
        env: pr.env,
        mode: pr.mode,
        conditionGroup: page.conditionGroup,
        pages: siblingPages,
        versions,
        program: {
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
        },
      }}
      tree={roots}
    />
  );
}
