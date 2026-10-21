// 전시화면 관리 (테스트) — 컨테이너 클릭 → 상세(실제 전시화면 관리 상세와 동일한 데이터).
//  기본정보·메타정보·연결 전체페이지·매핑 템플릿. 템플릿 행 클릭 → order3 빌더(t/[templateId]).
//  2026-10-21 사용자 요청: 컨테이너는 상세로, 템플릿은 빌더로.
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { CONTAINER_APPROVAL_STATUS_LABEL, DISPLAY_STATUS_LABEL, type DisplayStatusKey, CHIP_BASE } from '@/lib/display-taxonomy';
import { StatusPill, statusTone, TABLE_CLS, THEAD_TR_CLS, TBODY_TR_CLS } from '@/components/ops-ui';
import { cn } from '@/lib/utils';
import { Columns, Pencil, Trash2, Check, X, Download, ChevronRight, Star, ExternalLink } from 'lucide-react';
import { ContainersTestShell } from '../../tree-shell';
import { AddTemplateButton } from '../../add-template-button';
import { LoginGroupSelect } from '../../../containers/[id]/login-group-select';
import { TemplateRowActions } from '../../../containers/[id]/template-row-actions';
import { setDefaultTemplate } from '../../../containers/actions';
import { duplicateTestTemplate } from '../../actions';

export const dynamic = 'force-dynamic';

