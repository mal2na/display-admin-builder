import type { Config } from 'tailwindcss';
// 생성물: scripts/build-tokens.mjs (design/figma-tokens.json 기반)
import designTokens from './tokens.tailwind.cjs';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {

        // ── NC-Channel Product Admin 팔레트로 중립 램프 재정의 ──
        //   기존 코드의 slate-*/gray-*/zinc-* 클래스가 전부 참고 디자인 색으로 전환된다.
        ...(() => {
          const neutral = {
            50: '#f6f7f9',   // --th
            100: '#f1f2f5',
            200: '#e6e7ec',  // --line
            300: '#d3d6de',  // --line2
            400: '#8d92a1',  // --ink3
            500: '#8d92a1',  // --ink3
            600: '#53586a',  // --ink2
            700: '#53586a',  // --ink2
            800: '#2b2e38',
            900: '#1d1e23',  // --ink
            950: '#15161a',
          };
          return { slate: neutral, gray: neutral, zinc: neutral };
        })(),

        // ── 상태 색 램프도 참고 디자인의 의미색으로 통일 ──
        //   emerald/green/teal → 성공, amber/yellow/orange → 주의,
        //   red/rose → 위험, indigo/violet/purple/blue/sky/cyan → 브랜드.
        ...(() => {
          const ok = { 50:'#e9f6ee',100:'#dcf0e4',200:'#bfe2cc',300:'#9ed3b2',400:'#4fa877',500:'#1f8f52',600:'#147a43',700:'#116839',800:'#0d542e',900:'#0a4324',950:'#06301a' };
          const warn = { 50:'#fff4e2',100:'#ffecd0',200:'#f3d3a3',300:'#edbd79',400:'#d78f33',500:'#c06c0d',600:'#a95800',700:'#8f4a00',800:'#753c00',900:'#5e3000',950:'#452300' };
          const bad = { 50:'#fdedef',100:'#fbdfe2',200:'#f5c2c8',300:'#eda0aa',400:'#e05f72',500:'#d63d52',600:'#cf2a3c',700:'#b02232',800:'#8f1b28',900:'#731620',950:'#550f17' };
          const ac = { 50:'#efedfe',100:'#e7e4fd',200:'#d9d5fb',300:'#c0b8f7',400:'#8a7ceb',500:'#5c4ce2',600:'#3a2fd8',700:'#2f25bd',800:'#271e9c',900:'#211a80',950:'#16115a' };
          return {
            emerald: ok, green: ok, teal: ok,
            amber: warn, yellow: warn, orange: warn,
            red: bad, rose: bad,
            indigo: ac, violet: ac, purple: ac, blue: ac, sky: ac, cyan: ac,
          };
        })(),
        // Figma 디자인 토큰(시맨틱) — bg-surface-default, text-text-primary, bg-status-success-fill …
        ...designTokens.colors,
        // 기존 shadcn 토큰 (유지)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      spacing: designTokens.spacing,
      borderRadius: {
        ...designTokens.borderRadius,
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontSize: designTokens.fontSize,
      lineHeight: designTokens.lineHeight,
      letterSpacing: designTokens.letterSpacing,
      fontWeight: designTokens.fontWeight,
      fontFamily: designTokens.fontFamily,
    },
  },
  plugins: [],
};

export default config;
