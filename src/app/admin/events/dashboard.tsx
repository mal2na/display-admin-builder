'use client';

import { useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deleteProject, restoreProject, purgeProject, setDisplayState } from './actions';
import { LayoutTemplate, Rocket, Trash2, Plus, Search, LayoutGrid, Table2, MoreVertical, ArrowDownUp, ArrowUp, ArrowDown, Eye, EyeOff, RotateCcw, ExternalLink, PencilRuler, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { EVENT_TYPES, MISSION_TYPES } from '@/lib/event-taxonomy';

type SortKey = 'recent' | 'name' | 'type' | 'status' | 'author';

export type ProjectCard = {
  id: string;
  programId: string; // 프로모션 ID (표기용 코드)
  name: string;
  env: string;
  kind: string; // 상위 유형: 이벤트 | 미션 | 전시
  type: string; // 세부 유형(안내형·출석형…) 또는 '전시' / '기타'
  updatedLabel: string;
  createdAtMs: number; // 등록일 정렬용
  createdLabel: string; // 등록일 (YYYY.MM.DD)
  createdDateTime: string; // 등록일시 (YYYY.MM.DD HH:mm)
  updatedDateTime: string; // 최근 수정일시
  author: string; // 등록자
  editor: string; // 최근 수정자
  displayState: string; // 노출 | 미노출 (전시 상태)
  publishState: '미노출' | '게시 예정' | '게시 중' | '종료';
  promoStatus: string; // 프로모션 상태(승인·배포): 작성 중 | 배포 완료 | 게시중 | 종료 …
  period: string; // 전시 기간
  pageId: string | null;
  nodeTypes: string[];
};

export type DeployRow = {
  id: string;
  name: string;
  type: string;
  partnerBrand: string | null;
  displayState: string; // 노출 | 미노출
  publishState: '미노출' | '게시 예정' | '게시 중' | '종료';
  period: string;
  pageId: string | null;
};

export type TrashRow = { id: string; name: string; type: string; updatedLabel: string };

type Section = 'projects' | 'deploy' | 'trash';

// 유형(세부) 정렬 순서 = 이벤트 6종 → 미션 10종
const TYPE_ORDER = [...EVENT_TYPES, ...MISSION_TYPES, '전시', '기타'];
const TYPE_BADGE: Record<string, string> = {
  안내형: 'bg-sky-100 text-sky-700',
  초청형: 'bg-violet-100 text-violet-700',
  기획전형: 'bg-amber-100 text-amber-700',
  응모형: 'bg-rose-100 text-rose-700',
  추천형: 'bg-teal-100 text-teal-700',
  '구매/가입연계형': 'bg-fuchsia-100 text-fuchsia-700',
  '구매/가입 연계형': 'bg-fuchsia-100 text-fuchsia-700',
  전시: 'bg-emerald-100 text-emerald-700',
  기타: 'bg-slate-100 text-slate-600',
};
const typeBadge = (t: string) => TYPE_BADGE[t] ?? 'bg-indigo-100 text-indigo-700'; // 미션 유형 등은 기본색

// 프로모션 상태(승인·배포) 배지 — SB-EVT-027 하단 승인 상태표 기준
const PROMO_STATUS_BADGE: Record<string, string> = {
  '작성 중': 'bg-slate-100 text-slate-600',
  '승인 대기': 'bg-amber-100 text-amber-700',
  '승인 완료': 'bg-sky-100 text-sky-700',
  '배포 대기': 'bg-violet-100 text-violet-700',
  '배포 완료': 'bg-indigo-100 text-indigo-700',
  게시중: 'bg-emerald-100 text-emerald-700',
  종료: 'bg-slate-200 text-slate-600',
};
const PROMO_STATUSES = ['작성 중', '승인 대기', '승인 완료', '배포 대기', '배포 완료', '게시중', '종료'];
const typeRank = (t: string) => { const i = TYPE_ORDER.indexOf(t); return i < 0 ? TYPE_ORDER.length : i; };

// 카드 미니 프리뷰 (노드 타입으로 스켈레톤 구성) — 모든 카드 동일한 고정 크기 모바일 프레임
function MiniPreview({ types }: { types: string[] }) {
  return (
    <div className="mx-auto h-40 w-[42%] overflow-hidden rounded-lg bg-white p-2 shadow-sm ring-1 ring-slate-100">
      <div className="space-y-1.5">
        {(types.length ? types : ['TEXT', 'TABLE', 'TEXT']).slice(0, 6).map((t, i) => {
          if (t === 'IMAGE' || t === 'ROULETTE') return <div key={i} className="h-8 rounded bg-gradient-to-br from-indigo-100 to-slate-200" />;
          if (t === 'BUTTON') return <div key={i} className="mx-auto h-3 w-2/3 rounded-full bg-indigo-300" />;
          if (t === 'TABLE') return <div key={i} className="grid grid-cols-3 gap-0.5">{[0, 1, 2, 3, 4, 5].map((k) => <div key={k} className="h-2 rounded-sm bg-slate-100" />)}</div>;
          return <div key={i} className="h-2 w-full rounded bg-slate-100" />;
        })}
      </div>
    </div>
  );
}

function ProjectTile({ p }: { p: ProjectCard }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [menu, setMenu] = useState(false);
  const href = p.pageId ? `/admin/events/pages/${p.pageId}/builder` : '#';
  return (
    <div className="group overflow-hidden rounded-xl border bg-card transition hover:shadow-md">
      <Link href={href} className="block cursor-pointer bg-gradient-to-b from-slate-50 to-slate-100 p-4">
        <MiniPreview types={p.nodeTypes} />
      </Link>
      <div className="flex items-center justify-between px-4 pt-3">
        <Link href={href} className="truncate font-semibold hover:text-primary">{p.name}</Link>
        <div className="relative flex items-center gap-1">
          <button onClick={() => setMenu((v) => !v)} className="rounded p-0.5 text-slate-400 hover:bg-secondary" aria-label="메뉴">
            <MoreVertical className="h-4 w-4" />
          </button>
          {menu && (
            <div className="absolute right-0 top-6 z-20 w-32 overflow-hidden rounded-md border bg-white text-xs shadow-lg" onMouseLeave={() => setMenu(false)}>
              <button
                onClick={() => { if (confirm(`"${p.name}" 프로모션을 휴지통으로 옮길까요?`)) start(() => deleteProject(p.id).then(() => router.refresh())); }}
                disabled={pending}
                className="flex w-full items-center gap-2 px-3 py-2 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" /> 휴지통으로
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="space-y-1 px-4 pb-3.5 pt-2">
        <div className="flex items-center justify-between">
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${typeBadge(p.type)}`}>{p.type}</span>
          <span className="text-[11px] text-muted-foreground">{p.updatedLabel}</span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>등록자 {p.author}</span>
          <span>{p.createdLabel}</span>
        </div>
      </div>
    </div>
  );
}

const EXPOSURE_BADGE: Record<string, string> = {
  노출: 'bg-emerald-100 text-emerald-700',
  미노출: 'bg-slate-100 text-slate-500',
};
// 테이블 뷰 — SB-EVT-027 목록 컬럼: No·프로모션 ID·전시 상태·프로모션명·유형·진행 기간·프로모션 상태·등록자·등록일시·최근 수정자·최근 수정일시
function ProjectTable({ rows, startIndex, sortKey, sortDir, onSort }: { rows: ProjectCard[]; startIndex: number; sortKey: SortKey; sortDir: 'asc' | 'desc'; onSort: (k: SortKey) => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const SortableTh = ({ k, label, className = '' }: { k: SortKey; label: string; className?: string }) => (
    <th className={`whitespace-nowrap px-3 py-2.5 text-left font-medium ${className}`}>
      <button onClick={() => onSort(k)} className="inline-flex items-center gap-1 hover:text-foreground">
        {label}
        {sortKey === k && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </th>
  );
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full min-w-[1080px] text-sm">
        <thead className="border-b bg-secondary/50 text-[12px] text-muted-foreground">
          <tr>
            <th className="whitespace-nowrap px-3 py-2.5 text-left font-medium">No.</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-left font-medium">프로모션 ID</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-left font-medium">전시 상태</th>
            <SortableTh k="name" label="프로모션명" />
            <SortableTh k="type" label="유형" />
            <th className="whitespace-nowrap px-3 py-2.5 text-left font-medium">진행 기간</th>
            <SortableTh k="status" label="프로모션 상태" />
            <SortableTh k="author" label="등록자" />
            <SortableTh k="recent" label="등록일시" />
            <th className="whitespace-nowrap px-3 py-2.5 text-left font-medium">최근 수정자</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-left font-medium">최근 수정일시</th>
            <th className="px-3 py-2.5 text-right font-medium">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((p, i) => {
            const href = p.pageId ? `/admin/events/pages/${p.pageId}/builder` : '#';
            return (
              <tr key={p.id} className="hover:bg-secondary/30">
                <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-muted-foreground">{startIndex + i + 1}</td>
                <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-muted-foreground">{p.programId}</td>
                <td className="px-3 py-2.5"><span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${EXPOSURE_BADGE[p.displayState] ?? EXPOSURE_BADGE['미노출']}`}>{p.displayState}</span></td>
                <td className="whitespace-nowrap px-3 py-2.5"><Link href={href} className="font-medium hover:text-primary">{p.name}</Link></td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  {p.kind !== '전시' && <span className="mr-1 text-[11px] text-muted-foreground">{p.kind}</span>}
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${typeBadge(p.type)}`}>{p.type}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-muted-foreground">{p.period}</td>
                <td className="px-3 py-2.5"><span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${PROMO_STATUS_BADGE[p.promoStatus] ?? PROMO_STATUS_BADGE['작성 중']}`}>{p.promoStatus}</span></td>
                <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-muted-foreground">{p.author}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-muted-foreground">{p.createdDateTime}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-muted-foreground">{p.editor}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-muted-foreground">{p.updatedDateTime}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-end gap-1.5">
                    <Link href={href} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium hover:bg-secondary"><PencilRuler className="h-3 w-3" /> 편집</Link>
                    <button
                      onClick={() => { if (confirm(`"${p.name}" 프로모션을 휴지통으로 옮길까요?`)) start(() => deleteProject(p.id).then(() => router.refresh())); }}
                      disabled={pending}
                      className="inline-flex items-center gap-1 rounded-md border border-destructive/30 px-2 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function EventsDashboard({ projects, deployRows, trashRows }: { projects: ProjectCard[]; deployRows: DeployRow[]; trashRows: TrashRow[] }) {
  const [section, setSection] = useState<Section>('projects');
  const [view, setView] = useState<'card' | 'table'>('table');
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  // 검색 조건 (SB-EVT-027)
  const [kind, setKind] = useState<string>('전체'); // 상위 유형: 이벤트 | 미션
  const [detailType, setDetailType] = useState<string>('전체'); // 세부 유형
  const [periodBasis, setPeriodBasis] = useState<'created' | 'displayStart'>('created'); // 기간 기준
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusSel, setStatusSel] = useState<Set<string>>(new Set(PROMO_STATUSES)); // 프로모션 상태(다중)
  const [exposure, setExposure] = useState<string>('전체'); // 전시 상태
  const [field, setField] = useState<'name' | 'programId' | 'author' | 'editor'>('name'); // 상세 조건 대상
  const [q, setQ] = useState('');
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);

  const KIND_OPTIONS = ['전체', '이벤트', '미션'];
  const typeOptions = ['전체', ...(kind === '미션' ? MISSION_TYPES : kind === '이벤트' ? EVENT_TYPES : [...EVENT_TYPES, ...MISSION_TYPES])];
  const FIELD_LABEL: Record<string, string> = { name: '프로모션명', programId: '프로모션 ID', author: '등록자', editor: '최근 수정자' };
  const EXPOSURE_OPTIONS = ['전체', '노출', '미노출'];

  function toggleStatus(s: string) {
    setStatusSel((prev) => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });
    setPage(1);
  }
  const allStatus = statusSel.size === PROMO_STATUSES.length;
  function toggleAllStatus() {
    setStatusSel(allStatus ? new Set() : new Set(PROMO_STATUSES));
    setPage(1);
  }

  function resetFilters() {
    setKind('전체'); setDetailType('전체'); setPeriodBasis('created'); setFromDate(''); setToDate('');
    setStatusSel(new Set(PROMO_STATUSES)); setExposure('전체'); setField('name'); setQ(''); setPage(1);
  }

  // 헤더 클릭 정렬 토글 (같은 키 재클릭 시 방향 반전)
  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir(k === 'name' || k === 'type' ? 'asc' : 'desc'); }
  }

  const ql = q.trim().toLowerCase();
  const fromMs = fromDate ? new Date(fromDate).getTime() : null;
  const toMs = toDate ? new Date(toDate).getTime() + 86_400_000 : null; // 종료일 포함
  const basisMs = (p: ProjectCard) => p.createdAtMs; // 등록일 기준 (전시 시작일 데이터는 대부분 미설정)
  const matchQuery = (p: ProjectCard) => {
    if (!ql) return true;
    const target = field === 'name' ? p.name : field === 'programId' ? p.programId : field === 'author' ? p.author : p.editor;
    return target.toLowerCase().includes(ql);
  };
  const filteredAll = projects
    .filter((p) =>
      (kind === '전체' || p.kind === kind) &&
      (detailType === '전체' || p.type === detailType) &&
      statusSel.has(p.promoStatus) &&
      (exposure === '전체' || p.displayState === exposure) &&
      (fromMs === null || basisMs(p) >= fromMs) &&
      (toMs === null || basisMs(p) < toMs) &&
      matchQuery(p))
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'name': return a.name.localeCompare(b.name, 'ko') * dir;
        case 'type': return (typeRank(a.type) - typeRank(b.type)) * dir || a.name.localeCompare(b.name, 'ko');
        case 'status': return a.promoStatus.localeCompare(b.promoStatus, 'ko') * dir;
        case 'author': return a.author.localeCompare(b.author, 'ko') * dir;
        case 'recent':
        default: return (a.createdAtMs - b.createdAtMs) * dir;
      }
    });

  const totalPages = Math.max(1, Math.ceil(filteredAll.length / perPage));
  const curPage = Math.min(page, totalPages);
  const startIndex = (curPage - 1) * perPage;
  const filtered = filteredAll.slice(startIndex, startIndex + perPage);

  // Excel(CSV) 다운로드 — 현재 검색 조건 기준 전체 (3-2)
  function downloadCsv() {
    const header = ['No', '프로모션 ID', '전시 상태', '프로모션명', '상위 유형', '세부 유형', '진행 기간', '프로모션 상태', '등록자', '등록일시', '최근 수정자', '최근 수정일시'];
    const lines = filteredAll.map((p, i) => [i + 1, p.programId, p.displayState, p.name, p.kind, p.type, p.period, p.promoStatus, p.author, p.createdDateTime, p.editor, p.updatedDateTime]);
    const csv = [header, ...lines].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `프로모션_목록_${filteredAll.length}건.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const navItem = (key: Section, icon: ReactNode, label: string, count: number) => (
    <button
      onClick={() => setSection(key)}
      className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 font-medium ${section === key ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
    >
      <span className="flex items-center gap-2">{icon} {label}</span>
      <span className={`rounded px-1.5 text-[11px] ${section === key ? 'bg-white/70' : 'bg-secondary'}`}>{count}</span>
    </button>
  );

  return (
    <div className="flex h-screen">
      {/* 워크스페이스 사이드바 — 전시화면 관리(컨테이너 목록)와 동일한 헤더/버튼 규격 */}
      <aside className="flex w-72 shrink-0 flex-col border-r bg-card">
        <div className="flex h-14 items-center justify-between border-b px-3">
          <span className="text-sm font-semibold">워크스페이스</span>
          <Link
            href="/admin/events/new"
            className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> 새 프로모션
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <nav className="space-y-1 text-sm">
            {navItem('projects', <LayoutTemplate className="h-4 w-4" />, '프로모션 관리', projects.length)}
            {navItem('deploy', <Rocket className="h-4 w-4" />, '배포 관리', deployRows.filter((d) => d.publishState === '게시 중').length)}
            {navItem('trash', <Trash2 className="h-4 w-4" />, '휴지통', trashRows.length)}
          </nav>
        </div>
      </aside>

      {/* 메인 */}
      <main className="flex-1 overflow-y-auto bg-background p-8">
        {section === 'projects' && (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold">프로모션</h1>
              <p className="mt-1 text-sm text-muted-foreground">총 {projects.length}개의 프로모션이 있습니다.</p>
            </div>

            {/* 검색 조건 영역 (SB-EVT-027 · PI-EVTMSN-SEARCH-001) */}
            <div className="mb-4 rounded-xl border bg-card p-4">
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 lg:grid-cols-2">
                {/* 유형 (상위 + 세부) */}
                <div className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-sm font-medium text-muted-foreground">유형</span>
                  <select value={kind} onChange={(e) => { setKind(e.target.value); setDetailType('전체'); setPage(1); }} className="h-9 w-32 rounded-lg border bg-background px-2.5 text-sm">
                    {KIND_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                  <select value={detailType} onChange={(e) => { setDetailType(e.target.value); setPage(1); }} className="h-9 flex-1 rounded-lg border bg-background px-2.5 text-sm">
                    {typeOptions.map((t) => <option key={t} value={t}>{t === '전체' ? '세부 유형 선택' : t}</option>)}
                  </select>
                </div>
                {/* 기간 */}
                <div className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-sm font-medium text-muted-foreground">기간</span>
                  <select value={periodBasis} onChange={(e) => setPeriodBasis(e.target.value as typeof periodBasis)} className="h-9 w-28 rounded-lg border bg-background px-2.5 text-sm">
                    <option value="created">등록일</option>
                    <option value="displayStart">전시 시작일</option>
                  </select>
                  <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} className="h-9 flex-1 rounded-lg border px-2.5 text-sm" />
                  <span className="text-muted-foreground">~</span>
                  <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} className="h-9 flex-1 rounded-lg border px-2.5 text-sm" />
                </div>
                {/* 프로모션 상태 (다중) */}
                <div className="flex items-start gap-3">
                  <span className="w-20 shrink-0 pt-1.5 text-sm font-medium text-muted-foreground">프로모션 상태</span>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1">
                    <label className="inline-flex items-center gap-1 text-sm">
                      <input type="checkbox" checked={allStatus} onChange={toggleAllStatus} className="h-3.5 w-3.5 accent-primary" /> 전체
                    </label>
                    {PROMO_STATUSES.map((s) => (
                      <label key={s} className="inline-flex items-center gap-1 text-sm">
                        <input type="checkbox" checked={statusSel.has(s)} onChange={() => toggleStatus(s)} className="h-3.5 w-3.5 accent-primary" /> {s}
                      </label>
                    ))}
                  </div>
                </div>
                {/* 전시 상태 */}
                <div className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-sm font-medium text-muted-foreground">전시 상태</span>
                  <select value={exposure} onChange={(e) => { setExposure(e.target.value); setPage(1); }} className="h-9 w-40 rounded-lg border bg-background px-2.5 text-sm">
                    {EXPOSURE_OPTIONS.map((s) => <option key={s} value={s}>{s === '전체' ? '전체' : s}</option>)}
                  </select>
                </div>
                {/* 상세 조건 */}
                <div className="flex items-center gap-3 lg:col-span-2">
                  <span className="w-20 shrink-0 text-sm font-medium text-muted-foreground">상세 조건</span>
                  <select value={field} onChange={(e) => { setField(e.target.value as typeof field); setPage(1); }} className="h-9 w-36 rounded-lg border bg-background px-2.5 text-sm">
                    {Object.entries(FIELD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <div className="relative max-w-md flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="검색어 입력" className="h-9 w-full rounded-lg border pl-9 pr-3 text-sm" />
                  </div>
                </div>
              </div>
              {/* 초기화 / 조회 */}
              <div className="mt-3 flex items-center justify-end gap-2 border-t pt-3">
                <button onClick={resetFilters} title="초기화" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border text-muted-foreground hover:bg-secondary"><RotateCcw className="h-4 w-4" /></button>
                <button onClick={() => setPage(1)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Search className="h-4 w-4" /> 조회</button>
              </div>
            </div>

            {/* 조회결과 카운트 + Excel 다운로드 + 개수/정렬/뷰 (SB-EVT-027 프로모션 목록 영역) */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <p className="text-muted-foreground">조회결과 : <b className="text-foreground">{filteredAll.length}</b>건{filteredAll.length !== projects.length && <span> (전체 {projects.length})</span>}</p>
              <div className="flex items-center gap-2">
                <button onClick={downloadCsv} className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] font-medium hover:bg-secondary"><Download className="h-3.5 w-3.5" /> Excel 다운로드</button>
                {view === 'card' && (
                  <div className="relative flex items-center">
                    <ArrowDownUp className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="h-8 rounded-lg border pl-8 pr-3 text-[13px]">
                      <option value="recent">최신순</option>
                      <option value="name">이름순</option>
                      <option value="type">유형순</option>
                      <option value="status">상태순</option>
                    </select>
                  </div>
                )}
                <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} className="h-8 rounded-lg border bg-background px-2 text-[13px]">
                  {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}개씩</option>)}
                </select>
                <div className="flex overflow-hidden rounded-lg border">
                  <button onClick={() => setView('card')} className={`px-2 py-1.5 ${view === 'card' ? 'bg-secondary' : ''}`} title="카드 보기"><LayoutGrid className="h-4 w-4" /></button>
                  <button onClick={() => setView('table')} className={`px-2 py-1.5 ${view === 'table' ? 'bg-secondary' : ''}`} title="테이블 보기"><Table2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center text-muted-foreground">
                <LayoutTemplate className="mb-3 h-10 w-10 opacity-40" />
                <p className="text-sm">조회 결과가 없습니다.</p>
                <button onClick={resetFilters} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium hover:bg-secondary"><RotateCcw className="h-3.5 w-3.5" /> 검색 조건 초기화</button>
              </div>
            ) : view === 'card' ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((p) => (
                  <ProjectTile key={p.id} p={p} />
                ))}
              </div>
            ) : (
              <ProjectTable rows={filtered} startIndex={startIndex} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
            )}

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="mt-5 flex items-center justify-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={curPage === 1} className="inline-flex h-8 w-8 items-center justify-center rounded-md border disabled:opacity-40 hover:bg-secondary"><ChevronLeft className="h-4 w-4" /></button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button key={n} onClick={() => setPage(n)} className={`h-8 min-w-8 rounded-md border px-2 text-sm ${n === curPage ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}>{n}</button>
                ))}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={curPage === totalPages} className="inline-flex h-8 w-8 items-center justify-center rounded-md border disabled:opacity-40 hover:bg-secondary"><ChevronRight className="h-4 w-4" /></button>
              </div>
            )}
          </>
        )}

        {section === 'deploy' && <DeployView rows={deployRows} />}
        {section === 'trash' && <TrashView rows={trashRows} />}
      </main>
    </div>
  );
}

