// 위젯 유형 등록 · 운영 관리
import { WidgetTypeForm } from '../widget-type-form';
import { createWidgetType } from '../actions';

export const dynamic = 'force-dynamic';

export default function WidgetTypeNewPage() {
  return (
    <div className="mx-auto max-w-5xl p-6">
      <nav className="mb-1 text-[12px] text-muted-foreground">홈 › 운영 관리 › 위젯 유형 관리 › 위젯 유형 등록</nav>
      <h1 className="mb-5 text-2xl font-bold">위젯 유형 등록</h1>
      <WidgetTypeForm mode="new" action={createWidgetType} />
    </div>
  );
}
