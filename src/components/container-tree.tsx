'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Plus, Search, Star } from 'lucide-react';

/**
 * 컨테이너 목록 — 참고 디자인(payment-merchant-product) 좌측 트리 규격.
 *   헤더 → 검색 → 그룹(Container: 이름 + Template 수) → 잎(Template: 점 · 이름 · 로그인 구분 · Corner 수)
 *   → 하단 요약. 클래스는 globals.css 의 .tree / .pg-h / .mer / .dot / .c / .unl 를 쓴다.
 */
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

// 전시 상태 → 점 색. 게시 중이면 초록, 작성/검수 중이면 주황, 그 외 회색.
function dotTone(status: string) {
  if (['active', 'published', 'live'].includes(status)) return 'ok';
  if (['draft', 'review', 'pending'].includes(status)) return 'warn';
  return 'gray';
}

export function ContainerTree({ containers }: { containers: TreeContainer[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState('');

  const toggle = (id: string) => setOpen((prev) => ({ ...prev, [id]: !prev[id] }));

  // 검색 — 컨테이너명 또는 템플릿명이 걸리면 노출(템플릿만 걸리면 그 컨테이너는 자동 펼침)
  const kw = q.trim().toLowerCase();
  const view = useMemo(() => {
    if (!kw) return containers.map((c) => ({ c, templates: c.templates, forced: false }));
    return containers
      .map((c) => {
        const hitSelf = c.name.toLowerCase().includes(kw);
        const hits = c.templates.filter((t) => t.name.toLowerCase().includes(kw));
        if (hitSelf) return { c, templates: c.templates, forced: true };
        if (hits.length) return { c, templates: hits, forced: true };
        return null;
      })
      .filter(Boolean) as { c: TreeContainer; templates: TreeTemplate[]; forced: boolean }[];
  }, [containers, kw]);

  const totalTemplates = containers.reduce((n, c) => n + c.templates.length, 0);
  const noTemplate = containers.filter((c) => c.templates.length === 0).length;

  return (
    <div className="tree flex h-full w-72 shrink-0 flex-col overflow-hidden bg-white">
      <div className="tree-h justify-between">
        <span className="text-[14px]">컨테이너 목록</span>
        <Link
          href="/admin/containers/new"
          className="inline-flex items-center gap-1 rounded-[6px] bg-[var(--ac)] px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-[var(--ac-h)]"
        >
          <Plus className="h-3.5 w-3.5" /> 새 Container
        </Link>
      </div>

      <div className="relative px-1.5">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink3)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="컨테이너명, 템플릿명 검색"
          className="inp !w-full !pl-8 text-[12.5px]"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-1.5">
        {view.length === 0 && (
          <p className="px-2 py-6 text-center text-[12px] text-[var(--ink3)]">
            {kw ? '검색 결과가 없습니다.' : '등록된 Container가 없습니다.'}
          </p>
        )}

        {view.map(({ c, templates, forced }) => {
          const onThisContainer =
            pathname.startsWith(`/admin/containers/${c.id}`) ||
            c.templates.some((t) => pathname.startsWith(`/admin/templates/${t.id}`));
          const expanded = forced || (open[c.id] ?? onThisContainer);

          return (
            <div key={c.id}>
              {/* 캐럿은 펼침, 이름은 컨테이너 상세로 이동 */}
              <div className={cn('pg-h text-[13px]', pathname === `/admin/containers/${c.id}` && 'bg-[var(--ac2)] text-[var(--ac)]')}>
                <button
                  type="button"
                  onClick={() => toggle(c.id)}
                  className="car shrink-0 cursor-pointer"
                  aria-label={expanded ? '접기' : '펼치기'}
                >
                  {expanded ? '▾' : '▸'}
                </button>
                <Link href={`/admin/containers/${c.id}`} className="min-w-0 flex-1 truncate">
                  {c.name}
                </Link>
                <span className="c">{c.templates.length}</span>
              </div>

              {expanded && (
                <>
                  {templates.length === 0 && (
                    <p className="py-1 pl-[22px] text-[11.5px] text-[var(--ink3)]">Template 없음</p>
                  )}
                  {templates.map((t) => {
                    const active = pathname.startsWith(`/admin/templates/${t.id}`);
                    return (
                      <Link
                        key={t.id}
                        href={`/admin/templates/${t.id}/builder`}
                        className={cn('mer text-[13px]', active && 'on')}
                      >
                        <span className={cn('dot', dotTone(t.status))} />
                        <span className="nm">
                          <span className="flex items-center gap-1">
                            {t.isDefault && <Star className="h-3 w-3 shrink-0 fill-[var(--ac)] text-[var(--ac)]" />}
                            {t.name}
                          </span>
                          <small>{t.conditionGroup}</small>
                        </span>
                      </Link>
                    );
                  })}
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="unl mx-1.5">
        Template {totalTemplates}개
        {noTemplate > 0 && <span className="text-[var(--ink3)]"> · Template 없는 Container {noTemplate}개</span>}
      </div>
    </div>
  );
}
