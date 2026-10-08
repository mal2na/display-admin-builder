'use client';

import { NavLink } from '@/components/nav-link';
import { MonitorSmartphone, LayoutGrid, Ticket, MessageSquareText, MessagesSquare, AppWindow, ImagePlay, SmartphoneNfc, GalleryHorizontalEnd, Workflow, FolderTree, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';

// 좌측 사이드바 — NC-Channel Product Admin LNB 규격. 폭 236px, 라벤더 var(--bg) 배경.
// 접기 상태는 AdminShell이 소유하고 prop으로 내려준다.
export function AdminSidebar({ collapsed }: { collapsed: boolean }) {
  return (
    <aside className={cn('flex shrink-0 flex-col bg-[var(--bg)] transition-[width] duration-200', collapsed ? 'w-14' : 'w-[236px]')}>
      <nav className="flex flex-1 flex-col gap-1 px-[14px] pb-6 pt-[14px]">
        {/* 구조도 — 전체 구조를 먼저 설명하기 위해 최상단에 배치 */}
        <NavLink href="/admin/structure" icon={<Workflow className="h-4 w-4" />} label="구조도" collapsed={collapsed} />

        {/* 전시 관리 */}
        {collapsed ? <div className="my-1 h-px bg-[#dcdfe8]" /> : <p className="px-[10px] pb-1 pt-4 text-[12px] font-medium text-[var(--ink3)]">전시 관리</p>}
        <NavLink href="/admin/containers" icon={<MonitorSmartphone className="h-4 w-4" />} label="전시화면 관리" collapsed={collapsed} />
        <NavLink href="/admin/corner-types" icon={<LayoutGrid className="h-4 w-4" />} label="코너 유형 관리" collapsed={collapsed} />
        <NavLink href="/admin/banner-campaigns" icon={<GalleryHorizontalEnd className="h-4 w-4" />} label="배너 캠페인 관리" collapsed={collapsed} />
        <NavLink href="/admin/messages" icon={<MessageSquareText className="h-4 w-4" />} label="문구 관리" collapsed={collapsed} badge="테스트" />

        {/* 프로모션 관리 */}
        {collapsed ? <div className="my-1 h-px bg-[#dcdfe8]" /> : <p className="px-[10px] pb-1 pt-4 text-[12px] font-medium text-[var(--ink3)]">프로모션 관리</p>}
        <NavLink href="/admin/events" icon={<Ticket className="h-4 w-4" />} label="프로모션 관리" collapsed={collapsed} />

        {/* 운영 관리 */}
        {collapsed ? <div className="my-1 h-px bg-[#dcdfe8]" /> : <p className="px-[10px] pb-1 pt-4 text-[12px] font-medium text-[var(--ink3)]">운영 관리</p>}
        <NavLink href="/admin/comments" icon={<MessagesSquare className="h-4 w-4" />} label="댓글·리뷰 관리" collapsed={collapsed} />
        {/* 메뉴 관리는 빌더로 이관 → '전체페이지 관리'로 통합. 페이지 개발 설정은 페이지 상세의 '개발설정' 탭으로 흡수(2026-10-06). */}
        {/* 순서: 전체페이지 → App 버전 → App 스플래시 → App 위젯 (2026-10-07 사용자 요청) */}
        <NavLink href="/admin/page-menu-b" icon={<FolderTree className="h-4 w-4" />} label="전체페이지 관리" collapsed={collapsed} />
        <NavLink href="/admin/app-versions" icon={<SmartphoneNfc className="h-4 w-4" />} label="App 버전 관리" collapsed={collapsed} />
        <NavLink href="/admin/app-splash" icon={<ImagePlay className="h-4 w-4" />} label="App 스플래시 관리" collapsed={collapsed} />
        <NavLink href="/admin/app-widgets" icon={<AppWindow className="h-4 w-4" />} label="App 위젯 관리" collapsed={collapsed} alsoActiveFor={['/admin/widget-types']} />

        {/* 백업 — 코너 유형 관리 개편 직전 스냅샷(2026-10-06). 제일 하단에 분리 배치. */}
        <div className="mt-auto" />
        {collapsed ? <div className="my-1 h-px bg-[#dcdfe8]" /> : <p className="px-[10px] pb-1 pt-4 text-[12px] font-medium text-[var(--ink3)]">백업</p>}
        <NavLink href="/admin/corner-types-backup" icon={<Archive className="h-4 w-4" />} label="코너 유형 관리 (백업)" collapsed={collapsed} />
      </nav>

      <div className="border-t border-[#dcdfe8] p-3 text-center text-[12px] text-[var(--ink3)]">{collapsed ? 'v0.31' : 'POL-DSP v0.31'}</div>
    </aside>
  );
}
