import { MenuAdmin } from './menu-admin';

// SB-DSP-OPR1-001 전체 메뉴 관리 — 클릭 테스트용 프로토타입.
// DB(Prisma)를 쓰지 않고 클라이언트 목업 상태로만 동작한다.
export default function MenusPage() {
  return (
    <div className="p-6">
      <MenuAdmin />
    </div>
  );
}
