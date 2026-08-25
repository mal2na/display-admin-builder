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
          reward: true, target: true, usageSteps: true, notice: true, summary: true, contact: true,
          ctaLabel: true, entryConfig: true,
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

  // flat → nested 트리 (DB 노드)
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

  // ── 고정 프레임 vs 편집 본문 분리 (NC-EVTMSN-001) ──
  //   편집(구조 트리/드래그/저장)은 본문(비-SLOT DB 노드)만. 고정 프레임은 등록정보에서 파생한 합성 노드로
  //   미리보기에만 렌더한다. (합성 노드는 DB에 없으므로 reorderNodes 대상에서 제외 → 안전)
  const editTree = roots.filter((r) => !r.type.startsWith('SLOT_')); // 가운데 본문 = 편집 가능

  const fmtDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10).replace(/-/g, '.') : '');
  const schedule = pr.startAt || pr.endAt ? `${fmtDate(pr.startAt)}${pr.endAt ? ` ~ ${fmtDate(pr.endAt)}` : ''}` : '';

  // 안내형 고정 프레임 = 상단 헤더(이미지·제목·기간)·일정/보상/대상·이용방법 / 하단 유의사항·문의. 가운데 본문만 빌더.
  let steps: { title: string; desc: string }[] = [];
  try { const a = JSON.parse(pr.usageSteps ?? '[]'); if (Array.isArray(a)) steps = a; } catch { /* ignore */ }

  const syn = (type: string, props: Record<string, unknown>): NodeView => ({ id: `syn-${type}`, type, props, children: [] });
  const frameTop: NodeView[] = [
    syn('SLOT_THUMB', { imageUrl: pr.thumbnail ?? null, alt: pr.thumbnailAlt ?? '' }),
    syn('SLOT_HEADER', { title: pr.name, subtitle: pr.purpose ?? '', schedule }),
    syn('SLOT_SUMMARY', { schedule, reward: pr.reward ?? '', target: pr.target ?? '' }),
  ];
  if (steps.length) frameTop.push(syn('SLOT_GUIDE', { steps }));
  const frameBottom: NodeView[] = [
    syn('SLOT_NOTICE', { text: pr.notice ?? '', label: '유의사항' }),
  ];
  // 응모형 = 하단 고정 '응모하기' CTA (등록정보 ctaLabel)
  if (pr.programType === '응모형') frameBottom.push(syn('SLOT_CTA', { label: pr.ctaLabel ?? '응모하기' }));
  const middle = editTree.length ? editTree : [syn('SLOT_BODYHINT', {})];
  const previewTree: NodeView[] = [...frameTop, ...middle, ...frameBottom];

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
      tree={editTree}
      previewTree={previewTree}
    />
  );
}
