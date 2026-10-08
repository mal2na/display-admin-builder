'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OpsSection, FieldRow, ReadValue } from '@/components/ops-ui';
import { toLocalInput } from '@/lib/widget-taxonomy';
import { ImageIcon, Plus, X } from 'lucide-react';

export type SplashFormValue = {
  version?: number; osType?: string; applyLabel?: string; title?: string | null; updateContent?: string | null; applyStartAt?: string | null;
  bgImageUrl?: string | null; bgImageAlt?: string | null; bgUseYn?: boolean;
  animUrl?: string | null; animAlt?: string | null; animUseYn?: boolean;
  eventImageUrl?: string | null; eventImageAlt?: string | null; eventPostStart?: string | null; eventPostEnd?: string | null; eventUseYn?: boolean;
};

// 이미지/애니 업로드 필드 — 썸네일(있으면) 또는 + 업로드 박스 + 내용(alt) + URL + 안내
function MediaField({ name, urlDefault, altDefault, altPlaceholder, guide, square }: { name: string; urlDefault: string | null; altDefault: string | null; altPlaceholder: string; guide: string[]; square?: boolean }) {
  const [url, setUrl] = useState(urlDefault ?? '');
  return (
    <div className="space-y-2">
      <div className={`relative flex w-full items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 ${square ? 'aspect-square max-w-[240px]' : 'h-32 max-w-[240px]'}`}>
        {url ? (
          <>
            <img src={url} alt="" className="max-h-full max-w-full rounded object-contain p-1" />
            <button type="button" onClick={() => setUrl('')} className="absolute right-1 top-1 rounded-full bg-white/90 p-0.5 text-slate-400 shadow ring-1 ring-slate-200 hover:text-slate-700"><X className="h-3.5 w-3.5" /></button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-300"><Plus className="h-6 w-6" /><ImageIcon className="h-5 w-5" /></div>
        )}
      </div>
      <div className="min-w-0 max-w-[360px] space-y-1.5">
        <Input defaultValue={altDefault ?? ''} name={`${name}Alt`} placeholder={altPlaceholder} className="h-9 text-sm" />
        <Input value={url} onChange={(e) => setUrl(e.target.value)} name={`${name}Url`} placeholder="이미지 URL (업로더 연동 예정)" className="h-8 text-[11px]" />
        <ul className="space-y-0.5 text-[11px] text-muted-foreground">{guide.map((g, i) => <li key={i}>· {g}</li>)}</ul>
      </div>
    </div>
  );
}

function YN({ name, on }: { name: string; on: boolean }) {
  return (
    <div className="flex gap-4 text-sm">
      <label className="flex items-center gap-1.5"><input type="radio" name={name} value="true" defaultChecked={on} className="accent-indigo-600" />Y</label>
      <label className="flex items-center gap-1.5"><input type="radio" name={name} value="false" defaultChecked={!on} className="accent-indigo-600" />N</label>
    </div>
  );
}

