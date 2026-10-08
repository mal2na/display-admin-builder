// SB-ETC-122 App 버전 관리 변경/승인이력 상세 · 운영 관리
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { VersionDetailView } from '../../version-detail-view';
import { OpsSection, FieldRow, ReadValue } from '@/components/ops-ui';
import { fmtDateTime } from '@/lib/widget-taxonomy';
import { PageHeader } from '@/components/page-header';

export const dynamic = 'force-dynamic';

export default async function AppVersionHistoryDetailPage({ params }: { params: { hid: string } }) {
  const h = await prisma.appVersionHistory.findUnique({ where: { id: params.hid } });
  if (!h) notFound();
  const v = await prisma.appVersion.findUnique({ where: { id: h.versionId } });
  if (!v) notFound();

  const approvalSection = (
    <OpsSection title="승인정보">
      <div className="grid grid-cols-2">
        <FieldRow label="승인 요청자"><ReadValue value={h.requester ?? '-'} /></FieldRow>
        <FieldRow label="승인 요청일"><ReadValue value={fmtDateTime(h.requestedAt)} /></FieldRow>
        <FieldRow label="승인 담당자"><ReadValue value={h.manager ?? '-'} /></FieldRow>
        <FieldRow label="승인 처리일"><ReadValue value={fmtDateTime(h.processedAt)} /></FieldRow>
        <FieldRow label="App 버전"><ReadValue value={h.version ?? v.version} /></FieldRow>
      </div>
    </OpsSection>
  );

  const footer = (
    <div className="flex items-center justify-start pt-2">
      <Link href="/admin/app-versions/history" className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">목록</Link>
    </div>
  );

  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader
        trail={['운영 관리', 'App 버전 관리', '변경/승인이력', '변경/승인이력 상세']}
        title="변경/승인이력 상세"
      />
      <VersionDetailView
        topExtra={approvalSection}
        v={{
          targetApp: v.targetApp, osType: v.osType, updateDate: v.updateDate?.toISOString() ?? null, version: h.version ?? v.version,
          approvalStatus: h.status,
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
