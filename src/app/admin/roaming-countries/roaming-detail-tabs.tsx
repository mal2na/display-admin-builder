'use client';

// SB BO-AIM-DSP-PG565(국가정보) / PG561~564(서비스타입) / PG566(임대로밍) / PG559(변경·승인이력)
//   로밍국가 상세 — 상단 탭(상세정보/변경·승인이력), 상세정보 내 콘텐츠 탭(국가정보+서비스타입 5종).
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { PageTabs } from '@/components/page-tabs';
import { OpsSection, FieldRow, ReadValue, StatusPill, Pager, TABLE_CLS, THEAD_TR_CLS, TBODY_TR_CLS } from '@/components/ops-ui';
import { fmtDateTime, fmtPeriod } from '@/lib/widget-taxonomy';
import { ROAMING_CONTENT_TABS, ROAMING_APPROVAL, dash, type ServiceContent } from '@/lib/roaming';
import { requestApprovalRoaming, cancelRequestRoaming } from './actions';
import { cn } from '@/lib/utils';
import { ImageIcon, X } from 'lucide-react';

export type RoamingSite = { id: string; siteName: string; link: string | null; exposeYn: boolean };
export type RoamingHistRow = {
  id: string; seq: number; version: number | null; status: string;
  requester: string | null; requestedAt: string | null; requestReason: string | null;
  manager: string | null; processedAt: string | null; processReason: string | null;
  changeNote: string | null; canDiff: boolean;
};
export type RoamingDetail = {
  id: string;
  continent: string; nameKo: string; nameEn: string; countryCode: string; mccCode: string | null; gmt: string | null; timeDiff: string | null;
  searchYn: boolean; detailYn: boolean; adjacentCountries: string | null; currencyCode: string | null;
  countryImageUrl: string | null; countryImageAlt: string | null; bgImageUrl: string | null; bgImageAlt: string | null;
  countryImage2Url: string | null; countryImage2Alt: string | null; buttonImageUrl: string | null; buttonImageAlt: string | null;
  faultNoticeYn: boolean; faultNoticeStart: string | null; faultNoticeEnd: string | null; faultNoticeContent: string | null;
  services: Record<'WCDMA' | 'GSM' | 'LTE' | 'CDMA' | '임대로밍', ServiceContent>;
  approvalStatus: string; approvalRequester: string | null; approvalManager: string | null; approvalRequestedAt: string | null; approvalProcessedAt: string | null;
  sites: RoamingSite[];
};

