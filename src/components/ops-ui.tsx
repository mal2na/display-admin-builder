// 운영 관리 공용 UI — 상태 칩 / 섹션 / 필드 행.
//  ── 상태 칩 공식 규격 (2026-10-08 사용자 제공 「통합 공지사항 목록」 시안 기준) ──
//    · 라운드 6px 사각형 (완전 알약 아님) · 높이 26 · 좌우 10 · 12px / 600
//    · 테두리 없이 연한 톤 배경 + 진한 글자. 점(dot) 장식 없음
//    · 톤: 성공(승인완료) 초록 · 반려 빨강 · 진행(게시중) 파랑 · 대기 주황 · 중립(임시저장·미게시) 회색
import * as React from 'react';
import { cn } from '@/lib/utils';
import { CHIP_BASE } from '@/lib/display-taxonomy';

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
  info:     'bg-[#D9E9FF] text-[#2E7AFF]',
  success:  'bg-[#C8F6E1] text-[#038E52]',
  negative: 'bg-[#FFDCDC] text-[#ED3B3E]',
  neutral:  'bg-[#DCE0E5] text-[#454F59]',
  warning:  'bg-[#FFE4C4] text-[#D66400]',
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
 * 시안 기준: 제목 17px/700, 건수 13px/400(숫자만 브랜드색 볼드), 표와 12px 간격.
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
      <div className="flex items-baseline gap-2">
        <h3 className="text-[17px] font-bold tracking-[-0.3px] text-[var(--ink)]">{title}</h3>
        {count !== undefined && (
          <span className="text-[13px] text-[var(--ink2)]">
            {prefix} <b className="font-bold tabular-nums text-[var(--ac)]">{count}</b>{unit}
          </span>
        )}
      </div>
      {right && <div className="flex shrink-0 flex-wrap items-center gap-2">{right}</div>}
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
export const TABLE_CLS = 'w-full border-collapse text-[13px]';
export const THEAD_TR_CLS =
  'border-b border-[var(--line)] bg-[var(--th)] text-[var(--ink2)] [&>th]:h-11 [&>th]:whitespace-nowrap [&>th]:px-3 [&>th]:font-semibold';
export const TBODY_TR_CLS =
  'border-b border-[var(--line)] text-[var(--ink)] hover:bg-[#fafaff]';

// 섹션 카드 (제목). no 인자는 하위호환용으로 남겨두되 표시하지 않는다.
export function OpsSection({ title, children }: { no?: number | string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-[15px] font-bold text-[#1d1e23]">{title}</h3>
      </div>
      <div className="border-t border-[#e6e7ec]">{children}</div>
    </section>
  );
}

// 라벨/값 2열 그리드 행 (상세·수정 공용). 보더·라벨 bg는 '전체 페이지·메뉴 관리' 기준(line #e6e7ec · head #f6f7f9).
export function FieldRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-stretch border-b border-[#e6e7ec]">
      <div className="flex items-center bg-[#f6f7f9] px-4 py-3 text-[13px] font-medium text-[#53586a]">
        {label}
        {required && <span className="ml-0.5 text-[#cf2a3c]">*</span>}
      </div>
      <div className="px-4 py-2.5">{children}</div>
    </div>
  );
}

// 읽기 전용 값 — 인풋박스 없이 텍스트로만
export function ReadValue({ value }: { value: React.ReactNode }) {
  return <div className="min-h-[20px] py-1.5 text-[13px] text-[#1d1e23]">{value ?? '-'}</div>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   검색 필터 공식 규격 (사내 표준 — 2026-10-08 사용자 제공 시안 기준)
     · 둥근 연회색 패널, 테두리 없음
     · 라벨은 컨트롤 왼쪽 인라인. 행 첫 라벨은 고정 폭으로 세로 정렬을 맞춘다
     · 한 행에 「라벨 + 컨트롤」 쌍이 여러 개 흐름 배치
     · 초기화 / 조회는 마지막 행 오른쪽 끝
     · 컨트롤 높이 38px · 라운드 8px · 패널 패딩 24px · 라운드 12 · 칸 사이 gap 40
   ═══════════════════════════════════════════════════════════════════════════ */

/** 한 칸: [라벨, 컨트롤, grow(1이면 남는 폭을 채움)] */
export type FilterCell = [label: string, node: React.ReactNode, grow?: number];

export function FilterPanel({
  rows,
  onReset,
  onSearch,
  resetLabel = '초기화',
  searchLabel = '조회',
  labelWidth = 88,
}: {
  rows: FilterCell[][];
  onReset?: () => void;
  onSearch?: () => void;
  resetLabel?: string;
  searchLabel?: string;
  labelWidth?: number;
}) {
  const last = rows.length - 1;
  return (
    <div className="fp rounded-[12px] bg-[#f8f9fb] p-6">
      {rows.map((cells, r) => (
        <div key={r} className={cn('flex flex-wrap items-center gap-x-10 gap-y-3', r > 0 && 'mt-3')}>
          {cells.map(([label, node, grow], c) => (
            <div key={c} className={cn('flex items-center gap-3', grow ? 'grow-cell min-w-0 flex-1 basis-0' : '')}>
              <span
                className="shrink-0 whitespace-nowrap text-[13px] text-[var(--ink)]"
                style={c === 0 ? { width: labelWidth } : undefined}
              >
                {label}
              </span>
              <div className={cn('flex items-center gap-2', grow ? 'flex-1' : '')}>{node}</div>
            </div>
          ))}
          {r === last && (onReset || onSearch) && (
            <div className="ml-auto flex shrink-0 items-center gap-2 whitespace-nowrap">
              {onReset && (
                <button type="button" onClick={onReset} className="h-[38px] rounded-[8px] border border-[var(--line2)] bg-white px-5 text-[13px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]">
                  {resetLabel}
                </button>
              )}
              {onSearch && (
                <button type="button" onClick={onSearch} className="h-[38px] rounded-[8px] bg-[var(--ac)] px-6 text-[13px] font-semibold text-white hover:bg-[var(--ac-h)]">
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
