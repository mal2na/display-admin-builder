'use client';

import { useState, useEffect, useRef, createContext, useContext, useTransition, type MouseEvent as ReactMouseEvent } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  CORNER_TYPES,
  SUBTITLE_ICONS,
  PRODUCT_SORT_OPTIONS,
  cornerFamily,
  cornerTypeChipClass,
  cornerTypePurpose,
  isComponentAllowedInCorner,
  layoutLabel,
  layoutEn,
  cornerTypeEn,
  componentLabel,
  ATOM_TYPES,
  ATOM_TYPE_LABELS,
  ATOM_TYPE_FIELDS,
  cvmBindingLabel,
  resolveCvmSample,
  isCvmBinding,
  REC_SOURCE_METHODS,
  REC_SOURCE_INFO,
  normalizeRecSource,
  CVM_TARGET_HINTS,
  type AtomType,
  type CornerType,
} from '@/lib/display-taxonomy';
import { cn } from '@/lib/utils';
import { DeviceFrame, CornerBlock, type PreviewCorner } from '@/components/preview/blocks';
import { chipIconForLabel } from '@/components/preview/composition-preview';
import { IconGlyph, isIconRef } from '@/lib/icon-library';
import { IconPickerModal } from './icon-picker-modal';
import { AssetPickerModal } from '@/components/asset-picker-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { GripVertical, Trash2, Plus, Copy, Image as ImageIcon, X, Pencil, Check, Link2, Search, Lock, Sparkles, Layers, PanelLeftClose, PanelRightClose, PanelLeftOpen, PanelRightOpen, List, Download, GalleryHorizontalEnd, RotateCcw } from 'lucide-react';
import { TypeDetailPreview } from '../../corner-types/corner-type-manager';
import {
  updateTemplateMeta,
  createCorner,
  createCornerFromType,
  importBannerCampaignCorner,
  removeCorner,
  duplicateCorner,
  toggleCornerVisible,
  toggleCornerPinned,
  reorderCorners,
  removeComponent,
  renameComponent,
  reorderComponents,
  addExistingAtom,
  createAtom,
  removeAtom,
  saveAtoms,
  updateCornerMeta,
  createBanner,
  setCornerBanner,
  saveChips,
  swapCornerToType,
  setCornerDisplayVariants,
  setCornerMainTitleVariants,
  setCornerBigBanner,
  refreshBannerComponent,
  addBssProduct,
} from '../actions';
import { BSS_PRODUCTS, BSS_CATEGORY_LABELS, BSS_SUBCATEGORIES, type BssCategory } from '@/lib/bss-products';
import { parseBannerOptions, type BannerOptions } from '@/lib/banner-options';
import { isChipAllowed } from '@/lib/chip-types';
import { DevImpactGuide, DevLockBadge } from '@/components/dev-impact-guide';

export type AtomNode = {
  componentAtomId: string;
  id: string;
  name: string;
  atomType: string;
  isRequired: boolean;
  visible?: boolean; // 코너 구성 표시/숨김 토글 (숨김=미리보기·FO 제외, 삭제 아님)
  menuRole?: string; // FIXED(고정) | EDITABLE(편집가능) — 선택형·메뉴 리스트 항목 역할
  content: string | null;
  contentVariants?: { text: string; target?: string; enabled?: boolean }[]; // 문구 후보(+타겟 힌트, +노출 통제). enabled=false면 노출 제외(삭제 아님). 실서비스 CVM 택1. 기본=content.
  imageUrl: string | null;
  altText: string | null;
  linkUrl: string | null;
};
export type ComponentNode = {
  cornerComponentId: string;
  id: string;
  name: string;
  componentType: string;
  selectedIndex: number;
  chipRows: number;
  sourceChanged?: boolean; // 원본(배너 캠페인) 변경 이후인지 — 갱신 필요 표시
  sourceCampaignId?: string | null; // 원본 배너 캠페인 id(배너형) — '배너 캠페인 관리에서 수정' 링크용
  atoms: AtomNode[];
};
export type CornerNode = {
  templateCornerId: string;
  id: string;
  sourceCornerTypeId: string | null; // 원본 코너 유형 id — '코너 유형에서 수정' 링크(상세로 이동)용
  name: string;
  cornerType: string;
  typeLabel: string | null;
  title: string | null;
  maxItems: number | null;
  markupId: string | null;
  layoutDetail: string | null;
  cornerLayout: string | null;
  description: string | null;
  mainTitle: string | null;
  mainTitleVariants: string | null; // 타이틀 베리에이션 (JSON [{text,target}]) — 실서비스 CVM 택1
  subTitle: string | null;
  subTitleIcon: string | null;
  sortStrategy: string | null;
  minItems: number | null;
  noDisplayCondition: string | null;
  recSource: string | null; // (대표) 1순위 추천 수급 방식
  recSourcePlan: string | null; // 우선순위 편성 (JSON 배열, 1순위→폴백)
  showRecReason: boolean; // (레거시) 추천 근거 표시 여부 — 미표시
  bigBanner: boolean; // 빅배너 = 배치(인스턴스) 옵션 (유형 아님). 빌더에서 켠다.
  cardShape: string | null; // 상품형 2.5배열 카드 모양 (정사각형 | 직사각형)
  titleLines: number | null; // 상품 카드 제목 줄 수 (2=두 줄)
  displayVariants: string | null; // 노출 타입 베리에이션 (JSON [{label,note}]) — 실서비스 CVM 택1
  moreButtonUse: boolean;
  moreButtonLabel: string | null;
  moreButtonLink: string | null;
  showImage: boolean; // 코너별 표시 항목 — 상품 이미지
  showPrice: boolean; // 가격
  showBadge: boolean; // 배지(가격 앞)
  showDesc: boolean; // 설명(부가/흐린 글씨)
  bannerId: string | null;
  bannerName: string | null;
  bannerImageUrl: string | null;
  bannerPosition: string | null;
  bannerOptions: string | null; // 배너형 코너 노출 옵션 (JSON {mode,intervalSec,showIndicator,loop})
  sampleImageUrl: string | null;
  userCustomizable: boolean;
  userMinItems: number | null;
  userMaxItems: number | null;
  reviewStatus: string;
  reviewReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  visible: boolean;
  pinned: boolean; // 위치 고정 — 상단 퀵메뉴처럼 자리를 잠가 드래그 재정렬·CVM 자동 재정렬에서 제외(2026-10-06)
  components: ComponentNode[];
};
export type LibraryData = {
  corners: { id: string; name: string; cornerType: string; layoutDetail?: string | null }[];
  components: { id: string; name: string; componentType: string; allowedCornerTypes: string[] }[];
  atoms: { id: string; name: string; atomType: string }[];
  banners: { id: string; name: string; imageUrl: string }[];
  cornerTypes: { id: string; name: string; baseCategory: string; componentType?: string | null; typeDetail?: string | null; bigBanner?: boolean; sampleImageUrl?: string | null; active: boolean; liveVersion?: number | null; previewCorner?: PreviewCorner | null }[];
  bannerCampaigns?: { id: string; campaignCode: string; title: string; exposeYn: boolean; approvalStatus: string; publishStart: string | null; publishEnd: string | null; thumbnailUrl?: string | null; bannerAlt?: string | null; sizes?: { detail: string; imageUrl: string | null; bgColor: string | null }[] }[];
  images: { url: string; alt: string | null; name: string }[];
  links: { url: string; label: string }[];
  messages: { text: string; use: string }[];
};

/** 코너 유형 카탈로그 → 기준분류(baseCategory) → 표시명 맵. 카탈로그 우선, 없으면 원래 값. */
function cornerTypeNameMap(library: LibraryData): Record<string, string> {
  const m: Record<string, string> = {};
  for (const t of library.cornerTypes) if (!m[t.baseCategory]) m[t.baseCategory] = t.name;
  return m;
}

/**
 * 코너를 코너 유형 관리와 동일한 3단 경로로 매핑: 코너유형 · 구성 컴포넌트 · 배열/레이아웃 상세 (· 빅배너).
 *  - 컴포넌트 = 코너에서 가장 많은 componentType(동률이면 먼저 배치된 것)
 *  - 빅배너 = 배너형 코너가 아닌데 배열명에 '배너' 마커가 있거나 배너가 연결된 경우 → 배열은 마커 제거
 */
function cornerTypeParts(corner: CornerNode): { base: string; rest: string; bigBanner: boolean } {
  const base = corner.cornerType;
  const freq = new Map<string, number>();
  for (const c of corner.components) freq.set(c.componentType, (freq.get(c.componentType) ?? 0) + 1);
  let comp = '';
  let best = -1;
  for (const c of corner.components) {
    const f = freq.get(c.componentType)!;
    if (f > best) { best = f; comp = c.componentType; }
  }
  const raw = corner.layoutDetail ?? '';
  const isBannerCorner = base === '배너형';
  // 빅배너는 인스턴스 옵션(corner.bigBanner)이 유일한 진실 — 끄면 칩·상단배너·렌더 모두 사라진다(레거시 배열마커/배너연결 폴백 제거).
  const bigBanner = !isBannerCorner && corner.bigBanner;
  const detail = raw.replace(/\s*·\s*빅배너\s*/, '').replace(/\(배너\)/, '').trim();
  const rest = layoutLabel(detail); // 컴포넌트 제외 — 유형 › 배열·레이아웃만. 빅배너는 별도 배지
  return { base, rest, bigBanner };
}

// 렌더 가능한 이미지 소스인지(data URI · http · 유형 샘플 썸네일). 그 외 /assets 자리표시자는 제외.
const isImgSrc = (src?: string | null): src is string => !!src && (src.startsWith('data:') || src.startsWith('http') || src.startsWith('/assets/'));

// 빅배너 = 코너 유형(8색 칩)이 아니라 '부속 구분자'. 타입 칩과 헷갈리지 않게 점선+아이콘의 다른 스타일로.
function BigBannerBadge({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5 rounded border border-dashed border-indigo-400 bg-indigo-50/60 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600', className)}>
      <ImageIcon className="h-3 w-3" /> 빅배너
    </span>
  );
}

// 코너 유형은 색 Chip으로 분리, 나머지 경로(컴포넌트 · 배열)는 회색 텍스트, 빅배너는 별도 구분자 배지.
// 코너 유형 관리와 같은 8색 팔레트(cornerTypeChipClass)를 공유한다.
function CornerTypeChip({ corner, className }: { corner: CornerNode; className?: string }) {
  const { base, rest, bigBanner } = cornerTypeParts(corner);
  // 배너형은 코너 유형이 아니라 배너 캠페인이므로, '배너형 · 이미지형'이 아니라 그냥 '배너'로만 표기
  const isBanner = base === '배너형';
  const baseEn = isBanner ? 'Banner' : cornerTypeEn(base);
  const restEn = rest ? layoutEn(rest) : '';
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5', className)} title={`${isBanner ? '배너' : base}${baseEn ? ` (${baseEn})` : ''}${rest ? ` · ${rest}${restEn ? ` (${restEn})` : ''}` : ''}`}>
      <span className={cn('inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold', cornerTypeChipClass(base))}>
        {isBanner ? '배너' : base}{baseEn && <span className="ml-1 font-normal opacity-70">{baseEn}</span>}
      </span>
      {!isBanner && rest && <span className="truncate text-xs text-muted-foreground">{rest}{restEn && <span className="opacity-70"> ({restEn})</span>}</span>}
      {bigBanner && <BigBannerBadge className="shrink-0" />}
    </span>
  );
}

// 코너 거버넌스 패널 — 이 코너의 목적 + 배열·레이아웃만. (담을 수 있는 컴포넌트 표시는 제외 — 제약은
//  CORNER_COMPONENT_MAP으로 컴포넌트 추가 시 강제. 유형=컴포넌트 중복 표기가 어색해 숨김.)
function CornerGovernance({ base, layoutDetail }: { base: string; layoutDetail?: string | null }) {
  const purpose = cornerTypePurpose(base);
  if (!purpose && !layoutDetail) return null;
  return (
    <div className="mt-1.5 space-y-1.5 rounded-md border border-slate-200 bg-slate-50/70 p-2">
      {purpose && <p className="text-[10.5px] leading-relaxed text-slate-600"><span className="font-semibold text-slate-500">목적</span> · {purpose}</p>}
      {layoutDetail && (
        <p className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
          배열·레이아웃 · <b className="text-slate-700">{layoutLabel(layoutDetail)}</b>
          <DevLockBadge reason="레이아웃(배열)은 DS/개발 영역 — 어드민은 등록된 배열을 '코너 불러오기'로 교체만 가능" />
        </p>
      )}
    </div>
  );
}

export type TemplateMeta = {
  id: string;
  name: string;
  conditionGroup: string;
  startAt: string | null;
  endAt: string | null;
  containerName: string;
  containerType: string | null; // 홈=MAIN 등 — 칩 사용 제어 컨텍스트
  isDefault: boolean;
  memo: string | null;
  displayOn: boolean;
  startAtOnApproval: boolean;
};

const DEVICES = [
  { key: 'ip15pro', label: 'iPhone 15 Pro', w: 393, h: 852 },
  { key: 'android', label: 'Android', w: 360, h: 800 },
  { key: 'ipse', label: 'iPhone SE', w: 375, h: 667 },
];

// ── 선택형(칩) 실시간 편집 드래프트 + 미리보기 반영 ─────────
type ChipItem = { content: string; linkUrl: string; iconUrl: string; iconAlt: string; menuRole: string };
type ChipDraft = { chips: ChipItem[]; selectedIndex: number; chipRows: number };
type ChipDraftState = { key: string; draft: ChipDraft } | null;

function initChipDraft(cc: ComponentNode): ChipDraft {
  return {
    chips: cc.atoms.map((a) => ({ content: a.content ?? '', linkUrl: a.linkUrl ?? '', iconUrl: a.imageUrl ?? '', iconAlt: a.altText ?? '', menuRole: a.menuRole ?? 'EDITABLE' })),
    selectedIndex: cc.selectedIndex ?? 0,
    chipRows: cc.chipRows ?? 1,
  };
}

const isRenderableIconUrl = (s?: string | null) => !!s && (s.startsWith('data:') || s.startsWith('http'));

// 편집 중인 칩 드래프트를 상위(BuilderEditor)로 올려 가운데 미리보기에 즉시 반영한다.
type ChipPreviewSetter = (key: string, draft: ChipDraft | null) => void;
const ChipPreviewContext = createContext<ChipPreviewSetter>(() => {});

// ── 코너 정보 실시간 편집 드래프트 (CornerInfoForm → 미리보기) ─────
// 저장(코너 정보 저장) 전에도 타이틀·서브·아이콘·레이아웃·더보기가 즉시 반영된다.
type CornerPatch = {
  name?: string;
  mainTitle?: string;
  subTitle?: string;
  subTitleIcon?: string;
  cornerLayout?: string;
  layoutDetail?: string;
  maxItems?: number | null;
  bigBanner?: boolean;
  cardShape?: string | null;
  recSource?: string | null;
  recSourcePlan?: string | null;
  showRecReason?: boolean;
  moreButtonUse?: boolean;
  moreButtonLabel?: string;
  bannerPosition?: string;
  showImage?: boolean;
  showPrice?: boolean;
  showBadge?: boolean;
  showDesc?: boolean;
};
type CornerDraftState = { key: string; patch: CornerPatch } | null;
type CornerPreviewSetter = (key: string, patch: CornerPatch | null) => void;
const CornerPreviewContext = createContext<CornerPreviewSetter>(() => {});

// ── 비-칩 컴포넌트의 Atom 실시간 편집 드래프트 (AtomManager → 미리보기) ─────
type AtomsDraftState = { key: string; atoms: AtomNode[] } | null;
type AtomsPreviewSetter = (key: string, atoms: AtomNode[] | null) => void;
const AtomsPreviewContext = createContext<AtomsPreviewSetter>(() => {});

// 삭제 안전장치 — 삭제 전 확인 팝오버 + 하위 항목 카운트 고지 (로드맵 1차: 삭제 안전 장치)
function DeleteConfirmForm({
  action,
  itemLabel,
  childSummary,
  ariaLabel,
  stopPropagation = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  itemLabel: string; // '코너' | '컴포넌트' | 'Atom'
  childSummary?: string; // 예: '컴포넌트 3개 · Atom 12개' — 없으면 하위 없음
  ariaLabel: string;
  stopPropagation?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const stop = (e: ReactMouseEvent) => e.stopPropagation();
  return (
    <div className="relative inline-flex" onClick={stopPropagation ? stop : undefined}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="text-muted-foreground hover:text-destructive"
        aria-label={ariaLabel}
        title="삭제"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div className="absolute right-0 top-6 z-50 w-56 rounded-lg border bg-white p-3 text-left shadow-xl" onClick={stop}>
            <p className="text-[13px] font-semibold">{itemLabel} 삭제</p>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              {childSummary ? (
                <>이 {itemLabel}에는 <span className="font-semibold text-foreground">{childSummary}</span>가 포함되어 있습니다. 함께 제거됩니다.</>
              ) : (
                <>이 {itemLabel}을(를) 화면에서 제거합니다.</>
              )}
            </p>
            <div className="mt-2.5 flex justify-end gap-1.5">
              <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(false); }} className="rounded-md border px-2 py-1 text-[11px] hover:bg-secondary">
                취소
              </button>
              <form action={action} onClick={stop}>
                <button type="submit" className="rounded-md bg-destructive px-2 py-1 text-[11px] font-medium text-white hover:bg-destructive/90">
                  삭제
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function toPreviewCorner(c: CornerNode): PreviewCorner {
  // CVM 보충 — 노출 개수(max)보다 운영자 등록(본문 컴포넌트)이 적은 콘텐츠 수급 코너는 나머지를 CVM이 채움(가안). 미리보기에 점선 보충 슬롯 표시.
  const bodyCount = (c.components ?? []).filter((x) => x.componentType !== '선택형').length;
  const cvmFillCount = ['상품형', '혜택·오퍼형', '콘텐츠 안내형'].includes(c.cornerType) && c.recSource === 'CVM 기반' && c.maxItems != null && c.maxItems > bodyCount
    ? c.maxItems - bodyCount : 0;
  return {
    id: c.templateCornerId,
    cvmFillCount,
    name: c.name,
    cornerType: c.cornerType,
    title: c.title,
    maxItems: c.maxItems,
    mainTitle: c.mainTitle,
    subTitle: c.subTitle,
    cornerLayout: c.cornerLayout,
    layoutDetail: c.layoutDetail,
    subTitleIcon: c.subTitleIcon,
    bigBanner: c.bigBanner,
    cardShape: c.cardShape,
    titleLines: c.titleLines,
    moreButtonUse: c.moreButtonUse,
    moreButtonLabel: c.moreButtonLabel,
    bannerImageUrl: c.bannerImageUrl,
    bannerName: c.bannerName,
    bannerPosition: c.bannerPosition,
    bannerOptions: c.bannerOptions,
    sampleImageUrl: c.sampleImageUrl,
    recSource: c.recSource,
    recSourcePlan: c.recSourcePlan,
    showRecReason: c.showRecReason,
    showImage: c.showImage,
    showPrice: c.showPrice,
    showBadge: c.showBadge,
    showDesc: c.showDesc,
    // 업무 진입형 '탭형'(메뉴 리스트 제외)은 코너 유형 관리와 동일하게 아이콘 퀵칩(ChipHome)으로 — 아이콘 미저장 칩도 라벨에서 자동 유추.
    components: c.components.map((cc) => {
      const isQuickChip = cc.componentType === '선택형' && c.cornerType === '업무 진입형' && !/메뉴/.test(c.layoutDetail ?? '');
      return {
        id: cc.cornerComponentId,
        name: cc.name,
        componentType: cc.componentType,
        selectedIndex: cc.selectedIndex,
        chipRows: isQuickChip ? (cc.chipRows ?? 2) : cc.chipRows,
        ...(isQuickChip ? { chipVariant: 'home' as const } : {}),
        atoms: cc.atoms.filter((a) => a.atomType === 'IMAGE' || a.visible !== false).map((a) => ({
          id: a.componentAtomId,
          name: a.name,
          atomType: a.atomType,
          content: a.content,
          contentVariants: a.contentVariants,
          imageUrl: isQuickChip && a.atomType === 'TEXT' ? (a.imageUrl || chipIconForLabel(a.content ?? a.name)) : a.imageUrl,
          altText: a.altText,
          linkUrl: a.linkUrl,
          menuRole: a.menuRole,
        })),
      };
    }),
  };
}

function DisclosureButton({ children }: { children: React.ReactNode }) {
  return (
    <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-primary">
      <Plus className="h-3.5 w-3.5" /> {children}
    </summary>
  );
}

// 정렬 가능한 칩 한 줄 (드래그앤드롭 · 그립 핸들) — 좌측 코너 리스트와 동일한 방식
function SortableChipRow({ i, chip }: { i: number; chip: ChipItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(i) });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1.5 rounded-md bg-white p-1.5">
      <button
        type="button"
        className="cursor-grab text-muted-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label="순서 변경 (드래그)"
        title="드래그하여 순서 변경"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* 아이콘(읽기 전용) — 정의는 코너 유형에서 */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-slate-50">
        {chip.iconUrl ? (
          isIconRef(chip.iconUrl) ? (
            <IconGlyph name={chip.iconUrl} className="h-4 w-4 text-slate-700" />
          ) : isRenderableIconUrl(chip.iconUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={chip.iconUrl} alt={chip.iconAlt} className="h-4 w-4 rounded object-cover" />
          ) : (
            <span className="h-3.5 w-3.5 rounded-full bg-slate-300/70" title={chip.iconAlt || chip.iconUrl} />
          )
        ) : (
          <span className="h-3.5 w-3.5 rounded bg-slate-200" />
        )}
      </div>

      {/* 라벨·링크는 읽기 전용(코너 유형에서 정의) — 빌더에선 순서만 변경 */}
      <span className="min-w-0 flex-1 truncate rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-600">{chip.content || `ChipLabel${String(i + 1).padStart(2, '0')}`}</span>
      <span className="min-w-0 flex-1 truncate rounded-md bg-slate-50 px-2 py-1.5 text-[11px] text-slate-400">{chip.linkUrl || '이동 링크 —'}</span>
    </div>
  );
}

