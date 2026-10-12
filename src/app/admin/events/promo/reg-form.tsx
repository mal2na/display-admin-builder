'use client';

/**
 * 프로모션 등록 폼 — 왼쪽 FO 미리보기 + 오른쪽 입력 폼.
 *  지금 옮긴 범위: 기본정보 · 하단 CTA · 검색 및 태그 정보.
 *  참여 정보 / 리워드 / 추천 구조는 아직 프로토타입에 있다(유형별 자리만 표시).
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { CondBuilder } from './cond-builder';
import { CautionPicker, PagePicker } from './form-pickers';
import { JoinActions } from './join-actions';
import { TermsPicker, TermsMap, GuestBlock } from './terms';
import { RewardSection } from './reward-blocks';
import {
  Sect, Row, Hint, Note, Rd, Ck, RdPair, BTN, BTN_PRI, BTN_SM, BTN_PILL, INP, SEL, DT,
} from './form-ui';
import { validate as validateCond } from '@/lib/promotion/cond';
import { typeLabel } from '@/lib/promotion/reg-start';
import {
  CHANNELS, CTA_MAX, CTA_AT_ONCE, ctaOpts, newCta, emptyForm, validateForm, hexOk, SVC_PAGES,
  normalize, prOf,
  type PromoForm, type CtaBlock, type FormErrors,
} from '@/lib/promotion/form';
import { JM_GUIDE, JM_LABEL } from '@/lib/promotion/reg-start';
import { termById, initialReq } from '@/lib/promotion/terms';

export function RegForm({ type, jm, onCancel, onSaved, onToast, onChangeType }: {
  type: string;
  jm: '직접' | '행동';
  onCancel: () => void;
  onSaved: () => void;
  onToast: (m: string) => void;
  onChangeType: () => void;
}) {
  // 초기값에도 연동 규칙을 한 번 걸어 둔다 — 기본 참여 행동이 '버튼 참여'라 참여 CTA 가 바로 붙는다
  const [f, setF] = React.useState<PromoForm>(() => normalize(emptyForm(type, jm)));
  const [E, setE] = React.useState<FormErrors>({});
  const [condE, setCondE] = React.useState<Record<string, string>>({});
  const [alertMsg, setAlertMsg] = React.useState<string | null>(null);
  const [confirmMsg, setConfirmMsg] = React.useState<null | { msg: string; ok: () => void }>(null);
  const [cauOpen, setCauOpen] = React.useState(false);
  const [termsOpen, setTermsOpen] = React.useState(false);
  const [pagePick, setPagePick] = React.useState<number | null>(null);
  const [tagInput, setTagInput] = React.useState('');

  // 값이 바뀔 때마다 연동 규칙(룰렛·자동 CTA 등)을 한 번 통과시킨다
  const set = (p: Partial<PromoForm>) => setF((x) => normalize({ ...x, ...p }));
  const setCta = (id: number, p: Partial<CtaBlock>) =>
    setF((x) => normalize({ ...x, ctas: x.ctas.map((c) => (c.id === id ? { ...c, ...p } : c)) }));

  const isGuide = f.type === '안내형';
  const limited = f.scope === '제한 공개';
  // 제한 공개는 검색에 노출되지 않는다
  const searchOn = !limited && f.search === '노출';

  const save = () => {
    const r = validateForm(f);
    if (r.alert) { setAlertMsg(r.alert); return; }
    setE(r.errors); setCondE(r.condErrors);
    const first = Object.keys(r.errors)[0];
    if (first) {
      onToast(`필수 항목 ${Object.keys(r.errors).length}개를 확인해 주세요.`);
      document.getElementById(`err-${first}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setConfirmMsg({ msg: '입력한 내용을 저장하시겠습니까?', ok: () => { onToast('저장되었습니다.'); onSaved(); } });
  };

  return (
    <div className="px-12 py-9 pb-28">
      <button type="button" onClick={onCancel} className="mb-2 text-[14px] text-[var(--ink3)] hover:text-[var(--ink)]">‹ 프로모션 관리</button>
      <nav className="flex items-center gap-1.5 text-[14px] leading-[20px] text-[var(--ink3)]">
        <span>홈</span><span className="opacity-60">›</span><span>프로모션 관리</span>
        <span className="opacity-60">›</span><b className="text-[var(--ink)]">프로모션 등록</b>
      </nav>
      <h1 className="mt-2 text-[24px] font-bold leading-[32px] tracking-[-0.6px] text-[var(--ink)]">프로모션 등록</h1>

      <div className="mt-6 grid gap-6 xl:grid-cols-[300px_1fr]">
        <Preview f={f} />

        <div className="min-w-0">
          {/* ── 기본정보 ── */}
          <Sect title="프로모션 기본정보">
            <Row label="프로모션 유형" req>
              <b>{typeLabel(f.type)}</b>
              <button type="button" className={BTN_SM} onClick={onChangeType}>유형 변경</button>
            </Row>
            <Row label="프로모션 상태"><span className="rounded-[4px] bg-[#d9e9ff] px-2 py-0.5 text-[12px] font-semibold text-[#2e7aff]">등록 중</span></Row>
            <Row label="프로모션 ID"><input disabled placeholder="저장 시 자동 채번" className={cn(INP, 'w-[220px] bg-[var(--th)] text-[var(--ink3)]')} /></Row>
            <Row label="프로모션 명" req err={E.name}>
              <span id="err-name" />
              <input value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="프로모션 명을 입력해주세요" className={cn(INP, 'w-full max-w-[520px]')} />
            </Row>
            <Row label="서브 타이틀" req err={E.sub}>
              <span id="err-sub" />
              <input value={f.sub} onChange={(e) => set({ sub: e.target.value })} placeholder="서브 타이틀을 입력해주세요" className={cn(INP, 'w-full max-w-[520px]')} />
            </Row>
            <Row label="제휴 브랜드">
              <button type="button" className={BTN_PILL} onClick={() => onToast('제휴 브랜드 조회 팝업 (BO-AIM-ETC-PG073-PU04)')}>조회</button>
            </Row>
            <Row label="상품">
              <button type="button" className={BTN_PILL} onClick={() => onToast('상품 조회 팝업 (BO-AIM-ETC-PG073-PU05)')}>조회</button>
            </Row>
            <Row label="전시 채널" req err={E.channels}>
              <span id="err-channels" />
              <Ck on={f.channels.length === CHANNELS.length} onChange={() => set({ channels: f.channels.length === CHANNELS.length ? [] : CHANNELS.slice() })}>전체</Ck>
              {CHANNELS.map((c) => (
                <Ck key={c} on={f.channels.includes(c)} onChange={() => set({ channels: f.channels.includes(c) ? f.channels.filter((x) => x !== c) : f.channels.concat(c) })}>{c}</Ck>
              ))}
            </Row>
            <Row label="전시 상태"><RdPair value={f.disp} opts={['전시', '미전시'] as const} onChange={(v) => set({ disp: v })} /></Row>

            <Row label="공개 범위">
              <RdPair value={f.scope} opts={['전체 공개', '제한 공개'] as const} onChange={(v) => set({ scope: v, accessCond: [], target: null })} />
              <Note>
                <b>전체 공개</b> 이벤트 목록과 검색에 노출돼요. <b>제한 공개</b> 목록·검색에 노출되지 않는 시크릿 페이지로 운영돼요.
                연결된 배너·메뉴로만 들어올 수 있고, 공개 대상 고객만 볼 수 있어요.
              </Note>
            </Row>
            {limited && (
              <>
                <Row label="공개 대상" req>
                  <RdPair value={f.access} opts={['조건 고객', '지정 고객'] as const} onChange={(v) => set({ access: v, accessCond: [], target: null })} />
                </Row>
                {f.access === '조건 고객' ? (
                  <Row label="공개 조건" req err={E.accessCond}>
                    <span id="err-accessCond" />
                    <CondBuilder
                      ctx="access" required
                      value={f.accessCond}
                      onChange={(nodes) => { set({ accessCond: nodes }); setCondE(validateCond(nodes, true).errors); }}
                      errors={condE}
                      joinRange={[f.joinS.slice(0, 10), f.joinE.slice(0, 10)]}
                    />
                  </Row>
                ) : (
                  <Row label="대상자 명단" req err={E.target}>
                    <span id="err-target" />
                    <div className="w-full rounded-[var(--r-field)] bg-[var(--th)] p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" className={BTN_SM} onClick={() => onToast('대상자 등록 양식(엑셀)을 내려받아요. (양식 항목 TBD)')}>양식 다운로드</button>
                        <label className={cn(BTN_SM, 'cursor-pointer border-[var(--ac)] text-[var(--ac)]')}>
                          엑셀 업로드
                          <input
                            type="file" accept=".xlsx,.xls,.csv" className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]; if (!file) return;
                              const total = 200 + (file.size % 1800); const ng = file.size % 7;
                              set({ target: { name: file.name, total, ok: total - ng, ng } });
                              e.target.value = '';
                            }}
                          />
                        </label>
                        <Hint>xlsx, xls, csv · 최대 10,000건</Hint>
                      </div>
                      {f.target && (
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px]">
                          <span className="font-semibold">{f.target.name}</span>
                          <span>총 {f.target.total.toLocaleString('ko-KR')}건</span>
                          <span className="text-[var(--ok)]">성공 {f.target.ok.toLocaleString('ko-KR')}건</span>
                          <span className="text-[var(--bad)]">실패 {f.target.ng}건</span>
                          {f.target.ng > 0 && <button type="button" className={BTN_SM} onClick={() => onToast('실패 내역을 내려받아요.')}>실패 내역 다운로드</button>}
                          <button type="button" className={BTN_SM} onClick={() => set({ target: null })}>삭제</button>
                        </div>
                      )}
                    </div>
                  </Row>
                )}
                <Row label="진입 경로">
                  <Note>
                    <b className="text-[var(--ink)]">등록 후 연결</b> — 배너·메뉴 등 진입 경로는 이 화면에서 연결하지 않아요.
                    등록 후 배너 관리 등 해당 메뉴에서 이 이벤트를 연결해주세요. 연결 현황은 상세 화면에서 확인할 수 있어요.
                  </Note>
                </Row>
              </>
            )}

            <Row label="공유하기">
              <RdPair value={f.share} opts={['사용', '미사용'] as const} onChange={(v) => set({ share: v })} />
              <Hint>사용 시 FO 상단에 공유 아이콘이 노출되고, 앱의 기본 공유 기능(네이티브)으로 이벤트 링크를 공유해요</Hint>
              {f.share === '사용' && limited && <Note>제한 공개 이벤트는 공유받은 고객도 공개 조건에 맞아야 진입할 수 있어요</Note>}
            </Row>

            <Row label="전시 기간" req err={E.disp}>
              <span id="err-disp" />
              <input type="datetime-local" aria-label="전시 시작일시" value={f.dispS} onChange={(e) => set({ dispS: e.target.value })} className={DT} />
              <span className="text-[var(--ink3)]">~</span>
              <input type="datetime-local" aria-label="전시 종료일시" value={f.dispE} disabled={f.dispNoEnd} onChange={(e) => set({ dispE: e.target.value })} className={cn(DT, f.dispNoEnd && 'bg-[var(--th)] text-[var(--ink4)]')} />
              <Ck on={f.dispNoEnd} onChange={() => set({ dispNoEnd: !f.dispNoEnd, dispE: '' })}>종료일 없음</Ck>
            </Row>
            {!isGuide && (
              <Row label="참여 기간" req err={E.join}>
                <span id="err-join" />
                <input type="datetime-local" aria-label="참여 시작일시" value={f.joinS} onChange={(e) => set({ joinS: e.target.value })} className={DT} />
                <span className="text-[var(--ink3)]">~</span>
                <input type="datetime-local" aria-label="참여 종료일시" value={f.joinE} onChange={(e) => set({ joinE: e.target.value })} className={DT} />
              </Row>
            )}

            <Row label="이벤트 목록 이미지" req err={E.img}>
              <span id="err-img" />
              <label className="grid h-[72px] w-[72px] cursor-pointer place-items-center rounded-[var(--r-field)] border border-[var(--line3)] text-[20px] text-[var(--ink4)] hover:bg-[var(--th)]">
                {f.img ? <span className="text-[11px] font-semibold text-[var(--ac)]">IMG</span> : '+'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) set({ img: file.name }); }} />
              </label>
              <input value={f.imgTag} onChange={(e) => set({ imgTag: e.target.value })} placeholder="이미지 태그는 프로모션 명이 기본설정됩니다" className={cn(INP, 'w-[360px] max-w-full')} />
              <Note>업로드 된 파일명 : {f.img || '-'}<br />권장 규격 : 360 × 162 px · 권장 형식 : JPG, JPEG, PNG, GIF, BMP</Note>
            </Row>

            <Row label="댓글 사용여부"><RdPair value={f.cmt} opts={['사용', '미사용'] as const} onChange={(v) => set({ cmt: v })} /></Row>
            {f.cmt === '사용' && (
              <>
                <Row label="댓글 차단여부"><RdPair value={f.block} opts={['사용', '미사용'] as const} onChange={(v) => set({ block: v, ...(v === '미사용' ? { blockS: '', blockE: '' } : {}) })} /></Row>
                <Row label="댓글 차단 기간" err={E.block}>
                  <span id="err-block" />
                  <input type="datetime-local" aria-label="차단 시작일시" value={f.blockS} disabled={f.block === '미사용'} onChange={(e) => set({ blockS: e.target.value })} className={cn(DT, f.block === '미사용' && 'bg-[var(--th)] text-[var(--ink4)]')} />
                  <span className="text-[var(--ink3)]">~</span>
                  <input type="datetime-local" aria-label="차단 종료일시" value={f.blockE} disabled={f.block === '미사용'} onChange={(e) => set({ blockE: e.target.value })} className={cn(DT, f.block === '미사용' && 'bg-[var(--th)] text-[var(--ink4)]')} />
                </Row>
              </>
            )}

            {!isGuide && (
              <Row label="약관">
                <div className="w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className={BTN_PILL} onClick={() => setTermsOpen(true)}>약관 조회</button>
                    <Hint>필수 여부 변경은 약관 마스터의 &apos;필수 여부 변경&apos; 설정을 따라요 · 고지형은 항상 필수(변경 불가)</Hint>
                  </div>
                  <div className="mt-2"><TermsMap value={f.terms} onChange={(terms) => set({ terms })} /></div>
                </div>
              </Row>
            )}
            <Row label="유의사항">
              <div className="w-full">
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className={BTN_PILL} onClick={() => setCauOpen(true)}>템플릿 불러오기</button>
                  {f.cauApplied && <Hint>적용 템플릿: {f.cauApplied} · 내용은 수정할 수 있어요</Hint>}
                </div>
                <textarea
                  rows={6} maxLength={2000} value={f.caution} onChange={(e) => set({ caution: e.target.value })}
                  placeholder="유의사항을 입력해주세요. 줄바꿈이 그대로 노출됩니다."
                  className="mt-2 w-full rounded-[var(--r-field)] border border-[var(--line3)] p-3 text-[14px] leading-[20px]"
                />
                <p className="mt-1 text-right text-[13px] text-[var(--ink3)]"><b>{f.caution.length.toLocaleString('ko-KR')}</b> / 2,000자</p>
              </div>
            </Row>
          </Sect>

          {/* ── 참여 정보 (참여ㆍ리워드형) ── */}
          {f.type === '참여ㆍ리워드형' && (
            <>
              <Sect title="참여 정보">
                <Row label="참여 방식">
                  <div className="w-full">
                    <span className="flex flex-wrap items-center gap-x-5 gap-y-2">
                      {(['직접', '행동'] as const).map((v) => (
                        <Rd key={v} on={f.jm === v} onChange={() => set({ jm: v })}>{JM_LABEL[v]}</Rd>
                      ))}
                    </span>
                    <Note>{JM_GUIDE[f.jm]}</Note>
                  </div>
                </Row>
                {f.jm === '직접' && (
                  <Row label="참여 행동" req err={E.ja}>
                    <span id="err-ja" />
                    <JoinActions items={f.ja} onChange={(ja) => set({ ja })} err={undefined} onToast={onToast} />
                  </Row>
                )}
                <Row label="참여 조건" err={E.joinCond}>
                  <span id="err-joinCond" />
                  <CondBuilder
                    ctx="join" value={f.joinCond}
                    onChange={(nodes) => set({ joinCond: nodes })}
                    errors={condE}
                    joinRange={[f.joinS.slice(0, 10), f.joinE.slice(0, 10)]}
                  />
                </Row>
                <Row label="참여 횟수 기준" req>
                  <RdPair value={f.cycle} opts={['기간 전체', '주기별'] as const} onChange={(v) => set({ cycle: v })} />
                  <select
                    aria-label="참여 주기" value={f.cycleUnit} disabled={f.cycle !== '주기별'}
                    onChange={(e) => set({ cycleUnit: e.target.value as PromoForm['cycleUnit'] })}
                    className={cn(SEL, 'w-[100px]', f.cycle !== '주기별' && 'bg-[var(--th)] text-[var(--ink4)]')}
                  >
                    <option>일</option><option>주</option><option>월</option>
                  </select>
                </Row>
                <Row label="최대 참여 횟수" req err={E.maxJoin}>
                  <span id="err-maxJoin" />
                  <input type="number" min={1} value={f.maxJoin} onChange={(e) => set({ maxJoin: e.target.value })} placeholder="숫자를 입력해주세요" className={cn(INP, 'w-[150px]')} /> 회
                  <Hint>
                    {f.cycle === '주기별'
                      ? `${({ 일: '매일', 주: '매주', 월: '매월' } as const)[f.cycleUnit]} ${f.maxJoin || 'N'}회까지 참여할 수 있어요`
                      : `이벤트 기간 동안 ${f.maxJoin || 'N'}회까지 참여할 수 있어요`}
                  </Hint>
                  {f.jm === '직접' && f.ja.length > 1 && <Note>참여 행동이 여러 개면 모두 완료한 1번을 1회로 세요</Note>}
                </Row>
                <Row label="중복 참여 판별 기준">
                  <RdPair value={f.dup} opts={['고객 기준(CI)', '멤버십 카드 기준'] as const} onChange={(v) => set({ dup: v })} />
                </Row>
                <GuestBlock
                  isRef={false}
                  guest={f.guest} fields={f.guestFields} auth={f.guestAuth} terms={f.guestTerms}
                  err={E.guestField}
                  onChange={(p) => set({
                    ...(p.guest !== undefined ? { guest: p.guest } : {}),
                    ...(p.fields !== undefined ? { guestFields: p.fields } : {}),
                    ...(p.auth !== undefined ? { guestAuth: p.auth } : {}),
                    ...(p.terms !== undefined ? { guestTerms: p.terms } : {}),
                  })}
                />
              </Sect>

              <Sect title="리워드 정보">
                <div className="border-b border-[var(--line)] p-4">
                  <RewardSection
                    pr={prOf(f)}
                    onChange={(next) => set({ jm: next.jm, ja: next.ja, blocks: next.blocks })}
                    E={E}
                    onToast={onToast}
                  />
                </div>
              </Sect>
            </>
          )}

          {/* ── 추천형은 아직 프로토타입 ── */}
          {f.type === '추천형' && (
            <Sect title="초대자 · 피초대자 정보">
              <div className="border-b border-[var(--line)] bg-[var(--th)] px-4 py-6 text-[14px] leading-[20px] text-[var(--ink2)]">
                <b className="block">{typeLabel(f.type)} 전용 영역</b>
                <span className="mt-1 block text-[13px] text-[var(--ink3)]">
                  초대자/피초대자 전용 콘텐츠, 리워드 지급 조건, 추천 코드·초대 링크 발급은 아직 프로토타입에 있어요.
                </span>
              </div>
            </Sect>
          )}

          {/* ── 하단 CTA ── */}
          <Sect title="하단 CTA 정보">
            <Row label="하단 CTA 사용여부"><RdPair value={f.cta} opts={['사용', '미사용'] as const} onChange={(v) => set({ cta: v })} /></Row>
            {f.cta === '사용' && (
              <>
                {f.ctas.map((c, i) => (
                  <CtaRows
                    key={c.id} c={c} idx={i} total={f.ctas.length} type={f.type} E={E}
                    onSet={(p) => setCta(c.id, p)}
                    onDel={() => set({ ctas: f.ctas.filter((x) => x.id !== c.id) })}
                    onPickPage={() => setPagePick(c.id)}
                  />
                ))}
                <div className="flex items-center justify-end gap-2 border-b border-[var(--line)] px-4 py-2.5">
                  <Hint>같은 시점에 노출되는 하단 CTA는 최대 {CTA_AT_ONCE}개 · 전체 최대 {CTA_MAX}개</Hint>
                  <button
                    type="button" className={BTN_SM} disabled={f.ctas.length >= CTA_MAX}
                    onClick={() => set({ ctas: f.ctas.concat(newCta(f.type)) })}
                  >추가</button>
                </div>
              </>
            )}
          </Sect>

          {/* ── 검색 및 태그 ── */}
          <Sect title="검색 및 태그 정보">
            <Row label="검색 노출 여부">
              <RdPair value={limited ? '미노출' : f.search} opts={['노출', '미노출'] as const} disabled={limited} onChange={(v) => set({ search: v })} />
              {limited && <Hint>제한 공개 이벤트는 검색에 노출되지 않아요</Hint>}
            </Row>
            {searchOn && (
              <>
                <Row label="검색 태그" req err={E.tags}>
                  <span id="err-tags" />
                  {f.tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-[4px] bg-[var(--ac2)] px-2 py-0.5 text-[13px] text-[var(--ac)]">
                      {t}<button type="button" onClick={() => set({ tags: f.tags.filter((x) => x !== t) })} className="font-bold">×</button>
                    </span>
                  ))}
                  <button
                    type="button" className={cn(BTN_SM, 'border-[var(--ac)] text-[var(--ac)]')}
                    onClick={() => {
                      const base = f.name.replace(/\s+/g, '');
                      const sug = [base, f.sub.replace(/\s+/g, ''), 'T월드'].filter((t) => t && !f.tags.includes(t));
                      if (!sug.length) { onToast('추가할 추천 태그가 없습니다'); return; }
                      set({ tags: f.tags.concat(sug) });
                      onToast(`AI 추천 태그 ${sug.length}개 추가`);
                    }}
                  >AI 추천</button>
                  <input
                    value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      const v = tagInput.trim();
                      if (v && !f.tags.includes(v)) set({ tags: f.tags.concat(v) });
                      setTagInput('');
                    }}
                    placeholder="태그 입력 후 Enter" className={cn(INP, 'w-[220px]')}
                  />
                </Row>
                <Row label="메타 태그 설정">
                  <div className="grid w-full gap-2 sm:grid-cols-[140px_1fr]">
                    <span className="self-center text-[13px] text-[var(--ink3)]">keywords</span>
                    <input value={f.keywords} onChange={(e) => set({ keywords: e.target.value })} placeholder="콤마로 구분하여 등록해주세요 (ex SKT, SK 텔레콤)" className={INP} />
                    <span className="self-center text-[13px] text-[var(--ink3)]">description</span>
                    <span className="self-center text-[14px] text-[var(--ink3)]">{f.name || '프로모션 명이 자동 입력됩니다'}</span>
                    <span className="self-center text-[13px] text-[var(--ink3)]">og:title</span>
                    <input value={f.ogTitle} onChange={(e) => set({ ogTitle: e.target.value })} placeholder="|로 구분하여 등록해주세요 (ex Galaxy S23 | S23+)" className={INP} />
                    <span className="self-center text-[13px] text-[var(--ink3)]">og:description</span>
                    <input value={f.ogDesc} onChange={(e) => set({ ogDesc: e.target.value })} placeholder="영문 기준 180자, 한글 기준 80자 이내로 등록해주세요" className={INP} />
                    <span className="self-center text-[13px] text-[var(--ink3)]">og:site_name</span>
                    <span className="self-center text-[14px] text-[var(--ink3)]">고정 노출 (TBD)</span>
                  </div>
                </Row>
              </>
            )}
          </Sect>

          <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-6">
            <button type="button" className={BTN} onClick={onCancel}>취소</button>
            <div className="ml-auto flex gap-2">
              <button type="button" className={BTN} onClick={() => { onToast('임시저장 되었습니다.'); onSaved(); }}>임시저장</button>
              <button type="button" className={BTN_PRI} onClick={save}>저장</button>
            </div>
          </div>
        </div>
      </div>

      {cauOpen && (
        <CautionPicker
          type={f.type}
          hasText={!!f.caution.trim()}
          onApply={(tpl) => { set({ caution: tpl.body, cauApplied: `${tpl.name} (${tpl.id})` }); setCauOpen(false); }}
          onClose={() => setCauOpen(false)}
        />
      )}
      {termsOpen && (
        <TermsPicker
          mapped={f.terms.map((t) => t.id)}
          onApply={(ids) => {
            const add = ids.map((id) => ({ id, req: initialReq(termById(id)!) }));
            set({ terms: f.terms.concat(add) });
            setTermsOpen(false);
          }}
          onClose={() => setTermsOpen(false)}
        />
      )}
      {pagePick !== null && (
        <PagePicker
          value={f.ctas.find((c) => c.id === pagePick)?.pg ?? ''}
          onApply={(id) => { setCta(pagePick, { pg: id }); setPagePick(null); }}
          onClose={() => setPagePick(null)}
        />
      )}
      {alertMsg && <MsgBox msg={alertMsg} onOk={() => setAlertMsg(null)} />}
      {confirmMsg && <MsgBox msg={confirmMsg.msg} onOk={() => { confirmMsg.ok(); setConfirmMsg(null); }} onCancel={() => setConfirmMsg(null)} />}
    </div>
  );
}

