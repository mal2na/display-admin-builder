// SB BO-AIM-DSP-PG460/462 메뉴 관리 — 메뉴 정보 관리(3-pane) + 변경·승인 이력 탭 · 전시 관리
import { prisma } from '@/lib/prisma';
import { MenuManager, type MenuNode, type MenuHistoryRow } from './menu-manager';

export const dynamic = 'force-dynamic';

const HIST_STATUS: Record<string, string> = { requested: '승인요청', approved: '승인완료', rejected: '반려', cancelled: '요청취소' };
const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : null);

export default async function MenusPage() {
  const [menus, history] = await Promise.all([
    prisma.menu.findMany({ orderBy: [{ depth: 'asc' }, { sortOrder: 'desc' }] }),
    prisma.menuHistory.findMany({ orderBy: { seq: 'desc' } }),
  ]);

  const nodes: MenuNode[] = menus.map((m) => ({
    id: m.id, pageCode: m.pageCode ?? '-', menuCode: m.menuCode ?? null, menuName: m.menuName,
    path: m.path ?? m.menuName, depth: m.depth, sortOrder: m.sortOrder, parentId: m.parentId ?? null,
    category: m.category ?? null, frontExposeYn: m.frontExposeYn, channels: m.channels ? m.channels.split(',').filter(Boolean) : [],
    iconUrl: m.iconUrl ?? null, landingType: m.landingType ?? null, landingUrl: m.landingUrl ?? null,
  }));

  // 이력 바(최종 반영/수정자/수정일시/승인상태) — 최신 회차 기준
  const latest = history[0] ?? null;
  const headInfo = {
    reflectedAt: iso(history.find((h) => h.status === 'approved')?.reflectedAt ?? null),
    updatedBy: latest?.requester ?? '-',
    updatedAt: iso(latest?.requestedAt ?? null),
    approvalLabel: latest ? (HIST_STATUS[latest.status] ?? latest.status) : '-',
  };

  const hist: MenuHistoryRow[] = history.map((h) => ({
    id: h.id, seq: h.seq, statusLabel: HIST_STATUS[h.status] ?? h.status,
    requester: h.requester ?? '-', manager: h.manager ?? '-',
    requestedAt: iso(h.requestedAt), requestReason: h.requestReason ?? '-',
    processedAt: iso(h.processedAt), processReason: h.processReason ?? '-',
    changeNote: h.changeNote ?? null, version: h.version != null ? `V.${h.version}` : '',
  }));

  return <MenuManager nodes={nodes} headInfo={headInfo} history={hist} />;
}
