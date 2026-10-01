export const dynamic = 'force-dynamic';

// 프로모션 관리 — 리뷰 반영 프로토타입(정적)을 그대로 embed.
//  프로토타입(목록·등록 wizard·상세·초대자 화면)은 자체 완결형 SPA(단일 HTML, 인라인 CSS/JS)라
//  public/promotion-prototype.html 을 iframe으로 그대로 렌더한다(프로젝트 Tailwind와 격리).
//  ※ 원본: https://prototype-promotion-black.vercel.app/  (2026-10-01 교체)
export default function EventsPage() {
  return (
    <iframe
      src="/promotion-prototype.html"
      title="프로모션 관리"
      className="h-full w-full border-0 bg-[#eef0f6]"
    />
  );
}
