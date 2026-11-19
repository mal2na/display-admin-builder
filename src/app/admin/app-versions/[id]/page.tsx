// SB BO-AIM-DSP-PG581 App 버전 상세 · PG580 변경/승인이력(TAB) · 운영 관리
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { VersionDetailTabs, type VersionHistRow } from '../version-detail-tabs';
import { requestApprovalVersion, cancelRequestVersion } from '../actions';
import { PageHeader } from '@/components/page-header';

export const dynamic = 'force-dynamic';

// 시맨틱 버전 비교 (a.b.c)
const cmpVer = (a: string, b: string) => {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0), pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
};

export default async function AppVersionDetailPage({
  params, searchParams,
}: {
  params: { id: string };
  searchParams?: { tab?: string };
}) {
  const v = await prisma.appVersion.findUnique({
    where: { id: params.id },
    include: { history: { orderBy: { createdAt: 'desc' } } },
  });
  if (!v) notFound();

  // 적용상태 — 승인완료 건만. 같은 (대상App+OS)에서 더 높은 승인완료 버전이 있으면 적용종료.
  const approved = await prisma.appVersion.findMany({ where: { targetApp: v.targetApp, osType: v.osType, approvalStatus: 'approved' }, select: { version: true } });
  const hasNewer = approved.some((a) => cmpVer(a.version, v.version) > 0);
  const applyLabel = v.approvalStatus !== 'approved' ? '-'
    : hasNewer ? '적용종료'
    : v.updateDate && Date.now() < new Date(v.updateDate).getTime() ? '적용예정' : '적용중';

  // 변경/승인이력 회차 — 최신순. 최초 등록(가장 오래된) 회차는 변경내용 버튼 비활성.
  const oldestId = v.history.length ? v.history[v.history.length - 1].id : null;
  const historyRows: VersionHistRow[] = v.history.map((h) => ({
    id: h.id,
    status: h.status,
    requester: h.requester,
    requestedAt: h.requestedAt?.toISOString() ?? null,
    requestReason: h.requestReason,
    manager: h.manager,
    processedAt: h.processedAt?.toISOString() ?? null,
    processReason: h.processReason,
    changeNote: h.changeNote,
    canDiff: h.id !== oldestId,
  }));

  // 상태별 버튼(SB PG581 버튼 CASE): 저장→목록/수정·승인요청 · 승인대기→목록/승인요청취소 · 승인완료·반려·요청취소→목록/수정
  const st = v.approvalStatus;
  const showEdit = st !== 'requested';
  const showRequest = st === 'draft';
  const showCancelReq = st === 'requested';

  const footer = (
    <div className="flex items-center justify-between pt-2">
      <Link href="/admin/app-versions" className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">목록</Link>
      <div className="flex items-center gap-2">
        {showEdit && <Link href={`/admin/app-versions/${v.id}/edit`} className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">수정</Link>}
        {showRequest && (
          <form action={requestApprovalVersion.bind(null, v.id)}>
            <button type="submit" className="inline-flex h-9 items-center rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700">승인요청</button>
          </form>
        )}
        {showCancelReq && (
          <form action={cancelRequestVersion.bind(null, v.id)}>
            <button type="submit" className="inline-flex h-9 items-center rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700">승인요청 취소</button>
          </form>
        )}
      </div>
    </div>
  );

  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader
        trail={['운영관리', 'App 버전 관리', 'App 버전 상세']}
        title="App 버전 상세"
      />
      <VersionDetailTabs
        initialTab={searchParams?.tab === 'history' ? 'history' : 'detail'}
        detail={{
          targetApp: v.targetApp, osType: v.osType, updateDate: v.updateDate?.toISOString() ?? null, version: v.version, applyLabel,
          approvalStatus: v.approvalStatus, approvalRequester: v.approvalRequester, approvalManager: v.approvalManager,
          approvalRequestedAt: v.approvalRequestedAt?.toISOString() ?? null, approvalProcessedAt: v.approvalProcessedAt?.toISOString() ?? null,
          recommendVersion: v.recommendVersion, forceVersion: v.forceVersion,
          detailContent: v.detailContent,
          recommendPopupTitle: v.recommendPopupTitle, recommendPopupContent: v.recommendPopupContent, recommendPopupImageUrl: v.recommendPopupImageUrl, recommendPopupImageAlt: v.recommendPopupImageAlt,
          forcePopupTitle: v.forcePopupTitle, forcePopupContent: v.forcePopupContent, forcePopupImageUrl: v.forcePopupImageUrl, forcePopupImageAlt: v.forcePopupImageAlt,
          createdBy: v.createdBy, createdAt: v.createdAt.toISOString(), updatedBy: v.updatedBy, updatedAt: v.updatedAt.toISOString(),
        }}
        footer={footer}
        historyRows={historyRows}
      />
    </div>
  );
}
