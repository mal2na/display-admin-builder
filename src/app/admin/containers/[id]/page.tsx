import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { setContainerStatus, setDefaultTemplate, addTemplate, duplicateTemplate, importTemplate } from '../actions';
import { restoreTemplate } from '@/app/admin/templates/actions';
import { DISPLAY_STATUS_LABEL, CONTAINER_APPROVAL_STATUS_LABEL, type DisplayStatusKey } from '@/lib/display-taxonomy';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Star, Columns, Archive, RotateCcw, Download } from 'lucide-react';
import { ContainerDetailTabs } from './container-detail-tabs';
import { HistoryTable } from './history-table';
import { TemplateRowActions } from './template-row-actions';
import { ContainerApprovalBar } from './container-approval-bar';

export const dynamic = 'force-dynamic';

const RESULT_LABEL: Record<string, string> = {
  CREATED: '생성', UPDATED: '수정', DELETED: '삭제',
  REVIEW_REQUESTED: '검수 요청', APPROVED: '승인', REJECTED: '반려',
  SCHEDULED: '예약', PUBLISHED: '게시', SUSPENDED: '게시 중지', ROLLED_BACK: '롤백',
};
const RESULT_COLOR: Record<string, string> = {
  CREATED: 'bg-emerald-100 text-emerald-700', UPDATED: 'bg-sky-100 text-sky-700', DELETED: 'bg-rose-100 text-rose-700',
  REVIEW_REQUESTED: 'bg-amber-100 text-amber-800', APPROVED: 'bg-emerald-100 text-emerald-700', REJECTED: 'bg-rose-100 text-rose-700',
  SCHEDULED: 'bg-sky-100 text-sky-700', PUBLISHED: 'bg-indigo-100 text-indigo-700', SUSPENDED: 'bg-orange-100 text-orange-800', ROLLED_BACK: 'bg-violet-100 text-violet-700',
};
// 이력(승인/버전) 상태 라벨 — T우주 이력관리 화면 기준
const APPROVAL_STATUS: Record<string, string> = {
  CREATED: '임시저장',
  UPDATED: '수정',
  REVIEW_REQUESTED: '승인요청',
  APPROVED: '승인완료',
  REJECTED: '반려',
  SCHEDULED: '예약',
  PUBLISHED: '게시',
  SUSPENDED: '게시 중지',
  ROLLED_BACK: '롤백',
};

const STATUS_VARIANT: Record<string, 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  DRAFT: 'outline',
  REVIEW: 'warning',
  REJECTED: 'destructive',
  APPROVED: 'secondary',
  SCHEDULED: 'secondary',
  PUBLISHED: 'success',
  SUSPENDED: 'destructive',
  ENDED: 'outline',
  ROLLED_BACK: 'outline',
  PERSONALIZATION_LIMITED: 'warning',
};

const TYPE_LABELS: Record<string, string> = {
  MAIN: '메인화면',
  MENU: '메뉴',
  CURATION: '기획전',
  BENEFIT: '혜택 영역',
};

