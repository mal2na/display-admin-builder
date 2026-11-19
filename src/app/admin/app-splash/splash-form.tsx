'use client';

// SB BO-AIM-DSP-PG577 — App 스플래시 수정
//   버전·OS유형·적용상태는 수정 불가(read-only). 적용시작일시·제목·이미지(alt)·사용여부·이벤트만 수정.
//   하단: 취소 / 저장. 저장 성공 → 목록.
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OpsSection, FieldRow, ReadValue } from '@/components/ops-ui';
import { toLocalInput } from '@/lib/widget-taxonomy';
import { ImageIcon, X } from 'lucide-react';

export type SplashFormValue = {
  version?: number; osType?: string; applyLabel?: string; title?: string | null; applyStartAt?: string | null;
  bgImageUrl?: string | null; bgImageAlt?: string | null; bgUseYn?: boolean;
  animUrl?: string | null; animAlt?: string | null; animUseYn?: boolean;
  eventImageUrl?: string | null; eventImageAlt?: string | null; eventPostStart?: string | null; eventPostEnd?: string | null; eventUseYn?: boolean;
};

// 이미지/애니 — 썸네일(클릭 시 미리보기 P1) + x(삭제 후 재등록) + alt(수정가능) + 안내
function MediaField({ name, urlDefault, altDefault, altPlaceholder, guide, onPreview }: { name: string; urlDefault: string | null; altDefault: string | null; altPlaceholder: string; guide: string[]; onPreview: (u: string) => void }) {
  const [url, setUrl] = useState(urlDefault ?? '');
  return (
    <div className="space-y-2">
      <div className="relative flex h-32 max-w-[260px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
        {url ? (
          <>
            <button type="button" onClick={() => onPreview(url)} className="flex h-full w-full items-center justify-center p-1" title="미리보기"><img src={url} alt="" className="max-h-full max-w-full rounded object-contain" /></button>
            <button type="button" onClick={() => setUrl('')} className="absolute right-1 top-1 rounded-full bg-white/90 p-0.5 text-slate-400 shadow ring-1 ring-slate-200 hover:text-slate-700" title="삭제 후 재등록"><X className="h-3.5 w-3.5" /></button>
          </>
        ) : (
          <ImageIcon className="h-7 w-7 text-slate-300" />
        )}
      </div>
      <input type="hidden" name={`${name}Url`} value={url} readOnly />
      <div className="min-w-0 max-w-[320px] space-y-1.5">
        <Input defaultValue={altDefault ?? ''} name={`${name}Alt`} placeholder={altPlaceholder} maxLength={100} className="h-9 text-sm" />
        <p className="text-[11px] text-slate-400">업로드된 파일명: {url ? url.split('/').pop() : '-'}</p>
        <ul className="space-y-0.5 text-[11px] text-slate-400">{guide.map((g, i) => <li key={i}>· {g}</li>)}</ul>
      </div>
    </div>
  );
}

function YN({ name, on }: { name: string; on: boolean }) {
  return (
    <div className="flex gap-5 text-sm">
      <label className="flex items-center gap-1.5"><input type="radio" name={name} value="true" defaultChecked={on} className="accent-indigo-600" />Y</label>
      <label className="flex items-center gap-1.5"><input type="radio" name={name} value="false" defaultChecked={!on} className="accent-indigo-600" />N</label>
    </div>
  );
}

