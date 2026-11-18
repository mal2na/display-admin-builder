'use client';

// SB BO-AIM-DSP-PG476(상세) / PG052(변경·승인이력 탭) — App 위젯 상세 탭 + 하단 버튼 CASE.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { PageTabs } from '@/components/page-tabs';
import { Button } from '@/components/ui/button';
import { StatusPill, Pager, TABLE_CLS, THEAD_TR_CLS, TBODY_TR_CLS } from '@/components/ops-ui';
import { fmtDateTime } from '@/lib/widget-taxonomy';
import { cn } from '@/lib/utils';
import { requestApprovalAppWidget, cancelRequestAppWidget } from './actions';
import { X } from 'lucide-react';

const HIST_STATUS: Record<string, { label: string; tone: string }> = {
  draft: { label: '임시저장', tone: 'muted' },
  requested: { label: '승인대기', tone: 'info' },
  approved: { label: '승인완료', tone: 'success' },
  rejected: { label: '승인반려', tone: 'negative' },
  cancelled: { label: '요청취소', tone: 'warning' },
};

export type WidgetHistRow = {
  id: string; seq: number; version: number | null; status: string;
  requester: string | null; requestedAt: string | null; requestReason: string | null;
  manager: string | null; processedAt: string | null; processReason: string | null;
  changeNote: string | null; canDiff: boolean;
};

export function WidgetDetailTabs({
  id, approvalStatus, detail, historyRows,
}: {
  id: string; approvalStatus: string; detail: React.ReactNode; historyRows: WidgetHistRow[];
}) {
  const [tab, setTab] = useState<'detail' | 'history'>('detail');

  // 버튼 CASE: 저장→수정·승인요청 · 승인대기→승인요청취소 · 승인완료/반려/요청취소→수정
  const showEdit = approvalStatus !== 'requested';
  const showRequest = approvalStatus === 'draft';
  const showCancel = approvalStatus === 'requested';

  const footer = (
    <div className="flex items-center justify-between pt-2">
      <div className="flex gap-2">
        <Link href="/admin/app-widgets" className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">목록</Link>
        <button type="button" onClick={() => setTab('history')} className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">변경 내용 보기</button>
      </div>
      <div className="flex gap-2">
        {showEdit && <Link href={`/admin/app-widgets/${id}/edit`} className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">수정</Link>}
        {showRequest && (
          <form action={requestApprovalAppWidget.bind(null, id)}>
            <button type="submit" className="inline-flex h-9 items-center rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700">승인요청</button>
          </form>
        )}
        {showCancel && (
          <form action={cancelRequestAppWidget.bind(null, id)}>
            <button type="submit" className="inline-flex h-9 items-center rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700">승인요청 취소</button>
          </form>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <PageTabs
        tabs={[{ key: 'detail', label: '상세정보' }, { key: 'history', label: '변경/승인이력' }]}
        value={tab}
        onChange={(k) => setTab(k as 'detail' | 'history')}
      />
      <div className="mt-6">
        {tab === 'detail' ? <div>{detail}{footer}</div> : <HistoryTab rows={historyRows} />}
      </div>
    </div>
  );
}

const PER_PAGE = 10;

// 변경/승인이력 탭 (PG052) — No, 승인상태, 버전, 승인요청자, 요청일시, 요청사유, 승인담당자, 처리일시, 처리사유, 변경내용
function HistoryTab({ rows }: { rows: WidgetHistRow[] }) {
  const [page, setPage] = useState(1);
  const [diffRow, setDiffRow] = useState<WidgetHistRow | null>(null);
  const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const pageSafe = Math.min(page, totalPages);
  const paged = useMemo(() => rows.slice((pageSafe - 1) * PER_PAGE, pageSafe * PER_PAGE), [rows, pageSafe]);

  return (
    <div>
      <div className="overflow-x-auto border-t border-[var(--line2)]">
        <table className={cn(TABLE_CLS, 'min-w-[1080px] whitespace-nowrap')}>
          <thead>
            <tr className={THEAD_TR_CLS}>
              <th className="w-14 text-left">No.</th>
              <th className="w-24 text-left">승인 상태</th>
              <th className="w-16 text-left">버전</th>
              <th className="text-left">승인 요청자</th>
              <th className="text-left">요청 일시</th>
              <th className="text-left">요청 사유</th>
              <th className="text-left">승인 담당자</th>
              <th className="text-left">처리 일시</th>
              <th className="text-left">처리 사유</th>
              <th className="w-24 text-center">변경내용</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={10} className="px-3 py-10 text-center text-[var(--ink3)]">이력이 없습니다.</td></tr>
            ) : paged.map((r, i) => {
              const no = rows.length - ((pageSafe - 1) * PER_PAGE + i);
              const s = HIST_STATUS[r.status] ?? HIST_STATUS.draft;
              return (
                <tr key={r.id} className={TBODY_TR_CLS}>
                  <td className="text-[var(--ink3)]">{no}</td>
                  <td><StatusPill label={s.label} tone={s.tone} /></td>
                  <td className="text-[var(--ink2)]">{r.status === 'approved' && r.version ? `V.${r.version}` : '-'}</td>
                  <td className="text-[var(--ink2)]">{r.requester ?? '-'}</td>
                  <td className="text-[var(--ink3)]">{r.requestedAt ? fmtDateTime(r.requestedAt) : '-'}</td>
                  <td className="max-w-[220px] truncate text-[var(--ink2)]" title={r.requestReason ?? ''}>{r.requestReason ?? '-'}</td>
                  <td className="text-[var(--ink2)]">{r.manager ?? '-'}</td>
                  <td className="text-[var(--ink3)]">{r.processedAt ? fmtDateTime(r.processedAt) : '-'}</td>
                  <td className="max-w-[180px] truncate text-[var(--ink2)]" title={r.processReason ?? ''}>{r.processReason ?? '-'}</td>
                  <td className="text-center">
                    <button type="button" disabled={!r.canDiff} onClick={() => setDiffRow(r)} className="inline-flex h-7 items-center rounded-[6px] border border-[var(--line3)] bg-white px-2.5 text-[12px] font-medium text-[var(--ink2)] transition hover:border-[var(--ac)] hover:text-[var(--ac)] disabled:cursor-not-allowed disabled:border-[var(--line2)] disabled:bg-[var(--th)] disabled:text-[#b3b9c0]">변경내용</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4"><Pager page={pageSafe} totalPages={totalPages} onChange={setPage} /></div>

      {diffRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDiffRow(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[20px] font-bold leading-[28px] tracking-[-0.6px] text-[var(--ink)]">변경 상세 내용</h3>
              <button onClick={() => setDiffRow(null)} className="text-[var(--ink3)] hover:text-[var(--ink)]"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-1">
              <div className="min-h-[96px] whitespace-pre-wrap rounded-lg border border-[var(--line2)] bg-[var(--th)] px-4 py-3 text-[13px] leading-relaxed text-[var(--ink2)]">
                {diffRow.changeNote?.trim() ? diffRow.changeNote : '직전 버전과 비교해 기록된 변경 내용이 없습니다.'}
              </div>
            </div>
            <div className="mt-6 flex justify-end"><button onClick={() => setDiffRow(null)} className="inline-flex h-[38px] items-center rounded-[6px] bg-[var(--ac)] px-4 text-[14px] font-semibold text-white hover:bg-[var(--ac-h)]">확인</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
