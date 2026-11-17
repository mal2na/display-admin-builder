'use client';

// 구조도 / IA 탭.
//  구조도 = 전시관리 구조도(원천→기준정보→운영IA→전시/관리→F/O). 폰트 Pretendard.
//  IA = 관리 메뉴와 전시 데이터 계층 정리.
import { useState } from 'react';
import { PageTabs } from '@/components/page-tabs';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ───────────────────────── 구조도 탭 ─────────────────────────
const DIAGRAM_CSS = `
.sdg{--surface:#ffffff;--ink:#1a1a1a;--muted:#454f59;--line:#dce0e5;--accent:#3617ce;--accent-soft:#f1f2ff;--accent-2:#f1f2ff;--ext:#e8ecef;--bg:#f8f9fb;--f-body:"Pretendard Variable",Pretendard,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;--f-mono:"Pretendard Variable",Pretendard,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;font-family:var(--f-body);color:var(--ink);display:grid;gap:28px;font-size:15px;line-height:1.6}
.sdg .eyebrow{font-size:12px;letter-spacing:.04em;color:var(--muted);font-weight:600;margin:0 0 6px}
.sdg .thesis{font-size:15.5px;line-height:1.7;margin:0;max-width:none;text-wrap:pretty}
.sdg h2{font-size:18px;margin:0 0 12px;text-wrap:balance}
.sdg .card{background:var(--surface);border:1px solid var(--line);border-radius:10px}
.sdg .diagram{overflow-x:auto;padding:12px}
.sdg .diagram svg{display:block;min-width:1080px;width:100%;max-width:1180px;height:auto;margin:0 auto}
.sdg .steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
.sdg .steps li{padding:16px;display:grid;gap:6px;align-content:start;min-width:0}
.sdg .steps .n{width:26px;height:26px;border-radius:50%;background:var(--accent);color:#fff;font:600 13px/26px var(--f-mono);text-align:center}
.sdg .steps b{font-size:15px}
.sdg .steps span{font-size:13.5px;color:var(--muted)}
.sdg .checks{list-style:none;margin:0;padding:0}
.sdg .checks li{display:grid;grid-template-columns:28px 1fr;gap:12px;padding:14px 18px;border-bottom:1px solid var(--line)}
.sdg .checks li:last-child{border-bottom:0}
.sdg .checks .mk{width:24px;height:24px;border-radius:50%;background:var(--ink);color:var(--surface);font:600 12px/24px var(--f-mono);text-align:center}
.sdg .checks b{display:block}
.sdg .checks span{color:var(--muted);font-size:13.5px}
.sdg .tx{fill:var(--ink);font-family:var(--f-body)}.sdg .tm{fill:var(--muted);font-family:var(--f-body)}.sdg .ta{fill:var(--accent);font-family:var(--f-body)}
.sdg .t1{font-size:17px;font-weight:700}.sdg .t2{font-size:15px;font-weight:700}.sdg .t3{font-size:12.5px}.sdg .t4{font-size:12px}
.sdg .tier{font-size:15px;font-weight:800}
.sdg .flbl{paint-order:stroke;stroke:var(--surface);stroke-width:3.5px;stroke-linejoin:round}
.sdg .z-ext{fill:var(--ext);stroke:var(--line);stroke-dasharray:6 5}
.sdg .z-adm{fill:none;stroke:var(--accent);stroke-width:1.5}
.sdg .bx-ext{fill:var(--surface);stroke:var(--line);stroke-dasharray:5 4}
.sdg .bx{fill:var(--surface);stroke:var(--line)}
.sdg .bx-main{fill:var(--accent-soft);stroke:var(--accent);stroke-width:1.5}
.sdg .bx-build{fill:var(--surface);stroke:var(--accent)}
.sdg .bx-lv{fill:var(--accent-2);stroke:var(--accent)}
.sdg .bx-sub{fill:var(--ext);stroke:var(--line);stroke-dasharray:5 4}
.sdg .ar{fill:none;stroke:var(--muted);stroke-width:2}
.sdg .ar-a{fill:none;stroke:var(--accent);stroke-width:2}
.sdg .ar-opt{fill:none;stroke:var(--muted);stroke-width:2;stroke-dasharray:6 5}
.sdg .chip-opt{fill:var(--surface);stroke:var(--muted);stroke-dasharray:3 3}
.sdg .opt-tag{fill:var(--ext);stroke:var(--muted);stroke-dasharray:3 3}
.sdg .num{fill:var(--accent)}.sdg .numt{fill:#fff;font-family:var(--f-mono);font-size:11px;font-weight:600}
.sdg .sep{fill:var(--accent);font-family:var(--f-body);font-size:22px;font-weight:700}
.sdg .lbl-bg{fill:var(--surface)}
.sdg .tlead{font-size:13.5px;line-height:1.65;color:var(--ink);margin:0 0 14px;max-width:none}
.sdg .trow{display:flex;flex-wrap:wrap;gap:8px;align-items:stretch}
.sdg .tcard{flex:1 1 180px;min-width:168px;border:1px solid var(--line);border-radius:10px;padding:13px 15px;background:var(--surface)}
.sdg .tcard.ds{border-style:dashed;background:var(--ext)}
.sdg .tcard.adm{border-color:var(--accent);background:var(--accent-soft)}
.sdg .tcard .own{display:inline-block;font-size:10.5px;font-weight:700;padding:2px 9px;border-radius:999px;margin-bottom:9px}
.sdg .tcard.ds .own{background:var(--surface);border:1px dashed var(--muted);color:var(--muted)}
.sdg .tcard.adm .own{background:var(--surface);border:1px solid var(--accent);color:var(--accent)}
.sdg .tcard h4{margin:0 0 5px;font-size:15px;font-weight:800;color:var(--ink)}
.sdg .tcard p{margin:0;font-size:12.5px;line-height:1.5;color:var(--muted)}
.sdg .tarrow{align-self:center;color:var(--accent);font-weight:800;font-size:18px}
`;

