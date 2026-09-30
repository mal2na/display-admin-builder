import { Signal, Wifi, BatteryFull, ChevronRight, ChevronDown, Percent, ShoppingBag, User, Lock, GripVertical, Sparkles, ImageIcon } from 'lucide-react';
import { IconGlyph, isIconRef } from '@/lib/icon-library';
import { resolveCvmSample, cvmBindingLabel } from '@/lib/display-taxonomy';
import { PreviewImage } from './preview-image';
import { cn } from '@/lib/utils';
import { parseBannerOptions } from '@/lib/banner-options';
import { BannerCarousel } from './banner-carousel';

export type PreviewAtom = {
  id: string;
  name: string;
  atomType: string;
  content: string | null;
  contentVariants?: { text: string; target?: string; enabled?: boolean }[]; // 문구 베리에이션(+타겟, +노출 통제). enabled=false면 CVM 매칭 제외
  imageUrl: string | null;
  altText: string | null;
  linkUrl: string | null;
  menuRole?: string; // FIXED(고정) | EDITABLE(편집가능)
};
export type PreviewComponent = { id: string; name: string; componentType: string; atoms: PreviewAtom[]; selectedIndex?: number; chipRows?: number; chipVariant?: string; emptyImages?: boolean };
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
  bigBanner?: boolean | null; // 배치(인스턴스) 옵션 — 상단 빅배너로 강조
  cardShape?: string | null; // 상품형 2.5배열 카드 모양 (정사각형 | 직사각형)
  titleLines?: number | null; // 상품 카드 제목 줄 수 (2=두 줄)
  bannerImageUrl?: string | null;
  bannerName?: string | null;
  bannerPosition?: string | null;
  bannerOptions?: string | null; // 배너형 코너 노출 옵션 (JSON {mode,intervalSec,showIndicator,loop})
  sampleImageUrl?: string | null;
  recSource?: string | null; // (대표) 1순위 추천 수급 방식 (CVM 기반이면 후보·순위·근거 런타임 판정)
  recSourcePlan?: string | null; // 우선순위 편성(JSON 배열, 1순위→폴백)
  showRecReason?: boolean | null; // 추천 근거(추천 사유) 카드 표시 여부
  // 코너별 표시 항목(상품 카드 요소 on/off) — 끄면 미리보기에서 해당 아톰을 숨김(비파괴적). 기본 노출.
  showImage?: boolean | null;
  showPrice?: boolean | null;
  showBadge?: boolean | null;
  showDesc?: boolean | null;
  emptyImages?: boolean | null; // 신규 등록 가이드 폼 — 이미지/배너 영역을 빈 자리로만 보여줌(여기 채우세요)
};

const byType = (atoms: PreviewAtom[], ...types: string[]) => atoms.filter((a) => types.includes(a.atomType));
const first = (atoms: PreviewAtom[], ...types: string[]) => byType(atoms, ...types)[0];

/** 실제로 <img>로 그릴 수 있는 소스인지 (AI 생성 data URI / 외부 http / 로컬 public 자산) */
// 실제 존재하는 파일만 렌더: data URI · http · /assets/(corner-samples·concept 등 public 자산). 그 외는 placeholder 처리.
const isRenderableImg = (src?: string | null) => !!src && (src.startsWith('data:') || src.startsWith('http') || src.startsWith('/assets/'));

function ImageBox({ atom, className }: { atom?: PreviewAtom; className?: string }) {
  // 실제 파일이 없으면 onError로 깔끔한 영역+슬러그 라벨(PreviewImage)로 대체 — 깨진 이미지 방지
  return <PreviewImage src={atom?.imageUrl} alt={atom?.altText} className={className} />;
}

