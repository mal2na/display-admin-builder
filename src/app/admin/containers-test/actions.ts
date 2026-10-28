'use server';

// 전시화면 관리 (테스트) — 템플릿 추가. 실제 Template 을 생성하고 테스트 빌더로 이동한다(2026-10-21).
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createCornerInstanceFromTypeId } from '../templates/actions';

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
  const agg = await prisma.templateCorner.aggregate({ where: { templateId }, _max: { order: true } });
  let order = (agg._max.order ?? -1) + 1;
  for (const typeId of cornerTypeIds) {
    const corner = await createCornerInstanceFromTypeId(typeId);
    await prisma.templateCorner.create({ data: { templateId, cornerId: corner.id, order } });
    order += 1;
  }
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
