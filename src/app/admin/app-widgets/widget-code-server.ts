// 단건 위젯코드(WE-YYYYMM-NNN) — 같은 달 생성 순번 계산(상세/수정 server 전용). prisma 사용.
import { prisma } from '@/lib/prisma';
import { widgetCodeFrom } from './widget-helpers';

export async function widgetCodeOf(createdAt: Date): Promise<string> {
  const monthStart = new Date(createdAt.getFullYear(), createdAt.getMonth(), 1);
  const monthEnd = new Date(createdAt.getFullYear(), createdAt.getMonth() + 1, 1);
  const before = await prisma.appWidget.count({ where: { createdAt: { gte: monthStart, lt: monthEnd, lte: createdAt } } });
  return widgetCodeFrom(createdAt, before);
}

// PU13 배너 목록 — BannerCampaign → BannerPick. 전시상태는 기간으로 계산.
export async function bannersForPick() {
  const list = await prisma.bannerCampaign.findMany({ orderBy: { createdAt: 'desc' } });
  const now = Date.now();
  const expose = (s: Date | null, e: Date | null) => {
    if (s && now < s.getTime()) return '전시예정';
    if (e && now > e.getTime()) return '전시종료';
    return '전시중';
  };
  return list.map((b) => ({
    id: b.id,
    campaignCode: b.campaignCode,
    title: b.title,
    thumbnailUrl: b.thumbnailUrl,
    bannerAlt: b.bannerAlt,
    exposeStatus: expose(b.publishStart, b.publishEnd),
    publishStart: b.publishStart?.toISOString() ?? null,
    publishEnd: b.publishEnd?.toISOString() ?? null,
    bgColorCode: null, // 배너캠페인엔 BG색상 없음 → 위젯배너정보는 '기본컬러'로 표기
    landingType: b.landingType,
    landingUrl: b.landingUrl,
    pageType: b.pageType,
    statCode: b.statCode,
  }));
}
