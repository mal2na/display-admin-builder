'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageTabs } from '@/components/page-tabs';
import { StatusPill, Pager } from '@/components/ops-ui';
import { fmtDateTime } from '@/lib/widget-taxonomy';
import { SplashDetailView, type SplashView } from './splash-detail-view';
import { X } from 'lucide-react';

// SB BO-AIM-ETC-PG047 — App 스플래시 상세 내 [변경/승인이력] 탭 회차 상태 표기.
//  톤은 표준 승인상태(승인완료=green·승인대기=blue)에 맞춰 명시 지정. 라벨은 SB 표기(저장·승인대기·반려).
const HIST_STATUS: Record<string, { label: string; tone: string }> = {
  draft: { label: '저장', tone: 'neutral' },
  requested: { label: '승인대기', tone: 'info' },
  approved: { label: '승인완료', tone: 'success' },
  rejected: { label: '반려', tone: 'negative' },
  cancelled: { label: '요청취소', tone: 'warning' },
};

export type SplashHistoryRow = {
  id: string; // AppSplashHistory.id (회차)
  status: string;
  version: number | null;
  requester: string | null;
  requestedAt: string | null;
  requestReason: string | null;
  manager: string | null;
  processedAt: string | null;
  processReason: string | null;
  changeNote: string | null;
  canDiff: boolean; // 직전 버전과 비교할 변경 내용 유무 (최초 등록 회차는 false)
};

const PER_PAGE = 10;

export function SplashDetailTabs({
  splashId,
  detail,
  footer,
  historyRows,
  initialTab = 'detail',
}: {
  splashId: string;
  detail: SplashView;
  footer: React.ReactNode;
  historyRows: SplashHistoryRow[];
  initialTab?: 'detail' | 'history';
}) {
  const [tab, setTab] = useState<'detail' | 'history'>(initialTab);

  return (
    <div>
      <PageTabs
        tabs={[
          { key: 'detail', label: '상세정보' },
          { key: 'history', label: '변경/승인이력' },
        ]}
        value={tab}
        onChange={(k) => setTab(k as 'detail' | 'history')}
      />

      <div className="mt-6">
        {tab === 'detail' ? (
          <SplashDetailView s={detail} footer={footer} />
        ) : (
          <HistoryTab splashId={splashId} rows={historyRows} />
        )}
      </div>
    </div>
  );
}

