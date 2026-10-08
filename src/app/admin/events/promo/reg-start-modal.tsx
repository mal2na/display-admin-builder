'use client';

/**
 * 프로모션 등록 시작 — 유형 결정 팝업.
 *  탭 2개: [문답] 질문에 답하면 유형을 추천 / [직접 선택] 대상·유형을 바로 고름.
 *  확인을 누르면 (유형, 참여 방식)이 정해지고 등록 폼으로 넘어간다.
 *  유형 변경(change)으로 열면 상단에 「현재 → 변경」 바가 붙는다.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Volume2, Gift, UserPlus, Calendar, Flag, LayoutGrid, Check, X } from 'lucide-react';
import {
  CATS, TYPES, Q, MAX_Q, JM_OPTS, JM_LABEL, qaPath, qaResult, catOf, typeLabel,
  type Answers, type CatKey, type EventType, type JoinMode, type QKey,
} from '@/lib/promotion/reg-start';

const ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  안내형: Volume2, 참여ㆍ리워드형: Gift, 추천형: UserPlus,
  이벤트: Calendar, 미션: Flag, 기획전: LayoutGrid,
};
function Ic({ name, className }: { name: string; className?: string }) {
  const C = ICON[name];
  return C ? <C className={className ?? 'h-5 w-5'} /> : null;
}

const BTN = 'h-[38px] shrink-0 rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-5 text-[14px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]';
const BTN_PRI = 'h-[38px] shrink-0 rounded-[var(--r-field)] bg-[var(--ac)] px-6 text-[14px] font-semibold text-white hover:bg-[var(--ac-h)] disabled:bg-[var(--line2)] disabled:text-[var(--ink4)]';

export type RegPick = { type: CatKey | EventType; jm: JoinMode | null };

export function RegStartModal({ change, curJoinMode, onPick, onClose }: {
  /** 유형 변경으로 열 때 현재 유형 */
  change?: string | null;
  curJoinMode?: JoinMode;
  onPick: (p: RegPick) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = React.useState<'qa' | 'pick'>(() => {
    if (change) return 'pick';
    try { return (localStorage.getItem('regMode') as 'qa' | 'pick') || 'qa'; } catch { return 'qa'; }
  });
  const [jm, setJm] = React.useState<JoinMode | null>(change === '참여ㆍ리워드형' ? (curJoinMode ?? null) : null);
  const [pick, setPick] = React.useState<{ cat: CatKey | null; type: EventType | null }>(() =>
    change ? { cat: catOf(change), type: catOf(change) === '이벤트' ? (change as EventType) : null } : { cat: null, type: null });
  const [ans, setAns] = React.useState<Answers>({});
  const [step, setStep] = React.useState(0);
  const [qaPick, setQaPick] = React.useState<EventType | null>(null);

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const path = qaPath(ans);
  const res = qaResult(ans);
  const atResult = !!res && step >= path.length;

  /** 지금 선택된 결과 */
  const current: CatKey | EventType | null = mode === 'pick'
    ? (pick.cat === '이벤트' ? pick.type : pick.cat)
    : (atResult ? qaPick : null);

  const needJm = current === '참여ㆍ리워드형';
  const canConfirm = !!current && (!needJm || !!jm);

  const confirm = () => {
    if (!current) return;
    try { localStorage.setItem('regMode', mode); } catch { /* 사파리 프라이빗 등 */ }
    onPick({ type: current, jm: needJm ? jm : null });
  };

  /* ── 스테퍼 ── */
  // [다음]으로 넘어온 답만 반영해 생략 칸을 계산한다 (현재 화면에서 고른 답은 다음 화면부터)
  const confirmed: Answers = {};
  path.slice(0, atResult ? path.length : step).forEach((k) => { confirmed[k] = ans[k]; });
  const cPath = qaPath(confirmed);
  const cDone = !!qaResult(confirmed);
  const TOTAL = MAX_Q + 1;
  const skipped = cDone ? MAX_Q - cPath.length : 0;
  const curIdx = atResult ? TOTAL - 1 : step;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-6" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-[860px] max-w-full flex-col overflow-hidden rounded-[var(--dlg-r)] bg-white shadow-[var(--dlg-shadow)]"
      >
        <div className="flex items-start gap-3 px-6 pt-6">
          <div className="min-w-0">
            <h3 className="m-0 text-[20px] font-bold leading-[28px] tracking-[-0.6px] text-[var(--ink)]">
              {change ? '프로모션 유형 변경' : '프로모션 등록'}
            </h3>
            <p className="mt-1 text-[14px] leading-[20px] text-[var(--ink3)]">
              {change ? '변경할 유형을 선택해주세요.' : '등록할 프로모션을 정해주세요. 선택에 따라 다음 단계의 입력 항목이 달라져요.'}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기" className="ml-auto text-[var(--ink3)] hover:text-[var(--ink)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {change && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-[var(--r-field)] bg-[var(--th)] px-4 py-2.5 text-[14px]">
            <span className="text-[var(--ink3)]">현재 유형</span>
            {current && current !== change ? (
              <span className="flex items-center gap-2">
                <span className="text-[var(--ink3)] line-through">{typeLabel(change)}</span>
                <span aria-label="에서" className="text-[var(--ink4)]">→</span>
                <b className="text-[var(--ac)]">{typeLabel(current)}</b>
              </span>
            ) : <b>{typeLabel(change)}</b>}
          </div>
        )}

        {!change && (
          <div className="mx-6 mt-4 flex w-fit gap-1 rounded-[10px] bg-[var(--th)] p-1" role="tablist">
            {([['qa', '문답', '질문에 답하면 유형을 추천해요'], ['pick', '직접 선택', '유형을 알고 있다면 바로 선택하세요']] as const).map(([k, l, d]) => (
              <button
                key={k} type="button" role="tab" aria-selected={mode === k}
                onClick={() => setMode(k)}
                className={cn('rounded-[8px] px-4 py-2 text-left transition',
                  mode === k ? 'bg-white shadow-[0_0_2px_0_#2222221a]' : 'hover:bg-white/60')}
              >
                <b className={cn('block text-[14px] font-semibold', mode === k ? 'text-[var(--ac)]' : 'text-[var(--ink2)]')}>{l}</b>
                <span className="text-[12px] text-[var(--ink3)]">{d}</span>
              </button>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {mode === 'pick' ? (
            <>
              <p className="mb-3 text-[15px] font-semibold text-[var(--ink)]">무엇을 생성하시나요?</p>
              <div className="grid gap-2 md:grid-cols-3">
                {CATS.map((c) => (
                  <button
                    key={c.k} type="button" role="radio" aria-checked={pick.cat === c.k}
                    onClick={() => setPick((p) => (p.cat === c.k ? p : { cat: c.k, type: null }))}
                    className={cn('relative flex items-start gap-3 rounded-[12px] border p-4 text-left transition',
                      pick.cat === c.k ? 'border-[var(--ac)] bg-[var(--ac2)]' : 'border-[var(--line2)] hover:bg-[var(--th)]')}
                  >
                    {change && catOf(change) === c.k && <Badge>현재</Badge>}
                    <Ic name={c.k} className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ac)]" />
                    <span className="min-w-0">
                      <b className="block text-[14px] font-semibold">{c.k}</b>
                      <span className="mt-0.5 block text-[13px] leading-[18px] text-[var(--ink3)]">{c.d}</span>
                    </span>
                  </button>
                ))}
              </div>

              {pick.cat === '이벤트' && (
                <>
                  <p className="mb-3 mt-7 text-[15px] font-semibold text-[var(--ink)]">이벤트 유형을 선택하세요</p>
                  <TypeCards sel={pick.type} rec={null} change={change} onSelect={(t) => setPick((p) => ({ ...p, type: t }))} />
                </>
              )}
              {pick.cat === '이벤트' && pick.type === '참여ㆍ리워드형' && <JmBlock jm={jm} onSelect={setJm} />}
            </>
          ) : (
            <>
              <div className="mb-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13px] text-[var(--ink3)]">
                  <span>
                    <b className="text-[14px] text-[var(--ink)]">
                      {atResult ? `단계 ${TOTAL} / ${TOTAL} · 결과 확인` : `단계 ${step + 1} / ${TOTAL} · 질문`}
                    </b>
                    {skipped > 0 && <span className="ml-2 rounded-[4px] bg-[var(--th)] px-1.5 py-0.5">{skipped}단계 생략</span>}
                  </span>
                  <span>구조를 만드는 데 필요한 내용을 확인합니다.</span>
                </div>
                <div className="mt-2 flex gap-1.5" role="img" aria-label={`단계 ${curIdx + 1} / ${TOTAL}`}>
                  {Array.from({ length: TOTAL }, (_, i) => {
                    const st = cDone && i >= cPath.length && i < TOTAL - 1 ? 'skip' : i === curIdx ? 'cur' : i < curIdx ? 'done' : 'todo';
                    return (
                      <i key={i} title={st === 'skip' ? '선택한 답변에 따라 생략' : i === TOTAL - 1 ? '결과 확인' : `질문 ${i + 1}`}
                        className={cn('h-1.5 flex-1 rounded-full',
                          st === 'cur' ? 'bg-[var(--ac)]' : st === 'done' ? 'bg-[var(--ac3)]'
                            : st === 'skip' ? 'border border-dashed border-[var(--line3)]' : 'bg-[var(--line)]')} />
                    );
                  })}
                </div>
              </div>

              {atResult ? (
                res === '미션' || res === '기획전' ? (
                  <>
                    <div className="flex items-start gap-3 rounded-[12px] bg-[var(--ac2)] p-4">
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ac)]" />
                      <div>
                        <b className="block text-[15px]">{res} 등록을 시작해요</b>
                        <p className="mt-0.5 text-[13px] text-[var(--ink2)]">[확인]을 누르면 {res} 등록 화면으로 이동해요.</p>
                      </div>
                    </div>
                    <p className="mt-3 text-[13px] text-[var(--ink3)]">※ {res} 선택 시 이어지는 질문은 SB 확정 후 추가 예정이에요.</p>
                  </>
                ) : (
                  <>
                    <p className="mb-3 text-[14px] leading-[20px] text-[var(--ink2)]">
                      답변 결과 <b className="text-[var(--ink)]">이벤트 &gt; {res}
                        {res === '참여ㆍ리워드형' && ans.invite && ans.invite !== '추천' ? ` · ${JM_LABEL[ans.invite as JoinMode]}` : ''}
                      </b> 유형을 추천해요. 다른 유형을 선택할 수도 있어요.
                    </p>
                    <TypeCards sel={qaPick} rec={res as EventType} change={change} onSelect={setQaPick} />
                    {qaPick === '참여ㆍ리워드형' && <JmBlock jm={jm} onSelect={setJm} />}
                  </>
                )
              ) : (
                <Question
                  qkey={path[step]}
                  value={ans[path[step]]}
                  upto={Object.fromEntries(path.slice(0, step).map((k) => [k, ans[k]])) as Answers}
                  onPick={(v) => {
                    const key = path[step];
                    if (ans[key] === v) return;
                    const next: Answers = { ...ans, [key]: v };
                    // 앞 질문 답이 바뀌면 뒤 답은 초기화
                    (['what', 'join', 'invite'] as QKey[]).slice((['what', 'join', 'invite'] as QKey[]).indexOf(key) + 1)
                      .forEach((k) => { delete next[k]; });
                    setAns(next); setQaPick(null);
                  }}
                />
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-[var(--line)] px-6 py-4">
          {mode === 'qa' && step > 0 && (
            <button type="button" className={BTN} onClick={() => setStep((s) => s - 1)}>이전</button>
          )}
          <div className="ml-auto flex gap-2">
            <button type="button" className={BTN} onClick={onClose}>취소</button>
            {mode === 'qa' && !atResult ? (
              <button
                type="button" className={BTN_PRI} disabled={!ans[path[step]]}
                onClick={() => {
                  const ns = step + 1;
                  setStep(ns);
                  if (ns >= path.length && res) {
                    setQaPick((p) => p ?? (res === '미션' || res === '기획전' ? null : (res as EventType)));
                    if (ans.invite && ans.invite !== '추천') setJm(ans.invite as JoinMode);
                  }
                }}
              >다음</button>
            ) : (
              <button type="button" className={BTN_PRI} disabled={!canConfirm} onClick={confirm}>확인</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute right-3 top-3 rounded-[4px] bg-[var(--neutralbg)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--ink2)]">
      {children}
    </span>
  );
}

function TypeCards({ sel, rec, change, onSelect }: {
  sel: EventType | null; rec: EventType | null; change?: string | null; onSelect: (t: EventType) => void;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-3" role="radiogroup" aria-label="이벤트 유형">
      {TYPES.map((t) => (
        <button
          key={t.k} type="button" role="radio" aria-checked={sel === t.k}
          onClick={() => onSelect(t.k)}
          className={cn('relative rounded-[12px] border p-4 text-left transition',
            sel === t.k ? 'border-[var(--ac)] bg-[var(--ac2)]' : 'border-[var(--line2)] hover:bg-[var(--th)]')}
        >
          <span className="absolute right-3 top-3 flex gap-1">
            {change === t.k && <span className="rounded-[4px] bg-[var(--neutralbg)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--ink2)]">현재</span>}
            {rec === t.k && <span className="rounded-[4px] bg-[var(--ac3)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--ac)]">추천</span>}
          </span>
          <Ic name={t.k} className="h-5 w-5 text-[var(--ac)]" />
          <b className="mt-2 block text-[14px] font-semibold">{t.k}</b>
          <span className="mt-0.5 block text-[13px] leading-[18px] text-[var(--ink3)]">{t.d}</span>
        </button>
      ))}
    </div>
  );
}

function JmBlock({ jm, onSelect }: { jm: JoinMode | null; onSelect: (m: JoinMode) => void }) {
  return (
    <>
      <p className="mb-3 mt-7 text-[15px] font-semibold text-[var(--ink)]">고객의 참여는 어떻게 이루어지나요?</p>
      <div className="grid gap-2 md:grid-cols-2" role="radiogroup" aria-label="참여 방식">
        {JM_OPTS.map(([v, l, d]) => (
          <button
            key={v} type="button" role="radio" aria-checked={jm === v}
            onClick={() => onSelect(v)}
            className={cn('rounded-[12px] border p-4 text-left transition',
              jm === v ? 'border-[var(--ac)] bg-[var(--ac2)]' : 'border-[var(--line2)] hover:bg-[var(--th)]')}
          >
            <b className="block text-[14px] font-semibold">{l}</b>
            <span className="mt-0.5 block text-[13px] leading-[18px] text-[var(--ink3)]">{d}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function Question({ qkey, value, upto, onPick }: {
  qkey: QKey; value?: string; upto: Answers; onPick: (v: string) => void;
}) {
  const def = Q[qkey];
  const outcome = (v: string) => {
    const r = qaResult({ ...upto, [qkey]: v });
    if (!r) return <span className="mt-2 block text-[12px] text-[var(--ink3)]">다음 질문으로 이어져요</span>;
    if (qkey === 'invite' && v !== '추천') {
      return <span className="mt-2 block text-[12px] font-semibold text-[var(--ac)]">{r} · {JM_LABEL[v as JoinMode]} 추천</span>;
    }
    const isCat = r === '미션' || r === '기획전';
    return <span className="mt-2 block text-[12px] font-semibold text-[var(--ac)]">{r}{isCat ? ' 등록' : ' 추천'}</span>;
  };
  return (
    <>
      <div className="mb-4">
        <div className="text-[18px] font-bold leading-[26px] text-[var(--ink)]">{def.t}</div>
        <p className="mt-1 text-[14px] leading-[20px] text-[var(--ink3)]">{def.s}</p>
      </div>
      <div className={cn('grid gap-2', def.opts.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2')} role="radiogroup" aria-label={def.t}>
        {def.opts.map((o) => (
          <button
            key={o.v} type="button" role="radio" aria-checked={value === o.v}
            onClick={() => onPick(o.v)}
            className={cn('rounded-[12px] border p-4 text-left transition',
              value === o.v ? 'border-[var(--ac)] bg-[var(--ac2)]' : 'border-[var(--line2)] hover:bg-[var(--th)]')}
          >
            <Ic name={o.ic} className="h-5 w-5 text-[var(--ac)]" />
            <b className="mt-2 block text-[14px] font-semibold">{o.l}</b>
            <span className="mt-0.5 block text-[13px] leading-[18px] text-[var(--ink3)]">{o.d}</span>
            {o.ex?.length ? (
              <span className="mt-2 flex flex-wrap gap-1">
                {o.ex.map((x) => <i key={x} className="rounded-[4px] bg-[var(--th)] px-1.5 py-0.5 text-[11px] not-italic text-[var(--ink3)]">{x}</i>)}
              </span>
            ) : null}
            {outcome(o.v)}
          </button>
        ))}
      </div>
    </>
  );
}
