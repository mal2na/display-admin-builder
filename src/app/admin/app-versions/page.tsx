// SB BO-AIM-ETC-PG038 App 버전 관리 목록 · 운영 관리
import { prisma } from '@/lib/prisma';
import { VersionList } from './version-list';
import { VersionTabs } from './version-tabs';

export const dynamic = 'force-dynamic';

export default async function AppVersionsPage() {
  const rows = await prisma.appVersion.findMany({ orderBy: { createdAt: 'desc' } });
  return (
    <div className="px-8 py-6">
      <nav className="mb-1 text-[12px] text-muted-foreground">홈 › 운영 관리 › App 버전 관리</nav>
      <h1 className="mb-3 text-2xl font-bold">App 버전 관리</h1>
      <VersionTabs />
      <VersionList rows={rows.map((r) => ({
        id: r.id, targetApp: r.targetApp, osType: r.osType, version: r.version,
        recommendVersion: r.recommendVersion, forceVersion: r.forceVersion,
        updateDate: r.updateDate?.toISOString() ?? null, createdAt: r.createdAt.toISOString(),
      }))} />
    </div>
  );
}
