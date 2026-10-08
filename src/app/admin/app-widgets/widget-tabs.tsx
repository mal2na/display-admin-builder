'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

// App 위젯 관리 상단 탭 — App 위젯 관리 / 위젯 유형 관리 (한 페이지 통합)
export function WidgetTabs() {
  const path = usePathname();
  const onTypes = path.startsWith('/admin/widget-types');
  const tab = (href: string, label: string, active: boolean) => (
    <Link href={href} className={cn('-mb-px border-b-2 px-4 py-2.5 text-[14px] font-semibold', active ? 'border-[#3a2fd8] text-[#3a2fd8]' : 'border-transparent text-slate-500 hover:text-slate-700')}>
      {label}
    </Link>
  );
  return (
    <div className="mt-5 mb-1 flex gap-1 border-b border-[var(--line)]">
      {tab('/admin/app-widgets', 'App 위젯 관리', !onTypes)}
      {tab('/admin/widget-types', '위젯 유형 관리', onTypes)}
    </div>
  );
}
