'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Plus, Bookmark } from 'lucide-react';
import { ContainerListModal, type ContainerListRow } from '@/components/container-list-modal';

/**
 * 컨테이너 목록 — 좌측 트리.
 *   헤더(제목 + 총 건수 · 전체 목록/등록) → 그룹(Container: 캐럿 · 이름 · '템플릿 N건' 뱃지)
 *   → 잎(Template: 기본은 북마크 · 이름, 행 구분선) 플랫 리스트(divide-y).
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

export function ContainerTree({
  containers,
  allRows = [],
  linkContainerTpl = '/admin/containers/{id}',
  linkTemplateTpl = '/admin/templates/{id}/builder',
  newHref = '/admin/containers/new',
}: {
  containers: TreeContainer[];
  allRows?: ContainerListRow[];
  /** 컨테이너/템플릿/등록 링크 템플릿({id} 치환) — 전시화면 관리(테스트)가 자기 라우트로 재사용하기 위해 오버라이드. 서버→클라이언트 전달이라 함수 대신 문자열. */
  linkContainerTpl?: string;
  linkTemplateTpl?: string;
  newHref?: string;
}) {
  const pathname = usePathname();
  const linkContainer = (id: string) => linkContainerTpl.replace('{id}', id);
  const linkTemplate = (id: string) => linkTemplateTpl.replace('{id}', id);
  // 활성 비교는 쿼리스트링을 떼고 경로만으로 — '?device=left' 같은 파라미터 무시
  const templatePathOf = (id: string) => linkTemplate(id).split('?')[0];
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [listOpen, setListOpen] = useState(false); // 전체목록 팝업(PG495)

  // 기본 펼침(true)이므로, 저장값이 없으면 현재는 펼침 상태 → 토글하면 접힘. (!prev[id]만 쓰면 첫 클릭이 안 접히는 버그)
  const toggle = (id: string) => setOpen((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));

  const totalTemplates = containers.reduce((n, c) => n + c.templates.length, 0);

  return (
    <div className="tree flex h-full w-72 shrink-0 flex-col overflow-hidden bg-white">
      {/* 헤더 — 제목 + 총 건수 · 전체 목록 / 등록 */}
      <div className="flex items-center gap-2 border-b border-[var(--line2)] px-3 py-3">
        <span className="whitespace-nowrap text-[14px] font-bold text-[var(--ink)]">컨테이너 목록</span>
        <span className="whitespace-nowrap text-[12px] text-[var(--ink3)]">총 <b className="text-[var(--ink2)]">{totalTemplates}</b>건</span>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setListOpen(true)}
            className="whitespace-nowrap rounded-[6px] border border-[var(--line3)] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[var(--ink2)] hover:border-[var(--ac)] hover:text-[var(--ac)]"
            title="컨테이너 전체목록"
          >
            전체 목록
          </button>
          <Link
            href={newHref}
            className="inline-flex items-center gap-0.5 whitespace-nowrap rounded-[6px] bg-[var(--ac)] px-2.5 py-1.5 text-[12px] font-semibold text-white hover:bg-[var(--ac-h)]"
          >
            <Plus className="h-3.5 w-3.5" /> 등록
          </Link>
        </div>
      </div>
      {listOpen && <ContainerListModal rows={allRows} onClose={() => setListOpen(false)} />}

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {containers.length === 0 ? (
          <p className="px-2 py-6 text-center text-[12px] text-[var(--ink3)]">등록된 Container가 없습니다.</p>
        ) : (
          <div className="divide-y divide-[var(--line2)] border-y border-[var(--line2)]">
            {containers.flatMap((c) => {
              const expanded = open[c.id] ?? true;
              const activeContainer = pathname === linkContainer(c.id);
              const rows: React.ReactNode[] = [
                // 그룹 헤더 — 행 전체를 누르면 접기/펼치기(큰 히트 영역). 이름만 상세로 이동(클릭 전파 차단). 색 하이라이트 없음(2026-10-16 사용자 요청).
                <div
                  key={`g-${c.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggle(c.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(c.id); } }}
                  aria-expanded={expanded}
                  className="flex cursor-pointer items-center gap-1.5 px-3 py-2.5 hover:bg-[#f8f9fb]"
                >
                  <span className="w-3 shrink-0 text-center text-[11px] leading-none text-[var(--ink3)]" aria-hidden>
                    {expanded ? '▾' : '▸'}
                  </span>
                  <Link
                    href={linkContainer(c.id)}
                    onClick={(e) => e.stopPropagation()}
                    className={cn('min-w-0 flex-1 truncate text-[13.5px] font-bold text-[var(--ink)] hover:text-[var(--ac)] hover:underline', activeContainer && 'text-[var(--ac)]')}
                  >
                    {c.name}
                  </Link>
                  <span className="ml-1 shrink-0 rounded-full bg-[#eef0f6] px-2 py-0.5 text-[11px] font-semibold text-[var(--ink2)]">
                    템플릿 {c.templates.length}건
                  </span>
                </div>,
              ];
              if (expanded) {
                if (c.templates.length === 0) {
                  rows.push(
                    <p key={`e-${c.id}`} className="py-2.5 text-center text-[12px] text-[var(--ink3)]">
                      Template 없음
                    </p>,
                  );
                }
                c.templates.forEach((t, ti) => {
                  const active = pathname.startsWith(templatePathOf(t.id));
                  const lastLeaf = ti === c.templates.length - 1;
                  rows.push(
                    // 잎(템플릿) — 컨테이너 아래로 들여쓰기(트리) + 분기 가이드. 기본은 북마크. 클릭 시 빌더.
                    <Link
                      key={`t-${t.id}`}
                      href={linkTemplate(t.id)}
                      className={cn(
                        'flex items-center gap-1.5 py-2.5 pl-4 pr-3 text-[13px] text-[var(--ink2)] hover:bg-[#f8f9fb]',
                        active && 'bg-[#f1f2ff] font-semibold text-[var(--ac)]',
                      )}
                      title={t.conditionGroup}
                    >
                      {/* 트리 분기 가이드 — 세로선 + 현재 노드 커넥터(마지막은 └, 그 외 ├) */}
                      <span className="relative flex h-[18px] w-3 shrink-0 justify-center" aria-hidden>
                        <span className={cn('absolute left-1/2 top-0 w-px -translate-x-1/2 bg-[var(--line2,#dce0e5)]', lastLeaf ? 'h-[9px]' : 'h-full')} />
                        <span className="absolute left-1/2 top-[9px] h-px w-1.5 bg-[var(--line2,#dce0e5)]" />
                      </span>
                      {t.isDefault && <Bookmark className="h-3.5 w-3.5 shrink-0 fill-[var(--ac)] text-[var(--ac)]" />}
                      <span className="truncate">{t.name}</span>
                    </Link>,
                  );
                });
              }
              return rows;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
