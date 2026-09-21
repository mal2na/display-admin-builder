'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { TARGET_APPS, fmtDateTime } from '@/lib/widget-taxonomy';
import { RotateCcw, Search, RefreshCw } from 'lucide-react';

export type VersionRow = {
  id: string; targetApp: string; osType: string; version: string;
  recommendVersion: string | null; forceVersion: string | null;
  updateDate: string | null; createdAt: string;
};

const PER_PAGE = 10;

export function VersionList({ rows }: { rows: VersionRow[] }) {
  const router = useRouter();
  const [app, setApp] = useState('');
  const [os, setOs] = useState('');
  const [udFrom, setUdFrom] = useState('');
  const [udTo, setUdTo] = useState('');
  const [regFrom, setRegFrom] = useState('');
  const [regTo, setRegTo] = useState('');
  const [kw, setKw] = useState('');
  const [applied, setApplied] = useState({ app: '', os: '', udFrom: '', udTo: '', regFrom: '', regTo: '', kw: '' });
  const [page, setPage] = useState(1);
  const [redisOpen, setRedisOpen] = useState(false);

  const reset = () => { setApp(''); setOs(''); setUdFrom(''); setUdTo(''); setRegFrom(''); setRegTo(''); setKw(''); setApplied({ app: '', os: '', udFrom: '', udTo: '', regFrom: '', regTo: '', kw: '' }); setPage(1); };
  const search = () => { setApplied({ app, os, udFrom, udTo, regFrom, regTo, kw }); setPage(1); };

  const filtered = useMemo(() => rows
    .filter((r) => (applied.app ? r.targetApp === applied.app : true))
    .filter((r) => (applied.os ? r.osType === applied.os : true))
    .filter((r) => (applied.kw ? r.version.includes(applied.kw.trim()) : true))
    .filter((r) => (applied.udFrom ? (r.updateDate ?? '') >= applied.udFrom : true))
    .filter((r) => (applied.udTo ? (r.updateDate ?? '') <= applied.udTo + 'T23:59' : true))
    .filter((r) => (applied.regFrom ? r.createdAt >= applied.regFrom : true))
    .filter((r) => (applied.regTo ? r.createdAt <= applied.regTo + 'T23:59' : true)),
    [rows, applied]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const osTint = (os: string) => os === 'IOS' ? 'text-indigo-600' : 'text-emerald-600';

  return (
    <div className="space-y-4">
      {/* 검색 영역 */}
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-[12px] text-muted-foreground">대상 App
            <Select value={app} onChange={(e) => setApp(e.target.value)} className="h-9 w-36 text-sm">
              <option value="">전체</option>
              {TARGET_APPS.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-muted-foreground">OS 유형
            <Select value={os} onChange={(e) => setOs(e.target.value)} className="h-9 w-32 text-sm">
              <option value="">전체</option>
              <option value="Android">Android</option>
              <option value="IOS">iOS</option>
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-muted-foreground">App 업데이트 날짜
            <div className="flex items-center gap-1">
              <Input type="date" value={udFrom} onChange={(e) => setUdFrom(e.target.value)} className="h-9 w-36 text-sm" />
              <span className="text-muted-foreground">-</span>
              <Input type="date" value={udTo} onChange={(e) => setUdTo(e.target.value)} className="h-9 w-36 text-sm" />
            </div>
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-muted-foreground">등록일시
            <div className="flex items-center gap-1">
              <Input type="date" value={regFrom} onChange={(e) => setRegFrom(e.target.value)} className="h-9 w-36 text-sm" />
              <span className="text-muted-foreground">-</span>
              <Input type="date" value={regTo} onChange={(e) => setRegTo(e.target.value)} className="h-9 w-36 text-sm" />
            </div>
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-muted-foreground">버전 번호 검색어
            <Input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="버전 번호를 입력하세요 예: 2.0.0" className="h-9 w-56 text-sm" />
          </label>
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="outline" onClick={reset}><RotateCcw className="mr-1 h-3.5 w-3.5" />초기화</Button>
            <Button type="button" onClick={search}><Search className="mr-1 h-3.5 w-3.5" />조회</Button>
          </div>
        </div>
      </div>

      {/* 목록 */}
      <div className="overflow-x-auto border-y border-slate-200 bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-[12px] text-slate-600">
              <th className="px-4 py-2.5 text-left font-medium">대상 App</th>
              <th className="px-4 py-2.5 text-left font-medium">OS 유형</th>
              <th className="px-4 py-2.5 text-left font-medium">업데이트 버전</th>
              <th className="px-4 py-2.5 text-left font-medium">권장 버전</th>
              <th className="px-4 py-2.5 text-left font-medium">강제 버전</th>
              <th className="px-4 py-2.5 text-left font-medium">App 업데이트 날짜</th>
              <th className="px-4 py-2.5 text-left font-medium">등록일시</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                <div>등록된 정보가 없습니다.</div>
                <div className="mt-1 text-[12px]">검색 조건을 설정하여 조회 해주세요.</div>
              </td></tr>
            ) : paged.map((r) => {
              const cell = 'px-4 py-3';
              const go = () => router.push(`/admin/app-versions/${r.id}`);
              return (
                <tr key={r.id} onClick={go} className="cursor-pointer border-b last:border-b-0 hover:bg-slate-50/60">
                  <td className={cell + ' text-slate-700'}>{r.targetApp}</td>
                  <td className={cell + ' text-slate-700'}>{r.osType}</td>
                  <td className={cell + ' font-medium text-slate-800'}>{r.version}</td>
                  <td className={cell + ' font-medium ' + osTint(r.osType)}>{r.recommendVersion ?? '없음'}</td>
                  <td className={cell + ' font-medium ' + osTint(r.osType)}>{r.forceVersion ?? '없음'}</td>
                  <td className={cell + ' text-[12px] text-slate-500'}>{fmtDateTime(r.updateDate)}</td>
                  <td className={cell + ' text-[12px] text-slate-500'}>{fmtDateTime(r.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 + 버튼 */}
      <div className="flex items-center">
        {pageCount > 1 && (
          <div className="mx-auto flex items-center gap-1 text-sm">
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)} className={'h-8 w-8 rounded-md ' + (p === page ? 'bg-indigo-600 font-semibold text-white' : 'text-slate-600 hover:bg-slate-100')}>{p}</button>
            ))}
          </div>
        )}
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="outline" onClick={() => setRedisOpen(true)}><RefreshCw className="mr-1 h-3.5 w-3.5" />Redis reload</Button>
          <Button type="button" onClick={() => router.push('/admin/app-versions/new')}>등록</Button>
        </div>
      </div>

      {/* Redis reload 확인 팝업 */}
      {redisOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setRedisOpen(false)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 text-[15px] font-bold text-slate-900">변경사항을 반영하시겠습니까?</h3>
            <p className="mb-5 text-[13px] leading-relaxed text-slate-500">확인 시 최신 버전 정보를 Redis 캐시에 즉시 동기화합니다.</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setRedisOpen(false)}>취소</Button>
              <Button type="button" onClick={() => { setRedisOpen(false); }}>확인</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
