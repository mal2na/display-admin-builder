'use client';

/**
 * 전시화면 관리 (테스트) — 주문 프로세스 등록(order3-create) 레이아웃을 전시 데이터로 이식.
 *  좌: 미리보기(디바이스, 고정) · 우: 기본 정보(폼) + 템플릿 구성(카드>코너 2단) + 구성 검증 · 하단 고정 액션 바.
 *  실제 혜택 홈 등 Container·Template·Corner 를 채운다. 배치·노출 테스트용(코너 추가/저장은 데모).
 *  레퍼런스: https://nc-channel.vercel.app/order3-create.html (2026-10-20 사용자 요청).
 */
import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { DeviceFrame, CornerBlock } from '@/components/preview/blocks';
import { cornerTypeChipClass, layoutLabel } from '@/lib/display-taxonomy';
import { ChevronLeft, ChevronDown, GripVertical, X, Plus, Copy, Pencil, ShieldCheck, Layers, EyeOff } from 'lucide-react';
import type { ProcessData, PTemplate, PCorner } from './process-data';

const EXPOSE_OPTS = ['항상 노출', '조건 노출', '로그인 시 노출', '비로그인 시 노출', '미노출'];
const TYPE_OPTS = ['메인화면', '메뉴', '기획전', '혜택 영역'];

/* ───────── 구성 검증 ───────── */
type Issue = { level: '오류' | '경고'; area: string; detail: string; templateId?: string };
function validate(data: ProcessData): Issue[] {
  const issues: Issue[] = [];
  if (!data.containerName.trim()) issues.push({ level: '오류', area: '설정 항목', detail: '기본 정보의 컨테이너명이 입력되지 않았습니다.' });
  data.templates.forEach((t, i) => {
    if (t.corners.length === 0) issues.push({ level: '오류', area: '설정 항목', detail: `${i + 1}번째 템플릿 '${t.name}'에 배치된 코너가 없습니다.`, templateId: t.id });
    if (!t.conditionGroup) issues.push({ level: '경고', area: '분기 조건', detail: `'${t.name}' 템플릿에 조건그룹이 설정되지 않았습니다.`, templateId: t.id });
    const noLimit = t.corners.filter((c) => c.maxItems == null);
    if (noLimit.length > 0) issues.push({ level: '경고', area: '노출 개수', detail: `'${t.name}'의 코너 ${noLimit.length}개에 노출 개수가 지정되지 않았습니다.`, templateId: t.id });
  });
  return issues;
}

/* 코너의 '선택지'(선택형 컴포넌트의 아톰 라벨)를 노출 옵션 체크박스로 — 없으면 옵션 설정 대상 아님 */
function cornerOptions(preview: PCorner['preview']): string[] {
  const out: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const c of ((preview as any)?.components ?? [])) {
    if (c?.componentType !== '선택형') continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const a of (c.atoms ?? [])) {
      const t = String(a?.content ?? a?.name ?? '').trim();
      if (t && !t.startsWith('@cvm') && !out.includes(t)) out.push(t);
    }
  }
  return out.slice(0, 6);
}

