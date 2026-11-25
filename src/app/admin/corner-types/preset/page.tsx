// 코너 유형 관리(프리셋) — SB 혜택 프리셋을 '이미지(설계도) 모양'이 같은 것끼리 한 코너 유형으로 묶은 리스트(2026-11-20 사용자 요청).
//  라벨(`혜택형 > 제휴사 > 배너·세로형`)을 ' > ' 기준으로 트리로 풀어, 최상위(혜택형/개인형/상품형) → 중분류(제휴사/프로모션형) → 리프(모양)로 중첩해 보여준다(2026-11-20).
//  이미지 = public/assets/preset-images/<CN-DSP-id>.png · 묶음 = preset-shape-groups.ts · 이름 = benefit-preset-designs.json.
import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { Database, ChevronDown } from 'lucide-react';
import { PRESET_SHAPE_GROUPS, type PresetShapeGroup } from '@/lib/preset-shape-groups';
import { presetDesignName } from '@/components/preview/preset-design-card';

export const dynamic = 'force-dynamic';

// 이미지 URL — 파일 수정시각(mtime)을 쿼리로 붙여, 이미지 교체 시 브라우저 캐시 없이 바로 반영되게 한다(2026-11-20).
function imgSrc(id: string): string {
  try {
    const st = fs.statSync(path.join(process.cwd(), 'public/assets/preset-images', `${id}.png`));
    return `/assets/preset-images/${id}.png?v=${Math.floor(st.mtimeMs)}`;
  } catch {
    return `/assets/preset-images/${id}.png`;
  }
}

// 리프 톤 — 중분류(mid)별 색. 리프 키가 많아 중분류 기준으로 칠한다.
const MID_TONE: Record<string, string> = {
  '제휴사형': 'bg-[#D9E9FF] text-[#2E7AFF]',
  '미션형': 'bg-[#FFE4C4] text-[#D66400]',
  '이벤트형': 'bg-[#EAE2FF] text-[#6D28D9]',
  '혜택프로그램형': 'bg-[#FCE1EC] text-[#BE2063]',
  '이용지원형': 'bg-[#D5F2EC] text-[#0B8A75]',
  '상품형': 'bg-[#FFF2CC] text-[#A97A00]',
  '구분 미정': 'bg-[#eceef2] text-[#697582]',
  '구독상품': 'bg-[#FFF2CC] text-[#A97A00]',
  '디바이스': 'bg-[#FFF2CC] text-[#A97A00]',
};

// 중분류 박스(한 번 더 묶기) — 중분류별 옅은 배경+테두리. 안의 레이아웃 카드(세로형·바코드형 등)는 별도 흰 카드 유지.
const MID_BOX: Record<string, string> = {
  '제휴사형': 'border-[#CFE2FF] bg-[#EAF2FF]',
  '미션형': 'border-[#F3D9B5] bg-[#FFF3E6]',
  '이벤트형': 'border-[#D9CCFF] bg-[#F3EEFF]',
  '혜택프로그램형': 'border-[#F3CFE0] bg-[#FBEAF2]',
  '이용지원형': 'border-[#CDEBE2] bg-[#E9F7F2]',
  '구독상품': 'border-[#EEDFB0] bg-[#FFF6E0]',
  '디바이스': 'border-[#EEDFB0] bg-[#FFF6E0]',
};

// 중분류 분류 기준 + 바라보는 원장(SSOT) — 상단 범례용.
const MID_GUIDE: { name: string; basis: string; source: string }[] = [
  { name: '제휴사형', basis: '제휴 브랜드 (혜택 브랜드)', source: 'EPC > 제휴사 카테고리 관리 (기존 혜택 브랜드)' },
  { name: '미션형', basis: '출석체크 · 혜택여행 스탬프 · 바로적립 · 참여적립 · 쇼핑적립 · 돈 버는 교통 · 돈 버는 설문 (내부 미션 메뉴 진입)', source: '어드민 > 내부 미션유형 (AS-IS 출석체크 · 혜택여행 스탬프 · 바로적립 · 참여적립 · 쇼핑적립 · 돈 버는 교통 · 돈 버는 설문)' },
  { name: '이벤트형', basis: '룰렛 · 멤버십 이벤트 · T월드 이벤트 (운영자 등록 이벤트)', source: '어드민 · 프로모션 관리 (+ 응모·참여 내역=고객 원장)' },
  { name: '혜택프로그램형', basis: 'T 멤버십 · T day · VIP PICK · 글로벌여행 · 클럽 멤버십 · T 장기고객 · 열린 멤버십 · 기프티콘', source: '어드민 > 내부 프로그램 (T 멤버십 · T day · VIP PICK · 글로벌여행 · 클럽 멤버십 · T 장기고객 · 열린 멤버십 · 기프티콘)' },
  { name: '이용지원형', basis: '앱 내 특정 페이지로 랜딩(이동)시키고 싶은 이용 안내 (상품/혜택 공통)', source: '직접 입력(운영) · 앱 내 페이지 링크 (API 아님)' },
];

