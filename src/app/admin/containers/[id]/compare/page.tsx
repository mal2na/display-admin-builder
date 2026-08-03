import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { DeviceFrame, CornerBlock, type PreviewCorner } from '@/components/preview/blocks';
import { DISPLAY_STATUS_LABEL, type DisplayStatusKey } from '@/lib/display-taxonomy';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Star, PencilRuler } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ComparePage({ params }: { params: { id: string } }) {
  const container = await prisma.container.findUnique({
    where: { id: params.id },
    include: {
      templates: {
        orderBy: [{ conditionGroup: 'asc' }, { isDefault: 'desc' }],
        include: {
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
      },
    },
  });
  if (!container) notFound();

  const columns = container.templates.map((t) => {
    const corners: PreviewCorner[] = t.templateCorners.filter((tc) => tc.visible).map((tc) => ({
      id: tc.id,
      name: tc.corner.name,
      cornerType: tc.corner.cornerType,
      title: tc.corner.title,
      maxItems: tc.corner.maxItems,
      mainTitle: tc.corner.mainTitle,
      subTitle: tc.corner.subTitle,
      cornerLayout: tc.corner.cornerLayout,
      subTitleIcon: tc.corner.subTitleIcon,
      moreButtonUse: tc.corner.moreButtonUse,
      moreButtonLabel: tc.corner.moreButtonLabel,
      bannerImageUrl: tc.corner.banner?.imageUrl ?? null,
      bannerName: tc.corner.banner?.name ?? null,
      components: tc.corner.cornerComponents.map((cc) => ({
        id: cc.id,
        name: cc.component.name,
        componentType: cc.component.componentType,
        selectedIndex: cc.component.selectedIndex,
        chipRows: cc.component.chipRows,
        atoms: cc.component.componentAtoms.map((ca) => ({
          id: ca.id,
          name: ca.atom.name,
          atomType: ca.atom.atomType,
          content: ca.atom.content,
          imageUrl: ca.atom.imageUrl,
          altText: ca.atom.altText,
          linkUrl: ca.atom.linkUrl,
        })),
      })),
    }));
    return { template: t, corners };
  });

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-3">
        <Link href={`/admin/containers/${container.id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ChevronLeft className="h-4 w-4" /> {container.name}
        </Link>
        <h1 className="text-lg font-semibold">조건 그룹별 Template 비교</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        같은 Container라도 조건 그룹(로그인/비로그인 등)에 따라 다른 Template이 노출됩니다. 실제 조립 결과를 나란히 비교하세요.
      </p>

      <div className="flex gap-6 overflow-x-auto pb-4">
        {columns.length === 0 && <p className="text-sm text-muted-foreground">Template이 없습니다.</p>}
        {columns.map(({ template: t, corners }) => (
          <div key={t.id} className="shrink-0">
            <div className="mb-2 flex items-center gap-1.5">
              <Badge>{t.conditionGroup}</Badge>
              {t.isDefault && <Star className="h-3.5 w-3.5 fill-primary text-primary" />}
              <span className="text-sm font-medium">{t.name}</span>
              <Badge variant="outline">{DISPLAY_STATUS_LABEL[t.status as DisplayStatusKey] ?? t.status}</Badge>
            </div>
            <DeviceFrame width={340} bodyHeight={620} headerLabel={container.name}>
              {corners.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-400">
                  Corner 없음
                </div>
              ) : (
                corners.map((c) => <CornerBlock key={c.id} corner={c} />)
              )}
            </DeviceFrame>
            <Link
              href={`/admin/templates/${t.id}/builder`}
              className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <PencilRuler className="h-3.5 w-3.5" /> 이 Template 빌더 열기
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
