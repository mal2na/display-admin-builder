'use client';
// 코너 유형 관리(혜택형) — 기존 매니저의 리스트/카드 스타일 재현, 혜택형 코너 유형만(2026-11-23 사용자 요청).
//  · 코너 유형 = 전부 '혜택형'(칩), 그 아래 한 뎁스(중분류: 텍스트) + 배열·레이아웃.
//  · 미리보기 = 풀셋(슬롯 구성) 1벌, 크기 고정(uniform). 테이블 좌우 보더 없음.
//  · 중분류 라이브 필터(칩 클릭 즉시 적용). 행 클릭 → 상세(/admin/corner-types/benefit/<key>).
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, LayoutGrid, List as ListIcon, Database, Lock, ChevronRight } from 'lucide-react';
import { BenefitCornerPreview } from './benefit-corner-preview';

export type BenefitTypeRow = {
  typeId: string;
  mid: string;        // 중분류 (혜택형 하위 뎁스)
  layout: string;     // 배열·레이아웃
  name: string;
  repImg: string | null; // (미사용 — 풀셋 미리보기로 대체)
  presetCount: number;
  source: string;     // 바라보는 원장
  presetKey: string;  // 상세 경로 key
  updatedBy: string;
  updatedAt: string;  // 'YYYY-MM-DD HH:mm'
  unused?: boolean;   // 안씀(미사용) — 바코드형 등
};

// 2026-11-24 SB DSP_03 최종 순서: 제휴사 → 이벤트 → 미션 → 혜택프로그램 → 이용지원.
const MID_ORDER = ['제휴사형', '이벤트형', '미션형', '혜택프로그램형', '이용지원형'];
// 중분류 텍스트 색상(칩 아님, 글자색만 구별).
const MID_TEXT: Record<string, string> = {
  '제휴사형': 'text-[#2E7AFF]',
  '미션형': 'text-[#D66400]',
  '이벤트형': 'text-[#6D28D9]',
  '혜택프로그램형': 'text-[#BE2063]',
  '이용지원형': 'text-[#0B8A75]',
};

