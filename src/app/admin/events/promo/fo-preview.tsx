'use client';

/**
 * FO 미리보기 — 지금 입력한 값으로 고객 화면을 흉내 낸다.
 *  프로토타입은 미리 만든 예시(PRESETS)를 보여줬지만, 여기선 **작성 중인 폼 상태**를 그대로 읽는다.
 *  예시용 임의 화면이라 실제 디자인과 다르다.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { BTN } from './form-ui';
import { hexOk, type PromoForm } from '@/lib/promotion/form';
import { isAll, isPick, type RewardBlock, type RewardItem } from '@/lib/promotion/pr';
import { CTA_JOIN } from '@/lib/promotion/form';

const fmtD = (v: string) => (v ? v.slice(0, 10).replace(/-/g, '.') : '');
/** 리워드 항목의 지급 방식 배지 */
const wayBadge = (b: RewardBlock, it: RewardItem) =>
  isAll(b) ? '전원 증정'
    : b.winWay === '추첨' ? `추첨 ${(Number(it.cnt) || 0).toLocaleString('ko-KR')}명`
      : `선착순 ${(Number(it.cnt) || 0).toLocaleString('ko-KR')}명`;
/** 항목에 달린 리워드 줄들을 한 줄 문구로 */
const lineTxt = (it: { lines: { type: string; detail: string }[] }) =>
  it.lines.map((l) => l.detail || l.type).filter(Boolean).join(' + ') || '리워드 미설정';

