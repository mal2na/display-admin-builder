'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Download, ChevronLeft, ChevronRight, ShieldAlert, ShieldOff, Flag, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { PageHeader } from '@/components/page-header';
import { cn } from '@/lib/utils';

// ── 공통 ──
const box = 'h-9 w-full rounded-lg border bg-white px-3 text-[13px] outline-none focus:ring-2 focus:ring-indigo-200';
// 칩 색 — 목업(SB-ETC-089) 기준: 문의 앰버 / 반응 블루 / 답변완료·노출 그린 / 답변대기 앰버 / 미노출 레드 / 검수중 오렌지
const TONE: Record<string, string> = {
  노출: 'bg-emerald-50 text-emerald-600', 미노출: 'bg-rose-50 text-rose-500', '검수 중': 'bg-orange-50 text-orange-600', 검수중: 'bg-orange-50 text-orange-600',
  답변완료: 'bg-emerald-50 text-emerald-600', 답변대기: 'bg-amber-50 text-amber-600',
  접수: 'bg-amber-50 text-amber-600', 처리완료: 'bg-emerald-50 text-emerald-600', 반려: 'bg-slate-100 text-slate-500',
  차단중: 'bg-rose-50 text-rose-500', 해제: 'bg-slate-100 text-slate-500',
  문의: 'bg-amber-50 text-amber-600', 반응: 'bg-blue-50 text-blue-600',
};
function Pill({ children }: { children: string }) {
  return <span className={cn('inline-block rounded-md px-2 py-1 text-[11px] font-semibold', TONE[children] ?? 'bg-slate-100 text-slate-500')}>{children}</span>;
}
const TABS = [
  { key: 'comment', label: '댓글 관리' },
  { key: 'review', label: '리뷰 관리' },
  { key: 'block', label: '차단·신고 관리' },
] as const;
type TabKey = typeof TABS[number]['key'];

export function CommentAdmin({ promoHref = '/admin/events' }: { promoHref?: string }) {
  const [tab, setTab] = useState<TabKey>('comment');
  const [detailOpen, setDetailOpen] = useState(false); // 상세 진입 시 상단 탭 숨김
  return (
    <div className="p-6">
      <PageHeader
        trail={['프로모션 관리', '댓글·리뷰 관리']}
        title="댓글·리뷰 관리"
        subtitle="상품 상세·프로모션에 달린 댓글/리뷰를 조회·통제·답글하고, 신고 접수와 사용자 차단을 관리합니다."
      />

      {/* 탭 — 목록에서만 표시(상세 진입 시 숨김) */}
      {!detailOpen && (
        <div className="mt-4 flex gap-1 border-b">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => { setTab(t.key); setDetailOpen(false); }}
              className={cn('-mb-px border-b-2 px-4 py-2 text-[14px] font-medium', tab === t.key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600')}>{t.label}</button>
          ))}
        </div>
      )}

      <div className="mt-5">
        {tab === 'comment' && <CommentsTab onDetail={setDetailOpen} promoHref={promoHref} />}
        {tab === 'review' && <ReviewsTab />}
        {tab === 'block' && <BlockTab />}
      </div>
    </div>
  );
}

