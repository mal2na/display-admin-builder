'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Info, History, Layers, Box, ChevronRight, ChevronDown, Pencil, Check, Minus, ExternalLink } from 'lucide-react';
import { CornerTypeForm, DevicePreview, cornerRowPreview, type CornerTypeRow, type BuiltCornerOption, type RegisteredCombo, type BannerCampaignOption, type ProductOption } from '../corner-type-manager';
import { cornerTypePurpose, layoutLabel, cornerTypeBi, layoutBi, displayLayout, cornerTypeHasOptions, cornerFieldSpec, CORNER_TYPE_STATUS_LABEL } from '@/lib/display-taxonomy';
import { CornerFieldList } from '../corner-fields';
import { CornerSpecPreview, loadCornerSpec } from '../carousel-item/carousel-item-studio';
import { CornerTypeReviewBar, cornerTypeReviewIssues } from './corner-type-review-bar';
import { ComposedBanner, type ComposeFields } from '../../banner-campaigns/composed-banner';
import { type PreviewCorner } from '@/components/preview/blocks';

export type HistoryRow = { id: string; changedAt: string; actor: string; result: string; reason: string | null };
export type UsageRow = { container: string | null; template: string | null; corner: string; templateId?: string | null };
// 상세 '상세 정보' — 실제 만든 코너 1개 + 그 코너가 올라간 전시화면들(클릭 시 빌더)
export type UsageByCorner = { cornerName: string; preview: PreviewCorner; screens: { templateId: string; container: string; template: string }[] };
// 배너형 코너 유형 미리보기 — 실제 쓰이는 배너(콤포즈) 1개
export type BannerPreview = { id: string; title: string; fields: ComposeFields };

const RESULT_LABEL: Record<string, string> = { CREATED: '등록', UPDATED: '수정', DELETED: '삭제' };
const RESULT_COLOR: Record<string, string> = {
  CREATED: 'bg-emerald-100 text-emerald-700',
  UPDATED: 'bg-sky-100 text-sky-700',
  DELETED: 'bg-rose-100 text-rose-700',
};

