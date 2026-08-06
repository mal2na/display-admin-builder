// Figma Variables(디자인 토큰) → CSS 변수 + Tailwind 매핑 생성기
//   입력:  design/figma-tokens.json (Variables to JSON 플러그인 export)
//   출력:  src/app/tokens.css        — :root(라이트) + .dark(다크) CSS 변수
//          tokens.tailwind.cjs        — tailwind.config.ts에서 병합하는 theme 조각
// 실행:  node scripts/build-tokens.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tokens = JSON.parse(readFileSync(join(root, 'design/figma-tokens.json'), 'utf8'));

// 연속 중복 단어 제거: surface-surface-default → surface-default, text-text-primary → text-primary
const collapse = (name) => {
  const out = [];
  for (const seg of String(name).split('-').filter(Boolean)) if (out[out.length - 1] !== seg) out.push(seg);
  return out.join('-');
};
const leaves = (obj, acc = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && 'value' in v) acc[k] = v.value;
    else if (v && typeof v === 'object') leaves(v, acc);
  }
  return acc;
};

// ── 1) 프리미티브 색 램프 → --color-* (참조/투명도용) ──
const primVars = [];
for (const [group, ramp] of Object.entries(tokens.primitive.color)) {
  for (const [step, val] of Object.entries(leaves(ramp))) primVars.push(`  --color-${collapse(group + '-' + step)}: ${val};`);
}

// ── 2) 시맨틱 색 (light/dark) → 의미 토큰. 다크는 같은 이름을 .dark에서 오버라이드 ──
const semColors = {}; // tailwind용: name → var(--name)
const lightVars = [];
const darkVars = [];
for (const [group, tokensInGroup] of Object.entries(tokens.semantic.light.color)) {
  for (const [leaf, val] of Object.entries(leaves(tokensInGroup))) {
    const name = collapse(leaf);
    lightVars.push(`  --${name}: ${val};`);
    semColors[name] = `var(--${name})`;
  }
}
for (const [group, tokensInGroup] of Object.entries(tokens.semantic.dark.color)) {
  for (const [leaf, val] of Object.entries(leaves(tokensInGroup))) darkVars.push(`  --${collapse(leaf)}: ${val};`);
}

// ── 3) 공유 스케일 (spacing / radius / font-size) ──
const spacing = {}, radius = {}, fontSize = {};
const scaleVars = [];
for (const [k, v] of Object.entries(tokens.shared.spacing)) { scaleVars.push(`  --spacing-${k}: ${v};`); spacing[k] = `var(--spacing-${k})`; }
for (const [k, v] of Object.entries(tokens.shared.radius)) { scaleVars.push(`  --radius-${k}: ${v};`); radius[k] = `var(--radius-${k})`; }
for (const [k, v] of Object.entries(tokens.shared['font-size'])) { scaleVars.push(`  --fs-${k}: ${v};`); fontSize[k] = `var(--fs-${k})`; }

// ── CSS 파일 작성 ──
const css = `/* 이 파일은 scripts/build-tokens.mjs 로 생성됩니다. 직접 수정하지 마세요. */
/* 원본: design/figma-tokens.json (Figma Variables) */
:root {
  /* 프리미티브 색 램프 */
${primVars.join('\n')}
  /* 공유 스케일 */
${scaleVars.join('\n')}
  /* 시맨틱 색 (라이트) */
${lightVars.join('\n')}
}

.dark {
  /* 시맨틱 색 (다크) — 같은 유틸리티가 자동 전환됨 */
${darkVars.join('\n')}
}
`;
writeFileSync(join(root, 'src/app/tokens.css'), css);

// ── Tailwind 조각 작성 ──
const tw = `// 이 파일은 scripts/build-tokens.mjs 로 생성됩니다. 직접 수정하지 마세요.
module.exports = {
  colors: ${JSON.stringify(semColors, null, 2)},
  spacing: ${JSON.stringify(spacing, null, 2)},
  borderRadius: ${JSON.stringify(radius, null, 2)},
  fontSize: ${JSON.stringify(fontSize, null, 2)},
  fontFamily: { pretendard: ['Pretendard', 'system-ui', 'sans-serif'] },
};
`;
writeFileSync(join(root, 'tokens.tailwind.cjs'), tw);

console.log(`✓ tokens.css: 색 ${primVars.length}(프리미티브)+${lightVars.length}(시맨틱), 스케일 ${scaleVars.length}`);
console.log(`✓ tokens.tailwind.cjs: colors ${Object.keys(semColors).length}, spacing ${Object.keys(spacing).length}, radius ${Object.keys(radius).length}, fontSize ${Object.keys(fontSize).length}`);