export function FoPreview({ f, onBack }: { f: PromoForm; onBack: () => void }) {
  const isRef = f.type === '추천형';
  const [view, setView] = React.useState<'inviter' | 'invitee'>('inviter');
  const [picked, setPicked] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
  const [issued, setIssued] = React.useState(false);
  const [toast, setToast] = React.useState('');
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const say = (m: string) => { setToast(m); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setToast(''), 2200); };
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const asInvitee = isRef && view === 'invitee';
  const period = f.type === '안내형'
    ? [fmtD(f.dispS), f.dispNoEnd ? '' : fmtD(f.dispE)]
    : [fmtD(f.joinS), fmtD(f.joinE)];
  const cautions = f.caution.split('\n').map((t) => t.replace(/^·\s?/, '').trim()).filter(Boolean);

  return (
    <div className="px-12 py-9 pb-28">
      <button type="button" onClick={onBack} className="mb-2 text-[14px] text-[var(--ink3)] hover:text-[var(--ink)]">‹ 돌아가기</button>
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="m-0 text-[24px] font-bold leading-[32px] tracking-[-0.6px] text-[var(--ink)]">FO 미리보기</h1>
        <span className="pb-1 text-[13px] text-[var(--ink3)]">예시용 임의 화면이에요 · 실제 디자인과 달라요</span>
      </div>

      {isRef && (
        <div className="mt-4 flex gap-1 rounded-[10px] bg-[var(--th)] p-1" role="group" aria-label="진입 화면">
          {([['inviter', '초대자 화면'], ['invitee', '피초대자 화면 (링크 진입)']] as const).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={view === k} onClick={() => setView(k)}
              className={cn('rounded-[8px] px-4 py-2 text-[14px] font-semibold',
                view === k ? 'bg-white text-[var(--ac)] shadow-[0_0_2px_0_#2222221a]' : 'text-[var(--ink2)]')}>
              {l}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 flex justify-center">
        <div className="relative flex h-[720px] w-[360px] flex-col overflow-hidden rounded-[28px] border-[8px] border-[#1a1a1a] bg-white">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {/* 히어로 */}
            <div className="px-5 py-8 text-white" style={{ background: 'var(--ac)' }}>
              <h3 className="m-0 text-[20px] font-bold leading-[28px]">{f.name || '프로모션 명이 노출됩니다'}</h3>
              <p className="mt-1.5 text-[14px] leading-[20px] opacity-90">{f.sub || '서브 타이틀이 노출됩니다'}</p>
            </div>
            <div className="border-b border-[var(--line)] bg-[var(--th)] px-5 py-2.5 text-[13px] text-[var(--ink2)]">
              {f.type === '안내형' ? '기간' : '참여 기간'} · {period[0] || '-'} ~ {period[1] || (f.dispNoEnd ? '종료일 없음' : '-')}
            </div>

            <div className="space-y-5 px-5 py-5">
              {/* 참여ㆍ리워드형 */}
              {f.type === '참여ㆍ리워드형' && (
                <>
                  {f.jm === '행동' && (
                    <div className="rounded-[10px] bg-[var(--ac2)] p-3 text-[13px] leading-[19px] text-[var(--ink2)]">
                      <b className="block text-[var(--ac)]">자동 응모</b>
                      참여 조건을 충족하면 따로 응모하지 않아도 자동으로 참여돼요.
                      <span className="mt-1 block text-[12px] text-[var(--ink3)]">참여 현황 · 아직 조건을 충족하지 않았어요</span>
                    </div>
                  )}
                  {f.blocks.map((b, bi) => {
                    const pick = isPick(b);
                    return (
                      <section key={b.id}>
                        <h4 className="m-0 text-[15px] font-bold">{pick ? '원하는 혜택을 골라주세요' : bi === 0 ? '이벤트 혜택' : '추가 혜택'}</h4>
                        {pick && (
                          <p className="mt-1 text-[13px] text-[var(--ink3)]">
                            {isAll(b) ? '하나를 고르면 바로 받을 수 있어요' : '고른 경품으로 응모돼요 · 발표 후 개별 안내'}
                          </p>
                        )}
                        <div className={cn('mt-2', pick ? 'grid grid-cols-2 gap-2' : 'space-y-2')}>
                          {b.items.map((it, ci) => {
                            const id = `${bi}-${ci}`;
                            return pick ? (
                              <button
                                key={it.id} type="button" disabled={done} onClick={() => setPicked(id)}
                                className={cn('rounded-[10px] border p-3 text-left',
                                  picked === id ? 'border-[var(--ac)] bg-[var(--ac2)]' : 'border-[var(--line2)]',
                                  done && 'opacity-50')}
                              >
                                <b className="block text-[13px]">{it.name || '노출명'}</b>
                                <small className="mt-0.5 block text-[12px] text-[var(--ink3)]">{wayBadge(b, it)}</small>
                              </button>
                            ) : (
                              <div key={it.id} className="rounded-[10px] border border-[var(--line2)] p-3">
                                <span className="rounded-[4px] bg-[var(--th)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--ink3)]">{wayBadge(b, it)}</span>
                                <b className="mt-1 block text-[14px]">{it.name || '노출명'}</b>
                                <small className="text-[12px] text-[var(--ink3)]">{lineTxt(it)}</small>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </>
              )}

              {/* 추천형 */}
              {isRef && (asInvitee ? (
                <>
                  <div className="rounded-[10px] bg-[var(--ac2)] p-3 text-[13px] leading-[19px] text-[var(--ink2)]">
                    <b className="block text-[var(--ac)]">친구가 초대했어요</b>
                    아래 혜택을 받으려면 피초대자 참여 조건을 충족해야 해요.
                  </div>
                  <section>
                    <h4 className="m-0 text-[15px] font-bold">초대받은 친구 혜택</h4>
                    <div className="mt-2 rounded-[10px] border border-[var(--line2)] p-3">
                      <span className="rounded-[4px] bg-[var(--th)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--ink3)]">친구 혜택</span>
                      <b className="mt-1 block text-[14px]">{f.ref.invitee.name || '노출명'}</b>
                      <small className="text-[12px] text-[var(--ink3)]">{lineTxt(f.ref.invitee)}</small>
                    </div>
                  </section>
                </>
              ) : (
                <>
                  <section>
                    <h4 className="m-0 text-[15px] font-bold">친구를 초대할수록 커지는 혜택</h4>
                    <p className="mt-1 text-[13px] text-[var(--ink3)]">지금까지 초대 성공 <b>0명</b></p>
                    <div className="mt-2 space-y-1.5">
                      {f.ref.inviter.map((c, i) => (
                        <div key={c.id} className="flex items-center gap-2 rounded-[10px] border border-[var(--line2)] p-2.5">
                          <span className="shrink-0 rounded-[4px] bg-[var(--ac2)] px-1.5 py-0.5 text-[11px] font-bold text-[var(--ac)]">{i + 1}단계</span>
                          <span className="min-w-0">
                            <b className="block text-[13px]">{c.thr || 'N'}명 초대</b>
                            <small className="text-[12px] text-[var(--ink3)]">{c.name || '노출명'} · {lineTxt(c)}</small>
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                  <section>
                    <h4 className="m-0 text-[15px] font-bold">초대받은 친구도 받아요</h4>
                    <div className="mt-2 rounded-[10px] border border-[var(--line2)] p-3">
                      <span className="rounded-[4px] bg-[var(--th)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--ink3)]">친구 혜택</span>
                      <b className="mt-1 block text-[14px]">{f.ref.invitee.name || '노출명'}</b>
                      <small className="text-[12px] text-[var(--ink3)]">{lineTxt(f.ref.invitee)}</small>
                    </div>
                  </section>
                  {issued && (
                    <div className="rounded-[10px] bg-[var(--th)] p-3 text-center">
                      <small className="block text-[12px] text-[var(--ink3)]">내 추천 코드 · 초대 링크</small>
                      <b className="mt-1 block font-mono text-[18px] tracking-wider">FRIEND24</b>
                      <small className="block text-[12px] text-[var(--ink3)]">https://example.com/e?code=FRIEND24</small>
                    </div>
                  )}
                </>
              ))}

              {cautions.length > 0 && (
                <details className="rounded-[10px] border border-[var(--line2)] p-3">
                  <summary className="cursor-pointer text-[13px] font-bold">유의사항</summary>
                  <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[12px] leading-[18px] text-[var(--ink2)]">
                    {cautions.map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                </details>
              )}
            </div>
          </div>

          {/* 하단 CTA */}
          {f.cta === '사용' && f.ctas.length > 0 && (
            <div className="shrink-0 space-y-1.5 border-t border-[var(--line)] bg-white p-3">
              {f.ctas.map((c) => {
                let label = c.name || '버튼명이 노출됩니다';
                if (c.type === CTA_JOIN && done) label = '응모 완료';
                if (c.type === '추천 코드 발급 버튼' && issued) label = '링크 공유하기';
                return (
                  <button
                    key={c.id} type="button" disabled={c.type === CTA_JOIN && done}
                    onClick={() => {
                      if (c.type === '링크 버튼') { say(`외부 페이지로 이동해요 (${c.url || c.pg || 'URL'})`); return; }
                      if (c.type === CTA_JOIN) {
                        const needPick = f.blocks.some((b) => isPick(b));
                        if (needPick && !picked) { say('먼저 원하는 혜택을 골라주세요.'); return; }
                        setDone(true); say(needPick ? '응모가 완료됐어요. 선택한 혜택으로 참여했어요.' : '응모가 완료됐어요.');
                        return;
                      }
                      if (c.type === '추천 코드 발급 버튼') {
                        if (issued) { say('공유하기 창이 열려요.'); return; }
                        setIssued(true); say('추천 코드와 초대 링크가 발급됐어요. 링크로 들어온 친구는 코드 입력 없이 추천이 인정돼요.');
                        return;
                      }
                      say(`${c.type} 동작 (목업)`);
                    }}
                    className="grid h-11 w-full place-items-center rounded-[10px] text-[15px] font-bold disabled:opacity-60"
                    style={{ background: hexOk(c.bg) ?? '#000000', color: hexOk(c.fg) ?? '#FFFFFF' }}
                  >{label}</button>
                );
              })}
            </div>
          )}

          {toast && (
            <div className="pointer-events-none absolute bottom-24 left-1/2 z-10 w-[280px] -translate-x-1/2 rounded-[8px] bg-[var(--toast-bg)] px-3 py-2 text-center text-[12px] leading-[17px] text-white">
              {toast}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <button type="button" className={BTN} onClick={onBack}>돌아가기</button>
      </div>
    </div>
  );
}
