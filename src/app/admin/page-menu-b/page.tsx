// 전체 페이지·메뉴 관리 (B안 통합 v3 · ops 뷰)
import { PageMenuEmbed } from './embed';

export const dynamic = 'force-dynamic';

export default function PageMenuOpsPage() {
  return <PageMenuEmbed view="ops" title="전체 페이지·메뉴 관리" />;
}
