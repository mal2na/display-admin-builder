'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

const ACTOR = 'marina.kim@sk.com';
// 승인/반려는 외부 BSS에서 처리한다(정책서 PI-DSP-WFL-002). 운영자(어드민)는 코너 유형 단위로 승인 요청만 BSS로 보낸다.
const BSS = 'BSS';

// 승인 상태 전이: 초안/반려 → 승인 대기 → 승인 완료/반려. 승인 후 수정 시 초안 회귀.
const TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['REVIEW'],
  REVIEW: ['APPROVED', 'REJECTED'],
  REJECTED: ['REVIEW'],
  APPROVED: ['DRAFT'],
};

function assertTransition(from: string, to: string) {
  if (!(TRANSITIONS[from] ?? []).includes(to)) {
    throw new Error(`코너 유형 승인 상태 전이 불가: ${from} → ${to}`);
  }
}

function rp(id: string) {
  revalidatePath(`/admin/corner-types/${id}`);
  revalidatePath('/admin/corner-types');
  revalidatePath('/admin/audit-log');
}

async function writeAudit(opts: { id: string; before: unknown; after: unknown; reason?: string | null; approver?: string | null; result: string }) {
  await prisma.auditLog.create({
    data: {
      actor: ACTOR,
      targetType: 'CornerType',
      targetId: opts.id,
      beforeValue: JSON.stringify(opts.before),
      afterValue: JSON.stringify(opts.after),
      reason: opts.reason ?? null,
      approver: opts.approver ?? null,
      result: opts.result,
    },
  });
}

// ── 승인 요청 필수값 검증 (내부 게이트) ──
type Issue = { field: string; detail: string };
function gateIssues(ct: { name: string | null; baseCategory: string | null; componentType: string | null }): Issue[] {
  const issues: Issue[] = [];
  if (!ct.name?.trim()) issues.push({ field: '유형명', detail: '코너 유형 이름이 비어 있습니다.' });
  if (!ct.baseCategory?.trim()) issues.push({ field: '코너 유형', detail: '기준 코너 유형(8종)이 지정되지 않았습니다.' });
  if (!ct.componentType?.trim()) issues.push({ field: '구성 컴포넌트', detail: '구성 컴포넌트 유형이 지정되지 않았습니다.' });
  return issues;
}

// ── 1. 승인 요청 (초안/반려 → 승인 대기). BSS로 보내기. ──
export async function requestCornerTypeReview(id: string) {
  const ct = await prisma.cornerType.findUniqueOrThrow({ where: { id } });
  const issues = gateIssues(ct);
  if (issues.length) return { ok: false as const, issues };
  assertTransition(ct.status, 'REVIEW');
  await prisma.cornerType.update({ where: { id }, data: { status: 'REVIEW', rejectReason: null, reviewedBy: null, reviewedAt: null } });
  await writeAudit({ id, before: { status: ct.status }, after: { status: 'REVIEW' }, result: 'REVIEW_REQUESTED' });
  rp(id);
  return { ok: true as const, issues: [] as Issue[] };
}

// ── 2-a. BSS 승인 응답 (승인 대기 → 승인 완료) ──
export async function approveCornerType(id: string) {
  const ct = await prisma.cornerType.findUniqueOrThrow({ where: { id } });
  assertTransition(ct.status, 'APPROVED');
  const now = new Date();
  await prisma.cornerType.update({ where: { id }, data: { status: 'APPROVED', rejectReason: null, reviewedBy: BSS, reviewedAt: now } });
  await writeAudit({ id, before: { status: ct.status }, after: { status: 'APPROVED' }, approver: BSS, result: 'APPROVED' });
  rp(id);
  return { ok: true as const };
}

// ── 2-b. BSS 반려 응답 (승인 대기 → 반려, 사유 필수) ──
export async function rejectCornerType(id: string, reason: string) {
  const r = reason?.trim();
  if (!r) return { ok: false as const, error: '반려 사유는 필수입니다.' };
  const ct = await prisma.cornerType.findUniqueOrThrow({ where: { id } });
  assertTransition(ct.status, 'REJECTED');
  const now = new Date();
  await prisma.cornerType.update({ where: { id }, data: { status: 'REJECTED', rejectReason: r, reviewedBy: BSS, reviewedAt: now } });
  await writeAudit({ id, before: { status: ct.status }, after: { status: 'REJECTED' }, reason: r, approver: BSS, result: 'REJECTED' });
  rp(id);
  return { ok: true as const };
}

// 라이브 정본으로 스냅샷할 정의 필드(불러오기가 소비하는 값). createCornerInstanceFromTypeId와 1:1.
function defSnapshot(ct: {
  baseCategory: string; componentType: string | null; typeDetail: string | null; bigBanner: boolean;
  layout: string | null; markupId: string | null; description: string | null;
  defaultMoreButton: boolean; useMoreButton: boolean; defaultMoreButtonLabel: string | null;
  defaultSortStrategy: string | null; sampleImageUrl: string | null; cvmFields: string; name: string;
}) {
  return JSON.stringify({
    name: ct.name, baseCategory: ct.baseCategory, componentType: ct.componentType, typeDetail: ct.typeDetail,
    bigBanner: ct.bigBanner, layout: ct.layout, markupId: ct.markupId, description: ct.description,
    defaultMoreButton: ct.defaultMoreButton, useMoreButton: ct.useMoreButton, defaultMoreButtonLabel: ct.defaultMoreButtonLabel,
    defaultSortStrategy: ct.defaultSortStrategy, sampleImageUrl: ct.sampleImageUrl, cvmFields: ct.cvmFields,
  });
}

// ── 3. 반영(사용) — 승인 완료 → 라이브 승격(수동 게시). 이때 비로소 새 버전이 불러오기/노출의 정본이 된다. ──
export async function publishCornerType(id: string) {
  const ct = await prisma.cornerType.findUniqueOrThrow({ where: { id } });
  if (ct.status !== 'APPROVED') return { ok: false as const, error: '승인 완료 상태에서만 반영할 수 있습니다.' };
  if (ct.liveVersion === ct.workingVersion) return { ok: false as const, error: '이미 최신 승인본이 반영되어 있습니다.' };
  const now = new Date();
  await prisma.cornerType.update({
    where: { id },
    data: { liveVersion: ct.workingVersion, liveSnapshot: defSnapshot(ct), liveAt: now, active: true },
  });
  await writeAudit({ id, before: { liveVersion: ct.liveVersion }, after: { liveVersion: ct.workingVersion }, result: 'PUBLISHED' });
  rp(id);
  return { ok: true as const };
}

// ── 4. 수정 착수 (승인 완료 → 새 편집본 초안). 라이브 승인본은 그대로 사용 중 유지. ──
export async function reopenCornerType(id: string) {
  const ct = await prisma.cornerType.findUniqueOrThrow({ where: { id } });
  assertTransition(ct.status, 'DRAFT');
  // 이미 반영 완료(clean)면 새 편집본 시작 → workingVersion++
  const clean = ct.workingVersion === (ct.liveVersion ?? -1);
  await prisma.cornerType.update({
    where: { id },
    data: { status: 'DRAFT', reviewedBy: null, reviewedAt: null, workingVersion: clean ? ct.workingVersion + 1 : ct.workingVersion },
  });
  await writeAudit({ id, before: { status: ct.status }, after: { status: 'DRAFT' }, result: 'REOPENED' });
  rp(id);
  return { ok: true as const };
}
