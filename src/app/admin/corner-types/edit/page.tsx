// 코너 유형(base) 수정 — 원본 풀 편집 폼(bulk 모드)로 한 번에 수정/추가/삭제 · 전시관리
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getBuiltCornerOptions, getRegisteredCombos } from '../built-options';
import { toCornerTypeRow } from '../row-map';
import { TypeVariationsEditor } from './type-editor';

export const dynamic = 'force-dynamic';

export default async function CornerTypeEditPage({ searchParams }: { searchParams: { base?: string } }) {
  const base = (searchParams.base ?? '').trim();
  if (!base) notFound();
  const [rows, builtOptions, registered] = await Promise.all([
    prisma.cornerType.findMany({ where: { baseCategory: base }, orderBy: { typeId: 'asc' } }),
    getBuiltCornerOptions(),
    getRegisteredCombos(),
  ]);
  const variations = rows.map((r) => toCornerTypeRow(r, null));

  return (
    <div className="p-6">
      <TypeVariationsEditor base={base} variations={variations} builtOptions={builtOptions} registered={registered} />
    </div>
  );
}
