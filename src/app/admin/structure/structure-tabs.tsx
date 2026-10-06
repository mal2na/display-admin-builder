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
  <p class="thesis"><b>코너 유형 관리</b>에서는 코너 유형을 <b>껍데기(규격·레이아웃·API)</b>로만 정의하고 승인해요. 콘텐츠는 담지 않아요.<br/>빌더(전시화면 관리)에서 승인된 코너 유형을 <b>Container › Template › Corner</b>로 쌓고, <b>상품·배너·문구·노출 개수(콘텐츠)</b>를 코너에 매핑해요.<br/>고객은 <b>전체페이지 관리</b>의 전체 메뉴(네비게이션)로 진입하고, <b>CVM</b>(점선)은 런타임에 고객마다 콘텐츠를 택1해요.<br/>승인된 화면은 개발이 반영해 <b>고객 앱/웹(F/O)</b>에 전시돼요.</p>
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
<text class="tm t3" x="208" y="268">코너 유형(껍데기·규격·레이아웃) 정의, 승인</text>
<text class="tm t3" x="208" y="286">업무진입, 상품, 배너 …  (콘텐츠는 담지 않음)</text>
<rect class="opt-tag" x="500" y="254" width="44" height="20" rx="10"/><text class="tm t4" x="522" y="268" text-anchor="middle">선택</text>
<text class="tm t3" x="554" y="268">CVM 켜기 옵션 (택1은 런타임)</text>

<rect class="bx" x="790" y="200" width="118" height="52" rx="8"/>
<text class="tx t2" x="806" y="224">문구 관리</text>
<text class="tm t4" x="806" y="243">코너 타이틀 원천</text>

<rect class="bx" x="920" y="212" width="180" height="96" rx="8"/>
<text class="tx t2" x="938" y="244">배너 캠페인 관리</text>
<text class="tm t3" x="938" y="268">규격별 배너 소재 Asset</text>
<text class="tm t3" x="938" y="286">기간, 랜딩, 승인</text>

<text class="tx tier" x="44" y="372">운영 IA</text>
<text class="tm t3" x="44" y="394">화면 진입, 페이지 구조</text>

<rect class="bx" x="500" y="342" width="390" height="86" rx="8"/>
<text class="tx t2" x="518" y="370">전체페이지 관리</text>
<text class="tm t3" x="518" y="392">페이지(Container) 원장 · IA 트리 · 전체 메뉴(네비게이션)</text>
<text class="tm t4" x="518" y="412">상태 · 사용여부 · Front 노출 · 채널 · 개발설정(상세 탭)</text>

<rect class="bx-main" x="40" y="452" width="1180" height="306" rx="12"/>
<text class="ta t1" x="60" y="482">전시/관리</text>
<text class="tm t3" x="350" y="481">화면을 만들고, 만든 화면을 관리</text>

