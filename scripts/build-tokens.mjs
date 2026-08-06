// Figma Variables(디자인 토큰) → CSS 변수 + Tailwind 매핑 생성기
//   입력:  design/figma-tokens.json (Variables to JSON export)
//   출력:  src/app/tokens.css        — :root(라이트) + .dark(다크) CSS 변수
//          tokens.tailwind.cjs        — tailwind.config.ts에서 병합하는 theme 조각
// 실행:  npm run tokens   (node scripts/build-tokens.mjs)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const T = JSON.parse(readFileSync(join(root, 'design/figma-tokens.json'), 'utf8'));

// 이름 정리: 소문자/영숫자/하이픈만, 연속 중복 단어 제거(text-text-primary → text-primary)
const clean = (name) => {
  const safe = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const out = [];
  for (const seg of safe.split('-').filter(Boolean)) if (out[out.length - 1] !== seg) out.push(seg);
  return out.join('-');
};
// 트리 평탄화: 리프(string 또는 {value}) → { 'a-b-c': value }
const flat = (obj, prefix = '', acc = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}-${k}` : `${k}`;
    if (typeof v === 'string') acc[key] = v;
    else if (v && typeof v === 'object' && typeof v.value === 'string') acc[key] = v.value;
    else if (v && typeof v === 'object') flat(v, key, acc);
  }
  return acc;
};

const line = (name, val) => `  --${name}: ${val};`;

// hex → "H S% L%" (shadcn 토큰은 hsl(var(--x)) 로 감싸므로 채널 문자열 필요)
const hexToHsl = (hex) => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let H = 0; const L = (max + min) / 2; const S = d === 0 ? 0 : d / (1 - Math.abs(2 * L - 1));
  if (d !== 0) {
    if (max === r) H = ((g - b) / d) % 6; else if (max === g) H = (b - r) / d + 2; else H = (r - g) / d + 4;
    H *= 60; if (H < 0) H += 360;
  }
  return `${Math.round(H)} ${Math.round(S * 100)}% ${Math.round(L * 100)}%`;
};

// shadcn 기본 토큰 → BSS 시맨틱 토큰 매핑 (앱 전체 리테마). 값이 #으로 시작하면 리터럴.
const BASE = {
  background: 'surface-canvas', foreground: 'text-primary',
  card: 'surface-default', 'card-foreground': 'text-primary',
  primary: 'action-primary-fill-enable', 'primary-foreground': '#ffffff',
  secondary: 'surface-sunken', 'secondary-foreground': 'text-neutral-strong',
  muted: 'surface-hover', 'muted-foreground': 'text-secondary',
  accent: 'surface-brand-subtle', 'accent-foreground': 'text-brand',
  destructive: 'text-danger', 'destructive-foreground': '#ffffff',
  border: 'border-default', input: 'border-default', ring: 'action-primary-fill-enable',
};

// ── 1) 프리미티브 색 램프 → --color-* ──
const primVars = Object.entries(flat(T.primitive.color)).map(([k, v]) => line(`color-${clean(k)}`, v));

// ── 2) 시맨틱 색 (light/dark) — 다크는 같은 이름을 .dark에서 오버라이드 ──
const twColors = {};
const semLight = {}, semDark = {};
const lightVars = Object.entries(flat(T.semantic.light.color)).map(([k, v]) => {
  const name = clean(k); twColors[name] = `var(--${name})`; semLight[name] = v; return line(name, v);
});
const darkVars = Object.entries(flat(T.semantic.dark.color)).map(([k, v]) => { const name = clean(k); semDark[name] = v; return line(name, v); });

// ── shadcn 기본 토큰을 BSS로 재매핑 (앱 전체 색이 바뀜). light→:root, dark→.dark ──
const resolve = (map, tok) => (tok.startsWith('#') ? tok : map[tok]);
const shadcnLight = Object.entries(BASE).map(([k, tok]) => line(k, hexToHsl(resolve(semLight, tok)))).concat([line('radius', '0.5rem')]);
const shadcnDark = Object.entries(BASE).map(([k, tok]) => line(k, hexToHsl(resolve(semDark, tok))));

// ── 3) mapped 컴포넌트 색 (라이트 기준) → --<component>-<leaf> ──
const mappedVars = Object.entries(flat(T.mapped.color)).map(([k, v]) => {
  const name = clean(k); twColors[name] = `var(--${name})`; return line(name, v);
});

// ── 4) 스케일: spacing / radius / icon / typography ──
const scaleVars = [];
const spacing = {}, borderRadius = {}, fontSize = {}, lineHeight = {}, letterSpacing = {}, fontWeight = {};

for (const [k, v] of Object.entries(flat(T.semantic.light.spacing))) { const n = clean(k); scaleVars.push(line(`spacing-${n}`, v)); spacing[n] = `var(--spacing-${n})`; }
for (const [k, v] of Object.entries(flat(T.semantic.light.radius))) { const n = clean(k); scaleVars.push(line(`radius-${n}`, v)); borderRadius[n] = `var(--radius-${n})`; }
for (const [k, v] of Object.entries(flat(T.mapped.radius))) { const n = clean(k); scaleVars.push(line(`radius-${n}`, v)); borderRadius[n] = `var(--radius-${n})`; }
for (const [k, v] of Object.entries(flat(T.semantic.light.icon))) { scaleVars.push(line(`icon-${clean(k)}`, v)); }
for (const [k, v] of Object.entries(flat(T.primitive.typography['font-size']))) { const n = clean(k); scaleVars.push(line(`fs-${n}`, v)); fontSize[n] = `var(--fs-${n})`; }
for (const [k, v] of Object.entries(flat(T.primitive.typography['font-height']))) { const n = clean(k); scaleVars.push(line(`lh-${n}`, v)); lineHeight[n] = `var(--lh-${n})`; }
for (const [k, v] of Object.entries(flat(T.primitive.typography['letter-spacing']))) { const n = clean(k); scaleVars.push(line(`ls-${n}`, v)); letterSpacing[n] = `var(--ls-${n})`; }
for (const [k, v] of Object.entries(flat(T.primitive.typography['font-weight']))) { fontWeight[clean(k)] = v; }

// ── CSS 작성 ──
const css = `/* 자동 생성: scripts/build-tokens.mjs (원본 design/figma-tokens.json). 직접 수정 금지. */
:root {
  /* shadcn 기본 토큰 (BSS 재매핑) — 앱 전체 색 */
${shadcnLight.join('\n')}
  /* 프리미티브 색 램프 */
${primVars.join('\n')}
  /* 스케일 (spacing / radius / icon / font) */
${scaleVars.join('\n')}
  /* 시맨틱 색 (라이트) */
${lightVars.join('\n')}
  /* mapped 컴포넌트 색 */
${mappedVars.join('\n')}
}

