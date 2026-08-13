'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import {
  ATOM_TYPES,
  ATOM_TYPE_LABELS,
  COMPONENT_TYPES,
  CORNER_TYPES,
  CORNER_COMPONENT_MAP,
  isComponentAllowedInCorner,
  type AtomType,
  type ComponentType,
  type CornerType,
} from '@/lib/display-taxonomy';

function rp(templateId: string) {
  revalidatePath(`/admin/templates/${templateId}`);
  revalidatePath(`/admin/templates/${templateId}/builder`);
}

async function nextOrder(model: 'templateCorner' | 'cornerComponent' | 'componentAtom', where: object) {
  // @ts-expect-error dynamic model access
  const agg = await prisma[model].aggregate({ where, _max: { order: true } });
  return (agg._max.order ?? -1) + 1;
}

// ── 빌더 우측 패널: 메타 저장 (저장 시 상태는 '초안 작성중') ──
export async function saveTemplateMeta(templateId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const conditionGroup = String(formData.get('conditionGroup') ?? '').trim();
  const isDefault = String(formData.get('isDefault') ?? '') === 'on';
  const startAtRaw = String(formData.get('startAt') ?? '').trim();
  const endAtRaw = String(formData.get('endAt') ?? '').trim();
  if (!conditionGroup) throw new Error('조건 그룹을 선택/입력하세요.');

  const current = await prisma.template.findUnique({ where: { id: templateId }, select: { containerId: true } });
  if (!current) throw new Error('Template을 찾을 수 없습니다.');

  await prisma.template.update({
    where: { id: templateId },
    data: {
      ...(name ? { name } : {}),
      conditionGroup,
      isDefault,
      startAt: startAtRaw ? new Date(startAtRaw) : null,
      endAt: endAtRaw ? new Date(endAtRaw) : null,
      status: 'DRAFT', // 저장 시 초안 작성중 (ST-DSP-001)
    },
  });

  // 기본 Template 지정/해제 → Container 및 형제 Template 정합성 유지
  if (isDefault) {
    await prisma.$transaction([
      prisma.template.updateMany({
        where: { containerId: current.containerId, id: { not: templateId } },
        data: { isDefault: false },
      }),
      prisma.container.update({ where: { id: current.containerId }, data: { defaultTemplateId: templateId } }),
    ]);
  }
  rp(templateId);
}

// ── Template 메타 ───────────────────────────────────────────
export async function updateTemplateMeta(templateId: string, formData: FormData) {
  const S = (k: string) => String(formData.get(k) ?? '').trim();
  const name = S('name');
  const conditionGroup = S('conditionGroup');
  const startAtRaw = S('startAt');
  const endAtRaw = S('endAt');
  if (!name) throw new Error('템플릿명을 입력하세요.');
  if (!conditionGroup) throw new Error('로그인 구분을 선택하세요.');

  const memo = S('memo') || null;
  const displayOn = S('displayOn') !== '미전시';
  const startAtOnApproval = formData.get('startAtOnApproval') != null;
  const isDefault = S('isDefault') === 'Y';

  const current = await prisma.template.findUnique({ where: { id: templateId }, select: { containerId: true } });
  if (!current) throw new Error('Template을 찾을 수 없습니다.');

  await prisma.template.update({
    where: { id: templateId },
    data: {
      name,
      conditionGroup,
      memo,
      displayOn,
      startAtOnApproval,
      startAt: startAtOnApproval || !startAtRaw ? null : new Date(startAtRaw),
      endAt: endAtRaw ? new Date(endAtRaw) : null,
    },
  });

  // 기본 템플릿 여부 = Y 이면 이 템플릿을 기본으로 승격 (컨테이너는 기본 Template 1개 유지)
  if (isDefault) {
    await prisma.$transaction([
      prisma.template.updateMany({ where: { containerId: current.containerId, id: { not: templateId } }, data: { isDefault: false } }),
      prisma.template.update({ where: { id: templateId }, data: { isDefault: true } }),
      prisma.container.update({ where: { id: current.containerId }, data: { defaultTemplateId: templateId } }),
    ]);
  }

  revalidatePath(`/admin/containers/${current.containerId}`);
  rp(templateId);
}

// Template 로그인 구분(로그인/비로그인 등)만 변경 — 좌측 패널 빠른 토글용 (다른 필드 보존)
export async function setTemplateLogin(templateId: string, conditionGroup: string) {
  if (!conditionGroup.trim()) throw new Error('로그인 구분을 선택하세요.');
  await prisma.template.update({ where: { id: templateId }, data: { conditionGroup: conditionGroup.trim() } });
  rp(templateId);
}

// 헤더에서 템플릿명만 빠르게 변경
export async function renameTemplate(templateId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return;
  await prisma.template.update({ where: { id: templateId }, data: { name } });
  rp(templateId);
}

// ── 템플릿(매핑) 보관 / 복구 (soft-delete) ────────────────────
// 보관: 목록에서 숨기되 레코드·버전은 보존, 복구 가능. 하드 삭제 대신 안전한 제거.
export async function archiveTemplate(templateId: string) {
  const t = await prisma.template.findUnique({
    where: { id: templateId },
    select: { isDefault: true, status: true, containerId: true, archivedAt: true, name: true },
  });
  if (!t) throw new Error('Template을 찾을 수 없습니다.');
  if (t.archivedAt) throw new Error('이미 보관된 템플릿입니다.');
  if (t.isDefault) throw new Error('기본 템플릿은 보관할 수 없습니다. 먼저 다른 템플릿을 기본으로 지정하세요.');
  if (t.status === 'PUBLISHED') throw new Error('게시 중인 템플릿은 보관할 수 없습니다. 게시 중지 후 진행하세요.');
  const activeCount = await prisma.template.count({ where: { containerId: t.containerId, archivedAt: null } });
  if (activeCount <= 1) throw new Error('컨테이너의 유일한 템플릿은 보관할 수 없습니다.');

  await prisma.template.update({ where: { id: templateId }, data: { archivedAt: new Date(), archivedBy: 'marina.kim@sk.com' } });
  await prisma.auditLog.create({
    data: { actor: 'marina.kim@sk.com', targetType: 'Template', targetId: templateId, afterValue: JSON.stringify({ archived: true, name: t.name }), reason: '템플릿(매핑) 보관', result: 'UPDATED' },
  }).catch(() => {});
  revalidatePath(`/admin/containers/${t.containerId}`);
  redirect(`/admin/containers/${t.containerId}`); // 보관 후 컨테이너로 이동
}

