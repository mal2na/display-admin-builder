// SB-ETC-111 App 버전 관리 목록 · 운영 관리
//  대상App·OS·버전/승인/적용 상태를 조건 검색으로 조회. 행 클릭 → 상세(SB-ETC-112).
import { prisma } from '@/lib/prisma';
import { VersionList, type VersionRow } from './version-list';

export const dynamic = 'force-dynamic';

const APPROVAL_LABEL: Record<string, string> = {
  draft: '임시저장', requested: '승인요청', approved: '승인완료', rejected: '반려', cancelled: '요청취소',
};

const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : null);
// 시맨틱 버전 비교 (a.b.c)
const cmpVer = (a: string, b: string) => {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0), pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
};

export default async function AppVersionsPage() {
  const rows = await prisma.appVersion.findMany({ orderBy: { createdAt: 'desc' } });

  // (대상App+OS)별 승인완료 버전 집합 — 적용종료(더 높은 승인완료 버전 존재) 판정용
  const approvedByKey: Record<string, string[]> = {};
  for (const r of rows) if (r.approvalStatus === 'approved') (approvedByKey[`${r.targetApp}|${r.osType}`] ??= []).push(r.version);

  const now = Date.now();
  const applyState = (r: (typeof rows)[number]): string => {
    if (r.approvalStatus !== 'approved') return '-';
    if ((approvedByKey[`${r.targetApp}|${r.osType}`] ?? []).some((v) => cmpVer(v, r.version) > 0)) return '적용종료';
    if (r.updateDate && now < new Date(r.updateDate).getTime()) return '적용예정';
    return '적용중';
  };

  const list: VersionRow[] = rows.map((r) => ({
    id: r.id,
    targetApp: r.targetApp,
    osType: r.osType,
    applyState: applyState(r),
    approvalLabel: APPROVAL_LABEL[r.approvalStatus] ?? r.approvalStatus,
    version: r.version,
    recommendVersion: r.recommendVersion ?? '-',
    forceVersion: r.forceVersion ?? '-',
    updateDate: iso(r.updateDate),
    createdBy: r.createdBy ?? '-',
    createdAt: iso(r.createdAt),
    updatedBy: r.updatedBy ?? r.createdBy ?? '-',
    updatedAt: iso(r.updatedAt),
  }));

  return <VersionList rows={list} />;
}
