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
  // 유형상세 행: typeDetailsJson = JSON [{type, detail, useYn, imageUrl, imageAlt}]
  let typeDetails: string | null = null;
  const raw = fd.get('typeDetailsJson');
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) typeDetails = JSON.stringify(arr);
    } catch { typeDetails = null; }
  }

  return {
    title: str(fd, 'title') ?? '',
    subtitle: str(fd, 'subtitle'),
    purpose: str(fd, 'purpose'),
    platform: str(fd, 'platform') ?? 'APP',
    exposeYn: fd.get('exposeYn') !== 'false',
    publishStart: dt(fd, 'publishStart'),
    publishEnd: dt(fd, 'publishEnd'),
    landingType: str(fd, 'landingType') ?? 'direct',
    landingUrl: str(fd, 'landingUrl'),
    pageType: str(fd, 'pageType') ?? 'current',
    bannerAlt: str(fd, 'bannerAlt'),
    typeDetails,
  };
}

// 배너캠페인 ID 자동 채번: BC-YYYYMM-NNN
async function nextCampaignCode(): Promise<string> {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `BC-${ym}-`;
  const last = await prisma.bannerCampaign.findFirst({
    where: { campaignCode: { startsWith: prefix } },
    orderBy: { campaignCode: 'desc' },
    select: { campaignCode: true },
  });
  const seq = last ? Number(last.campaignCode.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(seq).padStart(3, '0')}`;
}

function revalidate(id?: string) {
  revalidatePath('/admin/banner-campaigns');
  if (id) revalidatePath(`/admin/banner-campaigns/${id}`);
}

const MANAGER = '정지솔(SSP12344)';

// 승인 ID 채번 (표시용, 10자리 zero-pad)
function nextApprovalId(): string {
  return String(Math.floor(Math.random() * 90000000) + 10000000).padStart(10, '0');
}

// 등록 — '작성중' 상태로 생성(승인요청은 이후 상세에서 별도 전송) + 이력 기록
export async function createBannerCampaign(fd: FormData) {
  const data = readForm(fd);
  const campaignCode = await nextCampaignCode();
  const row = await prisma.bannerCampaign.create({
    data: {
      ...data, campaignCode, approvalStatus: 'draft',
      approvalRequester: null, approvalManager: null, approvalRequestedAt: null, approvalProcessedAt: null,
      createdBy: OPERATOR, updatedBy: OPERATOR,
      history: { create: { version: 1, status: 'draft', requester: OPERATOR, changeNote: '신규 등록 · 작성중' } },
    },
  });
  revalidate(row.id);
  redirect(`/admin/banner-campaigns/${row.id}`);
}

// 수정 + 이력 기록. 내용이 바뀌면 승인이 무효가 되므로 '작성중'으로 되돌리고 재요청을 유도한다.
export async function updateBannerCampaign(id: string, fd: FormData) {
  const data = readForm(fd);
  const prevCount = await prisma.bannerCampaignHistory.count({ where: { campaignId: id } });
  await prisma.bannerCampaign.update({
    where: { id },
    data: {
      ...data, updatedBy: OPERATOR, approvalStatus: 'draft',
      approvalRequester: null, approvalManager: null, approvalRequestedAt: null, approvalProcessedAt: null,
      history: { create: { version: prevCount + 1, status: 'draft', requester: OPERATOR, changeNote: '수정 · 작성중(재요청 필요)' } },
    },
  });
  revalidate(id);
  redirect(`/admin/banner-campaigns/${id}`);
}

// 배너 캠페인 삭제 (이력은 onDelete: Cascade 로 함께 삭제). 목록 갱신.
export async function deleteBannerCampaign(id: string) {
  await prisma.bannerCampaign.delete({ where: { id } });
  revalidatePath('/admin/banner-campaigns');
}

// ── 승인 워크플로우 ─────────────────────────────────────────
async function nextVersion(campaignId: string): Promise<number> {
  return (await prisma.bannerCampaignHistory.count({ where: { campaignId } })) + 1;
}

// 승인요청 보내기 (작성중/반려/요청취소 → 승인요청). 요청자·요청일시 기록 + 담당자 지정.
export async function requestBannerApproval(id: string) {
  const cur = await prisma.bannerCampaign.findUnique({ where: { id }, select: { approvalStatus: true } });
  if (!cur || cur.approvalStatus === 'requested' || cur.approvalStatus === 'approved') return; // 이미 요청/승인 상태면 무시
  const now = new Date();
  await prisma.bannerCampaign.update({
    where: { id },
    data: {
      approvalStatus: 'requested', approvalRequester: OPERATOR, approvalManager: MANAGER, approvalRequestedAt: now, approvalProcessedAt: null,
      history: { create: { version: await nextVersion(id), approvalId: nextApprovalId(), status: 'requested', requester: OPERATOR, manager: MANAGER, requestedAt: now, changeNote: '승인요청' } },
    },
  });
  revalidate(id);
}

// 승인요청 취소 (승인요청 → 요청취소). 다시 작성중처럼 재요청 가능.
export async function cancelBannerApproval(id: string) {
  const cur = await prisma.bannerCampaign.findUnique({ where: { id }, select: { approvalStatus: true, approvalRequestedAt: true } });
  if (!cur || cur.approvalStatus !== 'requested') return;
  await prisma.bannerCampaign.update({
    where: { id },
    data: {
      approvalStatus: 'cancelled',
      history: { create: { version: await nextVersion(id), status: 'cancelled', requester: OPERATOR, requestedAt: cur.approvalRequestedAt, changeNote: '승인요청 취소' } },
    },
  });
  revalidate(id);
}

// 승인 (승인요청 → 승인완료). 담당자·처리일시 기록.
export async function approveBannerCampaign(id: string) {
  const cur = await prisma.bannerCampaign.findUnique({ where: { id }, select: { approvalStatus: true, approvalRequestedAt: true } });
  if (!cur || cur.approvalStatus !== 'requested') return;
  const now = new Date();
  await prisma.bannerCampaign.update({
    where: { id },
    data: {
      approvalStatus: 'approved', approvalManager: MANAGER, approvalProcessedAt: now,
      history: { create: { version: await nextVersion(id), approvalId: nextApprovalId(), status: 'approved', requester: OPERATOR, manager: MANAGER, requestedAt: cur.approvalRequestedAt, processedAt: now, changeNote: '승인완료' } },
    },
  });
  revalidate(id);
}

// 반려 (승인요청 → 반려). 사유 필수 기록.
export async function rejectBannerCampaign(id: string, fd: FormData) {
  const cur = await prisma.bannerCampaign.findUnique({ where: { id }, select: { approvalStatus: true, approvalRequestedAt: true } });
  if (!cur || cur.approvalStatus !== 'requested') return;
  const reason = str(fd, 'reason') ?? '반려 사유 미기재';
  const now = new Date();
  await prisma.bannerCampaign.update({
    where: { id },
    data: {
      approvalStatus: 'rejected', approvalManager: MANAGER, approvalProcessedAt: now,
      history: { create: { version: await nextVersion(id), approvalId: nextApprovalId(), status: 'rejected', requester: OPERATOR, manager: MANAGER, requestedAt: cur.approvalRequestedAt, processedAt: now, processReason: reason, changeNote: `반려 · ${reason}` } },
    },
  });
  revalidate(id);
}
