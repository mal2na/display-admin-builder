'use client';

/** 전체페이지 관리 › 페이지 상세 — 상세정보 / 개발설정 / BFF 연결 / 변경·승인이력. */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { PageTabs } from '@/components/page-tabs';
import { THEAD_TR_CLS, TBODY_TR_CLS, TABLE_CLS } from '@/components/ops-ui';
import {
  Sect, FTable, FRow, FRow2, Hint, Tag, Chips, ChannelChips, Lnk, Mono,
  BTN, BTN_PRI, BTN_SM, FormActions,
} from './ui';
import { StateChip, UseChip, FoChip, TypeChip, CtLink } from './chips';
import { usePm } from './ctx';
import {
  byId, descendants, crumb, revCrumb, parentCrumb, posText, noUrl, blockInfo, blockText,
  labelsOf, movePending, moveAncestorPending, isChanged, moveImpact, requestApproval, approvePage,
  afterEdit, snap, editorOf, ATTR_LABEL, AUTHS, BIZ, CH, LINES, NAV, MK, PROC, BFF_SAMPLE,
  type Page, type DevSetting,
} from '@/lib/page-menu/model';

const DTABS = [
  { key: 'info', label: '상세정보' },
  { key: 'dev', label: '개발설정' },
  { key: 'bff', label: 'BFF 연결' },
  { key: 'hist', label: '변경/승인이력' },
];

function devOf(p: Page): DevSetting {
  if (!p.dev) p.dev = { proc: '', both: false, wjob: '', mjob: '', ajob: '', guide: '', bff: [] };
  return p.dev;
}

const RO = ({ children }: { children: React.ReactNode }) => <span className="text-[var(--ink)]">{children}</span>;
function RoLinks({ items, onGo }: { items: string[]; onGo: (x: string) => void }) {
  if (!items?.length) return <Hint>—</Hint>;
  return <>{items.map((x) => <Lnk key={x} onClick={() => onGo(x)}>{x}</Lnk>)}</>;
}

