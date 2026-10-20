// 전시화면 관리 (테스트) — order3-create(주문 프로세스 등록) 레이아웃용 데이터 로더.
//  혜택 홈 등 실제 Container + Template + 배치 코너를 가져와 ProcessBuilder 에 주입(2026-10-20).
import { prisma } from '@/lib/prisma';
import { cornerToPreviewCorner, PLACED_CORNER_INCLUDE } from '../corner-types/preview-corner';
import type { PreviewCorner } from '@/components/preview/blocks';

export type PCorner = {
  id: string; name: string; cornerType: string; layout: string | null; maxItems: number | null; preview: PreviewCorner;
};
export type PTemplate = {
  id: string; name: string; conditionGroup: string | null; isDefault: boolean; status: string; corners: PCorner[];
};
export type ProcessData = {
  containerId: string; containerName: string; containerType: string; platform: string;
  status: string; description: string | null; previewUrl: string | null; activeTemplateId: string;
  templates: PTemplate[];
};

const TYPE_LABELS: Record<string, string> = { MAIN: '메인화면', MENU: '메뉴', CURATION: '기획전', BENEFIT: '혜택 영역' };

export async function loadProcessData(containerId: string, activeTemplateId?: string): Promise<ProcessData | null> {
  const container = await prisma.container.findUnique({
    where: { id: containerId },
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
  if (!container) return null;

  const templates: PTemplate[] = container.templates.map((t) => ({
    id: t.id,
    name: t.name,
    conditionGroup: t.conditionGroup,
    isDefault: t.isDefault,
    status: t.status,
    corners: t.templateCorners.map((tc) => ({
      id: tc.corner.id,
      name: tc.corner.name,
      cornerType: tc.corner.cornerType,
      layout: tc.corner.cornerLayout,
      maxItems: tc.corner.maxItems,
      preview: cornerToPreviewCorner(tc.corner),
    })),
  }));

  const active = (activeTemplateId && templates.some((t) => t.id === activeTemplateId))
    ? activeTemplateId
    : (templates.find((t) => t.isDefault)?.id ?? templates[0]?.id ?? '');

  return {
    containerId: container.id,
    containerName: container.name,
    containerType: container.kind ?? TYPE_LABELS[container.containerType ?? ''] ?? '메인화면',
    platform: container.platform ?? container.channel ?? '모바일',
    status: container.status,
    description: container.metaDescription,
    previewUrl: container.previewUrl,
    activeTemplateId: active,
    templates,
  };
}

/** 템플릿 id 로 소속 Container 를 찾아 데이터 로드 (트리 템플릿 링크용) */
export async function loadProcessDataByTemplate(templateId: string): Promise<ProcessData | null> {
  const t = await prisma.template.findUnique({ where: { id: templateId }, select: { containerId: true } });
  if (!t) return null;
  return loadProcessData(t.containerId, templateId);
}
