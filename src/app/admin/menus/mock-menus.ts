// 전체 메뉴 관리(SB-DSP-OPR1-001 v3) 클릭 테스트용 목업 + 정책 판정 로직.
// 핵심 모델: 승인본(현재 FO 반영) ↔ 수정본(누적 편집본). 편집은 수정본에 쌓이고,
// '변동 있을 때 = 수정본 전체(변경 세트)를 한 번에' 승인 요청한다. (개별 승인 아님)
// DB를 쓰지 않는 프로토타입 전용. 판정 기준은 정책 ID를 주석으로 남긴다.

export type Channel = 'PC' | 'APP';
export type LinkKind = 'CONTAINER' | 'INTERNAL' | 'EXTERNAL';

export const LINK_LABEL: Record<LinkKind, string> = { CONTAINER: '승인 컨테이너', INTERNAL: '내부 랜딩', EXTERNAL: '외부 랜딩' };
export const LOGIN_LABEL = { ALL: '전체 노출', LOGIN: '로그인 시 노출' } as const;
export const GRADES = ['전체', 'VIP', 'GOLD', 'SILVER'] as const;
export const LINES = ['전체', '통화내역', '모바일', 'SKT법인', '법인실사용자', 'PPS', '유선서비스', '준회원(회선없음)'] as const;
export const OS_OPTS = ['전체', 'Android', 'iOS'] as const;

/** 한 메뉴의 설정값(버전별로 보관: 승인본 / 수정본) */
export type MenuValue = {
  name: string;
  icon: boolean;          // 아이콘 유무 (TBD)
  linkKind: LinkKind;
  container: string;      // 컨테이너 명 / ID
  url: string;            // 랜딩 URL
  urlVerified: boolean;   // URL 검증 완료
  linkApproved: boolean;  // 컨테이너 승인 여부 (PI-DSP-MNU-002)
  active: boolean;        // 사용 여부
  channels: Channel[];    // 운영 채널
  os: string[];           // OS 조건 (TBD)
  loginCond: 'ALL' | 'LOGIN';
  easyLogin: boolean;     // 간편 로그인 포함 (TBD)
  grades: string[];       // 회원 등급 조건 (TBD)
  lines: string[];        // 회선 조건 (TBD)
  nameChecked: boolean;   // 메뉴명 중복 확인 완료
};

export type MenuNode = {
  id: string;
  code: string;           // 메뉴 코드 (저장 시 자동 부여)
  depth: 1 | 2 | 3;
  parentId: string | null;
  approved: MenuValue | null; // 승인본 값 (null = 승인된 적 없는 신규)
  approvedOrder: number | null;
  working: MenuValue;         // 수정본 값
  order: number;              // 수정본 표시 순서
  org: string;
  owner: string;
};

/** 수정본(변경 세트) 전역 상태 */
export type DraftState = '없음' | '임시저장' | '승인대기' | '승인반려';
export const DRAFT_BADGE: Record<DraftState, 'neutral' | 'warning' | 'success' | 'negative'> = {
  없음: 'success', 임시저장: 'neutral', 승인대기: 'warning', 승인반려: 'negative',
};
export const DRAFT_LABEL: Record<DraftState, string> = { 없음: '승인완료', 임시저장: '임시저장', 승인대기: '승인대기', 승인반려: '승인반려' };

const key = (a: string[]) => [...a].sort().join(',');

const emptyIfDefault = (v: MenuValue) => v; // placeholder

const V = (o: Partial<MenuValue>): MenuValue => ({
  name: '', icon: false, linkKind: 'CONTAINER', container: '', url: '', urlVerified: false, linkApproved: true,
  active: true, channels: ['PC', 'APP'], os: ['전체'], loginCond: 'ALL', easyLogin: true, grades: ['전체'], lines: ['전체'],
  nameChecked: true, ...o,
});

/* ------------------------------------------------------------------ */
/* 변경/검증 판정 (변경 내용 배지 표 · SB 2-1)                          */
/* ------------------------------------------------------------------ */

export type Badge = '정보변경' | '정보변경 미완료' | '메뉴등록' | '등록 미완료' | '순서변경';

