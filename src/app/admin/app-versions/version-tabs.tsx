'use client';

import { usePathname } from 'next/navigation';
import { PageTabs } from '@/components/page-tabs';

// App 버전 관리 상단 탭 — 목록 / 변경·승인이력. 규격은 공용 PageTabs 한 곳에서 관리.
export function VersionTabs() {
  const path = usePathname() ?? '';
  const onHistory = path.startsWith('/admin/app-versions/history');
  return (
    <PageTabs
      tabs={[
        { key: 'list', label: 'App 버전 관리', href: '/admin/app-versions' },
        { key: 'history', label: '변경/승인이력', href: '/admin/app-versions/history' },
      ]}
      value={onHistory ? 'history' : 'list'}
    />
  );
}
