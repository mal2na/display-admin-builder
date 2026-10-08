'use client';

import Link from 'next/link';
import { User, Plus, ShieldCheck, X, ChevronDown, LayoutDashboard, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 상단 GNB 바 — 참고 화면(번호이동 관리.png) 헤더를 실제 색 그대로 재현. 모든 화면(빌더 포함)에 표시.
 * 바 배경 = 밝은 라벤더그레이(#ebeef6), 활성 고객 그룹 = t-blue(#3a2fd8) + 흰 탭 pill(완전 라운드), 나머지 = 흰 pill.
 * 좌측 ADMIN 브랜드 + 접기 토글 블록은 LNB 폭(w-56 / 접힘 w-14)과 동일하게 맞춰 경계를 정렬한다. 높이 56(h-14).
 */
export function AdminTopbar({ collapsed, onToggleSidebar }: { collapsed: boolean; onToggleSidebar: () => void }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 bg-[var(--bg)] pr-3 text-sm text-[var(--ink)]">
      {/* 브랜드 + 사이드바 토글 — LNB 영역과 동일 폭 */}
      <div className={cn('flex h-full shrink-0 items-center border-r border-[var(--line)]', collapsed ? 'w-14 justify-center' : 'w-[236px] gap-2 px-3')}>
        {!collapsed && (
          <Link href="/admin/containers" className="flex min-w-0 items-center gap-2 font-semibold">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <LayoutDashboard className="h-4 w-4" />
            </span>
            <span className="truncate tracking-wide">ADMIN</span>
          </Link>
        )}
        <button
          type="button"
          onClick={onToggleSidebar}
          title={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
          aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
          className={cn('rounded-md p-1.5 text-[var(--ink3)] hover:bg-white hover:text-[var(--ink)]', !collapsed && 'ml-auto')}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {/* 상담사 수 + 추가 (완전 라운드 pill) */}
      <button className="ml-1 flex items-center gap-2 rounded-full border border-[var(--line2)] bg-white px-3 py-1.5 hover:bg-white/70">
        <User className="h-4 w-4" />
        <span className="font-semibold">3</span>
        <ChevronDown className="h-3.5 w-3.5 text-[var(--ink3)]" />
      </button>
      <button className="rounded-full border border-[var(--line2)] bg-white p-2 hover:bg-white/70" aria-label="추가">
        <Plus className="h-4 w-4" />
      </button>

      {/* 활성 고객 그룹 (t-blue 컨테이너 + 흰 탭 pill) */}
      <div className="flex items-center gap-1 rounded-full bg-[var(--ac)] p-1 text-white">
        <div className="flex items-center gap-1.5 px-2.5 py-1">
          <ShieldCheck className="h-4 w-4" />
          <span className="font-medium">Name</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[var(--ink)]">
          <span className="font-medium">Menu1</span>
          <X className="h-3.5 w-3.5 text-[var(--ink3)]" />
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[var(--ink)]">
          <span className="font-medium">Menu2</span>
          <X className="h-3.5 w-3.5 text-[var(--ink3)]" />
        </div>
        <button className="rounded-full p-1.5 text-white/80 hover:bg-white/15" aria-label="탭 추가">
          <Plus className="h-4 w-4" />
        </button>
        <button className="rounded-full p-1.5 text-white/80 hover:bg-white/15" aria-label="닫기">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 두 번째 고객 그룹 (흰 pill) */}
      <div className="flex items-center gap-2 rounded-full border border-[var(--line2)] bg-white px-3 py-1.5">
        <ShieldCheck className="h-4 w-4 text-[var(--ac)]" />
        <span className="font-medium">Name</span>
        <span className="h-4 w-px bg-border" />
        <span className="text-[var(--ink3)]">Menu3</span>
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--ac2)] px-1 text-[11px] font-semibold text-[var(--ac)]">2</span>
        <button className="text-[var(--ink3)] hover:text-[var(--ink)]" aria-label="닫기">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 우측: 스케줄러 (흰 pill) */}
      <div className="ml-auto flex items-center gap-2 rounded-full border border-[var(--line2)] bg-white px-3 py-1.5">
        <span className="font-medium">Menu4</span>
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--ac2)] px-1 text-[11px] font-semibold text-[var(--ac)]">1</span>
        <button className="text-[var(--ink3)] hover:text-[var(--ink)]" aria-label="닫기">
          <X className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
