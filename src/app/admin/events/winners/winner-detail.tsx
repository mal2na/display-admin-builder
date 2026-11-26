'use client';
// 당첨자 관리 상세 — SB Figma(BO-AIM-EVT-PG089). 5탭: 프로모션 정보 / 참여자 조회 / 당첨자 관리 / 리워드 지급 처리 / 변경·승인 이력.
//  프로모션 정보 탭은 상세 구현, 나머지 탭은 동작 스캐폴드(각 탭 전용 노드로 추후 정밀화).
import * as React from 'react';
import { OpsSection, FieldRow, ReadValue, StatusPill, TABLE_CLS, THEAD_TR_CLS, TBODY_TR_CLS } from '@/components/ops-ui';
import { approvalTone, type WinnerRow } from '@/lib/promotion/winner';

const TABS = ['프로모션 정보', '참여자 조회', '당첨자 관리', '리워드 지급 처리', '변경·승인 이력'] as const;
type Tab = (typeof TABS)[number];

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`whitespace-nowrap px-3 py-2.5 text-left text-[13px] font-semibold text-[var(--ink3)] ${className}`}>{children}</th>;
}

export function WinnerDetail({ row, onBack, onToast }: { row: WinnerRow; onBack: () => void; onToast: (m: string) => void }) {
  const [tab, setTab] = React.useState<Tab>('프로모션 정보');

  // 승인 상태 헤더 카드
  const ApprovalCard = (
    <div className="mb-6 flex flex-wrap items-center gap-x-10 gap-y-2 rounded-[12px] border border-[var(--line2)] bg-[var(--th)] px-5 py-4 text-[13px]">
      <span className="flex items-center gap-2"><b className="text-[var(--ink3)]">승인 상태</b>{row.approval === '-' ? <span className="text-[var(--ink4)]">-</span> : <StatusPill label={row.approval} tone={approvalTone(row.approval)} />}</span>
      <span className="text-[var(--ink2)]"><b className="text-[var(--ink3)]">승인 담당자</b> 홍길동(P123465)</span>
      <span className="text-[var(--ink2)]"><b className="text-[var(--ink3)]">등록자</b> {row.editor}</span>
      <span className="text-[var(--ink2)]"><b className="text-[var(--ink3)]">최종 수정일시</b> {row.editedAt}</span>
    </div>
  );

  const rewardRows = [
    { kind: '선택 1', pool: 'T 플러스 포인트 3,000P', type: 'T 플러스 포인트', detail: '3,000P', target: '전체', paid: '3,090' },
    { kind: '선택 2', pool: 'FLO 1개월 이용권', type: 'SKT 뮤직 이용권', detail: 'FLO 1개월 이용권', target: '전체', paid: '1,890' },
  ];

  return (
    <div>
      {/* 탭 */}
      <div className="mb-6 flex items-center gap-6 border-b border-[var(--line2)]">
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-1 pb-3 pt-1 text-[15px] font-semibold transition ${tab === t ? 'border-[var(--ac)] text-[var(--ac)]' : 'border-transparent text-[var(--ink3)] hover:text-[var(--ink)]'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === '프로모션 정보' && (
        <>
          {ApprovalCard}
          <OpsSection title="기본 정보">
            <div className="grid grid-cols-2 border-t border-[#dce0e5] [&>*]:border-b [&>*]:border-[#dce0e5]">
              <FieldRow label="프로모션 ID"><ReadValue value={<span className="font-mono text-[var(--ac)]">{row.promoId}</span>} /></FieldRow>
              <FieldRow label="프로모션명"><ReadValue value={row.promoName} /></FieldRow>
              <FieldRow label="프로모션 유형"><ReadValue value={row.promoType} /></FieldRow>
              <FieldRow label="프로모션 상태"><ReadValue value={row.promoStatus} /></FieldRow>
              <FieldRow label="전시 기간"><ReadValue value="2026.04.01 00:00 ~ 2026.06.30 23:59" /></FieldRow>
              <FieldRow label="참여 기간"><ReadValue value={row.joinPeriod} /></FieldRow>
              <FieldRow label="처리 상태"><ReadValue value={row.process} /></FieldRow>
            </div>
          </OpsSection>
          <OpsSection title="참여 정보">
            <div className="grid grid-cols-2 border-t border-[#dce0e5] [&>*]:border-b [&>*]:border-[#dce0e5]">
              <FieldRow label="참여 방식"><ReadValue value="직접 참여(수동)" /></FieldRow>
              <FieldRow label="참여 행동"><ReadValue value="Q 응답 · 후보 참여" /></FieldRow>
              <FieldRow label="참여 횟수"><ReadValue value="기간 전체 · 최대 1회" /></FieldRow>
              <FieldRow label="중복 참여 판별 기준"><ReadValue value="고객 기준(CI)" /></FieldRow>
              <FieldRow label="비회원 참여 여부"><ReadValue value="N" /></FieldRow>
              <FieldRow label="참여 조건"><ReadValue value="명세1 등급1 VIP·GOLD인 고객" /></FieldRow>
            </div>
          </OpsSection>
          <OpsSection title="현황 정보">
            <div className="grid grid-cols-2 border-t border-[#dce0e5] [&>*]:border-b [&>*]:border-[#dce0e5]">
              <FieldRow label="회원 참여자 수"><ReadValue value={<span className="tabular-nums">{row.joinCount.toLocaleString()}</span>} /></FieldRow>
              <FieldRow label="비회원 참여자 수"><ReadValue value="0" /></FieldRow>
              <FieldRow label="전체 리워드 수량 인원"><ReadValue value={typeof row.total === 'number' ? row.total.toLocaleString() : '전체'} /></FieldRow>
              <FieldRow label="지급 완료 수"><ReadValue value={<span className="tabular-nums">{row.paid.toLocaleString()}</span>} /></FieldRow>
            </div>
          </OpsSection>
          <OpsSection title="리워드 정보">
            <div className="overflow-x-auto border-t border-[var(--line2)]">
              <table className={TABLE_CLS}>
                <thead><tr className={THEAD_TR_CLS}><Th>구분</Th><Th>사용자 풀/명</Th><Th>리워드 유형</Th><Th>유형 상세</Th><Th>리워드 수령 인원</Th><Th>지급 완료 수</Th></tr></thead>
                <tbody>
                  {rewardRows.map((r) => (
                    <tr key={r.kind} className={TBODY_TR_CLS}>
                      <td className="px-3 py-3 align-middle font-semibold text-[var(--ink2)]">{r.kind}</td>
                      <td className="px-3 py-3 align-middle text-[var(--ink2)]">{r.pool}</td>
                      <td className="px-3 py-3 align-middle text-[var(--ink2)]">{r.type}</td>
                      <td className="px-3 py-3 align-middle text-[var(--ink2)]">{r.detail}</td>
                      <td className="px-3 py-3 align-middle text-[var(--ink2)]">{r.target}</td>
                      <td className="px-3 py-3 align-middle tabular-nums text-[var(--ink)]">{r.paid}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </OpsSection>
        </>
      )}

      {tab === '참여자 조회' && (
        <OpsSection title={`참여자 목록 (총 ${row.joinCount.toLocaleString()}명)`}>
          <div className="overflow-x-auto border-t border-[var(--line2)]">
            <table className={TABLE_CLS}>
              <thead><tr className={THEAD_TR_CLS}><Th>No.</Th><Th>참여자</Th><Th>휴대폰 번호</Th><Th>참여 일시</Th><Th>참여 행동</Th><Th>당첨 여부</Th></tr></thead>
              <tbody>
                {Array.from({ length: 8 }, (_, i) => (
                  <tr key={i} className={TBODY_TR_CLS}>
                    <td className="px-3 py-3 tabular-nums text-[var(--ink3)]">{row.joinCount - i}</td>
                    <td className="px-3 py-3 text-[var(--ink2)]">홍길동</td>
                    <td className="px-3 py-3 tabular-nums text-[var(--ink2)]">010-****-{1000 + i}</td>
                    <td className="px-3 py-3 tabular-nums text-[var(--ink3)]">2026.06.1{i} 1{i}:20</td>
                    <td className="px-3 py-3 text-[var(--ink2)]">Q 응답</td>
                    <td className="px-3 py-3">{i % 3 === 0 ? <StatusPill label="당첨" tone="success" /> : <span className="text-[var(--ink4)]">-</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </OpsSection>
      )}

      {tab === '당첨자 관리' && (
        <OpsSection title="당첨자 선정">
          <div className="border-t border-[var(--line2)] px-4 py-6">
            <p className="mb-4 text-[14px] text-[var(--ink2)]">리워드 구분별로 당첨자를 선정합니다. 선정 방식(추첨/선착순/수동)과 인원을 설정한 뒤 [선정 실행]하세요.</p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-[var(--th)] px-3 py-1.5 text-[13px] font-semibold text-[var(--ink2)]">선택 1 · 수령 전체 / 당첨 {row.paid.toLocaleString()}</span>
              <span className="rounded-full bg-[var(--th)] px-3 py-1.5 text-[13px] font-semibold text-[var(--ink2)]">선택 2 · 수령 전체 / 당첨 1,890</span>
              <button type="button" onClick={() => onToast('당첨자 선정을 실행했습니다(데모).')} className="h-[38px] rounded-[var(--r-field)] border border-[var(--ac)] bg-[var(--ac2)] px-4 text-[14px] font-semibold text-[var(--ac)] hover:bg-[#e6e8ff]">선정 실행</button>
            </div>
          </div>
        </OpsSection>
      )}

      {tab === '리워드 지급 처리' && (
        <OpsSection title="리워드 지급 처리">
          <div className="overflow-x-auto border-t border-[var(--line2)]">
            <table className={TABLE_CLS}>
              <thead><tr className={THEAD_TR_CLS}><Th>구분</Th><Th>리워드</Th><Th>당첨 인원</Th><Th>지급 완료</Th><Th>지급 상태</Th><Th>처리</Th></tr></thead>
              <tbody>
                {rewardRows.map((r) => (
                  <tr key={r.kind} className={TBODY_TR_CLS}>
                    <td className="px-3 py-3 font-semibold text-[var(--ink2)]">{r.kind}</td>
                    <td className="px-3 py-3 text-[var(--ink2)]">{r.detail}</td>
                    <td className="px-3 py-3 tabular-nums text-[var(--ink2)]">{r.paid}</td>
                    <td className="px-3 py-3 tabular-nums text-[var(--ink2)]">{r.paid}</td>
                    <td className="px-3 py-3"><StatusPill label="지급 완료" tone="success" /></td>
                    <td className="px-3 py-3"><button type="button" onClick={() => onToast('지급 내역을 확인했습니다(데모).')} className="rounded-[6px] border border-[var(--line3)] px-2.5 py-1 text-[12px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]">내역</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </OpsSection>
      )}

      {tab === '변경·승인 이력' && (
        <OpsSection title="변경·승인 이력">
          <div className="overflow-x-auto border-t border-[var(--line2)]">
            <table className={TABLE_CLS}>
              <thead><tr className={THEAD_TR_CLS}><Th>일시</Th><Th>처리</Th><Th>처리자</Th><Th>사유/내용</Th></tr></thead>
              <tbody>
                {[['2026.06.19 14:10', '승인 완료', '홍길동(P123465)', '당첨자 선정 승인'], ['2026.06.19 10:02', '승인 요청', '김마리나(P217129)', '리워드 지급 요청'], ['2026.06.18 17:40', '당첨자 선정', '김마리나(P217129)', '추첨 선정 실행']].map((r, i) => (
                  <tr key={i} className={TBODY_TR_CLS}>
                    <td className="px-3 py-3 tabular-nums text-[var(--ink3)]">{r[0]}</td>
                    <td className="px-3 py-3 text-[var(--ink2)]">{r[1]}</td>
                    <td className="px-3 py-3 text-[var(--ink2)]">{r[2]}</td>
                    <td className="px-3 py-3 text-[var(--ink2)]">{r[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </OpsSection>
      )}

      {/* 하단 액션 */}
      <div className="mt-8 flex items-center justify-between">
        <button type="button" onClick={onBack} className="h-[40px] rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-6 text-[14px] font-semibold text-[var(--ink3)] hover:bg-[var(--th)]">목록</button>
        <button type="button" onClick={() => onToast('승인 요청했습니다(데모).')} className="h-[40px] rounded-[var(--r-field)] bg-[var(--ac)] px-7 text-[14px] font-semibold text-white hover:bg-[var(--ac-h)]">승인요청</button>
      </div>
    </div>
  );
}
