'use client';

/**
 * 프로모션 관리 — 루트.
 *  목록은 React 로 이식했고(2026-10-08), 등록·상세(조건 빌더·리워드·CTA·추천 구조)는
 *  아직 public/promotion-prototype.html 프로토타입을 그대로 쓴다. 목록에서 [등록]·[예시 행]을
 *  누르면 그 화면만 딥링크(#reg · #ex=<key>)로 띄운다.
 *  결과 관리는 별도 LNB 메뉴(/admin/events/result · result-admin.tsx)로 분리했다(2026-10-20).
 *  프로토타입 상세의 '빌더 구성영역'을 누르면 iframe 이 postMessage(open-builder)를 보내고,
 *  기존 전시화면 관리 빌더(혜택 홈)로 이동한다(/admin/events/promo/benefit-builder 리졸버 경유, 2026-10-20).
 */
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { PromoList } from './promo-list';
import { RegStartModal } from './reg-start-modal';
import { RegForm } from './reg-form';
import type { PromoRow } from '@/lib/promotion/model';

export function PromoAdmin() {
  const router = useRouter();
  const [proto, setProto] = React.useState<string | null>(null);
  const [regOpen, setRegOpen] = React.useState(false);
  /** React 로 옮긴 등록 폼 (지금은 안내형만) */
  const [form, setForm] = React.useState<null | { type: string; jm: '직접' | '행동' }>(null);
  const [toastMsg, setToastMsg] = React.useState<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = React.useCallback((m: string) => {
    setToastMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastMsg(null), 2600);
  }, []);
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  /** 프로토타입 iframe → 부모: 빌더 구성영역 클릭 시 기존 전시화면 관리 빌더(혜택 홈)로 이동 */
  React.useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.data && e.data.type === 'open-builder') {
        router.push('/admin/events/promo/benefit-builder');
      }
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [router]);

  /** 유형이 정해지면 등록 화면으로 — 안내형은 React 폼, 나머지는 아직 프로토타입 */
  function openReg(type: string, jm: string | null) {
    if (type === '안내형' || type === '참여ㆍ리워드형' || type === '추천형') {
      setProto(null); setForm({ type, jm: (jm as '직접' | '행동') ?? '직접' }); return;
    }
    setForm(null);
    setProto(`#form=${encodeURIComponent(type)}${jm ? `&jm=${encodeURIComponent(jm)}` : ''}`);
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

  if (proto) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center gap-3 border-b border-[var(--line)] px-12 py-3">
          <button
            type="button"
            onClick={() => setProto(null)}
            className="h-[38px] rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-5 text-[14px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]"
          >
            ← 목록으로
          </button>
          <span className="text-[13px] text-[var(--ink3)]">등록·상세 화면은 아직 프로토타입을 사용합니다.</span>
        </div>
        <iframe
          key={proto}
          src={`/promotion-prototype.html${proto}`}
          title="프로모션 등록"
          className="min-h-0 flex-1 border-0 bg-white"
        />
      </div>
    );
  }

  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader trail={['프로모션 관리']} title="프로모션 관리" />
      <div className="mt-6">
        <PromoList
          onToast={toast}
          onRegister={() => setRegOpen(true)}
          onOpenExample={(r: PromoRow) => setProto(`#ex=${encodeURIComponent(r.ex ?? '')}`)}
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
