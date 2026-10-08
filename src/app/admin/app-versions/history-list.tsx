'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { StatusPill } from '@/components/ops-ui';
import { VERSION_HISTORY_STATUS, fmtDateTime } from '@/lib/widget-taxonomy';
import { cancelRequestVersion } from './actions';
import { RotateCcw, Search } from 'lucide-react';

export type VersionHistoryRow = {
  id: string; versionId: string; version: string | null; status: string;
  requester: string | null; manager: string | null;
  requestedAt: string | null; requestReason: string | null;
  processedAt: string | null; processReason: string | null; changeNote: string | null;
};

export function VersionHistoryList({ rows }: { rows: VersionHistoryRow[] }) {
  const router = useRouter();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');
  const [kw, setKw] = useState('');
  const [applied, setApplied] = useState({ from: '', to: '', status: '', kw: '' });
  const [pending, start] = useTransition();

  const filtered = useMemo(() => rows
    .filter((r) => (applied.status ? r.status === applied.status : true))
    .filter((r) => (applied.from ? (r.requestedAt ?? '') >= applied.from : true))
    .filter((r) => (applied.to ? (r.requestedAt ?? '') <= applied.to + 'T23:59' : true))
    .filter((r) => (applied.kw ? ((r.version ?? '').includes(applied.kw) || (r.requester ?? '').includes(applied.kw)) : true)),
    [rows, applied]);

  const cancel = (versionId: string) => start(async () => { if (confirm('승인 요청을 취소하시겠습니까?')) { await cancelRequestVersion(versionId); router.refresh(); } });

  return (
    <div>
      {/* 검색 */}
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-[12px] text-muted-foreground">승인요청일시
            <div className="flex items-center gap-1">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-36 text-sm" />
              <span className="text-muted-foreground">-</span>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-36 text-sm" />
            </div>
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-muted-foreground">승인상태
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 w-36 text-sm">
              <option value="">전체</option>
              {Object.entries(VERSION_HISTORY_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-muted-foreground">버전 / 승인요청자
            <Input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="버전 또는 승인요청자를 입력하세요" className="h-9 w-56 text-sm" />
          </label>
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="outline" onClick={() => { setFrom(''); setTo(''); setStatus(''); setKw(''); setApplied({ from: '', to: '', status: '', kw: '' }); }}><RotateCcw className="mr-1 h-3.5 w-3.5" />초기화</Button>
            <Button type="button" onClick={() => setApplied({ from, to, status, kw })}><Search className="mr-1 h-3.5 w-3.5" />조회</Button>
          </div>
        </div>
      </div>

      {/* 목록 */}
      <div className="overflow-x-auto border-y border-slate-200 bg-white">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-[12px] text-slate-600">
              <th className="px-3 py-2.5 text-left font-medium">승인요청자</th>
              <th className="px-3 py-2.5 text-left font-medium">승인요청일시</th>
              <th className="w-24 px-3 py-2.5 text-left font-medium">승인상태</th>
              <th className="px-3 py-2.5 text-left font-medium">승인담당자</th>
              <th className="px-3 py-2.5 text-left font-medium">처리일시</th>
              <th className="px-3 py-2.5 text-left font-medium">처리사유</th>
              <th className="w-20 px-3 py-2.5 text-left font-medium">버전</th>
              <th className="w-24 px-3 py-2.5 text-left font-medium">변경내용</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">변경 이력이 없습니다.</td></tr>
            ) : filtered.map((r) => {
              const s = VERSION_HISTORY_STATUS[r.status as keyof typeof VERSION_HISTORY_STATUS] ?? VERSION_HISTORY_STATUS.draft;
              return (
                <tr key={r.id} className="border-b last:border-b-0 hover:bg-slate-50/60">
                  <td className="px-3 py-2.5 text-slate-600">{r.requester ?? '-'}</td>
                  <td className="px-3 py-2.5 text-[12px] text-slate-500">{fmtDateTime(r.requestedAt)}</td>
                  <td className="px-3 py-2.5"><StatusPill label={s.label} tone={s.tone} /></td>
                  <td className="px-3 py-2.5 text-slate-600">{r.manager ?? '-'}</td>
                  <td className="px-3 py-2.5 text-[12px] text-slate-500">{fmtDateTime(r.processedAt)}</td>
                  <td className="max-w-[200px] truncate px-3 py-2.5 text-slate-600" title={r.processReason ?? ''}>{r.processReason ?? '-'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{r.version ?? '-'}</td>
                  <td className="px-3 py-2.5">
                    {r.status === 'requested'
                      ? <button onClick={() => cancel(r.versionId)} disabled={pending} className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-100">요청취소</button>
                      : r.changeNote
                        ? <button onClick={() => router.push(`/admin/app-versions/history/${r.id}`)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50">상세보기</button>
                        : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div>
        <Button type="button" variant="outline" onClick={() => router.push('/admin/app-versions')}>목록</Button>
      </div>
    </div>
  );
}
