'use client';

/**
 * 리워드 정보 — 블록(선정 규칙 + 지급 조건) → 항목(구간/선택지) → 리워드 줄(유형·지급).
 *  잠기는 값(룰렛·자동 참여 등)은 pr.ts 의 blockLock/applyRules 가 정하고 여기선 표시만 한다.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { CondBuilder } from './cond-builder';
import { ListPicker } from './join-actions';
import { Row, Hint, Rd, RdPair, BTN_SM, BTN_PILL, INP, SEL, DT } from './form-ui';
import { validate as validateCond } from '@/lib/promotion/cond';
import {
  RTYPES, PAY_M, PAY_OK, RPICK, RPICK_SAMPLE, newItem, newLine, newBlock,
  blockLock, allocBadge, isAll, isPick, showTot,
  type PrState, type RewardBlock, type RewardItem, type RewardLine,
} from '@/lib/promotion/pr';

export function RewardSection({ pr, onChange, E, onToast }: {
  pr: PrState; onChange: (s: PrState) => void; E: Record<string, string>; onToast: (m: string) => void;
}) {
  const setBlock = (id: number, p: Partial<RewardBlock>) =>
    onChange({ ...pr, blocks: pr.blocks.map((b) => (b.id === id ? { ...b, ...p } : b)) });
  const roulFirst = blockLock(pr, pr.blocks[0], true).roul;

  return (
    <>
      {pr.blocks.map((b, i) => (
        <BlockView
          key={b.id} b={b} idx={i} total={pr.blocks.length} pr={pr} E={E} onToast={onToast}
          onSet={(p) => setBlock(b.id, p)}
          onDel={() => onChange({ ...pr, blocks: pr.blocks.filter((x) => x.id !== b.id) })}
        />
      ))}
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        {roulFirst && <Hint>참여 행동에 룰렛이 있으면 리워드 정보는 1개만 등록할 수 있어요</Hint>}
        {!roulFirst && (
          <button type="button" className={BTN_SM} onClick={() => onChange({ ...pr, blocks: pr.blocks.concat(newBlock()) })}>
            리워드 정보 추가
          </button>
        )}
      </div>
    </>
  );
}

function BlockView({ b, idx, total, pr, E, onSet, onDel, onToast }: {
  b: RewardBlock; idx: number; total: number; pr: PrState; E: Record<string, string>;
  onSet: (p: Partial<RewardBlock>) => void; onDel: () => void; onToast: (m: string) => void;
}) {
  const L = blockLock(pr, b, idx === 0);
  const badge = allocBadge(b);
  const pick = isPick(b);
  const setItem = (id: number, p: Partial<RewardItem>) => onSet({ items: b.items.map((it) => (it.id === id ? { ...it, ...p } : it)) });

  return (
    <div className="mt-4 rounded-[12px] border border-[var(--line2)] p-4 first:mt-0">
      {total > 1 && (
        <div className="mb-3 flex items-center gap-2">
          <b className="text-[14px]">리워드 정보 {idx + 1}</b>
          <button type="button" className={cn(BTN_SM, 'ml-auto')} onClick={onDel}>리워드 정보 삭제</button>
        </div>
      )}

      <div className="border-t border-[var(--line2)]">
        <Row label="리워드 구성 유형">
          <span className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {(['구간형', '선택형'] as const).map((o) => (
              <Rd key={o} on={b.selM === o} disabled={o === '선택형' && L.pickLocked} onChange={() => onSet({ selM: o })}>{o}</Rd>
            ))}
          </span>
          {L.selMNote && <Hint>{L.selMNote}</Hint>}
        </Row>
        {pick && (
          <Row label="리워드 선택 가능 수" req err={E[`selN${b.id}`]}>
            <span id={`err-selN${b.id}`} />
            <input type="number" min={1} value={b.selN} onChange={(e) => onSet({ selN: e.target.value })} placeholder="N" className={cn(INP, 'w-[110px]')} /> 개
          </Row>
        )}
        <Row label="대상자 선정 방식">
          <span className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {(['전원', '선착순', '추첨'] as const).map((o) => (
              <Rd key={o} on={b.winWay === o} disabled={L.winWayLocked && o !== '추첨'} onChange={() => onSet({ winWay: o })}>{o}</Rd>
            ))}
          </span>
          {L.wayNote && <Hint>{L.wayNote}</Hint>}
        </Row>
        {b.winWay === '추첨' && (
          <Row label="추첨 방식">
            <span className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {(['수동', '자동'] as const).map((o) => (
                <Rd key={o} on={b.draw === o} disabled={L.drawLocked && o !== '자동'} onChange={() => onSet({ draw: o })}>
                  {o === '수동' ? '수동 (대상자 등록)' : '자동 (시스템 무작위)'}
                </Rd>
              ))}
            </span>
            <Hint>수동: 이벤트 종료 후 대상자 엑셀 업로드 · 자동: 선정 시점에 지급 조건을 충족한 대상자 중 단순 랜덤으로 선정</Hint>
            {L.drawNote && <Hint>{L.drawNote}</Hint>}
          </Row>
        )}
        {showTot(b) && (
          <Row label="전체 리워드 수령 인원" req err={E[`tot${b.id}`]}>
            <span id={`err-tot${b.id}`} />
            <input type="number" min={1} value={b.tot} onChange={(e) => onSet({ tot: e.target.value })} placeholder="N" className={cn(INP, 'w-[130px]')} /> 명
            <Hint>리워드 목록의 리워드별 수령 인원 합계와 일치해야 해요</Hint>
          </Row>
        )}
        <Row label="대상자 선정 시점">
          <span className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {(['실시간', '사후'] as const).map((o) => (
              <Rd key={o} on={b.winAt === o}
                disabled={(o === '실시간' && L.realtimeLocked) || (o === '사후' && L.postLocked)}
                onChange={() => onSet({ winAt: o })}>{o}</Rd>
            ))}
          </span>
          {L.winAtNote && <Hint>{L.winAtNote}</Hint>}
        </Row>
        <Row label="선정 안내">
          <select value={b.notice} onChange={(e) => onSet({ notice: e.target.value })} className={cn(SEL, 'w-[200px]')}>
            <option>일반 선정 안내</option><option>안내 안 함</option>
          </select>
        </Row>
        <Row label="지급 조건">
          <CondBuilder ctx="pay" value={b.payCond} onChange={(nodes) => onSet({ payCond: nodes })} errors={validateCond(b.payCond).errors} />
        </Row>
      </div>

      {/* 리워드 목록 */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <b className="text-[14px]">리워드 목록</b>
        <Hint>
          {pick
            ? '선택지 = 고객이 고르는 항목 · 순서 = FO 카드 노출 순서 · 선택지마다 지급할 리워드를 등록해요'
            : `구간 = 선정 구간(예: 1등·2등) · 구간마다 지급할 리워드를 등록해요${L.roul ? ' · 룰렛 결과 중 지급 여부가 Y인 순서대로 구간이 만들어져요 (번호 일치)' : ''}`}
        </Hint>
      </div>
      <div className="mt-2 space-y-3">
        {b.items.map((it, k) => (
          <ItemCard
            key={it.id} it={it} idx={k} total={b.items.length} b={b} roul={L.roul} E={E} onToast={onToast}
            onSet={(p) => setItem(it.id, p)}
            onDel={() => onSet({ items: b.items.filter((x) => x.id !== it.id) })}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {!L.roul && <button type="button" className={BTN_SM} onClick={() => onSet({ items: b.items.concat(newItem()) })}>리워드 항목 추가</button>}
        {badge && (
          <span className={cn('rounded-[4px] px-2 py-0.5 text-[12px] font-semibold',
            badge.tone === 'ok' ? 'bg-[var(--okbg)] text-[var(--ok)]'
              : badge.tone === 'bad' ? 'bg-[var(--badbg)] text-[var(--bad)]'
                : 'bg-[var(--neutralbg)] text-[var(--ink2)]')}>
            {badge.text}
          </span>
        )}
      </div>
      {E[`rb${b.id}`] && <p id={`err-rb${b.id}`} className="mt-1.5 text-[13px] text-[var(--bad)]">{E[`rb${b.id}`]}</p>}
    </div>
  );
}

function ItemCard({ it, idx, total, b, roul, E, onSet, onDel, onToast }: {
  it: RewardItem; idx: number; total: number; b: RewardBlock; roul: boolean; E: Record<string, string>;
  onSet: (p: Partial<RewardItem>) => void; onDel: () => void; onToast: (m: string) => void;
}) {
  const pick = isPick(b);
  const needCnt = !isAll(b);
  const setLine = (id: number, p: Partial<RewardLine>) => onSet({ lines: it.lines.map((l) => (l.id === id ? { ...l, ...p } : l)) });

  return (
    <div className="rounded-[10px] border border-[var(--line2)] bg-[var(--th)] p-3">
      <div className="flex flex-wrap items-end gap-3">
        <span className="rounded-[4px] bg-[var(--ac2)] px-2 py-0.5 text-[12px] font-bold text-[var(--ac)]">
          {pick ? `선택지 ${idx + 1}` : `구간 ${idx + 1}`}
        </span>
        <label className="min-w-[220px] flex-1">
          <span className="block text-[12px] font-semibold text-[var(--ink3)]">사용자 노출명<span className="text-[var(--bad)]">*</span></span>
          <input value={it.name} onChange={(e) => onSet({ name: e.target.value })} placeholder="노출명을 입력해주세요 (예: 1등 아이패드 세트)" className={cn(INP, 'mt-1 w-full bg-white')} />
          {E[`it${it.id}_name`] && <span id={`err-it${it.id}_name`} className="mt-1 block text-[13px] text-[var(--bad)]">{E[`it${it.id}_name`]}</span>}
        </label>
        <label className="w-[160px]">
          <span className="block text-[12px] font-semibold text-[var(--ink3)]">리워드 수령 인원{needCnt && <span className="text-[var(--bad)]">*</span>}</span>
          {needCnt
            ? <input type="number" min={1} value={it.cnt} onChange={(e) => onSet({ cnt: e.target.value })} placeholder="N" className={cn(INP, 'mt-1 w-full bg-white')} />
            : <span className="mt-1 block h-[38px] rounded-[var(--r-field)] border border-[var(--line2)] bg-[var(--surface-sunken)] px-[14px] leading-[36px] text-[14px] text-[var(--ink3)]">전체</span>}
          {E[`it${it.id}_cnt`] && <span id={`err-it${it.id}_cnt`} className="mt-1 block text-[13px] text-[var(--bad)]">{E[`it${it.id}_cnt`]}</span>}
        </label>
        {total > 1 && !roul && <button type="button" className={BTN_SM} onClick={onDel}>항목 삭제</button>}
      </div>

      <div className="mt-3 space-y-2">
        {it.lines.map((l, j) => (
          <LineView
            key={l.id} l={l} idx={j} total={it.lines.length} E={E} onToast={onToast}
            onSet={(p) => setLine(l.id, p)}
            onDel={() => onSet({ lines: it.lines.filter((x) => x.id !== l.id) })}
          />
        ))}
      </div>
      <button type="button" className={cn(BTN_SM, 'mt-2')} onClick={() => onSet({ lines: it.lines.concat(newLine()) })}>리워드 추가</button>
    </div>
  );
}

const LF = ({ label, req, err, children }: { label: string; req?: boolean; err?: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-[110px_1fr] items-start gap-2 py-1">
    <span className="pt-2 text-[13px] leading-[20px] text-[var(--ink3)]">{label}{req && <span className="text-[var(--bad)]">*</span>}</span>
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2 text-[14px]">{children}</div>
      {err && <p className="mt-1 text-[13px] text-[var(--bad)]">{err}</p>}
    </div>
  </div>
);

/** 리워드 줄 — 리워드 목록과 추천형 단계 카드가 같이 쓴다 */
export function LineView({ l, idx, total, E, onSet, onDel, onToast }: {
  l: RewardLine; idx: number; total: number; E: Record<string, string>;
  onSet: (p: Partial<RewardLine>) => void; onDel: () => void; onToast: (m: string) => void;
}) {
  const [pickOpen, setPickOpen] = React.useState(false);
  const k = `rw${l.id}`;
  const ok = PAY_OK[l.type] ?? PAY_M;
  const claim = l.method === '고객 수령';
  const manual = l.method === 'SKT 담당자 수기 지급' || l.method === '대행사·제휴사 지급';
  const rp = RPICK[l.type];

  return (
    <div className="rounded-[8px] border border-[var(--line)] bg-white p-3">
      <div className="flex items-center gap-2">
        <b className="text-[13px] text-[var(--ink2)]">리워드 {idx + 1}</b>
        {total > 1 && <button type="button" className={cn(BTN_SM, 'ml-auto')} onClick={onDel}>삭제</button>}
      </div>

      <div className="mt-1 grid gap-x-6 md:grid-cols-2">
        <div>
          <LF label="유형" req err={E[`${k}_type`]}>
            <span id={`err-${k}_type`} />
            <select value={l.type} onChange={(e) => onSet({ type: e.target.value })} className={cn(SEL, 'w-[240px]')}>
              <option value="">선택</option>
              {RTYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </LF>

          {/* 유형 상세 */}
          {!l.type && <LF label="유형 상세"><Hint>유형을 먼저 선택해주세요</Hint></LF>}
          {rp && (
            <LF label={rp[1]} req err={E[`${k}_pick`]}>
              <span id={`err-${k}_pick`} />
              {l.pick.map((p) => (
                <span key={p} className="inline-flex items-center gap-1 rounded-[4px] bg-[var(--ac2)] px-2 py-0.5 text-[13px] text-[var(--ac)]">
                  {p}<button type="button" onClick={() => onSet({ pick: l.pick.filter((x) => x !== p) })} className="font-bold">×</button>
                </span>
              ))}
              <button type="button" className={BTN_PILL} onClick={() => setPickOpen(true)}>{rp[2]}</button>
            </LF>
          )}
          {l.type === '실물 경품' && (
            <LF label="경품명" req err={E[`${k}_detail`]}>
              <span id={`err-${k}_detail`} />
              <input value={l.detail} onChange={(e) => onSet({ detail: e.target.value })} placeholder="경품명을 입력해주세요" className={cn(INP, 'w-full max-w-[320px]')} />
            </LF>
          )}
          {l.type === 'T 플러스 포인트' && (
            <>
              <LF label="지급 포인트" req err={E[`${k}_point`]}>
                <span id={`err-${k}_point`} />
                <input type="number" min={1} value={l.point} onChange={(e) => onSet({ point: e.target.value })} placeholder="숫자를 입력해주세요" className={cn(INP, 'w-[160px]')} /> P
              </LF>
              <LF label="사용 가능 시기">
                <select value={l.usable} onChange={(e) => onSet({ usable: e.target.value })} className={cn(SEL, 'w-[200px]')}>
                  <option>즉시 지급</option><option>7일 후 가용 전환</option>
                </select>
              </LF>
              <LF label="소멸 예정일" req err={E[`${k}_expire`]}>
                <span id={`err-${k}_expire`} />
                <input type="datetime-local" value={l.expire} onChange={(e) => onSet({ expire: e.target.value })} className={DT} />
              </LF>
            </>
          )}
          {l.type === '데이터 혜택' && (
            <>
              <LF label="데이터 용량" req err={E[`${k}_dataAmt`]}>
                <span id={`err-${k}_dataAmt`} />
                <input type="number" min={1} value={l.dataAmt} onChange={(e) => onSet({ dataAmt: e.target.value })} placeholder="숫자" className={cn(INP, 'w-[120px]')} />
                <select value={l.dataUnit} onChange={(e) => onSet({ dataUnit: e.target.value as 'GB' | 'MB' })} className={cn(SEL, 'w-[90px]')}><option>GB</option><option>MB</option></select>
              </LF>
              <LF label="사용 기한" req err={E[`${k}_dataExp`]}>
                <span id={`err-${k}_dataExp`} />
                <input type="datetime-local" value={l.dataExp} onChange={(e) => onSet({ dataExp: e.target.value })} className={DT} />
              </LF>
            </>
          )}
          {(l.type === '제휴사 쿠폰' || l.type === '제휴사 바우처') && (() => {
            const kind = l.type === '제휴사 바우처' ? '바우처' : '쿠폰';
            return (
              <>
                <LF label={`제휴사 ${kind} 연동코드`} req err={E[`${k}_code`]}>
                  <span id={`err-${k}_code`} />
                  <input value={l.code} onChange={(e) => onSet({ code: e.target.value })} placeholder={`제휴사 ${kind}코드를 입력해주세요`} className={cn(INP, 'w-full max-w-[320px]')} />
                </LF>
                <LF label="제휴사 URL" req err={E[`${k}_url`]}>
                  <span id={`err-${k}_url`} />
                  <input value={l.url} onChange={(e) => onSet({ url: e.target.value })} placeholder={`제휴사 ${kind} 등록 URL을 입력해주세요`} className={cn(INP, 'w-full max-w-[320px]')} />
                </LF>
                <LF label="제휴사 URL 버튼명" req err={E[`${k}_btn`]}>
                  <span id={`err-${k}_btn`} />
                  <input value={l.btn} onChange={(e) => onSet({ btn: e.target.value })} placeholder="제휴사 URL 버튼명을 입력해주세요" className={cn(INP, 'w-full max-w-[320px]')} />
                </LF>
              </>
            );
          })()}
        </div>

        <div>
          <LF label="지급 방식" req err={E[`${k}_method`]}>
            <span id={`err-${k}_method`} />
            <select value={l.method} onChange={(e) => onSet({ method: e.target.value })} className={cn(SEL, 'w-[220px]')}>
              <option value="">선택</option>
              {PAY_M.map((t) => <option key={t} value={t} disabled={!ok.includes(t)}>{t}</option>)}
            </select>
          </LF>
          <LF label={claim ? '수령 가능 기간' : '지급 시점'} req err={E[`${k}_payAt`]}>
            <span id={`err-${k}_payAt`} />
            {claim ? (
              <>
                <input type="datetime-local" aria-label="수령 시작" value={l.claimS} onChange={(e) => onSet({ claimS: e.target.value })} className={DT} />
                <span className="text-[var(--ink3)]">~</span>
                <input type="datetime-local" aria-label="수령 종료" value={l.claimE} onChange={(e) => onSet({ claimE: e.target.value })} className={DT} />
              </>
            ) : (
              <>
                <RdPair value={l.payWhen} opts={['대상자 선정 시', '추후'] as const} onChange={(v) => onSet({ payWhen: v })} />
                <input type="datetime-local" aria-label="지급 일시" value={l.payAt} disabled={l.payWhen !== '추후'} onChange={(e) => onSet({ payAt: e.target.value })}
                  className={cn(DT, l.payWhen !== '추후' && 'bg-[var(--th)] text-[var(--ink4)]')} />
                {manual && <Hint>수기·대행사 지급은 &apos;추후&apos;만 설정할 수 있어요</Hint>}
              </>
            )}
          </LF>
        </div>
      </div>

      {pickOpen && rp && (
        <ListPicker
          title={rp[2]} sub="쿠폰·이용권 마스터 연계 (예시 데이터)"
          rows={(RPICK_SAMPLE[rp[0]] ?? []).map((n, i) => ({ id: `${rp[0].toUpperCase()}${String(i + 1).padStart(3, '0')}`, name: n }))}
          value=""
          onApply={(id) => {
            const name = (RPICK_SAMPLE[rp[0]] ?? [])[Number(id.slice(-3)) - 1];
            if (name && !l.pick.includes(name)) onSet({ pick: l.pick.concat(name) });
            setPickOpen(false);
            onToast(`${name} 선택`);
          }}
          onClose={() => setPickOpen(false)}
        />
      )}
    </div>
  );
}
