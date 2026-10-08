'use client';

// SB PG003(상세검색 TAB) + PG027(IA 구조 TAB) — 전체페이지 관리.
//  디자인 시스템(프로토타입 토큰): accent #3a2fd8 · 헤더/필터 #f6f7f9 · 보더 #e6e7ec · 13px 레귤러.
import { useMemo, useState } from 'react';
import { PageTabs } from '@/components/page-tabs';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Minus, Plus } from 'lucide-react';
import { FilterPanel, ListHeader, ListBottom, THEAD_TR_CLS, TBODY_TR_CLS, YN } from '@/components/ops-ui';
import { PageHeader } from '@/components/page-header';
import { CHIP_BASE } from '@/lib/display-taxonomy';

export type FPRow = {
  id: string; pageCode: string; menuName: string; path: string; url: string;
  status: string; statusLabel: string; useYn: boolean; frontExposeYn: boolean;
  channels: string[]; category: string | null; parentId: string | null; depth: number;
  updatedAt: string | null; createdAt: string | null;
};

const STATUS_TONE: Record<string, string> = {
  'URL 확정대기': 'bg-[#FFE4C4] text-[#D66400]', 승인요청: 'bg-[#D9E9FF] text-[#2E7AFF]',
  승인완료: 'bg-[#C8F6E1] text-[#038E52]', 반려: 'bg-[#FFDCDC] text-[#ED3B3E]', 'URL 미등록': 'bg-[#DCE0E5] text-[#454F59]',
};
function fmtDT(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function fmtD(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}
const selectCls = 'sel';
const inputCls = 'inp';
const CHANNELS = ['PC웹', '모바일웹', 'Android앱', 'iOS앱'];
const PER_PAGE = 10;

export function FullPageManager({ rows }: { rows: FPRow[] }) {
  const [tab, setTab] = useState<'search' | 'ia'>('search');
  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader
        trail={['운영관리', '전체페이지 관리']}
        title="전체페이지 관리"
      />
      {/* 상단 탭 */}
      <PageTabs
        tabs={[{ key: 'search', label: '상세검색' }, { key: 'ia', label: 'IA 구조' }]}
        value={tab}
        onChange={(k) => setTab(k as 'search' | 'ia')}
      />
      {tab === 'search' ? <SearchTab rows={rows} /> : <IaTab rows={rows} />}
    </div>
  );
}

