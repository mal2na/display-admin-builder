'use client';

/**
 * 프로모션 상세 — 등록 폼에 입력한 값을 읽기 전용 텍스트로 보여준다.
 *  프로토타입은 폼 DOM 을 복제해 입력을 텍스트로 바꿨지만(buildDetail),
 *  React 에서는 같은 상태(PromoForm)를 읽어 직접 그린다. 조건은 빌더의 문장 미리보기를 그대로 쓴다.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Sect, Row, Hint, BTN, BTN_PRI } from './form-ui';
import { StatusPill } from '@/components/ops-ui';
import { sentence, type CondNode } from '@/lib/promotion/cond';
import { typeLabel } from '@/lib/promotion/reg-start';
import { SVC_PAGES, hexOk, type PromoForm } from '@/lib/promotion/form';
import { isAll, isPick, showTot, type RewardLine } from '@/lib/promotion/pr';
import { termById, isNotice, baseReq } from '@/lib/promotion/terms';

const dt = (v: string) => (v ? v.replace('T', ' ').replace(/-/g, '.') : '');
const V = ({ children }: { children: React.ReactNode }) => {
  const empty = children === '' || children === null || children === undefined;
  return <span className={cn('text-[14px] leading-[20px]', empty ? 'text-[var(--ink4)]' : 'text-[var(--ink)]')}>{empty ? '-' : children}</span>;
};
const Chips = ({ items }: { items: string[] }) =>
  items.length
    ? <span className="flex flex-wrap gap-1">{items.map((t) => <span key={t} className="rounded-[4px] bg-[var(--th)] px-2 py-0.5 text-[13px] text-[var(--ink2)]">{t}</span>)}</span>
    : <V>{''}</V>;
/** 조건 빌더 값 → 문장 */
const Cond = ({ nodes }: { nodes: CondNode[] }) => <V>{sentence(nodes) ?? ''}</V>;
const period = (a: string, b: string, noEnd?: boolean) =>
  (a || b || noEnd) ? `${dt(a) || '-'} ~ ${noEnd ? '종료일 없음' : dt(b) || '-'}` : '';
/** 리워드 줄들을 한 줄 요약으로 — 리워드 항목과 추천형 단계 카드가 같이 쓴다 */
const itemLines = (it: { lines: RewardLine[] }) =>
  it.lines.map((l) => [l.type, l.detail, l.pick.join('·'), l.method].filter(Boolean).join(' · ')).filter(Boolean);

