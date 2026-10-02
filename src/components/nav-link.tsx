'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function NavLink({
  href,
  icon,
  label,
  collapsed,
  alsoActiveFor,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  collapsed?: boolean;
  alsoActiveFor?: string[]; // 통합 메뉴: 다른 경로에서도 활성 표시
  badge?: string; // 라벨 옆 작은 태그(예: 테스트)
}) {
  const pathname = usePathname();
  const active =
    pathname === href ||
    pathname.startsWith(href + '/') ||
    (alsoActiveFor ?? []).some((p) => pathname === p || pathname.startsWith(p + '/'));
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        'flex items-center gap-2 rounded-md py-2 text-sm font-medium transition-colors',
        collapsed ? 'justify-center px-2' : 'px-3',
        active
          ? 'bg-white font-semibold text-primary shadow-sm'
          : 'text-foreground/70 hover:bg-white/70 hover:text-foreground',
      )}
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
      {!collapsed && badge && (
        <span className="ml-auto shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">{badge}</span>
      )}
    </Link>
  );
}
