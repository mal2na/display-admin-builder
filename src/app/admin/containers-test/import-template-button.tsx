'use client';

// 템플릿 불러오기 — 다른 컨테이너의 템플릿을 골라 이 컨테이너로 가져온다(importTemplate).
import * as React from 'react';
import { Download, X, Search } from 'lucide-react';
import { importTemplate } from './container-crud-actions';

export type ImportSource = { id: string; name: string; containerName: string; corners: number; conditionGroup: string };

const BTN = 'inline-flex h-[36px] items-center gap-1.5 rounded-[8px] border border-[var(--line2)] bg-white px-3.5 text-[13px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]';

export function ImportTemplateButton({ containerId, sources }: { containerId: string; sources: ImportSource[] }) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [sel, setSel] = React.useState<string | null>(null);

  const list = sources.filter((s) => !q.trim() || `${s.containerName} ${s.name}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <>
      <button type="button" className={BTN} onClick={() => { setOpen(true); setSel(null); setQ(''); }}>
        <Download className="h-3.5 w-3.5" /> 템플릿 불러오기
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-auto bg-black/40 p-6" onMouseDown={() => setOpen(false)}>
          <form action={importTemplate.bind(null, containerId)} onMouseDown={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <input type="hidden" name="sourceTemplateId" value={sel ?? ''} />
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[18px] font-bold text-[var(--ink)]">템플릿 불러오기</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-[var(--ink3)] hover:text-[var(--ink)]"><X className="h-5 w-5" /></button>
            </div>
            <p className="mb-3 text-[13px] text-[var(--ink3)]">다른 컨테이너의 템플릿을 선택하면 코너 배치를 그대로 가져와 이 컨테이너에 새 템플릿(초안)으로 추가됩니다.</p>

            <div className="mb-3 flex items-center gap-2 rounded-[8px] border border-[var(--line2)] px-3">
              <Search className="h-4 w-4 text-[var(--ink4)]" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="컨테이너 · 템플릿명 검색" className="h-9 flex-1 text-[14px] outline-none" />
            </div>

            <div className="max-h-[46vh] overflow-auto rounded-lg border border-[var(--line2)]">
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 bg-[var(--th)]">
                  <tr className="text-[12px] text-[var(--ink2)]">
                    <th className="w-12 px-3 py-2.5 text-center font-medium">선택</th>
                    <th className="px-3 py-2.5 text-left font-medium">컨테이너</th>
                    <th className="px-3 py-2.5 text-left font-medium">템플릿명</th>
                    <th className="px-3 py-2.5 text-left font-medium">로그인 구분</th>
                    <th className="w-20 px-3 py-2.5 text-center font-medium">Corner</th>
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-10 text-center text-[var(--ink3)]">불러올 수 있는 템플릿이 없습니다.</td></tr>
                  ) : list.map((s) => (
                    <tr key={s.id} onClick={() => setSel(s.id)} className={`cursor-pointer border-t border-[var(--line2)] hover:bg-[var(--th)] ${sel === s.id ? 'bg-[var(--ac2)]' : ''}`}>
                      <td className="px-3 py-2 text-center"><input type="radio" checked={sel === s.id} onChange={() => setSel(s.id)} className="accent-indigo-600" /></td>
                      <td className="px-3 py-2 text-[var(--ink2)]">{s.containerName}</td>
                      <td className="px-3 py-2 font-medium text-[var(--ink)]">{s.name}</td>
                      <td className="px-3 py-2 text-[var(--ink2)]">{s.conditionGroup}</td>
                      <td className="px-3 py-2 text-center tabular-nums text-[var(--ink2)]">{s.corners}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className={BTN}>취소</button>
              <button type="submit" disabled={!sel} className="inline-flex h-[36px] items-center rounded-[8px] bg-[var(--ac)] px-5 text-[13px] font-semibold text-white hover:bg-[var(--ac-h)] disabled:bg-[var(--line2)] disabled:text-[var(--ink4)]">불러오기</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
