'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Download, ChevronLeft, ChevronRight, ShieldAlert, ShieldOff, Flag, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { PageHeader } from '@/components/page-header';
import { cn } from '@/lib/utils';

// ── 공통 ──
const box = 'h-9 w-full rounded-lg border bg-white px-3 text-[13px] outline-none focus:ring-2 focus:ring-violet-200';
const TONE: Record<string, string> = {
  노출: 'bg-emerald-100 text-emerald-700', 미노출: 'bg-rose-100 text-rose-600', '검수 중': 'bg-amber-100 text-amber-700', 검수중: 'bg-amber-100 text-amber-700',
  답변완료: 'bg-violet-100 text-violet-700', 답변대기: 'bg-slate-100 text-slate-500',
  접수: 'bg-amber-100 text-amber-700', 처리완료: 'bg-emerald-100 text-emerald-700', 반려: 'bg-slate-100 text-slate-500',
  차단중: 'bg-rose-100 text-rose-600', 해제: 'bg-slate-100 text-slate-500',
  문의: 'bg-sky-100 text-sky-700', 반응: 'bg-slate-100 text-slate-500',
};
function Pill({ children }: { children: string }) {
  return <span className={cn('inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold', TONE[children] ?? 'bg-slate-100 text-slate-500')}>{children}</span>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="w-28 shrink-0 pt-1.5 text-[13px] text-muted-foreground">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

const TABS = [
  { key: 'comment', label: '댓글 관리' },
  { key: 'review', label: '리뷰 관리' },
  { key: 'block', label: '차단·신고 관리' },
] as const;
type TabKey = typeof TABS[number]['key'];

export function CommentAdmin() {
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
              className={cn('-mb-px border-b-2 px-4 py-2 text-[14px] font-medium', tab === t.key ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-400 hover:text-slate-600')}>{t.label}</button>
          ))}
        </div>
      )}

      <div className="mt-5">
        {tab === 'comment' && <CommentsTab onDetail={setDetailOpen} />}
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

