'use client';

// SB BO-AIM-ETC-PG061 배너 캠페인 관리 목록 — 검색 영역 + 목록 + 등록.
//  디자인 시스템: accent #3a2fd8 · 헤더/필터 #f6f7f9 · 보더 #e6e7ec · 13px 레귤러.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ComposedBanner, type ComposeFields } from './composed-banner';
import { FilterPanel, ListHeader, THEAD_TR_CLS } from '@/components/ops-ui';
import { PageHeader } from '@/components/page-header';
import { CHIP_BASE } from '@/lib/display-taxonomy';

export type BannerRow = {
  id: string; campaignCode: string; title: string; exposeYn: boolean;
  publishStart: string | null; publishEnd: string | null; approvalLabel: string;
  createdBy: string; createdAt: string | null; updatedBy: string; updatedAt: string | null;
  // 목록 썸네일 — 대표 유형상세(이미지형=imageUrl / 텍스트형=조립 필드 f)(2026-10-06)
  preview: { imageUrl: string | null; f: ComposeFields | null; detail: string | null } | null;
};

// 목록 미리보기 — 실제 배너를 자연 크기(NAT)로 렌더한 뒤 통째로 축소(transform scale).
//  이렇게 하면 '프리뷰 안의 텍스트'도 함께 작아져 안 터지고, 프리뷰 자체도 작게 보인다(2026-10-07 사용자 요청).
const NAT_W = 330; // 텍스트가 안 터지는 자연 폭(상세 배너 비율)
const NAT_H = 104;
const THUMB_SCALE = 0.6; // → 표시 크기 ~198×62
const THUMB_W = Math.round(NAT_W * THUMB_SCALE);
const THUMB_H = Math.round(NAT_H * THUMB_SCALE);
function BannerThumb({ preview }: { preview: BannerRow['preview'] }) {
  if (preview?.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={preview.imageUrl} alt="" style={{ width: THUMB_W, height: THUMB_H }} className="rounded-md border border-[#e6e7ec] object-cover" />;
  }
  if (preview?.f) {
    return (
      <div style={{ width: THUMB_W, height: THUMB_H }} className="overflow-hidden rounded-md border border-[#e6e7ec]">
        <div style={{ width: NAT_W, height: NAT_H, transform: `scale(${THUMB_SCALE})`, transformOrigin: 'top left' }}>
          <ComposedBanner f={preview.f} width={NAT_W} height={NAT_H} preview />
        </div>
      </div>
    );
  }
  return <div style={{ width: THUMB_W, height: THUMB_H }} className="flex items-center justify-center rounded-md border border-dashed border-[#e6e7ec] bg-[#f6f7f9] text-[11px] text-slate-300">미등록</div>;
}

