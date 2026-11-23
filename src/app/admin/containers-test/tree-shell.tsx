// 전시화면 관리 (테스트) — 좌측 컨테이너 트리 + 우측 콘텐츠. 실제 전시화면 관리와 동일한 진입 구조.
//  트리 링크만 테스트 라우트(c/[id] 상세 · t/[id] 빌더)로 바꿔 ContainerTree 를 재사용한다(2026-10-20).
import { prisma } from '@/lib/prisma';
import { ContainerTree } from '@/components/container-tree';

export async function ContainersTestShell({ children }: { children: React.ReactNode }) {
  const containers = await prisma.container.findMany({
    // 혜택 탭만 노출(2026-11-23 사용자 요청: 빌더에서 혜택만 남기고 나머지 숨김). 데이터는 보존 — 되돌리려면 name 필터만 제거.
    where: { NOT: { containerType: 'PROMOTION' }, name: { contains: '혜택' } },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      status: true,
      parent: { select: { name: true } },
      templates: {
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        select: { id: true, name: true, conditionGroup: true, isDefault: true, status: true },
      },
    },
  });
  const allRows = containers.map((c) => ({
    id: c.id, name: c.name, parentName: c.parent?.name ?? null,
    status: c.status, approvalStatus: 'DRAFT', startAt: null, endAt: null, noEndDate: false,
    createdAt: new Date().toISOString(),
  }));

  return (
    <div className="flex h-full gap-3 bg-[#ebeef6] pb-3 pr-3">
      <ContainerTree
        containers={containers}
        allRows={allRows}
        linkContainerTpl="/admin/containers-test/c/{id}"
        linkTemplateTpl="/admin/containers-test/t/{id}"
        newHref="/admin/containers-test/new"
      />
      <div className="min-w-0 flex-1 overflow-y-auto rounded-2xl border bg-white shadow-sm">{children}</div>
    </div>
  );
}
