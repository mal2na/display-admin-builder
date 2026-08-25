'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Home, PencilRuler, ImageIcon, Search, X, ChevronLeft, Plus, Globe, FolderOpen, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { updateProgramInfo } from '../../actions';
import { PROGRAM_KINDS, typesForKind } from '@/lib/event-templates';

export type PromotionInfo = {
  id: string;
  name: string;
  programKind: string;
  programType: string;
  purpose: string | null;
  partnerBrand: string | null;
  thumbnail: string | null;
  thumbnailAlt: string | null;
  startAt: string | null;
  endAt: string | null;
  displayStartAt: string | null;
  displayEndAt: string | null;
  displayNoEndDate: boolean;
  displayState: string;
  commentUse: boolean;
  searchExposed: boolean;
  searchTags: string | null;
  metaKeywords: string | null;
  metaDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogSiteName: string | null;
  ogImage: string | null;
  reward: string | null;
  target: string | null;
  usageSteps: string | null; // JSON [{title, desc}]
  notice: string | null;
  contact: string | null;
  ctaLabel: string | null; // 응모형 응모 버튼명
  ctaUrl: string | null; // 응모형 응모 버튼 링크
  entryConfig: string | null; // 응모형 응모/당첨/리워드 설정(JSON)
};

export type HistoryRow = { at: string; actor: string; reason: string; result: string };
type Step = { title: string; desc: string };

// 응모형 응모/당첨/리워드 설정
// rid = 드래그앤드롭 정렬용 클라이언트 전용 안정 id (저장 시 제거). 지급 우선순위는 행 순서로 자동 결정.
type RewardRow = { rid?: string; priority: string; type: string; typeDetail: string; displayName: string; winnerCount: string; payTiming: '실시간' | '사후' };
let _ridSeq = 0;
const newRid = () => `r${Date.now().toString(36)}${(_ridSeq++).toString(36)}`;
type EntryConfig = {
  entryMethod: '수동' | '자동';
  winMethod: '전체' | '선착순' | '추첨';
  winTiming: '실시간' | '사후';
  winNotice: '선택 안함' | '일반 당첨 안내';
  scaleMode: '전체' | '직접 입력';
  scaleCount: string;
  joinCondition: string;
  rewards: RewardRow[];
};
const REWARD_TYPES = ['포인트', '쿠폰', '상품', '기프티콘', '데이터', '기타'];
const DEFAULT_ENTRY: EntryConfig = {
  entryMethod: '수동', winMethod: '추첨', winTiming: '사후', winNotice: '선택 안함',
  scaleMode: '전체', scaleCount: '', joinCondition: '',
  rewards: [{ priority: '1', type: '', typeDetail: '', displayName: '', winnerCount: '', payTiming: '사후' }],
};
function parseEntry(s: string | null): EntryConfig {
  try {
    const o = JSON.parse(s ?? '') as Partial<EntryConfig>;
    const rewards = Array.isArray(o?.rewards) && o.rewards.length ? (o.rewards as RewardRow[]) : DEFAULT_ENTRY.rewards;
    // 정렬용 rid 부여 (없으면 생성)
    return { ...DEFAULT_ENTRY, ...o, rewards: rewards.map((r) => ({ ...r, rid: r.rid ?? newRid() })) };
  } catch { return { ...DEFAULT_ENTRY, rewards: DEFAULT_ENTRY.rewards.map((r) => ({ ...r, rid: newRid() })) }; }
}
// 저장용 정규화: 지급 우선순위 = 행 순서(1..N), 정렬용 rid 제거
function normalizeEntry(e: EntryConfig): EntryConfig {
  return { ...e, rewards: e.rewards.map(({ rid: _rid, ...r }, i) => ({ ...r, priority: String(i + 1) })) };
}

const fmtD = (s: string) => (s ? s.slice(0, 10).replace(/-/g, '.') : '');

