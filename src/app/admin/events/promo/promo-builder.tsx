'use client';

/**
 * 프로모션 상세 영역 빌더 — FO 상세 영역을 블록(이미지·텍스트·버튼·구분선·여백)으로 구성(2026-10-20 사용자 요청).
 *  좌: 디바이스 FO 캔버스(블록 클릭 선택) · 우: 블록 추가 팔레트 + 선택 블록 편집 + 블록 목록(순서·삭제).
 *  상태는 PromoForm.detailBlocks 에 저장돼 FO 미리보기에 그대로 반영된다.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, Trash2, Image as ImageIcon, Type, MousePointerClick, Minus, MoveVertical } from 'lucide-react';
import { newDetailBlock, type PromoForm, type DetailBlock, type DetailBlockKind } from '@/lib/promotion/form';

const BTN = 'h-[38px] shrink-0 rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-5 text-[14px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]';
const BTN_PRI = 'h-[38px] shrink-0 rounded-[var(--r-field)] bg-[var(--ac)] px-6 text-[14px] font-semibold text-white hover:bg-[var(--ac-h)]';
const SEL = 'sel h-[34px] w-full rounded-[var(--r-field)] border border-[var(--line3)] bg-white pl-3 pr-8 text-[13px]';
const INP = 'inp h-[34px] w-full rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-3 text-[13px]';

const ALIGN_CLS: Record<string, string> = { 왼쪽: 'text-left', 가운데: 'text-center', 오른쪽: 'text-right' };
const JUSTIFY_CLS: Record<string, string> = { 왼쪽: 'justify-start', 가운데: 'justify-center', 오른쪽: 'justify-end' };
const SIZE_TXT: Record<string, string> = { 작게: 'text-[12px]', 보통: 'text-[14px]', 크게: 'text-[17px] font-bold' };
const SIZE_GAP: Record<string, number> = { 작게: 8, 보통: 16, 크게: 32 };

const PALETTE: { kind: DetailBlockKind; icon: React.ReactNode }[] = [
  { kind: '이미지', icon: <ImageIcon className="h-4 w-4" /> },
  { kind: '텍스트', icon: <Type className="h-4 w-4" /> },
  { kind: '버튼', icon: <MousePointerClick className="h-4 w-4" /> },
  { kind: '구분선', icon: <Minus className="h-4 w-4" /> },
  { kind: '여백', icon: <MoveVertical className="h-4 w-4" /> },
];

/** 상세 영역 블록 1개 렌더(FO) */
function BlockView({ b }: { b: DetailBlock }) {
  if (b.kind === '이미지') return <div className="grid h-[120px] place-items-center rounded-[8px] bg-[var(--th)] text-[var(--ink4)]"><ImageIcon className="h-6 w-6" /></div>;
  if (b.kind === '텍스트') return <p className={cn('whitespace-pre-line leading-[20px] text-[var(--ink)]', ALIGN_CLS[b.align], SIZE_TXT[b.size])}>{b.text || '내용을 입력하세요'}</p>;
  if (b.kind === '버튼') return <div className={cn('flex', JUSTIFY_CLS[b.align])}><span className="rounded-[8px] bg-[var(--ac)] px-4 py-2 text-[13px] font-semibold text-white">{b.text || '버튼'}</span></div>;
  if (b.kind === '구분선') return <hr className="border-t border-[var(--line2)]" />;
  return <div style={{ height: SIZE_GAP[b.size] }} />; // 여백
}

