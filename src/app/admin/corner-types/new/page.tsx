import { getBuiltCornerOptions, getRegisteredCombos, getBannerCampaignOptions } from '../built-options';
import { NewCornerType } from './new-corner-type';

export const dynamic = 'force-dynamic';

export default async function NewCornerTypePage() {
  const [builtOptions, registered, bannerCampaigns] = await Promise.all([getBuiltCornerOptions(), getRegisteredCombos(), getBannerCampaignOptions()]);
  return (
    <div className="p-6">
      <NewCornerType builtOptions={builtOptions} registered={registered} bannerCampaigns={bannerCampaigns} />
    </div>
  );
}