/** SB-EVT-027 프로모션 상세(안내형) — 좌: 라이브 미리보기(기본 정보로 채워짐) / 우: 입력 폼. 가운데는 빌더 구성영역. */
export function PromotionDetail({
  program: p, pageId, status, builderHref, history,
}: {
  program: PromotionInfo; pageId: string; status: string; builderHref: string; history: HistoryRow[];
}) {
  const [zoom, setZoom] = useState(1); // 미리보기 배율 (비율 유지)

  // 미리보기에 반영되는 컨트롤드 필드
  const [name, setName] = useState(p.name ?? '');
  const [purpose, setPurpose] = useState(p.purpose ?? '');
  const [thumbnail, setThumbnail] = useState(p.thumbnail ?? '');
  const [thumbnailAlt, setThumbnailAlt] = useState(p.thumbnailAlt ?? '');
  const [startAt, setStartAt] = useState(p.startAt ?? '');
  const [endAt, setEndAt] = useState(p.endAt ?? '');
  const [reward, setReward] = useState(p.reward ?? '');
  const [target, setTarget] = useState(p.target ?? '');
  const [notice, setNotice] = useState(p.notice ?? '');
  const parseSteps = (): Step[] => { try { const a = JSON.parse(p.usageSteps ?? '[]'); return Array.isArray(a) ? a.map((s) => ({ title: s.title ?? '', desc: s.desc ?? '' })) : []; } catch { return []; } };
  const [steps, setSteps] = useState<Step[]>(parseSteps);
  const [kind, setKind] = useState(p.programKind);
  const [type, setType] = useState(p.programType);
  const [noEnd, setNoEnd] = useState(p.displayNoEndDate);
  // 응모형 전용
  const isEntry = type === '응모형';
  const [ctaLabel, setCtaLabel] = useState(p.ctaLabel ?? '응모하기');
  const [ctaUrl, setCtaUrl] = useState(p.ctaUrl ?? '');
  const [entry, setEntry] = useState<EntryConfig>(() => parseEntry(p.entryConfig));

  const schedule = startAt || endAt ? `${fmtD(startAt)}${endAt ? ` ~ ${fmtD(endAt)}` : ''}` : '';
  const validSteps = steps.filter((s) => s.title.trim() || s.desc.trim());

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* 헤더 */}
      <div className="border-b px-6 pb-3 pt-4">
        <nav className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Home className="h-3.5 w-3.5" />
          {['프로모션 관리', '프로모션', '프로모션 상세'].map((t, i, a) => (
            <span key={i} className="flex items-center gap-1.5">
              <ChevronRight className="h-3 w-3 opacity-50" />
              <span className={i === a.length - 1 ? 'font-medium text-foreground' : undefined}>{t}</span>
            </span>
          ))}
        </nav>
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-2xl font-bold tracking-tight">{name || '프로모션 상세'}</h1>
              <Badge variant={isEntry ? 'destructive' : 'info'}>{type}</Badge>
              <Badge variant="neutral">{status}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">기본 정보를 입력하면 좌측 미리보기가 채워집니다. 가운데 본문은 빌더에서 구성합니다.</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button type="submit" form="promo-form" size="sm" variant="outline">임시저장</Button>
            <Link href={builderHref}><Button size="sm" variant="primary"><PencilRuler className="h-4 w-4" /> 빌더로 본문 구성</Button></Link>
          </div>
        </div>
      </div>

      <form id="promo-form" action={updateProgramInfo.bind(null, p.id)} className="flex min-h-0 flex-1 flex-col">
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-y-auto p-6 lg:grid-cols-[auto_minmax(0,1fr)]">
            {/* ── 좌: 라이브 미리보기 ── */}
            <div className="lg:sticky lg:top-0 lg:self-start">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[13px] font-semibold text-muted-foreground">미리보기</span>
                <div className="flex items-center gap-1 rounded-md border p-0.5">
                  <button type="button" onClick={() => setZoom((z) => Math.max(0.7, +(z - 0.1).toFixed(2)))} disabled={zoom <= 0.7}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30" title="축소">−</button>
                  <button type="button" onClick={() => setZoom(1)} className="min-w-[42px] rounded px-1 text-center text-[11px] font-semibold tabular-nums text-muted-foreground hover:bg-muted" title="기본 크기(100%)">{Math.round(zoom * 100)}%</button>
                  <button type="button" onClick={() => setZoom((z) => Math.min(1.4, +(z + 0.1).toFixed(2)))} disabled={zoom >= 1.4}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30" title="확대">＋</button>
                </div>
              </div>
              <PhonePreview
                builderHref={builderHref} zoom={zoom}
                name={name} purpose={purpose} thumbnail={thumbnail} thumbnailAlt={thumbnailAlt}
                schedule={schedule} reward={reward} target={target} steps={validSteps} notice={notice}
                isEntry={isEntry} ctaLabel={ctaLabel} entry={entry}
              />
            </div>

            {/* ── 우: 입력 폼 ── */}
            <div className="min-w-0 space-y-6">
              <Section title="프로모션 기본 정보">
                <Row label="프로모션 ID"><span className="font-mono text-sm text-muted-foreground">{p.id}</span></Row>
                <Row label="프로모션 명" req>
                  <Input name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="프로모션 명을 입력하세요." className="h-10 max-w-xl" />
                </Row>
                <Row label="부제(요약)">
                  <Input name="purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="8월에 받을 수 있는 혜택" className="h-10 max-w-xl" />
                </Row>
                <Row label="유형" req>
                  <div className="flex flex-wrap gap-2">
                    <Select name="programKind" value={kind} onChange={(e) => setKind(e.target.value)} className="h-10 w-40">
                      {PROGRAM_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                    </Select>
                    <Select name="programType" value={type} onChange={(e) => setType(e.target.value)} className="h-10 w-48">
                      {typesForKind(kind).map((t) => <option key={t} value={t}>{t}</option>)}
                    </Select>
                  </div>
                </Row>
                <Row label="제휴 브랜드"><Input name="partnerBrand" defaultValue={p.partnerBrand ?? ''} placeholder="선택" className="h-10 max-w-xs" /></Row>
                <Row label="Header" req>
                  <ImageField url={thumbnail} alt={thumbnailAlt} onUrl={setThumbnail} onAlt={setThumbnailAlt} urlName="thumbnail" altName="thumbnailAlt" />
                </Row>
                <Row label="운영 기간" req>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input type="datetime-local" name="startAt" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="h-10 w-56" />
                    <span className="text-muted-foreground">~</span>
                    <Input type="datetime-local" name="endAt" value={endAt} onChange={(e) => setEndAt(e.target.value)} className="h-10 w-56" />
                  </div>
                </Row>
                <Row label="전시 기간" req>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input type="datetime-local" name="displayStartAt" defaultValue={p.displayStartAt ?? ''} className="h-10 w-56" />
                    <span className="text-muted-foreground">~</span>
                    <Input type="datetime-local" name="displayEndAt" defaultValue={p.displayEndAt ?? ''} disabled={noEnd} className="h-10 w-56 disabled:bg-muted" />
                    <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" name="displayNoEndDate" checked={noEnd} onChange={(e) => setNoEnd(e.target.checked)} className="h-4 w-4 accent-primary" /> 만료일 없음</label>
                  </div>
                </Row>
                <Row label="전시 상태"><RadioRow name="displayState" value={p.displayState} opts={[['미노출', '미노출'], ['노출', '노출']]} /></Row>
                <Row label="댓글 여부"><RadioRow name="commentUse" value={p.commentUse ? 'true' : 'false'} opts={[['false', '미사용'], ['true', '사용']]} /></Row>
              </Section>

              {/* ── 응모형 전용: 응모 버튼 + 응모/당첨/리워드 설정 ── */}
              {isEntry && (
                <Section title="응모 · 당첨 설정">
                  <div className="border-b bg-rose-50/70 px-4 py-2 text-[11px] text-rose-600">응모형 전용 설정입니다. 응모 버튼과 당첨/리워드 규칙을 지정합니다.</div>
                  {/* 폼 제출용 hidden 값 */}
                  <input type="hidden" name="ctaLabel" value={ctaLabel} />
                  <input type="hidden" name="ctaUrl" value={ctaUrl} />
                  <input type="hidden" name="entryConfig" value={JSON.stringify(normalizeEntry(entry))} />

                  <Row label="응모 버튼" req>
                    <div className="flex flex-wrap items-center gap-2">
                      <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="응모하기" className="h-10 w-40" />
                      <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="응모 링크 (선택, https://…)" className="h-10 max-w-sm flex-1" />
                    </div>
                  </Row>
                  <Row label="참여 조건"><Input value={entry.joinCondition} onChange={(e) => setEntry((s) => ({ ...s, joinCondition: e.target.value }))} placeholder="예: T멤버십 로그인 고객 · 기간 내 1회" className="h-10" /></Row>
                  <Row label="응모 방식"><Seg value={entry.entryMethod} options={['수동', '자동'] as const} onChange={(v) => setEntry((s) => ({ ...s, entryMethod: v }))} /></Row>
                  <Row label="당첨 방식"><Seg value={entry.winMethod} options={['전체', '선착순', '추첨'] as const} onChange={(v) => setEntry((s) => ({ ...s, winMethod: v }))} /></Row>
                  <Row label="당첨 시점"><Seg value={entry.winTiming} options={['실시간', '사후'] as const} onChange={(v) => setEntry((s) => ({ ...s, winTiming: v }))} /></Row>
                  <Row label="당첨 안내"><Seg value={entry.winNotice} options={['선택 안함', '일반 당첨 안내'] as const} onChange={(v) => setEntry((s) => ({ ...s, winNotice: v }))} /></Row>
                  <Row label="당첨 규모">
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <Seg value={entry.scaleMode} options={['전체', '직접 입력'] as const} onChange={(v) => setEntry((s) => ({ ...s, scaleMode: v }))} />
                      <Input value={entry.scaleCount} onChange={(e) => setEntry((s) => ({ ...s, scaleCount: e.target.value.replace(/[^0-9]/g, '') }))}
                        disabled={entry.scaleMode !== '직접 입력'} placeholder="명" className="h-9 w-28 disabled:bg-muted" />
                    </div>
                  </Row>
                  <Row label="리워드 설정"><RewardTable rewards={entry.rewards} setRewards={(rw) => setEntry((s) => ({ ...s, rewards: rw }))} /></Row>
                </Section>
              )}

              <Section title="상단 노출 정보 (일정·보상·대상·이용방법)">
                <div className="border-b bg-accent/40 px-4 py-2 text-[11px] text-muted-foreground">미리보기 <b>상단</b>에 노출됩니다. 일정은 위 운영 기간에서 자동 표기됩니다.</div>
                <Row label="보상"><Input name="reward" value={reward} onChange={(e) => setReward(e.target.value)} placeholder="제공되는 상품 군 내 최대 20% 할인 제공" className="h-10" /></Row>
                <Row label="대상"><Input name="target" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="멤버십 VIP 고객" className="h-10 max-w-md" /></Row>
                <Row label="이용 방법"><UsageStepsField steps={steps} setSteps={setSteps} /></Row>
              </Section>

              <Section title="하단 노출 정보 (유의사항)">
                <div className="border-b bg-accent/40 px-4 py-2 text-[11px] text-muted-foreground">미리보기 <b>하단</b>에 고정 노출됩니다. 빌더에서 수정할 수 없습니다.</div>
                <Row label="유의사항">
                  <textarea name="notice" value={notice} onChange={(e) => setNotice(e.target.value)} rows={5} placeholder={'- 기본 배송비는 무료이며, 지역에 따라 추가 비용이 발생할 수 있습니다.'}
                    className="w-full rounded-text-field-radius border border-input-border-default bg-input-bg-default px-3.5 py-2 text-sm leading-relaxed focus-visible:border-input-border-typing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30" />
                </Row>
              </Section>

              <Section title="검색 및 태그 관리">
                <Row label="검색 노출 여부"><RadioRow name="searchExposed" value={p.searchExposed ? 'true' : 'false'} opts={[['true', '노출'], ['false', '미노출']]} /></Row>
                <Row label="검색 태그" req><Input name="searchTags" defaultValue={p.searchTags ?? ''} placeholder="#할인 #제휴 #VIP" className="h-10" /></Row>
                <Row label="검색 태그">
                  <div className="max-w-2xl space-y-2">
                    <SeoField name="metaKeywords" label="keywords" defaultValue={p.metaKeywords} />
                    <SeoField name="metaDescription" label="description" defaultValue={p.metaDescription} />
                    <SeoField name="ogTitle" label="og:title" defaultValue={p.ogTitle} />
                    <SeoField name="ogDescription" label="og:description" defaultValue={p.ogDescription} />
                    <SeoField name="ogSiteName" label="og:site_name" defaultValue={p.ogSiteName} />
                  </div>
                </Row>
                <Row label="추가 태그 이미지 og:image"><ImageField url={p.ogImage ?? ''} urlName="ogImage" /></Row>
              </Section>
            </div>
          </div>

          <div className="flex items-center justify-between border-t px-6 py-3.5">
            <Link href="/admin/events"><Button size="sm" variant="outline" type="button">목록으로</Button></Link>
            <Button size="sm" variant="primary" type="submit">저장</Button>
          </div>
        </form>
    </div>
  );
}

