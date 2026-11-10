'use client';

// 조건그룹 비교 — 컨테이너에 매핑된 템플릿(로그인/비로그인/기본 등)을 나란히 놓고 미리보기로 비교한다(2026-11-10 사용자 요청: 3개 다 비교).
import * as React from 'react';
import { DeviceFrame, CornerBlock } from '@/components/preview/blocks';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PTemplate } from '../../../process-data';

// CVM 데이터 연동 코너만 'CVM 추천 보충' 점선 박스 노출(빌더 렌더 게이트와 동일).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function gated(c: PTemplate['corners'][number]): any {
  return c.recSource === 'CVM 데이터 연동'
    ? { ...c.preview, cvmFillCount: (c.preview?.cvmFillCount ?? 0) || 5, cvmFillMin: (c.preview?.cvmFillMin ?? 0) || 3 }
    : { ...c.preview, cvmFillCount: 0 };
}

export function CompareView({ containerName, templates }: { containerName: string; templates: PTemplate[] }) {
  // 비교 기준: 코너 '이름(유형·배열)' 집합. 템플릿별로 있/없음을 표로도 요약.
  const cornerKey = (c: PTemplate['corners'][number]) => `${c.name}·${c.cornerType}·${c.layoutDetail ?? c.layout ?? ''}`;
  const allKeys: string[] = [];
  for (const t of templates) for (const c of t.corners) { const k = cornerKey(c); if (!allKeys.includes(k)) allKeys.push(k); }
  const hasKey = (t: PTemplate, k: string) => t.corners.some((c) => cornerKey(c) === k);
  // 공통(모든 템플릿에 있음) / 차이(일부만) 구분
  const diffKeys = allKeys.filter((k) => templates.some((t) => !hasKey(t, k)));

  return (
    <div className="space-y-6">
      {/* 요약 — 코너 구성 차이표 */}
      <div className="rounded-[12px] border border-[var(--line2)] bg-white p-4">
        <div className="mb-2 flex items-center gap-2 text-[13px]">
          <b className="text-[var(--ink)]">코너 구성 비교</b>
          <span className="text-[var(--ink3)]">총 {allKeys.length}개 코너 · 차이 {diffKeys.length}개</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-[var(--line2)] text-[var(--ink3)]">
                <th className="py-2 pr-3 text-left font-medium">코너</th>
                {templates.map((t) => (
                  <th key={t.id} className="px-3 py-2 text-center font-medium">
                    <span className="inline-flex items-center gap-1">{t.isDefault && <Star className="h-3 w-3 fill-[var(--ac)] text-[var(--ac)]" />}{t.conditionGroup || t.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allKeys.map((k) => {
                const [nm, , ly] = k.split('·');
                const isDiff = diffKeys.includes(k);
                return (
                  <tr key={k} className={cn('border-b border-[var(--line2)]/60', isDiff && 'bg-[#fff8ef]')}>
                    <td className="py-2 pr-3 text-[var(--ink2)]">
                      {nm} <span className="text-[var(--ink4)]">{ly}</span>
                      {isDiff && <span className="ml-1.5 rounded-[4px] bg-[#f6d9a8] px-1 py-0.5 text-[10px] font-semibold text-[#b67a12]">차이</span>}
                    </td>
                    {templates.map((t) => (
                      <td key={t.id} className="px-3 py-2 text-center">
                        {hasKey(t, k)
                          ? <span className="text-[var(--ac)]">●</span>
                          : <span className="text-[var(--line3)]">—</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 디바이스 미리보기 — 템플릿 나란히 */}
      <div className="flex gap-5 overflow-x-auto pb-4">
        {templates.map((t) => (
          <div key={t.id} className="flex w-[320px] shrink-0 flex-col">
            <div className="mb-2 flex items-center gap-1.5">
              {t.isDefault && <Star className="h-3.5 w-3.5 fill-[var(--ac)] text-[var(--ac)]" />}
              <span className="text-[14px] font-bold text-[var(--ink)]">{t.conditionGroup || '기본'}</span>
              <span className="truncate text-[12px] text-[var(--ink3)]">· {t.name}</span>
              <span className="ml-auto shrink-0 rounded-full bg-[var(--th)] px-2 py-0.5 text-[11px] font-medium text-[var(--ink3)]">코너 {t.corners.length}</span>
            </div>
            <DeviceFrame width={300} bodyHeight={620} headerLabel={containerName} slim>
              {t.corners.length > 0
                ? t.corners.map((c) => <CornerBlock key={c.id} corner={gated(c)} />)
                : <div className="flex h-full items-center justify-center text-[12px] text-[var(--ink4)]">코너 없음</div>}
            </DeviceFrame>
          </div>
        ))}
      </div>
    </div>
  );
}
