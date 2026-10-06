'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import {
  ATOM_TYPES,
  ATOM_TYPE_LABELS,
  COMPONENT_TYPES,
  CORNER_TYPES,
  CORNER_COMPONENT_MAP,
  isComponentAllowedInCorner,
  parseComposition,
  type AtomType,
  type ComponentType,
  type CornerType,
  type Composition,
} from '@/lib/display-taxonomy';
import { bssProductByKey } from '@/lib/bss-products';

function rp(templateId: string) {
  revalidatePath(`/admin/templates/${templateId}`);
  revalidatePath(`/admin/templates/${templateId}/builder`);
}

async function nextOrder(model: 'templateCorner' | 'cornerComponent' | 'componentAtom', where: object) {
  // @ts-expect-error dynamic model access
  const agg = await prisma[model].aggregate({ where, _max: { order: true } });
  return (agg._max.order ?? -1) + 1;
}

// ── 빌더 우측 패널: 메타 저장 (저장 시 상태는 '초안 작성중') ──
export async function saveTemplateMeta(templateId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const conditionGroup = String(formData.get('conditionGroup') ?? '').trim();
  const isDefault = String(formData.get('isDefault') ?? '') === 'on';
  const startAtRaw = String(formData.get('startAt') ?? '').trim();
  const endAtRaw = String(formData.get('endAt') ?? '').trim();
  if (!conditionGroup) throw new Error('조건 그룹을 선택/입력하세요.');

  const current = await prisma.template.findUnique({ where: { id: templateId }, select: { containerId: true } });
  if (!current) throw new Error('Template을 찾을 수 없습니다.');

  await prisma.template.update({
    where: { id: templateId },
    data: {
      ...(name ? { name } : {}),
      conditionGroup,
      isDefault,
      startAt: startAtRaw ? new Date(startAtRaw) : null,
      endAt: endAtRaw ? new Date(endAtRaw) : null,
      status: 'DRAFT', // 저장 시 초안 작성중 (ST-DSP-001)
    },
  });

  // 기본 Template 지정/해제 → Container 및 형제 Template 정합성 유지
  if (isDefault) {
    await prisma.$transaction([
      prisma.template.updateMany({
        where: { containerId: current.containerId, id: { not: templateId } },
        data: { isDefault: false },
      }),
      prisma.container.update({ where: { id: current.containerId }, data: { defaultTemplateId: templateId } }),
    ]);
  }
  rp(templateId);
}

// ── Template 메타 ───────────────────────────────────────────
export async function updateTemplateMeta(templateId: string, formData: FormData) {
  const S = (k: string) => String(formData.get(k) ?? '').trim();
  const name = S('name');
  const conditionGroup = S('conditionGroup');
  const startAtRaw = S('startAt');
  const endAtRaw = S('endAt');
  if (!name) throw new Error('템플릿명을 입력하세요.');
  if (!conditionGroup) throw new Error('로그인 구분을 선택하세요.');

  const memo = S('memo') || null;
  const displayOn = S('displayOn') !== '미전시';
  const startAtOnApproval = formData.get('startAtOnApproval') != null;
  const isDefault = S('isDefault') === 'Y';

  const current = await prisma.template.findUnique({ where: { id: templateId }, select: { containerId: true } });
  if (!current) throw new Error('Template을 찾을 수 없습니다.');

  await prisma.template.update({
    where: { id: templateId },
    data: {
      name,
      conditionGroup,
      memo,
      displayOn,
      startAtOnApproval,
      startAt: startAtOnApproval || !startAtRaw ? null : new Date(startAtRaw),
      endAt: endAtRaw ? new Date(endAtRaw) : null,
    },
  });

  // 기본 템플릿 여부 = Y 이면 이 템플릿을 기본으로 승격 (컨테이너는 기본 Template 1개 유지)
  if (isDefault) {
    await prisma.$transaction([
      prisma.template.updateMany({ where: { containerId: current.containerId, id: { not: templateId } }, data: { isDefault: false } }),
      prisma.template.update({ where: { id: templateId }, data: { isDefault: true } }),
      prisma.container.update({ where: { id: current.containerId }, data: { defaultTemplateId: templateId } }),
    ]);
  }

  revalidatePath(`/admin/containers/${current.containerId}`);
  rp(templateId);
}

// Template 로그인 구분(로그인/비로그인 등)만 변경 — 좌측 패널 빠른 토글용 (다른 필드 보존)
export async function setTemplateLogin(templateId: string, conditionGroup: string) {
  if (!conditionGroup.trim()) throw new Error('로그인 구분을 선택하세요.');
  await prisma.template.update({ where: { id: templateId }, data: { conditionGroup: conditionGroup.trim() } });
  rp(templateId);
}

// 헤더에서 템플릿명만 빠르게 변경
export async function renameTemplate(templateId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return;
  await prisma.template.update({ where: { id: templateId }, data: { name } });
  rp(templateId);
}

// ── 템플릿(매핑) 보관 / 복구 (soft-delete) ────────────────────
// 보관: 목록에서 숨기되 레코드·버전은 보존, 복구 가능. 하드 삭제 대신 안전한 제거.
export async function archiveTemplate(templateId: string) {
  const t = await prisma.template.findUnique({
    where: { id: templateId },
    select: { isDefault: true, status: true, containerId: true, archivedAt: true, name: true },
  });
  if (!t) throw new Error('Template을 찾을 수 없습니다.');
  if (t.archivedAt) throw new Error('이미 보관된 템플릿입니다.');
  if (t.isDefault) throw new Error('기본 템플릿은 보관할 수 없습니다. 먼저 다른 템플릿을 기본으로 지정하세요.');
  if (t.status === 'PUBLISHED') throw new Error('게시 중인 템플릿은 보관할 수 없습니다. 게시 중지 후 진행하세요.');
  const activeCount = await prisma.template.count({ where: { containerId: t.containerId, archivedAt: null } });
  if (activeCount <= 1) throw new Error('컨테이너의 유일한 템플릿은 보관할 수 없습니다.');

  await prisma.template.update({ where: { id: templateId }, data: { archivedAt: new Date(), archivedBy: 'marina.kim@sk.com' } });
  await prisma.auditLog.create({
    data: { actor: 'marina.kim@sk.com', targetType: 'Template', targetId: templateId, afterValue: JSON.stringify({ archived: true, name: t.name }), reason: '템플릿(매핑) 보관', result: 'UPDATED' },
  }).catch(() => {});
  revalidatePath(`/admin/containers/${t.containerId}`);
  redirect(`/admin/containers/${t.containerId}`); // 보관 후 컨테이너로 이동
}

export async function restoreTemplate(templateId: string) {
  const t = await prisma.template.findUnique({ where: { id: templateId }, select: { containerId: true, name: true } });
  if (!t) throw new Error('Template을 찾을 수 없습니다.');
  await prisma.template.update({ where: { id: templateId }, data: { archivedAt: null, archivedBy: null, retireStatus: null, retireReason: null, retireRequestedAt: null, retiredBy: null, retiredAt: null } });
  await prisma.auditLog.create({
    data: { actor: 'marina.kim@sk.com', targetType: 'Template', targetId: templateId, afterValue: JSON.stringify({ restored: true, name: t.name }), reason: '템플릿(매핑) 복구' },
  }).catch(() => {});
  revalidatePath(`/admin/containers/${t.containerId}`);
}

// ── 템플릿 폐기(삭제 대체) 승인 워크플로우 ──────────────────────
//  '승인된 적 있는' 템플릿(APPROVED 이상)은 물리 삭제 없이 폐기 요청 → BSS 승인 시 폐기(보관 처리).
//  아직 승인 전(초안/검수대기/반려)인 템플릿만 물리 삭제(deleteTemplate)를 허용한다.
const TEMPLATE_UNAPPROVED = ['DRAFT', 'REVIEW', 'REJECTED']; // 아직 한 번도 승인 안 된 상태
const TEMPLATE_RETIRE_ACTOR = 'marina.kim@sk.com';
const TEMPLATE_RETIRE_APPROVER = 'BSS 승인자';
// 'use server' 파일은 async 함수만 export 가능 → 내부 헬퍼는 비export
const isTemplateApproved = (status: string) => !TEMPLATE_UNAPPROVED.includes(status);

async function assertTemplateRemovable(t: { isDefault: boolean; containerId: string }) {
  if (t.isDefault) throw new Error('기본 템플릿은 삭제/폐기할 수 없습니다. 먼저 다른 템플릿을 기본으로 지정하세요.');
  const activeCount = await prisma.template.count({ where: { containerId: t.containerId, archivedAt: null } });
  if (activeCount <= 1) throw new Error('컨테이너의 유일한 템플릿은 삭제/폐기할 수 없습니다.');
}

// 미승인 템플릿 완전 삭제(하드 delete) — 승인 이력이 없어 거버넌스 대상 아님.
export async function deleteTemplate(templateId: string) {
  const t = await prisma.template.findUnique({ where: { id: templateId }, select: { isDefault: true, status: true, containerId: true, name: true } });
  if (!t) throw new Error('Template을 찾을 수 없습니다.');
  if (isTemplateApproved(t.status)) throw new Error('승인된 템플릿은 완전 삭제할 수 없습니다. ‘폐기 요청’으로 진행하세요.');
  await assertTemplateRemovable(t);
  // 링크·버전 정리 후 템플릿 삭제 (코너/컴포넌트는 공용 라이브러리라 보존)
  await prisma.$transaction([
    prisma.templateCorner.deleteMany({ where: { templateId } }),
    prisma.templateVersion.deleteMany({ where: { templateId } }),
    prisma.template.delete({ where: { id: templateId } }),
  ]);
  await prisma.auditLog.create({
    data: { actor: TEMPLATE_RETIRE_ACTOR, targetType: 'Template', targetId: templateId, beforeValue: JSON.stringify({ name: t.name, status: t.status }), reason: '미승인 템플릿 완전 삭제', result: 'DELETED' },
  }).catch(() => {});
  revalidatePath(`/admin/containers/${t.containerId}`);
  redirect(`/admin/containers/${t.containerId}`);
}

// 폐기 요청 (승인된 템플릿: 정상 → 폐기 승인 대기). 사유 필수.
export async function requestTemplateRetire(templateId: string, formData: FormData) {
  const reason = String(formData.get('reason') ?? '').trim();
  if (!reason) throw new Error('폐기 사유를 입력해 주세요.');
  const t = await prisma.template.findUnique({ where: { id: templateId }, select: { isDefault: true, status: true, containerId: true, retireStatus: true, name: true } });
  if (!t) throw new Error('Template을 찾을 수 없습니다.');
  if (!isTemplateApproved(t.status)) throw new Error('미승인 템플릿은 폐기 요청 대신 바로 삭제할 수 있습니다.');
  if (t.retireStatus) throw new Error('이미 폐기 요청/처리된 템플릿입니다.');
  await assertTemplateRemovable(t);
  await prisma.template.update({ where: { id: templateId }, data: { retireStatus: 'REVIEW', retireReason: reason, retireRequestedAt: new Date() } });
  await prisma.auditLog.create({
    data: { actor: TEMPLATE_RETIRE_ACTOR, targetType: 'Template', targetId: templateId, afterValue: JSON.stringify({ retireStatus: 'REVIEW' }), reason: `템플릿 폐기 요청 · ${reason}`, result: 'RETIRE_REQUESTED' },
  }).catch(() => {});
  rp(templateId);
}