// 최상위 분류 톤 — 혜택형(단일 top).
const TOP_TONE: Record<string, { bar: string; chip: string; box: string; border: string }> = {
  '혜택형': { bar: 'bg-[#D6336C]', chip: 'bg-[#FFE4EC] text-[#D6336C]', box: 'bg-[#FFF6F9]', border: 'border-[#F6D3DF]' },
  '상품형': { bar: 'bg-[#A97A00]', chip: 'bg-[#FFF2CC] text-[#A97A00]', box: 'bg-[#FFFBF0]', border: 'border-[#EEDFB0]' },
  '구분 미정': { bar: 'bg-[#8b949e]', chip: 'bg-[#eceef2] text-[#697582]', box: 'bg-[#f8f9fb]', border: 'border-[#e3e6ea]' },
};

type Leaf = { group: PresetShapeGroup; leafLabel: string };
type Mid = { name: string | null; leaves: Leaf[] };
type Top = { name: string; mids: Mid[] };

function buildTree(groups: PresetShapeGroup[]): Top[] {
  const tops: Top[] = [];
  for (const g of groups) {
    const parts = g.label.split('>').map((s) => s.trim());
    const topName = parts[0];
    const midName = parts.length >= 3 ? parts[1] : null;
    const leafLabel = parts.length >= 2 ? parts[parts.length - 1] : '';
    let top = tops.find((t) => t.name === topName);
    if (!top) { top = { name: topName, mids: [] }; tops.push(top); }
    let mid = top.mids.find((m) => m.name === midName);
    if (!mid) { mid = { name: midName, leaves: [] }; top.mids.push(mid); }
    mid.leaves.push({ group: g, leafLabel });
  }
  return tops;
}

const count = (leaves: Leaf[]) => leaves.reduce((n, l) => n + l.group.presetIds.length, 0);

