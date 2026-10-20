'use client';

/**
 * 전시화면 관리 (테스트) — 상세 빌더(디바이스 미리보기 좌 · 편집 패널 2개 우).
 *  목록(/admin/containers-test)에서 템플릿 행을 누르면 이 상세로 들어온다(2026-10-20 사용자 요청).
 *  데이터는 실제 '혜택 홈' 등 Container 의 Template·Corner 를 서버에서 받아 채운다(상품 더미 아님).
 *  좌: 실제 코너를 렌더한 디바이스 미리보기 · 중: 코너 설정(템플릿 탭·코너 리스트) · 우: 코너 상세 설정.
 *  기존 전시화면 관리(/admin/containers)·실제 빌더(/admin/templates/[id]/builder)는 건드리지 않는다.
 */
import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { DeviceFrame, CornerBlock, type PreviewCorner } from '@/components/preview/blocks';
import { cornerTypeChipClass, layoutLabel } from '@/lib/display-taxonomy';
import { ChevronDown, ChevronLeft } from 'lucide-react';

/* ---------------- 모델(서버에서 받음) ---------------- */
export type TestCorner = {
  id: string;
  name: string;
  cornerType: string;
  layout: string | null;
  maxItems: number | null;
  preview: PreviewCorner;
};
export type TestTemplate = {
  id: string;
  name: string;
  conditionGroup: string | null;
  isDefault: boolean;
  corners: TestCorner[];
};
export type BuilderData = {
  containerName: string;
  templates: TestTemplate[];
  activeId: string;
};

const EXPOSE_OPTS = ['항상 노출', '조건 노출', '로그인 시 노출', '비로그인 시 노출', '미노출'];

/* 패널 카드 — 모듈 스코프(렌더마다 재마운트되지 않게) */
function Card({ title, action, children, bodyClass }: { title: string; action?: React.ReactNode; children: React.ReactNode; bodyClass?: string }) {
  return (
    <section className="flex flex-col rounded-[16px] border border-[var(--line)] bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-[var(--ink)]">{title}</h2>
        {action}
      </div>
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

/* ---------------- 우측: 코너 상세 설정 ---------------- */
function CornerDetail({ template, corner, index, total, expose, onExpose }: {
  template: TestTemplate; corner: TestCorner | null; index: number; total: number;
  expose: string; onExpose: (v: string) => void;
}) {
  if (!corner) {
    return <p className="text-[14px] text-[var(--ink3)]">가운데 목록에서 코너를 선택하면 상세 설정이 표시됩니다.</p>;
  }
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-start gap-3 py-2 text-[14px]">
      <span className="w-20 shrink-0 text-[var(--ink3)]">{label}</span>
      <span className="min-w-0 flex-1 text-[var(--ink)]">{children}</span>
    </div>
  );
  return (
    <div>
      <p className="text-[14px] font-bold text-[var(--ink)]">코너 정보</p>
      <div className="mt-2">
        <Row label="코너명"><span className="font-semibold">{corner.name}</span></Row>
        <Row label="코너 유형"><span className={cornerTypeChipClass(corner.cornerType)}>{corner.cornerType}</span></Row>
        <Row label="레이아웃">{layoutLabel(corner.layout) || corner.layout || '—'}</Row>
        <Row label="노출 개수">{corner.maxItems != null ? `~ ${corner.maxItems}개` : '제한 없음'}</Row>
        <Row label="코너 ID"><span className="text-[13px] text-[var(--ink3)]">{corner.id}</span></Row>
        <Row label="화면 내 순서">{index + 1}번째 / 총 {total}개</Row>
      </div>

      <div className="mt-6">
        <p className="text-[14px] font-bold text-[var(--ink)]">노출 옵션 설정</p>
        <div className="relative mt-2">
          <select
            value={expose}
            onChange={(e) => onExpose(e.target.value)}
            className="h-[42px] w-full appearance-none rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-3.5 pr-10 text-[14px] text-[var(--ink)] focus:border-[var(--ac)] focus:outline-none"
          >
            {EXPOSE_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink4)]" />
        </div>
      </div>

      <div className="mt-6">
        <p className="text-[14px] font-bold text-[var(--ink)]">코너 구성</p>
        <p className="mt-2 text-[13px] leading-[19px] text-[var(--ink4)]">
          코너의 컴포넌트·아톰 구성과 수급 방식은 실제 빌더(전시화면 관리 › 템플릿 빌더)에서 편집합니다.
          이 화면은 배치·노출 테스트용입니다.
        </p>
      </div>
    </div>
  );
}

