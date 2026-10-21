'use client';

/**
 * 프로모션 관리 › 결과 관리 › 상세 — 프로토타입 rsDetailHTML React 이식(2026-10-20).
 *  탭: 프로모션 정보(기본·참여·리워드·현황) / 응모자 조회 · 당첨자 관리 · 이력(다음 단계 설계).
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { StatusPill } from '@/components/ops-ui';
import { promoRows, fullYmd, STATUS_TONE } from '@/lib/promotion/model';
import { PROC_TONE, type ResultRow } from '@/lib/promotion/result';

const nf = (n: number) => n.toLocaleString('ko-KR');
const BTN = 'h-[38px] shrink-0 rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-5 text-[14px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]';

const Sec = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="border-t border-[var(--line2)] pt-4">
    <h3 className="mb-2.5 text-[15px] font-bold">{title}</h3>
    {children}
  </section>
);
const Sub = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-1.5 mt-3 text-[13px] font-semibold text-[var(--ink2)]">{children}</div>
);
/** 라벨/값 2열 그리드 */
const G2 = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 gap-x-8 gap-y-0 md:grid-cols-2">{children}</div>
);
const FR = ({ l, children, full }: { l?: string; children?: React.ReactNode; full?: boolean }) => (
  <div className={cn('grid grid-cols-[120px_1fr] items-start gap-3 border-b border-[var(--line2)] py-2.5 text-[14px]', full && 'md:col-span-2')}>
    <div className="text-[var(--ink3)]">{l}</div>
    <div className="min-w-0 text-[var(--ink)]">{children}</div>
  </div>
);
const PP = ({ t, tone }: { t: string; tone: Parameters<typeof StatusPill>[0]['tone'] }) => <StatusPill label={t} tone={tone} />;
const Step = ({ t }: { t: string }) => <StatusPill label={t} tone="emphasis" />;

