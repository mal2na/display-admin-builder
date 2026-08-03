import { AdminMain } from '@/components/admin-main';
import { AdminSidebar } from '@/components/admin-sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* 사이드바 (접기/펴기) */}
      <AdminSidebar />

      {/* 콘텐츠 */}
      <AdminMain>{children}</AdminMain>
    </div>
  );
}
