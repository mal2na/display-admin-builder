'use client';

// 구조도 / IA 탭.
//  구조도 = 전시관리 구조도(원천→기준정보→운영IA→전시/관리→F/O). 폰트 Pretendard.
//  IA = 관리 메뉴와 전시 데이터 계층 정리.
import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ───────────────────────── 구조도 탭 ─────────────────────────
const DIAGRAM_CSS = `
.sdg{--surface:#ffffff;--ink:#1b2230;--muted:#44505f;--line:#cfd5df;--accent:#3b3fd8;--accent-soft:#eceefe;--accent-2:#dfe1fd;--ext:#eceef2;--bg:#f5f6f8;--f-body:"Pretendard Variable",Pretendard,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;--f-mono:"Pretendard Variable",Pretendard,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;font-family:var(--f-body);color:var(--ink);display:grid;gap:28px;font-size:15px;line-height:1.6}
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
  <p class="eyebrow">NEXT채널 어드민 전시/관리 영역 구조도 v0.9</p>
  <p class="thesis"><b>코너 유형 관리</b>에서 상품, 배너, 문구를 코너 유형에 맵핑하고 승인해요.<br/>승인된 코너 유형은 빌더에서 <b>Container › Template › Corner</b>로 쌓아 화면을 만들어요.<br/>고객은 <b>메뉴 관리(전체 메뉴)</b>로 진입하고, <b>CVM</b>(점선)은 Template의 코너에 선택 적용돼요.<br/>승인된 화면은 개발이 반영해 <b>고객 앱/웹(F/O)</b>에 전시돼요.</p>
</div>

<section class="card diagram" aria-label="전시관리 구조도">
<svg viewBox="0 0 1260 950" role="img" aria-labelledby="dg-t">
<title id="dg-t">외부 시스템, 기준 정보, 운영 IA, 전시/관리, F/O 다섯 영역으로 나뉜 전시 어드민 구조. 원천 소스를 코너 유형에 맵핑하고 승인한 뒤 Container에 등록하고 고객 화면에 전시.</title>
<defs>
  <marker id="m" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#5d6778"/></marker>
  <marker id="ma" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#3b3fd8"/></marker>
  <marker id="ms" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#5d6778"/></marker>
</defs>

<rect class="z-ext" x="20" y="20" width="1220" height="140" rx="12"/>
<text class="tx tier" x="44" y="76">외부 시스템</text>
<text class="tm t3" x="44" y="98">전시 어드민 밖에서</text>
<text class="tm t3" x="44" y="116">재료와 데이터를 제공</text>

<rect class="bx-ext" x="240" y="44" width="180" height="96" rx="8"/>
<text class="tx t2" x="258" y="70">디자인 시스템</text>
<rect class="opt-tag" x="356" y="56" width="52" height="18" rx="9"/><text class="tm t4" x="382" y="69" text-anchor="middle">관리 밖</text>
<text class="tm t3" x="258" y="94">Atom → Component</text>
<text class="tm t3" x="258" y="111">→ Composite(코너 패턴)</text>
<text class="ta t4" x="258" y="130">어드민에서 관리하지 않음</text>

<rect class="bx-ext" x="450" y="44" width="180" height="96" rx="8"/>
<text class="tx t2" x="468" y="76">상품원장</text>
<text class="tm t3" x="468" y="100">상품 정보</text>
<text class="tm t3" x="468" y="118">원천 소스</text>

<rect class="bx-ext" x="1040" y="44" width="180" height="96" rx="8"/>
<text class="tx t2" x="1058" y="76">CVM</text>
<rect class="opt-tag" x="1100" y="62" width="44" height="20" rx="10"/><text class="tm t4" x="1122" y="76" text-anchor="middle">선택</text>
<text class="tm t3" x="1058" y="100">추천 엔진</text>
<text class="tm t3" x="1058" y="118">코너 내 콘텐츠 개인화</text>

<rect class="z-adm" x="20" y="186" width="1220" height="666" rx="12"/>
<rect class="lbl-bg" x="36" y="176" width="96" height="20"/>
<text class="ta tier" x="42" y="191">전시 어드민</text>

<text class="tx tier" x="44" y="250">기준 정보</text>
<text class="tm t3" x="44" y="272">화면에 쓸 재료를</text>
<text class="tm t3" x="44" y="290">어드민에 등록</text>

<rect class="bx" x="190" y="212" width="590" height="96" rx="8"/>
<text class="tx t2" x="208" y="244">코너 유형 관리</text>
<text class="tm t3" x="208" y="268">코너 유형 등록, 원천 소스 맵핑, 승인</text>
<text class="tm t3" x="208" y="286">업무진입, 상품, 배너 …</text>
<rect class="opt-tag" x="480" y="254" width="44" height="20" rx="10"/><text class="tm t4" x="502" y="268" text-anchor="middle">선택</text>
<text class="tm t3" x="534" y="268">코너 내 개인화 설정 (CVM)</text>

<rect class="bx" x="790" y="200" width="118" height="52" rx="8"/>
<text class="tx t2" x="806" y="224">문구 관리</text>
<text class="tm t4" x="806" y="243">코너 타이틀 원천</text>

<rect class="bx" x="920" y="212" width="180" height="96" rx="8"/>
<text class="tx t2" x="938" y="244">배너 캠페인 관리</text>
<text class="tm t3" x="938" y="268">규격별 배너 소재 Asset</text>
<text class="tm t3" x="938" y="286">기간, 랜딩, 승인</text>

<text class="tx tier" x="44" y="372">운영 IA</text>
<text class="tm t3" x="44" y="394">화면 진입, 페이지 구조</text>

<rect class="bx" x="500" y="342" width="180" height="86" rx="8"/>
<text class="tx t2" x="518" y="370">메뉴 관리</text>
<text class="tm t3" x="518" y="392">전체 메뉴, 네비게이션</text>
<text class="tm t4" x="518" y="412">노출, 채널, Container 연결</text>

<rect class="bx" x="710" y="342" width="180" height="86" rx="8"/>
<text class="tx t2" x="728" y="370">전체페이지 관리</text>
<text class="tm t3" x="728" y="392">페이지 원장, IA</text>
<text class="tm t4" x="728" y="412">상태, 사용여부, 노출</text>

<path class="ar" d="M706 383H686" marker-end="url(#m)" marker-start="url(#ms)"/>
<text class="tm t4 flbl" x="696" y="372" text-anchor="middle">pageCode</text>

<rect class="bx-main" x="40" y="452" width="1180" height="306" rx="12"/>
<text class="ta t1" x="60" y="482">전시/관리</text>
<text class="tm t3" x="350" y="481">화면을 만들고, 만든 화면을 관리</text>

<rect class="bx-build" x="56" y="498" width="1148" height="146" rx="10"/>
<text class="tx t2" x="74" y="524">신규 화면 빌더</text>
<text class="tm t4" x="350" y="523">화면 구성 위계 (왼쪽이 상위)</text>

<rect class="bx-lv" x="72" y="540" width="160" height="88" rx="8"/>
<text class="tx t2" x="88" y="568">Container</text>
<text class="tm t3" x="88" y="590">채널 화면, Template 보유</text>
<text class="tm t4" x="88" y="610">혜택 홈, 쇼핑 홈</text>
<text class="sep" x="244" y="592" text-anchor="middle">›</text>

<rect class="bx-lv" x="256" y="540" width="160" height="88" rx="8"/>
<text class="tx t2" x="272" y="568">Template</text>
<text class="tm t3" x="272" y="590">코너 유형 쌓기, 배치</text>
<text class="tm t4" x="272" y="610">로그인, 세그먼트 분기</text>
<text class="sep" x="428" y="592" text-anchor="middle">›</text>

<rect class="bx-lv" x="440" y="540" width="748" height="88" rx="8"/>
<text class="tx t2" x="456" y="568">Corner</text>
<text class="tm t3" x="530" y="568">등록된 코너 유형을 Template에 쌓음</text>
<text class="tm t4" x="456" y="592">코너 내 개인화는 코너 유형 관리에서 설정</text>
<rect class="bx" x="456" y="602" width="104" height="20" rx="10"/><text class="tx t4" x="508" y="616" text-anchor="middle">기본, 어드민 설정</text>
<rect class="chip-opt" x="566" y="602" width="72" height="20" rx="10"/><text class="tm t4" x="602" y="616" text-anchor="middle">A 가로형</text>
<rect class="chip-opt" x="644" y="602" width="60" height="20" rx="10"/><text class="tm t4" x="674" y="616" text-anchor="middle">B 탭형</text>
<text class="tm t4" x="714" y="616">선택 CVM</text>
<text class="tm t3" x="840" y="568">단일 컴포넌트도 코너로 통합</text>
<text class="tm t4" x="840" y="592">노출 정보는 코너 유형에 맵핑된 원천 소스에서</text>

<path class="ar-a" d="M300 644V676" marker-end="url(#ma)"/>
<text class="ta t4 flbl" x="310" y="666">저장</text>
<path class="ar-a" d="M420 676V646" marker-end="url(#ma)"/>
<text class="ta t4 flbl" x="430" y="666">빌더로 수정</text>
<circle class="num" cx="274" cy="660" r="10"/><text class="numt" x="274" y="664" text-anchor="middle">5</text>

<rect class="bx-build" x="56" y="680" width="1148" height="62" rx="10"/>
<text class="tx t2" x="74" y="716">기존 화면 관리</text>
<text class="tm t3" x="190" y="716">화면 목록, 전시 상태, 승인, 미전시 전환, 폐기, 버전</text>

<rect class="bx-sub" x="40" y="778" width="860" height="58" rx="10"/>
<text class="tx t2" x="60" y="813">프로모션 관리</text>
<text class="tm t3" x="170" y="813">프로모션 빌더를 전시/관리와 별개로 제공</text>

<path class="ar-a" d="M1060 742V866" marker-end="url(#ma)"/>
<circle class="num" cx="1060" cy="804" r="10"/><text class="numt" x="1060" y="808" text-anchor="middle">6</text>
<text class="ta t4 flbl" x="1076" y="808">배포 전시</text>
<rect class="bx-build" x="40" y="868" width="1180" height="60" rx="10"/>
<text class="ta t2" x="60" y="894">F/O 고객 화면 (앱/웹)</text>
<text class="tm t3" x="60" y="914">완성 화면이 고객 앱/웹 채널에 전시. 어드민 변경은 승인 후 개발이 반영 (즉시 배포 아님)</text>

<path class="ar" d="M330 140V208" marker-end="url(#m)"/>
<circle class="num" cx="330" cy="173" r="10"/><text class="numt" x="330" y="177" text-anchor="middle">1</text>
<text class="tm t4 flbl" x="346" y="177">등록</text>
<path class="ar" d="M540 140V208" marker-end="url(#m)"/>
<circle class="num" cx="540" cy="173" r="10"/><text class="numt" x="540" y="177" text-anchor="middle">2</text>
<text class="tm t4 flbl" x="556" y="177">상품 맵핑</text>
<path class="ar" d="M920 288H784" marker-end="url(#m)"/>
<circle class="num" cx="862" cy="288" r="10"/><text class="numt" x="862" y="292" text-anchor="middle">2</text>
<text class="tm t4 flbl" x="876" y="292">배너 맵핑</text>
<path class="ar" d="M849 252V264H784" marker-end="url(#m)"/>
<circle class="num" cx="812" cy="264" r="10"/><text class="numt" x="812" y="268" text-anchor="middle">2</text>
<text class="tm t4 flbl" x="792" y="282">문구 맵핑</text>
<path class="ar-a" d="M296 308V538" marker-end="url(#ma)"/>
<circle class="num" cx="296" cy="326" r="10"/><text class="numt" x="296" y="330" text-anchor="middle">3</text>
<text class="ta t4 flbl" x="312" y="330">승인 코너 유형 → Template에 쌓기</text>
<path class="ar-opt" d="M1040 92H745V208" marker-end="url(#m)"/>
<circle class="num" cx="745" cy="173" r="10"/><text class="numt" x="745" y="177" text-anchor="middle">4</text>
<text class="tm t4 flbl" x="761" y="177">(선택) 코너 개인화 정의</text>
<path class="ar-opt" d="M1130 140V440H344V538" marker-end="url(#m)"/>
<circle class="num" cx="1130" cy="300" r="10"/><text class="numt" x="1130" y="304" text-anchor="middle">4</text>
<text class="tm t4 flbl" x="1146" y="296">(선택) 런타임</text>
<text class="tm t4 flbl" x="1146" y="312">개인화 반영</text>
<path class="ar" d="M590 428V450" marker-end="url(#m)"/>
<text class="tm t4 flbl" x="604" y="444">고객 진입 (네비게이션)</text>
</svg>
</section>

<section>
  <h2>구성 단위 — Atom부터 Container까지</h2>
  <p class="tlead"><b>Atom과 Component는 디자인 시스템이 정의하고 소유해요(어드민에서 관리하지 않음).</b> 어드민은 디자인 시스템에 등록된 Component를 불러와 Corner를 구성하고, Template과 Container로 화면을 만들어요. 작은 단위가 큰 단위에 감싸여요.</p>
  <div class="trow">
    <div class="tcard ds"><span class="own">디자인 시스템 소유</span><h4>Atom</h4><p>가장 작은 표시 요소. 문구, 이미지, CTA, 가격, 배지. 단독으로는 화면을 이루지 않아요.</p></div>
    <span class="tarrow">›</span>
    <div class="tcard ds"><span class="own">디자인 시스템 소유</span><h4>Component</h4><p>Atom을 조합한 기능 모듈. 배너, 상품 카드, 탭. 묶으면 Composite(코너 패턴)가 돼요.</p></div>
    <span class="tarrow">›</span>
    <div class="tcard adm"><span class="own">어드민 구성</span><h4>Corner</h4><p>Component를 올린 화면의 한 영역. 코너 유형 관리에서 등록된 것으로 구성해요.</p></div>
    <span class="tarrow">›</span>
    <div class="tcard adm"><span class="own">어드민 구성</span><h4>Template</h4><p>여러 Corner를 순서와 배치로 구성한 레이아웃. 로그인과 세그먼트로 분기해요.</p></div>
    <span class="tarrow">›</span>
    <div class="tcard adm"><span class="own">어드민 구성</span><h4>Container</h4><p>채널에 실제 나가는 화면 단위. Template을 담아요(Template과 1:N).</p></div>
  </div>
</section>

<section>
  <h2>순서</h2>
  <ol class="steps">
    <li class="card"><span class="n">1</span><b>등록</b><span>디자인 시스템이 소유한 Component를 코너 유형 관리로 불러와 코너 유형으로 등록 (Atom과 Component는 디자인 시스템이 관리)</span></li>
    <li class="card"><span class="n">2</span><b>맵핑, 승인</b><span>상품원장의 상품, 배너 캠페인의 배너, 문구 관리의 코너 타이틀 같은 원천 소스를 코너 유형에 맵핑하고 승인</span></li>
    <li class="card"><span class="n">3</span><b>Template에 쌓기</b><span>승인된 코너 유형을 빌더에서 Template에 Corner로 쌓아 화면을 구성하고, Template은 Container에 담겨요(Container › Template › Corner).</span></li>
    <li class="card"><span class="n">4</span><b>CVM 설정 (선택)</b><span>코너 안 개인화(콘텐츠)는 코너 유형 관리에서 정의하고, 런타임에 CVM이 Template의 코너에 반영해요. 코너 배치 순서는 운영자가 Template에서 설정해요.</span></li>
    <li class="card"><span class="n">5</span><b>관리</b><span>저장한 화면은 기존 화면 관리에서 운영하고, 수정할 땐 빌더로 진입</span></li>
    <li class="card"><span class="n">6</span><b>배포, 전시</b><span>승인된 화면을 개발이 반영해 고객 앱/웹(F/O)에 전시해요. 어드민 변경은 즉시 배포되지 않아요.</span></li>
  </ol>
</section>

<section>
  <h2>진입, IA</h2>
  <ol class="steps">
    <li class="card"><span class="n">A</span><b>메뉴 관리</b><span>고객이 보는 전체 메뉴(네비게이션)를 관리하고, 노출과 채널 설정과 함께 화면을 Container 단위로 연결</span></li>
    <li class="card"><span class="n">B</span><b>전체페이지 관리</b><span>서비스의 모든 페이지 원장과 IA 구조(상태, 사용여부, 노출). 메뉴와는 pageCode로 연결</span></li>
  </ol>
</section>

<section class="card">
  <h2 style="padding:16px 18px 0;margin:0">확인할 점</h2>
  <ol class="checks">
    <li><span class="mk">1</span><div><b>CVM이 코너 순서까지 개인화하는지 미확정</b><span>지금 구조는 코너 배치 순서를 운영자가 빌더에서 설정하고, CVM은 코너 안 콘텐츠만 개인화해요. 코너 순서 개인화는 스크럼 쟁점으로 남아 있어요(10월 7일 CVM 미팅).</span></div></li>
    <li><span class="mk">2</span><div><b>코너 내 개인화가 유형 단위로 적용돼요</b><span>개인화 설정을 코너 유형 관리에서 하면 같은 유형을 쓰는 모든 화면의 코너에 같이 적용돼요. 화면이나 코너별로 끄거나 켜야 하는 경우가 있는지 확인이 필요해요.</span></div></li>
    <li><span class="mk">3</span><div><b>'템플릿'이라는 이름이 두 곳에 있어요</b><span>디자인 시스템의 원천 템플릿과 빌더의 Template(코너를 쌓는 판)을 다른 이름으로 구분하면 헷갈리지 않아요.</span></div></li>
    <li><span class="mk">4</span><div><b>프로모션 빌더와 코너 유형의 관계</b><span>코너 유형 관리에 프로모션 탭(14종)이 있어요. 프로모션 빌더도 같은 코너 유형을 불러온다면 연결선이 하나 더 생겨요.</span></div></li>
    <li><span class="mk">5</span><div><b>메뉴 관리를 어느 그룹에 둘지</b><span>전체 메뉴(네비게이션)를 전시 관리에 둘지 운영 관리에 둘지, 전체페이지 관리와 이름이 헷갈리지 않게 어떻게 구분할지 검토 중이에요.</span></div></li>
  </ol>
</section>
`;

