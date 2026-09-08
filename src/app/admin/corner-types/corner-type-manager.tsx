'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  OPERATION_CHANNELS,
  OPERATION_PLATFORMS,
  CORNER_TYPE_FEATURES,
  CORNER_TYPE_STATUS_LABEL,
  CORNER_TYPE_STATUS_COLOR,
  deriveCornerTypeUsage,
  CORNER_TYPES,
  cornerTypePurpose,
  cornerTypeGovernance,
  cornerTypeChipClass,
  componentTypesForCorner,
  cornerTypeDetails,
  layoutLabel,
  componentLabel,
  componentLayoutDetails,
  PRODUCT_SORT_OPTIONS,
  REC_SOURCE_METHODS,
  REC_SOURCE_INFO,
} from '@/lib/display-taxonomy';
import { isEventCornerFamily } from '@/lib/event-taxonomy';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Check, X, Search, ChevronDown, RotateCcw, Info } from 'lucide-react';
import { createCornerType, updateCornerType } from './actions';

// 등록된 코너 유형(코너 유형 관리 = 마스터)의 (코너유형·컴포넌트·배열) 조합. 등록 폼 ②③을 이걸로 좁힌다.
export type RegisteredCombo = { baseCategory: string; componentType: string | null; typeDetail: string | null; bigBanner?: boolean };

// 전시화면관리(빌더)에서 실제로 만들어진 코너 유형 조합. 등록 폼의 선택지를 이걸로 제한한다.
export type BuiltCornerOption = {
  cornerType: string; // 빌더에서 만들어진 cornerType (CORNER_TYPES 중 하나)
  details: string[]; // 그 유형으로 실제 만들어진 유형 상세(layoutDetail) 목록
  allowEmpty: boolean; // 유형 상세 없이(null) 만들어진 코너가 있으면 true → "선택 안 함" 허용
};

