'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, Box, Plus, Star } from 'lucide-react';

export type TreeTemplate = {
  id: string;
  name: string;
  conditionGroup: string;
  isDefault: boolean;
  status: string;
};
export type TreeContainer = {
  id: string;
  name: string;
  status: string;
  templates: TreeTemplate[];
};

export function ContainerTree({ containers }: { containers: TreeContainer[] }) {
  const pathname = usePathname();
  // 명시적 토글 상태만 보관(미토글이면 활성 컨테이너는 자동 펼침)
  const [open, setOpen] = useState<Record<string, boolean>>({});

  function toggle(id: string) {
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="flex h-full w-72 shrink-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex h-14 items-center justify-between border-b px-3">
        <span className="text-sm font-semibold">컨테이너 목록</span>
        <Link
          href="/admin/containers/new"
          className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" /> 새 Container
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {containers.length === 0 && (
          <p className="p-4 text-center text-xs text-muted-foreground">등록된 Container가 없습니다.</p>
        )}
        {containers.map((c) => {
          const onThisContainer =
            pathname.startsWith(`/admin/containers/${c.id}`) ||
            c.templates.some((t) => pathname.startsWith(`/admin/templates/${t.id}`));
          // 명시적으로 토글했으면 그 값, 아니면 활성 컨테이너는 기본 펼침
          const expanded = open[c.id] ?? onThisContainer;
          const containerActive = pathname === `/admin/containers/${c.id}`;
          return (
            <div key={c.id} className="mb-0.5">
              <div
                className={cn(
                  'flex items-center gap-1 rounded-md px-1.5 py-1.5 text-sm',
                  containerActive ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/60',
                )}
              >
                <button
                  onClick={() => toggle(c.id)}
                  className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground"
                  aria-label={expanded ? '접기' : '펼치기'}
                >
                  {c.templates.length === 0 ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-border" />
                  ) : expanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                <Box className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Link href={`/admin/containers/${c.id}`} className="flex-1 truncate font-medium">
                  {c.name}
                </Link>
                <span
                  className={cn(
                    'h-1.5 w-1.5 shrink-0 rounded-full',
                    c.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300',
                  )}
                  title={c.status === 'active' ? '노출' : '비노출'}
                />
              </div>

              {expanded && (
                <div className="ml-6 border-l pl-2">
                  {c.templates.length === 0 && (
                    <p className="py-1 text-xs text-muted-foreground">Template 없음</p>
                  )}
                  {c.templates.map((t) => {
                    const tActive = pathname.startsWith(`/admin/templates/${t.id}`);
                    return (
                      <Link
                        key={t.id}
                        href={`/admin/templates/${t.id}/builder`}
                        className={cn(
                          'flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px]',
                          tActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                        )}
                      >
                        {t.isDefault && (
                          <Star className={cn('h-3 w-3 shrink-0', tActive ? 'fill-current' : 'fill-primary text-primary')} />
                        )}
                        <span className="flex-1 truncate">{t.name}</span>
                        <span className={cn('shrink-0 text-[11px]', tActive ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                          {t.conditionGroup}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
