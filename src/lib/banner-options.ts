// 배너형 코너 노출 옵션 — 한 코너에 담긴 여러 배너의 노출 방식.
//  Corner.bannerOptions(JSON 문자열) 단일 진실. 스와이프(수동) / 자동 슬라이드 두 가지 (2026-09-28 회의 확정).
//  1장이면 옵션과 무관하게 단일 노출(BannerCarousel에서 처리).
export type BannerDisplayMode = 'swipe' | 'auto';
export type BannerOptions = {
  mode: BannerDisplayMode;
  intervalSec: number; // 자동 슬라이드 간격(초). mode='auto'에서만 의미.
  showIndicator: boolean; // 하단 인디케이터(점) 표시
  loop: boolean; // 자동 슬라이드 무한 루프
};

export const DEFAULT_BANNER_OPTIONS: BannerOptions = {
  mode: 'swipe',
  intervalSec: 4,
  showIndicator: true,
  loop: true,
};

// JSON 문자열 → BannerOptions (누락/이상값은 기본값으로 보정). null·파싱실패도 기본값.
export function parseBannerOptions(json: string | null | undefined): BannerOptions {
  if (!json) return { ...DEFAULT_BANNER_OPTIONS };
  try {
    const o = JSON.parse(json) as Partial<BannerOptions>;
    return {
      mode: o.mode === 'auto' ? 'auto' : 'swipe',
      intervalSec: Math.min(15, Math.max(2, Number(o.intervalSec) || DEFAULT_BANNER_OPTIONS.intervalSec)),
      showIndicator: o.showIndicator !== false,
      loop: o.loop !== false,
    };
  } catch {
    return { ...DEFAULT_BANNER_OPTIONS };
  }
}
