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
  if (id) revalidatePath(`/admin/app-splash/${id}`);
}

// 등록 (SB PG574) — Android/iOS 듀얼 폼. OS 등록/사용 체크된 블록만 각각 1건 생성(OS별 각 1개).
//   저장은 '저장(draft)' 상태로만 들어간다 — 승인요청은 상세(PG575)에서. 저장 성공 → 목록.
export async function createSplashDual(fd: FormData) {
  const readOs = (os: 'aos' | 'ios') => {
    if (fd.get(`${os}_enabled`) !== 'true') return null;
    return {
      osType: os === 'aos' ? 'Android' : 'IOS',
      title: str(fd, `${os}_title`),
      applyStartAt: dt(fd, `${os}_applyStartAt`),
      bgImageUrl: str(fd, `${os}_bgImageUrl`),
      bgImageAlt: str(fd, `${os}_bgImageAlt`),
      bgUseYn: fd.get(`${os}_bgUseYn`) === 'true',
      animUrl: str(fd, `${os}_animUrl`),
      animAlt: str(fd, `${os}_animAlt`),
      animUseYn: fd.get(`${os}_animUseYn`) === 'true',
      eventImageUrl: str(fd, `${os}_eventImageUrl`),
      eventImageAlt: str(fd, `${os}_eventImageAlt`),
      eventPostStart: dt(fd, `${os}_eventPostStart`),
      eventPostEnd: dt(fd, `${os}_eventPostEnd`),
      eventUseYn: fd.get(`${os}_eventUseYn`) === 'true',
    };
  };
  const blocks = [readOs('aos'), readOs('ios')].filter(Boolean) as NonNullable<ReturnType<typeof readOs>>[];
  for (const data of blocks) {
    // 버전은 승인완료 시 채번(SB) — 저장 단계에선 내부 순번만 부여, 목록/상세는 승인완료 전까지 '-' 표기.
    const max = await prisma.appSplash.aggregate({ where: { osType: data.osType }, _max: { version: true } });
    const version = (max._max.version ?? 0) + 1;
    await prisma.appSplash.create({
      data: {
        ...data, version, createdBy: OPERATOR, updatedBy: OPERATOR,
        approvalStatus: 'draft',
        history: { create: { osType: data.osType, status: 'draft', changeNote: '신규 등록' } },
      },
    });
  }
  revalidatePath('/admin/app-splash');
  redirect('/admin/app-splash');
}

// 수정 (SB PG577) — 저장 시 '저장(draft)' 상태로. 저장 성공 → 목록.
export async function updateSplash(id: string, fd: FormData) {
  const data = readForm(fd);
  await prisma.appSplash.update({
    where: { id },
    data: {
      ...data, updatedBy: OPERATOR, approvalStatus: 'draft',
      history: { create: { osType: data.osType, status: 'draft', changeNote: '수정' } },
    },
  });
  revalidatePath('/admin/app-splash');
  redirect('/admin/app-splash');
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
