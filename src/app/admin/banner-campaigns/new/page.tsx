// SB BO-AIM-ETC-PG062 배너 캠페인 등록 · 전시관리
import { BannerForm } from '../banner-form';
import { createBannerCampaign } from '../actions';
import { getImageLibrary } from '@/lib/image-library';

export const dynamic = 'force-dynamic';

export default async function BannerCampaignNewPage() {
  const libImages = await getImageLibrary();
  return (
    <div className="px-8 py-6">
      <nav className="mb-1 text-[12px] text-muted-foreground">홈 › 전시관리 › 배너 캠페인 관리 › 배너 캠페인 등록</nav>
      <h1 className="mb-5 text-2xl font-bold">배너 캠페인 등록</h1>
      <BannerForm mode="new" action={createBannerCampaign} libImages={libImages} />
    </div>
  );
}
