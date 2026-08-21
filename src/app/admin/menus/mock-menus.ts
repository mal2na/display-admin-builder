// 전체 메뉴 관리(SB-DSP-OPR1-001 v4) 클릭 테스트용 목업 + 정책 판정 로직.
// DB를 쓰지 않는 프로토타입 전용이다. 판정 기준은 정책 ID를 주석으로 남긴다.

// 메뉴 승인 상태 — BSS 승인 모델(우리 SSOT TM-DSP-020 계열).
// 어드민은 승인 '요청'만 하고, 승인/반려는 BSS가 한다. 승인 완료분만 'FO 반영(캐시 갱신)'으로 채널에 나간다.
export type MenuStatus = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELED';

// 상태는 '상태 명사'로 통일한다. 승인요청은 '행위(버튼)', 그 결과 상태는 '승인대기'. (SB 03 변경이력 1-1)
export const STATUS_LABEL: Record<MenuStatus, string> = {
  DRAFT: '임시저장',
  REVIEW: '승인대기',
  APPROVED: '승인완료',
  REJECTED: '반려',
  CANCELED: '요청취소',
};

// 상태 정의 (안내/툴팁용)
export const STATUS_DESC: Record<MenuStatus, string> = {
  DRAFT: '저장만 하고 아직 승인 요청 전. FO 미반영.',
  REVIEW: '승인 요청을 보내 BSS 검수 대기 중. 요청취소 가능.',
  APPROVED: '검수 승인 완료. FO 반영 가능하며 롤백 기준 버전.',
  REJECTED: '검수 반려. 반려 사유 확인 후 수정해 재요청.',
  CANCELED: '검수 전 요청자가 요청을 철회한 상태.',
};

export const STATUS_CODE: Record<MenuStatus, string> = {
  DRAFT: 'ST-DSP-001', // 초안(임시저장)
  REVIEW: 'ST-DSP-002', // 검수 대기(승인요청)
  APPROVED: 'ST-DSP-004', // 승인 완료
  REJECTED: 'ST-DSP-003', // 수정 필요(반려)
  CANCELED: 'ST-DSP-011', // 요청취소(검수 전 요청자 철회)
};

/** 승인 상태 배지 색 */
export const STATUS_BADGE: Record<MenuStatus, 'neutral' | 'warning' | 'success' | 'negative'> = {
  DRAFT: 'neutral',
  REVIEW: 'warning',
  APPROVED: 'success',
  REJECTED: 'negative',
  CANCELED: 'neutral',
};

/** 미승인 변경(초안·승인요청·반려) = FO 미반영, 미리보기 전용 (PI-DSP-MNU-003) */
export const UNAPPROVED: MenuStatus[] = ['DRAFT', 'REVIEW', 'REJECTED'];

export type Channel = 'PC' | 'APP';
export type LinkType = 'CONTAINER' | 'INTERNAL' | 'EXTERNAL';

/** 승인본 스냅샷 — 승인 완료 시점의 값. null이면 아직 승인된 적 없는 신규 노출. */
export type Snapshot = {
  name: string;
  order: number;
  active: boolean;
  linkType: LinkType | null;
  linkTarget: string | null;
  caption: string | null;
  channels: Channel[];
  loginCond: 'ALL' | 'LOGIN';
  authCond: 'NONE' | 'REQUIRED';
  segment: string;
  channelCond: Channel[];
};

export type HistoryEntry = {
  at: string;
  actor: string;
  field: string;
  before: string;
  after: string;
  reason: string;
  approver: string | null;
  result: string;
};

export type MenuNode = {
  id: string;
  code: string;
  name: string;
  depth: 1 | 2 | 3;
  parentId: string | null;
  order: number;
  /** 사용 여부 (PI-DSP-MNU-001 운영 상태 필수값) */
  active: boolean;
  /** 공개 상태 */
  visibility: '공개' | '비공개';
  linkType: LinkType | null;
  linkTarget: string | null;
  /** 연결 대상의 승인 여부 (PI-DSP-MNU-002) */
  linkApproved: boolean;
  icon: string | null;
  /** 아이콘·이미지 대체텍스트 (PI-DSP-CMP-004) */
  iconAlt: string | null;
  caption: string | null;
  /** 표시 정보상의 노출 채널 */
  channels: Channel[];
  loginCond: 'ALL' | 'LOGIN';
  authCond: 'NONE' | 'REQUIRED';
  segment: string;
  /** 노출 조건상의 채널 */
  channelCond: Channel[];
  org: string;
  owner: string;
  status: MenuStatus;
  changeReason: string | null;
  rejectReason: string | null;
  updatedAt: string;
  updatedBy: string;
  /** 승인된 적 없는 신규 노출 여부 */
  isNew: boolean;
  approved: Snapshot | null;
  history: HistoryEntry[];
};

