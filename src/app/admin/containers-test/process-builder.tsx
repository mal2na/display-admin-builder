'use client';

/**
 * 전시화면 관리 (테스트) — 주문 프로세스 등록(order3-create) 레이아웃을 전시 데이터로 이식.
 *  좌: 미리보기(디바이스, 고정) · 우: 기본 정보(폼) + 템플릿 구성(카드>코너 2단) + 구성 검증 · 하단 고정 액션 바.
 *  실제 혜택 홈 등 Container·Template·Corner 를 채운다. 배치·노출 테스트용(코너 추가/저장은 데모).
 *  레퍼런스: https://nc-channel.vercel.app/order3-create.html (2026-10-20 사용자 요청).
 */
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { addCornersToTemplate } from './actions';
import { DeviceFrame, CornerBlock } from '@/components/preview/blocks';
import { FieldRow } from '@/components/ops-ui';
import { cornerTypeChipClass, layoutLabel, ZONE_META, ZONE_RANK, REC_SOURCE_METHODS, REC_SOURCE_INFO, type Zone } from '@/lib/display-taxonomy';
import { ChevronLeft, ChevronRight, ChevronDown, GripVertical, X, Plus, Copy, Pencil, ShieldCheck, Layers, EyeOff, Lock, Trash2, Sparkles, UserCog, Search, Link2, Check, ImageIcon } from 'lucide-react';
import type { ProcessData, PTemplate, PCorner, LibCorner } from './process-data';

const EXPOSE_OPTS = ['항상 노출', '조건 노출', '로그인 시 노출', '비로그인 시 노출', '미노출'];

/** ISO 문자열 → datetime-local 입력값(YYYY-MM-DDTHH:mm, 로컬). 값 없으면 빈 문자열 */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ───────── 구성 검증 ───────── */
type Issue = { level: '오류' | '경고'; area: string; detail: string; templateId?: string };
function validate(data: ProcessData): Issue[] {
  const issues: Issue[] = [];
  if (!data.containerName.trim()) issues.push({ level: '오류', area: '설정 항목', detail: '기본 정보의 컨테이너명이 입력되지 않았습니다.' });
  data.templates.forEach((t, i) => {
    if (t.corners.length === 0) issues.push({ level: '오류', area: '설정 항목', detail: `${i + 1}번째 템플릿 '${t.name}'에 배치된 코너가 없습니다.`, templateId: t.id });
    if (!t.conditionGroup) issues.push({ level: '경고', area: '분기 조건', detail: `'${t.name}' 템플릿에 조건그룹이 설정되지 않았습니다.`, templateId: t.id });
    const noLimit = t.corners.filter((c) => c.maxItems == null);
    if (noLimit.length > 0) issues.push({ level: '경고', area: '노출 개수', detail: `'${t.name}'의 코너 ${noLimit.length}개에 노출 개수가 지정되지 않았습니다.`, templateId: t.id });
  });
  return issues;
}

/* 코너의 '선택지'(선택형 컴포넌트의 아톰 라벨)를 노출 옵션 체크박스로 — 없으면 옵션 설정 대상 아님 */
function cornerOptions(preview: PCorner['preview']): string[] {
  const out: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const c of ((preview as any)?.components ?? [])) {
    if (c?.componentType !== '선택형') continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const a of (c.atoms ?? [])) {
      const t = String(a?.content ?? a?.name ?? '').trim();
      if (t && !t.startsWith('@cvm') && !out.includes(t)) out.push(t);
    }
  }
  return out.slice(0, 6);
}

/* ───────── 코너 상세(카드 내부 우측) ───────── */
const REC_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  'CVM 데이터 연동': Sparkles, 'CVM 콘텐츠 연동': Sparkles, '운영자 편성': UserCog,
};

const CVM_CATALOGS = ['요금제', '단말', '멤버십', '혜택', '마케팅 프로그램', '업무'];

/* 접이식 섹션 — 번호·제목·(?)·접기 토글(모듈 스코프: 상태 유지) */
function Sec({ n, title, help, children }: { n: number; title: string; help?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(true);
  return (
    <div className="rounded-[12px] border border-[var(--line)] bg-white p-4">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--ac)] text-[11px] font-bold text-white">{n}</span>
        <h4 className="flex-1 text-left text-[14px] font-bold text-[var(--ink)]">{title}</h4>
        {help && <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full border border-[var(--line2)] text-[10px] text-[var(--ink4)]">?</span>}
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-[var(--ink4)] transition', !open && '-rotate-90')} />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function CornerDetail({ template, corner, index, onToast }: {
  template: PTemplate; corner: PCorner | null; index: number; onToast: (m: string) => void;
}) {
  if (!corner) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-[12px] border border-dashed border-[var(--line2)] bg-[var(--th)] px-6 text-center text-[13px] leading-relaxed text-[var(--ink4)]">
        왼쪽에서 코너를 선택하면<br />상세 설정이 여기에 표시됩니다
      </div>
    );
  }
  return <CornerDetailBody key={corner.id} template={template} corner={corner} onToast={onToast} />;
}

