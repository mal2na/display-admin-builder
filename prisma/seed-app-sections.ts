/**
 * App 섹션 시드 — App 버전 관리 · App 위젯 관리 · 위젯 유형 · 전체페이지 관리.
 *
 *   이 네 모듈은 전시/코너 시드와 달리 기존 seed.ts가 만들지 않아, 매 배포 FORCE_SEED 재시드 때
 *   프로덕션에서 비어 있었다(2026-10-06 사용자 보고). 로컬에서 덤프한 기준 데이터를 함께 시드한다.
 *
 *   데이터: prisma/seed-data/app-sections.json (SQLite 덤프 — 날짜=epoch ms, 불리언=0/1).
 *   삽입 시 Date/boolean으로 변환하고, @updatedAt 필드는 Prisma 자동 설정에 맡긴다(입력 제외).
 *   전시 데이터처럼 매 배포 시드 기준으로 리셋된다(자식→부모 순 deleteMany 후 재삽입).
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import type { PrismaClient } from '@prisma/client';

type Row = Record<string, unknown>;
type Data = {
  WidgetType: Row[];
  AppWidget: Row[];
  AppWidgetHistory: Row[];
  AppVersion: Row[];
  AppVersionHistory: Row[];
  FullPage: Row[];
};

// 빌드는 저장소 루트에서 `tsx prisma/seed.ts`로 실행 → cwd 기준 경로가 ESM/CJS 무관하게 안전.
const DATA: Data = JSON.parse(
  readFileSync(join(process.cwd(), 'prisma', 'seed-data', 'app-sections.json'), 'utf8'),
);

// 날짜 컬럼은 epoch ms → Date, 불리언 컬럼은 0/1 → boolean. @updatedAt(updatedAt)은 입력에서 제외.
function conv(row: Row, dates: string[], bools: string[]): Row {
  const o: Row = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === 'updatedAt') continue;
    if (v === null || v === undefined) {
      o[k] = null;
    } else if (dates.includes(k)) {
      o[k] = new Date(v as number);
    } else if (bools.includes(k)) {
      o[k] = Boolean(v);
    } else {
      o[k] = v;
    }
  }
  return o;
}

export async function seedAppSections(prisma: PrismaClient) {
  // 자식 → 부모 순 초기화 (재시드 누적 방지). FullPage 자기참조(parentId)는 onDelete SetNull.
  await prisma.appWidgetHistory.deleteMany();
  await prisma.appVersionHistory.deleteMany();
  await prisma.appWidget.deleteMany();
  await prisma.appVersion.deleteMany();
  await prisma.widgetType.deleteMany();
  await prisma.fullPage.deleteMany();

  // 부모 → 자식 순 삽입 (FK 보장).
  for (const r of DATA.WidgetType) {
    await prisma.widgetType.create({
      data: conv(r, ['approvalRequestedAt', 'approvalProcessedAt', 'createdAt'], ['useYn']) as never,
    });
  }
  for (const r of DATA.AppWidget) {
    await prisma.appWidget.create({
      data: conv(r, ['publishStart', 'publishEnd', 'approvalRequestedAt', 'approvalProcessedAt', 'createdAt'], ['exposeYn']) as never,
    });
  }
  for (const r of DATA.AppWidgetHistory) {
    await prisma.appWidgetHistory.create({
      data: conv(r, ['requestedAt', 'processedAt', 'createdAt'], []) as never,
    });
  }
  for (const r of DATA.AppVersion) {
    await prisma.appVersion.create({
      data: conv(r, ['updateDate', 'approvalRequestedAt', 'approvalProcessedAt', 'createdAt'], []) as never,
    });
  }
  for (const r of DATA.AppVersionHistory) {
    await prisma.appVersionHistory.create({
      data: conv(r, ['requestedAt', 'processedAt', 'createdAt'], []) as never,
    });
  }
  // FullPage 자기참조: 얕은 depth(상위)부터 삽입해야 parentId FK가 성립.
  const pages = [...DATA.FullPage].sort((a, b) => Number(a.depth ?? 1) - Number(b.depth ?? 1));
  for (const r of pages) {
    await prisma.fullPage.create({
      data: conv(r, ['createdAt'], ['useYn', 'frontExposeYn']) as never,
    });
  }

  console.log('✅ App 섹션 시드:', {
    widgetTypes: DATA.WidgetType.length,
    appWidgets: DATA.AppWidget.length,
    appVersions: DATA.AppVersion.length,
    fullPages: DATA.FullPage.length,
  });
}