// 폐기 요청 취소 (폐기 승인 대기 → 정상). 운영자 철회.
export async function cancelTemplateRetire(templateId: string) {
  const t = await prisma.template.findUnique({ where: { id: templateId }, select: { retireStatus: true } });
  if (t?.retireStatus !== 'REVIEW') throw new Error('폐기 승인 대기 상태에서만 취소할 수 있습니다.');
  await prisma.template.update({ where: { id: templateId }, data: { retireStatus: null, retireReason: null, retireRequestedAt: null } });
  await prisma.auditLog.create({
    data: { actor: TEMPLATE_RETIRE_ACTOR, targetType: 'Template', targetId: templateId, afterValue: JSON.stringify({ retireStatus: null }), reason: '템플릿 폐기 요청 취소', result: 'RETIRE_CANCELED' },
  }).catch(() => {});
  rp(templateId);
}

// 폐기 승인 (폐기 승인 대기 → 폐기됨). 보관 처리(soft-delete)로 목록에서 숨김. BSS 처리.
export async function approveTemplateRetire(templateId: string) {
  const t = await prisma.template.findUnique({ where: { id: templateId }, select: { retireStatus: true, containerId: true, name: true } });
  if (t?.retireStatus !== 'REVIEW') throw new Error('폐기 승인 대기 상태가 아닙니다.');
  await prisma.template.update({
    where: { id: templateId },
    data: { retireStatus: 'RETIRED', retiredBy: TEMPLATE_RETIRE_APPROVER, retiredAt: new Date(), archivedAt: new Date(), archivedBy: TEMPLATE_RETIRE_APPROVER },
  });
  await prisma.auditLog.create({
    data: { actor: TEMPLATE_RETIRE_APPROVER, targetType: 'Template', targetId: templateId, afterValue: JSON.stringify({ retireStatus: 'RETIRED', archived: true }), reason: '템플릿 폐기 승인 — 보관 처리(soft-delete)', result: 'RETIRED' },
  }).catch(() => {});
  revalidatePath(`/admin/containers/${t.containerId}`);
  redirect(`/admin/containers/${t.containerId}`);
}

// 폐기 반려 (폐기 승인 대기 → 정상). BSS 처리.
export async function rejectTemplateRetire(templateId: string, formData: FormData) {
  const reason = String(formData.get('reason') ?? '').trim();
  const t = await prisma.template.findUnique({ where: { id: templateId }, select: { retireStatus: true } });
  if (t?.retireStatus !== 'REVIEW') throw new Error('폐기 승인 대기 상태가 아닙니다.');
  await prisma.template.update({ where: { id: templateId }, data: { retireStatus: null, retireRequestedAt: null } });
  await prisma.auditLog.create({
    data: { actor: TEMPLATE_RETIRE_APPROVER, targetType: 'Template', targetId: templateId, afterValue: JSON.stringify({ retireStatus: null }), reason: `템플릿 폐기 반려${reason ? ` · ${reason}` : ''}`, result: 'RETIRE_REJECTED' },
  }).catch(() => {});
  rp(templateId);
}

// ── 버전 스냅샷 (임시저장 / 되돌리기 — PG-DSP-RBK-001) ──────────
// 현재 템플릿 구조(meta + corners→components→atoms)를 JSON으로 직렬화
async function serializeTemplate(templateId: string) {
  const t = await prisma.template.findUnique({
    where: { id: templateId },
    include: {
      templateCorners: {
        orderBy: { order: 'asc' },
        include: {
          corner: {
            include: {
              cornerComponents: {
                orderBy: { order: 'asc' },
                include: { component: { include: { componentAtoms: { orderBy: { order: 'asc' }, include: { atom: true } } } } },
              },
            },
          },
        },
      },
    },
  });
  if (!t) throw new Error('Template을 찾을 수 없습니다.');
  const cornerFields = (c: (typeof t.templateCorners)[number]['corner']) => ({
    name: c.name, cornerType: c.cornerType, typeLabel: c.typeLabel, title: c.title, maxItems: c.maxItems,
    sortStrategy: c.sortStrategy, status: c.status, markupId: c.markupId, layoutDetail: c.layoutDetail,
    cornerLayout: c.cornerLayout, description: c.description, mainTitle: c.mainTitle, subTitle: c.subTitle,
    subTitleIcon: c.subTitleIcon, minItems: c.minItems, noDisplayCondition: c.noDisplayCondition,
    bigBanner: c.bigBanner, bannerPosition: c.bannerPosition, bannerOptions: c.bannerOptions, cardShape: c.cardShape,
    moreButtonUse: c.moreButtonUse, moreButtonLabel: c.moreButtonLabel, moreButtonLink: c.moreButtonLink, bannerId: c.bannerId,
  });
  return {
    meta: { name: t.name, conditionGroup: t.conditionGroup, memo: t.memo, displayOn: t.displayOn, startAtOnApproval: t.startAtOnApproval, startAt: t.startAt, endAt: t.endAt },
    corners: t.templateCorners.map((tc) => ({
      order: tc.order,
      visible: tc.visible,
      corner: cornerFields(tc.corner),
      components: tc.corner.cornerComponents.map((cc) => ({
        order: cc.order,
        component: { name: cc.component.name, componentType: cc.component.componentType, description: cc.component.description, status: cc.component.status, selectedIndex: cc.component.selectedIndex, chipRows: cc.component.chipRows, allowedCornerTypes: cc.component.allowedCornerTypes },
        atoms: cc.component.componentAtoms.map((ca) => ({
          order: ca.order,
          isRequired: ca.isRequired,
          atom: { name: ca.atom.name, atomType: ca.atom.atomType, content: ca.atom.content, imageUrl: ca.atom.imageUrl, altText: ca.atom.altText, linkUrl: ca.atom.linkUrl, status: ca.atom.status },
        })),
      })),
    })),
  };
}

// 임시저장: 현재 상태를 버전 스냅샷으로 기록 (라이브 구조는 그대로, 되돌릴 수 있는 복원 지점 생성)
export async function saveTemplateSnapshot(templateId: string, label = '임시저장') {
  const snap = await serializeTemplate(templateId);
  const t = await prisma.template.update({ where: { id: templateId }, data: { version: { increment: 1 }, status: 'DRAFT' }, select: { version: true } });
  await prisma.templateVersion.create({ data: { templateId, version: t.version, label, snapshot: JSON.stringify(snap), createdBy: 'marina.kim@sk.com' } });
  rp(templateId);
}

// 버전 되돌리기: 선택한 스냅샷으로 구조를 복원 (되돌리기 전 현재 상태를 자동 스냅샷)
export async function rollbackToVersion(templateId: string, versionId: string) {
  const v = await prisma.templateVersion.findUnique({ where: { id: versionId } });
  if (!v || v.templateId !== templateId) throw new Error('버전을 찾을 수 없습니다.');
  const snap = JSON.parse(v.snapshot) as Awaited<ReturnType<typeof serializeTemplate>>;

  // 되돌리기 전 현재 상태 자동 저장 (되돌리기 자체도 되돌릴 수 있게)
  await saveTemplateSnapshot(templateId, '되돌리기 전 자동저장');

  // 유효한 배너 id만 복원 (그 사이 삭제된 배너 대비)
  const bannerIds = [...new Set(snap.corners.map((c) => c.corner.bannerId).filter(Boolean) as string[])];
  const validBanners = new Set((await prisma.banner.findMany({ where: { id: { in: bannerIds } }, select: { id: true } })).map((b) => b.id));

  const cur = await prisma.templateCorner.findMany({ where: { templateId }, select: { cornerId: true } });

  await prisma.$transaction(async (tx) => {
    // 1) 현재 링크 제거 후, 다른 템플릿이 안 쓰는 기존 코너 삭제(cascade cornerComponents)
    await tx.templateCorner.deleteMany({ where: { templateId } });
    for (const c of cur) {
      const others = await tx.templateCorner.count({ where: { cornerId: c.cornerId } });
      if (others === 0) await tx.corner.delete({ where: { id: c.cornerId } });
    }
    // 2) 스냅샷에서 코너/컴포넌트/Atom을 새 레코드로 재생성
    for (const sc of snap.corners) {
      const corner = await tx.corner.create({
        data: { ...sc.corner, bannerId: sc.corner.bannerId && validBanners.has(sc.corner.bannerId) ? sc.corner.bannerId : null },
      });
      for (const scc of sc.components) {
        const component = await tx.component.create({ data: { ...scc.component } });
        for (const sca of scc.atoms) {
          const atom = await tx.atom.create({ data: { ...sca.atom } });
          await tx.componentAtom.create({ data: { componentId: component.id, atomId: atom.id, order: sca.order, isRequired: sca.isRequired } });
        }
        await tx.cornerComponent.create({ data: { cornerId: corner.id, componentId: component.id, order: scc.order } });
      }
      await tx.templateCorner.create({ data: { templateId, cornerId: corner.id, order: sc.order, visible: sc.visible } });
    }
    // 3) meta 복원 (상태는 초안 작성중)
    await tx.template.update({
      where: { id: templateId },
      data: {
        name: snap.meta.name, conditionGroup: snap.meta.conditionGroup, memo: snap.meta.memo,
        displayOn: snap.meta.displayOn, startAtOnApproval: snap.meta.startAtOnApproval,
        startAt: snap.meta.startAt ? new Date(snap.meta.startAt) : null,
        endAt: snap.meta.endAt ? new Date(snap.meta.endAt) : null,
        status: 'DRAFT',
      },
    });
  });

  await prisma.auditLog.create({
    data: { actor: 'marina.kim@sk.com', targetType: 'Template', targetId: templateId, afterValue: JSON.stringify({ rolledBackTo: v.version, label: v.label }), reason: `버전 되돌리기 (v${v.version})` },
  }).catch(() => {});
  rp(templateId);
}

// ── Corner (Template 바디에 쌓기) ───────────────────────────
export async function addExistingCorner(templateId: string, formData: FormData) {
  const cornerId = String(formData.get('cornerId') ?? '');
  if (!cornerId) throw new Error('Corner를 선택하세요.');
  const exists = await prisma.templateCorner.findUnique({
    where: { templateId_cornerId: { templateId, cornerId } },
  });
  if (exists) {
    rp(templateId);
    return;
  }
  const order = await nextOrder('templateCorner', { templateId });
  await prisma.templateCorner.create({ data: { templateId, cornerId, order } });
  rp(templateId);
}

const nn = (formData: FormData, k: string) => {
  const v = String(formData.get(k) ?? '').trim();
  return v.length ? v : null;
};