const DIAGRAM_HTML = `
<div>
  <p class="eyebrow">NEXT채널 어드민 · 전시/관리 영역 · 구조도 v1.0 (2026-11-17)</p>
  <p class="thesis"><b>DS 포탈</b>이 컴포넌트(원천 템플릿·규격·조합)를 소유하고, <b>SB 스튜디오</b>에서 이를 가져와 <b>코너 프리셋</b>(화면+기획 설계)을 구성해요.<br>
프리셋 기반으로 <b>BO FE 코드를 개발</b>하면 <b>코너 원장(DB)</b>에 등록되고, <b>코너 유형 관리</b>는 이 원장을 <b>조회</b>만 해요(정의 변경은 SB 스튜디오).<br>
빌더에서는 등록된 <b>코너 유형을 불러와</b> Template에 쌓고, Corner에서 <b>콘텐츠 맵핑·개인화 설정</b>을 적용해요. <b>상품</b>(EPC+전시상품 정보)과 <b>배너</b>(배너 캠페인 관리)는 Corner로 바로 불러와요.<br>
<b>화면</b>은 전체페이지 관리에서 Container를 등록한 뒤, Container › Template › Corner 순서로 만들어요. 어드민이 관리하는 건 <b>코너·템플릿·컨테이너</b>뿐이에요(아톰·컴포넌트는 관리 안 함).<br>
<b>CVM</b>(점선)은 선택이에요. 개인화 요소(상품·혜택·업무·문구·레이아웃·배치 순서)는 빌더의 Corner에서 적용해요.</p>
</div>

<section class="card diagram" aria-label="전시관리 구조도">
<svg viewBox="0 0 1260 940" role="img" aria-labelledby="dg-t">
<title id="dg-t">DS 포탈의 원천 템플릿을 SB 스튜디오에서 코너 프리셋으로 구성하고, BO FE 개발 후 코너 원장이 등록되며, 코너 유형 관리가 이 원장을 조회하는 전시 어드민 구조.</title>
<defs>
  <marker id="m" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker>
  <marker id="ma" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker>
</defs>

<!-- ───── 1단: 외부 시스템 ───── -->
<rect class="z-ext" x="20" y="20" width="1220" height="132" rx="12"/>
<text class="tx tier" x="44" y="60">외부 시스템</text>
<text class="tm t4" x="44" y="86">전시 어드민 밖에서</text>
<text class="tm t4" x="44" y="104">재료와 데이터를 제공</text>

<!-- DS 포탈 — 컴포넌트(원천 템플릿) 소유 -->
<rect class="bx-ext" x="236" y="36" width="188" height="100" rx="8"/>
<text class="tx t2" x="256" y="68">DS 포탈</text>
<text class="tm t3" x="256" y="92">컴포넌트 소유</text>
<text class="tm t4" x="256" y="112">원천 템플릿 · 규격 · 조합</text>

<!-- SB 스튜디오 — DS 포탈 템플릿으로 코너 프리셋 구성 -->
<rect class="bx-ext" x="452" y="36" width="242" height="100" rx="8"/>
<text class="tx t2" x="472" y="68">SB 스튜디오</text>
<text class="tm t3" x="472" y="92">DS 포탈 템플릿으로</text>
<text class="tm t4" x="472" y="112">코너 프리셋 구성 (화면+기획 설계)</text>
<!-- 1 DS 포탈 → SB 스튜디오 -->
<path class="ar-a" d="M424 86H448" marker-end="url(#ma)"/>
<circle class="num" cx="438" cy="86" r="9"/><text class="numt" x="438" y="90" text-anchor="middle">1</text>

<!-- EPC+전시상품 정보 -->
<rect class="bx-ext" x="724" y="36" width="188" height="100" rx="8"/>
<text class="tx t2" x="744" y="68">EPC+전시상품 정보</text>
<text class="tm t3" x="744" y="92">BSS·상품전시 어드민에서</text>
<text class="tm t4" x="744" y="112">정보 끌어와서 노출</text>

<!-- CVM (선택) -->
<rect class="bx-ext" x="1042" y="36" width="178" height="100" rx="8"/>
<text class="tx t2" x="1060" y="68">CVM</text>
<rect class="opt-tag" x="1108" y="54" width="44" height="20" rx="10"/><text class="tm t4" x="1130" y="68" text-anchor="middle">선택</text>
<text class="tm t3" x="1060" y="92">추천 엔진</text>
<text class="tm t4" x="1060" y="112">코너 개인화 · 배치 순서</text>

<!-- ───── 2단: 코너 개발·등록 ───── -->
<rect class="z-ext" x="20" y="168" width="1220" height="120" rx="12"/>
<text class="tx t2" x="44" y="206">코너 개발·등록</text>
<text class="tm t4" x="44" y="232">SB 프리셋 기반</text>
<text class="tm t4" x="44" y="250">BO FE 개발 · 원장 등록</text>

<!-- 디자인 스튜디오 + BO FE 코드 개발 -->
<rect class="bx" x="256" y="186" width="162" height="82" rx="8"/>
<text class="tx t2" x="337" y="218" text-anchor="middle">디자인 스튜디오</text>
<text class="tm t4" x="337" y="244" text-anchor="middle">코너 컴포넌트 라이브러리화</text>
<text class="ta t1" x="438" y="234" text-anchor="middle">+</text>
<rect class="bx" x="458" y="186" width="170" height="82" rx="8"/>
<text class="tx t2" x="478" y="216">BO FE 코드 개발</text>
<text class="tm t4" x="478" y="240">코너 프리셋 기반</text>
<text class="tm t4" x="478" y="258">BO FE 코드 개발</text>

<!-- 코너 원장 -->
<rect class="bx" x="704" y="184" width="150" height="86" rx="8"/>
<text class="tx t2" x="724" y="216">코너 원장</text>
<text class="tm t4" x="724" y="240">개발 완료 후</text>
<text class="tm t4" x="724" y="258">코너 원장 등록</text>

<!-- 2 SB 스튜디오 → 코너 개발 (프리셋으로 개발) -->
<path class="ar-a" d="M572 136V182" marker-end="url(#ma)"/>
<circle class="num" cx="572" cy="159" r="9"/><text class="numt" x="572" y="163" text-anchor="middle">2</text>
<text class="ta t4" x="590" y="163">코너 프리셋으로 개발</text>
<!-- 3 개발 → 코너 원장 (원장 등록) -->
<path class="ar-a" d="M630 227H700" marker-end="url(#ma)"/>
<circle class="num" cx="665" cy="209" r="9"/><text class="numt" x="665" y="213" text-anchor="middle">3</text>

<!-- ───── 전시 어드민 경계 ───── -->
<rect class="z-adm" x="20" y="306" width="1220" height="552" rx="12"/>
<rect class="lbl-bg" x="36" y="296" width="96" height="20"/>
<text class="ta tier" x="42" y="311">전시 어드민</text>

<!-- 4 코너 원장 → 코너 유형 관리 (조회) -->
<path class="ar-a" d="M774 270V320H400V338" marker-end="url(#ma)"/>
<circle class="num" cx="586" cy="320" r="9"/><text class="numt" x="586" y="324" text-anchor="middle">4</text>
<text class="ta t4" x="600" y="316">코너 원장 조회</text>

<!-- 전체페이지 관리 -->
<rect class="bx" x="40" y="340" width="186" height="92" rx="8"/>
<text class="tx t2" x="58" y="372">전체페이지 관리</text>
<text class="tm t3" x="58" y="396">페이지(Container) 원장</text>
<text class="tm t4" x="58" y="416">URL · 메타 · 상태 · IA 트리</text>

<!-- 코너 유형 관리 (조회 전용) -->
<rect class="bx" x="244" y="340" width="232" height="92" rx="8"/>
<text class="tx t2" x="262" y="372">코너 유형 관리</text>
<text class="tm t3" x="262" y="396">코너 원장 조회 · 코너 유형 승인</text>

<!-- 배너 캠페인 관리 -->
<rect class="bx" x="880" y="340" width="180" height="92" rx="8"/>
<text class="tx t2" x="898" y="372">배너 캠페인 관리</text>
<text class="tm t3" x="898" y="396">규격별 배너 소재 Asset</text>
<text class="tm t4" x="898" y="416">기간 · 랜딩 · 승인</text>

<!-- 3단: 전시/관리 -->
<rect class="bx-main" x="40" y="474" width="1180" height="316" rx="12"/>
<text class="ta t1" x="60" y="504">전시/관리</text>

<rect class="bx-build" x="56" y="520" width="1148" height="152" rx="10"/>
<text class="tx t2" x="74" y="544">신규 화면 빌더</text>

<rect class="bx-lv" x="72" y="554" width="204" height="106" rx="8"/>
<text class="tx t2" x="96" y="588">Container</text>
<text class="tm t3" x="96" y="612">전체페이지 관리 · 1:1</text>
<text class="tm t4" x="96" y="634">홈 · 혜택/쇼핑/마이</text>
<path class="ar-a" d="M296 606H280" marker-end="url(#ma)"/>

<rect class="bx-lv" x="298" y="568" width="166" height="78" rx="8"/>
<text class="tx t2" x="316" y="596">Template</text>
<text class="tm t3" x="316" y="618">코너 쌓기 · 배치 순서</text>
<text class="tm t4" x="316" y="636">로그인 · 비로그인</text>
<path class="ar-a" d="M482 606H466" marker-end="url(#ma)"/>

<rect class="bx-lv" x="484" y="554" width="704" height="106" rx="8"/>
<rect class="bx" x="500" y="564" width="116" height="38" rx="8"/><text class="tx t2" x="558" y="588" text-anchor="middle">Corner</text>
<rect class="bx" x="500" y="610" width="116" height="38" rx="8"/><text class="tx t2" x="558" y="634" text-anchor="middle">Corner</text>
<text class="tm t3" x="636" y="584">등록된 코너 유형을 불러온 후 빌더에서 컨텐츠 맵핑 · 개인화 설정 등 적용</text>
<rect class="bx" x="636" y="600" width="100" height="20" rx="10"/><text class="tx t4" x="686" y="614" text-anchor="middle">기본 · 어드민 설정</text>
<rect class="chip-opt" x="742" y="600" width="80" height="20" rx="10"/><text class="tm t4" x="782" y="614" text-anchor="middle">A · 가로형</text>
<rect class="chip-opt" x="828" y="600" width="72" height="20" rx="10"/><text class="tm t4" x="864" y="614" text-anchor="middle">B · 탭형</text>
<text class="tm t4" x="908" y="614">선택 · CVM</text>
<text class="tm t4" x="636" y="638">아톰·컴포넌트는 어드민 관리 대상 아님 · 코너·템플릿·컨테이너만 어드민에서 관리</text>

<!-- 빌더 ↔ 관리 -->
<path class="ar-a" d="M300 660V692" marker-end="url(#ma)"/>
<text class="ta t4" x="310" y="682">저장</text>
<path class="ar-a" d="M420 692V662" marker-end="url(#ma)"/>
<text class="ta t4" x="430" y="682">빌더로 수정</text>
<circle class="num" cx="274" cy="676" r="9"/><text class="numt" x="274" y="680" text-anchor="middle">8</text>

<rect class="bx-build" x="56" y="696" width="1148" height="58" rx="10"/>
<text class="tx t2" x="74" y="730">기존 화면 관리</text>
<text class="tm t3" x="190" y="730">화면 목록 · 전시 상태 · 승인 · 미전시 전환 · 폐기 · 버전</text>

<!-- 별도: 프로모션 -->
<rect class="bx-sub" x="40" y="794" width="1180" height="56" rx="10"/>
<text class="tx t2" x="60" y="827">프로모션 관리</text>
<text class="tm t3" x="170" y="827">프로모션 빌더를 전시/관리와 별개로 제공</text>

<!-- ───── 화살표 ───── -->
<!-- 전체페이지 관리 → Container (페이지 등록 · 「빌더 화면」 1:1) -->
<path class="ar-a" d="M111 432V554" marker-end="url(#ma)"/>
<text class="ta t4" x="40" y="462">페이지 등록</text>
<!-- 5 코너 유형 관리 → Template (승인된 코너 유형을 Template에 쌓음) -->
<path class="ar-a" d="M330 432V568" marker-end="url(#ma)"/>
<circle class="num" cx="330" cy="458" r="9"/><text class="numt" x="330" y="462" text-anchor="middle">5</text>
<text class="ta t4" x="346" y="462">승인된 코너 유형을 Template에 쌓음</text>
<!-- 6 코너 유형 관리 → Corner (유형 가져와 내용 수정) -->
<path class="ar-a" d="M476 386H600V554" marker-end="url(#ma)"/>
<circle class="num" cx="600" cy="500" r="9"/><text class="numt" x="600" y="504" text-anchor="middle">6</text>
<text class="ta t4" x="616" y="504">유형 가져와 내용 수정</text>
<!-- 6 EPC → Corner (상품 불러오기) -->
<path class="ar-a" d="M820 136V554" marker-end="url(#ma)"/>
<circle class="num" cx="820" cy="500" r="9"/><text class="numt" x="820" y="504" text-anchor="middle">6</text>
<text class="ta t4" x="836" y="504">상품 불러오기</text>
<!-- 6 배너 캠페인 → Corner (배너 불러오기) -->
<path class="ar-a" d="M970 432V554" marker-end="url(#ma)"/>
<circle class="num" cx="970" cy="500" r="9"/><text class="numt" x="970" y="504" text-anchor="middle">6</text>
<text class="ta t4" x="986" y="504">배너 불러오기</text>
<!-- 7 CVM → Corner (개인화 요소 적용, 선택 · 점선) -->
<path class="ar-opt" d="M1131 136V462H450V568" marker-end="url(#m)"/>
<circle class="num" cx="1131" cy="250" r="9"/><text class="numt" x="1131" y="254" text-anchor="middle">7</text>
<text class="tm t4" x="1147" y="250" font-weight="700">개인화 요소(선택)</text>
<text class="tm t4" x="1147" y="268">· 코너 내 상품·혜택·업무</text>
<text class="tm t4" x="1147" y="284">· 문구</text>
<text class="tm t4" x="1147" y="300">· 코너 레이아웃</text>
<text class="tm t4" x="1147" y="316">· 코너 배치 순서</text>
</svg>
</section>

<section>
  <h2>순서</h2>
  <ol class="steps">
    <li class="card"><span class="n">1</span><b>프리셋 구성</b><span>DS 포탈의 컴포넌트(원천 템플릿·규격)를 SB 스튜디오에서 가져와 코너 프리셋(화면+기획 설계)을 구성해요.</span></li>
    <li class="card"><span class="n">2·3</span><b>개발 · 원장 등록</b><span>프리셋 기반으로 BO FE 코드를 개발하면 코너 원장(DB)에 등록돼요(디자인 스튜디오는 코너 컴포넌트를 라이브러리화).</span></li>
    <li class="card"><span class="n">4</span><b>코너 원장 조회</b><span>코너 유형 관리는 등록된 코너 원장을 조회만 해요(정의 변경은 SB 스튜디오). 수정 불가 · 리스트 성격.</span></li>
    <li class="card"><span class="n">5·6</span><b>쌓기 · 가져와 수정</b><span>Container는 전체페이지 관리에서 등록. 승인된 코너 유형을 Template에 쌓고, Corner로 가져와 콘텐츠 맵핑·개인화를 적용해요. 상품(EPC)·배너(캠페인)는 Corner로 바로 불러와요.</span></li>
    <li class="card"><span class="n">7</span><b>CVM 설정 (선택)</b><span>개인화 요소(코너 내 상품·혜택·업무·문구·레이아웃·배치 순서)를 빌더의 Corner에서 적용해요.</span></li>
    <li class="card"><span class="n">8</span><b>관리</b><span>저장한 화면은 기존 화면 관리에서 운영하고, 수정할 땐 빌더로 진입해요.</span></li>
  </ol>
</section>

<section>
  <h2>구성 단위 — 누가 관리하나</h2>
  <p class="tlead"><b>Atom·Component는 디자인 시스템이 정의하고 소유해요(어드민에서 관리하지 않음).</b> 어드민은 디자인 시스템에 등록된 것을 불러와 Corner를 구성하고, Template·Container로 화면을 만들어요. 큰 단위(Container)가 작은 단위(Atom)를 감싸요.</p>
  <div class="trow">
    <div class="tcard adm"><span class="own">어드민 관리</span><h4>Container</h4><p>채널에 실제 나가는 화면 단위. 전체페이지 관리에서 등록하고 Template을 담아요(1:N).</p></div>
    <span class="tarrow">›</span>
    <div class="tcard adm"><span class="own">어드민 관리</span><h4>Template</h4><p>여러 Corner를 순서·배치로 구성한 레이아웃. 로그인·세그먼트로 분기해요.</p></div>
    <span class="tarrow">›</span>
    <div class="tcard adm"><span class="own">어드민 관리</span><h4>Corner</h4><p>Component를 올린 화면의 한 영역. 코너 유형 관리에 등록된 것으로 구성해요.</p></div>
    <span class="tarrow">›</span>
    <div class="tcard ds"><span class="own">디자인 시스템 관리</span><h4>Component</h4><p>Atom을 조합한 기능 모듈. 배너·상품 카드·탭. 묶으면 코너 패턴이 돼요.</p></div>
    <span class="tarrow">›</span>
    <div class="tcard ds"><span class="own">디자인 시스템 관리</span><h4>Atom</h4><p>가장 작은 표시 요소. 문구·이미지·CTA·가격·배지. 단독으로는 화면을 이루지 않아요.</p></div>
  </div>
</section>

<div aria-hidden="true" style="height:56px"></div>
`;

