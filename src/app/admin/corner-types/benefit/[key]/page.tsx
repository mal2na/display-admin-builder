// 혜택형 코너 유형 상세 — 기존 코너 유형 관리 상세와 동일 레이아웃(좌측 sticky 미리보기 340 + 우측 코너 기본 정보).
//  조회 전용. 데이터 = benefit-corner-types(SSOT) → 프리셋 PNG 설계도 노출. 2026-11-23.
import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Database, Lock, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { benefitTypeByKey, cornerAttrSpec, benefitGuide, operModeOf } from '@/lib/benefit-corner-types';
import { presetDesignName } from '@/components/preview/preset-design-card';
import { BenefitCornerPreview } from '../../benefit-corner-preview';
import { Collapse } from './collapse';

export const dynamic = 'force-dynamic';

function imgSrc(id: string): string {
  try {
    const st = fs.statSync(path.join(process.cwd(), 'public/assets/preset-images', `${id}.png`));
    return `/assets/preset-images/${id}.png?v=${Math.floor(st.mtimeMs)}`;
  } catch {
    return `/assets/preset-images/${id}.png`;
  }
}

const CHIP = 'inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-bold';

// 상세 읽기 테이블 — 공용 FieldRow(ops-ui) 규격과 동일(2026-11-25 사용자 요청: '하단 CTA 정보' 레퍼런스).
//  라벨 셀 톤 #f8f9fb + ink2(#454f59)·140px, 행마다 border-b #dce0e5. 세로 보더(border-r) 없음 — 라벨 톤으로만 구분.
const CELL_L = 'flex items-center whitespace-nowrap bg-[#f8f9fb] px-4 py-3 font-medium text-[#454f59]';
const CELL_V = 'flex min-w-0 items-center px-4 py-2.5 text-[#1a1a1a]';
// 4열(라벨|값|라벨|값) — 짧은 필드 2개를 한 행에. 세로 보더 없음.
function Row2({ l1, v1, l2, v2 }: { l1: string; v1: React.ReactNode; l2: string; v2: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_minmax(0,1fr)_140px_minmax(0,1fr)] items-stretch border-b border-[#dce0e5] text-[14px]">
      <div className={CELL_L}>{l1}</div>
      <div className={CELL_V}>{v1}</div>
      <div className={CELL_L}>{l2}</div>
      <div className={CELL_V}>{v2}</div>
    </div>
  );
}
// 2열(라벨|값) — 긴 필드 전체 폭. 세로 보더 없음.
function RowFull({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_minmax(0,1fr)] items-stretch border-b border-[#dce0e5] text-[14px]">
      <div className={`${CELL_L} items-start`}>{label}</div>
      <div className={`${CELL_V} items-start`}>{children}</div>
    </div>
  );
}

// 배너형·업무진입형·홈형 조회 전용 상세 — 혜택형 프리셋이 아닌 공통 유형. 레이아웃은 혜택형(event-list) 메인 상세와 동일(2026-11-26 사용자 요청).
const SPECIAL_TYPES: Record<string, { typeId: string; top: string; mid: string; layout: string; oper: string; source: string; desc: string; pager?: boolean; kind: 'banner' | 'tab' | 'home'; big?: boolean }> = {
  'banner-single': { typeId: 'CYB001', top: '배너형', mid: '배너형', layout: '단수형', oper: '개인화/수동', source: '배너 캠페인 관리', desc: '배너 1개를 노출합니다. 소재·문구·랜딩은 배너 캠페인 관리에서 가져옵니다.', kind: 'banner' },
  'banner-multi': { typeId: 'CYB002', top: '배너형', mid: '배너형', layout: '복수형', oper: '개인화/수동', source: '배너 캠페인 관리', desc: '여러 배너(최대 10개)를 스와이프로 노출합니다(하단 1/N). 노출 순서 = 등록 순서대로 또는 개인화 순서(2026-11-26 회의: 동일 순번 추천은 폐기). 비로그인은 등록 순서.', pager: true, kind: 'banner' },
  'tab-swipe': { typeId: 'CYW001', top: '업무 진입형', mid: '퀵메뉴형', layout: '스와이프형', oper: '개인화/수동', source: '-', desc: '상단 진입 퀵메뉴. 아이콘+라벨 칩을 가로 스와이프로 노출합니다. 운영자 최대 12개 등록, 2번째 고정 + 개인화(Max 5) + 후순위 교체(2026-11-26 회의).', kind: 'tab' },
  'home-rec': { typeId: 'CYM001', top: '홈형', mid: '추천형', layout: '추천 카드 + 질의어', oper: '개인화', source: '어드민 · CVM 추천 + 추천 질의어 풀', desc: '메인 홈 상단. 인사말 + 추천 카드 + 추천 질의어 칩을 노출합니다. CVM 추천과 추천 질의어 풀에서 채웁니다.', kind: 'home' },
  'home-banner': { typeId: 'CYM002', top: '홈형', mid: '추천형', layout: '배너 확장형', oper: '개인화', source: '배너 캠페인 관리', desc: '메인 홈 상단. 말풍선 없이 큰 배너로 확장 노출합니다. 소재는 배너 캠페인 관리에서 가져옵니다.', kind: 'home', big: true },
};

