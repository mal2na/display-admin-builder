'use client';

/**
 * 전시화면 관리 (테스트) — 3단 빌더 폼.
 *  좌: 미리보기(디바이스) · 중: 코너 설정(탭·화면명·코너 리스트) · 우: 코너 상세 설정.
 *  상품 전시 빌더 레퍼런스(2026-10-20 사용자 제공 이미지)를 그대로 맞춘 독립 컴포넌트.
 *  기존 전시화면 관리(/admin/containers)는 건드리지 않는 별도 테스트 화면이다.
 *  프로모션 관리 > 빌더 진입점도 이 컴포넌트로 맵핑한다(어떤 UI인지 확인용).
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Plus, ChevronLeft, ChevronRight, ChevronDown, ImageIcon } from 'lucide-react';

/* ---------------- 모델 ---------------- */
type BadgeKind = '상품 연동' | '주문' | '비화면';
type Corner = { id: string; badge: BadgeKind; name: string; links?: string[]; expose?: string };
type Screen = { key: string; name: string; corners: Corner[] };

const BADGE: Record<BadgeKind, string> = {
  '상품 연동': 'bg-[#ece9fe] text-[#6d49d6]',
  '주문': 'bg-[#e6efff] text-[#2e6ff2]',
  '비화면': 'bg-[#eef1f4] text-[#697582]',
};

const EXPOSE_OPTS = ['항상 노출', '조건 노출', '로그인 시 노출', '비로그인 시 노출', '미노출'];

/** 레퍼런스 이미지(주문 진행) 그대로 시드 */
const SEED: Screen[] = [
  {
    key: 'order',
    name: '주문 진행',
    corners: [
      { id: 'CN-ORD-0001', badge: '상품 연동', name: '상품 기본 정보 표시' },
      { id: 'CN-ORD-0002', badge: '상품 연동', name: '상품·옵션별 가격 선택' },
      { id: 'CN-ORD-0003', badge: '주문', name: '가입자/사용자 사전확인' },
      { id: 'CN-ORD-0004', badge: '비화면', name: '본인·로그인 여부 확인' },
      { id: 'CN-ORD-0005', badge: '주문', name: '가입유형 선택' },
      { id: 'CN-ORD-0006', badge: '주문', name: '기기 납부 방식 선택' },
      { id: 'CN-ORD-0007', badge: '상품 연동', name: '요금제 선택' },
      { id: 'CN-ORD-0008', badge: '주문', name: '약정/지원방식 선택' },
      { id: 'CN-ORD-0011', badge: '주문', name: '배송 옵션 선택', links: ['배송 옵션 선택', '배송 주소·수취인 확인'] },
      { id: 'CN-ORD-0010', badge: '상품 연동', name: 'T 기프트 선택' },
    ],
  },
  {
    key: 'confirm',
    name: '주문 확인',
    corners: [
      { id: 'CN-CFM-0001', badge: '주문', name: '주문 내역 요약' },
      { id: 'CN-CFM-0002', badge: '상품 연동', name: '결제 수단 선택' },
      { id: 'CN-CFM-0003', badge: '주문', name: '약관 동의' },
      { id: 'CN-CFM-0004', badge: '비화면', name: '결제 유효성 검증' },
    ],
  },
  {
    key: 'after',
    name: '사후 관리',
    corners: [
      { id: 'CN-AFT-0001', badge: '주문', name: '개통 진행 상태' },
      { id: 'CN-AFT-0002', badge: '상품 연동', name: '추천 액세서리' },
      { id: 'CN-AFT-0003', badge: '주문', name: '고객센터 연결' },
    ],
  },
];

/* 각 화면의 코너 합계(우측 '총 N개'용) — 레퍼런스 22개 느낌을 유지 */
const TOTAL_BY_SCREEN: Record<string, number> = { order: 22, confirm: 12, after: 9 };