// ── 선택형(칩/탭) 편집기 = ChipPage (업무진입형.png) ─────────
// 완전 제어형: 개별 저장 없이 로컬 draft만 수정 → 미리보기 즉시 반영, 저장은 카드의 "완료"가 일괄 처리.
function ChipEditor({ draft, onChange }: { draft: ChipDraft; onChange: (next: ChipDraft) => void }) {
  const { chips, selectedIndex, chipRows } = draft;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const setChips = (next: ChipItem[], sel = selectedIndex) =>
    onChange({ chips: next, selectedIndex: Math.max(0, Math.min(sel, Math.max(0, next.length - 1))), chipRows });
  // 드래그로 순서만 변경 (선택된 칩도 함께 따라가도록 selectedIndex 보정). 라벨·링크·줄수는 코너 유형에서 정의.
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = Number(active.id);
    const to = Number(over.id);
    if (Number.isNaN(from) || Number.isNaN(to)) return;
    const next = [...chips];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    let sel = selectedIndex;
    if (selectedIndex === from) sel = to;
    else if (from < selectedIndex && to >= selectedIndex) sel = selectedIndex - 1;
    else if (from > selectedIndex && to <= selectedIndex) sel = selectedIndex + 1;
    setChips(next, sel);
  };

  return (
    <div className="mt-1 space-y-2 rounded-md bg-muted/40 p-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">드래그로 <b className="text-slate-600">순서만</b> 변경 · 상단 “완료”로 저장</span>
        <span className="rounded bg-white px-1.5 py-0.5 text-[11px] font-semibold">{chips.length}</span>
      </div>

      {/* 각 칩 = 드래그 핸들 · 아이콘(읽기) · 라벨(읽기) · 이동 링크(읽기). 순서만 변경. */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={chips.map((_, i) => String(i))} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {chips.map((c, i) => (
              <SortableChipRow key={i} i={i} chip={c} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Selection: 기본 활성 칩 */}
      {chips.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Selection</span>
          <div className="flex flex-wrap gap-1">
            {chips.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onChange({ ...draft, selectedIndex: i })}
                className={cn('h-6 w-6 rounded text-[11px] font-medium', selectedIndex === i ? 'bg-primary text-primary-foreground' : 'border bg-white hover:bg-secondary')}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 표시 줄 수 — 읽기 전용(코너 유형에서 정의) */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-muted-foreground">표시 줄 수</span>
        <span className="rounded bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">{chipRows ?? 1}줄</span>
        <span className="text-[10px] text-slate-400">· 코너 유형에서 정의</span>
      </div>

      {/* 거버넌스 안내 — 정의는 코너 유형, 빌더는 순서만 */}
      <p className="flex items-start gap-1.5 rounded-md bg-white/70 px-2 py-1.5 text-[10px] leading-relaxed text-muted-foreground">
        <Lock className="mt-[1px] h-3 w-3 shrink-0 text-slate-400" />
        <span>탭·메뉴의 <b className="text-slate-600">라벨·이동 링크·줄 수·아이콘</b>은 <b className="text-slate-600">코너 유형</b>에서 정의합니다. 빌더에선 <b className="text-emerald-700">순서만</b> 바꿀 수 있어요.</span>
      </p>
    </div>
  );
}

// 이미지/이동 URL을 "불러오기"로 선택하는 필드 (직접 타이핑 대신 라이브러리 모달)
function ImagePickField({
  value,
  alt,
  images,
  onPick,
  onClear,
  invalid,
}: {
  value: string | null;
  alt: string | null;
  images: LibraryData['images'];
  onPick: (v: { url: string; alt?: string | null }) => void;
  onClear: () => void;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className={cn('flex items-center gap-1.5 rounded-md border bg-white p-1', invalid && 'border-destructive')}>
        {value ? (
          isRenderableIconUrl(value) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={alt ?? ''} className="h-8 w-10 shrink-0 rounded object-cover" />
          ) : (
            <span className="flex h-8 w-10 shrink-0 items-center justify-center rounded bg-gradient-to-br from-indigo-100 to-slate-200 text-[8px] text-slate-500">
              {value.split('/').pop()?.slice(0, 8)}
            </span>
          )
        ) : (
          <span className="flex h-8 w-10 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-300">
            <ImageIcon className="h-4 w-4" />
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">{value ? value.split('/').pop() : '이미지 미지정'}</span>
        <button type="button" onClick={() => setOpen(true)} className="shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium hover:bg-secondary">
          불러오기
        </button>
        {value && (
          <button type="button" onClick={onClear} className="shrink-0 text-muted-foreground hover:text-destructive" title="이미지 해제">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <AssetPickerModal
        open={open}
        kind="image"
        images={images}
        links={[]}
        onClose={() => setOpen(false)}
        onSelect={onPick}
      />
    </>
  );
}

function LinkPickField({
  value,
  links,
  onPick,
  onClear,
}: {
  value: string | null;
  links: LibraryData['links'];
  onPick: (v: { url: string }) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const label = value ? links.find((l) => l.url === value)?.label : null;
  return (
    <>
      <div className="flex items-center gap-1.5 rounded-md border bg-white p-1">
        <Link2 className="ml-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-[11px]">
          {value ? (
            <>
              {label && <b className="font-medium text-foreground">{label} </b>}
              <span className="text-muted-foreground">{value}</span>
            </>
          ) : (
            <span className="text-muted-foreground">이동 URL 미지정</span>
          )}
        </span>
        <button type="button" onClick={() => setOpen(true)} className="shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium hover:bg-secondary">
          불러오기
        </button>
        {value && (
          <button type="button" onClick={onClear} className="shrink-0 text-muted-foreground hover:text-destructive" title="링크 해제">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <AssetPickerModal
        open={open}
        kind="link"
        images={[]}
        links={links}
        onClose={() => setOpen(false)}
        onSelect={(v) => onPick({ url: v.url })}
      />
    </>
  );
}

// 아이콘 원자(ICON) 선택 필드 — 아이콘 라이브러리(IconPickerModal)에서 글리프 선택. 값은 `icon:<key>` ref로 imageUrl에 저장.
//  (이미지 원자는 ImagePickField로 이미지 파일을 고른다 — 둘은 상단 아이콘/이미지 토글로 전환)
function IconPickField({
  value,
  alt,
  onPick,
  onClear,
  invalid,
}: {
  value: string | null;
  alt: string | null;
  onPick: (v: { ref: string; alt: string }) => void;
  onClear: () => void;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className={cn('flex items-center gap-1.5 rounded-md border bg-white p-1', invalid && 'border-destructive')}>
        <span className="flex h-8 w-10 shrink-0 items-center justify-center rounded bg-slate-50">
          {value ? (
            isIconRef(value) ? (
              <IconGlyph name={value} className="h-4 w-4 text-slate-700" />
            ) : isRenderableIconUrl(value) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt={alt ?? ''} className="h-8 w-10 rounded object-cover" />
            ) : (
              <span className="text-[8px] text-slate-500">{value.split('/').pop()?.slice(0, 8)}</span>
            )
          ) : (
            <ImageIcon className="h-4 w-4 text-slate-300" />
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
          {value ? (isIconRef(value) ? alt || value.replace(/^icon:/, '') : value.split('/').pop()) : '아이콘 미지정'}
        </span>
        <button type="button" onClick={() => setOpen(true)} className="shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium hover:bg-secondary">
          불러오기
        </button>
        {value && (
          <button type="button" onClick={onClear} className="shrink-0 text-muted-foreground hover:text-destructive" title="아이콘 해제">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <IconPickerModal open={open} onClose={() => setOpen(false)} onSelect={(def) => onPick({ ref: `icon:${def.key}`, alt: def.label })} />
    </>
  );
}

// ── 한 Atom 인라인 편집 행 (라벨 + 인풋) ───────────────
// 제어형: 값 변경을 즉시 부모(AtomManager)로 올려 미리보기에 반영. 저장은 상단 '완료'에서 일괄 처리.
// 이미지/이동 URL은 직접 타이핑 대신 라이브러리에서 "불러오기"로 선택한다.
// 문구 불러오기 — 문구 원장(문구 관리)에서 같은 용도(use)의 문구를 골라 아톰에 채운다. 빌더는 생성 안 함.
function MessagePickerModal({
  use,
  messages,
  onPick,
  onClose,
}: {
  use: string;
  messages: LibraryData['messages'];
  onPick: (text: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [scope, setScope] = useState<'use' | 'all'>('use');
  const kw = q.trim().toLowerCase();
  const list = messages.filter((m) => (scope === 'all' || m.use === use) && (!kw || m.text.toLowerCase().includes(kw)));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[70vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">문구 불러오기</p>
            <p className="text-[11px] text-muted-foreground">문구 관리 원장에서 선택 · 용도: {use}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex items-center gap-2 border-b px-4 py-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="문구 검색" className="h-8 pl-7 text-xs" autoFocus />
          </div>
          <button type="button" onClick={() => setScope(scope === 'use' ? 'all' : 'use')}
            className={cn('shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium', scope === 'use' ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-muted-foreground')}>
            {scope === 'use' ? `${use}만` : '전체 용도'}
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {list.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">문구 없음 · 문구 관리에서 먼저 등록하세요</p>
          ) : list.map((m, i) => (
            <button key={i} type="button" onClick={() => onPick(m.text)}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-slate-800 hover:bg-indigo-50">
              <span className="min-w-0 flex-1 truncate">{m.text}</span>
              {scope === 'all' && <span className="shrink-0 rounded bg-slate-100 px-1 py-px text-[9px] font-medium text-slate-500">{m.use}</span>}
            </button>
          ))}
        </div>
        <div className="border-t px-4 py-2 text-right">
          <a href="/admin/messages" className="text-[11px] font-medium text-indigo-600 hover:underline">＋ 문구 관리에서 새 문구 만들기 ↗</a>
        </div>
      </div>
    </div>
  );
}

// ── 어드민이 '편집할 수 없는(가져오는)' 콘텐츠인지 판정 ────────────────────
//  어제 논의(2026-09-09) 반영 — '누가 채우냐'의 축. 어드민은 실제로 정하는 것만 편집한다.
//   · 상품형 컴포넌트(상품·영화 등): 상품 정보가 BSS·API 원장에 이미 있어 하나하나 편집이 아니라 '가져오기'만.
//   · 코너 수급이 CVM 기반: 콘텐츠가 런타임에 고객별로 채워짐 → 어드민 편집 불가.
//  잠그는 필드 = 문구(content)·이미지(image). 링크·표시토글·개수·배치는 운영자 몫이라 그대로 편집.
//  선택형(카테고리 탭 등 구조)은 운영자 편성이라 잠그지 않는다.
function atomSourceLock(
  atomType: string,
  componentType: string,
  recSource: string | null,
): { tag: string; label: string } | null {
  if (componentType === '선택형') return null;
  const f = ATOM_TYPE_FIELDS[atomType as AtomType] ?? {};
  if (!f.content && !f.image) return null; // 링크/버튼 등 순수 편집 항목은 대상 아님
  if (componentType === '상품형') return { tag: 'API', label: '상품 정보 · 자동' };
  if (recSource != null && normalizeRecSource(recSource) === 'CVM 기반') return { tag: 'CVM', label: '개인화 · 고객별 자동' };
  return null;
}

// 잠긴(가져오는) 콘텐츠 표시 — 입력이 아니라 '자동 연동 값'임을 컴팩트한 읽기 전용 한 줄로.
//  form처럼 보이지 않게 최소화(자물쇠 + 값). 카드 상단 요약(AutoSourceSummary)이 맥락을 설명하므로 여기선 값만.
function LockedSource({ lock, sample, kind }: { lock: { tag: string; label: string }; sample?: string | null; kind: 'content' | 'image' }) {
  return (
    <div className="flex items-center gap-1.5 px-0.5 py-0.5 text-[11px] text-slate-500">
      <Lock className="h-2.5 w-2.5 shrink-0 text-slate-400" />
      <span className="truncate">{kind === 'image' ? '이미지 자동 연동' : sample ? sample : '실서비스에서 자동'}</span>
      <span className="ml-auto shrink-0 rounded bg-slate-100 px-1 text-[9px] font-semibold text-slate-400">{lock.tag} 자동</span>
    </div>
  );
}

function AtomRow({
  templateId,
  atom,
  images,
  links,
  messages,
  sourceLock,
  onChange,
}: {
  templateId: string;
  atom: AtomNode;
  images: LibraryData['images'];
  links: LibraryData['links'];
  messages: LibraryData['messages'];
  sourceLock?: { tag: string; label: string } | null;
  onChange: (patch: Partial<AtomNode>) => void;
}) {
  const f = ATOM_TYPE_FIELDS[atom.atomType as AtomType] ?? { content: true, image: false, link: false };
  const msgUse = ATOM_TYPE_LABELS[atom.atomType as AtomType] ?? '텍스트';
  const [pickOpen, setPickOpen] = useState(false);
  const altMissing = (atom.atomType === 'IMAGE' || atom.atomType === 'ICON') && !atom.altText;
  // 이미지는 카드의 핵심 시각요소 → 개별 표시/숨김 토글을 두지 않는다(항상 노출).
  const noToggle = atom.atomType === 'IMAGE';
  const shown = noToggle ? true : atom.visible !== false;
  // 아이콘/이미지형 정보 카드: 시각 원자를 '아이콘' 또는 '이미지'로 등록 선택 (atomType 전환).
  const isVisualAtom = atom.atomType === 'ICON' || atom.atomType === 'IMAGE';
  // 라벨(유형) + 표시/숨김 토글. 숨김은 삭제가 아니라 미리보기·FO에서 제외(데이터 보존). 저장은 상단 '완료' 일괄.
  return (
    <div className={cn('space-y-1 rounded-md bg-white p-2.5', !shown && 'opacity-55')}>
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          {ATOM_TYPE_LABELS[atom.atomType as AtomType] ?? atom.atomType}{!shown && <span className="ml-1.5 rounded bg-slate-100 px-1 py-px text-[9px] font-semibold text-slate-400 ring-1 ring-inset ring-slate-200">숨김</span>}
          {isVisualAtom && !sourceLock && (
            <span className="inline-flex overflow-hidden rounded border">
              {(['ICON', 'IMAGE'] as const).map((tp) => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => onChange({ atomType: tp })}
                  className={cn('px-1.5 py-0.5 text-[10px] font-semibold transition-colors', atom.atomType === tp ? 'bg-primary text-primary-foreground' : 'bg-white text-muted-foreground hover:bg-secondary')}
                  title={tp === 'ICON' ? '아이콘으로 등록' : '이미지로 등록'}
                >
                  {tp === 'ICON' ? '아이콘' : '이미지'}
                </button>
              ))}
            </span>
          )}
        </label>
        {!noToggle && (
          <button
            type="button"
            role="switch"
            aria-checked={shown}
            onClick={() => onChange({ visible: !shown })}
            title={shown ? '표시 중 — 클릭 시 숨김 (삭제 아님)' : '숨김 — 클릭 시 표시'}
            className={cn('relative inline-flex h-4 w-8 shrink-0 items-center rounded-full transition-colors', shown ? 'bg-primary' : 'bg-slate-300')}
          >
            <span className={cn('inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform', shown ? 'translate-x-4' : 'translate-x-0.5')} />
          </button>
        )}
      </div>
      {f.content &&
        (sourceLock ? (
          <LockedSource lock={sourceLock} sample={atom.content} kind="content" />
        ) : isCvmBinding(atom.content) ? (
          // 고객정보 연동 중 — 직접 입력 대신 출처 표시(FN-EVTMSN-FORM-001 자동 입력 출처 표시)
          <div className="flex items-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-2 py-1.5">
            <span className="inline-flex items-center gap-1 rounded border border-sky-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-sky-700">
              <span className="rounded bg-sky-600 px-1 text-[9px] font-bold text-white">BSS</span>{cvmBindingLabel(atom.content)}
            </span>
            <span className="flex-1 truncate text-[11px] text-slate-500">회원별 자동 입력 · 예: {resolveCvmSample(atom.content)}</span>
            <button type="button" onClick={() => onChange({ content: '' })} title="BSS 연동 지우고 직접 입력으로 전환"
              className="inline-flex shrink-0 items-center gap-0.5 rounded-md border bg-white px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
              <X className="h-3 w-3" /> 지우기
            </button>
          </div>
        ) : (
          // 빌더는 문구를 '불러오기'만 한다(생성·편집은 문구 관리). 직접 타이핑 대신 원장에서 선택.
          <div className="flex items-stretch gap-1">
            <div className={cn('flex h-8 min-w-0 flex-1 items-center rounded-md border px-2.5 text-xs', atom.content ? 'border-slate-200 bg-slate-50 text-slate-800' : 'border-dashed border-slate-300 bg-white text-slate-400')}>
              <span className="truncate">{atom.content || '문구 미선택 — 불러오기'}</span>
            </div>
            <button type="button" onClick={() => setPickOpen(true)}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100">
              <Download className="h-3 w-3" /> 불러오기
            </button>
            {atom.content && (
              <button type="button" onClick={() => onChange({ content: '' })} title="선택 해제"
                className="flex w-6 shrink-0 items-center justify-center rounded-md border text-muted-foreground hover:bg-secondary">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      {/* 문구 베리에이션 — 타겟별 후보를 빌더에서 직접 편집. 기본(=위 문구)은 그대로, 여기 후보는 실서비스에서 CVM이 세그/인텐트로 택1. 미리보기는 폴백이라 기본만 노출. 회의 2026-08-31. */}
      {f.content && !sourceLock && !isCvmBinding(atom.content) && (() => {
        const vars = atom.contentVariants ?? [];
        const setVars = (next: { text: string; target?: string; enabled?: boolean }[]) => onChange({ contentVariants: next });
        const patchVar = (i: number, p: Partial<{ text: string; target?: string; enabled?: boolean }>) =>
          setVars(vars.map((v, idx) => (idx === i ? { ...v, ...p } : v)));
        return (
          <div className="space-y-1.5 rounded-md border border-dashed border-violet-200 bg-violet-50/40 px-2 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold text-violet-700">문구 베리에이션 <span className="font-normal text-violet-400">· 타겟별 · 실서비스 CVM 택1 · 기본=위 문구</span></span>
              <button
                type="button"
                onClick={() => setVars([...vars, { text: '', target: '', enabled: true }])}
                className="inline-flex shrink-0 items-center gap-0.5 rounded border border-violet-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-violet-700 hover:bg-violet-100"
              >
                <Plus className="h-3 w-3" /> 문구
              </button>
            </div>
            {vars.length === 0 ? (
              <p className="text-[10px] text-violet-400">타겟별 대체 문구가 없습니다 — <span className="font-medium text-violet-500">＋문구</span>로 추가하면 실서비스에서 세그먼트별로 노출됩니다.</p>
            ) : (
              vars.map((v, i) => {
                const on = v.enabled !== false;
                return (
                  <div key={i} className={cn('flex items-center gap-1', !on && 'opacity-55')}>
                    <input
                      value={v.text}
                      onChange={(e) => patchVar(i, { text: e.target.value })}
                      placeholder="대체 문구"
                      className="h-7 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] text-slate-800 focus:border-violet-400 focus:outline-none"
                    />
                    <input
                      value={v.target ?? ''}
                      onChange={(e) => patchVar(i, { target: e.target.value })}
                      placeholder="타겟"
                      title="노출 타겟 힌트 (예: VIP, 신규, 20대) — CVM 세그먼트 매칭용"
                      className="h-7 w-20 shrink-0 rounded-md border border-slate-200 bg-white px-1.5 text-[10px] text-violet-700 focus:border-violet-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => patchVar(i, { enabled: !on })}
                      title={on ? '노출 중 — 클릭 시 후보에서 제외' : '제외됨 — 클릭 시 후보 포함'}
                      className={cn('h-7 shrink-0 rounded px-1.5 text-[9px] font-semibold ring-1 ring-inset', on ? 'bg-emerald-50 text-emerald-600 ring-emerald-200' : 'bg-slate-100 text-slate-400 ring-slate-200')}
                    >
                      {on ? '노출' : '제외'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setVars(vars.filter((_, idx) => idx !== i))}
                      title="문구 삭제"
                      className="flex h-7 w-6 shrink-0 items-center justify-center rounded-md border text-muted-foreground hover:bg-secondary"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        );
      })()}
      {pickOpen && (
        <MessagePickerModal
          use={msgUse}
          messages={messages}
          onPick={(text) => { onChange({ content: text }); setPickOpen(false); }}
          onClose={() => setPickOpen(false)}
        />
      )}
      {f.image &&
        (sourceLock ? (
          <LockedSource lock={sourceLock} sample={atom.imageUrl} kind="image" />
        ) : atom.atomType === 'ICON' ? (
          // 아이콘 원자 = 아이콘 라이브러리에서 글리프 선택(이미지 파일 아님)
          <IconPickField
            value={atom.imageUrl}
            alt={atom.altText}
            invalid={altMissing}
            onPick={(v) => onChange({ imageUrl: v.ref, altText: v.alt })}
            onClear={() => onChange({ imageUrl: '' })}
          />
        ) : (
          <ImagePickField
            value={atom.imageUrl}
            alt={atom.altText}
            images={images}
            invalid={altMissing}
            onPick={(v) => onChange({ imageUrl: v.url, altText: v.alt ?? atom.altText })}
            onClear={() => onChange({ imageUrl: '' })}
          />
        ))}
      {f.link && (
        <div className="space-y-0.5">
          <span className="text-[10px] text-muted-foreground">이동 URL</span>
          <Input
            value={atom.linkUrl ?? ''}
            onChange={(e) => onChange({ linkUrl: e.target.value })}
            placeholder="이동 URL 입력 (예: /movie)"
            className="h-8 text-xs"
          />
        </div>
      )}
    </div>
  );
}

// ── Atom 추가 폼 (유형 선택 → 관련 입력 표시) ───────────────
function AtomAddForm({
  templateId,
  componentId,
  available,
  library,
}: {
  templateId: string;
  componentId: string;
  available: LibraryData['atoms'];
  library: LibraryData;
}) {
  const [t, setT] = useState<AtomType>('TEXT');
  const f = ATOM_TYPE_FIELDS[t];
  const [imageUrl, setImageUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  return (
    <div className="space-y-2 rounded-md border border-dashed p-2">
      <p className="text-[11px] font-medium text-primary">＋ Atom 추가</p>
      {available.length > 0 && (
        <form action={addExistingAtom.bind(null, templateId, componentId)} className="flex gap-1">
          <Select name="atomId" className="h-7 flex-1 text-xs">
            {available.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({ATOM_TYPE_LABELS[a.atomType as AtomType] ?? a.atomType})
              </option>
            ))}
          </Select>
          <input type="hidden" name="isRequired" value="true" />
          <Button type="submit" size="sm" variant="secondary">
            끌어오기
          </Button>
        </form>
      )}
      <form action={createAtom.bind(null, templateId, componentId)} className="space-y-1">
        <div className="flex gap-1">
          <Input name="name" placeholder="새 Atom 이름" className="h-7 flex-1 text-xs" required />
          <Select name="atomType" value={t} onChange={(e) => setT(e.target.value as AtomType)} className="h-7 w-24 text-xs">
            {ATOM_TYPES.map((x) => (
              <option key={x} value={x}>
                {ATOM_TYPE_LABELS[x]}
              </option>
            ))}
          </Select>
        </div>
        {f.content && <Input name="content" placeholder="문구 / 가격 / 설명" className="h-7 text-xs" />}
        {f.image && (
          <>
            <input type="hidden" name="imageUrl" value={imageUrl} />
            <ImagePickField
              value={imageUrl || null}
              alt={altText || null}
              images={library.images}
              onPick={(v) => {
                setImageUrl(v.url);
                if (v.alt) setAltText(v.alt);
              }}
              onClear={() => setImageUrl('')}
            />
            <Input name="altText" value={altText} onChange={(e) => setAltText(e.target.value)} placeholder="대체텍스트" className="h-7 text-xs" />
          </>
        )}
        {f.link && (
          <>
            <input type="hidden" name="linkUrl" value={linkUrl} />
            <LinkPickField value={linkUrl || null} links={library.links} onPick={(v) => setLinkUrl(v.url)} onClear={() => setLinkUrl('')} />
          </>
        )}
        <Button type="submit" size="sm" className="w-fit">
          새로 만들어 추가
        </Button>
      </form>
    </div>
  );
}

// ── Atom 관리 (Component 내부) — 수정 + 추가가 함께 ──────────
function AtomManager({
  templateId,
  component,
  library,
  recSource,
  onAtomsChange,
}: {
  templateId: string;
  component: ComponentNode;
  library: LibraryData;
  recSource: string | null; // 코너 수급 방식 — CVM 기반이면 콘텐츠 잠금
  onAtomsChange?: (atoms: AtomNode[]) => void; // 상위(ComponentCard)가 '완료'에서 일괄 저장하도록 동기화
}) {
  // 편집 중인 Atom 값을 로컬 draft로 들고, 즉시 미리보기에 반영한다.
  const pushAtoms = useContext(AtomsPreviewContext);
  const [atoms, setAtoms] = useState<AtomNode[]>(component.atoms);
  const editAtom = (componentAtomId: string, patch: Partial<AtomNode>) => {
    // 이벤트 핸들러에서 다음 값을 직접 계산 → 부모(pushAtoms)와 로컬 상태를 각각 갱신
    // (setAtoms 업데이터 안에서 부모 setState를 호출하면 "렌더 중 setState" 경고가 발생)
    const next = atoms.map((a) => (a.componentAtomId === componentAtomId ? { ...a, ...patch } : a));
    setAtoms(next);
    pushAtoms(component.cornerComponentId, next);
    onAtomsChange?.(next);
  };

  // 마운트 시 즉시 반영, 언마운트 시 정리. pushAtoms는 매 렌더 새 참조라 deps에서 제외(칩 방식과 동일).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    pushAtoms(component.cornerComponentId, atoms);
    onAtomsChange?.(atoms);
    return () => pushAtoms(component.cornerComponentId, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [component.cornerComponentId]);

  // API 자동 연동(상품형) 여부 — 이미지·문구·가격은 상품 원장에서 자동. 카드 상단에 요약을 한 번만 노출.
  const apiSourced = component.componentType === '상품형' && atoms.some((a) => atomSourceLock(a.atomType, component.componentType, recSource)?.tag === 'API');
  return (
    <div className="mt-1 space-y-2 rounded-md bg-muted/40 p-2">
      {apiSourced && (
        <div className="rounded-md border border-sky-200 bg-sky-50/70 px-2.5 py-2 text-[11px] leading-relaxed">
          <p className="flex items-center gap-1.5 font-semibold text-sky-800">
            <Lock className="h-3 w-3" /> 상품 자동 연동 <span className="rounded bg-sky-600 px-1 text-[9px] font-bold text-white">API</span>
          </p>
          <p className="mt-0.5 text-slate-500">이미지·문구·가격은 <b className="text-slate-600">상품 원장(API)</b>에서 자동 채워집니다. 바꾸려면 <b className="text-slate-600">‘상품 불러오기’</b>로 다른 상품을 선택하세요.</p>
          <p className="mt-1 text-emerald-700">편집 가능(무중단): <b>이동 링크 · 노출 on/off · 순서</b></p>
        </div>
      )}
      {atoms.length === 0 && <p className="text-[11px] text-muted-foreground">Atom 없음 — 아래에서 추가하세요</p>}
      {atoms.map((a) => (
        <AtomRow
          key={a.componentAtomId}
          templateId={templateId}
          atom={a}
          images={library.images}
          links={library.links}
          messages={library.messages}
          sourceLock={atomSourceLock(a.atomType, component.componentType, recSource)}
          onChange={(patch) => editAtom(a.componentAtomId, patch)}
        />
      ))}
    </div>
  );
}

// ── 읽기 전용 뷰 (디폴트) ──────────────────────────────────
function ReadOnlyAtoms({ component }: { component: ComponentNode }) {
  if (component.atoms.length === 0) return <p className="text-[11px] text-muted-foreground">구성 요소 없음</p>;
  if (component.componentType === '선택형') {
    // 뷰는 칩이 아니라 항목마다 줄바꿈된 텍스트 리스트로
    return (
      <div className="space-y-0.5">
        {component.atoms.map((a) => (
          <p key={a.componentAtomId} className="text-xs text-muted-foreground">
            {a.content ?? a.name}
          </p>
        ))}
      </div>
    );
  }
  // API 자동 연동(상품형) — 아톰을 하나하나 나열하지 않고, 실제 보일 모습(아이콘+텍스트+설명)만 한 줄로.
  //  소재·문구는 상품 원장(API)에서 자동이라 개별 편집 대상이 아님 → 읽기 전용 미리보기 + 단일 'API 자동' 배지(2026-10-01 사용자 요청).
  if (component.componentType === '상품형') {
    // 제목(=컴포넌트명)은 카드 헤더에 이미 있으니 반복하지 않고, 썸네일 + 보조 정보(평점·브랜드 등)만.
    const iconA = component.atoms.find((a) => a.atomType === 'ICON' || a.atomType === 'IMAGE');
    const descA = component.atoms.find((a) => a.atomType === 'INFO' || a.atomType === 'PRICE');
    const iconUrl = iconA?.imageUrl ?? '';
    const renderableIcon = !!iconUrl && (iconUrl.startsWith('/assets/') || iconUrl.startsWith('http') || iconUrl.startsWith('data:'));
    return (
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
          {renderableIcon
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={iconUrl} alt="" className="h-full w-full object-cover" />
            : <ImageIcon className="h-4 w-4 text-slate-300" />}
        </div>
        <p className="min-w-0 flex-1 truncate text-[11px] text-slate-400">{descA?.content || '소재·문구·가격은 상품 정보 API에서 자동'}</p>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      {component.atoms.map((a) => {
        const binding = cvmBindingLabel(a.content); // CVM 연동이면 라벨(예: 멤버십 번호)
        const isBarcode = a.atomType === 'BARCODE';
        const lock = atomSourceLock(a.atomType, component.componentType, null); // 상품형 등 API 자동 콘텐츠
        const val = a.content || a.imageUrl || a.altText;
        return (
          <div key={a.componentAtomId} className="flex items-center gap-1.5 text-xs">
            <Badge variant="outline">{ATOM_TYPE_LABELS[a.atomType as AtomType] ?? a.atomType}</Badge>
            {binding ? (
              <span className="flex flex-1 items-center gap-1 truncate">
                <span className="inline-flex shrink-0 items-center gap-1 rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700"><span className="rounded bg-sky-600 px-1 text-[9px] font-bold text-white">BSS</span>{binding}</span>
                <span className="truncate text-muted-foreground/60">{resolveCvmSample(a.content)}</span>
              </span>
            ) : lock ? (
              <span className="flex flex-1 items-center gap-1 truncate">
                <span className="inline-flex shrink-0 items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"><span className="rounded bg-amber-600 px-1 text-[9px] font-bold text-white">{lock.tag}</span>{lock.label}</span>
                {val && <span className="truncate text-muted-foreground/60">예: {val}</span>}
              </span>
            ) : isBarcode ? (
              <span className="flex flex-1 items-center gap-1 truncate">
                <span className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">동적 · 회원별 발급</span>
                <span className="truncate text-muted-foreground/60">유효 {a.content || '20'}분</span>
              </span>
            ) : val ? (
              <span className="flex-1 truncate text-muted-foreground">{val}</span>
            ) : (
              <span className="flex-1 truncate italic text-muted-foreground/50">미입력</span>
            )}
            {a.linkUrl && <Link2 className="h-3 w-3 shrink-0 text-muted-foreground" />}
          </div>
        );
      })}
    </div>
  );
}

// ── Component 카드 (디폴트=뷰, 수정 버튼 → 편집) ────────────
function ComponentCard({
  templateId,
  corner,
  cc,
  i,
  count,
  library,
}: {
  templateId: string;
  corner: CornerNode;
  cc: ComponentNode;
  i: number;
  count: number;
  library: LibraryData;
}) {
  const [edit, setEdit] = useState(false);
  const isChip = cc.componentType === '선택형';
  const pushPreview = useContext(ChipPreviewContext);
  const [draft, setDraft] = useState<ChipDraft>(() => initChipDraft(cc));
  const atomsRef = useRef<AtomNode[]>(cc.atoms); // 비-칩 Atom 편집 값 — '완료'에서 일괄 저장
  const [saving, startSave] = useTransition();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cc.cornerComponentId });
  const dragStyle = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  // 편집 중 미리보기 정리 (언마운트 시에만). pushPreview는 매 렌더 새 참조라 deps에 넣으면
  // 매 렌더 cleanup이 실행돼 방금 올린 draft가 즉시 지워진다(=실시간 반영 깨짐). 그래서 제외.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => pushPreview(cc.cornerComponentId, null), [cc.cornerComponentId]);

  const openEdit = () => {
    if (isChip) {
      const d = initChipDraft(cc);
      setDraft(d);
      pushPreview(cc.cornerComponentId, d); // 즉시 미리보기 반영 시작
    }
    setEdit(true);
  };
  const updateDraft = (next: ChipDraft) => {
    setDraft(next);
    pushPreview(cc.cornerComponentId, next); // 타이핑/순서변경 즉시 반영
  };
  const finishEdit = () => {
    if (isChip) {
      startSave(async () => {
        await saveChips(templateId, cc.id, draft);
        pushPreview(cc.cornerComponentId, null);
        setEdit(false);
      });
    } else {
      // 비-칩: Atom들을 일괄 저장 (개별 저장 버튼 없이 '완료'로 처리)
      startSave(async () => {
        await saveAtoms(
          templateId,
          atomsRef.current.map((a) => ({ atomId: a.id, componentAtomId: a.componentAtomId, visible: a.visible !== false, atomType: a.atomType, content: a.content, contentVariants: a.contentVariants && a.contentVariants.length ? JSON.stringify(a.contentVariants) : null, imageUrl: a.imageUrl, altText: a.altText, linkUrl: a.linkUrl })),
        );
        setEdit(false);
      });
    }
  };
  // 취소: 저장하지 않고 편집 종료. 미리보기 초안은 정리(칩) / 언마운트 시 원복(비-칩).
  const cancelEdit = () => {
    pushPreview(cc.cornerComponentId, null);
    setEdit(false);
  };

  return (
    <div ref={setNodeRef} style={dragStyle} className={cn('rounded-md border bg-card p-2', edit && 'ring-1 ring-primary/40')}>
      <div className="flex items-center gap-1.5">
        <button
          className="cursor-grab text-muted-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label="순서 변경 (드래그)"
          title="드래그하여 순서 변경"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="w-4 text-center text-[11px] text-muted-foreground">{i + 1}</span>
        {edit ? (
          <form action={renameComponent.bind(null, templateId, cc.id)} className="flex-1">
            <input
              name="name"
              defaultValue={cc.name}
              onBlur={(e) => e.currentTarget.form?.requestSubmit()}
              className="w-full rounded-md border bg-white px-2 py-1 text-sm outline-none focus:border-primary"
              aria-label="컴포넌트 이름"
            />
          </form>
        ) : (
          <span className="flex-1 truncate text-sm">{cc.name}</span>
        )}
        <DeleteConfirmForm
          action={removeComponent.bind(null, templateId, cc.cornerComponentId)}
          itemLabel="컴포넌트"
          childSummary={cc.atoms.length ? `Atom ${cc.atoms.length}개` : undefined}
          ariaLabel="Component 제거"
        />
        {edit ? (
          <div className="ml-0.5 flex items-center gap-1">
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[11px] font-medium hover:bg-secondary"
            >
              <X className="h-3 w-3" /> 취소
            </button>
            <button
              type="button"
              onClick={finishEdit}
              disabled={saving}
              className="inline-flex items-center gap-0.5 rounded-md border bg-primary px-1.5 py-0.5 text-[11px] font-medium text-primary-foreground"
            >
              <Check className="h-3 w-3" /> {saving ? '저장 중…' : '완료'}
            </button>
          </div>
        ) : cc.componentType === '상품형' ? (
          // API 자동 연동 콘텐츠 — 아이콘·텍스트·설명은 개별 수정 대상 아님. 내용 변경은 '상품 불러오기'로 한 번에.
          <span className="ml-0.5 inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400" title="아이콘·텍스트·설명은 상품 정보 API에서 자동 — 내용 변경은 아래 '상품 불러오기'로 교체하세요.">
            <Lock className="h-3 w-3" /> API 자동
          </span>
        ) : (
          <button
            type="button"
            onClick={openEdit}
            className="ml-0.5 inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[11px] font-medium hover:bg-secondary"
          >
            <Pencil className="h-3 w-3" /> 수정
          </button>
        )}
      </div>

      {edit ? (
        isChip ? (
          <ChipEditor draft={draft} onChange={updateDraft} />
        ) : (
          <AtomManager
            key={cc.atoms.map((a) => a.componentAtomId).join(',')}
            templateId={templateId}
            component={cc}
            library={library}
            recSource={corner.recSource}
            onAtomsChange={(atoms) => {
              atomsRef.current = atoms;
            }}
          />
        )
      ) : (
        <div className="mt-1.5 rounded-md bg-muted/30 p-2">
          <ReadOnlyAtoms component={cc} />
        </div>
      )}
    </div>
  );
}

// BSS 상품(혜택 브랜드) 불러오기 모달 — 카탈로그에서 브랜드를 골라 로고+이름+대표혜택을 코너에 추가.
//  카테고리(EAT/BUY/PLAY) + 세부 카테고리 필터. 클릭 시 addBssProduct로 컴포넌트 삽입.
const BSS_BADGE_TONE: Record<string, string> = {
  할인: 'bg-sky-100 text-sky-700',
  적립: 'bg-rose-100 text-rose-600',
  사용: 'bg-blue-100 text-blue-700',
  'VIP PICK': 'bg-violet-600 text-white',
};
function BssProductPickerModal({ open, onClose, onPick, pending }: { open: boolean; onClose: () => void; onPick: (key: string) => void; pending: boolean }) {
  const [cat, setCat] = useState<'ALL' | BssCategory>('ALL');
  const [sub, setSub] = useState<string>('전체');
  if (!open) return null;
  const cats: ('ALL' | BssCategory)[] = ['ALL', 'EAT', 'BUY', 'PLAY'];
  const subs = cat === 'ALL' ? [] : ['전체', ...BSS_SUBCATEGORIES[cat]];
  const list = BSS_PRODUCTS.filter((p) => (cat === 'ALL' || p.category === cat) && (cat === 'ALL' || sub === '전체' || p.sub === sub));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      {/* 고정 높이(h-[80vh]) — 카테고리 전환 시에도 모달 크기 불변, 리스트만 내부 스크롤 */}
      <div className="flex h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b px-5 py-3">
          <h2 className="text-sm font-semibold">상품 불러오기</h2>
          <span className="text-xs text-muted-foreground">혜택 브랜드에서 로고·이름·대표 혜택을 코너에 추가</span>
          <button type="button" onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        {/* 카테고리 탭 */}
        <div className="flex items-center gap-1 border-b px-4 py-2">
          {cats.map((c) => (
            <button key={c} type="button" onClick={() => { setCat(c); setSub('전체'); }}
              className={cn('rounded-full px-3 py-1 text-xs font-semibold transition', cat === c ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary')}>
              {c === 'ALL' ? '전체' : BSS_CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
        {/* 세부 카테고리 — 행 높이 고정(ALL도 안내문으로 자리 유지)해서 리스트 시작 위치가 흔들리지 않게 */}
        <div className="flex min-h-[37px] flex-wrap items-center gap-1 border-b bg-muted/30 px-4 py-2">
          {cat === 'ALL' ? (
            <span className="text-[11px] text-muted-foreground">카테고리를 선택하면 세부 분류로 필터할 수 있어요</span>
          ) : (
            subs.map((s) => (
              <button key={s} type="button" onClick={() => setSub(s)}
                className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition', sub === s ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary')}>
                {s}
              </button>
            ))
          )}
        </div>
        {/* 브랜드 리스트 — 남은 공간을 채우고 내부 스크롤(min-h-0), 항목이 적어도 위 정렬(content-start) */}
        <div className="grid min-h-0 flex-1 content-start grid-cols-1 gap-2 overflow-y-auto p-4 sm:grid-cols-2">
          {list.map((p) => (
            <button key={p.key} type="button" disabled={pending} onClick={() => onPick(p.key)}
              className="flex items-center gap-3 rounded-xl border bg-white p-3 text-left transition hover:border-primary hover:bg-primary/5 disabled:opacity-50">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-50 ring-1 ring-slate-200">
                {isIconRef(p.logo) ? <IconGlyph name={p.logo} className="h-5 w-5 text-slate-700" /> : isRenderableIconUrl(p.logo) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.logo} alt={p.name} className="h-11 w-11 rounded-full object-cover" />
                ) : <span className="text-[10px] text-slate-400">로고</span>}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-medium text-muted-foreground">{p.sub}</span>
                <span className="block truncate text-sm font-bold text-slate-900">{p.name}</span>
                <span className="mt-0.5 flex flex-wrap gap-1">
                  {p.badges.map((b) => <span key={b} className={cn('rounded px-1 py-px text-[9px] font-bold', BSS_BADGE_TONE[b] ?? 'bg-slate-100 text-slate-600')}>{b}</span>)}
                </span>
                <span className="mt-1 block truncate text-[11px] text-slate-500">{p.benefit}</span>
              </span>
            </button>
          ))}
          {list.length === 0 && <p className="col-span-full py-10 text-center text-xs text-muted-foreground">해당 카테고리에 브랜드가 없습니다.</p>}
        </div>
      </div>
    </div>
  );
}

// ── Component 목록 (Corner 내부) ───────────────────────────
function ComponentList({
  templateId,
  corner,
  library,
}: {
  templateId: string;
  corner: CornerNode;
  library: LibraryData;
}) {
  const overLimit = corner.maxItems != null && corner.components.length > corner.maxItems;
  const [bssOpen, setBssOpen] = useState(false); // BSS 상품 불러오기 모달
  const [bssPending, startBss] = useTransition();

  // 좌측 코너 리스트와 동일한 드래그앤드롭 재정렬
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const [ids, setIds] = useState(corner.components.map((c) => c.cornerComponentId));
  if (ids.length !== corner.components.length) setIds(corner.components.map((c) => c.cornerComponentId));
  const byId = new Map(corner.components.map((c) => [c.cornerComponentId, c]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as ComponentNode[];
  for (const c of corner.components) if (!ids.includes(c.cornerComponentId)) ordered.push(c);

  // 묶음 분리: 칩(선택형) 묶음 / 본문(상품·혜택 등) 묶음. 칩이 본문 중간에 섞이지 않게 그룹으로 보여준다.
  const chipOrdered = ordered.filter((c) => c.componentType === '선택형');
  const bodyOrdered = ordered.filter((c) => c.componentType !== '선택형');
  const chipIds = chipOrdered.map((c) => c.cornerComponentId);
  const bodyIds = bodyOrdered.map((c) => c.cornerComponentId);
  const bodyLabel = corner.cornerType === '상품형' ? '상품 묶음' : corner.cornerType === '배너형' ? '배너 묶음' : '콘텐츠 묶음';
  // 선택형이라도 레이아웃이 '메뉴 리스트'면 칩이 아니라 세로 메뉴 묶음으로 표기
  const isMenuList = /메뉴\s*리스트/.test(corner.layoutDetail ?? '');
  const chipLabel = isMenuList ? '메뉴 묶음' : '칩 묶음';

  // CVM 보충 — 노출 개수(max)보다 운영자 등록(M)이 적으면 나머지(max−M)를 CVM이 채운다(가안).
  //  콘텐츠 수급 코너 + 1순위 CVM + max > 등록 개수일 때만. (에셋 등록 위치는 미해결 쟁점 10/07 — '가안' 표기)
  const isRecType = ['상품형', '혜택·오퍼형', '콘텐츠 안내형'].includes(corner.cornerType);
  const isCvmSource = corner.recSource === 'CVM 기반';
  const bodyM = bodyOrdered.length;
  const maxN = corner.maxItems;
  const cvmFill = isRecType && isCvmSource && maxN != null && maxN > bodyM ? maxN - bodyM : 0;

  // 같은 묶음 안에서만 재정렬. 저장 순서는 항상 [칩 묶음 → 본문 묶음].
  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const a = String(active.id);
    const o = String(over.id);
    const inChips = chipIds.includes(a);
    const group = inChips ? chipIds : bodyIds;
    if (!group.includes(o)) return; // 다른 묶음으로는 이동 불가
    const from = group.indexOf(a);
    const to = group.indexOf(o);
    const ng = [...group];
    ng.splice(to, 0, ng.splice(from, 1)[0]);
    const next = inChips ? [...ng, ...bodyIds] : [...chipIds, ...ng];
    setIds(next);
    await reorderComponents(templateId, corner.id, next);
  }

  return (
    <div className="space-y-1.5">
      {overLimit && (
        <p className="rounded bg-red-50 px-2 py-1 text-[11px] text-destructive">
          최대 노출 개수({corner.maxItems}) 초과 — {corner.components.length}개 배치됨
        </p>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        {chipOrdered.length > 0 && (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-2">
            <p className="mb-1.5 flex items-center gap-1 px-0.5 text-[11px] font-semibold text-indigo-700">
              {chipLabel} <span className="rounded-full bg-white px-1.5 text-[10px] text-indigo-600">{chipOrdered.length}</span>
            </p>
            <SortableContext items={chipIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5">
                {chipOrdered.map((cc, i) => (
                  <ComponentCard key={cc.cornerComponentId} templateId={templateId} corner={corner} cc={cc} i={i} count={chipOrdered.length} library={library} />
                ))}
              </div>
            </SortableContext>
          </div>
        )}
        {/* 콘텐츠 묶음 — 본문(상품·혜택 등) 컴포넌트 + 추가 버튼. 비어도 항상 노출(추가 진입점). */}
        <div className="rounded-lg border bg-muted/30 p-2">
          <p className="mb-1.5 flex flex-wrap items-center gap-1 px-0.5 text-[11px] font-semibold text-slate-600">
            {bodyLabel} <span className="rounded-full bg-white px-1.5 text-[10px] text-slate-500">{bodyOrdered.length}</span>
            {cvmFill > 0 && (
              <span className="ml-0.5 inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700" title="노출 개수(최대)보다 운영자가 적게 등록해, 나머지는 CVM이 고객마다 자동으로 채웁니다(가안 — 에셋 등록 위치 확정 전).">
                <Sparkles className="h-2.5 w-2.5" /> 노출 {maxN} = 운영자 {bodyM} + CVM 보충 {cvmFill}
                <span className="rounded bg-violet-600 px-1 text-[8px] font-bold text-white">가안</span>
              </span>
            )}
          </p>
          {bodyOrdered.length > 0 ? (
            <SortableContext items={bodyIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5">
                {bodyOrdered.map((cc, i) => (
                  <ComponentCard key={cc.cornerComponentId} templateId={templateId} corner={corner} cc={cc} i={i} count={bodyOrdered.length} library={library} />
                ))}
              </div>
            </SortableContext>
          ) : (
            <p className="px-0.5 pb-1 text-[11px] text-muted-foreground">아직 콘텐츠가 없습니다. 아래에서 추가하세요.</p>
          )}
          {/* 추가 — 자유 컴포넌트 생성은 정책상 불가(⛔ 새 구조 생성). 코드화된 상품(BSS)만 불러와 편성(🔶). */}
          <div className="mt-2 space-y-1.5">
            <button
              type="button"
              onClick={() => setBssOpen(true)}
              className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-sky-300 bg-white/70 py-2 text-xs font-medium text-sky-700 hover:border-sky-500 hover:bg-sky-50"
            >
              <Search className="h-3.5 w-3.5" /> 상품 불러오기 (코드화된 컴포넌트 편성)
            </button>
            <p className="flex items-start gap-1 rounded-md bg-slate-50 px-2 py-1.5 text-[10px] leading-relaxed text-muted-foreground">
              <Lock className="mt-0.5 h-3 w-3 shrink-0" />
              <span>새 컴포넌트 자유 추가는 여기서 하지 않아요. 컴포넌트 구성은 <b className="text-slate-600">코너 유형 관리 → 컴포넌트 조합</b>에서 정의합니다 (DS Portal 코드화 기준).</span>
            </p>
          </div>
        </div>
      </DndContext>
      <BssProductPickerModal
        open={bssOpen}
        pending={bssPending}
        onClose={() => setBssOpen(false)}
        onPick={(key) => startBss(async () => { await addBssProduct(templateId, corner.id, key); setBssOpen(false); })}
      />
    </div>
  );
}

// ── 코너 정보 편집 (유형 패밀리별로 컬럼이 달라짐 — 코너1~4 기준) ──
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2 border-b py-1.5 last:border-0">
      <div className="w-24 shrink-0 text-[11px] text-muted-foreground">{label}</div>
      <div className="flex-1 whitespace-pre-line text-xs text-foreground">{value}</div>
    </div>
  );
}

// 코너 정보 읽기 전용 뷰 (디폴트)
function CornerInfoView({ corner, nameMap }: { corner: CornerNode; nameMap: Record<string, string> }) {
  const fam = cornerFamily(corner.cornerType);
  return (
    <div className="rounded-md border bg-muted/20 px-3">
      <InfoRow label="코너명" value={corner.name} />
      {/* 코너 유형 관리와 1:1 — '코너 유형'(유형만) + '배열·레이아웃'을 각각의 행으로 분리해 라벨·표기를 동일하게. */}
      {(() => {
        const { base, rest, bigBanner } = cornerTypeParts(corner);
        const isBanner = base === '배너형';
        const baseEn = isBanner ? 'Banner' : cornerTypeEn(base);
        const restEn = rest ? layoutEn(rest) : '';
        return (
          <>
            <InfoRow label="코너 유형" value={
              <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold', cornerTypeChipClass(base))}>
                {isBanner ? '배너' : base}{baseEn && <span className="ml-1 font-normal opacity-70">{baseEn}</span>}
              </span>
            } />
            {!isBanner && (rest || corner.cornerLayout) && (
              <InfoRow label="배열·레이아웃" value={
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  <span className="font-medium">{rest ? `${rest}${restEn ? ` (${restEn})` : ''}` : (corner.cornerLayout || '—')}</span>
                  {rest && corner.cornerLayout && <span className="text-[11px] text-muted-foreground">· {corner.cornerLayout}</span>}
                  {bigBanner && <BigBannerBadge />}
                </span>
              } />
            )}
          </>
        );
      })()}
      {corner.mainTitle && <InfoRow label="타이틀" value={corner.mainTitle} />}
      {corner.subTitle && <InfoRow label="서브타이틀" value={corner.subTitle} />}
      {corner.subTitleIcon && corner.subTitleIcon !== '사용안함' && <InfoRow label="서브타이틀 아이콘" value={corner.subTitleIcon} />}
      {(corner.minItems != null || corner.maxItems != null) && (
        <InfoRow label="노출 개수" value={`${corner.minItems ?? '-'} ~ ${corner.maxItems ?? '-'}`} />
      )}
      {corner.recSource && (() => {
        let plan: string[] = [];
        try { const a = JSON.parse(corner.recSourcePlan ?? ''); if (Array.isArray(a)) plan = a.filter((x) => typeof x === 'string'); } catch { /* noop */ }
        const fb = plan.slice(1);
        return (
          <InfoRow label="추천 수급" value={
            <span className="inline-flex flex-wrap items-center gap-1">
              <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold', corner.recSource === 'CVM 기반' ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-slate-200 bg-slate-50 text-slate-600')}>{corner.recSource}{corner.recSource === 'CVM 기반' ? ' · 런타임 판정' : ''}</span>
              {fb.length > 0 && <span className="text-[10px] text-muted-foreground">폴백 → {fb.join(' → ')}</span>}
            </span>
          } />
        );
      })()}
      {fam === 'product' && corner.sortStrategy && <InfoRow label="상품 노출 순서" value={corner.sortStrategy} />}
      {corner.noDisplayCondition && corner.noDisplayCondition !== '선택 없음' && <InfoRow label="미 노출 조건" value={corner.noDisplayCondition} />}
      {fam === 'product' && (
        <InfoRow
          label="CTA"
          value={
            corner.moreButtonUse
              ? `사용${corner.moreButtonLabel ? ' · ' + corner.moreButtonLabel : ''}${corner.moreButtonLink ? ' → ' + corner.moreButtonLink : ''}`
              : '미사용'
          }
        />
      )}
      {corner.markupId && <InfoRow label="마크업 ID" value={corner.markupId} />}
      {corner.description && <InfoRow label="코너 설명" value={corner.description} />}
    </div>
  );
}

// 카드 비율(가로형 2.5배열) 정규화 — 레거시 정사각형/직사각형 → 1:1/3:4

// '코너 구성' 카드 비율 컨트롤 — 상품형 컴포넌트가 있고 배열이 2.5(가로형)일 때만 노출.
// 노출 타입 베리에이션 — 한 코너에 노출 타입(껍데기)을 2~3개 등록. 실서비스에선 CVM이 고객마다 택1, 빌더 미리보기는 기본(첫 번째). 회의 2026-08-31.
//  '재료(타입·문구)는 우리가, 조합은 CVM' — 즉시 저장(setCornerDisplayVariants), 코너 정보 저장과 독립.
// 노출 타입 = 코너 유형 관리(카탈로그)에 등록된 유형을 참조(회의 2026-08-31: 카탈로그에서 골라 조합). typeId = CornerType.id.
type DisplayVariant = { label: string; typeId?: string; typeName?: string; note?: string };
function DisplayVariantsControl({ templateId, corner, cornerTypes }: { templateId: string; corner: CornerNode; cornerTypes: LibraryData['cornerTypes'] }) {
  const parse = (): DisplayVariant[] => { try { const a = JSON.parse(corner.displayVariants ?? ''); if (Array.isArray(a)) return a.filter((x) => x && typeof x.label === 'string'); } catch { /* noop */ } return []; };
  const [vars, setVars] = useState<DisplayVariant[]>(parse());
  const [, start] = useTransition();
  useEffect(() => { setVars(parse()); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [corner.displayVariants, corner.templateCornerId]);
  const save = (next: DisplayVariant[]) => { setVars(next); start(() => setCornerDisplayVariants(templateId, corner.id, next.length ? JSON.stringify(next) : '')); };
  const add = () => { if (vars.length >= 4) return; save([...vars, { label: '' }]); };
  // 노출 타입 후보 = 카탈로그(코너 유형 관리)에서 '같은 코너 유형(baseCategory)'의 활성 타입만.
  //  거버넌스: 노출 타입은 배열·레이아웃만 다른 같은 유형이어야 한다 → 다른 유형으로 폴백하지 않는다.
  const options = cornerTypes.filter((t) => t.active && t.baseCategory === corner.cornerType);
  const typeLabel = (t: LibraryData['cornerTypes'][number]) => (t.typeDetail && !t.name.includes(t.typeDetail) ? `${t.name} · ${t.typeDetail}` : t.name);
  const pick = (i: number, id: string) => {
    const t = cornerTypes.find((x) => x.id === id);
    save(vars.map((v, j) => (j === i ? { ...v, typeId: id || undefined, typeName: t ? typeLabel(t) : undefined, label: t ? typeLabel(t) : v.label } : v)));
  };
  return (
    <div className="mb-3 space-y-2 rounded-xl border bg-gradient-to-b from-slate-50 to-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[11px] font-semibold text-slate-700">노출 타입 베리에이션</span>
          <span className="rounded bg-violet-100 px-1.5 py-px text-[9px] font-medium text-violet-600">CVM이 택1</span>
        </div>
        <button type="button" onClick={add} disabled={vars.length >= 4 || options.length === 0}
          title={options.length === 0 ? `‘${corner.cornerType}’ 유형에 등록된 노출 타입(배열·레이아웃)이 하나뿐이에요. 코너 유형 관리에서 이 유형의 배열·레이아웃을 더 등록하세요.` : undefined}
          className="shrink-0 rounded-md border border-violet-300 bg-violet-50 px-2 py-1 text-[11px] font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-40">＋ 타입</button>
      </div>
      {options.length === 0 ? (
        <p className="text-[10px] leading-relaxed text-muted-foreground">이 코너는 <b className="text-slate-600">{corner.cornerType}</b> 유형이고, 이 유형에 등록된 배열·레이아웃이 하나뿐이라 노출 타입을 더 추가할 수 없어요. <b>코너 유형 관리</b>에서 이 유형의 배열·레이아웃을 더 등록하면 여기서 고를 수 있습니다.</p>
      ) : vars.length === 0 ? (
        <p className="text-[10px] leading-relaxed text-muted-foreground">노출 타입이 1개예요. ＋로 <b>{corner.cornerType}</b> 유형의 노출 타입(배열·레이아웃)을 2~3개 등록하면 실서비스에서 <b>CVM이 고객마다 골라</b> 노출합니다. (빌더 미리보기는 기본 타입)</p>
      ) : (
        <div className="space-y-1.5">
          {vars.map((v, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className={cn('inline-flex h-7 shrink-0 items-center rounded-md px-1.5 text-[9px] font-bold', i === 0 ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-600')}>{i === 0 ? '기본' : `타입 ${i + 1}`}</span>
              {/* 노출 타입 = 카탈로그에서 선택 (코너 유형 관리에 등록된 노출 타입) */}
              <Select value={v.typeId ?? ''} onChange={(e) => pick(i, e.target.value)} className="h-7 min-w-0 flex-1 text-xs">
                <option value="">노출 타입 선택… (코너 유형 관리)</option>
                {options.map((t) => <option key={t.id} value={t.id}>{typeLabel(t)}</option>)}
              </Select>
              <button type="button" onClick={() => save(vars.filter((_, j) => j !== i))}
                className="flex h-7 w-6 shrink-0 items-center justify-center rounded border text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="타입 삭제">−</button>
            </div>
          ))}
          <p className="text-[9px] leading-relaxed text-slate-400">노출 타입은 <b>코너 유형 관리</b>에 등록된 것에서 골라요. 미리보기는 <b>기본(첫 번째)</b> 타입 기준이고, 실서비스에선 CVM이 고객마다 이 중 하나를 노출합니다. (콘텐츠 문구는 각 컴포넌트의 ‘문구 베리에이션’)</p>
        </div>
      )}
    </div>
  );
}

// 문구 한눈에 보기 — 이 코너의 모든 문구(타이틀 + 텍스트 아톰)와 타겟별 대체 문구를 한 화면에 모아 본다. (별도 메뉴 아님 — 코너 편집 내 정리 뷰)
//  타이틀 베리에이션은 여기서 직접 편집(즉시 저장). 아톰 문구는 컴포넌트 ‘수정’에서.
function CopyOverview({ templateId, corner }: { templateId: string; corner: CornerNode }) {
  type TV = { text: string; target?: string; enabled?: boolean };
  const parseTitle = (): TV[] => { try { const a = JSON.parse(corner.mainTitleVariants ?? ''); if (Array.isArray(a)) return a.filter((x) => x && typeof x.text === 'string'); } catch { /* noop */ } return []; };
  const [tvars, setTvars] = useState<TV[]>(parseTitle());
  useEffect(() => { setTvars(parseTitle()); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [corner.mainTitleVariants, corner.templateCornerId]);

  const atomRows: { label: string; base: string | null; variants: TV[] }[] = [];
  corner.components.forEach((cp) => cp.atoms.forEach((a) => {
    const isText = !['IMAGE', 'ICON', 'BARCODE'].includes(a.atomType);
    if (isText && (a.content || (a.contentVariants?.length ?? 0) > 0))
      atomRows.push({ label: `${cp.name} · ${ATOM_TYPE_LABELS[a.atomType as AtomType] ?? a.atomType}`, base: a.content, variants: a.contentVariants ?? [] });
  }));
  const hasTitle = !!corner.mainTitle;
  if (!hasTitle && atomRows.length === 0) return null;
  const totalVars = tvars.length + atomRows.reduce((n, r) => n + r.variants.length, 0);
  return (
    <details className="mb-3 rounded-xl border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-slate-700">
        <List className="h-3.5 w-3.5 text-violet-500" /> 문구 한눈에 보기 <span className="font-normal text-slate-400">· 문구 {atomRows.length + (hasTitle ? 1 : 0)}종 · 타겟별 대체 {totalVars}개</span>
        <span className="ml-auto rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">편집은 컴포넌트 ‘수정’에서</span>
      </summary>
      <div className="space-y-2.5 border-t p-3">
        {/* 타이틀 — 읽기 전용(편집은 문구 관리에서). 타겟별 대체 = 타이틀 베리에이션 */}
        {hasTitle && (
          <div className="space-y-1 rounded-lg bg-violet-50/50 p-2">
            <p className="text-[10px] font-semibold text-violet-600">타이틀 · 타겟별 대체(CVM 택1)</p>
            <div className="flex items-start gap-1.5">
              <span className="inline-flex h-5 shrink-0 items-center rounded bg-slate-200 px-1.5 text-[9px] font-bold text-slate-600">기본</span>
              <span className="flex-1 whitespace-pre-line text-[11px] text-slate-800">{corner.mainTitle}</span>
            </div>
            {tvars.map((v, j) => {
              const on = v.enabled !== false;
              return (
                <div key={j} className={cn('flex items-start gap-1.5', !on && 'opacity-55')}>
                  <span className="inline-flex h-5 shrink-0 items-center rounded bg-rose-100 px-1.5 text-[9px] font-bold text-rose-600">{v.target || '타겟없음'}</span>
                  <span className="flex-1 text-[11px] text-rose-700">{v.text || <span className="text-slate-400">(빈 문구)</span>}</span>
                  {!on && <span className="shrink-0 rounded bg-slate-200 px-1 text-[9px] font-semibold text-slate-500">제외</span>}
                </div>
              );
            })}
          </div>
        )}
        {/* 아톰 문구 — 읽기 전용(편집은 문구 관리에서) */}
        {atomRows.map((r, i) => (
          <div key={i} className="space-y-1">
            <p className="text-[10px] font-semibold text-slate-500">{r.label}</p>
            <div className="flex items-start gap-1.5">
              <span className="inline-flex h-5 shrink-0 items-center rounded bg-slate-200 px-1.5 text-[9px] font-bold text-slate-600">기본</span>
              <span className="flex-1 whitespace-pre-line text-[11px] text-slate-800">{r.base || <span className="text-slate-400">—</span>}</span>
            </div>
            {r.variants.map((v, j) => {
              const on = v.enabled !== false;
              return (
              <div key={j} className={cn('flex items-start gap-1.5', !on && 'opacity-55')}>
                <span className="inline-flex h-5 shrink-0 items-center rounded bg-rose-100 px-1.5 text-[9px] font-bold text-rose-600">{v.target || '타겟없음'}</span>
                <span className="flex-1 text-[11px] text-rose-700">{v.text || <span className="text-slate-400">(빈 문구)</span>}</span>
                {!on && <span className="shrink-0 rounded bg-slate-200 px-1 text-[9px] font-semibold text-slate-500">제외</span>}
              </div>
              );
            })}
          </div>
        ))}
        <p className="border-t pt-2 text-[9px] leading-relaxed text-muted-foreground">여기는 <b>모아 보기</b>입니다. 아톰 문구·타겟별 대체는 각 컴포넌트 <b>‘수정’</b>의 ‘문구 베리에이션’에서 추가·편집합니다. 타겟은 CVM이 참고하는 힌트로, 최종 매칭은 CVM이 수행.</p>
      </div>
    </details>
  );
}

// 캔버스식 — 디바이스 옆에 '추가 노출 타입'만 렌더. 각 타입 카드에서 노출 타입(카탈로그)을 직접 변경. 기본은 디바이스에서 편집.
function VariantSpread({ templateId, corner, preview, cornerTypes }: { templateId: string; corner: CornerNode; preview: PreviewCorner; cornerTypes: LibraryData['cornerTypes'] }) {
  type V = { label: string; typeId?: string; typeName?: string; target?: string };
  const parse = (): V[] => { try { const a = JSON.parse(corner.displayVariants ?? ''); if (Array.isArray(a)) return a.filter((x) => x && typeof x.label === 'string'); } catch { /* noop */ } return []; };
  // 타이틀 베리에이션 — target별 대체 타이틀. withTarget에서 pc.mainTitle을 이걸로 치환.
  const titleVars: { text: string; target?: string; enabled?: boolean }[] = (() => { try { const a = JSON.parse(corner.mainTitleVariants ?? ''); if (Array.isArray(a)) return a.filter((x) => x && typeof x.text === 'string'); } catch { /* noop */ } return []; })();
  const [vars, setVars] = useState<V[]>(parse());
  const [, start] = useTransition();
  useEffect(() => { setVars(parse()); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [corner.displayVariants, corner.templateCornerId]);
  const options = cornerTypes.filter((t) => t.active && t.baseCategory === corner.cornerType);
  const typeLabel = (t: LibraryData['cornerTypes'][number]) => (t.typeDetail && !t.name.includes(t.typeDetail) ? `${t.name} · ${t.typeDetail}` : t.name);
  const save = (next: V[]) => { setVars(next); start(() => setCornerDisplayVariants(templateId, corner.id, next.length ? JSON.stringify(next) : '')); };
  const pick = (i: number, id: string) => { const t = cornerTypes.find((x) => x.id === id); save(vars.map((v, j) => (j === i ? { ...v, typeId: id || undefined, typeName: t ? typeLabel(t) : undefined, label: t ? typeLabel(t) : v.label } : v))); };
  const setTarget = (i: number, target: string) => save(vars.map((v, j) => (j === i ? { ...v, target: target || undefined } : v)));
  const add = () => { if (vars.length >= 4) return; save([...vars, { label: '' }]); };
  // 슬롯을 항상 예약(min-w) — 노출 타입이 없어도 디바이스가 같은 위치에 있게(치우침·튐 방지). 비면 안내 자리.
  return (
    <div className="min-w-[320px] shrink-0">
      {vars.length === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-5 text-center">
          <Layers className="mb-2 h-6 w-6 text-slate-300" />
          <p className="text-[11px] font-medium text-slate-500">노출 타입 베리에이션</p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">추가하면 여기에 나란히 떠서<br />CVM이 고객마다 택1합니다</p>
          <button type="button" onClick={add} className="mt-2.5 inline-flex items-center gap-0.5 rounded-md border border-violet-300 bg-white px-2.5 py-1 text-[11px] font-medium text-violet-700 hover:bg-violet-50"><Plus className="h-3 w-3" /> 노출 타입 추가</button>
        </div>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-700"><Sparkles className="h-3.5 w-3.5" /> 추가 노출 타입 {vars.length}개 <span className="font-normal text-violet-400">클릭해 변경 · CVM 택1</span></p>
            {vars.length < 4 && <button type="button" onClick={add} className="shrink-0 rounded-md border border-violet-300 bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 hover:bg-violet-100"><Plus className="mr-0.5 inline h-2.5 w-2.5" />타입</button>}
          </div>
          <div className="flex items-start gap-4">
            {vars.map((v, i) => {
              // 각 타입 = 자기 노출 타입(카탈로그) 레이아웃 + 타겟이 있으면 그 타겟 문구로 치환 → 껍데기·문구 모두 타입별로 다르게.
              const vType = v.typeId ? cornerTypes.find((t) => t.id === v.typeId) : null;
              const withTarget = (pc: PreviewCorner): PreviewCorner => {
                if (!v.target) return pc;
                // 노출 제외(enabled=false)된 후보는 매칭에서 빠지고 기본(base)으로 폴백 — 채널 통제 권한 반영.
                const tHit = titleVars.find((t) => t.target === v.target && t.text && t.enabled !== false);
                return {
                  ...pc,
                  mainTitle: tHit ? tHit.text : pc.mainTitle,
                  components: pc.components.map((c) => ({ ...c, atoms: c.atoms.map((a) => { const hit = a.contentVariants?.find((cv) => cv.target === v.target && cv.text && cv.enabled !== false); return hit ? { ...a, content: hit.text } : a; }) })),
                };
              };
              const vPreview: PreviewCorner = withTarget(vType
                ? { ...preview, cornerLayout: null, layoutDetail: vType.typeDetail ?? preview.layoutDetail, bigBanner: vType.bigBanner ?? false }
                : preview);
              return (
              <div key={i} className="w-[300px] shrink-0">
                <div className="mb-1 flex items-center gap-1">
                  <span className="inline-flex h-6 shrink-0 items-center rounded bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700">타입 {i + 2}</span>
                  <Select value={v.typeId ?? ''} onChange={(e) => pick(i, e.target.value)} className="h-6 min-w-0 flex-1 text-[11px]">
                    <option value="">노출 타입 선택…</option>
                    {options.map((t) => <option key={t.id} value={t.id}>{typeLabel(t)}</option>)}
                  </Select>
                  <button type="button" onClick={() => save(vars.filter((_, j) => j !== i))} className="flex h-6 w-5 shrink-0 items-center justify-center rounded border text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="타입 삭제">−</button>
                </div>
                {/* 타겟 힌트 — '누구에게'(연령대·방문이력·위치 등). 최종 매칭은 CVM. 회의 md 반영. */}
                <div className="mb-1.5 flex items-center gap-1">
                  <span className="w-8 shrink-0 text-[9px] text-muted-foreground">타겟</span>
                  <Select value={v.target ?? ''} onChange={(e) => setTarget(i, e.target.value)} className="h-6 min-w-0 flex-1 text-[11px]">
                    <option value="">힌트 없음 (CVM 자동 분류)</option>
                    {CVM_TARGET_HINTS.map((t) => <option key={t.key} value={t.key}>{t.key} · {t.axis}</option>)}
                  </Select>
                </div>
                <div className="relative overflow-hidden rounded-2xl border-2 border-amber-200 bg-slate-100 p-2">
                  {v.target && <span className="absolute right-2 top-2 z-10 rounded-full bg-rose-500 px-2 py-0.5 text-[9px] font-bold text-white shadow">{v.target}</span>}
                  <CornerBlock corner={vPreview} />
                </div>
                <p className="mt-1 text-center text-[9px] text-amber-600">{vType ? `노출 타입: ${vType.typeDetail || vType.name}` : '노출 타입을 선택하면 그 레이아웃으로 렌더'}{v.target ? ` · 타겟 ${v.target} 문구` : ''}</p>
              </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// '코너 구성' 표시 옵션 — 빅배너로 강조(+위치+배너 선택). 상품형/혜택·오퍼형에서만(콘텐츠 안내형은 빅배너 없음 — 2026-10-06). 즉시 저장.
function BigBannerControl({ templateId, corner, banners }: { templateId: string; corner: CornerNode; banners: LibraryData['banners'] }) {
  const canBigBanner = ['상품형', '혜택·오퍼형'].includes(corner.cornerType);
  const [on, setOn] = useState(!!corner.bigBanner);
  const [pending, start] = useTransition();
  useEffect(() => { setOn(!!corner.bigBanner); }, [corner.bigBanner, corner.templateCornerId]);
  if (!canBigBanner) return null;
  const toggle = () => { const next = !on; setOn(next); start(() => setCornerBigBanner(templateId, corner.id, next)); };
  return (
    <div className="mb-3 space-y-2 rounded-xl border border-indigo-200 bg-indigo-50/40 p-3">
      <label className="flex items-center justify-between gap-2">
        <span className="flex flex-col">
          <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-800"><ImageIcon className="h-3.5 w-3.5" /> 빅배너로 강조</span>
          <span className="text-[10px] text-indigo-600/80">이 코너 상단에 큰 배너를 얹어요. 켜면 아래 <b>‘상단 배너’</b>에서 이미지를 등록·변경합니다.</span>
        </span>
        <button type="button" role="switch" aria-checked={on} disabled={pending} onClick={toggle}
          className={cn('relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors', on ? 'bg-indigo-500' : 'bg-slate-300')}>
          <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform', on ? 'translate-x-4' : 'translate-x-0.5')} />
        </button>
      </label>
      {on && (
        <div className="space-y-2.5 border-t border-indigo-100 pt-2">
          {/* 배너 위치는 DS 포털처럼 항상 상단 고정 — 선택 없음 */}
          {/* 배너 이미지 선택(라이브러리/직접 등록) — 빅배너 카드 안에 임베드 */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-indigo-700">배너 이미지</label>
            <BannerPanel templateId={templateId} corner={corner} banners={banners} embedded />
          </div>
        </div>
      )}
    </div>
  );
}

// 배너형 코너의 규격(사이즈) 표기 — 코너 유형/배너 캠페인이 소유. 빌더에선 읽기 전용 표시만.
const bannerSizeShort = (detail: string) => detail.replace(/\s*\(.*\)\s*/, '').trim() || detail;

// 배너 레일의 한 줄 — 드래그앤드롭(그립 핸들)로 순서 변경. 썸네일·이름·삭제·원본 변경 안내.
function SortableBannerRailItem({ templateId, cc, i, thumb, onRemove, onRefresh }: { templateId: string; cc: ComponentNode; i: number; thumb: string | null; onRemove: () => void; onRefresh: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cc.cornerComponentId });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const [open, setOpen] = useState(false);
  const [, startVar] = useTransition();
  // 배너 문구 = 제목 텍스트 아톰(배너 캠페인에서 등록 = 공통 기본). 빌더에선 '타겟별 대체 문구(베리에이션)'만 추가/편집.
  const textAtom = cc.atoms.find((a) => a.atomType === 'TEXT' || a.atomType === 'BENEFIT_TEXT');
  const [vars, setVarsState] = useState<{ text: string; target?: string; enabled?: boolean }[]>(textAtom?.contentVariants ?? []);
  const saveVars = (next: { text: string; target?: string; enabled?: boolean }[]) => {
    setVarsState(next);
    if (!textAtom) return;
    startVar(() => saveAtoms(templateId, [{ atomId: textAtom.id, componentAtomId: textAtom.componentAtomId, visible: textAtom.visible !== false, atomType: textAtom.atomType, content: textAtom.content, contentVariants: next.length ? JSON.stringify(next) : null, imageUrl: textAtom.imageUrl, altText: textAtom.altText, linkUrl: textAtom.linkUrl }]));
  };
  const patchVar = (idx: number, p: Partial<{ text: string; target?: string; enabled?: boolean }>) => saveVars(vars.map((v, k) => (k === idx ? { ...v, ...p } : v)));
  const baseCopy = textAtom?.content ?? '';
  return (
    <li ref={setNodeRef} style={style} className="rounded-lg border bg-white px-2 py-1.5">
      <div className="flex items-center gap-2">
        <button type="button" className="cursor-grab text-slate-400 active:cursor-grabbing" {...attributes} {...listeners} aria-label="순서 변경 (드래그)" title="드래그하여 순서 변경">
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] font-bold text-slate-500">{i + 1}</span>
        <div className="flex h-9 w-14 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50">
          {thumb
            ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={thumb} alt="" className="h-full w-full object-cover" />
            : <GalleryHorizontalEnd className="h-4 w-4 text-slate-300" />}
        </div>
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-slate-700">{cc.name}</span>
        <button type="button" onClick={onRemove} title="이 코너에서 배너 빼기"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded border text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>

      {/* 문구 베리에이션 — 기본 문구는 배너 캠페인 소유(읽기 전용), 타겟별 대체 문구는 빌더에서 설정. 이 액션을 배너마다 눈에 띄게. */}
      {textAtom && (
        <>
          <button type="button" onClick={() => setOpen((o) => !o)}
            className={cn('mt-1.5 flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-[10.5px] font-medium transition', open ? 'bg-violet-100 text-violet-800' : 'bg-violet-50 text-violet-700 hover:bg-violet-100')}>
            <Sparkles className="h-3 w-3" /> 문구 베리에이션
            {vars.length > 0
              ? <span className="rounded-full bg-violet-600 px-1.5 text-[9px] font-bold text-white">{vars.length}</span>
              : <span className="rounded-full bg-white px-1.5 text-[9px] font-medium text-violet-400 ring-1 ring-inset ring-violet-200">설정 안 함</span>}
            <span className="ml-auto text-violet-400">{open ? '접기' : '타겟별 문구 추가'}</span>
          </button>
          {open && (
            <div className="mt-1.5 space-y-1.5 rounded-md border border-dashed border-violet-200 bg-violet-50/40 px-2 py-2">
              {/* 기본 문구 — 배너 캠페인에서 등록(공통). 여기선 수정 불가. */}
              <div className="flex items-center gap-1.5">
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-medium text-slate-500" title="배너 캠페인 관리에서 등록한 공통 문구 — 변경은 배너 캠페인에서">
                  <Lock className="h-2.5 w-2.5" /> 배너 캠페인 등록
                </span>
                <span className="min-w-0 flex-1 truncate text-[11px] text-slate-700">{baseCopy || '문구 없음'}</span>
              </div>
              {/* 타겟별 대체 문구 — 빌더에서 추가 */}
              <div className="flex items-center justify-between gap-2 border-t border-violet-100 pt-1.5">
                <span className="text-[10px] font-semibold text-violet-700">타겟별 대체 문구 <span className="font-normal text-violet-400">· 빌더에서 설정 · 실서비스 CVM 택1</span></span>
                <button type="button" onClick={() => saveVars([...vars, { text: '', target: '', enabled: true }])}
                  className="inline-flex shrink-0 items-center gap-0.5 rounded border border-violet-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-violet-700 hover:bg-violet-100">
                  <Plus className="h-3 w-3" /> 문구
                </button>
              </div>
              {vars.length === 0 ? (
                <p className="text-[10px] leading-relaxed text-violet-400">기본 문구만 노출됩니다. <span className="font-medium text-violet-500">＋문구</span>로 타겟별 대체 문구를 추가하면 실서비스에서 세그먼트별로 노출됩니다.</p>
              ) : (
                vars.map((v, k) => {
                  const on = v.enabled !== false;
                  return (
                    <div key={k} className={cn('flex items-center gap-1', !on && 'opacity-55')}>
                      <input value={v.text} onChange={(e) => patchVar(k, { text: e.target.value })} placeholder="대체 문구"
                        className="h-7 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] text-slate-800 focus:border-violet-400 focus:outline-none" />
                      <input value={v.target ?? ''} onChange={(e) => patchVar(k, { target: e.target.value })} placeholder="타겟" title="노출 타겟 힌트 (예: VIP, 신규, 20대) — CVM 세그먼트 매칭용"
                        className="h-7 w-16 shrink-0 rounded-md border border-slate-200 bg-white px-1.5 text-[10px] text-violet-700 focus:border-violet-400 focus:outline-none" />
                      <button type="button" onClick={() => patchVar(k, { enabled: !on })} title={on ? '노출 중 — 클릭 시 후보에서 제외' : '제외됨 — 클릭 시 후보 포함'}
                        className={cn('h-7 shrink-0 rounded px-1.5 text-[9px] font-semibold ring-1 ring-inset', on ? 'bg-emerald-50 text-emerald-600 ring-emerald-200' : 'bg-slate-100 text-slate-400 ring-slate-200')}>
                        {on ? '노출' : '제외'}
                      </button>
                      <button type="button" onClick={() => saveVars(vars.filter((_, idx) => idx !== k))} title="문구 삭제"
                        className="flex h-7 w-6 shrink-0 items-center justify-center rounded-md border text-muted-foreground hover:bg-secondary"><X className="h-3 w-3" /></button>
                    </div>
                  );
                })
              )}
              <p className="text-[9.5px] leading-relaxed text-violet-400/90">기본 문구는 <b className="text-violet-500">배너 캠페인 관리</b>에서 등록(공통 1벌). 타겟별 대체 문구는 <b className="text-violet-500">여기(빌더)</b>에서 추가합니다 — 미리보기는 기본 문구, 실서비스는 세그먼트별 택1.</p>
            </div>
          )}
        </>
      )}

      {/* 원본 변경 전파 — 캠페인 원본이 편성 이후 바뀌면 갱신 안내 */}
      {cc.sourceChanged && (
        <div className="mt-1.5 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1">
          <span className="flex-1 text-[10.5px] leading-snug text-amber-700">원본 배너 캠페인이 변경됐어요. 이 편성은 편성 시점 스냅샷입니다.</span>
          <button type="button" onClick={onRefresh}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-300 bg-white px-2 py-0.5 text-[10.5px] font-semibold text-amber-700 hover:bg-amber-100">
            <RotateCcw className="h-3 w-3" /> 최신으로 갱신
          </button>
        </div>
      )}
    </li>
  );
}

// ── 배너 레일 컨트롤 (배너형 코너 전용, '코너 구성' 안) ──────────────────
//  한 코너에 여러 배너를 담아 순서·삭제하고, 규격/노출 방식(스와이프·자동 슬라이드)을 한 곳에서 설정.
//  배너 추가는 배너 캠페인 관리(SSOT)에서 불러온다. 문구는 캠페인 소유 → 여기선 배치/노출만.
function BannerRailControl({
  templateId,
  corner,
  campaigns,
}: {
  templateId: string;
  corner: CornerNode;
  campaigns: NonNullable<LibraryData['bannerCampaigns']>;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [, start] = useTransition();
  const banners = corner.components; // 배너형 코너의 각 컴포넌트 = 배너 1장
  const size = corner.layoutDetail ?? '';
  const opts = parseBannerOptions(corner.bannerOptions);
  const remove = (ccId: string) => start(() => removeComponent(templateId, ccId));
  const refresh = (componentId: string) => start(() => refreshBannerComponent(templateId, componentId));

  // 드래그앤드롭 순서 변경 — 코너 컴포넌트(배너) 순서를 reorderComponents로 저장. 낙관적 로컬 순서 유지(2026-09-29 사용자 요청).
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const [ids, setIds] = useState(banners.map((c) => c.cornerComponentId));
  if (ids.length !== banners.length || banners.some((c) => !ids.includes(c.cornerComponentId))) setIds(banners.map((c) => c.cornerComponentId));
  const byId = new Map(banners.map((c) => [c.cornerComponentId, c]));
  const orderedBanners = ids.map((id) => byId.get(id)).filter(Boolean) as ComponentNode[];
  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const next = [...ids];
    next.splice(to, 0, next.splice(from, 1)[0]);
    setIds(next);
    await reorderComponents(templateId, corner.id, next);
  };

  const thumbOf = (c: ComponentNode) => c.atoms.find((a) => a.atomType === 'IMAGE' && isImgSrc(a.imageUrl))?.imageUrl ?? null;

  return (
    <div className="mb-3 space-y-3 rounded-xl border bg-card p-3">
      {/* 헤더 + 배너 추가 */}
      <div className="flex items-center gap-2">
        <GalleryHorizontalEnd className="h-4 w-4 text-indigo-500" />
        <p className="text-sm font-semibold">배너 <span className="font-normal text-muted-foreground">· {banners.length}장</span></p>
        <button type="button" onClick={() => setAddOpen(true)}
          className="ml-auto inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100">
          <Plus className="h-3 w-3" /> 배너 추가
        </button>
      </div>

      {/* 담긴 배너 목록 — 썸네일·드래그 순서·삭제 */}
      {banners.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-[12px] text-muted-foreground">
          담긴 배너가 없습니다.<br /><span className="text-[11px]">‘배너 추가’로 배너 캠페인에서 불러오세요.</span>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <ul className="space-y-1.5">
              {orderedBanners.map((c, i) => (
                <SortableBannerRailItem key={c.cornerComponentId} templateId={templateId} cc={c} i={i} thumb={thumbOf(c)} onRemove={() => remove(c.cornerComponentId)} onRefresh={() => refresh(c.id)} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {/* 배너 규격 — 배너 캠페인 관리(소재)가 소유. 빌더에선 읽기 전용, 수정은 배너 캠페인 상세로 이동(2026-10-06 사용자 요청). */}
      {size && bannerSizeShort(size) && (() => { const campaignId = banners.map((b) => b.sourceCampaignId).find(Boolean) ?? null; return (
      <div className="space-y-1.5 border-t border-slate-100 pt-2.5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium text-slate-500">배너 규격 <span className="font-normal text-slate-400">· 배너 캠페인 관리에서 정의</span></p>
          <a href={campaignId ? `/admin/banner-campaigns/${campaignId}` : '/admin/banner-campaigns'} className="text-[10px] font-medium text-indigo-600 hover:underline">배너 캠페인 관리에서 수정 ↗</a>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">{bannerSizeShort(size)}</span>
          <span className="text-slate-400">{size.replace(/^[^(]*/, '')}</span>
        </div>
      </div>
      ); })()}

      {/* 노출 방식 — 코너 유형(정의)에서 관리 → 빌더에선 읽기 전용, 수정은 코너 유형 상세로 이동(2026-10-06). */}
      <div className="space-y-1.5 border-t border-slate-100 pt-2.5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium text-slate-500">노출 방식 <span className="font-normal text-slate-400">· 코너 유형에서 정의</span></p>
          <a href={corner.sourceCornerTypeId ? `/admin/corner-types/${corner.sourceCornerTypeId}` : '/admin/corner-types'} className="text-[10px] font-medium text-indigo-600 hover:underline">코너 유형에서 수정 ↗</a>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">{opts.mode === 'auto' ? '자동 슬라이드' : '스와이프'}</span>
          {opts.mode === 'auto' && <span className="text-slate-400">{opts.intervalSec}초{opts.loop ? ' · 무한 루프' : ''}</span>}
          {opts.showIndicator && <span className="text-slate-400">· 인디케이터 표시</span>}
        </div>
      </div>

      {/* 문구 안내 — 기본 문구·이미지는 캠페인 소유(SSOT), 타겟별 문구 베리에이션은 빌더에서([[banner-copy-ssot]]). */}
      <div className="space-y-1 border-t border-slate-100 pt-2 text-[10px] leading-relaxed text-muted-foreground">
        <p>배너 <b>이미지·기본 문구</b>는 <b>배너 캠페인 관리</b>가 소유합니다(공통 1벌 · 변경 시 승인 재요청).</p>
        <p>이 코너(빌더)에서는 <b>배치·순서·노출 방식</b>과, 각 배너의 <b className="text-violet-600">타겟별 문구 베리에이션</b>(위 <span className="inline-flex items-center gap-0.5 align-middle text-violet-600"><Sparkles className="h-2.5 w-2.5" />문구 베리에이션</span>)을 설정합니다. 타겟별 다른 <b>배너(이미지)</b>는 여러 장을 담아 실서비스에서 CVM이 택1합니다.</p>
      </div>

      <BannerLoadModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        templateId={templateId}
        campaigns={campaigns}
        fixedCornerId={corner.id}
      />
    </div>
  );
}

function CornerInfoForm({
  templateId,
  corner,
  library,
  nameMap,
}: {
  templateId: string;
  corner: CornerNode;
  library: LibraryData;
  nameMap: Record<string, string>;
}) {
  const [edit, setEdit] = useState(false); // 기본 view, '수정' 클릭 시 편집
  const [ct, setCt] = useState(corner.cornerType);
  // 하단 CTA(더보기) 사용여부/문구는 '코너 구성'의 MoreButtonControl로 이동(여기선 상태 없음).
  const [loadOpen, setLoadOpen] = useState(false); // '코너 불러오기' 피커 열림
  const [resetKey, setResetKey] = useState(0); // '취소'로 폼(비제어 필드) 초기화
  const family = cornerFamily(ct);
  const hasProductComp = corner.components.some((c) => c.componentType === '상품형'); // 표시 항목(상품 카드 요소) UI 노출 기준 — 혜택·오퍼형 2.5 등도 커버
  // '정의' 항목은 코너 유형에서 관리 → 빌더에선 읽기 전용(상세로 이동 수정). 2026-10-06 사용자 결정(정의 항목만 잠금).
  const typeHref = corner.sourceCornerTypeId ? `/admin/corner-types/${corner.sourceCornerTypeId}` : '/admin/corner-types';
  const typeEditLink = <a href={typeHref} onClick={(e) => e.stopPropagation()} className="text-[10px] font-medium text-indigo-600 hover:underline">코너 유형에서 수정 ↗</a>;

  // 코너 정보 실시간 편집 — 저장 전에도 미리보기에 즉시 반영
  const pushCorner = useContext(CornerPreviewContext);
  const [name, setName] = useState(corner.name);
  const [mainTitle, setMainTitle] = useState(corner.mainTitle ?? '');
  const [subTitle, setSubTitle] = useState(corner.subTitle ?? '');
  const [subTitleIcon, setSubTitleIcon] = useState(corner.subTitleIcon ?? '사용안함');
  const [cornerLayout] = useState(corner.cornerLayout ?? ''); // 필드는 숨김(값 보존)
  const [layoutDetail, setLayoutDetail] = useState(corner.layoutDetail ?? '');
  // 코너별 표시 항목(상품 카드 요소 on/off) — 코너 유형 세부 항목의 코너 단위 오버라이드. 배지는 가격에 종속.
  // 표시 항목은 코너 유형에서 정의(읽기 전용) — 빌더에선 상속값 그대로 표시·제출(2026-10-06).
  const showItems = {
    showImage: corner.showImage ?? true,
    showPrice: corner.showPrice ?? true,
    showBadge: corner.showBadge ?? true,
    showDesc: corner.showDesc ?? true,
  };
  // 추천 수급 방식 — 재정렬 가능한 '자동 방식'(CVM/룰) + 항상 최하단 고정 '운영자 편성'(운영자가 코너 구성에 직접 짠 항목 = 폴백).
  //  운영자 편성은 정책상 대체 전시(PI-DSP-PER-002) 필수라 끌 수 없고, 운영자가 짠 항목이 곧 폴백이라 늘 켜져 있어야 함(빈 코너 방지). (2026-08-31 사용자 결정)
  const REC_AUTO_METHODS: string[] = ['CVM 기반']; // 수급 자동 방식 = CVM만 (룰 기반은 타겟팅 축이라 제거)
  const normalizeMethod = normalizeRecSource; // 폐기·legacy 값('채널 데이터'→CVM, '운영 편성'·'수동 대체'→운영자 편성) 흡수
  const parseRecFull = (): string[] => {
    try { const a = JSON.parse(corner.recSourcePlan ?? ''); if (Array.isArray(a) && a.length) return a.filter((x) => typeof x === 'string').map(normalizeMethod); } catch { /* noop */ }
    return corner.recSource ? [normalizeMethod(corner.recSource)] : [];
  };
  const initFull = parseRecFull();
  // 자동 방식(재정렬) — 중복 제거(채널데이터→CVM 흡수로 겹칠 수 있음)
  const [recPrimaryPlan, setRecPrimaryPlan] = useState<string[]>(
    initFull.filter((m) => REC_AUTO_METHODS.includes(m)).filter((m, i, a) => a.indexOf(m) === i),
  );
  // 운영자 편성(직접 구성)은 항상 최하단 폴백 — 토글 아님. '운영자 편성'으로 정규화해 늘 append.
  const recFullPlan = [...recPrimaryPlan, '운영자 편성'];
  const recSource = recFullPlan[0] ?? ''; // 대표(1순위)
  const recPersonalized = recSource === 'CVM 기반'; // 개인화 방식(CVM)이면 '미리보기=폴백' 안내 표시
  // 추천 수급 방식은 '추천 슬롯'인 코너에만 의미 있음 — 상품/혜택 추천 + CVM 타겟 배너(TM-DSP-018).
  //  배너형도 CVM 타겟 배너로 지정 가능(회의 2026-08-31). 상태 안내형·업무 진입형 등 고객정보/기능 코너는 제외.
  const isRecCorner = ['상품형', '혜택·오퍼형', '콘텐츠 안내형', '배너형'].includes(ct);
  // FO 사용자 설정(고객 커스터마이즈) — 메뉴 리스트 코너
  const [userCustom, setUserCustom] = useState(corner.userCustomizable ?? false);
  const [userMin, setUserMin] = useState(corner.userMinItems != null ? String(corner.userMinItems) : '');
  const [userMax, setUserMax] = useState(corner.userMaxItems != null ? String(corner.userMaxItems) : '');
  const isMenuListCorner = /메뉴\s*리스트/.test(layoutDetail);
  // 업무 진입형 '탭형' — 탭(선택형) 자체가 코너 콘텐츠라 카테고리 탭 토글·타이틀·서브타이틀·코너 설명 UI를 빌더에 두지 않는다. (값은 hidden으로 보존)
  const isQuickEntryTab = ct === '업무 진입형' && /탭/.test(layoutDetail);
  // 코너 정보 '수정' 노출 기준 — 빌더에서 실제로 바꿀 게 있을 때만(추천 수급 CVM·상품 순서). 2026-10-06 사용자 요청:
  //  업무 진입형 등 정의뿐인 코너는 코너 정보를 아예 수정 불가(읽기 전용)로 두고 '코너 유형에서 수정'으로 유도.
  const hasBuilderEdits = isRecCorner || family === 'product';
  // 빅배너·카드비율·상품명 줄수·하단CTA 등 표시 옵션은 '코너 구성'의 컨트롤로 분리 — 코너 정보 폼에서 제외.

  // 편집 중일 때만 현재 값을 미리보기로 반영(뷰 모드에선 서버 데이터 사용). pushCorner는 매 렌더 새 참조라 deps 제외.
  useEffect(() => {
    if (edit) {
      pushCorner(corner.templateCornerId, {
        name,
        mainTitle,
        subTitle,
        subTitleIcon,
        cornerLayout,
        layoutDetail,
        recSource,
        recSourcePlan: recFullPlan.length ? JSON.stringify(recFullPlan) : null,
        ...showItems, // 코너별 표시 항목 → 미리보기 즉시 반영
        // 빅배너·하단CTA·배너위치는 '코너 구성' 컨트롤에서 즉시 저장(revalidate로 프리뷰 반영) → 여기 draft에서 제외
      });
    } else {
      pushCorner(corner.templateCornerId, null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit, name, mainTitle, subTitle, subTitleIcon, cornerLayout, layoutDetail, recSource, recPrimaryPlan, recPersonalized, showItems, corner.templateCornerId]);

  // 언마운트(코너 전환) 시 미리보기 정리
  useEffect(() => () => pushCorner(corner.templateCornerId, null), [corner.templateCornerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 취소: 저장 전 변경 되돌리기 (제어 필드 복원 + 비제어 필드 remount)
  const revert = () => {
    setCt(corner.cornerType);
    setName(corner.name);
    setMainTitle(corner.mainTitle ?? '');
    setSubTitle(corner.subTitle ?? '');
    setSubTitleIcon(corner.subTitleIcon ?? '사용안함');
    setLayoutDetail(corner.layoutDetail ?? '');
    { const f = parseRecFull(); setRecPrimaryPlan(f.filter((m) => REC_AUTO_METHODS.includes(m)).filter((m, i, a) => a.indexOf(m) === i)); }
    setResetKey((k) => k + 1);
  };

  // 코너 유형·유형 상세는 빌더에서 수정 불가(카탈로그가 정의) → 선택지 목록은 더 이상 필요 없음.
  return (
    <div className="rounded-lg border bg-card p-4">
      {/* 헤더: '코너 정보' 라벨 + 액션 버튼은 한 줄 고정(줄바꿈 방지), 넓은 유형 칩은 아랫줄로 내려 터지지 않게 */}
      <div className="mb-3 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <p className="shrink-0 text-sm font-semibold">코너 정보</p>
          {edit ? (
            <button
              type="button"
              onClick={() => setLoadOpen((v) => !v)}
              className={cn(
                'ml-auto inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-medium',
                loadOpen ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary',
              )}
            >
              <Copy className="h-3 w-3" /> 코너 불러오기
            </button>
          ) : hasBuilderEdits ? (
            <button
              type="button"
              onClick={() => setEdit(true)}
              className="ml-auto inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-medium hover:bg-secondary"
            >
              <Pencil className="h-3 w-3" /> 수정
            </button>
          ) : (
            // 빌더에서 바꿀 게 없는 코너(업무 진입형 등) — 코너 정보는 읽기 전용, 수정은 코너 유형에서(2026-10-06).
            <span className="ml-auto inline-flex shrink-0 items-center gap-1 whitespace-nowrap">
              <span className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400"><Lock className="h-2.5 w-2.5" />읽기 전용</span>
              {typeEditLink}
            </span>
          )}
        </div>
      </div>

      {!edit || !hasBuilderEdits ? (
        <CornerInfoView corner={corner} nameMap={nameMap} />
      ) : (
      <>
      {/* 코너 불러오기: 코너 추가와 동일한 그룹형 모달(코너 유형 관리 기준)로 이 슬롯 유형을 교체 */}
      <CornerLoadModal
        open={loadOpen}
        onClose={() => setLoadOpen(false)}
        templateId={templateId}
        cornerTypes={library.cornerTypes}
        nameMap={nameMap}
        swapCornerId={corner.templateCornerId}
        current={{ base: corner.cornerType, detail: (corner.layoutDetail ?? '').replace(/\s*·\s*빅배너\s*$/, '') }}
      />

      <form key={resetKey} action={updateCornerMeta.bind(null, templateId, corner.id)} className="grid grid-cols-2 gap-3">
        {/* 수정 가능/불가 구분 범례 — 빌더에서 바꾸는 값 vs 코너 유형에서 정의(읽기 전용). 2026-10-01 사용자 요청 */}
        <div className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-[#E8ECEF] bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1"><Pencil className="h-3 w-3 text-indigo-500" /><b className="text-slate-600">빌더에서 수정</b> · 추천 수급(CVM) · 노출 타입·문구 베리에이션 · 순서·위치 고정</span>
          <span className="text-slate-300">|</span>
          <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3 text-slate-400" /><b className="text-slate-600">코너 유형에서 정의(읽기 전용)</b> · 유형·배열 · 타이틀·서브 · 표시 항목 · 카테고리 탭 · 미 노출 조건 · 코너 설명 — ‘코너 유형에서 수정’</span>
        </div>
        {/* 공통 */}
        <div className="col-span-2 space-y-1">
          <label className="text-[11px] text-muted-foreground">코너명 *</label>
          <Input name="name" value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-xs" required />
        </div>
        {/* 코너 유형·유형 상세는 코너 유형 관리(카탈로그)가 정하는 '정체성'이라 빌더에서 수정 불가.
            변경은 위 '코너 불러오기'로 다른 유형을 불러와 슬롯을 교체한다. 값은 hidden으로 보존. */}
        <input type="hidden" name="cornerType" value={ct} />
        <input type="hidden" name="layoutDetail" value={layoutDetail} />
        <div className="col-span-2 space-y-1">
          <label className="text-[11px] text-muted-foreground">코너 유형 (코너 유형 관리에서 관리)</label>
          <div className="rounded-md border bg-muted/30 px-2.5 py-1.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <CornerTypeChip corner={corner} />
              <span className="ml-auto shrink-0 whitespace-nowrap text-[10px] text-muted-foreground">유형 변경은 ‘코너 불러오기’로</span>
            </div>
            {/* 거버넌스 반영 — 코너 유형 관리와 동일 규칙을 이 코너에도 표시 */}
            <CornerGovernance base={ct} layoutDetail={layoutDetail} />
          </div>
        </div>

        {/* 배너 규격(사이즈)은 '코너 구성'의 배너 레일로 이동 — 배너 추가·순서·노출 방식과 한 곳에서 관리. */}

        {/* 상단 카테고리 탭 토글 — 탭은 별도 배열이 아니라 선택형 컴포넌트. 이 유형이 선택형을 허용할 때만.
            업무 진입형 탭형은 탭 자체가 콘텐츠라 토글을 두지 않는다(항상 탭). */}
        {!isQuickEntryTab && isComponentAllowedInCorner(ct as CornerType, '선택형') && (() => {
          const hasTab = corner.components.some((c) => c.componentType === '선택형');
          // 상단 카테고리 탭 = 코너 정의 → 읽기 전용(코너 유형에서 수정). 2026-10-06.
          return (
            <div className="col-span-2 flex items-center justify-between gap-2 rounded-md border bg-slate-50/60 px-2.5 py-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600"><Lock className="h-3 w-3 text-slate-400" />상단 카테고리 탭 <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">{hasTab ? '켜짐' : '꺼짐'}</span></span>
              {typeEditLink}
            </div>
          );
        })()}

        {/* 추천 수급 방식 — 자동 방식(CVM/룰)을 우선순위로 편성 + 운영자 편성(최하단 고정 폴백). (정책 근거: CVM 개인화 / 룰=노출조건 PI-DSP-RUL-001 / 대체 전시 PI-DSP-PER-002) */}
        {isRecCorner && (
          <div className="col-span-2 space-y-2 rounded-md border border-violet-200 bg-violet-50/40 p-2.5">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-700">추천 수급 방식 <span className="font-normal text-violet-400">· 자동 우선 → 없으면 운영자 편성</span></label>
            {/* 폼 제출값: 대표(1순위) + 전체 편성 JSON(자동 방식 + 운영자 편성 최하단) */}
            <input type="hidden" name="recSource" value={recSource} />
            <input type="hidden" name="recSourcePlan" value={recFullPlan.length ? JSON.stringify(recFullPlan) : ''} />
            {recPrimaryPlan.length === 0 ? (
              <p className="text-[10px] text-muted-foreground">자동 추천 방식 없음 — 운영자 편성(아래에서 직접 구성한 항목)만 노출됩니다.</p>
            ) : (
              <div className="space-y-1.5">
                {recPrimaryPlan.map((m, i) => {
                  const others = REC_AUTO_METHODS.filter((x) => x === m || !recPrimaryPlan.includes(x)); // 중복 방지(자기 자신 포함)
                  return (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className={cn('inline-flex h-7 shrink-0 items-center rounded-md px-1.5 text-[10px] font-bold', i === 0 ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-600')}>
                        {i === 0 ? '1순위' : `${i + 1}·폴백`}
                      </span>
                      <Select value={m} onChange={(e) => setRecPrimaryPlan((p) => p.map((x, j) => (j === i ? e.target.value : x)))} className="h-7 flex-1 text-xs">
                        {others.map((s) => <option key={s} value={s}>{s} — {REC_SOURCE_INFO[s].tag}</option>)}
                      </Select>
                      <button type="button" onClick={() => setRecPrimaryPlan((p) => (i > 0 ? p.map((x, j) => (j === i - 1 ? p[i] : j === i ? p[i - 1] : x)) : p))} disabled={i === 0}
                        className="flex h-7 w-6 items-center justify-center rounded border text-muted-foreground hover:bg-secondary disabled:opacity-30" title="위로">↑</button>
                      <button type="button" onClick={() => setRecPrimaryPlan((p) => (i < p.length - 1 ? p.map((x, j) => (j === i + 1 ? p[i] : j === i ? p[i + 1] : x)) : p))} disabled={i === recPrimaryPlan.length - 1}
                        className="flex h-7 w-6 items-center justify-center rounded border text-muted-foreground hover:bg-secondary disabled:opacity-30" title="아래로">↓</button>
                      <button type="button" onClick={() => setRecPrimaryPlan((p) => p.filter((_, j) => j !== i))}
                        className="flex h-7 w-6 items-center justify-center rounded border text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="제거">−</button>
                    </div>
                  );
                })}
              </div>
            )}
            {/* 자동 방식 추가 (CVM/룰 중 남은 것) */}
            {(() => { const rest = REC_AUTO_METHODS.filter((x) => !recPrimaryPlan.includes(x)); return rest.length > 0 && (
              <button type="button" onClick={() => setRecPrimaryPlan((p) => [...p, rest[0]])}
                className="inline-flex items-center gap-0.5 rounded-md border border-violet-300 bg-violet-50 px-2 py-1 text-[11px] font-medium text-violet-700 hover:bg-violet-100">
                + 자동 방식 추가{recPrimaryPlan.length ? ' (폴백)' : ''}
              </button>
            ); })()}
            {/* 운영자 편성 — 항상 최하단 폴백(토글 아님). 정책상 대체 전시(PI-DSP-PER-002) 필수 + 운영자가 코너 구성에 짠 항목이 곧 폴백이라 늘 켜짐(빈 코너 방지). */}
            <div className="flex items-start gap-2 rounded-md border border-violet-200 bg-violet-50/60 px-2.5 py-2">
              <span className="mt-0.5 inline-flex h-4 shrink-0 items-center rounded bg-violet-600 px-1.5 text-[9px] font-bold text-white">최종 폴백</span>
              <span className="flex flex-col">
                <span className="text-[11px] font-semibold text-violet-800">운영자 편성 · 직접 구성 <span className="ml-0.5 rounded bg-violet-100 px-1 text-[9px] font-medium text-violet-500">항상 최하단 고정</span></span>
                <span className="text-[10px] text-violet-500/80">자동 방식에 후보가 없으면 <b>아래에서 직접 구성한 항목</b>이 폴백으로 노출돼요. 대체 전시는 필수라 항상 켜져 있어요(빈 코너 방지). 특정 상황에 숨기려면 ‘미 노출 조건’으로 처리해요.</span>
              </span>
            </div>
            {/* 개인화 표기 안내 — 1순위가 개인화(CVM)일 때만 */}
            {recPersonalized && (
              <p className="text-[10px] leading-relaxed text-violet-600/90">1순위가 개인화(CVM) 방식이라, 로그인·동의 시에만 개인화 추천으로 표기돼요.</p>
            )}
            {/* 카드별 추천 근거는 표시 안 함 — 빌더는 실제 고객이 없어 '폴백(운영자 편성)' 상태를 보여준다.
                추천 근거(왜 추천했는지)는 런타임에 CVM이 고객별로 생성하는 값이라 빌더 미리보기에는 표시하지 않는다. */}
            {recPersonalized && (
              <p className="rounded-md border border-violet-200 bg-violet-50/50 px-2.5 py-1.5 text-[10px] leading-relaxed text-violet-600/90">
                빌더 미리보기는 <b className="font-semibold">폴백(운영자 편성)</b> 상태예요. 실제 노출은 고객마다 이 방식으로 추천되고, 추천 근거도 그때 CVM이 만들어요.
              </p>
            )}
          </div>
        )}

        {/* 카드 비율·빅배너·하단 CTA 등 표시 옵션은 '코너 구성'의 컨트롤로 이동 — 코너 정보에서는 관리하지 않음. */}
        {/* 코너 마크업 ID 필드는 표시하지 않음 (값은 보존) */}
        <input type="hidden" name="markupId" value={corner.markupId ?? ''} />

        {/* FO 사용자 설정 — 메뉴 리스트 코너에서만. 켜면 고객이 편집할 수 있고, 노출 개수 범위를 정한다. */}
        {isMenuListCorner && (
          <div className="col-span-2 space-y-2 rounded-md border border-sky-200 bg-sky-50/40 p-2.5">
            <label className="flex items-center justify-between gap-2">
              <span className="flex flex-col">
                <span className="text-xs font-semibold text-sky-800">FO 사용자 설정 가능</span>
                <span className="text-[10px] text-sky-600/80">켜면 고객이 이 메뉴를 직접 편집(추가·삭제·순서)할 수 있어요. 고정 항목은 그대로 유지.</span>
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
              <div className="grid grid-cols-2 gap-2 border-t border-sky-200/70 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-sky-700">고객 노출 최소 개수</label>
                  <Input name="userMinItems" type="number" min={0} value={userMin} onChange={(e) => setUserMin(e.target.value)} placeholder="예: 3 (고정 포함)" className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-sky-700">고객 노출 최대 개수</label>
                  <Input name="userMaxItems" type="number" min={0} value={userMax} onChange={(e) => setUserMax(e.target.value)} placeholder="예: 8" className="h-8 text-xs" />
                </div>
                <p className="col-span-2 text-[10px] text-sky-600/80">고객은 최소~최대 범위 안에서 항목을 노출/숨김할 수 있어요. 고정(🔒) 항목은 항상 포함되고 삭제 불가.</p>
              </div>
            )}
          </div>
        )}

        {/* 타이틀·서브타이틀 — 배너형은 코너 제목을 두지 않는다(배너 자체가 콘텐츠). 배너형이면 숨김 + 빈 값 제출로 정리. */}
        {ct === '배너형' ? (
          <>
            <input type="hidden" name="mainTitle" value="" />
            <input type="hidden" name="subTitle" value="" />
            <input type="hidden" name="subTitleIcon" value="사용안함" />
          </>
        ) : isQuickEntryTab ? (
          <>
            {/* 업무 진입형 탭형: 탭 자체가 콘텐츠라 타이틀·서브타이틀 UI를 두지 않음. 값은 보존(hidden). */}
            <input type="hidden" name="mainTitle" value={mainTitle} />
            <input type="hidden" name="subTitle" value={subTitle} />
            <input type="hidden" name="subTitleIcon" value={subTitleIcon} />
          </>
        ) : (
          <>
            {/* 타이틀·서브타이틀 문구 = CVM 타겟별 택1(베리에이션). 빌더에선 base를 직접 안 바꾸고, 후보는 문구 베리에이션에서. 미리보기=폴백(첫 후보). 2026-10-06 사용자 결정(C). */}
            <div className="col-span-2 flex flex-wrap items-center justify-between gap-1 rounded-md bg-violet-50 px-2 py-1">
              <span className="text-[10px] font-medium text-violet-700">타이틀·서브타이틀 문구는 <b>CVM이 타겟별로 택1</b> · 미리보기는 폴백(첫 후보)</span>
              <span className="text-[10px] font-medium text-violet-500">후보 편집: 컴포넌트 ‘수정 → 문구 베리에이션’</span>
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">타이틀 <span className="font-normal text-muted-foreground/70">· 폴백(첫 후보) · CVM 택1</span></label>
              <Textarea name="mainTitle" value={mainTitle} disabled readOnly placeholder="(문구 베리에이션의 첫 후보)" className="min-h-[44px] cursor-not-allowed bg-slate-50 text-xs text-slate-500" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">서브타이틀 <span className="font-normal text-muted-foreground/70">· 폴백</span></label>
              <Input name="subTitle" value={subTitle} disabled readOnly placeholder="(문구 베리에이션의 첫 후보)" className="h-8 cursor-not-allowed bg-slate-50 text-xs text-slate-500" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">서브타이틀 화살표</label>
              <Select name="subTitleIcon" value={subTitleIcon} disabled className="h-8 cursor-not-allowed bg-slate-50 text-xs text-slate-500">
                {SUBTITLE_ICONS.map((t) => (
                  <option key={t} value={t}>
                    {t === '화살표' ? '화살표(›) 표시' : '표시 안 함'}
                  </option>
                ))}
              </Select>
            </div>
          </>
        )}
        {/* 코너 레이아웃 필드는 표시하지 않음 (값 보존 · 배치는 유형 상세로 추론) */}
        <input type="hidden" name="cornerLayout" value={cornerLayout} />

        {/* 최소/최대 노출 개수 필드는 표시하지 않음 (값은 보존) */}
        <input type="hidden" name="minItems" value={corner.minItems ?? ''} />
        <input type="hidden" name="maxItems" value={corner.maxItems ?? ''} />

        {/* 코너별 표시 항목 — 코너 유형 세부 항목의 코너 단위 오버라이드. 값은 항상 제출(round-trip), UI는 상품형에만. */}
        <input type="hidden" name="showImage" value={showItems.showImage ? '1' : ''} />
        <input type="hidden" name="showPrice" value={showItems.showPrice ? '1' : ''} />
        <input type="hidden" name="showBadge" value={showItems.showBadge ? '1' : ''} />
        <input type="hidden" name="showDesc" value={showItems.showDesc ? '1' : ''} />
        {hasProductComp && (
          <div className="col-span-2 space-y-1.5 rounded-md border bg-slate-50/60 p-2.5">
            {/* 표시 항목 = 코너 유형 세부 항목에서 정의 → 빌더에선 읽기 전용(2026-10-06 사용자 결정). 값은 hidden으로 round-trip 보존. */}
            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600"><Lock className="h-3 w-3 text-slate-400" />표시 항목 <span className="font-normal text-slate-400">· 이 코너 카드에 보일 요소</span></label>
              {typeEditLink}
            </div>
            <div className="flex flex-wrap gap-x-2 gap-y-1.5">
              {([
                ['showImage', '상품 이미지'],
                ['showBadge', '배지'],
                ['showPrice', '가격'],
                ['showDesc', '설명'],
              ] as const).map(([key, label]) => {
                const on = showItems[key] && !(key === 'showBadge' && !showItems.showPrice);
                return (
                  <span key={key} className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]', on ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-400')}>
                    {on ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}{label}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* 상품형 전용: 상품 노출 순서 */}
        {family === 'product' && (
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              상품 노출 순서
              {recPersonalized && <span className="rounded bg-violet-100 px-1 py-[1px] text-[9px] font-semibold text-violet-600" title="CVM 수급이라 노출 순서를 CVM이 고객마다 결정합니다">CVM이 결정 · 선택 불가</span>}
            </label>
            {/* CVM(1순위 개인화) 수급이면 정렬을 CVM이 결정 → 선택 불가. 운영자 편성이면 직접 정렬. (유형 관리의 '노출 구성' 잠금과 동일 규칙) */}
            <Select name="sortStrategy" defaultValue={corner.sortStrategy ?? ''} disabled={recPersonalized} className="h-8 text-xs disabled:cursor-not-allowed disabled:opacity-60">
              {PRODUCT_SORT_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
        )}
        {/* 미 노출 조건 — 코너 정의로 분류, 빌더에선 읽기 전용(코너 유형에서 수정). 2026-10-06 사용자 결정. 값은 hidden으로 보존. */}
        {isRecCorner && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-1 text-[11px] text-slate-600"><Lock className="h-3 w-3 text-slate-400" />미 노출 조건 <span className="text-muted-foreground/60">· 데이터 없음/조건 미충족 시 숨김</span></label>
              {typeEditLink}
            </div>
            <input type="hidden" name="noDisplayCondition" value={corner.noDisplayCondition ?? '선택 없음'} />
            <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">{corner.noDisplayCondition ?? '선택 없음'}</span>
          </div>
        )}
        {/* 하단 CTA(더보기/전체보기) 버튼은 '코너 구성'의 MoreButtonControl로 이동 — 코너 정보에서는 관리하지 않음. */}

        {/* 코너 설명 — 코너 정의로 분류, 빌더에선 읽기 전용(코너 유형에서 수정). 2026-10-06 사용자 결정. 값은 hidden으로 보존. */}
        <input type="hidden" name="description" value={corner.description ?? ''} />
        {!isQuickEntryTab && (
          <div className="col-span-2 space-y-1">
            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-1 text-[11px] text-slate-600"><Lock className="h-3 w-3 text-slate-400" />코너 설명</label>
              {typeEditLink}
            </div>
            <p className="min-h-[20px] whitespace-pre-line rounded-md bg-slate-50/60 px-2.5 py-1.5 text-[11px] text-slate-600">{corner.description || <span className="text-slate-400">—</span>}</p>
          </div>
        )}

        {/* 저장 / 취소 — 우측 하단 */}
        <div className="col-span-2 flex justify-end gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              revert();
              setLoadOpen(false);
              setEdit(false);
            }}
          >
            취소
          </Button>
          <Button type="submit" size="sm">
            <Check className="mr-1 h-3.5 w-3.5" /> 저장
          </Button>
        </div>
      </form>

      {/* 코너 유형은 '코너 유형 관리'에서만 등록·관리한다(단일 원본). 여기서는 등록된 유형을 고르기만 한다. */}
      <p className="mt-3 rounded-md border border-dashed bg-muted/20 px-2.5 py-2 text-[11px] text-muted-foreground">
        코너 유형은{' '}
        <a href="/admin/corner-types" className="font-medium text-primary hover:underline">
          코너 유형 관리
        </a>
        에서 등록·관리합니다. 여기서는 등록된 유형만 선택할 수 있어요.
      </p>
      </>
      )}
    </div>
  );
}

// ── 배너 패널 (배너형 코너 전용 — 포탈2) ────────────────────

// ── 배너 라이브러리 모달 — 썸네일 그리드에서 예시 배너를 골라 코너에 적용 ──────────
function BannerLibraryModal({
  open,
  onClose,
  templateId,
  cornerId,
  banners,
  currentBannerId,
}: {
  open: boolean;
  onClose: () => void;
  templateId: string;
  cornerId: string;
  banners: LibraryData['banners'];
  currentBannerId: string | null;
}) {
  const [q, setQ] = useState('');
  const [pending, start] = useTransition();
  if (!open) return null;

  // 리시드 누적으로 같은 예시가 중복될 수 있어 이미지 기준 dedupe
  const seen = new Set<string>();
  const uniq = banners.filter((b) => {
    const k = b.imageUrl || b.name;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const query = q.trim().toLowerCase();
  const list = uniq.filter((b) => !query || b.name.toLowerCase().includes(query));

  const apply = (bannerId: string) => {
    const fd = new FormData();
    fd.set('bannerId', bannerId);
    start(async () => {
      await setCornerBanner(templateId, cornerId, fd);
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b px-5 py-3">
          <ImageIcon className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">배너 라이브러리</h2>
          <span className="text-xs text-muted-foreground">예시 배너를 골라 이 코너에 적용합니다</span>
          <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground" aria-label="닫기">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="border-b p-3">
          <div className="flex items-center gap-2 rounded-md border bg-background px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="배너 이름 검색…" className="h-9 flex-1 bg-transparent text-sm outline-none" autoFocus />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {/* 배너 해제 */}
            <button
              type="button"
              onClick={() => apply('')}
              disabled={pending}
              className={cn(
                'flex aspect-[16/9] flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground transition hover:border-primary/50 hover:bg-accent',
                !currentBannerId && 'border-primary bg-accent',
              )}
            >
              <X className="h-4 w-4" /> 배너 없음
            </button>
            {list.map((b) => {
              const active = b.id === currentBannerId;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => apply(b.id)}
                  disabled={pending}
                  className={cn(
                    'group overflow-hidden rounded-lg border text-left transition hover:ring-2 hover:ring-primary/40',
                    active ? 'border-primary ring-2 ring-primary/50' : 'border-border',
                  )}
                  title={b.name}
                >
                  {isImgSrc(b.imageUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.imageUrl} alt={b.name} className="aspect-[16/9] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-indigo-100 to-slate-200 text-[10px] text-slate-500">
                      {b.name}
                    </div>
                  )}
                  <p className="truncate px-2 py-1.5 text-[11px] font-medium text-foreground">{b.name}</p>
                </button>
              );
            })}
          </div>
          {list.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">검색 결과가 없습니다.</p>}
        </div>
      </div>
    </div>
  );
}

function BannerPanel({
  templateId,
  corner,
  banners,
  embedded,
}: {
  templateId: string;
  corner: CornerNode;
  banners: LibraryData['banners'];
  embedded?: boolean; // 빅배너 강조 카드 안에 넣을 때 = 자체 카드/제목 없이 선택 UI만
}) {
  const [mode, setMode] = useState<'library' | 'direct'>('library');
  const [imageUrl, setImageUrl] = useState('');
  const [libOpen, setLibOpen] = useState(false); // 배너 라이브러리 모달

  const canRenderImg = (u?: string | null) => !!u && (u.startsWith('data:') || u.startsWith('http') || u.startsWith('/'));

  return (
    <div className={embedded ? 'space-y-2' : 'rounded-lg border bg-card p-4'}>
      {!embedded && <p className="mb-0.5 text-sm font-semibold">상단 배너</p>}
      {!embedded && <p className="mb-2 text-[11px] text-muted-foreground">코너 상단에 크게 노출되는 배너입니다. (선택)</p>}
      <p className={cn('text-[11px] text-muted-foreground', embedded ? '' : 'mb-3')}>
        현재 배너: {corner.bannerName ? <b className="text-foreground">{corner.bannerName}</b> : '미지정'}
      </p>

      {/* ① 배너 선택 방식 (라디오로 라이브러리/직접 등록 전환) */}
      <div className="space-y-2 rounded-md border bg-muted/30 p-2.5">
        <div className="flex gap-4 text-[11px]">
          <label className="flex cursor-pointer items-center gap-1.5">
            <input type="radio" name="banner-mode" checked={mode === 'library'} onChange={() => setMode('library')} className="accent-primary" />
            라이브러리에서 선택
          </label>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input type="radio" name="banner-mode" checked={mode === 'direct'} onChange={() => setMode('direct')} className="accent-primary" />
            직접 등록
          </label>
        </div>

        {mode === 'library' ? (
          <div className="space-y-1.5">
            <Button type="button" size="sm" variant="secondary" className="w-full" onClick={() => setLibOpen(true)}>
              <ImageIcon className="mr-1 h-3.5 w-3.5" /> 배너 라이브러리에서 선택
            </Button>
            {/* 현재 적용된 배너 미리보기 */}
            {corner.bannerName ? (
              <div className="overflow-hidden rounded-md border bg-card">
                {canRenderImg(corner.bannerImageUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={corner.bannerImageUrl!} alt={corner.bannerName} className="aspect-[16/7] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[16/7] w-full items-center justify-center bg-gradient-to-br from-indigo-100 to-slate-200 text-[10px] text-slate-500">
                    {corner.bannerName}
                  </div>
                )}
                <p className="truncate px-2 py-1 text-[10px] text-muted-foreground">{corner.bannerName}</p>
              </div>
            ) : (
              <div className="flex aspect-[16/7] w-full items-center justify-center rounded-md border border-dashed text-[10px] text-muted-foreground">
                미리보기 · ‘배너 라이브러리에서 선택’을 눌러 고르세요
              </div>
            )}
            <BannerLibraryModal
              open={libOpen}
              onClose={() => setLibOpen(false)}
              templateId={templateId}
              cornerId={corner.id}
              banners={banners}
              currentBannerId={corner.bannerId}
            />
          </div>
        ) : (
          <form action={createBanner.bind(null, templateId, corner.id)} className="grid grid-cols-1 gap-1.5">
            <Input
              name="imageUrl"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="이미지 URL"
              className="h-8 text-xs"
              required
            />
            {imageUrl && (
              <div className="flex items-center gap-2 rounded-md border bg-card p-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="선택한 배너" className="h-10 w-24 shrink-0 rounded object-cover" />
                <span className="truncate text-[10px] text-muted-foreground">
                  {imageUrl.startsWith('data:') ? '등록 이미지' : imageUrl}
                </span>
              </div>
            )}
            <Input name="linkUrl" placeholder="랜딩 URL (선택)" className="h-8 text-xs" />
            <Button type="submit" size="sm" className="w-fit">
              등록 + 이 코너에 적용
            </Button>
          </form>
        )}
      </div>

    </div>
  );
}

// ── 순서 베리에이션 예시(가안) ───────────────────────────────
//  운영자는 '기본 순서' 1벌만 짠다(위 리스트). 실서비스에선 CVM이 '비고정' 코너를 세그먼트/고객마다 자동 재정렬하고,
//  '위치 고정' 코너(퀵메뉴 등)는 항상 그 자리. 아래는 어떻게 달라질 수 있는지 보여주는 예시일 뿐(실제 순서는 CVM이 런타임 결정).
//  문구·노출 타입 베리에이션과 같은 원칙: 기본=폴백(미리보기 기준), 변주는 CVM 몫. 2026-10-06 사용자 결정(1안).
const ORDER_VAR_SEGMENTS = ['재방문 고객', '2030 신규', '혜택 보유'];
function OrderVariationExamples({ pinned, free }: { pinned: CornerNode[]; free: CornerNode[] }) {
  const [open, setOpen] = useState(false);
  // 세그먼트별 예시 순서 — 비고정 코너를 세그먼트 index만큼 회전(결정적). 실제 알고리즘 아님, 예시용.
  const rotate = (arr: CornerNode[], n: number) => arr.map((_, i) => arr[(i + n) % arr.length]);
  const short = (c: CornerNode) => (c.mainTitle || c.title || c.name || '').split('\n')[0].slice(0, 10) || c.name;
  return (
    <div className="mt-2 rounded-lg border border-violet-200 bg-violet-50/50 p-2.5">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-1.5 text-left">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-500" />
        <span className="text-[11px] font-semibold text-violet-700">세그먼트별 예시 순서</span>
        <span className="rounded bg-violet-600 px-1 py-0.5 text-[9px] font-bold text-white">가안</span>
        <span className="ml-auto text-[10px] text-violet-400">{open ? '접기' : '펼치기'}</span>
      </button>
      <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
        운영자가 짠 <b>기본 순서</b>는 위 리스트예요. 실서비스에선 <b>CVM이 비고정 코너를 세그먼트별로 자동 재정렬</b>하고,
        <b className="text-indigo-600"> 위치 고정</b> 코너는 항상 그 자리. 아래는 예시입니다.
      </p>
      {open && (
        <div className="mt-2 space-y-2">
          {ORDER_VAR_SEGMENTS.map((seg, si) => (
            <div key={seg} className="rounded-md border border-[#e8ebef] bg-white p-2">
              <p className="mb-1 flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-600">
                <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[9.5px] text-violet-600">{seg}</span>
              </p>
              <div className="flex flex-wrap items-center gap-1">
                {pinned.map((c) => (
                  <span key={c.templateCornerId} className="inline-flex items-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
                    <Lock className="h-2.5 w-2.5" />{short(c)}
                  </span>
                ))}
                {rotate(free, si).map((c, i) => (
                  <span key={c.templateCornerId} className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-600">
                    <span className="text-slate-400 tabular-nums">{pinned.length + i + 1}</span>{short(c)}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <p className="text-[9.5px] leading-relaxed text-slate-400">* 예시(가안)입니다. 실제 순서·매칭은 CVM이 런타임에 결정하며, 미리보기는 운영자 기본 순서(폴백)를 보여줍니다.</p>
        </div>
      )}
    </div>
  );
}

// ── 좌측 고정 리스트의 코너 행 (클릭 선택 + dnd 순서) ─────────
function CornerListRow({
  templateId,
  corner,
  nameMap,
  selected,
  onSelect,
  locked = false,
}: {
  templateId: string;
  corner: CornerNode;
  nameMap: Record<string, string>;
  selected: boolean;
  onSelect: (id: string) => void;
  locked?: boolean; // 위치 고정 — 드래그 재정렬 불가(상단 고정 존)
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: corner.templateCornerId,
    disabled: locked,
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div
      ref={setNodeRef}
      id={`cl-${corner.templateCornerId}`}
      style={style}
      onClick={() => onSelect(corner.templateCornerId)}
      className={cn(
        'cursor-pointer rounded-md border p-2 scroll-mt-2',
        selected ? 'border-primary bg-accent' : 'bg-card hover:bg-muted/50',
        locked && !selected && 'border-indigo-200 bg-indigo-50/40',
        !corner.visible && 'opacity-55',
      )}
    >
      <div className="flex items-center gap-1.5">
        {locked ? (
          <span className="text-indigo-400" aria-label="위치 고정" title="위치 고정 — 드래그로 순서를 바꿀 수 없어요(아래 ‘고정’ 체크 해제 시 이동 가능)">
            <Lock className="h-4 w-4" />
          </span>
        ) : (
          <button
            className="cursor-grab text-muted-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            aria-label="순서 변경"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{corner.name}</span>
          {(corner.mainTitle || corner.title) && (
            <span className="truncate text-[10px] text-muted-foreground">{(corner.mainTitle || corner.title || '').split('\n')[0]}</span>
          )}
        </span>
        <form action={duplicateCorner.bind(null, templateId, corner.templateCornerId)} onClick={(e) => e.stopPropagation()}>
          <button className="text-muted-foreground hover:text-primary" aria-label="Corner 복제" title="복제">
            <Copy className="h-3.5 w-3.5" />
          </button>
        </form>
        <DeleteConfirmForm
          action={removeCorner.bind(null, templateId, corner.templateCornerId)}
          itemLabel={corner.cornerType === '배너형' ? '배너' : '코너'}
          childSummary={
            corner.cornerType === '배너형'
              ? undefined
              : corner.components.length
                ? `컴포넌트 ${corner.components.length}개 · Atom ${corner.components.reduce((s, c) => s + c.atoms.length, 0)}개`
                : undefined
          }
          ariaLabel={corner.cornerType === '배너형' ? '배너 삭제' : 'Corner 삭제'}
          stopPropagation
        />
      </div>
      <div className="mt-1 flex items-center gap-1.5 pl-5">
        <CornerTypeChip corner={corner} className="min-w-0 flex-1" />
        {!corner.visible && <Badge variant="outline" className="shrink-0">비노출</Badge>}
        {/* 위치 고정 체크박스 — 상단 퀵메뉴처럼 자리를 잠근다(드래그·CVM 자동 재정렬 제외) */}
        <form className="ml-auto shrink-0" action={toggleCornerPinned.bind(null, templateId, corner.templateCornerId)} onClick={(e) => e.stopPropagation()}>
          <button type="submit" aria-pressed={locked}
            title={locked ? '위치 고정됨 (클릭 시 해제 — 순서 변경 가능)' : '위치 고정 (클릭 시 상단에 잠금)'}
            className={cn('inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold transition', locked ? 'border-indigo-300 bg-indigo-100 text-indigo-700' : 'border-slate-200 bg-white text-slate-400 hover:border-indigo-300')}>
            <Lock className="h-3 w-3" /> 고정
          </button>
        </form>
        {/* 토글: 오른쪽 끝에 배치 */}
        <form className="shrink-0" action={toggleCornerVisible.bind(null, templateId, corner.templateCornerId)} onClick={(e) => e.stopPropagation()}>
          <button
            type="submit"
            role="switch"
            aria-checked={corner.visible}
            aria-label={corner.visible ? '비노출로 전환' : '노출로 전환'}
            title={corner.visible ? '노출 중 (클릭 시 비노출)' : '비노출 (클릭 시 노출)'}
            className={cn(
              'relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors',
              corner.visible ? 'bg-primary' : 'bg-slate-300',
            )}
          >
            <span
              className={cn(
                'inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform',
                corner.visible ? 'translate-x-3.5' : 'translate-x-0.5',
              )}
            />
          </button>
        </form>
      </div>

      {/* 화면에 추가된 배너를 좌측에 읽기 전용으로 표시 — 배너 변경/해제는 우측 코너 편집에서만(좌측에서 컨트롤 금지) */}
      {corner.bannerName && (
        <div className="mt-1.5 ml-5 flex items-center gap-1.5 rounded-md border border-dashed bg-muted/40 px-2 py-1">
          <ImageIcon className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
          <span className="flex-1 truncate text-[11px] text-muted-foreground">배너: {corner.bannerName}</span>
        </div>
      )}
    </div>
  );
}

// ── 배너 불러오기 모달 — 배너 캠페인 관리(전시관리)에 등록된 캠페인을 골라 배너형 코너로 편성 ───
function BannerLoadModal({
  open,
  onClose,
  templateId,
  campaigns,
  bannerCorners = [],
  fixedCornerId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  templateId: string;
  campaigns: NonNullable<LibraryData['bannerCampaigns']>;
  bannerCorners?: { id: string; name: string; count: number }[];
  fixedCornerId?: string; // 지정 시: 항상 이 배너 코너에 추가(캐러셀). '담을 위치' 선택 숨김. (코너 구성 배너 레일에서 사용)
  onCreated?: (templateCornerId: string) => void;
}) {
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState<string | null>(null);
  const [selSize, setSelSize] = useState<string | null>(null); // 가져올 배너 규격(사이즈)
  // fixedCornerId면 항상 그 코너에 추가. 아니면 'new'(새 코너) 또는 기존 배너 코너 id.
  const [target, setTarget] = useState<string>(fixedCornerId ?? 'new');
  const [pending, start] = useTransition();
  if (!open) return null;
  const list = campaigns.filter((c) => (q ? (c.title.includes(q) || c.campaignCode.toLowerCase().includes(q.toLowerCase())) : true));
  const sel = campaigns.find((c) => c.id === selId) ?? null;
  const pick = (id: string, size: string | null) => start(async () => { const tcId = await importBannerCampaignCorner(templateId, id, size ?? undefined, target === 'new' ? undefined : target); onClose(); if (tcId) onCreated?.(tcId); });
  const sizeOf = (detail: string) => { const m = detail.match(/(\d+)\s*[×xX*]\s*(\d+)/); return m ? { w: Number(m[1]), h: Number(m[2]) } : null; };
  const chooseBanner = (id: string) => { setSelId(id); const szs = campaigns.find((c) => c.id === id)?.sizes ?? []; setSelSize(szs[0]?.detail ?? null); };
  const allSizes = sel?.sizes ?? [];
  const curSize = allSizes.find((s) => s.detail === selSize) ?? allSizes[0] ?? null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b px-5 py-3">
          <GalleryHorizontalEnd className="h-4 w-4 text-indigo-500" />
          <h2 className="text-sm font-semibold">배너 불러오기 <span className="font-normal text-muted-foreground">· 배너 캠페인 관리</span></h2>
          <span className="text-xs text-muted-foreground">직접 만들기(텍스트+서브문구) 배너만 불러올 수 있어요</span>
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-[1fr_1.1fr]">
          {/* 목록 (썸네일 포함) */}
          <div className="flex min-h-0 flex-col border-r">
            <div className="p-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="배너캠페인 ID·타이틀 검색" className="h-9 pl-8 text-sm" autoFocus />
              </div>
            </div>
            <div className="flex-1 divide-y overflow-y-auto">
              {list.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">불러올 수 있는 배너가 없습니다.<br /><span className="text-[12px]">배너 캠페인 관리에서 <b>직접 만들기</b>(텍스트+서브문구)로 등록한 배너만 불러올 수 있어요. (이미지형 제외)</span></p>
              ) : list.map((c) => (
                <button key={c.id} type="button" onClick={() => chooseBanner(c.id)}
                  className={cn('flex w-full items-center gap-3 px-4 py-3 text-left', selId === c.id ? 'bg-accent' : 'hover:bg-slate-50')}>
                  <div className="flex h-10 w-16 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50">
                    {isImgSrc(c.thumbnailUrl)
                      ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={c.thumbnailUrl!} alt="" className="h-full w-full object-cover" />
                      : <GalleryHorizontalEnd className="h-4 w-4 text-slate-300" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{c.title}</p>
                    <p className="text-[11px] text-muted-foreground">{c.campaignCode} · {c.exposeYn ? '전시' : '미전시'}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          {/* 미리보기 (선택 배너의 사이즈별 이미지) */}
          <div className="flex min-h-0 flex-col overflow-y-auto p-4">
            {sel ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{sel.title}</p>
                  <p className="text-[11px] text-muted-foreground">{sel.campaignCode} · {sel.exposeYn ? '전시' : '미전시'}</p>
                </div>
                {/* 가져올 배너 규격(사이즈) 선택 */}
                {allSizes.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium text-slate-500">가져올 규격 <span className="font-normal text-slate-400">· 코너에 이 규격으로 편성돼요 (이후 옵션에서 변경 가능)</span></p>
                    <div className="flex flex-wrap gap-1.5">
                      {allSizes.map((s) => (
                        <button key={s.detail} type="button" onClick={() => setSelSize(s.detail)}
                          className={cn('rounded-full border px-3 py-1.5 text-[12px] font-medium transition', (curSize?.detail === s.detail) ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300')}>
                          {s.detail || '기본'}
                        </button>
                      ))}
                    </div>
                    {/* 선택 규격 미리보기 */}
                    {curSize && (() => {
                      const sz = sizeOf(curSize.detail); const boxW = Math.min(340, sz ? sz.w / 2.1 : 300); const boxH = sz ? Math.min(240, boxW * (sz.h / sz.w)) : 130;
                      return (
                        <div className="pt-1">
                          <div className="overflow-hidden rounded-lg border border-slate-200" style={{ width: boxW, height: boxH, backgroundColor: curSize.bgColor || '#F1F5F9' }}>
                            {isImgSrc(curSize.imageUrl)
                              ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={curSize.imageUrl!} alt={sel.bannerAlt ?? sel.title} className="h-full w-full object-contain" />
                              : <div className="flex h-full w-full items-center justify-center text-[11px] text-slate-400">{sel.title}</div>}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-[12px] text-muted-foreground">등록된 배너 규격이 없습니다.<br />(배너 캠페인 관리에서 유형상세를 먼저 추가하세요)</div>
                )}

                {/* 어디에 담을지 — 코너 레일에서 열면(fixedCornerId) 항상 그 코너에 추가하므로 선택 숨김 */}
                {!fixedCornerId && (
                  <div className="space-y-1.5 border-t border-slate-100 pt-3">
                    <p className="text-[11px] font-medium text-slate-500">담을 위치 <span className="font-normal text-slate-400">· 기존 배너 코너에 추가하면 스와이프 캐러셀로 묶여요</span></p>
                    <select value={target} onChange={(e) => setTarget(e.target.value)} className="h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-[13px] outline-none focus:border-indigo-400">
                      <option value="new">＋ 새 배너 코너로 추가</option>
                      {bannerCorners.map((bc) => (
                        <option key={bc.id} value={bc.id}>{bc.name} (배너 {bc.count}장)에 추가</option>
                      ))}
                    </select>
                  </div>
                )}

                <Button type="button" onClick={() => pick(sel.id, curSize?.detail ?? null)} disabled={pending} className="w-full">
                  {pending ? '추가 중…' : fixedCornerId ? '이 코너에 배너 추가(캐러셀)' : target === 'new' ? (curSize ? `${curSize.detail || '기본'} 규격으로 새 코너 추가` : '이 배너로 새 코너 추가') : '이 배너 코너에 추가(캐러셀)'}
                </Button>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">왼쪽에서 배너를 선택하면<br />미리보기가 표시됩니다.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 코너 불러오기 모달 — 코너 유형(상품형·단일강조 등)에서 선택 + 유형 미리보기 ───
//  두 용도 공용: (1) 새 코너 추가(createCornerFromType), (2) 기존 슬롯 유형 교체(swapCornerId 지정 → swapCornerToType).
function CornerLoadModal({
  open,
  onClose,
  templateId,
  cornerTypes,
  nameMap,
  onCreated,
  swapCornerId,
  current,
  containerType,
}: {
  open: boolean;
  onClose: () => void;
  templateId: string;
  cornerTypes: LibraryData['cornerTypes'];
  nameMap: Record<string, string>;
  onCreated?: (templateCornerId: string) => void;
  swapCornerId?: string; // 지정 시 '교체' 모드 (이 templateCornerId 슬롯의 유형을 교체)
  current?: { base: string; detail: string } | null; // 현재 슬롯 유형(교체 모드에서 목록에 '현재' 표시)
  containerType?: string | null; // 컨테이너 유형(홈=MAIN 등) — 칩 사용 제어
}) {
  const [q, setQ] = useState('');
  const [baseFilter, setBaseFilter] = useState<string>('전체'); // 상단 유형 칩 필터(기본 서치처럼) — 2026-09-29 사용자 요청
  const [selId, setSelId] = useState<string | null>(null);
  const [useVariants, setUseVariants] = useState(false); // 베리에이션 함께 사용(실서비스 CVM 택1)
  const [pending, start] = useTransition();
  if (!open) return null;
  const isSwap = !!swapCornerId;

  // 정책상 '사용(active) + 승인·반영된(liveVersion)' 코너 유형만 불러올 수 있다.
  //  TM-DSP-021(미사용 제외) + PI-DSP-WFL-002/004(승인 완료 전 노출 후보 제외).
  //  + 칩 사용 제어: 홈(MAIN) 컨테이너에서는 칩 코너로 ChipHome만 허용(그 외 칩 코너 제외). (2026-09-28)
  const types = cornerTypes
    .filter((t) => t.active && t.liveVersion != null)
    .filter((t) => isChipAllowed(t.typeDetail, containerType))
    .map((t) => {
      const component = t.componentType ?? '';
      const bigBanner = !!t.bigBanner;
      const rest = layoutLabel(t.typeDetail); // 컴포넌트 제외 — 배열·레이아웃만. 빅배너는 배지로 분리
      return {
        id: t.id,
        base: t.baseCategory,
        name: t.name, // 케이스(코너) 이름 — 코너 유형 관리 '코너(케이스)' 열과 동일하게 노출
        component,
        detail: t.typeDetail ?? '',
        bigBanner,
        sampleImageUrl: t.sampleImageUrl ?? null,
        previewCorner: t.previewCorner ?? null,
        rest,
        // 검색은 이름 + 배열 + 유형 모두 매칭(코너 유형 관리와 동일 기준).
        label: `${t.name} ${rest} ${nameMap[t.baseCategory] ?? t.baseCategory}`,
      };
    });
  const query = q.trim().toLowerCase();
  // 상단 유형 칩 = 불러올 수 있는 코너 유형(거버넌스 순서). 선택 시 그 유형만 목록에 노출(기본 서치).
  const availBases = (() => {
    const order = CORNER_TYPES as readonly string[];
    return [...new Set(types.map((t) => t.base))].sort((a, b) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  })();
  const list = types.filter((t) => (baseFilter === '전체' || t.base === baseFilter) && (!query || t.label.toLowerCase().includes(query)));
  const sel = types.find((t) => t.id === selId) ?? null;

  const doAdd = () => {
    if (!sel) return;
    // 등록된 코너 유형 전체 스펙(레이아웃/마크업 등)을 상속해 추가하거나(추가), 기존 슬롯을 교체(swap).
    const fd = new FormData();
    fd.set('cornerTypeId', sel.id);
    if (!isSwap && useVariants) fd.set('useVariants', '1'); // 선택 유형의 전체 베리에이션을 코너에 등록(선택=기본)
    start(async () => {
      if (swapCornerId) {
        await swapCornerToType(templateId, swapCornerId, fd);
        onClose();
      } else {
        const newId = await createCornerFromType(templateId, fd);
        onClose();
        if (newId) onCreated?.(newId);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b px-5 py-3">
          <Copy className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">{isSwap ? '코너 유형 교체' : '코너 불러오기'}</h2>
          <span className="text-xs text-muted-foreground">{isSwap ? '다른 유형·배열을 고르면 이 슬롯이 교체됩니다' : '코너 유형에서 선택하면 미리보기가 표시됩니다'}</span>
          <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground" aria-label="닫기">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-[1fr_1.1fr]">
          {/* 목록 (코너 유형) */}
          <div className="flex min-h-0 min-w-0 flex-col border-r">
            <div className="space-y-2 p-3">
              <div className="flex items-center gap-2 rounded-md border bg-background px-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="코너 유형 검색…" className="h-9 flex-1 bg-transparent text-sm outline-none" autoFocus />
              </div>
              {/* 유형 칩 필터 — 상단에서 유형을 먼저 고르고 아래서 배열·레이아웃을 선택(2026-09-29 사용자 요청) */}
              <div className="flex flex-wrap gap-1.5">
                {['전체', ...availBases].map((bc) => {
                  const cnt = bc === '전체' ? types.length : types.filter((t) => t.base === bc).length;
                  const on = baseFilter === bc;
                  return (
                    <button
                      key={bc}
                      type="button"
                      onClick={() => setBaseFilter(bc)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition',
                        on ? 'border-primary bg-primary text-primary-foreground' : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40',
                      )}
                    >
                      {bc}
                      <span className={cn('tabular-nums', on ? 'text-primary-foreground/70' : 'text-slate-400')}>{cnt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-3 pb-3">
              {list.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">검색 결과가 없습니다.</p>}
              {/* 7 상위 유형 → 배열·레이아웃 그룹 (코너 유형 관리 거버넌스와 동일 구조) */}
              {(() => {
                const order = CORNER_TYPES as readonly string[];
                const bases = [...new Set(list.map((t) => t.base))].sort((a, b) => {
                  const ia = order.indexOf(a), ib = order.indexOf(b);
                  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
                });
                return bases.map((bc) => {
                  const items = list.filter((t) => t.base === bc);
                  const purpose = cornerTypePurpose(bc);
                  return (
                    <div key={bc}>
                      <div className="mb-1 flex items-center gap-2 px-0.5">
                        <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold', cornerTypeChipClass(bc))}>{bc}</span>
                        <span className="text-[10px] font-medium tabular-nums text-muted-foreground">배열·레이아웃 {items.length}</span>
                        {purpose && <span className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground/70">{purpose}</span>}
                      </div>
                      <div className="space-y-1">
                        {items.map((t) => {
                          const isCurrent = !!current && current.base === t.base && current.detail === (t.detail ?? ''); // 교체 모드: 현재 슬롯 유형
                          return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setSelId(t.id)}
                            className={cn(
                              'flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left',
                              selId === t.id ? 'border-primary bg-accent' : isCurrent ? 'border-slate-300 bg-slate-50' : 'hover:bg-muted/50',
                            )}
                          >
                            {isImgSrc(t.sampleImageUrl?.split('\n')[0]) && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={t.sampleImageUrl!.split('\n')[0]} alt="" className="h-8 w-12 shrink-0 rounded border object-cover object-top" />
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-medium text-foreground">{t.name}</span>
                              <span className="block truncate text-[11px] text-muted-foreground">{layoutLabel(t.detail) || componentLabel(t.component) || '기본'}</span>
                            </span>
                            {isCurrent && <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600">현재</span>}
                            {t.bigBanner && <BigBannerBadge className="shrink-0" />}
                          </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
          {/* 미리보기 */}
          <div className="flex min-h-0 min-w-0 flex-col overflow-y-auto p-4">
            {sel ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold', cornerTypeChipClass(sel.base))}>
                    {sel.base}
                  </span>
                  {sel.rest && <span className="text-xs text-muted-foreground">{sel.rest}</span>}
                  {sel.bigBanner && <BigBannerBadge />}
                </div>
                {(() => {
                  const imgs = (sel.sampleImageUrl ?? '').split('\n').map((s) => s.trim()).filter(Boolean).filter((s) => isImgSrc(s));
                  // 배너형(B안, 2026-10-06): sampleImageUrl이 공용 더미라 신뢰 불가 → 실제 배치된 코너 구성(previewCorner)을 그대로 렌더.
                  //  실제 등록된 배너만 노출(스와이프면 등록된 장수만큼). previewCorner가 없으면 스키매틱으로 폴백.
                  if (sel.base === '배너형' && sel.previewCorner) {
                    const bn = (sel.previewCorner.components ?? []).length;
                    return (
                      <div>
                        <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">미리보기 · {sel.base} › {layoutLabel(sel.detail) || '기본'} <span className="text-slate-400">· 실제 등록된 배너{bn > 1 ? ` ${bn}장` : ''}</span></p>
                        <div className="rounded-xl border border-[#E6E8EF] bg-[#F0F2F9] p-3">
                          <CornerBlock corner={sel.previewCorner} />
                        </div>
                      </div>
                    );
                  }
                  // 비-배너형: 실제 등록된 코너 렌더(sampleImageUrl)를 크게 보여준다(2026-10-06 사용자 요청).
                  const useReal = sel.base !== '배너형' && imgs.length > 0;
                  if (useReal) {
                    return (
                      <div>
                        <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">미리보기 · {sel.base} › {layoutLabel(sel.detail) || '기본'} <span className="text-slate-400">· 실제 등록된 코너</span></p>
                        <div className="rounded-xl border border-[#E6E8EF] bg-[#F0F2F9] p-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imgs[0]} alt="실제 등록된 코너" className="w-full rounded-lg border bg-white object-contain [filter:contrast(1.03)_saturate(1.05)]" />
                        </div>
                      </div>
                    );
                  }
                  return <TypeDetailPreview base={sel.base} component={sel.component} detail={sel.detail} bigBanner={sel.bigBanner} />;
                })()}
                {/* 베리에이션 사용 여부 + 기본 베리에이션 선택 (추가 모드에서만) */}
                {!isSwap && (() => {
                  const siblings = types.filter((t) => t.base === sel.base);
                  if (siblings.length < 2) return null;
                  return (
                    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <label className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-slate-700">
                        <input type="checkbox" checked={useVariants} onChange={(e) => setUseVariants(e.target.checked)} className="accent-indigo-600" />
                        베리에이션 함께 사용
                        <span className="text-[10px] font-normal text-muted-foreground">실서비스에서 CVM이 고객별로 택1 · 미리보기는 기본</span>
                      </label>
                      {useVariants && (
                        <div className="space-y-1.5">
                          <p className="text-[11px] text-muted-foreground">기본으로 가져올 베리에이션 (미리보기·폴백 기준)</p>
                          <div className="flex flex-wrap gap-1.5">
                            {siblings.map((s) => (
                              <button key={s.id} type="button" onClick={() => setSelId(s.id)}
                                className={cn('rounded-full border px-2.5 py-1 text-[12px] font-medium transition', selId === s.id ? 'border-indigo-600 bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}>
                                {layoutLabel(s.detail) || s.rest || '기본'}{selId === s.id && ' · 기본'}
                              </button>
                            ))}
                          </div>
                          <p className="text-[11px] text-muted-foreground">사용 시 이 유형의 <b className="text-slate-600">{siblings.length}개</b> 베리에이션이 코너에 등록되고, 선택한 것이 기본이 됩니다.</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
                <Button type="button" onClick={doAdd} disabled={pending} className="w-full">
                  {pending ? (isSwap ? '교체 중…' : '추가 중…') : isSwap ? '이 유형으로 교체' : useVariants ? '베리에이션과 함께 코너 추가' : '이 유형으로 코너 추가'}
                </Button>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                왼쪽 목록에서 코너 유형을 선택하면
                <br />
                미리보기가 표시됩니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BuilderEditor({
  meta,
  corners,
  library,
}: {
  meta: TemplateMeta;
  corners: CornerNode[];
  library: LibraryData;
}) {
  const templateId = meta.id;
  const [ids, setIds] = useState(corners.map((c) => c.templateCornerId));
  const [sel, setSel] = useState<string | null>(corners[0]?.templateCornerId ?? null);
  const [device, setDevice] = useState(DEVICES[0]);
  const [zoom, setZoom] = useState(0.8); // 미리보기 배율(비율 유지) — 기본 80%로 디바이스 전체가 보이게
  const [rightW, setRightW] = useState(440); // 우측 상세 패널 너비(px), 드래그로 조절
  const [leftW, setLeftW] = useState(300); // 좌측 코너 리스트 너비(px), 드래그로 조절
  const [leftOpen, setLeftOpen] = useState(true); // 좌측 패널 펼침/접힘
  const [rightOpen, setRightOpen] = useState(true); // 우측 패널 펼침/접힘
  // 캔버스 빈 영역 클릭 = 둘 다 토글(하나라도 열려 있으면 둘 다 접고, 둘 다 접혀 있으면 둘 다 펼침)
  const toggleBothPanels = () => { const anyOpen = leftOpen || rightOpen; setLeftOpen(!anyOpen); setRightOpen(!anyOpen); };
  const [loadCornerOpen, setLoadCornerOpen] = useState(false); // '코너 불러오기' 모달
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // 공용 드래그 리사이저. dir='right'는 오른쪽 패널(왼쪽으로 끌면 넓어짐), 'left'는 왼쪽 패널
  function startResize(dir: 'left' | 'right', e: React.PointerEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = dir === 'right' ? rightW : leftW;
    const move = (ev: PointerEvent) => {
      if (dir === 'right') setRightW(Math.min(820, Math.max(320, startW + (startX - ev.clientX))));
      else setLeftW(Math.min(560, Math.max(220, startW + (ev.clientX - startX))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.style.userSelect = '';
    };
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  // props 갱신 시 순서 동기화
  if (ids.length !== corners.length) setIds(corners.map((c) => c.templateCornerId));

  const byId = new Map(corners.map((c) => [c.templateCornerId, c]));
  const orderedRaw = ids.map((id) => byId.get(id)).filter(Boolean) as CornerNode[];
  for (const c of corners) if (!ids.includes(c.templateCornerId)) orderedRaw.push(c);
  // 위치 고정 코너는 항상 상단(고정 존). 각 그룹 내부 순서는 저장 순서 유지. (2026-10-06)
  const ordered = [...orderedRaw.filter((c) => c.pinned), ...orderedRaw.filter((c) => !c.pinned)];
  const pinnedCount = ordered.filter((c) => c.pinned).length;
  const orderedIds = ordered.map((c) => c.templateCornerId);

  const selectedCorner = (sel ? byId.get(sel) : undefined) ?? ordered[0] ?? null;
  const nameMap = cornerTypeNameMap(library); // 기준분류 → 코너 유형 카탈로그 표시명

  // 편집 중인 드래프트 → 미리보기 즉시 반영 (칩 / 코너 정보 / 비-칩 Atom)
  const [chipDraft, setChipDraft] = useState<ChipDraftState>(null);
  const pushChipPreview = (key: string, draft: ChipDraft | null) =>
    setChipDraft((prev) => (draft ? { key, draft } : prev?.key === key ? null : prev));
  const ChipPreviewProvider = ChipPreviewContext.Provider;

  const [cornerDraft, setCornerDraft] = useState<CornerDraftState>(null);
  const pushCornerPreview = (key: string, patch: CornerPatch | null) =>
    setCornerDraft((prev) => (patch ? { key, patch } : prev?.key === key ? null : prev));
  const CornerPreviewProvider = CornerPreviewContext.Provider;

  const [atomsDraft, setAtomsDraft] = useState<AtomsDraftState>(null);
  const pushAtomsPreview = (key: string, atoms: AtomNode[] | null) =>
    setAtomsDraft((prev) => (atoms ? { key, atoms } : prev?.key === key ? null : prev));
  const AtomsPreviewProvider = AtomsPreviewContext.Provider;

  const previewCorners = ordered
    .filter((c) => c.visible)
    .map((c) => {
      const pc = toPreviewCorner(c);
      // 코너 정보 실시간 반영
      if (cornerDraft && cornerDraft.key === c.templateCornerId) {
        const p = cornerDraft.patch;
        if (p.name !== undefined) pc.name = p.name;
        if (p.mainTitle !== undefined) pc.mainTitle = p.mainTitle || null;
        if (p.subTitle !== undefined) pc.subTitle = p.subTitle || null;
        if (p.subTitleIcon !== undefined) pc.subTitleIcon = p.subTitleIcon || null;
        if (p.cornerLayout !== undefined) pc.cornerLayout = p.cornerLayout || null;
        if (p.layoutDetail !== undefined) pc.layoutDetail = p.layoutDetail || null;
        if (p.bigBanner !== undefined) pc.bigBanner = p.bigBanner;
        if (p.cardShape !== undefined) pc.cardShape = p.cardShape;
        if (p.recSource !== undefined) pc.recSource = p.recSource;
        if (p.recSourcePlan !== undefined) pc.recSourcePlan = p.recSourcePlan;
        if (p.showRecReason !== undefined) pc.showRecReason = p.showRecReason;
        if (p.moreButtonUse !== undefined) pc.moreButtonUse = p.moreButtonUse;
        if (p.moreButtonLabel !== undefined) pc.moreButtonLabel = p.moreButtonLabel || null;
        if (p.bannerPosition !== undefined) pc.bannerPosition = p.bannerPosition || null;
        if (p.showImage !== undefined) pc.showImage = p.showImage;
        if (p.showPrice !== undefined) pc.showPrice = p.showPrice;
        if (p.showBadge !== undefined) pc.showBadge = p.showBadge;
        if (p.showDesc !== undefined) pc.showDesc = p.showDesc;
      }
      // 컴포넌트 Atom 실시간 반영 (칩 편집 · 비-칩 Atom 편집)
      pc.components = pc.components.map((comp) => {
        if (chipDraft && comp.id === chipDraft.key) {
          return {
            ...comp,
            selectedIndex: chipDraft.draft.selectedIndex,
            chipRows: chipDraft.draft.chipRows,
            atoms: chipDraft.draft.chips.map((ch, idx) => ({
              id: `draft-${idx}`,
              name: ch.content || `칩${idx + 1}`,
              atomType: 'TEXT',
              content: ch.content,
              imageUrl: ch.iconUrl || null,
              altText: ch.iconAlt || null,
              linkUrl: ch.linkUrl || null,
              menuRole: ch.menuRole,
            })),
          };
        }
        if (atomsDraft && comp.id === atomsDraft.key) {
          return {
            ...comp,
            atoms: atomsDraft.atoms.map((a) => ({
              id: a.componentAtomId,
              name: a.name,
              atomType: a.atomType,
              content: a.content,
              imageUrl: a.imageUrl,
              altText: a.altText,
              linkUrl: a.linkUrl,
            })),
          };
        }
        return comp;
      });
      return pc;
    });

  // 선택된 코너로 좌측 리스트 + 가운데 미리보기를 스크롤 (렌더/서버 반영 후 나타날 수 있어 재시도)
  useEffect(() => {
    if (!sel) return;
    let tries = 0;
    const tick = () => {
      const pv = document.getElementById(`pv-${sel}`);
      const cl = document.getElementById(`cl-${sel}`);
      if (pv) pv.scrollIntoView({ block: 'start', behavior: 'smooth' });
      if (cl) cl.scrollIntoView({ block: 'center', behavior: 'smooth' });
      // 새로 만든 코너는 서버 반영 후 DOM에 나타나므로, 아직 없으면 잠깐 뒤 재시도
      if ((!pv || !cl) && tries < 8) { tries += 1; setTimeout(tick, 120); }
    };
    const t = setTimeout(tick, 60);
    return () => clearTimeout(t);
  }, [sel]);

  function selectCorner(id: string) {
    setSel(id);
  }

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedIds.indexOf(String(active.id));
    if (oldIndex < 0 || ordered[oldIndex]?.pinned) return; // 위치 고정 코너는 재정렬 불가
    let newIndex = orderedIds.indexOf(String(over.id));
    if (newIndex < 0) return;
    if (newIndex < pinnedCount) newIndex = pinnedCount; // 고정 존(상단) 위로는 못 들어감
    const next = [...orderedIds];
    next.splice(newIndex, 0, next.splice(oldIndex, 1)[0]);
    setIds(next);
    await reorderCorners(templateId, next);
  }

  // 이탈 경고 — 카드 편집/드래프트가 열려 있으면(미저장) 페이지 이탈 시 브라우저 경고 (로드맵 1차: 이탈 경고 얼럿)
  const isDirty = !!(chipDraft || cornerDraft || atomsDraft);
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  return (
    <ChipPreviewProvider value={pushChipPreview}>
    <CornerPreviewProvider value={pushCornerPreview}>
    <AtomsPreviewProvider value={pushAtomsPreview}>
    <CornerLoadModal
      open={loadCornerOpen}
      onClose={() => setLoadCornerOpen(false)}
      templateId={templateId}
      cornerTypes={library.cornerTypes}
      nameMap={nameMap}
      containerType={meta.containerType}
      onCreated={(id) => selectCorner(id)}
    />
    <div
      className="grid flex-1 overflow-hidden transition-[grid-template-columns] duration-200"
      style={{ gridTemplateColumns: `${leftOpen ? leftW : 0}px minmax(0,1fr) ${rightOpen ? rightW : 0}px` }}
    >
      {/* 좌측: 고정 코너 리스트 + 유형 추가 (드래그로 너비 조절). 접히면 폭 0. */}
      <div className={cn('relative flex flex-col overflow-hidden border-r bg-card', !leftOpen && 'pointer-events-none opacity-0')}>
        <div
          onPointerDown={(e) => startResize('left', e)}
          title="드래그로 패널 너비 조절"
          className="absolute right-0 top-0 z-20 h-full w-1.5 translate-x-1/2 cursor-col-resize bg-transparent transition-colors hover:bg-primary/40"
        />
        <div className="border-b px-3 py-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            템플릿 배치
            {meta.isDefault && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">기본</span>}
            {isDirty && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700" title="편집 중인 카드가 있습니다. 완료를 눌러 저장하세요.">● 미저장</span>}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <b className="text-foreground">{meta.name}</b>
            <Badge variant="outline">{meta.conditionGroup}</Badge>
            <span>코너 {ordered.length}개</span>
            <span>· {meta.displayOn ? '전시' : '미전시'}</span>
          </p>
        </div>
        <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
              {ordered.map((corner, i) => (
                <div key={corner.templateCornerId}>
                  {/* 고정 존 ↔ 자유 재정렬 존 경계 표시 */}
                  {i === pinnedCount && pinnedCount > 0 && (
                    <p className="mb-1 mt-1.5 px-1 text-[10px] font-medium text-muted-foreground">↓ 순서 변경 가능 · CVM이 세그먼트별 자동 재정렬</p>
                  )}
                  <CornerListRow
                    templateId={templateId}
                    corner={corner}
                    nameMap={nameMap}
                    selected={selectedCorner?.templateCornerId === corner.templateCornerId}
                    onSelect={selectCorner}
                    locked={corner.pinned}
                  />
                </div>
              ))}
            </SortableContext>
          </DndContext>
          {ordered.length === 0 && (
            <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
              아래에서 Corner를 추가하세요.
            </p>
          )}
          {/* 순서 베리에이션(가안) — 운영자는 기본 순서 1벌, CVM이 세그먼트별로 비고정 코너를 자동 재정렬. 아래는 예시. */}
          {ordered.filter((c) => !c.pinned).length >= 2 && (
            <OrderVariationExamples pinned={ordered.filter((c) => c.pinned)} free={ordered.filter((c) => !c.pinned)} />
          )}

          {/* 배치 추가 — 코너 불러오기 / 배너 불러오기 */}
          <details className="rounded-md border bg-muted/20 p-2" open>
            <DisclosureButton>배치 추가</DisclosureButton>
            <div className="mt-2 space-y-2">
              {library.cornerTypes.length ? (
                // 배치 추가 = 코너 유형 관리에서 '코너 불러오기'. 배너형도 하나의 코너 유형 → 불러온 뒤 '코너 구성'의 배너 레일에서 여러 배너·노출 방식 설정.
                <>
                  <Button type="button" size="sm" variant="secondary" className="w-full" onClick={() => setLoadCornerOpen(true)}>
                    <Copy className="mr-1 h-3.5 w-3.5" /> 코너 불러오기
                  </Button>
                  <p className="text-[10px] text-muted-foreground"><b>코너 유형 관리</b>에 등록된 유형을 불러옵니다. <b>배너형</b>도 코너 유형이라 여기서 추가하고, 코너를 열어 <b>‘코너 구성’의 배너 레일</b>에서 배너 여러 장·규격·노출 방식(스와이프·자동)을 설정합니다.</p>
                </>
              ) : (
                // 카탈로그가 비어 있을 때만 자유 생성 (기준분류만)
                <form action={createCorner.bind(null, templateId)} className="grid grid-cols-2 gap-1.5">
                  <Input name="name" placeholder="새 Corner 이름" className="col-span-2 h-8 text-xs" required />
                  <Select name="cornerType" defaultValue="배너형" className="col-span-2 h-8 text-xs">
                    {CORNER_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                  <Button type="submit" size="sm" className="col-span-2 w-fit">
                    새 Corner 만들어 추가
                  </Button>
                </form>
              )}
            </div>
          </details>
        </div>

        {/* Template 정보 편집 (하단) — 템플릿 등록 항목 전체 */}
        <details className="border-t p-3">
          <summary className="cursor-pointer text-xs font-semibold">템플릿 정보 편집</summary>
          <form action={updateTemplateMeta.bind(null, templateId)} className="mt-2 space-y-2">
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">템플릿명 *</label>
              <Input name="name" defaultValue={meta.name} placeholder="템플릿명" className="h-8 text-xs" required />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">메모</label>
              <Input name="memo" defaultValue={meta.memo ?? ''} maxLength={30} placeholder="30자 이내" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">로그인 구분 *</label>
              <div className="flex gap-3 text-xs">
                {['로그인', '비로그인'].map((v) => (
                  <label key={v} className="flex items-center gap-1.5">
                    <input type="radio" name="conditionGroup" value={v} defaultChecked={meta.conditionGroup === v} className="accent-indigo-600" /> {v}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">기본 템플릿 여부 *</label>
                <div className="flex gap-3 text-xs">
                  {[
                    { v: 'N', on: !meta.isDefault },
                    { v: 'Y', on: meta.isDefault },
                  ].map((o) => (
                    <label key={o.v} className="flex items-center gap-1.5">
                      <input type="radio" name="isDefault" value={o.v} defaultChecked={o.on} className="accent-indigo-600" /> {o.v}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">전시 여부 *</label>
                <div className="flex gap-3 text-xs">
                  {[
                    { v: '전시', on: meta.displayOn },
                    { v: '미전시', on: !meta.displayOn },
                  ].map((o) => (
                    <label key={o.v} className="flex items-center gap-1.5">
                      <input type="radio" name="displayOn" value={o.v} defaultChecked={o.on} className="accent-indigo-600" /> {o.v}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <input type="checkbox" name="startAtOnApproval" defaultChecked={meta.startAtOnApproval} className="accent-indigo-600" /> 시작일을 승인일시로 설정
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">전시 기간 시작</label>
                <Input name="startAt" type="datetime-local" defaultValue={meta.startAt ?? ''} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">전시 기간 종료</label>
                <Input name="endAt" type="datetime-local" defaultValue={meta.endAt ?? ''} className="h-8 text-xs" />
              </div>
            </div>
            <Button type="submit" size="sm" variant="secondary" className="w-fit">
              저장
            </Button>
          </form>
        </details>
      </div>

      {/* 가운데: 실시간 디바이스 미리보기 */}
      <div className="flex flex-col overflow-hidden bg-background">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          {/* 좌측 패널 접기/펼치기 */}
          <button type="button" onClick={() => setLeftOpen((v) => !v)} title={leftOpen ? '좌측 패널 접기' : '좌측 패널 펼치기'}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-white text-muted-foreground hover:bg-muted">
            {leftOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>
          <div className="flex items-center gap-2">
            <select
              value={device.key}
              onChange={(e) => setDevice(DEVICES.find((d) => d.key === e.target.value) ?? DEVICES[0])}
              className="rounded-md border bg-white px-3 py-1.5 text-sm font-medium"
            >
              {DEVICES.map((d) => (
                <option key={d.key} value={d.key}>{d.label} · {d.w}×{d.h}</option>
              ))}
            </select>
            <div className="flex items-center gap-1 rounded-md border bg-white p-0.5">
              <button type="button" onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))} disabled={zoom <= 0.4} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30" title="축소">−</button>
              <button type="button" onClick={() => setZoom(0.8)} className="min-w-[42px] rounded px-1 text-center text-[11px] font-semibold tabular-nums text-muted-foreground hover:bg-muted" title="기본 크기(80%)">{Math.round(zoom * 100)}%</button>
              <button type="button" onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)))} disabled={zoom >= 1.5} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30" title="확대">＋</button>
            </div>
          </div>
          {/* 우측 패널 접기/펼치기 */}
          <button type="button" onClick={() => setRightOpen((v) => !v)} title={rightOpen ? '우측 패널 접기' : '우측 패널 펼치기'}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-white text-muted-foreground hover:bg-muted">
            {rightOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </button>
        </div>
        <div
          onClick={(e) => { if (e.target === e.currentTarget) toggleBothPanels(); }}
          title="빈 캔버스를 클릭하면 좌우 패널이 접히거나 펼쳐집니다"
          className="flex-1 overflow-auto bg-[radial-gradient(circle,#e2e8f0_1px,transparent_1px)] p-6 [background-size:16px_16px]"
        >
          {/* zoom(CSS)은 레이아웃까지 축소 → mx-auto가 항상 정확히 중앙 정렬(폭이 캔버스보다 클 때만 스크롤). */}
          {/* 디바이스 + 노출타입 슬롯(항상 예약)을 함께 중앙 정렬 — 슬롯 폭이 고정이라 코너 전환 시 디바이스가 안 튐. */}
          <div className="mx-auto flex w-fit items-start gap-8" style={{ zoom }}>
            <DeviceFrame width={device.w} bodyHeight={device.h - 150} headerLabel={meta.containerName}>
              {previewCorners.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
                  왼쪽에서 Corner를 추가하세요
                </div>
              ) : (
                previewCorners.map((c) => (
                  <div
                    key={c.id}
                    id={`pv-${c.id}`}
                    onClick={() => selectCorner(c.id)}
                    className={cn(
                      'scroll-mt-2 cursor-pointer rounded-2xl',
                      selectedCorner?.templateCornerId === c.id ? 'outline outline-2 outline-primary' : '',
                    )}
                  >
                    <CornerBlock corner={c} />
                  </div>
                ))
              )}
            </DeviceFrame>
            {/* 캔버스식 — 선택 코너의 '추가 노출 타입'만 디바이스 옆에 렌더 + 클릭해 변경. 기본은 디바이스에서 편집. */}
            {selectedCorner && (() => {
              const selPv = previewCorners.find((c) => c.id === selectedCorner.templateCornerId);
              return selPv ? <VariantSpread templateId={templateId} corner={selectedCorner} preview={selPv} cornerTypes={library.cornerTypes} /> : null;
            })()}
          </div>
        </div>
      </div>

      {/* 우측: 선택 코너 상세 (드래그로 너비 조절). 접히면 폭 0. */}
      <div className={cn('relative overflow-y-auto border-l bg-background p-4', !rightOpen && 'pointer-events-none opacity-0')}>
        <div
          onPointerDown={(e) => startResize('right', e)}
          title="드래그로 패널 너비 조절"
          className="absolute left-0 top-0 z-20 h-full w-1.5 -translate-x-1/2 cursor-col-resize bg-transparent transition-colors hover:bg-primary/40"
        />
        {selectedCorner ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CornerTypeChip corner={selectedCorner} />
              <h2 className="truncate text-base font-semibold">{selectedCorner.name}</h2>
            </div>

            {/* 개발 영향 안내 — 어드민이 무중단으로 바꿀 수 있는 것 / 개발 필요한 것 구분 */}
            <DevImpactGuide />

            {/* 코너 승인은 코너 유형 관리에서 처리한다. 빌더는 템플릿 전체를 승인 요청(상단 스트립). */}

            {/* 기존 코너 끌어오기는 아래 '코너 정보'의 '코너 불러오기' 버튼으로 통합됨 */}
            <CornerInfoForm key={selectedCorner.templateCornerId} templateId={templateId} corner={selectedCorner} library={library} nameMap={nameMap} />
            {/* 상단 배너 선택 UI는 '코너 구성'의 BigBannerControl 카드 안에 임베드됨(별도 패널 제거). */}
            <div className="rounded-lg border bg-card p-4">
              <p className="mb-0.5 text-sm font-semibold">코너 구성</p>
              <p className="mb-2 text-[11px] text-muted-foreground">
                {selectedCorner.cornerType === '배너형' ? '이 코너에 담긴 배너 · 규격 · 노출 방식' : '이 코너를 이루는 컴포넌트 · 표시 옵션'}
              </p>
              {selectedCorner.cornerType === '배너형' ? (
                // 배너형 = 배너 레일(여러 배너 + 규격 + 스와이프/자동). 상품 카드 옵션·컴포넌트 목록은 무관하므로 대체.
                <BannerRailControl templateId={templateId} corner={selectedCorner} campaigns={library.bannerCampaigns ?? []} />
              ) : (
                <>
                  {/* 카드 모양·더보기 CTA·빅배너 on/off는 코너 유형(정의)에서 관리 → 빌더에선 소재·개인화(CVM)만. 2026-09-29 거버넌스 분리 */}
                  <BigBannerControl templateId={templateId} corner={selectedCorner} banners={library.banners} />
                  <DisplayVariantsControl templateId={templateId} corner={selectedCorner} cornerTypes={library.cornerTypes} />
                  <CopyOverview templateId={templateId} corner={selectedCorner} />
                  <ComponentList templateId={templateId} corner={selectedCorner} library={library} />
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            왼쪽에서 코너를 선택하세요.
          </div>
        )}
      </div>
    </div>
    </AtomsPreviewProvider>
    </CornerPreviewProvider>
    </ChipPreviewProvider>
  );
}
