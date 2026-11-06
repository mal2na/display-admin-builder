// 프로모션 관리 > 빌더 진입 → 전시화면 관리 빌더(혜택 홈)로 이어주는 리졸버.
//  혜택 홈 Container 의 기본(또는 첫) Template 을 찾아 메인 빌더(containers-test/t)로 redirect 한다.
//  Container id·Template id 는 DB 생성(cuid)이라 고정값이 없어, 이름으로 조회한다(2026-10-20).
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function BenefitBuilderRedirect() {
  const container = await prisma.container.findFirst({
    where: { name: '혜택 홈' },
    include: {
      defaultTemplate: true,
      templates: { orderBy: { createdAt: 'asc' }, take: 1 },
    },
  });

  const templateId = container?.defaultTemplateId ?? container?.templates[0]?.id;
  if (!templateId) {
    // 혜택 홈/템플릿을 못 찾으면 전시화면 관리 목록으로.
    redirect('/admin/containers-test');
  }
  redirect(`/admin/containers-test/t/${templateId}`);
}
