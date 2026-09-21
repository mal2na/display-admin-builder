'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

// App 위젯 관리 상단 탭 — App 위젯 관리 / 위젯 유형 관리 (한 페이지 통합)
export function WidgetTabs() {
  const path = usePathname();
  const onTypes = path.startsWith('/admin/widget-types');
  const tab = (href: string, label: string, active: boolean) => (
    <Link href={href} className={cn('-mb-px border-b-2 pb-2 text-sm', active ? 'border-indigo-600 font-semibold text-indigo-700' : 'border-transparent text-muted-foreground hover:text-slate-700')}>
      {label}
    </Link>
  );
  return (
    <div className="mb-5 flex gap-5 border-b">
      {tab('/admin/app-widgets', 'App 위젯 관리', !onTypes)}
      {tab('/admin/widget-types', '위젯 유형 관리', onTypes)}
    </div>
  );
}
