'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import {
  CONTAINER_STATUSES,
  CONTAINER_APPROVAL_STATUS_LABEL,
  CONTAINER_APPROVAL_TRANSITIONS,
  type ContainerApprovalStatusKey,
} from '@/lib/display-taxonomy';

// Container 생성 시 "기본 Template 반드시 1개" 불변식을 지키기 위해 첫 Template을 함께 만들고 기본으로 지정.
export async function createContainer(formData: FormData) {
  const S = (k: string) => String(formData.get(k) ?? '').trim();
  const opt = (k: string) => S(k) || null;

  const name = S('name');
  const firstConditionGroup = S('conditionGroup') || '로그인';
  if (!name) throw new Error('컨테이너 명을 입력하세요.');

  const kind = S('kind') || '일반';
  const platform = S('platform') || '모바일';
  const status = S('display') === '미전시' ? 'inactive' : 'active'; // 전시 여부
  const noEndDate = formData.get('noEndDate') != null;
  const startRaw = S('startAt');
  const endRaw = S('endAt');

  const container = await prisma.container.create({
    data: {
      name,
      containerType: 'MAIN',
      status,
      parentId: opt('parentId'),
      kind,
      platform,
      previewUrl: opt('previewUrl'),
      startAt: startRaw ? new Date(startRaw) : null,
      endAt: noEndDate || !endRaw ? null : new Date(endRaw),
      noEndDate,
      metaUse: S('metaUse') !== '미사용',
      searchTags: opt('searchTags'),
      metaKeywords: opt('metaKeywords'),
      metaDescription: opt('metaDescription'),
      ogTitle: opt('ogTitle'),
      ogDescription: opt('ogDescription'),
      ogSiteName: opt('ogSiteName'),
      ogImage: opt('ogImage'),
    },
  });
  const template = await prisma.template.create({
    data: {
      containerId: container.id,
      name: `${name} 기본`,
      conditionGroup: firstConditionGroup,
      isDefault: true,
      status: 'DRAFT',
      version: 1,
    },
  });
  await prisma.container.update({ where: { id: container.id }, data: { defaultTemplateId: template.id } });

  revalidatePath('/admin/containers');
  redirect(`/admin/containers/${container.id}`);
}

// ── 컨테이너 기본/메타 정보 수정 ──
export async function updateContainerInfo(id: string, formData: FormData) {
  const S = (k: string) => String(formData.get(k) ?? '').trim();
  const opt = (k: string) => S(k) || null;
  const before = await prisma.container.findUnique({
    where: { id },
    select: {
      name: true, kind: true, platform: true, previewUrl: true, status: true,
      startAt: true, endAt: true, noEndDate: true,
      metaUse: true, searchTags: true, metaKeywords: true, metaDescription: true,
      ogTitle: true, ogDescription: true, ogSiteName: true, ogImage: true,
    },
  });
  if (!before) throw new Error('컨테이너를 찾을 수 없습니다.');

  const noEndDate = formData.get('noEndDate') != null;
  const startRaw = S('startAt');
  const endRaw = S('endAt');
  const data = {
    name: S('name') || before.name,
    kind: S('kind') || '일반',
    platform: S('platform') || '모바일',
    previewUrl: opt('previewUrl'),
    status: S('display') === '미전시' ? 'inactive' : 'active',
    startAt: startRaw ? new Date(startRaw) : null,
    endAt: noEndDate || !endRaw ? null : new Date(endRaw),
    noEndDate,
    metaUse: S('metaUse') !== '미사용',
    searchTags: opt('searchTags'),
    metaKeywords: opt('metaKeywords'),
    metaDescription: opt('metaDescription'),
    ogTitle: opt('ogTitle'),
    ogDescription: opt('ogDescription'),
    ogSiteName: opt('ogSiteName'),
    ogImage: opt('ogImage'),
  };
  await prisma.container.update({ where: { id }, data });
  await writeContainerAudit({ id, before, after: data, reason: '기본/메타 정보 수정', result: 'UPDATED' });
  revalidatePath(`/admin/containers/${id}`);
  revalidatePath('/admin/containers');
}

// ── 컨테이너 승인 워크플로우 (작성중 → 승인 대기 → 승인 완료/반려) ──
const APPROVAL_ACTOR = 'marina.kim@sk.com';

async function writeContainerAudit(opts: { id: string; before: unknown; after: unknown; reason?: string | null; approver?: string | null; result: string }) {
  await prisma.auditLog
    .create({
      data: {
        actor: APPROVAL_ACTOR,
        targetType: 'Container',
        targetId: opts.id,
        beforeValue: JSON.stringify(opts.before),
        afterValue: JSON.stringify(opts.after),
        reason: opts.reason ?? null,
        approver: opts.approver ?? null,
        result: opts.result,
      },
    })
    .catch(() => {});
}

function assertApprovalTransition(from: string, to: ContainerApprovalStatusKey) {
  const allowed = CONTAINER_APPROVAL_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(
      `승인 상태 전이 불가: ${CONTAINER_APPROVAL_STATUS_LABEL[from] ?? from} → ${CONTAINER_APPROVAL_STATUS_LABEL[to]}`,
    );
  }
}

