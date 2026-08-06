'use client';

import { useState } from 'react';
import { createProject } from './actions';
import { TEMPLATES, PROGRAM_KINDS, typesForKind, createsStateFor, TYPE_META } from '@/lib/event-templates';
import * as LucideIcons from 'lucide-react';
import { X, Check, Plus, Info } from 'lucide-react';

function TIcon({ name, className }: { name: string; className?: string }) {
  const I = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name] ?? LucideIcons.Square;
  return <I className={className} />;
}

// 새 프로젝트 = 생성에 꼭 필요한 필수 항목만.
//   프로그램 이름 · 구분(이벤트/미션) · 대표 유형 · 운영 기간 · 시작 템플릿.
//   썸네일·전시기간·전시상태·댓글·SEO/메타·제휴브랜드 등 상세는 생성 후 '기본 정보 편집'에서.
export function NewProjectModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<string>('이벤트');
  const [type, setType] = useState<string>('안내형');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [tpl, setTpl] = useState('blank');

  const types = typesForKind(kind);
  const creates = createsStateFor(kind, type);

  function changeKind(k: string) {
    setKind(k);
    setType(typesForKind(k)[0]);
    setTpl('blank'); // 미션은 템플릿 없음 → 빈 페이지
  }
  function changeType(t: string) {
    setType(t);
    setTpl('blank'); // 유형 바뀌면 템플릿 초기화
  }

  const blank = TEMPLATES.find((t) => t.key === 'blank')!;
  const matched = kind === '이벤트' ? TEMPLATES.filter((t) => t.key !== 'blank' && t.eventType === type) : [];
  const templates = [blank, ...matched];

  const inputCls = 'h-10 w-full rounded-lg border px-3 text-sm';
  const labelCls = 'mb-1 block text-sm font-medium';
  const req = <span className="text-rose-500">*</span>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <div>
            <h2 className="text-base font-bold">새 프로젝트</h2>
            <p className="text-[11px] text-muted-foreground">필수 항목만 입력하고, 상세는 생성 후 편집합니다.</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-secondary" aria-label="닫기"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div>
            <label className={labelCls}>프로그램 이름 {req}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="새 프로젝트" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>구분 {req}</label>
            <div className="flex overflow-hidden rounded-lg border">
              {PROGRAM_KINDS.map((k) => (
                <button key={k} type="button" onClick={() => changeKind(k)} className={`flex-1 py-2 text-sm font-medium ${kind === k ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}>{k}</button>
              ))}
            </div>
          </div>

          {/* 대표 유형 — 정책서 유형 정의 기반 카드 (아이콘 + 설명 + 상태 생성 여부) */}
          <div>
            <label className={labelCls}>대표 유형 {req}</label>
            <div className="grid grid-cols-2 gap-2">
              {types.map((t) => {
                const meta = TYPE_META[t];
                const active = type === t;
                const c = createsStateFor(kind, t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => changeType(t)}
                    className={`relative rounded-xl border-2 p-2.5 text-left transition ${active ? 'border-primary ring-2 ring-primary/20' : 'border-transparent ring-1 ring-border hover:ring-primary/40'}`}
                  >
                    {active && <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-2.5 w-2.5" /></span>}
                    <div className="flex items-center gap-1.5 pr-5">
                      <TIcon name={meta?.icon ?? 'Square'} className="h-4 w-4 shrink-0 text-primary" />
                      <span className="text-[13px] font-semibold">{t}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{meta?.desc ?? ''}</p>
                    <span className={`mt-1.5 inline-block rounded px-1.5 py-0.5 text-[9px] font-medium ${c ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {c ? '참여 상태 생성' : '노출·클릭 트래킹'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 선택 유형 안내 (PI-EVTMSN-PROG-001-06) */}
          <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] ${creates ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
            <Info className="h-3.5 w-3.5 shrink-0" />
            {creates ? '참여 상태를 생성하는 유형입니다 (참여·결과·보상 관리).' : '참여 상태를 생성하지 않는 유형입니다 (노출·클릭 등 트래킹만).'}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>운영 시작</label>
              <input type="date" value={startAt} onChange={(e) => setStartAt(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>운영 종료</label>
              <input type="date" value={endAt} onChange={(e) => setEndAt(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">시작 템플릿</label>
            {kind === '미션' && <p className="mb-2 rounded bg-muted/60 px-2 py-1 text-[11px] text-muted-foreground">미션은 빈 페이지에서 시작합니다. (미션 템플릿 준비 중)</p>}
            <div className="grid grid-cols-2 gap-2">
              {templates.map((t) => {
                const active = tpl === t.key;
                return (
                  <button key={t.key} type="button" onClick={() => setTpl(t.key)} className={`relative rounded-xl border-2 p-3 text-left transition ${active ? 'border-primary ring-2 ring-primary/20' : 'border-transparent ring-1 ring-border hover:ring-primary/40'}`}>
                    {active && <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-3 w-3" /></span>}
                    <p className="pr-6 text-[13px] font-semibold">{t.label}</p>
                    <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">{t.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <form action={createProject} className="flex items-center justify-between gap-2 border-t px-5 py-3">
          <input type="hidden" name="name" value={name} />
          <input type="hidden" name="template" value={tpl} />
          <input type="hidden" name="programKind" value={kind} />
          <input type="hidden" name="programType" value={type} />
          <input type="hidden" name="startAt" value={startAt} />
          <input type="hidden" name="endAt" value={endAt} />
          <span className="min-w-0 truncate text-xs text-muted-foreground">{kind} · {type}</span>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-secondary">취소</button>
            <button type="submit" className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" /> 만들기</button>
          </div>
        </form>
      </div>
    </div>
  );
}
