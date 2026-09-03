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
  NO_DISPLAY_CONDITIONS,
  cornerFamily,
  cornerTypeChipClass,
  cornerTypePurpose,
  ATOM_TYPES,
  ATOM_TYPE_LABELS,
  ATOM_TYPE_FIELDS,
  cvmBindingLabel,
  resolveCvmSample,
  isCvmBinding,
  REC_SOURCE_METHODS,
  REC_SOURCE_INFO,
  CVM_TARGET_HINTS,
  type AtomType,
  type CornerType,
} from '@/lib/display-taxonomy';
import { cn } from '@/lib/utils';
import { DeviceFrame, CornerBlock, type PreviewCorner } from '@/components/preview/blocks';
import { IconGlyph, isIconRef } from '@/lib/icon-library';
import { IconPickerModal } from './icon-picker-modal';
import { AssetPickerModal } from './asset-picker-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { GripVertical, Trash2, Plus, Copy, Image as ImageIcon, X, Pencil, Check, Link2, Search, Lock, Sparkles, Layers, PanelLeftClose, PanelRightClose, PanelLeftOpen, PanelRightOpen, List, Download } from 'lucide-react';
import { TypeDetailPreview } from '../../corner-types/corner-type-manager';
import {
  updateTemplateMeta,
  createCorner,
  createCornerFromType,
  removeCorner,
  duplicateCorner,
  toggleCornerVisible,
  reorderCorners,
  addBlankComponent,
  removeComponent,
  renameComponent,
  moveComponent,
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
  setCornerCardShape,
  setCornerTitleLines,
  setCornerDisplayVariants,
  setCornerMainTitleVariants,
  setCornerBigBanner,
  setCornerBannerPosition,
  setCornerMoreButton,
  addBssProduct,
} from '../actions';
import { BSS_PRODUCTS, BSS_CATEGORY_LABELS, BSS_SUBCATEGORIES, type BssCategory } from '@/lib/bss-products';

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
  atoms: AtomNode[];
};
export type CornerNode = {
  templateCornerId: string;
  id: string;
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
  bannerId: string | null;
  bannerName: string | null;
  bannerImageUrl: string | null;
  bannerPosition: string | null;
  sampleImageUrl: string | null;
  userCustomizable: boolean;
  userMinItems: number | null;
  userMaxItems: number | null;
  reviewStatus: string;
  reviewReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  visible: boolean;
  components: ComponentNode[];
};
export type LibraryData = {
  corners: { id: string; name: string; cornerType: string; layoutDetail?: string | null }[];
  components: { id: string; name: string; componentType: string; allowedCornerTypes: string[] }[];
  atoms: { id: string; name: string; atomType: string }[];
  banners: { id: string; name: string; imageUrl: string }[];
  cornerTypes: { id: string; name: string; baseCategory: string; componentType?: string | null; typeDetail?: string | null; bigBanner?: boolean; sampleImageUrl?: string | null; active: boolean; liveVersion?: number | null }[];
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
  const rest = [comp, detail].filter(Boolean).join(' · '); // 빅배너는 경로에서 빼고 별도 배지로
  return { base, rest, bigBanner };
}

// 렌더 가능한 이미지 소스인지(data URI · http · 유형 샘플 썸네일). 그 외 /assets 자리표시자는 제외.
const isImgSrc = (src?: string | null): src is string => !!src && (src.startsWith('data:') || src.startsWith('http') || src.startsWith('/assets/corner-samples/'));

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
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5', className)}>
      <span className={cn('inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold', cornerTypeChipClass(base))}>
        {base}
      </span>
      {rest && <span className="truncate text-xs text-muted-foreground">{rest}</span>}
      {bigBanner && <BigBannerBadge className="shrink-0" />}
    </span>
  );
}

