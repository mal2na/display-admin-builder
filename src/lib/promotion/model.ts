/**
 * 프로모션 관리 — 목록 데이터 모델 (public/promotion-prototype.html 의 React 이식본).
 * 시드 16건 + 의사난수(LCG)로 1,649건을 더 만들어 총 1,665건. 난수 시드가 고정이라
 * 프로토타입과 같은 데이터가 나온다.
 */

export const EVENT_TYPES = ['안내형', '참여ㆍ리워드형', '추천형'];
export const MISSION_TYPES = ['행동완료형', '출석형', '누적형', '단계완료형', '전환형', '유지형', '탐험형', '협업형', '개인화형', '성장형'];
export const STATUSES = ['등록 중', '등록완료', '진행예정', '진행중', '일시중단', '즉시종료', '기간종료', '완료'];

/** 프로모션 상태 → 공용 칩 톤(ops-ui TONES). 5종 밖의 색은 쓰지 않는다. */
export const STATUS_TONE: Record<string, 'info' | 'success' | 'negative' | 'warning' | 'neutral' | 'emphasis'> = {
  '등록 중': 'info', 등록완료: 'info', 진행예정: 'neutral', 진행중: 'success',
  일시중단: 'emphasis', 즉시종료: 'negative', 기간종료: 'warning', 완료: 'neutral',
};

export const PERIOD_TYPES = ['전시기간', '참여기간', '등록일시', '최종수정일시'];
export const KEY_TYPES = ['프로모션 명', '프로모션 ID', '등록자', '최종수정자'];

export type PromoRow = {
  no: number; id: string; disp: string; join: string; cat: string; sub: string; name: string;
  dispSt: string; cmt: string; cmtCnt: number;
  reg: string; regAt: string; mod: string; modAt: string; st: string;
  /** 설정 예시 프리셋 키 (있으면 목록에서 「예시」 배지) */
  ex?: string;
};

const H = '홍길동(P123456)';

