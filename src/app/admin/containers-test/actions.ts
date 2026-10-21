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
