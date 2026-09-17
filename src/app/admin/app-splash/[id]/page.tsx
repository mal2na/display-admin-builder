// SB BO-AIM-ETC-PG045 App 스플래시 상세정보 · 운영 관리
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { SplashTabs } from '../splash-tabs';
import { SplashDetailView } from '../splash-detail-view';
import { APPLY_STATUS, computeApplyStatus } from '@/lib/widget-taxonomy';
import { requestApprovalSplash, cancelRequestSplash } from '../actions';

export const dynamic = 'force-dynamic';

export default async function SplashDetailPage({ params }: { params: { id: string } }) {
  const s = await prisma.appSplash.findUnique({ where: { id: params.id } });
  if (!s) notFound();
  const newer = await prisma.appSplash.count({ where: { osType: s.osType, approvalStatus: 'approved', version: { gt: s.version } } });
  const apply = computeApplyStatus(s.approvalStatus, s.applyStartAt, newer > 0);

  const footer = (
    <div className="flex items-center justify-center gap-2 pt-2">
      <Link href="/admin/app-splash" className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">목록</Link>
      <Link href={`/admin/app-splash/${s.id}/edit`} className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">수정</Link>
      {s.approvalStatus === 'requested' ? (
        <form action={cancelRequestSplash.bind(null, s.id)}>
          <button type="submit" className="inline-flex h-9 items-center rounded-md border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-700 hover:bg-amber-100">요청취소</button>
        </form>
      ) : (
        <form action={requestApprovalSplash.bind(null, s.id)}>
          <button type="submit" className="inline-flex h-9 items-center rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700">승인요청</button>
        </form>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl p-6">
      <nav className="mb-1 text-[12px] text-muted-foreground">홈 › 운영 관리 › App 스플래시 관리 › App 스플래시 상세</nav>
      <h1 className="mb-3 text-2xl font-bold">App 스플래시 상세정보</h1>
      <SplashTabs />
      <SplashDetailView
        s={{
          version: s.version, osType: s.osType, applyLabel: APPLY_STATUS[apply].label, applyStartAt: s.applyStartAt?.toISOString() ?? null, updateContent: s.updateContent,
          approvalStatus: s.approvalStatus, approvalRequester: s.approvalRequester, approvalManager: s.approvalManager,
          approvalRequestedAt: s.approvalRequestedAt?.toISOString() ?? null, approvalProcessedAt: s.approvalProcessedAt?.toISOString() ?? null,
          bgImageUrl: s.bgImageUrl, bgImageAlt: s.bgImageAlt, bgUseYn: s.bgUseYn,
          animUrl: s.animUrl, animAlt: s.animAlt, animUseYn: s.animUseYn,
          createdBy: s.createdBy, createdAt: s.createdAt.toISOString(), updatedBy: s.updatedBy, updatedAt: s.updatedAt.toISOString(),
        }}
        footer={footer}
      />
    </div>
  );
}
