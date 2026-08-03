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
    <div className="flex h-screen">
      <ContainerTree containers={containers} />
      <div className="flex-1 overflow-y-auto bg-white">{children}</div>
    </div>
  );
}
