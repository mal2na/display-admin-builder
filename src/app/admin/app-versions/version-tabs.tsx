'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

// App 버전 관리 상단 탭 — 목록(App 버전 관리) / 변경·승인이력 (전체 버전 통합)
export function VersionTabs() {
  const path = usePathname();
  const onHistory = path.startsWith('/admin/app-versions/history');
  const tab = (href: string, label: string, active: boolean) => (
    <Link href={href} className={cn('-mb-px border-b-2 pb-2 text-sm', active ? 'border-indigo-600 font-semibold text-indigo-700' : 'border-transparent text-muted-foreground hover:text-slate-700')}>
      {label}
    </Link>
  );
  return (
    <div className="mb-5 flex gap-5 border-b">
      {tab('/admin/app-versions', 'App 버전 관리', !onHistory)}
      {tab('/admin/app-versions/history', '변경/승인이력', onHistory)}
    </div>
  );
}
