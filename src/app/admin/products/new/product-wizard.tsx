'use client';

import { useState } from 'react';
import { Search, RefreshCw, Plus, Trash2, PenLine, GripVertical, ChevronDown, Home, ChevronRight, Maximize2, Signal, Wifi, BatteryFull, ChevronLeft, ShoppingBag, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const STEPS = [
  { n: 1, name: '상품정보', tabs: ['상품 기본정보 및 스펙확인', '상품 옵션정보 및 가격정보'] },
  { n: 2, name: '상품콘텐츠', tabs: ['템플릿·코너 배치'] },
  { n: 3, name: '전시정보', tabs: ['약관동의 정보', '검색정보', '추천정보', '전시정보', '채널정보'] },
  { n: 4, name: '판매·정책', tabs: ['판매 정책', '프로모션'] },
  { n: 5, name: '검토·등록', tabs: ['검토', '등록'] },
];

// ── 공통 UI ──
function Field({ label, children, req }: { label: string; children: React.ReactNode; req?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-[13px] text-muted-foreground">{label}{req && <span className="ml-0.5 text-rose-500">*</span>}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
function SectionCard({ title, badge, action, children }: { title: string; badge?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-[15px] font-bold text-foreground">{title}</h3>
        {badge && <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[11px] font-semibold text-violet-700">{badge}</span>}
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </section>
  );
}
const boxInput = 'h-9 w-full rounded-lg border bg-white px-3 text-[13px] outline-none focus:ring-2 focus:ring-violet-200';
function Chk({ label, checked }: { label: string; checked?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-[13px]">
      <input type="checkbox" defaultChecked={checked} className="h-4 w-4 accent-violet-600" /> {label}
    </label>
  );
}
function Radio({ name, label, checked }: { name: string; label: string; checked?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-[13px]">
      <input type="radio" name={name} defaultChecked={checked} className="h-4 w-4 accent-violet-600" /> {label}
    </label>
  );
}
function Chip({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-[12px] text-slate-600">{children}<button className="text-slate-300 hover:text-slate-500">×</button></span>;
}

export function ProductWizard() {
  const [step, setStep] = useState(1);
  const [tab, setTab] = useState(0);
  const cur = STEPS[step - 1];

  const go = (n: number) => { setStep(n); setTab(0); };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-card">
      {/* 상단 메타 바 (화면정의서) */}
      <MetaBar />

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#f7f8fb]">
        <div className="mx-auto max-w-[1500px] px-8 py-6">
          {/* breadcrumb + title */}
          <nav className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Home className="h-3.5 w-3.5" /> <ChevronRight className="h-3 w-3 opacity-50" /> 전시상품관리 <ChevronRight className="h-3 w-3 opacity-50" /> <span className="font-medium text-foreground">상품 등록</span>
          </nav>
          <div className="mb-4 flex items-end justify-between">
            <h1 className="text-2xl font-bold tracking-tight">상품 등록</h1>
            <StepDots step={step} onGo={go} />
          </div>

          {/* 보라 요약 스트립 */}
          <div className="mb-5 rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[15px] font-bold text-slate-800">$상품명$ <span className="text-slate-400">|</span> 상품코드 $코드번호$</span>
              <span className="rounded bg-white px-1.5 py-0.5 text-[11px] font-semibold text-violet-600 ring-1 ring-violet-200">등록대기</span>
              <div className="ml-auto flex gap-2">
                <Button variant="primary" size="sm"><Search className="mr-1 h-3.5 w-3.5" /> 상품 템플릿 변경</Button>
                <Button variant="outline" size="sm"><RefreshCw className="mr-1 h-3.5 w-3.5" /> 정보 업데이트</Button>
              </div>
            </div>
            {cur.tabs.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-4 border-t border-violet-200/70 pt-2.5">
                {cur.tabs.map((t, i) => (
                  <button key={t} onClick={() => setTab(i)}
                    className={cn('text-[13px] font-medium', i === tab ? 'text-violet-700' : 'text-slate-400 hover:text-slate-600')}>{t}</button>
                ))}
              </div>
            )}
          </div>

          {/* 본문: 폼(좌) + 디바이스(우 도킹) */}
          <div className="flex items-start gap-6">
            <div className="min-w-0 flex-1 space-y-5">
              {step === 1 && <StepProductInfo tab={tab} />}
              {step === 2 && <StepContent />}
              {step === 3 && <StepDisplay />}
              {step === 4 && <StepPlaceholder title="판매·정책 정보" desc="판매 정책·프로모션 설정 (후속 설계 — 주문 프로세스 정의서 연계)" />}
              {step === 5 && <StepReview />}
            </div>
            <DevicePanel />
          </div>
        </div>
      </div>

      {/* 하단 액션 */}
      <div className="flex items-center justify-end gap-2 border-t bg-card px-8 py-3">
        {step > 1 && <Button variant="ghost" size="sm" onClick={() => go(step - 1)}>이전</Button>}
        <Button variant="outline" size="sm">임시저장</Button>
        {step < 5
          ? <Button variant="primary" size="sm" onClick={() => go(step + 1)}>다음</Button>
          : <Button variant="primary" size="sm">등록</Button>}
      </div>
    </div>
  );
}

// ── 상단 메타 바 ──
function MetaBar() {
  const cell = (k: string, v: string) => (
    <div className="flex items-stretch">
      <span className="flex w-20 shrink-0 items-center bg-slate-50 px-2 py-1.5 text-[11px] font-semibold text-slate-500">{k}</span>
      <span className="flex flex-1 items-center px-2 py-1.5 text-[12px] text-slate-700">{v}</span>
    </div>
  );
  return (
    <div className="grid grid-cols-[repeat(5,minmax(0,1fr))_1.2fr] divide-x divide-y border-b text-[12px] [&>div]:border-slate-100">
      {cell('SB 버전', '1')}{cell('화면ID', 'SB-ETC-071')}{cell('구현유형', 'page')}{cell('상태', 'latest')}{cell('화면명', '전시상품관리')}{cell('작성일', '2026.08.26')}
      {cell('정책서 버전', '—')}{cell('정책서ID', 'SHOP')}{cell('화면유형', '단일')}{cell('참고 정책서', '—')}{cell('경로', '홈 > 전시상품관리')}{cell('작성자', 'P216151')}
    </div>
  );
}

// ── 스텝 인디케이터 ──
function StepDots({ step, onGo }: { step: number; onGo: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      {STEPS.map((s) => (
        <button key={s.n} onClick={() => onGo(s.n)}
          className={cn('flex h-7 items-center gap-1.5 rounded-full text-[12px] font-semibold transition-colors',
            s.n === step ? 'bg-violet-600 px-3 text-white' : 'w-7 justify-center bg-slate-100 text-slate-400 hover:bg-slate-200')}>
          <span className={cn('grid h-4 w-4 place-items-center rounded-full text-[10px]', s.n === step ? 'bg-white/25' : '')}>{s.n}</span>
          {s.n === step && s.name}
        </button>
      ))}
    </div>
  );
}

// ── STEP 1 : 상품정보 ──
const SPEC_TABS = ['기본정보', '스펙', '외관', '디스플레이', '성능', '카메라', '연결/기타', '부가기능', '재고정보', '유의사항'];
function StepProductInfo({ tab }: { tab: number }) {
  const [spec, setSpec] = useState(0);
  return (
    <>
      {tab === 0 && (
        <SectionCard title="상품정보 확인">
          <div className="mb-4 flex flex-wrap gap-x-5 gap-y-1 border-b pb-2">
            {SPEC_TABS.map((t, i) => (
              <button key={t} onClick={() => setSpec(i)} className={cn('pb-1 text-[13px]', i === spec ? 'border-b-2 border-violet-600 font-semibold text-violet-700' : 'text-slate-400 hover:text-slate-600')}>{t}</button>
            ))}
          </div>
          <p className="mb-2 text-[13px] font-semibold text-slate-500">상품 분류정보</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            <Field label="Lv1"><input className={boxInput} defaultValue="상품" readOnly /></Field>
            <Field label="Lv2"><input className={boxInput} defaultValue="기기서비스" readOnly /></Field>
            <Field label="Lv3"><input className={boxInput} defaultValue="이동전화형" readOnly /></Field>
            <Field label="전시코드"><input className={boxInput} defaultValue="2610245501N" readOnly /></Field>
            <Field label="상품명" req><input className={boxInput} defaultValue="갤럭시 Z 폴드8" /></Field>
            <Field label="모상품 코드"><input className={boxInput} defaultValue="A7J9" readOnly /></Field>
          </div>
          <p className="mb-2 mt-5 text-[13px] font-semibold text-slate-500">브랜드 분류</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            <Field label="브랜드"><Select defaultValue="삼성"><option>삼성</option><option>Apple</option></Select></Field>
            <Field label="기기구분"><Select defaultValue="이동전화형"><option>이동전화형</option></Select></Field>
            <Field label="TYPE"><Select defaultValue="스마트폰"><option>스마트폰</option><option>태블릿</option><option>워치</option></Select></Field>
          </div>
        </SectionCard>
      )}
      {tab === 1 && (
        <SectionCard title="상품 옵션정보 및 가격정보">
          <p className="mb-2 text-[13px] font-semibold text-slate-500">상품 그룹정보</p>
          <Field label="그룹 관리">
            <div className="flex items-center gap-2">
              <input className={boxInput} placeholder="그룹 상품 선택" />
              <Button variant="outline" size="sm">선택</Button>
            </div>
          </Field>
          <div className="ml-28 mt-2 flex flex-wrap gap-1.5"><Chip>갤럭시 Z 폴드8</Chip><Chip>갤럭시 Z 폴드8 울트라</Chip></div>

          <p className="mb-2 mt-5 text-[13px] font-semibold text-slate-500">상품 옵션정보</p>
          <div className="space-y-3">
            <Field label="가입유형"><div className="flex gap-4"><Chk label="기기변경" checked /><Chk label="번호이동" checked /><Chk label="신규가입" checked /></div></Field>
            <Field label="신규/중고"><div className="flex gap-4"><Radio name="cond" label="신규" checked /><Radio name="cond" label="중고" /></div></Field>
          </div>

          <p className="mb-2 mt-5 text-[13px] font-semibold text-slate-500">가격/요금정보</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            <Field label="출고가"><PriceInput /></Field>
            <Field label="할부원금"><PriceInput /></Field>
            <Field label="판매금액"><PriceInput /></Field>
            <Field label="할인금액(기본할인)"><PriceInput /></Field>
            <Field label="약정위약금"><PriceInput /></Field>
            <Field label="바로주문 추가지원금"><PriceInput /></Field>
            <Field label="출고가(예판용)"><PriceInput /></Field>
            <Field label="요금제"><div className="flex gap-2"><input className={boxInput} defaultValue="라이트 요금제" /><Button variant="outline" size="sm">선택</Button></div></Field>
            <Field label="약정유형"><div className="flex gap-4"><Radio name="agr" label="무약정" /><Radio name="agr" label="T기본약정(선약/공통)" checked /></div></Field>
            <Field label="약정기간"><div className="flex gap-4"><Chk label="무약정" /><Chk label="24개월" checked /></div></Field>
          </div>
          <div className="mt-3">
            <Field label="단말할부">
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {['일시불', '3개월', '6개월', '9개월', '10개월', '12개월', '18개월', '24개월', '30개월', '36개월', '48개월'].map((m) => (
                  <Chk key={m} label={m} checked={['일시불', '6개월', '12개월', '18개월', '24개월', '36개월'].includes(m)} />
                ))}
              </div>
            </Field>
          </div>
        </SectionCard>
      )}
    </>
  );
}
function PriceInput() {
  return <div className="flex items-center gap-1"><input className={cn(boxInput, 'text-right')} defaultValue="9,999,999" /><span className="text-[13px] text-muted-foreground">원</span></div>;
}

// ── STEP 2 : 상품콘텐츠 (빌더식) ──
function StepContent() {
  return (
    <div className="flex gap-4">
      {/* 코너 배치 */}
      <div className="w-52 shrink-0 space-y-2">
        <p className="text-[13px] font-bold">템플릿 · 코너 배치 <span className="ml-1 rounded bg-slate-100 px-1 text-[10px] font-medium text-slate-500">기본</span></p>
        <div className="rounded-lg border-2 border-violet-300 bg-violet-50/40 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold">상품형 · 세로형</span>
            <span className="h-4 w-8 rounded-full bg-violet-500" />
          </div>
          <div className="mt-1 flex gap-1"><span className="rounded bg-violet-100 px-1 text-[10px] font-medium text-violet-700">상품형</span><span className="text-[10px] text-slate-400">상품형 · 세로형</span></div>
        </div>
        <button className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed py-2 text-[12px] font-medium text-muted-foreground hover:border-violet-300 hover:text-violet-700"><Plus className="h-3.5 w-3.5" /> Corner 추가</button>
      </div>
      {/* 코너 구성 */}
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
          <span className="flex items-center gap-2 text-[14px] font-bold">코너정보 <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[11px] font-semibold text-violet-700">상품형</span> <span className="text-[12px] font-normal text-slate-400">상품형 · 세로형</span></span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </div>
        <SectionCard title="코너 구성" action={<Button variant="outline" size="sm"><Plus className="mr-1 h-3.5 w-3.5" /> 컴포넌트 추가</Button>}>
          <p className="-mt-2 mb-3 text-[12px] text-muted-foreground">이 코너를 이루는 컴포넌트</p>
          <div className="space-y-2.5">
            {[
              { n: 1, name: '상품1', img: '갤럭시 Z폴드8 이미지.png', text: '손에 잡히는 가벼운 디자인', price: '완전히 새로워진 디자인으로 세상에서 가장 가벼운 폴드를 선보입니다. 무게 단 201g에 불과해 손안에 편안하게 쥘 수 있죠.' },
              { n: 2, name: '상품2', img: '상품2 이미지', text: '상품2', price: '내용' },
              { n: 3, name: '상품3', img: '상품3 이미지', text: '상품3', price: '내용' },
            ].map((c) => (
              <div key={c.n} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-slate-300" />
                  <span className="text-[13px] font-semibold">{c.n} {c.name}</span>
                  <div className="ml-auto flex gap-1.5">
                    <Button variant="outline" size="sm"><Trash2 className="mr-1 h-3 w-3" /> 삭제</Button>
                    <Button variant="outline" size="sm"><PenLine className="mr-1 h-3 w-3" /> 수정</Button>
                  </div>
                </div>
                <div className="space-y-1.5 pl-6 text-[12px]">
                  <div className="flex gap-2"><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">이미지</span><span className="text-slate-600">{c.img}</span></div>
                  <div className="flex gap-2"><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">텍스트</span><span className="text-slate-600">{c.text}</span></div>
                  <div className="flex gap-2"><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">{c.n === 1 ? '가격' : '내용'}</span><span className="text-slate-600">{c.price}</span></div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

// ── STEP 3 : 전시정보 ──
function StepDisplay() {
  return (
    <>
      <SectionCard title="약관동의 정보">
        <Field label="약관"><div className="flex gap-2"><input className={boxInput} placeholder="약관 선택" /><Button variant="outline" size="sm">선택</Button></div></Field>
        <div className="mt-4 overflow-hidden rounded-lg border">
          <table className="w-full text-[12px]">
            <thead className="bg-slate-50 text-slate-500">
              <tr className="[&>th]:px-2 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
                <th>순서변경</th><th>동의 구분</th><th>약관명</th><th>약관 버전</th><th>게시상태</th><th>이용약관 리스트 노출</th><th>관리</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[{ req: '필수', name: '개인정보 제3자 제공 동의', v: 'v1.3' }, { req: '선택', name: '$약관동의명$', v: 'v1.2' }].map((r, i) => (
                <tr key={i} className="[&>td]:px-2 [&>td]:py-2.5">
                  <td><GripVertical className="h-4 w-4 text-slate-300" /></td>
                  <td><span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', r.req === '필수' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500')}>{r.req}</span></td>
                  <td className="text-violet-700">{r.name}</td>
                  <td><Select defaultValue={r.v} className="h-7 text-[11px]"><option>{r.v}</option></Select></td>
                  <td><div className="flex gap-2"><Radio name={`pub${i}`} label="Y" checked /><Radio name={`pub${i}`} label="N" /></div></td>
                  <td><div className="flex items-center gap-2"><Radio name={`list${i}`} label="Y" checked /><Chk label="PC" checked /><Chk label="App/Mw" checked /><Radio name={`list${i}`} label="N" /></div></td>
                  <td><button className="rounded border px-2 py-0.5 text-[11px] text-slate-500 hover:bg-slate-50">삭제</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="검색정보">
        <div className="space-y-3">
          <Field label="검색노출 여부"><span className="inline-flex h-5 w-9 items-center rounded-full bg-violet-500 px-0.5"><span className="ml-auto h-4 w-4 rounded-full bg-white" /></span></Field>
          <Field label="검색키워드 관리"><input className={boxInput} placeholder="최대 10개까지 키워드 입력" /></Field>
          <div className="ml-28 flex flex-wrap gap-1.5">{Array.from({ length: 5 }).map((_, i) => <Chip key={i}>$입력키워드명$</Chip>)}</div>
        </div>
      </SectionCard>

      <SectionCard title="추천정보">
        <Field label="연관/추천상품 관리"><div className="flex gap-2"><input className={boxInput} placeholder="상품명 또는 전시코드 검색" /><Button variant="outline" size="sm">검색</Button></div></Field>
        <div className="ml-28 mt-2 flex flex-wrap gap-1.5">{Array.from({ length: 4 }).map((_, i) => <Chip key={i}>$연관/추천상품 관리$</Chip>)}</div>
      </SectionCard>

      <SectionCard title="전시정보">
        <div className="space-y-3">
          <Field label="전시/판매여부"><div className="flex gap-4"><Radio name="disp" label="전시" checked /><Radio name="disp" label="비전시" /></div></Field>
          <Field label="전시/판매기간">
            <div className="flex items-center gap-2 text-[13px]">
              <input className={cn(boxInput, 'w-32')} defaultValue="2026.08.27" />
              <Select className="w-16"><option>00</option></Select>:<Select className="w-16"><option>00</option></Select>
              <span>–</span>
              <input className={cn(boxInput, 'w-32')} defaultValue="2029.09.01" />
              <Select className="w-16"><option>00</option></Select>:<Select className="w-16"><option>00</option></Select>
            </div>
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="채널정보">
        <div className="space-y-3">
          <Field label="판매채널"><div className="flex gap-4"><Radio name="chn" label="온라인샵" /><Radio name="chn" label="고객Care센터" checked /></div></Field>
          <Field label="상담신청 대상 여부">
            <div className="flex items-center gap-6">
              <div className="flex gap-4"><Radio name="csr" label="Y" checked /><Radio name="csr" label="N" /></div>
              <span className="text-[13px] text-muted-foreground">가입유형</span>
              <div className="flex gap-3"><Chk label="기기변경" checked /><Chk label="번호이동" checked /><Chk label="신규가입" /></div>
            </div>
          </Field>
        </div>
      </SectionCard>
    </>
  );
}

function StepPlaceholder({ title, desc }: { title: string; desc: string }) {
  return (
    <SectionCard title={title} badge="TBD">
      <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
        <p className="text-[14px] font-medium text-slate-500">{title}</p>
        <p className="mt-1 max-w-md text-[13px] text-slate-400">{desc}</p>
      </div>
    </SectionCard>
  );
}
function StepReview() {
  return (
    <SectionCard title="검토 · 등록">
      <div className="space-y-2 text-[13px]">
        {[['상품명', '갤럭시 Z 폴드8'], ['전시코드', '2610245501N'], ['가입유형', '기기변경 · 번호이동 · 신규가입'], ['전시기간', '2026.08.27 ~ 2029.09.01'], ['판매채널', '고객Care센터'], ['상품콘텐츠', '상품형 · 세로형 (컴포넌트 3)']].map(([k, v]) => (
          <div key={k} className="flex gap-3 border-b py-2">
            <span className="w-32 shrink-0 text-muted-foreground">{k}</span><span className="font-medium text-slate-700">{v}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[12px] text-muted-foreground">검수 요청 시 필수값·표기·랜딩을 확인하고 승인 후 게시됩니다.</p>
    </SectionCard>
  );
}

// ── 디바이스 패널 (우측 도킹) ──
function DevicePanel() {
  return (
    <aside className="sticky top-4 hidden w-[380px] shrink-0 xl:block">
      <div className="mb-2 flex items-center justify-between">
        <Select defaultValue="iPhone 15 Pro · 393×852" className="h-8 w-[190px] text-[12px]"><option>iPhone 15 Pro · 393×852</option></Select>
        <div className="flex items-center gap-1 text-[12px] text-muted-foreground"><button className="rounded border px-1.5">−</button> 100% <button className="rounded border px-1.5">+</button><button className="ml-1 rounded border p-1"><Maximize2 className="h-3.5 w-3.5" /></button></div>
      </div>
      <div className="rounded-2xl bg-slate-200/70 p-4">
        <div className="relative mx-auto w-[300px] overflow-hidden rounded-[2rem] border-[6px] border-slate-900 bg-white shadow-xl">
          {/* status bar */}
          <div className="flex items-center justify-between bg-white px-4 pt-2 text-[10px] font-semibold text-slate-800">
            <span>9:41</span><span className="flex items-center gap-1"><Signal className="h-3 w-3" /><Wifi className="h-3 w-3" /><BatteryFull className="h-3.5 w-3.5" /></span>
          </div>
          <div className="flex items-center justify-between px-4 py-2 text-slate-700"><ChevronLeft className="h-4 w-4" /><span className="flex gap-3"><ShoppingBag className="h-4 w-4" /><Menu className="h-4 w-4" /></span></div>
          {/* product */}
          <div className="px-4 pb-4">
            <p className="text-[15px] font-bold">갤럭시 Z 폴드8</p>
            <p className="mt-0.5 text-[11px] text-amber-500">★★★★★ <span className="text-slate-400">5.0 (1,988)</span></p>
            <p className="mt-1 text-[10px] text-slate-400">전문가와 1:1 상담하기 ›</p>
            <div className="my-3 aspect-square rounded-2xl bg-gradient-to-br from-violet-200 to-rose-200" />
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button className="rounded-lg border py-1.5">상품 정보 보기 +</button>
              <button className="rounded-lg border py-1.5">구매 혜택 보기 +</button>
            </div>
            <div className="mt-3 flex items-center justify-around rounded-xl bg-slate-50 py-2 text-center text-[10px] text-slate-500">
              <span>단말<br /><b className="text-slate-700">계산전</b></span><span className="text-slate-300">+</span>
              <span>통신요금<br /><b className="text-slate-700">계산전</b></span><span className="text-slate-300">=</span>
              <span>예상 월 청구금액<br /><b className="text-slate-700">계산전</b></span>
            </div>
            <button className="mt-3 w-full rounded-xl bg-violet-600 py-2.5 text-[12px] font-semibold text-white">색상 선택하기</button>
          </div>
          {/* TBD 오버레이 (목업 기준) */}
          <div className="pointer-events-none absolute inset-x-0 top-1/3 flex flex-col items-center gap-0.5 bg-rose-300/30 py-4 text-center text-[11px] font-bold text-white/90 backdrop-blur-[1px]">
            <span>TBD</span><span>FO 디바이스 설계/디자인</span><span>확인 후 업데이트 필요</span>
          </div>
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">디바이스는 빌더의 &lsquo;가운데&rsquo;가 아니라 <b>우측 도킹</b> — 폼이 주, 미리보기가 보조</p>
    </aside>
  );
}
