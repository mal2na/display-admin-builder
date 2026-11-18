'use client';

// SB BO-AIM-DSP-PG579(등록) / PG582(수정) — App 버전 폼
//   등록: 대상App·OS유형 radio. 수정: 대상App·OS유형·App버전 read-only.
//   하단: 취소 / 저장. 저장 성공 → 목록.
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { OpsSection, FieldRow, ReadValue } from '@/components/ops-ui';
import { TARGET_APPS, toLocalInput } from '@/lib/widget-taxonomy';
import { ImageIcon, Plus, X, Info } from 'lucide-react';

export type VersionFormValue = {
  targetApp?: string; osType?: string; updateDate?: string | null; version?: string;
  recommendVersion?: string | null; forceVersion?: string | null;
  detailContent?: string | null;
  recommendPopupTitle?: string | null; recommendPopupContent?: string | null; recommendPopupImageUrl?: string | null; recommendPopupImageAlt?: string | null;
  forcePopupTitle?: string | null; forcePopupContent?: string | null; forcePopupImageUrl?: string | null; forcePopupImageAlt?: string | null;
};

// 이미지 업로드(+박스 / 썸네일) + alt + 파일명 안내
function ImageField({ name, urlDefault, altDefault }: { name: string; urlDefault: string | null; altDefault: string | null }) {
  const [url, setUrl] = useState(urlDefault ?? '');
  return (
    <div className="space-y-2">
      <div className="relative flex h-32 w-full max-w-[260px] items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50">
        {url ? (
          <>
            <img src={url} alt="" className="max-h-full max-w-full rounded object-contain p-1" />
            <button type="button" onClick={() => setUrl('')} className="absolute right-1 top-1 rounded-full bg-white/90 p-0.5 text-slate-400 shadow ring-1 ring-slate-200 hover:text-slate-700"><X className="h-3.5 w-3.5" /></button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-300"><Plus className="h-6 w-6" /><ImageIcon className="h-5 w-5" /></div>
        )}
      </div>
      <input type="hidden" name={`${name}Url`} value={url} readOnly />
      <div className="max-w-[360px] space-y-1.5">
        <Input defaultValue={altDefault ?? ''} name={`${name}Alt`} placeholder="alt값 100자 이내 입력" maxLength={100} className="h-9 text-sm" />
        <p className="text-[11px] text-slate-400">업로드 된 파일명: {url ? url.split('/').pop() : '-'}</p>
      </div>
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

// 라벨 옆 ⓘ 툴팁
function InfoTip({ text }: { text: string }) {
  return <span className="group relative ml-1 inline-flex"><Info className="h-3.5 w-3.5 text-slate-400" /><span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 w-56 -translate-x-1/2 rounded-md bg-slate-800 px-2.5 py-1.5 text-[11px] leading-snug text-white opacity-0 shadow-lg transition group-hover:opacity-100">{text}</span></span>;
}

export function VersionForm({
  mode, action, value = {}, versionOptions = [], topExtra, bottomExtra,
}: {
  mode: 'new' | 'edit';
  action: (fd: FormData) => void | Promise<void>;
  value?: VersionFormValue;
  versionOptions?: string[];
  topExtra?: React.ReactNode;
  bottomExtra?: React.ReactNode;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [dialog, setDialog] = useState<null | 'cancel' | 'save'>(null);
  const v = value;
  const [maj, min, pat] = (v.version ?? '0.0.0').split('.');

  const opts = Array.from(new Set([...(versionOptions ?? []), v.recommendVersion, v.forceVersion].filter(Boolean) as string[]));
  const submit = () => { setDialog(null); formRef.current?.requestSubmit(); };
  const readonly = mode === 'edit';

  return (
    <form ref={formRef} action={action} className="space-y-6">
      {readonly && <input type="hidden" name="version" defaultValue={v.version ?? ''} />}
      {readonly && <input type="hidden" name="targetApp" defaultValue={v.targetApp ?? '통합App'} />}
      {readonly && <input type="hidden" name="osType" defaultValue={v.osType ?? 'Android'} />}
      {topExtra}

      <OpsSection title="기본 정보">
        {/* 대상 App / OS 유형 / 업데이트 일시 */}
        <div className="grid grid-cols-2">
          <FieldRow label="대상 App">
            {readonly ? <ReadValue value={v.targetApp ?? '-'} /> : (
              <div className="flex gap-4 text-sm">{TARGET_APPS.map((t) => (
                <label key={t} className="flex items-center gap-1.5"><input type="radio" name="targetApp" value={t} defaultChecked={(v.targetApp ?? '통합App') === t} className="accent-indigo-600" />{t}</label>
              ))}</div>
            )}
          </FieldRow>
          <FieldRow label="OS 유형" required>
            {readonly ? <ReadValue value={v.osType ?? '-'} /> : (
              <div className="flex gap-4 text-sm">{['Android', 'IOS'].map((os) => (
                <label key={os} className="flex items-center gap-1.5"><input type="radio" name="osType" value={os} defaultChecked={(v.osType ?? 'Android') === os} className="accent-indigo-600" />{os}</label>
              ))}</div>
            )}
          </FieldRow>
          <div className="col-span-2"><FieldRow label="업데이트 일시" required>
            <Input type="datetime-local" name="updateDate" defaultValue={toLocalInput(v.updateDate)} className="h-9 w-full max-w-xs text-sm" />
            <p className="mt-1 text-[11px] text-slate-400">YYYY.MM.DD HH:MM · 현재 시각 이전은 선택 불가</p>
          </FieldRow></div>
        </div>

        {/* App 버전 (주/마이너/패치) */}
        <div className="border-t border-slate-100">
          <FieldRow label="App 버전" required>
            {readonly ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[12px] text-slate-400">주 버전</span><Input defaultValue={maj} disabled className="h-9 w-20 bg-slate-100 text-sm" />
                <span className="text-[12px] text-slate-400">마이너</span><Input defaultValue={min} disabled className="h-9 w-20 bg-slate-100 text-sm" />
                <span className="text-[12px] text-slate-400">패치</span><Input defaultValue={pat} disabled className="h-9 w-20 bg-slate-100 text-sm" />
                <span className="text-[11px] text-slate-400">(수정 불가)</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[12px] text-slate-400">주 버전</span><Input name="verMajor" type="number" min={0} defaultValue={maj !== '0' ? maj : ''} placeholder="2" className="h-9 w-20 text-sm" />
                <span className="text-[12px] text-slate-400">마이너</span><Input name="verMinor" type="number" min={0} defaultValue="0" className="h-9 w-20 text-sm" />
                <span className="text-[12px] text-slate-400">패치</span><Input name="verPatch" type="number" min={0} defaultValue="0" className="h-9 w-20 text-sm" />
                <span className="text-[11px] text-slate-400">예: 2 / 0 / 0 → 2.0.0</span>
              </div>
            )}
          </FieldRow>
        </div>

        {/* 상세내용 (여러 줄) */}
        <div className="border-t border-slate-100">
          <FieldRow label="상세내용">
            <Textarea name="detailContent" defaultValue={v.detailContent ?? ''} rows={3} placeholder="내용을 입력하세요" className="w-full max-w-[640px] text-sm" />
          </FieldRow>
        </div>

        {/* 권장/강제 업데이트 기준버전 */}
        <div className="grid grid-cols-2 border-t border-slate-100">
          <FieldRow label="권장 업데이트 기준버전">
            <Select name="recommendVersion" defaultValue={v.recommendVersion ?? ''} className="h-9 w-full max-w-xs text-sm">
              <option value="">없음</option>
              {opts.map((o) => <option key={`r-${o}`} value={o}>{o}</option>)}
            </Select>
            <p className="mt-1 flex items-center text-[11px] text-slate-400">선택한 버전보다 낮은 버전 사용 고객에게 권장 업데이트 팝업 노출<InfoTip text="선택한 버전보다 낮은 버전을 사용하는 고객에게 권장 업데이트 팝업이 노출됩니다." /></p>
          </FieldRow>
          <FieldRow label="강제 업데이트 기준버전">
            <Select name="forceVersion" defaultValue={v.forceVersion ?? ''} className="h-9 w-full max-w-xs text-sm">
              <option value="">없음</option>
              {opts.map((o) => <option key={`f-${o}`} value={o}>{o}</option>)}
            </Select>
            <p className="mt-1 flex items-center text-[11px] text-slate-400">선택한 버전보다 낮은 버전은 업데이트 후에만 App 이용 가능<InfoTip text="선택한 버전보다 낮은 버전을 사용하는 고객은 업데이트 후에만 App을 이용할 수 있습니다." /></p>
          </FieldRow>
        </div>

        {/* 권장/강제 업데이트 팝업 (제목/내용) */}
        <div className="grid grid-cols-2 border-t border-slate-100">
          <FieldRow label="권장 업데이트 팝업 (제목/내용)">
            <div className="space-y-1.5">
              <Input name="recommendPopupTitle" defaultValue={v.recommendPopupTitle ?? ''} placeholder="제목을 입력하세요" className="h-9 text-sm" />
              <Textarea name="recommendPopupContent" defaultValue={v.recommendPopupContent ?? ''} rows={2} placeholder="내용을 입력하세요" className="text-sm" />
            </div>
          </FieldRow>
          <FieldRow label="강제 업데이트 팝업 (제목/내용)">
            <div className="space-y-1.5">
              <Input name="forcePopupTitle" defaultValue={v.forcePopupTitle ?? ''} placeholder="제목을 입력하세요" className="h-9 text-sm" />
              <Textarea name="forcePopupContent" defaultValue={v.forcePopupContent ?? ''} rows={2} placeholder="내용을 입력하세요" className="text-sm" />
            </div>
          </FieldRow>
        </div>

        {/* 권장/강제 업데이트 이미지 추가 */}
        <div className="grid grid-cols-2 border-t border-slate-100">
          <FieldRow label="권장 업데이트 이미지 추가">
            <ImageField name="recommendPopupImage" urlDefault={v.recommendPopupImageUrl ?? null} altDefault={v.recommendPopupImageAlt ?? null} />
          </FieldRow>
          <FieldRow label="강제 업데이트 이미지 추가">
            <ImageField name="forcePopupImage" urlDefault={v.forcePopupImageUrl ?? null} altDefault={v.forcePopupImageAlt ?? null} />
          </FieldRow>
        </div>
      </OpsSection>

      {bottomExtra}

      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="outline" onClick={() => setDialog('cancel')}>취소</Button>
        <Button type="button" onClick={() => setDialog('save')}>저장</Button>
      </div>

      {dialog === 'cancel' && <ConfirmDialog title="취소하시겠습니까?" desc="입력한 내용이 저장되지 않습니다. 이동하시겠습니까?" onConfirm={() => router.back()} onClose={() => setDialog(null)} />}
      {dialog === 'save' && <ConfirmDialog title="저장하시겠습니까?" desc="입력한 내용이 저장됩니다." confirmLabel="저장" onConfirm={submit} onClose={() => setDialog(null)} />}
    </form>
  );
}
