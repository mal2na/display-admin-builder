'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { StatusPill } from '@/components/ops-ui';
import { SPLASH_HISTORY_STATUS, fmtDateTime } from '@/lib/widget-taxonomy';
import { cancelRequestSplash } from '../actions';
import { RotateCcw, Search, X } from 'lucide-react';

export type HistoryRow = {
  id: string; splashId: string; osType: string; version: number | null; status: string;
  requester: string | null; manager: string | null;
  requestedAt: string | null; requestReason: string | null;
  processedAt: string | null; processReason: string | null;
  changeNote: string | null;
  applyLabel: string; applyTone: string;
  currentStatus: string;
};

const PER_PAGE = 10;

export function HistoryList({ rows }: { rows: HistoryRow[] }) {
  const router = useRouter();
  const [os, setOs] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');
  const [applied, setApplied] = useState({ os: '', from: '', to: '', status: '' });
  const [page, setPage] = useState(1);
  const [pending, start] = useTransition();

  // 승인요청 취소 모달 상태
  const [cancelRow, setCancelRow] = useState<HistoryRow | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const filtered = useMemo(() => rows
    .filter((r) => (applied.os ? r.osType === applied.os : true))
    .filter((r) => (applied.status ? r.status === applied.status : true))
    .filter((r) => (applied.from ? (r.requestedAt ?? '') >= applied.from : true))
    .filter((r) => (applied.to ? (r.requestedAt ?? '') <= applied.to + 'T23:59' : true)),
    [rows, applied]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageSafe = Math.min(page, totalPages);
  const paged = filtered.slice((pageSafe - 1) * PER_PAGE, pageSafe * PER_PAGE);

  const openCancel = (r: HistoryRow) => { setCancelRow(r); setCancelReason(''); setConfirmOpen(false); };
  const closeCancel = () => { setCancelRow(null); setConfirmOpen(false); };
  const doCancel = () => {
    const r = cancelRow;
    if (!r) return;
    start(async () => { await cancelRequestSplash(r.splashId, cancelReason); closeCancel(); router.refresh(); });
  };

  return (
    <div>
      {/* 검색 */}
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1 text-[12px] text-muted-foreground">OS 유형
            <div className="flex h-9 items-center gap-3 text-sm">
              {[['', '전체'], ['Android', 'Android'], ['IOS', 'iOS']].map(([v, l]) => (
                <label key={v} className="flex items-center gap-1.5"><input type="radio" name="hos" checked={os === v} onChange={() => setOs(v)} className="accent-indigo-600" />{l}</label>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1 text-[12px] text-muted-foreground">승인 요청일
            <div className="flex items-center gap-1">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-36 text-sm" />
              <span className="text-muted-foreground">-</span>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-36 text-sm" />
            </div>
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-muted-foreground">승인상태
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 w-36 text-sm">
              <option value="">전체</option>
              {Object.entries(SPLASH_HISTORY_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
            </Select>
          </label>
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="outline" onClick={() => { setOs(''); setFrom(''); setTo(''); setStatus(''); setApplied({ os: '', from: '', to: '', status: '' }); setPage(1); }}><RotateCcw className="mr-1 h-3.5 w-3.5" />초기화</Button>
            <Button type="button" onClick={() => { setApplied({ os, from, to, status }); setPage(1); }}><Search className="mr-1 h-3.5 w-3.5" />조회</Button>
          </div>
        </div>
      </div>

      {/* 목록 — 행 클릭 시 상세로 이동 */}
      <div className="overflow-x-auto border-y border-slate-200 bg-white">
        <table className="w-full min-w-[960px] text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-[12px] text-slate-600">
              <th className="w-14 px-3 py-2.5 text-left font-medium">Num</th>
              <th className="w-20 px-3 py-2.5 text-left font-medium">OS 유형</th>
              <th className="w-16 px-3 py-2.5 text-left font-medium">버전</th>
              <th className="w-24 px-3 py-2.5 text-left font-medium">적용상태</th>
              <th className="px-3 py-2.5 text-left font-medium">승인 요청자</th>
              <th className="px-3 py-2.5 text-left font-medium">요청 일시</th>
              <th className="px-3 py-2.5 text-left font-medium">요청 사유</th>
              <th className="px-3 py-2.5 text-left font-medium">승인 담당자</th>
              <th className="px-3 py-2.5 text-left font-medium">처리 일시</th>
              <th className="px-3 py-2.5 text-left font-medium">처리 사유</th>
              <th className="w-24 px-3 py-2.5 text-right font-medium">승인상태</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={11} className="px-3 py-10 text-center text-muted-foreground">이력이 없습니다.</td></tr>
            ) : paged.map((r, i) => {
              const s = SPLASH_HISTORY_STATUS[r.status as keyof typeof SPLASH_HISTORY_STATUS] ?? SPLASH_HISTORY_STATUS.draft;
              const num = filtered.length - ((pageSafe - 1) * PER_PAGE + i);
              return (
                <tr key={r.id} onClick={() => router.push(`/admin/app-splash/history/${r.splashId}`)} className="cursor-pointer border-b last:border-b-0 hover:bg-slate-50/60">
                  <td className="px-3 py-2.5 text-slate-500">{num}</td>
                  <td className="px-3 py-2.5 text-slate-700">{r.osType === 'IOS' ? 'iOS' : r.osType}</td>
                  <td className="px-3 py-2.5 text-slate-600">{r.version ? `V.${r.version}` : '-'}</td>
                  <td className="px-3 py-2.5">{r.applyLabel === '-' ? <span className="text-slate-400">-</span> : <StatusPill label={r.applyLabel} tone={r.applyTone} />}</td>
                  <td className="px-3 py-2.5 text-slate-600">{r.requester ?? '-'}</td>
                  <td className="px-3 py-2.5 text-[12px] text-slate-500">{fmtDateTime(r.requestedAt)}</td>
                  <td className="max-w-[200px] truncate px-3 py-2.5 text-slate-600" title={r.requestReason ?? ''}>{r.requestReason ?? '-'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{r.manager ?? '-'}</td>
                  <td className="px-3 py-2.5 text-[12px] text-slate-500" onClick={(e) => { if (r.status === 'requested' && r.currentStatus === 'requested') e.stopPropagation(); }}>
                    {r.status === 'requested' && r.currentStatus === 'requested'
                      ? <button onClick={() => openCancel(r)} className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-100">요청취소</button>
                      : fmtDateTime(r.processedAt)}
                  </td>
                  <td className="max-w-[160px] truncate px-3 py-2.5 text-slate-600" title={r.processReason ?? ''}>{r.processReason ?? '-'}</td>
                  <td className={`px-3 py-2.5 text-right font-medium ${s.tone === 'red' ? 'text-rose-600' : s.tone === 'green' ? 'text-emerald-600' : s.tone === 'amber' ? 'text-amber-600' : s.tone === 'blue' ? 'text-indigo-600' : 'text-slate-600'}`}>{s.label}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 text-sm">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)} className={'h-8 w-8 rounded-md ' + (p === pageSafe ? 'bg-indigo-600 font-semibold text-white' : 'text-slate-600 hover:bg-slate-100')}>{p}</button>
          ))}
        </div>
      )}

      {/* 승인요청 취소 모달 */}
      {cancelRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeCancel}>
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">승인요청 취소</h3>
              <button onClick={closeCancel} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>

            <div className="mb-6 text-center">
              <p className="text-[17px] font-bold text-slate-900">승인요청을 취소하시겠습니까?</p>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-400">승인 요청 취소 시 승인 절차가 중단되며,<br />공지는 임시저장 상태로 전환 됩니다.</p>
            </div>

            <div className="mb-5">
              <p className="mb-2 text-[15px] font-bold text-slate-900">승인요청 내역</p>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <div className="grid grid-cols-[120px_1fr_120px_1fr] text-sm">
                  <div className="border-b border-r border-slate-200 bg-slate-50 px-4 py-3 text-slate-500">승인 담당자</div>
                  <div className="border-b border-r border-slate-200 px-4 py-3 text-slate-700">{cancelRow.manager ?? '-'}</div>
                  <div className="border-b border-r border-slate-200 bg-slate-50 px-4 py-3 text-slate-500">담당 사업부</div>
                  <div className="border-b border-slate-200 px-4 py-3 text-slate-700">MT 사업부</div>
                </div>
                <div className="bg-slate-50 px-4 py-3 text-[13px] leading-relaxed text-slate-600 whitespace-pre-wrap">{cancelRow.requestReason ?? '-'}</div>
              </div>
            </div>

            <div className="mb-6">
              <p className="mb-2 text-[15px] font-bold text-slate-900">취소사유</p>
              <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3} placeholder="취소사유를 입력해주세요." className="text-sm" />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeCancel}>취소</Button>
              <Button type="button" onClick={() => setConfirmOpen(true)}>요청취소</Button>
            </div>
          </div>
        </div>
      )}

      {/* 최종 확인 팝업 */}
      {cancelRow && confirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmOpen(false)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-start justify-between gap-2">
              <h3 className="text-[15px] font-bold text-slate-900">승인요청을 취소하시겠습니까?</h3>
              <button onClick={() => setConfirmOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
            </div>
            <p className="mb-5 text-[13px] text-slate-500">승인요청이 취소됩니다.</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>취소</Button>
              <Button type="button" onClick={doCancel} disabled={pending}>확인</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