export async function restoreTemplate(templateId: string) {
  const t = await prisma.template.findUnique({ where: { id: templateId }, select: { containerId: true, name: true } });
  if (!t) throw new Error('Template을 찾을 수 없습니다.');
  await prisma.template.update({ where: { id: templateId }, data: { archivedAt: null, archivedBy: null } });
  await prisma.auditLog.create({
    data: { actor: 'marina.kim@sk.com', targetType: 'Template', targetId: templateId, afterValue: JSON.stringify({ restored: true, name: t.name }), reason: '템플릿(매핑) 복구' },
  }).catch(() => {});
  revalidatePath(`/admin/containers/${t.containerId}`);
}

// ── 버전 스냅샷 (임시저장 / 되돌리기 — PG-DSP-RBK-001) ──────────
// 현재 템플릿 구조(meta + corners→components→atoms)를 JSON으로 직렬화
async function serializeTemplate(templateId: string) {
  const t = await prisma.template.findUnique({
    where: { id: templateId },
    include: {
      templateCorners: {
        orderBy: { order: 'asc' },
        include: {
          corner: {
            include: {
              cornerComponents: {
                orderBy: { order: 'asc' },
                include: { component: { include: { componentAtoms: { orderBy: { order: 'asc' }, include: { atom: true } } } } },
              },
            },
          },
        },
      },
    },
  });
  if (!t) throw new Error('Template을 찾을 수 없습니다.');
  const cornerFields = (c: (typeof t.templateCorners)[number]['corner']) => ({
    name: c.name, cornerType: c.cornerType, typeLabel: c.typeLabel, title: c.title, maxItems: c.maxItems,
    sortStrategy: c.sortStrategy, status: c.status, markupId: c.markupId, layoutDetail: c.layoutDetail,
    cornerLayout: c.cornerLayout, description: c.description, mainTitle: c.mainTitle, subTitle: c.subTitle,
    subTitleIcon: c.subTitleIcon, minItems: c.minItems, noDisplayCondition: c.noDisplayCondition,
    moreButtonUse: c.moreButtonUse, moreButtonLabel: c.moreButtonLabel, moreButtonLink: c.moreButtonLink, bannerId: c.bannerId,
  });
  return {
    meta: { name: t.name, conditionGroup: t.conditionGroup, memo: t.memo, displayOn: t.displayOn, startAtOnApproval: t.startAtOnApproval, startAt: t.startAt, endAt: t.endAt },
    corners: t.templateCorners.map((tc) => ({
      order: tc.order,
      visible: tc.visible,
      corner: cornerFields(tc.corner),
      components: tc.corner.cornerComponents.map((cc) => ({
        order: cc.order,
        component: { name: cc.component.name, componentType: cc.component.componentType, description: cc.component.description, status: cc.component.status, selectedIndex: cc.component.selectedIndex, chipRows: cc.component.chipRows, allowedCornerTypes: cc.component.allowedCornerTypes },
        atoms: cc.component.componentAtoms.map((ca) => ({
          order: ca.order,
          isRequired: ca.isRequired,
          atom: { name: ca.atom.name, atomType: ca.atom.atomType, content: ca.atom.content, imageUrl: ca.atom.imageUrl, altText: ca.atom.altText, linkUrl: ca.atom.linkUrl, status: ca.atom.status },
        })),
      })),
    })),
  };
}

// 임시저장: 현재 상태를 버전 스냅샷으로 기록 (라이브 구조는 그대로, 되돌릴 수 있는 복원 지점 생성)
export async function saveTemplateSnapshot(templateId: string, label = '임시저장') {
  const snap = await serializeTemplate(templateId);
  const t = await prisma.template.update({ where: { id: templateId }, data: { version: { increment: 1 }, status: 'DRAFT' }, select: { version: true } });
  await prisma.templateVersion.create({ data: { templateId, version: t.version, label, snapshot: JSON.stringify(snap), createdBy: 'marina.kim@sk.com' } });
  rp(templateId);
}