export type CornerTypeRow = {
  id: string;
  typeId: string;
  name: string;
  baseCategory: string;
  componentType: string | null;
  typeDetail: string | null;
  bigBanner: boolean;
  markupId: string | null;
  layout: string | null;
  description: string | null;
  channels: string;
  platforms: string;
  active: boolean;
  useMainTitle: boolean;
  useSubTitle: boolean;
  useMinItems: boolean;
  useMaxItems: boolean;
  useNoDisplay: boolean;
  useMoreButton: boolean;
  // 타입-레벨 기본값(빌더 상속)
  defaultMinItems: number | null;
  defaultMaxItems: number | null;
  defaultSortStrategy: string | null;
  defaultRecSource: string | null; // 기본 추천 수급 방식 (상품형·개인화 추천형)
  defaultMoreButton: boolean;
  defaultMoreButtonLabel: string | null;
  cvmFields: string; // 고객정보 연동 필드 keys csv
  userCustomizable?: boolean;
  userMinItems?: number | null;
  userMaxItems?: number | null;
  sampleImageUrl: string | null;
  status: string;
  rejectReason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  workingVersion?: number;
  liveVersion?: number | null;
  liveAt?: string | null;
  createdBy: string | null;
  updatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export const EMPTY_CORNER_TYPE: CornerTypeRow = {
  id: '',
  typeId: '(자동 생성)',
  name: '',
  baseCategory: '상품형',
  componentType: '상품형',
  typeDetail: null,
  bigBanner: false,
  markupId: null,
  layout: null,
  description: null,
  channels: 'FO',
  platforms: '모바일',
  active: true,
  useMainTitle: true,
  useSubTitle: true,
  useMinItems: true,
  useMaxItems: true,
  useNoDisplay: true,
  useMoreButton: true,
  defaultMinItems: null,
  defaultMaxItems: null,
  defaultSortStrategy: null,
  defaultRecSource: null,
  defaultMoreButton: false,
  defaultMoreButtonLabel: null,
  cvmFields: '',
  userCustomizable: false,
  userMinItems: null,
  userMaxItems: null,
  sampleImageUrl: null,
  status: 'DRAFT',
  workingVersion: 1,
  liveVersion: null,
  liveAt: null,
  createdBy: null,
};

export function CornerTypeManager({ types, builtOptions }: { types: CornerTypeRow[]; builtOptions: BuiltCornerOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // ── 상세 검색 필터 (T우주 코너 유형 목록 기준) ──
  // 필터 상태는 URL 쿼리에 저장 → 상세로 갔다가 뒤로 와도 유지된다.
  const statusKeys = Object.keys(CORNER_TYPE_STATUS_LABEL);
  const [expanded, setExpanded] = useState(true);
  const [preview, setPreview] = useState<string[] | null>(null); // 유형 샘플 확대 미리보기(클릭)
  const [hoverThumb, setHoverThumb] = useState<{ src: string; x: number; y: number } | null>(null); // 호버 확대(테이블 overflow에 안 잘리게 fixed 오버레이)
  const [domain, setDomain] = useState<'전시/관리' | '이벤트/미션'>(sp.get('domain') === '이벤트/미션' ? '이벤트/미션' : '전시/관리'); // 상위 분기
  const [base, setBase] = useState(sp.get('base') ?? '전체'); // 코너 유형
  const [detail, setDetail] = useState(sp.get('detail') ?? '전체'); // 유형 상세
  const [useOn, setUseOn] = useState(sp.get('on') !== '0');
  const [useOff, setUseOff] = useState(sp.get('off') !== '0');
  const [statusSel, setStatusSel] = useState<Set<string>>(
    sp.get('status') ? new Set(sp.get('status')!.split(',').filter(Boolean)) : new Set(statusKeys),
  );
  const [field, setField] = useState<'typeId' | 'createdBy'>(sp.get('field') === 'createdBy' ? 'createdBy' : 'typeId');
  const [q, setQ] = useState(sp.get('q') ?? '');
  const [perPage, setPerPage] = useState(Number(sp.get('pp')) || 10);
  const [page, setPage] = useState(Number(sp.get('p')) || 1);
  // 뷰 모드 — 유형별(7 상위 유형 → 배열·레이아웃) 그룹 뷰 ↔ 전체 목록(평면). 거버넌스는 유형 기준, 배열·레이아웃은 하위.
  const [view, setView] = useState<'group' | 'list'>(sp.get('view') === 'list' ? 'list' : 'group');

  // 상위 분기(도메인)로 코너 유형을 먼저 나눈다: 전시/관리(전시 8종) vs 이벤트/미션(전용 계열)
  const inDomain = (t: CornerTypeRow) => (domain === '이벤트/미션' ? isEventCornerFamily(t.baseCategory) : !isEventCornerFamily(t.baseCategory));
  const domainTypes = types.filter(inDomain);
  const baseOptions = ['전체', ...Array.from(new Set(domainTypes.map((t) => t.baseCategory).filter(Boolean)))];
  const detailOptions = ['전체', ...Array.from(new Set(domainTypes.map((t) => t.typeDetail).filter((d): d is string => !!d)))];

  const reset = () => { setBase('전체'); setDetail('전체'); setUseOn(true); setUseOff(true); setStatusSel(new Set(statusKeys)); setField('typeId'); setQ(''); setPage(1); };
  const switchDomain = (d: '전시/관리' | '이벤트/미션') => { setDomain(d); setBase('전체'); setDetail('전체'); setPage(1); };

  const ql = q.trim().toLowerCase();
  const filtered = domainTypes.filter((t) => {
    if (base !== '전체' && t.baseCategory !== base) return false;
    if (detail !== '전체' && (t.typeDetail ?? '') !== detail) return false;
    if (!(t.active ? useOn : useOff)) return false;
    if (statusSel.size < statusKeys.length && !statusSel.has(t.status)) return false;
    if (ql) {
      const hay = (field === 'createdBy' ? t.createdBy : t.typeId) ?? '';
      if (!hay.toLowerCase().includes(ql)) return false;
    }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const curPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((curPage - 1) * perPage, curPage * perPage);

  // 필터 상태 → URL 쿼리 동기화 (기본값은 생략). 상세 진입 후 뒤로 오면 이 쿼리로 복원된다.
  useEffect(() => {
    const p = new URLSearchParams();
    if (domain !== '전시/관리') p.set('domain', domain);
    if (base !== '전체') p.set('base', base);
    if (detail !== '전체') p.set('detail', detail);
    if (!useOn) p.set('on', '0');
    if (!useOff) p.set('off', '0');
    if (statusSel.size < statusKeys.length) p.set('status', [...statusSel].join(','));
    if (field !== 'typeId') p.set('field', field);
    if (q.trim()) p.set('q', q.trim());
    if (perPage !== 10) p.set('pp', String(perPage));
    if (curPage !== 1) p.set('p', String(curPage));
    if (view !== 'group') p.set('view', view);
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain, base, detail, useOn, useOff, statusSel, field, q, perPage, curPage, view]);

  const selectCls = 'h-9 rounded-lg border bg-white px-2.5 text-sm';
  const chk = 'flex items-center gap-1.5 text-sm cursor-pointer';

  return (
    <div className="space-y-4">
      <PageHeader
        trail={['전시 관리', '코너 유형 관리']}
        title="코너 유형 관리"
        action={
          <Link href="/admin/corner-types/new">
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> 등록
            </Button>
          </Link>
        }
      />

      {/* ── 최상위 분기: 전시/관리 ↔ 이벤트/미션 ── */}
      <div className="inline-flex rounded-xl border bg-surface-subtle p-1">
        {(['전시/관리', '이벤트/미션'] as const).map((d) => {
          const active = domain === d;
          const cnt = types.filter((t) => (d === '이벤트/미션' ? isEventCornerFamily(t.baseCategory) : !isEventCornerFamily(t.baseCategory))).length;
          return (
            <button
              key={d}
              type="button"
              onClick={() => switchDomain(d)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold transition',
                active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {d}
              <span className={cn('rounded-full px-1.5 text-[11px] tabular-nums', active ? 'bg-white/20' : 'bg-black/5')}>{cnt}</span>
            </button>
          );
        })}
      </div>

      {/* ── 상위 거버넌스: 승인 상태 탭 (언더라인 탭 — 참고 UI 스타일) ── */}
      {(() => {
        const statusTabActive = statusSel.size >= statusKeys.length ? '전체' : statusSel.size === 1 ? [...statusSel][0] : '';
        const setStatusTab = (k: string) => { setStatusSel(k === '전체' ? new Set(statusKeys) : new Set([k])); setPage(1); };
        // 라벨·순서는 정책서 상태값(CORNER_TYPE_STATUSES) 그대로 사용: 승인완료·승인요청·반려·임시저장
        const tabs: { key: string; label: string }[] = [{ key: '전체', label: '전체' }, ...statusKeys.map((k) => ({ key: k, label: CORNER_TYPE_STATUS_LABEL[k] ?? k }))];
        return (
          <div className="flex flex-wrap items-center gap-6 border-b">
            {tabs.map((t) => {
              const active = statusTabActive === t.key;
              const count = t.key === '전체' ? domainTypes.length : domainTypes.filter((x) => x.status === t.key).length;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setStatusTab(t.key)}
                  className={cn(
                    '-mb-px border-b-2 pb-2.5 text-sm font-semibold transition',
                    active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t.label}
                  <span className={cn('ml-1.5 text-xs tabular-nums', active ? 'text-primary' : 'text-muted-foreground/70')}>{count}</span>
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* 코너 유형은 상위 탭이 아니라 아래 상세 필터에서 고른다 (승인 상태만 상위 거버넌스 탭). */}

      {/* 상세 검색 필터 */}
      <div className="rounded-xl border bg-surface-subtle p-4">
        {expanded && (
          <div className="mb-3 grid gap-x-6 gap-y-3 border-b pb-3 md:grid-cols-2 xl:grid-cols-3">
            {/* 승인상태는 상단 탭에서 고른다 → 상세 필터에서는 중복 제거 */}
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">코너 유형</p>
              <select value={base} onChange={(e) => { setBase(e.target.value); setPage(1); }} className={`${selectCls} w-full`}>
                {baseOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">유형 상세</p>
              <select value={detail} onChange={(e) => { setDetail(e.target.value); setPage(1); }} className={`${selectCls} w-full`}>
                {detailOptions.map((o) => <option key={o} value={o}>{layoutLabel(o)}</option>)}
              </select>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">사용여부</p>
              <div className="flex h-9 items-center gap-4">
                <label className={chk}><input type="checkbox" checked={useOn} onChange={(e) => { setUseOn(e.target.checked); setPage(1); }} className="accent-primary" /> 사용</label>
                <label className={chk}><input type="checkbox" checked={useOff} onChange={(e) => { setUseOff(e.target.checked); setPage(1); }} className="accent-primary" /> 미사용</label>
              </div>
            </div>
          </div>
        )}
        {/* 직접 검색 행 */}
        <div className="flex flex-wrap items-center gap-2">
          <select value={field} onChange={(e) => setField(e.target.value as typeof field)} className={selectCls}>
            <option value="typeId">코너 유형 ID</option>
            <option value="createdBy">등록자</option>
          </select>
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="영문/숫자 포함 10자 이내로 입력해 주세요." className="h-9 w-full rounded-lg border pl-8 pr-3 text-sm" />
          </div>
          <button onClick={() => setExpanded((v) => !v)} className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-secondary">
            상세검색 {expanded ? '닫기' : '열기'} <ChevronDown className={cn('h-3.5 w-3.5 transition', expanded && 'rotate-180')} />
          </button>
          <button onClick={reset} title="초기화" className="inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-secondary"><RotateCcw className="h-4 w-4" /></button>
          <Button size="sm" className="h-9"><Search className="mr-1 h-4 w-4" /> 조회</Button>
        </div>
      </div>

      {/* 코너 유형 빠른 필터 칩 — 검색결과 바로 위, 원클릭 소팅(8색). 상위 탭은 승인 상태, 이건 유형. */}
      <div className="flex flex-wrap gap-1.5">
        {baseOptions.map((b) => {
          const active = base === b;
          const count = b === '전체' ? domainTypes.length : domainTypes.filter((t) => t.baseCategory === b).length;
          const color = b === '전체' ? 'border-border bg-card text-muted-foreground' : cornerTypeChipClass(b);
          return (
            <button
              key={b}
              type="button"
              onClick={() => { setBase(b); setPage(1); }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition',
                color,
                active ? 'ring-2 ring-primary ring-offset-1 font-semibold' : 'opacity-80 hover:opacity-100',
              )}
            >
              {b}
              <span className="rounded-full bg-black/5 px-1.5 text-[11px] tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {view === 'group'
            ? <>상위 유형 <b className="text-foreground">{(domain === '전시/관리' ? CORNER_TYPES.length : new Set(filtered.map((t) => t.baseCategory)).size)}</b> · 배열·레이아웃 <b className="text-foreground">{filtered.length}개</b></>
            : <>검색결과: <b className="text-foreground">{filtered.length}개</b></>}
        </p>
        <div className="flex items-center gap-2">
          {/* 뷰 토글 — 유형별(7 상위 → 배열·레이아웃) ↔ 목록(평면) */}
          <div className="flex rounded-lg border bg-white p-0.5 text-xs">
            <button onClick={() => setView('group')} className={cn('rounded-md px-2.5 py-1 font-medium', view === 'group' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary')}>유형별</button>
            <button onClick={() => setView('list')} className={cn('rounded-md px-2.5 py-1 font-medium', view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary')}>목록</button>
          </div>
          {view === 'list' && (
            <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} className="h-8 rounded-md border bg-white px-2 text-xs">
              {[10, 20, 50].map((n) => <option key={n} value={n}>{n}개씩</option>)}
            </select>
          )}
        </div>
      </div>

      {/* ── 유형별 그룹 뷰 — 7 상위 유형 → 배열·레이아웃. 거버넌스(허용 컴포넌트)는 유형 헤더에 한 번, 배열·레이아웃은 하위 행. ── */}
      {view === 'group' && (
        <div className="space-y-4">
          {(() => {
            const groupBases = domain === '전시/관리'
              ? (CORNER_TYPES as readonly string[]).filter((bc) => base === '전체' || bc === base)
              : [...new Set(filtered.map((t) => t.baseCategory))];
            if (groupBases.length === 0) return <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">조건에 맞는 코너 유형이 없습니다.</div>;
            return groupBases.map((bc) => {
              const rows = filtered.filter((t) => t.baseCategory === bc);
              const allowed = componentTypesForCorner(bc);
              const purpose = cornerTypePurpose(bc);
              const gov = cornerTypeGovernance(bc);
              const usingCount = rows.filter((r) => r.liveVersion != null && r.active).length;
              return (
                <div key={bc} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                  {/* ── 유형 헤더(항상 표시) ── */}
                  <div className="flex flex-wrap items-center gap-3 border-b px-5 py-4">
                    <span className={cn('inline-flex shrink-0 items-center rounded-md border px-2.5 py-1 text-[13px] font-bold', cornerTypeChipClass(bc))}>{bc}</span>
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">배열·레이아웃 {rows.length}</span>
                    {usingCount > 0 && <span className="shrink-0 text-[11px] font-medium text-emerald-600">사용 {usingCount}</span>}
                    {purpose && <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted-foreground">{purpose}</span>}
                    <Link href={`/admin/corner-types/new?base=${encodeURIComponent(bc)}`} className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-lg border bg-white px-3 py-1.5 text-xs font-medium text-primary shadow-sm transition hover:bg-secondary"><Plus className="h-3.5 w-3.5" /> 배열·레이아웃 추가</Link>
                  </div>

                  {/* 거버넌스 패널 */}
                  {(gov || allowed.length > 0) && (
                    <div className="border-b bg-surface-subtle/60 px-5 py-3">
                      {allowed.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-foreground">담을 수 있는 컴포넌트(모듈)</span>
                          {allowed.map((c) => <span key={c} className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{componentLabel(c)}</span>)}
                          <span className="ml-1 text-[10px] text-muted-foreground/70">빌더에서 이 코너에 붙일 수 있는 구성 모듈 · PI-DSP-CMP-003</span>
                        </div>
                      )}
                      {gov && <p className="mt-2 border-t border-dashed pt-2 text-[12.5px] leading-relaxed text-muted-foreground">{gov}</p>}
                    </div>
                  )}

                  {/* ── 배열·레이아웃 카드 그리드 — 하나씩 카드, 클릭하면 상세로 ── */}
                  {rows.length === 0 ? (
                    <p className="px-5 py-4 text-[13px] text-muted-foreground">등록된 배열·레이아웃이 없습니다. <b className="text-foreground">배열·레이아웃 추가</b>로 이 유형의 첫 배열을 등록하세요.</p>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto p-4">
                      {rows.map((t) => {
                        const g = deriveCornerTypeUsage({ status: t.status, active: t.active, liveVersion: t.liveVersion ?? null, workingVersion: t.workingVersion ?? 1 });
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => router.push(`/admin/corner-types/${t.id}`)}
                            className="group flex w-[300px] shrink-0 flex-col overflow-hidden rounded-xl border bg-white text-left shadow-sm transition hover:border-primary/50 hover:shadow-md"
                          >
                            {/* 상단 고정: 배열·레이아웃 이름 + ID (미리보기 높이와 무관하게 정렬) */}
                            <div className="border-b px-3 py-2.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[14px] font-semibold text-foreground">{layoutLabel(t.typeDetail) || '(상세 없음)'}</span>
                                {t.componentType && t.componentType !== bc && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{componentLabel(t.componentType)}</span>}
                              </div>
                              <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground/70">{t.typeId}</span>
                            </div>
                            {/* 미리보기 = 배열·레이아웃 쉐입(와이어프레임). flex-1로 같은 행 최대 높이에 맞춰 채움(안 잘림·동일 사이즈). */}
                            <div className="flex-1 bg-slate-50 p-2">
                              <TypeDetailPreview base={bc} component={t.componentType ?? undefined} detail={t.typeDetail ?? ''} bigBanner={t.bigBanner} compact />
                            </div>
                            {/* 하단 고정: 상태 */}
                            <div className="mt-auto flex flex-wrap items-center gap-1 border-t px-3 py-2.5">
                              {t.liveVersion != null && t.active
                                ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">사용 중 · v{t.liveVersion}</span>
                                : <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">미사용</span>}
                              <span className={cn('rounded-full border px-1.5 py-0.5 text-[10px] font-semibold', CORNER_TYPE_STATUS_COLOR[t.status] ?? 'bg-muted')}>{CORNER_TYPE_STATUS_LABEL[t.status] ?? t.status}</span>
                              {g.needsPublish && <span className="rounded-full border border-indigo-300 bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">반영 필요</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      )}

      {view === 'list' && (
      <div className="overflow-x-auto border">
        <table className="w-full text-sm">
          <thead className="border-b bg-surface-subtle text-xs text-muted-foreground">
            <tr>
              {['번호', '코너 유형 ID', '코너 유형', '구성 컴포넌트', '배열/레이아웃 상세', '사용여부', '유형 샘플', '승인상태', '등록자', '등록일시', '최근수정자', '최근 수정일시'].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={12} className="px-3 py-8 text-center text-muted-foreground">
                  {types.length === 0 ? <>등록된 코너 유형이 없습니다. 우측 상단 <b>등록</b>으로 추가하세요.</> : '검색 조건에 맞는 코너 유형이 없습니다.'}
                </td>
              </tr>
            )}
            {pageRows.map((t, i) => (
              <tr key={t.id} onClick={() => router.push(`/admin/corner-types/${t.id}`)} className="cursor-pointer hover:bg-muted/40">
                <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{(curPage - 1) * perPage + i + 1}</td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-primary underline-offset-2 hover:underline">{t.typeId}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold', cornerTypeChipClass(t.baseCategory))}>
                    {t.baseCategory}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-xs">{componentLabel(t.componentType) || '-'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-xs">
                  <span className="inline-flex items-center gap-1">
                    {layoutLabel(t.typeDetail) || '-'}
                    {t.bigBanner && (
                      <span className="inline-flex items-center rounded border border-dashed border-indigo-400 bg-indigo-50/60 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600">빅배너</span>
                    )}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {/* 사용 여부(TM-DSP-021) — 목록에서는 읽기 전용 표시. 전환은 상세에서만(오클릭 방지). */}
                  {t.liveVersion != null && t.active ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">사용 중 · v{t.liveVersion}</span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground" title={t.liveVersion == null ? '승인·반영 후에 사용할 수 있습니다' : '미사용'}>미사용</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  {t.sampleImageUrl ? (
                    (() => {
                      const srcs = t.sampleImageUrl!.split('\n').filter(Boolean);
                      const first = srcs[0];
                      const more = srcs.length - 1; // 나머지 개수 → +N 마킹
                      return (
                        <button
                          type="button"
                          onClick={() => setPreview(srcs)}
                          onMouseEnter={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHoverThumb({ src: first, x: r.left, y: r.top }); }}
                          onMouseLeave={() => setHoverThumb(null)}
                          className="relative inline-flex shrink-0 items-center rounded-lg ring-offset-1 transition hover:ring-2 hover:ring-primary/50"
                          title={`클릭하면 전체보기 (총 ${srcs.length}장)`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={first} alt="유형 샘플" className="h-9 w-14 rounded-lg border object-cover object-top [filter:contrast(1.08)_saturate(1.15)]" />
                          {/* 여러 장이면 +N 마킹 (오른쪽 아래 배지) */}
                          {more > 0 && (
                            <span className="absolute -bottom-1 -right-1 rounded-full border border-white bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white shadow-sm">
                              +{more}
                            </span>
                          )}
                        </button>
                      );
                    })()
                  ) : (
                    <span className="inline-flex items-center rounded border px-2 py-0.5 text-[11px] text-muted-foreground/50">없음</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-xs">
                  {(() => {
                    const g = deriveCornerTypeUsage({ status: t.status, active: t.active, liveVersion: t.liveVersion ?? null, workingVersion: t.workingVersion ?? 1 });
                    return (
                      <span className="inline-flex items-center gap-1">
                        <span className={cn('rounded-full border px-1.5 py-0.5 text-[10px] font-semibold', CORNER_TYPE_STATUS_COLOR[t.status] ?? 'bg-muted')}>
                          {CORNER_TYPE_STATUS_LABEL[t.status] ?? t.status}
                        </span>
                        {/* '사용 중'은 사용여부 컬럼으로 일원화 → 승인상태에는 편집본 관련 플래그만 */}
                        {g.needsPublish && <span className="rounded-full border border-indigo-300 bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">반영 필요</span>}
                        {g.changeInReview && <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">변경 검수 중</span>}
                      </span>
                    );
                  })()}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{t.createdBy ?? '-'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{t.createdAt ? t.createdAt.replace('T', ' ').slice(0, 16) : '-'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{t.updatedBy ?? '-'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{t.updatedAt ? t.updatedAt.replace('T', ' ').slice(0, 16) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {/* 페이지네이션 */}
      {view === 'list' && totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 text-sm">
          <button onClick={() => setPage(Math.max(1, curPage - 1))} disabled={curPage <= 1} className="rounded-md border px-2.5 py-1.5 disabled:opacity-40 hover:bg-secondary">‹</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button key={n} onClick={() => setPage(n)} className={cn('min-w-[32px] rounded-md border px-2 py-1.5 font-medium', n === curPage ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary')}>{n}</button>
          ))}
          <button onClick={() => setPage(Math.min(totalPages, curPage + 1))} disabled={curPage >= totalPages} className="rounded-md border px-2.5 py-1.5 disabled:opacity-40 hover:bg-secondary">›</button>
        </div>
      )}

      {/* 유형 샘플 확대 미리보기 모달 (클릭 시) — 화면 전체 오버레이라 잘리지 않음 */}
      {preview && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-6"
          onClick={() => setPreview(null)}
        >
          <div className="max-h-[88vh] max-w-[92vw] overflow-auto rounded-2xl bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">유형 샘플 미리보기 · {preview.length}장</span>
              <button type="button" onClick={() => setPreview(null)} className="text-muted-foreground hover:text-foreground" title="닫기">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {preview.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt={`유형 샘플 ${i + 1}`} className="max-h-[70vh] w-auto max-w-[280px] rounded-xl border object-contain shadow-sm [filter:contrast(1.08)_saturate(1.15)]" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 유형 샘플 호버 확대 — 테이블 overflow에 잘리지 않도록 fixed 오버레이(viewport 기준). 위 공간 부족하면 아래로. */}
      {hoverThumb && (
        <div
          className="pointer-events-none fixed z-[90]"
          style={
            hoverThumb.y > 200
              ? { left: hoverThumb.x, top: hoverThumb.y - 8, transform: 'translateY(-100%)' }
              : { left: hoverThumb.x, top: hoverThumb.y + 44 }
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hoverThumb.src} alt="유형 샘플 미리보기" className="w-56 max-w-none rounded-xl border bg-white object-contain shadow-xl ring-1 ring-black/5 [filter:contrast(1.08)_saturate(1.15)]" />
        </div>
      )}
    </div>
  );
}

// 단계 카드 헤더 — 번호 배지 + 제목(+필수) + 정렬된 보조 설명(서브라인). 폼 전반의 작은 안내 문구 톤 통일.
function StepHead({ n, title, required, hint }: { n: number; title: string; required?: boolean; hint?: string }) {
  return (
    <div className="mb-2.5">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold leading-none text-white">{n}</span>
        <span className="text-sm font-semibold text-slate-800">
          {title}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </span>
      </div>
      {hint && <p className="mt-1 pl-7 text-[11px] leading-relaxed text-slate-400">{hint}</p>}
    </div>
  );
}

// ── 코너 유형 등록/수정 폼 (BO 대표 유형 화면 · 등록 폼 패턴) ─────────────
export function CornerTypeForm({ row, builtOptions, registered = [], onClose }: { row: CornerTypeRow; builtOptions: BuiltCornerOption[]; registered?: RegisteredCombo[]; onClose: () => void }) {
  const isNew = !row.id;
  // 2단 분류: ① 코너 유형(base) → ② 배열·레이아웃(detail). 구성 컴포넌트는 배열·레이아웃에서 자동 도출.
  const [base, setBase] = useState(row.baseCategory);
  const [detail, setDetail] = useState(row.typeDetail ?? '');
  const [bigBanner, setBigBanner] = useState(row.bigBanner ?? false); // ④ 빅배너 구분자
  const [active, setActive] = useState(row.active);
  const [moreDefault, setMoreDefault] = useState(row.defaultMoreButton ?? false); // 더보기 기본 ON(타입-레벨)
  // FO 사용자 설정(고객 커스터마이즈) 기본값 — 선택형·메뉴 유형에서
  const [userCustom, setUserCustom] = useState(row.userCustomizable ?? false);
  const [userMin, setUserMin] = useState(row.userMinItems != null ? String(row.userMinItems) : '');
  const [userMax, setUserMax] = useState(row.userMaxItems != null ? String(row.userMaxItems) : '');
  // 세부 항목(항목별 사용여부) — 6개 토글을 한 곳에서 관리(미리보기/노출 기본값과 실시간 연동)
  const [features, setFeatures] = useState({
    useMainTitle: row.useMainTitle,
    useSubTitle: row.useSubTitle,
    useMinItems: row.useMinItems,
    useMaxItems: row.useMaxItems,
    useNoDisplay: row.useNoDisplay,
    useMoreButton: row.useMoreButton,
  });

  // ① 코너 유형 = 정책서 7종 고정(PI-DSP-CMP-003 / TM-DSP-021). 수정 시 레거시 값 보존.
  const baseOptions = Array.from(
    new Set<string>([...CORNER_TYPES, ...(!isNew && row.baseCategory ? [row.baseCategory] : [])]),
  );
  const onOrigBase = !isNew && base === row.baseCategory;

  // ── 분류는 '유형 → 배열·레이아웃' 2단. 구성 컴포넌트 유형은 별도 단계 없이 배열·레이아웃에서 자동 도출한다. ──
  //  배열·레이아웃 카탈로그 = 이 유형에 등록된 상세 ∪ 정책 세부 유형(cornerTypeDetails). 컴포넌트 = 배열·레이아웃→컴포넌트 결정(허용치 내).
  const compForShape = (b: string, d: string): string => {
    const reg = registered.find((r) => r.baseCategory === b && (r.typeDetail ?? '') === d);
    if (reg?.componentType) return reg.componentType; // 등록된 조합 우선
    for (const c of componentTypesForCorner(b)) if (componentLayoutDetails(c).includes(d)) return c; // 이 배열·레이아웃을 제공하는 허용 컴포넌트
    return componentTypesForCorner(b)[0] ?? '';
  };
  const typeShapes = (() => {
    const seen = new Set<string>(); const out: string[] = [];
    for (const r of registered.filter((x) => x.baseCategory === base)) if (r.typeDetail && !seen.has(r.typeDetail)) { seen.add(r.typeDetail); out.push(r.typeDetail); }
    for (const d of cornerTypeDetails(base)) if (!seen.has(d)) { seen.add(d); out.push(d); }
    if (onOrigBase && row.typeDetail && !seen.has(row.typeDetail)) { seen.add(row.typeDetail); out.push(row.typeDetail); }
    return out;
  })();
  const allowEmptyDetail = typeShapes.length === 0;
  const defaultShapeFor = (b: string): string => {
    const reg = registered.find((r) => r.baseCategory === b && r.typeDetail);
    return reg?.typeDetail ?? cornerTypeDetails(b)[0] ?? '';
  };
  // 유형 샘플 이미지 — 로컬에서 직접 등록(data URI)
  const [sampleImage, setSampleImage] = useState(row.sampleImageUrl ?? '');
  const sampleFileRef = useRef<HTMLInputElement>(null);
  const onSampleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setSampleImage(String(reader.result));
    reader.readAsDataURL(f);
  };
  const detailValid = typeShapes.includes(detail) ? detail : (allowEmptyDetail ? '' : (typeShapes[0] ?? ''));
  const compValid = compForShape(base, detailValid); // 컴포넌트는 배열·레이아웃에서 자동 도출

  // ── 세부 항목 적용 가능 여부 (유형별) ──
  // 카테고리 탭/고정형 탭/배너/아이콘형 등은 코너 타이틀·서브타이틀이 없다(미리보기 noHeader와 동일 기준).
  // 선택형(탭·메뉴)·단일/배너/바코드/프로필은 '리스트'가 아니므로 노출 개수·더보기가 의미 없다.
  const dStr = detailValid ?? '';
  const isBannerType = compValid === '배너형' || base === '배너형';
  // 헤더(코너 타이틀/서브타이틀) 없는 유형 — 배너·아이콘/이미지 카드, 그리고 '순수 탭'(선택형)만.
  //  '세로형(카테고리탭)'처럼 상품형 리스트의 탭 변형은 헤더가 있으므로 제외(선택형일 때만 탭=무헤더).
  const isStandaloneTab = compValid === '선택형' && (/카테고리\s*탭/.test(dStr) || dStr.includes('고정형(탭)'));
  const noHeaderType = isBannerType || isStandaloneTab || ['아이콘형', '이미지형', '팝업', '띠', '텍스트배너'].some((k) => dStr.includes(k));
  // 여러 아이템을 나열하는 리스트형 코너 — 노출 개수·더보기가 의미 있는 유형(상품형/혜택형/정보형 리스트)
  const isListType = compValid === '상품형' || compValid === '혜택형' || (compValid === '정보형' && /리스트/.test(dStr));
  const featureApplies = (key: string) => {
    if (key === 'useMainTitle' || key === 'useSubTitle') return !noHeaderType;
    if (key === 'useMoreButton') return isListType; // CTA 노출은 리스트형에서 의미
    return true; // 미 노출 기준은 어떤 코너에서도 설정 가능
  };
  // 실제 적용값 = 토글 ON && 유형에 적용 가능
  const eff = (key: keyof typeof features) => featureApplies(key) && features[key];
  const useTitle = eff('useMainTitle');
  const useSub = eff('useSubTitle');

  // ④ 빅배너 구분자는 '상품형' 모듈(상품·혜택 리스트/카드) 위에 얹는 것만 의미가 있다 → 상품형일 때만 노출/적용.
  const canBigBanner = compValid === '상품형';
  const bigBannerOn = canBigBanner && bigBanner;
  // 코너 유형 명 = [코너 유형 · 컴포넌트 · 배열 (· 빅배너)] 자동 구성
  // 코너 유형 명 = 유형 · (컴포넌트) · 배열. 컴포넌트가 유형과 같으면 생략(‘상품형 · 상품형’ 중복 제거).
  const derivedName = [base, compValid !== base ? compValid : '', detailValid, bigBannerOn ? '빅배너' : ''].filter(Boolean).join(' · ');
  const channels = row.channels.split(',').filter(Boolean);
  const platforms = row.platforms.split(',').filter(Boolean);
  const action = isNew ? createCornerType : updateCornerType.bind(null, row.id);

  return (
    <form
      action={async (fd) => {
        await action(fd);
        onClose();
      }}
      className="space-y-4 rounded-lg border bg-card p-5"
    >
      <div className="flex items-center gap-2 border-b pb-3">
        <h2 className="text-sm font-semibold">{isNew ? '코너 유형 등록' : `코너 유형 수정 · ${row.typeId}`}</h2>
      </div>

      {/* 기본 정보 */}
      <section className="overflow-hidden rounded-md border">
        <div className="border-b bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700">기본 정보</div>
        {/* 상단: 좌측 미리보기(고정 폭) + 우측 핵심 필드(코너 유형 ID · 코너 유형 · 유형 상세) */}
        <div className="grid grid-cols-1 items-start gap-5 border-b p-3 md:grid-cols-[460px_minmax(0,1fr)]">
          <TypeDetailPreview base={base} component={compValid} detail={detailValid} bigBanner={bigBannerOn} useTitle={useTitle} useSub={useSub} useMore={eff('useMoreButton')} />
          <div className="space-y-3">
            {/* 코너 유형 명은 [코너 유형 · 컴포넌트 · 배열]로 자동 구성 · 코너 레이아웃은 값 보존 */}
            <input type="hidden" name="name" value={derivedName} />
            <input type="hidden" name="layout" value={row.layout ?? ''} />

            {/* 안내 + 코너 유형 ID */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2">
              <span className="flex items-center gap-1.5 text-[11px] text-indigo-700">
                <Info className="h-3.5 w-3.5 shrink-0" />
                <span><b className="font-semibold">2단계</b>로 코너를 정의해요 — 코너 유형 → 배열·레이아웃</span>
              </span>
              <span className="text-[11px] text-slate-500">
                코너 유형 ID <span className="ml-0.5 rounded border bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-700">{row.typeId}</span>
              </span>
            </div>

            {/* ① 코너 유형 */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
              <StepHead n={1} title="코너 유형" required hint="이 코너가 화면에서 맡는 역할이에요" />
              <div className="flex flex-wrap gap-1.5">
                {baseOptions.map((c) => (
                  <label key={c} className="cursor-pointer">
                    <input
                      type="radio"
                      name="baseCategory"
                      value={c}
                      checked={base === c}
                      onChange={() => {
                        setBase(c);
                        setDetail(defaultShapeFor(c));
                      }}
                      className="peer sr-only"
                    />
                    <span className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-indigo-300 peer-checked:border-indigo-600 peer-checked:bg-indigo-600 peer-checked:text-white">
                      {c}
                    </span>
                  </label>
                ))}
              </div>
              {cornerTypePurpose(base) && (
                <p className="mt-2 flex gap-1.5 rounded-md bg-indigo-50 px-2.5 py-1.5 text-[11px] leading-relaxed text-indigo-700">
                  <span className="shrink-0 font-semibold">목적</span>
                  <span>{cornerTypePurpose(base)}</span>
                </p>
              )}
            </div>

            {/* 구성 컴포넌트 유형은 배열·레이아웃에서 자동 도출 → 별도 단계 없이 hidden으로만 저장(거버넌스는 유형 기준 유지) */}
            <input type="hidden" name="componentType" value={compValid} />

            {/* ② 배열·레이아웃 */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
              <StepHead n={2} title="배열·레이아웃" hint="이 유형을 어떤 형태로 보여줄지 골라요" />
              <div className="flex flex-wrap gap-1.5">
                {allowEmptyDetail && (
                  <label className="cursor-pointer">
                    <input type="radio" name="typeDetail" value="" checked={detailValid === ''} onChange={() => setDetail('')} className="peer sr-only" />
                    <span className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-indigo-300 peer-checked:border-indigo-600 peer-checked:bg-indigo-600 peer-checked:text-white">
                      선택 안 함
                    </span>
                  </label>
                )}
                {typeShapes.map((d) => (
                  <label key={d} className="cursor-pointer">
                    <input type="radio" name="typeDetail" value={d} checked={detailValid === d} onChange={() => setDetail(d)} className="peer sr-only" />
                    <span className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-indigo-300 peer-checked:border-indigo-600 peer-checked:bg-indigo-600 peer-checked:text-white">
                      {layoutLabel(d)}
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                배열은 <b>형태(레이아웃)</b>만 정합니다. <b>노출 개수(몇 개를 보여줄지)</b>는 유형에서 고정하지 않고, <b>코너를 배치할 때(빌더)에서 최대 노출 개수로 추가·조정</b>할 수 있어요.
              </p>
            </div>

            {/* 빅배너 구분자 제거 — 빅배너는 유형 식별자가 아니라 코너 인스턴스의 부속 옵션(빌더의 '빅배너 위치 상/하단')으로만 둔다. */}
            <input type="hidden" name="bigBanner" value="" />

            {/* 결과 요약 */}
            <div className="rounded-md border border-dashed bg-slate-50 px-3 py-2 text-[11px] text-muted-foreground">
              이렇게 등록돼요 · <span className="font-semibold text-foreground">{derivedName}</span>
            </div>
          </div>
        </div>

        {/* 하단: 나머지 항목 2열 */}
        <div className="grid grid-cols-1 md:grid-cols-2">
          <TRow label="운영 채널">
            <OpsCheckGroup name="channels" options={OPERATION_CHANNELS} initial={channels} />
          </TRow>
          <TRow label="운영 플랫폼">
            <OpsCheckGroup name="platforms" options={OPERATION_PLATFORMS} initial={platforms} />
          </TRow>

          <TRow label="사용 여부" required>
            <div className="flex gap-4 py-0.5 text-xs">
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={active} onChange={() => setActive(true)} className="accent-indigo-600" /> 사용
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={!active} onChange={() => setActive(false)} className="accent-indigo-600" /> 미사용
              </label>
            </div>
            {active && <input type="hidden" name="active" value="on" />}
          </TRow>
          <TRow label="승인상태" hint="승인 결과는 별도 승인 프로세스에서 반영됩니다">
            <div className="flex items-center gap-2 py-0.5">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                {CORNER_TYPE_STATUS_LABEL[row.status] ?? row.status}
              </span>
              <span className="text-[10px] text-muted-foreground">(읽기 전용)</span>
            </div>
            <input type="hidden" name="status" value={row.status} />
          </TRow>

          <div className="p-3 md:col-span-2">
            <TRow label="코너 유형 설명" flat>
              <Input name="description" defaultValue={row.description ?? ''} placeholder="100자 이내" className="h-8 text-xs" />
            </TRow>
          </div>
        </div>
      </section>

      {/* 세부 항목 (항목별 사용여부) — 이 코너 유형이 어떤 항목을 쓰는지. 유형에 맞지 않으면 자동 비활성. */}
      <section className="overflow-hidden rounded-md border">
        <div className="border-b bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700">세부 항목 (항목별 사용여부)</div>
        <div className="grid grid-cols-[120px_1fr] items-start gap-3 px-3 py-3">
          <label className="pt-1 text-xs font-medium text-muted-foreground">표시 항목</label>
          <div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {CORNER_TYPE_FEATURES.map((f) => {
              const applies = featureApplies(f.key);
              const checked = applies && features[f.key as keyof typeof features];
              const toggle = (on: boolean) => {
                setFeatures((prev) => {
                  const next = { ...prev, [f.key]: on };
                  if (f.key === 'useMainTitle' && !on) next.useSubTitle = false; // 타이틀 끄면 서브타이틀도(단독 불가)
                  if (f.key === 'useSubTitle' && on) next.useMainTitle = true; // 서브타이틀 켜면 타이틀 자동 ON
                  return next;
                });
              };
              return (
                <label key={f.key} className={cn('flex items-center gap-1.5 text-sm', !applies && 'cursor-not-allowed text-muted-foreground/40')} title={!applies ? '이 코너 유형에는 해당 항목이 없어요' : undefined}>
                  <input
                    type="checkbox"
                    name={f.key}
                    checked={checked}
                    disabled={!applies}
                    onChange={(e) => toggle(e.target.checked)}
                    className="accent-indigo-600 disabled:opacity-40"
                  />
                  {f.label}
                </label>
              );
            })}
          </div>
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
              <Info className="h-3.5 w-3.5 text-indigo-500" /> 체크한 항목만 이 유형의 코너에 나타나요
            </p>
            <ul className="space-y-1.5 text-[11px] leading-relaxed text-slate-500">
              {[
                ['타이틀·서브타이틀', '미리보기 상단에 표시돼요 · 빌더에서도 코너별로 수정 가능 (서브타이틀은 타이틀 없이 못 켜요)'],
                ['CTA 노출', '아래 ‘노출·구성 기본값’에서 기본값 → 빌더에서 코너별로 문구·링크 조정'],
                ['미 노출 기준', '빌더에서 ‘재고 소진 시’ 등 숨김 조건으로 쓰여요'],
              ].map(([k, v]) => (
                <li key={k} className="flex items-start gap-1.5">
                  <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-indigo-300" />
                  <span>
                    <b className="font-medium text-slate-700">{k}</b> — {v}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 border-t border-slate-200 pt-2 text-[10px] text-slate-400">유형에 맞지 않는 항목은 자동으로 비활성화돼요. · 노출 개수(최소·최대)는 빌더에서 코너별로 설정해요.</p>
          </div>
          </div>
          </div>
      </section>

      {/* 추천 수급 방식 — 추천 슬롯 유형(상품형·혜택·오퍼형·콘텐츠 안내형)에만. 상태 안내형·프로필·바코드 등 고객정보 카드는 제외 (CVM=추천이지 고객정보 아님) */}
      {['상품형', '혜택·오퍼형', '콘텐츠 안내형'].includes(base) && (
      <section className="overflow-hidden rounded-md border border-violet-200">
        <div className="flex items-center gap-2 border-b border-violet-100 bg-violet-50/60 px-3.5 py-2.5 text-xs font-semibold text-violet-700">
          추천 수급 방식 · 기본값
          <span className="font-normal text-violet-400">이 코너를 ‘무엇을 기준으로’ 채울지의 기본값 · 실제 선택은 빌더에서 코너별로</span>
        </div>
        <div className="space-y-2 p-3">
          <select name="defaultRecSource" defaultValue={row.defaultRecSource ?? ''} className="h-8 w-full max-w-xs rounded-md border border-violet-200 bg-background px-2 text-xs">
            <option value="">미지정 (직접 구성한 항목을 그대로 노출)</option>
            {REC_SOURCE_METHODS.map((s) => (
              <option key={s} value={s}>{s} — {REC_SOURCE_INFO[s].tag}</option>
            ))}
          </select>
          <p className="rounded-md bg-violet-50/70 px-2.5 py-1.5 text-[10px] leading-relaxed text-violet-700/90">
            추천은 <b>통합채널이 만드는 게 아니라</b>, CVM(세일즈포스 기반 추천 시스템)이 후보·순위·근거를 내려주면 화면이 그 순서대로 전시합니다. 운영자는 최대 노출 개수·정렬·대체안(폴백)만 정해요. <b>여기선 기본값만</b> 두고, 실제 방식은 코너를 배치할 때 빌더에서 고릅니다.
          </p>
          {/* 각 수급 방식 설명 (SSOT: REC_SOURCE_INFO) */}
          <dl className="space-y-1 rounded-md bg-violet-50/50 p-2.5 text-[10px] leading-relaxed">
            {REC_SOURCE_METHODS.map((k) => (
              <div key={k} className="flex gap-1.5">
                <dt className="w-24 shrink-0 font-semibold text-violet-700">{k} <span className="font-normal text-violet-400">· {REC_SOURCE_INFO[k].tag}</span></dt>
                <dd className="min-w-0 flex-1 text-muted-foreground">{REC_SOURCE_INFO[k].how}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      )}

      {/* 노출·구성 기본값 (빌더 상속) — 정렬/CTA 기본값. 노출 개수는 빌더에서만 조정(타입에 두지 않음). */}
      {isListType && (
        <section className="overflow-hidden rounded-md border">
          <div className="flex items-center gap-2 border-b bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700">
            노출·구성 기본값
            <span className="font-normal text-slate-400">빌더에서 이 유형으로 코너를 만들 때 기본값 · 코너별로 조정 가능</span>
          </div>
          <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">정렬 기준 기본값</label>
              <select name="defaultSortStrategy" defaultValue={row.defaultSortStrategy ?? ''} className="h-8 w-full rounded-md border bg-background px-2 text-xs">
                <option value="">미지정(수동)</option>
                {PRODUCT_SORT_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            {eff('useMoreButton') && (
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">CTA 노출 기본</label>
                <label className="flex h-8 items-center gap-1.5 rounded-md border bg-background px-2 text-xs">
                  <input type="checkbox" checked={moreDefault} onChange={(e) => setMoreDefault(e.target.checked)} className="accent-indigo-600" />
                  기본 노출
                </label>
                <input type="hidden" name="defaultMoreButton" value={moreDefault ? '1' : ''} />
              </div>
            )}
            {eff('useMoreButton') && moreDefault && (
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] text-muted-foreground">CTA 기본 문구</label>
                <Input name="defaultMoreButtonLabel" defaultValue={row.defaultMoreButtonLabel ?? ''} placeholder="예: 전체보기 / 더보기 / 바로가기 (링크는 코너별로 입력)" className="h-8 text-xs" />
              </div>
            )}
          </div>
        </section>
      )}

      {/* (제거됨) 고객정보 연동 필드 — 코너 유형 단계에선 실제 바인딩을 하지 않아 삭제.
          실제 고객정보 연동은 빌더의 아톰 단계('고객정보 가져오기' = @cvm:key)에서 처리한다. */}

      {/* FO 사용자 설정 — 선택형/업무 진입형(메뉴·탭) 유형에서. 고객이 직접 편집 + 노출 개수 범위 */}
      {(base === '업무 진입형' || compValid === '선택형') && (
        <section className="overflow-hidden rounded-md border">
          <div className="flex items-center gap-1.5 border-b bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700">
            <Info className="h-3.5 w-3.5 text-sky-500" /> FO 사용자 설정 (고객 커스터마이즈)
          </div>
          <div className="space-y-2.5 p-3">
            <label className="flex items-center justify-between gap-2">
              <span className="flex flex-col">
                <span className="text-xs font-medium text-foreground">사용자 설정 가능</span>
                <span className="text-[10px] text-muted-foreground">켜면 고객(FO)이 이 메뉴를 직접 편집(추가·삭제·순서)할 수 있어요. 고정 항목은 유지. 이 값은 빌더에서 코너별로 이어받아요.</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={userCustom}
                onClick={() => setUserCustom((v) => !v)}
                className={cn('relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors', userCustom ? 'bg-sky-500' : 'bg-slate-300')}
              >
                <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform', userCustom ? 'translate-x-4' : 'translate-x-0.5')} />
              </button>
            </label>
            <input type="hidden" name="userCustomizable" value={userCustom ? '1' : ''} />
            {userCustom && (
              <div className="grid grid-cols-2 gap-2 border-t pt-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">고객 노출 최소 개수</label>
                  <Input name="userMinItems" type="number" min={0} value={userMin} onChange={(e) => setUserMin(e.target.value)} placeholder="예: 3 (고정 포함)" className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">고객 노출 최대 개수</label>
                  <Input name="userMaxItems" type="number" min={0} value={userMax} onChange={(e) => setUserMax(e.target.value)} placeholder="예: 8" className="h-8 text-xs" />
                </div>
                <p className="col-span-2 text-[10px] text-muted-foreground">고객은 최소~최대 범위 안에서 항목을 노출/숨김할 수 있어요. 고정(🔒) 항목은 항상 포함.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 유형 샘플 이미지 — 로컬에서 직접 등록 */}
      <section className="overflow-hidden rounded-md border">
        <div className="border-b bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700">유형 샘플 이미지</div>
        <div className="p-3">
          <input type="hidden" name="sampleImageUrl" value={sampleImage} />
          <input ref={sampleFileRef} type="file" accept="image/*" className="hidden" onChange={onSampleFile} />
          {sampleImage ? (
            <div className="flex flex-wrap items-start gap-3">
              {sampleImage.split('\n').filter(Boolean).map((src, i) => (
                <a key={i} href={src} target="_blank" rel="noreferrer" title="원본 보기">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`유형 샘플 ${i + 1}`} className="h-28 w-44 rounded-xl border object-cover object-top shadow-sm hover:ring-2 hover:ring-primary/40 [filter:contrast(1.08)_saturate(1.15)]" />
                </a>
              ))}
              <div className="flex flex-col gap-1.5">
                <Button type="button" size="sm" variant="secondary" onClick={() => sampleFileRef.current?.click()}>
                  이미지 변경
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setSampleImage('')}>
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> 제거
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => sampleFileRef.current?.click()}
              className="flex h-24 w-40 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-slate-300 text-xs text-muted-foreground hover:border-primary/50 hover:bg-accent"
            >
              <Plus className="h-5 w-5" />
              이미지 등록
            </button>
          )}
          <p className="mt-1.5 text-[10px] text-muted-foreground">홈 화면에서 해당 유형의 코너를 캡처한 샘플이에요. 같은 유형이 여러 곳에 있으면 여러 장이 표시됩니다. 이미지 변경 시 직접 등록한 1장으로 교체돼요.</p>
        </div>
      </section>

      <div className="flex justify-end gap-2 border-t pt-3">
        <Button type="button" variant="secondary" size="sm" onClick={onClose}>
          취소
        </Button>
        <Button type="submit" size="sm">
          <Check className="mr-1 h-4 w-4" /> {isNew ? '등록' : '저장'}
        </Button>
      </div>
    </form>
  );
}

/** BO 폼 행: 라벨 셀 + 값 셀 (셀 경계). flat=경계/패딩 없는 단일 행 */
// 운영 채널/플랫폼처럼 '전체'가 마스터(select-all)인 다중 체크박스 그룹.
//  - '전체' 체크 → 하위 옵션 모두 체크 / 해제 → 모두 해제
//  - 하위를 모두 체크하면 '전체'도 자동 체크, 일부만이면 indeterminate
//  - 폼 제출값(name)은 하위 실제 옵션만 (저장값에 '전체' 리터럴이 있으면 전체 선택으로 해석)
function OpsCheckGroup({ name, options, initial }: { name: string; options: readonly string[]; initial: string[] }) {
  const reals = options.filter((o) => o !== '전체');
  const [sel, setSel] = useState<Set<string>>(
    () => new Set(initial.includes('전체') ? reals : initial.filter((o) => reals.includes(o))),
  );
  const allOn = reals.every((r) => sel.has(r));
  const someOn = reals.some((r) => sel.has(r));
  const allRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = someOn && !allOn;
  }, [someOn, allOn]);
  const toggleAll = () => setSel(allOn ? new Set() : new Set(reals));
  const toggle = (r: string) =>
    setSel((prev) => {
      const n = new Set(prev);
      if (n.has(r)) n.delete(r);
      else n.add(r);
      return n;
    });
  return (
    <div className="flex flex-wrap gap-3 py-0.5">
      <label className="flex items-center gap-1.5 text-xs">
        <input ref={allRef} type="checkbox" checked={allOn} onChange={toggleAll} className="accent-indigo-600" /> 전체
      </label>
      {reals.map((r) => (
        <label key={r} className="flex items-center gap-1.5 text-xs">
          <input type="checkbox" name={name} value={r} checked={sel.has(r)} onChange={() => toggle(r)} className="accent-indigo-600" /> {r}
        </label>
      ))}
    </div>
  );
}

function TRow({
  label,
  required,
  hint,
  flat,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  flat?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('grid grid-cols-[120px_1fr] items-center gap-3', !flat && 'border-b px-3 py-2.5')}>
      <label className="text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-rose-500">*</span>}
        {hint && <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground/70">{hint}</span>}
      </label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** 유형 상세 선택 시 만들어질 코너 레이아웃 미리보기 (스켈레톤 목업) */
export function TypeDetailPreview({ base, component, detail, bigBanner = false, useTitle = true, useSub = true, useMore, compact = false }: { base: string; component?: string; detail: string; bigBanner?: boolean; useTitle?: boolean; useSub?: boolean; useMore?: boolean; compact?: boolean }) {
  // 스켈레톤(회색 막대) 대신 '위치에 이름'을 적는 라벨 슬롯 — Title / Description / img / Badge / Price …
  const Slot = ({ label, className = '' }: { label: string; className?: string }) => (
    <div className={cn('flex items-center justify-center overflow-hidden rounded border border-dashed border-slate-400 bg-slate-100 px-1 text-center text-[9px] font-semibold leading-none text-slate-600', className)}>
      {label}
    </div>
  );
  // 가로형(2.5배열) 카드 비율 미리보기 뷰 — 1:1(상품)/3:4(포스터)/4:3(와이드) 전환
  const [shapeView, setShapeView] = useState<'1:1' | '3:4' | '4:3'>('3:4');
  const d = detail ?? '';
  const c = component ?? '';
  const has = (...keys: string[]) => keys.some((k) => d.includes(k));
  // 본문(body)은 ② 구성 컴포넌트 유형 기준으로 그린다. component 없으면 코너 유형(base)로 폴백.
  const isBanner = c === '배너형' || (!c && base === '배너형');
  const isProduct = c === '상품형' || (!c && base === '상품형');

  let body: React.ReactNode;
  if (!d && !base) {
    body = <div className="flex h-24 items-center justify-center text-[11px] text-muted-foreground">유형/상세를 선택하면 미리보기가 표시됩니다.</div>;
  } else if (isBanner || has('빅배너', '이미지형', '팝업', '띠', '텍스트배너')) {
    // 배너 카드: Title + Description(좌) + 우측 동그란 이미지 (띠/텍스트배너는 얇은 바)
    body = has('띠', '텍스트배너') ? (
      <Slot label="텍스트 배너" className="h-8 w-full" />
    ) : (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex-1 space-y-1.5">
          <Slot label="텍스트" className="h-4 w-3/4 justify-start" />
          <Slot label="설명" className="h-3 w-1/2 justify-start" />
        </div>
        <Slot label="이미지" className="h-12 w-12 shrink-0 rounded-full" />
      </div>
    );
  } else if (isProduct && has('단일 상품')) {
    body = (
      <div className="flex gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
        <div className="flex-1 space-y-1.5">
          <Slot label="텍스트" className="h-3 w-1/3 justify-start" />
          <Slot label="텍스트" className="h-4 w-3/4 justify-start" />
          <Slot label="설명" className="h-3 w-1/2 justify-start" />
        </div>
        <Slot label="이미지" className="h-16 w-16 shrink-0" />
      </div>
    );
  } else if (isProduct && has('세로') && !has('가로', '2.5', '단일강조')) {
    // 상품형 · 세로형 (+카테고리탭 변형) → 세로 리스트 (샘플: 0 Week). 빅배너는 아래 공통 프레임에서 상단에 얹음.
    body = (
      <div className="space-y-1.5">
        {has('카테고리') && (
          <div className="flex gap-1">
            {['탭', '탭', '탭'].map((t, i) => (
              <Slot key={i} label={t} className="h-6 w-14 rounded-full" />
            ))}
          </div>
        )}
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1.5">
            <Slot label="이미지" className="h-10 w-10 shrink-0" />
            <div className="flex-1 space-y-1">
              <Slot label="텍스트" className="h-3 w-3/4 justify-start" />
              <Slot label="설명" className="h-3 w-1/3 justify-start" />
            </div>
          </div>
        ))}
      </div>
    );
  } else if (has('2.5')) {
    // 가로형(2.5배열) — 카드 비율 1:1(상품)/3:4(포스터)/4:3(와이드)을 뷰 토글로 전환해 미리본다(빌더에서 코너별 선택).
    const ratioCls = shapeView === '1:1' ? 'aspect-square' : shapeView === '4:3' ? 'aspect-[4/3]' : 'aspect-[3/4]';
    const cardW = shapeView === '4:3' ? 'w-[52%]' : 'w-[42%]';
    body = (
      <div className="space-y-2">
        {!compact && (
          <div className="flex items-center gap-1">
            <span className="mr-1 text-[10px] font-medium text-slate-400">카드 비율</span>
            {(['1:1', '3:4', '4:3'] as const).map((sh) => (
              <button
                key={sh}
                type="button"
                onClick={() => setShapeView(sh)}
                className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold transition', shapeView === sh ? 'border-primary bg-primary text-primary-foreground' : 'border-slate-300 text-slate-500 hover:bg-slate-100')}
              >
                {sh}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <div key={i} className={cn('shrink-0 space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-1.5', cardW)}>
              <Slot label="이미지" className={cn('w-full', ratioCls)} />
              <Slot label="텍스트" className="h-3 w-full justify-start" />
              <Slot label="설명" className="h-3 w-2/3 justify-start" />
            </div>
          ))}
        </div>
        {!compact && <p className="text-[9px] leading-relaxed text-slate-400">같은 가로형(2.5배열)이라도 콘텐츠에 따라 비율이 달라요(1:1 상품·3:4 포스터·4:3 와이드). 실제 비율은 빌더에서 코너별로 선택합니다.</p>}
      </div>
    );
  } else if (has('단일강조', '1.5')) {
    // 단일강조(1.5배열) — 큰 카드 1.5장(하나를 크게 강조 + 다음 카드 살짝). 2.5배열보다 카드가 크다.
    body = (
      <div className="space-y-1">
        <div className="flex gap-2 overflow-hidden">
          {[0, 1].map((i) => (
            <div key={i} className="w-[66%] shrink-0 space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2">
              <Slot label="이미지" className="aspect-[16/10] w-full" />
              <Slot label="텍스트" className="h-4 w-3/4 justify-start" />
              <Slot label="설명" className="h-3 w-1/2 justify-start" />
            </div>
          ))}
        </div>
        <p className="text-[9px] leading-relaxed text-slate-400">단일강조(1.5배열) — 큰 카드 하나를 강조하고 다음 카드가 살짝 보입니다. (2.5배열은 작은 카드 캐러셀)</p>
      </div>
    );
  } else if (isProduct || has('가로')) {
    body = (
      <div className="flex gap-2 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-[42%] shrink-0 space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-1.5">
            {/* 상품 이미지 = 세로로 긴 카드 이미지 영역 */}
            <Slot label="이미지" className="h-28 w-full" />
            <Slot label="텍스트" className="h-3 w-full justify-start" />
            <Slot label="설명" className="h-3 w-2/3 justify-start" />
          </div>
        ))}
      </div>
    );
  } else if (has('바코드')) {
    body = (
      <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <Slot label="텍스트" className="h-3 w-1/4 justify-start" />
        <Slot label="바코드" className="h-12 w-full" />
        <div className="flex justify-between gap-2">
          <Slot label="설명" className="h-3 w-1/2 justify-start" />
          <Slot label="배지" className="h-3 w-12" />
        </div>
      </div>
    );
  } else if (has('프로필')) {
    // 고정·필수 노출형·정보형·프로필형: [원형 사진][이름·번호] … [CTA] (my-profile.png 기준)
    body = (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <Slot label="이미지" className="h-9 w-9 shrink-0 rounded-full" />
        <div className="flex-1 space-y-1">
          <Slot label="텍스트" className="h-3 w-1/2 justify-start" />
          <Slot label="설명" className="h-3 w-2/3 justify-start" />
        </div>
        <Slot label="CTA" className="h-6 w-20 rounded-full" />
      </div>
    );
  } else if (base === '상태 안내형' || has('아이콘', '금액형', '사용량형', '요약')) {
    // 마이.png 상태 카드(아이콘/이미지형): 값(Value) + 상태(Status) + 라벨(Label) + 우측 icon/이미지
    body = (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Slot label="설명" className="h-5 w-1/2 justify-start" />
            <Slot label="배지" className="h-4 w-2/5" />
          </div>
          <Slot label="텍스트" className="h-3 w-2/3 justify-start" />
        </div>
        <Slot label="아이콘" className="h-10 w-10 shrink-0 rounded-full" />
      </div>
    );
  } else if (base === '업무 진입형' && has('메뉴')) {
    body = <div className="space-y-1.5">{[0, 1, 2, 3].map((i) => <Slot key={i} label="텍스트" className="h-6 w-full justify-start" />)}</div>;
  } else if (has('탭', '고정형')) {
    body = <div className="flex flex-wrap gap-1.5">{['탭', '탭', '탭'].map((t, i) => <Slot key={i} label={t} className="h-7 w-16 rounded-full" />)}</div>;
  } else if (has('그리드', '격자')) {
    body = (
      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-1.5">
            <Slot label="이미지" className="h-10 w-full" />
            <Slot label="텍스트" className="h-3 w-3/4 justify-start" />
          </div>
        ))}
      </div>
    );
  } else if (has('묶음')) {
    body = (
      <div className="space-y-1.5">
        <div className="flex gap-1">
          <Slot label="탭" className="h-5 w-12 rounded-full" />
          <Slot label="탭" className="h-5 w-12 rounded-full" />
        </div>
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Slot label="이미지" className="h-7 w-7 shrink-0 rounded-full" />
            <Slot label="텍스트" className="h-3 flex-1 justify-start" />
          </div>
        ))}
      </div>
    );
  } else {
    // 리스트/카드 기본: 아이콘(img) + Title + Description 행
    body = (
      <div className="space-y-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1.5">
            <Slot label="이미지" className="h-9 w-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1">
              <Slot label="텍스트" className="h-3 w-3/4 justify-start" />
              <Slot label="설명" className="h-3 w-1/2 justify-start" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 공통 프레임: 코너 타이틀/서브타이틀 헤더 + 본문 (+ 더보기)
  // 더보기 = 세부 항목 토글(useMore)로 제어. 미지정(모달 등)이면 상품형 기본 노출.
  const showMore = useMore ?? isProduct;
  // 상단 탭바(카테고리 탭/고정형 탭)·아이콘형 상태카드는 코너 타이틀·서브타이틀이 없다 → 헤더 슬롯 생략
  const noHeader = isBanner || has('카테고리 탭') || has('고정형(탭)') || has('아이콘형', '이미지형', '팝업', '띠', '텍스트배너');
  // 세부 항목 토글(타이틀/서브타이틀 사용여부)에 따라 헤더 슬롯을 켜고 끈다
  const showHeader = !noHeader && (useTitle || useSub);
  return (
    <div className={compact ? 'flex h-full flex-col' : 'rounded-md border bg-slate-50 p-3'}>
      {!compact && (
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          미리보기 · {base}
          {c && c !== base ? ` › ${componentLabel(c)}` : ''}
          {detail ? ` › ${layoutLabel(detail)}` : ''}
          {bigBanner ? ' · 빅배너' : ''}
        </p>
      )}
      <div className={cn('w-full rounded-lg border bg-white', compact ? 'flex-1 p-2.5' : 'min-h-[340px] p-5 shadow-sm')}>
        <div className="space-y-3">
          {showHeader && (
            <div className="space-y-1">
              {useTitle && <Slot label="타이틀" className="h-6 w-3/5 justify-start text-[10px] font-semibold" />}
              {useSub && <Slot label="서브타이틀" className="h-4 w-2/5 justify-start" />}
            </div>
          )}
          {/* ④ 빅배너 구분자 ON → 배열과 무관하게 상단 빅배너를 얹는다 */}
          {bigBanner && !isBanner && <Slot label="이미지 (빅배너)" className="h-20 w-full" />}
          {body}
          {showMore && <div className="mx-auto flex h-7 w-28 items-center justify-center rounded-full border border-dashed border-slate-300 text-[10px] text-slate-400">CTA</div>}
        </div>
      </div>
    </div>
  );
}
