'use client';

/** 등록 폼에서 쓰는 조회 팝업 — 유의사항 템플릿 · 서비스 내부 페이지. */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Dialog, BTN, BTN_PRI, INP, SEL } from './form-ui';
import { CAU_TPL, SVC_PAGES } from '@/lib/promotion/form';

/** 유의사항 템플릿 불러오기 — 이미 입력한 내용이 있으면 덮어쓰기 전에 확인한다 */
export function CautionPicker({ type, hasText, onApply, onClose }: {
  type: string; hasText: boolean;
  onApply: (t: typeof CAU_TPL[number]) => void;
  onClose: () => void;
}) {
  const [cat, setCat] = React.useState(type || '전체');
  const [q, setQ] = React.useState('');
  const [sel, setSel] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState(false);

  const kw = q.trim();
  // 공통 템플릿은 '공통' 탭이 아닐 때도 같이 보여준다
  const list = CAU_TPL.filter((t) =>
    (cat === '전체' || t.cat === cat || (cat !== '공통' && t.cat === '공통')) && (!kw || t.name.includes(kw)));
  const picked = CAU_TPL.find((t) => t.id === sel);

  const apply = () => {
    if (!picked) return;
    if (hasText && !confirm) { setConfirm(true); return; }
    onApply(picked);
  };

  if (confirm) {
    return (
      <Dialog
        title="템플릿을 적용할까요?" width={460} onClose={() => setConfirm(false)}
        foot={<>
          <button type="button" className={BTN} onClick={() => setConfirm(false)}>취소</button>
          <button type="button" className={BTN_PRI} onClick={() => picked && onApply(picked)}>적용</button>
        </>}
      >
        <p className="text-[14px] leading-[20px]">입력된 유의사항이 템플릿 내용으로 바뀌어요. 적용할까요?</p>
      </Dialog>
    );
  }

  return (
    <Dialog
      title="유의사항 템플릿" sub="템플릿을 고르면 유의사항 내용이 채워져요 · 적용 후에도 수정할 수 있어요"
      width={720} onClose={onClose}
      foot={<>
        <button type="button" className={BTN} onClick={onClose}>취소</button>
        <button type="button" className={BTN_PRI} disabled={!picked} onClick={apply}>적용</button>
      </>}
    >
      <div className="flex flex-wrap items-center gap-2">
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={cn(SEL, 'w-[180px]')}>
          {['전체', '공통', '안내형', '참여ㆍ리워드형', '추천형'].map((o) => <option key={o}>{o}</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="템플릿명 검색" className={cn(INP, 'flex-1')} />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr]">
        <ul className="max-h-[300px] overflow-y-auto rounded-[var(--r-field)] border border-[var(--line2)]">
          {list.length === 0 ? (
            <li className="p-6 text-center text-[14px] text-[var(--ink3)]">조회 결과가 없어요</li>
          ) : list.map((t) => (
            <li key={t.id}>
              <label className={cn('flex cursor-pointer items-start gap-2 border-b border-[var(--line2)] p-3 text-[14px] last:border-b-0',
                sel === t.id && 'bg-[var(--ac2)]')}>
                <input type="radio" name="cau" checked={sel === t.id} onChange={() => setSel(t.id)} className="mt-0.5 h-4 w-4" />
                <span className="min-w-0">
                  <b className="block font-semibold">{t.name}</b>
                  <small className="text-[12px] text-[var(--ink3)]">{t.id} · {t.cat}</small>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className="max-h-[300px] overflow-y-auto rounded-[var(--r-field)] bg-[var(--th)] p-3">
          <p className={cn('whitespace-pre-line text-[13px] leading-[20px]', picked ? 'text-[var(--ink)]' : 'text-[var(--ink4)]')}>
            {picked ? picked.body : '템플릿을 선택하면 내용이 보여요'}
          </p>
        </div>
      </div>
    </Dialog>
  );
}

/** 서비스 내부 페이지 조회 (CTA 연결용) */
export function PagePicker({ value, onApply, onClose }: {
  value: string; onApply: (id: string) => void; onClose: () => void;
}) {
  const [q, setQ] = React.useState('');
  const [sel, setSel] = React.useState<string | null>(value || null);
  const kw = q.trim().toUpperCase();
  const list = SVC_PAGES.filter((p) => !kw || p.id.includes(kw) || p.name.includes(q.trim()));

  return (
    <Dialog
      title="페이지 조회" sub="서비스 내부 페이지 공통 목록 (예시 데이터)" width={620} onClose={onClose}
      foot={<>
        <button type="button" className={BTN} onClick={onClose}>취소</button>
        <button type="button" className={BTN_PRI} disabled={!sel} onClick={() => sel && onApply(sel)}>적용</button>
      </>}
    >
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="페이지 ID 또는 페이지명 검색" className={cn(INP, 'w-full')} />
      <ul className="mt-3 max-h-[320px] overflow-y-auto rounded-[var(--r-field)] border border-[var(--line2)]">
        {list.length === 0 ? (
          <li className="p-6 text-center text-[14px] text-[var(--ink3)]">조회 결과가 없어요</li>
        ) : list.map((p) => (
          <li key={p.id}>
            <label className={cn('flex cursor-pointer items-center gap-3 border-b border-[var(--line2)] p-3 text-[14px] last:border-b-0',
              sel === p.id && 'bg-[var(--ac2)]')}>
              <input type="radio" name="pg" checked={sel === p.id} onChange={() => setSel(p.id)} className="h-4 w-4" />
              <span className="w-[100px] shrink-0 font-mono text-[13px] text-[var(--ink3)]">{p.id}</span>
              <b className="min-w-0 flex-1 truncate font-semibold">{p.name}</b>
              <small className="shrink-0 text-[12px] text-[var(--ink3)]">{p.svc}</small>
            </label>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
