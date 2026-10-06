// 전체페이지·메뉴 관리 (B안 통합 v3) 임베드 — 내부 LNB를 제거한 목업을 iframe으로 띄우고,
//  어드민 LNB가 뷰(ops=전체 페이지·메뉴 관리 / dev=페이지 개발 설정)를 URL 해시로 제어한다.
//  바깥 헤더는 두지 않는다 — 목업 내부에 이미 브레드크럼·타이틀·필터가 있어 이중이 되므로(2026-10-06 사용자 요청).
export function PageMenuEmbed({ view, title }: { view: 'ops' | 'dev'; title: string }) {
  const src = `/page-menu-b.html#${view}`;
  // key=view로 라우트 전환 시 iframe을 새로 마운트 → 해시 뷰가 확실히 반영.
  return (
    <iframe
      key={view}
      src={src}
      title={title}
      className="block h-[calc(100vh-56px)] w-full border-0 bg-white"
    />
  );
}
