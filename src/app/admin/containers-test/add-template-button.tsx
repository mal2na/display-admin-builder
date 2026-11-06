'use client';

// 전시화면 관리 — 템플릿 추가 버튼.
//  모달(이름·조건그룹 입력)을 거치지 않고 바로 템플릿을 생성한 뒤 빌더(?new=1)로 진입한다.
//  템플릿명·로그인 구분 등은 빌더의 '템플릿 기본 정보'에서 설정한다(2026-11-06).
import { useFormStatus } from 'react-dom';
import { Plus } from 'lucide-react';
import { addTestTemplate } from './actions';

function AddBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-[36px] items-center gap-1.5 rounded-[8px] bg-[var(--ac)] px-4 text-[13px] font-semibold text-white hover:bg-[var(--ac-h)] disabled:opacity-50"
    >
      <Plus className="h-3.5 w-3.5" /> {pending ? '추가 중…' : '템플릿 추가'}
    </button>
  );
}

export function AddTemplateButton({ containerId }: { containerId: string }) {
  return (
    <form action={addTestTemplate.bind(null, containerId)}>
      <AddBtn />
    </form>
  );
}
