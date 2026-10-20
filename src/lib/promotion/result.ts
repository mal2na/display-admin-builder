/**
 * 프로모션 관리 › 결과 관리 — 프로토타입(결과 관리 목록·상세) React 이식 모델(2026-10-20).
 *  프로모션 목록 데이터에서 이벤트 + 참여ㆍ리워드형/추천형 중 진행 이력이 있는 건을 뽑아
 *  참여자/당첨자/지급/승인/발표/최종 처리 상태를 '시드 기반' 난수로 생성(매 렌더 안정).
 */
import { promoRows, fullYmd, type PromoRow } from './model';

export const RS_TYPES = ['참여ㆍ리워드형', '추천형'];
export const RS_ST = ['진행예정', '진행중', '일시중단', '즉시종료', '기간종료', '완료'];
export const RS_PROC = ['전체', '선정 대기', '진행 중', '지급 완료'];
export const RS_PERIODS = ['참여 기간', '결과 발표일', '최종 처리일시'];
export const RS_KEY_TYPES = ['프로모션 명', '프로모션 ID', '최종 처리자'];

type Tone = 'info' | 'success' | 'negative' | 'warning' | 'neutral' | 'emphasis' | 'highlight';
/** 프로토타입 p-색 → 어드민 StatusPill tone */
export const PROC_TONE: Record<string, Tone> = { '선정 대기': 'warning', '진행 중': 'info', '지급 완료': 'neutral' };
export const APV_TONE: Record<string, Tone> = { '승인 요청': 'warning', '승인 완료': 'success', 반려: 'negative' };

export type ResultRow = {
  no: number; id: string; type: string; name: string; st: string;
  join: string; joinS: string; joinE: string;
  apv: string; proc: string; part: number; win: number; cap: number | null; paid: number;
  announce: string; worker: string; workAt: string;
};

export type ResultFilter = {
  ty: string[]; st: string[]; proc: string; period: string;
  from: string; to: string; keyType: string; keyword: string;
};
export const RESULT_F0: ResultFilter = {
  ty: RS_TYPES.slice(), st: RS_ST.slice(), proc: '전체', period: '참여 기간',
  from: '', to: '', keyType: '프로모션 명', keyword: '',
};

const WORKERS = ['홍길동(P123456)', '김민지(P217129)', '이서준(P204581)'];
const toDT = (d: Date) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** 결과 관리 행 — 프로토타입과 동일한 시드 LCG 로 안정 생성 */
let _rows: ResultRow[] | null = null;
export function resultRows(): ResultRow[] {
  if (_rows) return _rows;
  let rs = 20261014;
  const r = () => { rs = (rs * 1664525 + 1013904223) % 4294967296; return rs / 4294967296; };
  const pk = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const data: PromoRow[] = promoRows();
  _rows = data.filter((d) => d.cat === '이벤트' && RS_TYPES.includes(d.sub) && RS_ST.includes(d.st)).map((d) => {
    const [js, je] = fullYmd(d.join).split(' ~ ');
    const join = `${js} 00:00 ~ ${je} 23:59`;
    const before = d.st === '진행예정';
    const ended = ['즉시종료', '기간종료', '완료'].includes(d.st);
    const part = before ? 0 : Math.floor(200 + r() * 9800);
    const all = r() < 0.3;              // 대상자 선정 '전원'
    const post = !all && r() < 0.45;    // 사후 선정(추첨 수동·행동 연동)
    const cap = all ? null : Math.max(10, Math.round((part * (0.05 + r() * 0.3)) / 10) * 10 || 100);
    let win = before ? 0 : all ? Math.floor(part * (0.6 + r() * 0.4)) : Math.min(cap as number, part);
    let proc: string; let paid: number; let announce: string; let apv: string;
    if (before) { proc = '-'; paid = 0; announce = post ? '발표 전' : '해당 없음'; apv = '-'; }
    else if (post && !ended) { proc = '선정 대기'; win = 0; paid = 0; announce = '발표 전'; apv = r() < 0.4 ? '승인 요청' : '-'; }
    else {
      paid = d.st === '완료' ? win : Math.floor(win * (ended ? 0.85 + r() * 0.15 : 0.3 + r() * 0.6));
      proc = paid >= win ? '지급 완료' : '진행 중';
      const ad = new Date(2026, 8, 1 + Math.floor(r() * 40), 10 + Math.floor(r() * 8), Math.floor(r() * 6) * 10);
      announce = post ? (ended || r() < 0.5 ? toDT(ad) : '발표 전') : '해당 없음';
      apv = post ? (announce === '발표 전' ? pk(['승인 요청', '반려', '승인 완료']) : '승인 완료') : (r() < 0.2 ? '승인 완료' : '-');
    }
    const hasWork = !before && (win > 0 || apv !== '-');
    const wd = new Date(2026, 8, 5 + Math.floor(r() * 38), 9 + Math.floor(r() * 9), Math.floor(r() * 60));
    return {
      no: d.no, id: d.id, type: d.sub, name: d.name.replace('[예시] ', ''), st: d.st, join,
      joinS: js.replace(/\./g, '-'), joinE: je.replace(/\./g, '-'),
      apv, proc, part, win, cap, paid, announce,
      worker: hasWork ? pk(WORKERS) : '-', workAt: hasWork ? toDT(wd) : '-',
    };
  });
  return _rows;
}

const ymd = (t: string) => (t && t !== '-' && t !== '발표 전' && t !== '해당 없음' ? t.slice(0, 10).replace(/\./g, '-') : null);

export function filterResults(rows: ResultRow[], f: ResultFilter): ResultRow[] {
  return rows.filter((x) => {
    if (!f.ty.includes(x.type) || !f.st.includes(x.st)) return false;
    if (f.proc !== '전체' && x.proc !== f.proc) return false;
    if (f.from || f.to) {
      let a: string | null; let b: string | null;
      if (f.period === '참여 기간') { a = x.joinS; b = x.joinE; }
      else { a = b = ymd(f.period === '결과 발표일' ? x.announce : x.workAt); if (!a) return false; }
      if (f.from && (b as string) < f.from) return false;
      if (f.to && (a as string) > f.to) return false;
    }
    if (f.keyword) {
      const kw = f.keyword.trim().toLowerCase();
      const field = ({ '프로모션 명': x.name, '프로모션 ID': x.id, '최종 처리자': x.worker } as Record<string, string>)[f.keyType];
      if (!String(field).toLowerCase().includes(kw)) return false;
    }
    return true;
  });
}
