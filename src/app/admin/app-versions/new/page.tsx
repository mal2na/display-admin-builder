// SB BO-AIM-ETC-PG041 App 버전 신규 등록 · 운영 관리
import { prisma } from '@/lib/prisma';
import { VersionForm } from '../version-form';
import { createVersion } from '../actions';
import { PageHeader } from '@/components/page-header';

export const dynamic = 'force-dynamic';

export default async function AppVersionNewPage() {
  const existing = await prisma.appVersion.findMany({ select: { version: true }, orderBy: { createdAt: 'desc' } });
  const versionOptions = Array.from(new Set(existing.map((e) => e.version)));
  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader
        trail={['운영 관리', 'App 버전 관리', 'App 버전 신규 등록']}
        title="App 버전 신규 등록"
      />
      <VersionForm mode="new" action={createVersion} versionOptions={versionOptions} />
    </div>
  );
}
