'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { CORNER_TYPES, type CornerType } from '@/lib/display-taxonomy';

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

  return {
    name,
    baseCategory,
    markupId: opt('markupId'),
    typeDetail: opt('typeDetail'),
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
    sampleImageUrl: opt('sampleImageUrl'),
    status: opt('status') ?? 'DRAFT',
  };
}

/**
 * 전시화면관리(빌더)에서 실제로 만들어진 (cornerType, layoutDetail) 조합인지 검증.
 * UI 드롭다운뿐 아니라 서버에서도 강제해 "만들어진 유형만 등록" 규칙을 권위 있게 지킨다.
 */
async function assertBuiltCombo(baseCategory: string, typeDetail: string | null) {
  const built = await prisma.corner.findFirst({
    where: { cornerType: baseCategory, layoutDetail: typeDetail ?? null },
    select: { id: true },
  });
  if (!built) {
    throw new Error(
      `전시화면관리에서 만들어진 코너 유형만 등록할 수 있습니다. (${baseCategory}${typeDetail ? ' · ' + typeDetail : ''} 조합으로 만들어진 코너가 없습니다.)`,
    );
  }
}

export async function createCornerType(formData: FormData) {
  const data = readForm(formData);
  await assertBuiltCombo(data.baseCategory, data.typeDetail);
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
    !before || before.baseCategory !== data.baseCategory || (before.typeDetail ?? null) !== (data.typeDetail ?? null);
  if (comboChanged) await assertBuiltCombo(data.baseCategory, data.typeDetail);
  await prisma.cornerType.update({ where: { id }, data });
  await writeAudit({
    targetId: id,
    before: before ? { name: before.name, typeDetail: before.typeDetail, layout: before.layout, active: before.active, status: before.status } : null,
    after: { name: data.name, typeDetail: data.typeDetail, layout: data.layout, active: data.active, status: data.status },
    reason: '코너 유형 정보 수정',
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
