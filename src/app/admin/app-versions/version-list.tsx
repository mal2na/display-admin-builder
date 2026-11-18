'use client';

// SB BO-AIM-DSP-PG578 App 버전 관리 목록 — 검색 영역 + 목록 + 페이지네이션 + 등록.
//  디자인 시스템(프로토타입 토큰): accent #3617ce · 헤더 #f8f9fb · 보더 #e8ecef · 13px 레귤러.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { FilterPanel, ListHeader, ListBottom, THEAD_TR_CLS, TBODY_TR_CLS } from '@/components/ops-ui';
import { PageHeader } from '@/components/page-header';
import { CHIP_BASE } from '@/lib/display-taxonomy';

export type VersionRow = {
  id: string; targetApp: string; osType: string; applyState: string; approvalLabel: string;
  version: string; recommendVersion: string; forceVersion: string;
  updateDate: string | null; createdBy: string; createdAt: string | null; updatedBy: string; updatedAt: string | null;
};

// 승인상태 배지 — 저장(draft)·승인대기(requested)·승인완료·반려·요청취소 (SB 1-4)
const APPROVAL_TONE: Record<string, string> = {
  승인완료: 'bg-[#C8F6E1] text-[#038E52]', 승인대기: 'bg-[#D9E9FF] text-[#2E7AFF]',
  저장: 'bg-[#DCE0E5] text-[#454F59]', 반려: 'bg-[#FFDCDC] text-[#ED3B3E]', 요청취소: 'bg-[#FFE4C4] text-[#D66400]',
};

