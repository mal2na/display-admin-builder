'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { requestApprovalAppWidget } from './actions';

// App 위젯 상세 하단 버튼 — 목록 / 수정 / 승인요청.
//  승인대기(requested) 상태에서는 수정 불가(alert). (SB PG476 #7 / 7-1)
export function WidgetDetailActions({ id, approvalStatus }: { id: string; approvalStatus: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const onEdit = () => {
    if (approvalStatus === 'requested') { alert('승인대기 중에는 수정할 수 없습니다.'); return; }
    router.push(`/admin/app-widgets/${id}/edit`);
  };
  const onApprove = () => {
    if (!confirm('승인요청을 하시겠습니까?')) return;
    start(async () => {
      await requestApprovalAppWidget(id);
      alert('승인요청이 접수되었습니다.');
      router.refresh();
    });
  };

  return (
    <div className="flex items-center justify-between pt-2">
      <Button type="button" variant="outline" onClick={() => router.push('/admin/app-widgets')}>목록</Button>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onEdit} disabled={pending}>수정</Button>
        <Button type="button" onClick={onApprove} disabled={pending}>승인요청</Button>
      </div>
    </div>
  );
}
