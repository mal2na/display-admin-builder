// 위젯 유형 등록 · 운영 관리
import { WidgetTypeForm } from '../widget-type-form';
import { createWidgetType } from '../actions';
import { PageHeader } from '@/components/page-header';

export const dynamic = 'force-dynamic';

export default function WidgetTypeNewPage() {
  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader
        trail={['운영 관리', 'App 위젯 관리', '위젯 유형 등록']}
        title="위젯 유형 등록"
      />
      <WidgetTypeForm mode="new" action={createWidgetType} />
    </div>
  );
}
