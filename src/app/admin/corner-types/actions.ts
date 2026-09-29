'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import {
  CORNER_TYPES,
  componentTypesForCorner,
  componentLayoutDetails,
  parseComposition,
  layoutLabel,
  type CornerType,
} from '@/lib/display-taxonomy';

const RP = '/admin/corner-types';
const ACTOR = 'marina.kim@sk.com';

function revalidate(id?: string) {
  revalidatePath(RP);
  revalidatePath('/admin/audit-log');
  if (id) revalidatePath(`${RP}/${id}`);
}

async function writeAudit(opts: {
  targetId: string;
  before?: unknown;
  after?: unknown;
  reason: string;
  result: string;
}) {
  await prisma.auditLog.create({
    data: {
      actor: ACTOR,
      targetType: 'CornerType',
      targetId: opts.targetId,
      beforeValue: opts.before != null ? JSON.stringify(opts.before) : null,
      afterValue: opts.after != null ? JSON.stringify(opts.after) : null,
      reason: opts.reason,
      result: opts.result,
    },
  });
}

/** 다음 표시용 코너 유형 ID (CY0000001 …) */
async function nextTypeId() {
  const rows = await prisma.cornerType.findMany({ select: { typeId: true } });
  const max = rows.reduce((m, r) => {
    const n = parseInt(r.typeId.replace(/\D/g, ''), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return 'CY' + String(max + 1).padStart(7, '0');
}

/** FormData → CornerType 필드 (create/update 공용) */
function readForm(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const baseCategory = String(formData.get('baseCategory') ?? '').trim();
  if (!name) throw new Error('코너 유형 명은 필수입니다.');
  if (!CORNER_TYPES.includes(baseCategory as CornerType)) {
    throw new Error(`기준 분류는 ${CORNER_TYPES.join(' / ')} 중 하나여야 합니다.`);
  }
  const opt = (k: string) => {
    const v = String(formData.get(k) ?? '').trim();
    return v.length ? v : null;
  };
  const csv = (k: string) => formData.getAll(k).map(String).filter(Boolean).join(',') || null;
  const flag = (k: string) => formData.get(k) != null;
  const num = (k: string) => {
    const v = String(formData.get(k) ?? '').trim();
    if (!v.length) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  return {
    name,
    baseCategory,
    componentType: opt('componentType'),
    markupId: opt('markupId'),
    typeDetail: opt('typeDetail'),
    bigBanner: String(formData.get('bigBanner') ?? '') === '1', // ④ 빅배너 구분자

    layout: opt('layout'),
    description: opt('description'),
    channels: csv('channels') ?? '전체',
    platforms: csv('platforms') ?? '모바일',
    active: flag('active'),
    useMainTitle: flag('useMainTitle'),
    useSubTitle: flag('useSubTitle'),
    useMinItems: flag('useMinItems'),
    useMaxItems: flag('useMaxItems'),
    useNoDisplay: flag('useNoDisplay'),
    useMoreButton: flag('useMoreButton'),
    useBadge: flag('useBadge'),
    useImage: flag('useImage'),
    usePrice: flag('usePrice'),
    useDesc: flag('useDesc'),
    // 타입-레벨 기본값(템플릿 강화) — 빌더에서 이 유형으로 코너 생성 시 상속
    defaultMinItems: num('defaultMinItems'),
    defaultMaxItems: num('defaultMaxItems'),
    defaultSortStrategy: opt('defaultSortStrategy'),
    defaultRecSource: opt('defaultRecSource'),
    defaultMoreButton: String(formData.get('defaultMoreButton') ?? '') === '1',
    defaultMoreButtonLabel: opt('defaultMoreButtonLabel'),
    // 정의(거버넌스) 기본값 — 문구·개수·형태를 코너 유형에서 확정(2026-09-29)
    defaultMainTitle: opt('defaultMainTitle'),
    defaultSubTitle: opt('defaultSubTitle'),
    defaultSubTitleIcon: opt('defaultSubTitleIcon'),
    defaultCardShape: opt('defaultCardShape'),
    defaultBannerOptions: opt('defaultBannerOptions'),
    cvmFields: formData.getAll('cvmFields').map(String).filter(Boolean).join(','), // CVM 연동 필드 keys
    // 컴포넌트 조합 — 유효성 검증 후 정규화 JSON 저장(유효하지 않으면 null → 절차적 scaffold 폴백)
    composition: (() => { const c = parseComposition(String(formData.get('composition') ?? '')); return c ? JSON.stringify(c) : null; })(),
    // FO 사용자 설정(고객 커스터마이즈) 기본값
    userCustomizable: String(formData.get('userCustomizable') ?? '') === '1',
    userMinItems: num('userMinItems'),
    userMaxItems: num('userMaxItems'),
    sampleImageUrl: opt('sampleImageUrl'),
    status: opt('status') ?? 'DRAFT',
  };
}

/**
 * 3단 계층 검증: ① 코너 유형(8종, PI-DSP-CMP-003) → ② 구성 컴포넌트 유형(CORNER_COMPONENT_MAP) →
 * ③ 배열/레이아웃 상세(COMPONENT_LAYOUT_DETAILS). 코너 유형 관리가 마스터, 빌더는 여기서 소비한다.
 * legacy*: 수정 시 이미 저장돼 있던 값은 규칙에 없어도 보존 허용.
 */
function assertPolicyCombo(
  baseCategory: string,
  componentType: string | null,
  typeDetail: string | null,
  legacy?: { componentType?: string | null; typeDetail?: string | null },
) {
  if (!(CORNER_TYPES as readonly string[]).includes(baseCategory)) {
    throw new Error(`코너 유형은 정책서 8종 중에서만 선택할 수 있습니다. (${baseCategory})`);
  }
  // ② 컴포넌트 유형 — 코너 유형이 허용하는 것만 (선택 사항: 없으면 통과)
  const comp = componentType ?? '';
  if (comp) {
    const allowedComps = componentTypesForCorner(baseCategory);
    if (!allowedComps.includes(comp as (typeof allowedComps)[number]) && comp !== (legacy?.componentType ?? '')) {
      throw new Error(
        `구성 컴포넌트 유형이 이 코너 유형에서 허용되지 않습니다. (${baseCategory} · ${comp}) 허용: ${allowedComps.join(', ') || '없음'}`,
      );
    }
  }
  // ③ 배열 상세 — 컴포넌트 유형이 정한 배열만 (선택 사항)
  const detail = typeDetail ?? '';
  if (detail && comp) {
    const allowedDetails = componentLayoutDetails(comp);
    if (!allowedDetails.includes(detail) && detail !== (legacy?.typeDetail ?? '')) {
      throw new Error(
        `배열/레이아웃 상세가 규칙에 없습니다. (${comp} · ${detail}) 허용: ${allowedDetails.join(', ') || '없음'}`,
      );
    }
  }
}

export async function createCornerType(formData: FormData) {
  const data = readForm(formData);
  assertPolicyCombo(data.baseCategory, data.componentType, data.typeDetail);
  const typeId = await nextTypeId();
  const created = await prisma.cornerType.create({ data: { ...data, typeId, createdBy: ACTOR } });
  await writeAudit({ targetId: created.id, after: { name: data.name, baseCategory: data.baseCategory }, reason: `코너 유형 등록 (${typeId} · ${data.name})`, result: 'CREATED' });
  revalidate(created.id);
}

// 유형(base)을 '한 번에' 저장 — 원본 폼(CornerTypeForm) bulk 모드에서 제출. 공통 설정(컴포넌트 조합 포함)을
//  선택한 모든 배열·레이아웃에 동일 적용(선택=유지/생성, 해제=삭제).
export async function saveCornerTypeBulk(base: string, formData: FormData) {
  if (!(CORNER_TYPES as readonly string[]).includes(base)) throw new Error(`유효한 코너 유형이 아닙니다. (${base})`);
  const common = readForm(formData);
  let arrays: string[] = [];
  try { const a = JSON.parse(String(formData.get('bulkArraysJson') ?? '[]')); if (Array.isArray(a)) arrays = a.map(String).filter(Boolean); } catch { arrays = []; }
  if (!arrays.length) throw new Error('배열·레이아웃을 최소 1개 선택하세요.');
  const componentType = common.componentType ?? componentTypesForCorner(base)[0] ?? null;
  const existing = await prisma.cornerType.findMany({ where: { baseCategory: base }, select: { id: true, typeDetail: true } });
  const byDetail = new Map(existing.map((e) => [e.typeDetail ?? '', e]));
  const nameFor = (d: string) => [base, layoutLabel(d) || d].filter(Boolean).join(' · ');
  const { name: _n, typeDetail: _td, status: _s, baseCategory: _bc, componentType: _ct, ...rest } = common;
  void _n; void _td; void _s; void _bc; void _ct;

  for (const d of arrays) {
    const data = { ...rest, baseCategory: base, componentType, typeDetail: d, name: nameFor(d) };
    const hit = byDetail.get(d);
    if (hit) {
      await prisma.cornerType.update({ where: { id: hit.id }, data: { ...data, status: 'DRAFT' } });
    } else {
      const typeId = await nextTypeId();
      await prisma.cornerType.create({ data: { ...data, typeId, createdBy: ACTOR, status: 'APPROVED', workingVersion: 1, liveVersion: 1, liveAt: new Date() } });
    }
  }
  for (const e of existing) if (!arrays.includes(e.typeDetail ?? '')) await prisma.cornerType.delete({ where: { id: e.id } });
  await writeAudit({ targetId: existing[0]?.id ?? base, reason: `코너 유형 일괄 수정 (${base} · 배열 ${arrays.length}개)`, result: 'UPDATED' });
  revalidate();
  const { redirect } = await import('next/navigation');
  redirect(`/admin/corner-types/group?base=${encodeURIComponent(base)}`);
}

export async function updateCornerType(id: string, formData: FormData) {
  const data = readForm(formData);
  const before = await prisma.cornerType.findUnique({ where: { id } });
  // 조합이 바뀔 때만 강제 → 기존(레거시) 값을 그대로 두는 수정은 허용
  const comboChanged =
    !before ||
    before.baseCategory !== data.baseCategory ||
    (before.componentType ?? null) !== (data.componentType ?? null) ||
    (before.typeDetail ?? null) !== (data.typeDetail ?? null);
  if (comboChanged)
    assertPolicyCombo(data.baseCategory, data.componentType, data.typeDetail, {
      componentType: before?.componentType ?? null,
      typeDetail: before?.typeDetail ?? null,
    });

  // ── 버전관리: 폼 수정은 '작업본'을 바꾼다. 라이브 승인본(liveSnapshot/liveVersion)은 건드리지 않는다. ──
  //  - 승인완료 & 반영 완료(clean = workingVersion === liveVersion) 상태에서 수정하면
  //    → 새 편집본이 시작되므로 workingVersion++, status='DRAFT'(임시저장). 라이브는 그대로 사용 중 유지.
  //  - 이미 편집 중(초안/반려/검수)이면 그 편집본을 계속 수정 → 버전 유지, status는 DRAFT로.
  const clean = !!before && before.status === 'APPROVED' && before.workingVersion === (before.liveVersion ?? -1);
  const nextWorking = clean ? before!.workingVersion + 1 : (before?.workingVersion ?? 1);
  // 폼의 status 값은 무시하고 워크플로우가 관리(수정 = 편집본 초안)
  const { status: _ignore, ...rest } = data;
  void _ignore;

  await prisma.cornerType.update({
    where: { id },
    data: { ...rest, status: 'DRAFT', workingVersion: nextWorking, rejectReason: null, reviewedBy: null, reviewedAt: null },
  });
  await writeAudit({
    targetId: id,
    before: before ? { name: before.name, typeDetail: before.typeDetail, status: before.status, workingVersion: before.workingVersion, liveVersion: before.liveVersion } : null,
    after: { name: data.name, typeDetail: data.typeDetail, status: 'DRAFT', workingVersion: nextWorking },
    reason: clean ? '코너 유형 수정 착수 (새 편집본 작성중 · 라이브는 사용 중 유지)' : '코너 유형 정보 수정',
    result: 'UPDATED',
  });
  revalidate(id);
}

// 한 유형(base)의 여러 베리에이션을 한 번에 수정 — 유형상세명·설명·사용여부.
export async function bulkUpdateCornerType(base: string, formData: FormData) {
  const ids = formData.getAll('id').map(String);
  for (const id of ids) {
    const typeDetail = String(formData.get(`typeDetail_${id}`) ?? '').trim() || null;
    const description = String(formData.get(`description_${id}`) ?? '').trim() || null;
    const active = formData.get(`active_${id}`) === 'on';
    await prisma.cornerType.update({ where: { id }, data: { typeDetail, description, active } });
  }
  revalidate();
  const { redirect } = await import('next/navigation');
  redirect(`/admin/corner-types?base=${encodeURIComponent(base)}`);
}

// 한 유형(base)의 베리에이션을 한 화면에서 한 번에 저장 — 수정/추가/삭제 동시.
//  payload: JSON VarDraft[] { id?, typeDetail, active, bigBanner, use*, defaultMinItems, defaultMaxItems, defaultSortStrategy, defaultRecSource, sampleImageUrl, _delete }
export async function saveTypeVariations(base: string, payload: string) {
  if (!(CORNER_TYPES as readonly string[]).includes(base)) throw new Error(`유효한 코너 유형이 아닙니다. (${base})`);
  let drafts: Array<Record<string, unknown>> = [];
  try { const a = JSON.parse(payload); if (Array.isArray(a)) drafts = a; } catch { drafts = []; }
  const componentType = componentTypesForCorner(base)[0] ?? null;

  const numOrNull = (v: unknown) => { const n = Number(v); return v === '' || v == null || !Number.isFinite(n) ? null : n; };
  const strOrNull = (v: unknown) => { const s = String(v ?? '').trim(); return s.length ? s : null; };

  for (const d of drafts) {
    const id = typeof d.id === 'string' && d.id ? d.id : null;
    if (d._delete) { if (id) { await prisma.cornerType.delete({ where: { id } }); await writeAudit({ targetId: id, reason: '코너 유형 베리에이션 삭제', result: 'DELETED' }); } continue; }
    const typeDetail = strOrNull(d.typeDetail);
    const bigBanner = !!d.bigBanner && componentType === '상품형';
    const name = [base, layoutLabel(typeDetail ?? undefined) || typeDetail || '', bigBanner ? '빅배너' : ''].filter(Boolean).join(' · ');
    const fields = {
      name,
      baseCategory: base,
      componentType,
      typeDetail,
      bigBanner,
      active: !!d.active,
      useImage: !!d.useImage,
      useMainTitle: !!d.useMainTitle,
      useSubTitle: !!d.useSubTitle,
      useBadge: !!d.useBadge,
      usePrice: !!d.usePrice,
      useDesc: !!d.useDesc,
      useMoreButton: !!d.useMoreButton,
      defaultMinItems: numOrNull(d.defaultMinItems),
      defaultMaxItems: numOrNull(d.defaultMaxItems),
      defaultSortStrategy: strOrNull(d.defaultSortStrategy),
      defaultRecSource: strOrNull(d.defaultRecSource),
      sampleImageUrl: strOrNull(d.sampleImageUrl),
    };
    if (id) {
      await prisma.cornerType.update({ where: { id }, data: fields });
      await writeAudit({ targetId: id, after: { name, typeDetail }, reason: '코너 유형 수정(유형 전체 수정)', result: 'UPDATED' });
    } else {
      const typeId = await nextTypeId();
      const created = await prisma.cornerType.create({ data: { ...fields, typeId, channels: 'FO', platforms: '모바일', createdBy: ACTOR, status: 'APPROVED', workingVersion: 1, liveVersion: 1, liveAt: new Date() } });
      await writeAudit({ targetId: created.id, after: { name, typeId }, reason: `코너 유형 베리에이션 추가 (${typeId} · ${name})`, result: 'CREATED' });
    }
  }
  revalidate();
  const { redirect } = await import('next/navigation');
  redirect(`/admin/corner-types/group?base=${encodeURIComponent(base)}`);
}

// 한 유형(base)을 '한 번에' 수정 — 공유 설정(세부 항목·운영·기본값 등)을 모든 베리에이션에 동일 적용하고,
//  선택한 배열·레이아웃 목록으로 베리에이션을 맞춘다(선택=유지/생성, 해제=삭제). 각자 수정이 아니라 유형 단위 일괄.
export async function saveTypeSharedVariations(base: string, payload: string) {
  if (!(CORNER_TYPES as readonly string[]).includes(base)) throw new Error(`유효한 코너 유형이 아닙니다. (${base})`);
  let parsed: { arrays?: string[]; shared?: Record<string, unknown> } = {};
  try { parsed = JSON.parse(payload); } catch { parsed = {}; }
  const arrays = Array.isArray(parsed.arrays) ? parsed.arrays.map((s) => String(s).trim()).filter(Boolean) : [];
  const s = parsed.shared ?? {};
  const componentType = componentTypesForCorner(base)[0] ?? null;

  const numOrNull = (v: unknown) => { const n = Number(v); return v === '' || v == null || !Number.isFinite(n) ? null : n; };
  const strOrNull = (v: unknown) => { const t = String(v ?? '').trim(); return t.length ? t : null; };
  const csv = (v: unknown) => (Array.isArray(v) ? v.map(String).filter(Boolean).join(',') : '') || null;

  // 공유 설정 (모든 베리에이션 동일)
  const shared = {
    baseCategory: base,
    componentType,
    active: !!s.active,
    channels: csv(s.channels) ?? '전체',
    platforms: csv(s.platforms) ?? '모바일',
    description: strOrNull(s.description),
    useImage: !!s.useImage, useMainTitle: !!s.useMainTitle, useSubTitle: !!s.useSubTitle,
    useBadge: !!s.useBadge, usePrice: !!s.usePrice, useDesc: !!s.useDesc, useMoreButton: !!s.useMoreButton,
    defaultMinItems: numOrNull(s.defaultMinItems), defaultMaxItems: numOrNull(s.defaultMaxItems),
    defaultSortStrategy: strOrNull(s.defaultSortStrategy), defaultRecSource: strOrNull(s.defaultRecSource),
    bigBanner: !!s.bigBanner && componentType === '상품형',
  };

  const existing = await prisma.cornerType.findMany({ where: { baseCategory: base }, select: { id: true, typeDetail: true } });
  const byDetail = new Map(existing.map((e) => [e.typeDetail ?? '', e]));
  const nameFor = (detail: string) => [base, layoutLabel(detail) || detail, shared.bigBanner ? '빅배너' : ''].filter(Boolean).join(' · ');

  // 선택한 배열 → 유지/생성 (공유 설정 적용)
  for (const detail of arrays) {
    const hit = byDetail.get(detail);
    if (hit) {
      await prisma.cornerType.update({ where: { id: hit.id }, data: { ...shared, typeDetail: detail, name: nameFor(detail) } });
    } else {
      const typeId = await nextTypeId();
      await prisma.cornerType.create({ data: { ...shared, typeDetail: detail, name: nameFor(detail), typeId, createdBy: ACTOR, status: 'APPROVED', workingVersion: 1, liveVersion: 1, liveAt: new Date() } });
    }
  }
  // 선택 해제된 기존 배열 → 삭제
  for (const e of existing) {
    if (!arrays.includes(e.typeDetail ?? '')) await prisma.cornerType.delete({ where: { id: e.id } });
  }
  await writeAudit({ targetId: existing[0]?.id ?? base, reason: `코너 유형 일괄 수정 (${base} · 배열 ${arrays.length}개)`, result: 'UPDATED' });

  revalidate();
  const { redirect } = await import('next/navigation');
  redirect(`/admin/corner-types/group?base=${encodeURIComponent(base)}`);
}

export async function toggleCornerTypeActive(id: string) {
  const cur = await prisma.cornerType.findUnique({ where: { id }, select: { active: true } });
  if (!cur) return;
  await prisma.cornerType.update({ where: { id }, data: { active: !cur.active } });
  await writeAudit({
    targetId: id,
    before: { active: cur.active },
    after: { active: !cur.active },
    reason: `사용여부 변경: ${cur.active ? '사용 → 미사용' : '미사용 → 사용'}`,
    result: 'UPDATED',
  });
  revalidate(id);
}

export async function deleteCornerType(id: string) {
  const before = await prisma.cornerType.findUnique({ where: { id } });
  await prisma.cornerType.delete({ where: { id } });
  await writeAudit({ targetId: id, before: before ? { name: before.name, typeId: before.typeId } : null, reason: `코너 유형 삭제 (${before?.typeId ?? id})`, result: 'DELETED' });
  revalidate();
}

// 복제 — 정의(조합·플래그·기본값)를 그대로 복사해 새 작업본으로. 라이브/버전/승인 이력은 초기화.
export async function duplicateCornerType(id: string) {
  const src = await prisma.cornerType.findUnique({ where: { id } });
  if (!src) return;
  const typeId = await nextTypeId();
  const {
    id: _id, typeId: _typeId, createdAt: _c, updatedAt: _u, createdBy: _cb,
    liveVersion: _lv, liveSnapshot: _ls, liveAt: _la, workingVersion: _wv,
    status: _st, rejectReason: _rr, reviewedBy: _rb, reviewedAt: _ra,
    ...rest
  } = src;
  const created = await prisma.cornerType.create({
    data: { ...rest, name: `${src.name} 복사본`, typeId, createdBy: ACTOR, status: 'DRAFT', workingVersion: 1, liveVersion: null, liveSnapshot: null, liveAt: null },
  });
  await writeAudit({ targetId: created.id, after: { name: created.name, typeId }, reason: `코너 유형 복제 (${src.typeId} → ${typeId})`, result: 'CREATED' });
  revalidate(created.id);
}
