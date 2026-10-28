// 전시화면 관리 (테스트) — 트리에서 템플릿 클릭 → order3-create 레이아웃(해당 템플릿 활성).
import { notFound } from 'next/navigation';
import { loadProcessDataByTemplate } from '../../process-data';
import { ProcessBuilder } from '../../process-builder';

export const dynamic = 'force-dynamic';

export default async function ContainersTestTemplatePage({ params, searchParams }: { params: { templateId: string }; searchParams: { new?: string } }) {
  const data = await loadProcessDataByTemplate(params.templateId);
  if (!data) notFound();
  // 템플릿 추가로 막 들어온 경우(?new=1) 기본 정보를 펼쳐 입력 유도, 컨테이너에서 접근한 기존 템플릿은 접음(2026-10-28 사용자 요청)
  return (
    <div className="h-full bg-[#ebeef6] p-3">
      <ProcessBuilder data={data} isNew={searchParams?.new === '1'} />
    </div>
  );
}
