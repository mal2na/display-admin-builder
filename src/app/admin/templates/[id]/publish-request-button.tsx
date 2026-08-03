'use client';

import { useState, useTransition } from 'react';
import { Send, AlertTriangle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { requestReview, type ReviewIssue } from './workflow-actions';

export function PublishRequestButton({ templateId }: { templateId: string }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string; issues?: ReviewIssue[] } | null>(null);

  const onClick = () =>
    start(async () => {
      try {
        const r = await requestReview(templateId);
        if (!r.ok) setMsg({ kind: 'error', text: `승인 요청 불가 — 필수값 ${r.issues.length}건 누락`, issues: r.issues });
        else setMsg({ kind: 'ok', text: '승인 요청 완료' });
      } catch (e) {
        setMsg({ kind: 'error', text: (e as Error)?.message || '승인 요청 중 오류가 발생했습니다.' });
      }
      setOpen(true);
    });

  return (
    <div className="relative ml-auto">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        <Send className="h-3.5 w-3.5" /> {pending ? '요청 중…' : '승인 요청'}
      </button>
      {open && msg && (
        <div className="absolute right-0 top-full z-40 mt-1 w-72 rounded-md border bg-card p-2.5 text-xs shadow-lg">
          <div className={cn('flex items-center gap-1 font-semibold', msg.kind === 'error' ? 'text-rose-600' : 'text-emerald-600')}>
            {msg.kind === 'error' ? <AlertTriangle className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />} {msg.text}
          </div>
          {msg.issues && msg.issues.length > 0 && (
            <ul className="mt-1.5 space-y-1 text-muted-foreground">
              {msg.issues.map((it, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="rounded bg-muted px-1 font-medium text-foreground">{it.field}</span>
                  <span>{it.corner !== '-' ? `[${it.corner}] ` : ''}{it.detail}</span>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => setOpen(false)} className="mt-1.5 text-[10px] text-muted-foreground hover:underline">
            닫기
          </button>
        </div>
      )}
    </div>
  );
}
