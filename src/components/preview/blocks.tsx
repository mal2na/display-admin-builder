import { Signal, Wifi, BatteryFull, ChevronRight, Percent, ShoppingBag, User } from 'lucide-react';
import { IconGlyph, isIconRef } from '@/lib/icon-library';

export type PreviewAtom = {
  id: string;
  name: string;
  atomType: string;
  content: string | null;
  imageUrl: string | null;
  altText: string | null;
  linkUrl: string | null;
};
export type PreviewComponent = { id: string; name: string; componentType: string; atoms: PreviewAtom[]; selectedIndex?: number; chipRows?: number };
export type PreviewCorner = {
  id: string;
  name: string;
  cornerType: string;
  title: string | null;
  maxItems: number | null;
  components: PreviewComponent[];
  mainTitle?: string | null;
  subTitle?: string | null;
  cornerLayout?: string | null;
  layoutDetail?: string | null;
  subTitleIcon?: string | null;
  moreButtonUse?: boolean | null;
  moreButtonLabel?: string | null;
  bannerImageUrl?: string | null;
  bannerName?: string | null;
};

const byType = (atoms: PreviewAtom[], ...types: string[]) => atoms.filter((a) => types.includes(a.atomType));
const first = (atoms: PreviewAtom[], ...types: string[]) => byType(atoms, ...types)[0];

/** 실제로 <img>로 그릴 수 있는 소스인지 (AI 생성 data URI / 외부 http) */
const isRenderableImg = (src?: string | null) => !!src && (src.startsWith('data:') || src.startsWith('http'));

