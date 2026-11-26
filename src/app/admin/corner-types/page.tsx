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
  const rows: BenefitTypeRow[] = benefitTypes().map((t) => ({
    top: '혜택형',
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
    unused: t.unused,
  }));
  // 배너형·업무진입형 추가(2026-11-25 사용자 요청) — 코너 유형 필터로 묶기 위해 중분류 포함 3뎁스로 등록.
  //  SB 프리셋 이미지는 아직 없어 미리보기는 껍데기(placeholder). 상세 라우트 없음(조회 목록 노출용).
  const extra: BenefitTypeRow[] = [
    { top: '배너형', typeId: 'CYB001', mid: '배너형', layout: '단수형', name: '배너형 · 단수형', repImg: null, presetCount: 0, source: '배너 캠페인 관리', presetKey: 'banner-single', updatedBy: '김마리나', updatedAt: '2026-11-25 09:00' },
    { top: '배너형', typeId: 'CYB002', mid: '배너형', layout: '복수형', name: '배너형 · 복수형', repImg: null, presetCount: 0, source: '배너 캠페인 관리', presetKey: 'banner-multi', updatedBy: '김마리나', updatedAt: '2026-11-25 09:00' },
    { top: '업무 진입형', typeId: 'CYW001', mid: '탭형', layout: '스와이프형', name: '탭형 · 스와이프형', repImg: null, presetCount: 0, source: '-', presetKey: 'tab-swipe', updatedBy: '김마리나', updatedAt: '2026-11-25 09:00' },
    // 홈형(메인 홈) 코너 유형 2종(2026-11-26 회의) — ① 추천 카드 + 추천 질의어 묶음, ② 큰 배너 확장형. SB 프리셋 대기(상세 라우트 없음).
    { top: '홈형', typeId: 'CYM001', mid: '추천형', layout: '추천 카드 + 질의어', name: '추천형 · 추천 카드 + 질의어', repImg: null, presetCount: 0, source: '어드민 · CVM 추천 + 추천 질의어 풀', presetKey: '', updatedBy: '김마리나', updatedAt: '2026-11-26 09:00' },
    { top: '홈형', typeId: 'CYM002', mid: '추천형', layout: '배너 확장형', name: '추천형 · 배너 확장형', repImg: null, presetCount: 0, source: '배너 캠페인 관리', presetKey: '', updatedBy: '김마리나', updatedAt: '2026-11-26 09:00' },
  ];
  return [...rows, ...extra];
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
