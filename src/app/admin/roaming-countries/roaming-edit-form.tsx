'use client';

// SB BO-AIM-DSP-PG571(국가정보)/570(WCDMA)/569(LTE)/568(GSM)/567(CDMA)/572(임대로밍) + PU01(관련사이트)
//   콘텐츠 탭별 편집 폼. 저장 시 전체(국가설정+이미지+장애공지+서비스 5종+관련사이트)를 한 번에 저장 → 상세. 승인상태 '임시저장'.
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { OpsSection, FieldRow, ReadValue } from '@/components/ops-ui';
import { ROAMING_CONTENT_TABS, SERVICE_KEY, emptyService, type ServiceContent } from '@/lib/roaming';
import { toLocalInput } from '@/lib/widget-taxonomy';
import { cn } from '@/lib/utils';
import { ImageIcon, Plus, X, Pencil } from 'lucide-react';

type SiteRow = { key: string; siteName: string; link: string; imageUrl: string; imageAlt: string; exposeYn: boolean };

export type RoamingEditValue = {
  continent: string; nameKo: string; nameEn: string; countryCode: string; mccCode: string | null; gmt: string | null; timeDiff: string | null;
  searchYn: boolean; detailYn: boolean; adjacentCountries: string | null; currencyCode: string | null;
  countryImageUrl: string | null; countryImageAlt: string | null; bgImageUrl: string | null; bgImageAlt: string | null;
  countryImage2Url: string | null; countryImage2Alt: string | null; buttonImageUrl: string | null; buttonImageAlt: string | null;
  faultNoticeYn: boolean; faultNoticeStart: string | null; faultNoticeEnd: string | null; faultNoticeContent: string | null;
  services: Record<'WCDMA' | 'GSM' | 'LTE' | 'CDMA' | '임대로밍', ServiceContent>;
  sites: { siteName: string; link: string | null; imageUrl: string | null; imageAlt: string | null; exposeYn: boolean }[];
};

// ── 공용 입력 행 ──
function TextRow({ label, value, onChange, ph, required }: { label: string; value: string; onChange: (v: string) => void; ph?: string; required?: boolean }) {
  return <FieldRow label={label} required={required}><Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={ph} className="h-9 w-full max-w-md text-sm" /></FieldRow>;
}
function AreaRow({ label, value, onChange, ph }: { label: string; value: string; onChange: (v: string) => void; ph?: string }) {
  return <FieldRow label={label}><Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={ph} rows={3} className="w-full text-sm" /></FieldRow>;
}
function YN({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-5 text-sm">
      <label className="flex items-center gap-1.5"><input type="radio" checked={value} onChange={() => onChange(true)} className="accent-indigo-600" />Y</label>
      <label className="flex items-center gap-1.5"><input type="radio" checked={!value} onChange={() => onChange(false)} className="accent-indigo-600" />N</label>
    </div>
  );
}
// 이미지 업로드(+ 박스 / 썸네일 + x) + alt
function ImgField({ url, alt, onUrl, onAlt }: { url: string; alt: string; onUrl: (v: string) => void; onAlt: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="relative flex h-28 w-full max-w-[200px] items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50">
        {url ? (<><img src={url} alt="" className="max-h-full max-w-full rounded object-contain p-1" /><button type="button" onClick={() => onUrl('')} className="absolute right-1 top-1 rounded-full bg-white/90 p-0.5 text-slate-400 shadow ring-1 ring-slate-200 hover:text-slate-700"><X className="h-3.5 w-3.5" /></button></>) : <div className="flex flex-col items-center gap-1 text-slate-300"><Plus className="h-6 w-6" /><ImageIcon className="h-4 w-4" /></div>}
      </div>
      <Input value={alt} onChange={(e) => onAlt(e.target.value)} placeholder="접근성을 위해 이미지의 주요 내용을 입력하세요" className="h-9 max-w-[280px] text-sm" />
      <p className="text-[11px] text-slate-400">업로드 된 파일명: {url ? url.split('/').pop() : '없음'}</p>
    </div>
  );
}

function Dialog({ title, desc, confirmLabel = '확인', onConfirm, onClose }: { title: string; desc: React.ReactNode; confirmLabel?: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-2 text-[16px] font-bold text-slate-900">{title}</h3>
        <p className="mb-6 text-[13px] leading-relaxed text-slate-500">{desc}</p>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>취소</Button><Button type="button" onClick={onConfirm}>{confirmLabel}</Button></div>
      </div>
    </div>
  );
}

