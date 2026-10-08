'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { StatusPill, FilterPanel, ListHeader, THEAD_TR_CLS, TBODY_TR_CLS, YN } from '@/components/ops-ui';
import { cn } from '@/lib/utils';
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
    <div>
      {/* 검색 영역 — 참고 디자인 .ft 폼 테이블 + .sbtn */}
      <div className="mt-6">
        <FilterPanel
          rows={[
            [
              ['위젯유형', <Input key="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="위젯유형" className="w-[220px]" />],
              ['사용여부', (
                <Select key="use" value={use} onChange={(e) => setUse(e.target.value)} className="w200">
                  <option value="">전체</option>
                  <option value="true">사용</option>
                  <option value="false">미사용</option>
                </Select>
              )],
            ],
            [
              ['유형설명', <Input key="d" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="키워드를 입력하세요" className="w-[420px] max-w-full" />, 3],
            ],
          ]}
          onReset={() => { setQ(''); setUse(''); setDesc(''); setApplied({ q: '', use: '', desc: '' }); }}
          onSearch={() => setApplied({ q, use, desc })}
        />
      </div>

      <ListHeader title="위젯 유형 목록" count={filtered.length} />

      <div className="border-y border-[#e8ecef] bg-white">
        <table className="w-full text-[13px] font-normal">
          <thead>
            <tr className={THEAD_TR_CLS}>
              <th className="w-16 text-left">번호</th>
              <th className="text-left">위젯 유형</th>
              <th className="text-left">유형설명</th>
              <th className="w-24 text-left">사용여부</th>
              <th className="text-left">최근 수정자</th>
              <th className="text-left">최근 수정일시</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">조회 결과가 없습니다.</td></tr>
            ) : filtered.map((r, i) => (
              <tr key={r.id} className={cn(TBODY_TR_CLS, 'cursor-pointer last:border-b-0')} onClick={() => router.push(`/admin/widget-types/${r.id}`)}>
                <td className="px-3 py-2.5 text-slate-500">{i + 1}</td>
                <td className="px-3 py-2.5 text-slate-800">{r.typeName}</td>
                <td className="px-3 py-2.5 text-slate-600">{r.description ?? '-'}</td>
                <td className="px-3 py-2.5"><YN yes={r.useYn} label={r.useYn ? '사용' : '미사용'} /></td>
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
