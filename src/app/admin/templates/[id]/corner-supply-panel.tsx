'use client';

/**
 * 코너 수급 파이프라인 — 빌더 우측 패널의 뼈대 (2026-10-08 CVM 협의 반영).
 *
 * 회의에서 정해진 모델을 화면 순서 그대로 보여준다.
 *   ① 껍데기   — '코너 불러오기'로 가져오는 건 레이아웃·노출 타입뿐. 내용은 비어 있다.
 *   ② 수급     — 이 자리를 누가 채우나. 한 구좌는 한 방식만(겸용 금지).
 *   ③ 채우기   — 운영자 편성이면 상품 등록, CVM이면 무엇을 요청할지(계약).
 *   ④ 폴백     — 못 받았을 때. 기본은 미노출(기본 배너 상시 운영 불가).
 *   ⑤ 출처 맵  — 각 표시 요소를 누가 소유하나(SSOT).
 */

import { useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import {
  REC_SOURCE_METHODS,
  REC_SOURCE_INFO,
  normalizeRecSource,
  isCvmSource,
  CVM_CATALOGS,
  CVM_TOP_N_MAX,
  CVM_OUT_OF_SCOPE,
  CVM_FALLBACKS,
  FIELD_OWNER_TONE,
  fieldOwnerMap,
  CHIP_BASE,
  type FieldOwner,
} from '@/lib/display-taxonomy';
import { setCornerSupply } from '@/app/admin/templates/actions';
import { Layers, Lock, Sparkles, PackageSearch, ShieldAlert, ArrowRight, Info } from 'lucide-react';

export type SupplyCorner = {
  id: string;
  name: string;
  cornerType: string;
  layoutDetail: string | null;
  cornerLayout: string | null;
  maxItems: number | null;
  recSource: string | null;
  cvmCatalog: string | null;
  cvmTopN: number | null;
  cvmSlotId: string | null;
  cvmFallback: string | null;
  /** 운영자가 실제로 등록해 둔 항목 수 — 폴백 가능 여부 판단에 쓴다. */
  itemCount: number;
};

/* ── 소품 ───────────────────────────────────────────────────────── */

function Step({ no, title, desc, children, tone }: { no: number; title: string; desc?: string; children: React.ReactNode; tone?: 'muted' }) {
  return (
    <section className={cn('rounded-[10px] border border-[var(--line)] bg-white p-3.5', tone === 'muted' && 'bg-[var(--th)]')}>
      <div className="mb-2.5 flex items-baseline gap-2">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--ac)] text-[11px] font-bold text-white">{no}</span>
        <h3 className="text-[13px] font-bold text-[var(--ink)]">{title}</h3>
      </div>
      {desc && <p className="-mt-1.5 mb-2.5 pl-7 text-[11px] leading-relaxed text-[var(--ink3)]">{desc}</p>}
      <div className="pl-7">{children}</div>
    </section>
  );
}

function OwnerChip({ owner }: { owner: FieldOwner }) {
  return <span className={cn(CHIP_BASE, 'h-[22px] text-[11px]', FIELD_OWNER_TONE[owner])}>{owner}</span>;
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 border-b border-[var(--line)] py-1.5 last:border-b-0">
      <span className="w-[92px] shrink-0 text-[11px] text-[var(--ink3)]">{k}</span>
      <span className="min-w-0 flex-1 text-[11.5px] text-[var(--ink)]">{v}</span>
    </div>
  );
}

/* ── ① 껍데기 ───────────────────────────────────────────────────── */

function ShellStep({ corner }: { corner: SupplyCorner }) {
  return (
    <Step
      no={1}
      title="껍데기 — 코너 유형에서 가져옴"
      desc="‘코너 불러오기’로 가져오는 건 레이아웃·노출 타입까지입니다. 내용물은 비어 있고, 아래에서 채웁니다."
    >
      <div className="rounded-[8px] bg-[var(--th)] p-2.5">
        <Row k="코너 유형" v={corner.cornerType} />
        <Row k="배열·레이아웃" v={corner.layoutDetail || corner.cornerLayout || '—'} />
        <Row k="노출 개수" v={corner.maxItems != null ? `최대 ${corner.maxItems}개` : '—'} />
      </div>
      <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-[var(--ink3)]">
        <Lock className="mt-0.5 h-3 w-3 shrink-0" />
        <span>이 세 가지는 <b className="text-[var(--ink2)]">코너 유형 관리</b>(DS·개발 영역)에서 정의합니다. 빌더에서는 바꿀 수 없어요.</span>
      </p>
    </Step>
  );
}