function readCornerInfo(formData: FormData) {
  const uMinRaw = String(formData.get('userMinItems') ?? '').trim();
  const uMaxRaw = String(formData.get('userMaxItems') ?? '').trim();
  // 정의(거버넌스) 필드 — 타이틀·서브·아이콘·노출개수·카드모양은 코너 유형이 정의(2026-09-29). 빌더 저장이 건드리지 않음(상속값 보존).
  return {
    userCustomizable: String(formData.get('userCustomizable') ?? '') === '1',
    userMinItems: uMinRaw ? Number(uMinRaw) : null,
    userMaxItems: uMaxRaw ? Number(uMaxRaw) : null,
    noDisplayCondition: nn(formData, 'noDisplayCondition'),
    // 코너별 표시 항목(상품 카드 요소 on/off) — 체크박스 hidden 값 '1'/''
    showImage: String(formData.get('showImage') ?? '') === '1',
    showPrice: String(formData.get('showPrice') ?? '') === '1',
    showBadge: String(formData.get('showBadge') ?? '') === '1',
    showDesc: String(formData.get('showDesc') ?? '') === '1',
    recSource: nn(formData, 'recSource'), // (대표) 1순위 추천 수급 방식
    recSourcePlan: nn(formData, 'recSourcePlan'), // 우선순위 편성(JSON 배열, 1순위→폴백)
    showRecReason: String(formData.get('showRecReason') ?? '') === '1', // 추천 근거 표시 여부(레거시·미표시)

    // 하단 CTA(더보기/전체보기) 버튼은 '코너 구성'의 전용 컨트롤(setCornerMoreButton)에서 즉시 저장 → 코너 정보 저장이 건드리지 않는다.
    markupId: nn(formData, 'markupId'),
    layoutDetail: nn(formData, 'layoutDetail'),
    // bigBanner(빅배너로 강조)는 토글에서 즉시 저장(setCornerBigBanner) → 코너 정보 저장이 건드리지 않는다.
    // cardShape(카드 비율)는 '코너 구성'에서 전용 컨트롤(setCornerCardShape)로 관리 → 코너 정보 저장이 건드리지 않는다.
    // bannerPosition(빅배너 위치)도 '코너 구성' 컨트롤에서 즉시 저장(setCornerBannerPosition) → 코너 정보 저장이 건드리지 않는다.
    cornerLayout: nn(formData, 'cornerLayout'),
    description: nn(formData, 'description'),
    sortStrategy: nn(formData, 'sortStrategy'),
    title: nn(formData, 'title'),
    // mainTitle·subTitle·subTitleIcon·minItems·maxItems 는 코너 유형(정의)에서 관리 → 여기서 저장하지 않음(상속값 유지)
  };
}

export async function createCorner(templateId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const cornerType = String(formData.get('cornerType') ?? '');
  if (!name) throw new Error('이름을 입력하세요.');
  if (!(CORNER_TYPES as readonly string[]).includes(cornerType)) throw new Error('유효한 Corner 유형이 아닙니다.');
  const info = readCornerInfo(formData);
  const corner = await prisma.corner.create({
    data: { name, cornerType, ...info, sortStrategy: info.sortStrategy ?? 'MANUAL' },
  });
  const order = await nextOrder('templateCorner', { templateId });
  await prisma.templateCorner.create({ data: { templateId, cornerId: corner.id, order } });
  rp(templateId);
}

// ── 유형 → 코너 구성 스캐폴드 ──────────────────────────────────────────────
// 코너 유형(컴포넌트 유형·배열 상세)에 맞춰 대표 Component + Atom을 생성한다.
// 불러오기 시 '코너 구성'이 비어 있지 않고, 미리보기가 유형 형태대로 보이게 하기 위함(운영자가 이후 편집).
type ScaffoldAtom = { name: string; atomType: string; content?: string; imageUrl?: string; altText?: string; linkUrl?: string };
type ScaffoldComp = { name: string; componentType: ComponentType; atoms: ScaffoldAtom[]; chipRows?: number; selectedIndex?: number };

type CompFeats = { badge?: boolean; image?: boolean; price?: boolean; desc?: boolean };

// 한 컴포넌트(유형·순번·표시요소) → ScaffoldComp(아톰 포함). scaffoldSpecFor와 조합 기반 생성(specFromComposition)의 공용 빌더.
function buildComp(componentType: ComponentType, i: number, feats: CompFeats = {}): ScaffoldComp {
  const { badge = false, image = true, price = true, desc = true } = feats;
  const badgeAtom = (label: string): ScaffoldAtom[] => (badge ? [{ name: '배지', atomType: 'BADGE', content: label }] : []);
  switch (componentType) {
    case '선택형':
      // 업무진입형 탭형(선택형 칩)은 기본 2줄로 노출한다.
      return { name: '카테고리 탭', componentType: '선택형', selectedIndex: 0, chipRows: 2, atoms: ['전체', '카테고리1', '카테고리2', '카테고리3'].map((c) => ({ name: c, atomType: 'TEXT', content: c })) };
    case '상품형':
      // DS ListProductGrid 기준 상품 카드 — 브랜드·상품명·가격기준·할인율·가격·기간·용량·배지(한글 아톰).
      return {
        name: `상품 ${i}`,
        componentType: '상품형',
        atoms: [
          ...(image ? [{ name: '상품 이미지', atomType: 'IMAGE', imageUrl: '', altText: `상품 ${i} 이미지` }] : []),
          { name: '브랜드', atomType: 'TEXT', content: '브랜드' }, // 서브타이틀(예: Apple)
          { name: '상품명', atomType: 'TEXT', content: `상품 ${i}` },
          { name: '가격 기준', atomType: 'INFO', content: '선택 약정 12개월 기준' },
          ...badgeAtom('NEW'),
          ...(price ? [
            { name: '할인율', atomType: 'TEXT', content: '' }, // 예: 99% (비우면 미표시)
            { name: '가격', atomType: 'PRICE', content: '' },
            { name: '기간', atomType: 'INFO', content: '/12개월' },
          ] : []),
          { name: '서브텍스트', atomType: 'INFO', content: '' }, // SubText (비우면 미표시)
          ...(desc ? [{ name: '용량', atomType: 'INFO', content: '256GB | 512GB | 1TB' }] : []), // 캡션(용량 등)
        ],
      };
    case '혜택형':
      return {
        name: `혜택 ${i}`,
        componentType: '혜택형',
        atoms: [
          { name: '로고', atomType: 'ICON', imageUrl: '', altText: `브랜드 ${i}` },
          ...badgeAtom('혜택'),
          { name: '혜택 문구', atomType: 'BENEFIT_TEXT', content: `혜택 ${i} 문구를 입력하세요` },
          { name: '브랜드', atomType: 'INFO', content: `브랜드 ${i}` },
        ],
      };
    case '배너형':
      return {
        name: i > 1 ? `배너 ${i}` : '배너',
        componentType: '배너형',
        atoms: [
          { name: '배너 타이틀', atomType: 'TEXT', content: '배너 타이틀' },
          { name: '배너 설명', atomType: 'INFO', content: '배너 설명 문구' },
          { name: '배너 CTA', atomType: 'CTA', content: '자세히 보기', linkUrl: '/' },
          { name: '배너 이미지', atomType: 'IMAGE', imageUrl: '', altText: '배너 이미지' },
        ],
      };
    case '정보형':
      return {
        name: i > 1 ? `정보 카드 ${i}` : '정보 카드',
        componentType: '정보형',
        atoms: [
          { name: '아이콘', atomType: 'ICON', imageUrl: 'icon:general/Info', altText: '아이콘' },
          { name: '값', atomType: 'PRICE', content: '주요 값' },
          ...badgeAtom('상태'),
          { name: '라벨', atomType: 'TEXT', content: '라벨' },
        ],
      };
    case '행동형':
      return {
        name: i > 1 ? `바로가기 ${i}` : '바로가기',
        componentType: '행동형',
        atoms: [
          { name: '제목', atomType: 'TEXT', content: '업무 바로가기' },
          { name: '버튼', atomType: 'CTA', content: '바로가기', linkUrl: '/' },
        ],
      };
    default:
      return { name: `${componentType} ${i}`, componentType, atoms: [] };
  }
}

// 절차적 폴백 — 코너 유형에 저장된 '컴포넌트 조합'이 없을 때 컴포넌트 유형·배열로 대표 구성을 추론한다.
function scaffoldSpecFor(componentType: string | null, typeDetail: string | null, feats: CompFeats = {}): ScaffoldComp[] {
  const ct = (componentType ?? '') as ComponentType | '';
  const d = typeDetail ?? '';
  let comps: ScaffoldComp[] = [];
  switch (ct) {
    case '선택형':
      comps = [buildComp('선택형', 1, feats)];
      break;
    case '상품형':
      comps = d.includes('단일') ? [buildComp('상품형', 1, feats)] : [1, 2, 3].map((i) => buildComp('상품형', i, feats));
      break;
    case '혜택형':
      comps = [1, 2, 3].map((i) => buildComp('혜택형', i, feats));
      break;
    case '배너형':
    case '정보형':
    case '행동형':
      comps = [buildComp(ct, 1, feats)];
      break;
    default:
      comps = [];
  }
  // 배열 상세에 '카테고리탭'이 있고 주 컴포넌트가 선택형이 아니면 상단 탭을 얹는다(예: 상품형·세로형(카테고리탭)).
  if (/카테고리\s*탭/.test(d) && ct !== '선택형' && comps.length) comps = [buildComp('선택형', 1, feats), ...comps];
  return comps;
}

// 코너 유형에 저장된 '컴포넌트 조합'(CompositionBlock[]) → 실제 생성할 ScaffoldComp[]. 블록마다 count개씩 펼친다.
function specFromComposition(composition: Composition): ScaffoldComp[] {
  const comps: ScaffoldComp[] = [];
  for (const b of composition) {
    // 배너형 스와이프형 — 코너 유형에서 묶은 배너(배너 캠페인 스냅샷)를 그대로 생성. 랜딩 URL은 캠페인 값 그대로. 빌더는 순서만.
    if (b.componentType === '배너형' && b.banners && b.banners.length) {
      for (const bn of b.banners) {
        comps.push({
          name: bn.title || '배너', componentType: '배너형',
          atoms: [
            { name: '배너 타이틀', atomType: 'TEXT', content: bn.title },
            ...(bn.linkUrl ? [{ name: '배너 CTA', atomType: 'CTA', content: '자세히 보기', linkUrl: bn.linkUrl }] : []),
            ...(bn.imageUrl ? [{ name: '배너 이미지', atomType: 'IMAGE', imageUrl: bn.imageUrl, altText: bn.title }] : []),
          ],
        });
      }
      continue;
    }
    // 상품형·혜택형 — 코너 유형에서 묶은 상품·혜택 아이템(카탈로그 스냅샷)을 그대로 생성. 랜딩 URL은 담은 값 그대로. 빌더는 순서만. 2026-09-29
    //  가격이 있으면 상품/디바이스 카드(ProductCard: 브랜드·상품명 TEXT + 가격), 없으면 혜택 리스트(BenefitRow: 로고 + 혜택문구 BENEFIT_TEXT + 브랜드 INFO).
    if ((b.componentType === '상품형' || b.componentType === '혜택형') && b.items && b.items.length) {
      for (const it of b.items) {
        const isProductCard = !!it.price;
        comps.push({
          name: it.title || it.brand || '상품', componentType: b.componentType,
          atoms: isProductCard
            ? [
                ...(it.imageUrl ? [{ name: '상품 이미지', atomType: 'IMAGE', imageUrl: it.imageUrl, altText: it.title || it.brand }] : []),
                ...(it.brand && it.brand !== it.title ? [{ name: '브랜드', atomType: 'TEXT', content: it.brand }] : []),
                { name: '상품명', atomType: 'TEXT', content: it.title },
                ...(it.badge && b.badge ? [{ name: '배지', atomType: 'BADGE', content: it.badge }] : []),
                ...(it.price && b.price !== false ? [{ name: '가격', atomType: 'PRICE', content: it.price }] : []),
                ...(it.linkUrl ? [{ name: 'CTA', atomType: 'CTA', content: '자세히 보기', linkUrl: it.linkUrl }] : []),
              ]
            : [
                ...(it.imageUrl ? [{ name: '로고', atomType: it.imageUrl.startsWith('icon:') ? 'ICON' : 'IMAGE', imageUrl: it.imageUrl, altText: it.brand || it.title }] : []),
                ...(it.badge && b.badge ? [{ name: '배지', atomType: 'BADGE', content: it.badge }] : []),
                { name: '혜택 문구', atomType: 'BENEFIT_TEXT', content: it.title },
                ...(it.brand ? [{ name: '브랜드', atomType: 'INFO', content: it.brand }] : []),
                ...(it.linkUrl ? [{ name: 'CTA', atomType: 'CTA', content: '자세히 보기', linkUrl: it.linkUrl }] : []),
              ],
        });
      }
      continue;
    }
    // 선택형(탭·메뉴) — 칩 정의(라벨·링크·줄수)를 코너 유형에서 정의(2026-09-29). 그대로 생성, 빌더는 순서만 변경.
    if (b.componentType === '선택형' && b.chips && b.chips.length) {
      comps.push({
        name: '탭', componentType: '선택형', selectedIndex: 0, chipRows: b.chipRows === 2 ? 2 : 1,
        atoms: b.chips.map((c) => ({ name: c.label ? `칩:${c.label}` : '칩', atomType: 'TEXT', content: c.label ?? '', linkUrl: c.linkUrl ?? undefined, imageUrl: c.icon ?? undefined })),
      });
      continue;
    }
    const feats: CompFeats = { image: b.image, price: b.price, badge: b.badge, desc: b.desc };
    for (let i = 1; i <= b.count; i++) comps.push(buildComp(b.componentType, i, feats));
  }
  return comps;
}

