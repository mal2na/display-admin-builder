// 프로모션 관리 › 조건 관리 › 조건 항목 관리 — SB Figma(BO-AIM-EVTMSN). 목록(React). 상세·등록은 다음 단계.
'use client';
import * as React from 'react';
import { PageHeader } from '@/components/page-header';
import { ConditionList } from './condition-list';

export default function ConditionsPage() {
  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader trail={['프로모션 관리', '조건 관리', '조건 항목 관리']} title="조건 항목 관리" />
      <div className="mt-6">
        <ConditionList onOpen={() => { /* 상세(추후) */ }} onRegister={() => { /* 등록(추후) */ }} />
      </div>
    </div>
  );
}
