import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { addTemplate } from '../../../actions';
import { PageHeader } from '@/components/page-header';
import { ChevronLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

/** 템플릿 추가 — 상세 안의 접힘(details)이 아니라 독립 페이지(2026-10-08 사용자 요청). */
export default async function NewTemplatePage({ params }: { params: { id: string } }) {
  const c = await prisma.container.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  if (!c) notFound();
  const back = `/admin/containers/${c.id}`;

  return (
    <div className="px-12 py-9 pb-28">
      <PageHeader
        trail={['전시관리', '전시화면 관리', c.name, '템플릿 추가']}
        title="템플릿 추가"
        subtitle="저장하면 바로 빌더가 열립니다. 코너 배치는 빌더에서 구성하세요."
        back={
          <Link href={back} className="inline-flex items-center gap-1 text-[12px] text-[var(--ink2)] hover:text-[var(--ac)]">
            <ChevronLeft className="h-3.5 w-3.5" /> {c.name}
          </Link>
        }
      />

      <form action={addTemplate.bind(null, c.id)}>
        <table className="ft mt-8">
          <tbody>
            <tr>
              <th className="req">템플릿명</th>
              <td><input name="name" required placeholder="템플릿명" className="inp wide" /></td>
            </tr>
            <tr>
              <th>메모</th>
              <td><input name="memo" maxLength={30} placeholder="한글/영문/숫자/특수문자 30자 이내" className="inp wide" /></td>
            </tr>
            <tr>
              <th className="req">로그인 구분</th>
              <td>
                <div className="flex items-center gap-5 text-[13px]">
                  <label className="flex items-center gap-1.5"><input type="radio" name="conditionGroup" value="로그인" defaultChecked /> 로그인</label>
                  <label className="flex items-center gap-1.5"><input type="radio" name="conditionGroup" value="비로그인" /> 비로그인</label>
                </div>
              </td>
            </tr>
            <tr>
              <th className="req">기본 템플릿 여부</th>
              <td>
                <div className="flex items-center gap-5 text-[13px]">
                  <label className="flex items-center gap-1.5"><input type="radio" name="isDefault" value="N" defaultChecked /> N</label>
                  <label className="flex items-center gap-1.5"><input type="radio" name="isDefault" value="Y" /> Y</label>
                  <span className="help">Y로 지정하면 기존 기본 템플릿은 해제됩니다.</span>
                </div>
              </td>
            </tr>
            <tr>
              <th className="req">전시 여부</th>
              <td>
                <div className="flex items-center gap-5 text-[13px]">
                  <label className="flex items-center gap-1.5"><input type="radio" name="displayOn" value="전시" defaultChecked /> 전시</label>
                  <label className="flex items-center gap-1.5"><input type="radio" name="displayOn" value="미전시" /> 미전시</label>
                </div>
              </td>
            </tr>
            <tr>
              <th>전시 기간</th>
              <td>
                <div className="flex flex-wrap items-center gap-2">
                  <input type="datetime-local" name="startAt" className="inp" style={{ width: 210 }} />
                  <span className="text-[var(--ink3)]">~</span>
                  <input type="datetime-local" name="endAt" className="inp" style={{ width: 210 }} />
                  <label className="ml-2 flex items-center gap-1.5 text-[13px]">
                    <input type="checkbox" name="startAtOnApproval" /> 시작일을 승인일시로 설정
                  </label>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="foot">
          <Link href={back} className="inline-flex h-[38px] items-center rounded-[8px] border border-[var(--line2)] bg-white px-5 text-[13px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]">취소</Link>
          <button type="submit" className="inline-flex h-[38px] items-center rounded-[8px] bg-[var(--ac)] px-6 text-[13px] font-semibold text-white hover:bg-[var(--ac-h)]">추가하고 빌더 열기</button>
        </div>
      </form>
    </div>
  );
}