// 스캐폴드 스펙대로 Component/Atom/CornerComponent 생성. 코너 유형이 허용하지 않는 컴포넌트는 건너뛴다.
async function createScaffoldComponents(cornerId: string, cornerType: string, specs: ScaffoldComp[]) {
  let order = 0;
  for (const spec of specs) {
    if (!isComponentAllowedInCorner(cornerType as CornerType, spec.componentType)) continue;
    const comp = await prisma.component.create({
      data: {
        name: spec.name,
        componentType: spec.componentType,
        status: 'active',
        ...(spec.chipRows != null ? { chipRows: spec.chipRows } : {}),
        ...(spec.selectedIndex != null ? { selectedIndex: spec.selectedIndex } : {}),
      },
    });
    for (let i = 0; i < spec.atoms.length; i++) {
      const a = spec.atoms[i];
      const atom = await prisma.atom.create({ data: { ...a, status: 'active' } });
      await prisma.componentAtom.create({ data: { componentId: comp.id, atomId: atom.id, order: i, isRequired: true } });
    }
    await prisma.cornerComponent.create({ data: { cornerId, componentId: comp.id, order } });
    order += 1;
  }
}

// 등록된 코너 유형(카탈로그) 1건 → 새 Corner 인스턴스 생성. createCornerFromType / swapCornerToType 공용.
async function createCornerInstanceFromTypeId(cornerTypeId: string) {
  const ct = cornerTypeId ? await prisma.cornerType.findUnique({ where: { id: cornerTypeId } }) : null;
  if (!ct) throw new Error('등록된 코너 유형을 찾을 수 없습니다.');
  // 정본(불러오기의 기준) = 라이브 승인본 스냅샷. 재검수 중이라도 직전 승인본으로 생성된다.
  //  liveSnapshot이 없으면(아직 미반영) 현재 컬럼값으로 폴백.
  let def: typeof ct = ct;
  if (ct.liveSnapshot) {
    try { def = { ...ct, ...(JSON.parse(ct.liveSnapshot) as Partial<typeof ct>) }; } catch { def = ct; }
  }
  if (!(CORNER_TYPES as readonly string[]).includes(def.baseCategory)) throw new Error('유효한 Corner 유형이 아닙니다.');

  const isComposite = false; // (구 개인화 추천형 복합형 라벨 제거 — 유형 7종 체계)
  const baseName = def.baseCategory; // 코너 이름 = 코너 유형과 동치(별칭 미사용)
  const nameParts = [def.typeDetail, def.bigBanner ? '빅배너' : ''].filter(Boolean);
  const name = nameParts.length ? `${baseName} · ${nameParts.join(' · ')}` : baseName;
  // 전시화면 코너의 배열명에는 빅배너를 마커로 유지(렌더/기존 시드와 일관)
  const cornerLayoutDetail = def.bigBanner ? `${def.typeDetail ?? ''} · 빅배너`.trim().replace(/^· /, '') : def.typeDetail;

  // 타입-레벨 기본값 상속(템플릿 강화) — 항목 사용여부 토글이 켜진 것만 채우고, 코너별 수정은 자유.
  const moreOn = def.defaultMoreButton && def.useMoreButton;
  const corner = await prisma.corner.create({
    data: {
      name,
      cornerType: def.baseCategory,
      typeLabel: isComposite ? baseName : null,
      layoutDetail: cornerLayoutDetail, // 유형 상세 (+ 빅배너 마커)
      cornerLayout: def.layout, // 등록된 코너 레이아웃 상속 → 미리보기 형태가 등록 유형과 일치
      markupId: def.markupId,
      description: def.description,
      // 정의(거버넌스) 기본값 상속 — 코너 유형이 '무엇인가'를 정의(2026-09-29). 빌더는 이 값을 쌓기만 하고 정의는 안 바꾼다.
      mainTitle: def.useMainTitle ? (def.defaultMainTitle ?? null) : null,
      subTitle: def.useSubTitle ? (def.defaultSubTitle ?? null) : null,
      subTitleIcon: def.useSubTitle ? (def.defaultSubTitleIcon ?? '화살표') : '사용안함',
      // 노출 개수(최소/최대)도 코너 유형에서 정의 → 상속
      minItems: def.defaultMinItems ?? null,
      maxItems: def.defaultMaxItems ?? null,
      // 카드 모양(상품형)·배너 노출 방식(스와이프형) — 코너 유형 정의 상속
      cardShape: def.defaultCardShape ?? null,
      bannerOptions: def.defaultBannerOptions ?? null,
      sortStrategy: def.defaultSortStrategy ?? 'MANUAL',
      // 추천 수급 방식 기본값 상속 (상품형·개인화 추천형) — 빌더(CVM)에서 조정
      recSource: def.defaultRecSource ?? null,
      moreButtonUse: moreOn,
      moreButtonLabel: moreOn ? (def.defaultMoreButtonLabel ?? '전체보기') : null,
      // 표시 항목(코너 유형 세부 항목) → 코너별 오버라이드 초기값 상속
      showImage: def.useImage ?? true,
      showPrice: def.usePrice ?? true,
      showBadge: def.useBadge ?? true,
      showDesc: def.useDesc ?? true,
      // 코너 유형 관리의 유형 샘플 썸네일을 코너에 상속(카드/참고용) — 컴포넌트가 생기면 미리보기는 컴포넌트로 렌더
      sampleImageUrl: def.sampleImageUrl,
      // 사용처 추적: 이 코너가 생성된 원본 코너 유형(카탈로그) id
      sourceCornerTypeId: ct.id,
      // FO 사용자 설정(고객 커스터마이즈) 기본값 상속 — 빌더에서 코너별 조정 가능
      userCustomizable: ct.userCustomizable ?? false,
      userMinItems: ct.userMinItems ?? null,
      userMaxItems: ct.userMaxItems ?? null,
    },
  });
  // 유형의 컴포넌트 유형·배열에 맞춰 '코너 구성'을 채운다. 우선순위(2026-10-06 사용자 요청 — 등록된 데이터까지 그대로):
  //  ① composition(JSON)이 있으면 그대로 생성(상품·혜택·칩·배너 등 콘텐츠 포함)
  //  ② 없으면(상태 안내형·고정필수형 등) '등록된 대표 코너'의 실제 구성을 통째로 복제 → 가이드가 아니라 실제 문구·이미지·배지까지
  //  ③ 대표도 없으면 절차적 scaffold(플레이스홀더)로 폴백
  const composition = parseComposition(def.composition);
  if (composition) {
    await createScaffoldComponents(corner.id, def.baseCategory, specFromComposition(composition));
  } else {
    const rep = await prisma.corner.findFirst({
      where: { sourceCornerTypeId: ct.id, id: { not: corner.id }, cornerComponents: { some: {} } },
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], // 상세 '대표 코너'와 동일 기준(PLACED_CORNER_ORDER)
      include: { cornerComponents: { orderBy: { order: 'asc' }, include: { component: { include: { componentAtoms: { orderBy: { order: 'asc' }, include: { atom: true } } } } } } },
    });
    if (rep && rep.cornerComponents.length) {
      await copyComponentsFromCorner(corner.id, rep);
    } else {
      await createScaffoldComponents(corner.id, def.baseCategory, scaffoldSpecFor(def.componentType, def.typeDetail, { badge: def.useBadge, image: def.useImage, price: def.usePrice, desc: def.useDesc }));
    }
  }
  return corner;
}

// 등록된 대표 코너의 구성(Component/Atom)을 새 코너로 그대로 복제 — 코너별 복제 모델(공유 아님)이므로 Component·Atom을 새로 만든다.
//  문구(content·contentVariants)·이미지·배지·링크·칩 역할(menuRole)·표시여부(visible)까지 보존(2026-10-06).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function copyComponentsFromCorner(targetCornerId: string, source: { cornerComponents: any[] }) {
  for (const cc of source.cornerComponents) {
    const sc = cc.component;
    const comp = await prisma.component.create({
      data: {
        name: sc.name,
        componentType: sc.componentType,
        description: sc.description ?? null,
        status: 'active',
        selectedIndex: sc.selectedIndex ?? 0,
        chipRows: sc.chipRows ?? 1,
        allowedCornerTypes: sc.allowedCornerTypes ?? null,
        sourceCampaignId: sc.sourceCampaignId ?? null,
        sourceSyncedAt: sc.sourceSyncedAt ?? null,
      },
    });
    for (const ca of sc.componentAtoms) {
      const a = ca.atom;
      const atom = await prisma.atom.create({
        data: {
          name: a.name,
          atomType: a.atomType,
          content: a.content ?? null,
          contentVariants: a.contentVariants ?? null,
          imageUrl: a.imageUrl ?? null,
          altText: a.altText ?? null,
          linkUrl: a.linkUrl ?? null,
          status: 'active',
        },
      });
      await prisma.componentAtom.create({ data: { componentId: comp.id, atomId: atom.id, order: ca.order, isRequired: ca.isRequired ?? true, visible: ca.visible ?? true, menuRole: ca.menuRole ?? 'EDITABLE' } });
    }
    await prisma.cornerComponent.create({ data: { cornerId: targetCornerId, componentId: comp.id, order: cc.order } });
  }
}

