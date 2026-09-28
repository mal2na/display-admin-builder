'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useAiRail } from '@/components/ai-rail-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { OpsSection, FieldRow } from '@/components/ops-ui';
import { toLocalInput } from '@/lib/widget-taxonomy';
import { ComposedBanner } from './composed-banner';
import { AssetPickerModal, type ImageAsset } from '@/components/asset-picker-modal';
import { generateComposeDraft, refineComposeDraft, AI_EXAMPLES, AI_REFINE_SUGGESTIONS } from './ai-compose';
import { REGISTERED_DS_BANNER_TYPES, dsBannerTypeName, dsBannerType, type DsBannerType } from './ds-banner-types';
import type { ComposeFields } from './composed-banner';
import { Plus, Minus, X, Search, Image as ImageIcon, Upload, Database, Sparkles, Send, LayoutTemplate, Check } from 'lucide-react';

type AiMsg = { role: 'user' | 'ai'; text: string };

// 우측 플로팅 AI 어시스턴트 — 대화하며 초안을 이어서 다듬는다(히스토리 누적).
// 각 요청은 현재 배너(row)에 델타로 반영되고, 좌측 상단에 라이브 미리보기.
function AiAssistantPanel({ open, onClose, row, messages, onSend, busy = false, engine = null }: {
  open: boolean; onClose: () => void; row: TypeDetailRow; messages: AiMsg[]; onSend: (text: string) => void; busy?: boolean; engine?: 'ai' | 'rules' | null;
}) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, busy, open]);
  if (!open) return null;
  const send = (t: string) => { const v = t.trim(); if (!v || busy) return; onSend(v); setInput(''); };
  const pv = pvDims(row.detail, 320);
  const started = messages.length > 0;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50"><Sparkles className="h-3.5 w-3.5 text-indigo-600" /></span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-800">
            AI 배너 어시스턴트
            {engine === 'ai' && <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-600">실제 AI</span>}
            {engine === 'rules' && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-500">데모</span>}
          </p>
          <p className="text-[10px] text-slate-400">대화하며 이어서 다듬어요 · 텍스트는 아래 탭에서 직접 수정</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="닫기"><X className="h-4 w-4" /></button>
      </div>

      {/* 라이브 미리보기 */}
      <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3">
        <div className="mx-auto w-fit rounded-xl bg-white p-2 ring-1 ring-slate-100">
          <ComposedBanner f={row} width={Math.min(pv.w, 300)} height={Math.round((Math.min(pv.w, 300) * pv.h) / pv.w)} preview />
        </div>
        <p className="mt-1 text-center text-[10px] text-slate-400">현재 초안 · {pv.label}</p>
      </div>

      {/* 대화 히스토리 */}
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
        {!started ? (
          <div className="space-y-3 py-2">
            <p className="text-[12px] leading-relaxed text-slate-500">만들고 싶은 배너를 설명해 주세요. 만든 뒤엔 <b className="text-slate-600">“배경 더 밝게”, “CTA를 예약으로”</b>처럼 이어서 다듬을 수 있어요.</p>
            <div className="flex flex-wrap gap-1.5">
              {AI_EXAMPLES.map((ex) => (
                <button key={ex} type="button" onClick={() => send(ex)}
                  className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600">{ex}</button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            m.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <span className="max-w-[80%] rounded-2xl rounded-br-sm bg-indigo-600 px-3 py-1.5 text-[12px] text-white">{m.text}</span>
              </div>
            ) : (
              <div key={i} className="flex items-start gap-1.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50"><Sparkles className="h-3 w-3 text-indigo-500" /></span>
                <span className="max-w-[80%] rounded-2xl rounded-tl-sm bg-slate-100 px-3 py-1.5 text-[12px] text-slate-700">{m.text}</span>
              </div>
            )
          ))
        )}
        {busy && (
          <div className="flex items-center gap-1.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50"><Sparkles className="h-3 w-3 animate-pulse text-indigo-500" /></span>
            <span className="inline-flex items-center gap-1 rounded-2xl rounded-tl-sm bg-slate-100 px-3 py-2 text-[12px] text-slate-400">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
            </span>
          </div>
        )}
      </div>

      {/* 후속 다듬기 제안 + 입력 */}
      <div className="border-t border-slate-100 px-3 py-2.5">
        {started && (
          <div className="mb-2 flex flex-wrap gap-1">
            {AI_REFINE_SUGGESTIONS.map((sug) => (
              <button key={sug} type="button" onClick={() => send(sug)}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600">{sug}</button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 focus-within:border-indigo-400">
          <input value={input} disabled={busy} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(input); } }}
            placeholder={busy ? '생성 중…' : started ? '이어서 다듬기 — 예: 배경 더 밝게' : '어떤 배너를 만들까요?'} className="h-9 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 disabled:opacity-60" />
          <button type="button" onClick={() => send(input)} disabled={!input.trim() || busy}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400" aria-label="보내기"><Send className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </div>
  );
}

// 이미지 소스: DB(라이브러리)에서 가져오기 버튼 — 로컬 업로드와 나란히 배치.
function LibraryPickButton({ images, onPick, label = '라이브러리' }: { images: ImageAsset[]; onPick: (url: string, alt?: string | null) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50">
        <Database className="h-3 w-3" /> {label}
      </button>
      <AssetPickerModal open={open} kind="image" images={images} links={[]} onClose={() => setOpen(false)} onSelect={(v) => onPick(v.url, v.alt)} />
    </>
  );
}

// DS 배너 유형 가져오기 — 이미지 등록의 'DB에서 가져오기'와 동일한 방식. DS 포털에 '등록된' 유형만 끌어온다(현재 기본형 1개).
function DsTypePickButton({ onPick, label = 'DS 배너 유형 가져오기' }: { onPick: (t: DsBannerType) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50">
        <LayoutTemplate className="h-3 w-3" /> {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <LayoutTemplate className="h-4 w-4 text-indigo-500" />
              <h3 className="text-sm font-semibold">DS 배너 유형 가져오기</h3>
              <span className="text-[11px] text-muted-foreground">DS 포털에 등록된 유형만</span>
              <button type="button" onClick={() => setOpen(false)} className="ml-auto text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-[60vh] space-y-2 overflow-y-auto p-3">
              {REGISTERED_DS_BANNER_TYPES.map((t) => {
                const sample = { ...t.locked, title: '배너 제목', subtitle: '서브 문구', ctaText: '', rightImageUrl: '/assets/product-chanel-lipstick.svg' } as ComposeFields;
                return (
                  <button key={t.id} type="button" title={`${t.font} · ${t.image}`} onClick={() => { onPick(t); setOpen(false); }}
                    className="group flex w-full flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-left shadow-sm transition hover:border-indigo-400 hover:shadow-md">
                    <FitBanner f={sample} />
                    <div className="flex items-center justify-between gap-1 px-0.5">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold text-slate-800 group-hover:text-indigo-600">{t.name}</p>
                        <p className="truncate text-[11px] text-slate-400">{t.desc}</p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-indigo-600 px-2 py-1 text-[11px] font-semibold text-white opacity-0 transition group-hover:opacity-100"><Check className="h-3 w-3" />가져오기</span>
                    </div>
                    <p className="truncate border-t border-slate-100 px-0.5 pt-1.5 text-[10px] text-slate-400">{t.font} · {t.image}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// 이미지형 = 완성 이미지 업로드 / 리스트형 = 배경색+텍스트+우측이미지로 직접 조립
type TypeDetailRow = {
  type: string; detail: string; useYn: boolean; imageUrl: string;
  bgColor: string; bgColor2: string; bgType: string;
  title: string; subtitle: string; titleColor: string; subColor: string; titleSize: string;
  align: string; imagePos: string; imgSize: string; imgShape: string;
  badgeText: string; badgeColor: string;
  ctaText: string; ctaColor: string; rightImageUrl: string;
  bannerType: string; // DS 배너 유형 id (선택 시 레이아웃·배경·색 고정)
};
const emptyRow = (): TypeDetailRow => ({
  type: '이미지형', detail: DETAIL_TYPES[0], useYn: true, imageUrl: '',
  bgColor: '#EEF1F8', bgColor2: '#DDE3F0', bgType: 'solid',
  title: '', subtitle: '', titleColor: '#0F172A', subColor: '#64748B', titleSize: 'md',
  align: 'left', imagePos: 'right', imgSize: 'md', imgShape: 'square',
  badgeText: '', badgeColor: '#4F46E5',
  ctaText: '', ctaColor: '#4F46E5', rightImageUrl: '', bannerType: '',
});

// 배경 팔레트 프리셋 (단색 c1 / 그라데이션 c1→c2)
const PALETTES = [
  { name: '라벤더', c1: '#EEF1F8', c2: '#DDE3F0' },
  { name: '민트', c1: '#E6F7EF', c2: '#CFEFE0' },
  { name: '피치', c1: '#FDEEE8', c2: '#F9D9CE' },
  { name: '스카이', c1: '#E7F0FD', c2: '#D3E4FB' },
  { name: '그레이', c1: '#F1F5F9', c2: '#E2E8F0' },
  { name: '네이비', c1: '#334155', c2: '#0F172A' },
] as const;

// 배너 제작 방식 2가지 (선택) — 값은 기존 데이터 호환을 위해 이미지형/리스트형 유지
const METHODS = [
  { value: '이미지형', label: '이미지 등록', desc: '완성된 배너 이미지를 그대로 업로드' },
  { value: '리스트형', label: '직접 만들기', desc: '배경색 + 텍스트 + 상품 이미지로 조립' },
] as const;
const DETAIL_TYPES = ['빅배너 (672×460)', '스몰배너 (672×324)', '띠배너 (672×214)', '팝업배너 (720×600)'] as const;
const LANDING_TYPES = [
  { value: 'direct', label: '직접입력' },
  { value: 'product', label: '상품' },
  { value: 'event', label: '이벤트' },
  { value: 'none', label: '연결안함' },
] as const;
const PAGE_TYPES = [
  { value: 'current', label: '내부창' },
  { value: 'external', label: '외부창' },
  { value: 'none', label: '선택안함' },
] as const;

// 상품 조회 샘플 데이터 (실서비스는 상품 API 연동)
const SAMPLE_PRODUCTS = [
  { id: 'PRD20260415001', name: '5G 다이렉트 34', kind: '요금제' },
  { id: 'PRD20260415002', name: '5G 다이렉트 42', kind: '요금제' },
  { id: 'PRD20260415003', name: '5G 다이렉트 55', kind: '요금제' },
  { id: 'PRD20260415004', name: 'T 우주패스', kind: '구독' },
  { id: 'PRD20260415005', name: 'T day 혜택', kind: '혜택' },
  { id: 'PRD20260415006', name: '휴대폰 보험', kind: '보험' },
  { id: 'PRD20260415007', name: '데이터 함께쓰기', kind: '부가서비스' },
  { id: 'PRD20260415008', name: '로밍 onePass', kind: '로밍' },
  { id: 'PRD20260415009', name: 'T 멤버십', kind: '멤버십' },
  { id: 'PRD20260415010', name: '결합할인', kind: '결합상품' },
];
const SAMPLE_EVENTS = [
  { id: 'EVT20260820001', name: '디즈니 플러스', kind: '응모형' },
  { id: 'EVT20260820002', name: 'SKT 베스트 요금제', kind: '기획전' },
  { id: 'EVT20260820003', name: '교보문고', kind: '응모형' },
  { id: 'EVT20260820004', name: 'YTPL 뮤직', kind: '응모형' },
  { id: 'EVT20260820005', name: '5GX 0청년 다이렉트 요금제', kind: '응모형' },
  { id: 'EVT20260820006', name: '요금제 할인 구독 안내', kind: '기획전' },
];

export type BannerFormValue = {
  campaignCode?: string; title?: string; subtitle?: string | null; purpose?: string | null; platform?: string;
  exposeYn?: boolean; publishStart?: string | null; publishEnd?: string | null;
  landingType?: string | null; landingUrl?: string | null; pageType?: string | null; bannerAlt?: string | null;
  typeDetails?: { type: string; detail: string; useYn?: boolean; imageUrl?: string; bgColor?: string; bgColor2?: string; bgType?: string; title?: string; subtitle?: string; titleColor?: string; subColor?: string; titleSize?: string; align?: string; imagePos?: string; imgSize?: string; imgShape?: string; badgeText?: string; badgeColor?: string; ctaText?: string; ctaColor?: string; rightImageUrl?: string; bannerType?: string }[];
};

// 규격 문자열 (W×H) → 미리보기 비율/크기 (maxW 폭 기준으로 스케일)
function pvSizeOf(detail: string): { w: number; h: number } | null {
  const m = detail.match(/(\d+)\s*[×xX*]\s*(\d+)/);
  return m ? { w: Number(m[1]), h: Number(m[2]) } : null;
}
function pvDims(detail: string, maxW: number): { w: number; h: number; label: string } {
  const sz = pvSizeOf(detail);
  if (!sz) return { w: maxW, h: Math.round(maxW * 0.5), label: '' };
  return { w: maxW, h: Math.max(40, Math.round((maxW * sz.h) / sz.w)), label: `${sz.w}×${sz.h}` };
}

function Radio({ name, value, checked, children }: { name: string; value: string; checked: boolean; children: React.ReactNode }) {
  return <label className="flex items-center gap-1.5 text-sm"><input type="radio" name={name} value={value} defaultChecked={checked} className="accent-indigo-600" />{children}</label>;
}

// 세그먼트 토글 (정렬/위치/크기/배경 등)
function Seg({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-slate-200">
      {options.map((o) => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)}
          className={'px-2.5 py-1 text-[12px] font-medium ' + (value === o.v ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

// 컨테이너 폭에 맞춰 조립형 배너를 채우는 프리뷰(유형 선택 카드용). 좁은 폭에서도 안 넘침.
function FitBanner({ f, ratio = 0.37 }: { f: ComposeFields; ratio?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return <div ref={ref} className="w-full overflow-hidden rounded-2xl">{w > 0 && <ComposedBanner f={f} width={w} height={Math.round(w * ratio)} preview />}</div>;
}

// 직접 만들기 인라인 편집기 — 같은 페이지에서 미리보기 + 탭 컨트롤(모달 아님)
function ComposeEditorInline({ row, onPatch, onShared, onFile, images }: { row: TypeDetailRow; onPatch: (patch: Partial<TypeDetailRow>) => void; onShared: (patch: Partial<TypeDetailRow>) => void; onFile: (key: 'rightImageUrl', file: File | undefined) => void; images: ImageAsset[] }) {
  const [tab, setTab] = useState<'text' | 'image'>('text');
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMsgs, setAiMsgs] = useState<AiMsg[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiEngine, setAiEngine] = useState<'ai' | 'rules' | null>(null);
  const dim = pvDims(row.detail, 300);
  const rail = useAiRail();
  const railId = useId();
  const tabBtn = (k: typeof tab, label: string) => (
    <button type="button" onClick={() => setTab(k)} className={'-mb-px border-b-2 px-1 pb-2 text-sm ' + (tab === k ? 'border-indigo-600 font-semibold text-indigo-700' : 'border-transparent text-muted-foreground hover:text-slate-700')}>{label}</button>
  );
  const L = ({ children }: { children: React.ReactNode }) => <span className="w-16 shrink-0 text-[12px] text-muted-foreground">{children}</span>;

  // AI 어시스턴트 — 서버(/api/ai-banner)에 요청. 키가 있으면 실제 Claude, 없으면 규칙기반 폴백.
  // 첫 요청 = 생성(generate), 이후 = 현재 초안 기준 수정(refine). 히스토리 누적.
  const aiSend = async (text: string) => {
    if (aiBusy) return;
    const first = aiMsgs.length === 0;
    setAiMsgs((m) => [...m, { role: 'user', text }]);
    setAiBusy(true);
    const current = {
      title: row.title, subtitle: row.subtitle, bgColor: row.bgColor, bgColor2: row.bgColor2, bgType: row.bgType,
      titleColor: row.titleColor, subColor: row.subColor, titleSize: row.titleSize, align: row.align,
      imagePos: row.imagePos, imgSize: row.imgSize, badgeText: row.badgeText, badgeColor: row.badgeColor, ctaText: row.ctaText, ctaColor: row.ctaColor,
    };
    try {
      const res = await fetch('/api/ai-banner', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt: text, mode: first ? 'generate' : 'refine', current }),
      });
      if (!res.ok) throw new Error('api');
      const data = await res.json();
      if (data?.patch && typeof data.patch === 'object') onPatch(data.patch as Partial<TypeDetailRow>);
      setAiEngine(data?.engine === 'ai' ? 'ai' : 'rules');
      setAiMsgs((m) => [...m, { role: 'ai', text: data?.summary || '반영했어요.' }]);
    } catch {
      // 네트워크 실패 → 클라이언트 규칙기반으로라도 동작
      const fb = first ? { patch: generateComposeDraft(text), summary: `“${text}” 컨셉으로 초안을 만들었어요.` } : refineComposeDraft(text, row);
      onPatch(fb.patch);
      setAiEngine('rules');
      setAiMsgs((m) => [...m, { role: 'ai', text: fb.summary }]);
    } finally {
      setAiBusy(false);
    }
  };

  // 어시스턴트는 페이지 안이 아니라 우측 AI Communicator 레일에 렌더한다(열려 있는 동안 콘텐츠를 꽂음).
  useEffect(() => {
    if (!rail) return;
    if (aiOpen) {
      rail.setRail(railId, <AiAssistantPanel open row={row} messages={aiMsgs} onSend={aiSend} onClose={() => setAiOpen(false)} busy={aiBusy} engine={aiEngine} />);
    } else {
      rail.setRail(railId, null);
    }
    return () => rail.setRail(railId, null);
    // row·aiMsgs·busy·engine이 바뀌면 레일 콘텐츠를 갱신해 최신으로 유지
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiOpen, row, aiMsgs, aiBusy, aiEngine]);

  return (
    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      {/* AI 배너 생성 — TBD(정책 미정). 고민 포인트만 남겨둠. 생성 로직은 파킹. */}
      <div className="mb-3 flex items-start gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/60 px-3 py-2.5">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-amber-800">AI 배너 생성 <span className="rounded bg-amber-200/70 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">TBD</span></p>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-700/90">
            정책 미정. 고민 포인트 — ① 생성 범위(문구만 vs 이미지·레이아웃) : DS 유형 규격 고정과 충돌 여부 ② 이미지 저작권·생성 소스(등록 이미지 활용 vs 생성) ③ 자동 카피 검수(승인 워크플로우 연계) ④ CVM 타겟별 문구 베리에이션 후보 생성과의 연결 ⑤ 실제 모델·비용·PII.
          </p>
        </div>
      </div>
      {!row.bannerType ? (
        /* DS 배너 유형 가져오기 — 이미지 등록과 동일한 UI(박스 + 가져오기 버튼). 등록된 유형(기본형)을 끌어오면 배경·레이아웃·색이 고정되고 텍스트·이미지만 편집 */
        <div className="flex items-start gap-3">
          <div className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-slate-50" style={{ width: dim.w, height: dim.h }}>
            <div className="flex flex-col items-center gap-1 text-slate-300"><Plus className="h-5 w-5" /><LayoutTemplate className="h-4 w-4" /><span className="text-[10px]">DS 배너 유형</span></div>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <DsTypePickButton onPick={(t) => onShared({ bannerType: t.id, ...(t.locked as Partial<TypeDetailRow>) })} />
            </div>
            <p className="text-[11px] text-muted-foreground">DS 포털에 <b>등록된 배너 유형</b>을 가져와 사용합니다. 현재 <b className="text-indigo-500">기본형</b> 하나만 등록되어 있어요 · 유형을 가져오면 배경·레이아웃·색은 고정되고 <b>텍스트·이미지만</b> 편집합니다.</p>
          </div>
        </div>
      ) : (
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row">
        {/* 미리보기 (같은 페이지 · 인라인) */}
        <div className="shrink-0">
          <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <ComposedBanner f={row} width={dim.w} height={dim.h} preview />
          </div>
          <p className="mt-1.5 text-center text-[11px] text-slate-400">미리보기 · {dim.label}</p>
        </div>

        {/* 편집 — DS 유형 고정, 텍스트·이미지만 */}
        <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[11.5px] font-semibold text-indigo-700"><LayoutTemplate className="h-3.5 w-3.5" />{dsBannerTypeName(row.bannerType)}</span>
              <span className="text-[11px] text-slate-400">텍스트·이미지만 편집</span>
              <button type="button" onClick={() => onShared({ bannerType: '' })} className="ml-auto inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600">유형 변경</button>
            </div>
            {/* 규격 정보 — 폰트·이미지·배너 규격 안내 */}
            <div className="mb-4 grid grid-cols-3 gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 text-[11px]">
              <div className="min-w-0"><p className="text-slate-400">배너 규격</p><p className="truncate font-medium text-slate-700">{row.detail || '—'}</p></div>
              <div className="min-w-0"><p className="text-slate-400">폰트</p><p className="truncate font-medium text-slate-700" title={dsBannerType(row.bannerType).font}>{dsBannerType(row.bannerType).font}</p></div>
              <div className="min-w-0"><p className="text-slate-400">권장 이미지</p><p className="truncate font-medium text-slate-700" title={dsBannerType(row.bannerType).image}>{dsBannerType(row.bannerType).image}</p></div>
            </div>
            <div className="mb-4 inline-flex rounded-lg bg-slate-100 p-0.5 text-[12.5px]">
              {(['text', 'image'] as const).map((k) => (
                <button key={k} type="button" onClick={() => setTab(k)}
                  className={'rounded-md px-3 py-1 font-medium transition ' + (tab === k ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                  {k === 'text' ? '텍스트' : '이미지'}
                </button>
              ))}
            </div>

            {tab === 'text' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <L>타이틀</L>
                  <Input value={row.title} onChange={(e) => onShared({ title: e.target.value })} placeholder="배너 타이틀" className="h-9 flex-1 text-sm" />
                </div>
                <div className="flex items-center gap-2">
                  <L>서브타이틀</L>
                  <Input value={row.subtitle} onChange={(e) => onShared({ subtitle: e.target.value })} placeholder="서브 문구 (비우면 미표시)" className="h-9 flex-1 text-sm" />
                </div>
                <p className="text-[11px] text-muted-foreground"><b className="text-indigo-500">문구·유형은 모든 규격 공통</b> 1벌로 적용돼요. 배경·글자·정렬·CTA는 <b>{dsBannerTypeName(row.bannerType)}</b> 유형 규격을 따르고, <b>이미지만 규격별</b>로 바꿀 수 있어요.</p>
              </div>
            )}

            {tab === 'image' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <L>이미지</L>
                  {row.rightImageUrl
                    ? <span className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600"><ImageIcon className="h-3 w-3" />등록됨<button type="button" onClick={() => onPatch({ rightImageUrl: '' })} className="text-slate-400 hover:text-slate-700"><X className="h-3 w-3" /></button></span>
                    : null}
                  <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50">
                    <Upload className="h-3 w-3" /> 로컬 업로드
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile('rightImageUrl', e.target.files?.[0])} />
                  </label>
                  <LibraryPickButton images={images} onPick={(url) => onPatch({ rightImageUrl: url })} label="DB에서 가져오기" />
                </div>
                <p className="text-[11px] text-muted-foreground">이미지 위치·크기·모양은 유형 규격을 따릅니다. 이미지와 텍스트만 교체하세요.</p>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
  );
}

// 상품/이벤트 조회 팝업
function PickerModal({ title, idLabel, items, onPick, onClose }: { title: string; idLabel: string; items: { id: string; name: string; kind: string }[]; onPick: (v: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const list = items.filter((it) => (q ? it.name.includes(q) || it.id.toLowerCase().includes(q.toLowerCase()) : true));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-sm font-bold">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
        </div>
        <div className="border-b px-5 py-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`${idLabel}·이름 검색`} className="h-9 pl-8 text-sm" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-[12px] text-slate-500">
              <tr className="border-b"><th className="w-12 px-3 py-2">선택</th><th className="px-3 py-2 text-left">{idLabel}</th><th className="px-3 py-2 text-left">이름</th><th className="px-3 py-2 text-left">구분</th></tr>
            </thead>
            <tbody>
              {list.map((it) => (
                <tr key={it.id} className="cursor-pointer border-b last:border-b-0 hover:bg-slate-50" onClick={() => onPick(`${it.id} (${it.name})`)}>
                  <td className="px-3 py-2.5 text-center"><input type="radio" name="pick" onChange={() => onPick(`${it.id} (${it.name})`)} className="accent-indigo-600" /></td>
                  <td className="px-3 py-2.5 text-slate-600">{it.id}</td>
                  <td className="px-3 py-2.5 font-medium text-slate-800">{it.name}</td>
                  <td className="px-3 py-2.5 text-slate-500">{it.kind}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end border-t px-5 py-3">
          <Button type="button" variant="outline" onClick={onClose}>닫기</Button>
        </div>
      </div>
    </div>
  );
}

export function BannerForm({ mode, action, value = {}, libImages = [] }: { mode: 'new' | 'edit'; action: (fd: FormData) => void | Promise<void>; value?: BannerFormValue; libImages?: ImageAsset[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const v = value;
  const [landing, setLanding] = useState(v.landingType ?? 'direct');
  const [landingUrl, setLandingUrl] = useState(v.landingUrl ?? '');
  const [noEnd, setNoEnd] = useState(mode === 'edit' && !!v.publishStart && !v.publishEnd);
  const [rows, setRows] = useState<TypeDetailRow[]>(
    v.typeDetails && v.typeDetails.length
      ? v.typeDetails.map((r) => ({ ...emptyRow(), ...r, useYn: r.useYn !== false }))
      : [emptyRow()],
  );
  const [bannerAlt, setBannerAlt] = useState(v.bannerAlt ?? '');
  const [picker, setPicker] = useState<null | 'product' | 'event'>(null);

  // 베리에이션 추가 — 직전 디자인(제작 방식·색·문구·이미지 등)을 복제하고 '다음 사이즈'로 채운다(비슷한 배너 여러 개).
  const addRow = () => setRows((r) => {
    const used = r.map((x) => x.detail);
    const nextDetail = DETAIL_TYPES.find((d) => !used.includes(d)) ?? DETAIL_TYPES[0];
    const last = r[r.length - 1];
    const clone = last ? { ...last, detail: nextDetail, useYn: true } : { ...emptyRow(), detail: nextDetail };
    return [...r, clone];
  });
  const pickFile = (i: number, key: 'imageUrl' | 'rightImageUrl', file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setRow(i, { [key]: String(reader.result) });
    reader.readAsDataURL(file);
  };
  const removeRow = (i: number) => setRows((r) => (r.length > 1 ? r.filter((_, idx) => idx !== i) : r));
  const setRow = (i: number, patch: Partial<TypeDetailRow>) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  // 문구·유형은 배너 공통 1벌 → 모든 규격 행에 동일 적용(이미지·사용여부만 규격별).
  const setAllCompose = (patch: Partial<TypeDetailRow>) => setRows((r) => r.map((row) => ({ ...row, ...patch })));

  return (
    <form ref={formRef} action={action}>
      <OpsSection title="기본 정보">
        <div className="grid grid-cols-2">
          <FieldRow label="배너캠페인 ID"><span className="text-[13px] text-slate-700">{v.campaignCode ?? '저장 시 자동 채번 (BC-YYYYMM-000)'}</span></FieldRow>
          <FieldRow label="배너캠페인(타이틀)" required><Input name="title" defaultValue={v.title ?? ''} placeholder="배너캠페인명을 입력하세요" className="h-9 text-sm" /></FieldRow>
          <FieldRow label="서브타이틀"><Input name="subtitle" defaultValue={v.subtitle ?? ''} placeholder="서브타이틀을 입력하세요" className="h-9 text-sm" /></FieldRow>
          <FieldRow label="캠페인 목적"><Input name="purpose" defaultValue={v.purpose ?? ''} maxLength={500} placeholder="캠페인 목적을 입력하세요 (최대 500자)" className="h-9 text-sm" /></FieldRow>
          <FieldRow label="플랫폼" required>
            <div className="flex gap-4">{['APP', 'WEB'].map((p) => <Radio key={p} name="platform" value={p} checked={(v.platform ?? 'APP') === p}>{p}</Radio>)}</div>
          </FieldRow>
        </div>
      </OpsSection>

      <OpsSection title="전시 설정">
        <div className="grid grid-cols-2">
          <FieldRow label="전시여부" required>
            <div className="flex gap-4"><Radio name="exposeYn" value="true" checked={v.exposeYn !== false}>전시</Radio><Radio name="exposeYn" value="false" checked={v.exposeYn === false}>미전시</Radio></div>
          </FieldRow>
          <FieldRow label="전시기간" required>
            <div className="flex flex-wrap items-center gap-1.5">
              <Input type="datetime-local" name="publishStart" defaultValue={toLocalInput(v.publishStart)} className="h-9 w-[180px] text-sm" />
              <span className="text-muted-foreground">-</span>
              <Input type="datetime-local" name="publishEnd" defaultValue={toLocalInput(v.publishEnd)} disabled={noEnd} className="h-9 w-[180px] text-sm disabled:bg-slate-100" />
              <label className="ml-1 flex items-center gap-1 text-[12px] text-muted-foreground"><input type="checkbox" checked={noEnd} onChange={(e) => setNoEnd(e.target.checked)} className="accent-indigo-600" />종료없음</label>
            </div>
          </FieldRow>
        </div>
      </OpsSection>

      <OpsSection title="랜딩 설정">
        <div className="grid grid-cols-2">
          <FieldRow label="랜딩 URL" required>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-3">{LANDING_TYPES.map((l) => (
                <label key={l.value} className="flex items-center gap-1.5 text-sm"><input type="radio" name="landingType" value={l.value} checked={landing === l.value} onChange={() => setLanding(l.value)} className="accent-indigo-600" />{l.label}</label>
              ))}</div>
              {landing === 'direct' && <Input name="landingUrl" value={landingUrl} onChange={(e) => setLandingUrl(e.target.value)} placeholder="https:// 랜딩 URL" className="h-9 text-sm" />}
              {(landing === 'product' || landing === 'event') && (
                <div className="flex items-center gap-2">
                  <input type="hidden" name="landingUrl" value={landingUrl} />
                  <span className="min-w-0 flex-1 truncate rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-[13px] text-slate-700">{landingUrl || (landing === 'product' ? '선택된 상품 없음' : '선택된 이벤트 없음')}</span>
                  <Button type="button" variant="outline" onClick={() => setPicker(landing)}>{landing === 'product' ? '상품조회' : '이벤트조회'}</Button>
                </div>
              )}
              {landing === 'none' && <input type="hidden" name="landingUrl" value="" />}
            </div>
          </FieldRow>
          <FieldRow label="페이지 타입">
            <div className="flex gap-4">{PAGE_TYPES.map((p) => <Radio key={p.value} name="pageType" value={p.value} checked={(v.pageType ?? 'current') === p.value}>{p.label}</Radio>)}</div>
          </FieldRow>
        </div>
      </OpsSection>

      <OpsSection title="유형상세">
        <input type="hidden" name="typeDetailsJson" value={JSON.stringify(rows)} />
        <input type="hidden" name="bannerAlt" value={bannerAlt} />
        <div className="space-y-3 p-4">
          {/* 공통 대체텍스트 — 같은 배너의 사이즈 공유 */}
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
            <span className="shrink-0 text-[13px] font-medium text-slate-600">이미지 대체텍스트(alt) <span className="text-[11px] text-muted-foreground">(모든 사이즈 공통)</span></span>
            <Input value={bannerAlt} onChange={(e) => setBannerAlt(e.target.value)} placeholder="접근성을 위해 배너 이미지의 주요 내용을 입력해주세요" className="h-9 flex-1 text-sm" />
          </div>
          {rows.map((row, i) => {
            const imgDim = pvDims(row.detail, 340);
            const cardDim = pvDims(row.detail, 380);
            return (
            <div key={i} className="rounded-lg border border-slate-200 p-3">
              <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                {/* 제작 방식 선택 (이미지 등록 / 직접 만들기) */}
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-muted-foreground">제작 방식</span>
                  <div className="inline-flex overflow-hidden rounded-lg border border-slate-200">
                    {METHODS.map((m) => (
                      <button key={m.value} type="button" onClick={() => setRow(i, { type: m.value })} title={m.desc}
                        className={'px-3 py-1.5 text-[13px] font-medium ' + (row.type === m.value ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-muted-foreground">배너 규격</span>
                  <Select value={row.detail} onChange={(e) => setRow(i, { detail: e.target.value })} className="h-9 w-52 text-sm">
                    {DETAIL_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
                  </Select>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-[12px] text-muted-foreground">사용여부</span>
                  <label className="flex items-center gap-1"><input type="radio" checked={row.useYn} onChange={() => setRow(i, { useYn: true })} className="accent-indigo-600" />사용</label>
                  <label className="flex items-center gap-1"><input type="radio" checked={!row.useYn} onChange={() => setRow(i, { useYn: false })} className="accent-indigo-600" />미사용</label>
                </div>
                {rows.length > 1 && (
                  <button type="button" onClick={() => removeRow(i)} title="이 베리에이션 삭제" className="ml-auto inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 px-2 text-[12px] text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"><Minus className="h-3.5 w-3.5" />삭제</button>
                )}
              </div>
              {/* 이미지형: 완성 이미지 업로드 */}
              {row.type === '이미지형' ? (
                <div className="flex items-start gap-3">
                  <div className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-slate-50" style={{ width: imgDim.w, height: imgDim.h }}>
                    {row.imageUrl
                      ? <><img src={row.imageUrl} alt="" className="h-full w-full object-contain p-1" /><button type="button" onClick={() => setRow(i, { imageUrl: '' })} className="absolute right-1 top-1 rounded-full bg-white/90 p-0.5 text-slate-400 shadow ring-1 ring-slate-200 hover:text-slate-700"><X className="h-3.5 w-3.5" /></button></>
                      : <div className="flex flex-col items-center gap-1 text-slate-300"><Plus className="h-5 w-5" /><ImageIcon className="h-4 w-4" /><span className="text-[10px]">{imgDim.label}</span></div>}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50">
                        <Upload className="h-3.5 w-3.5" /> 로컬 업로드
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(i, 'imageUrl', e.target.files?.[0])} />
                      </label>
                      <LibraryPickButton images={libImages} onPick={(url) => setRow(i, { imageUrl: url })} label="DB에서 가져오기" />
                    </div>
                    <p className="text-[11px] text-muted-foreground">완성된 배너 이미지를 <b>로컬 파일 업로드</b> 또는 <b>DB 이미지 라이브러리</b>에서 선택해 등록합니다 · 권장 규격: {row.detail} · JPG/PNG</p>
                  </div>
                </div>
              ) : (
                /* 직접 만들기: 같은 페이지 인라인 편집(미리보기 + 탭 컨트롤) */
                <ComposeEditorInline row={row} onPatch={(patch) => setRow(i, patch)} onShared={setAllCompose} onFile={(key, file) => pickFile(i, key, file)} images={libImages} />
              )}
            </div>
            );
          })}
          {/* 베리에이션 추가 — 한 곳에서. 직전 디자인을 복제해 다음 사이즈로 채운다(비슷한 배너 여러 개) */}
          <button type="button" onClick={addRow} className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-slate-200 py-3 text-[13px] font-medium text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600">
            <Plus className="h-4 w-4" /> 베리에이션 추가 <span className="text-[11px] font-normal text-slate-400">· 같은 디자인 · 다음 사이즈</span>
          </button>
          <p className="text-[11px] text-muted-foreground">제작 방식(이미지 등록 / 직접 만들기)과 배너 규격(빅배너·스몰배너·띠배너·팝업배너)을 베리에이션으로 추가합니다. 미리보기는 선택한 규격의 실제 비율로 표시되며, 사용여부는 규격별로 개별 설정됩니다.</p>
        </div>
      </OpsSection>

      <div className="flex items-center justify-center gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
        <Button type="submit">저장</Button>
      </div>

      {picker === 'product' && <PickerModal title="상품 조회" idLabel="상품 ID" items={SAMPLE_PRODUCTS} onPick={(vv) => { setLandingUrl(vv); setPicker(null); }} onClose={() => setPicker(null)} />}
      {picker === 'event' && <PickerModal title="이벤트 조회" idLabel="이벤트 ID" items={SAMPLE_EVENTS} onPick={(vv) => { setLandingUrl(vv); setPicker(null); }} onClose={() => setPicker(null)} />}
    </form>
  );
}
