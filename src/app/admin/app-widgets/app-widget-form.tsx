'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { OpsSection, FieldRow } from '@/components/ops-ui';
import { LINK_TYPES, LANDING_POSITIONS, toLocalInput } from '@/lib/widget-taxonomy';

export type WidgetFormValue = {
  osType?: string; exposeYn?: boolean; widgetTypeId?: string | null;
  publishStart?: string | null; publishEnd?: string | null;
  bannerName?: string; bgColorCode?: string | null; bannerImageUrl?: string | null; bannerImageAlt?: string | null;
  linkType?: string; linkUrl?: string | null; statCode?: string | null; landingPosition?: string | null;
  targetCampaignId?: string | null; note?: string | null;
};

export function AppWidgetForm({
  mode, action, value = {}, widgetTypes, topExtra, bottomExtra,
}: {
  mode: 'new' | 'edit';
  action: (fd: FormData) => void | Promise<void>;
  value?: WidgetFormValue;
  widgetTypes: { id: string; name: string }[];
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
          <FieldRow label="OS 유형" required>
            <div className="flex gap-4 text-sm">
              {['Android', 'IOS'].map((os) => (
                <label key={os} className="flex items-center gap-1.5"><input type="radio" name="osType" value={os} defaultChecked={(v.osType ?? 'Android') === os} className="accent-indigo-600" />{os}</label>
              ))}
            </div>
          </FieldRow>
          <FieldRow label="게시여부" required>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1.5"><input type="radio" name="exposeYn" value="false" defaultChecked={!v.exposeYn} className="accent-indigo-600" />미노출</label>
              <label className="flex items-center gap-1.5"><input type="radio" name="exposeYn" value="true" defaultChecked={!!v.exposeYn} className="accent-indigo-600" />노출</label>
            </div>
          </FieldRow>
          <FieldRow label="위젯 유형" required>
            <Select name="widgetTypeId" defaultValue={v.widgetTypeId ?? ''} className="h-9 w-full max-w-xs text-sm">
              <option value="">위젯 유형을 선택해주세요.</option>
              {widgetTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </FieldRow>
          <FieldRow label="게시기간" required>
            <div className="flex items-center gap-1">
              <Input type="datetime-local" name="publishStart" defaultValue={toLocalInput(v.publishStart)} className="h-9 text-sm" />
              <span className="text-muted-foreground">-</span>
              <Input type="datetime-local" name="publishEnd" defaultValue={toLocalInput(v.publishEnd)} className="h-9 text-sm" />
            </div>
          </FieldRow>
        </div>
      </OpsSection>

      {/* 배너 정보 */}
      <OpsSection no={2} title="배너 정보">
        <div className="grid grid-cols-2">
          <FieldRow label="배너명" required>
            <Input name="bannerName" defaultValue={v.bannerName ?? ''} placeholder="배너명을 입력해주세요." className="h-9 text-sm" />
          </FieldRow>
          <FieldRow label="BG용 RGB 색상코드">
            <Input name="bgColorCode" defaultValue={v.bgColorCode ?? ''} placeholder="예: #FFFFFF / rgb(255,255,255)" className="h-9 text-sm" />
          </FieldRow>
          <FieldRow label="배너 이미지" required>
            <div className="space-y-1">
              <Input name="bannerImageUrl" defaultValue={v.bannerImageUrl ?? ''} placeholder="이미지 URL (예: /assets/xxx.png)" className="h-9 text-sm" />
              <Input name="bannerImageAlt" defaultValue={v.bannerImageAlt ?? ''} placeholder="웹 접근성을 위해 배너 이미지 내용을 입력해주세요." className="h-9 text-sm" />
              <p className="text-[11px] text-muted-foreground">파일 업로드는 공통 업로더 연동 후 지원 예정 · 권장 형식 JPG/PNG</p>
            </div>
          </FieldRow>
          <FieldRow label="링크 URL" required>
            <div className="space-y-1.5">
              <div className="flex gap-3 text-sm">
                {LINK_TYPES.map((l) => (
                  <label key={l.value} className="flex items-center gap-1.5"><input type="radio" name="linkType" value={l.value} defaultChecked={(v.linkType ?? 'internal') === l.value} className="accent-indigo-600" />{l.label}</label>
                ))}
              </div>
              <Input name="linkUrl" defaultValue={v.linkUrl ?? ''} placeholder="링크 URL을 입력해 주세요." className="h-9 text-sm" />
            </div>
          </FieldRow>
        </div>
        {/* T월드 영역 */}
        <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-2 text-[11px] font-semibold text-slate-500">T월드 영역</div>
        <div className="grid grid-cols-2">
          <FieldRow label="통계코드">
            <Input name="statCode" defaultValue={v.statCode ?? ''} placeholder="통계코드를 입력해주세요." className="h-9 text-sm" />
          </FieldRow>
          <FieldRow label="랜딩위치">
            <Select name="landingPosition" defaultValue={v.landingPosition ?? ''} className="h-9 w-full max-w-xs text-sm">
              <option value="">랜딩위치를 선택해주세요.</option>
              {LANDING_POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </FieldRow>
          <FieldRow label="타겟 캠페인ID">
            <Input name="targetCampaignId" defaultValue={v.targetCampaignId ?? ''} placeholder="타겟 캠페인ID를 입력해주세요." className="h-9 text-sm" />
          </FieldRow>
          <FieldRow label="비고">
            <Input name="note" defaultValue={v.note ?? ''} placeholder="비고사항을 입력해주세요." className="h-9 text-sm" />
          </FieldRow>
        </div>
      </OpsSection>

      {bottomExtra}
      {/* 버튼 */}
      <div className="flex items-center justify-between pt-2">
        {mode === 'edit'
          ? <Button type="button" variant="outline" onClick={() => router.push('/admin/app-widgets')}>목록</Button>
          : <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>}
        <div className="flex gap-2">
          <Button type="submit" name="intent" value="save" variant="outline">저장</Button>
          <Button type="submit" name="intent" value="approve">승인요청</Button>
        </div>
      </div>
    </form>
  );
}
