'use client';

// SB BO-AIM-DSP-PG049(등록) / PG051(수정) — App 위젯 폼
//   기본정보(위젯ID readonly·위젯유형·노출여부 Y/N·노출기간+종료일없음) + 위젯배너정보(배너조회 PU13 연동·읽기전용).
//   하단: 취소 / 저장. 저장 성공 → 상세. 승인상태 '임시저장'.
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { OpsSection, FieldRow } from '@/components/ops-ui';
import { toLocalInput } from '@/lib/widget-taxonomy';
import { ImageIcon, Search, X } from 'lucide-react';
import { BannerPickModal, type BannerPick } from './banner-pick-modal';

export type WidgetFormValue = {
  widgetCode?: string | null;        // 위젯ID (edit 시)
  widgetTypeId?: string | null;
  exposeYn?: boolean;
  publishStart?: string | null; publishEnd?: string | null;
  noEnd?: boolean;                   // 종료일 없음
  banner?: BannerPick | null;        // 선택된 배너캠페인
};

function Dialog({ title, desc, confirmLabel = '확인', onConfirm, onClose }: { title: string; desc: React.ReactNode; confirmLabel?: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
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

// 읽기전용 셀
function RO({ label, children }: { label: string; children: React.ReactNode }) {
  return <FieldRow label={label}><div className="min-h-[20px] py-1.5 text-[14px] leading-[20px] text-[var(--ink)]">{children}</div></FieldRow>;
}

const LANDING_LABEL: Record<string, string> = { direct: '직접(URL)', product: '상품형', event: '이벤트형', none: '없음' };
const PAGE_LABEL: Record<string, string> = { current: '내부', external: '외부', none: '없음' };

export function AppWidgetForm({
  action, value = {}, widgetTypes, banners,
}: {
  action: (fd: FormData) => void | Promise<void>;
  value?: WidgetFormValue;
  widgetTypes: { id: string; name: string }[];
  banners: BannerPick[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [banner, setBanner] = useState<BannerPick | null>(value.banner ?? null);
  const [noEnd, setNoEnd] = useState<boolean>(value.noEnd ?? false);
  const [pickOpen, setPickOpen] = useState(false);
  const [dialog, setDialog] = useState<null | 'cancel' | 'save'>(null);

  const submit = () => { setDialog(null); formRef.current?.requestSubmit(); };

  return (
    <form ref={formRef} action={action} className="space-y-6">
      {banner && <input type="hidden" name="bannerCampaignId" value={banner.id} />}
      {banner && <input type="hidden" name="bannerName" value={banner.title} />}
      <input type="hidden" name="noEnd" value={String(noEnd)} />

      {/* ① 기본 정보 */}
      <OpsSection title="기본 정보">
        <div className="grid grid-cols-2">
          <RO label="위젯 ID">{value.widgetCode ?? <span className="text-slate-400">저장 시 자동 부여</span>}</RO>
          <FieldRow label="위젯 유형" required>
            <Select name="widgetTypeId" defaultValue={value.widgetTypeId ?? ''} className="h-9 w-full max-w-xs text-sm">
              <option value="">위젯 유형을 선택하세요</option>
              {widgetTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </FieldRow>
          <FieldRow label="노출 여부" required>
            <div className="flex gap-5 text-sm">
              <label className="flex items-center gap-1.5"><input type="radio" name="exposeYn" value="true" defaultChecked={value.exposeYn !== false} className="accent-indigo-600" />Y</label>
              <label className="flex items-center gap-1.5"><input type="radio" name="exposeYn" value="false" defaultChecked={value.exposeYn === false} className="accent-indigo-600" />N</label>
            </div>
          </FieldRow>
          <FieldRow label="노출 기간" required>
            <div className="flex flex-wrap items-center gap-1.5">
              <Input type="datetime-local" name="publishStart" defaultValue={toLocalInput(value.publishStart)} className="h-9 w-full max-w-[180px] text-sm" />
              <span className="text-slate-400">-</span>
              <Input type="datetime-local" name="publishEnd" defaultValue={toLocalInput(value.publishEnd)} disabled={noEnd} className="h-9 w-full max-w-[180px] text-sm" />
              <label className="ml-1 flex items-center gap-1.5 text-[13px] text-slate-600"><input type="checkbox" checked={noEnd} onChange={(e) => setNoEnd(e.target.checked)} className="h-4 w-4 accent-indigo-600" />종료일 없음</label>
            </div>
          </FieldRow>
        </div>
      </OpsSection>

      {/* ② 위젯배너 정보 — 배너 조회로 연동(읽기전용) */}
      <OpsSection title="위젯배너 정보">
        <div className="grid grid-cols-2">
          <div className="col-span-2">
            <FieldRow label="배너 캠페인명" required>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] text-[var(--ink)]">{banner ? banner.title : <span className="text-slate-400">배너 조회로 배너 캠페인을 선택하세요</span>}</span>
                <Button type="button" variant="outline" size="sm" onClick={() => setPickOpen(true)}><Search className="mr-1 h-3.5 w-3.5" />배너 조회</Button>
              </div>
            </FieldRow>
          </div>
          {banner && (
            <>
              <RO label="배너 캠페인 ID">{banner.campaignCode}</RO>
              <RO label="BG용 RGB 색상코드">{banner.bgColorCode ?? '기본컬러'}</RO>
              <div className="col-span-2">
                <FieldRow label="배너 이미지">
                  <div className="flex items-start gap-3">
                    <div className="flex h-24 w-40 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                      {banner.thumbnailUrl ? <img src={banner.thumbnailUrl} alt="" className="max-h-full max-w-full object-contain" /> : <ImageIcon className="h-7 w-7 text-slate-300" />}
                    </div>
                    <p className="pt-1 text-[12px] text-slate-500">{banner.bannerAlt ?? '-'}</p>
                  </div>
                </FieldRow>
              </div>
              <RO label="전시기간">{banner.publishStart || banner.publishEnd ? `${fmt(banner.publishStart)} ~ ${fmt(banner.publishEnd)}` : '-'}</RO>
              <RO label="랜딩유형">{LANDING_LABEL[banner.landingType ?? ''] ?? banner.landingType ?? '-'}</RO>
              <RO label="랜딩 URL">{banner.landingUrl ?? '-'}</RO>
              <RO label="페이지타입">{PAGE_LABEL[banner.pageType ?? ''] ?? banner.pageType ?? '-'}</RO>
              <div className="col-span-2">
                <FieldRow label="통계코드">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] text-[var(--ink)]">{banner.statCode ?? '-'}</span>
                    <span className="rounded border border-[#f0a04a] bg-[#fff7ed] px-1.5 py-0.5 text-[10px] font-semibold text-[#b45309]">TBD</span>
                  </div>
                </FieldRow>
              </div>
            </>
          )}
        </div>
      </OpsSection>

      {/* 하단 버튼 */}
      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="outline" onClick={() => setDialog('cancel')}>취소</Button>
        <Button type="button" disabled={!banner} onClick={() => setDialog('save')}>저장</Button>
      </div>

      {pickOpen && <BannerPickModal banners={banners} onClose={() => setPickOpen(false)} onApply={(b) => { setBanner(b); setPickOpen(false); }} />}
      {dialog === 'cancel' && <Dialog title="저장하지 않고 목록으로 이동하시겠습니까?" desc="입력한 내용은 저장되지 않습니다." onConfirm={() => router.push('/admin/app-widgets')} onClose={() => setDialog(null)} />}
      {dialog === 'save' && <Dialog title="저장하시겠습니까?" desc="등록된 내용이 저장됩니다." confirmLabel="저장" onConfirm={submit} onClose={() => setDialog(null)} />}
    </form>
  );
}

function fmt(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
