'use client';

/**
 * 전시화면 관리 (테스트) — 주문 프로세스 등록(order3-create) 레이아웃을 전시 데이터로 이식.
 *  좌: 미리보기(디바이스, 고정) · 우: 기본 정보(폼) + 템플릿 구성(카드>코너 2단) + 구성 검증 · 하단 고정 액션 바.
 *  실제 혜택 홈 등 Container·Template·Corner 를 채운다. 배치·노출 테스트용(코너 추가/저장은 데모).
 *  레퍼런스: https://nc-channel.vercel.app/order3-create.html (2026-10-20 사용자 요청).
 */
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { addCornersFromTypes, reorderTestCorners, setTestCornerZone, removeCornerFromTemplate, renameCorner } from './actions';
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DeviceFrame, CornerBlock } from '@/components/preview/blocks';
import { FieldRow } from '@/components/ops-ui';
import { cornerTypeChipClass, layoutLabel, displayLayout, cornerFieldSpec, ZONE_META, ZONE_RANK, REC_SOURCE_METHODS, REC_SOURCE_INFO, CORNER_TYPES, VISIBLE_CORNER_TYPES, type Zone } from '@/lib/display-taxonomy';
import { ChevronLeft, ChevronRight, ChevronDown, GripVertical, X, Plus, Copy, Pencil, ShieldCheck, Layers, EyeOff, Lock, LockOpen, Trash2, Sparkles, UserCog, Search, Link2, Check, ImageIcon, Info, GalleryHorizontalEnd } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

// 아이템 아이콘 — 'lucide:<Name>'은 벡터 아이콘, 그 외는 실제 이미지(포스터·로고). 2026-11-05 사용자 요청(메뉴 아이콘을 텍스트에 맞는 벡터로).
function ItemIcon({ src, iconClass = 'h-4 w-4', imgClass = 'h-5 w-5 object-contain' }: { src?: string | null; iconClass?: string; imgClass?: string }) {
  if (!src) return <ImageIcon className={iconClass} />;
  if (src.startsWith('lucide:')) {
    const Cmp = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[src.slice(7)] ?? ImageIcon;
    return <Cmp className={iconClass} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className={imgClass} />;
}

// 보조 설명(hint)을 라벨 옆 ⓘ 툴팁으로 — 인라인 문구 대신(2026-11-05 사용자 요청, 코너 유형 관리와 동일). DS tooltip 토큰.
function Tip({ text }: { text: string }) {
  return (
    <span className="group/tip relative inline-flex shrink-0 align-middle" onClick={(e) => e.stopPropagation()}>
      <Info className="h-3.5 w-3.5 cursor-help text-[var(--ink4)] transition group-hover/tip:text-[var(--ink2)]" />
      <span role="tooltip" className="pointer-events-none absolute left-1/2 top-full z-30 mt-1.5 hidden w-max max-w-[240px] -translate-x-1/2 whitespace-normal break-keep rounded-[8px] bg-[#fcfcfd] px-3 py-2 text-left text-[11px] font-normal leading-relaxed text-[var(--ink2)] shadow-[0_0_8px_-2px_#0000001f] ring-1 ring-black/5 group-hover/tip:block">
        {text}
      </span>
    </span>
  );
}
import type { ProcessData, PTemplate, PCorner, LibCorner } from './process-data';
import type { ProductOption } from '../corner-types/corner-type-manager';

const EXPOSE_OPTS = ['항상 노출', '조건 노출', '로그인 시 노출', '비로그인 시 노출', '미노출'];

// 코너 '채우기 → 불러오기' 카탈로그 — 유형별(상품형=상품, 혜택·오퍼형=혜택). ProcessBuilder가 Provider로 내려준다(2026-10-28 사용자 요청).
const ProductCatalogCtx = React.createContext<Record<string, ProductOption[]>>({});
// ③ 채우기 아이템(칩형 메뉴 등) — 아이콘·텍스트·링크를 '불러오기(메뉴에서 한 번에)' 또는 '직접입력'으로 채운다(2026-11-05 사용자 요청).
type FillItem = { id: string; label: string; icon?: string | null; link?: string; sub?: string; mode: 'direct' | 'load' };
const EMPTY_ITEMS: FillItem[] = [];
const APPEND_LOAD = '__append__'; // '메뉴 추가' = 카탈로그에서 골라 현재 메뉴에 덧붙이기(2026-10-28 사용자 요청)

// 배너·칩·CTA 옵션 토글 → 선택 코너 미리보기에 반영(코너 유형 미리보기와 동일, 2026-11-05 사용자 요청).
// CTA On이면 버튼 라벨은 입력값, 비어 있으면 무조건 'CTA'를 기본으로 박는다(2026-11-05 사용자 요청).
function applyOptsToPreview(preview: PCorner['preview'], opts: Record<string, boolean>, ctaLabel?: string): PCorner['preview'] {
  if (!preview) return preview;
  const next = { ...preview };
  // 배너 Off면 배너 이미지를 비워 '실제로' 배너가 사라지게(채워진 코너도 꺼지게, 2026-11-05 사용자 요청: 토글 끄면 꺼져야 함).
  if ('배너' in opts) { next.bigBanner = opts['배너']; next.bannerImageUrl = opts['배너'] ? (next.bannerImageUrl || 'Banner') : null; }
  if ('CTA' in opts) { next.moreButtonUse = opts['CTA']; if (opts['CTA']) next.moreButtonLabel = (ctaLabel ?? '').trim() || 'CTA'; }
  if ('칩' in opts) {
    // 칩(선택형) 컴포넌트 전체를 대상으로 — '칩옵션' 가이드뿐 아니라 '카테고리 탭' 등 실제 칩도 On/Off(2026-11-05 사용자 요청).
    const isChip = (c: { componentType: string }) => c.componentType === '선택형';
    const hasChip = next.components.some(isChip);
    if (opts['칩'] && !hasChip) {
      const chip = { id: 'chip-opt', name: '칩옵션', componentType: '선택형', chipVariant: 'contents', selectedIndex: 0,
        atoms: ['Chip1', 'Chip2', 'Chip3', 'Chip4'].map((c, i) => ({ id: `co${i}`, name: c, atomType: 'TEXT', content: c, imageUrl: null, altText: null, linkUrl: null })) };
      next.components = [chip, ...next.components];
    } else if (!opts['칩'] && hasChip) {
      next.components = next.components.filter((c) => !isChip(c));
    }
  }
  return next;
}

/** 코너 레이아웃 표시 텍스트 — cornerLayout이 있으면 그 라벨, 없으면 layoutDetail(배너형: 빅배너·스몰배너·띠배너 등, 치수 괄호 제거) */
function cornerLayoutText(cornerType: string | null, layout: string | null, layoutDetail: string | null): string {
  // 코너 유형 관리 목록과 '동일한' 배열명으로 — displayLayout(옵션 유형은 +배너/+칩/탭 접기) + layoutLabel(레거시 정규화).
  //  '· 빅배너' 배치 마커는 배열명이 아니므로 떼고 유형의 배열(typeDetail) 기준으로 접는다(2026-11-05 사용자 요청).
  const detail = (layoutDetail ?? layout ?? '').replace(/\s*·\s*빅배너\s*$/, '').replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (!detail) return '';
  const folded = cornerType ? displayLayout(cornerType, detail) : detail;
  return layoutLabel(folded) || folded;
}

/** ISO 문자열 → datetime-local 입력값(YYYY-MM-DDTHH:mm, 로컬). 값 없으면 빈 문자열 */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
const REC_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  'CVM 데이터 연동': Sparkles, 'CVM 콘텐츠 연동': Sparkles, '운영자 편성': UserCog,
};

const CVM_CATALOGS = ['요금제', '단말', '멤버십', '혜택', '마케팅 프로그램', '업무'];

/* 접이식 섹션 — 번호·제목·(?)·접기 토글(모듈 스코프: 상태 유지) */
function Sec({ n, title, help, children }: { n: number; title: string; help?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(true);
  return (
    <div className="rounded-[var(--collapse-r)] border border-[var(--line3)] bg-white p-4">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--ac)] text-[11px] font-bold text-white">{n}</span>
        <h4 className="flex-1 text-left text-[14px] font-bold text-[var(--ink)]">{title}</h4>
        {help && <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full border border-[var(--line2)] text-[10px] text-[var(--ink4)]">?</span>}
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-[var(--ink4)] transition', !open && '-rotate-90')} />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function CornerDetail({ template, corner, index, onPreviewFallback, onRecSourceChange, onOptionsChange, onPreviewPatch, onToast }: {
  template: PTemplate; corner: PCorner | null; index: number; onPreviewFallback: (on: boolean) => void; onRecSourceChange: (src: string) => void; onOptionsChange: (opts: Record<string, boolean>, ctaLabel?: string) => void; onPreviewPatch: (patch: Record<string, unknown>) => void; onToast: (m: string) => void;
}) {
  if (!corner) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-[12px] border border-dashed border-[var(--line2)] bg-[var(--th)] px-6 text-center text-[13px] leading-relaxed text-[var(--ink4)]">
        왼쪽에서 코너를 선택하면<br />상세 설정이 여기에 표시됩니다
      </div>
    );
  }
  return <CornerDetailBody key={corner.id} template={template} corner={corner} onPreviewFallback={onPreviewFallback} onRecSourceChange={onRecSourceChange} onOptionsChange={onOptionsChange} onPreviewPatch={onPreviewPatch} onToast={onToast} />;
}

// 칩 불러오기 모달 — 카탈로그 카테고리를 칩(카테고리 탭)으로 멀티 셀렉 추가(2026-10-28 사용자 요청: 칩과 상품 둘 다 불러오기).
function ChipLoadModal({ categories, current, onClose, onAdd }: { categories: string[]; current: string[]; onClose: () => void; onAdd: (cs: string[]) => void }) {
  const [checked, setChecked] = React.useState<Set<string>>(new Set());
  const toggle = (c: string) => setChecked((p) => { const n = new Set(p); if (n.has(c)) n.delete(c); else n.add(c); return n; });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[70vh] w-full max-w-sm flex-col overflow-hidden rounded-[14px] bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-[var(--line2)] px-4 py-3">
          <h2 className="text-[14px] font-bold text-[var(--ink)]">칩 불러오기</h2>
          <span className="text-[12px] text-[var(--ink4)]">카테고리에서 선택</span>
          <button type="button" onClick={onClose} className="ml-auto rounded-[6px] p-1 text-[var(--ink3)] hover:bg-[var(--th)]" aria-label="닫기"><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {categories.length === 0 ? <p className="py-8 text-center text-[13px] text-[var(--ink4)]">카테고리가 없습니다.</p> : categories.map((c) => {
            const on = checked.has(c); const exists = current.includes(c);
            return (
              <button key={c} type="button" disabled={exists} onClick={() => toggle(c)} className={cn('flex w-full items-center gap-2.5 rounded-[8px] px-2 py-2 text-left', exists ? 'opacity-40' : on ? 'bg-[var(--ac2)]' : 'hover:bg-[var(--th)]')}>
                <span className={cn('grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border', on ? 'border-[var(--ac)] bg-[var(--ac)] text-white' : 'border-[var(--line3)]')}>{on && <Check className="h-3 w-3" />}</span>
                <span className="text-[13px] font-medium text-[var(--ink)]">{c}</span>
                {exists && <span className="ml-auto text-[11px] text-[var(--ink4)]">이미 추가됨</span>}
              </button>
            );
          })}
        </div>
        <div className="border-t border-[var(--line2)] p-3">
          <button type="button" disabled={checked.size === 0} onClick={() => onAdd([...checked])}
            className="h-[42px] w-full rounded-[10px] bg-[var(--ac)] text-[14px] font-bold text-white hover:bg-[var(--ac-h)] disabled:opacity-50">칩 담기{checked.size > 0 ? ` (${checked.size})` : ''}</button>
        </div>
      </div>
    </div>
  );
}