.dark {
  /* shadcn 기본 토큰 (다크) */
${shadcnDark.join('\n')}
  /* 시맨틱 색 (다크) — 같은 유틸리티가 자동 전환 */
${darkVars.join('\n')}
}
`;
writeFileSync(join(root, 'src/app/tokens.css'), css);

// ── Tailwind 조각 작성 ──
const tw = `// 자동 생성: scripts/build-tokens.mjs. 직접 수정 금지.
module.exports = {
  colors: ${JSON.stringify(twColors, null, 2)},
  spacing: ${JSON.stringify(spacing, null, 2)},
  borderRadius: ${JSON.stringify(borderRadius, null, 2)},
  fontSize: ${JSON.stringify(fontSize, null, 2)},
  lineHeight: ${JSON.stringify(lineHeight, null, 2)},
  letterSpacing: ${JSON.stringify(letterSpacing, null, 2)},
  fontWeight: ${JSON.stringify(fontWeight, null, 2)},
  fontFamily: { pretendard: ['Pretendard', 'system-ui', 'sans-serif'] },
};
`;
writeFileSync(join(root, 'tokens.tailwind.cjs'), tw);

console.log(`✓ colors: ${primVars.length} primitive / ${lightVars.length} semantic / ${mappedVars.length} mapped  → tailwind ${Object.keys(twColors).length}`);
console.log(`✓ scale: spacing ${Object.keys(spacing).length}, radius ${Object.keys(borderRadius).length}, fontSize ${Object.keys(fontSize).length}, lineHeight ${Object.keys(lineHeight).length}, letterSpacing ${Object.keys(letterSpacing).length}, fontWeight ${Object.keys(fontWeight).length}`);