// 컨테이너 승인 상태 → 배지 색
const APPROVAL_BADGE_VARIANT: Record<string, 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  DRAFT: 'outline',
  REVIEW: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex border-b last:border-0">
      <div className="w-36 shrink-0 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">{label}</div>
      <div className="flex-1 bg-white px-3 py-2 text-sm text-slate-800">{children}</div>
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
  const addTemplateBound = addTemplate.bind(null, container.id);
  const importTemplateBound = importTemplate.bind(null, container.id);

  // 불러오기 후보: 다른 Container의 활성(비보관) Template — 코너 배치를 통째로 가져올 수 있다
  const importableTemplates = await prisma.template.findMany({
    where: { containerId: { not: container.id }, archivedAt: null },
    orderBy: [{ container: { name: 'asc' } }, { name: 'asc' }],
    include: { container: { select: { name: true } }, _count: { select: { templateCorners: true } } },
  });

  // 이력 관리: 이 전시화면(Container) + 소속 Template의 상태 변경 이력
  const templateIds = container.templates.map((t) => t.id);
  const tNameById = new Map(container.templates.map((t) => [t.id, t.name]));
  const logs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { targetType: 'Container', targetId: container.id },
        { targetType: 'Template', targetId: { in: templateIds } },
      ],
    },
    orderBy: { changedAt: 'desc' },
    take: 200,
  });
  const fmtDate = (d: Date) => d.toISOString().replace('T', ' ').slice(0, 19);
  const statusOf = (json: string | null) => {
    if (!json) return null;
    try {
      const o = JSON.parse(json);
      return o?.status ? (DISPLAY_STATUS_LABEL[o.status as DisplayStatusKey] ?? o.status) : null;
    } catch {
      return null;
    }
  };
  const admin = (n: number) => `관리자${((n % 3) + 3) % 3 + 1}`; // 관리자1~3 순환
  const historyRows = logs.map((l, idx) => {
    const version = logs.length - idx;
    return {
      id: l.id,
      version,
      approvalId: l.id.slice(-10).toUpperCase(),
      target: l.targetType === 'Template' ? (tNameById.get(l.targetId) ?? 'Template') : '전시화면',
      actor: admin(version - 1), // 승인요청자 → 관리자1~3
      status: APPROVAL_STATUS[l.result] ?? l.result,
      result: l.result,
      approver: l.approver ? admin(version) : null, // 승인 담당자 → 관리자1~3
      requestedAt: fmtDate(l.changedAt),
      processedAt: fmtDate(l.changedAt),
      before: statusOf(l.beforeValue),
      after: statusOf(l.afterValue),
      reason: l.reason,
    };
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{container.name}</h1>
            <Badge variant={APPROVAL_BADGE_VARIANT[container.approvalStatus] ?? 'outline'}>
              {CONTAINER_APPROVAL_STATUS_LABEL[container.approvalStatus] ?? container.approvalStatus}
            </Badge>
            {container.status === 'active' ? (
              <Badge variant="success">전시</Badge>
            ) : (
              <Badge variant="outline">미전시</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            실제 반영 기준: Container + Template + 고객 상태 + 노출 조건
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/containers/${container.id}/compare`}>
            <Button variant="outline" size="sm">
              <Columns className="h-3.5 w-3.5" /> 조건그룹 비교
            </Button>
          </Link>
          <form action={toggleStatus}>
            <Button type="submit" variant="outline" size="sm">
              {container.status === 'active' ? '미전시로 전환' : '전시로 전환'}
            </Button>
          </form>
        </div>
      </div>

      {/* 승인 워크플로우 (컨테이너 단위) — 작성중 → 승인 요청 → 승인 대기 → 승인 완료/반려 */}
      <ContainerApprovalBar
        id={container.id}
        approvalStatus={container.approvalStatus}
        rejectReason={container.rejectReason}
        approvedBy={container.approvedBy}
        approvedAt={container.approvedAt ? container.approvedAt.toISOString() : null}
        approvalRequestedAt={container.approvalRequestedAt ? container.approvalRequestedAt.toISOString() : null}
      />

      <ContainerDetailTabs
        historyCount={logs.length}
        history={<HistoryTable rows={historyRows} />}
        info={
          <div className="space-y-6">
      {/* 기본 정보 */}
      <section>
        <h2 className="mb-2 text-sm font-semibold">기본 정보</h2>
        <div className="grid grid-cols-1 overflow-hidden rounded-md border bg-card sm:grid-cols-2">
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
          <Row label="등록일">{container.createdAt.toISOString().slice(0, 16).replace('T', ' ')}</Row>
          <Row label="최근 수정">{container.updatedAt.toISOString().slice(0, 16).replace('T', ' ')}</Row>
        </div>
      </section>

      {/* 메타 정보 */}
      <section>
        <h2 className="mb-2 text-sm font-semibold">메타 정보</h2>
        <div className="grid grid-cols-1 overflow-hidden rounded-md border bg-card sm:grid-cols-2">
          <Row label="사용 여부">{container.metaUse ? '사용' : '미사용'}</Row>
          <Row label="검색 태그">{container.searchTags ?? '—'}</Row>
          <Row label="og:title">{container.ogTitle ?? '—'}</Row>
          <Row label="og:description">{container.ogDescription ?? '—'}</Row>
          <Row label="og:site_name">{container.ogSiteName ?? '—'}</Row>
          <Row label="og:image">{container.ogImage ?? '—'}</Row>
        </div>
      </section>

      {/* 매핑 템플릿 정보 — 조건 그룹 컬럼을 포함한 하나의 통합 테이블 */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-sm font-semibold">매핑 템플릿 정보</h2>
          <span className="text-xs text-muted-foreground">{activeTemplates.length}개</span>
        </div>
        <div className="overflow-hidden rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>로그인 구분</TableHead>
                <TableHead>템플릿명</TableHead>
                <TableHead>기본</TableHead>
                <TableHead>Corner</TableHead>
                <TableHead>전시 상태</TableHead>
                <TableHead>전시 기간</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...activeTemplates]
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
                    <TableRow key={t.id}>
                      <TableCell>
                        <Badge>{t.conditionGroup}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/admin/templates/${t.id}/builder`} className="flex items-center gap-1 text-primary hover:underline">
                          {t.isDefault && <Star className="h-3.5 w-3.5 fill-primary text-primary" />}
                          {t.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {t.isDefault ? (
                          <span className="font-medium text-primary">Y</span>
                        ) : (
                          <form action={setDefault}>
                            <button className="text-muted-foreground underline-offset-2 hover:text-primary hover:underline" title="기본 템플릿으로 지정">
                              N
                            </button>
                          </form>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{t._count.templateCorners}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[t.status] ?? 'outline'}>
                          {DISPLAY_STATUS_LABEL[t.status as DisplayStatusKey] ?? t.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {t.startAt ? `${t.startAt.toISOString().slice(0, 10)} ~` : '상시'}
                      </TableCell>
                      <TableCell className="text-right">
                        {/* 빌더 · 복사 · ⋯(보관) — 보관은 혜택 홈 안에서 확인 팝오버로 인-컨텍스트 처리 */}
                        <TemplateRowActions
                          templateId={t.id}
                          builderHref={`/admin/templates/${t.id}/builder`}
                          duplicateAction={duplicateTemplate.bind(null, container.id, t.id)}
                          archiveBlockReason={archiveBlockReason}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>

          {/* 템플릿 추가 (템플릿.png 필드 전체) — 매핑 템플릿 정보 안에 포함 */}
          <details className="border-t bg-slate-50/60">
            <summary className="cursor-pointer px-4 py-2.5 text-xs font-medium text-primary">＋ 템플릿 추가</summary>
            <form action={addTemplateBound} className="space-y-3 border-t bg-card p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="t-name">템플릿명 *</Label>
                  <Input id="t-name" name="name" placeholder="템플릿명" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-memo">메모</Label>
                  <Input id="t-memo" name="memo" maxLength={30} placeholder="한글/영문/숫자/특수문자 30자 이내" />
                </div>
                <div className="space-y-1.5">
                  <Label>로그인 구분 *</Label>
                  <div className="flex gap-4 pt-1.5 text-sm">
                    <label className="flex items-center gap-1.5"><input type="radio" name="conditionGroup" value="로그인" defaultChecked /> 로그인</label>
                    <label className="flex items-center gap-1.5"><input type="radio" name="conditionGroup" value="비로그인" /> 비로그인</label>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>기본 템플릿 여부 *</Label>
                  <div className="flex gap-4 pt-1.5 text-sm">
                    <label className="flex items-center gap-1.5"><input type="radio" name="isDefault" value="N" defaultChecked /> N</label>
                    <label className="flex items-center gap-1.5"><input type="radio" name="isDefault" value="Y" /> Y</label>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>전시 여부 *</Label>
                  <div className="flex gap-4 pt-1.5 text-sm">
                    <label className="flex items-center gap-1.5"><input type="radio" name="displayOn" value="전시" defaultChecked /> 전시</label>
                    <label className="flex items-center gap-1.5"><input type="radio" name="displayOn" value="미전시" /> 미전시</label>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 pt-1.5 text-sm font-normal">
                    <input type="checkbox" name="startAtOnApproval" /> 시작일을 승인일시로 설정
                  </Label>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-start">전시 기간 시작</Label>
                  <Input id="t-start" name="startAt" type="datetime-local" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-end">전시 기간 종료</Label>
                  <Input id="t-end" name="endAt" type="datetime-local" />
                </div>
              </div>
              <Button type="submit" variant="secondary">
                템플릿 추가하고 빌더 열기
              </Button>
            </form>
          </details>

          {/* 템플릿 불러오기 — 다른 컨테이너의 기존 템플릿(코너 배치 통째)을 가져와 새 매핑 생성 */}
          <details className="border-t bg-slate-50/60">
            <summary className="flex cursor-pointer items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-primary">
              <Download className="h-3.5 w-3.5" /> 템플릿 불러오기
            </summary>
            {importableTemplates.length === 0 ? (
              <p className="border-t bg-card px-4 py-4 text-xs text-muted-foreground">
                불러올 수 있는 다른 컨테이너의 템플릿이 없습니다.
              </p>
            ) : (
              <form action={importTemplateBound} className="space-y-3 border-t bg-card p-4">
                <p className="text-xs text-muted-foreground">
                  다른 컨테이너의 템플릿을 선택하면 <b className="text-foreground">코너 배치를 그대로 복제</b>해 이 컨테이너에 새 템플릿으로 추가합니다. (원본은 변경되지 않습니다.)
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="src-template">불러올 템플릿 *</Label>
                    <Select id="src-template" name="sourceTemplateId" required defaultValue="">
                      <option value="" disabled>
                        컨테이너 · 템플릿을 선택하세요
                      </option>
                      {importableTemplates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.container.name} · {t.name} ({t.conditionGroup}, Corner {t._count.templateCorners}개)
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="import-name">새 템플릿명</Label>
                    <Input id="import-name" name="name" placeholder="비우면 “원본명 (불러옴)”" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>로그인 구분</Label>
                    <div className="flex gap-4 pt-1.5 text-sm">
                      <label className="flex items-center gap-1.5"><input type="radio" name="conditionGroup" value="" defaultChecked /> 원본 그대로</label>
                      <label className="flex items-center gap-1.5"><input type="radio" name="conditionGroup" value="로그인" /> 로그인</label>
                      <label className="flex items-center gap-1.5"><input type="radio" name="conditionGroup" value="비로그인" /> 비로그인</label>
                    </div>
                  </div>
                </div>
                <Button type="submit" variant="secondary">
                  <Download className="h-3.5 w-3.5" /> 불러와서 빌더 열기
                </Button>
              </form>
            )}
          </details>
        </div>
      </section>

      {/* 보관된 템플릿 (soft-delete) — 복구 가능 */}
      {archivedTemplates.length > 0 && (
        <section>
          <div className="mb-2 flex items-center gap-2">
            <Archive className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground">보관된 템플릿</h2>
            <span className="text-xs text-muted-foreground">{archivedTemplates.length}개</span>
          </div>
          <div className="overflow-hidden rounded-md border bg-muted/30">
            {archivedTemplates.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 border-b px-4 py-2.5 last:border-b-0">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium text-muted-foreground">
                    {t.name}
                    <Badge variant="outline">{t.conditionGroup}</Badge>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    보관 {t.archivedAt ? t.archivedAt.toISOString().slice(0, 10) : ''} · Corner {t._count.templateCorners}개
                  </p>
                </div>
                <form action={restoreTemplate.bind(null, t.id)}>
                  <Button type="submit" size="sm" variant="secondary">
                    <RotateCcw className="h-3.5 w-3.5" /> 복구
                  </Button>
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
