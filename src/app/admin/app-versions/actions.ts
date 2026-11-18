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
function dt(fd: FormData, k: string): Date | null {
  const s = str(fd, k);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function readForm(fd: FormData) {
  return {
    targetApp: str(fd, 'targetApp') ?? '통합App',
    osType: str(fd, 'osType') ?? 'Android',
    updateDate: dt(fd, 'updateDate'),
    recommendVersion: str(fd, 'recommendVersion'),
    forceVersion: str(fd, 'forceVersion'), // '없음' 옵션이면 클라이언트가 빈 값 전송
    detailContent: str(fd, 'detailContent'),
    recommendPopupTitle: str(fd, 'recommendPopupTitle'),
    recommendPopupContent: str(fd, 'recommendPopupContent'),
    recommendPopupImageUrl: str(fd, 'recommendPopupImageUrl'),
    recommendPopupImageAlt: str(fd, 'recommendPopupImageAlt'),
    forcePopupTitle: str(fd, 'forcePopupTitle'),
    forcePopupContent: str(fd, 'forcePopupContent'),
    forcePopupImageUrl: str(fd, 'forcePopupImageUrl'),
    forcePopupImageAlt: str(fd, 'forcePopupImageAlt'),
  };
}

// 신규 버전 입력(주/마이너/패치) → "2.0.0"
function composeVersion(fd: FormData): string {
  const major = str(fd, 'verMajor') ?? '0';
  const minor = str(fd, 'verMinor') ?? '0';
  const patch = str(fd, 'verPatch') ?? '0';
  return `${major}.${minor}.${patch}`;
}

function revalidate(id?: string) {
  revalidatePath('/admin/app-versions');
  if (id) revalidatePath(`/admin/app-versions/${id}`);
}

// 등록 (SB PG579) — 저장(draft) 상태로. 저장 성공 → 목록.
export async function createVersion(fd: FormData) {
  const data = readForm(fd);
  const version = composeVersion(fd);
  await prisma.appVersion.create({
    data: {
      ...data, version, createdBy: OPERATOR, updatedBy: OPERATOR,
      approvalStatus: 'draft',
      history: { create: { version, status: 'draft', changeNote: '신규 등록' } },
    },
  });
  revalidatePath('/admin/app-versions');
  redirect('/admin/app-versions');
}

// 수정 (SB PG582) — 대상App·OS·버전은 Key라 변경 불가. 저장(draft) → 목록.
export async function updateVersion(id: string, fd: FormData) {
  const data = readForm(fd);
  await prisma.appVersion.update({
    where: { id },
    data: {
      ...data, updatedBy: OPERATOR, approvalStatus: 'draft',
      history: { create: { version: str(fd, 'version'), status: 'draft', changeNote: '수정' } },
    },
  });
  revalidatePath('/admin/app-versions');
  redirect('/admin/app-versions');
}

// 상세에서 승인요청 (SB PG581 버튼 CASE)
export async function requestApprovalVersion(id: string) {
  const v = await prisma.appVersion.findUnique({ where: { id } });
  const now = new Date();
  await prisma.appVersion.update({
    where: { id },
    data: {
      approvalStatus: 'requested', approvalRequester: OPERATOR, approvalRequestedAt: now,
      history: { create: { version: v?.version, status: 'requested', requester: OPERATOR, requestedAt: now, changeNote: '승인요청' } },
    },
  });
  revalidate(id);
  redirect(`/admin/app-versions/${id}`);
}

// 승인요청 취소 (상세 버튼 CASE)
export async function cancelRequestVersion(id: string) {
  const v = await prisma.appVersion.findUnique({ where: { id } });
  const now = new Date();
  await prisma.appVersion.update({
    where: { id },
    data: {
      approvalStatus: 'cancelled',
      history: { create: { version: v?.version, status: 'cancelled', requester: v?.approvalRequester ?? OPERATOR, requestedAt: v?.approvalRequestedAt, processedAt: now, processReason: '요청취소', changeNote: '요청취소' } },
    },
  });
  revalidate(id);
  redirect(`/admin/app-versions/${id}`);
}
