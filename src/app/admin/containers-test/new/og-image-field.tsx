'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

/**
 * 메타 태그 이미지(og:image) 등록 필드.
 * URL 입력이 아니라 로컬 이미지를 직접 올리는 형식(+ 버튼) — data URI로 저장한다.
 * 코너 유형 관리의 "유형 샘플 이미지" 업로더와 동일한 패턴.
 */
export function OgImageField({ defaultValue = '' }: { defaultValue?: string }) {
  const [image, setImage] = useState(defaultValue);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(f);
  };

  return (
    <div>
      {/* 실제 폼 값 — data URI 저장 */}
      <input type="hidden" name="ogImage" value={image} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      {image ? (
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="og:image 미리보기" className="h-24 w-44 rounded-md border object-cover" />
          <div className="flex flex-col gap-1.5">
            <Button type="button" size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
              이미지 변경
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setImage('')}>
              <Trash2 className="mr-1 h-3.5 w-3.5" /> 제거
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-24 w-44 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-slate-300 text-xs text-muted-foreground hover:border-primary/50 hover:bg-accent"
        >
          <Plus className="h-5 w-5" />
          이미지 등록
        </button>
      )}
      <p className="mt-1.5 text-[11px] text-muted-foreground">권장 비율 1.91:1 · 로컬 이미지를 선택하면 og:image로 등록됩니다. (선택)</p>
    </div>
  );
}
