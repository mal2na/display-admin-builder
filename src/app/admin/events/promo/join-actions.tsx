'use client';

/**
 * 참여 행동 — 직접 참여일 때만. 여러 개면 순서대로 모두 완료해야 참여로 친다.
 *  유형마다 딸린 설정이 다르고, '버튼 참여'는 하단 CTA가, '룰렛'은 리워드 구간이 자동으로 따라온다.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Dialog, BTN, BTN_SM, BTN_PILL, INP, SEL, Hint } from './form-ui';
import {
  JA_TYPES, SEL_SRC, RV_PAGES, newJaItem, newRoulResult, jaHint,
  type JaItem, type JaType, type RoulResult,
} from '@/lib/promotion/pr';

const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-[100px_1fr] items-start gap-2 py-1.5">
    <span className="pt-1.5 text-[13px] leading-[20px] text-[var(--ink3)]">{label}</span>
    <div className="flex min-w-0 flex-wrap items-center gap-2 text-[14px]">{children}</div>
  </div>
);

export function JoinActions({ items, onChange, err, onToast, guest }: {
  items: JaItem[]; onChange: (v: JaItem[]) => void; err?: string; onToast: (m: string) => void;
  /** 비회원 참여 Y — '기존 입력 구성요소' 사용 불가(2026-10-20 프로토타입 개정) */
  guest?: boolean;
}) {
  const [pick, setPick] = React.useState<null | { kind: 'survey' | 'page'; id: number }>(null);
  // 비회원 참여 Y로 바뀌면 '기존 입력 구성요소'로 설정된 정보 입력은 '코드 입력'으로 자동 전환
  React.useEffect(() => {
    if (!guest) return;
    const needs = items.some((it) => it.type === '정보 입력' && it.inKind === '기존 입력 구성요소');
    if (needs) onChange(items.map((it) => (it.type === '정보 입력' && it.inKind === '기존 입력 구성요소' ? { ...it, inKind: '코드 입력' } : it)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guest]);
  const set = (id: number, p: Partial<JaItem>) => onChange(items.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const multi = items.length > 1;
  const used = items.map((i) => i.type);

  return (
    <div className="w-full">
      <div className="space-y-2">
        {items.map((it, k) => (
          <div key={it.id} className="rounded-[10px] border border-[var(--line2)] p-3">
            <div className="flex flex-wrap items-center gap-2">
              {multi && <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--ac2)] text-[12px] font-bold text-[var(--ac)]">{k + 1}</span>}
              <select
                aria-label="참여 행동 유형" value={it.type} className={cn(SEL, 'w-[200px]')}
                onChange={(e) => set(it.id, { type: e.target.value as JaType | '' })}
              >
                <option value="">선택해주세요</option>
                {JA_TYPES.map((o) => <option key={o} value={o} disabled={o !== it.type && used.includes(o)}>{o}</option>)}
              </select>
              <Hint>{jaHint(it)}</Hint>
              {multi && <button type="button" className={cn(BTN_SM, 'ml-auto')} onClick={() => onChange(items.filter((x) => x.id !== it.id))}>삭제</button>}
            </div>

            {it.type === '설문' && (
              <F label="설문 ID">
                {it.selId
                  ? <span className="rounded-[4px] bg-[var(--ac2)] px-2 py-0.5 font-mono text-[13px] text-[var(--ac)]" title={SEL_SRC.find((s) => s.id === it.selId)?.q}>{it.selId}</span>
                  : <Hint>선택된 설문이 없어요</Hint>}
                <button type="button" className={BTN_PILL} onClick={() => setPick({ kind: 'survey', id: it.id })}>설문 조회</button>
                <Hint>질문·선택지·정답은 설문 관리에서 등록한 원천 데이터를 사용해요</Hint>
              </F>
            )}

            {it.type === '정보 입력' && (
              <>
                <F label="입력 유형">
                  <select aria-label="입력 유형" value={it.inKind} onChange={(e) => set(it.id, { inKind: e.target.value as JaItem['inKind'] })} className={cn(SEL, 'w-[240px]')}>
                    <option value="기존 입력 구성요소" disabled={guest}>{guest ? '기존 입력 구성요소 (비회원 참여 Y 시 사용 불가)' : '기존 입력 구성요소'}</option>
                    <option>코드 입력</option>
                  </select>
                </F>
                {it.inKind === '기존 입력 구성요소' ? (
                  <>
                    <F label="구성요소">
                      <select aria-label="구성요소" value={it.comp} onChange={(e) => set(it.id, { comp: e.target.value as JaItem['comp'] })} className={cn(SEL, 'w-[180px]')}>
                        <option>이벤트 댓글</option><option>상품 리뷰</option>
                      </select>
                      <Hint>선택한 구성요소의 입력 규칙을 그대로 사용해요</Hint>
                    </F>
                    {it.comp === '상품 리뷰' && (
                      <F label="리뷰 페이지">
                        {it.pgId
                          ? <span className="rounded-[4px] bg-[var(--ac2)] px-2 py-0.5 font-mono text-[13px] text-[var(--ac)]">{it.pgId}</span>
                          : <Hint>선택된 페이지가 없어요</Hint>}
                        <button type="button" className={BTN_PILL} onClick={() => setPick({ kind: 'page', id: it.id })}>페이지 조회</button>
                        <Hint>해당 상품 페이지에 리뷰를 등록하면 참여로 인정해요</Hint>
                      </F>
                    )}
                  </>
                ) : (
                  <>
                    <F label="코드 관리">
                      <select aria-label="코드 관리" value={it.codeKind} onChange={(e) => set(it.id, { codeKind: e.target.value as JaItem['codeKind'] })} className={cn(SEL, 'w-[220px]')}>
                        <option>공통 코드 1개</option><option>개별 코드 일괄 생성</option><option>외부 발급 코드</option>
                      </select>
                    </F>
                    {it.codeKind === '공통 코드 1개' && (
                      <F label="참여 코드">
                        <input value={it.codeVal} onChange={(e) => set(it.id, { codeVal: e.target.value })} placeholder="직접 입력" className={cn(INP, 'w-[220px]')} />
                        <button type="button" className={BTN_SM} onClick={() => set(it.id, { codeVal: `EV${Math.random().toString(36).slice(2, 8).toUpperCase()}` })}>자동 생성</button>
                      </F>
                    )}
                    {it.codeKind === '개별 코드 일괄 생성' && (
                      <F label="생성 수량">
                        <input type="number" min={1} value={it.codeQty} onChange={(e) => set(it.id, { codeQty: e.target.value })} className={cn(INP, 'w-[110px]')} /> 개
                        <button type="button" className={BTN_SM} onClick={() => onToast(`개별 코드 ${it.codeQty}개를 생성해 내려받아요. (프로토타입에서는 파일이 생성되지 않아요)`)}>생성·다운로드</button>
                      </F>
                    )}
                    {it.codeKind === '외부 발급 코드' && <F label="외부 연동"><Hint>외부 코드 발급 시스템 연동 (개발 확인 필요)</Hint></F>}
                  </>
                )}
              </>
            )}

            {it.type === '즉시 결과형(룰렛)' && (
              <F label="결과 항목">
                <div className="w-full">
                  <div className="grid grid-cols-[48px_1fr_160px_32px] items-center gap-2 border-b border-[var(--line)] pb-1.5 text-[12px] font-semibold text-[var(--ink3)]">
                    <span>번호</span><span>결과명</span><span>리워드 지급 여부</span><span />
                  </div>
                  {(() => { let n = 0; return it.results.map((r) => {
                    const no = r.pay === 'Y' ? (n += 1) : null;
                    return (
                      <div key={r.id} className="grid grid-cols-[48px_1fr_160px_32px] items-center gap-2 border-b border-[var(--line)] py-1.5">
                        <span className={cn('text-[13px] font-semibold tabular-nums', no ? 'text-[var(--ac)]' : 'text-[var(--ink4)]')}>{no ?? '–'}</span>
                        <input value={r.name} placeholder="결과 항목명" className={cn(INP, 'h-[34px] w-full')}
                          onChange={(e) => set(it.id, { results: it.results.map((x) => (x.id === r.id ? { ...x, name: e.target.value } : x)) })} />
                        <span className="flex items-center gap-3">
                          {(['Y', 'N'] as const).map((o) => (
                            <label key={o} className="inline-flex cursor-pointer items-center gap-1.5">
                              <input type="radio" checked={r.pay === o} className="h-4 w-4"
                                onChange={() => set(it.id, { results: it.results.map((x) => (x.id === r.id ? { ...x, pay: o } : x)) })} />
                              {o}
                            </label>
                          ))}
                        </span>
                        <button type="button" aria-label="결과 항목 삭제" className="text-[var(--ink3)] hover:text-[var(--bad)]"
                          onClick={() => set(it.id, { results: it.results.filter((x) => x.id !== r.id) })}>×</button>
                      </div>
                    );
                  }); })()}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button type="button" className={BTN_SM} onClick={() => set(it.id, { results: it.results.concat(newRoulResult()) })}>결과 항목 추가</button>
                    <Hint>리워드 지급 여부가 Y인 결과마다 리워드 목록에 구간이 만들어져요 · 번호 = 구간 번호</Hint>
                  </div>
                </div>
              </F>
            )}
          </div>
        ))}
      </div>

      <button
        type="button" className={cn(BTN_SM, 'mt-2')} disabled={items.length >= JA_TYPES.length}
        onClick={() => {
          const free = JA_TYPES.find((t) => !used.includes(t));
          if (!free) return;
          onChange(items.concat(newJaItem(free)));
        }}
      >참여 행동 추가</button>
      {err && <p className="mt-1.5 text-[13px] text-[var(--bad)]">{err}</p>}

      {pick?.kind === 'survey' && (
        <ListPicker
          title="설문 조회" sub="설문 관리에 등록된 설문 (예시 데이터)"
          rows={SEL_SRC.map((s) => ({ id: s.id, name: s.q }))}
          value={items.find((i) => i.id === pick.id)?.selId ?? ''}
          onApply={(id) => { set(pick.id, { selId: id }); setPick(null); }}
          onClose={() => setPick(null)}
        />
      )}
      {pick?.kind === 'page' && (
        <ListPicker
          title="리뷰 페이지 조회" sub="상품 리뷰를 사용하는 페이지 (예시 데이터)"
          rows={RV_PAGES.map((p) => ({ id: p.id, name: p.name, extra: `리뷰 ${p.cnt.toLocaleString('ko-KR')}건` }))}
          value={items.find((i) => i.id === pick.id)?.pgId ?? ''}
          onApply={(id) => { set(pick.id, { pgId: id }); setPick(null); }}
          onClose={() => setPick(null)}
        />
      )}
    </div>
  );
}

/** 단일 선택 조회 팝업 (설문 · 리뷰 페이지 공용) */
export function ListPicker({ title, sub, rows, value, onApply, onClose }: {
  title: string; sub: string;
  rows: { id: string; name: string; extra?: string }[];
  value: string; onApply: (id: string) => void; onClose: () => void;
}) {
  const [q, setQ] = React.useState('');
  const [sel, setSel] = React.useState(value || '');
  const kw = q.trim().toLowerCase();
  const list = rows.filter((r) => !kw || r.id.toLowerCase().includes(kw) || r.name.toLowerCase().includes(kw));
  return (
    <Dialog
      title={title} sub={sub} width={600} onClose={onClose}
      foot={<>
        <button type="button" className={BTN} onClick={onClose}>취소</button>
        <button type="button" className="h-[38px] rounded-[var(--r-field)] bg-[var(--ac)] px-6 text-[14px] font-semibold text-white disabled:bg-[var(--line2)] disabled:text-[var(--ink4)]" disabled={!sel} onClick={() => onApply(sel)}>적용</button>
      </>}
    >
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="ID 또는 내용 검색" className={cn(INP, 'w-full')} />
      <ul className="mt-3 max-h-[300px] overflow-y-auto rounded-[var(--r-field)] border border-[var(--line)]">
        {list.length === 0 ? <li className="p-6 text-center text-[14px] text-[var(--ink3)]">조회 결과가 없어요</li> : list.map((r) => (
          <li key={r.id}>
            <label className={cn('flex cursor-pointer items-center gap-3 border-b border-[var(--line)] p-3 text-[14px] last:border-b-0', sel === r.id && 'bg-[var(--ac2)]')}>
              <input type="radio" checked={sel === r.id} onChange={() => setSel(r.id)} className="h-4 w-4" />
              <span className="w-[80px] shrink-0 font-mono text-[13px] text-[var(--ink3)]">{r.id}</span>
              <b className="min-w-0 flex-1 font-semibold">{r.name}</b>
              {r.extra && <small className="shrink-0 text-[12px] text-[var(--ink3)]">{r.extra}</small>}
            </label>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
