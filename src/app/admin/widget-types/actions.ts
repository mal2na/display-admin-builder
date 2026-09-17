'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

const OPERATOR = '홍길동(P123456)';

function str(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  const s = typeof v === 'string' ? v.trim() : '';
  return s === '' ? null : s;
}

// 유형코드 자동 생성 (WDT_ + 랜덤) — 시스템 자동, 수정불가
function genTypeCode() {
  return 'WDT_' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function readForm(fd: FormData) {
  return {
    typeName: str(fd, 'typeName') ?? '',
    description: str(fd, 'description'),
    osType: str(fd, 'osType') ?? 'Android',
    sizeLabel: str(fd, 'sizeLabel'),
    nativeWidgetId: str(fd, 'nativeWidgetId'),
    widgetSpec: str(fd, 'widgetSpec'),
    bannerArea: str(fd, 'bannerArea'),
    useYn: fd.get('useYn') === 'true',
  };
}

function approvalPatch(fd: FormData) {
  return fd.get('intent') === 'approve'
    ? { approvalStatus: 'requested', approvalRequester: OPERATOR, approvalRequestedAt: new Date() }
    : {};
}

export async function createWidgetType(fd: FormData) {
  const data = readForm(fd);
  const row = await prisma.widgetType.create({
    data: { ...data, ...approvalPatch(fd), typeCode: genTypeCode(), createdBy: OPERATOR, updatedBy: OPERATOR },
  });
  revalidatePath('/admin/widget-types');
  redirect(`/admin/widget-types/${row.id}`);
}

export async function updateWidgetType(id: string, fd: FormData) {
  const data = readForm(fd);
  await prisma.widgetType.update({ where: { id }, data: { ...data, ...approvalPatch(fd), updatedBy: OPERATOR } });
  revalidatePath('/admin/widget-types');
  redirect(`/admin/widget-types/${id}`);
}
