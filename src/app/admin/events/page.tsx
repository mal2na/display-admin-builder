// 프로모션 관리 — 목록은 React(src/app/admin/events/promo), 등록·상세는 아직 프로토타입 HTML.
//  예전에는 화면 전체를 public/promotion-prototype.html iframe 으로 띄웠다. iframe 은 별도 문서라
//  globals.css 의 디자인 토큰이 닿지 않아, 공통 규격을 고쳐도 이 화면만 따로 손봐야 했다(2026-10-08).
import { PromoAdmin } from './promo/promo-admin';

export const dynamic = 'force-dynamic';

export default function EventsPage() {
  return <PromoAdmin />;
}
