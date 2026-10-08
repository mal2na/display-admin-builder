'use client';

/**
 * 전체페이지 관리 › IA 구조 — 페이지 트리.
 *  읽기 모드: 펼치기/접기 · 선택 시 우측 IA 정보 패널
 *  수정 모드: ⋮⋮ 끌어 같은 상위 안에서 순서 변경 · 뎁스 추가 · 저장 시 임시저장
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { FilterPanel, ListHeader } from '@/components/ops-ui';
import { Tag, Hint, BTN, BTN_PRI, BTN_SM, FormActions } from './ui';
import { UseChip, FoChip, TypeChip, CtLink, BlockMark } from './chips';
import { PathPicker, type PickerSpec } from './path-picker';
import { usePm } from './ctx';
import {
  store, byId, children, descendants, tree, depth, crumb, noUrl, posText, sibInfo,
  placeAt, mkPage, ensureCt, moveCheck, movePending, moveAncestorPending, isChanged,
  afterEdit, snap, PTYPE, type Page,
} from '@/lib/page-menu/model';

export type IaState = { q: string; applied: string; chip: string; sel: string | null; exp: Record<string, boolean> };
export const IA0: IaState = { q: '', applied: '', chip: 'all', sel: null, exp: {} };

/** 작성본이 반영본과 달라진 유형 */
function editTag(p: Page): React.ReactNode {
  if (!p.live) return <Tag tone="neutral">신규</Tag>;
  if (movePending(p)) return <Tag tone="warning">이동</Tag>;
  if (p.live.order !== p.order) return <Tag tone="warning">순서</Tag>;
  if (isChanged(p)) return <Tag tone="warning">변경</Tag>;
  return null;
}