export const SEGMENTS = ['전체', 'VIP', '신규가입', '장기고객'];
export const ORGS = ['전시운영팀', '혜택기획팀', 'Shop기획팀', '고객경험팀'];

export const LOGIN_LABEL = { ALL: '전체 노출', LOGIN: '로그인 시 노출' } as const;
export const AUTH_LABEL = { NONE: '일반', REQUIRED: '권한 필요' } as const;

const snap = (n: Partial<Snapshot>, base: Snapshot): Snapshot => ({ ...base, ...n });

const baseSnap: Snapshot = {
  name: '',
  order: 1,
  active: true,
  linkType: 'CONTAINER',
  linkTarget: null,
  caption: null,
  channels: ['PC', 'APP'],
  loginCond: 'ALL',
  authCond: 'NONE',
  segment: '전체',
  channelCond: ['PC', 'APP'],
};

/** 초기 목업 — 정책 판정이 갈리는 케이스를 일부러 섞어 두었다. */
export function seedMenus(): MenuNode[] {
  const h = (
    at: string,
    actor: string,
    field: string,
    before: string,
    after: string,
    reason: string,
    approver: string | null,
    result: string,
  ): HistoryEntry => ({ at, actor, field, before, after, reason, approver, result });

  return [
    {
      id: 'm-benefit',
      code: 'MNU-0101',
      name: '혜택',
      depth: 1,
      parentId: null,
      order: 1,
      active: true,
      visibility: '공개',
      linkType: 'CONTAINER',
      linkTarget: 'CT-0101 혜택 홈',
      linkApproved: true,
      icon: 'ic_benefit',
      iconAlt: '혜택',
      caption: '혜택 모아보기',
      channels: ['PC', 'APP'],
      loginCond: 'ALL',
      authCond: 'NONE',
      segment: '전체',
      channelCond: ['PC', 'APP'],
      org: '혜택기획팀',
      owner: 'P213980',
      status: 'DRAFT',
      changeReason: '혜택 개편에 따른 메뉴명 변경',
      rejectReason: null,
      updatedAt: '2026-08-21 14:02',
      updatedBy: 'P213980',
      isNew: false,
      approved: snap({ name: '혜택관', order: 1, linkTarget: 'CT-0101 혜택 홈', caption: '혜택 모아보기' }, baseSnap),
      history: [
        h('2026-08-21 14:02', 'P213980', '메뉴명', '혜택관', '혜택', '혜택 개편에 따른 메뉴명 변경', null, '초안 저장'),
        h('2026-08-15 09:11', 'P213980', '노출 채널', 'APP', 'PC·APP', 'PC 웹 오픈 대응', 'P100234', '승인 완료'),
      ],
    },
    {
      id: 'm-benefit-partner',
      code: 'MNU-0101-01',
      name: '제휴 혜택',
      depth: 2,
      parentId: 'm-benefit',
      order: 1,
      active: true,
      visibility: '공개',
      linkType: 'CONTAINER',
      linkTarget: 'CT-0142 제휴 혜택',
      linkApproved: true,
      icon: 'ic_partner',
      iconAlt: null, // 대체텍스트 없음 → 검수 요청 차단 (PI-DSP-CMP-004)
      caption: null,
      channels: ['PC', 'APP'],
      loginCond: 'ALL',
      authCond: 'NONE',
      segment: '전체',
      channelCond: ['PC', 'APP'],
      org: '혜택기획팀',
      owner: 'P213980',
      status: 'DRAFT',
      changeReason: '제휴 혜택 신규 노출',
      rejectReason: null,
      updatedAt: '2026-08-21 11:40',
      updatedBy: 'P213980',
      isNew: true,
      approved: null,
      history: [h('2026-08-21 11:40', 'P213980', '노출 등록', '-', '제휴 혜택', '제휴 혜택 신규 노출', null, '초안 저장')],
    },
    {
      id: 'm-benefit-membership',
      code: 'MNU-0101-02',
      name: '멤버십',
      depth: 2,
      parentId: 'm-benefit',
      order: 2,
      active: true,
      visibility: '공개',
      linkType: 'CONTAINER',
      linkTarget: 'CT-0143 멤버십',
      linkApproved: true,
      icon: null,
      iconAlt: null,
      caption: null,
      channels: ['PC', 'APP'],
      loginCond: 'LOGIN',
      authCond: 'NONE',
      segment: '전체',
      channelCond: ['PC', 'APP'],
      org: '혜택기획팀',
      owner: 'P213980',
      status: 'APPROVED',
      changeReason: null,
      rejectReason: null,
      updatedAt: '2026-08-01 10:00',
      updatedBy: 'P213980',
      isNew: false,
      approved: snap({ name: '멤버십', order: 2, linkTarget: 'CT-0143 멤버십', loginCond: 'LOGIN' }, baseSnap),
      history: [h('2026-08-01 10:00', 'P213980', '게시', '-', '게시 중', '멤버십 개편 반영', 'P100234', '게시 중')],
    },
    {
      id: 'm-benefit-membership-coupon',
      code: 'MNU-0101-02-01',
      name: '쿠폰함',
      depth: 3,
      parentId: 'm-benefit-membership',
      order: 1,
      active: true,
      visibility: '공개',
      linkType: 'INTERNAL',
      linkTarget: '/benefit/coupon',
      linkApproved: true,
      icon: null,
      iconAlt: null,
      caption: null,
      channels: ['APP'],
      loginCond: 'LOGIN',
      authCond: 'NONE',
      segment: '전체',
      channelCond: ['APP'],
      org: '혜택기획팀',
      owner: 'P213980',
      status: 'APPROVED',
      changeReason: null,
      rejectReason: null,
      updatedAt: '2026-07-20 15:30',
      updatedBy: 'P213980',
      isNew: false,
      approved: snap({ name: '쿠폰함', order: 1, linkType: 'INTERNAL', linkTarget: '/benefit/coupon', loginCond: 'LOGIN', channels: ['APP'], channelCond: ['APP'] }, baseSnap),
      history: [h('2026-07-20 15:30', 'P213980', '게시', '-', '게시 중', '쿠폰함 오픈', 'P100234', '게시 중')],
    },
    {
      id: 'm-shop',
      code: 'MNU-0102',
      name: 'Shop',
      depth: 1,
      parentId: null,
      order: 2,
      active: true,
      visibility: '공개',
      linkType: 'CONTAINER',
      linkTarget: 'CT-0102 Shop 홈',
      linkApproved: true,
      icon: 'ic_shop',
      iconAlt: 'Shop',
      caption: null,
      channels: ['PC', 'APP'],
      loginCond: 'ALL',
      authCond: 'NONE',
      segment: '전체',
      channelCond: ['PC', 'APP'],
      org: 'Shop기획팀',
      owner: 'P220114',
      status: 'DRAFT',
      changeReason: '메인 진입 순서 조정',
      rejectReason: null,
      updatedAt: '2026-08-21 13:20',
      updatedBy: 'P220114',
      isNew: false,
      // 승인본에서는 3번째였다 → 순서변경 diff
      approved: snap({ name: 'Shop', order: 3, linkTarget: 'CT-0102 Shop 홈' }, baseSnap),
      history: [h('2026-08-21 13:20', 'P220114', '정렬 순서', '3', '2', '메인 진입 순서 조정', null, '초안 저장')],
    },
    {
      id: 'm-bill',
      code: 'MNU-0103',
      name: '요금·납부',
      depth: 1,
      parentId: null,
      order: 3,
      active: true,
      visibility: '공개',
      linkType: 'CONTAINER',
      linkTarget: null, // 연결 대상 없음 → 게시·검수 차단 (PI-DSP-MNU-002)
      linkApproved: false,
      icon: 'ic_bill',
      iconAlt: '요금 납부',
      caption: null,
      channels: ['PC', 'APP'],
      loginCond: 'LOGIN',
      authCond: 'REQUIRED',
      segment: '전체',
      channelCond: ['PC', 'APP'],
      org: '고객경험팀',
      owner: 'P231007',
      status: 'REJECTED',
      changeReason: '요금 메뉴 신설',
      rejectReason: '연결 대상 미지정 · 랜딩 확인 불가',
      updatedAt: '2026-08-20 17:45',
      updatedBy: 'P100234',
      isNew: true,
      approved: null,
      history: [
        h('2026-08-20 17:45', 'P100234', '검수', '검수 대기', '수정 필요', '연결 대상 미지정 · 랜딩 확인 불가', 'P100234', '반려'),
        h('2026-08-20 16:02', 'P231007', '검수 요청', '초안 작성중', '검수 대기', '요금 메뉴 신설', null, '검수 요청'),
      ],
    },
    {
      id: 'm-event',
      code: 'MNU-0104',
      name: '이벤트',
      depth: 1,
      parentId: null,
      order: 4,
      active: false, // 미사용 → 하위 Depth 동반 미노출
      visibility: '공개',
      linkType: 'CONTAINER',
      linkTarget: 'CT-0104 이벤트 홈',
      linkApproved: true,
      icon: 'ic_event',
      iconAlt: '이벤트',
      caption: null,
      channels: ['PC', 'APP'],
      loginCond: 'ALL',
      authCond: 'NONE',
      segment: '전체',
      channelCond: ['PC', 'APP'],
      org: '전시운영팀',
      owner: 'P213980',
      status: 'APPROVED',
      changeReason: '하계 프로모션 종료',
      rejectReason: null,
      updatedAt: '2026-07-30 09:00',
      updatedBy: 'P213980',
      isNew: false,
      approved: snap({ name: '이벤트', order: 4, active: false, linkTarget: 'CT-0104 이벤트 홈' }, baseSnap),
      history: [h('2026-07-30 09:00', 'P213980', '사용 여부', '사용', '미사용', '하계 프로모션 종료', 'P100234', '게시 중지')],
    },
    {
      id: 'm-event-ongoing',
      code: 'MNU-0104-01',
      name: '진행 중 이벤트',
      depth: 2,
      parentId: 'm-event',
      order: 1,
      active: true,
      visibility: '공개',
      linkType: 'CONTAINER',
      linkTarget: 'CT-0151 이벤트 리스트',
      linkApproved: true,
      icon: null,
      iconAlt: null,
      caption: null,
      channels: ['PC', 'APP'],
      loginCond: 'ALL',
      authCond: 'NONE',
      segment: '전체',
      channelCond: ['PC', 'APP'],
      org: '전시운영팀',
      owner: 'P213980',
      status: 'APPROVED',
      changeReason: null,
      rejectReason: null,
      updatedAt: '2026-07-30 09:00',
      updatedBy: 'P213980',
      isNew: false,
      approved: snap({ name: '진행 중 이벤트', order: 1, linkTarget: 'CT-0151 이벤트 리스트' }, baseSnap),
      history: [],
    },
    {
      id: 'm-support',
      code: 'MNU-0105',
      name: '고객지원',
      depth: 1,
      parentId: null,
      order: 5,
      active: true,
      visibility: '공개',
      linkType: 'CONTAINER',
      linkTarget: 'CT-0105 고객지원 홈',
      linkApproved: true,
      icon: 'ic_support',
      iconAlt: '고객지원',
      caption: '문의·상담',
      channels: ['PC', 'APP'],
      loginCond: 'ALL',
      authCond: 'NONE',
      segment: '전체',
      channelCond: ['PC', 'APP'],
      org: '고객경험팀',
      owner: 'P231007',
      status: 'APPROVED', // 승인 완료 → 게시 버튼 활성 테스트용
      changeReason: '표시 문구 추가',
      rejectReason: null,
      updatedAt: '2026-08-21 10:15',
      updatedBy: 'P100234',
      isNew: false,
      approved: snap({ name: '고객지원', order: 5, linkTarget: 'CT-0105 고객지원 홈', caption: null }, baseSnap),
      history: [
        h('2026-08-21 10:15', 'P100234', '검수', '검수 대기', '승인 완료', '표시 문구 추가', 'P100234', '승인 완료'),
        h('2026-08-21 09:30', 'P231007', '표시 문구', '-', '문의·상담', '표시 문구 추가', null, '검수 요청'),
      ],
    },
    {
      id: 'm-my',
      code: 'MNU-0106',
      name: 'MY',
      depth: 1,
      parentId: null,
      order: 6,
      active: true,
      visibility: '공개',
      linkType: 'CONTAINER',
      linkTarget: 'CT-0210 MY 홈(검수 대기)',
      linkApproved: false, // 미승인 Container 연결 → 게시 차단
      icon: 'ic_my',
      iconAlt: 'MY',
      caption: null,
      channels: ['PC', 'APP'],
      loginCond: 'LOGIN',
      authCond: 'NONE',
      segment: 'VIP', // 대상 고객군 제한 → 조건별 미노출 확인용
      channelCond: ['APP'], // 표시 채널(PC·APP)과 불일치 → 검수 차단
      org: '전시운영팀',
      owner: 'P213980',
      status: 'DRAFT',
      changeReason: 'MY 개편 연결',
      rejectReason: null,
      updatedAt: '2026-08-21 12:05',
      updatedBy: 'P213980',
      isNew: false,
      approved: snap({ name: 'MY', order: 6, linkTarget: 'CT-0106 MY 홈', loginCond: 'LOGIN' }, baseSnap),
      history: [h('2026-08-21 12:05', 'P213980', '연결 대상', 'CT-0106 MY 홈', 'CT-0210 MY 홈(검수 대기)', 'MY 개편 연결', null, '초안 저장')],
    },
  ];
}