// 버전 되돌리기: 선택한 스냅샷으로 구조를 복원 (되돌리기 전 현재 상태를 자동 스냅샷)
export async function rollbackToVersion(templateId: string, versionId: string) {
  const v = await prisma.templateVersion.findUnique({ where: { id: versionId } });
  if (!v || v.templateId !== templateId) throw new Error('버전을 찾을 수 없습니다.');
  const snap = JSON.parse(v.snapshot) as Awaited<ReturnType<typeof serializeTemplate>>;

  // 되돌리기 전 현재 상태 자동 저장 (되돌리기 자체도 되돌릴 수 있게)
  await saveTemplateSnapshot(templateId, '되돌리기 전 자동저장');

  // 유효한 배너 id만 복원 (그 사이 삭제된 배너 대비)
  const bannerIds = [...new Set(snap.corners.map((c) => c.corner.bannerId).filter(Boolean) as string[])];
  const validBanners = new Set((await prisma.banner.findMany({ where: { id: { in: bannerIds } }, select: { id: true } })).map((b) => b.id));

  const cur = await prisma.templateCorner.findMany({ where: { templateId }, select: { cornerId: true } });

  await prisma.$transaction(async (tx) => {
    // 1) 현재 링크 제거 후, 다른 템플릿이 안 쓰는 기존 코너 삭제(cascade cornerComponents)
    await tx.templateCorner.deleteMany({ where: { templateId } });
    for (const c of cur) {
      const others = await tx.templateCorner.count({ where: { cornerId: c.cornerId } });
      if (others === 0) await tx.corner.delete({ where: { id: c.cornerId } });
    }
    // 2) 스냅샷에서 코너/컴포넌트/Atom을 새 레코드로 재생성
    for (const sc of snap.corners) {
      const corner = await tx.corner.create({
        data: { ...sc.corner, bannerId: sc.corner.bannerId && validBanners.has(sc.corner.bannerId) ? sc.corner.bannerId : null },
      });
      for (const scc of sc.components) {
        const component = await tx.component.create({ data: { ...scc.component } });
        for (const sca of scc.atoms) {
          const atom = await tx.atom.create({ data: { ...sca.atom } });
          await tx.componentAtom.create({ data: { componentId: component.id, atomId: atom.id, order: sca.order, isRequired: sca.isRequired } });
        }
        await tx.cornerComponent.create({ data: { cornerId: corner.id, componentId: component.id, order: scc.order } });
      }
      await tx.templateCorner.create({ data: { templateId, cornerId: corner.id, order: sc.order, visible: sc.visible } });
    }
    // 3) meta 복원 (상태는 초안 작성중)
    await tx.template.update({
      where: { id: templateId },
      data: {
        name: snap.meta.name, conditionGroup: snap.meta.conditionGroup, memo: snap.meta.memo,
        displayOn: snap.meta.displayOn, startAtOnApproval: snap.meta.startAtOnApproval,
        startAt: snap.meta.startAt ? new Date(snap.meta.startAt) : null,
        endAt: snap.meta.endAt ? new Date(snap.meta.endAt) : null,
        status: 'DRAFT',
      },
    });
  });

  await prisma.auditLog.create({
    data: { actor: 'marina.kim@sk.com', targetType: 'Template', targetId: templateId, afterValue: JSON.stringify({ rolledBackTo: v.version, label: v.label }), reason: `버전 되돌리기 (v${v.version})` },
  }).catch(() => {});
  rp(templateId);
}

// ── Corner (Template 바디에 쌓기) ───────────────────────────
export async function addExistingCorner(templateId: string, formData: FormData) {
  const cornerId = String(formData.get('cornerId') ?? '');
  if (!cornerId) throw new Error('Corner를 선택하세요.');
  const exists = await prisma.templateCorner.findUnique({
    where: { templateId_cornerId: { templateId, cornerId } },
  });
  if (exists) {
    rp(templateId);
    return;
  }
  const order = await nextOrder('templateCorner', { templateId });
  await prisma.templateCorner.create({ data: { templateId, cornerId, order } });
  rp(templateId);
}

const nn = (formData: FormData, k: string) => {
  const v = String(formData.get(k) ?? '').trim();
  return v.length ? v : null;
};

function readCornerInfo(formData: FormData) {
  const maxItemsRaw = String(formData.get('maxItems') ?? '').trim();
  const minItemsRaw = String(formData.get('minItems') ?? '').trim();
  return {
    minItems: minItemsRaw ? Number(minItemsRaw) : null,
    noDisplayCondition: nn(formData, 'noDisplayCondition'),
    moreButtonUse: String(formData.get('moreButtonUse') ?? '') === '사용',
    moreButtonLabel: nn(formData, 'moreButtonLabel'),
    moreButtonLink: nn(formData, 'moreButtonLink'),
    markupId: nn(formData, 'markupId'),
    layoutDetail: nn(formData, 'layoutDetail'),
    bannerPosition: nn(formData, 'bannerPosition'),
    cornerLayout: nn(formData, 'cornerLayout'),
    description: nn(formData, 'description'),
    mainTitle: nn(formData, 'mainTitle'),
    subTitle: nn(formData, 'subTitle'),
    subTitleIcon: nn(formData, 'subTitleIcon'),
    sortStrategy: nn(formData, 'sortStrategy'),
    title: nn(formData, 'title'),
    maxItems: maxItemsRaw ? Number(maxItemsRaw) : null,
  };
}

export async function createCorner(templateId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const cornerType = String(formData.get('cornerType') ?? '');
  if (!name) throw new Error('이름을 입력하세요.');
  if (!(CORNER_TYPES as readonly string[]).includes(cornerType)) throw new Error('유효한 Corner 유형이 아닙니다.');
  const info = readCornerInfo(formData);
  const corner = await prisma.corner.create({
    data: { name, cornerType, ...info, sortStrategy: info.sortStrategy ?? 'MANUAL' },
  });
  const order = await nextOrder('templateCorner', { templateId });
  await prisma.templateCorner.create({ data: { templateId, cornerId: corner.id, order } });
  rp(templateId);
}

// ── 유형 → 코너 구성 스캐폴드 ──────────────────────────────────────────────
// 코너 유형(컴포넌트 유형·배열 상세)에 맞춰 대표 Component + Atom을 생성한다.
// 불러오기 시 '코너 구성'이 비어 있지 않고, 미리보기가 유형 형태대로 보이게 하기 위함(운영자가 이후 편집).
type ScaffoldAtom = { name: string; atomType: string; content?: string; imageUrl?: string; altText?: string; linkUrl?: string };
type ScaffoldComp = { name: string; componentType: ComponentType; atoms: ScaffoldAtom[]; chipRows?: number; selectedIndex?: number };

