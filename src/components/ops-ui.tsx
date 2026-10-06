// 운영 관리 공용 UI — 상태 뱃지 / 섹션 / 필드 행. App 위젯·위젯 유형·App 스플래시 공용.
//  색상·보더는 '전체 페이지·메뉴 관리'(page-menu-b) 팔레트를 기준으로 통일(2026-10-06 사용자 요청):
//   line #e3e5ee · line-2 #d3d6e2 · head #f3f4f8 · surface-2 #f6f7fb · ink #1f2330/ink-2 #4b5060/ink-3 #8a8fa3
//   accent #3b2bd9 · ok #2f7f4f/#e6f5ea · warn #d9534f/#fdeaea · amber #c77700/#fff3e0 · blue #2f5fd0/#e8effc
import { cn } from '@/lib/utils';

const TONES: Record<string, string> = {
  muted: 'bg-[#f6f7fb] text-[#8a8fa3] ring-[#e3e5ee]',
  slate: 'bg-[#f6f7fb] text-[#4b5060] ring-[#d3d6e2]',
  amber: 'bg-[#fff3e0] text-[#c77700] ring-[#f3d9a8]',
  blue: 'bg-[#e8effc] text-[#2f5fd0] ring-[#cdddf6]',
  green: 'bg-[#e6f5ea] text-[#2f7f4f] ring-[#c3e4cd]',
  red: 'bg-[#fdeaea] text-[#d9534f] ring-[#f3c9c7]',
};

export function StatusPill({ label, tone = 'muted', dot }: { label: string; tone?: string; dot?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', TONES[tone] ?? TONES.muted)}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', tone === 'amber' ? 'bg-[#c77700]' : tone === 'blue' ? 'bg-[#2f5fd0]' : tone === 'green' ? 'bg-[#2f7f4f]' : 'bg-[#8a8fa3]')} />}
      {label}
    </span>
  );
}

// 섹션 카드 (제목). no 인자는 하위호환용으로 남겨두되 표시하지 않는다.
export function OpsSection({ title, children }: { no?: number | string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-[15px] font-bold text-[#1f2330]">{title}</h3>
      </div>
      <div className="border-t border-[#e3e5ee]">{children}</div>
    </section>
  );
}

// 라벨/값 2열 그리드 행 (상세·수정 공용). 보더·라벨 bg는 '전체 페이지·메뉴 관리' 기준(line #e3e5ee · head #f3f4f8).
export function FieldRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-stretch border-b border-[#e3e5ee]">
      <div className="flex items-center bg-[#f3f4f8] px-4 py-3 text-[13px] font-medium text-[#4b5060]">
        {label}
        {required && <span className="ml-0.5 text-[#d9534f]">*</span>}
      </div>
      <div className="px-4 py-2.5">{children}</div>
    </div>
  );
}

// 읽기 전용 값 — 인풋박스 없이 텍스트로만
export function ReadValue({ value }: { value: React.ReactNode }) {
  return <div className="min-h-[20px] py-1.5 text-[13px] text-[#1f2330]">{value ?? '-'}</div>;
}
