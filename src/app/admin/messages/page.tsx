// SB-DSP-MSG-001 문구 관리 — 채널 통제 판.
//  '전부 나열'이 아니라 화면(코너)별로 드릴다운. 코너를 고르면 그 코너의 문구만(소량) 통제.
//  편집(문구 텍스트)은 코너/컴포넌트 인컨텍스트, 세그 매칭·성과는 CVM.
import { prisma } from '@/lib/prisma';
import { ATOM_TYPE_LABELS, type AtomType } from '@/lib/display-taxonomy';
import { MessagesCatalog, type CornerNode, type Slot, type MsgVariant, type LibEntry } from './messages-catalog';

const useOf = (kind: 'title' | 'atom', atomType?: string): string =>
  kind === 'title' ? '타이틀' : (ATOM_TYPE_LABELS[(atomType ?? 'TEXT') as AtomType] ?? '텍스트');

export const dynamic = 'force-dynamic';

function parseVariants(json: string | null): { text: string; target?: string; enabled?: boolean }[] {
  try {
    const a = JSON.parse(json ?? '');
    if (Array.isArray(a)) return a.filter((x) => x && typeof x.text === 'string');
  } catch { /* noop */ }
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

  const byCorner = new Map<string, CornerNode>();
  for (const t of templates) {
    for (const tc of t.templateCorners) {
      const c = tc.corner;
      if (!c) continue;
      let node = byCorner.get(c.id);
      if (!node) {
        const slots: Slot[] = [];
        if (c.mainTitle) slots.push({ kind: 'title', holderId: c.id, label: '코너 타이틀', sub: '타이틀', use: '타이틀', base: c.mainTitle, variants: toChips(c.mainTitleVariants) });
        for (const cc of c.cornerComponents) {
          for (const ca of cc.component.componentAtoms) {
            const a = ca.atom;
            const isText = !['IMAGE', 'ICON', 'BARCODE'].includes(a.atomType);
            const chips = toChips(a.contentVariants);
            if (isText && (a.content || chips.length)) {
              slots.push({ kind: 'atom', holderId: a.id, label: a.name, sub: cc.component.name, use: useOf('atom', a.atomType), base: a.content ?? '', variants: chips });
            }
          }
        }
        node = {
          cornerId: c.id, cornerName: c.name, cornerType: c.cornerType,
          container: t.container?.name ?? '컨테이너', template: t.name,
          editHref: `/admin/templates/${t.id}/builder`,
          slots,
          variantCount: slots.reduce((n, s) => n + s.variants.length, 0),
          excludedCount: slots.reduce((n, s) => n + s.variants.filter((v) => !v.enabled).length, 0),
        };
        byCorner.set(c.id, node);
      }
    }
  }

  // 후보 많은 코너 → 위로 (관리 우선순위)
  const corners = [...byCorner.values()].sort((a, b) => b.variantCount - a.variantCount);

  // 문구 라이브러리 — 규칙: 용도(타이틀/텍스트/설명/CTA)별로 분류하고 같은 용도 슬롯에만 재사용.
  //  항목 = 우리가 author한 문구(기본+후보). key = 용도+텍스트(용도가 다르면 다른 항목). 출처·타겟 태그.
  const libMap = new Map<string, LibEntry>();
  for (const c of corners) for (const s of c.slots) {
    const push = (text: string, target?: string) => {
      if (!text) return;
      const key = `${s.use}::${text}`;
      const e = libMap.get(key);
      if (e) { if (!e.sources.includes(c.cornerName)) e.sources.push(c.cornerName); if (!e.target && target) e.target = target; }
      else libMap.set(key, { text, use: s.use, target, sources: [c.cornerName] });
    };
    push(s.base);
    for (const v of s.variants) push(v.text, v.target);
  }
  const library = [...libMap.values()].sort((a, b) => a.use.localeCompare(b.use, 'ko') || a.text.localeCompare(b.text, 'ko'));

  return <MessagesCatalog corners={corners} library={library} />;
}
