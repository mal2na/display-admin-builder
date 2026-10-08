import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { importTemplate } from '../../../actions';
import { PageHeader } from '@/components/page-header';
import { ChevronLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

/** 템플릿 불러오기 — 다른 컨테이너의 템플릿을 코너 배치째 복제. 독립 페이지(2026-10-08 사용자 요청). */
export default async function ImportTemplatePage({ params }: { params: { id: string } }) {
  const c = await prisma.container.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  if (!c) notFound();
  const back = `/admin/containers/${c.id}`;

  const importable = await prisma.template.findMany({
    where: { containerId: { not: c.id }, archivedAt: null },
    orderBy: [{ container: { name: 'asc' } }, { name: 'asc' }],
    include: { container: { select: { name: true } }, _count: { select: { templateCorners: true } } },
  });

  return (
    <div className="mx-auto max-w-5xl px-8 py-7 pb-20">
      <PageHeader
        trail={['전시관리', '전시화면 관리', c.name, '템플릿 불러오기']}
        title="템플릿 불러오기"
        subtitle="선택한 템플릿의 코너 배치를 그대로 복제해 이 컨테이너에 새 템플릿으로 추가합니다. 원본은 변경되지 않습니다."
        back={
          <Link href={back} className="inline-flex items-center gap-1 text-[12px] text-[var(--ink2)] hover:text-[var(--ac)]">
            <ChevronLeft className="h-3.5 w-3.5" /> {c.name}
          </Link>
        }
      />

      {importable.length === 0 ? (
        <div className="emptybox mt-8">
          <h4>불러올 템플릿이 없습니다</h4>
          <p className="text-[13px]">다른 컨테이너에 활성 템플릿이 있어야 불러올 수 있습니다.</p>
        </div>
      ) : (
        <form action={importTemplate.bind(null, c.id)}>
          <table className="ft mt-8">
            <tbody>
              <tr>
                <th className="req">불러올 템플릿</th>
                <td>
                  <select name="sourceTemplateId" required defaultValue="" className="sel" style={{ minWidth: 420 }}>
                    <option value="" disabled>컨테이너 · 템플릿을 선택하세요</option>
                    {importable.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.container.name} · {t.name} ({t.conditionGroup}, Corner {t._count.templateCorners}개)
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
              <tr>
                <th>새 템플릿명</th>
                <td>
                  <input name="name" placeholder="비우면 “원본명 (불러옴)”" className="inp wide" />
                </td>
              </tr>
              <tr>
                <th>로그인 구분</th>
                <td>
                  <div className="flex items-center gap-5 text-[13px]">
                    <label className="flex items-center gap-1.5"><input type="radio" name="conditionGroup" value="" defaultChecked /> 원본 그대로</label>
                    <label className="flex items-center gap-1.5"><input type="radio" name="conditionGroup" value="로그인" /> 로그인</label>
                    <label className="flex items-center gap-1.5"><input type="radio" name="conditionGroup" value="비로그인" /> 비로그인</label>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="foot">
            <Link href={back} className="inline-flex h-[38px] items-center rounded-[8px] border border-[var(--line2)] bg-white px-5 text-[13px] font-semibold text-[var(--ink2)] hover:bg-[var(--th)]">취소</Link>
            <button type="submit" className="inline-flex h-[38px] items-center rounded-[8px] bg-[var(--ac)] px-6 text-[13px] font-semibold text-white hover:bg-[var(--ac-h)]">불러와서 빌더 열기</button>
          </div>
        </form>
      )}
    </div>
  );
}
