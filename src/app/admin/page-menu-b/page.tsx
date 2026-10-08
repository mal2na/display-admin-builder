// 전체페이지 관리 — 채널의 전체 페이지(=Container) 원장·IA 트리.
//  목업(public/page-menu-b.html) 을 React 로 이식해 iframe 을 걷어냈다(2026-10-08).
import { PageMenuAdmin } from './page-menu-admin';

export const dynamic = 'force-dynamic';

export default function PageMenuOpsPage() {
  return <PageMenuAdmin />;
}