<rect class="bx-build" x="56" y="498" width="1148" height="146" rx="10"/>
<text class="tx t2" x="74" y="524">신규 화면 빌더</text>
<text class="tm t4" x="196" y="523">화면 구성 위계 (왼쪽이 상위)</text>
<rect class="bx-main" x="566" y="508" width="628" height="26" rx="13"/>
<text class="ta t4" x="880" y="524" text-anchor="middle" style="font-weight:700">여기가 합류 지점 — 껍데기(코너 유형) ＋ 콘텐츠(상품·배너·문구)를 합쳐 화면 완성</text>

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
<text class="ta t3" x="530" y="566" style="font-weight:700">껍데기 ＋ 콘텐츠 = 여기서 합쳐짐</text>
<text class="tm t4" x="530" y="586">껍데기=코너 유형 · 콘텐츠=상품·배너·문구</text>
<rect class="bx" x="456" y="602" width="90" height="20" rx="10"/><text class="tx t4" x="501" y="616" text-anchor="middle">콘텐츠 매핑</text>
<rect class="chip-opt" x="552" y="602" width="72" height="20" rx="10"/><text class="tm t4" x="588" y="616" text-anchor="middle">A 가로형</text>
<rect class="chip-opt" x="630" y="602" width="60" height="20" rx="10"/><text class="tm t4" x="660" y="616" text-anchor="middle">B 탭형</text>
<text class="tm t4" x="700" y="616">택1 CVM</text>
<text class="tm t3" x="840" y="568">문구·노출 타입 베리에이션도 빌더에서 등록</text>
<text class="tm t4" x="840" y="592">실제 택1은 CVM이 고객마다 런타임 수행</text>

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
<path class="ar-a" d="M296 308V538" marker-end="url(#ma)"/>
<circle class="num" cx="296" cy="326" r="10"/><text class="numt" x="296" y="330" text-anchor="middle">2</text>
<text class="ta t4 flbl" x="312" y="330">승인 코너 유형(껍데기) → Template에 쌓기</text>
<path class="ar" d="M470 140V158H158V460H480V540" marker-end="url(#m)"/>
<circle class="num" cx="158" cy="360" r="10"/><text class="numt" x="158" y="364" text-anchor="middle">3</text>
<text class="tm t4 flbl" x="172" y="364">상품 매핑</text>
<path class="ar" d="M849 252V300H905V538" marker-end="url(#m)"/>
<circle class="num" cx="905" cy="430" r="10"/><text class="numt" x="905" y="434" text-anchor="middle">3</text>
<text class="tm t4 flbl" x="921" y="434">문구 매핑</text>
<path class="ar" d="M1010 308V538" marker-end="url(#m)"/>
<circle class="num" cx="1010" cy="430" r="10"/><text class="numt" x="1010" y="434" text-anchor="middle">3</text>
<text class="tm t4 flbl" x="1026" y="434">배너 매핑</text>
<path class="ar-opt" d="M1040 92H745V208" marker-end="url(#m)"/>
<circle class="num" cx="745" cy="173" r="10"/><text class="numt" x="745" y="177" text-anchor="middle">4</text>
<text class="tm t4 flbl" x="761" y="177">(선택) CVM 옵션 켜기</text>
<path class="ar-opt" d="M1130 140V440H344V538" marker-end="url(#m)"/>
<circle class="num" cx="1130" cy="300" r="10"/><text class="numt" x="1130" y="304" text-anchor="middle">4</text>
<text class="tm t4 flbl" x="1146" y="296">(선택) 런타임</text>
<text class="tm t4 flbl" x="1146" y="312">CVM 택1</text>
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
    <div class="tcard adm"><span class="own">어드민 구성</span><h4>Corner</h4><p>코너 유형(껍데기)을 올린 화면의 한 영역. 상품·배너·문구 같은 콘텐츠는 빌더에서 코너에 매핑해요.</p></div>
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
    <li class="card"><span class="n">2</span><b>껍데기 정의, 승인</b><span>코너 유형을 껍데기(규격·레이아웃·API)로만 정의하고 승인해요. 상품·배너·문구 같은 콘텐츠는 여기서 담지 않아요.</span></li>
    <li class="card"><span class="n">3</span><b>쌓기, 콘텐츠 매핑</b><span>승인된 코너 유형(껍데기)을 빌더에서 Template에 Corner로 쌓고(Container › Template › Corner), 상품·배너·문구·노출 개수(콘텐츠)를 코너에 매핑해요.</span></li>
    <li class="card"><span class="n">4</span><b>CVM (선택)</b><span>코너 유형에서 CVM을 켜면, 런타임에 CVM이 고객마다 콘텐츠(와 베리에이션)를 택1해요. 코너 배치 순서는 운영자가 빌더에서 설정해요.</span></li>
    <li class="card"><span class="n">5</span><b>관리</b><span>저장한 화면은 기존 화면 관리에서 운영하고, 수정할 땐 빌더로 진입</span></li>
    <li class="card"><span class="n">6</span><b>배포, 전시</b><span>승인된 화면을 개발이 반영해 고객 앱/웹(F/O)에 전시해요. 어드민 변경은 즉시 배포되지 않아요.</span></li>
  </ol>
</section>

