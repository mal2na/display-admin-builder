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

// 배너형·탭형 조회 전용 상세 — 혜택형 프리셋이 아니라 공통 유형이라 간이 상세(미리보기 + 기본 정보)로 렌더(2026-11-25 사용자 요청).
const SPECIAL_TYPES: Record<string, { top: string; mid: string; layout: string; source: string; desc: string; pager?: boolean; kind: 'banner' | 'tab' }> = {
  'banner-single': { top: '배너형', mid: '배너형', layout: '단수형', source: '배너 캠페인 관리', desc: '배너 1개를 노출합니다. 소재·문구·랜딩은 배너 캠페인 관리에서 가져옵니다.', kind: 'banner' },
  'banner-multi': { top: '배너형', mid: '배너형', layout: '복수형', source: '배너 캠페인 관리', desc: '여러 배너(최대 10개)를 스와이프로 노출합니다(하단 1/N). 노출 순서 = 등록 순서대로 또는 개인화 순서(2026-11-26 회의: 동일 순번 추천은 폐기). 비로그인은 등록 순서.', pager: true, kind: 'banner' },
  'tab-swipe': { top: '업무 진입형', mid: '퀵메뉴형', layout: '스와이프형', source: '-', desc: '상단 진입 퀵메뉴. 아이콘+라벨 칩을 가로 스와이프로 노출합니다.', kind: 'tab' },
};

