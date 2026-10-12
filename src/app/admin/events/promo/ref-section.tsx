'use client';

/**
 * 추천형 전용 — 참여 정보 · 리워드 정보.
 *  초대자는 **단계**(누적 초대 성공 인원)를 갖고, 달성한 단계는 모두 지급(누적)한다.
 *  피초대자는 단계 없이 한 장이다.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { CondBuilder } from './cond-builder';
import { LineView } from './reward-blocks';
import { GuestBlock } from './terms';
import { Sect, Row, Hint, Note, Rd, RdPair, BTN_SM, INP } from './form-ui';
import { validate as validateCond, type CondNode } from '@/lib/promotion/cond';
import { newRefCard, newLine, normalizeLine, type RefState, type RefCard, type RewardLine } from '@/lib/promotion/pr';
import type { GuestField, TermMap } from '@/lib/promotion/terms';

export function RefSections({ r, onChange, E, onToast, guest }: {
  r: RefState;
  onChange: (next: RefState) => void;
  E: Record<string, string>;
  onToast: (m: string) => void;
  guest: {
    guest: '허용' | '허용 안 함'; fields: GuestField[]; auth: string; terms: TermMap[];
    err?: string;
    onChange: (p: { guest?: '허용' | '허용 안 함'; fields?: GuestField[]; auth?: string; terms?: TermMap[] }) => void;
  };
}) {
  const set = (p: Partial<RefState>) => onChange({ ...r, ...p });
  const cond = (nodes: CondNode[]) => validateCond(nodes).errors;

  return (
    <>
      <Sect title="참여 정보">
        <Row label="초대자 참여 조건">
          <CondBuilder ctx="join" value={r.invCond} onChange={(n) => set({ invCond: n })} errors={cond(r.invCond)} />
        </Row>
        <Row label="피초대자 참여 조건">
          <CondBuilder ctx="join" value={r.ineCond} onChange={(n) => set({ ineCond: n })} errors={cond(r.ineCond)} />
        </Row>
        <Row label="최대 초대 인정 수" req err={E.maxInvite}>
          <span id="err-maxInvite" />
          <RdPair value={r.invLimit} opts={['제한 없음', '제한'] as const} onChange={(v) => set({ invLimit: v, ...(v === '제한 없음' ? { maxInvite: '' } : {}) })} />
          <input
            type="number" min={1} value={r.maxInvite} disabled={r.invLimit !== '제한'}
            onChange={(e) => set({ maxInvite: e.target.value })}
            placeholder="숫자를 입력해주세요"
            className={cn(INP, 'w-[180px]', r.invLimit !== '제한' && 'bg-[var(--th)] text-[var(--ink4)]')}
          /> 명
          <Note>
            초대자 1명당 초대 성공으로 인정하는 최대 인원이에요. 인원은 추천인 1명(CI)당 유효 추천 관계 수로 세요.
            {' '}<b className="text-[var(--ink)]">제한 없음</b> 초대 성공 인원을 모두 인정해요.
            {' '}<b className="text-[var(--ink)]">제한</b> 입력한 인원을 넘는 초대는 리워드 지급 대상이 아니에요.
          </Note>
        </Row>
        <Row label="추천 관계 판정">
          <span className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {['CI 기준', '멤버십 카드 기준'].map((o) => (
              <Rd key={o} on={o === 'CI 기준'} disabled={o !== 'CI 기준'} onChange={() => {}}>{o}</Rd>
            ))}
          </span>
          <ul className="w-full list-disc space-y-0.5 pl-5 text-[13px] leading-[18px] text-[var(--ink2)]">
            <li>이벤트 · 추천인 CI · 피추천인 CI 조합으로 유효한 추천 관계만 인정해요</li>
            <li>자기 추천(추천인과 피추천인 CI가 같음)은 인정하지 않아요</li>
            <li>피추천인은 이벤트당 1회, 최초 유효 관계만 인정해요</li>
          </ul>
          <Hint>추천형은 CI 기준 고정 (변경 불가) · 비회원은 PASS 본인인증으로 CI 확인</Hint>
        </Row>
        <GuestBlock isRef {...guest} onChange={guest.onChange} />
      </Sect>

      <Sect title="리워드 정보">
        <div className="border-b border-[var(--line)] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-[14px]">초대자 리워드</b>
            <Hint>단계 = 누적 초대 성공 인원 · n단계는 n-1단계보다 큰 인원 · 달성한 단계는 모두 지급(누적)</Hint>
          </div>

          <div className="mt-2 border-t border-[var(--line2)]">
            <Row label="초대자 지급 조건">
              <CondBuilder ctx="pay" value={r.invPayCond} onChange={(n) => set({ invPayCond: n })} errors={cond(r.invPayCond)} />
            </Row>
          </div>

          <div className="mt-3 space-y-3">
            {r.inviter.map((c, i) => (
              <RefCardView
                key={c.id} c={c} step={i + 1} total={r.inviter.length} withThr E={E} onToast={onToast}
                onSet={(p) => set({ inviter: r.inviter.map((x) => (x.id === c.id ? { ...x, ...p } : x)) })}
                onDel={() => set({ inviter: r.inviter.filter((x) => x.id !== c.id) })}
              />
            ))}
          </div>
          <button type="button" className={cn(BTN_SM, 'mt-2')} onClick={() => set({ inviter: r.inviter.concat(newRefCard()) })}>단계 추가</button>

          <div className="mt-7 flex flex-wrap items-center gap-2">
            <b className="text-[14px]">피초대자 리워드</b>
            <Hint>초대로 참여한 피초대자에게 지급</Hint>
          </div>
          <div className="mt-2 border-t border-[var(--line2)]">
            <Row label="피초대자 지급 조건">
              <CondBuilder ctx="pay" value={r.inePayCond} onChange={(n) => set({ inePayCond: n })} errors={cond(r.inePayCond)} />
            </Row>
          </div>
          <div className="mt-3">
            <RefCardView
              c={r.invitee} step={0} total={1} E={E} onToast={onToast}
              onSet={(p) => set({ invitee: { ...r.invitee, ...p } })}
              onDel={() => {}}
            />
          </div>
        </div>
      </Sect>
    </>
  );
}

function RefCardView({ c, step, total, withThr, E, onSet, onDel, onToast }: {
  c: RefCard; step: number; total: number; withThr?: boolean; E: Record<string, string>;
  onSet: (p: Partial<RefCard>) => void; onDel: () => void; onToast: (m: string) => void;
}) {
  const setLine = (id: number, p: Partial<RewardLine>) =>
    onSet({ lines: c.lines.map((l) => (l.id === id ? normalizeLine({ ...l, ...p }) : l)) });

  return (
    <div className="rounded-[10px] border border-[var(--line2)] bg-[var(--th)] p-3">
      <div className="flex flex-wrap items-end gap-3">
        {withThr && <span className="rounded-[4px] bg-[var(--ac2)] px-2 py-0.5 text-[12px] font-bold text-[var(--ac)]">{step}단계</span>}
        <label className="min-w-[220px] flex-1">
          <span className="block text-[12px] font-semibold text-[var(--ink3)]">사용자 노출명<span className="text-[var(--bad)]">*</span></span>
          <input
            value={c.name} onChange={(e) => onSet({ name: e.target.value })}
            placeholder={withThr ? '노출명을 입력해주세요 (예: 3명 초대 커피 세트)' : '노출명을 입력해주세요 (예: 가입 축하 혜택)'}
            className={cn(INP, 'mt-1 w-full bg-white')}
          />
          {E[`it${c.id}_name`] && <span id={`err-it${c.id}_name`} className="mt-1 block text-[13px] text-[var(--bad)]">{E[`it${c.id}_name`]}</span>}
        </label>
        {withThr && (
          <label className="w-[180px]">
            <span className="block text-[12px] font-semibold text-[var(--ink3)]">달성 인원 수<span className="text-[var(--bad)]">*</span></span>
            <span className="mt-1 flex items-center gap-2">
              <input type="number" min={1} value={c.thr} onChange={(e) => onSet({ thr: e.target.value })} placeholder="N" aria-label="달성 인원 수" className={cn(INP, 'w-[110px] bg-white')} />
              명 초대 시
            </span>
            {E[`it${c.id}_thr`] && <span id={`err-it${c.id}_thr`} className="mt-1 block text-[13px] text-[var(--bad)]">{E[`it${c.id}_thr`]}</span>}
          </label>
        )}
        {withThr && total > 1 && <button type="button" className={BTN_SM} onClick={onDel}>단계 삭제</button>}
      </div>

      <div className="mt-3 space-y-2">
        {c.lines.map((l, j) => (
          <LineView
            key={l.id} l={l} idx={j} total={c.lines.length} E={E} onToast={onToast}
            onSet={(p) => setLine(l.id, p)}
            onDel={() => onSet({ lines: c.lines.filter((x) => x.id !== l.id) })}
          />
        ))}
      </div>
      <button type="button" className={cn(BTN_SM, 'mt-2')} onClick={() => onSet({ lines: c.lines.concat(newLine()) })}>리워드 추가</button>
    </div>
  );
}
