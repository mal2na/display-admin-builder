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
function bool(fd: FormData, k: string): boolean { return fd.get(k) === 'true'; }

function revalidate(id?: string) {
  revalidatePath('/admin/roaming-countries');
  if (id) revalidatePath(`/admin/roaming-countries/${id}`);
}

// 수정 저장 (SB PG567~572) — 저장 → 상세, 승인상태 '임시저장'. 서비스타입 콘텐츠는 JSON(payload)로 전달.
export async function updateRoaming(id: string, fd: FormData) {
  const lastSeq = await prisma.roamingCountryHistory.aggregate({ where: { countryId: id }, _max: { seq: true } });
  const data: Record<string, unknown> = {
    searchYn: bool(fd, 'searchYn'),
    detailYn: bool(fd, 'detailYn'),
    adjacentCountries: str(fd, 'adjacentCountries'),
    currencyCode: str(fd, 'currencyCode'),
    countryImageUrl: str(fd, 'countryImageUrl'), countryImageAlt: str(fd, 'countryImageAlt'),
    bgImageUrl: str(fd, 'bgImageUrl'), bgImageAlt: str(fd, 'bgImageAlt'),
    countryImage2Url: str(fd, 'countryImage2Url'), countryImage2Alt: str(fd, 'countryImage2Alt'),
    buttonImageUrl: str(fd, 'buttonImageUrl'), buttonImageAlt: str(fd, 'buttonImageAlt'),
    faultNoticeYn: bool(fd, 'faultNoticeYn'),
    faultNoticeStart: dt(fd, 'faultNoticeStart'), faultNoticeEnd: dt(fd, 'faultNoticeEnd'),
    faultNoticeContent: str(fd, 'faultNoticeContent'),
    approvalStatus: 'draft', updatedBy: OPERATOR,
  };
  // 서비스타입 콘텐츠 JSON — 폼에서 JSON 문자열로 전달된 것만 반영
  for (const key of ['wcdma', 'gsm', 'lte', 'cdma', 'lease'] as const) {
    const json = str(fd, `svc_${key}`);
    if (json !== null) data[key] = json;
  }
  await prisma.roamingCountry.update({
    where: { id },
    data: { ...data, history: { create: { seq: (lastSeq._max.seq ?? 0) + 1, status: 'draft', changeNote: '수정' } } },
  });
  revalidate(id);
  redirect(`/admin/roaming-countries/${id}`);
}

// 상세에서 승인요청
export async function requestApprovalRoaming(id: string) {
  const now = new Date();
  const lastSeq = await prisma.roamingCountryHistory.aggregate({ where: { countryId: id }, _max: { seq: true } });
  await prisma.roamingCountry.update({
    where: { id },
    data: {
      approvalStatus: 'requested', approvalRequester: OPERATOR, approvalRequestedAt: now,
      history: { create: { seq: (lastSeq._max.seq ?? 0) + 1, status: 'requested', requester: OPERATOR, requestedAt: now, changeNote: '승인요청' } },
    },
  });
  revalidate(id);
  redirect(`/admin/roaming-countries/${id}`);
}

// 승인요청 취소
export async function cancelRequestRoaming(id: string) {
  const r = await prisma.roamingCountry.findUnique({ where: { id } });
  const now = new Date();
  const lastSeq = await prisma.roamingCountryHistory.aggregate({ where: { countryId: id }, _max: { seq: true } });
  await prisma.roamingCountry.update({
    where: { id },
    data: {
      approvalStatus: 'draft',
      history: { create: { seq: (lastSeq._max.seq ?? 0) + 1, status: 'cancelled', requester: r?.approvalRequester ?? OPERATOR, requestedAt: r?.approvalRequestedAt, processedAt: now, processReason: '요청취소', changeNote: '요청취소' } },
    },
  });
  revalidate(id);
  redirect(`/admin/roaming-countries/${id}`);
}