function MsgBox({ msg, onOk, onCancel }: { msg: string; onOk: () => void; onCancel?: () => void }) {
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/35 p-6" onMouseDown={onCancel ?? onOk}>
      <div onMouseDown={(e) => e.stopPropagation()} className="w-[460px] max-w-full rounded-[var(--dlg-r)] bg-white p-6 shadow-[var(--dlg-shadow)]">
        <p className="whitespace-pre-line text-[14px] leading-[20px] text-[var(--ink)]">{msg}</p>
        <div className="mt-5 flex justify-end gap-2">
          {onCancel && <button type="button" className={BTN} onClick={onCancel}>취소</button>}
          <button type="button" className={BTN_PRI} onClick={onOk}>확인</button>
        </div>
      </div>
    </div>
  );
}

/* ── 하단 CTA 블록 ─────────────────────────────────────────────── */
function CtaRows({ c, idx, total, type, E, onSet, onDel, onPickPage }: {
  c: CtaBlock; idx: number; total: number; type: string; E: FormErrors;
  onSet: (p: Partial<CtaBlock>) => void; onDel: () => void; onPickPage: () => void;
}) {
  const fixed = type === '안내형';
  const opts = ctaOpts(type);
  const isLink = c.type === '링크 버튼';
  const page = SVC_PAGES.find((p) => p.id === c.pg);
  return (
    <>
      {total > 1 && (
        <div className="flex items-center gap-2 border-b border-[var(--line)] bg-[var(--th)] px-4 py-2">
          <b className="text-[13px] text-[var(--ink2)]">하단 CTA {idx + 1}</b>
          {!c.auto && <button type="button" className={cn(BTN_SM, 'ml-auto')} onClick={onDel}>삭제</button>}
        </div>
      )}
      <Row label="하단 CTA 유형" req>
        <select value={c.type} disabled={fixed || c.auto} onChange={(e) => onSet({ type: e.target.value })} className={cn(SEL, 'w-[220px]', (fixed || c.auto) && 'bg-[var(--th)] text-[var(--ink3)]')}>
          {opts.map((o) => <option key={o}>{o}</option>)}
        </select>
        {fixed && <Hint>안내형은 링크 버튼으로 고정돼요</Hint>}
      </Row>
      <Row label="하단 CTA 명" req err={E[`ctaName${c.id}`]}>
        <span id={`err-ctaName${c.id}`} />
        <input value={c.name} onChange={(e) => onSet({ name: e.target.value })} placeholder="버튼 명을 입력해주세요" className={cn(INP, 'w-[320px] max-w-full')} />
      </Row>
      <Row label="하단 CTA 노출 기간" req err={E[`ctaPer${c.id}`]}>
        <span id={`err-ctaPer${c.id}`} />
        <RdPair value={c.per} opts={['상시 노출', '직접 지정'] as const} onChange={(v) => onSet({ per: v, ...(v === '상시 노출' ? { ps: '', pe: '' } : {}) })} />
        <input type="datetime-local" aria-label="노출 시작" value={c.ps} disabled={c.per !== '직접 지정'} onChange={(e) => onSet({ ps: e.target.value })} className={cn(DT, c.per !== '직접 지정' && 'bg-[var(--th)] text-[var(--ink4)]')} />
        <span className="text-[var(--ink3)]">~</span>
        <input type="datetime-local" aria-label="노출 종료" value={c.pe} disabled={c.per !== '직접 지정'} onChange={(e) => onSet({ pe: e.target.value })} className={cn(DT, c.per !== '직접 지정' && 'bg-[var(--th)] text-[var(--ink4)]')} />
      </Row>
      {isLink && (
        <>
          <Row label="하단 CTA 연결 방식" req>
            <RdPair value={c.link} opts={['URL', '서비스 내부 페이지'] as const} onChange={(v) => onSet({ link: v })} />
          </Row>
          {c.link === 'URL' ? (
            <Row label="하단 CTA URL" req err={E[`ctaUrl${c.id}`]}>
              <span id={`err-ctaUrl${c.id}`} />
              <input value={c.url} onChange={(e) => onSet({ url: e.target.value })} placeholder="URL을 입력해주세요" className={cn(INP, 'w-full max-w-[520px]')} />
            </Row>
          ) : (
            <Row label="하단 CTA 연결 페이지" req err={E[`ctaPg${c.id}`]}>
              <span id={`err-ctaPg${c.id}`} />
              {c.pg
                ? <span className="rounded-[4px] bg-[var(--ac2)] px-2 py-0.5 font-mono text-[13px] text-[var(--ac)]" title={page?.name}>{c.pg}</span>
                : <Hint>선택된 페이지가 없어요</Hint>}
              <button type="button" className={BTN_PILL} onClick={onPickPage}>페이지 조회</button>
              <Hint>가입·구매 등 서비스 내부 페이지는 페이지 ID로 연결해요</Hint>
            </Row>
          )}
          <Row label="하단 CTA 열기 방식" req>
            <RdPair value={c.open} opts={['현재 창', '새 창'] as const} onChange={(v) => onSet({ open: v })} />
          </Row>
        </>
      )}
      <Row label="하단 CTA 색상" req err={E[`ctaBg${c.id}`]}>
        <span id={`err-ctaBg${c.id}`} />
        <span className="h-6 w-6 rounded border border-[var(--line2)]" style={{ background: hexOk(c.bg) ?? 'transparent' }} />
        <input value={c.bg} maxLength={7} disabled={c.bgDef} onChange={(e) => onSet({ bg: e.target.value.startsWith('#') || !e.target.value ? e.target.value : `#${e.target.value}` })} className={cn(INP, 'w-[120px]', c.bgDef && 'bg-[var(--th)] text-[var(--ink3)]')} />
        <Ck on={c.bgDef} onChange={() => onSet({ bgDef: !c.bgDef, ...(c.bgDef ? {} : { bg: '#000000' }) })}>기본 컬러 : black</Ck>
      </Row>
      <Row label="하단 CTA 명 색상" req err={E[`ctaFg${c.id}`]}>
        <span id={`err-ctaFg${c.id}`} />
        <span className="h-6 w-6 rounded border border-[var(--line2)]" style={{ background: hexOk(c.fg) ?? 'transparent' }} />
        <input value={c.fg} maxLength={7} disabled={c.fgDef} onChange={(e) => onSet({ fg: e.target.value.startsWith('#') || !e.target.value ? e.target.value : `#${e.target.value}` })} className={cn(INP, 'w-[120px]', c.fgDef && 'bg-[var(--th)] text-[var(--ink3)]')} />
        <Ck on={c.fgDef} onChange={() => onSet({ fgDef: !c.fgDef, ...(c.fgDef ? {} : { fg: '#FFFFFF' }) })}>기본 컬러 : white</Ck>
        {c.auto && <Hint>자동으로 추가된 CTA예요</Hint>}
      </Row>
    </>
  );
}

