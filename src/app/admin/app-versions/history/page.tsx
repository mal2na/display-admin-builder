// SB BO-AIM-ETC-PG040 App 버전 관리 변경/승인이력 (전체 버전 통합) · 운영 관리
import { prisma } from '@/lib/prisma';
import { VersionTabs } from '../version-tabs';
import { VersionHistoryList } from '../history-list';
import { PageHeader } from '@/components/page-header';

export const dynamic = 'force-dynamic';

export default async function AppVersionHistoryPage() {
  const rows = await prisma.appVersionHistory.findMany({ orderBy: { createdAt: 'desc' } });
  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader
        trail={['운영 관리', 'App 버전 관리']}
        title="App 버전 관리"
        divider={false}
      />
      <VersionTabs />
      <VersionHistoryList
        rows={rows.map((h) => ({
          id: h.id, versionId: h.versionId, version: h.version, status: h.status,
          requester: h.requester, manager: h.manager,
          requestedAt: h.requestedAt?.toISOString() ?? null, requestReason: h.requestReason,
          processedAt: h.processedAt?.toISOString() ?? null, processReason: h.processReason, changeNote: h.changeNote,
        }))}
      />
    </div>
  );
}