export function CornerTypeDetail({ row, history, builtOptions, registered = [], bannerCampaigns = [], productOptions = [], usage = [], usageByCorner = [], bannerPreviews = [], usagePreviews = [], siblings = [] }: { row: CornerTypeRow; history: HistoryRow[]; builtOptions: BuiltCornerOption[]; registered?: RegisteredCombo[]; bannerCampaigns?: BannerCampaignOption[]; productOptions?: ProductOption[]; usage?: UsageRow[]; usageByCorner?: UsageByCorner[]; bannerPreviews?: BannerPreview[]; usagePreviews?: PreviewCorner[]; siblings?: { id: string; name: string }[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<'info' | 'history'>('info');
  const [usageOpen, setUsageOpen] = useState(true); // (레거시 상단 블록용 — 현재 미표시)
  const [editing, setEditing] = useState(false); // 상세는 읽기 전용, '수정' 눌러야 편집 폼
  // 표시명 = 유형 · 배열·레이아웃 (컴포넌트는 표기에서 제외 — 저장된 name 대신 재구성).
  const cleanName = [cornerTypeBi(row.baseCategory), layoutBi(displayLayout(row.baseCategory, row.typeDetail)) || layoutLabel(displayLayout(row.baseCategory, row.typeDetail)), row.bigBanner ? '빅배너' : ''].filter(Boolean).join(' · ');
  // 코너별로 분리된 유형은 실제 코너명을 주 제목으로(같은 배열이 여러 케이스여도 구분). 배너형(묶음)·미배치는 cleanName.
  //  상품형은 배너가 옵션 → 코너명의 '+배너'·'+칩' 접미사도 떼어 '세로형'으로 통합 표기(2026-10-28 사용자 요청).
  const rawCaseName = usagePreviews[0]?.name ?? null;
  const caseName = rawCaseName && cornerTypeHasOptions(row.baseCategory)
    ? rawCaseName.replace(/\s*[+＋]\s*(배너|칩|CTA)/g, '').replace(/\s*[(（]\s*(배너|칩|CTA)\s*[)）]/g, '').trim()
    : rawCaseName;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Link href="/admin/corner-types" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ChevronLeft className="h-4 w-4" /> 코너 유형 관리
        </Link>
        <div className="h-4 w-px bg-border" />
        <span className="font-mono text-sm text-primary">{row.typeId}</span>
        {/* 타이틀 = 유형·배열(cleanName)을 크게. 케이스명 미표시 + 유형 배지 중복 제거(2026-10-29(2) 사용자 요청: 타이틀에 이미 유형이 있어 뒤 칩 삭제). */}
        <h1 className="text-xl font-bold text-slate-900">{cleanName}</h1>
        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', row.active ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground')}>
          {row.active ? '사용' : '미사용'}
        </span>
      </div>

      {/* 케이스 전환 바 제거 — 코너 유형 = 껍데기(규격)라 같은 (유형·배열) 껍데기는 하나로 보며,
          케이스별 분기(콘텐츠)는 빌더/사용처에서 다룬다(2026-10-06 사용자 요청). */}

      {/* 코너 승인 — 이 코너 유형 단위로 BSS에 승인 요청. 운영자는 요청만, 승인/반려는 BSS. */}
      <CornerTypeReviewBar
        id={row.id}
        status={row.status}
        active={row.active}
        liveVersion={row.liveVersion ?? null}
        workingVersion={row.workingVersion ?? 1}
        rejectReason={row.rejectReason ?? null}
        reviewedAt={row.reviewedAt ?? null}
        liveAt={row.liveAt ?? null}
        issues={cornerTypeReviewIssues(row)}
      />

      {/* 사용처는 아래 '코너 유형 정보 > 상세 정보'(실제 코너 + 전시화면 맵핑)로 이동(2026-10-06). 상단 블록 비표시. */}
      {false && (() => {
        // (컨테이너, 템플릿) 기준으로 코너 묶기. 미배치는 별도 그룹.
        const groups = new Map<string, { container: string | null; template: string | null; templateId: string | null; corners: string[] }>();
        for (const u of usage) {
          const key = `${u.container ?? ''}|${u.template ?? ''}`;
          if (!groups.has(key)) groups.set(key, { container: u.container, template: u.template, templateId: u.templateId ?? null, corners: [] });
          groups.get(key)!.corners.push(u.corner);
        }
        const groupList = [...groups.values()];
        const screenCount = groupList.filter((g) => g.template).length;
        const empty = usage.length === 0;
        const g0 = groupList[0];
        const summary = empty
          ? '아직 사용된 코너 없음'
          : `화면 ${screenCount}개 · ${g0?.container ?? '미배치'}${g0?.template ? ` › ${g0.template}` : ''}${groupList.length > 1 ? ` 외 ${groupList.length - 1}` : ''}`;
        return (
          <div className="overflow-hidden rounded-lg border bg-card">
            <button
              type="button"
              onClick={() => !empty && setUsageOpen((v) => !v)}
              className={cn('flex w-full items-center gap-2 px-3 py-2 text-left', !empty && 'hover:bg-muted/40')}
            >
              <Layers className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
              <span className="text-xs font-semibold text-foreground">이 코너 유형을 쓰는 전시화면</span>
              <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">{screenCount}</span>
              <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">{summary}</span>
              {!empty && <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition', usageOpen && 'rotate-180')} />}
            </button>

            {!empty && usageOpen && (
              <div className="space-y-2 border-t bg-muted/20 p-2.5">
                {groupList.map((g, i) => (
                  <div key={i} className="rounded-md border bg-white p-2.5">
                    <div className="mb-1.5 flex items-center gap-1 text-[11px]">
                      {g.container ? (
                        g.templateId ? (
                          <Link href={`/admin/templates/${g.templateId}/builder`} className="inline-flex items-center gap-1 rounded hover:bg-indigo-50/60" title="전시화면 관리(빌더)에서 열기">
                            <Box className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="font-semibold text-slate-800 hover:underline">{g.container}</span>
                            <ChevronRight className="h-3 w-3 shrink-0 text-slate-300" />
                            <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-medium text-indigo-700 hover:underline">{g.template}</span>
                            <ExternalLink className="h-3 w-3 shrink-0 text-indigo-400" />
                          </Link>
                        ) : (
                          <>
                            <Box className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="font-semibold text-slate-800">{g.container}</span>
                            <ChevronRight className="h-3 w-3 shrink-0 text-slate-300" />
                            <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-medium text-indigo-700">{g.template}</span>
                          </>
                        )
                      ) : (
                        <span className="rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700">미배치 코너</span>
                      )}
                      <span className="ml-auto text-[10px] text-muted-foreground">{g.corners.length}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {g.corners.map((c, j) => (
                        <span key={j} className="inline-flex items-center rounded-full border bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700">{c}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* 탭 */}
      <div className="flex gap-1 border-b">
        <TabButton active={tab === 'info'} onClick={() => setTab('info')} icon={<Info className="h-3.5 w-3.5" />}>
          코너 유형 정보
        </TabButton>
        <TabButton active={tab === 'history'} onClick={() => setTab('history')} icon={<History className="h-3.5 w-3.5" />}>
          이력 관리 <span className="ml-1 text-[10px] text-muted-foreground">({history.length})</span>
        </TabButton>
      </div>

      {/* 코너 유형 정보 — 기본은 읽기 전용. '수정'을 누르면 편집 폼(등록과 동일 UI). */}
      {tab === 'info' && (editing
        ? <CornerTypeForm row={row} builtOptions={builtOptions} registered={registered} bannerCampaigns={bannerCampaigns} productOptions={productOptions} onClose={() => { setEditing(false); router.refresh(); }} />
        : <CornerTypeReadOnly row={row} onEdit={() => setEditing(true)} bannerPreviews={bannerPreviews} usagePreviews={usagePreviews} usageByCorner={usageByCorner} />)}

      {tab === 'history' && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                {['변경일시', '변경자', '구분', '내용'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {history.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">변경 이력이 없습니다.</td></tr>
              )}
              {history.map((h) => (
                <tr key={h.id} className="hover:bg-muted/30">
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{h.changedAt.replace('T', ' ').slice(0, 19)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">{h.actor}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', RESULT_COLOR[h.result] ?? 'bg-muted')}>
                      {RESULT_LABEL[h.result] ?? h.result}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{h.reason ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── 읽기 전용 뷰 — 클릭 시 기본. '수정'을 눌러야 편집 폼으로. ──
// 미리보기 BG 영역 고정 높이 — 단일·멀티 케이스 모두 동일하게 써서 유형별 상하 크기가 일정하다(2026-09-29 사용자 요청).
const PREVIEW_H = 'h-[420px]';
const SORT_LABEL: Record<string, string> = { MANUAL: '수동(배치 순서)', PRIORITY: '우선순위', RECENT: '최신순', POPULAR: '인기순', PRICE_ASC: '낮은 가격순', PRICE_DESC: '높은 가격순' };
const FEATURES: [keyof CornerTypeRow, string][] = [
  ['useImage', '상품 이미지'], ['useMainTitle', '타이틀'], ['useSubTitle', '서브타이틀'],
  ['useBadge', '배지'], ['usePrice', '가격'], ['useDesc', '설명'], ['useMoreButton', 'CTA'],
];

// 읽기 전용 표 행 — 라벨 셀(150px·그레이) + 값 셀. 2026-10-29(2) 사용자 고정 규칙: 읽기 테이블도 수정 폼과 동일 — 밖에 보더·라벨 셀 그레이·박스 안 패딩.
function RORow({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[150px_minmax(0,1fr)] items-stretch border-b border-[#eef1f4] last:border-b-0">
      <div className="flex items-center bg-[#f8f9fb] px-3.5 py-3 text-[12.5px] font-medium text-slate-600">{label}</div>
      <div className="min-w-0 bg-white px-3.5 py-2.5 text-[13px] text-foreground">{children}</div>
    </div>
  );
}

// 읽기 전용 테이블 외곽 — 박스(좌우) 보더 없이 위아래 가로줄만(2026-10-29(2) 사용자 고정 규칙).
function ROTable({ children }: { children: React.ReactNode }) {
  return <div className="border-y border-[#dce0e5]">{children}</div>;
}

// 코너(카드)/아이템(요소) 그룹 — 헤더 바 + 행을 한 박스로 붙임(수정 폼과 동일, 2026-10-29(2) 사용자 요청: 헤더·테이블 붙이기).
function ROGroup({ badge, color, title, desc, children }: { badge: string; color: string; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="border-y border-[#dce0e5]">
      <div className="flex items-center gap-1.5 border-b border-[#eef0f3] bg-[#f8f9fb] px-3 py-2">
        <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] text-[10px] font-bold" style={{ backgroundColor: `${color}1a`, color }}>{badge}</span>
        <span className="text-[12px] font-bold text-[#454f59]">{title}</span>
        <span className="text-[11px] text-[#8b949e]">· {desc}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

// 읽기 전용 섹션 카드 — 타이틀(20px 볼드). 타이틀 밑 보더 없음. collapsible=true면 쉐브론으로 접기(2026-10-29(2) 사용자 요청).
function ROSection({ title, aside, bodyClass, children, defaultOpen = true, collapsible = true }: { title: React.ReactNode; aside?: React.ReactNode; bodyClass?: string; children: React.ReactNode; defaultOpen?: boolean; collapsible?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const shown = collapsible ? open : true;
  const header = (
    <>
      <h3 className="text-[20px] font-bold leading-[1.3] text-slate-900">{title}</h3>
      <span className="ml-auto flex items-center gap-3">
        {aside}
        {collapsible && <ChevronDown className={cn('h-5 w-5 shrink-0 text-[#8b949e] transition-transform', open && 'rotate-180')} />}
      </span>
    </>
  );
  return (
    <section className="overflow-hidden rounded-[12px] border border-[#dce0e5] bg-white">
      {collapsible ? (
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 bg-white px-4 py-3.5 text-left transition hover:bg-[#f8f9fb]">{header}</button>
      ) : (
        <div className="flex w-full items-center gap-2 bg-white px-4 py-3.5">{header}</div>
      )}
      {shown && <div className={bodyClass ?? 'px-4 pb-4 pt-0'}>{children}</div>}
    </section>
  );
}

export function CornerTypeReadOnly({ row, onEdit, bannerPreviews = [], usagePreviews = [], usageByCorner = [] }: { row: CornerTypeRow; onEdit: () => void; bannerPreviews?: BannerPreview[]; usagePreviews?: PreviewCorner[]; usageByCorner?: UsageByCorner[] }) {
  const platforms = row.platforms.split(',').filter(Boolean);
  const hasDefaults = row.defaultMinItems != null || row.defaultMaxItems != null || row.defaultSortStrategy || row.defaultRecSource || row.defaultMoreButton;
  const isBanner = row.baseCategory === '배너형' && bannerPreviews.length > 0;
  // 상품형 = 코너 속성 스튜디오 유형 → 상세 미리보기·기본 정보를 저장된 스펙(ct:<id>)으로 렌더(2026-10-16).
  const isStudio = row.baseCategory === '상품형';
  const specKey = `ct:${row.id}`;
  const [studioSpec, setStudioSpec] = useState<ReturnType<typeof loadCornerSpec> | null>(null);
  // 레이아웃을 넘겨 세로형은 세로형 기본값(가격 OFF·캡션)으로 — 미저장 시 가로형 기본값(가격 ON)이 잘못 뜨던 문제(2026-10-28).
  useEffect(() => { if (isStudio) setStudioSpec(loadCornerSpec(specKey, row.typeDetail)); }, [isStudio, specKey, row.typeDetail]);
  // 배너형 외: 실제 배치된 코너가 있으면 그 코너(들)를 미리보기로 보여준다(폰 프레임 없이 카드 그대로).
  //  케이스가 여러 개면 '코너별 타일'로 분리해 2단 그리드로 나란히 — 세로 무한 나열 대신 그리드로 감싼다(2026-09-28 사용자 피드백).
  //  미배치(사용처 없음)만 조합 샘플로 폴백(히어로 등 유형 대표 렌더 보존).
  // 코너 = 껍데기 → 상세 미리보기도 실데이터가 아니라 '껍데기 가이드'(cornerRowPreview)로 통일(2026-10-06 대공사 방향).
  const useReal = false;
  const multi = false;

  // 상품형: 저장된 스펙의 실제 on/off 를 세부 항목으로 — 코너 유형 자체 플래그 대신 스펙 내용 반영(2026-10-16).
  // 상품형: 타이틀·CTA·세부 항목을 한 블록으로 합쳐, 각 요소의 on/off + 내부에 세팅한 '값'까지 보여준다(2026-10-19 사용자 요청).
  const it = studioSpec?.item;
  const pg = it?.priceGroup;
  const cap = it?.caption;
  const priceVal = pg ? [pg.discountRate.show ? pg.discountRate.value : null, pg.price, pg.priceCaption.show ? pg.priceCaption.value : null, pg.pricePeriod.show ? pg.pricePeriod.value : null].filter(Boolean).join(' ') : '';
  const subTextVal = it ? [it.subText01.show ? it.subText01.value : null, it.subText02.show ? it.subText02.value : null].filter(Boolean).join(' · ') : '';
  const capVal = cap ? [cap.show ? cap.value : null, cap.caption02.show ? cap.caption02.value : null, cap.caption03.show ? cap.caption03.value : null].filter(Boolean).join(' · ') : '';
  void subTextVal; void capVal; void priceVal; // 세분 항목으로 대체(값은 각 항목에서 직접) — 2026-10-28
  // 상품형 세부 항목 — '코너유형정리' 표(2026-10-28) 필수(red)만. 배열: 가로형 / 세로형(세로형+배너 통합).
  //  옵션(상세에서 On/Off) = 배너 이미지 경로(BannerSrc) 하나뿐. 나머지는 전부 고정(상세에서 못 끔) — 2026-10-28 사용자 확정.
  //  캡션·개수는 세로형에서만 필수(가로형은 선택이라 제외). 캡션2·캡션3·칩·CTA 는 선택/미사용이라 코너 유형에 넣지 않는다.
  const isV = /세로/.test(row.typeDetail);
  const studioItems: { lbl: string; kind: '고정' | 'On/Off' | '옵션'; on: boolean; val?: string }[] | null = (isStudio && studioSpec && it) ? [
    // 옵션(배너·칩·CTA — 상품형·혜택형 공통). 맨 위(2026-10-28 사용자 확정).
    { lbl: '배너이미지(BannerSrc)', kind: '옵션', on: !!studioSpec.bannerOn, val: studioSpec.bannerSrc || undefined },
    { lbl: '칩(Chip)', kind: '옵션', on: !!studioSpec.chipOn },
    { lbl: 'CTA(CTA)', kind: '옵션', on: !!studioSpec.cta?.show, val: studioSpec.cta?.label },
    // 기본정보(코너) — 고정
    { lbl: '코너 메인 타이틀(Title)', kind: '고정', on: true, val: studioSpec.title },
    { lbl: '라벨 텍스트(ButtonText)', kind: '고정', on: true, val: studioSpec.buttonText.label },
    // 코너 정보 속성(아이템) — 고정
    { lbl: '아이템 이미지(ImageSrc)', kind: '고정', on: true, val: it.imageSrc || undefined },
    { lbl: '아이템 타이틀(Title)', kind: '고정', on: true },
    // 가로형(단말 추천) = 가격·할인율·서브텍스트2 / 세로형(요금제 리스트) = 캡션·캡션2. DS 실제 케이스 기준(2026-10-28).
    ...(!isV ? [
      { lbl: '가격(Price)', kind: '고정' as const, on: true, val: it.priceGroup.price },
      { lbl: '할인율(DiscountRate)', kind: '고정' as const, on: true, val: it.priceGroup.discountRate.value },
      { lbl: '서브텍스트2(SubText02)', kind: '고정' as const, on: true, val: it.subText02.value },
    ] : [
      { lbl: '캡션(Caption01)', kind: '고정' as const, on: true, val: it.caption.value },
      { lbl: '캡션2(Caption02)', kind: '고정' as const, on: true, val: it.caption.caption02.value },
      // 세로형 가격 = 옵션(토글). 켜면 할인율·기간.
      { lbl: '가격(TextPriceGroup)', kind: '옵션' as const, on: it.priceGroup.show, val: it.priceGroup.show ? it.priceGroup.price : undefined },
      ...(it.priceGroup.show ? [
        { lbl: '할인율(Discount)', kind: '옵션' as const, on: it.priceGroup.discountRate.show, val: it.priceGroup.discountRate.value },
        { lbl: '기간(Period)', kind: '옵션' as const, on: it.priceGroup.pricePeriod.show, val: it.priceGroup.pricePeriod.value },
      ] : []),
    ]),
  ] : null;

  // 정보(읽기 전용) 블록 — 단일/멀티 레이아웃에서 공용. 프로모션 상세 .fsec/.ftable 규격.
  const infoContent = (
    <div className="space-y-6">
      <ROSection title="코너 기본 정보">
      {/* 수정 폼(기본 정보)과 동일한 필드·순서: ID → 유형 → 배열 → 플랫폼 → 사용 여부 → 승인상태 → 설명(2026-10-29(2) 사용자 요청). */}
      <ROTable>
      <RORow label="코너 유형 ID"><span className="font-mono text-[12px] text-slate-600">{row.typeId}</span></RORow>
      <RORow label="코너 유형">
        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold">{cornerTypeBi(row.baseCategory)}</span>
        {cornerTypePurpose(row.baseCategory) && <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{cornerTypePurpose(row.baseCategory)}</p>}
      </RORow>
      <RORow label="배열·레이아웃">
        {/* 상품형은 배너가 옵션 → '세로형+배너'를 '세로형'으로 접어 표시(2026-10-28 사용자 요청). */}
        <span className="font-medium">{layoutBi(displayLayout(row.baseCategory, row.typeDetail)) || layoutLabel(displayLayout(row.baseCategory, row.typeDetail)) || '—'}</span>
        {row.bigBanner && <span className="ml-1.5 rounded border border-dashed border-indigo-400 bg-indigo-50/60 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600">빅배너</span>}
      </RORow>
      <RORow label="운영 플랫폼">{platforms.length ? platforms.join(', ') : '—'}</RORow>
      <RORow label="사용 여부">
        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', row.active ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground')}>{row.active ? '사용' : '미사용'}</span>
      </RORow>
      <RORow label="승인상태">
        <span className="rounded-full bg-[#e8ecef] px-2 py-0.5 text-[11px] font-medium text-slate-600">{CORNER_TYPE_STATUS_LABEL[row.status] ?? row.status}</span>
      </RORow>
      <RORow label="코너 유형 설명"><span className="text-[12px] leading-relaxed text-muted-foreground">{row.description || '—'}</span></RORow>
      </ROTable>
      </ROSection>

      {/* 코너 정보 · 속성 — 전 페이지 공통 섹션명(2026-10-28 사용자 요청). 상품형은 스튜디오 항목, 그 외는 CornerFieldList. */}
      {(studioItems || cornerFieldSpec(row.baseCategory, row.typeDetail)) && (
        studioItems ? (
          // 상품형 — 라벨(코드·옵션/고정 배지) | 사용 상태·값 테이블(2026-10-29(2) 사용자 요청).
          <ROSection title={<>코너 속성 <span className="text-[11px] font-normal text-slate-400">· 이 코너 유형이 쓰는 표시 항목</span></>}>
            {(() => {
              // 라벨엔 옵션/고정 배지 미표시(라벨 터짐 방지). 가격 + 연속된 할인율·기간은 한 행에서 컬럼 분할. 코너(카드)/아이템(요소) 그룹으로 분리(수정 폼과 동일) — 2026-10-29(2) 사용자 요청.
              type SI = typeof studioItems[number];
              type Row = { price: true; cells: SI[] } | { price: false; cell: SI };
              const rows: Row[] = [];
              for (let i = 0; i < studioItems.length; i++) {
                const cur = studioItems[i];
                if (/^가격/.test(cur.lbl)) {
                  const grp: SI[] = [cur];
                  while (i + 1 < studioItems.length && /^(할인율|기간)/.test(studioItems[i + 1].lbl)) { grp.push(studioItems[i + 1]); i++; }
                  rows.push({ price: true, cells: grp });
                } else rows.push({ price: false, cell: cur });
              }
              const koOf = (s: string) => s.replace(/\s*\(.*\)\s*/, '').trim();
              // 코너(카드) = 배너·칩·CTA·코너 메인 타이틀·라벨 텍스트. 나머지(이미지·타이틀·가격 등) = 아이템(요소).
              const isCornerRow = (r: Row) => !r.price && /^(배너|칩|CTA|코너 메인 타이틀|라벨 텍스트)/.test(r.cell.lbl);
              const cornerRows = rows.filter(isCornerRow);
              const itemRows = rows.filter((r) => !isCornerRow(r));
              const stateVal = (c: SI) => (
                <>
                  {c.kind === '고정'
                    ? <span className="text-[12px] font-medium text-slate-400">사용 고정</span>
                    : <span className={cn('text-[12px] font-semibold', c.on ? 'text-[#00a058]' : 'text-slate-400')}>{c.on ? '사용' : '미사용'}</span>}
                  {c.on && c.val && <span className="whitespace-pre-line text-slate-500">{c.val}</span>}
                </>
              );
              const renderRow = (r: Row, ri: number) => {
                if (!r.price) return <RORow key={ri} label={koOf(r.cell.lbl)}><span className="flex min-w-0 items-center gap-2">{stateVal(r.cell)}</span></RORow>;
                const gridCls = r.cells.length >= 3
                  ? 'grid-cols-[150px_minmax(0,1fr)_96px_minmax(0,1fr)_96px_minmax(0,1fr)]'
                  : 'grid-cols-[150px_minmax(0,1fr)_96px_minmax(0,1fr)]';
                return (
                  <div key={ri} className={cn('grid items-stretch border-b border-[#eef1f4] last:border-b-0', gridCls)}>
                    {r.cells.flatMap((c, ci) => [
                      <div key={`l${ci}`} className="flex items-center bg-[#f8f9fb] px-3.5 py-3 text-[12.5px] font-medium text-slate-600"><span className={c.on ? '' : 'text-slate-400'}>{koOf(c.lbl)}</span></div>,
                      <div key={`v${ci}`} className="flex min-w-0 items-center gap-2 px-3.5 py-2.5 text-[13px]">{stateVal(c)}</div>,
                    ])}
                  </div>
                );
              };
              return (
                <div className="space-y-3">
                  {cornerRows.length > 0 && (
                    <ROGroup badge="코" color="#3617ce" title="코너(카드)" desc="카드 전체에 1개 (배너·타이틀·버튼)">{cornerRows.map(renderRow)}</ROGroup>
                  )}
                  {itemRows.length > 0 && (
                    <ROGroup badge="아" color="#00a058" title="아이템(요소)" desc="리스트에서 반복되는 카드 1개 (이미지·타이틀·가격)">
                      {itemRows.map(renderRow)}
                      {/* 노출 개수 — 아이템(요소) 하위(2026-10-29(2) 사용자 요청) */}
                      <RORow label="노출 개수">
                        <span className="flex items-center gap-2">
                          <span className="rounded-[4px] bg-[#f1f3f5] px-2 py-0.5 text-[12px] font-semibold text-[#454f59]">{row.defaultMinItems ?? '–'}~{row.defaultMaxItems ?? '–'}개</span>
                          <span className="text-[11px] text-slate-400">· 실제 개수는 빌더에서</span>
                        </span>
                      </RORow>
                    </ROGroup>
                  )}
                </div>
              );
            })()}
          </ROSection>
        ) : (
          <ROSection title={<>코너 속성 <span className="text-[11px] font-normal text-slate-400">· 이 코너 유형이 쓰는 표시 항목</span></>}>
            <CornerFieldList cornerType={row.baseCategory} layout={row.typeDetail} />
          </ROSection>
        )
      )}
    </div>
  );

  // 문구 베리에이션 섹션 제거(2026-10-14 사용자 요청) — 코너 유형은 껍데기만.
  //  문구 베리에이션(콘텐츠)은 빌더 아톰(Atom.contentVariants) 소유라 코너 유형 상세에 노출하지 않는다.
  const variationsContent = null;

  // 상세 정보 — 이 코너 유형을 쓰는 전시화면 + 실제 만든 코너 미리보기(클릭 시 빌더로 이동). 2026-10-06 사용자 요청.
  const usageContent = (
    <ROSection title={<>적용 화면 <span className="text-[11px] font-normal text-slate-400">· 이 코너 유형을 쓰는 전시화면 · 실제 만든 코너 {usageByCorner.length}개</span></>}>
      {usageByCorner.length === 0 ? (
        <div className="rounded-[8px] border border-dashed border-[#dce0e5] bg-muted/20 p-5 text-center text-[12px] text-muted-foreground">아직 이 코너 유형을 쓰는 전시화면이 없습니다.</div>
      ) : (
        // 좌: 이미지(고정폭) · 우: 전시화면 경로 리스트(세로). 2026-10-29(2) 사용자 요청.
        <div className="divide-y divide-[#eef1f4]">
          {usageByCorner.map((u, i) => (
            <div key={i} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
              <div className="pointer-events-none flex h-[180px] w-[220px] shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-[#eef0f6]">
                <DevicePreview corner={u.preview} fit="contain" align="center-middle" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-[12.5px] font-semibold text-slate-800">{u.cornerName}</p>
                <div className="flex flex-col items-start gap-1.5">
                  {u.screens.length === 0 ? (
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">미배치</span>
                  ) : u.screens.map((s, j) => (
                    <Link key={j} href={`/admin/templates/${s.templateId}/builder`} className="inline-flex items-center gap-1 whitespace-nowrap rounded bg-white px-1.5 py-0.5 text-[11px] ring-1 ring-slate-200 transition hover:ring-indigo-400" title="전시화면 관리(빌더)에서 열기">
                      <Box className="h-3 w-3 shrink-0 text-slate-400" />
                      <span className="whitespace-nowrap text-slate-700">{s.container}</span>
                      <ChevronRight className="h-2.5 w-2.5 shrink-0 text-slate-300" />
                      <span className="whitespace-nowrap font-medium text-indigo-700">{s.template}</span>
                      <ExternalLink className="h-2.5 w-2.5 shrink-0 text-indigo-400" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ROSection>
  );

  // 단일 미리보기(배너형 / 단일 케이스 / 미배치 샘플) — 폰 프레임 없이 카드 그대로 축소.
  //  BG 영역은 모든 유형 동일 고정 높이(PREVIEW_H), 콘텐츠는 세로 중앙 정렬 → 배너처럼 짧은 유형도 가운데(2026-09-29 사용자 요청).
  const singlePreview = isStudio ? (
    // 상품형 — 자연 높이로 흐름(고정 높이 금지 → 긴 내용도 안 잘림). 바깥 박스(max-h-72vh)가 스크롤 처리(2026-10-29(2) 사용자 요청).
    <CornerSpecPreview storageKey={specKey} layout={row.typeDetail ?? undefined} />
  ) : (
    <div className={PREVIEW_H}>
      {isBanner ? (
        <div className="flex h-full flex-col items-center justify-center gap-3">
          {bannerPreviews.map((b) => (
            <ComposedBanner key={b.id} f={b.fields} width={412} height={132} preview />
          ))}
        </div>
      ) : (
        <div className="pointer-events-none h-full">
          {/* contain + center-middle = 전체가 잘림 없이 들어가고 세로 중앙 정렬(고정 높이 BG 안에서) */}
          <DevicePreview corner={useReal ? usagePreviews[0] : cornerRowPreview(row)} fit="contain" align="center-middle" />
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* 미리보기(좌·고정폭 340·sticky) + 정보(우). 폭 좁으면 정보가 아래로. 수정 폼과 동일 폭·sticky(2026-10-29(2) 사용자 요청). */}
      <div className="flex flex-wrap items-start gap-5">
        <div className="w-[340px] max-w-full shrink-0 self-start lg:sticky lg:top-3">
          <ROSection title="코너 미리보기" collapsible={false} bodyClass="max-h-[72vh] overflow-y-auto bg-[#eef0f6] px-4 pb-4 pt-4">
            {multi ? (
              <div className="grid gap-3">
                {usagePreviews.map((c, i) => (
                  <figure key={c.id} className="rounded-[8px] bg-[#eef0f6] p-3">
                    <figcaption className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-white text-[10px] font-bold tabular-nums text-slate-500 ring-1 ring-slate-200">{i + 1}</span>
                      <span className="truncate">{c.name}</span>
                    </figcaption>
                    <div className={cn('pointer-events-none', PREVIEW_H)}>
                      <DevicePreview corner={c} fit="contain" align="center-middle" />
                    </div>
                  </figure>
                ))}
              </div>
            ) : singlePreview}
          </ROSection>
        </div>
        {/* 우측 — 코너 기본 정보 / 코너 속성 / 상세 정보. 좌측 미리보기 영역은 항상 미리보기만(2026-10-29(2) 사용자 요청). */}
        <div className="min-w-[300px] flex-1 space-y-5">
          {infoContent}
          {variationsContent}
          {usageContent}
        </div>
      </div>

      {/* 하단 액션 — 좌: 목록, 우: 수정(2026-10-29(2) 사용자 요청). */}
      <div className="flex items-center justify-between gap-2 border-t border-[#eef1f4] pt-4">
        <Link href="/admin/corner-types" className="inline-flex h-[38px] items-center gap-1.5 rounded-[8px] border border-[#c4c9cf] bg-white px-4 text-[13px] font-semibold text-slate-600 transition hover:bg-[#f8f9fb]">
          <ChevronLeft className="h-4 w-4" /> 목록
        </Link>
        <Button size="sm" variant="secondary" onClick={onEdit}><Pencil className="mr-1 h-3.5 w-3.5" /> 수정</Button>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        '-mb-px inline-flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium',
        active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      {children}
    </button>
  );
}
