'use client';
// 혜택형 코너 미리보기 — SB Figma 프리뷰(/assets/sb-preview/*.png) 디자인을 '코드'로 재현한 반응형 카드.
//  정적 이미지 대신 이걸 쓰면 빌더 우측 ③ 코너 콘텐츠 설정 입력(코너 타이틀·상단 이미지·탭·CTA·추가 인포메이션 등)이
//  좌측 미리보기에 즉시 반영된다(2026-11-25 사용자 요청: 전부 코드로, 등록된 SB 이미지 디자인 기반).
//  디자인군(designKey): list(리스트) · carousel(캐러셀) · attendance(출석체크) · roulette(룰렛) · barcode(바코드).
import { ChevronRight, Info, MapPin, Sparkles, Check } from 'lucide-react';
import type { PreviewCorner, PreviewComponent, PreviewAtom } from './blocks';

export type BenefitDesign = 'list' | 'carousel' | 'attendance' | 'roulette' | 'barcode';

/** SB 프리뷰 이미지 경로 → 디자인군. (파일명 기준: program-carousel / attendance / roulette / program-barcode / 그 외=list) */
export function benefitDesignKey(sbImage?: string | null): BenefitDesign | null {
  if (!sbImage) return null;
  const f = sbImage.toLowerCase();
  if (f.includes('carousel')) return 'carousel';
  if (f.includes('attendance')) return 'attendance';
  if (f.includes('roulette')) return 'roulette';
  if (f.includes('barcode')) return 'barcode';
  if (f.includes('affiliate') || f.includes('event') || f.includes('mission') || f.includes('program') || f.includes('support')) return 'list';
  return null;
}

const PH = /^(CornerTitle|SubTitle|ButtonText|Title|Chip\d*|Label|전체|카테고리|메뉴\d*|제휴사|혜택|미션)/i;
const clean = (s?: string | null) => (s && !PH.test(s.trim()) ? s.trim() : '');

const txtAtoms = (atoms: PreviewAtom[]) => atoms.filter((a) => a.atomType === 'TEXT' || a.atomType === 'INFO');
const imgOf = (atoms: PreviewAtom[]) => atoms.find((a) => a.imageUrl)?.imageUrl ?? null;

type Item = { title: string; sub: string; image: string | null };
function itemsOf(components: PreviewComponent[] | undefined, fallbackTitle: string, fallbackSub: string, n: number): Item[] {
  const comps = (components ?? []).filter((c) => c.componentType !== '선택형');
  const out: Item[] = [];
  for (const c of comps) {
    const ts = txtAtoms(c.atoms);
    const title = clean(ts[0]?.content) || clean(c.name) || fallbackTitle;
    const sub = clean(ts[1]?.content) || fallbackSub;
    out.push({ title, sub, image: imgOf(c.atoms) });
  }
  while (out.length < n) out.push({ title: fallbackTitle, sub: fallbackSub, image: null });
  return out.slice(0, Math.max(n, out.length === 0 ? n : out.length));
}

function chipsOf(components: PreviewComponent[] | undefined): string[] {
  const chip = (components ?? []).find((c) => c.componentType === '선택형');
  const got = (chip?.atoms ?? []).map((a) => clean(a.content) || clean(a.name)).filter(Boolean);
  return got.length ? got : ['{Label}', '{Label}', '{Label}', '{Label}', '{Label}'];
}

// SB Figma 토큰 실값(node 28951:60475, get_variable_defs) — Pretendard Variable 기준.
const CARD = 'overflow-hidden rounded-[28px] bg-white shadow-[0_10px_30px_-16px_rgba(6,12,31,0.25)] font-[\'Pretendard_Variable\',_Pretendard,_sans-serif]';
const INK = 'text-[#060c1f]', SUB = 'text-[#6c7691]'; // fg/neutral-solid · fg/neutral-subtle

/* 상단 이미지(상단 이미지형/배너 On) — 보라 그라데이션 placeholder 또는 실제 이미지 */
function TopImage({ src }: { src: string | null }) {
  return src && /^(https?:|data:|\/assets\/)/.test(src)
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={src} alt="상단 이미지" className="block aspect-[8/5] w-full object-cover" />
    : <div className="aspect-[8/5] w-full bg-gradient-to-b from-[#cdccec] via-[#e3e2f4] to-[#f5f4fb]" />;
}

/* 추천 맥락 헤더 — ✦(검색)/📍(거리) + 문구. 아이콘=brand #3a38ec, 문구=neutral-subtle */
function ContextHeader({ text, pin }: { text: string; pin?: boolean }) {
  return (
    <div className="flex items-center gap-1 text-[12px] font-medium leading-[18px] tracking-[-0.4px] text-[#6c7691]">
      {pin ? <MapPin className="h-4 w-4 shrink-0 fill-[#3a38ec] text-white" /> : <Sparkles className="h-4 w-4 shrink-0 fill-[#3a38ec] text-[#3a38ec]" />}
      <span className="truncate">{text || '{추천 맥락 헤더(검색)}'}</span>
    </div>
  );
}

