'use client';

import { useMemo, useState } from 'react';
import { X, Smartphone, Monitor, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  evaluateMenus, diffOf, toApprovedView, orderTree, SEGMENTS, VERDICT_LABEL,
  type MenuNode, type PreviewCond, type Verdict, type VerdictResult,
} from './mock-menus';

/**
 * SB-DSP-OPR1-001-PV1 전체 메뉴 미리보기.
 * 미승인 변경은 미리보기에서만 확인할 수 있다 (PI-DSP-MNU-003).
 */
export function PreviewOverlay({
  nodes,
  onClose,
  cvmFail,
}: {
  nodes: MenuNode[];
  onClose: () => void;
  cvmFail: boolean;
}) {
  const [base, setBase] = useState<'APPROVED' | 'WORKING' | 'COMPARE'>('WORKING');
  const [cond, setCond] = useState<PreviewCond>({ login: 'MEMBER', auth: 'GRANTED', segment: '전체', channel: 'APP' });
  const [device, setDevice] = useState<'Mobile' | 'PC'>('Mobile');
  const [onlyBlocked, setOnlyBlocked] = useState(false);

  // CVM 판정 실패 시 개인화 조건을 확정하지 않고 승인본으로 대체한다 (PI-DSP-PER-002)
  const effBase = cvmFail ? 'APPROVED' : base;

  const working = useMemo(() => evaluateMenus(nodes, cond, 'WORKING'), [nodes, cond]);
  const approved = useMemo(() => evaluateMenus(nodes, cond, 'APPROVED'), [nodes, cond]);
  const active = effBase === 'APPROVED' ? approved : working;

  const shown = active.filter((v) => v.result === 'SHOW');
  const blockedPublish = working.filter((v) => v.result === 'BLOCK_PUBLISH');
  const blockedReview = working.filter((v) => v.result === 'BLOCK_REVIEW');
  const rows = onlyBlocked ? active.filter((v) => v.result.startsWith('BLOCK')) : active;

  const changed = nodes.filter((n) => diffOf(n).length > 0);
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex h-full max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-card shadow-2xl">
        {/* 1 헤더 */}
        <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3">
          <span className="text-sm font-bold">전체 메뉴 미리보기</span>
          <Badge variant="outline">SB-DSP-OPR1-001-PV1</Badge>
          <span className="text-xs text-muted-foreground">
            기준 {effBase === 'APPROVED' ? '승인본' : effBase === 'WORKING' ? '작업본' : '비교'} · 승인본 대비 변경 {changed.length}건
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(location.href + '#preview')}>
              링크 복사
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 2 미승인 안내 (PI-DSP-MNU-003) */}
        {effBase !== 'APPROVED' && (
          <div className="mx-4 mt-3 rounded-md border border-primary/30 bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground">
            미승인 변경이 포함된 미리보기입니다. 이 결과는 채널(FO)에 반영되지 않습니다. · PI-DSP-MNU-003
          </div>
        )}
        {cvmFail && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-md border border-destructive/30 bg-badge-bg-negative px-3 py-2 text-xs font-semibold text-badge-text-negative">
            <AlertTriangle className="h-3.5 w-3.5" />
            CVM 판정값을 받지 못해 개인화 조건을 확정하지 않았습니다. 승인본(기본 전시)으로 대체 표시합니다. · PI-DSP-PER-002
          </div>
        )}

        {/* 3~6 컨트롤 */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <div className="flex overflow-hidden rounded-md border">
            {(['APPROVED', 'WORKING', 'COMPARE'] as const).map((b) => (
              <button
                key={b}
                disabled={cvmFail}
                onClick={() => setBase(b)}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40',
                  base === b ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted',
                )}
              >
                {b === 'APPROVED' ? '승인본' : b === 'WORKING' ? '작업본' : '비교'}
              </button>
            ))}
          </div>
          <Select
            className="h-8 w-auto text-xs"
            value={cond.login}
            onChange={(e) => setCond({ ...cond, login: e.target.value as PreviewCond['login'] })}
          >
            <option value="GUEST">로그인 : 비로그인</option>
            <option value="MEMBER">로그인 : 로그인</option>
          </Select>
          <Select
            className="h-8 w-auto text-xs"
            value={cond.auth}
            onChange={(e) => setCond({ ...cond, auth: e.target.value as PreviewCond['auth'] })}
          >
            <option value="GRANTED">권한 : 보유</option>
            <option value="NONE">권한 : 없음</option>
          </Select>
          <Select
            className="h-8 w-auto text-xs"
            value={cond.segment}
            onChange={(e) => setCond({ ...cond, segment: e.target.value })}
          >
            {SEGMENTS.map((s) => (
              <option key={s} value={s}>
                고객군 : {s}
              </option>
            ))}
          </Select>
          <Select
            className="h-8 w-auto text-xs"
            value={cond.channel}
            onChange={(e) => setCond({ ...cond, channel: e.target.value as 'PC' | 'APP' })}
          >
            <option value="APP">채널 : APP</option>
            <option value="PC">채널 : PC</option>
          </Select>
          <div className="ml-auto flex overflow-hidden rounded-md border">
            {(['Mobile', 'PC'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDevice(d)}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold',
                  device === d ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted',
                )}
              >
                {d === 'Mobile' ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* 10 차단 요약 */}
        {(blockedPublish.length > 0 || blockedReview.length > 0) && (
          <div className="mx-4 mb-3 rounded-md border border-destructive/30 bg-badge-bg-negative px-3 py-2 text-xs font-semibold text-badge-text-negative">
            게시 차단 {blockedPublish.length}건 · 검수 차단 {blockedReview.length}건 — 아래 판정 결과에서 대상 메뉴를 확인하세요.
          </div>
        )}

        {/* 7~8 본문 */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden border-t md:grid-cols-[auto_minmax(0,1fr)]">
          <div className="flex justify-center gap-4 overflow-auto bg-muted/40 p-5">
            {effBase === 'COMPARE' ? (
              <>
                <Frame title="승인본 (현재 FO)" device={device} verdicts={approved} nodeById={nodeById} showDiff={false} />
                <Frame title="작업본 (미승인 포함)" device={device} verdicts={working} nodeById={nodeById} showDiff />
              </>
            ) : (
              <Frame
                title={effBase === 'APPROVED' ? '승인본 (현재 FO)' : '작업본 (미승인 포함)'}
                device={device}
                verdicts={active}
                nodeById={nodeById}
                showDiff={effBase === 'WORKING'}
              />
            )}
          </div>

          <div className="min-h-0 overflow-auto p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm font-bold">노출 판정 결과</span>
              <span className="text-xs text-muted-foreground">노출 {shown.length}건 / 전체 {active.length}건</span>
              <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                <input type="checkbox" checked={onlyBlocked} onChange={(e) => setOnlyBlocked(e.target.checked)} />
                차단 항목만 보기
              </label>
            </div>
            <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-muted/40 px-2.5 py-1.5 text-[10px] text-muted-foreground">
              {(['SHOW', 'HIDE', 'BLOCK_PUBLISH', 'BLOCK_REVIEW'] as VerdictResult[]).map((r) => (
                <span key={r} className="inline-flex items-center gap-1">
                  <span className={cn('h-2 w-2 rounded-full ring-1 ring-inset', VERDICT_TONE[r])} />{VERDICT_LABEL[r]}
                </span>
              ))}
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/60 text-left text-muted-foreground">
                  <th className="px-2 py-1.5 font-semibold">메뉴</th>
                  <th className="px-2 py-1.5 font-semibold">결과</th>
                  <th className="px-2 py-1.5 font-semibold">사유</th>
                  <th className="px-2 py-1.5 font-semibold">근거</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => (
                  <tr key={v.id} className="border-b last:border-0">
                    <td className="px-2 py-1.5" style={{ paddingLeft: 8 + (v.depth - 1) * 12 }}>
                      {v.name}
                    </td>
                    <td className="px-2 py-1.5">
                      <VerdictChip result={v.result} />
                    </td>
                    <td className="px-2 py-1.5 text-muted-foreground">{v.reason}</td>
                    <td className="px-2 py-1.5 font-mono text-[10px] text-muted-foreground">{v.policy}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">
                      표시할 판정 결과가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t bg-muted/40 px-4 py-3">
          <Button size="sm" variant="outline" onClick={onClose}>
            미리보기 종료
          </Button>
          <span className="ml-auto text-xs text-muted-foreground">
            미리보기 생성 · 유효 30분 · 조회자 P213980 · 열람 이력 저장 (PI-DSP-AUD-002)
          </span>
        </div>
      </div>
    </div>
  );
}

