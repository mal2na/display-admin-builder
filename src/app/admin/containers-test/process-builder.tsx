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
import { addCornersFromTypes, reorderTestCorners, setTestCornerZone, removeCornerFromTemplate, renameCorner, savePersonalSlots } from './actions';
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DeviceFrame, CornerBlock, BannerCard, type PreviewComponent } from '@/components/preview/blocks';
import { BenefitPreviewCard, benefitDesignKey } from '@/components/preview/benefit-card';
import { RecQueryCard } from '@/components/preview/rec-query-card';
import { MainHomeOfferCard } from '@/components/preview/main-home-card';
import { benefitTypes, canPersonalize, sbPreviewSrc } from '@/lib/benefit-corner-types';
import { BenefitCornerPreview } from '@/app/admin/corner-types/benefit-corner-preview';
import { PreviewImage } from '@/components/preview/preview-image';
import { compositionToPreviewCorner } from '@/components/preview/composition-preview';
import { FieldRow } from '@/components/ops-ui';
import { cornerTypeChipClass, layoutLabel, displayLayout, cornerFieldSpec, ZONE_META, ZONE_RANK, type Zone } from '@/lib/display-taxonomy';
import { persoOptionsFor } from '@/lib/personalization-options';
import { PRESET_SHAPE_GROUPS } from '@/lib/preset-shape-groups';
import { presetDesignName } from '@/components/preview/preset-design-card';
import { ChevronLeft, ChevronRight, ChevronDown, GripVertical, X, Plus, Minus, Maximize2, Copy, Pencil, ShieldCheck, EyeOff, Lock, LockOpen, Trash2, Sparkles, UserCog, Search, Link2, Check, ImageIcon, Info, AlertTriangle, Barcode, ArrowRight, LayoutGrid } from 'lucide-react';
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

/* 접이식 섹션 — 번호·제목·상태배지·(?)·접기 토글(모듈 스코프: 상태 유지).
   SB(상품 전시 수정) 섹션 카드 규격: 소프트 보더(line2) · 헤더 → 1px 구분선 → 본문 · 우측 상태배지/토글 슬롯. 2026-11-11. */
function Sec({ n, title, help, hint, badge, aside, children, defaultOpen = true }: { n: number; title: string; help?: boolean; hint?: string; badge?: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-[var(--collapse-r)] border border-[var(--line2)] bg-white">
      <div className="flex items-center gap-2 px-4 py-3">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex min-w-0 flex-1 items-center gap-2">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--ac)] text-[11px] font-bold text-white">{n}</span>
          <h4 className="shrink-0 text-left text-[14px] font-bold text-[var(--ink)]">{title}</h4>
          {/* SB 스타일 설명 힌트 알약 — 섹션이 무엇을 하는지 한 줄(작업자 SB BO-AIM-DSP-PG557). */}
          {hint && <span className="hidden min-w-0 truncate rounded-full bg-[var(--th)] px-2 py-0.5 text-[11px] font-normal text-[var(--ink4)] sm:inline-block">{hint}</span>}
          {badge}
          {help && !hint && <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full border border-[var(--line2)] text-[10px] text-[var(--ink4)]">?</span>}
        </button>
        {aside}
        <button type="button" onClick={() => setOpen((v) => !v)} aria-label={open ? '접기' : '펼치기'} className="shrink-0">
          <ChevronDown className={cn('h-4 w-4 text-[var(--ink4)] transition', !open && '-rotate-90')} />
        </button>
      </div>
      {/* 헤더 아래 구분 보더는 제거하되(2026-11-12), 라벨이 너무 붙지 않게 적당한 상단 여백 유지. */}
      {open && <div className="px-4 pb-4 pt-3">{children}</div>}
    </div>
  );
}

// 코너 카드 폼블록 — '템플릿 기본 정보'(FieldRow) 테이블과 동일 스타일(2026-11-12 사용자 요청: 전 테이블 통일). 좌우 보더 없음.
// 코너 카드 버튼 — 이동 경로 / 열기 방식 선택지(SB PG557 상품형 가로형, 2026-11-17 사용자 요청).
type BtnRoute = '페이지' | '상품' | '프로모션' | '직접 입력';
type BtnOpen = '현재 화면' | '내부 브라우저' | '외부 브라우저';
// 코너 타이틀 최대 글자수 — CN-DSP-0001 정의(최대 36자 · 줄바꿈 포함 25자 권장 · 2줄 이하). 초과 시 경고 토스트.
const TITLE_MAX = 36;
// 코너 유형 표시 라벨 — 코너 유형 관리와 워딩 통일(혜택·오퍼형 → 혜택형, 2026-11-25 사용자 요청).
// 표기: 혜택·오퍼형→혜택형, '업무 진입형'→'업무진입형'(띄어쓰기 제거, 표기만 · 2026-11-26 사용자 요청). 저장값은 그대로.
const cornerTypeLabel = (ct: string | null | undefined) => (ct === '혜택·오퍼형' ? '혜택형' : ct === '업무 진입형' ? '업무진입형' : (ct ?? ''));
// 미리보기 디바이스 프리셋 — 디바이스 선택 드롭다운(SB 디바이스 프레임, 2026-11-17 사용자 요청).
//  최소/최대 폭 = FO 반응형 한계(min 320 · max 768)로 양끝 확인용(2026-11-19 사용자 요청).
const DEVICE_PRESETS = [
  { label: '최소 폭 (min)', w: 320, h: 640 },
  { label: 'iPhone 15 Pro', w: 393, h: 852 },
  { label: 'iPhone SE', w: 375, h: 667 },
  { label: 'Galaxy S24', w: 360, h: 800 },
  { label: 'Pixel 8', w: 412, h: 915 },
  { label: 'iPad mini', w: 744, h: 1133 },
  { label: '최대 폭 (max)', w: 768, h: 1024 },
] as const;
// ── 미팅 2026-11-17 결론 — 코너는 SB 스튜디오 프리셋 → BO FE 코드 개발물(고정). 빌더는 배치·아이템 선택·공통 속성(타이틀·CTA)만 편집한다.
//    코너마다 다른 임의 콘텐츠 속성(배너 이미지·대체텍스트, 카테고리/메뉴 아이콘, 개별 링크, 서브 텍스트)은 상품(EPC) 원장·코너 프리셋이 소유 → 조회 전용.
//    값과 코드는 그대로 두고 상호작용만 잠근다(기획 내부 합의 후 이 플래그만 내리면 원복). 근거: corner-composition-ds-owned, PI-DSP-CMP.
const LOCK_PRESET = true;
const LOCK_HINT = '코너 프리셋·원장이 정의 · 조회 전용 (미팅 2026-11-17)';
// 조회 전용 배지 — 블록 제목 옆 자물쇠 칩.
function LockChip() {
  return <span title={LOCK_HINT} className="inline-flex items-center gap-1 rounded-[4px] bg-[var(--th)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--ink4)]"><Lock className="h-2.5 w-2.5" />조회 전용</span>;
}
// 조회 전용 래퍼 — 자식을 그대로(값 보존) 보여주되 상호작용만 차단하고 톤다운.
function Locked({ on, children }: { on?: boolean; children: React.ReactNode }) {
  if (!on) return <>{children}</>;
  return <div aria-disabled className="pointer-events-none select-none opacity-60">{children}</div>;
}
function FormBlock({ title, desc, locked, children }: { title: string; desc?: string; locked?: boolean; children: React.ReactNode }) {
  // 블록 간 간격·제목 여백을 넉넉히 — 상단 이미지(N)처럼 짧은 블록이 다음 블록(코너 타이틀)에 붙어 보이던 문제(2026-11-25 사용자 요청).
  return (
    <div className="mb-5 last:mb-0">
      <p className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-[var(--ink2)]"><span>{title}{desc && <span className="ml-1 font-normal text-[var(--ink4)]">· {desc}</span>}</span>{locked && <LockChip />}</p>
      <div className="border-t border-[var(--line2)]"><Locked on={locked}>{children}</Locked></div>
    </div>
  );
}
// 라벨-좌(회색 셀) / 컨트롤-우(흰 셀) 테이블 행 — FieldRow와 동일(라벨 bg-th·14/500·ink2·px-4 py-3, 값 px-4 py-2.5, border-b #dce0e5).
function FormRow({ label, en, req, children }: { label: string; en?: string; req?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] items-stretch border-b border-[#dce0e5]">
      <div className="flex flex-col justify-center whitespace-nowrap bg-[var(--th)] px-4 py-3 text-[14px] font-medium text-[var(--ink2)]">
        <span>{label}{req && <span className="text-[var(--bad)]"> *</span>}</span>{en && <span className="text-[10px] font-normal text-[var(--ink4)]">{en}</span>}
      </div>
      <div className="flex min-w-0 flex-col justify-center bg-white px-4 py-2.5">{children}</div>
    </div>
  );
}
// 숫자 스텝퍼 — 노출 개수(최소/최대) 등 작은 정수 입력. −/＋ 버튼으로 범위 내에서 증감.
function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <span className="inline-flex items-center overflow-hidden rounded-[6px] border border-[var(--line2)]">
      <button type="button" aria-label="감소" onClick={dec} disabled={value <= min} className="grid h-[30px] w-7 place-items-center text-[var(--ink3)] hover:bg-[var(--th)] disabled:opacity-30"><Minus className="h-3 w-3" /></button>
      <span className="grid h-[30px] w-8 place-items-center border-x border-[var(--line2)] text-[13px] font-semibold text-[var(--ink)] tabular-nums">{value}</span>
      <button type="button" aria-label="증가" onClick={inc} disabled={value >= max} className="grid h-[30px] w-7 place-items-center text-[var(--ink3)] hover:bg-[var(--th)] disabled:opacity-30"><Plus className="h-3 w-3" /></button>
    </span>
  );
}
// 인터랙티브 라디오 그룹(가로). SB의 ◉Y ○N, ○네이티브 ○상품… 등.
function RadioRow<T extends string>({ options, value, onChange }: { options: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
      {options.map((o) => {
        const on = o === value;
        return (
          <button key={o} type="button" onClick={() => onChange(o)} className="inline-flex items-center gap-1 text-[12px] text-[var(--ink2)]">
            <span className={cn('grid h-3.5 w-3.5 place-items-center rounded-full border', on ? 'border-[var(--ac)] bg-[var(--ac)]' : 'border-[var(--line3)] bg-white')}>{on && <span className="h-1.5 w-1.5 rounded-full bg-white" />}</span>
            {o}
          </button>
        );
      })}
    </div>
  );
}

// 코너 유형 ID — 코너 유형 관리가 부여하는 식별자(CY+7자리). 데모에선 코너 유형명으로 안정적으로 파생.
function cornerTypeDisplayId(cornerType: string): string {
  let h = 0;
  for (let i = 0; i < cornerType.length; i++) h = (h * 31 + cornerType.charCodeAt(i)) % 10000000;
  return 'CY' + String(h).padStart(7, '0');
}

function CornerDetail({ template, corner, index, libCorners, onPreviewFallback, onFallbackChange, onRecSourceChange, onOptionsChange, onPreviewPatch, onToast, onPersonalChange }: {
  template: PTemplate; corner: PCorner | null; index: number; libCorners: LibCorner[]; onPreviewFallback: (on: boolean) => void; onFallbackChange: (fb: '미노출' | '운영자 편성으로 대체') => void; onRecSourceChange: (src: string) => void; onOptionsChange: (opts: Record<string, boolean>, ctaLabel?: string) => void; onPreviewPatch: (patch: Record<string, unknown>) => void; onToast: (m: string) => void; onPersonalChange: (on: boolean) => void;
}) {
  if (!corner) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-[12px] border border-dashed border-[var(--line2)] bg-[var(--th)] px-6 text-center text-[13px] leading-relaxed text-[var(--ink4)]">
        왼쪽에서 코너를 선택하면<br />상세 설정이 여기에 표시됩니다
      </div>
    );
  }
  return <CornerDetailBody key={corner.id} template={template} corner={corner} libCorners={libCorners} onPreviewFallback={onPreviewFallback} onFallbackChange={onFallbackChange} onRecSourceChange={onRecSourceChange} onOptionsChange={onOptionsChange} onPreviewPatch={onPreviewPatch} onToast={onToast} onPersonalChange={onPersonalChange} />;
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
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn('border-b border-[var(--line2)] bg-white last:border-b-0', isDragging && 'relative z-10 opacity-80 shadow-lg')}>
      {children({ setRef: setActivatorNodeRef, props: { ...attributes, ...listeners } })}
    </div>
  );
}

