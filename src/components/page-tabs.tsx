'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * 페이지 상단 탭 — 전 메뉴 공통 단일 규격 (2026-10-08 사용자 지정).
 *   제목 구분선 → 20px → 탭(14px/600 · 패딩 12·16 · 활성만 하단 2px 브랜드선) → 24px → 본문
 * 페이지마다 다른 탭을 만들지 말 것. 링크형/버튼형 둘 다 이 컴포넌트를 쓴다.
 */
export type PageTab = { key: string; label: string; href?: string; count?: number };

const TAB_CLS = '-mb-px shrink-0 whitespace-nowrap border-b-2 px-4 py-3 text-[14px] font-semibold transition';
const ON = 'border-[var(--ac)] text-[var(--ac)]';
const OFF = 'border-transparent text-[var(--ink3)] hover:text-[var(--ink2)]';

export function PageTabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: PageTab[];
  /** 활성 탭 key. 링크형은 현재 경로로 판정해 넘긴다. */
  value: string;
  /** 버튼형일 때만. 링크형(tab.href)은 생략. */
  onChange?: (key: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('mt-5 flex gap-1 overflow-x-auto border-b border-[var(--line)]', className)} role="tablist">
      {tabs.map((t) => {
        const active = t.key === value;
        const body = (
          <>
            {t.label}
            {t.count !== undefined && (
              <span className={cn('ml-1.5 text-[13px] font-semibold tabular-nums', active ? 'text-[var(--ac)]' : 'text-[var(--ink3)]')}>
                {t.count}
              </span>
            )}
          </>
        );
        return t.href ? (
          <Link key={t.key} href={t.href} aria-current={active ? 'page' : undefined} className={cn(TAB_CLS, active ? ON : OFF)}>
            {body}
          </Link>
        ) : (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(t.key)}
            className={cn(TAB_CLS, active ? ON : OFF)}
          >
            {body}
          </button>
        );
      })}
    </div>
  );
}
