import { Signal, Wifi, BatteryFull, ChevronRight, Percent, ShoppingBag, User, Lock, GripVertical, Sparkles } from 'lucide-react';
import { IconGlyph, isIconRef } from '@/lib/icon-library';
import { resolveCvmSample, cvmBindingLabel } from '@/lib/display-taxonomy';
import { PreviewImage } from './preview-image';
import { cn } from '@/lib/utils';

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
  bigBanner?: boolean | null; // 배치(인스턴스) 옵션 — 상단 빅배너로 강조
  cardShape?: string | null; // 상품형 2.5배열 카드 모양 (정사각형 | 직사각형)
  titleLines?: number | null; // 상품 카드 제목 줄 수 (2=두 줄)
  bannerImageUrl?: string | null;
  bannerName?: string | null;
  bannerPosition?: string | null;
  sampleImageUrl?: string | null;
  recSource?: string | null; // (대표) 1순위 추천 수급 방식 (CVM 기반이면 후보·순위·근거 런타임 판정)
  recSourcePlan?: string | null; // 우선순위 편성(JSON 배열, 1순위→폴백)
  showRecReason?: boolean | null; // 추천 근거(추천 사유) 카드 표시 여부
  // 코너별 표시 항목(상품 카드 요소 on/off) — 끄면 미리보기에서 해당 아톰을 숨김(비파괴적). 기본 노출.
  showImage?: boolean | null;
  showPrice?: boolean | null;
  showBadge?: boolean | null;
  showDesc?: boolean | null;
};

const byType = (atoms: PreviewAtom[], ...types: string[]) => atoms.filter((a) => types.includes(a.atomType));
const first = (atoms: PreviewAtom[], ...types: string[]) => byType(atoms, ...types)[0];

/** 실제로 <img>로 그릴 수 있는 소스인지 (AI 생성 data URI / 외부 http) */
// 실제 존재하는 파일만 렌더: data URI · http · /assets/corner-samples(유형 샘플). 그 외 /assets 자리표시자는 placeholder 처리.
const isRenderableImg = (src?: string | null) => !!src && (src.startsWith('data:') || src.startsWith('http') || src.startsWith('/assets/corner-samples/'));

function ImageBox({ atom, className }: { atom?: PreviewAtom; className?: string }) {
  // 실제 파일이 없으면 onError로 깔끔한 영역+슬러그 라벨(PreviewImage)로 대체 — 깨진 이미지 방지
  return <PreviewImage src={atom?.imageUrl} alt={atom?.altText} className={className} />;
}

