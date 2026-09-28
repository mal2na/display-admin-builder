'use client';

import { useState } from 'react';
import Link from 'next/link';
import { OpsSection, FieldRow, ReadValue, StatusPill } from '@/components/ops-ui';
import { BANNER_APPROVAL, BANNER_EXPOSE, fmtDateTime, fmtPeriod } from '@/lib/widget-taxonomy';
import { ComposedBanner } from './composed-banner';
import { requestBannerApproval, cancelBannerApproval, approveBannerCampaign, rejectBannerCampaign } from './actions';
import { Send, X as XIcon, Check, Undo2, MapPin } from 'lucide-react';
import { DISPLAY_STATUS_LABEL } from '@/lib/display-taxonomy';
import type { BannerUsage } from './banner-usage';

const LANDING_LABEL: Record<string, string> = { direct: '직접입력', product: '상품', event: '이벤트', none: '연결안함' };
const PAGE_LABEL: Record<string, string> = { current: '내부창', external: '외부창', none: '선택안함' };
const METHOD_LABEL: Record<string, string> = { 이미지형: '이미지 등록', 리스트형: '직접 만들기' };

export type BannerTypeDetail = { type: string; detail: string; useYn?: boolean; imageUrl?: string; bgColor?: string; bgColor2?: string; bgType?: string; title?: string; subtitle?: string; titleColor?: string; subColor?: string; titleSize?: string; align?: string; imagePos?: string; imgSize?: string; imgShape?: string; badgeText?: string; badgeColor?: string; ctaText?: string; ctaColor?: string; rightImageUrl?: string };
export type BannerDetailData = {
  id: string; campaignCode: string; title: string; subtitle: string | null; purpose: string | null; platform: string;
  exposeYn: boolean; publishStart: string | null; publishEnd: string | null;
  approvalStatus: string; approvalRequester: string | null; approvalManager: string | null; approvalRequestedAt: string | null; approvalProcessedAt: string | null;
  landingType: string | null; landingUrl: string | null; pageType: string | null; bannerAlt: string | null;
  typeDetails: BannerTypeDetail[];
  createdBy: string | null; createdAt: string; updatedBy: string | null; updatedAt: string;
};
export type BannerHistoryRow = { id: string; approvalId: string | null; version: number | null; status: string; requester: string | null; manager: string | null; requestedAt: string | null; processedAt: string | null; processReason: string | null; changeNote: string | null };

// 상세유형 문자열에서 (W×H) 파싱 → 표시용 비율/크기
function sizeOf(detail: string): { w: number; h: number } | null {
  const m = detail.match(/(\d+)\s*[×xX*]\s*(\d+)/);
  return m ? { w: Number(m[1]), h: Number(m[2]) } : null;
}

