'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { StatusPill } from '@/components/ops-ui';
import { USE_LABEL, fmtDateTime } from '@/lib/widget-taxonomy';
import { RotateCcw, Search } from 'lucide-react';

export type TypeRow = {
  id: string; typeName: string; description: string | null; useYn: boolean;
  updatedBy: string | null; updatedAt: string;
};

export function WidgetTypeList({ rows }: { rows: TypeRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [use, setUse] = useState('');
  const [desc, setDesc] = useState('');
  const [applied, setApplied] = useState({ q: '', use: '', desc: '' });

  const filtered = useMemo(() => rows
    .filter((r) => (applied.q ? r.typeName.toLowerCase().includes(applied.q.toLowerCase()) : true))
    .filter((r) => (applied.use ? String(r.useYn) === applied.use : true))
    .filter((r) => (applied.desc ? (r.description ?? '').toLowerCase().includes(applied.desc.toLowerCase()) : true)),
    [rows, applied]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-[12px] text-muted-foreground">위젯유형
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="위젯유형" className="h-9 w-56 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-muted-foreground">사용여부
            <Select value={use} onChange={(e) => setUse(e.target.value)} className="h-9 w-28 text-sm">
              <option value="">전체</option>
              <option value="true">사용</option>
              <option value="false">미사용</option>
            </Select>
          </label>
          <label className="flex flex-1 flex-col gap-1 text-[12px] text-muted-foreground">유형설명
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="키워드를 입력하세요" className="h-9 text-sm" />
          </label>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => { setQ(''); setUse(''); setDesc(''); setApplied({ q: '', use: '', desc: '' }); }}><RotateCcw className="mr-1 h-3.5 w-3.5" />초기화</Button>
            <Button type="button" onClick={() => setApplied({ q, use, desc })}><Search className="mr-1 h-3.5 w-3.5" />조회</Button>
          </div>
        </div>
      </div>

      <p className="text-sm font-semibold">위젯 유형 목록 <span className="text-indigo-600">{filtered.length}건</span></p>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-[12px] text-slate-500">
              <th className="w-16 px-3 py-2.5 text-left font-medium">번호</th>
              <th className="px-3 py-2.5 text-left font-medium">위젯 유형</th>
              <th className="px-3 py-2.5 text-left font-medium">유형설명</th>
              <th className="w-24 px-3 py-2.5 text-left font-medium">사용여부</th>
              <th className="px-3 py-2.5 text-left font-medium">최근 수정자</th>
              <th className="px-3 py-2.5 text-left font-medium">최근 수정일시</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">조회 결과가 없습니다.</td></tr>
            ) : filtered.map((r, i) => (
              <tr key={r.id} className="cursor-pointer border-b last:border-b-0 hover:bg-slate-50/60" onClick={() => router.push(`/admin/widget-types/${r.id}`)}>
                <td className="px-3 py-2.5 text-slate-500">{i + 1}</td>
                <td className="px-3 py-2.5 font-medium text-slate-800">{r.typeName}</td>
                <td className="px-3 py-2.5 text-slate-600">{r.description ?? '-'}</td>
                <td className="px-3 py-2.5">{r.useYn ? <StatusPill label="사용중" tone="green" /> : <StatusPill label="미사용" tone="amber" dot />}</td>
                <td className="px-3 py-2.5 text-slate-600">{r.updatedBy ?? '-'}</td>
                <td className="px-3 py-2.5 text-[12px] text-slate-500">{fmtDateTime(r.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={() => router.push('/admin/widget-types/new')}>등록</Button>
      </div>
    </div>
  );
}