// 전체페이지 관리 ↔ 빌더 관계도 — 화면(페이지)은 전체페이지 관리가 만들고, 그 안을 빌더가 채운다(2026-10-13 사용자 요청).
function PageBuilderRelation() {
  return (
    <section className="mt-7 rounded-2xl border border-[#dce0e5] bg-white p-6">
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded bg-[#3617ce] px-2 py-0.5 text-[11px] font-bold text-white">관계도</span>
        <h3 className="text-[18px] font-bold text-slate-900">전체페이지 관리 ↔ 빌더</h3>
      </div>
      <p className="mb-5 text-[13px] leading-relaxed text-slate-500">
        화면(페이지)은 <b className="text-slate-700">전체페이지 관리</b>가 만들고, 그 <b className="text-slate-700">안을 빌더</b>가 채워요. 둘은 <b className="text-[#3617ce]">「빌더 화면」 유형 페이지에서 Container 1:1</b>로 연결돼요.
      </p>

      {/* 흐름: 전체페이지 관리 → (1:1) → 빌더 */}
      <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-stretch">
        <div className="flex-1 rounded-xl border-2 border-[#dce0e5] bg-[#f8f9fb] p-4">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className="rounded bg-[#454f59] px-1.5 py-0.5 text-[10px] font-bold text-white">전체페이지 관리</span>
            <span className="text-[12px] font-semibold text-slate-700">페이지 = Container 원장</span>
          </div>
          <ul className="space-y-1 text-[12px] leading-relaxed text-slate-500">
            <li>· 페이지 <b className="text-slate-600">등록 · 상태 · 사용여부 · Front 노출</b></li>
            <li>· <b className="text-slate-600">URL · 메타태그</b> (여기서만 입력)</li>
            <li>· 운영 채널 · <b className="text-slate-600">상위-하위 IA 트리</b></li>
            <li>· 페이지 <b className="text-slate-600">유형</b>: 빌더 화면 / 개발 / 외부</li>
          </ul>
        </div>

        <div className="flex shrink-0 flex-row items-center justify-center gap-2 md:flex-col md:px-1">
          <span className="rounded-full bg-[#EDE9FE] px-2.5 py-1 text-center text-[11px] font-bold text-[#6D4AFF]">「빌더 화면」 유형</span>
          <span className="text-[20px] font-bold text-[#6D4AFF] md:my-0.5">→</span>
          <span className="text-[10px] font-medium text-slate-400">Container 1:1</span>
        </div>

        <div className="flex-1 rounded-xl border-2 border-[#c7bdff] bg-[#EDE9FE]/40 p-4">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className="rounded bg-[#3617ce] px-1.5 py-0.5 text-[10px] font-bold text-white">빌더 (전시화면 관리)</span>
            <span className="text-[12px] font-semibold text-slate-700">페이지 안을 구성</span>
          </div>
          <ul className="space-y-1 text-[12px] leading-relaxed text-slate-500">
            <li>· 불러온 Container를 <b className="text-slate-600">Template · Corner</b>로 구성</li>
            <li>· 로그인/세그먼트 <b className="text-slate-600">분기</b> · 전시 <b className="text-slate-600">기간</b></li>
            <li>· 코너 <b className="text-slate-600">배치 · 순서(존)</b> · 표시 · 문구</li>
            <li>· 코너별 <b className="text-slate-600">수급(CVM)</b> 개인화</li>
          </ul>
        </div>
      </div>

      {/* 경계(소유) — 무엇을 어디서 */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[#dce0e5] p-3.5">
          <p className="mb-1.5 text-[12px] font-bold text-slate-700">전체페이지 관리가 소유</p>
          <p className="text-[12px] leading-relaxed text-slate-500">URL · 메타태그 · 페이지 상태/사용여부/Front · 운영 채널 · IA 트리(상위-하위) · 페이지 유형</p>
        </div>
        <div className="rounded-xl border border-[#dce0e5] p-3.5">
          <p className="mb-1.5 text-[12px] font-bold text-[#3617ce]">빌더가 소유</p>
          <p className="text-[12px] leading-relaxed text-slate-500">Template · Corner · Component · 분기 · 기간 · 배치 · 순서(존) · 코너 수급(CVM) · 문구 · 표시</p>
        </div>
      </div>

      <p className="mt-4 rounded-lg bg-[#f8f9fb] px-3.5 py-2.5 text-[11.5px] leading-relaxed text-slate-500">
        ※ <b className="text-slate-700">개발 · 외부</b> 유형 페이지는 빌더와 연결하지 않아요(개발 구현 / 외부 URL). <b className="text-slate-700">빌더 화면</b> 유형만 Container를 1:1로 불러와 전시화면 관리에서 구성해요.
      </p>
    </section>
  );
}

function StructureView() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: DIAGRAM_CSS }} />
      <div className="sdg" dangerouslySetInnerHTML={{ __html: DIAGRAM_HTML }} />
      <PageBuilderRelation />
    </>
  );
}