// ── 배포 관리 — 게시 상태 뷰 + 노출/미노출 토글 ──
const PUBLISH_BADGE: Record<string, string> = {
  '게시 중': 'bg-emerald-100 text-emerald-700',
  '게시 예정': 'bg-amber-100 text-amber-700',
  종료: 'bg-slate-200 text-slate-600',
  미노출: 'bg-slate-100 text-slate-500',
};

function DeployView({ rows }: { rows: DeployRow[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">배포 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">전시 상태·전시 기간으로 계산한 게시 상태입니다. 노출/미노출을 바로 전환할 수 있습니다.</p>
      </div>
      {rows.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center text-center text-muted-foreground">
          <Rocket className="mb-3 h-10 w-10 opacity-40" />
          <p className="text-sm">배포할 프로모션이 없습니다.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-secondary/50 text-left text-[12px] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">프로그램</th>
                <th className="px-4 py-3 font-medium">유형</th>
                <th className="px-4 py-3 font-medium">전시 기간</th>
                <th className="px-4 py-3 font-medium">게시 상태</th>
                <th className="px-4 py-3 text-right font-medium">노출</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => {
                const on = r.displayState === '노출';
                return (
                  <tr key={r.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-medium">
                        {r.name}
                        {r.pageId && (
                          <Link href={`/admin/events/pages/${r.pageId}/builder`} className="text-muted-foreground hover:text-primary" title="빌더 열기">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                      {r.partnerBrand && <span className="text-[11px] text-muted-foreground">{r.partnerBrand}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${typeBadge(r.type)}`}>{r.type}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.period}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${PUBLISH_BADGE[r.publishState]}`}>{r.publishState}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => start(() => setDisplayState(r.id, on ? '미노출' : '노출').then(() => router.refresh()))}
                        disabled={pending}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium ${on ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'hover:bg-secondary'}`}
                      >
                        {on ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        {on ? '노출 중' : '미노출'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── 휴지통 — 복원 / 영구 삭제 ──
function TrashView({ rows }: { rows: TrashRow[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">휴지통</h1>
        <p className="mt-1 text-sm text-muted-foreground">삭제한 프로젝트는 여기서 복원하거나 영구 삭제할 수 있습니다.</p>
      </div>
      {rows.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center text-center text-muted-foreground">
          <Trash2 className="mb-3 h-10 w-10 opacity-40" />
          <p className="text-sm">휴지통이 비어 있습니다.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
              <div className="flex items-center gap-3">
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${typeBadge(r.type)}`}>{r.type}</span>
                <span className="font-medium">{r.name}</span>
                <span className="text-[11px] text-muted-foreground">{r.updatedLabel}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => start(() => restoreProject(r.id).then(() => router.refresh()))}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium hover:bg-secondary"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> 복원
                </button>
                <button
                  onClick={() => { if (confirm(`"${r.name}"을(를) 영구 삭제할까요? 되돌릴 수 없습니다.`)) start(() => purgeProject(r.id).then(() => router.refresh())); }}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 px-2.5 py-1.5 text-[12px] font-medium text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" /> 영구 삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
