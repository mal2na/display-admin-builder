// SB-ETC-117 App 스플래시 등록 · 운영 관리
import { SplashForm } from '../splash-form';
import { createSplash } from '../actions';
import { PageHeader } from '@/components/page-header';
export const dynamic = 'force-dynamic';
export default function SplashNewPage() {
  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader
        trail={['운영 관리', 'App 스플래시 관리', 'App 스플래시 등록']}
        title="App 스플래시 등록"
      />
      <SplashForm mode="new" action={createSplash} />
    </div>
  );
}
