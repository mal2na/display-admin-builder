'use client';

import { usePathname } from 'next/navigation';
import { PageTabs } from '@/components/page-tabs';

// App 스플래시 상단 탭 — 최신버전 / 변경·승인이력. 규격은 공용 PageTabs 한 곳에서 관리.
export function SplashTabs() {
  const path = usePathname() ?? '';
  const onHistory = path.startsWith('/admin/app-splash/history');
  return (
    <PageTabs
      tabs={[
        { key: 'latest', label: '최신버전', href: '/admin/app-splash' },
        { key: 'history', label: '변경/승인이력', href: '/admin/app-splash/history' },
      ]}
      value={onHistory ? 'history' : 'latest'}
    />
  );
}
