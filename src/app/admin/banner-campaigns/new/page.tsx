// SB BO-AIM-ETC-PG062 배너 캠페인 등록 · 전시관리
import { BannerForm } from '../banner-form';
import { createBannerCampaign } from '../actions';
import { getImageLibrary } from '@/lib/image-library';
import { getEventOptions } from '../event-options';
import { PageHeader } from '@/components/page-header';

export const dynamic = 'force-dynamic';

export default async function BannerCampaignNewPage() {
  const [libImages, events] = await Promise.all([getImageLibrary(), getEventOptions()]);
  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader
        trail={['전시관리', '배너 캠페인 관리', '배너 캠페인 등록']}
        title="배너 캠페인 등록"
      />
      <BannerForm mode="new" action={createBannerCampaign} libImages={libImages} events={events} />
    </div>
  );
}