export function IaView({ ia, setIa }: { ia: IaState; setIa: (s: IaState) => void }) {
  const pm = usePm();
  const [edit, setEdit] = React.useState(false);
  const [snapOrders, setSnapOrders] = React.useState<Record<string, number> | null>(null);
  const [picker, setPicker] = React.useState<PickerSpec | null>(null);
  const [addUnder, setAddUnder] = React.useState<string | null | undefined>(undefined); // undefined = 닫힘
  const drag = React.useRef<Page | null>(null);

  const set = (p: Partial<IaState>) => setIa({ ...ia, ...p });
  const exp = ia.exp;

  /* 트리 평탄화 — 펼친 노드만 */
  const rows: Page[] = (() => {
    const roots = children(null).filter((r) => ia.chip === 'all' || r.id === ia.chip);
    let out: Page[] = [];
    const walk = (l: Page[]) => l.forEach((p) => { out.push(p); if (exp[p.id]) walk(children(p.id)); });
    walk(roots);
    if (ia.applied) {
      const keep: Record<string, boolean> = {};
      store.pages.filter((p) => p.name.indexOf(ia.applied) !== -1).forEach((p) => {
        let n: Page | null = p;
        while (n) { keep[n.id] = true; n = n.parent ? byId(n.parent) : null; }
      });
      out = out.filter((p) => keep[p.id]);
    }
    return out;
  })();

  const sel = ia.sel ? byId(ia.sel) : null;
  const dirty = snapOrders ? store.pages.filter((p) => !(p.id in snapOrders) || snapOrders[p.id] !== p.order) : [];

  const enterEdit = () => {
    const o: Record<string, number> = {};
    store.pages.forEach((p) => { o[p.id] = p.order; });
    setSnapOrders(o); setEdit(true);
  };
  const cancelEdit = () => {
    if (!snapOrders) { setEdit(false); return; }
    store.pages = store.pages.filter((p) => p.id in snapOrders);
    store.pages.forEach((p) => { p.order = snapOrders[p.id]; });
    if (ia.sel && !byId(ia.sel)) set({ sel: null });
    setSnapOrders(null); setEdit(false); pm.bump();
  };
  const askCancel = () => {
    if (!dirty.length) { cancelEdit(); return; }
    pm.confirmBox('수정을 취소하시겠습니까?', `저장하지 않은 변경 ${dirty.length}건이 사라집니다.`, cancelEdit);
  };

  const expandAll = (v: boolean) => {
    const o: Record<string, boolean> = {};
    tree(null).forEach((p) => { o[p.id] = v; });
    set({ exp: o });
  };

  /* 드래그 — 같은 상위 안에서만 순서 변경 */
  const onDrop = (target: Page, before: boolean) => {
    const d = drag.current; drag.current = null;
    if (!d || d === target) return;
    if (target.parent !== d.parent) { pm.toast('순서는 같은 상위 안에서만 바꿀 수 있습니다. 다른 상위로는 [경로 이동]'); return; }
    if (d.state === 'pending') { pm.toast('승인 대기 중에는 순서를 바꿀 수 없습니다'); return; }
    const sb = children(d.parent).filter((x) => x !== d);
    placeAt(d, sb.indexOf(target) + (before ? 0 : 1));
    set({ sel: d.id });
    pm.toast(`「${d.name}」 순서 변경 · ${posText(d)} (저장 전)`);
    pm.bump();
  };

  return (
    <>
      <FilterPanel
        rows={[[['메뉴명', (
          <input
            key="q"
            value={ia.q}
            onChange={(e) => set({ q: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') set({ applied: ia.q.trim() }); }}
            placeholder="메뉴명을 입력해주세요"
            className="inp h-[38px] w-[260px] max-w-full rounded-[var(--r-field)] border border-[var(--line3)] px-[14px] text-[14px]"
          />
        ), 3]]]}
        onReset={() => setIa({ ...ia, q: '', applied: '', chip: 'all' })}
        onSearch={() => set({ applied: ia.q.trim() })}
      />

      <div className="mt-5 flex flex-wrap gap-2">
        {([['all', '전체'] as [string, string]]).concat(
          children(null).filter((r) => noUrl(r) || children(r.id).length).map((r) => [r.id, r.name] as [string, string]),
        ).map(([v, l]) => (
          <button key={v} type="button" onClick={() => set({ chip: v })}
            className={cn('h-8 rounded-[var(--r-full)] border px-3.5 text-[13px] font-semibold transition',
              ia.chip === v ? 'border-[var(--ac)] bg-[var(--ac2)] text-[var(--ac)]' : 'border-[var(--line2)] bg-white text-[var(--ink2)] hover:bg-[var(--th)]')}>
            {l}
          </button>
        ))}
      </div>

      <ListHeader title="조회결과" count={rows.length} right={
        edit ? (
          <>
            <button type="button" className={BTN_PRI} onClick={() => setAddUnder(null)}>+ 1 Depth 추가</button>
            <button type="button" className={BTN} disabled={!sel || !sel.use}
              title={sel ? `선택한 메뉴 「${sel.name}」 하위에 추가` : '트리에서 메뉴를 선택하세요'}
              onClick={() => sel && setAddUnder(sel.id)}>+ 하위 Depth 추가</button>
            <Hint>⋮⋮ 를 끌어 같은 상위 안에서 순서 변경</Hint>
          </>
        ) : (
          <>
            <Hint>뎁스 추가 · 순서 변경은 [수정]에서 합니다</Hint>
            <button type="button" className={BTN_PRI} onClick={enterEdit}>수정</button>
          </>
        )
      } />

      <div className="flex min-h-0 items-start gap-4">
        <div className="min-w-0 flex-1 overflow-x-auto border-t border-[var(--line2)]">
          <div className="grid min-w-[760px] grid-cols-[1fr_120px_140px_140px] border-b border-[var(--line)] bg-[var(--th)] text-[13px] font-semibold text-[var(--ink2)]">
            <div className="px-3 py-2.5">메뉴명</div>
            <div className="px-3 py-2.5 text-center">사용 여부</div>
            <div className="px-3 py-2.5 text-center">FO 메뉴 노출</div>
            <div className="px-3 py-2.5 text-center">등록일</div>
          </div>
          {rows.map((p) => {
            const d = depth(p);
            const kids = children(p.id).length;
            return (
              <div
                key={p.id}
                draggable={edit}
                onDragStart={() => { drag.current = p; }}
                onDragOver={(e) => { if (drag.current && drag.current.parent === p.parent) e.preventDefault(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  onDrop(p, e.clientY < r.top + r.height / 2);
                }}
                onClick={() => set({ sel: p.id })}
                className={cn('grid min-w-[760px] cursor-pointer grid-cols-[1fr_120px_140px_140px] items-center border-b border-[var(--line)] text-[14px] hover:bg-[var(--th)]',
                  ia.sel === p.id && 'bg-[var(--ac2)]')}
              >
                <div className="flex min-w-0 items-center gap-1.5 py-2.5 pr-3" style={{ paddingLeft: 12 + (d - 1) * 20 }}>
                  {edit && <span title="끌어서 같은 상위 안에서 순서 변경" className="cursor-grab select-none text-[13px] text-[var(--ink4)]">⋮⋮</span>}
                  <span className="shrink-0 rounded-[4px] bg-[var(--th)] px-1.5 text-[12px] font-semibold text-[var(--ink3)]">D{d}</span>
                  <span className="min-w-0 truncate">{p.name}</span>
                  <BlockMark p={p} />
                  {kids > 0 && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); set({ exp: { ...exp, [p.id]: !exp[p.id] } }); }}
                      className="shrink-0 px-1 text-[11px] text-[var(--ink3)]">{exp[p.id] ? '︿' : '﹀'}</button>
                  )}
                  {editTag(p)}
                </div>
                <div className="flex justify-center py-2.5"><UseChip p={p} /></div>
                <div className="flex justify-center py-2.5"><FoChip p={p} /></div>
                <div className="py-2.5 text-center text-[var(--ink2)]">{p.created}</div>
              </div>
            );
          })}
          {rows.length === 0 && <p className="py-16 text-center text-[var(--ink3)]">검색 결과가 없습니다.</p>}
        </div>

        {sel && <SidePanel p={sel} edit={edit} onClose={() => set({ sel: null })} onPicker={setPicker} />}
      </div>

      <FormActions left={
        <>
          <button type="button" className={BTN} onClick={() => expandAll(true)}>전체 펼치기</button>
          <button type="button" className={BTN} onClick={() => expandAll(false)}>전체 접기</button>
        </>
      }>
        {!edit && <button type="button" className={BTN} onClick={() => pm.toast('엑셀 다운로드 (목업)')}>엑셀 다운로드</button>}
        {edit && (
          <>
            <Hint>IA 구조 수정 중 · 저장하지 않은 변경 {dirty.length}건 — 저장하면 해당 페이지가 임시저장 상태가 됩니다</Hint>
            <button type="button" className={BTN} onClick={askCancel}>취소</button>
            <button type="button" className={BTN_PRI} disabled={!dirty.length} onClick={() => {
              const ch = dirty.slice();
              pm.confirmBox('저장하시겠습니까?',
                `변경 ${ch.length}건(신규 ${ch.filter((x) => !(snapOrders && x.id in snapOrders)).length} · 순서 ${ch.filter((x) => snapOrders && x.id in snapOrders).length})이 임시저장됩니다. 승인 요청은 각 페이지에서 합니다.`,
                () => {
                  ch.forEach((x) => afterEdit(x));
                  setSnapOrders(null); setEdit(false);
                  pm.toast(`임시저장 ${ch.length}건 — 각 페이지 상세에서 승인 요청하세요`);
                  pm.bump();
                });
            }}>저장</button>
          </>
        )}
      </FormActions>

      {addUnder !== undefined && (
        <AddDepth
          parentId={addUnder}
          onClose={() => setAddUnder(undefined)}
          onAdded={(p) => { if (addUnder) set({ exp: { ...exp, [addUnder]: true }, sel: p.id }); else set({ sel: p.id }); }}
        />
      )}
      {picker && <PathPicker spec={picker} onClose={() => setPicker(null)} />}
    </>
  );
}