// Title/18 semibold (18/600/24/-0.5)
function Title({ text, ph }: { text: string; ph: string }) {
  const t = clean(text) || ph;
  return <h3 className="whitespace-pre-line text-[17px] font-semibold leading-[23px] tracking-[-0.5px] text-[#060c1f]">{t}</h3>;
}

function SubCta({ text }: { text: string }) {
  return <p className="flex items-center gap-0.5 text-[12px] font-medium leading-[18px] tracking-[-0.4px] text-[#6c7691]">{clean(text) || '{Label}'} <ChevronRight className="h-3.5 w-3.5" /></p>;
}

// Chip — padding x12/y8, radius-999, Caption/13 semibold. 활성=border/neutral-solid, 비활성=border/neutral-subtle
function Chips({ labels }: { labels: string[] }) {
  return (
    <div className="-mx-1 flex gap-1.5 overflow-hidden px-1">
      {labels.slice(0, 5).map((c, i) => (
        <span key={i} className={`shrink-0 rounded-full border px-2.5 py-1.5 text-[12px] font-semibold leading-none tracking-[-0.4px] ${i === 0 ? 'border-[#060c1f] text-[#060c1f]' : 'border-[#00268c14] text-[#6c7691]'}`}>{c}</span>
      ))}
    </div>
  );
}

