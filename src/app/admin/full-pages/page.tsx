// SB BO-AIM-DSP-PG003/PG027 전체페이지 관리 — 상세검색(TAB) 목록 + IA 구조(TAB) · 전시 관리
import { prisma } from '@/lib/prisma';
import { FullPageManager, type FPRow } from './full-page-list';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  urlpending: 'URL 확정대기', review: '승인요청', approved: '승인완료', rejected: '반려', urlnone: 'URL 미등록',
};
const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : null);

export default async function FullPagesPage() {
  const rows = await prisma.fullPage.findMany({ orderBy: [{ sortOrder: 'desc' }, { updatedAt: 'desc' }] });
  const list: FPRow[] = rows.map((r) => ({
    id: r.id,
    pageCode: r.pageCode,
    menuName: r.menuName,
    path: r.path ?? '-',
    url: r.url ?? '-',
    status: r.status,
    statusLabel: STATUS_LABEL[r.status] ?? r.status,
    useYn: r.useYn,
    frontExposeYn: r.frontExposeYn,
    channels: r.channels ? r.channels.split(',').filter(Boolean) : [],
    category: r.category ?? null,
    parentId: r.parentId ?? null,
    depth: r.depth,
    updatedAt: iso(r.updatedAt),
    createdAt: iso(r.createdAt),
  }));
  return <FullPageManager rows={list} />;
}
