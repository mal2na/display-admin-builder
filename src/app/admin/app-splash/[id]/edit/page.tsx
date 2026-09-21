// SB-ETC-119 App 스플래시 수정 · 운영 관리
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { SplashForm } from '../../splash-form';
import { updateSplash } from '../../actions';
import { OpsSection, FieldRow, ReadValue, StatusPill } from '@/components/ops-ui';
import { APPLY_STATUS, SPLASH_APPROVAL, computeApplyStatus, fmtDateTime } from '@/lib/widget-taxonomy';
export const dynamic = 'force-dynamic';
export default async function SplashEditPage({ params }: { params: { id: string } }) {
  const s = await prisma.appSplash.findUnique({ where: { id: params.id } });
  if (!s) notFound();
  const newer = await prisma.appSplash.count({ where: { osType: s.osType, approvalStatus: 'approved', version: { gt: s.version } } });
  const apply = computeApplyStatus(s.approvalStatus, s.applyStartAt, newer > 0);
  const ap = SPLASH_APPROVAL[s.approvalStatus as keyof typeof SPLASH_APPROVAL] ?? SPLASH_APPROVAL.draft;

  const approvalSection = (
    <OpsSection no={1} title="승인 정보">
      <div className="grid grid-cols-2">
        <FieldRow label="승인 상태"><StatusPill label={ap.label} tone={ap.tone} /></FieldRow>
        <FieldRow label="승인 요청자"><ReadValue value={s.approvalRequester ?? '-'} /></FieldRow>
        <FieldRow label="승인 담당자"><ReadValue value={s.approvalManager ?? '-'} /></FieldRow>
      </div>
    </OpsSection>
  );
  const managerSection = (
    <OpsSection no={3} title="담당자 정보">
      <div className="grid grid-cols-2">
        <FieldRow label="등록자"><ReadValue value={s.createdBy ?? '-'} /></FieldRow>
        <FieldRow label="등록일시"><ReadValue value={fmtDateTime(s.createdAt)} /></FieldRow>
        <FieldRow label="최근 수정자"><ReadValue value={s.updatedBy ?? '-'} /></FieldRow>
        <FieldRow label="최근 수정일시"><ReadValue value={fmtDateTime(s.updatedAt)} /></FieldRow>
      </div>
    </OpsSection>
  );

  return (
    <div className="px-8 py-6">
      <nav className="mb-1 text-[12px] text-muted-foreground">홈 › 운영 관리 › App 스플래시 관리 › App 스플래시 수정</nav>
      <h1 className="mb-5 text-2xl font-bold">App 스플래시 수정</h1>
      <SplashForm mode="edit" action={updateSplash.bind(null, s.id)} topExtra={approvalSection} bottomExtra={managerSection} value={{
        version: s.version, osType: s.osType, applyLabel: APPLY_STATUS[apply].label,
        updateContent: s.updateContent, applyStartAt: s.applyStartAt?.toISOString() ?? null,
        bgImageUrl: s.bgImageUrl, bgImageAlt: s.bgImageAlt, bgUseYn: s.bgUseYn,
        animUrl: s.animUrl, animAlt: s.animAlt, animUseYn: s.animUseYn,
      }} />
    </div>
  );
}
