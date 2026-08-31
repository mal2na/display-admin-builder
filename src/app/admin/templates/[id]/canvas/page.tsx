import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { CanvasBuilder } from './canvas-builder';

export const dynamic = 'force-dynamic';

// 캔버스 빌더 (프로토타입 · 방향 확인용) — 기존 빌더(/builder)는 그대로 두고 별도 뷰로 시험.
//  중앙을 캔버스로 쓰고, 코너를 누르면 그 옆에 구성(컴포넌트·아톰)이 펼쳐진다. 저장 배관은 아직(방향 확인 먼저).
export default async function CanvasPage({ params }: { params: { id: string } }) {
  const template = await prisma.template.findUnique({
    where: { id: params.id },
    include: {
      container: true,
      templateCorners: {
        orderBy: { order: 'asc' },
        include: {
          corner: {
            include: {
              cornerComponents: {
                orderBy: { order: 'asc' },
                include: { component: { include: { componentAtoms: { orderBy: { order: 'asc' }, include: { atom: true } } } } },
              },
            },
          },
        },
      },
    },
  });
  if (!template) notFound();

  const parseVars = (s: string | null): string[] => {
    try { const a = JSON.parse(s ?? ''); return Array.isArray(a) ? a.filter((x: unknown) => typeof x === 'string') as string[] : []; } catch { return []; }
  };

  const corners = template.templateCorners.map((tc) => ({
    id: tc.corner.id,
    name: tc.corner.name,
    cornerType: tc.corner.cornerType,
    layoutDetail: tc.corner.layoutDetail ?? '',
    mainTitle: tc.corner.mainTitle ?? '',
    recSource: tc.corner.recSource ?? null,
    variantCount: parseVars(tc.corner.displayVariants).length,
    components: tc.corner.cornerComponents.map((cc) => ({
      id: cc.component.id,
      name: cc.component.name,
      componentType: cc.component.componentType,
      atoms: cc.component.componentAtoms
        .filter((ca) => ca.visible !== false)
        .map((ca) => ({
          id: ca.atom.id,
          name: ca.atom.name,
          atomType: ca.atom.atomType,
          content: ca.atom.content ?? '',
          imageUrl: ca.atom.imageUrl ?? null,
          contentVariants: parseVars(ca.atom.contentVariants),
        })),
    })),
  }));

  return (
    <div className="flex h-full flex-col bg-muted/30">
      <div className="flex items-center gap-2 border-b bg-card px-4 py-2.5">
        <Link href={`/admin/templates/${template.id}/builder`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> 빌더로
        </Link>
        <span className="text-sm font-semibold">{template.container?.name ?? '화면'} · {template.name}</span>
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">캔버스 (프로토타입)</span>
        <span className="ml-auto text-[11px] text-muted-foreground">방향 확인용 · 저장 배관 미연동</span>
      </div>
      <CanvasBuilder templateId={template.id} corners={corners} />
    </div>
  );
}
