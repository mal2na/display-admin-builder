// 전시 어드민 구조도 — [구조도] [IA] 탭. 구조도=HTML 카드(흐름), IA=관리 메뉴·데이터 계층 정리.
//  SVG(피그마 편집용)는 내려받기로 제공. 브레드크럼 없음.
import { StructureTabs } from './structure-tabs';

export const dynamic = 'force-dynamic';

export default function StructureMapPage() {
  return (
    <div className="px-8 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-bold text-slate-900">전시 어드민 구조도</h1>
        <a href="/structure-map.svg" download="전시어드민_구조도.svg"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#cfd3e0] bg-white px-4 text-[13px] font-medium text-slate-600 hover:bg-[#f0f2f4]">
          ↓ SVG 내려받기 (피그마 편집용)
        </a>
      </div>
      <StructureTabs />
    </div>
  );
}
