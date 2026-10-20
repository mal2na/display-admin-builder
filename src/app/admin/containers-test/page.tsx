// 전시화면 관리 (테스트) — 3단 빌더 폼(미리보기 | 코너 설정 | 코너 상세 설정).
//  기존 전시화면 관리(/admin/containers)와 분리된 테스트 화면(2026-10-20).
import { ScreenBuilderTest } from './screen-builder-test';

export const dynamic = 'force-dynamic';

export default function ContainersTestPage() {
  return <ScreenBuilderTest />;
}
