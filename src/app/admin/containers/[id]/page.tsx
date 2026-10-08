import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { setContainerStatus, setDefaultTemplate, duplicateTemplate } from '../actions';
import { restoreTemplate } from '@/app/admin/templates/actions';
import { DISPLAY_STATUS_LABEL, CONTAINER_APPROVAL_STATUS_LABEL, CHIP_BASE, type DisplayStatusKey } from '@/lib/display-taxonomy';
import { PageHeader } from '@/components/page-header';
import { ListHeader, THEAD_TR_CLS, TBODY_TR_CLS, TABLE_CLS, StatusPill, statusTone } from '@/components/ops-ui';
import { cn } from '@/lib/utils';
import { Star, Columns, Archive, RotateCcw, Download, Pencil, Plus } from 'lucide-react';
import { ContainerDetailTabs } from './container-detail-tabs';
import { TemplateRowActions } from './template-row-actions';
import { ContainerApprovalBar } from './container-approval-bar';
import { ContainerRetireBar } from './container-retire-bar';

export const dynamic = 'force-dynamic';

const TYPE_LABELS: Record<string, string> = {
  MAIN: '메인화면',
  MENU: '메뉴',
  CURATION: '기획전',
  BENEFIT: '혜택 영역',
};

// 공용 버튼 — 목록/필터와 동일한 38px · r8 규격.
const BTN = 'inline-flex h-[38px] items-center gap-1.5 rounded-[8px] border border-[var(--line2)] bg-white px-4 text-[13px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]';
const BTN_AC = 'inline-flex h-[38px] items-center gap-1.5 rounded-[8px] bg-[var(--ac)] px-5 text-[13px] font-semibold text-white hover:bg-[var(--ac-h)]';

// 정보 행 — 공식 폼 테이블(.ft) 규격: 라벨 칸 회색 148px, 값 칸 흰색, 가로선만.
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