function scaffoldSpecFor(componentType: string | null, typeDetail: string | null): ScaffoldComp[] {
  const ct = (componentType ?? '') as ComponentType | '';
  const d = typeDetail ?? '';
  const tabComp: ScaffoldComp = {
    name: '카테고리 탭',
    componentType: '선택형',
    selectedIndex: 0,
    atoms: ['전체', '카테고리1', '카테고리2', '카테고리3'].map((c) => ({ name: c, atomType: 'TEXT', content: c })),
  };
  const productComp = (i: number): ScaffoldComp => ({
    name: `상품 ${i}`,
    componentType: '상품형',
    atoms: [
      { name: '상품 이미지', atomType: 'IMAGE', imageUrl: '', altText: `상품 ${i} 이미지` },
      { name: '상품명', atomType: 'TEXT', content: `상품 ${i}` },
      { name: '가격', atomType: 'PRICE', content: '가격' },
    ],
  });
  const benefitComp = (i: number): ScaffoldComp => ({
    name: `혜택 ${i}`,
    componentType: '혜택형',
    atoms: [
      { name: '로고', atomType: 'ICON', imageUrl: '', altText: `브랜드 ${i}` },
      { name: '혜택 문구', atomType: 'BENEFIT_TEXT', content: `혜택 ${i} 문구를 입력하세요` },
      { name: '브랜드', atomType: 'INFO', content: `브랜드 ${i}` },
    ],
  });

  let comps: ScaffoldComp[] = [];
  switch (ct) {
    case '선택형':
      comps = [tabComp];
      break;
    case '상품형':
      comps = d.includes('단일') ? [productComp(1)] : [productComp(1), productComp(2), productComp(3)];
      break;
    case '배너형':
      comps = [
        {
          name: '배너',
          componentType: '배너형',
          atoms: [
            { name: '배너 타이틀', atomType: 'TEXT', content: '배너 타이틀' },
            { name: '배너 설명', atomType: 'INFO', content: '배너 설명 문구' },
            { name: '배너 CTA', atomType: 'CTA', content: '자세히 보기', linkUrl: '/' },
            { name: '배너 이미지', atomType: 'IMAGE', imageUrl: '', altText: '배너 이미지' },
          ],
        },
      ];
      break;
    case '혜택형':
      comps = [benefitComp(1), benefitComp(2), benefitComp(3)];
      break;
    case '정보형':
      comps = [
        {
          name: '정보 카드',
          componentType: '정보형',
          // 아이콘형 상태카드 기준: 아이콘 + 값(가격) + 상태(배지) + 라벨(텍스트) → 와이어프레임과 원자 유형 일치
          atoms: [
            { name: '아이콘', atomType: 'ICON', imageUrl: 'icon:general/Info', altText: '아이콘' },
            { name: '값', atomType: 'PRICE', content: '주요 값' },
            { name: '상태', atomType: 'BADGE', content: '상태' },
            { name: '라벨', atomType: 'TEXT', content: '라벨' },
          ],
        },
      ];
      break;
    case '행동형':
      comps = [
        {
          name: '바로가기',
          componentType: '행동형',
          atoms: [
            { name: '제목', atomType: 'TEXT', content: '업무 바로가기' },
            { name: '버튼', atomType: 'CTA', content: '바로가기', linkUrl: '/' },
          ],
        },
      ];
      break;
    default:
      comps = [];
  }
  // 배열 상세에 '카테고리탭'이 있고 주 컴포넌트가 선택형이 아니면 상단 탭을 얹는다(예: 상품형·세로형(카테고리탭)).
  if (/카테고리\s*탭/.test(d) && ct !== '선택형' && comps.length) comps = [tabComp, ...comps];
  return comps;
}

// 스캐폴드 스펙대로 Component/Atom/CornerComponent 생성. 코너 유형이 허용하지 않는 컴포넌트는 건너뛴다.
async function createScaffoldComponents(cornerId: string, cornerType: string, specs: ScaffoldComp[]) {
  let order = 0;
  for (const spec of specs) {
    if (!isComponentAllowedInCorner(cornerType as CornerType, spec.componentType)) continue;
    const comp = await prisma.component.create({
      data: {
        name: spec.name,
        componentType: spec.componentType,
        status: 'active',
        ...(spec.chipRows != null ? { chipRows: spec.chipRows } : {}),
        ...(spec.selectedIndex != null ? { selectedIndex: spec.selectedIndex } : {}),
      },
    });
    for (let i = 0; i < spec.atoms.length; i++) {
      const a = spec.atoms[i];
      const atom = await prisma.atom.create({ data: { ...a, status: 'active' } });
      await prisma.componentAtom.create({ data: { componentId: comp.id, atomId: atom.id, order: i, isRequired: true } });
    }
    await prisma.cornerComponent.create({ data: { cornerId, componentId: comp.id, order } });
    order += 1;
  }
}

// 등록된 코너 유형(카탈로그) 1건 → 새 Corner 인스턴스 생성. createCornerFromType / swapCornerToType 공용.
async function createCornerInstanceFromTypeId(cornerTypeId: string) {
  const ct = cornerTypeId ? await prisma.cornerType.findUnique({ where: { id: cornerTypeId } }) : null;
  if (!ct) throw new Error('등록된 코너 유형을 찾을 수 없습니다.');
  if (!(CORNER_TYPES as readonly string[]).includes(ct.baseCategory)) throw new Error('유효한 Corner 유형이 아닙니다.');

  const isComposite = ct.baseCategory === '개인화 추천형';
  const baseName = ct.baseCategory; // 코너 이름 = 코너 유형과 동치(별칭 미사용)
  const nameParts = [ct.typeDetail, ct.bigBanner ? '빅배너' : ''].filter(Boolean);
  const name = nameParts.length ? `${baseName} · ${nameParts.join(' · ')}` : baseName;
  // 전시화면 코너의 배열명에는 빅배너를 마커로 유지(렌더/기존 시드와 일관)
  const cornerLayoutDetail = ct.bigBanner ? `${ct.typeDetail ?? ''} · 빅배너`.trim().replace(/^· /, '') : ct.typeDetail;

  // 타입-레벨 기본값 상속(템플릿 강화) — 항목 사용여부 토글이 켜진 것만 채우고, 코너별 수정은 자유.
  const moreOn = ct.defaultMoreButton && ct.useMoreButton;
  const corner = await prisma.corner.create({
    data: {
      name,
      cornerType: ct.baseCategory,
      typeLabel: isComposite ? baseName : null,
      layoutDetail: cornerLayoutDetail, // 유형 상세 (+ 빅배너 마커)
      cornerLayout: ct.layout, // 등록된 코너 레이아웃 상속 → 미리보기 형태가 등록 유형과 일치
      markupId: ct.markupId,
      description: ct.description,
      // 노출 개수(최소/최대)는 타입에서 상속하지 않는다 — 빌더에서 코너별로 설정
      sortStrategy: ct.defaultSortStrategy ?? 'MANUAL',
      moreButtonUse: moreOn,
      moreButtonLabel: moreOn ? (ct.defaultMoreButtonLabel ?? '더보기') : null,
      // 코너 유형 관리의 유형 샘플 썸네일을 코너에 상속(카드/참고용) — 컴포넌트가 생기면 미리보기는 컴포넌트로 렌더
      sampleImageUrl: ct.sampleImageUrl,
    },
  });
  // 유형의 컴포넌트 유형·배열에 맞춰 '코너 구성'을 스캐폴딩(불러오면 코너 정보 + 코너 구성이 실제로 채워짐)
  await createScaffoldComponents(corner.id, ct.baseCategory, scaffoldSpecFor(ct.componentType, ct.typeDetail));
  return corner;
}

