'use client';

// SB BO-AIM-DSP-PG575 — App 스플래시 상세정보
//   승인정보(승인상태+적용상태 배지, 요청자/담당자) · 기본정보(read-only) · 담당자정보. 이미지 클릭 → 미리보기 P1.
import { useState } from 'react';
import { OpsSection, FieldRow, ReadValue, StatusPill } from '@/components/ops-ui';
import { SPLASH_APPROVAL, fmtDateTime } from '@/lib/widget-taxonomy';
import { ImageIcon, X } from 'lucide-react';

export type SplashView = {
  version: number; osType: string; applyLabel: string; title: string | null; applyStartAt: string | null; updateContent: string | null;
  approvalStatus: string; approvalRequester: string | null; approvalManager: string | null; approvalRequestedAt: string | null; approvalProcessedAt: string | null;
  bgImageUrl: string | null; bgImageAlt: string | null; bgUseYn: boolean;
  animUrl: string | null; animAlt: string | null; animUseYn: boolean;
  eventImageUrl: string | null; eventImageAlt: string | null; eventPostStart: string | null; eventPostEnd: string | null; eventUseYn: boolean;
  createdBy: string | null; createdAt: string; updatedBy: string | null; updatedAt: string;
};

// 적용상태 배지 톤 (승인완료 건만 노출)
const APPLY_TONE: Record<string, string> = { 적용중: 'success', 적용예정: 'info', 적용종료: 'neutral' };

// 이미지/애니 썸네일 (클릭 시 미리보기 팝업 P1)
function Thumb({ url, onOpen }: { url: string | null; onOpen: () => void }) {
  return (
    <button type="button" onClick={url ? onOpen : undefined}
      className="flex h-40 w-72 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 transition hover:border-indigo-300"
      title={url ? '미리보기' : '등록된 이미지 없음'}>
      {url ? <img src={url} alt="" className="max-h-full max-w-full rounded object-contain" /> : <ImageIcon className="h-8 w-8 text-slate-300" />}
    </button>
  );
}

export function SplashDetailView({ s, footer }: { s: SplashView; footer?: React.ReactNode }) {
  const [preview, setPreview] = useState<string | null>(null);
  const ap = SPLASH_APPROVAL[s.approvalStatus as keyof typeof SPLASH_APPROVAL] ?? SPLASH_APPROVAL.draft;
  const showApply = s.approvalStatus === 'approved' && s.applyLabel !== '-';

  return (
    <div>
      <OpsSection title="승인 정보">
        {/* 승인상태 + 적용상태 배지(승인완료 건만) — SB 2 영역 */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#dce0e5] bg-[var(--th)] px-4 py-3">
          <StatusPill label={ap.label} tone={ap.tone} />
          {showApply && <StatusPill label={s.applyLabel} tone={APPLY_TONE[s.applyLabel] ?? 'neutral'} />}
        </div>
        <div className="grid grid-cols-2">
          <FieldRow label="승인 요청자">
            <ReadValue value={s.approvalRequester ? `${s.approvalRequester}${s.approvalRequestedAt ? `  ·  ${fmtDateTime(s.approvalRequestedAt)}` : ''}` : '-'} />
          </FieldRow>
          <FieldRow label="승인 담당자">
            <ReadValue value={s.approvalManager ? `${s.approvalManager}${s.approvalProcessedAt ? `  ·  ${fmtDateTime(s.approvalProcessedAt)}` : ''}` : '-'} />
          </FieldRow>
        </div>
      </OpsSection>

      <OpsSection title="기본 정보">
        <div className="grid grid-cols-2">
          <FieldRow label="버전"><ReadValue value={s.approvalStatus === 'approved' ? s.version : '-'} /></FieldRow>
          <FieldRow label="OS 유형"><ReadValue value={s.osType} /></FieldRow>
          <FieldRow label="적용 상태"><ReadValue value={s.applyLabel} /></FieldRow>
          <FieldRow label="적용시작일시"><ReadValue value={fmtDateTime(s.applyStartAt)} /></FieldRow>
          <div className="col-span-2"><FieldRow label="제목"><ReadValue value={s.title ?? '-'} /></FieldRow></div>
          <FieldRow label="배경 이미지">
            <div className="space-y-1.5">
              <Thumb url={s.bgImageUrl} onOpen={() => setPreview(s.bgImageUrl)} />
              <ReadValue value={s.bgImageAlt ?? '-'} />
              <p className="text-[11px] text-slate-400">권장 AOS 1028 × 1920 / iOS 1125 × 2436 px · JPG/JPEG/PNG/GIF/BMP</p>
            </div>
          </FieldRow>
          <FieldRow label="애니메이션">
            <div className="space-y-1.5">
              <Thumb url={s.animUrl} onOpen={() => setPreview(s.animUrl)} />
              <ReadValue value={s.animAlt ?? '-'} />
              <p className="text-[11px] text-slate-400">로띠(Json) 파일 형식만 업로드 가능합니다</p>
              {/* SB 3-6 [TBD] 애니메이션 미리보기 활성화 여부 — 개발 확인 필요 */}
              <div className="inline-flex items-center gap-1.5 rounded-md border border-[#f0a04a] bg-[#fff7ed] px-2.5 py-1 text-[11px] font-medium text-[#b45309]">[TBD · 개발 확인] 애니메이션 미리보기 활성화 여부</div>
            </div>
          </FieldRow>
          <FieldRow label="배경 이미지 사용 여부"><ReadValue value={s.bgUseYn ? 'Y' : 'N'} /></FieldRow>
          <FieldRow label="애니메이션 사용 여부"><ReadValue value={s.animUseYn ? 'Y' : 'N'} /></FieldRow>
          {/* 이벤트 이미지 (3-10~3-13) */}
          <div className="col-span-2">
            <FieldRow label="이벤트 이미지">
              <div className="space-y-1.5">
                <Thumb url={s.eventImageUrl} onOpen={() => setPreview(s.eventImageUrl)} />
                <ReadValue value={s.eventImageAlt ?? '-'} />
                <p className="text-[11px] text-slate-400">권장 720 × 200 px · JPG/JPEG/PNG/GIF/BMP</p>
              </div>
            </FieldRow>
          </div>
          <FieldRow label="이벤트 이미지 URL"><ReadValue value={s.eventImageUrl ?? '-'} /></FieldRow>
          <FieldRow label="이벤트 이미지 게시 기간">
            <ReadValue value={s.eventPostStart || s.eventPostEnd ? `${fmtDateTime(s.eventPostStart)} ~ ${fmtDateTime(s.eventPostEnd)}` : '-'} />
          </FieldRow>
          <div className="col-span-2"><FieldRow label="이벤트 이미지 사용 여부"><ReadValue value={s.eventUseYn ? 'Y' : 'N'} /></FieldRow></div>
        </div>
      </OpsSection>

      <OpsSection title="담당자 정보">
        <div className="grid grid-cols-2">
          <FieldRow label="등록자"><ReadValue value={s.createdBy ?? '-'} /></FieldRow>
          <FieldRow label="등록일시"><ReadValue value={fmtDateTime(s.createdAt)} /></FieldRow>
          <FieldRow label="최근 수정자"><ReadValue value={s.updatedBy ?? '-'} /></FieldRow>
          <FieldRow label="최근 수정일시"><ReadValue value={fmtDateTime(s.updatedAt)} /></FieldRow>
        </div>
      </OpsSection>

      {footer}

      {/* P1 이미지 미리보기 팝업 */}
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
