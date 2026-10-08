'use client';

// SB-ETC-116 App 스플래시 관리 목록(클라이언트) — 검색 영역 + 목록 + 페이지네이션.
//  색·테이블은 프로모션 프로토타입 토큰 기준(accent #3a2fd8 · 헤더 #f6f7f9 · 보더 #e6e7ec · 13px 레귤러).
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { FilterPanel, ListHeader, THEAD_TR_CLS } from '@/components/ops-ui';
import { PageHeader } from '@/components/page-header';

export type SplashRow = {
  id: string;
  osType: string;
  version: string;
  applyState: string;
  approvalLabel: string;
  title: string;
  applyStartAt: string | null;
  createdBy: string;
  createdAt: string | null;
  updatedBy: string;
  updatedAt: string | null;
};

// 상태 배지 색 — 프로토타입 상태 팔레트 쌍
const APPROVAL_TONE: Record<string, string> = {
  승인완료: 'bg-[#e9f6ee] text-[#147a43]',
  승인요청: 'bg-[#efedfe] text-[#3a2fd8]',
  임시저장: 'bg-[#eef0f6] text-[#53586a]',
  반려: 'bg-[#fdedef] text-[#cf2a3c]',
  요청취소: 'bg-[#fff4e2] text-[#a95800]',
};
const APPLY_TONE: Record<string, string> = {
  적용중: 'bg-[#e9f6ee] text-[#147a43]',
  적용예정: 'bg-[#efedfe] text-[#3a2fd8]',
  적용종료: 'bg-[#eef0f6] text-[#53586a]',
};