// 등록된 코너 유형(코너 유형 관리 카탈로그)을 그대로 상속해 코너 추가.
// base + 유형상세뿐 아니라 코너 레이아웃(가로 SWIPE형 등)·마크업·설명까지 등록된 "형태"를 반영한다.
export async function createCornerFromType(templateId: string, formData: FormData) {
  const cornerTypeId = String(formData.get('cornerTypeId') ?? '').trim();
  const corner = await createCornerInstanceFromTypeId(cornerTypeId);
  const order = await nextOrder('templateCorner', { templateId });
  await prisma.templateCorner.create({ data: { templateId, cornerId: corner.id, order } });
  rp(templateId);
}

// 코너 불러오기(슬롯 교체) — 코너 유형 관리 카탈로그에서 고른 유형으로 이 슬롯을 교체한다.
// 기존 인스턴스 재사용(swapCornerRef)이 아니라, 등록된 유형의 형태를 그대로 상속한 새 코너로 채운다.
export async function swapCornerToType(templateId: string, templateCornerId: string, formData: FormData) {
  const cornerTypeId = String(formData.get('cornerTypeId') ?? '').trim();
  if (!cornerTypeId) return;
  const corner = await createCornerInstanceFromTypeId(cornerTypeId);
  await prisma.templateCorner.update({ where: { id: templateCornerId }, data: { cornerId: corner.id } });
  rp(templateId);
}

// 코너 정보 편집 (코너1·코너2 컬럼)
export async function updateCornerMeta(templateId: string, cornerId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const cornerType = String(formData.get('cornerType') ?? '');
  if (!name) throw new Error('코너명을 입력하세요.');
  if (!(CORNER_TYPES as readonly string[]).includes(cornerType)) throw new Error('유효한 Corner 유형이 아닙니다.');

  // 유형 변경 시 이미 배치된 Component가 새 유형에 허용되는지 검증 (PI-DSP-CMP-003)
  const existing = await prisma.cornerComponent.findMany({
    where: { cornerId },
    include: { component: { select: { componentType: true, name: true } } },
  });
  for (const cc of existing) {
    if (!isComponentAllowedInCorner(cornerType as CornerType, cc.component.componentType as ComponentType)) {
      throw new Error(
        `유형을 ${cornerType}(으)로 바꾸면 배치된 "${cc.component.name}"(${cc.component.componentType})이(가) 허용되지 않습니다. 먼저 해당 Component를 제거하세요.`,
      );
    }
  }

  const info = readCornerInfo(formData);
  await prisma.corner.update({ where: { id: cornerId }, data: { name, cornerType, ...info } });
  // 코너에서 유형/유형상세를 바꾸면 '코너 유형 관리' 카탈로그에도 동일 유형을 정리(없으면 등록)
  await ensureCornerTypeCatalog(cornerType, info.layoutDetail ?? null, info.cornerLayout ?? null, info.markupId ?? null);
  rp(templateId);
}

// 코너의 (기준분류 · 유형상세) 조합을 코너 유형 관리 카탈로그에 정리한다.
// 이미 같은 조합이 있으면 그대로 두고, 없으면 새 유형으로 등록한다 → 코너 변경이 카탈로그에 반영된다.
async function ensureCornerTypeCatalog(
  baseCategory: string,
  typeDetail: string | null,
  layout: string | null,
  markupId: string | null,
) {
  const detail = typeDetail?.trim() || null;
  const existing = await prisma.cornerType.findFirst({ where: { baseCategory, typeDetail: detail } });
  if (existing) return;
  const count = await prisma.cornerType.count();
  const typeId = 'CY' + String(count + 1).padStart(7, '0');
  const baseName = baseCategory; // 코너 유형 관리 이름 = 코너 유형과 동치(별칭 미사용)
  // 같은 기준분류가 이미 있으면 유형상세를 붙여 구분, 없으면 기본 이름
  const sameBase = await prisma.cornerType.count({ where: { baseCategory } });
  const name = detail && sameBase > 0 ? `${baseName} · ${detail}` : baseName;
  await prisma.cornerType.create({
    data: {
      typeId,
      name,
      baseCategory,
      typeDetail: detail,
      layout: layout || null,
      markupId: markupId || null,
      channels: 'FO',
      platforms: '모바일',
      active: true,
      status: 'APPROVED',
      createdBy: '김마리나',
    },
  });
  revalidatePath('/admin/corner-types');
}

export async function removeCorner(templateId: string, templateCornerId: string) {
  await prisma.templateCorner.delete({ where: { id: templateCornerId } });
  rp(templateId);
}

