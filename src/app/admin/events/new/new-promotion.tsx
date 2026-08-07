'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import * as LucideIcons from 'lucide-react';
import { Check, Plus, Info, ChevronLeft } from 'lucide-react';
import { createProject } from '../actions';
import { TEMPLATES, PROGRAM_KINDS, typesForKind, createsStateFor, TYPE_META, toPromotionSkeleton, type NodeSpec } from '@/lib/event-templates';
import { EventNodeView, type NodeView } from '@/components/preview/event-node';

function TIcon({ name, className }: { name: string; className?: string }) {
  const I = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name] ?? LucideIcons.Square;
  return <I className={className} />;
}

// NodeSpec(빌드 결과) → NodeView(렌더용). 예시 미리보기 전용.
function toViews(specs: NodeSpec[]): NodeView[] {
  let i = 0;
  const conv = (s: NodeSpec): NodeView => ({ id: `ex${i++}`, type: s.type, props: (s.props ?? {}) as Record<string, unknown>, children: (s.children ?? []).map(conv) });
  return specs.map(conv);
}

// 템플릿의 실제 생성 결과(고정 슬롯 + 섹션 코너)를 축소 디바이스로 미리보기
function ExamplePreview({ tplKey }: { tplKey: string }) {
  const tpl = TEMPLATES.find((t) => t.key === tplKey);
  const built = tpl ? tpl.build() : [];
  const views = toViews(built.length ? toPromotionSkeleton(built) : []);
  // 썸네일·헤더·CTA는 고정(모든 예시 동일)이라 생략하고, 이 유형의 '섹션'만 강조해 보여준다.
  const sections = views.filter((v) => v.type === 'CORNER');
  if (sections.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 text-center text-slate-400">
        <span className="text-[12px] font-medium">빈 페이지</span>
        <span className="text-[10px]">직접 섹션을 구성합니다</span>
      </div>
    );
  }
  // 폰 크롬 없이 섹션 콘텐츠만 — 위에서부터 자연스럽게 클립
  return (
    <div className="pointer-events-none h-full w-full overflow-hidden">
      <div className="space-y-2.5 p-3">
        {sections.map((n) => <EventNodeView key={n.id} node={n} />)}
      </div>
    </div>
  );
}