// 승인 처리 바 — 등록(작성중) 후 승인요청 전송 → 취소 / 승인 담당자의 승인·반려까지의 프로세스.
function ApprovalBar({ d, history }: { d: BannerDetailData; history: BannerHistoryRow[] }) {
  const [showReject, setShowReject] = useState(false);
  const status = d.approvalStatus;
  const ap = BANNER_APPROVAL[status as keyof typeof BANNER_APPROVAL] ?? BANNER_APPROVAL.draft;
  const lastReject = history.find((h) => h.status === 'rejected');
  const canRequest = status === 'draft' || status === 'cancelled' || status === 'rejected';
  const btn = 'inline-flex h-9 items-center gap-1.5 rounded-md px-3.5 text-[13px] font-semibold transition disabled:opacity-50';

  return (
    <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-slate-500">승인 상태</span>
          <StatusPill label={ap.label} tone={ap.tone} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span>요청자 <b className="text-slate-600">{d.approvalRequester ?? '-'}</b></span>
          <span>요청일시 <b className="text-slate-600">{fmtDateTime(d.approvalRequestedAt)}</b></span>
          <span>담당자 <b className="text-slate-600">{d.approvalManager ?? '-'}</b></span>
          <span>처리일시 <b className="text-slate-600">{fmtDateTime(d.approvalProcessedAt)}</b></span>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {canRequest && (
            <form action={requestBannerApproval.bind(null, d.id)}>
              <button type="submit" className={btn + ' bg-indigo-600 text-white hover:bg-indigo-700'}><Send className="h-3.5 w-3.5" />승인요청 보내기</button>
            </form>
          )}
          {status === 'requested' && (
            <>
              <form action={cancelBannerApproval.bind(null, d.id)}>
                <button type="submit" className={btn + ' border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}><Undo2 className="h-3.5 w-3.5" />요청 취소</button>
              </form>
              <span className="mx-1 hidden h-5 w-px bg-slate-200 sm:block" />
              <span className="text-[11px] font-medium text-slate-400">승인 담당자</span>
              <button type="button" onClick={() => setShowReject((v) => !v)} className={btn + ' border border-rose-200 bg-white text-rose-600 hover:bg-rose-50'}><XIcon className="h-3.5 w-3.5" />반려</button>
              <form action={approveBannerCampaign.bind(null, d.id)}>
                <button type="submit" className={btn + ' bg-emerald-600 text-white hover:bg-emerald-700'}><Check className="h-3.5 w-3.5" />승인</button>
              </form>
            </>
          )}
          {status === 'approved' && (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-600"><Check className="h-4 w-4" />승인 완료 — 게시 가능</span>
          )}
        </div>
      </div>

      {status === 'draft' && <p className="mt-2.5 text-[11px] text-muted-foreground">작성이 끝나면 <b className="text-slate-600">‘승인요청 보내기’</b>로 검수를 요청하세요. (수정하면 다시 작성중으로 돌아가 재요청이 필요합니다.)</p>}
      {status === 'rejected' && lastReject?.processReason && <p className="mt-2.5 rounded-md bg-rose-50 px-3 py-2 text-[12px] text-rose-600">반려 사유 · {lastReject.processReason}</p>}

      {status === 'requested' && showReject && (
        <form action={rejectBannerCampaign.bind(null, d.id)} className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
          <input name="reason" required placeholder="반려 사유를 입력하세요 (요청자에게 표시됩니다)" className="h-9 flex-1 rounded-md border border-slate-300 px-3 text-[13px] outline-none focus:border-rose-400" />
          <button type="submit" className={btn + ' bg-rose-600 text-white hover:bg-rose-700'}>반려 확정</button>
        </form>
      )}
    </div>
  );
}

export function BannerDetail({ d, history, usage }: { d: BannerDetailData; history: BannerHistoryRow[]; usage: BannerUsage[] }) {
  const [tab, setTab] = useState<'basic' | 'history'>('basic');
  const ex = d.exposeYn ? BANNER_EXPOSE.true : BANNER_EXPOSE.false;
  const ap = BANNER_APPROVAL[d.approvalStatus as keyof typeof BANNER_APPROVAL] ?? BANNER_APPROVAL.requested;
  const tabBtn = (k: typeof tab, label: string) => (
    <button type="button" onClick={() => setTab(k)} className={'-mb-px border-b-2 pb-2 text-sm ' + (tab === k ? 'border-indigo-600 font-semibold text-indigo-700' : 'border-transparent text-muted-foreground hover:text-slate-700')}>{label}</button>
  );

  return (
    <div>
      <div className="mb-3 flex items-start justify-between">
        <div>
          <nav className="mb-1 text-[12px] text-muted-foreground">홈 › 전시관리 › 배너 캠페인 관리 › 배너캠페인 상세</nav>
          <h1 className="text-2xl font-bold">배너캠페인 상세</h1>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <span>승인상태</span><StatusPill label={ap.label} tone={ap.tone} />
        </div>
      </div>

      {/* 승인 프로세스 — 등록(작성중) → 승인요청 → 승인/반려 */}
      <ApprovalBar d={d} history={history} />

      <div className="mb-5 flex gap-5 border-b">
        {tabBtn('basic', '기본 정보')}
        {tabBtn('history', '이력 관리')}
      </div>

      {tab === 'basic' && (<>

      {/* 입력/수정 폼과 동일한 섹션 순서: 기본 정보 → 전시 설정 → 랜딩 설정 → 유형상세 */}
      <OpsSection title="기본 정보">
        <div className="grid grid-cols-1">
          <FieldRow label="배너캠페인 ID"><ReadValue value={d.campaignCode} /></FieldRow>
          <FieldRow label="배너캠페인(타이틀)"><ReadValue value={d.title} /></FieldRow>
          <FieldRow label="서브타이틀"><ReadValue value={d.subtitle ?? '-'} /></FieldRow>
          <FieldRow label="플랫폼"><ReadValue value={d.platform} /></FieldRow>
        </div>
      </OpsSection>

      <OpsSection title="전시 설정">
        <div className="grid grid-cols-1">
          <FieldRow label="전시여부"><StatusPill label={ex.label} tone={ex.tone} /></FieldRow>
          <FieldRow label="전시기간"><ReadValue value={fmtPeriod(d.publishStart, d.publishEnd)} /></FieldRow>
        </div>
      </OpsSection>

      <OpsSection title="노출 위치">
        {usage.length === 0 ? (
          <p className="px-1 py-2 text-[13px] text-slate-400">아직 어느 전시화면에도 편성되지 않았습니다. <span className="text-slate-400">(빌더에서 배너형 코너에 ‘배너 불러오기’로 편성됩니다)</span></p>
        ) : (
          <div className="space-y-2">
            <p className="text-[12px] text-muted-foreground">이 배너가 편성된 전시화면 · 템플릿 · 코너 <b className="text-indigo-600">{usage.length}곳</b></p>
            <div className="divide-y overflow-hidden rounded-lg border border-slate-200">
              {usage.map((u, i) => (
                <div key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2.5 text-[13px]">
                  <MapPin className="h-4 w-4 shrink-0 text-indigo-400" />
                  <Link href={`/admin/containers/${u.containerId}`} className="font-semibold text-slate-800 hover:text-indigo-600 hover:underline">{u.containerName}</Link>
                  {u.containerType && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-medium text-slate-500">{u.containerType}</span>}
                  <span className="text-slate-300">›</span>
                  <span className="text-slate-600">{u.templateName}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-medium text-slate-500">{(DISPLAY_STATUS_LABEL as Record<string, string>)[u.templateStatus] ?? u.templateStatus}</span>
                  <span className="text-slate-300">›</span>
                  <span className="text-slate-500">{u.cornerName}</span>
                  {u.sizeDetail && <span className="ml-auto rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600">{u.sizeDetail}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </OpsSection>

      <OpsSection title="랜딩 설정">
        <div className="grid grid-cols-1">
          <FieldRow label="랜딩 URL 유형"><ReadValue value={LANDING_LABEL[d.landingType ?? 'direct'] ?? d.landingType} /></FieldRow>
          <FieldRow label="랜딩 값"><ReadValue value={d.landingUrl ?? '-'} /></FieldRow>
          <FieldRow label="페이지 타입"><ReadValue value={PAGE_LABEL[d.pageType ?? 'current'] ?? d.pageType} /></FieldRow>
        </div>
      </OpsSection>

      <OpsSection title="유형상세">
        {/* 폼과 동일: 대체텍스트는 모든 사이즈 공통 1개 */}
        <div className="mx-4 mt-4 mb-1 flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
          <span className="shrink-0 text-[13px] font-medium text-slate-600">이미지 대체텍스트(alt) <span className="text-[11px] text-muted-foreground">(모든 사이즈 공통)</span></span>
          <span className="text-[13px] text-slate-800">{d.bannerAlt ?? '-'}</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-[12px] text-slate-600">
              <th className="w-56 px-4 py-2.5 text-left font-medium">유형 상세</th>
              <th className="w-24 px-4 py-2.5 text-left font-medium">사용여부</th>
              <th className="w-56 px-4 py-2.5 text-left font-medium">노출 위치</th>
              <th className="px-4 py-2.5 text-left font-medium">이미지</th>
            </tr>
          </thead>
          <tbody>
            {d.typeDetails.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">등록된 유형상세가 없습니다.</td></tr>
            ) : d.typeDetails.map((t, i) => {
              const sz = sizeOf(t.detail);
              const maxW = 320, maxH = 200;
              let boxW = maxW, boxH = 120;
              if (sz) { boxW = Math.min(maxW, sz.w / 2); boxH = Math.min(maxH, boxW * (sz.h / sz.w)); }
              return (
                <tr key={i} className="border-b last:border-b-0 align-top">
                  <td className="px-4 py-4 font-medium text-slate-700">{METHOD_LABEL[t.type] ?? t.type} / {t.detail}</td>
                  <td className="px-4 py-4 text-slate-600">{t.useYn === false ? '미사용' : '사용'}</td>
                  <td className="px-4 py-4">
                    {(() => {
                      // 이 규격(유형상세)이 실제로 편성된 위치 — 전시화면·코너 (중복 제거)
                      const locs = Array.from(new Map(usage.filter((u) => u.sizeDetail === t.detail).map((u) => [`${u.containerName}·${u.cornerName}`, u])).values());
                      if (locs.length === 0) return <span className="text-[12px] text-slate-400">미노출</span>;
                      return (
                        <div className="space-y-1">
                          {locs.map((u, k) => (
                            <Link key={k} href={`/admin/containers/${u.containerId}`} className="flex items-center gap-1 text-[12px] text-slate-600 hover:text-indigo-600 hover:underline">
                              <MapPin className="h-3 w-3 shrink-0 text-indigo-400" />{u.containerName} <span className="text-slate-300">·</span> {u.cornerName}
                            </Link>
                          ))}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-4">
                    {t.imageUrl ? (
                      /* 이미지 등록: 배경색 위에 전체를 다 보여줌(contain) */
                      <div className="flex items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50" style={{ width: boxW, height: boxH, backgroundColor: t.bgColor || undefined }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={t.imageUrl} alt={d.bannerAlt ?? ''} className="h-full w-full object-contain" />
                      </div>
                    ) : (
                      /* 직접 만들기: 폼 미리보기와 동일한 렌더러 */
                      <ComposedBanner f={t} width={boxW} height={boxH} />
                    )}
                    <p className="mt-1.5 text-[12px] text-slate-500">{d.bannerAlt || '-'}{sz && <span className="ml-2 text-slate-400">권장 {sz.w}×{sz.h}px</span>}</p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </OpsSection>

      </>)}

      {tab === 'history' && (
      <OpsSection title="이력 관리">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-[12px] text-slate-600">
                <th className="w-16 px-3 py-2.5 text-left font-medium">버전</th>
                <th className="px-3 py-2.5 text-left font-medium">승인ID</th>
                <th className="px-3 py-2.5 text-left font-medium">승인요청자</th>
                <th className="px-3 py-2.5 text-left font-medium">승인요청일시</th>
                <th className="w-24 px-3 py-2.5 text-left font-medium">승인상태</th>
                <th className="px-3 py-2.5 text-left font-medium">승인 담당자</th>
                <th className="px-3 py-2.5 text-left font-medium">처리 일시</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">이력이 없습니다.</td></tr>
              ) : history.map((h, i) => {
                const s = BANNER_APPROVAL[h.status as keyof typeof BANNER_APPROVAL] ?? { label: h.status, tone: 'muted' };
                return (
                  <tr key={h.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2.5 font-medium text-indigo-600 underline-offset-2 hover:underline">{h.version ?? history.length - i}</td>
                    <td className="px-3 py-2.5 font-mono text-[12px] text-slate-600">{h.approvalId ?? '-'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{h.requester ?? '-'}</td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-500">{fmtDateTime(h.requestedAt)}</td>
                    <td className="px-3 py-2.5"><StatusPill label={s.label} tone={s.tone} /></td>
                    <td className="px-3 py-2.5 text-slate-600">{h.manager ?? '-'}</td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-500">{fmtDateTime(h.processedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </OpsSection>
      )}

      <div className="flex items-center justify-between pt-2">
        <Link href="/admin/banner-campaigns" className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">목록</Link>
        <Link href={`/admin/banner-campaigns/${d.id}/edit`} className="inline-flex h-9 items-center rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700">수정</Link>
      </div>
    </div>
  );
}
