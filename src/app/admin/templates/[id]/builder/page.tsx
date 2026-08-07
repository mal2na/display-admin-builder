import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { DISPLAY_STATUS_LABEL, type DisplayStatusKey } from '@/lib/display-taxonomy';
import { BuilderEditor } from '../builder-editor';
import { PublishRequestButton } from '../publish-request-button';
import { TemplateHeaderBar } from '../template-header-bar';
import { ChevronLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function BuilderPage({ params }: { params: { id: string } }) {
  const template = await prisma.template.findUnique({
    where: { id: params.id },
    include: {
      container: true,
      templateCorners: {
        orderBy: { order: 'asc' },
        include: {
          corner: {
            include: {
              banner: true,
              cornerComponents: {
                orderBy: { order: 'asc' },
                include: {
                  component: { include: { componentAtoms: { orderBy: { order: 'asc' }, include: { atom: true } } } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!template) notFound();

  const versionRows = await prisma.templateVersion.findMany({
    where: { templateId: template.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: { id: true, version: true, label: true, createdBy: true, createdAt: true },
  });
  const versions = versionRows.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() }));

  // 보관(soft-delete) 가능 여부 — 기본/게시중/유일 템플릿은 보관 불가
  const activeSiblings = await prisma.template.count({ where: { containerId: template.containerId, archivedAt: null } });
  const archiveBlockReason = template.isDefault
    ? '기본 템플릿은 보관할 수 없습니다. 먼저 다른 템플릿을 기본으로 지정하세요.'
    : template.status === 'PUBLISHED'
      ? '게시 중인 템플릿은 보관할 수 없습니다. 게시 중지 후 진행하세요.'
      : activeSiblings <= 1
        ? '컨테이너의 유일한 템플릿은 보관할 수 없습니다.'
        : null;

  const [libCorners, libComponents, libAtoms, libBanners, libCornerTypes, libImgAtoms, libLinkAtoms, libMoreLinks, libBannerLinks] = await Promise.all([
    prisma.corner.findMany({ where: { status: 'active' }, orderBy: { updatedAt: 'desc' }, select: { id: true, name: true, cornerType: true, layoutDetail: true } }),
    prisma.component.findMany({ where: { status: 'active' }, orderBy: { updatedAt: 'desc' }, select: { id: true, name: true, componentType: true, allowedCornerTypes: true } }),
    prisma.atom.findMany({ where: { status: 'active' }, orderBy: { updatedAt: 'desc' }, select: { id: true, name: true, atomType: true } }),
    prisma.banner.findMany({ where: { status: 'active' }, orderBy: { updatedAt: 'desc' }, select: { id: true, name: true, imageUrl: true } }),
    prisma.cornerType.findMany({ orderBy: { typeId: 'asc' }, select: { id: true, name: true, baseCategory: true, typeDetail: true, active: true } }),
    // 이미지 라이브러리 재료: IMAGE/ICON Atom
    prisma.atom.findMany({
      where: { status: 'active', atomType: { in: ['ICON', 'IMAGE'] }, NOT: { imageUrl: null } },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, imageUrl: true, altText: true },
    }),
    // 이동 URL 라이브러리 재료: Atom / Corner(더보기) / Banner 링크
    prisma.atom.findMany({ where: { status: 'active', NOT: { linkUrl: null } }, select: { name: true, linkUrl: true } }),
    prisma.corner.findMany({ where: { NOT: { moreButtonLink: null } }, select: { name: true, moreButtonLink: true } }),
    prisma.banner.findMany({ where: { status: 'active', NOT: { linkUrl: null } }, select: { name: true, linkUrl: true } }),
  ]);

  // 이미지 라이브러리 (Atom 이미지 + 배너 이미지, url 기준 중복 제거)
  const imageMap = new Map<string, { url: string; alt: string | null; name: string }>();
  for (const a of libImgAtoms) if (a.imageUrl && !imageMap.has(a.imageUrl)) imageMap.set(a.imageUrl, { url: a.imageUrl, alt: a.altText, name: a.name });
  for (const b of libBanners) if (b.imageUrl && !imageMap.has(b.imageUrl)) imageMap.set(b.imageUrl, { url: b.imageUrl, alt: b.name, name: b.name });
  const images = [...imageMap.values()];

  // 이동 URL 라이브러리 (기본 랜딩 + DB에서 실제 쓰인 링크, url 기준 중복 제거)
  const CURATED_LINKS: { url: string; label: string }[] = [
    { url: '/benefit', label: '혜택 홈' },
    { url: '/movie', label: '영화 예매' },
    { url: '/reco', label: '추천 상품' },
    { url: '/event', label: '이벤트' },
    { url: '/tweek', label: 'T Week' },
    { url: '/tday', label: 'T DAY 멤버십' },
    { url: '/vip', label: 'VIP 혜택' },
    { url: '/shopping', label: '쇼핑' },
    { url: '/category', label: '카테고리' },
    { url: '/my', label: '마이페이지' },
  ];
  const linkMap = new Map<string, { url: string; label: string }>();
  for (const l of CURATED_LINKS) linkMap.set(l.url, l);
  for (const a of libLinkAtoms) if (a.linkUrl && !linkMap.has(a.linkUrl)) linkMap.set(a.linkUrl, { url: a.linkUrl, label: a.name });
  for (const c of libMoreLinks) if (c.moreButtonLink && !linkMap.has(c.moreButtonLink)) linkMap.set(c.moreButtonLink, { url: c.moreButtonLink, label: `${c.name} 더보기` });
  for (const b of libBannerLinks) if (b.linkUrl && !linkMap.has(b.linkUrl)) linkMap.set(b.linkUrl, { url: b.linkUrl, label: b.name });
  const links = [...linkMap.values()];


  const corners = template.templateCorners.map((tc) => ({
    templateCornerId: tc.id,
    id: tc.corner.id,
    name: tc.corner.name,
    cornerType: tc.corner.cornerType,
    typeLabel: tc.corner.typeLabel,
    title: tc.corner.title,
    maxItems: tc.corner.maxItems,
    markupId: tc.corner.markupId,
    layoutDetail: tc.corner.layoutDetail,
    cornerLayout: tc.corner.cornerLayout,
    description: tc.corner.description,
    mainTitle: tc.corner.mainTitle,
    subTitle: tc.corner.subTitle,
    subTitleIcon: tc.corner.subTitleIcon,
    sortStrategy: tc.corner.sortStrategy,
    minItems: tc.corner.minItems,
    noDisplayCondition: tc.corner.noDisplayCondition,
    moreButtonUse: tc.corner.moreButtonUse,
    moreButtonLabel: tc.corner.moreButtonLabel,
    moreButtonLink: tc.corner.moreButtonLink,
    bannerId: tc.corner.bannerId,
    bannerName: tc.corner.banner?.name ?? null,
    bannerImageUrl: tc.corner.banner?.imageUrl ?? null,
    visible: tc.visible,
    components: tc.corner.cornerComponents.map((cc) => ({
      cornerComponentId: cc.id,
      id: cc.component.id,
      name: cc.component.name,
      componentType: cc.component.componentType,
      selectedIndex: cc.component.selectedIndex,
      chipRows: cc.component.chipRows,
      atoms: cc.component.componentAtoms.map((ca) => ({
        componentAtomId: ca.id,
        id: ca.atom.id,
        name: ca.atom.name,
        atomType: ca.atom.atomType,
        isRequired: ca.isRequired,
        content: ca.atom.content,
        imageUrl: ca.atom.imageUrl,
        altText: ca.atom.altText,
        linkUrl: ca.atom.linkUrl,
      })),
    })),
  }));

  const library = {
    corners: libCorners,
    components: libComponents.map((c) => ({
      ...c,
      allowedCornerTypes: c.allowedCornerTypes ? (JSON.parse(c.allowedCornerTypes) as string[]) : [],
    })),
    atoms: libAtoms,
    banners: libBanners,
    cornerTypes: libCornerTypes,
    images,
    links,
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center gap-3 border-b bg-card px-6 py-3">
        <Link href={`/admin/containers/${template.containerId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ChevronLeft className="h-4 w-4" /> {template.container.name}
        </Link>
        <div className="h-4 w-px bg-border" />
        <TemplateHeaderBar
          templateId={template.id}
          name={template.name}
          conditionGroup={template.conditionGroup}
          isDefault={template.isDefault}
          versions={versions}
          archiveBlockReason={archiveBlockReason}
        />
        <div className="ml-auto" />
        <PublishRequestButton templateId={template.id} />
      </div>

      <BuilderEditor
        meta={{
          id: template.id,
          name: template.name,
          conditionGroup: template.conditionGroup,
          startAt: template.startAt ? template.startAt.toISOString().slice(0, 16) : null,
          endAt: template.endAt ? template.endAt.toISOString().slice(0, 16) : null,
          containerName: template.container.name,
          isDefault: template.isDefault,
          memo: template.memo,
          displayOn: template.displayOn,
          startAtOnApproval: template.startAtOnApproval,
        }}
        corners={corners}
        library={library}
      />
    </div>
  );
}
