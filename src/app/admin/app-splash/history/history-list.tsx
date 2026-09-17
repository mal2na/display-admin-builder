'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { StatusPill } from '@/components/ops-ui';
import { SPLASH_HISTORY_STATUS, fmtDateTime } from '@/lib/widget-taxonomy';
import { cancelRequestSplash } from '../actions';
import { RotateCcw, Search } from 'lucide-react';

export type HistoryRow = {
  id: string; splashId: string; osType: string; version: number | null; status: string;
  requester: string | null; manager: string | null;
  requestedAt: string | null; requestReason: string | null;
  processedAt: string | null; processReason: string | null;
  changeNote: string | null;
};

export function HistoryList({ rows }: { rows: HistoryRow[] }) {
  const router = useRouter();
  const [os, setOs] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');
  const [applied, setApplied] = useState({ os: '', from: '', to: '', status: '' });
  const [pending, start] = useTransition();

  const filtered = useMemo(() => rows
    .filter((r) => (applied.os ? r.osType === applied.os : true))
    .filter((r) => (applied.status ? r.status === applied.status : true))
    .filter((r) => (applied.from ? (r.requestedAt ?? '') >= applied.from : true))
    .filter((r) => (applied.to ? (r.requestedAt ?? '') <= applied.to + 'T23:59' : true)),
    [rows, applied]);

  const cancel = (splashId: string) => start(async () => { if (confirm('승인 요청을 취소하시겠습니까?')) { await cancelRequestSplash(splashId); router.refresh(); } });

  return (
    <div className="space-y-4">
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
            <Button type="button" variant="outline" onClick={() => { setOs(''); setFrom(''); setTo(''); setStatus(''); setApplied({ os: '', from: '', to: '', status: '' }); }}><RotateCcw className="mr-1 h-3.5 w-3.5" />초기화</Button>
            <Button type="button" onClick={() => setApplied({ os, from, to, status })}><Search className="mr-1 h-3.5 w-3.5" />조회</Button>
          </div>
        </div>
      </div>

      {/* 목록 */}
      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-[12px] text-slate-500">
              <th className="w-14 px-3 py-2.5 text-left font-medium">Num</th>
              <th className="w-24 px-3 py-2.5 text-left font-medium">상태</th>
              <th className="px-3 py-2.5 text-left font-medium">승인 요청자</th>
              <th className="px-3 py-2.5 text-left font-medium">승인 담당자</th>
              <th className="px-3 py-2.5 text-left font-medium">요청 일시</th>
              <th className="px-3 py-2.5 text-left font-medium">요청 사유</th>
              <th className="px-3 py-2.5 text-left font-medium">처리 일시</th>
              <th className="px-3 py-2.5 text-left font-medium">처리 사유</th>
              <th className="w-24 px-3 py-2.5 text-left font-medium">변경내용</th>
              <th className="w-16 px-3 py-2.5 text-left font-medium">버전</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} className="px-3 py-10 text-center text-muted-foreground">이력이 없습니다.</td></tr>
            ) : filtered.map((r, i) => {
              const s = SPLASH_HISTORY_STATUS[r.status as keyof typeof SPLASH_HISTORY_STATUS] ?? SPLASH_HISTORY_STATUS.draft;
              return (
                <tr key={r.id} className="border-b last:border-b-0 hover:bg-slate-50/60">
                  <td className="px-3 py-2.5 text-slate-500">{filtered.length - i}</td>
                  <td className="px-3 py-2.5"><StatusPill label={s.label} tone={s.tone} /></td>
                  <td className="px-3 py-2.5 text-slate-600">{r.requester ?? '-'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{r.manager ?? '-'}</td>
                  <td className="px-3 py-2.5 text-[12px] text-slate-500">{fmtDateTime(r.requestedAt)}</td>
                  <td className="max-w-[200px] truncate px-3 py-2.5 text-slate-600" title={r.requestReason ?? ''}>{r.requestReason ?? '-'}</td>
                  <td className="px-3 py-2.5 text-[12px] text-slate-500">
                    {r.status === 'requested'
                      ? <button onClick={() => cancel(r.splashId)} disabled={pending} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50">요청 취소</button>
                      : fmtDateTime(r.processedAt)}
                  </td>
                  <td className="max-w-[160px] truncate px-3 py-2.5 text-slate-600" title={r.processReason ?? ''}>{r.processReason ?? '-'}</td>
                  <td className="px-3 py-2.5">
                    {r.changeNote
                      ? <button onClick={() => router.push(`/admin/app-splash/history/${r.splashId}`)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50">상세보기</button>
                      : '-'}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{r.version ? `V.${r.version}` : '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