function CommentsTab({ onDetail }: { onDetail: (open: boolean) => void }) {
  const [sel, setSel] = useState<Comment | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const open = (c: Comment) => { setSel(c); onDetail(true); };
  if (sel) return <CommentDetail comment={sel} onBack={() => { setSel(null); onDetail(false); }} />;

  const toggle = (no: number) => setChecked((s) => { const n = new Set(s); n.has(no) ? n.delete(no) : n.add(no); return n; });
  return (
    <div className="space-y-4">
      {/* 검색 */}
      <div className="rounded-xl border bg-card p-3">
        <div className="grid grid-cols-[repeat(4,minmax(0,1fr))] gap-x-4 gap-y-2">
          <LabeledSelect label="노출여부" opts={['전체', '노출', '미노출', '검수 중']} />
          <LabeledSelect label="댓글유형" opts={['전체', '문의', '반응']} />
          <LabeledSelect label="답변여부" opts={['전체', '답변완료', '답변대기']} />
          <LabeledSelect label="기간" opts={['등록일시', '답글 등록일']} />
        </div>
        <div className="mt-2 flex items-end gap-3">
          <div className="w-48"><LabeledSelect label="검색" opts={['전체', '댓글내용', '답글내용', '멤버십 채널 ID']} /></div>
          <input className={box} placeholder="내용을 입력하세요." />
          <Button variant="outline" size="sm">초기화</Button>
          <Button variant="primary" size="sm"><Search className="mr-1 h-3.5 w-3.5" /> 조회</Button>
        </div>
      </div>

      {/* 목록 */}
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[1100px] text-[12px]">
          <thead className="bg-slate-50 text-[11px] text-slate-500">
            <tr className="[&>th]:whitespace-nowrap [&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-semibold">
              <th className="w-8"></th><th>번호</th><th>멤버십 채널 ID</th><th>프로모션 ID</th><th>유형</th><th>댓글내용</th><th>좋아요</th><th>등록일시</th><th>답글내용</th><th>총답글</th><th>답변여부</th><th>노출여부</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {COMMENTS.map((c) => (
              <tr key={c.no} className="cursor-pointer hover:bg-violet-50/40" onClick={() => open(c)}>
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={checked.has(c.no)} onChange={() => toggle(c.no)} className="h-4 w-4 accent-violet-600" /></td>
                <td className="px-3 py-2.5 text-slate-500">{c.no}</td>
                <td className="px-3 py-2.5"><span className="font-mono text-[11px] text-slate-500">{c.ch.slice(0, 10)}…</span></td>
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <Link href="/admin/events" className="inline-flex items-center gap-0.5 text-violet-600 underline hover:text-violet-800" title="프로모션 관리로 이동">{c.promo}<ExternalLink className="h-3 w-3" /></Link>
                </td>
                <td className="px-3 py-2.5"><Pill>{c.type}</Pill></td>
                <td className="max-w-[220px] truncate px-3 py-2.5 text-slate-700">{c.content}</td>
                <td className="px-3 py-2.5 text-slate-500">{c.likes}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">{c.at}</td>
                <td className="max-w-[200px] truncate px-3 py-2.5 text-slate-500">{c.reply || '-'}</td>
                <td className="px-3 py-2.5 text-center text-slate-500">{c.replyCount || '-'}</td>
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

function CommentDetail({ comment, onBack }: { comment: Comment; onBack: () => void }) {
  return (
    <div className="space-y-5">
      <section className="rounded-xl border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[15px] font-bold">• 프로모션 기본정보</p>
          <Link href="/admin/events"><Button variant="outline" size="sm"><ExternalLink className="mr-1 h-3.5 w-3.5" /> 프로모션 관리에서 열기</Button></Link>
        </div>
        <div className="grid grid-cols-2 gap-x-10">
          <Field label="프로모션 ID"><Link href="/admin/events" className="inline-flex items-center gap-0.5 text-[13px] text-violet-600 underline hover:text-violet-800">{comment.promo}<ExternalLink className="h-3 w-3" /></Link></Field>
          <Field label="프로모션 명"><span className="text-[13px]">스타벅스 기프티콘 증정 이벤트</span></Field>
          <Field label="이벤트 유형"><Select defaultValue="응모형" className="h-9"><option>응모형</option><option>참여형</option></Select></Field>
          <Field label="전시여부"><div className="flex gap-4 pt-1.5 text-[13px]"><Radio name="disp" label="사용" checked /><Radio name="disp" label="미사용" /></div></Field>
          <Field label="전시기간"><span className="text-[13px] text-slate-600">26.08.01 ~ 26.08.30</span></Field>
          <Field label="활성기간"><span className="text-[13px] text-slate-600">26.08.05 ~ 26.08.19</span></Field>
          <Field label="댓글 차단여부"><div className="flex gap-4 pt-1.5 text-[13px]"><Radio name="blk" label="사용" /><Radio name="blk" label="미사용" checked /></div></Field>
          <Field label="댓글 차단기간"><div className="flex items-center gap-2 text-[13px] text-slate-600">26.08.05 ~ 26.08.19 <label className="ml-2 flex items-center gap-1"><input type="checkbox" className="h-4 w-4 accent-violet-600" /> 항상</label></div></Field>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <p className="mb-3 text-[15px] font-bold">• 댓글정보</p>
        <Field label="멤버십 채널 ID"><span className="font-mono text-[13px] text-slate-600">{comment.ch}</span></Field>
        <Field label="댓글유형"><span className="text-[13px]">{comment.type}</span></Field>
        <Field label="댓글 작성일시"><span className="text-[13px] text-slate-600">{comment.at}</span></Field>
        <Field label="댓글내용"><div className="min-h-[80px] whitespace-pre-line rounded-lg border bg-slate-50 p-3 text-[13px] text-slate-700">{comment.content}</div></Field>
        <Field label="댓글 노출여부"><div className="flex gap-4 pt-1.5 text-[13px]"><Radio name="vis" label="사용(노출)" checked={comment.visible === '노출'} /><Radio name="vis" label="검수중" checked={comment.visible === '검수 중'} /><Radio name="vis" label="미사용(미노출)" checked={comment.visible === '미노출'} /></div></Field>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <p className="mb-3 text-[15px] font-bold">• 답글정보</p>
        <Field label="답글내용"><textarea className="min-h-[90px] w-full rounded-lg border bg-white p-3 text-[13px] outline-none focus:ring-2 focus:ring-violet-200" placeholder="답글을 작성해주세요." defaultValue={comment.reply} /></Field>
        <div className="flex justify-end"><Button variant="outline" size="sm">추가</Button></div>
      </section>

      <div className="flex items-center justify-between">
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

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[1000px] text-[12px]">
          <thead className="bg-slate-50 text-[11px] text-slate-500">
            <tr className="[&>th]:whitespace-nowrap [&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-semibold">
              <th>번호</th><th>멤버십 채널 ID</th><th>상품</th><th>별점</th><th>리뷰내용</th><th>사진</th><th>좋아요</th><th>등록일시</th><th>신고</th><th>노출여부</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {REVIEWS.map((r) => (
              <tr key={r.no} className="hover:bg-violet-50/40">
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
          <button key={k} onClick={() => setSub(k)} className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium', sub === k ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-700')}><Icon className="h-3.5 w-3.5" /> {l}</button>
        ))}
      </div>

      {sub === 'report' ? (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[900px] text-[12px]">
            <thead className="bg-slate-50 text-[11px] text-slate-500">
              <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-semibold">
                <th>번호</th><th>대상(작성자)</th><th>위치</th><th>내용</th><th>신고 사유</th><th>신고자</th><th>접수일시</th><th>상태</th><th className="text-center">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {REPORTS.map((r) => (
                <tr key={r.no} className="hover:bg-violet-50/40">
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
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[800px] text-[12px]">
            <thead className="bg-slate-50 text-[11px] text-slate-500">
              <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-semibold">
                <th>번호</th><th>차단 사용자(멤버십 채널 ID)</th><th>차단 사유</th><th>차단 기간</th><th>처리자</th><th>상태</th><th className="text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {BLOCKS.map((b) => (
                <tr key={b.no} className="hover:bg-violet-50/40">
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
function Radio({ name, label, checked }: { name: string; label: string; checked?: boolean }) {
  return <label className="flex cursor-pointer items-center gap-1.5"><input type="radio" name={name} defaultChecked={checked} className="h-4 w-4 accent-violet-600" /> {label}</label>;
}
function Pagination() {
  return (
    <div className="flex items-center gap-1 text-[12px] text-slate-500">
      <button className="grid h-7 w-7 place-items-center rounded border hover:bg-slate-50"><ChevronLeft className="h-3.5 w-3.5" /></button>
      {[1, 2, 3, 4, 5].map((n) => <button key={n} className={cn('grid h-7 w-7 place-items-center rounded', n === 1 ? 'bg-violet-600 text-white' : 'border hover:bg-slate-50')}>{n}</button>)}
      <button className="grid h-7 w-7 place-items-center rounded border hover:bg-slate-50"><ChevronRight className="h-3.5 w-3.5" /></button>
    </div>
  );
}