function StructureView() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: DIAGRAM_CSS }} />
      <div className="sdg" dangerouslySetInnerHTML={{ __html: DIAGRAM_HTML }} />
    </>
  );
}

// ───────────────────────── IA 탭 ─────────────────────────
type IaItem = { name: string; path?: string; role: string; fields?: string; sub?: string[]; tag?: string };
type IaGroup = { group: string; items: IaItem[] };
const ADMIN_IA: IaGroup[] = [
  { group: '전시 관리', items: [
    { name: '전시화면 관리', path: '/admin/containers', role: '메인·혜택·쇼핑 홈 등 채널 화면을 만드는 전시 빌더. 코너 유형에서 승인된 코너를 불러와 Template에 쌓고(배치·순서), 로그인/세그먼트별 분기와 전시 기간을 설정한다. 개인화(CVM)는 코너별로 제어.', fields: 'Container › Template › Corner › Component' },
    { name: '코너 유형 관리', path: '/admin/corner-types', role: '디자인 시스템에 등록된 컴포넌트와 Composite 컴포넌트로 코너를 구성하고 검수(승인)를 요청. 디자인 시스템에 등록되어 있으면 새로 조합할 수 있고, 없는 컴포넌트·속성은 디자인 시스템에 추가를 요청. 표시 항목·노출 개수·카드 모양 등 쓸 수 있는 속성만 제어하며, 배너형은 배너 캠페인·상품/혜택형은 상품원장에서 소재를 담는다.', fields: '유형·배열·표시 항목·수급(CVM)' },
    { name: '배너 캠페인 관리', path: '/admin/banner-campaigns', role: '어드민이 소유하는 배너 원장(SSOT). 규격별 배너 소재·문구(공통 1벌)·랜딩·전시 기간을 등록하고 승인한다. 코너 배너형은 여기 등록된 배너만 불러와 사용.', fields: '소재·문구·랜딩·기간·승인' },
    { name: '문구 관리', path: '/admin/messages', role: '코너 타이틀을 편집하고, 배너 문구는 현황만 조회(소유는 배너 캠페인). 세그먼트별 문구 베리에이션은 빌더에서 설정.', fields: '코너 타이틀 · 배너 문구(읽기전용)', tag: '테스트' },
  ]},
  { group: '프로모션 관리', items: [
    { name: '프로모션 관리', path: '/admin/events', role: '이벤트 전용 빌더(전시/관리와 별개). 참여 조건·지급 조건을 조합해 이벤트를 구성하고 자체적으로 전시·승인한다.', fields: '참여·지급 조건' },
  ]},
  { group: '운영 관리', items: [
    { name: '댓글·리뷰 관리', path: '/admin/comments', role: '댓글 관리(이벤트 쪽)와 리뷰 관리(상품 쪽)에 흩어져 있던 기능을 운영 관리로 통합해 관리할 예정. 댓글/리뷰 조회·노출 통제·답글, 신고 접수와 사용자 차단을 한 곳에서.', fields: '노출여부·답변·신고·차단', tag: '통합 예정' },
    { name: 'App 스플래시 관리', path: '/admin/app-splash', role: '앱 실행 시 노출되는 스플래시(런칭) 화면을 OS·기간별로 등록하고 승인·배포한다.', fields: 'OS·적용상태·승인' },
    { name: 'App 버전 관리', path: '/admin/app-versions', role: '앱 버전과 업데이트 정책(권장/강제 업데이트)·안내 팝업을 관리한다.', fields: '권장/강제 업데이트·팝업' },
    { name: 'App 위젯 관리', path: '/admin/app-widgets', role: '홈/잠금 등 앱 위젯의 노출·순서·게시 기간을 관리. 위젯의 틀은 위젯 유형 관리에서 정의.', fields: '게시상태·배포·노출순서', sub: ['위젯 유형 관리'] },
    { name: '전체 페이지·메뉴 관리', path: '/admin/page-menu-b', role: '채널의 전체 페이지(=Container) 원장·IA 트리와 고객 메뉴(네비게이션) 트리를 한 곳에서 관리(메뉴 관리 + 전체페이지 관리 통합). 페이지는 템플릿이 아니라 Container 단위로 등록·상태·사용여부·Front 노출·운영 채널·상위-하위 트리를 관리하고, 메뉴는 pageCode로 페이지(Container)와 연결한다.', fields: 'Container 단위 · status·사용여부·Front·채널·pageCode·IA 트리', tag: 'B안' },
    { name: '페이지 개발 설정', path: '/admin/page-dev', role: '페이지(Container)별 개발·배포 설정 — 페이지 코드·렌더링·연동 등 개발 반영에 필요한 설정을 관리한다.', fields: '페이지 코드·개발 설정' },
  ]},
];