const VERDICT_TONE: Record<VerdictResult, string> = {
  SHOW: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  HIDE: 'bg-slate-100 text-slate-500 ring-slate-200',
  BLOCK_PUBLISH: 'bg-rose-50 text-rose-700 ring-rose-200',
  BLOCK_REVIEW: 'bg-amber-50 text-amber-700 ring-amber-200',
};
function VerdictChip({ result }: { result: VerdictResult }) {
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', VERDICT_TONE[result])}>{VERDICT_LABEL[result]}</span>;
}

const DIFF_TONE: Record<string, string> = {
  추가: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  순서변경: 'bg-sky-50 text-sky-600 ring-sky-100',
  명칭변경: 'bg-violet-50 text-violet-600 ring-violet-100',
  노출변경: 'bg-amber-50 text-amber-700 ring-amber-100',
  연결변경: 'bg-amber-50 text-amber-700 ring-amber-100',
  조건변경: 'bg-amber-50 text-amber-700 ring-amber-100',
};
function DiffBadges({ id, nodeById, showDiff }: { id: string; nodeById: Map<string, MenuNode>; showDiff: boolean }) {
  const n = nodeById.get(id);
  const diffs = showDiff && n ? diffOf(n) : [];
  return (
    <>
      {diffs.map((d) => (
        <span key={d} className={cn('inline-flex shrink-0 items-center rounded-md px-1 py-px text-[9px] font-medium ring-1 ring-inset', DIFF_TONE[d] ?? 'bg-slate-50 text-slate-500 ring-slate-100')}>
          {d}
        </span>
      ))}
    </>
  );
}

