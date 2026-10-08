'use client';

/**
 * 조건 빌더 — 접근·참여·지급 조건이 공유하는 공통 컴포넌트.
 *  판정 항목 마스터(CB_ITEMS)에서 조건을 고르면 행이 추가되고, 입력한 값이 문장 미리보기로 풀린다.
 *  상품·서비스 조건은 묶음이고, 행동 조건은 거기에 붙는다(유형이 맞아야 고를 수 있다).
 *  값·문장·검증 규칙은 전부 src/lib/promotion/cond.ts 에 있다.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { MasterPicker, type PickerMode } from './master-picker';
import {
  CB_ITEMS, CB_CATS, CB_CTX, CB_WHEN, CB_KEY, CIRC, PERS, ROUTES, SERVICES, PROD_TYPES, MO_TITLE,
  isGroup, newRow, newGroup, gType, gIsSvc, gSvc, gFits, gLabel, actOk, hasCard, pickWhy, sentence,
  type CondCtx, type CondNode, type CondRow, type CondGroup, type CondVals, type Picked,
} from '@/lib/promotion/cond';

const BTN_SM = 'h-7 shrink-0 rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-2.5 text-[13px] font-semibold text-[var(--ink2)] transition hover:bg-[var(--th)] disabled:pointer-events-none disabled:text-[var(--ink5)]';
const BTN_PILL = 'h-7 shrink-0 rounded-[var(--r-full)] border border-[var(--line3)] bg-white px-3 text-[13px] font-semibold text-[var(--ink2)] transition hover:bg-[var(--th)]';
const SEL = 'h-[34px] rounded-[var(--r-field)] border border-[var(--line3)] bg-white pl-[12px] pr-7 text-[14px]';
const NUM = 'h-[34px] w-[88px] rounded-[var(--r-field)] border border-[var(--line3)] px-[12px] text-[14px]';
const DATE = 'h-[34px] rounded-[var(--r-field)] border border-[var(--line3)] px-[10px] text-[14px]';

const TAIL: Record<CondCtx, string> = { access: '만 볼 수 있어요', join: '만 참여할 수 있어요', pay: '에게만 지급해요' };

/* ── 작은 조각 ─────────────────────────────────────────────────── */
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-start gap-2 py-1.5">
      <span className="pt-1.5 text-[13px] leading-[20px] text-[var(--ink3)]">{label}</span>
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-[14px]">{children}</div>
    </div>
  );
}
const Hint = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[13px] leading-[18px] text-[var(--ink3)]">{children}</span>
);
const Warn = ({ children }: { children: React.ReactNode }) => (
  <p className="w-full text-[13px] leading-[18px] text-[var(--warn)]">{children}</p>
);
function Ck({ on, onChange, children, disabled }: { on: boolean; onChange: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-[14px]', disabled && 'cursor-not-allowed opacity-45')}>
      <input type="checkbox" checked={on} disabled={disabled} onChange={onChange} className="h-4 w-4" />
      {children}
    </label>
  );
}
function Rd({ on, onChange, children }: { on: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-[14px]">
      <input type="radio" checked={on} onChange={onChange} className="h-4 w-4" />
      {children}
    </label>
  );
}
function Sel({ value, onChange, opts, label }: { value: string; onChange: (v: string) => void; opts: string[]; label: string }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={SEL}>
      {opts.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
}
/** 선택한 항목 칩 목록 */
function Tags({ items, onRemove }: { items: Picked[]; onRemove: (name: string) => void }) {
  if (!items.length) return null;
  return (
    <span className="flex flex-wrap items-center gap-1">
      {items.map((p) => (
        <span key={p.name} className="inline-flex items-center gap-1 rounded-[4px] bg-[var(--ac2)] px-2 py-0.5 text-[13px] text-[var(--ac)]">
          {p.name}
          <button type="button" aria-label={`${p.name} 삭제`} onClick={() => onRemove(p.name)} className="font-bold">×</button>
        </span>
      ))}
    </span>
  );
}
const MoBadge = () => (
  <span title={MO_TITLE} className="rounded-[4px] bg-[var(--th)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--ink3)]">회원 전용</span>
);

/* ── 공통 필드 (인정 기간 · 확인 시점) ─────────────────────────── */
function PeriodField({ v, set, joinRange }: { v: CondVals; set: (p: CondVals) => void; joinRange?: [string, string] }) {
  return (
    <F label="인정 기간">
      <Sel label="인정 기간" value={v.per as string} opts={PERS} onChange={(x) => {
        const p: CondVals = { per: x };
        if (x === '직접 지정' && joinRange) {
          if (!v.ps && joinRange[0]) p.ps = joinRange[0];
          if (!v.pe && joinRange[1]) p.pe = joinRange[1];
        }
        set(p);
      }} />
      {v.per === '최근 기간' && (
        <span className="flex items-center gap-2">
          최근
          <input type="number" min={1} placeholder="N" value={v.rn as string} onChange={(e) => set({ rn: e.target.value })} className={NUM} />
          <Sel label="최근 기간 단위" value={v.ru as string} opts={['일', '개월']} onChange={(x) => set({ ru: x })} />
          내
        </span>
      )}
      {v.per === '직접 지정' && (
        <span className="flex items-center gap-2">
          <input type="date" aria-label="인정 시작일" value={v.ps as string} onChange={(e) => set({ ps: e.target.value })} className={DATE} />
          ~
          <input type="date" aria-label="인정 종료일" value={v.pe as string} onChange={(e) => set({ pe: e.target.value })} className={DATE} />
        </span>
      )}
    </F>
  );
}
function WhenField({ ctx, v, set }: { ctx: CondCtx; v: CondVals; set: (p: CondVals) => void }) {
  return (
    <F label="확인 시점">
      <select aria-label="확인 시점" value={v.when as string} onChange={(e) => set({ when: e.target.value, ...(e.target.value !== '지정일' ? { wdate: '' } : {}) })} className={SEL}>
        <option value="판정 시점">{`판정 시점 (${CB_WHEN[ctx]})`}</option>
        <option>지정일</option>
      </select>
      {v.when === '지정일' && (
        <input type="date" aria-label="기준일" value={v.wdate as string} onChange={(e) => set({ wdate: e.target.value })} className={DATE} />
      )}
    </F>
  );
}

/* ── 조건 빌더 ─────────────────────────────────────────────────── */
export type CondBuilderProps = {
  ctx: CondCtx;
  value: CondNode[];
  onChange: (nodes: CondNode[]) => void;
  /** 필수 조건이면 "조건이 없으면 제한 없음" 문구 대신 1개 이상 요구 */
  required?: boolean;
  /** 노드별 오류 — validate() 결과 */
  errors?: Record<string, string>;
  /** 빌더 전체 오류 */
  error?: string;
  /** 인정 기간 '직접 지정' 기본값으로 쓸 참여 기간 */
  joinRange?: [string, string];
};

export function CondBuilder({ ctx, value, onChange, required, errors = {}, error, joinRange }: CondBuilderProps) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [cat, setCat] = React.useState('');
  const [picker, setPicker] = React.useState<null | {
    mode: PickerMode; types?: string[]; value: Picked[]; apply: (p: Picked[]) => void;
  }>(null);
  const [confirmMsg, setConfirmMsg] = React.useState<null | { msg: string; ok: () => void }>(null);

  const groups = value.filter(isGroup);
  const no = (g: CondGroup) => CIRC[groups.indexOf(g)] ?? `(${groups.indexOf(g) + 1})`;

  /* 노드 갱신 */
  const replace = (id: string, fn: (n: CondNode) => CondNode) =>
    onChange(value.map((n) => {
      if (n.id === id) return fn(n);
      if (isGroup(n) && n.acts.some((a) => a.id === id)) {
        return { ...n, acts: n.acts.map((a) => (a.id === id ? (fn(a) as CondRow) : a)) };
      }
      return n;
    }));
  const setVals = (id: string, patch: CondVals) =>
    replace(id, (n) => ({ ...n, v: { ...n.v, ...patch } } as CondNode));
  /** 묶음의 유형이 바뀌면 거기에 못 붙는 행동 행은 함께 지운다 */
  const setGroup = (id: string, patch: CondVals, dropActIds: string[] = []) =>
    onChange(value.map((n) => (n.id === id && isGroup(n)
      ? { ...n, v: { ...n.v, ...patch }, acts: n.acts.filter((a) => !dropActIds.includes(a.id)) }
      : n)));

  const findGroupOf = (rowId: string): CondGroup | null =>
    groups.find((g) => g.acts.some((a) => a.id === rowId)) ?? null;

  const removeNode = (id: string) => {
    const g = value.find((n) => n.id === id);
    if (g && isGroup(g) && g.acts.length) {
      // 묶음을 지우면 붙어 있던 행동은 대상 없는 상태로 바깥에 남는다
      setConfirmMsg({
        msg: `${gIsSvc(g) ? '서비스' : '상품'} 조건 ${no(g)}을(를) 삭제하면 연결된 행동 조건 ${g.acts.length}개(${g.acts.map((a) => CB_ITEMS[a.key].name).join(', ')})의 대상 상품 조건을 다시 선택해야 해요. 삭제할까요?`,
        ok: () => {
          const freed = g.acts.map((a) => ({ ...a, v: { ...a.v, tgt: '' } }));
          onChange(value.filter((n) => n.id !== id).concat(freed));
        },
      });
      return;
    }
    onChange(value.filter((n) => n.id !== id).map((n) => (isGroup(n) ? { ...n, acts: n.acts.filter((a) => a.id !== id) } : n)));
  };

  /** 조건 추가 */
  const addItem = (k: string) => {
    const item = CB_ITEMS[k];
    setOpen(false); setQ('');
    if (item.cat === '행동') {
      // 붙일 수 있는 마지막 묶음에 붙인다
      const g = groups.filter((x) => gFits(x, k)).pop();
      const row = newRow(k);
      if (!g) { onChange(value.concat(row)); return; }
      onChange(value.map((n) => (n.id === g.id ? { ...n, acts: (n as CondGroup).acts.concat({ ...row, v: { ...row.v, tgt: g.id } }) } : n)));
      return;
    }
    if (item.kind === 'prod' || item.kind === 'svc') {
      // 대상 없는 행동 행 앞에 끼워 넣는다
      const idx = value.findIndex((n) => !isGroup(n) && CB_ITEMS[n.key].cat === '행동');
      const g = newGroup(item.kind as 'prod' | 'svc');
      onChange(idx < 0 ? value.concat(g) : [...value.slice(0, idx), g, ...value.slice(idx)]);
      return;
    }
    // 단독 조건은 묶음·행동 앞에
    const idx = value.findIndex((n) => isGroup(n) || CB_ITEMS[n.key].cat === '행동');
    const r = newRow(k);
    onChange(idx < 0 ? value.concat(r) : [...value.slice(0, idx), r, ...value.slice(idx)]);
  };

  /** 행동 행의 대상 묶음 변경 */
  const moveAct = (row: CondRow, gid: string) => {
    const rest = value
      .filter((n) => n.id !== row.id)
      .map((n) => (isGroup(n) ? { ...n, acts: n.acts.filter((a) => a.id !== row.id) } : n));
    const moved = { ...row, v: { ...row.v, tgt: gid } };
    onChange(gid
      ? rest.map((n) => (n.id === gid ? { ...n, acts: (n as CondGroup).acts.concat(moved) } : n))
      : rest.concat(moved));
  };

  const sent = sentence(value);
  const kw = q.trim();
  const list = Object.entries(CB_ITEMS).filter(([, v]) =>
    (!cat || v.cat === cat) && (!kw || (v.name + v.desc + v.cat).includes(kw)));

  return (
    <div className="w-full rounded-[12px] border border-[var(--line2)] bg-white p-4">
      <div className="flex flex-wrap items-center gap-2 text-[14px]">
        <span className="rounded-[4px] bg-[var(--ac2)] px-1.5 py-0.5 text-[12px] font-bold text-[var(--ac)]">AND</span>
        <span>아래 조건을 <b>모두 충족한 고객</b>{TAIL[ctx]}</span>
        {!required && <Hint>선택 입력 · 조건이 없으면 제한 없음</Hint>}
      </div>

      {/* 조건 목록 */}
      <div className="mt-3 space-y-2">
        {value.map((n) => (isGroup(n) ? (
          <GroupView
            key={n.id} g={n} ctx={ctx} no={no(n)} groups={groups} errors={errors}
            setVals={setVals} setGroup={setGroup} remove={removeNode} moveAct={moveAct}
            openPicker={setPicker} confirm={setConfirmMsg} joinRange={joinRange}
          />
        ) : (
          <RowView
            key={n.id} r={n} ctx={ctx} group={findGroupOf(n.id)} groups={groups} no={no} err={errors[n.id]}
            setVals={setVals} remove={removeNode} moveAct={moveAct} openPicker={setPicker} joinRange={joinRange}
          />
        )))}
        {value.length === 0 && (
          <p className="rounded-[var(--r-field)] bg-[var(--th)] px-3 py-6 text-center text-[14px] text-[var(--ink3)]">추가된 조건이 없어요.</p>
        )}
      </div>

      {/* 조건 추가 */}
      <div className="mt-3">
        <button type="button" className={BTN_SM} onClick={() => setOpen((o) => !o)}>
          <span className="inline-flex items-center gap-1"><Plus className="h-3.5 w-3.5" />조건 추가</span>
        </button>
      </div>

      {open && (
        <div className="mt-3 rounded-[var(--r-field)] border border-[var(--line2)] bg-[var(--th)] p-3">
          <input
            autoFocus type="search" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="조건 검색 (예: 등급, 연령, 개통)" aria-label="조건 검색"
            className="inp h-[34px] w-full rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-[12px] text-[14px]"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[['', '전체'] as [string, string]].concat(CB_CATS.map((c) => [c, c] as [string, string])).map(([v, l]) => (
              <button
                key={v || 'all'} type="button" aria-pressed={cat === v} onClick={() => setCat(v)}
                className={cn('h-7 rounded-[var(--r-full)] border px-3 text-[13px] font-semibold',
                  cat === v ? 'border-[var(--ac)] bg-[var(--ac2)] text-[var(--ac)]' : 'border-[var(--line2)] bg-white text-[var(--ink2)] hover:bg-white/70')}
              >{l}</button>
            ))}
          </div>
          <p className="mt-2 text-[13px] text-[var(--ink3)]">
            접근·참여·지급 조건은 같은 판정 항목을 사용해요. 지금은 <b>{CB_CTX[ctx]} 조건</b>을 설정하고 있어요.
          </p>
          <div className="mt-2 grid max-h-[320px] gap-1.5 overflow-y-auto md:grid-cols-2">
            {list.length === 0 ? (
              <p className="col-span-full py-6 text-center text-[14px] text-[var(--ink3)]">검색 결과가 없어요. 등록된 판정 항목만 선택할 수 있어요.</p>
            ) : list.map(([k, v]) => {
              const why = pickWhy(value, k);
              const usable = v.use.includes(CB_KEY[ctx]);
              const off = !!why || !usable;
              return (
                <button
                  key={k} type="button" disabled={off} onClick={() => addItem(k)}
                  className={cn('rounded-[8px] border bg-white p-3 text-left transition',
                    off ? 'cursor-not-allowed border-[var(--line)] opacity-55' : 'border-[var(--line2)] hover:border-[var(--ac)] hover:bg-[var(--ac2)]')}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="rounded-[4px] bg-[var(--th)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--ink3)]">{v.cat}</span>
                    {v.memberOnly && <MoBadge />}
                  </span>
                  <b className="mt-1.5 block text-[14px] font-semibold">{v.name}</b>
                  <small className="mt-0.5 block text-[13px] leading-[18px] text-[var(--ink3)]">{v.desc}</small>
                  {why && <small className="mt-1 block text-[12px] text-[var(--warn)]">{why}</small>}
                  {!why && !usable && <small className="mt-1 block text-[12px] text-[var(--warn)]">{CB_CTX[ctx]} 조건에는 쓸 수 없어요</small>}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex justify-end">
            <button type="button" className={BTN_SM} onClick={() => setOpen(false)}>닫기</button>
          </div>
        </div>
      )}

      {/* 문장 미리보기 */}
      <div className="mt-3 rounded-[var(--r-field)] bg-[var(--th)] px-3 py-2.5">
        <span className="text-[12px] font-semibold text-[var(--ink3)]">미리보기</span>
        <p className={cn('mt-1 text-[14px] leading-[20px]', sent ? 'text-[var(--ink)]' : 'text-[var(--ink4)]')}>
          {sent ?? '조건을 추가하면 문장으로 보여줘요'}
        </p>
      </div>

      {error && <p className="mt-2 text-[13px] text-[var(--bad)]">{error}</p>}

      {picker && (
        <MasterPicker
          mode={picker.mode} types={picker.types} value={picker.value}
          onApply={(p) => { picker.apply(p); setPicker(null); }}
          onClose={() => setPicker(null)}
        />
      )}
      {confirmMsg && (
        <ConfirmBox
          msg={confirmMsg.msg}
          onOk={() => { confirmMsg.ok(); setConfirmMsg(null); }}
          onClose={() => setConfirmMsg(null)}
        />
      )}
    </div>
  );
}

function ConfirmBox({ msg, onOk, onClose }: { msg: string; onOk: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/35 p-6" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()} className="w-[480px] max-w-full rounded-[var(--dlg-r)] bg-white p-6 shadow-[var(--dlg-shadow)]">
        <p className="whitespace-pre-line text-[14px] leading-[20px] text-[var(--ink)]">{msg}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-[38px] rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-5 text-[14px] font-semibold text-[var(--ink3)] hover:bg-[var(--th)]">취소</button>
          <button type="button" onClick={onOk} className="h-[38px] rounded-[var(--r-field)] bg-[var(--ac)] px-6 text-[14px] font-semibold text-white hover:bg-[var(--ac-h)]">확인</button>
        </div>
      </div>
    </div>
  );
}

/* ── 묶음(상품·서비스 조건) ────────────────────────────────────── */
type PickerOpen = (p: { mode: PickerMode; types?: string[]; value: Picked[]; apply: (x: Picked[]) => void }) => void;

function GroupView({ g, ctx, no, groups, errors, setVals, setGroup, remove, moveAct, openPicker, confirm, joinRange }: {
  g: CondGroup; ctx: CondCtx; no: string; groups: CondGroup[]; errors: Record<string, string>;
  setVals: (id: string, p: CondVals) => void;
  setGroup: (id: string, p: CondVals, dropActIds?: string[]) => void;
  remove: (id: string) => void;
  moveAct: (r: CondRow, gid: string) => void; openPicker: PickerOpen;
  confirm: (c: { msg: string; ok: () => void }) => void;
  joinRange?: [string, string];
}) {
  const svc = gIsSvc(g);
  const prods = (g.v.prods as Picked[]) || [];

  const applyProds = (picked: Picked[]) => {
    const nt = picked[0].type;
    const bad = g.acts.filter((a) => !(CB_ITEMS[a.key].types || []).includes(nt));
    const doIt = () => setGroup(g.id, { prods: picked, pt: nt }, bad.map((a) => a.id));
    if (bad.length) {
      confirm({
        msg: `상품 유형이 ${gType(g) || '미선택'}에서 ${nt}(으)로 바뀌어요.\n${nt}에 쓸 수 없는 행동 조건 ${bad.length}개(${bad.map((a) => CB_ITEMS[a.key].name).join(', ')})가 삭제돼요. 계속할까요?`,
        ok: doIt,
      });
      return;
    }
    doIt();
  };

  const applySvc = (nextSvc: string) => {
    const nt = `svc:${nextSvc}`;
    const bad = g.acts.filter((a) => !actOk(a.key, nt));
    const doIt = () => setGroup(g.id, { svc: nextSvc }, bad.map((a) => a.id));
    if (bad.length) {
      confirm({
        msg: `서비스가 ${gSvc(g) || '미선택'}에서 ${nextSvc}(으)로 바뀌어요.\n${nextSvc}에서 쓸 수 없는 행동 조건 ${bad.length}개(${bad.map((a) => CB_ITEMS[a.key].name).join(', ')})가 삭제돼요. 계속할까요?`,
        ok: doIt,
      });
      return;
    }
    doIt();
  };

  return (
    <div className="rounded-[10px] border border-[var(--line2)]">
      <div className="border-b border-[var(--line)] p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-bold text-[var(--ac)]">{no}</span>
          <span className="rounded-[4px] bg-[var(--th)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--ink3)]">{svc ? '서비스' : '상품'}</span>
          <b className="text-[14px]">{svc ? '서비스 조건' : '상품 조건'}</b>
          <MoBadge />
          <button type="button" className={cn(BTN_SM, 'ml-auto')} onClick={() => remove(g.id)}>삭제</button>
        </div>

        <div className="mt-1">
          {svc ? (
            <F label="대상 서비스">
              <select aria-label="대상 서비스" value={gSvc(g)} onChange={(e) => applySvc(e.target.value)} className={SEL}>
                <option value="" disabled>서비스 선택</option>
                {Object.keys(SERVICES).map((x) => <option key={x}>{x}</option>)}
              </select>
              <Hint>예시값 · 현업 확인 필요 · 한 조건에 서비스 1개</Hint>
            </F>
          ) : (
            <F label="대상 상품">
              <Tags items={prods} onRemove={(name) => {
                const next = prods.filter((p) => p.name !== name);
                setGroup(g.id, { prods: next, pt: next.length ? next[0].type : '' });
              }} />
              <button type="button" className={BTN_PILL} onClick={() => openPicker({ mode: 'prod', types: PROD_TYPES, value: prods, apply: applyProds })}>
                상품 조회
              </button>
              <Hint>한 조건에는 같은 유형의 상품만 담을 수 있어요</Hint>
            </F>
          )}
          <F label="기준">
            <Sel label="기준" value={g.v.inc as string} opts={['포함', '제외']} onChange={(x) => setVals(g.id, { inc: x })} />
            <Hint>{svc ? '이 서비스에서' : '이 상품에'} 아래 행동을 모두 한 고객을 {g.v.inc === '포함' ? '포함' : '제외'}해요</Hint>
          </F>
        </div>
        {errors[g.id] && <p className="mt-1 text-[13px] text-[var(--bad)]">{errors[g.id]}</p>}
      </div>

      <div className="space-y-2 p-3">
        {g.acts.map((a) => (
          <RowView
            key={a.id} r={a} ctx={ctx} group={g} groups={groups} no={() => no} err={errors[a.id]}
            setVals={setVals} remove={remove} moveAct={moveAct} openPicker={openPicker} joinRange={joinRange} nested
          />
        ))}
        {g.acts.filter((a) => a.key !== 'own').length >= 2 && (
          <Hint>같은 {svc ? '서비스' : '상품'} 기준으로, 위에서 아래 순서대로 판정해요 (보유/이용은 순서와 무관)</Hint>
        )}
        {g.acts.length === 0 && <Hint>[조건 추가] → 행동에서 이 {svc ? '서비스' : '상품'}에 붙일 행동 조건을 고르세요.</Hint>}
      </div>
    </div>
  );
}

/* ── 조건 행 ───────────────────────────────────────────────────── */
function RowView({ r, ctx, group, groups, no, err, setVals, remove, moveAct, openPicker, joinRange, nested }: {
  r: CondRow; ctx: CondCtx; group: CondGroup | null; groups: CondGroup[];
  no: (g: CondGroup) => string; err?: string;
  setVals: (id: string, p: CondVals) => void; remove: (id: string) => void;
  moveAct: (r: CondRow, gid: string) => void; openPicker: PickerOpen;
  joinRange?: [string, string]; nested?: boolean;
}) {
  const item = CB_ITEMS[r.key];
  const v = r.v;
  const set = (p: CondVals) => setVals(r.id, p);
  const isAct = item.kind === 'act' || item.kind === 'own' || item.kind === 'sact';
  const svcGroup = !!group && gIsSvc(group);
  const t = group ? gType(group) : '';

  const toggle = (key: string, x: string) => {
    const cur = (v[key] as string[]) || [];
    set({ [key]: cur.includes(x) ? cur.filter((y) => y !== x) : cur.concat(x) });
  };

  return (
    <div className={cn('rounded-[8px] border p-3', nested ? 'border-[var(--line)] bg-[var(--th)]' : 'border-[var(--line2)]')}>
      <div className="flex flex-wrap items-center gap-2">
        {isAct && <span className="text-[14px] font-bold text-[var(--ink4)]">+</span>}
        <span className="rounded-[4px] bg-white px-1.5 py-0.5 text-[11px] font-semibold text-[var(--ink3)]">{item.cat}</span>
        <b className="text-[14px]">{item.name}</b>
        {item.memberOnly && !isAct && <MoBadge />}
        <button type="button" className={cn(BTN_SM, 'ml-auto')} onClick={() => remove(r.id)}>삭제</button>
      </div>

      <div className="mt-1">
        {/* 행동 조건 — 어느 묶음에 붙을지 */}
        {isAct && (
          <F label="대상">
            <select
              aria-label="대상 조건" value={(v.tgt as string) || ''} className={SEL}
              onChange={(e) => moveAct(r, e.target.value)}
            >
              <option value="">상품·서비스 조건 선택</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id} disabled={!(g === group || gFits(g, r.key, r))}>
                  {gLabel(g, no(g))}
                </option>
              ))}
            </select>
            <Hint>{[...(item.types || []), ...(item.svc ? ['서비스'] : [])].join(' · ')}</Hint>
          </F>
        )}

        {/* ── 고객 ── */}
        {item.kind === 'age' && (
          <>
            <F label="기준"><Sel label="연령 기준" value={v.op as string} opts={['이상', '이하', '범위', '같음']} onChange={(x) => set({ op: x, ...(x !== '범위' ? { a2: '' } : {}) })} /></F>
            <F label="나이">
              만 <input type="number" min={0} max={99} placeholder="나이" value={v.a1 as string} onChange={(e) => set({ a1: e.target.value })} className={NUM} /> 세
              {v.op === '범위' && (
                <>~ 만 <input type="number" min={0} max={99} placeholder="나이" value={v.a2 as string} onChange={(e) => set({ a2: e.target.value })} className={NUM} /> 세</>
              )}
            </F>
            {v.op === '같음' && <Warn>선택한 나이의 고객<b>만</b> 대상이에요. 전 연령 이벤트라면 &quot;이상&quot;을 선택하세요.</Warn>}
            <Hint>만 나이 기준이에요. 연 나이가 필요하면 확인 시점을 지정일(해당 연도 12월 31일)로 설정하세요.</Hint>
          </>
        )}
        {item.kind === 'ctype' && (
          <F label="대상">
            {['개인(내국인)', '법인', '외국인'].map((x) => <Ck key={x} on={((v.ct as string[]) || []).includes(x)} onChange={() => toggle('ct', x)}>{x}</Ck>)}
            <Hint>여러 개 선택 가능</Hint>
          </F>
        )}
        {item.kind === 'grade' && (
          <F label="대상 등급">
            <Ck on={!!v.gall} onChange={() => set({ gall: !v.gall, v: !v.gall ? ['VIP', 'GOLD', 'SILVER', 'LIGHT'] : [] })}>전체</Ck>
            {['VIP', 'GOLD', 'SILVER', 'LIGHT'].map((x) => {
              const cur = (v.v as string[]) || [];
              return (
                <Ck key={x} on={cur.includes(x)} onChange={() => {
                  const next = cur.includes(x) ? cur.filter((y) => y !== x) : cur.concat(x);
                  set({ v: next, gall: next.length === 4 });
                }}>{x}</Ck>
              );
            })}
          </F>
        )}
        {item.kind === 'btype' && (
          <F label="혜택 유형">
            {['할인형', '적립형'].map((x) => <Ck key={x} on={((v.v as string[]) || []).includes(x)} onChange={() => toggle('v', x)}>{x}</Ck>)}
            <Hint>여러 개 선택 가능</Hint>
          </F>
        )}
        {item.kind === 'lineOwn' && <F label="기준"><Sel label="회선 보유" value={v.sel as string} opts={['보유', '미보유']} onChange={(x) => set({ sel: x })} /></F>}
        {item.kind === 'lineState' && (
          <F label="상태">
            {['정상', '정지', '해지'].map((x) => <Ck key={x} on={((v.v as string[]) || []).includes(x)} onChange={() => toggle('v', x)}>{x}</Ck>)}
            <Hint>여러 개 선택 가능</Hint>
          </F>
        )}
        {item.kind === 'lineChg' && (
          <>
            <F label="변경 유형">
              {['번호 변경', '명의 변경'].map((x) => <Ck key={x} on={((v.lc as string[]) || []).includes(x)} onChange={() => toggle('lc', x)}>{x}</Ck>)}
            </F>
            <F label="기준"><Sel label="기준" value={v.lcinc as string} opts={['제외', '포함']} onChange={(x) => set({ lcinc: x })} /></F>
            <PeriodField v={v} set={set} joinRange={joinRange} />
            <Hint>인정 기간 안에 번호·명의를 변경한 회선인지 판정해요. 혜택 수령 후 명의 이전 같은 부정 참여 방지에 써요.</Hint>
          </>
        )}

        {/* ── 업무 결과 ── */}
        {item.kind === 'deliv' && (
          <F label="배송 결과">
            <Sel label="배송 결과" value={v.sel as string} opts={['보장일 내 도착', '보장일 이후 도착', '배송 지연']} onChange={(x) => set({ sel: x })} />
            <Hint>배송 관리 시스템 연동 (현업 확인 필요)</Hint>
          </F>
        )}
        {item.kind === 'consult' && (
          <>
            <F label="상담 상태">
              <Sel label="상담 상태" value={v.sel as string} opts={['상담 신청 완료', '상담 완료', '미진행']} onChange={(x) => set({ sel: x })} />
              <Hint>상담 관리 시스템 연동 (현업 확인 필요)</Hint>
            </F>
            <F label="기준"><Sel label="기준" value={v.inc as string} opts={['포함', '제외']} onChange={(x) => set({ inc: x })} /></F>
          </>
        )}

        {/* ── 참여 이력 ── */}
        {item.kind === 'share' && (
          <>
            <F label="대상 이벤트">
              <Sel label="대상 이벤트" value={v.shev as string} opts={['이 이벤트', '지정 이벤트']} onChange={(x) => set({ shev: x })} />
              {v.shev === '지정 이벤트' && (
                <>
                  <Tags items={(v.evs as Picked[]) || []} onRemove={(n) => set({ evs: ((v.evs as Picked[]) || []).filter((p) => p.name !== n) })} />
                  <button type="button" className={BTN_PILL} onClick={() => openPicker({ mode: 'event', value: (v.evs as Picked[]) || [], apply: (p) => set({ evs: p }) })}>이벤트 조회</button>
                </>
              )}
            </F>
            <F label="공유 횟수">
              <input type="number" min={1} value={v.n as string} onChange={(e) => set({ n: e.target.value })} className={NUM} /> 회 이상
            </F>
            <Hint>카카오톡 공유 전송 완료 건만 인정해요 (개발 확인 필요). 공유를 참여 자체로 인정하려면 참여 행동 &apos;공유 참여&apos;를 쓰세요.</Hint>
          </>
        )}
        {item.kind === 'evhist' && (
          <>
            <F label="대상 이벤트">
              <Tags items={(v.evs as Picked[]) || []} onRemove={(n) => set({ evs: ((v.evs as Picked[]) || []).filter((p) => p.name !== n) })} />
              <button type="button" className={BTN_PILL} onClick={() => openPicker({ mode: 'event', value: (v.evs as Picked[]) || [], apply: (p) => set({ evs: p }) })}>이벤트 조회</button>
            </F>
            <F label="판정 대상"><Sel label="판정 대상" value={v.evk as string} opts={['참여', '당첨·수혜']} onChange={(x) => set({ evk: x })} /></F>
            <F label="기준"><Sel label="기준" value={v.evinc as string} opts={['제외', '포함']} onChange={(x) => set({ evinc: x })} /></F>
            <PeriodField v={v} set={set} joinRange={joinRange} />
            <Hint>지정한 이벤트 중 하나라도 참여(또는 당첨·수혜)했는지로 판정해요. 이 이벤트 자신의 재참여 제한은 참여 횟수 설정을 쓰세요.</Hint>
          </>
        )}

        {/* ── 행동 ── */}
        {item.kind === 'sact' && (
          <>
            {item.sk === 'link' && <F label="연결 대상"><Sel label="연결 대상" value={v.link as string} opts={['T 멤버십', 'T 아이디']} onChange={(x) => set({ link: x })} /></F>}
            {(item.sk === 'setting' || item.sk === 'use') && (
              <F label="기능">
                <select aria-label="기능" value={v.feat as string} onChange={(e) => set({ feat: e.target.value })} className={SEL}>
                  <option value="">기능 선택</option>
                  {((SERVICES[gSvc(group ?? ({} as CondGroup))]?.features || {})[item.sk] || []).map((x) => <option key={x}>{x}</option>)}
                </select>
                <Hint>예시값 · 현업 확인 필요</Hint>
              </F>
            )}
            {item.sk === 'setting' && <F label="방식"><Sel label="설정 방식" value={v.sm as string} opts={['설정한 적 있음', '현재 설정 중']} onChange={(x) => set({ sm: x })} /></F>}
            {item.sk === 'attend' && (
              <>
                <F label="방식">
                  <Sel label="출석 방식" value={v.am as string} opts={['누적', '연속']} onChange={(x) => set({ am: x })} />
                  <Hint>연속 출석은 현업 확인 후 유지 여부 결정</Hint>
                </F>
                <F label="횟수">
                  <input type="number" min={1} placeholder="N" value={v.ac as string} onChange={(e) => set({ ac: e.target.value })} className={NUM} />
                  <span>{v.am === '연속' ? '일 연속' : '회 이상'}</span>
                </F>
                <Hint>출석은 하루 1회만 인정해요. 누적은 기간 안 합계, 연속은 연속 출석 일수예요.</Hint>
              </>
            )}
          </>
        )}

        {(item.kind === 'act' || item.kind === 'sact') && (
          <>
            {item.joinType && !(item.joinType === 'plan' && t !== '요금제') && (
              <F label="가입 유형">
                {['신규', '번호이동', '기기변경'].map((x) => <Ck key={x} on={((v.jt as string[]) || []).includes(x)} onChange={() => toggle('jt', x)}>{x}</Ck>)}
              </F>
            )}
            {item.route && !svcGroup && (
              <>
                <F label="가입·구매 채널">
                  <Ck on={!!v.rall} onChange={() => set({ rall: !v.rall, rt: !v.rall ? ROUTES.slice() : [] })}>전체</Ck>
                  {ROUTES.map((x) => {
                    const cur = (v.rt as string[]) || [];
                    return (
                      <Ck key={x} on={cur.includes(x)} onChange={() => {
                        const next = cur.includes(x) ? cur.filter((y) => y !== x) : cur.concat(x);
                        set({ rt: next, rall: next.length === ROUTES.length });
                      }}>{x}</Ck>
                    );
                  })}
                  <Hint>BSS 공통 채널 구분 연동 (예시값) · 대리점은 판매점 포함 · 신규 채널은 BSS에 추가</Hint>
                </F>
                {ctx !== 'access' && (
                  <>
                    <F label="이벤트 경유">
                      {['무관', '이 이벤트 경유', '다른 이벤트 경유'].map((x) => <Rd key={x} on={v.via === x} onChange={() => set({ via: x })}>{x}</Rd>)}
                      <Hint>주문·계약에 붙은 이벤트 ID로 판정</Hint>
                    </F>
                    {v.via === '다른 이벤트 경유' && (
                      <F label="다른 이벤트">
                        <Sel label="다른 이벤트 범위" value={v.viam as string} opts={['모든 이벤트', '지정 이벤트']} onChange={(x) => set({ viam: x })} />
                        {v.viam === '지정 이벤트' && (
                          <>
                            <Tags items={(v.viaEvs as Picked[]) || []} onRemove={(n) => set({ viaEvs: ((v.viaEvs as Picked[]) || []).filter((p) => p.name !== n) })} />
                            <button type="button" className={BTN_PILL} onClick={() => openPicker({ mode: 'event', value: (v.viaEvs as Picked[]) || [], apply: (p) => set({ viaEvs: p }) })}>이벤트 조회</button>
                          </>
                        )}
                      </F>
                    )}
                  </>
                )}
              </>
            )}
            {item.pay && (
              <>
                <F label="결제 수단">
                  <Sel label="결제 수단" value={v.pay as string} opts={['전체', '지정']} onChange={(x) => set({ pay: x })} />
                  <Hint>결제 수단 마스터에서 불러와요 (예시값)</Hint>
                </F>
                {v.pay === '지정' && (
                  <>
                    <F label="선택">
                      <Tags items={(v.pays as Picked[]) || []} onRemove={(n) => set({ pays: ((v.pays as Picked[]) || []).filter((p) => p.name !== n) })} />
                      <button type="button" className={BTN_PILL} onClick={() => openPicker({ mode: 'pay', value: (v.pays as Picked[]) || [], apply: (p) => set({ pays: p }) })}>결제 수단 조회</button>
                    </F>
                    {hasCard(v) && (
                      <>
                        <F label="결제 방식">
                          {['일시불', '할부'].map((x) => <Ck key={x} on={((v.pm as string[]) || []).includes(x)} onChange={() => toggle('pm', x)}>{x}</Ck>)}
                          {((v.pm as string[]) || []).includes('할부') && (
                            <span className="flex items-center gap-2">
                              <input type="number" min={2} max={36} value={v.i1 as string} onChange={(e) => set({ i1: e.target.value })} className={NUM} />
                              ~
                              <input type="number" min={2} max={36} value={v.i2 as string} onChange={(e) => set({ i2: e.target.value })} className={NUM} />
                              개월
                            </span>
                          )}
                        </F>
                        <F label="간편결제"><Ck on={!!v.easy} onChange={() => set({ easy: !v.easy })}>간편결제 결제 건 제외</Ck></F>
                        <Hint>결제 방식·간편결제는 카드 결제에만 적용돼요.</Hint>
                      </>
                    )}
                  </>
                )}
              </>
            )}
            <PeriodField v={v} set={set} joinRange={joinRange} />
            <WhenField ctx={ctx} v={v} set={set} />
            <Hint>
              {item.kind === 'sact' ? '서비스 행동 기록으로 판정해요.' : '취소·철회 없이 정상 완료된 건만 판정해요 (세부 기준 현업 확인).'}
              {' '}전체 이력은 시스템 보관 기간 내 이력이고, 직접 지정은 참여 기간으로 먼저 채워져요.
            </Hint>
          </>
        )}

        {item.kind === 'own' && (
          <>
            <F label="방식"><Sel label="보유/이용 방식" value={v.km as string} opts={['현재 보유·이용 중', '기간 이상 보유·이용']} onChange={(x) => set({ km: x, ...(x === '현재 보유·이용 중' ? { num: '' } : {}) })} /></F>
            {v.km === '기간 이상 보유·이용' && (
              <F label="기간">
                <input type="number" min={1} placeholder="N" value={v.num as string} onChange={(e) => set({ num: e.target.value })} className={NUM} />
                <Sel label="기간 단위" value={v.unit as string} opts={['일', '개월']} onChange={(x) => set({ unit: x })} /> 이상
              </F>
            )}
            <WhenField ctx={ctx} v={v} set={set} />
            <Hint>단말은 개통 철회·기기변경 없이 보유 중인지, 요금제·부가·구독은 가입 상태로 이용 중인지 판정해요. 기간은 확인 시점까지 연속으로 보유·이용한 기간이에요.</Hint>
          </>
        )}

        {/* 단독 조건의 확인 시점 */}
        {!isAct && item.kind !== 'evhist' && <WhenField ctx={ctx} v={v} set={set} />}
      </div>

      {err && <p className="mt-1 text-[13px] text-[var(--bad)]">{err}</p>}
    </div>
  );
}
