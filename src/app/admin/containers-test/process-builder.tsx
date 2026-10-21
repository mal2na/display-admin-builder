'use client';

/**
 * 전시화면 관리 (테스트) — 주문 프로세스 등록(order3-create) 레이아웃을 전시 데이터로 이식.
 *  좌: 미리보기(디바이스, 고정) · 우: 기본 정보(폼) + 템플릿 구성(카드>코너 2단) + 구성 검증 · 하단 고정 액션 바.
 *  실제 혜택 홈 등 Container·Template·Corner 를 채운다. 배치·노출 테스트용(코너 추가/저장은 데모).
 *  레퍼런스: https://nc-channel.vercel.app/order3-create.html (2026-10-20 사용자 요청).
 */
import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { DeviceFrame, CornerBlock } from '@/components/preview/blocks';
import { cornerTypeChipClass, layoutLabel, ZONE_META, ZONE_RANK, REC_SOURCE_METHODS, REC_SOURCE_INFO, type Zone } from '@/lib/display-taxonomy';
import { ChevronLeft, ChevronRight, ChevronDown, GripVertical, X, Plus, Copy, Pencil, ShieldCheck, Layers, EyeOff, Lock, Trash2, Sparkles, UserCog, Search, Link2, Check, ImageIcon } from 'lucide-react';
import type { ProcessData, PTemplate, PCorner, LibCorner } from './process-data';