// ── 댓글 관리 (목록 ↔ 상세) ──
type Comment = { no: number; ch: string; promo: string; type: string; content: string; likes: number; at: string; reply: string; replyBy: string; replyCount: number; replyAt: string; answered: string; visible: string };
const COMMENTS: Comment[] = [
  { no: 1119, ch: '35D29519FKDIEL', promo: 'ENV123456', type: '문의', content: '어떻게 참여하는건가요?', likes: 11, at: '2026.08.18 16:24', reply: '소개페이지를 SNS로 연결하시면 됩니다.', replyBy: '홍길동(P123456)', replyCount: 3, replyAt: '2026.08.18 18:46', answered: '답변완료', visible: '노출' },
  { no: 1118, ch: '35D29519A0X1Q2', promo: 'ENV123455', type: '반응', content: '20% 쿠폰 감사합니다', likes: 0, at: '2026.08.18 16:24', reply: '', replyBy: '', replyCount: 0, replyAt: '', answered: '답변대기', visible: '미노출' },
  { no: 1117, ch: '35D29519B1Y2R3', promo: 'ENV123454', type: '반응', content: '쿠폰 주세요', likes: 0, at: '2026.08.18 16:24', reply: '', replyBy: '', replyCount: 0, replyAt: '', answered: '답변대기', visible: '미노출' },
  { no: 1116, ch: '35D29519C2Z3S4', promo: 'ENV123453', type: '반응', content: '감사합니다', likes: 0, at: '2026.08.18 16:24', reply: '', replyBy: '', replyCount: 0, replyAt: '', answered: '답변대기', visible: '검수 중' },
  { no: 1115, ch: '35D29519D3A4T5', promo: 'ENV123452', type: '반응', content: '너무 갖고싶어요', likes: 0, at: '2026.08.18 16:24', reply: '', replyBy: '', replyCount: 0, replyAt: '', answered: '답변대기', visible: '미노출' },
  { no: 1114, ch: '35D29519E4B5U6', promo: 'ENV123451', type: '반응', content: '감사요', likes: 0, at: '2026.08.18 16:24', reply: '', replyBy: '', replyCount: 0, replyAt: '', answered: '답변대기', visible: '노출' },
  { no: 1113, ch: '35D29519F5C6V7', promo: 'ENV123450', type: '반응', content: '나도 줘요', likes: 0, at: '2026.08.18 16:24', reply: '', replyBy: '', replyCount: 0, replyAt: '', answered: '답변대기', visible: '노출' },
  { no: 1112, ch: '35D29519G6D7W8', promo: 'ENV123449', type: '반응', content: '저도 주세요', likes: 1, at: '2026.08.18 16:24', reply: '', replyBy: '', replyCount: 0, replyAt: '', answered: '답변대기', visible: '미노출' },
  { no: 1111, ch: '35D29519H7E8X9', promo: 'ENV123448', type: '반응', content: '주세요 쿠폰', likes: 5, at: '2026.08.18 16:24', reply: '', replyBy: '', replyCount: 0, replyAt: '', answered: '답변대기', visible: '미노출' },
  { no: 1110, ch: '35D29519I8F9Y0', promo: 'ENV123447', type: '반응', content: '감사합니다', likes: 1, at: '2026.08.18 16:24', reply: '', replyBy: '', replyCount: 0, replyAt: '', answered: '답변대기', visible: '미노출' },
];

