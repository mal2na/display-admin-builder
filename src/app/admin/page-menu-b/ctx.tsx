'use client';

/** 전체페이지 관리 — 뷰 간 공유 컨텍스트(다시 그리기 · 토스트 · 모달 · 이동). */
import * as React from 'react';
import type { ModalSpec } from './ui';
import type { Page } from '@/lib/page-menu/model';

export type View = 'list' | 'ia' | 'detail' | 'create' | 'edit';

export type PmCtx = {
  /** 가변 스토어를 고친 뒤 호출해 다시 그린다 */
  bump: () => void;
  toast: (msg: string) => void;
  modal: (spec: ModalSpec) => void;
  /** 확인 모달 — 제목 + 보조문구 + 확인 콜백 */
  confirmBox: (title: string, sub: string, onOk: () => void, opts?: Partial<ModalSpec>) => void;
  go: (view: View) => void;
  goDetail: (id: string) => void;
  goEdit: (p: Page) => void;
  current: string | null;
  editing: Page | null;
  setEditing: (p: Page | null) => void;
};

export const Ctx = React.createContext<PmCtx | null>(null);
export function usePm(): PmCtx {
  const c = React.useContext(Ctx);
  if (!c) throw new Error('usePm must be used inside PageMenuAdmin');
  return c;
}
