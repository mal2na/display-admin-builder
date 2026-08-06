import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { type NodeView } from '@/components/preview/event-node';
import { PreviewClient } from './preview-client';

export const dynamic = 'force-dynamic';

function buildTree(nodes: { id: string; type: string; props: string | null; parentId: string | null }[]): NodeView[] {
  const byId = new Map<string, NodeView>();
  for (const n of nodes) byId.set(n.id, { id: n.id, type: n.type, props: n.props ? JSON.parse(n.props) : {}, children: [] });
  const roots: NodeView[] = [];
  for (const n of nodes) {
    const v = byId.get(n.id)!;
    if (n.parentId && byId.has(n.parentId)) byId.get(n.parentId)!.children.push(v);
    else roots.push(v);
  }
  return roots;
}

// FO 미리보기 — 에디터 크롬 없이 디바이스 프레임으로 실제 렌더 (새 창)
export default async function PreviewPage({ params }: { params: { pageId: string } }) {
  const page = await prisma.eventPage.findUnique({
    where: { id: params.pageId },
    include: { program: { select: { name: true, mode: true } }, nodes: { orderBy: { order: 'asc' } } },
  });
  if (!page) notFound();
  const tree = buildTree(page.nodes);

  return (
    <div className="flex min-h-screen items-start justify-center bg-slate-100 p-8">
      <PreviewClient tree={tree} name={page.program.name} mode={page.program.mode} />
    </div>
  );
}
