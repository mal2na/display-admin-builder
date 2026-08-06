'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export type HistoryRow = {
  id: string;
  version: number;
  approvalId: string;
  target: string;
  actor: string;
  status: string;
  result: string;
  approver: string | null;
  requestedAt: string;
  processedAt: string;
  before: string | null;
  after: string | null;
  beforeJson: string | null;
  afterJson: string | null;
  reason: string | null;
};

// 변경 항목 필드 라벨 — JSON 키를 사람이 읽을 수 있게
const FIELD_LABEL: Record<string, string> = {
  approvalStatus: '승인 상태',
  status: '전시 상태',
  displayStatus: '전시 상태',
  name: '이름',
  from: '원본',
  corners: '코너 수',
  defaultTemplateId: '기본 템플릿',
  previewUrl: '미리보기 URL',
  visibility: '공개 범위',
  device: '디바이스',
};
const VALUE_LABEL: Record<string, string> = {
  DRAFT: '초안 작성중', REVIEW: '검수 대기', APPROVED: '승인 완료', REJECTED: '수정 필요',
  active: '전시', inactive: '미전시',
};
const fmtVal = (v: unknown) => {
  if (v == null || v === '') return '—';
  if (typeof v === 'boolean') return v ? '사용' : '미사용';
  const s = String(v);
  return VALUE_LABEL[s] ?? s;
};

type DiffItem = { key: string; label: string; before: unknown; after: unknown };
function computeDiff(beforeJson: string | null, afterJson: string | null): DiffItem[] | null {
  const parse = (j: string | null) => {
    if (!j) return null;
    try { const o = JSON.parse(j); return o && typeof o === 'object' && !Array.isArray(o) ? (o as Record<string, unknown>) : null; }
    catch { return null; }
  };
  const b = parse(beforeJson);
  const a = parse(afterJson);
  if (!b && !a) return null;
  const keys = Array.from(new Set([...Object.keys(b ?? {}), ...Object.keys(a ?? {})]));
  const items = keys
    .map((k) => ({ key: k, label: FIELD_LABEL[k] ?? k, before: b?.[k], after: a?.[k] }))
    .filter((it) => JSON.stringify(it.before ?? null) !== JSON.stringify(it.after ?? null));
  return items;
}

const RESULT_COLOR: Record<string, string> = {
  CREATED: 'bg-emerald-100 text-emerald-700',
  UPDATED: 'bg-sky-100 text-sky-700',
  DELETED: 'bg-rose-100 text-rose-700',
  REVIEW_REQUESTED: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
  SCHEDULED: 'bg-sky-100 text-sky-700',
  PUBLISHED: 'bg-indigo-100 text-indigo-700',
  SUSPENDED: 'bg-orange-100 text-orange-800',
  ROLLED_BACK: 'bg-violet-100 text-violet-700',
};

export function HistoryTable({ rows }: { rows: HistoryRow[] }) {
  const [sel, setSel] = useState<HistoryRow | null>(null);

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold">이력 관리</h2>
      <p className="mb-2 text-xs text-muted-foreground">
        이 전시화면과 소속 Template의 승인·상태 변경 이력입니다. <b>승인ID</b>를 클릭하면 상세를 볼 수 있습니다. (PI-DSP-AUD-002)
      </p>
      <div className="overflow-x-auto rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              {['버전', '승인ID', '승인요청자', '승인요청일시', '승인상태', '승인 담당자', '처리 일시'].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">이력이 없습니다.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-muted/30">
                <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-700">{r.version}</td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <button onClick={() => setSel(r)} className="font-mono text-xs text-primary underline underline-offset-2 hover:opacity-80">
                    {r.approvalId}
                  </button>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-700">{r.actor}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-500">{r.requestedAt}</td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', RESULT_COLOR[r.result] ?? 'bg-muted')}>{r.status}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-700">{r.approver ?? '-'}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-500">{r.processedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 승인ID 상세 모달 */}
      {sel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSel(null)}>
          <div className="w-full max-w-lg overflow-hidden rounded-xl bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b px-5 py-3">
              <h3 className="text-sm font-semibold">승인 이력 상세</h3>
              <span className="font-mono text-xs text-muted-foreground">{sel.approvalId}</span>
              <button onClick={() => setSel(null)} className="ml-auto text-muted-foreground hover:text-foreground" aria-label="닫기">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="divide-y">
              <DRow label="버전" value={`v${sel.version}`} />
              <DRow label="대상" value={sel.target} />
              <DRow
                label="승인상태"
                value={<span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', RESULT_COLOR[sel.result] ?? 'bg-muted')}>{sel.status}</span>}
              />
              <ChangeView sel={sel} />
              <DRow label="승인요청자" value={sel.actor} />
              <DRow label="승인요청일시" value={sel.requestedAt} />
              <DRow label="승인 담당자" value={sel.approver ?? '-'} />
              <DRow label="처리 일시" value={sel.processedAt} />
              <DRow label="사유" value={sel.reason ?? '-'} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// 변경 보기 — 변경된 필드만 이전 → 이후로 표시 (로드맵 1차: 이력 '변경 보기')
function ChangeView({ sel }: { sel: HistoryRow }) {
  const diff = computeDiff(sel.beforeJson, sel.afterJson);
  if (diff && diff.length > 0) {
    return (
      <div className="px-5 py-2.5">
        <span className="mb-1.5 block text-xs font-medium text-slate-500">변경 항목 ({diff.length})</span>
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-[11px] text-slate-500">
              <tr>
                <th className="px-2.5 py-1.5 text-left font-medium">항목</th>
                <th className="px-2.5 py-1.5 text-left font-medium">이전</th>
                <th className="px-2.5 py-1.5 text-left font-medium">이후</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {diff.map((it) => (
                <tr key={it.key}>
                  <td className="px-2.5 py-1.5 font-medium text-slate-700">{it.label}</td>
                  <td className="px-2.5 py-1.5 text-rose-600 line-through decoration-rose-300">{fmtVal(it.before)}</td>
                  <td className="px-2.5 py-1.5 font-medium text-emerald-700">{fmtVal(it.after)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  // JSON diff가 없으면 상태 변화 요약으로 폴백
  return <DRow label="상태 변화" value={sel.before || sel.after ? `${sel.before ?? '-'} → ${sel.after ?? '-'}` : '-'} />;
}

function DRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-center gap-3 px-5 py-2.5">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <span className="break-all text-sm text-slate-800">{value}</span>
    </div>
  );
}
