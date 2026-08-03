'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import {
  DISPLAY_STATUS_TRANSITIONS,
  DISPLAY_STATUS_LABEL,
  ALT_TEXT_REQUIRED_ATOM_TYPES,
  type DisplayStatusKey,
} from '@/lib/display-taxonomy';

const ACTOR = 'marina.kim@sk.com';

function rp(templateId: string, containerId?: string) {
  revalidatePath(`/admin/templates/${templateId}/builder`);
  revalidatePath('/admin/audit-log');
  if (containerId) {
    revalidatePath(`/admin/containers/${containerId}`);
    revalidatePath(`/admin/containers/${containerId}/compare`);
  }
}

async function writeAudit(opts: {
  targetId: string;
  before: unknown;
  after: unknown;
  reason?: string | null;
  approver?: string | null;
  result: string;
}) {
  await prisma.auditLog.create({
    data: {
      actor: ACTOR,
      targetType: 'Template',
      targetId: opts.targetId,
      beforeValue: JSON.stringify(opts.before),
      afterValue: JSON.stringify(opts.after),
      reason: opts.reason ?? null,
      approver: opts.approver ?? null,
      result: opts.result,
    },
  });
}

function assertTransition(from: string, to: DisplayStatusKey) {
  const allowed = DISPLAY_STATUS_TRANSITIONS[from as DisplayStatusKey] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(
      `상태 전이 불가: ${DISPLAY_STATUS_LABEL[from as DisplayStatusKey] ?? from} → ${DISPLAY_STATUS_LABEL[to]} (정책서 상태 전이표 위반)`,
    );
  }
}

// ── 검수 요청 필수값 검증 (PI-DSP-WFL-001 / PI-DSP-CMP-004) ──
export type ReviewIssue = { corner: string; field: string; detail: string };

export async function collectReviewIssues(templateId: string): Promise<ReviewIssue[]> {
  const t = await prisma.template.findUnique({
    where: { id: templateId },
    include: {
      templateCorners: {
        where: { visible: true },
        orderBy: { order: 'asc' },
        include: {
          corner: {
            include: {
              banner: true,
              cornerComponents: {
                orderBy: { order: 'asc' },
                include: { component: { include: { componentAtoms: { include: { atom: true } } } } },
              },
            },
          },
        },
      },
    },
  });
  const issues: ReviewIssue[] = [];
  if (!t) return [{ corner: '-', field: '템플릿', detail: '템플릿을 찾을 수 없습니다.' }];

  // 제목(이름)·노출 조건(조건 그룹)
  if (!t.name?.trim()) issues.push({ corner: '-', field: '제목', detail: '템플릿 제목이 비어 있습니다.' });
  if (!t.conditionGroup?.trim()) issues.push({ corner: '-', field: '노출 조건', detail: '조건 그룹이 지정되지 않았습니다.' });
  if (t.templateCorners.length === 0)
    issues.push({ corner: '-', field: '구성', detail: '노출할 코너가 하나도 없습니다.' });

  for (const tc of t.templateCorners) {
    const c = tc.corner;
    const cname = c.mainTitle?.split('\n')[0] || c.title || c.name;

    // 구성 컴포넌트 존재
    if (c.cornerComponents.length === 0) {
      issues.push({ corner: cname, field: '구성', detail: '코너에 컴포넌트가 없습니다.' });
    }
    // 배너형 코너: 배너 or 배너 컴포넌트 필요
    if (c.cornerType === '배너형' && !c.banner && c.cornerComponents.length === 0) {
      issues.push({ corner: cname, field: '배너', detail: '배너형 코너에 배너/컴포넌트가 없습니다.' });
    }

    for (const cc of c.cornerComponents) {
      const compName = cc.component.name;
      for (const ca of cc.component.componentAtoms) {
        const a = ca.atom;
        // 대체텍스트 (PI-DSP-CMP-004)
        if ((ALT_TEXT_REQUIRED_ATOM_TYPES as readonly string[]).includes(a.atomType) && !a.altText?.trim()) {
          issues.push({ corner: cname, field: '대체텍스트', detail: `${compName} › ${a.name} (이미지/아이콘)` });
        }
        // 랜딩값 (버튼/CTA)
        if ((a.atomType === 'BUTTON' || a.atomType === 'CTA') && !a.linkUrl?.trim()) {
          issues.push({ corner: cname, field: '랜딩값', detail: `${compName} › ${a.name} 링크 URL 누락` });
        }
      }
    }
  }
  return issues;
}

