'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { defaultPropsFor, componentDef, cornerAllows, CORNER_TYPE_BY_KEY, componentLabel, GROUP_CORNER } from '@/lib/event-components';
import { TEMPLATE_BY_KEY, insertNodes, createsStateFor, toPromotionSkeleton, PROMOTION_CORNER_PRESET_BY_KEY, type NodeSpec } from '@/lib/event-templates';

const ACTOR = 'marina.kim@sk.com';

function rpEditor(pageId: string) {
  revalidatePath(`/admin/events/pages/${pageId}/builder`);
}

// ─────────────────────────────────────────────────────────────
// 프로젝트 (EventProgram) — 대시보드 / 새 프로젝트
// ─────────────────────────────────────────────────────────────
export async function createProject(formData: FormData) {
  const S = (k: string) => String(formData.get(k) ?? '').trim();
  const name = S('name') || '새 프로젝트';
  const templateKey = S('template') || 'blank';
  const tpl = TEMPLATE_BY_KEY[templateKey] ?? TEMPLATE_BY_KEY.blank;

  // 정책 등록 항목 (PI-EVTMSN-ADMIN-001-02 / SB-EVT-012): 구분·유형·목적·운영기간 +
  //   제휴브랜드·썸네일(+ALT)·전시기간·전시상태·댓글·검색노출/태그·메타태그
  const programKind = S('programKind') || '이벤트';
  const programType = S('programType') || (tpl.eventType || (programKind === '미션' ? '행동완료형' : '안내형'));
  const purpose = S('purpose') || null;
  const startRaw = S('startAt');
  const endRaw = S('endAt');
  const dStartRaw = S('displayStartAt');
  const dEndRaw = S('displayEndAt');
  const dt = (v: string) => (v ? new Date(v) : null);

  const project = await prisma.eventProgram.create({
    data: {
      name,
      programKind,
      programType,
      purpose,
      createsState: createsStateFor(programKind, programType), // 상태 생성 여부 자동
      status: 'active',
      env: 'LOCAL',
      category: programType, // 대시보드 유형 배지 = 대표 유형
      // 운영 기간
      startAt: dt(startRaw),
      endAt: dt(endRaw),
      // SB-EVT-012 기본 정보
      partnerBrand: S('partnerBrand') || null,
      thumbnail: S('thumbnail') || null,
      thumbnailAlt: S('thumbnailAlt') || null,
      displayState: S('displayState') || '미노출',
      commentUse: S('commentUse') === 'on' || S('commentUse') === 'true',
      displayStartAt: dt(dStartRaw),
      displayEndAt: dt(dEndRaw),
      displayNoEndDate: S('displayNoEndDate') === 'on' || S('displayNoEndDate') === 'true',
      // 검색 및 태그
      searchExposed: S('searchExposed') === 'on' || S('searchExposed') === 'true',
      searchTags: S('searchTags') || null,
      metaKeywords: S('metaKeywords') || null,
      metaDescription: S('metaDescription') || null,
      ogTitle: S('ogTitle') || null,
      ogDescription: S('ogDescription') || null,
      ogSiteName: S('ogSiteName') || null,
      ogImage: S('ogImage') || null,
    },
  });
  const page = await prisma.eventPage.create({
    data: { programId: project.id, name: '메인', isDefault: true, status: 'DRAFT', version: 1, pageType: '빌더' },
  });
  await prisma.eventProgram.update({ where: { id: project.id }, data: { defaultPageId: page.id } });
  // 프로모션 골조: 고정 슬롯(썸네일·헤더·CTA) + 자유 구간 섹션(각 모듈 = 코너 1개)
  const built = tpl.build();
  const nodes: NodeSpec[] = built.length ? toPromotionSkeleton(built) : built;
  await insertNodes(prisma, page.id, nodes);
  await prisma.auditLog
    .create({ data: { actor: ACTOR, targetType: 'EventProgram', targetId: project.id, afterValue: JSON.stringify({ name, template: templateKey }), reason: '프로젝트 생성', result: 'CREATED' } })
    .catch(() => {});

  revalidatePath('/admin/events');
  redirect(`/admin/events/pages/${page.id}/builder`);
}

