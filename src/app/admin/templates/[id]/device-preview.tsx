import { DeviceFrame, CornerBlock } from '@/components/preview/blocks';
export type { PreviewAtom, PreviewComponent, PreviewCorner } from '@/components/preview/blocks';
import type { PreviewCorner } from '@/components/preview/blocks';

export function DevicePreview({ corners, headerLabel }: { corners: PreviewCorner[]; headerLabel: string }) {
  return (
    <div className="mx-auto">
      <DeviceFrame width={390} bodyHeight={560} headerLabel={headerLabel}>
        {corners.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-400">
            왼쪽에서 Corner를 추가하세요
          </div>
        ) : (
          corners.map((c) => <CornerBlock key={c.id} corner={c} />)
        )}
      </DeviceFrame>
    </div>
  );
}