/* ── FO 미리보기 ───────────────────────────────────────────────── */
const fmtDT = (v: string) => (v ? v.replace('T', ' ').replace(/-/g, '.') : '');

function Preview({ f }: { f: PromoForm }) {
  const s = fmtDT(f.dispS);
  const e = f.dispNoEnd ? '종료일 없음' : fmtDT(f.dispE);
  const js = fmtDT(f.joinS); const je = fmtDT(f.joinE);
  const periodText = f.type !== '안내형'
    ? (js || je ? `${js || '-'} ~ ${je || '-'}` : '참여 기간이 노출됩니다')
    : (s || e ? `${s || '-'} ~ ${e || '-'}` : '전시 기간이 노출됩니다');

  return (
    <aside aria-label="미리보기" className="h-fit overflow-hidden rounded-[12px] border border-[var(--line2)] bg-white">
      <div className="border-b border-[var(--line)] bg-[var(--th)] px-3 py-2 text-[13px] font-semibold text-[var(--ink2)]">미리보기</div>
      <div className="space-y-2 p-3">
        <div className="grid h-[110px] place-items-center rounded-[8px] border border-dashed border-[var(--line3)] bg-[var(--th)] text-center text-[12px] leading-[16px] text-[var(--ink3)]">
          <span><b className="block text-[var(--ink2)]">빌더 구성영역</b>메인 이미지는 빌더에서 설정합니다.</span>
        </div>
        <p className={cn('text-[15px] font-bold leading-[22px]', f.name ? 'text-[var(--ink)]' : 'text-[var(--ink4)]')}>{f.name || '프로모션 명이 노출됩니다'}</p>
        <p className={cn('text-[13px] leading-[18px]', f.sub ? 'text-[var(--ink2)]' : 'text-[var(--ink4)]')}>{f.sub || '서브 타이틀이 노출됩니다'}</p>
        <div className="rounded-[8px] bg-[var(--th)] p-2.5 text-[12px] leading-[18px]">
          <i className="block not-italic font-semibold text-[var(--ink2)]">안내정보</i>
          <div className="mt-1 flex gap-2"><span className="w-10 shrink-0 text-[var(--ink3)]">기간</span><span className="min-w-0 break-words">{periodText}</span></div>
          {f.scope === '제한 공개' && <div className="mt-0.5 flex gap-2"><span className="w-10 shrink-0 text-[var(--ink3)]">대상</span><span>공개 대상 고객 한정</span></div>}
        </div>
        <div className="grid h-[140px] place-items-center rounded-[8px] border border-dashed border-[var(--line3)] bg-[var(--th)] text-center text-[12px] leading-[16px] text-[var(--ink3)]">
          <span><b className="block text-[var(--ink2)]">빌더 구성영역</b>상세 영역은 빌더에서 구성합니다.</span>
        </div>
        <div className="rounded-[8px] border border-[var(--line)] p-2.5">
          <b className="text-[12px] text-[var(--ink2)]">유의사항</b>
          <p className={cn('mt-1 whitespace-pre-line text-[12px] leading-[18px]', f.caution ? 'text-[var(--ink2)]' : 'text-[var(--ink4)]')}>
            {f.caution || '유의사항이 노출됩니다'}
          </p>
        </div>
      </div>
      {f.cta === '사용' && (
        <div className="space-y-1.5 border-t border-[var(--line)] p-3">
          {f.ctas.map((c) => (
            <div key={c.id} className="grid h-9 place-items-center rounded-[8px] text-[13px] font-semibold"
              style={{ background: hexOk(c.bg) ?? '#000000', color: hexOk(c.fg) ?? '#FFFFFF' }}>
              {c.name || '버튼명이 노출됩니다'}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
