'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

// 운영자(임시) — 인증 붙기 전 담당자 표기값
const OPERATOR = '홍길동(P123456)';

function str(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  const s = typeof v === 'string' ? v.trim() : '';
  return s === '' ? null : s;
}
function dt(fd: FormData, k: string): Date | null {
  const s = str(fd, k);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

// 폼 → 저장 데이터. 위젯배너정보는 배너캠페인(targetCampaignId) 링크 + 명칭 스냅샷.
function readForm(fd: FormData) {
  const noEnd = fd.get('noEnd') === 'true';
  return {
    widgetTypeId: str(fd, 'widgetTypeId'),
    exposeYn: fd.get('exposeYn') === 'true',
    publishStart: dt(fd, 'publishStart'),
    publishEnd: noEnd ? null : dt(fd, 'publishEnd'),
    bannerName: str(fd, 'bannerName') ?? '',
    targetCampaignId: str(fd, 'bannerCampaignId'), // 배너캠페인 링크(상세에서 조인해 배너정보 노출)
  };
}

function revalidate(id?: string) {
  revalidatePath('/admin/app-widgets');
  if (id) revalidatePath(`/admin/app-widgets/${id}`);
}

// 등록 (SB PG049) — 저장 → 상세, 승인상태 '임시저장(draft)'
export async function createAppWidget(fd: FormData) {
  const data = readForm(fd);
  const max = await prisma.appWidget.aggregate({ _max: { displayOrder: true } });
  const row = await prisma.appWidget.create({
    data: {
      ...data, osType: 'Android', linkType: 'internal',
      displayOrder: (max._max.displayOrder ?? 0) + 1,
      approvalStatus: 'draft', createdBy: OPERATOR, updatedBy: OPERATOR,
      history: { create: { seq: 1, status: 'draft', changeNote: '신규 등록' } },
    },
  });
  revalidate(row.id);
  redirect(`/admin/app-widgets/${row.id}`);
}

// 수정 (SB PG051) — 저장 → 상세, 승인상태 '임시저장'
export async function updateAppWidget(id: string, fd: FormData) {
  const data = readForm(fd);
  const lastSeq = await prisma.appWidgetHistory.aggregate({ where: { widgetId: id }, _max: { seq: true } });
  await prisma.appWidget.update({
    where: { id },
    data: {
      ...data, approvalStatus: 'draft', updatedBy: OPERATOR,
      history: { create: { seq: (lastSeq._max.seq ?? 0) + 1, status: 'draft', changeNote: '수정' } },
    },
  });
  revalidate(id);
  redirect(`/admin/app-widgets/${id}`);
}

// 상세에서 승인요청 (SB PG476 버튼 CASE)
export async function requestApprovalAppWidget(id: string) {
  const now = new Date();
  const lastSeq = await prisma.appWidgetHistory.aggregate({ where: { widgetId: id }, _max: { seq: true } });
  await prisma.appWidget.update({
    where: { id },
    data: {
      approvalStatus: 'requested', approvalRequester: OPERATOR, approvalRequestedAt: now,
      history: { create: { seq: (lastSeq._max.seq ?? 0) + 1, status: 'requested', requester: OPERATOR, requestedAt: now, changeNote: '승인요청' } },
    },
  });
  revalidate(id);
  redirect(`/admin/app-widgets/${id}`);
}

// 승인요청 취소
export async function cancelRequestAppWidget(id: string) {
  const w = await prisma.appWidget.findUnique({ where: { id } });
  const now = new Date();
  const lastSeq = await prisma.appWidgetHistory.aggregate({ where: { widgetId: id }, _max: { seq: true } });
  await prisma.appWidget.update({
    where: { id },
    data: {
      approvalStatus: 'draft',
      history: { create: { seq: (lastSeq._max.seq ?? 0) + 1, status: 'cancelled', requester: w?.approvalRequester ?? OPERATOR, requestedAt: w?.approvalRequestedAt, processedAt: now, processReason: '요청취소', changeNote: '요청취소' } },
    },
  });
  revalidate(id);
  redirect(`/admin/app-widgets/${id}`);
}

// 노출순서 저장 — [{id, order}]
export async function reorderAppWidgets(orders: { id: string; order: number }[]) {
  await prisma.$transaction(
    orders.map((o) => prisma.appWidget.update({ where: { id: o.id }, data: { displayOrder: o.order } })),
  );
  revalidate();
}

// Redis Reload — 배포 공통 프로세스 확정 전 임시(no-op)
export async function redisReloadAppWidgets() {
  return { ok: true, at: new Date().toISOString() };
}
