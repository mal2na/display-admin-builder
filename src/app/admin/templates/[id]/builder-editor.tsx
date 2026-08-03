'use client';

import { useState, useEffect, useRef, createContext, useContext, useTransition } from 'react';
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
  layoutDetailsFor,
  cornerFamily,
  ATOM_TYPES,
  ATOM_TYPE_LABELS,
  ATOM_TYPE_FIELDS,
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
import { GripVertical, Trash2, Plus, Copy, Image as ImageIcon, X, Pencil, Check, Link2, Sparkles, Search } from 'lucide-react';
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
  swapCornerRef,
} from '../actions';

export type AtomNode = {
  componentAtomId: string;
  id: string;
  name: string;
  atomType: string;
  isRequired: boolean;
  content: string | null;
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
  subTitle: string | null;
  subTitleIcon: string | null;
  sortStrategy: string | null;
  minItems: number | null;
  noDisplayCondition: string | null;
  moreButtonUse: boolean;
  moreButtonLabel: string | null;
  moreButtonLink: string | null;
  bannerId: string | null;
  bannerName: string | null;
  bannerImageUrl: string | null;
  visible: boolean;
  components: ComponentNode[];
};
export type LibraryData = {
  corners: { id: string; name: string; cornerType: string; layoutDetail?: string | null }[];
  components: { id: string; name: string; componentType: string; allowedCornerTypes: string[] }[];
  atoms: { id: string; name: string; atomType: string }[];
  banners: { id: string; name: string; imageUrl: string }[];
  cornerTypes: { id: string; name: string; baseCategory: string; typeDetail?: string | null; active: boolean }[];
  images: { url: string; alt: string | null; name: string }[];
  links: { url: string; label: string }[];
};

