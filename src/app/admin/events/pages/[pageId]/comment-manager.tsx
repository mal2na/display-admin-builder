'use client';

import { useMemo, useState, useTransition } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, Pencil, Plus, RotateCcw, Search, Trash2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toggleCommentsExposure, saveCommentReplies } from '../../actions';

// 노출여부 변경 결과 — 서버 액션 toggleCommentsExposure의 반환 타입 (여기서 정의, actions.ts가 import)
export type CommentExposureResult = {
  toExposed: { id: string; content: string }[]; // 미노출 → 노출
  toHidden: { id: string; content: string }[]; // 노출 → 미노출
  failed: { id: string; content: string; reason: string }[]; // 전환 실패
};

// SB-EVT-050 댓글 관리 — 프로모션에 작성된 댓글 목록/검색/노출여부 변경/엑셀 다운로드.
export type CommentReplyRow = { id: string; content: string; author: string; exposed: boolean; createdAt: string };
export type CommentRow = {
  id: string;
  no: number; // 고유번호
  memberChannelId: string;
  content: string;
  likeCount: number;
  exposed: boolean; // 노출여부
  answered: boolean; // 답변여부
  replyContent: string | null;
  replyAuthor: string | null;
  replyCount: number;
  replyAt: string | null;
  createdAt: string;
  replies: CommentReplyRow[];
};

const PAGE_SIZE = 10;
type ExposeFilter = '전체' | '노출' | '미노출';
type AnswerFilter = '전체' | '답변완료' | '답글대기';
type DateField = '등록일' | '답글 등록일';
type SearchField = '전체' | '댓글내용' | '답글내용' | '멤버십 채널 ID';

const DEFAULTS = {
  expose: '전체' as ExposeFilter,
  answer: '전체' as AnswerFilter,
  dateField: '등록일' as DateField,
  from: '',
  to: '',
  searchField: '전체' as SearchField,
  keyword: '',
};