export function NewPromotion() {
  const [name, setName] = useState('');
  const [kind, setKind] = useState('이벤트');
  const [type, setType] = useState('안내형');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [tpl, setTpl] = useState('blank');
  const [mounted, setMounted] = useState(false); // 미리보기는 클라이언트 전용 (하이드레이션 불일치 방지)
  useEffect(() => setMounted(true), []);

  const types = typesForKind(kind);
  const creates = createsStateFor(kind, type);

  const blank = TEMPLATES.find((t) => t.key === 'blank')!;
  const matched = kind === '이벤트' ? TEMPLATES.filter((t) => t.key !== 'blank' && t.eventType === type) : [];
  const examples = [...matched, blank]; // 유형 예시들 + 빈 페이지

  function changeKind(k: string) {
    setKind(k);
    const t = typesForKind(k)[0];
    setType(t);
    setTpl('blank');
  }
  function changeType(t: string) {
    setType(t);
    // 유형 바꾸면 첫 예시를 기본 선택 (없으면 빈 페이지)
    const first = TEMPLATES.find((x) => x.key !== 'blank' && x.eventType === t);
    setTpl(first ? first.key : 'blank');
  }

  const input = 'h-10 w-full rounded-lg border px-3 text-sm';
  const label = 'mb-1 block text-sm font-medium';

  return (
    <div className="flex h-full flex-col bg-slate-50">
      {/* 상단 바 */}
      <div className="flex items-center gap-3 border-b bg-card px-4 py-2.5">
        <Link href="/admin/events" className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> 목록
        </Link>
        <span className="text-sm font-semibold">새 프로모션</span>
        <span className="text-[11px] text-muted-foreground">유형을 선택하면 예시 화면이 보입니다. 예시를 골라 시작하세요.</span>
      </div>

      <div className="grid flex-1 grid-cols-[360px_1fr] overflow-hidden">
        {/* 좌측: 설정 */}
        <form action={createProject} className="flex flex-col overflow-hidden border-r bg-card">
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <div>
              <label className={label}>프로그램 이름 <span className="text-rose-500">*</span></label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="새 프로모션" className={input} />
            </div>

            <div>
              <label className={label}>구분 <span className="text-rose-500">*</span></label>
              <div className="flex overflow-hidden rounded-lg border">
                {PROGRAM_KINDS.map((k) => (
                  <button key={k} type="button" onClick={() => changeKind(k)} className={`flex-1 py-2 text-sm font-medium ${kind === k ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}>{k}</button>
                ))}
              </div>
            </div>

            <div>
              <label className={label}>대표 유형 <span className="text-rose-500">*</span></label>
              <div className="grid grid-cols-2 gap-2">
                {types.map((t) => {
                  const meta = TYPE_META[t];
                  const active = type === t;
                  return (
                    <button key={t} type="button" onClick={() => changeType(t)} className={`relative rounded-xl border-2 p-2.5 text-left transition ${active ? 'border-primary ring-2 ring-primary/20' : 'border-transparent ring-1 ring-border hover:ring-primary/40'}`}>
                      {active && <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-2.5 w-2.5" /></span>}
                      <div className="flex items-center gap-1.5 pr-5">
                        <TIcon name={meta?.icon ?? 'Square'} className="h-4 w-4 shrink-0 text-primary" />
                        <span className="text-[13px] font-semibold">{t}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{meta?.desc ?? ''}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] ${creates ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
              <Info className="h-3.5 w-3.5 shrink-0" />
              {creates ? '참여 상태를 생성하는 유형입니다.' : '참여 상태를 생성하지 않는 유형입니다 (노출·클릭 트래킹).'}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>운영 시작</label>
                <input type="date" value={startAt} onChange={(e) => setStartAt(e.target.value)} className={input} />
              </div>
              <div>
                <label className={label}>운영 종료</label>
                <input type="date" value={endAt} onChange={(e) => setEndAt(e.target.value)} className={input} />
              </div>
            </div>

            <div className="rounded-lg border bg-muted/40 p-3 text-[12px] text-muted-foreground">
              선택한 예시: <b className="text-foreground">{TEMPLATES.find((t) => t.key === tpl)?.label ?? '빈 페이지'}</b>
            </div>
          </div>

          {/* 히든 입력 + 만들기 */}
          <input type="hidden" name="name" value={name} />
          <input type="hidden" name="template" value={tpl} />
          <input type="hidden" name="programKind" value={kind} />
          <input type="hidden" name="programType" value={type} />
          <input type="hidden" name="startAt" value={startAt} />
          <input type="hidden" name="endAt" value={endAt} />
          <div className="flex items-center justify-between gap-2 border-t px-5 py-3">
            <span className="min-w-0 truncate text-xs text-muted-foreground">{kind} · {type}</span>
            <div className="flex shrink-0 gap-2">
              <Link href="/admin/events" className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-secondary">취소</Link>
              <button type="submit" className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" /> 만들기</button>
            </div>
          </div>
        </form>

        {/* 우측: 예시 갤러리 */}
        <div className="overflow-y-auto bg-[radial-gradient(circle,#e2e8f0_1px,transparent_1px)] p-6 [background-size:16px_16px]">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-semibold">{kind === '미션' ? '미션은 빈 페이지에서 시작합니다' : `${type} 예시`}</h2>
            <span className="text-xs text-muted-foreground">예시를 클릭해 선택하세요</span>
          </div>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
            {examples.map((ex) => {
              const active = tpl === ex.key;
              return (
                <div
                  key={ex.key}
                  role="button"
                  tabIndex={0}
                  onClick={() => setTpl(ex.key)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTpl(ex.key); } }}
                  className={`group relative cursor-pointer overflow-hidden rounded-2xl border-2 bg-card p-3 text-left transition ${active ? 'border-primary ring-2 ring-primary/20' : 'border-transparent ring-1 ring-border hover:ring-primary/50'}`}
                >
                  {active && <span className="absolute right-2.5 top-2.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-3 w-3" /></span>}
                  <div className="relative mb-2 h-[300px] overflow-hidden rounded-xl border bg-gradient-to-b from-white to-slate-50">
                    {mounted ? <ExamplePreview tplKey={ex.key} /> : <div className="flex h-full items-center justify-center text-[11px] text-slate-400">미리보기 로딩…</div>}
                    {/* 하단 페이드 (콘텐츠가 잘리는 느낌을 자연스럽게) */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" />
                  </div>
                  <p className="text-[13px] font-semibold">{ex.label}</p>
                  <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">{ex.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
