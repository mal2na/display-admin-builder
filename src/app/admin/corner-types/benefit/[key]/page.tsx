// 혜택형 코너 유형 상세 — 기존 코너 유형 관리 상세와 동일 레이아웃(좌측 sticky 미리보기 340 + 우측 코너 기본 정보).
//  조회 전용. 데이터 = benefit-corner-types(SSOT) → 프리셋 PNG 설계도 노출. 2026-11-23.
import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Database, Lock, ChevronLeft, Info } from 'lucide-react';
import { benefitTypeByKey, cornerAttrSpec, benefitGuide } from '@/lib/benefit-corner-types';
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

// 코너 기본 정보 행 — 그레이 라벨 + 값, 위아래 보더만(기존 상세 읽기 테이블 규격).
// 기존 상세 읽기 테이블과 동일 — 라벨 셀 th 톤 배경(#f8f9fb) + ink2 텍스트·font-medium, 위아래 보더만.
function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-stretch border-b border-[#f1f3f5] text-[14px]">
      <div className="flex w-28 shrink-0 items-start bg-[#f8f9fb] px-4 py-3 font-medium text-[#454f59]">{label}</div>
      <div className="min-w-0 flex-1 px-4 py-3 text-[#1a1a1a]">{children}</div>
    </div>
  );
}

export default function BenefitCornerTypeDetailPage({ params }: { params: { key: string } }) {
  const key = decodeURIComponent(params.key);
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
            <div className="px-4 py-1">
              {/* 짧은 필드 — 2열 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-8">
                <InfoRow label="코너 유형 ID"><span className="font-mono text-[13px] text-[#454f59]">{t.typeId}</span></InfoRow>
                <InfoRow label="코너 유형"><span className={`${CHIP} bg-[#FFE4EC] text-[#D6336C]`}>혜택형</span></InfoRow>
                <InfoRow label="중분류"><span className="text-[#454f59]">{t.mid}</span></InfoRow>
                <InfoRow label="배열·레이아웃">{t.layout}</InfoRow>
              </div>
              {/* 긴 필드 — 전체 폭 */}
              <InfoRow label="노출 규격">
                <span className="inline-flex items-start gap-1.5 rounded-md border border-[#dbe4ff] bg-[#f3f6ff] px-2.5 py-1.5 text-[13px] leading-snug text-[#3b4a66] [word-break:keep-all]">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3617ce]" />{benefitGuide(t.mid, t.layout)}
                </span>
              </InfoRow>
              <InfoRow label="바라보는 원장">
                <span className="inline-flex items-start gap-1.5 rounded-md border border-[#dce0e5] bg-[#f8f9fb] px-2 py-1 text-[13px] text-[#454f59]">
                  <Database className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8b949e]" /><span className="[word-break:keep-all]">{t.source}</span>
                </span>
              </InfoRow>
              {/* 짧은 필드 — 2열 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-8">
                <InfoRow label="등록 프리셋">{t.presetIds.length}개</InfoRow>
                <InfoRow label="사용여부">{t.unused
                  ? <span className="inline-flex items-center gap-1.5 font-semibold text-[#8b949e]"><span className="h-1.5 w-1.5 rounded-full bg-[#b3b9c0]" />미사용 <span className="text-[12px] font-normal text-[#b3b9c0]">· Figma 미포함</span></span>
                  : <span className="inline-flex items-center gap-1 font-semibold text-[#0B8A75]"><span className="h-1.5 w-1.5 rounded-full bg-[#00a058]" />사용</span>}</InfoRow>
                <InfoRow label="승인상태">{t.unused
                  ? <span className="inline-flex items-center rounded-md border border-[#dce0e5] bg-[#f1f3f5] px-2 py-0.5 text-[12px] font-semibold text-[#8b949e]">안씀</span>
                  : <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[12px] font-semibold text-emerald-700">승인완료</span>}</InfoRow>
                <InfoRow label="최근 수정자">김마리나</InfoRow>
                <InfoRow label="최근 수정일시"><span className="text-[#697582]">2026-11-23 10:21</span></InfoRow>
              </div>
            </div>
          </Collapse>

          {/* 코너 속성 / 컴포넌트 요소 — 기획(SB DSP_03) 기준 On/Off 가능 항목 + 의존 규칙(2026-11-24). 실제 On/Off는 전시 빌더에서. */}
          {(() => {
            const spec = cornerAttrSpec(t.mid, t.layout);
            const Tag = ({ state, def }: { state: 'required' | 'toggle'; def?: boolean }) => state === 'toggle'
              ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#eef0ff] px-2 py-0.5 text-[11px] font-bold text-[#3617ce]">On/Off<span className="font-medium text-[#8b9bf5]">· 기본 {def ? 'On' : 'Off'}</span></span>
              : <span className="inline-flex shrink-0 items-center rounded-full bg-[#eef0f2] px-2 py-0.5 text-[11px] font-bold text-[#697582]">필수</span>;
            const Row = ({ label, code, state, default: def, note }: typeof spec.card[number]) => (
              <div className="flex items-start gap-3 border-b border-[#f1f3f5] px-1 py-2.5">
                <div className="min-w-0 flex-1">
                  <div>
                    <span className="text-[14px] font-semibold text-[#1a1a1a]">{label}</span>
                    <span className="ml-1.5 text-[12px] text-[#b3b9c0]">({code})</span>
                  </div>
                  {note && <div className="mt-0.5 text-[12px] leading-snug text-[#8b949e] [word-break:keep-all]">{note}</div>}
                </div>
                <Tag state={state} def={def} />
              </div>
            );
            return (
              <Collapse title="코너 속성 · 컴포넌트 요소" hint="· 기획 기준 On/Off 가능 항목 (실제 On/Off는 전시 빌더에서)">
                <div className="px-4 py-2">
                  <div className="rounded-md bg-[#f8f9fb] px-3 py-1.5 text-[13px] font-bold text-[#3617ce]">코너(카드) <span className="font-normal text-[#8b949e]">· 카드 전체에 1개</span></div>
                  <div className="grid grid-cols-1 gap-x-8 lg:grid-cols-2">
                    {spec.card.map((a) => <Row key={a.code} {...a} />)}
                  </div>
                  {spec.item.length > 0 && (
                    <>
                      <div className="mt-2 rounded-md bg-[#f8f9fb] px-3 py-1.5 text-[13px] font-bold text-[#3617ce]">컴포넌트(요소) <span className="font-normal text-[#8b949e]">· 리스트에서 반복되는 카드</span></div>
                      <div className="grid grid-cols-1 gap-x-8 lg:grid-cols-2">
                        {spec.item.map((a) => <Row key={a.code} {...a} />)}
                      </div>
                    </>
                  )}
                  {/* 의존 규칙 — 빌더에서 enforce */}
                  {spec.rules.length > 0 && (
                    <div className="mt-3 rounded-[10px] border border-[#ffe2b8] bg-[#fff8ee] px-3 py-2.5">
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
                  <div className="flex aspect-[5/8] items-center justify-center overflow-hidden rounded-[12px] border border-[#e8ecef] bg-[#f8f9fb] p-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imgSrc(id)} alt={presetDesignName(id)} className="max-h-full max-w-full rounded-md object-contain" />
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
