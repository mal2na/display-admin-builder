import { Signal, Wifi, BatteryFull, ChevronLeft, Share2, ChevronDown, ChevronRight, ImageIcon, Gift } from 'lucide-react';
import { cornerLayout, GROUP_CORNER } from '@/lib/event-components';

// 페이지 노드 트리 (렌더 전용)
export type NodeView = {
  id: string;
  type: string;
  props: Record<string, any>;
  children: NodeView[];
};

const isRenderableImg = (src?: string | null) => !!src && (src.startsWith('data:') || src.startsWith('http'));

// props의 margin/padding → style
function boxStyle(p: Record<string, any>): React.CSSProperties {
  return {
    marginTop: p.mt || 0,
    marginRight: p.mr || 0,
    marginBottom: p.mb || 0,
    marginLeft: p.ml || 0,
    paddingTop: p.pt || 0,
    paddingRight: p.pr || 0,
    paddingBottom: p.pb || 0,
    paddingLeft: p.pl || 0,
  };
}

function TextNode({ p }: { p: Record<string, any> }) {
  return (
    <div style={{ ...boxStyle(p), textAlign: p.align, color: p.color, fontSize: p.size, fontWeight: p.weight === 'bold' ? 700 : p.weight === 'semibold' ? 600 : 400 }} className="whitespace-pre-line leading-relaxed">
      {p.text || '텍스트'}
    </div>
  );
}