// ── 변경/승인이력 탭 (단일 스플래시 회차 이력) ──
function HistoryTab({ splashId, rows }: { splashId: string; rows: SplashHistoryRow[] }) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [diffRow, setDiffRow] = useState<SplashHistoryRow | null>(null);

  const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const pageSafe = Math.min(page, totalPages);
  const paged = useMemo(
    () => rows.slice((pageSafe - 1) * PER_PAGE, pageSafe * PER_PAGE),
    [rows, pageSafe],
  );

  const go = (r: SplashHistoryRow) => router.push(`/admin/app-splash/history/${r.id}`);

  return (
    <div>
      <div className="overflow-x-auto border-y border-[var(--line2)] bg-white">
        <table className="w-full min-w-[1040px] text-[14px]">
          <thead>
            <tr className="h-10 border-b border-[var(--line2)] bg-[var(--th)] text-left text-[var(--ink2)] [&>th]:whitespace-nowrap [&>th]:px-3 [&>th]:py-2.5 [&>th]:font-semibold">
              <th className="w-14">No.</th>
              <th className="w-24">상태</th>
              <th className="w-16">Ver.</th>
              <th>승인 요청자</th>
              <th>요청 일시</th>
              <th>요청 사유</th>
              <th>승인 담당자</th>
              <th>처리 일시</th>
              <th>처리 사유</th>
              <th className="w-24 text-center">변경내용</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-10 text-center text-muted-foreground">이력이 없습니다.</td>
              </tr>
            ) : (
              paged.map((r, i) => {
                const no = rows.length - ((pageSafe - 1) * PER_PAGE + i);
                const s = HIST_STATUS[r.status] ?? HIST_STATUS.draft;
                return (
                  <tr
                    key={r.id}
                    onClick={() => go(r)}
                    className="h-12 cursor-pointer border-b border-[var(--line2)] text-[var(--ink)] last:border-b-0 hover:bg-[var(--th)] [&>td]:px-3 [&>td]:py-2 [&>td]:align-middle"
                  >
                    <td className="text-[var(--ink3)]">{no}</td>
                    <td><StatusPill label={s.label} tone={s.tone} /></td>
                    <td className="text-[var(--ink2)]">{r.status === 'approved' && r.version ? `V.${r.version}` : '-'}</td>
                    <td className="text-[var(--ink2)]">{r.requester ?? '-'}</td>
                    <td className="text-[12px] text-[var(--ink3)]">{r.requestedAt ? fmtDateTime(r.requestedAt) : '-'}</td>
                    <td className="max-w-[220px] truncate text-[var(--ink2)]" title={r.requestReason ?? ''}>{r.requestReason ?? '-'}</td>
                    <td className="text-[var(--ink2)]">{r.manager ?? '-'}</td>
                    <td className="text-[12px] text-[var(--ink3)]">{r.processedAt ? fmtDateTime(r.processedAt) : '-'}</td>
                    <td className="max-w-[180px] truncate text-[var(--ink2)]" title={r.processReason ?? ''}>{r.processReason ?? '-'}</td>
                    <td className="text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        disabled={!r.canDiff}
                        onClick={() => setDiffRow(r)}
                        className="inline-flex h-7 items-center rounded-[6px] border border-[var(--line3)] bg-white px-2.5 text-[12px] font-medium text-[var(--ink2)] transition hover:bg-[var(--th)] disabled:cursor-not-allowed disabled:border-[var(--line2)] disabled:bg-[var(--th)] disabled:text-[#b3b9c0]"
                      >
                        변경내용
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <Pager page={pageSafe} totalPages={totalPages} onChange={setPage} />
      </div>

      {/* BO-COMM-PU02 변경 상세 내용 팝업 */}
      {diffRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDiffRow(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[18px] font-bold text-[var(--ink)]">변경 상세 내용</h3>
              <button onClick={() => setDiffRow(null)} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>

            <div className="overflow-hidden rounded-lg border border-[var(--line2)]">
              <div className="grid grid-cols-[120px_1fr] text-[13px]">
                <div className="border-b border-r border-[var(--line2)] bg-[var(--th)] px-4 py-3 text-[var(--ink2)]">상태</div>
                <div className="flex items-center border-b border-[var(--line2)] px-4 py-3">
                  <StatusPill label={(HIST_STATUS[diffRow.status] ?? HIST_STATUS.draft).label} tone={(HIST_STATUS[diffRow.status] ?? HIST_STATUS.draft).tone} />
                </div>
                <div className="border-b border-r border-[var(--line2)] bg-[var(--th)] px-4 py-3 text-[var(--ink2)]">버전</div>
                <div className="border-b border-[var(--line2)] px-4 py-3 text-[var(--ink)]">{diffRow.status === 'approved' && diffRow.version ? `V.${diffRow.version}` : '-'}</div>
                <div className="border-b border-r border-[var(--line2)] bg-[var(--th)] px-4 py-3 text-[var(--ink2)]">요청자</div>
                <div className="border-b border-[var(--line2)] px-4 py-3 text-[var(--ink)]">{diffRow.requester ?? '-'}{diffRow.requestedAt ? ` · ${fmtDateTime(diffRow.requestedAt)}` : ''}</div>
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-[14px] font-bold text-[var(--ink)]">변경 내용</p>
              <div className="min-h-[96px] whitespace-pre-wrap rounded-lg border border-[var(--line2)] bg-[var(--th)] px-4 py-3 text-[13px] leading-relaxed text-[var(--ink2)]">
                {diffRow.changeNote?.trim() ? diffRow.changeNote : '직전 버전과 비교해 기록된 변경 내용이 없습니다.'}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button onClick={() => setDiffRow(null)} className="inline-flex h-9 items-center rounded-md bg-[var(--ac)] px-5 text-sm font-semibold text-white hover:opacity-90">확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
