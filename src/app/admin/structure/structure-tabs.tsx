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
  <p class="eyebrow">NEXT채널 어드민 · 전시/관리 영역 · 구조도 v0.9</p>
  <p class="thesis"><b>디자인 시스템</b>이 코너 껍데기(원천 템플릿·규격)를 소유하고, 이를 코너 유형으로 등록·승인해요.<br>
빌더에서는 승인된 <b>코너 유형을 가져와</b> Template에 쌓고, Corner에서 내용을 수정해요.<br>
<b>상품</b>(EPC+전시상품 정보 · BSS·상품전시 어드민)과 <b>배너</b>(배너 캠페인 관리)는 빌더의 Corner로 바로 불러와요.<br>
<b>화면</b>은 전체페이지 관리에서 Container를 등록한 뒤, Container › Template › Corner 순서로 만들어요.<br>
어드민이 관리하는 건 <b>코너·템플릿·컨테이너</b>뿐이에요. 아톰·컴포넌트는 관리하지 않아요.<br>
<b>CVM</b>(점선)은 선택이에요. 개인화 요소(상품·혜택·업무·문구·레이아웃·배치 순서)는 빌더의 Corner에서 적용해요.</p>
</div>

<section class="card diagram" aria-label="전시관리 구조도">
<svg viewBox="0 0 1260 760" role="img" aria-labelledby="dg-t">
<title id="dg-t">외부 시스템, 기준 정보, 전시/관리 세 단으로 나뉜 전시 어드민 구조. 원천 소스를 코너 유형에 맵핑·승인한 뒤 Container에 등록.</title>
<defs>
  <marker id="m" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker>
  <marker id="ma" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker>
</defs>

<!-- ───── 1단: 외부 시스템 ───── -->
<rect class="z-ext" x="20" y="20" width="1220" height="140" rx="12"/>
<text class="tx tier" x="44" y="76">외부 시스템</text>
<text class="tm t3" x="44" y="98">전시 어드민 밖에서</text>
<text class="tm t3" x="44" y="116">재료와 데이터를 제공</text>

<rect class="bx-ext" x="600" y="44" width="180" height="96" rx="8"/>
<text class="tx t2" x="618" y="74">EPC+전시상품 정보</text>
<text class="tm t3" x="618" y="96">BSS·상품전시 어드민에서</text>
<text class="tm t3" x="618" y="114">정보 끌어와서 노출</text>

<!-- 디자인 시스템 — 코너 유형 관리로만 연결(① 원천 템플릿 등록). 코너 껍데기(틀)를 소유. -->
<rect class="bx-ext" x="250" y="44" width="200" height="96" rx="8"/>
<text class="tx t2" x="270" y="76">디자인 시스템</text>
<text class="tm t3" x="270" y="100">코너 껍데기(틀) 소유</text>
<text class="tm t3" x="270" y="118">원천 템플릿 · 규격 · 조합</text>

<rect class="bx-ext" x="1040" y="44" width="180" height="96" rx="8"/>
<text class="tx t2" x="1058" y="76">CVM</text>
<rect class="opt-tag" x="1100" y="62" width="44" height="20" rx="10"/><text class="tm t4" x="1122" y="76" text-anchor="middle">선택</text>
<text class="tm t3" x="1058" y="100">추천 엔진</text>
<text class="tm t3" x="1058" y="118">코너 개인화 · 배치 순서</text>

<!-- 범례: 실선(기본·필수) vs 점선(CVM 선택) -->
<text class="tm t4" x="810" y="58" font-weight="700">범례</text>
<line x1="810" y1="76" x2="844" y2="76" stroke="var(--accent)" stroke-width="2.5"/>
<text class="tm t4" x="852" y="80">실선 = 기본·필수 흐름</text>
<line x1="810" y1="100" x2="844" y2="100" stroke="var(--muted)" stroke-width="2" stroke-dasharray="5 3"/>
<text class="tm t4" x="852" y="104">점선 = CVM(선택) 적용</text>

<!-- ───── 전시 어드민 경계 ───── -->
<rect class="z-adm" x="20" y="186" width="1220" height="556" rx="12"/>
<rect class="lbl-bg" x="36" y="176" width="96" height="20"/>
<text class="ta tier" x="42" y="191">전시 어드민</text>

<!-- 2단: 기준 정보 (라벨 제거, 2026-10-07) -->

<rect class="bx" x="190" y="212" width="250" height="96" rx="8"/>
<text class="tx t2" x="208" y="248">코너 유형 관리</text>
<text class="tm t3" x="208" y="276">코너 유형 승인</text>

<rect class="bx" x="920" y="212" width="180" height="96" rx="8"/>
<text class="tx t2" x="938" y="244">배너 캠페인 관리</text>
<text class="tm t3" x="938" y="268">규격별 배너 소재 Asset</text>
<text class="tm t3" x="938" y="286">기간 · 랜딩 · 승인</text>

<!-- 3단: 전시/관리 -->
<rect class="bx-main" x="40" y="342" width="1180" height="306" rx="12"/>
<text class="ta t1" x="60" y="372">전시/관리</text>

