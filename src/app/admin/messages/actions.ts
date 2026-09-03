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

// ── 엑셀(CSV) 대량 업로드 — 문구 배리에이션 밀어넣기 ──
//  타겟 6열(시니어/2030/재방문/위치 인근/혜택 보유/신규)을 읽어 각 문구의 배리에이션으로 저장.
//  문구ID: 'title:<cornerId>'는 코너 타이틀, 그 외는 atomId. 회의 '처음 100개 입력' 대량 세팅 지원.
const TARGET_ORDER = ['시니어', '2030', '재방문', '위치 인근', '혜택 보유', '신규'];

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cur = '', inQ = false;
  const t = text.replace(/^﻿/, '');
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (inQ) {
      if (ch === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (ch === '\r') { /* skip */ }
    else cur += ch;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

export async function importMessages(csv: string): Promise<{ ok: boolean; updated: number; skipped: number }> {
  const rows = parseCSV(csv).filter((r) => r.some((c) => c.trim() !== ''));
  if (rows.length < 2) return { ok: false, updated: 0, skipped: 0 };
  const header = rows[0].map((h) => h.trim());
  const tIdx = TARGET_ORDER.map((t) => header.indexOf(t));
  let updated = 0, skipped = 0;
  for (const r of rows.slice(1)) {
    const id = (r[0] ?? '').trim();
    if (!id) { skipped++; continue; }
    const variants = TARGET_ORDER
      .map((t, k) => ({ target: t, text: (tIdx[k] >= 0 ? (r[tIdx[k]] ?? '') : '').trim() }))
      .filter((v) => v.text)
      .map((v) => ({ ...v, enabled: true }));
    const json = variants.length ? JSON.stringify(variants) : null;
    try {
      if (id.startsWith('title:')) await prisma.corner.update({ where: { id: id.slice(6) }, data: { mainTitleVariants: json } });
      else await prisma.atom.update({ where: { id }, data: { contentVariants: json } });
      updated++;
    } catch { skipped++; }
  }
  revalidateAll();
  return { ok: true, updated, skipped };
}
