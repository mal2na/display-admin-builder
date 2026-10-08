'use client';

/**
 * 전체페이지 관리 — 루트. 뷰 전환(목록 / IA 구조 / 상세 / 등록 / 수정)과
 * 토스트·모달을 한 곳에서 들고, 가변 스토어를 고친 뒤 bump() 로 다시 그린다.
 * (예전에는 public/page-menu-b.html 을 iframe 으로 띄웠다 — 디자인 토큰이 안 닿아 React 로 이식, 2026-10-08)
 */
import * as React from 'react';
import { PageHeader } from '@/components/page-header';
import { PageTabs } from '@/components/page-tabs';
import { Modal, Toast, type ModalSpec } from './ui';
import { Ctx, type PmCtx, type View } from './ctx';
import { ListView, F0, type ListFilter } from './list-view';
import { IaView, IA0, type IaState } from './ia-view';
import { DetailView } from './detail-view';
import { FormView } from './form-view';
import { P, store, tree, type Page } from '@/lib/page-menu/model';

const TABS = [{ key: 'search', label: '상세검색' }, { key: 'ia', label: 'IA 구조' }];

export function PageMenuAdmin() {
  const [, force] = React.useState(0);
  const bump = React.useCallback(() => force((n) => n + 1), []);

  const [view, setView] = React.useState<View>('list');
  const [current, setCurrent] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<Page | null>(null);
  const [f, setF] = React.useState<ListFilter>(F0);
  const [ia, setIa] = React.useState<IaState>(() => {
    const exp: Record<string, boolean> = {};
    tree(null).forEach((p) => { exp[p.id] = true; });
    return { ...IA0, exp };
  });

  const [toastMsg, setToastMsg] = React.useState<string | null>(null);
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = React.useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3400);
  }, []);
  React.useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const [modalSpec, setModalSpec] = React.useState<ModalSpec | null>(null);

  const ctx: PmCtx = React.useMemo(() => ({
    bump,
    toast,
    modal: (spec) => setModalSpec(spec),
    confirmBox: (title, sub, onOk, opts) => setModalSpec({ title, body: sub ? <p>{sub}</p> : undefined, onOk, ...opts }),
    go: (v) => { setView(v); if (v === 'create') setEditing(P({ id: `PG000${store.seq + 1}`, name: '' })); window.scrollTo(0, 0); },
    goDetail: (id) => { setCurrent(id); setView('detail'); window.scrollTo(0, 0); },
    goEdit: (p) => { setCurrent(p.id); setView('edit'); window.scrollTo(0, 0); },
    current,
    editing,
    setEditing,
  }), [bump, toast, current, editing]);

  const isForm = view === 'create' || view === 'edit';
  const trail = view === 'detail' ? ['전체페이지 관리', '페이지 상세']
    : view === 'create' ? ['전체페이지 관리', '페이지 등록']
      : view === 'edit' ? ['전체페이지 관리', '페이지 수정']
        : ['전체페이지 관리'];
  const title = view === 'detail' ? '페이지 상세'
    : view === 'create' ? '페이지 등록'
      : view === 'edit' ? '페이지 수정' : '전체페이지 관리';

  const isListish = view === 'list' || view === 'ia';

  return (
    <Ctx.Provider value={ctx}>
      <div className="px-12 py-9 pb-28">
        <PageHeader trail={trail} title={title} divider={!isListish && !(view === 'detail')} />

        {isListish && (
          <>
            <PageTabs tabs={TABS} value={view === 'ia' ? 'ia' : 'search'} onChange={(k) => setView(k === 'ia' ? 'ia' : 'list')} />
            <div className="mt-6">
              {view === 'ia' ? <IaView ia={ia} setIa={setIa} /> : <ListView f={f} setF={setF} />}
            </div>
          </>
        )}

        {view === 'detail' && current && <DetailView id={current} />}
        {isForm && <FormView isCreate={view === 'create'} />}
      </div>

      {modalSpec && <Modal spec={modalSpec} onClose={() => setModalSpec(null)} />}
      {toastMsg && <Toast msg={toastMsg} />}
    </Ctx.Provider>
  );
}