// 승인 요청 (작성중/반려 → 승인 대기). 필수값: 이름 + 기본 Template 1개 이상.
export async function requestContainerApproval(id: string) {
  const c = await prisma.container.findUnique({ where: { id }, select: { name: true, approvalStatus: true, defaultTemplateId: true, _count: { select: { templates: true } } } });
  if (!c) throw new Error('컨테이너를 찾을 수 없습니다.');
  if (!c.name?.trim()) throw new Error('컨테이너 명이 비어 있어 승인 요청할 수 없습니다.');
  if (!c.defaultTemplateId || c._count.templates === 0) throw new Error('기본 Template이 없어 승인 요청할 수 없습니다.');
  assertApprovalTransition(c.approvalStatus, 'REVIEW');
  await prisma.container.update({ where: { id }, data: { approvalStatus: 'REVIEW', approvalRequestedAt: new Date(), rejectReason: null } });
  await writeContainerAudit({ id, before: { approvalStatus: c.approvalStatus }, after: { approvalStatus: 'REVIEW' }, reason: '컨테이너 승인 요청', result: 'REVIEW_REQUESTED' });
  revalidatePath('/admin/containers');
  revalidatePath(`/admin/containers/${id}`);
}

// 승인 (승인 대기 → 승인 완료)
export async function approveContainer(id: string) {
  const c = await prisma.container.findUnique({ where: { id }, select: { approvalStatus: true } });
  if (!c) throw new Error('컨테이너를 찾을 수 없습니다.');
  assertApprovalTransition(c.approvalStatus, 'APPROVED');
  await prisma.container.update({ where: { id }, data: { approvalStatus: 'APPROVED', approvedBy: APPROVAL_ACTOR, approvedAt: new Date(), rejectReason: null } });
  await writeContainerAudit({ id, before: { approvalStatus: c.approvalStatus }, after: { approvalStatus: 'APPROVED' }, approver: APPROVAL_ACTOR, result: 'APPROVED' });
  revalidatePath('/admin/containers');
  revalidatePath(`/admin/containers/${id}`);
}

// 반려 (승인 대기 → 반려, 사유 필수)
export async function rejectContainer(id: string, reason: string) {
  const r = reason?.trim();
  if (!r) throw new Error('반려 사유는 필수입니다.');
  const c = await prisma.container.findUnique({ where: { id }, select: { approvalStatus: true } });
  if (!c) throw new Error('컨테이너를 찾을 수 없습니다.');
  assertApprovalTransition(c.approvalStatus, 'REJECTED');
  await prisma.container.update({ where: { id }, data: { approvalStatus: 'REJECTED', rejectReason: r } });
  await writeContainerAudit({ id, before: { approvalStatus: c.approvalStatus }, after: { approvalStatus: 'REJECTED' }, reason: r, approver: APPROVAL_ACTOR, result: 'REJECTED' });
  revalidatePath('/admin/containers');
  revalidatePath(`/admin/containers/${id}`);
}

// 다시 작성 (승인 완료 → 작성중). 승인 후 재편집이 필요할 때.
export async function reopenContainerApproval(id: string) {
  const c = await prisma.container.findUnique({ where: { id }, select: { approvalStatus: true } });
  if (!c) throw new Error('컨테이너를 찾을 수 없습니다.');
  assertApprovalTransition(c.approvalStatus, 'DRAFT');
  await prisma.container.update({ where: { id }, data: { approvalStatus: 'DRAFT' } });
  await writeContainerAudit({ id, before: { approvalStatus: c.approvalStatus }, after: { approvalStatus: 'DRAFT' }, reason: '승인 완료본 재편집(작성중으로)', result: 'UPDATED' });
  revalidatePath('/admin/containers');
  revalidatePath(`/admin/containers/${id}`);
}

export async function setContainerStatus(id: string, status: string) {
  if (!(CONTAINER_STATUSES as readonly string[]).includes(status)) throw new Error('유효한 상태가 아닙니다.');
  await prisma.container.update({ where: { id }, data: { status } });
  revalidatePath('/admin/containers');
  revalidatePath(`/admin/containers/${id}`);
}

// Container에 Template 분기 추가 (condition_group 별)
// 템플릿 등록 (템플릿.png 필드 전체: 템플릿명·메모·로그인 구분·기본 템플릿 여부·전시 여부·전시 기간·시작일 승인일시)
export async function addTemplate(containerId: string, formData: FormData) {
  const S = (k: string) => String(formData.get(k) ?? '').trim();
  const name = S('name');
  if (!name) throw new Error('템플릿명을 입력하세요.');
  const conditionGroup = S('conditionGroup') || '로그인';
  const isDefault = S('isDefault') === 'Y';
  const displayOn = S('displayOn') !== '미전시';
  const startAtOnApproval = formData.get('startAtOnApproval') != null;
  const startRaw = S('startAt');
  const endRaw = S('endAt');

  const template = await prisma.template.create({
    data: {
      containerId,
      name,
      conditionGroup,
      isDefault: false,
      memo: S('memo') || null,
      displayOn,
      startAtOnApproval,
      startAt: startAtOnApproval || !startRaw ? null : new Date(startRaw),
      endAt: endRaw ? new Date(endRaw) : null,
      status: 'DRAFT',
      version: 1,
    },
  });
  if (isDefault) {
    await prisma.$transaction([
      prisma.template.updateMany({ where: { containerId, id: { not: template.id } }, data: { isDefault: false } }),
      prisma.template.update({ where: { id: template.id }, data: { isDefault: true } }),
      prisma.container.update({ where: { id: containerId }, data: { defaultTemplateId: template.id } }),
    ]);
  }
  revalidatePath(`/admin/containers/${containerId}`);
  redirect(`/admin/templates/${template.id}/builder`);
}

