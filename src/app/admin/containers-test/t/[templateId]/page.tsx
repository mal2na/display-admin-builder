// 전시화면 관리 (테스트) — 트리에서 템플릿 클릭 → order3-create 레이아웃(해당 템플릿 활성).
import { notFound } from 'next/navigation';
import { loadProcessDataByTemplate } from '../../process-data';
import { ProcessBuilder } from '../../process-builder';

export const dynamic = 'force-dynamic';

export default async function ContainersTestTemplatePage({ params }: { params: { templateId: string } }) {
  const data = await loadProcessDataByTemplate(params.templateId);
  if (!data) notFound();
  return (
    <div className="h-full bg-[#ebeef6] p-3">
      <ProcessBuilder data={data} />
    </div>
  );
}
