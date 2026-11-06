'use client';

import Link from 'next/link';
import { useState } from 'react';

export type ContainerInfo = {
  name: string;
  kind: string;
  platform: string;
  previewUrl: string | null;
  status: string;
  startAt: string | null;
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

// 공식 폼 테이블(.ft) — 라벨 148px 회색 칸 + 값 칸, 가로선만.
function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-[15px] font-bold text-[var(--ink)]">{title}</h2>
      <table className="ft">
        <tbody>{children}</tbody>
      </table>
    </section>
  );
}
function R({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <tr>
      <th className={required ? 'req' : undefined}>{label}</th>
      <td>{children}</td>
    </tr>
  );
}

export function ContainerInfoForm({
  action,
  c,
  cancelHref,
}: {
  action: (fd: FormData) => void | Promise<void>;
  c: ContainerInfo;
  cancelHref: string;
}) {
  const [noEnd, setNoEnd] = useState(c.noEndDate);

  return (
    <form action={action}>
      <Sec title="기본 정보">
        <R label="컨테이너 명" required>
          <input name="name" defaultValue={c.name} className="inp wide" />
        </R>
        <R label="컨테이너 타입">
          <select name="kind" defaultValue={c.kind} className="sel">
            <option value="일반">일반</option>
            <option value="코너관리용">코너관리용</option>
          </select>
        </R>
        <R label="플랫폼">
          <select name="platform" defaultValue={c.platform} className="sel">
            <option value="모바일">모바일</option>
            <option value="PC">PC</option>
          </select>
        </R>
        <R label="전시 여부">
          <select name="display" defaultValue={c.status === 'active' ? '전시' : '미전시'} className="sel">
            <option value="전시">전시</option>
            <option value="미전시">미전시</option>
          </select>
        </R>
        <R label="전시 기간">
          <div className="flex flex-wrap items-center gap-2">
            <input type="datetime-local" name="startAt" defaultValue={c.startAt ?? ''} className="inp" style={{ width: 210 }} />
            <span className="text-[var(--ink3)]">~</span>
            <input
              type="datetime-local"
              name="endAt"
              defaultValue={c.endAt ?? ''}
              disabled={noEnd}
              className="inp"
              style={{ width: 210 }}
            />
            <label className="ml-2 flex items-center gap-1.5 text-[13px]">
              <input type="checkbox" name="noEndDate" checked={noEnd} onChange={(e) => setNoEnd(e.target.checked)} />
              종료일 없음 (상시 전시)
            </label>
          </div>
        </R>
        <R label="미리보기 URL">
          <input name="previewUrl" defaultValue={c.previewUrl ?? ''} placeholder="https://…" className="inp wide" />
        </R>
      </Sec>

      <Sec title="메타 정보 (SEO)">
        <R label="사용 여부">
          <select name="metaUse" defaultValue={c.metaUse ? '사용' : '미사용'} className="sel">
            <option value="사용">사용</option>
            <option value="미사용">미사용</option>
          </select>
        </R>
        <R label="검색 태그">
          <input name="searchTags" defaultValue={c.searchTags ?? ''} placeholder="#혜택 #홈 #추천" className="inp wide" />
        </R>
        <R label="meta keywords">
          <input name="metaKeywords" defaultValue={c.metaKeywords ?? ''} className="inp wide" />
        </R>
        <R label="meta description">
          <input name="metaDescription" defaultValue={c.metaDescription ?? ''} className="inp wide" />
        </R>
        <R label="og:title">
          <input name="ogTitle" defaultValue={c.ogTitle ?? ''} className="inp wide" />
        </R>
        <R label="og:site_name">
          <input name="ogSiteName" defaultValue={c.ogSiteName ?? ''} className="inp wide" />
        </R>
        <R label="og:description">
          <input name="ogDescription" defaultValue={c.ogDescription ?? ''} className="inp wide" />
        </R>
        <R label="og:image URL">
          <input name="ogImage" defaultValue={c.ogImage ?? ''} placeholder="https://…" className="inp wide" />
        </R>
      </Sec>

      <div className="foot">
        <Link
          href={cancelHref}
          className="inline-flex h-[38px] items-center rounded-[8px] border border-[var(--line2)] bg-white px-5 text-[13px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]"
        >
          취소
        </Link>
        <button
          type="submit"
          className="inline-flex h-[38px] items-center rounded-[8px] bg-[var(--ac)] px-6 text-[13px] font-semibold text-white hover:bg-[var(--ac-h)]"
        >
          저장
        </button>
      </div>
    </form>
  );
}
