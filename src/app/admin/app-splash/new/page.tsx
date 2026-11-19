// SB BO-AIM-DSP-PG574 App 스플래시 등록 · 운영 관리
//   Android/iOS 등록 정보를 한 화면에서 각각 입력(OS 등록/사용 체크로 on/off). 저장 → 목록.
import { SplashRegisterForm } from '../splash-register-form';
import { createSplashDual } from '../actions';
import { PageHeader } from '@/components/page-header';
export const dynamic = 'force-dynamic';
export default function SplashNewPage() {
  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader
        trail={['운영관리', 'App 스플래시 관리', 'App 스플래시 등록']}
        title="App 스플래시 등록"
      />
      <div className="mt-6">
        <SplashRegisterForm action={createSplashDual} />
      </div>
    </div>
  );
}
