'use client';

// SB BO-AIM-DSP-PG581 — App 버전 상세정보
//   승인정보(승인상태+적용상태 배지, 요청자/담당자) · 기본정보(read-only) · 담당자정보. 이미지 클릭 → 미리보기 P1.
import { useState } from 'react';
import { OpsSection, FieldRow, ReadValue, StatusPill } from '@/components/ops-ui';
import { VERSION_APPROVAL, fmtDateTime } from '@/lib/widget-taxonomy';
import { ImageIcon, X, Info } from 'lucide-react';

// 라벨 옆 ⓘ 툴팁 (SB 6/7 — 권장/강제 업데이트 기준버전)
function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative ml-1 inline-flex align-middle">
      <Info className="h-3.5 w-3.5 text-slate-400" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 w-60 -translate-x-1/2 rounded-md bg-slate-800 px-2.5 py-1.5 text-[11px] leading-snug text-white opacity-0 shadow-lg transition group-hover:opacity-100">{text}</span>
    </span>
  );
}
// 라벨 + ⓘ 를 함께 넣는 FieldRow (label에 ReactNode 미지원이라 값 영역 상단에 라벨 보조로 둘 수 없어 커스텀 행 사용)
function TipRow({ label, tip, children }: { label: string; tip: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-stretch border-b border-[#dce0e5]">
      <div className="flex items-center bg-[var(--th)] px-4 py-3 text-[14px] font-medium text-[var(--ink2)]">{label}<InfoTip text={tip} /></div>
      <div className="px-4 py-2.5">{children}</div>
    </div>
  );
}

export type VersionView = {
  targetApp: string; osType: string; updateDate: string | null; version: string; applyLabel: string;
  approvalStatus: string; approvalRequester: string | null; approvalManager: string | null; approvalRequestedAt: string | null; approvalProcessedAt: string | null;
  recommendVersion: string | null; forceVersion: string | null;
  detailContent: string | null;
  recommendPopupTitle: string | null; recommendPopupContent: string | null; recommendPopupImageUrl: string | null; recommendPopupImageAlt: string | null;
  forcePopupTitle: string | null; forcePopupContent: string | null; forcePopupImageUrl: string | null; forcePopupImageAlt: string | null;
  createdBy: string | null; createdAt: string; updatedBy: string | null; updatedAt: string;
};

const APPLY_TONE: Record<string, string> = { 적용중: 'success', 적용예정: 'info', 적용종료: 'neutral' };

function Thumb({ url, onOpen }: { url: string | null; onOpen: () => void }) {
  return (
    <button type="button" onClick={url ? onOpen : undefined}
      className="flex h-36 w-full max-w-[260px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 transition hover:border-indigo-300"
      title={url ? '미리보기' : '등록된 이미지 없음'}>
      {url ? <img src={url} alt="" className="max-h-full max-w-full rounded object-contain p-1" /> : <ImageIcon className="h-8 w-8 text-slate-300" />}
    </button>
  );
}

export function VersionDetailView({ v, footer }: { v: VersionView; footer?: React.ReactNode }) {
  const [preview, setPreview] = useState<string | null>(null);
  const ap = VERSION_APPROVAL[v.approvalStatus as keyof typeof VERSION_APPROVAL] ?? VERSION_APPROVAL.draft;
  const showApply = v.approvalStatus === 'approved' && v.applyLabel !== '-';

  return (
    <div>
      {/* 승인 정보 (공통UI) — 배지 + 세로 구분선 + 요청자/담당자(이름·일시). SB PG581 2 */}
      <OpsSection title="승인 정보">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-[#dce0e5] bg-[var(--th)] px-4 py-4">
          <div className="flex shrink-0 items-center gap-2">
            <StatusPill label={ap.label} tone={ap.tone} />
            {showApply && <StatusPill label={v.applyLabel} tone={APPLY_TONE[v.applyLabel] ?? 'neutral'} />}
          </div>
          <div className="hidden h-9 w-px self-center bg-[#dce0e5] sm:block" />
          <div className="grid gap-1.5 text-[13px]">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-0.5">
              <span className="text-[var(--ink2)]">승인 요청자 : <b className="font-semibold text-[var(--ink)]">{v.approvalRequester ?? '-'}</b></span>
              <span className="tabular-nums text-[var(--ink3)]">{v.approvalRequestedAt ? fmtDateTime(v.approvalRequestedAt) : '-'}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-0.5">
              <span className="text-[var(--ink2)]">승인 담당자 : <b className="font-semibold text-[var(--ink)]">{v.approvalManager ?? '-'}</b></span>
              <span className="tabular-nums text-[var(--ink3)]">{v.approvalProcessedAt ? fmtDateTime(v.approvalProcessedAt) : '-'}</span>
            </div>
          </div>
        </div>
      </OpsSection>

      <OpsSection title="기본 정보">
        <div className="grid grid-cols-2">
          <FieldRow label="대상 App"><ReadValue value={v.targetApp} /></FieldRow>
          <FieldRow label="OS 유형"><ReadValue value={v.osType} /></FieldRow>
          <FieldRow label="App 버전"><ReadValue value={v.version} /></FieldRow>
          <FieldRow label="업데이트 일시"><ReadValue value={fmtDateTime(v.updateDate)} /></FieldRow>
          <div className="col-span-2"><FieldRow label="상세내용"><ReadValue value={v.detailContent ?? '-'} /></FieldRow></div>
          <TipRow label="권장 업데이트 기준버전" tip="선택한 버전보다 낮은 버전을 사용하는 고객에게 권장 업데이트 팝업이 노출됩니다."><ReadValue value={v.recommendVersion ?? '없음'} /></TipRow>
          <TipRow label="강제 업데이트 기준버전" tip="선택한 버전보다 낮은 버전을 사용하는 고객은 업데이트 후에만 App을 이용할 수 있습니다."><ReadValue value={v.forceVersion ?? '없음'} /></TipRow>
          <FieldRow label="권장 업데이트 팝업 (제목/내용)">
            <div className="space-y-1"><ReadValue value={v.recommendPopupTitle ?? '-'} /><ReadValue value={v.recommendPopupContent ?? '-'} /></div>
          </FieldRow>
          <FieldRow label="강제 업데이트 팝업 (제목/내용)">
            <div className="space-y-1"><ReadValue value={v.forcePopupTitle ?? '-'} /><ReadValue value={v.forcePopupContent ?? '-'} /></div>
          </FieldRow>
          <FieldRow label="권장 업데이트 이미지 추가">
            <div className="space-y-1.5">
              <Thumb url={v.recommendPopupImageUrl} onOpen={() => setPreview(v.recommendPopupImageUrl)} />
              <ReadValue value={v.recommendPopupImageAlt ?? '-'} />
            </div>
          </FieldRow>
          <FieldRow label="강제 업데이트 이미지 추가">
            <div className="space-y-1.5">
              <Thumb url={v.forcePopupImageUrl} onOpen={() => setPreview(v.forcePopupImageUrl)} />
              <ReadValue value={v.forcePopupImageAlt ?? '-'} />
            </div>
          </FieldRow>
        </div>
      </OpsSection>

      <OpsSection title="담당자 정보">
        <div className="grid grid-cols-2">
          <FieldRow label="등록자"><ReadValue value={v.createdBy ?? '-'} /></FieldRow>
          <FieldRow label="등록일시"><ReadValue value={fmtDateTime(v.createdAt)} /></FieldRow>
          <FieldRow label="최근 수정자"><ReadValue value={v.updatedBy ?? '-'} /></FieldRow>
          <FieldRow label="최근 수정일시"><ReadValue value={fmtDateTime(v.updatedAt)} /></FieldRow>
        </div>
      </OpsSection>

      {footer}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setPreview(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold">이미지 미리보기</h3>
              <button onClick={() => setPreview(null)} className="text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex min-h-[280px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-3">
              <img src={preview} alt="" className="max-h-[60vh] max-w-full rounded object-contain" />
            </div>
            <div className="mt-3 flex justify-end">
              <button onClick={() => setPreview(null)} className="inline-flex h-9 items-center rounded-md bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700">확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
