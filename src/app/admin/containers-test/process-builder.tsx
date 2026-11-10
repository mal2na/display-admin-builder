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
import { DeviceFrame, CornerBlock, BannerCard, type PreviewComponent } from '@/components/preview/blocks';
import { PreviewImage } from '@/components/preview/preview-image';
import { compositionToPreviewCorner } from '@/components/preview/composition-preview';
import { FieldRow } from '@/components/ops-ui';
import { cornerTypeChipClass, layoutLabel, displayLayout, cornerFieldSpec, ZONE_META, ZONE_RANK, REC_SOURCE_METHODS, REC_SOURCE_INFO, CORNER_TYPES, VISIBLE_CORNER_TYPES, type Zone } from '@/lib/display-taxonomy';
import { ChevronLeft, ChevronRight, ChevronDown, GripVertical, X, Plus, Copy, Pencil, ShieldCheck, Layers, EyeOff, Lock, LockOpen, Trash2, Sparkles, UserCog, Search, Link2, Check, ImageIcon, Info, GalleryHorizontalEnd, Barcode } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

// 아이템 아이콘 — 'lucide:<Name>'은 벡터 아이콘, 그 외는 실제 이미지(포스터·로고). 2026-11-05 사용자 요청(메뉴 아이콘을 텍스트에 맞는 벡터로).
function ItemIcon({ src, brand, iconClass = 'h-4 w-4', imgClass = 'h-5 w-5 object-contain' }: { src?: string | null; brand?: string | null; iconClass?: string; imgClass?: string }) {
  // 로고 파일이 없는 제휴 브랜드 = 브랜드 색/이니셜 타일로 폴백(회색 아이콘 대신, 2026-11-09 사용자 요청). brand 지정 시만.
  if (!src || src.startsWith('icon:')) {
    if (brand && brand.trim()) return <PreviewImage src={null} brand={brand} className={cn('h-full w-full', imgClass?.includes('object') ? '' : '')} />;
    return <ImageIcon className={iconClass} />;
  }
  if (src.startsWith('lucide:')) {
    // 아웃라인(보더) 대신 'fill 아이콘'으로 — 미리보기 칩의 보라 채운 아이콘과 같은 느낌(2026-11-05 사용자 요청).
    const Cmp = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; fill?: string; strokeWidth?: number }>>)[src.slice(7)] ?? ImageIcon;
    return <Cmp className={iconClass} fill="currentColor" strokeWidth={1.25} />;
  }
  // 미리보기 칩 아이콘(퀵메뉴) — 인라인 SVG 마크업이면 그대로.
  if (src.includes('<svg')) return <span className={cn('inline-flex', iconClass)} aria-hidden dangerouslySetInnerHTML={{ __html: src }} />;
  // 실제 이미지 — 파일이 없으면(404) 브랜드 타일/슬러그로 폴백(PreviewImage).
  return <PreviewImage src={src} alt="" brand={brand} className={imgClass} />;
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
// linkType — 이동 링크를 '내부(앱 내 노출)'로 띄울지 '외부(아웃링크, 외부 브라우저)'로 띄울지. 과금 팝업 호출 기준(2026-11-10 회의: 내부=비과금·외부=과금, 미등록 링크는 과금). 기본 외부.
type FillItem = { id: string; label: string; icon?: string | null; link?: string; linkType?: 'internal' | 'external'; sub?: string; mode: 'direct' | 'load' };
const EMPTY_ITEMS: FillItem[] = [];
const APPEND_LOAD = '__append__'; // '메뉴 추가' = 카탈로그에서 골라 현재 메뉴에 덧붙이기(2026-10-28 사용자 요청)
// 라벨 → 딥링크 슬러그(링크를 비워두지 않고 세트로 채우기용, 2026-11-05 사용자 요청). 한글/영숫자 유지, 나머지는 '-'.
const slugLink = (s: string) => (s || '').trim().toLowerCase().replace(/[^\w가-힣]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'item';

// AI 추천(데모) — 혜택 문구가 비어 있거나 매핑 안 된 경우, 브랜드·카테고리에 맞는 '원본' 혜택 문구를 하나씩 생성(2026-11-10 사용자 요청).
//  ※ 실제 브랜드 슬로건/카피 복제가 아니라, 카테고리 특성에 맞춘 일반 혜택 문구 템플릿. 운영자가 보고 다듬는 '초안' 용도.
const AI_BENEFIT_POOL: Record<string, string[]> = {
  '카페': ['시즌 음료 2,000원 할인', '아메리카노 사이즈업 무료', '음료 2잔 주문 시 1잔 무료', '1,000원당 100원 적립', '디저트 세트 15% 할인'],
  '아이스크림': ['싱글레귤러 1,000원 할인', '파인트 20% 할인', '2개 구매 시 1개 무료', '멤버십 결제 10% 적립'],
  '베이커리': ['오늘의 빵 20% 할인', '1만원 이상 1,000원 즉시 할인', '시그니처 메뉴 1+1', '케이크 예약 10% 할인', '멤버십 적립 2배'],
  '외식': ['전 메뉴 10% 즉시 할인', '2인 세트 15% 할인', '디저트 메뉴 무료 제공', '식사 금액 5% 적립', '평일 런치 20% 할인'],
  '피자·치킨': ['라지 피자 30% 할인', '사이드 메뉴 무료 추가', '1+1 교환 쿠폰', '배달비 무료', '세트 주문 시 음료 증정'],
  '쇼핑': ['첫 구매 10% 쿠폰', '3만원 이상 3,000원 할인', '멤버십 적립 2배', '무료 배송 쿠폰', '시즌 특가 최대 50%'],
  '문화생활': ['영화 예매 2,000원 할인', '전시 관람권 30% 할인', '2인 예매 시 팝콘 무료', '주말 공연 10% 할인', '멤버십 우선 예매'],
  '교통': ['대여 요금 15% 할인', '첫 이용 5,000원 할인', '주중 최대 20% 할인', '포인트 2배 적립', '편도 이용권 10% 할인'],
  '편의점': ['1,000원당 100원 할인', '행사 상품 1+1', '도시락 10% 할인', '멤버십 포인트 적립', '음료 2+1 쿠폰'],
};
const AI_BENEFIT_DEFAULT = ['멤버십 전용 10% 할인', '첫 이용 2,000원 할인', '1+1 혜택 쿠폰', '결제 금액 5% 적립', '시즌 한정 특가', '2인 이용 시 추가 혜택'];
function aiBenefitCopy(category: string | null | undefined, seed: number): string {
  const key = Object.keys(AI_BENEFIT_POOL).find((k) => (category ?? '').includes(k));
  const pool = (key && AI_BENEFIT_POOL[key]) || AI_BENEFIT_DEFAULT;
  return pool[((seed % pool.length) + pool.length) % pool.length];
}

// 코너 타이틀 AI 추천 — 코너 유형(+활성 카테고리)에 맞는 영역 제목 초안을 하나씩 생성(2026-11-10 사용자 요청).
// 코너 타이틀은 코너 구성(운영자 소유) 영역이라 CVM이 주는 값이 아니다 → 운영자용 초안 도우미. 매핑된 아이템과 무관한 '영역 이름'을 빠르게 잡는 용도.
const AI_CORNER_TITLE_POOL: Record<string, string[]> = {
  '상품형': ['지금 딱 맞는 추천 상품', '이번 달 인기 상품', '나를 위한 맞춤 추천', '놓치면 아쉬운 특가', '요즘 많이 찾는 상품'],
  '혜택·오퍼형': ['나를 위한 맞춤 혜택', '이번 주 놓치면 아쉬운 혜택', '오늘의 멤버십 혜택', '지금 받을 수 있는 혜택', '자주 가는 곳 할인'],
  '혜택형': ['나를 위한 맞춤 혜택', '오늘의 멤버십 혜택', '지금 받을 수 있는 혜택', '자주 가는 곳 할인'],
  '배너형': ['지금 주목할 소식', '이번 주 기획전', '놓치지 마세요', '한정 기간 이벤트'],
  '콘텐츠 안내형': ['지금 뜨는 콘텐츠', '취향 저격 추천', '이번 주 인기작', '오늘의 추천 콘텐츠'],
  '업무 진입형': ['자주 쓰는 메뉴', '바로가기', '많이 찾는 서비스', '빠른 업무 처리'],
};
const AI_CORNER_TITLE_DEFAULT = ['맞춤 추천 영역', '이번 주 추천', '지금 주목할 소식', '나를 위한 추천'];
function aiCornerTitle(cornerType: string, category: string | null | undefined, seed: number): string {
  const pool = AI_CORNER_TITLE_POOL[cornerType] || AI_CORNER_TITLE_DEFAULT;
  const base = pool[((seed % pool.length) + pool.length) % pool.length];
  // 카테고리 칩이 켜져 있으면 '카페 추천 혜택'처럼 앞에 카테고리를 붙여 더 구체적인 초안으로.
  const catKey = category && Object.keys(AI_BENEFIT_POOL).find((k) => category.includes(k));
  return catKey ? `${category} 맞춤${cornerType === '상품형' ? ' 상품' : ' 혜택'}` : base;
}

// 이동 링크 행 — 링크는 원장/캠페인에 '연결된' 값이라 기본 읽기 전용, '수정'을 눌러야 편집(2026-11-10 사용자 요청: 문구는 열어두고 수정은 링크에만).
//  모듈 스코프 컴포넌트로 둬 입력 중 리마운트(IME) 방지.
function LinkEditRow({ link, editing, onToggle, onChange, source, locked }: { link?: string | null; editing: boolean; onToggle: () => void; onChange: (v: string) => void; source: '캠페인' | '원장' | '콘텐츠'; locked?: boolean }) {
  // locked = 수정 자체 불가(콘텐츠 안내형=iframe 연결). 읽기 전용 표시만, 수정 버튼 없음.
  if (locked) {
    return (
      <div className="flex h-[28px] min-w-0 items-center gap-1 rounded-[6px] bg-[var(--th)] px-2 text-[12px] text-[var(--ink3)]" title="연결 링크 — 콘텐츠 연결(iframe)이라 수정 불가">
        <Link2 className="h-3 w-3 shrink-0 text-[var(--ink4)]" />
        <span className="min-w-0 flex-1 truncate">{link || '연결 링크 (콘텐츠 연결)'}</span>
        <span className="shrink-0 rounded-[4px] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[var(--ink4)]">콘텐츠 연결</span>
      </div>
    );
  }
  if (editing) {
    return (
      <div className="flex h-[28px] min-w-0 items-center gap-1 rounded-[6px] border border-[var(--ac)] px-2" title="이동 링크(랜딩)">
        <Link2 className="h-3 w-3 shrink-0 text-[var(--ac)]" />
        <input value={link ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="이동 링크" autoFocus className="h-full min-w-0 flex-1 bg-transparent text-[12px] focus:outline-none" />
        <button type="button" onClick={onToggle} title="편집 잠금" className="flex shrink-0 items-center gap-0.5 rounded-[4px] bg-[var(--ac2)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--ac)]"><Check className="h-3 w-3" /> 완료</button>
      </div>
    );
  }
  return (
    <div className="flex h-[28px] min-w-0 items-center gap-1 rounded-[6px] bg-[var(--th)] px-2 text-[12px] text-[var(--ink3)]" title={`이동 링크 — ${source}에서 연결됨(수정하려면 '수정')`}>
      <Link2 className="h-3 w-3 shrink-0 text-[var(--ink4)]" />
      <span className="min-w-0 flex-1 truncate">{link || `이동 링크 (${source}에서 연결)`}</span>
      <button type="button" onClick={onToggle} title="링크 수정" className="flex shrink-0 items-center gap-0.5 rounded-[4px] border border-[var(--line2)] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[var(--ink3)] hover:border-[var(--ac)] hover:text-[var(--ac)]"><Pencil className="h-3 w-3" /> 수정</button>
    </div>
  );
}

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

function CornerDetail({ template, corner, index, onPreviewFallback, onFallbackChange, onRecSourceChange, onOptionsChange, onPreviewPatch, onToast }: {
  template: PTemplate; corner: PCorner | null; index: number; onPreviewFallback: (on: boolean) => void; onFallbackChange: (fb: '미노출' | '운영자 편성으로 대체') => void; onRecSourceChange: (src: string) => void; onOptionsChange: (opts: Record<string, boolean>, ctaLabel?: string) => void; onPreviewPatch: (patch: Record<string, unknown>) => void; onToast: (m: string) => void;
}) {
  if (!corner) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-[12px] border border-dashed border-[var(--line2)] bg-[var(--th)] px-6 text-center text-[13px] leading-relaxed text-[var(--ink4)]">
        왼쪽에서 코너를 선택하면<br />상세 설정이 여기에 표시됩니다
      </div>
    );
  }
  return <CornerDetailBody key={corner.id} template={template} corner={corner} onPreviewFallback={onPreviewFallback} onFallbackChange={onFallbackChange} onRecSourceChange={onRecSourceChange} onOptionsChange={onOptionsChange} onPreviewPatch={onPreviewPatch} onToast={onToast} />;
}

