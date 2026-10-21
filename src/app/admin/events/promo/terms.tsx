'use client';

/**
 * 약관 — 조회 팝업 · 매핑 표 · 비회원 참여 블록.
 *  이벤트 약관(2-16)과 비회원 약관이 같은 팝업·같은 마스터를 쓴다.
 *  필수 여부는 약관 마스터의 '필수 여부 변경' 설정을 따르고, 고지형은 항상 필수(변경 불가).
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Dialog, Row, Hint, Note, Rd, Ck, RdPair, BTN, BTN_PRI, BTN_SM, BTN_PILL, INP, SEL } from './form-ui';
import {
  TERMS, TERM_TYPES, TERM_CONS, GUEST_TERM_FIX,
  termById, isNotice, baseReq, canChange, initialReq, guestFieldLocked,
  type TermMap, type GuestField,
} from '@/lib/promotion/terms';

/* ── 조회 팝업 ─────────────────────────────────────────────────── */
export function TermsPicker({ mapped, onApply, onClose }: {
  /** 이미 매핑된 약관 ID — 다시 고를 수 없다 */
  mapped: string[];
  onApply: (ids: string[]) => void;
  onClose: () => void;
}) {
  const [types, setTypes] = React.useState<string[]>(TERM_TYPES.slice());
  const [cons, setCons] = React.useState<string[]>(TERM_CONS.slice());
  const [key, setKey] = React.useState('전체');
  const [q, setQ] = React.useState('');
  const [applied, setApplied] = React.useState({ key: '전체', q: '' });
  const [pick, setPick] = React.useState<string[]>([]);
  const [warn, setWarn] = React.useState('');

  const kw = applied.q.trim().toLowerCase();
  const list = TERMS.filter((t) =>
    types.includes(t.type) && cons.includes(t.cons) && (
      !kw
      || (applied.key !== '약관 명' && t.id.toLowerCase().includes(kw))
      || (applied.key !== '약관 ID' && t.name.toLowerCase().includes(kw))
    ));

  const reset = () => {
    setTypes(TERM_TYPES.slice()); setCons(TERM_CONS.slice());
    setKey('전체'); setQ(''); setApplied({ key: '전체', q: '' }); setPick([]); setWarn('');
  };
  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : arr.concat(v));

  const Group = ({ label, opts, value, onChange }: { label: string; opts: string[]; value: string[]; onChange: (v: string[]) => void }) => (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <b className="w-[80px] shrink-0 text-[13px] text-[var(--ink2)]">{label}</b>
      <Ck on={opts.every((o) => value.includes(o))} onChange={() => onChange(opts.every((o) => value.includes(o)) ? [] : opts.slice())}>전체</Ck>
      {opts.map((o) => <Ck key={o} on={value.includes(o)} onChange={() => toggle(value, onChange, o)}>{o}</Ck>)}
    </div>
  );

  return (
    <Dialog
      title="약관 조회" sub="BO-AIM-ETC-PG073-PU03 · BSS 연동 · 사용 여부 Y 약관만 (예시 데이터)"
      width={900} onClose={onClose}
      foot={<>
        <span className="mr-auto text-[13px] text-[var(--ink3)]">{pick.length ? `${pick.length}개 선택` : ''}</span>
        <button type="button" className={BTN} onClick={onClose}>닫기</button>
        <button type="button" className={BTN_PRI} onClick={() => {
          if (!pick.length) { setWarn('약관을 1개 이상 선택해주세요'); return; }
          onApply(pick);
        }}>적용</button>
      </>}
    >
      <div className="space-y-2 rounded-[var(--r-field)] bg-[var(--th)] p-3">
        <Group label="약관 유형" opts={TERM_TYPES} value={types} onChange={setTypes} />
        <Group label="동의 구분" opts={TERM_CONS} value={cons} onChange={setCons} />
        <div className="flex flex-wrap items-center gap-2">
          <b className="w-[80px] shrink-0 text-[13px] text-[var(--ink2)]">검색</b>
          <select aria-label="검색 항목" value={key} onChange={(e) => setKey(e.target.value)} className={cn(SEL, 'h-[34px] w-[130px]')}>
            <option>전체</option><option>약관 ID</option><option>약관 명</option>
          </select>
          <input
            type="search" value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') setApplied({ key, q }); }}
            placeholder="내용을 입력하세요." aria-label="검색어" className={cn(INP, 'h-[34px] flex-1')}
          />
          <button type="button" className={BTN_SM} onClick={reset}>초기화</button>
          <button type="button" className={cn(BTN_SM, 'border-[var(--ac)] bg-[var(--ac)] text-white hover:bg-[var(--ac-h)]')} onClick={() => setApplied({ key, q })}>조회</button>
        </div>
      </div>

      <p className="mt-3 text-[13px] text-[var(--ink2)]">검색 결과 <b>{list.length}건</b></p>
      {warn && <p className="mt-1 text-[13px] text-[var(--bad)]">{warn}</p>}

      <div className="mt-2 max-h-[320px] overflow-auto border-y border-[var(--line2)]">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="sticky top-0 bg-[var(--th)] text-[var(--ink2)]">
              {['선택', '약관 ID', '약관 명', '약관 유형', '동의 구분', '필수 여부 변경'].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-[var(--ink3)]">조회 결과가 없어요</td></tr>
            ) : list.map((t) => {
              const done = mapped.includes(t.id);
              const on = done || pick.includes(t.id);
              return (
                <tr key={t.id} className={cn('border-b border-[var(--line2)]', on && 'bg-[var(--ac2)]', done && 'opacity-60')}>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox" aria-label={`${t.name} 선택`} checked={on} disabled={done} className="h-4 w-4"
                      onChange={(e) => { setWarn(''); setPick(e.target.checked ? pick.concat(t.id) : pick.filter((x) => x !== t.id)); }}
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-[12px] text-[var(--ink3)]">{t.id}</td>
                  <td className="px-3 py-2">{t.name}{done && <span className="ml-1 text-[12px] text-[var(--ink3)]">(매핑됨)</span>}</td>
                  <td className="whitespace-nowrap px-3 py-2">{t.type}</td>
                  <td className="whitespace-nowrap px-3 py-2">{t.cons}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {isNotice(t.cons)
                      ? <span className="text-[var(--ink3)]">고지형 · 변경 불가</span>
                      : t.chg === '허용' ? <span className="text-[var(--ok)]">허용</span> : <span className="text-[var(--ink3)]">미허용</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[13px] leading-[18px] text-[var(--ink3)]">
        &apos;필수 여부 변경&apos;은 약관 생성 시 설정한 값이에요. 허용인 약관만 이벤트에서 필수·선택을 바꿀 수 있어요. 이미 매핑한 약관은 다시 선택할 수 없어요.
      </p>
    </Dialog>
  );
}

/* ── 이벤트 약관 매핑 (2-16) ───────────────────────────────────── */
export function TermsMap({ value, onChange }: { value: TermMap[]; onChange: (v: TermMap[]) => void }) {
  if (!value.length) {
    return <div className="w-full rounded-[var(--r-field)] bg-[var(--th)] px-3 py-4 text-center text-[13px] text-[var(--ink3)]">매핑된 약관이 없어요. [약관 조회]에서 약관을 선택해주세요.</div>;
  }
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-[var(--th)] text-[var(--ink2)]">
            {['약관 명', '약관 유형', '기본 동의 구분', '이벤트 적용', '삭제'].map((h) => (
              <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {value.map((m) => {
            const t = termById(m.id); if (!t) return null;
            const ok = canChange(t);
            return (
              <tr key={m.id} className="border-b border-[var(--line2)]">
                <td className="px-3 py-2">{t.name}<br /><span className="font-mono text-[12px] text-[var(--ink3)]">{t.id}</span></td>
                <td className="whitespace-nowrap px-3 py-2">{t.type}</td>
                <td className="px-3 py-2">
                  {t.cons}<br />
                  {isNotice(t.cons)
                    ? <span className="text-[12px] text-[var(--ink3)]">고지형 · 변경 불가</span>
                    : t.chg === '허용' ? <span className="text-[12px] text-[var(--ok)]">필수 여부 변경 허용</span> : <span className="text-[12px] text-[var(--ink3)]">필수 여부 변경 미허용</span>}
                </td>
                <td className="px-3 py-2">
                  <select
                    aria-label={`${t.name} 이벤트 적용`} value={m.req} disabled={!ok}
                    title={ok ? undefined : '약관 마스터에서 변경을 허용하지 않은 약관이에요'}
                    onChange={(e) => onChange(value.map((x) => (x.id === m.id ? { ...x, req: e.target.value } : x)))}
                    className={cn(SEL, 'h-[34px] w-[120px]', !ok && 'bg-[var(--th)] text-[var(--ink3)]')}
                  >
                    {(isNotice(t.cons) ? ['필수(고지)'] : ['필수', '선택']).map((o) => <option key={o}>{o}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <button type="button" aria-label={`${t.name} 삭제`} className="text-[var(--ink3)] hover:text-[var(--bad)]"
                    onClick={() => onChange(value.filter((x) => x.id !== m.id))}>×</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── 비회원 참여 ───────────────────────────────────────────────── */
export function GuestBlock({ isRef, guest, fields, auth, terms, onChange, err }: {
  /** 추천형은 PASS 본인인증 결과로 CI 를 확인한다 — 본인 확인 수단 고정 */
  isRef: boolean;
  guest: '허용' | '허용 안 함';
  fields: GuestField[];
  auth: string;
  terms: TermMap[];
  onChange: (p: { guest?: '허용' | '허용 안 함'; fields?: GuestField[]; auth?: string; terms?: TermMap[] }) => void;
  err?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const setField = (name: string, p: Partial<GuestField>) =>
    onChange({ fields: fields.map((g) => (g.name === name ? { ...g, ...p } : g)) });

  return (
    <>
      <Row label="비회원 참여">
        <RdPair value={guest} opts={['허용 안 함', '허용'] as const} onChange={(v) => onChange({ guest: v })} />
        <Note>
          <b className="text-[var(--ink)]">허용 안 함</b> T 멤버십 회원만 참여할 수 있어요. 로그인하지 않은 회원은 로그인 후 원래 화면으로 돌아와요.
          {' '}<b className="text-[var(--ink)]">허용</b> 비회원도 본인 확인과 개인정보 입력 후 참여할 수 있어요.
        </Note>
      </Row>

      {guest === '허용' && (
        <>
          <Row label="개인정보 입력 항목" req err={err}>
            <span id={`err-guestField`} />
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[var(--th)] text-[var(--ink2)]">
                    {['사용', '항목', '필수 여부', '수집 시점'].map((h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fields.map((g) => {
                    const locked = guestFieldLocked(g);
                    return (
                      <tr key={g.name} className="border-b border-[var(--line2)]">
                        <td className="whitespace-nowrap px-3 py-2">
                          <span className="flex items-center gap-3">
                            {(['사용', '미사용'] as const).map((o) => (
                              <Rd key={o} on={g.use === (o === '사용')} disabled={g.fixed && o === '미사용'} onChange={() => setField(g.name, { use: o === '사용' })}>{o}</Rd>
                            ))}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          {g.name}
                          {g.note && <><br /><span className="text-[12px] text-[var(--ink3)]">{g.note}</span></>}
                        </td>
                        <td className="px-3 py-2">
                          <select
                            aria-label={`${g.name} 필수 여부`} value={g.req} disabled={locked}
                            onChange={(e) => setField(g.name, { req: e.target.value as GuestField['req'] })}
                            className={cn(SEL, 'h-[34px] w-[100px]', locked && 'bg-[var(--th)] text-[var(--ink3)]')}
                          ><option>필수</option><option>선택</option></select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            aria-label={`${g.name} 수집 시점`} value={g.at} disabled={locked}
                            onChange={(e) => setField(g.name, { at: e.target.value as GuestField['at'] })}
                            className={cn(SEL, 'h-[34px] w-[140px]', locked && 'bg-[var(--th)] text-[var(--ink3)]')}
                          ><option>참여 시</option><option>혜택 지급 시</option></select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <Note>
                항목은 개인정보 항목 마스터에서 불러와요 (예시). 임의 항목은 추가할 수 없어요.
                수집 시점이 &apos;혜택 지급 시&apos;인 항목은 혜택 지급 대상자에게만 입력을 요청해요.
                휴대전화번호는 비회원 식별·중복 판별 기준이라 필수·참여 시로 고정이에요
                {isRef ? ' (추천형은 PASS 본인인증 결과로 채워져요)' : ''}.
              </Note>
            </div>
          </Row>

          <Row label="본인 확인" req>
            <span className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {['휴대폰 본인인증(CI)', 'SMS 인증번호'].map((o) => (
                <Rd key={o} on={auth === o} disabled={isRef && o !== '휴대폰 본인인증(CI)'} onChange={() => onChange({ auth: o })}>{o}</Rd>
              ))}
            </span>
            <Hint>{isRef ? '추천형은 비회원도 PASS 본인인증으로 CI를 확인해 추천 관계 판정에 써요 (변경 불가)' : '본인 확인 수단은 인증 정책 확인 필요 (TBD)'}</Hint>
            <Note>비회원은 본인 확인 수단의 식별 값(CI 또는 휴대전화번호)으로 참여 횟수와 혜택 수령을 판정해요</Note>
          </Row>

          <Row label="비회원 약관" req>
            <div className="w-full">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className={BTN_PILL} onClick={() => setOpen(true)}>약관 조회</button>
                <Hint>
                  이벤트 약관(2-16)과 별도로 비회원 식별·개인정보 처리 동의만 설정해요 ·
                  비회원 약관은 약관 마스터의 필수 여부를 그대로 따르고 변경할 수 없어요 ·
                  비회원 개인정보 수집·이용 동의는 고정
                </Hint>
              </div>
              <div className="mt-2">
                {terms.length === 0 ? (
                  <div className="rounded-[var(--r-field)] bg-[var(--th)] px-3 py-4 text-center text-[13px] text-[var(--ink3)]">매핑된 약관이 없어요. [약관 조회]에서 약관을 선택해주세요.</div>
                ) : (
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr className="bg-[var(--th)] text-[var(--ink2)]">
                        {['약관 명', '약관 유형', '동의 구분', '필수 여부', '삭제'].map((h) => (
                          <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {terms.map((m) => {
                        const t = termById(m.id); if (!t) return null;
                        const fx = t.id === GUEST_TERM_FIX;
                        return (
                          <tr key={m.id} className="border-b border-[var(--line2)]">
                            <td className="px-3 py-2">{t.name}<br /><span className="font-mono text-[12px] text-[var(--ink3)]">{t.id}</span></td>
                            <td className="whitespace-nowrap px-3 py-2">{t.type}</td>
                            <td className="whitespace-nowrap px-3 py-2">{t.cons}</td>
                            <td className="px-3 py-2">
                              <select disabled aria-label={`${t.name} 필수 여부`} title="비회원 약관은 필수 여부를 바꿀 수 없어요"
                                className={cn(SEL, 'h-[34px] w-[110px] bg-[var(--th)] text-[var(--ink3)]')}>
                                <option>{isNotice(t.cons) ? '필수(고지)' : baseReq(t.cons)}</option>
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              {fx ? <span className="text-[12px] text-[var(--ink3)]">고정</span> : (
                                <button type="button" aria-label={`${t.name} 삭제`} className="text-[var(--ink3)] hover:text-[var(--bad)]"
                                  onClick={() => onChange({ terms: terms.filter((x) => x.id !== m.id) })}>×</button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </Row>

          <div className="border-b border-[var(--line2)] bg-[var(--warnbg)] px-4 py-3 text-[13px] leading-[18px] text-[var(--warn)]">
            조건에 <b>회원 전용</b> 표시가 있는 조건(멤버십 등급·회선·상품·서비스·행동 등)은 비회원이 판정할 수 없어요.
            이런 조건이 있으면 비회원은 FO에서 로그인·회원가입으로 안내돼요. 연령·이벤트 참여 이력은 비회원도 판정할 수 있어요.
          </div>

          {open && (
            <TermsPicker
              mapped={terms.map((t) => t.id)}
              onApply={(ids) => {
                const add = ids.map((id) => { const t = termById(id)!; return { id, req: initialReq(t) }; });
                onChange({ terms: terms.concat(add) });
                setOpen(false);
              }}
              onClose={() => setOpen(false)}
            />
          )}
        </>
      )}
    </>
  );
}