/* ───────── 코너 상세(카드 내부 우측) ───────── */
function CornerDetail({ template, corner, index, expose, onExpose, onToast }: {
  template: PTemplate; corner: PCorner | null; index: number; expose: string; onExpose: (v: string) => void; onToast: (m: string) => void;
}) {
  if (!corner) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-[12px] border border-dashed border-[var(--line2)] bg-[var(--th)] px-6 text-center text-[13px] leading-relaxed text-[var(--ink4)]">
        왼쪽에서 코너를 선택하면<br />상세 설정이 여기에 표시됩니다
      </div>
    );
  }
  const options = cornerOptions(corner.preview);
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-start gap-3 py-1.5 text-[13px]">
      <span className="w-[72px] shrink-0 text-[var(--ink3)]">{label}</span>
      <span className="min-w-0 flex-1 text-[var(--ink)]">{children}</span>
    </div>
  );
  return (
    <div className="rounded-[12px] border border-[var(--line)] bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-5 w-5 place-items-center rounded-[6px] bg-[var(--ac)] text-[11px] font-bold text-white">{index + 1}</span>
        <h4 className="min-w-0 flex-1 truncate text-[14px] font-bold text-[var(--ink)]">{corner.name}</h4>
        <button type="button" onClick={() => onToast('코너 삭제는 실제 빌더에서 처리됩니다.')} className="rounded-[6px] border border-[var(--line2)] px-2 py-1 text-[12px] font-medium text-[var(--ink3)] hover:border-[var(--bad)] hover:text-[var(--bad)]">코너 삭제</button>
      </div>

      <p className="mb-1 text-[13px] font-bold text-[var(--ink)]">코너 정보</p>
      <div className="mb-3">
        <Row label="코너 유형"><span className={cornerTypeChipClass(corner.cornerType)}>{corner.cornerType}</span></Row>
        <Row label="레이아웃">{layoutLabel(corner.layout) || corner.layout || '—'}</Row>
        <Row label="노출 개수">{corner.maxItems != null ? `~ ${corner.maxItems}개` : '제한 없음'}</Row>
        <Row label="코너 ID"><span className="text-[12px] text-[var(--ink3)]">{corner.id}</span></Row>
        <Row label="화면 내 순서">{index + 1}번째 · 코너 {template.corners.length}개</Row>
      </div>

      <p className="mb-1.5 text-[13px] font-bold text-[var(--ink)]">노출 옵션 설정</p>
      {options.length === 0 ? (
        <p className="rounded-[8px] bg-[var(--th)] px-3 py-2.5 text-[12px] leading-relaxed text-[var(--ink4)]">
          옵션 설정 대상이 아닙니다. 고객이 고르는 선택지가 없는 코너입니다.
        </p>
      ) : (
        <div>
          <div className="flex items-center gap-5 text-[13px] text-[var(--ink)]">
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={expose !== '조건 설정 후 노출'} onChange={() => onExpose('항상 노출')} className="accent-[var(--ac)]" /> 항상 노출
            </label>
            <label className={cn('flex items-center gap-1.5', index === 0 && 'text-[var(--ink4)]')}>
              <input type="radio" disabled={index === 0} checked={expose === '조건 설정 후 노출'} onChange={() => onExpose('조건 설정 후 노출')} className="accent-[var(--ac)]" /> 조건 설정 후 노출
            </label>
          </div>
          {index === 0 && <p className="mt-1.5 text-[12px] text-[var(--ink4)]">앞에 선택값이 있는 코너가 없어 조건을 설정할 수 없습니다.</p>}
          <div className="mt-2.5 space-y-1.5">
            {options.map((o) => (
              <label key={o} className="flex items-center gap-2 text-[13px] text-[var(--ink)]">
                <input type="checkbox" defaultChecked className="h-4 w-4 accent-[var(--ac)]" /> {o}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* 폴백 — CVM 수급 코너에서만. CVM 응답이 비면 어떻게 할지(2026-10-20) */}
      {corner.isCvm && (
        <div className="mt-4 rounded-[10px] border border-[#ffe4bf] bg-[#fff8ef] p-3">
          <p className="mb-1.5 flex items-center gap-1 text-[13px] font-bold text-[#b67a12]"><Layers className="h-3.5 w-3.5" /> 폴백 — CVM 응답이 비었을 때</p>
          <div className="space-y-1.5">
            {(['미노출', '운영자 편성으로 대체'] as const).map((f) => {
              const on = corner.fallback === f;
              return (
                <div key={f} className={cn('flex items-start gap-2 rounded-[8px] border px-2.5 py-2 text-[12px]', on ? 'border-[#f2c47a] bg-white' : 'border-transparent opacity-60')}>
                  <span className={cn('mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border', on ? 'border-[#e59a2a] bg-[#e59a2a]' : 'border-[var(--line3)]')}>{on && <span className="h-1.5 w-1.5 rounded-full bg-white" />}</span>
                  <span className="min-w-0 flex-1">
                    <b className="text-[var(--ink)]">{f === '미노출' ? '미노출 (기본)' : '운영자 편성으로 대체'}</b>
                    <span className="block text-[var(--ink4)]">{f === '미노출' ? 'CVM이 비면 이 코너는 노출되지 않아요.' : '등록된 운영자 편성 항목으로 대체 노출해요.'}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────── 템플릿 카드(= order3 '컨테이너' 카드) ───────── */
function TemplateCard({ t, idx, open, active, onToggle, onActivate, selCorner, onSelCorner, expose, onExpose, onToast }: {
  t: PTemplate; idx: number; open: boolean; active: boolean;
  onToggle: () => void; onActivate: () => void;
  selCorner: string | null; onSelCorner: (id: string) => void;
  expose: string; onExpose: (v: string) => void; onToast: (m: string) => void;
}) {
  const selIndex = t.corners.findIndex((c) => c.id === selCorner);
  const selected = selIndex >= 0 ? t.corners[selIndex] : null;
  return (
    <div className={cn('overflow-hidden rounded-[12px] border bg-white', active ? 'border-[var(--ac)]' : 'border-[var(--line2)]')}>
      {/* 카드 헤더 */}
      <div className={cn('flex items-center gap-2.5 px-4 py-3', active ? 'bg-[var(--ac2)]' : 'bg-[var(--th)]')}>
        <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-[var(--ink4)]" />
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[6px] bg-[var(--ac)] text-[12px] font-bold text-white">{idx + 1}</span>
        <button type="button" onClick={onActivate} className="min-w-0 flex-1 text-left">
          <span className="text-[14px] font-bold text-[var(--ink)]">{t.name}</span>
          {t.conditionGroup && <span className="ml-1.5 text-[12px] text-[var(--ink4)]">· {t.conditionGroup}</span>}
        </button>
        <span className="shrink-0 text-[12px] text-[var(--ink3)]">코너 {t.corners.length}개</span>
        {t.isDefault && <span className="shrink-0 rounded-[4px] bg-[var(--ac2)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--ac)]">기본</span>}
        <button type="button" onClick={onToggle} className="shrink-0 rounded-[6px] p-1 text-[var(--ink3)] hover:bg-white/60" title={open ? '접기' : '펼치기'}>
          <ChevronDown className={cn('h-4 w-4 transition', !open && '-rotate-90')} />
        </button>
      </div>

      {/* 카드 본문 */}
      {open && (
        <div className="space-y-4 p-4">
          <div>
            <label className="text-[13px] font-semibold text-[var(--ink2)]">템플릿명</label>
            <div className="mt-1.5 flex h-[38px] items-center rounded-[var(--r-field)] border border-[var(--line)] bg-[var(--th)] px-3 text-[13px] text-[var(--ink2)]">
              {t.name}{t.conditionGroup ? ` · ${t.conditionGroup}` : ''}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-semibold text-[var(--ink2)]">코너 구성 <span className="text-[var(--ink4)]">{t.corners.length}개</span></p>
            {t.corners.length === 0 ? (
              <div className="rounded-[12px] border border-dashed border-[var(--line2)] bg-[var(--th)] p-6 text-center text-[13px] leading-relaxed text-[var(--ink4)]">
                이 템플릿에 배치된 코너가 없습니다.<br />「코너 추가」로 코너 관리의 코너를 가져오세요.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,230px)_minmax(0,1fr)]">
                {/* 코너 칩 리스트 */}
                <div className="space-y-2">
                  <div className="max-h-[360px] space-y-1.5 overflow-y-auto">
                    {t.corners.map((c) => (
                      <button key={c.id} type="button" onClick={() => { onActivate(); onSelCorner(c.id); }}
                        className={cn('flex w-full items-center gap-2 rounded-[10px] border px-2.5 py-2 text-left transition',
                          c.id === selCorner ? 'border-[var(--ac)] bg-[var(--ac2)]' : 'border-[var(--line2)] bg-white hover:border-[var(--line3)]')}>
                        <GripVertical className="h-3.5 w-3.5 shrink-0 text-[var(--ink4)]" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold text-[var(--ink)]">{c.name}</span>
                          <span className="block truncate text-[11px] text-[var(--ink4)]">{c.cornerType}{c.layout ? ` · ${layoutLabel(c.layout) || c.layout}` : ''}</span>
                        </span>
                        <X className="h-3.5 w-3.5 shrink-0 text-[var(--ink4)] opacity-50 hover:text-[var(--bad)] hover:opacity-100" onClick={(e) => { e.stopPropagation(); onToast('코너 삭제는 실제 빌더에서 처리됩니다.'); }} />
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={() => onToast('코너 추가(코너 관리 불러오기)는 실제 빌더에서 처리됩니다.')}
                    className="flex w-full items-center justify-center gap-1 rounded-[10px] border border-dashed border-[var(--ac)] bg-[var(--ac2)] py-2.5 text-[13px] font-semibold text-[var(--ac)] hover:bg-[#e6e8ff]">
                    <Plus className="h-4 w-4" /> 코너 추가
                  </button>
                </div>
                {/* 코너 상세 */}
                <CornerDetail template={t} corner={selected} index={selIndex} expose={expose} onExpose={onExpose} onToast={onToast} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────── 루트 ───────── */
export function ProcessBuilder({ data }: { data: ProcessData }) {
  const [basicOpen, setBasicOpen] = React.useState(true);
  const [activeId, setActiveId] = React.useState(data.activeTemplateId);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(data.templates.map((t) => [t.id, t.id === data.activeTemplateId])));
  const [selCorner, setSelCorner] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(data.templates.map((t) => [t.id, t.corners[0]?.id ?? ''])));
  const [exposeMap, setExposeMap] = React.useState<Record<string, string>>({});
  const [fbMode, setFbMode] = React.useState(false); // 미리보기 정상 ↔ 폴백(CVM 비었을 때)
  const [toastMsg, setToastMsg] = React.useState<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = React.useCallback((m: string) => {
    setToastMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastMsg(null), 2400);
  }, []);
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // 구성 검증 — 하단 결과 패널(order3-create 레퍼런스)
  const [validation, setValidation] = React.useState<{ issues: Issue[]; at: string } | null>(null);
  const [panelOpen, setPanelOpen] = React.useState(false);
  const runValidate = React.useCallback(() => {
    setValidation({ issues: validate(data), at: new Date().toTimeString().slice(0, 5) });
    setPanelOpen(true);
  }, [data]);
  const gotoIssue = (tid?: string) => {
    if (tid) { setActiveId(tid); setExpanded((m) => ({ ...m, [tid]: true })); }
    setPanelOpen(false);
  };
  const errCount = validation?.issues.filter((i) => i.level === '오류').length ?? 0;
  const warnCount = validation?.issues.filter((i) => i.level === '경고').length ?? 0;

  const activeTemplate = data.templates.find((t) => t.id === activeId) ?? data.templates[0];
  const activeIdx = data.templates.findIndex((t) => t.id === activeTemplate?.id);
  const activeSel = activeTemplate ? selCorner[activeTemplate.id] : null;
  const totalCorners = data.templates.reduce((n, t) => n + t.corners.length, 0);

  const Field = ({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) => (
    <div className="flex items-center gap-3 py-2">
      <span className="flex w-[88px] shrink-0 items-center gap-1 text-[13px] text-[var(--ink3)]">{label}{required && <span className="text-[var(--bad)]">*</span>}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
  const inputCls = 'h-[38px] w-full rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-3 text-[13px] text-[var(--ink)] placeholder:text-[var(--ink4)] focus:border-[var(--ac)] focus:outline-none';

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-8 py-7 pb-24">
        {/* 헤더 */}
        <Link href="/admin/containers-test" className="inline-flex items-center gap-1 text-[13px] text-[var(--ink3)] hover:text-[var(--ink)]">
          <ChevronLeft className="h-4 w-4" /> 목록으로
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <h1 className="text-[22px] font-bold leading-[30px] tracking-[-0.4px] text-[var(--ink)]">{data.containerName}</h1>
          <span className="rounded-full border border-[var(--warnln)] bg-[var(--warnbg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--warn)]">테스트</span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(300px,340px)_minmax(0,1fr)]">
          {/* 좌: 미리보기(고정) */}
          <div className="xl:sticky xl:top-2 xl:self-start">
            <div className="rounded-[16px] border border-[var(--line)] bg-white p-4">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-[14px] font-bold text-[var(--ink)]">미리보기</h2>
                <span className="text-[12px] text-[var(--ink3)]">{activeIdx + 1}/{data.templates.length} · {activeTemplate?.name}</span>
              </div>
              {/* 정상 ↔ 폴백(CVM 비었을 때) 토글 */}
              <div className="mb-3 inline-flex rounded-[8px] border border-[var(--line2)] bg-[var(--th)] p-0.5 text-[12px] font-semibold">
                <button type="button" onClick={() => setFbMode(false)} className={cn('rounded-[6px] px-3 py-1', !fbMode ? 'bg-white text-[var(--ac)] shadow-sm' : 'text-[var(--ink3)]')}>정상</button>
                <button type="button" onClick={() => setFbMode(true)} className={cn('rounded-[6px] px-3 py-1', fbMode ? 'bg-white text-[#b67a12] shadow-sm' : 'text-[var(--ink3)]')}>폴백</button>
              </div>
              {fbMode && <p className="mb-2 flex items-center gap-1 text-[11px] text-[#b67a12]"><Layers className="h-3 w-3" /> CVM이 비면 이렇게 노출됩니다 (CVM 수급 코너만 바뀜)</p>}
              <div className="rounded-[12px] bg-[var(--th)] py-5">
                <DeviceFrame width={300} bodyHeight={470} headerLabel={data.containerName}>
                  {activeTemplate && activeTemplate.corners.length > 0 ? (
                    activeTemplate.corners.map((c) => {
                      const hidden = fbMode && c.isCvm && c.fallback === '미노출';
                      const replaced = fbMode && c.isCvm && c.fallback === '운영자 편성으로 대체';
                      if (hidden) {
                        return (
                          <div key={c.id} onClick={() => setSelCorner((m) => ({ ...m, [activeTemplate.id]: c.id }))}
                            className={cn('cursor-pointer rounded-xl border border-dashed border-[#f2c47a] bg-[#fff8ef] px-3 py-4 text-center', c.id === activeSel && 'ring-2 ring-[var(--ac)] ring-offset-2')}>
                            <EyeOff className="mx-auto mb-1 h-4 w-4 text-[#b67a12]" />
                            <p className="text-[11px] font-semibold text-[#b67a12]">{c.name} · 미노출</p>
                            <p className="text-[10px] text-[#c99a4e]">CVM이 비어 노출되지 않아요</p>
                          </div>
                        );
                      }
                      return (
                        <div key={c.id} onClick={() => setSelCorner((m) => ({ ...m, [activeTemplate.id]: c.id }))}
                          className={cn('relative cursor-pointer rounded-xl ring-offset-2 transition', c.id === activeSel && 'ring-2 ring-[var(--ac)]')}>
                          {replaced && <span className="absolute right-1 top-1 z-10 rounded-[4px] bg-[#e59a2a] px-1.5 py-0.5 text-[9px] font-bold text-white">운영자 편성 대체</span>}
                          <CornerBlock corner={c.preview} />
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 text-[13px] text-slate-400">코너 구성 시 미리보기가 표시됩니다.</div>
                  )}
                </DeviceFrame>
              </div>
            </div>
          </div>

          {/* 우: 기본 정보 + 템플릿 구성 + 구성 검증 */}
          <div className="space-y-6">
            {/* 기본 정보 */}
            <section className="rounded-[16px] border border-[var(--line)] bg-white">
              <div className="flex items-center gap-2 px-5 py-4">
                <h2 className="text-[15px] font-bold text-[var(--ink)]">기본 정보</h2>
                <span className="rounded-full border border-[var(--line2)] bg-[var(--th)] px-2 py-0.5 text-[11px] font-medium text-[var(--ink3)]">조회</span>
                <button type="button" onClick={() => setBasicOpen((v) => !v)} className="ml-auto rounded-[6px] p-1 text-[var(--ink3)] hover:bg-[var(--th)]">
                  <ChevronDown className={cn('h-4 w-4 transition', !basicOpen && '-rotate-90')} />
                </button>
              </div>
              {basicOpen && (
                <div className="border-t border-[var(--line)] px-5 py-3">
                  <Field label="유형" required>
                    <div className="relative">
                      <select defaultValue={data.containerType} className={cn(inputCls, 'appearance-none pr-9')}>
                        {TYPE_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink4)]" />
                    </div>
                  </Field>
                  <Field label="플랫폼">
                    <div className="flex h-[38px] items-center rounded-[var(--r-field)] border border-[var(--line)] bg-[var(--th)] px-3 text-[13px] text-[var(--ink2)]">{data.platform}</div>
                  </Field>
                  <Field label="컨테이너 ID">
                    <div className="flex h-[38px] items-center rounded-[var(--r-field)] border border-[var(--line)] bg-[var(--th)] px-3 text-[13px] text-[var(--ink3)]">{data.containerId.slice(-10)}</div>
                  </Field>
                  <Field label="컨테이너명" required>
                    <input defaultValue={data.containerName} className={inputCls} />
                  </Field>
                  <Field label="설명">
                    <input defaultValue={data.description ?? ''} placeholder="어떤 화면 구성인지 입력하세요." className={inputCls} />
                  </Field>
                  <Field label="전시 여부">
                    <div className="flex items-center gap-5 text-[13px] text-[var(--ink)]">
                      <label className="flex items-center gap-1.5"><input type="radio" name="displayOn" defaultChecked={data.status === 'active'} className="accent-[var(--ac)]" /> Y</label>
                      <label className="flex items-center gap-1.5"><input type="radio" name="displayOn" defaultChecked={data.status !== 'active'} className="accent-[var(--ac)]" /> N</label>
                    </div>
                  </Field>
                </div>
              )}
            </section>

            {/* 템플릿 구성 */}
            <section>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-[15px] font-bold text-[var(--ink)]">템플릿 구성</h2>
                <span className="text-[13px] text-[var(--ink3)]">총 {data.templates.length}개</span>
                <div className="ml-auto flex gap-1.5">
                  <button type="button" onClick={() => setExpanded({})} className="inline-flex items-center gap-1 rounded-[6px] border border-[var(--line2)] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]">모두 접기</button>
                  <button type="button" onClick={() => toast('복제는 실제 빌더에서 처리됩니다.')} className="inline-flex items-center gap-1 rounded-[6px] border border-[var(--line2)] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]"><Copy className="h-3.5 w-3.5" /> 복제하기</button>
                </div>
              </div>

              <div className="space-y-3">
                {data.templates.map((t, i) => (
                  <TemplateCard
                    key={t.id}
                    t={t}
                    idx={i}
                    open={expanded[t.id] ?? false}
                    active={t.id === activeId}
                    onToggle={() => setExpanded((m) => ({ ...m, [t.id]: !(m[t.id] ?? false) }))}
                    onActivate={() => { setActiveId(t.id); setExpanded((m) => ({ ...m, [t.id]: true })); }}
                    selCorner={selCorner[t.id] ?? null}
                    onSelCorner={(id) => setSelCorner((m) => ({ ...m, [t.id]: id }))}
                    expose={(selCorner[t.id] && exposeMap[`${t.id}:${selCorner[t.id]}`]) || '항상 노출'}
                    onExpose={(v) => setExposeMap((m) => ({ ...m, [`${t.id}:${selCorner[t.id]}`]: v }))}
                    onToast={toast}
                  />
                ))}
              </div>

              <button type="button" onClick={() => toast('템플릿 추가는 실제 빌더에서 처리됩니다.')}
                className="mt-3 flex w-full items-center justify-center gap-1 rounded-[12px] border border-dashed border-[var(--line3)] bg-white py-3 text-[13px] font-semibold text-[var(--ink2)] hover:border-[var(--ac)] hover:text-[var(--ac)]">
                <Plus className="h-4 w-4" /> 템플릿 추가
              </button>
            </section>

            {/* 구성 검증 */}
            <section className="rounded-[16px] border border-[var(--line)] bg-white px-5 py-4">
              <div className="flex items-center gap-2">
                <h2 className="text-[14px] font-bold text-[var(--ink)]">구성 검증</h2>
                {!validation ? (
                  <span className="rounded-full border border-[var(--line2)] bg-[var(--th)] px-2 py-0.5 text-[11px] font-medium text-[var(--ink3)]">미검증</span>
                ) : errCount > 0 ? (
                  <span className="rounded-full border border-[#ffd0d2] bg-[#fff0f1] px-2 py-0.5 text-[11px] font-semibold text-[var(--bad)]">오류 {errCount}건</span>
                ) : (
                  <span className="rounded-full border border-[#bfe7cf] bg-[#eefaf1] px-2 py-0.5 text-[11px] font-semibold text-[#00a058]">검증 통과</span>
                )}
                <button type="button" onClick={runValidate} className="ml-auto rounded-[6px] border border-[var(--line2)] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]">{validation ? '다시 검증' : '검증 실행'}</button>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink4)]">
                ‘전체 구성 검증’을 클릭하면 코너 간 조건 충돌 · 코너 상태 변경 영향 · 설정 항목을 확인합니다.
              </p>
            </section>
          </div>
        </div>
      </div>

      {/* 구성 검증 결과 — 하단 시트(order3-create 레퍼런스) */}
      {panelOpen && validation && (
        <div className="absolute inset-x-0 bottom-[60px] z-20 border-t border-[var(--line)] bg-white shadow-[0_-12px_24px_rgba(25,25,60,.08)]">
          <div className="mx-auto max-w-[1100px] px-8 py-4">
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-bold text-[var(--ink)]">구성 검증</h3>
              {errCount > 0 ? (
                <span className="rounded-full border border-[#ffd0d2] bg-[#fff0f1] px-2 py-0.5 text-[11px] font-semibold text-[var(--bad)]">오류 {errCount}건</span>
              ) : (
                <span className="rounded-full border border-[#bfe7cf] bg-[#eefaf1] px-2 py-0.5 text-[11px] font-semibold text-[#00a058]">통과</span>
              )}
              <span className="text-[12px] text-[var(--ink4)]">{validation.at} 검증</span>
              <button type="button" onClick={runValidate} className="ml-auto rounded-[6px] border border-[var(--line2)] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]">다시 검증</button>
              <button type="button" onClick={() => setPanelOpen(false)} className="rounded-[6px] p-1.5 text-[var(--ink3)] hover:bg-[var(--th)]"><X className="h-4 w-4" /></button>
            </div>

            {validation.issues.length === 0 ? (
              <div className="mt-3 rounded-[12px] border border-[#bfe7cf] bg-[#eefaf1] px-4 py-3 text-[13px] font-medium text-[#007a43]">검증 통과 — 오류 0건 / 경고 0건</div>
            ) : (
              <div className="mt-3 max-h-[220px] overflow-y-auto rounded-[12px] border border-[#ffd9db] bg-[#fff6f6] px-4 py-3">
                <p className="mb-2 text-[13px] font-bold text-[var(--bad)]">검증 {errCount > 0 ? '실패' : '완료'} — 오류 {errCount}건 / 경고 {warnCount}건</p>
                <ul className="space-y-1.5">
                  {validation.issues.map((it, i) => (
                    <li key={i} className="flex items-center gap-2 text-[13px]">
                      <span className={cn('shrink-0 rounded-[4px] px-1.5 py-0.5 text-[11px] font-semibold', it.level === '오류' ? 'bg-[#ffe0e1] text-[var(--bad)]' : 'bg-[#fff0d6] text-[#b67a12]')}>{it.level}</span>
                      <span className="min-w-0 flex-1 text-[var(--ink2)]"><b className="text-[var(--ink)]">[{it.area}]</b> {it.detail}</span>
                      {it.templateId && <button type="button" onClick={() => gotoIssue(it.templateId)} className="shrink-0 text-[12px] font-semibold text-[var(--ac)] hover:underline">바로가기</button>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 하단 고정 액션 바 */}
      <div className="sticky bottom-0 z-30 flex items-center gap-3 border-t border-[var(--line)] bg-white/95 px-8 py-3 backdrop-blur">
        <span className="text-[13px] text-[var(--ink3)]">템플릿 <b className="text-[var(--ink)]">{data.templates.length}</b>개 · 코너 <b className="text-[var(--ink)]">{totalCorners}</b>개</span>
        <button type="button" onClick={() => validation ? setPanelOpen((v) => !v) : runValidate()}
          className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-medium',
            !validation ? 'border-[var(--line2)] bg-[var(--th)] text-[var(--ink3)]' : errCount > 0 ? 'border-[#ffd0d2] bg-[#fff0f1] text-[var(--bad)]' : 'border-[#bfe7cf] bg-[#eefaf1] text-[#00a058]')}>
          <ShieldCheck className="h-3.5 w-3.5" /> 구성 검증 {!validation ? '미검증' : errCount > 0 ? `오류 ${errCount}건` : '통과'}
          {validation && <ChevronDown className={cn('h-3.5 w-3.5 transition', panelOpen && 'rotate-180')} />}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={() => toast('취소')} className="h-[38px] rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-4 text-[13px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]">취소</button>
          <button type="button" onClick={runValidate} className="h-[38px] rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-4 text-[13px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]">전체 구성 검증</button>
          <button type="button" onClick={() => toast('저장되었습니다. (데모)')} className="h-[38px] rounded-[var(--r-field)] bg-[var(--ac)] px-5 text-[13px] font-bold text-white hover:bg-[var(--ac-h)]"><Pencil className="mr-1 inline h-3.5 w-3.5" />저장</button>
        </div>
      </div>

      {toastMsg && (
        <div className="pointer-events-none fixed bottom-20 left-1/2 z-[90] -translate-x-1/2">
          <div className="rounded-[8px] bg-[var(--toast-bg)] px-4 py-2.5 text-[13px] text-white shadow-[var(--dlg-shadow)]">{toastMsg}</div>
        </div>
      )}
    </div>
  );
}
