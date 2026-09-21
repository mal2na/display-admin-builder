// SB BO-AIM-ETC-PG047 App 스플래시 변경/승인이력 · 운영 관리
import { prisma } from '@/lib/prisma';
import { SplashTabs } from '../splash-tabs';
import { HistoryList, type HistoryRow } from './history-list';

export const dynamic = 'force-dynamic';

export default async function SplashHistoryPage() {
  const [rows, splashes] = await Promise.all([
    prisma.appSplashHistory.findMany({ orderBy: { createdAt: 'desc' }, include: { splash: true } }),
    prisma.appSplash.findMany({ select: { osType: true, version: true, approvalStatus: true } }),
  ]);
  // OS별 최신 승인완료 버전 (적용중 판정 기준)
  const latestApproved = new Map<string, number>();
  for (const s of splashes) if (s.approvalStatus === 'approved' && (latestApproved.get(s.osType) ?? -1) < s.version) latestApproved.set(s.osType, s.version);

  // 적용상태는 버전(레코드)당 대표 1행에만 표시 → 적용중은 OS별 1건씩 총 2건
  const seen = new Set<string>();
  const data: HistoryRow[] = rows.map((r) => {
    let applyLabel = '-';
    let applyTone = 'muted';
    if (!seen.has(r.splashId)) {
      seen.add(r.splashId);
      const p = r.splash;
      // 취소/반려는 적용상태 없음(-), 그 외에는 OS별 최고 승인완료 = 적용중, 나머지는 적용종료
      if (p.approvalStatus === 'cancelled' || p.approvalStatus === 'rejected') {
        applyLabel = '-';
      } else if (p.approvalStatus === 'approved' && p.version === latestApproved.get(p.osType)) {
        applyLabel = '적용중'; applyTone = 'blue';
      } else {
        applyLabel = '적용종료'; applyTone = 'slate';
      }
    }
    return {
      id: r.id, splashId: r.splashId, osType: r.osType, version: r.version, status: r.status,
      requester: r.requester, manager: r.manager,
      requestedAt: r.requestedAt?.toISOString() ?? null, requestReason: r.requestReason,
      processedAt: r.processedAt?.toISOString() ?? null, processReason: r.processReason,
      changeNote: r.changeNote,
      applyLabel, applyTone,
      currentStatus: r.splash.approvalStatus,
    };
  });
  // 적용중 2건을 최상단으로 (그 외는 기존 최신순 유지)
  data.sort((a, b) => (b.applyLabel === '적용중' ? 1 : 0) - (a.applyLabel === '적용중' ? 1 : 0));
  return (
    <div className="px-8 py-6">
      <nav className="mb-1 text-[12px] text-muted-foreground">홈 › 운영 관리 › App 스플래시 관리</nav>
      <h1 className="mb-3 text-2xl font-bold">App 스플래시 관리</h1>
      <SplashTabs />
      <HistoryList rows={data} />
    </div>
  );
}