// ───────────────────────── IA 탭 ─────────────────────────
type IaItem = { name: string; path?: string; role: string; fields?: string; sub?: string[]; tag?: string; review?: boolean; partial?: boolean };
type IaGroup = { group: string; items: IaItem[] };
const ADMIN_IA: IaGroup[] = [
  { group: '전시 관리', items: [
    { name: '전시화면 관리', path: '/admin/containers-test', role: '메인·혜택·쇼핑 홈 등 채널 화면을 만드는 전시 빌더. 코너 유형에서 승인된 코너를 불러와 Template에 쌓고(배치·순서), 로그인/세그먼트별 분기와 전시 기간을 설정한다. 개인화(CVM)는 코너별로 제어.', fields: 'Container › Template › Corner › Component' },
    { name: '코너 유형 관리', path: '/admin/corner-types', role: '디자인 시스템에 등록된 컴포넌트와 Composite 컴포넌트로 코너를 구성하고 검수(승인)를 요청. 디자인 시스템에 등록되어 있으면 새로 조합할 수 있고, 없는 컴포넌트·속성은 디자인 시스템에 추가를 요청. 표시 항목·노출 개수·카드 모양 등 쓸 수 있는 속성만 제어하며, 배너형은 배너 캠페인·상품/혜택형은 상품원장에서 소재를 담는다.', fields: '유형·배열·표시 항목·수급(CVM)' },
    { name: '배너 캠페인 관리', path: '/admin/banner-campaigns', role: '어드민이 소유하는 배너 원장(SSOT). 규격별 배너 소재·문구(공통 1벌)·랜딩·전시 기간을 등록하고 승인한다. 코너 배너형은 여기 등록된 배너만 불러와 사용.', fields: '소재·문구·랜딩·기간·승인', review: true },
    { name: '문구 관리', path: '/admin/messages', role: '코너 타이틀을 편집하고, 배너 문구는 현황만 조회(소유는 배너 캠페인). 세그먼트별 문구 베리에이션은 빌더에서 설정.', fields: '코너 타이틀 · 배너 문구(읽기전용)', tag: '테스트' },
  ]},
  { group: '프로모션 관리', items: [
    { name: '프로모션 관리', path: '/admin/events', role: '이벤트 전용 빌더(전시/관리와 별개). 참여 조건·지급 조건을 조합해 이벤트를 구성하고 자체적으로 전시·승인한다.', fields: '참여·지급 조건', review: true },
  ]},
  { group: '운영 관리', items: [
    { name: '댓글·리뷰 관리', path: '/admin/comments', role: '댓글 관리(이벤트 쪽)와 리뷰 관리(상품 쪽)에 흩어져 있던 기능을 운영 관리로 통합해 관리할 예정. 댓글/리뷰 조회·노출 통제·답글, 신고 접수와 사용자 차단을 한 곳에서.', fields: '노출여부·답변·신고·차단', tag: '통합 예정', review: true, partial: true },
    // 순서: 전체페이지 → App 버전 → App 스플래시 → App 위젯 (2026-10-07 사용자 요청)
    { name: '전체페이지 관리', path: '/admin/page-menu-b', role: '채널의 전체 페이지(=Container) 원장·IA 트리를 관리. 페이지는 템플릿이 아니라 Container 단위로 등록·상태·사용여부·Front 노출·운영 채널·상위-하위 트리를 관리한다. 「빌더 화면」 유형 페이지는 화면 빌더가 이 페이지를 불러와 1:1로 연결하고, URL·메타태그는 여기서만 입력한다. 페이지별 개발 설정은 상세의 「개발설정」 탭으로 흡수(별도 메뉴 없음).', fields: 'Container 단위 · 페이지 유형(빌더/개발/외부) · 상태·사용여부·Front·채널·IA 트리', review: true },
    { name: 'App 버전 관리', path: '/admin/app-versions', role: '앱 버전과 업데이트 정책(권장/강제 업데이트)·안내 팝업을 관리한다.', fields: '권장/강제 업데이트·팝업', review: true },
    { name: 'App 스플래시 관리', path: '/admin/app-splash', role: '앱 실행 시 노출되는 스플래시(런칭) 화면을 OS·기간별로 등록하고 승인·배포한다.', fields: 'OS·적용상태·승인', review: true },
    { name: 'App 위젯 관리', path: '/admin/app-widgets', role: '홈/잠금 등 앱 위젯의 노출·순서·게시 기간을 관리. 위젯의 틀은 위젯 유형 관리에서 정의.', fields: '게시상태·배포·노출순서', sub: ['위젯 유형 관리'], review: true },
  ]},
];

