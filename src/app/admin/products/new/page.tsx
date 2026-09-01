// SB-ETC-071 전시 상품 등록 — 5스텝 위저드 (시안).
//  전시/관리 빌더와 UI 정합을 맞추되, 디바이스는 '가운데'가 아니라 '우측 도킹'.
//  프로세스 참조: 모듈형 주문 프로세스 정리 v1.07 (통신 상품: 가입유형·요금제·약정·단말할부 등).
import { ProductWizard } from './product-wizard';

export const dynamic = 'force-dynamic';

export default function ProductNewPage() {
  return <ProductWizard />;
}
