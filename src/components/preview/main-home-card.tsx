// 메인홈(AI 어시스턴트) 인사말 + 혜택 바코드 오퍼 — SB DSP_06 [홈]유형(node 29032:27421) UI 재현.
//  인사말(개인화 타이틀) + 반투명 카드(오퍼 문구 + '혜택 바코드 열기' 버튼 + 상품 이미지).
import type { PreviewCorner } from './blocks';

export function MainHomeOfferCard({ corner }: { corner: PreviewCorner }) {
  const title = corner.mainTitle ?? '{인사말}';
  const atoms = (corner.components ?? []).flatMap((c) => c.atoms ?? []);
  const img = atoms.find((a) => a.atomType === 'IMAGE')?.imageUrl ?? null;
  const offer = atoms.find((a) => a.atomType === 'TEXT')?.content ?? '{오퍼 문구}';
  const cta = atoms.find((a) => a.atomType === 'CTA')?.content ?? '혜택 바코드 열기';
  return (
    <section className="px-1 pt-1 font-[Pretendard,'Pretendard_Variable',-apple-system,sans-serif]">
      {/* 인사말(개인화 타이틀) */}
      <h2 className="whitespace-pre-line text-[21px] font-bold leading-[28px] tracking-[-0.5px] text-[#1a1a1a]">{title}</h2>
      {/* 오퍼 카드 — 반투명 화이트, 좌: 문구+버튼 / 우: 상품 이미지 */}
      <div className="mt-3.5 flex items-center gap-3 rounded-[18px] border border-white/60 bg-white/70 p-4 shadow-[0_6px_20px_-8px_rgba(50,56,120,0.18)] backdrop-blur-sm">
        <div className="min-w-0 flex-1">
          <p className="whitespace-pre-line text-[14px] font-semibold leading-[20px] tracking-[-0.3px] text-[#1a1a1a]">{offer}</p>
          <button type="button" className="mt-2.5 inline-flex items-center rounded-full border border-[#c9ccf7] bg-white/80 px-3 py-1 text-[12px] font-semibold text-[#4b59ff]">{cta}</button>
        </div>
        <div className="grid h-[72px] w-[72px] shrink-0 place-items-center overflow-hidden rounded-[14px] bg-gradient-to-br from-[#e7eaf6] to-[#d9def0]">
          {/* 이미지 URL이 404여도 '깨진 이미지'가 안 보이게 — 실패하면 숨겨 그라데이션 박스만(2026-11-26 사용자: 자꾸 깨져 보임). */}
          {img ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={img} alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : null}
        </div>
      </div>
    </section>
  );
}
