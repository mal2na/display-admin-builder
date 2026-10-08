import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { updateContainerInfo } from '../../actions';
import { PageHeader } from '@/components/page-header';
import { ChevronLeft } from 'lucide-react';
import { ContainerInfoForm } from './container-info-form';

export const dynamic = 'force-dynamic';

/**
 * 컨테이너 정보 수정 — 모달이 아닌 독립 페이지(2026-10-08 사용자 요청).
 * 폼은 공식 폼 테이블(.ft) 규격, 하단 액션은 .foot.
 */
export default async function ContainerEditPage({ params }: { params: { id: string } }) {
  const c = await prisma.container.findUnique({ where: { id: params.id } });
  if (!c) notFound();

  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader
        trail={['전시관리', '전시화면 관리', c.name, '정보 수정']}
        title="컨테이너 정보 수정"
        back={
          <Link href={`/admin/containers/${c.id}`} className="inline-flex items-center gap-1 text-[12px] text-[var(--ink2)] hover:text-[var(--ac)]">
            <ChevronLeft className="h-3.5 w-3.5" /> {c.name}
          </Link>
        }
      />

      <ContainerInfoForm
        action={updateContainerInfo.bind(null, c.id)}
        cancelHref={`/admin/containers/${c.id}`}
        c={{
          name: c.name,
          kind: c.kind,
          platform: c.platform,
          previewUrl: c.previewUrl,
          status: c.status,
          startAt: c.startAt ? c.startAt.toISOString().slice(0, 16) : null,
          endAt: c.endAt ? c.endAt.toISOString().slice(0, 16) : null,
          noEndDate: c.noEndDate,
          metaUse: c.metaUse,
          searchTags: c.searchTags,
          metaKeywords: c.metaKeywords,
          metaDescription: c.metaDescription,
          ogTitle: c.ogTitle,
          ogDescription: c.ogDescription,
          ogSiteName: c.ogSiteName,
          ogImage: c.ogImage,
        }}
      />
    </div>
  );
}
