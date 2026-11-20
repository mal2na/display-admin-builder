// 코너 유형 관리(프리셋) — SB 혜택 프리셋을 '이미지(설계도) 모양'이 같은 것끼리 한 코너 유형으로 묶은 리스트(2026-11-20 사용자 요청).
//  라벨(`혜택형 > 제휴사 > 배너·세로형`)을 ' > ' 기준으로 트리로 풀어, 최상위(혜택형/개인형/상품형) → 중분류(제휴사/프로모션형) → 리프(모양)로 중첩해 보여준다(2026-11-20).
//  이미지 = public/assets/preset-images/<CN-DSP-id>.png · 묶음 = preset-shape-groups.ts · 이름 = benefit-preset-designs.json.
import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { Database } from 'lucide-react';
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

// 리프(모양) 묶음 톤 — key 기준.
const GROUP_TONE: Record<string, string> = {
  'affiliate-banner': 'bg-[#D9E9FF] text-[#2E7AFF]',
  'affiliate-triple': 'bg-[#FFE4EC] text-[#D6336C]',
  'program': 'bg-[#FCE1EC] text-[#BE2063]',
  'program-banner': 'bg-[#FCE1EC] text-[#BE2063]',
  'promotion-banner-list': 'bg-[#FFE4C4] text-[#D66400]',
  'promotion-vertical': 'bg-[#FFE4C4] text-[#D66400]',
  'promotion-graph': 'bg-[#FFE4C4] text-[#D66400]',
  'personal-data': 'bg-[#D5F2EC] text-[#0B8A75]',
  'personal-point': 'bg-[#D5F2EC] text-[#0B8A75]',
  'product-sub': 'bg-[#FFF2CC] text-[#A97A00]',
  'product-device': 'bg-[#FFF2CC] text-[#A97A00]',
  'product-roaming': 'bg-[#FFF2CC] text-[#A97A00]',
};

