'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Check, Megaphone, Gift, UserPlus, Calendar, Flag, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

// 프로모션 등록 마법사 — 프로토타입(프로모션_목록_프로토타입) 문답형/선택형 프로세스 이식.
//  문답형: 질문에 답하면 유형을 추천 / 선택형: 유형을 알면 바로 선택 → [확인] 시 등록 화면으로 이동.

type Kind = '이벤트' | '미션' | '기획전';
type EventType = '안내형' | '참여ㆍ리워드형' | '추천형';
type Result = EventType | '미션' | '기획전';

const CATS: { k: Kind; d: string }[] = [
  { k: '이벤트', d: '안내, 참여ㆍ리워드, 추천 등 고객 대상 이벤트' },
  { k: '미션', d: '출석, 누적, 단계 완료 등 고객이 달성하는 미션' },
  { k: '기획전', d: '여러 상품이나 이벤트를 한 페이지에 묶어 노출' },
];
const TYPES: { k: EventType; d: string }[] = [
  { k: '안내형', d: '고객 참여 없이 신규 서비스·이벤트 소식·상품 모음 등 정보를 안내' },
  { k: '참여ㆍ리워드형', d: '응모, 구매/가입, 초청 등 참여 조건을 충족하면 리워드를 지급' },
  { k: '추천형', d: '친구를 초대(추천)하면 초대자와 피초대자 모두에게 리워드를 지급' },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON: Record<string, any> = {
  이벤트: Calendar, 미션: Flag, 기획전: LayoutGrid,
  안내형: Megaphone, ' 참여ㆍ리워드형': Gift, '참여ㆍ리워드형': Gift, 추천형: UserPlus,
};

type QKey = 'what' | 'join' | 'invite';
const Q: Record<QKey, { t: string; s: string; opts: { v: string; l: string; ic: string; d: string; ex?: string[] }[] }> = {
  what: {
    t: '무엇을 생성하시나요?', s: '생성할 대상에 따라 이어지는 질문이 달라져요.',
    opts: [
      { v: '이벤트', l: '이벤트', ic: '이벤트', d: '고객에게 소식을 알리거나 참여를 받아 리워드를 지급해요' },
      { v: '미션', l: '미션', ic: '미션', d: '고객이 정해진 행동을 달성하면 보상을 받아요' },
      { v: '기획전', l: '기획전', ic: '기획전', d: '여러 이벤트와 혜택을 한 페이지에 묶어 노출해요' },
    ],
  },
  join: {
    t: '고객이 이벤트에 참여하는 과정이 있나요?', s: '응모, 구매·가입, 친구 초대처럼 고객의 참여 이력이 남는지 확인해요.',
    opts: [
      { v: '네', l: '네, 참여 과정이 있어요', ic: '참여ㆍ리워드형', d: '고객이 참여하고, 조건에 따라 리워드를 받아요', ex: ['경품 응모', '구매·가입 인증', '초청 이벤트', '친구 초대'] },
      { v: '아니요', l: '아니요, 정보만 전달해요', ic: '안내형', d: '참여 이력 없이 소식이나 혜택·상품 정보를 보여줘요', ex: ['신규 서비스 오픈 안내', '혜택 소식', '상품 모음 페이지'] },
    ],
  },
  invite: {
    t: '친구를 초대(추천)해야 참여가 이루어지나요?', s: '추천 코드 입력이나 초대 링크로 들어온 고객이 참여하는 구조인지 확인해요.',
    opts: [
      { v: '네', l: '네, 친구 초대로 참여해요', ic: '추천형', d: '초대한 사람과 초대받은 사람이 나뉘고, 각각 리워드 조건이 있어요', ex: ['추천 코드 입력', '초대 링크 공유'] },
      { v: '아니요', l: '아니요, 고객이 직접 참여해요', ic: '참여ㆍ리워드형', d: '고객 본인이 응모하거나 조건을 충족하면 참여돼요', ex: ['응모 버튼 참여', '구매·가입 시 자동 참여'] },
    ],
  },
};

type Answers = Partial<Record<QKey, string>>;
function qaPath(a: Answers): QKey[] {
  const p: QKey[] = ['what'];
  if (a.what === '이벤트') { p.push('join'); if (a.join === '네') p.push('invite'); }
  return p;
}
function qaResult(a: Answers): Result | null {
  if (a.what === '미션' || a.what === '기획전') return a.what;
  if (a.what === '이벤트') {
    if (a.join === '아니요') return '안내형';
    if (a.join === '네' && a.invite) return a.invite === '네' ? '추천형' : '참여ㆍ리워드형';
  }
  return null;
}
function maxDepth(a: Answers): number {
  const p = qaPath(a);
  if (p.every((k) => a[k])) return p.length;
  const k = p.find((x) => !a[x])!;
  return Math.max(...Q[k].opts.map((o) => maxDepth({ ...a, [k]: o.v })));
}
const MAXQ = maxDepth({});

function IconGlyph({ name, className }: { name: string; className?: string }) {
  const C = ICON[name] ?? Megaphone;
  return <C className={className} />;
}

export function RegisterWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<'qa' | 'pick'>('qa');
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState(0);
  const [qaPick, setQaPick] = useState<EventType | null>(null); // 결과 단계에서 고른 이벤트 유형
  const [pickCat, setPickCat] = useState<Kind | null>(null);
  const [pickType, setPickType] = useState<EventType | null>(null);

  const path = qaPath(answers);
  const result = qaResult(answers);
  const complete = !!result;
  const atResult = complete && step >= path.length;

  const currentPick: Result | null = useMemo(() => {
    if (mode === 'pick') return pickCat === '이벤트' ? pickType : pickCat;
    return atResult ? qaPick ?? result : null;
  }, [mode, pickCat, pickType, atResult, qaPick, result]);

  const reset = () => { setMode('qa'); setAnswers({}); setStep(0); setQaPick(null); setPickCat(null); setPickType(null); };
  const close = () => { onClose(); };

  if (!open) return null;

  const answer = (key: QKey, v: string) => {
    setAnswers((prev) => {
      if (prev[key] === v) return prev;
      const next = { ...prev, [key]: v };
      // 앞 질문이 바뀌면 뒤 답 초기화
      (['what', 'join', 'invite'] as QKey[]).slice((['what', 'join', 'invite'] as QKey[]).indexOf(key) + 1).forEach((k) => delete next[k]);
      return next;
    });
    setQaPick(null);
  };

  const goRegister = (r: Result) => {
    const kind: Kind = r === '미션' ? '미션' : r === '기획전' ? '기획전' : '이벤트';
    // 등록 화면(/new)이 지원하는 유형(안내형/응모형)으로 매핑 — 참여 성격은 응모형, 그 외 정보성은 안내형.
    const formType = r === '안내형' || r === '기획전' ? '안내형' : '응모형';
    reset();
    onClose();
    const qs = new URLSearchParams({ kind, type: formType, source: r });
    router.push(`/admin/events/new?${qs.toString()}`);
  };

  const onNext = () => {
    if (mode === 'qa' && !atResult) {
      const nextStep = step + 1;
      setStep(nextStep);
      if (nextStep >= path.length && complete && !qaPick && result && result !== '미션' && result !== '기획전') setQaPick(result as EventType);
      return;
    }
    if (currentPick) goRegister(currentPick);
  };

  // 스테퍼
  const TOTAL = MAXQ + 1;
  const cPathDone = complete;
  const cPath = qaPath(answers);
  const skipped = cPathDone ? MAXQ - cPath.length : 0;
  const curIdx = atResult ? TOTAL - 1 : step;
  const label = atResult ? `단계 ${TOTAL} / ${TOTAL} · 결과 확인` : `단계 ${step + 1} / ${TOTAL} · 질문`;
  const segState = (i: number): 'todo' | 'cur' | 'done' | 'skip' => {
    if (cPathDone && i >= cPath.length && i < TOTAL - 1) return 'skip';
    if (i === curIdx) return 'cur';
    if (i < curIdx) return 'done';
    return 'todo';
  };

  const nextDisabled = mode === 'pick'
    ? !currentPick
    : atResult ? !(qaPick ?? result) : !answers[path[step]];
  const nextLabel = mode === 'qa' && !atResult ? '다음' : '확인';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="flex max-h-[calc(100vh-32px)] w-[min(760px,100%)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-start justify-between border-b px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">프로모션 등록</h3>
            <p className="mt-0.5 text-[13px] text-slate-500">등록할 프로모션을 정해주세요. 선택에 따라 다음 단계의 입력 항목이 달라져요.</p>
          </div>
          <button type="button" onClick={close} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="닫기"><X className="h-5 w-5" /></button>
        </div>

        {/* 모드 탭 */}
        <div className="grid grid-cols-2 gap-2 px-6 pt-4">
          {([['qa', '문답형', '질문에 답하면 유형을 추천해요'], ['pick', '선택형', '유형을 알고 있다면 바로 선택해요']] as const).map(([m, t, s]) => (
            <button key={m} type="button" onClick={() => { setMode(m); }}
              className={cn('flex flex-col items-start rounded-xl border px-4 py-2.5 text-left transition', mode === m ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-400' : 'border-slate-200 hover:bg-slate-50')}>
              <span className={cn('text-[14px] font-bold', mode === m ? 'text-indigo-700' : 'text-slate-700')}>{t}</span>
              <span className="text-[11.5px] text-slate-400">{s}</span>
            </button>
          ))}
        </div>

        {/* 본문 */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {mode === 'pick' ? (
            <div className="space-y-4">
              <p className="text-[13px] font-semibold text-slate-500">무엇을 생성하시나요?</p>
              <div className="grid gap-2">
                {CATS.map((c) => (
                  <button key={c.k} type="button" onClick={() => { setPickCat(c.k); if (c.k !== '이벤트') setPickType(null); }}
                    className={cn('flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition', pickCat === c.k ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-400' : 'border-slate-200 hover:bg-slate-50')}>
                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', pickCat === c.k ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500')}><IconGlyph name={c.k} className="h-5 w-5" /></span>
                    <span className="min-w-0"><b className="text-[14px] text-slate-900">{c.k}</b><span className="block text-[12px] text-slate-400">{c.d}</span></span>
                  </button>
                ))}
              </div>
              {pickCat === '이벤트' && (
                <>
                  <p className="pt-1 text-[13px] font-semibold text-slate-500">이벤트 유형을 선택하세요</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {TYPES.map((t) => (
                      <button key={t.k} type="button" onClick={() => setPickType(t.k)}
                        className={cn('flex flex-col items-start gap-1.5 rounded-xl border px-3.5 py-3 text-left transition', pickType === t.k ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-400' : 'border-slate-200 hover:bg-slate-50')}>
                        <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', pickType === t.k ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500')}><IconGlyph name={t.k} className="h-5 w-5" /></span>
                        <b className="text-[13.5px] text-slate-900">{t.k}</b>
                        <span className="text-[11.5px] leading-snug text-slate-400">{t.d}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* 스테퍼 */}
              <div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-semibold text-slate-700">{label}{skipped ? <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">{skipped}단계 생략</span> : null}</span>
                  <span className="text-slate-400">구조를 만드는 데 필요한 내용을 확인합니다.</span>
                </div>
                <div className="mt-2 flex gap-1.5">
                  {Array.from({ length: TOTAL }, (_, i) => {
                    const st = segState(i);
                    return <span key={i} className={cn('h-1.5 flex-1 rounded-full', st === 'done' || st === 'cur' ? 'bg-indigo-500' : st === 'skip' ? 'border border-dashed border-slate-300 bg-transparent' : 'bg-slate-200')} />;
                  })}
                </div>
              </div>

              {atResult ? (
                result === '미션' || result === '기획전' ? (
                  <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white"><Check className="h-5 w-5" /></span>
                    <div>
                      <b className="text-[14px] text-slate-900">{result} 등록을 시작해요</b>
                      <p className="mt-0.5 text-[12.5px] text-slate-500">[확인]을 누르면 {result} 등록 화면으로 이동해요.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-[13px] text-slate-500">답변 결과 <b className="text-slate-900">이벤트 &gt; {result}</b>을(를) 추천해요. 다른 유형을 선택할 수도 있어요.</p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {TYPES.map((t) => (
                        <button key={t.k} type="button" onClick={() => setQaPick(t.k)}
                          className={cn('relative flex flex-col items-start gap-1.5 rounded-xl border px-3.5 py-3 text-left transition', (qaPick ?? result) === t.k ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-400' : 'border-slate-200 hover:bg-slate-50')}>
                          {result === t.k && <span className="absolute right-2 top-2 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[9px] font-bold text-white">추천</span>}
                          <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', (qaPick ?? result) === t.k ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500')}><IconGlyph name={t.k} className="h-5 w-5" /></span>
                          <b className="text-[13.5px] text-slate-900">{t.k}</b>
                          <span className="text-[11.5px] leading-snug text-slate-400">{t.d}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )
              ) : (
                <div>
                  {(() => {
                    const key = path[step];
                    const def = Q[key];
                    const upto: Answers = {}; path.slice(0, step).forEach((k) => (upto[k] = answers[k]));
                    return (
                      <>
                        <div className="mb-3">
                          <div className="text-[16px] font-bold text-slate-900">{def.t}</div>
                          <p className="mt-0.5 text-[12.5px] text-slate-400">{def.s}</p>
                        </div>
                        <div className={cn('grid gap-2', def.opts.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
                          {def.opts.map((o) => {
                            const r = qaResult({ ...upto, [key]: o.v });
                            return (
                              <button key={o.v} type="button" onClick={() => answer(key, o.v)}
                                className={cn('flex flex-col items-start gap-1.5 rounded-xl border px-3.5 py-3 text-left transition', answers[key] === o.v ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-400' : 'border-slate-200 hover:bg-slate-50')}>
                                <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', answers[key] === o.v ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500')}><IconGlyph name={o.ic} className="h-5 w-5" /></span>
                                <b className="text-[13.5px] text-slate-900">{o.l}</b>
                                <span className="text-[11.5px] leading-snug text-slate-400">{o.d}</span>
                                {o.ex && <span className="flex flex-wrap gap-1">{o.ex.map((x) => <i key={x} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] not-italic text-slate-400">{x}</i>)}</span>}
                                <span className={cn('mt-0.5 text-[11px] font-medium', r ? 'text-indigo-600' : 'text-slate-400')}>{r ? `${r === '미션' || r === '기획전' ? r + ' 등록' : r + ' 추천'}` : '다음 질문으로 이어져요'}</span>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-2 border-t px-6 py-3">
          <button type="button" onClick={close} className="rounded-md border px-3.5 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50">취소</button>
          {mode === 'qa' && step > 0 && !atResult && (
            <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} className="rounded-md border px-3.5 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50">이전</button>
          )}
          {mode === 'qa' && atResult && (
            <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} className="rounded-md border px-3.5 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50">이전</button>
          )}
          <button type="button" onClick={onNext} disabled={nextDisabled}
            className="rounded-md bg-indigo-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-indigo-500 disabled:opacity-40">{nextLabel}</button>
        </div>
      </div>
    </div>
  );
}
