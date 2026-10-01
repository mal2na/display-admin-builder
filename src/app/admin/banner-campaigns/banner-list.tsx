'use client';

// SB BO-AIM-ETC-PG061 배너 캠페인 관리 목록 — 검색 영역 + 목록 + 등록.
//  디자인 시스템: accent #3a2ee6 · 헤더/필터 #f6f7fb · 보더 #e3e6ef · 13px 레귤러.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export type BannerRow = {
  id: string; campaignCode: string; title: string; exposeYn: boolean;
  publishStart: string | null; publishEnd: string | null; approvalLabel: string;
  createdBy: string; createdAt: string | null; updatedBy: string; updatedAt: string | null;
};

const APPROVAL_TONE: Record<string, string> = {
  승인완료: 'bg-[#e3f6ea] text-[#1f8a4c]', 승인요청: 'bg-[#eceef3] text-[#5d6275]',
  반려: 'bg-[#ffe9e9] text-[#d93b3b]', 요청취소: 'bg-[#fff0de] text-[#c46a0b]', 임시저장: 'bg-[#eceef3] text-[#5d6275]',
};
function fmtDT(iso: string | null) {
  if (!iso) return '-';
  const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
const selectCls = 'h-[34px] rounded-lg border border-[#cfd3e0] bg-white px-2.5 text-[12.5px] text-slate-700';
const inputCls = 'h-[34px] rounded-lg border border-[#cfd3e0] bg-white px-3 text-[12.5px] text-slate-700 placeholder:text-slate-400';
const PER_PAGE = 10;

type F = { field: string; q: string; expose: string; from: string; to: string; approval: string };
const DEF: F = { field: '배너캠페인 ID', q: '', expose: '전체', from: '', to: '', approval: '전체' };

export function BannerList({ rows }: { rows: BannerRow[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<F>(DEF);
  const [applied, setApplied] = useState<F>(DEF);
  const [page, setPage] = useState(1);
  const set = (p: Partial<F>) => setDraft((d) => ({ ...d, ...p }));

  const filtered = useMemo(() => {
    const f = applied;
    return rows.filter((r) => {
      if (f.expose !== '전체' && (f.expose === '전시' ? !r.exposeYn : r.exposeYn)) return false;
      if (f.approval !== '전체' && r.approvalLabel !== f.approval) return false;
      // 전시기간 겹침 필터
      if (f.from && r.publishEnd && r.publishEnd.slice(0, 10) < f.from) return false;
      if (f.to && r.publishStart && r.publishStart.slice(0, 10) > f.to) return false;
      if (f.q.trim()) {
        const q = f.q.trim().toLowerCase();
        const hay = f.field === '배너캠페인명' ? r.title : r.campaignCode;
        if (!(hay ?? '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, applied]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const curPage = Math.min(page, totalPages);
  const paged = filtered.slice((curPage - 1) * PER_PAGE, curPage * PER_PAGE);
  const period = (r: BannerRow) => (r.publishStart || r.publishEnd) ? `${fmtDT(r.publishStart)} ~ ${fmtDT(r.publishEnd)}` : '-';

  return (
    <div className="px-8 py-6">
      <nav className="mb-1 text-[12px] text-slate-400">홈 › 운영관리 › 배너 캠페인 관리</nav>
      <h1 className="mb-4 text-[22px] font-bold text-slate-900">배너 캠페인 관리</h1>

      {/* 검색 영역 */}
      <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-[#e3e6ef] bg-[#f6f7fb] p-5">
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] font-medium text-slate-600">검색 항목</span>
          <select value={draft.field} onChange={(e) => set({ field: e.target.value, q: '' })} className={cn(selectCls, 'w-36')}>{['배너캠페인 ID', '배너캠페인명'].map((o) => <option key={o}>{o}</option>)}</select>
          <input value={draft.q} onChange={(e) => set({ q: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && (setApplied(draft), setPage(1))} placeholder="검색 항목을 선택 후 검색하세요" className={cn(inputCls, 'w-[220px]')} />
        </div>
        <div className="flex items-center gap-2"><span className="text-[12.5px] font-medium text-slate-600">전시여부</span>
          <select value={draft.expose} onChange={(e) => set({ expose: e.target.value })} className={cn(selectCls, 'w-28')}>{['전체', '전시', '미전시'].map((o) => <option key={o}>{o}</option>)}</select>
        </div>
        <div className="flex items-center gap-2"><span className="text-[12.5px] font-medium text-slate-600">전시기간</span>
          <input type="date" value={draft.from} onChange={(e) => set({ from: e.target.value })} className={cn(inputCls, 'w-[150px]')} />
          <span className="text-slate-400">~</span>
          <input type="date" value={draft.to} onChange={(e) => set({ to: e.target.value })} className={cn(inputCls, 'w-[150px]')} />
        </div>
        <div className="flex items-center gap-2"><span className="text-[12.5px] font-medium text-slate-600">승인상태</span>
          <select value={draft.approval} onChange={(e) => set({ approval: e.target.value })} className={cn(selectCls, 'w-32')}>{['전체', '승인요청', '승인완료', '반려', '요청취소'].map((o) => <option key={o}>{o}</option>)}</select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={() => { setDraft(DEF); setApplied(DEF); setPage(1); }} className="h-[34px] rounded-lg border border-[#cfd3e0] bg-white px-4 text-[12.5px] font-medium text-slate-600 hover:bg-[#f6f7fb]">초기화</button>
          <button type="button" onClick={() => { setApplied(draft); setPage(1); }} className="h-[34px] rounded-lg bg-[#3a2ee6] px-5 text-[12.5px] font-medium text-white hover:brightness-110">조회</button>
        </div>
      </div>

      <p className="mb-2 text-[13px] text-slate-500">검색결과 <b className="text-[#3a2ee6] tabular-nums">{filtered.length}</b>건</p>
      <div className="overflow-x-auto border-t border-[#e3e6ef]">
        <table className="w-full min-w-[1200px] text-[13px] font-normal whitespace-nowrap">
          <thead>
            <tr className="border-b border-[#e3e6ef] bg-[#f6f7fb] text-[#6b7086]">
              {['NO.', '배너캠페인 ID', '배너캠페인명', '전시여부', '전시기간', '승인상태', '등록자', '등록일시', '최종 수정자', '최종 수정일시'].map((h) => (
                <th key={h} className={cn('h-11 px-3 font-normal', h === '배너캠페인명' || h === '전시기간' ? 'text-left' : 'text-center')}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={10} className="px-3 py-16 text-center text-slate-400">조회된 배너 캠페인이 없습니다.</td></tr>
            ) : paged.map((r, i) => (
              <tr key={r.id} onClick={() => router.push(`/admin/banner-campaigns/${r.id}`)} className="cursor-pointer border-b border-[#e3e6ef] text-center text-slate-700 hover:bg-[#f6f7fb]">
                <td className="h-11 px-3 tabular-nums text-slate-500">{filtered.length - ((curPage - 1) * PER_PAGE + i)}</td>
                <td className="h-11 px-3 tabular-nums">{r.campaignCode}</td>
                <td className="h-11 px-3 text-left">{r.title}</td>
                <td className="h-11 px-3"><span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[12px]', r.exposeYn ? 'bg-[#e3f6ea] text-[#1f8a4c]' : 'bg-[#eceef3] text-[#5d6275]')}>{r.exposeYn ? '전시' : '미전시'}</span></td>
                <td className="h-11 px-3 text-left text-slate-500">{period(r)}</td>
                <td className="h-11 px-3"><span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[12px]', APPROVAL_TONE[r.approvalLabel] ?? 'bg-[#eceef3] text-[#5d6275]')}>{r.approvalLabel}</span></td>
                <td className="h-11 px-3 text-slate-600">{r.createdBy}</td>
                <td className="h-11 px-3 text-slate-500">{fmtDT(r.createdAt)}</td>
                <td className="h-11 px-3 text-slate-600">{r.updatedBy}</td>
                <td className="h-11 px-3 text-slate-500">{fmtDT(r.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="relative mt-4 flex items-center justify-center">
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 10).map((p) => (
              <button key={p} onClick={() => setPage(p)} className={cn('h-8 w-8 rounded-md text-[13px]', p === curPage ? 'bg-[#3a2ee6] font-semibold text-white' : 'text-slate-600 hover:bg-slate-100')}>{p}</button>
            ))}
          </div>
        )}
        <Link href="/admin/banner-campaigns/new" className="absolute right-0 inline-flex h-9 items-center rounded-lg bg-[#3a2ee6] px-5 text-[13px] font-semibold text-white hover:brightness-110">등록</Link>
      </div>
    </div>
  );
}
