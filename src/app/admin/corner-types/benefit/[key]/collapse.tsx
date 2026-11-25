'use client';
// 코너 유형 상세 섹션용 접기(Collapse) 카드 — 메타 태그 정보(SEO/GEO) 예시 스타일(2026-11-24 사용자 요청).
//  헤더(타이틀 + 힌트 + 선택 배지 + 쉐브론) 클릭으로 펼침/접힘. 기본 펼침. DS 콜랩스 토큰(r16·border #dce0e5·포커스 #3617ce).
import { useState } from 'react';
import { ChevronUp } from 'lucide-react';

export function Collapse({ title, hint, badge, defaultOpen = true, children }: {
  title: string; hint?: string; badge?: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-[16px] border border-[#dce0e5] bg-white">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-5 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3617ce]">
        <span className="text-[16px] font-bold text-[#1a1a1a]">{title}</span>
        {badge && <span className="rounded-md bg-[#fff2e0] px-2 py-0.5 text-[12px] font-bold text-[#C2660C]">{badge}</span>}
        {hint && <span className="truncate text-[12px] text-[#8b949e]">{hint}</span>}
        <ChevronUp className={`ml-auto h-5 w-5 shrink-0 text-[#8b949e] transition-transform ${open ? '' : 'rotate-180'}`} />
      </button>
      {open && <div className="border-t border-[#f1f3f5]">{children}</div>}
    </div>
  );
}