/* ── 좌측 라이브 폰 미리보기 ── */
function PhonePreview({
  builderHref, zoom = 1, name, purpose, thumbnail, thumbnailAlt, schedule, reward, target, steps, notice,
  isEntry = false, ctaLabel = '', entry,
}: {
  builderHref: string; zoom?: number; name: string; purpose: string; thumbnail: string; thumbnailAlt: string;
  schedule: string; reward: string; target: string; steps: Step[]; notice: string;
  isEntry?: boolean; ctaLabel?: string; entry?: EntryConfig;
}) {
  // 일정은 항상 표기(값 없으면 안내). 보상/대상은 값 있을 때만.
  const summary: [string, string][] = [
    ['일정', schedule || '운영 기간 미설정'],
    ...(reward.trim() ? ([['보상', reward]] as [string, string][]) : []),
    ...(target.trim() ? ([['대상', target]] as [string, string][]) : []),
  ];
  return (
    // 비율 유지 확대/축소: 바깥 래퍼 폭을 배율에 맞춰 잡고 안쪽을 transform scale (레이아웃 폭 보정)
    <div className="mx-auto" style={{ width: 248 * zoom }}>
    <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', width: 248, margin: '0 auto' }}>
    <div className="mx-auto w-[248px] overflow-hidden rounded-[22px] border-[5px] border-neutral-900 bg-white shadow-xl">
      {/* 상태바 + 좌상단 빌더 접근 버튼 */}
      <div className="flex items-center justify-between bg-slate-50 px-3 pb-2 pt-2 text-[10px] text-slate-500">
        <span className="font-semibold">9:41</span><span>••• 📶 🔋</span>
      </div>
      <div className="flex items-center justify-between px-3 pb-2">
        <Link href={builderHref} title="빌더로 본문 구성"
          className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground hover:bg-primary/90">
          <PencilRuler className="h-3 w-3" /> 빌더
        </Link>
        <ChevronLeft className="h-4 w-4 text-slate-300" />
      </div>

      <div className="max-h-[460px] overflow-y-auto px-3 pb-3">
        {/* 헤더 이미지 */}
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnail} alt={thumbnailAlt} className="h-28 w-full rounded-lg object-cover" />
        ) : (
          <div className="flex h-28 w-full items-center justify-center rounded-lg bg-slate-100 text-[11px] text-slate-400">Header 이미지</div>
        )}
        {/* 타이틀 */}
        <h3 className="mt-3 text-[16px] font-bold leading-snug text-slate-900">{name || '프로모션 제목'}</h3>
        {purpose && <p className="text-[12px] text-slate-500">{purpose}</p>}

        {/* 일정/보상/대상 (일정 항상 표기) */}
        <div className="mt-3 space-y-1.5 rounded-xl bg-slate-50 p-3">
          {summary.map(([k, v], i) => (
            <div key={k} className="flex gap-3 text-[11px]"><span className="w-9 shrink-0 text-slate-400">{k}</span><span className={cn('min-w-0 flex-1 font-medium', i === 0 && !schedule ? 'text-slate-300' : 'text-slate-700')}>{v}</span></div>
          ))}
        </div>
        {/* 이용 방법 */}
        {steps.length > 0 && (
          <div className="mt-2 space-y-2.5 rounded-xl border border-slate-100 p-3">
            {steps.map((s, i) => (
              <div key={i} className="flex items-start gap-2"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-500">{i + 1}</span>
                <div className="min-w-0"><p className="text-[12px] font-semibold text-slate-800">{s.title}</p>{s.desc && <p className="text-[10px] text-slate-400">{s.desc}</p>}</div></div>
            ))}
          </div>
        )}

        {/* 빌더 구성영역 (가운데) */}
        <Link href={builderHref} className="mt-3 flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 py-10 text-center hover:bg-primary/10">
          <Plus className="h-5 w-5 text-primary" />
          <span className="text-[12px] font-bold text-primary">빌더 구성영역</span>
          <span className="text-[10px] text-primary/70">이 영역을 빌더에서 구성합니다</span>
        </Link>

        {/* 유의사항 (항상 표기) */}
        <div className="mt-3 rounded-xl bg-slate-50 p-3">
          <p className="mb-1 text-[12px] font-bold text-slate-700">유의사항</p>
          <p className={cn('whitespace-pre-line text-[10px] leading-relaxed', notice.trim() ? 'text-slate-500' : 'text-slate-300')}>{notice.trim() || '유의사항을 입력하세요'}</p>
        </div>
        {/* 응모형: 경품/당첨 안내 카드 (고객 노출) — 응모 방식·당첨 규모는 어드민 전용이라 미노출 */}
        {isEntry && entry && (
          <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="mb-1.5 text-[12px] font-bold text-slate-700">당첨/경품 안내</p>
            <div className="space-y-1 text-[10px]">
              <div className="flex gap-3"><span className="w-12 shrink-0 text-slate-400">당첨 방식</span><span className="font-medium text-slate-700">{entry.winMethod} · {entry.winTiming} 당첨</span></div>
              {entry.rewards.some((r) => r.displayName.trim() || r.winnerCount.trim()) && (
                <div className="mt-1.5 space-y-1 border-t border-slate-200 pt-1.5">
                  {entry.rewards.filter((r) => r.displayName.trim() || r.winnerCount.trim()).map((r, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{r.displayName || '리워드'}</span>
                      {r.winnerCount && <span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-[9px] font-semibold text-indigo-600">{r.winnerCount}명</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {/* CTA — 응모형: 응모하기 / 안내형: 참여하기. 둘 다 플랫폼 컬러(보라색). */}
        <div className="mt-3 flex h-10 items-center justify-center rounded-xl bg-indigo-600 text-[13px] font-semibold text-white">
          {isEntry ? (ctaLabel.trim() || '응모하기') : '참여하기'}
        </div>
      </div>
    </div>
    </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="mb-2 text-sm font-bold">{title}</h2><div className="rounded-lg border">{children}</div></section>;
}

function Row({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] items-start gap-3 border-b px-4 py-3 last:border-0">
      <label className="pt-1.5 text-[13px] font-semibold text-muted-foreground">{label}{req && <span className="text-destructive"> *</span>}</label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function RadioRow({ name, value, opts }: { name: string; value: string; opts: [string, string][] }) {
  const [v, setV] = useState(value);
  return (
    <div className="flex gap-4 pt-1">
      {opts.map(([val, label]) => (
        <label key={val} className="flex items-center gap-1.5 text-sm"><input type="radio" name={name} value={val} checked={v === val} onChange={() => setV(val)} className="accent-primary" /> {label}</label>
      ))}
    </div>
  );
}

// 세그먼트형 라디오 (응모형 설정 — 컨트롤드)
function Seg<T extends string>({ value, options, onChange }: { value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-4 pt-1">
      {options.map((o) => (
        <label key={o} className="flex items-center gap-1.5 text-sm">
          <input type="radio" checked={value === o} onChange={() => onChange(o)} className="accent-primary" /> {o}
        </label>
      ))}
    </div>
  );
}

// 응모형 리워드 설정 테이블 — 지급 우선순위는 번호 입력이 아니라 '드래그앤드롭 순서'로 결정(위=1순위).
function RewardTable({ rewards, setRewards }: { rewards: RewardRow[]; setRewards: (r: RewardRow[]) => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const up = (i: number, patch: Partial<RewardRow>) => setRewards(rewards.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const blank = (): RewardRow => ({ rid: newRid(), priority: '', type: '', typeDetail: '', displayName: '', winnerCount: '', payTiming: '사후' });
  // 클릭한 행 '바로 아래'에 추가 (맨 끝에 붙지 않게)
  const insertAfter = (i: number) => { const next = [...rewards]; next.splice(i + 1, 0, blank()); setRewards(next); };
  const del = (i: number) => setRewards(rewards.length > 1 ? rewards.filter((_, j) => j !== i) : rewards);
  const ids = rewards.map((r, i) => r.rid ?? String(i));
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    setRewards(arrayMove(rewards, from, to));
  };
  return (
    <div className="overflow-x-auto">
      {/* 헤더 */}
      <div className="flex min-w-[640px] items-center gap-2 border-b px-1 pb-1.5 text-[12px] font-semibold text-muted-foreground">
        <span className="w-16 shrink-0">지급 순위</span>
        <span className="w-24 shrink-0">유형<span className="text-destructive">*</span></span>
        <span className="w-32 shrink-0">유형 세부<span className="text-destructive">*</span></span>
        <span className="w-32 shrink-0">사용자 노출명<span className="text-destructive">*</span></span>
        <span className="w-20 shrink-0">당첨자 수<span className="text-destructive">*</span></span>
        <span className="flex-1">지급 시점<span className="text-destructive">*</span></span>
        <span className="w-16 shrink-0 text-right">추가/삭제</span>
      </div>
      <p className="min-w-[640px] px-1 pt-1.5 text-[11px] text-muted-foreground">행을 드래그해 지급 우선순위를 바꾸세요. 맨 위가 1순위입니다.</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="mt-1 min-w-[640px] space-y-1">
            {rewards.map((r, i) => (
              <SortableRewardRow
                key={r.rid ?? i}
                id={r.rid ?? String(i)}
                row={r}
                order={i + 1}
                canDelete={rewards.length > 1}
                onPatch={(patch) => up(i, patch)}
                onAdd={() => insertAfter(i)}
                onDelete={() => del(i)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableRewardRow({ id, row, order, canDelete, onPatch, onAdd, onDelete }: {
  id: string; row: RewardRow; order: number; canDelete: boolean;
  onPatch: (patch: Partial<RewardRow>) => void; onAdd: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const onlyNum = (v: string) => v.replace(/[^0-9]/g, '');
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 20 : undefined };
  return (
    <div ref={setNodeRef} style={style} className={cn('flex items-center gap-2 rounded-lg border bg-card px-1 py-1', isDragging && 'shadow-lg ring-1 ring-primary/30')}>
      {/* 지급 순위: 드래그 핸들 + 자동 번호 */}
      <div className="flex w-16 shrink-0 items-center gap-1">
        <button type="button" className="cursor-grab touch-none text-slate-300 hover:text-slate-500 active:cursor-grabbing" aria-label="드래그하여 순위 변경" {...attributes} {...listeners}><GripVertical className="h-4 w-4" /></button>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-[11px] font-bold text-rose-600">{order}</span>
      </div>
      <div className="w-24 shrink-0"><Select value={row.type} onChange={(e) => onPatch({ type: e.target.value })} className="h-9 w-full"><option value="">선택</option>{REWARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select></div>
      <div className="w-32 shrink-0"><Input value={row.typeDetail} onChange={(e) => onPatch({ typeDetail: e.target.value })} placeholder="세부 설정" className="h-9 w-full" /></div>
      <div className="w-32 shrink-0"><Input value={row.displayName} onChange={(e) => onPatch({ displayName: e.target.value })} placeholder="노출명" className="h-9 w-full" /></div>
      <div className="w-20 shrink-0"><Input value={row.winnerCount} onChange={(e) => onPatch({ winnerCount: onlyNum(e.target.value) })} placeholder="명" className="h-9 w-full" /></div>
      <div className="flex flex-1 gap-2">
        {(['실시간', '사후'] as const).map((t) => (
          <label key={t} className="flex items-center gap-1 text-[11px]"><input type="radio" checked={row.payTiming === t} onChange={() => onPatch({ payTiming: t })} className="accent-primary" /> {t} 지급</label>
        ))}
      </div>
      <div className="flex w-16 shrink-0 justify-end gap-1">
        <button type="button" onClick={onDelete} disabled={!canDelete} className="flex h-8 w-8 items-center justify-center rounded border text-muted-foreground hover:bg-secondary disabled:opacity-30" title="행 삭제">−</button>
        <button type="button" onClick={onAdd} className="flex h-8 w-8 items-center justify-center rounded border border-primary/40 bg-primary/5 text-primary hover:bg-primary/10" title="행 추가">＋</button>
      </div>
    </div>
  );
}

// DS포탈 예시 자산 (실제 연동 전 목업 카탈로그)
const DS_PORTAL_ASSETS: { name: string; tag: string; c1: string; c2: string }[] = [
  { name: 'T멤버십 신규 제휴 배너', tag: '배너', c1: '#7c3aed', c2: '#4f46e5' },
  { name: '루쥬 코코 프로모션', tag: '상품', c1: '#ec4899', c2: '#f43f5e' },
  { name: '여름 혜택 기획전', tag: '기획전', c1: '#0ea5e9', c2: '#06b6d4' },
  { name: '우주패스 구독 안내', tag: '구독', c1: '#f59e0b', c2: '#f97316' },
  { name: '카드 제휴 혜택', tag: '혜택', c1: '#10b981', c2: '#22c55e' },
  { name: '서울랜드 예매 안내', tag: '이벤트', c1: '#6366f1', c2: '#8b5cf6' },
];
const dsThumb = (label: string, c1: string, c2: string) =>
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='360' height='240'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient></defs><rect width='360' height='240' fill='url(#g)'/><text x='180' y='128' font-size='20' fill='white' text-anchor='middle' font-family='sans-serif'>${label}</text></svg>`,
  );

function ImageField({ url, alt, onUrl, onAlt, urlName, altName }: {
  url: string; alt?: string; onUrl?: (v: string) => void; onAlt?: (v: string) => void; urlName: string; altName?: string;
}) {
  const [val, setVal] = useState(url);
  const [altVal, setAltVal] = useState(alt ?? '');
  const [dsOpen, setDsOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const setUrlVal = (v: string) => { setVal(v); onUrl?.(v); };
  const setAltValF = (v: string) => { setAltVal(v); onAlt?.(v); };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => { setUrlVal(String(reader.result)); if (altName && !altVal) setAltValF(f.name.replace(/\.[^.]+$/, '')); };
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  return (
    <div className="max-w-md space-y-2">
      <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={onPickFile} />
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input bg-muted/30 px-4 py-6 text-center">
        {val ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={val} alt={altVal} className="max-h-28 rounded-md object-contain" />
        ) : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
        <p className="text-[11px] text-muted-foreground">사이즈 360×240px, 최대 10mb 이하 .jpg, .png 형식 가능</p>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <button type="button" onClick={() => setDsOpen(true)} className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10"><Globe className="h-3.5 w-3.5" /> DS포탈에서 가져오기</button>
          <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1 rounded-md border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary"><FolderOpen className="h-3.5 w-3.5" /> 로컬에서 가져오기</button>
        </div>
      </div>
      <Input name={urlName} value={val} onChange={(e) => setUrlVal(e.target.value)} placeholder="이미지 URL (https://…)" className="h-9 text-xs" />
      {altName && <Input name={altName} value={altVal} onChange={(e) => setAltValF(e.target.value)} placeholder="ALT 값을 입력해 주세요." className="h-9 text-xs" />}

      {dsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDsOpen(false)}>
          <div className="w-full max-w-lg rounded-xl bg-card p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><Globe className="h-4 w-4 text-primary" /> DS포탈 이미지 가져오기</h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground">디자인 시스템 포탈에 등록된 자산에서 선택합니다. (예시)</p>
              </div>
              <button type="button" onClick={() => setDsOpen(false)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
              {DS_PORTAL_ASSETS.map((a) => {
                const src = dsThumb(a.name, a.c1, a.c2);
                return (
                  <button
                    key={a.name}
                    type="button"
                    onClick={() => { setUrlVal(src); if (altName && !altVal) setAltValF(a.name); setDsOpen(false); }}
                    className="group overflow-hidden rounded-lg border text-left hover:border-primary hover:ring-2 hover:ring-primary/30"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={a.name} className="h-20 w-full object-cover" />
                    <div className="px-2 py-1.5">
                      <p className="truncate text-[11px] font-medium text-foreground">{a.name}</p>
                      <span className="mt-0.5 inline-block rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{a.tag}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UsageStepsField({ steps, setSteps }: { steps: Step[]; setSteps: (s: Step[]) => void }) {
  const rows = steps.length ? steps : [{ title: '', desc: '' }];
  const up = (i: number, patch: Partial<Step>) => setSteps(rows.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const add = () => setSteps([...rows, { title: '', desc: '' }]);
  const del = (i: number) => setSteps(rows.length > 1 ? rows.filter((_, j) => j !== i) : rows);
  return (
    <div className="max-w-2xl space-y-2">
      <input type="hidden" name="usageSteps" value={JSON.stringify(rows.filter((s) => s.title.trim() || s.desc.trim()))} />
      {rows.map((s, i) => (
        <div key={i} className="flex items-start gap-2 rounded-lg border p-2">
          <span className="mt-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[12px] font-bold text-primary">{i + 1}</span>
          <div className="min-w-0 flex-1 space-y-1.5">
            <Input value={s.title} onChange={(e) => up(i, { title: e.target.value })} placeholder="8월 한달 동안 원하는 상품을 둘러보고" className="h-9" />
            <Input value={s.desc} onChange={(e) => up(i, { desc: e.target.value })} placeholder="기간 26.8.1(화) ~ 26.8.31(일)" className="h-8 text-xs" />
          </div>
          <button type="button" onClick={() => del(i)} className="mt-1 rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive" aria-label="스텝 삭제"><X className="h-4 w-4" /></button>
        </div>
      ))}
      <button type="button" onClick={add} className="inline-flex items-center gap-1 rounded-md border border-dashed px-2.5 py-1 text-[12px] font-medium text-muted-foreground hover:bg-muted">+ 스텝 추가</button>
    </div>
  );
}

function SeoField({ name, label, defaultValue }: { name: string; label: string; defaultValue: string | null }) {
  return (
    <div className="grid grid-cols-[130px_minmax(0,1fr)] items-center gap-2">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <Input name={name} defaultValue={defaultValue ?? ''} className="h-9 text-xs" />
    </div>
  );
}