// 코너 복제 (포탈3 복제) — 코너를 통째로 복사해 바로 뒤에 삽입
export async function duplicateCorner(templateId: string, templateCornerId: string) {
  const tc = await prisma.templateCorner.findUnique({
    where: { id: templateCornerId },
    include: { corner: { include: { cornerComponents: { orderBy: { order: 'asc' } } } } },
  });
  if (!tc) throw new Error('복제할 코너를 찾을 수 없습니다.');
  const s = tc.corner;
  const copy = await prisma.corner.create({
    data: {
      name: `${s.name} (복사본)`,
      cornerType: s.cornerType,
      title: s.title,
      maxItems: s.maxItems,
      sortStrategy: s.sortStrategy,
      status: 'active',
      markupId: s.markupId,
      layoutDetail: s.layoutDetail,
      cornerLayout: s.cornerLayout,
      description: s.description,
      mainTitle: s.mainTitle,
      subTitle: s.subTitle,
      subTitleIcon: s.subTitleIcon,
      minItems: s.minItems,
      noDisplayCondition: s.noDisplayCondition,
      moreButtonUse: s.moreButtonUse,
      moreButtonLabel: s.moreButtonLabel,
      moreButtonLink: s.moreButtonLink,
      bannerId: s.bannerId,
    },
  });
  if (s.cornerComponents.length) {
    await prisma.cornerComponent.createMany({
      data: s.cornerComponents.map((cc) => ({ cornerId: copy.id, componentId: cc.componentId, order: cc.order })),
    });
  }
  const insertAt = tc.order + 1;
  await prisma.templateCorner.updateMany({
    where: { templateId, order: { gte: insertAt } },
    data: { order: { increment: 1 } },
  });
  await prisma.templateCorner.create({ data: { templateId, cornerId: copy.id, order: insertAt } });
  rp(templateId);
}

// 코너 노출/비노출 토글 (전시 여부)
export async function toggleCornerVisible(templateId: string, templateCornerId: string) {
  const tc = await prisma.templateCorner.findUnique({ where: { id: templateCornerId }, select: { visible: true } });
  if (!tc) return;
  await prisma.templateCorner.update({ where: { id: templateCornerId }, data: { visible: !tc.visible } });
  rp(templateId);
}

export async function reorderCorners(templateId: string, orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, i) => prisma.templateCorner.update({ where: { id }, data: { order: i } })),
  );
  rp(templateId);
}

// ── Component (Corner에 올리기) ─────────────────────────────
async function assertAllowed(cornerId: string, componentId: string) {
  const [corner, component] = await Promise.all([
    prisma.corner.findUnique({ where: { id: cornerId }, select: { cornerType: true } }),
    prisma.component.findUnique({ where: { id: componentId }, select: { componentType: true, allowedCornerTypes: true, name: true } }),
  ]);
  if (!corner || !component) throw new Error('대상을 찾을 수 없습니다.');
  if (!isComponentAllowedInCorner(corner.cornerType as CornerType, component.componentType as ComponentType)) {
    throw new Error(`[PI-DSP-CMP-003] ${component.name}(${component.componentType})은(는) ${corner.cornerType} 코너에 배치할 수 없습니다.`);
  }
  const allowed: string[] = component.allowedCornerTypes ? JSON.parse(component.allowedCornerTypes) : [];
  if (allowed.length && !allowed.includes(corner.cornerType)) {
    throw new Error(`${component.name}은(는) ${corner.cornerType} 코너 사용이 허용되지 않았습니다.`);
  }
}

export async function addExistingComponent(templateId: string, cornerId: string, formData: FormData) {
  const componentId = String(formData.get('componentId') ?? '');
  if (!componentId) throw new Error('Component를 선택하세요.');
  await assertAllowed(cornerId, componentId);
  const exists = await prisma.cornerComponent.findUnique({
    where: { cornerId_componentId: { cornerId, componentId } },
  });
  if (!exists) {
    const order = await nextOrder('cornerComponent', { cornerId });
    await prisma.cornerComponent.create({ data: { cornerId, componentId, order } });
  }
  rp(templateId);
}

export async function createComponent(templateId: string, cornerId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const componentType = String(formData.get('componentType') ?? '');
  if (!name) throw new Error('이름을 입력하세요.');
  if (!(COMPONENT_TYPES as readonly string[]).includes(componentType)) throw new Error('유효한 Component 유형이 아닙니다.');
  const corner = await prisma.corner.findUnique({ where: { id: cornerId }, select: { cornerType: true } });
  if (!corner) throw new Error('Corner를 찾을 수 없습니다.');
  if (!isComponentAllowedInCorner(corner.cornerType as CornerType, componentType as ComponentType)) {
    throw new Error(`[PI-DSP-CMP-003] ${componentType}은(는) ${corner.cornerType} 코너에 배치할 수 없습니다.`);
  }
  const component = await prisma.component.create({ data: { name, componentType, status: 'active' } });
  const order = await nextOrder('cornerComponent', { cornerId });
  await prisma.cornerComponent.create({ data: { cornerId, componentId: component.id, order } });
  rp(templateId);
}

// 코너의 첫 컴포넌트와 동일한 Atom 구성(유형)을, 값 없이 비워서 새 컴포넌트로 추가.
// (예: 상품형 코너 → 인크레더블3의 이미지/텍스트/정보값 구성을 빈 상태로 복제)
export async function addBlankComponent(templateId: string, cornerId: string) {
  const corner = await prisma.corner.findUnique({
    where: { id: cornerId },
    select: {
      cornerType: true,
      cornerComponents: {
        orderBy: { order: 'asc' },
        take: 1,
        include: { component: { include: { componentAtoms: { orderBy: { order: 'asc' }, include: { atom: true } } } } },
      },
    },
  });
  if (!corner) throw new Error('Corner를 찾을 수 없습니다.');
  const first = corner.cornerComponents[0]?.component;
  const allowed = CORNER_COMPONENT_MAP[corner.cornerType as CornerType] ?? [];
  const componentType = first?.componentType ?? allowed[0] ?? '정보형';
  // 복제할 Atom 유형 구성 (첫 컴포넌트 기준, 없으면 상품형 기본: 이미지/텍스트/정보값).
  // 이름은 유형 라벨로 일반화해 값 없는 "빈 항목"으로 만든다.
  const label = (t: string) => ATOM_TYPE_LABELS[t as AtomType] ?? t;
  const atomSpec = first
    ? first.componentAtoms.map((ca) => ({ atomType: ca.atom.atomType, name: label(ca.atom.atomType), isRequired: ca.isRequired }))
    : [
        { atomType: 'IMAGE', name: '이미지', isRequired: true },
        { atomType: 'TEXT', name: '텍스트', isRequired: true },
        { atomType: 'INFO', name: '정보값', isRequired: true },
      ];

  const component = await prisma.component.create({ data: { name: '새 항목', componentType, status: 'active' } });
  // 빈 Atom들 생성 후 컴포넌트에 순서대로 연결
  for (let i = 0; i < atomSpec.length; i++) {
    const spec = atomSpec[i];
    const atom = await prisma.atom.create({ data: { name: spec.name, atomType: spec.atomType, status: 'active' } });
    await prisma.componentAtom.create({ data: { componentId: component.id, atomId: atom.id, order: i, isRequired: spec.isRequired } });
  }
  const order = await nextOrder('cornerComponent', { cornerId });
  await prisma.cornerComponent.create({ data: { cornerId, componentId: component.id, order } });
  rp(templateId);
}

