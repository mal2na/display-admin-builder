'use client';

// 전시화면 관리 (테스트) — 템플릿 추가 버튼 + 모달(이름·조건그룹 입력 → 서버 액션으로 생성).
import * as React from 'react';
import { useFormStatus } from 'react-dom';
import { Plus, X, ChevronDown } from 'lucide-react';
import { addTestTemplate } from './actions';

const COND_GROUPS = ['로그인', '비로그인', '기본', '신규가입', 'VIP'];

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="h-[42px] w-full rounded-[var(--r-field)] bg-[var(--ac)] text-[14px] font-bold text-white hover:bg-[var(--ac-h)] disabled:opacity-50">
      {pending ? '추가 중…' : '템플릿 추가'}
    </button>
  );
}

export function AddTemplateButton({ containerId }: { containerId: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-[36px] items-center gap-1.5 rounded-[8px] bg-[var(--ac)] px-4 text-[13px] font-semibold text-white hover:bg-[var(--ac-h)]">
        <Plus className="h-3.5 w-3.5" /> 템플릿 추가
      </button>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-[420px] rounded-[16px] bg-white p-6 shadow-[var(--dlg-shadow)]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-[var(--ink)]">템플릿 추가</h3>
              <button type="button" onClick={() => setOpen(false)} className="rounded-[6px] p-1 text-[var(--ink3)] hover:bg-[var(--th)]"><X className="h-4 w-4" /></button>
            </div>
            <form action={addTestTemplate.bind(null, containerId)} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-[var(--ink2)]">템플릿명 <span className="text-[var(--bad)]">*</span></label>
                <input name="name" required autoFocus placeholder="예: 혜택 VIP" className="h-[40px] w-full rounded-[var(--r-field)] border border-[var(--line3)] px-3 text-[14px] focus:border-[var(--ac)] focus:outline-none" />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-[var(--ink2)]">조건그룹</label>
                <div className="relative">
                  <select name="conditionGroup" defaultValue="로그인" className="h-[40px] w-full appearance-none rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-3 pr-9 text-[14px] focus:border-[var(--ac)] focus:outline-none">
                    {COND_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink4)]" />
                </div>
                <p className="mt-1.5 text-[12px] text-[var(--ink4)]">조건그룹에 따라 같은 컨테이너라도 다른 화면으로 분기됩니다.</p>
              </div>
              <SubmitBtn />
            </form>
          </div>
        </div>
      )}
    </>
  );
}
