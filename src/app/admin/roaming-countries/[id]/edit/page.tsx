// SB BO-AIM-DSP-PG571/570/569/568/567/572 — 로밍국가 관리 수정
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { RoamingEditForm, type RoamingEditValue } from '../../roaming-edit-form';
import { updateRoaming } from '../../actions';
import { parseService } from '@/lib/roaming';
import { PageHeader } from '@/components/page-header';

export const dynamic = 'force-dynamic';

export default async function RoamingEditPage({ params }: { params: { id: string } }) {
  const r = await prisma.roamingCountry.findUnique({ where: { id: params.id }, include: { sites: { orderBy: { seq: 'asc' } } } });
  if (!r) notFound();

  const value: RoamingEditValue = {
    continent: r.continent, nameKo: r.nameKo, nameEn: r.nameEn, countryCode: r.countryCode, mccCode: r.mccCode, gmt: r.gmt, timeDiff: r.timeDiff,
    searchYn: r.searchYn, detailYn: r.detailYn, adjacentCountries: r.adjacentCountries, currencyCode: r.currencyCode,
    countryImageUrl: r.countryImageUrl, countryImageAlt: r.countryImageAlt, bgImageUrl: r.bgImageUrl, bgImageAlt: r.bgImageAlt,
    countryImage2Url: r.countryImage2Url, countryImage2Alt: r.countryImage2Alt, buttonImageUrl: r.buttonImageUrl, buttonImageAlt: r.buttonImageAlt,
    faultNoticeYn: r.faultNoticeYn, faultNoticeStart: r.faultNoticeStart?.toISOString() ?? null, faultNoticeEnd: r.faultNoticeEnd?.toISOString() ?? null, faultNoticeContent: r.faultNoticeContent,
    services: { WCDMA: parseService(r.wcdma), GSM: parseService(r.gsm), LTE: parseService(r.lte), CDMA: parseService(r.cdma), 임대로밍: parseService(r.lease) },
    sites: r.sites.map((s) => ({ siteName: s.siteName, link: s.link, imageUrl: s.imageUrl, imageAlt: s.imageAlt, exposeYn: s.exposeYn })),
  };

  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader trail={['운영관리', '로밍국가 관리', '로밍국가 관리 수정']} title="로밍국가 관리 수정" />
      <div className="mt-6" />
      <RoamingEditForm id={r.id} action={updateRoaming.bind(null, r.id)} value={value} />
    </div>
  );
}