// 최상위 분류 톤 — 좌측 바/제목 배지/박스 배경·테두리.
const TOP_TONE: Record<string, { bar: string; chip: string; box: string; border: string }> = {
  '혜택형': { bar: 'bg-[#D6336C]', chip: 'bg-[#FFE4EC] text-[#D6336C]', box: 'bg-[#FFF6F9]', border: 'border-[#F6D3DF]' },
  '개인형': { bar: 'bg-[#0B8A75]', chip: 'bg-[#D5F2EC] text-[#0B8A75]', box: 'bg-[#F2FBF8]', border: 'border-[#CDEBE2]' },
  '상품형': { bar: 'bg-[#A97A00]', chip: 'bg-[#FFF2CC] text-[#A97A00]', box: 'bg-[#FFFBF0]', border: 'border-[#EEDFB0]' },
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

  return (
    <div className="px-12 py-9 pb-28">
      <nav className="mb-2 flex items-center gap-1.5 text-[14px] text-[#697582]">
        <span>홈</span><span>›</span><span>전시 관리</span><span>›</span>
        <span className="text-[#1a1a1a]">코너 유형 관리(프리셋)</span>
      </nav>
      <h1 className="text-[24px] font-bold leading-[32px] tracking-[-0.6px] text-[#1a1a1a]">코너 유형 관리(프리셋)</h1>
      <p className="mb-4 mt-1 text-[14px] text-[#697582]">
        SB 혜택 프리셋 <b className="text-[#1a1a1a]">{totalPresets}개</b>를 <b className="text-[#1a1a1a]">혜택형 · 개인형 · 상품형</b>으로 그루핑하고, 그 아래 중분류(제휴사·프로모션형)와 모양별로 <b className="text-[#1a1a1a]">{totalLeaves}개 코너 유형</b>으로 정리했습니다. 유형마다 포함된 프리셋 이미지를 전부 보여줍니다.
      </p>

      {/* 옵션 안내 — 바코드·CTA·스와이프는 유형(구조)이 아니라 켜고 끄는 옵션(토글)이라 별도 유형으로 쪼개지 않는다 */}
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-[10px] border border-[#dbe4ff] bg-[#f3f6ff] px-3.5 py-2.5 text-[13px] text-[#3b4a66]">
        <span className="font-bold text-[#3617ce]">옵션</span>
        <span className="text-[#9aa7c2]">·</span>
        <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[12px] font-semibold text-[#3617ce] ring-1 ring-[#dbe4ff]">바코드</span>
        <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[12px] font-semibold text-[#3617ce] ring-1 ring-[#dbe4ff]">CTA</span>
        <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[12px] font-semibold text-[#3617ce] ring-1 ring-[#dbe4ff]">스와이프</span>
        <span className="text-[#697582]">는 코너 유형(구조)이 아니라 <b className="text-[#3b4a66]">켜고 끄는 옵션(토글)</b>입니다. 그래서 별도 유형으로 쪼개지 않고, 같은 유형 안에서 옵션으로 처리합니다.</span>
      </div>

      {/* 최상위 분류 바로가기 칩 */}
      <div className="mb-8 flex flex-wrap gap-2">
        {tree.map((top) => {
          const n = top.mids.reduce((s, m) => s + count(m.leaves), 0);
          const tone = TOP_TONE[top.name]?.chip ?? 'bg-[#DCE0E5] text-[#454F59]';
          return (
            <a key={top.name} href={`#top-${top.name}`} className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-bold ${tone}`}>
              {top.name}<span className="opacity-70">{n}</span>
            </a>
          );
        })}
      </div>

      <div className="flex flex-col gap-10">
        {tree.map((top) => {
          const topTone = TOP_TONE[top.name] ?? { bar: 'bg-[#8b949e]', chip: 'bg-[#DCE0E5] text-[#454F59]', box: 'bg-[#f8f9fb]', border: 'border-[#e8ecef]' };
          const topCount = top.mids.reduce((s, m) => s + count(m.leaves), 0);
          return (
            // 최상위 분류 = 큰 네모 박스
            <section key={top.name} id={`top-${top.name}`} className={`scroll-mt-6 rounded-[20px] border ${topTone.border} ${topTone.box} p-6`}>
              {/* 최상위 분류 헤더 */}
              <div className="mb-5 flex items-center gap-3">
                <span className={`h-7 w-1.5 rounded-full ${topTone.bar}`} />
                <h2 className="text-[22px] font-bold tracking-[-0.4px] text-[#1a1a1a]">{top.name}</h2>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-bold ${topTone.chip}`}>프리셋 {topCount}개</span>
              </div>

              <div className="flex flex-col gap-6">
                {top.mids.map((mid) => (
                  <div key={mid.name ?? '_'} className="flex flex-col gap-3">
                    {/* 중분류 헤더(제휴사/프로모션형) — 있을 때만 */}
                    {mid.name && (
                      <div className="flex items-center gap-2 px-0.5">
                        <span className="text-[15px] font-bold text-[#454f59]">{mid.name}</span>
                        <span className="text-[12px] text-[#b3b9c0]">{count(mid.leaves)}개</span>
                      </div>
                    )}

                    <div className="flex flex-col gap-4">
                      {mid.leaves.map((leaf) => {
                        const g = leaf.group;
                        const tone = GROUP_TONE[g.key] ?? 'bg-[#DCE0E5] text-[#454F59]';
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
                              {g.presetIds.map((id) => (
                                <figure key={id} className="flex flex-col gap-1.5">
                                  <div className="overflow-hidden rounded-[12px] border border-[#e0e4ea] bg-white">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={imgSrc(id)} alt={presetDesignName(id)} className="block w-full" />
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
            </section>
          );
        })}
      </div>

      <div className="mt-10 text-[13px] text-[#8b949e]">
        ← <Link href="/admin/corner-types" className="font-medium text-[#3617ce] hover:underline">코너 유형 관리</Link>로 돌아가기
      </div>
    </div>
  );
}