// 휴지통 = 소프트삭제 (컨테이너 정책: 삭제하지 않고 상태로 관리). status=inactive로 내린다.
export async function deleteProject(projectId: string) {
  await prisma.eventProgram.update({ where: { id: projectId }, data: { status: 'inactive' } });
  await prisma.auditLog
    .create({ data: { actor: ACTOR, targetType: 'EventProgram', targetId: projectId, reason: '휴지통으로 이동', result: 'TRASHED' } })
    .catch(() => {});
  revalidatePath('/admin/events');
}

// 휴지통 → 복원
export async function restoreProject(projectId: string) {
  await prisma.eventProgram.update({ where: { id: projectId }, data: { status: 'active' } });
  revalidatePath('/admin/events');
}

// 휴지통 → 영구 삭제 (하드 삭제)
export async function purgeProject(projectId: string) {
  await prisma.eventProgram.update({ where: { id: projectId }, data: { defaultPageId: null } });
  await prisma.eventPage.deleteMany({ where: { programId: projectId } });
  await prisma.eventProgram.delete({ where: { id: projectId } });
  await prisma.auditLog
    .create({ data: { actor: ACTOR, targetType: 'EventProgram', targetId: projectId, reason: '영구 삭제', result: 'DELETED' } })
    .catch(() => {});
  revalidatePath('/admin/events');
}

// 배포 관리 — 전시 상태(노출/미노출) 토글
export async function setDisplayState(projectId: string, displayState: string) {
  await prisma.eventProgram.update({ where: { id: projectId }, data: { displayState } });
  revalidatePath('/admin/events');
}

export async function setProjectEnv(projectId: string, env: string) {
  await prisma.eventProgram.update({ where: { id: projectId }, data: { env } });
  revalidatePath('/admin/events');
}

// AI 클론 — 프로젝트를 페이지·노드까지 통째로 복제
export async function cloneProject(projectId: string) {
  const src = await prisma.eventProgram.findUnique({
    where: { id: projectId },
    include: { defaultPage: { include: { nodes: { orderBy: { order: 'asc' } } } } },
  });
  if (!src) throw new Error('프로젝트를 찾을 수 없습니다.');
  const project = await prisma.eventProgram.create({
    data: { name: `${src.name} (복제)`, programKind: src.programKind, programType: src.programType, status: 'active', env: 'LOCAL', category: src.category },
  });
  const page = await prisma.eventPage.create({ data: { programId: project.id, name: '메인', isDefault: true, status: 'DRAFT', version: 1, pageType: '빌더' } });
  await prisma.eventProgram.update({ where: { id: project.id }, data: { defaultPageId: page.id } });

  // 노드 트리 복제 (parentId 매핑)
  const nodes = src.defaultPage?.nodes ?? [];
  const idMap = new Map<string, string>();
  // 부모 먼저 생성되도록 order 기준 정렬 + 루트→자식 반복
  const pending = [...nodes];
  let guard = 0;
  while (pending.length && guard++ < 10000) {
    const nd = pending.shift()!;
    if (nd.parentId && !idMap.has(nd.parentId)) {
      pending.push(nd);
      continue;
    }
    const created = await prisma.eventNode.create({
      data: { pageId: page.id, parentId: nd.parentId ? idMap.get(nd.parentId)! : null, type: nd.type, order: nd.order, props: nd.props },
    });
    idMap.set(nd.id, created.id);
  }
  revalidatePath('/admin/events');
  redirect(`/admin/events/pages/${page.id}/builder`);
}

