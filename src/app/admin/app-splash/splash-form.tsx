'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OpsSection, FieldRow, ReadValue } from '@/components/ops-ui';
import { toLocalInput } from '@/lib/widget-taxonomy';

export type SplashFormValue = {
  version?: number; osType?: string; updateContent?: string | null; applyStartAt?: string | null;
  bgImageUrl?: string | null; bgImageAlt?: string | null; bgUseYn?: boolean;
  animUrl?: string | null; animAlt?: string | null; animUseYn?: boolean;
};

function YN({ name, on }: { name: string; on: boolean }) {
  return (
    <div className="flex gap-4 text-sm">
      <label className="flex items-center gap-1.5"><input type="radio" name={name} value="true" defaultChecked={on} className="accent-indigo-600" />Y</label>
      <label className="flex items-center gap-1.5"><input type="radio" name={name} value="false" defaultChecked={!on} className="accent-indigo-600" />N</label>
    </div>
  );
}

export function SplashForm({
  mode, action, value = {},
}: {
  mode: 'new' | 'edit';
  action: (fd: FormData) => void | Promise<void>;
  value?: SplashFormValue;
}) {
  const router = useRouter();
  const v = value;
  return (
    <form action={action}>
      <OpsSection title={mode === 'new' ? '등록 정보' : '기본 정보'}>
        <div className="grid grid-cols-2">
          <FieldRow label="버전">
            <ReadValue value={mode === 'edit' && v.version ? v.version : '- (승인완료 시 자동 채번)'} />
          </FieldRow>
          <FieldRow label="OS 유형" required>
            <div className="flex gap-4 text-sm">
              {['Android', 'IOS'].map((os) => (
                <label key={os} className="flex items-center gap-1.5"><input type="radio" name="osType" value={os} defaultChecked={(v.osType ?? 'Android') === os} className="accent-indigo-600" />{os}</label>
              ))}
            </div>
          </FieldRow>
          <FieldRow label="업데이트 주요 내용">
            <Input name="updateContent" defaultValue={v.updateContent ?? ''} placeholder="업데이트 주요 내용을 입력해주세요." className="h-9 text-sm" />
          </FieldRow>
          <FieldRow label="적용시작일시" required>
            <Input type="datetime-local" name="applyStartAt" defaultValue={toLocalInput(v.applyStartAt)} className="h-9 text-sm" />
          </FieldRow>
        </div>

        {/* 배경 이미지 / 애니메이션 */}
        <div className="grid grid-cols-2 border-t border-slate-100">
          <FieldRow label="배경 이미지">
            <div className="space-y-1">
              <Input name="bgImageUrl" defaultValue={v.bgImageUrl ?? ''} placeholder="이미지 URL (예: /assets/BG_xxx.png)" className="h-9 text-sm" />
              <Input name="bgImageAlt" defaultValue={v.bgImageAlt ?? ''} placeholder="접근성을 위해 이미지의 주요 내용을 입력해주세요." className="h-9 text-sm" />
              <p className="text-[11px] text-muted-foreground">권장 1440 x 2560 px · JPG/JPEG/PNG/GIF/BMP · 업로더 연동 예정</p>
            </div>
          </FieldRow>
          <FieldRow label="애니메이션">
            <div className="space-y-1">
              <Input name="animUrl" defaultValue={v.animUrl ?? ''} placeholder="JSON URL (예: /assets/app_xxx.json)" className="h-9 text-sm" />
              <Input name="animAlt" defaultValue={v.animAlt ?? ''} placeholder="접근성을 위해 내용을 입력해주세요." className="h-9 text-sm" />
              <p className="text-[11px] text-muted-foreground">JSON 파일 형식만 · 업로더 연동 예정</p>
            </div>
          </FieldRow>
          <FieldRow label="배경 이미지 사용여부" required>
            <YN name="bgUseYn" on={v.bgUseYn !== false} />
          </FieldRow>
          <FieldRow label="애니메이션 사용여부" required>
            <YN name="animUseYn" on={v.animUseYn !== false} />
          </FieldRow>
        </div>
      </OpsSection>

      <div className="flex items-center justify-center gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
        <Button type="submit" name="intent" value="save">임시저장</Button>
        <Button type="submit" name="intent" value="approve">승인요청</Button>
      </div>
    </form>
  );
}
