'use client';

import { useState } from 'react';
import { OpsSection, FieldRow, ReadValue, StatusPill } from '@/components/ops-ui';
import { VERSION_APPROVAL, fmtDateTime } from '@/lib/widget-taxonomy';
import { ImageIcon, X } from 'lucide-react';

export type VersionView = {
  targetApp: string; osType: string; updateDate: string | null; version: string;
  approvalStatus: string;
  recommendVersion: string | null; forceVersion: string | null;
  detailContent: string | null; versionContent: string | null;
  recommendPopupTitle: string | null; recommendPopupContent: string | null; recommendPopupImageUrl: string | null; recommendPopupImageAlt: string | null;
  forcePopupTitle: string | null; forcePopupContent: string | null; forcePopupImageUrl: string | null; forcePopupImageAlt: string | null;
  createdBy: string | null; createdAt: string; updatedBy: string | null; updatedAt: string;
};

function Thumb({ url, onOpen }: { url: string | null; onOpen: () => void }) {
  return (
    <button type="button" onClick={url ? onOpen : undefined}
      className="flex h-36 w-full max-w-[260px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 transition hover:border-indigo-300"
      title={url ? '미리보기' : '등록된 이미지 없음'}>
      {url ? <img src={url} alt="" className="max-h-full max-w-full rounded object-contain p-1" /> : <ImageIcon className="h-8 w-8 text-slate-300" />}
    </button>
  );
}

export function VersionDetailView({ v, topExtra, footer }: { v: VersionView; topExtra?: React.ReactNode; footer?: React.ReactNode }) {
  const [preview, setPreview] = useState<string | null>(null);
  const ap = VERSION_APPROVAL[v.approvalStatus as keyof typeof VERSION_APPROVAL] ?? VERSION_APPROVAL.draft;

  return (
    <div>
      {topExtra}

      <OpsSection title="기본정보">
        <div className="grid grid-cols-2">
          <FieldRow label="대상 App"><ReadValue value={v.targetApp} /></FieldRow>
          <FieldRow label="업데이트 날짜"><ReadValue value={fmtDateTime(v.updateDate)} /></FieldRow>
          <FieldRow label="OS 유형"><ReadValue value={v.osType} /></FieldRow>
          <FieldRow label="승인상태"><StatusPill label={ap.label} tone={ap.tone} /></FieldRow>
          <FieldRow label="App 버전"><ReadValue value={v.version} /></FieldRow>
          <div className="border-b border-slate-100 bg-white" />
          <FieldRow label="권장 업데이트 기준"><ReadValue value={v.recommendVersion ?? '없음'} /></FieldRow>
          <FieldRow label="강제 업데이트 기준"><ReadValue value={v.forceVersion ?? '없음'} /></FieldRow>
        </div>
        <div className="grid grid-cols-2 border-t border-slate-100">
          <FieldRow label="상세내용"><ReadValue value={v.detailContent ?? '-'} /></FieldRow>
          <FieldRow label="버전내용"><ReadValue value={v.versionContent ?? '-'} /></FieldRow>
        </div>
        <div className="grid grid-cols-2 border-t border-slate-100">
          <FieldRow label="권장 업데이트 팝업">
            <div className="space-y-1">
              <ReadValue value={v.recommendPopupTitle ?? '-'} />
              <ReadValue value={v.recommendPopupContent ?? '-'} />
            </div>
          </FieldRow>
          <FieldRow label="강제 업데이트 팝업">
            <div className="space-y-1">
              <ReadValue value={v.forcePopupTitle ?? '-'} />
              <ReadValue value={v.forcePopupContent ?? '-'} />
            </div>
          </FieldRow>
        </div>
        <div className="grid grid-cols-2 border-t border-slate-100">
          <FieldRow label="권장 업데이트 팝업 (제목/내용)">
            <div className="space-y-1.5">
              <Thumb url={v.recommendPopupImageUrl} onOpen={() => setPreview(v.recommendPopupImageUrl)} />
              <ReadValue value={v.recommendPopupImageAlt ?? '접근성을 위해 이미지의 주요 내용을 입력해주세요'} />
              <p className="text-[11px] text-muted-foreground">업로드 된 파일명: app_YYMMDD.jpg</p>
            </div>
          </FieldRow>
          <FieldRow label="강제 업데이트 팝업 (제목/내용)">
            <div className="space-y-1.5">
              <Thumb url={v.forcePopupImageUrl} onOpen={() => setPreview(v.forcePopupImageUrl)} />
              <ReadValue value={v.forcePopupImageAlt ?? '접근성을 위해 이미지의 주요 내용을 입력해주세요'} />
              <p className="text-[11px] text-muted-foreground">업로드 된 파일명: app_YYMMDD.jpg</p>
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
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
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