// ── 상세검색 탭 (PG003) ───────────────────────────────────────
function SearchTab({ rows }: { rows: FPRow[] }) {
  type F = { field: string; q: string; status: string; use: string; channel: string };
  const DEF: F = { field: '메뉴명', q: '', status: '전체', use: '전체', channel: '전체' };
  const [draft, setDraft] = useState<F>(DEF);
  const [applied, setApplied] = useState<F>(DEF);
  const [page, setPage] = useState(1);
  const set = (p: Partial<F>) => setDraft((d) => ({ ...d, ...p }));

  const filtered = useMemo(() => {
    const f = applied;
    return rows.filter((r) => {
      if (f.status !== '전체' && r.statusLabel !== f.status) return false;
      if (f.use !== '전체' && (f.use === '사용' ? !r.useYn : r.useYn)) return false;
      if (f.channel !== '전체' && !r.channels.includes(f.channel)) return false;
      if (f.q.trim()) {
        const q = f.q.trim().toLowerCase();
        const hay = f.field === '페이지ID' ? r.pageCode : f.field === '메뉴URL' ? r.url : r.menuName;
        if (!(hay ?? '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, applied]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const curPage = Math.min(page, totalPages);
  const paged = filtered.slice((curPage - 1) * PER_PAGE, curPage * PER_PAGE);

  return (
    <>
      {/* 검색 영역 — 참고 디자인 .ft 폼 테이블 + .sbtn */}
      <div className="mt-6">
        <FilterPanel
          rows={[
            [
              ['검색 항목', (
                <span key="q" className="rng">
                  <select value={draft.field} onChange={(e) => set({ field: e.target.value, q: '' })} className={cn(selectCls, 'w200')}>{['메뉴명', '페이지ID', '메뉴URL'].map((o) => <option key={o}>{o}</option>)}</select>
                  <input value={draft.q} onChange={(e) => set({ q: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && (setApplied(draft), setPage(1))} placeholder="검색어를 입력해주세요" className={cn(inputCls, 'w-[320px] max-w-full')} />
                </span>
              ), 3],
            ],
            [
              ['상태', <select key="st" value={draft.status} onChange={(e) => set({ status: e.target.value })} className={cn(selectCls, 'w200')}>{['전체', 'URL 확정대기', '승인요청', '승인완료', '반려', 'URL 미등록'].map((o) => <option key={o}>{o}</option>)}</select>],
              ['사용 여부', <select key="us" value={draft.use} onChange={(e) => set({ use: e.target.value })} className={cn(selectCls, 'w200')}>{['전체', '사용', '사용안함'].map((o) => <option key={o}>{o}</option>)}</select>],
            ],
            [
              ['운영 채널', <select key="ch" value={draft.channel} onChange={(e) => set({ channel: e.target.value })} className={cn(selectCls, 'w200')}>{['전체', ...CHANNELS].map((o) => <option key={o}>{o}</option>)}</select>, 3],
            ],
          ]}
          onReset={() => { setDraft(DEF); setApplied(DEF); setPage(1); }}
          onSearch={() => { setApplied(draft); setPage(1); }}
        />
      </div>

      <ListHeader title="조회결과" count={filtered.length} />
      <div className="overflow-x-auto border-t border-[#e6e7ec]">
        <table className="w-full min-w-[1120px] text-[13px] font-normal whitespace-nowrap">
          <thead>
            <tr className={THEAD_TR_CLS}>
              {['NO', '페이지 ID', '메뉴명', '경로', 'URL', '상태', '사용 여부', '운영 채널', '최종 수정일자'].map((h) => (
                <th key={h} className={cn('h-11 px-3 font-normal', h === '경로' || h === 'URL' || h === '운영 채널' ? 'text-left' : 'text-center')}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={9} className="px-3 py-16 text-center text-slate-400">조회 결과가 없습니다.</td></tr>
            ) : paged.map((r, i) => (
              <tr key={r.id} className={cn(TBODY_TR_CLS, 'cursor-pointer text-center')}>
                <td className="h-11 px-3 tabular-nums text-slate-500">{filtered.length - ((curPage - 1) * PER_PAGE + i)}</td>
                <td className="h-11 px-3 tabular-nums">{r.pageCode}</td>
                <td className="h-11 px-3">{r.menuName}</td>
                <td className="h-11 px-3 text-left text-slate-600">{r.path}</td>
                <td className="h-11 px-3 text-left text-slate-600">{r.url}</td>
                <td className="h-11 px-3"><span className={cn(CHIP_BASE, STATUS_TONE[r.statusLabel] ?? 'bg-[#DCE0E5] text-[#454F59]')}>{r.statusLabel}</span></td>
                <td className="h-11 px-3"><YN yes={r.useYn} label={r.useYn ? '사용' : '미사용'} /></td>
                <td className="h-11 px-3 text-left">
                  <div className="flex flex-wrap gap-1">
                    {r.channels.length === 0 ? <span className="text-slate-400">-</span> : r.channels.map((c) => (
                      <span key={c} className="inline-flex items-center rounded border border-[#e6e7ec] bg-white px-1.5 py-0.5 text-[11px] text-slate-600">{c}</span>
                    ))}
                  </div>
                </td>
                <td className="h-11 px-3 text-slate-500">{fmtDT(r.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ListBottom page={curPage} totalPages={totalPages} onPageChange={setPage}>
        {filtered.length > 0 && <button type="button" className="inline-flex h-[38px] items-center rounded-[8px] border border-[var(--line2)] bg-white px-5 text-[13px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]">엑셀다운로드</button>}
        <button type="button" className="inline-flex h-[38px] items-center rounded-[8px] bg-[var(--ac)] px-6 text-[13px] font-semibold text-white hover:bg-[var(--ac-h)]">등록</button>
      </ListBottom>
    </>
  );
}

// ── IA 구조 탭 (PG027) — 메뉴 트리 ────────────────────────────
function IaTab({ rows }: { rows: FPRow[] }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('전체');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const categories = ['전체', ...Array.from(new Set(rows.map((r) => r.category).filter(Boolean) as string[]))];

  // 플랫 → 트리 (parentId 기준).
  const kids = (pid: string | null) => rows.filter((r) => r.parentId === pid);
  const roots = rows.filter((r) => !r.parentId && r.depth <= 1 && (cat === '전체' || r.category === cat) && (!q.trim() || r.menuName.includes(q.trim())));

  const allParentIds = useMemo(() => new Set(rows.filter((r) => rows.some((c) => c.parentId === r.id)).map((r) => r.id)), [rows]);
  const expandAll = () => setExpanded(new Set(allParentIds));
  const collapseAll = () => setExpanded(new Set());
  const toggle = (id: string) => setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const renderRows = (nodes: FPRow[], depth: number): React.ReactNode[] =>
    nodes.flatMap((r) => {
      const children = kids(r.id);
      const hasChildren = children.length > 0;
      const open = expanded.has(r.id);
      const row = (
        <tr key={r.id} className="border-b border-[#e6e7ec] hover:bg-[#f6f7f9]">
          <td className="h-11 px-3">
            <div className="flex items-center" style={{ paddingLeft: (depth - 1) * 22 }}>
              {hasChildren ? (
                <button type="button" onClick={() => toggle(r.id)} className="mr-1.5 flex h-5 w-5 items-center justify-center rounded border border-[#d3d6de] text-slate-500 hover:bg-white">
                  {open ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                </button>
              ) : <span className="mr-1.5 inline-block h-5 w-5" />}
              <span className="text-slate-700">{depth}. {r.menuName}</span>
              {hasChildren && (open ? <ChevronDown className="ml-1 h-3.5 w-3.5 text-slate-300" /> : <ChevronRight className="ml-1 h-3.5 w-3.5 text-slate-300" />)}
            </div>
          </td>
          <td className="h-11 px-3 text-center"><YN yes={r.useYn} label={r.useYn ? '사용' : '미사용'} /></td>
          <td className="h-11 px-3 text-center"><YN yes={r.frontExposeYn} label={r.frontExposeYn ? '노출' : '미노출'} /></td>
          <td className="h-11 px-3 text-center text-slate-500">{fmtD(r.createdAt)}</td>
        </tr>
      );
      return open && hasChildren ? [row, ...renderRows(children, depth + 1)] : [row];
    });

  return (
    <>
      {/* 검색 영역 — 참고 디자인 .ft 폼 테이블 + .sbtn */}
      <div className="mt-6">
        <FilterPanel
          rows={[[['메뉴명', <input key="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="메뉴명을 입력해주세요" className={cn(inputCls, 'w-[420px] max-w-full')} />, 3]]]}
          onReset={() => { setQ(''); setCat('전체'); }}
          onSearch={() => {}}
        />
      </div>

      {/* 1depth 칩 */}
      <div className="mb-3 flex flex-wrap gap-2">
        {categories.map((c) => (
          <button key={c} type="button" onClick={() => setCat(c)}
            className={cn('rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium', cat === c ? 'border-[#3a2fd8] bg-[#3a2fd8] text-white' : 'border-[#e6e7ec] bg-white text-slate-600 hover:border-[#3a2fd8]')}>{c}</button>
        ))}
      </div>

      <ListHeader title="조회결과" count={rows.length} />
      <div className="overflow-x-auto border-t border-[#e6e7ec]">
        <table className="w-full text-[13px] font-normal">
          <thead>
            <tr className={THEAD_TR_CLS}>
              <th className="h-11 px-3 text-left font-semibold">메뉴명</th>
              <th className="h-11 w-28 px-3 text-center font-semibold">사용 여부</th>
              <th className="h-11 w-32 px-3 text-center font-semibold">Front 노출 여부</th>
              <th className="h-11 w-32 px-3 text-center font-semibold">등록일</th>
            </tr>
          </thead>
          <tbody>
            {roots.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-16 text-center text-slate-400">조회 결과가 없습니다.</td></tr>
            ) : renderRows(roots, 1)}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex justify-end gap-2">
        <button type="button" onClick={expandAll} className="inline-flex h-9 items-center rounded-lg border border-[#d3d6de] bg-white px-4 text-[13px] font-medium text-slate-600 hover:bg-[#f6f7f9]">전체 펼치기</button>
        <button type="button" onClick={collapseAll} className="inline-flex h-9 items-center rounded-lg border border-[#d3d6de] bg-white px-4 text-[13px] font-medium text-slate-600 hover:bg-[#f6f7f9]">전체 접기</button>
        <button type="button" className="inline-flex h-9 items-center rounded-lg border border-[#d3d6de] bg-white px-4 text-[13px] font-medium text-slate-600 hover:bg-[#f6f7f9]">엑셀 다운로드</button>
      </div>
    </>
  );
}