export default function PresetTypeListPage() {
  const tree = buildTree(PRESET_SHAPE_GROUPS);
  const totalPresets = PRESET_SHAPE_GROUPS.reduce((n, g) => n + g.presetIds.length, 0);
  const totalLeaves = PRESET_SHAPE_GROUPS.length;
  // 상단 네비 탭 — 혜택형은 중분류별(제휴사형·미션형…) 앵커, 그 외(상품형·구분 미정)는 top 앵커로 이동.
  const navTabs: { label: string; href: string }[] = [];
  for (const top of tree) {
    if (top.name === '혜택형') { for (const m of top.mids) if (m.name) navTabs.push({ label: m.name, href: `#mid-${m.name}` }); }
    else navTabs.push({ label: top.name, href: `#top-${top.name}` });
  }

  return (
    <div className="px-12 py-9 pb-28">
      <nav className="mb-2 flex items-center gap-1.5 text-[14px] text-[#697582]">
        <span>홈</span><span>›</span><span>전시 관리</span><span>›</span>
        <span className="text-[#1a1a1a]">코너 유형 관리(프리셋)</span>
      </nav>
      <h1 className="text-[24px] font-bold leading-[32px] tracking-[-0.6px] text-[#1a1a1a]">코너 유형 관리(프리셋)</h1>
      <p className="mb-4 mt-1 text-[14px] text-[#697582]">
        신규 프리셋 <b className="text-[#1a1a1a]">{totalPresets}개</b>를 <b className="text-[#1a1a1a]">혜택형</b>(중분류 제휴사형·미션형·이벤트형·혜택프로그램형·이용지원형) + <b className="text-[#1a1a1a]">상품형</b>(기기 지원금·요금제·구독) 아래 레이아웃(리스트형·캐러셀형·출석체크형·룰렛형·바코드형·배너형·그래프형)으로 묶었습니다. 총 <b className="text-[#1a1a1a]">{totalLeaves}개 유형</b>. <span className="text-[#8b949e]">※ 중분류=파일명, 레이아웃=이미지 기준. 개인화형(1-1~1-3)은 별도 유형이 아니라 이 코너들을 빌더 개인화 슬롯에 담는 사용 방식.</span>
      </p>

      {/* 분류 기준 · 원장 범례 — 중분류를 어떤 기준으로 나눴고 어떤 원장을 바라보는지 명시 */}
      <div className="mb-6 overflow-hidden rounded-[12px] border border-[#e8ecef] bg-white">
        <div className="flex items-center gap-2 border-b border-[#f1f3f5] bg-[#f8f9fb] px-4 py-2.5">
          <Database className="h-4 w-4 text-[#8b949e]" />
          <span className="text-[13px] font-bold text-[#454f59]">분류 기준 · 바라보는 원장</span>
          <span className="text-[12px] text-[#b3b9c0]">혜택형 중분류 5종</span>
        </div>
        <div className="divide-y divide-[#f1f3f5]">
          {MID_GUIDE.map((m) => (
            <div key={m.name} className="flex flex-col gap-1 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-3">
              <a href={`#mid-${m.name}`} className={`inline-flex w-fit shrink-0 items-center rounded-full px-2.5 py-0.5 text-[12px] font-bold ${MID_TONE[m.name] ?? 'bg-[#DCE0E5] text-[#454F59]'}`}>{m.name}</a>
              <span className="min-w-0 flex-1 text-[13px] text-[#454f59]">{m.basis}</span>
              <span className="inline-flex shrink-0 items-center gap-1 text-[12px] text-[#697582]"><Database className="h-3 w-3 text-[#b3b9c0]" />원장: <b className="font-semibold text-[#454f59]">{m.source}</b></span>
            </div>
          ))}
        </div>
      </div>

      {/* 옵션 안내 — 바코드·CTA·스와이프는 유형(구조)이 아니라 켜고 끄는 옵션(토글)이라 별도 유형으로 쪼개지 않는다 */}
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-[10px] border border-[#dbe4ff] bg-[#f3f6ff] px-3.5 py-2.5 text-[13px] text-[#3b4a66]">
        <span className="font-bold text-[#3617ce]">옵션</span>
        <span className="text-[#9aa7c2]">·</span>
        <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[12px] font-semibold text-[#3617ce] ring-1 ring-[#dbe4ff]">바코드</span>
        <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[12px] font-semibold text-[#3617ce] ring-1 ring-[#dbe4ff]">CTA</span>
        <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[12px] font-semibold text-[#3617ce] ring-1 ring-[#dbe4ff]">스와이프</span>
        <span className="text-[#697582]">는 코너 유형(구조)이 아니라 <b className="text-[#3b4a66]">켜고 끄는 옵션(토글)</b>입니다. 그래서 별도 유형으로 쪼개지 않고, 같은 유형 안에서 옵션으로 처리합니다.</span>
      </div>

      {/* 중분류 네비 탭 — sticky. 클릭 시 해당 섹션으로 이동(보기 편하게, 2026-11-23). */}
      <div className="sticky top-0 z-20 -mx-12 mb-8 border-b border-[#e8ecef] bg-white/95 px-12 py-2.5 backdrop-blur">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {navTabs.map((t) => (
            <a key={t.href} href={t.href}
              className="shrink-0 rounded-full border border-[#e3e6ea] bg-white px-3.5 py-1.5 text-[13px] font-semibold text-[#454f59] transition hover:border-[#3617ce] hover:bg-[#f3f6ff] hover:text-[#3617ce]">
              {t.label}
            </a>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-10">
        {tree.map((top) => {
          const topTone = TOP_TONE[top.name] ?? { bar: 'bg-[#8b949e]', chip: 'bg-[#DCE0E5] text-[#454F59]', box: 'bg-[#f8f9fb]', border: 'border-[#e8ecef]' };
          const topCount = top.mids.reduce((s, m) => s + count(m.leaves), 0);
          return (
            // 최상위 분류 = 큰 네모 박스. <details>로 접기(상품형은 지금 필요 없어 기본 접힘, 2026-11-23).
            <details key={top.name} id={`top-${top.name}`} open={top.name !== '상품형'} className={`group scroll-mt-6 rounded-[20px] border ${topTone.border} ${topTone.box} p-6`}>
              {/* 최상위 분류 헤더 = summary(클릭해 접기/펼치기) */}
              <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
                <span className={`h-7 w-1.5 rounded-full ${topTone.bar}`} />
                <h2 className="text-[22px] font-bold tracking-[-0.4px] text-[#1a1a1a]">{top.name}</h2>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-bold ${topTone.chip}`}>프리셋 {topCount}개</span>
                <ChevronDown className="ml-1 h-5 w-5 text-[#8b949e] transition-transform group-open:rotate-180" />
              </summary>

              <div className="mt-5 flex flex-col gap-6">
                {top.mids.map((mid) => (
                  <div key={mid.name ?? '_'} id={mid.name ? `mid-${mid.name}` : undefined}
                    className={mid.name
                      ? `scroll-mt-20 rounded-[16px] border p-3.5 ${MID_BOX[mid.name] ?? 'border-[#e8ecef] bg-white'}`
                      : 'flex scroll-mt-20 flex-col gap-3'}>
                    {/* 중분류 헤더(제휴사형 등) — 있을 때만. 중분류를 한 번 더 박스로 묶음 */}
                    {mid.name && (
                      <div className="mb-3 flex items-center gap-2 px-0.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[13px] font-bold ${MID_TONE[mid.name] ?? 'bg-[#DCE0E5] text-[#454F59]'}`}>{mid.name}</span>
                        <span className="text-[12px] text-[#b3b9c0]">{count(mid.leaves)}개</span>
                      </div>
                    )}

                    <div className="flex flex-col gap-4">
                      {mid.leaves.map((leaf) => {
                        const g = leaf.group;
                        const tone = MID_TONE[mid.name ?? ''] ?? MID_TONE[top.name] ?? 'bg-[#DCE0E5] text-[#454F59]';
                        return (
                          // 코너 유형 = 안쪽 박스(전체 경로 라벨)
                          <section key={g.key} id={g.key} className="scroll-mt-6 rounded-[14px] border border-[#e8ecef] bg-white p-4">
                            <div className="mb-3 border-b border-[#f1f3f5] pb-3">
                              <div className="flex flex-wrap items-baseline gap-2.5">
                                <h3 className="text-[14px] font-bold text-[#1a1a1a]">{g.label}</h3>
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-semibold ${tone}`}>{g.presetIds.length}개</span>
                                <span className="text-[13px] text-[#8b949e]">· {g.note}</span>
                              </div>
                              {/* 원장(데이터 소스) 마킹 */}
                              <div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-[#dce0e5] bg-[#f8f9fb] px-2 py-1 text-[12px] text-[#454f59]">
                                <Database className="h-3.5 w-3.5 text-[#8b949e]" />
                                <span className="font-semibold text-[#697582]">원장</span>
                                <span className="text-[#c4c9cf]">·</span>
                                <span>{g.source}</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(236px,264px))] gap-4 rounded-[12px] bg-[#eef0f6] p-4">
                              {g.presetIds.length === 0 && (
                                <div className="col-span-full flex items-center justify-center rounded-[10px] border border-dashed border-[#c4c9cf] bg-white/60 px-3 py-6 text-[12px] font-medium text-[#8b949e]">샘플 이미지 TBD — FO 588 케이스로 채울 예정</div>
                              )}
                              {g.presetIds.map((id) => (
                                <figure key={id} className="flex flex-col gap-1.5">
                                  {/* 흰 카드 안의 프리셋(디바이스 카드)에 drop-shadow — 둘 다 흰색이라 안 구분되는 문제 해결(2026-11-25 사용자 요청: 흰 배경 유지 + 프리셋에 그림자). */}
                                  <div className="flex aspect-[5/8] items-center justify-center overflow-hidden rounded-[16px] bg-white p-3 shadow-[0_8px_26px_-10px_rgba(20,22,40,0.22)] ring-1 ring-[#eef0f4]">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={imgSrc(id)} alt={presetDesignName(id)} className="max-h-full max-w-full object-contain drop-shadow-[0_5px_16px_rgba(20,22,40,0.22)]" />
                                  </div>
                                  <figcaption className="px-0.5 text-[12px] leading-tight [word-break:keep-all]">
                                    <span className="font-medium text-[#454f59]">{presetDesignName(id)}</span>
                                    <span className="ml-1 text-[#b3b9c0]">{id}</span>
                                  </figcaption>
                                </figure>
                              ))}
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          );
        })}
      </div>

      <div className="mt-10 text-[13px] text-[#8b949e]">
        ← <Link href="/admin/corner-types" className="font-medium text-[#3617ce] hover:underline">코너 유형 관리</Link>로 돌아가기
      </div>
    </div>
  );
}