function CommentsTab({ onDetail, promoHref }: { onDetail: (open: boolean) => void; promoHref: string }) {
  const [sel, setSel] = useState<Comment | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const open = (c: Comment) => { setSel(c); onDetail(true); };
  if (sel) return <CommentDetail comment={sel} onBack={() => { setSel(null); onDetail(false); }} promoHref={promoHref} />;

  const toggle = (no: number) => setChecked((s) => { const n = new Set(s); n.has(no) ? n.delete(no) : n.add(no); return n; });
  return (
    <div className="space-y-4">
      {/* 검색 — 목업(SB-ETC-089): 노출여부·댓글유형·답변여부·기간(+날짜) / 검색 + 초기화·조회 */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Filt label="노출여부"><LabelSel opts={['전체', '노출', '미노출', '검수 중']} /></Filt>
          <Filt label="댓글유형"><LabelSel opts={['전체', '문의', '반응']} /></Filt>
          <Filt label="답변여부"><LabelSel opts={['전체', '답변완료', '답변대기']} /></Filt>
          <Filt label="기간">
            <LabelSel opts={['등록일시', '답글 등록일']} w="w-28" />
            <input type="date" className="h-9 w-36 rounded-lg border bg-white px-2 text-[13px] text-slate-500 outline-none focus:ring-2 focus:ring-indigo-200" />
            <span className="text-slate-400">~</span>
            <input type="date" className="h-9 w-36 rounded-lg border bg-white px-2 text-[13px] text-slate-500 outline-none focus:ring-2 focus:ring-indigo-200" />
          </Filt>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Filt label="검색"><LabelSel opts={['전체', '댓글내용', '답글내용', '멤버십 채널 ID']} /></Filt>
          <input className={box + ' flex-1'} placeholder="내용을 입력하세요." />
          <Button variant="outline" size="sm">초기화</Button>
          <Button variant="primary" size="sm"><Search className="mr-1 h-3.5 w-3.5" /> 조회</Button>
        </div>
      </div>

      {/* 목록 — 목업(SB-ETC-089): 좌우 보더 없이 가로줄만, 흰 헤더 + 굵은 라벨 + 하단 굵은 선 */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1140px] text-[12px]">
          <thead className="text-[12px] text-slate-700">
            <tr className="border-b-2 border-slate-200 [&>th]:whitespace-nowrap [&>th]:px-3 [&>th]:py-3 [&>th]:font-bold">
              <th className="w-8"></th><th>번호</th><th className="text-left">멤버십 채널 ID</th><th>프로모션 ID</th><th>댓글유형</th><th className="text-left">댓글내용</th><th>좋아요 수</th><th>등록일시</th><th className="text-left">답글내용</th><th>답글 등록자</th><th>총 답글 수</th><th>답변여부</th><th>노출여부</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {COMMENTS.map((c) => (
              <tr key={c.no} className="cursor-pointer text-center hover:bg-indigo-50/40" onClick={() => open(c)}>
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={checked.has(c.no)} onChange={() => toggle(c.no)} className="h-4 w-4 accent-indigo-600" /></td>
                <td className="px-3 py-2.5 text-slate-600">{c.no}</td>
                <td className="px-3 py-2.5 text-left"><span className="font-mono text-[11px] text-slate-500">{c.ch.slice(0, 10)}…</span></td>
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <Link href={promoHref} className="text-indigo-600 underline hover:text-indigo-800" title="프로모션 상세로 이동">{c.promo}</Link>
                </td>
                <td className="px-3 py-2.5"><Pill>{c.type}</Pill></td>
                <td className="max-w-[220px] truncate px-3 py-2.5 text-left text-slate-700">{c.content}</td>
                <td className="px-3 py-2.5 text-slate-600">{c.likes}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">{c.at}</td>
                <td className="px-3 py-2 text-left"><div className="flex min-h-[30px] max-w-[220px] items-center truncate rounded-md border border-slate-200 bg-slate-50 px-2.5 text-[12px] text-slate-600">{c.reply}</div></td>
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">{c.replyBy || '-'}</td>
                <td className="px-3 py-2.5 text-slate-500">{c.replyCount || '-'}</td>
                <td className="px-3 py-2.5"><Pill>{c.answered}</Pill></td>
                <td className="px-3 py-2.5"><Pill>{c.visible}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 하단 액션 */}
      <div className="flex items-center">
        <Pagination />
        <div className="ml-auto flex gap-2">
          <Button variant="primary" size="sm" disabled={checked.size === 0}>노출여부 변경{checked.size > 0 ? ` (${checked.size})` : ''}</Button>
          <Button variant="outline" size="sm"><Download className="mr-1 h-3.5 w-3.5" /> 엑셀 다운로드</Button>
        </div>
      </div>
    </div>
  );
}

// ── 폼 테이블 소품 (라벨셀 + 값셀 격자) ──
function FT({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-[150px_minmax(0,1fr)_150px_minmax(0,1fr)] overflow-hidden rounded-lg border-l border-t border-slate-200 text-[13px]">{children}</div>;
}
function L({ children, span }: { children?: React.ReactNode; span?: string }) {
  return <div className={cn('flex items-center border-b border-r border-slate-200 bg-slate-50 px-3 py-2.5 font-medium text-slate-600', span)}>{children}</div>;
}
function C({ children, span }: { children?: React.ReactNode; span?: string }) {
  return <div className={cn('flex items-center gap-2 border-b border-r border-slate-200 bg-white px-3 py-2', span)}>{children}</div>;
}
const roBox = 'h-8 rounded-md border border-slate-200 bg-slate-50 px-2.5 text-[13px] text-slate-600 flex items-center';

function CommentDetail({ comment, onBack, promoHref }: { comment: Comment; onBack: () => void; promoHref: string }) {
  return (
    <div className="space-y-6">
      {/* 1. 프로모션 정보 */}
      <section>
        <p className="mb-2.5 text-[15px] font-bold">• 프로모션 정보</p>
        <FT>
          <L>프로모션 ID</L>
          <C><Link href={promoHref} className={cn(roBox, 'text-indigo-600 underline hover:text-indigo-800')}>{comment.promo}</Link></C>
          <L>프로모션 명</L>
          <C><Link href={promoHref} className={cn(roBox, 'text-indigo-600 underline hover:text-indigo-800')}>룰렛 응모 이벤트</Link></C>

          <L>프로모션 유형</L>
          <C><Select defaultValue="이벤트" className="h-8 w-28"><option>이벤트</option></Select><Select defaultValue="응모형" className="h-8 w-28"><option>응모형</option><option>참여형</option></Select></C>
          <L>전시여부</L>
          <C><Radio name="disp" label="사용" checked /><Radio name="disp" label="미사용" /></C>

          <L>전시기간</L>
          <C><span className={cn(roBox, 'w-32 justify-center')}>26.08.01</span><span className="text-slate-400">~</span><span className={cn(roBox, 'w-32 justify-center')}>26.08.30</span></C>
          <L>참여기간</L>
          <C><span className={cn(roBox, 'w-32 justify-center')}>26.08.05</span><span className="text-slate-400">~</span><span className={cn(roBox, 'w-32 justify-center')}>26.08.19</span></C>

          <L>댓글 사용여부</L>
          <C><Radio name="cuse" label="노출" checked /><Radio name="cuse" label="미노출" /></C>
          <L>댓글 차단여부</L>
          <C><Radio name="blk" label="사용" /><Radio name="blk" label="미사용" checked /></C>

          <L> </L>
          <C> </C>
          <L>댓글 차단기간</L>
          <C><span className={cn(roBox, 'w-32 justify-center')}>26.08.05</span><span className="text-slate-400">~</span><span className={cn(roBox, 'w-32 justify-center')}>26.08.19</span></C>
        </FT>
      </section>

      {/* 2. 댓글정보 */}
      <section>
        <p className="mb-2.5 text-[15px] font-bold">• 댓글정보</p>
        <FT>
          <L>멤버십 채널 ID</L>
          <C><span className={cn(roBox, 'w-full font-mono')}>{comment.ch}…</span></C>
          <L>댓글유형</L>
          <C><span className={cn(roBox, 'w-40')}>{comment.type}</span></C>

          <L>등록일시</L>
          <C><span className={cn(roBox, 'w-48')}>{comment.at}</span></C>
          <L>좋아요 수</L>
          <C><span className={cn(roBox, 'w-40')}>{comment.likes}</span></C>

          <L span="row-span-1">댓글내용</L>
          <C span="col-span-3">
            <div className="min-h-[80px] w-full whitespace-pre-line rounded-md border border-slate-200 bg-slate-50 p-3 text-[13px] text-slate-700">{comment.content}</div>
          </C>

          <L>노출여부</L>
          <C span="col-span-3">
            <Radio name="vis" label="사용" checked={comment.visible === '노출'} />
            <Radio name="vis" label="검수중" checked={comment.visible === '검수 중'} />
            <Radio name="vis" label="미사용" checked={comment.visible === '미노출'} />
          </C>
        </FT>
      </section>

      {/* 3. 답글정보 */}
      <section>
        <p className="mb-2.5 text-[15px] font-bold">• 답글정보</p>
        <FT>
          <L>답글내용</L>
          <C span="col-span-3">
            <textarea className="min-h-[90px] w-full rounded-md border border-slate-200 bg-white p-3 text-[13px] outline-none focus:ring-2 focus:ring-indigo-200" placeholder="답글을 작성해주세요." defaultValue={comment.reply} />
          </C>
        </FT>
        <div className="mt-2 flex justify-end"><Button variant="outline" size="sm">추가</Button></div>
      </section>

      <div className="flex items-center justify-between border-t pt-4">
        <Button variant="outline" size="sm" onClick={onBack}>목록</Button>
        <Button variant="primary" size="sm">저장</Button>
      </div>
    </div>
  );
}

// ── 리뷰 관리 ──
type Review = { no: number; ch: string; product: string; rating: number; content: string; photos: number; likes: number; at: string; reported: number; visible: string };
const REVIEWS: Review[] = [
  { no: 320, ch: '35D29519FKDIEL', product: '갤럭시 Z 폴드8', rating: 5, content: '가볍고 화면도 커서 만족해요. 배터리도 좋네요.', photos: 2, likes: 34, at: '2026.08.20 10:12', reported: 0, visible: '노출' },
  { no: 319, ch: '35D29519A0X1Q2', product: '아이폰 20 Pro', rating: 4, content: '카메라 좋은데 발열이 조금 있어요', photos: 0, likes: 12, at: '2026.08.20 09:50', reported: 0, visible: '노출' },
  { no: 318, ch: '35D29519B1Y2R3', product: '갤럭시 워치8', rating: 1, content: '광고성 도배 리뷰 텍스트…', photos: 0, likes: 0, at: '2026.08.19 22:03', reported: 3, visible: '검수 중' },
  { no: 317, ch: '35D29519C2Z3S4', product: 'AirPods Max3', rating: 5, content: '노이즈 캔슬링 최고', photos: 1, likes: 8, at: '2026.08.19 18:41', reported: 0, visible: '노출' },
  { no: 316, ch: '35D29519D3A4T5', product: '갤럭시 Z 폴드8', rating: 2, content: '비방·욕설 포함 리뷰…', photos: 0, likes: 0, at: '2026.08.19 12:22', reported: 5, visible: '미노출' },
];
function ReviewsTab() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-3">
        <div className="grid grid-cols-[repeat(4,minmax(0,1fr))] gap-x-4 gap-y-2">
          <LabeledSelect label="노출여부" opts={['전체', '노출', '미노출', '검수 중']} />
          <LabeledSelect label="별점" opts={['전체', '5점', '4점', '3점', '2점', '1점']} />
          <LabeledSelect label="신고" opts={['전체', '신고 있음', '신고 없음']} />
          <LabeledSelect label="기간" opts={['등록일시']} />
        </div>
        <div className="mt-2 flex items-end gap-3">
          <div className="w-48"><LabeledSelect label="검색" opts={['전체', '상품명', '리뷰내용', '멤버십 채널 ID']} /></div>
          <input className={box} placeholder="내용을 입력하세요." />
          <Button variant="outline" size="sm">초기화</Button>
          <Button variant="primary" size="sm"><Search className="mr-1 h-3.5 w-3.5" /> 조회</Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-[12px]">
          <thead className="text-[12px] text-slate-700">
              <tr className="border-b-2 border-slate-200 [&>th]:whitespace-nowrap [&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-bold">
              <th>번호</th><th>멤버십 채널 ID</th><th>상품</th><th>별점</th><th>리뷰내용</th><th>사진</th><th>좋아요</th><th>등록일시</th><th>신고</th><th>노출여부</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {REVIEWS.map((r) => (
              <tr key={r.no} className="hover:bg-indigo-50/40">
                <td className="px-3 py-2.5 text-slate-500">{r.no}</td>
                <td className="px-3 py-2.5"><span className="font-mono text-[11px] text-slate-500">{r.ch.slice(0, 10)}…</span></td>
                <td className="px-3 py-2.5 text-slate-700">{r.product}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-amber-500">{'★'.repeat(r.rating)}<span className="text-slate-200">{'★'.repeat(5 - r.rating)}</span></td>
                <td className="max-w-[240px] truncate px-3 py-2.5 text-slate-700">{r.content}</td>
                <td className="px-3 py-2.5 text-center text-slate-500">{r.photos || '-'}</td>
                <td className="px-3 py-2.5 text-slate-500">{r.likes}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">{r.at}</td>
                <td className="px-3 py-2.5 text-center">{r.reported > 0 ? <span className="inline-flex items-center gap-0.5 rounded bg-rose-100 px-1.5 py-0.5 text-[11px] font-semibold text-rose-600"><Flag className="h-3 w-3" />{r.reported}</span> : <span className="text-slate-300">-</span>}</td>
                <td className="px-3 py-2.5"><Pill>{r.visible}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center"><Pagination /><div className="ml-auto flex gap-2"><Button variant="primary" size="sm">노출여부 변경</Button><Button variant="outline" size="sm"><Download className="mr-1 h-3.5 w-3.5" /> 엑셀 다운로드</Button></div></div>
    </div>
  );
}

// ── 차단·신고 관리 ──
type Report = { no: number; target: string; where: string; content: string; reason: string; reporter: string; at: string; status: string };
const REPORTS: Report[] = [
  { no: 55, target: '35D29519B1Y2R3', where: '리뷰 #318', content: '광고성 도배 리뷰 텍스트…', reason: '스팸/광고', reporter: '회원 A', at: '2026.08.19 22:10', status: '접수' },
  { no: 54, target: '35D29519D3A4T5', where: '리뷰 #316', content: '비방·욕설 포함 리뷰…', reason: '욕설/비방', reporter: '회원 B 외 4', at: '2026.08.19 12:30', status: '접수' },
  { no: 53, target: '35D29519C2Z3S4', where: '댓글 #1116', content: '금칙어 포함 댓글…', reason: '부적절', reporter: 'LLM 자동감지', at: '2026.08.18 16:40', status: '처리완료' },
];
type Block = { no: number; member: string; reason: string; period: string; by: string; status: string };
const BLOCKS: Block[] = [
  { no: 12, member: '35D29519D3A4T5', reason: '반복 신고(욕설/비방) 누적', period: '26.08.19 ~ 26.09.18', by: '운영자B', status: '차단중' },
  { no: 11, member: '35D29519K0G1Z2', reason: '스팸 도배', period: '26.08.10 ~ 26.08.24', by: '운영자A', status: '해제' },
];
function BlockTab() {
  const [sub, setSub] = useState<'report' | 'history'>('report');
  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg border bg-white p-0.5 text-[13px]">
        {([['report', '신고 접수', ShieldAlert], ['history', '차단 이력', ShieldOff]] as const).map(([k, l, Icon]) => (
          <button key={k} onClick={() => setSub(k)} className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium', sub === k ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700')}><Icon className="h-3.5 w-3.5" /> {l}</button>
        ))}
      </div>

      {sub === 'report' ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-[12px]">
            <thead className="text-[12px] text-slate-700">
              <tr className="border-b-2 border-slate-200 [&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-bold">
                <th>번호</th><th>대상(작성자)</th><th>위치</th><th>내용</th><th>신고 사유</th><th>신고자</th><th>접수일시</th><th>상태</th><th className="text-center">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {REPORTS.map((r) => (
                <tr key={r.no} className="hover:bg-indigo-50/40">
                  <td className="px-3 py-2.5 text-slate-500">{r.no}</td>
                  <td className="px-3 py-2.5"><span className="font-mono text-[11px] text-slate-500">{r.target.slice(0, 10)}…</span></td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">{r.where}</td>
                  <td className="max-w-[220px] truncate px-3 py-2.5 text-slate-700">{r.content}</td>
                  <td className="whitespace-nowrap px-3 py-2.5"><span className="rounded bg-rose-50 px-1.5 py-0.5 text-[11px] font-medium text-rose-600">{r.reason}</span></td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">{r.reporter}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">{r.at}</td>
                  <td className="px-3 py-2.5"><Pill>{r.status}</Pill></td>
                  <td className="px-3 py-2.5 text-center">{r.status === '접수' ? <div className="flex justify-center gap-1"><button className="rounded border border-rose-300 bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-100">차단</button><button className="rounded border px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-50">반려</button></div> : <span className="text-slate-300">-</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-[12px]">
            <thead className="text-[12px] text-slate-700">
              <tr className="border-b-2 border-slate-200 [&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-bold">
                <th>번호</th><th>차단 사용자(멤버십 채널 ID)</th><th>차단 사유</th><th>차단 기간</th><th>처리자</th><th>상태</th><th className="text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {BLOCKS.map((b) => (
                <tr key={b.no} className="hover:bg-indigo-50/40">
                  <td className="px-3 py-2.5 text-slate-500">{b.no}</td>
                  <td className="px-3 py-2.5"><span className="font-mono text-[11px] text-slate-500">{b.member}</span></td>
                  <td className="px-3 py-2.5 text-slate-700">{b.reason}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">{b.period}</td>
                  <td className="px-3 py-2.5 text-slate-500">{b.by}</td>
                  <td className="px-3 py-2.5"><Pill>{b.status}</Pill></td>
                  <td className="px-3 py-2.5 text-center">{b.status === '차단중' ? <button className="rounded border px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-50">차단 해제</button> : <span className="text-slate-300">-</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[11px] leading-relaxed text-muted-foreground">신고 접수(사용자·LLM 자동감지) → 검토 → <b>차단</b> 시 해당 멤버십 채널 ID의 댓글/리뷰가 FO에서 미노출 처리되고 차단 이력에 남습니다.</p>
    </div>
  );
}

// ── 소품 ──
function LabeledSelect({ label, opts }: { label: string; opts: string[] }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[12px] text-muted-foreground">{label}</span>
      <Select className="h-9 flex-1">{opts.map((o) => <option key={o}>{o}</option>)}</Select>
    </div>
  );
}
// 인라인 필터(라벨 + 컨트롤) — 목업 검색영역 스타일
function Filt({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-center gap-2"><span className="shrink-0 text-[13px] font-medium text-slate-600">{label}</span>{children}</div>;
}
function LabelSel({ opts, w }: { opts: string[]; w?: string }) {
  return <Select className={cn('h-9', w ?? 'w-36')}>{opts.map((o) => <option key={o}>{o}</option>)}</Select>;
}
function Radio({ name, label, checked }: { name: string; label: string; checked?: boolean }) {
  return <label className="flex cursor-pointer items-center gap-1.5"><input type="radio" name={name} defaultChecked={checked} className="h-4 w-4 accent-indigo-600" /> {label}</label>;
}
function Pagination() {
  return (
    <div className="flex items-center gap-1 text-[12px] text-slate-500">
      <button className="grid h-7 w-7 place-items-center rounded border hover:bg-slate-50"><ChevronLeft className="h-3.5 w-3.5" /></button>
      {[1, 2, 3, 4, 5].map((n) => <button key={n} className={cn('grid h-7 w-7 place-items-center rounded', n === 1 ? 'bg-indigo-600 text-white' : 'border hover:bg-slate-50')}>{n}</button>)}
      <button className="grid h-7 w-7 place-items-center rounded border hover:bg-slate-50"><ChevronRight className="h-3.5 w-3.5" /></button>
    </div>
  );
}
