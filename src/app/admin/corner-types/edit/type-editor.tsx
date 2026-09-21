'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cornerTypeChipClass } from '@/lib/display-taxonomy';
import { CornerTypeForm, EMPTY_CORNER_TYPE, type CornerTypeRow, type BuiltCornerOption, type RegisteredCombo } from '../corner-type-manager';
import { saveCornerTypeBulk } from '../actions';

// 유형 수정 — 원본 풀 편집 폼(CornerTypeForm)을 'bulk' 모드로. ② 배열·레이아웃 다중 선택 + 한 번 저장(공통 적용).
export function TypeVariationsEditor({ base, variations, builtOptions, registered }: {
  base: string;
  variations: CornerTypeRow[];
  builtOptions: BuiltCornerOption[];
  registered: RegisteredCombo[];
}) {
  const router = useRouter();
  const back = () => router.push(`/admin/corner-types/group?base=${encodeURIComponent(base)}`);
  const seed = variations[0] ?? { ...EMPTY_CORNER_TYPE, baseCategory: base };
  const arrays = variations.map((v) => v.typeDetail ?? '').filter(Boolean);

  return (
    <div className="space-y-4">
      <nav className="text-[12px] text-muted-foreground">홈 › 전시관리 › 코너 유형 관리 › {base} › 유형 수정</nav>
      <div className="flex items-center gap-2">
        <button type="button" onClick={back} className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-slate-700"><ChevronLeft className="h-3.5 w-3.5" />코너 유형 상세</button>
        <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-[15px] font-bold', cornerTypeChipClass(base))}>{base}</span>
        <h1 className="text-2xl font-bold">유형 수정</h1>
      </div>
      <p className="-mt-1 text-[13px] text-muted-foreground">② <b className="text-slate-700">배열·레이아웃</b>에서 이 유형이 가질 배열(가로/세로/그리드)을 다중 선택하면, 아래 설정·컴포넌트 조합이 <b className="text-slate-700">한 번에</b> 전부 적용됩니다.</p>

      <CornerTypeForm
        row={seed}
        builtOptions={builtOptions}
        registered={registered}
        bulk
        bulkArrays={arrays}
        submitAction={saveCornerTypeBulk.bind(null, base)}
        onClose={back}
      />
    </div>
  );
}
