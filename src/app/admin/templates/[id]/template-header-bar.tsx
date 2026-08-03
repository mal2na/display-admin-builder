'use client';

import { useState, useTransition } from 'react';
import { renameTemplate, saveTemplateSnapshot, rollbackToVersion, archiveTemplate } from '../actions';
import { Badge } from '@/components/ui/badge';
import { Pencil, Save, History, RotateCcw, Check, MoreVertical, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TemplateVersionRow = {
  id: string;
  version: number;
  label: string | null;
  createdBy: string | null;
  createdAt: string; // ISO
};

function fmt(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function TemplateHeaderBar({
  templateId,
  name,
  conditionGroup,
  isDefault,
  versions,
  archiveBlockReason,
}: {
  templateId: string;
  name: string;
  conditionGroup: string;
  isDefault: boolean;
  versions: TemplateVersionRow[];
  archiveBlockReason: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(name);
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [pending, start] = useTransition();

  const saveName = () => {
    const n = val.trim();
    if (n && n !== name) {
      const fd = new FormData();
      fd.set('name', n);
      start(() => renameTemplate(templateId, fd));
    }
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-2">
      {/* 템플릿명 인라인 편집 */}
      {editing ? (
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveName();
            if (e.key === 'Escape') {
              setVal(name);
              setEditing(false);
            }
          }}
          className="h-7 w-48 rounded-md border bg-white px-2 text-sm font-semibold outline-none focus:border-primary"
          aria-label="템플릿명"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setVal(name);
            setEditing(true);
          }}
          className="group inline-flex items-center gap-1 rounded px-0.5 hover:bg-secondary"
          title="템플릿명 편집"
        >
          <span className="text-sm font-semibold">{name}</span>
          <Pencil className="h-3 w-3 text-muted-foreground opacity-0 transition group-hover:opacity-70" />
        </button>
      )}
      <Badge>{conditionGroup}</Badge>
      {isDefault && <Badge variant="secondary">기본</Badge>}

      {/* 임시저장 + 버전 되돌리기 */}
      <div className="ml-1 flex items-center gap-1">
        <button
          type="button"
          onClick={() => start(() => saveTemplateSnapshot(templateId))}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-secondary disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" /> {pending ? '저장 중…' : '임시저장'}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-secondary', open && 'bg-secondary')}
          >
            <History className="h-3.5 w-3.5" /> 버전{versions.length > 0 ? ` (${versions.length})` : ''}
          </button>
          {open && (
            <>
              {/* 바깥 클릭 닫기 */}
              <div className="fixed inset-0 z-20" onClick={() => { setOpen(false); setConfirmId(null); }} />
              <div className="absolute right-0 top-full z-30 mt-1 max-h-80 w-72 overflow-y-auto rounded-md border bg-card p-1.5 shadow-lg">
                <p className="px-2 py-1 text-[11px] font-semibold text-muted-foreground">저장된 버전 · 되돌리기</p>
                {versions.length === 0 ? (
                  <p className="px-2 py-3 text-center text-[11px] text-muted-foreground">
                    저장된 버전이 없습니다.<br />“임시저장”을 누르면 복원 지점이 생깁니다.
                  </p>
                ) : (
                  versions.map((v) => (
                    <div key={v.id} className="rounded-md px-2 py-1.5 hover:bg-muted/60">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">
                            {v.label ?? '스냅샷'} <span className="text-muted-foreground">· v{v.version}</span>
                          </p>
                          <p className="text-[10px] text-muted-foreground">{fmt(v.createdAt)}</p>
                        </div>
                        {confirmId === v.id ? (
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmId(null);
                                setOpen(false);
                                start(() => rollbackToVersion(templateId, v.id));
                              }}
                              disabled={pending}
                              className="inline-flex items-center gap-0.5 rounded border border-primary bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground"
                            >
                              <Check className="h-3 w-3" /> 확인
                            </button>
                            <button type="button" onClick={() => setConfirmId(null)} className="rounded border px-1.5 py-0.5 text-[10px]">
                              취소
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmId(v.id)}
                            className="inline-flex shrink-0 items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[10px] font-medium hover:bg-secondary"
                          >
                            <RotateCcw className="h-3 w-3" /> 되돌리기
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* ⋯ 메뉴 — 템플릿(매핑) 보관 */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setMenuOpen((o) => !o); setArchiveConfirm(false); }}
            className={cn('inline-flex items-center rounded-md border px-1.5 py-1 hover:bg-secondary', menuOpen && 'bg-secondary')}
            title="더보기"
            aria-label="템플릿 메뉴"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => { setMenuOpen(false); setArchiveConfirm(false); }} />
              <div className="absolute right-0 top-full z-30 mt-1 w-64 rounded-md border bg-card p-1.5 shadow-lg">
                {archiveBlockReason ? (
                  <div className="px-2 py-2">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Archive className="h-3.5 w-3.5" /> 이 템플릿(매핑) 보관
                    </p>
                    <p className="mt-1 text-[11px] text-destructive">{archiveBlockReason}</p>
                  </div>
                ) : archiveConfirm ? (
                  <div className="px-2 py-2">
                    <p className="text-xs font-medium">이 템플릿을 보관할까요?</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">목록에서 숨겨지며, 혜택 홈의 “보관된 템플릿”에서 언제든 복구할 수 있어요.</p>
                    <div className="mt-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); start(() => archiveTemplate(templateId)); }}
                        disabled={pending}
                        className="inline-flex items-center gap-0.5 rounded-md border border-primary bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground disabled:opacity-50"
                      >
                        <Archive className="h-3 w-3" /> 보관
                      </button>
                      <button type="button" onClick={() => setArchiveConfirm(false)} className="rounded-md border px-2 py-0.5 text-[11px]">
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setArchiveConfirm(true)}
                    className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-medium text-destructive hover:bg-destructive/10"
                  >
                    <Archive className="h-3.5 w-3.5" /> 이 템플릿(매핑) 보관
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
