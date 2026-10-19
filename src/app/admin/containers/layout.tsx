import { prisma } from '@/lib/prisma';
import { ContainerTree } from '@/components/container-tree';

export const dynamic = 'force-dynamic';

export default async function ContainersLayout({ children }: { children: React.ReactNode }) {
  const containers = await prisma.container.findMany({
    // 프로모션 본문용 숨김 컨테이너(PROMOTION)는 전시화면 관리 목록에서 제외 — 전시/관리와 섞이지 않게.
    where: { NOT: { containerType: 'PROMOTION' } },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      status: true,
      approvalStatus: true,
      startAt: true,
      endAt: true,
      noEndDate: true,
      createdAt: true,
      parent: { select: { name: true } },
      templates: {
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        select: { id: true, name: true, conditionGroup: true, isDefault: true, status: true },
      },
    },
  });

  // 전체목록 팝업(PG495)용 평면 행 — 트리와 같은 원천에서 파생(추가 쿼리 없이).
  const allRows = containers.map((c) => ({
    id: c.id,
    name: c.name,
    parentName: c.parent?.name ?? null,
    status: c.status,
    approvalStatus: c.approvalStatus,
    startAt: c.startAt ? c.startAt.toISOString() : null,
    endAt: c.endAt ? c.endAt.toISOString() : null,
    noEndDate: c.noEndDate,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    // 라벤더 크롬 위에 뜬 두 라운드 패널 — 컨테이너 목록 + 콘텐츠. GNB 높이를 감안해 h-full.
    <div className="flex h-full gap-3 bg-[#ebeef6] pb-3 pr-3">
      <ContainerTree containers={containers} allRows={allRows} />
      <div className="min-w-0 flex-1 overflow-y-auto rounded-2xl border bg-white shadow-sm">{children}</div>
    </div>
  );
}