// ─────────────────────────────────────────────────────────────
// 노드 (EventNode) — 에디터 컴포넌트 트리
// ─────────────────────────────────────────────────────────────
export async function addNode(pageId: string, type: string, parentId: string | null = null) {
  if (!componentDef(type)) throw new Error('유효한 컴포넌트가 아닙니다.');
  // 거버넌스: 부모가 코너면 그 코너 유형이 허용하는 컴포넌트만 (전시 CORNER_COMPONENT_MAP)
  if (parentId) {
    const parent = await prisma.eventNode.findUnique({ where: { id: parentId }, select: { type: true, props: true } });
    if (parent?.type === 'CORNER') {
      const cornerType = parent.props ? (JSON.parse(parent.props).cornerType as string) : '';
      if (!cornerAllows(cornerType, type)) throw new Error(`${cornerType} 코너에는 ${componentLabel(type)}을(를) 붙일 수 없습니다.`);
    }
  }
  const max = await prisma.eventNode.aggregate({ where: { pageId, parentId }, _max: { order: true } });
  const node = await prisma.eventNode.create({
    data: { pageId, parentId, type, order: (max._max.order ?? -1) + 1, props: JSON.stringify(defaultPropsFor(type)) },
  });
  rpEditor(pageId);
  return node.id;
}

// 페이지 루트에 코너 추가 — 그룹형(자유) 또는 거버넌스 8종(전시와 동일)
export async function addCornerNode(pageId: string, cornerType: string) {
  if (cornerType !== GROUP_CORNER && !CORNER_TYPE_BY_KEY[cornerType]) throw new Error('유효한 코너 유형이 아닙니다.');
  const title = cornerType === GROUP_CORNER ? '새 그룹' : `${cornerType} 코너`;
  const props = { ...defaultPropsFor('CORNER'), cornerType, title };
  const max = await prisma.eventNode.aggregate({ where: { pageId, parentId: null }, _max: { order: true } });
  const node = await prisma.eventNode.create({
    data: { pageId, parentId: null, type: 'CORNER', order: (max._max.order ?? -1) + 1, props: JSON.stringify(props) },
  });
  rpEditor(pageId);
  return node.id;
}

// 프로모션 전용 코너 카탈로그에서 '불러오기' — 프리셋 코너(자유형) + 모듈 스캐폴딩을 페이지 루트에 얹는다.
export async function addPromotionCorner(pageId: string, presetKey: string) {
  const preset = PROMOTION_CORNER_PRESET_BY_KEY[presetKey];
  if (!preset) throw new Error('유효한 프로모션 코너가 아닙니다.');
  const props = { ...defaultPropsFor('CORNER'), cornerType: GROUP_CORNER, title: preset.label };
  const max = await prisma.eventNode.aggregate({ where: { pageId, parentId: null }, _max: { order: true } });
  const corner = await prisma.eventNode.create({
    data: { pageId, parentId: null, type: 'CORNER', order: (max._max.order ?? -1) + 1, props: JSON.stringify(props) },
  });
  if (preset.children.length) await insertNodes(prisma, pageId, preset.children, corner.id);
  rpEditor(pageId);
  return corner.id;
}

export async function updateNodeProps(pageId: string, nodeId: string, patch: Record<string, unknown>) {
  const node = await prisma.eventNode.findUnique({ where: { id: nodeId }, select: { props: true } });
  if (!node) return;
  const cur = node.props ? JSON.parse(node.props) : {};
  const next = { ...cur, ...patch };
  await prisma.eventNode.update({ where: { id: nodeId }, data: { props: JSON.stringify(next) } });
  rpEditor(pageId);
}

export async function deleteNode(pageId: string, nodeId: string) {
  await prisma.eventNode.delete({ where: { id: nodeId } }); // children cascade
  rpEditor(pageId);
}

export async function moveNode(pageId: string, nodeId: string, dir: 'up' | 'down') {
  const node = await prisma.eventNode.findUnique({ where: { id: nodeId } });
  if (!node) return;
  const siblings = await prisma.eventNode.findMany({ where: { pageId, parentId: node.parentId }, orderBy: { order: 'asc' } });
  const idx = siblings.findIndex((s) => s.id === nodeId);
  const swapWith = dir === 'up' ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= siblings.length) return;
  const a = siblings[idx];
  const b = siblings[swapWith];
  await prisma.$transaction([
    prisma.eventNode.update({ where: { id: a.id }, data: { order: b.order } }),
    prisma.eventNode.update({ where: { id: b.id }, data: { order: a.order } }),
  ]);
  rpEditor(pageId);
}

