'use client';

/**
 * AI Communicator 우측 레일.
 * 기본엔 표시하지 않고, 페이지(예: 배너 등록의 어시스턴트)가 콘텐츠를 꽂았을 때만 우측에 나타난다.
 * 닫기는 꽂은 콘텐츠(어시스턴트)의 자체 X가 담당한다 → 닫으면 content가 비고 레일이 사라진다.
 */
export function AiCommunicatorRail({ content }: { content?: React.ReactNode }) {
  if (!content) return null;
  return (
    <aside className="flex w-[360px] shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="min-h-0 flex-1">{content}</div>
    </aside>
  );
}