// 등록된 코너 유형(코너 유형 관리 카탈로그)을 그대로 상속해 코너 추가.
// base + 유형상세뿐 아니라 코너 레이아웃(가로 SWIPE형 등)·마크업·설명까지 등록된 "형태"를 반영한다.
export async function createCornerFromType(templateId: string, formData: FormData) {
  const cornerTypeId = String(formData.get('cornerTypeId') ?? '').trim();
  const useVariants = String(formData.get('useVariants') ?? '') === '1'; // 선택 유형의 전체 베리에이션을 코너에 등록
  const corner = await createCornerInstanceFromTypeId(cornerTypeId);

  // 베리에이션 함께 사용 — 같은 코너 유형(baseCategory)의 사용·반영된 베리에이션을 displayVariants로 등록.
  //  선택한 유형상세가 기본(첫 번째)이 되고, 실서비스에선 CVM이 고객별로 택1(빌더 미리보기는 기본).
  if (useVariants) {
    const picked = await prisma.cornerType.findUnique({ where: { id: cornerTypeId }, select: { baseCategory: true } });
    if (picked) {
      const sibs = await prisma.cornerType.findMany({
        where: { baseCategory: picked.baseCategory, active: true, liveVersion: { not: null } },
        select: { id: true, name: true, typeDetail: true },
      });
      if (sibs.length > 1) {
        const ordered = [...sibs].sort((a, b) => (a.id === cornerTypeId ? -1 : b.id === cornerTypeId ? 1 : 0));
        const variants = ordered.map((s) => {
          const label = s.typeDetail || s.name;
          return { typeId: s.id, typeName: s.name, label };
        });
        await prisma.corner.update({ where: { id: corner.id }, data: { displayVariants: JSON.stringify(variants) } });
      }
    }
  }

  const order = await nextOrder('templateCorner', { templateId });
  // 위치 고정 기본값 — 상단 퀵메뉴(업무 진입형)·고정필수형은 자리 잠금이 자연스러움(운영자가 체크박스로 해제 가능). 2026-10-06.
  const pinned = corner.cornerType === '업무 진입형' || corner.cornerType === '고정·필수 노출형';
  const tc = await prisma.templateCorner.create({ data: { templateId, cornerId: corner.id, order, pinned } });
  rp(templateId);
  return tc.id; // 생성된 templateCorner id → 빌더에서 새 코너로 포커싱
}

// 배너 불러오기 — 배너 캠페인 관리(전시관리)에 등록된 캠페인 1건 → 배너형 코너로 편성.
// 코너 유형의 '배너형'은 전부 배너 캠페인 관리로 귀속되므로, 빌더에선 이 액션으로 불러온다.
// 배너 캠페인 → 배너형 컴포넌트(타이틀·설명·이미지·CTA 아톰) 생성 후 componentId 반환.
// 캠페인 → 배너 컴포넌트의 아톰 스펙(제목·설명·이미지·CTA). 편성/갱신 공용.
function bannerAtomSpecs(bc: { title: string; subtitle: string | null; bannerAlt: string | null; landingUrl: string | null }, chosenImg: string) {
  return [
    { name: '배너 타이틀', atomType: 'TEXT', content: bc.title },
    ...(bc.subtitle ? [{ name: '배너 설명', atomType: 'INFO', content: bc.subtitle }] : []),
    { name: '배너 이미지', atomType: 'IMAGE', imageUrl: chosenImg, altText: bc.bannerAlt ?? bc.title },
    ...(bc.landingUrl ? [{ name: '배너 CTA', atomType: 'CTA', content: '자세히 보기', linkUrl: bc.landingUrl }] : []),
  ];
}

async function createBannerComponentFromCampaign(bc: { id?: string; title: string; subtitle: string | null; bannerAlt: string | null; landingUrl: string | null; updatedAt?: Date }, chosenImg: string) {
  // 원본 추적 저장(원본 변경 감지·갱신용).
  const comp = await prisma.component.create({ data: { name: bc.title, componentType: '배너형', sourceCampaignId: bc.id ?? null, sourceSyncedAt: bc.updatedAt ?? new Date() } });
  let i = 0;
  for (const a of bannerAtomSpecs(bc, chosenImg)) {
    const atom = await prisma.atom.create({ data: { ...a, status: 'active' } });
    await prisma.componentAtom.create({ data: { componentId: comp.id, atomId: atom.id, order: i, isRequired: true } });
    i += 1;
  }
  return comp.id;
}

// 원본(배너 캠페인) 변경을 편성된 컴포넌트에 반영 — 아톰을 최신 캠페인으로 재물질화 + 동기 시점 갱신.
export async function refreshBannerComponent(templateId: string, componentId: string) {
  const comp = await prisma.component.findUnique({ where: { id: componentId } });
  if (!comp?.sourceCampaignId) throw new Error('원본 캠페인 연결이 없는 컴포넌트입니다.');
  const bc = await prisma.bannerCampaign.findUnique({ where: { id: comp.sourceCampaignId } });
  if (!bc) throw new Error('원본 배너 캠페인을 찾을 수 없습니다.');
  // 편성 규격 유지 — 이 컴포넌트가 속한 코너의 layoutDetail로 규격 이미지 재선택.
  const cc = await prisma.cornerComponent.findFirst({ where: { componentId }, select: { corner: { select: { layoutDetail: true } } } });
  let sizes: { detail?: string; imageUrl?: string; rightImageUrl?: string; title?: string; subtitle?: string }[] = [];
  try { sizes = bc.typeDetails ? JSON.parse(bc.typeDetails) : []; } catch { sizes = []; }
  const chosen = (cc?.corner.layoutDetail && sizes.find((s) => s.detail === cc.corner.layoutDetail)) || sizes[0] || null;
  const chosenImg = chosen?.imageUrl || chosen?.rightImageUrl || '';
  // 콤포즈 제목/서브(typeDetails)를 캠페인명보다 우선 — 편성 시 보이던 카피 유지.
  const bcResolved = { ...bc, title: chosen?.title?.trim() || bc.title, subtitle: chosen?.subtitle?.trim() || bc.subtitle };
  // 기존 아톰 교체(비파괴적 링크 정리 후 재생성).
  const olds = await prisma.componentAtom.findMany({ where: { componentId }, select: { id: true, atomId: true } });
  await prisma.componentAtom.deleteMany({ where: { componentId } });
  await prisma.atom.deleteMany({ where: { id: { in: olds.map((o) => o.atomId) } } });
  let i = 0;
  for (const a of bannerAtomSpecs(bcResolved, chosenImg)) {
    const atom = await prisma.atom.create({ data: { ...a, status: 'active' } });
    await prisma.componentAtom.create({ data: { componentId, atomId: atom.id, order: i, isRequired: true } });
    i += 1;
  }
  await prisma.component.update({ where: { id: componentId }, data: { name: bcResolved.title, sourceSyncedAt: bc.updatedAt } });
  rp(templateId);
}

// 배너 불러오기 — targetCornerId 가 있으면 기존 배너 코너에 '한 장 더' 추가(스와이프 캐러셀), 없으면 새 배너 코너 생성.
export async function importBannerCampaignCorner(templateId: string, campaignId: string, sizeDetail?: string, targetCornerId?: string) {
  const bc = await prisma.bannerCampaign.findUnique({ where: { id: campaignId } });
  if (!bc) throw new Error('배너 캠페인을 찾을 수 없습니다.');
  // 유형상세(사이즈별) 중 선택한 규격 → 없으면 첫 번째. 이미지도 해당 규격 것으로.
  let sizes: { detail?: string; imageUrl?: string; rightImageUrl?: string; title?: string; subtitle?: string }[] = [];
  try { sizes = bc.typeDetails ? JSON.parse(bc.typeDetails) : []; } catch { sizes = []; }
  const chosen = (sizeDetail && sizes.find((s) => s.detail === sizeDetail)) || sizes[0] || null;
  const chosenDetail = chosen?.detail || sizeDetail || '팝업배너 (720×600)';
  const chosenImg = chosen?.imageUrl || chosen?.rightImageUrl || '';
  // 콤포즈 제목/서브(typeDetails)를 캠페인명보다 우선 — 편성 배너에 실제 노출 카피가 들어가게.
  const bcResolved = { ...bc, title: chosen?.title?.trim() || bc.title, subtitle: chosen?.subtitle?.trim() || bc.subtitle };

  const compId = await createBannerComponentFromCampaign(bcResolved, chosenImg);

  // 기존 배너 코너에 추가(캐러셀 한 장 더). 코너의 규격(layoutDetail)은 유지.
  if (targetCornerId) {
    const target = await prisma.corner.findUnique({ where: { id: targetCornerId }, select: { id: true, cornerType: true } });
    if (!target || target.cornerType !== '배너형') throw new Error('배너형 코너가 아닙니다.');
    const order = await prisma.cornerComponent.count({ where: { cornerId: targetCornerId } });
    await prisma.cornerComponent.create({ data: { cornerId: targetCornerId, componentId: compId, order } });
    rp(templateId);
    const tc = await prisma.templateCorner.findFirst({ where: { templateId, cornerId: targetCornerId }, select: { id: true } });
    return tc?.id ?? null;
  }

  // 새 배너 코너 생성
  const corner = await prisma.corner.create({
    data: {
      name: `배너 · ${bc.title}`,
      cornerType: '배너형',
      layoutDetail: chosenDetail,
      description: bc.purpose ?? bc.subtitle ?? null,
      sortStrategy: 'MANUAL',
    },
  });
  await prisma.cornerComponent.create({ data: { cornerId: corner.id, componentId: compId, order: 0 } });
  const order = await nextOrder('templateCorner', { templateId });
  const tc = await prisma.templateCorner.create({ data: { templateId, cornerId: corner.id, order } });
  rp(templateId);
  return tc.id;
}

// 코너 불러오기(슬롯 교체) — 코너 유형 관리 카탈로그에서 고른 유형으로 이 슬롯을 교체한다.
// 기존 인스턴스 재사용(swapCornerRef)이 아니라, 등록된 유형의 형태를 그대로 상속한 새 코너로 채운다.
export async function swapCornerToType(templateId: string, templateCornerId: string, formData: FormData) {
  const cornerTypeId = String(formData.get('cornerTypeId') ?? '').trim();
  if (!cornerTypeId) return;
  const corner = await createCornerInstanceFromTypeId(cornerTypeId);
  await prisma.templateCorner.update({ where: { id: templateCornerId }, data: { cornerId: corner.id } });
  rp(templateId);
}

// 코너 정보 편집 (코너1·코너2 컬럼)
export async function updateCornerMeta(templateId: string, cornerId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const cornerType = String(formData.get('cornerType') ?? '');
  if (!name) throw new Error('코너명을 입력하세요.');
  if (!(CORNER_TYPES as readonly string[]).includes(cornerType)) throw new Error('유효한 Corner 유형이 아닙니다.');

  // 유형 변경 시 이미 배치된 Component가 새 유형에 허용되는지 검증 (PI-DSP-CMP-003)
  const existing = await prisma.cornerComponent.findMany({
    where: { cornerId },
    include: { component: { select: { componentType: true, name: true } } },
  });
  for (const cc of existing) {
    if (!isComponentAllowedInCorner(cornerType as CornerType, cc.component.componentType as ComponentType)) {
      throw new Error(
        `유형을 ${cornerType}(으)로 바꾸면 배치된 "${cc.component.name}"(${cc.component.componentType})이(가) 허용되지 않습니다. 먼저 해당 Component를 제거하세요.`,
      );
    }
  }

  const info = readCornerInfo(formData);
  await prisma.corner.update({ where: { id: cornerId }, data: { name, cornerType, ...info } });
  // 코너에서 유형/유형상세를 바꾸면 '코너 유형 관리' 카탈로그에도 동일 유형을 정리(없으면 등록)
  await ensureCornerTypeCatalog(cornerType, info.layoutDetail ?? null, info.cornerLayout ?? null, info.markupId ?? null);
  rp(templateId);
}