// 추가 인포메이션 — fg/brand-contrast #4b59ff
function InfoRow({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[12px] font-medium leading-[18px] tracking-[-0.4px] text-[#4b59ff]">
      <Info className="h-4 w-4 shrink-0 fill-[#4b59ff] text-white" />
      <span className="truncate">{text || '{Information 성격 디스크립션}'}</span>
    </div>
  );
}

// 액션 버튼 — radius-12, border/neutral-mute, Body/16 semibold
function ActionButton({ label }: { label: string }) {
  return (
    <div className="flex h-[32px] w-full items-center justify-center rounded-[10px] border border-[#0b2c802e] px-4 text-center text-[13px] font-semibold tracking-[-0.4px] text-[#060c1f]">
      {clean(label) || '{Label}'}
    </div>
  );
}

/** 혜택형 코드 미리보기 — designKey에 맞춰 SB 디자인 재현. corner 필드로 반응형. itemButton=리스트 아이템 우측 {Label} pill(미션형 리스트). */
// 중분류(mid) → 타이틀/아이템 플레이스홀더 워딩. list·carousel 등 한 디자인을 여러 중분류가 공유하므로,
//  하드코딩('제휴사')이 아니라 실제 중분류로 치환해야 한다(2026-11-25 버그픽스: 이벤트형인데 제휴사로 보임).
const MID_TITLE_WORD: Record<string, string> = { 제휴사형: '제휴사', 이벤트형: '이벤트', 미션형: '미션', 혜택프로그램형: '혜택 프로그램', 이용지원형: '이용 지원', 바코드형: '바코드', 종합형: '제휴사', 무료상품형: '상품' };
const MID_ITEM_WORD: Record<string, string> = { 제휴사형: '제휴사', 이벤트형: '이벤트', 미션형: '미션', 혜택프로그램형: '혜택 프로그램', 이용지원형: '이용 지원', 바코드형: '제휴사', 종합형: '혜택 프로그램', 무료상품형: '상품명' };

export function BenefitPreviewCard({ corner, design, squareThumb, itemButton, mid }: { corner: PreviewCorner; design: BenefitDesign; squareThumb?: boolean; itemButton?: boolean; mid?: string }) {
  // 중분류 워딩(있으면 공유 디자인의 하드코딩 플레이스홀더를 덮어씀).
  const tw = mid ? (MID_TITLE_WORD[mid] ?? mid.replace('형', '')) : null;
  const iw = mid ? (MID_ITEM_WORD[mid] ?? tw ?? '') : null;
  const titlePh = tw ? `{${tw} 타이틀}` : null;
  // 혜택프로그램형 아이템은 개별 혜택이라 '{혜택명}'으로 표기(2026-11-26 사용자 요청).
  const itemPh = mid === '혜택프로그램형' ? '{혜택명}' : (iw ? `{${iw} 내용}` : null);
  const showImage = !!corner.bigBanner;
  const showContext = !!corner.contextHeader;
  const showSubCta = corner.subTitle != null && corner.subTitle !== '' && corner.subTitle !== 'ButtonText';
  const showChips = (corner.components ?? []).some((c) => c.componentType === '선택형');
  const showInfo = !!corner.information;
  const showBtn = !!corner.moreButtonUse;
  const ctxText = corner.contextHeaderText ?? '';
  const infoText = corner.informationText ?? '';
  const title = corner.mainTitle ?? corner.title ?? '';
  const sub = corner.subTitle ?? '';
  const btn = corner.moreButtonLabel ?? '';

  // 공통 헤더(이미지·맥락·타이틀·서브CTA)
  const Header = ({ ph, pin, context }: { ph: string; pin?: boolean; context: boolean }) => (
    <>
      {context && showContext && <ContextHeader text={ctxText} pin={pin} />}
      <Title text={title} ph={ph} />
      {showSubCta && <SubCta text={sub} />}
    </>
  );

  // ── 룰렛형: 응모 기회 2행 (라벨 neutral-mute / 값 neutral-solid)
  if (design === 'roulette') {
    return (
      <section className={CARD}>
        {showImage && <TopImage src={corner.bannerImageUrl ?? null} />}
        <div className="space-y-3 px-[22px] pb-[20px] pt-[18px]">
          <div className="space-y-2"><Header ph={'{룰렛 타이틀}'} context={false} /></div>
          <div className="space-y-3 pt-0.5">
            <div className="flex items-center justify-between text-[14px] tracking-[-0.4px]"><span className="font-medium text-[#6c7691]">남은 응모 기회</span><span className="font-semibold text-[#060c1f]">{'{n}'}회</span></div>
            <div className="flex items-center justify-between text-[14px] tracking-[-0.4px]"><span className="font-medium text-[#6c7691]">추가 응모 기회</span><span className="font-semibold text-[#060c1f]">{'{n}'}회</span></div>
          </div>
          {showInfo && <InfoRow text={infoText} />}
          {showBtn && <ActionButton label={btn} />}
        </div>
      </section>
    );
  }

  // ── 바코드형: 맥락(거리) + 아이템 1(원형 썸네일) + 바코드 스트립
  if (design === 'barcode') {
    const it = itemsOf(corner.components, itemPh ?? '{혜택 프로그램 내용}', itemPh ?? '{혜택 프로그램 내용}', 1)[0];
    return (
      <section className={CARD}>
        {showImage && <TopImage src={corner.bannerImageUrl ?? null} />}
        <div className="space-y-3 px-[22px] pb-[20px] pt-[18px]">
          {showContext && <ContextHeader text={ctxText || '{추천 맥락 헤더(거리)}'} pin />}
          <Title text={title} ph={titlePh ?? '{혜택 프로그램 타이틀}'} />
          <div className="flex items-center gap-3.5 pt-0.5">
            <Thumb image={it.image} big />
            <div className="min-w-0"><p className="text-[15px] font-semibold leading-[22px] tracking-[-0.4px] text-[#060c1f]">{it.title}</p><p className="mt-0.5 text-[12px] font-medium tracking-[-0.4px] text-[#6c7691]">{it.sub}</p></div>
          </div>
          <div className="pt-0.5">
            {/* 실제 바코드처럼 변동 폭 바(반복 단위 안에 2·1·3·1px 바 + 다양한 간격) */}
            <div className="h-[48px] w-full bg-[repeating-linear-gradient(90deg,#060c1f_0,#060c1f_2px,transparent_2px,transparent_4px,#060c1f_4px,#060c1f_5px,transparent_5px,transparent_8px,#060c1f_8px,#060c1f_11px,transparent_11px,transparent_13px,#060c1f_13px,#060c1f_14px,transparent_14px,transparent_17px)]" />
            <div className="mt-2 flex items-center justify-between text-[12px] tracking-[-0.4px]"><span className="tracking-[0.12em] text-[#6c7691]">1234 4561 1506 4932</span><span className="font-semibold text-[#4b59ff]">19:58</span></div>
          </div>
          {/* 바코드형은 추가 인포메이션(성격 디스크립션) 없음(2026-11-25 SB 확정). */}
        </div>
      </section>
    );
  }

  // ── 출석체크형: 요일 체크 7칸 + 보상 행
  if (design === 'attendance') {
    const checks = [true, false, true, true, true, false, false];
    const reward = itemsOf(corner.components, '{미션 내용}', '{미션 내용}', 1)[0];
    return (
      <section className={CARD}>
        {showImage && <TopImage src={corner.bannerImageUrl ?? null} />}
        <div className="space-y-3 px-[22px] pb-[20px] pt-[18px]">
          <div className="space-y-2"><Header ph={'{출석 체크 미션 타이틀}'} context={false} /></div>
          <div className="flex justify-between pt-0.5">
            {checks.map((on, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className={`grid h-8 w-8 place-items-center rounded-full ${on ? 'bg-gradient-to-b from-[#5a63e2] to-[#4a52d4]' : 'bg-[#273b9d0d]'}`}>{on && <Check className="h-[15px] w-[15px] text-white" strokeWidth={3} />}</span>
                <span className="text-[11px] font-medium tracking-[-0.4px] text-[#6c7691]">{'{요일}'}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-[#00268c14] pt-4">
            <div className="flex items-center gap-3.5">
              <Thumb image={reward.image} big square />
              <div className="min-w-0 flex-1"><p className="text-[15px] font-semibold leading-[22px] tracking-[-0.4px] text-[#060c1f]">{reward.title}</p><p className="mt-0.5 text-[12px] font-medium tracking-[-0.4px] text-[#6c7691]">{reward.sub}</p></div>
              <span className="shrink-0 rounded-[8px] bg-[#273b9d0d] px-2.5 py-1.5 text-[11px] font-semibold tracking-[-0.4px] text-[#6c7691]">{'{Label}'}</span>
            </div>
          </div>
          {showInfo && <InfoRow text={infoText} />}
          {showBtn && <ActionButton label={btn} />}
        </div>
      </section>
    );
  }

  // ── 캐러셀형: 가로 카드(큰 이미지 + 카테고리/혜택명/99%/pill)
  if (design === 'carousel') {
    const cards = itemsOf(corner.components, '{혜택명}', '{카테고리}', 3);
    return (
      <section className={CARD}>
        {showImage && <TopImage src={corner.bannerImageUrl ?? null} />}
        <div className="space-y-3 pb-5 pt-4">
          <div className="space-y-2 px-[22px]"><Header ph={titlePh ?? '{혜택 프로그램 타이틀}'} context /></div>
          {showChips && <div className="px-[22px]"><Chips labels={chipsOf(corner.components)} /></div>}
          <div className="flex gap-3 overflow-hidden px-[22px]">
            {cards.map((c, i) => (
              <div key={i} className="w-[108px] shrink-0">
                <div className="h-[108px] w-full rounded-[12px] bg-[#eceff6]" />
                <p className="mt-2 text-[12px] font-medium tracking-[-0.4px] text-[#6c7691]">{c.sub}</p>
                <p className="text-[15px] font-semibold tracking-[-0.4px] text-[#060c1f]">{c.title}</p>
                <p className="mt-1 text-[15px] font-bold tracking-[-0.4px] text-[#3a38ec]">99%</p>
                <span className="mt-1.5 inline-block rounded-[8px] bg-[#273b9d0d] px-2.5 py-1 text-[11px] font-semibold tracking-[-0.4px] text-[#6c7691]">{'{Label}'}</span>
              </div>
            ))}
          </div>
          <div className="space-y-3 px-[22px]">
            {showInfo && <InfoRow text={infoText} />}
            {showBtn && <ActionButton label={btn} />}
          </div>
        </div>
      </section>
    );
  }

  // ── 리스트형(기본): 세로 리스트(썸네일 + 타이틀 + 보조)
  const rows = itemsOf(corner.components, itemPh ?? '{혜택 프로그램 내용}', itemPh ?? '{혜택 프로그램 내용}', 2);
  return (
    <section className={CARD}>
      {showImage && <TopImage src={corner.bannerImageUrl ?? null} />}
      <div className="space-y-3 px-[22px] pb-[20px] pt-[18px]">
        <div className="space-y-2"><Header ph={titlePh ?? '{제휴사 타이틀}'} context /></div>
        {showChips && <Chips labels={chipsOf(corner.components)} />}
        <div className="space-y-3 pt-0.5">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-3.5">
              <Thumb image={r.image} square={squareThumb} />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold leading-[22px] tracking-[-0.4px] text-[#060c1f]">{r.title}</p>
                <p className="mt-0.5 text-[12px] font-medium leading-[18px] tracking-[-0.4px] text-[#6c7691]">{r.sub}</p>
              </div>
              {itemButton && <span className="shrink-0 rounded-[8px] bg-[#273b9d0d] px-2.5 py-1.5 text-[11px] font-semibold tracking-[-0.4px] text-[#6c7691]">{'{Label}'}</span>}
            </div>
          ))}
        </div>
        {showInfo && <InfoRow text={infoText} />}
        {showBtn && <ActionButton label={btn} />}
      </div>
    </section>
  );
}

// 썸네일 — 원형(기본)/라운드 사각(square, radius-8). big=56px(바코드·출석 보상), 기본 44px. bg=dim-weak.
function Thumb({ image, square, big }: { image?: string | null; square?: boolean; big?: boolean }) {
  const shape = square ? 'rounded-[8px]' : 'rounded-full';
  const size = big ? 'h-12 w-12' : 'h-10 w-10';
  return image && /^(https?:|data:|\/assets\/)/.test(image)
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={image} alt="" className={`${size} shrink-0 object-cover ${shape}`} />
    : <span className={`${size} shrink-0 bg-[#273b9d0d] ${shape}`} />;
}