function CornerDetailBody({ template, corner, libCorners, onPreviewFallback, onFallbackChange, onRecSourceChange, onOptionsChange, onPreviewPatch, onToast, onPersonalChange }: { template: PTemplate; corner: PCorner; libCorners: LibCorner[]; onPreviewFallback: (on: boolean) => void; onFallbackChange: (fb: '미노출' | '운영자 편성으로 대체') => void; onRecSourceChange: (src: string) => void; onOptionsChange: (opts: Record<string, boolean>, ctaLabel?: string) => void; onPreviewPatch: (patch: Record<string, unknown>) => void; onToast: (m: string) => void; onPersonalChange: (on: boolean) => void }) {
  // 프로필형(업무 진입형) = 고객 정보(이름·휴대폰 등)라 '무조건 CVM 데이터 연동' 고정(2026-11-05 사용자 요청).
  const layoutDetailStr = corner.layoutDetail ?? corner.layout ?? '';
  const isProfile = corner.cornerType === '업무 진입형' && /프로필/.test(layoutDetailStr);
  // 상태 안내형 = '어떤 상태 카드를 어떤 순서로'는 운영자가 뭉텅이로 편성, 값·보조문구는 런타임 고객 데이터(@cvm). → 운영자 편성 고정(2026-11-05 사용자 요청).
  const isStatus = corner.cornerType === '업무 진입형' && /상태|아이콘.?이미지/.test(layoutDetailStr);
  // 바코드형 = 멤버십 바코드. 값(번호)은 회원 인증 기반 런타임 발급 → 어드민은 라벨·갱신 주기 정책만(2026-11-05 사용자 요청).
  const isBarcode = corner.cornerType === '바코드형';
  // 추천질의형(홈 AI) = 콘텐츠 '불러오기'가 아니라 추천 질의어를 AI로 생성/직접 입력(최대 2개·≤20자). SB [홈]유형(2026-11-25 사용자 요청).
  const isRecQuery = corner.cornerType === '업무 진입형' && /추천\s*질의/.test(`${layoutDetailStr} ${corner.name}`);
  // 퀵메뉴(업무 진입형 카테고리 탭) = 메뉴 아이템 6+6(운영자+추천). 채우는 방식 노출 대상(프로필·상태·바코드·추천질의 제외, 2026-11-25 사용자 요청).
  const isQuickMenu = corner.cornerType === '업무 진입형' && !isProfile && !isStatus && !isRecQuery;
  // 출석체크형·룰렛형 = '무조건 개인화'(2026-11-25 사용자 요청). 운영자 구성 선택 불가 · 자동으로 개인화로 고정.
  const forcePersonal = /(출석체크|룰렛)/.test(corner.name) && corner.canPersonal;
  // 미션형(출석체크·룰렛) = 고정 틀 → 콘텐츠를 조립하지 않고 '운영 중인 미션'에 연결(2026-11-26 사용자 확정 A안). 데모 로컬 상태.
  const isRoulette = /룰렛/.test(corner.name);
  const MISSION_OPTS = isRoulette
    ? ['행운 룰렛 이벤트 (상시)', '매일 룰렛 챌린지', '신규 가입 룰렛']
    : ['출석체크 7일 챌린지', '매일 출석 이벤트', '주말 출석 보너스'];
  const [linkedMission, setLinkedMission] = React.useState<string>('');
  // CN-DSP-0001 — 개인화 코너만 CVM/MLS 추천(맥락 헤더 노출). forcePersonal은 zone 저장 전이라도 개인화로 취급.
  const isPersonal = corner.zone === 'personal' || forcePersonal;
  // 강제 개인화인데 아직 zone이 personal이 아니면(예: 방금 추가) 한 번 저장해 리스트·미리보기에도 반영.
  //  ref 가드 — 저장(비동기)·router.refresh 사이에 zone이 잠깐 비-personal로 돌아와도 재발화하지 않게(2026-11-26 사용자: 룰렛 추가 시 화면 왔다갔다/루프).
  const forcedOnceRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (forcePersonal && corner.zone !== 'personal' && forcedOnceRef.current !== corner.templateCornerId) {
      forcedOnceRef.current = corner.templateCornerId;
      onPersonalChange(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corner.templateCornerId, forcePersonal, corner.zone]);
  const [srcState, setSrc] = React.useState<string>(corner.recSource ?? '운영자 편성');
  // 프로필형·상태 안내형 = 'CVM 추천'이 아니라 '고객정보 바인딩(@cvm:key)'. 무엇을 노출할지는 운영자가 정하고 값만 런타임 고객 데이터로 자동.
  //  바코드형도 추천 대상이 아니라 시스템 카드(런타임 발급) → 모두 운영자 편성 고정(CVM 추천 잠금). (2026-11-05 사용자 확정)
  //  운영/픽스 영역(비개인화)도 운영자 편성 고정 — ② 수급 방식은 개인화 영역에서만 의미(2026-11-25 사용자 요청).
  const src = (isProfile || isStatus || isBarcode || !isPersonal) ? '운영자 편성' : srcState;
  const srcLocked = isProfile || isStatus || isBarcode;
  // 개인화 구성(2026-11-25 통화 결론) — 개인화 코너는 '추천 후보 코너 유형'을 여러 개 등록하고, 추천 엔진이 노출 개수(최소~최대, 1~3)만큼 골라 노출(없으면 미노출). 데모 로컬 상태.
  const [persoTypes, setPersoTypes] = React.useState<string[]>([]);
  // 개인화 옵션(대분류) 복수 선택 상태 — 옵션 목록(persoOpts)은 benefitMidKey 확정 후 아래에서 계산.
  const [persoCats, setPersoCats] = React.useState<string[]>([]);
  const togglePersoCat = (c: string) => setPersoCats((a) => (a.includes(c) ? a.filter((x) => x !== c) : [...a, c]));
  const [persoMin, setPersoMin] = React.useState(1);
  const [persoMax, setPersoMax] = React.useState(3);
  const [persoPickerOpen, setPersoPickerOpen] = React.useState(false);
  const BENEFIT_TYPE_LIST = React.useMemo(() => benefitTypes(), []);
  // 채우는 방식(2026-11-25 사용자 요청: '개인화 클릭'을 없애고 콘텐츠 채우기 안의 선택지로 통합).
  //  운영자 직접 / 운영자 고정+추천(혼합) / 전부 추천(후보 여러 개). '추천' 계열 = isPersonal.
  const FILL_MODES = ['운영자 직접', '운영자 고정 + 추천', '전부 추천'] as const;
  // 표시명(2026-11-26 회의) — 저장값은 유지, 라벨만 명확화: '운영자 고정 + 추천' → '코너 고정 · 콘텐츠 추천'(코너 하나 고정 후 콘텐츠 일부 입력+나머지 추천).
  const FILL_MODE_LABEL: Record<string, string> = { '운영자 직접': '운영자 직접', '운영자 고정 + 추천': '코너 고정 · 콘텐츠 추천', '전부 추천': '전부 추천' };
  // ③ 섹션 타이틀 = ② 채우는 방식에서 고른 라벨과 동일하게(2026-11-26 사용자 요청). ② 라디오 라벨과 일치.
  const FILL_MODE_SEC_TITLE: Record<string, string> = { '운영자 직접': '운영자 편성', '운영자 고정 + 추천': '운영자 편성 + 추천', '전부 추천': '구좌 전체 추천' };
  const [fillMode, setFillMode] = React.useState<string>(() => (corner.zone === 'personal' || (/(출석체크|룰렛)/.test(corner.name) && corner.canPersonal)) ? '전부 추천' : '운영자 직접');
  // 채우는 방식(fillMode) → 수급(recSource) 매핑. ② 라디오 선택이 코너 recSource에 반영돼야 미리보기가 'CVM 구좌'로 바뀐다(2026-11-26 사용자 요청: 개인화면 뚫린 구좌).
  const FILL_TO_REC: Record<string, string> = { '운영자 직접': '운영자 편성', '운영자 고정 + 추천': 'CVM 데이터 연동', '전부 추천': 'CVM 콘텐츠 연동' };
  const pickFillMode = (m: string) => { setFillMode(m); onPersonalChange(m !== '운영자 직접'); const rec = FILL_TO_REC[m] ?? '운영자 편성'; setSrc(rec); onRecSourceChange(rec); };
  const RQ_SAMPLES = ['이번 달 통신비 아끼는 법', '지금 받을 수 있는 혜택은?', '내게 맞는 요금제 추천받기', '로밍 저렴하게 쓰는 법', '데이터 선물하는 방법', '멤버십 등급 올리는 법', '남은 데이터 확인하기', '가족 결합 할인 알아보기', '기기 할부금 조회하기', '요금제 바로 변경하기', 'T멤버십 쿠폰 받기', '오늘의 맞춤 혜택 보기', '해외 데이터 로밍 신청', '소액결제 한도 변경', '유독(구독) 추천받기', '약정 만료일 확인', '포인트 적립 내역 보기', '단말기 보험 가입 확인', '자동이체 할인 신청', 'VIP 전용 혜택 보기'];
  const RQ_MAX = 20;      // 등록 풀 상한(운영자가 여기까지 추가 가능).
  const RQ_SEED = 10;     // 기본 채움 개수(2026-11-26 사용자: 20개 말고 10개만 우선).
  // 추천 질의어 — 코너 컴포넌트(선택형) TEXT 아톰에서 초기값. 적게 저장돼 있으면 기본 10개로 채워 '개인 맞춤 운영'을 보여준다.
  const [rqList, setRqList] = React.useState<string[]>(() => {
    const qs = (corner.preview?.components ?? []).flatMap((c) => c.atoms ?? []).filter((a) => a.atomType === 'TEXT').map((a) => a.content ?? '').filter(Boolean);
    return qs.length > 2 ? qs.slice(0, RQ_MAX) : RQ_SAMPLES.slice(0, RQ_SEED);
  });
  const [rqMin, setRqMin] = React.useState(1); // FO 노출 개수(최소~최대) — 개인화가 고객마다 이 범위로 노출.
  const [rqMax, setRqMax] = React.useState(2);
  // 추천 질의어 → 미리보기(RecQueryCard) 동기화: 선택형 컴포넌트의 TEXT 아톰으로 반영.
  const syncRecQuery = (list: string[]) => {
    const atoms = list.filter((q) => q.trim()).map((q, i) => ({ id: `rq-${i}`, name: `질의어${i + 1}`, atomType: 'TEXT', content: q, imageUrl: null, altText: null, linkUrl: null }));
    onPreviewPatch({ components: [{ id: 'rq-comp', name: '추천 질의어', componentType: '선택형', atoms }] });
  };
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
  const [nameVal, setNameVal] = React.useState(corner.name);
  const [editingName, setEditingName] = React.useState(false); // 코너명 — '수정' 누르기 전엔 읽기 전용(2026-11-25 사용자 요청)
  // 코너명 저장 — 실제 DB 반영(2026-11-05 사용자 요청: 수정이 안 되던 데모 → 실제 저장).
  const saveName = async () => {
    // 비우고 완료하면 기본 배열명(세로형 등)으로 되돌린다(2026-11-05 사용자 요청: 다 지우고 완료 → 기존 배열명).
    const fallback = layoutLabel(corner.layoutDetail ?? corner.layout ?? '') || corner.layoutDetail || corner.layout || corner.cornerType;
    const n = nameVal.trim() || fallback;
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
  //  운영/픽스 영역(비개인화)은 ② 수급 선택을 숨기므로 콘텐츠 설정이 ②로 당겨진다(2026-11-25 사용자 요청).
  // nFillSec·nFallback은 showFillMode 확정 후 아래에서 정의(채우는 방식 ② 유무에 따라 번호 이동).
  // '채우기 → 불러오기' — 유형별 카탈로그(상품형=상품, 혜택·오퍼형=혜택)에서 멀티 셀렉으로 담는다(2026-10-28 사용자 요청).
  const catalogByType = React.useContext(ProductCatalogCtx);
  // 혜택형 코너는 '불러오기' 시 그 코너의 중분류 구좌만 뜨게 한다(2026-11-25 사용자 요청: 이벤트면 이벤트 구좌, 미션은 미션, 제휴사면 브랜드).
  //  중분류는 코너명 앞 토막('이벤트형 · 리스트형' → '이벤트형')에서 파생.
  const benefitMidKey = (() => {
    if (corner.cornerType !== '혜택형' && corner.cornerType !== '혜택·오퍼형') return null;
    const seg = (corner.name.split('·')[0] ?? '').trim();
    return /형$/.test(seg) ? seg : null;
  })();
  // 개인화 옵션(대분류) — 코너 중분류에 맞는 시트 분류(SKT NC_정보 분류, 2026-11-26). 대분류만 복수 선택.
  const persoOpts = persoOptionsFor(benefitMidKey);
  // 상태 안내형(업무 진입형)은 '상태 카드' 전용 카탈로그에서 가져온다 — 메뉴 카탈로그와 구분(2026-11-05 사용자 요청).
  const catalog = (isStatus ? catalogByType['상태 안내형'] : isProfile ? catalogByType['프로필형']
    : (benefitMidKey ? catalogByType['혜택형·' + benefitMidKey] : undefined) ?? catalogByType[corner.cornerType]) ?? [];
  const canLoad = catalog.length > 0;
  // 옵션(배너·칩·CTA) — 코너 유형이 허용하는 옵션을 빌더에서 On/Off 설정(2026-10-28 사용자: "배너·칩·CTA는 옵션, 여기서 설정").
  const optSpec = cornerFieldSpec(corner.cornerType, corner.layoutDetail ?? corner.layout);
  const availOptions = optSpec?.options ?? [];
  const rawDetail = corner.layoutDetail ?? corner.layout ?? '';
  // 옵션 토글은 코너의 '실제 미리보기 상태'에서 시작한다(2026-11-05 사용자 요청: 옵션 꺼져 있는데 전체보기 나오는 불일치 수정).
  //  CTA=moreButtonUse / 배너=bigBanner / 칩=선택형 컴포넌트 유무. 토글을 끄면 applyOptsToPreview로 미리보기도 함께 꺼진다.
  const pv = corner.preview;
  const hasChipComp = !!pv?.components?.some((c) => c.componentType === '선택형');
  // 불러올 때 '풀 패키지' — 유형 미리보기(전 요소 ON)와 맞춰 모든 옵션(배너·칩·CTA)을 기본 ON으로 로드(2026-11-26 사용자 요청: 불러올 때 꺼져 있어 불일치/에러처럼 보임). 운영자가 필요 시 끈다.
  const [optOn, setOptOn] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(availOptions.map((o) => [o, true])));
  void rawDetail; void hasChipComp; // (풀 패키지 로드로 더 이상 조건 분기 안 함 — 참조 보존)
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
  // 바코드 유형 — 일반 바코드 / 매직 바코드(SB BO-AIM-DSP-PG557 코너 레이아웃). 데모 로컬 상태.
  // 바코드 3종(2026-11-26 회의): 통합(상시)·매직·쿠폰(일회용) 중 택1. 멤버십 바코드=원타임(런타임 발급).
  const [barcodeKind, setBarcodeKind] = React.useState<'통합 바코드' | '매직 바코드' | '쿠폰 바코드'>('통합 바코드');
  // 버튼 텍스트(ButtonText) = 미리보기의 '서브 타이틀'(타이틀 아래 보조 문구, 예: T 영화예매). CTA(전체보기)와는 별개(2026-11-05 사용자 요청).
  const [buttonTextVal, setButtonTextVal] = React.useState(() => (pv?.subTitle && pv.subTitle !== 'ButtonText' ? pv.subTitle : ''));
  // CTA 라벨(전체보기 등) = 하단 더보기 버튼. CTA 옵션을 켤 때만 입력, 버튼 텍스트와 별개(2026-11-05 사용자 요청).
  const [ctaLabelVal, setCtaLabelVal] = React.useState(() => (pv?.moreButtonLabel && pv.moreButtonLabel !== 'CTA' ? pv.moreButtonLabel : ''));
  // CTA 링크 — 문구와 별도 입력(2026-11-05 사용자 요청: 인풋 두 개).
  const [ctaLinkVal, setCtaLinkVal] = React.useState(() => ((pv as { moreButtonLink?: string | null } | undefined)?.moreButtonLink ?? ''));
  // SB(BO-AIM-DSP-PG557) 코너 카드 버튼 — 이동 경로(페이지·상품·프로모션·직접 입력) / 열기 방식(현재 화면·내부·외부 브라우저). 데모 로컬 상태(미리보기 비연동 필드, 2026-11-17 사용자 SB).
  // 서브 CTA(상단 CTA) — 코너 타이틀 옆 CTA. 하단 CTA와 함께 'CTA 2개' 케이스(카테고리형 한정, 2026-11-17 사용자 요청). 버튼 텍스트 = buttonTextVal 공용.
  const [subCtaOn, setSubCtaOn] = React.useState(true); // 서브 CTA 기본 Y(2026-11-25 사용자 요청)
  const [txtRoute, setTxtRoute] = React.useState<BtnRoute>('페이지');
  const [txtOpen, setTxtOpen] = React.useState<BtnOpen>('현재 화면');
  const [txtLink, setTxtLink] = React.useState('');
  // 하단 CTA 버튼
  const [btnRoute, setBtnRoute] = React.useState<BtnRoute>('페이지');
  const [btnOpen, setBtnOpen] = React.useState<BtnOpen>('현재 화면');
  // CN-DSP-0001 정의(2026-11-25) — 추천 맥락 헤더(개인화 전용)·추가 인포메이션(수동 전용)·인디케이터. 모두 기본 N.
  const [ctxHeaderOn, setCtxHeaderOn] = React.useState(true);      // [추천 맥락 헤더] 기본 ON(풀 패키지, 2026-11-26) — 개인화 코너에서만 적용
  const [ctxHeaderText, setCtxHeaderText] = React.useState('');    // 추천 맥락 헤더 문구(없으면 플레이스홀더)
  const [infoOn, setInfoOn] = React.useState(true);                // [추가 인포메이션] 기본 ON(풀 패키지, 2026-11-26) — 수동 운영에서만 적용
  const [infoText, setInfoText] = React.useState('');              // 추가 인포메이션 문구
  // 인디케이터(스와이프) 제외 — 리스트 타입은 좌우 스와이프 탐색이 없어 효용 낮고 접근성 이슈(2026-11-25 임태은/SKT 확정, Slack). 전 코너에서 삭제.
  // ③채우기를 '코너 | 아이템' 탭으로 나눠 등록(2026-11-05 사용자 요청). 코너 속성이 없는 유형(배너형 등)은 아이템만.
  const [fillTab, setFillTab] = React.useState<'코너' | '아이템'>('코너');
  // 칩(카테고리 탭) — 실제로 '불러온 카테고리'만 저장. 나머지 빈 자리는 점선 'Chip' 플레이스홀더로 표시, 불러오기로 채우면 반영(2026-11-05 사용자 요청).
  //  placeholder(Chip/전체/카테고리 등 필드코드)는 실제 칩이 아니므로 제외하고, 미리보기 선택형 아톰의 '진짜 카테고리'만 초기값으로.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chipComp0 = (pv?.components ?? []).find((c: any) => c.componentType === '선택형');
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
  // SB 배너 설정 — 이미지 소스 선택(배너 캠페인/DS 포탈/로컬). 기본=로컬(PC).
  const [bannerSource, setBannerSource] = React.useState<'배너 캠페인' | 'DS 포탈' | '로컬(PC)'>('로컬(PC)');
  // 배너 설정 '이미지' 클릭 → 소재 선택 모달(2026-11-12 사용자 요청: 이미지 클릭하면 모달).
  const [bannerImgModal, setBannerImgModal] = React.useState(false);
  // 배너 소재 불러오기 — 소스별 분기(2026-11-16 사용자 요청): 로컬(PC)은 OS 파일 선택창, 배너 캠페인/DS 포탈은 소재 선택 모달.
  const bannerFileRef = React.useRef<HTMLInputElement | null>(null);
  const openBannerPicker = () => { if (bannerSource === '로컬(PC)') bannerFileRef.current?.click(); else setBannerImgModal(true); };
  const onBannerFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const url = URL.createObjectURL(f);
    setBannerImg(url); setBannerFileName(f.name); onPreviewPatch({ bannerImageUrl: url }); onToast(`로컬 이미지 ‘${f.name}’ 적용`);
    e.target.value = '';
  };
  // 배너 — 업로드 파일명 캡션 + 대체텍스트(alt). 이미지/아이콘 대체텍스트 필수(PI-DSP-CMP-004). SB PG557(2026-11-17 사용자 요청).
  const [bannerFileName, setBannerFileName] = React.useState('');
  const [bannerAlt, setBannerAlt] = React.useState('');
  // 카테고리 설정(상품형·혜택 카테고리형) — 카테고리별 메뉴 메타(아이콘·링크·이동경로·열기방식). SB PG557 '카테고리 설정' 테이블(2026-11-17 사용자 요청).
  const [catOn, setCatOn] = React.useState(true); // 카테고리 설정 기본 ON(풀 패키지 로드, 2026-11-26 사용자 요청: 불러올 때 유형 미리보기와 일치)
  type CatMeta = { icon: string | null; link: string; linkType: 'internal' | 'external'; mode: 'direct' | 'load' };
  const [catMeta, setCatMeta] = React.useState<Record<string, CatMeta>>({});
  const [catIconFor, setCatIconFor] = React.useState<string | null>(null);
  const catMetaOf = (c: string): CatMeta => catMeta[c] ?? { icon: null, link: '', linkType: 'internal', mode: 'direct' };
  const patchCat = (c: string, patch: Partial<CatMeta>) => setCatMeta((m) => ({ ...m, [c]: { ...catMetaOf(c), ...patch } }));
  // 카테고리형(상품형·혜택·오퍼형 세로형/가로형(카테고리형)) — 상단 카테고리 칩 + 카테고리별 컴포넌트 리스트(2026-11-06 사용자 요청).
  const isCategory = (corner.cornerType === '상품형' || corner.cornerType === '혜택·오퍼형') && /카테고리형|칩|카테고리/.test(corner.layoutDetail ?? corner.layout ?? '');
  // 마운트 1회 — 토글 기본값(모두 N)을 미리보기에 반영해 '우측 N → 좌측 숨김'(2026-11-25). + 개인화/수동 분기(추천 맥락 헤더 vs 추가 인포메이션).
  const didSyncRef = React.useRef(false);
  React.useEffect(() => {
    if (didSyncRef.current) return;
    didSyncRef.current = true;
    const opts: Record<string, boolean> = { ...optOn };
    if (isCategory || availOptions.includes('칩')) opts['칩'] = catOn; // 카테고리 설정(catOn)에 칩 노출 동기화 — off면 칩 제거(2026-11-25 사용자 요청)
    onOptionsChange(opts, ctaLabelVal);
    const patch: Record<string, unknown> = {
      contextHeader: isPersonal ? ctxHeaderOn : false,
      information: isPersonal ? false : infoOn,
    };
    if (isCategory && !subCtaOn) patch.subTitle = null;
    onPreviewPatch(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // ③ 채우기 항목 — 칩/카테고리 On 이면 카테고리마다 별도 리스트(카테고리별 컴포넌트 연동). 아니면 단일 리스트(__flat__).
  //  카테고리 '사용 여부'(catOn)=N이면 카테고리 구분 자체가 없으므로 단일 리스트로(2026-11-25 사용자 요청: N이면 아예 안 떠야).
  const chipMode = ((!!optOn['칩'] || isCategory) && chips.length > 0 && catOn);
  const [activeChip, setActiveChip] = React.useState(0);
  const chipIdx = Math.min(activeChip, Math.max(0, chips.length - 1));
  const chipKey = chipMode ? `${isCategory ? 'cat' : 'chip'}:${chips[chipIdx] ?? chipIdx}` : '__flat__';
  // 불러오기 전용(직접입력 없음) 유형 — 콘텐츠 안내형(영화) · 혜택·오퍼형 세로형(제휴 혜택). 이미지+텍스트+보조값을 한 번에 불러온다(2026-11-05 사용자 요청).
  const detailStr = corner.layoutDetail ?? corner.layout ?? '';
  const isBenefitList = (corner.cornerType === '혜택·오퍼형' || corner.cornerType === '혜택형') && /세로/.test(detailStr);
  const isBenefitType = corner.cornerType === '혜택·오퍼형' || corner.cornerType === '혜택형';
  // 채우는 방식(운영자 직접/운영자 고정+추천/전부 추천) 노출 대상 — 혜택형 + 퀵메뉴(업무 진입형 카테고리 탭). 후보 코너 유형은 혜택형만(2026-11-25 사용자 요청).
  const showFillMode = isBenefitType || isQuickMenu;
  // 섹션 번호(2026-11-26 사용자 요청: 채우는 방식 ② / 채우기 ③ 분리) — 채우는 방식(②)이 있으면 채우기=③·폴백=④, 없으면(프로필·CVM 등) 채우기=②·폴백=③.
  const nFillSec = showFillMode ? 3 : 2;
  const nFallback = showFillMode ? 4 : 3;
  // 배너형 = '배너 캠페인 관리'에서 가져오기 전용(직접 입력 없음). 가져오기 버튼으로 등록된 배너를 담는다(2026-11-05 사용자 요청).
  const isBanner = corner.cornerType === '배너형';
  // 상품형 = 컴포넌트(아이템) 테이블을 가격 규격 컬럼으로(No·이미지·타이틀·할인율·가격·기간·서브 텍스트·경로 상세·상품 조회·삭제). 할인율/가격/기간은 상품(EPC) 원장 값(상품 조회) — 데모는 플레이스홀더. SB PG557(2026-11-17 사용자 요청).
  const isProduct = corner.cornerType === '상품형';
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
    // 배너형 — '깡통(껍데기) 불러오기'라 ③ 콘텐츠 설정은 비어서 시작한다(2026-11-19 사용자 요청). 배너 소재는 '배너 캠페인'에서 등록하고,
    //  운영자가 '배너 불러오기/조회'로 직접 담는다(미팅 2026-11-17: 배너 이미지·링크는 조회 전용, 어드민은 선택만). 처음부터 데이터가 차 있으면 안 됨.
    if (isBanner) return [];
    // 혜택형도 '껍데기(깡통) 불러오기' — ③ 컴포넌트는 비워서 시작하고, 운영자가 '등록된 혜택에서 불러오기'(모달)로 직접 담는다(2026-11-26 사용자 요청: 껍데기인데 컴포넌트가 다 차있는 게 이상). 카테고리형(칩 기반)은 제외.
    if (isBenefitType && !isCategory) return [];
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

  const cornerTypeId = cornerTypeDisplayId(corner.cornerType);

  return (
    <div className="space-y-3">

      {/* ① 코너 정보 — 코너명만 편집, 유형·레이아웃·개수는 코너 유형 관리에서 불러온 껍데기. 기본 접힘(2026-11-25 사용자 요청). */}
      <Sec n={1} title="코너 기본 정보" defaultOpen={false}>
        {/* 코너 유형 정보 — '템플릿 기본 정보'(FieldRow)와 동일 테이블. SB(BO-AIM-DSP-PG557): 유형·배열 위 / ID·코너명 아래(2026-11-16 재정렬). 좌우 보더 없음. 행 높이 48px([&>div]:h-12). */}
        <p className="mb-2 text-[13px] font-bold text-[var(--ink)]">코너 유형 정보</p>
        <div className="text-[14px] [&>div]:h-12">
          {/* row1: 코너 유형 | 배열·레이아웃 */}
          <div className="grid grid-cols-[120px_minmax(0,1fr)_120px_minmax(0,1fr)] items-stretch border-b border-[#dce0e5]">
            <div className="flex items-center whitespace-nowrap bg-[var(--th)] px-4 py-3 font-medium text-[var(--ink2)]">코너 유형</div>
            <div className="flex min-w-0 items-center border-r border-[#dce0e5] bg-white px-4 py-2.5"><span className={cornerTypeChipClass(cornerTypeLabel(corner.cornerType))}>{cornerTypeLabel(corner.cornerType)}</span></div>
            <div className="flex items-center whitespace-nowrap bg-[var(--th)] px-4 py-3 font-medium text-[var(--ink2)]">배열·레이아웃</div>
            <div className="flex min-w-0 items-center bg-white px-4 py-2.5 text-[13px] text-[var(--ink)]">{cornerLayoutText(corner.cornerType, corner.layout, corner.layoutDetail) || '—'}</div>
          </div>
          {/* row2: 코너 유형 ID(읽기전용) | 코너명(입력·X로 비움, blur 저장). 리터럴 div로 직접 렌더 — IME 유지. */}
          <div className="grid grid-cols-[120px_minmax(0,1fr)_120px_minmax(0,1fr)] items-stretch border-b border-[#dce0e5]">
            <div className="flex items-center whitespace-nowrap bg-[var(--th)] px-4 py-3 font-medium text-[var(--ink2)]">코너 유형 ID</div>
            <div className="flex min-w-0 items-center border-r border-[#dce0e5] bg-white px-4 py-2.5 font-mono text-[12px] text-[var(--ink3)]">{cornerTypeId}</div>
            <div className="flex items-center whitespace-nowrap bg-[var(--th)] px-4 py-3 font-medium text-[var(--ink2)]">코너명</div>
            <div className="flex min-w-0 items-center gap-2 bg-white px-4 py-0">
              {editingName ? (
                <div className="relative w-full">
                  <input autoFocus value={nameVal} onChange={(e) => setNameVal(e.target.value)} onBlur={() => { setEditingName(false); saveName(); }} placeholder="코너명 입력"
                    className="h-[34px] w-full rounded-[6px] border border-[var(--line3)] pl-2.5 pr-8 text-[13px] focus:border-[var(--ac)] focus:outline-none" />
                  {nameVal && <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setNameVal('')} title="지우기"
                    className="absolute right-2 top-1/2 grid h-4 w-4 -translate-y-1/2 place-items-center rounded-full bg-[var(--line3)] text-white hover:bg-[var(--ink4)]"><X className="h-2.5 w-2.5" /></button>}
                </div>
              ) : (<>
                <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--ink)]">{nameVal || '—'}</span>
                <button type="button" onClick={() => setEditingName(true)} className="shrink-0 rounded-[6px] border border-[var(--line3)] px-2.5 py-1 text-[12px] font-semibold text-[var(--ink2)] hover:border-[var(--ac)] hover:text-[var(--ac)]">수정</button>
              </>)}
            </div>
          </div>
        </div>
        {/* 코너 속성 — 회색 라벨 셀 테이블 + 알약 칩(옵션=보라, 고정=회색). 좌우 보더 없음. SB 사용자 목업(2026-11-12). */}
        {(() => {
          const spec = cornerFieldSpec(corner.cornerType, corner.layoutDetail ?? corner.layout);
          if (!spec) return null;
          const cornerFixed = spec.required.filter((f) => f.group === 'corner');
          const itemFixed = spec.required.filter((f) => f.group === 'item');
          const itemOpt = (spec.optional ?? []).filter((f) => f.group === 'item');
          const isGaro = /가로/.test(corner.layoutDetail ?? corner.layout ?? '');
          type Tok = { label: string; opt?: boolean };
          const cornerTokens: Tok[] = [
            ...spec.options.map((o) => ({ label: o, opt: true })),
            ...cornerFixed.map((f) => ({ label: f.ko })),
          ];
          const itemTokens: Tok[] = [
            ...(isGaro ? [{ label: '형태', opt: true }] : []),
            ...itemFixed.map((f) => ({ label: f.ko })),
            ...itemOpt.map((f) => ({ label: f.ko, opt: true })),
          ];
          {/* 칩 UI 대신 그냥 텍스트로(2026-11-19 사용자 요청) — 옵션은 보라, 고정은 기본색, 중점(·)으로 구분. */}
          const AttrRow = ({ label, toks, desc }: { label: string; toks: Tok[]; desc: string }) => (
            <div className="grid grid-cols-[120px_minmax(0,1fr)] items-stretch border-b border-[#dce0e5]">
              <div className="flex items-center gap-1 whitespace-nowrap bg-[var(--th)] px-4 py-3 text-[14px] font-medium text-[var(--ink2)]">{label}<Tip text={desc} /></div>
              <div className="min-w-0 bg-white px-4 py-3 text-[14px] leading-relaxed">
                {toks.map((t, i) => (
                  <span key={i}>
                    {i > 0 && <span className="px-1.5 text-[var(--ink4)]">·</span>}
                    <span className={t.opt ? 'font-medium text-[var(--ac)]' : 'text-[var(--ink)]'}>{t.label}</span>
                  </span>
                ))}
              </div>
            </div>
          );
          const hasCorner = cornerTokens.length > 0;
          const hasItem = itemTokens.length > 0;
          if (!hasCorner && !hasItem) return null;
          return (
            <>
              <p className="mb-2 mt-4 text-[13px] font-bold text-[var(--ink)]">코너 속성</p>
              <div className="border-t border-[var(--line2)]">
                {hasCorner && <AttrRow label="코너(카드)" toks={cornerTokens} desc="현재 선택한 코너유형의 레이아웃 옵션과 선택된 옵션을 표시합니다" />}
                {hasItem && <AttrRow label="컴포넌트(요소)" toks={itemTokens} desc="현재 선택한 코너유형의 컴포넌트(요소)와 선택된 컴포넌트(요소)를 표시합니다" />}
              </div>
            </>
          );
        })()}
      </Sec>

      {/* ② 개인화 구성은 아래 '코너 콘텐츠 설정' 섹션 안으로 이동(2026-11-25 사용자 요청: 구성 방식이 코너 콘텐츠 설정으로 들어가야 함). */}

      {/* ② 채우는 방식 — 콘텐츠를 누가·어떻게 채우는지. 채우기(③)·폴백(④)과 분리(2026-11-26 사용자 요청: AS-IS 구조). */}
      {showFillMode && (
        <Sec n={2} title="채우는 방식" hint="콘텐츠를 누가·어떻게 채우는지 고릅니다">
          {/* AS-IS(node 29268-74688) '코너 콘텐츠 구성 방식' 라디오 카드 — 수급 3종 + CVM/운영자 소유 분담(2026-11-26 사용자 요청). 내부 fillMode는 매핑 유지. */}
          <div className="space-y-1.5 pb-1">
            {([
              // 표시 워딩 — 'CVM' 단어를 빼고 '추천'으로(추천 출처가 CVM만은 아닐 수 있음). 저장 recSource(method) 키는 유지(2026-11-26 사용자 요청).
              //  ① 운영자 편성 ② 운영자 편성 + 추천(일부 고정·나머지 추천) ③ 구좌 전체 추천(자리째 추천에 위임).
              { method: '운영자 편성', mode: '운영자 직접', label: '운영자 편성', personalized: false,
                sub: '운영자가 노출 항목과 순서를 직접 설정해요', who: '운영자 · 전체', rec: '추천 · 없음' },
              { method: 'CVM 데이터 연동', mode: '운영자 고정 + 추천', label: '운영자 편성 + 추천', personalized: true,
                sub: '운영자가 일부 자리를 고정하고, 나머지 자리는 추천이 고객마다 채워요', who: '운영자 · 일부 고정', rec: '추천 · 나머지 자리' },
              { method: 'CVM 콘텐츠 연동', mode: '전부 추천', label: '구좌 전체 추천', personalized: true,
                sub: '구좌 자체를 추천에 맡겨요 — 이미지·문구·랜딩까지 추천이 고객마다 채워요', who: '운영자 · 구좌만', rec: '추천 · 전체' },
            ] as const).map(({ method, mode, label, personalized, sub, who, rec }) => {
              const on = fillMode === mode;
              const blocked = (!corner.canPersonal && mode !== '운영자 직접') || (forcePersonal && mode === '운영자 직접');
              return (
                // 컴팩트 2줄 — 라디오+라벨+배지+분담(1줄) / 설명(1줄). 높이 최소화(2026-11-26 사용자 요청: 영역 과다 차지).
                <button key={method} type="button" disabled={blocked} onClick={() => { if (!blocked) pickFillMode(mode); }}
                  className={cn('flex w-full items-center gap-2.5 rounded-[9px] border px-3 py-2 text-left transition', on ? 'border-[#6D28D9] bg-[#faf7ff]' : 'border-[var(--line2)] bg-white hover:border-[#c9b8ec]', blocked && 'cursor-not-allowed opacity-40')}>
                  <span className={cn('grid h-4 w-4 shrink-0 place-items-center rounded-full border', on ? 'border-[#6D28D9]' : 'border-[var(--line3)]')}>{on && <span className="h-2 w-2 rounded-full bg-[#6D28D9]" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <b className="shrink-0 text-[13px] text-[var(--ink)]">{label}</b>
                      <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold', personalized ? 'bg-[#F2ECFB] text-[#6D28D9]' : 'bg-[#eef0f2] text-[var(--ink3)]')}>{personalized ? '개인화' : '모두 같음'}</span>
                      <span className="ml-auto hidden shrink-0 items-center gap-1 text-[10.5px] font-semibold text-[var(--ink4)] sm:flex">{who}<span className="text-[var(--line3)]">·</span>{rec}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[11.5px] text-[var(--ink3)]">{sub}</span>
                  </span>
                </button>
              );
            })}
            {forcePersonal && <p className="mt-1 text-[11px] text-[#6D28D9]">· 출석체크·룰렛형은 개인화 전용입니다(운영자 편성 불가).</p>}
          </div>
        </Sec>
      )}

      {/* ③ 채우기 — 선택한 방식으로 노출할 데이터를 설정. 대체 노출(폴백)은 ④로 아래에. */}
      {(src === '운영자 편성' || (isData && !isProfile) || fillForFallback) ? (
        <Sec n={nFillSec} title={fillForFallback ? '대체 항목 (추천이 비면 노출)' : (FILL_MODE_SEC_TITLE[fillMode] ?? '채우기')} hint="노출할 데이터를 설정합니다">

          {/* ── 미션 연결(출석체크·룰렛) — 고정 틀이라 콘텐츠를 조립하지 않고 운영 중인 미션에 '연결'(2026-11-26 A안). 콘텐츠·보상은 연결된 미션에서 내려오고, 개인화는 CVM이 고객별로 채움. ── */}
          {forcePersonal && (
          <div className="mb-4 rounded-[10px] border border-[#e8ddff] bg-[#faf9ff] p-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold text-[#6D28D9]"><Link2 className="h-3.5 w-3.5" /> 연결할 미션</p>
            <p className="mb-2.5 text-[11px] leading-relaxed text-[var(--ink4)]">{isRoulette ? '룰렛' : '출석체크'}형은 고정 틀이라 콘텐츠를 직접 담지 않고 <b className="text-[#6D28D9]">운영 중인 미션에 연결</b>합니다. 보상·진행은 연결된 미션에서, 노출 대상은 개인화(CVM)가 고객별로 정합니다.</p>
            <div className="relative">
              <select value={linkedMission} onChange={(e) => setLinkedMission(e.target.value)}
                className="h-[38px] w-full appearance-none rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-3 pr-9 text-[13px] text-[var(--ink)] focus:border-[var(--ac)] focus:outline-none">
                <option value="">운영 중인 {isRoulette ? '룰렛' : '출석체크'} 미션 선택…</option>
                {MISSION_OPTS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink4)]" />
            </div>
            {linkedMission && <p className="mt-2 flex items-center gap-1.5 rounded-[8px] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[#6D28D9]"><Sparkles className="h-3.5 w-3.5" /> ‘{linkedMission}’ 연결됨 — 콘텐츠·보상은 이 미션에서 가져옵니다.</p>}
          </div>
          )}

          {/* ── 운영자 지정 — '운영자 고정 + 추천'일 때만 라벨로 구분. '전부 추천'은 운영자 콘텐츠 없음. ── */}
          {showFillMode && fillMode === '운영자 고정 + 추천' && <p className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-[var(--ink2)]"><UserCog className="h-3.5 w-3.5 text-[var(--ink4)]" /> 운영자 고정 항목</p>}
          {showFillMode && fillMode === '전부 추천' && fb === '운영자 편성으로 대체' && <p className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-[#b67a12]"><UserCog className="h-3.5 w-3.5" /> 대체 항목 <span className="text-[11px] font-normal text-[var(--ink4)]">· 추천이 없을 때 노출</span></p>}
          {showFillMode && fillMode === '전부 추천' && fb !== '운영자 편성으로 대체' ? null : isRecQuery ? (
          /* ── 추천 질의어 — 운영자가 풀(최대 20개)을 등록, 개인화가 고객마다 맞춤(FO 최대 2개 노출). SB [홈]유형(2026-11-26 사용자 요청). ── */
          <div>
            <p className="mb-3 flex items-start gap-1.5 rounded-[8px] bg-[#f5f1ff] px-3 py-2 text-[12px] leading-relaxed text-[#6D28D9]">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>질의어를 <b>여러 개(최대 {RQ_MAX}개) 등록</b>해 두면, <b>개인화 On</b> 시 고객마다 맞춤으로 골라 <b>최대 2개</b>를 노출해요(질문당 20자·1줄). <b>Off</b>면 입력한 순서대로. 선택 시 AI 대화로 이동해 답변을 제공해요.</span>
            </p>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[var(--ink3)]">등록 질의어 <span className="text-[var(--ac)]">{rqList.filter((q) => q.trim()).length}</span><span className="text-[var(--ink4)]">/{RQ_MAX}</span> <span className="font-normal text-[var(--ink4)]">· 개인 맞춤 풀</span></span>
              <button type="button" onClick={() => { const picks = [...RQ_SAMPLES].sort(() => Math.random() - 0.5).slice(0, RQ_SEED); setRqList(picks); syncRecQuery(picks); onToast(`AI가 추천 질의어 ${picks.length}개를 생성했어요`); }}
                className="inline-flex h-[30px] items-center gap-1 rounded-[6px] border border-[#cfd2ff] bg-[var(--ac2)] px-2.5 text-[12px] font-semibold text-[var(--ac)] hover:bg-[#e6e8ff]"><Sparkles className="h-3.5 w-3.5" /> AI로 풀 채우기</button>
            </div>
            <div className="space-y-1.5">
              {rqList.map((q, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="w-5 shrink-0 text-center text-[12px] tabular-nums text-[var(--ink4)]">{i + 1}</span>
                  <button type="button" title="AI 추천으로 채우기" onClick={() => { const v = RQ_SAMPLES[Math.floor(Math.random() * RQ_SAMPLES.length)]; const next = [...rqList]; next[i] = v; setRqList(next); syncRecQuery(next); }}
                    className="flex h-[32px] shrink-0 items-center gap-1 whitespace-nowrap rounded-[6px] border border-[#cfd2ff] bg-[var(--ac2)] px-2 text-[11px] font-semibold text-[var(--ac)] hover:bg-[#e6e8ff]"><Sparkles className="h-3 w-3" /> AI</button>
                  <input value={q} maxLength={20} onChange={(e) => { const next = [...rqList]; next[i] = e.target.value; setRqList(next); syncRecQuery(next); }}
                    placeholder="추천 질의어 입력 (비어 있으면 AI 추천)" className="h-[32px] min-w-0 flex-1 rounded-[6px] border border-[var(--line2)] bg-white px-2 text-[13px] focus:border-[var(--ac)] focus:outline-none" />
                  <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-[var(--ink4)]">{q.length}/20</span>
                  <button type="button" title="삭제" disabled={rqList.length <= 1} onClick={() => { const next = rqList.filter((_, j) => j !== i); setRqList(next); syncRecQuery(next); }}
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-[6px] text-[var(--ink4)] hover:bg-[#fff0f1] hover:text-[var(--bad)] disabled:opacity-30"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
            {rqList.length < RQ_MAX && (
              <button type="button" onClick={() => { const next = [...rqList, '']; setRqList(next); }}
                className="mt-2 inline-flex h-[32px] items-center gap-1 rounded-[6px] border border-dashed border-[#cfd2ff] px-3 text-[12px] font-semibold text-[var(--ac)] hover:bg-[var(--ac2)]"><Plus className="h-3.5 w-3.5" /> 질의어 추가</button>
            )}
            {/* 노출 개수(최소~최대) — 개인화가 고객마다 이 범위로 노출. FO는 독립 칩이라 최대 2개 권장(2026-11-26 사용자 요청). */}
            <div className="mt-4 border-t border-[var(--line2)] pt-3">
              <p className="mb-1.5 text-[13px] font-bold text-[var(--ink2)]">노출 개수 <span className="font-normal text-[var(--ink4)]">· 고객마다 개인 맞춤으로 노출</span></p>
              <div className="flex items-center gap-2 text-[13px]">
                <span className="text-[var(--ink3)]">최소</span>
                <Stepper value={rqMin} min={1} max={rqMax} onChange={(v) => setRqMin(v)} />
                <span className="text-[var(--ink4)]">~</span>
                <span className="text-[var(--ink3)]">최대</span>
                <Stepper value={rqMax} min={rqMin} max={2} onChange={(v) => setRqMax(v)} />
                <span className="ml-1 text-[12px] text-[var(--ink4)]">개 노출 (독립 칩, 최대 2개)</span>
              </div>
            </div>
          </div>
          ) : (<>
          {fillForFallback && (
            <div className="mb-3 flex items-start gap-1.5 rounded-[8px] bg-[#fff8ef] px-3 py-2 text-[12px] leading-relaxed text-[#b67a12]">
              <span className="mt-0.5">⚠</span><span>이 코너는 <b>구좌 전체 추천</b>이라 평소엔 추천 완성본이 노출됩니다. <b>추천이 비면</b> 아래에 등록한 운영자 편성 항목이 대신 노출돼요(폴백 미리보기에서 확인).</span>
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
                    next[key] = p.items.map((it, i) => ({ id: `cat-${p.category}-${i}-${it.key}`, label: it.title || it.brand || '', icon: it.imageUrl ?? null, link: it.landing ?? undefined, sub: it.brand ?? undefined, mode: 'load' as const }));
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
            <div className="mb-3 mt-1 flex gap-1.5 rounded-[8px] border border-[var(--line2)] bg-[var(--th)] p-1 text-[12px] font-semibold">
              <button type="button" onClick={() => setFillTab('코너')} className={cn('flex-1 rounded-[6px] border px-3 py-1.5 text-center transition', fillTab === '코너' ? 'border-[var(--line3)] bg-white text-[var(--ac)] shadow-sm' : 'border-transparent text-[var(--ink3)] hover:text-[var(--ink2)]')}>코너 카드</button>
              <button type="button" onClick={() => setFillTab('아이템')} className={cn('flex-1 rounded-[6px] border px-3 py-1.5 text-center transition', fillTab === '아이템' ? 'border-[var(--line3)] bg-white text-[var(--ac)] shadow-sm' : 'border-transparent text-[var(--ink3)] hover:text-[var(--ink2)]')}>컴포넌트 <span className="font-normal opacity-70">· {items.length}</span></button>
            </div>
          )}
          {/* ── 코너 카드 — SB(BO-AIM-DSP-PG557) 폼블록: 배너 설정 · 코너 타이틀 · 버튼 설정 · 카테고리. 2026-11-12 사용자 요청(작업자 SB 정렬). 카드 1장 유형(상태 안내형)은 타이틀 없이 '카드 가져오기'만(2026-11-12 사용자 요청). ── */}
          {(hasCornerTitle || hasButtonText || availOptions.length > 0) && fillTab === '코너' && !cardOnly && (
            <div className="mb-1">
              {/* 상단 이미지 → 추천 맥락 헤더 → 코너 타이틀 순(CN-DSP-0001 정의: 이미지가 맨 위, 2026-11-25 사용자 요청). */}
              {/* 배너 설정 — 배너 옵션이 있는 유형만 */}
              {availOptions.includes('배너') && (
                // 상단 이미지 On/Off — 2026-11-25 사용자 요청으로 잠금 해제(빌더에서 켜고 끄기) + '배너' 워딩 제거.
                <FormBlock title="상단 이미지">
                  <FormRow label="사용 여부" req>
                    <RadioRow options={['Y', 'N'] as const} value={optOn['배너'] ? 'Y' : 'N'} onChange={(v) => { const no = { ...optOn, ['배너']: v === 'Y' }; setOptOn(no); onOptionsChange(no, ctaLabelVal); }} />
                  </FormRow>
                  {optOn['배너'] && (<>
                    {/* 상단 이미지 — 썸네일 + 업로드/라이브러리를 한 행으로 합침(2026-11-25 사용자 요청: '이미지 선택'·'배너' 라벨 통합). */}
                    <FormRow label="상단 이미지" en="ImageSrc" req>
                      <div className="flex items-start gap-3">
                        <button type="button" onClick={openBannerPicker} title="클릭해 이미지 선택" className="grid h-14 w-20 shrink-0 place-items-center overflow-hidden rounded-[6px] border border-[var(--line3)] bg-[var(--th)] text-[var(--ink4)] hover:border-[var(--ac)] hover:text-[var(--ac)]">
                          {bannerImg ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={bannerImg} alt="상단 이미지" className="h-full w-full object-cover" /> : <ImageIcon className="h-4 w-4" />}
                        </button>
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => bannerFileRef.current?.click()} className="inline-flex h-[32px] items-center gap-1 rounded-[6px] border border-[var(--line2)] bg-white px-2.5 text-[12px] font-medium text-[var(--ink2)] hover:border-[var(--ac)] hover:text-[var(--ac)]"><ImageIcon className="h-3.5 w-3.5" /> 이미지 파일 업로드</button>
                            <button type="button" onClick={() => { setBannerSource('배너 캠페인'); setBannerImgModal(true); }} className="inline-flex h-[32px] items-center gap-1 rounded-[6px] border border-[var(--line2)] bg-white px-2.5 text-[12px] font-medium text-[var(--ink2)] hover:border-[var(--ac)] hover:text-[var(--ac)]"><Search className="h-3.5 w-3.5" /> 라이브러리에서 선택</button>
                            <input ref={bannerFileRef} type="file" accept="image/*" onChange={onBannerFile} className="hidden" />
                          </div>
                          {bannerFileName && <span className="min-w-0 truncate text-[12px] text-[var(--ink4)]">업로드 된 파일명 : {bannerFileName}</span>}
                        </div>
                      </div>
                    </FormRow>
                    {/* 대체 텍스트(alt) — 이미지 대체텍스트 필수(PI-DSP-CMP-004). AI 추천 초안. */}
                    <FormRow label="대체 텍스트(alt)" req>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => { const v = `${cornerTitleVal || corner.name || '배너'} 이미지`; setBannerAlt(v); onToast('대체텍스트 초안을 생성했어요'); }} className="flex h-[32px] shrink-0 items-center gap-1 whitespace-nowrap rounded-[6px] border border-[#cfd2ff] bg-[var(--ac2)] px-2 text-[11px] font-semibold text-[var(--ac)] hover:bg-[#e6e8ff]"><Sparkles className="h-3 w-3" /> AI 추천</button>
                        <input value={bannerAlt} onChange={(e) => setBannerAlt(e.target.value)} placeholder="이미지를 설명하는 대체텍스트 (필수)" className="h-[32px] min-w-0 flex-1 rounded-[6px] border border-[var(--line2)] bg-white px-2 text-[13px] focus:border-[var(--ac)] focus:outline-none" />
                      </div>
                    </FormRow>
                  </>)}
                </FormBlock>
              )}
              {/* 추천 맥락 헤더 — CN-DSP-0001 정의. 상단 이미지 아래·코너 타이틀 위. 개인화 코너(개인화 영역)에서만 On/Off. 추천 근거(검색·매장방문) 밴드 · API 활동 기록일. */}
              {isPersonal && (
                <FormBlock title="추천 맥락 헤더" desc="개인화 추천 근거 밴드 · API 활동 기록일">
                  <FormRow label="사용 여부" req>
                    <RadioRow options={['Y', 'N'] as const} value={ctxHeaderOn ? 'Y' : 'N'} onChange={(v) => { const on = v === 'Y'; setCtxHeaderOn(on); onPreviewPatch({ contextHeader: on, contextHeaderText: ctxHeaderText || null }); }} />
                  </FormRow>
                  {ctxHeaderOn && (
                    <FormRow label="헤더 문구" en="ContextHeader">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => { const v = '어제 찾으신 내용으로 골랐어요'; setCtxHeaderText(v); onPreviewPatch({ contextHeaderText: v }); onToast('추천 맥락 헤더 문구 초안을 생성했어요'); }} className="flex h-[32px] shrink-0 items-center gap-1 whitespace-nowrap rounded-[6px] border border-[#cfd2ff] bg-[var(--ac2)] px-2 text-[11px] font-semibold text-[var(--ac)] hover:bg-[#e6e8ff]"><Sparkles className="h-3 w-3" /> AI 추천</button>
                        <input value={ctxHeaderText} onChange={(e) => { setCtxHeaderText(e.target.value); onPreviewPatch({ contextHeaderText: e.target.value || null }); }} placeholder="예: 어제 찾으신 내용으로 골랐어요" className="h-[32px] min-w-0 flex-1 rounded-[6px] border border-[var(--line2)] bg-white px-2 text-[13px] focus:border-[var(--ac)] focus:outline-none" />
                      </div>
                    </FormRow>
                  )}
                </FormBlock>
              )}
              {/* 코너 타이틀 */}
              {hasCornerTitle && (
                <FormBlock title="코너 타이틀">
                  <FormRow label="코너 타이틀" en="CornerTitle">
                    {/* 코너 유형에 맞는 영역 제목 초안 생성(눌러서 다른 후보). 운영자 초안 — CVM 값 아님. */}
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={genAiTitle} title="코너 유형에 맞는 영역 제목을 하나 생성해요 (초안 · 눌러서 다른 후보)"
                        className="flex h-[32px] shrink-0 items-center gap-1 whitespace-nowrap rounded-[6px] border border-[#cfd2ff] bg-[var(--ac2)] px-2 text-[11px] font-semibold text-[var(--ac)] hover:bg-[#e6e8ff]"><Sparkles className="h-3 w-3" /> AI 추천</button>
                      {/* 글자수 — 최대 36자(줄바꿈 포함 25자 권장, 2줄 이하). 36자 초과 시 경고 토스트(2026-11-25 SB 정의). */}
                      <input value={cornerTitleVal} onChange={(e) => {
                          const v = e.target.value;
                          if (v.length > TITLE_MAX && cornerTitleVal.length <= TITLE_MAX) onToast(`코너 타이틀은 최대 ${TITLE_MAX}자 권장이에요 (줄바꿈 포함 25자 · 2줄 이하).`);
                          setCornerTitleVal(v); onPreviewPatch({ mainTitle: v || 'CornerTitle' });
                        }} placeholder="코너 제목 입력 (비어 있으면 AI 추천)" className={cn('h-[32px] min-w-0 flex-1 rounded-[6px] border bg-white px-2 text-[13px] focus:outline-none', cornerTitleVal.length > TITLE_MAX ? 'border-[var(--bad)] focus:border-[var(--bad)]' : 'border-[var(--line2)] focus:border-[var(--ac)]')} />
                      <span className={cn('shrink-0 text-[11px] tabular-nums', cornerTitleVal.length > TITLE_MAX ? 'font-bold text-[var(--bad)]' : 'text-[var(--ink4)]')}>{cornerTitleVal.length}/{TITLE_MAX}</span>
                    </div>
                  </FormRow>
                </FormBlock>
              )}
              {/* 서브 CTA 설정 — 코너 타이틀 옆 CTA(예: '카테고리별 혜택 ›'). CTA 2개 케이스라 카테고리형에만 노출(2026-11-17 사용자 요청). 버튼 텍스트 = 미리보기 서브타이틀. */}
              {isCategory && (
                <FormBlock title="서브 CTA 설정">
                  <FormRow label="사용 여부" req>
                    <RadioRow options={['Y', 'N'] as const} value={subCtaOn ? 'Y' : 'N'} onChange={(v) => setSubCtaOn(v === 'Y')} />
                  </FormRow>
                  {subCtaOn && (<>
                  <FormRow label="버튼 텍스트" en="ButtonText" req>
                    <input value={buttonTextVal} onChange={(e) => { setButtonTextVal(e.target.value); onPreviewPatch({ subTitle: e.target.value || 'ButtonText' }); }} placeholder="예: 카테고리별 혜택" className="h-[32px] w-full rounded-[6px] border border-[var(--line2)] bg-white px-2 text-[13px] focus:border-[var(--ac)] focus:outline-none" />
                  </FormRow>
                  <FormRow label="이동 경로" req>
                    <RadioRow options={['페이지', '상품', '프로모션', '직접 입력'] as const} value={txtRoute} onChange={setTxtRoute} />
                  </FormRow>
                  <FormRow label="경로 상세" req>
                    <div className="flex items-center gap-1.5">
                      {txtRoute !== '직접 입력' && <button type="button" onClick={() => onToast(`${txtRoute} 경로 불러오기 (데모)`)} className="inline-flex h-[32px] shrink-0 items-center gap-1 rounded-[6px] border border-[var(--line2)] bg-white px-2 text-[12px] font-medium text-[var(--ink2)] hover:border-[var(--ac)] hover:text-[var(--ac)]"><Search className="h-3.5 w-3.5" /> 불러오기</button>}
                      <div className="flex h-[32px] min-w-0 flex-1 items-center gap-1 rounded-[6px] border border-[var(--line2)] px-2">
                        <Link2 className="h-3.5 w-3.5 shrink-0 text-[var(--ink4)]" />
                        <input value={txtLink} onChange={(e) => setTxtLink(e.target.value)} placeholder="예: /benefit/category" className="h-full min-w-0 flex-1 bg-transparent text-[12px] focus:outline-none" />
                      </div>
                    </div>
                  </FormRow>
                  <FormRow label="열기 방식" req>
                    <RadioRow options={['현재 화면', '내부 브라우저', '외부 브라우저'] as const} value={txtOpen} onChange={setTxtOpen} />
                  </FormRow>
                  </>)}
                </FormBlock>
              )}
              {/* 추가 인포메이션 — CN-DSP-0001. 운영 정보성 영역. 수동(운영/픽스) 코너에서만. 순서: 하단 CTA '위'(2026-11-26 사용자 요청). */}
              {!isPersonal && (
                <FormBlock title="추가 인포메이션" desc="운영 정보성 영역 · 수동 운영에서만">
                  <FormRow label="사용 여부" req>
                    <RadioRow options={['Y', 'N'] as const} value={infoOn ? 'Y' : 'N'} onChange={(v) => { const on = v === 'Y'; setInfoOn(on); onPreviewPatch({ information: on, informationText: infoText || null }); }} />
                  </FormRow>
                  {infoOn && (
                    <FormRow label="정보 문구" en="Information">
                      <input value={infoText} onChange={(e) => { setInfoText(e.target.value); onPreviewPatch({ informationText: e.target.value || null }); }} placeholder="운영에 필요한 안내 문구" className="h-[32px] w-full rounded-[6px] border border-[var(--line2)] bg-white px-2 text-[13px] focus:border-[var(--ac)] focus:outline-none" />
                    </FormRow>
                  )}
                </FormBlock>
              )}
              {/* 하단 CTA 버튼 설정 — 코너 하단 더보기/CTA 버튼. 사용 여부(Y/N) + 문구·이동 경로·경로 상세·열기 방식(SB PG557, 2026-11-17 사용자 요청). 추가 인포 '아래'. */}
              {availOptions.includes('CTA') && (
                <FormBlock title="하단 CTA 설정">
                  <FormRow label="사용 여부" req>
                    <RadioRow options={['Y', 'N'] as const} value={optOn['CTA'] ? 'Y' : 'N'} onChange={(v) => { const no = { ...optOn, ['CTA']: v === 'Y' }; setOptOn(no); onOptionsChange(no, ctaLabelVal); }} />
                  </FormRow>
                  {optOn['CTA'] && (<>
                    <FormRow label="버튼 텍스트" en="ButtonText" req>
                      <input value={ctaLabelVal} onChange={(e) => { setCtaLabelVal(e.target.value); onPreviewPatch({ moreButtonUse: true, moreButtonLabel: e.target.value || 'CTA' }); }} placeholder="예: T 다이렉트 샵 보러가기" className="h-[32px] w-full rounded-[6px] border border-[var(--line2)] bg-white px-2 text-[13px] focus:border-[var(--ac)] focus:outline-none" />
                    </FormRow>
                    <FormRow label="이동 경로" req>
                      <RadioRow options={['페이지', '상품', '프로모션', '직접 입력'] as const} value={btnRoute} onChange={setBtnRoute} />
                    </FormRow>
                    <FormRow label="경로 상세" req>
                      <div className="flex items-center gap-1.5">
                        {btnRoute !== '직접 입력' && <button type="button" onClick={() => onToast(`${btnRoute} 경로 불러오기 (데모)`)} className="inline-flex h-[32px] shrink-0 items-center gap-1 rounded-[6px] border border-[var(--line2)] bg-white px-2 text-[12px] font-medium text-[var(--ink2)] hover:border-[var(--ac)] hover:text-[var(--ac)]"><Search className="h-3.5 w-3.5" /> 불러오기</button>}
                        <div className="flex h-[32px] min-w-0 flex-1 items-center gap-1 rounded-[6px] border border-[var(--line2)] px-2">
                          <Link2 className="h-3.5 w-3.5 shrink-0 text-[var(--ink4)]" />
                          <input value={ctaLinkVal} onChange={(e) => { setCtaLinkVal(e.target.value); onPreviewPatch({ moreButtonLink: e.target.value }); }} placeholder="예: /skt/tdirect/shop" className="h-full min-w-0 flex-1 bg-transparent text-[12px] focus:outline-none" />
                        </div>
                      </div>
                    </FormRow>
                    <FormRow label="열기 방식" req>
                      <RadioRow options={['현재 화면', '내부 브라우저', '외부 브라우저'] as const} value={btnOpen} onChange={setBtnOpen} />
                    </FormRow>
                  </>)}
                </FormBlock>
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
            <FormBlock title="코너 레이아웃" desc="바코드 유형 · 코너 타이틀 · 갱신 주기">
              {/* 바코드 유형 — 3종 택1(2026-11-26 회의): 통합(상시, 모든 제휴사 공통) · 매직(제휴사·기간 지정) · 쿠폰(다운로드·일회용). */}
              <FormRow label="바코드 유형">
                <RadioRow options={['통합 바코드', '매직 바코드', '쿠폰 바코드'] as const} value={barcodeKind} onChange={setBarcodeKind} />
              </FormRow>
              <p className="-mt-1 mb-1 px-[76px] text-[11px] leading-relaxed text-[var(--ink4)]">
                {barcodeKind === '통합 바코드' ? '상시 · 모든 제휴사 공통 할인 바코드.'
                  : barcodeKind === '매직 바코드' ? '제휴사·기간이 지정된 마케팅 바코드(구독 상품 등).'
                  : '고객이 다운로드한 쿠폰 바코드(일회용).'}
              </p>
              <FormRow label="코너 타이틀" en="CornerTitle">
                <input value={barcodeLabel} onChange={(e) => { setBarcodeLabel(e.target.value); onPreviewPatch({ mainTitle: e.target.value || 'T멤버십' }); }} placeholder="코너 타이틀에 노출할 바코드명을 입력하세요" className="h-[32px] w-full rounded-[6px] border border-[var(--line2)] bg-white px-2 text-[13px] focus:border-[var(--ac)] focus:outline-none" />
              </FormRow>
              <FormRow label="유효 갱신 주기">
                <div className="flex items-center gap-1.5">
                  <input type="number" min={1} value={barcodeRefresh} onChange={(e) => setBarcodeRefresh(e.target.value)} className="h-[32px] w-20 rounded-[6px] border border-[var(--line2)] bg-white px-2 text-[13px] focus:border-[var(--ac)] focus:outline-none" />
                  <span className="text-[12px] text-[var(--ink4)]">분마다 갱신</span>
                </div>
              </FormRow>
              <div className="px-0 pt-2">
                <p className="flex items-start gap-1 rounded-[6px] bg-[var(--th)] px-2 py-1.5 text-[11px] leading-relaxed text-[var(--ink3)]"><Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-[var(--ac)]" /> 바코드 번호는 회원 인증 기반 <b className="mx-0.5">런타임 발급</b> — 미리보기엔 sample 번호로 표시됩니다.</p>
              </div>
            </FormBlock>
          )}
          {/* ── 아이템 탭(또는 코너 속성이 없는 유형)에서만 아이템 리스트 노출 ── */}
          {!cardOnly && !isBarcode && (!(hasCornerTitle || hasButtonText || availOptions.length > 0) || fillTab === '아이템') && (
          <>
          {/* 탭(카테고리) 설정 — 컴포넌트 탭으로 이동(2026-11-25 사용자 요청: 코너 카드 아님). 사용 여부 + 카테고리 선택(불러오기) + 메뉴 테이블. */}
          {(isCategory || availOptions.includes('칩')) && (
            <FormBlock title="카테고리 설정" desc="카테고리 구분(탭)">
              <FormRow label="사용 여부" req>
                <RadioRow options={['Y', 'N'] as const} value={catOn ? 'Y' : 'N'} onChange={(v) => { const on = v === 'Y'; setCatOn(on); onOptionsChange({ ...optOn, ['칩']: on }, ctaLabelVal); }} />
              </FormRow>
              {/* 메뉴 테이블(이동경로·아이콘·열기방식·경로상세)은 업무진입형 '메뉴'에만 필요. 카테고리형은 탭이 컴포넌트 리스트에 바로 이어지므로 이동경로 불필요 — 칩 관리는 아래 '카테고리' 블록에서(2026-11-25 사용자 요청). */}
              {catOn && !isCategory && (<>
                <FormRow label="카테고리 선택" req>
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <button type="button" onClick={() => setChipLoadOpen(true)} className="inline-flex h-[28px] items-center gap-1 rounded-[6px] border border-[var(--line2)] bg-white px-2.5 text-[12px] font-medium text-[var(--ink2)] hover:border-[var(--ac)] hover:text-[var(--ac)]"><Search className="h-3 w-3" /> 불러오기</button>
                    {chips.map((c, i) => (
                      <span key={i} onClick={() => setActiveChip(i)}
                        className={cn('inline-flex cursor-pointer items-center gap-1 rounded-[6px] border px-2 py-1 text-[12px] font-medium', i === chipIdx ? 'border-[#f2c47a] bg-[#fff8ef] text-[#b67a12]' : 'border-[var(--line3)] bg-white text-[var(--ink2)]')}>
                        {c}
                        <button type="button" onClick={(e) => { e.stopPropagation(); setChips((cs) => cs.filter((_, j) => j !== i)); }} className="text-[var(--ink4)] hover:text-[var(--bad)]"><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                  </div>
                </FormRow>
                {/* 메뉴 테이블 — 카테고리별 아이콘·링크·이동경로·열기방식(업무 진입형 메뉴 테이블과 동일 규격). */}
                {chips.length > 0 && (
                  <div className="mt-2 border-y border-[var(--line2)]">
                    <div className="grid grid-cols-[26px_58px_42px_minmax(60px,1fr)_auto_minmax(72px,1.05fr)_20px] items-center gap-1.5 border-b border-[var(--line2)] bg-[var(--th)] px-2.5 py-2.5 text-[13px] font-medium text-[var(--ink2)] whitespace-nowrap">
                      <span className="text-center">순서</span><span className="text-center">이동 경로</span><span className="text-center">아이콘</span><span>메뉴명</span><span className="text-center">열기 방식</span><span>경로 상세</span><span />
                    </div>
                    {chips.map((c, i) => {
                      const m = catMetaOf(c); const loaded = m.mode === 'load';
                      return (
                        <div key={i} className="grid grid-cols-[26px_58px_42px_minmax(60px,1fr)_auto_minmax(72px,1.05fr)_20px] items-center gap-1.5 px-2.5 py-2">
                          <span className="flex justify-center text-[var(--ink4)]"><GripVertical className="h-4 w-4" /></span>
                          <div className="flex gap-0.5 rounded-[7px] border border-[var(--line2)] bg-[var(--th)] p-[2px] text-[10px] font-semibold">
                            <button type="button" onClick={() => patchCat(c, { mode: 'direct' })} className={cn('flex-1 rounded-[5px] px-1 py-1 transition', !loaded ? 'bg-white text-[var(--ac)] shadow-sm ring-1 ring-[#cfd2ff]' : 'text-[var(--ink4)] hover:text-[var(--ink2)]')}>직접</button>
                            <button type="button" onClick={() => patchCat(c, { mode: 'load' })} className={cn('flex-1 rounded-[5px] px-1 py-1 transition', loaded ? 'bg-white text-[var(--ac)] shadow-sm ring-1 ring-[#cfd2ff]' : 'text-[var(--ink4)] hover:text-[var(--ink2)]')}>조회</button>
                          </div>
                          <button type="button" disabled={LOCK_PRESET} onClick={() => setCatIconFor(c)} title={LOCK_PRESET ? LOCK_HINT : '아이콘 선택'}
                            className={cn('grid h-8 w-8 place-items-center justify-self-center overflow-hidden rounded-[7px] transition', m.icon ? 'bg-[var(--ac2)] text-[var(--ac)] hover:ring-1 hover:ring-[var(--ac)]' : 'border border-dashed border-[var(--line3)] bg-white text-[var(--ink4)] hover:border-[var(--ac)] hover:text-[var(--ac)]', LOCK_PRESET && 'pointer-events-none opacity-60')}>
                            {m.icon ? <ItemIcon src={m.icon} iconClass="h-[18px] w-[18px]" imgClass="h-5 w-5 object-contain" /> : <ImageIcon className="h-4 w-4" />}
                          </button>
                          <input value={c} onChange={(e) => {
                              const nn = e.target.value;
                              setChips((cs) => cs.map((x, j) => (j === i ? nn : x)));
                              const oldKey = `cat:${c}`, newKey = `cat:${nn}`;
                              setItemsByKey((mm) => { if (!(oldKey in mm)) return mm; const n = { ...mm }; n[newKey] = n[oldKey]; delete n[oldKey]; return n; });
                              setCatMeta((mm) => { const n = { ...mm }; n[nn] = catMetaOf(c); if (nn !== c) delete n[c]; return n; });
                            }} placeholder="카테고리명"
                            className="h-[32px] min-w-0 rounded-[6px] border border-[var(--line2)] px-2 text-[13px] focus:border-[var(--ac)] focus:outline-none" />
                          <div className="flex justify-center">
                            {!loaded ? (
                              <div className="flex items-center gap-2 whitespace-nowrap text-[11px] text-[var(--ink2)]">
                                {(['내부', '외부'] as const).map((t) => { const on = (t === '내부' ? 'internal' : 'external') === m.linkType; return (
                                  <button key={t} type="button" onClick={() => patchCat(c, { linkType: t === '내부' ? 'internal' : 'external' })} className="inline-flex shrink-0 items-center gap-1">
                                    <span className={cn('grid h-3.5 w-3.5 place-items-center rounded-full border', on ? 'border-[var(--ac)] bg-[var(--ac)]' : 'border-[var(--line3)] bg-white')}>{on && <span className="h-1.5 w-1.5 rounded-full bg-white" />}</span>{t}
                                  </button>
                                ); })}
                              </div>
                            ) : (
                              <button type="button" onClick={() => setChipLoadOpen(true)} title="메뉴 관리에서 불러오기" className="flex shrink-0 items-center gap-1 rounded-[7px] border border-[#cfd2ff] bg-[var(--ac2)] px-2 py-1.5 text-[11px] font-semibold text-[var(--ac)] hover:bg-[#e6e8ff]"><Search className="h-3 w-3" /> 불러오기</button>
                            )}
                          </div>
                          <div className="flex h-[32px] min-w-0 items-center gap-1 rounded-[6px] border border-[var(--line2)] px-2" title="경로 상세(이동 링크)">
                            <Link2 className="h-3.5 w-3.5 shrink-0 text-[var(--ink4)]" />
                            <input value={m.link} readOnly={LOCK_PRESET} onChange={(e) => patchCat(c, { link: e.target.value })} placeholder="/category/..." title={LOCK_PRESET ? LOCK_HINT : undefined} className={cn('h-full min-w-0 flex-1 bg-transparent text-[12px] focus:outline-none', LOCK_PRESET && 'pointer-events-none text-[var(--ink3)]')} />
                          </div>
                          <button type="button" onClick={() => setChips((cs) => cs.filter((_, j) => j !== i))} className="grid h-6 w-6 place-items-center justify-self-center rounded-[6px] text-[var(--ink4)] hover:bg-[#fff0f1] hover:text-[var(--bad)]"><X className="h-3.5 w-3.5" /></button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="mt-2 flex justify-end">
                  <button type="button" onClick={() => setChipLoadOpen(true)} className="inline-flex items-center gap-1 rounded-[6px] bg-[var(--ac)] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[var(--ac-h)]"><Plus className="h-3.5 w-3.5" /> 추가</button>
                </div>
              </>)}
              {catIconFor && (
                <IconPickerModal current={catMetaOf(catIconFor).icon} onClose={() => setCatIconFor(null)}
                  onPick={(ic) => { patchCat(catIconFor, { icon: ic }); setCatIconFor(null); onToast('아이콘을 적용했습니다.'); }} />
              )}
            </FormBlock>
          )}
          {/* 인디케이터(스와이프) 폼 제거 — 리스트 코너에서 인디케이터 사용 안 함(2026-11-25 Slack 확정). */}
          {/* 카테고리형 — 상단 카테고리 칩 관리(불러오기). 칩 선택 시 아래 컴포넌트 리스트가 그 카테고리로 전환(카테고리별 데이터 세팅, 2026-11-06 사용자 요청).
              사용 여부(catOn)=N이면 아예 노출하지 않는다(2026-11-25 사용자 요청). */}
          {isCategory && catOn && (
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
          {/* 배너형 = 배너 캠페인 관리에서 '불러오기'로만 채움 — 노란 경고 안내(SB 사용자 목업 2026-11-12). */}
          {isBanner && (
            <div className="mb-3 flex items-start gap-2 rounded-[8px] bg-[#fff8ef] px-3.5 py-3 text-[12px] leading-relaxed text-[#8a6d3b]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#e5a53a]" />
              <span>배너 소재는 <b>&lsquo;배너 캠페인 관리&rsquo;</b>에서 등록하고, 이 화면에서는 <b>&lsquo;배너 불러오기&rsquo;</b>로 선택해 구성합니다.</span>
            </div>
          )}
          {/* ── 아이템 — 실제 노출 항목 리스트. SB(상품 전시 수정) 표 규격: 회색 헤더 + 단일 보더 컨테이너 + 행 구분선(행은 인라인 편집 유지). ── */}
          {chipMode && (
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[12px]">
              <span className="font-semibold text-[var(--ink2)]">{isCategory ? '카테고리' : '칩'} <span className="text-[var(--ac)]">&lsquo;{chips[chipIdx]}&rsquo;</span>의 {isCategory ? '컴포넌트' : '메뉴'}</span>
              <span className="text-[var(--ink4)]">— 위 {isCategory ? '카테고리' : '칩'}를 눌러 따로 구성</span>
            </div>
          )}
          {/* 컴포넌트 라벨 + 양 옆 없는 테이블(border-y). 비배너형은 컬럼 헤더(순서·이미지·컴포넌트 타이틀·이동 링크·불러오기·삭제). 2026-11-11 사용자 요청. */}
          <p className="mb-1.5 text-[13px] font-bold text-[var(--ink2)]">{isBanner ? '컴포넌트(요소)' : <>컴포넌트 <span className="font-normal text-[var(--ink4)]">· {itemWord} {items.length}개</span></>}</p>
          <div className={cn('border-y border-[var(--line2)]', isProduct && 'overflow-x-auto')}>
          {!isBanner && !isChip && !isProduct && items.length > 0 && (
            <div className="grid grid-cols-[26px_42px_minmax(0,1.5fr)_minmax(0,1fr)_28px_22px] items-center gap-1.5 border-b border-[var(--line2)] bg-[var(--th)] px-2.5 py-2.5 text-[13px] font-medium text-[var(--ink2)] whitespace-nowrap">
              <span className="text-center">순서</span><span className="text-center">이미지</span><span>타이틀</span><span>링크</span><span className="text-center" title="불러오기"><Search className="mx-auto h-3.5 w-3.5" /></span><span />
            </div>
          )}
          {/* 상품형 테이블 컬럼 헤더 — No·이미지·컴포넌트 타이틀·할인율·가격·기간·서브 텍스트·경로 상세·(액션). SB PG557(2026-11-17 사용자 요청). */}
          {isProduct && items.length > 0 && (
            <div className="grid grid-cols-[30px_46px_132px_52px_112px_56px_118px_124px_118px] items-center gap-1.5 border-b border-[var(--line2)] bg-[var(--th)] px-2.5 py-2.5 text-[13px] font-medium text-[var(--ink2)] whitespace-nowrap">
              <span className="text-center">No.</span><span className="text-center">이미지</span><span>컴포넌트 타이틀</span><span>할인율</span><span>가격</span><span>기간</span><span>서브 텍스트</span><span>경로 상세</span><span />
            </div>
          )}
          {/* 배너형 테이블 컬럼 헤더 — 배너 이미지 | 링크 URL (SB 사용자 목업 2026-11-12). */}
          {isBanner && items.length > 0 && (
            <div className="grid grid-cols-[minmax(150px,170px)_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-[var(--line2)] bg-[var(--th)] px-3 py-2.5 text-[13px] font-medium text-[var(--ink2)]">
              <span className="text-center">배너 이미지</span><span>링크 URL</span><span />
            </div>
          )}
          {/* 업무 진입형(메뉴) 테이블 컬럼 헤더 — 순서·이동 경로·아이콘·메뉴명·열기 방식·경로 상세·삭제. 라벨 13px로 다른 테이블과 맞춤(2026-11-12 사용자 요청). */}
          {isChip && items.length > 0 && (
            <div className="grid grid-cols-[26px_58px_42px_minmax(60px,1fr)_auto_minmax(72px,1.05fr)_20px] items-center gap-1.5 border-b border-[var(--line2)] bg-[var(--th)] px-2.5 py-2.5 text-[13px] font-medium text-[var(--ink2)] whitespace-nowrap">
              <span className="text-center">순서</span><span className="text-center">이동 경로</span><span className="text-center">아이콘</span><span>메뉴명</span><span className="text-center">열기 방식</span><span>경로 상세</span><span />
            </div>
          )}
          <DndContext sensors={itemSensors} collisionDetection={closestCorners} onDragEnd={onItemDragEnd}>
          <SortableContext items={items.map((o) => o.id)} strategy={verticalListSortingStrategy}>
          <div>
            {items.length === 0 && <p className="px-3 py-5 text-center text-[12px] text-[var(--ink4)]">아직 {itemWord}가 없어요 · &lsquo;{itemWord} 추가&rsquo;로 {canLoad ? (loadOnly ? '등록된 ' + itemWord + '에서 담으세요' : '카탈로그에서 끌어오세요') : '추가하세요'}</p>}
            {items.map((o, idx) => (
              <SortableFillRow key={o.id} id={o.id}>{(h) => {
              // 배너형 — 2열 테이블 행: [배너 이미지=진짜 배너 합성 미리보기(클릭→불러오기) | 타이틀·링크(읽기전용)] + 배너 조회/삭제. 문구는 불필요, 타이틀만(2026-11-12 사용자 확정).
              if (isBanner) {
                const bannerComp: PreviewComponent = {
                  id: String(o.id), name: o.label || '배너', componentType: '배너형',
                  atoms: [
                    { id: 't', name: 'title', atomType: 'TEXT', content: o.label || '배너 타이틀', imageUrl: null, altText: null, linkUrl: null },
                    ...(o.sub ? [{ id: 's', name: 'sub', atomType: 'INFO', content: o.sub, imageUrl: null, altText: null, linkUrl: null }] : []),
                    { id: 'i', name: 'img', atomType: 'IMAGE', content: null, imageUrl: o.icon ?? null, altText: o.label ?? null, linkUrl: null },
                  ],
                };
                return (
                <div className="grid grid-cols-[minmax(150px,170px)_minmax(0,1fr)_auto] items-start gap-2.5 px-3 py-3">
                  {/* 배너 이미지 — 진짜 배너처럼 합성 미리보기(타이틀+이미지). 클릭하면 배너 불러오기 모달 */}
                  <button type="button" onClick={() => (canLoad ? setLoadForId(o.id) : onToast('불러오기 (데모)'))} title="클릭해 배너 불러오기" className="w-full text-left [&_>div]:rounded-[8px]">
                    <BannerCard component={bannerComp} sizeDetail={corner.layoutDetail} />
                  </button>
                  {/* 링크 URL 열 — 타이틀·링크(읽기전용). 배너는 배너 캠페인에서 '가져오기'만 — 수정 불가. */}
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex h-[34px] min-w-0 items-center rounded-[6px] border border-[var(--line2)] bg-[var(--th)] px-2.5 text-[13px] text-[var(--ink2)]" title="배너 타이틀 — 배너 캠페인 관리에서만 수정">
                      <span className="min-w-0 flex-1 truncate">{o.label || <span className="text-[var(--ink4)]">배너 타이틀 (배너 캠페인)</span>}</span>
                    </div>
                    <div className="flex h-[34px] min-w-0 items-center gap-1 rounded-[6px] border border-[var(--line2)] bg-[var(--th)] px-2.5 text-[12px] text-[var(--ink3)]" title="랜딩 링크 — 배너 캠페인 관리에서만 수정">
                      <Link2 className="h-3 w-3 shrink-0 text-[var(--ink4)]" />
                      <span className="min-w-0 flex-1 truncate">{o.link || '랜딩 링크 (배너 캠페인)'}</span>
                    </div>
                  </div>
                  {/* 배너 조회 / 삭제 */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button type="button" onClick={() => (canLoad ? setLoadForId(o.id) : onToast('배너 조회 (데모)'))} className="rounded-full border border-[var(--line3)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--ink2)] hover:border-[var(--ac)] hover:text-[var(--ac)]">배너 조회</button>
                    <button type="button" onClick={() => tryRemove(o)} className="rounded-full border border-[var(--line3)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--ink2)] hover:border-[var(--bad)] hover:text-[var(--bad)]">삭제</button>
                  </div>
                </div>
                );
              }
              // 업무 진입형(카테고리형/메뉴) — 테이블 행: 순서·이동 경로(직접/불러오기)·아이콘·메뉴명·열기 방식·경로 상세·삭제. 2026-11-12 사용자 요청(테이블화).
              //  아이콘은 '아이콘 선택' 모달에서 고른 벡터 — brand 프롭을 주면 브랜드 타일(블롭)로 폴백되니 주지 않는다.
              if (isChip) {
                const loaded = o.mode === 'load';
                return (
                <div className="grid grid-cols-[26px_58px_42px_minmax(60px,1fr)_auto_minmax(72px,1.05fr)_20px] items-center gap-1.5 px-2.5 py-2">
                  {/* 순서 */}
                  <span ref={h.setRef} {...h.props} className="flex cursor-grab touch-none justify-center text-[var(--ink4)]"><GripVertical className="h-4 w-4" /></span>
                  {/* 이동 경로 — 직접 | 불러오기 */}
                  <div className="flex gap-0.5 rounded-[7px] border border-[var(--line2)] bg-[var(--th)] p-[2px] text-[10px] font-semibold">
                    <button type="button" onClick={() => setItemMode(o.id, 'direct')} className={cn('flex-1 rounded-[5px] px-1 py-1 transition', !loaded ? 'bg-white text-[var(--ac)] shadow-sm ring-1 ring-[#cfd2ff]' : 'text-[var(--ink4)] hover:text-[var(--ink2)]')}>직접</button>
                    <button type="button" onClick={() => setItemMode(o.id, 'load')} className={cn('flex-1 rounded-[5px] px-1 py-1 transition', loaded ? 'bg-white text-[var(--ac)] shadow-sm ring-1 ring-[#cfd2ff]' : 'text-[var(--ink4)] hover:text-[var(--ink2)]')}>조회</button>
                  </div>
                  {/* 아이콘 — 조회 전용(미팅 2026-11-17: 아이콘은 코너 프리셋 정의) */}
                  <button type="button" disabled={LOCK_PRESET} onClick={() => setIconForId(o.id)} title={LOCK_PRESET ? LOCK_HINT : '아이콘 선택'}
                    className={cn('grid h-8 w-8 place-items-center justify-self-center overflow-hidden rounded-[7px] transition', o.icon ? 'bg-[var(--ac2)] text-[var(--ac)] hover:ring-1 hover:ring-[var(--ac)]' : 'border border-dashed border-[var(--line3)] bg-white text-[var(--ink4)] hover:border-[var(--ac)] hover:text-[var(--ac)]', LOCK_PRESET && 'pointer-events-none opacity-60')}>
                    {o.icon ? <ItemIcon src={o.icon} iconClass="h-[18px] w-[18px]" imgClass="h-5 w-5 object-contain" /> : <ImageIcon className="h-4 w-4" />}
                  </button>
                  {/* 메뉴명 */}
                  <input value={o.label} onChange={(e) => setItemLabel(o.id, e.target.value)} placeholder="메뉴명"
                    className="h-[32px] min-w-0 rounded-[6px] border border-[var(--line2)] px-2 text-[13px] focus:border-[var(--ac)] focus:outline-none" />
                  {/* 열기 방식 — 직접: 내부/외부 라디오 · 불러오기: 메뉴 관리에서 불러오기 버튼 */}
                  <div className="flex justify-center">
                    {!loaded ? <LinkTypeRadio o={o} /> : <button type="button" onClick={() => setLoadForId(o.id)} title="메뉴 관리에서 불러오기" className="flex shrink-0 items-center gap-1 rounded-[7px] border border-[#cfd2ff] bg-[var(--ac2)] px-2 py-1.5 text-[11px] font-semibold text-[var(--ac)] hover:bg-[#e6e8ff]"><Search className="h-3 w-3" /> 불러오기</button>}
                  </div>
                  {/* 경로 상세 — 이동 링크 */}
                  <div className="flex h-[32px] min-w-0 items-center gap-1 rounded-[6px] border border-[var(--line2)] px-2" title="경로 상세(이동 링크)">
                    <Link2 className="h-3.5 w-3.5 shrink-0 text-[var(--ink4)]" />
                    <input value={o.link ?? ''} readOnly={LOCK_PRESET} onChange={(e) => setItemLink(o.id, e.target.value)} placeholder="/menu/..." title={LOCK_PRESET ? LOCK_HINT : undefined}
                      className={cn('h-full min-w-0 flex-1 bg-transparent text-[12px] focus:outline-none', LOCK_PRESET && 'pointer-events-none text-[var(--ink3)]')} />
                  </div>
                  {/* 삭제 */}
                  <button type="button" onClick={() => tryRemove(o)} className="grid h-6 w-6 place-items-center justify-self-center rounded-[6px] text-[var(--ink4)] hover:bg-[#fff0f1] hover:text-[var(--bad)]"><X className="h-3.5 w-3.5" /></button>
                </div>
                );
              }
              // 상품형 — 가격 규격 테이블 행: No·이미지·컴포넌트 타이틀(편집)·할인율·가격·기간·서브 텍스트·경로 상세·상품 조회·삭제.
              //  할인율/가격/기간은 상품(EPC) 원장 값 → '상품 조회'로 불러옴. 데모는 플레이스홀더 표시(편집 불가). SB PG557(2026-11-17 사용자 요청).
              if (isProduct) {
                return (
                <div className="grid grid-cols-[30px_46px_132px_52px_112px_56px_118px_124px_118px] items-center gap-1.5 px-2.5 py-2.5">
                  {/* No. — 드래그 핸들(번호 표시) */}
                  <span ref={h.setRef} {...h.props} className="flex cursor-grab touch-none justify-center text-[13px] font-semibold text-[var(--ink3)]">{idx + 1}</span>
                  {/* 이미지 — 클릭해 상품 조회(불러오기) */}
                  <button type="button" onClick={() => (canLoad ? setLoadForId(o.id) : onToast('상품 조회 (데모)'))} title="상품 이미지 불러오기"
                    className={cn('grid h-14 w-11 place-items-center overflow-hidden rounded-[6px] transition', o.icon ? 'border border-[var(--line2)] bg-[var(--th)]' : 'border border-dashed border-[var(--line3)] bg-white text-[var(--ink4)] hover:border-[var(--ac)] hover:text-[var(--ac)]')}>
                    {o.icon ? <ItemIcon src={o.icon} brand={o.sub || o.label} iconClass="h-5 w-5" imgClass="h-full w-full object-contain" /> : <ImageIcon className="h-4 w-4" />}
                  </button>
                  {/* 컴포넌트 타이틀 — 편집 가능(상품형은 문구/노출 편집) */}
                  <input value={o.label} onChange={(e) => setItemLabel(o.id, e.target.value)} placeholder="컴포넌트 타이틀"
                    className="h-[32px] min-w-0 rounded-[6px] border border-[var(--line2)] px-2 text-[13px] focus:border-[var(--ac)] focus:outline-none" />
                  {/* 할인율 · 가격 · 기간 — 상품(EPC) 원장 값(상품 조회) */}
                  <span className="text-[13px] text-[var(--ink3)]" title="상품(EPC) 원장 값">00 %</span>
                  <span className="text-[13px] text-[var(--ink3)]" title="상품(EPC) 원장 값">000,000,000원</span>
                  <span className="text-[13px] text-[var(--ink3)]" title="상품(EPC) 원장 값">00개월</span>
                  {/* 서브 텍스트 — 2줄 */}
                  <span className="text-[12px] leading-tight text-[var(--ink3)]">{o.sub || 'TEXT TEXT TEXT TEXT'}</span>
                  {/* 경로 상세 */}
                  <span className="min-w-0 truncate text-[12px] text-[var(--ink3)]" title={o.link ?? ''}>{o.link || '/path'}</span>
                  {/* 상품 조회 / 삭제 */}
                  <div className="flex shrink-0 items-center justify-end gap-1">
                    <button type="button" onClick={() => (canLoad ? setLoadForId(o.id) : onToast('상품 조회 (데모)'))} className="whitespace-nowrap rounded-full border border-[var(--line3)] px-2 py-1 text-[11px] font-medium text-[var(--ink2)] hover:border-[var(--ac)] hover:text-[var(--ac)]">상품 조회</button>
                    <button type="button" onClick={() => tryRemove(o)} className="whitespace-nowrap rounded-full border border-[var(--line3)] px-2 py-1 text-[11px] font-medium text-[var(--ink2)] hover:border-[var(--bad)] hover:text-[var(--bad)]">삭제</button>
                  </div>
                </div>
                );
              }
              // 이미지 기반 유형(영화·혜택·상품) — 양 옆 없는 테이블 행(컬럼 헤더 정렬). 썸네일 클릭 시 이미지 교체. 2026-11-11 사용자 요청.
              //  ③ 화면이 편집 상태 → 문구(제목)는 항상 편집 가능. '수정'은 원장에 연결된 '링크'에만(2026-11-10 사용자 요청).
              const connected = o.mode === 'load';
              const linkEdit = !connected || !!rowEdit[o.id];
              return (
              <div className="grid grid-cols-[26px_42px_minmax(0,1.5fr)_minmax(0,1fr)_28px_22px] items-center gap-1.5 px-2.5 py-2">
                {/* 순서 */}
                <span ref={h.setRef} {...h.props} className="flex cursor-grab touch-none justify-center text-[var(--ink4)]"><GripVertical className="h-4 w-4" /></span>
                {/* 이미지 — 썸네일(불러온 이미지, 클릭 시 교체) */}
                <button type="button" onClick={() => (canLoad ? setLoadForId(o.id) : onToast('불러오기 (데모)'))} title="이미지 불러오기"
                  className={cn('grid h-8 w-8 place-items-center overflow-hidden rounded-[6px] transition', o.icon ? 'border border-[var(--line2)] bg-[var(--th)]' : 'border border-dashed border-[var(--line3)] bg-white text-[var(--ink4)] hover:border-[var(--ac)] hover:text-[var(--ac)]')}>
                  {o.icon ? <ItemIcon src={o.icon} brand={o.sub || o.label} iconClass="h-4 w-4" imgClass="h-full w-full object-contain" /> : <ImageIcon className="h-4 w-4" />}
                </button>
                {/* 타이틀 — 콘텐츠 안내형은 제목도 콘텐츠 원장 소유라 수정 불가(불러오기만). 2026-11-12 사용자 요청. */}
                <div className="flex min-w-0 items-center gap-1">
                  {isContentGuide ? (
                    <span className="flex h-[30px] min-w-0 flex-1 items-center truncate rounded-[6px] bg-[var(--th)] px-2 text-[13px] text-[var(--ink2)]" title="제목 — 콘텐츠 연결이라 수정 불가(불러오기로 교체)">{o.label || <span className="text-[var(--ink4)]">콘텐츠 제목</span>}</span>
                  ) : (
                  <input value={o.label} onChange={(e) => setItemLabel(o.id, e.target.value)} placeholder={isBenefitType ? '혜택 문구 (비어 있으면 AI 추천)' : `${itemWord} 제목`} className="h-[30px] min-w-0 flex-1 rounded-[6px] border border-[var(--line2)] px-2 text-[13px] focus:border-[var(--ac)] focus:outline-none" />
                  )}
                  {isBenefitType && (
                    <button type="button" onClick={() => genAiCopy(o)} title={`${o.sub || o.label || '이 브랜드'}에 맞는 혜택 문구를 하나 생성해요 (초안 · 눌러서 다른 후보)`}
                      className="grid h-[30px] w-7 shrink-0 place-items-center rounded-[6px] border border-[#cfd2ff] bg-[var(--ac2)] text-[var(--ac)] hover:bg-[#e6e8ff]"><Sparkles className="h-3.5 w-3.5" /></button>
                  )}
                </div>
                {/* 링크 */}
                <div className="min-w-0">
                  <LinkEditRow link={o.link} editing={linkEdit} onToggle={() => toggleRowEdit(o.id)} onChange={(v) => setItemLink(o.id, v)} source={isContentGuide ? '콘텐츠' : '원장'} locked={isContentGuide || LOCK_PRESET} />
                </div>
                {/* 불러오기 — 아이콘 버튼(좁은 패널) */}
                <div className="flex justify-center">
                  {canLoad ? (
                    <button type="button" onClick={() => setLoadForId(o.id)} title="카탈로그에서 불러오기" className="grid h-7 w-7 place-items-center rounded-[6px] border border-[var(--line2)] bg-white text-[var(--ink3)] hover:border-[var(--ac)] hover:text-[var(--ac)]"><Search className="h-3.5 w-3.5" /></button>
                  ) : <span className="text-[var(--ink4)]">-</span>}
                </div>
                {/* 삭제 */}
                <button type="button" onClick={() => tryRemove(o)} className="grid h-6 w-6 place-items-center justify-self-center rounded-[6px] text-[var(--ink4)] hover:bg-[#fff0f1] hover:text-[var(--bad)]"><X className="h-3.5 w-3.5" /></button>
              </div>
              );
            }}</SortableFillRow>
            ))}
          </div>
          </SortableContext>
          </DndContext>
          </div>
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
          {/* 배너 소재 선택 모달 — 배너 설정 '이미지'/'불러오기' 클릭 시(2026-11-12 사용자 요청). 데모 소재 그리드. */}
          {bannerImgModal && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={() => setBannerImgModal(false)}>
              <div className="w-full max-w-md rounded-[16px] bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="mb-1 flex items-center gap-2">
                  <h2 className="text-[15px] font-bold text-[var(--ink)]">배너 소재 선택</h2>
                  <span className="text-[12px] text-[var(--ink4)]">{bannerSource}</span>
                  <button type="button" onClick={() => setBannerImgModal(false)} className="ml-auto rounded-[6px] p-1 text-[var(--ink3)] hover:bg-[var(--th)]" aria-label="닫기"><X className="h-4 w-4" /></button>
                </div>
                <p className="mb-3 text-[12px] text-[var(--ink4)]">등록된 배너 소재에서 하나를 선택하세요 (데모).</p>
                <div className="grid grid-cols-3 gap-2">
                  {['/assets/banner-starbucks.svg', '/assets/banner-plan-ott.svg', '/assets/lotteworld.png'].map((src) => (
                    <button key={src} type="button" onClick={() => { setBannerImg(src); onPreviewPatch({ bannerImageUrl: src }); setBannerImgModal(false); onToast('배너 소재를 적용했습니다.'); }}
                      className="grid aspect-[4/3] place-items-center overflow-hidden rounded-[8px] border border-[var(--line3)] bg-[var(--th)] hover:border-[var(--ac)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="배너 소재" className="h-full w-full object-contain" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
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
          {/* 추가 — 직접 추가는 칩형(퀵메뉴)에만. 배너형은 우측 정렬 '배너 불러오기'(SB 목업). 나머지는 '불러오기' 단일. */}
          {isChip ? (
            <button type="button" onClick={addItem} className="mt-2 flex w-full items-center justify-center gap-1 rounded-[8px] border border-[#cfd2ff] bg-[var(--ac2)] py-2 text-[12px] font-bold text-[var(--ac)] hover:bg-[#e6e8ff]"><Plus className="h-3.5 w-3.5" /> 추가</button>
          ) : isBanner ? (
            (bannerSingle && items.length > 0) ? null : (
              <div className="mt-3 flex justify-end">
                <button type="button" onClick={() => setLoadForId(APPEND_LOAD)} className="inline-flex items-center gap-1 rounded-[8px] border border-[var(--line3)] bg-white px-4 py-2 text-[13px] font-bold text-[var(--ink)] hover:border-[var(--ac)] hover:text-[var(--ac)]"><Search className="h-3.5 w-3.5" /> 배너 불러오기</button>
              </div>
            )
          ) : canLoad ? (
            <button type="button" onClick={() => setLoadForId(APPEND_LOAD)} className="mt-2 flex w-full items-center justify-center gap-1 rounded-[8px] border border-[#cfd2ff] bg-[var(--ac2)] py-2 text-[12px] font-bold text-[var(--ac)] hover:bg-[#e6e8ff]"><Search className="h-3.5 w-3.5" /> {isBanner ? '배너 캠페인에서 불러오기' : ('등록된 ' + itemWord + '에서 불러오기')}</button>
          ) : null}
          </>
          )}
          {/* CVM 데이터 연동 요청(요청 중분류·나머지 요청 개수·CVM 미제공 목록) UI 제거 — 채우는 방식(운영자 고정+추천)으로 대체(2026-11-25 사용자 요청). */}
          </>)}
          {/* 개인화(추천) 설정 — '운영자 고정 + 추천' 또는 '전부 추천'일 때. */}
          {fillMode !== '운영자 직접' && (
          <div className="mb-4 rounded-[10px] border border-[#e8ddff] bg-[#faf9ff] p-3">
            <p className="mb-2.5 flex items-start gap-1.5 text-[12px] leading-relaxed text-[#6D28D9]">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{fillMode === '운영자 고정 + 추천' ? <>운영자가 고정한 자리 외 나머지를 <b>추천 엔진</b>이 고객별로 채워요.</> : <>후보 코너 유형을 여러 개 담아두면 <b>추천 엔진</b>이 고객마다 노출 개수만큼 골라요. 없으면 미노출.</>}</span>
            </p>
            {/* 퀵메뉴(6+6) 개인화 규칙 — 2번 자리 고정 · 개인화 Max 5 · 후순위부터 교체(2026-11-26 회의). */}
            {isQuickMenu && (
            <div className="mb-3 rounded-[8px] border border-[#e8ddff] bg-white px-3 py-2.5 text-[12px] leading-relaxed text-[var(--ink2)]">
              <p className="mb-1.5 flex items-center gap-1.5 font-bold text-[#6D28D9]"><Lock className="h-3.5 w-3.5" /> 퀵메뉴 개인화 규칙</p>
              <ul className="space-y-1 text-[11.5px]">
                <li className="flex gap-1.5"><span className="shrink-0 font-bold text-[#6D28D9]">·</span><span><b>2번 자리는 항상 고정</b>입니다 — 개인화가 들어와도 밀리지 않아요(프로모션 보장).</span></li>
                <li className="flex gap-1.5"><span className="shrink-0 font-bold text-[#6D28D9]">·</span><span>개인화는 <b>최대 5개</b>까지 노출돼요(2번 고정 자리 제외).</span></li>
                <li className="flex gap-1.5"><span className="shrink-0 font-bold text-[#6D28D9]">·</span><span>추천이 들어오면 운영 등록 메뉴 중 <b>맨 후순위부터</b> 교체됩니다.</span></li>
              </ul>
            </div>
            )}
            {/* 개인화 옵션(대분류) — 복수 선택. 코너 유형(중분류)마다 옵션이 다름(SKT NC_정보 분류 시트). 운영자가 복수로 제안 → CVM이 조정(2026-11-26 사용자 요청). */}
            <FormBlock title={`개인화 옵션 · ${persoCats.length}`}>
              <div className="px-0.5 py-1">
                <p className="mb-2 text-[11px] leading-relaxed text-[var(--ink4)]">이 코너 유형에 맞는 <b className="text-[#6D28D9]">개인화 기준(대분류)</b>을 <b>복수 선택</b>하세요. 운영자 제안값이며 CVM 협의로 조정됩니다.</p>
                {/* 선택형 칩(래핑) — 풀폭 카드 대신 밀도 높은 칩. 세부 항목(items)은 툴팁(title)으로, 선택 상태는 보라 채움으로(2026-11-26 사용자 요청: 개인화 옵션이 너무 큼). */}
                <div className="flex flex-wrap gap-1.5">
                  {persoOpts.map(({ category, items }) => {
                    const on = persoCats.includes(category);
                    return (
                      <button key={category} type="button" onClick={() => togglePersoCat(category)} title={items.join(' · ')}
                        className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12px] font-semibold transition', on ? 'border-[#6D28D9] bg-[#6D28D9] text-white' : 'border-[var(--line2)] bg-white text-[var(--ink2)] hover:border-[#c9b8ec] hover:text-[#6D28D9]')}>
                        {on ? <Check className="h-3 w-3 shrink-0" /> : <Plus className="h-3 w-3 shrink-0 opacity-50" />}
                        {category}
                      </button>
                    );
                  })}
                </div>
                {persoCats.length > 0 && (
                  <p className="mt-2 text-[11px] leading-relaxed text-[var(--ink4)]">선택한 기준의 세부 항목은 CVM에 <b className="text-[#6D28D9]">제안값</b>으로 전달됩니다. 칩에 마우스를 올리면 세부 항목이 보입니다.</p>
                )}
              </div>
            </FormBlock>
            {/* 후보 코너 유형 — 혜택형 '전부 추천'일 때만(여러 코너 껍데기 중 추천이 택). 퀵메뉴는 아이템 추천이라 후보 선택 없이 개수만(2026-11-25 사용자 요청). */}
            {isBenefitType && fillMode === '전부 추천' && (
            <FormBlock title={`후보 코너 유형 · ${persoTypes.length}`}>
              <div className="px-0.5 py-2.5">
                {persoTypes.length === 0 ? (
                  <p className="mb-2 rounded-[8px] border border-dashed border-[var(--line3)] bg-white px-3 py-3 text-center text-[12px] text-[var(--ink4)]">아직 담은 후보가 없어요. 아래에서 후보 유형을 불러오세요.</p>
                ) : (
                  <ul className="mb-2 space-y-1.5">
                    {persoTypes.map((id, i) => {
                      const t = BENEFIT_TYPE_LIST.find((x) => x.typeId === id);
                      if (!t) return null;
                      const img = sbPreviewSrc(t.mid, t.layout);
                      return (
                        <li key={id} className="flex items-center gap-2 rounded-[8px] border border-[var(--line2)] bg-white px-2 py-1.5">
                          <span className="shrink-0 text-[11px] font-bold tabular-nums text-[var(--ink5)]">{i + 1}</span>
                          <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-[5px] bg-[var(--th)]">
                            {img ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={img} alt={t.name} className="h-full w-full object-cover object-top" /> : <LayoutGrid className="h-3.5 w-3.5 text-[var(--ink5)]" />}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[var(--ink2)]">{t.name}</span>
                          <button type="button" aria-label="후보 제거" onClick={() => setPersoTypes((a) => a.filter((x) => x !== id))} className="grid h-5 w-5 shrink-0 place-items-center rounded-[5px] text-[var(--ink4)] hover:bg-[var(--th)] hover:text-[var(--ink2)]"><X className="h-3 w-3" /></button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <button type="button" onClick={() => setPersoPickerOpen(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-[8px] border border-dashed border-[#c9b8ec] bg-white px-2 py-2 text-[12px] font-semibold text-[#6D28D9] transition hover:bg-[#faf7ff]">
                  <Plus className="h-3.5 w-3.5" /> 후보 유형 불러오기
                </button>
              </div>
            </FormBlock>
            )}
            <FormBlock title={fillMode === '전부 추천' ? '노출 개수' : '추천 개수'}>
              <FormRow label="최소 ~ 최대" req>
                <div className="flex items-center gap-2 text-[13px]">
                  <Stepper value={persoMin} min={1} max={persoMax} onChange={(v) => setPersoMin(v)} />
                  <span className="text-[var(--ink4)]">~</span>
                  <Stepper value={persoMax} min={persoMin} max={5} onChange={(v) => setPersoMax(v)} />
                  <span className="ml-1 text-[12px] text-[var(--ink4)]">{fillMode === '전부 추천' ? '개 노출' : '자리 추천'}</span>
                </div>
              </FormRow>
            </FormBlock>
            {/* '추천이 없을 때(폴백)'는 ③ 대체 노출 설정으로 분리 — 추천을 쓸 때만 뜨면 되므로(2026-11-26 사용자 요청). */}
            {isBenefitType && fillMode === '전부 추천' && (
            <div className="mt-1 flex flex-wrap items-center gap-2 rounded-[10px] border border-[#e8ddff] bg-[#faf7ff] px-3 py-2.5 text-[12px]">
              <span className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 font-semibold text-[#6D28D9] shadow-sm">후보 {persoTypes.length}개 유형</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#b79ae8]" />
              <span className="flex items-center gap-1 rounded-full bg-[#6D28D9] px-2.5 py-1 font-semibold text-white"><Sparkles className="h-3 w-3" />개인화 옵션 {persoCats.length}개</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#b79ae8]" />
              <span className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 font-semibold text-[#6D28D9] shadow-sm">최소 {persoMin}~최대 {persoMax}개 노출</span>
              <span className="ml-auto shrink-0 text-[11px] text-[var(--ink4)]">{fb === '운영자 편성으로 대체' ? '없으면 운영자 대체' : '없으면 미노출'}</span>
            </div>
            )}
            {persoPickerOpen && (
              /* 후보 유형 불러오기 = '코너 추가'와 동일한 모달(LoadCornerModal). 단, 개인화 가능 유형만(2026-11-25 사용자 요청).
                 LibCorner.id = `benefit-${typeId}` 이므로 선택 결과를 후보 typeId로 환원. */
              <LoadCornerModal
                corners={libCorners.filter((c) => c.canPersonal)}
                targetZone="personal"
                title="후보 유형 추가"
                addLabel="후보로 담기"
                initialPicked={persoTypes.map((id) => `benefit-${id}`)}
                onToast={onToast}
                onClose={() => setPersoPickerOpen(false)}
                onAdd={(cs) => {
                  const ids = cs.map((c) => (c.id.startsWith('benefit-') ? c.id.slice('benefit-'.length) : '')).filter(Boolean);
                  setPersoTypes(ids); setPersoPickerOpen(false); onToast(`후보 유형 ${ids.length}개를 담았어요`);
                }} />
            )}
          </div>
          )}
        </Sec>
      ) : isProfile ? (
        <Sec n={nFillSec} title="프로필 항목">
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
        <Sec n={nFillSec} title={FILL_MODE_SEC_TITLE[fillMode] ?? '구좌 전체 추천'} help>
          <p className="rounded-[8px] bg-[var(--ac2)] px-3 py-2.5 text-[12px] leading-relaxed text-[var(--ink2)]">
            <b className="text-[var(--ac)]">구좌 전체 추천</b> = 자리(구좌)만 넘깁니다. 이미지·문구·랜딩까지 <b>추천이 완성본을 내려주고</b> 전시 어드민은 받은 그대로 노출합니다. 별도 요청 범위(③) 설정은 없습니다.
          </p>
        </Sec>
      )}

      {/* ③ 대체 노출 설정(폴백) — 추천을 쓸 때(CVM 수급 또는 전부 추천)만 노출. 코너 콘텐츠 설정(②) '아래'(2026-11-25·2026-11-26 사용자 요청). */}
      {(isCvmSrc || fillMode === '전부 추천') && (() => {
        const emptyWord = '추천이 비면';
        return (
        <Sec n={nFallback} title="대체 노출 설정 (폴백)" hint="추천이 없을 때 대체 노출을 설정합니다">
          <div className="space-y-1.5">
            {(['미노출', '운영자 편성으로 대체'] as const).map((f) => {
              const on = fb === f;
              return (
                <button key={f} type="button" onClick={() => { setFb(f); onFallbackChange(f); onPreviewFallback(true); }} className={cn('flex w-full items-start gap-2 rounded-[8px] border px-2.5 py-2 text-left text-[12px]', on ? 'border-[#f2c47a] bg-[#fff8ef]' : 'border-[var(--line2)] bg-white opacity-80')}>
                  <span className={cn('mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border', on ? 'border-[#e59a2a] bg-[#e59a2a]' : 'border-[var(--line3)]')}>{on && <span className="h-1.5 w-1.5 rounded-full bg-white" />}</span>
                  <span className="min-w-0 flex-1">
                    <b className="text-[var(--ink)]">{f === '미노출' ? '미노출 (기본)' : '운영자 편성으로 대체'}</b>
                    <span className="block text-[var(--ink4)]">{f === '미노출' ? `${emptyWord} 이 코너는 노출되지 않아요.` : `${emptyWord} 위 ‘대체 항목’에 등록한 운영자 편성을 대신 노출해요.`}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Sec>
        );
      })()}

      {/* ⑥ 출처(컴포넌트/데이터 출처) 섹션 제거 — 2026-11-19 사용자 요청. 값·로직은 상단 수급(②)·채우기(③)로 충분. */}
    </div>
  );
}

/* 코너 칩 카드(존 밴드 내부) — 이미지2: 드래그·이름·복사/삭제·유형/레이아웃·고정 토글 */
/* 코너 순서 변경 행(order3 레퍼런스) — 드래그·번호·이름·유형칩 + 노출 토글 + 삭제. */
function CornerChip({ c, no, selected, fixed, on, isPersonal, onToggleOn, onSelect, onToggleFixed, onDelete, onToast }: { c: PCorner; no: number; selected: boolean; fixed: boolean; on: boolean; isPersonal: boolean; onToggleOn: () => void; onSelect: () => void; onToggleFixed: () => void; onDelete: () => void; onToast: (m: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: c.templateCornerId });
  const style = { transform: CSS.Transform.toString(transform), transition };
  // 혜택형 코너는 이름이 이미 '{중분류} · {배열}'(예: 제휴사형 · 리스트형)이라, 하단에 베이스 혜택·오퍼형 배열(세로형(카테고리형) 등)을 또 띄우면 혼란 → 숨긴다(2026-11-26 사용자 요청). 실제 cornerType은 '혜택·오퍼형'(cornerTypeLabel→혜택형)이라 라벨 기준으로 판정.
  const layoutText = cornerTypeLabel(c.cornerType) === '혜택형' ? '' : cornerLayoutText(c.cornerType, c.layout, c.layoutDetail);
  // 이름에 '유형 · ' 접두가 붙은 자동생성 코너는 접두를 떼어 '배열(레이아웃)'만 제목으로(유형은 아래 칩으로만). 2026-11-05 사용자 요청.
  const typePrefix = `${c.cornerType} · `;
  const displayName = c.name.startsWith(typePrefix) ? c.name.slice(typePrefix.length) : c.name;
  return (
    <div ref={setNodeRef} style={style} id={`chip-${c.id}`} onClick={onSelect}
      className={cn('cursor-pointer rounded-[10px] border bg-white px-3.5 py-3 transition',
        isDragging && 'z-10 opacity-80 shadow-lg',
        selected ? 'border-[var(--ac)] bg-[var(--ac2)] ring-1 ring-[var(--ac)]' : 'border-[var(--line2)] hover:border-[var(--line3)]')}>
      {/* 그립을 좌측 레일로(위로 얼라인) + 우측 콘텐츠 2행(2026-11-12 사용자 요청: 순서변경 핸들 위로). */}
      <div className="flex items-start gap-1.5">
        <button type="button" {...attributes} {...listeners} onClick={(e) => e.stopPropagation()} title="드래그로 순서·밴드 이동"
          className="mt-[3px] flex shrink-0 cursor-grab touch-none items-center rounded p-0.5 text-[var(--ink4)] hover:bg-[var(--th)] active:cursor-grabbing">
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <div className="min-w-0 flex-1">
          {/* 상단 행 — 번호·이름·고정 여부·삭제(원형 X) */}
          <div className="flex items-center gap-2">
            <span className="w-4 shrink-0 text-center text-[13px] font-semibold text-[var(--ink3)]">{no}</span>
            <span className={cn('min-w-0 flex-1 truncate text-[13px] font-bold', on ? 'text-[var(--ink)]' : 'text-[var(--ink4)]')}>{displayName}</span>
            {/* 개인화 배지 — 상세 '구성 방식'에서 개인화로 지정된 코너 표시(2026-11-25). */}
            {isPersonal && <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-[#F2ECFB] px-1.5 py-0.5 text-[10px] font-bold text-[#6D28D9]"><Sparkles className="h-2.5 w-2.5" />개인화</span>}
            {/* 고정(픽스) 핀 — 픽스 영역 섹션 폐지로 코너별 핀 토글로(2026-11-25). 켜면 항상 그 자리 고정. */}
            <button type="button" onClick={(e) => { e.stopPropagation(); onToggleFixed(); }} title={fixed ? '고정됨 (클릭해 해제)' : '이 자리에 고정'}
              className={cn('grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] transition', fixed ? 'bg-[#eef0f4] text-[var(--ink2)]' : 'text-[var(--ink5)] hover:bg-[var(--th)] hover:text-[var(--ink3)]')}>
              {fixed ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="이 템플릿에서 코너 빼기"
              className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-[var(--line2)] text-[var(--ink3)] transition hover:bg-[#fff0f1] hover:text-[var(--bad)]">
              <X className="h-3 w-3" />
            </button>
          </div>
          {/* 하단 행 — 유형 칩·레이아웃 · (우) 노출 토글 */}
          <div className="mt-1 flex items-center gap-1.5 pl-6">
            <span className={cn(cornerTypeChipClass(cornerTypeLabel(c.cornerType)), 'shrink-0')}>{cornerTypeLabel(c.cornerType)}</span>
            {layoutText && <span className="whitespace-nowrap text-[11px] text-[var(--ink4)]">{layoutText}</span>}
            <span className="min-w-0 flex-1" />
            {/* 노출 on/off 토글 */}
            <button type="button" onClick={(e) => { e.stopPropagation(); onToggleOn(); }} title={on ? '노출 켜짐' : '노출 꺼짐'}
              className={cn('relative h-[20px] w-[34px] shrink-0 rounded-full transition-colors', on ? 'bg-[var(--ac)]' : 'bg-[var(--line3)]')}>
              <span className={cn('absolute top-[2px] h-[16px] w-[16px] rounded-full bg-white shadow-sm transition-all', on ? 'left-[16px]' : 'left-[2px]')} />
            </button>
          </div>
        </div>
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

function BandedCorners({ corners, onCornersChange, templateId, selCorner, onSelect, onAddCorner, onToast, hiddenIds, onToggleHidden }: {
  corners: PCorner[]; onCornersChange: (rows: PCorner[]) => void; templateId: string; selCorner: string | null; onSelect: (id: string) => void; onAddCorner: (zone?: Zone) => void; onToast: (m: string) => void;
  hiddenIds: Set<string>; onToggleHidden: (tcid: string) => void;
}) {
  const router = useRouter();
  // 낙관적 로컬 상태 — 드래그 즉시 반영, 서버 저장 후 refresh로 동기화.
  //  등록 순서(order) 그대로 노출한다 — 유형별 재정렬 금지(2026-11-05 사용자 요청: 순서 유지 + 고정은 제자리).
  const [rows, setRows] = React.useState<PCorner[]>(() => corners);
  // 코너 삭제 확인 모달 대상(2026-11-12 사용자 요청: 시스템 confirm → 디자인 모달).
  const [deleteTarget, setDeleteTarget] = React.useState<PCorner | null>(null);
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
    const target: Zone = c.zone === 'fixed' ? 'dynamic' : 'fixed';
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

  // 개인화↔운영 전환은 코너 상세 '구성 방식'(CornerDetailBody)으로 이동(2026-11-25). 여기선 고정 핀(toggleFixed)만.

  // 코너 삭제 — 시스템 confirm 대신 디자인 모달(2026-11-12 사용자 요청). 확인 시 템플릿에서 배치 제거(원본 코너는 유지).
  async function confirmRemoveCorner(c: PCorner) {
    setDeleteTarget(null);
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
  // 2026-11-25 사용자 요청: 개인화 영역(존 섹션) 폐지 → 코너는 한 리스트. 고정/개인화는 코너별 설정(고정=칩 핀, 개인화=상세 '구성 방식').
  const chipOf = (c: PCorner) => (
    <CornerChip key={c.templateCornerId} c={c} no={noOf(c.templateCornerId)} selected={c.id === selCorner}
      fixed={c.zone === 'fixed'} isPersonal={c.zone === 'personal'} on={!hiddenIds.has(c.templateCornerId)} onToggleOn={() => onToggleHidden(c.templateCornerId)}
      onSelect={() => onSelect(c.id)} onToggleFixed={() => toggleFixed(c)} onDelete={() => setDeleteTarget(c)} onToast={onToast} />
  );
  // 코너 추가 버튼 — 리스트 하단 하나로(2026-11-25 사용자 요청). 영역 지정 없이 추가 → 기본 운영 구성(dynamic), 이후 상세에서 고정/개인화 선택.
  const AddBtn = () => (
    <button type="button" onClick={() => onAddCorner()}
      className="flex w-full items-center justify-center gap-1.5 rounded-[8px] border border-dashed border-[var(--line3)] bg-white px-2 py-2.5 text-[13px] font-semibold text-[var(--ink3)] transition hover:border-[var(--ac)] hover:text-[var(--ac)]">
      <Plus className="h-4 w-4" /> 코너 추가
    </button>
  );
  const EmptyRow = ({ text }: { text: string }) => (
    <p className="rounded-[8px] bg-white px-3 py-2.5 text-center text-[11px] text-[var(--ink4)]">{text}</p>
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
      <SortableContext items={rows.map((c) => c.templateCornerId)} strategy={verticalListSortingStrategy}>
        {/* 코너 리스트 — 바깥(TemplateCard)에 이미 '코너 구성' 영역·제목이 있어 여기선 박스/헤더 없이 리스트만(2026-11-25 사용자 요청: 영역 중첩·카드 축소 방지). */}
        <div className="space-y-1.5">
          {rows.map(chipOf)}
          {rows.length === 0 && <EmptyRow text="아래에서 코너를 추가하세요" />}
          <AddBtn />
        </div>
      </SortableContext>
      {/* 코너 삭제 확인 — 디자인 모달(시스템 confirm 대체, 2026-11-12 사용자 요청). */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-xs rounded-[16px] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-[15px] font-bold text-[var(--ink)]">코너 삭제</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--ink3)]"><b className="text-[var(--ink)]">‘{deleteTarget.name}’</b> 코너를 이 템플릿에서 뺄까요?<br /><span className="text-[var(--ink4)]">코너 유형 관리의 원본 코너는 남습니다.</span></p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-[8px] border border-[var(--line2)] bg-white px-4 py-2 text-[13px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]">취소</button>
              <button type="button" onClick={() => confirmRemoveCorner(deleteTarget)} className="rounded-[8px] bg-[var(--bad)] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90">삭제</button>
            </div>
          </div>
        </div>
      )}
    </DndContext>
  );
}

/* ───────── 개인화 영역(1-1~1-3) — 혜택 카테고리 칩 바로 하위. CVM 전용 · N개 등록→1개 노출 · OX만 (2026-11-23 미팅) ─────────
   마이크로 개인화 존: 1-1 맥락 / 1-2 선호 이력 / 1-3 활동. 순서 고정, 운영자 편성 없음(CVM 연동만).
   한 슬롯(구좌)에 코너 카드 N개 등록 → CVM이 고객마다 1개만 노출. 추천 없으면 미노출, 단 디폴트 1개는 상시.
   ※ 1차: 구조 밴드 신설(프레젠테이션). 코너 N개 등록 연결·미리보기 디바이스 반영은 다음 증분. */
const PERSONAL_SLOTS = [
  { code: '1-1', label: '맥락 기반', desc: '지금 상황·시점(해피아워·귀국 직후·대중교통 등)에 맞는 결정적 카드' },
  { code: '1-2', label: '선호 이력 기반', desc: '자주 쓰거나 선호하는 혜택' },
  { code: '1-3', label: '활동 기반', desc: '최근 조회·탐색·검색 이력 기반' },
] as const;

type SlotCard = { key: string; name: string };
type SlotState = { on: boolean; defaultKey: string | null; cards: SlotCard[] };
const presetImg = (id: string) => `/assets/preset-images/${id}.png`;
const SLOT_CODES = ['1-1', '1-2', '1-3'] as const;

// Template.personalSlots(JSON 문자열) → 슬롯 상태. 깨진 값은 기본값으로.
function parsePersonalSlots(json: string | null | undefined): Record<string, SlotState> {
  const base: Record<string, SlotState> = { '1-1': { on: true, defaultKey: null, cards: [] }, '1-2': { on: true, defaultKey: null, cards: [] }, '1-3': { on: true, defaultKey: null, cards: [] } };
  if (!json) return base;
  try {
    const o = JSON.parse(json) as Record<string, unknown>;
    for (const code of SLOT_CODES) {
      const s = o?.[code] as { on?: unknown; defaultKey?: unknown; cards?: unknown } | undefined;
      if (!s) continue;
      const cards = Array.isArray(s.cards) ? (s.cards as unknown[]).filter((c): c is SlotCard => !!c && typeof (c as SlotCard).key === 'string').map((c) => ({ key: (c as SlotCard).key, name: typeof (c as SlotCard).name === 'string' ? (c as SlotCard).name : (c as SlotCard).key })) : [];
      base[code] = { on: s.on !== false, defaultKey: typeof s.defaultKey === 'string' ? s.defaultKey : null, cards };
    }
  } catch { /* 기본값 */ }
  return base;
}

/* 슬롯에 코너(혜택 프리셋) N개 등록 — 코너 유형(프리셋)에서 불러와 복수 선택(한 벌 공용). */
function SlotRegisterModal({ slotCode, slotLabel, already, onClose, onAdd }: {
  slotCode: string; slotLabel: string; already: Set<string>; onClose: () => void; onAdd: (picks: SlotCard[]) => void;
}) {
  const [sel, setSel] = React.useState<Set<string>>(new Set());
  const toggle = (id: string) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const submit = () => onAdd([...sel].map((id) => ({ key: id, name: presetDesignName(id) || id })));
  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-[16px] bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-[var(--line2)] px-5 py-3.5">
          <span className="rounded-[5px] bg-[#ede9fe] px-1.5 py-0.5 text-[12px] font-extrabold text-[#6D4AFF]">{slotCode}</span>
          <p className="text-[14px] font-bold text-[var(--ink)]">{slotLabel} · 코너 등록</p>
          <span className="text-[12px] text-[var(--ink4)]">프리셋 코너를 골라 담습니다 (복수 선택)</span>
          <button type="button" onClick={onClose} className="ml-auto rounded-[6px] p-1 text-[var(--ink3)] hover:bg-[var(--th)]"><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {PRESET_SHAPE_GROUPS.map((g) => (
            <div key={g.key} className="mb-4">
              <p className="mb-1.5 text-[12px] font-bold text-[var(--ink3)]">{g.label}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {g.presetIds.map((id) => {
                  const picked = sel.has(id); const dup = already.has(id);
                  return (
                    <button key={id} type="button" disabled={dup} onClick={() => toggle(id)}
                      className={cn('flex items-center gap-2 rounded-[8px] border p-2 text-left transition',
                        dup ? 'cursor-not-allowed border-[var(--line2)] bg-[var(--th)] opacity-55' : picked ? 'border-[#6D4AFF] bg-[#f6f4ff]' : 'border-[var(--line2)] bg-white hover:border-[#cfc6ff]')}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={presetImg(id)} alt="" className="h-9 w-9 shrink-0 rounded-[6px] border border-[var(--line2)] object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-semibold text-[var(--ink2)]">{presetDesignName(id) || id}</span>
                        <span className="block text-[10px] text-[var(--ink4)]">{id}{dup ? ' · 등록됨' : ''}</span>
                      </span>
                      {picked && <Check className="h-4 w-4 shrink-0 text-[#6D4AFF]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-[var(--line2)] px-5 py-3">
          <span className="mr-auto text-[12px] text-[var(--ink4)]">{sel.size}개 선택</span>
          <button type="button" onClick={onClose} className="rounded-[8px] border border-[var(--line2)] bg-white px-4 py-2 text-[13px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]">취소</button>
          <button type="button" disabled={sel.size === 0} onClick={submit} className="rounded-[8px] bg-[#6D4AFF] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40">{sel.size}개 등록</button>
        </div>
      </div>
    </div>
  );
}

function PersonalZoneBand({ templateId, initial, onToast }: { templateId: string; initial: string | null; onToast: (m: string) => void }) {
  const init = React.useMemo(() => parsePersonalSlots(initial), [initial]);
  const [on, setOn] = React.useState<Record<string, boolean>>(() => ({ '1-1': init['1-1'].on, '1-2': init['1-2'].on, '1-3': init['1-3'].on }));
  const [cards, setCards] = React.useState<Record<string, SlotCard[]>>(() => ({ '1-1': init['1-1'].cards, '1-2': init['1-2'].cards, '1-3': init['1-3'].cards }));
  const [defKey, setDefKey] = React.useState<Record<string, string | null>>(() => ({ '1-1': init['1-1'].defaultKey, '1-2': init['1-2'].defaultKey, '1-3': init['1-3'].defaultKey }));
  const [picking, setPicking] = React.useState<{ code: string; label: string } | null>(null);
  const router = useRouter();

  // 변경 시 자동 저장(디바운스). 최초 하이드레이션 1회는 건너뛴다. 저장 후 router.refresh로 미리보기(디바이스) 반영.
  const hydrated = React.useRef(false);
  React.useEffect(() => {
    if (!hydrated.current) { hydrated.current = true; return; }
    const payload = JSON.stringify(Object.fromEntries(SLOT_CODES.map((c) => [c, { on: on[c], defaultKey: defKey[c], cards: cards[c] }])));
    const t = setTimeout(() => { savePersonalSlots(templateId, payload).then(() => router.refresh()).catch(() => onToast('개인화 영역 저장에 실패했습니다.')); }, 600);
    return () => clearTimeout(t);
  }, [on, cards, defKey, templateId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addToSlot = (code: string, picks: SlotCard[]) => {
    setCards((prev) => {
      const merged = [...prev[code]];
      for (const p of picks) if (!merged.some((m) => m.key === p.key)) merged.push(p);
      // 디폴트 미지정이면 첫 카드로
      setDefKey((d) => (d[code] ? d : { ...d, [code]: merged[0]?.key ?? null }));
      return { ...prev, [code]: merged };
    });
    setPicking(null);
    onToast(`${code}에 코너 ${picks.length}개 등록`);
  };
  const removeCard = (code: string, key: string) => {
    setCards((prev) => { const next = prev[code].filter((c) => c.key !== key); setDefKey((d) => (d[code] === key ? { ...d, [code]: next[0]?.key ?? null } : d)); return { ...prev, [code]: next }; });
  };

  return (
    <section className="rounded-[12px] border border-[#d9d2ff] bg-[#f6f4ff] p-3.5">
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-[#6D4AFF] text-[11px] font-bold text-white">P</span>
        <h3 className="text-[14px] font-bold text-[var(--ink)]">개인화 영역</h3>
        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[#6D4AFF] ring-1 ring-[#d9d2ff]">혜택 카테고리 칩 바로 하위</span>
        <span className="rounded-full bg-[#6D4AFF] px-2 py-0.5 text-[11px] font-semibold text-white">CVM 전용</span>
        <span className="ml-auto text-[11px] text-[var(--ink4)]">순서 고정 · 노출 OX만</span>
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {PERSONAL_SLOTS.map((s) => {
          const isOn = on[s.code]; const list = cards[s.code]; const def = defKey[s.code];
          return (
            <div key={s.code} className={cn('flex flex-col rounded-[10px] border bg-white p-3', isOn ? 'border-[#cfc6ff]' : 'border-[var(--line2)] opacity-60')}>
              <div className="flex items-center gap-1.5">
                <span className="rounded-[5px] bg-[#ede9fe] px-1.5 py-0.5 text-[12px] font-extrabold tabular-nums text-[#6D4AFF]">{s.code}</span>
                <span className="text-[13px] font-bold text-[var(--ink)]">{s.label}</span>
                {list.length > 0 && <span className="rounded-full bg-[#ede9fe] px-1.5 py-0.5 text-[10px] font-bold text-[#6D4AFF]">{list.length}개</span>}
                <button type="button" onClick={() => setOn((p) => ({ ...p, [s.code]: !p[s.code] }))}
                  className={cn('ml-auto flex h-[18px] w-[32px] items-center rounded-full px-[2px] transition', isOn ? 'justify-end bg-[#6D4AFF]' : 'justify-start bg-[var(--line2)]')}
                  title={isOn ? '노출 ON' : '노출 OFF'}>
                  <span className="h-[14px] w-[14px] rounded-full bg-white shadow-sm" />
                </button>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--ink4)] [word-break:keep-all]">{s.desc}</p>

              {/* 등록된 코너 카드 N개 — 디폴트 1개(CVM 추천 없을 때 노출) 지정 */}
              {list.length > 0 ? (
                <div className="mt-2 space-y-1 border-t border-dashed border-[var(--line2)] pt-2">
                  {list.map((c) => {
                    const isDef = def === c.key;
                    return (
                      <div key={c.key} className="flex items-center gap-1.5 rounded-[6px] bg-[var(--th)] px-1.5 py-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={presetImg(c.key)} alt="" className="h-6 w-6 shrink-0 rounded-[4px] border border-[var(--line2)] object-cover" />
                        <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-[var(--ink2)]">{c.name}</span>
                        <button type="button" onClick={() => setDefKey((d) => ({ ...d, [s.code]: c.key }))}
                          className={cn('shrink-0 rounded-[4px] px-1.5 py-0.5 text-[10px] font-bold', isDef ? 'bg-[#6D4AFF] text-white' : 'border border-[var(--line2)] text-[var(--ink4)] hover:text-[#6D4AFF]')}
                          title="추천 없을 때 노출할 디폴트">{isDef ? '디폴트' : '디폴트 지정'}</button>
                        <button type="button" onClick={() => removeCard(s.code, c.key)} className="shrink-0 rounded-[4px] p-0.5 text-[var(--ink4)] hover:bg-white hover:text-[var(--bad)]"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    );
                  })}
                  <p className="pt-0.5 text-[10px] text-[var(--ink4)]">CVM이 {list.length}개 중 1개 노출 · 추천 없으면 <b className="text-[var(--ink3)]">디폴트</b> 노출</p>
                </div>
              ) : (
                <div className="mt-2 border-t border-dashed border-[var(--line2)] pt-2 text-[11px] text-[var(--ink4)]">
                  카드 <b className="text-[#6D4AFF]">N개 등록</b> → CVM이 <b className="text-[#6D4AFF]">1개만 노출</b> · 디폴트 1개 상시
                </div>
              )}

              <button type="button" onClick={() => setPicking({ code: s.code, label: s.label })}
                className="mt-2 flex w-full items-center justify-center gap-1 rounded-[8px] border border-dashed border-[#cfc6ff] bg-[#f6f4ff] py-1.5 text-[11px] font-bold text-[#6D4AFF] hover:bg-[#ede9fe]">
                <Plus className="h-3.5 w-3.5" /> 코너 등록
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-[var(--ink4)]">* 운영자 편성 없음(CVM 연동만) · 노출 순서 1-1 → 1-2 → 1-3 고정 · 각 슬롯은 OX로만 끄고 켭니다. 아래 ‘코너 구성’은 운영(고정형) 영역입니다.</p>

      {picking && (
        <SlotRegisterModal slotCode={picking.code} slotLabel={picking.label} already={new Set(cards[picking.code].map((c) => c.key))}
          onClose={() => setPicking(null)} onAdd={(picks) => addToSlot(picking.code, picks)} />
      )}
    </section>
  );
}

/* ───────── 템플릿 카드(= order3 '컨테이너' 카드) ───────── */
function TemplateCard({ t, corners, onCornersChange, idx, open, active, onToggle, onActivate, selCorner, onSelCorner, onAddCorner, libCorners, onPreviewFallback, onToast, hiddenIds, onToggleHidden }: {
  t: PTemplate; corners: PCorner[]; onCornersChange: React.Dispatch<React.SetStateAction<PCorner[]>>;
  idx: number; open: boolean; active: boolean;
  onToggle: () => void; onActivate: () => void;
  selCorner: string | null; onSelCorner: (id: string) => void;
  onAddCorner: (zone?: Zone) => void; libCorners: LibCorner[]; onPreviewFallback: (on: boolean) => void; onToast: (m: string) => void;
  hiddenIds: Set<string>; onToggleHidden: (tcid: string) => void;
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
          {/* 2026-11-25 사용자 요청: 개인화 영역은 코너 구성 위 별도 블록(PersonalZoneBand) 폐지 → 코너 구성 안 '개인화 영역' 섹션으로 통일. */}
          <div>
            {/* 타이틀↔카드 간격 확보(2026-11-19 사용자 요청: 너무 붙어 있음) — 폰트 키우고 아래 여백 확대 */}
            <p className="mb-3.5 text-[14px] font-bold text-[var(--ink)]">코너 구성 <span className="font-semibold text-[var(--ink4)]">{corners.length}개</span> <span className="ml-1 text-[11px] font-normal text-[var(--ink4)]">드래그로 순서 변경 · 고정/개인화는 코너별 설정</span></p>
            {/* order3 레퍼런스: 좌측 순서변경 박스만 그레이 배경 + 해상도 기준 고정 높이(내부 스크롤) + 코너 추가 하단 고정.
               코너가 0개여도 밴드(Fixed·Dynamic)는 항상 표시 — 각 밴드에 '추가 가능' 노출(2026-10-21). */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[360px_minmax(0,1fr)] lg:h-[calc(100vh-300px)] lg:min-h-[420px]">
              {/* 코너 순서변경 박스 — 그레이 배경, 리스트 스크롤. 코너 추가는 각 영역(픽스·개인화·운영) 안의 버튼으로만(2026-11-25 사용자 요청: 하단 중복 제거). */}
              <div className="flex min-h-0 flex-col rounded-[12px] border border-[var(--line2)] bg-[var(--th)] p-2.5">
                <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
                  <BandedCorners corners={corners} onCornersChange={onCornersChange} templateId={t.id} selCorner={selCorner}
                    onSelect={(id) => { onActivate(); onSelCorner(id); }} onAddCorner={onAddCorner} onToast={onToast}
                    hiddenIds={hiddenIds} onToggleHidden={onToggleHidden} />
                </div>
              </div>
              {/* 코너 상세 — 독립 스크롤 */}
              <div className="min-h-0 overflow-y-auto pr-0.5">
                <CornerDetail template={t} corner={selected} index={selIndex} libCorners={libCorners} onPreviewFallback={onPreviewFallback}
                  onFallbackChange={(fb) => { if (selected) onCornersChange((prev) => prev.map((c) => c.templateCornerId === selected.templateCornerId ? { ...c, fallback: fb } : c)); }}
                  onRecSourceChange={(src) => { if (selected) onCornersChange((prev) => prev.map((c) => c.templateCornerId === selected.templateCornerId ? { ...c, recSource: src, isCvm: src.startsWith('CVM') } : c)); }}
                  onOptionsChange={(opts, ctaLabel) => { if (selected) onCornersChange((prev) => prev.map((c) => c.templateCornerId === selected.templateCornerId ? { ...c, preview: applyOptsToPreview(c.preview, opts, ctaLabel) } : c)); }}
                  onPreviewPatch={(patch) => { if (selected) onCornersChange((prev) => prev.map((c) => c.templateCornerId === selected.templateCornerId ? { ...c, preview: c.preview ? { ...c.preview, ...patch } : c.preview } : c)); }}
                  onPersonalChange={(on) => {
                    if (!selected) return;
                    const target: Zone = on ? 'personal' : 'dynamic';
                    onCornersChange((prev) => prev.map((c) => c.templateCornerId === selected.templateCornerId ? { ...c, zone: target } : c)); // 낙관적
                    setTestCornerZone(t.id, selected.templateCornerId, target).catch(() => onToast('구성 방식을 저장하지 못했습니다.'));
                  }}
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
  // 업무 진입형 = 퀵메뉴형으로 표기(2026-11-26 사용자 요청: 탭형 → 퀵메뉴형).
  if (c.cornerType === '업무 진입형') return '퀵메뉴형';
  return displayLayout(c.cornerType, raw) || raw;
}
function LoadCornerModal({ corners, targetZone, onClose, onAdd, onToast, initialPicked, title, addLabel }: { corners: LibCorner[]; targetZone?: Zone; onClose: () => void; onAdd: (cs: LibCorner[]) => void; onToast: (m: string) => void; initialPicked?: string[]; title?: string; addLabel?: string }) {
  const personalMode = targetZone === 'personal'; // 개인화 영역 등록 → 수동 전용 유형은 선택 불가
  const [q, setQ] = React.useState('');
  const [tab, setTab] = React.useState('전체');
  // 그룹 키 = 혜택형은 중분류(제휴사형·미션형…), 그 외(배너형)는 유형. 탭·칩·접기 기준.
  const gk = (c: Pick<LibCorner, 'cornerType' | 'subType'>) => c.subType ?? c.cornerType;
  // 최상위(top) — 혜택형 카탈로그(subType 있음)는 '혜택형', 그 외(배너형)는 유형 그대로. 3뎁스: top › mid › layout(2026-11-25).
  const topOf = (c: Pick<LibCorner, 'cornerType' | 'subType'>) => (c.subType ? '혜택형' : c.cornerType);
  // 껍데기 단위로 접기 — 같은 (그룹 · 배열) 는 대표 하나만. 제목 = '혜택형 › 제휴사형 › 리스트형' 3뎁스 경로.
  const shells = React.useMemo(() => {
    const seen = new Set<string>(); const out: (LibCorner & { shell: string; shellTop: string; shellTitle: string })[] = [];
    for (const c of corners) {
      // 혜택형(subType)은 카탈로그 레이아웃명(리스트형·출석체크형·룰렛형…)으로 구분 — detail이 같아도 접히지 않게.
      const sl = c.subType ? (c.layout ?? shellLayout(c)) : shellLayout(c);
      const key = `${c.cornerType}|${c.subType ?? ''}|${sl}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const top = c.subType ? '혜택형' : c.cornerType;
      const lay = layoutLabel(sl) || sl;
      const title = c.subType ? `${top} › ${c.subType} › ${lay}` : `${top} › ${lay}`;
      out.push({ ...c, shell: sl, shellTop: top, shellTitle: title });
    }
    return out;
  }, [corners]);
  // 상단 탭 = 전체 + 최상위 코너 유형(혜택형·배너형·업무 진입형). 중분류(제휴사형 등)가 아니라 유형으로 묶는다(2026-11-26 사용자 요청).
  const TOP_ORDER = ['혜택형', '배너형', '업무 진입형'];
  const TABS = React.useMemo(() => {
    const set = new Set(shells.map((c) => (c.subType ? '혜택형' : c.cornerType)));
    return ['전체', ...TOP_ORDER.filter((t) => set.has(t)), ...[...set].filter((t) => !TOP_ORDER.includes(t))];
  }, [shells]);
  const countOf = (t: string) => (t === '전체' ? shells.length : shells.filter((c) => topOf(c) === t).length);
  const list = shells.filter((c) => (tab === '전체' || topOf(c) === tab) && (!q || c.shellTitle.includes(q) || gk(c).includes(q)));
  // 멀티셀렉 — 체크된 코너 집합 + 우측 미리보기용 포커스
  const [picked, setPicked] = React.useState<Set<string>>(new Set(initialPicked ?? []));
  const [focusId, setFocusId] = React.useState<string | null>(shells[0]?.id ?? null);
  const sel = shells.find((c) => c.id === focusId) ?? null;
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex h-[82vh] w-full max-w-[1040px] overflow-hidden rounded-[16px] bg-white shadow-[var(--dlg-shadow)]" onClick={(e) => e.stopPropagation()}>
        {/* 좌: 유형 상단 탭 + 검색 + 코너 목록 */}
        <div className="flex w-[380px] shrink-0 flex-col border-r border-[var(--line2)]">
          <div className="flex items-center justify-between px-5 pt-4">
            <h3 className="text-[17px] font-bold text-[var(--ink)]">{title ?? '코너 추가'} <span className="ml-1 text-[13px] font-medium text-[var(--ink4)]">코너 유형 관리</span></h3>
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
                  {cornerTypeLabel(t) || t}<span className={cn(active ? 'text-white/80' : 'text-[var(--ink4)]')}>{cnt}</span>
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
              const blocked = personalMode && !c.canPersonal; // 개인화 영역 등록인데 수동 전용 → 선택 불가
              return (
                // 카드 본문 클릭 = 미리보기(보기)만, 선택(추가 대상)은 체크박스로 분리 — 다시 보려고 눌러도 선택이 꺼지지 않게(2026-11-10 사용자 요청).
                <div key={c.id} role="button" tabIndex={0} onClick={() => setFocusId(c.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFocusId(c.id); } }}
                  className={cn('flex w-full cursor-pointer items-start gap-2.5 rounded-[10px] border px-3.5 py-3 text-left transition', blocked && 'opacity-55', on ? 'border-[var(--ac)] bg-[var(--ac2)]' : focusId === c.id ? 'border-[var(--line3)] bg-[var(--th)]' : 'border-[var(--line2)] hover:border-[var(--line3)]')}>
                  <button type="button" aria-label="이 코너 선택" disabled={blocked} onClick={(e) => { e.stopPropagation(); if (blocked) { onToast('이 코너 유형은 수동(운영자 지정) 전용이라 개인화 영역에 등록할 수 없어요.'); return; } toggle(c.id); setFocusId(c.id); }}
                    className={cn('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border transition', blocked ? 'cursor-not-allowed border-[var(--line3)] bg-[var(--th)]' : on ? 'border-[var(--ac)] bg-[var(--ac)] text-white' : 'border-[var(--line3)] bg-white hover:border-[var(--ac)]')}>{on && !blocked && <Check className="h-3 w-3" />}</button>
                  {/* 3뎁스 — 위: 혜택형(칩) + 운영여부 배지 · 아래: 제휴사형(중분류) 굵게 + 리스트형(배열)은 보조 (2026-11-25 사용자 요청: 중분류가 배열보다 중요). */}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 text-[11px] text-[var(--ink4)]">
                      <span className={cn(cornerTypeChipClass(c.shellTop), 'shrink-0')}>{c.shellTop}</span>
                      <span className={cn('ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold', c.canPersonal ? 'bg-[#F2ECFB] text-[#6D28D9]' : 'bg-[#eef0f2] text-[#697582]')}>{c.operMode}</span>
                    </span>
                    <span className="mt-1 flex min-w-0 items-baseline gap-1.5">
                      <span className="truncate text-[14px] font-bold text-[var(--ink)]">{c.subType ?? (layoutLabel(c.shell) || c.shell || c.cornerType)}</span>
                      {c.subType && <span className="shrink-0 text-[12px] font-medium text-[var(--ink4)]">{layoutLabel(c.shell) || c.shell}</span>}
                      {blocked && <span className="shrink-0 text-[11px] font-semibold text-[#b3b9c0]">· 개인화 불가</span>}
                    </span>
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
            {sel ? (
              // 제휴사형(중분류)이 리스트형(배열)보다 중요 — 중분류 굵게, 배열은 보조(2026-11-25 사용자 요청).
              <span className="flex min-w-0 items-baseline gap-1.5">
                {sel.subType && <span className="shrink-0 text-[12px] font-medium text-[var(--ink4)]">{sel.shellTop} ›</span>}
                <span className="truncate text-[16px] font-bold text-[var(--ink)]">{sel.subType ?? (layoutLabel(sel.shell) || sel.shell || sel.cornerType)}</span>
                {sel.subType && <span className="shrink-0 text-[13px] font-medium text-[var(--ink4)]">{layoutLabel(sel.shell) || sel.shell}</span>}
              </span>
            ) : <span className="text-[16px] font-bold text-[var(--ink)]">코너를 선택하세요</span>}
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
    {/* 혜택형(subType)은 코너 유형 관리·빌더와 '동일한' 렌더러(BenefitCornerPreview, 전 요소 ON)로 — 불러오기/미리보기 UI 일치(2026-11-26 사용자 요청). 그 외(배너형·업무진입형)는 껍데기 가이드. */}
                    {sel.subType
                      ? <BenefitCornerPreview mid={sel.subType} layout={sel.layout ?? sel.shell} variant="detail" />
                      : <CornerBlock corner={sel.preview} />}
                  </div>
                </div>
                <p className="mb-2 mt-5 text-[14px] font-bold text-[var(--ink)]">기본 노출 조건</p>
                <div className="rounded-[10px] bg-[var(--th)] px-4 py-3 text-[13px] leading-relaxed text-[var(--ink2)]">
                  <b className="text-[var(--ink3)]">WHEN</b> 코너 유형 = <b className="text-[var(--ac)]">{sel.subType ?? sel.cornerType}</b> · 껍데기(레이아웃·노출 타입)만 들어옵니다. 내용은 추가 후 <b>② 수급</b>에서 채웁니다.
                </div>
              </>
            ) : <p className="py-10 text-center text-[13px] text-[var(--ink4)]">왼쪽에서 코너를 선택하세요.</p>}
          </div>
          <div className="border-t border-[var(--line2)] p-4">
            <button type="button" disabled={picked.size === 0} onClick={() => onAdd(corners.filter((c) => picked.has(c.id)))}
              className="h-[48px] w-full rounded-[10px] bg-[var(--ac)] text-[15px] font-bold text-white hover:bg-[var(--ac-h)] disabled:opacity-50">{addLabel ?? '이 코너 추가'}{picked.size > 0 ? ` (${picked.size})` : ''}</button>
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
  const [loadModal, setLoadModal] = React.useState<{ tid: string; zone?: Zone } | null>(null); // 코너 불러오기 모달(대상 템플릿 + 등록할 영역)
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
  // 노출 토글(코너 카드)로 숨긴 코너 — 좌측 미리보기에서도 빠진다(2026-11-12 사용자 요청). templateCornerId 기준.
  const [hiddenIds, setHiddenIds] = React.useState<Set<string>>(new Set());
  const onToggleHidden = React.useCallback((tcid: string) => setHiddenIds((prev) => { const n = new Set(prev); n.has(tcid) ? n.delete(tcid) : n.add(tcid); return n; }), []);

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
    // '왔다갔다' 버그(2026-11-26) 근본 원인 — pv-(미리보기)와 chip-(리스트)이 '공통 바깥 스크롤러'를 공유하는데,
    //  네이티브 scrollIntoView는 모든 스크롤 조상을 움직여 그 공통 스크롤러를 pv 위치→chip 위치로 연달아 당긴다.
    //  개인화 코너(룰렛·출석체크)는 선택 시 개인화 박스가 추가돼 레이아웃이 밀리면서 이 당김이 더 크게 겹쳐 튄다.
    //  → 각 앵커를 '가장 가까운(전용) 스크롤러' 안에서만, 보이지 않을 때만 이동. 공통 바깥 스크롤러는 건드리지 않아 싸움이 사라진다.
    const scrollWithinNearest = (id: string) => {
      const el = document.getElementById(id);
      if (!el) return;
      let sc: HTMLElement | null = el.parentElement;
      while (sc) {
        const o = getComputedStyle(sc).overflowY;
        if ((o === 'auto' || o === 'scroll') && sc.scrollHeight > sc.clientHeight + 1) break;
        sc = sc.parentElement;
      }
      if (!sc) return;
      const er = el.getBoundingClientRect(), cr = sc.getBoundingClientRect();
      if (er.top < cr.top) sc.scrollTop -= cr.top - er.top;
      else if (er.bottom > cr.bottom) sc.scrollTop += er.bottom - cr.bottom;
      // 이미 전부 보이면 아무것도 하지 않는다(튐 방지).
    };
    // 레이아웃(개인화 박스)이 자리잡은 뒤 한 번만 이동 — 리플로우 도중 측정으로 인한 튐 방지.
    const raf = requestAnimationFrame(() => {
      scrollWithinNearest(`pv-${activeSel}`);
      scrollWithinNearest(`chip-${activeSel}`);
    });
    return () => cancelAnimationFrame(raf);
  }, [activeSel, liveCorners.length]);

  // Figma BO 공통 textfield 토큰 — h38·r6·inset-x 14·본문 14·border #c4c9cf·포커스 border #b3b9c0+ring 2 #dce0e5
  const inputCls = 'h-[38px] w-full rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-[14px] text-[14px] text-[var(--ink)] placeholder:text-[var(--ink5)] focus:border-[var(--focus-border)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]';

  // 미리보기 컨트롤 — 디바이스 선택·줌·전체화면(SB 디바이스 프레임, 2026-11-17 사용자 요청).
  const [deviceIdx, setDeviceIdx] = React.useState(1); // 기본 iPhone 15 Pro (0=최소 폭)
  const device = DEVICE_PRESETS[deviceIdx];
  // 미리보기는 좌측 열(좁힘)에 맞춰 리플로우 — 사이즈 조절(줌) 제거(2026-11-19 사용자 요청).
  const [fullscreen, setFullscreen] = React.useState(false);
  // 디바이스 높이 — CSS 변수로 관리(하드코딩 금지, 2026-11-19 정식 스펙).
  //  height = clamp(414px, calc(var(--sc-h) − var(--seg-h) − var(--gap) − var(--dev-bottom)), 800px)
  //  너비는 aspect-ratio(기기 비율)로 자동 계산 — 고정하지 않음. transform:scale 금지, 프레임 overflow로 하단 잘라내기 금지.
  //  가용 높이 = 스크롤 컨테이너(상단 탭바·하단 액션바 사이 메인 영역) clientHeight − 세그먼티드 컨트롤 행 − 간격 − 하단 여백.
  //   고정값 아닌 --sc-h(컨테이너)·--seg-h(컨트롤 행)는 ResizeObserver로 실측해 변수에 주입. window(100vh/100dvh) 대신 실제 스크롤 컨테이너 기준이라 sticky가 유지된다.
  const stickyRef = React.useRef<HTMLDivElement>(null); // 좌측 컬럼(컨트롤 행 + 디바이스) = sticky 래퍼, 변수 보유
  const segRef = React.useRef<HTMLDivElement>(null);    // 세그먼티드 컨트롤 행(기본/폴백·디바이스)
  React.useEffect(() => {
    let ro: ResizeObserver | null = null;
    let raf = 0;
    const onResize = () => wire();
    function wire() {
      const wrap = stickyRef.current, seg = segRef.current;
      // 아직 DOM이 안 붙었으면 다음 프레임에 재시도(마운트 타이밍에 ref가 비어도 결국 변수를 채운다).
      if (!wrap || !seg) { raf = requestAnimationFrame(wire); return; }
      // 스크롤 컨테이너 = 가장 가까운 overflow-y auto/scroll 조상(= 헤더+2열을 담은 .overflow-y-auto)
      let sc: HTMLElement | null = wrap.parentElement;
      while (sc) { const o = getComputedStyle(sc).overflowY; if (o === 'auto' || o === 'scroll') break; sc = sc.parentElement; }
      const apply = () => {
        wrap.style.setProperty('--sc-h', `${sc ? sc.clientHeight : window.innerHeight}px`);
        wrap.style.setProperty('--seg-h', `${Math.round(seg.getBoundingClientRect().height)}px`);
      };
      apply();
      ro = new ResizeObserver(apply);
      if (sc) ro.observe(sc);
      ro.observe(seg);
    }
    wire();
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); ro?.disconnect(); window.removeEventListener('resize', onResize); };
  }, []);
  // 개인화 영역(1-1~1-3) 미리보기 — 혜택 카테고리 칩 바로 하위(디바이스 최상단). ON 슬롯의 디폴트 카드(또는 첫 카드) 1개를 프리셋 이미지로 노출.
  //  저장된 personalSlots에서 읽는다(등록/토글 → 저장 → router.refresh로 반영). CVM 실서비스는 N개 중 1개 택1이지만 빌더 미리보기는 디폴트(폴백)만.
  const personalPreview = (() => {
    const slots = parsePersonalSlots(activeTemplate?.personalSlots);
    const shown = SLOT_CODES
      .map((code) => ({ code, label: PERSONAL_SLOTS.find((s) => s.code === code)?.label ?? code, slot: slots[code] }))
      .filter((x) => x.slot.on && x.slot.cards.length > 0);
    if (shown.length === 0) return null;
    return (
      <div className="mb-2 space-y-2">
        {shown.map(({ code, label, slot }) => {
          const key = slot.defaultKey && slot.cards.some((c) => c.key === slot.defaultKey) ? slot.defaultKey : slot.cards[0].key;
          return (
            <div key={code} className="overflow-hidden rounded-xl border border-[#e4e0ff] bg-white shadow-sm">
              <div className="flex items-center gap-1 bg-[#f6f4ff] px-2.5 py-1 text-[10px] font-bold text-[#6D4AFF]">
                <span className="rounded-[4px] bg-[#ede9fe] px-1 py-0.5 tabular-nums">{code}</span>
                <span>{label} · 개인화</span>
                <span className="ml-auto font-medium text-[#9b8cff]">{slot.cards.length}개 중 1개</span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={presetImg(key)} alt="" className="block w-full" />
            </div>
          );
        })}
      </div>
    );
  })();

  // 미리보기 본문(코너 매핑) — 디바이스 프레임·전체화면 모달에서 공용. 선택/폴백/숨김 로직 포함.
  // 코너 1개 미리보기 렌더 — 메인/전체화면 공용. (CVM 콘텐츠 자리 · 미노출 · 일반 카드)
  const renderPreviewCorner = (c: PCorner) => {
    if (!activeTemplate) return null;
    // 메인홈 인사말 + 혜택 바코드 오퍼 — CVM 자리 placeholder 대신 SB [홈]유형 실제 카드로(2026-11-25 사용자 요청: 메인홈 UI 맞춤).
    if (/혜택 바코드/.test(c.name) && c.preview) {
      return (
        <div key={c.id} id={`pv-${c.id}`} onClick={() => setSelCorner((m) => ({ ...m, [activeTemplate.id]: c.id }))}
          className={cn('cursor-pointer scroll-mt-4 rounded-[20px] ring-offset-2 transition', c.id === activeSel && 'ring-2 ring-[var(--ac)]')}>
          <MainHomeOfferCard corner={c.preview} />
        </div>
      );
    }
    const hidden = fbMode && c.isCvm && c.fallback === '미노출';
    const replaced = fbMode && c.isCvm && c.fallback === '운영자 편성으로 대체';
    // 메인홈 코너는 CVM이어도 '구좌 placeholder' 대신 실제 콘텐츠로 그린다(SB [홈]유형 UI 맞춤, 2026-11-25 사용자 요청).
    const cvmContent = c.recSource === 'CVM 콘텐츠 연동' && !hidden && !replaced && !/메인홈/.test(c.name);
    if (cvmContent) {
      // 뚫려있는 구좌 — CVM 콘텐츠 연동(개인화)은 이미지·문구·랜딩까지 CVM이 런타임에 내려주므로 빌더에선 내용을 그리지 않고 '빈 구좌'로만 표시(2026-11-26 사용자 요청).
      return (
        <div key={c.id} id={`pv-${c.id}`} onClick={() => setSelCorner((m) => ({ ...m, [activeTemplate.id]: c.id }))}
          className={cn('group flex min-h-[132px] cursor-pointer flex-col items-center justify-center gap-1.5 scroll-mt-4 rounded-[20px] border-2 border-dashed border-[#c3b4f2] bg-[#f6f3ff] px-4 py-7 text-center transition hover:border-[var(--ac)]', c.id === activeSel && 'border-[var(--ac)] ring-2 ring-[var(--ac)] ring-offset-2')}>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold text-[#6D28D9]"><Sparkles className="h-3 w-3" />개인화 구좌</span>
          <p className="text-[12px] font-bold text-[var(--ink2)]">{c.name}</p>
          <p className="text-[11px] leading-relaxed text-[var(--ink4)]">이미지·문구·랜딩까지 <b className="text-[#6D28D9]">추천이 고객마다</b> 채웁니다 · 빌더엔 내용 미표시</p>
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
        className={cn('relative cursor-pointer scroll-mt-4 rounded-[28px] ring-offset-2 transition', c.id === activeSel && 'ring-2 ring-[var(--ac)]')}>
        {replaced && <span className="absolute right-1 top-1 z-10 rounded-[4px] bg-[#e59a2a] px-1.5 py-0.5 text-[9px] font-bold text-white">운영자 편성 대체</span>}
        {/* 전부 '코드'로 렌더 — 혜택형 코너는 SB 디자인을 코드로 재현한 BenefitPreviewCard. sbImage가 없어도 레이아웃에서 디자인 파생(옛 코너도 최신 카드로, 2026-11-25 사용자 요청). 그 외 유형은 CornerBlock. */}
        {(() => {
          // 추천질의형(홈 AI 질의 칩) — 전용 렌더(SB DSP_06 [홈]유형). layoutDetail/name으로 판정.
          const isRecQuery = /추천\s*질의/.test(`${c.layoutDetail ?? ''} ${c.name}`);
          if (isRecQuery && c.preview) return <RecQueryCard corner={c.preview} />;
          const isBenefit = c.cornerType === '혜택형' || c.cornerType === '혜택·오퍼형';
          const design = benefitDesignKey(c.sbImage) ?? (isBenefit ? (() => {
            const l = c.layoutDetail ?? c.layout ?? '';
            return /바코드/.test(l) ? 'barcode' as const : /출석/.test(l) ? 'attendance' as const : /룰렛/.test(l) ? 'roulette' as const : /캐러셀|가로/.test(l) ? 'carousel' as const : 'list' as const;
          })() : null);
          // 중분류(mid) — 코너명 '중분류 · 레이아웃'의 앞 토막(예: '이벤트형'). 한 디자인(리스트형 등)을 여러 중분류가 공유하므로
          //  BenefitPreviewCard에 넘겨 타이틀·아이템 플레이스홀더가 실제 중분류로 치환되게 한다(2026-11-25 버그픽스).
          const mid = isBenefit ? (() => { const seg = (c.name.split('·')[0] ?? '').trim(); return /형$/.test(seg) ? seg : undefined; })() : undefined;
          // 썸네일 모양·아이템 버튼 — sbImage가 있으면 경로로, 없으면 중분류로 판정(이벤트/이용지원=사각 썸네일, 미션 리스트=우측 라벨 버튼).
          const squareThumb = c.sbImage ? /event|support/.test(c.sbImage) : (mid === '이벤트형' || mid === '이용지원형');
          const itemButton = c.sbImage ? c.sbImage.includes('mission') : (mid === '미션형' && design === 'list');
          if (design && c.preview) {
            // 코너 불러오기 = 풀 패키지(모든 요소 ON) — 모달(BenefitCornerPreview)과 '동일한 UI'로. 배너·맥락 헤더·추가 인포·하단 CTA를
            //  기본 노출하되, 운영자가 입력한 텍스트(타이틀·맥락·인포·버튼 라벨)는 보존(2026-11-26 사용자 요청: 불러오기/미리보기 일치).
            const CTX_MIDS = new Set(['제휴사형', '이벤트형', '혜택프로그램형']);
            const fullPreview = {
              ...c.preview,
              bigBanner: true,
              contextHeader: c.preview.contextHeader || (mid ? CTX_MIDS.has(mid) : false),
              information: true,
              moreButtonUse: design !== 'barcode',
            };
            return <BenefitPreviewCard corner={fullPreview} design={design} mid={mid} squareThumb={squareThumb} itemButton={itemButton} />;
          }
          return <CornerBlock corner={c.recSource === 'CVM 데이터 연동'
            ? { ...c.preview, cvmFillCount: (c.preview?.cvmFillCount ?? 0) || 5, cvmFillMin: (c.preview?.cvmFillMin ?? 0) || 3 }
            : { ...c.preview, cvmFillCount: 0 }} />;
        })()}
      </div>
    );
  };
  // 미리보기 = 코너 리스트와 '같은 순서'로(2026-11-25 사용자 요청: 좌측 순서≠코너 순서 문제). 존 묶음 폐지.
  //  개인화 코너는 그 자리에서 보라 점선 박스로 감싸 '해당 고객만 노출'을 표시(순서는 유지).
  const visibleCorners = (activeTemplate ? liveCorners : []).filter((c) => !hiddenIds.has(c.templateCornerId));
  const previewBody = (activeTemplate && visibleCorners.length > 0) ? (
    <>
      {visibleCorners.map((c) => c.zone === 'personal' ? (
        <div key={c.templateCornerId} className="space-y-1.5 rounded-xl border-2 border-dashed border-[#c9b8f0] bg-[#faf8fe] p-2">
          <div className="flex items-center gap-1 px-0.5 text-[10px] font-extrabold text-[#6D28D9]">
            <Sparkles className="h-3 w-3" /><span>개인화 · 해당 고객만 노출 (비해당 시 미노출)</span>
          </div>
          {renderPreviewCorner(c)}
        </div>
      ) : renderPreviewCorner(c))}
    </>
  ) : (
    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 text-[13px] text-slate-400">코너 구성 시 미리보기가 표시됩니다.</div>
  );

  // 메인홈(AI 어시스턴트) — SB [홈]유형 배경(연보라 그라데이션) + 하단 AI 입력바(2026-11-25 사용자 요청: 메인홈 UI 맞춤).
  const isMainHome = /메인홈/.test(data.containerName);
  const mainHomeBg = 'bg-gradient-to-b from-[#fcfcff] via-[#f1f3ff] to-[#e6ebfb]';
  const mainHomeFooter = (
    <div className="shrink-0 bg-transparent px-3 pb-3 pt-2">
      <div className="flex items-center gap-2 rounded-full border border-[#dcdff2] bg-white px-3.5 py-2.5 shadow-[0_2px_10px_rgba(50,56,120,0.10)]">
        <Sparkles className="h-4 w-4 shrink-0 text-[#4b59ff]" />
        <span className="min-w-0 flex-1 truncate text-[13px] text-[#9aa0b4]">T에 대해 무엇이든 물어보세요</span>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#6a5cff] to-[#4b59ff] text-white"><ArrowRight className="h-3.5 w-3.5" /></span>
      </div>
    </div>
  );

  return (
    <ProductCatalogCtx.Provider value={data.catalogByType ?? {}}>
    <div className="relative flex h-full flex-col overflow-hidden rounded-t-[16px] border border-[var(--line2)] bg-white">
      {/* 헤더 + 2열을 한 스크롤 영역에 — 스크롤하면 헤더(타이틀)는 올라가고 디바이스는 sticky로 고정(2026-11-06 사용자 요청: 상품 전시 관리처럼). */}
      <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="px-6 pb-2 pt-4">
        {/* 브레드크럼 — 각 단계 클릭 시 상위(뒷) 페이지로 이동(2026-11-12 사용자 요청). 현재 페이지(컨테이너명)만 비링크. */}
        <nav className="flex flex-wrap items-center gap-1.5 text-[13px] leading-[18px] text-[var(--ink3)]">
          <Link href="/" className="hover:text-[var(--ink)] hover:underline">홈</Link><ChevronRight className="h-3.5 w-3.5 opacity-50" />
          <Link href="/admin/containers-test" className="hover:text-[var(--ink)] hover:underline">전시 관리</Link><ChevronRight className="h-3.5 w-3.5 opacity-50" />
          <Link href="/admin/containers-test" className="hover:text-[var(--ink)] hover:underline">전시화면 관리</Link>
          <ChevronRight className="h-3.5 w-3.5 opacity-50" /><b className="font-semibold text-[var(--ink)]">{data.containerName}</b>
        </nav>
        <div className="mt-1.5 flex items-center gap-2">
          <h1 className="text-[20px] font-bold leading-[28px] tracking-[-0.3px] text-[var(--ink)]">{data.containerName}</h1>
        </div>
      </div>

      {/* 2열 — 좌 디바이스(sticky) · 우 콘텐츠. 좌측 열은 max-content = 디바이스 폭에 딱 맞춤(옆 빈 공간 0) → 나머지는 전부 템플릿 정보로(2026-11-19 사용자 요청). */}
      <div className="grid grid-cols-1 items-start gap-6 px-6 pb-3 pt-1 xl:grid-cols-[max-content_minmax(0,1fr)]">
          {/* 좌: 미리보기 — sticky 래퍼(컨트롤 행 + 디바이스). position:sticky; top:0; align-self:flex-start.
              스크롤하면 타이틀은 올라가고 이 래퍼가 스크롤 컨테이너 상단에 고정 → 세그먼티드 컨트롤이 위에 딱 붙는다.
              --gap=컨트롤↔디바이스 간격, --dev-bottom=디바이스 하단 여백(10px). --sc-h/--seg-h는 위 effect가 실측 주입. */}
          <div ref={stickyRef} className="sticky top-0 flex flex-col self-start" style={{ '--gap': '8px', '--dev-bottom': '10px', '--dev-safe': '8px' } as React.CSSProperties}>
          {/* 미리보기 컨트롤(세그먼티드 행) — 한 줄 압축 바.
              좌: 기본/폴백(주 보기 모드) · 우: 디바이스·전체화면(보조). 좁아지면 wrap으로 접힌다. */}
          <div ref={segRef} className="w-full shrink-0">
            <div className="flex w-full flex-wrap items-center gap-x-2 gap-y-1.5">
              {/* 기본/폴백 — 주 보기 토글 */}
              <div className="flex shrink-0 rounded-[8px] border border-[var(--line2)] bg-[var(--th)] p-0.5 text-[12px] font-semibold">
                <button type="button" onClick={() => setFbMode(false)} className={cn('rounded-[6px] px-3.5 py-1 text-center', !fbMode ? 'bg-white text-[var(--ac)] shadow-sm' : 'text-[var(--ink3)]')}>기본</button>
                <button type="button" onClick={() => setFbMode(true)} className={cn('rounded-[6px] px-3.5 py-1 text-center', fbMode ? 'bg-white text-[#b67a12] shadow-sm' : 'text-[var(--ink3)]')}>폴백</button>
              </div>
              {/* 보조 컨트롤 묶음 — 디바이스·전체화면 (줌=사이즈 조절은 제거, 2026-11-19 사용자 요청) */}
              <div className="ml-auto flex items-center gap-1.5">
                <div className="relative">
                  <select value={deviceIdx} onChange={(e) => setDeviceIdx(Number(e.target.value))} title={`${device.w}×${device.h}`} className="h-[30px] max-w-[122px] appearance-none truncate rounded-[8px] border border-[var(--line2)] bg-white pl-2.5 pr-7 text-[12px] font-medium text-[var(--ink2)] focus:border-[var(--ac)] focus:outline-none">
                    {DEVICE_PRESETS.map((d, i) => <option key={d.label} value={i}>{d.label}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink4)]" />
                </div>
                <button type="button" onClick={() => setFullscreen(true)} title="전체화면으로 보기" className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[8px] border border-[var(--line2)] bg-white text-[var(--ink3)] hover:border-[var(--ac)] hover:text-[var(--ac)]"><Maximize2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            {/* 폴백 안내 캡션 제거(2026-11-19 사용자 요청: 디바이스가 내려와 불편) — 폴백 여부는 토글 색/디바이스로 충분 */}
          </div>
          {/* 디바이스 박스 — 높이=clamp(414px, 가용, 800px), 너비=aspect-ratio(기기 비율)로 자동. 하단 여백 --dev-bottom.
              프레임(fillBox)이 이 박스를 100% 채우고 바디만 내부 스크롤 → 프레임은 안 잘리고 네비는 위에 붙는다. */}
          <div
            className="mx-auto"
            style={{
              // 너비 = 기기 실제 논리 폭(예: iPhone 393px) 고정 → 콘텐츠(393px 기준 설계)가 안 잘리고 그대로 보인다(2026-11-25 사용자 요청).
              //  높이는 가용 공간으로 clamp하고 바디만 세로 스크롤(기기 비율에 묶어 폭을 줄이던 방식 폐지 — 가로 여백 낭비·우측 클리핑 해소).
              '--dev-h': 'clamp(414px, calc(var(--sc-h, 100dvh) - var(--seg-h, 40px) - var(--gap) - var(--dev-bottom) - var(--dev-safe)), 900px)',
              height: 'var(--dev-h)',
              width: `${device.w}px`,
              maxWidth: '100%',
              marginTop: 'var(--gap)',
              marginBottom: 'var(--dev-bottom)',
            } as React.CSSProperties}
          >
          <DeviceFrame width={device.w} bodyHeight={0} fillBox headerLabel={data.containerName} slim bodyClassName={isMainHome ? mainHomeBg : undefined} footer={isMainHome ? mainHomeFooter : undefined}>
                  {previewBody}
          </DeviceFrame>
          </div>
        </div>

        {/* 전체화면 미리보기 — 같은 previewBody 재사용 + 기본/폴백(2026-11-17 사용자 요청) */}
        {fullscreen && (
          <div className="fixed inset-0 z-[60] flex flex-col bg-[#0b0f1a]/80 p-6" onClick={() => setFullscreen(false)}>
            <div className="mx-auto mb-3 flex w-full max-w-[560px] items-center gap-2 text-white" onClick={(e) => e.stopPropagation()}>
              <span className="truncate text-[13px] font-semibold">{data.containerName} · {device.label} · {device.w}×{device.h}</span>
              <div className="ml-auto flex items-center gap-2">
                <div className="flex rounded-[8px] bg-white/10 p-0.5 text-[12px] font-semibold">
                  <button type="button" onClick={() => setFbMode(false)} className={cn('rounded-[6px] px-3 py-1', !fbMode ? 'bg-white text-[var(--ac)]' : 'text-white/80')}>기본</button>
                  <button type="button" onClick={() => setFbMode(true)} className={cn('rounded-[6px] px-3 py-1', fbMode ? 'bg-white text-[#b67a12]' : 'text-white/80')}>폴백</button>
                </div>
                <button type="button" onClick={() => setFullscreen(false)} title="닫기" className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 justify-center overflow-auto py-1">
              <div className="h-full shrink-0" style={{ width: device.w }} onClick={(e) => e.stopPropagation()}>
                <DeviceFrame width={device.w} bodyHeight={0} fill headerLabel={data.containerName} slim bodyClassName={isMainHome ? mainHomeBg : undefined} footer={isMainHome ? mainHomeFooter : undefined}>{previewBody}</DeviceFrame>
              </div>
            </div>
          </div>
        )}

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
                    onAddCorner={(zone) => setLoadModal({ tid: t.id, zone })}
                    libCorners={data.libCorners}
                    onPreviewFallback={setFbMode}
                    onToast={toast}
                    hiddenIds={hiddenIds}
                    onToggleHidden={onToggleHidden}
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
          targetZone={loadModal?.zone}
          onToast={toast}
          onClose={() => setLoadModal(null)}
          onAdd={async (cs) => {
            const tid = loadModal?.tid;
            const zone = loadModal?.zone;
            setLoadModal(null);
            if (tid && cs.length) {
              // 코너 유형(카탈로그)에서 새 코너 껍데기를 생성해 배치 — 코너 유형 관리와 연동(2026-10-28). zone=등록 영역(픽스/개인화/운영).
              const created = await addCornersFromTypes(tid, cs.map((c) => c.id), zone);
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


