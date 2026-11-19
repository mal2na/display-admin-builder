// 로밍국가 관리 시드 — 대표 국가(일본 풀세트) + 다양한 국가. FORCE_SEED=1 로 재시드.
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 서비스타입 콘텐츠 기본 구조(JSON)
function svc(partial: Record<string, unknown> = {}) {
  return JSON.stringify({
    serviceInfo: '', aBand: '', autoBand: '', bBand: '',
    callMake: { local: '', domesticFixed: '', domesticMobile: '' },
    callReceive: { korea: '', local: '' },
    addon: '', cautionPc: '', cautionMobile: '', csPhone: '',
    dataRoamingYn: false, usage1: '', usage2: '', usage3: '', fee1: '', fee2: '', fee3: '',
    dataAvailYn: true, videoCallYn: true,
    smsYn: true, smsReceive: true, smsKeeper: false, smsSend: true, smsShowNumber: true, smsNote: '',
    pcMode: 'all', pcContent: '', mobileMode: 'all', mobileContent: '',
    ...partial,
  });
}

const JP_WCDMA = svc({
  serviceInfo: '발신자표시서비스(무료), 로밍안내 방송서비스(무료)',
  callMake: {
    local: '일본 지역번호 또는 식별 번호 + 전화번호 + 통화<br>예) 일본에서 일본의 987+1234-5678 로 전화를 걸 때<br>987+1234-5678+통화',
    domesticFixed: '국제전화 접속번호(00)+국가번호+지역번호(0제외)+전화번호+통화<br>예) 일본에서 서울의 02+1234-5678로 전화를 걸 때<br>00+82(한국국가번호)+2+1234-5678+통화',
    domesticMobile: '국제전화 접속번호(00)+국가번호+최초 0제외한 이동전화번호+나머지번호+통화<br>예) 일본에서 서울의 011+1234-5678로 전화를 걸 때<br>00+82(한국국가번호)+11+1234-5678+통화',
  },
  callReceive: {
    korea: '상대방 전화번호(국내와 동일)+통화<br>예) 한국에서 일본에 있는 로밍 고객 011+1234-5678로 전화를 걸 때<br>011+1234-5678+통화',
    local: '로밍 시에 다른 나라에 로밍중인 고객이 어느 국가에 있든지 상관없이 우리나라 국가번호 누름<br>예) 중국에서 미국에 있는 로밍 고객 011-1234-5678로 전화를 걸 때<br>00(국제전화 접속번호)+82(한국국가번호)+11+1234-5678+통화',
  },
  addon: '가. 문자메시지(SMS)<br>1. 문자 받을때 : 무료<br>2. 문자 보낼때 : 유료 (국내의 발신방법과 동일하게 상대방 휴대폰 번호 입력 후 발신)<br>※ VK-530 휴대폰은 발신 불가<br>나. 발신자표시서비스 : 무료<br>다. 콜키퍼서비스 : 무료<br>라. 로밍안내방송서비스 : 무료',
  cautionPc: '수신요금은 현지 사업자 요금과 국제전화 사업자 요금이 합산된 금액 입니다. 국제전화사업자선택 가능.',
  cautionMobile: '수신을 위한 국제전화사업자(SK텔링크, SK브로드밴드, LG유플러스, KT, 세종텔레콤)는 로밍센터 방문 또는 T로밍 고객센터에서 설정 가능합니다.',
  csPhone: '북부108-824/10800-852-1096, 남부 10800-152-1096 접속 > ARS 안내방송중 #을 누름 > 국가별 수신자부담번호 입력> 안내방송 중 #누름> 고객 휴대폰 번호 누르면 상담원 자동연결',
  dataRoamingYn: false, dataAvailYn: true, videoCallYn: true,
  smsYn: true, smsReceive: true, smsSend: true, smsShowNumber: true,
  pcMode: 'all', pcContent: '', mobileMode: 'all', mobileContent: '',
});

const JP_LTE = svc({ serviceInfo: '발신자표시서비스(무료), 로밍안내 방송서비스(무료)', dataRoamingYn: true, usage1: '-', usage2: '-', usage3: '-', fee1: '-', fee2: '-', fee3: '-' });
const JP_GSM = svc({ serviceInfo: '발신자표시서비스(무료), 로밍안내 방송서비스(무료)', dataRoamingYn: false, dataAvailYn: true });
const JP_CDMA = svc({
  serviceInfo: '발신자표시서비스(무료), 로밍안내 방송서비스(무료)',
  autoBand: '※ 자세한 커버리지 정보는 메뉴 "로밍안내>자동로밍" 부분 참고',
  dataRoamingYn: false, dataAvailYn: true,
  smsYn: true, smsReceive: true, smsSend: true, smsShowNumber: true,
  pcMode: 'input', pcContent: '전 지역(티벳 제외)<br>※모토로라 기종을 사용하시는 고객님께서는 최신버전으로 업그레이드 후 T 로밍 서비스를 이용하여 주시기 바랍니다.<br>(T로밍 고객센터: 1599-2011, 유료)',
  mobileMode: 'input', mobileContent: '전 지역(티벳 제외)<br>※모토로라 기종을 사용하시는 고객님께서는 최신버전으로 업그레이드 후 T 로밍 서비스를 이용하여 주시기 바랍니다.',
});
const JP_LEASE = svc({ serviceInfo: '', autoBand: '전 지역', dataRoamingYn: false });