function GenericTypeDetail({ sp }: { sp: (typeof SPECIAL_TYPES)[string] }) {
  const Preview = sp.kind === 'banner' ? (
    <div className="mx-auto w-full max-w-[320px] rounded-[18px] border border-[#e3e6ea] bg-white p-4 shadow-[0_2px_12px_rgba(20,22,40,0.08)]">
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
  ) : (
    /* 탭형(상단 퀵메뉴) — 운영자가 최대 12개 등록 → 위아래 2행×6개가 모두 보이게 아이콘 타일 그리드(잘림 없음, 2026-11-25 사용자 요청). 라벨은 껍데기(필드 코드)라 'menu'. */
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
      <nav className="mb-2 flex items-center gap-1.5 text-[14px] text-[#697582]">
        <span>홈</span><span>›</span><span>전시 관리</span><span>›</span>
        <Link href="/admin/corner-types" className="hover:text-[#3617ce]">코너 유형 관리</Link><span>›</span>
        <span className="text-[#1a1a1a]">{sp.mid} · {sp.layout}</span>
      </nav>
      <Link href="/admin/corner-types" className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-[#697582] hover:text-[#3617ce]">
        <ChevronLeft className="h-4 w-4" /> 목록으로
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-2.5">
        <h1 className="text-[24px] font-bold leading-[32px] tracking-[-0.6px] text-[#1a1a1a]">{sp.top} &gt; {sp.mid} &gt; {sp.layout}</h1>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#eef0f6] px-2.5 py-0.5 text-[12px] font-bold text-[#697582]"><Lock className="h-3 w-3" />조회 전용</span>
      </div>
      {/* 미리보기(좌·고정폭 340·sticky) + 코너 기본 정보(우·콜랩스) — 혜택형 상세와 동일 레이아웃(2026-11-25 사용자 요청). */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="w-[340px] max-w-full shrink-0 self-start lg:sticky lg:top-3">
          <div className="mb-2.5 flex items-center gap-2 px-1">
            <span className="text-[13px] font-bold text-[#454f59]">코너 미리보기</span>
            <span className="text-[12px] text-[#b3b9c0]">껍데기(필드 코드)</span>
          </div>
          <div className="flex justify-center rounded-[20px] bg-[#eceef5] p-6">{Preview}</div>
        </div>

        <div className="min-w-0 flex-1 space-y-6">
          <Collapse title="코너 기본 정보">
            <div className="px-5 pb-5 pt-4">
             <div className="">
              <Row2 l1="코너 유형" v1={<span className={`${CHIP} ${sp.top === '배너형' ? 'bg-[#E6F0FF] text-[#2E6FF2]' : 'bg-[#EAF7F0] text-[#0B8A75]'}`}>{sp.top}</span>} l2="중분류" v2={<span className="text-[#454f59]">{sp.mid}</span>} />
              <Row2 l1="배열·레이아웃" v1={<span className="text-[#454f59]">{sp.layout}</span>} l2="원장" v2={
                <span className="inline-flex items-center gap-1.5 rounded-md border border-[#dce0e5] bg-[#f8f9fb] px-2 py-1 text-[13px] text-[#454f59]">
                  <Database className="h-3.5 w-3.5 shrink-0 text-[#8b949e]" /><span className="[word-break:keep-all]">{sp.source}</span>
                </span>} />
              <RowFull label="설명"><span className="text-[14px] leading-relaxed text-[#1a1a1a] [word-break:keep-all]">{sp.desc}</span></RowFull>
              <Row2
                l1="사용여부" v1={<span className="inline-flex items-center gap-1 font-semibold text-[#0B8A75]"><span className="h-1.5 w-1.5 rounded-full bg-[#00a058]" />사용</span>}
                l2="등록일시" v2={<span className="text-[#697582]">2026-11-23 10:21</span>} />
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
      <nav className="mb-2 flex items-center gap-1.5 text-[14px] text-[#697582]">
        <span>홈</span><span>›</span><span>전시 관리</span><span>›</span>
        <Link href="/admin/corner-types" className="hover:text-[#3617ce]">코너 유형 관리</Link><span>›</span>
        <span className="text-[#1a1a1a]">{t.name}</span>
      </nav>

      <Link href="/admin/corner-types" className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-[#697582] hover:text-[#3617ce]">
        <ChevronLeft className="h-4 w-4" /> 목록으로
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-2.5">
        <h1 className="text-[24px] font-bold leading-[32px] tracking-[-0.6px] text-[#1a1a1a]">혜택형 &gt; {t.mid} &gt; {t.layout}</h1>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#eef0f6] px-2.5 py-0.5 text-[12px] font-bold text-[#697582]"><Lock className="h-3 w-3" />조회 전용</span>
        <span className="font-mono text-[12px] text-[#b3b9c0]">{t.typeId}</span>
      </div>

      {/* 미리보기(좌·고정폭 340·sticky) + 코너 기본 정보(우) */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="w-[340px] max-w-full shrink-0 self-start lg:sticky lg:top-3">
          {/* 라벨 + 톤 트레이 1개 안에 카드 1개 — 흰 보더 박스 중첩 제거(라운드 1겹) */}
          <div className="mb-2.5 flex items-center gap-2 px-1">
            <span className="text-[13px] font-bold text-[#454f59]">코너 미리보기</span>
            <span className="text-[12px] text-[#b3b9c0]">껍데기(필드 코드)</span>
          </div>
          <div className="flex justify-center rounded-[20px] bg-[#eceef5] p-6">
            <BenefitCornerPreview mid={t.mid} layout={t.layout} typeId={t.typeId} name={t.name} variant="detail" image={t.presetIds[0] ? imgSrc(t.presetIds[0]) : null} />
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-6">
          <Collapse title="코너 기본 정보">
            <div className="px-5 pb-5 pt-4">
             <div className="">
              <Row2
                l1="코너 유형 ID" v1={<span className="font-mono text-[13px] text-[#454f59]">{t.typeId}</span>}
                l2="코너 유형" v2={<span className={`${CHIP} bg-[#FFE4EC] text-[#D6336C]`}>혜택형</span>} />
              <Row2
                l1="중분류" v1={<span className="text-[#454f59]">{t.mid}</span>}
                l2="배열·레이아웃" v2={t.layout} />
              <RowFull label="운영여부">{(() => {
                const oper = operModeOf(t.mid, t.layout);
                const canP = oper !== '수동';
                return (
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-bold ${canP ? 'bg-[#F2ECFB] text-[#6D28D9]' : 'bg-[#eef0f2] text-[#697582]'}`}>{oper}</span>
                    <span className="text-[12px] text-[#b3b9c0]">{canP ? '개인화 영역·운영 영역 등록 가능' : '운영 영역만 (개인화 영역 불가)'}</span>
                  </span>
                );
              })()}</RowFull>
              <RowFull label="노출 규격">
                <span className="inline-flex items-start gap-1.5 rounded-md border border-[#dbe4ff] bg-[#f3f6ff] px-2.5 py-1.5 text-[13px] leading-snug text-[#3b4a66] [word-break:keep-all]">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3617ce]" />{benefitGuide(t.mid, t.layout)}
                </span>
              </RowFull>
              <RowFull label="바라보는 원장">
                <span className="inline-flex items-start gap-1.5 rounded-md border border-[#dce0e5] bg-[#f8f9fb] px-2 py-1 text-[13px] text-[#454f59]">
                  <Database className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8b949e]" /><span className="[word-break:keep-all]">{t.source}</span>
                </span>
              </RowFull>
              <Row2
                l1="사용여부" v1={t.unused
                  ? <span className="inline-flex items-center gap-1.5 font-semibold text-[#8b949e]"><span className="h-1.5 w-1.5 rounded-full bg-[#b3b9c0]" />미사용 <span className="text-[12px] font-normal text-[#b3b9c0]">· Figma 미포함</span></span>
                  : <span className="inline-flex items-center gap-1 font-semibold text-[#0B8A75]"><span className="h-1.5 w-1.5 rounded-full bg-[#00a058]" />사용</span>}
                l2="등록일시" v2={<span className="text-[#697582]">2026-11-23 10:21</span>} />
             </div>
            </div>
          </Collapse>

          {/* 코너 속성 / 컴포넌트 요소 — 기획(SB DSP_03) 기준 On/Off 가능 항목 + 의존 규칙(2026-11-24). 실제 On/Off는 전시 빌더에서. */}
          {(() => {
            const spec = cornerAttrSpec(t.mid, t.layout);
            const Tag = ({ state, def }: { state: 'required' | 'toggle'; def?: boolean }) => state === 'toggle'
              ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#eef0ff] px-2 py-0.5 text-[11px] font-bold text-[#3617ce]">On/Off<span className="font-medium text-[#8b9bf5]">· 기본 {def ? 'On' : 'Off'}</span></span>
              : <span className="inline-flex shrink-0 items-center rounded-full bg-[#eef0f2] px-2 py-0.5 text-[11px] font-bold text-[#697582]">필수</span>;
            type Attr = typeof spec.card[number];
            // 라벨 옆 ⓘ 툴팁 설명 — SB 정의(CN-DSP-0001)의 중요 포인트(2026-11-25 사용자 요청).
            const ATTR_TIP: Record<string, string> = {
              Image: '원장 이미지 또는 운영 등록으로 노출',
              ContextHeader: '추천 맥락에 따른 근거 노출(검색 · 매장 방문) · 개인화 시에만 노출',
              CornerTitle: '운영 필수 · 최대 36자(줄바꿈 포함 25자 권장) · 2줄 이하 권장',
              Category: '카테고리 구분(탭) · 상단 카테고리 칩',
              Information: '운영에 필요한 정보성 영역 · 수동(수기) 운영일 때만 노출, 개인화 시 노출 안 함',
              LandingLink: '코너 전체 랜딩 링크 · 액션 버튼과 택1 필수',
              ActionButton: '후속 Action 버튼 · 코너 랜딩 링크 버튼과 택1 필수',
              Barcode: '멤버십 바코드 · 값은 회원 인증 기반 런타임 발급',
              Thumbnail: '아이템 썸네일 이미지(원장)',
              ItemTitle: '컴포넌트 타이틀 · 원장',
              ItemDesc: '컴포넌트 내용 · 원장',
              ItemLink: '아이템 상세 링크 · 원장',
              Attendance: '출석 진행(요일 체크 · 게이지)',
              Reward: '보상 아이템(썸네일 · 보상명 · 조건)',
              RewardButton: '보상 받기 버튼',
              EntryMetric: '응모 기회 지표(남은 / 추가 응모)',
              Price: '아이템 가격 노출',
              DiscountRate: '할인율 노출',
              ItemButton: '아이템 우측 버튼(Label)',
            };
            // 셀 1개(라벨 톤 | 값). 값 = Tag + 코드 + 설명(인라인 텍스트, 2026-11-25 사용자 요청: 툴팁 말고 그냥 써줘).
            const Cell = ({ a }: { a: Attr | null }) => a ? (<>
              <div className="flex items-center whitespace-nowrap bg-[#f8f9fb] px-4 py-3 text-[14px] font-medium text-[#454f59]">{a.label}</div>
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 px-4 py-2.5">
                <Tag state={a.state} def={a.default} />
                {ATTR_TIP[a.code] && <span className="text-[12px] leading-snug text-[#1a1a1a] [word-break:keep-all]">{ATTR_TIP[a.code]}</span>}
              </div>
            </>) : <><div className="bg-[#f8f9fb]" /><div /></>;
            // 2열 페어 행 — 라벨|값|라벨|값(세로 보더 없음). 홀수면 뒤칸 비움.
            const PairRows = ({ list }: { list: Attr[] }) => (<>
              {Array.from({ length: Math.ceil(list.length / 2) }, (_, i) => (
                <div key={i} className="grid grid-cols-[140px_minmax(0,1fr)_140px_minmax(0,1fr)] items-stretch border-b border-[#dce0e5]">
                  <Cell a={list[i * 2]} />
                  <Cell a={list[i * 2 + 1] ?? null} />
                </div>
              ))}
            </>);
            // 그룹 구분 — 배경/보더 없이 '텍스트 헤딩'만. 좌측은 '테이블 왼쪽 엣지(라벨 셀 시작)'에 맞춤(라벨 텍스트 아님), 위 테이블과 넉넉한 간격(2026-11-25 사용자 요청).
            const GroupBar = ({ title, desc }: { title: string; desc: string }) => (
              <div className="px-1 pb-2.5 pt-7 text-[13px] font-bold text-[#1a1a1a] first:pt-0">{title} <span className="font-normal text-[#8b949e]">{desc}</span></div>
            );
            return (
              <Collapse title="코너 속성 · 컴포넌트 요소" hint="· 기획 기준 On/Off 가능 항목 (실제 On/Off는 전시 빌더에서)">
                <div className="px-5 pb-5 pt-4">
                  <GroupBar title="코너(카드)" desc="· 카드 전체에 1개" />
                  <div className=""><PairRows list={spec.card} /></div>
                  {spec.item.length > 0 && (
                    <>
                      <GroupBar title="컴포넌트(요소)" desc="· 리스트에서 반복되는 카드" />
                      <div className=""><PairRows list={spec.item} /></div>
                    </>
                  )}
                  {/* 의존 규칙 — 빌더에서 enforce */}
                  {spec.rules.length > 0 && (
                    <div className="mt-4 rounded-[10px] border border-[#ffe2b8] bg-[#fff8ee] px-3 py-2.5">
                      <div className="mb-1 text-[12px] font-bold text-[#B45309]">노출 규칙 (빌더 적용)</div>
                      <ul className="space-y-1">
                        {spec.rules.map((r) => (
                          <li key={r} className="flex gap-1.5 text-[12.5px] leading-snug text-[#7c5410] [word-break:keep-all]"><span className="text-[#d89a3c]">•</span><span>{r}</span></li>
                        ))}
                      </ul>
                    </div>
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
                  <div className="flex aspect-[5/8] items-center justify-center overflow-hidden rounded-[14px] bg-white p-2 shadow-[0_6px_22px_-8px_rgba(20,22,40,0.22)] ring-1 ring-[#eef0f4]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {/* 프리셋 이미지에 드롭섀도 — 흰 타일 배경과 프리셋(흰 디바이스 카드)을 구분(2026-11-25 사용자 요청: 프리셋 페이지와 동일). */}
                    <img src={imgSrc(id)} alt={presetDesignName(id)} className="max-h-full max-w-full rounded-md object-contain drop-shadow-[0_5px_16px_rgba(20,22,40,0.22)]" />
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
