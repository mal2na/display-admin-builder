import { getBuiltCornerOptions } from '../built-options';
import { NewCornerType } from './new-corner-type';

export const dynamic = 'force-dynamic';

export default async function NewCornerTypePage() {
  const builtOptions = await getBuiltCornerOptions();
  return (
    <div className="p-6">
      <NewCornerType builtOptions={builtOptions} />
    </div>
  );
}
