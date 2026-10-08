'use client';

/**
 * 전체페이지 관리 › 페이지 등록 / 수정.
 *  프로토타입과 동일하게 **작성본(editing)** 을 편집하고, 저장할 때만 원본에 반영한다.
 *  · URL 등록안함(그룹) 이면 사용 여부·운영 채널·비고 외 항목은 숨긴다.
 *  · 전시 컨테이너는 URL 필수 · 저장 시 컨테이너 ID(CT) 발급.
 *  · 경로를 바꾸면 저장 전에 이동 영향(하위 N개 · 메뉴에서 빠지는 건수)을 확인창으로 보여준다.
 */
import * as React from 'react';
import {
  Sect, FTable, FRow, FRow2, Hint, Block, Opt, OptGroup, Tag,
  BTN, BTN_PRI, BTN_SM, FormActions,
} from './ui';
import { StateChip, CtLink } from './chips';
import { PathPicker, type PickerSpec } from './path-picker';
import { usePm } from './ctx';
import {
  byId, descendants, crumb, revCrumb, noUrl, blockInfo, editorOf,
  moveCheck, moveImpact, movePage, mkPage, ensureCt, afterEdit, foLabel,
  ATTR_LABEL, AUTHS, BIZ, CH, LINES, NAV, FORMS, PTYPE, CVM_REASON,
  type Page,
} from '@/lib/page-menu/model';

const INP = 'inp h-[38px] rounded-[var(--r-field)] border border-[var(--line3)] px-[14px] text-[14px]';
const W_MD = 'w-[320px] max-w-full';
const W_LG = 'w-[520px] max-w-full';

/** 저장 시 원본으로 옮기는 필드 */
const SAVE_KEYS = ['ptype', 'name', 'url', 'use', 'channels', 'search', 'remark', 'attr', 'form',
  'auths', 'share', 'biz', 'popCh', 'nav', 'lines', 'cvm', 'reason', 'tagUse', 'tags', 'keywords', 'ogTitle', 'ogDesc'] as const;

