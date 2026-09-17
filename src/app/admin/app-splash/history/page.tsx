// SB BO-AIM-ETC-PG047 App 스플래시 변경/승인이력 · 운영 관리
import { prisma } from '@/lib/prisma';
import { SplashTabs } from '../splash-tabs';
import { HistoryList, type HistoryRow } from './history-list';

export const dynamic = 'force-dynamic';

export default async function SplashHistoryPage() {
  const rows = await prisma.appSplashHistory.findMany({ orderBy: { createdAt: 'desc' } });
  const data: HistoryRow[] = rows.map((r) => ({
    id: r.id, splashId: r.splashId, osType: r.osType, version: r.version, status: r.status,
    requester: r.requester, manager: r.manager,
    requestedAt: r.requestedAt?.toISOString() ?? null, requestReason: r.requestReason,
    processedAt: r.processedAt?.toISOString() ?? null, processReason: r.processReason,
    changeNote: r.changeNote,
  }));
  return (
    <div className="mx-auto max-w-6xl p-6">
      <nav className="mb-1 text-[12px] text-muted-foreground">홈 › 운영 관리 › App 스플래시 관리 › 변경/승인이력</nav>
      <h1 className="mb-3 text-2xl font-bold">App 스플래시 관리</h1>
      <SplashTabs />
      <HistoryList rows={data} />
    </div>
  );
}
