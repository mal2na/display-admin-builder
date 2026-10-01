'use client';

// SB-ETC-111 App 버전 관리 목록(클라이언트) — 검색 영역 + 목록 + Redis reload + 등록.
//  디자인 시스템(프로토타입 토큰): accent #3a2ee6 · 헤더 #f6f7fb · 보더 #e3e6ef · 13px 레귤러.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export type VersionRow = {
  id: string; targetApp: string; osType: string; applyState: string; approvalLabel: string;
  version: string; recommendVersion: string; forceVersion: string;
  updateDate: string | null; createdBy: string; createdAt: string | null; updatedBy: string; updatedAt: string | null;
};

const APPROVAL_TONE: Record<string, string> = {
  승인완료: 'bg-[#e3f6ea] text-[#1f8a4c]', 승인요청: 'bg-[#e6efff] text-[#2d5fd9]',
  임시저장: 'bg-[#eceef3] text-[#5d6275]', 반려: 'bg-[#ffe9e9] text-[#d93b3b]', 요청취소: 'bg-[#fff0de] text-[#c46a0b]',
};
const APPLY_TONE: Record<string, string> = {
  적용중: 'bg-[#e3f6ea] text-[#1f8a4c]', 적용예정: 'bg-[#e6efff] text-[#2d5fd9]', 적용종료: 'bg-[#eceef3] text-[#5d6275]',
};
// App/권장/강제 버전 배지 — OS로 색 구분(Android=green, iOS=blue) (SB-ETC-111 ‘2’)
const verTone = (os: string) => (os === 'IOS' ? 'bg-[#e6efff] text-[#2d5fd9]' : 'bg-[#e3f6ea] text-[#1f8a4c]');