export function PromoBuilder({ f, onChange, onBack }: { f: PromoForm; onChange: (blocks: DetailBlock[]) => void; onBack: () => void }) {
  const blocks = f.detailBlocks;
  const [sel, setSel] = React.useState<number | null>(blocks[0]?.id ?? null);
  const selBlock = blocks.find((b) => b.id === sel) ?? null;

  const add = (kind: DetailBlockKind) => { const nb = newDetailBlock(kind); onChange(blocks.concat(nb)); setSel(nb.id); };
  const patch = (id: number, p: Partial<DetailBlock>) => onChange(blocks.map((b) => (b.id === id ? { ...b, ...p } : b)));
  const remove = (id: number) => { onChange(blocks.filter((b) => b.id !== id)); if (sel === id) setSel(null); };
  const move = (id: number, dir: -1 | 1) => {
    const i = blocks.findIndex((b) => b.id === id); const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = blocks.slice(); [next[i], next[j]] = [next[j], next[i]]; onChange(next);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[var(--line2)] px-12 py-3">
        <button type="button" onClick={onBack} className={BTN}>← 돌아가기</button>
        <div>
          <div className="text-[12px] text-[var(--ink4)]">홈 &gt; 프로모션 관리 &gt; 상세 영역 빌더</div>
          <h1 className="text-[18px] font-bold leading-tight">상세 영역 빌더</h1>
        </div>
        <button type="button" onClick={onBack} className={cn(BTN_PRI, 'ml-auto')}>완료</button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-auto px-12 py-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* 좌: 디바이스 FO 캔버스 */}
        <div className="flex justify-center">
          <div className="w-[360px] overflow-hidden rounded-[22px] border-[7px] border-[#1a1a1a] bg-white">
            <div className="space-y-2 p-3">
              <div className="grid h-[110px] place-items-center rounded-[8px] bg-[var(--th)] text-[var(--ink4)]"><ImageIcon className="h-6 w-6" /></div>
              <p className={cn('text-[15px] font-bold leading-[22px]', f.name ? 'text-[var(--ink)]' : 'text-[var(--ink4)]')}>{f.name || '프로모션 명이 노출됩니다'}</p>
              {f.sub && <p className="text-[13px] text-[var(--ink2)]">{f.sub}</p>}
              {/* 상세 영역 — 블록 */}
              <div className="rounded-[8px] border border-dashed border-[var(--line3)] p-2">
                <div className="mb-1.5 text-[11px] font-semibold text-[var(--ink4)]">상세 영역</div>
                {blocks.length === 0 ? (
                  <div className="grid h-[80px] place-items-center text-center text-[12px] leading-[16px] text-[var(--ink4)]">
                    오른쪽에서 블록을 추가하세요
                  </div>
                ) : (
                  <div className="space-y-2">
                    {blocks.map((b) => (
                      <button key={b.id} type="button" onClick={() => setSel(b.id)}
                        className={cn('block w-full rounded-[8px] border-2 p-1.5 text-left transition', sel === b.id ? 'border-[var(--ac)] bg-[var(--ac2)]' : 'border-transparent hover:border-[var(--line3)]')}>
                        <BlockView b={b} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 우: 팔레트 + 편집 + 목록 */}
        <div className="space-y-4">
          <section className="rounded-[10px] border border-[var(--line2)] bg-white p-3">
            <div className="mb-2 text-[13px] font-bold">블록 추가</div>
            <div className="grid grid-cols-5 gap-1.5">
              {PALETTE.map((p) => (
                <button key={p.kind} type="button" onClick={() => add(p.kind)}
                  className="flex flex-col items-center gap-1 rounded-[8px] border border-[var(--line2)] py-2 text-[11px] text-[var(--ink2)] hover:border-[var(--ac)] hover:bg-[var(--ac2)]">
                  {p.icon}{p.kind}
                </button>
              ))}
            </div>
          </section>

          {selBlock && (
            <section className="rounded-[10px] border border-[var(--line2)] bg-white p-3">
              <div className="mb-2 flex items-center gap-2">
                <div className="text-[13px] font-bold">{selBlock.kind} 편집</div>
                <button type="button" onClick={() => remove(selBlock.id)} className="ml-auto inline-flex items-center gap-1 text-[12px] text-[var(--ink4)] hover:text-[var(--bad)]"><Trash2 className="h-3.5 w-3.5" /> 삭제</button>
              </div>
              <div className="space-y-2.5">
                {(selBlock.kind === '텍스트' || selBlock.kind === '버튼') && (
                  <label className="block">
                    <span className="mb-1 block text-[12px] text-[var(--ink3)]">{selBlock.kind === '버튼' ? '버튼 명' : '내용'}</span>
                    {selBlock.kind === '텍스트'
                      ? <textarea value={selBlock.text} onChange={(e) => patch(selBlock.id, { text: e.target.value })} rows={2} className={cn(INP, 'h-auto resize-none py-1.5 leading-[18px]')} />
                      : <input value={selBlock.text} onChange={(e) => patch(selBlock.id, { text: e.target.value })} className={INP} placeholder="버튼 명" />}
                  </label>
                )}
                {selBlock.kind === '버튼' && (
                  <label className="block">
                    <span className="mb-1 block text-[12px] text-[var(--ink3)]">연결 URL</span>
                    <input value={selBlock.url} onChange={(e) => patch(selBlock.id, { url: e.target.value })} className={INP} placeholder="https:// 또는 tworld://…" />
                  </label>
                )}
                {(selBlock.kind === '텍스트' || selBlock.kind === '버튼') && (
                  <label className="block">
                    <span className="mb-1 block text-[12px] text-[var(--ink3)]">정렬</span>
                    <select value={selBlock.align} onChange={(e) => patch(selBlock.id, { align: e.target.value as DetailBlock['align'] })} className={SEL}>
                      {['왼쪽', '가운데', '오른쪽'].map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </label>
                )}
                {(selBlock.kind === '텍스트' || selBlock.kind === '여백') && (
                  <label className="block">
                    <span className="mb-1 block text-[12px] text-[var(--ink3)]">{selBlock.kind === '여백' ? '높이' : '글자 크기'}</span>
                    <select value={selBlock.size} onChange={(e) => patch(selBlock.id, { size: e.target.value as DetailBlock['size'] })} className={SEL}>
                      {['작게', '보통', '크게'].map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </label>
                )}
                {selBlock.kind === '이미지' && <p className="text-[12px] text-[var(--ink4)]">이미지 업로드는 다음 단계에서 지원해요. 지금은 자리만 잡아요.</p>}
                {selBlock.kind === '구분선' && <p className="text-[12px] text-[var(--ink4)]">상세 영역을 나누는 가로선이에요.</p>}
              </div>
            </section>
          )}

          <section className="rounded-[10px] border border-[var(--line2)] bg-white p-3">
            <div className="mb-2 text-[13px] font-bold">블록 목록 <span className="text-[var(--ink4)]">{blocks.length}</span></div>
            {blocks.length === 0 ? (
              <p className="py-3 text-center text-[12px] text-[var(--ink4)]">블록이 없어요. 위에서 추가하세요.</p>
            ) : (
              <ul className="space-y-1.5">
                {blocks.map((b, i) => (
                  <li key={b.id} className={cn('flex items-center gap-2 rounded-[8px] border px-2.5 py-1.5 text-[13px]', sel === b.id ? 'border-[var(--ac)] bg-[var(--ac2)]' : 'border-[var(--line2)]')}>
                    <button type="button" onClick={() => setSel(b.id)} className="min-w-0 flex-1 truncate text-left">
                      <b className="font-semibold">{b.kind}</b>
                      {(b.kind === '텍스트' || b.kind === '버튼') && b.text && <span className="ml-1.5 text-[var(--ink3)]">{b.text}</span>}
                    </button>
                    <button type="button" onClick={() => move(b.id, -1)} disabled={i === 0} className="text-[var(--ink4)] disabled:opacity-30 hover:text-[var(--ink)]"><ChevronUp className="h-4 w-4" /></button>
                    <button type="button" onClick={() => move(b.id, 1)} disabled={i === blocks.length - 1} className="text-[var(--ink4)] disabled:opacity-30 hover:text-[var(--ink)]"><ChevronDown className="h-4 w-4" /></button>
                    <button type="button" onClick={() => remove(b.id)} className="text-[var(--ink4)] hover:text-[var(--bad)]"><Trash2 className="h-3.5 w-3.5" /></button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
