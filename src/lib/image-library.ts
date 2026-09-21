import { prisma } from '@/lib/prisma';
import type { ImageAsset } from '@/components/asset-picker-modal';

// 이미지 라이브러리 (DB에서 가져오기) — IMAGE/ICON Atom + 등록된 배너 이미지, url 기준 중복 제거.
// 배너 캠페인 등 여러 폼에서 "로컬 업로드 / DB에서 가져오기" 두 방식을 지원하기 위한 공통 소스.
export async function getImageLibrary(): Promise<ImageAsset[]> {
  const [imgAtoms, banners] = await Promise.all([
    prisma.atom.findMany({
      where: { status: 'active', atomType: { in: ['ICON', 'IMAGE'] }, NOT: { imageUrl: null } },
      orderBy: { updatedAt: 'desc' },
      select: { name: true, imageUrl: true, altText: true },
    }),
    prisma.banner.findMany({
      where: { status: 'active' },
      orderBy: { updatedAt: 'desc' },
      select: { name: true, imageUrl: true },
    }),
  ]);
  const map = new Map<string, ImageAsset>();
  for (const a of imgAtoms) if (a.imageUrl && !map.has(a.imageUrl)) map.set(a.imageUrl, { url: a.imageUrl, alt: a.altText, name: a.name });
  for (const b of banners) if (b.imageUrl && !map.has(b.imageUrl)) map.set(b.imageUrl, { url: b.imageUrl, alt: b.name, name: b.name });
  return [...map.values()];
}