export async function removeComponent(templateId: string, cornerComponentId: string) {
  await prisma.cornerComponent.delete({ where: { id: cornerComponentId } });
  rp(templateId);
}

// 컴포넌트 이름 변경 (componentId = Component.id)
export async function renameComponent(templateId: string, componentId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return;
  await prisma.component.update({ where: { id: componentId }, data: { name } });
  rp(templateId);
}

export async function moveComponent(templateId: string, cornerId: string, cornerComponentId: string, dir: 'up' | 'down') {
  const items = await prisma.cornerComponent.findMany({ where: { cornerId }, orderBy: { order: 'asc' } });
  const idx = items.findIndex((i) => i.id === cornerComponentId);
  const swap = dir === 'up' ? idx - 1 : idx + 1;
  if (idx < 0 || swap < 0 || swap >= items.length) {
    rp(templateId);
    return;
  }
  await prisma.$transaction([
    prisma.cornerComponent.update({ where: { id: items[idx].id }, data: { order: items[swap].order } }),
    prisma.cornerComponent.update({ where: { id: items[swap].id }, data: { order: items[idx].order } }),
  ]);
  rp(templateId);
}

// 코너 구성 컴포넌트 드래그앤드롭 재정렬 (좌측 코너 리스트와 동일 방식)
export async function reorderComponents(templateId: string, cornerId: string, orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, i) => prisma.cornerComponent.update({ where: { id }, data: { order: i } })),
  );
  rp(templateId);
}

// ── Atom (Component에 넣기) ─────────────────────────────────
export async function addExistingAtom(templateId: string, componentId: string, formData: FormData) {
  const atomId = String(formData.get('atomId') ?? '');
  const isRequired = String(formData.get('isRequired') ?? 'true') === 'true';
  if (!atomId) throw new Error('Atom을 선택하세요.');
  const exists = await prisma.componentAtom.findUnique({
    where: { componentId_atomId: { componentId, atomId } },
  });
  if (!exists) {
    const order = await nextOrder('componentAtom', { componentId });
    await prisma.componentAtom.create({ data: { componentId, atomId, order, isRequired } });
  }
  rp(templateId);
}

export async function createAtom(templateId: string, componentId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const atomType = String(formData.get('atomType') ?? '');
  const nn = (k: string) => {
    const v = String(formData.get(k) ?? '').trim();
    return v.length ? v : null;
  };
  if (!name) throw new Error('이름을 입력하세요.');
  if (!(ATOM_TYPES as readonly string[]).includes(atomType)) throw new Error('유효한 Atom 유형이 아닙니다.');
  const atom = await prisma.atom.create({
    data: {
      name,
      atomType,
      content: nn('content'),
      imageUrl: nn('imageUrl'),
      altText: nn('altText'),
      linkUrl: nn('linkUrl'),
      status: 'active',
    },
  });
  const order = await nextOrder('componentAtom', { componentId });
  await prisma.componentAtom.create({ data: { componentId, atomId: atom.id, order, isRequired: true } });
  rp(templateId);
}

export async function removeAtom(templateId: string, componentAtomId: string) {
  await prisma.componentAtom.delete({ where: { id: componentAtomId } });
  rp(templateId);
}

// Atom 값 인라인 수정 (문구/이미지/대체텍스트/링크)
export async function updateAtom(templateId: string, atomId: string, formData: FormData) {
  const nnv = (k: string) => {
    const v = String(formData.get(k) ?? '').trim();
    return v.length ? v : null;
  };
  await prisma.atom.update({
    where: { id: atomId },
    data: { content: nnv('content'), imageUrl: nnv('imageUrl'), altText: nnv('altText'), linkUrl: nnv('linkUrl') },
  });
  rp(templateId);
}

// 컴포넌트의 Atom들을 한 번에 저장 (개별 저장 버튼 없이 '완료'에서 일괄 처리)
export async function saveAtoms(
  templateId: string,
  updates: { atomId: string; content: string | null; imageUrl: string | null; altText: string | null; linkUrl: string | null }[],
) {
  const norm = (v: string | null) => (v && v.trim().length ? v.trim() : null);
  if (updates.length) {
    await prisma.$transaction(
      updates.map((u) =>
        prisma.atom.update({
          where: { id: u.atomId },
          data: { content: norm(u.content), imageUrl: norm(u.imageUrl), altText: norm(u.altText), linkUrl: norm(u.linkUrl) },
        }),
      ),
    );
  }
  rp(templateId);
}

// ── 선택형(칩/탭) 컴포넌트 = ChipPage (업무진입형.png) ───────
// 칩 = TEXT Atom (content=라벨, linkUrl=이동 페이지). Selection = Component.selectedIndex
export async function updateChip(templateId: string, atomId: string, formData: FormData) {
  const content = String(formData.get('content') ?? '').trim() || null;
  const linkUrl = String(formData.get('linkUrl') ?? '').trim() || null;
  await prisma.atom.update({ where: { id: atomId }, data: { content, linkUrl, name: content ? `칩:${content}` : undefined } });
  rp(templateId);
}

export async function addChip(templateId: string, componentId: string, formData: FormData) {
  const content = String(formData.get('content') ?? '').trim();
  const linkUrl = String(formData.get('linkUrl') ?? '').trim() || null;
  if (!content) throw new Error('칩 라벨을 입력하세요.');
  const atom = await prisma.atom.create({ data: { name: `칩:${content}`, atomType: 'TEXT', content, linkUrl, status: 'active' } });
  const order = await nextOrder('componentAtom', { componentId });
  await prisma.componentAtom.create({ data: { componentId, atomId: atom.id, order, isRequired: true } });
  rp(templateId);
}

