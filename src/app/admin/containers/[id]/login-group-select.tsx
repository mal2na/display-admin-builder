'use client';

import { useTransition } from 'react';
import { cn } from '@/lib/utils';
import { setTemplateLogin } from '@/app/admin/templates/actions';

// 매핑 템플릿 정보 표의 '로그인 구분' 인라인 편집 — 로그인/비로그인 즉시 전환(setTemplateLogin).
//  분기 기준은 로그인 여부(로그인/비로그인)가 기본. 커스텀 조건 그룹 값이면 그대로 옵션에 포함해 표시.
const GROUPS = ['로그인', '비로그인'];

export function LoginGroupSelect({ templateId, value }: { templateId: string; value: string }) {
  const [pending, start] = useTransition();
  const opts = GROUPS.includes(value) ? GROUPS : [value, ...GROUPS];
  return (
    <select
      value={value}
      disabled={pending}
      onChange={(e) => { const v = e.target.value; if (v !== value) start(() => setTemplateLogin(templateId, v)); }}
      title="로그인 구분 변경"
      className={cn(
        'h-7 rounded-md border border-[var(--line3)] bg-white px-2 text-[12px] font-medium text-[var(--ink)] outline-none transition hover:border-[var(--ac)] focus:border-[var(--ac)] disabled:opacity-50',
      )}
    >
      {opts.map((g) => <option key={g} value={g}>{g}</option>)}
    </select>
  );
}
