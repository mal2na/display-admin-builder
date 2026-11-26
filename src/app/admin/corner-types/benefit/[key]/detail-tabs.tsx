'use client';
// 코너 유형 상세 — 상세 탭(상세정보 / 변경·승인 이력). SB Figma(BO-AIM-DSP-PG538, node 29305-82657).
//  상세정보 탭 = 서버에서 넘긴 detail(미리보기+정보), 변경·승인 이력 탭 = 이력 테이블.
import * as React from 'react';

const TABS = ['상세정보', '변경·승인 이력'] as const;
type Tab = (typeof TABS)[number];

const HISTORY: { at: string; action: string; actor: string; note: string }[] = [
  { at: '2026.11.23 10:21', action: '승인 완료', actor: '홍길동(P123465)', note: 'SB 프리셋 등록 승인' },
  { at: '2026.11.22 17:40', action: '승인 요청', actor: '김마리나(P217896)', note: '코너 유형 신규 등록' },
  { at: '2026.11.22 14:05', action: '임시 저장', actor: '김마리나(P217896)', note: '초안 작성' },
];

export function DetailTabs({ detail }: { detail: React.ReactNode }) {
  const [tab, setTab] = React.useState<Tab>('상세정보');
  return (
    <>
      <div className="mb-6 flex items-center gap-6 border-b border-[#dce0e5]">
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-1 pb-3 pt-1 text-[15px] font-semibold transition ${tab === t ? 'border-[#3617ce] text-[#3617ce]' : 'border-transparent text-[#697582] hover:text-[#1a1a1a]'}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === '상세정보' ? detail : (
        <div className="rounded-[14px] border border-[#e8ecef] bg-white">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-[#dce0e5] bg-[#f8f9fb] text-[#697582]">
                <th className="px-4 py-2.5 text-left font-semibold">일시</th>
                <th className="px-4 py-2.5 text-left font-semibold">처리</th>
                <th className="px-4 py-2.5 text-left font-semibold">처리자</th>
                <th className="px-4 py-2.5 text-left font-semibold">내용</th>
              </tr>
            </thead>
            <tbody>
              {HISTORY.map((h, i) => (
                <tr key={i} className="border-b border-[#f1f3f5] last:border-0">
                  <td className="px-4 py-3 tabular-nums text-[#697582]">{h.at}</td>
                  <td className="px-4 py-3 text-[#454f59]">{h.action}</td>
                  <td className="px-4 py-3 text-[#454f59]">{h.actor}</td>
                  <td className="px-4 py-3 text-[#454f59]">{h.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// 승인 정보 카드 — 승인 상태 + 메타(승인 요청자·버전·요청/처리 일시·등록자/일시·최종 수정자/일시).
export function ApprovalInfoCard({ typeId }: { typeId: string }) {
  void typeId;
  const meta: [string, string][] = [
    ['승인 상태', '승인 완료'], ['버전', 'v1.0.0'],
    ['승인 요청자', '김마리나(P217896)'], ['승인 담당자', '홍길동(P123465)'],
    ['요청 일시', '2026.11.22 17:40'], ['처리 일시', '2026.11.23 10:21'],
    ['등록자', '김마리나(P217896)'], ['등록 일시', '2026.11.22 14:05'],
  ];
  return (
    <div className="mb-6 rounded-[12px] border border-[#dce0e5] bg-[#f8f9fb] px-5 py-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[14px] font-bold text-[#1a1a1a]">승인 정보</span>
        <span className="inline-flex items-center rounded-md bg-[#c8f6e1] px-2 py-0.5 text-[12px] font-bold text-[#038e52]">승인 완료</span>
      </div>
      <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-[13px] md:grid-cols-4">
        {meta.slice(2).map(([k, v]) => (
          <span key={k} className="flex flex-col gap-0.5"><span className="text-[12px] text-[#8b949e]">{k}</span><span className="text-[#454f59]">{v}</span></span>
        ))}
      </div>
    </div>
  );
}
