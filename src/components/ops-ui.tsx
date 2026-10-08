// 운영 관리 공용 UI — 상태 칩 / 섹션 / 필드 행.
//  ── 상태 칩 공식 규격 (2026-10-08 사용자 제공 「통합 공지사항 목록」 시안 기준) ──
//    · 라운드 6px 사각형 (완전 알약 아님) · 높이 26 · 좌우 10 · 12px / 600
//    · 테두리 없이 연한 톤 배경 + 진한 글자. 점(dot) 장식 없음
//    · 톤: 성공(승인완료) 초록 · 반려 빨강 · 진행(게시중) 파랑 · 대기 주황 · 중립(임시저장·미게시) 회색
import * as React from 'react';
import { cn } from '@/lib/utils';
import { CHIP_BASE } from '@/lib/display-taxonomy';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * 상태 칩 톤 — 디자인 시스템 [BO-AX] COMPNT Lib v1.8 의 badge 토큰.
 * **이 5종이 전부다.** 보라/인디고 등 다른 색 칩은 존재하지 않는다.
 *   info     bg #D9E9FF / text #2E7AFF   (승인완료)
 *   success  bg #C8F6E1 / text #038E52   (승인대기)
 *   negative bg #FFDCDC / text #ED3B3E   (반려)
 *   neutral  bg #DCE0E5 / text #454F59   (임시저장)
 *   warning  bg #FFE4C4 / text #D66400   (요청취소)
 */
export const TONES = {
  info:      'bg-[#d9e9ff] text-[#2e7aff]',
  success:   'bg-[#c8f6e1] text-[#038e52]',
  negative:  'bg-[#ffdcdc] text-[#ed3b3e]',
  warning:   'bg-[#ffe4c4] text-[#d66400]',
  neutral:   'bg-[#dce0e5] text-[#454f59]',
  emphasis:  'bg-[#e1e3ff] text-[#3617ce]',
  highlight: 'bg-[#ffe9a8] text-[#d17e28]',
} as const;
export type Tone = keyof typeof TONES;
// 예전 이름 → 5종 매핑 (보라/인디고 계열은 info 로 흡수)
const TONE_ALIAS: Record<string, Tone> = {
  green: 'success', ok: 'success',
  red: 'negative', bad: 'negative', destructive: 'negative',
  amber: 'warning', orange: 'warning',
  blue: 'info', indigo: 'info', ac: 'info', emphasis: 'info', highlight: 'info', default: 'info',
  slate: 'neutral', gray: 'neutral', muted: 'neutral', secondary: 'neutral', outline: 'neutral',
};

/** 상태 라벨 → 톤. 새 상태어가 생기면 여기만 고친다. (5종 외 색은 쓰지 않는다) */
const STATUS_TONE: Record<string, Tone> = {
  // 승인
  승인완료: 'info', 승인요청: 'success', 승인대기: 'success', 승인반려: 'negative', 반려: 'negative',
  임시저장: 'neutral', 요청취소: 'warning',
  // 게시 · 노출 · 전시
  게시중: 'success', 전시: 'success', 노출: 'success', 사용: 'success', 사용중: 'success',
  게시예정: 'warning', 검수중: 'warning', '검수 중': 'warning', 일시중단: 'warning',
  게시종료: 'neutral', 미게시: 'neutral', 미사용: 'neutral',
  미전시: 'negative', 미노출: 'negative',
  // 적용 · 배포
  적용중: 'success', 적용예정: 'warning', 적용종료: 'neutral',
  배포완료: 'info', 배포예정: 'warning', 배포대기: 'warning', 배포중: 'success',
  // 전시 상태 10종(DISPLAY_STATUSES) · 컨테이너 승인 4종 — 공백 제거 키로 매칭된다
  초안작성중: 'neutral', 작성중: 'neutral', 검수대기: 'warning', 수정필요: 'negative',
  예약대기: 'warning', 게시중지: 'negative', 종료: 'neutral', 롤백완료: 'neutral', 개인화제한: 'warning',
  // 기타
  'URL 확정대기': 'warning', 'URL 미등록': 'neutral',
};
export const statusTone = (label: string): Tone => {
  const k = (label ?? '').trim();
  // '승인 대기' 처럼 띄어쓰기가 섞여 들어와도 같은 톤으로 판정한다.
  return STATUS_TONE[k] ?? STATUS_TONE[k.replace(/\s+/g, '')] ?? 'neutral';
};

/**
 * 상태 칩 — 공식 규격. tone 을 주지 않으면 라벨로 자동 판정한다.
 * dot 인자는 하위호환용으로 받기만 하고 표시하지 않는다(시안에 점 장식 없음).
 */
