// 이벤트 빌더는 자체 레이아웃(대시보드 셸 / 에디터 3-pane)을 각 페이지가 직접 구성한다.
export const dynamic = 'force-dynamic';

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