type Seed = [number, string, string, string, string, string, string, string, number, string, string, string, string?];
const seed: Seed[] = [
  [1665, '26.09.10 ~ 26.10.28', '26.09.10 ~ 26.10.28', '이벤트', '추천형', '[예시] 신규·복귀 추천인 코드 이벤트', '전시', '미사용', 0, '2026.09.29 11:10', '2026.09.29 11:10', '진행중', 'fc'],
  [1664, '26.09.01 ~ 26.12.31', '26.09.01 ~ 26.12.31', '이벤트', '추천형', '[예시] 친구 초대하고 둘 다 포인트 받기', '전시', '미사용', 0, '2026.09.29 11:09', '2026.09.29 11:09', '진행중', 'ktm'],
  [1663, '26.09.10 ~ 26.11.04', '26.09.10 ~ 26.11.04', '이벤트', '참여ㆍ리워드형', '[예시] Only One Choice — 의상 세트 골라 받기', '전시', '미사용', 0, '2026.09.29 11:08', '2026.09.29 11:08', '진행중', 'pubg'],
  [1662, '26.09.17 ~ 26.10.12', '26.09.17 ~ 26.10.11', '이벤트', '참여ㆍ리워드형', '[예시] 런메이트 가민 런 코리아 참가권 응모', '전시', '사용', 0, '2026.09.29 11:07', '2026.09.29 11:07', '진행중', 'run'],
  [1661, '26.09.12 ~ 26.10.18', '26.09.12 ~ 26.10.18', '이벤트', '참여ㆍ리워드형', '[예시] 아이폰18 개통 고객 카카오페이 쿠폰 증정', '전시', '미사용', 0, '2026.09.29 11:06', '2026.09.29 11:06', '진행중', 'iphone'],
  [1660, '26.09.01 ~ 26.09.30', '26.09.01 ~ 26.09.30', '이벤트', '안내형', '[예시] T 멤버십 9월 일본 여행 혜택', '전시', '미사용', 0, '2026.09.29 11:05', '2026.09.29 11:05', '기간종료', 'jp'],
  [1659, '26.08.01 ~ 26.08.30', '26.08.05 ~ 26.08.19', '이벤트', '참여ㆍ리워드형', '스타벅스 기프티콘 증정 이벤트', '전시', '사용', 128, '2026.07.26 20:35', '2026.08.26 20:35', '진행중'],
  [1658, '26.07.01 ~ 26.07.30', '26.07.05 ~ 26.07.19', '이벤트', '안내형', '구독찬스 TEST', '미전시', '미사용', 0, '2026.07.24 16:29', '2026.08.24 16:29', '등록 중'],
  [1657, '26.06.01 ~ 26.07.30', '26.06.05 ~ 26.07.19', '이벤트', '참여ㆍ리워드형', '현대 식품관 투홈 20% 시크릿 쿠폰 증정 이벤트', '미전시', '사용', 65, '2026.07.20 15:15', '2026.08.20 15:15', '일시중단'],
  [1656, '26.05.15 ~ 26.05.30', '26.05.05 ~ 26.05.19', '이벤트', '안내형', '원스토어 북스 경이로운 무료 혜택', '미전시', '미사용', 0, '2026.07.18 20:13', '2026.08.18 20:13', '등록완료'],
  [1655, '26.05.01 ~ 26.08.30', '26.05.05 ~ 26.08.19', '이벤트', '참여ㆍ리워드형', '댓글응모 test', '미전시', '사용', 30, '2026.07.17 16:01', '2026.08.17 16:01', '완료'],
  [1654, '26.05.01 ~ 26.07.30', '26.05.05 ~ 26.07.19', '이벤트', '참여ㆍ리워드형', '현대 식품관 투홈 20% 시크릿 쿠폰 증정 이벤트', '미전시', '사용', 12, '2026.07.15 13:52', '2026.08.15 13:52', '완료'],
  [1653, '26.04.01 ~ 26.06.30', '26.04.05 ~ 26.06.19', '이벤트', '참여ㆍ리워드형', '스타벅스 기프티콘 응모', '미전시', '사용', 24, '2026.07.14 11:30', '2026.08.14 11:30', '기간종료'],
  [1652, '26.03.01 ~ 26.05.30', '26.03.05 ~ 26.05.19', '이벤트', '참여ㆍ리워드형', '원스토어 북스 경이로운 무료 혜택', '미전시', '사용', 12, '2026.07.12 19:20', '2026.08.12 19:20', '즉시종료'],
  [1651, '26.02.01 ~ 26.02.12', '26.02.05 ~ 26.02.10', '이벤트', '추천형', '현대 백화점 모바일카드 이벤트', '미전시', '사용', 10, '2026.07.05 16:35', '2026.08.05 16:35', '기간종료'],
  [1650, '26.02.01 ~ 26.12.01', '26.02.01 ~ 26.11.01', '이벤트', '안내형', '스타벅스 기프티콘 TEST', '전시', '미사용', 0, '2026.06.30 18:46', '2026.07.30 18:46', '기간종료'],
];

const EV_NAMES = ['스타벅스 기프티콘 증정 이벤트', '신규 가입 웰컴 쿠폰팩', '친구 초대하고 포인트 받기', '가을맞이 기획전 안내', '더현대 서울 팝업 초대 이벤트', '모바일카드 첫 결제 캐시백', '주말 한정 럭키드로우', '멤버십 등급 혜택 안내', '리뷰 작성하고 적립금 받기', '추석 선물세트 사전예약 안내'];
const MS_NAMES = ['7일 연속 출석 체크', '첫 구매 미션 챌린지', '누적 결제 3회 달성', '앱 푸시 알림 켜기', '매장 방문 스탬프 투어', '함께 걷기 팀 미션', '나만의 취향 설정하기', '등급 올리기 성장 미션', '구독 유지 3개월 미션', '단계별 쿠폰 모으기'];
const OTHERS = [H, H, H, '김민지(P217129)', '이서준(P204581)'];

