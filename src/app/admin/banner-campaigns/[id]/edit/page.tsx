// SB BO-AIM-ETC-PG067 배너 캠페인 수정 · 전시관리
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { BannerForm } from '../../banner-form';
import { updateBannerCampaign } from '../../actions';
import { getImageLibrary } from '@/lib/image-library';

export const dynamic = 'force-dynamic';

export default async function BannerCampaignEditPage({ params }: { params: { id: string } }) {
  const b = await prisma.bannerCampaign.findUnique({ where: { id: params.id } });
  if (!b) notFound();
  let typeDetails: { type: string; detail: string }[] = [];
  try { if (b.typeDetails) typeDetails = JSON.parse(b.typeDetails); } catch { typeDetails = []; }
  const libImages = await getImageLibrary();

  return (
    <div className="px-8 py-6">
      <nav className="mb-1 text-[12px] text-muted-foreground">홈 › 전시관리 › 배너 캠페인 관리 › 배너 캠페인 수정</nav>
      <h1 className="mb-5 text-2xl font-bold">배너 캠페인 수정</h1>
      <BannerForm mode="edit" action={updateBannerCampaign.bind(null, b.id)} value={{
        campaignCode: b.campaignCode, title: b.title, subtitle: b.subtitle, purpose: b.purpose, platform: b.platform,
        applyChannels: b.applyChannels, landingChannels: b.landingChannels,
        exposeYn: b.exposeYn, publishStart: b.publishStart?.toISOString() ?? null, publishEnd: b.publishEnd?.toISOString() ?? null,
        landingType: b.landingType, landingUrl: b.landingUrl, pageType: b.pageType, bannerAlt: b.bannerAlt, typeDetails,
      }} libImages={libImages} />
    </div>
  );
}