function fmtDT(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const PER_PAGE = 10;
const selectCls = 'sel';
const inputCls = 'inp';

const SEARCH_PLACEHOLDER: Record<string, string> = {
  버전: '버전 번호를 입력하세요. 예: 7',
  제목: '제목을 입력하세요.',
  등록자: '등록자 이름을 입력하세요.',
  최근수정자: '최근 수정자 이름을 입력하세요.',
};

type Filter = {
  os: string; apply: string; approval: string;
  dateField: string; from: string; to: string;
  searchField: string; q: string;
};
const DEFAULT_FILTER: Filter = { os: '전체', apply: '전체', approval: '전체', dateField: '등록일', from: '', to: '', searchField: '버전', q: '' };

export function SplashList({ rows }: { rows: SplashRow[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Filter>(DEFAULT_FILTER);
  const [applied, setApplied] = useState<Filter>(DEFAULT_FILTER);
  const [page, setPage] = useState(1);
  const set = (p: Partial<Filter>) => setDraft((d) => ({ ...d, ...p }));

  const filtered = useMemo(() => {
    const f = applied;
    const dateOf = (r: SplashRow) => f.dateField === '최근수정일' ? r.updatedAt : f.dateField === '적용시작일' ? r.applyStartAt : r.createdAt;
    return rows.filter((r) => {
      if (f.os !== '전체' && r.osType !== f.os) return false;
      if (f.apply !== '전체' && r.applyState !== f.apply) return false;
      if (f.approval !== '전체' && r.approvalLabel !== f.approval) return false;
      const dv = dateOf(r);
      if (f.from && (!dv || dv.slice(0, 10) < f.from)) return false;
      if (f.to && (!dv || dv.slice(0, 10) > f.to)) return false;
      if (f.q.trim()) {
        const q = f.q.trim().toLowerCase();
        const hay = f.searchField === '제목' ? r.title : f.searchField === '등록자' ? r.createdBy : f.searchField === '최근수정자' ? r.updatedBy : r.version;
        if (!(hay ?? '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, applied]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const curPage = Math.min(page, totalPages);
  const paged = filtered.slice((curPage - 1) * PER_PAGE, curPage * PER_PAGE);

  const doSearch = () => { setApplied(draft); setPage(1); };
  const doReset = () => { setDraft(DEFAULT_FILTER); setApplied(DEFAULT_FILTER); setPage(1); };

  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader
        trail={['운영관리', 'App 스플래시 관리']}
        title="App 스플래시 관리"
      />

      {/* 검색 영역 (1) — 참고 디자인 .ft 폼 테이블 + .sbtn */}
      <div className="sec">
        <FilterPanel
          rows={[
            [
              ['OS 유형', <select key="os" value={draft.os} onChange={(e) => set({ os: e.target.value })} className={cn(selectCls, 'w200')}>{['전체', 'Android', 'IOS'].map((o) => <option key={o}>{o}</option>)}</select>],
              ['적용상태', <select key="ap" value={draft.apply} onChange={(e) => set({ apply: e.target.value })} className={cn(selectCls, 'w200')}>{['전체', '적용중', '적용예정', '적용종료'].map((o) => <option key={o}>{o}</option>)}</select>],
            ],
            [
              ['승인상태', <select key="av" value={draft.approval} onChange={(e) => set({ approval: e.target.value })} className={cn(selectCls, 'w200')}>{['전체', '승인완료', '승인요청', '임시저장', '반려', '요청취소'].map((o) => <option key={o}>{o}</option>)}</select>],
              ['기간', (
                <span key="dt" className="rng">
                  <select value={draft.dateField} onChange={(e) => set({ dateField: e.target.value })} className={cn(selectCls, 'w200')}>{['등록일', '최근수정일', '적용시작일'].map((o) => <option key={o}>{o}</option>)}</select>
                  <input type="date" value={draft.from} onChange={(e) => set({ from: e.target.value })} className={inputCls} />
                  <span className="text-[var(--ink3)]">~</span>
                  <input type="date" value={draft.to} onChange={(e) => set({ to: e.target.value })} className={inputCls} />
                </span>
              )],
            ],
            [
              ['구분검색', (
                <span key="q" className="rng">
                  <select value={draft.searchField} onChange={(e) => set({ searchField: e.target.value, q: '' })} className={cn(selectCls, 'w200')}>{['버전', '제목', '등록자', '최근수정자'].map((o) => <option key={o}>{o}</option>)}</select>
                  <input value={draft.q} onChange={(e) => set({ q: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && doSearch()} placeholder={SEARCH_PLACEHOLDER[draft.searchField]} className={cn(inputCls, 'w-[340px] max-w-full')} />
                </span>
              ), 3],
            ],
          ]}
          onReset={doReset}
          onSearch={doSearch}
        />
      </div>

      <ListHeader title="조회결과" count={filtered.length} />
      {/* 목록 (2) */}
      <div className="overflow-x-auto border-t border-[#e6e7ec]">
        <table className="w-full min-w-[1200px] text-[13px] font-normal">
          <thead>
            <tr className={THEAD_TR_CLS}>
              {['No.', 'OS유형', '버전', '적용상태', '승인상태', '제목', '적용시작일시', '등록자', '등록일시', '최근 수정자', '최근 수정일시'].map((h) => (
                <th key={h} className={cn('h-11 px-3 font-normal whitespace-nowrap', h === '제목' ? 'text-left' : 'text-center')}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={11} className="px-3 py-16 text-center text-slate-400">조회된 스플래시가 없습니다.</td></tr>
            ) : paged.map((r, i) => {
              const no = filtered.length - ((curPage - 1) * PER_PAGE + i);
              return (
                <tr key={r.id} onClick={() => router.push(`/admin/app-splash/${r.id}`)} className="cursor-pointer border-b border-[#e6e7ec] text-center text-slate-700 hover:bg-[#f6f7f9]">
                  <td className="h-11 px-3 tabular-nums text-slate-500">{no}</td>
                  <td className="h-11 px-3">{r.osType}</td>
                  <td className="h-11 px-3 tabular-nums">{r.version}</td>
                  <td className="h-11 px-3">{r.applyState === '-' ? <span className="text-slate-400">-</span> : <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-[12px]', APPLY_TONE[r.applyState] ?? 'bg-[#eef0f6] text-[#53586a]')}>{r.applyState}</span>}</td>
                  <td className="h-11 px-3"><span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-[12px]', APPROVAL_TONE[r.approvalLabel] ?? 'bg-[#eef0f6] text-[#53586a]')}>{r.approvalLabel}</span></td>
                  <td className="h-11 max-w-[260px] truncate px-3 text-left" title={r.title}>{r.title}</td>
                  <td className="h-11 px-3 text-slate-500">{fmtDT(r.applyStartAt)}</td>
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

      {/* 페이지네이션 + 등록 (3) */}
      <div className="relative mt-8 flex items-center justify-center">
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 10).map((p) => (
              <button key={p} onClick={() => setPage(p)} className={cn('h-8 w-8 rounded-md text-[13px]', p === curPage ? 'bg-[#3a2fd8] font-semibold text-white' : 'text-slate-600 hover:bg-slate-100')}>{p}</button>
            ))}
          </div>
        )}
        <Link href="/admin/app-splash/new" className="absolute right-0 inline-flex h-9 items-center rounded-lg bg-[#3a2fd8] px-5 text-[13px] font-semibold text-white hover:brightness-110">등록</Link>
      </div>
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
