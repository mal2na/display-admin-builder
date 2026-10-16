import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { CarouselItemStudio } from './carousel-item-studio';

export const dynamic = 'force-dynamic';

// 코너 유형 관리 — 상품형 > 가로형+배너의 CarouselItem 컴포넌트 속성(Figma DS 51 속성) 편집.
export default function CarouselItemPage() {
  return (
    <div className="px-12 py-9 pb-28">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/admin/corner-types" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ChevronLeft className="h-4 w-4" /> 코너 유형 관리
        </Link>
        <div className="h-4 w-px bg-border" />
        <h1 className="text-lg font-semibold">상품형 · 가로형+배너 · 코너 속성</h1>
      </div>
      <p className="mb-5 text-[13px] leading-relaxed text-muted-foreground">
        Stack(Contents/List) ▸ 컴포넌트. 각 요소의 <b>Show 토글</b>을 껐다 켜며 카드 콘텐츠를 구성합니다 — 좌측 미리보기가 실시간 반영됩니다.
      </p>
      <CarouselItemStudio />
    </div>
  );
}