/* ------------------------------------------------------------------ */
/* 검수 요청 차단 판정 (PI-DSP-MNU-002 / PI-DSP-WFL-001 / PI-DSP-CMP-004) */
/* ------------------------------------------------------------------ */

export type Issue = { label: string; policy: string; kind: 'PUBLISH' | 'REVIEW' };

export function validateNode(n: MenuNode): Issue[] {
  const out: Issue[] = [];
  if (!n.linkTarget) out.push({ label: '연결 대상 없음', policy: 'PI-DSP-MNU-002', kind: 'PUBLISH' });
  else if (!n.linkApproved) out.push({ label: `미승인 연결 대상 (${n.linkTarget})`, policy: 'PI-DSP-MNU-002', kind: 'PUBLISH' });

  const shown = [...n.channels].sort().join(',');
  const cond = [...n.channelCond].sort().join(',');
  if (n.channels.length && n.channelCond.length && shown !== cond)
    out.push({ label: `표시 채널(${shown || '-'}) ↔ 노출 채널(${cond || '-'}) 불일치`, policy: 'PI-DSP-MNU-002', kind: 'REVIEW' });

  if (!n.channelCond.length) out.push({ label: '노출 조건 누락 — 채널 조건', policy: 'PI-DSP-MNU-001', kind: 'REVIEW' });
  if (!n.segment) out.push({ label: '노출 조건 누락 — 대상 고객군', policy: 'PI-DSP-MNU-001', kind: 'REVIEW' });
  if (!n.org) out.push({ label: '운영 정보 누락 — 담당 조직', policy: 'PI-DSP-MNU-001', kind: 'REVIEW' });
  if (!n.owner) out.push({ label: '운영 정보 누락 — 담당자', policy: 'PI-DSP-MNU-001', kind: 'REVIEW' });
  if (!n.changeReason) out.push({ label: '운영 정보 누락 — 변경 사유', policy: 'PI-DSP-AUD-002', kind: 'REVIEW' });
  if (n.icon && !n.iconAlt) out.push({ label: '아이콘 대체텍스트 없음', policy: 'PI-DSP-CMP-004', kind: 'REVIEW' });
  return out;
}