// 코너 유형(top) → 칩 톤(코너 유형 리스트 TOP_TONE과 동일).
const SPECIAL_CHIP: Record<string, string> = {
  '배너형': 'bg-[#E6F0FF] text-[#2E6FF2]', '업무 진입형': 'bg-[#EAF7F0] text-[#0B8A75]', '홈형': 'bg-[#F2ECFB] text-[#6D28D9]',
};

function GenericTypeDetail({ sp }: { sp: (typeof SPECIAL_TYPES)[string] }) {
  const Preview = sp.kind === 'banner' ? (
    <div className="mx-auto w-full max-w-[320px] rounded-[18px] border border-[#e3e6ea] bg-white p-4">
      <div className="flex items-start gap-3">
        <p className="min-w-0 flex-1 text-[15px] font-bold leading-snug text-[#8b949e]">배너 타이틀</p>
        <div className="h-14 w-14 shrink-0 rounded-[10px] bg-gradient-to-br from-[#e7eaf1] to-[#d7dce6]" />
      </div>
      {sp.pager && (
        <div className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-[#8b949e]">
          <ChevronLeft className="h-3 w-3" /><span className="text-[#454f59]">1</span><span>/ 10</span><ChevronRight className="h-3 w-3" />
        </div>
      )}
    </div>
  ) : sp.kind === 'home' ? (
    /* 홈형 — ① 추천 카드 + 질의어 묶음(인사말·카드·질의어 칩 2개) ② 배너 확장형(말풍선 없이 큰 배너). */
    <div className="mx-auto w-full max-w-[320px] rounded-[18px] border border-[#e3e6ea] bg-white p-4">
      {sp.big ? (
        <div className="flex h-[132px] items-center justify-center rounded-[14px] bg-gradient-to-br from-[#e7eaf1] to-[#d7dce6] text-[12px] font-semibold text-[#8b949e]">Banner</div>
      ) : (
        <>
          <p className="text-[12px] font-medium text-[#8b949e]">Greeting</p>
          <div className="mt-2 flex items-center gap-3 rounded-[14px] bg-[#f4f5fb] p-3">
            <div className="h-11 w-11 shrink-0 rounded-[10px] bg-gradient-to-br from-[#e7eaf1] to-[#d7dce6]" />
            <div className="min-w-0 flex-1 space-y-1.5"><span className="block h-2.5 w-3/4 rounded-full bg-[#dce0e5]" /><span className="block h-2.5 w-1/2 rounded-full bg-[#e8ecef]" /></div>
          </div>
          <div className="mt-3 flex gap-1.5">
            {['Query', 'Query'].map((q, i) => <span key={i} className="rounded-full border border-[#dce0e5] bg-white px-2.5 py-1 text-[11px] font-medium text-[#8b949e]">{q}</span>)}
          </div>
        </>
      )}
    </div>
  ) : (
    /* 업무 진입형(상단 퀵메뉴) — 최대 12개(2행×6). 라벨은 껍데기(필드 코드)라 'menu'. */
    <div className="mx-auto w-full max-w-[320px] rounded-[18px] bg-[#eef0ff] p-4">
      <div className="grid grid-cols-6 gap-x-1.5 gap-y-3">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className="h-8 w-8 rounded-full bg-white shadow-sm" />
            <span className="text-[10px] font-medium leading-none text-[#8b949e]">menu</span>
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <div className="px-12 py-9 pb-28">
      {/* 헤더 — 혜택형 상세와 동일(브레드크럼 + '코너 유형 상세' + 조회 전용). */}
      <nav className="mb-2 flex items-center gap-1.5 text-[14px] text-[#697582]">
        <span>홈</span><span>›</span><span>전시 관리</span><span>›</span>
        <Link href="/admin/corner-types" className="hover:text-[#3617ce]">코너 유형 관리</Link><span>›</span>
        <span className="text-[#1a1a1a]">코너 유형 상세</span>
      </nav>
      <div className="mb-6 flex flex-wrap items-center gap-2.5">
        <h1 className="text-[24px] font-bold leading-[32px] tracking-[-0.6px] text-[#1a1a1a]">코너 유형 상세</h1>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#eef0f6] px-2.5 py-0.5 text-[12px] font-bold text-[#697582]"><Lock className="h-3 w-3" />조회 전용</span>
      </div>
      {/* 미리보기(좌·고정폭 340·sticky) + 코너 기본 정보(우·콜랩스) — 혜택형 상세와 동일. */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="w-[340px] max-w-full shrink-0 self-start lg:sticky lg:top-3">
          <div className="mb-2.5 flex items-center gap-2 px-1">
            <span className="text-[14px] font-bold text-[#1a1a1a]">코너 유형 미리보기</span>
          </div>
          <div className="flex justify-center rounded-[20px] bg-[#eceef5] p-6">{Preview}</div>
        </div>

        <div className="min-w-0 flex-1 space-y-6">
          <Collapse title="코너 기본 정보">
            <div className="px-5 pb-5 pt-4">
             <div className="border-t border-[#dce0e5]">
              <Row2
                l1="코너 유형 ID" v1={<span className="font-mono text-[13px] text-[#454f59]">{sp.typeId}</span>}
                l2="코너 유형" v2={<span className={`${CHIP} ${SPECIAL_CHIP[sp.top] ?? 'bg-[#EAF7F0] text-[#0B8A75]'}`}>{sp.top}</span>} />
              <Row2
                l1="코너 구분" v1={<span className="text-[#454f59]">{sp.mid.replace(/형$/, '')}</span>}
                l2="배열·레이아웃" v2={<span className="text-[#454f59]">{sp.layout}</span>} />
              <Row2
                l1="사용 여부" v1={<span className="text-[#1a1a1a]">Y</span>}
                l2="운영 규칙" v2={<span className="text-[#454f59]">{sp.oper}</span>} />
              <RowFull label="노출 규격"><span className="text-[14px] leading-relaxed text-[#1a1a1a] [word-break:keep-all]">{sp.desc}</span></RowFull>
              <RowFull label="원장 정보"><span className="text-[14px] text-[#1a1a1a] [word-break:keep-all]">{sp.source}</span></RowFull>
              <RowFull label="등록일"><span className="text-[#454f59]">2026.11.23 10:21</span></RowFull>
             </div>
            </div>
          </Collapse>
          <p className="flex items-start gap-1.5 rounded-[8px] bg-[#f8f9fb] px-3 py-2.5 text-[13px] leading-relaxed text-[#697582]">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#8b949e]" />
            <span>코너 유형은 SB 프리셋 → FE 고정 개발물이라 여기서는 조회만 합니다.</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function BenefitCornerTypeDetailPage({ params }: { params: { key: string } }) {
  const key = decodeURIComponent(params.key);
  const sp = SPECIAL_TYPES[key];
  if (sp) return <GenericTypeDetail sp={sp} />;
  const t = benefitTypeByKey(key);
  if (!t) notFound();

  return (
    <div className="px-12 py-9 pb-28">
      {/* 헤더 — SB Figma(node 29305-82718): 브레드크럼 + '코너 유형 상세'(2026-11-26 사용자 요청). */}
      <nav className="mb-2 flex items-center gap-1.5 text-[14px] text-[#697582]">
        <span>홈</span><span>›</span><span>전시 관리</span><span>›</span>
        <Link href="/admin/corner-types" className="hover:text-[#3617ce]">코너 유형 관리</Link><span>›</span>
        <span className="text-[#1a1a1a]">코너 유형 상세</span>
      </nav>
      <div className="mb-6 flex flex-wrap items-center gap-2.5">
        <h1 className="text-[24px] font-bold leading-[32px] tracking-[-0.6px] text-[#1a1a1a]">코너 유형 상세</h1>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#eef0f6] px-2.5 py-0.5 text-[12px] font-bold text-[#697582]"><Lock className="h-3 w-3" />조회 전용</span>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="w-[340px] max-w-full shrink-0 self-start lg:sticky lg:top-3">
          <div className="mb-2.5 flex items-center gap-2 px-1">
            <span className="text-[14px] font-bold text-[#1a1a1a]">코너 유형 미리보기</span>
          </div>
          <div className="flex justify-center rounded-[20px] bg-[#eceef5] p-6">
            <BenefitCornerPreview mid={t.mid} layout={t.layout} typeId={t.typeId} name={t.name} variant="detail" image={t.presetIds[0] ? imgSrc(t.presetIds[0]) : null} />
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-6">
          <Collapse title="코너 기본 정보">
            <div className="px-5 pb-5 pt-4">
             <div className="border-t border-[#dce0e5]">
              {/* SB Figma(node 29305-82718) 필드·워딩 — 코너 구분/배열·레이아웃/사용여부/운영규칙/노출규격/DB원장 정보/등록일. 값은 plain 텍스트(2026-11-26 사용자 요청). */}
              <Row2
                l1="코너 유형 ID" v1={<span className="font-mono text-[13px] text-[#454f59]">{t.typeId}</span>}
                l2="코너 유형" v2={<span className={`${CHIP} bg-[#EAF7F0] text-[#0B8A75]`}>혜택형</span>} />
              <Row2
                l1="코너 구분" v1={<span className="text-[#454f59]">{t.mid.replace(/형$/, '')}</span>}
                l2="배열·레이아웃" v2={<span className="text-[#454f59]">{t.layout.replace(/형$/, '')}</span>} />
              <Row2
                l1="사용 여부" v1={<span className="text-[#1a1a1a]">{t.unused ? 'N' : 'Y'}</span>}
                l2="운영 규칙" v2={<span className="text-[#454f59]">{operModeOf(t.mid, t.layout)}</span>} />
              <RowFull label="노출 규격"><span className="text-[14px] leading-relaxed text-[#1a1a1a] [word-break:keep-all]">{benefitGuide(t.mid, t.layout)}</span></RowFull>
              <RowFull label="원장 정보"><span className="text-[14px] text-[#1a1a1a] [word-break:keep-all]">{t.source}</span></RowFull>
              <RowFull label="등록일"><span className="text-[#454f59]">2026.11.23 10:21</span></RowFull>
             </div>
            </div>
          </Collapse>

          {/* 코너 속성 / 컴포넌트 요소 — 기획(SB DSP_03) 기준 On/Off 가능 항목 + 의존 규칙(2026-11-24). 실제 On/Off는 전시 빌더에서. */}
          {(() => {
            const spec = cornerAttrSpec(t.mid, t.layout);
            type Attr = typeof spec.card[number];
            // 코드 → SB Figma(29305-82718) 라벨. 값은 Y로 단순 표기(2026-11-26 사용자 요청: On/Off 배지·툴팁 제거).
            const FIG: Record<string, string> = {
              Image: '상단 이미지', ContextHeader: '추천 안내 문구', CornerTitle: '코너 타이틀', LandingLink: '코너 랜딩 링크 버튼',
              Information: '추가 인포메이션', ActionButton: '하단 CTA', Barcode: '바코드',
              Category: '카테고리 탭', Thumbnail: '컴포넌트 이미지', ItemTitle: '컴포넌트 타이틀', ItemDesc: '컴포넌트 내용', ItemLink: '상세 링크',
              Price: '가격', DiscountRate: '할인율', ItemButton: '우측 버튼',
              Attendance: '출석 진행', Reward: '보상 아이템', RewardButton: '받기 버튼', EntryMetric: '응모 기회',
            };
            // 값 = 필수(항상 노출) / ON·OFF(빌더에서 운영자가 끄고 켬). '필수값 마킹'이 곧 required(2026-11-26 사용자 요청).
            const Cell = ({ a }: { a: Attr | null }) => a ? (<>
              <div className="flex items-center whitespace-nowrap bg-[#f8f9fb] px-4 py-3 text-[14px] font-medium text-[#454f59]">{FIG[a.code] ?? a.label}</div>
              <div className="flex min-w-0 items-center px-4 py-3 text-[14px]">
                {a.state === 'required'
                  ? <span className="inline-flex items-center rounded-md bg-[#fdecee] px-2 py-0.5 text-[12px] font-bold text-[#cf2a3c]">필수</span>
                  : <span className="inline-flex items-center rounded-md bg-[#eef0f4] px-2 py-0.5 text-[12px] font-semibold text-[#697582]">ON · OFF</span>}
              </div>
            </>) : <><div /><div /></>;
            // 2열 페어 행 — 라벨|값|라벨|값(세로 보더 없음). 홀수면 뒤칸 비움.
            const PairRows = ({ list }: { list: Attr[] }) => (<>
              {Array.from({ length: Math.ceil(list.length / 2) }, (_, i) => (
                <div key={i} className="grid grid-cols-[140px_minmax(0,1fr)_140px_minmax(0,1fr)] items-stretch border-b border-[#dce0e5]">
                  <Cell a={list[i * 2]} />
                  <Cell a={list[i * 2 + 1] ?? null} />
                </div>
              ))}
            </>);
            // 그룹 구분 — 코너 카드 / 컴포넌트(Figma 워딩).
            const GroupBar = ({ title }: { title: string }) => (
              <div className="px-1 pb-2.5 pt-6 text-[13px] font-bold text-[#1a1a1a] first:pt-0">{title}</div>
            );
            return (
              <Collapse title="코너 속성 정보">
                <div className="px-5 pb-5 pt-4">
                  <GroupBar title="코너 카드" />
                  <div className="border-t border-[#dce0e5]"><PairRows list={spec.card} /></div>
                  {spec.item.length > 0 && (
                    <>
                      <GroupBar title="컴포넌트" />
                      <div className="border-t border-[#dce0e5]"><PairRows list={spec.item} /></div>
                    </>
                  )}
                </div>
              </Collapse>
            );
          })()}

          {/* 등록된 프리셋 — 이 유형에 묶인 프리셋 목록 */}
          <Collapse title="등록된 프리셋" hint={`${t.presetIds.length}개`}>
            <div className="flex items-center px-4 pt-3">
              <Link href={`/admin/corner-types/preset#${t.presetKey}`} className="ml-auto text-[13px] font-medium text-[#3617ce] hover:underline">프리셋 페이지에서 보기 ›</Link>
            </div>
            {/* 균일 타일 — 고정 비율 사각형 프레임 안에 이미지 '전체'를 object-contain으로(잘림 없이). 높이 균일 + 전체 노출. */}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4 px-4 pb-4 pt-2">
              {t.presetIds.map((id) => (
                <figure key={id} className="flex flex-col gap-2">
                  <div className="flex aspect-[5/8] items-center justify-center overflow-hidden rounded-[14px] border border-[#e8ecef] bg-white p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {/* 보더 2겹 — 균일 타일 프레임(영역) + 프리셋 이미지 자신(실제 크기)에 각각. 프리셋끼리 크기가 달라 보이는 문제 방지(2026-11-26 사용자 요청). */}
                    <img src={imgSrc(id)} alt={presetDesignName(id)} className="max-h-full max-w-full rounded-[10px] border border-[#dce0e5] object-contain" />
                  </div>
                  <figcaption className="px-0.5 text-[12px] leading-tight [word-break:keep-all]">
                    <span className="font-medium text-[#454f59]">{presetDesignName(id)}</span>
                    <span className="ml-1 text-[#b3b9c0]">{id}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </Collapse>
        </div>
      </div>
    </div>
  );
}