/* ── ② 수급 방식 ────────────────────────────────────────────────── */

const MODE_ICON: Record<string, React.ReactNode> = {
  '운영자 편성': <PackageSearch className="h-3.5 w-3.5" />,
  'CVM 데이터 연동': <Sparkles className="h-3.5 w-3.5" />,
  'CVM 콘텐츠 연동': <Sparkles className="h-3.5 w-3.5" />,
};

function SupplyStep({
  mode,
  onPick,
  pending,
}: {
  mode: string;
  onPick: (m: string) => void;
  pending: boolean;
}) {
  return (
    <Step
      no={2}
      title="수급 — 이 자리를 누가 채우나"
      desc="한 구좌는 한 방식만 씁니다. CVM 구좌로 넘기면 그 자리는 CVM이 통제합니다(겸용 불가)."
    >
      <div className="space-y-1.5">
        {REC_SOURCE_METHODS.map((m) => {
          const info = REC_SOURCE_INFO[m];
          const on = mode === m;
          return (
            <button
              key={m}
              type="button"
              disabled={pending}
              onClick={() => onPick(m)}
              className={cn(
                'w-full rounded-[8px] border p-2.5 text-left transition disabled:opacity-50',
                on ? 'border-[var(--ac)] bg-[var(--ac2)]' : 'border-[var(--line)] bg-white hover:border-[var(--line2)]',
              )}
            >
              <span className="flex items-center gap-1.5">
                <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-full border', on ? 'border-[var(--ac)] bg-[var(--ac)]' : 'border-[#c9ccd6] bg-white')}>
                  {on && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
                <span className={cn('flex items-center gap-1 text-[12.5px] font-bold', on ? 'text-[var(--ac)]' : 'text-[var(--ink)]')}>
                  {MODE_ICON[m]} {m}
                </span>
              </span>
              <span className="mt-1.5 block pl-5.5 text-[11px] leading-relaxed text-[var(--ink2)]">{info.how}</span>
              <span className="mt-1.5 flex flex-wrap items-center gap-1 pl-5.5 text-[10.5px]">
                <span className="rounded-[4px] bg-[#D9E9FF] px-1.5 py-px font-semibold text-[#2E7AFF]">CVM이 줌 · {info.cvmGives}</span>
                <ArrowRight className="h-3 w-3 text-[var(--ink3)]" />
                <span className="rounded-[4px] bg-[#FFE4C4] px-1.5 py-px font-semibold text-[#D66400]">우리가 채움 · {info.weBuild}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Step>
  );
}

/* ── ③ CVM 계약 ─────────────────────────────────────────────────── */

function CvmContractStep({
  corner,
  mode,
  onSave,
  pending,
}: {
  corner: SupplyCorner;
  mode: string;
  onSave: (p: { cvmCatalog?: string | null; cvmTopN?: number | null; cvmSlotId?: string | null }) => void;
  pending: boolean;
}) {
  const isData = mode === 'CVM 데이터 연동';
  const [slot, setSlot] = useState(corner.cvmSlotId ?? '');
  const topN = corner.cvmTopN ?? Math.min(corner.maxItems ?? 3, CVM_TOP_N_MAX);

  return (
    <Step
      no={3}
      title={isData ? '요청 — CVM에 무엇을 달라고 할지' : '구좌 — CVM에 넘길 자리'}
      desc={
        isData
          ? 'CVM은 프로덕트 카탈로그 중분류 단위로, 고객별 Top 5까지 내려줍니다. 세그먼트가 아니라 개별 고객 단위입니다.'
          : '이 자리는 CVM 캠페인 구좌가 됩니다. 이미지·문구·랜딩까지 받은 그대로 노출하고, 빌더 미리보기에는 폴백이 보입니다.'
      }
    >
      {isData ? (
        <div className="space-y-2.5">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold text-[var(--ink2)]">요청 중분류</p>
            <div className="flex flex-wrap gap-1.5">
              {CVM_CATALOGS.map((c) => {
                const on = corner.cvmCatalog === c;
                return (
                  <button
                    key={c}
                    type="button"
                    disabled={pending}
                    onClick={() => onSave({ cvmCatalog: on ? null : c, cvmTopN: topN })}
                    className={cn(
                      'rounded-[6px] px-2.5 py-1 text-[11.5px] font-semibold transition disabled:opacity-50',
                      on ? 'bg-[var(--ac)] text-white' : 'bg-[var(--th)] text-[var(--ink2)] hover:bg-[#eceef3]',
                    )}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold text-[var(--ink2)]">요청 개수</p>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: CVM_TOP_N_MAX }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={pending || !corner.cvmCatalog}
                  onClick={() => onSave({ cvmCatalog: corner.cvmCatalog, cvmTopN: n })}
                  className={cn(
                    'h-7 w-7 rounded-[6px] text-[12px] font-semibold transition disabled:opacity-40',
                    topN === n && corner.cvmCatalog ? 'bg-[var(--ac)] text-white' : 'bg-[var(--th)] text-[var(--ink2)] hover:bg-[#eceef3]',
                  )}
                >
                  {n}
                </button>
              ))}
              <span className="ml-1 text-[10.5px] text-[var(--ink3)]">CVM 상한 {CVM_TOP_N_MAX}</span>
            </div>
          </div>
          {corner.cvmCatalog && (
            <p className="rounded-[6px] bg-[#D9E9FF] px-2.5 py-2 text-[11px] leading-relaxed text-[#2E7AFF]">
              이 고객에게 맞는 <b>{corner.cvmCatalog}</b> {topN}개를 순서대로 주세요 — 이미지·설명 문구는 상품 원장에서 붙입니다.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold text-[var(--ink2)]">CVM 구좌 ID</span>
            <input
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              onBlur={() => slot !== (corner.cvmSlotId ?? '') && onSave({ cvmSlotId: slot })}
              placeholder="예: SLOT-MAIN-BNR-01"
              disabled={pending}
              className="h-8 w-full rounded-[6px] border border-[var(--line2)] px-2.5 text-[12px] outline-none focus:border-[var(--ac)] disabled:opacity-50"
            />
          </label>
          <p className="flex items-start gap-1.5 rounded-[6px] bg-[#D9E9FF] px-2.5 py-2 text-[11px] leading-relaxed text-[#2E7AFF]">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            <span>이 구좌의 배너는 <b>CVM에서 등록</b>합니다. 전시 어드민에 따로 등록하지 마세요(이중 등록 방지).</span>
          </p>
        </div>
      )}

      {/* CVM이 못 주는 것 — 요청해도 안 되는 걸 미리 알려 헛돌지 않게 */}
      <details className="mt-2.5 rounded-[6px] bg-[var(--th)] px-2.5 py-2">
        <summary className="cursor-pointer text-[11px] font-semibold text-[var(--ink2)]">CVM이 주지 않는 것 {CVM_OUT_OF_SCOPE.length}가지</summary>
        <ul className="mt-1.5 space-y-1.5">
          {CVM_OUT_OF_SCOPE.map((o) => (
            <li key={o.item} className="text-[10.5px] leading-relaxed text-[var(--ink3)]">
              <b className="text-[var(--ink2)]">{o.item}</b> — {o.why}
              <br />
              <span className="text-[var(--ac)]">↳ {o.instead}</span>
            </li>
          ))}
        </ul>
      </details>
    </Step>
  );
}

/* ── ④ 폴백 ─────────────────────────────────────────────────────── */

function FallbackStep({
  corner,
  onSave,
  pending,
}: {
  corner: SupplyCorner;
  onSave: (f: string) => void;
  pending: boolean;
}) {
  const cur = corner.cvmFallback ?? '미노출';
  return (
    <Step no={4} title="폴백 — CVM 응답이 비었을 때" desc="기본은 미노출입니다. 대체용 기본 배너를 상시 운영할 수는 없다는 전제(2026-10-08).">
      <div className="space-y-1.5">
        {CVM_FALLBACKS.map((f) => {
          const on = cur === f;
          const blocked = f === '운영자 편성으로 대체' && corner.itemCount === 0;
          return (
            <button
              key={f}
              type="button"
              disabled={pending || blocked}
              onClick={() => onSave(f)}
              className={cn(
                'flex w-full items-center gap-2 rounded-[8px] border p-2.5 text-left transition disabled:opacity-50',
                on ? 'border-[var(--ac)] bg-[var(--ac2)]' : 'border-[var(--line)] bg-white hover:border-[var(--line2)]',
              )}
            >
              <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-full border', on ? 'border-[var(--ac)] bg-[var(--ac)]' : 'border-[#c9ccd6] bg-white')}>
                {on && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn('block text-[12px] font-semibold', on ? 'text-[var(--ac)]' : 'text-[var(--ink)]')}>{f}</span>
                <span className="block text-[10.5px] leading-relaxed text-[var(--ink3)]">
                  {f === '미노출'
                    ? '코너 자체를 숨깁니다. 빈 자리가 남지 않아요.'
                    : blocked
                      ? '아래에 등록된 항목이 없어 쓸 수 없습니다. 먼저 상품을 등록하세요.'
                      : `운영자가 등록한 ${corner.itemCount}개를 대신 노출합니다.`}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </Step>
  );
}

/* ── ⑤ 출처 맵 ──────────────────────────────────────────────────── */

function OwnerMapStep({ recSource }: { recSource: string | null }) {
  const rows = fieldOwnerMap(recSource);
  return (
    <Step no={5} title="출처 — 이 값이 어디서 오나" tone="muted">
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.field} className="flex items-start gap-2">
            <span className="w-[108px] shrink-0 pt-0.5 text-[11.5px] font-medium text-[var(--ink)]">{r.field}</span>
            <span className="shrink-0">
              <OwnerChip owner={r.owner} />
            </span>
            <span className="min-w-0 flex-1 pt-0.5 text-[10.5px] leading-relaxed text-[var(--ink3)]">{r.note}</span>
          </div>
        ))}
      </div>
    </Step>
  );
}

/* ── 본체 ───────────────────────────────────────────────────────── */

export function CornerSupplyPanel({
  templateId,
  corner,
  children,
}: {
  templateId: string;
  corner: SupplyCorner;
  /** ③에서 '운영자 편성'일 때 그대로 끼워 넣는 기존 상품 등록 UI */
  children?: React.ReactNode;
}) {
  const [pending, start] = useTransition();
  const mode = corner.recSource ? normalizeRecSource(corner.recSource) : '운영자 편성';
  const cvm = isCvmSource(mode);

  const save = (patch: Partial<Parameters<typeof setCornerSupply>[2]>) =>
    start(async () => {
      await setCornerSupply(templateId, corner.id, {
        recSource: mode,
        cvmCatalog: corner.cvmCatalog,
        cvmTopN: corner.cvmTopN,
        cvmSlotId: corner.cvmSlotId,
        cvmFallback: corner.cvmFallback ?? '미노출',
        ...patch,
      });
    });

  return (
    <div className="space-y-2.5">
      <ShellStep corner={corner} />

      <SupplyStep mode={mode} pending={pending} onPick={(m) => save({ recSource: m })} />

      {cvm ? (
        <>
          <CvmContractStep corner={corner} mode={mode} pending={pending} onSave={(p) => save(p)} />
          <FallbackStep corner={corner} pending={pending} onSave={(f) => save({ cvmFallback: f })} />
          {/* CVM 구좌라도 폴백이 '운영자 편성'이면 등록해 둔 항목이 필요하다 → 등록 UI를 계속 연다 */}
          {corner.cvmFallback === '운영자 편성으로 대체' && (
            <Step no={5} title="폴백용 항목" desc="CVM이 비었을 때 대신 나갈 항목입니다.">
              {children}
            </Step>
          )}
        </>
      ) : (
        <Step no={3} title="채우기 — 상품 등록" desc="등록한 항목이 정한 순서 그대로 나갑니다. CVM 연동으로 바꾸면 이 구성은 폴백으로 쓰입니다.">
          {children}
        </Step>
      )}

      <OwnerMapStep recSource={mode} />

      {cvm && (
        <p className="flex items-start gap-1.5 rounded-[8px] bg-[#FFE4C4] px-2.5 py-2 text-[11px] leading-relaxed text-[#D66400]">
          <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            개인화 전시는 <b>마케팅 수신·위치 정보 동의</b> 여부에 걸릴 수 있습니다(통합회원 확인 중, 2026-10-08). 동의가 없으면 폴백으로 처리됩니다.
          </span>
        </p>
      )}
    </div>
  );
}

export { Step as SupplyStepCard, OwnerChip as SupplyOwnerChip, Layers as SupplyLayersIcon };
