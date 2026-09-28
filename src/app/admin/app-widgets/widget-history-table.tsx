'use client';

import { StatusPill } from '@/components/ops-ui';
import { fmtDateTime } from '@/lib/widget-taxonomy';

export type WidgetHistoryRow = {
  id: string;
  seq: number;
  version: number | null;
  status: string;
  requester: string | null;
  manager: string | null;
  requestedAt: string | null;
  requestReason: string | null;
  processedAt: string | null;
  processReason: string | null;
  changeNote: string | null;
};

// 이력 상태 라벨/톤 — 승인요청/승인완료/요청취소/반려
const HIST_STATUS: Record<string, { label: string; tone: string }> = {
  requested: { label: '승인요청', tone: 'blue' },
  approved: { label: '승인완료', tone: 'green' },
  cancelled: { label: '요청취소', tone: 'amber' },
  rejected: { label: '반려', tone: 'red' },
};

export function WidgetHistoryTable({ rows }: { rows: WidgetHistoryRow[] }) {
  return (
    <div className="border-y border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-[12px] text-slate-600">
            <th className="w-12 px-3 py-2.5 text-left font-medium">NO</th>
            <th className="w-20 px-3 py-2.5 text-left font-medium">상태</th>
            <th className="px-3 py-2.5 text-left font-medium">승인 요청자</th>
            <th className="px-3 py-2.5 text-left font-medium">요청 일시</th>
            <th className="px-3 py-2.5 text-left font-medium">사유</th>
            <th className="px-3 py-2.5 text-left font-medium">승인 담당자</th>
            <th className="px-3 py-2.5 text-left font-medium">처리 일시</th>
            <th className="px-3 py-2.5 text-left font-medium">처리 사유</th>
            <th className="w-24 px-3 py-2.5 text-center font-medium">변경내용</th>
            <th className="w-16 px-3 py-2.5 text-center font-medium">버전</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={10} className="px-3 py-10 text-center text-muted-foreground">이력이 없습니다.</td></tr>
          ) : rows.map((r) => {
            const st = HIST_STATUS[r.status] ?? { label: r.status, tone: 'muted' };
            const canDetail = r.status !== 'cancelled'; // 요청취소·최초 등록 시 비활성 (SB 1-8)
            return (
              <tr key={r.id} className="border-b last:border-b-0 hover:bg-slate-50/60">
                <td className="px-3 py-2.5 text-slate-500">{r.seq}</td>
                <td className="px-3 py-2.5"><StatusPill label={st.label} tone={st.tone} /></td>
                <td className="px-3 py-2.5 text-slate-700">{r.requester ?? '-'}</td>
                <td className="px-3 py-2.5 text-[12px] text-slate-500">{fmtDateTime(r.requestedAt)}</td>
                <td className="px-3 py-2.5 text-slate-700">{r.requestReason ?? '-'}</td>
                <td className="px-3 py-2.5 text-slate-700">{r.manager ?? '-'}</td>
                <td className="px-3 py-2.5 text-[12px] text-slate-500">
                  {r.status === 'requested'
                    ? <button type="button" onClick={() => confirm('요청을 취소하시겠습니까?') && alert('요청이 취소되었습니다. (프로토타입)')} className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50">요청 취소</button>
                    : fmtDateTime(r.processedAt)}
                </td>
                <td className="px-3 py-2.5 text-slate-600">{r.processReason ?? ''}</td>
                <td className="px-3 py-2.5 text-center">
                  <button type="button" disabled={!canDetail} onClick={() => alert('변경 내용 비교 팝업 (SB-ETC-059) — 프로토타입')} className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">상세보기</button>
                </td>
                <td className="px-3 py-2.5 text-center">
                  {r.version != null
                    ? <button type="button" onClick={() => alert(`V.${r.version} 반영 내용 (프로토타입)`)} className="text-[12px] font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-700">V.{r.version}</button>
                    : <span className="text-slate-300">-</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
