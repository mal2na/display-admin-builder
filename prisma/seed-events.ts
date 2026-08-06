/**
 * 이벤트 페이지 빌더 시드 — 프로젝트(EventProgram) + 페이지(EventPage) + 노드 트리(EventNode).
 * 템플릿(src/lib/event-templates.ts)로 프로젝트를 구성한다.
 */
import type { PrismaClient } from '@prisma/client';
import { TEMPLATE_BY_KEY, insertNodes, createsStateFor, toPromotionSkeleton, type NodeSpec } from '../src/lib/event-templates';

type Seed = { name: string; template: string; env: string; mode?: string };

// 이벤트 유형(안내형·초청형·기획전형·응모형·추천형·구매/가입 연계형) + 전시 거버넌스 PoC
const PROJECTS: Seed[] = [
  { name: 'T멤버십 신규 제휴사 안내', template: 'info-partner', env: 'DEV' },
  { name: '장기고객 콘서트 데이', template: 'invite-concert', env: 'DEV' },
  { name: '제휴카드 혜택 모음', template: 'curation-card', env: 'DEV' },
  { name: '룰렛 응모 이벤트', template: 'entry-roulette', env: 'LOCAL' },
  { name: '친구 추천 릴레이', template: 'referral-relay', env: 'LOCAL' },
  { name: '티다 럭키 페스티벌', template: 'purchase-lucky', env: 'STG' },
];

export async function seedEvents(prisma: PrismaClient) {
  await prisma.eventNode.deleteMany();
  await prisma.eventPageVersion.deleteMany();
  await prisma.eventProgram.updateMany({ data: { defaultPageId: null } });
  await prisma.eventPage.deleteMany();
  await prisma.eventProgram.deleteMany();

  for (const s of PROJECTS) {
    const tpl = TEMPLATE_BY_KEY[s.template] ?? TEMPLATE_BY_KEY.blank;
    const type = tpl.eventType || '안내형';
    const project = await prisma.eventProgram.create({
      data: {
        name: s.name,
        programKind: '이벤트',
        programType: type, // 대표 유형 = 템플릿 유형
        createsState: createsStateFor('이벤트', type),
        purpose: tpl.desc,
        status: 'active',
        env: s.env,
        category: type,
        mode: s.mode ?? 'event',
      },
    });
    const page = await prisma.eventPage.create({
      data: { programId: project.id, name: '메인', isDefault: true, status: 'DRAFT', version: 1, pageType: '빌더' },
    });
    await prisma.eventProgram.update({ where: { id: project.id }, data: { defaultPageId: page.id } });
    // 프로모션 골조: 고정 슬롯 + 자유 구간 섹션(각 모듈 = 코너 1개)
    const built = tpl.build();
    const nodes: NodeSpec[] = built.length ? toPromotionSkeleton(built) : built;
    await insertNodes(prisma as any, page.id, nodes);
  }

  console.log('✅ 이벤트 빌더 시드 완료:', {
    projects: await prisma.eventProgram.count(),
    pages: await prisma.eventPage.count(),
    nodes: await prisma.eventNode.count(),
  });
}
