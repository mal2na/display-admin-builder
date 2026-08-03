'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import {
  CornerTypeForm,
  EMPTY_CORNER_TYPE,
  type BuiltCornerOption,
  type CornerTypeRow,
} from '../corner-type-manager';

/**
 * 코너 유형 등록 — 별도 페이지(/admin/corner-types/new).
 * 목록 위 인라인 폼이 아니라 독립 페이지라, 하단에 기존 코너 유형 목록이 보이지 않는다.
 */
export function NewCornerType({ builtOptions }: { builtOptions: BuiltCornerOption[] }) {
  const router = useRouter();
  const noneBuilt = builtOptions.length === 0;
  // 등록 시작값: 첫 번째로 만들어진 코너 유형으로 초기화
  const createRow: CornerTypeRow = {
    ...EMPTY_CORNER_TYPE,
    baseCategory: builtOptions[0]?.cornerType ?? EMPTY_CORNER_TYPE.baseCategory,
    typeDetail: null,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/corner-types"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ChevronLeft className="h-4 w-4" /> 코너 유형 관리
        </Link>
        <div className="h-4 w-px bg-border" />
        <h1 className="text-lg font-semibold">코너 유형 등록</h1>
      </div>

      {noneBuilt ? (
        <div className="rounded-md border border-dashed bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          전시화면관리(빌더)에서 만들어진 코너가 없어 등록할 수 있는 코너 유형이 없습니다. 먼저 전시화면에서 코너를 구성해 주세요.
        </div>
      ) : (
        <CornerTypeForm
          row={createRow}
          builtOptions={builtOptions}
          onClose={() => router.push('/admin/corner-types')}
        />
      )}
    </div>
  );
}
