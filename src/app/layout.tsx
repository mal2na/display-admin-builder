import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '전시/관리 어드민 빌더',
  description: 'Atom·Component·Corner·Template·Container 기반 전시 어드민',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
