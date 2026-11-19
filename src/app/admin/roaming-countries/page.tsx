// SB BO-AIM-DSP-PG560 로밍국가 관리 목록 · 운영 관리
import { prisma } from '@/lib/prisma';
import { RoamingList, type RoamingRow } from './roaming-list';

export const dynamic = 'force-dynamic';

// 등록된 콘텐츠 — 국가정보(상세설정/인접국/이미지 중 하나라도) + 서비스타입별 JSON 존재 (SB 5)
function contentsOf(r: {
  detailYn: boolean; adjacentCountries: string | null; countryImageUrl: string | null;
  wcdma: string | null; gsm: string | null; lte: string | null; cdma: string | null; lease: string | null;
}): string[] {
  const out: string[] = [];
  if (r.detailYn || r.adjacentCountries || r.countryImageUrl) out.push('국가정보');
  if (r.wcdma) out.push('WCDMA');
  if (r.gsm) out.push('GSM');
  if (r.lte) out.push('LTE');
  if (r.cdma) out.push('CDMA');
  if (r.lease) out.push('임대로밍');
  return out;
}

export default async function RoamingCountriesPage() {
  // 가나다순 정렬 (SB 5)
  const rows = await prisma.roamingCountry.findMany({ orderBy: { nameKo: 'asc' } });
  const data: RoamingRow[] = rows.map((r) => ({
    id: r.id,
    nameKo: r.nameKo,
    continent: r.continent,
    countryCode: r.countryCode,
    adjacentCountries: r.adjacentCountries,
    searchYn: r.searchYn,
    detailYn: r.detailYn,
    contents: contentsOf(r),
  }));
  return <RoamingList rows={data} />;
}