export function BenefitTypeList({ rows }: { rows: BenefitTypeRow[] }) {
  const router = useRouter();
  const [view, setView] = useState<'card' | 'list'>('list');
  const [mid, setMid] = useState<string>('전체');   // 중분류 라이브 필터
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');

  const mids = useMemo(() => MID_ORDER.filter((m) => rows.some((r) => r.mid === m)), [rows]);
  const filtered = useMemo(() => rows.filter((r) => {
    if (mid !== '전체' && r.mid !== mid) return false;
    if (appliedQ) {
      const hay = `${r.typeId} ${r.mid} ${r.layout} ${r.name}`.toLowerCase();
      if (!hay.includes(appliedQ.toLowerCase())) return false;
    }
    return true;
  }), [rows, mid, appliedQ]);

  const reset = () => { setMid('전체'); setQ(''); setAppliedQ(''); };
  const open = (key: string) => router.push(`/admin/corner-types/benefit/${key}`);

  return (
    <>
      <nav className="mb-2 flex items-center gap-1.5 text-[14px] text-[#697582]">
        <span>홈</span><span>›</span><span>전시 관리</span><span>›</span>
        <span className="text-[#1a1a1a]">코너 유형 관리</span>
      </nav>
      <div className="flex flex-wrap items-center gap-2.5">
        <h1 className="text-[24px] font-bold leading-[32px] tracking-[-0.6px] text-[#1a1a1a]">코너 유형 관리</h1>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#eef0f6] px-2.5 py-0.5 text-[12px] font-bold text-[#697582]"><Lock className="h-3 w-3" />혜택형 · 조회 전용</span>
      </div>
      <p className="mb-5 mt-1 text-[14px] text-[#697582]">
        <b className="text-[#1a1a1a]">혜택형</b> 코너 유형 <b className="text-[#1a1a1a]">{rows.length}종</b>입니다. 코너 유형은 SB 프리셋 → FE 고정 개발물이라 여기서는 조회만 합니다. <Link href="/admin/corner-types?edit=1" className="font-medium text-[#3617ce] hover:underline">전체(레거시) 코너 유형</Link>은 백업에서 볼 수 있습니다.
      </p>

      {/* 검색 필터 패널 */}
      <div className="mb-5 rounded-[12px] bg-[#f8f9fb] p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2 text-[13px] text-[#454f59]">
              <span className="shrink-0 font-semibold">사용여부</span>
              {['전체', '사용', '미사용'].map((v, i) => (
                <label key={v} className="flex items-center gap-1.5"><input type="checkbox" defaultChecked={i < 2} className="h-4 w-4 accent-[#3617ce]" />{v}</label>
              ))}
            </div>
            <div className="flex items-center gap-2 text-[13px] text-[#454f59]">
              <span className="shrink-0 font-semibold">승인상태</span>
              {['전체', '승인완료', '승인요청', '반려', '임시저장'].map((v, i) => (
                <label key={v} className="flex items-center gap-1.5"><input type="checkbox" defaultChecked={i < 2} className="h-4 w-4 accent-[#3617ce]" />{v}</label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex flex-1 items-center gap-2 text-[13px] text-[#454f59]">
              <span className="w-[72px] shrink-0 font-semibold">직접 검색</span>
              <span className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b3b9c0]" />
                <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setAppliedQ(q)}
                  placeholder="코너 유형 ID · 유형명 · 레이아웃으로 검색"
                  className="h-[38px] w-full rounded-[6px] border border-[#c4c9cf] bg-white pl-9 pr-3 text-[14px] text-[#1a1a1a] outline-none focus:border-[#b3b9c0]" />
              </span>
            </label>
            <button onClick={reset} className="h-[38px] rounded-[6px] border border-[#c4c9cf] bg-white px-4 text-[14px] font-semibold text-[#454f59] hover:bg-[#f1f3f5]">초기화</button>
            <button onClick={() => setAppliedQ(q)} className="h-[38px] rounded-[6px] bg-[#3617ce] px-5 text-[14px] font-semibold text-white hover:bg-[#502dfb]">조회</button>
          </div>
        </div>
      </div>

      {/* 중분류 라이브 필터 — 클릭 즉시 적용(혜택형 하위) */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[13px] font-semibold text-[#697582]">중분류</span>
        {['전체', ...mids].map((m) => (
          <button key={m} onClick={() => setMid(m)}
            className={`rounded-full border px-3 py-1 text-[13px] font-semibold transition ${mid === m ? 'border-[#3617ce] bg-[#3617ce] text-white' : 'border-[#e3e6ea] bg-white text-[#454f59] hover:border-[#3617ce] hover:text-[#3617ce]'}`}>
            {m}
          </button>
        ))}
      </div>

      {/* 조회결과 헤더 + 보기 전환 */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-baseline gap-1">
          <h2 className="text-[20px] font-bold leading-[28px] tracking-[-0.6px] text-[#1a1a1a]">조회결과</h2>
          <span className="text-[14px] text-[#697582]">총 {filtered.length}건</span>
        </div>
        <div className="flex items-center gap-1 rounded-[8px] border border-[#dce0e5] bg-white p-0.5">
          {([['card', '카드', LayoutGrid], ['list', '리스트', ListIcon]] as const).map(([v, label, Icon]) => (
            <button key={v} onClick={() => setView(v)}
              className={`inline-flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-[13px] font-semibold transition ${view === v ? 'bg-[#3617ce] text-white' : 'text-[#697582] hover:bg-[#f1f3f5]'}`}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>
      </div>

      {/* 리스트 보기 — 테이블 좌우 보더 없음(위아래만) */}
      {view === 'list' && (
        <div className="border-y border-[#dce0e5] bg-white">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#dce0e5] bg-[#f8f9fb] text-[#697582]">
                <th className="w-14 px-3 py-2.5 text-left font-semibold">NO</th>
                <th className="px-3 py-2.5 text-left font-semibold">코너 유형 ID</th>
                <th className="w-52 px-3 py-2.5 text-center font-semibold">미리보기</th>
                <th className="px-3 py-2.5 text-left font-semibold">코너 유형</th>
                <th className="px-3 py-2.5 text-left font-semibold">중분류</th>
                <th className="px-3 py-2.5 text-left font-semibold">배열·레이아웃</th>
                <th className="w-20 px-3 py-2.5 text-left font-semibold">사용여부</th>
                <th className="w-28 px-3 py-2.5 text-left font-semibold">승인상태</th>
                <th className="px-3 py-2.5 text-left font-semibold">최근 수정자</th>
                <th className="px-3 py-2.5 text-left font-semibold">최근 수정일시</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="px-3 py-10 text-center text-[#8b949e]">검색 결과가 없습니다.</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.typeId} onClick={() => open(r.presetKey)}
                  className={`cursor-pointer border-b border-[#f1f3f5] last:border-0 hover:bg-[#f8f9fb] ${r.unused ? 'opacity-60' : ''}`}>
                  <td className="px-3 py-3 align-middle tabular-nums text-[#8b949e]">{i + 1}</td>
                  <td className="whitespace-nowrap px-3 py-3 align-middle font-mono text-[12px] text-[#697582]">{r.typeId}</td>
                  <td className="px-3 py-3">
                    {/* 미리보기 = 기존 코너 유형 관리와 동일한 렌더러, 크기 고정. 옅은 톤 배경으로 흰 카드가 잘 보이게. */}
                    <div className="flex justify-center rounded-[14px] bg-[#eceef5] p-3"><BenefitCornerPreview mid={r.mid} layout={r.layout} typeId={r.typeId} name={r.name} variant="list" image={r.repImg} /></div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 align-middle"><span className="inline-flex items-center rounded-md bg-[#FFE4EC] px-2 py-0.5 text-[12px] font-bold text-[#D6336C]">혜택형</span></td>
                  <td className={`whitespace-nowrap px-3 py-3 align-middle font-semibold ${MID_TEXT[r.mid] ?? 'text-[#454f59]'}`}>{r.mid}</td>
                  <td className="px-3 py-3 align-middle text-[#454f59]">{r.layout} <span className="ml-1 text-[12px] text-[#b3b9c0]">· 프리셋 {r.presetCount}</span></td>
                  <td className="px-3 py-3 align-middle">{r.unused
                    ? <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#8b949e]"><span className="h-1.5 w-1.5 rounded-full bg-[#b3b9c0]" />미사용</span>
                    : <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#0B8A75]"><span className="h-1.5 w-1.5 rounded-full bg-[#00a058]" />사용</span>}</td>
                  <td className="whitespace-nowrap px-3 py-3 align-middle">{r.unused
                    ? <span className="inline-flex items-center rounded-md border border-[#dce0e5] bg-[#f1f3f5] px-2 py-0.5 text-[12px] font-semibold text-[#8b949e]">안씀</span>
                    : <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[12px] font-semibold text-emerald-700">승인완료</span>}</td>
                  <td className="px-3 py-3 align-middle text-[#697582]">{r.updatedBy}</td>
                  <td className="px-3 py-3 align-middle text-[#8b949e]">{r.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 카드 보기 */}
      {view === 'card' && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(248px,1fr))] gap-4">
          {filtered.map((r) => (
            <button key={r.typeId} onClick={() => open(r.presetKey)}
              className="group flex flex-col overflow-hidden rounded-[14px] border border-[#e8ecef] bg-white text-left transition hover:-translate-y-0.5 hover:border-[#c9ccf7] hover:shadow-[0_10px_28px_rgba(20,22,40,0.10)]">
              <div className="flex justify-center bg-[#eef0f6] p-3"><BenefitCornerPreview mid={r.mid} layout={r.layout} typeId={r.typeId} name={r.name} variant="list" image={r.repImg} /></div>
              <div className="flex flex-1 flex-col gap-2 p-3.5">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center rounded-md bg-[#FFE4EC] px-2 py-0.5 text-[12px] font-bold text-[#D6336C]">혜택형</span>
                  <span className="text-[13px] font-semibold text-[#454f59]">{r.mid}</span>
                  <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-[#c4c9cf] group-hover:text-[#3617ce]" />
                </div>
                <p className="text-[14px] font-bold leading-tight text-[#1a1a1a] group-hover:text-[#3617ce]">{r.layout} <span className="text-[12px] font-normal text-[#b3b9c0]">· 프리셋 {r.presetCount}</span></p>
                <div className="flex items-center gap-2 text-[12px] text-[#8b949e]">
                  <span className="font-mono">{r.typeId}</span>
                  <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-700">승인완료</span>
                </div>
                <div className="inline-flex items-start gap-1.5 rounded-md border border-[#dce0e5] bg-[#f8f9fb] px-2 py-1 text-[12px] text-[#454f59]">
                  <Database className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8b949e]" />
                  <span className="[word-break:keep-all]"><span className="font-semibold text-[#697582]">원장</span> · {r.source}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
