'use client';

/** 전체페이지 관리 — 상태/사용/노출 칩. 라벨→톤 판정은 한 곳(여기)에서만 한다. */
import { Tag, Hint, Lnk } from './ui';
import {
  type Page, PTYPE, STATE_LABEL, stateKey, foLabel, blockInfo, blockText,
} from '@/lib/page-menu/model';
import { YN } from '@/components/ops-ui';

const STATE_TONE = { rejected: 'negative', url: 'warning', pending: 'warning', temp: 'info', live: 'success' } as const;

export function StateChip({ p }: { p: Page }) {
  const k = stateKey(p);
  return <Tag tone={STATE_TONE[k]}>{STATE_LABEL[k]}</Tag>;
}

/** ~여부 컬럼은 전부 Y/N (2026-10-08). 원래 라벨은 title 로 남긴다. */
export function UseChip({ p }: { p: Page }) {
  return <YN yes={p.use} label={p.use ? '사용' : '미사용'} />;
}

export function FoChip({ p }: { p: Page }) {
  const l = foLabel(p);
  const tone = l === '노출' ? 'success' : l === '승인 대기' ? 'warning' : 'neutral';
  return <Tag tone={tone}>{l}</Tag>;
}

export function TypeChip({ p }: { p: Page }) {
  return <Tag tone={p.ptype === 'builder' ? 'emphasis' : 'neutral'}>{PTYPE[p.ptype]}</Tag>;
}

export function CtLink({ p, onGo }: { p: Page; onGo?: (ct: string) => void }) {
  if (p.ptype !== 'builder' || !p.ct) return <Hint>—</Hint>;
  return <Lnk title="화면 빌더 상세로 이동" onClick={() => onGo?.(p.ct)}>{p.ct}</Lnk>;
}

export function BlockMark({ p }: { p: Page }) {
  const bi = blockInfo(p);
  if (!bi) return null;
  return <span className="ml-1 text-[13px] text-[var(--warn)]" title={blockText(p)}>(서비스 차단)</span>;
}

export function BlockTag({ p }: { p: Page }) {
  const bi = blockInfo(p);
  if (!bi) return null;
  return <Tag tone="warning" title={`${bi.b.from} ~ ${bi.b.to}${bi.self ? '' : ` · 상위 「${bi.src.name}」 차단`}`}>서비스 차단</Tag>;
}
