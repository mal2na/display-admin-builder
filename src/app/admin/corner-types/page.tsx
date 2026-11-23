// 코너 유형 관리 — 메인은 혜택형 11종(기존 리스트/카드 스타일 재현), 백업(?edit=1)은 레거시 전체 매니저(2026-11-23 재구성).
//  · 메인(/admin/corner-types)         → BenefitTypeList (혜택형만, preset-shape-groups 기반)
//  · 백업(/admin/corner-types?edit=1)  → 기존 CornerTypeManager (DB CornerType 전체) — '코너 유형 관리 (수정)' 사이드바 링크
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { CornerTypeManager, type CornerTypeRow } from './corner-type-manager';
import { getBuiltCornerOptions } from './built-options';
import { toCornerTypeRow } from './row-map';
import { cornerToPreviewCorner, PLACED_CORNER_INCLUDE, PLACED_CORNER_ORDER } from './preview-corner';
import { benefitTypes } from '@/lib/benefit-corner-types';
import { BenefitTypeList, type BenefitTypeRow } from './benefit-type-list';

export const dynamic = 'force-dynamic';

// 대표 미리보기 이미지 URL(mtime 쿼리로 캐시 무효화).
function imgSrc(id: string): string {
  try {
    const st = fs.statSync(path.join(process.cwd(), 'public/assets/preset-images', `${id}.png`));
    return `/assets/preset-images/${id}.png?v=${Math.floor(st.mtimeMs)}`;
  } catch {
    return `/assets/preset-images/${id}.png`;
  }
}

// 혜택형 코너 유형(11종) → 리스트 행. 공용 정의(benefit-corner-types) + 대표 미리보기 이미지.
function benefitRows(): BenefitTypeRow[] {
  return benefitTypes().map((t) => ({
    typeId: t.typeId,
    mid: t.mid,
    layout: t.layout,
    name: t.name,
    repImg: t.presetIds[0] ? imgSrc(t.presetIds[0]) : null,
    presetCount: t.presetIds.length,
    source: t.source,
    presetKey: t.presetKey,
    updatedBy: '김마리나',
    updatedAt: '2026-11-23 10:21',
  }));
}

export default async function CornerTypesPage({ searchParams }: { searchParams?: Promise<{ edit?: string }> }) {
  const sp = (await searchParams) ?? {};

  // 백업 모드(?edit=1) — 레거시 전체 코너 유형 매니저(DB 기반).
  if (sp.edit === '1') {
    const [rows, auditRows, builtOptions, placedCorners, madeCorners] = await Promise.all([
      prisma.cornerType.findMany({ orderBy: { typeId: 'asc' } }),
      prisma.auditLog.findMany({ where: { targetType: 'CornerType' }, orderBy: { changedAt: 'desc' }, select: { targetId: true, actor: true } }),
      getBuiltCornerOptions(),
      prisma.corner.findMany({ where: { sourceCornerTypeId: { not: null }, templateCorners: { some: {} } }, include: PLACED_CORNER_INCLUDE, orderBy: PLACED_CORNER_ORDER }),
      prisma.corner.findMany({ where: { sourceCornerTypeId: { not: null } }, select: { sourceCornerTypeId: true } }),
    ]);
    const usedTypeIds = new Set(madeCorners.map((c) => c.sourceCornerTypeId));
    const lastActor = new Map<string, string>();
    for (const a of auditRows) if (a.targetId && !lastActor.has(a.targetId)) lastActor.set(a.targetId, a.actor);
    const previewByType = new Map<string, ReturnType<typeof cornerToPreviewCorner>>();
    for (const c of placedCorners) {
      if (c.sourceCornerTypeId && !previewByType.has(c.sourceCornerTypeId)) previewByType.set(c.sourceCornerTypeId, cornerToPreviewCorner(c));
    }
    const types: CornerTypeRow[] = rows.map((r) => ({ ...toCornerTypeRow(r, lastActor.get(r.id) ?? null), previewCorner: previewByType.get(r.id) ?? null, used: usedTypeIds.has(r.id) }));
    return (
      <div className="px-12 py-9 pb-28">
        <CornerTypeManager types={types} builtOptions={builtOptions} />
      </div>
    );
  }

  // 메인 — 혜택형 코너 유형 11종(리스트/카드 스타일).
  return (
    <div className="px-12 py-9 pb-28">
      <BenefitTypeList rows={benefitRows()} />
    </div>
  );
}