/* ---------------- 코너 행(드래그) ---------------- */
function CornerRow({ c, no, active, onSelect, onRemove }: {
  c: Corner; no: number; active: boolean; onSelect: () => void; onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: c.id });
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={cn(
        'group flex cursor-pointer items-center gap-2.5 rounded-[10px] border px-3 py-3 text-[14px] transition',
        active ? 'border-[var(--ac)] bg-[var(--ac2)]' : 'border-[var(--line)] bg-white hover:border-[var(--line3)]',
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="shrink-0 cursor-grab text-[var(--ink4)] hover:text-[var(--ink2)] active:cursor-grabbing"
        aria-label="순서 변경"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="w-4 shrink-0 text-center text-[13px] font-semibold text-[var(--ink3)]">{no}</span>
      <span className={cn('shrink-0 rounded-[4px] px-2 py-[3px] text-[12px] font-semibold', BADGE[c.badge])}>{c.badge}</span>
      <span className="min-w-0 flex-1 truncate font-semibold text-[var(--ink)]">{c.name}</span>
      <span className="shrink-0 text-[13px] text-[var(--ink4)]">{c.id}</span>
      {c.links && c.links.length > 0 && (
        <span className="shrink-0 rounded-[4px] bg-[var(--th)] px-1.5 py-0.5 text-[12px] font-medium text-[var(--ink3)]">연결 {c.links.length}</span>
      )}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="shrink-0 text-[var(--ink4)] opacity-60 transition hover:text-[var(--bad)] hover:opacity-100"
        aria-label="코너 삭제"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ---------------- 미리보기(디바이스) ---------------- */
function DevicerPreview({ screenName }: { screenName: string }) {
  const Opt = ({ t, d }: { t: string; d: string }) => (
    <div className="rounded-[10px] border border-[var(--line2)] bg-white px-3.5 py-3">
      <p className="text-[13px] font-bold text-[var(--ink)]">{t}</p>
      <p className="mt-1 text-[11px] leading-[16px] text-[var(--ink3)]">{d}</p>
    </div>
  );
  return (
    <div className="mx-auto w-[300px] rounded-[38px] border-[8px] border-black bg-white p-4 shadow-[0_18px_50px_rgba(25,25,60,.18)]">
      {/* 진행 바 */}
      <p className="text-[13px] font-bold text-[var(--ac)]">{screenName}</p>
      <div className="mt-1.5 flex gap-1">
        <span className="h-1.5 flex-1 rounded-full bg-[var(--ac)]" />
        <span className="h-1.5 flex-1 rounded-full bg-[var(--line2)]" />
        <span className="h-1.5 flex-1 rounded-full bg-[var(--line2)]" />
      </div>

      {/* 선택 카드 */}
      <div className="mt-4 rounded-[14px] border-2 border-[var(--ac)] p-3">
        <p className="text-[14px] font-bold text-[var(--ink)]">휴대폰을 수령할 방법을 선택해 주세요</p>
        <div className="mt-3 space-y-2">
          <Opt t="바로도착" d="평일 18시까지 주문 시 원하는 시간에 배송해 드려요" />
          <Opt t="행복배송" d="평일 15시까지 주문 시 전문가가 개통까지 도와드려요" />
          <Opt t="일반배송" d="월~토 14시까지 주문 시 다음날 배송해 드려요" />
          <Opt t="바로픽업" d="주문하고 가까운 대리점에서 바로 찾아갈 수 있어요" />
        </div>
        <div className="mt-3 flex items-center justify-center gap-3 text-[12px] text-[var(--ink3)]">
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="rounded-[6px] border border-[var(--line2)] px-2.5 py-1">1 / 2</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </div>

      {/* T 기프트 */}
      <div className="mt-4">
        <div className="flex items-end justify-between">
          <p className="text-[14px] font-bold text-[var(--ink)]">T 기프트 하나를 선택해 주세요</p>
          <button type="button" className="text-[11px] text-[var(--ink3)] underline">전체보기</button>
        </div>
        <p className="mt-1 text-[11px] text-[var(--ink3)]">원하는 단말 사은품 하나를 지정한 주소로 보내…</p>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-[10px] border border-[var(--line2)] p-2.5">
              <span className="mb-1.5 inline-block h-3.5 w-3.5 rounded-full border border-[var(--line3)]" />
              <div className="grid h-12 place-items-center rounded-[6px] bg-[var(--th)] text-[var(--ink4)]"><ImageIcon className="h-5 w-5" /></div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] font-medium text-[var(--ac)]">✦ 주혁님 또래는 그라파이트 색상을 더 선호해요</p>
      </div>

      {/* CTA */}
      <div className="mt-3 flex items-center gap-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--ac2)] text-[13px] font-bold text-[var(--ac)]">T.</span>
        <button type="button" className="h-11 flex-1 rounded-[10px] bg-[var(--ac)] text-[14px] font-bold text-white">상품 주문하기</button>
      </div>
    </div>
  );
}

/* ---------------- 우측: 코너 상세 설정 ---------------- */
function CornerDetail({ screen, corner, index, onExpose }: {
  screen: Screen; corner: Corner | null; index: number; onExpose: (v: string) => void;
}) {
  const total = TOTAL_BY_SCREEN[screen.key] ?? screen.corners.length;
  if (!corner) {
    return <p className="text-[14px] text-[var(--ink3)]">왼쪽에서 코너를 선택하면 상세 설정이 표시됩니다.</p>;
  }
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-start gap-3 py-2 text-[14px]">
      <span className="w-20 shrink-0 text-[var(--ink3)]">{label}</span>
      <span className="min-w-0 flex-1 text-[var(--ink)]">{children}</span>
    </div>
  );
  return (
    <div>
      <p className="text-[14px] font-bold text-[var(--ink)]">코너 정보</p>
      <div className="mt-2">
        <Row label="코너명"><span className="font-semibold">{corner.name}</span></Row>
        <Row label="구분"><span className={cn('rounded-[4px] px-2 py-[3px] text-[12px] font-semibold', BADGE[corner.badge])}>{corner.badge}</span></Row>
        <Row label="코너 ID">{corner.id}</Row>
        <Row label="화면 내 순서">{index + 1}번째 / 총 {total}개</Row>
        <Row label="연결 화면">{corner.links?.length ?? 0}개</Row>
      </div>

      <div className="mt-6">
        <p className="text-[14px] font-bold text-[var(--ink)]">노출 옵션 설정</p>
        <div className="relative mt-2">
          <select
            value={corner.expose ?? '항상 노출'}
            onChange={(e) => onExpose(e.target.value)}
            className="h-[42px] w-full appearance-none rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-3.5 pr-10 text-[14px] text-[var(--ink)] focus:border-[var(--ac)] focus:outline-none"
          >
            {EXPOSE_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink4)]" />
        </div>
      </div>

      <div className="mt-6">
        <p className="text-[14px] font-bold text-[var(--ink)]">연결 화면</p>
        {corner.links && corner.links.length > 0 ? (
          <ol className="mt-2 space-y-1 text-[14px] text-[var(--ink2)]">
            {corner.links.map((l, i) => <li key={i}>{i + 1}. {l}</li>)}
          </ol>
        ) : (
          <p className="mt-2 text-[14px] text-[var(--ink3)]">연결된 화면이 없습니다.</p>
        )}
        <p className="mt-3 text-[13px] text-[var(--ink4)]">연결 화면은 코너 관리에서 등록합니다.</p>
      </div>
    </div>
  );
}

