import { getBuiltCornerOptions, getRegisteredCombos } from '../built-options';
import { NewCornerType } from './new-corner-type';

export const dynamic = 'force-dynamic';

export default async function NewCornerTypePage() {
  const [builtOptions, registered] = await Promise.all([getBuiltCornerOptions(), getRegisteredCombos()]);
  return (
    <div className="p-6">
      <NewCornerType builtOptions={builtOptions} registered={registered} />
    </div>
  );
}