/* ------------------------------------------------------------------ */
/* 승인본 대비 변경(diff) — 미리보기 배지용                            */
/* ------------------------------------------------------------------ */

export type DiffKind = '추가' | '명칭변경' | '순서변경' | '노출변경' | '연결변경' | '조건변경';

export function diffOf(n: MenuNode): DiffKind[] {
  if (n.isNew) return ['추가'];
  const a = n.approved;
  if (!a) return ['추가'];
  const out: DiffKind[] = [];
  if (a.name !== n.name) out.push('명칭변경');
  if (a.order !== n.order) out.push('순서변경');
  if (a.active !== n.active) out.push('노출변경');
  if (a.linkTarget !== n.linkTarget) out.push('연결변경');
  if (a.loginCond !== n.loginCond || a.segment !== n.segment || [...a.channelCond].sort().join() !== [...n.channelCond].sort().join())
    out.push('조건변경');
  return out;
}

/** 승인본 뷰 — 승인 시점 값으로 되돌린 노드. 신규(미승인) 노출은 제외 대상. */
export function toApprovedView(n: MenuNode): MenuNode | null {
  if (n.isNew || !n.approved) return null;
  const a = n.approved;
  return { ...n, ...a, status: 'APPROVED' };
}

/* ------------------------------------------------------------------ */
/* 미리보기 노출 판정                                                  */
/* ------------------------------------------------------------------ */

