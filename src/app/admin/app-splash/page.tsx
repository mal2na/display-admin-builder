// SB-ETC-116 App 스플래시 관리 목록 · 운영 관리
//  OS유형별 버전/승인/적용 상태를 조건 검색으로 조회. 행 클릭 → 상세(SB-ETC-118).
import { prisma } from '@/lib/prisma';
import { SplashList, type SplashRow } from './splash-list';

export const dynamic = 'force-dynamic';

const APPROVAL_LABEL: Record<string, string> = {
  draft: '임시저장', requested: '승인요청', approved: '승인완료', rejected: '반려', cancelled: '요청취소',
};

function iso(d: Date | null | undefined): string | null {
  return d ? new Date(d).toISOString() : null;
}

export default async function AppSplashPage() {
  const rows = await prisma.appSplash.findMany({ orderBy: { createdAt: 'desc' } });

  // OS유형별 승인완료 버전 집합 — 적용종료(더 높은 승인완료 버전 존재) 판정용
  const approvedVers: Record<string, number[]> = {};
  for (const r of rows) if (r.approvalStatus === 'approved') (approvedVers[r.osType] ??= []).push(r.version);

  // 적용상태: 승인완료 건만 계산, 그 외는 '-' (SB-ETC-118 3-3)
  const now = Date.now();
  const applyState = (r: (typeof rows)[number]): string => {
    if (r.approvalStatus !== 'approved') return '-';
    if ((approvedVers[r.osType] ?? []).some((v) => v > r.version)) return '적용종료'; // 다음 버전 생성됨
    if (r.applyStartAt && now < new Date(r.applyStartAt).getTime()) return '적용예정';
    return '적용중';
  };

  const list: SplashRow[] = rows.map((r) => ({
    id: r.id,
    osType: r.osType,
    version: r.approvalStatus === 'approved' ? String(r.version) : '-', // 승인완료만 버전 부여
    applyState: applyState(r),
    approvalLabel: APPROVAL_LABEL[r.approvalStatus] ?? r.approvalStatus,
    title: r.title ?? '-',
    applyStartAt: iso(r.applyStartAt),
    createdBy: r.createdBy ?? '-',
    createdAt: iso(r.createdAt),
    updatedBy: r.updatedBy ?? r.createdBy ?? '-',
    updatedAt: iso(r.updatedAt),
  }));

  return <SplashList rows={list} />;
}
