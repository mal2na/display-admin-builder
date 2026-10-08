'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Pencil, Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cornerTypeChipClass, cornerTypePurpose, layoutLabel } from '@/lib/display-taxonomy';
import { DevicePreview, cornerRowPreview, type CornerTypeRow } from '../corner-type-manager';
import { PageHeader } from '@/components/page-header';

const SORT_LABEL: Record<string, string> = { MANUAL: '수동(배치 순서)', PRIORITY: '우선순위', RECENT: '최신순', POPULAR: '인기순', PRICE_ASC: '낮은 가격순', PRICE_DESC: '높은 가격순' };
const FEATURES: [keyof CornerTypeRow, string][] = [
  ['useImage', '상품 이미지'], ['useMainTitle', '타이틀'], ['useSubTitle', '서브타이틀'],
  ['useBadge', '배지'], ['usePrice', '가격'], ['useDesc', '설명'], ['useMoreButton', 'CTA'],
];

function RORow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] items-start gap-3 border-b border-slate-100 py-3 last:border-0">
      <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
      <div className="min-w-0 text-[13px] text-foreground">{children}</div>
    </div>
  );
}

// 유형 상세 — 하나의 '코너 유형 정보' 패널. 배열·레이아웃과 미리보기에 모든 베리에이션(가로/세로/그리드)을 함께 표시.
export function GroupDetail({ base, variations }: { base: string; variations: CornerTypeRow[] }) {
  const router = useRouter();
  const seed = variations[0]; // 설정은 유형 공통 → 대표값
  const [selVar, setSelVar] = useState(0); // 상단 배열 탭 선택 인덱스
  const cur = variations[Math.min(selVar, variations.length - 1)] ?? seed;
  const channels = (seed?.channels ?? '').split(',').filter(Boolean);
  const platforms = (seed?.platforms ?? '').split(',').filter(Boolean);
  const hasDefaults = seed && (seed.defaultMinItems != null || seed.defaultMaxItems != null || seed.defaultSortStrategy || seed.defaultRecSource);

  return (
    <div className="space-y-4">
      <PageHeader
        trail={['전시관리', '코너 유형 관리', base]}
        title={base}
        back={
          <button type="button" onClick={() => router.push('/admin/corner-types')} className="inline-flex items-center gap-1 text-[12px] text-[var(--ink3)] hover:text-[var(--ink)]"><ChevronLeft className="h-3.5 w-3.5" />코너 유형 관리</button>
        }
        action={<span className={cn(cornerTypeChipClass(base))}>베리에이션 {variations.length}개</span>}
      />

      {/* 코너 유형 정보 (단일 패널) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b pb-3">
          <h2 className="text-sm font-semibold">코너 유형 정보</h2>
          <button type="button" onClick={() => router.push(`/admin/corner-types/edit?base=${encodeURIComponent(base)}`)} className="inline-flex items-center gap-1 rounded-lg border border-[#d9d5fb] bg-[#efedfe] px-3.5 py-2 text-[12.5px] font-bold text-[#3a2fd8] hover:bg-[#efedfe]"><Pencil className="h-3.5 w-3.5" />수정</button>
        </div>

        <div className="grid grid-cols-1 items-start gap-5 pt-4 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          {/* 미리보기 — 상단 배열 탭 + 고정 미리보기(탭 전환해도 타이틀·위치 안 움직임) */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">미리보기 · 조합 결과</p>
            {/* 배열 탭 (가로형·세로형 등) — 상단 고정 */}
            <div className="mb-2 flex flex-wrap gap-1.5">
              {variations.map((v, i) => (
                <button key={v.id} type="button" onClick={() => setSelVar(i)}
                  className={cn('rounded-full border px-3 py-1.5 text-[12px] font-medium transition', i === Math.min(selVar, variations.length - 1) ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300')}>
                  {layoutLabel(v.typeDetail) || v.typeDetail || '기본'}
                </button>
              ))}
            </div>
            {/* 고정 미리보기 — 선택된 배열만 표시(실사 렌더). 배너·칩·바코드·프로필·메뉴·상태 모두 CornerBlock이 처리 */}
            <div className="overflow-hidden rounded-lg border border-[#e6e7ec] bg-[#eef0f6] p-4">
              <div className="pointer-events-none h-[400px]"><DevicePreview corner={cornerRowPreview(cur)} fit="contain" /></div>
            </div>
          </div>

          {/* 정보 (읽기 전용) — 배열·레이아웃에 모든 베리에이션 나열 */}
          <div>
            <RORow label="코너 유형">
              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold">{base}</span>
              {cornerTypePurpose(base) && <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{cornerTypePurpose(base)}</p>}
            </RORow>
            <RORow label="배열·레이아웃">
              <div className="flex flex-wrap gap-1.5">
                {variations.map((v) => (
                  <span key={v.id} className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                    {layoutLabel(v.typeDetail) || v.typeDetail || '기본'}
                    {v.bigBanner && <span className="rounded bg-white/70 px-1 text-[9px]">빅배너</span>}
                  </span>
                ))}
              </div>
            </RORow>
            <RORow label="운영 채널">{channels.length ? channels.join(', ') : '—'}</RORow>
            <RORow label="운영 플랫폼">{platforms.length ? platforms.join(', ') : '—'}</RORow>
            <RORow label="세부 항목">
              <div className="flex flex-wrap gap-1.5">
                {FEATURES.map(([k, lbl]) => {
                  const on = !!seed?.[k];
                  return (
                    <span key={String(k)} className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]', on ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-400')}>
                      {on ? <Check className="h-3 w-3" /> : <Minus className="h-3 w-3" />}{lbl}
                    </span>
                  );
                })}
              </div>
            </RORow>
            {hasDefaults && (
              <RORow label="기본값">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
                  {(seed!.defaultMinItems != null || seed!.defaultMaxItems != null) && <span>노출 개수 <b className="text-foreground">{seed!.defaultMinItems ?? '–'}~{seed!.defaultMaxItems ?? '–'}</b></span>}
                  {seed!.defaultSortStrategy && <span>정렬 <b className="text-foreground">{SORT_LABEL[seed!.defaultSortStrategy] ?? seed!.defaultSortStrategy}</b></span>}
                  {seed!.defaultRecSource && <span>추천 수급 <b className="text-foreground">{seed!.defaultRecSource}</b></span>}
                </div>
              </RORow>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