<rect class="bx-build" x="56" y="388" width="1148" height="146" rx="10"/>
<text class="tx t2" x="74" y="412">신규 화면 빌더</text>

<!-- Container(가장 큼) ← Template(중간) ← Corner(두 개로 쪼개짐). 왼쪽이 상위(큰 단위가 작은 단위를 담음) -->
<rect class="bx-lv" x="72" y="422" width="204" height="104" rx="8"/>
<text class="tx t2" x="96" y="456">Container</text>
<text class="tm t3" x="96" y="480">전체페이지 관리에서 등록</text>
<text class="tm t4" x="96" y="502">혜택 홈 · 쇼핑 홈</text>
<!-- Template → Container (담김) -->
<path class="ar-a" d="M296 476H280" marker-end="url(#ma)"/>

<rect class="bx-lv" x="298" y="436" width="166" height="76" rx="8"/>
<text class="tx t2" x="316" y="464">Template</text>
<text class="tm t3" x="316" y="486">코너 쌓기 · 배치 순서</text>
<text class="tm t4" x="316" y="504">로그인 · 비로그인</text>
<!-- Corner → Template (쌓임) -->
<path class="ar-a" d="M482 476H466" marker-end="url(#ma)"/>

<rect class="bx-lv" x="484" y="422" width="704" height="104" rx="8"/>
<rect class="bx" x="500" y="432" width="116" height="38" rx="8"/><text class="tx t2" x="558" y="456" text-anchor="middle">Corner</text>
<rect class="bx" x="500" y="478" width="116" height="38" rx="8"/><text class="tx t2" x="558" y="502" text-anchor="middle">Corner</text>
<text class="tm t3" x="636" y="452">등록된 코너 유형을 불러온 후 빌더에서 컨텐츠 맵핑 · 개인화 설정 등 적용</text>
<rect class="bx" x="636" y="468" width="100" height="20" rx="10"/><text class="tx t4" x="686" y="482" text-anchor="middle">기본 · 어드민 설정</text>
<rect class="chip-opt" x="742" y="468" width="80" height="20" rx="10"/><text class="tm t4" x="782" y="482" text-anchor="middle">A · 가로형</text>
<rect class="chip-opt" x="828" y="468" width="72" height="20" rx="10"/><text class="tm t4" x="864" y="482" text-anchor="middle">B · 탭형</text>
<text class="tm t4" x="908" y="482">선택 · CVM</text>
<text class="tm t4" x="636" y="506">아톰·컴포넌트는 어드민 관리 대상 아님 · 코너·템플릿·컨테이너만 어드민에서 관리</text>

<!-- 빌더 ↔ 관리 -->
<path class="ar-a" d="M300 534V566" marker-end="url(#ma)"/>
<text class="ta t4" x="310" y="556">저장</text>
<path class="ar-a" d="M420 566V536" marker-end="url(#ma)"/>
<text class="ta t4" x="430" y="556">빌더로 수정</text>
<circle class="num" cx="274" cy="550" r="10"/><text class="numt" x="274" y="554" text-anchor="middle">5</text>

<rect class="bx-build" x="56" y="570" width="1148" height="62" rx="10"/>
<text class="tx t2" x="74" y="606">기존 화면 관리</text>
<text class="tm t3" x="190" y="606">화면 목록 · 전시 상태 · 승인 · 미전시 전환 · 폐기 · 버전</text>

<!-- 별도: 프로모션 -->
<rect class="bx-sub" x="40" y="668" width="1180" height="58" rx="10"/>
<text class="tx t2" x="60" y="703">프로모션 관리</text>
<text class="tm t3" x="170" y="703">프로모션 빌더를 전시/관리와 별개로 제공</text>

