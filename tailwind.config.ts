import type { Config } from 'tailwindcss';
// 생성물: scripts/build-tokens.mjs (design/figma-tokens.json 기반)
import designTokens from './tokens.tailwind.cjs';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
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
