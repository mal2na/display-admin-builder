'use client';

/**
 * 상위 메뉴 선택 — 트리에서 상위를 고르고, 오른쪽에서 「변경 후 경로」와 이동 영향을 바로 본다.
 * 경로 이동(IA 사이드 패널)과 페이지 등록/수정 폼이 같은 컴포넌트를 쓴다.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Tag, Hint, BTN, BTN_PRI } from './ui';
import {
  type Page, byId, children, descendants, crumb, depth, noUrl, moveImpact, MENU_MAX,
} from '@/lib/page-menu/model';

export type PickerSpec = {
  /** 수정 대상 페이지 (등록이면 null) */
  page: Page | null;
  /** 등록 시 보여줄 이름 */
  name?: string;
  current: string | null;
  exclude?: string[];
  onPick: (parentId: string | null) => void;
};

export function PathPicker({ spec, onClose }: { spec: PickerSpec; onClose: () => void }) {
  const me = spec.page;
  const myName = me ? me.name : (spec.name || '새 페이지');
  const ex = spec.exclude ?? [];
  const [pick, setPick] = React.useState<string | null>(spec.current);
  const [q, setQ] = React.useState('');
  const [qApplied, setQApplied] = React.useState('');
  const [exp, setExp] = React.useState<Record<string, boolean>>(() => {
    const o: Record<string, boolean> = {};
    let n: Page | null = spec.current ? byId(spec.current) : null;
    while (n) { o[n.id] = true; n = n.parent ? byId(n.parent) : null; }
    return o;
  });

  const why = (x: Page) => {
    if (ex.indexOf(x.id) !== -1) return me && x.id === me.id ? '현재 페이지' : '현재 페이지의 하위';
    if (!x.use) return '사용안함';
    return '';
  };
  const match = (x: Page) => !qApplied || x.name.indexOf(qApplied) !== -1;
  const visible = (x: Page) => (!qApplied ? true : match(x) || descendants(x.id).some(match));

  const node = (x: Page, d: number): React.ReactNode => {
    if (!visible(x)) return null;
    const w = why(x);
    const kids = children(x.id).filter((c) => !me || c.id !== me.id);
    const open = qApplied ? true : exp[x.id];
    const on = pick === x.id;
    return (
      <React.Fragment key={x.id}>
        <div
          onClick={() => { if (w) return; setPick(x.id); setExp((e) => ({ ...e, [x.id]: true })); }}
          style={{ paddingLeft: 12 + (d - 1) * 18 }}
          className={cn(
            'flex h-9 cursor-pointer items-center gap-1.5 rounded-[6px] pr-2 text-[14px] leading-[20px]',
            on ? 'bg-[var(--ac2)] font-semibold text-[var(--ac)]' : 'hover:bg-[var(--th)]',
            w && 'cursor-not-allowed text-[var(--ink4)] hover:bg-transparent',
          )}
        >
          {kids.length ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setExp((s) => ({ ...s, [x.id]: !s[x.id] })); }}
              className="w-4 shrink-0 text-[11px] text-[var(--ink3)]"
            >{open ? '▾' : '▸'}</button>
          ) : <span className="w-4 shrink-0" />}
          <span className="shrink-0 rounded-[4px] bg-[var(--th)] px-1.5 text-[12px] font-semibold text-[var(--ink3)]">D{d}</span>
          <span className="min-w-0 truncate">{x.name}</span>
          {noUrl(x) && <Tag tone="neutral">그룹</Tag>}
          {w ? <span className="ml-auto shrink-0 text-[13px] text-[var(--ink4)]">{w}</span>
            : on ? <span className="ml-auto shrink-0 text-[13px] font-semibold text-[var(--ac)]">✓ 선택</span> : null}
        </div>
        {(open || on) && kids.map((c) => node(c, d + 1))}
      </React.Fragment>
    );
  };

  const roots = children(null).filter((x) => !me || x.id !== me.id);
  const picked = pick ? byId(pick) : null;
  const same = !!(me && pick === me.parent);
  const nd = picked ? depth(picked) + 1 : 1;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-6" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()}
        className="flex max-h-[86vh] w-[900px] max-w-full flex-col overflow-hidden rounded-[var(--dlg-r)] bg-white shadow-[var(--dlg-shadow)]">
        <h3 className="m-0 px-6 pt-6 text-[20px] font-bold leading-[28px] tracking-[-0.6px] text-[var(--ink)]">상위 메뉴 선택</h3>

        <div className="flex items-center gap-2 px-6 pt-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') setQApplied(q.trim()); }}
            placeholder="메뉴명으로 상위 찾기"
            className="inp h-[38px] flex-1 rounded-[var(--r-field)] border border-[var(--line3)] px-[14px] text-[14px]"
          />
          <button type="button" className={BTN} onClick={() => { setQ(''); setQApplied(''); }}>초기화</button>
          <button type="button" className={BTN_PRI} onClick={() => setQApplied(q.trim())}>찾기</button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[1fr_320px] gap-4 px-6 pt-4">
          <div className="min-h-[320px] overflow-y-auto rounded-[var(--r-field)] border border-[var(--line)] p-2">
            {roots.map((x) => node(x, 1))}
          </div>
          <aside className="overflow-y-auto rounded-[var(--r-field)] bg-[var(--th)] p-4">
            <h4 className="m-0 text-[14px] font-bold text-[var(--ink)]">선택한 상위 메뉴</h4>
            {!picked ? (
              <p className="mt-2 text-[13px] text-[var(--ink3)]">왼쪽에서 상위가 될 메뉴를 선택하세요.</p>
            ) : (
              <>
                <div className="mt-2 rounded-[6px] bg-white px-3 py-2 text-[14px] font-semibold">{crumb(picked)}</div>
                <h4 className="m-0 mt-4 text-[14px] font-bold text-[var(--ink)]">{me ? '변경 후 경로' : '등록될 경로'}</h4>
                <div className="mt-2 rounded-[6px] border border-[var(--ac3)] bg-white px-3 py-2 text-[14px] text-[var(--ac)]">
                  {crumb(picked)} &gt; {myName}
                </div>
                <p className="mt-2 text-[13px] text-[var(--ink3)]">
                  D{nd}{nd > MENU_MAX && <span className="text-[var(--warn)]"> · FO 메뉴 대상 아님(3 Depth 초과)</span>}
                </p>
              </>
            )}
            {me && (
              <>
                <h4 className="m-0 mt-4 text-[14px] font-bold text-[var(--ink)]">현재 경로</h4>
                <div className="mt-2 rounded-[6px] bg-white px-3 py-2 text-[14px]">{crumb(me)}</div>
                <p className="mt-1 text-[13px] text-[var(--ink3)]">D{depth(me)}</p>
                {same ? (
                  <p className="mt-3 text-[13px] text-[var(--ink3)]">현재와 같은 상위입니다. 트리에서 다른 상위를 고르세요.</p>
                ) : picked || pick === null ? (
                  <div className="mt-3 rounded-[6px] bg-white p-3 text-[13px] leading-[18px] text-[var(--ink2)]">
                    {(() => {
                      const im = moveImpact(me, pick);
                      return (
                        <>
                          {im.kin.length ? <>하위 <b>{im.kin.length}개</b>도 함께 옮겨집니다</> : '옮겨지는 하위 없음'}
                          <br />URL · 페이지 ID는 그대로
                          {im.lost.length > 0 && <><br /><span className="text-[var(--warn)]">3 Depth를 넘어 FO 메뉴에서 빠짐 {im.lost.length}건</span></>}
                        </>
                      );
                    })()}
                  </div>
                ) : null}
              </>
            )}
            {!me && picked && (
              <div className="mt-3 rounded-[6px] bg-white p-3 text-[13px] leading-[18px] text-[var(--ink2)]">
                운영 채널 · 로그인 권한 · 회선그룹은 상위 「{picked.name}」 값을 불러옵니다
              </div>
            )}
          </aside>
        </div>

        <div className="px-6 pt-3"><Hint>▸ 를 눌러 펼치고, 상위가 될 메뉴를 선택하세요. 1 Depth로 등록하려면 화면의 경로에서 「1 Depth」를 선택합니다.</Hint></div>

        <div className="flex justify-end gap-2 px-6 pb-6 pt-4">
          <button type="button" className={BTN} onClick={onClose}>취소</button>
          <button type="button" className={BTN_PRI} disabled={!pick || same}
            onClick={() => { spec.onPick(pick); onClose(); }}>선택</button>
        </div>
      </div>
    </div>
  );
}