export default async function ContainerDetailPage({ params }: { params: { id: string } }) {
  const container = await prisma.container.findUnique({
    where: { id: params.id },
    include: {
      templates: {
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        include: { _count: { select: { templateCorners: true } } },
      },
    },
  });
  if (!container) notFound();

  // 활성 / 보관(soft-delete) 템플릿 분리
  const activeTemplates = container.templates.filter((t) => !t.archivedAt);
  const archivedTemplates = container.templates.filter((t) => t.archivedAt);

  const nextStatus = container.status === 'active' ? 'inactive' : 'active';
  const toggleStatus = setContainerStatus.bind(null, container.id, nextStatus);

  return (
    <div className="mx-auto max-w-5xl px-8 py-7 pb-20">
      <PageHeader
        trail={['전시관리', '전시화면 관리', container.name]}
        title={container.name}
        subtitle="실제 반영 기준: Container + Template + 고객 상태 + 노출 조건"
        titleSuffix={
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusPill
              label={CONTAINER_APPROVAL_STATUS_LABEL[container.approvalStatus] ?? container.approvalStatus}
              tone={statusTone(CONTAINER_APPROVAL_STATUS_LABEL[container.approvalStatus] ?? '')}
            />
            <StatusPill label={container.status === 'active' ? '전시' : '미전시'} tone={container.status === 'active' ? 'success' : 'neutral'} />
            {container.retireStatus === 'RETIRED' && <StatusPill label="폐기됨" tone="negative" />}
            {container.retireStatus === 'REVIEW' && <StatusPill label="폐기 승인 대기" tone="warning" />}
          </div>
        }
        action={
          <div className="flex items-center gap-2">
            <Link href={`/admin/containers/${container.id}/compare`} className={BTN}>
              <Columns className="h-3.5 w-3.5" /> 조건그룹 비교
            </Link>
            {container.retireStatus !== 'RETIRED' && (
              <form action={toggleStatus}>
                <button type="submit" className={BTN}>
                  {container.status === 'active' ? '미전시로 전환' : '전시로 전환'}
                </button>
              </form>
            )}
          </div>
        }
      />

      <div className="mt-6 space-y-4">
        {/* 승인 워크플로우 (컨테이너 단위) — 작성중 → 승인 요청 → 승인 대기 → 승인 완료/반려 */}
        <ContainerApprovalBar
          id={container.id}
          approvalStatus={container.approvalStatus}
          rejectReason={container.rejectReason}
          approvedBy={container.approvedBy}
          approvedAt={container.approvedAt ? container.approvedAt.toISOString() : null}
          approvalRequestedAt={container.approvalRequestedAt ? container.approvalRequestedAt.toISOString() : null}
        />

        {/* 폐기(삭제 대체) 승인 절차 — 물리 삭제 대신 승인 받아 미전시(soft-delete) */}
        <ContainerRetireBar
          id={container.id}
          retireStatus={container.retireStatus}
          retireReason={container.retireReason}
          retireRequestedAt={container.retireRequestedAt ? container.retireRequestedAt.toISOString() : null}
          retiredBy={container.retiredBy}
          retiredAt={container.retiredAt ? container.retiredAt.toISOString() : null}
        />
      </div>

      <ContainerDetailTabs
        info={
          <div className="mt-8 space-y-9">
            {/* 기본 정보 */}
            <section>
              <SectionTitle
                right={
                  <Link href={`/admin/containers/${container.id}/edit`} className={BTN}>
                    <Pencil className="h-3.5 w-3.5" /> 정보 수정
                  </Link>
                }
              >
                기본 정보
              </SectionTitle>
              <div className="grid grid-cols-1 border-t border-[var(--line)] sm:grid-cols-2">
                <Row label="컨테이너 ID">{container.id.slice(-10)}</Row>
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

            {/* 매핑 템플릿 정보 — 다른 목록 화면과 동일한 평면 테이블(테두리 박스 없음) */}
            <section>
              <ListHeader
                title="매핑 템플릿 정보"
                count={activeTemplates.length}
                unit="개"
                prefix="총"
                className="!mt-0"
                right={
                  <>
                    <Link href={`/admin/containers/${container.id}/templates/import`} className={BTN}>
                      <Download className="h-3.5 w-3.5" /> 템플릿 불러오기
                    </Link>
                    <Link href={`/admin/containers/${container.id}/templates/new`} className={BTN_AC}>
                      <Plus className="h-3.5 w-3.5" /> 템플릿 추가
                    </Link>
                  </>
                }
              />
              <div className="overflow-x-auto border-t border-[var(--line)]">
                <table className={TABLE_CLS}>
                  <thead>
                    <tr className={THEAD_TR_CLS}>
                      <th className="text-left">로그인 구분</th>
                      <th className="text-left">템플릿명</th>
                      <th className="text-left">기본</th>
                      <th className="text-left">Corner</th>
                      <th className="text-left">전시 상태</th>
                      <th className="text-left">전시 기간</th>
                      <th className="text-right">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTemplates.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-16 text-center text-[var(--ink3)]">
                          등록된 템플릿이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      [...activeTemplates]
                        .sort((a, b) => a.conditionGroup.localeCompare(b.conditionGroup) || Number(b.isDefault) - Number(a.isDefault))
                        .map((t) => {
                          const setDefault = setDefaultTemplate.bind(null, container.id, t.id);
                          // 보관(soft-delete) 가능 여부 — 기본/게시중/유일 템플릿은 보관 불가 (archiveTemplate 가드와 동일)
                          const archiveBlockReason = t.isDefault
                            ? '기본 템플릿은 보관할 수 없습니다. 먼저 다른 템플릿을 기본으로 지정하세요.'
                            : t.status === 'PUBLISHED'
                              ? '게시 중인 템플릿은 보관할 수 없습니다. 게시 중지 후 진행하세요.'
                              : activeTemplates.length <= 1
                                ? '컨테이너의 유일한 템플릿은 보관할 수 없습니다.'
                                : null;
                          return (
                            <tr key={t.id} className={TBODY_TR_CLS}>
                              <td className="h-12 px-3">
                                <span className={cn(CHIP_BASE, 'bg-[#DCE0E5] text-[#454F59]')}>{t.conditionGroup}</span>
                              </td>
                              <td className="h-12 px-3 font-medium">
                                <Link href={`/admin/templates/${t.id}/builder`} className="flex items-center gap-1 text-[var(--ac)] hover:underline">
                                  {t.isDefault && <Star className="h-3.5 w-3.5 fill-[var(--ac)] text-[var(--ac)]" />}
                                  {t.name}
                                </Link>
                              </td>
                              <td className="h-12 px-3">
                                {t.isDefault ? (
                                  <span className="font-semibold text-[var(--ac)]">Y</span>
                                ) : (
                                  <form action={setDefault}>
                                    <button className="text-[var(--ink3)] underline-offset-2 hover:text-[var(--ac)] hover:underline" title="기본 템플릿으로 지정">
                                      N
                                    </button>
                                  </form>
                                )}
                              </td>
                              <td className="h-12 px-3 tabular-nums text-[var(--ink2)]">{t._count.templateCorners}</td>
                              <td className="h-12 px-3">
                                <StatusPill
                                  label={DISPLAY_STATUS_LABEL[t.status as DisplayStatusKey] ?? t.status}
                                  tone={statusTone(DISPLAY_STATUS_LABEL[t.status as DisplayStatusKey] ?? '')}
                                />
                              </td>
                              <td className="h-12 px-3 text-[var(--ink3)]">{t.startAt ? `${t.startAt.toISOString().slice(0, 10)} ~` : '상시'}</td>
                              <td className="h-12 px-3 text-right">
                                {/* 빌더 · 복사 · ⋯(보관) — 보관은 확인 팝오버로 인-컨텍스트 처리 */}
                                <TemplateRowActions
                                  templateId={t.id}
                                  builderHref={`/admin/templates/${t.id}/builder`}
                                  duplicateAction={duplicateTemplate.bind(null, container.id, t.id)}
                                  archiveBlockReason={archiveBlockReason}
                                />
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 보관된 템플릿 (soft-delete) — 복구 가능 */}
            {archivedTemplates.length > 0 && (
              <section>
                <SectionTitle>
                  <span className="flex items-center gap-1.5 text-[var(--ink2)]">
                    <Archive className="h-4 w-4" /> 보관된 템플릿
                    <span className="text-[13px] font-normal text-[var(--ink3)]">{archivedTemplates.length}개</span>
                  </span>
                </SectionTitle>
                <div className="border-t border-[var(--line)]">
                  {archivedTemplates.map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-2 border-b border-[var(--line)] bg-[var(--th)] px-4 py-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate text-[13px] font-medium text-[var(--ink2)]">
                          {t.name}
                          <span className={cn(CHIP_BASE, 'bg-[#DCE0E5] text-[#454F59]')}>{t.conditionGroup}</span>
                        </p>
                        <p className="mt-0.5 text-[12px] text-[var(--ink3)]">
                          보관 {t.archivedAt ? t.archivedAt.toISOString().slice(0, 10) : ''} · Corner {t._count.templateCorners}개
                        </p>
                      </div>
                      <form action={restoreTemplate.bind(null, t.id)}>
                        <button type="submit" className={BTN}>
                          <RotateCcw className="h-3.5 w-3.5" /> 복구
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        }
      />
    </div>
  );
}