// ── 동일 조건 그룹·Container 내 게시 기간 중복 검사 (정책서 3. 조건 판정) ──
export type OverlapHit = { id: string; name: string; status: string; startAt: string | null; endAt: string | null };

function periodsOverlap(aS: Date | null, aE: Date | null, bS: Date | null, bE: Date | null) {
  const s1 = aS ? aS.getTime() : -Infinity;
  const e1 = aE ? aE.getTime() : Infinity;
  const s2 = bS ? bS.getTime() : -Infinity;
  const e2 = bE ? bE.getTime() : Infinity;
  return s1 <= e2 && s2 <= e1;
}

export async function findPublishOverlaps(templateId: string): Promise<OverlapHit[]> {
  const t = await prisma.template.findUnique({ where: { id: templateId } });
  if (!t) return [];
  const siblings = await prisma.template.findMany({
    where: {
      containerId: t.containerId,
      conditionGroup: t.conditionGroup,
      id: { not: t.id },
      status: { in: ['SCHEDULED', 'PUBLISHED'] },
    },
  });
  return siblings
    .filter((s) => periodsOverlap(t.startAt, t.endAt, s.startAt, s.endAt))
    .map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status,
      startAt: s.startAt ? s.startAt.toISOString() : null,
      endAt: s.endAt ? s.endAt.toISOString() : null,
    }));
}

// ── 1. 검수 요청 (초안/수정 필요 → 검수 대기) ──
export async function requestReview(templateId: string) {
  const issues = await collectReviewIssues(templateId);
  if (issues.length) return { ok: false as const, issues };

  const t = await prisma.template.findUniqueOrThrow({ where: { id: templateId } });
  assertTransition(t.status, 'REVIEW');
  await prisma.template.update({ where: { id: templateId }, data: { status: 'REVIEW', rejectReason: null } });
  await writeAudit({ targetId: templateId, before: { status: t.status }, after: { status: 'REVIEW' }, result: 'REVIEW_REQUESTED' });
  rp(templateId, t.containerId);
  return { ok: true as const, issues: [] as ReviewIssue[] };
}

// ── 2-a. 승인 (검수 대기 → 승인 완료) ──
export async function approveTemplate(templateId: string) {
  const t = await prisma.template.findUniqueOrThrow({ where: { id: templateId } });
  assertTransition(t.status, 'APPROVED');
  await prisma.template.update({
    where: { id: templateId },
    data: { status: 'APPROVED', rejectReason: null, lastApprovedVersion: t.version },
  });
  await writeAudit({ targetId: templateId, before: { status: t.status }, after: { status: 'APPROVED', version: t.version }, approver: ACTOR, result: 'APPROVED' });
  rp(templateId, t.containerId);
  return { ok: true as const };
}

// ── 2-b. 반려 (검수 대기 → 수정 필요, 사유 필수) ──
export async function rejectTemplate(templateId: string, reason: string) {
  const r = reason?.trim();
  if (!r) return { ok: false as const, error: '반려 사유는 필수입니다.' };
  const t = await prisma.template.findUniqueOrThrow({ where: { id: templateId } });
  assertTransition(t.status, 'REJECTED');
  await prisma.template.update({ where: { id: templateId }, data: { status: 'REJECTED', rejectReason: r } });
  await writeAudit({ targetId: templateId, before: { status: t.status }, after: { status: 'REJECTED' }, reason: r, approver: ACTOR, result: 'REJECTED' });
  rp(templateId, t.containerId);
  return { ok: true as const };
}

