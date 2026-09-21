// 규칙 기반 "AI 초안" 생성기 (프로토타입) — 실제 LLM 없이 자연어 프롬프트의 키워드를 해석해
// 직접 만들기(조립형) 배너의 초안(제목·문구·배경·CTA·배지·레이아웃)을 만든다.
// 반환값은 배너 폼 row에 그대로 머지하는 patch. 생성 후 모든 텍스트는 수동 수정 가능.
// 나중에 실제 생성형 AI로 교체할 때 이 함수만 서버 액션으로 바꾸면 된다.

export type ComposeDraft = {
  title: string; subtitle: string;
  bgColor: string; bgColor2: string; bgType: string;
  titleColor: string; subColor: string; titleSize: string; align: string;
  imagePos: string; imgSize: string;
  badgeText: string; badgeColor: string;
  ctaText: string; ctaColor: string;
};

type Palette = { c1: string; c2: string; accent: string; dark?: boolean };

// 톤/키워드 → 배경 팔레트 + 강조색
const PALETTES: { keys: string[]; pal: Palette }[] = [
  { keys: ['핑크', '로즈', '뷰티', '립', '코스메', '화장', '메이크업', '향수'], pal: { c1: '#FDEEE8', c2: '#F9D9CE', accent: '#E11D48' } },
  { keys: ['민트', '그린', '초록', '친환경', '봄', '싱그', '자연'], pal: { c1: '#E6F7EF', c2: '#CFEFE0', accent: '#059669' } },
  { keys: ['블루', '스카이', '시원', '여름', '바다', '물', '워터'], pal: { c1: '#E7F0FD', c2: '#D3E4FB', accent: '#2563EB' } },
  { keys: ['프리미엄', '럭셔리', '고급', '블랙', '다크', '네이비', 'vip', '프라임'], pal: { c1: '#334155', c2: '#0F172A', accent: '#F59E0B', dark: true } },
  { keys: ['그레이', '심플', '미니멀', '모던', '기본', '베이직'], pal: { c1: '#F1F5F9', c2: '#E2E8F0', accent: '#4F46E5' } },
  { keys: ['보라', '퍼플', '라벤더'], pal: { c1: '#EEF1F8', c2: '#DDE3F0', accent: '#7C3AED' } },
];
const DEFAULT_PAL: Palette = { c1: '#EEF1F8', c2: '#DDE3F0', accent: '#4F46E5' };

const BADGES: { keys: string[]; label: string }[] = [
  { keys: ['신상', '신제품', '새로', '런칭', '출시', 'new'], label: 'NEW' },
  { keys: ['단독', '독점', 'exclusive'], label: '단독' },
  { keys: ['한정', '리미티드', 'limited'], label: '한정' },
  { keys: ['할인', '세일', '특가', '%', 'sale'], label: '할인' },
  { keys: ['이벤트', '응모', '추첨'], label: 'EVENT' },
];

const CTAS: { keys: string[]; label: string }[] = [
  { keys: ['구매', '사기', '주문', '쇼핑'], label: '지금 구매' },
  { keys: ['예약', '사전'], label: '사전 예약' },
  { keys: ['응모', '참여', '추첨'], label: '응모하기' },
  { keys: ['구독', '가입'], label: '구독하기' },
  { keys: ['혜택', '쿠폰', '적립'], label: '혜택 받기' },
  { keys: ['다운', '설치', '앱'], label: '앱에서 보기' },
  { keys: ['예매', '티켓'], label: '예매하기' },
];

function matchLabel<T extends { keys: string[] }>(table: (T & { label: string })[], text: string): string {
  const s = text.toLowerCase();
  for (const row of table) if (row.keys.some((k) => s.includes(k.toLowerCase()))) return row.label;
  return '';
}

