'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

// 디자인 시스템 쇼케이스 — 토큰/컴포넌트/타이포가 Figma대로 나오는지 눈으로 비교하는 페이지.
function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="type-title-20 font-bold text-foreground">{title}</h2>
      {desc && <p className="type-body-13 mt-1 text-muted-foreground">{desc}</p>}
      <div className="mt-4 rounded-xl border bg-card p-6">{children}</div>
    </section>
  );
}

const COLOR_GROUPS: { label: string; tokens: { name: string; cls: string }[] }[] = [
  {
    label: 'Surface / Text',
    tokens: [
      { name: 'surface-default', cls: 'bg-surface-default' },
      { name: 'surface-subtle', cls: 'bg-surface-subtle' },
      { name: 'surface-sunken', cls: 'bg-surface-sunken' },
      { name: 'surface-brand', cls: 'bg-surface-brand' },
      { name: 'text-primary', cls: 'bg-text-primary' },
      { name: 'text-secondary', cls: 'bg-text-secondary' },
    ],
  },
  {
    label: 'Brand (t-blue)',
    tokens: [
      { name: 'color-t-blue-100', cls: 'bg-[var(--color-t-blue-100)]' },
      { name: 'color-t-blue-300', cls: 'bg-[var(--color-t-blue-300)]' },
      { name: 'color-t-blue-500', cls: 'bg-[var(--color-t-blue-500)]' },
      { name: 'color-t-blue-600', cls: 'bg-[var(--color-t-blue-600)]' },
      { name: 'color-t-blue-800', cls: 'bg-[var(--color-t-blue-800)]' },
    ],
  },
  {
    label: 'Status',
    tokens: [
      { name: 'status-info-fill', cls: 'bg-status-info-fill' },
      { name: 'status-success-fill', cls: 'bg-status-success-fill' },
      { name: 'status-warning-fill', cls: 'bg-status-warning-fill' },
      { name: 'status-danger-fill', cls: 'bg-status-danger-fill' },
    ],
  },
];

const TYPE_SCALE = [
  { cls: 'type-display-32', label: 'Display / 32' },
  { cls: 'type-title-28', label: 'Title / 28' },
  { cls: 'type-title-24', label: 'Title / 24' },
  { cls: 'type-title-20', label: 'Title / 20' },
  { cls: 'type-title-18', label: 'Title / 18' },
  { cls: 'type-title-16', label: 'Title / 16' },
  { cls: 'type-body-14', label: 'Body / 14' },
  { cls: 'type-body-13', label: 'Body / 13' },
  { cls: 'type-body-12', label: 'Body / 12' },
];

export default function DesignSystemPage() {
  const [disabled, setDisabled] = useState(false);
  return (
    <main className="h-screen overflow-y-auto bg-background p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="type-title-28 font-bold text-foreground">디자인 시스템</h1>
        <p className="type-body-14 mt-1 text-muted-foreground">Figma 토큰 기반 컴포넌트·타이포·색 쇼케이스 (Pretendard)</p>

        {/* 타이포 */}
        <div className="mt-8" />
        <Section title="타이포그래피" desc="Figma 글자 스타일 (크기·행간·자간). 굵기는 font-* 로 조합.">
          <div className="space-y-3">
            {TYPE_SCALE.map((t) => (
              <div key={t.cls} className="flex items-baseline gap-4">
                <span className="w-24 shrink-0 type-body-12 text-muted-foreground">{t.label}</span>
                <span className={`${t.cls} font-bold text-foreground`}>다람쥐 헌 쳇바퀴 Aa 123</span>
              </div>
            ))}
          </div>
        </Section>

        {/* 버튼 */}
        <Section title="버튼" desc="variant: primary · tblue · outline · ghost · destructive / size: lg · default · sm">
          <div className="mb-4 flex items-center gap-2">
            <label className="type-body-13 flex items-center gap-1.5 text-muted-foreground">
              <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} className="h-3.5 w-3.5 accent-primary" />
              disabled 상태 보기
            </label>
          </div>
          <div className="space-y-4">
            {(['default', 'tblue', 'outline', 'ghost', 'destructive'] as const).map((v) => (
              <div key={v} className="flex flex-wrap items-center gap-3">
                <span className="w-20 shrink-0 type-body-12 text-muted-foreground">{v}</span>
                <Button variant={v} size="lg" disabled={disabled}>Large</Button>
                <Button variant={v} disabled={disabled}>Default</Button>
                <Button variant={v} size="sm" disabled={disabled}>Small</Button>
              </div>
            ))}
          </div>
        </Section>

        {/* 배지 */}
        <Section title="배지" desc="상태/구분 라벨 — emphasis · info · success · warning · highlight · negative · neutral">
          <div className="flex flex-wrap gap-2">
            {(['emphasis', 'info', 'success', 'warning', 'highlight', 'negative', 'neutral', 'outline'] as const).map((v) => (
              <Badge key={v} variant={v}>{v}</Badge>
            ))}
          </div>
        </Section>

        {/* 인풋 */}
        <Section title="인풋" desc="기본 / 포커스 / 비활성">
          <div className="grid max-w-md gap-3">
            <Input placeholder="검색어를 입력하세요" />
            <Input placeholder="비활성 상태" disabled />
          </div>
        </Section>

        {/* 색 */}
        <Section title="색 토큰" desc="시맨틱·브랜드·상태 색 (다크모드에서 자동 전환)">
          <div className="space-y-5">
            {COLOR_GROUPS.map((g) => (
              <div key={g.label}>
                <p className="type-body-12 mb-2 font-semibold text-muted-foreground">{g.label}</p>
                <div className="flex flex-wrap gap-3">
                  {g.tokens.map((t) => (
                    <div key={t.name} className="w-32">
                      <div className={`h-12 rounded-lg border ${t.cls}`} />
                      <p className="type-control-10 mt-1 truncate text-muted-foreground">{t.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </main>
  );
}