// 확인 다이얼로그 (D1/D2/D3)
function ConfirmDialog({ title, desc, confirmLabel = '확인', onConfirm, onClose }: { title: string; desc: React.ReactNode; confirmLabel?: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
        </div>
        <p className="mb-5 text-[13px] leading-relaxed text-slate-500">{desc}</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>취소</Button>
          <Button type="button" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

export function SplashForm({
  mode, action, value = {}, topExtra, bottomExtra,
}: {
  mode: 'new' | 'edit';
  action: (fd: FormData) => void | Promise<void>;
  value?: SplashFormValue;
  topExtra?: React.ReactNode;
  bottomExtra?: React.ReactNode;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const intentRef = useRef<HTMLInputElement>(null);
  const [dialog, setDialog] = useState<null | 'cancel' | 'save' | 'approve'>(null);
  const v = value;

  const submitWith = (intent: 'save' | 'approve') => {
    if (intentRef.current) intentRef.current.value = intent;
    setDialog(null);
    formRef.current?.requestSubmit();
  };

  return (
    <form ref={formRef} action={action}>
      <input type="hidden" name="intent" ref={intentRef} defaultValue="save" />
      {topExtra}

      <OpsSection no={mode === 'edit' ? 2 : undefined} title={mode === 'new' ? '등록 정보' : '기본 정보'}>
        <div className="grid grid-cols-2">
          <FieldRow label="버전"><ReadValue value={mode === 'edit' && v.version ? v.version : '-'} /></FieldRow>
          {mode === 'edit'
            ? <FieldRow label="OS 유형" required>
                <div className="flex gap-4 text-sm">{['Android', 'IOS'].map((os) => (<label key={os} className="flex items-center gap-1.5"><input type="radio" name="osType" value={os} defaultChecked={(v.osType ?? 'Android') === os} className="accent-indigo-600" />{os}</label>))}</div>
              </FieldRow>
            : <FieldRow label="OS 유형" required>
                <div className="flex gap-4 text-sm">{['Android', 'IOS'].map((os) => (<label key={os} className="flex items-center gap-1.5"><input type="radio" name="osType" value={os} defaultChecked={(v.osType ?? 'Android') === os} className="accent-indigo-600" />{os}</label>))}</div>
              </FieldRow>}
          {mode === 'edit' && <FieldRow label="적용 상태"><ReadValue value={v.applyLabel ?? '-'} /></FieldRow>}
          <FieldRow label="적용시작일시" required>
            <Input type="datetime-local" name="applyStartAt" defaultValue={toLocalInput(v.applyStartAt)} className="h-9 w-full max-w-xs text-sm" />
          </FieldRow>
        </div>
        <div className="border-t border-slate-100">
          <FieldRow label="제목" required>
            <Input name="title" defaultValue={v.title ?? ''} placeholder="스플래시 제목을 입력해주세요." className="h-9 text-sm" />
          </FieldRow>
        </div>
        <div className="border-t border-slate-100">
          <FieldRow label="업데이트 주요 내용">
            <Input name="updateContent" defaultValue={v.updateContent ?? ''} placeholder="업데이트 주요 내용을 입력해주세요." className="h-9 text-sm" />
          </FieldRow>
        </div>
        <div className="grid grid-cols-2 border-t border-slate-100">
          <FieldRow label="배경 이미지">
            <MediaField name="bgImage" square urlDefault={v.bgImageUrl ?? null} altDefault={v.bgImageAlt ?? null}
              altPlaceholder="접근성을 위해 이미지의 주요 내용을 입력해주세요"
              guide={['업로드된 파일명: BG_YYMMDD.png', '권장 규격: 1440 x 2560 px', '권장 형식: JPG, JPEG, PNG, GIF, BMP']} />
          </FieldRow>
          <FieldRow label="애니메이션">
            <MediaField name="anim" urlDefault={v.animUrl ?? null} altDefault={v.animAlt ?? null}
              altPlaceholder="접근성을 위해 내용을 입력해주세요"
              guide={['업로드된 파일명: app_YYMMDD.json', 'JSON 파일 형식만 업로드 가능합니다']} />
          </FieldRow>
          <FieldRow label="배경 이미지 사용 여부" required>
            <div className="space-y-1"><YN name="bgUseYn" on={v.bgUseYn !== false} /><p className="text-[11px] text-muted-foreground">사용여부 'N'일 경우 앱기본 이미지가 노출됩니다.</p></div>
          </FieldRow>
          <FieldRow label="애니메이션 사용 여부" required>
            <div className="space-y-1"><YN name="animUseYn" on={v.animUseYn !== false} /><p className="text-[11px] text-muted-foreground">사용여부 'N'일 경우 앱기본 이미지가 노출됩니다.</p></div>
          </FieldRow>
        </div>
        {/* 이벤트 이미지 (정의서 2-10~2-13) — 이미지 + URL + 게시기간 + 사용여부 */}
        <div className="grid grid-cols-2 border-t border-slate-100">
          <FieldRow label="이벤트 이미지">
            <MediaField name="eventImage" urlDefault={v.eventImageUrl ?? null} altDefault={v.eventImageAlt ?? null}
              altPlaceholder="접근성을 위해 이미지의 주요 내용을 입력해주세요"
              guide={['권장 규격: 720 x 200 px', '권장 형식: JPG, JPEG, PNG, GIF, BMP']} />
          </FieldRow>
          <div className="divide-y divide-slate-100">
            <FieldRow label="이벤트 이미지 URL">
              <ReadValue value={v.eventImageUrl || '-'} />
            </FieldRow>
            <FieldRow label="이벤트 이미지 게시 기간">
              <div className="flex items-center gap-1.5">
                <Input type="datetime-local" name="eventPostStart" defaultValue={toLocalInput(v.eventPostStart)} className="h-9 w-full max-w-[190px] text-sm" />
                <span className="text-slate-400">~</span>
                <Input type="datetime-local" name="eventPostEnd" defaultValue={toLocalInput(v.eventPostEnd)} className="h-9 w-full max-w-[190px] text-sm" />
              </div>
            </FieldRow>
            <FieldRow label="이벤트 이미지 사용 여부">
              <div className="space-y-1"><YN name="eventUseYn" on={v.eventUseYn === true} /><p className="text-[11px] text-muted-foreground">사용여부 'N'일 경우 기본 이미지가 노출됩니다.</p></div>
            </FieldRow>
          </div>
        </div>
      </OpsSection>

      {bottomExtra}

      <div className="flex items-center justify-center gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => setDialog('cancel')}>취소</Button>
        <Button type="button" onClick={() => setDialog('save')}>임시저장</Button>
        <Button type="button" onClick={() => setDialog('approve')}>승인요청</Button>
      </div>

      {dialog === 'cancel' && <ConfirmDialog title="취소하시겠습니까?" desc="취소 시 입력한 내용 모두 삭제됩니다." onConfirm={() => router.back()} onClose={() => setDialog(null)} />}
      {dialog === 'save' && <ConfirmDialog title="임시저장하시겠습니까?" desc="입력한 내용이 임시 저장됩니다." onConfirm={() => submitWith('save')} onClose={() => setDialog(null)} />}
      {dialog === 'approve' && <ConfirmDialog title="승인 요청을 하시겠습니까?" desc="요청 시 승인 담당자에게 전달되며, 승인 완료 전까지 '승인대기' 상태로 유지됩니다." onConfirm={() => submitWith('approve')} onClose={() => setDialog(null)} />}
    </form>
  );
}