// 코너의 (기준분류 · 유형상세) 조합을 코너 유형 관리 카탈로그에 정리한다.
// 이미 같은 조합이 있으면 그대로 두고, 없으면 새 유형으로 등록한다 → 코너 변경이 카탈로그에 반영된다.
async function ensureCornerTypeCatalog(
  baseCategory: string,
  typeDetail: string | null,
  layout: string | null,
  markupId: string | null,
) {
  // 전시/관리(CY*) 카탈로그에는 '전시 계열' 유형만 자동 등록한다. 이벤트/미션 계열(EV*)은 이벤트 카탈로그(시드) 소관 —
  //  프로모션 본문 빌더에서 온 이벤트 코너가 전시/관리 코너 유형을 만들지 않도록 방지(전시/관리 영향 0).
  const EVENT_FAMILIES = ['혜택상품형', '디스플레이형', '동작형'];
  if (EVENT_FAMILIES.includes(baseCategory)) return;
  const detail = typeDetail?.trim() || null;
  const existing = await prisma.cornerType.findFirst({ where: { baseCategory, typeDetail: detail } });
  if (existing) return;
  const count = await prisma.cornerType.count();
  const typeId = 'CY' + String(count + 1).padStart(7, '0');
  const baseName = baseCategory; // 코너 유형 관리 이름 = 코너 유형과 동치(별칭 미사용)
  // 같은 기준분류가 이미 있으면 유형상세를 붙여 구분, 없으면 기본 이름
  const sameBase = await prisma.cornerType.count({ where: { baseCategory } });
  const name = detail && sameBase > 0 ? `${baseName} · ${detail}` : baseName;
  await prisma.cornerType.create({
    data: {
      typeId,
      name,
      baseCategory,
      typeDetail: detail,
      layout: layout || null,
      markupId: markupId || null,
      channels: 'FO',
      platforms: '모바일',
      active: true,
      status: 'APPROVED',
      createdBy: '김마리나',
    },
  });
  revalidatePath('/admin/corner-types');
}

export async function removeCorner(templateId: string, templateCornerId: string) {
  await prisma.templateCorner.delete({ where: { id: templateCornerId } });
  rp(templateId);
}

// 카드 비율(가로형 2.5배열) — '코너 구성'의 전용 컨트롤에서 호출. 코너 정보 저장과 독립.
//  값: '1:1' | '3:4' | '4:3' (레거시 정사각형/직사각형은 UI에서 정규화). 빈 문자열이면 해제(null).
export async function setCornerCardShape(templateId: string, cornerId: string, cardShape: string) {
  await prisma.corner.update({ where: { id: cornerId }, data: { cardShape: cardShape || null } });
  rp(templateId);
}

// 상품 카드 제목 줄 수(1=한 줄 말줄임 | 2=두 줄) — '코너 구성' 전용 컨트롤에서 호출. 코너 정보 저장과 독립.
export async function setCornerTitleLines(templateId: string, cornerId: string, lines: number) {
  await prisma.corner.update({ where: { id: cornerId }, data: { titleLines: lines === 2 ? 2 : null } });
  rp(templateId);
}

// 노출 타입 베리에이션 — '코너 구성' 전용 컨트롤에서 즉시 저장. 한 코너에 노출 타입 2~3개 등록,
//  실서비스에선 CVM이 고객마다 택1(빌더 미리보기는 첫 번째=기본만 표시). 회의 2026-08-31. JSON [{label,note}].
export async function setCornerDisplayVariants(templateId: string, cornerId: string, variantsJson: string) {
  await prisma.corner.update({ where: { id: cornerId }, data: { displayVariants: variantsJson && variantsJson.trim() ? variantsJson : null } });
  rp(templateId);
}

// 수급 방식(CVM/운영자 편성) + 상품 정렬 즉시 저장 — '코너 구성' 카드의 RecSourceControl용(2026-10-06: 코너 정보 수정 폼에서 분리).
export async function setCornerRecSource(templateId: string, cornerId: string, recSource: string, recSourcePlan: string, sortStrategy?: string) {
  await prisma.corner.update({
    where: { id: cornerId },
    data: {
      recSource: recSource && recSource.trim() ? recSource : null,
      recSourcePlan: recSourcePlan && recSourcePlan.trim() ? recSourcePlan : null,
      ...(sortStrategy !== undefined ? { sortStrategy: sortStrategy || null } : {}),
    },
  });
  rp(templateId);
}

// 타이틀 베리에이션 — 타겟별 대체 타이틀 JSON [{text,target}] 즉시 저장. 실서비스 CVM 택1(기본=mainTitle).
export async function setCornerMainTitleVariants(templateId: string, cornerId: string, variantsJson: string) {
  await prisma.corner.update({ where: { id: cornerId }, data: { mainTitleVariants: variantsJson && variantsJson.trim() ? variantsJson : null } });
  rp(templateId);
}

// 빅배너로 강조 토글 — 즉시 저장(코너 정보 저장과 독립). 켜면 곧바로 selectedCorner.bigBanner가 갱신돼 '상단 배너' 패널이 뜬다.
export async function setCornerBigBanner(templateId: string, cornerId: string, on: boolean) {
  await prisma.corner.update({ where: { id: cornerId }, data: { bigBanner: on } });
  rp(templateId);
}

// 빅배너 위치(상단/하단) — '코너 구성' 컨트롤에서 즉시 저장. 코너 정보 저장과 독립.
export async function setCornerBannerPosition(templateId: string, cornerId: string, pos: string) {
  await prisma.corner.update({ where: { id: cornerId }, data: { bannerPosition: pos === '하단' ? '하단' : '상단' } });
  rp(templateId);
}

// 배너형 코너 규격(빅/스몰/띠/팝업) — '코너 구성'의 배너 레일에서 즉시 저장(layoutDetail). 코너 정보 저장과 독립.
export async function setCornerBannerSize(templateId: string, cornerId: string, size: string) {
  await prisma.corner.update({ where: { id: cornerId }, data: { layoutDetail: size } });
  rp(templateId);
}

// 배너형 코너 노출 옵션(스와이프/자동 슬라이드 + 간격·인디케이터·루프) — '코너 구성'의 배너 레일 컨트롤에서 즉시 저장.
//  값은 JSON {mode,intervalSec,showIndicator,loop}. 배너형 코너에만 의미(1장이면 옵션 무관 단일 노출).
export async function setBannerOptions(templateId: string, cornerId: string, optionsJson: string | null) {
  // 유효성: 화이트리스트 mode + 숫자 범위만 통과시켜 저장(임의 값 방지).
  let clean: string | null = null;
  if (optionsJson) {
    try {
      const o = JSON.parse(optionsJson) as { mode?: string; intervalSec?: number; showIndicator?: boolean; loop?: boolean };
      const mode = o.mode === 'auto' ? 'auto' : 'swipe';
      const intervalSec = Math.min(15, Math.max(2, Number(o.intervalSec) || 4));
      clean = JSON.stringify({ mode, intervalSec, showIndicator: o.showIndicator !== false, loop: o.loop !== false });
    } catch { clean = null; }
  }
  await prisma.corner.update({ where: { id: cornerId }, data: { bannerOptions: clean } });
  rp(templateId);
}

// 하단 CTA(더보기/전체보기) 버튼 — '코너 구성' 전용 컨트롤에서 즉시 저장(사용여부·문구·링크). 코너 정보 저장과 독립.
export async function setCornerMoreButton(templateId: string, cornerId: string, use: boolean, label: string, link: string) {
  await prisma.corner.update({
    where: { id: cornerId },
    data: { moreButtonUse: use, moreButtonLabel: use ? (label.trim() || '전체보기') : null, moreButtonLink: use ? (link.trim() || null) : null },
  });
  rp(templateId);
}

// 코너 복제 (포탈3 복제) — 코너를 통째로 복사해 바로 뒤에 삽입
export async function duplicateCorner(templateId: string, templateCornerId: string) {
  const tc = await prisma.templateCorner.findUnique({
    where: { id: templateCornerId },
    include: { corner: { include: { cornerComponents: { orderBy: { order: 'asc' } } } } },
  });
  if (!tc) throw new Error('복제할 코너를 찾을 수 없습니다.');
  const s = tc.corner;
  const copy = await prisma.corner.create({
    data: {
      name: `${s.name} (복사본)`,
      cornerType: s.cornerType,
      title: s.title,
      maxItems: s.maxItems,
      sortStrategy: s.sortStrategy,
      status: 'active',
      markupId: s.markupId,
      layoutDetail: s.layoutDetail,
      cornerLayout: s.cornerLayout,
      description: s.description,
      mainTitle: s.mainTitle,
      subTitle: s.subTitle,
      subTitleIcon: s.subTitleIcon,
      minItems: s.minItems,
      noDisplayCondition: s.noDisplayCondition,
      moreButtonUse: s.moreButtonUse,
      moreButtonLabel: s.moreButtonLabel,
      moreButtonLink: s.moreButtonLink,
      bannerId: s.bannerId,
    },
  });
  if (s.cornerComponents.length) {
    await prisma.cornerComponent.createMany({
      data: s.cornerComponents.map((cc) => ({ cornerId: copy.id, componentId: cc.componentId, order: cc.order })),
    });
  }
  const insertAt = tc.order + 1;
  await prisma.templateCorner.updateMany({
    where: { templateId, order: { gte: insertAt } },
    data: { order: { increment: 1 } },
  });
  await prisma.templateCorner.create({ data: { templateId, cornerId: copy.id, order: insertAt } });
  rp(templateId);
}

// 코너 노출/비노출 토글 (전시 여부)
export async function toggleCornerVisible(templateId: string, templateCornerId: string) {
  const tc = await prisma.templateCorner.findUnique({ where: { id: templateCornerId }, select: { visible: true } });
  if (!tc) return;
  await prisma.templateCorner.update({ where: { id: templateCornerId }, data: { visible: !tc.visible } });
  rp(templateId);
}

// 위치 고정 토글 — 이 배치 코너를 고정(상단 잠금)/해제. 고정 코너는 드래그 재정렬·CVM 자동 재정렬에서 제외(2026-10-06).
export async function toggleCornerPinned(templateId: string, templateCornerId: string) {
  const tc = await prisma.templateCorner.findUnique({ where: { id: templateCornerId }, select: { pinned: true } });
  if (!tc) return;
  await prisma.templateCorner.update({ where: { id: templateCornerId }, data: { pinned: !tc.pinned } });
  rp(templateId);
}

export async function reorderCorners(templateId: string, orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, i) => prisma.templateCorner.update({ where: { id }, data: { order: i } })),
  );
  rp(templateId);
}