const CONTINENTS = ['아시아', '유럽', '미주', '오세아니아', '중동', '아프리카'];

async function main() {
  const existing = await prisma.roamingCountry.count();
  if (existing > 0 && !process.env.FORCE_SEED) {
    console.log(`↷ 로밍국가가 이미 있어 건너뜁니다 (${existing}건). 재시드하려면 FORCE_SEED=1`);
    return;
  }
  await prisma.roamingRelatedSite.deleteMany();
  await prisma.roamingCountryHistory.deleteMany();
  await prisma.roamingCountry.deleteMany();

  // 대표 국가 — 일본(풀세트)
  const jp = await prisma.roamingCountry.create({
    data: {
      continent: '아시아', nameKo: '일본', nameEn: 'Japan', countryCode: 'JPN', mccCode: '440, 441', gmt: '9', timeDiff: '0',
      searchYn: true, detailYn: true, adjacentCountries: '중국, 대만', currencyCode: 'JPY(100)',
      countryImageUrl: '/skt/roaming/jp_country.png', countryImageAlt: '일본 국가대표 이미지',
      bgImageUrl: '/skt/roaming/jp_bg.png', bgImageAlt: '일본배경 이미지',
      buttonImageAlt: '', faultNoticeYn: true,
      faultNoticeStart: new Date('2026-08-15T00:00:00'), faultNoticeEnd: new Date('2026-08-19T23:59:00'),
      faultNoticeContent: '안녕하세요. T roaming입니다. 일본 지진과 관련하여 깊은 위로의 뜻을 전합니다.<br>■ 기간 : 3월 11일 0시 ~ 20일 24시까지 10일간',
      wcdma: JP_WCDMA, lte: JP_LTE, gsm: JP_GSM, cdma: JP_CDMA, lease: JP_LEASE,
      approvalStatus: 'approved', approvalRequester: '김지훈(PDFDS23243)', approvalManager: '신지율(PSDGQ34217)',
      approvalRequestedAt: new Date('2026-08-25T14:10:47'), approvalProcessedAt: new Date('2026-08-25T14:10:47'),
      createdBy: '홍길동(P123456)', updatedBy: '홍길동(P123456)',
      sites: { create: [
        { siteName: '외교통상부 국가/지역 정보', link: 'http://www.mofat.go.kr/world/main/index.jsp', exposeYn: true, seq: 1 },
        { siteName: '외교통상부 해외여행 안전', link: 'http://www.0404.go.kr/index.do', exposeYn: true, seq: 2 },
        { siteName: '일본정부관광국', link: 'http://www.jnto.go.jp/', imageUrl: '/skt/roaming/jp_country.png', imageAlt: '일본 국가대표 이미지', exposeYn: true, seq: 3 },
      ] },
      history: { create: [
        { seq: 1, status: 'draft', changeNote: '신규 등록' },
        { seq: 2, status: 'approved', version: 1, requester: '김지훈(PDFDS23243)', manager: '신지율(PSDGQ34217)', requestedAt: new Date('2026-08-25T14:10:47'), processedAt: new Date('2026-08-25T14:10:47'), processReason: '승인이 완료되었습니다.', changeNote: '서비스 정보 수정' },
      ] },
    },
  });
  void jp;

  // 다른 대표 국가들 — 검색/상세설정 여부·콘텐츠 조합 다양하게
  const samples: { ko: string; en: string; code: string; cont: string; mcc: string; gmt: string; adj: string; detail: boolean; search: boolean; types: string[] }[] = [
    { ko: '베트남', en: 'Vietnam', code: 'VNM', cont: '아시아', mcc: '452', gmt: '7', adj: '라오스, 캄보디아', detail: true, search: true, types: ['wcdma', 'gsm'] },
    { ko: '미국', en: 'USA', code: 'USA', cont: '미주', mcc: '310, 311', gmt: '-5', adj: '캐나다', detail: true, search: true, types: ['wcdma', 'cdma', 'gsm', 'lte'] },
    { ko: '필리핀', en: 'Philippines', code: 'PHL', cont: '아시아', mcc: '515', gmt: '8', adj: '인도네시아', detail: true, search: true, types: ['wcdma', 'gsm'] },
    { ko: '중국', en: 'China', code: 'CHN', cont: '아시아', mcc: '460', gmt: '8', adj: '대만, 홍콩, 마카오', detail: true, search: true, types: ['wcdma', 'cdma', 'gsm'] },
    { ko: '괌', en: 'Guam', code: 'GUM', cont: '오세아니아', mcc: '310', gmt: '10', adj: '사이판', detail: true, search: true, types: ['gsm'] },
    { ko: '태국', en: 'Thailand', code: 'THA', cont: '아시아', mcc: '520', gmt: '7', adj: '라오스, 캄보디아', detail: true, search: true, types: ['wcdma', 'gsm'] },
    { ko: '홍콩', en: 'Hong Kong', code: 'HKG', cont: '아시아', mcc: '454', gmt: '8', adj: '중국, 마카오', detail: true, search: true, types: ['wcdma', 'gsm'] },
    { ko: '독일', en: 'Germany', code: 'DEU', cont: '유럽', mcc: '262', gmt: '1', adj: '체코, 오스트리아', detail: true, search: true, types: ['wcdma', 'gsm'] },
    { ko: '말레이시아', en: 'Malaysia', code: 'MYS', cont: '아시아', mcc: '502', gmt: '8', adj: '싱가포르, 인도네시아', detail: true, search: true, types: ['wcdma', 'gsm'] },
    { ko: '프랑스', en: 'France', code: 'FRA', cont: '유럽', mcc: '208', gmt: '1', adj: '벨기에, 스페인', detail: false, search: true, types: [] },
    { ko: '영국', en: 'United Kingdom', code: 'GBR', cont: '유럽', mcc: '234', gmt: '0', adj: '아일랜드', detail: true, search: true, types: ['wcdma', 'lte'] },
    { ko: '호주', en: 'Australia', code: 'AUS', cont: '오세아니아', mcc: '505', gmt: '10', adj: '뉴질랜드', detail: true, search: false, types: ['wcdma', 'gsm'] },
    { ko: '싱가포르', en: 'Singapore', code: 'SGP', cont: '아시아', mcc: '525', gmt: '8', adj: '말레이시아', detail: true, search: true, types: ['wcdma', 'gsm', 'lte'] },
    { ko: '대만', en: 'Taiwan', code: 'TWN', cont: '아시아', mcc: '466', gmt: '8', adj: '중국, 홍콩', detail: true, search: true, types: ['wcdma', 'gsm'] },
    { ko: '캐나다', en: 'Canada', code: 'CAN', cont: '미주', mcc: '302', gmt: '-5', adj: '미국', detail: false, search: true, types: [] },
  ];

  let seq = 0;
  for (const s of samples) {
    seq++;
    const content: Record<string, string> = {};
    for (const t of s.types) content[t] = svc({ serviceInfo: '발신자표시서비스(무료), 로밍안내 방송서비스(무료)', dataRoamingYn: t === 'lte' });
    const approved = seq % 3 !== 0;
    await prisma.roamingCountry.create({
      data: {
        continent: s.cont, nameKo: s.ko, nameEn: s.en, countryCode: s.code, mccCode: s.mcc, gmt: s.gmt, timeDiff: '0',
        searchYn: s.search, detailYn: s.detail, adjacentCountries: s.adj, currencyCode: null,
        ...content,
        approvalStatus: approved ? 'approved' : 'draft',
        approvalRequester: approved ? '김지훈(PDFDS23243)' : null, approvalManager: approved ? '신지율(PSDGQ34217)' : null,
        approvalRequestedAt: approved ? new Date('2026-08-25T14:10:47') : null, approvalProcessedAt: approved ? new Date('2026-08-25T14:10:47') : null,
        createdBy: '홍길동(P123456)', updatedBy: '홍길동(P123456)',
        history: { create: [{ seq: 1, status: 'draft', changeNote: '신규 등록' }] },
      },
    });
  }

  // 검색/목록 볼륨 — 대륙별 더미 국가(상세설정 X)로 채워 574건 느낌
  const bulk: { data: any[] } = { data: [] };
  let n = 0;
  for (let i = 0; i < 540; i++) {
    const cont = CONTINENTS[i % CONTINENTS.length];
    n++;
    bulk.data.push({
      continent: cont, nameKo: `국가${String(n).padStart(3, '0')}`, nameEn: `Country${n}`, countryCode: `C${String(n).padStart(3, '0')}`,
      mccCode: `${900 + (i % 90)}`, gmt: String((i % 24) - 11), timeDiff: '0',
      searchYn: i % 7 !== 0, detailYn: false, adjacentCountries: null,
      approvalStatus: 'draft', createdBy: '홍길동(P123456)', updatedBy: '홍길동(P123456)',
    });
  }
  await prisma.roamingCountry.createMany({ data: bulk.data });

  const total = await prisma.roamingCountry.count();
  console.log(`✅ 로밍국가 시드 완료 — 총 ${total}건`);
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