/* ---------------- 루트 ---------------- */
export function ScreenBuilderTest({ onBack }: { onBack?: () => void }) {
  const [screens, setScreens] = React.useState<Screen[]>(() => SEED.map((s) => ({ ...s, corners: s.corners.map((c) => ({ ...c })) })));
  const [tab, setTab] = React.useState(0);
  const [selId, setSelId] = React.useState<string | null>('CN-ORD-0011');
  const addSeq = React.useRef(1);

  const screen = screens[tab];
  const selIndex = screen.corners.findIndex((c) => c.id === selId);
  const selected = selIndex >= 0 ? screen.corners[selIndex] : null;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function patchScreen(fn: (s: Screen) => Screen) {
    setScreens((prev) => prev.map((s, i) => (i === tab ? fn(s) : s)));
  }
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    patchScreen((s) => {
      const from = s.corners.findIndex((c) => c.id === active.id);
      const to = s.corners.findIndex((c) => c.id === over.id);
      return { ...s, corners: arrayMove(s.corners, from, to) };
    });
  }
  function removeCorner(id: string) {
    patchScreen((s) => ({ ...s, corners: s.corners.filter((c) => c.id !== id) }));
    if (selId === id) setSelId(null);
  }
  function addCorner() {
    const id = `CN-NEW-${String(addSeq.current++).padStart(4, '0')}`;
    patchScreen((s) => ({ ...s, corners: [...s.corners, { id, badge: '주문', name: '새 코너', expose: '항상 노출' }] }));
    setSelId(id);
  }
  function removeTab(i: number) {
    if (screens.length <= 1) return;
    setScreens((prev) => prev.filter((_, idx) => idx !== i));
    setTab((t) => (t >= i ? Math.max(0, t - 1) : t));
  }
  function addTab() {
    const key = `scr-${Date.now()}`;
    setScreens((prev) => [...prev, { key, name: '새 화면', corners: [] }]);
    setTab(screens.length);
  }

  const Card = ({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) => (
    <section className={cn('rounded-[16px] border border-[var(--line)] bg-white p-6', className)}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-[var(--ink)]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );

  return (
    <div className="px-10 py-8 pb-24">
      {onBack ? (
        <div className="mb-5 flex items-center gap-3">
          <button type="button" onClick={onBack} className="h-[38px] rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-5 text-[14px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]">← 돌아가기</button>
          <span className="text-[13px] text-[var(--ink3)]">전시화면 관리 빌더(테스트)로 맵핑된 화면입니다.</span>
        </div>
      ) : (
        <div className="mb-5">
          <nav className="flex items-center gap-1.5 text-[14px] leading-[20px] text-[var(--ink3)]">
            <span>홈</span><span className="opacity-60">›</span><span>전시 관리</span>
            <span className="opacity-60">›</span><b className="text-[var(--ink)]">전시화면 관리 (테스트)</b>
          </nav>
          <h1 className="mt-2 text-[24px] font-bold leading-[32px] tracking-[-0.6px] text-[var(--ink)]">전시화면 관리 (테스트)</h1>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(340px,380px)_minmax(0,1fr)_minmax(320px,360px)]">
        {/* 좌: 미리보기 */}
        <Card title="미리보기">
          <div className="rounded-[14px] bg-[var(--th)] py-7">
            <DevicerPreview screenName={screen.name} />
            <p className="mt-5 text-center text-[13px] font-semibold text-[var(--ink3)]">iPhone Pro 18 미리보기 중입니다.</p>
          </div>
        </Card>

        {/* 중: 코너 설정 */}
        <Card title="코너 설정" action={<button type="button" className="h-8 rounded-[6px] border border-[var(--line3)] bg-white px-3 text-[13px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]">복사하기</button>}>
          {/* 탭 */}
          <div className="flex items-center gap-1 border-b border-[var(--line)]">
            {screens.map((s, i) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setTab(i)}
                className={cn('-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[14px] font-bold transition',
                  i === tab ? 'border-[var(--ac)] text-[var(--ac)]' : 'border-transparent text-[var(--ink4)] hover:text-[var(--ink2)]')}
              >
                {s.name}
                <span onClick={(e) => { e.stopPropagation(); removeTab(i); }} className="text-[var(--ink4)] hover:text-[var(--bad)]"><X className="h-3.5 w-3.5" /></span>
              </button>
            ))}
            <button type="button" onClick={addTab} className="ml-1 grid h-7 w-7 place-items-center rounded-[6px] border border-[var(--line2)] text-[var(--ink3)] hover:bg-[var(--th)]"><Plus className="h-4 w-4" /></button>
          </div>

          {/* 화면명 */}
          <div className="mt-5">
            <label className="text-[14px] font-semibold text-[var(--ink2)]">화면명</label>
            <input
              value={screen.name}
              onChange={(e) => patchScreen((s) => ({ ...s, name: e.target.value }))}
              placeholder="화면명을 입력하세요"
              className="mt-2 h-[42px] w-full rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-3.5 text-[14px] text-[var(--ink)] placeholder:text-[var(--ink4)] focus:border-[var(--ac)] focus:outline-none"
            />
          </div>

          {/* 코너 리스트 */}
          <div className="mt-5">
            <p className="mb-2 text-[14px] font-semibold text-[var(--ink2)]">코너 설정</p>
            <div className="max-h-[560px] overflow-y-auto rounded-[12px] border border-[var(--line)] bg-[var(--th)] p-2.5">
              {screen.corners.length === 0 ? (
                <p className="py-10 text-center text-[14px] text-[var(--ink4)]">코너가 없습니다. 아래에서 추가하세요.</p>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext items={screen.corners.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {screen.corners.map((c, i) => (
                        <CornerRow key={c.id} c={c} no={i + 1} active={c.id === selId} onSelect={() => setSelId(c.id)} onRemove={() => removeCorner(c.id)} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button type="button" onClick={addCorner} className="h-[42px] rounded-[var(--r-field)] bg-[var(--ac)] px-5 text-[14px] font-bold text-white hover:bg-[var(--ac-h)]">코너 추가하기</button>
          </div>
        </Card>

        {/* 우: 코너 상세 설정 */}
        <Card title="코너 상세 설정">
          <CornerDetail
            screen={screen}
            corner={selected}
            index={selIndex}
            onExpose={(v) => patchScreen((s) => ({ ...s, corners: s.corners.map((c) => (c.id === selId ? { ...c, expose: v } : c)) }))}
          />
        </Card>
      </div>
    </div>
  );
}