// 카테고리 불러오기 모달(2단) — 좌: 카테고리, 우: 그 카테고리의 브랜드/항목 멀티선택.
//  카테고리(칩)와 그 안에 담을 컴포넌트를 한 번에 가져온다(2026-11-06 사용자 요청: T멤버십 제휴 브랜드 참조).
function ChipLoadModal({ catalog, current, onClose, onAdd }: { catalog: ProductOption[]; current: string[]; onClose: () => void; onAdd: (picks: { category: string; items: ProductOption[] }[]) => void }) {
  const cats = React.useMemo(() => [...new Set(catalog.map((c) => c.category).filter((c): c is string => !!c))], [catalog]);
  const [active, setActive] = React.useState(cats[0] ?? '');
  const [sel, setSel] = React.useState<Record<string, Set<string>>>({});
  const itemsOf = (cat: string) => catalog.filter((c) => c.category === cat);
  const toggle = (cat: string, key: string) => setSel((p) => { const n = new Set(p[cat] ?? []); n.has(key) ? n.delete(key) : n.add(key); return { ...p, [cat]: n }; });
  const selCount = (cat: string) => sel[cat]?.size ?? 0;
  const totalPicked = Object.values(sel).reduce((s, v) => s + v.size, 0);
  const activeItems = itemsOf(active);
  const submit = () => onAdd(cats.filter((c) => selCount(c) > 0).map((c) => ({ category: c, items: itemsOf(c).filter((it) => sel[c].has(it.key)) })));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex h-[72vh] w-full max-w-[760px] flex-col overflow-hidden rounded-[14px] bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-[var(--line2)] px-4 py-3">
          <h2 className="text-[14px] font-bold text-[var(--ink)]">카테고리 · 컴포넌트 불러오기</h2>
          <span className="text-[12px] text-[var(--ink4)]">왼쪽 카테고리 → 오른쪽에서 담을 항목 선택</span>
          <button type="button" onClick={onClose} className="ml-auto rounded-[6px] p-1 text-[var(--ink3)] hover:bg-[var(--th)]" aria-label="닫기"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex min-h-0 flex-1">
          {/* 좌: 카테고리 목록 */}
          <div className="w-[190px] shrink-0 overflow-y-auto border-r border-[var(--line2)] p-2">
            {cats.length === 0 ? <p className="py-8 text-center text-[12px] text-[var(--ink4)]">카테고리 없음</p> : cats.map((c) => {
              const exists = current.includes(c); const cnt = selCount(c);
              return (
                <button key={c} type="button" onClick={() => setActive(c)}
                  className={cn('mb-0.5 flex w-full items-center gap-1.5 rounded-[8px] px-2.5 py-2 text-left text-[13px]', active === c ? 'bg-[var(--ac2)] font-semibold text-[var(--ac)]' : 'text-[var(--ink2)] hover:bg-[var(--th)]')}>
                  <span className="min-w-0 flex-1 truncate">{c}</span>
                  {cnt > 0 && <span className="grid h-4 min-w-4 place-items-center rounded-full bg-[var(--ac)] px-1 text-[10px] font-bold text-white">{cnt}</span>}
                  {exists && cnt === 0 && <span className="text-[10px] text-[var(--ink4)]">추가됨</span>}
                </button>
              );
            })}
          </div>
          {/* 우: 해당 카테고리 항목 멀티선택 */}
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            <p className="px-1 pb-1.5 pt-1 text-[12px] font-semibold text-[var(--ink3)]">{active || '카테고리 선택'} <span className="font-normal text-[var(--ink4)]">· {activeItems.length}개</span></p>
            {activeItems.length === 0 ? <p className="py-8 text-center text-[13px] text-[var(--ink4)]">항목이 없습니다.</p> : activeItems.map((it) => {
              const on = sel[active]?.has(it.key) ?? false;
              return (
                <button key={it.key} type="button" onClick={() => toggle(active, it.key)}
                  className={cn('flex w-full items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-left', on ? 'bg-[var(--ac2)]' : 'hover:bg-[var(--th)]')}>
                  <span className={cn('grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border', on ? 'border-[var(--ac)] bg-[var(--ac)] text-white' : 'border-[var(--line3)]')}>{on && <Check className="h-3 w-3" />}</span>
                  <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-[6px] border border-[var(--line2)] bg-[var(--th)] text-[var(--ink4)]"><ItemIcon src={it.imageUrl} brand={it.brand || it.title} iconClass="h-4 w-4" imgClass="h-full w-full object-cover" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-[var(--ink)]">{it.brand || it.title}</span>
                    {it.title && it.title !== it.brand && <span className="block truncate text-[11px] text-[var(--ink4)]">{it.title}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="border-t border-[var(--line2)] p-3">
          <button type="button" disabled={totalPicked === 0} onClick={submit}
            className="h-[42px] w-full rounded-[10px] bg-[var(--ac)] text-[14px] font-bold text-white hover:bg-[var(--ac-h)] disabled:opacity-50">가져오기{totalPicked > 0 ? ` (${totalPicked})` : ''}</button>
        </div>
      </div>
    </div>
  );
}

// 아이콘 선택 모달 — 메뉴/칩 아이템의 아이콘을 아이콘 세트에서 고른다(2026-11-05 사용자 요청: 아이콘 영역 클릭 시 모달).
const MENU_ICON_SET = ['Grid2x2', 'LayoutGrid', 'Gift', 'Tag', 'Crown', 'Star', 'Ticket', 'Film', 'Globe', 'Smartphone', 'Headphones', 'Gauge', 'Receipt', 'Coins', 'Users', 'CreditCard', 'Boxes', 'Signal', 'IdCard', 'RefreshCw', 'Repeat', 'FileText', 'Bell', 'Heart', 'MapPin', 'Wallet', 'ShoppingBag', 'Percent', 'Calendar', 'Bookmark'];
function IconPickerModal({ current, onClose, onPick }: { current?: string | null; onClose: () => void; onPick: (icon: string) => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-[14px] bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-[var(--line2)] px-4 py-3">
          <ImageIcon className="h-4 w-4 text-[var(--ac)]" />
          <h2 className="text-[14px] font-bold text-[var(--ink)]">아이콘 선택</h2>
          <span className="text-[12px] text-[var(--ink4)]">아이콘 세트에서 고르세요</span>
          <button type="button" onClick={onClose} className="ml-auto grid h-7 w-7 place-items-center rounded-[6px] text-[var(--ink4)] hover:bg-[var(--th)]"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid max-h-[50vh] grid-cols-6 gap-2 overflow-y-auto p-4">
          {MENU_ICON_SET.map((n) => {
            const src = `lucide:${n}`; const on = current === src;
            return (
              <button key={n} type="button" onClick={() => onPick(src)} title={n}
                className={cn('grid aspect-square place-items-center rounded-[8px] border transition', on ? 'border-[var(--ac)] bg-[var(--ac2)] text-[var(--ac)]' : 'border-[var(--line2)] bg-white text-[var(--ink2)] hover:border-[var(--ac)] hover:text-[var(--ac)]')}>
                <ItemIcon src={src} iconClass="h-5 w-5" imgClass="h-5 w-5" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// '채우기 → 불러오기' 모달(2단) — 좌: 분류, 우: 그 분류의 항목 멀티선택(2026-11-09 사용자 요청: 3번 카테고리 모달처럼 좌우 2단으로).
//  ※ 3번(ChipLoadModal)과의 차이 = 여기서는 '항목만' 담는다(카테고리 탭/칩을 만들지 않음). 좌측 분류는 탐색용 필터일 뿐이고, 담기면 평면 리스트(onAdd(ps))로만 들어간다.
function ProductLoadModal({ catalog, cornerType, onClose, onAdd }: { catalog: ProductOption[]; cornerType: string; onClose: () => void; onAdd: (ps: ProductOption[]) => void }) {
  const [q, setQ] = React.useState('');
  // 좌측 분류 = '전체' + 카탈로그 실제 카테고리. 전체는 전 항목(검색 가능), 나머지는 해당 분류만.
  const realCats = React.useMemo(() => { const s: string[] = []; for (const o of catalog) { const c = o.category ?? '기타'; if (!s.includes(c)) s.push(c); } return s; }, [catalog]);
  const cats = React.useMemo(() => ['전체', ...realCats], [realCats]);
  const [active, setActive] = React.useState('전체');
  const [checked, setChecked] = React.useState<Set<string>>(new Set());
  const query = q.trim().toLowerCase();
  const list = catalog.filter((o) => (active === '전체' || (o.category ?? '기타') === active) && (!query || `${o.brand} ${o.title}`.toLowerCase().includes(query)));
  const toggle = (k: string) => setChecked((prev) => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  // 분류별 선택 개수(좌측 배지) — '항목만' 담는 것을 드러내되, 어느 분류에서 몇 개 골랐는지 보이게.
  const countIn = (c: string) => catalog.filter((o) => (o.category ?? '기타') === c && checked.has(o.key)).length;
  const submit = () => onAdd(catalog.filter((o) => checked.has(o.key)));
  const kindWord = cornerType === '상태 안내형' ? '상태 카드' : cornerType === '프로필형' ? '프로필 카드' : cornerType === '업무 진입형' ? '메뉴' : cornerType === '콘텐츠 안내형' ? '영화' : cornerType === '배너형' ? '배너' : cornerType === '혜택·오퍼형' ? '혜택' : '상품';
  const kindLabel = cornerType === '콘텐츠 안내형' ? '지금 등록된 영화에서 선택' : cornerType === '상태 안내형' ? '완성된 상태 카드를 통째로 선택 — 값은 고객 데이터로 자동' : cornerType === '프로필형' ? '완성된 프로필 카드를 통째로 선택 — 값은 고객 데이터로 자동' : cornerType === '배너형' ? '배너 캠페인 관리에 등록된 배너에서 선택(이미지·문구·랜딩 함께)' : cornerType === '업무 진입형' ? '메뉴 관리에 등록된 메뉴에서 선택' : `${kindWord} 분류에서 선택`;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex h-[72vh] w-full max-w-[760px] flex-col overflow-hidden rounded-[14px] bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-[var(--line2)] px-4 py-3">
          <Search className="h-4 w-4 text-[var(--ac)]" />
          <h2 className="text-[14px] font-bold text-[var(--ink)]">{kindWord} 불러오기</h2>
          <span className="text-[12px] text-[var(--ink4)]">{kindLabel} · 항목만 담기(카테고리 탭 없음)</span>
          <button type="button" onClick={onClose} className="ml-auto rounded-[6px] p-1 text-[var(--ink3)] hover:bg-[var(--th)]" aria-label="닫기"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex min-h-0 flex-1">
          {/* 좌: 분류(탐색용 필터) — 3번과 달리 분류를 '담지' 않는다. 선택 개수 배지만 안내. */}
          <div className="w-[190px] shrink-0 overflow-y-auto border-r border-[var(--line2)] p-2">
            {cats.map((c) => {
              const cnt = c === '전체' ? checked.size : countIn(c);
              return (
                <button key={c} type="button" onClick={() => setActive(c)}
                  className={cn('mb-0.5 flex w-full items-center gap-1.5 rounded-[8px] px-2.5 py-2 text-left text-[13px]', active === c ? 'bg-[var(--ac2)] font-semibold text-[var(--ac)]' : 'text-[var(--ink2)] hover:bg-[var(--th)]')}>
                  <span className="min-w-0 flex-1 truncate">{c}</span>
                  {cnt > 0 && <span className="grid h-4 min-w-4 place-items-center rounded-full bg-[var(--ac)] px-1 text-[10px] font-bold text-white">{cnt}</span>}
                </button>
              );
            })}
          </div>
          {/* 우: 검색 + 항목 멀티선택 */}
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="border-b border-[var(--line2)] p-2.5">
              <div className="flex items-center gap-2 rounded-[8px] border border-[var(--line3)] bg-white px-3">
                <Search className="h-4 w-4 text-[var(--ink4)]" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름 검색…" className="h-9 flex-1 bg-transparent text-sm outline-none" autoFocus />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              <p className="px-1 pb-1.5 pt-1 text-[12px] font-semibold text-[var(--ink3)]">{active} <span className="font-normal text-[var(--ink4)]">· {list.length}개</span></p>
              {list.length === 0 ? <p className="py-10 text-center text-[13px] text-[var(--ink4)]">검색 결과가 없습니다.</p> : list.map((p) => {
                const on = checked.has(p.key);
                return (
                  <button key={p.key} type="button" onClick={() => toggle(p.key)} className={cn('flex w-full items-center gap-3 rounded-[8px] px-2 py-2 text-left', on ? 'bg-[var(--ac2)]' : 'hover:bg-[var(--th)]')}>
                    <span className={cn('grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border', on ? 'border-[var(--ac)] bg-[var(--ac)] text-white' : 'border-[var(--line3)]')}>{on && <Check className="h-3 w-3" />}</span>
                    <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[8px] bg-[var(--ac2)] text-[var(--ac)]">
                      <ItemIcon src={p.imageUrl} brand={p.brand || p.title} iconClass="h-5 w-5" imgClass="h-full w-full object-cover" />
                    </span>
                    <span className="min-w-0 flex-1">
                      {/* 혜택 유형 = 브랜드명(공차)을 위로 크게, 매핑 문구(혜택)를 아래로. 카테고리(카페·베이커리)는 표시하지 않음(2026-11-09 사용자 요청). */}
                      {cornerType === '혜택·오퍼형' || cornerType === '혜택형' ? (<>
                        <span className="block truncate text-[13px] font-semibold text-[var(--ink)]">{p.brand || p.title}</span>
                        <span className="block truncate text-[11px] text-[var(--ink4)]">{p.title}</span>
                      </>) : (<>
                        <span className="block truncate text-[13px] font-semibold text-[var(--ink)]">{p.title}</span>
                        <span className="block truncate text-[11px] text-[var(--ink4)]">{[p.brand, p.price].filter(Boolean).join(' · ')}</span>
                      </>)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="border-t border-[var(--line2)] p-3">
          <button type="button" disabled={checked.size === 0} onClick={submit}
            className="h-[44px] w-full rounded-[10px] bg-[var(--ac)] text-[14px] font-bold text-white hover:bg-[var(--ac-h)] disabled:opacity-50">{kindWord === '배너' ? '배너 가져오기' : (kindWord === '상태 카드' || kindWord === '프로필 카드') ? `${kindWord} 가져오기` : (kindWord === '메뉴' || kindWord === '영화' ? `${kindWord} 추가` : '이 항목 담기')}{checked.size > 0 ? ` (${checked.size})` : ''}</button>
        </div>
      </div>
    </div>
  );
}

// ③ 컴포넌트 리스트 행 — dnd-kit 정렬 래퍼(드래그 핸들만 활성화, 2026-11-06 사용자 요청: 우측 패널 순서 변경).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SortableFillRow({ id, children }: { id: string; children: (h: { setRef: (el: HTMLElement | null) => void; props: any }) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={isDragging ? 'relative z-10 opacity-80 shadow-lg' : ''}>
      {children({ setRef: setActivatorNodeRef, props: { ...attributes, ...listeners } })}
    </div>
  );
}

function CornerDetailBody({ template, corner, onPreviewFallback, onFallbackChange, onRecSourceChange, onOptionsChange, onPreviewPatch, onToast }: { template: PTemplate; corner: PCorner; onPreviewFallback: (on: boolean) => void; onFallbackChange: (fb: '미노출' | '운영자 편성으로 대체') => void; onRecSourceChange: (src: string) => void; onOptionsChange: (opts: Record<string, boolean>, ctaLabel?: string) => void; onPreviewPatch: (patch: Record<string, unknown>) => void; onToast: (m: string) => void }) {
  // 프로필형(업무 진입형) = 고객 정보(이름·휴대폰 등)라 '무조건 CVM 데이터 연동' 고정(2026-11-05 사용자 요청).
  const layoutDetailStr = corner.layoutDetail ?? corner.layout ?? '';
  const isProfile = corner.cornerType === '업무 진입형' && /프로필/.test(layoutDetailStr);
  // 상태 안내형 = '어떤 상태 카드를 어떤 순서로'는 운영자가 뭉텅이로 편성, 값·보조문구는 런타임 고객 데이터(@cvm). → 운영자 편성 고정(2026-11-05 사용자 요청).
  const isStatus = corner.cornerType === '업무 진입형' && /상태|아이콘.?이미지/.test(layoutDetailStr);
  // 바코드형 = 멤버십 바코드. 값(번호)은 회원 인증 기반 런타임 발급 → 어드민은 라벨·갱신 주기 정책만(2026-11-05 사용자 요청).
  const isBarcode = corner.cornerType === '바코드형';
  const [srcState, setSrc] = React.useState<string>(corner.recSource ?? '운영자 편성');
  // 프로필형·상태 안내형 = 'CVM 추천'이 아니라 '고객정보 바인딩(@cvm:key)'. 무엇을 노출할지는 운영자가 정하고 값만 런타임 고객 데이터로 자동.
  //  바코드형도 추천 대상이 아니라 시스템 카드(런타임 발급) → 모두 운영자 편성 고정(CVM 추천 잠금). (2026-11-05 사용자 확정)
  const src = (isProfile || isStatus || isBarcode) ? '운영자 편성' : srcState;
  const srcLocked = isProfile || isStatus || isBarcode;
  // 카드 1장 = 코너 1개인 유형(프로필형·상태 안내형) — 코너/아이템 분리 없음. 세그먼트 컨트롤 제거, 코너 세팅 + '한번에 가져오기'만(2026-11-05 사용자 요청).
  const cardOnly = isProfile || isStatus;
  const [fb, setFb] = React.useState<'미노출' | '운영자 편성으로 대체'>(corner.fallback);
  const [cat, setCat] = React.useState('혜택'); // 요청 중분류 기본 = 혜택
  // CVM 데이터 연동 — 운영자 고정(위 아이템 리스트 그대로) + 나머지는 CVM이 중분류에서 채움(최소~최대).
  //  한 구좌=데이터 연동 그대로 유지(새 수급 케이스 아님). 데모라 세션 로컬 상태.
  const [cvmMin, setCvmMin] = React.useState(3);
  const [cvmMax, setCvmMax] = React.useState(5);
  // ① 코너 정보 — 코너명만 편집 가능(유형·레이아웃·개수는 코너 유형 관리에서 불러오는 껍데기)
  const router = useRouter();
  const [editName, setEditName] = React.useState(false);
  const [nameVal, setNameVal] = React.useState(corner.name);
  // 코너명 저장 — 실제 DB 반영(2026-11-05 사용자 요청: 수정이 안 되던 데모 → 실제 저장).
  const saveName = async () => {
    // 비우고 완료하면 기본 배열명(세로형 등)으로 되돌린다(2026-11-05 사용자 요청: 다 지우고 완료 → 기존 배열명).
    const fallback = layoutLabel(corner.layoutDetail ?? corner.layout ?? '') || corner.layoutDetail || corner.layout || corner.cornerType;
    const n = nameVal.trim() || fallback;
    setEditName(false);
    setNameVal(n);
    try { await renameCorner(template.id, corner.id, n); router.refresh(); onToast('코너명을 수정했습니다.'); }
    catch { setNameVal(corner.name); onToast('코너명을 저장하지 못했습니다.'); }
  };
  const options = cornerOptions(corner.preview);
  const isCvmSrc = src.startsWith('CVM');
  const isData = src === 'CVM 데이터 연동';
  // CVM 콘텐츠 연동(③가 '구좌만 넘김')에서 폴백을 '운영자 편성으로 대체'로 고르면, CVM이 비었을 때 대신 노출할 운영자 편성 항목을 등록해야 한다 → ⑤ 채우기 UI를 띄운다(2026-11-10 사용자 요청).
  const fillForFallback = isCvmSrc && !isData && fb === '운영자 편성으로 대체' && !isProfile && !isStatus && !isBarcode;
  // 섹션 번호 — CVM 코너는 ③ 폴백(채우기 위로)이 끼어 번호가 하나씩 밀린다(2026-11-10 사용자 요청: 폴백이 채우기 결과를 좌우하므로 위로). 번호 공백 방지.
  const nFill = isCvmSrc ? 4 : 3; // 채우기/요청/프로필/고정
  const nSrc = isCvmSrc ? 5 : 4;  // 출처
  // '채우기 → 불러오기' — 유형별 카탈로그(상품형=상품, 혜택·오퍼형=혜택)에서 멀티 셀렉으로 담는다(2026-10-28 사용자 요청).
  const catalogByType = React.useContext(ProductCatalogCtx);
  // 상태 안내형(업무 진입형)은 '상태 카드' 전용 카탈로그에서 가져온다 — 메뉴 카탈로그와 구분(2026-11-05 사용자 요청).
  const catalog = (isStatus ? catalogByType['상태 안내형'] : isProfile ? catalogByType['프로필형'] : catalogByType[corner.cornerType]) ?? [];
  const canLoad = catalog.length > 0;
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
  // 프로필형 = '내 정보/프로필·가입현황' 같은 코너 타이틀/서브를 두지 않는다(고객정보 행 자체가 콘텐츠). 코너 세팅 없이 '고객정보 가져오기'만(2026-11-05 사용자 요청).
  const hasCornerTitle = !isProfile && cornerReqFields.some((f) => f.key === 'CornerTitle');
  const hasButtonText = !isProfile && cornerReqFields.some((f) => f.key === 'ButtonText');
  const [cornerTitleVal, setCornerTitleVal] = React.useState(() => (pv?.mainTitle && pv.mainTitle !== 'CornerTitle' ? pv.mainTitle : ''));
  // 바코드형 정책 — 바코드명(라벨)·유효 갱신 주기(분). 번호는 회원별 런타임 발급(어드민 미입력). (2026-11-05 사용자 요청)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bcAtoms: any[] = pv?.components?.[0]?.atoms ?? [];
  const [barcodeLabel, setBarcodeLabel] = React.useState(() => { const t = bcAtoms.find((a) => a.atomType === 'TEXT')?.content; return (t && !/^Title/.test(String(t))) ? String(t) : 'T멤버십'; });
  const [barcodeRefresh, setBarcodeRefresh] = React.useState(() => { const b = bcAtoms.find((a) => a.atomType === 'BARCODE')?.content; return String(Number(b) || 20); });
  // 버튼 텍스트(ButtonText) = 미리보기의 '서브 타이틀'(타이틀 아래 보조 문구, 예: T 영화예매). CTA(전체보기)와는 별개(2026-11-05 사용자 요청).
  const [buttonTextVal, setButtonTextVal] = React.useState(() => (pv?.subTitle && pv.subTitle !== 'ButtonText' ? pv.subTitle : ''));
  // CTA 라벨(전체보기 등) = 하단 더보기 버튼. CTA 옵션을 켤 때만 입력, 버튼 텍스트와 별개(2026-11-05 사용자 요청).
  const [ctaLabelVal, setCtaLabelVal] = React.useState(() => (pv?.moreButtonLabel && pv.moreButtonLabel !== 'CTA' ? pv.moreButtonLabel : ''));
  // CTA 링크 — 문구와 별도 입력(2026-11-05 사용자 요청: 인풋 두 개).
  const [ctaLinkVal, setCtaLinkVal] = React.useState(() => ((pv as { moreButtonLink?: string | null } | undefined)?.moreButtonLink ?? ''));
  // ③채우기를 '코너 | 아이템' 탭으로 나눠 등록(2026-11-05 사용자 요청). 코너 속성이 없는 유형(배너형 등)은 아이템만.
  const [fillTab, setFillTab] = React.useState<'코너' | '아이템'>('코너');
  // 칩(카테고리 탭) — 실제로 '불러온 카테고리'만 저장. 나머지 빈 자리는 점선 'Chip' 플레이스홀더로 표시, 불러오기로 채우면 반영(2026-11-05 사용자 요청).
  //  placeholder(Chip/전체/카테고리 등 필드코드)는 실제 칩이 아니므로 제외하고, 미리보기 선택형 아톰의 '진짜 카테고리'만 초기값으로.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chipComp0 = (pv?.components ?? []).find((c: any) => c.componentType === '선택형');
  // 칩 슬롯 수 = 미리보기 선택형 아톰 수(없으면 4). 점선 placeholder 개수의 기준.
  const chipSlotCount = (chipComp0?.atoms?.length ?? 0) > 0 ? chipComp0!.atoms.length : 4;
  const [chips, setChips] = React.useState<string[]>(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const labels = (chipComp0?.atoms ?? []).map((a: any) => (a.content || a.name || '').trim())
      .filter((l: string) => l && !/^(chip\d*|전체|카테고리|tab\d*|category\d*)$/i.test(l));
    return labels; // 진짜 카테고리만(없으면 빈 배열 → 전부 점선 placeholder)
  });
  const [chipLoadOpen, setChipLoadOpen] = React.useState(false);
  // 배너 옵션 콘텐츠 — 배너 On이면 이미지. CTA 라벨은 '버튼 텍스트(buttonTextVal)'로 통합(2026-11-05 사용자 요청).
  // 배너 옵션 썸네일 — 좌측 미리보기에 이미 배너가 있으면(코너 배너 이미지/첫 이미지 아톰) 그걸 기본값으로(2026-11-05 사용자 요청: 미리보기 배너를 ③에 반영).
  const [bannerImg, setBannerImg] = React.useState(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pvAny = pv as any;
    if (pvAny?.bannerImageUrl) return pvAny.bannerImageUrl as string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const img = (pv?.components ?? []).flatMap((c: any) => c.atoms ?? []).find((a: any) => (a.atomType === 'IMAGE' || a.atomType === 'ICON') && typeof a.imageUrl === 'string' && a.imageUrl.startsWith('/'))?.imageUrl;
    return img ?? '';
  });
  // 카테고리형(상품형·혜택·오퍼형 세로형/가로형(카테고리형)) — 상단 카테고리 칩 + 카테고리별 컴포넌트 리스트(2026-11-06 사용자 요청).
  const isCategory = (corner.cornerType === '상품형' || corner.cornerType === '혜택·오퍼형') && /카테고리형|칩|카테고리/.test(corner.layoutDetail ?? corner.layout ?? '');
  // ③ 채우기 항목 — 칩/카테고리 On 이면 카테고리마다 별도 리스트(카테고리별 컴포넌트 연동). 아니면 단일 리스트(__flat__).
  const chipMode = ((!!optOn['칩'] || isCategory) && chips.length > 0);
  const [activeChip, setActiveChip] = React.useState(0);
  const chipIdx = Math.min(activeChip, Math.max(0, chips.length - 1));
  const chipKey = chipMode ? `${isCategory ? 'cat' : 'chip'}:${chips[chipIdx] ?? chipIdx}` : '__flat__';
  // 불러오기 전용(직접입력 없음) 유형 — 콘텐츠 안내형(영화) · 혜택·오퍼형 세로형(제휴 혜택). 이미지+텍스트+보조값을 한 번에 불러온다(2026-11-05 사용자 요청).
  const detailStr = corner.layoutDetail ?? corner.layout ?? '';
  const isBenefitList = (corner.cornerType === '혜택·오퍼형' || corner.cornerType === '혜택형') && /세로/.test(detailStr);
  const isBenefitType = corner.cornerType === '혜택·오퍼형' || corner.cornerType === '혜택형';
  // 배너형 = '배너 캠페인 관리'에서 가져오기 전용(직접 입력 없음). 가져오기 버튼으로 등록된 배너를 담는다(2026-11-05 사용자 요청).
  const isBanner = corner.cornerType === '배너형';
  // 콘텐츠 안내형 = 아이프레임 연결 가능성이 커 링크 수정 자체가 불가(읽기 전용, 수정 버튼 없음). 2026-11-10 사용자 요청.
  const isContentGuide = corner.cornerType === '콘텐츠 안내형';
  // 배너 단일형 = 배너 1장 → 순서 변경 없음(드래그 핸들 제거). 스와이프형만 여러 장 재정렬(2026-11-05 사용자 요청).
  const bannerSingle = isBanner && !/스와이프|swipe/i.test(detailStr);
  // '직접 추가'(운영자가 라벨·아이콘·링크를 직접 입력)는 업무 진입형 칩형(퀵메뉴)에만. 나머지는 전부 불러오기(로드)만(2026-11-05 사용자 확정).
  const isChip = corner.cornerType === '업무 진입형' && /칩|카테고리/.test(detailStr);
  // 상태 안내형 = '상태 카드'를 뭉텅이로 가져오기 전용(값·보조문구는 런타임 고객 데이터 @cvm, 2026-11-05 사용자 요청).
  //  칩형을 제외한 모든 아이템 리스트 유형은 '불러오기 전용'(행=변경, 직접 입력 없음).
  const loadOnly = !isChip;
  const itemWord = corner.cornerType === '콘텐츠 안내형' ? '영화' : isStatus ? '상태' : isProfile ? '고객정보' : corner.cornerType === '업무 진입형' ? '메뉴' : isBanner ? '배너' : isBenefitList ? '혜택' : '항목';
  const loadFields = corner.cornerType === '콘텐츠 안내형' ? '이미지·제목·평점·예매율' : (isStatus || isProfile) ? '값 자동(@cvm)' : isBanner ? '배너 이미지·문구·랜딩' : '로고·혜택 문구·브랜드';
  // 좌측 미리보기에 '실제로 보이는' 항목을 ③채우기 기본값으로 — 채워진 코너는 그 코너의 콘텐츠와 1:1 일치(2026-11-05 사용자 요청).
  const PV_PLACEHOLDER = /^(CornerTitle|ItemTitle|SubTitle|SubText|ButtonText|Caption\d*|Chip\d+|Title|라벨|주요 값|배너 타이틀|상품 \d|혜택 \d)/;
  const previewItems = (): FillItem[] => {
    const out: FillItem[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (corner.preview?.components ?? []).forEach((comp: any, i: number) => {
      if (comp.componentType === '선택형') {
        // 업무 진입형 칩형(퀵메뉴)은 '칩 하나하나가 아이템' — 라벨+아이콘(미리보기 칩의 보라 아이콘)+링크를 그대로 가져온다(2026-11-05 사용자 요청).
        //  그 외(혜택·오퍼형 세로형+칩의 카테고리 탭)는 아이템이 아니라 칩 설정이므로 스킵.
        if (corner.cornerType !== '업무 진입형') return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (comp.atoms ?? []).forEach((a: any, j: number) => {
          const label = (a.content || a.name || '').trim();
          // 링크는 placeholder로 비워두지 말고 세트로 채운다 — 링크값 없으면 라벨 기반 딥링크로(2026-11-05 사용자 요청).
          if (label && !PV_PLACEHOLDER.test(label)) out.push({ id: `pv-chip-${i}-${j}`, label, icon: a.imageUrl ?? null, link: a.linkUrl || `/menu/${slugLink(label)}`, mode: 'load' });
        });
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const atoms: any[] = comp.atoms ?? [];
      const img = atoms.find((a) => (a.atomType === 'IMAGE' || a.atomType === 'ICON') && typeof a.imageUrl === 'string' && a.imageUrl.startsWith('/'))?.imageUrl ?? null;
      const benefit = atoms.find((a) => a.atomType === 'BENEFIT_TEXT')?.content;
      const text = atoms.find((a) => a.atomType === 'TEXT' && a.content && !PV_PLACEHOLDER.test(String(a.content).trim()))?.content;
      const label = (benefit || text || '').trim();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const linkA = atoms.find((a: any) => typeof a.linkUrl === 'string' && a.linkUrl)?.linkUrl ?? undefined;
      let sub = atoms.find((a) => a.atomType === 'INFO' && a.content)?.content ?? undefined;
      let link = linkA;
      // 배너는 랜딩 링크·사이즈를 배너 캠페인(카탈로그)에서 매칭해 채운다(2026-11-05 사용자 요청: 랜딩 다 넣기).
      if (isBanner) {
        const m = catalog.find((p) => p.title === label || p.title === text || p.imageUrl === img);
        if (m) { if (!link) link = m.landing; if (m.size) sub = m.size; }
      }
      // 링크는 비워두지 않고 세트로 채운다 — 유형별 딥링크 경로 + 라벨 슬러그(2026-11-05 사용자 요청: 플레이스홀더로 두지 말고 다 채워).
      if (!link) { const base = corner.cornerType === '배너형' ? 'event' : (corner.cornerType === '혜택·오퍼형' || corner.cornerType === '혜택형') ? 'benefit' : corner.cornerType === '상품형' ? 'product' : corner.cornerType === '콘텐츠 안내형' ? 'movie' : 'link'; link = `/${base}/${slugLink(label || String(comp.id ?? i))}`; }
      if ((label && !PV_PLACEHOLDER.test(label)) || img) out.push({ id: `pv-${i}-${comp.id ?? i}`, label: label || itemWord, icon: img, link, sub, mode: 'load' });
    });
    return out;
  };
  // 기본 아이템 — 불러오기 전용 유형: ①미리보기에 보이는 실제 항목 → ②없으면 카탈로그(영화/혜택/배너)로 '채워진 채' 시작. 그 외는 라벨 슬롯.
  const defaultItems = (): FillItem[] => {
    // 카테고리형 — 활성 카테고리(칩)에 해당하는 카탈로그 항목으로 시드. 카테고리를 바꾸면 그 카테고리 리스트로 교체된다(2026-11-09 사용자 요청: 카페·베이커리·외식 전환 시 변경).
    if (chipMode && isCategory && catalog.length) {
      const activeCat = chips[chipIdx];
      const inCat = catalog.filter((p) => (p.category ?? '') === activeCat);
      const pickFrom = inCat.length ? inCat : catalog;
      return pickFrom.slice(0, 3).map((p, i) => ({ id: `seed-${activeCat}-${i}-${p.key}`, label: p.title, icon: p.imageUrl ?? null, link: p.landing ?? `/benefit/${slugLink(p.title)}`, sub: p.brand ?? undefined, mode: 'load' as const }));
    }
    // 미리보기에 '실제 항목'이 있으면 유형과 무관하게 그걸로 채운다(기프티콘·단말 등 가로형 포함, 2026-11-05 사용자 요청).
    const pv = previewItems();
    if (pv.length) return pv;
    if (loadOnly && catalog.length) return catalog.slice(0, 3).map((p, i) => ({ id: `seed-${i}-${p.key}`, label: p.title, icon: p.imageUrl ?? null, link: `/${p.category ?? 'menu'}/${p.key}`, sub: p.brand ?? undefined, mode: 'load' as const }));
    return (options.length ? options : ['대표 아이템 1', '대표 아이템 2', '대표 아이템 3']).map((o, i) => ({ id: `it-${i}-${o}`, label: o, mode: 'direct' as const }));
  };
  const [itemsByKey, setItemsByKey] = React.useState<Record<string, FillItem[]>>(() => ({ __flat__: defaultItems() }));
  // ③ 항목을 운영자가 '실제로' 편집/불러오기 했는지(키별). 마운트·클릭만으로는 미리보기를 재구성하지 않고, 편집이 일어난 뒤에만 재구성한다.
  //  (placeholder 미리보기 → FillItem 왕복이 손실형이라, 건드리지 않으면 코너 기본 미리보기가 그대로 유지돼 '금액이 사라지는' 현상 방지. 2026-11-09 사용자 요청)
  const [dirty, setDirty] = React.useState<Record<string, boolean>>({});
  const markDirty = (key = chipKey) => setDirty((d) => (d[key] ? d : { ...d, [key]: true }));
  // 칩 On으로 바꾸면 칩별 리스트는 아직 비어 있다 → 빈 화면처럼 보이지 않게 칩마다 기본 시드로 채워 시작(2026-11-05 사용자 요청: 칩 On 시 데이터 영역 유지). 편집 시 그대로 저장된다.
  const seedForKey = React.useMemo(() => defaultItems(), [chipKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const items = itemsByKey[chipKey] ?? seedForKey;
  const updateItems = (fn: (xs: FillItem[]) => FillItem[]) => {
    markDirty();
    setItemsByKey((m) => ({ ...m, [chipKey]: fn(m[chipKey] ?? seedForKey) }));
  };
  // ③ 컴포넌트 리스트 드래그 정렬(2026-11-06 사용자 요청: 우측 패널 순서 변경).
  const itemSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const onItemDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    updateItems((prev) => {
      const oi = prev.findIndex((x) => x.id === active.id);
      const ni = prev.findIndex((x) => x.id === over.id);
      return oi >= 0 && ni >= 0 ? arrayMove(prev, oi, ni) : prev;
    });
  };
  // 새 행은 세그먼트 기본값을 '불러오기'로(2026-11-05 사용자 요청) → 우측 '불러오기' 버튼이 바로 뜬다. 직접 입력하려면 '직접' 선택.
  const addItem = () => updateItems((xs) => [...xs, { id: `new-${Date.now()}`, label: '', mode: 'load' }]);
  const removeItem = (id: string) => updateItems((xs) => xs.filter((x) => x.id !== id));
  // 칩형(퀵메뉴) 아이템 편집(아이콘·라벨·링크)을 좌측 미리보기 선택형 아톰에 반영(2026-11-05 사용자 요청: 미리보기에서 바꾸면 아이콘도 바뀌어야).
  const pushChipPreview = (next: FillItem[]) => {
    if (!isChip) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const comps = (pv?.components ?? []).map((c: any) => c.componentType === '선택형'
      ? { ...c, atoms: next.map((o, i) => ({ id: `ci-${i}-${o.id}`, name: o.label || `Chip${i + 1}`, atomType: 'TEXT', content: o.label || `Chip${i + 1}`, imageUrl: o.icon ?? null, altText: null, linkUrl: o.link ?? null })) }
      : c);
    onPreviewPatch({ components: comps });
  };
  const editItems = (id: string, patch: Partial<FillItem>) => {
    const next = items.map((x) => (x.id === id ? { ...x, ...patch } : x));
    updateItems(() => next);
    pushChipPreview(next);
  };
  const setItemLabel = (id: string, label: string) => editItems(id, { label });
  const setItemLink = (id: string, link: string) => editItems(id, { link });
  const setItemLinkType = (id: string, linkType: 'internal' | 'external') => editItems(id, { linkType });
  // 이동 링크 내부/외부 세그먼트 라디오 — 2택이라 토글보다 라디오가 명확(2026-11-10 사용자 요청). 기본값 외부(아웃링크).
  const LinkTypeRadio = ({ o }: { o: FillItem }) => {
    const v = o.linkType ?? 'external';
    return (
      <div className="flex shrink-0 overflow-hidden rounded-[6px] border border-[var(--line2)] text-[11px]" title="내부=앱 안에서 노출(비과금) · 외부=아웃링크로 외부 브라우저(과금)">
        {(['internal', 'external'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setItemLinkType(o.id, t)}
            className={cn('px-2 py-1 font-medium transition', v === t ? (t === 'external' ? 'bg-[#fff1e6] text-[#b67a12]' : 'bg-[var(--ac2)] text-[var(--ac)]') : 'bg-white text-[var(--ink4)] hover:text-[var(--ink2)]')}>
            {t === 'internal' ? '내부' : '외부'}
          </button>
        ))}
      </div>
    );
  };
  // AI 추천(데모) — 혜택 문구를 브랜드/카테고리에 맞게 하나씩 생성. 클릭할 때마다 다른 후보로 순환(2026-11-10 사용자 요청).
  const [aiSeed, setAiSeed] = React.useState<Record<string, number>>({});
  const genAiCopy = (o: FillItem) => {
    const s = aiSeed[o.id] ?? Math.floor(Math.random() * 6);
    setAiSeed((p) => ({ ...p, [o.id]: s + 1 }));
    const category = chipMode ? chips[chipIdx] : undefined;
    setItemLabel(o.id, aiBenefitCopy(category, s));
  };
  // 코너 타이틀 AI 추천 — 코너 유형(+활성 카테고리)에 맞는 영역 제목을 하나 생성(눌러서 다른 후보). 운영자 초안이며 CVM이 주는 값 아님(코너 타이틀=코너 구성).
  const [titleSeed, setTitleSeed] = React.useState(Math.floor(Math.random() * 6));
  const genAiTitle = () => {
    const category = chipMode ? chips[chipIdx] : undefined;
    const t = aiCornerTitle(corner.cornerType, category, titleSeed);
    setTitleSeed((s) => s + 1);
    setCornerTitleVal(t);
    onPreviewPatch({ mainTitle: t || 'CornerTitle' });
  };
  const setItemMode = (id: string, mode: FillItem['mode']) => updateItems((xs) => xs.map((x) => (x.id === id ? { ...x, mode } : x)));
  const setItemIcon = (id: string, icon: string) => editItems(id, { icon });
  // 링크로 연결된(불러오기) 항목은 기본 읽기 전용 → '수정'을 눌러야 편집 가능(2026-11-10 사용자 요청). 실수로 원장/캠페인 값을 건드리지 않게.
  const [rowEdit, setRowEdit] = React.useState<Record<string, boolean>>({});
  const toggleRowEdit = (id: string) => setRowEdit((s) => ({ ...s, [id]: !s[id] }));
  const [loadForId, setLoadForId] = React.useState<string | null>(null); // 불러오기 모달 대상 항목 id
  const [iconForId, setIconForId] = React.useState<string | null>(null); // 아이콘 선택 모달 대상 항목 id(2026-11-05 사용자 요청)
  // 삭제 — 데이터 있는 항목은 확인 모달, 빈 항목은 바로 삭제(2026-11-05 사용자 요청).
  const [removeTarget, setRemoveTarget] = React.useState<FillItem | null>(null);
  const itemHasData = (o: FillItem) => !!((o.label && o.label.trim()) || o.icon || (o.link && o.link.trim()) || o.sub);
  const tryRemove = (o: FillItem) => (itemHasData(o) ? setRemoveTarget(o) : removeItem(o.id));
  // 멀티 셀렉으로 담기 — 아이콘+텍스트+링크를 '한 번에' 불러온다. 첫 항목은 누른 행을 채우고, 나머지는 그 뒤 새 행으로.
  const addFromCatalog = (ps: ProductOption[]) => {
    if (ps.length === 0) return;
    updateItems((xs) => {
      const idx = xs.findIndex((x) => x.id === loadForId);
      const mapped: FillItem[] = ps.map((p, i) => ({
        id: i === 0 && idx >= 0 ? loadForId! : `load-${Date.now()}-${i}`,
        // 이동링크 = 배너 등 캠페인의 랜딩값을 그대로(없으면 카테고리 경로). 사이즈/브랜드는 보조 표기로(2026-11-05 사용자 요청).
        label: p.title, icon: p.imageUrl ?? null, link: p.landing ?? `/${(p.category ?? 'menu')}/${p.key}`, sub: p.size ?? p.brand ?? undefined, mode: 'load',
      }));
      return idx < 0 ? [...xs, ...mapped] : [...xs.slice(0, idx), ...mapped, ...xs.slice(idx + 1)];
    });
    setLoadForId(null);
  };
  // 카드 1장 유형(프로필·상태) = 가져온 '완성 카드'를 미리보기 컴포넌트로 만들어 코너 preview에 실제 반영(2026-11-05 사용자 요청: 가져오면 그려져야 함).
  //  값은 @cvm 바인딩이라 미리보기는 sample로 표시(프로필=이름·휴대폰/등급, 상태=값·배지·라벨·아이콘).
  const mkAtom = (atomType: string, content: string | null, imageUrl: string | null = null) => ({
    id: `a-${atomType}-${Math.random().toString(36).slice(2, 8)}`, name: atomType, atomType, content, imageUrl, altText: null, linkUrl: null,
  });
  const cardToComponent = (p: ProductOption) => {
    const base = { id: `c-${p.key}-${Math.random().toString(36).slice(2, 8)}`, name: p.title };
    // 배너 — 이미지+타이틀+서브(브랜드)+랜딩. 스와이프/단일 모두 BannerCard로 렌더(2026-11-05 사용자 요청: 불러오면 미리보기에 반영).
    if (isBanner) {
      return { ...base, componentType: '배너형', atoms: [
        { id: `a-img-${p.key}`, name: 'IMAGE', atomType: 'IMAGE', content: null, imageUrl: p.imageUrl ?? null, altText: p.title, linkUrl: p.landing ?? null },
        mkAtom('TEXT', p.title),
        ...(p.brand ? [mkAtom('INFO', p.brand)] : []),
      ] };
    }
    if (isProfile) {
      const info = p.key === 'pf-card-grade' ? '@cvm:membership.grade' : '@cvm:customer.phone';
      // 아바타 아톰은 넣지 않음 → ProfileCard가 기본 User 글리프로 렌더(@cvm 회원 사진은 런타임). 2026-11-05.
      return { ...base, componentType: '정보형', atoms: [
        mkAtom('TEXT', '@cvm:customer.name'),
        mkAtom('INFO', info),
        mkAtom('CTA', '나의 가입 현황'),
      ] };
    }
    // 상태 카드 — brand "값 · 보조문구"를 값(PRICE)+배지(BADGE)로 분리, 라벨은 title, 아이콘은 imageUrl.
    const [val, ...rest] = (p.brand ?? '').split('·').map((s) => s.trim());
    const badge = rest.join(' · ');
    return { ...base, componentType: '정보형', atoms: [
      mkAtom('PRICE', val || p.title),
      ...(badge ? [mkAtom('BADGE', badge)] : []),
      mkAtom('TEXT', p.title),
      mkAtom('ICON', null, p.imageUrl ?? null),
    ] };
  };
  // 프로필=카드 1장(첫 선택), 상태=여러 카드 묶음(세로로 쌓임). 가져오면 preview.components를 교체해 바로 그려지게 한다.
  const loadCardsToPreview = (ps: ProductOption[]) => {
    if (!ps.length) return;
    const comps = ps.map(cardToComponent);
    // 프로필·단일형 배너=1장만, 상태·스와이프 배너=여러 장 모두 반영.
    onPreviewPatch({ components: (isProfile || bannerSingle) ? comps.slice(0, 1) : comps });
  };
  // 미리보기 — 운영자 고정(실제 항목)은 실카드로, 나머지 CVM 보충은 '개별 카드'가 아니라 하단 점선 박스('CVM 추천 n~m칸')로 표현(2026-11-06 사용자 요청).
  //  min/max 를 넘기면 범위로, min=0 이면 CVM 박스 미표시(운영자 편성).
  const pushDataPreview = (ancs: FillItem[], cvmMinN: number, cvmMaxN: number) => {
    const fillMax = Math.max(0, cvmMaxN);
    const fillMin = Math.max(0, Math.min(cvmMinN, fillMax));
    if (isChip) {
      // 퀵메뉴(선택형) — 칩 = 운영자 고정만. CVM 보충은 아래 점선 박스로.
      const chipAtoms = ancs.map((o, i) => ({ id: `anc-${i}-${o.id}`, name: o.label || `고정${i + 1}`, atomType: 'TEXT', content: o.label || `고정 ${i + 1}`, imageUrl: o.icon ?? null, altText: null, linkUrl: o.link ?? null }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const comps = (pv?.components ?? []).map((c: any) => c.componentType === '선택형' ? { ...c, atoms: chipAtoms } : c);
      onPreviewPatch({ components: comps.length ? comps : [{ id: 'sel-anchor', name: '칩옵션', componentType: '선택형', atoms: chipAtoms }], cvmFillCount: fillMax, cvmFillMin: fillMin });
      return;
    }
    // 상품형·혜택·오퍼형 등 리스트 — 코너 유형 관리와 동일한 카드 UI. 운영자 고정만 실카드, CVM 보충은 점선 박스.
    const comp = corner.cornerType === '상품형' || corner.cornerType === '콘텐츠 안내형' ? '상품형' : '혜택형';
    const its = ancs.map((o) => ({ title: o.label || '아이템', brand: o.sub, imageUrl: o.icon ?? undefined, linkUrl: o.link ?? undefined }));
    const opComps = its.length === 0 ? [] : compositionToPreviewCorner({
      base: corner.cornerType, detail: corner.layoutDetail,
      composition: [{ componentType: comp as never, count: its.length, image: true, desc: true, items: its }],
      placeholder: false, emptyImages: false,
    }).components;
    // 카테고리형(상품형·혜택·오퍼형 가로/세로형(카테고리형)) — 상단 카테고리 칩(선택형)을 항상 유지해서 붙인다.
    //  재구성 시 칩이 사라지던 버그 수정(2026-11-09 사용자 요청: 카테고리가 미리보기에 떠야 함). 본문은 선택된 카테고리의 아이템.
    if (chipMode && chips.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chipAtoms: any[] = chips.map((c, i) => ({ id: `catchip-${i}-${c}`, name: c || `Category${i + 1}`, atomType: 'TEXT', content: c || `Category${i + 1}`, imageUrl: null, altText: null, linkUrl: null }));
      opComps.unshift({ id: 'cat-chip', name: '탭', componentType: '선택형', selectedIndex: chipIdx, chipVariant: 'contents', atoms: chipAtoms } as never);
    }
    onPreviewPatch({ components: opComps, cvmFillCount: fillMax, cvmFillMin: fillMin });
  };
  // 미리보기 동기화 — 리스트/칩 유형만. 데이터 연동=아이템+CVM 보충 박스, 운영자 편성=아이템만(CVM 박스 없음).
  //  카드1장(프로필·상태)·바코드·배너는 자체 미리보기 경로라 제외. 콘텐츠 연동은 구좌만 넘김이라 건드리지 않음.
  React.useEffect(() => {
    if (isProfile || isStatus || isBarcode || isBanner) return;
    // 카테고리형 — 칩(카테고리)을 바꾸면 항상 미리보기 갱신(활성 칩 강조 + 그 카테고리 아이템). 카테고리 항목은 실제 카탈로그 값이라 왕복 손실 없음(2026-11-09 사용자 요청).
    if (chipMode && isCategory) {
      if (isData) pushDataPreview(items, cvmMin, cvmMax);
      else pushDataPreview(items, 0, 0);
      return;
    }
    // 그 외 — 운영자가 ③ 항목을 실제로 편집/불러오기 한 키만 재구성한다. 손 안 댄 코너는 기본(placeholder) 미리보기를 그대로 유지(금액·타이틀 보존).
    //  CVM 데이터 연동의 '추천 보충 박스'는 미리보기 렌더 게이트에서 항상 표시되므로, 여기서 재구성하지 않아도 박스는 나온다.
    if (!dirty[chipKey]) return;
    if (isData) pushDataPreview(items, cvmMin, cvmMax);
    else if (src === '운영자 편성' || fillForFallback) pushDataPreview(items, 0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isData, src, items, cvmMin, cvmMax, dirty, chipKey, chipIdx, fillForFallback]);

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
        {/* 코너명 — 인라인 Row 컴포넌트(렌더마다 새 함수)로 감싸면 입력 중 리마운트돼 한글 IME가 깨진다 → 리터럴 div로 직접 렌더(2026-11-06). */}
        <div className="flex items-start gap-3 py-1.5 text-[13px]">
          <span className="w-[76px] shrink-0 text-[var(--ink3)]">코너명</span>
          <span className="min-w-0 flex-1 text-[var(--ink)]">
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
          </span>
        </div>
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
                <Grp color="#00a058" title="컴포넌트(요소)">
                  {isGaro && <FieldChip ko="형태" code="Variants" />}
                  {itemFixed.map((f) => <FieldChip key={f.key} ko={f.ko} code={f.key} />)}
                  {itemOpt.map((f) => <FieldChip key={f.key} ko={f.ko} code={f.key} opt />)}
                </Grp>
              )}
              <p className="flex items-center gap-1 text-[10.5px] text-[var(--ink4)]"><span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ac)]" /><span className="font-medium text-[var(--ac)]">옵션</span>은 빌더에서 on/off · 나머지는 고정</p>
            </div>
          );
        })()}
      </Sec>

      {/* ② 수급 — 클릭해 전환. 프로필형은 CVM 데이터 연동 고정(잠금). */}
      <Sec n={2} title="수급 — 이 자리를 누가 채우나" help>
        {isProfile && <p className="mb-2 flex items-start gap-1 rounded-[8px] bg-[#eef2ff] px-3 py-2 text-[12px] leading-relaxed text-[#2e4fd6]"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>프로필형은 <b>어떤 고객정보를 노출할지</b>를 운영자가 정하고(CVM 추천 아님), 값은 런타임 고객 데이터(@cvm)로 자동 표시됩니다. → <b>운영자 편성</b> 고정.</span></p>}
        {isStatus && <p className="mb-2 flex items-center gap-1 rounded-[8px] bg-[#eef2ff] px-3 py-2 text-[12px] text-[#2e4fd6]"><Lock className="h-3.5 w-3.5" /> 상태 안내형은 운영자가 <b>상태 카드를 뭉텅이로 편성</b>하고, 값·보조문구는 런타임 고객 데이터(@cvm)로 자동 표시됩니다. → <b>운영자 편성</b> 고정.</p>}
        {isBarcode && <p className="mb-2 flex items-start gap-1 rounded-[8px] bg-[#eef2ff] px-3 py-2 text-[12px] leading-relaxed text-[#2e4fd6]"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>멤버십 바코드는 회원 인증 기반 <b>런타임 발급</b>이라 추천/편성 대상이 아닙니다. 어드민은 아래 <b>라벨·갱신 주기</b> 정책만 관리합니다.</span></p>}
        <div className="space-y-2">
          {REC_SOURCE_METHODS.map((m) => {
            const info = REC_SOURCE_INFO[m]; const on = m === src; const Icon = REC_ICON[m] ?? Sparkles;
            return (
              <button key={m} type="button" disabled={srcLocked} onClick={() => { setSrc(m); onRecSourceChange(m); }} className={cn('w-full rounded-[10px] border px-3 py-2.5 text-left transition', on ? 'border-[var(--ac)] bg-[var(--ac2)]' : 'border-[var(--line3)] bg-white hover:border-[var(--ink5)]', srcLocked && !on && 'opacity-40')}>
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

      {/* ③ 폴백 — CVM 수급일 때. 폴백 선택(미노출/운영자 편성 대체)이 아래 '채우기' 내용을 좌우하므로 채우기 위에 둔다(2026-11-10 사용자 요청). */}
      {isCvmSrc && (
        <Sec n={3} title="폴백 — CVM 응답이 비었을 때" help>
          <div className="space-y-1.5">
            {(['미노출', '운영자 편성으로 대체'] as const).map((f) => {
              const on = fb === f;
              return (
                <button key={f} type="button" onClick={() => { setFb(f); onFallbackChange(f); onPreviewFallback(true); }} className={cn('flex w-full items-start gap-2 rounded-[8px] border px-2.5 py-2 text-left text-[12px]', on ? 'border-[#f2c47a] bg-[#fff8ef]' : 'border-[var(--line2)] bg-white opacity-80')}>
                  <span className={cn('mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border', on ? 'border-[#e59a2a] bg-[#e59a2a]' : 'border-[var(--line3)]')}>{on && <span className="h-1.5 w-1.5 rounded-full bg-white" />}</span>
                  <span className="min-w-0 flex-1">
                    <b className="text-[var(--ink)]">{f === '미노출' ? '미노출 (기본)' : '운영자 편성으로 대체'}</b>
                    <span className="block text-[var(--ink4)]">{f === '미노출' ? 'CVM이 비면 이 코너는 노출되지 않아요.' : '등록한 운영자 편성 항목을 대신 노출해요.'}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {/* 미노출 조건은 '미노출'을 고른 경우에만 — 운영자 편성 대체면 코너가 숨지 않으므로 불필요(2026-11-10 사용자 요청). */}
          {fb === '미노출' && MiNoChul}
        </Sec>
      )}

      {/* ④ 수급 방식별 — 운영자 편성=채우기, 데이터 연동=요청, 콘텐츠 연동=구좌만 */}
      {(src === '운영자 편성' || (isData && !isProfile) || fillForFallback) ? (
        <Sec n={nFill} title={fillForFallback ? '운영자 편성 대체 — CVM이 비면 노출할 항목' : isData ? '운영자 고정 — 먼저 채울 항목 (나머지는 CVM)' : '채우기 — 항목 등록'}>
          {fillForFallback && (
            <div className="mb-3 flex items-start gap-1.5 rounded-[8px] bg-[#fff8ef] px-3 py-2 text-[12px] leading-relaxed text-[#b67a12]">
              <span className="mt-0.5">⚠</span><span>이 코너는 <b>CVM 콘텐츠 연동</b>이라 평소엔 CVM 완성본이 노출됩니다. <b>CVM 응답이 비면</b> 아래에 등록한 운영자 편성 항목이 대신 노출돼요(폴백 미리보기에서 확인).</span>
            </div>
          )}
          {/* 칩 불러오기 모달 — 탭(코너 속성)에서 눌러도 뜨도록 탭 바깥(최상단)에 렌더(2026-11-05 사용자 요청). */}
          {chipLoadOpen && (
            <ChipLoadModal catalog={catalog} current={chips} onClose={() => setChipLoadOpen(false)}
              onAdd={(picks) => {
                // 카테고리(칩) 추가 + 카테고리별 컴포넌트 리스트(itemsByKey)를 한 번에 세팅(2026-11-06).
                setChips((prev) => [...prev, ...picks.map((p) => p.category).filter((c) => !prev.includes(c))]);
                setItemsByKey((m) => {
                  const next = { ...m };
                  for (const p of picks) {
                    const key = `${isCategory ? 'cat' : 'chip'}:${p.category}`;
                    next[key] = p.items.map((it, i) => ({ id: `cat-${p.category}-${i}-${it.key}`, label: it.title || it.brand, icon: it.imageUrl ?? null, link: it.landing ?? null, sub: it.brand, mode: 'load' as const }));
                  }
                  return next;
                });
                setDirty((d) => { const n = { ...d }; for (const p of picks) n[`${isCategory ? 'cat' : 'chip'}:${p.category}`] = true; return n; });
                setChipLoadOpen(false);
                const itemN = picks.reduce((s, p) => s + p.items.length, 0);
                onToast(`카테고리 ${picks.length}개 · 컴포넌트 ${itemN}개 담음`);
              }} />
          )}
          {/* ── 코너 속성 / 아이템 탭 — 등록을 나눠서(2026-11-05 사용자 요청). 코너 속성이 없으면(배너형 등) 아이템만 노출. 카드 1장 유형(프로필·상태)은 탭 없음. ── */}
          {(hasCornerTitle || hasButtonText || availOptions.length > 0) && !cardOnly && (
            <div className="mb-3 flex gap-1 rounded-[8px] border border-[var(--line2)] bg-[var(--th)] p-0.5 text-[12px] font-semibold">
              <button type="button" onClick={() => setFillTab('코너')} className={cn('flex-1 rounded-[6px] px-3 py-1.5 text-center', fillTab === '코너' ? 'bg-white text-[var(--ac)] shadow-sm' : 'text-[var(--ink3)]')}>코너 속성</button>
              <button type="button" onClick={() => setFillTab('아이템')} className={cn('flex-1 rounded-[6px] px-3 py-1.5 text-center', fillTab === '아이템' ? 'bg-white text-[var(--ac)] shadow-sm' : 'text-[var(--ink3)]')}>컴포넌트 <span className="font-normal opacity-70">· {items.length}</span></button>
            </div>
          )}
          {/* ── 코너 속성 — 코너 타이틀·버튼 텍스트·옵션(배너·칩·CTA). 카드 1장 유형은 항상 노출. ── */}
          {(hasCornerTitle || hasButtonText || availOptions.length > 0) && (fillTab === '코너' || cardOnly) && (
            <div className="mb-1 rounded-[8px] border border-[var(--line3)] bg-[var(--th)] p-2.5">
              <p className="mb-2 text-[12px] font-bold text-[var(--ink2)]">코너 <span className="font-normal text-[var(--ink4)]">· 코너 전체에 적용</span></p>
              {hasCornerTitle && (
                <label className="mb-2 block">
                  <span className="mb-1 block text-[11px] font-semibold text-[var(--ink3)]">코너 타이틀 <span className="font-normal text-[var(--ink4)]">CornerTitle</span></span>
                  {/* 코너 유형에 맞는 영역 제목 초안을 하나 생성(눌러서 다른 후보). 운영자 초안 — CVM이 주는 값이 아니다(코너 타이틀=코너 구성). 2026-11-10 사용자 요청. */}
                  <div className="flex items-center gap-1">
                    <input value={cornerTitleVal} onChange={(e) => { setCornerTitleVal(e.target.value); onPreviewPatch({ mainTitle: e.target.value || 'CornerTitle' }); }} placeholder="코너 제목 입력 (비어 있으면 AI 추천)" className="h-[32px] min-w-0 flex-1 rounded-[6px] border border-[var(--line2)] bg-white px-2 text-[13px] focus:border-[var(--ac)] focus:outline-none" />
                    <button type="button" onClick={genAiTitle} title="코너 유형에 맞는 영역 제목을 하나 생성해요 (초안 · 눌러서 다른 후보)"
                      className="flex h-[32px] shrink-0 items-center gap-1 whitespace-nowrap rounded-[6px] border border-[#cfd2ff] bg-[var(--ac2)] px-2 text-[11px] font-semibold text-[var(--ac)] hover:bg-[#e6e8ff]">
                      <Sparkles className="h-3 w-3" /> AI 추천
                    </button>
                  </div>
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
                  {/* 배너 On(옵션 배너) → 소재 불러오기 3소스: 배너 캠페인 / DS 포탈 / 로컬(2026-11-05 사용자 요청). 주소 직접 입력은 없음. */}
                  {optOn['배너'] && (
                    <div className="mt-2 rounded-[7px] border border-[var(--line2)] bg-white p-2">
                      <div className="mb-1.5 flex items-center gap-1.5">
                        <span className="grid h-10 w-16 shrink-0 place-items-center overflow-hidden rounded-[6px] border border-[var(--line2)] bg-white text-[var(--ink4)]">
                          {bannerImg ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={bannerImg} alt="배너" className="h-full w-full object-cover" /> : <ImageIcon className="h-4 w-4" />}
                        </span>
                        <p className="text-[11px] font-semibold text-[var(--ink3)]">배너 이미지 <span className="font-normal text-[var(--ink4)]">· 소재를 불러오세요</span></p>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {([['배너 캠페인', '배너 캠페인 관리'], ['DS 포탈', 'DS 포탈'], ['로컬', '로컬 업로드']] as const).map(([label, src]) => (
                          <button key={label} type="button" onClick={() => onToast(`${src}에서 불러오기 (데모)`)} className="flex items-center justify-center gap-1 rounded-[6px] border border-[var(--line2)] bg-white px-1 py-1.5 text-[11px] font-medium text-[var(--ink2)] hover:border-[var(--ac)] hover:text-[var(--ac)]"><Search className="h-3 w-3 shrink-0" /> {label}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* 칩 On → 카테고리 탭. 불러온 칩=실선(클릭=아이템 전환·X 삭제), 빈 자리=점선 'Chip'(클릭하면 불러오기). 2026-11-05 사용자 요청. */}
                  {optOn['칩'] && (
                    <div className="mt-2 rounded-[7px] border border-[var(--line2)] bg-white p-2">
                      <div className="mb-1.5 flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-[var(--ink3)]">카테고리 탭</span>
                        <span className="rounded-full bg-[var(--th)] px-1.5 text-[11px] font-bold text-[var(--ink3)]">{chips.length}/{Math.max(chipSlotCount, chips.length)}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {chips.map((c, i) => (
                          <span key={i} onClick={() => setActiveChip(i)}
                            className={cn('inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-medium', i === chipIdx ? 'border-[var(--ac)] bg-[var(--ac2)] text-[var(--ac)]' : 'border-[var(--line3)] bg-white text-[var(--ink2)]')}>
                            {c}
                            <button type="button" onClick={(e) => { e.stopPropagation(); setChips((cs) => cs.filter((_, j) => j !== i)); }} className="text-[var(--ink4)] hover:text-[var(--bad)]"><X className="h-3 w-3" /></button>
                          </span>
                        ))}
                        {/* 디폴트는 '+ 칩 불러오기' 버튼만 — 여기서 카테고리를 추가한다(2026-11-05 사용자 요청: 점선 placeholder 제거). */}
                        <button type="button" onClick={() => setChipLoadOpen(true)} className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-[#cfd2ff] px-2.5 py-1 text-[12px] font-semibold text-[var(--ac)]"><Plus className="h-3 w-3" /> Category</button>
                      </div>
                      <p className="mt-1.5 text-[11px] text-[var(--ink4)]">점선 <b className="text-[var(--ink3)]">Chip</b>은 빈 자리예요 · <b className="text-[var(--ink3)]">불러오기</b>로 카테고리를 넣으면 반영됩니다. 칩을 누르면 아래 아이템이 그 칩 항목으로 바뀌어요.</p>
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
          {/* ── 카드 1장 유형(프로필·상태) = 아이템 리스트 없이 '한번에 가져오기'만. 값은 런타임 고객 데이터(@cvm) 자동. ── */}
          {cardOnly && (
            <div className="rounded-[8px] border border-[var(--line3)] bg-white p-2.5">
              <div className="mb-2 flex items-start gap-2 text-[12px] leading-relaxed text-[var(--ink2)]">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ac)]" />
                <span>{isProfile
                  ? <>완성된 <b className="text-[var(--ac)]">프로필 카드</b>(사진·이름·휴대폰·가입현황)를 통째로 가져오세요. 값은 런타임 고객 데이터(<b>@cvm</b>)로 자동 표시됩니다.</>
                  : <>완성된 <b className="text-[var(--ac)]">상태 카드</b>(이용요금·포인트 등)를 통째로 가져오세요. 값·보조문구는 런타임 고객 데이터(<b>@cvm</b>)로 자동 표시됩니다.</>}</span>
              </div>
              {items.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {items.map((o) => (
                    <span key={o.id} className="inline-flex items-center gap-1 rounded-full bg-[var(--ac2)] py-1 pl-1.5 pr-2 text-[12px] font-medium text-[var(--ac)]">
                      <span className="grid h-4 w-4 place-items-center overflow-hidden"><ItemIcon src={o.icon} iconClass="h-3.5 w-3.5" imgClass="h-3.5 w-3.5 object-contain" /></span>
                      {o.label}
                      <button type="button" onClick={() => removeItem(o.id)} className="text-[var(--ac)] opacity-60 hover:text-[var(--bad)] hover:opacity-100"><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => setLoadForId(APPEND_LOAD)} className="flex w-full items-center justify-center gap-1 rounded-[8px] border border-[#cfd2ff] bg-[var(--ac2)] py-2 text-[12px] font-bold text-[var(--ac)] hover:bg-[#e6e8ff]"><Plus className="h-3.5 w-3.5" /> {isProfile ? '프로필 카드 가져오기' : '상태 카드 가져오기'}</button>
              {loadForId && (
                <ProductLoadModal catalog={catalog} cornerType={isStatus ? '상태 안내형' : isProfile ? '프로필형' : corner.cornerType} onClose={() => setLoadForId(null)}
                  onAdd={(ps) => { addFromCatalog(ps); loadCardsToPreview(ps); onToast(`${ps.length}개 담음`); }} />
              )}
            </div>
          )}
          {/* ── 바코드형 = 라벨·갱신 주기 정책만. 번호는 회원별 런타임 발급(미리보기엔 sample). ── */}
          {isBarcode && (
            <div className="rounded-[8px] border border-[var(--line3)] bg-white p-2.5">
              <p className="mb-2 flex items-center gap-1.5 text-[12px] font-bold text-[var(--ink2)]"><Barcode className="h-4 w-4 text-[var(--ac)]" /> 바코드 정책</p>
              <label className="mb-2 block">
                <span className="mb-1 block text-[11px] font-semibold text-[var(--ink3)]">바코드명 <span className="font-normal text-[var(--ink4)]">라벨 · 예: T멤버십</span></span>
                <input value={barcodeLabel} onChange={(e) => { setBarcodeLabel(e.target.value); onPreviewPatch({ mainTitle: e.target.value || 'T멤버십' }); }} placeholder="예: T멤버십" className="h-[32px] w-full rounded-[6px] border border-[var(--line2)] bg-white px-2 text-[13px] focus:border-[var(--ac)] focus:outline-none" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-[var(--ink3)]">유효·갱신 주기 <span className="font-normal text-[var(--ink4)]">분 · 바코드 재발급·카운트다운 기준</span></span>
                <div className="flex items-center gap-1.5">
                  <input type="number" min={1} value={barcodeRefresh} onChange={(e) => setBarcodeRefresh(e.target.value)} className="h-[32px] w-20 rounded-[6px] border border-[var(--line2)] bg-white px-2 text-[13px] focus:border-[var(--ac)] focus:outline-none" />
                  <span className="text-[12px] text-[var(--ink4)]">분마다 갱신</span>
                </div>
              </label>
              <p className="mt-2 flex items-start gap-1 rounded-[6px] bg-[var(--th)] px-2 py-1.5 text-[11px] leading-relaxed text-[var(--ink3)]"><Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-[var(--ac)]" /> 바코드 번호는 회원 인증 기반 <b className="mx-0.5">런타임 발급</b> — 미리보기엔 sample 번호로 표시됩니다.</p>
            </div>
          )}
          {/* ── 아이템 탭(또는 코너 속성이 없는 유형)에서만 아이템 리스트 노출 ── */}
          {!cardOnly && !isBarcode && (!(hasCornerTitle || hasButtonText || availOptions.length > 0) || fillTab === '아이템') && (
          <>
          {/* 카테고리형 — 상단 카테고리 칩 관리(불러오기). 칩 선택 시 아래 컴포넌트 리스트가 그 카테고리로 전환(카테고리별 데이터 세팅, 2026-11-06 사용자 요청). */}
          {isCategory && (
            <div className="mb-3 rounded-[8px] border border-[var(--line3)] bg-white p-2.5">
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[12px] font-bold text-[var(--ink2)]">카테고리</span>
                <span className="rounded-full bg-[var(--th)] px-1.5 text-[11px] font-bold text-[var(--ink3)]">{chips.length}</span>
                <span className="text-[11px] font-normal text-[var(--ink4)]">· 칩을 눌러 카테고리별 컴포넌트를 구성해요</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {chips.map((c, i) => (
                  <span key={i} onClick={() => setActiveChip(i)}
                    className={cn('inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-medium', i === chipIdx ? 'border-[var(--ac)] bg-[var(--ac2)] text-[var(--ac)]' : 'border-[var(--line3)] bg-white text-[var(--ink2)]')}>
                    {c}
                    <button type="button" onClick={(e) => { e.stopPropagation(); setChips((cs) => cs.filter((_, j) => j !== i)); }} className="text-[var(--ink4)] hover:text-[var(--bad)]"><X className="h-3 w-3" /></button>
                  </span>
                ))}
                <button type="button" onClick={() => setChipLoadOpen(true)} className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-[#cfd2ff] px-2.5 py-1 text-[12px] font-semibold text-[var(--ac)]"><Plus className="h-3 w-3" /> 카테고리 불러오기</button>
              </div>
              {chips.length === 0 && <p className="mt-1.5 text-[11px] text-[var(--ink4)]">먼저 카테고리를 불러온 뒤, 칩마다 아래에서 컴포넌트를 등록하세요.</p>}
            </div>
          )}
          {/* 배너형 = 배너 캠페인 관리에서 '가져오기'로만 채움 — 안내 + 아래 가져오기 버튼(2026-11-05 사용자 요청). */}
          {isBanner && (
            <div className="mb-2 flex items-start gap-2 rounded-[8px] border border-[var(--line2)] bg-white px-3 py-2.5 text-[12px] leading-relaxed text-[var(--ink2)]">
              <GalleryHorizontalEnd className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ac)]" />
              <span>배너 소재는 <b className="text-[var(--ac)]">배너 캠페인 관리</b>에서 등록해요. 아래 <b>배너 가져오기</b>로 등록된 배너를 담습니다.</span>
            </div>
          )}
          {/* ── 아이템 — 실제 노출 항목 리스트(코너 유형 관리의 '아이템'에 대응). ── */}
          <p className="mb-1.5 text-[12px] font-bold text-[var(--ink2)]">컴포넌트 <span className="font-normal text-[var(--ink4)]">· {itemWord} {items.length}개</span></p>
          {/* 칩 On이면 '현재 칩의 메뉴'임을 알려주고, 칩마다 메뉴가 따로 저장된다. */}
          {chipMode && (
            <div className="mb-1.5 mt-1 flex flex-wrap items-center gap-1.5 text-[12px]">
              <span className="font-semibold text-[var(--ink2)]">{isCategory ? '카테고리' : '칩'} <span className="text-[var(--ac)]">&lsquo;{chips[chipIdx]}&rsquo;</span>의 {isCategory ? '컴포넌트' : '메뉴'}</span>
              <span className="text-[var(--ink4)]">— 위 {isCategory ? '카테고리' : '칩'}를 눌러 따로 구성</span>
            </div>
          )}
          <DndContext sensors={itemSensors} collisionDetection={closestCorners} onDragEnd={onItemDragEnd}>
          <SortableContext items={items.map((o) => o.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {items.length === 0 && <p className="rounded-[8px] border border-dashed border-[var(--line3)] px-3 py-4 text-center text-[12px] text-[var(--ink4)]">아직 {itemWord}가 없어요 · &lsquo;{itemWord} 추가&rsquo;로 {canLoad ? (loadOnly ? '등록된 ' + itemWord + '에서 담으세요' : '카탈로그에서 끌어오세요') : '추가하세요'}</p>}
            {items.map((o) => (
              <SortableFillRow key={o.id} id={o.id}>{(h) => {
              // 배너 — 미리보기와 동일한 '띠 배너'(문구+이미지 합성)로 통째로 노출(2026-11-10 사용자 요청). 소재·문구·랜딩은 배너 캠페인 소유 → 기본 읽기 전용, '수정'을 눌러야 편집.
              if (isBanner) {
                const bannerComp: PreviewComponent = {
                  id: String(o.id), name: o.label || '배너', componentType: '배너형',
                  atoms: [
                    { id: 't', name: 'title', atomType: 'TEXT', content: o.label || '배너 타이틀', imageUrl: null, altText: null, linkUrl: null },
                    { id: 'i', name: 'img', atomType: 'IMAGE', content: null, imageUrl: o.icon ?? null, altText: o.label ?? null, linkUrl: null },
                  ],
                };
                // 배너는 이미지·문구·랜딩이 전부 배너 캠페인 소유 → 여기선 수정 불가(문구·링크 모두 읽기 전용). 교체는 '불러오기'로만(2026-11-10 사용자 요청).
                return (
                <div className="space-y-2 rounded-[9px] border border-[var(--line2)] bg-white p-2">
                  <div className="flex items-start gap-2">
                    {!bannerSingle && <span ref={h.setRef} {...h.props} className="mt-1 shrink-0 cursor-grab touch-none text-[var(--ink4)]"><GripVertical className="h-4 w-4" /></span>}
                    {/* 띠 배너 미리보기 — 작은 썸네일 크기로 고정(미리보기보다 작게). 클릭하면 배너 캠페인에서 소재 교체. 2026-11-10 사용자 요청. */}
                    <button type="button" onClick={() => (canLoad ? setLoadForId(o.id) : onToast('불러오기 (데모)'))} title="배너 캠페인에서 불러오기" className="w-[200px] max-w-full shrink-0 text-left">
                      <BannerCard component={bannerComp} sizeDetail={corner.layoutDetail} />
                    </button>
                    <button type="button" onClick={() => tryRemove(o)} className="ml-auto grid h-6 w-6 shrink-0 place-items-center rounded-[6px] text-[var(--ink4)] hover:bg-[#fff0f1] hover:text-[var(--bad)]"><X className="h-3.5 w-3.5" /></button>
                  </div>
                  {/* 사이즈 배지 + 배너 타이틀(읽기 전용 — 배너 캠페인 관리에서만 수정) */}
                  <div className="flex items-center gap-1">
                    {o.sub && <span className="shrink-0 rounded-[4px] bg-[var(--th)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--ink3)]">{o.sub}</span>}
                    <span className="min-w-0 flex-1 truncate px-1 text-[13px] font-medium text-[var(--ink)]">{o.label || <span className="font-normal text-[var(--ink4)]">배너 타이틀</span>}</span>
                    {canLoad && <button type="button" onClick={() => setLoadForId(o.id)} title="배너 캠페인에서 불러오기" className="flex h-[28px] shrink-0 items-center gap-1 rounded-[6px] border border-[var(--line2)] bg-white px-2 text-[11px] font-medium text-[var(--ink2)] hover:border-[var(--ac)] hover:text-[var(--ac)]"><Search className="h-3 w-3" /> 불러오기</button>}
                  </div>
                  {/* 랜딩 링크 — 배너 캠페인 소유(읽기 전용). 수정은 배너 캠페인 관리에서만. */}
                  <div className="flex h-[26px] min-w-0 items-center gap-1 rounded-[6px] bg-[var(--th)] px-2 text-[12px] text-[var(--ink3)]" title="랜딩 링크 — 배너 캠페인 관리에서만 수정">
                    <Link2 className="h-3 w-3 shrink-0 text-[var(--ink4)]" />
                    <span className="min-w-0 flex-1 truncate">{o.link || '랜딩 링크 (배너 캠페인에서 설정)'}</span>
                    <span className="shrink-0 rounded-[4px] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[var(--ink4)]">캠페인 전용</span>
                  </div>
                </div>
                );
              }
              // 이미지 기반 유형(영화·혜택·상품) — 썸네일(불러온 이미지, 클릭 시 교체) + 제목·링크 + 행별 불러오기.
              //  ③ 화면이 편집 상태 → 문구(제목)는 항상 편집 가능. '수정'은 원장에 연결된 '링크'에만(2026-11-10 사용자 요청).
              if (!isChip) {
                const connected = o.mode === 'load';
                const linkEdit = !connected || !!rowEdit[o.id]; // 직접 추가 행은 링크도 바로 편집
                return (
                <div className="flex items-center gap-2 rounded-[9px] border border-[var(--line2)] bg-white px-2 py-1.5">
                  <span ref={h.setRef} {...h.props} className="shrink-0 cursor-grab touch-none text-[var(--ink4)]"><GripVertical className="h-4 w-4" /></span>
                  {/* 썸네일 — 클릭하면 불러오기(이미지 교체). 정사각 */}
                  <button type="button" onClick={() => (canLoad ? setLoadForId(o.id) : onToast('불러오기 (데모)'))} title="이미지 불러오기"
                    className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[6px] border border-[var(--line2)] bg-[var(--th)] text-[var(--ink4)] transition hover:border-[var(--ac)]">
                    <ItemIcon src={o.icon} brand={o.sub || o.label} iconClass="h-5 w-5" imgClass="h-full w-full object-contain" />
                  </button>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    {/* 제목(문구)은 항상 편집 가능. 혜택 유형은 옆에 'AI 추천' — 브랜드·카테고리 맞춤 문구 초안. */}
                    <div className="flex items-center gap-1">
                      <input value={o.label} onChange={(e) => setItemLabel(o.id, e.target.value)} placeholder={isBenefitType ? '혜택 문구 (비어 있으면 AI 추천)' : `${itemWord} 제목`} className="h-[28px] min-w-0 flex-1 rounded-[6px] border border-[var(--line2)] px-2 text-[13px] focus:border-[var(--ac)] focus:outline-none" />
                      {isBenefitType && (
                        <button type="button" onClick={() => genAiCopy(o)} title={`${o.sub || o.label || '이 브랜드'}에 맞는 혜택 문구를 하나 생성해요 (초안 · 눌러서 다른 후보)`}
                          className="flex h-[28px] shrink-0 items-center gap-1 whitespace-nowrap rounded-[6px] border border-[#cfd2ff] bg-[var(--ac2)] px-2 text-[11px] font-semibold text-[var(--ac)] hover:bg-[#e6e8ff]">
                          <Sparkles className="h-3 w-3" /> AI 추천
                        </button>
                      )}
                    </div>
                    {/* 이동 링크 — 원장 연결 → 기본 읽기 전용, '수정' 눌러야 편집(직접 추가 행은 바로 편집). 콘텐츠 안내형은 iframe 연결이라 수정 자체 불가(locked). */}
                    <LinkEditRow link={o.link} editing={linkEdit} onToggle={() => toggleRowEdit(o.id)} onChange={(v) => setItemLink(o.id, v)} source={isContentGuide ? '콘텐츠' : '원장'} locked={isContentGuide} />
                  </div>
                  {canLoad && <button type="button" onClick={() => setLoadForId(o.id)} title="카탈로그에서 불러오기" className="flex h-[30px] shrink-0 self-center items-center gap-1 rounded-[7px] border border-[var(--line2)] bg-white px-2.5 text-[11px] font-medium text-[var(--ink2)] hover:border-[var(--ac)] hover:text-[var(--ac)]"><Search className="h-3 w-3" /> 불러오기</button>}
                  <button type="button" onClick={() => tryRemove(o)} className="grid h-6 w-6 shrink-0 self-center place-items-center rounded-[6px] text-[var(--ink4)] hover:bg-[#fff0f1] hover:text-[var(--bad)]"><X className="h-3.5 w-3.5" /></button>
                </div>
                );
              }
              // 칩형(퀵메뉴) — 행마다 [직접 등록 | 불러오기] 세그먼트. 직접=아이콘·텍스트·링크 입력, 불러오기=메뉴 관리에서 메뉴를 끌어옴(2026-11-05 사용자 요청: 세그먼트 부활·소스는 메뉴 관리).
              const loaded = o.mode === 'load';
              return (
              <div className="flex items-center gap-1.5 rounded-[9px] border border-[var(--line2)] bg-white px-2 py-1.5">
                <span ref={h.setRef} {...h.props} className="shrink-0 cursor-grab touch-none text-[var(--ink4)]"><GripVertical className="h-4 w-4" /></span>
                {/* 세그먼트 — 직접 | 불러오기. 불러오기를 고르면 '모달 즉시 열기/잠금' 대신 우측에 '불러오기' 버튼이 뜬다(2026-11-05 사용자 요청: 켜짐 금지, 우측 버튼). */}
                <div className="flex shrink-0 gap-0.5 rounded-[8px] border border-[var(--line2)] bg-[var(--th)] p-[3px] text-[11px] font-semibold">
                  <button type="button" onClick={() => setItemMode(o.id, 'direct')} className={cn('rounded-[6px] px-2 py-1 transition', !loaded ? 'bg-white text-[var(--ac)] shadow-sm ring-1 ring-[#cfd2ff]' : 'text-[var(--ink4)] hover:text-[var(--ink2)]')}>직접</button>
                  <button type="button" onClick={() => setItemMode(o.id, 'load')} className={cn('rounded-[6px] px-2 py-1 transition', loaded ? 'bg-white text-[var(--ac)] shadow-sm ring-1 ring-[#cfd2ff]' : 'text-[var(--ink4)] hover:text-[var(--ink2)]')}>불러오기</button>
                </div>
                {/* 아이콘 — 클릭해 아이콘 선택(직접) */}
                <button type="button" onClick={() => setIconForId(o.id)} title="아이콘 선택"
                  className={cn('grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-[7px] transition', o.icon ? 'bg-[var(--ac2)] text-[var(--ac)] hover:ring-1 hover:ring-[var(--ac)]' : 'border border-dashed border-[var(--line3)] bg-white text-[var(--ink4)] hover:border-[var(--ac)] hover:text-[var(--ac)]')}>
                  {o.icon ? <ItemIcon src={o.icon} iconClass="h-[18px] w-[18px]" imgClass="h-5 w-5 object-contain" /> : <ImageIcon className="h-4 w-4" />}
                </button>
                {/* 텍스트·링크 — 항상 편집 가능 */}
                <input value={o.label} onChange={(e) => setItemLabel(o.id, e.target.value)} placeholder="메뉴명"
                  className="h-[32px] min-w-0 flex-1 rounded-[7px] border border-[var(--line2)] px-2 text-[13px] focus:border-[var(--ac)] focus:outline-none" />
                <div className="flex h-[32px] min-w-0 basis-[26%] items-center gap-1 rounded-[7px] border border-[var(--line2)] px-2" title="이동 링크">
                  <Link2 className="h-3.5 w-3.5 shrink-0 text-[var(--ink4)]" />
                  <input value={o.link ?? ''} onChange={(e) => setItemLink(o.id, e.target.value)} placeholder="이동 링크"
                    className="h-full min-w-0 flex-1 bg-transparent text-[12px] focus:outline-none" />
                </div>
                {/* 직접 입력 링크만 내부/외부 선택. 불러오기 모드는 메뉴 관리가 링크를 소유 → 라디오 숨김(2026-11-10 사용자 확인). */}
                {!loaded && <LinkTypeRadio o={o} />}
                {/* 불러오기 모드일 때만 우측에 '불러오기' 버튼 → 메뉴 관리 모달 */}
                {loaded && <button type="button" onClick={() => setLoadForId(o.id)} title="메뉴 관리에서 불러오기" className="flex shrink-0 items-center gap-1 rounded-[7px] border border-[#cfd2ff] bg-[var(--ac2)] px-2 py-1.5 text-[11px] font-semibold text-[var(--ac)] hover:bg-[#e6e8ff]"><Search className="h-3 w-3" /> 불러오기</button>}
                <button type="button" onClick={() => tryRemove(o)} className="grid h-6 w-6 shrink-0 place-items-center rounded-[6px] text-[var(--ink4)] hover:bg-[#fff0f1] hover:text-[var(--bad)]"><X className="h-3.5 w-3.5" /></button>
              </div>
              );
            }}</SortableFillRow>
            ))}
          </div>
          </SortableContext>
          </DndContext>
          {/* 불러오기 모달 — 유형별 카탈로그에서 멀티 셀렉으로 담기 */}
          {loadForId && (
            <ProductLoadModal catalog={catalog} cornerType={isStatus ? '상태 안내형' : corner.cornerType} onClose={() => setLoadForId(null)}
              onAdd={(ps) => { addFromCatalog(ps); if (isBanner) loadCardsToPreview(ps); onToast(`${ps.length}개 담음`); }} />
          )}
          {/* 아이콘 선택 모달 — 행 아이콘 영역 클릭 시(2026-11-05 사용자 요청) */}
          {iconForId && (
            <IconPickerModal current={items.find((x) => x.id === iconForId)?.icon ?? null} onClose={() => setIconForId(null)}
              onPick={(ic) => { setItemIcon(iconForId, ic); setIconForId(null); onToast('아이콘을 적용했습니다.'); }} />
          )}
          {/* 삭제 확인 모달 — 데이터 있는 항목만(빈 항목은 바로 삭제, 2026-11-05 사용자 요청). */}
          {removeTarget && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={() => setRemoveTarget(null)}>
              <div className="w-full max-w-xs rounded-[16px] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <p className="text-[15px] font-bold text-[var(--ink)]">항목을 삭제할까요?</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--ink3)]"><b className="text-[var(--ink)]">{removeTarget.label || '이 항목'}</b> 의 내용이 함께 삭제됩니다.</p>
                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" onClick={() => setRemoveTarget(null)} className="rounded-[8px] border border-[var(--line2)] bg-white px-4 py-2 text-[13px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]">취소</button>
                  <button type="button" onClick={() => { removeItem(removeTarget.id); setRemoveTarget(null); onToast('항목을 삭제했습니다.'); }} className="rounded-[8px] bg-[var(--bad)] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90">삭제</button>
                </div>
              </div>
            </div>
          )}
          {/* 추가 — 직접 추가는 칩형(퀵메뉴)에만. 단일형 배너는 기존 있으면 '변경'만·비면 '불러오기'. 나머지는 '불러오기' 단일(2026-11-05 사용자 확정). */}
          {isChip ? (
            <button type="button" onClick={addItem} className="mt-2 flex w-full items-center justify-center gap-1 rounded-[8px] border border-[#cfd2ff] bg-[var(--ac2)] py-2 text-[12px] font-bold text-[var(--ac)] hover:bg-[#e6e8ff]"><Plus className="h-3.5 w-3.5" /> 추가</button>
          ) : bannerSingle ? (
            items.length === 0 ? (
              <button type="button" onClick={() => setLoadForId(APPEND_LOAD)} className="mt-2 flex w-full items-center justify-center gap-1 rounded-[8px] border border-[#cfd2ff] bg-[var(--ac2)] py-2 text-[12px] font-bold text-[var(--ac)] hover:bg-[#e6e8ff]"><Search className="h-3.5 w-3.5" /> 배너 캠페인에서 불러오기</button>
            ) : null
          ) : canLoad ? (
            <button type="button" onClick={() => setLoadForId(APPEND_LOAD)} className="mt-2 flex w-full items-center justify-center gap-1 rounded-[8px] border border-[#cfd2ff] bg-[var(--ac2)] py-2 text-[12px] font-bold text-[var(--ac)] hover:bg-[#e6e8ff]"><Search className="h-3.5 w-3.5" /> {isBanner ? '배너 캠페인에서 불러오기' : ('등록된 ' + itemWord + '에서 불러오기')}</button>
          ) : null}
          </>
          )}
          {/* CVM 데이터 연동 — 위 운영자 고정(아이템) + 나머지는 CVM이 중분류에서 채움(2026-11-06 사용자 확정: 별도 UI 없이 같은 아이템 UI 재사용). */}
          {isData && (
            <div className="mt-4 border-t border-[var(--line2)] pt-3">
              <div className="mb-2 flex items-start gap-1.5 rounded-[8px] bg-[#eef2ff] px-3 py-2 text-[12px] leading-relaxed text-[#2e4fd6]">
                <span className="mt-0.5">ⓘ</span><span>위 <b>운영자 고정</b> 항목은 그대로 두고, <b>나머지 자리는 CVM</b>이 중분류에서 채웁니다(협의 중 조정 가능).</span>
              </div>
              <p className="mb-1.5 text-[12px] font-semibold text-[var(--ink3)]">요청 중분류 <span className="font-normal text-[var(--ink4)]">· 나머지 자리를 채울 CVM 범위</span></p>
              <div className="flex flex-wrap gap-1.5">
                {CVM_CATALOGS.map((c) => (
                  <button key={c} type="button" onClick={() => setCat(c)} className={cn('rounded-[8px] px-2.5 py-1.5 text-[12px] font-semibold', c === cat ? 'bg-[var(--ac)] text-white' : 'bg-[var(--th)] text-[var(--ink2)] hover:bg-[var(--line)]')}>{c}</button>
                ))}
              </div>
              {/* 직접 입력 — 프리셋에 없는 중분류를 운영자가 직접 적어 CVM에 제안(2026-11-09 사용자 요청). 입력하면 위 프리셋 칩은 자동 해제. */}
              <div className="mt-1.5 flex items-center gap-1.5">
                <input value={CVM_CATALOGS.includes(cat) ? '' : cat} onChange={(e) => setCat(e.target.value)}
                  placeholder="직접 입력 (예: 로밍 혜택 · 멤버십 등급)"
                  className={cn('h-[32px] min-w-0 flex-1 rounded-[6px] border bg-white px-2.5 text-[13px] focus:border-[var(--ac)] focus:outline-none', CVM_CATALOGS.includes(cat) ? 'border-[var(--line2)]' : 'border-[var(--ac)]')} />
                {!CVM_CATALOGS.includes(cat) && cat && <span className="shrink-0 rounded-[6px] bg-[var(--ac2)] px-2 py-1 text-[11px] font-semibold text-[var(--ac)]">직접 입력</span>}
              </div>
              <p className="mb-1.5 mt-3 text-[12px] font-semibold text-[var(--ink3)]">나머지 요청 개수 <span className="font-normal text-[var(--ink4)]">· CVM이 채울 자리 (최소~최대)</span></p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-[var(--ink4)]">최소</span>
                  <input type="number" min={1} max={5} value={cvmMin}
                    onChange={(e) => { const v = Math.max(1, Math.min(5, Math.floor(Number(e.target.value) || 1))); const mx = Math.max(cvmMax, v); setCvmMin(v); setCvmMax(mx); pushDataPreview(items, v, mx); }}
                    className="h-[32px] w-16 rounded-[6px] border border-[var(--line2)] bg-white px-2 text-center text-[13px] tabular-nums focus:border-[var(--ac)] focus:outline-none" />
                </div>
                <span className="text-[var(--ink4)]">~</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-[var(--ink4)]">최대</span>
                  <input type="number" min={cvmMin} max={5} value={cvmMax}
                    onChange={(e) => { const v = Math.max(cvmMin, Math.min(5, Math.floor(Number(e.target.value) || cvmMin))); setCvmMax(v); pushDataPreview(items, cvmMin, v); }}
                    className="h-[32px] w-16 rounded-[6px] border border-[var(--line2)] bg-white px-2 text-center text-[13px] tabular-nums focus:border-[var(--ac)] focus:outline-none" />
                </div>
                <span className="ml-1 text-[11px] text-[var(--ink4)]">CVM 상한 5</span>
              </div>
              <p className="mt-1.5 text-[11px] text-[var(--ink4)]">고정 <b className="text-[var(--ink3)]">{items.length}</b> + CVM <b className="text-[var(--ink3)]">{cvmMin}~{cvmMax}</b> = 총 <b className="text-[var(--ac)]">{items.length + cvmMin}~{items.length + cvmMax}</b>칸</p>
              <details className="mt-3 rounded-[8px] bg-[var(--th)] px-3 py-2 text-[12px] text-[var(--ink3)]">
                <summary className="cursor-pointer font-semibold">▸ CVM이 주지 않는 것 5가지</summary>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[11px] text-[var(--ink4)]">
                  <li>세그먼트(개별 고객 단위만)</li><li>고객 성향·인사이트(C360·데이터실)</li><li>제휴 콘텐츠(EPC 밖)</li><li>레이아웃·카드 모양(전시 설계)</li><li>문구만 따로 베리에이션</li>
                </ul>
              </details>
            </div>
          )}
        </Sec>
      ) : isProfile ? (
        <Sec n={nFill} title="프로필 카드 — 문구 설정">
          <div className="mb-2 flex items-start gap-1.5 rounded-[8px] bg-[#eef2ff] px-3 py-2 text-[12px] leading-relaxed text-[#2e4fd6]">
            <span className="mt-0.5">ⓘ</span><span><b>고객명·휴대폰 번호·프로필 이미지</b>는 고객 정보로 자동 표시(@cvm)됩니다. 아래 문구만 설정하세요.</span>
          </div>
          <label className="mb-2 block">
            <span className="mb-1 block text-[11px] font-semibold text-[var(--ink3)]">타이틀 <span className="font-normal text-[var(--ink4)]">CornerTitle · 예: 내 정보</span></span>
            <input value={cornerTitleVal} onChange={(e) => { setCornerTitleVal(e.target.value); onPreviewPatch({ mainTitle: e.target.value || 'CornerTitle' }); }} placeholder="예: 내 정보" className="h-[32px] w-full rounded-[6px] border border-[var(--line2)] px-2 text-[13px] focus:border-[var(--ac)] focus:outline-none" />
          </label>
          <label className="mb-2 block">
            <span className="mb-1 block text-[11px] font-semibold text-[var(--ink3)]">서브 타이틀 <span className="font-normal text-[var(--ink4)]">ButtonText · 예: 프로필·가입현황</span></span>
            <input value={buttonTextVal} onChange={(e) => { setButtonTextVal(e.target.value); onPreviewPatch({ subTitle: e.target.value || 'ButtonText' }); }} placeholder="예: 프로필·가입현황" className="h-[32px] w-full rounded-[6px] border border-[var(--line2)] px-2 text-[13px] focus:border-[var(--ac)] focus:outline-none" />
          </label>
          <div className="flex flex-wrap items-center gap-1.5 rounded-[8px] bg-[var(--th)] px-3 py-2 text-[11px] text-[var(--ink3)]">
            <span className="font-semibold">고객 정보 자동</span>
            <span className="rounded-[4px] bg-white px-1.5 py-0.5">프로필 이미지</span>
            <span className="rounded-[4px] bg-white px-1.5 py-0.5">고객명</span>
            <span className="rounded-[4px] bg-white px-1.5 py-0.5">휴대폰 번호</span>
            <span className="text-[var(--ink4)]">— @cvm 바인딩</span>
          </div>
        </Sec>
      ) : (
        <Sec n={nFill} title="요청 — 구좌만 넘김" help>
          <p className="rounded-[8px] bg-[var(--ac2)] px-3 py-2.5 text-[12px] leading-relaxed text-[var(--ink2)]">
            <b className="text-[var(--ac)]">CVM 콘텐츠 연동</b> = 구좌(자리)만 넘깁니다. 이미지·문구·랜딩까지 <b>CVM이 완성본을 내려주고</b> 전시 어드민은 받은 그대로 노출합니다. 별도 요청 범위(③) 설정은 없습니다.
          </p>
        </Sec>
      )}

      {/* ⑥ 출처 — 이 값이 어디서 오나 */}
      <Sec n={nSrc} title="출처 — 이 값이 어디서 오나" help>
        <div className="overflow-hidden rounded-[8px] border border-[var(--line2)] text-[12px]">
          {[
            ['컴포넌트 · 순서', isCvmSrc ? 'CVM' : '운영자 편성'],
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
    // name·layoutDetail도 비교에 포함 — 코너명 수정이 목록 칩에 반영되게(2026-11-05 사용자 요청: 변경 안 되던 버그).
    if (x.templateCornerId !== y.templateCornerId || x.zone !== y.zone || x.recSource !== y.recSource || x.isCvm !== y.isCvm || x.name !== y.name || x.layoutDetail !== y.layoutDetail) return false;
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
                  onFallbackChange={(fb) => { if (selected) onCornersChange((prev) => prev.map((c) => c.templateCornerId === selected.templateCornerId ? { ...c, fallback: fb } : c)); }}
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
  // 상품형 = 가로형/세로형으로 접되, 카테고리형(상단 칩)은 전용 배열로 구분 유지(2026-11-06).
  if (c.cornerType === '상품형') {
    if (/카테고리/.test(raw)) return /세로/.test(raw) ? '세로형(카테고리형)' : '가로형(카테고리형)';
    if (/세로/.test(raw)) return '세로형';
    if (/가로/.test(raw)) return '가로형';
  }
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
                // 카드 본문 클릭 = 미리보기(보기)만, 선택(추가 대상)은 체크박스로 분리 — 다시 보려고 눌러도 선택이 꺼지지 않게(2026-11-10 사용자 요청).
                <div key={c.id} role="button" tabIndex={0} onClick={() => setFocusId(c.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFocusId(c.id); } }}
                  className={cn('flex w-full cursor-pointer items-start gap-2.5 rounded-[10px] border px-3.5 py-3 text-left transition', on ? 'border-[var(--ac)] bg-[var(--ac2)]' : focusId === c.id ? 'border-[var(--line3)] bg-[var(--th)]' : 'border-[var(--line2)] hover:border-[var(--line3)]')}>
                  <button type="button" aria-label="이 코너 선택" onClick={(e) => { e.stopPropagation(); toggle(c.id); setFocusId(c.id); }}
                    className={cn('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border transition', on ? 'border-[var(--ac)] bg-[var(--ac)] text-white' : 'border-[var(--line3)] bg-white hover:border-[var(--ac)]')}>{on && <Check className="h-3 w-3" />}</button>
                  {/* 두 줄 — 위: 배열(레이아웃) 굵게 · 아래: 유형 칩. '껍데기…' 안내문구 제거(2026-11-05 사용자 요청). */}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-bold text-[var(--ink)]">{layoutLabel(c.shell) || c.shell || c.cornerType}</span>
                    <span className="mt-1 flex"><span className={cn(cornerTypeChipClass(c.cornerType), 'shrink-0')}>{c.cornerType}</span></span>
                  </span>
                </div>
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
    // 새 코너 추가 직후엔 refresh로 리스트가 갱신된 다음 프레임에 요소가 생기므로 한 번 더 시도(2026-11-05 사용자 요청: 추가 코너로 포커스).
  }, [activeSel, liveCorners.length]);

  // Figma BO 공통 textfield 토큰 — h38·r6·inset-x 14·본문 14·border #c4c9cf·포커스 border #b3b9c0+ring 2 #dce0e5
  const inputCls = 'h-[38px] w-full rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-[14px] text-[14px] text-[var(--ink)] placeholder:text-[var(--ink5)] focus:border-[var(--focus-border)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]';

  return (
    <ProductCatalogCtx.Provider value={data.catalogByType ?? {}}>
    <div className="relative flex h-full flex-col overflow-hidden rounded-t-[16px] border border-[var(--line2)] bg-white">
      {/* 헤더 + 2열을 한 스크롤 영역에 — 스크롤하면 헤더(타이틀)는 올라가고 디바이스는 sticky로 고정(2026-11-06 사용자 요청: 상품 전시 관리처럼). */}
      <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="px-6 pb-2 pt-4">
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

      {/* 2열 — 좌 디바이스(sticky·뷰포트 높이 유지) · 우 콘텐츠(페이지 스크롤에 함께 흐름). */}
      <div className="grid grid-cols-1 items-start gap-6 px-6 pb-3 pt-1 xl:grid-cols-[clamp(384px,26vw,420px)_minmax(0,1fr)]">
          {/* 좌: 미리보기 — sticky 고정. 하단 푸터(구성 검증 바)와 겹치지 않도록 상단 크롬+푸터 높이를 뺀 높이로(2026-11-09 사용자 요청: 바텀 겹침 금지). 큰 모니터에선 max 캡. */}
          <div className="sticky top-2 flex h-[calc(100vh_-_230px)] max-h-[800px] flex-col">
          {/* 기본 ↔ 폴백 토글 */}
          <div className="mb-3 flex w-full shrink-0 items-center gap-2">
            <div className="flex shrink-0 rounded-[8px] border border-[var(--line2)] bg-[var(--th)] p-0.5 text-[13px] font-semibold">
              <button type="button" onClick={() => setFbMode(false)} className={cn('rounded-[6px] px-5 py-1.5 text-center', !fbMode ? 'bg-white text-[var(--ac)] shadow-sm' : 'text-[var(--ink3)]')}>기본</button>
              <button type="button" onClick={() => setFbMode(true)} className={cn('rounded-[6px] px-5 py-1.5 text-center', fbMode ? 'bg-white text-[#b67a12] shadow-sm' : 'text-[var(--ink3)]')}>폴백</button>
            </div>
            {fbMode && <span title="CVM이 비면 이렇게 노출됩니다 (CVM 수급 코너만 바뀜)" className="flex min-w-0 flex-1 items-center gap-1 text-[11px] text-[#b67a12]"><Layers className="h-3 w-3 shrink-0" /><span className="truncate">CVM 비면 이렇게 노출 (수급 코너만)</span></span>}
          </div>
          {/* 디바이스는 좌측 열(뷰포트 높이) 안에서 fill로 꽉 채워 늘어남 — 바텀 고정·안 잘림(2026-11-06 사용자 요청: 상품 전시 관리처럼). 바디는 내부 스크롤. */}
          <DeviceFrame width={360} bodyHeight={0} fill headerLabel={data.containerName} slim>
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
                          {/* CVM 추천 보충 박스는 'CVM 데이터 연동'일 때만(운영자 편성·콘텐츠 연동은 숨김). 데이터 연동이면 ③ 설정 전에도 기본 3~5로 즉시 표시(2026-11-06 사용자 요청). */}
                          <CornerBlock corner={c.recSource === 'CVM 데이터 연동'
                            ? { ...c.preview, cvmFillCount: (c.preview?.cvmFillCount ?? 0) || 5, cvmFillMin: (c.preview?.cvmFillMin ?? 0) || 3 }
                            : { ...c.preview, cvmFillCount: 0 }} />
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 text-[13px] text-slate-400">코너 구성 시 미리보기가 표시됩니다.</div>
                  )}
          </DeviceFrame>
        </div>

        {/* 우: 기본 정보 + 템플릿 구성 — 페이지 스크롤에 함께 흐른다(디바이스는 sticky). */}
        <div className="space-y-6 pr-1">

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
            {/* 구성 검증 섹션은 우측에서 제외 — 하단 바의 '구성 검증' 버튼으로 일원화(2026-11-06 사용자 요청). */}
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
          <ShieldCheck className="h-3.5 w-3.5" /> {!validation ? '구성 검증' : errCount > 0 ? `구성 검증 · 오류 ${errCount}건` : '구성 검증 완료'}
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
              const created = await addCornersFromTypes(tid, cs.map((c) => c.id));
              router.refresh();
              // 새로 추가한 코너(마지막)로 포커스 — 선택·상세 패널이 그 코너로 이동(2026-11-05 사용자 요청).
              if (created && created.length) {
                const newId = created[created.length - 1];
                setActiveId(tid); setOpenId(tid);
                setSelCorner((m) => ({ ...m, [tid]: newId }));
              }
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


