// SB-ETC-117 App 스플래시 등록 · 운영 관리
import { SplashForm } from '../splash-form';
import { createSplash } from '../actions';
export const dynamic = 'force-dynamic';
export default function SplashNewPage() {
  return (
    <div className="mx-auto max-w-5xl p-6">
      <nav className="mb-1 text-[12px] text-muted-foreground">홈 › 운영 관리 › App 스플래시 관리 › App 스플래시 등록</nav>
      <h1 className="mb-5 text-2xl font-bold">App 스플래시 등록</h1>
      <SplashForm mode="new" action={createSplash} />
    </div>
  );
}
