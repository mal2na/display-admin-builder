// SB-ETC-119 App 스플래시 수정 · 운영 관리
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { SplashForm } from '../../splash-form';
import { updateSplash } from '../../actions';
export const dynamic = 'force-dynamic';
export default async function SplashEditPage({ params }: { params: { id: string } }) {
  const s = await prisma.appSplash.findUnique({ where: { id: params.id } });
  if (!s) notFound();
  return (
    <div className="mx-auto max-w-5xl p-6">
      <nav className="mb-1 text-[12px] text-muted-foreground">홈 › 운영 관리 › App 스플래시 관리 › App 스플래시 수정</nav>
      <h1 className="mb-5 text-2xl font-bold">App 스플래시 수정</h1>
      <SplashForm mode="edit" action={updateSplash.bind(null, s.id)} value={{
        version: s.version, osType: s.osType, updateContent: s.updateContent, applyStartAt: s.applyStartAt?.toISOString() ?? null,
        bgImageUrl: s.bgImageUrl, bgImageAlt: s.bgImageAlt, bgUseYn: s.bgUseYn,
        animUrl: s.animUrl, animAlt: s.animAlt, animUseYn: s.animUseYn,
      }} />
    </div>
  );
}
