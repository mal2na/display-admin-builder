// 전체페이지 관리 임베드 — 내부 LNB를 제거한 목업(public/page-menu-b.html)을 iframe으로 띄운다.
//  어드민 LNB가 좌측을 제공하므로 목업 내부 LNB는 제거했고, 바깥 헤더도 두지 않는다
//  (목업에 이미 브레드크럼·타이틀·필터가 있어 이중이 되므로). 메뉴 관리·페이지 개발 설정 뷰는 제거됨(2026-10-06).
export function PageMenuEmbed({ title }: { title: string }) {
  return (
    <iframe
      src="/page-menu-b.html"
      title={title}
      className="block h-[calc(100vh-56px)] w-full border-0 bg-white"
    />
  );
}