// 칩(선택형) 렌더 — DS Chip 계열 4종을 배열(chipVariant)에 따라 다르게 그린다.
//  home    : 아이콘+라벨 퀵메뉴, 최대 2행(ChipHome)
//  contents: 콘텐츠 필터 칩 — 선택 1개를 진하게 강조(ChipContents)
//  page    : 페이지 탭 칩 — 선택 언더라인 탭(ChipPage)
//  filter  : 필터 칩 — 아웃라인 + 필터 글리프(ChipFilter)
function ChipsView({ component }: { component: PreviewComponent }) {
  const sel = component.selectedIndex ?? 0;
  const variant = component.chipVariant ?? (component.atoms.some((a) => a.imageUrl) ? 'home' : 'contents');

  // ChipHome — 아이콘 뱃지(네이비 원형)+라벨 pill, 1/2행(2행 그리드+가로 스크롤)
  if (variant === 'home') {
    const twoRows = component.chipRows === 2;
    return (
      <div className={twoRows ? 'grid grid-flow-col grid-rows-2 auto-cols-max justify-items-start items-start gap-2 overflow-x-auto pb-1' : 'flex flex-nowrap items-start gap-2 overflow-x-auto pb-1'}>
        {component.atoms.map((a, i) => (
          <span key={a.id} className={'flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#EDEFF7] py-1 pl-1 pr-3.5 text-[12px] font-medium text-slate-800 shadow-sm ' + (i === sel ? 'ring-1 ring-[#3617CE]' : '')}>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[#3617CE]">
              {a.imageUrl && isRenderableImg(a.imageUrl) && !isIconRef(a.imageUrl)
                ? /* 디자인 제공 퀵칩 아이콘(#3617CE svg) — 흰 원형 뱃지 위 글리프 크기로 렌더 */
                  /* eslint-disable-next-line @next/next/no-img-element */ <img src={a.imageUrl} alt={a.altText ?? ''} className="h-3.5 w-3.5 object-contain" />
                : <IconGlyph name={a.imageUrl && isIconRef(a.imageUrl) ? a.imageUrl : 'icon:general/Category'} className="h-3.5 w-3.5" />}
            </span>
            {a.content ?? a.name}
          </span>
        ))}
      </div>
    );
  }

  // ChipPage — 페이지 탭(선택 언더라인)
  if (variant === 'page') {
    return (
      <div className="flex flex-nowrap items-center gap-4 overflow-x-auto border-b border-slate-100 pb-0">
        {component.atoms.map((a, i) => (
          <span key={a.id} className={'shrink-0 whitespace-nowrap border-b-2 pb-2 text-[13px] ' + (i === sel ? 'border-slate-900 font-semibold text-slate-900' : 'border-transparent font-medium text-slate-400')}>
            {a.content ?? a.name}
          </span>
        ))}
      </div>
    );
  }

  // ChipFilter — 아웃라인 필터 칩(필터 글리프)
  if (variant === 'filter') {
    return (
      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
        {component.atoms.map((a) => (
          <span key={a.id} className="flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-slate-300 bg-white px-3 text-[12px] font-medium text-slate-600">
            {a.content ?? a.name} <ChevronDown className="h-3 w-3 text-slate-400" />
          </span>
        ))}
      </div>
    );
  }

  // ChipContents(기본) — 선택 1개를 진하게 강조하는 콘텐츠 필터 칩. chipRows=2면 두 줄(그리드)로.
  const contentsTwoRows = component.chipRows === 2;
  return (
    <div className={contentsTwoRows ? 'grid grid-flow-col grid-rows-2 auto-cols-max justify-items-start items-center gap-2 overflow-x-auto pb-1' : 'flex flex-nowrap items-center gap-2 overflow-x-auto pb-1'}>
      {component.atoms.map((a, i) => (
        <span key={a.id} className={'flex h-8 shrink-0 items-center whitespace-nowrap rounded-full px-3.5 text-[12px] font-medium ' + (i === sel ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500')}>
          {a.content ?? a.name}
        </span>
      ))}
    </div>
  );
}

// 메뉴 리스트(업무 진입형 · 선택형 · 메뉴 리스트) — 칩이 아니라 세로 메뉴 행 + 오른쪽 화살표.
function MenuListView({ component }: { component: PreviewComponent }) {
  return (
    <div className="divide-y divide-slate-100">
      {component.atoms.map((a) => {
        const fixed = a.menuRole === 'FIXED';
        return (
          <div key={a.id} className="flex items-center gap-2 py-2.5">
            {a.imageUrl && isIconRef(a.imageUrl) && <IconGlyph name={a.imageUrl} className="h-4 w-4 shrink-0 text-slate-500" />}
            <span className="flex-1 truncate text-[14px] text-slate-800">{a.content ?? a.name}</span>
            {/* 고객 메뉴 역할: 고정=자물쇠(삭제/이동 불가), 편집가능=드래그 핸들(고객이 편집) */}
            {fixed ? (
              <Lock className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-label="고정 메뉴" />
            ) : (
              <GripVertical className="h-4 w-4 shrink-0 text-slate-300" aria-label="편집 가능(고객이 순서변경·삭제)" />
            )}
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
          </div>
        );
      })}
    </div>
  );
}

function ProductCard({ component, shape, reason, titleLines, emphasis = false, grid = false, parts }: { component: PreviewComponent; shape?: string | null; reason?: string; titleLines?: number | null; emphasis?: boolean; grid?: boolean; parts?: CardParts }) {
  // 코너별 표시 항목 — 끈 요소는 렌더하지 않는다(미지정=노출). 배지는 가격에 종속(가격 꺼지면 배지도 숨김).
  const showImg = parts?.image !== false;
  const showPrice = parts?.price !== false;
  const showBadge = parts?.badge !== false && showPrice;
  const showDesc = parts?.desc !== false;
  // 이름 기반 조회 — DS ListProductGrid 속성(브랜드·가격기준·할인율·기간·용량·서브텍스트)을 아톰 이름으로 찾는다(기존 카드와 호환).
  const byName = (...names: string[]) => component.atoms.find((a) => names.includes(a.name) && a.content);
  const poster = showImg ? first(component.atoms, 'IMAGE') : undefined;
  const brand = byName('브랜드', '서브타이틀'); // Apple
  const title = byName('상품명') ?? first(component.atoms, 'TEXT'); // iPhone 20 Pro
  const priceCaption = byName('가격 기준'); // 선택 약정 12개월 기준
  const discount = byName('할인율'); // 99%
  const priceAtom = showPrice ? first(component.atoms, 'PRICE') : null; // 99,999원
  const period = byName('기간'); // /12개월
  const subText = byName('서브텍스트'); // SubText02
  const capacity = byName('용량'); // 256GB | 512GB | 1TB
  const descAtom = showDesc ? first(component.atoms, 'INFO', 'BENEFIT_TEXT') : null; // 레거시 설명
  const hasRich = !!(brand || priceCaption || discount || period || capacity || subText);
  const badge = showBadge ? first(component.atoms, 'BADGE') : null;
  const cta = first(component.atoms, 'CTA');
  const square = shape === '1:1' || shape === '정사각형';
  const wide = shape === '4:3';
  const ratioCls = emphasis ? 'aspect-[16/10]' : grid ? (square ? 'aspect-square' : 'aspect-[4/3]') : square ? 'aspect-square' : wide ? 'aspect-[4/3]' : 'aspect-[3/4]';
  const wCls = grid ? 'w-full' : emphasis ? 'w-[224px]' : square ? 'w-[150px]' : wide ? 'w-[168px]' : 'w-[156px]';
  const nameCls = titleLines === 2 ? 'line-clamp-2' : 'truncate';
  return (
    <div className={cn('shrink-0', wCls)}>
      {showImg && <ImageBox atom={poster} className={cn('w-full rounded-xl', ratioCls)} />}
      {reason && <RecReason text={reason} />}
      {/* 브랜드(서브타이틀) */}
      {brand?.content && <p className="mt-1.5 truncate text-[11px] leading-tight text-slate-500">{brand.content}</p>}
      {/* 상품명 */}
      <p className={cn('font-semibold leading-tight text-slate-900', brand?.content ? 'mt-0' : 'mt-1.5', nameCls, emphasis ? 'text-[15px]' : 'text-[13px]')}>{title?.content ?? component.name}</p>
      {hasRich ? (
        <>
          {priceCaption?.content && <p className="mt-1 truncate text-[10px] text-slate-400">{priceCaption.content}</p>}
          {(discount?.content || priceAtom?.content) && (
            <p className="mt-0.5 flex items-baseline gap-1 whitespace-nowrap">
              {discount?.content && <span className="shrink-0 text-[12px] font-bold text-indigo-600">{discount.content}</span>}
              {priceAtom?.content && <span className="text-[13px] font-bold text-slate-900">{priceAtom.content}</span>}
              {/* 기간(/12개월)은 가격과 같은 줄이면 좁은 카드에서 깨져 내려오므로 가격 옆 작은 회색으로만, 넘치면 아래 줄 */}
              {period?.content && <span className="text-[11px] font-normal text-slate-400">{period.content}</span>}
            </p>
          )}
          {subText?.content && <p className="mt-0.5 truncate text-[11px] text-slate-500">{subText.content}</p>}
          {capacity?.content && <p className="mt-0.5 truncate text-[11px] text-slate-400">{capacity.content}</p>}
          {badge?.content && <span className="mt-1 inline-block rounded bg-rose-500 px-1 py-0.5 text-[10px] font-bold leading-none text-white">{badge.content}</span>}
        </>
      ) : (
        /* 레거시: 배지 + 설명 인라인 */
        (badge?.content || (priceAtom ?? descAtom)?.content) && (
          <p className="mt-0.5 flex items-center gap-1">
            {badge?.content && <span className="shrink-0 rounded bg-rose-500 px-1 py-0.5 text-[10px] font-bold leading-none text-white">{badge.content}</span>}
            {(priceAtom ?? descAtom)?.content && <span className="truncate text-[11px] font-normal text-slate-400">{(priceAtom ?? descAtom)!.content}</span>}
          </p>
        )
      )}
      {cta?.content && (
        <span className="mt-1.5 flex items-center justify-center rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700">{cta.content}</span>
      )}
    </div>
  );
}

// 추천 근거(추천 사유) — CVM이 런타임에 내려주는 '왜 추천했는지'. 빌더 미리보기에선 예시 문구로 표시.
function RecReason({ text }: { text: string }) {
  // '예:' 접두 — 실제 사유는 CVM이 고객별 런타임 생성, 미리보기는 예시임을 명시.
  return (
    <span className="mt-1.5 inline-flex max-w-full items-center gap-0.5 truncate rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-600" title="추천 사유는 노출 시 CVM이 고객마다 자동 생성합니다 (미리보기는 예시)">
      <Sparkles className="h-2.5 w-2.5 shrink-0" /> <span className="text-violet-400">예:</span> {text}
    </span>
  );
}

export function BannerCard({ component, sizeDetail }: { component: PreviewComponent; sizeDetail?: string | null }) {
  const title = first(component.atoms, 'TEXT', 'BENEFIT_TEXT');
  const sub = first(component.atoms, 'INFO');
  const cta = first(component.atoms, 'BUTTON', 'CTA');
  const img = first(component.atoms, 'IMAGE', 'ICON');
  const src = img?.imageUrl ?? '';
  const hasImg = isRenderableImg(src);
  // 완성형 배너 이미지(업로드 사진·banner-* 마커)는 규격 비율로 꽉 채우고,
  // 로고·상품 이미지(lotteworld·product-*·airpods 등)는 타이틀 옆에 붙이는 콤포즈형으로 렌더(로고가 홀로 떠 보이지 않게).
  //  판정 기준을 '확장자'가 아니라 '완성형 마커(data/http · /banner- 접두)'로 한정 — 로고 .png가 전체 이미지로 잘못 렌더되던 문제 수정.
  //  단, ICON 아톰(로고 글리프)은 언제나 콤포즈형.
  const isFullBanner = img?.atomType !== 'ICON' && /(^data:|^https?:|\/banner-)/i.test(src);
  // 배너 규격(layoutDetail의 W×H)으로 실제 비율을 잡는다 — 빅/스몰/띠/팝업이 눈에 보이게.
  //  규격에 W×H가 없으면(예: '배너 단일형'): 완성형 이미지는 빅배너(672×460), 콤포즈형(타이틀+로고)은 납작한 띠 비율(672×260)로 → 뚱뚱한 박스 방지.
  const m = (sizeDetail ?? '').match(/(\d+)\s*[×xX*]\s*(\d+)/);
  const ratio = m ? `${m[1]} / ${m[2]}` : (isFullBanner ? '672 / 460' : '672 / 260');
  // 콤포즈형(타이틀+로고)은 규격이 커도(빅배너 672×460 등) 세로가 길면 비어 보임(뚱뚱) → 폭 대비 최대 672:260 비율로 캡.
  const composeRatio = (() => {
    if (!m) return isFullBanner ? '672 / 460' : '672 / 260';
    const w = Number(m[1]), h = Number(m[2]);
    const capH = Math.round((w * 260) / 672);
    return `${w} / ${Math.min(h, capH)}`;
  })();
  if (ratio) {
    if (hasImg && isFullBanner) {
      return (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-white">
          <div className="flex w-full items-center justify-center bg-gradient-to-br from-[#EEF1F8] to-[#E3E9F5]" style={{ aspectRatio: ratio }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={img?.altText ?? title?.content ?? ''} className="h-full w-full object-contain" />
          </div>
        </div>
      );
    }
    // 콤포즈형: 타이틀(좌) + 로고(우) — 롯데월드 배너처럼 딱 맞게. 규격이 커도 세로는 캡(뚱뚱 방지).
    return (
      <div className="flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-[#EEF1F8] to-[#E3E9F5] px-4 shadow-sm ring-1 ring-white" style={{ aspectRatio: composeRatio }}>
        <div className="min-w-0 flex-1 py-3">
          <p className="line-clamp-2 whitespace-pre-line text-[14px] font-bold leading-snug text-slate-900">{title?.content ?? component.name}</p>
          {sub?.content && <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{sub.content}</p>}
          {cta?.content && <span className="mt-1.5 inline-flex rounded-full bg-indigo-600 px-2.5 py-0.5 text-[10px] font-semibold text-white">{cta.content}</span>}
        </div>
        {hasImg && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={img?.altText ?? ''} className="max-h-[76%] w-auto max-w-[36%] shrink-0 object-contain" />
        )}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-[#EEF1F8] to-[#E3E9F5] p-4 shadow-sm ring-1 ring-white">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="whitespace-pre-line text-[15px] font-bold leading-snug text-slate-900">{title?.content ?? component.name}</p>
        {sub && <p className="text-[12px] text-slate-500">{sub.content}</p>}
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

// 배너 캐러셀 — 한 배너형 코너에 담긴 배너 여러 장. 스와이프(수동) / 자동 슬라이드는 클라이언트 컴포넌트로 분리.
//  옵션(mode·간격·인디케이터·루프)은 Corner.bannerOptions(JSON) → parseBannerOptions.
function BannerCarouselBlock({ corner }: { corner: PreviewCorner }) {
  const list = corner.components ?? [];
  if (list.length === 0) return null;
  return (
    <BannerCarousel
      options={parseBannerOptions(corner.bannerOptions)}
      items={list.map((c) => <BannerCard key={c.id} component={c} sizeDetail={corner.layoutDetail} />)}
    />
  );
}

// 세로 리스트 행: [로고/아이콘] + [혜택문구(굵게) / 브랜드(작게)]. 상품형·세로형, 혜택형 공용.
function BenefitRow({ component, reason, parts }: { component: PreviewComponent; reason?: string; parts?: CardParts }) {
  // 코너별 표시 항목 — 이미지 로고(상품형), 가격(PRICE)/설명(INFO) 텍스트 노출 제어(미지정=노출).
  const logoRaw = first(component.atoms, 'ICON', 'IMAGE');
  const logo = parts?.image === false && logoRaw?.atomType === 'IMAGE' ? undefined : logoRaw;
  const texts = byType(component.atoms, 'BENEFIT_TEXT', 'TEXT', 'INFO', 'PRICE').filter(
    (a) => !((a.atomType === 'PRICE' && parts?.price === false) || (a.atomType === 'INFO' && parts?.desc === false)),
  );
  const title = texts[0];
  const brand = texts[1];
  const cta = first(component.atoms, 'CTA'); // 선택적 CTA (숨김=미사용이면 프리뷰 제외)
  return (
    <div className="flex items-center gap-3 py-2">
      {/* 로고 = 연회색 타일 위 object-contain — 와이드 워드마크(배달의민족 등)도 잘리지 않고 전체가 보인다. */}
      {logo && <ImageBox atom={logo} className="h-11 w-11 shrink-0 rounded-2xl bg-slate-50 object-contain p-1.5" />}
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-[14px] font-semibold text-slate-900')}>{title?.content ?? component.name}</p>
        {brand && <p className="truncate text-[12px] text-slate-400">{brand.content}</p>}
        {reason && <RecReason text={reason} />}
      </div>
      {cta?.content && (
        <span className="shrink-0 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700">{cta.content}</span>
      )}
    </div>
  );
}

// 상품형 · 세로형+배너 요금제 행 — 라벨 카드 썸네일 + [요금제명 / 월정액(굵게) / 스펙]. (참고: 약정 만료 요금제)
function PlanBannerRow({ component }: { component: PreviewComponent }) {
  const thumb = first(component.atoms, 'IMAGE');
  const badge = first(component.atoms, 'BADGE');
  const name = first(component.atoms, 'TEXT');
  const price = first(component.atoms, 'PRICE');
  const spec = first(component.atoms, 'INFO');
  const label = badge?.content ?? '';
  const isUnlimited = /무제한|무료/.test(label);
  return (
    <div className="flex items-center gap-3 py-2.5">
      {isRenderableImg(thumb?.imageUrl)
        ? <ImageBox atom={thumb} className="h-14 w-14 shrink-0 rounded-2xl" />
        : component.emptyImages
          ? <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl bg-slate-100 text-slate-400"><ImageIcon className="h-4 w-4 opacity-60" /><span className="text-[9px] font-medium">이미지</span></div>
          : <div className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl px-1 text-center text-[11px] font-bold text-white', isUnlimited ? 'bg-gradient-to-br from-[#4B63E6] to-[#3A4FCC]' : 'bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9]')}>{label || '요금제'}</div>}
      <div className="min-w-0 flex-1">
        {name?.content && <p className="truncate text-[13px] text-slate-700">{name.content}</p>}
        {price?.content && <p className="truncate text-[15px] font-bold text-slate-900">{price.content}</p>}
        {spec?.content && <p className="truncate text-[11px] text-slate-400">{spec.content}</p>}
      </div>
    </div>
  );
}

// 아이콘을 IconGlyph(icon:ref) 또는 이미지로 렌더
function AtomIcon({ atom, className }: { atom?: PreviewAtom; className?: string }) {
  if (!atom) return null;
  if (isIconRef(atom.imageUrl)) return <IconGlyph name={atom.imageUrl!} className={className} />;
  return <ImageBox atom={atom} className={`rounded-xl ${className ?? ''}`} />;
}

// 고정·필수 노출형·정보형·프로필형: [원형 사진][이름·번호] … [나의 가입 현황 CTA]. (my-profile.png 기준)
function ProfileCard({ component }: { component?: PreviewComponent }) {
  const atoms = component?.atoms ?? [];
  const avatar = first(atoms, 'ICON', 'IMAGE');
  const name = first(atoms, 'TEXT');
  const phone = first(atoms, 'INFO');
  const cta = first(atoms, 'CTA', 'BUTTON');
  // 아바타가 IMAGE면 원형을 꽉 채우는 사진(object-cover), ICON이면 글리프. (참고 이미지: 프로필 사진 + 이름·번호 + '나의 가입 현황' 필)
  const avatarIsImage = avatar?.atomType === 'IMAGE' && isRenderableImg(avatar.imageUrl);
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-400">
        {avatarIsImage
          ? <PreviewImage src={avatar!.imageUrl} alt={avatar!.altText ?? ''} className="h-full w-full object-cover" />
          : avatar ? <AtomIcon atom={avatar} className="h-6 w-6" /> : <User className="h-6 w-6" />}
      </div>
      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="shrink-0 text-[15px] font-bold text-slate-900">{resolveCvmSample(name?.content) || '고객'}님</span>
        {phone && <span className="truncate text-[13px] font-medium text-slate-400">{resolveCvmSample(phone.content)}</span>}
      </div>
      {cta && <span className="shrink-0 whitespace-nowrap rounded-full bg-slate-200/70 px-3 py-1.5 text-[12px] font-medium text-slate-600">{cta.content}</span>}
    </div>
  );
}

// 상태 안내형·정보형 카드(마이 홈 아이콘/이미지형): [값(크게)+배지 / 라벨] + 우측 아이콘(원형) 또는 이미지(사각 썸네일).
function InfoCard({ component }: { component: PreviewComponent }) {
  const iconAtom = first(component.atoms, 'ICON', 'IMAGE');
  const value = first(component.atoms, 'PRICE') ?? first(component.atoms, 'TEXT');
  const badge = first(component.atoms, 'BADGE');
  const label = byType(component.atoms, 'TEXT', 'INFO').find((a) => a !== value) ?? first(component.atoms, 'INFO');
  // 아이콘/이미지형: 아톰이 이미지면 사각 썸네일, 아이콘이면 원형 배경 — 빌더에서 아이콘/이미지 중 선택.
  const isImage = iconAtom?.atomType === 'IMAGE';
  return (
    // 상태 안내형 카드형 = 794×248 비율(2026-09-29 사용자 요청). 콘텐츠는 세로 중앙.
    <div className="flex items-center gap-3" style={{ aspectRatio: '794 / 248' }}>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-[17px] font-bold leading-tight text-slate-900">{resolveCvmSample(value?.content) || component.name}</p>
          {badge && <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600">{resolveCvmSample(badge.content)}</span>}
        </div>
        {label && <p className="truncate text-[12px] text-slate-400">{resolveCvmSample(label.content)}</p>}
      </div>
      {iconAtom && (
        isImage ? (
          // 상태 카드 아이콘 이미지(마이1~6 등)는 자체 색/모양이 있으므로 회색 박스 없이 그대로(contain).
          <div className="h-12 w-12 shrink-0">
            <PreviewImage src={iconAtom.imageUrl} alt={iconAtom.altText} className="h-full w-full object-contain" />
          </div>
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-50 text-indigo-500">
            <AtomIcon atom={iconAtom} className="h-6 w-6" />
          </div>
        )
      )}
    </div>
  );
}

// 멤버십 바코드 카드 — 회원별 런타임 발급(동적). 어드민은 라벨·유효(갱신)시간 정책만 관리.
function BarcodeCard({ component }: { component?: PreviewComponent }) {
  const atoms = component?.atoms ?? [];
  const label = first(atoms, 'TEXT');
  const number = first(atoms, 'INFO');
  const barcode = first(atoms, 'BARCODE'); // content = 유효/갱신 분(어드민 정책)
  const refreshMin = Number(barcode?.content?.trim() || '20') || 20;
  // 타이머는 어드민이 정한 유효시간(분)에서 시작하는 런타임 카운트다운 → 시작값 mm:00으로 표시
  const timerStart = `${String(refreshMin).padStart(2, '0')}:00`;
  // 번호는 CVM 바인딩이면 sample로 대체 표시(런타임엔 회원 값)
  const numberText = resolveCvmSample(number?.content);
  // 하이드레이션 안정(랜덤 X): 고정 패턴을 flex로 배분해 카드 폭을 꽉 채운다(실제 값은 런타임 발급).
  const bars = [3, 1, 2, 1, 4, 1, 2, 3, 1, 1, 2, 1, 3, 2, 1, 4, 1, 2, 1, 1, 3, 1, 2, 4, 1, 2, 1, 3, 1, 1, 2, 1, 4, 2, 1, 3, 1, 2, 1, 1, 3, 1, 2, 1, 4, 1, 2, 3];
  // 참고 이미지: [T멤버십 라벨(회색)] · [풀폭 바코드] · [번호(좌) ─ 남은시간(파랑, 우)]
  return (
    <div>
      <p className="text-[13px] font-medium text-slate-500">{label?.content ?? component?.name ?? 'T멤버십'}</p>
      <div className="mt-3 flex h-16 w-full items-stretch gap-[2px] overflow-hidden bg-white">
        {bars.map((w, i) => (
          <span key={i} style={{ flex: `${w} 0 0` }} className="bg-slate-900" />
        ))}
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        <p className="text-[13.5px] font-medium tracking-[0.12em] text-slate-500">{numberText || '1234 4561 1506 4932'}</p>
        <span className="text-[13.5px] font-semibold tabular-nums text-blue-600">{timerStart}</span>
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

// emphasis = 단일강조(1.5배열): 큰 카드 1.5장(하나 강조). horizontal(2.5배열)보다 카드가 크다.
type LayoutMode = 'horizontal' | 'emphasis' | 'grid' | 'single' | 'list';
// 코너별 표시 항목(상품 카드 요소 on/off) — 미지정(undefined)은 노출로 본다.
type CardParts = { image?: boolean; price?: boolean; badge?: boolean; desc?: boolean };

function ComponentView({ component, mode, cardShape, reason, titleLines, parts }: { component: PreviewComponent; mode?: LayoutMode; cardShape?: string | null; reason?: string; titleLines?: number | null; parts?: CardParts }) {
  switch (component.componentType) {
    case '선택형':
      return <ChipsView component={component} />;
    case '상품형':
      // 세로 리스트형 코너에서는 큰 포스터 카드가 아니라 로고+문구 행 구조로 렌더 (참고 디자인)
      //  세로형+배너 요금제 행(PRICE 아톰 있음) = 라벨 카드 + 이름/월정액/스펙(PlanBannerRow), 그 외 리스트 = BenefitRow.
      if (mode === 'list') {
        return component.atoms.some((a) => a.atomType === 'PRICE')
          ? <PlanBannerRow component={component} />
          : <BenefitRow component={component} reason={reason} parts={parts} />;
      }
      return <ProductCard component={component} shape={cardShape} reason={reason} titleLines={titleLines} emphasis={mode === 'emphasis'} grid={mode === 'grid'} parts={parts} />;
    case '배너형':
      return <BannerCard component={component} />;
    case '혜택형':
      return <BenefitRow component={component} reason={reason} />;
    case '정보형':
      return <InfoCard component={component} />;
    default:
      return <DefaultCard component={component} />;
  }
}

/** 한 Corner를 화면 영역으로 렌더 (프리뷰/빌더 공용) */
export function CornerBlock({ corner }: { corner: PreviewCorner }) {
  const isBanner = corner.cornerType === '배너형';
  // 배너형은 코너 타이틀/서브타이틀을 두지 않는다(배너 자체가 콘텐츠). 헤딩 숨김. (2026-09-28 사용자 결정)
  const heading = isBanner ? null : (corner.mainTitle ?? corner.title);
  const sub = isBanner ? null : (corner.subTitle ?? corner.name);
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
        if (d.includes('단일강조') || d.includes('1.5')) return 'emphasis'; // 단일강조(1.5배열) = 큰 카드 강조
        if (d.includes('그리드')) return 'grid';
        if (d.includes('상품카드') || d.includes('가로') || d.includes('2.5') || d.includes('SWIPE')) return 'horizontal';
        if (d.includes('세로') || d.includes('리스트')) return 'list';
        if (corner.cornerType === '상품형') return 'horizontal';
        if (isBanner) return 'single';
        return 'list';
      }
    }
  })();

  // 추천 수급 방식의 1순위(코너 상단 리본 표기용).
  const recPrimary = ((): string | null => {
    try { const a = JSON.parse(corner.recSourcePlan ?? ''); if (Array.isArray(a) && a[0]) return a[0]; } catch { /* noop */ }
    return corner.recSource ?? null;
  })();
  // ★ 빌더 미리보기 = '폴백(운영자 편성)' 상태 — 실제 고객이 없어 CVM/채널데이터가 계산할 수 없으므로,
  //   카드별 개인화 추천 근거(예: '최근 본 상품과 연관')는 표시하지 않는다. (근거는 런타임에 CVM이 고객별로 생성)
  const reasonFor = (_i: number): string | undefined => undefined;

  // 코너별 표시 항목(상품 카드 요소 on/off) — 끈 요소는 미리보기에서 렌더하지 않는다(비파괴적, 상품형 카드 한정).
  //  이미지=IMAGE, 가격=PRICE, 배지=BADGE(가격 앞), 설명=INFO(정보값). 기본 노출(undefined=true).
  const parts: CardParts = {
    image: corner.showImage !== false,
    price: corner.showPrice !== false,
    badge: corner.showBadge !== false,
    desc: corner.showDesc !== false,
  };

  // 배치 모드에 맞춰 컴포넌트 묶음을 렌더
  const renderComps = (comps: PreviewComponent[], mode: LayoutMode) => {
    if (mode === 'horizontal' || mode === 'emphasis') // 둘 다 가로 스크롤. emphasis는 카드가 커서 ~1.5장 노출.
      return (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {comps.map((c, i) => (
            <ComponentView key={c.id} component={c} mode={mode} cardShape={corner.cardShape} titleLines={corner.titleLines} reason={reasonFor(i)} parts={parts} />
          ))}
        </div>
      );
    if (mode === 'grid')
      // 그리드형은 최대 4개(2×2)까지만 노출해 미리보기에서 잘리지 않고 다 보이게 한다.
      return (
        <div className="grid grid-cols-2 gap-2">
          {comps.slice(0, 4).map((c, i) => (
            <ComponentView key={c.id} component={c} mode={mode} cardShape={corner.cardShape} titleLines={corner.titleLines} reason={reasonFor(i)} parts={parts} />
          ))}
        </div>
      );
    if (mode === 'single')
      return (
        <div className="space-y-2 [&>*]:w-full">
          {comps.map((c, i) => (
            <ComponentView key={c.id} component={c} mode={mode} cardShape={corner.cardShape} titleLines={corner.titleLines} reason={reasonFor(i)} parts={parts} />
          ))}
        </div>
      );
    return (
      <div className="divide-y divide-slate-100">
        {comps.map((c, i) => (
          <ComponentView key={c.id} component={c} mode={mode} reason={reasonFor(i)} parts={parts} />
        ))}
      </div>
    );
  };

  // 선택형(카테고리 탭/칩)은 항상 상단 전체폭, 나머지 본문은 코너 레이아웃대로 배치.
  // (예: 상품형·세로형(카테고리탭) = 상단 카테고리 탭 + 아래 세로 리스트)
  const chipComps = corner.components.filter((c) => c.componentType === '선택형');
  const bodyComps = corner.components.filter((c) => c.componentType !== '선택형');
  // 바코드 코너(고정·필수 노출형 · 바코드)는 상태카드가 아니라 멤버십 바코드 카드로 렌더
  const isBarcode = /바코드/.test(corner.layoutDetail ?? '');
  // 메뉴 리스트(업무 진입형 · 선택형 · 메뉴 리스트)는 칩이 아니라 세로 메뉴 리스트로 렌더 — 코너 유형 관리 와이어프레임과 일치
  const isMenuList = /메뉴/.test(corner.layoutDetail ?? '');
  const menuComp = corner.components.find((c) => c.componentType === '선택형') ?? corner.components[0];
  // 프로필형(고정·필수 노출형 · 정보형 · 프로필형)은 상태카드가 아니라 프로필 행([사진][이름·번호]…[CTA])으로 렌더
  const isProfile = /프로필/.test(corner.layoutDetail ?? '');
  // '칩' 배열(예: 세로형+칩) → 카테고리 칩 탭을 본문 상단에 붙여 렌더(코너와 한 덩어리)
  const hasChipTab = /칩/.test(corner.layoutDetail ?? '') && !isBanner && chipComps.length === 0;
  const chipTabEl = hasChipTab ? (
    <div className="flex flex-wrap gap-1.5">
      {['카페', '베이커리', '외식', '쇼핑', '문화생활'].map((c, i) => (
        <span key={c} className={cn('rounded-full px-2.5 py-1 text-[11px] font-medium', i === 0 ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500')}>{c}</span>
      ))}
    </div>
  ) : null;

  const body =
    corner.components.length === 0 ? (
      // 컴포넌트가 아직 없으면: 코너 유형 관리에서 상속한 유형 샘플 썸네일을 보여준다(불러온 유형 확인용).
      corner.sampleImageUrl && isRenderableImg(corner.sampleImageUrl.split('\n')[0]) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={corner.sampleImageUrl.split('\n')[0]}
          alt={corner.name}
          className="w-full overflow-hidden rounded-xl border border-slate-200 object-cover [filter:contrast(1.05)_saturate(1.1)]"
        />
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 p-3 text-center text-[11px] text-slate-400">
          {corner.name} — Component를 추가하세요
        </div>
      )
    ) : isBarcode ? (
      <BarcodeCard component={corner.components[0]} />
    ) : isProfile ? (
      <ProfileCard component={corner.components[0]} />
    ) : isMenuList ? (
      <MenuListView component={menuComp} />
    ) : isBanner ? (
      <BannerCarouselBlock corner={corner} />
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

  // 퀵메뉴(아이콘 칩) 전용 코너는 칩이 라벤더 배경 위에 흰 칩으로 떠 보이게(레퍼런스 퀵칩) — 흰 카드 대신 라벤더 배경.
  const isChipHomeOnly = !isBanner && corner.components.length > 0 && corner.components.every((c) => c.componentType === '선택형' && (c.chipVariant === 'home' || c.atoms.some((a) => a.imageUrl)));
  const wrapClass = isBanner ? '' : (isChipHomeOnly ? 'rounded-2xl bg-[#E7E9F5] p-3' : 'rounded-2xl bg-white p-3 shadow-sm');

  // 코너 부속 배너 — DS 포털처럼 항상 코너 상단에 고정(상/하단 선택 없음).
  // 빅배너 = 배치 옵션. 첨부 배너 이미지가 있으면 그걸, 없으면 코너 첫 이미지 Atom을 상단 히어로로 승격.
  const firstImg = corner.components.flatMap((c) => c.atoms).find((a) => a.atomType === 'IMAGE' && isRenderableImg(a.imageUrl))?.imageUrl ?? null;
  // 상단 히어로 배너는 '빅배너로 강조'(배치 옵션) 전용 — 상품형·혜택·오퍼형·콘텐츠 안내형에서 bigBanner일 때만.
  //  · 배너형 코너는 히어로로 승격하지 않는다. 배너 자체가 본문(BannerCard 컴포넌트)으로 렌더된다.
  //  · 빅배너를 끄면 첨부 배너 이미지가 있어도 상단 배너를 표시하지 않는다(빅배너 토글이 유일한 스위치).
  const bannerSrc = corner.bigBanner && !isBanner ? (corner.bannerImageUrl ?? firstImg) : null;
  // 빅배너 히어로 — 이미지의 '자연 비율' 그대로 full-bleed(고정 aspect 강제 금지).
  //  배너 소재마다 비율이 달라(예: 2.05:1 카운트다운·500GB, 1.6:1 요금제 히어로) 16/10로 강제하면
  //  좌우가 잘리고 위/아래 빈 여백이 생겨서, w-full·높이 auto로 이미지를 있는 그대로 보여준다.
  const bannerEl = bannerSrc ? (
    isRenderableImg(bannerSrc) ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={bannerSrc}
        alt={corner.bannerName ?? ''}
        className="block w-full bg-gradient-to-b from-sky-50 to-white"
      />
    ) : (
      <div className="flex aspect-[16/10] w-full items-center justify-center bg-gradient-to-br from-indigo-200 to-slate-300 text-[12px] font-medium text-slate-600">
        {corner.bannerName ?? bannerSrc.split('/').pop()}
      </div>
    )
  ) : corner.bigBanner && !isBanner ? (
    corner.emptyImages ? (
      // 신규 등록 가이드 — 상단 배너를 빈 영역으로(여기 이미지 등록)
      <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-1 bg-slate-100 text-slate-400">
        <ImageIcon className="h-5 w-5 opacity-60" />
        <span className="text-[11px] font-medium">배너 이미지</span>
      </div>
    ) : (
      <div className="flex aspect-[16/10] w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-500 px-4 text-center text-[16px] font-bold leading-snug text-white">
        {corner.mainTitle || corner.name}
      </div>
    )
  ) : null;

  // 히어로가 있으면 카드는 패딩 없이(overflow-hidden) 배너를 꼭대기 full-bleed로, 본문만 패딩.
  if (bannerEl && !isBanner) {
    return (
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {bannerEl}
        <div className="space-y-2 p-3 pt-2.5">
          {heading && (
            <div>
              <h3 className="whitespace-pre-line text-[16px] font-bold leading-snug text-slate-900">{heading}</h3>
              {sub && <p className="mt-0.5 flex items-center gap-0.5 text-[12px] text-slate-400">{sub} {showChevron && <ChevronRight className="h-3 w-3" />}</p>}
            </div>
          )}
          {chipTabEl}
          {body}
          {corner.moreButtonUse && (
            <div className="pt-1 text-center">
              <span className="inline-flex items-center gap-0.5 rounded-full border border-slate-300 bg-white px-4 py-1.5 text-[12px] font-medium text-slate-600">{corner.moreButtonLabel || '더보기'} <ChevronRight className="h-3 w-3" /></span>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className={`space-y-2 ${wrapClass}`}>
      {bannerEl}
      {(() => {
        // 추천 수급 방식 배지 — 1순위 + 폴백 체인 표시 (예: CVM 개인화 추천 · 없으면 → 운영자 편성)
        let plan: string[] = [];
        try { const a = JSON.parse(corner.recSourcePlan ?? ''); if (Array.isArray(a)) plan = a.filter((x) => typeof x === 'string'); } catch { /* noop */ }
        if (!plan.length && corner.recSource) plan = [corner.recSource];
        if (!plan.length) return null;
        const primary = plan[0];
        const fallbacks = plan.slice(1);
        const isCvm = primary === 'CVM 기반';
        const personalized = isCvm; // 개인화 방식(CVM)이면 실제 노출이 미리보기(폴백)와 달라짐
        return (
          <div
            className="flex items-center gap-1 rounded-lg bg-violet-50 px-2.5 py-1 text-[10px] font-semibold leading-tight text-violet-600"
            title={personalized
              ? `CVM이 고객마다 후보·순위를 생성해 노출. 미리보기는 폴백(운영자 편성) 상태 — 실제는 고객마다 다르게 노출됩니다.${fallbacks.length ? ` 없으면 → ${fallbacks.join(' → ')}.` : ''}`
              : `${primary} 기반 노출.${fallbacks.length ? ` 없으면 → ${fallbacks.join(' → ')}.` : ''}`}
          >
            <Sparkles className="h-3 w-3 shrink-0" />
            <span className="truncate">{isCvm ? 'CVM 개인화 · 미리보기는 폴백' : `${primary} 기반`}</span>
          </div>
        );
      })()}
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
      {chipTabEl}
      {body}
      {corner.moreButtonUse && (
        <div className="pt-1 text-center">
          <span className="inline-flex items-center gap-0.5 rounded-full border border-slate-300 bg-white px-4 py-1.5 text-[12px] font-medium text-slate-600">
            {corner.moreButtonLabel || '더보기'} <ChevronRight className="h-3 w-3" />
          </span>
        </div>
      )}
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
        <div style={{ height: bodyHeight }} className="space-y-3 overflow-y-auto bg-slate-200 p-3">
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
