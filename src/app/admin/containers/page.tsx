import { Box } from 'lucide-react';

export default function ContainersIndexPage() {
  return (
    <div className="flex h-full items-center justify-center p-10">
      <div className="text-center text-muted-foreground">
        <Box className="mx-auto mb-3 h-10 w-10 opacity-40" />
        <p className="text-sm">왼쪽에서 Container를 선택하거나</p>
        <p className="text-sm">새 Container를 만들어 시작하세요.</p>
      </div>
    </div>
  );
}
