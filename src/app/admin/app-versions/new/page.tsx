// SB BO-AIM-ETC-PG041 App 버전 신규 등록 · 운영 관리
import { prisma } from '@/lib/prisma';
import { VersionForm } from '../version-form';
import { createVersion } from '../actions';

export const dynamic = 'force-dynamic';

export default async function AppVersionNewPage() {
  const existing = await prisma.appVersion.findMany({ select: { version: true }, orderBy: { createdAt: 'desc' } });
  const versionOptions = Array.from(new Set(existing.map((e) => e.version)));
  return (
    <div className="px-8 py-6">
      <nav className="mb-1 text-[12px] text-muted-foreground">홈 › 운영 관리 › App 버전 관리 › App 버전 신규 등록</nav>
      <h1 className="mb-5 text-2xl font-bold">App 버전 신규 등록</h1>
      <VersionForm mode="new" action={createVersion} versionOptions={versionOptions} />
    </div>
  );
}