// ── 3-a. 게시 예약 (승인 완료 → 예약 대기, 시작/종료 시각) ──
export async function scheduleTemplate(templateId: string, startAtRaw: string, endAtRaw: string) {
  const t = await prisma.template.findUniqueOrThrow({ where: { id: templateId } });
  assertTransition(t.status, 'SCHEDULED');
  const startAt = startAtRaw ? new Date(startAtRaw) : null;
  const endAt = endAtRaw ? new Date(endAtRaw) : null;
  if (startAt && endAt && startAt.getTime() > endAt.getTime())
    return { ok: false as const, error: '시작 시각이 종료 시각보다 늦습니다.' };

  await prisma.template.update({ where: { id: templateId }, data: { status: 'SCHEDULED', startAt, endAt } });
  const overlaps = await findPublishOverlaps(templateId);
  await writeAudit({ targetId: templateId, before: { status: t.status }, after: { status: 'SCHEDULED', startAt, endAt }, result: 'SCHEDULED' });
  rp(templateId, t.containerId);
  return { ok: true as const, overlaps };
}

// ── 3-b. 예약 시각 도래 시뮬레이션 (예약 대기 → 게시 중) ──
export async function publishArrived(templateId: string, force = false) {
  const t = await prisma.template.findUniqueOrThrow({ where: { id: templateId } });
  assertTransition(t.status, 'PUBLISHED');
  const overlaps = await findPublishOverlaps(templateId);
  const hardConflict = overlaps.filter((o) => o.status === 'PUBLISHED');
  if (hardConflict.length && !force) {
    return { ok: false as const, overlaps, blocked: true as const };
  }
  await prisma.template.update({ where: { id: templateId }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
  await writeAudit({
    targetId: templateId,
    before: { status: t.status },
    after: { status: 'PUBLISHED' },
    reason: overlaps.length ? `중복 경고 무시하고 게시(${overlaps.map((o) => o.name).join(', ')})` : null,
    result: 'PUBLISHED',
  });
  rp(templateId, t.containerId);
  return { ok: true as const, overlaps };
}

// ── 4-a. 긴급 중지 (게시 중 → 게시 중지, 사유/실행자/시각 필수) ──
export async function suspendTemplate(templateId: string, reason: string) {
  const r = reason?.trim();
  if (!r) return { ok: false as const, error: '중지 사유는 필수입니다.' };
  const t = await prisma.template.findUniqueOrThrow({ where: { id: templateId } });
  assertTransition(t.status, 'SUSPENDED');
  const now = new Date();
  await prisma.template.update({
    where: { id: templateId },
    data: { status: 'SUSPENDED', suspendReason: r, suspendedBy: ACTOR, suspendedAt: now },
  });
  await writeAudit({ targetId: templateId, before: { status: t.status }, after: { status: 'SUSPENDED', suspendedBy: ACTOR, suspendedAt: now }, reason: r, result: 'SUSPENDED' });
  rp(templateId, t.containerId);
  return { ok: true as const };
}

// ── 4-b. 롤백 (게시 중지 → 롤백 완료). Draft/Review/Rejected에서는 불가 (PI-DSP-RBK-002) ──
export async function rollbackTemplate(templateId: string) {
  const t = await prisma.template.findUniqueOrThrow({ where: { id: templateId } });
  if (['DRAFT', 'REVIEW', 'REJECTED'].includes(t.status)) {
    return { ok: false as const, error: 'Draft/검수 대기/수정 필요 상태에서는 롤백할 수 없습니다. (PI-DSP-RBK-002)' };
  }
  assertTransition(t.status, 'ROLLED_BACK');
  await prisma.template.update({ where: { id: templateId }, data: { status: 'ROLLED_BACK' } });
  await writeAudit({
    targetId: templateId,
    before: { status: t.status },
    after: { status: 'ROLLED_BACK', restoredToVersion: t.lastApprovedVersion ?? t.version },
    reason: `직전 승인 완료 버전(v${t.lastApprovedVersion ?? t.version})으로 복원`,
    result: 'ROLLED_BACK',
  });
  rp(templateId, t.containerId);
  return { ok: true as const };
}
