import { prisma } from '@/lib/prisma';
import type { BuiltCornerOption, RegisteredCombo } from './corner-type-manager';

/**
 * 전시화면관리(빌더)에서 실제로 만들어진 Corner의 유형 조합을 코너 유형 등록 후보로 반환한다.
 * cornerType → 만들어진 유형 상세(layoutDetail) 목록. layoutDetail이 null인 코너가 있으면 allowEmpty=true.
 * 코너 유형 등록/수정 폼의 드롭다운을 이 목록으로 제한한다 (전시화면관리에서 만들어진 유형만).
 */
export async function getBuiltCornerOptions(): Promise<BuiltCornerOption[]> {
  const corners = await prisma.corner.findMany({ select: { cornerType: true, layoutDetail: true } });
  const map = new Map<string, Set<string>>();
  for (const c of corners) {
    if (!map.has(c.cornerType)) map.set(c.cornerType, new Set());
    map.get(c.cornerType)!.add(c.layoutDetail ?? '');
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'ko'))
    .map(([cornerType, set]) => ({
      cornerType,
      allowEmpty: set.has(''),
      details: [...set].filter(Boolean).sort((a, b) => a.localeCompare(b, 'ko')),
    }));
}

/**
 * 등록된 코너 유형(코너 유형 관리 = 마스터)의 (코너유형·컴포넌트·배열) 조합.
 * 등록 폼의 ② 구성 컴포넌트 / ③ 배열 상세를 "그 코너 유형에 실제 등록된 것"으로 좁히는 데 쓴다.
 */
export async function getRegisteredCombos(): Promise<RegisteredCombo[]> {
  return prisma.cornerType.findMany({
    select: { baseCategory: true, componentType: true, typeDetail: true, bigBanner: true },
    orderBy: { typeId: 'asc' },
  });
}
