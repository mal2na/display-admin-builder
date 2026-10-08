import * as React from 'react';
import { cn } from '@/lib/utils';

// NC-Channel Product Admin 테이블 규격 (.tbl) — 각진 모서리, 윗선 1px, 행 구분선, 헤더 회색.
export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn(
          'w-full border-collapse border-t border-[var(--line2)] text-[13px]',
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('bg-[var(--th)]', className)} {...props} />;
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('border-b border-[var(--line)] transition-colors hover:bg-[#f8f9fb]', className)}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'whitespace-nowrap border-b border-[var(--line)] bg-[var(--th)] px-[10px] py-3 text-center align-middle font-semibold text-[var(--ink2)]',
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn('px-[10px] py-3 text-center align-middle text-[var(--ink)]', className)}
      {...props}
    />
  );
}
