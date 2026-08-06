import { prisma } from '@/lib/prisma';
import { EventsDashboard, type ProjectCard, type DeployRow, type TrashRow } from './dashboard';

export const dynamic = 'force-dynamic';

function relTime(d: Date): string {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

// 게시 상태 파생 (운영 상태 필드가 별도로 없으므로 전시상태 + 전시기간으로 계산)
function publishState(r: {
  displayState: string;
  displayStartAt: Date | null;
  displayEndAt: Date | null;
  displayNoEndDate: boolean;
}): '미노출' | '게시 예정' | '게시 중' | '종료' {
  if (r.displayState !== '노출') return '미노출';
  const now = Date.now();
  if (r.displayStartAt && now < new Date(r.displayStartAt).getTime()) return '게시 예정';
  if (!r.displayNoEndDate && r.displayEndAt && now > new Date(r.displayEndAt).getTime()) return '종료';
  return '게시 중';
}

function fmt(d: Date | null): string {
  if (!d) return '—';
  const x = new Date(d);
  return `${x.getFullYear()}.${String(x.getMonth() + 1).padStart(2, '0')}.${String(x.getDate()).padStart(2, '0')}`;
}

export default async function EventsPage() {
  const rows = await prisma.eventProgram.findMany({
    where: { parentId: null },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      env: true,
      category: true,
      mode: true,
      status: true,
      updatedAt: true,
      createdAt: true,
      defaultPageId: true,
      displayState: true,
      displayStartAt: true,
      displayEndAt: true,
      displayNoEndDate: true,
      partnerBrand: true,
      defaultPage: { select: { nodes: { select: { type: true }, orderBy: { order: 'asc' } } } },
    },
  });

  const active = rows.filter((r) => r.status !== 'inactive');
  const trashed = rows.filter((r) => r.status === 'inactive');

  // 등록자 = 프로그램 생성 감사로그의 작성자 (없으면 기본 담당자)
  const createLogs = await prisma.auditLog.findMany({
    where: { targetType: 'EventProgram', targetId: { in: active.map((r) => r.id) }, result: 'CREATED' },
    select: { targetId: true, actor: true },
  });
  const authorOf = new Map(createLogs.map((l) => [l.targetId, l.actor]));
  const shortActor = (a: string | undefined) => (a ? a.split('@')[0] : '관리자');

  const projects: ProjectCard[] = active.map((r) => ({
    id: r.id,
    name: r.name,
    env: r.env,
    // 유형: 전시(거버넌스) 프로젝트는 '전시', 그 외엔 이벤트 유형(category), 없으면 '기타'
    type: r.mode === 'display' ? '전시' : r.category || '기타',
    updatedLabel: relTime(r.updatedAt),
    createdLabel: fmt(r.createdAt),
    author: shortActor(authorOf.get(r.id)),
    pageId: r.defaultPageId,
    nodeTypes: (r.defaultPage?.nodes ?? []).map((n) => n.type).slice(0, 8),
  }));

  const deployRows: DeployRow[] = active.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.mode === 'display' ? '전시' : r.category || '기타',
    partnerBrand: r.partnerBrand ?? null,
    displayState: r.displayState,
    publishState: publishState(r),
    period: `${fmt(r.displayStartAt)} ~ ${r.displayNoEndDate ? '상시' : fmt(r.displayEndAt)}`,
    pageId: r.defaultPageId,
  }));

  const trashRows: TrashRow[] = trashed.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.mode === 'display' ? '전시' : r.category || '기타',
    updatedLabel: relTime(r.updatedAt),
  }));

  return <EventsDashboard projects={projects} deployRows={deployRows} trashRows={trashRows} />;
}
