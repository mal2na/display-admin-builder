/**
 * 전시화면 관리(빌더) 스펙 → SB 스튜디오용 JSON 추출.
 *   실행: npx tsx scripts/export-sb-spec.ts
 *   출력: docs/sb-export/display-admin-spec.json
 *
 * SSOT(display-taxonomy·benefit-corner-types·preset-shape-groups)에서 직접 읽어 생성한다(하드코딩 최소).
 * '동작 방법(빌더 플로우)' 섹션만 모델 기반으로 큐레이션해 담는다.
 */
import fs from 'fs';
import path from 'path';
import {
  CORNER_TYPES, VISIBLE_CORNER_TYPES, CORNER_COMPONENT_MAP, CORNER_TYPE_DETAILS, CORNER_TYPE_SPECS,
  REC_SOURCE_METHODS, REC_SOURCE_INFO, CVM_CATALOGS, CVM_OUT_OF_SCOPE, CVM_FALLBACKS,
  DISPLAY_STATUSES, DISPLAY_STATUS_TRANSITIONS, CONTAINER_TYPES,
} from '../src/lib/display-taxonomy';
import { benefitTypes, cornerAttrSpec, operModeOf, benefitGuide, hasLandingLink } from '../src/lib/benefit-corner-types';
import { PRESET_SHAPE_GROUPS } from '../src/lib/preset-shape-groups';
import { prisma } from '../src/lib/prisma';

const spec: Record<string, unknown> = {
  meta: {
    title: '전시화면 관리(빌더) 스펙',
    generatedAt: new Date().toISOString(),
    source: 'display-taxonomy.ts · benefit-corner-types.ts · preset-shape-groups.ts (SSOT)',
    policy: 'POL-DSP v0.31',
    note: 'SB 스튜디오 코너 프리셋 정의용. 코너=SB 프리셋→BO FE 고정 개발물, 어드민은 조회·배치·공통속성·ID선택만.',
  },

  // 1) 5단 계층
  hierarchy: [
    { level: 'Atom', ko: '표시 요소', desc: '문구·이미지·CTA·가격·아이콘·배지 등 가장 작은 표시 요소. 단독 화면 구성 불가.' },
    { level: 'Component', ko: '기능 모듈', desc: 'Atom 조합. 유형 6종: 정보형·행동형·혜택형·선택형·배너형·상품형.' },
    { level: 'Corner', ko: '화면 영역', desc: 'Component를 올려 화면의 특정 영역 구성. 유형별 허용 Component 제한.' },
    { level: 'Template', ko: '레이아웃', desc: 'Corner를 순서/배치로 구성. 분기(로그인·세그)·기간형.' },
    { level: 'Container', ko: '화면/영역', desc: '채널에 실제 나가는 화면. 화면과 1:1, Template과 1:N. soft-delete.' },
  ],

  // 2) 빌더 동작 방법(3단 패널 + 작업 흐름)
  builderFlow: {
    route: '/admin/containers-test/t/<templateId>',
    panels: {
      left: { title: '디바이스 미리보기', desc: 'iPhone 프레임. 기본/폴백 토글. 코너 선택 시 해당 위치로 스크롤.' },
      center: { title: '코너 구성 리스트', desc: '드래그로 순서 변경, 고정/개인화 토글, 노출 온오프, 코너 추가/삭제.' },
      right: {
        title: '코너 설정 패널',
        sections: [
          { n: 1, title: '코너 기본 정보', editable: ['코너명'], readonly: ['코너 유형', '배열·레이아웃', '노출 개수(범위)'], note: '유형·배열·개수는 껍데기(코너 유형 관리에서 불러옴).' },
          { n: 2, title: '코너 콘텐츠 설정', desc: '채우는 방식 선택 + 아이템 ID 선택/불러오기 or CVM 요청. 미션형은 운영 미션 연결.' },
          { n: 3, title: '대체 노출 설정(폴백)', desc: '추천(CVM 또는 전부 추천)을 쓸 때만. 미노출 / 운영자 편성으로 대체.' },
        ],
      },
    },
    steps: [
      '컨테이너 목록 → 템플릿 클릭 → 빌더 진입',
      '[코너 추가] 모달에서 껍데기 선택(혜택형·배너형·업무진입형)',
      '코너별 ①기본정보 ②콘텐츠 설정 ③폴백 설정',
      '드래그로 순서·고정·개인화 조정',
      '[구성 검증] → 필수항목 체크 → [승인 요청]',
    ],
    rules: [
      'PI-DSP-CMP-003: 코너 유형 선택 시 허용되지 않은 Component 유형은 못 붙임.',
      'PI-DSP-CMP-004: 이미지/아이콘 대체텍스트 없으면 draft 허용, review 전환 차단.',
      '코너 랜딩 링크 버튼과 액션 버튼 중 최소 1개 필수(택1).',
    ],
  },

  // 3) 채우는 방식(빌더 ②) — 수급 방식과 매핑
  fillModes: [
    { key: '운영자 직접', desc: '운영자가 아이템을 직접 담음.', personalized: false, recSource: '운영자 편성' },
    { key: '코너 고정 · 콘텐츠 추천', legacyKey: '운영자 고정 + 추천', desc: '코너 고정 후 콘텐츠 일부 입력, 나머지는 추천 엔진이 고객별로 채움.', personalized: true, recSource: 'CVM 데이터 연동' },
    { key: '전부 추천', desc: '후보 코너 유형을 여러 개 담으면 고객마다 추천 엔진이 노출 개수만큼 선택. 없으면 미노출.', personalized: true, recSource: 'CVM 데이터/콘텐츠 연동' },
  ],

  // 4) 콘텐츠 수급 방식 3종(SSOT)
  supplyMethods: REC_SOURCE_METHODS.map((m) => ({ method: m, ...REC_SOURCE_INFO[m] })),

  // 5) CVM 추천 계약
  cvmContract: {
    catalogs: CVM_CATALOGS,
    topNMax: 5,
    outOfScope: CVM_OUT_OF_SCOPE,
    fallbacks: CVM_FALLBACKS,
  },

  // 6) 코너 유형(최상위 6종) — 허용 Component·레이아웃·규격
  cornerTypes: {
    topLevel: CORNER_TYPES,
    visible: VISIBLE_CORNER_TYPES,
    componentMap: CORNER_COMPONENT_MAP,
    layouts: CORNER_TYPE_DETAILS,
    specs: CORNER_TYPE_SPECS,
  },

  // 7) 혜택형 코너 유형(중분류·레이아웃) — 필드(바인딩) 스펙 포함
  benefitTypes: benefitTypes().map((t) => {
    const attr = cornerAttrSpec(t.mid, t.layout);
    return {
      typeId: t.typeId,
      top: t.top,
      mid: t.mid,
      layout: t.layout,
      name: t.name,
      source: t.source,
      presetKey: t.presetKey,
      presetCount: t.presetIds.length,
      operMode: operModeOf(t.mid, t.layout),
      landingLink: hasLandingLink(t.mid),
      unused: t.unused ?? false,
      guide: benefitGuide(t.mid, t.layout),
      fields: {
        card: attr.card,   // 코너(카드) 공통 속성
        item: attr.item,   // 컴포넌트(아이템) 요소
        rules: attr.rules, // 의존 규칙
      },
    };
  }),

  // 8) 프리셋 모양 그룹(원장 출처 포함)
  presetGroups: PRESET_SHAPE_GROUPS.map((g) => ({
    key: g.key, label: g.label, source: g.source, presetCount: g.presetIds.length, unused: g.unused ?? false,
  })),

  // 9) 전시 상태 10단계 + 전이표
  states: {
    list: DISPLAY_STATUSES,
    transitions: DISPLAY_STATUS_TRANSITIONS,
  },

  // 10) 컨테이너 유형
  containerTypes: CONTAINER_TYPES,
};

