// SB BO-AIM-ETC-PG039 App 버전 상세 · 운영 관리
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { VersionDetailView } from '../version-detail-view';

export const dynamic = 'force-dynamic';

export default async function AppVersionDetailPage({ params }: { params: { id: string } }) {
  const v = await prisma.appVersion.findUnique({ where: { id: params.id } });
  if (!v) notFound();

  const footer = (
    <div className="flex items-center justify-between pt-2">
      <Link href="/admin/app-versions" className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">목록</Link>
      <Link href={`/admin/app-versions/${v.id}/edit`} className="inline-flex h-9 items-center rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700">수정</Link>
    </div>
  );

  return (
    <div className="px-8 py-6">
      <nav className="mb-1 text-[12px] text-muted-foreground">홈 › 운영 관리 › App 버전 관리 › App 버전 상세</nav>
      <h1 className="mb-5 text-2xl font-bold">App 버전 상세</h1>
      <VersionDetailView
        v={{
          targetApp: v.targetApp, osType: v.osType, updateDate: v.updateDate?.toISOString() ?? null, version: v.version,
          approvalStatus: v.approvalStatus,
          recommendVersion: v.recommendVersion, forceVersion: v.forceVersion,
          detailContent: v.detailContent, versionContent: v.versionContent,
          recommendPopupTitle: v.recommendPopupTitle, recommendPopupContent: v.recommendPopupContent, recommendPopupImageUrl: v.recommendPopupImageUrl, recommendPopupImageAlt: v.recommendPopupImageAlt,
          forcePopupTitle: v.forcePopupTitle, forcePopupContent: v.forcePopupContent, forcePopupImageUrl: v.forcePopupImageUrl, forcePopupImageAlt: v.forcePopupImageAlt,
          createdBy: v.createdBy, createdAt: v.createdAt.toISOString(), updatedBy: v.updatedBy, updatedAt: v.updatedAt.toISOString(),
        }}
        footer={footer}
      />
    </div>
  );
}
