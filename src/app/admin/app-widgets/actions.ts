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

function readForm(fd: FormData) {
  return {
    osType: str(fd, 'osType') ?? 'Android',
    exposeYn: fd.get('exposeYn') === 'true',
    widgetTypeId: str(fd, 'widgetTypeId'),
    publishStart: dt(fd, 'publishStart'),
    publishEnd: dt(fd, 'publishEnd'),
    bannerName: str(fd, 'bannerName') ?? '',
    bgColorCode: str(fd, 'bgColorCode'),
    bannerImageUrl: str(fd, 'bannerImageUrl'),
    bannerImageAlt: str(fd, 'bannerImageAlt'),
    linkType: str(fd, 'linkType') ?? 'internal',
    linkUrl: str(fd, 'linkUrl'),
    statCode: str(fd, 'statCode'),
    landingPosition: str(fd, 'landingPosition'),
    targetCampaignId: str(fd, 'targetCampaignId'),
    note: str(fd, 'note'),
  };
}

function revalidate() {
  revalidatePath('/admin/app-widgets');
}

// 승인요청 시 함께 세팅할 필드
function approvalPatch(fd: FormData) {
  return fd.get('intent') === 'approve'
    ? { approvalStatus: 'requested', approvalRequester: OPERATOR, approvalRequestedAt: new Date() }
    : {};
}

// 등록 — 저장 후 상세로 이동
export async function createAppWidget(fd: FormData) {
  const data = readForm(fd);
  const max = await prisma.appWidget.aggregate({ _max: { displayOrder: true } });
  const row = await prisma.appWidget.create({
    data: { ...data, ...approvalPatch(fd), displayOrder: (max._max.displayOrder ?? 0) + 1, createdBy: OPERATOR, updatedBy: OPERATOR },
  });
  revalidate();
  redirect(`/admin/app-widgets/${row.id}`);
}

// 수정
export async function updateAppWidget(id: string, fd: FormData) {
  const data = readForm(fd);
  await prisma.appWidget.update({ where: { id }, data: { ...data, ...approvalPatch(fd), updatedBy: OPERATOR } });
  revalidate();
  redirect(`/admin/app-widgets/${id}`);
}

// 승인요청
export async function requestApprovalAppWidget(id: string) {
  await prisma.appWidget.update({
    where: { id },
    data: { approvalStatus: 'requested', approvalRequester: OPERATOR, approvalRequestedAt: new Date() },
  });
  revalidate();
  revalidatePath(`/admin/app-widgets/${id}`);
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
  // 실제 배포/캐시 동기화는 공통 프로세스 확정 후 연결 예정
  return { ok: true, at: new Date().toISOString() };
}