export function StatusPill({ label, tone, dot: _dot }: { label: string; tone?: string; dot?: boolean }) {
  const t: Tone = tone ? (TONE_ALIAS[tone] ?? (tone as Tone)) : statusTone(label);
  return (
    <span className={cn(CHIP_BASE, TONES[t] ?? TONES.neutral)}>
      {label}
    </span>
  );
}

/**
 * 목록 섹션 헤더 — 「조회결과 총 N건」 + 우측 액션/페이저.
 * 시안 기준: 제목 17px/700, 건수 13px/400(숫자만 볼드 · 색은 넣지 않는다), 표와 12px 간격.
 */
export function ListHeader({
  title = '조회결과',
  count,
  unit = '건',
  prefix = '총',
  right,
  className,
}: {
  title?: string;
  count?: number | string;
  unit?: string;
  prefix?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mt-8 mb-3 flex flex-wrap items-center justify-between gap-3', className)}>
      <div className="flex items-baseline gap-1">
        <h3 className="text-[20px] font-bold leading-[28px] tracking-[-0.6px] text-[var(--ink)]">{title}</h3>
        {count !== undefined && (
          <span className="text-[14px] leading-[20px] text-[var(--ink2)]">
            {prefix} <b className="font-bold tabular-nums">{count}</b>{unit}
          </span>
        )}
      </div>
      {right && <div className="flex shrink-0 flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}

/**
 * ~여부 컬럼 값 — 표에서는 전부 Y/N 으로 쓴다 (2026-10-08 사용자 지정).
 *  '사용/미사용', '전시/미전시', '노출/미노출', '답변완료/답변대기' 처럼 뜻이 같은데 말만 다른
 *  라벨이 표마다 흩어져 있어 스캔이 어려웠다. 표기는 Y/N 으로 통일하고 원래 라벨은 title 로 남긴다.
 *  Y = success(초록) · N = neutral(회색).
 */
export function YN({ yes, label }: { yes: boolean; label?: string }) {
  // 칩이 아니라 본문 텍스트로 쓴다(2026-10-08 사용자 지정).
  //  Y/N 은 값이 둘뿐이라 칩을 입히면 표 안에서 상태 칩(승인·게시 등)과 섞여 눈에 더 걸린다.
  return <span className="text-[14px] leading-[20px] text-[var(--ink)]" title={label}>{yes ? 'Y' : 'N'}</span>;
}

/** 긍정 라벨 목록 — 이 중 하나면 Y. 3상태(검수 중 등)는 null 을 돌려 호출부에서 따로 처리한다. */
const YES_LABELS = ['사용', '사용중', '사용함', '노출', '전시', '답변완료', '완료', 'Y', '예'];
const NO_LABELS = ['미사용', '사용안함', '미노출', '미전시', '답변대기', '대기', 'N', '아니오'];
export function ynOf(label: string): boolean | null {
  const k = (label ?? '').replace(/\s+/g, '');
  if (YES_LABELS.includes(k)) return true;
  if (NO_LABELS.includes(k)) return false;
  return null; // 3상태(예: '검수 중') — Y/N 으로 표현 불가
}

/** 라벨을 받아 Y/N 으로. Y/N 으로 못 바꾸는 값(검수 중 등)은 원래 상태 칩으로 둔다. */
export function YNCell({ label }: { label: string }) {
  const v = ynOf(label);
  if (v === null) return <StatusPill label={label} />;
  return <YN yes={v} label={label} />;
}

/**
 * 페이지네이션 — 공식 디자인 시스템 규격 (Figma pagination, 2026-10-08 사용자 지정).
 *   ⟪ ⟨ 1 2 3 4 5 6 7 8 9 … 100 ⟩ ⟫  ·  바깥 패딩 10 · 항목 간격 10 · 가운데 정렬
 *   현재 페이지만 브랜드 배경 + 흰 글자. 처음/이전/다음/마지막 화살표 포함.
 *   표 아래 어디서든 이 컴포넌트만 쓴다 — 페이지마다 다른 페이저를 만들지 말 것.
 */
const PAGER_WINDOW = 9; // 말줄임 앞에 보여줄 번호 개수

export function Pager({
  page,
  totalPages,
  onChange,
  showEdge = true,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
  /** 처음(⟪)·마지막(⟫) 버튼 노출 */
  showEdge?: boolean;
}) {
  if (totalPages <= 1) return null;
  const go = (p: number) => onChange(Math.min(Math.max(1, p), totalPages));

  // 현재 페이지가 들어가는 9칸 창 + (뒤가 남으면) … + 마지막 페이지
  const start = Math.min(Math.max(1, page - Math.floor(PAGER_WINDOW / 2)), Math.max(1, totalPages - PAGER_WINDOW + 1));
  const end = Math.min(totalPages, start + PAGER_WINDOW - 1);
  const nums: number[] = [];
  for (let n = start; n <= end; n += 1) nums.push(n);
  const tailGap = end < totalPages - 1;
  const tail = end < totalPages ? totalPages : null;

  const nav = 'grid h-5 w-5 shrink-0 place-items-center rounded-[4px] text-[#454f59] transition hover:text-[var(--ac)] disabled:pointer-events-none disabled:text-[#b3b9c0]';

  return (
    <nav aria-label="페이지" className="flex items-center justify-center gap-[10px] px-[10px] py-[10px]">
      {showEdge && (
        <button type="button" className={nav} onClick={() => go(1)} disabled={page === 1} aria-label="첫 페이지">
          <ChevronsLeft className="h-4 w-4" />
        </button>
      )}
      <button type="button" className={nav} onClick={() => go(page - 1)} disabled={page === 1} aria-label="이전 페이지">
        <ChevronLeft className="h-4 w-4" />
      </button>

      {nums.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => go(n)}
          aria-current={n === page ? 'page' : undefined}
          className={cn(
            'grid h-6 min-w-[24px] shrink-0 place-items-center rounded-[4px] px-1 text-[13px] font-medium leading-[20px] tabular-nums transition',
            n === page ? 'bg-[var(--ac)] font-bold text-white' : 'text-[var(--ink)] hover:bg-[var(--th)]',
          )}
        >
          {n}
        </button>
      ))}

      {tailGap && <span className="select-none px-0.5 text-[14px] leading-none text-[var(--ink3)]">···</span>}
      {tail !== null && (
        <button
          type="button"
          onClick={() => go(tail)}
          aria-current={tail === page ? 'page' : undefined}
          className={cn(
            'grid h-6 min-w-[24px] shrink-0 place-items-center rounded-[4px] px-1 text-[13px] font-medium leading-[20px] tabular-nums transition',
            tail === page ? 'bg-[var(--ac)] font-bold text-white' : 'text-[var(--ink)] hover:bg-[var(--th)]',
          )}
        >
          {tail}
        </button>
      )}

      <button type="button" className={nav} onClick={() => go(page + 1)} disabled={page === totalPages} aria-label="다음 페이지">
        <ChevronRight className="h-4 w-4" />
      </button>
      {showEdge && (
        <button type="button" className={nav} onClick={() => go(totalPages)} disabled={page === totalPages} aria-label="마지막 페이지">
          <ChevronsRight className="h-4 w-4" />
        </button>
      )}
    </nav>
  );
}

