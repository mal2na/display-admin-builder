'use client';

// SB BO-AIM-DSP-PG560 — 로밍국가 관리 목록
//   검색(로밍국가 상세 설정 여부 Radio / 대륙명 Select / 국가명·국가코드 Text) + 목록.
//   목록: No(내림차순), 국가명, 대륙명, 국가코드, 인접여행국 정보, 로밍국가 검색 허용 여부, 로밍국가 상세 설정 여부, 등록된 콘텐츠.
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { FilterPanel, ListHeader, ListBottom, THEAD_TR_CLS, TBODY_TR_CLS } from '@/components/ops-ui';
import { PageHeader } from '@/components/page-header';
import { CONTINENTS } from '@/lib/roaming';

export type RoamingRow = {
  id: string;
  nameKo: string;
  continent: string;
  countryCode: string;
  adjacentCountries: string | null;
  searchYn: boolean;
  detailYn: boolean;
  contents: string[]; // 등록된 콘텐츠 (국가정보, WCDMA, ...)
};

const PER_PAGE = 10;
const selectCls = 'sel';
const inputCls = 'inp';

type Filter = { detail: '전체' | 'Y' | 'N'; continent: string; q: string };
const DEFAULT: Filter = { detail: '전체', continent: '전체', q: '' };

export function RoamingList({ rows }: { rows: RoamingRow[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Filter>(DEFAULT);
  const [applied, setApplied] = useState<Filter>(DEFAULT);
  const [page, setPage] = useState(1);
  const set = (p: Partial<Filter>) => setDraft((d) => ({ ...d, ...p }));

  const filtered = useMemo(() => {
    const f = applied;
    return rows.filter((r) => {
      if (f.detail !== '전체' && (f.detail === 'Y') !== r.detailYn) return false;
      if (f.continent !== '전체' && r.continent !== f.continent) return false;
      if (f.q.trim()) {
        const q = f.q.trim().toLowerCase();
        if (!r.nameKo.toLowerCase().includes(q) && !r.countryCode.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, applied]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const curPage = Math.min(page, totalPages);
  const paged = filtered.slice((curPage - 1) * PER_PAGE, curPage * PER_PAGE);
  const doSearch = () => { setApplied(draft); setPage(1); };
  const doReset = () => { setDraft(DEFAULT); setApplied(DEFAULT); setPage(1); };

  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader trail={['운영관리', '로밍국가 관리']} title="로밍국가 관리" />

      {/* 검색 영역 (3) */}
      <div className="mt-6">
        <FilterPanel
          rows={[
            [
              ['로밍국가 상세 설정 여부', (
                <div key="d" className="flex items-center gap-4 text-[13px]">
                  {(['전체', 'Y', 'N'] as const).map((o) => (
                    <label key={o} className="flex items-center gap-1.5"><input type="radio" name="detail" checked={draft.detail === o} onChange={() => set({ detail: o })} className="accent-indigo-600" />{o}</label>
                  ))}
                </div>
              )],
              ['대륙명', <select key="c" value={draft.continent} onChange={(e) => set({ continent: e.target.value })} className={selectCls}>{['전체', ...CONTINENTS].map((o) => <option key={o}>{o}</option>)}</select>],
              ['국가명/국가코드', <input key="q" value={draft.q} onChange={(e) => set({ q: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && doSearch()} placeholder="국가명 또는 국가코드를 입력하세요" className={cn(inputCls, 'w-[260px]')} />],
            ],
          ]}
          onReset={doReset}
          onSearch={doSearch}
        />
      </div>

      <ListHeader title="조회 결과" count={filtered.length} />

      {/* 목록 (5) */}
      <div className="overflow-x-auto border-t border-[#dce0e5]">
        <table className="w-full min-w-[1080px] text-[13px] font-normal">
          <thead>
            <tr className={THEAD_TR_CLS}>
              {['No.', '국가명', '대륙명', '국가코드', '인접여행국 정보', '로밍국가 검색 허용 여부', '로밍국가 상세 설정 여부', '등록된 콘텐츠'].map((h) => (
                <th key={h} className={cn('h-11 px-3 font-normal whitespace-nowrap', h === '등록된 콘텐츠' || h === '인접여행국 정보' ? 'text-left' : 'text-center')}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-16 text-center text-slate-400">조회된 로밍국가가 없습니다.</td></tr>
            ) : paged.map((r, i) => {
              const no = filtered.length - ((curPage - 1) * PER_PAGE + i);
              return (
                <tr key={r.id} onClick={() => router.push(`/admin/roaming-countries/${r.id}`)} className={cn(TBODY_TR_CLS, 'cursor-pointer text-center')}>
                  <td className="h-11 px-3 tabular-nums text-slate-500">{no}</td>
                  <td className="h-11 px-3 font-medium text-slate-800">{r.nameKo}</td>
                  <td className="h-11 px-3 text-slate-600">{r.continent}</td>
                  <td className="h-11 px-3 tabular-nums text-slate-600">{r.countryCode}</td>
                  <td className="h-11 max-w-[200px] truncate px-3 text-left text-slate-600" title={r.adjacentCountries ?? ''}>{r.adjacentCountries ?? '-'}</td>
                  <td className="h-11 px-3 text-slate-600">{r.searchYn ? 'Y' : 'N'}</td>
                  <td className="h-11 px-3 text-slate-600">{r.detailYn ? 'Y' : 'N'}</td>
                  <td className="h-11 px-3 text-left text-slate-600">{r.contents.length ? r.contents.join(', ') : <span className="text-slate-400">없음</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ListBottom page={curPage} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
