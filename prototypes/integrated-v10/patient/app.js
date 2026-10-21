import {readPatientPublication,PUBLICATION_STORAGE_KEY} from '../shared/publication.js';

// A3-connected B v1.3: same visual shell, but no standalone fixture, mock approval
// button, fake appointment, medication instruction, or unrelated embedded PDF.
const root=document.querySelector('#app');
const stage=document.querySelector('#stage');
const query=new URLSearchParams(location.search);
const patientId=query.get('patient'),encounterId=query.get('encounter');
const FONT_KEY='care-transition-connected-b-font-v1';
const state={authenticated:false,view:'today',selected:null,large:false,notice:''};
let visits=[{view:'today',selected:null}],position=0;
try{state.large=localStorage.getItem(FONT_KEY)==='1'}catch{}
const esc=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const permitted=new Set(['today','detail','schedule','help','profile','overview']);
const icons={
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
 back:'<path d="m15 18-6-6 6-6"/>',
 chev:'<path d="m9 18 6-6-6-6"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 10h18"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.6 1.3c-.7 1-2.1 1.4-2.1 3M12 17h.01"/>',
 shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
 info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/>'
};
const icon=(name,size=20)=>'<svg aria-hidden="true" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+icons[name]+'</svg>';
function publication(){
 let storage=null;try{storage=window.localStorage}catch{}
 return readPatientPublication(storage,patientId,encounterId);
}
const routeKey=()=>['detail','overview'].includes(state.view)?'today':state.view;
function nav(view,label,symbol,mobile=false){
 const active=routeKey()===view;
 return '<button type="button" class="'+(mobile?'':'side-nav')+'" data-view="'+view+'" '+(active?'aria-current="page"':'')+'>'+icon(symbol,mobile?22:21)+label+'</button>';
}
function visit(view,selected=null){
 if(!permitted.has(view))return;
 state.view=view;state.selected=selected;
 const entry={view,selected};
 if(JSON.stringify(visits[position])!==JSON.stringify(entry)){
  visits=visits.slice(0,position+1);visits.push(entry);position=visits.length-1;
 }
 render();focusContent();
}
function traverse(offset){
 const next=position+offset;if(next<0||next>=visits.length)return;
 position=next;state.view=visits[next].view;state.selected=visits[next].selected;
 render();focusContent();
}
function focusContent(){
 const el=document.querySelector('#main-content');
 if(el){el.focus({preventScroll:true});el.scrollIntoView({behavior:'instant',block:'start'});}
}
function badge(pub){return '<div class="updated">'+icon('shield',19)+'<span>의료진 승인 '+esc(pub.approvedAt.slice(0,10))+' · 가상 발행 '+esc(pub.issuedAt.slice(0,10))+' · v'+esc(pub.planVersion)+'</span></div>';}
function itemCard(x,i){
 return '<button class="task" type="button" data-item="'+esc(x.id)+'"><span class="task-number">'+String(i+1).padStart(2,'0')+'</span><span class="task-content"><b>'+esc(x.title)+'</b><small>'+esc(x.text.slice(0,110))+'</small></span><span class="task-chevron">'+icon('chev',20)+'</span></button>';
}
const paragraph=x=>'<p class="connected-text">'+esc(x)+'</p>';
function content(pub){
 if(!pub)return '<div class="blocked" role="status"><div class="eyebrow">안내 확인 필요</div><h2>아직 발행된 안내가 없어요.</h2><p>의료진이 승인하고 발행한 현재 유효한 합성 계획만 표시합니다. 승인 전 초안, 철회된 계획, 다른 환자의 일정과 자료는 보여주지 않아요.</p></div>';
 if(state.view==='detail'){
  const item=pub.items.find(i=>i.id===state.selected);
  if(!item){state.view='today';return content(pub);}
  return '<div class="detail-wrap"><button class="back-button" data-view="today">'+icon('back',19)+' 오늘 화면으로</button><div class="detail-heading"><div class="eyebrow">발행된 안내 · v'+esc(pub.planVersion)+'</div><h1>'+esc(item.title)+'</h1></div><section class="focus-panel"><h2 class="focus-title">의료진이 확인한 내용</h2>'+paragraph(item.text)+'</section><section class="document-panel"><div class="document-label">'+icon('info',19)+' 안내 자료</div><h2 class="document-title">자세한 내용을 확인할까요?</h2><p class="document-desc">현재 발행된 문서의 이름을 확인할 수 있습니다.</p>'+(pub.documents.length?pub.documents.map(d=>'<div class="document-unavailable">'+esc(d.name)+' · 원본 PDF는 아직 제공되지 않았습니다. 기관에 문의해 주세요.</div>').join(''):'<div class="document-unavailable">이 발행본에는 열 수 있는 PDF가 없습니다. 독립 시연용 자료는 연결하지 않습니다.</div>')+'</section>'+badge(pub)+'</div>';
 }
 if(state.view==='schedule'){
  const follow=pub.items.filter(x=>x.section==='followup');
  return '<div class="schedule-layout"><div class="eyebrow">퇴원 후 일정 안내</div><h1 class="hero-title">앞으로의 일정,<br><em>확인해 보세요.</em></h1><p class="sublead">승인된 안내문에 있는 일시만 표시하고, 별도로 날짜나 예약을 만들어내지 않아요.</p>'+badge(pub)+(follow.length?follow.map(x=>'<article class="event"><div><h3>'+esc(x.title)+'</h3>'+paragraph(x.text)+'</div></article>').join(''):'<div class="document-unavailable">발행본에 일정 관련 안내가 없습니다.</div>')+'</div>';
 }
 if(state.view==='help'){
  const help=pub.items.filter(x=>['warning','contact','support'].includes(x.section));
  return '<div class="service-page"><div class="eyebrow">발행된 도움 안내</div><h1 class="service-title">도움이 필요할 때</h1><p class="service-lead">의료진이 발행한 문의·주의·지원 안내만 표시합니다.</p>'+(help.length?help.map(x=>'<section class="profile-section"><h2>'+esc(x.title)+'</h2>'+paragraph(x.text)+'</section>').join(''):'<div class="document-unavailable">공개된 도움 안내가 없습니다.</div>')+'</div>';
 }
 if(state.view==='profile'){
  return '<div class="profile-layout"><div class="eyebrow">합성 데이터 · 시연용</div><h1>내 정보</h1><p class="profile-intro">이 화면은 선택된 가상 환자·입원건만 보여 줍니다. 실제 본인확인이나 의료기관 조회가 아닙니다.</p><section class="profile-section"><div class="profile-grid"><div><small>가상 환자 ID</small><strong>'+esc(pub.patientId)+'</strong></div><div><small>가상 입원건</small><strong>'+esc(pub.encounterId)+'</strong></div><div><small>계획 버전</small><strong>v'+esc(pub.planVersion)+'</strong></div><div><small>발행일</small><strong>'+esc(pub.issuedAt.slice(0,10))+'</strong></div></div><p class="profile-help">이 통합 시연에서는 다른 환자의 기본 주소·연락처를 표시하지 않습니다. 정보 수정·기관 전송은 실제 인증과 별도 권한 설계 전까지 비활성화합니다. 독립 환자용 v1.3의 기능은 보존됩니다.</p></section><button class="logout-btn" type="button" data-action="logout">가상 계정에서 나가기</button></div>';
 }
 if(state.view==='overview'){
  return '<div class="overview-layout"><button class="back-button" data-view="today">'+icon('back',19)+' 오늘 화면으로</button><div class="overview-head"><div class="eyebrow">발행된 전체 관리계획</div><h1>퇴원 후 관리계획<br><em>전체 안내</em></h1>'+badge(pub)+'</div>'+pub.items.map(x=>'<section class="profile-section"><h2>'+esc(x.title)+'</h2>'+paragraph(x.text)+'</section>').join('')+'</div>';
 }
 return '<div class="page-head"><div class="eyebrow">'+esc(pub.patientId)+' · 합성 환자 안내</div><section class="hero-panel"><span class="hero-chip">발행된 계획만 표시합니다.</span><h1 class="hero-title">퇴원 후,<br><em>오늘의 관리 계획</em></h1><p class="sublead">지금 필요한 일부터 모았어요.</p>'+badge(pub)+'</section></div><div class="content-grid"><section aria-labelledby="today-tasks"><div class="section-top"><h2 class="section-title" id="today-tasks">오늘 확인할 안내</h2></div><div class="tasks">'+pub.items.map(itemCard).join('')+'</div></section><aside class="aside-stack"><section class="appointment"><div class="block-overline">현재 발행본</div><h3 class="ap-title">계획 v'+esc(pub.planVersion)+'</h3><p class="ap-desc">발행일 '+esc(pub.issuedAt.slice(0,10))+'</p><button class="text-action" data-view="schedule">일정 안내 보기 '+icon('chev',15)+'</button></section><section class="insight-strip"><h3>더 자세한 설명이 필요하신가요?</h3><p>발행된 계획 전체를 확인할 수 있어요.</p><button class="text-action" data-view="overview">전체 계획 보기 '+icon('chev',15)+'</button></section></aside></div><section class="home-help-wide"><div class="home-help-heading"><div><h2>도움이 필요할 때</h2><p>발행된 도움·문의 안내를 확인해 주세요.</p></div><button class="home-help-main" data-view="help">도움 안내 보기 '+icon('chev',18)+'</button></div></section><p class="foot-note">합성 데이터만 사용하는 로컬 시연입니다. 실제 임상 정보·서버 인증·병원 연동이 아닙니다.</p>';
}
function login(){
 return '<main class="login-viewport"><section class="login-panel"><div class="login-mark">D.</div><div class="eyebrow">퇴원 후, 나의 하루 · A3 통합 시연</div><h1>퇴원 후 필요한 관리를<br>확인해 보세요.</h1><p>실제 개인정보를 사용하지 않는 <b>가상 환자 접속 시연</b>입니다.</p><div class="login-flow"><span>1. 체험용 코드 입력</span><span>2. 발행된 안내 확인</span></div><form id="demo-login" class="login-form"><label for="demo-code">체험용 코드 입력</label><input id="demo-code" name="demoCode" autocomplete="off" spellcheck="false" maxlength="20" placeholder="체험 코드" required><div class="demo-code">체험용 코드: <strong>CARE2026</strong></div>'+(state.notice?'<p class="form-error" role="alert">'+esc(state.notice)+'</p>':'')+'<button class="primary" type="submit">가상 환자 안내 시작 '+icon('chev',18)+'</button></form><div class="security-note"><b>개인정보 보호 안내</b><p>이 코드는 본인인증 수단이 아닙니다. 합성 환자와 같은 브라우저에서 저장된 발행 기록만 확인합니다. 실제 이름·생년월일·환자번호를 입력하지 마세요.</p></div></section></main>';
}
function render(){
 document.body.classList.toggle('large-font',state.large);
 stage.dataset.preview='auto';
 if(!state.authenticated){root.innerHTML=login();return;}
 const result=publication(),pub=result.publication;
 if(pub&&state.view==='detail'&&!pub.items.some(x=>x.id===state.selected)){state.view='today';state.selected=null;}
 const message=result.status==='MISMATCH'?'<div class="blocked" role="alert"><h2>환자·입원건이 일치하지 않아요.</h2><p>A3에서 같은 가상 환자와 입원건을 선택한 뒤 다시 열어 주세요.</p></div>':result.status==='ERROR'?'<div class="blocked" role="alert"><h2>저장된 계획을 확인할 수 없어요.</h2><p>저장소 접근 실패 또는 자료 오류가 있어 안내를 숨겼습니다. 브라우저 저장 상태를 확인해 주세요.</p></div>':content(pub);
 const version=pub?'발행 계획 · v'+esc(pub.planVersion):'발행 안내 없음';
 root.innerHTML='<div class="app-layout"><aside class="side" aria-label="주요 메뉴"><div class="side-brand"><div class="side-logo">D.</div><div><b>나의 하루</b><small>퇴원 후 관리</small></div></div><div class="side-cap">나의 계획</div>'+nav('today','오늘','home')+nav('schedule','일정','calendar')+nav('help','도움','help')+nav('profile','내 정보','user')+'<div class="side-end"><b>가상 퇴원 안내</b><br>의료진이 발행한 자료만 표시합니다.</div></aside><div class="app-body"><header class="topline"><span class="kicker">퇴원 후, 나의 하루</span><div class="meta"><nav class="connected-controls" aria-label="화면 이동"><button class="top-font" type="button" data-action="home">홈</button><button class="top-font" type="button" data-action="back" '+(position===0?'disabled':'')+'>이전</button><button class="top-font" type="button" data-action="next" '+(position===visits.length-1?'disabled':'')+'>다음</button></nav><button class="top-font" type="button" data-action="font">'+(state.large?'글자 기본':'글자 크게')+'</button><span class="version-meta">'+version+'</span><span class="tiny-pill">가상 환자</span></div></header><main id="main-content" class="main" tabindex="-1">'+message+'</main><nav class="bottom-nav" aria-label="모바일 주요 메뉴">'+nav('today','오늘','home',true)+nav('schedule','일정','calendar',true)+nav('help','도움','help',true)+'</nav></div></div>';
}
document.addEventListener('submit',event=>{
 if(event.target.id!=='demo-login')return;
 event.preventDefault();
 const code=String(new FormData(event.target).get('demoCode')||'').trim().toUpperCase();
 if(code!=='CARE2026'){state.notice='체험용 코드를 확인해 주세요.';render();document.querySelector('#demo-code')?.focus();return;}
 state.notice='';state.authenticated=true;render();focusContent();
});
document.addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button)return;
 if(button.dataset.action==='font'){
  state.large=!state.large;
  try{localStorage.setItem(FONT_KEY,state.large?'1':'0')}catch{}
  render();return;
 }
 if(!state.authenticated)return;
 if(button.dataset.action==='logout'){
  state.authenticated=false;state.view='today';state.selected=null;position=0;visits=[{view:'today',selected:null}];render();return;
 }
 if(button.dataset.action==='home'){visit('today');return;}
 if(button.dataset.action==='back'){traverse(-1);return;}
 if(button.dataset.action==='next'){traverse(1);return;}
 if(button.dataset.view){visit(button.dataset.view);return;}
 if(button.dataset.item){
  const pub=publication().publication;
  if(pub?.items.some(i=>i.id===button.dataset.item))visit('detail',button.dataset.item);
 }
});
window.addEventListener('storage',event=>{
 if(event.key===PUBLICATION_STORAGE_KEY||event.key===null){
  state.view='today';state.selected=null;position=0;visits=[{view:'today',selected:null}];render();
 }
});
window.addEventListener('pageshow',()=>{if(state.authenticated)render()});
render();
