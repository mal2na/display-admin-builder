'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Info, History } from 'lucide-react';
import { CornerTypeForm, type CornerTypeRow, type BuiltCornerOption } from '../corner-type-manager';

export type HistoryRow = { id: string; changedAt: string; actor: string; result: string; reason: string | null };

const RESULT_LABEL: Record<string, string> = { CREATED: '등록', UPDATED: '수정', DELETED: '삭제' };
const RESULT_COLOR: Record<string, string> = {
  CREATED: 'bg-emerald-100 text-emerald-700',
  UPDATED: 'bg-sky-100 text-sky-700',
  DELETED: 'bg-rose-100 text-rose-700',
};

export function CornerTypeDetail({ row, history, builtOptions }: { row: CornerTypeRow; history: HistoryRow[]; builtOptions: BuiltCornerOption[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<'info' | 'history'>('info');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin/corner-types" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ChevronLeft className="h-4 w-4" /> 코너 유형 관리
        </Link>
        <div className="h-4 w-px bg-border" />
        <span className="font-mono text-sm text-primary">{row.typeId}</span>
        <h1 className="text-lg font-semibold">{row.name}</h1>
        <Badge variant="outline">{row.baseCategory}</Badge>
        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', row.active ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground')}>
          {row.active ? '사용' : '미사용'}
        </span>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b">
        <TabButton active={tab === 'info'} onClick={() => setTab('info')} icon={<Info className="h-3.5 w-3.5" />}>
          코너 유형 정보
        </TabButton>
        <TabButton active={tab === 'history'} onClick={() => setTab('history')} icon={<History className="h-3.5 w-3.5" />}>
          이력 관리 <span className="ml-1 text-[10px] text-muted-foreground">({history.length})</span>
        </TabButton>
      </div>

      {/* 코너 유형 정보 = 등록 화면과 동일한 폼(미리보기 포함). 저장/취소 시 목록으로 복귀. */}
      {tab === 'info' && <CornerTypeForm row={row} builtOptions={builtOptions} onClose={() => router.push('/admin/corner-types')} />}

      {tab === 'history' && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                {['변경일시', '변경자', '구분', '내용'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {history.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">변경 이력이 없습니다.</td></tr>
              )}
              {history.map((h) => (
                <tr key={h.id} className="hover:bg-muted/30">
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{h.changedAt.replace('T', ' ').slice(0, 19)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">{h.actor}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', RESULT_COLOR[h.result] ?? 'bg-muted')}>
                      {RESULT_LABEL[h.result] ?? h.result}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{h.reason ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        '-mb-px inline-flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium',
        active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      {children}
    </button>
  );
}