function fmtDT(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const PER_PAGE = 10;
const selectCls = 'h-[34px] rounded-lg border border-[#cfd3e0] bg-white px-2.5 text-[12.5px] text-slate-700';
const inputCls = 'h-[34px] rounded-lg border border-[#cfd3e0] bg-white px-3 text-[12.5px] text-slate-700 placeholder:text-slate-400';
const SEARCH_PH: Record<string, string> = {
  'App 버전': '버전 번호를 입력하세요. 예: 2.0.0', '권장 버전': '버전 번호를 입력하세요. 예: 2.0.0', '강제 버전': '버전 번호를 입력하세요. 예: 2.0.0',
  등록자: '등록자 이름을 입력하세요.', 최근수정자: '최근 수정자 이름을 입력하세요.',
};

type Filter = { app: string; os: string; apply: string; approval: string; dateField: string; from: string; to: string; searchField: string; q: string };
const DEFAULT: Filter = { app: '전체', os: '전체', apply: '전체', approval: '전체', dateField: '등록일자', from: '', to: '', searchField: 'App 버전', q: '' };

export function VersionList({ rows }: { rows: VersionRow[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Filter>(DEFAULT);
  const [applied, setApplied] = useState<Filter>(DEFAULT);
  const [page, setPage] = useState(1);
  const [reloadOpen, setReloadOpen] = useState(false);
  const set = (p: Partial<Filter>) => setDraft((d) => ({ ...d, ...p }));

  const filtered = useMemo(() => {
    const f = applied;
    const dateOf = (r: VersionRow) => f.dateField === '최근수정일자' ? r.updatedAt : f.dateField === 'App업데이트일시' ? r.updateDate : r.createdAt;
    return rows.filter((r) => {
      if (f.app !== '전체' && r.targetApp !== f.app) return false;
      if (f.os !== '전체' && r.osType !== f.os) return false;
      if (f.apply !== '전체' && r.applyState !== f.apply) return false;
      if (f.approval !== '전체' && r.approvalLabel !== f.approval) return false;
      const dv = dateOf(r);
      if (f.from && (!dv || dv.slice(0, 10) < f.from)) return false;
      if (f.to && (!dv || dv.slice(0, 10) > f.to)) return false;
      if (f.q.trim()) {
        const q = f.q.trim().toLowerCase();
        const hay = f.searchField === '권장 버전' ? r.recommendVersion : f.searchField === '강제 버전' ? r.forceVersion
          : f.searchField === '등록자' ? r.createdBy : f.searchField === '최근수정자' ? r.updatedBy : r.version;
        if (!(hay ?? '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, applied]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const curPage = Math.min(page, totalPages);
  const paged = filtered.slice((curPage - 1) * PER_PAGE, curPage * PER_PAGE);
  const doSearch = () => { setApplied(draft); setPage(1); };
  const doReset = () => { setDraft(DEFAULT); setApplied(DEFAULT); setPage(1); };

  return (
    <div className="px-8 py-6">
      <nav className="mb-1 text-[12px] text-slate-400">홈 › 운영관리 › App 버전 관리</nav>
      <h1 className="mb-4 text-[22px] font-bold text-slate-900">App 버전 관리</h1>

      {/* 검색 영역 (1) */}
      <div className="mb-5 grid gap-3 rounded-xl border border-[#e3e6ef] bg-[#f6f7fb] p-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Field label="대상 App 유형">
            <select value={draft.app} onChange={(e) => set({ app: e.target.value })} className={cn(selectCls, 'w-32')}>{['전체', '통합App', '구T월드'].map((o) => <option key={o}>{o}</option>)}</select>
          </Field>
          <Field label="OS 유형">
            <select value={draft.os} onChange={(e) => set({ os: e.target.value })} className={cn(selectCls, 'w-28')}>{['전체', 'Android', 'IOS'].map((o) => <option key={o}>{o}</option>)}</select>
          </Field>
          <Field label="적용상태">
            <select value={draft.apply} onChange={(e) => set({ apply: e.target.value })} className={cn(selectCls, 'w-28')}>{['전체', '적용중', '적용예정', '적용종료'].map((o) => <option key={o}>{o}</option>)}</select>
          </Field>
          <Field label="승인상태">
            <select value={draft.approval} onChange={(e) => set({ approval: e.target.value })} className={cn(selectCls, 'w-28')}>{['전체', '승인완료', '승인요청', '임시저장', '반려', '요청취소'].map((o) => <option key={o}>{o}</option>)}</select>
          </Field>
          <Field label="기간">
            <select value={draft.dateField} onChange={(e) => set({ dateField: e.target.value })} className={cn(selectCls, 'w-32')}>{['등록일자', '최근수정일자', 'App업데이트일시'].map((o) => <option key={o}>{o}</option>)}</select>
            <input type="date" value={draft.from} onChange={(e) => set({ from: e.target.value })} className={cn(inputCls, 'w-[150px]')} />
            <span className="text-slate-400">~</span>
            <input type="date" value={draft.to} onChange={(e) => set({ to: e.target.value })} className={cn(inputCls, 'w-[150px]')} />
          </Field>
        </div>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <Field label="구분검색">
            <select value={draft.searchField} onChange={(e) => set({ searchField: e.target.value, q: '' })} className={cn(selectCls, 'w-32')}>{['App 버전', '권장 버전', '강제 버전', '등록자', '최근수정자'].map((o) => <option key={o}>{o}</option>)}</select>
            <input value={draft.q} onChange={(e) => set({ q: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && doSearch()} placeholder={SEARCH_PH[draft.searchField]} className={cn(inputCls, 'w-[340px] max-w-full')} />
          </Field>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={doReset} className="h-[34px] rounded-lg border border-[#cfd3e0] bg-white px-4 text-[12.5px] font-medium text-slate-600 hover:bg-[#f6f7fb]">초기화</button>
            <button type="button" onClick={doSearch} className="h-[34px] rounded-lg bg-[#3a2ee6] px-5 text-[12.5px] font-medium text-white hover:brightness-110">조회</button>
          </div>
        </div>
      </div>

      <p className="mb-2 text-[13px] text-slate-500">조회결과 <b className="text-[#3a2ee6] tabular-nums">{filtered.length}</b>건</p>

      {/* 목록 (2) */}
      <div className="overflow-x-auto border-t border-[#e3e6ef]">
        <table className="w-full min-w-[1320px] text-[13px] font-normal">
          <thead>
            <tr className="border-b border-[#e3e6ef] bg-[#f6f7fb] text-[#6b7086]">
              {['No.', '대상 App', 'OS유형', '적용상태', '승인상태', 'App 버전', '권장 버전', '강제 버전', 'App 업데이트 일시', '등록자', '등록일시', '최근 수정자', '최근 수정일시'].map((h) => (
                <th key={h} className="h-11 px-3 font-normal whitespace-nowrap text-center">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={13} className="px-3 py-16 text-center text-slate-400">조회된 App 버전이 없습니다.</td></tr>
            ) : paged.map((r, i) => {
              const no = filtered.length - ((curPage - 1) * PER_PAGE + i);
              return (
                <tr key={r.id} onClick={() => router.push(`/admin/app-versions/${r.id}`)} className="cursor-pointer border-b border-[#e3e6ef] text-center text-slate-700 hover:bg-[#f6f7fb]">
                  <td className="h-11 px-3 tabular-nums text-slate-500">{no}</td>
                  <td className="h-11 px-3">{r.targetApp}</td>
                  <td className="h-11 px-3">{r.osType}</td>
                  <td className="h-11 px-3">{r.applyState === '-' ? <span className="text-slate-400">-</span> : <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[12px]', APPLY_TONE[r.applyState])}>{r.applyState}</span>}</td>
                  <td className="h-11 px-3"><span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[12px]', APPROVAL_TONE[r.approvalLabel] ?? 'bg-[#eceef3] text-[#5d6275]')}>{r.approvalLabel}</span></td>
                  <td className="h-11 px-3"><span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[12px] tabular-nums', verTone(r.osType))}>{r.version}</span></td>
                  <td className="h-11 px-3 tabular-nums text-slate-600">{r.recommendVersion}</td>
                  <td className="h-11 px-3 tabular-nums text-slate-600">{r.forceVersion}</td>
                  <td className="h-11 px-3 text-slate-500">{fmtDT(r.updateDate)}</td>
                  <td className="h-11 px-3 text-slate-600">{r.createdBy}</td>
                  <td className="h-11 px-3 text-slate-500">{fmtDT(r.createdAt)}</td>
                  <td className="h-11 px-3 text-slate-600">{r.updatedBy}</td>
                  <td className="h-11 px-3 text-slate-500">{fmtDT(r.updatedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 + Redis reload + 등록 (3/4/5) */}
      <div className="relative mt-4 flex items-center justify-center">
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 10).map((p) => (
              <button key={p} onClick={() => setPage(p)} className={cn('h-8 w-8 rounded-md text-[13px]', p === curPage ? 'bg-[#3a2ee6] font-semibold text-white' : 'text-slate-600 hover:bg-slate-100')}>{p}</button>
            ))}
          </div>
        )}
        <div className="absolute right-0 flex items-center gap-2">
          <button type="button" onClick={() => setReloadOpen(true)} className="inline-flex h-9 items-center rounded-lg border border-[#cfd3e0] bg-white px-4 text-[13px] font-medium text-slate-600 hover:bg-[#f6f7fb]">Redis reload</button>
          <Link href="/admin/app-versions/new" className="inline-flex h-9 items-center rounded-lg bg-[#3a2ee6] px-5 text-[13px] font-semibold text-white hover:brightness-110">등록</Link>
        </div>
      </div>

      {/* 4-1 변경사항 반영 팝업 */}
      {reloadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setReloadOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[15px] font-bold text-slate-900">현재 변경된 최신 데이터를 Redis 캐시에 업데이트하시겠습니까?</h3>
            <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500">승인 완료된 변경 사항을 캐시(Redis) 갱신으로 프론트 화면에 즉시 반영합니다. 미승인 변경은 반영 대상에서 제외됩니다.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setReloadOpen(false)} className="h-9 rounded-lg border border-[#cfd3e0] bg-white px-4 text-[13px] font-medium text-slate-600 hover:bg-[#f6f7fb]">취소</button>
              <button onClick={() => setReloadOpen(false)} className="h-9 rounded-lg bg-[#3a2ee6] px-5 text-[13px] font-semibold text-white hover:brightness-110">확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="shrink-0 text-[12.5px] font-medium text-slate-600">{label}</span>
      {children}
    </div>
  );
}