// 프롬프트에서 명령어·속성 지시를 걷어내고 제목/서브타이틀로 분리
function craftText(promptRaw: string): { title: string; subtitle: string } {
  let t = promptRaw.replace(/[.]/g, ' ').trim();
  // 끝의 명령형("~배너 만들어줘/제작해줘/해줘") 제거
  t = t.replace(/(배너\s*)?(를|을)?\s*(만들어\s*줘|만들어줘|만들어|제작(해)?\s*줘|생성(해)?\s*줘|해\s*줘)\s*$/g, '').trim();
  t = t.replace(/\s*배너\s*$/g, '').trim();
  const parts = t.split(/[,\n·/]/).map((x) => x.trim()).filter(Boolean);
  // 속성 지시(톤/색/CTA/배경 등)는 본문에서 제외
  const isAttr = (x: string) => /(톤|색상|색|컬러|cta|버튼|배경|그라데이션|팔레트|스타일)/i.test(x);
  // 순수 CTA 지시 클로즈("지금 구매", "사전 예약" 등)는 버튼으로 가므로 문구에서 제외
  const isCtaClause = (x: string) => x.length <= 8 && /^(지금\s*|바로\s*)?(구매|예약|응모|구독|다운(로드)?|설치|예매|주문|참여|가입)(하기|하러)?$/.test(x.replace(/\s+/g, ' ').trim());
  // 순수 스타일/톤 지시 클로즈("럭셔리 다크", "파스텔" 등)도 문구가 아니라 디자인 지시 → 제외
  const STYLE_WORDS = ['다크', '라이트', '럭셔리', '프리미엄', '모던', '심플', '미니멀', '베이직', '밝은', '어두운', '파스텔', '비비드', '핑크', '로즈', '민트', '그린', '초록', '블루', '스카이', '네이비', '그레이', '보라', '퍼플', '라벤더', '피치', '골드', '블랙', '화이트'];
  const isStyleClause = (x: string) => { const toks = x.split(/\s+/).filter(Boolean); return toks.length > 0 && toks.every((tk) => STYLE_WORDS.includes(tk)); };
  const content = parts.filter((x) => !isAttr(x) && !isCtaClause(x) && !isStyleClause(x));
  const head = (content[0] ?? parts[0] ?? '').trim();
  const tail = content.slice(1).join(' · ').trim();
  return { title: head || '새로운 소식을 확인하세요', subtitle: tail };
}

export function generateComposeDraft(promptRaw: string): ComposeDraft {
  const prompt = promptRaw.trim();
  const s = prompt.toLowerCase();
  const has = (...ws: string[]) => ws.some((w) => s.includes(w.toLowerCase()));

  const pal = PALETTES.find((p) => p.keys.some((k) => s.includes(k.toLowerCase())))?.pal ?? DEFAULT_PAL;
  const titleColor = pal.dark ? '#FFFFFF' : '#0F172A';
  const subColor = pal.dark ? '#CBD5E1' : '#64748B';

  const badgeText = matchLabel(BADGES, prompt);
  const ctaText = matchLabel(CTAS, prompt) || '자세히 보기';
  const { title, subtitle } = craftText(prompt);

  // 짧은 카피는 크게, 길면 보통
  const titleSize = title.length <= 16 ? 'xl' : title.length <= 26 ? 'lg' : 'md';
  // 세로형 느낌(가운데/상단 이미지) 힌트
  const centered = has('가운데', '센터', '심플', '미니멀');

  return {
    title,
    subtitle,
    bgColor: pal.c1,
    bgColor2: pal.c2,
    bgType: 'gradient',
    titleColor,
    subColor,
    titleSize,
    align: centered ? 'center' : 'left',
    imagePos: centered ? 'top' : 'right',
    imgSize: 'lg',
    badgeText,
    badgeColor: pal.accent,
    ctaText,
    ctaColor: pal.accent,
  };
}

// ── 대화형 점진 수정 ─────────────────────────────────────────
// 이미 만든 초안에 이어지는 요청("배경 더 밝게", "CTA를 예약으로", "제목을 …로")을 델타로 반영한다.
// 타깃(색/CTA/배지/이미지/정렬/크기/제목)이 하나도 안 잡히면 새 주제로 보고 전체 재생성.
function palByKeyword(s: string): Palette | null {
  return PALETTES.find((p) => p.keys.some((k) => s.includes(k.toLowerCase())))?.pal ?? null;
}
function extractPhrase(text: string, keys: string[]): string {
  const k = keys.join('|');
  let m = text.match(new RegExp(`(?:${k})\\s*(?:을|를|은|는|:)?\\s*["'“”‘’]([^"'“”‘’]{1,40})["'“”‘’]`));
  if (m) return m[1].trim();
  m = text.match(new RegExp(`(?:${k})\\s*(?:을|를|은|는)?\\s*([^,\\n]{1,40}?)\\s*(?:로|으로)\\s*(?:바꿔|변경|수정|해|설정)`));
  if (m) return m[1].trim();
  return '';
}

export type RefineResult = { patch: Partial<ComposeDraft>; summary: string };