// 노드(+자식) 깊은 복제, 같은 부모 아래 바로 뒤에 배치
export async function duplicateNode(pageId: string, nodeId: string) {
  const root = await prisma.eventNode.findUnique({ where: { id: nodeId } });
  if (!root) return;
  async function cloneRec(srcId: string, parentId: string | null, order: number) {
    const src = await prisma.eventNode.findUnique({ where: { id: srcId }, include: { children: { orderBy: { order: 'asc' } } } });
    if (!src) return;
    const copy = await prisma.eventNode.create({ data: { pageId, parentId, type: src.type, order, props: src.props } });
    let i = 0;
    for (const ch of src.children) await cloneRec(ch.id, copy.id, i++);
  }
  await cloneRec(nodeId, root.parentId, root.order + 0.5);
  // 정수 order로 재정렬
  const sibs = await prisma.eventNode.findMany({ where: { pageId, parentId: root.parentId }, orderBy: { order: 'asc' } });
  await prisma.$transaction(sibs.map((s, i) => prisma.eventNode.update({ where: { id: s.id }, data: { order: i } })));
  rpEditor(pageId);
}

// 페이지 메타 (이름/디바이스)
export async function updatePageMeta(pageId: string, patch: { name?: string; device?: string }) {
  await prisma.eventPage.update({ where: { id: pageId }, data: patch });
  rpEditor(pageId);
}

// ─────────────────────────────────────────────────────────────
// 프로모션(EventProgram) 기본 정보 수정 — 생성 후 '기본 정보 편집' (SB-EVT-012 전 필드)
// ─────────────────────────────────────────────────────────────
export async function updateProgramInfo(programId: string, formData: FormData) {
  const S = (k: string) => String(formData.get(k) ?? '').trim();
  const dt = (v: string) => (v ? new Date(v) : null);
  const bool = (k: string) => S(k) === 'on' || S(k) === 'true';

  const program = await prisma.eventProgram.findUnique({ where: { id: programId }, select: { defaultPageId: true } });
  if (!program) throw new Error('프로모션을 찾을 수 없습니다.');

  const programKind = S('programKind') || '이벤트';
  const programType = S('programType') || '안내형';
  await prisma.eventProgram.update({
    where: { id: programId },
    data: {
      name: S('name') || '새 프로모션',
      programKind,
      programType,
      createsState: createsStateFor(programKind, programType),
      category: programType,
      purpose: S('purpose') || null,
      partnerBrand: S('partnerBrand') || null,
      thumbnail: S('thumbnail') || null,
      thumbnailAlt: S('thumbnailAlt') || null,
      startAt: dt(S('startAt')),
      endAt: dt(S('endAt')),
      displayState: S('displayState') || '미노출',
      commentUse: bool('commentUse'),
      displayStartAt: dt(S('displayStartAt')),
      displayEndAt: bool('displayNoEndDate') ? null : dt(S('displayEndAt')),
      displayNoEndDate: bool('displayNoEndDate'),
      searchExposed: bool('searchExposed'),
      searchTags: S('searchTags') || null,
      metaKeywords: S('metaKeywords') || null,
      metaDescription: S('metaDescription') || null,
      ogTitle: S('ogTitle') || null,
      ogDescription: S('ogDescription') || null,
      ogSiteName: S('ogSiteName') || null,
      ogImage: S('ogImage') || null,
    },
  });
  await prisma.auditLog
    .create({ data: { actor: ACTOR, targetType: 'EventProgram', targetId: programId, reason: '프로모션 기본 정보 수정', result: 'UPDATED' } })
    .catch(() => {});
  revalidatePath('/admin/events');
  if (program.defaultPageId) rpEditor(program.defaultPageId);
}