/** 미완료 사유 — 필수값 미입력 / 중복확인·URL검증 미수행·실패 */
export function validateValue(v: MenuValue): string[] {
  const out: string[] = [];
  if (!v.name.trim()) out.push('메뉴명 미입력');
  else if (!v.nameChecked) out.push('메뉴명 중복 확인 미수행');
  if (v.linkKind === 'CONTAINER') {
    if (!v.container) out.push('연결 컨테이너 미선택');
    else if (!v.linkApproved) out.push('미승인 컨테이너 (게시 불가)');
  } else {
    if (!v.url.trim()) out.push('랜딩 URL 미입력');
    else if (!v.urlVerified) out.push('URL 검증 미수행/실패');
  }
  if (!v.channels.length) out.push('운영 채널 미선택');
  return out;
}

export const isNewNode = (n: MenuNode) => n.approved === null;

export function infoChanged(n: MenuNode): boolean {
  if (!n.approved) return false;
  const a = n.approved, w = n.working;
  return a.name !== w.name || a.icon !== w.icon || a.linkKind !== w.linkKind || a.container !== w.container
    || a.url !== w.url || a.active !== w.active || key(a.channels) !== key(w.channels) || a.loginCond !== w.loginCond
    || key(a.os) !== key(w.os) || key(a.grades) !== key(w.grades) || key(a.lines) !== key(w.lines);
}
export const orderChanged = (n: MenuNode) => n.approvedOrder != null && n.approvedOrder !== n.order;
export const isIncomplete = (n: MenuNode) => (isNewNode(n) || infoChanged(n)) && validateValue(n.working).length > 0;
export const hasChange = (n: MenuNode) => isNewNode(n) || infoChanged(n) || orderChanged(n);

/** 최대 2개 (정보/등록 계열 1 + 순서변경 1) */
export function badgesOf(n: MenuNode): Badge[] {
  const out: Badge[] = [];
  const incomplete = validateValue(n.working).length > 0;
  if (isNewNode(n)) out.push(incomplete ? '등록 미완료' : '메뉴등록');
  else if (infoChanged(n)) out.push(incomplete ? '정보변경 미완료' : '정보변경');
  if (orderChanged(n)) out.push('순서변경');
  return out;
}

export const BADGE_TONE: Record<Badge, string> = {
  정보변경: 'bg-sky-50 text-sky-600 ring-sky-200',
  '정보변경 미완료': 'bg-amber-50 text-amber-700 ring-amber-200',
  메뉴등록: 'bg-violet-50 text-violet-600 ring-violet-200',
  '등록 미완료': 'bg-amber-50 text-amber-700 ring-amber-200',
  순서변경: 'bg-emerald-50 text-emerald-600 ring-emerald-200',
};

/* ------------------------------------------------------------------ */
/* 정보 변경 diff (변경사항 팝업 · SB 5b)                              */
/* ------------------------------------------------------------------ */
const chanTxt = (c: Channel[]) => c.join('·') || '-';
export function infoDiffRows(n: MenuNode): { field: string; before: string; after: string }[] {
  if (!n.approved) return [];
  const a = n.approved, w = n.working;
  const rows: { field: string; before: string; after: string }[] = [];
  const push = (field: string, b: string, af: string) => { if (b !== af) rows.push({ field, before: b, after: af }); };
  push('메뉴명', a.name, w.name);
  push('연결 설정', linkText(a), linkText(w));
  push('사용 여부', a.active ? '사용' : '미사용', w.active ? '사용' : '미사용');
  push('운영 채널', chanTxt(a.channels), chanTxt(w.channels));
  push('로그인 조건', LOGIN_LABEL[a.loginCond], LOGIN_LABEL[w.loginCond]);
  return rows;
}
export const linkText = (v: MenuValue) =>
  v.linkKind === 'CONTAINER' ? `승인 컨테이너 - ${v.container || '-'}` : `${LINK_LABEL[v.linkKind]} - ${v.url || '-'}`;

/* ------------------------------------------------------------------ */
/* 운영 이력 (SB 5)                                                    */
/* ------------------------------------------------------------------ */
export type HistoryKind = '승인요청' | '취소요청' | '임시저장';
export type ApprovalResult = '승인대기' | '승인완료' | '승인반려' | '요청취소';
export type HistoryEntry = {
  id: string;
  version: number | null;   // 승인완료만 버전 부여
  kind: HistoryKind;
  requester: string;
  requestedAt: string;
  approver: string | null;
  result: ApprovalResult;
  processedAt: string | null;
  reason: string | null;    // 취소/반려 사유
  summary: { info: number; order: number; add: number };
};

