'use client';

import { useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deleteProject, restoreProject, purgeProject, setDisplayState } from './actions';
import { LayoutTemplate, Rocket, Trash2, Plus, Search, LayoutGrid, Table2, MoreVertical, ArrowDownUp, ArrowUp, ArrowDown, Eye, EyeOff, RotateCcw, ExternalLink, PencilRuler } from 'lucide-react';

type SortKey = 'recent' | 'name' | 'type' | 'status' | 'author';

export type ProjectCard = {
  id: string;
  name: string;
  env: string;
  type: string; // 이벤트 유형(안내형·초청형…) 또는 '전시' / '기타'
  updatedLabel: string;
  createdAtMs: number; // 등록일 정렬용
  createdLabel: string; // 등록일 (YYYY.MM.DD)
  author: string; // 등록자
  displayState: string; // 노출 | 미노출
  publishState: '미노출' | '게시 예정' | '게시 중' | '종료';
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

// 첫 진입 구분 = 이벤트 유형 (정책서엔 DEV/STG/PRD 개념 없음 — 유형으로 나눈다)
const TYPE_TABS = ['전체', '안내형', '초청형', '기획전형', '응모형', '추천형', '구매/가입 연계형'];
const TYPE_ORDER = ['안내형', '초청형', '기획전형', '응모형', '추천형', '구매/가입 연계형', '기타'];
const TYPE_BADGE: Record<string, string> = {
  안내형: 'bg-sky-100 text-sky-700',
  초청형: 'bg-violet-100 text-violet-700',
  기획전형: 'bg-amber-100 text-amber-700',
  응모형: 'bg-rose-100 text-rose-700',
  추천형: 'bg-teal-100 text-teal-700',
  '구매/가입 연계형': 'bg-fuchsia-100 text-fuchsia-700',
  전시: 'bg-emerald-100 text-emerald-700',
  기타: 'bg-slate-100 text-slate-600',
};
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
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${TYPE_BADGE[p.type] ?? TYPE_BADGE['기타']}`}>{p.type}</span>
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

// 테이블 뷰 — SB-EVT-027 프로그램 등록·편집 목록형 (정렬 가능한 컬럼 헤더)
const PUBLISH_BADGE_C: Record<string, string> = {
  '게시 중': 'bg-emerald-100 text-emerald-700',
  '게시 예정': 'bg-amber-100 text-amber-700',
  종료: 'bg-slate-200 text-slate-600',
  미노출: 'bg-slate-100 text-slate-500',
};
function ProjectTable({ rows, sortKey, sortDir, onSort }: { rows: ProjectCard[]; sortKey: SortKey; sortDir: 'asc' | 'desc'; onSort: (k: SortKey) => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const SortableTh = ({ k, label, className = '' }: { k: SortKey; label: string; className?: string }) => (
    <th className={`whitespace-nowrap px-4 py-2.5 text-left font-medium ${className}`}>
      <button onClick={() => onSort(k)} className="inline-flex items-center gap-1 hover:text-foreground">
        {label}
        {sortKey === k && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </th>
  );
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b bg-secondary/50 text-[12px] text-muted-foreground">
          <tr>
            <SortableTh k="name" label="프로모션명" />
            <SortableTh k="type" label="유형" />
            <SortableTh k="status" label="게시 상태" />
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">전시 기간</th>
            <SortableTh k="author" label="등록자" />
            <SortableTh k="recent" label="등록일" />
            <th className="px-4 py-2.5 text-right font-medium">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((p) => {
            const href = p.pageId ? `/admin/events/pages/${p.pageId}/builder` : '#';
            return (
              <tr key={p.id} className="hover:bg-secondary/30">
                <td className="px-4 py-2.5"><Link href={href} className="font-medium hover:text-primary">{p.name}</Link></td>
                <td className="px-4 py-2.5"><span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${TYPE_BADGE[p.type] ?? TYPE_BADGE['기타']}`}>{p.type}</span></td>
                <td className="px-4 py-2.5"><span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${PUBLISH_BADGE_C[p.publishState]}`}>{p.publishState}</span></td>
                <td className="whitespace-nowrap px-4 py-2.5 text-[12px] text-muted-foreground">{p.period}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-[12px] text-muted-foreground">{p.author}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-[12px] text-muted-foreground">{p.createdLabel}</td>
                <td className="px-4 py-2.5">
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
  const [tab, setTab] = useState<string>('전체');
  const [q, setQ] = useState('');
  const [view, setView] = useState<'card' | 'table'>('card');
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // 헤더 클릭 정렬 토글 (같은 키 재클릭 시 방향 반전)
  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir(k === 'name' || k === 'type' ? 'asc' : 'desc'); }
  }

  const counts: Record<string, number> = { 전체: projects.length };
  for (const p of projects) counts[p.type] = (counts[p.type] ?? 0) + 1;

  const filtered = projects
    .filter((p) => (tab === '전체' || p.type === tab) && (!q || p.name.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'name': return a.name.localeCompare(b.name, 'ko') * dir;
        case 'type': return (typeRank(a.type) - typeRank(b.type)) * dir || a.name.localeCompare(b.name, 'ko');
        case 'status': return a.publishState.localeCompare(b.publishState, 'ko') * dir;
        case 'author': return a.author.localeCompare(b.author, 'ko') * dir;
        case 'recent':
        default: return (a.createdAtMs - b.createdAtMs) * dir;
      }
    });

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
        <div className="flex items-center justify-between border-b px-3 py-3">
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
            {navItem('projects', <LayoutTemplate className="h-4 w-4" />, '프로모션 목록', projects.length)}
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

            <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-b">
              {TYPE_TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`-mb-px border-b-2 px-1 pb-2 text-sm font-medium ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  {t} ({counts[t] ?? 0})
                </button>
              ))}
            </div>

            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="프로모션 검색..." className="h-10 w-full rounded-lg border pl-9 pr-3 text-sm" />
              </div>
              <div className="flex items-center gap-2">
                {view === 'card' && (
                  <div className="relative flex items-center">
                    <ArrowDownUp className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="h-9 rounded-lg border pl-8 pr-3 text-sm">
                      <option value="recent">최신순</option>
                      <option value="name">이름순</option>
                      <option value="type">유형순</option>
                      <option value="status">상태순</option>
                    </select>
                  </div>
                )}
                <div className="flex overflow-hidden rounded-lg border">
                  <button onClick={() => setView('card')} className={`px-2.5 py-2 ${view === 'card' ? 'bg-secondary' : ''}`} title="카드 보기"><LayoutGrid className="h-4 w-4" /></button>
                  <button onClick={() => setView('table')} className={`px-2.5 py-2 ${view === 'table' ? 'bg-secondary' : ''}`} title="테이블 보기"><Table2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center text-muted-foreground">
                <LayoutTemplate className="mb-3 h-10 w-10 opacity-40" />
                <p className="text-sm">프로모션이 없습니다. 새 프로모션으로 시작하세요.</p>
              </div>
            ) : view === 'card' ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((p) => (
                  <ProjectTile key={p.id} p={p} />
                ))}
              </div>
            ) : (
              <ProjectTable rows={filtered} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
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
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${TYPE_BADGE[r.type] ?? TYPE_BADGE['기타']}`}>{r.type}</span>
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
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${TYPE_BADGE[r.type] ?? TYPE_BADGE['기타']}`}>{r.type}</span>
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
