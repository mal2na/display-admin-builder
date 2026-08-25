'use client';

// 이력(감사 로그) 탭 제거 — 기본 정보만 렌더한다.
export function ContainerDetailTabs({ info }: { info: React.ReactNode }) {
  return <div className="space-y-4">{info}</div>;
}