/* ------------------------------------------------------------------ */
/* 시드                                                                */
/* ------------------------------------------------------------------ */
export function seedMenus(): MenuNode[] {
  const node = (
    id: string, code: string, depth: 1 | 2 | 3, parentId: string | null, order: number,
    approved: MenuValue | null, working?: Partial<MenuValue>,
  ): MenuNode => ({
    id, code, depth, parentId, order,
    approved,
    approvedOrder: approved ? order : null,
    working: approved ? V({ ...approved, ...working }) : V({ ...working }),
    org: '전시운영팀', owner: 'P213980',
  });

  return [
    // 1Depth_01 — 정보 변경 (메뉴명·로그인조건 변경, 완료)
    node('m1', 'MNU-0101', 1, null, 1,
      V({ name: '1Depth_01', linkKind: 'CONTAINER', container: '혜택 / 123153123', loginCond: 'ALL' }),
      { loginCond: 'LOGIN', name: '1Depth_01' }),
    node('m1-1', 'MNU-0101-01', 2, 'm1', 1, V({ name: '2Depth_01', container: '제휴 혜택 / 0sxl' })),
    node('m1-1-1', 'MNU-0101-0101', 3, 'm1-1', 1, V({ name: '3Depth_01', linkKind: 'INTERNAL', url: '/benefit/a', container: '' })),
    // 3Depth_02 — 정보 변경 미완료 (연결 URL 검증 미수행)
    node('m1-1-2', 'MNU-0101-0102', 3, 'm1-1', 2,
      V({ name: '3Depth_02', linkKind: 'INTERNAL', url: '/benefit/b', urlVerified: true }),
      { url: '/benefit/b-new', urlVerified: false }),

    // 1Depth_02 — 정보 변경 + 순서 변경 (order 2→3 로 바뀜)
    node('m2', 'MNU-0102', 1, null, 3, V({ name: '1Depth_02', container: 'Shop / 0sx2' }, ), { name: '1Depth_02', active: true }),
    // (approvedOrder=2 이지만 order=3 → 순서변경) — 아래에서 보정
    // 1Depth_03 — 순서 변경만 (order 3→2)
    node('m3', 'MNU-0103', 1, null, 2, V({ name: '1Depth_03', container: 'MY / 0sx3' })),
    // 1Depth_04 — 미사용 + 변경 없음
    node('m4', 'MNU-0104', 1, null, 4, V({ name: '1Depth_04', active: false })),
    // 신규 메뉴 (등록 미완료 — 컨테이너 미선택)
    node('m5', 'MNU-NEW-1', 1, null, 5, null, { name: '신규 메뉴', container: '', nameChecked: false }),
  ].map((n) => {
    // 1Depth_02/03 순서 스왑 반영: approvedOrder 유지, order 스왑
    if (n.id === 'm2') return { ...n, approvedOrder: 2, order: 3 };
    if (n.id === 'm3') return { ...n, approvedOrder: 3, order: 2 };
    // 1Depth_02 정보변경: 승인본 name '1Depth_02(구)' → working '1Depth_02'
    return n;
  });
}

/** 1Depth_02 정보변경을 확실히 만들기 위한 승인본 보정 */
export function seedFixed(): MenuNode[] {
  const list = seedMenus();
  const m2 = list.find((n) => n.id === 'm2');
  if (m2 && m2.approved) { m2.approved = { ...m2.approved, name: '1Depth_02(구)' }; m2.working = { ...m2.working, name: '1Depth_02' }; }
  return list;
}

export const CONTAINERS = [
  { id: '0sxl75swte1', name: '혜택', period: '상시', on: true },
  { id: '0sxl75swte1', name: '쇼핑', period: '상시', on: true },
  { id: '0sxl75swte1', name: '마이', period: '상시', on: true },
  { id: '0sxl75swte2', name: 'VIP Pick', period: '상시', on: false },
  { id: '0sxl75swte2', name: 'VIP Pick', period: '2026.08.25 ~ 2026.08.25', on: true },
  { id: '0sxl75swte3', name: '고객지원', period: '상시', on: true },
] as const;

/** 트리 자식 정렬 */
export const childrenOf = (nodes: MenuNode[], parentId: string | null, useApproved = false) =>
  nodes.filter((n) => n.parentId === parentId).sort((a, b) =>
    (useApproved ? (a.approvedOrder ?? 999) - (b.approvedOrder ?? 999) : a.order - b.order));

export { V as menuValue };
