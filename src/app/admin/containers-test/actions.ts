'use server';

// 전시화면 관리 (테스트) — 템플릿 추가. 실제 Template 을 생성하고 테스트 빌더로 이동한다(2026-10-21).
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createCornerInstanceFromTypeId } from '../templates/actions';
import { effectiveZone } from '@/lib/display-taxonomy';

export async function addTestTemplate(containerId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) throw new Error('템플릿명을 입력하세요.');
  const conditionGroup = String(formData.get('conditionGroup') ?? '').trim() || '로그인';

  const template = await prisma.template.create({
    data: {
      containerId,
      name,
      conditionGroup,
      isDefault: false,
      displayOn: true,
      status: 'DRAFT',
      version: 1,
    },
  });
  revalidatePath(`/admin/containers-test/c/${containerId}`);
  redirect(`/admin/containers-test/t/${template.id}?new=1`);
}

// 코너 추가 — 코너 유형 관리의 코너(들)를 TemplateCorner 로 템플릿에 배치(실제 DB).
export async function addCornersToTemplate(templateId: string, cornerIds: string[]) {
  if (!cornerIds.length) return;
  const agg = await prisma.templateCorner.aggregate({ where: { templateId }, _max: { order: true } });
  let order = (agg._max.order ?? -1) + 1;
  for (const cornerId of cornerIds) {
    const exists = await prisma.templateCorner.findUnique({ where: { templateId_cornerId: { templateId, cornerId } } });
    if (exists) continue;
    await prisma.templateCorner.create({ data: { templateId, cornerId, order } });
    order += 1;
  }
  revalidatePath(`/admin/containers-test/t/${templateId}`);
}

// 코너 추가(코너 유형 연동) — 등록된 코너 유형(카탈로그) 각각에서 새 Corner 껍데기를 생성해 템플릿에 배치(2026-10-28 사용자 요청).
//  '전시화면 관리'와 '코너 유형 관리'를 연동: 불러오기 목록이 카탈로그와 1:1. 내용은 빌더에서 채운다.
export async function addCornersFromTypes(templateId: string, cornerTypeIds: string[]) {
  if (!cornerTypeIds.length) return;
  // 신규 코너는 '무조건 맨 아래'에 이어 붙이고, Fixed/Dynamic으로 새 밴드를 만들지 않는다 —
  //  마지막 코너의 '효과적 존'(저장값 없으면 유형에서 파생)을 그대로 물려받아 같은 밴드로 이어지게 한다(2026-11-05 사용자 요청).
  //  기존 코너는 zone이 NULL이라 런타임에 파생되므로, 신규 코너에는 그 파생 결과를 명시적으로 저장해 밴드가 끊기지 않게 한다.
  const last = await prisma.templateCorner.findFirst({
    where: { templateId }, orderBy: { order: 'desc' },
    select: { order: true, zone: true, corner: { select: { cornerType: true, recSource: true } } },
  });
  const inheritedZone = last ? effectiveZone(last.zone, last.corner?.cornerType, last.corner?.recSource) : 'dynamic';
  let order = (last?.order ?? -1) + 1;
  // 생성한 코너 id를 반환해 빌더가 '새로 추가한 코너로 포커스'할 수 있게 한다(2026-11-05 사용자 요청).
  const createdCornerIds: string[] = [];
  for (const typeId of cornerTypeIds) {
    const corner = await createCornerInstanceFromTypeId(typeId);
    await prisma.templateCorner.create({ data: { templateId, cornerId: corner.id, order, zone: inheritedZone } });
    createdCornerIds.push(corner.id);
    order += 1;
  }
  revalidatePath(`/admin/containers-test/t/${templateId}`);
  return createdCornerIds;
}

// 코너명 수정 — 빌더 '① 코너 정보'의 코너명 편집을 실제 저장(Corner.name). 2026-11-05 사용자 요청(데모 → 실제).
export async function renameCorner(templateId: string, cornerId: string, name: string) {
  const n = name.trim();
  if (!n) throw new Error('코너명을 입력하세요.');
  await prisma.corner.update({ where: { id: cornerId }, data: { name: n } });
  revalidatePath(`/admin/containers-test/t/${templateId}`);
}

// 코너 순서 변경 — 밴드 간 드래그앤드롭의 순서 저장(TemplateCorner.order, 테스트 경로 revalidate).
export async function reorderTestCorners(templateId: string, orderedTemplateCornerIds: string[]) {
  if (!orderedTemplateCornerIds.length) return;
  await prisma.$transaction(
    orderedTemplateCornerIds.map((id, i) => prisma.templateCorner.update({ where: { id }, data: { order: i } })),
  );
  revalidatePath(`/admin/containers-test/t/${templateId}`);
}

// 전시 존(밴드) 지정 — Fixed/Dynamic/Semi-fixed 밴드 사이로 드래그했을 때 이동한 밴드의 존으로 저장.
export async function setTestCornerZone(templateId: string, templateCornerId: string, zone: 'dynamic' | 'semi' | 'fixed') {
  await prisma.templateCorner.update({ where: { id: templateCornerId }, data: { zone } });
  revalidatePath(`/admin/containers-test/t/${templateId}`);
}

// 코너 삭제 — 템플릿에서 코너 배치(TemplateCorner)만 제거. 코너 유형 관리의 원본 코너는 남는다.
export async function removeCornerFromTemplate(templateId: string, templateCornerId: string) {
  await prisma.templateCorner.delete({ where: { id: templateCornerId } });
  revalidatePath(`/admin/containers-test/t/${templateId}`);
}

// 템플릿 복사 — 코너 배치까지 통째로 복사해 같은 Container 에 생성(테스트 경로 revalidate).
export async function duplicateTestTemplate(containerId: string, templateId: string) {
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
      templateCorners: { create: src.templateCorners.map((tc) => ({ cornerId: tc.cornerId, order: tc.order, visible: tc.visible })) },
    },
  });
  revalidatePath(`/admin/containers-test/c/${containerId}`);
}