export function PromoDetail({ f, onList, onEdit, onFo }: {
  f: PromoForm; onList: () => void; onEdit: () => void; onFo: () => void;
}) {
  const isGuide = f.type === '안내형';
  const limited = f.scope === '제한 공개';

  return (
    <div className="px-12 py-9 pb-28">
      <button type="button" onClick={onList} className="mb-2 text-[14px] text-[var(--ink3)] hover:text-[var(--ink)]">‹ 프로모션 관리</button>
      <nav className="flex items-center gap-1.5 text-[14px] leading-[20px] text-[var(--ink3)]">
        <span>홈</span><span className="opacity-60">›</span><span>프로모션 관리</span>
        <span className="opacity-60">›</span><b className="text-[var(--ink)]">프로모션 상세</b>
      </nav>
      <h1 className="mt-2 text-[24px] font-bold leading-[32px] tracking-[-0.6px] text-[var(--ink)]">프로모션 상세</h1>

      <div className="mt-6">
        <Sect title="프로모션 기본정보">
          <Row label="프로모션 유형"><V>{typeLabel(f.type)}{f.type === '참여ㆍ리워드형' ? ` · ${f.jm === '직접' ? '직접 참여(수동)' : '행동 연동(자동)'}` : ''}</V></Row>
          <Row label="프로모션 상태"><StatusPill label="등록 중" tone="info" /></Row>
          <Row label="프로모션 ID"><V>{''}</V><Hint>저장 시 자동 채번</Hint></Row>
          <Row label="프로모션 명"><V>{f.name}</V></Row>
          <Row label="서브 타이틀"><V>{f.sub}</V></Row>
          <Row label="전시 채널"><Chips items={f.channels} /></Row>
          <Row label="전시 상태"><V>{f.disp}</V></Row>
          <Row label="공개 범위"><V>{f.scope}</V></Row>
          {limited && (
            <>
              <Row label="공개 대상"><V>{f.access}</V></Row>
              {f.access === '조건 고객'
                ? <Row label="공개 조건"><Cond nodes={f.accessCond} /></Row>
                : <Row label="대상자 명단"><V>{f.target ? `${f.target.name} · 총 ${f.target.total.toLocaleString('ko-KR')}건 (성공 ${f.target.ok.toLocaleString('ko-KR')} / 실패 ${f.target.ng})` : ''}</V></Row>}
            </>
          )}
          <Row label="공유하기"><V>{f.share}</V></Row>
          <Row label="전시 기간"><V>{period(f.dispS, f.dispE, f.dispNoEnd)}</V></Row>
          {!isGuide && <Row label="참여 기간"><V>{period(f.joinS, f.joinE)}</V></Row>}
          <Row label="이벤트 목록 이미지"><V>{f.img}</V>{f.imgTag && <Hint>태그: {f.imgTag}</Hint>}</Row>
          <Row label="댓글 사용여부"><V>{f.cmt}</V></Row>
          {f.cmt === '사용' && (
            <>
              <Row label="댓글 차단여부"><V>{f.block}</V></Row>
              {f.block === '사용' && <Row label="댓글 차단 기간"><V>{period(f.blockS, f.blockE)}</V></Row>}
            </>
          )}
          {!isGuide && (
            <Row label="약관">
              {f.terms.length === 0 ? <V>{''}</V> : (
                <ul className="w-full space-y-1 text-[14px]">
                  {f.terms.map((m) => {
                    const t = termById(m.id); if (!t) return null;
                    return <li key={m.id}>{t.name} <span className="text-[var(--ink3)]">· {t.type} · 이벤트 적용 {m.req}</span></li>;
                  })}
                </ul>
              )}
            </Row>
          )}
          <Row label="유의사항"><span className="whitespace-pre-line text-[14px] leading-[20px]">{f.caution || <V>{''}</V>}</span></Row>
        </Sect>

        {/* 참여 정보 */}
        {f.type === '참여ㆍ리워드형' && (
          <Sect title="참여 정보">
            <Row label="참여 방식"><V>{f.jm === '직접' ? '직접 참여(수동)' : '행동 연동(자동)'}</V></Row>
            {f.jm === '직접' && (
              <Row label="참여 행동">
                <ul className="w-full space-y-1 text-[14px]">
                  {f.ja.map((j, i) => (
                    <li key={j.id}>
                      {f.ja.length > 1 && <b className="mr-1">{i + 1}.</b>}{j.type}
                      {j.type === '설문' && j.selId && <span className="text-[var(--ink3)]"> · {j.selId}</span>}
                      {j.type === '정보 입력' && <span className="text-[var(--ink3)]"> · {j.inKind}{j.inKind === '코드 입력' ? ` · ${j.codeKind}` : ` · ${j.comp}`}</span>}
                      {j.type === '즉시 결과형(룰렛)' && <span className="text-[var(--ink3)]"> · 결과 {j.results.length}개 (지급 {j.results.filter((r) => r.pay === 'Y').length})</span>}
                    </li>
                  ))}
                </ul>
              </Row>
            )}
            <Row label="참여 조건"><Cond nodes={f.joinCond} /></Row>
            <Row label="참여 횟수 기준"><V>{f.cycle}{f.cycle === '주기별' ? ` · ${f.cycleUnit}` : ''}</V></Row>
            <Row label="최대 참여 횟수"><V>{f.maxJoin ? `${f.maxJoin}회` : ''}</V></Row>
            <Row label="중복 참여 판별 기준"><V>{f.dup}</V></Row>
            <GuestDetail f={f} />
          </Sect>
        )}

        {/* 추천형 참여 정보 */}
        {f.type === '추천형' && (
          <Sect title="참여 정보">
            <Row label="초대자 참여 조건"><Cond nodes={f.ref.invCond} /></Row>
            <Row label="피초대자 참여 조건"><Cond nodes={f.ref.ineCond} /></Row>
            <Row label="최대 초대 인정 수"><V>{f.ref.invLimit === '제한' ? `${f.ref.maxInvite || '-'}명` : '제한 없음'}</V></Row>
            <Row label="추천 관계 판정"><V>CI 기준</V></Row>
            <GuestDetail f={f} />
          </Sect>
        )}

        {/* 리워드 */}
        {f.type === '참여ㆍ리워드형' && (
          <Sect title="리워드 정보">
            {f.blocks.map((b, i) => (
              <div key={b.id} className="border-b border-[var(--line)] p-4">
                {f.blocks.length > 1 && <b className="mb-2 block text-[14px]">리워드 정보 {i + 1}</b>}
                <div className="border-t border-[var(--line2)]">
                  <Row label="리워드 구성 유형"><V>{b.selM}{isPick(b) && b.selN ? ` · 선택 가능 ${b.selN}개` : ''}</V></Row>
                  <Row label="대상자 선정 방식"><V>{b.winWay}{b.winWay === '추첨' ? ` · ${b.draw}` : ''}</V></Row>
                  {showTot(b) && <Row label="전체 리워드 수령 인원"><V>{b.tot ? `${Number(b.tot).toLocaleString('ko-KR')}명` : ''}</V></Row>}
                  <Row label="대상자 선정 시점"><V>{b.winAt}</V></Row>
                  <Row label="선정 안내"><V>{b.notice}</V></Row>
                  <Row label="지급 조건"><Cond nodes={b.payCond} /></Row>
                </div>
                <ul className="mt-3 space-y-1.5 text-[14px]">
                  {b.items.map((it, k) => (
                    <li key={it.id} className="rounded-[8px] bg-[var(--th)] p-2.5">
                      <b>{isPick(b) ? `선택지 ${k + 1}` : `구간 ${k + 1}`} · {it.name || '-'}</b>
                      <span className="ml-1 text-[var(--ink3)]">{isAll(b) ? '전체' : it.cnt ? `${Number(it.cnt).toLocaleString('ko-KR')}명` : '-'}</span>
                      <span className="mt-0.5 block text-[13px] text-[var(--ink2)]">{itemLines(it).join(' / ') || '리워드 미설정'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Sect>
        )}

        {f.type === '추천형' && (
          <Sect title="리워드 정보">
            <div className="border-b border-[var(--line)] p-4">
              <b className="block text-[14px]">초대자 리워드</b>
              <div className="mt-2 border-t border-[var(--line2)]">
                <Row label="초대자 지급 조건"><Cond nodes={f.ref.invPayCond} /></Row>
              </div>
              <ul className="mt-2 space-y-1.5 text-[14px]">
                {f.ref.inviter.map((c, i) => (
                  <li key={c.id} className="rounded-[8px] bg-[var(--th)] p-2.5">
                    <b>{i + 1}단계 · {c.thr || '-'}명 초대</b>
                    <span className="ml-1 text-[var(--ink3)]">{c.name || '-'}</span>
                    <span className="mt-0.5 block text-[13px] text-[var(--ink2)]">{itemLines(c).join(' / ') || '리워드 미설정'}</span>
                  </li>
                ))}
              </ul>
              <b className="mt-5 block text-[14px]">피초대자 리워드</b>
              <div className="mt-2 border-t border-[var(--line2)]">
                <Row label="피초대자 지급 조건"><Cond nodes={f.ref.inePayCond} /></Row>
              </div>
              <div className="mt-2 rounded-[8px] bg-[var(--th)] p-2.5 text-[14px]">
                <b>{f.ref.invitee.name || '-'}</b>
                <span className="mt-0.5 block text-[13px] text-[var(--ink2)]">{itemLines(f.ref.invitee).join(' / ') || '리워드 미설정'}</span>
              </div>
            </div>
          </Sect>
        )}

        {/* CTA */}
        <Sect title="하단 CTA 정보">
          <Row label="하단 CTA 사용여부"><V>{f.cta}</V></Row>
          {f.cta === '사용' && f.ctas.map((c, i) => (
            <Row key={c.id} label={f.ctas.length > 1 ? `하단 CTA ${i + 1}` : '하단 CTA'}>
              <span className="grid h-8 min-w-[110px] place-items-center rounded-[6px] px-3 text-[13px] font-bold"
                style={{ background: hexOk(c.bg) ?? '#000000', color: hexOk(c.fg) ?? '#FFFFFF' }}>
                {c.name || '버튼명'}
              </span>
              <V>{c.type}</V>
              {c.type === '링크 버튼' && (
                <Hint>
                  {c.link === 'URL' ? (c.url || '-') : `${c.pg || '-'}${SVC_PAGES.find((p) => p.id === c.pg)?.name ? ` (${SVC_PAGES.find((p) => p.id === c.pg)!.name})` : ''}`}
                  {' · '}{c.open}
                </Hint>
              )}
              <Hint>{c.per === '직접 지정' ? period(c.ps, c.pe) : '상시 노출'}</Hint>
            </Row>
          ))}
        </Sect>

        {/* 검색 · 태그 */}
        <Sect title="검색 및 태그 정보">
          <Row label="검색 노출 여부"><V>{limited ? '미노출' : f.search}</V></Row>
          {!limited && f.search === '노출' && (
            <>
              <Row label="검색 태그"><Chips items={f.tags} /></Row>
              <Row label="메타 태그 설정">
                <span className="w-full space-y-0.5 text-[14px]">
                  <span className="block"><span className="text-[var(--ink3)]">keywords</span> {f.keywords || '-'}</span>
                  <span className="block"><span className="text-[var(--ink3)]">description</span> {f.name || '-'}</span>
                  <span className="block"><span className="text-[var(--ink3)]">og:title</span> {f.ogTitle || '-'}</span>
                  <span className="block"><span className="text-[var(--ink3)]">og:description</span> {f.ogDesc || '-'}</span>
                </span>
              </Row>
            </>
          )}
        </Sect>

        <Sect title="프로모션 담당자 정보">
          <Row label="등록자"><V>홍길동(P123456)</V></Row>
          <Row label="등록일시"><V>{''}</V></Row>
          <Row label="최종수정자"><V>홍길동(P123456)</V></Row>
          <Row label="최종수정일시"><V>{''}</V></Row>
        </Sect>

        <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-6">
          <button type="button" className={BTN} onClick={onList}>목록</button>
          <div className="ml-auto flex gap-2">
            <button type="button" className={BTN} onClick={onFo}>FO 미리보기</button>
            <button type="button" className={BTN_PRI} onClick={onEdit}>수정</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GuestDetail({ f }: { f: PromoForm }) {
  return (
    <>
      <Row label="비회원 참여"><V>{f.guest}</V></Row>
      {f.guest === '허용' && (
        <>
          <Row label="개인정보 입력 항목">
            <ul className="w-full space-y-0.5 text-[14px]">
              {f.guestFields.filter((g) => g.use).map((g) => (
                <li key={g.name}>{g.name} <span className="text-[var(--ink3)]">· {g.req} · {g.at}</span></li>
              ))}
            </ul>
          </Row>
          <Row label="본인 확인"><V>{f.guestAuth}</V></Row>
          <Row label="비회원 약관">
            <ul className="w-full space-y-0.5 text-[14px]">
              {f.guestTerms.map((m) => {
                const t = termById(m.id); if (!t) return null;
                return <li key={m.id}>{t.name} <span className="text-[var(--ink3)]">· {isNotice(t.cons) ? '필수(고지)' : baseReq(t.cons)}</span></li>;
              })}
            </ul>
          </Row>
        </>
      )}
    </>
  );
}
