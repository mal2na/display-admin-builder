'use client';

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CONTAINER_APPROVAL_STATUS_LABEL } from '@/lib/display-taxonomy';

// 컨테이너 전체목록 팝업 (SB PG495) — 검색 필터 + 결과 표 + 페이저. 행 클릭 시 상세로 이동하고 닫힌다.
//  데이터는 전부 전달받아 클라이언트에서 필터·페이징(컨테이너 수가 적어 충분).
export type ContainerListRow = {
  id: string;
  name: string;
  parentName: string | null;
  status: string; // active | inactive (전시/미전시)
  approvalStatus: string; // DRAFT | REVIEW | APPROVED | REJECTED
  startAt: string | null;
  endAt: string | null;
  noEndDate: boolean;
  createdAt: string;
};

const APPROVALS = ['DRAFT', 'REVIEW', 'APPROVED', 'REJECTED'] as const;
const PAGE_SIZE = 10;
const fmt = (iso: string | null) => (iso ? iso.slice(0, 16).replace('T', ' ') : '');
const period = (r: ContainerListRow) =>
  r.noEndDate ? (r.startAt ? `${fmt(r.startAt)} ~ 종료 없음` : '상시') : r.startAt || r.endAt ? `${fmt(r.startAt)} ~ ${fmt(r.endAt)}` : '상시';