function fmtDT(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const PER_PAGE = 10;
const selectCls = 'sel';
const inputCls = 'inp';
const SEARCH_PH: Record<string, string> = {
  'App 버전': '버전 번호를 입력하세요. 예: 2.0.0', '권장 버전': '버전 번호를 입력하세요. 예: 2.0.0', '강제 버전': '버전 번호를 입력하세요. 예: 2.0.0',
  등록자: '등록자 이름을 입력하세요.', 최근수정자: '최근 수정자 이름을 입력하세요.',
};

// 기간 기본값 — 당일 ~ 이전 1년 (SB 1-5)
function ymd(d: Date): string { const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }
const TODAY = new Date();
const YEAR_AGO = new Date(); YEAR_AGO.setFullYear(YEAR_AGO.getFullYear() - 1);

type Filter = { app: string; os: string; apply: string; approval: string; dateField: string; from: string; to: string; searchField: string; q: string };
const DEFAULT: Filter = { app: '전체', os: '전체', apply: '전체', approval: '전체', dateField: '등록일자', from: ymd(YEAR_AGO), to: ymd(TODAY), searchField: 'App 버전', q: '' };

export function VersionList({ rows }: { rows: VersionRow[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Filter>(DEFAULT);
  const [applied, setApplied] = useState<Filter>(DEFAULT);
  const [page, setPage] = useState(1);
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
    <div className="px-12 py-9 pb-28">
      <PageHeader
        trail={['운영관리', 'App 버전 관리']}
        title="App 버전 관리"
      />

      {/* 검색 영역 (1) */}
      <div className="mt-6">
        <FilterPanel
          rows={[
            [
              ['대상 App 유형', <select key="app" value={draft.app} onChange={(e) => set({ app: e.target.value })} className={selectCls}>{['전체', '통합App', '구T월드'].map((o) => <option key={o}>{o}</option>)}</select>],
              ['OS 유형', <select key="os" value={draft.os} onChange={(e) => set({ os: e.target.value })} className={selectCls}>{['전체', 'Android', 'IOS'].map((o) => <option key={o}>{o}</option>)}</select>],
              ['적용상태', <select key="ap" value={draft.apply} onChange={(e) => set({ apply: e.target.value })} className={selectCls}>{['전체', '적용중', '적용예정', '적용종료'].map((o) => <option key={o}>{o}</option>)}</select>],
              ['승인상태', <select key="av" value={draft.approval} onChange={(e) => set({ approval: e.target.value })} className={selectCls}>{['전체', '승인완료', '승인대기', '저장', '반려', '요청취소'].map((o) => <option key={o}>{o}</option>)}</select>],
              ['기간', (
                <span key="dt" className="rng">
                  <select value={draft.dateField} onChange={(e) => set({ dateField: e.target.value })} className={selectCls}>{['등록일자', '최근수정일자', 'App업데이트일시'].map((o) => <option key={o}>{o}</option>)}</select>
                  <input type="date" value={draft.from} onChange={(e) => set({ from: e.target.value })} className={inputCls} />
                  <span className="text-[var(--ink3)]">~</span>
                  <input type="date" value={draft.to} onChange={(e) => set({ to: e.target.value })} className={inputCls} />
                </span>
              )],
              ['구분검색', (
                <span key="q" className="rng">
                  <select value={draft.searchField} onChange={(e) => set({ searchField: e.target.value, q: '' })} className={selectCls}>{['App 버전', '권장 버전', '강제 버전', '등록자', '최근수정자'].map((o) => <option key={o}>{o}</option>)}</select>
                  <input value={draft.q} onChange={(e) => set({ q: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && doSearch()} placeholder={SEARCH_PH[draft.searchField]} className={inputCls} />
                </span>
              )],
            ],
          ]}
          onReset={doReset}
          onSearch={doSearch}
        />
      </div>

      <ListHeader title="조회 결과" count={filtered.length} />

      {/* 대상 App 컬럼 [TBD] — 구 T월드 앱 관리 여부 미결 (유지하지 않으면 컬럼 삭제) */}
      <div className="mb-2 inline-flex items-center gap-1.5 rounded-md border border-[#f0a04a] bg-[#fff7ed] px-2.5 py-1 text-[11px] font-medium text-[#b45309]">[TBD · 협의] ‘대상 App’ 컬럼 — 구 T월드 앱 관리 여부 결정 후 유지/삭제</div>

      {/* 목록 (2) */}
      <div className="overflow-x-auto border-t border-[#dce0e5]">
        <table className="w-full min-w-[1240px] text-[13px] font-normal">
          <thead>
            <tr className={THEAD_TR_CLS}>
              {['대상 App', 'OS 유형', '적용상태', '승인상태', 'App 버전', '권장 버전', '강제 버전', '업데이트 일시', '등록자', '등록일시', '최근 수정자', '최근 수정일시'].map((h) => (
                <th key={h} className="h-11 px-3 font-normal whitespace-nowrap text-center">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={12} className="px-3 py-16 text-center text-slate-400">등록된 정보가 없습니다. 검색 조건을 설정하여 조회 해주세요.</td></tr>
            ) : paged.map((r) => (
              <tr key={r.id} onClick={() => router.push(`/admin/app-versions/${r.id}`)} className={cn(TBODY_TR_CLS, 'cursor-pointer text-center')}>
                <td className="h-11 px-3">{r.targetApp}</td>
                <td className="h-11 px-3">{r.osType}</td>
                <td className="h-11 px-3 text-slate-700">{r.applyState}</td>
                <td className="h-11 px-3"><span className={cn(CHIP_BASE, APPROVAL_TONE[r.approvalLabel] ?? 'bg-[#DCE0E5] text-[#454F59]')}>{r.approvalLabel}</span></td>
                <td className="h-11 px-3 tabular-nums text-slate-700">{r.version}</td>
                <td className="h-11 px-3 tabular-nums text-slate-600">{r.recommendVersion}</td>
                <td className="h-11 px-3 tabular-nums text-slate-600">{r.forceVersion}</td>
                <td className="h-11 px-3 text-slate-500">{fmtDT(r.updateDate)}</td>
                <td className="h-11 px-3 text-slate-600">{r.createdBy}</td>
                <td className="h-11 px-3 text-slate-500">{fmtDT(r.createdAt)}</td>
                <td className="h-11 px-3 text-slate-600">{r.updatedBy}</td>
                <td className="h-11 px-3 text-slate-500">{fmtDT(r.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 + 등록 (3/4) */}
      <ListBottom page={curPage} totalPages={totalPages} onPageChange={setPage}>
        <Link href="/admin/app-versions/new" className="inline-flex h-[38px] items-center rounded-[8px] bg-[var(--ac)] px-6 text-[13px] font-semibold text-white hover:bg-[var(--ac-h)]">등록</Link>
      </ListBottom>
    </div>
  );
}