<section>
  <h2>진입, IA</h2>
  <ol class="steps">
    <li class="card"><span class="n">A</span><b>전체페이지 관리</b><span>서비스의 모든 페이지(Container) 원장과 IA 트리(상태·사용여부·Front 노출·채널)를 관리하고, 고객이 보는 전체 메뉴(네비게이션)도 여기서 함께 연결해요. 별도 '메뉴 관리' 메뉴는 없어요.</span></li>
    <li class="card"><span class="n">B</span><b>페이지 유형 · 빌더 연동</b><span>페이지 유형은 빌더 화면/개발 화면/외부 화면. 「빌더 화면」은 화면 빌더가 이 페이지를 불러와 1:1로 연결하고, URL·메타태그는 전체페이지에서만 입력해요. 페이지별 개발설정은 상세의 '개발설정' 탭이에요.</span></li>
  </ol>
</section>

<section class="card">
  <h2 style="padding:16px 18px 0;margin:0">확인할 점</h2>
  <ol class="checks">
    <li><span class="mk">1</span><div><b>CVM이 코너 순서까지 개인화하는지 미확정</b><span>지금 구조는 코너 배치 순서를 운영자가 빌더에서 설정하고, CVM은 코너 안 콘텐츠만 개인화해요. 코너 순서 개인화는 스크럼 쟁점으로 남아 있어요(10월 7일 CVM 미팅).</span></div></li>
    <li><span class="mk">2</span><div><b>CVM 켜기가 유형 단위예요</b><span>코너 유형에서 CVM을 켜면 같은 유형을 쓰는 모든 코너에 옵션이 켜져요. 콘텐츠·베리에이션은 빌더에서 코너별로 등록하니, 화면·코너별로 CVM을 끄고 켜야 하는 경우가 있는지 확인이 필요해요.</span></div></li>
    <li><span class="mk">3</span><div><b>'템플릿'이라는 이름이 두 곳에 있어요</b><span>디자인 시스템의 원천 템플릿과 빌더의 Template(코너를 쌓는 판)을 다른 이름으로 구분하면 헷갈리지 않아요.</span></div></li>
    <li><span class="mk">4</span><div><b>프로모션 빌더와 코너 유형의 관계</b><span>코너 유형 관리에 프로모션 탭(14종)이 있어요. 프로모션 빌더도 같은 코너 유형을 불러온다면 연결선이 하나 더 생겨요.</span></div></li>
    <li><span class="mk">5</span><div><b>메뉴 관리는 전체페이지 관리로 통합됐어요</b><span>별도 '메뉴 관리'·'페이지 개발 설정' 메뉴는 없애고, 메뉴(네비게이션)·IA·개발설정을 모두 전체페이지 관리(와 페이지 상세 탭)로 흡수했어요. 남은 확인점은 「빌더 화면」 유형의 메뉴 노출을 전체페이지와 빌더 중 어디서 켜는지예요.</span></div></li>
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
type IaItem = { name: string; path?: string; role: string; fields?: string; sub?: string[]; tag?: string; review?: boolean };
type IaGroup = { group: string; items: IaItem[] };
const ADMIN_IA: IaGroup[] = [
  { group: '전시 관리', items: [
    { name: '전시화면 관리', path: '/admin/containers', role: '메인·혜택·쇼핑 홈 등 채널 화면을 만드는 전시 빌더. 코너 유형에서 승인된 코너를 불러와 Template에 쌓고(배치·순서), 로그인/세그먼트별 분기와 전시 기간을 설정한다. 개인화(CVM)는 코너별로 제어.', fields: 'Container › Template › Corner › Component' },
    { name: '코너 유형 관리', path: '/admin/corner-types', role: '디자인 시스템에 등록된 컴포넌트와 Composite 컴포넌트로 코너를 구성하고 검수(승인)를 요청. 디자인 시스템에 등록되어 있으면 새로 조합할 수 있고, 없는 컴포넌트·속성은 디자인 시스템에 추가를 요청. 표시 항목·노출 개수·카드 모양 등 쓸 수 있는 속성만 제어하며, 배너형은 배너 캠페인·상품/혜택형은 상품원장에서 소재를 담는다.', fields: '유형·배열·표시 항목·수급(CVM)' },
    { name: '배너 캠페인 관리', path: '/admin/banner-campaigns', role: '어드민이 소유하는 배너 원장(SSOT). 규격별 배너 소재·문구(공통 1벌)·랜딩·전시 기간을 등록하고 승인한다. 코너 배너형은 여기 등록된 배너만 불러와 사용.', fields: '소재·문구·랜딩·기간·승인', review: true },
    { name: '문구 관리', path: '/admin/messages', role: '코너 타이틀을 편집하고, 배너 문구는 현황만 조회(소유는 배너 캠페인). 세그먼트별 문구 베리에이션은 빌더에서 설정.', fields: '코너 타이틀 · 배너 문구(읽기전용)', tag: '테스트' },
  ]},
  { group: '프로모션 관리', items: [
    { name: '프로모션 관리', path: '/admin/events', role: '이벤트 전용 빌더(전시/관리와 별개). 참여 조건·지급 조건을 조합해 이벤트를 구성하고 자체적으로 전시·승인한다.', fields: '참여·지급 조건' },
  ]},
  { group: '운영 관리', items: [
    { name: '댓글·리뷰 관리', path: '/admin/comments', role: '댓글 관리(이벤트 쪽)와 리뷰 관리(상품 쪽)에 흩어져 있던 기능을 운영 관리로 통합해 관리할 예정. 댓글/리뷰 조회·노출 통제·답글, 신고 접수와 사용자 차단을 한 곳에서.', fields: '노출여부·답변·신고·차단', tag: '통합 예정', review: true },
    { name: 'App 스플래시 관리', path: '/admin/app-splash', role: '앱 실행 시 노출되는 스플래시(런칭) 화면을 OS·기간별로 등록하고 승인·배포한다.', fields: 'OS·적용상태·승인', review: true },
    { name: 'App 버전 관리', path: '/admin/app-versions', role: '앱 버전과 업데이트 정책(권장/강제 업데이트)·안내 팝업을 관리한다.', fields: '권장/강제 업데이트·팝업', review: true },
    { name: 'App 위젯 관리', path: '/admin/app-widgets', role: '홈/잠금 등 앱 위젯의 노출·순서·게시 기간을 관리. 위젯의 틀은 위젯 유형 관리에서 정의.', fields: '게시상태·배포·노출순서', sub: ['위젯 유형 관리'] },
    { name: '전체페이지 관리', path: '/admin/page-menu-b', role: '채널의 전체 페이지(=Container) 원장·IA 트리를 관리. 페이지는 템플릿이 아니라 Container 단위로 등록·상태·사용여부·Front 노출·운영 채널·상위-하위 트리를 관리한다. 「빌더 화면」 유형 페이지는 화면 빌더가 이 페이지를 불러와 1:1로 연결하고, URL·메타태그는 여기서만 입력한다. 페이지별 개발 설정은 상세의 「개발설정」 탭으로 흡수(별도 메뉴 없음).', fields: 'Container 단위 · 페이지 유형(빌더/개발/외부) · 상태·사용여부·Front·채널·IA 트리', review: true },
  ]},
];