function Frame({
  title,
  device,
  verdicts,
  nodeById,
  showDiff,
}: {
  title: string;
  device: 'Mobile' | 'PC';
  verdicts: Verdict[];
  nodeById: Map<string, MenuNode>;
  showDiff: boolean;
}) {
  const shownIds = new Set(verdicts.filter((v) => v.result === 'SHOW').map((v) => v.id));
  const shown = verdicts.filter((v) => v.result === 'SHOW');
  // 노출 확정된 노드만으로 계층 재구성
  const kidsOf = (pid: string | null) =>
    shown
      .filter((v) => (nodeById.get(v.id)?.parentId ?? null) === pid && shownIds.has(v.id))
      .map((v) => nodeById.get(v.id)!)
      .sort((a, b) => a.order - b.order);
  const empty = shown.length === 0;

  return (
    <div className="shrink-0">
      <p className="mb-2 text-center text-[11px] font-semibold text-muted-foreground">{title}</p>
      {device === 'Mobile' ? (
        /* 앱(모바일) — 전체메뉴 세로 아코디언 */
        <div className="relative h-[460px] w-[252px] overflow-hidden rounded-[30px] border-[6px] border-neutral-900 bg-card shadow-xl">
          {/* 노치 */}
          <div className="absolute left-1/2 top-0 z-10 h-4 w-24 -translate-x-1/2 rounded-b-xl bg-neutral-900" />
          <div className="flex items-center justify-between border-b bg-muted/40 px-3 pb-2.5 pt-4">
            <span className="text-sm font-bold">전체 메뉴</span>
            <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="overflow-auto" style={{ maxHeight: 400 }}>
            {empty ? (
              <EmptyHint />
            ) : (
              kidsOf(null).map((d1) => (
                <div key={d1.id} className="border-b last:border-0">
                  <div className="flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-bold">
                    <span className="truncate">{d1.name}</span>
                    <DiffBadges id={d1.id} nodeById={nodeById} showDiff={showDiff} />
                  </div>
                  {kidsOf(d1.id).map((d2) => (
                    <div key={d2.id}>
                      <div className="flex items-center gap-1.5 bg-muted/30 px-3 py-2 pl-6 text-xs">
                        <span className="truncate">{d2.name}</span>
                        <DiffBadges id={d2.id} nodeById={nodeById} showDiff={showDiff} />
                      </div>
                      {kidsOf(d2.id).map((d3) => (
                        <div key={d3.id} className="flex items-center gap-1.5 px-3 py-1.5 pl-10 text-[11px] text-muted-foreground">
                          <span className="truncate">{d3.name}</span>
                          <DiffBadges id={d3.id} nodeById={nodeById} showDiff={showDiff} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* 웹(PC) — 브라우저 크롬 + 상단 GNB + 하위 메가메뉴 컬럼 */
        <div className="h-[460px] w-[560px] overflow-hidden rounded-xl border border-neutral-300 bg-card shadow-xl">
          {/* 브라우저 크롬 */}
          <div className="flex items-center gap-2 border-b bg-neutral-100 px-3 py-2">
            <span className="flex gap-1"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /></span>
            <span className="ml-2 flex-1 truncate rounded-md bg-white px-2.5 py-1 text-[10px] text-muted-foreground ring-1 ring-neutral-200">https://www.tworld.co.kr</span>
          </div>
          <div className="flex items-center gap-1 border-b bg-muted/40 px-3 py-2">
            <Monitor className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
            {empty ? (
              <span className="text-xs text-muted-foreground">노출 메뉴 없음</span>
            ) : (
              kidsOf(null).map((d1) => (
                <span key={d1.id} className="flex items-center gap-1 rounded px-2.5 py-1 text-[13px] font-bold hover:bg-background">
                  {d1.name}
                  <DiffBadges id={d1.id} nodeById={nodeById} showDiff={showDiff} />
                </span>
              ))
            )}
          </div>
          <div className="overflow-auto p-3" style={{ maxHeight: 380 }}>
            {empty ? (
              <EmptyHint />
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {kidsOf(null).map((d1) => (
                  <div key={d1.id} className="rounded-md border bg-muted/20 p-2.5">
                    <div className="mb-1.5 flex items-center gap-1.5 border-b pb-1 text-xs font-bold">
                      <span className="truncate">{d1.name}</span>
                      <DiffBadges id={d1.id} nodeById={nodeById} showDiff={showDiff} />
                    </div>
                    {kidsOf(d1.id).length === 0 && <p className="text-[10px] text-muted-foreground">하위 없음</p>}
                    {kidsOf(d1.id).map((d2) => (
                      <div key={d2.id} className="mb-1">
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-foreground/85">
                          <span className="truncate">{d2.name}</span>
                          <DiffBadges id={d2.id} nodeById={nodeById} showDiff={showDiff} />
                        </div>
                        {kidsOf(d2.id).map((d3) => (
                          <div key={d3.id} className="flex items-center gap-1 pl-2 text-[10px] text-muted-foreground">
                            <span className="truncate">· {d3.name}</span>
                            <DiffBadges id={d3.id} nodeById={nodeById} showDiff={showDiff} />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyHint() {
  return (
    <div className="px-4 py-16 text-center text-xs text-muted-foreground">
      이 조건에서는<br />노출되는 메뉴가 없습니다.<br /><br />조건을 변경해 다시 확인하세요.
    </div>
  );
}

/** 미리보기에서만 쓰는 헬퍼 — 승인본 노드 존재 여부 확인용 */
export const hasApproved = (n: MenuNode) => toApprovedView(n) !== null;
export const orderedTree = orderTree;
