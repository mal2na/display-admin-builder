import { getBuiltCornerOptions, getRegisteredCombos, getBannerCampaignOptions, getProductOptions } from '../built-options';
import { NewCornerType } from './new-corner-type';

export const dynamic = 'force-dynamic';

export default async function NewCornerTypePage() {
  const [builtOptions, registered, bannerCampaigns, productOptions] = await Promise.all([getBuiltCornerOptions(), getRegisteredCombos(), getBannerCampaignOptions(), getProductOptions()]);
  return (
    <div className="px-8 py-6">
      <NewCornerType builtOptions={builtOptions} registered={registered} bannerCampaigns={bannerCampaigns} productOptions={productOptions} />
    </div>
  );
}