/**
 * 목록 하단 — 표와 32px 간격. 페이지네이션(가운데) → 24px → 액션 버튼(오른쪽).
 * 시안 기준 stack 24. 전 메뉴가 이 구조를 쓴다.
 */
export function ListBottom({
  page = 1,
  totalPages = 1,
  onPageChange,
  children,
}: {
  page?: number;
  totalPages?: number;
  onPageChange?: (p: number) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="mt-8">
      {onPageChange && <Pager page={page} totalPages={totalPages} onChange={onPageChange} />}
      {children && (
        <div className={cn('flex flex-wrap items-center justify-end gap-2', onPageChange && totalPages > 1 && 'mt-6')}>
          {children}
        </div>
      )}
    </div>
  );
}

/** 목록 하단 액션 영역 — 표와 32px 간격, 오른쪽 정렬 */
export function ListFooter({ left, children }: { left?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      {left}
      <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   목록 표 공식 규격 (CLAUDE.md §4.1)
     헤더 — 회색 배경 var(--th) · 13px/600 · 높이 44 · 아래 1px 선
     본문 — 13px/400 · 행 아래 1px 선 · hover 연보라
   정렬(좌/중앙/우)은 표마다 달라서 각 th/td 가 직접 지정한다.
   색·굵기·테두리·호버는 아래 상수에서만 바꾼다.
   ═══════════════════════════════════════════════════════════════════════════ */
export const TABLE_CLS = 'w-full border-collapse text-[14px]';
export const THEAD_TR_CLS =
  // Figma table — th: th-row-bg #f8f9fb · th-row-text #454f59 · th-row-inset-y 10 → 높이 40
  //  td: inset-y-xl 14 → 높이 48 · inset-x 12 · border-default #e8ecef
  'border-b border-[var(--line)] bg-[var(--th)] text-[var(--ink2)] [&>th]:!h-10 [&>th]:whitespace-nowrap [&>th]:!px-3 [&>th]:!py-2.5 [&>th]:font-semibold';
export const TBODY_TR_CLS =
  'border-b border-[var(--line)] text-[var(--ink)] hover:bg-[var(--th)] [&>td]:!h-12 [&>td]:!px-3 [&>td]:!py-2 [&>td]:align-middle';

export function OpsSection({ title, children }: { no?: number | string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-[15px] font-bold text-[#1a1a1a]">{title}</h3>
      </div>
      <div className="border-t border-[#e8ecef]">{children}</div>
    </section>
  );
}

// 라벨/값 2열 그리드 행 (상세·수정 공용). 보더·라벨 bg는 '전체 페이지·메뉴 관리' 기준(line #e8ecef · head #f8f9fb).
export function FieldRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-stretch border-b border-[#e8ecef]">
      <div className="flex items-center bg-[var(--th)] px-4 py-3 text-[14px] font-medium text-[var(--ink2)]">
        {label}
        {required && <span className="ml-0.5 text-[#cf2a3c]">*</span>}
      </div>
      <div className="px-4 py-2.5">{children}</div>
    </div>
  );
}

// 읽기 전용 값 — 인풋박스 없이 텍스트로만
export function ReadValue({ value }: { value: React.ReactNode }) {
  return <div className="min-h-[20px] py-1.5 text-[14px] leading-[20px] text-[var(--ink)]">{value ?? '-'}</div>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   검색 필터 공식 규격 (사내 표준 — 2026-10-08 사용자 제공 시안 기준)
     · 둥근 연회색 패널, 테두리 없음
     · 라벨은 컨트롤 왼쪽 인라인, 라벨 ↔ 컨트롤 12px (고정 폭 금지)
     · 칸 사이 28px, 그 한가운데 1px 구분선(높이 24 · var(--line)) · 행 사이 20px
     · 한 행에 「라벨 + 컨트롤」 쌍이 여러 개 흐름 배치
     · 초기화 / 조회는 마지막 행 오른쪽 끝
     · 컨트롤 높이 38px · 라운드 8px · 패널 패딩 24px · 라운드 12
   ═══════════════════════════════════════════════════════════════════════════ */

/** 한 칸: [라벨, 컨트롤, grow(1이면 남는 폭을 채움)] */
export type FilterCell = [label: string, node: React.ReactNode, grow?: number];

export function FilterPanel({
  rows,
  onReset,
  onSearch,
  resetLabel = '초기화',
  searchLabel = '조회',
}: {
  rows: FilterCell[][];
  onReset?: () => void;
  onSearch?: () => void;
  resetLabel?: string;
  searchLabel?: string;
}) {
  const last = rows.length - 1;
  return (
    <div className="fp rounded-[12px] bg-[#f8f9fb] p-6">
      {rows.map((cells, r) => (
        <div key={r} className={cn('flex flex-wrap items-center gap-x-[14px] gap-y-5', r > 0 && 'mt-5')}>
          {cells.map(([label, node, grow], c) => (
            // 라벨 ↔ 입력 12px. 각 행 첫 라벨에 88px 고정 폭을 주던 걸 없앴다 —
            // 짧은 라벨일수록 입력이 멀어졌다(기간 78 · 적용상태 55 · 대상 App 유형 26).
            // 칸 사이는 28px, 그 한가운데에 1px 구분선(높이 24)이 들어간다(시안 실측).
            // 행 gap 14 + 아래 pl-[14px] = 28, 구분선은 ::before 로 그 가운데에 그린다.
            <div
              key={c}
              className={cn(
                'relative flex items-center gap-3',
                c > 0 &&
                  'pl-[14px] before:absolute before:left-0 before:top-1/2 before:h-6 before:w-px before:-translate-y-1/2 before:bg-[var(--line)] before:content-[\'\']',
                grow ? 'grow-cell min-w-0 flex-1 basis-0' : '',
              )}
            >
              <span className="shrink-0 whitespace-nowrap text-[14px] leading-[20px] text-[var(--ink)]">{label}</span>
              <div className={cn('flex items-center gap-2', grow ? 'flex-1' : '')}>{node}</div>
            </div>
          ))}
          {r === last && (onReset || onSearch) && (
            <div className="ml-auto flex shrink-0 items-center gap-2 whitespace-nowrap pl-[14px]">
              {onReset && (
                <button type="button" onClick={onReset} className="h-[38px] rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-5 text-[14px] font-semibold text-[var(--ink3)] hover:bg-[var(--th)]">
                  {resetLabel}
                </button>
              )}
              {onSearch && (
                <button type="button" onClick={onSearch} className="h-[38px] rounded-[var(--r-field)] bg-[var(--ac)] px-6 text-[14px] font-semibold text-white hover:bg-[var(--ac-h)]">
                  {searchLabel}
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
