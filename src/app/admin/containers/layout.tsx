import { prisma } from '@/lib/prisma';
import { ContainerTree } from '@/components/container-tree';

export const dynamic = 'force-dynamic';

export default async function ContainersLayout({ children }: { children: React.ReactNode }) {
  const containers = await prisma.container.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      status: true,
      templates: {
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        select: { id: true, name: true, conditionGroup: true, isDefault: true, status: true },
      },
    },
  });

  return (
    // 라벤더 크롬 위에 뜬 두 라운드 패널 — 컨테이너 목록 + 콘텐츠. GNB 높이를 감안해 h-full.
    <div className="flex h-full gap-3 bg-[#ebeef6] p-3">
      <ContainerTree containers={containers} />
      <div className="min-w-0 flex-1 overflow-y-auto rounded-2xl border bg-white shadow-sm">{children}</div>
    </div>
  );
}