export function CommentManager({
  pageId, programId, promotionName, comments,
}: {
  pageId: string; programId: string; promotionName: string; comments: CommentRow[];
}) {
  // 입력 중인 필터(폼 상태) — '조회' 클릭 시 적용값으로 커밋
  const [f, setF] = useState(DEFAULTS);
  const [applied, setApplied] = useState(DEFAULTS);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<CommentExposureResult | null>(null);
  const [alertMsg, setAlertMsg] = useState<{ title: string; body: string } | null>(null);
  const [panel, setPanel] = useState<CommentRow | null>(null); // 답글 등록 사이드 패널 대상 댓글
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const a = applied;
    const from = a.from ? a.from : null;
    const to = a.to ? a.to : null;
    return comments.filter((c) => {
      if (a.expose !== '전체' && (a.expose === '노출') !== c.exposed) return false;
      if (a.answer !== '전체' && (a.answer === '답변완료') !== c.answered) return false;
      // 기간 (등록일 | 답글 등록일)
      if (from || to) {
        const raw = a.dateField === '등록일' ? c.createdAt : c.replyAt;
        const day = raw ? raw.slice(0, 10) : null;
        if (!day) return false;
        if (from && day < from) return false;
        if (to && day > to) return false;
      }
      // 검색
      if (a.keyword.trim()) {
        const kw = a.keyword.trim().toLowerCase();
        const inField = (field: SearchField) => {
          if (field === '댓글내용') return c.content.toLowerCase().includes(kw);
          if (field === '답글내용') return (c.replyContent ?? '').toLowerCase().includes(kw);
          if (field === '멤버십 채널 ID') return c.memberChannelId.toLowerCase().includes(kw);
          return (
            c.content.toLowerCase().includes(kw) ||
            (c.replyContent ?? '').toLowerCase().includes(kw) ||
            c.memberChannelId.toLowerCase().includes(kw)
          );
        };
        if (!inField(a.searchField)) return false;
      }
      return true;
    });
  }, [comments, applied]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);
  const pageIds = pageRows.map((r) => r.id);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  const apply = () => {
    // 기간 유효성 (2-6 조회) — 종료일이 시작일보다 빠르면 알림
    if (f.from && f.to && f.to < f.from) {
      setAlertMsg({ title: '기간 설정이 올바르지 않습니다.', body: '종료일이 시작일보다 빠를 수 없습니다.' });
      return;
    }
    setApplied(f);
    setPage(1);
    setSelected(new Set());
  };
  const reset = () => { setF(DEFAULTS); setApplied(DEFAULTS); setPage(1); setSelected(new Set()); };

  const toggleOne = (id: string) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected((prev) => {
    const n = new Set(prev);
    if (allChecked) pageIds.forEach((id) => n.delete(id));
    else pageIds.forEach((id) => n.add(id));
    return n;
  });

  const runExposureChange = () => {
    setConfirmOpen(false);
    const ids = [...selected];
    startTransition(async () => {
      const res = await toggleCommentsExposure(pageId, programId, ids);
      const changed = res.toExposed.length + res.toHidden.length;
      if (changed === 0) {
        setAlertMsg({ title: '노출여부 변경에 실패하였습니다.', body: '노출 여부 변경에 실패하여 상태가 변경되지 않았습니다.' });
        return;
      }
      setResult(res);
      setSelected(new Set());
    });
  };

  const downloadExcel = () => {
    // 현재 프로모션에 작성된 전체 댓글 데이터를 CSV(엑셀)로 — 적용된 검색/필터 반영
    const header = ['번호', '멤버십 채널 ID', '댓글내용', '좋아요 수', '등록일시', '답글내용', '답글 등록자', '총 답글 수', '답글 등록일시', '답변여부', '노출여부'];
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [header.map(esc).join(',')];
    for (const c of filtered) {
      lines.push([
        c.no, c.memberChannelId, c.content, c.likeCount, c.createdAt,
        c.replyContent ?? '', c.replyAuthor ?? '', c.replyCount, c.replyAt ?? '',
        c.answered ? '답변완료' : '답글대기', c.exposed ? '노출' : '미노출',
      ].map(esc).join(','));
    }
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${promotionName || '프로모션'}_댓글_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
      {/* ── 검색 영역 ── */}
      <div className="rounded-lg border bg-card">
        <div className="grid gap-x-4 gap-y-3 p-4 md:grid-cols-2 xl:grid-cols-4">
          <FilterCell label="노출여부">
            <Select value={f.expose} onChange={(e) => setF((s) => ({ ...s, expose: e.target.value as ExposeFilter }))} className="h-9 w-full">
              {(['전체', '노출', '미노출'] as ExposeFilter[]).map((o) => <option key={o} value={o}>{o}</option>)}
            </Select>
          </FilterCell>
          <FilterCell label="답변여부">
            <Select value={f.answer} onChange={(e) => setF((s) => ({ ...s, answer: e.target.value as AnswerFilter }))} className="h-9 w-full">
              {(['전체', '답변완료', '답글대기'] as AnswerFilter[]).map((o) => <option key={o} value={o}>{o}</option>)}
            </Select>
          </FilterCell>
          <FilterCell label="기간" className="xl:col-span-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Select value={f.dateField} onChange={(e) => setF((s) => ({ ...s, dateField: e.target.value as DateField }))} className="h-9 w-32 shrink-0">
                {(['등록일', '답글 등록일'] as DateField[]).map((o) => <option key={o} value={o}>{o}</option>)}
              </Select>
              <Input type="date" value={f.from} onChange={(e) => setF((s) => ({ ...s, from: e.target.value }))} className="h-9 w-40" />
              <span className="text-muted-foreground">~</span>
              <Input type="date" value={f.to} onChange={(e) => setF((s) => ({ ...s, to: e.target.value }))} className="h-9 w-40" />
            </div>
          </FilterCell>
          <FilterCell label="검색" className="xl:col-span-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <Select value={f.searchField} onChange={(e) => setF((s) => ({ ...s, searchField: e.target.value as SearchField }))} className="h-9 w-40 shrink-0">
                {(['전체', '댓글내용', '답글내용', '멤버십 채널 ID'] as SearchField[]).map((o) => <option key={o} value={o}>{o}</option>)}
              </Select>
              <Input value={f.keyword} onChange={(e) => setF((s) => ({ ...s, keyword: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && apply()}
                placeholder="내용을 입력하세요." className="h-9 min-w-[220px] flex-1" />
            </div>
          </FilterCell>
        </div>
        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <Button type="button" size="sm" variant="outline" onClick={reset}><RotateCcw className="h-3.5 w-3.5" /> 초기화</Button>
          <Button type="button" size="sm" variant="primary" onClick={apply}><Search className="h-3.5 w-3.5" /> 조회</Button>
        </div>
      </div>

      {/* ── 리스트 요약 ── */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-[13px] text-muted-foreground">전체 <b className="text-foreground">{filtered.length}</b>건 · 선택 <b className="text-foreground">{selected.size}</b>건</p>
      </div>

      {/* ── 댓글 리스트 ── */}
      <div className="mt-2 overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1100px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b bg-muted/40 text-[12px] text-muted-foreground">
              <Th className="w-10 text-center"><input type="checkbox" checked={allChecked} onChange={toggleAll} className="h-4 w-4 accent-primary align-middle" aria-label="현재 페이지 전체 선택" /></Th>
              <Th className="w-14 text-center">번호</Th>
              <Th className="w-32">멤버십 채널 ID</Th>
              <Th className="min-w-[180px]">댓글내용</Th>
              <Th className="w-16 text-center">좋아요</Th>
              <Th className="w-32">등록일시</Th>
              <Th className="min-w-[180px]">답글내용</Th>
              <Th className="w-28">답글 등록자</Th>
              <Th className="w-16 text-center">총 답글</Th>
              <Th className="w-32">답글 등록일시</Th>
              <Th className="w-24 whitespace-nowrap text-center">답변여부</Th>
              <Th className="w-24 whitespace-nowrap text-center">노출여부</Th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan={12} className="py-16 text-center text-muted-foreground">조회된 댓글이 없습니다.</td></tr>
            ) : pageRows.map((c) => (
              <tr key={c.id} className={cn('border-b last:border-0 hover:bg-muted/30', selected.has(c.id) && 'bg-primary/5')}>
                <Td className="text-center"><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleOne(c.id)} className="h-4 w-4 accent-primary align-middle" aria-label={`${c.no}번 선택`} /></Td>
                <Td className="text-center tabular-nums text-muted-foreground">{c.no}</Td>
                <Td className="font-mono text-[12px] text-muted-foreground">{c.memberChannelId}</Td>
                <Td className="text-foreground">{c.content}</Td>
                <Td className="text-center tabular-nums">{c.likeCount}</Td>
                <Td className="whitespace-nowrap text-[12px] text-muted-foreground">{c.createdAt}</Td>
                <Td>
                  {c.replyContent ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="line-clamp-1 text-foreground">{c.replyContent}</span>
                      <button type="button" onClick={() => setPanel(c)} title="답글 관리" className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-secondary"><Pencil className="h-3.5 w-3.5" /></button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => setPanel(c)} title="답글 작성" className="inline-flex items-center gap-1 rounded border border-dashed px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-secondary"><Pencil className="h-3 w-3" /> 답글</button>
                  )}
                </Td>
                <Td className="text-[12px] text-muted-foreground">{c.replyAuthor ?? '-'}</Td>
                <Td className="text-center tabular-nums">{c.replyCount}</Td>
                <Td className="whitespace-nowrap text-[12px] text-muted-foreground">{c.replyAt ?? '-'}</Td>
                <Td className="text-center">
                  <StatusPill on={c.answered} onLabel="답변완료" offLabel="답글대기" tone={c.answered ? 'green' : 'amber'} />
                </Td>
                <Td className="text-center">
                  <StatusPill on={c.exposed} onLabel="노출" offLabel="미노출" tone={c.exposed ? 'green' : 'rose'} />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── 하단: 엑셀 / 페이지네이션 / 노출여부 변경 ── */}
      <div className="mt-4 grid grid-cols-3 items-center gap-2">
        <div className="flex justify-start">
          <Button type="button" size="sm" variant="outline" onClick={downloadExcel} disabled={filtered.length === 0 || !!panel}>
            <Download className="h-3.5 w-3.5" /> 엑셀 다운로드
          </Button>
        </div>
        <div className="flex justify-center">
          <Pagination page={curPage} totalPages={totalPages} onPage={(p) => { setPage(p); }} />
        </div>
        <div className="flex justify-end">
          <Button type="button" size="sm" variant="primary" disabled={selected.size === 0 || pending}
            onClick={() => setConfirmOpen(true)}>
            {pending ? '변경 중…' : `노출여부 변경${selected.size ? ` (${selected.size})` : ''}`}
          </Button>
        </div>
      </div>

      {/* ── 확인 팝업 ── */}
      {confirmOpen && (
        <Modal onClose={() => setConfirmOpen(false)} width="max-w-sm">
          <h3 className="text-base font-bold">노출여부를 변경하시겠습니까?</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">변경 사항은 즉시 적용됩니다. (선택 {selected.size}건)</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setConfirmOpen(false)}>취소</Button>
            <Button type="button" size="sm" variant="primary" onClick={runExposureChange}>확인</Button>
          </div>
        </Modal>
      )}

      {/* ── 변경 내역 팝업 ── */}
      {result && (
        <Modal onClose={() => setResult(null)} width="max-w-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold">댓글 노출 변경 내역</h3>
            <button type="button" onClick={() => setResult(null)} className="rounded p-1 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
          </div>
          <div className="mt-3 rounded-md bg-indigo-50 px-3 py-2 text-[13px] text-indigo-700">
            ✅ 댓글 노출 여부 변경 — 노출 전환 {result.toExposed.length}건, 미노출 전환 {result.toHidden.length}건{result.failed.length ? `, 실패 ${result.failed.length}건` : ''}
          </div>
          <div className="mt-4 max-h-[52vh] space-y-5 overflow-y-auto">
            <ChangeTable title="노출 전환" rows={result.toExposed} before="미노출" after="노출" />
            <ChangeTable title="미노출 전환" rows={result.toHidden} before="노출" after="미노출" />
            {result.failed.length > 0 && <FailTable rows={result.failed} />}
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="button" size="sm" variant="primary" onClick={() => setResult(null)}>확인</Button>
          </div>
        </Modal>
      )}

      {/* ── 알림(실패/기간) 팝업 ── */}
      {alertMsg && (
        <Modal onClose={() => setAlertMsg(null)} width="max-w-sm">
          <h3 className="text-base font-bold">{alertMsg.title}</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">{alertMsg.body}</p>
          <div className="mt-4 flex justify-end">
            <Button type="button" size="sm" variant="primary" onClick={() => setAlertMsg(null)}>확인</Button>
          </div>
        </Modal>
      )}

      {/* ── 답글 등록 사이드 패널 ── */}
      {panel && <ReplyPanel key={panel.id} pageId={pageId} comment={panel} onClose={() => setPanel(null)} />}
    </div>
  );
}

// SB 댓글 상세 · 답글 등록 사이드 패널 — 좌: 댓글정보(읽기전용)+노출여부 / 답글정보(추가·삭제·노출여부) / 저장·취소.
function ReplyPanel({ pageId, comment, onClose }: { pageId: string; comment: CommentRow; onClose: () => void }) {
  type Draft = { rid: string; content: string; exposed: boolean; author?: string; createdAt?: string };
  let seq = 0;
  const init: Draft[] = comment.replies.length
    ? comment.replies.map((r) => ({ rid: `e${r.id}`, content: r.content, exposed: r.exposed, author: r.author, createdAt: r.createdAt }))
    : [{ rid: `n${seq++}`, content: '', exposed: true }];
  const [commentExposed, setCommentExposed] = useState(comment.exposed);
  const [replies, setReplies] = useState<Draft[]>(init);
  const [saving, setSaving] = useState(false);
  const up = (i: number, patch: Partial<Draft>) => setReplies((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const add = () => setReplies((rs) => [...rs, { rid: `n${Date.now()}${rs.length}`, content: '', exposed: true }]);
  const del = (i: number) => setReplies((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : [{ rid: `n${Date.now()}`, content: '', exposed: true }]));
  const save = async () => {
    setSaving(true);
    try {
      await saveCommentReplies(pageId, comment.id, commentExposed, replies.map((r) => ({ content: r.content, exposed: r.exposed })));
      onClose();
    } finally {
      setSaving(false);
    }
  };
  const RadioExposed = ({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
    <div className={cn('flex gap-3', disabled && 'opacity-50')}>
      {([['노출', true], ['미노출', false]] as const).map(([label, val]) => (
        <label key={label} className={cn('flex items-center gap-1 text-[12px]', disabled && 'cursor-not-allowed')}><input type="radio" checked={on === val} disabled={disabled} onChange={() => onChange(val)} className="accent-primary" /> {label}</label>
      ))}
    </div>
  );
  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-2 py-1.5 text-[12px]"><span className="text-muted-foreground">{label}</span><div className="min-w-0 font-medium text-foreground">{children}</div></div>
  );
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="flex h-full w-full max-w-md flex-col bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <h3 className="text-sm font-bold">답글 등록</h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* 댓글정보 (읽기전용 + 노출여부) */}
          <section>
            <p className="mb-1.5 text-[12px] font-semibold text-foreground">댓글정보</p>
            <div className="rounded-lg border bg-muted/20 px-3 py-1.5 divide-y">
              <Field label="번호"><span className="tabular-nums">{comment.no}</span></Field>
              <Field label="회원 ID"><span className="font-mono">{comment.memberChannelId}</span></Field>
              <Field label="등록일시"><span className="text-muted-foreground">{comment.createdAt}</span></Field>
              <Field label="좋아요 수"><span className="tabular-nums">{comment.likeCount}</span></Field>
              <Field label="노출여부"><RadioExposed on={commentExposed} onChange={setCommentExposed} /></Field>
              <Field label="댓글"><span className="whitespace-pre-wrap font-normal text-foreground">{comment.content}</span></Field>
            </div>
          </section>

          {/* 답글정보 (추가/삭제/노출여부) */}
          <section>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[12px] font-semibold text-foreground">답글정보 <span className="text-muted-foreground">· 총 {replies.filter((r) => r.content.trim()).length}건</span></p>
              <button type="button" onClick={add} className="inline-flex items-center gap-0.5 rounded-md border border-primary/40 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10"><Plus className="h-3 w-3" /> 답글 추가</button>
            </div>
            <div className="space-y-2.5">
              {replies.map((r, i) => (
                <div key={r.rid} className="rounded-lg border p-2.5">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground">답글 {i + 1}{r.author ? ` · ${r.author}` : ''}{r.createdAt ? ` · ${r.createdAt}` : ' · 신규'}</span>
                    <button type="button" onClick={() => del(i)} className="inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-secondary"><Trash2 className="h-3 w-3" /> 삭제</button>
                  </div>
                  <textarea value={r.content} onChange={(e) => up(i, { content: e.target.value })} rows={2} placeholder="답글 내용을 입력해주세요."
                    className="w-full rounded-md border px-2 py-1.5 text-[12px] outline-none focus:border-primary" />
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">노출여부</span>
                    {/* 댓글이 미노출이면 답글도 미노출로 고정(단독 노출 방지) */}
                    <RadioExposed on={commentExposed ? r.exposed : false} onChange={(v) => up(i, { exposed: v })} disabled={!commentExposed} />
                    {!commentExposed && <span className="text-[10px] text-rose-500">· 댓글 미노출 → 답글도 미노출</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
        <div className="flex items-center justify-end gap-2 border-t px-5 py-3.5">
          <Button type="button" size="sm" variant="outline" onClick={onClose} disabled={saving}>취소</Button>
          <Button type="button" size="sm" variant="primary" onClick={save} disabled={saving}>{saving ? '저장 중…' : '저장'}</Button>
        </div>
      </div>
    </div>
  );
}

function FilterCell({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('grid grid-cols-[80px_minmax(0,1fr)] items-center gap-2', className)}>
      <label className="text-[13px] font-semibold text-muted-foreground">{label}</label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Th({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <th className={cn('px-3 py-2.5 text-left font-semibold', className)}>{children}</th>;
}
function Td({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <td className={cn('px-3 py-2.5 align-middle', className)}>{children}</td>;
}

function StatusPill({ on, onLabel, offLabel, tone }: { on: boolean; onLabel: string; offLabel: string; tone: 'green' | 'amber' | 'rose' }) {
  const cls = tone === 'green' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : tone === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-rose-50 text-rose-600 border-rose-200';
  return <span className={cn('inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold', cls)}>{on ? onLabel : offLabel}</span>;
}

function ChangeTable({ title, rows, before, after }: { title: string; rows: { id: string; content: string }[]; before: string; after: string }) {
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-semibold">{title} <span className="text-muted-foreground">({rows.length})</span></p>
      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed px-3 py-3 text-center text-[12px] text-muted-foreground">해당 없음</p>
      ) : (
        <table className="w-full border-collapse overflow-hidden rounded-md border text-[12px]">
          <thead><tr className="border-b bg-muted/40 text-muted-foreground">
            <th className="w-16 px-3 py-2 text-left">번호</th><th className="px-3 py-2 text-left">댓글 내용</th>
            <th className="w-24 px-3 py-2 text-center">변경 전</th><th className="w-24 px-3 py-2 text-center">변경 후</th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                <td className="px-3 py-2 text-foreground">{r.content}</td>
                <td className="px-3 py-2 text-center"><ChgTag label={before} /></td>
                <td className="px-3 py-2 text-center"><ChgTag label={after} strong /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function FailTable({ rows }: { rows: { id: string; content: string; reason: string }[] }) {
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-semibold text-rose-600">실패 <span className="text-muted-foreground">({rows.length})</span></p>
      <table className="w-full border-collapse overflow-hidden rounded-md border text-[12px]">
        <thead><tr className="border-b bg-muted/40 text-muted-foreground">
          <th className="w-16 px-3 py-2 text-left">번호</th><th className="px-3 py-2 text-left">댓글 내용</th><th className="w-32 px-3 py-2 text-left">사유</th>
        </tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
              <td className="px-3 py-2 text-foreground">{r.content}</td>
              <td className="px-3 py-2 text-rose-600">{r.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChgTag({ label, strong }: { label: string; strong?: boolean }) {
  const on = label === '노출';
  return <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold',
    on ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600', strong && 'ring-1', strong && (on ? 'ring-emerald-300' : 'ring-rose-300'))}>{label}</span>;
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  const win = 5;
  const start = Math.max(1, Math.min(page - Math.floor(win / 2), totalPages - win + 1));
  const nums = Array.from({ length: Math.min(win, totalPages) }, (_, i) => start + i).filter((n) => n >= 1 && n <= totalPages);
  const btn = 'flex h-7 w-7 items-center justify-center rounded text-[12px] hover:bg-secondary disabled:opacity-30';
  return (
    <div className="flex items-center gap-0.5">
      <button type="button" className={btn} onClick={() => onPage(1)} disabled={page <= 1}><ChevronsLeft className="h-4 w-4" /></button>
      <button type="button" className={btn} onClick={() => onPage(page - 1)} disabled={page <= 1}><ChevronLeft className="h-4 w-4" /></button>
      {nums.map((n) => (
        <button key={n} type="button" onClick={() => onPage(n)}
          className={cn('flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-[12px] font-medium', n === page ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary')}>{n}</button>
      ))}
      <button type="button" className={btn} onClick={() => onPage(page + 1)} disabled={page >= totalPages}><ChevronRight className="h-4 w-4" /></button>
      <button type="button" className={btn} onClick={() => onPage(totalPages)} disabled={page >= totalPages}><ChevronsRight className="h-4 w-4" /></button>
    </div>
  );
}

function Modal({ width, onClose, children }: { width?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className={cn('w-full rounded-xl bg-card p-5 shadow-xl', width ?? 'max-w-md')} onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}