// ─────────────────────────────────────────────────────────────
// 조건그룹 페이지 (로그인/비로그인) — 전시 컨테이너의 조건그룹별 Template에 대응
//   같은 프로그램이 조건그룹별로 다른 페이지(화면)를 가진다. (EventPage.conditionGroup)
// ─────────────────────────────────────────────────────────────
export async function addConditionPage(programId: string, conditionGroup: string, cloneFromPageId?: string) {
  const exists = await prisma.eventPage.findFirst({ where: { programId, conditionGroup } });
  if (exists) redirect(`/admin/events/pages/${exists.id}/builder`);

  const page = await prisma.eventPage.create({
    data: { programId, name: conditionGroup, conditionGroup, isDefault: false, status: 'DRAFT', version: 1, pageType: '빌더' },
  });

  // 선택: 기존 페이지의 노드 트리를 복제해 시작 (조건그룹만 다른 변형 만들 때 편함)
  if (cloneFromPageId) {
    const src = await prisma.eventNode.findMany({ where: { pageId: cloneFromPageId }, orderBy: { order: 'asc' } });
    const idMap = new Map<string, string>();
    const pending = [...src];
    let guard = 0;
    while (pending.length && guard++ < 10000) {
      const nd = pending.shift()!;
      if (nd.parentId && !idMap.has(nd.parentId)) { pending.push(nd); continue; }
      const created = await prisma.eventNode.create({
        data: { pageId: page.id, parentId: nd.parentId ? idMap.get(nd.parentId)! : null, type: nd.type, order: nd.order, props: nd.props },
      });
      idMap.set(nd.id, created.id);
    }
  }
  revalidatePath('/admin/events');
  redirect(`/admin/events/pages/${page.id}/builder`);
}

// ─────────────────────────────────────────────────────────────
// 임시저장(버전 스냅샷) / 복원 — EventPageVersion
// ─────────────────────────────────────────────────────────────
export async function saveEventDraft(pageId: string, label?: string) {
  const nodes = await prisma.eventNode.findMany({ where: { pageId }, orderBy: { order: 'asc' } });
  const snapshot = JSON.stringify(nodes.map((n) => ({ id: n.id, parentId: n.parentId, type: n.type, order: n.order, props: n.props })));
  const max = await prisma.eventPageVersion.aggregate({ where: { pageId }, _max: { version: true } });
  const version = (max._max.version ?? 0) + 1;
  await prisma.eventPageVersion.create({ data: { pageId, version, label: label ?? '임시저장', snapshot, createdBy: ACTOR } });
  rpEditor(pageId);
}

export async function restoreEventVersion(pageId: string, versionId: string) {
  const ver = await prisma.eventPageVersion.findUnique({ where: { id: versionId } });
  if (!ver || ver.pageId !== pageId) throw new Error('버전을 찾을 수 없습니다.');
  // 복원 전 현재 상태를 자동 스냅샷 (되돌리기 안전장치)
  await saveEventDraft(pageId, '복원 전 자동 저장').catch(() => {});
  type Snap = { id: string; parentId: string | null; type: string; order: number; props: string | null };
  const snap: Snap[] = JSON.parse(ver.snapshot);
  await prisma.eventNode.deleteMany({ where: { pageId } });
  const idMap = new Map<string, string>();
  const pending = [...snap];
  let guard = 0;
  while (pending.length && guard++ < 10000) {
    const nd = pending.shift()!;
    if (nd.parentId && !idMap.has(nd.parentId)) { pending.push(nd); continue; }
    const created = await prisma.eventNode.create({
      data: { pageId, parentId: nd.parentId ? idMap.get(nd.parentId)! : null, type: nd.type, order: nd.order, props: nd.props },
    });
    idMap.set(nd.id, created.id);
  }
  rpEditor(pageId);
}

// 형제 노드 순서 재정렬 (드래그앤드롭) — 같은 parent 안에서 orderedIds 순서대로 order 부여
export async function reorderNodes(pageId: string, orderedIds: string[]) {
  await prisma.$transaction(orderedIds.map((id, i) => prisma.eventNode.update({ where: { id }, data: { order: i } })));
  rpEditor(pageId);
}
