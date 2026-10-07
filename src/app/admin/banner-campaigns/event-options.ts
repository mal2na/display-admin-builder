import { prisma } from '@/lib/prisma';

export type PickOption = { id: string; name: string; kind: string };

// 랜딩 설정 '이벤트 조회' — 프로모션 관리(EventProgram, programKind='이벤트')의 활성 이벤트를 노출(2026-10-07).
export async function getEventOptions(): Promise<PickOption[]> {
  const rows = await prisma.eventProgram.findMany({
    where: { programKind: '이벤트', status: 'active' },
    select: { id: true, name: true, programType: true },
    orderBy: { name: 'asc' },
  });
  return rows.map((r) => ({ id: r.id, name: r.name, kind: r.programType }));
}