/* ---------------- 루트 ---------------- */
export function ScreenBuilderTest({ data }: { data: BuilderData }) {
  const initial = Math.max(0, data.templates.findIndex((t) => t.id === data.activeId));
  const [tab, setTab] = React.useState(initial < 0 ? 0 : initial);
  const template = data.templates[tab] ?? data.templates[0];

  const [selId, setSelId] = React.useState<string | null>(template?.corners[0]?.id ?? null);
  const [exposeMap, setExposeMap] = React.useState<Record<string, string>>({});

  // 탭이 바뀌면 첫 코너 선택
  React.useEffect(() => {
    setSelId(template?.corners[0]?.id ?? null);
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const selIndex = template ? template.corners.findIndex((c) => c.id === selId) : -1;
  const selected = selIndex >= 0 ? template.corners[selIndex] : null;

  return (
    <div className="px-10 py-8 pb-24">
      {/* 상단: 뒤로 + 타이틀 */}
      <div className="mb-5">
        <Link href="/admin/containers-test" className="inline-flex items-center gap-1 text-[14px] text-[var(--ink3)] hover:text-[var(--ink)]">
          <ChevronLeft className="h-4 w-4" /> 목록으로
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <h1 className="text-[24px] font-bold leading-[32px] tracking-[-0.6px] text-[var(--ink)]">{data.containerName}</h1>
          <span className="rounded-[6px] bg-[var(--ac2)] px-2 py-0.5 text-[13px] font-semibold text-[var(--ac)]">{template?.name}</span>
          <span className="rounded-full border border-[var(--warnln)] bg-[var(--warnbg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--warn)]">테스트</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(320px,360px)_minmax(0,1fr)_minmax(300px,340px)]">
        {/* 좌: 미리보기(실제 코너 렌더) */}
        <Card title="미리보기">
          <div className="rounded-[14px] bg-[var(--th)] py-6">
            <DeviceFrame width={330} bodyHeight={520} headerLabel={data.containerName}>
              {template && template.corners.length > 0 ? (
                template.corners.map((c) => (
                  <div key={c.id} onClick={() => setSelId(c.id)} className={cn('cursor-pointer rounded-xl ring-offset-2 transition', c.id === selId && 'ring-2 ring-[var(--ac)]')}>
                    <CornerBlock corner={c.preview} />
                  </div>
                ))
              ) : (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-400">배치된 코너가 없습니다.</div>
              )}
            </DeviceFrame>
            <p className="mt-5 text-center text-[13px] font-semibold text-[var(--ink3)]">iPhone Pro 18 미리보기 중입니다.</p>
          </div>
        </Card>

        {/* 중: 코너 설정 */}
        <Card title="코너 설정">
          {/* 템플릿 탭 */}
          <div className="flex items-center gap-1 border-b border-[var(--line)]">
            {data.templates.map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(i)}
                className={cn('-mb-px border-b-2 px-3.5 py-2.5 text-[14px] font-bold transition',
                  i === tab ? 'border-[var(--ac)] text-[var(--ac)]' : 'border-transparent text-[var(--ink4)] hover:text-[var(--ink2)]')}
              >
                {t.name}
              </button>
            ))}
          </div>

          {/* 화면명(읽기전용) */}
          <div className="mt-5">
            <label className="text-[14px] font-semibold text-[var(--ink2)]">화면명</label>
            <div className="mt-2 flex h-[42px] items-center rounded-[var(--r-field)] border border-[var(--line)] bg-[var(--th)] px-3.5 text-[14px] text-[var(--ink2)]">
              {template?.name}{template?.conditionGroup ? ` · ${template.conditionGroup}` : ''}
            </div>
          </div>

          {/* 코너 리스트 */}
          <div className="mt-5">
            <p className="mb-2 text-[14px] font-semibold text-[var(--ink2)]">코너 설정 <span className="text-[var(--ink4)]">총 {template?.corners.length ?? 0}개</span></p>
            <div className="max-h-[560px] space-y-2 overflow-y-auto rounded-[12px] border border-[var(--line)] bg-[var(--th)] p-2.5">
              {!template || template.corners.length === 0 ? (
                <p className="py-10 text-center text-[14px] text-[var(--ink4)]">배치된 코너가 없습니다.</p>
              ) : (
                template.corners.map((c, i) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelId(c.id)}
                    className={cn('flex w-full items-center gap-2.5 rounded-[10px] border px-3 py-3 text-left text-[14px] transition',
                      c.id === selId ? 'border-[var(--ac)] bg-[var(--ac2)]' : 'border-[var(--line)] bg-white hover:border-[var(--line3)]')}
                  >
                    <span className="w-4 shrink-0 text-center text-[13px] font-semibold text-[var(--ink3)]">{i + 1}</span>
                    <span className={cornerTypeChipClass(c.cornerType)}>{c.cornerType}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-[var(--ink)]">{c.name}</span>
                    {c.layout && <span className="shrink-0 text-[12px] text-[var(--ink4)]">{layoutLabel(c.layout) || c.layout}</span>}
                  </button>
                ))
              )}
            </div>
          </div>
        </Card>

        {/* 우: 코너 상세 설정 */}
        <Card title="코너 상세 설정">
          <CornerDetail
            template={template}
            corner={selected}
            index={selIndex}
            total={template?.corners.length ?? 0}
            expose={(selected && exposeMap[selected.id]) || '항상 노출'}
            onExpose={(v) => selected && setExposeMap((m) => ({ ...m, [selected.id]: v }))}
          />
        </Card>
      </div>
    </div>
  );
}
