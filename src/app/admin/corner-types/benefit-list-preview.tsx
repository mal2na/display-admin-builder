// 혜택형 프리뷰 — SB DSP_03 Figma 프레임을 그대로 export한 이미지(2026-11-24).
//  손으로 그리지 않고 Figma 원본을 2x PNG로 내려받아 사용. public/assets/sb-preview/<key>.png.
//  유형(중분류>레이아웃)별 이미지 맵. 맵에 없는 유형은 기존 렌더러(cornerRowPreview/FullsetPreview)로 폴백.
//  node: 제휴사27811 · 이벤트27920 · 미션(리스트)28036 · 혜택프로그램(리스트)28274 · 이용지원(리스트)28582.

// SB_PREVIEW 맵·sbPreviewSrc는 서버 공용 라이브러리로 이동(빌더 코너 불러오기 모달과 공용). 여기선 재노출만.
export { SB_PREVIEW, sbPreviewSrc } from '@/lib/benefit-corner-types';

// SB export 이미지 1장을 카드 프레임으로 렌더. lg=상세(300) · sm=리스트 썸네일(150).
export function SbPreviewImage({ src, size = 'lg' }: { src: string; size?: 'sm' | 'lg' }) {
  const lg = size === 'lg';
  return (
    <div className={`mx-auto ${lg ? 'w-[300px]' : 'w-[150px]'}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="코너 프리뷰"
        className={`block w-full ${lg ? 'rounded-[20px] shadow-[0_8px_26px_-14px_rgba(20,22,40,0.22)]' : 'rounded-[14px] shadow-[0_4px_14px_-8px_rgba(20,22,40,0.2)]'}`}
      />
    </div>
  );
}