function IaView() {
  // 내일 리뷰 체크 — 각 메뉴 라벨 위에 체크 컬럼. 리뷰 대상(review:true)은 기본 체크.
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
        <h2 className="mb-1 flex items-center gap-2 text-[15px] font-extrabold text-slate-900"><span className="inline-block h-[14px] w-[4px] rounded-sm bg-[#3616cd]" />관리 메뉴 IA</h2>
        <p className="mb-3 flex flex-wrap items-center gap-2 text-[13px] font-medium text-slate-600">
          어드민(BO) 메뉴 구조 — 그룹별 메뉴와 역할·주요 항목. 메뉴명을 누르면 이동합니다.
          <span className="rounded-md bg-[#eceefe] px-2 py-0.5 text-[12px] font-bold text-[#3616cd]">내일 리뷰 {reviewChecked.size}개 체크</span>
        </p>
        <div className="flex flex-col gap-4">
          {ADMIN_IA.map((g) => (
            <div key={g.group} className="rounded-xl border border-[#e8ebef] bg-white">
              <div className="border-b border-[#e8ebef] bg-[#f0f2f4] px-4 py-2.5 text-[13px] font-bold text-slate-700">{g.group}</div>
              <ul className="divide-y divide-[#eef0f3]">
                {g.items.map((it) => {
                  const checked = reviewChecked.has(it.name);
                  return (
                  <li key={it.name} className={cn('flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:items-start sm:gap-4', checked && 'bg-[#f6f7ff]')}>
                    <div className="sm:w-52 sm:shrink-0">
                      <label className={cn('mb-1.5 inline-flex cursor-pointer select-none items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-bold', checked ? 'border-[#3616cd] bg-[#eceefe] text-[#3616cd]' : 'border-[#e0e3ea] bg-white text-slate-400')}>
                        <input type="checkbox" checked={checked} onChange={() => toggleReview(it.name)} className="h-3 w-3 accent-[#3616cd]" />
                        내일 리뷰
                      </label>
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
                  );
                })}
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
//  "누가 무엇을 정하나"를 한눈에. 색은 회색 + 포인트 1색(#3616cd)만. 근거: CLAUDE.md(Container) · 순서 1안.
function GovQ({ no, q, answer, children }: { no: number; q: string; answer: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#e8ebef] bg-white p-5">
      <p className="mb-1 text-[12px] font-bold text-[#3616cd]">Q{no}</p>
      <h3 className="mb-3 text-[16px] font-extrabold leading-snug text-slate-900">{q}</h3>
      <p className="mb-4 border-l-[3px] border-[#3616cd] pl-3 text-[14px] font-bold leading-relaxed text-slate-800">{answer}</p>
      {children}
    </section>
  );
}
// 담당 → 역할 한 줄 (단색).
function GovRow({ who, what, strong }: { who: string; what: React.ReactNode; strong?: boolean }) {
  return (
    <div className={cn('grid grid-cols-[112px_1fr] gap-3 border-t border-[#eef0f3] py-2.5 first:border-t-0', strong && 'bg-[#f6f4ff]/60')}>
      <span className="text-[13px] font-bold text-slate-900">{who}</span>
      <span className="text-[13px] leading-relaxed text-slate-600">{what}</span>
    </div>
  );
}
function GovernanceView() {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-[13px] leading-relaxed text-slate-500">
        운영에서 <b className="text-slate-800">“누가 무엇을 정하나”</b>를 한눈에. 원칙은 딱 하나 —
        <b className="text-[#3616cd]"> 코너는 껍데기(규격), 콘텐츠는 빌더에서, 고객마다 실제는 CVM.</b>
      </p>

      {/* Q1 — 코너는 껍데기 */}
      <GovQ no={1} q="코너에 콘텐츠를 미리 넣나요? 빌더에서 넣나요?"
        answer={<>코너 유형은 <u>껍데기(규격)만</u>. 콘텐츠(상품·배너·문구·개수·이름)는 <u>빌더(전시화면 관리)에서</u> 매핑해요.</>}>
        <div className="rounded-lg border border-[#e8ebef]">
          <GovRow who="코너 유형" what={<>DS 포털 <b>껍데기</b>를 등록(배열·레이아웃·어떤 API를 쓰는지). <b>콘텐츠는 없음</b>.</>} />
          <GovRow who="빌더(전시화면)" what={<>코너를 쌓고 <b>이름·텍스트·노출 개수·상품/배너·수급 방식</b>(직접 지정 / 조건 / CVM)을 설정. 미리보기 즉시.</>} strong />
          <GovRow who="DS 포털" what={<><b>Atom·Component</b>를 소유. 코너·템플릿·컨테이너는 어드민이 구성.</>} />
        </div>
        <p className="mt-3 text-[12.5px] leading-relaxed text-slate-500">
          왜냐면 — 같은 배너 코너라도 <b className="text-slate-700">A페이지=S18, B페이지=iPhone</b>이면, 콘텐츠를 코너에 박아두면 코너를 매번 새로 만들어야 해요. <b className="text-slate-700">껍데기 1개 + 페이지별 콘텐츠</b>가 효율적(T우주 방식). 그래서 <b className="text-[#3616cd]">코너 불러오기는 데이터 없는 가이드</b>로 와요.
        </p>
      </GovQ>

      {/* Q1b — 노출 순서 */}
      <GovQ no={2} q="노출 순서는 누가 정해요?"
        answer={<><u>기본 순서는 빌더(운영자)</u>가, <u>실제 순서는 CVM이 고객마다</u> 정해요.</>}>
        <div className="rounded-lg border border-[#e8ebef]">
          <GovRow who="빌더(전시화면)" what={<>코너 <b>배치 순서·위치 고정</b> + 운영자 편성이면 상품·혜택 <b>순서를 직접</b>.</>} />
          <GovRow who="CVM (자동)" what={<>수급이 CVM이면 <b>실제 순서를 고객마다</b> 정해요(비고정 코너를 세그먼트별 재정렬). 미리보기는 기본만.</>} strong />
        </div>
      </GovQ>

      {/* Q3 — 컨테이너 단위 */}
      <GovQ no={3} q="전체 페이지 관리는 왜 ‘컨테이너’ 단위예요? 템플릿 단위로 하면 안 돼요?"
        answer={<>페이지는 <u>‘컨테이너(화면 1개)’ 단위로만</u> 관리해요. 템플릿 단위로는 <u>관리하면 안 돼요.</u></>}>
        <div className="rounded-lg border border-[#e8ebef] bg-[#f9fafc] p-4">
          <p className="mb-2 text-[13px] font-bold text-slate-800">쉽게 — 집 주소와 인테리어처럼</p>
          <p className="text-[13px] leading-relaxed text-slate-600">
            <b>컨테이너 = 집 주소</b>(화면 1개, 하나뿐). <b>템플릿 = 그 집의 상황별 인테리어</b>(로그인/세그먼트/기간마다 다른 버전, 여러 개).<br />
            메뉴·URL은 <b>주소(컨테이너)로만</b> 보내요. 그날 어떤 인테리어(템플릿)를 보여줄지는 <b>들어온 뒤 상황 보고(런타임)</b> 정해요.
          </p>
        </div>
        <p className="mb-2 mt-4 text-[13px] font-bold text-slate-800">템플릿 단위로 관리하면 생기는 문제</p>
        <ul className="space-y-1.5 text-[13px] leading-relaxed text-slate-600">
          <li className="flex gap-2"><span className="text-slate-400">·</span><span>한 페이지가 <b>여러 줄</b>로 쪼개져요(로그인용·비로그인용·기간용…). 목록이 금세 지저분해져요.</span></li>
          <li className="flex gap-2"><span className="text-slate-400">·</span><span>메뉴·URL이 <b>어느 템플릿을 가리켜야 할지</b> 애매해져요. 메뉴는 ‘화면’을 부르지 ‘그날의 버전’을 부르지 않아요.</span></li>
          <li className="flex gap-2"><span className="text-slate-400">·</span><span>“어떤 페이지가 있나(목록·IA)”와 “어떻게 달라지나(분기 로직)”가 <b>뒤섞여요</b>.</span></li>
        </ul>
        <div className="mt-4 rounded-lg border border-[#e8ebef]">
          <GovRow who="전체페이지 관리" what={<><b>컨테이너(페이지)</b>를 등록·상태·IA 트리·전체 메뉴(네비게이션) 연결. 메뉴 관리·페이지 개발 설정을 모두 흡수.</>} />
          <GovRow who="빌더(전시화면)" what={<>그 컨테이너 <b>안의 템플릿·코너</b>(분기·기간·배치)를 다뤄요.</>} />
        </div>
      </GovQ>

      {/* Q4 — 베리에이션 */}
      <GovQ no={4} q="문구·노출 타입 ‘베리에이션’은 누가 등록해요?"
        answer={<><u>빌더에서 후보를 등록</u>하고(콘텐츠니까), <u>그중 하나를 CVM이 고객마다</u> 골라요.</>}>
        <div className="rounded-lg border border-[#e8ebef]">
          <GovRow who="빌더(전시화면)" what={<>각 컴포넌트의 <b>문구 베리에이션</b>(타겟별 대체 문구)과 <b>노출 타입 베리에이션</b>(코너 유형 카탈로그에서 골라 2~3개 조합)을 등록.</>} />
          <GovRow who="CVM (자동)" what={<>고객 세그먼트로 <b>후보 중 하나를 택1</b>(런타임). 미리보기는 기본(첫 후보)만.</>} strong />
        </div>
        <p className="mt-3 text-[12.5px] leading-relaxed text-slate-500">
          원리는 <b className="text-slate-700">“재료는 우리가(빌더에서 등록), 조합은 CVM”</b> — 베리에이션도 콘텐츠라 빌더에서. 노출 타입의 <b>후보 목록</b>은 코너 유형(껍데기)에 등록된 배열·레이아웃에서 골라요.
        </p>
      </GovQ>
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
