import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '전시/관리 어드민 빌더',
  description: 'Atom·Component·Corner·Template·Container 기반 전시 어드민',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard (BSS 기본 서체). 로드 실패 시 시스템 폰트로 폴백 */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
