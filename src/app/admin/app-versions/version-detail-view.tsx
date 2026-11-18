'use client';

// SB BO-AIM-DSP-PG581 — App 버전 상세정보
//   승인정보(승인상태+적용상태 배지, 요청자/담당자) · 기본정보(read-only) · 담당자정보. 이미지 클릭 → 미리보기 P1.
import { useState } from 'react';
import { OpsSection, FieldRow, ReadValue, StatusPill } from '@/components/ops-ui';
import { VERSION_APPROVAL, fmtDateTime } from '@/lib/widget-taxonomy';
import { ImageIcon, X } from 'lucide-react';

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
      <OpsSection title="승인 정보">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#dce0e5] bg-[var(--th)] px-4 py-3">
          <StatusPill label={ap.label} tone={ap.tone} />
          {showApply && <StatusPill label={v.applyLabel} tone={APPLY_TONE[v.applyLabel] ?? 'neutral'} />}
        </div>
        <div className="grid grid-cols-2">
          <FieldRow label="승인 요청자">
            <ReadValue value={v.approvalRequester ? `${v.approvalRequester}${v.approvalRequestedAt ? `  ·  ${fmtDateTime(v.approvalRequestedAt)}` : ''}` : '-'} />
          </FieldRow>
          <FieldRow label="승인 담당자">
            <ReadValue value={v.approvalManager ? `${v.approvalManager}${v.approvalProcessedAt ? `  ·  ${fmtDateTime(v.approvalProcessedAt)}` : ''}` : '-'} />
          </FieldRow>
        </div>
      </OpsSection>

      <OpsSection title="기본 정보">
        <div className="grid grid-cols-2">
          <FieldRow label="대상 App"><ReadValue value={v.targetApp} /></FieldRow>
          <FieldRow label="OS 유형"><ReadValue value={v.osType} /></FieldRow>
          <FieldRow label="App 버전"><ReadValue value={v.version} /></FieldRow>
          <FieldRow label="업데이트 일시"><ReadValue value={fmtDateTime(v.updateDate)} /></FieldRow>
          <div className="col-span-2"><FieldRow label="상세내용"><ReadValue value={v.detailContent ?? '-'} /></FieldRow></div>
          <FieldRow label="권장 업데이트 기준버전"><ReadValue value={v.recommendVersion ?? '없음'} /></FieldRow>
          <FieldRow label="강제 업데이트 기준버전"><ReadValue value={v.forceVersion ?? '없음'} /></FieldRow>
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
