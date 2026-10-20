// 전시화면 관리 (테스트) — 목록(먼저 뜨는 화면). 컨테이너·템플릿을 보여주고,
//  템플릿 행을 누르면 상세 빌더(/admin/containers-test/[templateId])로 들어간다(2026-10-20).
//  데이터는 실제 Container(혜택 홈·쇼핑 홈·마이 홈)에서 가져온다. 기존 전시화면 관리와 분리된 테스트.
import Link from 'next/link';
import { Bookmark, ChevronRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function ContainersTestListPage() {
  const containers = await prisma.container.findMany({
    where: { NOT: { containerType: 'PROMOTION' } },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      templates: {
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        select: { id: true, name: true, conditionGroup: true, isDefault: true },
      },
    },
  });
  const total = containers.reduce((n, c) => n + c.templates.length, 0);

  return (
    <div className="px-10 py-8 pb-24">
      <nav className="flex items-center gap-1.5 text-[14px] leading-[20px] text-[var(--ink3)]">
        <span>홈</span><span className="opacity-60">›</span><span>전시 관리</span>
        <span className="opacity-60">›</span><b className="text-[var(--ink)]">전시화면 관리 (테스트)</b>
      </nav>
      <div className="mt-2 flex items-center gap-2">
        <h1 className="text-[24px] font-bold leading-[32px] tracking-[-0.6px] text-[var(--ink)]">전시화면 관리 (테스트)</h1>
        <span className="rounded-full border border-[var(--warnln)] bg-[var(--warnbg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--warn)]">테스트</span>
      </div>
      <p className="mt-1 text-[14px] text-[var(--ink3)]">템플릿 행을 누르면 미리보기·코너 편집 상세로 들어갑니다.</p>

      <section className="mt-6 max-w-3xl rounded-[16px] border border-[var(--line)] bg-white p-6">
        <div className="mb-4 flex items-baseline gap-2">
          <h2 className="text-[16px] font-bold text-[var(--ink)]">컨테이너 목록</h2>
          <span className="text-[14px] text-[var(--ink3)]">총 {total}건</span>
        </div>

        <div className="divide-y divide-[var(--line)]">
          {containers.map((c) => (
            <div key={c.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between px-1 py-1.5">
                <span className="text-[14px] font-bold text-[var(--ink)]">{c.name}</span>
                <span className="rounded-[6px] bg-[var(--th)] px-2 py-0.5 text-[12px] font-medium text-[var(--ink3)]">템플릿 {c.templates.length}건</span>
              </div>
              <ul className="mt-1 space-y-1">
                {c.templates.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/admin/containers-test/${t.id}`}
                      className="group flex items-center gap-2.5 rounded-[10px] border border-transparent px-3 py-2.5 hover:border-[var(--line2)] hover:bg-[var(--ac2)]"
                    >
                      <Bookmark className={t.isDefault ? 'h-4 w-4 fill-[var(--ac)] text-[var(--ac)]' : 'h-4 w-4 text-[var(--ink4)]'} />
                      <span className="text-[14px] font-medium text-[var(--ink)]">{t.name}</span>
                      {t.conditionGroup && <span className="text-[13px] text-[var(--ink4)]">· {t.conditionGroup}</span>}
                      {t.isDefault && <span className="rounded-[4px] bg-[var(--ac2)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--ac)]">기본</span>}
                      <ChevronRight className="ml-auto h-4 w-4 text-[var(--ink4)] opacity-0 transition group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