// ── Component (Corner에 올리기) ─────────────────────────────
async function assertAllowed(cornerId: string, componentId: string) {
  const [corner, component] = await Promise.all([
    prisma.corner.findUnique({ where: { id: cornerId }, select: { cornerType: true } }),
    prisma.component.findUnique({ where: { id: componentId }, select: { componentType: true, allowedCornerTypes: true, name: true } }),
  ]);
  if (!corner || !component) throw new Error('대상을 찾을 수 없습니다.');
  if (!isComponentAllowedInCorner(corner.cornerType as CornerType, component.componentType as ComponentType)) {
    throw new Error(`[PI-DSP-CMP-003] ${component.name}(${component.componentType})은(는) ${corner.cornerType} 코너에 배치할 수 없습니다.`);
  }
  const allowed: string[] = component.allowedCornerTypes ? JSON.parse(component.allowedCornerTypes) : [];
  if (allowed.length && !allowed.includes(corner.cornerType)) {
    throw new Error(`${component.name}은(는) ${corner.cornerType} 코너 사용이 허용되지 않았습니다.`);
  }
}

export async function addExistingComponent(templateId: string, cornerId: string, formData: FormData) {
  const componentId = String(formData.get('componentId') ?? '');
  if (!componentId) throw new Error('Component를 선택하세요.');
  await assertAllowed(cornerId, componentId);
  const exists = await prisma.cornerComponent.findUnique({
    where: { cornerId_componentId: { cornerId, componentId } },
  });
  if (!exists) {
    const order = await nextOrder('cornerComponent', { cornerId });
    await prisma.cornerComponent.create({ data: { cornerId, componentId, order } });
  }
  rp(templateId);
}

export async function createComponent(templateId: string, cornerId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const componentType = String(formData.get('componentType') ?? '');
  if (!name) throw new Error('이름을 입력하세요.');
  if (!(COMPONENT_TYPES as readonly string[]).includes(componentType)) throw new Error('유효한 Component 유형이 아닙니다.');
  const corner = await prisma.corner.findUnique({ where: { id: cornerId }, select: { cornerType: true } });
  if (!corner) throw new Error('Corner를 찾을 수 없습니다.');
  if (!isComponentAllowedInCorner(corner.cornerType as CornerType, componentType as ComponentType)) {
    throw new Error(`[PI-DSP-CMP-003] ${componentType}은(는) ${corner.cornerType} 코너에 배치할 수 없습니다.`);
  }
  const component = await prisma.component.create({ data: { name, componentType, status: 'active' } });
  const order = await nextOrder('cornerComponent', { cornerId });
  await prisma.cornerComponent.create({ data: { cornerId, componentId: component.id, order } });
  rp(templateId);
}

// 코너의 첫 컴포넌트와 동일한 Atom 구성(유형)을, 값 없이 비워서 새 컴포넌트로 추가.
// (예: 상품형 코너 → 인크레더블3의 이미지/텍스트/정보값 구성을 빈 상태로 복제)
export async function addBlankComponent(templateId: string, cornerId: string) {
  const corner = await prisma.corner.findUnique({
    where: { id: cornerId },
    select: {
      cornerType: true,
      cornerComponents: {
        orderBy: { order: 'asc' },
        include: { component: { include: { componentAtoms: { orderBy: { order: 'asc' }, include: { atom: true } } } } },
      },
    },
  });
  if (!corner) throw new Error('Corner를 찾을 수 없습니다.');
  const allowed = CORNER_COMPONENT_MAP[corner.cornerType as CornerType] ?? [];
  // 콘텐츠(본문) 컴포넌트 추가 → 선택형(칩/탭)이 아니라 본문 컴포넌트 유형/구성을 따른다(칩으로 들어가지 않게).
  const bodyComp = corner.cornerComponents.map((cc) => cc.component).find((c) => c.componentType !== '선택형');
  const componentType = bodyComp?.componentType ?? (allowed as string[]).find((t) => t !== '선택형') ?? '상품형';
  // 복제할 Atom 유형 구성 (본문 컴포넌트 기준, 없으면 상품형 기본: 이미지/텍스트/설명).
  // 이름은 유형 라벨로 일반화해 값 없는 "빈 항목"으로 만든다.
  const label = (t: string) => ATOM_TYPE_LABELS[t as AtomType] ?? t;
  const atomSpec = bodyComp
    ? bodyComp.componentAtoms.map((ca) => ({ atomType: ca.atom.atomType, name: label(ca.atom.atomType), isRequired: ca.isRequired }))
    : [
        { atomType: 'IMAGE', name: '이미지', isRequired: true },
        { atomType: 'TEXT', name: '텍스트', isRequired: true },
        { atomType: 'INFO', name: '설명', isRequired: true },
      ];

  const component = await prisma.component.create({ data: { name: '새 항목', componentType, status: 'active' } });
  // 빈 Atom들 생성 후 컴포넌트에 순서대로 연결
  for (let i = 0; i < atomSpec.length; i++) {
    const spec = atomSpec[i];
    const atom = await prisma.atom.create({ data: { name: spec.name, atomType: spec.atomType, status: 'active' } });
    await prisma.componentAtom.create({ data: { componentId: component.id, atomId: atom.id, order: i, isRequired: spec.isRequired } });
  }
  const order = await nextOrder('cornerComponent', { cornerId });
  await prisma.cornerComponent.create({ data: { cornerId, componentId: component.id, order } });
  rp(templateId);
}

// BSS 상품(혜택 브랜드) 불러오기 — 카탈로그에서 고른 브랜드를 로고·이름·대표 혜택이 채워진 컴포넌트로 코너에 추가.
//  아톰 구성은 코너의 첫 컴포넌트 구조를 따르되(없으면 로고+이름+혜택 기본), 값은 브랜드 정보로 채운다.
export async function addBssProduct(templateId: string, cornerId: string, productKey: string) {
  const product = bssProductByKey(productKey);
  if (!product) throw new Error('상품을 찾을 수 없습니다.');
  const corner = await prisma.corner.findUnique({
    where: { id: cornerId },
    select: {
      cornerType: true,
      cornerComponents: {
        orderBy: { order: 'asc' },
        include: { component: { include: { componentAtoms: { orderBy: { order: 'asc' }, include: { atom: true } } } } },
      },
    },
  });
  if (!corner) throw new Error('Corner를 찾을 수 없습니다.');
  const allowed = CORNER_COMPONENT_MAP[corner.cornerType as CornerType] ?? [];
  // BSS 상품 = '콘텐츠(본문)' 아이템 → 선택형(칩/탭)이 아니라 본문 컴포넌트 유형/구성을 따른다(칩으로 들어가지 않게).
  const bodyComp = corner.cornerComponents.map((cc) => cc.component).find((c) => c.componentType !== '선택형');
  const componentType = bodyComp?.componentType ?? (allowed as string[]).find((t) => t !== '선택형') ?? '상품형';

  const isVisual = (t: string) => t === 'ICON' || t === 'IMAGE';
  const isText = (t: string) => ['TEXT', 'BENEFIT_TEXT', 'INFO', 'PRICE', 'CTA', 'BADGE'].includes(t);
  const label = (t: string) => ATOM_TYPE_LABELS[t as AtomType] ?? t;
  const baseTypes = bodyComp && bodyComp.componentAtoms.length ? bodyComp.componentAtoms.map((ca) => ca.atom.atomType) : ['ICON', 'BENEFIT_TEXT', 'INFO'];

  // 값 채우기: 첫 시각 아톰=로고, 첫 텍스트=브랜드명, 다음 텍스트=대표 혜택
  let logoUsed = false, nameUsed = false, benefitUsed = false;
  const specs = baseTypes.map((atomType) => {
    let content: string | null = null, imageUrl: string | null = null, altText: string | null = null, name = label(atomType);
    if (isVisual(atomType) && !logoUsed) { imageUrl = product.logo; altText = product.name; name = '로고'; logoUsed = true; }
    else if (isText(atomType) && !nameUsed) { content = product.name; name = '브랜드명'; nameUsed = true; }
    else if (isText(atomType) && !benefitUsed) { content = product.benefit; name = '혜택'; benefitUsed = true; }
    return { atomType, name, content, imageUrl, altText };
  });
  // 스펙에 로고/이름 자리가 없으면 최소 보강
  if (!logoUsed) specs.unshift({ atomType: 'ICON', name: '로고', content: null, imageUrl: product.logo, altText: product.name });
  if (!nameUsed) specs.push({ atomType: 'BENEFIT_TEXT', name: '브랜드명', content: product.name, imageUrl: null, altText: null });

  const component = await prisma.component.create({ data: { name: product.name, componentType, status: 'active' } });
  for (let i = 0; i < specs.length; i++) {
    const s = specs[i];
    const atom = await prisma.atom.create({ data: { name: s.name, atomType: s.atomType, status: 'active', content: s.content, imageUrl: s.imageUrl, altText: s.altText } });
    await prisma.componentAtom.create({ data: { componentId: component.id, atomId: atom.id, order: i, isRequired: false } });
  }
  const order = await nextOrder('cornerComponent', { cornerId });
  await prisma.cornerComponent.create({ data: { cornerId, componentId: component.id, order } });
  rp(templateId);
}

export async function removeComponent(templateId: string, cornerComponentId: string) {
  await prisma.cornerComponent.delete({ where: { id: cornerComponentId } });
  rp(templateId);
}

// 상단 카테고리 탭 토글 — 탭 = 선택형 컴포넌트. 있으면 제거(끄기), 없으면 카테고리 탭 스캐폴드 추가(켜기).
export async function toggleCornerTab(templateId: string, cornerId: string) {
  const corner = await prisma.corner.findUnique({
    where: { id: cornerId },
    select: { cornerType: true, cornerComponents: { include: { component: { select: { componentType: true } } } } },
  });
  if (!corner) throw new Error('Corner를 찾을 수 없습니다.');
  const tabCC = corner.cornerComponents.find((cc) => cc.component.componentType === '선택형');
  if (tabCC) {
    await prisma.cornerComponent.delete({ where: { id: tabCC.id } }); // 끄기
  } else {
    if (!isComponentAllowedInCorner(corner.cornerType as CornerType, '선택형')) {
      throw new Error(`${corner.cornerType} 유형은 상단 카테고리 탭(선택형)을 담을 수 없습니다.`);
    }
    await createScaffoldComponents(cornerId, corner.cornerType, [
      { name: '카테고리 탭', componentType: '선택형', selectedIndex: 0, atoms: ['전체', '카테고리1', '카테고리2', '카테고리3'].map((c) => ({ name: c, atomType: 'TEXT', content: c })) },
    ]);
  }
  rp(templateId);
}

// 컴포넌트 이름 변경 (componentId = Component.id)
export async function renameComponent(templateId: string, componentId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return;
  await prisma.component.update({ where: { id: componentId }, data: { name } });
  rp(templateId);
}

export async function moveComponent(templateId: string, cornerId: string, cornerComponentId: string, dir: 'up' | 'down') {
  const items = await prisma.cornerComponent.findMany({ where: { cornerId }, orderBy: { order: 'asc' } });
  const idx = items.findIndex((i) => i.id === cornerComponentId);
  const swap = dir === 'up' ? idx - 1 : idx + 1;
  if (idx < 0 || swap < 0 || swap >= items.length) {
    rp(templateId);
    return;
  }
  await prisma.$transaction([
    prisma.cornerComponent.update({ where: { id: items[idx].id }, data: { order: items[swap].order } }),
    prisma.cornerComponent.update({ where: { id: items[swap].id }, data: { order: items[idx].order } }),
  ]);
  rp(templateId);
}

// 코너 구성 컴포넌트 드래그앤드롭 재정렬 (좌측 코너 리스트와 동일 방식)
export async function reorderComponents(templateId: string, cornerId: string, orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, i) => prisma.cornerComponent.update({ where: { id }, data: { order: i } })),
  );
  rp(templateId);
}

