'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PencilRuler, Copy, MoreVertical, Archive } from 'lucide-react';
import { archiveTemplate } from '@/app/admin/templates/actions';

/**
 * 매핑 템플릿 정보 표의 "관리" 열 액션.
 * 빌더 헤더 ⋯ 메뉴와 동일한 보관(soft-delete) UX·가드를 혜택 홈 안으로 인-컨텍스트로 가져온다.
 * - 벌거벗은 삭제 버튼 대신 ⋯ → 확인 팝오버(2스텝)로 오클릭 방지.
 * - archiveBlockReason이 있으면(기본/게시중/유일 템플릿) 보관 대신 차단 사유 표시.
 */
export function TemplateRowActions({
  templateId,
  builderHref,
  duplicateAction,
  archiveBlockReason,
}: {
  templateId: string;
  builderHref: string;
  duplicateAction: () => void;
  archiveBlockReason: string | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="flex justify-end gap-2">
      <Link href={builderHref}>
        <Button size="sm" variant="secondary">
          <PencilRuler className="h-3.5 w-3.5" /> 빌더
        </Button>
      </Link>
      <form action={duplicateAction}>
        <Button type="submit" size="sm" variant="outline">
          <Copy className="h-3.5 w-3.5" /> 복사
        </Button>
      </form>

      {/* ⋯ 메뉴 — 템플릿(매핑) 보관 (빌더 ⋯ 메뉴와 동일 UX) */}
      <div className="relative">
        <button
          type="button"
          onClick={() => { setMenuOpen((o) => !o); setConfirm(false); }}
          className={cn('inline-flex h-8 items-center rounded-md border px-1.5 hover:bg-secondary', menuOpen && 'bg-secondary')}
          title="더보기"
          aria-label="템플릿 관리 메뉴"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => { setMenuOpen(false); setConfirm(false); }} />
            <div className="absolute right-0 top-full z-30 mt-1 w-64 rounded-md border bg-card p-1.5 text-left shadow-lg">
              {archiveBlockReason ? (
                <div className="px-2 py-2">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Archive className="h-3.5 w-3.5" /> 이 템플릿(매핑) 보관
                  </p>
                  <p className="mt-1 text-[11px] text-destructive">{archiveBlockReason}</p>
                </div>
              ) : confirm ? (
                <div className="px-2 py-2">
                  <p className="text-xs font-medium">이 템플릿을 보관할까요?</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    목록에서 숨겨지며, 아래 “보관된 템플릿”에서 언제든 복구할 수 있어요.
                  </p>
                  <div className="mt-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); start(() => archiveTemplate(templateId)); }}
                      disabled={pending}
                      className="inline-flex items-center gap-0.5 rounded-md border border-primary bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground disabled:opacity-50"
                    >
                      <Archive className="h-3 w-3" /> 보관
                    </button>
                    <button type="button" onClick={() => setConfirm(false)} className="rounded-md border px-2 py-0.5 text-[11px]">
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirm(true)}
                  className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-medium text-destructive hover:bg-destructive/10"
                >
                  <Archive className="h-3.5 w-3.5" /> 이 템플릿(매핑) 보관
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
