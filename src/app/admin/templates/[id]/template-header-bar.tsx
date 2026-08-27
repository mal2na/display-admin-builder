'use client';

import { useEffect, useState, useTransition } from 'react';
import { renameTemplate, saveTemplateSnapshot, rollbackToVersion, deleteTemplate, requestTemplateRetire, cancelTemplateRetire, approveTemplateRetire, rejectTemplateRetire } from '../actions';
import { Badge } from '@/components/ui/badge';
import { Pencil, Save, History, RotateCcw, Check, MoreVertical, CheckCircle2, Trash2, PackageX } from 'lucide-react';
import { cn } from '@/lib/utils';

// 승인된 적 있는 템플릿(APPROVED 이상) — 미승인(초안/검수대기/반려)만 물리 삭제 허용, 그 외엔 폐기 요청.
const isTemplateApproved = (s: string) => !['DRAFT', 'REVIEW', 'REJECTED'].includes(s);

// 저장 성공 등 잠깐 뜨는 토스트 (2초 후 자동 사라짐)
function SaveToast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
        <CheckCircle2 className="h-4 w-4 text-emerald-400" /> {message}
      </div>
    </div>
  );
}

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
  status,
  retireStatus,
  versions,
  archiveBlockReason,
}: {
  templateId: string;
  name: string;
  conditionGroup: string;
  isDefault: boolean;
  status: string;
  retireStatus: string | null;
  versions: TemplateVersionRow[];
  archiveBlockReason: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(name);
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reason, setReason] = useState(''); // 폐기 사유
  const [delConfirm, setDelConfirm] = useState(false); // 미승인 완전 삭제 확인
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pending, start] = useTransition();

  // 임시저장 — 스냅샷 저장 후 성공 토스트. (transition async는 await 이후 setState가 유실될 수 있어 별도 핸들러 사용)
  const doSaveSnapshot = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveTemplateSnapshot(templateId);
      setToast('저장되었습니다.');
    } finally {
      setSaving(false);
    }
  };

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
          onClick={doSaveSnapshot}
          disabled={saving}
          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-secondary disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" /> {saving ? '저장 중…' : '임시저장'}
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

        {/* ⋯ 메뉴 — 템플릿 폐기/삭제 (승인됨: 폐기 요청→BSS 승인 · 미승인: 완전 삭제) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setMenuOpen((o) => !o); setDelConfirm(false); }}
            className={cn('inline-flex items-center rounded-md border px-1.5 py-1 hover:bg-secondary', menuOpen && 'bg-secondary')}
            title="더보기"
            aria-label="템플릿 메뉴"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => { setMenuOpen(false); setDelConfirm(false); }} />
              <div className="absolute right-0 top-full z-30 mt-1 w-72 rounded-md border bg-card p-2 shadow-lg">
                {retireStatus === 'REVIEW' ? (
                  /* 폐기 승인 대기 — 취소(운영자) / 승인·반려(BSS) */
                  <div className="space-y-2">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                      <PackageX className="h-3.5 w-3.5" /> 폐기 승인 대기 중
                    </p>
                    <p className="text-[11px] text-muted-foreground">BSS 승인 시 이 템플릿(매핑)은 폐기(보관)됩니다.</p>
                    <div className="flex flex-wrap items-center gap-1">
                      <button type="button" onClick={() => { setMenuOpen(false); start(() => approveTemplateRetire(templateId)); }} disabled={pending}
                        className="inline-flex items-center gap-0.5 rounded-md border border-primary bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground disabled:opacity-50">
                        <Check className="h-3 w-3" /> 폐기 승인
                      </button>
                      <button type="button" onClick={() => { const fd = new FormData(); fd.set('reason', ''); setMenuOpen(false); start(() => rejectTemplateRetire(templateId, fd)); }} disabled={pending}
                        className="rounded-md border px-2 py-0.5 text-[11px] hover:bg-secondary">반려</button>
                      <button type="button" onClick={() => { setMenuOpen(false); start(() => cancelTemplateRetire(templateId)); }} disabled={pending}
                        className="ml-auto rounded-md border px-2 py-0.5 text-[11px] hover:bg-secondary">요청 취소</button>
                    </div>
                  </div>
                ) : archiveBlockReason ? (
                  <div className="px-1 py-1">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <PackageX className="h-3.5 w-3.5" /> 템플릿 폐기
                    </p>
                    <p className="mt-1 text-[11px] text-destructive">{archiveBlockReason}</p>
                  </div>
                ) : isTemplateApproved(status) ? (
                  /* 승인된 템플릿 — 폐기 요청(사유 필수) → BSS 승인 */
                  <div className="space-y-1.5">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <PackageX className="h-3.5 w-3.5" /> 템플릿 폐기 요청
                    </p>
                    <p className="text-[11px] text-muted-foreground">승인된 템플릿이라 바로 삭제할 수 없어요. 폐기 요청을 보내면 BSS 승인 후 폐기(보관)됩니다.</p>
                    <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="폐기 사유를 입력하세요 (필수)"
                      className="w-full rounded-md border px-2 py-1 text-[11px] outline-none focus:border-primary" />
                    <div className="flex justify-end">
                      <button type="button" disabled={pending || !reason.trim()}
                        onClick={() => { const fd = new FormData(); fd.set('reason', reason.trim()); setMenuOpen(false); setReason(''); start(() => requestTemplateRetire(templateId, fd)); }}
                        className="inline-flex items-center gap-0.5 rounded-md border border-primary bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground disabled:opacity-40">
                        <PackageX className="h-3 w-3" /> 폐기 요청 보내기
                      </button>
                    </div>
                  </div>
                ) : delConfirm ? (
                  /* 미승인 템플릿 — 완전 삭제 확인 */
                  <div className="px-1 py-1">
                    <p className="text-xs font-medium text-destructive">이 템플릿을 완전 삭제할까요?</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">아직 승인 전(초안/검수대기/반려)이라 되돌릴 수 없이 삭제됩니다. 코너·컴포넌트 원본은 보존돼요.</p>
                    <div className="mt-2 flex items-center gap-1">
                      <button type="button" onClick={() => { setMenuOpen(false); start(() => deleteTemplate(templateId)); }} disabled={pending}
                        className="inline-flex items-center gap-0.5 rounded-md border border-destructive bg-destructive px-2 py-0.5 text-[11px] font-medium text-white disabled:opacity-50">
                        <Trash2 className="h-3 w-3" /> 완전 삭제
                      </button>
                      <button type="button" onClick={() => setDelConfirm(false)} className="rounded-md border px-2 py-0.5 text-[11px]">취소</button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDelConfirm(true)}
                    className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-medium text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> 이 템플릿 삭제 (미승인)
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {toast && <SaveToast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