/** 작은 표 */
function MT({ cols, rows }: { cols: string[]; rows: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-[8px] border border-[var(--line2)]">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>{cols.map((c) => <th key={c} className="whitespace-nowrap border-b border-[var(--line2)] bg-[var(--th)] px-2.5 py-2 text-center font-medium text-[var(--ink3)]">{c}</th>)}</tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}
const Td = ({ l, rs, children }: { l?: boolean; rs?: number; children: React.ReactNode }) => (
  <td rowSpan={rs} className={cn('border-b border-[var(--line2)] px-2.5 py-2 align-middle', l ? 'text-left' : 'text-center')}>{children}</td>
);

const CondBox = ({ s, label = '참여 가능' }: { s: string; label?: string }) => (
  <span>
    <span className="text-[12px] text-[var(--ink3)]">조건 1개 · 모두 충족 시 {label}</span><br />
    1. {s}
  </span>
);

export function ResultDetail({ x, onBack, onToast }: { x: ResultRow; onBack: () => void; onToast: (m: string) => void }) {
  const d = React.useMemo(() => promoRows().find((v) => v.id === x.id), [x.id]);
  const [disp0, disp1] = fullYmd(d?.disp ?? '').split(' ~ ');
  const dispTxt = disp0 && disp1 ? `${disp0} 00:00 ~ ${disp1} 23:59` : '-';
  const rec = x.type === '추천형';

  const win = Math.max(0, Math.round(x.part * 0.12));
  const inv2 = Math.round(win * 0.4);
  const p1 = Math.min(10, Math.round(x.paid * 0.01));
  const p1b = x.paid > 0 ? Math.min(10, p1 + 2) : 0;
  const p2 = Math.max(0, Math.round(x.paid * 0.15));
  const c2a = x.proc === '선정 대기' ? 0 : Math.round(x.part * 0.5);
  const c2b = x.proc === '선정 대기' ? 0 : Math.round(x.part * 0.3);

  return (
    <div className="px-12 py-9 pb-28">
      <div className="text-[12px] text-[var(--ink4)]">홈 &gt; 프로모션 관리 &gt; 결과 관리 &gt; <b className="font-medium text-[var(--ink3)]">결과 관리 상세</b></div>
      <h1 className="mb-4 mt-1 text-[22px] font-bold tracking-[-0.4px]">결과 관리 상세</h1>

      {/* 탭 — 프로모션 정보만 구현, 나머지는 다음 단계 설계 */}
      <div className="mb-5 flex gap-1 border-b border-[var(--line2)]">
        <button type="button" className="-mb-px border-b-2 border-[var(--ac)] px-3.5 py-2 text-[14px] font-bold text-[var(--ac)]">프로모션 정보</button>
        {['응모자 조회', '당첨자 관리', '이력'].map((t) => (
          <button key={t} type="button" onClick={() => onToast(`'${t}' 탭은 다음 단계에서 설계해요.`)}
            className="-mb-px border-b-2 border-transparent px-3.5 py-2 text-[14px] font-bold text-[var(--ink4)] hover:text-[var(--ink2)]">{t}</button>
        ))}
      </div>

      <div className="space-y-5">
        {/* 기본 정보 */}
        <Sec title="기본 정보">
          <G2>
            <FR l="프로모션 ID">
              <button type="button" onClick={() => onToast(`${x.id} 프로모션 상세를 새 창으로 열어요. (프로토타입에서는 열리지 않아요)`)} className="font-mono text-[var(--ac)] hover:underline">{x.id} ↗</button>
            </FR>
            <FR l="프로모션 명">{x.name}</FR>
            <FR l="프로모션 유형">이벤트 &gt; {x.type}</FR>
            <FR l="프로모션 상태"><PP t={x.st} tone={STATUS_TONE[x.st]} /></FR>
            <FR l="전시기간">{dispTxt}</FR>
            <FR l="참여기간">{x.join}</FR>
            <FR l="결과 처리 상태">{x.proc === '-' ? '-' : <PP t={x.proc} tone={PROC_TONE[x.proc]} />}</FR>
            <FR />
          </G2>
        </Sec>

        {/* 참여 정보 */}
        <Sec title="참여 정보">
          {rec ? (
            <G2>
              <FR l="초대자 참여 조건"><CondBox s="SKT 이동전화 회선을 보유한 고객" /></FR>
              <FR l="피초대자 참여 조건"><CondBox s="요금제에 신규·번호이동으로 가입한 고객" /></FR>
              <FR l="최대 초대 인정 수">제한 · 10</FR>
              <FR l="추천 관계 판정">CI 기준</FR>
              <FR l="비회원 참여">N</FR>
              <FR />
            </G2>
          ) : (
            <G2>
              <FR l="참여 방식">직접 참여(수동)</FR>
              <FR l="참여 행동">① 설문 · ② 버튼 참여</FR>
              <FR l="참여 횟수">기간 전체 · 최대 1회</FR>
              <FR l="중복 참여 판별 기준">고객 기준(CI)</FR>
              <FR l="비회원 참여">N</FR>
              <FR l="참여 조건"><CondBox s="멤버십 등급이 VIP·GOLD인 고객" /></FR>
            </G2>
          )}
        </Sec>

        {/* 리워드 정보 */}
        <Sec title="리워드 정보">
          {rec ? (
            <>
              <Sub>초대자 리워드</Sub>
              <G2>
                <FR l="지급 조건" full>-</FR>
                <FR l="리워드 항목" full>
                  <MT cols={['단계', '사용자 노출명', '리워드 유형', '유형 상세', '지급 방식', '지급 시점']} rows={
                    <>
                      <tr><Td><Step t="1 단계" /></Td><Td l>친구 3명 초대 달성</Td><Td>T 플러스 포인트</Td><Td l>3,000P</Td><Td>자동 지급</Td><Td>즉시</Td></tr>
                      <tr><Td><Step t="2 단계" /></Td><Td l>친구 5명 초대 달성</Td><Td>SKT 쿠폰·이용권</Td><Td l>FLO 1개월 이용권</Td><Td>고객 수령</Td><Td>2026.10.01 00:00 ~ 2026.10.31 23:59</Td></tr>
                    </>
                  } />
                </FR>
              </G2>
              <Sub>피초대자 리워드</Sub>
              <G2>
                <FR l="지급 조건" full><CondBox s="요금제에 신규·번호이동으로 가입한 고객" label="지급" /></FR>
                <FR l="리워드 항목" full>
                  <MT cols={['구분', '사용자 노출명', '리워드 유형', '유형 상세', '지급 방식', '지급 시점']} rows={
                    <tr><Td>-</Td><Td l>가입 축하 쿠폰</Td><Td>제휴사 쿠폰</Td><Td l>스타벅스 아메리카노 T</Td><Td>자동 지급</Td><Td>즉시</Td></tr>
                  } />
                </FR>
              </G2>
            </>
          ) : (
            <>
              <Sub>리워드 정보 1</Sub>
              <G2>
                <FR l="리워드 구성 유형">구간형</FR>
                <FR l="대상자 선정">추첨(수동) · 사후</FR>
                <FR l="선정 안내">일반 선정 안내</FR>
                <FR l="지급 조건">-</FR>
                <FR l="리워드 항목" full>
                  <MT cols={['구간', '사용자 노출명', '리워드 유형', '유형 상세', '지급 방식', '지급 시점']} rows={
                    <>
                      <tr><Td rs={2}><Step t="구간 1" /></Td><Td l rs={2}>1등 아이패드 에어 + 스타벅스 쿠폰</Td><Td>실물 경품</Td><Td l>아이패드 에어</Td><Td>대행사·제휴사 지급</Td><Td>추후</Td></tr>
                      <tr><Td>제휴사 쿠폰</Td><Td l>스타벅스 아메리카노 T</Td><Td>자동 지급</Td><Td>즉시</Td></tr>
                      <tr><Td><Step t="구간 2" /></Td><Td l>2등 스타벅스 아메리카노</Td><Td>제휴사 쿠폰</Td><Td l>스타벅스 아메리카노 T</Td><Td>자동 지급</Td><Td>즉시</Td></tr>
                    </>
                  } />
                </FR>
              </G2>
              <Sub>리워드 정보 2</Sub>
              <G2>
                <FR l="리워드 구성 유형">선택형 · 1개 선택</FR>
                <FR l="대상자 선정">전원 · 실시간</FR>
                <FR l="선정 안내">안내 안 함</FR>
                <FR l="지급 조건">-</FR>
                <FR l="리워드 항목" full>
                  <MT cols={['선택지', '사용자 노출명', '리워드 유형', '유형 상세', '지급 방식', '지급 시점']} rows={
                    <>
                      <tr><Td><Step t="선택지 1" /></Td><Td l>T 플러스 포인트 3,000P</Td><Td>T 플러스 포인트</Td><Td l>3,000P</Td><Td>자동 지급</Td><Td>즉시</Td></tr>
                      <tr><Td><Step t="선택지 2" /></Td><Td l>FLO 1개월 이용권</Td><Td>SKT 쿠폰·이용권</Td><Td l>FLO 1개월 이용권</Td><Td>고객 수령</Td><Td>2026.06.20 00:00 ~ 2026.07.19 23:59</Td></tr>
                    </>
                  } />
                </FR>
              </G2>
            </>
          )}
        </Sec>

        {/* 현황 정보 */}
        <Sec title="현황 정보">
          <G2>
            <FR l="회원 참여자 수">{nf(x.part)}</FR>
            <FR l="비회원 참여자 수">0</FR>
          </G2>
          {rec ? (
            <>
              <Sub>초대자 리워드</Sub>
              <G2>
                <FR l="리워드 수령 인원">전체</FR>
                <FR l="지급 완료 수">{nf(inv2)}</FR>
                <FR l="단계별 현황" full>
                  <MT cols={['단계', '사용자 노출명', '리워드 유형', '유형 상세', '리워드 수령 인원', '지급 완료 수']} rows={
                    <>
                      <tr><Td><Step t="1 단계" /></Td><Td l>친구 3명 초대 달성</Td><Td>T 플러스 포인트</Td><Td l>3,000P</Td><Td>전체</Td><Td>{nf(Math.round(inv2 * 0.7))}</Td></tr>
                      <tr><Td><Step t="2 단계" /></Td><Td l>친구 5명 초대 달성</Td><Td>SKT 쿠폰·이용권</Td><Td l>FLO 1개월 이용권</Td><Td>전체</Td><Td>{nf(inv2 - Math.round(inv2 * 0.7))}</Td></tr>
                    </>
                  } />
                </FR>
              </G2>
              <Sub>피초대자 리워드</Sub>
              <G2>
                <FR l="리워드 수령 인원">전체</FR>
                <FR l="지급 완료 수">{nf(win)}</FR>
              </G2>
            </>
          ) : (
            <>
              <Sub>리워드 정보 1</Sub>
              <G2>
                <FR l="리워드 수령 인원">{x.cap == null ? '전체' : nf(x.cap)}</FR>
                <FR l="지급 완료 수">{nf(p1 + p1b + p2)}</FR>
                <FR l="구간별 현황" full>
                  <MT cols={['구간', '사용자 노출명', '리워드 유형', '유형 상세', '리워드 수령 인원', '지급 완료 수']} rows={
                    <>
                      <tr><Td rs={2}><Step t="구간 1" /></Td><Td l rs={2}>1등 아이패드 에어 + 스타벅스 쿠폰</Td><Td>실물 경품</Td><Td l>아이패드 에어</Td><Td rs={2}>10</Td><Td>{p1}</Td></tr>
                      <tr><Td>제휴사 쿠폰</Td><Td l>스타벅스 아메리카노 T</Td><Td>{p1b}</Td></tr>
                      <tr><Td><Step t="구간 2" /></Td><Td l>2등 스타벅스 아메리카노</Td><Td>제휴사 쿠폰</Td><Td l>스타벅스 아메리카노 T</Td><Td>{x.cap == null ? '전체' : nf(Math.max(0, x.cap - 10))}</Td><Td>{nf(p2)}</Td></tr>
                    </>
                  } />
                </FR>
              </G2>
              <Sub>리워드 정보 2</Sub>
              <G2>
                <FR l="리워드 수령 인원">전체</FR>
                <FR l="지급 완료 수">{nf(c2a + c2b)}</FR>
                <FR l="구간별 현황" full>
                  <MT cols={['선택지', '사용자 노출명', '리워드 유형', '유형 상세', '리워드 수령 인원', '지급 완료 수']} rows={
                    <>
                      <tr><Td><Step t="선택지 1" /></Td><Td l>T 플러스 포인트 3,000P</Td><Td>T 플러스 포인트</Td><Td l>3,000P</Td><Td>전체</Td><Td>{nf(c2a)}</Td></tr>
                      <tr><Td><Step t="선택지 2" /></Td><Td l>FLO 1개월 이용권</Td><Td>SKT 쿠폰·이용권</Td><Td l>FLO 1개월 이용권</Td><Td>전체</Td><Td>{nf(c2b)}</Td></tr>
                    </>
                  } />
                </FR>
              </G2>
            </>
          )}
        </Sec>
      </div>

      <div className="mt-6 flex justify-center">
        <button type="button" className={BTN} onClick={onBack}>목록</button>
      </div>
    </div>
  );
}