export function ContainerListModal({ rows, onClose }: { rows: ContainerListRow[]; onClose: () => void }) {
  const router = useRouter();
  const [expose, setExpose] = useState<'all' | 'Y' | 'N'>('all');
  const [approvals, setApprovals] = useState<Set<string>>(new Set(APPROVALS));
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [field, setField] = useState<'name' | 'id' | 'parent'>('name');
  const [q, setQ] = useState('');
  const [applied, setApplied] = useState({ expose: 'all' as 'all' | 'Y' | 'N', approvals: new Set<string>(APPROVALS), from: '', to: '', field: 'name' as 'name' | 'id' | 'parent', q: '' });
  const [page, setPage] = useState(1);

  const toggleApproval = (s: string) =>
    setApprovals((prev) => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });
  const allChecked = approvals.size === APPROVALS.length;
  const toggleAll = () => setApprovals(allChecked ? new Set() : new Set(APPROVALS));

  const apply = () => { setApplied({ expose, approvals: new Set(approvals), from, to, field, q: q.trim() }); setPage(1); };
  const reset = () => {
    setExpose('all'); setApprovals(new Set(APPROVALS)); setFrom(''); setTo(''); setField('name'); setQ('');
    setApplied({ expose: 'all', approvals: new Set(APPROVALS), from: '', to: '', field: 'name', q: '' }); setPage(1);
  };

  const filtered = useMemo(() => {
    const kw = applied.q.toLowerCase();
    return rows.filter((r) => {
      if (applied.expose === 'Y' && r.status !== 'active') return false;
      if (applied.expose === 'N' && r.status === 'active') return false;
      if (applied.approvals.size < APPROVALS.length && !applied.approvals.has(r.approvalStatus)) return false;
      if (applied.from && r.createdAt.slice(0, 10) < applied.from) return false;
      if (applied.to && r.createdAt.slice(0, 10) > applied.to) return false;
      if (kw) {
        const hay = applied.field === 'id' ? r.id : applied.field === 'parent' ? (r.parentName ?? '') : r.name;
        if (!hay.toLowerCase().includes(kw)) return false;
      }
      return true;
    });
  }, [rows, applied]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const go = (id: string) => { onClose(); router.push(`/admin/containers/${id}`); };

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-[91] flex max-h-[86vh] w-full max-w-[920px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_22px_#2222220d,0_0_2px_#2222221a]">
        {/* 머리 */}
        <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
          <h2 className="text-[16px] font-bold text-[var(--ink)]">컨테이너 전체목록</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-[var(--ink3)] hover:bg-[var(--th)]" aria-label="닫기"><X className="h-4 w-4" /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {/* 검색 영역 */}
          <div className="rounded-[12px] bg-[var(--th)] p-4 text-[12px]">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <label className="flex items-center gap-2"><span className="font-medium text-[var(--ink2)]">전시 여부</span>
                {([['all', '전체'], ['Y', 'Y'], ['N', 'N']] as const).map(([v, l]) => (
                  <label key={v} className="flex items-center gap-1"><input type="radio" name="ex" checked={expose === v} onChange={() => setExpose(v)} /> {l}</label>
                ))}
              </label>
              <label className="flex items-center gap-2"><span className="font-medium text-[var(--ink2)]">승인 상태</span>
                <label className="flex items-center gap-1"><input type="checkbox" checked={allChecked} onChange={toggleAll} /> 전체</label>
                {APPROVALS.map((s) => (
                  <label key={s} className="flex items-center gap-1"><input type="checkbox" checked={approvals.has(s)} onChange={() => toggleApproval(s)} /> {CONTAINER_APPROVAL_STATUS_LABEL[s] ?? s}</label>
                ))}
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
              <label className="flex items-center gap-2"><span className="font-medium text-[var(--ink2)]">등록일시</span>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 rounded-md border border-[var(--line3)] bg-white px-2" />
                <span className="text-[var(--ink3)]">~</span>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 rounded-md border border-[var(--line3)] bg-white px-2" />
              </label>
              <label className="flex items-center gap-2"><span className="font-medium text-[var(--ink2)]">직접 검색</span>
                <select value={field} onChange={(e) => setField(e.target.value as 'name' | 'id' | 'parent')} className="h-8 rounded-md border border-[var(--line3)] bg-white px-2">
                  <option value="name">컨테이너명</option>
                  <option value="id">컨테이너 ID</option>
                  <option value="parent">상위 컨테이너</option>
                </select>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink3)]" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && apply()} placeholder="검색어를 입력하세요" className="h-8 w-[220px] rounded-md border border-[var(--line3)] bg-white pl-8 pr-2" />
                </div>
              </label>
              <div className="ml-auto flex items-center gap-2">
                <button type="button" onClick={reset} className="h-8 rounded-md border border-[var(--line3)] bg-white px-4 font-semibold text-[var(--ink3)] hover:bg-[var(--th)]">초기화</button>
                <button type="button" onClick={apply} className="h-8 rounded-md bg-[var(--ac)] px-5 font-semibold text-white hover:bg-[var(--ac-h)]">조회</button>
              </div>
            </div>
          </div>

          {/* 조회 결과 */}
          <p className="mb-2 mt-4 text-[13px] font-semibold text-[var(--ink)]">조회결과 <span className="text-[var(--ac)]">{filtered.length}건</span></p>
          <div className="overflow-hidden rounded-[10px] border border-[var(--line)]">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[var(--line)] bg-[var(--th)] text-left text-[var(--ink2)]">
                  <th className="w-12 px-3 py-2.5 text-center font-semibold">NO</th>
                  <th className="px-3 py-2.5 font-semibold">컨테이너 ID</th>
                  <th className="px-3 py-2.5 font-semibold">컨테이너명</th>
                  <th className="px-3 py-2.5 font-semibold">상위 컨테이너</th>
                  <th className="w-20 px-3 py-2.5 font-semibold">전시 여부</th>
                  <th className="px-3 py-2.5 font-semibold">전시 기간</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-10 text-center text-[var(--ink3)]">조회 결과가 없습니다.</td></tr>
                ) : pageRows.map((r, i) => (
                  <tr key={r.id} onClick={() => go(r.id)} className="cursor-pointer border-b border-[var(--line)] last:border-0 hover:bg-[var(--ac2)]">
                    <td className="px-3 py-2.5 text-center text-[var(--ink3)] tabular-nums">{filtered.length - ((page - 1) * PAGE_SIZE + i)}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-[var(--ink2)]">{r.id.slice(0, 12)}</td>
                    <td className="px-3 py-2.5 font-medium text-[var(--ac)]">{r.name}</td>
                    <td className="px-3 py-2.5 text-[var(--ink2)]">{r.parentName ?? '—'}</td>
                    <td className="px-3 py-2.5">{r.status === 'active' ? 'Y' : 'N'}</td>
                    <td className="px-3 py-2.5 text-[var(--ink2)]">{period(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 페이저 */}
          {pageCount > 1 && (
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[12px]">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded border border-[var(--line3)] px-2 py-0.5 disabled:opacity-40">‹</button>
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" onClick={() => setPage(n)} className={cn('rounded px-2 py-0.5', n === page ? 'bg-[var(--ac)] font-semibold text-white' : 'text-[var(--ink2)] hover:bg-[var(--th)]')}>{n}</button>
              ))}
              <button type="button" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))} className="rounded border border-[var(--line3)] px-2 py-0.5 disabled:opacity-40">›</button>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-[var(--line)] px-6 py-3">
          <button type="button" onClick={onClose} className="h-9 rounded-md border border-[var(--line3)] bg-white px-5 text-[13px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]">닫기</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
