'use client';

import { useState } from 'react';
import { updateProgramInfo } from '../../../actions';
import { PROGRAM_KINDS, typesForKind, createsStateFor } from '@/lib/event-templates';
import { X, Pencil, ChevronDown, Info } from 'lucide-react';

export type ProgramInfo = {
  id: string;
  name: string;
  programKind: string;
  programType: string;
  purpose: string | null;
  partnerBrand: string | null;
  thumbnail: string | null;
  thumbnailAlt: string | null;
  startAt: string | null;
  endAt: string | null;
  displayStartAt: string | null;
  displayEndAt: string | null;
  displayNoEndDate: boolean;
  displayState: string;
  commentUse: boolean;
  searchExposed: boolean;
  searchTags: string | null;
  metaKeywords: string | null;
  metaDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogSiteName: string | null;
  ogImage: string | null;
};

const input = 'h-10 w-full rounded-lg border px-3 text-sm';
const label = 'mb-1 block text-xs font-medium text-muted-foreground';

export function ProgramInfoEdit({ program: p }: { program: ProgramInfo }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState(p.programKind);
  const [type, setType] = useState(p.programType);
  const [noEnd, setNoEnd] = useState(p.displayNoEndDate);
  const [seo, setSeo] = useState(false);
  const creates = createsStateFor(kind, type);

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground" title="프로모션 정보 수정">
        <Pencil className="h-3.5 w-3.5" /> 정보 수정
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-card text-foreground shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-3.5">
              <h2 className="text-base font-bold">프로모션 기본 정보 수정</h2>
              <button onClick={() => setOpen(false)} className="rounded p-1 text-muted-foreground hover:bg-secondary" aria-label="닫기"><X className="h-5 w-5" /></button>
            </div>

            <form action={updateProgramInfo.bind(null, p.id)} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-6 overflow-y-auto p-5">
                {/* 기본 정보 */}
                <section className="space-y-3">
                  <h3 className="text-[13px] font-bold text-muted-foreground">기본 정보</h3>
                  <div>
                    <label className={label}>프로그램 이름 *</label>
                    <input name="name" defaultValue={p.name} className={input} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={label}>구분</label>
                      <select name="programKind" value={kind} onChange={(e) => { setKind(e.target.value); setType(typesForKind(e.target.value)[0]); }} className={input}>
                        {PROGRAM_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={label}>대표 유형</label>
                      <select name="programType" value={type} onChange={(e) => setType(e.target.value)} className={input}>
                        {typesForKind(kind).map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] ${creates ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    {creates ? '참여 상태를 생성하는 유형' : '참여 상태를 생성하지 않는 유형 (노출·클릭 트래킹)'}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={label}>제휴 브랜드</label>
                      <input name="partnerBrand" defaultValue={p.partnerBrand ?? ''} placeholder="선택" className={input} />
                    </div>
                    <div>
                      <label className={label}>운영 목적</label>
                      <input name="purpose" defaultValue={p.purpose ?? ''} className={input} />
                    </div>
                  </div>
                  <div>
                    <label className={label}>썸네일 이미지 URL</label>
                    <input name="thumbnail" defaultValue={p.thumbnail ?? ''} placeholder="https://…" className={input} />
                  </div>
                  <div>
                    <label className={label}>썸네일 대체텍스트(ALT)</label>
                    <input name="thumbnailAlt" defaultValue={p.thumbnailAlt ?? ''} className={input} />
                  </div>
                </section>

                {/* 기간 & 노출 */}
                <section className="space-y-3">
                  <h3 className="text-[13px] font-bold text-muted-foreground">기간 &amp; 노출</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={label}>운영 시작</label><input type="datetime-local" name="startAt" defaultValue={p.startAt ?? ''} className={input} /></div>
                    <div><label className={label}>운영 종료</label><input type="datetime-local" name="endAt" defaultValue={p.endAt ?? ''} className={input} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={label}>전시 시작</label><input type="datetime-local" name="displayStartAt" defaultValue={p.displayStartAt ?? ''} className={input} /></div>
                    <div><label className={label}>전시 종료</label><input type="datetime-local" name="displayEndAt" defaultValue={p.displayEndAt ?? ''} disabled={noEnd} className={`${input} disabled:bg-muted disabled:text-muted-foreground`} /></div>
                  </div>
                  <label className="flex items-center gap-2 text-[13px]">
                    <input type="checkbox" name="displayNoEndDate" checked={noEnd} onChange={(e) => setNoEnd(e.target.checked)} className="h-4 w-4 rounded border" /> 종료일 없음 (상시)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={label}>전시 상태</label>
                      <select name="displayState" defaultValue={p.displayState} className={input}><option value="미노출">미노출</option><option value="노출">노출</option></select>
                    </div>
                    <div>
                      <label className={label}>댓글 여부</label>
                      <select name="commentUse" defaultValue={p.commentUse ? 'true' : 'false'} className={input}><option value="false">미사용</option><option value="true">사용</option></select>
                    </div>
                  </div>
                </section>

                {/* 검색 및 태그 (SEO) */}
                <section>
                  <button type="button" onClick={() => setSeo((v) => !v)} className="flex w-full items-center justify-between text-[13px] font-bold text-muted-foreground">
                    <span>검색 및 태그 (SEO)</span>
                    <ChevronDown className={`h-4 w-4 transition ${seo ? 'rotate-180' : ''}`} />
                  </button>
                  {seo && (
                    <div className="mt-3 space-y-3">
                      <label className="flex items-center gap-2 text-[13px]">
                        <input type="checkbox" name="searchExposed" defaultChecked={p.searchExposed} className="h-4 w-4 rounded border" /> 검색 노출 허용
                      </label>
                      <div><label className={label}>검색 태그</label><input name="searchTags" defaultValue={p.searchTags ?? ''} placeholder="#할인 #제휴" className={input} /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className={label}>meta keywords</label><input name="metaKeywords" defaultValue={p.metaKeywords ?? ''} className={input} /></div>
                        <div><label className={label}>og:site_name</label><input name="ogSiteName" defaultValue={p.ogSiteName ?? ''} className={input} /></div>
                      </div>
                      <div><label className={label}>meta description</label><input name="metaDescription" defaultValue={p.metaDescription ?? ''} className={input} /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className={label}>og:title</label><input name="ogTitle" defaultValue={p.ogTitle ?? ''} className={input} /></div>
                        <div><label className={label}>og:image URL</label><input name="ogImage" defaultValue={p.ogImage ?? ''} className={input} /></div>
                      </div>
                      <div><label className={label}>og:description</label><input name="ogDescription" defaultValue={p.ogDescription ?? ''} className={input} /></div>
                    </div>
                  )}
                </section>
              </div>

              <div className="flex justify-end gap-2 border-t px-5 py-3">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-secondary">취소</button>
                <button type="submit" onClick={() => setTimeout(() => setOpen(false), 0)} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">저장</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