export function refineComposeDraft(promptRaw: string, cur?: Partial<ComposeDraft>): RefineResult {
  const prompt = promptRaw.trim();
  const s = prompt.toLowerCase();
  const has = (...ws: string[]) => ws.some((w) => s.includes(w.toLowerCase()));
  const patch: Partial<ComposeDraft> = {};
  const changes: string[] = [];
  let targeted = false;

  // 명시적 재생성 의도
  if (has('새로 만들', '다시 만들', '처음부터', '아예 새로')) {
    return { patch: generateComposeDraft(prompt), summary: '새 컨셉으로 초안을 다시 만들었어요.' };
  }

  // 배경 색/톤/밝기
  let pal = palByKeyword(s);
  if (!pal && has('밝게', '환하게', '밝은', '화사')) pal = { c1: '#F1F5F9', c2: '#E2E8F0', accent: '#4F46E5' };
  if (!pal && has('어둡게', '어두운', '다크')) pal = { c1: '#334155', c2: '#0F172A', accent: '#F59E0B', dark: true };
  if (pal) {
    patch.bgColor = pal.c1; patch.bgColor2 = pal.c2; patch.bgType = 'gradient';
    patch.titleColor = pal.dark ? '#FFFFFF' : '#0F172A'; patch.subColor = pal.dark ? '#CBD5E1' : '#64748B';
    patch.badgeColor = pal.accent; patch.ctaColor = pal.accent;
    changes.push('배경 색감'); targeted = true;
  }

  // CTA
  if (has('cta 없', 'cta빼', 'cta 빼', '버튼 없', '버튼 빼', 'cta 삭제', 'cta 제거')) { patch.ctaText = ''; changes.push('CTA 제거'); targeted = true; }
  else { const cta = matchLabel(CTAS, prompt); if (cta && has('cta', '버튼', '구매', '예약', '응모', '구독', '혜택', '다운', '예매', '가입')) { patch.ctaText = cta; changes.push(`CTA "${cta}"`); targeted = true; } }

  // 배지
  if (has('배지 없', '배지빼', '배지 빼', '배지 삭제', '뱃지 없')) { patch.badgeText = ''; changes.push('배지 제거'); targeted = true; }
  else { const b = matchLabel(BADGES, prompt); if (b && has('배지', '뱃지', '신상', '단독', '한정', '할인', '이벤트')) { patch.badgeText = b; changes.push(`배지 "${b}"`); targeted = true; } }

  // 이미지 위치
  if (has('이미지', '사진', '상품')) {
    if (has('왼쪽', '좌측')) { patch.imagePos = 'left'; changes.push('이미지 좌측'); targeted = true; }
    else if (has('오른쪽', '우측')) { patch.imagePos = 'right'; changes.push('이미지 우측'); targeted = true; }
    else if (has('위', '상단')) { patch.imagePos = 'top'; changes.push('이미지 상단'); targeted = true; }
    else if (has('아래', '하단')) { patch.imagePos = 'bottom'; changes.push('이미지 하단'); targeted = true; }
    if (has('크게', '키워')) { patch.imgSize = 'lg'; changes.push('이미지 크게'); targeted = true; }
    else if (has('작게', '줄여')) { patch.imgSize = 'sm'; changes.push('이미지 작게'); targeted = true; }
  }

  // 정렬
  if (has('가운데', '센터', '중앙')) { patch.align = 'center'; changes.push('가운데 정렬'); targeted = true; }
  else if (has('왼쪽 정렬', '좌측 정렬', '왼쪽정렬', '좌측정렬')) { patch.align = 'left'; changes.push('좌측 정렬'); targeted = true; }

  // 글자 크기 (이미지 크기와 겹치지 않게: '글자/제목/타이틀' 언급 시)
  if (has('글자', '제목', '타이틀', '텍스트')) {
    if (has('특대', '아주 크게', '제일 크게')) { patch.titleSize = 'xl'; changes.push('글자 특대'); targeted = true; }
    else if (has('크게', '키워')) { patch.titleSize = 'lg'; changes.push('글자 크게'); targeted = true; }
    else if (has('작게', '줄여')) { patch.titleSize = 'sm'; changes.push('글자 작게'); targeted = true; }
  }

  // 제목/서브 명시적 지정
  const title = extractPhrase(prompt, ['제목', '타이틀', '카피']);
  if (title) { patch.title = title; changes.push(`제목 "${title}"`); targeted = true; }
  const sub = extractPhrase(prompt, ['서브타이틀', '서브', '부제', '설명']);
  if (sub) { patch.subtitle = sub; changes.push(`서브 "${sub}"`); targeted = true; }

  if (!targeted) {
    return { patch: generateComposeDraft(prompt), summary: `"${prompt}" 컨셉으로 초안을 만들었어요 — 제목·배경·CTA를 채웠어요.` };
  }
  return { patch, summary: `${changes.join(', ')}을(를) 반영했어요.` };
}

// 후속 다듬기 제안 칩
export const AI_REFINE_SUGGESTIONS = ['배경 더 밝게', '배경 다크하게', '가운데 정렬', '글자 더 크게', 'CTA를 지금 구매로', '배지 NEW 넣어줘'];

// 입력 예시 칩
export const AI_EXAMPLES = [
  '봄 신상 립스틱 프로모션, 핑크 톤, 지금 구매',
  '주말 가족 나들이 제휴 혜택, 그린 톤',
  '프리미엄 요금제 단독 할인, 럭셔리 다크',
  'OTT 구독 이벤트 응모, 블루 톤',
];
