// 운영 관리 공용 UI — 상태 뱃지 / 섹션 / 필드 행. App 위젯·위젯 유형·App 스플래시 공용.
import { cn } from '@/lib/utils';

const TONES: Record<string, string> = {
  muted: 'bg-slate-100 text-slate-500 ring-slate-200',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  blue: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  red: 'bg-rose-50 text-rose-700 ring-rose-200',
};

export function StatusPill({ label, tone = 'muted', dot }: { label: string; tone?: string; dot?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', TONES[tone] ?? TONES.muted)}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', tone === 'amber' ? 'bg-amber-500' : tone === 'blue' ? 'bg-indigo-500' : tone === 'green' ? 'bg-emerald-500' : 'bg-slate-400')} />}
      {label}
    </span>
  );
}

// 섹션 카드 (제목). no 인자는 하위호환용으로 남겨두되 표시하지 않는다.
export function OpsSection({ title, children }: { no?: number | string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-[15px] font-bold text-slate-900">{title}</h3>
      </div>
      <div className="border-y border-[#E8ECEF]">{children}</div>
    </section>
  );
}

// 라벨/값 2열 그리드 행 (상세·수정 공용). readOnly면 회색 박스.
export function FieldRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center border-b border-[#E8ECEF] last:border-b-0">
      <div className="flex h-full items-center bg-[#F8F9FB] px-4 py-3 text-[13px] font-medium text-slate-600">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </div>
      <div className="px-4 py-2.5">{children}</div>
    </div>
  );
}

// 읽기 전용 값 — 인풋박스 없이 텍스트로만
export function ReadValue({ value }: { value: React.ReactNode }) {
  return <div className="min-h-[20px] py-1.5 text-[13px] text-slate-800">{value ?? '-'}</div>;
}
