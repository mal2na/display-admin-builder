// 추천 질의어(추천질의형) 미리보기 — SB DSP_06 [홈]유형 템플릿 '01. 추천질의'(node 29032:27387).
//  홈(AI 어시스턴트) 전용 코너. 독립된 칩(Chip) 버튼 형태로 추천 질의어를 최대 2개 노출.
//  · 개인화 On: 등록된 복수 추천 질의어 중 고객별 맞춤 제공  · 개인화 Off: 운영자 수동 입력(직접 입력)
//  · 질문당 최대 20자(띄어쓰기 포함)/1줄  · 선택 시 AI 대화 화면으로 이동해 해당 질문의 답변 자동 제공.
import type { PreviewCorner } from './blocks';

// 코너 컴포넌트(선택형)의 TEXT 아톰 = 추천 질의어 후보. 최대 2개만 노출(스펙).
function queriesOf(corner: PreviewCorner): string[] {
  const out: string[] = [];
  for (const c of corner.components ?? []) {
    for (const a of c.atoms ?? []) {
      if (a.atomType === 'TEXT' && a.content && a.content.trim()) out.push(a.content.trim());
    }
  }
  return out;
}

export function RecQueryCard({ corner }: { corner: PreviewCorner }) {
  const qs = queriesOf(corner);
  // 후보가 없으면 플레이스홀더 2개. 노출은 최대 2개(스펙).
  const items = (qs.length ? qs : ['{추천 질의어}', '{추천 질의어}']).slice(0, 2);
  return (
    // 코너 배경은 투명 — 홈 배경(그라데이션) 위에 질의어 칩(버블)만 떠 보이게(2026-11-25 사용자 요청).
    //  상하 여백 — SB [홈]유형(node 29032:27421)처럼 오퍼 카드/배너와 붙지 않게 넉넉히(2026-11-25 사용자 요청).
    <section className="px-1 py-2.5 font-[Pretendard,'Pretendard_Variable',-apple-system,sans-serif]">
      {/* 질의어 칩(버블) — 대화 스타터. 독립 버튼, 최대 2개, 1줄(20자). 라벨·아이콘 없음. 선택 시 AI 대화로 이동. */}
      <div className="space-y-2.5">
        {items.map((q, i) => (
          <div key={i} className="flex w-full items-center rounded-full bg-white px-4 py-3 shadow-[0_2px_10px_rgba(50,56,120,0.10)]">
            <span className="min-w-0 flex-1 truncate text-[14px] font-medium tracking-[-0.4px] text-[#454f59]">{q}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
