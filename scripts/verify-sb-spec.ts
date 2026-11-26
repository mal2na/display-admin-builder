/**
 * SB 스펙 JSON 자동 검증 — docs/sb-export/display-admin-spec.json 이 현재 코드·DB와 일치하는지 대조.
 *   실행: npx tsx scripts/verify-sb-spec.ts
 *   통과 = exit 0, 불일치 하나라도 있으면 exit 1(터미널/CI에서 실패로 잡힘).
 *
 * "제대로 뽑혔는지"를 눈 대조 없이 자동 판정한다. export-sb-spec.ts 를 돌린 뒤 이걸 돌리면 된다.
 */
import fs from 'fs';
import path from 'path';
import { CORNER_TYPES, REC_SOURCE_METHODS, DISPLAY_STATUSES } from '../src/lib/display-taxonomy';
import { benefitTypes } from '../src/lib/benefit-corner-types';
import { prisma } from '../src/lib/prisma';

const SPEC_PATH = path.join(process.cwd(), 'docs', 'sb-export', 'display-admin-spec.json');

let pass = 0, fail = 0;
function check(label: string, ok: boolean, detail = '') {
  (ok ? pass++ : fail++);
  console.log(`  ${ok ? '✓' : '✗ 불일치'}  ${label}${detail ? `  — ${detail}` : ''}`);
}
const eqArr = (a: unknown[], b: unknown[]) => a.length === b.length && a.every((x, i) => x === b[i]);

async function main() {
  console.log(`\n▶ 검증 대상: ${SPEC_PATH}\n`);

  // 0) 파일 존재 + 유효 JSON
  if (!fs.existsSync(SPEC_PATH)) {
    console.error('✗ 파일이 없습니다. 먼저  npx tsx scripts/export-sb-spec.ts  로 생성하세요.');
    process.exit(1);
  }
  let spec: Record<string, any>;
  try {
    spec = JSON.parse(fs.readFileSync(SPEC_PATH, 'utf8'));
    check('유효한 JSON', true);
  } catch (e) {
    check('유효한 JSON', false, String(e));
    process.exit(1);
  }

  // 1) 필수 최상위 키
  const REQUIRED = ['meta', 'hierarchy', 'builderFlow', 'fillModes', 'supplyMethods', 'cvmContract',
    'cornerTypes', 'benefitTypes', 'presetGroups', 'states', 'containerTypes', 'placements'];
  const missing = REQUIRED.filter((k) => !(k in spec));
  check(`필수 섹션 ${REQUIRED.length}개 존재`, missing.length === 0, missing.length ? `누락: ${missing.join(', ')}` : '');
  check('meta.generatedAt 있음', !!spec.meta?.generatedAt, spec.meta?.generatedAt ?? '');

  // 2) 코너 유형(최상위) = 코드 SSOT
  check('코너 유형(최상위) 목록 = 코드', eqArr(spec.cornerTypes?.topLevel ?? [], [...CORNER_TYPES]),
    `JSON ${spec.cornerTypes?.topLevel?.length} vs 코드 ${CORNER_TYPES.length}`);

  // 3) 수급 방식 = 코드
  check('수급 방식 = 코드', eqArr((spec.supplyMethods ?? []).map((m: any) => m.method), [...REC_SOURCE_METHODS]));

  // 4) 전시 상태 10단계 = 코드(코드 일치)
  const specCodes = (spec.states?.list ?? []).map((s: any) => s.code);
  check('전시 상태 코드 = 코드', eqArr(specCodes, DISPLAY_STATUSES.map((s) => s.code)),
    `JSON ${specCodes.length} vs 코드 ${DISPLAY_STATUSES.length}`);

  // 5) 혜택형 유형 = 코드(typeId·mid·layout 1:1)
  const live = benefitTypes();
  const specBt = spec.benefitTypes ?? [];
  const sameLen = specBt.length === live.length;
  const sameRows = sameLen && live.every((t, i) =>
    specBt[i]?.typeId === t.typeId && specBt[i]?.mid === t.mid && specBt[i]?.layout === t.layout);
  check('혜택형 유형 = 코드 (개수·mid·layout)', sameRows, `JSON ${specBt.length} vs 코드 ${live.length}`);
  // 5-1) 필드(바인딩) 스펙이 비어있지 않은지(각 유형 card 최소 1행)
  const fieldsOk = specBt.every((b: any) => Array.isArray(b.fields?.card) && b.fields.card.length > 0);
  check('혜택형 필드(card) 비어있지 않음', fieldsOk);

  // 6) 실제 배치 = DB(혜택 홈만) — 컨테이너·템플릿·코너 수 + 코너 순서/유형
  const dbContainers = await prisma.container.findMany({
    where: { status: 'active', name: { contains: '혜택' } },
    orderBy: [{ containerType: 'asc' }, { name: 'asc' }],
    include: {
      templates: {
        where: { archivedAt: null },
        orderBy: [{ isDefault: 'desc' }, { priority: 'desc' }],
        include: { templateCorners: { orderBy: { order: 'asc' }, include: { corner: true } } },
      },
    },
  });
  const specPl = spec.placements ?? [];
  check('배치 컨테이너 수 = DB(혜택 홈만)', specPl.length === dbContainers.length, `JSON ${specPl.length} vs DB ${dbContainers.length}`);
  check('혜택 외 컨테이너 섞이지 않음', specPl.every((c: any) => c.name.includes('혜택')),
    specPl.map((c: any) => c.name).join(', '));

  let placementRowsOk = true, mismatchDetail = '';
  for (const dc of dbContainers) {
    const sc = specPl.find((c: any) => c.id === dc.id);
    if (!sc) { placementRowsOk = false; mismatchDetail = `컨테이너 '${dc.name}' 누락`; break; }
    if (sc.templates.length !== dc.templates.length) { placementRowsOk = false; mismatchDetail = `'${dc.name}' 템플릿 수`; break; }
    for (let ti = 0; ti < dc.templates.length; ti++) {
      const dt = dc.templates[ti], st = sc.templates[ti];
      if (st.cornerCount !== dt.templateCorners.length) { placementRowsOk = false; mismatchDetail = `'${dt.name}' 코너 수 JSON ${st.cornerCount} vs DB ${dt.templateCorners.length}`; break; }
      for (let ci = 0; ci < dt.templateCorners.length; ci++) {
        const dcorner = dt.templateCorners[ci].corner, scorner = st.corners[ci];
        if (scorner?.name !== dcorner.name || scorner?.cornerType !== dcorner.cornerType) {
          placementRowsOk = false; mismatchDetail = `'${dt.name}' ${ci + 1}번 코너: JSON '${scorner?.name}/${scorner?.cornerType}' vs DB '${dcorner.name}/${dcorner.cornerType}'`; break;
        }
      }
      if (!placementRowsOk) break;
    }
    if (!placementRowsOk) break;
  }
  check('배치 코너 순서·이름·유형 = DB', placementRowsOk, mismatchDetail);

  // 결과
  console.log(`\n${fail === 0 ? '✅ 전체 통과' : '❌ 불일치 있음'} — 통과 ${pass} · 실패 ${fail}\n`);
  await prisma.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