// 템플릿 복사 — 코너 배치(TemplateCorner)까지 통째로 복사해 같은 Container에 새 템플릿 생성
export async function duplicateTemplate(containerId: string, templateId: string) {
  const src = await prisma.template.findUnique({
    where: { id: templateId },
    include: { templateCorners: { orderBy: { order: 'asc' } } },
  });
  if (!src) throw new Error('복사할 템플릿을 찾을 수 없습니다.');
  await prisma.template.create({
    data: {
      containerId,
      name: `${src.name} (복사본)`,
      conditionGroup: src.conditionGroup,
      isDefault: false,
      memo: src.memo,
      displayOn: src.displayOn,
      startAtOnApproval: src.startAtOnApproval,
      startAt: src.startAt,
      endAt: src.endAt,
      status: 'DRAFT',
      version: 1,
      templateCorners: {
        create: src.templateCorners.map((tc) => ({ cornerId: tc.cornerId, order: tc.order, visible: tc.visible })),
      },
    },
  });
  revalidatePath(`/admin/containers/${containerId}`);
}

// 템플릿 불러오기 — 다른 Container에 있는 기존 Template의 코너 배치를 이 Container로 가져와 새 Template 생성.
// Corner는 공유 라이브러리 자산이므로 TemplateCorner 링크만 새로 만든다(원본 무변경).
export async function importTemplate(containerId: string, formData: FormData) {
  const sourceId = String(formData.get('sourceTemplateId') ?? '').trim();
  if (!sourceId) throw new Error('불러올 템플릿을 선택하세요.');
  const src = await prisma.template.findUnique({
    where: { id: sourceId },
    include: {
      templateCorners: { orderBy: { order: 'asc' } },
      container: { select: { name: true } },
    },
  });
  if (!src) throw new Error('불러올 템플릿을 찾을 수 없습니다.');
  if (src.containerId === containerId) throw new Error('같은 컨테이너의 템플릿입니다. 행의 “복사”를 사용하세요.');

  const overrideName = String(formData.get('name') ?? '').trim();
  const conditionGroup = String(formData.get('conditionGroup') ?? '').trim() || src.conditionGroup;

  const created = await prisma.template.create({
    data: {
      containerId,
      name: overrideName || `${src.name} (불러옴)`,
      conditionGroup,
      isDefault: false,
      memo: src.memo,
      displayOn: src.displayOn,
      status: 'DRAFT',
      version: 1,
      templateCorners: {
        create: src.templateCorners.map((tc) => ({ cornerId: tc.cornerId, order: tc.order, visible: tc.visible })),
      },
    },
  });
  await prisma.auditLog
    .create({
      data: {
        actor: 'marina.kim@sk.com',
        targetType: 'Template',
        targetId: created.id,
        afterValue: JSON.stringify({ name: created.name, from: `${src.container.name} · ${src.name}`, corners: src.templateCorners.length }),
        reason: `템플릿 불러오기 (${src.container.name} · ${src.name} → ${created.name})`,
        result: 'CREATED',
      },
    })
    .catch(() => {});
  revalidatePath(`/admin/containers/${containerId}`);
  redirect(`/admin/templates/${created.id}/builder`);
}

// 매핑 템플릿 삭제 — 기본 Template/마지막 1개는 정책상 삭제 불가(컨테이너는 기본 Template 필수)
export async function deleteTemplate(containerId: string, templateId: string) {
  const t = await prisma.template.findUnique({ where: { id: templateId }, select: { isDefault: true } });
  if (!t) return;
  const count = await prisma.template.count({ where: { containerId } });
  if (count <= 1) throw new Error('컨테이너에는 최소 1개의 Template이 필요합니다.');
  if (t.isDefault) throw new Error('기본 Template은 삭제할 수 없습니다. 먼저 다른 Template을 기본으로 지정하세요.');
  await prisma.templateCorner.deleteMany({ where: { templateId } });
  await prisma.template.delete({ where: { id: templateId } });
  revalidatePath(`/admin/containers/${containerId}`);
}

export async function setDefaultTemplate(containerId: string, templateId: string) {
  await prisma.$transaction([
    prisma.template.updateMany({ where: { containerId }, data: { isDefault: false } }),
    prisma.template.update({ where: { id: templateId }, data: { isDefault: true } }),
    prisma.container.update({ where: { id: containerId }, data: { defaultTemplateId: templateId } }),
  ]);
  revalidatePath(`/admin/containers/${containerId}`);
}
