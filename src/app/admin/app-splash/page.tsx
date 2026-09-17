// SB-ETC-116 App 스플래시 관리 목록 (OS유형별 최신 버전) · 운영 관리
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { fmtDateTime } from '@/lib/widget-taxonomy';
import { SplashTabs } from './splash-tabs';

export const dynamic = 'force-dynamic';

export default async function AppSplashPage() {
  const rows = await prisma.appSplash.findMany({ orderBy: [{ osType: 'asc' }, { version: 'desc' }] });
  // OS유형별 최신 버전만
  const latest = new Map<string, (typeof rows)[number]>();
  for (const r of rows) if (!latest.has(r.osType)) latest.set(r.osType, r);
  const list = [...latest.values()];

  return (
    <div className="mx-auto max-w-5xl p-6">
      <nav className="mb-1 text-[12px] text-muted-foreground">홈 › 운영 관리 › App 스플래시 관리</nav>
      <h1 className="mb-3 text-2xl font-bold">App 스플래시 관리</h1>
      <SplashTabs />

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-[12px] text-slate-500">
              <th className="px-4 py-2.5 text-left font-medium">버전</th>
              <th className="px-4 py-2.5 text-left font-medium">OS 유형</th>
              <th className="px-4 py-2.5 text-left font-medium">적용시작일시</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">등록된 스플래시가 없습니다.</td></tr>
            ) : list.map((r) => (
              <tr key={r.id} className="border-b last:border-b-0 hover:bg-slate-50/60">
                <td className="px-4 py-3"><Link href={`/admin/app-splash/${r.id}`} className="font-medium text-slate-800 hover:text-indigo-600">{r.version}</Link></td>
                <td className="px-4 py-3 text-slate-700">{r.osType}</td>
                <td className="px-4 py-3 text-[12px] text-slate-500">{fmtDateTime(r.applyStartAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <Link href="/admin/app-splash/new" className="inline-flex h-9 items-center rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700">등록</Link>
      </div>
    </div>
  );
}