function IaView() {
  return (
    <div className="flex flex-col gap-5">
      <section>
        <h2 className="mb-1 flex items-center gap-2 text-[15px] font-extrabold text-slate-900"><span className="inline-block h-[14px] w-[4px] rounded-sm bg-[#3616cd]" />관리 메뉴 IA</h2>
        <p className="mb-3 text-[13px] font-medium text-slate-600">어드민(BO) 메뉴 구조 — 그룹별 메뉴와 역할·주요 항목. 메뉴명을 누르면 이동합니다.</p>
        <div className="flex flex-col gap-4">
          {ADMIN_IA.map((g) => (
            <div key={g.group} className="rounded-xl border border-[#e8ebef] bg-white">
              <div className="border-b border-[#e8ebef] bg-[#f0f2f4] px-4 py-2.5 text-[13px] font-bold text-slate-700">{g.group}</div>
              <ul className="divide-y divide-[#eef0f3]">
                {g.items.map((it) => (
                  <li key={it.name} className="flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:items-start sm:gap-4">
                    <div className="sm:w-52 sm:shrink-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {it.path ? (
                          <Link href={it.path} className="text-[14px] font-bold text-[#3616cd] hover:underline">{it.name}</Link>
                        ) : <span className="text-[14px] font-bold text-slate-900">{it.name}</span>}
                        {it.tag && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">{it.tag}</span>}
                      </div>
                      {it.sub && <div className="mt-1 flex flex-wrap gap-1">{it.sub.map((s) => <span key={s} className="rounded-md bg-[#f0f2f4] px-1.5 py-0.5 text-[11px] font-medium text-slate-600">+ {s}</span>)}</div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium leading-relaxed text-slate-700">{it.role}</p>
                      {it.fields && <p className="mt-1 font-mono text-[11.5px] font-medium text-[#3616cd]">{it.fields}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-1 flex items-center gap-2 text-[15px] font-extrabold text-slate-900"><span className="inline-block h-[14px] w-[4px] rounded-sm bg-[#3616cd]" />전시 데이터 계층</h2>
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
              <div className="rounded-lg border border-[#e8ebef] bg-white px-3 py-2">
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
//  "누가 무엇을 정하나"를 한 판 정리. 근거: CLAUDE.md(5단 계층·Container) · 거버넌스(코너 유형=정의, 빌더=쌓기+CVM) ·
//   순서 베리에이션 1안(기본 1벌 + CVM 런타임 재정렬).
function GovCard({ no, title, lead, children }: { no: string; title: string; lead: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#e8ebef] bg-white">
      <div className="flex items-center gap-2 border-b border-[#e8ebef] bg-[#f0f2f4] px-4 py-3">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#3616cd] text-[12px] font-bold text-white">{no}</span>
        <h3 className="text-[14.5px] font-extrabold text-slate-900">{title}</h3>
      </div>
      <div className="px-4 py-3.5">
        <p className="mb-3 rounded-lg bg-[#f6f4ff] px-3 py-2 text-[13px] font-semibold leading-relaxed text-[#3616cd]">결론 · {lead}</p>
        {children}
      </div>
    </section>
  );
}
function GovRole({ who, what, tone = 'slate' }: { who: string; what: React.ReactNode; tone?: 'slate' | 'violet' | 'amber' }) {
  const tones = { slate: 'border-slate-200 bg-slate-50 text-slate-600', violet: 'border-violet-200 bg-violet-50 text-violet-700', amber: 'border-amber-200 bg-amber-50 text-amber-700' } as const;
  return (
    <li className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
      <span className={cn('inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11.5px] font-bold sm:w-36', tones[tone])}>{who}</span>
      <span className="min-w-0 flex-1 text-[13px] leading-relaxed text-slate-700">{what}</span>
    </li>
  );
}
function GovernanceView() {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-[13px] font-medium leading-relaxed text-slate-600">
        전시/관리 운영에서 <b className="text-slate-800">“누가 무엇을 정하나”</b>를 한 판으로 정리했어요. 공통 원칙은
        <b className="text-[#3616cd]"> 코너 유형 = 정의 · 전시화면 관리(빌더) = 쌓기 + CVM · CVM = 런타임 개인화</b> 입니다.
      </p>

      {/* ① 노출 순서 */}
      <GovCard no="①" title="노출 순서는 누가 정하나 — 코너 유형 vs 빌더 vs CVM" lead="‘기본(폴백) 순서’는 운영자가, ‘실제 노출 순서’는 CVM이 정한다. 운영자 몫은 코너 유형(정렬 기준 기본값)과 빌더(배치·수급 선택·운영자 편성 순서)로 나뉜다.">
        <ul className="space-y-2.5">
          <GovRole who="코너 유형" tone="slate" what={<><b>정렬 기준의 기본값</b>(인기순·최신순 등)과 수급 방식 기본값을 <b>정의</b>해요. “무엇을 어떤 기준으로 보여줄지”의 틀.</>} />
          <GovRole who="전시화면 관리(빌더)" tone="violet" what={<>코너를 <b>쌓고(배치 순서·위치 고정)</b>, 코너별로 <b>수급 방식을 최종 선택</b>(CVM 기반 / 운영자 편성)해요. <b>운영자 편성</b>일 때만 순서를 직접 편성(= 폴백).</>} />
          <GovRole who="CVM (런타임)" tone="amber" what={<>수급이 <b>CVM 기반</b>이면 고객 세그먼트·인텐트로 <b>실제 노출 순서를 고객마다 결정</b>해요. 어드민은 직접 관리하지 않고, 미리보기는 <b>폴백(첫 후보)</b>만 보여줘요.</>} />
        </ul>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-[12.5px]">
            <thead>
              <tr className="bg-[#f0f2f4] text-slate-600">
                <th className="border border-[#e8ebef] px-2.5 py-2 text-left font-bold">순서의 종류</th>
                <th className="border border-[#e8ebef] px-2.5 py-2 text-left font-bold">기본(폴백) — 운영자</th>
                <th className="border border-[#e8ebef] px-2.5 py-2 text-left font-bold">실제 — CVM(런타임)</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              <tr>
                <td className="border border-[#e8ebef] px-2.5 py-2 font-semibold">코너 안 아이템 순서<br /><span className="font-normal text-slate-400">(상품·혜택 정렬)</span></td>
                <td className="border border-[#e8ebef] px-2.5 py-2">정렬 기준 기본값 = <b>코너 유형</b> · 운영자 편성 시 코너별 순서 = <b>빌더</b></td>
                <td className="border border-[#e8ebef] px-2.5 py-2">CVM 기반이면 CVM이 순위 산정 (빌더에선 선택 불가)</td>
              </tr>
              <tr>
                <td className="border border-[#e8ebef] px-2.5 py-2 font-semibold">템플릿 안 코너 순서<br /><span className="font-normal text-slate-400">(코너 배치)</span></td>
                <td className="border border-[#e8ebef] px-2.5 py-2">운영자 기본 배치 = <b>빌더</b> (위치 고정 코너는 상단 잠금)</td>
                <td className="border border-[#e8ebef] px-2.5 py-2">비고정 코너를 세그먼트별로 자동 재정렬 (고정 코너는 불변)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11.5px] leading-relaxed text-slate-400">근거: 코너 유형=정의 / 빌더=쌓기+CVM · 순서 베리에이션 1안(기본 1벌 + CVM 런타임 재정렬). 즉 <b className="text-slate-500">“CVM이 순서를 정한다”는 어드민의 어느 메뉴가 아니라 런타임</b>이고, 운영자는 그 <b className="text-slate-500">폴백</b>만 짭니다.</p>
      </GovCard>

      {/* ② 컨테이너 단위 관리 */}
      <GovCard no="②" title="페이지(화면)는 템플릿이 아니라 ‘컨테이너’ 단위로 관리" lead="전체 페이지·메뉴 관리는 Container(화면/페이지) 단위로 관리한다. 템플릿은 그 화면의 분기·기간 버전이라 빌더가 다룬다.">
        <ul className="space-y-2.5">
          <GovRole who="전체 페이지·메뉴 관리" tone="violet" what={<><b>Container(페이지) 단위</b>로 등록·URL/상태·사용여부·Front 노출·운영 채널·상위-하위 IA 트리를 관리하고, 메뉴는 <span className="font-mono text-[11.5px]">pageCode</span>로 페이지(Container)와 연결해요. (메뉴 관리 + 전체페이지 관리 통합)</>} />
          <GovRole who="전시화면 관리(빌더)" tone="slate" what={<>Container <b>안의 Template·Corner 구성</b>(분기·기간·배치)을 다뤄요. 페이지·메뉴 관리는 템플릿을 직접 나열하지 않아요.</>} />
          <GovRole who="런타임" tone="amber" what={<>로그인/세그먼트/기간 <b>분기 조건</b>으로 Container 안의 <b>어느 Template을 보일지</b> 결정해요.</>} />
        </ul>
        <div className="mt-3 rounded-lg border border-[#e8ebef] bg-[#f9fafc] px-3.5 py-3 text-[12.5px] leading-relaxed text-slate-600">
          <p className="mb-1.5 font-bold text-slate-700">왜 컨테이너 단위인가?</p>
          <p>Container는 <b>채널이 호출하는 화면 ID</b>(화면과 <b>1:1</b>)예요. Template은 그 화면의 <b>분기·기간 버전</b>이라 하나의 Container에 <b>여러 개(1:N)</b>가 달려요. 페이지·메뉴는 “어떤 화면을 부를지”만 알면 되니 <b className="text-[#3616cd]">Container 단위</b>로 관리하고, 그 안에서 어떤 Template을 보일지는 <b>빌더·런타임</b>이 조건으로 결정해요.</p>
          <p className="mt-1.5 text-slate-500">Container는 삭제하지 않고 <b>상태값(active/inactive)</b>으로 soft-delete, <b>기본 Template 1개</b>를 반드시 가져요.</p>
        </div>
        <p className="mt-2 text-[11.5px] text-slate-400">근거: CLAUDE.md §2.5 Container — 채널에 실제 나가는 화면/영역 단위 · 화면과 1:1 · Template과 1:N · 상태값 관리 · 기본 Template 1개.</p>
      </GovCard>
    </div>
  );
}

// ───────────────────────── 탭 셸 ─────────────────────────
export function StructureTabs() {
  const [tab, setTab] = useState<'map' | 'ia' | 'gov'>('map');
  return (
    <div>
      <div className="mb-5 flex gap-1 border-b border-[#e8ebef]">
        {([['map', '구조도'], ['ia', 'IA'], ['gov', '거버넌스']] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            className={cn('-mb-px border-b-2 px-4 py-2.5 text-[14px] font-semibold', tab === k ? 'border-[#3616cd] text-[#3616cd]' : 'border-transparent text-slate-500 hover:text-slate-700')}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'map' ? <StructureView /> : tab === 'ia' ? <IaView /> : <GovernanceView />}
    </div>
  );
}