const uid = () => Math.random().toString(36).slice(2, 9);

export function RoamingEditForm({ id, action, value }: { id: string; action: (fd: FormData) => void | Promise<void>; value: RoamingEditValue }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [content, setContent] = useState<string>('국가정보');
  const [dialog, setDialog] = useState<null | 'cancel' | 'save'>(null);

  // 국가 설정
  const [searchYn, setSearchYn] = useState(value.searchYn);
  const [detailYn, setDetailYn] = useState(value.detailYn);
  const [adj, setAdj] = useState(value.adjacentCountries ?? '');
  const [cur, setCur] = useState(value.currencyCode ?? '');
  // 이미지
  const [img, setImg] = useState({
    countryUrl: value.countryImageUrl ?? '', countryAlt: value.countryImageAlt ?? '',
    bgUrl: value.bgImageUrl ?? '', bgAlt: value.bgImageAlt ?? '',
    country2Url: value.countryImage2Url ?? '', country2Alt: value.countryImage2Alt ?? '',
    buttonUrl: value.buttonImageUrl ?? '', buttonAlt: value.buttonImageAlt ?? '',
  });
  const setImgF = (p: Partial<typeof img>) => setImg((s) => ({ ...s, ...p }));
  // 장애공지
  const [faultYn, setFaultYn] = useState(value.faultNoticeYn);
  const [faultStart, setFaultStart] = useState(toLocalInput(value.faultNoticeStart));
  const [faultEnd, setFaultEnd] = useState(toLocalInput(value.faultNoticeEnd));
  const [faultContent, setFaultContent] = useState(value.faultNoticeContent ?? '');
  // 관련사이트
  const [sites, setSites] = useState<SiteRow[]>(value.sites.map((s) => ({ key: uid(), siteName: s.siteName, link: s.link ?? '', imageUrl: s.imageUrl ?? '', imageAlt: s.imageAlt ?? '', exposeYn: s.exposeYn })));
  const [siteModal, setSiteModal] = useState<null | SiteRow>(null);
  // 서비스 콘텐츠
  const [services, setServices] = useState<Record<string, ServiceContent>>({ ...value.services });
  const setSvc = (tab: string, patch: Partial<ServiceContent>) => setServices((s) => ({ ...s, [tab]: { ...(s[tab] ?? emptyService()), ...patch } }));

  const submit = () => {
    const fd = new FormData();
    fd.set('searchYn', String(searchYn)); fd.set('detailYn', String(detailYn));
    fd.set('adjacentCountries', adj); fd.set('currencyCode', cur);
    fd.set('countryImageUrl', img.countryUrl); fd.set('countryImageAlt', img.countryAlt);
    fd.set('bgImageUrl', img.bgUrl); fd.set('bgImageAlt', img.bgAlt);
    fd.set('countryImage2Url', img.country2Url); fd.set('countryImage2Alt', img.country2Alt);
    fd.set('buttonImageUrl', img.buttonUrl); fd.set('buttonImageAlt', img.buttonAlt);
    fd.set('faultNoticeYn', String(faultYn)); fd.set('faultNoticeStart', faultStart); fd.set('faultNoticeEnd', faultEnd); fd.set('faultNoticeContent', faultContent);
    for (const tab of ['WCDMA', 'GSM', 'LTE', 'CDMA', '임대로밍']) fd.set(`svc_${SERVICE_KEY[tab]}`, JSON.stringify(services[tab] ?? emptyService()));
    fd.set('sites', JSON.stringify(sites.map((s) => ({ siteName: s.siteName, link: s.link, imageUrl: s.imageUrl, imageAlt: s.imageAlt, exposeYn: s.exposeYn }))));
    setDialog(null);
    Promise.resolve(action(fd));
  };

  const s = services[content] ?? emptyService();
  const lease = content === '임대로밍';

  return (
    <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="space-y-6">
      {/* 기본 정보 (시스템 연동값, 읽기전용) */}
      <OpsSection title="기본 정보">
        <div className="grid grid-cols-2">
          <div className="col-span-2"><FieldRow label="대륙명"><ReadValue value={value.continent} /></FieldRow></div>
          <FieldRow label="국가명(국문)"><ReadValue value={value.nameKo} /></FieldRow>
          <FieldRow label="국가명(영문)"><ReadValue value={value.nameEn} /></FieldRow>
          <FieldRow label="국가코드"><ReadValue value={value.countryCode} /></FieldRow>
          <FieldRow label="MCC코드"><ReadValue value={value.mccCode ?? '-'} /></FieldRow>
          <FieldRow label="GMT시간"><ReadValue value={value.gmt ?? '-'} /></FieldRow>
          <FieldRow label="시차시간"><ReadValue value={value.timeDiff ?? '-'} /></FieldRow>
        </div>
      </OpsSection>

      {/* 콘텐츠 탭 */}
      <div className="flex flex-wrap gap-1.5">
        {ROAMING_CONTENT_TABS.map((t) => (
          <button key={t} type="button" onClick={() => setContent(t)} className={cn('h-8 rounded-full border px-4 text-[13px] font-semibold transition', content === t ? 'border-[var(--ac)] bg-[var(--ac)] text-white' : 'border-[var(--line2)] bg-white text-[var(--ink2)] hover:border-[var(--ac)] hover:text-[var(--ac)]')}>{t}</button>
        ))}
      </div>

      {content === '국가정보' ? (
        <>
          <OpsSection title="국가 설정">
            <div className="grid grid-cols-2">
              <FieldRow label="로밍국가 검색 허용 여부" required><YN value={searchYn} onChange={setSearchYn} /></FieldRow>
              <FieldRow label="로밍국가 상세 설정 여부" required><YN value={detailYn} onChange={setDetailYn} /></FieldRow>
              <TextRow label="인접로밍가능 국가" value={adj} onChange={setAdj} ph="인접로밍가능 국가명을 입력하세요" />
              <TextRow label="통화코드" value={cur} onChange={setCur} ph="통화코드를 입력하세요" />
            </div>
          </OpsSection>

          <OpsSection title="이미지 정보">
            <div className="grid grid-cols-2">
              <FieldRow label="국가 대표이미지"><ImgField url={img.countryUrl} alt={img.countryAlt} onUrl={(v) => setImgF({ countryUrl: v })} onAlt={(v) => setImgF({ countryAlt: v })} /></FieldRow>
              <FieldRow label="배경 이미지"><ImgField url={img.bgUrl} alt={img.bgAlt} onUrl={(v) => setImgF({ bgUrl: v })} onAlt={(v) => setImgF({ bgAlt: v })} /></FieldRow>
              <FieldRow label="국가 이미지"><ImgField url={img.country2Url} alt={img.country2Alt} onUrl={(v) => setImgF({ country2Url: v })} onAlt={(v) => setImgF({ country2Alt: v })} /></FieldRow>
              <FieldRow label="버튼 이미지"><ImgField url={img.buttonUrl} alt={img.buttonAlt} onUrl={(v) => setImgF({ buttonUrl: v })} onAlt={(v) => setImgF({ buttonAlt: v })} /></FieldRow>
            </div>
          </OpsSection>

          <OpsSection title="장애공지">
            <div className="grid grid-cols-2">
              <FieldRow label="장애공지 여부"><YN value={faultYn} onChange={setFaultYn} /></FieldRow>
              <FieldRow label="장애공지 기간">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Input type="datetime-local" value={faultStart} onChange={(e) => setFaultStart(e.target.value)} disabled={!faultYn} className="h-9 max-w-[180px] text-sm" />
                  <span className="text-slate-400">~</span>
                  <Input type="datetime-local" value={faultEnd} onChange={(e) => setFaultEnd(e.target.value)} disabled={!faultYn} className="h-9 max-w-[180px] text-sm" />
                </div>
              </FieldRow>
              <div className="col-span-2"><FieldRow label="장애공지 내용"><Textarea value={faultContent} onChange={(e) => setFaultContent(e.target.value)} disabled={!faultYn} rows={3} placeholder="내용을 입력하세요" className="w-full text-sm" /></FieldRow></div>
            </div>
          </OpsSection>

          <OpsSection title="관련사이트">
            <div className="overflow-x-auto border-t border-[var(--line2)]">
              <table className="w-full min-w-[720px] text-[13px]">
                <thead><tr className="h-10 bg-[var(--th)] text-[var(--ink2)]"><th className="w-14 px-3 text-left font-normal">No.</th><th className="w-20 px-3 text-left font-normal">게시여부</th><th className="px-3 text-left font-normal">사이트명</th><th className="px-3 text-left font-normal">링크</th><th className="w-20 px-3 text-center font-normal">수정</th></tr></thead>
                <tbody>
                  {sites.length === 0 ? <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">등록된 관련사이트가 없습니다.</td></tr>
                    : sites.map((st, i) => (
                      <tr key={st.key} className="h-12 border-b border-[#eef0f3]">
                        <td className="px-3 text-slate-500">{sites.length - i}</td>
                        <td className="px-3 text-slate-600">{st.exposeYn ? 'Y' : 'N'}</td>
                        <td className="px-3 text-slate-800">{st.siteName}</td>
                        <td className="max-w-[300px] truncate px-3 text-slate-500">{st.link || '-'}</td>
                        <td className="px-3 text-center"><button type="button" onClick={() => setSiteModal(st)} className="inline-flex h-7 items-center gap-1 rounded-[6px] border border-slate-300 bg-white px-2.5 text-[12px] font-medium text-slate-600 hover:border-[var(--ac)] hover:text-[var(--ac)]"><Pencil className="h-3 w-3" />수정</button></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end pt-3"><Button type="button" variant="outline" size="sm" onClick={() => setSiteModal({ key: uid(), siteName: '', link: '', imageUrl: '', imageAlt: '', exposeYn: true })}><Plus className="mr-1 h-3.5 w-3.5" />등록</Button></div>
          </OpsSection>
        </>
      ) : (
        <>
          <OpsSection title="서비스 정보">
            <div className="grid grid-cols-2">
              <div className="col-span-2"><TextRow label="서비스 내용" value={s.serviceInfo} onChange={(v) => setSvc(content, { serviceInfo: v })} ph="서비스내용을 입력하세요" /></div>
              <TextRow label="A Band" value={s.aBand} onChange={(v) => setSvc(content, { aBand: v })} ph="A Band 내용을 입력하세요" />
              <TextRow label="B Band" value={s.bBand} onChange={(v) => setSvc(content, { bBand: v })} ph="B Band 내용을 입력하세요" />
              <TextRow label="AUTO Band" value={s.autoBand} onChange={(v) => setSvc(content, { autoBand: v })} ph="AUTO Band 내용을 입력하세요" />
            </div>
          </OpsSection>

          <OpsSection title="통화방법(걸기)">
            <div className="grid grid-cols-1">
              <AreaRow label="현지" value={s.callMake.local} onChange={(v) => setSvc(content, { callMake: { ...s.callMake, local: v } })} ph="현지(로밍한 국가)에서 현지로 통화하는 방법을 입력하세요" />
              <AreaRow label="국내(일반전화)" value={s.callMake.domesticFixed} onChange={(v) => setSvc(content, { callMake: { ...s.callMake, domesticFixed: v } })} ph="로밍한 국가에서 국내(일반전화)로 통화하는 방법을 입력하세요" />
              <AreaRow label="국내(이동전화)" value={s.callMake.domesticMobile} onChange={(v) => setSvc(content, { callMake: { ...s.callMake, domesticMobile: v } })} ph="로밍한 국가에서 국내(이동전화)로 통화하는 방법을 입력하세요" />
            </div>
          </OpsSection>

          <OpsSection title="통화방법(받기)">
            <div className="grid grid-cols-1">
              <AreaRow label="한국" value={s.callReceive.korea} onChange={(v) => setSvc(content, { callReceive: { ...s.callReceive, korea: v } })} ph="로밍한 국가에서 한국으로 걸려온 전화받는 방법을 입력하세요" />
              <AreaRow label="현지" value={s.callReceive.local} onChange={(v) => setSvc(content, { callReceive: { ...s.callReceive, local: v } })} ph="현지(로밍한 국가)에서 현지로 걸려온 전화받는 방법을 입력하세요" />
            </div>
          </OpsSection>

          <OpsSection title="부가서비스 및 주의사항">
            <div className="grid grid-cols-1">
              <AreaRow label="부가서비스" value={s.addon} onChange={(v) => setSvc(content, { addon: v })} ph="부가서비스에 대한 안내사항을 입력하세요" />
              <AreaRow label="주의사항(PC)" value={s.cautionPc} onChange={(v) => setSvc(content, { cautionPc: v })} ph="PC화면에 노출되는 주의사항에 대한 안내사항을 입력하세요" />
              <AreaRow label="주의사항(Mobile)" value={s.cautionMobile} onChange={(v) => setSvc(content, { cautionMobile: v })} ph="모바일화면에 노출되는 주의사항에 대한 안내사항을 입력하세요" />
              <AreaRow label="고객센터 수신자부담 전화" value={s.csPhone} onChange={(v) => setSvc(content, { csPhone: v })} ph="고객센터 수신자부담 전화에 대한 안내사항을 입력하세요" />
            </div>
          </OpsSection>

          <OpsSection title="데이터 설정">
            <div className="grid grid-cols-2">
              <FieldRow label="데이터로밍유무"><YN value={s.dataRoamingYn} onChange={(v) => setSvc(content, { dataRoamingYn: v })} /></FieldRow>
              {!lease && <FieldRow label="DATA 가능 여부"><YN value={s.dataAvailYn} onChange={(v) => setSvc(content, { dataAvailYn: v })} /></FieldRow>}
              {s.dataRoamingYn && (
                <div className="col-span-2 grid grid-cols-1">
                  <FieldRow label="데이터로밍 사용량"><div className="flex flex-wrap gap-2">{([['usage1', '사용량1'], ['usage2', '사용량2'], ['usage3', '사용량3']] as const).map(([k, l]) => <Input key={k} value={s[k]} onChange={(e) => setSvc(content, { [k]: e.target.value } as Partial<ServiceContent>)} placeholder={l} className="h-9 w-40 text-sm" />)}</div></FieldRow>
                  <FieldRow label="데이터로밍 요금"><div className="flex flex-wrap gap-2">{([['fee1', '요금1'], ['fee2', '요금2'], ['fee3', '요금3']] as const).map(([k, l]) => <Input key={k} value={s[k]} onChange={(e) => setSvc(content, { [k]: e.target.value } as Partial<ServiceContent>)} placeholder={l} className="h-9 w-40 text-sm" />)}</div></FieldRow>
                </div>
              )}
              {!lease && <FieldRow label="영상통화 가능 여부"><YN value={s.videoCallYn} onChange={(v) => setSvc(content, { videoCallYn: v })} /></FieldRow>}
              {!lease && <div className="col-span-2"><FieldRow label="SMS">
                <div className="space-y-2">
                  <YN value={s.smsYn} onChange={(v) => setSvc(content, { smsYn: v })} />
                  {s.smsYn && <>
                    <div className="flex flex-wrap gap-4 text-[13px]">{([['smsReceive', '수신'], ['smsKeeper', 'SMS 수신콜키퍼'], ['smsSend', 'SMS발신'], ['smsShowNumber', '발신번호표시']] as const).map(([k, l]) => <label key={k} className="flex items-center gap-1.5"><input type="checkbox" checked={s[k]} onChange={(e) => setSvc(content, { [k]: e.target.checked } as Partial<ServiceContent>)} className="h-4 w-4 accent-indigo-600" />{l}</label>)}</div>
                    <Textarea value={s.smsNote} onChange={(e) => setSvc(content, { smsNote: e.target.value })} rows={2} placeholder="SMS관련 안내사항을 입력하세요" className="w-full text-sm" />
                  </>}
                </div>
              </FieldRow></div>}
            </div>
          </OpsSection>

          {!lease && (
            <OpsSection title="이용가능 지역안내">
              <div className="grid grid-cols-1">
                <FieldRow label="PC"><RegionEditor mode={s.pcMode} content={s.pcContent} onMode={(m) => setSvc(content, { pcMode: m })} onContent={(v) => setSvc(content, { pcContent: v })} /></FieldRow>
                <FieldRow label="Mobile"><RegionEditor mode={s.mobileMode} content={s.mobileContent} onMode={(m) => setSvc(content, { mobileMode: m })} onContent={(v) => setSvc(content, { mobileContent: v })} /></FieldRow>
              </div>
            </OpsSection>
          )}
        </>
      )}

      {/* 하단 버튼 */}
      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="outline" onClick={() => setDialog('cancel')}>취소</Button>
        <Button type="button" onClick={() => setDialog('save')}>저장</Button>
      </div>

      {/* PU01 관련사이트 등록/수정 */}
      {siteModal && (
        <SiteModal row={siteModal} onClose={() => setSiteModal(null)} onSave={(row) => {
          setSites((prev) => prev.some((p) => p.key === row.key) ? prev.map((p) => p.key === row.key ? row : p) : [...prev, row]);
          setSiteModal(null);
        }} />
      )}
      {dialog === 'cancel' && <Dialog title="취소하시겠습니까?" desc="취소 시 입력한 정보는 모두 삭제됩니다." onConfirm={() => router.push(`/admin/roaming-countries/${id}`)} onClose={() => setDialog(null)} />}
      {dialog === 'save' && <Dialog title="저장하시겠습니까?" desc="입력한 정보가 저장됩니다." confirmLabel="저장" onConfirm={submit} onClose={() => setDialog(null)} />}
    </form>
  );
}

function RegionEditor({ mode, content, onMode, onContent }: { mode: string; content: string; onMode: (m: 'all' | 'input' | 'link') => void; onContent: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-4 text-[13px]">
        {([['all', '전 지역 가능'], ['input', '입력(HTML-4000byte)'], ['link', '링크']] as const).map(([v, l]) => (
          <label key={v} className="flex items-center gap-1.5"><input type="radio" checked={mode === v} onChange={() => onMode(v)} className="accent-indigo-600" />{l}</label>
        ))}
      </div>
      {mode !== 'all' && <Textarea value={content} onChange={(e) => onContent(e.target.value)} rows={3} placeholder={mode === 'link' ? '링크 URL을 입력하세요' : '이용가능 지역에 대한 안내사항을 입력하세요'} className="w-full text-sm" />}
    </div>
  );
}

// PU01 — 관련사이트 등록/수정 팝업
function SiteModal({ row, onClose, onSave }: { row: SiteRow; onClose: () => void; onSave: (r: SiteRow) => void }) {
  const [r, setR] = useState<SiteRow>(row);
  const set = (p: Partial<SiteRow>) => setR((s) => ({ ...s, ...p }));
  const isNew = !row.siteName;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h3 className="text-[16px] font-bold text-slate-900">관련사이트 관리</h3><button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button></div>
        <p className="mb-3 text-[13px] font-semibold text-slate-500">로밍국가 관련사이트 {isNew ? '등록' : '수정'}</p>
        <div className="space-y-3">
          <label className="block"><span className="mb-1 block text-[13px] text-slate-600">사이트명</span><Input value={r.siteName} onChange={(e) => set({ siteName: e.target.value })} placeholder="사이트명을 입력하세요" className="h-9 text-sm" /></label>
          <label className="block"><span className="mb-1 block text-[13px] text-slate-600">링크</span><Input value={r.link} onChange={(e) => set({ link: e.target.value })} placeholder="해당 사이트주소를 입력하세요" className="h-9 text-sm" /><span className="mt-1 block text-[11px] text-slate-400">새 창으로 랜딩됩니다.</span></label>
          <label className="block"><span className="mb-1 block text-[13px] text-slate-600">이미지</span>
            <div className="relative flex h-24 w-full max-w-[160px] items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50">
              {r.imageUrl ? (<><img src={r.imageUrl} alt="" className="max-h-full max-w-full rounded object-contain p-1" /><button type="button" onClick={() => set({ imageUrl: '' })} className="absolute right-1 top-1 rounded-full bg-white/90 p-0.5 text-slate-400 shadow ring-1 ring-slate-200"><X className="h-3 w-3" /></button></>) : <Plus className="h-6 w-6 text-slate-300" />}
            </div>
            <Input value={r.imageAlt} onChange={(e) => set({ imageAlt: e.target.value })} placeholder="접근성을 위해 이미지의 주요 내용을 입력하세요" className="mt-2 h-9 text-sm" />
          </label>
          <div><span className="mb-1 block text-[13px] text-slate-600">게시여부</span><YN value={r.exposeYn} onChange={(v) => set({ exposeYn: v })} /></div>
        </div>
        <div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>취소</Button><Button type="button" disabled={!r.siteName.trim()} onClick={() => onSave(r)}>저장</Button></div>
      </div>
    </div>
  );
}
