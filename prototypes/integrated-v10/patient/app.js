import {createPatientRepository} from './storage.js';
import {readPublishedDocument} from '../shared/published-documents.js';
import {readPatientPublication,PUBLICATION_STORAGE_KEY,ENCOUNTERS} from '../shared/publication.js';

// A3-connected B v1.3: same visual shell, but no standalone fixture, mock approval
// button, fake appointment, medication instruction, or unrelated embedded PDF.
const root=document.querySelector('#app');
const stage=document.querySelector('#stage');
const query=new URLSearchParams(location.search);
const patientId=query.get('patient'),encounterId=query.get('encounter');
const FONT_KEY='care-transition-connected-b-font-v1';
const state={authenticated:false,view:'today',selected:null,large:false,notice:'',editing:false,profileDraft:null,modal:null,consent:false,choice:null,helpQuery:'',helpSearchOpen:false,pdfURL:null};
const storage=(()=>{try{return localStorage}catch{return null}})();
const personalRepository=createPatientRepository(storage,patientId,encounterId);
let personalResult=personalRepository.load(),personal=personalResult.data;
const SESSION_KEY='connected-b-session:'+patientId+':'+encounterId;
let overlayReturn=null,publicationSignature=null,openingDocument=0;
try{const saved=JSON.parse(sessionStorage.getItem(SESSION_KEY));if(saved?.authenticated){state.authenticated=true;if(['today','detail','quiz','schedule','help','profile','overview'].includes(saved.view)){state.view=saved.view;state.selected=typeof saved.selected==='string'?saved.selected:null;}}}catch{}
let visits=[{view:state.view,selected:state.selected}],position=0;
try{state.large=localStorage.getItem(FONT_KEY)==='1'}catch{}
const esc=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const permitted=new Set(['today','detail','schedule','help','profile','overview','quiz']);
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
const routeKey=()=>['detail','overview','quiz'].includes(state.view)?'today':state.view;
function nav(view,label,symbol,mobile=false){
 const active=routeKey()===view;
 return '<button type="button" class="'+(mobile?'':'side-nav')+'" data-view="'+view+'" '+(active?'aria-current="page"':'')+'>'+icon(symbol,mobile?22:21)+label+'</button>';
}
function visit(view,selected=null){
 if(!permitted.has(view))return;
 closeOverlay(false);state.editing=false;state.profileDraft=null;state.notice='';state.choice=null;
 state.view=view;state.selected=selected;
 const entry={view,selected};
 if(JSON.stringify(visits[position])!==JSON.stringify(entry)){
  visits=visits.slice(0,position+1);visits.push(entry);position=visits.length-1;
 }
 render();focusContent();
}
function traverse(offset){
 const next=position+offset;if(next<0||next>=visits.length)return;
 closeOverlay(false);state.editing=false;state.profileDraft=null;state.notice='';state.choice=null;
 position=next;state.view=visits[next].view;state.selected=visits[next].selected;
 render();focusContent();
}
function focusContent(){
 const el=document.querySelector('#main-content');
 if(el){el.focus({preventScroll:true});el.scrollIntoView({behavior:'instant',block:'start'});}
}
function badge(pub){return '<div class="updated">'+icon('shield',19)+'<span>의료진 승인 '+esc(pub.approvedAt.slice(0,10))+' · 가상 발행 '+esc(pub.issuedAt.slice(0,10))+' · v'+esc(pub.planVersion)+'</span></div>';}
function itemCard(x,i,publicationId){
 return '<button class="task" type="button" data-item="'+esc(x.id)+'"><span class="task-number">'+String(i+1).padStart(2,'0')+'</span><span class="task-content"><b>'+esc(x.title)+'</b><small>'+esc(x.text.slice(0,110))+'</small>'+((personal.understanding[publicationId]?.[x.id])?'<small class="read-state">내 확인 기록 있음 · 수행 여부 아님</small>':'')+'</span><span class="task-chevron">'+icon('chev',20)+'</span></button>';
}
const paragraph=x=>'<p class="connected-text">'+esc(x)+'</p>';
function rememberRoute(){
 try{sessionStorage.setItem(SESSION_KEY,JSON.stringify({authenticated:state.authenticated,view:state.view,selected:state.selected}));}catch{}
}
function savePersonal(next,notice){
 try{personalRepository.save(next);personal=next;personalResult.error=null;state.notice=notice;return true;}
 catch(error){state.notice='저장하지 못했어요. '+error.message;return false;}
}
function closeOverlay(redraw=true){
 openingDocument++;if(state.pdfURL){URL.revokeObjectURL(state.pdfURL);state.pdfURL=null;}
 const target=overlayReturn;state.modal=null;state.consent=false;
 if(redraw){render();const el=target&&document.querySelector(target);if(el&&!el.disabled)el.focus();else focusContent();}
}
function openOverlay(kind,returnSelector){if(kind==='transfer')state.consent=false;state.modal=kind;overlayReturn=returnSelector;render();}
function documents(pub){
 return pub.documents.length?pub.documents.map(d=>'<div class="document-unavailable"><strong>'+esc(d.name)+'</strong><p>현재 발행 v'+esc(pub.planVersion)+'에 연결된 자료입니다.</p><button class="secondary-action" data-document="'+esc(d.id)+'">앱에서 PDF 확인하기</button></div>').join(''):'<div class="document-unavailable">이 발행본에는 열 수 있는 PDF가 없습니다. 독립 시연용 자료는 연결하지 않습니다.</div>';
}
function profilePage(pub){
 const data=state.profileDraft||personal.profile;
 return '<div class="profile-layout"><div class="eyebrow">합성 데이터 · 시연용</div><h1>내 정보</h1><p class="profile-intro">병원 발행 정보와 이 브라우저에서 입력한 가상 연락 정보를 구분합니다. 실제 개인정보를 입력하지 마세요.</p><section class="profile-section"><div class="profile-section-head"><h2>발행된 계획 정보</h2><span class="profile-tag">읽기 전용</span></div><div class="profile-grid"><div><small>가상 환자 ID</small><strong>'+esc(pub.patientId)+'</strong></div><div><small>가상 입원건</small><strong>'+esc(pub.encounterId)+'</strong></div><div><small>계획 버전</small><strong>v'+esc(pub.planVersion)+'</strong></div><div><small>발행일</small><strong>'+esc(pub.issuedAt.slice(0,10))+'</strong></div></div></section><section class="profile-section"><div class="profile-section-head"><h2>연락·주소 정보</h2><span class="profile-tag">사용자 입력 · 로컬 시연</span></div>'+(state.editing?'<form id="profile-form" class="profile-form"><label for="address">가상 주소</label><input id="address" name="address" data-profile-field="address" maxlength="120" value="'+esc(data.address)+'" required><label for="contact">가상 연락처</label><input id="contact" name="contact" data-profile-field="contact" maxlength="50" value="'+esc(data.contact)+'" required><p class="profile-help">병원 등록 정보나 승인된 진료계획을 변경하지 않습니다.</p><div class="profile-actions"><button class="primary" type="submit">수정 내용 저장</button><button class="link-soft" type="button" data-action="edit-cancel">취소</button></div></form>':'<div class="profile-grid"><div><small>입력한 가상 주소</small><strong>'+esc(personal.profile.address||'입력하지 않음')+'</strong></div><div><small>입력한 가상 연락처</small><strong>'+esc(personal.profile.contact||'입력하지 않음')+'</strong></div></div><button class="secondary-action" data-action="edit-start">주소·연락처 수정하기</button>')+'</section><section class="profile-section transfer-section"><h2>정보 업데이트 요청</h2><p>동의를 확인하고 요청 내역을 이 브라우저에 기록하는 시연입니다. 외부 기관으로 전송되지 않습니다.</p><div class="transfer-status">'+(personal.lastRequest?'모의 요청 '+esc(personal.lastRequest.id)+' · 실제 기관 전송 없음':'기록된 요청 없음')+'</div><button class="primary" data-action="transfer-open" '+(!personal.revision||state.editing||personal.lastRequest?'disabled':'')+'>정보 업데이트 전송 요청</button></section><button class="logout-btn" data-action="logout">가상 계정에서 나가기</button></div>';
}
function helpPage(pub){
 const card=item=>'<button class="service-card" data-item="'+esc(item.id)+'"><span class="service-card-text"><strong>'+esc(item.title)+'</strong><small>'+esc(item.text.slice(0,90))+'</small></span>'+icon('chev',20)+'</button>';
 const primary=pub.items.filter(i=>['warning','contact','support'].includes(i.section));
 const matches=pub.items.filter(i=>!state.helpQuery||(i.title+' '+i.text).includes(state.helpQuery));
 return '<div class="service-page"><div class="eyebrow">발행된 도움 안내</div><h1 class="service-title">도움이 필요할 때</h1><p class="service-lead">의료진이 발행한 문의·주의·지원 안내를 확인하세요.</p><section class="services-panel"><div class="service-list">'+(primary.map(card).join('')||'<p>발행된 문의·지원 안내가 없습니다.</p>')+'</div></section><section class="service-search-launch"><button class="search-launch" data-action="toggle-help-search" aria-expanded="'+state.helpSearchOpen+'" aria-controls="more-help"><span><strong>다른 안내가 필요하신가요?</strong><small>발행된 복약·일정·생활 안내 찾기</small></span>'+icon('chev',20)+'</button><div id="more-help" class="help-search-body" '+(state.helpSearchOpen?'':'hidden')+'><label class="service-search-label" for="help-search">발행된 안내 검색</label><input id="help-search" class="search-input" type="search" value="'+esc(state.helpQuery)+'" placeholder="발행된 내용에서 찾기"><div class="service-search-results" role="status">'+(matches.map(card).join('')||'<p class="search-empty">일치하는 공개 안내가 없습니다. 내용을 임의로 만들지 않습니다.</p>')+'</div></div></section><div class="summary-actions"><button class="secondary-action" data-view="overview">전체 계획 보기</button><button class="secondary-action" data-action="print">종이 안내문 인쇄</button></div><p class="help-disclaimer">지역 서비스 검색·예약·기관 신청·보호자 공유 권한은 연결되지 않았습니다. 승인된 안내 외 별도 의료지시를 제공하지 않습니다.</p></div>';
}
function quizPage(pub){
 const item=pub.items.find(x=>x.id===state.selected);if(!item){state.view='today';return content(pub);}
 const answer=personal.understanding[pub.publicationId]?.[item.id];
 return '<div class="quiz-container"><button class="back-button" data-item="'+esc(item.id)+'">안내로 돌아가기</button><div class="quiz-context">안내 이해 확인 · 선택 참여</div><h1 class="quiz-title">'+esc(item.title)+' 안내를 확인했나요?</h1><section class="focus-panel">'+paragraph(item.text)+'</section><p class="quiz-expl">이 답변은 읽은 내용을 스스로 확인하는 기록입니다. 치료 수행이나 임상 이해도를 평가하거나 의료진에게 전송하지 않습니다.</p><div class="choices" role="group" aria-label="이해 확인 선택">'+[['UNDERSTOOD','읽고 이해했어요'],['HELP','설명이 더 필요해요']].map(([id,label])=>'<button class="choice" data-choice="'+id+'" aria-pressed="'+(state.choice===id)+'"><span class="radio"></span><span>'+label+'</span></button>').join('')+'</div><button class="primary" data-action="understanding-save" '+(!state.choice?'disabled':'')+'>확인 내용 저장</button>'+(answer?'<div class="feedback" role="status"><b>'+(answer==='UNDERSTOOD'?'이 발행본의 안내 확인을 기록했어요.':'추가 설명이 필요하다고 기록했어요.')+'</b><p>실제 의료진에게 전송되지 않습니다. 문의 방법은 발행된 도움 안내에서 확인하세요.</p><button class="text-action" data-view="help">도움 안내 보기</button></div>':'')+'</div>';
}
function overlay(pub){
 if(!state.modal)return '';
 let title='',body='',actions='';
 if(state.modal==='save'){
  title='수정한 정보를 저장할까요?';body='<p>가상 주소·연락처를 이 브라우저에 저장합니다. 병원 기록은 변경하지 않습니다.</p><div class="modal-diff"><small>가상 주소</small><strong>'+esc(state.profileDraft?.address)+'</strong><small>가상 연락처</small><strong>'+esc(state.profileDraft?.contact)+'</strong></div>';actions='<button class="primary" data-action="modal-save">변경사항 저장</button>';
 }else if(state.modal==='transfer'){
  title='모의 업데이트 요청을 기록할까요?';body='<p>실제 기관 전송 없이, 현재 저장한 변경의 요청 내역만 기록합니다.</p><label class="consent-row"><input id="transfer-consent" type="checkbox" '+(state.consent?'checked':'')+'>가상 정보 제공 요청 시연에 동의합니다.</label><p id="consent-error" role="alert" hidden></p>';actions='<button class="primary" data-action="modal-transfer">모의 전송 요청 기록</button>';
 }else if(state.modal==='pdf'){
  title=state.pdfName;body='<p>현재 발행 v'+esc(pub.planVersion)+'에 연결된 PDF입니다. 브라우저에서 미리보기를 지원하지 않으면 아래 링크로 열거나 저장하세요.</p><iframe class="pdf-frame" title="발행된 PDF 미리보기" src="'+esc(state.pdfURL)+'"></iframe>';actions='<a class="secondary-action" href="'+esc(state.pdfURL)+'" target="_blank" rel="noopener">PDF 새 창으로 열기</a><a class="secondary-action" href="'+esc(state.pdfURL)+'" download="'+esc(state.pdfName)+'">PDF 파일 저장</a>';
 }else{title='발행된 안내와 내 기록';body='<p>의료진이 승인·발행한 현재 계획만 안내로 표시합니다. 연락 정보와 이해 확인은 이 브라우저의 개인 시연 기록이며 병원으로 전송하지 않습니다.</p>';}
 return '<dialog id="patient-dialog" class="connected-dialog '+(state.modal==='pdf'?'pdf-panel':'modal-panel')+'" aria-labelledby="dialog-title"><header class="pdf-panel-header"><h2 id="dialog-title">'+esc(title)+'</h2><button class="top-font" data-action="font">'+(state.large?'글자 기본':'글자 크게')+'</button></header>'+body+'<div class="modal-actions"><button class="link-soft" data-action="modal-close">닫기</button>'+actions+'</div></dialog>';
}
function availableOtherDemos(){
 let found=[];
 try{
  const current=window.localStorage;
  found=Object.entries(ENCOUNTERS).filter(([id])=>id!==patientId)
   .filter(([id,enc])=>readPatientPublication(current,id,enc).status==='PUBLISHED')
   .map(([id,enc])=>'<a class="secondary-action" href="?patient='+encodeURIComponent(id)+'&amp;encounter='+encodeURIComponent(enc)+'">'+esc(id)+' 발행본 보기</a>');
 }catch{}
 return found.length?'<div class="demo-preview-actions"><p>이 브라우저에 다른 가상 환자의 발행본이 있어요.</p>'+found.join('')+'</div>':'';
}
function content(pub){
 if(!pub)return '<div class="blocked" role="status"><div class="eyebrow">안내 확인 필요</div><h2>아직 발행된 안내가 없어요.</h2><p>이곳에는 승인·발행된 합성 계획만 표시돼요. A3의 <b>검토 요청 → 지정 최종 승인자 역할 선택 → 승인 → 계획 발행</b>을 진행하면 연결됩니다. 승인 전 초안·철회본은 노출하지 않아요.</p>'+availableOtherDemos()+'<div class="demo-preview-actions"><a class="secondary-action" href="../a3/index.html?screen=patient-preview&amp;patient='+encodeURIComponent(patientId||'SYN-002')+'">발행 전 화면 구성 미리보기 (승인 아님)</a><a class="secondary-action" href="https://pchjesus.github.io/ai-care-transition-platform/patient/index.html" target="_blank" rel="noopener">독립 환자용 B 예시 (별도 합성 데이터)</a></div></div>';
 if(state.view==='detail'){
  const item=pub.items.find(i=>i.id===state.selected);
  if(!item){state.view='today';return content(pub);}
  return '<div class="detail-wrap"><button class="back-button" data-view="today">'+icon('back',19)+' 오늘 화면으로</button><div class="detail-heading"><div class="eyebrow">발행된 안내 · v'+esc(pub.planVersion)+'</div><h1>'+esc(item.title)+'</h1></div><section class="focus-panel"><h2 class="focus-title">의료진이 확인한 내용</h2>'+paragraph(item.text)+'</section><section class="document-panel"><div class="document-label">'+icon('info',19)+' 안내 자료</div><h2 class="document-title">자세한 내용을 확인할까요?</h2><p class="document-desc">현재 발행된 문서의 이름을 확인할 수 있습니다.</p>'+documents(pub)+'</section><div class="detail-secondary-row"><button class="quiz-optional" data-action="quiz-start">안내 이해 확인 (선택)</button><button class="link-soft" data-action="about">안내·기록 설명</button></div>'+badge(pub)+'</div>';
 }
 if(state.view==='schedule'){
  const follow=pub.items.filter(x=>x.section==='followup');
  return '<div class="schedule-layout"><div class="eyebrow">퇴원 후 일정 안내</div><h1 class="hero-title">앞으로의 일정,<br><em>확인해 보세요.</em></h1><p class="sublead">승인된 안내문에 있는 일시만 표시하고, 별도로 날짜나 예약을 만들어내지 않아요.</p>'+badge(pub)+(follow.length?follow.map(x=>'<article class="event"><div class="connected-appointment-date">'+(x.appointment?'<b>'+esc(x.appointment.date)+'</b><small>'+esc(x.appointment.time)+'</small>':'<b>일정 확인 필요</b><small>예약 날짜 미제공</small>')+'</div><div><h3>'+esc(x.title)+'</h3>'+(x.appointment?'<p><strong>장소</strong> '+esc(x.appointment.place)+'</p>':'<p>승인된 발행본에 확정 날짜·장소가 제공되지 않았어요.</p>')+paragraph(x.text)+'</div></article>').join(''):'<div class="document-unavailable">발행본에 일정 관련 안내가 없습니다.</div>')+'</div>';
 }
 if(state.view==='help')return helpPage(pub);
 if(state.view==='profile')return profilePage(pub);
 if(state.view==='quiz')return quizPage(pub);
 if(state.view==='overview'){
  return '<div class="overview-layout"><button class="back-button" data-view="today">'+icon('back',19)+' 오늘 화면으로</button><div class="overview-head"><div class="eyebrow">발행된 전체 관리계획</div><h1>퇴원 후 관리계획<br><em>전체 안내</em></h1>'+badge(pub)+'</div>'+pub.items.map(x=>'<section class="profile-section"><h2>'+esc(x.title)+'</h2>'+paragraph(x.text)+'</section>').join('')+'</div>';
 }
 return '<div class="page-head"><div class="eyebrow">'+esc(pub.patientId)+' · 합성 환자 안내</div><section class="hero-panel"><span class="hero-chip">발행된 계획만 표시합니다.</span><h1 class="hero-title">퇴원 후,<br><em>오늘의 관리 계획</em></h1><p class="sublead">지금 필요한 일부터 모았어요.</p>'+badge(pub)+'</section></div><div class="content-grid"><section aria-labelledby="today-tasks"><div class="section-top"><h2 class="section-title" id="today-tasks">오늘 확인할 안내</h2></div><div class="tasks">'+pub.items.map((item,i)=>itemCard(item,i,pub.publicationId)).join('')+'</div></section><aside class="aside-stack"><section class="appointment"><div class="block-overline">현재 발행본</div><h3 class="ap-title">계획 v'+esc(pub.planVersion)+'</h3><p class="ap-desc">발행일 '+esc(pub.issuedAt.slice(0,10))+'</p><button class="text-action" data-view="schedule">일정 안내 보기 '+icon('chev',15)+'</button></section><section class="insight-strip"><h3>더 자세한 설명이 필요하신가요?</h3><p>발행된 계획 전체를 확인할 수 있어요.</p><button class="text-action" data-view="overview">전체 계획 보기 '+icon('chev',15)+'</button></section></aside></div><section class="home-help-wide"><div class="home-help-heading"><div><h2>도움이 필요할 때</h2><p>발행된 도움·문의 안내를 확인해 주세요.</p></div><button class="home-help-main" data-view="help">도움 안내 보기 '+icon('chev',18)+'</button></div></section><p class="foot-note">합성 데이터만 사용하는 로컬 시연입니다. 실제 임상 정보·서버 인증·병원 연동이 아닙니다.</p>';
}
function login(){
 return '<main class="login-viewport"><section class="login-panel"><div class="login-mark">D.</div><div class="eyebrow">퇴원 후, 나의 하루 · A3 통합 시연</div><h1>퇴원 후 필요한 관리를<br>확인해 보세요.</h1><p>실제 개인정보를 사용하지 않는 <b>가상 환자 접속 시연</b>입니다.</p><div class="login-flow"><span>1. 체험용 코드 입력</span><span>2. 발행된 안내 확인</span></div><form id="demo-login" class="login-form"><label for="demo-code">체험용 코드 입력</label><input id="demo-code" name="demoCode" autocomplete="off" spellcheck="false" maxlength="20" placeholder="체험 코드" required><div class="demo-code">체험용 코드: <strong>CARE2026</strong></div><p class="demo-mode-option"><a href="../../../patient/index.html">승인 과정 없이 기존 예시 화면 바로 체험하기 →</a></p>'+(state.notice?'<p class="form-error" role="alert">'+esc(state.notice)+'</p>':'')+'<button class="primary" type="submit">가상 환자 안내 시작 '+icon('chev',18)+'</button></form><div class="security-note"><b>개인정보 보호 안내</b><p>이 코드는 본인인증 수단이 아닙니다. 합성 환자와 같은 브라우저에서 저장된 발행 기록만 확인합니다. 실제 이름·생년월일·환자번호를 입력하지 마세요.</p></div></section></main>';
}
function render(){
 document.body.classList.toggle('large-font',state.large);
 stage.dataset.preview='auto';
 if(!state.authenticated){root.innerHTML=login();return;}
 const result=publication(),pub=result.publication;
 const signature=JSON.stringify(result);if(publicationSignature!==null&&signature!==publicationSignature){closeOverlay(false);state.choice=null;state.notice='발행 상태가 변경됐어요. 현재 유효한 계획을 확인해 주세요.';if(!pub){state.view='today';state.selected=null;visits=[{view:'today',selected:null}];position=0;}}publicationSignature=signature;
 rememberRoute();
 if(pub&&['detail','quiz'].includes(state.view)&&!pub.items.some(x=>x.id===state.selected)){state.view='today';state.selected=null;}
 const message=result.status==='MISMATCH'?'<div class="blocked" role="alert"><h2>환자·입원건이 일치하지 않아요.</h2><p>A3에서 같은 가상 환자와 입원건을 선택한 뒤 다시 열어 주세요.</p></div>':result.status==='ERROR'?'<div class="blocked" role="alert"><h2>저장된 계획을 확인할 수 없어요.</h2><p>저장소 접근 실패 또는 자료 오류가 있어 안내를 숨겼습니다. 브라우저 저장 상태를 확인해 주세요.</p></div>':content(pub);
 const version=pub?'발행 계획 · v'+esc(pub.planVersion):'발행 안내 없음';
 root.innerHTML='<div class="app-layout"><aside class="side" aria-label="주요 메뉴"><div class="side-brand"><div class="side-logo">D.</div><div><b>나의 하루</b><small>퇴원 후 관리</small></div></div><div class="side-cap">나의 계획</div>'+nav('today','오늘','home')+nav('schedule','일정','calendar')+nav('help','도움','help')+nav('profile','내 정보','user')+'<div class="side-end"><b>가상 퇴원 안내</b><br>의료진이 발행한 자료만 표시합니다.</div></aside><div class="app-body"><header class="topline"><span class="kicker">퇴원 후, 나의 하루</span><div class="meta"><nav class="connected-controls" aria-label="화면 이동"><a class="top-font" href="../index.html">통합 홈</a><button class="top-font" type="button" data-action="home">홈</button><button class="top-font" type="button" data-action="back" '+(position===0?'disabled':'')+'>이전</button><button class="top-font" type="button" data-action="next" '+(position===visits.length-1?'disabled':'')+'>다음</button></nav><button class="top-font" type="button" data-action="font">'+(state.large?'글자 기본':'글자 크게')+'</button><a class="top-font independent-demo-link" href="../../../patient/index.html" aria-label="기존 독립 가상 예시 화면 열기">예시 화면</a><span class="version-meta">'+version+'</span><span class="tiny-pill">가상 환자</span></div></header><main id="main-content" class="main" tabindex="-1">'+(state.notice?'<div class="inline-notice" role="status">'+esc(state.notice)+'</div>':'')+(personalResult.error?'<div class="inline-notice" role="alert">개인 시연 기록을 읽지 못했습니다. 기존 자료를 덮어쓰지 않습니다.</div>':'')+message+'</main><nav class="bottom-nav" aria-label="모바일 주요 메뉴">'+nav('today','오늘','home',true)+nav('schedule','일정','calendar',true)+nav('help','도움','help',true)+nav('profile','내 정보','user',true)+'</nav></div></div>'+(pub?overlay(pub):'');
 const dialog=document.querySelector('#patient-dialog');if(dialog){dialog.addEventListener('cancel',e=>{e.preventDefault();closeOverlay();});dialog.showModal();dialog.querySelector('[data-action="modal-close"]')?.focus();}
}
document.addEventListener('submit',event=>{
 if(event.target.id==='demo-login'){
  event.preventDefault();const code=String(new FormData(event.target).get('demoCode')||'').trim().toUpperCase();
  if(code!=='CARE2026'){state.notice='체험용 코드를 확인해 주세요.';render();document.querySelector('#demo-code')?.focus();return;}
  state.notice='';state.authenticated=true;rememberRoute();render();focusContent();return;
 }
 if(event.target.id==='profile-form'){
  event.preventDefault();const form=new FormData(event.target),address=String(form.get('address')||'').trim(),contact=String(form.get('contact')||'').trim();
  if(!address||!contact||address.length>120||contact.length>50){state.notice='주소와 연락처를 확인해 주세요.';render();return;}
  if(address===personal.profile.address&&contact===personal.profile.contact){state.editing=false;state.profileDraft=null;state.notice='변경된 정보가 없어요.';render();return;}
  state.profileDraft={address,contact};openOverlay('save','#profile-form button[type=submit]');
 }
});
document.addEventListener('input',event=>{
 if(event.target.matches('[data-profile-field]')&&state.profileDraft)state.profileDraft[event.target.dataset.profileField]=event.target.value;
 if(event.target.id==='help-search'){const start=event.target.selectionStart;state.helpQuery=event.target.value;render();const input=document.querySelector('#help-search');input?.focus();try{input?.setSelectionRange(start,start)}catch{}}
});
document.addEventListener('change',event=>{
 if(event.target.id==='transfer-consent'){state.consent=event.target.checked;event.target.removeAttribute('aria-invalid');const error=document.querySelector('#consent-error');if(error)error.hidden=true;}
});
document.addEventListener('click',async event=>{
 const button=event.target.closest('button');if(!button||button.disabled)return;
 const action=button.dataset.action;
 if(action==='font'){
  state.large=!state.large;try{localStorage.setItem(FONT_KEY,state.large?'1':'0')}catch{state.notice='글자 크기를 저장하지 못했어요. 현재 화면에만 적용했습니다.';}
  render();document.querySelector(state.modal?'#patient-dialog [data-action="font"]':'[data-action="font"]')?.focus();return;
 }
 if(!state.authenticated)return;
 if(action==='logout'){closeOverlay(false);state.authenticated=false;state.notice='';state.view='today';state.selected=null;state.profileDraft=null;state.editing=false;position=0;visits=[{view:'today',selected:null}];rememberRoute();render();return;}
 if(action==='home'){visit('today');return;}if(action==='back'){traverse(-1);return;}if(action==='next'){traverse(1);return;}
 const pub=publication().publication;
 if(!pub){render();return;}
 if(action==='modal-close'){closeOverlay();return;}
 if(button.dataset.view){visit(button.dataset.view);return;}
 if(button.dataset.item){if(pub.items.some(i=>i.id===button.dataset.item))visit('detail',button.dataset.item);return;}
 if(button.dataset.choice){if(['UNDERSTOOD','HELP'].includes(button.dataset.choice)){state.choice=button.dataset.choice;render();document.querySelector('[data-choice="'+state.choice+'"]')?.focus();}return;}
 if(action==='quiz-start'){visit('quiz',state.selected);return;}
 if(action==='understanding-save'){
  if(state.view!=='quiz'||!['UNDERSTOOD','HELP'].includes(state.choice)||!pub.items.some(i=>i.id===state.selected))return;
  const next=structuredClone(personal);next.understanding[pub.publicationId]??={};next.understanding[pub.publicationId][state.selected]=state.choice;
  savePersonal(next,'이 발행본의 확인을 기록했어요.');render();return;
 }
 if(action==='toggle-help-search'){state.helpSearchOpen=!state.helpSearchOpen;render();if(state.helpSearchOpen)document.querySelector('#help-search')?.focus();return;}
 if(action==='print'){closeOverlay(false);visit('overview');if(publication().publication?.publicationId===pub.publicationId)window.print();return;}
 if(action==='about'){openOverlay('about','[data-action="about"]');return;}
 if(action==='edit-start'){personalResult=personalRepository.load();personal=personalResult.data;state.profileDraft={...personal.profile};state.editing=true;state.notice='';render();document.querySelector('#address')?.focus();return;}
 if(action==='edit-cancel'){state.profileDraft=null;state.editing=false;personalResult=personalRepository.load();personal=personalResult.data;state.notice='';render();return;}
 if(action==='modal-save'){
  if(state.modal!=='save'||!state.profileDraft)return;
  const next=structuredClone(personal);next.profile={...state.profileDraft};next.revision++;next.lastRequest=null;
  if(savePersonal(next,'주소·연락처가 이 브라우저에 저장됐어요. 실제 기관으로 전송되지 않았습니다.')){state.profileDraft=null;state.editing=false;}
  closeOverlay();return;
 }
 if(action==='transfer-open'){if(!personal.revision||state.editing||personal.lastRequest)return;openOverlay('transfer','[data-action="transfer-open"]');return;}
 if(action==='modal-transfer'){
  if(state.modal!=='transfer'||!personal.revision||state.editing||personal.lastRequest)return;
  if(!document.querySelector('#transfer-consent')?.checked){const input=document.querySelector('#transfer-consent'),error=document.querySelector('#consent-error');if(error){error.textContent='시연 동의를 확인해 주세요.';error.hidden=false;}input?.setAttribute('aria-invalid','true');input?.focus();return;}
  const next=structuredClone(personal);next.lastRequest={id:'DEMO-'+crypto.randomUUID(),revision:next.revision,createdAt:new Date().toISOString(),status:'LOCAL_ONLY'};
  savePersonal(next,'업데이트 요청을 이 브라우저에 기록했어요. 실제 기관으로 전송되지 않았습니다.');closeOverlay();return;
 }
 if(button.dataset.document){
  const token=++openingDocument;button.disabled=true;state.notice='PDF를 확인하고 있어요.';
  try{
   const result=await readPublishedDocument(storage,patientId,encounterId,pub.publicationId,button.dataset.document);
   if(token!==openingDocument||publication().publication?.publicationId!==pub.publicationId)return;
   state.pdfURL=URL.createObjectURL(result.blob);state.pdfName=result.name;state.notice='';openOverlay('pdf','[data-document="'+CSS.escape(button.dataset.document)+'"]');
  }catch(error){if(token===openingDocument){state.notice=error.message;render();}}
 }
});
document.addEventListener('keydown',event=>{
 if(event.key!=='Tab'||!state.modal)return;
 const dialog=document.querySelector('#patient-dialog');
 const nodes=[...dialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),iframe')].filter(el=>el.getClientRects().length);
 if(!nodes.length)return;const first=nodes[0],last=nodes.at(-1);
 if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
 else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
});
window.addEventListener('storage',event=>{
 if(event.key===PUBLICATION_STORAGE_KEY||event.key===null){
  if(JSON.stringify(publication())!==publicationSignature)render();
 }
 if(event.key===personalRepository.key||event.key===null){
  if(state.editing||state.modal){state.notice='다른 탭에서 개인 기록이 변경됐어요. 편집 취소 후 최신 내용을 확인해 주세요.';}
  else{personalResult=personalRepository.load();personal=personalResult.data;render();}
 }
});
window.addEventListener('pageshow',()=>{if(state.authenticated)render()});
function refreshWhenVisible(){if(state.authenticated&&JSON.stringify(publication())!==publicationSignature)render();}
window.addEventListener('focus',refreshWhenVisible);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshWhenVisible();});
window.addEventListener('pagehide',()=>{openingDocument++;if(state.pdfURL)URL.revokeObjectURL(state.pdfURL);state.pdfURL=null;state.modal=null;});
render();
