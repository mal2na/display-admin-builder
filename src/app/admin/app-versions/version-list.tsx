'use client';

// SB-ETC-111 App 버전 관리 목록(클라이언트) — 검색 영역 + 목록 + Redis reload + 등록.
//  디자인 시스템(프로토타입 토큰): accent #3a2fd8 · 헤더 #f6f7f9 · 보더 #e6e7ec · 13px 레귤러.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { FilterPanel, ListHeader, ListBottom, THEAD_TR_CLS, TBODY_TR_CLS } from '@/components/ops-ui';
import { PageHeader } from '@/components/page-header';
import { VersionTabs } from './version-tabs';
import { CHIP_BASE } from '@/lib/display-taxonomy';

export type VersionRow = {
  id: string; targetApp: string; osType: string; applyState: string; approvalLabel: string;
  version: string; recommendVersion: string; forceVersion: string;
  updateDate: string | null; createdBy: string; createdAt: string | null; updatedBy: string; updatedAt: string | null;
};

const APPROVAL_TONE: Record<string, string> = {
  승인완료: 'bg-[#C8F6E1] text-[#038E52]', 승인요청: 'bg-[#D9E9FF] text-[#2E7AFF]',
  임시저장: 'bg-[#DCE0E5] text-[#454F59]', 반려: 'bg-[#FFDCDC] text-[#ED3B3E]', 요청취소: 'bg-[#FFE4C4] text-[#D66400]',
};
const APPLY_TONE: Record<string, string> = {
  적용중: 'bg-[#C8F6E1] text-[#038E52]', 적용예정: 'bg-[#D9E9FF] text-[#2E7AFF]', 적용종료: 'bg-[#DCE0E5] text-[#454F59]',
};
// App/권장/강제 버전 배지 — OS로 색 구분(Android=green, iOS=blue) (SB-ETC-111 ‘2’)
const verTone = (os: string) => (os === 'IOS' ? 'bg-[#D9E9FF] text-[#2E7AFF]' : 'bg-[#C8F6E1] text-[#038E52]');

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
    <div className="px-12 py-9 pb-28">
      <PageHeader
        trail={['운영관리', 'App 버전 관리']}
        title="App 버전 관리"
      />
      <VersionTabs />

      {/* 검색 영역 (1) — 참고 디자인 .ft 폼 테이블 + .sbtn */}
      <div className="mt-6">
        <FilterPanel
          rows={[
            [
              ['대상 App 유형', <select key="app" value={draft.app} onChange={(e) => set({ app: e.target.value })} className={cn(selectCls, 'w200')}>{['전체', '통합App', '구T월드'].map((o) => <option key={o}>{o}</option>)}</select>],
              ['OS 유형', <select key="os" value={draft.os} onChange={(e) => set({ os: e.target.value })} className={cn(selectCls, 'w200')}>{['전체', 'Android', 'IOS'].map((o) => <option key={o}>{o}</option>)}</select>],
            ],
            [
              ['적용상태', <select key="ap" value={draft.apply} onChange={(e) => set({ apply: e.target.value })} className={cn(selectCls, 'w200')}>{['전체', '적용중', '적용예정', '적용종료'].map((o) => <option key={o}>{o}</option>)}</select>],
              ['승인상태', <select key="av" value={draft.approval} onChange={(e) => set({ approval: e.target.value })} className={cn(selectCls, 'w200')}>{['전체', '승인완료', '승인요청', '임시저장', '반려', '요청취소'].map((o) => <option key={o}>{o}</option>)}</select>],
            ],
            [
              ['기간', (
                <span key="dt" className="rng">
                  <select value={draft.dateField} onChange={(e) => set({ dateField: e.target.value })} className={cn(selectCls, 'w200')}>{['등록일자', '최근수정일자', 'App업데이트일시'].map((o) => <option key={o}>{o}</option>)}</select>
                  <input type="date" value={draft.from} onChange={(e) => set({ from: e.target.value })} className={inputCls} />
                  <span className="text-[var(--ink3)]">~</span>
                  <input type="date" value={draft.to} onChange={(e) => set({ to: e.target.value })} className={inputCls} />
                </span>
              ), 3],
            ],
            [
              ['구분검색', (
                <span key="q" className="rng">
                  <select value={draft.searchField} onChange={(e) => set({ searchField: e.target.value, q: '' })} className={cn(selectCls, 'w200')}>{['App 버전', '권장 버전', '강제 버전', '등록자', '최근수정자'].map((o) => <option key={o}>{o}</option>)}</select>
                  <input value={draft.q} onChange={(e) => set({ q: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && doSearch()} placeholder={SEARCH_PH[draft.searchField]} className={cn(inputCls, 'w-[340px] max-w-full')} />
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
        <table className="w-full min-w-[1320px] text-[13px] font-normal">
          <thead>
            <tr className={THEAD_TR_CLS}>
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
                <tr key={r.id} onClick={() => router.push(`/admin/app-versions/${r.id}`)} className={cn(TBODY_TR_CLS, 'cursor-pointer text-center')}>
                  <td className="h-11 px-3 tabular-nums text-slate-500">{no}</td>
                  <td className="h-11 px-3">{r.targetApp}</td>
                  <td className="h-11 px-3">{r.osType}</td>
                  <td className="h-11 px-3">{r.applyState === '-' ? <span className="text-slate-400">-</span> : <span className={cn(CHIP_BASE, APPLY_TONE[r.applyState])}>{r.applyState}</span>}</td>
                  <td className="h-11 px-3"><span className={cn(CHIP_BASE, APPROVAL_TONE[r.approvalLabel] ?? 'bg-[#DCE0E5] text-[#454F59]')}>{r.approvalLabel}</span></td>
                  <td className="h-11 px-3"><span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-[12px] tabular-nums', verTone(r.osType))}>{r.version}</span></td>
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
      <ListBottom page={curPage} totalPages={totalPages} onPageChange={setPage}>
        <button type="button" onClick={() => setReloadOpen(true)} className="inline-flex h-[38px] items-center rounded-[8px] border border-[var(--line2)] bg-white px-5 text-[13px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]">Redis reload</button>
        <Link href="/admin/app-versions/new" className="inline-flex h-[38px] items-center rounded-[8px] bg-[var(--ac)] px-6 text-[13px] font-semibold text-white hover:bg-[var(--ac-h)]">등록</Link>
      </ListBottom>

      {/* 4-1 변경사항 반영 팝업 */}
      {reloadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setReloadOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[15px] font-bold text-slate-900">현재 변경된 최신 데이터를 Redis 캐시에 업데이트하시겠습니까?</h3>
            <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500">승인 완료된 변경 사항을 캐시(Redis) 갱신으로 프론트 화면에 즉시 반영합니다. 미승인 변경은 반영 대상에서 제외됩니다.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setReloadOpen(false)} className="h-9 rounded-lg border border-[#d3d6de] bg-white px-4 text-[13px] font-medium text-slate-600 hover:bg-[#f6f7f9]">취소</button>
              <button onClick={() => setReloadOpen(false)} className="h-9 rounded-lg bg-[#3a2fd8] px-5 text-[13px] font-semibold text-white hover:brightness-110">확인</button>
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
