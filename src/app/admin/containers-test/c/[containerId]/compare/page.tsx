// 조건그룹 비교 — 컨테이너에 매핑된 템플릿을 모두 나란히 비교(2026-11-10 사용자 요청: 매핑 템플릿 3개 다 비교).
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { loadProcessData } from '../../../process-data';
import { ContainersTestShell } from '../../../tree-shell';
import { CompareView } from './compare-view';

export const dynamic = 'force-dynamic';

export default async function ComparePage({ params }: { params: { containerId: string } }) {
  const data = await loadProcessData(params.containerId);
  if (!data) notFound();
  // 보관(archive)된 건 process-data에서 이미 제외됨 — 활성 매핑 템플릿 전체를 비교.
  const templates = data.templates;

  return (
    <ContainersTestShell>
      <div className="px-10 py-8 pb-24">
        <nav className="flex flex-wrap items-center gap-1.5 text-[13px] text-[var(--ink3)]">
          <span>홈</span><ChevronRight className="h-3.5 w-3.5 opacity-50" /><span>전시관리</span>
          <ChevronRight className="h-3.5 w-3.5 opacity-50" /><Link href="/admin/containers-test" className="hover:underline">전시화면 관리</Link>
          <ChevronRight className="h-3.5 w-3.5 opacity-50" /><Link href={`/admin/containers-test/c/${data.containerId}`} className="hover:underline">{data.containerName}</Link>
          <ChevronRight className="h-3.5 w-3.5 opacity-50" /><b className="text-[var(--ink)]">조건그룹 비교</b>
        </nav>

        <div className="mt-2 flex items-center gap-2">
          <Link href={`/admin/containers-test/c/${data.containerId}`} className="inline-flex h-[32px] items-center gap-1 rounded-[8px] border border-[var(--line2)] bg-white px-3 text-[13px] font-medium text-[var(--ink2)] hover:bg-[var(--th)]"><ArrowLeft className="h-3.5 w-3.5" /> 상세로</Link>
          <h1 className="text-[24px] font-bold leading-[32px] tracking-[-0.6px] text-[var(--ink)]">조건그룹 비교</h1>
          <span className="text-[14px] text-[var(--ink3)]">· {data.containerName} · 매핑 템플릿 {templates.length}개</span>
        </div>
        <p className="mt-1 text-[13px] text-[var(--ink3)]">같은 컨테이너라도 조건그룹(로그인/비로그인 등)에 따라 다른 템플릿이 노출됩니다. 아래에서 구성 차이와 실제 화면을 나란히 비교하세요.</p>

        <div className="mt-6">
          <CompareView containerName={data.containerName} templates={templates} />
        </div>
      </div>
    </ContainersTestShell>
  );
}