export function DetailView({ id }: { id: string }) {
  const pm = usePm();
  const [dtab, setDtab] = React.useState('info');
  React.useEffect(() => setDtab('info'), [id]);
  const p = byId(id);
  if (!p) return <p className="py-20 text-center text-[var(--ink3)]">페이지를 찾을 수 없습니다.</p>;

  const mp = movePending(p) ? p : moveAncestorPending(p);
  const isG = noUrl(p);
  const bi = blockInfo(p);
  const go = (x: string) => pm.toast(`${x} 상세로 이동합니다 (목업)`);

  return (
    <>
      <PageTabs tabs={DTABS} value={dtab} onChange={setDtab} />

      {dtab === 'info' && (
        <>
          {bi && (
            <div className="mt-6 flex items-start gap-3 rounded-[var(--r-field)] bg-[var(--warnbg)] px-4 py-3">
              <b className="text-[16px] leading-[20px]">⛔</b>
              <div className="text-[14px] leading-[20px] text-[var(--warn)]">
                <b>{bi.self ? '일시 차단 중인 페이지입니다' : '상위 페이지 차단으로 일시 차단 중입니다'}</b>
                <br /><span className="text-[13px]">{blockText(p)} · 기간이 끝나면 자동으로 해제됩니다</span>
              </div>
            </div>
          )}

          <Sect title="기본 정보">
            <FTable>
              <FRow k="페이지 ID"><Mono>{p.id}</Mono></FRow>
              <FRow2
                k1="등록 유형" v1={<TypeChip p={p} />}
                k2="컨테이너 ID" v2={<><CtLink p={p} onGo={(ct) => pm.toast(`화면 빌더 › ${ct} 상세로 이동합니다`)} />{p.ptype === 'builder' && <Hint>화면 빌더에 자동 추가됨</Hint>}</>}
              />
              <FRow k="경로">
                <RO>{parentCrumb(p)}</RO>
                <Hint>{posText(p)}</Hint>
                {mp && (
                  <>
                    <Tag tone="warning">승인 대기</Tag>
                    <Hint>FO 반영본: {mp.live?.parent ? crumb(byId(mp.live.parent as string)) : '최상위'}{mp === p ? '' : ` (상위 「${mp.name}」 이동)`}</Hint>
                  </>
                )}
              </FRow>
              <FRow k="페이지명"><RO>{p.name}</RO></FRow>
              <FRow k="URL">
                {isG
                  ? <><Tag tone="neutral">URL 미등록</Tag><Hint>하위 페이지 {descendants(p.id).length}개</Hint></>
                  : <Mono>{p.url}</Mono>}
              </FRow>
            </FTable>
          </Sect>

          <Sect title="운영 정보">
            <FTable>
              <FRow2
                k1="사용 여부" v1={<><UseChip p={p} />{bi && <span className="text-[13px] text-[var(--warn)]">현재 서비스 차단 중입니다 ({bi.b.from} ~ {bi.b.to})</span>}</>}
                k2="FO 메뉴 노출" v2={<FoChip p={p} />}
              />
              <FRow k="운영 채널"><ChannelChips channels={p.channels} /></FRow>
              {!isG && (
                <>
                  <FRow2 k1="검색 노출 여부" v1={p.search ? '사용' : '사용안함'} k2="공유하기 여부" v2={p.share ? '사용' : '사용안함'} />
                  <FRow k="네비게이션 노출"><Chips items={labelsOf(NAV, p.nav)} /></FRow>
                </>
              )}
            </FTable>
          </Sect>

          <Sect title="관리성 정보">
            <FTable>
              <FRow k="비고"><RO>{p.remark || '—'}</RO></FRow>
              {!isG && (
                <>
                  <FRow2 k1="페이지 속성" v1={ATTR_LABEL[p.attr]} k2="화면 제공형태" v2={p.form} />
                  <FRow k="업무처리 형태"><Chips items={labelsOf(BIZ, p.biz)} /></FRow>
                  <FRow k="과금 팝업 호출"><Chips items={labelsOf(CH, p.popCh)} /></FRow>
                </>
              )}
            </FTable>
          </Sect>

          {!isG && (
            <>
              <Sect title="권한 정보">
                <FTable>
                  <FRow k="로그인 권한">
                    <Chips items={p.auths.length === AUTHS.length ? ['전체'].concat(p.auths) : p.auths} />
                  </FRow>
                  <FRow k="회선그룹">
                    <Chips items={labelsOf(LINES, p.lines.indexOf('all') !== -1 ? LINES.map((l) => l[0]) : p.lines)} />
                  </FRow>
                </FTable>
              </Sect>

              <Sect title="연결 정보">
                <FTable>
                  <FRow k="CVM 접촉이벤트 ID">
                    {p.cvm ? <><Lnk onClick={() => go(p.cvm)}>{p.cvm}</Lnk><Hint>사유코드 {p.reason}</Hint></> : <Hint>—</Hint>}
                  </FRow>
                  <FRow k="연결 툴팁 ID"><RoLinks items={p.tooltips} onGo={go} /></FRow>
                  <FRow k="연결 CS코드"><RoLinks items={p.cs} onGo={go} /></FRow>
                  <FRow k="단축 URL ID"><RoLinks items={p.shortUrls} onGo={go} /></FRow>
                </FTable>
              </Sect>

              <MaskSect p={p} />

              <Sect title="검색 및 태그 정보">
                <FTable>
                  <FRow k="태그 사용여부">{p.tagUse ? '사용' : '사용안함'}</FRow>
                  {p.tagUse && (
                    <>
                      <FRow k="검색태그"><Chips items={p.tags} tone="emphasis" /></FRow>
                      <FRow k="메타태그 설정">
                        <MTable rows={[
                          ['keywords', p.keywords || '—'],
                          ['description', <>{revCrumb(p)} <Hint>경로 역순 자동</Hint></>],
                          ['og:title', p.ogTitle || p.name],
                          ['og:description', p.ogDesc || '—'],
                          ['og:site_name', <>TOO <Hint>고정</Hint></>],
                        ]} />
                      </FRow>
                    </>
                  )}
                </FTable>
              </Sect>
            </>
          )}

          <Sect title="담당자 정보">
            <FTable><FRow2 k1="등록자" v1="김혜윤(P217326)" k2="등록일시" v2={p.created} /></FTable>
          </Sect>
        </>
      )}

      {dtab === 'dev' && <DevTab p={p} />}
      {dtab === 'bff' && <BffTab p={p} />}
      {dtab === 'hist' && (
        <Sect title="변경/승인이력">
          <div className="border-t border-[var(--line2)] py-20 text-center text-[var(--ink3)]">이력 화면은 이번 범위에 포함하지 않습니다.</div>
        </Sect>
      )}

      {dtab === 'dev' || dtab === 'bff' ? (
        <FormActions left={<button type="button" className={BTN} onClick={() => pm.go('list')}>목록</button>}>
          <button type="button" className={BTN_PRI} onClick={() => pm.confirmBox(
            '저장하시겠습니까?',
            `입력한 ${dtab === 'dev' ? '개발 설정' : 'BFF 연결'} 내용으로 저장됩니다.`,
            () => pm.toast(`${dtab === 'dev' ? '개발 설정' : 'BFF 연결'} 저장되었습니다`),
          )}>저장</button>
        </FormActions>
      ) : (
        // 하단 바 — [목록] · 반영/수정 메타 · 오른쪽 승인 액션. 좁은 폭에서는 줄바꿈된다.
        <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-[var(--line)] pt-6">
          <button type="button" className={BTN} onClick={() => pm.go('list')}>목록</button>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--ink3)]">
            <span>최종 반영일 <b className="text-[var(--ink)]">{p.liveAt || '—'}</b></span>
            <span>최종 수정자 <b className="text-[var(--ink)]">{editorOf(p)}</b></span>
            <span>최종 수정일시 <b className="text-[var(--ink)]">{p.updated}</b></span>
            <span className="flex items-center gap-1.5">승인상태 <StateChip p={p} /></span>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2"><DetailActions p={p} /></div>
        </div>
      )}
    </>
  );
}

