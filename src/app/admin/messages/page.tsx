// SB-DSP-MSG-001 문구 관리(카탈로그) — 채널 통제 판.
//  전 코너·템플릿의 문구 후보(타이틀·아톰)를 한 화면에서 조망하고 노출/제외를 통제한다.
//  편집(문구 텍스트)은 코너/컴포넌트 인컨텍스트(회의 2026-08-31 결정), 여기선 통제만.
import { prisma } from '@/lib/prisma';
import { MessagesCatalog, type MessageRow, type MsgVariant } from './messages-catalog';

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
      id: true,
      name: true,
      container: { select: { name: true } },
      templateCorners: {
        orderBy: { order: 'asc' },
        select: {
          corner: {
            select: {
              id: true, name: true, mainTitle: true, mainTitleVariants: true,
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

  const titleMap = new Map<string, MessageRow>();
  const atomMap = new Map<string, MessageRow>();
  const addUsage = (row: MessageRow, label: string, tid: string) => {
    if (!row.usages.includes(label)) row.usages.push(label);
    if (!row.editHref) row.editHref = `/admin/templates/${tid}/builder`;
  };

  for (const t of templates) {
    const usageLabel = `${t.container?.name ?? '컨테이너'} · ${t.name}`;
    for (const tc of t.templateCorners) {
      const c = tc.corner;
      if (!c) continue;
      // 타이틀 문구
      if (c.mainTitle) {
        let row = titleMap.get(c.id);
        if (!row) {
          row = { kind: 'title', holderId: c.id, label: c.name, sub: '코너 타이틀', base: c.mainTitle, variants: toChips(c.mainTitleVariants), usages: [], editHref: '' };
          titleMap.set(c.id, row);
        }
        addUsage(row, usageLabel, t.id);
      }
      // 아톰 문구
      for (const cc of c.cornerComponents) {
        for (const ca of cc.component.componentAtoms) {
          const a = ca.atom;
          const isText = !['IMAGE', 'ICON', 'BARCODE'].includes(a.atomType);
          const chips = toChips(a.contentVariants);
          if (isText && (a.content || chips.length)) {
            let row = atomMap.get(a.id);
            if (!row) {
              row = { kind: 'atom', holderId: a.id, label: a.name, sub: `${cc.component.name}`, base: a.content ?? '', variants: chips, usages: [], editHref: '' };
              atomMap.set(a.id, row);
            }
            addUsage(row, usageLabel, t.id);
          }
        }
      }
    }
  }

  // 베리에이션(후보) 있는 문구를 위로
  const rows = [...titleMap.values(), ...atomMap.values()].sort(
    (a, b) => (b.variants.length > 0 ? 1 : 0) - (a.variants.length > 0 ? 1 : 0),
  );

  return <MessagesCatalog rows={rows} />;
}
