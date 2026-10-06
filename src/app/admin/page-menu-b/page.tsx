// 전체페이지 관리 — 채널의 전체 페이지(=Container) 원장·IA 트리. 메뉴 관리는 빌더로 이관(2026-10-06).
import { PageMenuEmbed } from './embed';

export const dynamic = 'force-dynamic';

export default function PageMenuOpsPage() {
  return <PageMenuEmbed title="전체페이지 관리" />;
}