// '채우기 → 불러오기' 모달 — 유형별 카탈로그(상품형=상품 9분류 · 혜택·오퍼형=혜택 분류)에서 멀티 셀렉으로 담기(2026-10-28 사용자 요청).
function ProductLoadModal({ catalog, cornerType, onClose, onAdd }: { catalog: ProductOption[]; cornerType: string; onClose: () => void; onAdd: (ps: ProductOption[]) => void }) {
  const [q, setQ] = React.useState('');
  const cats: string[] = ['전체'];
  for (const o of catalog) { const c = o.category ?? '기타'; if (!cats.includes(c)) cats.push(c); }
  const [cat, setCat] = React.useState('전체');
  const [checked, setChecked] = React.useState<Set<string>>(new Set());
  const query = q.trim().toLowerCase();
  const list = catalog.filter((o) => (cat === '전체' || (o.category ?? '기타') === cat) && (!query || `${o.brand} ${o.title}`.toLowerCase().includes(query)));
  const toggle = (k: string) => setChecked((prev) => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const submit = () => onAdd(catalog.filter((o) => checked.has(o.key)));
  const kindWord = cornerType === '상태 안내형' ? '상태' : cornerType === '업무 진입형' ? '메뉴' : cornerType === '콘텐츠 안내형' ? '영화' : cornerType === '배너형' ? '배너' : cornerType === '혜택·오퍼형' ? '혜택' : '상품';
  const kindLabel = cornerType === '콘텐츠 안내형' ? '지금 등록된 영화에서 선택' : cornerType === '상태 안내형' ? '내 상태 카드에서 선택 — 값은 고객 데이터로 자동' : cornerType === '배너형' ? '배너 캠페인 관리에 등록된 배너에서 선택' : `${kindWord} 분류에서 선택`;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex h-[78vh] w-full max-w-lg flex-col overflow-hidden rounded-[14px] bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-[var(--line2)] px-4 py-3">
          <Search className="h-4 w-4 text-[var(--ac)]" />
          <h2 className="text-[14px] font-bold text-[var(--ink)]">{kindWord} 불러오기</h2>
          <span className="text-[12px] text-[var(--ink4)]">{kindLabel} · 여러 개 체크해 담기</span>
          <button type="button" onClick={onClose} className="ml-auto rounded-[6px] p-1 text-[var(--ink3)] hover:bg-[var(--th)]" aria-label="닫기"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-2 border-b border-[var(--line2)] p-3">
          <div className="flex items-center gap-2 rounded-[8px] border border-[var(--line3)] bg-white px-3">
            <Search className="h-4 w-4 text-[var(--ink4)]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름 검색…" className="h-9 flex-1 bg-transparent text-sm outline-none" autoFocus />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {cats.map((c) => (
              <button key={c} type="button" onClick={() => setCat(c)} className={cn('rounded-[7px] px-2.5 py-1 text-[12px] font-semibold', c === cat ? 'bg-[var(--ac)] text-white' : 'bg-[var(--th)] text-[var(--ink2)] hover:bg-[var(--line)]')}>{c}</button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {list.length === 0 ? <p className="py-10 text-center text-[13px] text-[var(--ink4)]">검색 결과가 없습니다.</p> : list.map((p) => {
            const on = checked.has(p.key);
            return (
              <button key={p.key} type="button" onClick={() => toggle(p.key)} className={cn('flex w-full items-center gap-3 rounded-[8px] px-2 py-2 text-left', on ? 'bg-[var(--ac2)]' : 'hover:bg-[var(--th)]')}>
                <span className={cn('grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border', on ? 'border-[var(--ac)] bg-[var(--ac)] text-white' : 'border-[var(--line3)]')}>{on && <Check className="h-3 w-3" />}</span>
                <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[8px] border border-[var(--line2)] bg-[var(--th)] text-[var(--ink3)]">
                  <ItemIcon src={p.imageUrl} iconClass="h-5 w-5" imgClass="h-full w-full object-cover" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-[var(--ink)]">{p.title}</span>
                  <span className="block truncate text-[11px] text-[var(--ink4)]">{p.category} · {p.brand}{p.price ? ` · ${p.price}` : ''}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="border-t border-[var(--line2)] p-3">
          <button type="button" disabled={checked.size === 0} onClick={submit}
            className="h-[44px] w-full rounded-[10px] bg-[var(--ac)] text-[14px] font-bold text-white hover:bg-[var(--ac-h)] disabled:opacity-50">{kindWord === '배너' ? '배너 가져오기' : kindWord === '상태' ? '상태 카드 가져오기' : (kindWord === '메뉴' || kindWord === '영화' ? `${kindWord} 추가` : '이 항목 담기')}{checked.size > 0 ? ` (${checked.size})` : ''}</button>
        </div>
      </div>
    </div>
  );
}

function CornerDetailBody({ template, corner, onPreviewFallback, onRecSourceChange, onOptionsChange, onPreviewPatch, onToast }: { template: PTemplate; corner: PCorner; onPreviewFallback: (on: boolean) => void; onRecSourceChange: (src: string) => void; onOptionsChange: (opts: Record<string, boolean>, ctaLabel?: string) => void; onPreviewPatch: (patch: Record<string, unknown>) => void; onToast: (m: string) => void }) {
  // 프로필형(업무 진입형) = 고객 정보(이름·휴대폰 등)라 '무조건 CVM 데이터 연동' 고정(2026-11-05 사용자 요청).
  const layoutDetailStr = corner.layoutDetail ?? corner.layout ?? '';
  const isProfile = corner.cornerType === '업무 진입형' && /프로필/.test(layoutDetailStr);
  const [srcState, setSrc] = React.useState<string>(corner.recSource ?? '운영자 편성');
  const src = isProfile ? 'CVM 데이터 연동' : srcState;
  const [fb, setFb] = React.useState<'미노출' | '운영자 편성으로 대체'>(corner.fallback);
  const [cat, setCat] = React.useState('혜택');
  const [topN, setTopN] = React.useState(5);
  // ① 코너 정보 — 코너명만 편집 가능(유형·레이아웃·개수는 코너 유형 관리에서 불러오는 껍데기)
  const router = useRouter();
  const [editName, setEditName] = React.useState(false);
  const [nameVal, setNameVal] = React.useState(corner.name);
  // 코너명 저장 — 실제 DB 반영(2026-11-05 사용자 요청: 수정이 안 되던 데모 → 실제 저장).
  const saveName = async () => {
    const n = nameVal.trim();
    if (!n) { onToast('코너명을 입력하세요.'); return; }
    setEditName(false);
    try { await renameCorner(template.id, corner.id, n); router.refresh(); onToast('코너명을 수정했습니다.'); }
    catch { setNameVal(corner.name); onToast('코너명을 저장하지 못했습니다.'); }
  };
  const options = cornerOptions(corner.preview);
  const isCvmSrc = src.startsWith('CVM');
  const isData = src === 'CVM 데이터 연동';
  // '채우기 → 불러오기' — 유형별 카탈로그(상품형=상품, 혜택·오퍼형=혜택)에서 멀티 셀렉으로 담는다(2026-10-28 사용자 요청).
  const catalogByType = React.useContext(ProductCatalogCtx);
  // 상태 안내형(업무 진입형)은 '상태 카드' 전용 카탈로그에서 가져온다 — 메뉴 카탈로그와 구분(2026-11-05 사용자 요청).
  const isStatus = corner.cornerType === '업무 진입형' && /상태|아이콘.?이미지/.test(layoutDetailStr);
  const catalog = (isStatus ? catalogByType['상태 안내형'] : catalogByType[corner.cornerType]) ?? [];
  const canLoad = catalog.length > 0;
  const catCategories = Array.from(new Set(catalog.map((c) => c.category).filter((c): c is string => !!c)));
  // 옵션(배너·칩·CTA) — 코너 유형이 허용하는 옵션을 빌더에서 On/Off 설정(2026-10-28 사용자: "배너·칩·CTA는 옵션, 여기서 설정").
  const optSpec = cornerFieldSpec(corner.cornerType, corner.layoutDetail ?? corner.layout);
  const availOptions = optSpec?.options ?? [];
  const rawDetail = corner.layoutDetail ?? corner.layout ?? '';
  // 옵션 토글은 코너의 '실제 미리보기 상태'에서 시작한다(2026-11-05 사용자 요청: 옵션 꺼져 있는데 전체보기 나오는 불일치 수정).
  //  CTA=moreButtonUse / 배너=bigBanner / 칩=선택형 컴포넌트 유무. 토글을 끄면 applyOptsToPreview로 미리보기도 함께 꺼진다.
  const pv = corner.preview;
  const hasChipComp = !!pv?.components?.some((c) => c.componentType === '선택형');
  const [optOn, setOptOn] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(availOptions.map((o) => [o,
      (o === '칩' && (/칩/.test(rawDetail) || hasChipComp)) ||
      (o === '배너' && (/배너/.test(rawDetail) || !!pv?.bigBanner)) ||
      (o === 'CTA' && !!pv?.moreButtonUse)])));
  // 코너 공통 필드(코너 타이틀·버튼 텍스트) — 코너 유형 required 중 corner 그룹. 빌더에 입력란이 없던 문제 수정(2026-11-05 사용자 요청).
  const cornerReqFields = (optSpec?.required ?? []).filter((f) => f.group === 'corner');
  const hasCornerTitle = cornerReqFields.some((f) => f.key === 'CornerTitle');
  const hasButtonText = cornerReqFields.some((f) => f.key === 'ButtonText');
  const [cornerTitleVal, setCornerTitleVal] = React.useState(() => (pv?.mainTitle && pv.mainTitle !== 'CornerTitle' ? pv.mainTitle : ''));
  // 버튼 텍스트(ButtonText) = 미리보기의 '서브 타이틀'(타이틀 아래 보조 문구, 예: T 영화예매). CTA(전체보기)와는 별개(2026-11-05 사용자 요청).
  const [buttonTextVal, setButtonTextVal] = React.useState(() => (pv?.subTitle && pv.subTitle !== 'ButtonText' ? pv.subTitle : ''));
  // CTA 라벨(전체보기 등) = 하단 더보기 버튼. CTA 옵션을 켤 때만 입력, 버튼 텍스트와 별개(2026-11-05 사용자 요청).
  const [ctaLabelVal, setCtaLabelVal] = React.useState(() => (pv?.moreButtonLabel && pv.moreButtonLabel !== 'CTA' ? pv.moreButtonLabel : ''));
  // CTA 링크 — 문구와 별도 입력(2026-11-05 사용자 요청: 인풋 두 개).
  const [ctaLinkVal, setCtaLinkVal] = React.useState(() => ((pv as { moreButtonLink?: string | null } | undefined)?.moreButtonLink ?? ''));
  // ③채우기를 '코너 | 아이템' 탭으로 나눠 등록(2026-11-05 사용자 요청). 코너 속성이 없는 유형(배너형 등)은 아이템만.
  const [fillTab, setFillTab] = React.useState<'코너' | '아이템'>('코너');
  // 칩(카테고리 탭) — 자유 텍스트가 아니라 카탈로그 카테고리 데이터와 연동(2026-10-28 사용자 요청: 칩 개수·정보를 데이터 연동).
  //  기본 = '전체' + 카탈로그 카테고리. 추가/삭제도 카탈로그 카테고리에서만. 라벨은 읽기전용(데이터).
  // 칩은 처음엔 '전체'만 — 나머지 카테고리는 '칩 불러오기' 모달에서 골라 넣는다(2026-11-05 사용자 요청).
  // 칩 라벨 — 채워진 코너는 '좌측 미리보기의 실제 칩'(선택형 아톰: 카페·베이커리…)을 그대로, 신규 껍데기는 '전체'만(2026-11-05 사용자 요청).
  const [chips, setChips] = React.useState<string[]>(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chipComp = (pv?.components ?? []).find((c: any) => c.componentType === '선택형');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const labels = (chipComp?.atoms ?? []).map((a: any) => (a.content || a.name || '').trim()).filter((l: string) => !!l);
    return labels.length ? labels : ['전체'];
  });
  const [chipLoadOpen, setChipLoadOpen] = React.useState(false);
  // 배너 옵션 콘텐츠 — 배너 On이면 이미지. CTA 라벨은 '버튼 텍스트(buttonTextVal)'로 통합(2026-11-05 사용자 요청).
  const [bannerImg, setBannerImg] = React.useState('');
  // ③ 채우기 항목 — 칩 On 이면 칩마다 별도 메뉴(칩 하나하나 메뉴 연동, 2026-10-28 사용자 요청). 칩 Off 면 단일 리스트(__flat__).
  const chipMode = !!optOn['칩'] && chips.length > 0;
  const [activeChip, setActiveChip] = React.useState(0);
  const chipIdx = Math.min(activeChip, Math.max(0, chips.length - 1));
  const chipKey = chipMode ? `chip:${chips[chipIdx] ?? chipIdx}` : '__flat__';
  // 불러오기 전용(직접입력 없음) 유형 — 콘텐츠 안내형(영화) · 혜택·오퍼형 세로형(제휴 혜택). 이미지+텍스트+보조값을 한 번에 불러온다(2026-11-05 사용자 요청).
  const detailStr = corner.layoutDetail ?? corner.layout ?? '';
  const isBenefitList = (corner.cornerType === '혜택·오퍼형' || corner.cornerType === '혜택형') && /세로/.test(detailStr);
  // 배너형 = '배너 캠페인 관리'에서 가져오기 전용(직접 입력 없음). 가져오기 버튼으로 등록된 배너를 담는다(2026-11-05 사용자 요청).
  const isBanner = corner.cornerType === '배너형';
  // 배너 단일형 = 배너 1장 → 순서 변경 없음(드래그 핸들 제거). 스와이프형만 여러 장 재정렬(2026-11-05 사용자 요청).
  const bannerSingle = isBanner && !/스와이프|swipe/i.test(detailStr);
  // 상태 안내형 = '상태 카드'를 뭉텅이로 가져오기 전용(값·보조문구는 런타임 고객 데이터 @cvm, 2026-11-05 사용자 요청).
  const loadOnly = corner.cornerType === '콘텐츠 안내형' || isBenefitList || isBanner || isStatus;
  const itemWord = corner.cornerType === '콘텐츠 안내형' ? '영화' : isStatus ? '상태' : corner.cornerType === '업무 진입형' ? '메뉴' : isBanner ? '배너' : isBenefitList ? '혜택' : '항목';
  const loadFields = corner.cornerType === '콘텐츠 안내형' ? '이미지·제목·평점·예매율' : isStatus ? '값·보조문구 자동(@cvm)' : isBanner ? '배너 이미지·문구·랜딩' : '로고·혜택 문구·브랜드';
  // 좌측 미리보기에 '실제로 보이는' 항목을 ③채우기 기본값으로 — 채워진 코너는 그 코너의 콘텐츠와 1:1 일치(2026-11-05 사용자 요청).
  const PV_PLACEHOLDER = /^(CornerTitle|ItemTitle|SubTitle|SubText|ButtonText|Caption\d*|Chip\d+|Title|라벨|주요 값|배너 타이틀|상품 \d|혜택 \d)/;
  const previewItems = (): FillItem[] => {
    const out: FillItem[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (corner.preview?.components ?? []).forEach((comp: any, i: number) => {
      if (comp.componentType === '선택형') return; // 칩(카테고리 탭)은 아이템 아님
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const atoms: any[] = comp.atoms ?? [];
      const img = atoms.find((a) => (a.atomType === 'IMAGE' || a.atomType === 'ICON') && typeof a.imageUrl === 'string' && a.imageUrl.startsWith('/'))?.imageUrl ?? null;
      const benefit = atoms.find((a) => a.atomType === 'BENEFIT_TEXT')?.content;
      const text = atoms.find((a) => a.atomType === 'TEXT' && a.content && !PV_PLACEHOLDER.test(String(a.content).trim()))?.content;
      const label = (benefit || text || '').trim();
      const sub = atoms.find((a) => a.atomType === 'INFO' && a.content)?.content ?? undefined;
      if ((label && !PV_PLACEHOLDER.test(label)) || img) out.push({ id: `pv-${i}-${comp.id ?? i}`, label: label || itemWord, icon: img, sub, mode: 'load' });
    });
    return out;
  };
  // 기본 아이템 — 불러오기 전용 유형: ①미리보기에 보이는 실제 항목 → ②없으면 카탈로그(영화/혜택/배너)로 '채워진 채' 시작. 그 외는 라벨 슬롯.
  const defaultItems = (): FillItem[] => {
    // 미리보기에 '실제 항목'이 있으면 유형과 무관하게 그걸로 채운다(기프티콘·단말 등 가로형 포함, 2026-11-05 사용자 요청).
    const pv = previewItems();
    if (pv.length) return pv;
    if (loadOnly && catalog.length) return catalog.slice(0, 3).map((p, i) => ({ id: `seed-${i}-${p.key}`, label: p.title, icon: p.imageUrl ?? null, link: `/${p.category ?? 'menu'}/${p.key}`, sub: p.brand ?? undefined, mode: 'load' as const }));
    return (options.length ? options : ['대표 아이템 1', '대표 아이템 2', '대표 아이템 3']).map((o, i) => ({ id: `it-${i}-${o}`, label: o, mode: 'direct' as const }));
  };
  const [itemsByKey, setItemsByKey] = React.useState<Record<string, FillItem[]>>(() => ({ __flat__: defaultItems() }));
  // 칩 On으로 바꾸면 칩별 리스트는 아직 비어 있다 → 빈 화면처럼 보이지 않게 칩마다 기본 시드로 채워 시작(2026-11-05 사용자 요청: 칩 On 시 데이터 영역 유지). 편집 시 그대로 저장된다.
  const seedForKey = React.useMemo(() => defaultItems(), [chipKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const items = itemsByKey[chipKey] ?? seedForKey;
  const updateItems = (fn: (xs: FillItem[]) => FillItem[]) =>
    setItemsByKey((m) => ({ ...m, [chipKey]: fn(m[chipKey] ?? seedForKey) }));
  const addItem = () => updateItems((xs) => [...xs, { id: `new-${Date.now()}`, label: '', mode: 'direct' }]);
  const removeItem = (id: string) => updateItems((xs) => xs.filter((x) => x.id !== id));
  const setItemLabel = (id: string, label: string) => updateItems((xs) => xs.map((x) => (x.id === id ? { ...x, label } : x)));
  const setItemLink = (id: string, link: string) => updateItems((xs) => xs.map((x) => (x.id === id ? { ...x, link } : x)));
  const setItemMode = (id: string, mode: FillItem['mode']) => updateItems((xs) => xs.map((x) => (x.id === id ? { ...x, mode } : x)));
  const [loadForId, setLoadForId] = React.useState<string | null>(null); // 불러오기 모달 대상 항목 id
  // 멀티 셀렉으로 담기 — 아이콘+텍스트+링크를 '한 번에' 불러온다. 첫 항목은 누른 행을 채우고, 나머지는 그 뒤 새 행으로.
  const addFromCatalog = (ps: ProductOption[]) => {
    if (ps.length === 0) return;
    updateItems((xs) => {
      const idx = xs.findIndex((x) => x.id === loadForId);
      const mapped: FillItem[] = ps.map((p, i) => ({
        id: i === 0 && idx >= 0 ? loadForId! : `load-${Date.now()}-${i}`,
        label: p.title, icon: p.imageUrl ?? null, link: `/${(p.category ?? 'menu')}/${p.key}`, sub: p.brand ?? undefined, mode: 'load',
      }));
      return idx < 0 ? [...xs, ...mapped] : [...xs.slice(0, idx), ...mapped, ...xs.slice(idx + 1)];
    });
    setLoadForId(null);
  };

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-start gap-3 py-1.5 text-[13px]">
      <span className="w-[76px] shrink-0 text-[var(--ink3)]">{label}</span>
      <span className="min-w-0 flex-1 text-[var(--ink)]">{children}</span>
    </div>
  );
  const MiNoChul = (
    <div className="mt-3">
      <label className="mb-1 flex items-center gap-1 text-[12px] font-semibold text-[var(--ink3)]">미 노출 조건</label>
      <div className="relative">
        <select defaultValue="선택 없음" className="h-[38px] w-full appearance-none rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-3 pr-9 text-[13px] text-[var(--ink)] focus:border-[var(--ac)] focus:outline-none">
          <option>선택 없음</option><option>비로그인 시 미노출</option><option>보유 고객 미노출</option><option>기간 외 미노출</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink4)]" />
      </div>
    </div>
  );

  return (
    <div className="space-y-3">

      {/* ① 코너 정보 — 코너명만 편집, 유형·레이아웃·개수는 코너 유형 관리에서 불러온 껍데기 */}
      <Sec n={1} title="코너 정보">
        <div className="mb-2 flex items-center gap-1 rounded-[8px] bg-[var(--th)] px-2.5 py-2 text-[12px] text-[var(--ink3)]"><Lock className="h-3 w-3" /> 유형·레이아웃·개수는 코너 유형 관리에서 정의 · 수정 불가 · <b className="text-[var(--ink2)]">코너명만 편집</b></div>
        <Row label="코너 유형"><span className={cornerTypeChipClass(corner.cornerType)}>{corner.cornerType}</span></Row>
        <Row label="배열·레이아웃">{cornerLayoutText(corner.cornerType, corner.layout, corner.layoutDetail) || '—'}</Row>
        <Row label="코너명">
          {editName ? (
            <div className="flex items-center gap-1.5">
              <input value={nameVal} onChange={(e) => setNameVal(e.target.value)} autoFocus
                className="h-[32px] min-w-0 flex-1 rounded-[6px] border border-[var(--line3)] px-2 text-[13px] focus:border-[var(--ac)] focus:outline-none" />
              <button type="button" onClick={saveName}
                className="inline-flex h-[30px] shrink-0 items-center gap-1 rounded-[6px] bg-[var(--ac)] px-2 text-[12px] font-semibold text-white hover:bg-[var(--ac-h)]"><Check className="h-3 w-3" /> 완료</button>
              <button type="button" onClick={() => { setNameVal(corner.name); setEditName(false); }}
                className="inline-flex h-[30px] shrink-0 items-center gap-1 rounded-[6px] border border-[var(--line2)] bg-white px-2 text-[12px] text-[var(--ink3)] hover:bg-[var(--th)]"><X className="h-3 w-3" /> 취소</button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="min-w-0 flex-1 truncate font-medium">{nameVal}</span>
              <button type="button" onClick={() => setEditName(true)}
                className="inline-flex shrink-0 items-center gap-1 rounded-[6px] border border-[var(--line2)] px-2 py-0.5 text-[12px] font-medium text-[var(--ink3)] hover:border-[var(--line3)] hover:bg-[var(--th)]"><Pencil className="h-3 w-3" /> 수정</button>
            </div>
          )}
        </Row>
        {/* 코너 속성(표시 항목) 요약 — 코너 유형 관리가 정의한 껍데기의 표시 항목을 읽기전용으로(②수급·③채우기에서 뭘 채우는지 먼저 보여줌).
            좁은 패널이라 전체 Y/N 표(오버플로) 대신 그룹별 '칩 요약'으로 — 코너(카드)/아이템(요소) 그룹·고정/옵션 구분은 유지(2026-11-05 사용자 요청). */}
        {(() => {
          const spec = cornerFieldSpec(corner.cornerType, corner.layoutDetail ?? corner.layout);
          if (!spec) return null;
          const cornerFixed = spec.required.filter((f) => f.group === 'corner');
          const itemFixed = spec.required.filter((f) => f.group === 'item');
          const itemOpt = (spec.optional ?? []).filter((f) => f.group === 'item');
          const isGaro = /가로/.test(corner.layoutDetail ?? corner.layout ?? '');
          const FieldChip = ({ ko, code, opt }: { ko: string; code?: string; opt?: boolean }) => (
            <span className={cn('inline-flex items-center gap-1 rounded-[6px] border px-1.5 py-0.5 text-[11px]', opt ? 'border-[#cfd2ff] bg-[#f3f0ff] text-[var(--ac)]' : 'border-[var(--line2)] bg-white text-[var(--ink2)]')}>
              {ko}{code && <span className="text-[9px] text-[var(--ink4)]">{code}</span>}
            </span>
          );
          const Grp = ({ color, title, children }: { color: string; title: string; children: React.ReactNode }) => (
            <div>
              {/* 단문자 배지(코·아) 제거 — 제목 색으로만 구분(2026-11-05 사용자 요청) */}
              <div className="mb-1 flex items-center gap-1">
                <span className="text-[11px] font-bold" style={{ color }}>{title}</span>
              </div>
              <div className="flex flex-wrap gap-1">{children}</div>
            </div>
          );
          const hasCorner = spec.options.length > 0 || cornerFixed.length > 0;
          const hasItem = itemFixed.length > 0 || itemOpt.length > 0 || isGaro;
          if (!hasCorner && !hasItem) return null;
          return (
            <div className="mt-3 space-y-2.5 border-t border-[var(--line2)] pt-3">
              <p className="text-[12px] font-bold text-[var(--ink2)]">코너 속성 <span className="font-normal text-[var(--ink4)]">· 이 껍데기가 쓰는 표시 항목</span></p>
              {hasCorner && (
                <Grp color="#3617ce" title="코너(카드)">
                  {spec.options.map((o) => <FieldChip key={o} ko={o} opt />)}
                  {cornerFixed.map((f) => <FieldChip key={f.key} ko={f.ko} code={f.key} />)}
                </Grp>
              )}
              {hasItem && (
                <Grp color="#00a058" title="아이템(요소)">
                  {isGaro && <FieldChip ko="형태" code="Variants" />}
                  {itemFixed.map((f) => <FieldChip key={f.key} ko={f.ko} code={f.key} />)}
                  {itemOpt.map((f) => <FieldChip key={f.key} ko={f.ko} code={f.key} opt />)}
                </Grp>
              )}
              <p className="text-[10.5px] text-[var(--ink4)]"><span className="mr-1.5 inline-block rounded-[4px] border border-[#cfd2ff] bg-[#f3f0ff] px-1 text-[var(--ac)]">옵션</span> 빌더에서 on/off · 나머지는 고정</p>
            </div>
          );
        })()}
      </Sec>

      {/* ② 수급 — 클릭해 전환. 프로필형은 CVM 데이터 연동 고정(잠금). */}
      <Sec n={2} title="수급 — 이 자리를 누가 채우나" help>
        {isProfile && <p className="mb-2 flex items-center gap-1 rounded-[8px] bg-[#eef2ff] px-3 py-2 text-[12px] text-[#2e4fd6]"><Lock className="h-3.5 w-3.5" /> 프로필형은 고객 정보라 <b>CVM 데이터 연동</b>으로 고정됩니다.</p>}
        <div className="space-y-2">
          {REC_SOURCE_METHODS.map((m) => {
            const info = REC_SOURCE_INFO[m]; const on = m === src; const Icon = REC_ICON[m] ?? Sparkles;
            return (
              <button key={m} type="button" disabled={isProfile} onClick={() => { setSrc(m); onRecSourceChange(m); }} className={cn('w-full rounded-[10px] border px-3 py-2.5 text-left transition', on ? 'border-[var(--ac)] bg-[var(--ac2)]' : 'border-[var(--line3)] bg-white hover:border-[var(--ink5)]', isProfile && !on && 'opacity-40')}>
                <div className="flex items-center gap-2">
                  <span className={cn('grid h-4 w-4 shrink-0 place-items-center rounded-full border', on ? 'border-[var(--ac)] bg-[var(--ac)]' : 'border-[var(--line3)]')}>{on && <span className="h-1.5 w-1.5 rounded-full bg-white" />}</span>
                  <Icon className={cn('h-3.5 w-3.5', on ? 'text-[var(--ac)]' : 'text-[var(--ink4)]')} />
                  <b className="text-[13px] text-[var(--ink)]">{m}</b>
                  {/* 설명 문구는 ⓘ 툴팁으로(인라인 제거, 2026-11-05 사용자 요청) */}
                  <Tip text={info.how} />
                </div>
                {/* 파란=CVM이 내려주는 것, 노랑=전시 어드민이 채우는 것. 라벨로 구분(2026-11-05 사용자 요청: 칩 의미 구분). */}
                <div className="ml-6 mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px]">
                  <span className="text-[var(--ink4)]">CVM이 줌</span>
                  <span className="rounded-[4px] bg-[#e6efff] px-1.5 py-0.5 font-semibold text-[#2e6ff2]">{info.cvmGives}</span>
                  <span className="text-[var(--line2)]">|</span>
                  <span className="text-[var(--ink4)]">우리가 채움</span>
                  <span className="rounded-[4px] bg-[#fff0d6] px-1.5 py-0.5 font-semibold text-[#b67a12]">{info.weBuild}</span>
                </div>
              </button>
            );
          })}
        </div>
      </Sec>

      {/* ③ 수급 방식별 — 운영자 편성=채우기, 데이터 연동=요청, 콘텐츠 연동=구좌만 */}
      {src === '운영자 편성' ? (
        <Sec n={3} title="채우기 — 항목 등록">
          {/* 칩 불러오기 모달 — 탭(코너 속성)에서 눌러도 뜨도록 탭 바깥(최상단)에 렌더(2026-11-05 사용자 요청). */}
          {chipLoadOpen && (
            <ChipLoadModal categories={catCategories} current={chips} onClose={() => setChipLoadOpen(false)}
              onAdd={(cs) => { setChips((prev) => [...prev, ...cs.filter((c) => !prev.includes(c))]); setChipLoadOpen(false); onToast(`칩 ${cs.length}개 담음`); }} />
          )}
          {/* ── 코너 속성 / 아이템 탭 — 등록을 나눠서(2026-11-05 사용자 요청). 코너 속성이 없으면(배너형 등) 아이템만 노출. ── */}
          {(hasCornerTitle || hasButtonText || availOptions.length > 0) && (
            <div className="mb-3 flex gap-1 rounded-[8px] border border-[var(--line2)] bg-[var(--th)] p-0.5 text-[12px] font-semibold">
              <button type="button" onClick={() => setFillTab('코너')} className={cn('flex-1 rounded-[6px] px-3 py-1.5 text-center', fillTab === '코너' ? 'bg-white text-[var(--ac)] shadow-sm' : 'text-[var(--ink3)]')}>코너 속성</button>
              <button type="button" onClick={() => setFillTab('아이템')} className={cn('flex-1 rounded-[6px] px-3 py-1.5 text-center', fillTab === '아이템' ? 'bg-white text-[var(--ac)] shadow-sm' : 'text-[var(--ink3)]')}>아이템 <span className="font-normal opacity-70">· {items.length}</span></button>
            </div>
          )}
          {/* ── 코너 속성 — 코너 타이틀·버튼 텍스트·옵션(배너·칩·CTA). ── */}
          {(hasCornerTitle || hasButtonText || availOptions.length > 0) && fillTab === '코너' && (
            <div className="mb-1 rounded-[8px] border border-[var(--line3)] bg-[var(--th)] p-2.5">
              <p className="mb-2 text-[12px] font-bold text-[var(--ink2)]">코너 <span className="font-normal text-[var(--ink4)]">· 코너 전체에 적용</span></p>
              {hasCornerTitle && (
                <label className="mb-2 block">
                  <span className="mb-1 block text-[11px] font-semibold text-[var(--ink3)]">코너 타이틀 <span className="font-normal text-[var(--ink4)]">CornerTitle</span></span>
                  <input value={cornerTitleVal} onChange={(e) => { setCornerTitleVal(e.target.value); onPreviewPatch({ mainTitle: e.target.value || 'CornerTitle' }); }} placeholder="코너 제목 입력" className="h-[32px] w-full rounded-[6px] border border-[var(--line2)] bg-white px-2 text-[13px] focus:border-[var(--ac)] focus:outline-none" />
                </label>
              )}
              {hasButtonText && (
                <label className="mb-2 block">
                  <span className="mb-1 block text-[11px] font-semibold text-[var(--ink3)]">버튼 텍스트 <span className="font-normal text-[var(--ink4)]">ButtonText · 타이틀 아래 보조 문구</span></span>
                  <input value={buttonTextVal} onChange={(e) => { setButtonTextVal(e.target.value); onPreviewPatch({ subTitle: e.target.value || 'ButtonText' }); }} placeholder="예: 카테고리별 혜택" className="h-[32px] w-full rounded-[6px] border border-[var(--line2)] bg-white px-2 text-[13px] focus:border-[var(--ac)] focus:outline-none" />
                </label>
              )}
              {/* 옵션(배너·칩·CTA) — On/Off. CTA는 위 '버튼 텍스트'로 설정하므로 별도 패널 없음 → 길게 쌓이지 않음(2026-11-05 사용자 요청). */}
              {availOptions.length > 0 && (
                <div className="border-t border-[var(--line2)] pt-2">
                  <p className="mb-1.5 text-[11px] font-semibold text-[var(--ink3)]">옵션 <span className="font-normal text-[var(--ink4)]">· 배너·칩·CTA On/Off</span></p>
                  <div className="flex flex-wrap gap-1.5">
                    {availOptions.map((o) => (
                      <button key={o} type="button"
                        onClick={() => { const no = { ...optOn, [o]: !optOn[o] }; setOptOn(no); onOptionsChange(no, ctaLabelVal); }}
                        className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold', optOn[o] ? 'bg-[var(--ac)] text-white' : 'border border-[var(--line3)] bg-white text-[var(--ink3)]')}>
                        {o}<span className={optOn[o] ? 'text-white/80' : 'text-[var(--ink4)]'}>{optOn[o] ? 'On' : 'Off'}</span>
                      </button>
                    ))}
                  </div>
                  {/* 배너 On → 이미지 입력(한 칸만). 세로형+배너·세로형+칩이 서로 다른 배열이라 배너·칩이 동시에 켜지는 일은 거의 없음. */}
                  {optOn['배너'] && (
                    <div className="mt-2 rounded-[7px] border border-[var(--line2)] bg-white p-2">
                      <p className="mb-1.5 text-[11px] font-semibold text-[var(--ink3)]">배너 이미지</p>
                      <div className="flex items-center gap-1.5">
                        <span className="grid h-10 w-16 shrink-0 place-items-center overflow-hidden rounded-[6px] border border-[var(--line2)] bg-white text-[var(--ink4)]">
                          {bannerImg ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={bannerImg} alt="배너" className="h-full w-full object-cover" /> : <ImageIcon className="h-4 w-4" />}
                        </span>
                        <input value={bannerImg} onChange={(e) => setBannerImg(e.target.value)} placeholder="이미지 주소 입력" className="h-[32px] min-w-0 flex-1 rounded-[6px] border border-[var(--line2)] px-2 text-[13px] focus:border-[var(--ac)] focus:outline-none" />
                        <button type="button" onClick={() => onToast('이미지 불러오기 (데모)')} className="shrink-0 rounded-[6px] border border-[var(--line2)] px-2 py-1 text-[12px] font-medium text-[var(--ink2)] hover:bg-[var(--th)]">불러오기</button>
                      </div>
                    </div>
                  )}
                  {/* 칩 On → 카테고리 탭 */}
                  {optOn['칩'] && (
                    <div className="mt-2 rounded-[7px] border border-[var(--line2)] bg-white p-2">
                      <div className="mb-1.5 flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-[var(--ink3)]">카테고리 탭</span>
                        <span className="rounded-full bg-[var(--th)] px-1.5 text-[11px] font-bold text-[var(--ink3)]">{chips.length}개</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {chips.map((c, i) => (
                          <span key={i} onClick={() => setActiveChip(i)}
                            className={cn('inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-medium', i === chipIdx ? 'border-[var(--ac)] bg-[var(--ac2)] text-[var(--ac)]' : 'border-[var(--line3)] bg-white text-[var(--ink2)]')}>
                            {c}
                            {c !== '전체' && <button type="button" onClick={(e) => { e.stopPropagation(); setChips((cs) => cs.filter((_, j) => j !== i)); }} className="text-[var(--ink4)] hover:text-[var(--bad)]"><X className="h-3 w-3" /></button>}
                          </span>
                        ))}
                        <button type="button" onClick={() => setChipLoadOpen(true)} className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-[#cfd2ff] px-2.5 py-1 text-[12px] font-semibold text-[var(--ac)]"><Plus className="h-3 w-3" /> 칩 불러오기</button>
                      </div>
                      <p className="mt-1.5 text-[11px] text-[var(--ink4)]">칩을 누르면 아래 <b className="text-[var(--ink3)]">아이템</b>이 그 칩의 항목으로 바뀝니다 — 칩마다 따로 채워요.</p>
                    </div>
                  )}
                  {/* CTA On → 하단 더보기 버튼 문구(전체보기 등). 버튼 텍스트(서브 타이틀)와는 별개(2026-11-05 사용자 요청). */}
                  {optOn['CTA'] && (
                    <div className="mt-2 rounded-[7px] border border-[var(--line2)] bg-white p-2">
                      <p className="mb-1.5 text-[11px] font-semibold text-[var(--ink3)]">CTA <span className="font-normal text-[var(--ink4)]">하단 더보기 버튼 · 문구 + 링크</span></p>
                      <div className="flex gap-1.5">
                        <input value={ctaLabelVal} onChange={(e) => { setCtaLabelVal(e.target.value); onPreviewPatch({ moreButtonUse: true, moreButtonLabel: e.target.value || 'CTA' }); }} placeholder="문구 (예: 전체보기)" className="h-[32px] min-w-0 flex-1 rounded-[6px] border border-[var(--line2)] px-2 text-[13px] focus:border-[var(--ac)] focus:outline-none" />
                        <div className="flex h-[32px] min-w-0 flex-1 items-center gap-1 rounded-[6px] border border-[var(--line2)] px-2">
                          <Link2 className="h-3.5 w-3.5 shrink-0 text-[var(--ink4)]" />
                          <input value={ctaLinkVal} onChange={(e) => { setCtaLinkVal(e.target.value); onPreviewPatch({ moreButtonLink: e.target.value }); }} placeholder="이동 링크" className="h-full min-w-0 flex-1 bg-transparent text-[12px] focus:outline-none" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {/* ── 아이템 탭(또는 코너 속성이 없는 유형)에서만 아이템 리스트 노출 ── */}
          {(!(hasCornerTitle || hasButtonText || availOptions.length > 0) || fillTab === '아이템') && (
          <>
          {/* 배너형 = 배너 캠페인 관리에서 '가져오기'로만 채움 — 안내 + 아래 가져오기 버튼(2026-11-05 사용자 요청). */}
          {isBanner && (
            <div className="mb-2 flex items-start gap-2 rounded-[8px] border border-[var(--line2)] bg-white px-3 py-2.5 text-[12px] leading-relaxed text-[var(--ink2)]">
              <GalleryHorizontalEnd className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ac)]" />
              <span>배너 소재는 <b className="text-[var(--ac)]">배너 캠페인 관리</b>에서 등록해요. 아래 <b>배너 가져오기</b>로 등록된 배너를 담습니다.</span>
            </div>
          )}
          {/* ── 아이템 — 실제 노출 항목 리스트(코너 유형 관리의 '아이템'에 대응). ── */}
          <p className="mb-1.5 text-[12px] font-bold text-[var(--ink2)]">아이템 <span className="font-normal text-[var(--ink4)]">· {itemWord} {items.length}개</span></p>
          {/* 칩 On이면 '현재 칩의 메뉴'임을 알려주고, 칩마다 메뉴가 따로 저장된다. */}
          {chipMode && (
            <div className="mb-1.5 mt-1 flex flex-wrap items-center gap-1.5 text-[12px]">
              <span className="font-semibold text-[var(--ink2)]">칩 <span className="text-[var(--ac)]">&lsquo;{chips[chipIdx]}&rsquo;</span>의 메뉴</span>
              <span className="text-[var(--ink4)]">— 위 칩을 눌러 칩별로 따로 구성</span>
            </div>
          )}
          <div className="space-y-1.5">
            {items.length === 0 && <p className="rounded-[8px] border border-dashed border-[var(--line3)] px-3 py-4 text-center text-[12px] text-[var(--ink4)]">아직 {itemWord}가 없어요 · &lsquo;{itemWord} 추가&rsquo;로 {canLoad ? (loadOnly ? '등록된 ' + itemWord + '에서 담으세요' : '카탈로그에서 끌어오세요') : '추가하세요'}</p>}
            {items.map((o) => {
              // 콘텐츠 안내형 = 영화만 '불러오기' 전용(직접입력·토글·링크 없음) → 포스터+제목+평점·예매율 표기(2026-11-05 사용자 요청).
              if (loadOnly) {
                return (
                <div key={o.id} className="flex items-center gap-2 rounded-[9px] border border-[var(--line2)] bg-white px-2 py-1.5">
                  {/* 배너 단일형은 순서 변경 없음 → 드래그 핸들 숨김(2026-11-05 사용자 요청) */}
                  {!bannerSingle && <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-[var(--ink4)]" />}
                  {/* 배너는 썸네일을 '배너답게' 넓은 가로 비율로(2026-11-05 사용자 요청). 그 외(영화·혜택)는 정사각 */}
                  {isBanner ? (
                    <span className="grid h-11 w-[84px] shrink-0 place-items-center overflow-hidden rounded-[6px] border border-[var(--line2)] bg-[var(--th)] text-[var(--ink4)]">
                      <ItemIcon src={o.icon} iconClass="h-5 w-5" imgClass="h-full w-full object-cover" />
                    </span>
                  ) : (
                    <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[7px] border border-[var(--line2)] bg-[var(--th)] text-[var(--ink4)]">
                      <ItemIcon src={o.icon} iconClass="h-5 w-5" imgClass="h-full w-full object-contain" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[var(--ink)]">{o.label || `${itemWord} 미선택`}</p>
                    <p className="truncate text-[11px] text-[var(--ink4)]">{o.sub || loadFields}</p>
                  </div>
                  <span className="hidden shrink-0 rounded-[5px] bg-[var(--ac2)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--ac)] sm:inline">{loadFields} 자동</span>
                  <button type="button" onClick={() => (canLoad ? setLoadForId(o.id) : onToast('불러오기 (데모)'))} className="shrink-0 rounded-[7px] border border-[var(--line2)] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[var(--ink2)] hover:bg-[var(--th)]">변경</button>
                  <button type="button" onClick={() => removeItem(o.id)} className="grid h-6 w-6 shrink-0 place-items-center rounded-[6px] text-[var(--ink4)] hover:bg-[#fff0f1] hover:text-[var(--bad)]"><X className="h-3.5 w-3.5" /></button>
                </div>
                );
              }
              const loaded = o.mode === 'load';
              // 칩형 등 — 한 줄 레이아웃(아이콘·텍스트·링크) + 중립 세그먼트 토글.
              return (
              <div key={o.id} className="flex items-center gap-1.5 rounded-[9px] border border-[var(--line2)] bg-white px-2 py-1.5">
                <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-[var(--ink4)]" />
                {/* 모드 — 세그먼트. 선택 칩은 흰 배경 + 연보라 링 + 보라 글자로 또렷하게(2026-11-05 사용자 요청). */}
                <div className="flex shrink-0 gap-0.5 rounded-[8px] border border-[var(--line2)] bg-[var(--th)] p-[3px] text-[11px] font-semibold">
                  <button type="button" onClick={() => setItemMode(o.id, 'direct')} className={cn('rounded-[6px] px-2.5 py-1 transition', !loaded ? 'bg-white text-[var(--ac)] shadow-sm ring-1 ring-[#cfd2ff]' : 'text-[var(--ink4)] hover:text-[var(--ink2)]')}>직접</button>
                  <button type="button" onClick={() => { setItemMode(o.id, 'load'); if (canLoad) setLoadForId(o.id); }} className={cn('rounded-[6px] px-2.5 py-1 transition', loaded ? 'bg-white text-[var(--ac)] shadow-sm ring-1 ring-[#cfd2ff]' : 'text-[var(--ink4)] hover:text-[var(--ink2)]')}>불러오기</button>
                </div>
                {/* 아이콘 */}
                {loaded ? (
                  <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-[7px] border border-[var(--line2)] bg-[var(--th)] text-[var(--ink4)]">
                    <ItemIcon src={o.icon} iconClass="h-[18px] w-[18px]" imgClass="h-5 w-5 object-contain" />
                  </span>
                ) : (
                  <button type="button" onClick={() => onToast('아이콘 선택 (데모)')} title="아이콘 선택" className="grid h-8 w-8 shrink-0 place-items-center rounded-[7px] border border-dashed border-[var(--line3)] bg-white text-[var(--ink4)] hover:border-[var(--ac)] hover:text-[var(--ac)]"><ImageIcon className="h-4 w-4" /></button>
                )}
                {/* 텍스트 */}
                <input value={o.label} onChange={(e) => setItemLabel(o.id, e.target.value)} readOnly={loaded} placeholder="텍스트"
                  className={cn('h-[32px] min-w-0 flex-1 rounded-[7px] px-2 text-[13px] focus:outline-none', loaded ? 'bg-[var(--th)] text-[var(--ink2)]' : 'border border-[var(--line2)] focus:border-[var(--ac)]')} />
                {/* 링크 */}
                <div className={cn('flex h-[32px] min-w-0 basis-[34%] items-center gap-1 rounded-[7px] px-2', loaded ? 'bg-[var(--th)]' : 'border border-[var(--line2)]')} title="이동 링크">
                  <Link2 className="h-3.5 w-3.5 shrink-0 text-[var(--ink4)]" />
                  <input value={o.link ?? ''} onChange={(e) => setItemLink(o.id, e.target.value)} readOnly={loaded} placeholder="이동 링크"
                    className={cn('h-full min-w-0 flex-1 bg-transparent text-[12px] focus:outline-none', loaded && 'text-[var(--ink3)]')} />
                </div>
                <button type="button" onClick={() => removeItem(o.id)} className="grid h-6 w-6 shrink-0 place-items-center rounded-[6px] text-[var(--ink4)] hover:bg-[#fff0f1] hover:text-[var(--bad)]"><X className="h-3.5 w-3.5" /></button>
              </div>
              );
            })}
          </div>
          {/* 불러오기 모달 — 유형별 카탈로그에서 멀티 셀렉으로 담기 */}
          {loadForId && (
            <ProductLoadModal catalog={catalog} cornerType={isStatus ? '상태 안내형' : corner.cornerType} onClose={() => setLoadForId(null)}
              onAdd={(ps) => { addFromCatalog(ps); onToast(`${ps.length}개 담음`); }} />
          )}
          {/* 메뉴 추가 = 카탈로그(공차·뚜레쥬르·티켓…)에서 끌어오기. 카탈로그 없으면 빈 행 추가(2026-10-28 사용자 요청). */}
          <button type="button" onClick={() => (canLoad ? setLoadForId(APPEND_LOAD) : addItem())} className="mt-2 flex w-full items-center justify-center gap-1 rounded-[8px] border border-[#cfd2ff] bg-[var(--ac2)] py-2 text-[12px] font-bold text-[var(--ac)] hover:bg-[#e6e8ff]"><Plus className="h-3.5 w-3.5" /> {isBanner ? '배너 가져오기 (배너 캠페인 관리에서)' : isStatus ? '상태 카드 가져오기' : (itemWord + ' 추가' + (canLoad ? (loadOnly ? ' (등록된 ' + itemWord + '에서)' : ' (카탈로그에서)') : ''))}</button>
          </>
          )}
        </Sec>
      ) : isData ? (
        <Sec n={3} title="요청 — CVM에 무엇을 달라고 할지" help>
          <div className="mb-2 flex items-start gap-1.5 rounded-[8px] bg-[#eef2ff] px-3 py-2 text-[12px] leading-relaxed text-[#2e4fd6]">
            <span className="mt-0.5">ⓘ</span><span><b>우리가 제안하는 요청 안</b> · 아래에서 고른 범위로 CVM에 요청합니다(협의 중 조정 가능).</span>
          </div>
          <p className="mb-1.5 text-[12px] font-semibold text-[var(--ink3)]">요청 중분류</p>
          <div className="flex flex-wrap gap-1.5">
            {CVM_CATALOGS.map((c) => (
              <button key={c} type="button" onClick={() => setCat(c)} className={cn('rounded-[8px] px-2.5 py-1.5 text-[12px] font-semibold', c === cat ? 'bg-[var(--ac)] text-white' : 'bg-[var(--th)] text-[var(--ink2)] hover:bg-[var(--line)]')}>{c}</button>
            ))}
          </div>
          <p className="mb-1.5 mt-3 text-[12px] font-semibold text-[var(--ink3)]">요청 개수</p>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setTopN(n)} className={cn('grid h-7 w-7 place-items-center rounded-[6px] text-[12px] font-semibold', n === topN ? 'bg-[var(--ac)] text-white' : 'border border-[var(--line2)] text-[var(--ink3)]')}>{n}</button>
            ))}
            <span className="ml-1 text-[11px] text-[var(--ink4)]">CVM 상한 5</span>
          </div>
          <details className="mt-3 rounded-[8px] bg-[var(--th)] px-3 py-2 text-[12px] text-[var(--ink3)]">
            <summary className="cursor-pointer font-semibold">▸ CVM이 주지 않는 것 5가지</summary>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[11px] text-[var(--ink4)]">
              <li>세그먼트(개별 고객 단위만)</li><li>고객 성향·인사이트(C360·데이터실)</li><li>제휴 콘텐츠(EPC 밖)</li><li>레이아웃·카드 모양(전시 설계)</li><li>문구만 따로 베리에이션</li>
            </ul>
          </details>
        </Sec>
      ) : (
        <Sec n={3} title="요청 — 구좌만 넘김" help>
          <p className="rounded-[8px] bg-[var(--ac2)] px-3 py-2.5 text-[12px] leading-relaxed text-[var(--ink2)]">
            <b className="text-[var(--ac)]">CVM 콘텐츠 연동</b> = 구좌(자리)만 넘깁니다. 이미지·문구·랜딩까지 <b>CVM이 완성본을 내려주고</b> 전시 어드민은 받은 그대로 노출합니다. 별도 요청 범위(③) 설정은 없습니다.
          </p>
        </Sec>
      )}

      {/* ④ 폴백 — CVM 수급일 때 */}
      {isCvmSrc && (
        <Sec n={4} title="폴백 — CVM 응답이 비었을 때" help>
          <div className="space-y-1.5">
            {(['미노출', '운영자 편성으로 대체'] as const).map((f) => {
              const on = fb === f;
              return (
                <button key={f} type="button" onClick={() => { setFb(f); onPreviewFallback(true); }} className={cn('flex w-full items-start gap-2 rounded-[8px] border px-2.5 py-2 text-left text-[12px]', on ? 'border-[#f2c47a] bg-[#fff8ef]' : 'border-[var(--line2)] bg-white opacity-80')}>
                  <span className={cn('mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border', on ? 'border-[#e59a2a] bg-[#e59a2a]' : 'border-[var(--line3)]')}>{on && <span className="h-1.5 w-1.5 rounded-full bg-white" />}</span>
                  <span className="min-w-0 flex-1">
                    <b className="text-[var(--ink)]">{f === '미노출' ? '미노출 (기본)' : '운영자 편성으로 대체'}</b>
                    <span className="block text-[var(--ink4)]">{f === '미노출' ? 'CVM이 비면 이 코너는 노출되지 않아요.' : '등록한 운영자 편성 항목을 대신 노출해요.'}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Sec>
      )}

      {/* ⑤ 대체 소재 — CVM + 운영자 편성으로 대체일 때 */}
      {isCvmSrc && fb === '운영자 편성으로 대체' && (
        <Sec n={5} title="대체 소재 — 대표 아이템(조립 규격)" help>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[12px] text-[var(--ink3)]">콘텐츠 묶음 <b className="text-[var(--ink)]">{Math.min(items.length, 3)}</b></span>
            <span className="rounded-[6px] bg-[var(--ac2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ac)]">✦ 노출 {corner.maxItems ?? 10} = 운영자 {Math.min(items.length, 3)} + CVM 보충 {Math.max((corner.maxItems ?? 10) - Math.min(items.length, 3), 0)} <span className="rounded-[4px] bg-white/70 px-1">가안</span></span>
          </div>
          <div className="space-y-1.5">
            {items.slice(0, 3).map((o, i) => (
              <div key={o.id} className="rounded-[8px] border border-[var(--line3)] bg-white p-2.5">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-[var(--ink4)]" />
                  <span className="w-4 shrink-0 text-center text-[12px] text-[var(--ink3)]">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--ink)]">{o.label}</span>
                  <button type="button" onClick={() => onToast('항목 삭제 (데모)')} className="text-[var(--ink4)] hover:text-[var(--bad)]"><Trash2 className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => onToast('수정 (데모)')} className="inline-flex items-center gap-1 rounded-[6px] border border-[var(--line2)] px-2 py-0.5 text-[12px] text-[var(--ink3)] hover:bg-[var(--th)]"><Pencil className="h-3 w-3" /> 수정</button>
                </div>
                <div className="ml-6 mt-1.5 flex items-center gap-2">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[6px] border border-[var(--line2)] bg-[var(--th)] text-[var(--ink4)]"><ImageIcon className="h-4 w-4" /></span>
                  <span className="text-[11px] text-[var(--ink4)]">평점 {(4 + (i * 0.4) % 1).toFixed(1)} · 예매율 {(21 - i * 2).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
          {MiNoChul}
        </Sec>
      )}

      {/* ⑥ 출처 — 이 값이 어디서 오나 */}
      <Sec n={6} title="출처 — 이 값이 어디서 오나" help>
        <div className="overflow-hidden rounded-[8px] border border-[var(--line2)] text-[12px]">
          {[
            ['아이템 · 순서', isCvmSrc ? 'CVM' : '운영자 편성'],
            ['이미지', '상품(EPC) 원장'],
            ['문구', src === 'CVM 콘텐츠 연동' ? 'CVM 완성본' : '빌더 · 상품 원장'],
            ['이동 링크', '빌더'],
          ].map(([k, v], i) => (
            <div key={k} className={cn('flex items-center gap-3 px-3 py-2', i > 0 && 'border-t border-[var(--line2)]')}>
              <span className="w-[72px] shrink-0 text-[var(--ink3)]">{k}</span>
              <span className={cn('rounded-[4px] px-1.5 py-0.5 font-semibold', v === 'CVM' || v === 'CVM 완성본' ? 'bg-[#e6efff] text-[#2e6ff2]' : 'bg-[#fff0d6] text-[#b67a12]')}>{v}</span>
            </div>
          ))}
        </div>
      </Sec>
    </div>
  );
}

/* 코너 칩 카드(존 밴드 내부) — 이미지2: 드래그·이름·복사/삭제·유형/레이아웃·고정 토글 */
/* 코너 순서 변경 행(order3 레퍼런스) — 드래그·번호·이름·유형칩 + 노출 토글 + 삭제. */
function CornerChip({ c, no, selected, fixed, onSelect, onToggleFixed, onDelete, onToast }: { c: PCorner; no: number; selected: boolean; fixed: boolean; onSelect: () => void; onToggleFixed: () => void; onDelete: () => void; onToast: (m: string) => void }) {
  const [on, setOn] = React.useState(true); // 노출 on/off 토글
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: c.templateCornerId });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const layoutText = cornerLayoutText(c.cornerType, c.layout, c.layoutDetail);
  // 이름에 '유형 · ' 접두가 붙은 자동생성 코너는 접두를 떼어 '배열(레이아웃)'만 제목으로(유형은 아래 칩으로만). 2026-11-05 사용자 요청.
  const typePrefix = `${c.cornerType} · `;
  const displayName = c.name.startsWith(typePrefix) ? c.name.slice(typePrefix.length) : c.name;
  return (
    <div ref={setNodeRef} style={style} id={`chip-${c.id}`} onClick={onSelect}
      className={cn('cursor-pointer rounded-[10px] border bg-white px-2.5 py-2 transition',
        isDragging && 'z-10 opacity-80 shadow-lg',
        selected ? 'border-[var(--ac)] bg-[var(--ac2)] ring-1 ring-[var(--ac)]' : 'border-[var(--line2)] hover:border-[var(--line3)]')}>
      {/* 상단 행 — 그립·번호·이름·고정·토글·삭제 */}
      <div className="flex items-center gap-2">
        {/* 그립·번호는 바싹 붙인다(핸들↔번호 빈 공간 축소, 2026-11-05 사용자 요청). */}
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" {...attributes} {...listeners} onClick={(e) => e.stopPropagation()} title="드래그로 순서·밴드 이동"
            className="flex cursor-grab touch-none items-center rounded p-0.5 text-[var(--ink4)] hover:bg-[var(--th)] active:cursor-grabbing">
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <span className="w-4 text-center text-[13px] font-semibold text-[var(--ink3)]">{no}</span>
        </div>
        <span className={cn('min-w-0 flex-1 truncate text-[13px] font-bold', on ? 'text-[var(--ink)]' : 'text-[var(--ink4)]')}>{displayName}</span>
        {/* 고정(Fixed) 토글 */}
        <button type="button" onClick={(e) => { e.stopPropagation(); onToggleFixed(); }} title={fixed ? 'Fixed 고정됨 — 눌러서 해제' : '눌러서 Fixed로 고정'}
          className={cn('inline-flex h-5 shrink-0 items-center gap-1 rounded-[6px] px-1.5 text-[11px] font-semibold transition',
            fixed ? 'bg-[var(--ac2)] text-[var(--ac)]' : 'text-[var(--ink4)] hover:bg-[var(--th)] hover:text-[var(--ink3)]')}>
          {fixed ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />} 고정
        </button>
        {/* 노출 on/off 토글 */}
        <button type="button" onClick={(e) => { e.stopPropagation(); setOn((v) => !v); }} title={on ? '노출 켜짐' : '노출 꺼짐'}
          className={cn('relative h-[20px] w-[34px] shrink-0 rounded-full transition-colors', on ? 'bg-[var(--ac)]' : 'bg-[var(--line3)]')}>
          <span className={cn('absolute top-[2px] h-[16px] w-[16px] rounded-full bg-white shadow-sm transition-all', on ? 'left-[16px]' : 'left-[2px]')} />
        </button>
        {/* 코너 삭제 — 템플릿에서 코너 빼기(원본 코너는 유지) */}
        <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="이 템플릿에서 코너 빼기"
          className="grid h-5 w-5 shrink-0 place-items-center rounded-[6px] text-[var(--ink4)] transition hover:bg-[#fff0f1] hover:text-[var(--bad)]">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {/* 하단 행 — 유형 칩 · 레이아웃(전체 폭, 안 잘림) */}
      {/* 칩·레이아웃 줄 — 번호가 아니라 '제목(텍스트)' 시작선에 맞춘다(그립18+gap4+번호16+gap8=46px). 2026-11-05 사용자 요청. */}
      <div className="mt-1 flex items-center gap-1.5 pl-[46px]">
        <span className={cn(cornerTypeChipClass(c.cornerType), 'shrink-0')}>{c.cornerType}</span>
        {/* 배열·레이아웃은 칩 옆에 '항상' 작게 표기 — 굵은 제목(코너명)은 편집으로 바뀌어도 이 표기는 유지(2026-11-05 사용자 요청). */}
        {layoutText && <span className="whitespace-nowrap text-[11px] text-[var(--ink4)]">{layoutText}</span>}
      </div>
    </div>
  );
}

/* ───────── 코너 리스트 — 순서 그대로 + 연속 존 세그먼트(fixed-dynamic-fixed-dynamic) ─────────
   코너는 배치 순서대로 한 줄로 쌓인다. 드래그 = 순서만 변경(존 유지). '고정' 토글 = 그 자리에서 존만 Fixed↔Dynamic.
   연속된 같은 존을 한 세그먼트(존 라벨 + 좌측 액센트 바)로 묶어, 중간에서 고정하면 fixed-dynamic-fixed-dynamic로 나뉜다.
   존은 Fixed / Dynamic 둘뿐 — 레거시 semi 값은 Dynamic으로 취급(2026-10-28 사용자 요청: 제자리 고정). */
type Band = 'fixed' | 'dynamic';
const bandOf = (c: PCorner): Band => (c.zone === 'fixed' ? 'fixed' : 'dynamic');
// 상단 퀵메뉴(업무 진입형 = 앱 상단 탭 바)는 항상 맨 위. 나머지는 순서 유지(안정 정렬) → 교차 고정은 그대로(2026-10-28 사용자 요청).
// 내용 동일 여부 — props→rows 동기화가 '같은 내용, 다른 참조'로 무한 setState 루프를 만들지 않도록 비교(2026-11-05 버그픽스).
const sameRowList = (a: PCorner[], b: PCorner[]): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    if (x.templateCornerId !== y.templateCornerId || x.zone !== y.zone || x.recSource !== y.recSource || x.isCvm !== y.isCvm) return false;
  }
  return true;
};

function BandedCorners({ corners, onCornersChange, templateId, selCorner, onSelect, onAddCorner, onToast }: {
  corners: PCorner[]; onCornersChange: (rows: PCorner[]) => void; templateId: string; selCorner: string | null; onSelect: (id: string) => void; onAddCorner: () => void; onToast: (m: string) => void;
}) {
  const router = useRouter();
  // 낙관적 로컬 상태 — 드래그 즉시 반영, 서버 저장 후 refresh로 동기화.
  //  등록 순서(order) 그대로 노출한다 — 유형별 재정렬 금지(2026-11-05 사용자 요청: 순서 유지 + 고정은 제자리).
  const [rows, setRows] = React.useState<PCorner[]>(() => corners);
  // props가 '같은 내용·다른 참조'로 와도 rows를 새로 만들지 않는다 → 아래 onCornersChange 효과와의 무한 루프 차단(2026-11-05 버그픽스).
  React.useEffect(() => {
    setRows((prev) => (sameRowList(prev, corners) ? prev : corners));
  }, [corners]);
  // 리스트의 순서·존 변화를 부모(미리보기 공유 상태)로 즉시 올려 미리보기가 바로 반영되게 한다.
  React.useEffect(() => { onCornersChange(rows); }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const rowsRef = React.useRef(rows); rowsRef.current = rows;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // 드래그 = 순서만 변경(존은 그대로). 존 변경은 '고정' 토글로만(제자리 고정). 2026-10-28 사용자 요청.
  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || String(active.id) === String(over.id)) return;
    setRows((prev) => {
      const oi = prev.findIndex((r) => r.templateCornerId === String(active.id));
      const ni = prev.findIndex((r) => r.templateCornerId === String(over.id));
      return oi >= 0 && ni >= 0 ? arrayMove(prev, oi, ni) : prev;
    });
    setTimeout(async () => {
      try {
        await reorderTestCorners(templateId, rowsRef.current.map((r) => r.templateCornerId));
        router.refresh();
      } catch {
        setRows(corners);
        onToast('이동을 저장하지 못했습니다.');
      }
    }, 0);
  }

  // 고정 토글 — 켜면 Fixed로 잠금, 끄면 Dynamic으로 복귀
  async function toggleFixed(c: PCorner) {
    const target: Band = c.zone === 'fixed' ? 'dynamic' : 'fixed';
    setRows((prev) => prev.map((r) => (r.templateCornerId === c.templateCornerId ? { ...r, zone: target } : r))); // 낙관적
    try {
      await setTestCornerZone(templateId, c.templateCornerId, target);
      router.refresh();
      onToast(target === 'fixed' ? `‘${c.name}’ Fixed로 고정했습니다.` : `‘${c.name}’ 고정을 해제했습니다.`);
    } catch {
      setRows(corners);
      onToast('변경을 저장하지 못했습니다.');
    }
  }

  // 코너 삭제 — 템플릿에서 코너 배치 제거(원본 코너는 유지). 낙관적 반영 후 저장.
  async function removeCorner(c: PCorner) {
    if (typeof window !== 'undefined' && !window.confirm(`‘${c.name}’ 코너를 이 템플릿에서 뺄까요?\n(코너 유형 관리의 원본 코너는 남습니다)`)) return;
    setRows((prev) => prev.filter((r) => r.templateCornerId !== c.templateCornerId));
    try {
      await removeCornerFromTemplate(templateId, c.templateCornerId);
      router.refresh();
      onToast(`‘${c.name}’ 코너를 뺐습니다.`);
    } catch {
      setRows(corners);
      onToast('삭제하지 못했습니다.');
    }
  }

  // 연속 번호 — 배치 순서 그대로 1..N
  const noOf = (tcid: string) => rows.findIndex((r) => r.templateCornerId === tcid) + 1;
  // 순서 그대로 연속 같은 존을 한 세그먼트로 묶는다 → fixed-dynamic-fixed-dynamic 교차 표시(2026-10-28 사용자 요청).
  const segments: { band: Band; items: PCorner[] }[] = [];
  for (const r of rows) {
    const b = bandOf(r);
    const last = segments[segments.length - 1];
    if (last && last.band === b) last.items.push(r);
    else segments.push({ band: b, items: [r] });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
      {/* 전체 리스트가 하나의 Sortable — 드래그로 순서만 바뀌고 존은 '고정' 토글로만. */}
      <SortableContext items={rows.map((c) => c.templateCornerId)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {rows.length === 0 ? (
            <button type="button" onClick={onAddCorner}
              className="flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-[var(--line3)] bg-white/50 px-2 py-3 text-[11px] font-medium text-[var(--ink4)] transition hover:border-[var(--ac)] hover:bg-[var(--ac2)] hover:text-[var(--ac)]">
              <Plus className="h-3.5 w-3.5" /> 코너 추가 · 끌어다 놓아도 됩니다
            </button>
          ) : segments.map((seg, si) => {
            const meta = ZONE_META[seg.band];
            return (
              <div key={si}>
                {/* 세그먼트 헤더 — 존 점·라벨·개수 */}
                <div className="mb-1.5 flex items-center gap-1.5 px-0.5">
                  <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: meta.hex }} />
                  <span className="text-[12px] font-extrabold tracking-tight" style={{ color: meta.hex }}>{meta.label}</span>
                  <span className="truncate text-[11px] text-[var(--ink4)]">{meta.en}</span>
                  <span className="ml-auto grid h-[18px] min-w-[18px] shrink-0 place-items-center rounded-full border border-[var(--line2)] bg-white px-1.5 text-[11px] font-bold text-[var(--ink3)]">{seg.items.length}</span>
                </div>
                {/* 세그먼트 본문 — 존 색 좌측 액센트 바 */}
                <div className="space-y-1.5 rounded-r-[8px] border-l-[2px] py-1 pl-2.5 pr-1" style={{ borderColor: meta.hex }}>
                  {seg.items.map((c) => (
                    <CornerChip key={c.templateCornerId} c={c} no={noOf(c.templateCornerId)} selected={c.id === selCorner}
                      fixed={c.zone === 'fixed'} onSelect={() => onSelect(c.id)} onToggleFixed={() => toggleFixed(c)} onDelete={() => removeCorner(c)} onToast={onToast} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}

/* ───────── 템플릿 카드(= order3 '컨테이너' 카드) ───────── */
function TemplateCard({ t, corners, onCornersChange, idx, open, active, onToggle, onActivate, selCorner, onSelCorner, onAddCorner, onPreviewFallback, onToast }: {
  t: PTemplate; corners: PCorner[]; onCornersChange: React.Dispatch<React.SetStateAction<PCorner[]>>;
  idx: number; open: boolean; active: boolean;
  onToggle: () => void; onActivate: () => void;
  selCorner: string | null; onSelCorner: (id: string) => void;
  onAddCorner: () => void; onPreviewFallback: (on: boolean) => void; onToast: (m: string) => void;
}) {
  const selIndex = corners.findIndex((c) => c.id === selCorner);
  const selected = selIndex >= 0 ? corners[selIndex] : null;
  return (
    <div className={cn('rounded-[12px] border bg-white', active ? 'border-[var(--ac)]' : 'border-[var(--line2)]')}>
      {/* 카드 헤더 */}
      <div className={cn('flex items-center gap-2.5 rounded-t-[11px] px-4 py-3', active ? 'bg-[#f1f3f5]' : 'bg-[var(--th)]')}>
        {/* 드래그 핸들 제거 — 단일 템플릿이라 순서 변경이 없음(2026-10-28 사용자 요청) */}
        <button type="button" onClick={onActivate} className="min-w-0 flex-1 text-left">
          <span className="text-[14px] font-bold text-[var(--ink)]">템플릿 구성</span>
          <span className="ml-1.5 text-[12px] text-[var(--ink4)]">· {t.name}{t.conditionGroup ? ` · ${t.conditionGroup}` : ''}</span>
        </button>
        {/* 코너 수 바 그래프 — 코너별 존 색으로(이미지 레퍼런스) */}
        <span className="hidden items-end gap-[2px] md:flex" title={`코너 ${corners.length}개`}>
          {corners.slice(0, 24).map((c, i) => (
            <span key={i} className="w-[3px] rounded-[1px]" style={{ height: 14, background: ZONE_META[c.zone]?.hex ?? 'var(--ac)' }} />
          ))}
        </span>
        <span className="shrink-0 text-[12px] font-medium text-[var(--ink3)]">코너 {corners.length}개</span>
        {t.status !== 'PUBLISHED' && <span className="shrink-0 rounded-[4px] border border-[#ffd8a8] bg-[#fff4e6] px-1.5 py-0.5 text-[11px] font-semibold text-[#e8820c]">확인 필요</span>}
        {t.isDefault && <span className="shrink-0 rounded-[4px] bg-[var(--ac2)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--ac)]">기본</span>}
        <button type="button" onClick={onToggle} className="shrink-0 rounded-[6px] p-1 text-[var(--ink3)] hover:bg-white/60" title={open ? '접기' : '펼치기'}>
          <ChevronDown className={cn('h-4 w-4 transition', !open && '-rotate-90')} />
        </button>
      </div>

      {/* 카드 본문 */}
      {open && (
        <div className="space-y-4 p-4">
          <div>
            <p className="mb-2 text-[13px] font-semibold text-[var(--ink2)]">코너 구성 <span className="text-[var(--ink4)]">{corners.length}개</span></p>
            {/* order3 레퍼런스: 좌측 순서변경 박스만 그레이 배경 + 해상도 기준 고정 높이(내부 스크롤) + 코너 추가 하단 고정.
               코너가 0개여도 밴드(Fixed·Dynamic)는 항상 표시 — 각 밴드에 '추가 가능' 노출(2026-10-21). */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[360px_minmax(0,1fr)] lg:h-[calc(100vh-300px)] lg:min-h-[420px]">
              {/* 코너 순서변경 박스 — 그레이 배경, 리스트 스크롤 + 코너 추가 하단 고정 */}
              <div className="flex min-h-0 flex-col rounded-[12px] border border-[var(--line2)] bg-[var(--th)] p-2.5">
                <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
                  <BandedCorners corners={corners} onCornersChange={onCornersChange} templateId={t.id} selCorner={selCorner}
                    onSelect={(id) => { onActivate(); onSelCorner(id); }} onAddCorner={onAddCorner} onToast={onToast} />
                </div>
                <button type="button" onClick={onAddCorner}
                  className="mt-2 flex w-full shrink-0 items-center justify-center gap-1 rounded-[10px] border border-[#cfd2ff] bg-[var(--ac2)] py-2.5 text-[13px] font-bold text-[var(--ac)] hover:bg-[#e6e8ff]">
                  <Plus className="h-4 w-4" /> 코너 추가
                </button>
              </div>
              {/* 코너 상세 — 독립 스크롤 */}
              <div className="min-h-0 overflow-y-auto pr-0.5">
                <CornerDetail template={t} corner={selected} index={selIndex} onPreviewFallback={onPreviewFallback}
                  onRecSourceChange={(src) => { if (selected) onCornersChange((prev) => prev.map((c) => c.templateCornerId === selected.templateCornerId ? { ...c, recSource: src, isCvm: src.startsWith('CVM') } : c)); }}
                  onOptionsChange={(opts, ctaLabel) => { if (selected) onCornersChange((prev) => prev.map((c) => c.templateCornerId === selected.templateCornerId ? { ...c, preview: applyOptsToPreview(c.preview, opts, ctaLabel) } : c)); }}
                  onPreviewPatch={(patch) => { if (selected) onCornersChange((prev) => prev.map((c) => c.templateCornerId === selected.templateCornerId ? { ...c, preview: c.preview ? { ...c.preview, ...patch } : c.preview } : c)); }}
                  onToast={onToast} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────── 코너 추가 모달(order3 레퍼런스 + 우리 코너 유형 탭, 멀티셀렉) ───────── */
// 코너 = 껍데기 → 같은 (유형·배열) 껍데기는 하나로(2026-10-28 사용자 요청).
//  상품형 = 모든 배열을 가로형/세로형 2개로. 배너형 = 배너 수로 단일형/스와이프형 2개로(2개 이상=스와이프형).
function shellLayout(c: Pick<LibCorner, 'cornerType' | 'layout' | 'layoutDetail' | 'bannerCount'>): string {
  const raw = c.layoutDetail ?? c.layout ?? '';
  if (c.cornerType === '상품형') { if (/세로/.test(raw)) return '세로형'; if (/가로/.test(raw)) return '가로형'; }
  // 배너형 = 단일형/스와이프형. 카탈로그 typeDetail(배너 단일형/스와이프형) 또는 배너 수로 구분.
  if (c.cornerType === '배너형') return (/스와이프/.test(raw) || c.bannerCount >= 2) ? '스와이프형' : '단일형';
  return displayLayout(c.cornerType, raw) || raw;
}
function LoadCornerModal({ corners, onClose, onAdd }: { corners: LibCorner[]; onClose: () => void; onAdd: (cs: LibCorner[]) => void }) {
  const [q, setQ] = React.useState('');
  const [tab, setTab] = React.useState('전체');
  // 상단 탭 = 코너 유형 관리의 전체 유형(7종) + 전체. 유형별 개수 표기.
  const TABS = React.useMemo(() => ['전체', ...VISIBLE_CORNER_TYPES] as const, []);
  // 껍데기 단위로 접기 — 같은 (유형 · 배열(상품형=가로/세로)) 는 대표 하나만. 제목도 '유형 · 배열'로 통일.
  const shells = React.useMemo(() => {
    const seen = new Set<string>(); const out: (LibCorner & { shell: string; shellTitle: string })[] = [];
    for (const c of corners) {
      const sl = shellLayout(c);
      const key = `${c.cornerType}|${sl}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ ...c, shell: sl, shellTitle: `${c.cornerType} · ${layoutLabel(sl) || sl}` });
    }
    return out;
  }, [corners]);
  const countOf = (t: string) => (t === '전체' ? shells.length : shells.filter((c) => c.cornerType === t).length);
  const list = shells.filter((c) => (tab === '전체' || c.cornerType === tab) && (!q || c.shellTitle.includes(q) || c.cornerType.includes(q)));
  // 멀티셀렉 — 체크된 코너 집합 + 우측 미리보기용 포커스
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const [focusId, setFocusId] = React.useState<string | null>(shells[0]?.id ?? null);
  const sel = shells.find((c) => c.id === focusId) ?? null;
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex h-[82vh] w-full max-w-[1040px] overflow-hidden rounded-[16px] bg-white shadow-[var(--dlg-shadow)]" onClick={(e) => e.stopPropagation()}>
        {/* 좌: 유형 상단 탭 + 검색 + 코너 목록 */}
        <div className="flex w-[380px] shrink-0 flex-col border-r border-[var(--line2)]">
          <div className="flex items-center justify-between px-5 pt-4">
            <h3 className="text-[17px] font-bold text-[var(--ink)]">코너 추가 <span className="ml-1 text-[13px] font-medium text-[var(--ink4)]">코너 유형 관리</span></h3>
          </div>
          {/* 유형 탭 — 전체 + 7종(코너 유형 관리). 빈 유형은 비활성 */}
          <div className="flex flex-wrap gap-1.5 px-5 pb-1 pt-3">
            {TABS.map((t) => {
              const cnt = countOf(t); const active = tab === t; const empty = cnt === 0 && t !== '전체';
              return (
                <button key={t} type="button" disabled={empty} onClick={() => setTab(t)}
                  className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-semibold transition',
                    active ? 'border-[var(--ac)] bg-[var(--ac)] text-white'
                    : empty ? 'cursor-not-allowed border-[var(--line2)] bg-[var(--th)] text-[var(--ink5)]'
                    : 'border-[var(--line2)] bg-white text-[var(--ink2)] hover:border-[var(--line3)] hover:bg-[var(--th)]')}>
                  {t}<span className={cn(active ? 'text-white/80' : 'text-[var(--ink4)]')}>{cnt}</span>
                </button>
              );
            })}
          </div>
          <div className="px-5 pb-3 pt-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="코너명 검색" className="h-[38px] w-full rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-3 text-[13px] focus:border-[var(--ac)] focus:outline-none" />
          </div>
          <div className="px-5 pb-1 text-[12px] font-semibold text-[var(--ink3)]">{tab === '전체' ? '전체' : tab} <span className="text-[var(--ink4)]">{list.length}</span></div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
            {list.length === 0 ? <p className="py-8 text-center text-[13px] text-[var(--ink4)]">검색 결과가 없습니다.</p> : list.map((c) => {
              const on = picked.has(c.id);
              return (
                <button key={c.id} type="button" onClick={() => { toggle(c.id); setFocusId(c.id); }}
                  className={cn('flex w-full items-start gap-2.5 rounded-[10px] border px-3.5 py-3 text-left transition', on ? 'border-[var(--ac)] bg-[var(--ac2)]' : focusId === c.id ? 'border-[var(--line3)] bg-[var(--th)]' : 'border-[var(--line2)] hover:border-[var(--line3)]')}>
                  <span className={cn('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border', on ? 'border-[var(--ac)] bg-[var(--ac)] text-white' : 'border-[var(--line3)]')}>{on && <Check className="h-3 w-3" />}</span>
                  {/* 두 줄 — 위: 배열(레이아웃) 굵게 · 아래: 유형 칩. '껍데기…' 안내문구 제거(2026-11-05 사용자 요청). */}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-bold text-[var(--ink)]">{layoutLabel(c.shell) || c.shell || c.cornerType}</span>
                    <span className="mt-1 flex"><span className={cn(cornerTypeChipClass(c.cornerType), 'shrink-0')}>{c.cornerType}</span></span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        {/* 우: 선택 코너 — 화면 구성 미리보기 + 기본 노출 조건 + 추가 */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 px-6 pt-5">
            {sel && <span className="rounded-[6px] bg-[var(--th)] px-2 py-1 text-[12px] font-semibold text-[var(--ink3)]">{sel.id.slice(-8).toUpperCase()}</span>}
            <span className="truncate text-[16px] font-bold text-[var(--ink)]">{sel?.shellTitle ?? '코너를 선택하세요'}</span>
            {sel && <><span className="text-[12px] text-[var(--ink4)]">v1.0.0</span><span className="rounded-[6px] bg-[#eefaf1] px-2 py-0.5 text-[11px] font-semibold text-[#00a058]">운영</span></>}
            <button type="button" onClick={onClose} className="ml-auto rounded-[6px] p-1 text-[var(--ink3)] hover:bg-[var(--th)]"><X className="h-4.5 w-4.5" /></button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {sel ? (
              <>
                <p className="mb-2 text-[14px] font-bold text-[var(--ink)]">화면 구성</p>
                {/* 미리보기 폭 축소 — 코너 유형 관리처럼 폰 폭(최대 300px)으로 가운데 정렬(2026-11-05 사용자 요청). */}
                <div className="rounded-[14px] border border-[var(--line2)] bg-[var(--th)] p-4">
                  <div className="mx-auto w-full max-w-[300px]">
                    <CornerBlock corner={sel.preview} />
                  </div>
                </div>
                <p className="mb-2 mt-5 text-[14px] font-bold text-[var(--ink)]">기본 노출 조건</p>
                <div className="rounded-[10px] bg-[var(--th)] px-4 py-3 text-[13px] leading-relaxed text-[var(--ink2)]">
                  <b className="text-[var(--ink3)]">WHEN</b> 코너 유형 = <b className="text-[var(--ac)]">{sel.cornerType}</b> · 껍데기(레이아웃·노출 타입)만 들어옵니다. 내용은 추가 후 <b>② 수급</b>에서 채웁니다.
                </div>
              </>
            ) : <p className="py-10 text-center text-[13px] text-[var(--ink4)]">왼쪽에서 코너를 선택하세요.</p>}
          </div>
          <div className="border-t border-[var(--line2)] p-4">
            <button type="button" disabled={picked.size === 0} onClick={() => onAdd(corners.filter((c) => picked.has(c.id)))}
              className="h-[48px] w-full rounded-[10px] bg-[var(--ac)] text-[15px] font-bold text-white hover:bg-[var(--ac-h)] disabled:opacity-50">이 코너 추가{picked.size > 0 ? ` (${picked.size})` : ''}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────── 루트 ───────── */
export function ProcessBuilder({ data, isNew = false }: { data: ProcessData; isNew?: boolean }) {
  const router = useRouter();
  const [basicOpen, setBasicOpen] = React.useState(isNew); // 신규 추가=펼침, 기존 접근=접힘(2026-10-28)
  const [activeId, setActiveId] = React.useState(data.activeTemplateId);
  // 아코디언 — 한 번에 하나의 템플릿만 펼침
  const [openId, setOpenId] = React.useState<string | null>(data.activeTemplateId);
  const [selCorner, setSelCorner] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(data.templates.map((t) => [t.id, t.corners[0]?.id ?? ''])));
  const [loadModal, setLoadModal] = React.useState<string | null>(null); // 코너 불러오기 모달(대상 템플릿 id)
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
    setValidation({ issues: validate({ ...data, templates }), at: new Date().toTimeString().slice(0, 5) });
    setPanelOpen(true);
  }, [data]);
  const gotoIssue = (tid?: string) => {
    if (tid) { setActiveId(tid); setOpenId(tid); }
    setPanelOpen(false);
  };
  const errCount = validation?.issues.filter((i) => i.level === '오류').length ?? 0;
  const warnCount = validation?.issues.filter((i) => i.level === '경고').length ?? 0;

  const activeTemplate = data.templates.find((t) => t.id === activeId) ?? data.templates[0];
  // 단일 템플릿 뷰 — 클릭해 들어온 그 템플릿 하나만 보여준다(2026-10-21)
  const templates = activeTemplate ? [activeTemplate] : [];
  const activeSel = activeTemplate ? selCorner[activeTemplate.id] : null;

  // 코너 순서·존의 공유 상태 — 리스트(BandedCorners)와 미리보기가 같은 state를 본다.
  //  드래그/고정으로 즉시 미리보기 반영, 서버 refresh 시 활성 템플릿 코너로 재동기화(2026-10-21).
  const [liveCorners, setLiveCorners] = React.useState<PCorner[]>(activeTemplate?.corners ?? []);
  React.useEffect(() => { setLiveCorners(activeTemplate?.corners ?? []); }, [activeTemplate?.corners]);
  const totalCorners = liveCorners.length;

  // 거버넌스 — 상품 전시 등록과 동일하게 '필수 섹션 완료' 상태로 관리(섹션 배지 + 하단 N/M 완료·승인요청). 2026-10-28 사용자 요청.
  const basicDone = !!activeTemplate?.name;
  const composeDone = totalCorners > 0;
  const validateDone = !!validation && errCount === 0;
  const reqSections = [basicDone, composeDone, validateDone];
  const reqDone = reqSections.filter(Boolean).length;
  const reqTotal = reqSections.length;

  // 선택한 코너를 '양쪽' 모두 그 위치로 스크롤 — 좌측 디바이스 미리보기(pv-)와 가운데 코너 구성 리스트(chip-).
  //  미리보기를 클릭하면 코너 구성에서도 같이 스크롤돼 복잡한 정보에서 길을 잃지 않게 한다(2026-11-05 사용자 요청).
  React.useEffect(() => {
    if (!activeSel) return;
    document.getElementById(`pv-${activeSel}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    document.getElementById(`chip-${activeSel}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeSel]);

  // Figma BO 공통 textfield 토큰 — h38·r6·inset-x 14·본문 14·border #c4c9cf·포커스 border #b3b9c0+ring 2 #dce0e5
  const inputCls = 'h-[38px] w-full rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-[14px] text-[14px] text-[var(--ink)] placeholder:text-[var(--ink5)] focus:border-[var(--focus-border)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]';

  return (
    <ProductCatalogCtx.Provider value={data.catalogByType ?? {}}>
    <div className="relative flex h-full flex-col overflow-hidden rounded-[16px] border border-[var(--line2)] bg-white">
      {/* 스크롤 영역 — 헤더(스크롤 시 함께 올라감) + 2열(좌 디바이스 스티키 · 우 콘텐츠) */}
      <div className="flex-1 overflow-y-auto px-6 pb-4 pt-5">
        {/* 헤더 — 전체 폭, 고정 아님(스크롤하면 같이 올라감). 폰트는 다른 화면과 동일 */}
        <div className="mb-5">
          <nav className="flex flex-wrap items-center gap-1.5 text-[13px] leading-[18px] text-[var(--ink3)]">
            <span>홈</span><ChevronRight className="h-3.5 w-3.5 opacity-50" />
            <span>전시 관리</span><ChevronRight className="h-3.5 w-3.5 opacity-50" />
            <Link href="/admin/containers-test" className="hover:text-[var(--ink)] hover:underline">전시화면 관리</Link>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" /><b className="font-semibold text-[var(--ink)]">{data.containerName}</b>
          </nav>
          <div className="mt-1.5 flex items-center gap-2">
            <h1 className="text-[20px] font-bold leading-[28px] tracking-[-0.3px] text-[var(--ink)]">{data.containerName}</h1>
          </div>
        </div>

        {/* 2열 — 좌 디바이스(스티키·뷰포트 높이, 스크롤해도 제자리에 딱 붙음) · 우 콘텐츠 */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[clamp(384px,26vw,420px)_minmax(0,1fr)] xl:items-start">
          {/* 좌: 미리보기 — 고정 크기 폰(내용이 많아도 안 늘어나고 내부 스크롤), 스티키(NC-Channel 상품 전시 미리보기 기준, 2026-10-27 사용자 요청) */}
          <div className="flex flex-col xl:sticky xl:top-4">
          {/* 기본 ↔ 폴백 토글 + 폴백 설명(토글 옆, 같은 줄) — 설명이 아래로 쌓여 디바이스가 밀리지 않게 한 줄 고정(2026-11-05 사용자 요청) */}
          <div className="mb-3 flex w-full shrink-0 items-center gap-2">
            <div className="flex shrink-0 rounded-[8px] border border-[var(--line2)] bg-[var(--th)] p-0.5 text-[13px] font-semibold">
              <button type="button" onClick={() => setFbMode(false)} className={cn('rounded-[6px] px-5 py-1.5 text-center', !fbMode ? 'bg-white text-[var(--ac)] shadow-sm' : 'text-[var(--ink3)]')}>기본</button>
              <button type="button" onClick={() => setFbMode(true)} className={cn('rounded-[6px] px-5 py-1.5 text-center', fbMode ? 'bg-white text-[#b67a12] shadow-sm' : 'text-[var(--ink3)]')}>폴백</button>
            </div>
            {fbMode && <span title="CVM이 비면 이렇게 노출됩니다 (CVM 수급 코너만 바뀜)" className="flex min-w-0 flex-1 items-center gap-1 text-[11px] text-[#b67a12]"><Layers className="h-3 w-3 shrink-0" /><span className="truncate">CVM 비면 이렇게 노출 (수급 코너만)</span></span>}
          </div>
          <DeviceFrame width={360} bodyHeight={560} headerLabel={data.containerName} slim>
                  {activeTemplate && liveCorners.length > 0 ? (
                    liveCorners.map((c) => {
                      const hidden = fbMode && c.isCvm && c.fallback === '미노출';
                      const replaced = fbMode && c.isCvm && c.fallback === '운영자 편성으로 대체';
                      // CVM 콘텐츠 연동 = 구좌만 넘기고 완성본은 CVM이 내려줌 → 미리보기는 '완성본 자리' 구좌로 표시
                      const cvmContent = c.recSource === 'CVM 콘텐츠 연동' && !hidden && !replaced;
                      if (cvmContent) {
                        return (
                          <div key={c.id} id={`pv-${c.id}`} onClick={() => setSelCorner((m) => ({ ...m, [activeTemplate.id]: c.id }))}
                            className={cn('cursor-pointer scroll-mt-4 rounded-xl border border-dashed border-[#b9a7ff] bg-[#f3f0ff] px-3 py-5 text-center', c.id === activeSel && 'ring-2 ring-[var(--ac)] ring-offset-2')}>
                            <Sparkles className="mx-auto mb-1 h-4 w-4 text-[var(--ac)]" />
                            <p className="text-[12px] font-bold text-[var(--ac)]">CVM 완성본 자리</p>
                            <p className="text-[11px] text-[var(--ink4)]">구좌만 — 이미지·문구·랜딩은 CVM이 내려줘요</p>
                          </div>
                        );
                      }
                      if (hidden) {
                        return (
                          <div key={c.id} id={`pv-${c.id}`} onClick={() => setSelCorner((m) => ({ ...m, [activeTemplate.id]: c.id }))}
                            className={cn('cursor-pointer scroll-mt-4 rounded-xl border border-dashed border-[#f2c47a] bg-[#fff8ef] px-3 py-4 text-center', c.id === activeSel && 'ring-2 ring-[var(--ac)] ring-offset-2')}>
                            <EyeOff className="mx-auto mb-1 h-4 w-4 text-[#b67a12]" />
                            <p className="text-[11px] font-semibold text-[#b67a12]">{c.name} · 미노출</p>
                            <p className="text-[10px] text-[#c99a4e]">CVM이 비어 노출되지 않아요</p>
                          </div>
                        );
                      }
                      return (
                        <div key={c.id} id={`pv-${c.id}`} onClick={() => setSelCorner((m) => ({ ...m, [activeTemplate.id]: c.id }))}
                          className={cn('relative cursor-pointer scroll-mt-4 rounded-xl ring-offset-2 transition', c.id === activeSel && 'ring-2 ring-[var(--ac)]')}>
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

        {/* 우: 기본 정보 + 템플릿 구성 + 구성 검증 — 페이지와 함께 스크롤 */}
        <div className="space-y-6">

            {/* 템플릿 기본 정보 */}
            <section className="overflow-hidden rounded-[16px] border border-[var(--line2)] bg-white">
              <button type="button" onClick={() => setBasicOpen((v) => !v)} className="flex w-full items-center gap-2 bg-[var(--th)] px-5 py-4 transition hover:bg-[var(--surface-hover,#f1f3f5)]">
                <h2 className="text-[15px] font-bold text-[var(--ink)]">템플릿 기본 정보</h2>
                <span className="ml-auto flex items-center gap-2">
                  <span className="rounded-[4px] bg-[#fff0f1] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--bad)]">필수</span>
                  {basicDone
                    ? <span className="rounded-[4px] bg-[#eefaf1] px-1.5 py-0.5 text-[11px] font-semibold text-[#00a058]">완료</span>
                    : <span className="rounded-[4px] bg-white px-1.5 py-0.5 text-[11px] font-medium text-[var(--ink3)] ring-1 ring-inset ring-[var(--line2)]">미작성</span>}
                  <ChevronDown className={cn('h-4 w-4 text-[var(--ink3)] transition', !basicOpen && '-rotate-90')} />
                </span>
              </button>
              {basicOpen && activeTemplate && (
                <div className="border-t border-[var(--line2)] px-6 py-5">
                  <div className="border-t border-[var(--line2)]">
                  <FieldRow label="템플릿명" required>
                    <input defaultValue={activeTemplate.name} placeholder="예: 혜택 VIP" className={inputCls} />
                  </FieldRow>
                  <FieldRow label="메모">
                    <input defaultValue={activeTemplate.memo ?? ''} maxLength={30} placeholder="한글/영문/숫자/특수문자 30자 이내" className={inputCls} />
                  </FieldRow>
                  <FieldRow label="로그인 구분" required>
                    <div className="flex h-[38px] items-center gap-5 text-[14px] text-[var(--ink)]">
                      <label className="flex items-center gap-1.5"><input type="radio" name="tplLogin" defaultChecked={activeTemplate.conditionGroup !== '비로그인'} className="accent-[var(--ac)]" /> 로그인</label>
                      <label className="flex items-center gap-1.5"><input type="radio" name="tplLogin" defaultChecked={activeTemplate.conditionGroup === '비로그인'} className="accent-[var(--ac)]" /> 비로그인</label>
                    </div>
                  </FieldRow>
                  <FieldRow label="기본 템플릿 여부" required>
                    <div className="py-1">
                      <div className="flex items-center gap-5 text-[14px] text-[var(--ink)]">
                        <label className="flex items-center gap-1.5"><input type="radio" name="tplDefault" defaultChecked={!activeTemplate.isDefault} className="accent-[var(--ac)]" /> N</label>
                        <label className="flex items-center gap-1.5"><input type="radio" name="tplDefault" defaultChecked={activeTemplate.isDefault} className="accent-[var(--ac)]" /> Y</label>
                      </div>
                      <p className="mt-1.5 text-[12px] text-[var(--ink4)]">Y로 지정하면 기존 기본 템플릿은 해제됩니다.</p>
                    </div>
                  </FieldRow>
                  <FieldRow label="전시 여부" required>
                    <div className="flex h-[38px] items-center gap-5 text-[14px] text-[var(--ink)]">
                      <label className="flex items-center gap-1.5"><input type="radio" name="tplDisplay" defaultChecked={activeTemplate.displayOn} className="accent-[var(--ac)]" /> 전시</label>
                      <label className="flex items-center gap-1.5"><input type="radio" name="tplDisplay" defaultChecked={!activeTemplate.displayOn} className="accent-[var(--ac)]" /> 미전시</label>
                    </div>
                  </FieldRow>
                  <FieldRow label="전시 기간">
                    <div className="py-1">
                      <div className="flex items-center gap-2">
                        <input type="datetime-local" defaultValue={toLocalInput(activeTemplate.startAt)} disabled={activeTemplate.startAtOnApproval} className={cn(inputCls, 'flex-1', activeTemplate.startAtOnApproval && 'bg-[var(--th)] text-[var(--ink4)]')} />
                        <span className="text-[13px] text-[var(--ink4)]">~</span>
                        <input type="datetime-local" defaultValue={toLocalInput(activeTemplate.endAt)} className={cn(inputCls, 'flex-1')} />
                      </div>
                      <label className="mt-2 flex items-center gap-1.5 text-[12px] text-[var(--ink2)]">
                        <input type="checkbox" defaultChecked={activeTemplate.startAtOnApproval} className="accent-[var(--ac)]" /> 시작일을 승인일시로 설정
                      </label>
                    </div>
                  </FieldRow>
                  </div>
                </div>
              )}
            </section>

            {/* 템플릿 구성 — 클릭해 들어온 단일 템플릿만 (제목은 카드 헤더로) */}
            <section>
              <div className="space-y-3">
                {templates.map((t) => (
                  <TemplateCard
                    key={t.id}
                    t={t}
                    corners={liveCorners}
                    onCornersChange={setLiveCorners}
                    idx={0}
                    open={openId === t.id}
                    active
                    onToggle={() => setOpenId((cur) => (cur === t.id ? null : t.id))}
                    onActivate={() => setActiveId(t.id)}
                    selCorner={selCorner[t.id] ?? null}
                    onSelCorner={(id) => setSelCorner((m) => ({ ...m, [t.id]: id }))}
                    onAddCorner={() => setLoadModal(t.id)}
                    onPreviewFallback={setFbMode}
                    onToast={toast}
                  />
                ))}
              </div>
            </section>

            {/* 구성 검증 */}
            <section className="rounded-[16px] border border-[var(--line2)] bg-white px-5 py-4">
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
        <div className="absolute inset-x-0 bottom-[60px] z-20 border-t border-[var(--line2)] bg-white shadow-[0_-12px_24px_rgba(25,25,60,.08)]">
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

      {/* 하단 고정 액션 바 — 고정 높이 flex 레이아웃의 바닥 고정 자식(order3 .sticky-acts) */}
      <div className="z-30 flex shrink-0 items-center gap-3 border-t border-[var(--line2)] bg-white px-6 py-3">
        <span className="text-[13px] text-[var(--ink3)]">{activeTemplate?.name} · 코너 <b className="text-[var(--ink)]">{totalCorners}</b>개</span>
        <button type="button" onClick={() => validation ? setPanelOpen((v) => !v) : runValidate()}
          className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-medium',
            !validation ? 'border-[var(--line2)] bg-[var(--th)] text-[var(--ink3)]' : errCount > 0 ? 'border-[#ffd0d2] bg-[#fff0f1] text-[var(--bad)]' : 'border-[#bfe7cf] bg-[#eefaf1] text-[#00a058]')}>
          <ShieldCheck className="h-3.5 w-3.5" /> 구성 검증 {!validation ? '미검증' : errCount > 0 ? `오류 ${errCount}건` : '통과'}
          {validation && <ChevronDown className={cn('h-3.5 w-3.5 transition', panelOpen && 'rotate-180')} />}
        </button>
        {/* 거버넌스 — 상품 전시 등록과 동일: 필수 N/M 완료 + 초기화·임시저장·승인요청(필수 미완료면 승인요청 비활성) */}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[13px] text-[var(--ink3)]">필수 <b className={cn('tabular-nums', reqDone === reqTotal ? 'text-[#00a058]' : 'text-[var(--ink)]')}>{reqDone}/{reqTotal}</b> 완료</span>
          <button type="button" onClick={() => toast('초기화')} className="h-[38px] rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-4 text-[13px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]">초기화</button>
          <button type="button" onClick={() => toast('임시저장되었습니다. (데모)')} className="h-[38px] rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-4 text-[13px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]">임시저장</button>
          <button type="button" disabled={reqDone < reqTotal} onClick={() => toast('승인요청되었습니다. (데모)')}
            className="h-[38px] rounded-[var(--r-field)] bg-[var(--ac)] px-5 text-[13px] font-bold text-white hover:bg-[var(--ac-h)] disabled:cursor-not-allowed disabled:bg-[#d0d2ff]">승인요청</button>
        </div>
      </div>

      {loadModal && (
        <LoadCornerModal
          corners={data.libCorners}
          onClose={() => setLoadModal(null)}
          onAdd={async (cs) => {
            const tid = loadModal;
            setLoadModal(null);
            if (tid && cs.length) {
              // 코너 유형(카탈로그)에서 새 코너 껍데기를 생성해 배치 — 코너 유형 관리와 연동(2026-10-28).
              await addCornersFromTypes(tid, cs.map((c) => c.id));
              router.refresh();
              toast(`코너 ${cs.length}개를 추가했습니다.`);
            }
          }}
        />
      )}

      {toastMsg && (
        <div className="pointer-events-none fixed bottom-20 left-1/2 z-[90] -translate-x-1/2">
          <div className="rounded-[8px] bg-[var(--toast-bg)] px-4 py-2.5 text-[13px] text-white shadow-[var(--dlg-shadow)]">{toastMsg}</div>
        </div>
      )}
    </div>
    </ProductCatalogCtx.Provider>
  );
}


