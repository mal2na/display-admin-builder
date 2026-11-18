'use client';

// SB BO-AIM-DSP-PG574 — App 스플래시 등록(듀얼 OS)
//   Android/iOS 등록 정보를 한 화면에서 각각 입력. OS 등록/사용 체크로 블록 on/off.
//   iOS는 'Android 등록 정보 불러오기'로 AOS 입력을 복사(배경 이미지는 OS별 규격이 달라 제외).
//   버튼: 취소 / 저장(둘 다 체크 해제 시 비활성). 저장 성공 → 목록.
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImageIcon, Plus, X } from 'lucide-react';

type OsKey = 'aos' | 'ios';

type OsData = {
  enabled: boolean;
  applyStartAt: string;
  title: string;
  bgUrl: string; bgAlt: string; bgUseYn: boolean;
  animUrl: string; animAlt: string; animUseYn: boolean;
  eventUrl: string; eventAlt: string; eventStart: string; eventEnd: string; eventUseYn: boolean;
};

// 이벤트 이미지 게시 기간 default — 명일 00:00 ~ 명일+30 23:59 (SB 11/23)
function defaultEventPeriod(): { start: string; end: string } {
  const p = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date, h: number, m: number) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(h)}:${p(m)}`;
  const t1 = new Date(); t1.setDate(t1.getDate() + 1);
  const t30 = new Date(); t30.setDate(t30.getDate() + 31);
  return { start: fmt(t1, 0, 0), end: fmt(t30, 23, 59) };
}

function blankOs(enabled: boolean): OsData {
  const ev = defaultEventPeriod();
  return {
    enabled,
    applyStartAt: '', title: '',
    bgUrl: '', bgAlt: '', bgUseYn: false,
    animUrl: '', animAlt: '', animUseYn: false,
    eventUrl: '', eventAlt: '', eventStart: ev.start, eventEnd: ev.end, eventUseYn: false,
  };
}

// 현재 시각(datetime-local min) — 적용시작일시 과거 비활성
function nowLocal(): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const d = new Date();
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// 업로드 박스 — 썸네일(URL 있으면) 또는 + 박스. URL은 업로더 연동 전까지 직접 입력.
function UploadBox({ url, onUrl, square, disabled }: { url: string; onUrl: (v: string) => void; square?: boolean; disabled?: boolean }) {
  return (
    <div className={`relative flex items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 ${square ? 'aspect-[3/4] max-w-[200px]' : 'h-28 max-w-[260px]'}`}>
      {url ? (
        <>
          <img src={url} alt="" className="max-h-full max-w-full rounded object-contain p-1" />
          {!disabled && <button type="button" onClick={() => onUrl('')} className="absolute right-1 top-1 rounded-full bg-white/90 p-0.5 text-slate-400 shadow ring-1 ring-slate-200 hover:text-slate-700"><X className="h-3.5 w-3.5" /></button>}
        </>
      ) : (
        <div className="flex flex-col items-center gap-1 text-slate-300"><Plus className="h-7 w-7" /><ImageIcon className="h-4 w-4" /></div>
      )}
    </div>
  );
}

function YN({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex gap-5 text-sm">
      <label className="flex items-center gap-1.5"><input type="radio" checked={value} onChange={() => onChange(true)} disabled={disabled} className="accent-indigo-600" />Y</label>
      <label className="flex items-center gap-1.5"><input type="radio" checked={!value} onChange={() => onChange(false)} disabled={disabled} className="accent-indigo-600" />N</label>
    </div>
  );
}

// 라벨/값 한 칸 (등록 폼 전용 — 2열 그리드 셀)
function Cell({ n, label, required, children }: { n: string; label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 border-b border-slate-100 py-4">
      <div className="flex w-[150px] shrink-0 items-start gap-1.5 pt-1.5">
        <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#ea4b5a] px-1 text-[10px] font-bold text-white">{n}</span>
        <span className="text-[13px] font-semibold text-slate-700">{label}{required && <span className="ml-0.5 text-[#cf2a3c]">*</span>}</span>
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function OsBlock({
  os, data, set, nums, onImport,
}: {
  os: OsKey;
  data: OsData;
  set: (p: Partial<OsData>) => void;
  nums: Record<string, string>;
  onImport?: (checked: boolean) => void;
}) {
  const disabled = !data.enabled;
  const bgSpec = os === 'aos' ? 'AOS 1028 × 1920 px' : 'iOS 1125 × 2436 px';
  return (
    <section className="rounded-xl border border-slate-200 p-6">
      {/* 블록 헤더 — OS 등록/사용 체크 (4/13) */}
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-slate-200 pb-3">
        <h3 className="text-[15px] font-bold text-slate-900">{os === 'aos' ? 'Android 등록 정보' : 'iOS 등록 정보'}</h3>
        <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700">
          <input type="checkbox" checked={data.enabled} onChange={(e) => set({ enabled: e.target.checked })} className="h-4 w-4 accent-indigo-600" />
          OS 등록/사용
        </label>
        {os === 'ios' && onImport && (
          <label className={`flex items-center gap-1.5 text-[13px] font-medium ${disabled ? 'text-slate-300' : 'text-slate-700'}`}>
            <input type="checkbox" disabled={disabled} onChange={(e) => onImport(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
            Android 등록 정보 불러오기
          </label>
        )}
      </div>

      <fieldset disabled={disabled} className={disabled ? 'pointer-events-none opacity-40' : ''}>
        <div className="grid grid-cols-1 gap-x-10 md:grid-cols-2">
          {/* 버전 (1/14) · 적용시작일시 (2/15) */}
          <Cell n={nums.ver} label="버전">
            <div className="flex h-9 items-center rounded-md bg-slate-100 px-3 text-[13px] text-slate-400">-</div>
            <p className="mt-1 text-[11px] text-slate-400">승인완료 처리 시 ‘현재 최신버전+1’로 생성</p>
          </Cell>
          <Cell n={nums.apply} label="적용시작일시" required>
            <Input type="datetime-local" min={nowLocal()} value={data.applyStartAt} onChange={(e) => set({ applyStartAt: e.target.value })} className="h-9 w-full max-w-[260px] text-sm" />
            <p className="mt-1 text-[11px] text-slate-400">YYYY.MM.DD HH:MM · 현재 시각 이전은 선택 불가</p>
          </Cell>

          {/* 제목 (3/16) — 전폭 */}
          <div className="md:col-span-2">
            <Cell n={nums.title} label="제목" required>
              <Input value={data.title} onChange={(e) => set({ title: e.target.value })} placeholder="스플래시 제목을 입력해주세요." className="h-9 w-full max-w-[560px] text-sm" />
            </Cell>
          </div>

          {/* 배경 이미지 (5/17) · 애니메이션 (6/18) */}
          <Cell n={nums.bg} label="배경 이미지">
            <UploadBox url={data.bgUrl} onUrl={(v) => set({ bgUrl: v })} square disabled={disabled} />
            <div className="mt-2 max-w-[320px] space-y-1.5">
              <Input value={data.bgAlt} onChange={(e) => set({ bgAlt: e.target.value })} disabled={!data.bgUseYn} placeholder="alt값 100자 이내 입력" maxLength={100} className="h-9 text-sm" />
              <p className="text-[11px] text-slate-400">업로드된 파일명: {data.bgUrl ? data.bgUrl.split('/').pop() : '-'}</p>
              <ul className="space-y-0.5 text-[11px] text-slate-400"><li>· 권장 규격: {bgSpec}</li><li>· 권장 형식: JPG, JPEG, PNG, GIF, BMP Format</li></ul>
            </div>
          </Cell>
          <Cell n={nums.anim} label="애니메이션">
            <UploadBox url={data.animUrl} onUrl={(v) => set({ animUrl: v })} disabled={disabled} />
            <div className="mt-2 max-w-[320px] space-y-1.5">
              <Input value={data.animAlt} onChange={(e) => set({ animAlt: e.target.value })} disabled={!data.animUseYn} placeholder="alt값 100자 이내 입력" maxLength={100} className="h-9 text-sm" />
              <p className="text-[11px] text-slate-400">업로드된 파일명: {data.animUrl ? data.animUrl.split('/').pop() : '-'}</p>
              <ul className="space-y-0.5 text-[11px] text-slate-400"><li>· 권장 형식: 로띠(Json) 파일만 업로드 가능</li></ul>
            </div>
          </Cell>

          {/* 배경 사용여부 (7/19) · 애니 사용여부 (8/20) */}
          <Cell n={nums.bgUse} label="배경 이미지 사용여부">
            <YN value={data.bgUseYn} onChange={(v) => set({ bgUseYn: v })} disabled={disabled} />
            <p className="mt-1.5 text-[11px] text-slate-400">*배경 이미지 사용여부 ‘N’ 일 경우 앱기본 이미지가 노출 됩니다.</p>
          </Cell>
          <Cell n={nums.animUse} label="애니메이션 사용여부">
            <YN value={data.animUseYn} onChange={(v) => set({ animUseYn: v })} disabled={disabled} />
            <p className="mt-1.5 text-[11px] text-slate-400">*애니메이션 사용여부 ‘N’ 일 경우 기본 이미지가 노출 됩니다.</p>
          </Cell>

          {/* 이벤트 이미지 (9/21) · 게시기간 (11/23) */}
          <Cell n={nums.event} label="이벤트 이미지">
            <UploadBox url={data.eventUrl} onUrl={(v) => set({ eventUrl: v })} disabled={disabled} />
            <div className="mt-2 max-w-[320px] space-y-1.5">
              <Input value={data.eventAlt} onChange={(e) => set({ eventAlt: e.target.value })} disabled={!data.eventUseYn} placeholder="alt값 100자 이내 입력" maxLength={100} className="h-9 text-sm" />
              <p className="text-[11px] text-slate-400">업로드된 파일명: {data.eventUrl ? data.eventUrl.split('/').pop() : '-'}</p>
              <ul className="space-y-0.5 text-[11px] text-slate-400"><li>· 권장 규격: 720 × 200 px (AOS/iOS 공통)</li><li>· 권장 형식: JPG, JPEG, PNG, GIF, BMP Format</li></ul>
            </div>
          </Cell>
          <div className="flex flex-col">
            {/* 이벤트 이미지 URL (10/22) */}
            <Cell n={nums.eventUrl} label="이벤트 이미지 URL">
              <div className="flex h-9 max-w-[320px] items-center truncate rounded-md bg-slate-100 px-3 text-[12px] text-slate-400" title={data.eventUrl || '-'}>{data.eventUrl || '-'}</div>
              <p className="mt-1 text-[11px] text-slate-400">업로드 시 저장 경로 자동 입력</p>
            </Cell>
            {/* 이벤트 게시기간 (11/23) */}
            <Cell n={nums.eventPeriod} label="이벤트 이미지 게시 기간">
              <div className="flex flex-wrap items-center gap-1.5">
                <Input type="datetime-local" value={data.eventStart} onChange={(e) => set({ eventStart: e.target.value })} disabled={!data.eventUseYn} className="h-9 w-full max-w-[180px] text-sm" />
                <span className="text-slate-400">~</span>
                <Input type="datetime-local" value={data.eventEnd} onChange={(e) => set({ eventEnd: e.target.value })} disabled={!data.eventUseYn} className="h-9 w-full max-w-[180px] text-sm" />
              </div>
            </Cell>
            {/* 이벤트 사용여부 (12/24) */}
            <Cell n={nums.eventUse} label="이벤트 이미지 사용여부">
              <YN value={data.eventUseYn} onChange={(v) => set({ eventUseYn: v })} disabled={disabled} />
              <p className="mt-1.5 text-[11px] text-slate-400">‘N’ 일 경우 기본 이벤트 이미지 없음, 단순 미노출</p>
            </Cell>
          </div>
        </div>
      </fieldset>
    </section>
  );
}

const AOS_NUMS = { ver: '1', apply: '2', title: '3', bg: '5', anim: '6', bgUse: '7', animUse: '8', event: '9', eventUrl: '10', eventPeriod: '11', eventUse: '12' };
const IOS_NUMS = { ver: '14', apply: '15', title: '16', bg: '17', anim: '18', bgUse: '19', animUse: '20', event: '21', eventUrl: '22', eventPeriod: '23', eventUse: '24' };

export function SplashRegisterForm({ action }: { action: (fd: FormData) => void | Promise<void> }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [aos, setAos] = useState<OsData>(() => blankOs(true));
  const [ios, setIos] = useState<OsData>(() => blankOs(true));
  const [dialog, setDialog] = useState<null | 'cancel' | 'save' | 'invalid'>(null);
  const setA = (p: Partial<OsData>) => setAos((d) => ({ ...d, ...p }));
  const setI = (p: Partial<OsData>) => setIos((d) => ({ ...d, ...p }));

  // iOS에 Android 입력 복사 — 배경 이미지(규격 상이)만 제외
  const importFromAos = (checked: boolean) => {
    if (!checked) return;
    setIos((d) => ({
      ...d,
      applyStartAt: aos.applyStartAt, title: aos.title,
      animUrl: aos.animUrl, animAlt: aos.animAlt, animUseYn: aos.animUseYn,
      eventUrl: aos.eventUrl, eventAlt: aos.eventAlt, eventStart: aos.eventStart, eventEnd: aos.eventEnd, eventUseYn: aos.eventUseYn,
    }));
  };

  const bothOff = !aos.enabled && !ios.enabled;

  // 유효성 — 활성 OS마다 적용시작일시·제목 필수
  const invalidMsg = useMemo(() => {
    const check = (d: OsData, name: string) => {
      if (!d.enabled) return null;
      if (!d.applyStartAt) return `${name} 적용시작일시를 선택해주세요.`;
      if (!d.title.trim()) return `${name} 제목을 입력해주세요.`;
      return null;
    };
    return check(aos, 'Android') ?? check(ios, 'iOS');
  }, [aos, ios]);

  const put = (fd: FormData, os: OsKey, d: OsData) => {
    fd.set(`${os}_enabled`, String(d.enabled));
    if (!d.enabled) return;
    fd.set(`${os}_applyStartAt`, d.applyStartAt);
    fd.set(`${os}_title`, d.title);
    fd.set(`${os}_bgImageUrl`, d.bgUrl);
    fd.set(`${os}_bgImageAlt`, d.bgAlt);
    fd.set(`${os}_bgUseYn`, String(d.bgUseYn));
    fd.set(`${os}_animUrl`, d.animUrl);
    fd.set(`${os}_animAlt`, d.animAlt);
    fd.set(`${os}_animUseYn`, String(d.animUseYn));
    fd.set(`${os}_eventImageUrl`, d.eventUrl);
    fd.set(`${os}_eventImageAlt`, d.eventAlt);
    fd.set(`${os}_eventPostStart`, d.eventStart);
    fd.set(`${os}_eventPostEnd`, d.eventEnd);
    fd.set(`${os}_eventUseYn`, String(d.eventUseYn));
  };

  const doSave = () => {
    if (invalidMsg) { setDialog('invalid'); return; }
    const fd = new FormData();
    put(fd, 'aos', aos);
    put(fd, 'ios', ios);
    setDialog(null);
    Promise.resolve(action(fd));
  };

  return (
    <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="space-y-6">
      <OsBlock os="aos" data={aos} set={setA} nums={AOS_NUMS} />
      <OsBlock os="ios" data={ios} set={setI} nums={IOS_NUMS} onImport={importFromAos} />

      {/* 하단 버튼 (25/26) */}
      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="outline" onClick={() => setDialog('cancel')}>취소</Button>
        <Button type="button" disabled={bothOff} onClick={() => setDialog('save')}>저장</Button>
      </div>

      {dialog === 'cancel' && (
        <ConfirmDialog title="취소하시겠습니까?" desc="입력한 내용이 저장되지 않습니다. 목록으로 이동하시겠습니까?" onConfirm={() => router.push('/admin/app-splash')} onClose={() => setDialog(null)} />
      )}
      {dialog === 'save' && (
        <ConfirmDialog title="저장하시겠습니까?" desc="입력한 내용이 저장됩니다." confirmLabel="저장" onConfirm={doSave} onClose={() => setDialog(null)} />
      )}
      {dialog === 'invalid' && (
        <ConfirmDialog title="확인이 필요합니다" desc={invalidMsg ?? ''} confirmLabel="확인" onConfirm={() => setDialog(null)} onClose={() => setDialog(null)} hideCancel />
      )}
    </form>
  );
}

function ConfirmDialog({ title, desc, confirmLabel = '확인', onConfirm, onClose, hideCancel }: { title: string; desc: React.ReactNode; confirmLabel?: string; onConfirm: () => void; onClose: () => void; hideCancel?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-2 text-[16px] font-bold text-slate-900">{title}</h3>
        <p className="mb-6 text-[13px] leading-relaxed text-slate-500">{desc}</p>
        <div className="flex justify-end gap-2">
          {!hideCancel && <Button type="button" variant="outline" onClick={onClose}>취소</Button>}
          <Button type="button" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