// 11) 실제 배치(placements) — 활성 컨테이너 → 템플릿 → 코너(순서·유형·수급·존). DB 현재 상태.
async function loadPlacements() {
  const containers = await prisma.container.findMany({
    where: { status: 'active' },
    orderBy: [{ containerType: 'asc' }, { name: 'asc' }],
    include: {
      templates: {
        where: { archivedAt: null },
        orderBy: [{ isDefault: 'desc' }, { priority: 'desc' }],
        include: {
          templateCorners: {
            orderBy: { order: 'asc' },
            include: { corner: true },
          },
        },
      },
    },
  });
  return containers.map((c) => ({
    id: c.id,
    name: c.name,
    containerType: c.containerType,
    channel: c.channel,
    status: c.status,
    approvalStatus: c.approvalStatus,
    defaultTemplateId: c.defaultTemplateId,
    templates: c.templates.map((t) => ({
      id: t.id,
      name: t.name,
      conditionGroup: t.conditionGroup,
      isDefault: t.isDefault,
      status: t.status,
      priority: t.priority,
      period: t.startAt || t.endAt ? { startAt: t.startAt, endAt: t.endAt } : '상시',
      personalSlots: t.personalSlots ? safeJson(t.personalSlots) : null,
      cornerCount: t.templateCorners.length,
      corners: t.templateCorners.map((tc, i) => ({
        order: i + 1,
        name: tc.corner.name,
        cornerType: tc.corner.cornerType,
        typeLabel: tc.corner.typeLabel ?? null,
        layout: tc.corner.layoutDetail ?? tc.corner.cornerLayout ?? null,
        maxItems: tc.corner.maxItems,
        minItems: tc.corner.minItems,
        recSource: tc.corner.recSource,
        cvmCatalog: tc.corner.cvmCatalog ?? null,
        cvmTopN: tc.corner.cvmTopN ?? null,
        cvmFallback: tc.corner.cvmFallback ?? null,
        zone: tc.zone ?? '(파생)',
        pinned: tc.pinned,
        visible: tc.visible,
      })),
    })),
  }));
}
function safeJson(s: string): unknown { try { return JSON.parse(s); } catch { return s; } }

async function main() {
  spec.placements = await loadPlacements();

  const outDir = path.join(process.cwd(), 'docs', 'sb-export');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'display-admin-spec.json');
  fs.writeFileSync(outPath, JSON.stringify(spec, null, 2), 'utf8');

  const placements = spec.placements as { name: string; templates: { cornerCount: number }[] }[];
  const totalCorners = placements.reduce((a, c) => a + c.templates.reduce((b, t) => b + t.cornerCount, 0), 0);
  console.log(`✓ 저장: ${outPath}`);
  console.log(`  코너 유형(최상위) ${CORNER_TYPES.length}종 · 혜택형 ${benefitTypes().length}종 · 상태 ${DISPLAY_STATUSES.length}단계 · 프리셋 그룹 ${PRESET_SHAPE_GROUPS.length}`);
  console.log(`  실제 배치: 컨테이너 ${placements.length} · 코너 배치 ${totalCorners}`);
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