function TableNode({ p }: { p: Record<string, any> }) {
  const headers: string[] = p.headers ?? [];
  const rows: string[][] = p.rows ?? [];
  const variant = p.variant ?? '기본';
  const border = variant !== '미니멀';
  const striped = variant === '가로줄';
  const card = variant === '카드형';
  return (
    <div style={boxStyle(p)} className="overflow-x-auto">
      <table className={`w-full border-collapse text-[12px] ${card ? 'overflow-hidden rounded-xl ring-1 ring-slate-200' : ''}`}>
        {headers.length > 0 && (
          <thead>
            <tr className={card ? 'bg-slate-50' : ''}>
              {headers.map((h, i) => (
                <th key={i} className={`px-2 py-1.5 text-left font-semibold ${border ? 'border-b border-slate-200' : ''} ${i === headers.length - 1 ? 'text-indigo-600' : 'text-slate-500'}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={striped && i % 2 === 1 ? 'bg-slate-50/70' : ''}>
              {r.map((c, j) => (
                <td key={j} className={`px-2 py-1.5 ${border ? 'border-b border-slate-100' : ''} ${j === 0 ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ImageNode({ p }: { p: Record<string, any> }) {
  const h = p.height && p.height !== 'auto' ? Number(p.height) : undefined;
  return (
    <div style={{ ...boxStyle(p), borderRadius: p.radius }} className="relative overflow-hidden">
      {isRenderableImg(p.url) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.url} alt={p.overlayText ?? ''} style={{ height: h, borderRadius: p.radius }} className="w-full object-cover" />
      ) : (
        <div style={{ height: h ?? 150, borderRadius: p.radius }} className="flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-100 text-slate-400">
          <ImageIcon className="mb-1 h-7 w-7 opacity-50" />
          <span className="text-[11px]">이미지를 추가하세요</span>
        </div>
      )}
      {p.overlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-[15px] font-bold text-white">{p.overlayText || 'Coming Soon'}</div>
      )}
    </div>
  );
}

function ButtonNode({ p }: { p: Record<string, any> }) {
  return (
    <div style={boxStyle(p)}>
      <button
        style={{ background: p.bg, color: p.color, borderRadius: p.radius }}
        className={`${p.full ? 'w-full' : ''} px-5 py-3 text-[14px] font-semibold`}
      >
        {p.label || '버튼'}
      </button>
    </div>
  );
}

function DividerNode({ p }: { p: Record<string, any> }) {
  return (
    <div style={boxStyle(p)}>
      <div style={{ borderTopStyle: p.style, borderTopColor: p.color, borderTopWidth: p.thickness }} />
    </div>
  );
}

function HtmlNode({ p }: { p: Record<string, any> }) {
  return <div style={boxStyle(p)} className="text-[13px] text-slate-700" dangerouslySetInnerHTML={{ __html: p.html ?? '' }} />;
}

function RouletteNode({ p }: { p: Record<string, any> }) {
  const segs: string[] = p.segments ?? [];
  const colors: string[] = p.colors ?? [];
  const n = Math.max(segs.length, 1);
  const step = 360 / n;
  const slices = segs.map((_, i) => `${colors[i % colors.length] ?? '#ddd'} ${i * step}deg ${(i + 1) * step}deg`).join(', ');
  return (
    <div style={boxStyle(p)} className="flex justify-center">
      <div className="relative aspect-square w-[220px]">
        <div className="absolute left-1/2 top-[-4px] z-20 h-0 w-0 -translate-x-1/2 border-x-[10px] border-t-[16px] border-x-transparent border-t-red-500" />
        <div className="relative h-full w-full rounded-full border-[6px] border-indigo-900 shadow-lg" style={{ background: `conic-gradient(${slices})` }}>
          {segs.map((s, i) => {
            const angle = i * step + step / 2;
            return (
              <span key={i} className="absolute left-1/2 top-1/2 text-[10px] font-bold text-white drop-shadow" style={{ transform: `rotate(${angle}deg) translateY(-80px) rotate(${90 - angle}deg)`, transformOrigin: 'center' }}>
                {s}
              </span>
            );
          })}
          <div className="absolute left-1/2 top-1/2 flex h-[64px] w-[64px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-red-500 text-[13px] font-extrabold text-white shadow-md">
            {p.startLabel || 'START'}
          </div>
        </div>
      </div>
    </div>
  );
}

function CardNode({ p, children }: { p: Record<string, any>; children: React.ReactNode }) {
  return (
    <div style={{ ...boxStyle(p), background: p.bg, borderRadius: p.radius }} className={p.shadow ? 'shadow-sm' : 'ring-1 ring-slate-200'}>
      {children}
    </div>
  );
}
function HRowNode({ p, children }: { p: Record<string, any>; children: React.ReactNode }) {
  const align: Record<string, string> = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch' };
  const justify: Record<string, string> = { start: 'flex-start', center: 'center', end: 'flex-end', between: 'space-between' };
  return (
    <div
      style={{ ...boxStyle(p), display: 'flex', gap: p.gap, alignItems: align[p.align] ?? 'center', justifyContent: justify[p.justify] ?? 'flex-start', flexWrap: p.wrap === 'wrap' ? 'wrap' : 'nowrap' }}
    >
      {children}
    </div>
  );
}
function VStackNode({ p, children }: { p: Record<string, any>; children: React.ReactNode }) {
  return <div style={{ ...boxStyle(p), display: 'flex', flexDirection: 'column', gap: p.gap }}>{children}</div>;
}
function AccordionNode({ p, children }: { p: Record<string, any>; children: React.ReactNode }) {
  return (
    <div style={boxStyle(p)} className="overflow-hidden rounded-xl ring-1 ring-slate-200">
      <div style={{ background: p.headerBg, color: p.headerColor }} className="flex items-center justify-between px-4 py-3 text-[14px] font-semibold">
        {p.header || '접이식 버튼'} <ChevronDown className="h-4 w-4 opacity-60" />
      </div>
      {p.open && <div className="space-y-2 p-3">{children}</div>}
    </div>
  );
}

// ── 전시(거버넌스) 컴포넌트 ──
function BannerNode({ p }: { p: Record<string, any> }) {
  return (
    <div style={{ ...boxStyle(p), background: p.bg }} className="flex items-center gap-3 rounded-2xl p-4">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold leading-snug text-slate-900">{p.title || '배너 타이틀'}</p>
        {p.sub && <p className="text-[12px] text-slate-500">{p.sub}</p>}
        {p.cta && <span className="mt-1 inline-flex rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-semibold text-white">{p.cta}</span>}
      </div>
      {isRenderableImg(p.image) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.image} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white/60 text-[9px] text-slate-400">이미지</div>
      )}
    </div>
  );
}
function ProductNode({ p }: { p: Record<string, any> }) {
  return (
    <div style={boxStyle(p)} className="w-[128px] shrink-0">
      {isRenderableImg(p.image) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.image} alt="" className="aspect-[3/4] w-full rounded-xl object-cover" />
      ) : (
        <div className="flex aspect-[3/4] w-full items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-slate-200 text-[9px] text-slate-400">상품</div>
      )}
      <p className="mt-1.5 truncate text-[13px] font-semibold text-slate-900">{p.name || '상품명'}</p>
      <p className="text-[12px] font-bold text-slate-700">{p.price}</p>
    </div>
  );
}
function BenefitNode({ p }: { p: Record<string, any> }) {
  return (
    <div style={boxStyle(p)} className="flex items-center gap-3 py-2">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50"><Gift className="h-5 w-5 text-indigo-500" /></div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-slate-900">{p.title || '혜택 문구'}</p>
        {p.brand && <p className="truncate text-[12px] text-slate-400">{p.brand}</p>}
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300" />
    </div>
  );
}
function ChipNode({ p }: { p: Record<string, any> }) {
  const items: string[] = p.items ?? [];
  const sel = p.selected ?? 0;
  return (
    <div style={boxStyle(p)} className="flex gap-1.5 overflow-x-auto pb-1">
      {items.map((it, i) => (
        <span key={i} className={`h-7 shrink-0 whitespace-nowrap rounded-full px-3 text-[11px] leading-7 ${i === sel ? 'bg-slate-900 font-semibold text-white' : 'border border-slate-300 bg-white font-medium text-slate-700'}`}>{it}</span>
      ))}
    </div>
  );
}
function CornerFrame({ p, children }: { p: Record<string, any>; children: React.ReactNode }) {
  const layout = cornerLayout(p.cornerType);
  const body =
    layout === 'scroll' ? (
      <div className="flex gap-3 overflow-x-auto pb-1">{children}</div>
    ) : layout === 'grid' ? (
      <div className="grid grid-cols-2 gap-2">{children}</div>
    ) : (
      <div className="space-y-2 divide-y divide-slate-100 [&>*]:pt-2 first:[&>*]:pt-0">{children}</div>
    );
  // 전시/관리 코너처럼 '판'(테두리 카드) + 주요태그/타이틀/설명 헤더로 렌더 (template05 기준)
  const isGroup = !p.cornerType || p.cornerType === GROUP_CORNER;
  return (
    <section style={boxStyle(p)} className="rounded-2xl border border-indigo-100 bg-white p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          {p.tag && <span className="mb-1 inline-block rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600">{p.tag}</span>}
          <h3 className="truncate text-[16px] font-bold text-slate-900">{p.title || '코너'}</h3>
          {p.subTitle && <p className="mt-0.5 text-[12px] text-slate-400">{p.subTitle}</p>}
        </div>
        {!isGroup && <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">{p.cornerType}</span>}
      </div>
      {body}
    </section>
  );
}

// ── Contents Catalog 모듈 (Variant별 렌더) ──
function StepsNode({ p }: { p: Record<string, any> }) {
  const steps: string[] = Array.isArray(p.steps) ? p.steps : [];
  const v = p.variant ?? '스텝 리스트';
  return (
    <div className="space-y-2">
      {p.title && <p className="text-[14px] font-bold text-slate-900">{p.title}</p>}
      {v === '자유 텍스트' ? (
        <div className="space-y-1 text-[13px] leading-relaxed text-slate-600">{steps.map((s, i) => <p key={i}>{s}</p>)}</div>
      ) : v === '진행률' ? (
        <div className="space-y-2">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${i === 0 ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{i + 1}</span>
              <span className="text-[13px] text-slate-700">{s}</span>
            </div>
          ))}
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: steps.length ? `${Math.round(100 / steps.length)}%` : '0%' }} /></div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">{i + 1}</span>
              <span className="text-[13px] text-slate-700">{s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BenefitCardNode({ p }: { p: Record<string, any> }) {
  const items: { name: string; desc?: string; price?: string }[] = Array.isArray(p.items) ? p.items : [];
  const v = p.variant ?? '리스트형';
  if (v === '2열 구좌형') {
    return (
      <div className="grid grid-cols-2 gap-2">
        {items.map((it, i) => (
          <div key={i} className="rounded-xl border p-2.5">
            <div className="mb-1.5 aspect-[4/3] w-full rounded-lg bg-gradient-to-br from-indigo-100 to-slate-200" />
            <p className="truncate text-[12px] font-semibold text-slate-800">{it.name}</p>
            {it.desc && <p className="truncate text-[11px] text-slate-400">{it.desc}</p>}
            {it.price && <p className="text-[12px] font-bold text-indigo-600">{it.price}</p>}
          </div>
        ))}
      </div>
    );
  }
  if (v === '카드형') {
    const it = items[0];
    return (
      <div className="overflow-hidden rounded-2xl border">
        <div className="aspect-[16/9] w-full bg-gradient-to-br from-indigo-100 to-slate-200" />
        <div className="p-3">
          <p className="text-[14px] font-bold text-slate-900">{it?.name ?? '혜택'}</p>
          {it?.desc && <p className="text-[12px] text-slate-500">{it.desc}</p>}
          {it?.price && <p className="mt-1 text-[15px] font-bold text-indigo-600">{it.price}</p>}
        </div>
      </div>
    );
  }
  // 리스트형
  return (
    <div className="divide-y divide-slate-100">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-indigo-100 to-slate-200" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-slate-800">{it.name}</p>
            {it.desc && <p className="truncate text-[11px] text-slate-400">{it.desc}</p>}
          </div>
          {it.price && <span className="shrink-0 text-[13px] font-bold text-indigo-600">{it.price}</span>}
        </div>
      ))}
    </div>
  );
}

function InputNode({ p }: { p: Record<string, any> }) {
  const v = p.variant ?? '인풋';
  const options: string[] = Array.isArray(p.options) ? p.options : [];
  if (v === '객관식') {
    return (
      <div className="space-y-2">
        {p.label && <p className="text-[13px] font-semibold text-slate-800">{p.label}</p>}
        {options.map((o, i) => (
          <label key={i} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] text-slate-700">
            <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${i === (p.selected ?? 0) ? 'border-indigo-500' : 'border-slate-300'}`}>{i === (p.selected ?? 0) && <span className="h-2 w-2 rounded-full bg-indigo-500" />}</span>
            {o}
          </label>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {p.label && <p className="text-[13px] font-semibold text-slate-800">{p.label}</p>}
      <div className="flex gap-2">
        <div className="flex h-10 flex-1 items-center rounded-lg border px-3 text-[12px] text-slate-400">{p.placeholder ?? '입력해 주세요'}</div>
        <div className="flex h-10 items-center rounded-lg bg-slate-800 px-4 text-[12px] font-medium text-white">확인</div>
      </div>
    </div>
  );
}

// 위치 표시 슬롯 — 등록정보/시스템에서 관리되는 콘텐츠의 "자리"만 표시 (빌더 편집 불가)
const SLOT_META: Record<string, { icon: string; tone: string }> = {
  SLOT_HEADER: { icon: '🏷️', tone: 'border-slate-300 bg-slate-50 text-slate-500' },
  SLOT_THUMB: { icon: '🖼️', tone: 'border-slate-300 bg-slate-50 text-slate-500' },
  SLOT_NOTICE: { icon: '⚠️', tone: 'border-amber-300 bg-amber-50 text-amber-700' },
  SLOT_CONSENT: { icon: '🛡️', tone: 'border-amber-300 bg-amber-50 text-amber-700' },
  SLOT_REWARD: { icon: '🎁', tone: 'border-slate-300 bg-slate-50 text-slate-500' },
  SLOT_CTA: { icon: '🔘', tone: 'border-indigo-300 bg-indigo-50 text-indigo-600' },
};
function SlotNode({ type, p }: { type: string; p: Record<string, any> }) {
  const meta = SLOT_META[type] ?? SLOT_META.SLOT_HEADER;
  return (
    <div className={`relative rounded-lg border-2 border-dashed px-3 py-4 text-center ${meta.tone}`}>
      <span className="absolute right-1.5 top-1.5 rounded bg-white/80 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ring-1 ring-black/5">
        위치 표시
      </span>
      <div className="text-lg leading-none">{meta.icon}</div>
      <p className="mt-1 text-[12px] font-semibold">{p.label ?? '위치 표시'}</p>
      <p className="mt-0.5 text-[10px] leading-snug opacity-80">{p.note ?? '빌더 밖(등록정보)에서 관리됩니다.'}</p>
    </div>
  );
}

/** 노드 본체 렌더 (자식 엘리먼트는 호출측이 주입 → 프리뷰/에디터 공용) */
export function renderNodeBody(type: string, props: Record<string, any>, childrenEls: React.ReactNode): React.ReactNode {
  const p = props ?? {};
  switch (type) {
    case 'TEXT':
      return <TextNode p={p} />;
    case 'TABLE':
      return <TableNode p={p} />;
    case 'IMAGE':
      return <ImageNode p={p} />;
    case 'BUTTON':
      return <ButtonNode p={p} />;
    case 'DIVIDER':
      return <DividerNode p={p} />;
    case 'HTML':
      return <HtmlNode p={p} />;
    case 'ROULETTE':
      return <RouletteNode p={p} />;
    case 'STEPS':
      return <StepsNode p={p} />;
    case 'BENEFIT_CARD':
      return <BenefitCardNode p={p} />;
    case 'INPUT':
      return <InputNode p={p} />;
    case 'CARD':
      return <CardNode p={p}>{childrenEls}</CardNode>;
    case 'HROW':
      return <HRowNode p={p}>{childrenEls}</HRowNode>;
    case 'VSTACK':
      return <VStackNode p={p}>{childrenEls}</VStackNode>;
    case 'ACCORDION':
      return <AccordionNode p={p}>{childrenEls}</AccordionNode>;
    case 'BANNER':
      return <BannerNode p={p} />;
    case 'PRODUCT':
      return <ProductNode p={p} />;
    case 'BENEFIT':
      return <BenefitNode p={p} />;
    case 'CHIP':
      return <ChipNode p={p} />;
    case 'CORNER':
      return <CornerFrame p={p}>{childrenEls}</CornerFrame>;
    case 'SLOT_HEADER':
    case 'SLOT_THUMB':
    case 'SLOT_NOTICE':
    case 'SLOT_CONSENT':
    case 'SLOT_REWARD':
    case 'SLOT_CTA':
      return <SlotNode type={type} p={p} />;
    default:
      return <div className="rounded border border-dashed border-slate-300 p-2 text-[11px] text-slate-400">{type}</div>;
  }
}

/** 노드 하나(+자식) 순수 렌더 (프리뷰) */
export function EventNodeView({ node }: { node: NodeView }) {
  const kids = <>{node.children.map((c) => <EventNodeView key={c.id} node={c} />)}</>;
  return <>{renderNodeBody(node.type, node.props ?? {}, kids)}</>;
}

/** 디바이스 프레임 (상태바 + 헤더 + 스크롤 바디) */
export function DeviceShell({ width, height, headerLabel, children }: { width: number; height: number; headerLabel: string; children: React.ReactNode }) {
  return (
    <div style={{ width }} className="max-w-full">
      <div className="overflow-hidden rounded-[2.4rem] border-[10px] border-slate-900 bg-white shadow-xl">
        <div className="flex items-center justify-between bg-white px-5 py-2 text-xs font-semibold text-slate-900">
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <Signal className="h-3.5 w-3.5" />
            <Wifi className="h-3.5 w-3.5" />
            <BatteryFull className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="flex items-center justify-between border-b bg-white px-3 py-2 text-sm font-semibold text-slate-800">
          <ChevronLeft className="h-5 w-5" />
          <span className="truncate">{headerLabel}</span>
          <Share2 className="h-4 w-4 text-slate-500" />
        </div>
        <div style={{ height }} className="evt-scroll overflow-y-auto bg-slate-100 p-3">{children}</div>
      </div>
    </div>
  );
}
