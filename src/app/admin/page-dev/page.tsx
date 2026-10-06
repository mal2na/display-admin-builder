// 페이지 개발 설정 (B안 통합 v3 · dev 뷰) — 같은 목업의 dev 화면만 띄운다.
import { PageMenuEmbed } from '../page-menu-b/embed';

export const dynamic = 'force-dynamic';

export default function PageDevPage() {
  return <PageMenuEmbed view="dev" title="페이지 개발 설정" />;
}
