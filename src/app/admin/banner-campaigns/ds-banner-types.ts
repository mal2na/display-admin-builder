import type { ComposeFields } from './composed-banner';

// DS 포털에 등록된 '기본 배너 유형'(공식 유형 근사). 운영자는 유형을 고른 뒤 텍스트·이미지만 바꾼다.
// locked = 유형이 고정하는 레이아웃/배경/색(운영자 편집 불가). 나중에 실제 DS 연동으로 교체 가능.
// spec = 운영자에게 보여줄 규격 안내(폰트 / 권장 이미지). 배너 규격(빅/스몰/띠/팝업)은 별도 선택값을 따른다.
// registered = DS 포털에 실제 등록되어 '가져올 수 있는' 유형. 현재는 기본형 하나만 등록됨.
// 나머지는 정의만 있고 미등록(운영자가 가져올 수 없음) — 추후 DS 연동으로 등록될 수 있다.
export type DsBannerType = { id: string; name: string; desc: string; font: string; image: string; registered?: boolean; locked: Partial<ComposeFields> };

export const DS_BANNER_TYPES: DsBannerType[] = [
  {
    id: 'basic', name: '기본형', desc: '제목·서브 좌측 + 이미지 우측', registered: true,
    font: '제목 Pretendard SemiBold 20 · 서브 Regular 13', image: '권장 480×480 · 투명 PNG/SVG',
    locked: { bgType: 'solid', bgColor: '#EDEFF6', bgColor2: '#DDE3F0', titleColor: '#1E293B', subColor: '#64748B', align: 'left', imagePos: 'right', imgSize: 'lg', imgShape: 'square', titleSize: 'lg', badgeText: '', ctaColor: '#4F46E5' },
  },
  {
    id: 'left', name: '좌측 이미지형', desc: '이미지 좌측 + 텍스트 우측',
    font: '제목 Pretendard SemiBold 20 · 서브 Regular 13', image: '권장 480×480 · 투명 PNG/SVG',
    locked: { bgType: 'solid', bgColor: '#EEF1F8', bgColor2: '#DDE3F0', titleColor: '#0F172A', subColor: '#64748B', align: 'left', imagePos: 'left', imgSize: 'lg', imgShape: 'square', titleSize: 'lg', badgeText: '', ctaColor: '#4F46E5' },
  },
  {
    id: 'benefit', name: '혜택 카드형', desc: '민트 톤 · 원형 이미지',
    font: '제목 Pretendard SemiBold 20 · 서브 Regular 13', image: '권장 원형 360×360 · 투명 PNG',
    locked: { bgType: 'gradient', bgColor: '#E6F7EF', bgColor2: '#CFEFE0', titleColor: '#0F172A', subColor: '#3F7A64', align: 'left', imagePos: 'right', imgSize: 'md', imgShape: 'circle', titleSize: 'lg', badgeText: '', ctaColor: '#059669' },
  },
  {
    id: 'dark', name: '프로모션(다크)', desc: '네이비 · 흰 글씨',
    font: '제목 Pretendard Bold 22(흰색) · 서브 Regular 13', image: '권장 560×560 · 투명 PNG/SVG',
    locked: { bgType: 'gradient', bgColor: '#334155', bgColor2: '#0F172A', titleColor: '#FFFFFF', subColor: '#CBD5E1', align: 'left', imagePos: 'right', imgSize: 'lg', imgShape: 'square', titleSize: 'xl', badgeText: '', ctaColor: '#F59E0B' },
  },
];

// 가져오기 가능한(등록된) DS 배너 유형만.
export const REGISTERED_DS_BANNER_TYPES = DS_BANNER_TYPES.filter((t) => t.registered);

export const dsBannerType = (id?: string) => DS_BANNER_TYPES.find((t) => t.id === id) ?? DS_BANNER_TYPES[0];
export const dsBannerTypeName = (id?: string) => dsBannerType(id).name;
