'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import {
  CORNER_TYPES,
  componentTypesForCorner,
  componentLayoutDetails,
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
    // 타입-레벨 기본값(템플릿 강화) — 빌더에서 이 유형으로 코너 생성 시 상속
    defaultMinItems: num('defaultMinItems'),
    defaultMaxItems: num('defaultMaxItems'),
    defaultSortStrategy: opt('defaultSortStrategy'),
    defaultMoreButton: String(formData.get('defaultMoreButton') ?? '') === '1',
    defaultMoreButtonLabel: opt('defaultMoreButtonLabel'),
    cvmFields: formData.getAll('cvmFields').map(String).filter(Boolean).join(','), // CVM 연동 필드 keys
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
