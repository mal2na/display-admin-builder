// 전시화면 관리 (테스트) — 컨테이너 상세(읽기 전용). 실제 전시화면 관리 상세와 동일한 데이터를 노출.
//  기본 정보 · 메타 정보 · 매핑 템플릿까지. 템플릿 행을 누르면 디바이스-좌측 빌더로 이동(2026-10-20).
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { CONTAINER_APPROVAL_STATUS_LABEL } from '@/lib/display-taxonomy';
import { PageHeader } from '@/components/page-header';
import { StatusPill, statusTone, ListHeader } from '@/components/ops-ui';
import { Pencil, ChevronRight } from 'lucide-react';
import { ContainersTestShell } from '../../tree-shell';

export const dynamic = 'force-dynamic';

const TYPE_LABELS: Record<string, string> = { MAIN: '메인화면', MENU: '메뉴', CURATION: '기획전', BENEFIT: '혜택 영역' };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex border-b border-[var(--line)]">
      <div className="flex w-[148px] shrink-0 items-center bg-[var(--th)] px-3.5 py-3 text-[13px] font-medium text-[var(--ink2)]">{label}</div>
      <div className="flex-1 bg-white px-3.5 py-3 text-[13px] text-[var(--ink)]">{children}</div>
    </div>
  );
}
function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[15px] font-bold text-[var(--ink)]">{children}</h2>
      {right}
    </div>
  );
}

export default async function ContainersTestDetailPage({ params }: { params: { containerId: string } }) {
  const container = await prisma.container.findUnique({
    where: { id: params.containerId },
    include: {
      parent: { select: { name: true } },
      templates: {
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        include: { _count: { select: { templateCorners: true } } },
      },
    },
  });
  if (!container) notFound();
  const activeTemplates = container.templates.filter((t) => !t.archivedAt);

  return (
    <ContainersTestShell>
      <div className="px-10 py-8 pb-24">
        <PageHeader
          trail={['전시 관리', '전시화면 관리 (테스트)', container.name]}
          title={container.name}
          titleSuffix={
            <div className="flex items-center gap-1.5">
              <StatusPill label={CONTAINER_APPROVAL_STATUS_LABEL[container.approvalStatus] ?? '초안'} tone={statusTone(CONTAINER_APPROVAL_STATUS_LABEL[container.approvalStatus] ?? '')} />
              <StatusPill label={container.status === 'active' ? '전시' : '미전시'} tone={container.status === 'active' ? 'success' : 'neutral'} />
              <span className="rounded-full border border-[var(--warnln)] bg-[var(--warnbg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--warn)]">테스트</span>
            </div>
          }
        />
        <p className="mt-1 text-[13px] text-[var(--ink3)]">실제 반영 기준: Container + Template + 고객 상태 + 노출 조건</p>

        <div className="mt-8 space-y-9">
          {/* 기본 정보 */}
          <section>
            <SectionTitle>기본 정보</SectionTitle>
            <div className="grid grid-cols-1 border-t border-[var(--line)] sm:grid-cols-2">
              <Row label="컨테이너 ID">{container.id.slice(-10)}</Row>
              <Row label="컨테이너 경로">{container.parent?.name ? `${container.parent.name} > ${container.name}` : `${container.name} (최상위)`}</Row>
              <Row label="컨테이너 타입">{container.kind ?? TYPE_LABELS[container.containerType ?? ''] ?? '—'}</Row>
              <Row label="플랫폼">{container.platform ?? container.channel ?? '—'}</Row>
              <Row label="전시 여부">{container.status === 'active' ? '전시' : '미전시'}</Row>
              <Row label="전시 기간">
                {container.startAt ? container.startAt.toISOString().slice(0, 16).replace('T', ' ') : '상시'}
                {' ~ '}
                {container.noEndDate ? '종료 없음' : container.endAt ? container.endAt.toISOString().slice(0, 16).replace('T', ' ') : '상시'}
              </Row>
              <Row label="미리보기 URL">{container.previewUrl ?? '—'}</Row>
              <Row label="등록자">관리자1</Row>
              <Row label="등록일">{container.createdAt.toISOString().slice(0, 16).replace('T', ' ')}</Row>
              <Row label="최근 수정">{container.updatedAt.toISOString().slice(0, 16).replace('T', ' ')}</Row>
            </div>
          </section>

          {/* 메타 정보 */}
          <section>
            <SectionTitle>메타 정보</SectionTitle>
            <div className="grid grid-cols-1 border-t border-[var(--line)] sm:grid-cols-2">
              <Row label="사용 여부">{container.metaUse ? '사용' : '미사용'}</Row>
              <Row label="검색 태그">{container.searchTags ?? '—'}</Row>
              <Row label="og:title">{container.ogTitle ?? '—'}</Row>
              <Row label="og:description">{container.ogDescription ?? '—'}</Row>
              <Row label="og:site_name">{container.ogSiteName ?? '—'}</Row>
              <Row label="og:image">{container.ogImage ?? '—'}</Row>
            </div>
          </section>

          {/* 매핑 템플릿 — 행 클릭 시 디바이스-좌측 빌더로 */}
          <section>
            <ListHeader title="매핑 템플릿 정보" count={activeTemplates.length} unit="개" prefix="총" className="!mt-0" />
            <div className="mt-3 divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {activeTemplates.map((t) => (
                <Link
                  key={t.id}
                  href={`/admin/templates/${t.id}/builder?device=left&from=test`}
                  className="group flex items-center gap-3 px-3 py-3 hover:bg-[var(--ac2)]"
                >
                  <span className="text-[14px] font-semibold text-[var(--ink)]">{t.name}</span>
                  {t.conditionGroup && <span className="text-[13px] text-[var(--ink4)]">· {t.conditionGroup}</span>}
                  {t.isDefault && <span className="rounded-[4px] bg-[var(--ac2)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--ac)]">기본</span>}
                  <span className="text-[13px] text-[var(--ink3)]">코너 {t._count.templateCorners}개</span>
                  <span className="ml-auto inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--ac)]">
                    <Pencil className="h-3.5 w-3.5" /> 빌더 열기
                    <ChevronRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </ContainersTestShell>
  );
}