const APPROVAL_TONE: Record<string, string> = {
  승인완료: 'bg-[#C8F6E1] text-[#038E52]', 승인요청: 'bg-[#DCE0E5] text-[#454F59]',
  반려: 'bg-[#FFDCDC] text-[#ED3B3E]', 요청취소: 'bg-[#FFE4C4] text-[#D66400]', 임시저장: 'bg-[#DCE0E5] text-[#454F59]',
};
function fmtDT(iso: string | null) {
  if (!iso) return '-';
  const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
const selectCls = 'sel';
const inputCls = 'inp';
const PER_PAGE = 10;

type F = { field: string; q: string; expose: string; from: string; to: string; approval: string };
const DEF: F = { field: '배너캠페인 ID', q: '', expose: '전체', from: '', to: '', approval: '전체' };

export function BannerList({ rows }: { rows: BannerRow[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<F>(DEF);
  const [applied, setApplied] = useState<F>(DEF);
  const [page, setPage] = useState(1);
  const set = (p: Partial<F>) => setDraft((d) => ({ ...d, ...p }));

  const filtered = useMemo(() => {
    const f = applied;
    return rows.filter((r) => {
      if (f.expose !== '전체' && (f.expose === '전시' ? !r.exposeYn : r.exposeYn)) return false;
      if (f.approval !== '전체' && r.approvalLabel !== f.approval) return false;
      // 전시기간 겹침 필터
      if (f.from && r.publishEnd && r.publishEnd.slice(0, 10) < f.from) return false;
      if (f.to && r.publishStart && r.publishStart.slice(0, 10) > f.to) return false;
      if (f.q.trim()) {
        const q = f.q.trim().toLowerCase();
        const hay = f.field === '배너캠페인명' ? r.title : r.campaignCode;
        if (!(hay ?? '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, applied]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const curPage = Math.min(page, totalPages);
  const paged = filtered.slice((curPage - 1) * PER_PAGE, curPage * PER_PAGE);
  const period = (r: BannerRow) => (r.publishStart || r.publishEnd) ? `${fmtDT(r.publishStart)} ~ ${fmtDT(r.publishEnd)}` : '-';

  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader
        trail={['운영관리', '배너 캠페인 관리']}
        title="배너 캠페인 관리"
      />

      {/* 검색 영역 — 참고 디자인 .ft 폼 테이블 + .sbtn */}
      <div className="mt-6">
        <FilterPanel
          rows={[
            [
              ['검색 항목', (
                <span key="q" className="rng">
                  <select value={draft.field} onChange={(e) => set({ field: e.target.value, q: '' })} className={cn(selectCls, 'w200')}>{['배너캠페인 ID', '배너캠페인명'].map((o) => <option key={o}>{o}</option>)}</select>
                  <input value={draft.q} onChange={(e) => set({ q: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && (setApplied(draft), setPage(1))} placeholder="검색 항목을 선택 후 검색하세요" className={cn(inputCls, 'w-[320px] max-w-full')} />
                </span>
              ), 3],
            ],
            [
              ['전시여부', <select key="ex" value={draft.expose} onChange={(e) => set({ expose: e.target.value })} className={cn(selectCls, 'w200')}>{['전체', '전시', '미전시'].map((o) => <option key={o}>{o}</option>)}</select>],
              ['승인상태', <select key="av" value={draft.approval} onChange={(e) => set({ approval: e.target.value })} className={cn(selectCls, 'w200')}>{['전체', '승인요청', '승인완료', '반려', '요청취소'].map((o) => <option key={o}>{o}</option>)}</select>],
            ],
            [
              ['전시기간', (
                <span key="pd" className="rng">
                  <input type="date" value={draft.from} onChange={(e) => set({ from: e.target.value })} className={inputCls} />
                  <span className="text-[var(--ink3)]">~</span>
                  <input type="date" value={draft.to} onChange={(e) => set({ to: e.target.value })} className={inputCls} />
                </span>
              ), 3],
            ],
          ]}
          onReset={() => { setDraft(DEF); setApplied(DEF); setPage(1); }}
          onSearch={() => { setApplied(draft); setPage(1); }}
        />
      </div>

      <ListHeader title="조회결과" count={filtered.length} />
      <div className="overflow-x-auto border-t border-[#e6e7ec]">
        <table className="w-full min-w-[1200px] text-[13px] font-normal whitespace-nowrap">
          <thead>
            <tr className={THEAD_TR_CLS}>
              {['NO.', '미리보기', '배너캠페인 ID', '배너캠페인명', '전시여부', '전시기간', '승인상태', '등록자', '등록일시', '최종 수정자', '최종 수정일시'].map((h) => (
                <th key={h} className={cn('h-11 px-3 font-normal', h === '배너캠페인명' || h === '전시기간' ? 'text-left' : 'text-center')}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={11} className="px-3 py-16 text-center text-slate-400">조회된 배너 캠페인이 없습니다.</td></tr>
            ) : paged.map((r, i) => (
              <tr key={r.id} onClick={() => router.push(`/admin/banner-campaigns/${r.id}`)} className="cursor-pointer border-b border-[#e6e7ec] text-center text-slate-700 hover:bg-[#f6f7f9]">
                <td className="h-11 px-3 tabular-nums text-slate-500">{filtered.length - ((curPage - 1) * PER_PAGE + i)}</td>
                <td className="h-11 px-3 py-1.5"><div className="flex justify-center"><BannerThumb preview={r.preview} /></div></td>
                <td className="h-11 px-3 tabular-nums">{r.campaignCode}</td>
                <td className="h-11 px-3 text-left">{r.title}</td>
                <td className="h-11 px-3"><span className={cn(CHIP_BASE, r.exposeYn ? 'bg-[#C8F6E1] text-[#038E52]' : 'bg-[#DCE0E5] text-[#454F59]')}>{r.exposeYn ? '전시' : '미전시'}</span></td>
                <td className="h-11 px-3 text-left text-slate-500">{period(r)}</td>
                <td className="h-11 px-3"><span className={cn(CHIP_BASE, APPROVAL_TONE[r.approvalLabel] ?? 'bg-[#DCE0E5] text-[#454F59]')}>{r.approvalLabel}</span></td>
                <td className="h-11 px-3 text-slate-600">{r.createdBy}</td>
                <td className="h-11 px-3 text-slate-500">{fmtDT(r.createdAt)}</td>
                <td className="h-11 px-3 text-slate-600">{r.updatedBy}</td>
                <td className="h-11 px-3 text-slate-500">{fmtDT(r.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="relative mt-8 flex items-center justify-center">
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 10).map((p) => (
              <button key={p} onClick={() => setPage(p)} className={cn('h-8 w-8 rounded-md text-[13px]', p === curPage ? 'bg-[#3a2fd8] font-semibold text-white' : 'text-slate-600 hover:bg-slate-100')}>{p}</button>
            ))}
          </div>
        )}
        <Link href="/admin/banner-campaigns/new" className="absolute right-0 inline-flex h-9 items-center rounded-lg bg-[#3a2fd8] px-5 text-[13px] font-semibold text-white hover:brightness-110">등록</Link>
      </div>
    </div>
  );
}
