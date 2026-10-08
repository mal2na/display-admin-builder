// SB BO-AIM-ETC-PG042 App 버전 관리 수정 · 운영 관리
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { VersionForm } from '../../version-form';
import { updateVersion } from '../../actions';
import { OpsSection, FieldRow, ReadValue } from '@/components/ops-ui';
import { fmtDateTime } from '@/lib/widget-taxonomy';
import { PageHeader } from '@/components/page-header';

export const dynamic = 'force-dynamic';

export default async function AppVersionEditPage({ params }: { params: { id: string } }) {
  const [v, existing] = await Promise.all([
    prisma.appVersion.findUnique({ where: { id: params.id } }),
    prisma.appVersion.findMany({ select: { version: true }, orderBy: { createdAt: 'desc' } }),
  ]);
  if (!v) notFound();
  const versionOptions = Array.from(new Set(existing.map((e) => e.version)));

  const managerSection = (
    <OpsSection title="담당자 정보">
      <div className="grid grid-cols-2">
        <FieldRow label="등록자"><ReadValue value={v.createdBy ?? '-'} /></FieldRow>
        <FieldRow label="등록일시"><ReadValue value={fmtDateTime(v.createdAt)} /></FieldRow>
        <FieldRow label="최근 수정자"><ReadValue value={v.updatedBy ?? '-'} /></FieldRow>
        <FieldRow label="최근 수정일시"><ReadValue value={fmtDateTime(v.updatedAt)} /></FieldRow>
      </div>
    </OpsSection>
  );

  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader
        trail={['운영 관리', 'App 버전 관리', 'App 버전 관리 수정']}
        title="App 버전 관리 수정"
      />
      <VersionForm
        mode="edit"
        action={updateVersion.bind(null, v.id)}
        versionOptions={versionOptions}
        bottomExtra={managerSection}
        value={{
          targetApp: v.targetApp, osType: v.osType, updateDate: v.updateDate?.toISOString() ?? null, version: v.version,
          recommendVersion: v.recommendVersion, forceVersion: v.forceVersion,
          detailContent: v.detailContent, versionContent: v.versionContent,
          recommendPopupTitle: v.recommendPopupTitle, recommendPopupContent: v.recommendPopupContent, recommendPopupImageUrl: v.recommendPopupImageUrl, recommendPopupImageAlt: v.recommendPopupImageAlt,
          forcePopupTitle: v.forcePopupTitle, forcePopupContent: v.forcePopupContent, forcePopupImageUrl: v.forcePopupImageUrl, forcePopupImageAlt: v.forcePopupImageAlt,
        }}
      />
    </div>
  );
}
