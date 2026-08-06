import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { EventNodeView, DeviceShell, type NodeView } from '@/components/preview/event-node';

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
    include: { program: { select: { name: true } }, nodes: { orderBy: { order: 'asc' } } },
  });
  if (!page) notFound();
  const tree = buildTree(page.nodes);

  return (
    <div className="flex min-h-screen items-start justify-center bg-slate-100 p-8">
      <div>
        <div className="mb-3 text-center">
          <p className="text-sm font-semibold">{page.program.name}</p>
          <p className="text-[11px] text-muted-foreground">FO 미리보기 · {page.conditionGroup}</p>
        </div>
        <DeviceShell width={393} height={760} headerLabel={page.program.name}>
          {tree.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">구성된 내용이 없습니다.</div>
          ) : (
            <div className="space-y-2">
              {tree.map((n) => <EventNodeView key={n.id} node={n} />)}
            </div>
          )}
        </DeviceShell>
      </div>
    </div>
  );
}
