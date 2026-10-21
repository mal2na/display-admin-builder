'use server';

// 전시화면 관리 (테스트) — 템플릿 추가. 실제 Template 을 생성하고 테스트 빌더로 이동한다(2026-10-21).
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

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
  redirect(`/admin/containers-test/t/${template.id}`);
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
