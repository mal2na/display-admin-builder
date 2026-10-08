'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { OPERATION_PLATFORMS, CORNER_TYPE_FEATURES, CORNER_TYPE_STATUS_LABEL, CORNER_TYPE_STATUS_COLOR, deriveCornerTypeUsage, CORNER_TYPES, cornerTypePurpose, cornerTypeChipClass, componentTypesForCorner, cornerTypeDetails, layoutLabel, layoutBi, cornerTypeEn, componentLabel, componentLayoutDetails, PRODUCT_SORT_OPTIONS, REC_SOURCE_METHODS, REC_SOURCE_INFO, CVM_TARGET_HINTS, normalizeRecSource, parseComposition, defaultComposition, type Composition, type ComponentType, CHIP_BASE } from '@/lib/display-taxonomy';
import { CornerBlock, type PreviewCorner } from '@/components/preview/blocks';
import { compositionToPreviewCorner, chipIconForLabel } from '@/components/preview/composition-preview';
import { isEventCornerFamily } from '@/lib/event-taxonomy';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Check, X, Search, ChevronRight, RotateCcw, Info, Copy, Pencil, LayoutGrid, List, GripVertical, Sparkles } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ICON_CATEGORIES, IconGlyph, isIconRef } from '@/lib/icon-library';
import { createCornerType, updateCornerType, duplicateCornerType, deleteCornerType } from './actions';
import { requestCornerTypeReview, approveCornerType, rejectCornerType, publishCornerType } from './[id]/corner-type-review-actions';
import { FilterPanel, ListHeader } from '@/components/ops-ui';

// 등록된 코너 유형(코너 유형 관리 = 마스터)의 (코너유형·컴포넌트·배열) 조합. 등록 폼 ②③을 이걸로 좁힌다.
export type RegisteredCombo = { baseCategory: string; componentType: string | null; typeDetail: string | null; bigBanner?: boolean };
// 배너 캠페인 후보 — 스와이프형 코너 유형에서 '배너 묶기'로 선택(랜딩 URL은 캠페인에서 끌어옴).
export type BannerCampaignOption = { id: string; title: string; linkUrl: string | null; imageUrl: string | null; size: string | null };
// 상품/혜택 후보 — 상품형·혜택형 코너 유형에서 '상품 담기'로 선택(BSS 혜택 브랜드 + 디바이스·단말). 랜딩 URL은 담은 뒤 수동 편집.
export type ProductOption = { key: string; title: string; brand: string; imageUrl: string | null; price: string | null; badge: string | null; category?: string };

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
  componentLayoutMode: string; // 지정형 | 고정형
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
  useBadge: boolean;
  useImage: boolean;
  usePrice: boolean;
  useDesc: boolean;
  // 타입-레벨 기본값(빌더 상속)
  defaultMinItems: number | null;
  defaultMaxItems: number | null;
  defaultSortStrategy: string | null;
  defaultRecSource: string | null; // 기본 추천 수급 방식 (상품형·개인화 추천형)
  defaultMoreButton: boolean;
  defaultMoreButtonLabel: string | null;
  // 정의(거버넌스) 기본값 — 코너 유형이 '코너가 무엇인가'를 정의(2026-09-29)
  defaultMainTitle: string | null;
  defaultSubTitle: string | null;
  defaultSubTitleIcon: string | null;
  defaultCardShape: string | null;
  defaultBannerOptions: string | null;
  cvmFields: string; // 고객정보 연동 필드 keys csv
  composition: string | null; // 컴포넌트 조합(JSON: CompositionBlock[]). null이면 절차적 scaffold 폴백.
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
  // 실제 배치된 대표 코너 미리보기(있으면 카드 썸네일을 이걸로 렌더 → 상세 첫 타일과 일치). 미배치면 null → 조합 샘플.
  previewCorner?: PreviewCorner | null;
};