function ChipsView({ component }: { component: PreviewComponent }) {
  const sel = component.selectedIndex ?? 0;
  const twoRows = component.chipRows === 2;
  // 퀵메뉴(선택형 칩)는 무조건 1줄 또는 2줄까지만. 2줄 모드는 3줄+로 넘치지 않게 '2행 그리드 + 가로 스크롤'로 고정.
  return (
    <div
      className={
        twoRows
          ? 'grid grid-flow-col grid-rows-2 auto-cols-max items-start gap-1.5 overflow-x-auto pb-1'
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

function ProductCard({ component, shape, reason, titleLines, emphasis = false, parts }: { component: PreviewComponent; shape?: string | null; reason?: string; titleLines?: number | null; emphasis?: boolean; parts?: CardParts }) {
  // 코너별 표시 항목 — 끈 요소는 렌더하지 않는다(미지정=노출). 배지는 가격에 종속(가격 꺼지면 배지도 숨김).
  const showImg = parts?.image !== false;
  const showPrice = parts?.price !== false;
  const showBadge = parts?.badge !== false && showPrice;
  const showDesc = parts?.desc !== false;
  const poster = showImg ? first(component.atoms, 'IMAGE') : undefined;
  const title = first(component.atoms, 'TEXT');
  // 가격 = PRICE, 설명 = INFO(정보값). 각각 표시 항목 토글로 노출 제어.
  const priceAtom = showPrice ? first(component.atoms, 'PRICE') : null;
  const descAtom = showDesc ? first(component.atoms, 'INFO') : null;
  const info = priceAtom ?? descAtom; // 가격 우선, 없으면 설명
  const badge = showBadge ? first(component.atoms, 'BADGE') : null;
  const cta = first(component.atoms, 'CTA'); // 선택적 CTA — 숨김(미사용) 원자면 프리뷰에서 제외됨
  // 카드 비율: 1:1(정사각·상품) | 3:4(세로·포스터) | 4:3(가로·와이드). 기본 3:4. (레거시 정사각형=1:1)
  const square = shape === '1:1' || shape === '정사각형';
  const wide = shape === '4:3';
  // 단일강조(1.5배열)는 카드를 크게(≈1.5장 노출), 가로 와이드 비율로 하나를 강조. 2.5배열(기본)은 작은 카드 캐러셀.
  const ratioCls = emphasis ? 'aspect-[16/10]' : square ? 'aspect-square' : wide ? 'aspect-[4/3]' : 'aspect-[3/4]';
  const wCls = emphasis ? 'w-[224px]' : square ? 'w-[136px]' : wide ? 'w-[152px]' : 'w-[128px]';
  // 상품명 줄 수 옵션: 2면 두 줄까지(line-clamp-2), 기본은 한 줄 말줄임(truncate)
  const nameCls = titleLines === 2 ? 'line-clamp-2' : 'truncate';
  return (
    <div className={cn('shrink-0', wCls)}>
      {showImg && <ImageBox atom={poster} className={cn('w-full rounded-xl', ratioCls)} />}
      {reason && <RecReason text={reason} />}
      <p className={cn('mt-1.5 font-semibold leading-tight text-slate-900', nameCls, emphasis ? 'text-[15px]' : 'text-[13px]')}>{title?.content ?? component.name}</p>
      {/* 배지는 설명 앞 인라인. 설명은 이름보다 연하게(위계) — 예: [20%] 235,000원 */}
      {(badge?.content || info?.content) && (
        <p className="mt-0.5 flex items-center gap-1">
          {badge?.content && <span className="shrink-0 rounded bg-rose-500 px-1 py-0.5 text-[10px] font-bold leading-none text-white">{badge.content}</span>}
          {info?.content && <span className="truncate text-[11px] font-normal text-slate-400">{info.content}</span>}
        </p>
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
      {logo && <ImageBox atom={logo} className="h-11 w-11 shrink-0 rounded-2xl" />}
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
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-400">
        {avatar ? <AtomIcon atom={avatar} className="h-6 w-6" /> : <User className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] text-slate-900">
          <span className="font-semibold">{resolveCvmSample(name?.content) || '고객'}님</span>
          {phone && <span className="ml-1.5 text-[12px] text-slate-400">{resolveCvmSample(phone.content)}</span>}
        </p>
      </div>
      {cta && <span className="shrink-0 whitespace-nowrap rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-medium text-slate-600">{cta.content}</span>}
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
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-[17px] font-bold leading-tight text-slate-900">{resolveCvmSample(value?.content) || component.name}</p>
          {badge && <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600">{resolveCvmSample(badge.content)}</span>}
        </div>
        {label && <p className="truncate text-[12px] text-slate-400">{resolveCvmSample(label.content)}</p>}
      </div>
      {iconAtom && (
        isImage ? (
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-50">
            <PreviewImage src={iconAtom.imageUrl} alt={iconAtom.altText} className="h-full w-full object-cover" />
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
  // 하이드레이션 안정(랜덤 X): 고정 폭 패턴으로 바코드 막대를 그린다(실제 값은 런타임 발급).
  const bars = [3, 1, 2, 1, 4, 1, 2, 3, 1, 1, 2, 1, 3, 2, 1, 4, 1, 2, 1, 1, 3, 1, 2, 4, 1, 2, 1, 3, 1, 1, 2, 1, 4, 2, 1, 3, 1, 2, 1, 1, 3, 1, 2, 1, 4, 1, 2, 3];
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-bold text-slate-900">{label?.content ?? component?.name ?? '멤버십'}</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-500">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> {timerStart}
        </span>
      </div>
      <div className="mt-3 flex h-14 items-stretch justify-center gap-[2px] overflow-hidden rounded-md bg-white px-1">
        {bars.map((w, i) => (
          <span key={i} style={{ width: `${w}px` }} className="shrink-0 bg-slate-900" />
        ))}
      </div>
      {numberText && <p className="mt-2 text-center text-[13px] font-medium tracking-[0.25em] text-slate-500">{numberText}</p>}
      <p className="mt-1.5 text-center text-[10px] text-slate-400">회원별 발급 · {refreshMin}분 유효(자동 갱신) · 번호는 고객정보 연동</p>
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
      return mode === 'list' ? <BenefitRow component={component} reason={reason} parts={parts} /> : <ProductCard component={component} shape={cardShape} reason={reason} titleLines={titleLines} emphasis={mode === 'emphasis'} parts={parts} />;
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
      return (
        <div className="grid grid-cols-2 gap-2">
          {comps.map((c, i) => (
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
  const isMenuList = /메뉴\s*리스트/.test(corner.layoutDetail ?? '');
  const menuComp = corner.components.find((c) => c.componentType === '선택형') ?? corner.components[0];
  // 프로필형(고정·필수 노출형 · 정보형 · 프로필형)은 상태카드가 아니라 프로필 행([사진][이름·번호]…[CTA])으로 렌더
  const isProfile = /프로필/.test(corner.layoutDetail ?? '');

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

  // 코너 부속 배너. 배너형 코너는 배너가 곧 본문이라 항상 상단. 그 외(상품형 등 '빅배너')는
  // 빌더에서 정한 bannerPosition(상단/하단)에 따라 카드 위/아래로 렌더(기본 상단).
  const bannerAtTop = isBanner || corner.bannerPosition !== '하단';
  // 빅배너 = 배치 옵션. 첨부 배너 이미지가 있으면 그걸, 없으면 코너 첫 이미지 Atom을 상단 히어로로 승격.
  const firstImg = corner.components.flatMap((c) => c.atoms).find((a) => a.atomType === 'IMAGE' && isRenderableImg(a.imageUrl))?.imageUrl ?? null;
  // 상단 히어로 배너는 '빅배너로 강조'(배치 옵션) 전용 — 상품형·혜택·오퍼형·콘텐츠 안내형에서 bigBanner일 때만.
  //  · 배너형 코너는 히어로로 승격하지 않는다. 배너 자체가 본문(BannerCard 컴포넌트)으로 렌더된다.
  //  · 빅배너를 끄면 첨부 배너 이미지가 있어도 상단 배너를 표시하지 않는다(빅배너 토글이 유일한 스위치).
  const bannerSrc = corner.bigBanner && !isBanner ? (corner.bannerImageUrl ?? firstImg) : null;
  const bannerEl = bannerSrc ? (
    isRenderableImg(bannerSrc) ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={bannerSrc}
        alt={corner.bannerName ?? ''}
        className="aspect-[16/7] w-full overflow-hidden rounded-2xl object-cover"
      />
    ) : (
      <div className="flex aspect-[16/7] w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-200 to-slate-300 text-[10px] font-medium text-slate-600">
        {corner.bannerName ?? bannerSrc.split('/').pop()}
      </div>
    )
  ) : corner.bigBanner && !isBanner ? (
    // 승격할 이미지가 없으면 타이틀을 얹은 그라디언트 히어로로 빅배너 표현
    <div className="flex aspect-[16/7] w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 px-4 text-center text-[15px] font-bold leading-snug text-white">
      {corner.mainTitle || corner.name}
    </div>
  ) : null;

  return (
    <section className={`space-y-2 ${wrapClass}`}>
      {bannerAtTop && bannerEl}
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
      {body}
      {corner.moreButtonUse && (
        <div className="pt-1 text-center">
          <span className="inline-flex items-center gap-0.5 rounded-full border border-slate-300 bg-white px-4 py-1.5 text-[12px] font-medium text-slate-600">
            {corner.moreButtonLabel || '더보기'} <ChevronRight className="h-3 w-3" />
          </span>
        </div>
      )}
      {!bannerAtTop && bannerEl}
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
