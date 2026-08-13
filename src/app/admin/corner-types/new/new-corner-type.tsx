'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import {
  CornerTypeForm,
  EMPTY_CORNER_TYPE,
  type BuiltCornerOption,
  type RegisteredCombo,
  type CornerTypeRow,
} from '../corner-type-manager';

/**
 * 코너 유형 등록 — 별도 페이지(/admin/corner-types/new).
 * 목록 위 인라인 폼이 아니라 독립 페이지라, 하단에 기존 코너 유형 목록이 보이지 않는다.
 */
export function NewCornerType({ builtOptions, registered = [] }: { builtOptions: BuiltCornerOption[]; registered?: RegisteredCombo[] }) {
  const router = useRouter();
  // 등록 시작값: 정책 8종 중 첫 번째(상품형)로 초기화
  const createRow: CornerTypeRow = {
    ...EMPTY_CORNER_TYPE,
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

      <CornerTypeForm
        row={createRow}
        builtOptions={builtOptions}
        registered={registered}
        onClose={() => router.push('/admin/corner-types')}
      />
    </div>
  );
}
