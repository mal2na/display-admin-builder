'use client';

import { usePathname } from 'next/navigation';
import { PageTabs } from '@/components/page-tabs';

// App 위젯 관리 상단 탭 — App 위젯 관리 / 위젯 유형 관리. 규격은 공용 PageTabs 한 곳에서 관리.
export function WidgetTabs() {
  const path = usePathname() ?? '';
  const onTypes = path.startsWith('/admin/widget-types');
  return (
    <PageTabs
      tabs={[
        { key: 'widgets', label: 'App 위젯 관리', href: '/admin/app-widgets' },
        { key: 'types', label: '위젯 유형 관리', href: '/admin/widget-types' },
      ]}
      value={onTypes ? 'types' : 'widgets'}
    />
  );
}
