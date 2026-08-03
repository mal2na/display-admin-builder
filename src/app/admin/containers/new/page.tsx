import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { createContainer } from '../actions';
import { CONTAINER_KINDS, CONTAINER_PLATFORMS } from '@/lib/display-taxonomy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ChevronRight } from 'lucide-react';
import { OgImageField } from './og-image-field';

export const dynamic = 'force-dynamic';

// T우주 "컨테이너 등록" 화면(컨테이너정보) 기준 폼 행
function Row({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[168px_1fr] items-center gap-3 border-b px-4 py-3 last:border-0">
      <label className="text-sm font-medium leading-snug text-muted-foreground">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div>{children}</div>
    </div>
  );
}

export default async function NewContainerPage() {
  const parents = await prisma.container.findMany({
    where: { status: 'active' },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  return (
    <div className="p-4">
      <div className="mx-auto max-w-4xl space-y-5 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/admin/containers" className="hover:underline">전시화면 관리</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">컨테이너 등록</span>
        </div>
        <div>
          <h1 className="text-xl font-semibold">컨테이너 등록</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            채널에 실제로 나가는 화면/영역 단위입니다. 저장 시 기본 Template 1개가 함께 생성됩니다(정책상 기본 Template 필수).
          </p>
        </div>

        <form action={createContainer} className="space-y-6">
        {/* 컨테이너 기본 정보 */}
        <section className="rounded-lg border">
          <h2 className="border-b bg-muted/50 px-4 py-2.5 text-sm font-semibold">컨테이너 기본 정보</h2>
          <div className="grid grid-cols-2">
            <Row label="컨테이너 ID">
              <Input value="(저장 시 자동 생성)" disabled className="h-9 bg-muted text-xs" />
            </Row>
            <Row label="상위 컨테이너">
              <Select name="parentId" defaultValue="" className="h-9 text-xs">
                <option value="">없음 (최상위)</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Row>

            <Row label="컨테이너 명" required>
              <Input name="name" placeholder="한글/영문/숫자/특수기호 포함 20자 이내로 입력해 주세요." maxLength={20} className="h-9 text-xs" required />
            </Row>
            <Row label="컨테이너 타입" required>
              <div className="flex gap-4">
                {CONTAINER_KINDS.map((k, i) => (
                  <label key={k} className="flex items-center gap-1.5 whitespace-nowrap text-sm">
                    <input type="radio" name="kind" value={k} defaultChecked={i === 0} /> {k}
                  </label>
                ))}
              </div>
            </Row>

            <Row label="플랫폼" required>
              <div className="flex gap-4">
                {CONTAINER_PLATFORMS.map((p, i) => (
                  <label key={p} className="flex items-center gap-1.5 whitespace-nowrap text-sm">
                    <input type="radio" name="platform" value={p} defaultChecked={i === 0} /> {p}
                  </label>
                ))}
              </div>
            </Row>
            <Row label="미리보기 URL">
              <Input name="previewUrl" placeholder="URL 주소를 입력해 주세요." className="h-9 text-xs" />
            </Row>

            <Row label="전시 여부" required>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 whitespace-nowrap text-sm">
                  <input type="radio" name="display" value="전시" defaultChecked /> 전시
                </label>
                <label className="flex items-center gap-1.5 whitespace-nowrap text-sm">
                  <input type="radio" name="display" value="미전시" /> 미전시
                </label>
              </div>
            </Row>
            <Row label="기본 Template 조건">
              <Input name="conditionGroup" defaultValue="로그인" placeholder="예) 로그인 / 비로그인" className="h-9 text-xs" />
            </Row>

            <div className="col-span-2">
              <Row label="전시 기간" required>
                <div className="flex flex-wrap items-center gap-2">
                  <Input type="datetime-local" name="startAt" className="h-9 w-[210px] text-xs" />
                  <span className="text-muted-foreground">~</span>
                  <Input type="datetime-local" name="endAt" className="h-9 w-[210px] text-xs" />
                  <label className="ml-2 flex items-center gap-1.5 text-sm">
                    <input type="checkbox" name="noEndDate" /> 종료 없음
                  </label>
                </div>
              </Row>
            </div>
          </div>
        </section>

        {/* 메타 정보 */}
        <section className="rounded-lg border">
          <h2 className="border-b bg-muted/50 px-4 py-2.5 text-sm font-semibold">메타 정보</h2>
          <div>
            <Row label="사용 여부" required>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 whitespace-nowrap text-sm">
                  <input type="radio" name="metaUse" value="사용" defaultChecked /> 사용
                </label>
                <label className="flex items-center gap-1.5 whitespace-nowrap text-sm">
                  <input type="radio" name="metaUse" value="미사용" /> 미사용
                </label>
              </div>
            </Row>
            <Row label="검색 태그" required>
              <Input name="searchTags" placeholder="#키워드 형태로 등록해 주세요. (ex. #SKT #SK 텔레콤)" className="h-9 text-xs" />
            </Row>
            <Row label="메타 태그">
              <div className="space-y-1.5">
                <Input name="metaKeywords" placeholder="keywords — #키워드 형태로 등록해 주세요." className="h-9 text-xs" />
                <Input name="metaDescription" placeholder="description" className="h-9 text-xs" />
                <Input name="ogTitle" placeholder="og:title" className="h-9 text-xs" />
                <Input name="ogDescription" placeholder="og:description" className="h-9 text-xs" />
                <Input name="ogSiteName" placeholder="og:site_name" className="h-9 text-xs" />
              </div>
            </Row>
            <Row label="메타 태그 이미지 (og:image)">
              <OgImageField />
            </Row>
          </div>
        </section>

        {/* 매핑 템플릿 정보 안내 */}
        <section className="rounded-lg border">
          <h2 className="border-b bg-muted/50 px-4 py-2.5 text-sm font-semibold">매핑 템플릿 정보</h2>
          <p className="px-4 py-4 text-sm text-muted-foreground">
            컨테이너 정보 저장 후 상세 화면에서 템플릿을 등록해 주세요. (저장 시 기본 Template 1개가 자동 생성됩니다.)
          </p>
        </section>

        <div className="flex justify-end gap-2">
          <Link
            href="/admin/containers"
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-secondary"
          >
            취소
          </Link>
          <Button type="submit">저장</Button>
        </div>
      </form>
      </div>
    </div>
  );
}