function DetailActions({ p }: { p: Page }) {
  const pm = usePm();
  const edit = () => { pm.setEditing(snap(p) as Page); pm.goEdit(p); };

  if (p.state === 'pending') {
    return (
      <>
        <button type="button" className={BTN} onClick={() => {
          p.state = p.live ? 'live' : 'draft'; p.rejected = true;
          pm.toast('반려 · 작성본으로 돌아감'); pm.bump();
        }}>반려</button>
        <button type="button" className={BTN_PRI} onClick={() => {
          const r = approvePage(p); pm.toast(r.msg); pm.bump();
        }}>승인 (승인자)</button>
      </>
    );
  }
  if (!noUrl(p) && !p.fixed) {
    return (
      <>
        <button type="button" className={BTN} onClick={edit}>수정</button>
        <button type="button" className={BTN_PRI} onClick={() => pm.confirmBox(
          'URL을 확정하시겠습니까?', '확정 후에도 URL을 수정할 수 있으며, 수정하면 다시 확정이 필요합니다.',
          () => { p.fixed = true; const m = afterEdit(p); if (m) pm.toast(m); pm.bump(); },
        )}>URL 확정</button>
      </>
    );
  }
  if (isChanged(p)) {
    const openRequest = () => {
      const im = movePending(p) ? moveImpact(p, p.parent) : null;
      pm.modal({
        title: '승인요청',
        okText: '승인요청',
        body: (
          <div className="space-y-3">
            <div className="grid grid-cols-[110px_1fr] gap-y-1.5 text-[14px]">
              <span className="text-[var(--ink3)]">승인 담당자</span><span>정지솔(SSP12344)</span>
              <span className="text-[var(--ink3)]">담당 사업부</span><span>MT 사업부</span>
            </div>
            {im && (
              <div className="rounded-[var(--r-field)] bg-[var(--th)] px-3 py-2 text-[13px] leading-[18px]">
                <b>경로 변경</b> 「{p.live?.parent ? crumb(byId(p.live.parent as string)) : '최상위'}」 → 「{parentCrumb(p)}」
                {im.kin.length > 0 && ` · 하위 ${im.kin.length}개 함께`}
                <br />승인 시 FO 메뉴가 새 자리로 바뀝니다. 메뉴 유지 {im.all.filter((x) => x.menuOn).length}건
              </div>
            )}
            <div>
              <p className="mb-1.5">요청 내용</p>
              <textarea className="h-[70px] w-full rounded-[var(--r-field)] border border-[var(--line2)] p-2 text-[14px]" />
            </div>
          </div>
        ),
        onOk: () => { const r = requestApproval(p); pm.toast(r.msg); pm.bump(); },
      });
    };
    return (
      <>
        <button type="button" className={BTN} onClick={edit}>수정</button>
        <button type="button" className={BTN_PRI} onClick={openRequest}>승인 요청</button>
      </>
    );
  }
  return <button type="button" className={BTN_PRI} onClick={edit}>수정</button>;
}