<!-- ───── 화살표 ───── -->
<!-- ① 디자인 시스템 → 코너 유형 관리 (원천 템플릿 등록) — 직선 -->
<path class="ar-a" d="M350 140V208" marker-end="url(#ma)"/>
<circle class="num" cx="350" cy="174" r="10"/><text class="numt" x="350" y="178" text-anchor="middle">1</text>
<text class="ta t4" x="334" y="178" text-anchor="end">원천 템플릿 등록</text>
<!-- ② 코너 유형 관리 → Template (승인된 코너 유형을 Template에 쌓음) -->
<path class="ar-a" d="M322 308V436" marker-end="url(#ma)"/>
<circle class="num" cx="322" cy="322" r="10"/><text class="numt" x="322" y="326" text-anchor="middle">2</text>
<text class="ta t4" x="306" y="326" text-anchor="end">승인된 코너 유형을 Template에 쌓음</text>
<!-- ③ 코너 유형 관리 → Corner (유형 가져와 내용 수정) — 코너 유형 관리 오른쪽으로 뺀 뒤 하단으로 내림(2026-10-07). -->
<path class="ar-a" d="M440 260H540V422" marker-end="url(#ma)"/>
<circle class="num" cx="540" cy="366" r="10"/><text class="numt" x="540" y="370" text-anchor="middle">3</text>
<text class="ta t4" x="556" y="370" text-anchor="start">유형 가져와 내용 수정</text>
<!-- ③ 상품원장 → Corner (상품 불러오기) — 라벨은 번호 옆 -->
<path class="ar-a" d="M690 140V422" marker-end="url(#ma)"/>
<circle class="num" cx="690" cy="366" r="10"/><text class="numt" x="690" y="370" text-anchor="middle">3</text>
<text class="ta t4" x="706" y="370" text-anchor="start">상품 불러오기</text>
<!-- ③ 배너 캠페인 → Corner (배너 불러오기) — 라벨은 번호 옆 -->
<path class="ar-a" d="M1010 308V422" marker-end="url(#ma)"/>
<circle class="num" cx="1010" cy="366" r="10"/><text class="numt" x="1010" y="370" text-anchor="middle">3</text>
<text class="ta t4" x="1026" y="370" text-anchor="start">배너 불러오기</text>
<!-- ④ CVM → Template (개인화 요소 적용, 선택 · 점선) -->
<path class="ar-opt" d="M1130 140V325H400V436" marker-end="url(#m)"/>
<circle class="num" cx="1130" cy="230" r="10"/><text class="numt" x="1130" y="234" text-anchor="middle">4</text>
<text class="tm t4" x="1146" y="250" font-weight="700">개인화 요소(선택)</text>
<text class="tm t4" x="1146" y="268">· 코너 내 상품·혜택·업무</text>
<text class="tm t4" x="1146" y="284">· 문구</text>
<text class="tm t4" x="1146" y="300">· 코너 레이아웃</text>
<text class="tm t4" x="1146" y="316">· 코너 배치 순서</text>
</svg>
</section>

<section>
  <h2>순서</h2>
  <ol class="steps">
    <li class="card"><span class="n">1</span><b>등록 · 승인</b><span>디자인 시스템이 소유한 코너 껍데기(원천 템플릿·규격)를 코너 유형 관리에 등록하고 승인해요.</span></li>
    <li class="card"><span class="n">2</span><b>Container 등록 · 쌓기</b><span>Container는 전체페이지 관리에서 등록하고, 승인된 코너 유형을 Template에 쌓아 Corner를 구성해요.</span></li>
    <li class="card"><span class="n">3</span><b>빌더에서 가져와 수정</b><span>코너 유형 관리의 승인된 유형을 빌더로 가져와 Corner에서 내용(문구·노출 등)을 수정해요. 상품과 배너는 Corner로 바로 불러와요. 아톰·컴포넌트는 어드민 관리 대상이 아니에요.</span></li>
    <li class="card"><span class="n">4</span><b>CVM 설정 (선택)</b><span>개인화 요소(코너 내 상품·혜택·업무·문구·레이아웃·배치 순서)를 빌더의 Corner에서 적용해요.</span></li>
    <li class="card"><span class="n">5</span><b>관리</b><span>저장한 화면은 기존 화면 관리에서 운영하고, 수정할 땐 빌더로 진입</span></li>
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

function StructureView() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: DIAGRAM_CSS }} />
      <div className="sdg" dangerouslySetInnerHTML={{ __html: DIAGRAM_HTML }} />
    </>
  );
}

// ───────────────────────── IA 탭 ─────────────────────────
type IaItem = { name: string; path?: string; role: string; fields?: string; sub?: string[]; tag?: string; review?: boolean; partial?: boolean };
type IaGroup = { group: string; items: IaItem[] };
const ADMIN_IA: IaGroup[] = [
  { group: '전시 관리', items: [
    { name: '전시화면 관리', path: '/admin/containers', role: '메인·혜택·쇼핑 홈 등 채널 화면을 만드는 전시 빌더. 코너 유형에서 승인된 코너를 불러와 Template에 쌓고(배치·순서), 로그인/세그먼트별 분기와 전시 기간을 설정한다. 개인화(CVM)는 코너별로 제어.', fields: 'Container › Template › Corner › Component' },
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
        <h2 className="mb-1 flex items-center gap-2 text-[15px] font-extrabold text-slate-900"><span className="inline-block h-[14px] w-[4px] rounded-sm bg-[#3616cd]" />관리 메뉴 IA</h2>
        <p className="mb-3 flex flex-wrap items-center gap-2 text-[13px] font-medium text-slate-600">
          어드민(BO) 메뉴 구조 — 그룹별 메뉴와 역할·주요 항목. 메뉴명을 누르면 이동합니다.
          <span className="rounded-md bg-[#eceefe] px-2 py-0.5 text-[12px] font-bold text-[#3616cd]">오늘 리뷰 {reviewChecked.size}개 체크</span>
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
                      <div className="mb-1.5 flex flex-wrap items-center gap-1">
                        <label className={cn('inline-flex cursor-pointer select-none items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-bold', checked ? (it.partial ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-[#3616cd] bg-[#eceefe] text-[#3616cd]') : 'border-[#e0e3ea] bg-white text-slate-400')}>
                          <input type="checkbox" checked={checked} onChange={() => toggleReview(it.name)} className={cn('h-3 w-3', it.partial ? 'accent-amber-500' : 'accent-[#3616cd]')} />
                          오늘 리뷰
                        </label>
                        {checked && it.partial && <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">일부만</span>}
                      </div>
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
