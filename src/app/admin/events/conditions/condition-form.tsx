'use client';
// 조건 항목 등록/수정 — SB Figma(BO-AIM-EVTMSN-PG178). 기본 정보 + 입력 변수(반복) + 반환값 + 조회 로직.
//  목록 스펙(분류·항목명·입력변수·반환값·사용/회원전용) 기준으로 구성. 데모(저장은 토스트).
import * as React from 'react';
import { OpsSection, FieldRow } from '@/components/ops-ui';
import { COND_CATEGORIES, type ConditionRow } from '@/lib/promotion/condition';
import { Plus, X } from 'lucide-react';

const FIELD = 'h-[38px] rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-3 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--focus-border)]';
const VAR_TYPES = ['문자열', '숫자', '불리언', '날짜', '코드'] as const;

function Radio({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <span className="flex items-center gap-4 text-[14px] text-[var(--ink2)]">
      {options.map((o) => (
        <label key={o} className="flex items-center gap-1.5"><input type="radio" checked={value === o} onChange={() => onChange(o)} className="h-4 w-4 accent-[var(--ac)]" />{o}</label>
      ))}
    </span>
  );
}
function Select({ value, onChange, options, w = 200 }: { value: string; onChange: (v: string) => void; options: readonly string[]; w?: number }) {
  return (
    <span className="relative inline-block" style={{ width: w }}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${FIELD} w-full appearance-none pr-8`}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <svg className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink4)]" viewBox="0 0 20 20" fill="none"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </span>
  );
}

type Var = { name: string; type: string; required: boolean; desc: string };

export function ConditionForm({ row, onBack, onToast }: { row?: ConditionRow | null; onBack: () => void; onToast: (m: string) => void }) {
  const editing = !!row;
  const [category, setCategory] = React.useState(row?.category ?? '고객 기본');
  const [name, setName] = React.useState(row?.name ?? '');
  const [use, setUse] = React.useState(row ? (row.use ? 'Y' : 'N') : 'Y');
  const [memberOnly, setMemberOnly] = React.useState(row ? (row.memberOnly ? 'Y' : 'N') : 'N');
  const [desc, setDesc] = React.useState('');
  const [vars, setVars] = React.useState<Var[]>([{ name: '', type: '문자열', required: true, desc: '' }]);
  const [retName, setRetName] = React.useState(row?.returnVal ?? '');
  const [retType, setRetType] = React.useState<string>('문자열');
  const [retDesc, setRetDesc] = React.useState('');
  const [logic, setLogic] = React.useState('');

  const addVar = () => setVars((v) => [...v, { name: '', type: '문자열', required: true, desc: '' }]);
  const rmVar = (i: number) => setVars((v) => v.filter((_, j) => j !== i));
  const setVar = (i: number, p: Partial<Var>) => setVars((v) => v.map((x, j) => (j === i ? { ...x, ...p } : x)));

  const save = () => { if (!name.trim()) { onToast('조건 항목명을 입력하세요.'); return; } onToast(editing ? '조건 항목을 수정했습니다.' : '조건 항목을 등록했습니다.'); onBack(); };

  const catOptions = COND_CATEGORIES.filter((c) => c !== '전체');

  return (
    <div>
      <OpsSection title="기본 정보">
        <FieldRow label="조건 항목 분류" required><Select value={category} onChange={(v) => setCategory(v as ConditionRow['category'])} options={catOptions} /></FieldRow>
        <FieldRow label="조건 항목명" required><input value={name} onChange={(e) => setName(e.target.value)} placeholder="조건 항목명을 입력하세요" className={`${FIELD} w-full max-w-[520px]`} /></FieldRow>
        {editing && <FieldRow label="조건 항목 ID"><span className="font-mono text-[14px] text-[var(--ink2)]">{row!.id}</span></FieldRow>}
        <FieldRow label="사용 여부" required><Radio value={use} onChange={setUse} options={['Y', 'N']} /></FieldRow>
        <FieldRow label="회원 전용 여부" required><Radio value={memberOnly} onChange={setMemberOnly} options={['Y', 'N']} /></FieldRow>
        <FieldRow label="설명"><textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="조건 항목 설명" className="w-full max-w-[640px] resize-none rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--focus-border)]" /></FieldRow>
      </OpsSection>

      <OpsSection title="입력 변수">
        <div className="border-b border-[#dce0e5] px-4 py-3">
          <div className="mb-2 grid grid-cols-[1fr_140px_90px_1.4fr_32px] gap-2 text-[12px] font-semibold text-[var(--ink3)]">
            <span>변수명</span><span>타입</span><span className="text-center">필수</span><span>설명</span><span />
          </div>
          <div className="space-y-2">
            {vars.map((v, i) => (
              <div key={i} className="grid grid-cols-[1fr_140px_90px_1.4fr_32px] items-center gap-2">
                <input value={v.name} onChange={(e) => setVar(i, { name: e.target.value })} placeholder="예: 고객 CI" className={FIELD} />
                <Select value={v.type} onChange={(t) => setVar(i, { type: t })} options={VAR_TYPES} w={140} />
                <span className="flex justify-center"><input type="checkbox" checked={v.required} onChange={(e) => setVar(i, { required: e.target.checked })} className="h-4 w-4 accent-[var(--ac)]" /></span>
                <input value={v.desc} onChange={(e) => setVar(i, { desc: e.target.value })} placeholder="변수 설명" className={FIELD} />
                <button type="button" onClick={() => rmVar(i)} disabled={vars.length <= 1} className="grid h-7 w-7 place-items-center rounded-[6px] text-[var(--ink4)] hover:bg-[#fff0f1] hover:text-[var(--bad)] disabled:opacity-30"><X className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addVar} className="mt-2.5 inline-flex h-[34px] items-center gap-1 rounded-[6px] border border-dashed border-[var(--line3)] px-3 text-[13px] font-semibold text-[var(--ac)] hover:bg-[var(--ac2)]"><Plus className="h-4 w-4" /> 입력 변수 추가</button>
        </div>
      </OpsSection>

      <OpsSection title="반환값">
        <FieldRow label="반환값명" required><input value={retName} onChange={(e) => setRetName(e.target.value)} placeholder="예: 만 나이" className={`${FIELD} w-full max-w-[360px]`} /></FieldRow>
        <FieldRow label="반환 타입" required><Select value={retType} onChange={setRetType} options={VAR_TYPES} /></FieldRow>
        <FieldRow label="반환값 설명"><input value={retDesc} onChange={(e) => setRetDesc(e.target.value)} placeholder="반환값 설명" className={`${FIELD} w-full max-w-[640px]`} /></FieldRow>
      </OpsSection>

      <OpsSection title="조회 로직">
        <FieldRow label="조회 로직 / API"><textarea value={logic} onChange={(e) => setLogic(e.target.value)} rows={4} placeholder="연동 API·조회 쿼리 또는 로직을 입력하세요 (개발 연동)" className="w-full max-w-[720px] resize-none rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-3 py-2 font-mono text-[13px] text-[var(--ink)] outline-none focus:border-[var(--focus-border)]" /></FieldRow>
      </OpsSection>

      <div className="mt-8 flex items-center justify-end gap-2">
        <button type="button" onClick={onBack} className="h-[40px] rounded-[var(--r-field)] border border-[var(--line3)] bg-white px-6 text-[14px] font-semibold text-[var(--ink3)] hover:bg-[var(--th)]">취소</button>
        <button type="button" onClick={save} className="h-[40px] rounded-[var(--r-field)] bg-[var(--ac)] px-7 text-[14px] font-semibold text-white hover:bg-[var(--ac-h)]">{editing ? '수정' : '등록'}</button>
      </div>
    </div>
  );
}
