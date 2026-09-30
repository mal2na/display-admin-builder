'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { StatusPill } from '@/components/ops-ui';
import { BANNER_APPROVAL, BANNER_EXPOSE, fmtDateTime, fmtPeriod } from '@/lib/widget-taxonomy';
import { RotateCcw, Search, List, LayoutGrid, Trash2, X, MapPin } from 'lucide-react';
import { ComposedBanner, type ComposeFields } from './composed-banner';
import { deleteBannerCampaign } from './actions';
import type { BannerUsage } from './banner-usage';

// 썸네일 프리뷰 — 완성 이미지형은 URL, 직접 만들기형은 조립 결과를 라이브 렌더.
export type BannerPreview =
  | { kind: 'image'; url: string }
  | { kind: 'compose'; f: ComposeFields }
  | null;

export type BannerRow = {
  id: string; campaignCode: string; title: string; exposeYn: boolean;
  publishStart: string | null; publishEnd: string | null; approvalStatus: string; approvalManager: string | null; preview: BannerPreview;
  usage: BannerUsage[];
  createdBy: string | null; createdAt: string; updatedBy: string | null; updatedAt: string;
};

// 컨테이너에 맞춰 조립형 배너를 렌더(썸네일용).
// 넉넉한 natural 크기(360px 폭)로 그린 뒤 컨테이너 크기에 맞게 통째로 scale — 작은 카드에서도 문구·CTA가 잘리지 않음.
const NAT_W = 360;
function FitComposed({ f }: { f: ComposeFields }) {
  const ref = useRef<HTMLDivElement>(null);
  const [d, setD] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setD({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = d.w > 0 ? d.w / NAT_W : 0;
  const natH = d.w > 0 ? Math.round((NAT_W * d.h) / d.w) : 202;
  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden">
      {d.w > 0 && (
        <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${scale})`, width: NAT_W, height: natH }}>
          <ComposedBanner f={f} width={NAT_W} height={natH} />
        </div>
      )}
    </div>
  );
}

function BannerThumb({ preview }: { preview: BannerPreview }) {
  if (preview?.kind === 'image') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={preview.url} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.03]" />;
  }
  if (preview?.kind === 'compose') return <FitComposed f={preview.f} />;
  return <LayoutGrid className="h-8 w-8 text-slate-300" />;
}

const PER_PAGE = 10;

export function BannerList({ rows }: { rows: BannerRow[] }) {
  const router = useRouter();
  // 검색 항목(선택) + 단일 검색어 — 목업 통일(2026-09-30).
  const [field, setField] = useState<'code' | 'title'>('code');
  const [q, setQ] = useState('');
  const [expose, setExpose] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');
  const [applied, setApplied] = useState({ code: '', title: '', expose: '', from: '', to: '', status: '' });
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'list' | 'card'>('list');
  const [confirmDel, setConfirmDel] = useState<BannerRow | null>(null);
  const [deleting, startDelete] = useTransition();
  const doDelete = () => { if (!confirmDel) return; const id = confirmDel.id; startDelete(async () => { await deleteBannerCampaign(id); setConfirmDel(null); router.refresh(); }); };

  const reset = () => { setField('code'); setQ(''); setExpose(''); setFrom(''); setTo(''); setStatus(''); setApplied({ code: '', title: '', expose: '', from: '', to: '', status: '' }); setPage(1); };
  const search = () => { setApplied({ code: field === 'code' ? q : '', title: field === 'title' ? q : '', expose, from, to, status }); setPage(1); };

  const filtered = useMemo(() => rows
    .filter((r) => (applied.code ? r.campaignCode.toLowerCase().includes(applied.code.toLowerCase()) : true))
    .filter((r) => (applied.title ? r.title.toLowerCase().includes(applied.title.toLowerCase()) : true))
    .filter((r) => (applied.expose ? String(r.exposeYn) === applied.expose : true))
    .filter((r) => (applied.status ? r.approvalStatus === applied.status : true))
    .filter((r) => (applied.from ? (r.publishEnd ?? r.publishStart ?? '') >= applied.from : true))
    .filter((r) => (applied.to ? (r.publishStart ?? r.publishEnd ?? '') <= applied.to + 'T23:59' : true)),
    [rows, applied]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageSafe = Math.min(page, totalPages);
  const paged = filtered.slice((pageSafe - 1) * PER_PAGE, pageSafe * PER_PAGE);

  return (
    <div className="space-y-4">
      {/* 검색 조건 — 검색 항목(선택) + 단일 검색어. 목업 통일(2026-09-30) */}
      <div className="rounded-xl border border-[#E8ECEF] bg-[#F8F9FB] px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-slate-500">검색 항목</span>
            <Select value={field} onChange={(e) => setField(e.target.value as 'code' | 'title')} className="h-9 w-40 text-sm">
              <option value="code">배너캠페인 ID</option>
              <option value="title">배너캠페인명</option>
            </Select>
            <span className="text-slate-300">|</span>
            <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') search(); }} placeholder="검색 항목을 선택 후 검색하세요" className="h-9 w-64 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-slate-500">전시여부</span>
            <Select value={expose} onChange={(e) => setExpose(e.target.value)} className="h-9 w-28 text-sm">
              <option value="">전체</option>
              <option value="true">전시</option>
              <option value="false">미전시</option>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-slate-500">전시기간</span>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-36 text-sm" />
            <span className="text-muted-foreground">-</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-36 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-slate-500">승인상태</span>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 w-32 text-sm">
              <option value="">전체</option>
              {Object.entries(BANNER_APPROVAL).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
            </Select>
          </div>
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="outline" onClick={reset}><RotateCcw className="mr-1 h-3.5 w-3.5" />초기화</Button>
            <Button type="button" onClick={search}><Search className="mr-1 h-3.5 w-3.5" />조회</Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">검색결과 <span className="text-indigo-600">{filtered.length}건</span></p>
        <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 text-[12px]">
          <button type="button" onClick={() => setView('list')} className={'flex items-center gap-1 px-3 py-1.5 font-medium ' + (view === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}><List className="h-3.5 w-3.5" />리스트형</button>
          <button type="button" onClick={() => setView('card')} className={'flex items-center gap-1 px-3 py-1.5 font-medium ' + (view === 'card' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}><LayoutGrid className="h-3.5 w-3.5" />카드형</button>
        </div>
      </div>

      {/* 카드형 뷰 */}
      {view === 'card' && (
        paged.length === 0 ? (
          <div className="border-y border-slate-200 bg-white px-4 py-16 text-center text-sm text-muted-foreground">조회된 배너 캠페인이 없습니다.</div>
        ) : (
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
            {paged.map((r) => {
              const ex = r.exposeYn ? BANNER_EXPOSE.true : BANNER_EXPOSE.false;
              const ap = BANNER_APPROVAL[r.approvalStatus as keyof typeof BANNER_APPROVAL] ?? BANNER_APPROVAL.requested;
              return (
                <div key={r.id} role="button" tabIndex={0} onClick={() => router.push(`/admin/banner-campaigns/${r.id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/admin/banner-campaigns/${r.id}`); }}
                  className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-white text-left ring-1 ring-black/[0.04] shadow-[0_1px_3px_rgba(20,22,40,0.05),0_10px_28px_rgba(20,22,40,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_6px_rgba(20,22,40,0.08),0_18px_42px_rgba(20,22,40,0.14)]">
                  <button type="button" title="삭제"
                    onClick={(e) => { e.stopPropagation(); setConfirmDel(r); }}
                    className="absolute right-2 top-2 z-10 hidden h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-400 shadow ring-1 ring-slate-200 backdrop-blur transition hover:text-rose-600 group-hover:flex">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <div className="flex aspect-[16/9] w-full items-center justify-center overflow-hidden bg-slate-100">
                    <BannerThumb preview={r.preview} />
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5 p-4">
                    <p className="line-clamp-1 text-[15px] font-bold text-slate-900 group-hover:text-indigo-600">{r.title}</p>
                    <p className="font-mono text-[11px] text-slate-400">{r.campaignCode}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <StatusPill label={ex.label} tone={ex.tone} />
                      <StatusPill label={ap.label} tone={ap.tone} />
                    </div>
                    {(() => {
                      const uniq = Array.from(new Map(r.usage.map((u) => [`${u.containerName}·${u.cornerName}`, u])).values());
                      if (uniq.length === 0) return null;
                      return (
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                          <MapPin className="h-3 w-3 shrink-0 text-indigo-400" /><span className="font-medium text-slate-600">노출 {uniq.length}곳</span>
                          <span className="truncate text-slate-400">· {uniq[0].containerName}</span>
                        </div>
                      );
                    })()}
                    <p className="mt-1 text-[11px] text-muted-foreground">{fmtPeriod(r.publishStart, r.publishEnd)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* 리스트형 뷰 */}
      {view === 'list' && (
      <div className="overflow-x-auto border-y border-slate-200 bg-white">
        <table className="w-full min-w-[1140px] text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-[12px] text-slate-600">
              <th className="w-14 px-4 py-2.5 text-center font-medium">NO.</th>
              <th className="px-4 py-2.5 text-left font-medium">배너캠페인 ID</th>
              <th className="w-24 px-4 py-2.5 text-left font-medium">썸네일</th>
              <th className="px-4 py-2.5 text-left font-medium">배너캠페인(타이틀)</th>
              <th className="w-24 px-4 py-2.5 text-left font-medium">전시여부</th>
              <th className="px-4 py-2.5 text-left font-medium">전시기간</th>
              <th className="px-4 py-2.5 text-left font-medium">노출 위치</th>
              <th className="w-24 px-4 py-2.5 text-left font-medium">승인상태</th>
              <th className="px-4 py-2.5 text-left font-medium">등록자</th>
              <th className="px-4 py-2.5 text-left font-medium">등록일시</th>
              <th className="px-4 py-2.5 text-left font-medium">수정자</th>
              <th className="px-4 py-2.5 text-left font-medium">수정일시</th>
              <th className="w-16 px-4 py-2.5 text-center font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={13} className="px-4 py-16 text-center text-muted-foreground">
                <div>조회된 배너 캠페인이 없습니다.</div>
                <div className="mt-1 text-[12px]">검색 조건을 설정하여 조회해주세요.</div>
              </td></tr>
            ) : paged.map((r, i) => {
              const ex = r.exposeYn ? BANNER_EXPOSE.true : BANNER_EXPOSE.false;
              const ap = BANNER_APPROVAL[r.approvalStatus as keyof typeof BANNER_APPROVAL] ?? BANNER_APPROVAL.requested;
              const no = filtered.length - ((pageSafe - 1) * PER_PAGE + i); // NO 내림차순(최신=큰 번호)
              return (
                <tr key={r.id} onClick={() => router.push(`/admin/banner-campaigns/${r.id}`)} className="cursor-pointer border-b last:border-b-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3 text-center text-slate-500">{no}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{r.campaignCode}</td>
                  <td className="px-4 py-2">
                    <div className="flex h-11 w-20 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                      <BannerThumb preview={r.preview} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{r.title}</td>
                  <td className="px-4 py-3"><StatusPill label={ex.label} tone={ex.tone} /></td>
                  <td className="px-4 py-3 text-[12px] text-slate-500">{fmtPeriod(r.publishStart, r.publishEnd)}</td>
                  <td className="px-4 py-3">
                    {(() => {
                      // 목록 요약 — 같은 전시화면·코너는 한 번만(템플릿 로그인/비로그인 중복 제거)
                      const uniq = Array.from(new Map(r.usage.map((u) => [`${u.containerName}·${u.cornerName}`, u])).values());
                      if (uniq.length === 0) return <span className="text-[12px] text-slate-400">미사용</span>;
                      return (
                        <div className="space-y-0.5">
                          {uniq.slice(0, 2).map((u, i) => (
                            <div key={i} className="flex items-center gap-1 text-[11.5px] text-slate-600">
                              <MapPin className="h-3 w-3 shrink-0 text-indigo-400" />
                              <span className="max-w-[150px] truncate" title={`${u.containerName} › ${u.cornerName}${u.sizeDetail ? ` › ${u.sizeDetail}` : ''}`}>
                                {u.containerName} <span className="text-slate-300">·</span> {u.cornerName}
                              </span>
                              {u.sizeDetail && <span className="shrink-0 rounded bg-indigo-50 px-1 py-0.5 text-[9.5px] font-medium text-indigo-600">{u.sizeDetail.split(' ')[0]}</span>}
                            </div>
                          ))}
                          {uniq.length > 2 && <span className="pl-4 text-[11px] text-slate-400">외 {uniq.length - 2}곳</span>}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3"><StatusPill label={ap.label} tone={ap.tone} /></td>
                  <td className="px-4 py-3 text-slate-600">{r.createdBy ?? '-'}</td>
                  <td className="px-4 py-3 text-[12px] text-slate-500">{fmtDateTime(r.createdAt)}</td>
                  <td className="px-4 py-3 text-slate-600">{r.updatedBy ?? '-'}</td>
                  <td className="px-4 py-3 text-[12px] text-slate-500">{fmtDateTime(r.updatedAt)}</td>
                  <td className="px-4 py-3 text-center">
                    <button type="button" title="삭제" onClick={(e) => { e.stopPropagation(); setConfirmDel(r); }}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-rose-50 hover:text-rose-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      {/* 페이지네이션 + 등록 */}
      <div className="flex items-center">
        {totalPages > 1 && (
          <div className="mx-auto flex items-center gap-1 text-sm">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)} className={'h-8 w-8 rounded-md ' + (p === pageSafe ? 'bg-indigo-600 font-semibold text-white' : 'text-slate-600 hover:bg-slate-100')}>{p}</button>
            ))}
          </div>
        )}
        <div className="ml-auto">
          <Button type="button" onClick={() => router.push('/admin/banner-campaigns/new')}>등록</Button>
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !deleting && setConfirmDel(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-600"><Trash2 className="h-4 w-4" /></span>
              <h3 className="text-[15px] font-bold text-slate-900">배너 캠페인 삭제</h3>
              <button type="button" onClick={() => !deleting && setConfirmDel(null)} className="ml-auto text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-[13px] leading-relaxed text-slate-600">
              <b className="text-slate-900">{confirmDel.title}</b> <span className="font-mono text-[11px] text-slate-400">({confirmDel.campaignCode})</span> 캠페인을 삭제할까요?<br />
              승인 이력도 함께 삭제되며 <b className="text-rose-600">되돌릴 수 없습니다.</b>
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" disabled={deleting} onClick={() => setConfirmDel(null)} className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">취소</button>
              <button type="button" disabled={deleting} onClick={doDelete} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-rose-600 px-4 text-[13px] font-semibold text-white hover:bg-rose-700 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />{deleting ? '삭제 중…' : '삭제'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
