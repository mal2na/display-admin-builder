// 로밍국가 관리 — 상수/파서. prisma 의존 없음(클라이언트 공용).

// 콘텐츠(서비스타입) 탭 — 국가정보 + 서비스타입 5종 (SB PG561~572)
export const ROAMING_CONTENT_TABS = ['국가정보', 'WCDMA', 'GSM', 'LTE', 'CDMA', '임대로밍'] as const;
export type RoamingContentTab = (typeof ROAMING_CONTENT_TABS)[number];
// 서비스타입 ↔ DB 컬럼 키
export const SERVICE_KEY: Record<string, 'wcdma' | 'gsm' | 'lte' | 'cdma' | 'lease'> = {
  WCDMA: 'wcdma', GSM: 'gsm', LTE: 'lte', CDMA: 'cdma', 임대로밍: 'lease',
};

export const CONTINENTS = ['미주/남미', '아시아', '아프리카', '유럽', '중동', '오세아니아'] as const;

// 서비스타입 콘텐츠 JSON 구조
export type ServiceContent = {
  serviceInfo: string; aBand: string; autoBand: string; bBand: string;
  callMake: { local: string; domesticFixed: string; domesticMobile: string };
  callReceive: { korea: string; local: string };
  addon: string; cautionPc: string; cautionMobile: string; csPhone: string;
  dataRoamingYn: boolean; usage1: string; usage2: string; usage3: string; fee1: string; fee2: string; fee3: string;
  dataAvailYn: boolean; videoCallYn: boolean;
  smsYn: boolean; smsReceive: boolean; smsKeeper: boolean; smsSend: boolean; smsShowNumber: boolean; smsNote: string;
  pcMode: 'all' | 'input' | 'link'; pcContent: string;
  mobileMode: 'all' | 'input' | 'link'; mobileContent: string;
};

export function emptyService(): ServiceContent {
  return {
    serviceInfo: '', aBand: '', autoBand: '', bBand: '',
    callMake: { local: '', domesticFixed: '', domesticMobile: '' },
    callReceive: { korea: '', local: '' },
    addon: '', cautionPc: '', cautionMobile: '', csPhone: '',
    dataRoamingYn: false, usage1: '', usage2: '', usage3: '', fee1: '', fee2: '', fee3: '',
    dataAvailYn: true, videoCallYn: true,
    smsYn: true, smsReceive: true, smsKeeper: false, smsSend: true, smsShowNumber: true, smsNote: '',
    pcMode: 'all', pcContent: '', mobileMode: 'all', mobileContent: '',
  };
}

export function parseService(json: string | null | undefined): ServiceContent {
  if (!json) return emptyService();
  try { return { ...emptyService(), ...JSON.parse(json) }; } catch { return emptyService(); }
}

// 미반영 값은 하이픈(-)으로 (SB 상세 표기 규칙)
export const dash = (v: string | null | undefined) => (v && v.trim() ? v : '-');

// 승인상태 라벨/톤 — 임시저장/승인대기/승인완료/승인반려/요청취소
export const ROAMING_APPROVAL: Record<string, { label: string; tone: string }> = {
  draft: { label: '임시저장', tone: 'muted' },
  requested: { label: '승인대기', tone: 'info' },
  approved: { label: '승인완료', tone: 'success' },
  rejected: { label: '승인반려', tone: 'negative' },
  cancelled: { label: '요청취소', tone: 'warning' },
};