function ConfirmDialog({ title, desc, confirmLabel = '확인', onConfirm, onClose }: { title: string; desc: React.ReactNode; confirmLabel?: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-2 text-[16px] font-bold text-slate-900">{title}</h3>
        <p className="mb-6 text-[13px] leading-relaxed text-slate-500">{desc}</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>취소</Button>
          <Button type="button" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

export function SplashForm({
  action, value = {}, topExtra, bottomExtra,
}: {
  action: (fd: FormData) => void | Promise<void>;
  value?: SplashFormValue;
  topExtra?: React.ReactNode;
  bottomExtra?: React.ReactNode;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [dialog, setDialog] = useState<null | 'cancel' | 'save'>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const v = value;

  return (
    <form ref={formRef} action={action} className="space-y-6">
      {/* OS유형은 수정 불가라 radio 대신 hidden으로 전달(값 유지) */}
      <input type="hidden" name="osType" value={v.osType ?? 'Android'} readOnly />
      {topExtra}

      <OpsSection title="기본 정보">
        <div className="grid grid-cols-2">
          <FieldRow label="버전"><ReadValue value={v.version ?? '-'} /></FieldRow>
          <FieldRow label="OS 유형"><ReadValue value={v.osType ?? '-'} /></FieldRow>
          <FieldRow label="적용 상태"><ReadValue value={v.applyLabel ?? '-'} /></FieldRow>
          <FieldRow label="적용시작일시" required>
            <Input type="datetime-local" name="applyStartAt" defaultValue={toLocalInput(v.applyStartAt)} className="h-9 w-full max-w-xs text-sm" />
          </FieldRow>
          <div className="col-span-2"><FieldRow label="제목" required>
            <Input name="title" defaultValue={v.title ?? ''} placeholder="스플래시 제목을 입력해주세요." maxLength={100} className="h-9 w-full max-w-[560px] text-sm" />
          </FieldRow></div>
        </div>
        <div className="grid grid-cols-2 border-t border-slate-100">
          <FieldRow label="배경 이미지">
            <MediaField name="bgImage" urlDefault={v.bgImageUrl ?? null} altDefault={v.bgImageAlt ?? null}
              altPlaceholder="alt값 100자 이내 입력" onPreview={setPreview}
              guide={['권장 규격: AOS 1028 × 1920 / iOS 1125 × 2436 px', '권장 형식: JPG, JPEG, PNG, GIF, BMP']} />
          </FieldRow>
          <FieldRow label="애니메이션">
            <MediaField name="anim" urlDefault={v.animUrl ?? null} altDefault={v.animAlt ?? null}
              altPlaceholder="alt값 100자 이내 입력" onPreview={setPreview}
              guide={['로띠(Json) 파일 형식만 업로드 가능합니다']} />
          </FieldRow>
          <FieldRow label="배경 이미지 사용 여부" required>
            <div className="space-y-1"><YN name="bgUseYn" on={v.bgUseYn === true} /><p className="text-[11px] text-slate-400">*배경 이미지 사용여부 ‘N’ 일 경우 앱기본 이미지가 노출됩니다.</p></div>
          </FieldRow>
          <FieldRow label="애니메이션 사용 여부" required>
            <div className="space-y-1"><YN name="animUseYn" on={v.animUseYn === true} /><p className="text-[11px] text-slate-400">*애니메이션 사용여부 ‘N’ 일 경우 기본 이미지가 노출됩니다.</p></div>
          </FieldRow>
        </div>
        {/* 이벤트 이미지 (2-10~2-13) */}
        <div className="grid grid-cols-2 border-t border-slate-100">
          <FieldRow label="이벤트 이미지">
            <MediaField name="eventImage" urlDefault={v.eventImageUrl ?? null} altDefault={v.eventImageAlt ?? null}
              altPlaceholder="alt값 100자 이내 입력" onPreview={setPreview}
              guide={['권장 규격: 720 × 200 px', '권장 형식: JPG, JPEG, PNG, GIF, BMP']} />
          </FieldRow>
          <div className="divide-y divide-slate-100">
            <FieldRow label="이벤트 이미지 URL"><ReadValue value={v.eventImageUrl || '-'} /></FieldRow>
            <FieldRow label="이벤트 이미지 게시 기간">
              <div className="flex items-center gap-1.5">
                <Input type="datetime-local" name="eventPostStart" defaultValue={toLocalInput(v.eventPostStart)} className="h-9 w-full max-w-[180px] text-sm" />
                <span className="text-slate-400">~</span>
                <Input type="datetime-local" name="eventPostEnd" defaultValue={toLocalInput(v.eventPostEnd)} className="h-9 w-full max-w-[180px] text-sm" />
              </div>
            </FieldRow>
            <FieldRow label="이벤트 이미지 사용 여부">
              <div className="space-y-1"><YN name="eventUseYn" on={v.eventUseYn === true} /><p className="text-[11px] text-slate-400">‘N’ 일 경우 기본 이벤트 이미지 없음, 단순 미노출</p></div>
            </FieldRow>
          </div>
        </div>
      </OpsSection>

      {bottomExtra}

      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="outline" onClick={() => setDialog('cancel')}>취소</Button>
        <Button type="button" onClick={() => setDialog('save')}>저장</Button>
      </div>

      {dialog === 'cancel' && <ConfirmDialog title="취소하시겠습니까?" desc="입력한 내용이 저장되지 않습니다. 이전 화면으로 이동하시겠습니까?" onConfirm={() => router.back()} onClose={() => setDialog(null)} />}
      {dialog === 'save' && <ConfirmDialog title="저장하시겠습니까?" desc="입력한 내용이 저장됩니다." confirmLabel="저장" onConfirm={() => { setDialog(null); formRef.current?.requestSubmit(); }} onClose={() => setDialog(null)} />}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setPreview(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold">이미지 미리보기</h3><button onClick={() => setPreview(null)} className="text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button></div>
            <div className="flex min-h-[280px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-3"><img src={preview} alt="" className="max-h-[60vh] max-w-full rounded object-contain" /></div>
            <div className="mt-3 flex justify-end"><button onClick={() => setPreview(null)} className="inline-flex h-9 items-center rounded-md bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700">확인</button></div>
          </div>
        </div>
      )}
    </form>
  );
}