export const EMPTY_CORNER_TYPE: CornerTypeRow = {
  id: '',
  typeId: '(자동 생성)',
  name: '',
  baseCategory: '상품형',
  componentType: '상품형',
  typeDetail: null,
  bigBanner: false,
  componentLayoutMode: '고정형',
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
  useBadge: false,
  useImage: true,
  usePrice: true,
  useDesc: true,
  defaultMinItems: null,
  defaultMaxItems: null,
  defaultSortStrategy: null,
  defaultRecSource: null,
  defaultMoreButton: false,
  defaultMoreButtonLabel: null,
  defaultMainTitle: null,
  defaultSubTitle: null,
  defaultSubTitleIcon: null,
  defaultCardShape: null,
  defaultBannerOptions: null,
  cvmFields: '',
  composition: null,
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

// ── 상위 분기(도메인) 3종: 전시 / 프로모션 / 상품 ──
const DOMAINS = ['전시', '프로모션', '상품'] as const;
type Domain = (typeof DOMAINS)[number];
// baseCategory → 도메인. 이벤트·미션 계열=프로모션, 나머지(전시 7거버넌스, 상품형 포함)=전시.
//  현재 '상품형'은 전시(진열) 유형이다. '상품' 도메인은 전용 유형이 아직 없어 비어 있다(향후 확장 자리).
function domainOf(base: string): Domain {
  if (isEventCornerFamily(base)) return '프로모션';
  return '전시';
}
const DOMAIN_GUIDE: Record<Domain, string> = {
  전시: '전시 코너 유형 — 상품형·배너형·혜택오퍼·업무진입·상태안내·콘텐츠안내·고정필수 7종 거버넌스로 나뉩니다. (배너형은 코너 유형이고, 배너 소재·문구는 배너 캠페인 관리가 소유)',
  프로모션: '프로모션(이벤트·미션) 전용 코너 유형 — 전시 거버넌스와 별개의 이벤트미션 계열로 관리합니다.',
  상품: '상품 전용 코너 유형은 아직 준비 중입니다. (현재 상품형은 전시 도메인에서 관리)',
};
// 도메인별 거버넌스(유형) 칩 목록 — 전시는 7거버넌스(배너형 포함) 고정, 그 외는 도메인에 존재하는 유형.
function domainGovernances(domain: Domain, present: string[]): string[] {
  if (domain === '전시') return (CORNER_TYPES as readonly string[]).filter((bc) => domainOf(bc) === '전시');
  return present;
}

// CornerTypeRow → 미리보기 PreviewCorner = '껍데기 가이드'(placeholder 슬롯: 타이틀·디스크립션·상품명·가격·설명·이미지·더보기).
//  코너 = 껍데기(규격)라 실데이터가 아니라 '가이드'로 그린다(2026-10-06 코너 유형 관리 대공사 방향). 목록·상세·수정 공용.
export function cornerRowPreview(row: CornerTypeRow): PreviewCorner {
  // 카드 자체가 완결형인 유형은 코너 타이틀·디스크립션이 없다 → 미리보기에서 완전 제외.
  //  배너형·고정필수형·상태 안내형, 탭형(업무 진입형 탭 등), 아이콘/이미지/팝업/띠/텍스트배너/프로필/바코드 레이아웃.
  const dStr = row.typeDetail ?? '';
  const noTitle =
    row.baseCategory === '배너형' ||
    row.baseCategory === '고정·필수 노출형' ||
    row.baseCategory === '상태 안내형' ||
    /탭/.test(dStr) ||
    ['아이콘형', '이미지형', '팝업', '띠', '텍스트배너', '프로필', '바코드'].some((k) => dStr.includes(k));
  const c = compositionToPreviewCorner({
    base: row.baseCategory,
    detail: row.typeDetail,
    mainTitle: noTitle || !row.useMainTitle ? null : '타이틀',
    subTitle: noTitle || !row.useSubTitle ? null : '디스크립션',
    // 가이드는 저장된 조합(실데이터 포함)이 아니라 유형 기본 조합(generic)으로 — 상품명·가격·설명 '슬롯 라벨'만 보이게.
    composition: defaultComposition(row.componentType, row.typeDetail, { image: row.useImage, price: row.usePrice, badge: row.useBadge, desc: row.useDesc }),
    placeholder: true, // 슬롯 라벨(상품명·가격·설명 등)로 구조만
    emptyImages: true, // 이미지·배너 영역은 빈 자리로
  });
  // 코너 헤더(타이틀)가 없는 완결형·탭/칩·배너 유형은 '더보기(CTA)'도 없다(탭형 등).
  const noMore = noTitle;
  return {
    ...c,
    showImage: row.useImage, showPrice: row.usePrice, showBadge: row.useBadge, showDesc: row.useDesc,
    moreButtonUse: noMore ? false : row.useMoreButton, moreButtonLabel: row.defaultMoreButtonLabel ?? undefined,
  };
}

// 코너 전체가 다 보이도록 실제 렌더(CornerBlock)를 측정해 카드 박스 안에 '통째로 축소'해 넣는다(DS 포털처럼 잘림 없이).
//  fit='width'(기본): 폭 기준 고정 — 토글해도 배율 안 흔들림(편집용). fit='contain': 폭·높이 모두 맞춰 전체가 잘림 없이 들어감(상세·목록용).
export function DevicePreview({ corner, fit: fitMode = 'width', align = 'top-center' }: { corner: PreviewCorner; fit?: 'width' | 'contain' | 'autoHeight'; align?: 'top-center' | 'left-middle' | 'center-middle' }) {
  // 자연 렌더 폭 = 빌더(전시화면 관리) 카드 폭과 동일하게 맞춘다(패딩 비율 일치).
  //  빌더 디바이스 393 − 프레임 보더(10px×2=20) − 바디 여백(px-5 ×2=40) = 카드 폭 333. (영화 등 가로형 카드 패딩이 빌더와 어긋나던 원인)
  const NAT_W = 333;
  const autoH = fitMode === 'autoHeight'; // 폭 기준 축소 + 박스 높이를 콘텐츠에 맞춤(빈 여백 제거)
  const boxRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const [natH, setNatH] = useState(0);
  useEffect(() => {
    const box = boxRef.current, content = contentRef.current;
    if (!box || !content) return;
    const fit = () => {
      const bw = box.clientWidth, bh = box.clientHeight, ch = content.scrollHeight || 1;
      // contain: 폭·높이 모두 맞춤. width/autoHeight: 폭 기준. autoHeight는 박스 높이를 콘텐츠 높이×배율로.
      const s = fitMode === 'contain' ? Math.min(bw / NAT_W, bh / ch, 1) : Math.min(bw / NAT_W, 1);
      if (s > 0 && Number.isFinite(s)) { setScale(s); setNatH(ch); }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box); ro.observe(content);
    return () => ro.disconnect();
  }, [corner]);
  return (
    <div ref={boxRef} className={autoH ? 'relative w-full overflow-hidden' : 'relative h-full w-full overflow-hidden'} style={autoH && natH ? { height: Math.round(natH * scale) } : undefined}>
      <div
        ref={contentRef}
        className={align === 'top-center' ? 'absolute top-0' : 'absolute left-1/2 top-1/2'}
        style={
          align === 'left-middle'
            // 좌측 정렬 + 세로 중앙
            ? { width: NAT_W, left: 0, transform: `translateY(-50%) scale(${scale})`, transformOrigin: 'left center' }
            : align === 'center-middle'
              // 가로·세로 모두 중앙 — 셀마다 같은 위치에 고정되어 스캔이 편함(2026-09-29 사용자 요청).
              ? { width: NAT_W, transform: `translate(-50%, -50%) scale(${scale})`, transformOrigin: 'center center' }
              : { width: NAT_W, left: `calc(50% - ${NAT_W / 2}px)`, transform: `scale(${scale})`, transformOrigin: 'top center' }
        }
      >
        {/* CornerBlock이 자체 카드(흰 배경·라운드)를 렌더하므로 여기서 이중 카드로 감싸지 않는다(배너 full-bleed·여백 제거). */}
        <CornerBlock corner={corner} />
      </div>
    </div>
  );
}

// 스와이프 배너 한 줄 (드래그앤드롭 · 그립 핸들) — 코너 유형에서 배너 묶음 순서를 바꾼다(2026-09-29 사용자 요청).
type SwipeBannerItem = { campaignId: string; title: string; imageUrl?: string; linkUrl?: string; size?: string };
function SortableBannerRow({ id, idx, banner, onRemove, onLinkChange }: { id: string; idx: number; banner: SwipeBannerItem; onRemove: () => void; onLinkChange: (url: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1.5 rounded-md border bg-white p-1.5">
      <button type="button" className="cursor-grab text-slate-400 active:cursor-grabbing" {...attributes} {...listeners} aria-label="순서 변경 (드래그)" title="드래그하여 순서 변경">
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-indigo-50 text-[10px] font-bold tabular-nums text-indigo-500">{idx + 1}</span>
      {banner.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={banner.imageUrl} alt="" className="h-8 w-12 shrink-0 rounded object-cover ring-1 ring-slate-200" />
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-[12px] font-medium text-slate-800">{banner.title}{banner.size ? <span className="ml-1 font-normal text-slate-400">· {banner.size}</span> : null}</p>
        {/* 랜딩 URL — 캠페인에서 자동 매핑되지만 여기서 수동 변경 가능(2026-09-29 사용자 요청) */}
        <input
          value={banner.linkUrl ?? ''}
          onChange={(e) => onLinkChange(e.target.value)}
          placeholder="랜딩 URL (배너 캠페인에서 자동 · 수정 가능)"
          className="h-7 w-full rounded border border-[#e6e7ec] bg-white px-2 text-[11px] text-slate-600 outline-none focus:border-indigo-400 focus:bg-white"
        />
      </div>
      <button type="button" onClick={onRemove} className="flex h-7 w-6 shrink-0 items-center justify-center rounded border bg-white text-slate-400 hover:text-destructive">×</button>
    </div>
  );
}

// 배너 담기 모달 — 배너 캠페인을 체크박스로 여러 개 한 번에 선택해 담는다(2026-09-29 사용자 요청, 드롭다운 대체).
function BannerPickerModal({ open, onClose, campaigns, usedIds, onAdd }: { open: boolean; onClose: () => void; campaigns: BannerCampaignOption[]; usedIds: Set<string | undefined>; onAdd: (ids: string[]) => void }) {
  const [q, setQ] = useState('');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  if (!open) return null;
  const query = q.trim().toLowerCase();
  const list = campaigns.filter((c) => !query || `${c.title} ${c.size ?? ''}`.toLowerCase().includes(query));
  const toggle = (id: string) => setChecked((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const submit = () => { onAdd([...checked]); setChecked(new Set()); setQ(''); onClose(); };
  const close = () => { setChecked(new Set()); setQ(''); onClose(); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={close}>
      <div className="flex h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Plus className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">배너 담기</h2>
          <span className="text-xs text-muted-foreground">여러 개를 체크해 한 번에 담아요 · 랜딩 URL은 캠페인 값 그대로</span>
          <button type="button" onClick={close} className="ml-auto text-muted-foreground hover:text-foreground" aria-label="닫기"><X className="h-4 w-4" /></button>
        </div>
        <div className="border-b p-3">
          <div className="flex items-center gap-2 rounded-md border bg-background px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="배너 캠페인 검색…" className="h-9 flex-1 bg-transparent text-sm outline-none" autoFocus />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {list.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">검색 결과가 없습니다.</p>}
          <div className="space-y-1">
            {list.map((c) => {
              const already = usedIds.has(c.id);
              const on = checked.has(c.id);
              return (
                <label key={c.id} className={cn('flex cursor-pointer items-center gap-2.5 rounded-md border px-2.5 py-2 text-left', already ? 'cursor-not-allowed border-[#e6e7ec] bg-[#f6f7f9] opacity-60' : on ? 'border-primary bg-accent' : 'border-transparent hover:bg-muted/50')}>
                  <input type="checkbox" checked={on || already} disabled={already} onChange={() => toggle(c.id)} className="accent-[#3a2fd8]" />
                  {c.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.imageUrl} alt="" className="h-8 w-12 shrink-0 rounded object-cover ring-1 ring-slate-200" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-slate-800">{c.title}</span>
                    <span className="block truncate text-[11px] text-slate-400">{c.linkUrl || '랜딩 URL 없음'}{c.size ? ` · ${c.size}` : ''}</span>
                  </span>
                  {already && <span className="shrink-0 rounded bg-[#e6e7ec] px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">담김</span>}
                </label>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2 border-t px-4 py-3">
          <span className="text-xs text-muted-foreground">{checked.size}개 선택</span>
          <button type="button" onClick={close} className="ml-auto rounded-md border px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-[#f6f7f9]">취소</button>
          <button type="button" onClick={submit} disabled={checked.size === 0} className="rounded-md bg-[#3a2fd8] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#2f25bd] disabled:opacity-40">{checked.size > 0 ? `${checked.size}개 담기` : '담기'}</button>
        </div>
      </div>
    </div>
  );
}

// 스와이프 배너 묶기 편집기 — 배너 캠페인에서 담고, 드래그앤드롭으로 순서 변경(2026-09-29 사용자 요청).
//  빌더는 이 묶음을 그대로 생성만 하고 순서만 바꾼다(거버넌스: 정의는 코너 유형).
function SwipeBannerEditor({ banners, bannerCampaigns, onCommit, single = false }: { banners: SwipeBannerItem[]; bannerCampaigns: BannerCampaignOption[]; onCommit: (next: SwipeBannerItem[]) => void; single?: boolean }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const [pickerOpen, setPickerOpen] = useState(false);
  // 행 id = 인덱스 포함 복합키 — 시드 파생 배너엔 campaignId가 없어(중복 undefined) dnd-kit 정렬이 안 먹던 버그 방지(2026-09-29).
  const rowId = (b: SwipeBannerItem, i: number) => `${b.campaignId ?? 'b'}-${i}`;
  const usedIds = new Set(banners.map((b) => b.campaignId).filter(Boolean));
  const addMany = (ids: string[]) => {
    const news = ids
      .map((id) => bannerCampaigns.find((b) => b.id === id))
      .filter((c): c is BannerCampaignOption => !!c && !usedIds.has(c.id))
      .map((c) => ({ campaignId: c.id, title: c.title, imageUrl: c.imageUrl ?? undefined, linkUrl: c.linkUrl ?? undefined, size: c.size ?? undefined }));
    if (!news.length) return;
    if (single) { onCommit([news[0]]); return; } // 배너 단일형 — 배너 캠페인에서 1개만 불러옴(교체)
    onCommit([...banners, ...news]);
  };
  const remove = (idx: number) => onCommit(banners.filter((_, j) => j !== idx));
  const patchLink = (idx: number, linkUrl: string) => onCommit(banners.map((b, j) => (j === idx ? { ...b, linkUrl } : b)));
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = banners.findIndex((b, i) => rowId(b, i) === active.id);
    const to = banners.findIndex((b, i) => rowId(b, i) === over.id);
    if (from < 0 || to < 0) return;
    const next = [...banners];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onCommit(next);
  };
  return (
    <div className="space-y-2 rounded-md border border-[#e6e7ec] bg-white p-3">
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-semibold text-slate-700">{single ? '배너 불러오기 (단일)' : '스와이프 배너 묶기'}</span>
        <span className="rounded-full bg-[#f6f7f9] px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-slate-500 ring-1 ring-slate-200">{banners.length}{single ? '개' : '장'}</span>
        {!single && <span className="ml-auto text-[11px] text-slate-400">드래그로 순서 변경</span>}
      </div>
      {banners.length === 0 && <p className="rounded-md border border-dashed border-[#e6e7ec] bg-white px-2 py-2 text-[11px] text-slate-400">{single ? '배너 캠페인 관리에서 배너 1개를 불러오세요. 소재·문구·랜딩 URL은 캠페인 값을 그대로 씁니다.' : '아래에서 배너 캠페인을 골라 담으세요. 랜딩 URL은 배너 캠페인 관리에서 그대로 이어져요.'}</p>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={banners.map((b, i) => rowId(b, i))} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {banners.map((b, idx) => (
              <SortableBannerRow key={rowId(b, idx)} id={rowId(b, idx)} idx={idx} banner={b} onRemove={() => remove(idx)} onLinkChange={(url) => patchLink(idx, url)} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {(!single || banners.length === 0) && (
        <button type="button" onClick={() => setPickerOpen(true)} className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-slate-300 bg-white px-2.5 py-2 text-[12px] font-medium text-slate-600 hover:bg-[#f6f7f9]">
          <Plus className="h-3.5 w-3.5" /> {single ? '배너 캠페인에서 불러오기 (1개)' : '배너 캠페인에서 담기 (여러 개 선택)'}
        </button>
      )}
      <p className="text-[11px] leading-relaxed text-slate-400">{single
        ? <>배너형 · <b>단일형</b>은 <b>배너 캠페인 관리</b>에서 <b>배너 1개</b>를 불러옵니다. 소재·문구·<b>랜딩 URL</b>은 캠페인 값을 그대로 쓰고, 코너에서는 배치·규격·노출 방식만 정해요. 여러 장을 돌리려면 <b>스와이프형</b>으로 등록하세요.</>
        : <>배너형 · <b>스와이프형</b>은 <b>배너 캠페인 관리</b>에서 <b>2개 이상</b>을 불러와 묶습니다. 빌더에선 <b>하나하나 불러올 필요 없이</b> 이 묶음이 그대로 생성돼요. 각 배너의 <b>랜딩 URL</b>은 캠페인 값을 그대로 쓰고, 순서는 <b>드래그</b>로 조정.</>}</p>
      <BannerPickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} campaigns={bannerCampaigns} usedIds={usedIds} onAdd={addMany} />
    </div>
  );
}

// 상품/혜택 아이템 한 줄 (드래그앤드롭 · 그립 핸들 · 랜딩 URL 수동 편집) — 코너 유형에서 상품 묶음 순서를 바꾼다(2026-09-29 사용자 요청).
type ProductItem = { productKey?: string; title: string; brand?: string; imageUrl?: string; price?: string; badge?: string; linkUrl?: string };
function SortableProductRow({ id, idx, item, onRemove, onLinkChange }: { id: string; idx: number; item: ProductItem; onRemove: () => void; onLinkChange: (url: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1.5 rounded-md border bg-white p-1.5">
      <button type="button" className="cursor-grab text-slate-400 active:cursor-grabbing" {...attributes} {...listeners} aria-label="순서 변경 (드래그)" title="드래그하여 순서 변경">
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-indigo-50 text-[10px] font-bold tabular-nums text-indigo-500">{idx + 1}</span>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded border border-[#e6e7ec] bg-[#f6f7f9]">
        {item.imageUrl && !item.imageUrl.startsWith('icon:')
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
          : <span className="h-3.5 w-3.5 rounded-full bg-slate-300/70" />}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-[12px] font-medium text-slate-800">{item.title}{item.brand && item.brand !== item.title ? <span className="ml-1 font-normal text-slate-400">· {item.brand}</span> : null}</p>
        {/* 랜딩 URL — 담을 때 자동 매핑되지만 여기서 수동 변경 가능(2026-09-29 사용자 요청) */}
        <input
          value={item.linkUrl ?? ''}
          onChange={(e) => onLinkChange(e.target.value)}
          placeholder="랜딩 URL (자동 매핑 · 수정 가능)"
          className="h-7 w-full rounded border border-[#e6e7ec] bg-white px-2 text-[11px] text-slate-600 outline-none focus:border-indigo-400 focus:bg-white"
        />
      </div>
      <button type="button" onClick={onRemove} className="flex h-7 w-6 shrink-0 items-center justify-center rounded border bg-white text-slate-400 hover:text-destructive">×</button>
    </div>
  );
}

// 상품·혜택 담기 모달 — BSS 카탈로그를 체크박스로 여러 개 한 번에 선택해 담는다(2026-09-29 사용자 요청, 드롭다운 대체).
// 카테고리 뱃지 색상 — 디바이스/음식/쇼핑/문화·여가/혜택.
const PICKER_CAT_CLASS: Record<string, string> = {
  '디바이스': 'bg-sky-100 text-sky-700',
  '음식': 'bg-amber-100 text-amber-700',
  '쇼핑': 'bg-emerald-100 text-emerald-700',
  '문화·여가': 'bg-violet-100 text-violet-700',
};
function ProductPickerModal({ open, onClose, options, usedKeys, onAdd }: { open: boolean; onClose: () => void; options: ProductOption[]; usedKeys: Set<string>; onAdd: (keys: string[]) => void }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('전체');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  if (!open) return null;
  // 카테고리 탭 = 옵션에 등장하는 순서대로(디바이스 먼저) + '전체'.
  const cats: string[] = [];
  for (const o of options) { const c = o.category ?? '기타'; if (!cats.includes(c)) cats.push(c); }
  const query = q.trim().toLowerCase();
  const list = options.filter((o) =>
    (cat === '전체' || (o.category ?? '기타') === cat) &&
    (!query || `${o.brand} ${o.title}`.toLowerCase().includes(query)));
  const toggle = (k: string) => setChecked((prev) => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const reset = () => { setChecked(new Set()); setQ(''); setCat('전체'); };
  const submit = () => { onAdd([...checked]); reset(); onClose(); };
  const close = () => { reset(); onClose(); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={close}>
      <div className="flex h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Plus className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">상품·혜택 담기</h2>
          <span className="text-xs text-muted-foreground">여러 개를 체크해 한 번에 담아요</span>
          <button type="button" onClick={close} className="ml-auto text-muted-foreground hover:text-foreground" aria-label="닫기"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-2 border-b p-3">
          <div className="flex items-center gap-2 rounded-md border bg-background px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="브랜드·혜택 검색…" className="h-9 flex-1 bg-transparent text-sm outline-none" autoFocus />
          </div>
          {/* 카테고리 구분 탭 — 디바이스·음식·쇼핑·문화·여가 등 (2026-09-30 사용자 요청) */}
          <div className="flex flex-wrap gap-1">
            {['전체', ...cats].map((c) => (
              <button key={c} type="button" onClick={() => setCat(c)}
                className={cn('rounded-full border px-2.5 py-1 text-[11px] font-medium transition', cat === c ? 'border-[#3a2fd8] bg-[#3a2fd8] text-white' : 'border-[#e6e7ec] bg-white text-slate-500 hover:border-indigo-300')}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {list.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">검색 결과가 없습니다.</p>}
          <div className="space-y-1">
            {list.map((o) => {
              const already = usedKeys.has(o.key);
              const on = checked.has(o.key);
              return (
                <label key={o.key} className={cn('flex cursor-pointer items-center gap-2.5 rounded-md border px-2.5 py-2 text-left', already ? 'cursor-not-allowed border-[#e6e7ec] bg-[#f6f7f9] opacity-60' : on ? 'border-primary bg-accent' : 'border-transparent hover:bg-muted/50')}>
                  <input type="checkbox" checked={on || already} disabled={already} onChange={() => toggle(o.key)} className="accent-[#3a2fd8]" />
                  {o.imageUrl && !o.imageUrl.startsWith('icon:') && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={o.imageUrl} alt="" className="h-7 w-7 shrink-0 rounded object-cover ring-1 ring-slate-200" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[13px] font-medium text-slate-800">{o.brand}</span>
                      {o.category && <span className={cn('shrink-0 rounded px-1 py-[1px] text-[9px] font-semibold', PICKER_CAT_CLASS[o.category] ?? 'bg-[#e6e7ec] text-slate-500')}>{o.category}</span>}
                    </span>
                    {o.title && o.title !== o.brand && <span className="block truncate text-[11px] text-slate-400">{o.title}{o.price ? ` · ${o.price}` : ''}</span>}
                  </span>
                  {already && <span className="shrink-0 rounded bg-[#e6e7ec] px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">담김</span>}
                </label>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2 border-t px-4 py-3">
          <span className="text-xs text-muted-foreground">{checked.size}개 선택</span>
          <button type="button" onClick={close} className="ml-auto rounded-md border px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-[#f6f7f9]">취소</button>
          <button type="button" onClick={submit} disabled={checked.size === 0} className="rounded-md bg-[#3a2fd8] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#2f25bd] disabled:opacity-40">{checked.size > 0 ? `${checked.size}개 담기` : '담기'}</button>
        </div>
      </div>
    </div>
  );
}

// 상품/혜택 묶기 편집기 — BSS 혜택 브랜드 카탈로그에서 담고, 드래그앤드롭으로 순서 변경. 빌더는 순서만(2026-09-29 사용자 요청).
function ProductItemEditor({ items, productOptions, onCommit }: { items: ProductItem[]; productOptions: ProductOption[]; onCommit: (next: ProductItem[]) => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const [pickerOpen, setPickerOpen] = useState(false);
  const rowId = (it: ProductItem, i: number) => `${it.productKey ?? 'item'}-${i}`;
  // 이미 담긴 것 = productKey ∪ brand (시드 파생 아이템은 productKey가 없고 brand만 있음 · BSS 옵션 key=브랜드명이라 브랜드로도 매칭). 중복 방지.
  const usedKeys = new Set([...items.map((it) => it.productKey), ...items.map((it) => it.brand)].filter(Boolean) as string[]);
  // 담을 때 랜딩 URL 자동 매핑 — 디바이스는 상품 상세, 그 외(혜택 브랜드)는 혜택 상세로. 담은 뒤 수동 편집 가능.
  const autoLink = (p: ProductOption) => {
    const slug = encodeURIComponent(p.key.replace(/\s+/g, '-').toLowerCase());
    return p.category === '디바이스' ? `tworld://shop/device/${slug}` : `tworld://benefit/${slug}`;
  };
  const addMany = (keys: string[]) => {
    const news = keys
      .map((k) => productOptions.find((o) => o.key === k))
      .filter((p): p is ProductOption => !!p && !usedKeys.has(p.key))
      .map((p) => ({ productKey: p.key, title: p.title, brand: p.brand, imageUrl: p.imageUrl ?? undefined, price: p.price ?? undefined, badge: p.badge ?? undefined, linkUrl: autoLink(p) }));
    if (news.length) onCommit([...items, ...news]);
  };
  const remove = (idx: number) => onCommit(items.filter((_, j) => j !== idx));
  const patchLink = (idx: number, linkUrl: string) => onCommit(items.map((b, j) => (j === idx ? { ...b, linkUrl } : b)));
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((it, i) => rowId(it, i) === active.id);
    const to = items.findIndex((it, i) => rowId(it, i) === over.id);
    if (from < 0 || to < 0) return;
    const next = [...items];
    next.splice(to, 0, next.splice(from, 1)[0]);
    onCommit(next);
  };
  return (
    <div className="space-y-2 rounded-md border border-[#e6e7ec] bg-white p-3">
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-semibold text-slate-700">상품·혜택 묶기</span>
        <span className="rounded-full bg-[#f6f7f9] px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-slate-500 ring-1 ring-slate-200">{items.length}개</span>
        <span className="ml-auto text-[11px] text-slate-400">드래그로 순서 변경</span>
      </div>
      {items.length === 0 && <p className="rounded-md border border-dashed border-[#e6e7ec] bg-white px-2 py-2 text-[11px] text-slate-400">아래에서 상품·혜택을 골라 담으세요. 랜딩 URL은 담은 뒤 수정할 수 있어요.</p>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((it, i) => rowId(it, i))} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {items.map((it, idx) => (
              <SortableProductRow key={rowId(it, idx)} id={rowId(it, idx)} idx={idx} item={it} onRemove={() => remove(idx)} onLinkChange={(url) => patchLink(idx, url)} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button type="button" onClick={() => setPickerOpen(true)} className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-slate-300 bg-white px-2.5 py-2 text-[12px] font-medium text-slate-600 hover:bg-[#f6f7f9]">
        <Plus className="h-3.5 w-3.5" /> 상품·혜택 담기 (디바이스·음식·쇼핑 등 · 여러 개 선택)
      </button>
      <p className="text-[11px] leading-relaxed text-slate-400">코너 유형에서 상품·혜택을 <b>묶어</b> 등록하면, 빌더에선 <b>하나하나 불러올 필요 없이</b> 이 묶음이 그대로 생성돼요. 각 아이템의 <b>랜딩 URL</b>은 담은 뒤 여기서 수정하고, 순서는 <b>드래그</b>로 조정.</p>
      <ProductPickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} options={productOptions} usedKeys={usedKeys} onAdd={addMany} />
    </div>
  );
}

// 탭·메뉴 칩 한 줄 (드래그앤드롭 · 그립 핸들 · 라벨·링크 편집) — 코너 유형에서 탭 정의 순서를 바꾼다(2026-09-29 사용자 요청).
type ChipDef = { label: string; linkUrl?: string; icon?: string };

// 퀵메뉴 라벨 → 기본 이동 링크·아이콘 자동 매핑. 운영자가 라벨만 정하면 URL·아이콘이 채워지고, 이후 수동 편집 가능.
const QUICK_MENU_MAP: Record<string, { url: string; icon: string }> = {
  '혜택': { url: 'tworld://benefit', icon: 'icon:general/Benefit' },
  '혜택 줍기': { url: 'tworld://benefit/pickup', icon: 'icon:general/Location' },
  '카테고리': { url: 'tworld://category', icon: 'icon:general/Category' },
  '이벤트': { url: 'tworld://event', icon: 'icon:general/Event' },
  '영화 예매': { url: 'tworld://movie', icon: 'icon:general/Movie' },
  '글쓰기': { url: 'tworld://post/new', icon: 'icon:general/NewChat' },
  '더보기': { url: 'tworld://more', icon: 'icon:general/Menu' },
  '이용요금': { url: 'tworld://bill', icon: 'icon:general/Won' },
  '데이터': { url: 'tworld://data', icon: 'icon:general/Data' },
  '멤버십': { url: 'tworld://membership', icon: 'icon:general/Vip' },
  '매장': { url: 'tworld://store', icon: 'icon:general/Store' },
  '고객센터': { url: 'tworld://support', icon: 'icon:general/Call' },
  '검색': { url: 'tworld://search', icon: 'icon:general/Search' },
  '쇼핑': { url: 'tworld://shop', icon: 'icon:general/Cart' },
  '로밍': { url: 'tworld://roaming', icon: 'icon:general/Roaming' },
};
function autoMapChip(label: string): { url: string; icon: string } {
  const key = label.trim();
  // 아이콘은 라벨 규칙(chipIconForLabel)으로 통일 — VIP/0 Week/4월/글로벌 등도 알맞은 아이콘.
  const icon = chipIconForLabel(key);
  if (QUICK_MENU_MAP[key]) return { url: QUICK_MENU_MAP[key].url, icon };
  const hit = key ? Object.keys(QUICK_MENU_MAP).find((k) => key.includes(k) || k.includes(key)) : undefined;
  if (hit) return { url: QUICK_MENU_MAP[hit].url, icon };
  const slug = key.replace(/\s+/g, '-').toLowerCase() || 'menu';
  return { url: `tworld://quickmenu/${encodeURIComponent(slug)}`, icon };
}
// 선택형(탭·메뉴) 기본 칩 — 아이콘+라벨+자동 링크. 편집기·미리보기 공용.
const CHIP_DEFAULTS: ChipDef[] = ['혜택', '카테고리', '이벤트'].map((l) => ({ label: l, ...autoMapChip(l) }));
// 불러온 칩의 빈 아이콘·이동 링크를 라벨에서 자동 채움 — 등록 정의를 그대로 '불러오기'(수정 시 데이터가 쌓여 보이게). 추가는 직접 입력. 2026-09-30
const hydrateChips = (chips: ChipDef[]): ChipDef[] => chips.map((c) => { const a = autoMapChip(c.label); return { ...c, icon: c.icon ?? a.icon, linkUrl: c.linkUrl || a.url }; });

// 칩 아이콘 선택 팝오버 — 일반 아이콘 그리드에서 1개 선택. 선택 안 함(라벨만)도 가능.
function ChipIconPicker({ value, onPick }: { value?: string; onPick: (icon: string | undefined) => void }) {
  const [open, setOpen] = useState(false);
  const general = ICON_CATEGORIES.find((c) => c.key === 'general')?.icons.filter((i) => i.key !== 'general/Dummy') ?? [];
  return (
    <div className="relative shrink-0">
      <button type="button" onClick={() => setOpen((v) => !v)} title="아이콘 선택" className="flex h-8 w-8 items-center justify-center rounded-md border bg-white text-slate-500 hover:border-indigo-300 hover:text-[#3a2fd8]">
        {value && isIconRef(value)
          ? <IconGlyph name={value} className="h-4 w-4" />
          : value && value.startsWith('/assets/')
            ? /* 브랜드색 svg를 연한 원형 뱃지 위에 미리보기(칩과 동일) */ <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#eef0f6]">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={value} alt="" className="h-3 w-3 object-contain" /></span>
            : <Plus className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-9 z-30 w-52 rounded-md border bg-white p-2 shadow-lg">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-600">아이콘</span>
              <button type="button" onClick={() => { onPick(undefined); setOpen(false); }} className="text-[11px] text-slate-400 hover:text-slate-600">선택 안 함</button>
            </div>
            <div className="grid max-h-40 grid-cols-6 gap-1 overflow-y-auto">
              {general.map((ic) => {
                const ref = `icon:${ic.key}`;
                return (
                  <button key={ic.key} type="button" title={ic.label} onClick={() => { onPick(ref); setOpen(false); }}
                    className={cn('flex h-7 w-7 items-center justify-center rounded hover:bg-indigo-50', value === ref ? 'bg-indigo-100 text-[#3a2fd8] ring-1 ring-indigo-300' : 'text-slate-500')}>
                    <IconGlyph name={ref} className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SortableChipDefRow({ id, idx, chip, canRemove, onPatch, onRemove }: { id: string; idx: number; chip: ChipDef; canRemove: boolean; onPatch: (p: Partial<ChipDef>) => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  // 라벨 변경 시 아이콘만 자동 유추(수동 지정값은 보존). 이동 링크는 자동 채우지 않음 — 직접 입력.
  const onLabel = (label: string) => {
    const auto = autoMapChip(label);
    const prevAuto = autoMapChip(chip.label);
    const p: Partial<ChipDef> = { label };
    if (!chip.icon || chip.icon === prevAuto.icon) p.icon = auto.icon;
    onPatch(p);
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1.5">
      <button type="button" className="cursor-grab text-slate-400 active:cursor-grabbing" {...attributes} {...listeners} aria-label="순서 변경 (드래그)" title="드래그하여 순서 변경">
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-indigo-50 text-[10px] font-bold tabular-nums text-indigo-500">{idx + 1}</span>
      <ChipIconPicker value={chip.icon} onPick={(icon) => onPatch({ icon })} />
      <input value={chip.label} onChange={(e) => onLabel(e.target.value)} placeholder="메뉴명" className="h-8 w-24 rounded-md border bg-white px-2 text-xs" />
      <input value={chip.linkUrl ?? ''} onChange={(e) => onPatch({ linkUrl: e.target.value })} placeholder="URL을 입력하세요" className="h-8 min-w-0 flex-1 rounded-md border bg-white px-2 text-xs" />
      <button type="button" onClick={onRemove} disabled={!canRemove} className="flex h-7 w-6 shrink-0 items-center justify-center rounded border bg-white text-slate-400 hover:text-destructive disabled:opacity-30">×</button>
    </div>
  );
}

// 탭·메뉴 정의 편집기 — 라벨·링크·줄수·순서(드래그앤드롭)를 코너 유형에서 정의. 빌더는 순서만(2026-09-29 사용자 요청).
function ChipDefEditor({ chips, rows, onCommit }: { chips: ChipDef[]; rows: number; onCommit: (chips: ChipDef[], rows?: number) => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const rowId = (_c: ChipDef, i: number) => `chip-${i}`;
  const patch = (idx: number, p: Partial<ChipDef>) => onCommit(chips.map((c, j) => (j === idx ? { ...c, ...p } : c)), rows);
  // 탭 추가 — 이동 링크는 비워 두고(직접 입력) 라벨만 기본값. 아이콘은 라벨로 자동 유추.
  const add = () => onCommit([...chips, { label: `메뉴 ${chips.length + 1}` }], rows);
  const remove = (idx: number) => onCommit(chips.filter((_, j) => j !== idx), rows);
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = chips.findIndex((c, i) => rowId(c, i) === active.id);
    const to = chips.findIndex((c, i) => rowId(c, i) === over.id);
    if (from < 0 || to < 0) return;
    const next = [...chips];
    next.splice(to, 0, next.splice(from, 1)[0]);
    onCommit(next, rows);
  };
  return (
    <div className="space-y-2 rounded-md border border-[#e6e7ec] bg-white p-3">
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-semibold text-slate-700">탭·메뉴 정의</span>
        <span className="rounded-full bg-[#f6f7f9] px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-slate-500 ring-1 ring-slate-200">{chips.length}개</span>
        <span className="ml-auto text-[11px] text-slate-400">드래그로 순서 변경</span>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={chips.map((c, i) => rowId(c, i))} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {chips.map((c, idx) => (
              <SortableChipDefRow key={rowId(c, idx)} id={rowId(c, idx)} idx={idx} chip={c} canRemove={chips.length > 1} onPatch={(p) => patch(idx, p)} onRemove={() => remove(idx)} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={add} className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-[#f6f7f9]"><Plus className="h-3.5 w-3.5" /> 탭 추가</button>
        <span className="ml-auto text-[11px] text-slate-500">줄 수</span>
        {[1, 2].map((r) => (
          <button key={r} type="button" onClick={() => onCommit(chips, r)} className={cn('rounded px-2 py-0.5 text-[11px] font-medium', rows === r ? 'bg-[#3a2fd8] text-white' : 'border bg-white text-slate-600 hover:bg-[#f6f7f9]')}>{r}줄</button>
        ))}
      </div>
      <p className="text-[11px] leading-relaxed text-slate-400">탭·메뉴 항목(<b>아이콘·라벨·이동 링크</b>·줄 수·순서)을 코너 유형에서 정의합니다. 라벨을 정하면 <b>이동 링크 URL과 아이콘이 자동 매핑</b>되고(수동 편집 가능), 실서비스 코너는 이 정의를 상속하며 <b>전시화면 관리(빌더)</b>에서는 <b>순서만</b> 바꿀 수 있어요.</p>
    </div>
  );
}

// 코너 유형(거버넌스)별 설명 — 목적·허용 컴포넌트·비고 (정책서 기준 표).
export const CORNER_TYPE_INFO: Record<string, { purpose: string; allow: string; note?: string }> = {
  '상품형': {
    purpose: '상품·요금제·단말·부가서비스 후보를 고객이 탐색하도록 노출하는 코너입니다. 가로 스와이프(2.5배열)·세로 리스트·단일 강조 등 여러 배열(베리에이션)로 구성합니다.',
    allow: '상품형',
    note: '상품은 SKT에서 판매하는 상품만 제공됩니다. (외부에서 임의로 가져오지 않고, 판매 상품 원장에서 선택)',
  },
  '배너형': {
    purpose: '배너 캠페인 관리에 등록된 배너를 불러와 노출하는 코너입니다. 배너 소재·문구는 코너에서 직접 만들지 않고, 무조건 배너 캠페인 관리에서 불러옵니다. — 배너 단일형: 배너 1개를 불러와 단독 노출 / 스와이프형: 배너 2개 이상을 불러와 수동 스와이프·자동 슬라이드로 노출.',
    allow: '배너형',
    note: '배너 소재·문구·랜딩 URL은 배너 캠페인 관리(전시관리)가 소유합니다(공통 1벌·변경 시 승인 재요청). 코너에서는 어떤 배너를 불러올지와 배치·순서·규격·노출 방식만 정합니다. 배너 단일형=1개 불러오기, 스와이프형=여러 개 불러오기.',
  },
  '혜택·오퍼형': {
    purpose: '고객이 받을 수 있는 혜택·쿠폰·제휴 오퍼를 제안하는 코너입니다. 브랜드 로고+혜택 문구 카드나 오퍼 배너 등으로 구성합니다.',
    allow: '혜택형, 정보형, 행동형, 배너형',
  },
  '업무 진입형': {
    purpose: '조회·변경·신청·납부처럼 자주 쓰는 업무로 바로 이동하게 하는 코너입니다. 탭·칩 메뉴(선택형)로 구성합니다.',
    allow: '행동형, 정보형, 선택형',
  },
  '상태 안내형': {
    purpose: '고객 상태·보유 정보·진행 상태·제한 사유 등 “지금 내 상황”을 안내하는 코너입니다.',
    allow: '정보형, 행동형',
  },
  '콘텐츠 안내형': {
    purpose: '이용 가이드·설명·추천 콘텐츠 등을 제공하는 코너입니다.',
    allow: '정보형, 행동형, 배너형',
  },
  '개인화 추천형': {
    purpose: '고객 상태와 행동에 따라 후보와 노출 순서를 다르게 보여주는 코너입니다. (수급 방식으로 CVM 개인화를 켠 코너)',
    allow: '정보형, 혜택형, 선택형, 행동형, 배너형',
  },
  '고정·필수 노출형': {
    purpose: '필수 고지·장애 안내·보안 안내처럼 항상 안정적으로 유지·노출해야 하는 정보를 노출하는 코너입니다.',
    allow: '정보형, 행동형',
  },
};

// DS 포털 라이브러리 스타일 코너 유형 카드 — 미리보기 + 이름/태그/개수 + 수정하기·복제·삭제.
export function CornerTypeCard({ t, onOpen, onDuplicate, onDelete, busy }: { t: CornerTypeRow; onOpen: () => void; onDuplicate: () => void; onDelete: () => void; busy?: boolean }) {
  const name = [t.baseCategory, layoutLabel(t.typeDetail), t.bigBanner ? '빅배너' : ''].filter(Boolean).join(' · ');
  const comp = parseComposition(t.composition);
  const compMeta = comp ? `컴포넌트 ${comp.reduce((s, b) => s + b.count, 0)}개` : (componentLabel(t.componentType) || layoutLabel(t.typeDetail) || '유형');
  const g = deriveCornerTypeUsage({ status: t.status, active: t.active, liveVersion: t.liveVersion ?? null, workingVersion: t.workingVersion ?? 1 });
  // 미리보기 = 실제 배치된 대표 코너(있으면) → 상세와 일치. 없으면 조합(유형 기본) 샘플.
  const previewCorner = cornerRowPreview(t);
  return (
    <div className={cn('group flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.04] shadow-[0_1px_3px_rgba(20,22,40,0.05),0_10px_28px_rgba(20,22,40,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_6px_rgba(20,22,40,0.08),0_18px_42px_rgba(20,22,40,0.14)]', busy && 'pointer-events-none opacity-60')}>
      {/* 미리보기(클릭 → 상세) — 은은한 라벤더 배경 위 라운드 프레임에 코너 전체를 축소해 통째로 보여준다. */}
      <button type="button" onClick={onOpen} className="block w-full p-3 text-left">
        <div className="rounded-xl bg-[#f6f7f9] p-3">
          <div className="pointer-events-none h-52">
            <DevicePreview corner={previewCorner} fit="contain" />
          </div>
        </div>
      </button>
      {/* 이름 · 태그 · 개수 */}
      <div className="flex flex-1 flex-col gap-2 px-5 pt-1">
        <button type="button" onClick={onOpen} className="text-left">
          <p className="text-[16px] font-bold leading-tight text-[#1d1e23] group-hover:text-[#3a2fd8]">{name}</p>
          <span className="mt-1 block font-mono text-[11px] text-slate-400">{t.typeId}</span>
        </button>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn('inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold', cornerTypeChipClass(t.baseCategory))}>{t.baseCategory}</span>
          <span className="text-[11px] font-medium tabular-nums text-slate-400">· {compMeta}</span>
          {t.liveVersion != null && t.active
            ? <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">사용 중 · v{t.liveVersion}</span>
            : <span className="rounded-full bg-[#e6e7ec] px-1.5 py-0.5 text-[10px] text-slate-500">미사용</span>}
          <span className={cn('rounded-full border px-1.5 py-0.5 text-[10px] font-semibold', CORNER_TYPE_STATUS_COLOR[t.status] ?? 'bg-muted')}>{CORNER_TYPE_STATUS_LABEL[t.status] ?? t.status}</span>
          {g.needsPublish && <span className="rounded-full border border-indigo-300 bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-[#2f25bd]">반영 필요</span>}
        </div>
      </div>
      {/* 액션 — 수정하기(DS 블루) · 복제 · 삭제 */}
      <div className="mt-4 flex items-center gap-1.5 px-5 pb-5">
        <button type="button" onClick={onOpen} className="inline-flex items-center gap-1 rounded-lg border border-[#d9d5fb] bg-[#efedfe] px-3.5 py-2 text-[12.5px] font-bold text-[#3a2fd8] transition hover:bg-[#efedfe]">
          <Pencil className="h-3.5 w-3.5" /> 수정하기
        </button>
        <button type="button" onClick={onDuplicate} className="inline-flex items-center gap-1 rounded-lg border border-[#e6e7ec] bg-white px-3.5 py-2 text-[12.5px] font-medium text-[#53586a] transition hover:bg-[#f6f7f9]">
          <Copy className="h-3.5 w-3.5" /> 복제
        </button>
        <button type="button" onClick={onDelete} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-[#e6e7ec] bg-white px-3.5 py-2 text-[12.5px] font-medium text-[#53586a] transition hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" /> 삭제
        </button>
      </div>
    </div>
  );
}

// 반려 정형 사유 — 정책서 ST-DSP-003(필수정보 누락·링크 오류·표기 미흡·랜딩 불일치) + PI-DSP-CMP-004(대체텍스트) 기준.
//  '기타'는 자유 입력. 검수자가 사유를 표준화해 골라 재작업 지침이 일관되게 남도록 한다.
const REJECT_REASONS = ['필수정보 누락', '대체텍스트 없음', '잘못된 링크', '랜딩 불일치', '표기 미흡', '기타'] as const;

// 배열 카드 (마스터 목록의 그리드 셀) — 미리보기·이름·상태 + 상태별 인라인 승인 워크플로우 액션.
//  검수 대기(REVIEW) → 승인/반려(정형 사유), 초안·반려(DRAFT/REJECTED) → 승인 요청, 승인완료(APPROVED)+미반영 → 반영.
//  카드 본문 클릭은 편집 상세로, 액션 버튼은 stopPropagation으로 상세 이동을 막고 서버 액션만 수행.
export function VariationCard({ v, onOpen }: { v: CornerTypeRow; onOpen: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [preset, setPreset] = useState('');   // 선택한 정형 사유 (REJECT_REASONS)
  const [detail, setDetail] = useState('');   // '기타' 자유 입력 / 보조 메모
  const [err, setErr] = useState<string | null>(null);
  const [, startTx] = useTransition();
  const g = deriveCornerTypeUsage({ status: v.status, active: v.active, liveVersion: v.liveVersion ?? null, workingVersion: v.workingVersion ?? 1 });
  const st = v.status;

  const done = () => { setBusy(false); setErr(null); router.refresh(); };
  const closeReject = () => { setRejecting(false); setPreset(''); setDetail(''); setErr(null); };
  const request = () => { setBusy(true); setErr(null); startTx(async () => { const r = await requestCornerTypeReview(v.id); if (r && !r.ok) { setBusy(false); setErr(r.issues?.map((i) => i.detail).join(' ') || '승인 요청 조건을 충족하지 못했습니다.'); } else done(); }); };
  const approve = () => { setBusy(true); setErr(null); startTx(async () => { await approveCornerType(v.id); done(); }); };
  const doReject = () => {
    if (!preset) { setErr('반려 사유를 선택하세요.'); return; }
    const d = detail.trim();
    if (preset === '기타' && !d) { setErr('기타 사유를 입력하세요.'); return; }
    // 최종 사유 = 정형 사유(+ 보조 메모). 감사 로그·재작업 지침에 표준 문구로 남는다.
    const finalReason = preset === '기타' ? d : d ? `${preset} — ${d}` : preset;
    setBusy(true); setErr(null);
    startTx(async () => { const res = await rejectCornerType(v.id, finalReason); if (res && !res.ok) { setBusy(false); setErr(res.error ?? '반려에 실패했습니다.'); } else { closeReject(); done(); } });
  };
  const publish = () => { setBusy(true); setErr(null); startTx(async () => { const res = await publishCornerType(v.id); if (res && !res.ok) { setBusy(false); setErr(res.error ?? '반영에 실패했습니다.'); } else done(); }); };

  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const btn = 'inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition disabled:opacity-50';

  return (
    <div className={cn('flex flex-col overflow-hidden rounded-xl border border-[#e6e7ec] bg-white transition', busy && 'opacity-60')}>
      <button
        type="button"
        onClick={onOpen}
        className="group/vc flex flex-1 flex-col text-left transition hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(20,22,40,0.10)]"
      >
        <div className="bg-[#f6f7f9] p-2.5">
          {/* 썸네일 = 실제 배치된 대표 코너(있으면). 상세 첫 타일과 동일 코너라 이미지가 일치한다. 미배치면 조합 샘플. */}
          <div className="pointer-events-none h-40"><DevicePreview corner={cornerRowPreview(v)} fit="contain" /></div>
        </div>
        <div className="flex flex-1 flex-col gap-1.5 px-3 py-2.5">
          {/* 코너명(실제 케이스) = 주 식별자. 같은 배열이 여러 케이스로 분리돼도 코너명으로 구분된다. */}
          <p className="truncate text-[13.5px] font-semibold text-[#1d1e23] group-hover/vc:text-[#3a2fd8]">{v.previewCorner?.name ?? (layoutBi(v.typeDetail) || v.typeDetail || '기본')}</p>
          <p className="truncate text-[11px] text-slate-500">{layoutBi(v.typeDetail) || v.typeDetail || '기본'}</p>
          <div className="flex flex-wrap items-center gap-1">
            {v.liveVersion != null && v.active
              ? <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">사용 중 · v{v.liveVersion}</span>
              : <span className="rounded-full bg-[#e6e7ec] px-1.5 py-0.5 text-[10px] text-slate-500">미사용</span>}
            <span className={cn('rounded-full border px-1.5 py-0.5 text-[10px] font-semibold', CORNER_TYPE_STATUS_COLOR[st] ?? 'bg-muted')}>{CORNER_TYPE_STATUS_LABEL[st] ?? st}</span>
            {g.needsPublish && <span className="rounded-full border border-indigo-300 bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-[#2f25bd]">반영 필요</span>}
          </div>
        </div>
      </button>

      {/* 상태별 인라인 액션 */}
      <div className="border-t border-[#e6e7ec] px-3 py-2" onClick={stop}>
        {err && <p className="mb-1.5 text-[10px] leading-snug text-rose-600">{err}</p>}
        {rejecting ? (
          <div className="space-y-1.5">
            <select
              autoFocus value={preset} onChange={(e) => { setPreset(e.target.value); setErr(null); }}
              className="h-7 w-full rounded-md border border-[#e6e7ec] bg-white px-1.5 text-[11px] outline-none focus:border-rose-400"
            >
              <option value="">반려 사유 선택 (필수)</option>
              {REJECT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            {preset && (
              <input
                value={detail} onChange={(e) => setDetail(e.target.value)}
                placeholder={preset === '기타' ? '사유 입력 (필수)' : '보완 안내 (선택)'}
                className="h-7 w-full rounded-md border border-[#e6e7ec] px-2 text-[11px] outline-none focus:border-rose-400"
                onKeyDown={(e) => { if (e.key === 'Enter') doReject(); if (e.key === 'Escape') closeReject(); }}
              />
            )}
            <div className="flex gap-1.5">
              <button type="button" disabled={busy} onClick={doReject} className={cn(btn, 'flex-1 border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100')}>반려 확정</button>
              <button type="button" disabled={busy} onClick={closeReject} className={cn(btn, 'border-[#e6e7ec] text-slate-500 hover:bg-[#f6f7f9]')}>취소</button>
            </div>
          </div>
        ) : st === 'REVIEW' ? (
          <div className="flex gap-1.5">
            <button type="button" disabled={busy} onClick={approve} className={cn(btn, 'flex-1 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100')}><Check className="h-3 w-3" /> 승인</button>
            <button type="button" disabled={busy} onClick={() => setRejecting(true)} className={cn(btn, 'flex-1 border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100')}><X className="h-3 w-3" /> 반려</button>
          </div>
        ) : st === 'DRAFT' || st === 'REJECTED' ? (
          <button type="button" disabled={busy} onClick={request} className={cn(btn, 'w-full border-indigo-200 bg-indigo-50 text-[#2f25bd] hover:bg-indigo-100')}>승인 요청</button>
        ) : st === 'APPROVED' && g.needsPublish ? (
          <button type="button" disabled={busy} onClick={publish} className={cn(btn, 'w-full border-indigo-200 bg-indigo-50 text-[#2f25bd] hover:bg-indigo-100')}>반영(사용)</button>
        ) : (
          <p className="text-center text-[11px] text-slate-400">사용 중 · 조치 없음</p>
        )}
      </div>
    </div>
  );
}

// 배열(레이아웃) 그룹 카드 — 같은 배열의 케이스(코너)들을 하나로 묶어 보여준다.
//  목록에서는 '어떤 배열이 있는지'를 배열 단위로 스캔하고, 클릭하면 그 배열의 케이스들을 합쳐서(각각 승인·편집) 본다.
//  단일 케이스면 바로 상세([id])로, 여러 케이스면 배열 상세(group?base&detail)로 이동.
function LayoutGroupCard({ cases, onOpen }: { cases: CornerTypeRow[]; onOpen: () => void }) {
  const rep = cases[0];
  const multi = cases.length > 1;
  const preview = cornerRowPreview(rep);
  const liveCount = cases.filter((c) => c.liveVersion != null && c.active).length;
  const needAttention = cases.filter((c) => c.status === 'REVIEW' || c.status === 'REJECTED' || c.status === 'DRAFT').length;
  const caseNames = cases.map((c) => c.previewCorner?.name ?? c.name).filter(Boolean);
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.04] shadow-[0_1px_3px_rgba(20,22,40,0.05),0_10px_28px_rgba(20,22,40,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_6px_rgba(20,22,40,0.08),0_18px_42px_rgba(20,22,40,0.14)]">
      <button type="button" onClick={onOpen} className="flex flex-1 flex-col text-left">
        <div className="relative bg-[#f6f7f9] p-2.5">
          {/* 대표 미리보기(첫 케이스) + 여러 케이스면 개수 배지. 배경은 단일/다중 동일(#f6f7f9). */}
          <div className="pointer-events-none relative h-40"><DevicePreview corner={preview} fit="contain" /></div>
          {multi && <span className="absolute right-3 top-3 rounded-full bg-slate-900/85 px-2 py-0.5 text-[11px] font-bold text-white">{cases.length}개 케이스</span>}
        </div>
        <div className="flex flex-1 flex-col gap-1.5 px-3 py-2.5">
          <p className="truncate text-[13.5px] font-semibold text-[#1d1e23] group-hover:text-[#3a2fd8]">{layoutBi(rep.typeDetail) || rep.typeDetail || '기본'}</p>
          {/* 이 배열에 속한 케이스(코너)명 — 어떤 코너들이 묶였는지 한눈에 */}
          <p className="line-clamp-2 text-[11px] leading-tight text-slate-500">{caseNames.join(' · ')}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">사용 {liveCount}/{cases.length}</span>
            {needAttention > 0 && <span className="rounded-full border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">조치 {needAttention}</span>}
          </div>
        </div>
      </button>
    </div>
  );
}

export function CornerTypeManager({ types, builtOptions }: { types: CornerTypeRow[]; builtOptions: BuiltCornerOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // ── 상세 검색 필터 (T우주 코너 유형 목록 기준) ──
  // 필터 상태는 URL 쿼리에 저장 → 상세로 갔다가 뒤로 와도 유지된다.
  const statusKeys = Object.keys(CORNER_TYPE_STATUS_LABEL);
  const spDomain = sp.get('domain'); // 상위 분기: 전시 / 프로모션 / 상품
  const [domain, setDomain] = useState<Domain>(spDomain === '프로모션' || spDomain === '상품' ? spDomain : '전시');
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
  const [view, setView] = useState<'card' | 'list'>(sp.get('view') === 'card' ? 'card' : 'list'); // 기본=리스트(2026-09-29 사용자 결정), 카드 보기 옵션

  // 상위 분기(도메인) — 전시(상품형·이벤트미션 제외 6거버넌스) / 프로모션(이벤트·미션) / 상품(상품형).
  const domainTypes = types.filter((t) => domainOf(t.baseCategory) === domain);
  const baseOptions = ['전체', ...Array.from(new Set(domainTypes.map((t) => t.baseCategory).filter(Boolean)))];
  const detailOptions = ['전체', ...Array.from(new Set(domainTypes.map((t) => t.typeDetail).filter((d): d is string => !!d)))];

  const reset = () => { setBase('전체'); setDetail('전체'); setUseOn(true); setUseOff(true); setStatusSel(new Set(statusKeys)); setField('typeId'); setQ(''); setPage(1); };
  const switchDomain = (d: Domain) => { setDomain(d); setBase('전체'); setDetail('전체'); setPage(1); };
  // 카드 액션 — 복제/삭제(서버 액션 + 새로고침)
  const [, startTx] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const onDuplicate = (id: string) => { setBusyId(id); startTx(async () => { await duplicateCornerType(id); setBusyId(null); router.refresh(); }); };
  const onDelete = (id: string, label: string) => {
    if (!window.confirm(`'${label}' 코너 유형을 삭제할까요? 되돌릴 수 없습니다.`)) return;
    setBusyId(id); startTx(async () => { await deleteCornerType(id); setBusyId(null); router.refresh(); });
  };

  const ql = q.trim().toLowerCase();
  const filteredAll = domainTypes.filter((t) => {
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
  // 코너 = 껍데기 → 같은 (코너 유형 · 배열·레이아웃 · 빅배너) 껍데기는 하나만 노출(중복 케이스 숨김, 2026-10-06 대공사).
  const filtered = (() => {
    const seen = new Set<string>();
    return filteredAll.filter((t) => {
      const key = `${t.baseCategory}|${t.typeDetail ?? ''}|${t.bigBanner ? 'B' : ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const curPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((curPage - 1) * perPage, curPage * perPage);

  // 필터 상태 → URL 쿼리 동기화 (기본값은 생략). 상세 진입 후 뒤로 오면 이 쿼리로 복원된다.
  useEffect(() => {
    const p = new URLSearchParams();
    if (domain !== '전시') p.set('domain', domain);
    if (base !== '전체') p.set('base', base);
    if (detail !== '전체') p.set('detail', detail);
    if (!useOn) p.set('on', '0');
    if (!useOff) p.set('off', '0');
    if (statusSel.size < statusKeys.length) p.set('status', [...statusSel].join(','));
    if (field !== 'typeId') p.set('field', field);
    if (q.trim()) p.set('q', q.trim());
    if (perPage !== 10) p.set('pp', String(perPage));
    if (curPage !== 1) p.set('p', String(curPage));
    if (view === 'card') p.set('view', 'card');
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain, base, detail, useOn, useOff, statusSel, field, q, perPage, curPage, view]);

  const selectCls = 'sel';
  const chkCls = 'flex cursor-pointer items-center gap-1.5 text-[13px] text-slate-600';
  const chkInput = 'h-4 w-4 rounded accent-[#3a2fd8]';

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

      {/* ── 최상위 분기: 전시 / 프로모션 / 상품 (DS 포털식 세그먼트) ── */}
      <div className="inline-flex rounded-xl border border-[#e6e7ec] bg-[#f6f7f9] p-1">
        {DOMAINS.map((d) => {
          const active = domain === d;
          const cnt = types.filter((t) => domainOf(t.baseCategory) === d).length;
          return (
            <button
              key={d}
              type="button"
              onClick={() => switchDomain(d)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold transition',
                active
                  ? 'bg-white text-[#3a2fd8] shadow-[0_1px_3px_rgba(0,0,0,0.1),0_0_0_1px_rgba(74,108,247,0.18)]'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {d}
              <span className={cn('rounded-full px-1.5 text-[11px] tabular-nums', active ? 'bg-[#3a2fd8]/10 text-[#3a2fd8]' : 'bg-black/5')}>{cnt}</span>
            </button>
          );
        })}
      </div>
      <p className="-mt-1 text-[12px] leading-relaxed text-muted-foreground">{DOMAIN_GUIDE[domain]}</p>

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
                    active ? 'border-[#3a2fd8] text-[#3a2fd8]' : 'border-transparent text-slate-400 hover:text-slate-600',
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

      {/* 검색 필터 — 참고 디자인 .ft 폼 테이블 + .sbtn */}
      <div className="mt-6">
        <FilterPanel
          rows={[
            [['코너 유형', (
              <span key="chips" className="chipline">
                {baseOptions.map((b) => {
                  const active = base === b;
                  const count = b === '전체' ? domainTypes.length : domainTypes.filter((t) => t.baseCategory === b).length;
                  const color = b === '전체' ? `${CHIP_BASE} bg-white text-[var(--ink2)] ring-1 ring-inset ring-[var(--line2)]` : cornerTypeChipClass(b);
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => { setBase(b); setPage(1); }}
                      className={cn('gap-1.5 transition', color, active ? 'ring-2 ring-inset ring-[var(--ac)]' : 'opacity-75 hover:opacity-100')}
                    >
                      {b}<span className="rounded bg-black/5 px-1.5 text-[11px] tabular-nums">{count}</span>
                    </button>
                  );
                })}
              </span>
            ), 3]],
            [
              ['유형 상세', (
                <select key="dt" value={detail} onChange={(e) => { setDetail(e.target.value); setPage(1); }} className={`${selectCls} w200`}>
                  {detailOptions.map((o) => <option key={o} value={o}>{o === '전체' ? '전체' : layoutLabel(o)}</option>)}
                </select>
              )],
              ['사용여부', (
                <span key="use" className="ck-g">
                  <label className={chkCls}><input type="checkbox" className={chkInput} checked={useOn && useOff} onChange={(e) => { setUseOn(e.target.checked); setUseOff(e.target.checked); setPage(1); }} />전체</label>
                  <label className={chkCls}><input type="checkbox" className={chkInput} checked={useOn} onChange={(e) => { setUseOn(e.target.checked); setPage(1); }} />사용</label>
                  <label className={chkCls}><input type="checkbox" className={chkInput} checked={useOff} onChange={(e) => { setUseOff(e.target.checked); setPage(1); }} />미사용</label>
                </span>
              )],
            ],
            [['승인상태', (
              <span key="st" className="ck-g">
                <label className={chkCls}><input type="checkbox" className={chkInput} checked={statusSel.size === statusKeys.length} onChange={(e) => { setStatusSel(e.target.checked ? new Set(statusKeys) : new Set()); setPage(1); }} />전체</label>
                {statusKeys.map((k) => (
                  <label key={k} className={chkCls}><input type="checkbox" className={chkInput} checked={statusSel.has(k)} onChange={(e) => { const n = new Set(statusSel); if (e.target.checked) n.add(k); else n.delete(k); setStatusSel(n); setPage(1); }} />{CORNER_TYPE_STATUS_LABEL[k] ?? k}</label>
                ))}
              </span>
            ), 3]],
            [['직접 검색', (
              <span key="q" className="rng">
                <select value={field} onChange={(e) => setField(e.target.value as typeof field)} className={`${selectCls} w200`}>
                  <option value="typeId">코너 유형 ID</option>
                  <option value="createdBy">등록자</option>
                </select>
                <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="영문/숫자 포함 10자 이내로 입력해 주세요." className="inp w-[340px] max-w-full" />
              </span>
            ), 3]],
          ]}
          onReset={reset}
          onSearch={() => setPage(1)}
        />
      </div>

      {/* 보기 전환 — 카드(배열 그룹) / 리스트(플랫 테이블). 기본=카드. */}
      <ListHeader
        title="검색결과"
        count={filtered.length}
        right={
          <>
            <div className="inline-flex rounded-lg border border-[#e6e7ec] bg-white p-0.5">
          {([['card', '카드'], ['list', '리스트']] as const).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => { setView(v); setPage(1); }}
              className={cn('inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition', view === v ? 'bg-[#3a2fd8] text-white' : 'text-slate-500 hover:text-slate-700')}
            >
              {v === 'card' ? <LayoutGrid className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}{label}
            </button>
          ))}
        </div>
          </>
        }
      />

      {/* 카드 보기 — 유형별 섹션(헤더 + 배열 그리드) 스택. */}
      {view === 'card' && (() => {
        const allGroups = domainGovernances(domain, Array.from(new Set(domainTypes.map((t) => t.baseCategory).filter(Boolean))));
        return (
          <>
            {/* 유형별 섹션(헤더 + 배열 그리드) 스택 — filtered는 base를 반영하므로 base가 특정 유형이면 그 유형만. */}
            {(() => {
              const groups = base === '전체' ? allGroups : allGroups.filter((bc) => bc === base);
              const visible = groups.filter((bc) => filtered.some((t) => t.baseCategory === bc));
              if (visible.length === 0) {
                return <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-muted-foreground">{types.length === 0 ? <>등록된 코너 유형이 없습니다. 우측 상단 <b className="text-foreground">등록</b>으로 추가하세요.</> : '검색 조건에 맞는 배열이 없습니다.'}</div>;
              }
              return (
                <div className="space-y-4">
                  {visible.map((bc) => {
                    const rows = filtered.filter((t) => t.baseCategory === bc);
                    // 같은 배열(typeDetail)의 케이스(코너)들을 묶는다 — 목록은 '배열 단위'로 보여준다(케이스별 나열 X).
                    const byDetail = new Map<string, CornerTypeRow[]>();
                    for (const r of rows) {
                      const k = r.typeDetail ?? '';
                      const arr = byDetail.get(k) ?? [];
                      arr.push(r);
                      byDetail.set(k, arr);
                    }
                    const layoutGroups = [...byDetail.entries()];
                    const info = CORNER_TYPE_INFO[bc];
                    return (
                      <section key={bc} className="rounded-2xl bg-white p-5 ring-1 ring-black/[0.04] shadow-[0_1px_3px_rgba(20,22,40,0.05),0_10px_28px_rgba(20,22,40,0.08)]">
                        <div className="mb-4 flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={cn('inline-flex items-center rounded-md px-2.5 py-1 text-[15px] font-bold', cornerTypeChipClass(bc))}>{bc}</span>
                              {cornerTypeEn(bc) && <span className="text-[12px] font-medium text-slate-400">{cornerTypeEn(bc)}</span>}
                              <span className="rounded-full bg-[#e6e7ec] px-2 py-0.5 text-[12px] font-medium tabular-nums text-slate-600">{layoutGroups.length}개 배열</span>
                            </div>
                            {info && <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{info.purpose}</p>}
                            {info && <p className="mt-1 text-[12px] text-slate-400">허용 컴포넌트: {info.allow}</p>}
                            {info?.note && <p className="mt-2 rounded-md bg-amber-50 px-2.5 py-2 text-[12px] leading-relaxed text-amber-700">{info.note}</p>}
                          </div>
                          <button
                            type="button"
                            onClick={() => router.push(`/admin/corner-types/group?base=${encodeURIComponent(bc)}`)}
                            className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-[#d9d5fb] bg-[#efedfe] px-3 py-1.5 text-[12.5px] font-semibold text-[#3a2fd8] transition hover:bg-[#efedfe]"
                          >
                            전체 관리 <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-3 max-xl:grid-cols-3 max-md:grid-cols-2">
                          {layoutGroups.map(([detail, cases]) => (
                            <LayoutGroupCard
                              key={detail || '기본'}
                              cases={cases}
                              // 항상 대표(첫) 케이스 상세로 직행 — 상세 상단의 '형제 케이스 탭'으로 나머지 케이스를 전환(중간 고르기 페이지 없음).
                              onOpen={() => router.push(`/admin/corner-types/${cases[0].id}`)}
                            />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              );
            })()}
          </>
        );
      })()}

      {/* 리스트 보기 — 케이스(코너 유형) 플랫 테이블. 배열별 그룹 없이 한 줄씩. 클릭 시 상세로. */}
      {view === 'list' && (
        <div className="border-y border-[#e6e7ec] bg-white">
          {/* 테이블 폰트 통일: 모든 셀 13px · 레귤러(헤더/셀 동일) */}
          <table className="w-full text-[13px] font-normal">
            <thead>
              <tr className="border-b border-[#e6e7ec] bg-[#f6f7f9] text-[#53586a]">
                <th className="w-14 px-3 py-2.5 text-left font-semibold">NO</th>
                <th className="w-44 px-3 py-2.5 text-center font-semibold">미리보기</th>
                <th className="px-3 py-2.5 text-left font-semibold">코너 유형</th>
                <th className="px-3 py-2.5 text-left font-semibold">배열·레이아웃</th>
                <th className="px-3 py-2.5 text-left font-semibold">코너(케이스)</th>
                <th className="w-20 px-3 py-2.5 text-left font-semibold">사용여부</th>
                <th className="w-28 px-3 py-2.5 text-left font-semibold">승인상태</th>
                <th className="px-3 py-2.5 text-left font-semibold">최근 수정자</th>
                <th className="px-3 py-2.5 text-left font-semibold">최근 수정일시</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr><td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">검색 결과가 없습니다.</td></tr>
              ) : pageRows.map((t, i) => (
                <tr key={t.id} className="cursor-pointer border-b border-[#e6e7ec] last:border-0 hover:bg-[#f6f7f9]" onClick={() => router.push(`/admin/corner-types/${t.id}`)}>
                  <td className="px-3 py-2.5 align-middle tabular-nums text-slate-500">{(curPage - 1) * perPage + i + 1}</td>
                  <td className="px-3 py-2.5">
                    {/* 미리보기를 번호 옆으로 고정 — 셀마다 같은 위치(가운데)에 렌더돼 스캔이 편함 */}
                    <div className="pointer-events-none mx-auto h-24 w-40 overflow-hidden rounded-lg border border-[#e6e7ec] bg-[#f6f7f9] p-1.5">
                      <DevicePreview corner={cornerRowPreview(t)} fit="contain" align="center-middle" />
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 align-middle"><span className={cn('inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-[12px]', cornerTypeChipClass(t.baseCategory))}>{t.baseCategory}</span></td>
                  <td className="px-3 py-2.5 align-middle text-slate-700">{layoutBi(t.typeDetail) || t.typeDetail || '기본'}</td>
                  <td className="px-3 py-2.5 align-middle text-slate-800">{t.previewCorner?.name ?? '-'}</td>
                  <td className="px-3 py-2.5 align-middle text-slate-600">{t.active ? '사용' : '미사용'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 align-middle"><span className={cn('inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-[12px]', CORNER_TYPE_STATUS_COLOR[t.status] ?? 'bg-muted')}>{CORNER_TYPE_STATUS_LABEL[t.status] ?? t.status}</span></td>
                  <td className="px-3 py-2.5 align-middle text-slate-600">{t.updatedBy ?? t.createdBy ?? '-'}</td>
                  <td className="px-3 py-2.5 align-middle text-slate-500">{(t.updatedAt ?? '').replace('T', ' ').slice(0, 16) || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 border-t p-3">
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 10).map((p) => (
                <button key={p} onClick={() => setPage(p)} className={cn('h-8 w-8 rounded-md text-xs', p === curPage ? 'bg-[#3a2fd8] text-white' : 'hover:bg-secondary')}>{p}</button>
              ))}
            </div>
          )}
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
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#3a2fd8] text-[11px] font-bold leading-none text-white">{n}</span>
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
// 토글 스위치 (DS 속성 패널 스타일)
function Switch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={() => onChange(!checked)}
      className={cn('relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition', checked ? 'bg-[#3a2fd8]' : 'bg-slate-300', disabled && 'cursor-not-allowed opacity-40')}
      aria-pressed={checked}>
      <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow transition', checked ? 'translate-x-4' : 'translate-x-0.5')} />
    </button>
  );
}

export function CornerTypeForm({ row, builtOptions, registered = [], bannerCampaigns = [], productOptions = [], onClose, bulk = false, bulkArrays, submitAction }: { row: CornerTypeRow; builtOptions: BuiltCornerOption[]; registered?: RegisteredCombo[]; bannerCampaigns?: BannerCampaignOption[]; productOptions?: ProductOption[]; onClose: () => void; bulk?: boolean; bulkArrays?: string[]; submitAction?: (fd: FormData) => void | Promise<void> }) {
  const isNew = !row.id;
  // 등록(신규)은 스텝퍼로 단계별 설정 — 프로모션 등록처럼(2026-09-30 사용자 요청). 수정은 전체를 한 화면에.
  const [step, setStep] = useState(0);
  // 2단 분류: ① 코너 유형(base) → ② 배열·레이아웃(detail). 구성 컴포넌트는 배열·레이아웃에서 자동 도출.
  const [base, setBase] = useState(row.baseCategory);
  const [detail, setDetail] = useState(row.typeDetail ?? '');
  // bulk 모드: ② 배열·레이아웃을 다중 선택 → 공통 설정을 선택한 모든 배열에 한 번에 적용.
  const [selectedArrays, setSelectedArrays] = useState<string[]>(() => (bulk ? (bulkArrays && bulkArrays.length ? bulkArrays : (row.typeDetail ? [row.typeDetail] : [])) : []));
  // 기존(등록된) 배열은 유형 변경 불가(고정). 신규로 추가한 배열만 유형 선택·삭제 가능.
  const [lockedCount] = useState(() => (bulk && bulkArrays ? bulkArrays.length : 0));
  const toggleArr = (d: string) => setSelectedArrays((xs) => { const next = xs.includes(d) ? xs.filter((x) => x !== d) : [...xs, d]; setDetail(next[0] ?? ''); return next; });
  const [addingArr, setAddingArr] = useState(false); // '배열 추가' 입력 열림
  const [newArr, setNewArr] = useState('');
  const addArr = () => { const v = newArr.trim(); if (v && !selectedArrays.includes(v)) { setSelectedArrays((xs) => [...xs, v]); setDetail((p) => p || v); } setNewArr(''); setAddingArr(false); };
  // bulk 카드 조작 — 배열을 카드로 하나씩 추가/이름수정/삭제
  const addBlankArr = () => setSelectedArrays((xs) => [...xs, '']);
  const renameArr = (i: number, val: string) => setSelectedArrays((xs) => { const n = xs.map((x, j) => (j === i ? val : x)); setDetail(n[0] ?? ''); return n; });
  const removeArrAt = (i: number) => setSelectedArrays((xs) => { const n = xs.filter((_, j) => j !== i); setDetail(n[0] ?? ''); return n; });
  const [bigBanner, setBigBanner] = useState(row.bigBanner ?? false); // ④ 빅배너 구분자
  const [active, setActive] = useState(row.active);
  const [moreLabel, setMoreLabel] = useState(row.defaultMoreButtonLabel ?? ''); // CTA 문구(controlled) — 표시 항목에서 관리 · 미리보기·빌더 상속
  // 정의(거버넌스) 기본값 — 코너 유형이 문구·개수·형태까지 정의(2026-09-29 거버넌스 분리). 빌더는 쌓기+CVM만.
  const [mainTitleText, setMainTitleText] = useState(row.defaultMainTitle ?? '');
  // 타겟별 문구 세트 제거(2026-10-06 회의) — 실제 문구(콘텐츠)·타겟 베리에이션은 빌더(전시화면 관리)에서 등록. 코너 유형은 기본 타이틀만.
  const [subTitleText, setSubTitleText] = useState(row.defaultSubTitle ?? '');
  const [subTitleIcon, setSubTitleIcon] = useState(row.defaultSubTitleIcon ?? '화살표');
  const [cardShape, setCardShape] = useState(row.defaultCardShape ?? '');
  const [minItems, setMinItems] = useState(row.defaultMinItems != null ? String(row.defaultMinItems) : '');
  const [maxItems, setMaxItems] = useState(row.defaultMaxItems != null ? String(row.defaultMaxItems) : '');
  const parseBannerOpt = (k: 'mode' | 'showIndicator') => { try { const o = JSON.parse(row.defaultBannerOptions ?? ''); return k === 'mode' ? (o.mode === 'auto' ? 'auto' : 'swipe') : o.showIndicator !== false; } catch { return k === 'mode' ? 'swipe' : true; } };
  const [bannerMode, setBannerMode] = useState<'swipe' | 'auto'>(parseBannerOpt('mode') as 'swipe' | 'auto');
  const [bannerIndicator, setBannerIndicator] = useState<boolean>(parseBannerOpt('showIndicator') as boolean);
  const [recSource, setRecSource] = useState(row.defaultRecSource ? normalizeRecSource(row.defaultRecSource) : ''); // 추천 수급 방식 기본값(controlled) — 노출·구성 노출 여부를 좌우
  // ③ 컴포넌트 조합 — 배열·레이아웃에서 자동 도출(읽기 전용, 2026-09-29 사용자 결정). 저장된 조합이 있으면 그대로 표시.
  const [blocks, setBlocks] = useState<Composition>(() => {
    const parsed = parseComposition(row.composition) ?? [];
    // 수정 진입 시 선택형(탭·메뉴) 칩의 빈 아이콘·이동 링크를 라벨에서 자동 채워 '데이터가 쌓인' 상태로 불러온다.
    return parsed.map((b) => (b.componentType === '선택형' && b.chips && b.chips.length) ? { ...b, chips: hydrateChips(b.chips as ChipDef[]) } : b);
  });
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
    useBadge: row.useBadge,
    useImage: row.useImage,
    usePrice: row.usePrice,
    useDesc: row.useDesc,
  });
  // 세부 항목 토글 — 종속 규칙(타이틀↔서브, 가격↔배지) 공용. 플랫/그룹 UI가 함께 씀.
  const toggleFeature = (key: keyof typeof features, on: boolean) => setFeatures((prev) => {
    const next = { ...prev, [key]: on };
    if (key === 'useMainTitle' && !on) next.useSubTitle = false;
    if (key === 'useSubTitle' && on) next.useMainTitle = true;
    if (key === 'usePrice' && !on) next.useBadge = false;
    if (key === 'useBadge' && on) next.usePrice = true;
    return next;
  });

  // ① 코너 유형 = 정책서 거버넌스 8종(배너형 포함) + 현재 등록된 모든 케이스의 유형(전시 도메인). 2026-09-29 사용자 요청.
  //   배너형도 정식 코너 유형(배너 단일형/스와이프형)으로 신규 등록 가능. 배너 소재·문구는 배너 캠페인 관리가 소유.
  const baseOptions = Array.from(
    new Set<string>([
      ...(CORNER_TYPES as readonly string[]),
      ...registered.map((r) => r.baseCategory).filter((b) => b && domainOf(b) === domainOf(base)), // 현재 등록된 케이스의 유형(같은 도메인)
      ...(!isNew && row.baseCategory ? [row.baseCategory] : []),
    ]),
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
    for (const d of cornerTypeDetails(base)) if (!seen.has(d)) { seen.add(d); out.push(d); } // 카탈로그 순서 우선(가로2.5·가로1.5·세로·그리드)
    for (const r of registered.filter((x) => x.baseCategory === base)) if (r.typeDetail && !seen.has(r.typeDetail)) { seen.add(r.typeDetail); out.push(r.typeDetail); } // 카탈로그 밖 등록분
    if (onOrigBase && row.typeDetail && !seen.has(row.typeDetail)) { seen.add(row.typeDetail); out.push(row.typeDetail); }
    return out;
  })();
  const allowEmptyDetail = typeShapes.length === 0;
  const defaultShapeFor = (b: string): string => {
    const reg = registered.find((r) => r.baseCategory === b && r.typeDetail);
    return reg?.typeDetail ?? cornerTypeDetails(b)[0] ?? '';
  };
  const detailValid = typeShapes.includes(detail) ? detail : (allowEmptyDetail ? '' : (typeShapes[0] ?? ''));
  // 수정 중 '지금 편집하는 바로 그 case'(원본 유형·배열)일 때만 저장된 실제 콘텐츠(blocks)를 쓴다.
  // 다른 유형·배열을 고르면 그 조합엔 콘텐츠가 없으므로 신규 등록처럼 가이드(빈 슬롯)로 보여준다(2026-10-06).
  const isOriginalCase = !isNew && base === row.baseCategory && detailValid === (row.typeDetail ?? '');
  // 저장된 조합(blocks)을 미리보기에 쓸지: 신규 등록은 '담은 즉시' 반영, 수정은 '지금 편집하는 그 case'일 때만.
  // (수정 중 다른 유형/배열을 고르면 그 조합엔 콘텐츠가 없으니 가이드) 2026-10-06 보강 — 신규 등록 상품·혜택 담기 미반영 버그 수정.
  const useSavedBlocks = blocks.length > 0 && (isNew || isOriginalCase);
  const guidePreview = !useSavedBlocks; // 보여줄 실제 콘텐츠가 없을 때만 가이드(플레이스홀더)
  // 대표 컴포넌트 유형: 사용자가 컴포넌트 조합을 직접 편집했으면 그 첫 블록 유형을 대표로 쓴다(저장·미리보기 정합).
  //  편집 전(blocks 비어있음)에는 배열·레이아웃에서 도출(compForShape) — 기존 동작 유지.
  const compFromShape = compForShape(base, detailValid);
  const compValid = useSavedBlocks ? ((blocks[0]?.componentType as ComponentType) || compFromShape) : compFromShape;

  // ── 세부 항목 적용 가능 여부 (유형별) ──
  // 카테고리 탭/고정형 탭/배너/아이콘형 등은 코너 타이틀·서브타이틀이 없다(미리보기 noHeader와 동일 기준).
  // 선택형(탭·메뉴)·단일/배너/바코드/프로필은 '리스트'가 아니므로 노출 개수·더보기가 의미 없다.
  const dStr = detailValid ?? '';
  const isBannerType = compValid === '배너형' || base === '배너형';
  // 헤더(코너 타이틀/서브타이틀) 없는 유형 — 배너·아이콘/이미지 카드, 그리고 '순수 탭'(선택형)만.
  //  '세로형(카테고리탭)'처럼 상품형 리스트의 탭 변형은 헤더가 있으므로 제외(선택형일 때만 탭=무헤더).
  const isStandaloneTab = compValid === '선택형' && (/카테고리\s*탭/.test(dStr) || dStr.includes('고정형(탭)'));
  //  고정·필수 노출형(프로필형·바코드형 등)은 카드 자체가 완결형이라 코너 타이틀·디스크립션이 없다(2026-09-29 사용자 요청).
  const noHeaderType = isBannerType || isStandaloneTab || base === '고정·필수 노출형' || base === '상태 안내형' || ['아이콘형', '이미지형', '팝업', '띠', '텍스트배너', '프로필', '바코드'].some((k) => dStr.includes(k));
  // 여러 아이템을 나열하는 리스트형 코너 — 노출 개수·더보기가 의미 있는 유형(상품형/혜택형/정보형 리스트)
  const isListType = compValid === '상품형' || compValid === '혜택형' || (compValid === '정보형' && /리스트/.test(dStr));
  const featureApplies = (key: string) => {
    if (key === 'useMainTitle' || key === 'useSubTitle') return !noHeaderType;
    if (key === 'useMoreButton') return isListType; // CTA 노출은 리스트형에서 의미
    // 상품 이미지·가격·설명·배지 = 상품/혜택/정보 카드가 있는 코너에서 적용(콘텐츠 안내형 등 상품형 외 유형이 상품 카드를 담는 경우 포함).
    //  shownBlocks가 liveFeatFlags를 적용하는 블록 유형(상품형·혜택형·정보형)과 일치시켜, 체크 해제가 미리보기에 바로 반영되게 한다.
    if (key === 'useImage' || key === 'usePrice' || key === 'useBadge' || key === 'useDesc')
      return ['상품형', '혜택형', '정보형'].includes(compValid) || blocks.some((b) => ['상품형', '혜택형', '정보형'].includes(b.componentType));
    return true; // 그 외 표시 항목은 기본 노출 (미노출 조건은 세부 항목이 아니라 빌더에서 코너별로 관리)
  };
  // 실제 적용값 = 토글 ON && 유형에 적용 가능
  const eff = (key: keyof typeof features) => featureApplies(key) && features[key];
  const useTitle = eff('useMainTitle');
  const useSub = eff('useSubTitle');
  // 이미지·가격은 상품형이 아닐 땐 기본 노출(true)로 둔다 — 유형에 해당 항목이 없으면 미리보기에선 원래대로 보여야 함.
  const imageOn = true; // 상품 이미지는 카드 필수 요소라 항상 고정 노출(해제 불가) — 2026-10-06 사용자 요청
  const priceOn = featureApplies('usePrice') ? features.usePrice : true;
  const descOn = featureApplies('useDesc') ? features.useDesc : true; // 설명(부가/흐린 글씨) — 상품형 외엔 기본 노출
  // 추천 수급 방식 + 노출 구성 = 한 섹션. CVM 수급이면 노출 구성(정렬·CTA)은 CVM이 결정 → 선택 불가.
  const isRecEligible = ['상품형', '혜택·오퍼형', '콘텐츠 안내형'].includes(base);
  const cvmChosen = recSource === 'CVM 기반';

  // ④ 빅배너 구분자는 '상품형' 모듈(상품·혜택 리스트/카드) 위에 얹는 것만 의미가 있다 → 상품형일 때만 노출/적용.
  const canBigBanner = compValid === '상품형';
  const bigBannerOn = canBigBanner && bigBanner;

  // ③ 컴포넌트 조합 — 배열·레이아웃에서 자동 도출(읽기 전용). 저장된 조합이 있으면 우선, 없으면 유형 기본값.
  //  배너형 스와이프형은 배너 장수를 코너 유형에서 정한다(최소 2장) — 편집한 값 우선, 없으면 2장.
  // 배너형(단일형·스와이프형)은 '무조건' 배너 캠페인 관리에서 불러온다(직접 만들지 않음). 2026-09-30 사용자 확정.
  const isBannerLoader = compValid === '배너형' || base === '배너형';
  const isSwipeBannerType = isBannerLoader && detailValid === '스와이프형';
  const isSingleBannerType = isBannerLoader && !isSwipeBannerType; // 배너 단일형(기본) — 1개만 불러옴
  const swipeBanners = (useSavedBlocks && isBannerLoader) ? (blocks.find((b) => b.componentType === '배너형')?.banners ?? []) : [];
  // 상품형·혜택형 — 상품·혜택 아이템 묶음(BSS 카탈로그에서 담기 · 순서 드래그 · URL 수동). 2026-09-29 사용자 요청.
  const isProductItemsType = !isBannerLoader && (compValid === '상품형' || compValid === '혜택형');
  const productItems = isProductItemsType ? (blocks.find((b) => b.componentType === compValid)?.items ?? blocks.find((b) => b.items)?.items ?? []) : [];
  // 상품 아이템 커밋 — 대상 컴포넌트 블록의 items·count만 갱신하고 다른 블록(예: 상단 탭)은 보존.
  const commitProductItems = (next: ProductItem[]) => {
    const target = compValid as ComponentType;
    const base0 = blocks.length ? blocks : defaultComposition(compValid, detailValid, { image: features.useImage, price: features.usePrice, badge: features.useBadge, desc: features.useDesc });
    let replaced = false;
    const updated = base0.map((b) => (!replaced && b.componentType === target ? ((replaced = true), { ...b, count: Math.max(1, next.length || 1), items: next }) : b));
    if (!replaced) updated.push({ componentType: target, count: Math.max(1, next.length || 1), image: features.useImage, price: features.usePrice, badge: features.useBadge, desc: features.useDesc, items: next });
    setBlocks(updated);
  };
  // 세부 항목(표시 항목) 토글을 미리보기·저장 조합에 실시간 반영 — 이미지·가격·설명·배지 on/off가 아이템 카드에 바로 적용(2026-09-29 사용자 요청).
  const liveFeatFlags = { image: imageOn, price: priceOn, desc: descOn, badge: eff('useBadge') };
  const shownBlocks: Composition = isBannerLoader
    ? [{ componentType: '배너형', count: isSingleBannerType ? 1 : Math.max(1, swipeBanners.length || 2), image: true, price: true, desc: true, ...(swipeBanners.length ? { banners: isSingleBannerType ? swipeBanners.slice(0, 1) : swipeBanners } : {}) }]
    : (useSavedBlocks
        ? blocks
        : defaultComposition(compValid, detailValid, { image: features.useImage, price: features.usePrice, badge: features.useBadge, desc: features.useDesc })
      ).map((b) => {
        if (b.componentType === '상품형' || b.componentType === '혜택형' || b.componentType === '정보형') return { ...b, ...liveFeatFlags };
        // 선택형(탭·메뉴) 칩이 아직 정의 전이면 기본 칩(아이콘+라벨)으로 미리보기 — 편집기와 동일. 단, '메뉴 리스트'(세로 메뉴)는 제외.
        if (b.componentType === '선택형' && !(b.chips && b.chips.length) && !dStr.includes('메뉴 리스트')) return { ...b, chips: CHIP_DEFAULTS, chipRows: b.chipRows ?? 2 };
        return b;
      });
  // 코너 유형 명 = [코너 유형 · 컴포넌트 · 배열 (· 빅배너)] 자동 구성
  // 코너 유형 명 = 유형 · 배열·레이아웃 (컴포넌트는 표기에서 제외 — UI에서 컴포넌트 노출 안 함).
  const derivedName = [base, layoutLabel(detailValid), bigBannerOn ? '빅배너' : ''].filter(Boolean).join(' · ');
  const platforms = row.platforms.split(',').filter(Boolean);
  const action = isNew ? createCornerType : updateCornerType.bind(null, row.id);
  const formAction = submitAction ?? action; // bulk 모드에선 상위에서 넘긴 일괄 저장 액션 사용

  // bulk 카드용 실사 미리보기 — 실제 렌더러(CornerBlock)로 디자인 느낌 반영. 이름에 '태그'면 배지 ON.
  const cardPreview = (d: string): PreviewCorner => {
    // 저장된 조합이 아니라 '현재 속성 토글(features)' 기준으로 조합 생성 → 끄면 즉시 미리보기에서 빠짐
    const comp = defaultComposition(compForShape(base, d), d, { image: features.useImage, price: features.usePrice, badge: features.useBadge || d.includes('태그'), desc: features.useDesc });
    // 속성은 배열 형태와 무관하게 토글 그대로 적용(모든 배열 동일) — detail 기반 eff 대신 features 직접 사용
    const c = compositionToPreviewCorner({ base, detail: d, composition: comp, mainTitle: features.useMainTitle ? '코너 타이틀' : null, subTitle: features.useSubTitle ? '서브타이틀' : null });
    // 배너 히어로는 상품 이미지와 독립(bannerImageUrl) — 상품 이미지 OFF에도 배너 유지
    const isBannerArr = d.includes('배너');
    const heroImg = base === '상품형' ? (d.includes('세로형') ? '/assets/ds/plan-hero-expire.png' : '/assets/ds/hero-device.png') : '/assets/ds/hero-plan.png';
    return { ...c, bigBanner: isBannerArr, bannerImageUrl: isBannerArr ? heroImg : undefined, moreButtonUse: features.useMoreButton, moreButtonLabel: moreLabel || undefined };
  };

  // bulk 컴포넌트 속성 패널(DS 그룹형 토글) — 미리보기 우측(고정)에 배치. 모든 배열에 공통 적용.
  const propsPanel = bulk ? (() => {
    const GROUPS: { title: string; sub: string; items: { key: keyof typeof features; label: string; sub: string; locked?: boolean; dep?: string }[] }[] = [
      { title: '이미지', sub: 'ImageSrc', items: [{ key: 'useImage', label: '상품 이미지', sub: 'ImageSrc' }] },
      { title: '텍스트', sub: 'TextProductGroup', items: [
        { key: 'useMainTitle', label: '타이틀', sub: 'Title', locked: true },
        { key: 'useSubTitle', label: '서브타이틀', sub: 'SubTitle' },
      ] },
      { title: '가격', sub: 'TextPriceGroup', items: [
        { key: 'usePrice', label: '가격', sub: 'Price' },
        { key: 'useBadge', label: '할인율·배지', sub: 'DiscountRate', dep: '가격 ON일 때' },
      ] },
      { title: '설명', sub: 'SubText', items: [{ key: 'useDesc', label: '설명', sub: 'SubText / Caption' }] },
      { title: '액션', sub: 'MoreButton', items: [{ key: 'useMoreButton', label: '더보기(CTA)', sub: 'MoreButton' }] },
    ];
    // 속성 노출은 '유형(base)' 기준으로 통일 — 배열(가로/세로/+배너)이 달라도 동일한 속성 세트를 보여준다.
    const baseComp = componentTypesForCorner(base)[0] ?? '';
    const panelApplies = (key: keyof typeof features) => {
      if (key === 'useImage' || key === 'usePrice' || key === 'useBadge' || key === 'useDesc') return baseComp === '상품형';
      if (key === 'useMoreButton') return baseComp === '상품형' || baseComp === '혜택형';
      return true; // 타이틀·서브타이틀은 항상
    };
    const groups = GROUPS.map((g) => ({ ...g, items: g.items.filter((it) => panelApplies(it.key)) })).filter((g) => g.items.length);
    return (
      <section className="overflow-hidden rounded-xl border border-indigo-200">
        <div className="border-b border-indigo-100 bg-indigo-50/60 px-3.5 py-2.5 text-xs font-semibold text-[#2f25bd]">컴포넌트 속성 <span className="font-normal text-indigo-400">· DS 공식 기준</span></div>
        <div className="flex items-start gap-1.5 border-b bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-700">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>배열 <b className="font-semibold">{selectedArrays.length}개</b>에 공통 적용 — 끄면 모든 배열에서 함께 꺼집니다.</span>
        </div>
        <div className="divide-y">
          {groups.map((g) => (
            <div key={g.title} className="px-3 py-2.5">
              <p className="mb-1.5 text-[11px] font-semibold text-slate-500">{g.title} <span className="font-normal text-slate-300">{g.sub}</span></p>
              <div className="space-y-1.5">
                {g.items.map((it) => {
                  const badgeLocked = it.key === 'useBadge' && !features.usePrice;
                  const on = it.locked ? true : (features[it.key] as boolean) && !badgeLocked;
                  return (
                    <div key={String(it.key)} className="flex items-center gap-2 rounded-lg border border-[#e6e7ec] bg-white px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-[13px] font-medium text-slate-700">{it.label}</span>
                        {it.locked && <span className="ml-1.5 rounded bg-[#e6e7ec] px-1 text-[9px] text-slate-500">필수</span>}
                        <span className="block text-[11px] text-slate-400">{it.sub}{it.dep ? ` · ${it.dep}` : ''}</span>
                      </div>
                      <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[9px] font-medium text-indigo-500">공통</span>
                      <Switch checked={on} disabled={it.locked || badgeLocked} onChange={(v) => toggleFeature(it.key, v)} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  })() : null;

  // 기본 정보 하단 메타(운영 채널·플랫폼·사용 여부·승인상태·설명) — bulk 섹션·통합 섹션에서 공용.
  //  통합 섹션의 우측 열(1fr)에서도 안 눌리게 bulk일 때만 2열, 통합(비-bulk)에선 1열로 쌓는다.
  // 운영 채널·플랫폼, 사용 여부·승인상태는 좌우 2열(목업 랜딩 설정처럼). 설명은 전폭. 좌우 보더 없음.
  const metaFields = (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2">
        <TRow label="운영 플랫폼"><OpsCheckGroup name="platforms" options={OPERATION_PLATFORMS} initial={platforms} /></TRow>
        <TRow label="사용 여부" required>
          <div className="flex gap-4 text-xs">
            <label className="flex items-center gap-1.5"><input type="radio" checked={active} onChange={() => setActive(true)} className="accent-[#3a2fd8]" /> 사용</label>
            <label className="flex items-center gap-1.5"><input type="radio" checked={!active} onChange={() => setActive(false)} className="accent-[#3a2fd8]" /> 미사용</label>
          </div>
          {active && <input type="hidden" name="active" value="on" />}
        </TRow>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2">
        <TRow label="승인상태">
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-[#e6e7ec] px-2 py-0.5 text-[11px] font-medium text-slate-600">{CORNER_TYPE_STATUS_LABEL[row.status] ?? row.status}</span>
            <span className="whitespace-nowrap text-[11px] text-muted-foreground" title="승인은 별도 승인 프로세스에서 반영됩니다">(읽기 전용)</span>
          </div>
          <input type="hidden" name="status" value={row.status} />
        </TRow>
        <div className="border-b border-[#e6e7ec] max-md:hidden" />
      </div>
      <TRow label="코너 유형 설명"><Input name="description" defaultValue={row.description ?? ''} placeholder="100자 이내" className="h-8 text-xs" /></TRow>
      {/* 운영 채널 UI 제거(2026-10-06 사용자 요청 — 채널 선택이 의미 없음). 값은 기존/기본값 유지해 제출. */}
      <input type="hidden" name="channels" value={row.channels || 'FO'} />
    </>
  );

  // 유형·배열 선택(비-bulk) — 테이블(TRow) 형태. 좌우 보더 없이 가로줄만(2026-09-30 사용자 요청, 목업 105).
  const basicPickers = (
    <>
      <input type="hidden" name="name" value={derivedName} />
      <input type="hidden" name="layout" value={row.layout ?? ''} />
      <input type="hidden" name="componentType" value={compValid} />
      <input type="hidden" name="bigBanner" value="" />
      <TRow label="코너 유형 ID"><span className="font-mono text-[12px] text-slate-700">{row.typeId}</span></TRow>
      <TRow label="코너 유형" required hint="이 코너가 화면에서 맡는 역할">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {baseOptions.map((c) => (
              <label key={c} className="cursor-pointer">
                <input type="radio" name="baseCategory" value={c} checked={base === c} onChange={() => { setBase(c); setDetail(defaultShapeFor(c)); }} className="peer sr-only" />
                <span className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-indigo-300 peer-checked:border-[#3a2fd8] peer-checked:bg-[#3a2fd8] peer-checked:text-white">{c}</span>
              </label>
            ))}
          </div>
          {cornerTypePurpose(base) && (
            <p className="flex gap-1.5 rounded-md bg-indigo-50 px-2.5 py-1.5 text-[11px] leading-relaxed text-[#2f25bd]"><span className="shrink-0 font-semibold">목적</span><span>{cornerTypePurpose(base)}</span></p>
          )}
        </div>
      </TRow>
      <TRow label="배열·레이아웃" hint="어떤 형태로 보여줄지">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {allowEmptyDetail && (
              <label className="cursor-pointer">
                <input type="radio" name="typeDetail" value="" checked={detailValid === ''} onChange={() => setDetail('')} className="peer sr-only" />
                <span className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-indigo-300 peer-checked:border-[#3a2fd8] peer-checked:bg-[#3a2fd8] peer-checked:text-white">선택 안 함</span>
              </label>
            )}
            {typeShapes.map((d) => {
              const isReg = registered.some((r) => r.baseCategory === base && (r.typeDetail ?? '') === d);
              return (
                <label key={d} className="cursor-pointer" title={isReg ? '이미 등록된 유형·배열이에요(다시 등록해도 됩니다)' : undefined}>
                  <input type="radio" name="typeDetail" value={d} checked={detailValid === d} onChange={() => setDetail(d)} className="peer sr-only" />
                  <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-indigo-300 peer-checked:border-[#3a2fd8] peer-checked:bg-[#3a2fd8] peer-checked:text-white', isReg && 'border-emerald-300 bg-emerald-50/60')}>
                    {layoutLabel(d)}
                    {isReg && <span className="inline-flex items-center rounded-sm bg-emerald-600 px-1 py-[1px] text-[9px] font-semibold leading-none text-white">등록됨</span>}
                  </span>
                </label>
              );
            })}
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">배열은 <b>형태(레이아웃)</b>만 정합니다. <span className="rounded-sm bg-emerald-600 px-1 py-[1px] text-[9px] font-semibold text-white">등록됨</span>은 이미 등록된 배열(다시 등록 가능) · 노출 개수는 빌더에서.</p>
        </div>
      </TRow>
      {/* 컴포넌트 레이아웃(지정형/고정형)은 정의에서 제거 — 고정/택1은 빌더의 '노출 타입 베리에이션(CVM 택1)'이 placement 단위로 결정한다(2026-10-06). 저장값만 보존. */}
      <input type="hidden" name="componentLayoutMode" value={row.componentLayoutMode || '고정형'} />
      <TRow label="등록 결과"><span className="text-[12px]">이렇게 등록돼요 · <span className="font-semibold text-foreground">{derivedName}</span></span></TRow>
    </>
  );

  // 통합 미리보기(라이브) — 좌측 sticky. 정의 기본값(문구·아이콘·카드 모양) 반영.
  //  flex-wrap 레이아웃의 고정폭 아이템 — 폭이 좁으면 오른쪽 설정이 아래로 내려가 per-char로 터지지 않는다.
  const livePreview = (
    <div className="w-[340px] max-w-full shrink-0 self-start lg:sticky lg:top-3">
      {/* '코너 정의' 헤더는 미리보기 열 상단에 — 오른쪽 '기본 정보' 헤더와 같은 로우로 정렬(2026-10-01 사용자 요청) */}
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[14.5px] font-bold text-slate-900">
        <span className="inline-block h-[14px] w-[4px] rounded-[2px] bg-[#3a2fd8]" />
        코너 정의
        <span className="text-[11px] font-normal text-slate-400">왼쪽 미리보기를 보며 오른쪽에서 설정</span>
      </div>
      <div className="max-h-[72vh] overflow-y-auto rounded-xl border bg-[#eef0f6] p-3">
        {(() => {
          const previewC = {
            ...compositionToPreviewCorner({
              base, detail: detailValid, composition: shownBlocks,
              mainTitle: useTitle ? (mainTitleText || (guidePreview ? '타이틀' : '코너 타이틀')) : null,
              subTitle: useSub ? (subTitleText || (guidePreview ? '디스크립션' : '서브타이틀')) : null,
              placeholder: guidePreview && !mainTitleText && !subTitleText,
              emptyImages: guidePreview, // 신규 등록·수정 중 다른 case는 이미지/배너를 빈 가이드 슬롯으로. 편집 중인 그 case만 실제 이미지 유지.
            }),
            cardShape: cardShape || undefined,
            subTitleIcon,
            // 표시 항목 토글 → 미리보기 parts로 전달(체크 해제 시 ProductCard/BenefitRow에서 바로 숨김).
            showImage: imageOn,
            showPrice: priceOn,
            showBadge: eff('useBadge'),
            showDesc: descOn,
            // CTA(더보기) 표시 항목 ON → 미리보기 버튼으로 반영(2026-10-06). 그동안 전달 누락으로 버튼이 안 보였음.
            moreButtonUse: eff('useMoreButton'),
            moreButtonLabel: moreLabel || undefined,
            // 수급 방식(CVM/운영자 편성)을 미리보기에도 반영 — 빌더와 동일하게 'CVM 개인화 · 미리보기는 폴백' 배지 노출(2026-10-06).
            recSource: recSource || undefined,
          };
          return <CornerBlock corner={previewC} />;
        })()}
      </div>
    </div>
  );

  // 등록 스텝퍼 — 신규 등록만(수정은 전체 한 화면). 단계: 유형·배열 → 컴포넌트 구성 → 표시 항목·정의.
  const WIZARD_STEPS = [
    { title: '유형·배열', desc: '역할과 형태' },
    { title: '컴포넌트 구성', desc: '담을 상품·배너·탭' },
    { title: '표시 항목·정의', desc: '노출 항목·기본값' },
  ];
  const wizard = false; // 스텝퍼 제거 — 등록도 상세/수정과 동일하게 한 화면에서(2026-09-30 사용자 요청)
  const lastStep = WIZARD_STEPS.length - 1;
  const showStep = (n: number) => !wizard || step === n;
  const stepValid = !wizard || (step === 0 ? !!base && (allowEmptyDetail || !!detailValid) : true); // 1단계는 유형·배열 선택 필수
  const stepperHead = wizard ? (
    <div className="flex items-center gap-1.5 rounded-lg border border-[#e6e7ec] bg-[#f6f7f9] px-3 py-2.5">
      {WIZARD_STEPS.map((s, i) => (
        <div key={i} className="flex flex-1 items-center gap-1.5">
          <button type="button" onClick={() => i < step && setStep(i)} disabled={i > step} className={cn('flex min-w-0 flex-1 items-center gap-2 rounded-md px-2.5 py-1.5 text-left transition', i === step ? 'bg-[#3a2fd8] text-white' : i < step ? 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-[#f6f7f9]' : 'text-slate-400')}>
            <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold', i === step ? 'bg-white/25 text-white' : i < step ? 'bg-emerald-100 text-emerald-600' : 'bg-[#e6e7ec] text-slate-400')}>{i < step ? <Check className="h-3 w-3" /> : i + 1}</span>
            <span className="min-w-0"><span className="block truncate text-[12.5px] font-semibold leading-tight">{s.title}</span><span className={cn('block truncate text-[10px] leading-tight', i === step ? 'text-indigo-100' : 'text-slate-400')}>{s.desc}</span></span>
          </button>
          {i < WIZARD_STEPS.length - 1 && <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />}
        </div>
      ))}
    </div>
  ) : null;

  return (
    <form
      action={async (fd) => {
        await formAction(fd);
        onClose();
      }}
      className="space-y-4 p-5"
    >
      {bulk && <input type="hidden" name="bulkArraysJson" value={JSON.stringify(selectedArrays)} />}
      {/* 폼 내부 제목 제거 — 페이지 상단 브레드크럼으로 대체(2026-10-01 사용자 요청). bulk(배열 일괄 수정)만 제목 유지. */}
      {bulk && (
        <div className="flex items-center gap-2 border-b pb-3">
          <h2 className="text-sm font-semibold">배열 일괄 수정</h2>
        </div>
      )}
      {stepperHead}

      {/* 기본 정보 — bulk(다중 배열 일괄 수정) 전용. 비-bulk 등록/수정은 아래 통합 '코너 정의' 섹션에서 미리보기와 함께. */}
      {bulk && (
      <section className="overflow-hidden rounded-md border">
        <div className="border-b bg-[#f6f7f9] px-3.5 py-2.5 text-xs font-semibold text-slate-700">기본 정보</div>
          <div className="space-y-4 border-b p-3">
            <input type="hidden" name="name" value={derivedName} />
            <input type="hidden" name="layout" value={row.layout ?? ''} />
            <input type="hidden" name="baseCategory" value={base} />
            <input type="hidden" name="componentType" value={compValid} />
            <input type="hidden" name="bigBanner" value="" />
            {/* 코너 유형 (고정) */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-medium text-muted-foreground">코너 유형</span>
              <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold', cornerTypeChipClass(base))}>{base}</span>
              <span className="rounded bg-[#e6e7ec] px-1.5 py-0.5 text-[10px] font-medium text-slate-500">고정</span>
              {cornerTypePurpose(base) && <span className="text-[11px] text-muted-foreground">{cornerTypePurpose(base)}</span>}
            </div>
            {/* 좌: 배열 미리보기 카드 · 우: 컴포넌트 속성 토글(고정) — 켜고 끄면 좌측 미리보기가 바로 바뀐다 */}
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-semibold text-slate-800">배열·레이아웃 <span className="text-[11px] font-normal text-muted-foreground">미리보기</span></span>
                  <span className="text-[11px] text-muted-foreground">배열을 카드로 하나씩 추가</span>
                </div>
                {selectedArrays.length === 0 && <p className="mb-2 text-[11px] text-amber-600">배열을 1개 이상 추가하세요.</p>}
                <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
                  {selectedArrays.map((d, i) => {
                    const locked = i < lockedCount; // 기존 등록 배열 = 유형 변경/삭제 불가
                    return (
                    <div key={i} className="relative rounded-xl border border-[#e6e7ec] bg-white p-3 shadow-sm">
                      {!locked && <button type="button" onClick={() => removeArrAt(i)} className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-[#e6e7ec] bg-white text-slate-400 hover:border-rose-300 hover:text-rose-600" aria-label="삭제"><X className="h-3.5 w-3.5" /></button>}
                      <div className="rounded-lg bg-[#f6f7f9] p-3">
                        {/* 배너·칩은 CornerBlock 내부에서 코너 상단에 붙어 렌더됨. 전체를 축소해 담아 2.5배열도 다 보인다. */}
                        <div className="pointer-events-none h-[260px]"><DevicePreview corner={cardPreview(d)} /></div>
                      </div>
                      <div className="mt-2 flex items-center gap-1">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-indigo-100 text-[10px] font-bold text-[#3a2fd8]">{i + 1}</span>
                        {locked ? (
                          <span className="flex h-8 w-full items-center gap-1.5 rounded-md bg-[#f6f7f9] px-2 text-xs font-medium text-slate-700">
                            {layoutLabel(d) || d || '기본'}
                            <span className="ml-auto rounded bg-[#e6e7ec] px-1.5 py-0.5 text-[10px] font-medium text-slate-500">고정</span>
                          </span>
                        ) : (
                          <input list="arr-catalog" value={d} onChange={(e) => renameArr(i, e.target.value)} placeholder="배열 이름 (예: 세로형+배너)" className="h-8 w-full rounded-md border border-indigo-200 px-2 text-xs" />
                        )}
                      </div>
                    </div>
                    );
                  })}
                  {/* 배열 추가 카드 */}
                  <button type="button" onClick={addBlankArr} className="flex min-h-[220px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[#e6e7ec] text-slate-400 transition hover:border-indigo-300 hover:text-indigo-500">
                    <Plus className="h-6 w-6" /><span className="text-[12px] font-medium">배열 추가</span>
                  </button>
                </div>
                <datalist id="arr-catalog">{typeShapes.map((d) => <option key={d} value={d}>{layoutLabel(d)}</option>)}</datalist>
              </div>
              {/* 우: 속성 토글 (고정) */}
              <div className="self-start lg:sticky lg:top-4">{propsPanel}</div>
            </div>
          </div>
        {metaFields}
      </section>
      )}

      {/* ③ 컴포넌트 조합 — 이 코너 유형에 담을 컴포넌트를 순서대로 조립. (bulk 수정에선 컴포넌트 속성으로 대체 → 제외) */}
      {!bulk && (
      /* 좌우 보더 없는 섹션(목업 105) — 굵은 제목 + 가로줄 테이블만. */
      <section className="space-y-2">
        <input type="hidden" name="composition" value={JSON.stringify(shownBlocks)} />
        {/* 미리보기(고정폭) + 설정 — 뷰포트 breakpoint가 아니라 실제 컨테이너 폭에 반응(flex-wrap). 좁으면 설정이 미리보기 아래로. */}
        <div className="flex flex-wrap gap-4">
          {/* 왼쪽: 라이브 미리보기(sticky) — 기본 정보+컴포넌트 구성 통합, 미리보기 하나(2026-09-29 사용자 요청) */}
          {livePreview}
          {/* 오른쪽: 모든 설정 — (등록은 스텝별) 유형·배열 → 컴포넌트 구성 → 표시 항목 */}
          <div className="flex min-w-[320px] flex-1 flex-col gap-3">
            {/* 순서(order): 기본정보 → 세부 항목 → 상품·혜택 묶기(편집기). 세부 항목 아래에 묶기가 오도록(2026-09-30 사용자 요청). */}
            <div className={cn('order-1', !showStep(0) && 'hidden')}>
              <div className="mb-2.5 flex items-center gap-2 text-[14.5px] font-bold text-slate-900"><span className="inline-block h-[14px] w-[4px] rounded-[2px] bg-[#3a2fd8]" />기본 정보</div>
              <div className="border-t border-[#d3d6de]">
                {basicPickers}
                {metaFields}
              </div>
            </div>
            <div className={cn('order-3 space-y-3', !showStep(1) && 'hidden')}>
            {/* 배너형 — 무조건 배너 캠페인 관리에서 불러오기. 단일형=1개, 스와이프형=여러 개. 2026-09-30 사용자 확정 */}
            {isBannerLoader && (
              <SwipeBannerEditor
                banners={swipeBanners as SwipeBannerItem[]}
                bannerCampaigns={bannerCampaigns}
                single={isSingleBannerType}
                onCommit={(next) => { const n = isSingleBannerType ? next.slice(0, 1) : next; setBlocks([{ componentType: '배너형' as ComponentType, count: Math.max(1, n.length || 1), image: true, price: true, desc: true, banners: n }]); }}
              />
            )}
            {/* 상품형·혜택형 — BSS 혜택 브랜드 카탈로그에서 상품·혜택을 담고 드래그로 순서 변경(랜딩 URL 자동 매핑 후 수동 편집). 2026-09-29 사용자 요청 */}
            {isProductItemsType && (
              <ProductItemEditor
                items={productItems as ProductItem[]}
                productOptions={productOptions}
                onCommit={commitProductItems}
              />
            )}
            {/* 선택형(탭·메뉴) — 칩 정의는 코너 유형이 소유(2026-09-29 사용자 결정). 빌더는 순서만 변경. */}
            {(compValid === '선택형' || base === '업무 진입형') && (() => {
              const block = shownBlocks.find((b) => b.componentType === '선택형') ?? shownBlocks[0];
              const chips = (block?.chips && block.chips.length ? block.chips : CHIP_DEFAULTS) as ChipDef[];
              const rows = block?.chipRows ?? 2;
              return (
                <ChipDefEditor
                  chips={chips}
                  rows={rows}
                  onCommit={(nextChips, nextRows = rows) => setBlocks([{ componentType: '선택형' as ComponentType, count: 1, chips: nextChips, chipRows: nextRows }])}
                />
              );
            })()}
            {/* FO 사용자 설정 — 탭·메뉴 정의 바로 아래(우측 컨트롤 열). 선택형/업무 진입형에서만. */}
            {(base === '업무 진입형' || compValid === '선택형') && (
              <section className="overflow-hidden rounded-md border border-[#e6e7ec]">
                <div className="flex items-center gap-1.5 border-b border-[#e6e7ec] bg-[#f6f7f9] px-3.5 py-2.5 text-xs font-semibold text-slate-700">
                  <Info className="h-3.5 w-3.5 text-sky-500" /> FO 사용자 설정 (고객 커스터마이즈)
                </div>
                <div className="space-y-2.5 p-3">
                  <label className="flex items-center justify-between gap-2">
                    <span className="flex flex-col">
                      <span className="text-xs font-medium text-foreground">사용자 설정 가능</span>
                      <span className="text-[11px] text-muted-foreground">켜면 고객(FO)이 이 메뉴를 직접 편집(추가·삭제·순서)할 수 있어요. 고정 항목은 유지. 이 값은 빌더에서 코너별로 이어받아요.</span>
                    </span>
                    <button type="button" role="switch" aria-checked={userCustom} onClick={() => setUserCustom((v) => !v)}
                      className={cn('relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors', userCustom ? 'bg-sky-500' : 'bg-slate-300')}>
                      <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform', userCustom ? 'translate-x-4' : 'translate-x-0.5')} />
                    </button>
                  </label>
                  <input type="hidden" name="userCustomizable" value={userCustom ? '1' : ''} />
                  {userCustom && (
                    <div className="grid grid-cols-2 gap-2 border-t pt-2.5">
                      <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">고객 노출 최소 개수</label>
                        <Input name="userMinItems" type="number" min={0} value={userMin} onChange={(e) => setUserMin(e.target.value)} placeholder="예: 3 (고정 포함)" className="h-8 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">고객 노출 최대 개수</label>
                        <Input name="userMaxItems" type="number" min={0} value={userMax} onChange={(e) => setUserMax(e.target.value)} placeholder="예: 8" className="h-8 text-xs" />
                      </div>
                      <p className="col-span-2 text-[11px] text-muted-foreground">고객은 최소~최대 범위 안에서 항목을 노출/숨김할 수 있어요. 고정(🔒) 항목은 항상 포함.</p>
                    </div>
                  )}
                </div>
              </section>
            )}
            {/* 자동 구성(배열·레이아웃 요약) 카드는 제거 — 등록 결과·상품/혜택 묶기와 중복(2026-09-30 사용자 요청). */}
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              컴포넌트는 <b className="text-slate-600">배열·레이아웃에서 자동 도출</b>돼요(거버넌스 <span className="font-mono">PI-DSP-CMP-003</span>). 실제 소재·개수·문구는 <b className="text-slate-600">빌더에서 코너를 만들 때</b> 채워요.
              표시 항목(이미지·가격·배지·설명 등) on/off는 <b className="text-slate-600">세부 항목</b>에서 조정합니다.
            </p>
            {/* 타겟별 문구 세트 제거 — 회의 결론상 '문구(콘텐츠)'는 빌더(전시화면 관리)에서 등록. 코너 유형은 껍데기(규격)만. */}
            </div>
            {/* 세부 항목 — 표시 항목·정의 기본값을 테이블(TRow)로. 업무 진입형(탭·메뉴)은 표시 항목이 의미 없어 숨김(2026-09-30 사용자 요청). */}
            {!bulk && base !== '업무 진입형' && base !== '배너형' && (
            <div className={cn('order-2', !showStep(2) && 'hidden')}>
              <div className="mb-2.5 flex items-center gap-2 text-[14.5px] font-bold text-slate-900"><span className="inline-block h-[14px] w-[4px] rounded-[2px] bg-[#3a2fd8]" />세부 항목 (항목별 사용여부)</div>
              <div className="border-t border-[#d3d6de]">
              <TRow label="표시 항목">
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {CORNER_TYPE_FEATURES.map((f) => {
                    const applies = featureApplies(f.key);
                    const badgeLocked = f.key === 'useBadge' && !features.usePrice; // 배지는 가격에 종속
                    const imageLocked = f.key === 'useImage' && applies; // 상품 이미지는 카드 필수 — 항상 ON(해제 불가)
                    const disabled = (!applies || badgeLocked) && !imageLocked; // imageLocked는 제출 위해 비활성화하지 않음(체크 유지)
                    const checked = imageLocked ? true : (applies && features[f.key as keyof typeof features] && !badgeLocked);
                    const toggle = (on: boolean) => {
                      if (imageLocked) return; // 상품 이미지는 토글 불가
                      setFeatures((prev) => {
                        const next = { ...prev, [f.key]: on };
                        if (f.key === 'useMainTitle' && !on) next.useSubTitle = false;
                        if (f.key === 'useSubTitle' && on) next.useMainTitle = true;
                        if (f.key === 'usePrice' && !on) next.useBadge = false;
                        if (f.key === 'useBadge' && on) next.usePrice = true;
                        return next;
                      });
                    };
                    return (
                      <label key={f.key} className={cn('flex items-center gap-1.5 text-sm', disabled && 'cursor-not-allowed text-muted-foreground/40', imageLocked && 'cursor-default')} title={imageLocked ? '상품 이미지는 카드 필수 요소라 항상 표시돼요' : !applies ? '이 코너 유형에는 해당 항목이 없어요' : badgeLocked ? '배지는 가격 앞에 붙어요 — 가격을 켜야 배지를 쓸 수 있어요' : undefined}>
                        <input type="checkbox" name={f.key} checked={checked} disabled={disabled} onChange={(e) => toggle(e.target.checked)} className="accent-[#3a2fd8] disabled:opacity-40" />
                        {f.label}
                        {imageLocked && <span className="text-[10px] font-medium text-slate-400">(고정)</span>}
                      </label>
                    );
                  })}
                </div>
              </TRow>

              {/* CTA 문구 — 'CTA' 표시 항목 ON일 때 */}
              {eff('useMoreButton') && (
                <TRow label="CTA 문구">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input name="defaultMoreButtonLabel" value={moreLabel} onChange={(e) => setMoreLabel(e.target.value)} placeholder="예: 담기 / 자세히 / 전체보기" className="h-8 w-52 text-xs" />
                    <span className="text-[11px] text-slate-400">미리보기 버튼에 그대로 노출 · 링크는 코너별로</span>
                  </div>
                </TRow>
              )}
              <input type="hidden" name="defaultMoreButton" value={eff('useMoreButton') ? '1' : ''} />

              {/* 정의 기본값 — 문구·개수·형태 (거버넌스: 코너 유형이 확정 · 빌더는 쌓기+CVM만) */}
              {useTitle && (
                <TRow label="타이틀">
                  <Input name="defaultMainTitle" value={mainTitleText} onChange={(e) => setMainTitleText(e.target.value)} placeholder="예: 이용 요약 / 추천 혜택" className="h-8 w-64 text-xs" />
                  <p className="mt-1.5 text-[10.5px] text-slate-400">실제 문구·타겟별 베리에이션은 <b className="font-semibold text-[#3a2fd8]">빌더(전시화면 관리)</b>에서 등록해요. 여기선 기본 타이틀만.</p>
                </TRow>
              )}
              {useSub && (
                <TRow label="서브타이틀">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input name="defaultSubTitle" value={subTitleText} onChange={(e) => setSubTitleText(e.target.value)} placeholder="서브타이틀 문구" className="h-8 w-56 text-xs" />
                    <select name="defaultSubTitleIcon" value={subTitleIcon} onChange={(e) => setSubTitleIcon(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-xs">
                      <option value="화살표">아이콘: 화살표</option>
                      <option value="사용안함">아이콘: 없음</option>
                    </select>
                  </div>
                </TRow>
              )}
              {isListType && (
                <TRow label="노출 개수">
                  <div className="flex flex-wrap items-center gap-2">
                    <input name="defaultMinItems" type="number" min={0} max={50} value={minItems} onChange={(e) => setMinItems(e.target.value)} placeholder="최소" className="h-8 w-20 rounded-md border bg-background px-2 text-xs" />
                    <span className="text-xs text-muted-foreground">~</span>
                    <input name="defaultMaxItems" type="number" min={0} max={50} value={maxItems} onChange={(e) => setMaxItems(e.target.value)} placeholder="최대" className="h-8 w-20 rounded-md border bg-background px-2 text-xs" />
                    <span className="text-[11px] text-slate-400">코너에 노출할 아이템 개수</span>
                  </div>
                </TRow>
              )}
              {(base === '상품형' || compValid === '상품형') && (
                <TRow label="카드 모양">
                  <select name="defaultCardShape" value={cardShape} onChange={(e) => setCardShape(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-xs">
                    <option value="">기본 (정사각형 1:1)</option>
                    <option value="1:1">정사각형 (1:1)</option>
                    <option value="3:4">포스터 (3:4)</option>
                    <option value="직사각형">직사각형</option>
                  </select>
                </TRow>
              )}
              {isBannerType && detailValid === '스와이프형' && (
                <TRow label="배너 노출">
                  <div className="flex flex-wrap items-center gap-2">
                    <select value={bannerMode} onChange={(e) => setBannerMode(e.target.value as 'swipe' | 'auto')} className="h-8 rounded-md border bg-background px-2 text-xs">
                      <option value="swipe">스와이프(수동)</option>
                      <option value="auto">자동 슬라이드</option>
                    </select>
                    <label className="flex items-center gap-1 text-[11px] text-slate-600"><input type="checkbox" checked={bannerIndicator} onChange={(e) => setBannerIndicator(e.target.checked)} className="accent-[#3a2fd8]" /> 인디케이터</label>
                    <input type="hidden" name="defaultBannerOptions" value={JSON.stringify({ mode: bannerMode, showIndicator: bannerIndicator, loop: true })} />
                  </div>
                </TRow>
              )}
              <TRow label="안내" flat><span className="text-[11px] leading-relaxed text-slate-400">체크한 항목만 이 유형 코너에 노출 · 유형에 맞지 않는 항목은 자동 비활성 · 서브타이틀은 타이틀 없이 못 켬 · 배지는 가격에 종속 · 노출 개수는 빌더에서 코너별.</span></TRow>
              </div>
            </div>
            )}
          </div>
        </div>
      </section>
      )}

      {/* 추천 수급 · 노출 구성 = 한 섹션. 콘텐츠 출처(수급 방식)를 먼저 정하고, 그에 따라 노출 구성(정렬·CTA)을 설정.
          CVM 수급이면 정렬·구성을 CVM이 고객마다 결정하므로 노출 구성은 '선택 불가'(비활성)로 잠근다. */}
      {/* 추천 수급 섹션은 미리보기(좌측) 가로 영역을 침범하지 않도록 우측 컨트롤 열에 정렬(2026-09-30 사용자 요청). */}
      {showStep(2) && (isRecEligible || isListType) && (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
        <div aria-hidden className="hidden lg:block" />
        <section className="min-w-0">
        <div className="mb-2.5">
          <div className="flex items-center gap-2 text-[14.5px] font-bold text-slate-900">
            <span className="inline-block h-[14px] w-[4px] rounded-[2px] bg-[#3a2fd8]" />
            콘텐츠 채우는 방식 · 노출 기본값
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-slate-500">출처와 정렬·CTA 기본값만 정해요. 실제 소재 선택·조정은 빌더에서 코너별로.</p>
        </div>
        <div className="space-y-3 border-t border-[#d3d6de] pt-3">
          {/* ① 추천 수급 방식 (출처) — 상품형·혜택·오퍼형·콘텐츠 안내형에만 */}
          {isRecEligible && (
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-slate-800">① 콘텐츠 출처 <span className="font-normal text-slate-500">· 수급 방식</span></label>
              <select name="defaultRecSource" value={recSource} onChange={(e) => setRecSource(e.target.value)} className="h-9 w-full max-w-sm rounded-md border border-[#e6e7ec] bg-background px-2.5 text-[13px]">
                <option value="">기본값 미지정 (빌더에서 선택)</option>
                {REC_SOURCE_METHODS.map((s) => (
                  <option key={s} value={s}>{s} — {REC_SOURCE_INFO[s].tag}</option>
                ))}
              </select>
              {/* 설명 — .frow 규격 미니 테이블(라벨 #f6f7f9). 폰트 키우고 패딩 넉넉하게 — 읽기 쉽게(2026-10-06). */}
              <div className="overflow-hidden rounded-md border border-[#e6e7ec]">
                {REC_SOURCE_METHODS.map((k) => (
                  <div key={k} className="grid grid-cols-[176px_minmax(0,1fr)] border-b border-[#e6e7ec] last:border-b-0">
                    <div className="bg-[#f6f7f9] px-3.5 py-3 text-[13px] leading-relaxed">
                      <b className="font-semibold text-slate-800">{k}</b>
                      <span className="block text-[11.5px] font-normal text-slate-500">· {REC_SOURCE_INFO[k].tag}</span>
                    </div>
                    <div className="min-w-0 px-3.5 py-3 text-[13px] leading-relaxed text-slate-600">{REC_SOURCE_INFO[k].how}</div>
                  </div>
                ))}
              </div>

              {/* CVM 추천 연동 (가안) — 스크럼 2026-10-01 + POL-REC '슬롯 관리 기준' 기반. 하이브리드:
                  코너 유형 관리에서 수급·풀·노출개수·폴백·세그참조를 '정의'로 확정 → 승인 동반, 빌더는 세그 미세조정만.
                  화요일(2026-10-07) CVM 미팅 확정 전 가안이라 '가안' 뱃지로 명시. */}
              {cvmChosen && (
                <div className="space-y-2 rounded-lg border border-[#d9d5fb] bg-[#efedfe] p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-[#3a2fd8] px-1.5 py-0.5 text-[9px] font-bold text-white">가안</span>
                    <span className="text-[11.5px] font-semibold text-[#3a2fd8]">CVM 추천 연동 · 코너 확정 시 함께 승인</span>
                    <span className="text-[10px] font-normal text-slate-400">POL-REC 슬롯 관리 기준 · 화요일 미팅 확정 전</span>
                  </div>

                  {/* 후보 풀 → 노출 (N중 M) */}
                  <div className="grid grid-cols-[132px_minmax(0,1fr)] overflow-hidden rounded-md border border-[#e6e7ec] bg-white">
                    <div className="flex items-center bg-[#f6f7f9] px-3 py-2 text-[11px] font-medium text-slate-600">후보 풀 → 노출</div>
                    <div className="px-3 py-2 text-[11px] leading-relaxed text-slate-700">
                      어드민은 <b>후보 풀</b>만 넉넉히 등록 · 고객별 <b>택M</b>은 CVM이 선별
                      <span className="mt-1 block">
                        <span className="inline-flex items-center rounded-md bg-[#efedfe] px-2 py-0.5 text-[11px] font-semibold text-[#3a2fd8]">
                          CVM 기반 · 풀 {productItems.length || '—'}개 중 고객별 {minItems || '?'}{maxItems ? `~${maxItems}` : ''}개
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* CVM이 채우는 것 (눈금 표시) */}
                  <div className="grid grid-cols-[132px_minmax(0,1fr)] overflow-hidden rounded-md border border-[#e6e7ec] bg-white">
                    <div className="flex items-center bg-[#f6f7f9] px-3 py-2 text-[11px] font-medium text-slate-600">CVM이 채우는 것</div>
                    <div className="flex flex-wrap gap-1 px-3 py-2">
                      {['콘텐츠 묶음 (풀 중 택M)', '문구 베리에이션 (택1)', '노출 타입 베리에이션'].map((t) => (
                        <span key={t} className="inline-flex items-center gap-1 rounded-md border border-[#d9d5fb] bg-white px-2 py-0.5 text-[10.5px] text-[#3a2fd8]">
                          <Sparkles className="h-3 w-3" />{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 세그 참조 (읽기전용) */}
                  <div className="grid grid-cols-[132px_minmax(0,1fr)] overflow-hidden rounded-md border border-[#e6e7ec] bg-white">
                    <div className="flex items-center bg-[#f6f7f9] px-3 py-2 text-[11px] font-medium text-slate-600">세그 참조 <span className="ml-1 font-normal text-slate-400">읽기전용</span></div>
                    <div className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {CVM_TARGET_HINTS.map((h) => (
                          <span key={h.key} className="inline-flex items-center rounded-full border border-[#e6e7ec] bg-white px-2 py-0.5 text-[10.5px] text-slate-500" title={`${h.axis} · ${h.note}`}>{h.key}</span>
                        ))}
                      </div>
                      <p className="mt-1.5 text-[10.5px] leading-relaxed text-slate-400">세그·룰값은 <b className="text-slate-500">CVM/세일즈포스 소유</b> — 어드민은 입력하지 않고 표시만. 타겟별 레이아웃 차별화는 노출 타입 베리에이션으로.</p>
                    </div>
                  </div>

                  {/* 폴백 · 승인 동반 · 미해결 쟁점 */}
                  <p className="text-[10.5px] leading-relaxed text-slate-500">
                    · <b>폴백</b>: CVM 미매칭·신뢰도 낮을 때 <b>운영자 편성</b>으로 대체(최하단, PI-DSP-PER-002).<br />
                    · <b>승인 동반</b>: 코너 확정(승인 요청) 시 “이 유형으로 CVM 추천 매핑 요청”을 함께 전송.<br />
                    · <span className="font-semibold text-amber-600">조율 필요</span>: 코너 <b>순서</b> 개인화(세일즈포스 ‘불가’ vs 우리 ‘원함’) · 에셋 등록 위치(우리 안 = 어드민 등록 + CVM 데이터 수신).
                  </p>
                </div>
              )}
            </div>
          )}
          {/* ② 노출 구성 (정렬·CTA) — CVM 수급이면 CVM이 결정하므로 비활성(선택 불가) */}
          {isListType && (
            <div className={cn('space-y-2', isRecEligible && 'border-t border-[#e6e7ec] pt-3')}>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-[13px] font-semibold text-slate-800">② 노출 구성 <span className="font-normal text-slate-500">· 정렬·CTA 기본값</span></label>
                {cvmChosen && <span className="rounded bg-[#e6e7ec] px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">CVM이 자동 결정 · 선택 불가</span>}
              </div>
              {cvmChosen && (
                <p className="rounded-md border border-[#e6e7ec] bg-[#f6f7f9] px-2.5 py-2 text-[12.5px] leading-relaxed text-slate-600">
                <b>CVM이 고객마다 순서를 자동으로 정하므로</b>, 정렬·노출 구성은 <b>운영자 편성</b>일 때만 직접 설정할 수 있어요.
                </p>
              )}
              <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2', cvmChosen && 'opacity-50')} aria-disabled={cvmChosen}>
                <div className="space-y-1">
                  <label className="text-[12.5px] text-slate-600">정렬 기준 기본값</label>
                  <select name="defaultSortStrategy" defaultValue={row.defaultSortStrategy ?? ''} disabled={cvmChosen} className="h-9 w-full rounded-md border bg-background px-2.5 text-[13px] disabled:cursor-not-allowed disabled:opacity-60">
                    <option value="">미지정(수동)</option>
                    {PRODUCT_SORT_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                {/* CTA는 '표시 항목'(세부 항목)에서 관리 — 여기(노출 구성)엔 두지 않는다(중복 제거). */}
              </div>
            </div>
          )}
        </div>
      </section>
      </div>
      )}

      {/* (제거됨) 고객정보 연동 필드 — 코너 유형 단계에선 실제 바인딩을 하지 않아 삭제.
          실제 고객정보 연동은 빌더의 아톰 단계('고객정보 가져오기' = @cvm:key)에서 처리한다. */}

      {/* 유형 샘플 이미지 제거(2026-09-28) — 컴포넌트 조합의 실시간 미리보기(미리보기·조합 결과)로 통일. 중복 방지. */}

      <div className="flex items-center justify-end gap-2 border-t pt-3">
        <Button type="button" variant="secondary" size="sm" onClick={onClose}>취소</Button>
        {wizard ? (
          <>
            {step > 0 && <Button type="button" variant="secondary" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))}>이전</Button>}
            {step < lastStep
              ? <Button type="button" size="sm" disabled={!stepValid} onClick={() => setStep((s) => Math.min(lastStep, s + 1))}>다음 <ChevronRight className="ml-1 h-4 w-4" /></Button>
              : <Button type="submit" size="sm"><Check className="mr-1 h-4 w-4" /> 등록</Button>}
          </>
        ) : (
          <Button type="submit" size="sm"><Check className="mr-1 h-4 w-4" /> {isNew ? '등록' : '저장'}</Button>
        )}
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
        <input ref={allRef} type="checkbox" checked={allOn} onChange={toggleAll} className="accent-[#3a2fd8]" /> 전체
      </label>
      {reals.map((r) => (
        <label key={r} className="flex items-center gap-1.5 text-xs">
          <input type="checkbox" name={name} value={r} checked={sel.has(r)} onChange={() => toggle(r)} className="accent-[#3a2fd8]" /> {r}
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
  // 프로모션 상세 .frow 규격에 통일 — 라벨 셀 #f6f7f9·150px·12.5px, 값 셀 px3.5 py2.5(2026-10-01 사용자 요청).
  return (
    <div className={cn('grid grid-cols-[150px_1fr] items-stretch overflow-hidden', !flat && 'border-b border-[#e6e7ec]')}>
      <label className="flex h-full flex-col justify-center bg-[#f6f7f9] px-3.5 py-3 text-[12.5px] font-medium text-slate-600">
        <span>{label} {required && <span className="text-rose-500">*</span>}</span>
        {hint && <span className="mt-0.5 block text-[11px] font-normal text-slate-500/80">{hint}</span>}
      </label>
      <div className="min-w-0 px-3.5 py-2.5">{children}</div>
    </div>
  );
}

/** 유형 상세 선택 시 만들어질 코너 레이아웃 미리보기 (스켈레톤 목업) */
export function TypeDetailPreview({ base, component, detail, bigBanner = false, useTitle = true, useSub = true, useMore, badge = false, image = true, price = true, desc = true, ctaLabel, compact = false }: { base: string; component?: string; detail: string; bigBanner?: boolean; useTitle?: boolean; useSub?: boolean; useMore?: boolean; badge?: boolean; image?: boolean; price?: boolean; desc?: boolean; ctaLabel?: string; compact?: boolean }) {
  // 스켈레톤(회색 막대) 대신 '위치에 이름'을 적는 라벨 슬롯 — Title / Description / img / Badge / Price …
  const Slot = ({ label, className = '' }: { label: string; className?: string }) => (
    <div className={cn('flex items-center justify-center overflow-hidden rounded border border-dashed border-slate-400 bg-[#e6e7ec] px-1 text-center text-[9px] font-semibold leading-none text-slate-600', className)}>
      {label}
    </div>
  );
  // 상품 카드 이미지 슬롯 — 세부 항목 '상품 이미지'에 따라 실제 노출 위치를 보여준다.
  //  · 이미지 OFF → 이미지 자리를 비우지 않고 '이미지 없음' 점선으로 표시(상품형만 image=false 가능)
  const ImgSlot = ({ className = '' }: { className?: string }) => (
    <div className={cn('relative', className)}>
      <Slot label={image ? '이미지' : '이미지 없음'} className={cn('h-full w-full', !image && 'border-slate-300 bg-[#f6f7f9] text-slate-400')} />
    </div>
  );
  // 배열 이름 접미사 반영 — '+태그'면 배지 노출, '+배너'면 상단 배너를 얹는다.
  const dName = detail ?? '';
  const badgeOn = badge || dName.includes('태그');
  // 배지+가격 행 — 정책상 배지는 '가격 앞'에 붙는다. 배지는 가격에 종속(가격 없으면 배지도 없음).
  //  가격 OFF면 행 자체를 렌더하지 않음(배지만 단독 노출 안 함).
  const PriceRow = ({ className = '' }: { className?: string }) => (price ? (
    <div className={cn('flex items-center gap-1', className)}>
      {badgeOn && <span className="shrink-0 rounded bg-rose-500 px-1 py-[1px] text-[8px] font-bold leading-none text-white">{dName.includes('태그') ? '태그' : '배지'}</span>}
      <Slot label="가격" className="h-3 min-w-0 flex-1" />
    </div>
  ) : null);
  // 설명 행(부가/흐린 글씨, 예: '데이터 500') — 혜택 문구/정보값 Atom. 가격과 별개로 존재 가능.
  const DescSlot = ({ className = '' }: { className?: string }) => (desc ? <Slot label="설명" className={cn('border-slate-300 bg-[#f6f7f9] text-slate-400', className)} /> : null);
  // CTA 텍스트 — 세부 항목 CTA ON일 때 실제 문구(② 노출 구성의 CTA 기본 문구)로 표시. 미입력 시 'CTA' 안내.
  const ctaText = (ctaLabel && ctaLabel.trim()) || 'CTA';
  // 가로형(2.5배열) 카드 비율 미리보기 뷰 — 1:1(상품)/3:4(포스터)/4:3(와이드) 전환
  const [shapeView, setShapeView] = useState<'1:1' | '3:4' | '4:3'>('3:4');
  const d = detail ?? '';
  const c = component ?? '';
  const has = (...keys: string[]) => keys.some((k) => d.includes(k));
  // 본문(body)은 ② 구성 컴포넌트 유형 기준으로 그린다. component 없으면 코너 유형(base)로 폴백.
  const isBanner = c === '배너형' || (!c && base === '배너형');
  const isProduct = c === '상품형' || (!c && base === '상품형');
  const wantsBanner = dName.includes('배너') && !isBanner; // '세로형+배너' 등 → 상단 배너 얹기

  let body: React.ReactNode;
  if (!d && !base) {
    body = <div className="flex h-24 items-center justify-center text-[11px] text-muted-foreground">유형/상세를 선택하면 미리보기가 표시됩니다.</div>;
  } else if (isBanner || has('빅배너', '이미지형', '팝업', '띠', '텍스트배너')) {
    // 배너 카드: Title + Description(좌) + 우측 동그란 이미지 (띠/텍스트배너는 얇은 바)
    body = has('띠', '텍스트배너') ? (
      <Slot label="텍스트 배너" className="h-8 w-full" />
    ) : (
      <div className="flex items-center gap-2 rounded-lg border border-[#e6e7ec] bg-[#f6f7f9] p-3">
        <div className="flex-1 space-y-1.5">
          <Slot label="타이틀" className="h-4 w-3/4 justify-start" />
          <Slot label="디스크립션" className="h-3 w-1/2 justify-start" />
        </div>
        <Slot label="이미지" className="h-12 w-12 shrink-0 rounded-full" />
      </div>
    );
  } else if (isProduct && has('단일 상품')) {
    body = (
      <div className="flex gap-2 rounded-lg border border-[#e6e7ec] bg-[#f6f7f9] p-2">
        <div className="flex-1 space-y-1.5">
          <Slot label="텍스트" className="h-3 w-1/3 justify-start" />
          <Slot label="텍스트" className="h-4 w-3/4 justify-start" />
          <PriceRow className="h-3 w-1/2 justify-start" />
          <DescSlot className="h-2.5 w-2/3 justify-start" />
        </div>
        <ImgSlot className="h-16 w-16 shrink-0" />
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
          <div key={i} className="flex items-center gap-2 rounded-lg border border-[#e6e7ec] bg-[#f6f7f9] p-1.5">
            <ImgSlot className="h-10 w-10 shrink-0" />
            <div className="flex-1 space-y-1">
              <Slot label="텍스트" className="h-3 w-3/4 justify-start" />
              <PriceRow className="h-3 w-1/3 justify-start" />
              <DescSlot className="h-2.5 w-1/2 justify-start" />
            </div>
          </div>
        ))}
      </div>
    );
  } else if (has('그리드')) {
    // 그리드형 — 2열 그리드로 카드 배치(다른 배열과 높이 맞추려 카드 컴팩트).
    body = (
      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-1 rounded-lg border border-[#e6e7ec] bg-[#f6f7f9] p-1.5">
            <ImgSlot className="aspect-[4/3] w-full" />
            <Slot label="텍스트" className="h-2.5 w-3/4 justify-start" />
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
                className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold transition', shapeView === sh ? 'border-primary bg-primary text-primary-foreground' : 'border-slate-300 text-slate-500 hover:bg-[#e6e7ec]')}
              >
                {sh}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <div key={i} className={cn('shrink-0 space-y-1 rounded-lg border border-[#e6e7ec] bg-[#f6f7f9] p-1.5', cardW)}>
              <ImgSlot className={cn('w-full', ratioCls)} />
              <Slot label="텍스트" className="h-3 w-full justify-start" />
              <PriceRow className="h-3 w-2/3 justify-start" />
              <DescSlot className="h-2.5 w-1/2 justify-start" />
            </div>
          ))}
        </div>
        {!compact && <p className="text-[9px] leading-relaxed text-slate-400">같은 가로형(2.5배열)이라도 콘텐츠에 따라 비율이 달라요(1:1 상품·3:4 포스터·4:3 와이드). 실제 비율은 빌더에서 코너별로 선택합니다.</p>}
      </div>
    );
  } else if (has('단일강조', '1.5')) {
    // 가로형(1.5배열) — 큰 카드 1.5장(하나를 크게 강조 + 다음 카드 살짝). 2.5배열보다 카드가 크다.
    body = (
      <div className="space-y-1">
        <div className="flex gap-2 overflow-hidden">
          {[0, 1].map((i) => (
            <div key={i} className="w-[66%] shrink-0 space-y-1.5 rounded-lg border border-[#e6e7ec] bg-[#f6f7f9] p-2">
              <ImgSlot className="aspect-[16/10] w-full" />
              <Slot label="텍스트" className="h-4 w-3/4 justify-start" />
              <PriceRow className="h-3 w-1/2 justify-start" />
              <DescSlot className="h-2.5 w-2/5 justify-start" />
            </div>
          ))}
        </div>
        <p className="text-[9px] leading-relaxed text-slate-400">가로형(1.5배열) — 큰 카드 하나를 강조하고 다음 카드가 살짝 보입니다. (2.5배열은 작은 카드 캐러셀)</p>
      </div>
    );
  } else if (isProduct || has('가로')) {
    body = (
      <div className="flex gap-2 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-[42%] shrink-0 space-y-1 rounded-lg border border-[#e6e7ec] bg-[#f6f7f9] p-1.5">
            {/* 상품 이미지 = 세로로 긴 카드 이미지 영역 */}
            <ImgSlot className="h-28 w-full" />
            <Slot label="텍스트" className="h-3 w-full justify-start" />
            <PriceRow className="h-3 w-2/3 justify-start" />
            <DescSlot className="h-2.5 w-1/2 justify-start" />
          </div>
        ))}
      </div>
    );
  } else if (has('바코드')) {
    body = (
      <div className="space-y-1.5 rounded-lg border border-[#e6e7ec] bg-[#f6f7f9] p-3">
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
      <div className="flex items-center gap-2 rounded-lg border border-[#e6e7ec] bg-[#f6f7f9] p-3">
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
      <div className="flex items-center gap-2 rounded-lg border border-[#e6e7ec] bg-[#f6f7f9] p-3">
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
    body = <div className="space-y-1.5">{['데이터/통화 관리', '나의 요금제/부가서비스', '약정할인/기기 할부', '나의 PASS지갑', '나의 쇼핑'].map((t, i) => <Slot key={i} label={t} className="h-7 w-full justify-start" />)}</div>;
  } else if (has('칩')) {
    // 칩형 — 아이콘+텍스트 퀵링크 칩 2줄 그리드(ChipHome)
    body = (
      <div className="grid grid-cols-4 gap-1.5">
        {['4월혜택', '혜택줍기', '카테고리', '글쓰기', '0 Week', '이벤트', '영화예매', '더보기'].map((t, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <Slot label="＋" className="h-8 w-8 rounded-full" />
            <span className="w-full truncate text-center text-[8px] text-slate-500">{t}</span>
          </div>
        ))}
      </div>
    );
  } else if (has('탭', '고정형')) {
    body = <div className="flex flex-wrap gap-1.5">{['탭', '탭', '탭'].map((t, i) => <Slot key={i} label={t} className="h-7 w-16 rounded-full" />)}</div>;
  } else if (has('그리드', '격자')) {
    body = (
      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-1 rounded-lg border border-[#e6e7ec] bg-[#f6f7f9] p-1.5">
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
          <div key={i} className="flex items-center gap-2 rounded-lg border border-[#e6e7ec] bg-[#f6f7f9] p-1.5">
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
  const noHeader = isBanner || has('카테고리 탭') || has('고정형(탭)') || has('칩') || has('아이콘형', '이미지형', '팝업', '띠', '텍스트배너');
  // 세부 항목 토글(타이틀/서브타이틀 사용여부)에 따라 헤더 슬롯을 켜고 끈다
  const showHeader = !noHeader && (useTitle || useSub);
  return (
    <div className={compact ? 'flex h-full flex-col' : 'rounded-md border bg-[#f6f7f9] p-3'}>
      {!compact && (
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          미리보기 · {base}
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
          {/* ④ 빅배너 구분자 ON 또는 배열명에 '배너' 포함('+배너') → 상단 배너를 얹는다 */}
          {(bigBanner || wantsBanner) && !isBanner && <Slot label={bigBanner ? '이미지 (빅배너)' : '배너'} className="h-20 w-full" />}
          {body}
          {showMore && <div className="mx-auto flex h-7 min-w-[7rem] items-center justify-center gap-1 rounded-full border border-slate-300 bg-white px-3 text-[10px] font-medium text-slate-600" title="세부 항목 'CTA' ON — ② 노출 구성의 'CTA 기본 문구'가 실제 버튼 텍스트로 노출됩니다">{ctaText} <span aria-hidden className="text-slate-400">›</span></div>}
        </div>
      </div>
    </div>
  );
}