/* ── 우측 IA 정보 패널 ─────────────────────────────────────────── */
function SidePanel({ p, edit, onClose, onPicker }: {
  p: Page; edit: boolean; onClose: () => void; onPicker: (s: PickerSpec) => void;
}) {
  const pm = usePm();
  const n = descendants(p.id).length;
  const mp = movePending(p) ? p : moveAncestorPending(p);
  const si = sibInfo(p);

  const mv = (dir: number) => {
    if (p.state === 'pending') { pm.toast('승인 대기 중에는 순서를 바꿀 수 없습니다'); return; }
    placeAt(p, si.i + dir);
    pm.toast(`「${p.name}」 순서 변경 · ${posText(p)} (저장 전)`);
    pm.bump();
  };

  const KV = ({ k, children: c }: { k: string; children: React.ReactNode }) => (
    <div className="grid grid-cols-[92px_1fr] gap-2 border-b border-[var(--line)] py-2.5 text-[14px]">
      <span className="whitespace-nowrap text-[var(--ink3)]">{k}</span>
      <span className="min-w-0">{c}</span>
    </div>
  );

  return (
    <aside className="w-[320px] shrink-0 rounded-[12px] bg-[var(--th)] p-4">
      <h3 className="m-0 text-[16px] font-bold text-[var(--ink)]">페이지 IA 정보</h3>

      <h4 className="m-0 mt-4 text-[13px] font-bold text-[var(--ink2)]">기본 정보</h4>
      <KV k="페이지 ID">
        <button type="button" onClick={() => pm.goDetail(p.id)} className="font-mono text-[13px] text-[var(--ac)] underline">{p.id}</button>
      </KV>
      <KV k="메뉴경로">
        <span className="block break-words">{crumb(p)}</span>
        <span className="mt-0.5 block text-[13px] text-[var(--ink3)]">{posText(p)}</span>
        <span className="mt-2 flex flex-wrap gap-1.5">
          {!edit && (
            <button type="button" className={BTN_SM} onClick={() => onPicker({
              page: p, current: p.parent,
              exclude: [p.id].concat(descendants(p.id).map((c) => c.id)),
              onPick: (np) => {
                const c = moveCheck(p, np);
                if (!c.ok) { pm.toast(c.msg ?? ''); return; }
                const e = snap(p) as Page; e.parent = np;
                pm.setEditing(e); pm.goEdit(p);
                pm.toast('경로를 바꿨습니다 — 저장 후 승인 요청하세요');
              },
            })}>경로 이동{n ? ` (하위 ${n}개 함께)` : ''}</button>
          )}
          {edit && (
            <>
              <button type="button" className={BTN_SM} disabled={si.i === 0} onClick={() => mv(-1)}>↑ 위로</button>
              <button type="button" className={BTN_SM} disabled={si.i === si.n - 1} onClick={() => mv(1)}>↓ 아래로</button>
            </>
          )}
        </span>
      </KV>
      <KV k="URL"><span className="break-all font-mono text-[13px]">{noUrl(p) ? 'URL 미등록' : p.url}</span></KV>
      <KV k="등록 유형"><TypeChip p={p} /></KV>
      {p.ptype === 'builder' && <KV k="컨테이너 ID"><CtLink p={p} onGo={(ct) => pm.toast(`화면 빌더 › ${ct} 상세로 이동합니다`)} /></KV>}
      {mp && (
        <KV k="반영 상태">
          <Tag tone="warning">승인 대기</Tag>
          <span className="mt-1 block text-[13px] text-[var(--ink3)]">
            {mp === p ? '경로 변경 승인 전' : `상위 「${mp.name}」 경로 변경 승인 전`}
            {' — FO는 「'}{mp.live?.parent ? crumb(byId(mp.live.parent as string)) : '최상위'}{'」 기준'}
          </span>
        </KV>
      )}

      <h4 className="m-0 mt-4 text-[13px] font-bold text-[var(--ink2)]">페이지 운영정보</h4>
      <KV k="사용여부">{p.use ? '사용' : '미사용'}</KV>
      <KV k="FO 메뉴 노출"><FoChip p={p} /></KV>

      <p className="mt-3.5 text-[13px] leading-[18px] text-[var(--ink3)]">
        {edit
          ? '순서 변경(⋮⋮ 끌기 · ↑↓)과 뎁스 추가는 [저장] 시 해당 페이지만 임시저장됩니다. 하위는 함께 따라갑니다.'
          : '경로 이동은 페이지 수정 화면으로 이어집니다. 뎁스 추가 · 순서 변경은 상단 [수정]에서 합니다.'}
      </p>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {!edit && (
          <>
            <button type="button" className={BTN} onClick={() => pm.goDetail(p.id)}>상세 보기</button>
            <button type="button" className={BTN} onClick={() => {
              if (p.state === 'pending') { pm.toast('승인 대기 중에는 수정할 수 없습니다'); return; }
              pm.setEditing(snap(p) as Page); pm.goEdit(p);
            }}>페이지 수정</button>
          </>
        )}
        <button type="button" className={BTN_PRI} onClick={onClose}>닫기</button>
      </div>
    </aside>
  );
}

