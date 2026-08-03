'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  OPERATION_CHANNELS,
  OPERATION_PLATFORMS,
  CORNER_TYPE_FEATURES,
  CORNER_TYPE_STATUS_LABEL,
  cornerTypeDisplayName,
} from '@/lib/display-taxonomy';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Check, X } from 'lucide-react';
import { createCornerType, updateCornerType, toggleCornerTypeActive } from './actions';

// 전시화면관리(빌더)에서 실제로 만들어진 코너 유형 조합. 등록 폼의 선택지를 이걸로 제한한다.
export type BuiltCornerOption = {
  cornerType: string; // 빌더에서 만들어진 cornerType (CORNER_TYPES 중 하나)
  details: string[]; // 그 유형으로 실제 만들어진 유형 상세(layoutDetail) 목록
  allowEmpty: boolean; // 유형 상세 없이(null) 만들어진 코너가 있으면 true → "선택 안 함" 허용
};

export type CornerTypeRow = {
  id: string;
  typeId: string;
  name: string;
  baseCategory: string;
  markupId: string | null;
  typeDetail: string | null;
  layout: string | null;
  description: string | null;
  channels: string;
  platforms: string;
  active: boolean;
  useMainTitle: boolean;
  useSubTitle: boolean;
  useMinItems: boolean;
  useMaxItems: boolean;
  useNoDisplay: boolean;
  useMoreButton: boolean;
  sampleImageUrl: string | null;
  status: string;
  createdBy: string | null;
  updatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export const EMPTY_CORNER_TYPE: CornerTypeRow = {
  id: '',
  typeId: '(자동 생성)',
  name: '',
  baseCategory: '상품형',
  markupId: null,
  typeDetail: null,
  layout: null,
  description: null,
  channels: 'FO',
  platforms: '모바일',
  active: true,
  useMainTitle: true,
  useSubTitle: true,
  useMinItems: true,
  useMaxItems: true,
  useNoDisplay: true,
  useMoreButton: true,
  sampleImageUrl: null,
  status: 'DRAFT',
  createdBy: null,
};

export function CornerTypeManager({ types, builtOptions }: { types: CornerTypeRow[]; builtOptions: BuiltCornerOption[] }) {
  const router = useRouter();
  const noneBuilt = builtOptions.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">코너 유형 관리</h1>
          <p className="text-sm text-muted-foreground">
            전시화면관리에서 <b className="text-foreground">실제로 만들어진 코너 유형</b>만 등록·관리합니다. 행을 클릭하면 상세(정보·이력)를 볼 수 있습니다. 검색결과:{' '}
            <b className="text-foreground">{types.length}개</b>
          </p>
        </div>
        {noneBuilt ? (
          <Button size="sm" disabled title="전시화면관리에서 코너를 먼저 만들어 주세요.">
            <Plus className="mr-1 h-4 w-4" /> 등록
          </Button>
        ) : (
          <Link href="/admin/corner-types/new">
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> 등록
            </Button>
          </Link>
        )}
      </div>

      {noneBuilt && (
        <div className="rounded-md border border-dashed bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          전시화면관리(빌더)에서 만들어진 코너가 없어 등록할 수 있는 코너 유형이 없습니다. 먼저 전시화면에서 코너를 구성해 주세요.
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              {['번호', '코너 유형 ID', '코너 유형', '코너 마크업 ID', '유형 상세', '사용여부', '유형 샘플', '승인상태', '등록자', '등록일시', '최근수정자', '최근 수정일시'].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {types.length === 0 && (
              <tr>
                <td colSpan={12} className="px-3 py-8 text-center text-muted-foreground">
                  등록된 코너 유형이 없습니다. 우측 상단 <b>등록</b>으로 추가하세요.
                </td>
              </tr>
            )}
            {types.map((t, i) => (
              <tr key={t.id} onClick={() => router.push(`/admin/corner-types/${t.id}`)} className="cursor-pointer hover:bg-muted/40">
                <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{i + 1}</td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-primary underline-offset-2 hover:underline">{t.typeId}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  <Badge variant="outline">{t.baseCategory}</Badge>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{t.markupId ?? '-'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-xs">{t.typeDetail ?? '-'}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  <form action={toggleCornerTypeActive.bind(null, t.id)} onClick={(e) => e.stopPropagation()}>
                    <button
                      className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', t.active ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground')}
                      title="클릭하여 사용/미사용 전환"
                    >
                      {t.active ? '사용' : '미사용'}
                    </button>
                  </form>
                </td>
                <td className="whitespace-nowrap px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  {t.sampleImageUrl ? (
                    <a
                      href={t.sampleImageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded border px-2 py-0.5 text-[11px] hover:bg-secondary"
                    >
                      보기
                    </a>
                  ) : (
                    <span className="inline-flex items-center rounded border px-2 py-0.5 text-[11px] text-muted-foreground/50">보기</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-xs">{CORNER_TYPE_STATUS_LABEL[t.status] ?? t.status}</td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{t.createdBy ?? '-'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{t.createdAt ? t.createdAt.replace('T', ' ').slice(0, 16) : '-'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{t.updatedBy ?? '-'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{t.updatedAt ? t.updatedAt.replace('T', ' ').slice(0, 16) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 코너 유형 등록/수정 폼 (BO 대표 유형 화면 · 등록 폼 패턴) ─────────────
export function CornerTypeForm({ row, builtOptions, onClose }: { row: CornerTypeRow; builtOptions: BuiltCornerOption[]; onClose: () => void }) {
  const isNew = !row.id;
  const [base, setBase] = useState(row.baseCategory);
  const [detail, setDetail] = useState(row.typeDetail ?? '');
  const [active, setActive] = useState(row.active);

  // 코너 유형 후보 = 전시화면관리에서 만들어진 유형. 수정 시 기존 값이 목록에 없으면(레거시) 값 보존용으로 합친다.
  const baseOptions = Array.from(
    new Set([...builtOptions.map((o) => o.cornerType), ...(!isNew && row.baseCategory ? [row.baseCategory] : [])]),
  );
  const currentOpt = builtOptions.find((o) => o.cornerType === base);
  const builtDetails = currentOpt?.details ?? [];
  // 레거시 유형 상세(빌더에 없는 값)도 수정 화면에선 보존
  const legacyDetail = !isNew && row.typeDetail && !builtDetails.includes(row.typeDetail) ? [row.typeDetail] : [];
  const detailOptions = [...builtDetails, ...legacyDetail];
  // 빌더에 유형 상세 없이 만들어진 코너가 있거나(allowEmpty), 만들어진 상세가 하나도 없으면 "선택 안 함" 허용
  const allowEmptyDetail = currentOpt ? currentOpt.allowEmpty || detailOptions.length === 0 : true;
  // 유형 상세가 필수인 유형(allowEmpty=false)에서 base 전환 시 첫 상세로 초기화
  const defaultDetailFor = (b: string) => {
    const o = builtOptions.find((x) => x.cornerType === b);
    if (!o) return '';
    return o.allowEmpty ? '' : (o.details[0] ?? '');
  };
  // 유형 샘플 이미지 — 로컬에서 직접 등록(data URI)
  const [sampleImage, setSampleImage] = useState(row.sampleImageUrl ?? '');
  const sampleFileRef = useRef<HTMLInputElement>(null);
  const onSampleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setSampleImage(String(reader.result));
    reader.readAsDataURL(f);
  };
  const detailValid = detailOptions.includes(detail) ? detail : allowEmptyDetail ? '' : (detailOptions[0] ?? '');
  // 코너 유형 명은 별도 입력 없이 [코너 유형(+유형 상세)]로 자동 구성
  const baseLabel = base === '개인화 추천형' ? '복합형' : cornerTypeDisplayName(base);
  const derivedName = detailValid ? `${baseLabel} · ${detailValid}` : baseLabel;
  const channels = row.channels.split(',').filter(Boolean);
  const platforms = row.platforms.split(',').filter(Boolean);
  const action = isNew ? createCornerType : updateCornerType.bind(null, row.id);

  return (
    <form
      action={async (fd) => {
        await action(fd);
        onClose();
      }}
      className="space-y-4 rounded-lg border bg-card p-5"
    >
      <div className="flex items-center gap-2 border-b pb-3">
        <h2 className="text-sm font-semibold">{isNew ? '코너 유형 등록' : `코너 유형 수정 · ${row.typeId}`}</h2>
        <button type="button" onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground" title="닫기">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 기본 정보 */}
      <section className="overflow-hidden rounded-md border">
        <div className="border-b bg-muted/50 px-3 py-2 text-xs font-semibold">기본 정보</div>
        {/* 상단: 좌측 미리보기(고정 폭) + 우측 핵심 필드(코너 유형 ID · 코너 마크업 ID · 코너 유형 · 유형 상세) */}
        <div className="grid grid-cols-1 items-start gap-5 border-b p-3 md:grid-cols-[360px_minmax(0,1fr)]">
          <TypeDetailPreview base={base} detail={detailValid} />
          <div className="space-y-3">
            {/* 코너 유형 명은 코너 유형(+유형 상세)로 자동 구성 · 코너 레이아웃은 선택 안 함 — 값 보존 */}
            <input type="hidden" name="name" value={derivedName} />
            <input type="hidden" name="layout" value={row.layout ?? ''} />
            <TRow flat label="코너 유형 ID">
              <Input value={row.typeId} disabled className="h-8 bg-muted text-xs" />
            </TRow>
            <TRow flat label="코너 마크업 ID">
              <Input name="markupId" defaultValue={row.markupId ?? ''} placeholder="영문/숫자 10자 이내 (CMUID…)" className="h-8 text-xs" />
            </TRow>
            <TRow flat label="코너 유형" required hint="전시화면관리에서 만들어진 유형만 · PI-DSP-CMP-003">
              <Select
                name="baseCategory"
                value={base}
                onChange={(e) => {
                  setBase(e.target.value);
                  setDetail(defaultDetailFor(e.target.value));
                }}
                className="h-8 text-xs"
              >
                {baseOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                    {cornerTypeDisplayName(c) !== c ? ` (이미지: ${cornerTypeDisplayName(c)})` : ''}
                  </option>
                ))}
              </Select>
            </TRow>
            <TRow flat label="유형 상세" hint="선택한 유형으로 만들어진 상세만">
              <Select key={base} name="typeDetail" value={detailValid} onChange={(e) => setDetail(e.target.value)} className="h-8 text-xs">
                {allowEmptyDetail && <option value="">선택 안 함</option>}
                {detailOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </TRow>
          </div>
        </div>

        {/* 하단: 나머지 항목 2열 */}
        <div className="grid grid-cols-1 md:grid-cols-2">
          <TRow label="운영 채널">
            <div className="flex flex-wrap gap-3 py-0.5">
              {OPERATION_CHANNELS.map((c) => (
                <label key={c} className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" name="channels" value={c} defaultChecked={channels.includes(c)} className="accent-indigo-600" /> {c}
                </label>
              ))}
            </div>
          </TRow>
          <TRow label="운영 플랫폼">
            <div className="flex flex-wrap gap-3 py-0.5">
              {OPERATION_PLATFORMS.map((p) => (
                <label key={p} className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" name="platforms" value={p} defaultChecked={platforms.includes(p)} className="accent-indigo-600" /> {p}
                </label>
              ))}
            </div>
          </TRow>

          <TRow label="사용 여부" required>
            <div className="flex gap-4 py-0.5 text-xs">
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={active} onChange={() => setActive(true)} className="accent-indigo-600" /> 사용
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={!active} onChange={() => setActive(false)} className="accent-indigo-600" /> 미사용
              </label>
            </div>
            {active && <input type="hidden" name="active" value="on" />}
          </TRow>
          <TRow label="승인상태" hint="승인 결과는 별도 승인 프로세스에서 반영됩니다">
            <div className="flex items-center gap-2 py-0.5">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                {CORNER_TYPE_STATUS_LABEL[row.status] ?? row.status}
              </span>
              <span className="text-[10px] text-muted-foreground">(읽기 전용)</span>
            </div>
            <input type="hidden" name="status" value={row.status} />
          </TRow>

          <div className="p-3 md:col-span-2">
            <TRow label="코너 유형 설명" flat>
              <Input name="description" defaultValue={row.description ?? ''} placeholder="100자 이내" className="h-8 text-xs" />
            </TRow>
          </div>
        </div>
      </section>

      {/* 세부 항목 (항목별 사용여부) — BO 체크박스 그룹 패턴 */}
      <section className="overflow-hidden rounded-md border">
        <div className="border-b bg-muted/50 px-3 py-2 text-xs font-semibold">세부 항목 (항목별 사용여부)</div>
        <div className="grid grid-cols-[120px_1fr] items-center gap-3 px-3 py-3">
          <label className="text-xs font-medium text-muted-foreground">표시 항목</label>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {CORNER_TYPE_FEATURES.map((f) => (
              <label key={f.key} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" name={f.key} defaultChecked={row[f.key as keyof CornerTypeRow] as boolean} className="accent-indigo-600" />
                {f.label}
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* 유형 샘플 이미지 — 로컬에서 직접 등록 */}
      <section className="overflow-hidden rounded-md border">
        <div className="border-b bg-muted/50 px-3 py-2 text-xs font-semibold">유형 샘플 이미지</div>
        <div className="p-3">
          <input type="hidden" name="sampleImageUrl" value={sampleImage} />
          <input ref={sampleFileRef} type="file" accept="image/*" className="hidden" onChange={onSampleFile} />
          {sampleImage ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sampleImage} alt="유형 샘플" className="h-24 w-40 rounded-md border object-cover" />
              <div className="flex flex-col gap-1.5">
                <Button type="button" size="sm" variant="secondary" onClick={() => sampleFileRef.current?.click()}>
                  이미지 변경
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setSampleImage('')}>
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> 제거
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => sampleFileRef.current?.click()}
              className="flex h-24 w-40 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-slate-300 text-xs text-muted-foreground hover:border-primary/50 hover:bg-accent"
            >
              <Plus className="h-5 w-5" />
              이미지 등록
            </button>
          )}
          <p className="mt-1.5 text-[10px] text-muted-foreground">로컬 이미지를 선택하면 샘플로 등록됩니다. (선택)</p>
        </div>
      </section>

      <div className="flex justify-end gap-2 border-t pt-3">
        <Button type="button" variant="secondary" size="sm" onClick={onClose}>
          취소
        </Button>
        <Button type="submit" size="sm">
          <Check className="mr-1 h-4 w-4" /> {isNew ? '등록' : '저장'}
        </Button>
      </div>
    </form>
  );
}

/** BO 폼 행: 라벨 셀 + 값 셀 (셀 경계). flat=경계/패딩 없는 단일 행 */
function TRow({
  label,
  required,
  hint,
  flat,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  flat?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('grid grid-cols-[120px_1fr] items-center gap-3', !flat && 'border-b px-3 py-2.5')}>
      <label className="text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-rose-500">*</span>}
        {hint && <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground/70">{hint}</span>}
      </label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** 유형 상세 선택 시 만들어질 코너 레이아웃 미리보기 (스켈레톤 목업) */
export function TypeDetailPreview({ base, detail }: { base: string; detail: string }) {
  const skel = 'rounded bg-slate-200';
  const card = 'rounded border border-slate-200 bg-white';
  const d = detail;
  let body: React.ReactNode;

  if (!d) {
    body = <div className="flex h-24 items-center justify-center text-[11px] text-muted-foreground">유형 상세를 선택하면 미리보기가 표시됩니다.</div>;
  } else if (d.includes('빅배너') || d.includes('이미지형')) {
    body = <div className={`${skel} h-20 w-full`} />;
  } else if (d.includes('팝업')) {
    body = (
      <div className="relative">
        <div className={`${skel} h-20 w-full`} />
        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-500 text-[9px] text-white">×</span>
      </div>
    );
  } else if (d.includes('스몰')) {
    body = <div className={`${skel} mx-auto h-11 w-3/4`} />;
  } else if (d.includes('띠') || d.includes('텍스트배너')) {
    body = <div className={`${skel} h-6 w-full`} />;
  } else if (d.includes('2.5') || d.includes('가로')) {
    body = (
      <div className="flex gap-1.5 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${card} h-24 w-[42%] shrink-0 p-1`}>
            <div className={`${skel} mb-1 h-14 w-full`} />
            <div className={`${skel} h-2 w-3/4`} />
          </div>
        ))}
      </div>
    );
  } else if (d.includes('1.5') || d.includes('단일강조')) {
    // 단일강조(1.5배열): 카드가 가로로 나열된 형태로 미리보기
    body = (
      <div className="flex gap-1.5 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${card} h-24 w-[42%] shrink-0 p-1`}>
            <div className={`${skel} mb-1 h-14 w-full`} />
            <div className={`${skel} h-2 w-3/4`} />
          </div>
        ))}
      </div>
    );
  } else if (d.includes('그리드') || d.includes('격자')) {
    body = (
      <div className="grid grid-cols-2 gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${skel} h-11`} />
        ))}
      </div>
    );
  } else if (d.includes('묶음')) {
    body = (
      <div>
        <div className="mb-1.5 flex gap-1">
          {['카페', '베이커리', '외식'].map((t, i) => (
            <span key={t} className={cn('rounded-full px-2 py-0.5 text-[9px]', i === 0 ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600')}>
              {t}
            </span>
          ))}
        </div>
        {[0, 1].map((i) => (
          <div key={i} className="mb-1 flex items-center gap-1.5">
            <div className={`${skel} h-6 w-6 rounded-full`} />
            <div className={`${skel} h-2 flex-1`} />
          </div>
        ))}
      </div>
    );
  } else if (d.includes('패스')) {
    body = (
      <div className="flex items-center justify-between px-3 py-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${skel} h-9 w-9 rounded-full`} />
        ))}
      </div>
    );
  } else if (d.includes('탭') || d.includes('고정형')) {
    // 고정형(탭): 하위 콘텐츠 없이 탭만 표시
    body = (
      <div className="flex flex-wrap gap-1.5">
        {['탭1', '탭2', '탭3'].map((t, i) => (
          <span key={t} className={cn('rounded-full px-3 py-1 text-[11px] font-medium', i === 0 ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600')}>
            {t}
          </span>
        ))}
      </div>
    );
  } else if (d.includes('아코디언')) {
    body = (
      <div className="space-y-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${card} flex items-center justify-between px-2 py-1.5`}>
            <div className={`${skel} h-2 w-1/2`} />
            <span className="text-[10px] text-slate-400">⌄</span>
          </div>
        ))}
      </div>
    );
  } else if (d.includes('카드')) {
    body = (
      <div className="space-y-1.5">
        {[0, 1].map((i) => (
          <div key={i} className={`${card} flex gap-1.5 p-1.5`}>
            <div className={`${skel} h-10 w-10`} />
            <div className="flex-1 space-y-1">
              <div className={`${skel} h-2 w-3/4`} />
              <div className={`${skel} h-2 w-1/2`} />
            </div>
          </div>
        ))}
      </div>
    );
  } else {
    // 세로형 / 리스트형 / 기본
    body = (
      <div className="space-y-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className={`${skel} h-7 w-7 rounded-full`} />
            <div className="flex-1 space-y-1">
              <div className={`${skel} h-2 w-3/4`} />
              <div className={`${skel} h-2 w-1/3`} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 상품형: 상단 타이틀·서브타이틀 + 본문 + 더보기 버튼까지 전체 프레임으로 표시 (영역만 라벨로 표시)
  const withFrame = base === '상품형';
  const framed = withFrame ? (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex h-6 w-3/5 items-center rounded bg-slate-100 px-2 text-[11px] font-semibold text-slate-400">Title</div>
        <div className="flex h-4 w-2/5 items-center rounded bg-slate-50 px-2 text-[10px] text-slate-400">Subtitle</div>
      </div>
      {body}
      <div className="mx-auto flex h-7 w-28 items-center justify-center rounded-full border border-slate-200 text-[11px] text-slate-400">더보기</div>
    </div>
  ) : (
    body
  );

  return (
    <div className="rounded-md border bg-slate-50 p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        미리보기 · {base} {detail ? `› ${detail}` : ''}
      </p>
      <div className="flex min-h-[220px] w-full items-center rounded-lg border bg-white p-4 shadow-sm">
        <div className="w-full">{framed}</div>
      </div>
    </div>
  );
}
