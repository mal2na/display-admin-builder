import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { CanvasBuilder } from './canvas-builder';
import type { PreviewCorner } from '@/components/preview/blocks';

export const dynamic = 'force-dynamic';

// 캔버스 빌더 (프로토타입 · 방향 확인용) — 기존 빌더(/builder)는 그대로 두고 별도 뷰로 시험.
//  디바이스는 작게(전체 화면 맥락), 코너를 누르면 그 코너를 노출 타입별로 옆에 렌더해 비교·편집. 저장 배관은 아직.
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
              banner: true,
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
  const parseDisplay = (s: string | null): { label: string; typeName?: string }[] => {
    try { const a = JSON.parse(s ?? ''); return Array.isArray(a) ? a.filter((x) => x && typeof x.label === 'string') : []; } catch { return []; }
  };

  const corners = template.templateCorners.map((tc) => {
    const c = tc.corner;
    const preview: PreviewCorner = {
      id: c.id,
      name: c.name,
      cornerType: c.cornerType,
      title: c.title,
      maxItems: c.maxItems,
      mainTitle: c.mainTitle,
      subTitle: c.subTitle,
      subTitleIcon: c.subTitleIcon,
      cornerLayout: c.cornerLayout,
      layoutDetail: c.layoutDetail,
      moreButtonUse: c.moreButtonUse,
      moreButtonLabel: c.moreButtonLabel,
      bigBanner: c.bigBanner,
      cardShape: c.cardShape,
      titleLines: c.titleLines,
      bannerImageUrl: c.banner?.imageUrl ?? null,
      bannerName: c.banner?.name ?? null,
      bannerPosition: c.bannerPosition,
      sampleImageUrl: c.sampleImageUrl,
      recSource: c.recSource,
      recSourcePlan: c.recSourcePlan,
      showRecReason: c.showRecReason,
      components: c.cornerComponents.map((cc) => ({
        id: cc.component.id,
        name: cc.component.name,
        componentType: cc.component.componentType,
        selectedIndex: cc.component.selectedIndex,
        chipRows: cc.component.chipRows,
        atoms: cc.component.componentAtoms
          .filter((ca) => ca.atom.atomType === 'IMAGE' || ca.visible !== false)
          .map((ca) => ({
            id: ca.atom.id,
            name: ca.atom.name,
            atomType: ca.atom.atomType,
            content: ca.atom.content,
            imageUrl: ca.atom.imageUrl,
            altText: ca.atom.altText,
            linkUrl: ca.atom.linkUrl,
            menuRole: ca.menuRole,
          })),
      })),
    };
    return {
      preview,
      variants: parseDisplay(c.displayVariants),
      contentVariantCount: c.cornerComponents.reduce(
        (n, cc) => n + cc.component.componentAtoms.reduce((m, ca) => m + parseVars(ca.atom.contentVariants).length, 0),
        0,
      ),
    };
  });

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
      <CanvasBuilder templateName={template.name} corners={corners} />
    </div>
  );
}