export async function setChipSelection(templateId: string, componentId: string, index: number) {
  await prisma.component.update({ where: { id: componentId }, data: { selectedIndex: index } });
  rp(templateId);
}

export async function setChipRows(templateId: string, componentId: string, rows: number) {
  await prisma.component.update({ where: { id: componentId }, data: { chipRows: rows === 2 ? 2 : 1 } });
  rp(templateId);
}

// 선택형(칩) 일괄 저장 — 개별 저장 없이 "완료" 하나로 라벨/링크/순서/선택/줄수 전체 적용.
// chips 배열이 최종 상태(순서 포함). 기존 atom을 위치 기준으로 재사용하고, 남으면 삭제/모자라면 생성.
export async function saveChips(
  templateId: string,
  componentId: string,
  payload: { chips: { content: string; linkUrl: string; iconUrl?: string; iconAlt?: string }[]; selectedIndex: number; chipRows: number },
) {
  const chips = (payload.chips ?? []).map((c) => ({
    content: (c.content ?? '').trim(),
    linkUrl: (c.linkUrl ?? '').trim() || null,
    imageUrl: (c.iconUrl ?? '').trim() || null, // 칩 좌측 아이콘 (라이브러리에서 끌어옴)
    altText: (c.iconAlt ?? '').trim() || null,
  }));
  const existing = await prisma.componentAtom.findMany({
    where: { componentId },
    orderBy: { order: 'asc' },
    include: { atom: true },
  });

  for (let i = 0; i < chips.length; i++) {
    if (i < existing.length) {
      await prisma.atom.update({
        where: { id: existing[i].atomId },
        data: { content: chips[i].content, linkUrl: chips[i].linkUrl, imageUrl: chips[i].imageUrl, altText: chips[i].altText, name: chips[i].content ? `칩:${chips[i].content}` : `칩 ${i + 1}` },
      });
      if (existing[i].order !== i) await prisma.componentAtom.update({ where: { id: existing[i].id }, data: { order: i } });
    } else {
      const atom = await prisma.atom.create({
        data: { name: chips[i].content ? `칩:${chips[i].content}` : `칩 ${i + 1}`, atomType: 'TEXT', content: chips[i].content, linkUrl: chips[i].linkUrl, imageUrl: chips[i].imageUrl, altText: chips[i].altText, status: 'active' },
      });
      await prisma.componentAtom.create({ data: { componentId, atomId: atom.id, order: i, isRequired: true } });
    }
  }
  // 남는 기존 칩 제거
  for (let i = chips.length; i < existing.length; i++) {
    await prisma.componentAtom.delete({ where: { id: existing[i].id } });
    await prisma.atom.delete({ where: { id: existing[i].atomId } }).catch(() => {});
  }

  const sel = Math.max(0, Math.min(payload.selectedIndex ?? 0, Math.max(0, chips.length - 1)));
  await prisma.component.update({ where: { id: componentId }, data: { selectedIndex: sel, chipRows: payload.chipRows === 2 ? 2 : 1 } });
  rp(templateId);
}

// ── 배너 라이브러리 (포탈2) ─────────────────────────────────
// 새 배너 등록 후, 지정한 Corner에 바로 연결
export async function createBanner(templateId: string, cornerId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const imageUrl = String(formData.get('imageUrl') ?? '').trim();
  const linkUrl = String(formData.get('linkUrl') ?? '').trim() || null;
  if (!imageUrl) throw new Error('배너 이미지 URL을 입력하세요.');
  // 배너 이름 입력을 없앴으므로, 없으면 코너명 기준으로 자동 생성
  let bannerName = name;
  if (!bannerName) {
    const corner = await prisma.corner.findUnique({ where: { id: cornerId }, select: { name: true } });
    bannerName = `${corner?.name ?? '코너'} 배너`;
  }
  const banner = await prisma.banner.create({ data: { name: bannerName, imageUrl, linkUrl, status: 'active' } });
  await prisma.corner.update({ where: { id: cornerId }, data: { bannerId: banner.id } });
  rp(templateId);
}

// 기존 배너를 Corner에 연결/해제 (BannerSlot 선택)
export async function setCornerBanner(templateId: string, cornerId: string, formData: FormData) {
  const bannerId = String(formData.get('bannerId') ?? '').trim() || null;
  await prisma.corner.update({ where: { id: cornerId }, data: { bannerId } });
  rp(templateId);
}

// 빌더에서 코너 유형 카탈로그(CornerType)를 즉석 등록 (전시화면 관리 안에서도 등록 가능)
export async function createCornerTypeInline(templateId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const baseCategory = String(formData.get('baseCategory') ?? '').trim();
  if (!name) throw new Error('코너 유형 명을 입력하세요.');
  if (!(CORNER_TYPES as readonly string[]).includes(baseCategory)) throw new Error('유효한 기준 분류가 아닙니다.');

  const rows = await prisma.cornerType.findMany({ select: { typeId: true } });
  const max = rows.reduce((m, r) => {
    const n = parseInt(r.typeId.replace(/\D/g, ''), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  const typeId = 'CY' + String(max + 1).padStart(7, '0');

  const opt = (k: string) => {
    const v = String(formData.get(k) ?? '').trim();
    return v.length ? v : null;
  };
  await prisma.cornerType.create({
    data: {
      typeId,
      name,
      baseCategory,
      markupId: opt('markupId'),
      typeDetail: opt('typeDetail'),
      layout: opt('layout'),
      status: 'DRAFT',
      createdBy: 'marina.kim@sk.com',
    },
  });
  rp(templateId);
  revalidatePath('/admin/corner-types');
}

// 우측 코너 정보: 현재 슬롯이 참조하는 Corner를 라이브러리의 기존 Corner로 교체(끌어오기)
export async function swapCornerRef(templateId: string, templateCornerId: string, cornerId: string) {
  if (!cornerId) return;
  await prisma.templateCorner.update({ where: { id: templateCornerId }, data: { cornerId } });
  rp(templateId);
}
