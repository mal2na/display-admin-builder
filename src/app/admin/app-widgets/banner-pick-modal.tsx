'use client';

// SB BO-COMM-PU13 — 배너 캠페인 조회 팝업
//   배너캠페인 목록에서 1건 라디오 선택 → 적용. 검색(검색항목/검색어, 전시기간), 미리보기 썸네일.
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Pager, StatusPill } from '@/components/ops-ui';
import { fmtDateTime } from '@/lib/widget-taxonomy';
import { ImageIcon, X } from 'lucide-react';

export type BannerPick = {
  id: string;
  campaignCode: string;   // BC-202604-001
  title: string;          // 배너캠페인명
  thumbnailUrl: string | null;
  bannerAlt: string | null;
  exposeStatus: string;   // 전시예정 | 전시중 | 전시종료
  publishStart: string | null;
  publishEnd: string | null;
  // 적용 시 위젯배너정보로 넘길 값
  bgColorCode: string | null;
  landingType: string | null;
  landingUrl: string | null;
  pageType: string | null;
  statCode: string | null;
};

const STATUS_TONE: Record<string, string> = { 전시중: 'green', 전시예정: 'blue', 전시종료: 'slate' };
const PER_PAGE = 10;

function fmtDate(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

export function BannerPickModal({ banners, onClose, onApply }: { banners: BannerPick[]; onClose: () => void; onApply: (b: BannerPick) => void }) {
  const [field, setField] = useState<'전체' | '배너캠페인 ID' | '배너캠페인명'>('전체');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [applied, setApplied] = useState({ field: '전체', q: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const f = applied;
    return banners.filter((b) => {
      if (f.q.trim()) {
        const kw = f.q.trim().toLowerCase();
        const hay = f.field === '배너캠페인 ID' ? b.campaignCode : f.field === '배너캠페인명' ? b.title : `${b.campaignCode} ${b.title}`;
        if (!hay.toLowerCase().includes(kw)) return false;
      }
      if (f.from && (b.publishEnd ?? b.publishStart ?? '') < f.from) return false;
      if (f.to && (b.publishStart ?? b.publishEnd ?? '') > f.to + 'T23:59') return false;
      return true;
    });
  }, [banners, applied]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageSafe = Math.min(page, totalPages);
  const paged = filtered.slice((pageSafe - 1) * PER_PAGE, pageSafe * PER_PAGE);
  const selected = banners.find((b) => b.id === sel) ?? null;

  const doSearch = () => { setApplied({ field, q, from, to }); setPage(1); };
  const doReset = () => { setField('전체'); setQ(''); setFrom(''); setTo(''); setApplied({ field: '전체', q: '', from: '', to: '' }); setPage(1); };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/40 p-6" onClick={onClose}>
      <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[18px] font-bold text-slate-900">배너 캠페인 조회</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>

        {/* 검색 */}
        <div className="rounded-xl bg-[#f8f9fb] p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[13px] font-medium text-slate-600">검색 항목</span>
            <Select value={field} onChange={(e) => setField(e.target.value as typeof field)} className="h-9 w-40 text-sm">{['전체', '배너캠페인 ID', '배너캠페인명'].map((o) => <option key={o}>{o}</option>)}</Select>
            <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch()} placeholder="내용을 입력하세요" className="h-9 w-64 text-sm" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-[13px] font-medium text-slate-600">전시 기간</span>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-40 text-sm" />
            <span className="text-slate-400">-</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-40 text-sm" />
            <div className="ml-auto flex gap-2">
              <Button type="button" variant="outline" onClick={doReset}>초기화</Button>
              <Button type="button" onClick={doSearch}>조회</Button>
            </div>
          </div>
        </div>

        {/* 결과 */}
        <div className="mt-4 flex items-center gap-1.5 text-[14px]">
          <span className="font-bold text-slate-900">조회 결과</span>
          <span className="text-slate-400">총 {filtered.length}건</span>
        </div>
        <div className="mt-2 max-h-[46vh] overflow-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead className="sticky top-0 bg-[#f8f9fb]">
              <tr className="text-[12px] text-slate-600">
                <th className="w-14 px-3 py-2.5 text-center font-medium">선택</th>
                <th className="w-20 px-3 py-2.5 text-center font-medium">미리보기</th>
                <th className="px-3 py-2.5 text-left font-medium">배너 캠페인 ID</th>
                <th className="px-3 py-2.5 text-left font-medium">배너 캠페인명</th>
                <th className="w-24 px-3 py-2.5 text-center font-medium">전시 상태</th>
                <th className="px-3 py-2.5 text-left font-medium">전시 기간</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-10 text-center text-slate-400">조회된 배너 캠페인이 없습니다.</td></tr>
              ) : paged.map((b) => (
                <tr key={b.id} onClick={() => setSel(b.id)} className={`cursor-pointer border-t border-slate-100 hover:bg-[#f5f6ff] ${sel === b.id ? 'bg-[#f1f2ff]' : ''}`}>
                  <td className="px-3 py-2 text-center"><input type="radio" checked={sel === b.id} onChange={() => setSel(b.id)} className="accent-indigo-600" /></td>
                  <td className="px-3 py-2">
                    <div className="mx-auto flex h-9 w-14 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50">
                      {b.thumbnailUrl ? <img src={b.thumbnailUrl} alt="" className="max-h-full max-w-full object-contain" /> : <ImageIcon className="h-4 w-4 text-slate-300" />}
                    </div>
                  </td>
                  <td className="px-3 py-2 tabular-nums text-slate-600">{b.campaignCode}</td>
                  <td className="px-3 py-2 text-slate-800">{b.title}</td>
                  <td className="px-3 py-2 text-center"><StatusPill label={b.exposeStatus} tone={STATUS_TONE[b.exposeStatus] ?? 'slate'} /></td>
                  <td className="px-3 py-2 text-slate-500">{fmtDate(b.publishStart)} ~ {fmtDate(b.publishEnd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3"><Pager page={pageSafe} totalPages={totalPages} onChange={setPage} /></div>

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>닫기</Button>
          <Button type="button" disabled={!selected} onClick={() => selected && onApply(selected)}>적용</Button>
        </div>
      </div>
    </div>
  );
}