const EXPOSE_OPTS = ['항상 노출', '조건 노출', '로그인 시 노출', '비로그인 시 노출', '미노출'];
const TYPE_OPTS = ['메인화면', '메뉴', '기획전', '혜택 영역'];

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
  const items = options.length ? options : ['대표 아이템 1', '대표 아이템 2', '대표 아이템 3'];
  const isCvmSrc = src.startsWith('CVM');
  const isData = src === 'CVM 데이터 연동';

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-start gap-3 py-1.5 text-[13px]">
      <span className="w-[76px] shrink-0 text-[var(--ink3)]">{label}</span>
      <span className="min-w-0 flex-1 text-[var(--ink)]">{children}</span>
    </div>
  );
  const Sec = ({ n, title, help, children }: { n: number; title: string; help?: boolean; children: React.ReactNode }) => (
    <div className="rounded-[12px] border border-[var(--line)] bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--ac)] text-[11px] font-bold text-white">{n}</span>
        <h4 className="text-[14px] font-bold text-[var(--ink)]">{title}</h4>
        {help && <span className="ml-auto grid h-4 w-4 place-items-center rounded-full border border-[var(--line2)] text-[10px] text-[var(--ink4)]">?</span>}
      </div>
      {children}
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
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <h4 className="min-w-0 flex-1 truncate text-[15px] font-bold text-[var(--ink)]">{corner.name}</h4>
        <button type="button" onClick={() => onToast('코너 삭제는 실제 빌더에서 처리됩니다.')} className="rounded-[6px] border border-[var(--line2)] px-2.5 py-1 text-[12px] font-medium text-[var(--ink3)] hover:border-[var(--bad)] hover:text-[var(--bad)]">코너 삭제</button>
      </div>

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
                <div key={o} className="flex items-center gap-1.5 rounded-[8px] border border-[var(--line2)] bg-white px-2 py-1.5">
                  <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-[var(--ink4)]" />
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[6px] border border-[var(--line2)] bg-[var(--th)] text-[var(--ink4)]"><ImageIcon className="h-3.5 w-3.5" /></span>
                  <input defaultValue={o} className="h-[30px] min-w-0 flex-1 rounded-[6px] border border-[var(--line2)] px-2 text-[13px] focus:border-[var(--ac)] focus:outline-none" />
                  <button type="button" onClick={() => onToast('이동 링크 설정 (데모)')} className="grid h-7 w-7 shrink-0 place-items-center rounded-[6px] border border-[var(--line2)] text-[var(--ink3)] hover:bg-[var(--th)]"><Link2 className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => onToast('불러오기 (데모)')} className="shrink-0 rounded-[6px] border border-[var(--line2)] px-2 py-1 text-[12px] font-medium text-[var(--ink2)] hover:bg-[var(--th)]">불러오기</button>
                  <button type="button" onClick={() => onToast('항목 삭제 (데모)')} className="grid h-6 w-6 shrink-0 place-items-center text-[var(--ink4)] hover:text-[var(--bad)]"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => onToast('메뉴 추가 (데모)')} className="mt-2 flex w-full items-center justify-center gap-1 rounded-[8px] border border-dashed border-[var(--line3)] bg-white py-2 text-[12px] font-semibold text-[var(--ink2)] hover:border-[var(--ac)] hover:text-[var(--ac)]"><Plus className="h-3.5 w-3.5" /> 메뉴 추가</button>
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
              <div key={o} className="rounded-[8px] border border-[var(--line2)] bg-white p-2.5">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-[var(--ink4)]" />
                  <span className="w-4 shrink-0 text-center text-[12px] text-[var(--ink3)]">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--ink)]">{o}</span>
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
function CornerChip({ c, selected, onSelect, onToast }: { c: PCorner; selected: boolean; onSelect: () => void; onToast: (m: string) => void }) {
  return (
    <div onClick={onSelect} className={cn('cursor-pointer rounded-[10px] border bg-white px-2.5 py-2 transition', selected ? 'border-[var(--ac)] ring-1 ring-[var(--ac)]' : 'border-[var(--line2)] hover:border-[var(--line3)]')}>
      <div className="flex items-center gap-1.5">
        <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-[var(--ink4)]" />
        <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-[var(--ink)]">{c.name}</span>
        <button type="button" onClick={(e) => { e.stopPropagation(); onToast('복제는 실제 빌더에서 처리됩니다.'); }} className="text-[var(--ink4)] hover:text-[var(--ink2)]"><Copy className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onToast('코너 삭제는 실제 빌더에서 처리됩니다.'); }} className="text-[var(--ink4)] hover:text-[var(--bad)]"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      <div className="mt-1.5 flex items-center gap-1.5">
        <span className={cornerTypeChipClass(c.cornerType)}>{c.cornerType}</span>
        {c.layout && <span className="text-[11px] text-[var(--ink4)]">{layoutLabel(c.layout) || c.layout}</span>}
        <span className="ml-auto flex items-center gap-1 text-[11px] text-[var(--ink3)]"><Lock className="h-3 w-3" /> 고정</span>
        <span className="relative h-[18px] w-[32px] shrink-0 rounded-full bg-[var(--ac)]"><span className="absolute right-0.5 top-0.5 h-[14px] w-[14px] rounded-full bg-white" /></span>
      </div>
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
  const bands = BAND_ORDER.map((z) => ({ z, items: t.corners.filter((c) => c.zone === z) })).filter((b) => b.items.length > 0);
  return (
    <div className={cn('rounded-[12px] border bg-white', active ? 'border-[var(--ac)]' : 'border-[var(--line2)]')}>
      {/* 카드 헤더 */}
      <div className={cn('flex items-center gap-2.5 rounded-t-[11px] px-4 py-3', active ? 'bg-[var(--ac2)]' : 'bg-[var(--th)]')}>
        <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-[var(--ink4)]" />
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[6px] bg-[var(--ac)] text-[12px] font-bold text-white">{idx + 1}</span>
        <button type="button" onClick={onActivate} className="min-w-0 flex-1 text-left">
          <span className="text-[14px] font-bold text-[var(--ink)]">{t.name}</span>
          {t.conditionGroup && <span className="ml-1.5 text-[12px] text-[var(--ink4)]">· {t.conditionGroup}</span>}
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
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
                {/* 코너 리스트 — 존(Fixed/Dynamic/Semi) 밴드. 우측이 길어도 선택 가능하게 sticky 고정 */}
                <div className="space-y-2.5 lg:sticky lg:top-4 lg:self-start">
                  <div className="space-y-2.5 overflow-y-auto pr-0.5 lg:max-h-[calc(100vh-180px)]">
                    {bands.map(({ z, items }) => {
                      const m = ZONE_META[z];
                      return (
                        <div key={z} className="rounded-[10px] border border-[var(--line)] p-2" style={{ borderLeft: `3px solid ${m.hex}` }}>
                          <div className="mb-1.5 flex items-center gap-1.5 px-0.5">
                            <span className="h-2 w-2 rounded-full" style={{ background: m.hex }} />
                            <b className="text-[12px]" style={{ color: m.hex }}>{m.label}</b>
                            <span className="text-[11px] text-[var(--ink4)]">{m.en}</span>
                            <span className="ml-auto text-[11px] font-semibold text-[var(--ink4)]">{items.length}</span>
                          </div>
                          <div className="space-y-1.5">
                            {items.map((c) => (
                              <CornerChip key={c.id} c={c} selected={c.id === selCorner} onSelect={() => { onActivate(); onSelCorner(c.id); }} onToast={onToast} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button type="button" onClick={onAddCorner}
                    className="flex w-full items-center justify-center gap-1 rounded-[10px] border border-dashed border-[var(--line3)] bg-white py-2.5 text-[13px] font-semibold text-[var(--ink2)] hover:border-[var(--ac)] hover:text-[var(--ac)]">
                    <Copy className="h-4 w-4" /> 코너 불러오기
                  </button>
                </div>
                {/* 코너 상세 */}
                <CornerDetail template={t} corner={selected} index={selIndex} onToast={onToast} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────── 코너 불러오기 모달(실제 빌더 '코너 불러오기' 이식) ───────── */
function LoadCornerModal({ corners, onClose, onAdd }: { corners: LibCorner[]; onClose: () => void; onAdd: (c: LibCorner) => void }) {
  const [q, setQ] = React.useState('');
  const list = corners.filter((c) => !q || c.name.includes(q) || c.cornerType.includes(q));
  const [sel, setSel] = React.useState<LibCorner | null>(corners[0] ?? null);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[80vh] w-full max-w-[860px] overflow-hidden rounded-[16px] bg-white shadow-[var(--dlg-shadow)]" onClick={(e) => e.stopPropagation()}>
        {/* 좌: 코너 목록 */}
        <div className="flex w-[320px] shrink-0 flex-col border-r border-[var(--line)]">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
            <h3 className="text-[16px] font-bold text-[var(--ink)]">코너 불러오기</h3>
          </div>
          <div className="border-b border-[var(--line)] p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink4)]" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="코너명·유형 검색" className="h-[38px] w-full rounded-[var(--r-field)] border border-[var(--line3)] bg-white pl-9 pr-3 text-[13px] focus:border-[var(--ac)] focus:outline-none" />
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
            {list.length === 0 ? <p className="py-8 text-center text-[13px] text-[var(--ink4)]">검색 결과가 없습니다.</p> : list.map((c) => (
              <button key={c.id} type="button" onClick={() => setSel(c)}
                className={cn('flex w-full flex-col items-start gap-0.5 rounded-[8px] px-3 py-2 text-left', sel?.id === c.id ? 'bg-[var(--ac2)]' : 'hover:bg-[var(--th)]')}>
                <span className="text-[13px] font-semibold text-[var(--ink)]">{c.name}</span>
                <span className="text-[11px] text-[var(--ink4)]">{c.cornerType}{c.layout ? ` · ${layoutLabel(c.layout) || c.layout}` : ''}</span>
              </button>
            ))}
          </div>
        </div>
        {/* 우: 선택 코너 정보 + 추가 */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
            <span className="truncate text-[14px] font-bold text-[var(--ink)]">{sel?.name ?? '코너를 선택하세요'}</span>
            <button type="button" onClick={onClose} className="rounded-[6px] p-1 text-[var(--ink3)] hover:bg-[var(--th)]"><X className="h-4 w-4" /></button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {sel ? (
              <div className="space-y-3">
                <div className="rounded-[12px] border border-[var(--line)] p-4">
                  <p className="mb-2 text-[13px] font-bold text-[var(--ink)]">코너 정보</p>
                  <div className="flex items-center gap-3 py-1 text-[13px]"><span className="w-[72px] text-[var(--ink3)]">코너 유형</span><span className={cornerTypeChipClass(sel.cornerType)}>{sel.cornerType}</span></div>
                  <div className="flex items-center gap-3 py-1 text-[13px]"><span className="w-[72px] text-[var(--ink3)]">레이아웃</span><span>{layoutLabel(sel.layout) || sel.layout || '—'}</span></div>
                  <div className="flex items-center gap-3 py-1 text-[13px]"><span className="w-[72px] text-[var(--ink3)]">코너 ID</span><span className="text-[12px] text-[var(--ink3)]">{sel.id}</span></div>
                </div>
                <p className="rounded-[10px] bg-[var(--th)] px-3 py-3 text-[12px] leading-relaxed text-[var(--ink4)]">
                  껍데기(레이아웃·노출 타입)만 들어옵니다. 내용은 코너를 열어 ‘② 수급’에서 채웁니다.
                </p>
              </div>
            ) : <p className="py-10 text-center text-[13px] text-[var(--ink4)]">왼쪽에서 코너를 선택하세요.</p>}
          </div>
          <div className="border-t border-[var(--line)] p-4">
            <button type="button" disabled={!sel} onClick={() => sel && onAdd(sel)}
              className="h-[42px] w-full rounded-[var(--r-field)] bg-[var(--ac)] text-[14px] font-bold text-white hover:bg-[var(--ac-h)] disabled:opacity-50">이 코너로 추가</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────── 루트 ───────── */
export function ProcessBuilder({ data }: { data: ProcessData }) {
  const [basicOpen, setBasicOpen] = React.useState(true);
  const [activeId, setActiveId] = React.useState(data.activeTemplateId);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(data.templates.map((t) => [t.id, t.id === data.activeTemplateId])));
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
    setValidation({ issues: validate(data), at: new Date().toTimeString().slice(0, 5) });
    setPanelOpen(true);
  }, [data]);
  const gotoIssue = (tid?: string) => {
    if (tid) { setActiveId(tid); setExpanded((m) => ({ ...m, [tid]: true })); }
    setPanelOpen(false);
  };
  const errCount = validation?.issues.filter((i) => i.level === '오류').length ?? 0;
  const warnCount = validation?.issues.filter((i) => i.level === '경고').length ?? 0;

  const activeTemplate = data.templates.find((t) => t.id === activeId) ?? data.templates[0];
  const activeIdx = data.templates.findIndex((t) => t.id === activeTemplate?.id);
  const activeSel = activeTemplate ? selCorner[activeTemplate.id] : null;
  const totalCorners = data.templates.reduce((n, t) => n + t.corners.length, 0);

  const Field = ({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) => (
    <div className="flex items-center gap-3 py-2">
      <span className="flex w-[88px] shrink-0 items-center gap-1 text-[13px] text-[var(--ink3)]">{label}{required && <span className="text-[var(--bad)]">*</span>}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
  const inputCls = 'h-[38px] w-full rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-3 text-[13px] text-[var(--ink)] placeholder:text-[var(--ink4)] focus:border-[var(--ac)] focus:outline-none';

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
                <span className="text-[12px] text-[var(--ink3)]">{activeIdx + 1}/{data.templates.length} · {activeTemplate?.name}</span>
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
            {/* 기본 정보 */}
            <section className="rounded-[16px] border border-[var(--line)] bg-white">
              <div className="flex items-center gap-2 px-5 py-4">
                <h2 className="text-[15px] font-bold text-[var(--ink)]">기본 정보</h2>
                <span className="rounded-full border border-[var(--line2)] bg-[var(--th)] px-2 py-0.5 text-[11px] font-medium text-[var(--ink3)]">조회</span>
                <button type="button" onClick={() => setBasicOpen((v) => !v)} className="ml-auto rounded-[6px] p-1 text-[var(--ink3)] hover:bg-[var(--th)]">
                  <ChevronDown className={cn('h-4 w-4 transition', !basicOpen && '-rotate-90')} />
                </button>
              </div>
              {basicOpen && (
                <div className="border-t border-[var(--line)] px-5 py-3">
                  <Field label="유형" required>
                    <div className="relative">
                      <select defaultValue={data.containerType} className={cn(inputCls, 'appearance-none pr-9')}>
                        {TYPE_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink4)]" />
                    </div>
                  </Field>
                  <Field label="플랫폼">
                    <div className="flex h-[38px] items-center rounded-[var(--r-field)] border border-[var(--line)] bg-[var(--th)] px-3 text-[13px] text-[var(--ink2)]">{data.platform}</div>
                  </Field>
                  <Field label="컨테이너 ID">
                    <div className="flex h-[38px] items-center rounded-[var(--r-field)] border border-[var(--line)] bg-[var(--th)] px-3 text-[13px] text-[var(--ink3)]">{data.containerId.slice(-10)}</div>
                  </Field>
                  <Field label="컨테이너명" required>
                    <input defaultValue={data.containerName} className={inputCls} />
                  </Field>
                  <Field label="설명">
                    <input defaultValue={data.description ?? ''} placeholder="어떤 화면 구성인지 입력하세요." className={inputCls} />
                  </Field>
                  <Field label="전시 여부">
                    <div className="flex items-center gap-5 text-[13px] text-[var(--ink)]">
                      <label className="flex items-center gap-1.5"><input type="radio" name="displayOn" defaultChecked={data.status === 'active'} className="accent-[var(--ac)]" /> Y</label>
                      <label className="flex items-center gap-1.5"><input type="radio" name="displayOn" defaultChecked={data.status !== 'active'} className="accent-[var(--ac)]" /> N</label>
                    </div>
                  </Field>
                </div>
              )}
            </section>

            {/* 템플릿 구성 */}
            <section>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-[15px] font-bold text-[var(--ink)]">템플릿 구성</h2>
                <span className="text-[13px] text-[var(--ink3)]">총 {data.templates.length}개</span>
                <div className="ml-auto flex gap-1.5">
                  <button type="button" onClick={() => setExpanded({})} className="inline-flex items-center gap-1 rounded-[6px] border border-[var(--line2)] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]">모두 접기</button>
                  <button type="button" onClick={() => toast('복제는 실제 빌더에서 처리됩니다.')} className="inline-flex items-center gap-1 rounded-[6px] border border-[var(--line2)] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]"><Copy className="h-3.5 w-3.5" /> 복제하기</button>
                </div>
              </div>

              <div className="space-y-3">
                {data.templates.map((t, i) => (
                  <TemplateCard
                    key={t.id}
                    t={t}
                    idx={i}
                    open={expanded[t.id] ?? false}
                    active={t.id === activeId}
                    onToggle={() => setExpanded((m) => ({ ...m, [t.id]: !(m[t.id] ?? false) }))}
                    onActivate={() => { setActiveId(t.id); setExpanded((m) => ({ ...m, [t.id]: true })); }}
                    selCorner={selCorner[t.id] ?? null}
                    onSelCorner={(id) => setSelCorner((m) => ({ ...m, [t.id]: id }))}
                    onAddCorner={() => setLoadModal(t.id)}
                    onToast={toast}
                  />
                ))}
              </div>

              <button type="button" onClick={() => toast('템플릿 추가는 실제 빌더에서 처리됩니다.')}
                className="mt-3 flex w-full items-center justify-center gap-1 rounded-[12px] border border-dashed border-[var(--line3)] bg-white py-3 text-[13px] font-semibold text-[var(--ink2)] hover:border-[var(--ac)] hover:text-[var(--ac)]">
                <Plus className="h-4 w-4" /> 템플릿 추가
              </button>
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
        <span className="text-[13px] text-[var(--ink3)]">템플릿 <b className="text-[var(--ink)]">{data.templates.length}</b>개 · 코너 <b className="text-[var(--ink)]">{totalCorners}</b>개</span>
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
          onAdd={(c) => { setLoadModal(null); toast(`'${c.name}' 코너를 담았습니다. (데모 — 저장 시 반영)`); }}
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