function CornerDetailBody({ template, corner, onToast }: { template: PTemplate; corner: PCorner; onToast: (m: string) => void }) {
  const [src, setSrc] = React.useState<string>(corner.recSource ?? '운영자 편성');
  const [fb, setFb] = React.useState<'미노출' | '운영자 편성으로 대체'>(corner.fallback);
  const [cat, setCat] = React.useState('혜택');
  const [topN, setTopN] = React.useState(5);
  const options = cornerOptions(corner.preview);
  // ③ 채우기 항목 — 실제 코너 선택지에서 시작, 메뉴 추가/삭제로 편집(클라이언트 상태)
  const [items, setItems] = React.useState<{ id: string; label: string }[]>(
    () => (options.length ? options : ['대표 아이템 1', '대표 아이템 2', '대표 아이템 3']).map((o, i) => ({ id: `it-${i}-${o}`, label: o })),
  );
  const addItem = () => setItems((xs) => [...xs, { id: `new-${Date.now()}`, label: '' }]);
  const removeItem = (id: string) => setItems((xs) => xs.filter((x) => x.id !== id));
  const isCvmSrc = src.startsWith('CVM');
  const isData = src === 'CVM 데이터 연동';

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-start gap-3 py-1.5 text-[13px]">
      <span className="w-[76px] shrink-0 text-[var(--ink3)]">{label}</span>
      <span className="min-w-0 flex-1 text-[var(--ink)]">{children}</span>
    </div>
  );
  const MiNoChul = (
    <div className="mt-3">
      <label className="mb-1 flex items-center gap-1 text-[12px] font-semibold text-[var(--ink3)]">미 노출 조건</label>
      <div className="relative">
        <select defaultValue="선택 없음" className="h-[38px] w-full appearance-none rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-3 pr-9 text-[13px] text-[var(--ink)] focus:border-[var(--ac)] focus:outline-none">
          <option>선택 없음</option><option>비로그인 시 미노출</option><option>보유 고객 미노출</option><option>기간 외 미노출</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink4)]" />
      </div>
    </div>
  );

  return (
    <div className="space-y-3">

      {/* ① 코너 정보 */}
      <Sec n={1} title="코너 정보">
        <div className="mb-2 flex items-center gap-1 rounded-[8px] bg-[var(--th)] px-2.5 py-2 text-[12px] text-[var(--ink3)]"><Lock className="h-3 w-3" /> 껍데기 · 코너 유형 관리에서 정의 · 수정 불가</div>
        <Row label="코너 유형"><span className={cornerTypeChipClass(corner.cornerType)}>{corner.cornerType}</span></Row>
        <Row label="배열·레이아웃">{layoutLabel(corner.layout) || corner.layout || '—'}</Row>
        <Row label="노출 개수">{corner.maxItems != null ? `~ ${corner.maxItems}개` : '제한 없음'}</Row>
        <Row label="코너명">{corner.name}</Row>
      </Sec>

      {/* ② 수급 — 클릭해 전환 */}
      <Sec n={2} title="수급 — 이 자리를 누가 채우나" help>
        <div className="space-y-2">
          {REC_SOURCE_METHODS.map((m) => {
            const info = REC_SOURCE_INFO[m]; const on = m === src; const Icon = REC_ICON[m] ?? Sparkles;
            return (
              <button key={m} type="button" onClick={() => setSrc(m)} className={cn('w-full rounded-[10px] border px-3 py-2.5 text-left transition', on ? 'border-[var(--ac)] bg-[var(--ac2)]' : 'border-[var(--line2)] bg-white hover:border-[var(--line3)]')}>
                <div className="flex items-center gap-2">
                  <span className={cn('grid h-4 w-4 shrink-0 place-items-center rounded-full border', on ? 'border-[var(--ac)] bg-[var(--ac)]' : 'border-[var(--line3)]')}>{on && <span className="h-1.5 w-1.5 rounded-full bg-white" />}</span>
                  <Icon className={cn('h-3.5 w-3.5', on ? 'text-[var(--ac)]' : 'text-[var(--ink4)]')} />
                  <b className="text-[13px] text-[var(--ink)]">{m}</b>
                </div>
                <p className="ml-6 mt-0.5 text-[12px] text-[var(--ink3)]">{info.how}</p>
                <div className="ml-6 mt-1 flex items-center gap-1 text-[11px]">
                  <span className="rounded-[4px] bg-[#e6efff] px-1.5 py-0.5 font-semibold text-[#2e6ff2]">{info.cvmGives}</span>
                  <ChevronRight className="h-3 w-3 text-[var(--ink4)]" />
                  <span className="rounded-[4px] bg-[#fff0d6] px-1.5 py-0.5 font-semibold text-[#b67a12]">{info.weBuild}</span>
                </div>
              </button>
            );
          })}
        </div>
      </Sec>

      {/* ③ 수급 방식별 — 운영자 편성=채우기, 데이터 연동=요청, 콘텐츠 연동=구좌만 */}
      {src === '운영자 편성' ? (
        <Sec n={3} title="채우기 — 항목 등록">
          <p className="mb-1.5 text-[12px] font-semibold text-[var(--ink3)]">칩 묶음 <span className="text-[var(--ac)]">1</span></p>
          <div className="rounded-[10px] border border-[var(--line)] p-2.5">
            <div className="mb-2 flex items-center gap-1.5">
              <GripVertical className="h-3.5 w-3.5 shrink-0 text-[var(--ink4)]" />
              <span className="w-4 shrink-0 text-center text-[12px] text-[var(--ink3)]">1</span>
              <input defaultValue={corner.name} className="h-[32px] min-w-0 flex-1 rounded-[6px] border border-[var(--line3)] px-2 text-[13px] focus:border-[var(--ac)] focus:outline-none" />
              <button type="button" onClick={() => onToast('취소')} className="inline-flex h-[30px] items-center gap-1 rounded-[6px] border border-[var(--line2)] bg-white px-2 text-[12px] text-[var(--ink3)] hover:bg-[var(--th)]"><X className="h-3 w-3" /> 취소</button>
              <button type="button" onClick={() => onToast('저장되었습니다. (데모)')} className="inline-flex h-[30px] items-center gap-1 rounded-[6px] bg-[var(--ac)] px-2 text-[12px] font-semibold text-white hover:bg-[var(--ac-h)]"><Check className="h-3 w-3" /> 완료</button>
            </div>
            <p className="mb-2 flex items-center justify-between text-[11px] text-[var(--ink4)]"><span>라벨·이동 링크를 입력하고 드래그로 <b className="text-[var(--ink3)]">순서 변경</b> · 상단 “완료”로 저장</span><span className="font-semibold">{items.length}</span></p>
            <div className="space-y-1.5">
              {items.map((o) => (
                <div key={o.id} className="flex items-center gap-1.5 rounded-[8px] border border-[var(--line2)] bg-white px-2 py-1.5">
                  <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-[var(--ink4)]" />
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[6px] border border-[var(--line2)] bg-[var(--th)] text-[var(--ink4)]"><ImageIcon className="h-3.5 w-3.5" /></span>
                  <input defaultValue={o.label} placeholder="라벨 입력" className="h-[30px] min-w-0 flex-1 rounded-[6px] border border-[var(--line2)] px-2 text-[13px] focus:border-[var(--ac)] focus:outline-none" />
                  <button type="button" onClick={() => onToast('이동 링크 설정 (데모)')} className="grid h-7 w-7 shrink-0 place-items-center rounded-[6px] border border-[var(--line2)] text-[var(--ink3)] hover:bg-[var(--th)]"><Link2 className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => onToast('불러오기 (데모)')} className="shrink-0 rounded-[6px] border border-[var(--line2)] px-2 py-1 text-[12px] font-medium text-[var(--ink2)] hover:bg-[var(--th)]">불러오기</button>
                  <button type="button" onClick={() => removeItem(o.id)} className="grid h-6 w-6 shrink-0 place-items-center text-[var(--ink4)] hover:text-[var(--bad)]"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addItem} className="mt-2 flex w-full items-center justify-center gap-1 rounded-[8px] border border-[#cfd2ff] bg-[var(--ac2)] py-2 text-[12px] font-bold text-[var(--ac)] hover:bg-[#e6e8ff]"><Plus className="h-3.5 w-3.5" /> 메뉴 추가</button>
            <p className="mt-2 flex items-start gap-1 rounded-[8px] bg-[var(--th)] px-2.5 py-2 text-[11px] leading-relaxed text-[var(--ink4)]"><Lock className="mt-0.5 h-3 w-3 shrink-0" /> 슬롯 수·줄 수는 <b className="text-[var(--ink3)]">코너 유형(껍데기)</b>에서 정의합니다. <b className="text-[var(--ink3)]">라벨·이동 링크·순서</b>는 빌더에서 채워요.</p>
          </div>
          {MiNoChul}
        </Sec>
      ) : isData ? (
        <Sec n={3} title="요청 — CVM에 무엇을 달라고 할지" help>
          <div className="mb-2 flex items-start gap-1.5 rounded-[8px] bg-[#eef2ff] px-3 py-2 text-[12px] leading-relaxed text-[#2e4fd6]">
            <span className="mt-0.5">ⓘ</span><span><b>우리가 제안하는 요청 안</b> · 아래에서 고른 범위로 CVM에 요청합니다(협의 중 조정 가능).</span>
          </div>
          <p className="mb-1.5 text-[12px] font-semibold text-[var(--ink3)]">요청 중분류</p>
          <div className="flex flex-wrap gap-1.5">
            {CVM_CATALOGS.map((c) => (
              <button key={c} type="button" onClick={() => setCat(c)} className={cn('rounded-[8px] px-2.5 py-1.5 text-[12px] font-semibold', c === cat ? 'bg-[var(--ac)] text-white' : 'bg-[var(--th)] text-[var(--ink2)] hover:bg-[var(--line)]')}>{c}</button>
            ))}
          </div>
          <p className="mb-1.5 mt-3 text-[12px] font-semibold text-[var(--ink3)]">요청 개수</p>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setTopN(n)} className={cn('grid h-7 w-7 place-items-center rounded-[6px] text-[12px] font-semibold', n === topN ? 'bg-[var(--ac)] text-white' : 'border border-[var(--line2)] text-[var(--ink3)]')}>{n}</button>
            ))}
            <span className="ml-1 text-[11px] text-[var(--ink4)]">CVM 상한 5</span>
          </div>
          <details className="mt-3 rounded-[8px] bg-[var(--th)] px-3 py-2 text-[12px] text-[var(--ink3)]">
            <summary className="cursor-pointer font-semibold">▸ CVM이 주지 않는 것 5가지</summary>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[11px] text-[var(--ink4)]">
              <li>세그먼트(개별 고객 단위만)</li><li>고객 성향·인사이트(C360·데이터실)</li><li>제휴 콘텐츠(EPC 밖)</li><li>레이아웃·카드 모양(전시 설계)</li><li>문구만 따로 베리에이션</li>
            </ul>
          </details>
        </Sec>
      ) : (
        <Sec n={3} title="요청 — 구좌만 넘김" help>
          <p className="rounded-[8px] bg-[var(--ac2)] px-3 py-2.5 text-[12px] leading-relaxed text-[var(--ink2)]">
            <b className="text-[var(--ac)]">CVM 콘텐츠 연동</b> = 구좌(자리)만 넘깁니다. 이미지·문구·랜딩까지 <b>CVM이 완성본을 내려주고</b> 전시 어드민은 받은 그대로 노출합니다. 별도 요청 범위(③) 설정은 없습니다.
          </p>
        </Sec>
      )}

      {/* ④ 폴백 — CVM 수급일 때 */}
      {isCvmSrc && (
        <Sec n={4} title="폴백 — CVM 응답이 비었을 때" help>
          <div className="space-y-1.5">
            {(['미노출', '운영자 편성으로 대체'] as const).map((f) => {
              const on = fb === f;
              return (
                <button key={f} type="button" onClick={() => setFb(f)} className={cn('flex w-full items-start gap-2 rounded-[8px] border px-2.5 py-2 text-left text-[12px]', on ? 'border-[#f2c47a] bg-[#fff8ef]' : 'border-[var(--line2)] bg-white opacity-80')}>
                  <span className={cn('mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border', on ? 'border-[#e59a2a] bg-[#e59a2a]' : 'border-[var(--line3)]')}>{on && <span className="h-1.5 w-1.5 rounded-full bg-white" />}</span>
                  <span className="min-w-0 flex-1">
                    <b className="text-[var(--ink)]">{f === '미노출' ? '미노출 (기본)' : '운영자 편성으로 대체'}</b>
                    <span className="block text-[var(--ink4)]">{f === '미노출' ? 'CVM이 비면 이 코너는 노출되지 않아요.' : '등록한 운영자 편성 항목을 대신 노출해요.'}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Sec>
      )}

      {/* ⑤ 대체 소재 — CVM + 운영자 편성으로 대체일 때 */}
      {isCvmSrc && fb === '운영자 편성으로 대체' && (
        <Sec n={5} title="대체 소재 — 대표 아이템(조립 규격)" help>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[12px] text-[var(--ink3)]">콘텐츠 묶음 <b className="text-[var(--ink)]">{Math.min(items.length, 3)}</b></span>
            <span className="rounded-[6px] bg-[var(--ac2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ac)]">✦ 노출 {corner.maxItems ?? 10} = 운영자 {Math.min(items.length, 3)} + CVM 보충 {Math.max((corner.maxItems ?? 10) - Math.min(items.length, 3), 0)} <span className="rounded-[4px] bg-white/70 px-1">가안</span></span>
          </div>
          <div className="space-y-1.5">
            {items.slice(0, 3).map((o, i) => (
              <div key={o.id} className="rounded-[8px] border border-[var(--line2)] bg-white p-2.5">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-[var(--ink4)]" />
                  <span className="w-4 shrink-0 text-center text-[12px] text-[var(--ink3)]">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--ink)]">{o.label}</span>
                  <button type="button" onClick={() => onToast('항목 삭제 (데모)')} className="text-[var(--ink4)] hover:text-[var(--bad)]"><Trash2 className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => onToast('수정 (데모)')} className="inline-flex items-center gap-1 rounded-[6px] border border-[var(--line2)] px-2 py-0.5 text-[12px] text-[var(--ink3)] hover:bg-[var(--th)]"><Pencil className="h-3 w-3" /> 수정</button>
                </div>
                <div className="ml-6 mt-1.5 flex items-center gap-2">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[6px] border border-[var(--line2)] bg-[var(--th)] text-[var(--ink4)]"><ImageIcon className="h-4 w-4" /></span>
                  <span className="text-[11px] text-[var(--ink4)]">평점 {(4 + (i * 0.4) % 1).toFixed(1)} · 예매율 {(21 - i * 2).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
          {MiNoChul}
        </Sec>
      )}

      {/* ⑥ 출처 — 이 값이 어디서 오나 */}
      <Sec n={6} title="출처 — 이 값이 어디서 오나" help>
        <div className="overflow-hidden rounded-[8px] border border-[var(--line)] text-[12px]">
          {[
            ['아이템 · 순서', isCvmSrc ? 'CVM' : '운영자 편성'],
            ['이미지', '상품(EPC) 원장'],
            ['문구', src === 'CVM 콘텐츠 연동' ? 'CVM 완성본' : '빌더 · 상품 원장'],
            ['이동 링크', '빌더'],
          ].map(([k, v], i) => (
            <div key={k} className={cn('flex items-center gap-3 px-3 py-2', i > 0 && 'border-t border-[var(--line)]')}>
              <span className="w-[72px] shrink-0 text-[var(--ink3)]">{k}</span>
              <span className={cn('rounded-[4px] px-1.5 py-0.5 font-semibold', v === 'CVM' || v === 'CVM 완성본' ? 'bg-[#e6efff] text-[#2e6ff2]' : 'bg-[#fff0d6] text-[#b67a12]')}>{v}</span>
            </div>
          ))}
        </div>
      </Sec>
    </div>
  );
}

/* 존 밴드 순서 — Fixed(상단) → Dynamic → Semi (실제 빌더 리스트 기준) */
const BAND_ORDER: Zone[] = ['fixed', 'dynamic', 'semi'];

/* 코너 칩 카드(존 밴드 내부) — 이미지2: 드래그·이름·복사/삭제·유형/레이아웃·고정 토글 */
/* 코너 순서 변경 행(order3 레퍼런스) — 드래그·번호·이름·유형칩 + 노출 토글 + 삭제. */
function CornerChip({ c, no, selected, onSelect, onToast }: { c: PCorner; no: number; selected: boolean; onSelect: () => void; onToast: (m: string) => void }) {
  const [on, setOn] = React.useState(true); // 노출 on/off 토글
  return (
    <div onClick={onSelect} className={cn('flex cursor-pointer items-center gap-2 rounded-[10px] border bg-white px-2.5 py-2 transition', selected ? 'border-[var(--ac)] bg-[var(--ac2)] ring-1 ring-[var(--ac)]' : 'border-[var(--line2)] hover:border-[var(--line3)]')}>
      <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-[var(--ink4)]" />
      <span className="w-4 shrink-0 text-center text-[13px] font-semibold text-[var(--ink3)]">{no}</span>
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-[13px] font-bold', on ? 'text-[var(--ink)]' : 'text-[var(--ink4)]')}>{c.name}</span>
        <span className="mt-0.5 flex items-center gap-1.5">
          <span className={cornerTypeChipClass(c.cornerType)}>{c.cornerType}</span>
          {c.layout && <span className="text-[11px] text-[var(--ink4)]">{layoutLabel(c.layout) || c.layout}</span>}
        </span>
      </span>
      {/* 노출 on/off 토글 */}
      <button type="button" onClick={(e) => { e.stopPropagation(); setOn((v) => !v); }} title={on ? '노출 켜짐' : '노출 꺼짐'}
        className={cn('relative h-[20px] w-[34px] shrink-0 rounded-full transition-colors', on ? 'bg-[var(--ac)]' : 'bg-[var(--line3)]')}>
        <span className={cn('absolute top-[2px] h-[16px] w-[16px] rounded-full bg-white shadow-sm transition-all', on ? 'left-[16px]' : 'left-[2px]')} />
      </button>
    </div>
  );
}

/* ───────── 코너 리스트 — Fixed / Dynamic / Semi-fixed 밴드 묶음(세련된 버전) ───────── */
const ZONE_ORDER: Zone[] = ['fixed', 'dynamic', 'semi']; // 화면 위→아래: 고정 → 개인화 → 기간

function BandedCorners({ corners, selCorner, onSelect, onToast }: {
  corners: PCorner[]; selCorner: string | null; onSelect: (id: string) => void; onToast: (m: string) => void;
}) {
  const groups = ZONE_ORDER
    .map((z) => ({ z, items: corners.filter((c) => c.zone === z) }))
    .filter((g) => g.items.length > 0);
  let running = 0;
  return (
    <div className="space-y-3">
      {groups.map(({ z, items }) => {
        const meta = ZONE_META[z];
        return (
          <div key={z}>
            {/* 밴드 헤더 — 점·영문 라벨(존 색)·한글 설명 + 개수 */}
            <div className="mb-1.5 flex items-center gap-1.5 px-0.5">
              <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: meta.hex }} />
              <span className="text-[12px] font-extrabold tracking-tight" style={{ color: meta.hex }}>{meta.label}</span>
              <span className="truncate text-[11px] text-[var(--ink4)]">{meta.en}</span>
              <span className="ml-auto grid h-[18px] min-w-[18px] shrink-0 place-items-center rounded-full border border-[var(--line2)] bg-white px-1.5 text-[11px] font-bold text-[var(--ink3)]">{items.length}</span>
            </div>
            {/* 밴드 본문 — 존 색 좌측 액센트 바 */}
            <div className="space-y-1.5 border-l-[2px] pl-2.5" style={{ borderColor: meta.hex }}>
              {items.map((c) => {
                running += 1;
                return (
                  <CornerChip key={c.id} c={c} no={running} selected={c.id === selCorner}
                    onSelect={() => onSelect(c.id)} onToast={onToast} />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ───────── 템플릿 카드(= order3 '컨테이너' 카드) ───────── */
function TemplateCard({ t, idx, open, active, onToggle, onActivate, selCorner, onSelCorner, onAddCorner, onToast }: {
  t: PTemplate; idx: number; open: boolean; active: boolean;
  onToggle: () => void; onActivate: () => void;
  selCorner: string | null; onSelCorner: (id: string) => void;
  onAddCorner: () => void; onToast: (m: string) => void;
}) {
  const selIndex = t.corners.findIndex((c) => c.id === selCorner);
  const selected = selIndex >= 0 ? t.corners[selIndex] : null;
  return (
    <div className={cn('rounded-[12px] border bg-white', active ? 'border-[var(--ac)]' : 'border-[var(--line2)]')}>
      {/* 카드 헤더 */}
      <div className={cn('flex items-center gap-2.5 rounded-t-[11px] px-4 py-3', active ? 'bg-[var(--ac2)]' : 'bg-[var(--th)]')}>
        <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-[var(--ink4)]" />
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[6px] bg-[var(--ac)] text-[12px] font-bold text-white">{idx + 1}</span>
        <button type="button" onClick={onActivate} className="min-w-0 flex-1 text-left">
          <span className="text-[14px] font-bold text-[var(--ink)]">템플릿 구성</span>
          <span className="ml-1.5 text-[12px] text-[var(--ink4)]">· {t.name}{t.conditionGroup ? ` · ${t.conditionGroup}` : ''}</span>
        </button>
        {/* 코너 수 바 그래프 — 코너별 존 색으로(이미지 레퍼런스) */}
        <span className="hidden items-end gap-[2px] md:flex" title={`코너 ${t.corners.length}개`}>
          {t.corners.slice(0, 24).map((c, i) => (
            <span key={i} className="w-[3px] rounded-[1px]" style={{ height: 14, background: ZONE_META[c.zone]?.hex ?? 'var(--ac)' }} />
          ))}
        </span>
        <span className="shrink-0 text-[12px] font-medium text-[var(--ink3)]">코너 {t.corners.length}개</span>
        {t.status !== 'PUBLISHED' && <span className="shrink-0 rounded-[4px] border border-[#ffd8a8] bg-[#fff4e6] px-1.5 py-0.5 text-[11px] font-semibold text-[#e8820c]">확인 필요</span>}
        {t.isDefault && <span className="shrink-0 rounded-[4px] bg-[var(--ac2)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--ac)]">기본</span>}
        <button type="button" onClick={onToggle} className="shrink-0 rounded-[6px] p-1 text-[var(--ink3)] hover:bg-white/60" title={open ? '접기' : '펼치기'}>
          <ChevronDown className={cn('h-4 w-4 transition', !open && '-rotate-90')} />
        </button>
      </div>

      {/* 카드 본문 */}
      {open && (
        <div className="space-y-4 p-4">
          <div>
            <p className="mb-2 text-[13px] font-semibold text-[var(--ink2)]">코너 구성 <span className="text-[var(--ink4)]">{t.corners.length}개</span></p>
            {t.corners.length === 0 ? (
              <div className="rounded-[12px] border border-dashed border-[var(--line2)] bg-[var(--th)] p-6 text-center text-[13px] leading-relaxed text-[var(--ink4)]">
                이 템플릿에 배치된 코너가 없습니다.<br />「코너 추가」로 코너 관리의 코너를 가져오세요.
              </div>
            ) : (
              /* order3 레퍼런스: 좌측 순서변경 박스만 그레이 배경 + 해상도 기준 고정 높이(내부 스크롤) + 코너 추가 하단 고정 */
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[320px_minmax(0,1fr)] lg:h-[calc(100vh-300px)] lg:min-h-[420px]">
                {/* 코너 순서변경 박스 — 그레이 배경, 리스트 스크롤 + 코너 추가 하단 고정 */}
                <div className="flex min-h-0 flex-col rounded-[12px] border border-[var(--line)] bg-[var(--th)] p-2.5">
                  <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
                    <BandedCorners corners={t.corners} selCorner={selCorner}
                      onSelect={(id) => { onActivate(); onSelCorner(id); }} onToast={onToast} />
                  </div>
                  <button type="button" onClick={onAddCorner}
                    className="mt-2 flex w-full shrink-0 items-center justify-center gap-1 rounded-[10px] border border-[#cfd2ff] bg-[var(--ac2)] py-2.5 text-[13px] font-bold text-[var(--ac)] hover:bg-[#e6e8ff]">
                    <Plus className="h-4 w-4" /> 코너 추가
                  </button>
                </div>
                {/* 코너 상세 — 독립 스크롤 */}
                <div className="min-h-0 overflow-y-auto pr-0.5">
                  <CornerDetail template={t} corner={selected} index={selIndex} onToast={onToast} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────── 코너 추가 모달(order3 레퍼런스 + 우리 코너 유형 탭, 멀티셀렉) ───────── */
function LoadCornerModal({ corners, onClose, onAdd }: { corners: LibCorner[]; onClose: () => void; onAdd: (cs: LibCorner[]) => void }) {
  const [q, setQ] = React.useState('');
  const [tab, setTab] = React.useState('전체');
  // 우리 코너 유형으로 탭 분류 — 존재하는 유형만
  const types = React.useMemo(() => ['전체', ...Array.from(new Set(corners.map((c) => c.cornerType)))], [corners]);
  const list = corners.filter((c) => (tab === '전체' || c.cornerType === tab) && (!q || c.name.includes(q) || c.cornerType.includes(q)));
  // 멀티셀렉 — 체크된 코너 집합 + 우측 미리보기용 포커스
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const [focusId, setFocusId] = React.useState<string | null>(corners[0]?.id ?? null);
  const sel = corners.find((c) => c.id === focusId) ?? null;
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex h-[82vh] w-full max-w-[1040px] overflow-hidden rounded-[16px] bg-white shadow-[var(--dlg-shadow)]" onClick={(e) => e.stopPropagation()}>
        {/* 좌: 유형 탭 + 검색 + 코너 목록 */}
        <div className="flex w-[360px] shrink-0 flex-col border-r border-[var(--line)]">
          <div className="flex items-center justify-between px-5 pt-4">
            <h3 className="text-[17px] font-bold text-[var(--ink)]">코너 추가</h3>
          </div>
          <div className="flex items-center gap-2 px-5 pb-3 pt-3">
            {/* 유형 탭(드롭다운) */}
            <div className="relative shrink-0">
              <select value={tab} onChange={(e) => setTab(e.target.value)} className="h-[38px] appearance-none rounded-[var(--r-field)] border border-[var(--line3)] bg-white pl-3 pr-8 text-[13px] focus:border-[var(--ac)] focus:outline-none">
                {types.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink4)]" />
            </div>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="입력하세요" className="h-[38px] min-w-0 flex-1 rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-3 text-[13px] focus:border-[var(--ac)] focus:outline-none" />
          </div>
          <div className="px-5 pb-1 text-[12px] font-semibold text-[var(--ink3)]">{tab === '전체' ? '전체' : tab} <span className="text-[var(--ink4)]">{list.length}</span></div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
            {list.length === 0 ? <p className="py-8 text-center text-[13px] text-[var(--ink4)]">검색 결과가 없습니다.</p> : list.map((c) => {
              const on = picked.has(c.id);
              return (
                <button key={c.id} type="button" onClick={() => { toggle(c.id); setFocusId(c.id); }}
                  className={cn('flex w-full items-start gap-2.5 rounded-[10px] border px-3.5 py-3 text-left transition', on ? 'border-[var(--ac)] bg-[var(--ac2)]' : focusId === c.id ? 'border-[var(--line3)] bg-[var(--th)]' : 'border-[var(--line2)] hover:border-[var(--line3)]')}>
                  <span className={cn('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border', on ? 'border-[var(--ac)] bg-[var(--ac)] text-white' : 'border-[var(--line3)]')}>{on && <Check className="h-3 w-3" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-bold text-[var(--ink)]">{c.name}</span>
                    <span className="block text-[12px] text-[var(--ink4)]">{c.cornerType}{c.layout ? ` · ${layoutLabel(c.layout) || c.layout}` : ''} · v1.0.0</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        {/* 우: 선택 코너 — 화면 구성 미리보기 + 기본 노출 조건 + 추가 */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 px-6 pt-5">
            {sel && <span className="rounded-[6px] bg-[var(--th)] px-2 py-1 text-[12px] font-semibold text-[var(--ink3)]">{sel.id.slice(-8).toUpperCase()}</span>}
            <span className="truncate text-[16px] font-bold text-[var(--ink)]">{sel?.name ?? '코너를 선택하세요'}</span>
            {sel && <><span className="text-[12px] text-[var(--ink4)]">v1.0.0</span><span className="rounded-[6px] bg-[#eefaf1] px-2 py-0.5 text-[11px] font-semibold text-[#00a058]">운영</span></>}
            <button type="button" onClick={onClose} className="ml-auto rounded-[6px] p-1 text-[var(--ink3)] hover:bg-[var(--th)]"><X className="h-4.5 w-4.5" /></button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {sel ? (
              <>
                <p className="mb-2 text-[14px] font-bold text-[var(--ink)]">화면 구성</p>
                <div className="rounded-[14px] border border-[var(--line)] bg-[var(--th)] p-4">
                  <CornerBlock corner={sel.preview} />
                </div>
                <p className="mb-2 mt-5 text-[14px] font-bold text-[var(--ink)]">기본 노출 조건</p>
                <div className="rounded-[10px] bg-[var(--th)] px-4 py-3 text-[13px] leading-relaxed text-[var(--ink2)]">
                  <b className="text-[var(--ink3)]">WHEN</b> 코너 유형 = <b className="text-[var(--ac)]">{sel.cornerType}</b> · 껍데기(레이아웃·노출 타입)만 들어옵니다. 내용은 추가 후 <b>② 수급</b>에서 채웁니다.
                </div>
              </>
            ) : <p className="py-10 text-center text-[13px] text-[var(--ink4)]">왼쪽에서 코너를 선택하세요.</p>}
          </div>
          <div className="border-t border-[var(--line)] p-4">
            <button type="button" disabled={picked.size === 0} onClick={() => onAdd(corners.filter((c) => picked.has(c.id)))}
              className="h-[48px] w-full rounded-[10px] bg-[var(--ac)] text-[15px] font-bold text-white hover:bg-[var(--ac-h)] disabled:opacity-50">이 코너 추가{picked.size > 0 ? ` (${picked.size})` : ''}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────── 루트 ───────── */
export function ProcessBuilder({ data }: { data: ProcessData }) {
  const router = useRouter();
  const [basicOpen, setBasicOpen] = React.useState(true);
  const [activeId, setActiveId] = React.useState(data.activeTemplateId);
  // 아코디언 — 한 번에 하나의 템플릿만 펼침
  const [openId, setOpenId] = React.useState<string | null>(data.activeTemplateId);
  const [selCorner, setSelCorner] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(data.templates.map((t) => [t.id, t.corners[0]?.id ?? ''])));
  const [loadModal, setLoadModal] = React.useState<string | null>(null); // 코너 불러오기 모달(대상 템플릿 id)
  const [fbMode, setFbMode] = React.useState(false); // 미리보기 정상 ↔ 폴백(CVM 비었을 때)
  const [toastMsg, setToastMsg] = React.useState<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = React.useCallback((m: string) => {
    setToastMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastMsg(null), 2400);
  }, []);
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // 구성 검증 — 하단 결과 패널(order3-create 레퍼런스)
  const [validation, setValidation] = React.useState<{ issues: Issue[]; at: string } | null>(null);
  const [panelOpen, setPanelOpen] = React.useState(false);
  const runValidate = React.useCallback(() => {
    setValidation({ issues: validate({ ...data, templates }), at: new Date().toTimeString().slice(0, 5) });
    setPanelOpen(true);
  }, [data]);
  const gotoIssue = (tid?: string) => {
    if (tid) { setActiveId(tid); setOpenId(tid); }
    setPanelOpen(false);
  };
  const errCount = validation?.issues.filter((i) => i.level === '오류').length ?? 0;
  const warnCount = validation?.issues.filter((i) => i.level === '경고').length ?? 0;

  const activeTemplate = data.templates.find((t) => t.id === activeId) ?? data.templates[0];
  // 단일 템플릿 뷰 — 클릭해 들어온 그 템플릿 하나만 보여준다(2026-10-21)
  const templates = activeTemplate ? [activeTemplate] : [];
  const activeSel = activeTemplate ? selCorner[activeTemplate.id] : null;
  const totalCorners = activeTemplate?.corners.length ?? 0;

  // Figma BO 공통 textfield 토큰 — h38·r6·inset-x 14·본문 14·border #c4c9cf·포커스 border #b3b9c0+ring 2 #dce0e5
  const inputCls = 'h-[38px] w-full rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-[14px] text-[14px] text-[var(--ink)] placeholder:text-[var(--ink5)] focus:border-[var(--focus-border)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]';

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[16px] border border-[#e8eaf2] bg-white">
      <div className="flex-1 overflow-y-auto px-6 py-5 pb-24">
        {/* 뒤로가기 */}
        <Link href={`/admin/containers-test/c/${data.containerId}`} className="mb-2 inline-flex h-[32px] items-center gap-1 rounded-[8px] border border-[var(--line2)] bg-white px-3 text-[13px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]">
          <ChevronLeft className="h-4 w-4" /> 뒤로
        </Link>
        {/* 헤더 — 브레드크럼 + 타이틀 */}
        <nav className="flex flex-wrap items-center gap-1.5 text-[13px] leading-[18px] text-[var(--ink3)]">
          <span>홈</span><ChevronRight className="h-3.5 w-3.5 opacity-50" />
          <span>전시 관리</span><ChevronRight className="h-3.5 w-3.5 opacity-50" />
          <Link href="/admin/containers-test" className="hover:text-[var(--ink)] hover:underline">전시화면 관리 (테스트)</Link>
          <ChevronRight className="h-3.5 w-3.5 opacity-50" /><b className="font-semibold text-[var(--ink)]">{data.containerName}</b>
        </nav>
        <div className="mt-1.5 flex items-center gap-2">
          <h1 className="text-[20px] font-bold leading-[28px] tracking-[-0.3px] text-[var(--ink)]">{data.containerName}</h1>
          <span className="rounded-full border border-[var(--warnln)] bg-[var(--warnbg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--warn)]">테스트</span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[384px_minmax(0,1fr)]">
          {/* 좌: 미리보기(고정) */}
          <div className="xl:sticky xl:top-2 xl:self-start">
            <div className="rounded-[16px] border border-[var(--line)] bg-white p-4">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-[14px] font-bold text-[var(--ink)]">미리보기</h2>
                <span className="text-[12px] text-[var(--ink3)]">{activeTemplate?.name}{activeTemplate?.conditionGroup ? ` · ${activeTemplate.conditionGroup}` : ''}</span>
              </div>
              {/* 정상 ↔ 폴백(CVM 비었을 때) 토글 */}
              <div className="mb-3 inline-flex rounded-[8px] border border-[var(--line2)] bg-[var(--th)] p-0.5 text-[12px] font-semibold">
                <button type="button" onClick={() => setFbMode(false)} className={cn('rounded-[6px] px-3 py-1', !fbMode ? 'bg-white text-[var(--ac)] shadow-sm' : 'text-[var(--ink3)]')}>정상</button>
                <button type="button" onClick={() => setFbMode(true)} className={cn('rounded-[6px] px-3 py-1', fbMode ? 'bg-white text-[#b67a12] shadow-sm' : 'text-[var(--ink3)]')}>폴백</button>
              </div>
              {fbMode && <p className="mb-2 flex items-center gap-1 text-[11px] text-[#b67a12]"><Layers className="h-3 w-3" /> CVM이 비면 이렇게 노출됩니다 (CVM 수급 코너만 바뀜)</p>}
              <div className="py-2">
                <DeviceFrame width={360} bodyHeight="clamp(340px, calc(100dvh - 330px), 620px)" headerLabel={data.containerName} slim>
                  {activeTemplate && activeTemplate.corners.length > 0 ? (
                    activeTemplate.corners.map((c) => {
                      const hidden = fbMode && c.isCvm && c.fallback === '미노출';
                      const replaced = fbMode && c.isCvm && c.fallback === '운영자 편성으로 대체';
                      if (hidden) {
                        return (
                          <div key={c.id} onClick={() => setSelCorner((m) => ({ ...m, [activeTemplate.id]: c.id }))}
                            className={cn('cursor-pointer rounded-xl border border-dashed border-[#f2c47a] bg-[#fff8ef] px-3 py-4 text-center', c.id === activeSel && 'ring-2 ring-[var(--ac)] ring-offset-2')}>
                            <EyeOff className="mx-auto mb-1 h-4 w-4 text-[#b67a12]" />
                            <p className="text-[11px] font-semibold text-[#b67a12]">{c.name} · 미노출</p>
                            <p className="text-[10px] text-[#c99a4e]">CVM이 비어 노출되지 않아요</p>
                          </div>
                        );
                      }
                      return (
                        <div key={c.id} onClick={() => setSelCorner((m) => ({ ...m, [activeTemplate.id]: c.id }))}
                          className={cn('relative cursor-pointer rounded-xl ring-offset-2 transition', c.id === activeSel && 'ring-2 ring-[var(--ac)]')}>
                          {replaced && <span className="absolute right-1 top-1 z-10 rounded-[4px] bg-[#e59a2a] px-1.5 py-0.5 text-[9px] font-bold text-white">운영자 편성 대체</span>}
                          <CornerBlock corner={c.preview} />
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 text-[13px] text-slate-400">코너 구성 시 미리보기가 표시됩니다.</div>
                  )}
                </DeviceFrame>
              </div>
            </div>
          </div>

          {/* 우: 기본 정보 + 템플릿 구성 + 구성 검증 */}
          <div className="space-y-6">
            {/* 템플릿 기본 정보 */}
            <section className="overflow-hidden rounded-[16px] border border-[var(--line)] bg-white">
              <button type="button" onClick={() => setBasicOpen((v) => !v)} className="flex w-full items-center gap-2 bg-[var(--ac2)] px-5 py-4">
                <h2 className="text-[15px] font-bold text-[var(--ink)]">템플릿 기본 정보</h2>
                <span className="rounded-full border border-[var(--line2)] bg-white px-2 py-0.5 text-[11px] font-medium text-[var(--ink3)]">조회</span>
                <ChevronDown className={cn('ml-auto h-4 w-4 text-[var(--ink3)] transition', !basicOpen && '-rotate-90')} />
              </button>
              {basicOpen && activeTemplate && (
                <div className="border-t border-[var(--line)] px-6 py-5">
                  <div className="border-t border-[var(--line)]">
                  <FieldRow label="템플릿명" required>
                    <input defaultValue={activeTemplate.name} placeholder="예: 혜택 VIP" className={inputCls} />
                  </FieldRow>
                  <FieldRow label="메모">
                    <input defaultValue={activeTemplate.memo ?? ''} maxLength={30} placeholder="한글/영문/숫자/특수문자 30자 이내" className={inputCls} />
                  </FieldRow>
                  <FieldRow label="로그인 구분" required>
                    <div className="flex h-[38px] items-center gap-5 text-[14px] text-[var(--ink)]">
                      <label className="flex items-center gap-1.5"><input type="radio" name="tplLogin" defaultChecked={activeTemplate.conditionGroup !== '비로그인'} className="accent-[var(--ac)]" /> 로그인</label>
                      <label className="flex items-center gap-1.5"><input type="radio" name="tplLogin" defaultChecked={activeTemplate.conditionGroup === '비로그인'} className="accent-[var(--ac)]" /> 비로그인</label>
                    </div>
                  </FieldRow>
                  <FieldRow label="기본 템플릿 여부" required>
                    <div className="py-1">
                      <div className="flex items-center gap-5 text-[14px] text-[var(--ink)]">
                        <label className="flex items-center gap-1.5"><input type="radio" name="tplDefault" defaultChecked={!activeTemplate.isDefault} className="accent-[var(--ac)]" /> N</label>
                        <label className="flex items-center gap-1.5"><input type="radio" name="tplDefault" defaultChecked={activeTemplate.isDefault} className="accent-[var(--ac)]" /> Y</label>
                      </div>
                      <p className="mt-1.5 text-[12px] text-[var(--ink4)]">Y로 지정하면 기존 기본 템플릿은 해제됩니다.</p>
                    </div>
                  </FieldRow>
                  <FieldRow label="전시 여부" required>
                    <div className="flex h-[38px] items-center gap-5 text-[14px] text-[var(--ink)]">
                      <label className="flex items-center gap-1.5"><input type="radio" name="tplDisplay" defaultChecked={activeTemplate.displayOn} className="accent-[var(--ac)]" /> 전시</label>
                      <label className="flex items-center gap-1.5"><input type="radio" name="tplDisplay" defaultChecked={!activeTemplate.displayOn} className="accent-[var(--ac)]" /> 미전시</label>
                    </div>
                  </FieldRow>
                  <FieldRow label="전시 기간">
                    <div className="py-1">
                      <div className="flex items-center gap-2">
                        <input type="datetime-local" defaultValue={toLocalInput(activeTemplate.startAt)} disabled={activeTemplate.startAtOnApproval} className={cn(inputCls, 'flex-1', activeTemplate.startAtOnApproval && 'bg-[var(--th)] text-[var(--ink4)]')} />
                        <span className="text-[13px] text-[var(--ink4)]">~</span>
                        <input type="datetime-local" defaultValue={toLocalInput(activeTemplate.endAt)} className={cn(inputCls, 'flex-1')} />
                      </div>
                      <label className="mt-2 flex items-center gap-1.5 text-[12px] text-[var(--ink2)]">
                        <input type="checkbox" defaultChecked={activeTemplate.startAtOnApproval} className="accent-[var(--ac)]" /> 시작일을 승인일시로 설정
                      </label>
                    </div>
                  </FieldRow>
                  </div>
                </div>
              )}
            </section>

            {/* 템플릿 구성 — 클릭해 들어온 단일 템플릿만 (제목은 카드 헤더로) */}
            <section>
              <div className="space-y-3">
                {templates.map((t) => (
                  <TemplateCard
                    key={t.id}
                    t={t}
                    idx={0}
                    open
                    active
                    onToggle={() => {}}
                    onActivate={() => setActiveId(t.id)}
                    selCorner={selCorner[t.id] ?? null}
                    onSelCorner={(id) => setSelCorner((m) => ({ ...m, [t.id]: id }))}
                    onAddCorner={() => setLoadModal(t.id)}
                    onToast={toast}
                  />
                ))}
              </div>
            </section>

            {/* 구성 검증 */}
            <section className="rounded-[16px] border border-[var(--line)] bg-white px-5 py-4">
              <div className="flex items-center gap-2">
                <h2 className="text-[14px] font-bold text-[var(--ink)]">구성 검증</h2>
                {!validation ? (
                  <span className="rounded-full border border-[var(--line2)] bg-[var(--th)] px-2 py-0.5 text-[11px] font-medium text-[var(--ink3)]">미검증</span>
                ) : errCount > 0 ? (
                  <span className="rounded-full border border-[#ffd0d2] bg-[#fff0f1] px-2 py-0.5 text-[11px] font-semibold text-[var(--bad)]">오류 {errCount}건</span>
                ) : (
                  <span className="rounded-full border border-[#bfe7cf] bg-[#eefaf1] px-2 py-0.5 text-[11px] font-semibold text-[#00a058]">검증 통과</span>
                )}
                <button type="button" onClick={runValidate} className="ml-auto rounded-[6px] border border-[var(--line2)] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]">{validation ? '다시 검증' : '검증 실행'}</button>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink4)]">
                ‘전체 구성 검증’을 클릭하면 코너 간 조건 충돌 · 코너 상태 변경 영향 · 설정 항목을 확인합니다.
              </p>
            </section>
          </div>
        </div>
      </div>

      {/* 구성 검증 결과 — 하단 시트(order3-create 레퍼런스) */}
      {panelOpen && validation && (
        <div className="absolute inset-x-0 bottom-[60px] z-20 border-t border-[var(--line)] bg-white shadow-[0_-12px_24px_rgba(25,25,60,.08)]">
          <div className="mx-auto max-w-[1100px] px-8 py-4">
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-bold text-[var(--ink)]">구성 검증</h3>
              {errCount > 0 ? (
                <span className="rounded-full border border-[#ffd0d2] bg-[#fff0f1] px-2 py-0.5 text-[11px] font-semibold text-[var(--bad)]">오류 {errCount}건</span>
              ) : (
                <span className="rounded-full border border-[#bfe7cf] bg-[#eefaf1] px-2 py-0.5 text-[11px] font-semibold text-[#00a058]">통과</span>
              )}
              <span className="text-[12px] text-[var(--ink4)]">{validation.at} 검증</span>
              <button type="button" onClick={runValidate} className="ml-auto rounded-[6px] border border-[var(--line2)] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]">다시 검증</button>
              <button type="button" onClick={() => setPanelOpen(false)} className="rounded-[6px] p-1.5 text-[var(--ink3)] hover:bg-[var(--th)]"><X className="h-4 w-4" /></button>
            </div>

            {validation.issues.length === 0 ? (
              <div className="mt-3 rounded-[12px] border border-[#bfe7cf] bg-[#eefaf1] px-4 py-3 text-[13px] font-medium text-[#007a43]">검증 통과 — 오류 0건 / 경고 0건</div>
            ) : (
              <div className="mt-3 max-h-[220px] overflow-y-auto rounded-[12px] border border-[#ffd9db] bg-[#fff6f6] px-4 py-3">
                <p className="mb-2 text-[13px] font-bold text-[var(--bad)]">검증 {errCount > 0 ? '실패' : '완료'} — 오류 {errCount}건 / 경고 {warnCount}건</p>
                <ul className="space-y-1.5">
                  {validation.issues.map((it, i) => (
                    <li key={i} className="flex items-center gap-2 text-[13px]">
                      <span className={cn('shrink-0 rounded-[4px] px-1.5 py-0.5 text-[11px] font-semibold', it.level === '오류' ? 'bg-[#ffe0e1] text-[var(--bad)]' : 'bg-[#fff0d6] text-[#b67a12]')}>{it.level}</span>
                      <span className="min-w-0 flex-1 text-[var(--ink2)]"><b className="text-[var(--ink)]">[{it.area}]</b> {it.detail}</span>
                      {it.templateId && <button type="button" onClick={() => gotoIssue(it.templateId)} className="shrink-0 text-[12px] font-semibold text-[var(--ac)] hover:underline">바로가기</button>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 하단 고정 액션 바 — 흰색 · 상단 라운드16 · 위로 뜨는 그림자(order3-create) */}
      <div className="sticky bottom-0 z-30 flex items-center gap-3 rounded-t-[16px] bg-white px-6 py-3 shadow-[0_-6px_24px_rgba(41,52,89,0.1)]">
        <span className="text-[13px] text-[var(--ink3)]">{activeTemplate?.name} · 코너 <b className="text-[var(--ink)]">{totalCorners}</b>개</span>
        <button type="button" onClick={() => validation ? setPanelOpen((v) => !v) : runValidate()}
          className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-medium',
            !validation ? 'border-[var(--line2)] bg-[var(--th)] text-[var(--ink3)]' : errCount > 0 ? 'border-[#ffd0d2] bg-[#fff0f1] text-[var(--bad)]' : 'border-[#bfe7cf] bg-[#eefaf1] text-[#00a058]')}>
          <ShieldCheck className="h-3.5 w-3.5" /> 구성 검증 {!validation ? '미검증' : errCount > 0 ? `오류 ${errCount}건` : '통과'}
          {validation && <ChevronDown className={cn('h-3.5 w-3.5 transition', panelOpen && 'rotate-180')} />}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={() => toast('취소')} className="h-[38px] rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-4 text-[13px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]">취소</button>
          <button type="button" onClick={runValidate} className="h-[38px] rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-4 text-[13px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]">전체 구성 검증</button>
          <button type="button" onClick={() => toast('저장되었습니다. (데모)')} className="h-[38px] rounded-[var(--r-field)] bg-[var(--ac)] px-5 text-[13px] font-bold text-white hover:bg-[var(--ac-h)]"><Pencil className="mr-1 inline h-3.5 w-3.5" />저장</button>
        </div>
      </div>

      {loadModal && (
        <LoadCornerModal
          corners={data.libCorners}
          onClose={() => setLoadModal(null)}
          onAdd={async (cs) => {
            const tid = loadModal;
            setLoadModal(null);
            if (tid && cs.length) {
              await addCornersToTemplate(tid, cs.map((c) => c.id));
              router.refresh();
              toast(`코너 ${cs.length}개를 추가했습니다.`);
            }
          }}
        />
      )}

      {toastMsg && (
        <div className="pointer-events-none fixed bottom-20 left-1/2 z-[90] -translate-x-1/2">
          <div className="rounded-[8px] bg-[var(--toast-bg)] px-4 py-2.5 text-[13px] text-white shadow-[var(--dlg-shadow)]">{toastMsg}</div>
        </div>
      )}
    </div>
  );
}