export function RoamingDetailTabs({ d, historyRows }: { d: RoamingDetail; historyRows: RoamingHistRow[] }) {
  const [tab, setTab] = useState<'detail' | 'history'>('detail');
  const [content, setContent] = useState<string>('국가정보');
  const ap = ROAMING_APPROVAL[d.approvalStatus] ?? ROAMING_APPROVAL.draft;

  // 버튼 — 저장/반려/요청취소→수정 · 승인대기→승인요청취소 · 저장→승인요청
  const showEdit = d.approvalStatus !== 'requested';
  const showRequest = d.approvalStatus === 'draft';
  const showCancel = d.approvalStatus === 'requested';

  return (
    <div>
      <PageTabs tabs={[{ key: 'detail', label: '상세 정보' }, { key: 'history', label: '변경/승인이력' }]} value={tab} onChange={(k) => setTab(k as 'detail' | 'history')} />

      <div className="mt-6">
        {tab === 'history' ? <HistoryTab rows={historyRows} /> : (
          <div>
            {/* 승인 정보 (공통UI) */}
            <OpsSection title="승인 정보">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-[#dce0e5] bg-[var(--th)] px-4 py-4">
                <div className="shrink-0"><StatusPill label={ap.label} tone={ap.tone} /></div>
                <div className="hidden h-9 w-px self-center bg-[#dce0e5] sm:block" />
                <div className="grid gap-1.5 text-[13px]">
                  <div className="flex flex-wrap items-center gap-x-6"><span className="text-[var(--ink2)]">승인 요청자 : <b className="font-semibold text-[var(--ink)]">{d.approvalRequester ?? '-'}</b></span><span className="tabular-nums text-[var(--ink3)]">{d.approvalRequestedAt ? fmtDateTime(d.approvalRequestedAt) : '-'}</span></div>
                  <div className="flex flex-wrap items-center gap-x-6"><span className="text-[var(--ink2)]">승인 담당자 : <b className="font-semibold text-[var(--ink)]">{d.approvalManager ?? '-'}</b></span><span className="tabular-nums text-[var(--ink3)]">{d.approvalProcessedAt ? fmtDateTime(d.approvalProcessedAt) : '-'}</span></div>
                </div>
              </div>
            </OpsSection>

            {/* 기본 정보 (시스템 연동값) */}
            <OpsSection title="기본 정보">
              <div className="grid grid-cols-2">
                <div className="col-span-2"><FieldRow label="대륙명"><ReadValue value={d.continent} /></FieldRow></div>
                <FieldRow label="국가명(국문)"><ReadValue value={d.nameKo} /></FieldRow>
                <FieldRow label="국가명(영문)"><ReadValue value={d.nameEn} /></FieldRow>
                <FieldRow label="국가코드"><ReadValue value={d.countryCode} /></FieldRow>
                <FieldRow label="MCC 코드"><ReadValue value={dash(d.mccCode)} /></FieldRow>
                <FieldRow label="GMT시간"><ReadValue value={dash(d.gmt)} /></FieldRow>
                <FieldRow label="시차시간"><ReadValue value={dash(d.timeDiff)} /></FieldRow>
              </div>
            </OpsSection>

            {/* 콘텐츠 탭 (국가정보 + 서비스타입) */}
            <div className="mb-4 flex flex-wrap gap-1.5">
              {ROAMING_CONTENT_TABS.map((t) => (
                <button key={t} type="button" onClick={() => setContent(t)}
                  className={cn('h-8 rounded-full border px-4 text-[13px] font-semibold transition', content === t ? 'border-[var(--ac)] bg-[var(--ac)] text-white' : 'border-[var(--line2)] bg-white text-[var(--ink2)] hover:border-[var(--ac)] hover:text-[var(--ac)]')}>{t}</button>
              ))}
            </div>

            {content === '국가정보' ? <CountryInfoView d={d} /> : <ServiceView s={d.services[content as 'WCDMA']} lease={content === '임대로밍'} />}

            {/* 하단 버튼 */}
            <div className="flex items-center justify-between pt-2">
              <Link href="/admin/roaming-countries" className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">목록</Link>
              <div className="flex gap-2">
                {showEdit && <Link href={`/admin/roaming-countries/${d.id}/edit`} className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">수정</Link>}
                {showRequest && <form action={requestApprovalRoaming.bind(null, d.id)}><button type="submit" className="inline-flex h-9 items-center rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700">승인요청</button></form>}
                {showCancel && <form action={cancelRequestRoaming.bind(null, d.id)}><button type="submit" className="inline-flex h-9 items-center rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700">승인요청 취소</button></form>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 국가정보 콘텐츠 (PG565) ──
function Thumb({ url, alt }: { url: string | null; alt: string | null }) {
  return (
    <div className="space-y-1.5">
      <div className="flex h-28 w-40 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        {url ? <img src={url} alt={alt ?? ''} className="max-h-full max-w-full object-contain" /> : <ImageIcon className="h-7 w-7 text-slate-300" />}
      </div>
      <p className="text-[12px] text-slate-500">{dash(alt)}</p>
    </div>
  );
}

function CountryInfoView({ d }: { d: RoamingDetail }) {
  return (
    <div>
      <OpsSection title="국가 설정">
        <div className="grid grid-cols-2">
          <FieldRow label="로밍국가 검색 허용 여부"><ReadValue value={d.searchYn ? 'Y' : 'N'} /></FieldRow>
          <FieldRow label="로밍국가 상세 설정 여부"><ReadValue value={d.detailYn ? 'Y' : 'N'} /></FieldRow>
          <FieldRow label="인접로밍가능 국가"><ReadValue value={dash(d.adjacentCountries)} /></FieldRow>
          <FieldRow label="통화코드"><ReadValue value={dash(d.currencyCode)} /></FieldRow>
        </div>
      </OpsSection>

      <OpsSection title="이미지 정보">
        <div className="grid grid-cols-2">
          <FieldRow label="국가 대표이미지"><Thumb url={d.countryImageUrl} alt={d.countryImageAlt} /></FieldRow>
          <FieldRow label="배경 이미지"><Thumb url={d.bgImageUrl} alt={d.bgImageAlt} /></FieldRow>
          <FieldRow label="국가 이미지"><Thumb url={d.countryImage2Url} alt={d.countryImage2Alt} /></FieldRow>
          <FieldRow label="버튼 이미지"><Thumb url={d.buttonImageUrl} alt={d.buttonImageAlt} /></FieldRow>
        </div>
      </OpsSection>

      <OpsSection title="장애공지">
        <div className="grid grid-cols-2">
          <FieldRow label="장애공지 여부"><ReadValue value={d.faultNoticeYn ? 'Y' : 'N'} /></FieldRow>
          <FieldRow label="장애공지 기간"><ReadValue value={d.faultNoticeYn ? fmtPeriod(d.faultNoticeStart, d.faultNoticeEnd) : '-'} /></FieldRow>
          {d.faultNoticeYn && <div className="col-span-2"><FieldRow label="장애공지 내용"><div className="whitespace-pre-wrap py-1.5 text-[13px] leading-relaxed text-[var(--ink)]" dangerouslySetInnerHTML={{ __html: dash(d.faultNoticeContent) }} /></FieldRow></div>}
        </div>
      </OpsSection>

      <OpsSection title="관련사이트">
        <div className="overflow-x-auto border-t border-[var(--line2)]">
          <table className={cn(TABLE_CLS, 'min-w-[720px]')}>
            <thead><tr className={THEAD_TR_CLS}><th className="w-14 text-left">No.</th><th className="w-20 text-left">게시여부</th><th className="text-left">사이트명</th><th className="text-left">링크</th></tr></thead>
            <tbody>
              {d.sites.length === 0 ? <tr><td colSpan={4} className="px-3 py-8 text-center text-[var(--ink3)]">등록된 관련사이트가 없습니다.</td></tr>
                : d.sites.map((s, i) => (
                  <tr key={s.id} className={TBODY_TR_CLS}>
                    <td className="text-[var(--ink3)]">{d.sites.length - i}</td>
                    <td className="text-[var(--ink2)]">{s.exposeYn ? 'Y' : 'N'}</td>
                    <td className="text-[var(--ink)]">{s.siteName}</td>
                    <td className="max-w-[320px] truncate text-[var(--ac)]">{s.link ? <a href={s.link} target="_blank" rel="noreferrer" className="hover:underline">{s.link}</a> : '-'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </OpsSection>
    </div>
  );
}

// ── 서비스타입 콘텐츠 (PG561~564 / 임대로밍 PG566) ──
function ServiceView({ s, lease }: { s: ServiceContent; lease?: boolean }) {
  return (
    <div>
      <OpsSection title="서비스 정보">
        <div className="grid grid-cols-2">
          <div className="col-span-2"><FieldRow label="서비스 내용"><ReadValue value={dash(s.serviceInfo)} /></FieldRow></div>
          <FieldRow label="A Band"><ReadValue value={dash(s.aBand)} /></FieldRow>
          <FieldRow label="B Band"><ReadValue value={dash(s.bBand)} /></FieldRow>
          <FieldRow label="AUTO Band"><ReadValue value={dash(s.autoBand)} /></FieldRow>
        </div>
      </OpsSection>

      <OpsSection title="통화방법(걸기)">
        <div className="grid grid-cols-1">
          <FieldRow label="현지"><Html v={s.callMake.local} /></FieldRow>
          <FieldRow label="국내(일반전화)"><Html v={s.callMake.domesticFixed} /></FieldRow>
          <FieldRow label="국내(이동전화)"><Html v={s.callMake.domesticMobile} /></FieldRow>
        </div>
      </OpsSection>

      <OpsSection title="통화방법(받기)">
        <div className="grid grid-cols-1">
          <FieldRow label="한국"><Html v={s.callReceive.korea} /></FieldRow>
          <FieldRow label="현지"><Html v={s.callReceive.local} /></FieldRow>
        </div>
      </OpsSection>

      <OpsSection title="부가서비스 및 주의사항">
        <div className="grid grid-cols-1">
          <FieldRow label="부가서비스"><Html v={s.addon} /></FieldRow>
          <FieldRow label="주의사항(PC)"><Html v={s.cautionPc} /></FieldRow>
          <FieldRow label="주의사항(Mobile)"><Html v={s.cautionMobile} /></FieldRow>
          <FieldRow label="고객센터 수신자부담 전화"><Html v={s.csPhone} /></FieldRow>
        </div>
      </OpsSection>

      <OpsSection title="데이터 설정">
        <div className="grid grid-cols-2">
          <FieldRow label="데이터로밍유무"><ReadValue value={s.dataRoamingYn ? 'Y' : 'N'} /></FieldRow>
          <FieldRow label="DATA 가능 여부"><ReadValue value={s.dataAvailYn ? 'Y' : 'N'} /></FieldRow>
          {s.dataRoamingYn && (
            <div className="col-span-2 grid grid-cols-2">
              <FieldRow label="데이터로밍 사용량"><ReadValue value={`${dash(s.usage1)} · ${dash(s.usage2)} · ${dash(s.usage3)}`} /></FieldRow>
              <FieldRow label="데이터로밍 요금"><ReadValue value={`${dash(s.fee1)} · ${dash(s.fee2)} · ${dash(s.fee3)}`} /></FieldRow>
            </div>
          )}
          <div className="col-span-2"><FieldRow label="SMS">
            <div className="space-y-1">
              <ReadValue value={s.smsYn ? 'Y' : 'N'} />
              {s.smsYn && <div className="flex flex-wrap gap-1.5">{[['수신', s.smsReceive], ['SMS 수신콜키퍼', s.smsKeeper], ['SMS발신', s.smsSend], ['발신번호표시', s.smsShowNumber]].filter(([, on]) => on).map(([l]) => <span key={l as string} className="rounded-full bg-[var(--th)] px-2 py-0.5 text-[11px] font-medium text-[var(--ink2)]">{l as string}</span>)}</div>}
              {s.smsNote && <div className="whitespace-pre-wrap text-[13px] text-[var(--ink2)]">{s.smsNote}</div>}
            </div>
          </FieldRow></div>
        </div>
      </OpsSection>

      {!lease && (
        <OpsSection title="이용가능 지역안내">
          <div className="grid grid-cols-1">
            <FieldRow label="PC"><RegionView mode={s.pcMode} content={s.pcContent} /></FieldRow>
            <FieldRow label="Mobile"><RegionView mode={s.mobileMode} content={s.mobileContent} /></FieldRow>
          </div>
        </OpsSection>
      )}
    </div>
  );
}

function Html({ v }: { v: string }) {
  if (!v || !v.trim()) return <ReadValue value="-" />;
  return <div className="whitespace-pre-wrap py-1.5 text-[13px] leading-relaxed text-[var(--ink)]" dangerouslySetInnerHTML={{ __html: v }} />;
}
function RegionView({ mode, content }: { mode: string; content: string }) {
  const label = mode === 'all' ? '전 지역 가능' : mode === 'link' ? '링크' : '입력(HTML-4000byte)';
  return (
    <div className="space-y-1">
      <div className="text-[13px] font-medium text-[var(--ink2)]">{label}</div>
      {mode !== 'all' && <Html v={content} />}
    </div>
  );
}

// ── 변경/승인이력 탭 (PG559) ──
const HIST_STATUS: Record<string, { label: string; tone: string }> = {
  draft: { label: '임시저장', tone: 'muted' }, requested: { label: '승인대기', tone: 'info' },
  approved: { label: '승인완료', tone: 'success' }, rejected: { label: '승인반려', tone: 'negative' }, cancelled: { label: '요청취소', tone: 'warning' },
};
const PER_PAGE = 10;
function HistoryTab({ rows }: { rows: RoamingHistRow[] }) {
  const [page, setPage] = useState(1);
  const [diffRow, setDiffRow] = useState<RoamingHistRow | null>(null);
  const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const pageSafe = Math.min(page, totalPages);
  const paged = useMemo(() => rows.slice((pageSafe - 1) * PER_PAGE, pageSafe * PER_PAGE), [rows, pageSafe]);
  return (
    <div>
      <div className="overflow-x-auto border-t border-[var(--line2)]">
        <table className={cn(TABLE_CLS, 'min-w-[1080px] whitespace-nowrap')}>
          <thead><tr className={THEAD_TR_CLS}>
            <th className="w-14 text-left">No.</th><th className="w-24 text-left">승인 상태</th><th className="w-16 text-left">버전</th>
            <th className="text-left">승인 요청자</th><th className="text-left">요청 일시</th><th className="text-left">요청 사유</th>
            <th className="text-left">승인 담당자</th><th className="text-left">처리 일시</th><th className="text-left">처리 사유</th><th className="w-24 text-center">변경 내용</th>
          </tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={10} className="px-3 py-10 text-center text-[var(--ink3)]">이력이 없습니다.</td></tr>
              : paged.map((r, i) => {
                const no = rows.length - ((pageSafe - 1) * PER_PAGE + i);
                const s = HIST_STATUS[r.status] ?? HIST_STATUS.draft;
                return (
                  <tr key={r.id} className={TBODY_TR_CLS}>
                    <td className="text-[var(--ink3)]">{no}</td>
                    <td><StatusPill label={s.label} tone={s.tone} /></td>
                    <td className="text-[var(--ink2)]">{r.status === 'approved' && r.version ? `V.${r.version}` : '-'}</td>
                    <td className="text-[var(--ink2)]">{r.requester ?? '-'}</td>
                    <td className="text-[var(--ink3)]">{r.requestedAt ? fmtDateTime(r.requestedAt) : '-'}</td>
                    <td className="max-w-[220px] truncate text-[var(--ink2)]" title={r.requestReason ?? ''}>{r.requestReason ?? '-'}</td>
                    <td className="text-[var(--ink2)]">{r.manager ?? '-'}</td>
                    <td className="text-[var(--ink3)]">{r.processedAt ? fmtDateTime(r.processedAt) : '-'}</td>
                    <td className="max-w-[180px] truncate text-[var(--ink2)]" title={r.processReason ?? ''}>{r.processReason ?? '-'}</td>
                    <td className="text-center"><button type="button" disabled={!r.canDiff} onClick={() => setDiffRow(r)} className="inline-flex h-7 items-center rounded-[6px] border border-[var(--line3)] bg-white px-2.5 text-[12px] font-medium text-[var(--ink2)] transition hover:border-[var(--ac)] hover:text-[var(--ac)] disabled:cursor-not-allowed disabled:border-[var(--line2)] disabled:bg-[var(--th)] disabled:text-[#b3b9c0]">변경 내용</button></td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      <div className="mt-4"><Pager page={pageSafe} totalPages={totalPages} onChange={setPage} /></div>
      {diffRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDiffRow(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between"><h3 className="text-[20px] font-bold text-[var(--ink)]">변경 상세 내용</h3><button onClick={() => setDiffRow(null)} className="text-[var(--ink3)] hover:text-[var(--ink)]"><X className="h-5 w-5" /></button></div>
            <div className="min-h-[96px] whitespace-pre-wrap rounded-lg border border-[var(--line2)] bg-[var(--th)] px-4 py-3 text-[13px] leading-relaxed text-[var(--ink2)]">{diffRow.changeNote?.trim() ? diffRow.changeNote : '직전 버전과 비교해 기록된 변경 내용이 없습니다.'}</div>
            <div className="mt-6 flex justify-end"><button onClick={() => setDiffRow(null)} className="inline-flex h-[38px] items-center rounded-[6px] bg-[var(--ac)] px-4 text-[14px] font-semibold text-white hover:bg-[var(--ac-h)]">확인</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