/* ── 뎁스 추가 ─────────────────────────────────────────────────── */
function AddDepth({ parentId, onClose, onAdded }: {
  parentId: string | null; onClose: () => void; onAdded: (p: Page) => void;
}) {
  const pm = usePm();
  const par = parentId ? byId(parentId) : null;
  const nd = par ? depth(par) + 1 : 1;
  const [pt, setPt] = React.useState('dev');
  const [name, setName] = React.useState('');

  const submit = () => {
    const nm = name.trim();
    if (!nm) { pm.toast('메뉴명을 입력해 주세요'); return; }
    const r = mkPage({ name: nm, parent: parentId });
    if (!r.ok || !r.p) { pm.toast(r.msg ?? ''); return; }
    const p = r.p;
    p.ptype = pt;
    if (par) { p.channels = par.channels.slice(); p.auths = par.auths.slice(); p.lines = par.lines.slice(); }
    ensureCt(p);
    onAdded(p);
    pm.toast(`${p.id}${p.ct ? ` · ${p.ct}` : ''} 추가 (저장 전) · 저장 후 페이지 수정에서 URL 등을 입력하세요`);
    pm.bump();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-6" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()}
        className="w-[640px] max-w-full overflow-hidden rounded-[var(--dlg-r)] bg-white shadow-[var(--dlg-shadow)]">
        <h3 className="m-0 px-6 pt-6 text-[20px] font-bold leading-[28px] tracking-[-0.6px] text-[var(--ink)]">
          {nd === 1 ? '1 Depth 추가' : '하위 Depth 추가'}
        </h3>
        <div className="px-6 pt-4">
          <div className="border-t border-[var(--line2)]">
            <div className="grid grid-cols-[140px_1fr] border-b border-[var(--line)]">
              <div className="flex items-center bg-[var(--th)] px-4 py-3 text-[14px] font-semibold text-[var(--ink2)]">상위 경로</div>
              <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-[14px]">
                {par ? crumb(par) : '없음 (최상위)'}
                <Hint>D{nd}{nd > 3 ? ' · FO 메뉴 대상 아님' : ''}</Hint>
              </div>
            </div>
            <div className="grid grid-cols-[140px_1fr] border-b border-[var(--line)]">
              <div className="flex items-center bg-[var(--th)] px-4 py-3 text-[14px] font-semibold text-[var(--ink2)]">등록 유형</div>
              <div className="flex flex-wrap items-center gap-5 px-4 py-2.5 text-[14px]">
                {Object.keys(PTYPE).map((k) => (
                  <label key={k} className="inline-flex cursor-pointer items-center gap-1.5">
                    <input type="radio" name="ad-pt" checked={pt === k} onChange={() => setPt(k)} className="h-4 w-4" />
                    {PTYPE[k]}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-[140px_1fr] border-b border-[var(--line)]">
              <div className="flex items-center bg-[var(--th)] px-4 py-3 text-[14px] font-semibold text-[var(--ink2)]">메뉴명</div>
              <div className="px-4 py-2.5">
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                  placeholder="메뉴명을 입력하세요"
                  className="inp h-[38px] w-[320px] max-w-full rounded-[var(--r-field)] border border-[var(--line3)] px-[14px] text-[14px]" />
              </div>
            </div>
          </div>
          <div className="mt-3 rounded-[var(--r-field)] bg-[var(--th)] px-3 py-2 text-[13px] leading-[18px] text-[var(--ink3)]">
            추가하면 페이지 ID가 발급되고 트리에 <b>신규</b>로 들어갑니다. URL 등 나머지 항목은 [수정]에서 입력합니다.
            {' '}운영 채널 · 로그인 권한 · 회선그룹은 {par ? `상위 「${par.name}」 값을 불러옵니다.` : '기본값(전체)으로 시작합니다.'}
            {' '}전시 컨테이너는 컨테이너 ID도 함께 발급됩니다.
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6 pt-4">
          <button type="button" className={BTN} onClick={onClose}>취소</button>
          <button type="button" className={BTN_PRI} onClick={submit}>추가</button>
        </div>
      </div>
    </div>
  );
}
