// 프로모션 관리 › 당첨자 관리 — SB Figma(BO-AIM-EVT-PG082). 목록(React). 상세는 추후 단계.
'use client';
import * as React from 'react';
import { PageHeader } from '@/components/page-header';
import { WinnerList } from './winner-list';

export default function WinnersPage() {
  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader trail={['프로모션 관리', '당첨자 관리']} title="당첨자 관리" />
      <div className="mt-6">
        <WinnerList onOpen={() => { /* 상세 화면(추후 단계) */ }} />
      </div>
    </div>
  );
}