// ── Atom (Component에 넣기) ─────────────────────────────────
export async function addExistingAtom(templateId: string, componentId: string, formData: FormData) {
  const atomId = String(formData.get('atomId') ?? '');
  const isRequired = String(formData.get('isRequired') ?? 'true') === 'true';
  if (!atomId) throw new Error('Atom을 선택하세요.');
  const exists = await prisma.componentAtom.findUnique({
    where: { componentId_atomId: { componentId, atomId } },
  });
  if (!exists) {
    const order = await nextOrder('componentAtom', { componentId });
    await prisma.componentAtom.create({ data: { componentId, atomId, order, isRequired } });
  }
  rp(templateId);
}

export async function createAtom(templateId: string, componentId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const atomType = String(formData.get('atomType') ?? '');
  const nn = (k: string) => {
    const v = String(formData.get(k) ?? '').trim();
    return v.length ? v : null;
  };
  if (!name) throw new Error('이름을 입력하세요.');
  if (!(ATOM_TYPES as readonly string[]).includes(atomType)) throw new Error('유효한 Atom 유형이 아닙니다.');
  const atom = await prisma.atom.create({
    data: {
      name,
      atomType,
      content: nn('content'),
      imageUrl: nn('imageUrl'),
      altText: nn('altText'),
      linkUrl: nn('linkUrl'),
      status: 'active',
    },
  });
  const order = await nextOrder('componentAtom', { componentId });
  await prisma.componentAtom.create({ data: { componentId, atomId: atom.id, order, isRequired: true } });
  rp(templateId);
}

export async function removeAtom(templateId: string, componentAtomId: string) {
  await prisma.componentAtom.delete({ where: { id: componentAtomId } });
  rp(templateId);
}

// Atom 값 인라인 수정 (문구/이미지/대체텍스트/링크)
export async function updateAtom(templateId: string, atomId: string, formData: FormData) {
  const nnv = (k: string) => {
    const v = String(formData.get(k) ?? '').trim();
    return v.length ? v : null;
  };
  await prisma.atom.update({
    where: { id: atomId },
    data: { content: nnv('content'), imageUrl: nnv('imageUrl'), altText: nnv('altText'), linkUrl: nnv('linkUrl') },
  });
  rp(templateId);
}

// 컴포넌트의 Atom들을 한 번에 저장 (개별 저장 버튼 없이 '완료'에서 일괄 처리)
export async function saveAtoms(
  templateId: string,
  updates: { atomId: string; componentAtomId?: string; visible?: boolean; atomType?: string; content: string | null; contentVariants?: string | null; imageUrl: string | null; altText: string | null; linkUrl: string | null }[],
) {
  const norm = (v: string | null) => (v && v.trim().length ? v.trim() : null);
  const ATOM_TYPES = new Set(['TEXT', 'BUTTON', 'IMAGE', 'ICON', 'BADGE', 'PRICE', 'BENEFIT_TEXT', 'CTA', 'INFO', 'BARCODE']);
  if (updates.length) {
    await prisma.$transaction([
      ...updates.map((u) =>
        prisma.atom.update({
          where: { id: u.atomId },
          // atomType은 아이콘↔이미지 전환(정보형 아이콘/이미지형)에서만 바뀜 — 유효값일 때만 반영. contentVariants=문구 베리에이션(JSON).
          data: { content: norm(u.content), contentVariants: u.contentVariants ?? undefined, imageUrl: norm(u.imageUrl), altText: norm(u.altText), linkUrl: norm(u.linkUrl), ...(u.atomType && ATOM_TYPES.has(u.atomType) ? { atomType: u.atomType } : {}) },
        }),
      ),
      // 표시/숨김(visible)은 ComponentAtom(정션)에 저장
      ...updates
        .filter((u) => u.componentAtomId && typeof u.visible === 'boolean')
        .map((u) => prisma.componentAtom.update({ where: { id: u.componentAtomId! }, data: { visible: u.visible! } })),
    ]);
  }
  rp(templateId);
}

// ── 선택형(칩/탭) 컴포넌트 = ChipPage (업무진입형.png) ───────
// 칩 = TEXT Atom (content=라벨, linkUrl=이동 페이지). Selection = Component.selectedIndex
export async function updateChip(templateId: string, atomId: string, formData: FormData) {
  const content = String(formData.get('content') ?? '').trim() || null;
  const linkUrl = String(formData.get('linkUrl') ?? '').trim() || null;
  await prisma.atom.update({ where: { id: atomId }, data: { content, linkUrl, name: content ? `칩:${content}` : undefined } });
  rp(templateId);
}

export async function addChip(templateId: string, componentId: string, formData: FormData) {
  const content = String(formData.get('content') ?? '').trim();
  const linkUrl = String(formData.get('linkUrl') ?? '').trim() || null;
  if (!content) throw new Error('칩 라벨을 입력하세요.');
  const atom = await prisma.atom.create({ data: { name: `칩:${content}`, atomType: 'TEXT', content, linkUrl, status: 'active' } });
  const order = await nextOrder('componentAtom', { componentId });
  await prisma.componentAtom.create({ data: { componentId, atomId: atom.id, order, isRequired: true } });
  rp(templateId);
}

export async function setChipSelection(templateId: string, componentId: string, index: number) {
  await prisma.component.update({ where: { id: componentId }, data: { selectedIndex: index } });
  rp(templateId);
}

export async function setChipRows(templateId: string, componentId: string, rows: number) {
  await prisma.component.update({ where: { id: componentId }, data: { chipRows: rows === 2 ? 2 : 1 } });
  rp(templateId);
}

// 선택형(칩) 일괄 저장 — 개별 저장 없이 "완료" 하나로 라벨/링크/순서/선택/줄수 전체 적용.
// chips 배열이 최종 상태(순서 포함). 기존 atom을 위치 기준으로 재사용하고, 남으면 삭제/모자라면 생성.
export async function saveChips(
  templateId: string,
  componentId: string,
  payload: { chips: { content: string; linkUrl: string; iconUrl?: string; iconAlt?: string; menuRole?: string }[]; selectedIndex: number; chipRows: number },
) {
  const chips = (payload.chips ?? []).map((c) => ({
    content: (c.content ?? '').trim(),
    linkUrl: (c.linkUrl ?? '').trim() || null,
    imageUrl: (c.iconUrl ?? '').trim() || null, // 칩 좌측 아이콘 (라이브러리에서 끌어옴)
    altText: (c.iconAlt ?? '').trim() || null,
    menuRole: c.menuRole === 'FIXED' ? 'FIXED' : 'EDITABLE', // 고객 메뉴 역할
  }));
  const existing = await prisma.componentAtom.findMany({
    where: { componentId },
    orderBy: { order: 'asc' },
    include: { atom: true },
  });

  for (let i = 0; i < chips.length; i++) {
    if (i < existing.length) {
      await prisma.atom.update({
        where: { id: existing[i].atomId },
        data: { content: chips[i].content, linkUrl: chips[i].linkUrl, imageUrl: chips[i].imageUrl, altText: chips[i].altText, name: chips[i].content ? `칩:${chips[i].content}` : `칩 ${i + 1}` },
      });
      if (existing[i].order !== i || existing[i].menuRole !== chips[i].menuRole)
        await prisma.componentAtom.update({ where: { id: existing[i].id }, data: { order: i, menuRole: chips[i].menuRole } });
    } else {
      const atom = await prisma.atom.create({
        data: { name: chips[i].content ? `칩:${chips[i].content}` : `칩 ${i + 1}`, atomType: 'TEXT', content: chips[i].content, linkUrl: chips[i].linkUrl, imageUrl: chips[i].imageUrl, altText: chips[i].altText, status: 'active' },
      });
      await prisma.componentAtom.create({ data: { componentId, atomId: atom.id, order: i, isRequired: true, menuRole: chips[i].menuRole } });
    }
  }
  // 남는 기존 칩 제거
  for (let i = chips.length; i < existing.length; i++) {
    await prisma.componentAtom.delete({ where: { id: existing[i].id } });
    await prisma.atom.delete({ where: { id: existing[i].atomId } }).catch(() => {});
  }

  const sel = Math.max(0, Math.min(payload.selectedIndex ?? 0, Math.max(0, chips.length - 1)));
  await prisma.component.update({ where: { id: componentId }, data: { selectedIndex: sel, chipRows: payload.chipRows === 2 ? 2 : 1 } });
  rp(templateId);
}

// ── 배너 라이브러리 (포탈2) ─────────────────────────────────
// 새 배너 등록 후, 지정한 Corner에 바로 연결
export async function createBanner(templateId: string, cornerId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const imageUrl = String(formData.get('imageUrl') ?? '').trim();
  const linkUrl = String(formData.get('linkUrl') ?? '').trim() || null;
  if (!imageUrl) throw new Error('배너 이미지 URL을 입력하세요.');
  // 배너 이름 입력을 없앴으므로, 없으면 코너명 기준으로 자동 생성
  let bannerName = name;
  if (!bannerName) {
    const corner = await prisma.corner.findUnique({ where: { id: cornerId }, select: { name: true } });
    bannerName = `${corner?.name ?? '코너'} 배너`;
  }
  const banner = await prisma.banner.create({ data: { name: bannerName, imageUrl, linkUrl, status: 'active' } });
  await prisma.corner.update({ where: { id: cornerId }, data: { bannerId: banner.id } });
  rp(templateId);
}

// 기존 배너를 Corner에 연결/해제 (BannerSlot 선택)
export async function setCornerBanner(templateId: string, cornerId: string, formData: FormData) {
  const bannerId = String(formData.get('bannerId') ?? '').trim() || null;
  await prisma.corner.update({ where: { id: cornerId }, data: { bannerId } });
  rp(templateId);
}

// 빌더에서 코너 유형 카탈로그(CornerType)를 즉석 등록 (전시화면 관리 안에서도 등록 가능)
export async function createCornerTypeInline(templateId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const baseCategory = String(formData.get('baseCategory') ?? '').trim();
  if (!name) throw new Error('코너 유형 명을 입력하세요.');
  if (!(CORNER_TYPES as readonly string[]).includes(baseCategory)) throw new Error('유효한 기준 분류가 아닙니다.');

  const rows = await prisma.cornerType.findMany({ select: { typeId: true } });
  const max = rows.reduce((m, r) => {
    const n = parseInt(r.typeId.replace(/\D/g, ''), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  const typeId = 'CY' + String(max + 1).padStart(7, '0');

  const opt = (k: string) => {
    const v = String(formData.get(k) ?? '').trim();
    return v.length ? v : null;
  };
  await prisma.cornerType.create({
    data: {
      typeId,
      name,
      baseCategory,
      markupId: opt('markupId'),
      typeDetail: opt('typeDetail'),
      layout: opt('layout'),
      status: 'DRAFT',
      createdBy: 'marina.kim@sk.com',
    },
  });
  rp(templateId);
  revalidatePath('/admin/corner-types');
}

// 우측 코너 정보: 현재 슬롯이 참조하는 Corner를 라이브러리의 기존 Corner로 교체(끌어오기)
export async function swapCornerRef(templateId: string, templateCornerId: string, cornerId: string) {
  if (!cornerId) return;
  await prisma.templateCorner.update({ where: { id: templateCornerId }, data: { cornerId } });
  rp(templateId);
}
