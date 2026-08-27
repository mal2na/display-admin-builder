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

// SB-EVT-050 댓글 관리 샘플 — 안내형 프로모션(info-partner)에 작성된 FO 댓글.
function sampleComments(programId: string) {
  const chan = (n: number) => '35D29519' + String(1000 + n);
  const base = new Date('2026-08-18T16:24:00');
  const at = (h: number) => new Date(base.getTime() - h * 3600 * 1000);
  return [
    { programId, memberChannelId: chan(0), content: '어떻게 참여하는건가요?', likeCount: 11, exposed: true, answered: true, replyContent: '소개페이지를 SNS 공유하면 참여 됩니다.', replyAuthor: '홍길동(P123456)', replyCount: 3, replyAt: new Date('2026-08-18T18:46:00'), createdAt: at(0) },
    { programId, memberChannelId: chan(1), content: '20% 쿠폰 감사합니다-!Fj', exposed: true, createdAt: at(1) },
    { programId, memberChannelId: chan(2), content: '쿠폰 주세요', exposed: true, createdAt: at(2) },
    { programId, memberChannelId: chan(3), content: '감사합니다-Fj', exposed: true, createdAt: at(3) },
    { programId, memberChannelId: chan(4), content: '너무 가지고 싶어요', exposed: true, createdAt: at(4) },
    { programId, memberChannelId: chan(5), content: '감사요', exposed: true, createdAt: at(5) },
    { programId, memberChannelId: chan(6), content: '나도 원해', exposed: true, createdAt: at(6) },
    { programId, memberChannelId: chan(7), content: '저도 주세요', likeCount: 1, exposed: true, createdAt: at(7) },
    { programId, memberChannelId: chan(8), content: '주세요 쿠폰', likeCount: 5, exposed: true, createdAt: at(8) },
    { programId, memberChannelId: chan(9), content: '감사합니-F3', likeCount: 1, exposed: true, createdAt: at(9) },
    { programId, memberChannelId: chan(10), content: '이벤트 언제까지인가요?', likeCount: 2, exposed: true, answered: true, replyContent: '8월 31일까지입니다.', replyAuthor: '운영자(P217129)', replyCount: 1, replyAt: new Date('2026-08-19T09:10:00'), createdAt: at(10) },
    { programId, memberChannelId: chan(11), content: '당첨자 발표는 어디서 확인하나요?', likeCount: 3, exposed: true, createdAt: at(11) },
    { programId, memberChannelId: chan(12), content: '좋은 이벤트네요 :)', likeCount: 8, exposed: false, createdAt: at(12) },
  ];
}

export async function seedEvents(prisma: PrismaClient) {
  await prisma.eventCommentReply.deleteMany();
  await prisma.eventComment.deleteMany();
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
    // 안내형(제휴사 안내)에 댓글 샘플 — 댓글 관리 탭 데모용
    if (s.template === 'info-partner') {
      await prisma.eventProgram.update({ where: { id: project.id }, data: { commentUse: true } });
      // 답글이 있는 댓글은 개별 생성해 EventCommentReply까지 함께 시딩(대표 답글=denormalized 캐시와 일치)
      for (const cm of sampleComments(project.id)) {
        const created = await prisma.eventComment.create({ data: cm });
        if (cm.replyContent) {
          await prisma.eventCommentReply.create({
            data: { commentId: created.id, content: cm.replyContent, author: cm.replyAuthor ?? '운영자(P217129)', exposed: true, createdAt: cm.replyAt ?? cm.createdAt },
          });
        }
      }
    }
  }

  console.log('✅ 이벤트 빌더 시드 완료:', {
    projects: await prisma.eventProgram.count(),
    pages: await prisma.eventPage.count(),
    nodes: await prisma.eventNode.count(),
  });
}
