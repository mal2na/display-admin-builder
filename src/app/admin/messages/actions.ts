'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

// 문구 관리(카탈로그) — 채널 통제 판. 여기선 '노출/제외' 통제만 한다(편집은 코너/컴포넌트 인컨텍스트).
//  회의 2026-08-31: 채널은 "어떤 문구가 노출될 수 있는지" 통제 권한을 가진다. 삭제 아님(enabled 플래그).

type Variant = { text: string; target?: string; enabled?: boolean };

function parseVariants(json: string | null): Variant[] {
  try {
    const a = JSON.parse(json ?? '');
    if (Array.isArray(a)) return a.filter((x) => x && typeof x.text === 'string');
  } catch { /* noop */ }
  return [];
}

function revalidateAll() {
  revalidatePath('/admin/messages');
  // 빌더 미리보기에도 반영되도록 템플릿 경로 전체 갱신
  revalidatePath('/admin/templates', 'layout');
}

// 코너 타이틀 후보의 노출/제외 토글
export async function toggleTitleVariant(cornerId: string, index: number) {
  const c = await prisma.corner.findUnique({ where: { id: cornerId }, select: { mainTitleVariants: true } });
  const arr = parseVariants(c?.mainTitleVariants ?? null);
  if (!arr[index]) return;
  arr[index] = { ...arr[index], enabled: arr[index].enabled === false }; // false→true(노출), 그 외→false(제외)
  await prisma.corner.update({ where: { id: cornerId }, data: { mainTitleVariants: JSON.stringify(arr) } });
  revalidateAll();
}

// 아톰 문구 후보의 노출/제외 토글
export async function toggleAtomVariant(atomId: string, index: number) {
  const a = await prisma.atom.findUnique({ where: { id: atomId }, select: { contentVariants: true } });
  const arr = parseVariants(a?.contentVariants ?? null);
  if (!arr[index]) return;
  arr[index] = { ...arr[index], enabled: arr[index].enabled === false };
  await prisma.atom.update({ where: { id: atomId }, data: { contentVariants: JSON.stringify(arr) } });
  revalidateAll();
}

// ── 후보 추가 (직접입력 / 라이브러리 불러오기 / AI 제안 채택 — 텍스트는 채널이 author) ──
export async function addTitleVariant(cornerId: string, text: string, target?: string) {
  if (!text.trim()) return;
  const c = await prisma.corner.findUnique({ where: { id: cornerId }, select: { mainTitleVariants: true } });
  const arr = parseVariants(c?.mainTitleVariants ?? null);
  arr.push({ text: text.trim(), target: target || undefined, enabled: true });
  await prisma.corner.update({ where: { id: cornerId }, data: { mainTitleVariants: JSON.stringify(arr) } });
  revalidateAll();
}
export async function addAtomVariant(atomId: string, text: string, target?: string) {
  if (!text.trim()) return;
  const a = await prisma.atom.findUnique({ where: { id: atomId }, select: { contentVariants: true } });
  const arr = parseVariants(a?.contentVariants ?? null);
  arr.push({ text: text.trim(), target: target || undefined, enabled: true });
  await prisma.atom.update({ where: { id: atomId }, data: { contentVariants: JSON.stringify(arr) } });
  revalidateAll();
}
