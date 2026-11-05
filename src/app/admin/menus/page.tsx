// 메뉴 관리(전체메뉴) · 운영 관리 — SB BO-AIM-DSP-PG529(편집)·PG530(조회)·PG531(변경/승인 이력).
//  FO '전체메뉴'(마이/혜택/상품/고객지원 → 페이지 그룹 → 페이지)를 노출·순서·분류로 편성하고 승인 요청하는 어드민.
import { MenuManager } from './menu-manager';

export const dynamic = 'force-dynamic';

export default function MenusPage() {
  return (
    <div className="p-6">
      <MenuManager />
    </div>
  );
}