/** 코너 유형 카탈로그 → 기준분류(baseCategory) → 표시명 맵. 카탈로그 우선, 없으면 원래 값. */
function cornerTypeNameMap(library: LibraryData): Record<string, string> {
  const m: Record<string, string> = {};
  for (const t of library.cornerTypes) if (!m[t.baseCategory]) m[t.baseCategory] = t.name;
  return m;
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
type ChipItem = { content: string; linkUrl: string; iconUrl: string; iconAlt: string };
type ChipDraft = { chips: ChipItem[]; selectedIndex: number; chipRows: number };
type ChipDraftState = { key: string; draft: ChipDraft } | null;

function initChipDraft(cc: ComponentNode): ChipDraft {
  return {
    chips: cc.atoms.map((a) => ({ content: a.content ?? '', linkUrl: a.linkUrl ?? '', iconUrl: a.imageUrl ?? '', iconAlt: a.altText ?? '' })),
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
  moreButtonUse?: boolean;
  moreButtonLabel?: string;
};
type CornerDraftState = { key: string; patch: CornerPatch } | null;
type CornerPreviewSetter = (key: string, patch: CornerPatch | null) => void;
const CornerPreviewContext = createContext<CornerPreviewSetter>(() => {});

// ── 비-칩 컴포넌트의 Atom 실시간 편집 드래프트 (AtomManager → 미리보기) ─────
type AtomsDraftState = { key: string; atoms: AtomNode[] } | null;
type AtomsPreviewSetter = (key: string, atoms: AtomNode[] | null) => void;
const AtomsPreviewContext = createContext<AtomsPreviewSetter>(() => {});

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
    moreButtonUse: c.moreButtonUse,
    moreButtonLabel: c.moreButtonLabel,
    bannerImageUrl: c.bannerImageUrl,
    bannerName: c.bannerName,
    components: c.components.map((cc) => ({
      id: cc.cornerComponentId,
      name: cc.name,
      componentType: cc.componentType,
      selectedIndex: cc.selectedIndex,
      chipRows: cc.chipRows,
      atoms: cc.atoms.map((a) => ({
        id: a.componentAtomId,
        name: a.name,
        atomType: a.atomType,
        content: a.content,
        imageUrl: a.imageUrl,
        altText: a.altText,
        linkUrl: a.linkUrl,
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
}: {
  i: number;
  chip: ChipItem;
  onEdit: (patch: Partial<ChipItem>) => void;
  onRemove: () => void;
  onOpenIcon: () => void;
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
      <button type="button" onClick={onRemove} className="shrink-0 text-muted-foreground hover:text-destructive" title="칩 삭제" aria-label="칩 삭제">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── 선택형(칩/탭) 편집기 = ChipPage (업무진입형.png) ─────────
// 완전 제어형: 개별 저장 없이 로컬 draft만 수정 → 미리보기 즉시 반영, 저장은 카드의 "완료"가 일괄 처리.
function ChipEditor({ draft, onChange }: { draft: ChipDraft; onChange: (next: ChipDraft) => void }) {
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
  const addChip = () => setChips([...chips, { content: '', linkUrl: '', iconUrl: '', iconAlt: '' }]);

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

// ── 한 Atom 인라인 편집 행 (라벨 + 인풋) ───────────────
// 제어형: 값 변경을 즉시 부모(AtomManager)로 올려 미리보기에 반영. 저장은 상단 '완료'에서 일괄 처리.
// 이미지/이동 URL은 직접 타이핑 대신 라이브러리에서 "불러오기"로 선택한다.
function AtomRow({
  templateId,
  atom,
  images,
  links,
  onChange,
}: {
  templateId: string;
  atom: AtomNode;
  images: LibraryData['images'];
  links: LibraryData['links'];
  onChange: (patch: Partial<AtomNode>) => void;
}) {
  const f = ATOM_TYPE_FIELDS[atom.atomType as AtomType] ?? { content: true, image: false, link: false };
  const altMissing = (atom.atomType === 'IMAGE' || atom.atomType === 'ICON') && !atom.altText;
  // 라벨(유형) + 인풋 형식 — 코너 정보 폼과 동일. 개별 저장 없이 상단 '완료'에서 일괄 저장.
  return (
    <div className="space-y-1 rounded-md bg-white p-2.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium text-muted-foreground">{ATOM_TYPE_LABELS[atom.atomType as AtomType] ?? atom.atomType}</label>
        <form action={removeAtom.bind(null, templateId, atom.componentAtomId)}>
          <button className="text-muted-foreground hover:text-destructive" title="삭제" aria-label="Atom 삭제">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
      {f.content && (
        <Input
          value={atom.content ?? ''}
          onChange={(e) => onChange({ content: e.target.value })}
          placeholder="문구 / 가격 / 정보값"
          className="h-8 text-xs"
        />
      )}
      {f.image && (
        <ImagePickField
          value={atom.imageUrl}
          alt={atom.altText}
          images={images}
          invalid={altMissing}
          onPick={(v) => onChange({ imageUrl: v.url, altText: v.alt ?? atom.altText })}
          onClear={() => onChange({ imageUrl: '' })}
        />
      )}
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
        {f.content && <Input name="content" placeholder="문구 / 가격 / 정보값" className="h-7 text-xs" />}
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
        const val = a.content || a.imageUrl || a.altText;
        return (
          <div key={a.componentAtomId} className="flex items-center gap-1.5 text-xs">
            <Badge variant="outline">{ATOM_TYPE_LABELS[a.atomType as AtomType] ?? a.atomType}</Badge>
            {val ? (
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
          atomsRef.current.map((a) => ({ atomId: a.id, content: a.content, imageUrl: a.imageUrl, altText: a.altText, linkUrl: a.linkUrl })),
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
        <form action={removeComponent.bind(null, templateId, cc.cornerComponentId)}>
          <button className="text-muted-foreground hover:text-destructive" aria-label="Component 제거">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </form>
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
          <ChipEditor draft={draft} onChange={updateDraft} />
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
              칩 묶음 <span className="rounded-full bg-white px-1.5 text-[10px] text-indigo-600">{chipOrdered.length}</span>
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
        {bodyOrdered.length > 0 && (
          <div className="rounded-lg border bg-muted/30 p-2">
            <p className="mb-1.5 flex items-center gap-1 px-0.5 text-[11px] font-semibold text-slate-600">
              {bodyLabel} <span className="rounded-full bg-white px-1.5 text-[10px] text-slate-500">{bodyOrdered.length}</span>
            </p>
            <SortableContext items={bodyIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5">
                {bodyOrdered.map((cc, i) => (
                  <ComponentCard key={cc.cornerComponentId} templateId={templateId} corner={corner} cc={cc} i={i} count={bodyOrdered.length} library={library} />
                ))}
              </div>
            </SortableContext>
          </div>
        )}
      </DndContext>

      {/* 컴포넌트 추가 — 코너의 기존 구성(예: 이미지·텍스트·정보값)을 값 없이 빈 상태로 바로 추가 */}
      <form action={addBlankComponent.bind(null, templateId, corner.id)}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed py-2 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary"
        >
          <Plus className="h-3.5 w-3.5" /> 컴포넌트 추가
        </button>
      </form>
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
      <InfoRow label="코너 유형" value={`${corner.typeLabel ?? nameMap[corner.cornerType] ?? corner.cornerType}${corner.layoutDetail ? ' · ' + corner.layoutDetail : ''}`} />
      {corner.cornerLayout && <InfoRow label="코너 레이아웃" value={corner.cornerLayout} />}
      {corner.mainTitle && <InfoRow label="메인 타이틀" value={corner.mainTitle} />}
      {corner.subTitle && <InfoRow label="서브 타이틀" value={corner.subTitle} />}
      {corner.subTitleIcon && corner.subTitleIcon !== '사용안함' && <InfoRow label="서브 아이콘" value={corner.subTitleIcon} />}
      {(corner.minItems != null || corner.maxItems != null) && (
        <InfoRow label="노출 개수" value={`${corner.minItems ?? '-'} ~ ${corner.maxItems ?? '-'}`} />
      )}
      {fam === 'product' && corner.sortStrategy && <InfoRow label="상품 노출 순서" value={corner.sortStrategy} />}
      {fam === 'product' && corner.noDisplayCondition && <InfoRow label="미 노출 조건" value={corner.noDisplayCondition} />}
      {fam === 'product' && (
        <InfoRow
          label="더보기"
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
  const [moreUse, setMoreUse] = useState(corner.moreButtonUse);
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
  const [moreLabel, setMoreLabel] = useState(corner.moreButtonLabel ?? '');

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
        moreButtonUse: moreUse,
        moreButtonLabel: moreLabel,
      });
    } else {
      pushCorner(corner.templateCornerId, null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit, name, mainTitle, subTitle, subTitleIcon, cornerLayout, layoutDetail, moreUse, moreLabel, corner.templateCornerId]);

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
    setMoreUse(corner.moreButtonUse);
    setMoreLabel(corner.moreButtonLabel ?? '');
    setResetKey((k) => k + 1);
  };

  // 코너 유형 선택지 = 기준분류 단위(카탈로그의 유형상세별 행은 합쳐 하나로). 유형상세는 아래 '유형 상세'에서 선택.
  const typeOptions = library.cornerTypes.length
    ? Array.from(new Set(library.cornerTypes.map((t) => t.baseCategory))).map((base) => ({ value: base, label: nameMap[base] ?? base, key: base }))
    : CORNER_TYPES.map((t) => ({ value: t, label: t, key: t }));
  if (!typeOptions.some((o) => o.value === corner.cornerType)) {
    typeOptions.unshift({ value: corner.cornerType, label: nameMap[corner.cornerType] ?? corner.cornerType, key: 'cur' });
  }
  const details = layoutDetailsFor(ct);

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center gap-1.5">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          코너 정보
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            {nameMap[ct] ?? ct}
            {layoutDetail ? ` · ${layoutDetail}` : ''}
          </span>
        </p>
        {edit ? (
          <button
            type="button"
            onClick={() => setLoadOpen((v) => !v)}
            className={cn(
              'ml-auto inline-flex items-center gap-0.5 rounded-md border px-2 py-1 text-[11px] font-medium',
              loadOpen ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary',
            )}
          >
            <Copy className="h-3 w-3" /> 코너 불러오기
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setEdit(true)}
            className="ml-auto inline-flex items-center gap-0.5 rounded-md border px-2 py-1 text-[11px] font-medium hover:bg-secondary"
          >
            <Pencil className="h-3 w-3" /> 수정
          </button>
        )}
      </div>

      {!edit ? (
        <CornerInfoView corner={corner} nameMap={nameMap} />
      ) : (
      <>
      {/* 코너 불러오기: 기존 코너로 이 위치(슬롯) 교체 */}
      {loadOpen && (
        <div className="mb-3 rounded-md border border-dashed bg-muted/20 p-2">
          {library.corners.filter((c) => c.id !== corner.id).length > 0 ? (
            <>
              <form action={swapCornerRef.bind(null, templateId, corner.templateCornerId)} className="flex gap-1">
                <Select name="cornerId" defaultValue="" className="h-8 flex-1 text-xs">
                  <option value="" disabled>
                    기존 코너 선택…
                  </option>
                  {library.corners
                    .filter((c) => c.id !== corner.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({nameMap[c.cornerType] ?? c.cornerType})
                      </option>
                    ))}
                </Select>
                <Button type="submit" size="sm" variant="secondary">
                  적용
                </Button>
              </form>
              <p className="mt-1 text-[10px] text-muted-foreground">선택한 기존 코너로 이 슬롯이 교체되어 정보·구성을 그대로 불러옵니다.</p>
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground">불러올 다른 코너가 없습니다.</p>
          )}
        </div>
      )}

      <form key={resetKey} action={updateCornerMeta.bind(null, templateId, corner.id)} className="grid grid-cols-2 gap-3">
        {/* 공통 */}
        <div className="col-span-2 space-y-1">
          <label className="text-[11px] text-muted-foreground">코너명 *</label>
          <Input name="name" value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-xs" required />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">코너 유형 *</label>
          <Select
            name="cornerType"
            value={ct}
            onChange={(e) => {
              setCt(e.target.value);
              setLayoutDetail(''); // 유형이 바뀌면 유형 상세 초기화
            }}
            className="h-8 text-xs"
          >
            {typeOptions.map((o) => (
              <option key={o.key} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">유형 상세</label>
          <Select
            name="layoutDetail"
            value={details.includes(layoutDetail) ? layoutDetail : ''}
            onChange={(e) => setLayoutDetail(e.target.value)}
            className="h-8 text-xs"
          >
            <option value="">선택 안 함</option>
            {details.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
        {/* 코너 마크업 ID 필드는 표시하지 않음 (값은 보존) */}
        <input type="hidden" name="markupId" value={corner.markupId ?? ''} />

        {/* 타이틀·레이아웃 — 모든 코너 유형 공통 (코너 타이틀 편집) */}
        <div className="col-span-2 space-y-1">
          <label className="text-[11px] text-muted-foreground">메인 타이틀 (줄바꿈 가능)</label>
          <Textarea name="mainTitle" value={mainTitle} onChange={(e) => setMainTitle(e.target.value)} className="min-h-[44px] text-xs" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">서브 타이틀</label>
          <Input name="subTitle" value={subTitle} onChange={(e) => setSubTitle(e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">서브 타이틀 아이콘</label>
          <Select name="subTitleIcon" value={subTitleIcon} onChange={(e) => setSubTitleIcon(e.target.value)} className="h-8 text-xs">
            {SUBTITLE_ICONS.map((t) => (
              <option key={t} value={t}>
                {t}
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
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">더보기 사용</label>
              <Select
                name="moreButtonUse"
                value={moreUse ? '사용' : '미사용'}
                onChange={(e) => setMoreUse(e.target.value === '사용')}
                className="h-8 text-xs"
              >
                <option value="미사용">미사용</option>
                <option value="사용">사용</option>
              </Select>
            </div>
            {moreUse && (
              <>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">더보기 버튼명</label>
                  <Input name="moreButtonLabel" value={moreLabel} onChange={(e) => setMoreLabel(e.target.value)} className="h-8 text-xs" placeholder="예) 더보기" />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[11px] text-muted-foreground">더보기 랜딩 URL</label>
                  <Input name="moreButtonLink" defaultValue={corner.moreButtonLink ?? ''} className="h-8 text-xs" placeholder="/..." />
                </div>
              </>
            )}
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
// ── AI 배너 이미지 생성 (로컬 SVG 목업 — 실제 이미지 API로 교체 가능) ────────
const AI_PALETTES = [
  { from: '#6366f1', to: '#a855f7', label: '퍼플' },
  { from: '#0ea5e9', to: '#22d3ee', label: '스카이' },
  { from: '#f59e0b', to: '#ef4444', label: '선셋' },
  { from: '#10b981', to: '#0ea5e9', label: '민트' },
];
const xmlEscape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function aiBannerDataUri(prompt: string, variant: number) {
  const p = AI_PALETTES[variant % AI_PALETTES.length];
  const title = xmlEscape((prompt.trim() || 'AI 배너').slice(0, 16));
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='672' height='294' viewBox='0 0 672 294'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='${p.from}'/><stop offset='1' stop-color='${p.to}'/></linearGradient></defs>` +
    `<rect width='672' height='294' rx='28' fill='url(#g)'/>` +
    `<circle cx='560' cy='60' r='120' fill='#ffffff' opacity='0.12'/>` +
    `<circle cx='120' cy='250' r='90' fill='#ffffff' opacity='0.10'/>` +
    `<text x='40' y='150' font-family='sans-serif' font-size='34' font-weight='700' fill='#ffffff'>${title}</text>` +
    `<text x='40' y='192' font-family='sans-serif' font-size='18' fill='#ffffff' opacity='0.85'>AI 생성 · ${p.label}</text>` +
    `</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function BannerPanel({
  templateId,
  corner,
  banners,
}: {
  templateId: string;
  corner: CornerNode;
  banners: LibraryData['banners'];
}) {
  const [mode, setMode] = useState<'library' | 'direct'>('library');
  const [imageUrl, setImageUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [pickedVariant, setPickedVariant] = useState<number | null>(null);
  const [selBannerId, setSelBannerId] = useState(corner.bannerId ?? ''); // 라이브러리 선택(미리보기용)

  const canRenderImg = (u?: string | null) => !!u && (u.startsWith('data:') || u.startsWith('http'));
  const selBanner = banners.find((b) => b.id === selBannerId);

  // 타이핑하면 즉시 후보 이미지가 뜬다
  const candidates = prompt.trim() ? AI_PALETTES.map((_, i) => aiBannerDataUri(prompt, i)) : [];
  const pickCandidate = (i: number) => {
    setPickedVariant(i);
    setImageUrl(aiBannerDataUri(prompt, i));
    setMode('direct'); // 후보를 고르면 '직접 등록' 쪽에 이미지가 채워지므로 그 모드로 전환
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="mb-0.5 text-sm font-semibold">상단 배너</p>
      <p className="mb-2 text-[11px] text-muted-foreground">코너 상단에 크게 노출되는 배너입니다. (선택)</p>
      <p className="mb-3 text-[11px] text-muted-foreground">
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
          <form action={setCornerBanner.bind(null, templateId, corner.id)} className="space-y-1.5">
            <div className="flex gap-1">
              <Select
                name="bannerId"
                value={selBannerId}
                onChange={(e) => setSelBannerId(e.target.value)}
                className="h-8 flex-1 text-xs"
              >
                <option value="">배너 없음</option>
                {banners.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
              <Button type="submit" size="sm" variant="secondary">
                적용
              </Button>
            </div>
            {/* 선택한 배너 미리보기 */}
            {selBanner ? (
              <div className="overflow-hidden rounded-md border bg-card">
                {canRenderImg(selBanner.imageUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selBanner.imageUrl} alt={selBanner.name} className="aspect-[16/7] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[16/7] w-full items-center justify-center bg-gradient-to-br from-indigo-100 to-slate-200 text-[10px] text-slate-500">
                    {selBanner.name}
                  </div>
                )}
                <p className="truncate px-2 py-1 text-[10px] text-muted-foreground">{selBanner.name}</p>
              </div>
            ) : (
              <div className="flex aspect-[16/7] w-full items-center justify-center rounded-md border border-dashed text-[10px] text-muted-foreground">
                미리보기 · 배너를 선택하세요
              </div>
            )}
          </form>
        ) : (
          <form action={createBanner.bind(null, templateId, corner.id)} className="grid grid-cols-1 gap-1.5">
            <Input
              name="imageUrl"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="이미지 URL 또는 아래 AI 후보 선택"
              className="h-8 text-xs"
              required
            />
            {imageUrl && (
              <div className="flex items-center gap-2 rounded-md border bg-card p-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="선택한 배너" className="h-10 w-24 shrink-0 rounded object-cover" />
                <span className="truncate text-[10px] text-muted-foreground">
                  {imageUrl.startsWith('data:') ? 'AI 생성 이미지' : imageUrl}
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

      {/* ② AI 이미지 생성 (후보 선택 → 위 '직접 등록'의 이미지로 채워짐) */}
      <div className="mt-2 rounded-md border border-indigo-200 bg-indigo-50/60 p-2.5">
        <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-indigo-700">
          <Sparkles className="h-3.5 w-3.5" /> AI 이미지 생성
        </p>
        <Input
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            setPickedVariant(null);
          }}
          placeholder="원하는 배너를 설명하세요 (예: 여름 시원한 아이스 아메리카노 프로모션)"
          className="h-8 text-xs"
        />
        {candidates.length > 0 ? (
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {candidates.map((src, i) => (
              <button
                key={i}
                type="button"
                onClick={() => pickCandidate(i)}
                className={cn(
                  'overflow-hidden rounded-md border-2 transition',
                  pickedVariant === i ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-transparent hover:border-indigo-300',
                )}
                title={`후보 ${i + 1} · ${AI_PALETTES[i].label}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`AI 후보 ${i + 1}`} className="aspect-[16/7] w-full object-cover" />
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-[10px] text-muted-foreground">문구를 입력하면 후보 이미지가 자동 생성됩니다.</p>
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
      style={style}
      onClick={() => onSelect(corner.templateCornerId)}
      className={cn(
        'cursor-pointer rounded-md border p-2',
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
        {/* 코너 최대 개수(배치/최대) — 복사 버튼 왼쪽에 표시 */}
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground" title="배치 개수 / 최대 노출 개수">
          {corner.components.length}
          {corner.maxItems != null ? `/${corner.maxItems}` : ''}
        </span>
        <form action={duplicateCorner.bind(null, templateId, corner.templateCornerId)} onClick={(e) => e.stopPropagation()}>
          <button className="text-muted-foreground hover:text-primary" aria-label="Corner 복제" title="복제">
            <Copy className="h-3.5 w-3.5" />
          </button>
        </form>
        <form action={removeCorner.bind(null, templateId, corner.templateCornerId)} onClick={(e) => e.stopPropagation()}>
          <button className="text-muted-foreground hover:text-destructive" aria-label="Corner 삭제" title="삭제">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
      <div className="mt-1 flex items-center gap-1.5 pl-5">
        <Badge variant="outline">
          {corner.typeLabel ?? nameMap[corner.cornerType] ?? corner.cornerType}
          {corner.layoutDetail ? ` · ${corner.layoutDetail}` : ''}
        </Badge>
        {!corner.visible && <Badge variant="outline">비노출</Badge>}
        {/* 토글: 오른쪽 끝에 배치 */}
        <form className="ml-auto" action={toggleCornerVisible.bind(null, templateId, corner.templateCornerId)} onClick={(e) => e.stopPropagation()}>
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

      {/* 화면에 추가된 배너를 좌측에 고정 표시 (포탈3) */}
      {corner.bannerName && (
        <div className="mt-1.5 ml-5 flex items-center gap-1.5 rounded-md border border-dashed bg-muted/40 px-2 py-1" onClick={(e) => e.stopPropagation()}>
          <ImageIcon className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
          <span className="flex-1 truncate text-[11px] text-muted-foreground">배너: {corner.bannerName}</span>
          <form action={setCornerBanner.bind(null, templateId, corner.id)}>
            <input type="hidden" name="bannerId" value="" />
            <button className="text-muted-foreground hover:text-destructive" aria-label="배너 해제" title="배너 해제">
              <X className="h-3.5 w-3.5" />
            </button>
          </form>
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
}: {
  open: boolean;
  onClose: () => void;
  templateId: string;
  cornerTypes: LibraryData['cornerTypes'];
  nameMap: Record<string, string>;
}) {
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!open) return null;

  // 사용 중인 코너 유형만, (기준분류 + 유형상세)로 라벨 구성
  const types = cornerTypes
    .filter((t) => t.active)
    .map((t) => ({
      id: t.id,
      base: t.baseCategory,
      detail: t.typeDetail ?? '',
      label: `${nameMap[t.baseCategory] ?? t.baseCategory}${t.typeDetail ? ` · ${t.typeDetail}` : ''}`,
    }));
  const query = q.trim().toLowerCase();
  const list = types.filter((t) => !query || t.label.toLowerCase().includes(query));
  const sel = types.find((t) => t.id === selId) ?? null;

  const doAdd = () => {
    if (!sel) return;
    // 등록된 코너 유형 전체 스펙(레이아웃/마크업 등)을 상속해 추가
    const fd = new FormData();
    fd.set('cornerTypeId', sel.id);
    start(async () => {
      await createCornerFromType(templateId, fd);
      onClose();
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
            <div className="flex-1 space-y-1 overflow-y-auto px-3 pb-3">
              {list.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">검색 결과가 없습니다.</p>}
              {list.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelId(t.id)}
                  className={cn(
                    'flex w-full items-center gap-1.5 rounded-md border px-2.5 py-2 text-left',
                    selId === t.id ? 'border-primary bg-accent' : 'hover:bg-muted/50',
                  )}
                >
                  <Badge variant="outline">{nameMap[t.base] ?? t.base}</Badge>
                  {t.detail && <span className="text-xs text-muted-foreground">· {t.detail}</span>}
                </button>
              ))}
            </div>
          </div>
          {/* 미리보기 */}
          <div className="flex min-h-0 flex-col overflow-y-auto p-4">
            {sel ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold">{sel.label}</p>
                <TypeDetailPreview base={sel.base} detail={sel.detail} />
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
  const [rightW, setRightW] = useState(440); // 우측 상세 패널 너비(px), 드래그로 조절
  const [leftW, setLeftW] = useState(300); // 좌측 코너 리스트 너비(px), 드래그로 조절
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
  const family = selectedCorner ? cornerFamily(selectedCorner.cornerType) : null;
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
        if (p.moreButtonUse !== undefined) pc.moreButtonUse = p.moreButtonUse;
        if (p.moreButtonLabel !== undefined) pc.moreButtonLabel = p.moreButtonLabel || null;
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

  // 선택된 코너로 가운데 미리보기를 스크롤 (렌더 커밋 후 실행)
  useEffect(() => {
    if (!sel) return;
    document.getElementById(`pv-${sel}`)?.scrollIntoView({ block: 'start' });
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
    />
    <div
      className="grid flex-1 overflow-hidden"
      style={{ gridTemplateColumns: `${leftW}px minmax(0,1fr) ${rightW}px` }}
    >
      {/* 좌측: 고정 코너 리스트 + 유형 추가 (드래그로 너비 조절) */}
      <div className="relative flex flex-col overflow-hidden border-r bg-card">
        <div
          onPointerDown={(e) => startResize('left', e)}
          title="드래그로 패널 너비 조절"
          className="absolute right-0 top-0 z-20 h-full w-1.5 translate-x-1/2 cursor-col-resize bg-transparent transition-colors hover:bg-primary/40"
        />
        <div className="border-b px-3 py-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            템플릿 · 코너 배치
            {meta.isDefault && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">기본</span>}
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
              {library.cornerTypes.length > 0 && (
                <Button type="button" size="sm" variant="secondary" className="w-full" onClick={() => setLoadCornerOpen(true)}>
                  <Copy className="mr-1 h-3.5 w-3.5" /> 코너 불러오기
                </Button>
              )}
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <div className="h-px flex-1 bg-border" /> 또는 유형 선택해 추가 <div className="h-px flex-1 bg-border" />
              </div>
              {library.cornerTypes.length ? (
                // 등록된 코너 유형(코너 유형 관리)을 골라 그 형태 그대로 추가
                <form action={createCornerFromType.bind(null, templateId)} className="grid grid-cols-2 gap-1.5">
                  <Select name="cornerTypeId" defaultValue={library.cornerTypes[0]?.id} className="col-span-2 h-8 text-xs">
                    {library.cornerTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {(nameMap[t.baseCategory] ?? t.baseCategory)}
                        {t.typeDetail ? ` · ${t.typeDetail}` : ''}
                      </option>
                    ))}
                  </Select>
                  <Button type="submit" size="sm" className="col-span-2 w-fit">
                    이 유형으로 코너 추가
                  </Button>
                </form>
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
        <div className="flex items-center justify-center gap-2 border-b bg-card py-2">
          {DEVICES.map((d) => (
            <button
              key={d.key}
              onClick={() => setDevice(d)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium',
                device.key === d.key ? 'bg-primary text-primary-foreground' : 'border hover:bg-secondary',
              )}
            >
              {d.label} <span className="opacity-70">{d.w}×{d.h}</span>
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto w-fit">
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
          </div>
        </div>
      </div>

      {/* 우측: 선택 코너 상세 (드래그로 너비 조절) */}
      <div className="relative overflow-y-auto border-l bg-background p-4">
        <div
          onPointerDown={(e) => startResize('right', e)}
          title="드래그로 패널 너비 조절"
          className="absolute left-0 top-0 z-20 h-full w-1.5 -translate-x-1/2 cursor-col-resize bg-transparent transition-colors hover:bg-primary/40"
        />
        {selectedCorner ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {selectedCorner.typeLabel ?? nameMap[selectedCorner.cornerType] ?? selectedCorner.cornerType}
                {selectedCorner.layoutDetail ? ` · ${selectedCorner.layoutDetail}` : ''}
              </Badge>
              <h2 className="truncate text-base font-semibold">{selectedCorner.name}</h2>
            </div>

            {/* 기존 코너 끌어오기는 아래 '코너 정보'의 '코너 불러오기' 버튼으로 통합됨 */}
            <CornerInfoForm key={selectedCorner.templateCornerId} templateId={templateId} corner={selectedCorner} library={library} nameMap={nameMap} />
            {/* 배너형 코너는 배너를 '코너 구성'의 배너형 컴포넌트로 관리 → 별도 패널 없음.
                그 외 코너는 유형상세에 '배너'가 포함됐거나(예: 세로형(배너)) 이미 배너가 등록된 경우에만 상단 배너 패널 노출.
                (예: T DAY 멤버십처럼 배너 없는 세로형에는 안 뜸) */}
            {family !== 'banner' &&
              ((selectedCorner.layoutDetail ?? '').includes('배너') || selectedCorner.bannerId != null) && (
                <BannerPanel key={selectedCorner.id} templateId={templateId} corner={selectedCorner} banners={library.banners} />
              )}
            <div className="rounded-lg border bg-card p-4">
              <p className="mb-0.5 text-sm font-semibold">코너 구성</p>
              <p className="mb-2 text-[11px] text-muted-foreground">이 코너를 이루는 컴포넌트</p>
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
