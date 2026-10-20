// 전시화면 관리 (테스트) — 상세 빌더. 목록에서 템플릿 행을 누르면 들어온다(2026-10-20).
//  클릭한 템플릿이 속한 Container 의 모든 템플릿·배치 코너를 가져와 빌더에 채운다(혜택 홈 등 실제 데이터).
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { cornerToPreviewCorner, PLACED_CORNER_INCLUDE } from '../../corner-types/preview-corner';
import { ScreenBuilderTest, type BuilderData } from '../screen-builder-test';

export const dynamic = 'force-dynamic';

export default async function ContainersTestDetailPage({ params }: { params: { templateId: string } }) {
  const head = await prisma.template.findUnique({ where: { id: params.templateId }, select: { containerId: true } });
  if (!head) notFound();

  const container = await prisma.container.findUnique({
    where: { id: head.containerId },
    include: {
      templates: {
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        include: {
          templateCorners: {
            orderBy: { order: 'asc' },
            include: { corner: { include: PLACED_CORNER_INCLUDE } },
          },
        },
      },
    },
  });
  if (!container) notFound();

  const data: BuilderData = {
    containerName: container.name,
    activeId: params.templateId,
    templates: container.templates.map((t) => ({
      id: t.id,
      name: t.name,
      conditionGroup: t.conditionGroup,
      isDefault: t.isDefault,
      corners: t.templateCorners.map((tc) => ({
        id: tc.corner.id,
        name: tc.corner.name,
        cornerType: tc.corner.cornerType,
        layout: tc.corner.cornerLayout,
        maxItems: tc.corner.maxItems,
        preview: cornerToPreviewCorner(tc.corner),
      })),
    })),
  };

  return <ScreenBuilderTest data={data} />;
}
