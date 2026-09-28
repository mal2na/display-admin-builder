'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

// App 위젯 상세 탭 — 상세정보 / 변경·승인이력
export function WidgetDetailTabs({ id }: { id: string }) {
  const path = usePathname();
  const onHistory = path.endsWith('/history');
  const tab = (href: string, label: string, active: boolean) => (
    <Link href={href} className={cn('-mb-px border-b-2 pb-2 text-sm', active ? 'border-indigo-600 font-semibold text-indigo-700' : 'border-transparent text-muted-foreground hover:text-slate-700')}>
      {label}
    </Link>
  );
  return (
    <div className="mb-5 flex gap-5 border-b">
      {tab(`/admin/app-widgets/${id}`, '상세정보', !onHistory)}
      {tab(`/admin/app-widgets/${id}/history`, '변경/승인이력', onHistory)}
    </div>
  );
}
