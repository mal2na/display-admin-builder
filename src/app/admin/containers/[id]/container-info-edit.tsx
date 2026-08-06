'use client';

import { useState } from 'react';
import { updateContainerInfo } from '../actions';
import { X, Pencil } from 'lucide-react';

export type ContainerInfo = {
  id: string;
  name: string;
  kind: string;
  platform: string;
  previewUrl: string | null;
  status: string; // active | inactive
  startAt: string | null; // 'YYYY-MM-DDTHH:mm'
  endAt: string | null;
  noEndDate: boolean;
  metaUse: boolean;
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

export function ContainerInfoEdit({ container: c }: { container: ContainerInfo }) {
  const [open, setOpen] = useState(false);
  const [noEnd, setNoEnd] = useState(c.noEndDate);

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-secondary">
        <Pencil className="h-3.5 w-3.5" /> 정보 수정
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-3.5">
              <h2 className="text-base font-bold">컨테이너 정보 수정</h2>
              <button onClick={() => setOpen(false)} className="rounded p-1 text-muted-foreground hover:bg-secondary" aria-label="닫기"><X className="h-5 w-5" /></button>
            </div>

            <form action={updateContainerInfo.bind(null, c.id)} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-6 overflow-y-auto p-5">
                {/* 기본 정보 */}
                <section className="space-y-3">
                  <h3 className="text-[13px] font-bold text-muted-foreground">기본 정보</h3>
                  <div>
                    <label className={label}>컨테이너 명 *</label>
                    <input name="name" defaultValue={c.name} className={input} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={label}>컨테이너 타입</label>
                      <select name="kind" defaultValue={c.kind} className={input}>
                        <option value="일반">일반</option>
                        <option value="코너관리용">코너관리용</option>
                      </select>
                    </div>
                    <div>
                      <label className={label}>플랫폼</label>
                      <select name="platform" defaultValue={c.platform} className={input}>
                        <option value="모바일">모바일</option>
                        <option value="PC">PC</option>
                      </select>
                    </div>
                    <div>
                      <label className={label}>전시 여부</label>
                      <select name="display" defaultValue={c.status === 'active' ? '전시' : '미전시'} className={input}>
                        <option value="전시">전시</option>
                        <option value="미전시">미전시</option>
                      </select>
                    </div>
                    <div>
                      <label className={label}>미리보기 URL</label>
                      <input name="previewUrl" defaultValue={c.previewUrl ?? ''} placeholder="https://…" className={input} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={label}>전시 시작</label>
                      <input type="datetime-local" name="startAt" defaultValue={c.startAt ?? ''} className={input} />
                    </div>
                    <div>
                      <label className={label}>전시 종료</label>
                      <input type="datetime-local" name="endAt" defaultValue={c.endAt ?? ''} disabled={noEnd} className={`${input} disabled:bg-muted disabled:text-muted-foreground`} />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-[13px]">
                    <input type="checkbox" name="noEndDate" checked={noEnd} onChange={(e) => setNoEnd(e.target.checked)} className="h-4 w-4 rounded border" />
                    종료일 없음 (상시 전시)
                  </label>
                </section>

                {/* 메타 정보 */}
                <section className="space-y-3">
                  <h3 className="text-[13px] font-bold text-muted-foreground">메타 정보 (SEO)</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={label}>사용 여부</label>
                      <select name="metaUse" defaultValue={c.metaUse ? '사용' : '미사용'} className={input}>
                        <option value="사용">사용</option>
                        <option value="미사용">미사용</option>
                      </select>
                    </div>
                    <div>
                      <label className={label}>검색 태그</label>
                      <input name="searchTags" defaultValue={c.searchTags ?? ''} placeholder="#혜택 #홈 #추천" className={input} />
                    </div>
                  </div>
                  <div>
                    <label className={label}>meta keywords</label>
                    <input name="metaKeywords" defaultValue={c.metaKeywords ?? ''} className={input} />
                  </div>
                  <div>
                    <label className={label}>meta description</label>
                    <input name="metaDescription" defaultValue={c.metaDescription ?? ''} className={input} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={label}>og:title</label>
                      <input name="ogTitle" defaultValue={c.ogTitle ?? ''} className={input} />
                    </div>
                    <div>
                      <label className={label}>og:site_name</label>
                      <input name="ogSiteName" defaultValue={c.ogSiteName ?? ''} className={input} />
                    </div>
                  </div>
                  <div>
                    <label className={label}>og:description</label>
                    <input name="ogDescription" defaultValue={c.ogDescription ?? ''} className={input} />
                  </div>
                  <div>
                    <label className={label}>og:image URL</label>
                    <input name="ogImage" defaultValue={c.ogImage ?? ''} placeholder="https://…" className={input} />
                  </div>
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
