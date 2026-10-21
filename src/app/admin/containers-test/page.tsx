// 전시화면 관리 (테스트) — 진입 화면. 실제 전시화면 관리처럼 좌측 트리 + 우측 안내.
//  트리에서 컨테이너를 고르면 상세, 템플릿을 고르면 디바이스-좌측 빌더로 들어간다(2026-10-20).
import { Box } from 'lucide-react';
import { ContainersTestShell } from './tree-shell';

export const dynamic = 'force-dynamic';

export default function ContainersTestIndexPage() {
  return (
    <ContainersTestShell>
      <div className="flex h-full items-center justify-center p-10">
        <div className="text-center text-[var(--ink3)]">
          <Box className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p className="text-sm">왼쪽에서 Container를 선택하거나</p>
          <p className="text-sm">템플릿을 눌러 빌더로 들어가세요.</p>
        </div>
      </div>
    </ContainersTestShell>
  );
}
