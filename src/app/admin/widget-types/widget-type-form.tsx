'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { OpsSection, FieldRow, ReadValue } from '@/components/ops-ui';
import { WIDGET_SIZES } from '@/lib/widget-taxonomy';

export type TypeFormValue = {
  typeName?: string; description?: string | null; useYn?: boolean; typeCode?: string | null;
  osType?: string; sizeLabel?: string | null; nativeWidgetId?: string | null; widgetSpec?: string | null; bannerArea?: string | null;
};

export function WidgetTypeForm({
  mode, action, value = {}, topExtra, bottomExtra,
}: {
  mode: 'new' | 'edit';
  action: (fd: FormData) => void | Promise<void>;
  value?: TypeFormValue;
  topExtra?: React.ReactNode;
  bottomExtra?: React.ReactNode;
}) {
  const router = useRouter();
  const v = value;
  return (
    <form action={action}>
      {topExtra}
      {/* 기본 정보 */}
      <OpsSection no={1} title="기본 정보">
        <div className="grid grid-cols-2">
          <FieldRow label="위젯유형" required>
            <Input name="typeName" defaultValue={v.typeName ?? ''} placeholder="OS유형 및 배너영역 사이즈를 포함하여 운영자가 식별하기 쉬운 명칭으로 입력해주세요." className="h-9 text-sm" />
          </FieldRow>
          <FieldRow label="사용여부" required>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1.5"><input type="radio" name="useYn" value="false" defaultChecked={!v.useYn} className="accent-indigo-600" />사용안함</label>
              <label className="flex items-center gap-1.5"><input type="radio" name="useYn" value="true" defaultChecked={!!v.useYn} className="accent-indigo-600" />사용</label>
            </div>
          </FieldRow>
          <FieldRow label="유형 설명">
            <Input name="description" defaultValue={v.description ?? ''} placeholder="위젯 유형에 대한 추가 설명을 입력해주세요." className="h-9 text-sm" />
          </FieldRow>
          <FieldRow label="유형코드">
            <ReadValue value={mode === 'edit' ? (v.typeCode ?? '-') : '- (저장 시 자동 생성)'} />
          </FieldRow>
        </div>
      </OpsSection>

      {/* 위젯 정보 */}
      <OpsSection no={2} title="위젯 정보">
        <div className="grid grid-cols-2">
          <FieldRow label="OS 유형" required>
            <div className="flex gap-4 text-sm">
              {['Android', 'IOS'].map((os) => (
                <label key={os} className="flex items-center gap-1.5"><input type="radio" name="osType" value={os} defaultChecked={(v.osType ?? 'Android') === os} className="accent-indigo-600" />{os}</label>
              ))}
            </div>
          </FieldRow>
          <FieldRow label="App 위젯 관리 사이즈" required>
            <Select name="sizeLabel" defaultValue={v.sizeLabel ?? ''} className="h-9 w-full max-w-xs text-sm">
              <option value="">사이즈를 선택해주세요.</option>
              {WIDGET_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </FieldRow>
          <FieldRow label="네이티브 위젯ID">
            <Input name="nativeWidgetId" defaultValue={v.nativeWidgetId ?? ''} placeholder="예: AND_WIDGET5X2_0001" className="h-9 text-sm" />
          </FieldRow>
          <FieldRow label="위젯 규격">
            <Input name="widgetSpec" defaultValue={v.widgetSpec ?? ''} placeholder="예: 329 X 155 px" className="h-9 text-sm" />
          </FieldRow>
          <FieldRow label="배너 영역">
            <Input name="bannerArea" defaultValue={v.bannerArea ?? ''} placeholder="예: 329 X 50 px" className="h-9 text-sm" />
          </FieldRow>
          <FieldRow label="미리보기">
            <div className="flex h-24 w-56 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-100 text-[11px] text-slate-400">배너영역</div>
          </FieldRow>
        </div>
      </OpsSection>

      {bottomExtra}
      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="outline" onClick={() => router.push('/admin/widget-types')}>목록</Button>
        <div className="flex gap-2">
          <Button type="submit" name="intent" value="save" variant="outline">저장</Button>
          <Button type="submit" name="intent" value="approve">승인요청</Button>
        </div>
      </div>
    </form>
  );
}
