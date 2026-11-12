'use client';

/**
 * 프로모션 관리 — 루트.
 *  목록·등록·상세를 전부 React 로 처리한다(2026-11-12: 프로토타입 iframe 제거).
 *   - [등록] → 유형 결정 팝업(RegStartModal) → RegForm(빈 폼)
 *   - 목록 행 클릭 → RegForm(행으로 구성한 폼, 상세 화면부터)
 *   - RegForm 안에서 상세/수정/FO 미리보기/상세영역 빌더까지 전환된다.
 *  결과 관리는 별도 LNB 메뉴(/admin/events/result)로 분리(2026-10-20).
 */
import * as React from 'react';
import { PageHeader } from '@/components/page-header';
import { PromoList } from './promo-list';
import { RegStartModal } from './reg-start-modal';
import { RegForm } from './reg-form';
import { formFromRow, type PromoForm } from '@/lib/promotion/form';
import { presetFormByKey } from '@/lib/promotion/presets';
import type { PromoRow } from '@/lib/promotion/model';

type FormState = { type: string; jm: '직접' | '행동'; initial?: PromoForm; startView?: 'form' | 'detail' };

export function PromoAdmin() {
  const [regOpen, setRegOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState | null>(null);
  const [toastMsg, setToastMsg] = React.useState<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = React.useCallback((m: string) => {
    setToastMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastMsg(null), 2600);
  }, []);
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  /** 유형이 정해지면 등록 화면(React 폼)으로 — 모든 유형 공통. */
  function openReg(type: string, jm: string | null) {
    setForm({ type, jm: (jm as '직접' | '행동') ?? (type === '참여ㆍ리워드형' ? '행동' : '직접') });
  }

  /** 목록 행 클릭 → 상세 화면부터. 「예시」 행은 전체 프리셋(서브타이틀·유의사항·리워드·추천 구성)으로, 그 외는 행 값으로 구성. */
  function openDetail(r: PromoRow) {
    const initial = presetFormByKey(r.ex) ?? formFromRow(r);
    setForm({ type: initial.type, jm: initial.jm, initial, startView: 'detail' });
  }

  const Toast = toastMsg ? (
    <div className="pointer-events-none fixed bottom-10 left-1/2 z-[90] -translate-x-1/2">
      <div className="rounded-[8px] bg-[var(--toast-bg)] px-4 py-2.5 text-[14px] leading-[20px] text-white shadow-[var(--dlg-shadow)]">
        {toastMsg}
      </div>
    </div>
  ) : null;

  if (form) {
    return (
      <>
        <RegForm
          type={form.type} jm={form.jm}
          initial={form.initial} startView={form.startView}
          onCancel={() => setForm(null)}
          onSaved={() => setForm(null)}
          onToast={toast}
          onChangeType={() => { setForm(null); setRegOpen(true); }}
        />
        {Toast}
        {regOpen && (
          <RegStartModal
            change={form.type}
            curJoinMode={form.jm}
            onClose={() => setRegOpen(false)}
            onPick={({ type, jm }) => { setRegOpen(false); openReg(type, jm); }}
          />
        )}
      </>
    );
  }

  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader trail={['프로모션 관리']} title="프로모션 관리" />
      <div className="mt-6">
        <PromoList
          onToast={toast}
          onRegister={() => setRegOpen(true)}
          onOpenExample={openDetail}
        />
      </div>

      {regOpen && (
        <RegStartModal
          onClose={() => setRegOpen(false)}
          onPick={({ type, jm }) => { setRegOpen(false); openReg(type, jm); }}
        />
      )}

      {Toast}
    </div>
  );
}