export function FormView({ isCreate }: { isCreate: boolean }) {
  const pm = usePm();
  const e = pm.editing;
  const orig = isCreate ? null : byId(pm.current ?? '');
  const [, force] = React.useState(0);
  const bump = () => force((n) => n + 1);
  const [picker, setPicker] = React.useState<PickerSpec | null>(null);
  const [tagInput, setTagInput] = React.useState<string | null>(null);

  if (!e) return <p className="py-20 text-center text-[var(--ink3)]">작성 중인 내용이 없습니다.</p>;
  if (!isCreate && !orig) return <p className="py-20 text-center text-[var(--ink3)]">페이지를 찾을 수 없습니다.</p>;

  const n = isCreate ? 0 : descendants(orig!.id).length;
  const moved = !isCreate && e.parent !== orig!.parent;
  const im = moved ? moveImpact(orig!, e.parent) : null;
  if (e.nourl === undefined) e.nourl = !isCreate && !e.url;
  if (e.ptype === 'builder') e.nourl = false;
  const isG = !!e.nourl;
  const isB = e.ptype === 'builder';
  const typeLock = !isCreate && orig!.ptype === 'builder' && !!orig!.ct;
  if (e._sub === undefined) e._sub = !!e.parent;

  const set = (patch: Partial<Page>) => { Object.assign(e, patch); bump(); };
  const toggle = (key: 'channels' | 'nav' | 'biz' | 'popCh' | 'auths' | 'lines', v: string) => {
    const cur = (e[key] as string[]) ?? [];
    set({ [key]: cur.includes(v) ? cur.filter((x) => x !== v) : cur.concat(v) } as Partial<Page>);
  };
  const setAll = (key: 'channels' | 'auths' | 'lines', defs: string[], on: boolean) => set({ [key]: on ? defs.slice() : [] } as Partial<Page>);

  const Yn = ({ val, on }: { val: boolean; on: (v: boolean) => void }) => (
    <OptGroup>
      <Opt checked={val} onChange={() => on(true)}>사용</Opt>
      <Opt checked={!val} onChange={() => on(false)}>사용안함</Opt>
    </OptGroup>
  );
  const Cks = ({ defs, sel, onToggle, allKey }: {
    defs: [string, string][]; sel: string[]; onToggle: (v: string) => void; allKey?: 'channels' | 'auths' | 'lines';
  }) => {
    const all = defs.every((d) => sel.includes(d[0]));
    return (
      <OptGroup>
        {allKey && <Opt type="checkbox" checked={all} onChange={() => setAll(allKey, defs.map((d) => d[0]), !all)}>전체</Opt>}
        {defs.map(([v, l]) => <Opt key={v} type="checkbox" checked={sel.includes(v)} onChange={() => onToggle(v)}>{l}</Opt>)}
      </OptGroup>
    );
  };

  /* ── 저장 ── */
  const doSave = () => {
    if (!e.name.trim()) { pm.toast('페이지명을 입력해 주세요'); return; }
    if (e._sub && !e.parent) { pm.toast('상위 메뉴를 선택해 주세요'); return; }
    if (isG) e.url = '';
    if (isB && !e.url) { pm.toast('전시 컨테이너는 URL을 입력해야 저장할 수 있습니다'); return; }
    if (!e.channels.length) { pm.toast('운영 채널을 최소 하나 이상 선택해야 합니다'); return; }
    if (!isCreate && e.form !== 'Page' && !noUrl(orig!) && orig!.inMenu && orig!.menuOn) {
      pm.toast('전체메뉴에 노출 중인 페이지는 화면 형태를 Page 외로 바꿀 수 없습니다. 먼저 미노출로 내려 주세요'); return;
    }

    if (isCreate) {
      pm.confirmBox('저장하시겠습니까?', '입력한 내용으로 저장됩니다.', () => {
        const r = mkPage({ name: e.name, parent: e.parent, url: e.url });
        if (!r.ok || !r.p) { pm.toast(r.msg ?? ''); return; }
        SAVE_KEYS.forEach((k) => { if (k !== 'name' && k !== 'url') (r.p as Record<string, unknown>)[k] = (e as Record<string, unknown>)[k]; });
        const nb = ensureCt(r.p);
        pm.setEditing(null);
        pm.goDetail(r.id!);
        pm.toast(`${r.id}${nb ? ` · ${r.p.ct}` : ''} 등록 · 작성중${noUrl(r.p) ? ' · 승인 요청 가능' : ' · URL 확정 후 승인 요청'}`);
      });
      return;
    }

    const apply = () => {
      const o = orig!;
      const urlChanged = o.fixed && o.url !== e.url;
      SAVE_KEYS.forEach((k) => { (o as Record<string, unknown>)[k] = (e as Record<string, unknown>)[k]; });
      if (urlChanged) o.fixed = false;
      const nb = ensureCt(o);
      let msg = urlChanged ? '저장되었습니다 — URL이 바뀌어 다시 확정이 필요합니다'
        : nb ? `저장되었습니다 — 컨테이너 ID ${o.ct} 생성 · 화면 빌더에 자동 추가` : '';
      if (e.parent !== o.parent) {
        const r = movePage(o, e.parent);
        if (!r.ok) { pm.toast(r.msg); return; }
        msg = r.msg + (nb ? ` · 컨테이너 ID ${o.ct} 생성` : '');
      }
      afterEdit(o);
      pm.setEditing(null);
      pm.goDetail(o.id);
      pm.toast(msg || '저장되었습니다 (작성본) — 승인 요청하세요');
    };

    if (e.parent !== orig!.parent) {
      const c = moveCheck(orig!, e.parent);
      if (!c.ok) { pm.toast(c.msg ?? ''); return; }
      confirmMove(orig!, e.parent, apply);
      return;
    }
    pm.confirmBox('저장하시겠습니까?', '입력한 내용으로 저장됩니다.', apply);
  };

  const confirmMove = (p: Page, np: string | null, onOk: () => void) => {
    const mi = moveImpact(p, np);
    const dest = np ? crumb(byId(np)) : '최상위';
    pm.modal({
      title: '경로를 이동하시겠습니까?',
      okText: '이동',
      width: 600,
      body: (
        <div className="space-y-3">
          <p>
            「<b>{p.name}</b>」{mi.kin.length ? ` 과 하위 ${mi.kin.length}개를` : '을'} 「<b>{dest}</b>」 아래로 옮깁니다.
            URL과 페이지 ID는 그대로입니다.
          </p>
          <ul className="list-disc space-y-1 rounded-[var(--r-field)] bg-[var(--th)] py-3 pl-8 pr-3 text-[13px] leading-[18px]">
            <li>메뉴 노출 유지 {mi.keep.length}건</li>
            {mi.lost.length ? (
              <li className="text-[var(--warn)]">
                {mi.parentOk ? '3뎁스를 벗어나 메뉴에서 빠짐: ' : '새 상위가 메뉴에 등록되어 있지 않아 메뉴에서 빠짐: '}
                {mi.lost.length}건 — {mi.lost.map((x) => x.name).join(', ')}
              </li>
            ) : <li>3뎁스를 벗어나는 페이지 없음</li>}
          </ul>
        </div>
      ),
      onOk,
    });
  };

  const openPicker = () => setPicker({
    page: isCreate ? null : orig,
    name: e.name || '새 페이지',
    current: e.parent,
    exclude: isCreate ? [] : [orig!.id].concat(descendants(orig!.id).map((c) => c.id)),
    onPick: (np) => {
      if (!isCreate && np !== orig!.parent) {
        const c = moveCheck(orig!, np);
        if (!c.ok) { pm.toast(c.msg ?? ''); return; }
      }
      set({ parent: np });
    },
  });

  const bi = !isCreate ? blockInfo(orig!) : null;

  return (
    <>
      <Sect title="기본 정보">
        <FTable>
          <FRow k="페이지 ID"><input value={e.id} disabled className={`${INP} ${W_MD} bg-[var(--th)] text-[var(--ink3)]`} /></FRow>
          <FRow k="등록 유형">
            <OptGroup>
              {Object.keys(PTYPE).map((k) => (
                <Opt key={k} checked={e.ptype === k} disabled={typeLock} onChange={() => set({ ptype: k })}>{PTYPE[k]}</Opt>
              ))}
            </OptGroup>
            <Block>
              {typeLock ? `컨테이너 ID ${orig!.ct}가 생성된 페이지라 유형을 바꿀 수 없습니다`
                : isB ? '전시 컨테이너: 저장하면 페이지 ID와 함께 컨테이너 ID(CT)가 생성되어 화면 빌더에 자동 추가됩니다. URL·메타태그는 빌더가 아닌 여기서만 입력합니다.'
                  : '개발 화면은 빌더 없이 운영합니다.'}
            </Block>
          </FRow>
          {!isCreate && orig!.ptype === 'builder' && (
            <FRow k="컨테이너 ID"><CtLink p={orig!} onGo={(ct) => pm.toast(`화면 빌더 › ${ct} 상세로 이동합니다`)} /></FRow>
          )}
          <FRow k="경로">
            <OptGroup>
              <Opt checked={!e._sub} onChange={() => {
                if (!isCreate && orig!.parent !== null) {
                  const c = moveCheck(orig!, null);
                  if (!c.ok) { pm.toast(c.msg ?? ''); return; }
                }
                set({ _sub: false, parent: null });
              }}>1 Depth</Opt>
              <Opt checked={!!e._sub} onChange={() => { set({ _sub: true }); if (!e.parent) setTimeout(openPicker, 0); }}>하위 Depth</Opt>
            </OptGroup>
            {e._sub && (
              <>
                {e.parent ? <span>상위: <b>{crumb(byId(e.parent))}</b></span> : <Hint>상위 메뉴를 선택하세요</Hint>}
                <button type="button" className={BTN_SM} onClick={openPicker}>{e.parent ? '상위 변경' : '상위 선택'}</button>
              </>
            )}
            {!isCreate && !!n && !moved && (
              <Block tone="warn">안내: 경로를 변경하면 해당 메뉴 하위 {n}개가 함께 이동합니다.</Block>
            )}
            {!isCreate && moved && im && (
              <Block tone="acc">
                저장 후 승인되면 FO 메뉴가 새 자리로 바뀝니다. 메뉴 유지 {im.keep.length}건
                {im.lost.length > 0 && `, 3뎁스를 벗어나 빠짐 ${im.lost.length}건(${im.lost.map((x) => x.name).join(', ')})`}. URL은 유지됩니다.
              </Block>
            )}
          </FRow>
          <FRow k="메뉴명" required>
            <input value={e.name} onChange={(ev) => set({ name: ev.target.value })}
              placeholder="메뉴명을 입력해주세요." className={`${INP} ${W_MD}`} />
          </FRow>
          <FRow k="URL">
            {e.fixed ? (
              <>
                <input value={e.url} onChange={(ev) => set({ url: ev.target.value })} placeholder="URL을 입력하세요." className={`${INP} ${W_LG}`} />
                <Block tone="acc">확정된 URL입니다. 수정하면 다시 확정이 필요합니다.</Block>
              </>
            ) : isB ? (
              <>
                <input value={e.url} onChange={(ev) => set({ url: ev.target.value })} placeholder="URL을 입력하세요." className={`${INP} ${W_LG}`} />
                <Block>전시 컨테이너는 URL 등록이 필수입니다 (등록안함 불가)</Block>
              </>
            ) : (
              <>
                <OptGroup>
                  <Opt checked={isG} onChange={() => set({ nourl: true, url: '' })}>등록안함</Opt>
                  <Opt checked={!isG} onChange={() => set({ nourl: false })}>등록</Opt>
                </OptGroup>
                <input value={e.url} disabled={isG} onChange={(ev) => set({ url: ev.target.value })}
                  placeholder="URL을 입력하세요." className={`${INP} ${W_LG} ${isG ? 'bg-[var(--th)] text-[var(--ink4)]' : ''}`} />
                {isG && (
                  <Block>
                    URL을 등록하지 않으면 사용 여부·운영 채널·비고 외 항목은 입력하지 않아도 됩니다.
                    하위 페이지를 묶는 상위 항목으로 쓸 수 있고 URL 확정 없이 승인 요청할 수 있습니다.
                  </Block>
                )}
              </>
            )}
          </FRow>
        </FTable>
      </Sect>

      <Sect title="운영 정보">
        <FTable>
          {isCreate ? (
            <FRow k="사용 여부"><Yn val={e.use} on={(v) => set({ use: v })} /></FRow>
          ) : (
            <FRow2
              k1="사용 여부"
              v1={(
                <>
                  <Yn val={e.use} on={(v) => set({ use: v })} />
                  {bi && <span className="text-[13px] text-[var(--warn)]">
                    {bi.self ? '현재 서비스 차단 중입니다' : `상위 「${bi.src.name}」 차단으로 서비스 차단 중입니다`} ({bi.b.from} ~ {bi.b.to})
                  </span>}
                </>
              )}
              k2="FO 메뉴 노출" v2={<Tag tone={foLabel(orig!) === '노출' ? 'success' : 'neutral'}>{foLabel(orig!)}</Tag>}
            />
          )}
          <FRow k="운영 채널" required>
            <Cks defs={CH} sel={e.channels} onToggle={(v) => toggle('channels', v)} allKey="channels" />
          </FRow>
          {!isG && (
            <>
              <FRow2
                k1="검색 노출 여부" v1={<Yn val={e.search} on={(v) => set({ search: v })} />}
                k2="공유하기 여부" v2={<Yn val={e.share} on={(v) => set({ share: v })} />}
              />
              <FRow k="네비게이션 노출"><Cks defs={NAV} sel={e.nav} onToggle={(v) => toggle('nav', v)} /></FRow>
            </>
          )}
        </FTable>
      </Sect>

      <Sect title="관리성 정보">
        <FTable>
          <FRow k="비고">
            <input value={e.remark} onChange={(ev) => set({ remark: ev.target.value })}
              placeholder="페이지에 대한 비고사항을 입력해주세요." className={`${INP} ${W_LG}`} />
          </FRow>
          {!isG && (
            <>
              <FRow2
                k1="페이지 속성"
                v1={<OptGroup>{['html', 'node', 'native', 'bp'].map((a) => (
                  <Opt key={a} checked={e.attr === a} onChange={() => set({ attr: a })}>{ATTR_LABEL[a]}</Opt>
                ))}</OptGroup>}
                k2="화면 제공형태"
                v2={<OptGroup>{FORMS.map((a) => (
                  <Opt key={a} checked={e.form === a} onChange={() => set({ form: a })}>{a}</Opt>
                ))}</OptGroup>}
              />
              <FRow k="업무처리 형태"><Cks defs={BIZ} sel={e.biz} onToggle={(v) => toggle('biz', v)} /></FRow>
              <FRow k="과금 팝업 호출"><Cks defs={CH} sel={e.popCh} onToggle={(v) => toggle('popCh', v)} /></FRow>
            </>
          )}
        </FTable>
      </Sect>

      {!isG && (
        <>
          <Sect title="권한 정보">
            <FTable>
              <FRow k="로그인 권한">
                <Cks defs={AUTHS.map((a) => [a, a] as [string, string])} sel={e.auths} onToggle={(v) => toggle('auths', v)} allKey="auths" />
              </FRow>
              <FRow k="회선그룹">
                <Cks
                  defs={LINES.slice(1)}
                  sel={e.lines.indexOf('all') !== -1 ? LINES.slice(1).map((l) => l[0]) : e.lines}
                  onToggle={(v) => {
                    const cur = e.lines.indexOf('all') !== -1 ? LINES.slice(1).map((l) => l[0]) : e.lines;
                    const next = cur.includes(v) ? cur.filter((x) => x !== v) : cur.concat(v);
                    set({ lines: next.length === LINES.length - 1 ? ['all'] : next });
                  }}
                  allKey="lines"
                />
              </FRow>
            </FTable>
          </Sect>

          <Sect title="연결 정보">
            <FTable>
              <FRow k="CVM 접촉이벤트 ID">
                <input value={e.cvm} onChange={(ev) => set({ cvm: ev.target.value })}
                  placeholder="접촉이벤트 ID" className={`${INP} ${W_MD}`} />
                <button type="button" className={BTN_SM} onClick={() => {
                  const id = e.cvm.trim();
                  if (!id) { pm.toast('접촉이벤트 ID를 입력해 주세요'); return; }
                  const rs = CVM_REASON[id];
                  set({ reason: rs || `RS${id.replace(/\D/g, '').slice(-4)} · (조회 결과)` });
                  pm.toast(rs ? '사유코드 조회 완료' : '샘플 사유코드로 채움 (실서비스는 CVM 연동)');
                }}>조회</button>
                <Hint>사유코드: {e.reason || '—'} (조회 시 자동 입력)</Hint>
              </FRow>
              {!isCreate && (
                <>
                  <FRow k="연결 툴팁 ID">{orig!.tooltips.length ? orig!.tooltips.join(' · ') : <Hint>—</Hint>}</FRow>
                  <FRow k="연결 CS코드">{orig!.cs.length ? orig!.cs.join(' · ') : <Hint>—</Hint>}</FRow>
                  <FRow k="단축 URL ID">{orig!.shortUrls.length ? orig!.shortUrls.join(' · ') : <Hint>—</Hint>}</FRow>
                </>
              )}
            </FTable>
          </Sect>

          <Sect title="검색 및 태그정보">
            <FTable>
              <FRow k="태그 사용여부"><Yn val={e.tagUse} on={(v) => set({ tagUse: v })} /></FRow>
              {e.tagUse && (
                <>
                  <FRow k="메타 태그">
                    <div className="flex w-full flex-wrap items-center gap-1.5">
                      {e.tags.map((t, i) => (
                        <span key={`${t}-${i}`} className="inline-flex items-center gap-1 rounded-[4px] bg-[var(--ac2)] px-2 py-0.5 text-[13px] text-[var(--ac)]">
                          {t}
                          <button type="button" onClick={() => { e.tags.splice(i, 1); bump(); }} className="font-bold">×</button>
                        </span>
                      ))}
                      <button type="button" className={BTN_SM} onClick={() => {
                        const base = (e.name || '').replace(/\s+/g, '');
                        const sug = [base, e.parent ? byId(e.parent).name.replace(/\s+/g, '') : '', 'T월드', (e.keywords || '').split(',')[0].trim()]
                          .filter((t) => t && e.tags.indexOf(t) === -1);
                        sug.forEach((t) => e.tags.push(t));
                        pm.toast(sug.length ? `AI 추천 태그 ${sug.length}개 추가` : '추가할 추천 태그가 없습니다');
                        bump();
                      }}>AI 추천</button>
                      <button type="button" className={BTN_SM} onClick={() => setTagInput('')}>+</button>
                      {tagInput !== null && (
                        <input
                          autoFocus value={tagInput}
                          onChange={(ev) => setTagInput(ev.target.value)}
                          onKeyDown={(ev) => {
                            if (ev.key === 'Enter') {
                              const v = tagInput.trim();
                              if (v && e.tags.indexOf(v) === -1) e.tags.push(v);
                              setTagInput(''); bump();
                            }
                            if (ev.key === 'Escape') setTagInput(null);
                          }}
                          placeholder="태그 입력 후 Enter"
                          className={`${INP} w-[200px]`}
                        />
                      )}
                    </div>
                  </FRow>
                  <FRow k="메타 태그 설정">
                    <table className="w-full border-collapse text-[14px]">
                      <tbody>
                        {([
                          ['keywords', <input key="kw" value={e.keywords} onChange={(ev) => set({ keywords: ev.target.value })} placeholder="쉼표로 구분" className={`${INP} ${W_LG}`} />],
                          ['description', <span key="d" className="flex flex-wrap items-center gap-2"><input value={revCrumb(e)} readOnly className={`${INP} ${W_LG} bg-[var(--th)] text-[var(--ink3)]`} /><Hint>경로 역순 자동 생성</Hint></span>],
                          ['og:title', <input key="ogt" value={e.ogTitle} onChange={(ev) => set({ ogTitle: ev.target.value })} placeholder={e.name || '페이지명'} className={`${INP} ${W_LG}`} />],
                          ['og:description', <input key="ogd" value={e.ogDesc} onChange={(ev) => set({ ogDesc: ev.target.value })} className={`${INP} ${W_LG}`} />],
                          ['og:site_name', <span key="site" className="flex flex-wrap items-center gap-2"><input value="TOO" readOnly className={`${INP} ${W_MD} bg-[var(--th)] text-[var(--ink3)]`} /><Hint>고정</Hint></span>],
                        ] as [string, React.ReactNode][]).map(([k, v]) => (
                          <tr key={k} className="border-b border-[var(--line)] last:border-b-0">
                            <th className="w-[160px] bg-[var(--th)] px-3 py-2.5 text-left font-semibold text-[var(--ink2)]">{k}</th>
                            <td className="px-3 py-2.5">{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </FRow>
                </>
              )}
            </FTable>
          </Sect>
        </>
      )}

      {!isCreate && (
        <Sect title="담당자 정보">
          <FTable>
            <FRow2 k1="등록자" v1="김혜윤(P217326)" k2="등록일시" v2={orig!.created} />
            <FRow2 k1="최근 수정자" v1={editorOf(orig!)} k2="최근 수정일시" v2={orig!.updated} />
            <FRow2 k1="최종 반영일" v1={orig!.liveAt || '—'} k2="승인상태" v2={<StateChip p={orig!} />} />
          </FTable>
        </Sect>
      )}

      <FormActions>
        <button type="button" className={BTN} onClick={() => pm.confirmBox(
          '취소하시겠습니까?', '취소 시 입력한 정보는 모두 삭제됩니다.',
          () => { pm.setEditing(null); if (isCreate) pm.go('list'); else pm.goDetail(orig!.id); },
        )}>취소</button>
        <button type="button" className={BTN_PRI} onClick={doSave}>저장</button>
      </FormActions>

      {picker && <PathPicker spec={picker} onClose={() => setPicker(null)} />}
    </>
  );
}