function ImageBox({ atom, className }: { atom?: PreviewAtom; className?: string }) {
  if (isRenderableImg(atom?.imageUrl)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={atom!.imageUrl!} alt={atom?.altText ?? ''} className={`object-cover ${className ?? ''}`} />;
  }
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br from-indigo-100 to-slate-200 text-[9px] text-slate-500 ${className ?? ''}`}>
      {atom?.imageUrl?.split('/').pop() ?? atom?.altText ?? '이미지'}
    </div>
  );
}

function ChipsView({ component }: { component: PreviewComponent }) {
  const sel = component.selectedIndex ?? 0;
  const twoRows = component.chipRows === 2;
  return (
    <div
      className={
        twoRows
          ? 'flex flex-wrap items-start gap-1.5'
          : 'flex flex-nowrap items-start gap-1.5 overflow-x-auto pb-1'
      }
    >
      {component.atoms.map((a, i) => (
        <span
          key={a.id}
          className={
            'flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 text-[11px] ' +
            (i === sel
              ? 'bg-slate-900 font-semibold text-white'
              : 'border border-slate-300 bg-white font-medium text-slate-700')
          }
        >
          {a.imageUrl &&
            (isIconRef(a.imageUrl) ? (
              <IconGlyph name={a.imageUrl} className="-ml-0.5 h-3.5 w-3.5" />
            ) : isRenderableImg(a.imageUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.imageUrl} alt={a.altText ?? ''} className="-ml-0.5 h-4 w-4 rounded-full object-cover" />
            ) : (
              <span className="-ml-0.5 h-4 w-4 rounded-full bg-slate-300/70" title={a.altText ?? a.imageUrl} />
            ))}
          {a.content ?? a.name}
        </span>
      ))}
    </div>
  );
}

function ProductCard({ component }: { component: PreviewComponent }) {
  const poster = first(component.atoms, 'IMAGE');
  const title = first(component.atoms, 'TEXT');
  const info = first(component.atoms, 'INFO');
  return (
    <div className="w-[128px] shrink-0">
      <ImageBox atom={poster} className="aspect-[3/4] w-full rounded-xl" />
      <p className="mt-1.5 truncate text-[13px] font-semibold text-slate-900">{title?.content ?? component.name}</p>
      {info && <p className="text-[11px] text-slate-400">{info.content}</p>}
    </div>
  );
}

function BannerCard({ component }: { component: PreviewComponent }) {
  const title = first(component.atoms, 'TEXT', 'BENEFIT_TEXT');
  const sub = first(component.atoms, 'INFO');
  const cta = first(component.atoms, 'BUTTON', 'CTA');
  const img = first(component.atoms, 'IMAGE', 'ICON');
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-[15px] font-bold leading-snug text-slate-900">{title?.content ?? component.name}</p>
        {sub && <p className="text-[12px] text-slate-400">{sub.content}</p>}
        {cta && (
          <span className="mt-1 inline-flex rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-semibold text-white">
            {cta.content}
          </span>
        )}
      </div>
      {img && <ImageBox atom={img} className="h-16 w-16 shrink-0 rounded-xl" />}
    </div>
  );
}

// 세로 리스트 행: [로고/아이콘] + [혜택문구(굵게) / 브랜드(작게)]. 상품형·세로형, 혜택형 공용.
function BenefitRow({ component }: { component: PreviewComponent }) {
  const logo = first(component.atoms, 'ICON', 'IMAGE');
  const texts = byType(component.atoms, 'BENEFIT_TEXT', 'TEXT', 'INFO', 'PRICE');
  const title = texts[0];
  const brand = texts[1];
  return (
    <div className="flex items-center gap-3 py-2">
      <ImageBox atom={logo} className="h-11 w-11 shrink-0 rounded-2xl" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-slate-900">{title?.content ?? component.name}</p>
        {brand && <p className="truncate text-[12px] text-slate-400">{brand.content}</p>}
      </div>
    </div>
  );
}

function DefaultCard({ component }: { component: PreviewComponent }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-[12px] text-slate-700">
      {component.atoms.length ? component.atoms.map((a) => <div key={a.id}>{a.content ?? a.name}</div>) : component.name}
    </div>
  );
}

type LayoutMode = 'horizontal' | 'grid' | 'single' | 'list';

function ComponentView({ component, mode }: { component: PreviewComponent; mode?: LayoutMode }) {
  switch (component.componentType) {
    case '선택형':
      return <ChipsView component={component} />;
    case '상품형':
      // 세로 리스트형 코너에서는 큰 포스터 카드가 아니라 로고+문구 행 구조로 렌더 (참고 디자인)
      return mode === 'list' ? <BenefitRow component={component} /> : <ProductCard component={component} />;
    case '배너형':
      return <BannerCard component={component} />;
    case '혜택형':
      return <BenefitRow component={component} />;
    default:
      return <DefaultCard component={component} />;
  }
}

/** 한 Corner를 화면 영역으로 렌더 (프리뷰/빌더 공용) */
export function CornerBlock({ corner }: { corner: PreviewCorner }) {
  const isBanner = corner.cornerType === '배너형';
  const heading = corner.mainTitle ?? corner.title;
  const sub = corner.subTitle ?? corner.name;
  const showChevron = (corner.subTitleIcon ?? '화살표') !== '사용안함';

  // 코너 레이아웃(노출 방식) → 본문 배치 모드. 5종이 각각 다르게 렌더된다.
  const layoutMode = ((): LayoutMode => {
    switch (corner.cornerLayout) {
      case '가로 SWIPE형':
        return 'horizontal';
      case '그리드형':
        return 'grid';
      case '단일형':
      case '단일 고정형':
        return 'single';
      case '세로 리스트형':
        return 'list';
      default: {
        // 코너 레이아웃이 비어 있으면 유형 상세로 배치를 추론
        const d = corner.layoutDetail ?? '';
        if (d.includes('그리드')) return 'grid';
        if (d.includes('상품카드') || d.includes('가로') || d.includes('2.5') || d.includes('SWIPE')) return 'horizontal';
        if (d.includes('세로') || d.includes('리스트')) return 'list';
        if (corner.cornerType === '상품형') return 'horizontal';
        if (isBanner) return 'single';
        return 'list';
      }
    }
  })();

  // 배치 모드에 맞춰 컴포넌트 묶음을 렌더
  const renderComps = (comps: PreviewComponent[], mode: LayoutMode) => {
    if (mode === 'horizontal')
      return (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {comps.map((c) => (
            <ComponentView key={c.id} component={c} mode={mode} />
          ))}
        </div>
      );
    if (mode === 'grid')
      return (
        <div className="grid grid-cols-2 gap-2">
          {comps.map((c) => (
            <ComponentView key={c.id} component={c} mode={mode} />
          ))}
        </div>
      );
    if (mode === 'single')
      return (
        <div className="space-y-2 [&>*]:w-full">
          {comps.map((c) => (
            <ComponentView key={c.id} component={c} mode={mode} />
          ))}
        </div>
      );
    return (
      <div className="divide-y divide-slate-100">
        {comps.map((c) => (
          <ComponentView key={c.id} component={c} mode={mode} />
        ))}
      </div>
    );
  };

  // 선택형(카테고리 탭/칩)은 항상 상단 전체폭, 나머지 본문은 코너 레이아웃대로 배치.
  // (예: 상품형·세로형(카테고리탭) = 상단 카테고리 탭 + 아래 세로 리스트)
  const chipComps = corner.components.filter((c) => c.componentType === '선택형');
  const bodyComps = corner.components.filter((c) => c.componentType !== '선택형');

  const body =
    corner.components.length === 0 ? (
      <div className="rounded-lg border border-dashed border-slate-300 p-3 text-center text-[11px] text-slate-400">
        {corner.name} — Component 없음
      </div>
    ) : chipComps.length > 0 && bodyComps.length > 0 ? (
      <div className="space-y-3">
        {chipComps.map((c) => (
          <ComponentView key={c.id} component={c} />
        ))}
        {renderComps(bodyComps, layoutMode)}
      </div>
    ) : (
      renderComps(corner.components, layoutMode)
    );

  const wrapClass = isBanner ? '' : 'rounded-2xl bg-white p-4 shadow-sm';

  // 코너 부속 배너. 배너형 코너는 배너가 곧 본문이라 상단, 그 외(상품형 등 '빅배너')는 카드 아래에 렌더.
  const bannerEl = corner.bannerImageUrl ? (
    isRenderableImg(corner.bannerImageUrl) ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={corner.bannerImageUrl}
        alt={corner.bannerName ?? ''}
        className="aspect-[16/7] w-full overflow-hidden rounded-2xl object-cover"
      />
    ) : (
      <div className="flex aspect-[16/7] w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-200 to-slate-300 text-[10px] font-medium text-slate-600">
        {corner.bannerName ?? corner.bannerImageUrl.split('/').pop()}
      </div>
    )
  ) : null;

  return (
    <section className={`space-y-2 ${wrapClass}`}>
      {isBanner && bannerEl}
      {heading && (
        <div>
          <h3 className="whitespace-pre-line text-[16px] font-bold leading-snug text-slate-900">{heading}</h3>
          {sub && (
            <p className="mt-0.5 flex items-center gap-0.5 text-[12px] text-slate-400">
              {sub} {showChevron && <ChevronRight className="h-3 w-3" />}
            </p>
          )}
        </div>
      )}
      {body}
      {corner.moreButtonUse && (
        <div className="pt-1 text-center">
          <span className="inline-flex items-center gap-0.5 rounded-full border border-slate-300 bg-white px-4 py-1.5 text-[12px] font-medium text-slate-600">
            {corner.moreButtonLabel || '더보기'} <ChevronRight className="h-3 w-3" />
          </span>
        </div>
      )}
      {!isBanner && bannerEl}
    </section>
  );
}

/** 디바이스 프레임 (상태바 + 헤더 + 스크롤 바디 + 하단 네비). width/bodyHeight로 기종 조절 */
export function DeviceFrame({
  width,
  bodyHeight,
  headerLabel,
  children,
}: {
  width: number;
  bodyHeight: number;
  headerLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ width }} className="max-w-full">
      <div className="overflow-hidden rounded-[2.2rem] border-[10px] border-slate-900 bg-slate-100 shadow-xl">
        <div className="flex items-center justify-between bg-slate-100 px-5 py-2 text-xs font-semibold text-slate-900">
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <Signal className="h-3.5 w-3.5" />
            <Wifi className="h-3.5 w-3.5" />
            <BatteryFull className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="border-b bg-white px-4 py-2 text-sm font-semibold text-slate-700">{headerLabel}</div>
        <div style={{ height: bodyHeight }} className="space-y-3 overflow-y-auto bg-slate-100 p-3">
          {children}
        </div>
        <div className="flex justify-around border-t bg-white py-2 text-[11px]">
          <span className="flex flex-col items-center gap-0.5 font-semibold text-indigo-600">
            <Percent className="h-4 w-4" /> 혜택
          </span>
          <span className="flex flex-col items-center gap-0.5 text-slate-400">
            <ShoppingBag className="h-4 w-4" /> 쇼핑
          </span>
          <span className="flex flex-col items-center gap-0.5 text-slate-400">
            <User className="h-4 w-4" /> 마이
          </span>
        </div>
      </div>
    </div>
  );
}