export type PreviewCond = {
  login: 'GUEST' | 'MEMBER';
  auth: 'NONE' | 'GRANTED';
  segment: string;
  channel: Channel;
};

export type VerdictResult = 'SHOW' | 'HIDE' | 'BLOCK_PUBLISH' | 'BLOCK_REVIEW';

export type Verdict = {
  id: string;
  name: string;
  depth: number;
  result: VerdictResult;
  reason: string;
  policy: string;
};

export const VERDICT_LABEL: Record<VerdictResult, string> = {
  SHOW: '노출',
  HIDE: '미노출',
  BLOCK_PUBLISH: '게시 차단',
  BLOCK_REVIEW: '검수 차단',
};

/**
 * 조건 세트 기준으로 메뉴별 노출 결과를 판정한다.
 * base='APPROVED' 이면 승인본(미승인 변경 제외), 'WORKING' 이면 작업본.
 */
export function evaluateMenus(nodes: MenuNode[], cond: PreviewCond, base: 'APPROVED' | 'WORKING'): Verdict[] {
  const list = base === 'WORKING' ? nodes : (nodes.map(toApprovedView).filter(Boolean) as MenuNode[]);
  const byId = new Map(list.map((n) => [n.id, n]));
  const inactiveAncestor = (n: MenuNode): MenuNode | null => {
    let p = n.parentId ? byId.get(n.parentId) : undefined;
    while (p) {
      if (!p.active) return p;
      p = p.parentId ? byId.get(p.parentId) : undefined;
    }
    return null;
  };

  return list
    .slice()
    .sort((a, b) => a.depth - b.depth || a.order - b.order)
    .map<Verdict>((n) => {
      const v = (result: VerdictResult, reason: string, policy: string): Verdict => ({
        id: n.id, name: n.name, depth: n.depth, result, reason, policy,
      });

      // 1) 사용 여부 · 상속
      if (!n.active) return v('HIDE', '사용여부 = 미사용', 'PI-DSP-MNU-001');
      const dead = inactiveAncestor(n);
      if (dead) return v('HIDE', `상위 미사용 상속 (${dead.name})`, 'PI-DSP-MNU-001');

      // 2) 연결값 검증 — 게시 차단
      if (!n.linkTarget) return v('BLOCK_PUBLISH', '연결 대상 없음', 'PI-DSP-MNU-002');
      if (!n.linkApproved) return v('BLOCK_PUBLISH', `미승인 연결 대상 (${n.linkTarget})`, 'PI-DSP-MNU-002');

      // 3) 정합성 — 검수 차단. 미승인(초안·검수대기·반려) 건만 판정 대상이다.
      const review = UNAPPROVED.includes(n.status) ? validateNode(n).filter((i) => i.kind === 'REVIEW') : [];
      if (review.length) return v('BLOCK_REVIEW', review[0].label, review[0].policy);

      // 4) 노출 조건 판정 (PI-DSP-MNU-001 필수 4종)
      if (n.loginCond === 'LOGIN' && cond.login === 'GUEST') return v('HIDE', '로그인 조건 = 로그인 시 노출', 'PI-DSP-MNU-001');
      if (n.authCond === 'REQUIRED' && cond.auth === 'NONE') return v('HIDE', '권한 조건 = 권한 필요', 'PI-DSP-MNU-001');
      if (n.segment !== '전체' && n.segment !== cond.segment) return v('HIDE', `대상 고객군 = ${n.segment}`, 'PI-DSP-MNU-001');
      if (!n.channelCond.includes(cond.channel)) return v('HIDE', `노출 채널 = ${n.channelCond.join('·') || '-'}`, 'PI-DSP-MNU-001');

      return v('SHOW', '조건 충족', 'PI-DSP-MNU-001');
    });
}

/** 트리 정렬용 — parentId/order 기준으로 평면 목록을 계층 순서로 재배열 */
export function orderTree(nodes: MenuNode[]): MenuNode[] {
  const out: MenuNode[] = [];
  const walk = (parentId: string | null) => {
    nodes
      .filter((n) => n.parentId === parentId)
      .sort((a, b) => a.order - b.order)
      .forEach((n) => {
        out.push(n);
        walk(n.id);
      });
  };
  walk(null);
  return out;
}