/* ── 마스킹 정보 ───────────────────────────────────────────────── */
function MaskSect({ p }: { p: Page }) {
  const items = p.maskOn ? (p.maskItems?.length ? p.maskItems : ['phone', 'name']) : [];
  return (
    <Sect title="마스킹 정보">
      <FTable>
        <FRow2
          k1="적용 여부" v1={p.maskOn ? <Tag tone="emphasis">적용</Tag> : '미적용'}
          k2="해제 방식" v2={p.maskWay || '—'}
        />
        <FRow k="해제 인증">{p.maskAuth || '—'}</FRow>
        <FRow k="마스킹 항목">
          {!p.maskOn ? <Hint>—</Hint> : (
            <div className="w-full">
              <table className={cn(TABLE_CLS, 'text-[13px]')}>
                <thead>
                  <tr className={THEAD_TR_CLS}>
                    {['번호', '마스킹 코드', '마스킹명', '적용등급', '인증 전', '인증 후'].map((h) => <th key={h} className="text-left">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {items.map((k, i) => {
                    const m = MK[k];
                    return (
                      <tr key={k} className={TBODY_TR_CLS}>
                        <td>{i + 1}</td><td className="font-mono">{m[0]}</td><td>{m[1]}</td>
                        <td>{m[2]}</td><td>{m[3]}</td><td>{m[4]}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <Hint>마스킹 항목·등급 체계는 TBD</Hint>
            </div>
          )}
        </FRow>
      </FTable>
    </Sect>
  );
}

function MTable({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <table className="w-full border-collapse text-[14px]">
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k} className="border-b border-[var(--line)] last:border-b-0">
            <th className="w-[160px] bg-[var(--th)] px-3 py-2.5 text-left font-semibold text-[var(--ink2)]">{k}</th>
            <td className="px-3 py-2.5">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ── 개발 설정 ─────────────────────────────────────────────────── */
function DevTab({ p }: { p: Page }) {
  const pm = usePm();
  const d = devOf(p);
  const [, force] = React.useState(0);
  const set = (k: keyof DevSetting, v: unknown) => { (d as Record<string, unknown>)[k] = v; force((n) => n + 1); };
  const INP = 'inp h-[38px] w-[320px] max-w-full rounded-[var(--r-field)] border border-[var(--line3)] px-[14px] text-[14px]';
  void pm;

  return (
    <Sect title="개발 설정">
      <FTable>
        <FRow2
          k1="상품 프로세스 구분 관리"
          v1={(
            <select value={d.proc} onChange={(e) => set('proc', e.target.value)}
              className="sel h-[38px] w-[220px] rounded-[var(--r-field)] border border-[var(--line3)] pl-[14px] pr-8 text-[14px]">
              {PROC.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          )}
          k2="마스킹/업무인증 동시적용 여부"
          v2={(
            <>
              {[['0', '아니오'], ['1', '예']].map(([v, l]) => (
                <label key={v} className="inline-flex cursor-pointer items-center gap-1.5">
                  <input type="radio" name="dv-both" checked={(d.both ? '1' : '0') === v} onChange={() => set('both', v === '1')} className="h-4 w-4" />{l}
                </label>
              ))}
            </>
          )}
        />
        <FRow2
          k1="Web JOB 코드" v1={<input value={d.wjob} onChange={(e) => set('wjob', e.target.value)} placeholder="Web JOB 코드를 입력해주세요." className={INP} />}
          k2="모바일 Web JOB 코드" v2={<input value={d.mjob} onChange={(e) => set('mjob', e.target.value)} placeholder="모바일 Web JOB 코드를 입력해주세요." className={INP} />}
        />
        <FRow2
          k1="App JOB 코드" v1={<input value={d.ajob} onChange={(e) => set('ajob', e.target.value)} placeholder="App JOB 코드를 입력해주세요." className={INP} />}
          k2="가이드 URL" v2={<input value={d.guide} onChange={(e) => set('guide', e.target.value)} placeholder="가이드 URL을 입력해주세요." className={INP} />}
        />
      </FTable>
    </Sect>
  );
}

/* ── BFF 연결 ──────────────────────────────────────────────────── */
const BFF_COLS = ['No.', '구분', 'BFF ID', '업무 API명', 'API URL', '인증범위', '모바일 Web 그룹', '모바일 Web 상세', '모바일 Web 옵션', 'APP 그룹', 'APP 상세', 'APP 옵션', '삭제'];

function BffTab({ p }: { p: Page }) {
  const pm = usePm();
  const d = devOf(p);
  const [, force] = React.useState(0);

  return (
    <Sect title="BFF 연결" right={
      <button type="button" className={BTN} onClick={() => {
        const b = BFF_SAMPLE.filter((x) => !d.bff.some((y) => y.id === x.id))[0];
        if (!b) { pm.toast('추가할 수 있는 BFF가 없습니다 (프로토타입 샘플 3건)'); return; }
        d.bff.push(b); pm.toast(`${b.id} 매핑 추가`); force((n) => n + 1);
      }}>BFF 매핑 추가</button>
    }>
      <p className="mb-2 text-[14px] font-semibold">BFF 연결 목록 <span className="text-[var(--ac)]">{d.bff.length}건</span></p>
      <div className="overflow-x-auto border-t border-[var(--line2)]">
        <table className={cn(TABLE_CLS, 'min-w-[1400px] text-[13px]')}>
          <thead><tr className={THEAD_TR_CLS}>{BFF_COLS.map((c) => <th key={c} className="whitespace-nowrap text-left">{c}</th>)}</tr></thead>
          <tbody>
            {d.bff.length === 0 ? (
              <tr><td colSpan={BFF_COLS.length} className="py-12 text-center text-[var(--ink3)]">매핑된 BFF가 없습니다. [BFF 매핑 추가]로 연결하세요.</td></tr>
            ) : d.bff.map((b, i) => (
              <tr key={b.id} className={TBODY_TR_CLS}>
                <td>{i + 1}</td><td>{b.kind}</td><td className="font-mono">{b.id}</td><td>{b.api}</td>
                <td className="font-mono">{b.url}</td><td>{b.scope}</td>
                <td>{b.mg}</td><td>{b.md}</td><td>{b.mo}</td><td>{b.ag}</td><td>{b.ad}</td><td>{b.ao}</td>
                <td><button type="button" className={BTN_SM} onClick={() => { d.bff.splice(i, 1); force((n) => n + 1); }}>삭제</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 border-t border-[var(--line)] pt-3 text-[13px] font-semibold text-[var(--ink2)]">
        - 고객 상태값에 따라 정지/SMS수신불가 단말기인 경우 우선순위에 따른 적용 : 1순위) S, 2순위) R
      </p>
    </Sect>
  );
}