function IaView() {
  // 오늘 리뷰 체크 — 각 메뉴 라벨 위에 체크 컬럼. 리뷰 대상(review:true)은 기본 체크. partial:true는 '일부 리뷰'.
  const [reviewChecked, setReviewChecked] = useState<Set<string>>(() => {
    const s = new Set<string>();
    ADMIN_IA.forEach((g) => g.items.forEach((it) => { if (it.review) s.add(it.name); }));
    return s;
  });
  const toggleReview = (name: string) =>
    setReviewChecked((prev) => {
      const n = new Set(prev);
      if (n.has(name)) n.delete(name); else n.add(name);
      return n;
    });
  return (
    <div className="flex flex-col gap-5">
      <section>
        <h2 className="mb-1 flex items-center gap-2 text-[15px] font-extrabold text-slate-900"><span className="inline-block h-[14px] w-[4px] rounded-sm bg-[#3617ce]" />관리 메뉴 IA</h2>
        <p className="mb-3 flex flex-wrap items-center gap-2 text-[13px] font-medium text-slate-600">
          어드민(BO) 메뉴 구조 — 그룹별 메뉴와 역할·주요 항목. 메뉴명을 누르면 이동합니다.
          <span className="rounded-md bg-[#f1f2ff] px-2 py-0.5 text-[12px] font-bold text-[#3617ce]">오늘 리뷰 {reviewChecked.size}개 체크</span>
        </p>
        <div className="flex flex-col gap-4">
          {ADMIN_IA.map((g) => (
            <div key={g.group} className="rounded-xl border border-[#dce0e5] bg-white">
              <div className="border-b border-[#dce0e5] bg-[#f8f9fb] px-4 py-2.5 text-[13px] font-bold text-slate-700">{g.group}</div>
              <ul className="divide-y divide-[#eef0f6]">
                {g.items.map((it) => {
                  const checked = reviewChecked.has(it.name);
                  return (
                  <li key={it.name} className={cn('flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:items-start sm:gap-4', checked && 'bg-[#f1f2ff]')}>
                    <div className="sm:w-52 sm:shrink-0">
                      <div className="mb-1.5 flex flex-wrap items-center gap-1">
                        <label className={cn('inline-flex cursor-pointer select-none items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-bold', checked ? (it.partial ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-[#3617ce] bg-[#D9E9FF] text-[#2E7AFF]') : 'border-[#dce0e5] bg-white text-slate-400')}>
                          <input type="checkbox" checked={checked} onChange={() => toggleReview(it.name)} className={cn('h-3 w-3', it.partial ? 'accent-amber-500' : 'accent-[#3617ce]')} />
                          오늘 리뷰
                        </label>
                        {checked && it.partial && <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">일부만</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {it.path ? (
                          <Link href={it.path} className="text-[14px] font-bold text-[#3617ce] hover:underline">{it.name}</Link>
                        ) : <span className="text-[14px] font-bold text-slate-900">{it.name}</span>}
                        {it.tag && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">{it.tag}</span>}
                      </div>
                      {it.sub && <div className="mt-1 flex flex-wrap gap-1">{it.sub.map((s) => <span key={s} className="rounded-md bg-[#f8f9fb] px-1.5 py-0.5 text-[11px] font-medium text-slate-600">+ {s}</span>)}</div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium leading-relaxed text-slate-700">{it.role}</p>
                      {it.fields && <p className="mt-1 font-mono text-[11.5px] font-medium text-[#3617ce]">{it.fields}</p>}
                    </div>
                  </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-1 flex items-center gap-2 text-[15px] font-extrabold text-slate-900"><span className="inline-block h-[14px] w-[4px] rounded-sm bg-[#3617ce]" />채널 화면 구조</h2>
        <p className="mb-3 text-[13px] font-medium leading-relaxed text-slate-600">
          앱 메인 = <b className="text-slate-800">홈</b>(최상위·공통) + 하단 탭바로 전환되는 <b className="text-slate-800">혜택·쇼핑·마이</b>. 각각 전시화면 관리의 <b>Container</b> 1개이며, &lsquo;홈 위 / 탭 아래&rsquo; 관계는 Container 중첩이 아니라 여기 IA에서 정의한다.
        </p>
        <div className="rounded-xl border border-[#dce0e5] bg-white p-4">
          {/* 홈 — 최상위 공통 */}
          <div className="rounded-lg border border-[#3617ce] bg-[#f1f2ff] px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-[#3617ce] px-2 py-0.5 text-[11px] font-bold text-white">홈</span>
              <span className="text-[13px] font-bold text-slate-900">AI 어시스턴트 랜딩 · 최상위 공통</span>
              <span className="ml-auto font-mono text-[11px] text-[#3617ce]">Container(MAIN) · 기본/로그인/비로그인</span>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-600">인사말 · 추천(셀프개통 · 질문칩 · 여행상품) · 하단 AI 입력바. 모든 탭 위에 공통으로 얹힌다.</p>
          </div>
          {/* 연결 */}
          <div className="my-1.5 text-center text-[11.5px] font-medium text-slate-400">↓ 스크롤 · 하단 탭바로 본문 전환</div>
          {/* 탭 3종 */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {([['혜택 홈', '퀵메뉴 · 영화예매 · 0 Week'], ['쇼핑 홈', '단말기 · 요금제 · 구독'], ['마이 홈', '요금 · 포인트 · 결합']] as const).map(([t, s]) => (
              <div key={t} className="rounded-lg border border-[#dce0e5] bg-white px-3 py-2.5">
                <p className="text-[13px] font-bold text-slate-900">{t}</p>
                <p className="mt-0.5 text-[11.5px] text-slate-600">{s}</p>
                <p className="mt-1 font-mono text-[10.5px] text-[#3617ce]">Container · 기본/로그인/비로그인</p>
              </div>
            ))}
          </div>
          {/* 하단 탭바 힌트 */}
          <div className="mt-2 flex items-center justify-center gap-3 rounded-md bg-[#f8f9fb] py-1.5 text-[11.5px] font-medium text-slate-500">
            <span className="font-semibold text-slate-600">하단 탭바</span>
            <span className="text-slate-300">·</span>
            <span>혜택</span><span>쇼핑</span><span>마이</span>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-1 flex items-center gap-2 text-[15px] font-extrabold text-slate-900"><span className="inline-block h-[14px] w-[4px] rounded-sm bg-[#3617ce]" />전시 데이터 계층</h2>
        <p className="mb-3 text-[13px] font-medium text-slate-600">화면이 실제로 구성되는 단위(작은 단위 → 큰 단위).</p>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { t: 'Atom', s: '표시 요소(문구·이미지·CTA)' },
            { t: 'Component', s: 'Atom 조합(배너·카드·탭)' },
            { t: 'Corner', s: '화면 영역(컴포넌트 묶음)' },
            { t: 'Template', s: '코너 배치·분기' },
            { t: 'Container', s: '채널에 나가는 화면' },
          ].map((n, i, arr) => (
            <div key={n.t} className="flex items-center gap-2">
              <div className="rounded-lg border border-[#dce0e5] bg-white px-3 py-2">
                <p className="text-[13px] font-bold text-slate-900">{n.t}</p>
                <p className="mt-0.5 text-[11.5px] font-medium text-slate-600">{n.s}</p>
              </div>
              {i < arr.length - 1 && <span className="text-slate-300">→</span>}
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11.5px] text-slate-400">※ 코너는 DS(디자인 시스템)에서 조합·정의되고, 코너 유형 관리는 등록된 것으로 구성 — 자세한 흐름은 [구조도] 탭.</p>
      </section>
    </div>
  );
}

// ───────────────────────── 거버넌스 탭 ─────────────────────────
//  "누가 무엇을 정하나"를 한눈에. 색은 회색 + 포인트 1색(#3617ce)만. 근거: CLAUDE.md(Container) · 순서 1안.
function GovQ({ no, q, answer, children }: { no: number; q: string; answer: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#dce0e5] bg-white p-5">
      <p className="mb-1 text-[12px] font-bold text-[#3617ce]">Q{no}</p>
      <h3 className="mb-3 text-[16px] font-extrabold leading-snug text-slate-900">{q}</h3>
      <p className="mb-4 border-l-[3px] border-[#3617ce] pl-3 text-[14px] font-bold leading-relaxed text-slate-800">{answer}</p>
      {children}
    </section>
  );
}
// 담당 → 역할 한 줄 (단색).
//  좌우 패딩이 없어 글자가 테두리에 붙어 읽기 어려웠다 → 셀 패딩을 주고 행간을 넓힘(2026-10-08).
function GovRow({ who, what, strong }: { who: string; what: React.ReactNode; strong?: boolean }) {
  return (
    <div className={cn('grid grid-cols-[128px_1fr] gap-4 border-t border-[var(--line2)] px-4 py-3.5 first:border-t-0', strong && 'bg-[#f1f2ff]/60')}>
      <span className="text-[13px] font-bold leading-relaxed text-[var(--ink)]">{who}</span>
      <span className="text-[13px] leading-[1.7] text-[var(--ink2)]">{what}</span>
    </div>
  );
}
function GovernanceView() {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-[13px] leading-relaxed text-slate-500">
        운영에서 <b className="text-slate-800">“누가 무엇을 정하나”</b>를 한눈에. 원칙은 딱 하나 —
        <b className="text-[#3617ce]"> 코너는 껍데기(규격), 콘텐츠는 빌더에서, 고객마다 실제는 CVM.</b>
      </p>

      {/* Q1 — 코너는 껍데기 */}
      <GovQ no={1} q="코너에 콘텐츠를 미리 넣나요? 빌더에서 넣나요?"
        answer={<>코너 유형은 <u>껍데기(규격)만</u>. 콘텐츠(상품·배너·문구·개수·이름)는 <u>빌더(전시화면 관리)에서</u> 매핑해요.</>}>
        <div className="rounded-lg border border-[#dce0e5]">
          <GovRow who="코너 유형" what={<>DS 포털 <b>껍데기</b>를 등록(배열·레이아웃·어떤 API를 쓰는지). <b>콘텐츠는 없음</b>.</>} />
          <GovRow who="빌더(전시화면)" what={<>코너를 쌓고 <b>이름·텍스트·노출 개수·상품/배너·수급 방식</b>(직접 지정 / 조건 / CVM)을 설정. 미리보기 즉시.</>} strong />
          <GovRow who="DS 포털" what={<><b>Atom·Component</b>를 소유. 코너·템플릿·컨테이너는 어드민이 구성.</>} />
        </div>
        <p className="mt-3.5 text-[12.5px] leading-[1.7] text-[var(--ink3)]">
          왜냐면 — 같은 배너 코너라도 <b className="text-slate-700">A페이지=S18, B페이지=iPhone</b>이면, 콘텐츠를 코너에 박아두면 코너를 매번 새로 만들어야 해요. <b className="text-slate-700">껍데기 1개 + 페이지별 콘텐츠</b>가 효율적(T우주 방식). 그래서 <b className="text-[#3617ce]">코너 불러오기는 데이터 없는 가이드</b>로 와요.
        </p>
      </GovQ>

      {/* Q1b — 노출 순서 */}
      <GovQ no={2} q="노출 순서는 누가 정해요?"
        answer={<><u>기본 순서는 빌더(운영자)</u>가, <u>실제 순서는 CVM이 고객마다</u> 정해요.</>}>
        <div className="rounded-lg border border-[#dce0e5]">
          <GovRow who="빌더(전시화면)" what={<>코너 <b>배치 순서·위치 고정</b> + 운영자 편성이면 상품·혜택 <b>순서를 직접</b>.</>} />
          <GovRow who="CVM (자동)" what={<>수급이 CVM이면 <b>실제 순서를 고객마다</b> 정해요(비고정 코너를 세그먼트별 재정렬). 미리보기는 기본만.</>} strong />
        </div>
      </GovQ>

      {/* Q3 — 컨테이너 단위 */}
      <GovQ no={3} q="전체 페이지 관리는 왜 ‘컨테이너’ 단위예요? 템플릿 단위로 하면 안 돼요?"
        answer={<>페이지는 <u>‘컨테이너(화면 1개)’ 단위로만</u> 관리해요. 템플릿 단위로는 <u>관리하면 안 돼요.</u></>}>
        <div className="rounded-lg border border-[#dce0e5] bg-[#f8f9fb] p-4">
          <p className="mb-2 text-[13px] font-bold text-slate-800">쉽게 — 집 주소와 인테리어처럼</p>
          <p className="text-[13px] leading-relaxed text-slate-600">
            <b>컨테이너 = 집 주소</b>(화면 1개, 하나뿐). <b>템플릿 = 그 집의 상황별 인테리어</b>(로그인/세그먼트/기간마다 다른 버전, 여러 개).<br />
            메뉴·URL은 <b>주소(컨테이너)로만</b> 보내요. 그날 어떤 인테리어(템플릿)를 보여줄지는 <b>들어온 뒤 상황 보고(런타임)</b> 정해요.
          </p>
        </div>
        <p className="mb-2 mt-4 text-[13px] font-bold text-slate-800">템플릿 단위로 관리하면 생기는 문제</p>
        <ul className="space-y-2 text-[13px] leading-[1.7] text-[var(--ink2)]">
          <li className="flex gap-2"><span className="text-slate-400">·</span><span>한 페이지가 <b>여러 줄</b>로 쪼개져요(로그인용·비로그인용·기간용…). 목록이 금세 지저분해져요.</span></li>
          <li className="flex gap-2"><span className="text-slate-400">·</span><span>메뉴·URL이 <b>어느 템플릿을 가리켜야 할지</b> 애매해져요. 메뉴는 ‘화면’을 부르지 ‘그날의 버전’을 부르지 않아요.</span></li>
          <li className="flex gap-2"><span className="text-slate-400">·</span><span>“어떤 페이지가 있나(목록·IA)”와 “어떻게 달라지나(분기 로직)”가 <b>뒤섞여요</b>.</span></li>
        </ul>
        <div className="mt-4 rounded-lg border border-[#dce0e5]">
          <GovRow who="전체페이지 관리" what={<><b>컨테이너(페이지)</b>를 등록·상태·IA 트리·전체 메뉴(네비게이션) 연결. 메뉴 관리·페이지 개발 설정을 모두 흡수.</>} />
          <GovRow who="빌더(전시화면)" what={<>그 컨테이너 <b>안의 템플릿·코너</b>(분기·기간·배치)를 다뤄요.</>} />
        </div>
      </GovQ>

      {/* Q4 — 베리에이션 */}
      <GovQ no={4} q="문구·노출 타입 ‘베리에이션’은 누가 등록해요?"
        answer={<><u>빌더에서 후보를 등록</u>하고(콘텐츠니까), <u>그중 하나를 CVM이 고객마다</u> 골라요.</>}>
        <div className="rounded-lg border border-[#dce0e5]">
          <GovRow who="빌더(전시화면)" what={<>각 컴포넌트의 <b>문구 베리에이션</b>(타겟별 대체 문구)과 <b>노출 타입 베리에이션</b>(코너 유형 카탈로그에서 골라 2~3개 조합)을 등록.</>} />
          <GovRow who="CVM (자동)" what={<>고객 세그먼트로 <b>후보 중 하나를 택1</b>(런타임). 미리보기는 기본(첫 후보)만.</>} strong />
        </div>
        <p className="mt-3.5 text-[12.5px] leading-[1.7] text-[var(--ink3)]">
          원리는 <b className="text-slate-700">“재료는 우리가(빌더에서 등록), 조합은 CVM”</b> — 베리에이션도 콘텐츠라 빌더에서. 노출 타입의 <b>후보 목록</b>은 코너 유형(껍데기)에 등록된 배열·레이아웃에서 골라요.
        </p>
      </GovQ>
    </div>
  );
}

// ───────────────────────── CVM 노출 탭 ─────────────────────────
//  "CVM이 빌더 어디에·어떻게 노출되나"를 한눈에. 근거: 2026-10-01 스크럼 CVM · 2026-10-06/07 회의 · POL-REC v0.23 · CLAUDE.md.
function CvmCard({ no, title, children }: { no: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#dce0e5] bg-white p-5">
      <p className="mb-1 text-[12px] font-bold text-[#3617ce]">{no}</p>
      <h3 className="mb-3 text-[16px] font-extrabold leading-snug text-slate-900">{title}</h3>
      {children}
    </section>
  );
}
function CvmSpotRow({ where, what, ui }: { where: string; what: React.ReactNode; ui: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr_132px] gap-3 border-t border-[var(--line2)] px-4 py-3 first:border-t-0">
      <span className="text-[13px] font-bold leading-relaxed text-[var(--ink)]">{where}</span>
      <span className="text-[13px] leading-[1.7] text-[var(--ink2)]">{what}</span>
      <span className="text-[11.5px] leading-relaxed text-[var(--ink3)]">{ui}</span>
    </div>
  );
}
function CvmView() {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-[13px] leading-relaxed text-slate-500">
        CVM이 <b className="text-slate-800">빌더 어디에·어떻게</b> 노출되는지. 한 줄 원칙 —
        <b className="text-[#3617ce]"> 재료(후보)는 운영자가 빌더에서, 조합·택1·순위는 CVM이 고객마다.</b>
      </p>

      {/* ① 개인화 요소 */}
      <CvmCard no="① CVM이 제공하는 것" title="개인화 요소 — 코너 안에서 고객마다 달라지는 것">
        <div className="rounded-lg border border-[#dce0e5]">
          <GovRow who="콘텐츠(핵심)" what={<>상품·혜택·업무. 큰 후보 풀(50·300개)에서 <b>고객별 N개(3~5) 선별·순위</b>. “3개 등록 3개 노출”이 아니라 풀에서 골라줘요.</>} strong />
          <GovRow who="문구" what={<>타겟별 대체 문구 중 <b>고객마다 택1</b> (문구 베리에이션).</>} />
          <GovRow who="레이아웃" what={<>등록된 노출 타입 중 <b>택1</b> (노출 타입 베리에이션 — 스크럼상 ‘부차적’).</>} />
          <GovRow who="배치 순서" what={<>비고정 코너를 <b>런타임 재정렬</b>(고정 코너 제외).</>} />
          <GovRow who="값 바인딩" what={<>이름·등급·바코드 등 고객정보 표시(@cvm:key) — 수급 방식과 <b>별개</b>.</>} />
        </div>
      </CvmCard>

      {/* ② 거버넌스 */}
      <CvmCard no="② 어디서 정하나" title="CVM 설정은 빌더 Corner에서 (2026-10-07 변경)">
        <p className="mb-3 border-l-[3px] border-[#3617ce] pl-3 text-[13.5px] font-bold leading-relaxed text-slate-800">
          전에는 ‘코너 유형 관리에서 CVM 정의’였지만, 2026-10-07 회의로 <u>개인화(CVM)는 빌더 Corner에서 적용</u>으로 바뀌었어요.
        </p>
        <div className="rounded-lg border border-[#dce0e5]">
          <GovRow who="코너 유형 관리" what={<>껍데기(규격)만 정의·승인. <b>CVM 설정 없음</b>.</>} />
          <GovRow who="빌더(Corner)" what={<>소재 채우기 + <b>개인화(CVM) 적용 전부</b>(수급 방식·요청·폴백·베리에이션).</>} strong />
          <GovRow who="룰(세그먼트)" what={<>어드민이 <b>안 적어요</b>. CVM 블랙박스(AI)가 판정 — 세그는 CVM/C360/세일즈포스 입력, 어드민은 <b>룰값 표시만</b>.</>} />
        </div>
      </CvmCard>

      {/* ③ 빌더 노출 지점 */}
      <CvmCard no="③ 빌더 어디에 뜨나" title="수급 = CVM 켠 코너에서만 노출">
        <div className="rounded-lg border border-[#dce0e5]">
          <div className="grid grid-cols-[120px_1fr_132px] gap-3 bg-[#f3f4f8] px-4 py-2.5 text-[11px] font-bold text-[var(--ink2)]">
            <span>지점</span><span>무엇</span><span>현재 위치</span>
          </div>
          <CvmSpotRow where="수급 방식" what={<>CVM 기반 / 운영자 편성 택1. CVM 켠 코너만 아래가 열림.</>} ui="② 수급" />
          <CvmSpotRow where="요청(풀→택M)" what={<>CVM에 무엇을·몇 개 달라고 할지 + 콘텐츠 묶음 N중M 보충.</>} ui="③ 요청 · 보충 배지" />
          <CvmSpotRow where="폴백" what={<>응답 없을 때(미노출 / 운영자 편성). 미리보기는 항상 폴백 기준.</>} ui="④ 폴백" />
          <CvmSpotRow where="문구 베리에이션" what={<>타겟별 대체 문구(CVM 택1). 등록=아톰 ＋문구 / 요약=‘문구 한눈에 보기’.</>} ui="CVM 흐름(폴백 옆)" />
          <CvmSpotRow where="노출 타입 베리에이션" what={<>레이아웃 후보 2~3개(CVM 택1).</>} ui="CVM 흐름(폴백 옆)" />
          <CvmSpotRow where="배치 순서" what={<>비고정 코너 런타임 재정렬. 위치 고정(Lock)은 제외.</>} ui="템플릿 배치 · 순서 예시" />
          <CvmSpotRow where="값 바인딩" what={<>이름·등급·바코드 = @cvm:key 고객정보(수급과 별개).</>} ui="아톰 바인딩" />
        </div>
        <div className="mt-3.5 rounded-lg bg-[#f1f2ff]/60 px-4 py-3 text-[12.5px] leading-[1.8] text-slate-700">
          CVM 흐름 묶음(수급=CVM일 때만):{' '}
          <b className="text-[#3617ce]">③ 요청 → ④ 폴백 → [개인화 베리에이션: 노출 타입 + 문구] → ⑤ 출처</b>
        </div>
      </CvmCard>

      {/* ④ 미확정 */}
      <section className="rounded-xl border border-[#f2c6a3] bg-[#fff7f1] p-5">
        <p className="mb-1 text-[12px] font-bold text-[#c2410c]">④ 아직 확정 전</p>
        <h3 className="mb-3 text-[16px] font-extrabold leading-snug text-slate-900">회의에서 열려 있는 쟁점</h3>
        <ul className="space-y-2 text-[13px] leading-[1.7] text-[var(--ink2)]">
          <li className="flex gap-2"><span className="text-[#c2410c]">·</span><span><b>연동 지점·에셋 등록 위치</b> — ‘어드민 등록 + CVM 데이터 수신’(우리 안) vs ‘CVM 등록’.</span></li>
          <li className="flex gap-2"><span className="text-[#c2410c]">·</span><span><b>코너 순서 개인화</b> — 세일즈포스 “불가” vs 우리 “원함”.</span></li>
        </ul>
      </section>

      <p className="text-[11px] leading-relaxed text-slate-400">
        근거 — 2026-10-01 데일리 스크럼(CVM) · 2026-10-06/07 회의 · 추천 정책서 POL-REC v0.23 · CLAUDE.md.
      </p>
    </div>
  );
}

// ───────────────────────── 탭 셸 ─────────────────────────
export function StructureTabs() {
  const [tab, setTab] = useState<'map' | 'ia' | 'gov' | 'cvm'>('map');
  return (
    <div>
      <PageTabs
        tabs={[{ key: 'map', label: '구조도' }, { key: 'ia', label: 'IA' }, { key: 'gov', label: '거버넌스' }, { key: 'cvm', label: 'CVM 노출' }]}
        value={tab}
        onChange={(k) => setTab(k as 'map' | 'ia' | 'gov' | 'cvm')}
      />
      {tab === 'map' ? <StructureView /> : tab === 'ia' ? <IaView /> : tab === 'gov' ? <GovernanceView /> : <CvmView />}
    </div>
  );
}
