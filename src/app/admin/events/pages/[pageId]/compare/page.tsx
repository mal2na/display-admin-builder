import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { EventNodeView, DeviceShell, type NodeView } from '@/components/preview/event-node';
import { ChevronLeft, Star, PencilRuler } from 'lucide-react';

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

export default async function EventComparePage({ params }: { params: { pageId: string } }) {
  const cur = await prisma.eventPage.findUnique({ where: { id: params.pageId }, select: { programId: true } });
  if (!cur) notFound();

  const program = await prisma.eventProgram.findUnique({
    where: { id: cur.programId },
    include: {
      pages: {
        where: { archivedAt: null },
        orderBy: [{ isDefault: 'desc' }, { conditionGroup: 'asc' }],
        include: { nodes: { orderBy: { order: 'asc' } } },
      },
    },
  });
  if (!program) notFound();

  const columns = program.pages.map((p) => ({ page: p, tree: buildTree(p.nodes) }));

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-3">
        <Link href={`/admin/events/pages/${params.pageId}/builder`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ChevronLeft className="h-4 w-4" /> {program.name}
        </Link>
        <h1 className="text-lg font-semibold">조건 그룹별 화면 비교</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        같은 프로그램이라도 조건 그룹(로그인/비로그인 등)에 따라 다른 화면이 노출됩니다. 실제 조립 결과를 나란히 비교하세요.
      </p>

      <div className="flex gap-6 overflow-x-auto pb-4">
        {columns.length === 0 && <p className="text-sm text-muted-foreground">페이지가 없습니다.</p>}
        {columns.map(({ page: p, tree }) => (
          <div key={p.id} className="shrink-0">
            <div className="mb-2 flex items-center gap-1.5">
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-bold text-primary">{p.conditionGroup}</span>
              {p.isDefault && <Star className="h-3.5 w-3.5 fill-primary text-primary" />}
              <span className="text-sm font-medium">{p.name}</span>
            </div>
            <DeviceShell width={340} height={620} headerLabel={program.name}>
              {tree.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-400">
                  비어 있음
                </div>
              ) : (
                <div className="space-y-2">
                  {tree.map((n) => <EventNodeView key={n.id} node={n} />)}
                </div>
              )}
            </DeviceShell>
            <Link href={`/admin/events/pages/${p.id}/builder`} className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <PencilRuler className="h-3.5 w-3.5" /> 이 화면 빌더 열기
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
