// 전시화면 관리 (테스트) — 컨테이너 열기 → 주문 프로세스 등록(order3-create) 레이아웃.
//  미리보기(좌) + 기본 정보 + 템플릿 구성 + 구성 검증 + 하단 액션 바. 실제 혜택 홈 데이터(2026-10-20).
import { notFound } from 'next/navigation';
import { loadProcessData } from '../../process-data';
import { ProcessBuilder } from '../../process-builder';

export const dynamic = 'force-dynamic';

export default async function ContainersTestProcessPage({ params }: { params: { containerId: string } }) {
  const data = await loadProcessData(params.containerId);
  if (!data) notFound();
  return (
    <div className="h-full bg-[#eef0f6]">
      <ProcessBuilder data={data} />
    </div>
  );
}