const pad = (n: number) => String(n).padStart(2, '0');
const toD = (d: Date) => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
const toYY = (d: Date) => toD(d).slice(2);
const toDT = (d: Date) => `${toD(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

function build(): PromoRow[] {
  let s = 20260730;
  const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];

  const rows: PromoRow[] = seed.map((r) => ({
    no: r[0], id: `ENV${121797 + r[0]}`, disp: r[1], join: r[2], cat: r[3], sub: r[4], name: r[5],
    dispSt: r[6], cmt: r[7], cmtCnt: r[8], reg: H, regAt: r[9], mod: H, modAt: r[10], st: r[11], ex: r[12],
  }));

  const base = new Date(2026, 6, 1).getTime();
  for (let no = 1649; no >= 1; no -= 1) {
    const regD = new Date(base - (1649 - no) * 0.38 * 86400000 - rnd() * 86400000 * 0.3);
    regD.setHours(9 + Math.floor(rnd() * 11), Math.floor(rnd() * 60));
    const ds = new Date(regD.getTime() + (3 + rnd() * 20) * 86400000);
    const de = new Date(ds.getTime() + (10 + rnd() * 80) * 86400000);
    const js = new Date(ds.getTime() + 4 * 86400000);
    const je = new Date(de.getTime() - (3 + rnd() * 8) * 86400000);
    const modD = new Date(regD.getTime() + rnd() * 40 * 86400000);
    modD.setHours(9 + Math.floor(rnd() * 11), Math.floor(rnd() * 60));
    const isEv = rnd() < 0.62;
    const cmt = rnd() < 0.65 ? '사용' : '미사용';
    const reg = pick(OTHERS);
    const edited = rnd() < 0.8;
    rows.push({
      no, id: `ENV${121797 + no}`, disp: `${toYY(ds)} ~ ${toYY(de)}`, join: `${toYY(js)} ~ ${toYY(je)}`,
      cat: isEv ? '이벤트' : '미션',
      sub: isEv ? pick(EVENT_TYPES) : pick(MISSION_TYPES),
      name: isEv ? pick(EV_NAMES) : pick(MS_NAMES),
      dispSt: rnd() < 0.3 ? '전시' : '미전시',
      cmt, cmtCnt: cmt === '사용' ? Math.floor(rnd() * 150) : 0,
      reg, regAt: toDT(regD), mod: edited ? pick(OTHERS) : reg, modAt: edited ? toDT(modD) : toDT(regD),
      st: pick(STATUSES),
    });
  }
  return rows;
}

let cache: PromoRow[] | null = null;
export function promoRows(): PromoRow[] {
  if (!cache) cache = build();
  return cache;
}

/* ── 조회 ─────────────────────────────────────────────────────── */
export type PromoFilter = {
  ev: string[]; ms: string[]; st: string[];
  periodType: string; from: string; to: string;
  disp: string; cmt: string; keyType: string; keyword: string;
};
export const PROMO_F0: PromoFilter = {
  ev: EVENT_TYPES.slice(), ms: MISSION_TYPES.slice(), st: STATUSES.slice(),
  periodType: PERIOD_TYPES[0], from: '', to: '', disp: '전체', cmt: '전체',
  keyType: KEY_TYPES[0], keyword: '',
};

const parseYY = (t: string) => { const [y, m, d] = t.split('.'); return `20${y}-${m}-${d}`; };
const parseDT = (t: string) => t.slice(0, 10).replace(/\./g, '-');

export function filterPromos(rows: PromoRow[], f: PromoFilter): PromoRow[] {
  return rows.filter((r) => {
    // 이벤트 유형 / 미션 유형은 서로 OR
    const typeOk = (r.cat === '이벤트' && f.ev.includes(r.sub)) || (r.cat === '미션' && f.ms.includes(r.sub));
    if (!typeOk) return false;
    if (!f.st.includes(r.st)) return false;
    if (f.from || f.to) {
      let a: string; let b: string;
      if (f.periodType === '전시기간' || f.periodType === '참여기간') {
        const [x, y] = (f.periodType === '전시기간' ? r.disp : r.join).split(' ~ ');
        a = parseYY(x); b = parseYY(y);
      } else {
        a = parseDT(f.periodType === '등록일시' ? r.regAt : r.modAt); b = a;
      }
      if (f.from && b < f.from) return false;
      if (f.to && a > f.to) return false;
    }
    if (f.disp !== '전체' && r.dispSt !== f.disp) return false;
    if (f.cmt !== '전체' && r.cmt !== f.cmt) return false;
    if (f.keyword) {
      const kw = f.keyword.trim().toLowerCase();
      const field = ({ '프로모션 명': r.name, '프로모션 ID': r.id, 등록자: r.reg, 최종수정자: r.mod } as Record<string, string>)[f.keyType];
      if (!field.toLowerCase().includes(kw)) return false;
    }
    return true;
  });
}

/** 26.09.10 → 2026.09.10 */
export const fullYmd = (s: string) => String(s || '').replace(/\b(\d{2})\.(\d{2})\.(\d{2})\b/g, '20$1.$2.$3');