export type TemplateMeta = {
  id: string;
  name: string;
  conditionGroup: string;
  startAt: string | null;
  endAt: string | null;
  containerName: string;
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
  return {
    id: c.templateCornerId,
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
    sampleImageUrl: c.sampleImageUrl,
    recSource: c.recSource,
    recSourcePlan: c.recSourcePlan,
    showRecReason: c.showRecReason,
    components: c.components.map((cc) => ({
      id: cc.cornerComponentId,
      name: cc.name,
      componentType: cc.componentType,
      selectedIndex: cc.selectedIndex,
      chipRows: cc.chipRows,
      atoms: cc.atoms.filter((a) => a.atomType === 'IMAGE' || a.visible !== false).map((a) => ({
        id: a.componentAtomId,
        name: a.name,
        atomType: a.atomType,
        content: a.content,
        contentVariants: a.contentVariants,
        imageUrl: a.imageUrl,
        altText: a.altText,
        linkUrl: a.linkUrl,
        menuRole: a.menuRole,
      })),
    })),
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
function SortableChipRow({
  i,
  chip,
  onEdit,
  onRemove,
  onOpenIcon,
  showMenuRole,
}: {
  i: number;
  chip: ChipItem;
  onEdit: (patch: Partial<ChipItem>) => void;
  onRemove: () => void;
  onOpenIcon: () => void;
  showMenuRole?: boolean;
}) {
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

      {/* 아이콘: 슬롯 자체가 불러오기 버튼(설정 시 아이콘, 미설정 시 +). ×로 해제 */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={onOpenIcon}
          title={chip.iconUrl ? '아이콘 변경 (라이브러리에서 끌어오기)' : '아이콘 불러오기'}
          className="flex h-8 w-8 items-center justify-center rounded-md border bg-slate-50 hover:border-primary/50 hover:bg-accent"
        >
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
            <Plus className="h-4 w-4 text-slate-400" />
          )}
        </button>
        {chip.iconUrl && (
          <button
            type="button"
            onClick={() => onEdit({ iconUrl: '', iconAlt: '' })}
            title="아이콘 해제"
            className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-500 text-white hover:bg-destructive"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        )}
      </div>

      <Input value={chip.content} onChange={(e) => onEdit({ content: e.target.value })} placeholder={`ChipLabel${String(i + 1).padStart(2, '0')}`} className="h-8 min-w-0 flex-1 text-xs" />
      <Input value={chip.linkUrl} onChange={(e) => onEdit({ linkUrl: e.target.value })} placeholder="이동 링크 URL" className="h-8 min-w-0 flex-1 text-xs" />
      {/* 고객 메뉴 역할: 고정(삭제불가) ↔ 편집가능 — 메뉴 리스트 코너에서만 */}
      {showMenuRole && (
        <button
          type="button"
          onClick={() => onEdit({ menuRole: chip.menuRole === 'FIXED' ? 'EDITABLE' : 'FIXED' })}
          title={chip.menuRole === 'FIXED' ? '고정 (고객이 삭제·이동 불가) — 클릭 시 편집가능' : '편집가능 (고객이 삭제·순서변경 가능) — 클릭 시 고정'}
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium transition',
            chip.menuRole === 'FIXED' ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-border text-muted-foreground hover:border-primary/40',
          )}
        >
          {chip.menuRole === 'FIXED' ? <><Lock className="h-3 w-3" /> 고정</> : <><Pencil className="h-3 w-3" /> 편집</>}
        </button>
      )}
      <button type="button" onClick={onRemove} className="shrink-0 text-muted-foreground hover:text-destructive" title="칩 삭제" aria-label="칩 삭제">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── 선택형(칩/탭) 편집기 = ChipPage (업무진입형.png) ─────────
// 완전 제어형: 개별 저장 없이 로컬 draft만 수정 → 미리보기 즉시 반영, 저장은 카드의 "완료"가 일괄 처리.
function ChipEditor({ draft, onChange, showMenuRole }: { draft: ChipDraft; onChange: (next: ChipDraft) => void; showMenuRole?: boolean }) {
  const { chips, selectedIndex, chipRows } = draft;
  const [iconFor, setIconFor] = useState<number | null>(null); // 아이콘 모달을 연 칩 index
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const setChips = (next: ChipItem[], sel = selectedIndex) =>
    onChange({ chips: next, selectedIndex: Math.max(0, Math.min(sel, Math.max(0, next.length - 1))), chipRows });
  const editChip = (i: number, patch: Partial<ChipItem>) =>
    setChips(chips.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const removeChip = (i: number) => setChips(chips.filter((_, idx) => idx !== i), selectedIndex > i ? selectedIndex - 1 : selectedIndex);
  // 드래그로 순서 변경 (선택된 칩도 함께 따라가도록 selectedIndex 보정)
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
  const addChip = () => setChips([...chips, { content: '', linkUrl: '', iconUrl: '', iconAlt: '', menuRole: 'EDITABLE' }]);

  return (
    <div className="mt-1 space-y-2 rounded-md bg-muted/40 p-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">Chips · 드래그로 순서 변경 · 편집 후 상단 “완료”로 일괄 저장</span>
        <span className="rounded bg-white px-1.5 py-0.5 text-[11px] font-semibold">{chips.length}</span>
      </div>

      {/* 각 칩 = 동일 레이아웃 한 줄: 드래그 핸들 · 아이콘(불러오기 버튼) · 라벨 · 이동 링크 · 삭제 */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={chips.map((_, i) => String(i))} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {chips.map((c, i) => (
              <SortableChipRow
                key={i}
                i={i}
                chip={c}
                onEdit={(patch) => editChip(i, patch)}
                onRemove={() => removeChip(i)}
                onOpenIcon={() => setIconFor(i)}
                showMenuRole={showMenuRole}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <IconPickerModal
        open={iconFor !== null}
        onClose={() => setIconFor(null)}
        onSelect={(def) => {
          if (iconFor !== null) editChip(iconFor, { iconUrl: `icon:${def.key}`, iconAlt: def.label });
        }}
      />

      {/* Selection: 활성 칩 */}
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

      {/* 표시 줄 수: 1줄 / 2줄 */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-muted-foreground">표시 줄 수</span>
        {[1, 2].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onChange({ ...draft, chipRows: r })}
            className={cn('rounded px-2 py-0.5 text-[11px] font-medium', (chipRows ?? 1) === r ? 'bg-primary text-primary-foreground' : 'border bg-white hover:bg-secondary')}
          >
            {r}줄
          </button>
        ))}
      </div>

      {/* 칩 추가 */}
      <Button type="button" size="sm" variant="secondary" onClick={addChip}>
        <Plus className="mr-1 h-3.5 w-3.5" /> 칩 추가
      </Button>
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

function AtomRow({
  templateId,
  atom,
  images,
  links,
  messages,
  onChange,
}: {
  templateId: string;
  atom: AtomNode;
  images: LibraryData['images'];
  links: LibraryData['links'];
  messages: LibraryData['messages'];
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
          {isVisualAtom && (
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
        (isCvmBinding(atom.content) ? (
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
      {/* 문구 베리에이션 — 타겟별 후보. 편집은 문구 관리(원장), 빌더는 참조만. 실서비스엔 CVM이 택1(기본=위 문구). 회의 2026-08-31. */}
      {f.content && !isCvmBinding(atom.content) && (() => {
        const vars = atom.contentVariants ?? [];
        return (
          <div className="space-y-1 rounded-md border border-dashed border-violet-200 bg-violet-50/30 px-2 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold text-violet-700">문구 베리에이션 <span className="font-normal text-violet-400">· 타겟별 · CVM 택1 · 편집은 문구 관리</span></span>
              <a href="/admin/messages" className="shrink-0 rounded border border-violet-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-violet-700 hover:bg-violet-100">문구 관리 ↗</a>
            </div>
            {vars.length === 0 ? (
              <p className="text-[10px] text-violet-400">등록된 타겟 문구 없음 — 문구 관리에서 추가</p>
            ) : vars.map((v, i) => {
              const on = v.enabled !== false;
              return (
                <div key={i} className={cn('flex items-center gap-1.5 text-[11px]', !on && 'opacity-55')}>
                  <span className="min-w-0 flex-1 truncate text-slate-700">{v.text || <span className="text-slate-400">(빈 문구)</span>}</span>
                  {v.target && <span className="shrink-0 rounded bg-white px-1 py-px text-[9px] font-medium text-violet-600 ring-1 ring-inset ring-violet-200">{v.target}</span>}
                  <span className={cn('shrink-0 rounded px-1 py-px text-[9px] font-semibold', on ? 'bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200' : 'bg-slate-100 text-slate-400 ring-1 ring-inset ring-slate-200')}>{on ? '노출' : '제외'}</span>
                </div>
              );
            })}
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
        (atom.atomType === 'ICON' ? (
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
  onAtomsChange,
}: {
  templateId: string;
  component: ComponentNode;
  library: LibraryData;
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

  return (
    <div className="mt-1 space-y-2 rounded-md bg-muted/40 p-2">
      {atoms.length === 0 && <p className="text-[11px] text-muted-foreground">Atom 없음 — 아래에서 추가하세요</p>}
      {atoms.map((a) => (
        <AtomRow
          key={a.componentAtomId}
          templateId={templateId}
          atom={a}
          images={library.images}
          links={library.links}
          messages={library.messages}
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
  return (
    <div className="space-y-1">
      {component.atoms.map((a) => {
        const binding = cvmBindingLabel(a.content); // CVM 연동이면 라벨(예: 멤버십 번호)
        const isBarcode = a.atomType === 'BARCODE';
        const val = a.content || a.imageUrl || a.altText;
        return (
          <div key={a.componentAtomId} className="flex items-center gap-1.5 text-xs">
            <Badge variant="outline">{ATOM_TYPE_LABELS[a.atomType as AtomType] ?? a.atomType}</Badge>
            {binding ? (
              <span className="flex flex-1 items-center gap-1 truncate">
                <span className="inline-flex shrink-0 items-center gap-1 rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700"><span className="rounded bg-sky-600 px-1 text-[9px] font-bold text-white">BSS</span>{binding}</span>
                <span className="truncate text-muted-foreground/60">{resolveCvmSample(a.content)}</span>
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
          <ChipEditor draft={draft} onChange={updateDraft} showMenuRole={/메뉴\s*리스트/.test(corner.layoutDetail ?? '')} />
        ) : (
          <AtomManager
            key={cc.atoms.map((a) => a.componentAtomId).join(',')}
            templateId={templateId}
            component={cc}
            library={library}
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
          <p className="mb-1.5 flex items-center gap-1 px-0.5 text-[11px] font-semibold text-slate-600">
            {bodyLabel} <span className="rounded-full bg-white px-1.5 text-[10px] text-slate-500">{bodyOrdered.length}</span>
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
          {/* 추가 버튼 — 빈 컴포넌트 / BSS 상품(혜택 브랜드) 불러오기. 콘텐츠 묶음 안이라 칩이 아닌 본문으로 추가됨을 명확히. */}
          <div className="mt-2 flex gap-1.5">
            <form action={addBlankComponent.bind(null, templateId, corner.id)} className="flex-1">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed bg-white/70 py-2 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary"
              >
                <Plus className="h-3.5 w-3.5" /> 컴포넌트 추가
              </button>
            </form>
            <button
              type="button"
              onClick={() => setBssOpen(true)}
              className="flex flex-1 items-center justify-center gap-1 rounded-md border border-dashed border-sky-300 bg-white/70 py-2 text-xs font-medium text-sky-700 hover:border-sky-500 hover:bg-sky-50"
            >
              <Search className="h-3.5 w-3.5" /> 상품 불러오기
            </button>
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
      <InfoRow label="코너 유형" value={<CornerTypeChip corner={corner} />} />
      {corner.cornerLayout && <InfoRow label="코너 레이아웃" value={corner.cornerLayout} />}
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
          <InfoRow label="추천 수급 방식" value={
            <span className="inline-flex flex-wrap items-center gap-1">
              <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold', corner.recSource === 'CVM 기반' ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-slate-200 bg-slate-50 text-slate-600')}>{corner.recSource}{corner.recSource === 'CVM 기반' ? ' · 런타임 판정' : ''}</span>
              {fb.length > 0 && <span className="text-[10px] text-muted-foreground">폴백 → {fb.join(' → ')}</span>}
            </span>
          } />
        );
      })()}
      {fam === 'product' && corner.sortStrategy && <InfoRow label="상품 노출 순서" value={corner.sortStrategy} />}
      {fam === 'product' && corner.noDisplayCondition && <InfoRow label="미 노출 조건" value={corner.noDisplayCondition} />}
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
const normCardShape = (s: string | null | undefined) => (s === '정사각형' ? '1:1' : s === '직사각형' ? '3:4' : s || '3:4');

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
  //  거버넌스: 노출 타입은 쉐입(배열)만 다른 같은 유형이어야 한다 → 다른 유형으로 폴백하지 않는다.
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
          title={options.length === 0 ? `‘${corner.cornerType}’ 유형에 등록된 노출 타입(쉐입)이 하나뿐이에요. 코너 유형 관리에서 이 유형의 쉐입을 더 등록하세요.` : undefined}
          className="shrink-0 rounded-md border border-violet-300 bg-violet-50 px-2 py-1 text-[11px] font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-40">＋ 타입</button>
      </div>
      {options.length === 0 ? (
        <p className="text-[10px] leading-relaxed text-muted-foreground">이 코너는 <b className="text-slate-600">{corner.cornerType}</b> 유형이고, 이 유형에 등록된 쉐입이 하나뿐이라 노출 타입을 더 추가할 수 없어요. <b>코너 유형 관리</b>에서 이 유형의 쉐입(배열)을 더 등록하면 여기서 고를 수 있습니다.</p>
      ) : vars.length === 0 ? (
        <p className="text-[10px] leading-relaxed text-muted-foreground">노출 타입이 1개예요. ＋로 <b>{corner.cornerType}</b> 유형의 노출 타입(쉐입)을 2~3개 등록하면 실서비스에서 <b>CVM이 고객마다 골라</b> 노출합니다. (빌더 미리보기는 기본 타입)</p>
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
        <a href="/admin/messages" onClick={(e) => e.stopPropagation()} className="ml-auto rounded border border-violet-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-violet-700 hover:bg-violet-50">문구 관리에서 편집 ↗</a>
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
        <p className="border-t pt-2 text-[9px] leading-relaxed text-muted-foreground">문구·타겟별 대체는 <b>문구 관리</b>에서 편집합니다(빌더는 보기·불러오기만). 타겟은 CVM이 참고하는 힌트로, 최종 매칭은 CVM이 수행.</p>
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

//  코너 정보 저장과 분리(전용 액션 setCornerCardShape). 저장 후 revalidate로 미리보기 반영.
function CardShapeControl({ templateId, corner }: { templateId: string; corner: CornerNode }) {
  const hasProductComp = corner.components.some((c) => c.componentType === '상품형');
  const canCardShape = hasProductComp && /2\.5/.test(corner.layoutDetail ?? '');
  const [shape, setShape] = useState(normCardShape(corner.cardShape));
  const [lines, setLines] = useState<number>(corner.titleLines === 2 ? 2 : 1);
  const [pending, start] = useTransition();
  useEffect(() => { setShape(normCardShape(corner.cardShape)); setLines(corner.titleLines === 2 ? 2 : 1); }, [corner.cardShape, corner.titleLines, corner.templateCornerId]);
  if (!canCardShape) return null;
  const choose = (sh: string) => { setShape(sh); start(() => setCornerCardShape(templateId, corner.id, sh)); };
  const chooseLines = (n: number) => { setLines(n); start(() => setCornerTitleLines(templateId, corner.id, n)); };
  const RATIOS: { sh: string; desc: string; w: number; h: number }[] = [
    { sh: '1:1', desc: '정사각·상품', w: 26, h: 26 },
    { sh: '3:4', desc: '세로·포스터', w: 21, h: 28 },
    { sh: '4:3', desc: '가로·와이드', w: 28, h: 21 },
  ];
  return (
    <div className="mb-3 space-y-3 rounded-xl border bg-gradient-to-b from-slate-50 to-white p-3 shadow-sm">
      {/* 카드 비율 — 실제 모양 미니 프리뷰로 표현 */}
      <div>
        <div className="mb-2 flex items-baseline gap-1.5">
          <span className="text-[11px] font-semibold text-slate-700">카드 비율</span>
          <span className="rounded bg-slate-100 px-1.5 py-px text-[9px] font-medium text-slate-500">가로형 2.5배열</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {RATIOS.map(({ sh, desc, w, h }) => {
            const on = shape === sh;
            return (
              <button
                key={sh}
                type="button"
                disabled={pending}
                onClick={() => choose(sh)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-lg border p-2 transition disabled:opacity-60',
                  on ? 'border-primary bg-primary/5 ring-1 ring-primary/25' : 'border-slate-200 hover:border-primary/40 hover:bg-slate-50',
                )}
              >
                <span className="flex h-8 items-end">
                  <span
                    style={{ width: w, height: h }}
                    className={cn('rounded-[3px] border transition-colors', on ? 'border-primary/50 bg-primary/25' : 'border-slate-300 bg-slate-100')}
                  />
                </span>
                <span className={cn('text-[11px] font-bold leading-none', on ? 'text-primary' : 'text-slate-700')}>{sh}</span>
                <span className="text-[9px] leading-none text-muted-foreground">{desc}</span>
              </button>
            );
          })}
        </div>
      </div>
      {/* 상품명 줄 수 — 줄 미리보기 바로 표현 */}
      <div className="border-t border-slate-100 pt-2.5">
        <div className="mb-2 flex items-baseline gap-1.5">
          <span className="text-[11px] font-semibold text-slate-700">상품명 줄 수</span>
          <span className="text-[9px] text-muted-foreground">긴 상품명 두 줄까지</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {([[1, '말줄임'], [2, '두 줄 표시']] as const).map(([n, desc]) => {
            const on = lines === n;
            return (
              <button
                key={n}
                type="button"
                disabled={pending}
                onClick={() => chooseLines(n)}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg border px-2.5 py-2 transition disabled:opacity-60',
                  on ? 'border-primary bg-primary/5 ring-1 ring-primary/25' : 'border-slate-200 hover:border-primary/40 hover:bg-slate-50',
                )}
              >
                <span className="flex w-6 flex-col gap-1">
                  {Array.from({ length: n }).map((_, i) => (
                    <span key={i} className={cn('h-1 rounded-full', on ? 'bg-primary/50' : 'bg-slate-300', n === 2 && i === 1 ? 'w-2/3' : 'w-full')} />
                  ))}
                </span>
                <span className="text-left leading-none">
                  <span className={cn('block text-[11px] font-bold', on ? 'text-primary' : 'text-slate-700')}>{n}줄</span>
                  <span className="mt-0.5 block text-[9px] text-muted-foreground">{desc}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// '코너 구성' 표시 옵션 — 빅배너로 강조(+위치+배너 선택). 상품형/혜택·오퍼형/콘텐츠 안내형에서만. 즉시 저장.
function BigBannerControl({ templateId, corner, banners }: { templateId: string; corner: CornerNode; banners: LibraryData['banners'] }) {
  const canBigBanner = ['상품형', '혜택·오퍼형', '콘텐츠 안내형'].includes(corner.cornerType);
  const [on, setOn] = useState(!!corner.bigBanner);
  const [pos, setPos] = useState(corner.bannerPosition ?? '상단');
  const [pending, start] = useTransition();
  useEffect(() => { setOn(!!corner.bigBanner); setPos(corner.bannerPosition ?? '상단'); }, [corner.bigBanner, corner.bannerPosition, corner.templateCornerId]);
  if (!canBigBanner) return null;
  const toggle = () => { const next = !on; setOn(next); start(() => setCornerBigBanner(templateId, corner.id, next)); };
  const choosePos = (p: string) => { setPos(p); start(() => setCornerBannerPosition(templateId, corner.id, p)); };
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
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-indigo-700">빅배너 위치</label>
            <div className="flex gap-1.5">
              {(['상단', '하단'] as const).map((p) => (
                <button key={p} type="button" disabled={pending} onClick={() => choosePos(p)}
                  className={cn('flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition', pos === p ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-200 hover:bg-secondary')}>
                  배너 {p}
                </button>
              ))}
            </div>
          </div>
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

// '코너 구성' 표시 옵션 — 하단 CTA(더보기/전체보기) 버튼. 리스트형 코너에서. 사용/미사용 + 문구 + 링크. 즉시 저장.
function MoreButtonControl({ templateId, corner }: { templateId: string; corner: CornerNode }) {
  const canMore = ['상품형', '혜택·오퍼형', '콘텐츠 안내형'].includes(corner.cornerType);
  const [use, setUse] = useState(corner.moreButtonUse);
  const [label, setLabel] = useState(corner.moreButtonLabel ?? '');
  const [link, setLink] = useState(corner.moreButtonLink ?? '');
  const [pending, start] = useTransition();
  useEffect(() => { setUse(corner.moreButtonUse); setLabel(corner.moreButtonLabel ?? ''); setLink(corner.moreButtonLink ?? ''); }, [corner.moreButtonUse, corner.moreButtonLabel, corner.moreButtonLink, corner.templateCornerId]);
  if (!canMore) return null;
  const save = (u: boolean, l: string, k: string) => start(() => setCornerMoreButton(templateId, corner.id, u, l, k));
  return (
    <div className="mb-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <label className="flex items-center justify-between gap-2">
        <span className="flex flex-col">
          <span className="text-[11px] font-semibold text-slate-700">하단 CTA 버튼 <span className="font-normal text-muted-foreground">· 전체보기/더보기</span></span>
          <span className="text-[10px] text-muted-foreground">코너 맨 아래 ‘{label || '전체보기'} ›’ 버튼을 켜고 끕니다.</span>
        </span>
        <button type="button" role="switch" aria-checked={use} disabled={pending}
          onClick={() => { const next = !use; setUse(next); save(next, label, link); }}
          className={cn('relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors', use ? 'bg-primary' : 'bg-slate-300')}>
          <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform', use ? 'translate-x-4' : 'translate-x-0.5')} />
        </button>
      </label>
      {use && (
        <div className="space-y-1.5">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} onBlur={() => save(true, label, link)} placeholder="버튼 문구 (예: 기프티콘 전체보기)" className="h-8 text-xs" />
          <Input value={link} onChange={(e) => setLink(e.target.value)} onBlur={() => save(true, label, link)} placeholder="이동 링크 (예: /shop/gifticon)" className="h-8 text-xs" />
        </div>
      )}
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

  // 코너 정보 실시간 편집 — 저장 전에도 미리보기에 즉시 반영
  const pushCorner = useContext(CornerPreviewContext);
  const [name, setName] = useState(corner.name);
  const [mainTitle, setMainTitle] = useState(corner.mainTitle ?? '');
  const [subTitle, setSubTitle] = useState(corner.subTitle ?? '');
  const [subTitleIcon, setSubTitleIcon] = useState(corner.subTitleIcon ?? '사용안함');
  const [cornerLayout] = useState(corner.cornerLayout ?? ''); // 필드는 숨김(값 보존)
  const [layoutDetail, setLayoutDetail] = useState(corner.layoutDetail ?? '');
  // 추천 수급 방식 — 재정렬 가능한 '자동 방식'(CVM/룰) + 항상 최하단 고정 '운영자 편성'(운영자가 코너 구성에 직접 짠 항목 = 폴백).
  //  운영자 편성은 정책상 대체 전시(PI-DSP-PER-002) 필수라 끌 수 없고, 운영자가 짠 항목이 곧 폴백이라 늘 켜져 있어야 함(빈 코너 방지). (2026-08-31 사용자 결정)
  const REC_AUTO_METHODS: string[] = ['CVM 기반']; // 수급 자동 방식 = CVM만 (룰 기반은 타겟팅 축이라 제거)
  const normalizeMethod = (m: string) => (m === '채널 데이터' ? 'CVM 기반' : m); // 폐기된 '채널 데이터'는 CVM으로 흡수
  const parseRecFull = (): string[] => {
    try { const a = JSON.parse(corner.recSourcePlan ?? ''); if (Array.isArray(a) && a.length) return a.filter((x) => typeof x === 'string').map(normalizeMethod); } catch { /* noop */ }
    return corner.recSource ? [normalizeMethod(corner.recSource)] : [];
  };
  const initFull = parseRecFull();
  // 자동 방식(재정렬) — 중복 제거(채널데이터→CVM 흡수로 겹칠 수 있음)
  const [recPrimaryPlan, setRecPrimaryPlan] = useState<string[]>(
    initFull.filter((m) => REC_AUTO_METHODS.includes(m)).filter((m, i, a) => a.indexOf(m) === i),
  );
  // 운영자 편성(직접 구성)은 항상 최하단 폴백 — 토글 아님. '운영 편성'으로 정규화해 늘 append.
  const recFullPlan = [...recPrimaryPlan, '운영 편성'];
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
        // 빅배너·하단CTA·배너위치는 '코너 구성' 컨트롤에서 즉시 저장(revalidate로 프리뷰 반영) → 여기 draft에서 제외
      });
    } else {
      pushCorner(corner.templateCornerId, null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit, name, mainTitle, subTitle, subTitleIcon, cornerLayout, layoutDetail, recSource, recPrimaryPlan, recPersonalized, corner.templateCornerId]);

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
          ) : (
            <button
              type="button"
              onClick={() => setEdit(true)}
              className="ml-auto inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-medium hover:bg-secondary"
            >
              <Pencil className="h-3 w-3" /> 수정
            </button>
          )}
        </div>
      </div>

      {!edit ? (
        <CornerInfoView corner={corner} nameMap={nameMap} />
      ) : (
      <>
      {/* 코너 불러오기: 코너 유형 관리 카탈로그에서 고른 유형으로 이 슬롯 교체 */}
      {loadOpen && (
        <div className="mb-3 rounded-md border border-dashed bg-muted/20 p-2">
          {library.cornerTypes.length > 0 ? (
            <>
              <form action={swapCornerToType.bind(null, templateId, corner.templateCornerId)} className="flex gap-1">
                <Select name="cornerTypeId" defaultValue="" className="h-8 flex-1 text-xs">
                  <option value="" disabled>
                    코너 유형(쉐입)에서 선택…
                  </option>
                  {/* 유형(7)별 optgroup → 쉐입(상세) 옵션. 코너 유형 관리 거버넌스와 동일 구조. */}
                  {(() => {
                    const order = CORNER_TYPES as readonly string[];
                    const byBase = new Map<string, typeof library.cornerTypes>();
                    for (const t of library.cornerTypes) (byBase.get(t.baseCategory) ?? byBase.set(t.baseCategory, []).get(t.baseCategory)!).push(t);
                    return [...byBase.keys()]
                      .sort((a, b) => { const ia = order.indexOf(a), ib = order.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); })
                      .map((bc) => (
                        <optgroup key={bc} label={nameMap[bc] ?? bc}>
                          {byBase.get(bc)!.map((t) => (
                            <option key={t.id} value={t.id}>{t.typeDetail || t.componentType || '기본'}</option>
                          ))}
                        </optgroup>
                      ));
                  })()}
                </Select>
                <Button type="submit" size="sm" variant="secondary">
                  적용
                </Button>
              </form>
              <p className="mt-1 text-[10px] text-muted-foreground">코너 유형 관리에서 만든 유형(형태·레이아웃)을 그대로 이 슬롯으로 불러옵니다.</p>
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground">코너 유형 관리에 등록된 코너가 없습니다.</p>
          )}
        </div>
      )}

      <form key={resetKey} action={updateCornerMeta.bind(null, templateId, corner.id)} className="grid grid-cols-2 gap-3">
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
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border bg-muted/30 px-2.5 py-1.5">
            <CornerTypeChip corner={corner} />
            <span className="ml-auto shrink-0 whitespace-nowrap text-[10px] text-muted-foreground">유형 변경은 ‘코너 불러오기’로</span>
          </div>
        </div>

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

        {/* 타이틀·레이아웃 — 모든 코너 유형 공통 (코너 타이틀 편집) */}
        <div className="col-span-2 space-y-1">
          <label className="text-[11px] font-medium text-foreground">타이틀 <span className="font-normal text-muted-foreground">· 코너 상단 큰 제목 (줄바꿈 가능)</span></label>
          <Textarea name="mainTitle" value={mainTitle} onChange={(e) => setMainTitle(e.target.value)} placeholder="예: 오늘이 지나면 다시 없는 혜택이에요" className="min-h-[44px] text-xs text-foreground" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-foreground">서브타이틀 <span className="font-normal text-muted-foreground">· 제목 아래 짧은 라벨</span></label>
          <Input name="subTitle" value={subTitle} onChange={(e) => setSubTitle(e.target.value)} placeholder="예: 구독 상품 · 제휴사별 혜택" className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-foreground">서브타이틀 화살표</label>
          <Select name="subTitleIcon" value={subTitleIcon} onChange={(e) => setSubTitleIcon(e.target.value)} className="h-8 text-xs">
            {SUBTITLE_ICONS.map((t) => (
              <option key={t} value={t}>
                {t === '화살표' ? '화살표(›) 표시' : '표시 안 함'}
              </option>
            ))}
          </Select>
        </div>
        {/* 코너 레이아웃 필드는 표시하지 않음 (값 보존 · 배치는 유형 상세로 추론) */}
        <input type="hidden" name="cornerLayout" value={cornerLayout} />

        {/* 최소/최대 노출 개수 필드는 표시하지 않음 (값은 보존) */}
        <input type="hidden" name="minItems" value={corner.minItems ?? ''} />
        <input type="hidden" name="maxItems" value={corner.maxItems ?? ''} />

        {/* 상품형 전용: 상품 노출 순서 · 미 노출 조건 · 더보기 */}
        {family === 'product' && (
          <>
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">상품 노출 순서</label>
              <Select name="sortStrategy" defaultValue={corner.sortStrategy ?? ''} className="h-8 text-xs">
                {PRODUCT_SORT_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">미 노출 조건</label>
              <Select name="noDisplayCondition" defaultValue={corner.noDisplayCondition ?? '선택 없음'} className="h-8 text-xs">
                {NO_DISPLAY_CONDITIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
            {/* 하단 CTA(더보기/전체보기) 버튼은 '코너 구성'의 MoreButtonControl로 이동 — 코너 정보에서는 관리하지 않음. */}
          </>
        )}

        {/* 코너 설명 (공통) */}
        <div className="col-span-2 space-y-1">
          <label className="text-[11px] text-muted-foreground">코너 설명</label>
          <Textarea name="description" defaultValue={corner.description ?? ''} className="min-h-[38px] text-xs" />
        </div>

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

// ── 좌측 고정 리스트의 코너 행 (클릭 선택 + dnd 순서) ─────────
function CornerListRow({
  templateId,
  corner,
  nameMap,
  selected,
  onSelect,
}: {
  templateId: string;
  corner: CornerNode;
  nameMap: Record<string, string>;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: corner.templateCornerId,
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
        !corner.visible && 'opacity-55',
      )}
    >
      <div className="flex items-center gap-1.5">
        <button
          className="cursor-grab text-muted-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          aria-label="순서 변경"
        >
          <GripVertical className="h-4 w-4" />
        </button>
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
          itemLabel="코너"
          childSummary={
            corner.components.length
              ? `컴포넌트 ${corner.components.length}개 · Atom ${corner.components.reduce((s, c) => s + c.atoms.length, 0)}개`
              : undefined
          }
          ariaLabel="Corner 삭제"
          stopPropagation
        />
      </div>
      <div className="mt-1 flex items-center gap-1.5 pl-5">
        <CornerTypeChip corner={corner} className="min-w-0 flex-1" />
        {!corner.visible && <Badge variant="outline" className="shrink-0">비노출</Badge>}
        {/* 토글: 오른쪽 끝에 배치 */}
        <form className="ml-auto shrink-0" action={toggleCornerVisible.bind(null, templateId, corner.templateCornerId)} onClick={(e) => e.stopPropagation()}>
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

// ── 코너 불러오기 모달 — 코너 유형(상품형·단일강조 등)에서 선택 + 유형 미리보기 ───
function CornerLoadModal({
  open,
  onClose,
  templateId,
  cornerTypes,
  nameMap,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  templateId: string;
  cornerTypes: LibraryData['cornerTypes'];
  nameMap: Record<string, string>;
  onCreated?: (templateCornerId: string) => void;
}) {
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!open) return null;

  // 정책상 '사용(active) + 승인·반영된(liveVersion)' 코너 유형만 불러올 수 있다.
  //  TM-DSP-021(미사용 제외) + PI-DSP-WFL-002/004(승인 완료 전 노출 후보 제외).
  const types = cornerTypes
    .filter((t) => t.active && t.liveVersion != null)
    .map((t) => {
      const component = t.componentType ?? '';
      const bigBanner = !!t.bigBanner;
      const rest = [component, t.typeDetail ?? ''].filter(Boolean).join(' · '); // 빅배너는 배지로 분리
      return {
        id: t.id,
        base: t.baseCategory,
        component,
        detail: t.typeDetail ?? '',
        bigBanner,
        sampleImageUrl: t.sampleImageUrl ?? null,
        rest,
        label: `${nameMap[t.baseCategory] ?? t.baseCategory}${rest ? ` · ${rest}` : ''}`,
      };
    });
  const query = q.trim().toLowerCase();
  const list = types.filter((t) => !query || t.label.toLowerCase().includes(query));
  const sel = types.find((t) => t.id === selId) ?? null;

  const doAdd = () => {
    if (!sel) return;
    // 등록된 코너 유형 전체 스펙(레이아웃/마크업 등)을 상속해 추가
    const fd = new FormData();
    fd.set('cornerTypeId', sel.id);
    start(async () => {
      const newId = await createCornerFromType(templateId, fd);
      onClose();
      if (newId) onCreated?.(newId);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b px-5 py-3">
          <Copy className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">코너 불러오기</h2>
          <span className="text-xs text-muted-foreground">코너 유형에서 선택하면 미리보기가 표시됩니다</span>
          <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground" aria-label="닫기">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-[1fr_1.1fr]">
          {/* 목록 (코너 유형) */}
          <div className="flex min-h-0 flex-col border-r">
            <div className="p-3">
              <div className="flex items-center gap-2 rounded-md border bg-background px-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="코너 유형 검색…" className="h-9 flex-1 bg-transparent text-sm outline-none" autoFocus />
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-3 pb-3">
              {list.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">검색 결과가 없습니다.</p>}
              {/* 7 상위 유형 → 쉐입 그룹 (코너 유형 관리 거버넌스와 동일 구조) */}
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
                        <span className="text-[10px] font-medium tabular-nums text-muted-foreground">쉐입 {items.length}</span>
                        {purpose && <span className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground/70">{purpose}</span>}
                      </div>
                      <div className="space-y-1">
                        {items.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setSelId(t.id)}
                            className={cn(
                              'flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left',
                              selId === t.id ? 'border-primary bg-accent' : 'hover:bg-muted/50',
                            )}
                          >
                            {isImgSrc(t.sampleImageUrl?.split('\n')[0]) && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={t.sampleImageUrl!.split('\n')[0]} alt="" className="h-8 w-12 shrink-0 rounded border object-cover object-top" />
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-medium text-foreground">{t.detail || t.component || '기본'}</span>
                              {t.component && t.detail && <span className="block truncate text-[10px] text-muted-foreground">{t.component}</span>}
                            </span>
                            {t.bigBanner && <BigBannerBadge className="shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
          {/* 미리보기 */}
          <div className="flex min-h-0 flex-col overflow-y-auto p-4">
            {sel ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold', cornerTypeChipClass(sel.base))}>
                    {sel.base}
                  </span>
                  {sel.rest && <span className="text-xs text-muted-foreground">{sel.rest}</span>}
                  {sel.bigBanner && <BigBannerBadge />}
                </div>
                {isImgSrc(sel.sampleImageUrl?.split('\n')[0]) && (
                  <div className="flex flex-wrap gap-2">
                    {sel.sampleImageUrl!.split('\n').filter(Boolean).slice(0, 3).map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={src} alt="유형 샘플" className="h-24 w-auto max-w-[140px] rounded-lg border object-cover object-top [filter:contrast(1.05)_saturate(1.1)]" />
                    ))}
                  </div>
                )}
                <TypeDetailPreview base={sel.base} component={sel.component} detail={sel.detail} bigBanner={sel.bigBanner} />
                <Button type="button" onClick={doAdd} disabled={pending} className="w-full">
                  {pending ? '추가 중…' : '이 유형으로 코너 추가'}
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
  const [zoom, setZoom] = useState(1); // 미리보기 배율 (비율 유지)
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
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as CornerNode[];
  for (const c of corners) if (!ids.includes(c.templateCornerId)) ordered.push(c);

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
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    const next = [...ids];
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
            템플릿 · 코너 배치
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
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              {ordered.map((corner) => (
                <CornerListRow
                  key={corner.templateCornerId}
                  templateId={templateId}
                  corner={corner}
                  nameMap={nameMap}
                  selected={selectedCorner?.templateCornerId === corner.templateCornerId}
                  onSelect={selectCorner}
                />
              ))}
            </SortableContext>
          </DndContext>
          {ordered.length === 0 && (
            <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
              아래에서 Corner를 추가하세요.
            </p>
          )}

          {/* Corner 추가 */}
          <details className="rounded-md border bg-muted/20 p-2">
            <DisclosureButton>Corner 추가</DisclosureButton>
            <div className="mt-2 space-y-2">
              {library.cornerTypes.length ? (
                // 코너 추가 = 코너 유형 관리에서 '코너 불러오기'로만 (드롭다운 제거)
                <>
                  <Button type="button" size="sm" variant="secondary" className="w-full" onClick={() => setLoadCornerOpen(true)}>
                    <Copy className="mr-1 h-3.5 w-3.5" /> 코너 불러오기
                  </Button>
                  <p className="text-[10px] text-muted-foreground">코너 유형 관리에 등록된 유형을 골라 썸네일·정보 그대로 불러옵니다.</p>
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
              <button type="button" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))} disabled={zoom <= 0.5} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30" title="축소">−</button>
              <button type="button" onClick={() => setZoom(1)} className="min-w-[42px] rounded px-1 text-center text-[11px] font-semibold tabular-nums text-muted-foreground hover:bg-muted" title="기본 크기(100%)">{Math.round(zoom * 100)}%</button>
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

            {/* 코너 승인은 코너 유형 관리에서 처리한다. 빌더는 템플릿 전체를 승인 요청(상단 스트립). */}

            {/* 기존 코너 끌어오기는 아래 '코너 정보'의 '코너 불러오기' 버튼으로 통합됨 */}
            <CornerInfoForm key={selectedCorner.templateCornerId} templateId={templateId} corner={selectedCorner} library={library} nameMap={nameMap} />
            {/* 상단 배너 선택 UI는 '코너 구성'의 BigBannerControl 카드 안에 임베드됨(별도 패널 제거). */}
            <div className="rounded-lg border bg-card p-4">
              <p className="mb-0.5 text-sm font-semibold">코너 구성</p>
              <p className="mb-2 text-[11px] text-muted-foreground">이 코너를 이루는 컴포넌트 · 표시 옵션</p>
              <BigBannerControl templateId={templateId} corner={selectedCorner} banners={library.banners} />
              <CardShapeControl templateId={templateId} corner={selectedCorner} />
              <MoreButtonControl templateId={templateId} corner={selectedCorner} />
              <DisplayVariantsControl templateId={templateId} corner={selectedCorner} cornerTypes={library.cornerTypes} />
              <CopyOverview templateId={templateId} corner={selectedCorner} />
              <ComponentList templateId={templateId} corner={selectedCorner} library={library} />
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
