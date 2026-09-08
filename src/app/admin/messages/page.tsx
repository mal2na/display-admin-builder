// SB-DSP-MSG-001 문구 관리 — 정책 모델(PI-DSP-CMP-001 / FN-DSP-CMP-001): 문구는 'Atom(표준 단위)'으로 관리.
//  코너가 아니라 문구(Atom/타이틀) 축으로 유형별 나열 → 재사용되므로 관리 대상이 적고, 사용처로 영향 범위 추적.
//  배리에이션(타겟 세그먼트별 후보)·표기 제한은 문구의 속성. 편집은 인컨텍스트, 매칭·성과는 CVM.
import { prisma } from '@/lib/prisma';
import { ATOM_TYPE_LABELS, type AtomType } from '@/lib/display-taxonomy';
import { MessagesCatalog, type MsgItem, type MsgVariant, type LibEntry } from './messages-catalog';

export const dynamic = 'force-dynamic';

function parseVariants(json: string | null): { text: string; target?: string; enabled?: boolean }[] {
  try { const a = JSON.parse(json ?? ''); if (Array.isArray(a)) return a.filter((x) => x && typeof x.text === 'string'); } catch { /* noop */ }
  return [];
}
const toChips = (json: string | null): MsgVariant[] =>
  parseVariants(json).map((v, i) => ({ text: v.text, target: v.target, enabled: v.enabled !== false, index: i }));

export default async function MessagesPage() {
  const templates = await prisma.template.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true, name: true,
      container: { select: { name: true } },
      templateCorners: {
        orderBy: { order: 'asc' },
        select: {
          corner: {
            select: {
              id: true, name: true, cornerType: true, mainTitle: true, mainTitleVariants: true,
              cornerComponents: {
                select: {
                  component: {
                    select: {
                      name: true,
                      componentAtoms: {
                        orderBy: { order: 'asc' },
                        select: { atom: { select: { id: true, name: true, atomType: true, content: true, contentVariants: true } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  // 문구(Atom/타이틀) 축으로 집계 — Atom은 id로 dedup(재사용 시 사용처 누적), 타이틀은 코너별.
  const byId = new Map<string, MsgItem>();
  for (const t of templates) {
    const usage = `${t.container?.name ?? '컨테이너'} · ${t.name}`;
    for (const tc of t.templateCorners) {
      const c = tc.corner;
      if (!c) continue;
      const href = `/admin/templates/${t.id}/builder`;
      const push = (id: string, kind: 'title' | 'atom', use: string, label: string, base: string, variants: MsgVariant[], cornerId: string) => {
        const u = `${usage} · ${c.name}`;
        const e = byId.get(id);
        if (e) { if (!e.usages.includes(u)) e.usages.push(u); }
        else byId.set(id, { id, kind, use, label, base, variants, usages: [u], editHref: href, cornerId });
      };
      if (c.mainTitle) push(`title:${c.id}`, 'title', '타이틀', c.name, c.mainTitle, toChips(c.mainTitleVariants), c.id);
      for (const cc of c.cornerComponents) {
        for (const ca of cc.component.componentAtoms) {
          const a = ca.atom;
          const isText = !['IMAGE', 'ICON', 'BARCODE'].includes(a.atomType);
          const chips = toChips(a.contentVariants);
          if (isText && (a.content || chips.length)) {
            push(a.id, 'atom', ATOM_TYPE_LABELS[a.atomType as AtomType] ?? '텍스트', a.name, a.content ?? '', chips, c.id);
          }
        }
      }
    }
  }

  // 배리에이션 많은 문구 → 위로 (관리 우선순위)
  const items = [...byId.values()].sort((a, b) => b.variants.length - a.variants.length);

  // 문구 라이브러리(재사용 풀) — 같은 용도만 재사용. LibEntry{text,use,target,sources}.
  const libMap = new Map<string, LibEntry>();
  for (const it of items) {
    const add = (text: string, target?: string) => {
      if (!text) return;
      const key = `${it.use}::${text}`;
      const e = libMap.get(key);
      if (e) { if (!e.sources.includes(it.label)) e.sources.push(it.label); if (!e.target && target) e.target = target; }
      else libMap.set(key, { text, use: it.use, target, sources: [it.label] });
    };
    add(it.base);
    for (const v of it.variants) add(v.text, v.target);
  }
  const library = [...libMap.values()].sort((a, b) => a.use.localeCompare(b.use, 'ko') || a.text.localeCompare(b.text, 'ko'));

  return <MessagesCatalog items={items} library={library} />;
}
