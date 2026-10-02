// SB-DSP-MSG-001 문구 관리 — 정책 모델(PI-DSP-CMP-001 / FN-DSP-CMP-001): 문구는 'Atom(표준 단위)'으로 관리.
//  코너가 아니라 문구(Atom/타이틀) 축으로 유형별 나열 → 재사용되므로 관리 대상이 적고, 사용처로 영향 범위 추적.
//  배리에이션(타겟 세그먼트별 후보)·표기 제한은 문구의 속성. 편집은 인컨텍스트, 매칭·성과는 CVM.
import { prisma } from '@/lib/prisma';
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
          corner: { select: { id: true, name: true, mainTitle: true, mainTitleVariants: true } },
        },
      },
    },
  });

  // 축1) 코너 타이틀 — 코너별 mainTitle(+후보). 여기(문구 관리)가 편집 장소.
  //  2026-10-01 재편: 문구 관리는 '코너 타이틀 + 배너 문구' 2축만. CTA/배지/설명 아톰 축 폐기(사용자 결정).
  const byId = new Map<string, MsgItem>();
  for (const t of templates) {
    const usage = `${t.container?.name ?? '컨테이너'} · ${t.name}`;
    for (const tc of t.templateCorners) {
      const c = tc.corner;
      if (!c || !c.mainTitle) continue;
      const u = `${usage} · ${c.name}`;
      const id = `title:${c.id}`;
      const e = byId.get(id);
      if (e) { if (!e.usages.includes(u)) e.usages.push(u); }
      else byId.set(id, { id, kind: 'title', use: '타이틀', label: c.name, base: c.mainTitle, variants: toChips(c.mainTitleVariants), usages: [u], editHref: `/admin/templates/${t.id}/builder`, cornerId: c.id });
    }
  }
  // 배리에이션 많은 문구 → 위로 (관리 우선순위)
  const titleItems = [...byId.values()].sort((a, b) => b.variants.length - a.variants.length);

  // 축2) 배너 문구 — 소유자는 '배너 캠페인 관리'(banner-copy-ssot). 여기선 읽기전용 집계·현황만,
  //  텍스트 편집·베리에이션은 배너 캠페인/빌더로 링크(직접 편집 안 함).
  const campaigns = await prisma.bannerCampaign.findMany({
    orderBy: { updatedAt: 'desc' },
    select: { id: true, campaignCode: true, title: true, subtitle: true, exposeYn: true, approvalStatus: true },
  });
  const APPROVAL_KO: Record<string, string> = { approved: '승인완료', requested: '승인요청', cancelled: '요청취소', rejected: '반려', draft: '임시저장' };
  const bannerItems: MsgItem[] = campaigns
    .filter((c) => (c.title ?? '').trim())
    .map((c) => ({
      id: `banner:${c.id}`, kind: 'atom', use: '배너 문구', label: c.campaignCode,
      base: c.title, subtitle: c.subtitle ?? undefined, variants: [],
      usages: [`${c.exposeYn ? '전시 중' : '전시 중지'} · ${APPROVAL_KO[c.approvalStatus] ?? c.approvalStatus}`],
      editHref: '/admin/banner-campaigns', cornerId: c.id, readOnly: true,
    }));

  const items = [...titleItems, ...bannerItems];

  // 문구 라이브러리(재사용 풀) — 코너 타이틀만 대상(배너 문구는 읽기전용). LibEntry{text,use,target,sources}.
  const libMap = new Map<string, LibEntry>();
  for (const it of titleItems) {
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
