'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

const OPERATOR = '홍길동(P123432)';

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
    title: str(fd, 'title'),
    updateContent: str(fd, 'updateContent'),
    applyStartAt: dt(fd, 'applyStartAt'),
    bgImageUrl: str(fd, 'bgImageUrl'),
    bgImageAlt: str(fd, 'bgImageAlt'),
    bgUseYn: fd.get('bgUseYn') !== 'false',
    animUrl: str(fd, 'animUrl'),
    animAlt: str(fd, 'animAlt'),
    animUseYn: fd.get('animUseYn') !== 'false',
    eventImageUrl: str(fd, 'eventImageUrl'),
    eventImageAlt: str(fd, 'eventImageAlt'),
    eventPostStart: dt(fd, 'eventPostStart'),
    eventPostEnd: dt(fd, 'eventPostEnd'),
    eventUseYn: fd.get('eventUseYn') === 'true',
  };
}

function revalidate(id?: string) {
  revalidatePath('/admin/app-splash');
  revalidatePath('/admin/app-splash/history');
  if (id) revalidatePath(`/admin/app-splash/${id}`);
}

// 등록
export async function createSplash(fd: FormData) {
  const data = readForm(fd);
  const approve = fd.get('intent') === 'approve';
  const max = await prisma.appSplash.aggregate({ where: { osType: data.osType }, _max: { version: true } });
  const version = (max._max.version ?? 0) + 1;
  const now = new Date();
  const row = await prisma.appSplash.create({
    data: {
      ...data, version, createdBy: OPERATOR, updatedBy: OPERATOR,
      approvalStatus: approve ? 'requested' : 'draft',
      approvalRequester: approve ? OPERATOR : null,
      approvalRequestedAt: approve ? now : null,
      history: {
        create: {
          osType: data.osType, version, status: approve ? 'requested' : 'draft',
          requester: approve ? OPERATOR : null, requestedAt: approve ? now : null,
          requestReason: approve ? (data.updateContent ?? '') : null, changeNote: '신규 등록',
        },
      },
    },
  });
  revalidate(row.id);
  redirect(`/admin/app-splash/${row.id}`);
}

// 수정
export async function updateSplash(id: string, fd: FormData) {
  const data = readForm(fd);
  const approve = fd.get('intent') === 'approve';
  const now = new Date();
  await prisma.appSplash.update({
    where: { id },
    data: {
      ...data, updatedBy: OPERATOR,
      approvalStatus: approve ? 'requested' : 'draft',
      ...(approve ? { approvalRequester: OPERATOR, approvalRequestedAt: now } : {}),
      history: {
        create: {
          osType: data.osType, status: approve ? 'requested' : 'draft',
          requester: approve ? OPERATOR : null, requestedAt: approve ? now : null,
          requestReason: approve ? (data.updateContent ?? '') : null, changeNote: '수정',
        },
      },
    },
  });
  revalidate(id);
  redirect(`/admin/app-splash/${id}`);
}

// 상세에서 승인요청
export async function requestApprovalSplash(id: string) {
  const s = await prisma.appSplash.findUnique({ where: { id } });
  const now = new Date();
  await prisma.appSplash.update({
    where: { id },
    data: {
      approvalStatus: 'requested', approvalRequester: OPERATOR, approvalRequestedAt: now,
      history: { create: { osType: s?.osType ?? 'Android', version: s?.version, status: 'requested', requester: OPERATOR, requestedAt: now, requestReason: s?.updateContent ?? '', changeNote: '승인요청' } },
    },
  });
  revalidate(id);
  redirect(`/admin/app-splash/${id}`);
}

// 요청취소 (reason: 취소사유. 상세 화면 form에서 호출 시 FormData가 넘어올 수 있어 방어)
export async function cancelRequestSplash(id: string, reason?: string | FormData) {
  const note = typeof reason === 'string' && reason.trim() ? reason.trim() : '요청취소';
  const s = await prisma.appSplash.findUnique({ where: { id } });
  const now = new Date();
  await prisma.appSplash.update({
    where: { id },
    data: {
      approvalStatus: 'cancelled',
      history: { create: { osType: s?.osType ?? 'Android', version: s?.version, status: 'cancelled', requester: s?.approvalRequester ?? OPERATOR, requestedAt: s?.approvalRequestedAt, processedAt: now, processReason: note, changeNote: '요청취소' } },
    },
  });
  revalidate(id);
}