const TYPE_LABELS: Record<string, string> = { MAIN: '일반', MENU: '메뉴', CURATION: '기획전', BENEFIT: '혜택 영역' };
const BTN = 'inline-flex h-[36px] items-center gap-1.5 rounded-[8px] border border-[var(--line2)] bg-white px-3.5 text-[13px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex border-b border-[var(--line2)]">
      <div className="flex w-[148px] shrink-0 items-center bg-[var(--th)] px-3.5 py-3 text-[13px] font-medium text-[var(--ink2)]">{label}</div>
      <div className="flex-1 bg-white px-3.5 py-3 text-[13px] text-[var(--ink)]">{children}</div>
    </div>
  );
}
function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[16px] font-bold text-[var(--ink)]">{children}</h2>
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
  const fmt = (d: Date | null) => (d ? d.toISOString().slice(0, 16).replace('T', ' ') : '');

  return (
    <ContainersTestShell>
      <div className="px-10 py-8 pb-24">
        <nav className="flex flex-wrap items-center gap-1.5 text-[13px] text-[var(--ink3)]">
          <span>홈</span><ChevronRight className="h-3.5 w-3.5 opacity-50" /><span>전시관리</span>
          <ChevronRight className="h-3.5 w-3.5 opacity-50" /><Link href="/admin/containers-test" className="hover:underline">전시화면 관리 (테스트)</Link>
          <ChevronRight className="h-3.5 w-3.5 opacity-50" /><b className="text-[var(--ink)]">{container.name}</b>
        </nav>

        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[24px] font-bold leading-[32px] tracking-[-0.6px] text-[var(--ink)]">{container.name}</h1>
              <StatusPill label={CONTAINER_APPROVAL_STATUS_LABEL[container.approvalStatus] ?? '초안'} tone={statusTone(CONTAINER_APPROVAL_STATUS_LABEL[container.approvalStatus] ?? '')} />
              <StatusPill label={container.status === 'active' ? '전시' : '미전시'} tone={container.status === 'active' ? 'success' : 'neutral'} />
              <span className="rounded-full border border-[var(--warnln)] bg-[var(--warnbg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--warn)]">테스트</span>
            </div>
            <p className="mt-1 text-[13px] text-[var(--ink3)]">실제 반영 기준: Container + Template + 고객 상태 + 노출 조건</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <span className={BTN}><Columns className="h-3.5 w-3.5" /> 조건그룹 비교</span>
            <span className={BTN}>미전시로 전환</span>
          </div>
        </div>

        {/* 승인 상태 바 */}
        <div className="mt-6 flex items-center gap-3 rounded-[12px] border border-[var(--line2)] bg-white px-5 py-4">
          <span className="text-[13px] text-[var(--ink3)]">승인 상태</span>
          <StatusPill label={CONTAINER_APPROVAL_STATUS_LABEL[container.approvalStatus] ?? '초안 작성중'} tone={statusTone(CONTAINER_APPROVAL_STATUS_LABEL[container.approvalStatus] ?? '')} />
          <span className="text-[13px] text-[var(--ink4)]">요청: {fmt(container.approvalRequestedAt) || '2026-10-07 00:00'}</span>
          <div className="ml-auto flex gap-2">
            <span className="inline-flex h-[36px] items-center gap-1 rounded-[8px] bg-[var(--ac)] px-4 text-[13px] font-semibold text-white"><Check className="h-3.5 w-3.5" /> 승인</span>
            <span className="inline-flex h-[36px] items-center gap-1 rounded-[8px] border border-[#ffccce] bg-white px-4 text-[13px] font-semibold text-[var(--bad)]"><X className="h-3.5 w-3.5" /> 반려</span>
          </div>
        </div>

        {/* 폐기 절차 */}
        <div className="mt-4 flex items-center gap-2 text-[13px] text-[var(--ink3)]">
          <Trash2 className="h-4 w-4" /> 폐기(삭제) 절차 <span className="text-[var(--ink4)]">정상 (폐기 요청 없음)</span>
          <span className="ml-auto inline-flex items-center gap-1 text-[var(--ink3)]"><Trash2 className="h-3.5 w-3.5" /> 폐기 요청</span>
        </div>

        {/* 탭 */}
        <div className="mt-5 flex gap-1 border-b border-[var(--line2)]">
          <span className="-mb-px border-b-2 border-[var(--ac)] px-3.5 py-2.5 text-[14px] font-bold text-[var(--ac)]">상세정보</span>
          <span className="-mb-px border-b-2 border-transparent px-3.5 py-2.5 text-[14px] font-bold text-[var(--ink4)]">변경·승인 이력</span>
        </div>

        <div className="mt-8 space-y-9">
          {/* 기본 정보 */}
          <section>
            <SectionTitle right={<span className={BTN}><Pencil className="h-3.5 w-3.5" /> 정보 수정</span>}>기본 정보</SectionTitle>
            <div className="grid grid-cols-1 border-t border-[var(--line2)] sm:grid-cols-2">
              <Row label="컨테이너 ID">{container.id.slice(-10)}</Row>
              <Row label="컨테이너 경로">{container.parent?.name ? `${container.parent.name} > ${container.name}` : `${container.name} (최상위)`}</Row>
              <Row label="컨테이너 타입">{container.kind ?? TYPE_LABELS[container.containerType ?? ''] ?? '일반'}</Row>
              <Row label="플랫폼">{container.platform ?? container.channel ?? '모바일'}</Row>
              <Row label="전시 여부">{container.status === 'active' ? '전시' : '미전시'}</Row>
              <Row label="전시 기간">{container.startAt ? fmt(container.startAt) : '상시'} ~ {container.noEndDate ? '종료 없음' : container.endAt ? fmt(container.endAt) : '상시'}</Row>
              <Row label="미리보기 URL">{container.previewUrl ?? '—'}</Row>
              <Row label="등록자">관리자1</Row>
              <Row label="등록일">{fmt(container.createdAt)}</Row>
              <Row label="최근 수정">{fmt(container.updatedAt)}</Row>
            </div>
          </section>

          {/* 메타 정보 */}
          <section>
            <SectionTitle>메타 정보</SectionTitle>
            <div className="grid grid-cols-1 border-t border-[var(--line2)] sm:grid-cols-2">
              <Row label="사용 여부">{container.metaUse ? '사용' : '미사용'}</Row>
              <Row label="검색 태그">{container.searchTags ?? '—'}</Row>
              <Row label="og:title">{container.ogTitle ?? '—'}</Row>
              <Row label="og:description">{container.ogDescription ?? '—'}</Row>
              <Row label="og:site_name">{container.ogSiteName ?? '—'}</Row>
              <Row label="og:image">{container.ogImage ?? '—'}</Row>
            </div>
          </section>

          {/* 연결된 전체페이지 정보 */}
          <section>
            <SectionTitle right={<span className={BTN}><ExternalLink className="h-3.5 w-3.5" /> 전체페이지 관리</span>}>연결된 전체페이지 정보</SectionTitle>
            <div className="grid grid-cols-1 border-t border-[var(--line2)] sm:grid-cols-2">
              <Row label="페이지 ID"><span className="text-[var(--ink3)]">연동 대기</span></Row>
              <Row label="메뉴 경로"><span className="text-[var(--ink3)]">연동 대기</span></Row>
              <Row label="페이지 사용여부"><span className="text-[var(--ink3)]">연동 대기</span></Row>
              <Row label="FO 메뉴노출"><span className="text-[var(--ink3)]">연동 대기</span></Row>
              <Row label="URL">{container.previewUrl ?? '—'}</Row>
            </div>
            <p className="mt-2 rounded-[8px] bg-[var(--th)] px-3 py-2 text-[11px] leading-relaxed text-[var(--ink3)]">
              ※ 전체페이지 관리의 「빌더 화면」 유형 페이지와 <b className="text-[var(--ink2)]">1:1</b>로 연결됩니다. 페이지 ID·메뉴 경로·FO 메뉴노출은 <b className="text-[var(--ink2)]">시스템 연동</b>으로 생성되며, 연동 시기는 협의 중(TBD)입니다.
            </p>
          </section>

          {/* 매핑 템플릿 정보 — 행 클릭 시 order3 빌더 */}
          <section>
            <SectionTitle right={<div className="flex items-center gap-2"><span className={BTN}><Download className="h-3.5 w-3.5" /> 템플릿 불러오기</span><AddTemplateButton containerId={container.id} /></div>}>
              매핑 템플릿 정보 <span className="text-[14px] font-normal text-[var(--ink3)]">총 {activeTemplates.length}개</span>
            </SectionTitle>
            <div className="overflow-x-auto border-t border-[var(--line2)]">
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
                  {[...activeTemplates]
                    .sort((a, b) => a.conditionGroup.localeCompare(b.conditionGroup) || Number(b.isDefault) - Number(a.isDefault))
                    .map((t) => {
                      const archiveBlockReason = t.isDefault
                        ? '기본 템플릿은 보관할 수 없습니다. 먼저 다른 템플릿을 기본으로 지정하세요.'
                        : activeTemplates.length <= 1 ? '컨테이너의 유일한 템플릿은 보관할 수 없습니다.' : null;
                      const deleteBlockReason = t.isDefault
                        ? '기본 템플릿은 삭제할 수 없어요. 먼저 다른 템플릿을 기본으로 지정하세요.'
                        : activeTemplates.length <= 1 ? '컨테이너의 유일한 템플릿은 삭제할 수 없어요.'
                          : !['DRAFT', 'REVIEW', 'REJECTED'].includes(t.status) ? '승인된 적 있는 템플릿은 삭제 대신 ‘보관’으로 숨기세요.' : null;
                      return (
                        <tr key={t.id} className={TBODY_TR_CLS}>
                          <td className="h-12 px-3"><LoginGroupSelect templateId={t.id} value={t.conditionGroup} /></td>
                          <td className="h-12 px-3 font-medium">
                            <Link href={`/admin/containers-test/t/${t.id}`} className="flex items-center gap-1 text-[var(--ac)] hover:underline">
                              {t.isDefault && <Star className="h-3.5 w-3.5 fill-[var(--ac)] text-[var(--ac)]" />}{t.name}
                            </Link>
                          </td>
                          <td className="h-12 px-3">
                            {t.isDefault ? (
                              <span className={cn(CHIP_BASE, 'bg-[var(--ac2)] font-semibold text-[var(--ac)]')} title="기본 템플릿">Y</span>
                            ) : (
                              <form action={setDefaultTemplate.bind(null, container.id, t.id)}>
                                <button className="inline-flex h-7 items-center whitespace-nowrap rounded-md border border-[var(--line3)] bg-white px-2.5 text-[12px] font-medium text-[var(--ink3)] transition hover:border-[var(--ac)] hover:text-[var(--ac)]" title="클릭하면 이 템플릿을 기본으로 지정">N · 기본으로</button>
                              </form>
                            )}
                          </td>
                          <td className="h-12 px-3 tabular-nums text-[var(--ink2)]">{t._count.templateCorners}</td>
                          <td className="h-12 px-3">
                            <StatusPill label={DISPLAY_STATUS_LABEL[t.status as DisplayStatusKey] ?? t.status} tone={statusTone(DISPLAY_STATUS_LABEL[t.status as DisplayStatusKey] ?? '')} />
                          </td>
                          <td className="h-12 px-3 text-[var(--ink3)]">{t.startAt ? `${t.startAt.toISOString().slice(0, 10)} ~` : '상시'}</td>
                          <td className="h-12 px-3 text-right">
                            <TemplateRowActions
                              templateId={t.id}
                              builderHref={`/admin/containers-test/t/${t.id}`}
                              duplicateAction={duplicateTestTemplate.bind(null, container.id, t.id)}
                              archiveBlockReason={archiveBlockReason}
                              deleteBlockReason={deleteBlockReason}
                            />
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </ContainersTestShell>
  );
}
