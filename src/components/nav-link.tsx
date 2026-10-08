'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

// NC-Channel Product Admin LNB 항목 규격 (.lnb .it)
//  기본 var(--ink2) · hover #e4e6ef · 활성 흰 배경 + var(--ac) 볼드 + 옅은 그림자.
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
  alsoActiveFor?: string[];
  badge?: string;
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
        'flex items-center gap-2 rounded-[9px] py-[9px] text-[13px] transition-colors',
        collapsed ? 'justify-center px-2' : 'px-3',
        active
          ? 'bg-white font-bold text-[var(--ac)] shadow-[0_1px_2px_rgba(25,25,60,.07)]'
          : 'text-[var(--ink2)] hover:bg-[#e4e6ef]',
      )}
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
      {!collapsed && badge && (
        <span className="ml-auto shrink-0 rounded-full border border-[var(--warnln)] bg-[var(--warnbg)] px-1.5 py-px text-[10px] font-semibold text-[var(--warn)]">
          {badge}
        </span>
      )}
    </Link>
  );
}
