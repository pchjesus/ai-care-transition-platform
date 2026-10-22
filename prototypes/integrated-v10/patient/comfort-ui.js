import {zoneLabel,commonZones} from './time-zones.js';
import {createReminderRepository,planPreferences,calculateReminders,inboxEvents,validZone,localInstant} from './reminders.js';
import {directionsURL} from '../shared/destinations.js';
import {openPatientTour} from '../a3/tutorial-tour.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const steps=[
 {screen:'today',target:'today',title:'오늘 확인할 안내를 찾아요',body:'이곳에서 관리계획과 지금 확인할 내용을 볼 수 있어요. 안내를 읽는 것과 실제 치료를 수행하는 것은 달라요.'},
 {screen:'schedule',target:'schedule',title:'확정된 외래 정보를 확인해요',body:'날짜와 장소가 확정됐는지 먼저 확인하세요. 알림 설정은 예약을 만들거나 바꾸지 않아요.'},
 {screen:'help',target:'help',title:'도움과 문의 방법을 찾아요',body:'궁금한 내용은 병원 문의 안내에서 확인하세요. 생활지원과 일반 이동 안내는 의료적 이송이나 예약 확정이 아니에요.'}
];
export function installPatientComfort(adapter){
 let storage;try{storage=localStorage}catch{}
 let repo,loaded,contextKey='',dialog=null,returnSelector=null,returnTrigger=null,mode='settings',openedPublication=null,notice='',mapItem=null;
 const context=()=>adapter.context();
 const bound=c=>c.authenticated&&c.patientId&&c.encounterId;
 const pubKey=c=>c.publication?JSON.stringify([c.publication.publicationId,c.publication.planVersion,c.publication.assessmentId]):null;
 const button=(action,label,extra='')=>`<button type="button" class="secondary-action" data-comfort="${action}" ${extra}>${label}</button>`;
 function refreshPreferences(){const c=context(),key=JSON.stringify([c.source,c.patientId,c.encounterId]);if(key!==contextKey){contextKey=key;repo=createReminderRepository(storage,c);}loaded=repo.load();return loaded.data;}
 function currentData(){return loaded?.data||refreshPreferences();}
 function format(at,zone=currentData().zone){return new Intl.DateTimeFormat('ko-KR',{timeZone:zone,dateStyle:'medium',timeStyle:'short'}).format(at);}
 let dialogFrame=0;
 function fitDialog(){
  dialogFrame=0;if(!dialog?.open)return;const v=window.visualViewport;
  if(!v||(v.scale<=1.01&&v.width>=innerWidth-24&&v.height>=innerHeight-24)){
   if(dialog.dataset.fitted){dialog.removeAttribute('style');delete dialog.dataset.fitted;}return;
  }
  dialog.dataset.fitted='true';
  Object.assign(dialog.style,{position:'fixed',margin:'0',right:'auto',bottom:'auto',width:Math.min(700,v.width-24)+'px',maxWidth:(v.width-24)+'px',maxHeight:(v.height-24)+'px'});
  const r=dialog.getBoundingClientRect();dialog.style.left=(v.offsetLeft+(v.width-r.width)/2)+'px';dialog.style.top=(v.offsetTop+Math.max(12,(v.height-r.height)/2))+'px';
 }
 function scheduleDialogFit(){if(dialog&&!dialogFrame)dialogFrame=requestAnimationFrame(fitDialog);}
 window.visualViewport?.addEventListener('resize',scheduleDialogFit);window.visualViewport?.addEventListener('scroll',scheduleDialogFit);window.addEventListener('resize',scheduleDialogFit);
 function close(){if(!dialog)return;cancelAnimationFrame(dialogFrame);dialogFrame=0;if(saving){pendingSave?.abort();const toast=document.createElement('p');toast.className='comfort-toast';toast.setAttribute('role','status');toast.textContent='대기 중이던 알림 저장을 취소했어요. 다시 열어 설정을 확인해 주세요.';document.body.append(toast);setTimeout(()=>toast.remove(),6000);}dialog.close();dialog.remove();dialog=null;const target=returnTrigger?.isConnected?returnTrigger:returnSelector&&document.querySelector(returnSelector);(target||document.querySelector('#main-content'))?.focus({preventScroll:true});}
 function open(kind,trigger,itemId){
  close();mode=kind;mapItem=itemId;notice='';returnTrigger=trigger;returnSelector=trigger?.id?'#'+CSS.escape(trigger.id):trigger?.dataset.comfort?`[data-comfort="${trigger.dataset.comfort}"]`:null;
  refreshPreferences();openedPublication=pubKey(context());draw();dialog.querySelector('[data-comfort="close"]')?.focus();
 }
 function plan(){return planPreferences(currentData(),context().publication);}
 let saving=false,pendingSave=null,refreshQueued=false;
 async function write(mutator){
  if(saving)return false;
  const owner={repo,dialog,publication:openedPublication};
  const commit=()=>{
   if(owner.dialog!==dialog||owner.repo!==repo)throw Error('화면이 바뀌어 저장을 취소했어요.');
   const c=context();if(owner.publication!==pubKey(c))throw Error('발행본이 바뀌었어요. 알림 관리를 다시 열어 주세요.');
   const next=structuredClone(currentData());mutator(next,c);next.revision++;repo.save(next);loaded={data:next,error:null};
  };
  saving=true;pendingSave=new AbortController();dialog?.setAttribute('aria-busy','true');notice='저장 중이에요.';const status=dialog?.querySelector('#comfort-notice');if(status)status.textContent=notice;dialog?.querySelectorAll('form input,form select,form button,[data-comfort^=personal],[data-comfort=seen]').forEach(e=>e.disabled=true);
  try{
   // Participating same-origin tabs serialize the compare-and-write operation.
   if(!navigator.locks)throw Error('동시 탭 보호를 지원하는 HTTPS/localhost 브라우저가 필요해요.');
   await navigator.locks.request('carebridge:'+repo.key,{signal:pendingSave.signal},commit);
   if(dialog===owner.dialog){notice='이 브라우저에 저장했어요. 외부로 전송하지 않았어요.';draw();decorate();}return true;
  }catch(error){if(dialog===owner.dialog){notice='저장하지 못했어요. '+error.message;draw(true);}return false;}
  finally{saving=false;pendingSave=null;dialog?.removeAttribute('aria-busy');if(refreshQueued){refreshQueued=false;refreshInbox();}}
 }
 function changePlan(mutator){return write((next,c)=>{if(c.status!=='PUBLISHED'||!c.publication)throw Error('유효한 발행본이 없어요.');next.plans[c.publication.publicationId]=structuredClone(planPreferences(next,c.publication));mutator(next.plans[c.publication.publicationId],next,c);});}
 function settings(c,data){
  const pub=c.publication;
  if(!pub)return '<p>현재 유효한 발행본이 없어 알림을 활성화할 수 없어요. 철회된 계획의 알림은 표시하지 않아요.</p>';
  const s=plan(),follow=pub.items.filter(i=>i.section==='followup');
  const check=(name,value,label)=>`<label class="comfort-check"><input type="checkbox" name="${name}" ${value?'checked':''}> ${label}</label>`;
  return `<p class="comfort-bound">${c.source==='independent'?'독립 합성 예시 · 실제 처방/예약 아님':'승인된 발행본'} · ${esc(c.patientId)} · ${esc(c.encounterId)} · v${esc(pub.planVersion)}</p>
  <form data-comfort-form="zone"><label>알림 기준 시간<select name="zone">${commonZones(data.zone).map(zone=>`<option value="${esc(zone)}" ${zone===data.zone?'selected':''}>${esc(zoneLabel(zone))}</option>`).join('')}</select></label><details><summary>다른 지역 시간 직접 입력</summary><label>지역 코드<input name="custom-zone" placeholder="예: Europe/Berlin" aria-describedby="zone-code-help"></label><small id="zone-code-help">목록에 없는 지역을 사용할 때만 입력하세요. 기기에서 확인한 시간대는 자동으로 바꾸지 않아요.</small></details><button type="submit">시간대 저장</button></form>
  <section><h3>복약 관련 개인 알림 시연</h3><p>확인된 구조화 복약 시각이 제공되지 않았어요. PDF나 안내문에서 약 이름·용량·횟수·시각을 추정하지 않아요. 아래 입력은 <b>개인이 정하는 준비 알림</b>이며 의료진 처방이 아니에요. 사전 알림은 일찍 약을 먹으라는 지시가 아니에요.</p>
  <form data-comfort-form="personal"><input name="id" type="hidden"><label>개인 알림 이름<input name="label" maxlength="80" placeholder="예: 안내문 확인 준비" required></label><label>날짜<input type="date" name="date" required></label><label>개인이 정한 시각<input type="time" name="time" required></label><label>준비 알림<select name="lead"><option value="0">정시</option><option value="10">10분 전</option><option value="30">30분 전</option></select></label><button type="submit">개인 알림 저장</button></form>
  <ul class="comfort-list">${s.personal.map(m=>`<li><strong>${esc(m.label)}</strong><p>${esc(m.date)} ${esc(m.time)} · ${m.lead?m.lead+'분 전':'정시'} · ${m.enabled?'켜짐':'꺼짐'} · 개인 입력</p>${button('personal-toggle',m.enabled?'끄기':'켜기',`data-id="${esc(m.id)}"`)} ${button('personal-edit','변경',`data-id="${esc(m.id)}"`)} ${button('personal-delete','삭제',`data-id="${esc(m.id)}"`)}</li>`).join('')||'<li>저장한 개인 알림이 없어요.</li>'}</ul></section>
  <section><h3>외래 알림</h3><p>유효하게 발행된 확정 일정만 사용해요. 기본 선택은 하루 전 오전 9시이며, 알림을 켠 뒤 저장하세요. 아래 시각은 ${esc(zoneLabel(data.zone))} 기준이에요. 날짜만 제공된 일정도 선택한 시각에 안내하며 실제 진료 시각을 뜻하지 않아요.</p>
  ${follow.map(i=>{const a=i.appointment,f=s.followups[i.id]||{enabled:false,dayBefore:true,sameDay:false,time:'09:00'};return a?`<form data-comfort-form="followup" data-id="${esc(i.id)}"><h4>${esc(i.title)}</h4><p>${esc(a.date)} ${esc(a.time||'진료 시각 미제공')} · ${esc(a.place)}</p>${check('enabled',f.enabled,'알림 켜기')}${check('dayBefore',f.dayBefore,'하루 전')}${check('sameDay',f.sameDay,'당일')}<label>알림 시각<input type="time" name="time" value="${esc(f.time)}" required></label><button type="submit">외래 알림 저장</button></form>`:'<p>일정 확인 필요 · 확정 날짜가 없어 예약 알림을 만들지 않아요.</p>';}).join('')||'<p>발행된 외래 일정이 없어요.</p>'}</section>
  <form data-comfort-form="important"><h3>추가 안내</h3>${check('important',s.important,'중요 안내를 아직 확인하지 않았을 때 앱 내 알림 표시')}<button type="submit">중요 안내 설정 저장</button></form>
  <section class="comfort-upcoming"><h3>예정 알림</h3><div data-upcoming>${upcoming(c,data)}</div></section>`;
 }
 function upcoming(c,data,error=null){
  if(error)return '<p role="alert">최신 설정을 읽지 못해 예정 알림을 숨겼어요. 저장 상태를 확인해 주세요.</p>';
  const rows=calculateReminders(c,data).filter(x=>x.at>Date.now());
  return `<ul>${rows.map(x=>`<li>${esc(format(x.at,data.zone))} · ${esc(x.title)} · ${x.personal?'개인 준비 알림':'외래 준비'}</li>`).join('')||'<li>앞으로 예정된 알림이 없어요. 지난 일정은 다시 알리지 않아요.</li>'}</ul>`;
 }
 function refreshUpcoming(){
  const el=dialog?.querySelector('[data-upcoming]');if(!el)return;
  const c=context(),fresh=createReminderRepository(storage,c).load();el.innerHTML=upcoming(c,fresh.data,fresh.error);
 }
 function refreshInbox(){
  if(!dialog||mode!=='inbox')return;if(saving){refreshQueued=true;return;}
  const focused=dialog.contains(document.activeElement)?{action:document.activeElement.dataset.comfort,id:document.activeElement.dataset.id}:null;
  loaded=repo.load();draw();
  if(focused){const next=[...dialog.querySelectorAll('[data-comfort]')].find(e=>e.dataset.comfort===focused.action&&e.dataset.id===focused.id);(next||dialog.querySelector('[data-comfort=close]'))?.focus({preventScroll:true});}
 }
 function inbox(c,data){const events=inboxEvents(c,data);return `<p>발행·변경·철회 이력과 앱을 열었을 때 도래한 알림이에요. 알림 열람은 복약 이행·이해 완료 기록이 아니에요.</p><ul class="comfort-list">${events.map(e=>`<li><strong>${esc(e.title)}</strong><p>${e.version?'v'+esc(e.version):''} ${e.seen?'· 알림 확인함':''}</p>${!e.seen?button('seen','알림 확인',`data-id="${esc(e.id)}"`):''}</li>`).join('')||'<li>새 소식이 없어요. 실제로 제공되지 않은 발행 이벤트는 만들지 않아요.</li>'}</ul>`;}
 function maps(c){
  const item=c.publication?.items.find(i=>i.id===mapItem),d=item?.appointment?.destination,url=directionsURL(d);
  if(!url)return '<p>의료진이 공식 주소·좌표를 확인하고 승인·발행한 목적지가 없어요. 병원 주소를 직접 확인해 주세요. 임의의 가상 주소로 길찾기를 시작하지 않아요.</p>';
  return `<p>카카오맵 외부 앱·웹으로 이동해요. 앱이 설치되지 않은 경우 웹 지도를 이용할 수 있어요. 현재 위치나 환자·입원건·의료정보를 자동 전송하지 않아요. 출발지는 외부 서비스에서 직접 선택하세요.</p><h3>${esc(d.name)}</h3><p>${esc(d.address)}</p><a class="secondary-action" data-map-link href="${esc(url)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">카카오맵 길찾기 열기 ↗</a><p>앱/지도가 열리지 않으면 아래 공식 주소를 사용해 병원에 문의하거나 지도에서 직접 검색하세요. 연결 성공이나 도착시간을 확인하는 기능은 없어요.</p>${button('map-fallback','연결이 안 돼요')}<div id="map-fallback" hidden><label>직접 복사할 병원 주소<textarea readonly>${esc(d.address)}</textarea></label><a href="${esc(d.sourceUrl)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">의료진이 대조한 공식 출처 ↗</a></div>`;
 }
 function documents(c){
  const docs=c.publication?.documents||[];
  return `<p>${c.source==='independent'?'독립 예시 자료이며 A3 발행본이 아니에요.':'현재 승인·발행된 문서만 열 수 있어요.'} PDF 내용을 복약 시각이나 처방으로 자동 변환하지 않아요. 이미 내려받은 PDF는 철회 후 회수할 수 없어요.</p>${['MEDICATION','GENERAL'].map(cat=>`<section><h3>${cat==='MEDICATION'?'복약 관련 PDF':'일반 안내문'}</h3>${docs.filter(d=>(d.category||'GENERAL')===cat).map(d=>`<p><strong>${esc(d.name)}</strong> ${button('document-open','열기·다운로드',`data-id="${esc(d.id)}"`)}</p>`).join('')||'<p>이 분류에 제공된 문서가 없어요.</p>'}</section>`).join('')}`;
 }
 function draw(preserve=false){
  const drafts=preserve&&dialog?[...dialog.querySelectorAll('form')].map(f=>({kind:f.dataset.comfortForm,id:f.dataset.id,values:[...f.elements].filter(e=>e.name).map(e=>({name:e.name,value:e.value,checked:e.checked}))})):[];
  const oldScroll=dialog?.scrollTop||0;
  if(dialog){dialog.remove();dialog=null;}
  const c=context(),data=currentData();dialog=document.createElement('dialog');dialog.id='comfort-dialog';dialog.className='comfort-dialog';dialog.setAttribute('aria-labelledby','comfort-title');
  const title={settings:'알림 관리',inbox:'앱 내 알림함',map:'병원 길찾기',documents:'안내 문서'}[mode];
  dialog.innerHTML=`<header><h2 id="comfort-title">${title}</h2>${button('close','닫기')}</header><p class="comfort-scope">앱 내 로컬 시연 · 앱을 열었을 때 확인해요. 앱 종료·백그라운드 정시 발송과 외부 메시지 전송은 하지 않아요.</p><p id="comfort-notice" role="status" tabindex="-1">${esc(notice)}</p>${loaded?.error?'<p role="alert">저장 자료를 읽지 못했어요. 기존 자료를 덮어쓰지 않아요.</p>':''}${mode==='settings'?settings(c,data):mode==='inbox'?inbox(c,data):mode==='map'?maps(c):documents(c)}`;
  document.body.append(dialog);dialog.addEventListener('cancel',e=>{e.preventDefault();close()});
  // draw() after editing replaces a modal, so re-open it and restore focus separately.
  if(openedPublication!==undefined)dialog.showModal();fitDialog();
  for(const draft of drafts){const f=[...dialog.querySelectorAll('form')].find(f=>f.dataset.comfortForm===draft.kind&&f.dataset.id===draft.id);if(f)for(const v of draft.values){const e=f.elements.namedItem(v.name);if(e){e.value=v.value;if(e.type==='checkbox')e.checked=v.checked;}}}
  dialog.scrollTop=oldScroll;(notice?dialog.querySelector('#comfort-notice'):dialog.querySelector('[data-comfort=close]'))?.focus({preventScroll:true});
 }
 function decorate(){
  const c=context();if(!bound(c))return;
  const header=document.querySelector('.topline'),nav=header?.querySelector('.patient-journey,.connected-controls');
  if(nav&&!header.querySelector('[data-comfort="menu"]')){nav.id='patient-journey-menu';header.querySelector('.meta').append(Object.assign(document.createElement('button'),{type:'button',className:'top-font patient-menu-toggle',textContent:'메뉴'}));const b=header.querySelector('.patient-menu-toggle');b.dataset.comfort='menu';b.setAttribute('aria-controls',nav.id);b.setAttribute('aria-expanded','false');}
  // Standalone B originally put profile only in the crowded header.
  const bottom=document.querySelector('.bottom-nav');if(c.source==='independent'&&bottom&&!bottom.querySelector('[data-nav="profile"]')){const b=document.createElement('button');b.dataset.nav='profile';b.innerHTML='<svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg>내 정보';if(c.view==='profile')b.setAttribute('aria-current','page');bottom.append(b);bottom.classList.add('comfort-four-tabs');}
  const main=document.querySelector('#main-content');if(!main||main.querySelector('.comfort-quick'))return;
  const add=(where,html)=>{if(where)where.insertAdjacentHTML('beforeend',html)};
  if(c.publication){
   const links='<section class="comfort-quick" aria-label="환자 편의 기능">'+button('settings','알림 관리')+button('inbox','알림함')+button('documents','안내 문서')+button('tour','사용 안내 (선택)')+'</section>';
   const profile=main.querySelector('.profile-layout'),home=main.querySelector('.page-head');
   add(profile||home||main,links);
   const appointment=main.querySelector('.appointment');add(appointment,button('settings','외래 알림 설정'));
   if(c.view==='today'||c.section==='medication')add(main.querySelector('.tasks,.detail-secondary-row'),'<div class="comfort-med-link">'+button('settings','복약 관련 개인 알림')+'</div>');
  }else add(main,'<section class="comfort-quick">'+button('inbox','발행·철회 알림함')+'</section>');
  if(['schedule','help'].includes(c.view)){
   const appointments=c.publication?.items.filter(i=>i.section==='followup')||[];
   add(main,'<section class="comfort-map-section"><h2>병원 길찾기</h2>'+appointments.map(i=>{const available=!!directionsURL(i.appointment?.destination);return `<p>${esc(i.title)} ${button('map','병원 길찾기',`data-id="${esc(i.id)}" ${available?'':'disabled'}`)}${available?'':' · 확인된 병원 주소가 없어요.'}</p>`;}).join('')+'<p>일반 이동 안내이며 의료적 이송·택시 호출·예약 서비스가 아니에요.</p></section>');
  }
 }
 document.addEventListener('click',e=>{
  const b=e.target.closest('[data-comfort]');if(!b||b.disabled)return;e.preventDefault();e.stopImmediatePropagation();const a=b.dataset.comfort,c=context();if(!bound(c))return;
  if(a==='menu'){const h=b.closest('.topline'),open=h.classList.toggle('patient-menu-open');b.setAttribute('aria-expanded',String(open));if(open)h.querySelector('nav a,nav button:not([disabled])')?.focus();return;}
  if(a==='close'){close();return;}
  if(['settings','inbox','documents','map'].includes(a)){open(a,b,b.dataset.id);return;}
  if(a==='map-fallback'){dialog.querySelector('#map-fallback').hidden=false;dialog.querySelector('textarea').focus();return;}
  if(a==='document-open'){const id=b.dataset.id;close();adapter.openDocument(id);return;}
  if(a==='tour'){
   if(!c.publication)return;
   const bridge={capture:()=>adapter.capture(),show:s=>adapter.showTour(s.screen),target:name=>document.querySelector(name==='today'?'.hero-panel':name==='schedule'?'.schedule-layout':'.service-page'),context:()=>c.source==='independent'?'독립 합성 예시':'현재 발행된 합성 안내 · v'+c.publication.planVersion,restore:x=>adapter.restore(x),returnTarget:()=>document.querySelector('[data-comfort="tour"]')};
   openPatientTour(b,bridge,{brief:true,steps});return;
  }
  if(a==='seen'){write(next=>next.seen[b.dataset.id]=true);return;}
  if(a==='personal-edit'){const m=plan().personal.find(m=>m.id===b.dataset.id),f=dialog.querySelector('[data-comfort-form="personal"]');if(!m)return;for(const k of ['id','label','date','time','lead'])f.elements[k].value=m[k];f.scrollIntoView({block:'center'});f.elements.label.focus();return;}
  if(a==='personal-toggle'||a==='personal-delete')changePlan(s=>{if(a==='personal-delete')s.personal=s.personal.filter(m=>m.id!==b.dataset.id);else{const m=s.personal.find(m=>m.id===b.dataset.id);if(m)m.enabled=!m.enabled;}});
 },true);
 document.addEventListener('submit',e=>{
  const f=e.target;if(!f.matches('[data-comfort-form]'))return;e.preventDefault();e.stopImmediatePropagation();const values=new FormData(f),kind=f.dataset.comfortForm;
  if(kind==='zone'){const zone=String(values.get('custom-zone')||values.get('zone')).trim();if(!validZone(zone)){notice='시간대를 확인해 주세요. 목록에서 지역을 선택하거나 직접 입력한 지역 코드를 확인하세요.';draw(true);return;}write(n=>n.zone=zone);}
  if(kind==='personal')changePlan(s=>{const m={id:String(values.get('id')||crypto.randomUUID()),label:String(values.get('label')).trim(),date:String(values.get('date')),time:String(values.get('time')),lead:Number(values.get('lead')),enabled:s.personal.find(x=>x.id===String(values.get('id')))?.enabled??true};if(!Number.isFinite(localInstant(m.date,m.time,currentData().zone))||localInstant(m.date,m.time,currentData().zone)<=Date.now())throw Error('유효한 미래 날짜·시각을 입력해 주세요.');const duplicate=s.personal.find(x=>x.id!==m.id&&x.date===m.date&&x.time===m.time&&x.lead===m.lead&&x.label===m.label);if(duplicate)throw Error('같은 개인 알림이 이미 있어요.');s.personal=s.personal.filter(x=>x.id!==m.id);s.personal.push(m);});
  if(kind==='followup')changePlan(s=>{const item=context().publication.items.find(i=>i.id===f.dataset.id&&i.appointment);if(!item)throw Error('확정 일정이 없어요.');if(values.has('enabled')&&!values.has('dayBefore')&&!values.has('sameDay'))throw Error('하루 전 또는 당일 알림을 선택해 주세요.');s.followups[item.id]={enabled:values.has('enabled'),dayBefore:values.has('dayBefore'),sameDay:values.has('sameDay'),time:String(values.get('time'))};});
  if(kind==='important')changePlan(s=>s.important=values.has('important'));
 },true);
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){const h=document.querySelector('.patient-menu-open');if(h){h.classList.remove('patient-menu-open');const b=h.querySelector('.patient-menu-toggle');b?.setAttribute('aria-expanded','false');b?.focus();}}
  if(e.key==='Tab'&&dialog?.open){const nodes=[...dialog.querySelectorAll('button:not([disabled]),input:not([type=hidden]),select,a[href],textarea')].filter(n=>n.getClientRects().length);if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes.at(-1)?.focus()}else if(!e.shiftKey&&document.activeElement===nodes.at(-1)){e.preventDefault();nodes[0]?.focus()}}
 });
 function changedPublication(){
  if(!dialog)return;
  notice='발행 상태가 바뀌었어요. 이전 알림은 비활성화됐어요. 새 발행본은 다시 설정하세요.';
  if(mode==='inbox'){openedPublication=pubKey(context());refreshInbox();}else draw();
 }
 window.addEventListener('patient-render',()=>{decorate();if(dialog&&(!bound(context())||openedPublication!==pubKey(context())))changedPublication();});
 window.addEventListener('storage',e=>{
  if(repo&&(e.key===repo.key||e.key===null)&&dialog){
   // A delayed storage event must not erase the failed compare-and-write result.
   if(!notice.startsWith('저장하지 못했어요.'))notice='다른 탭에서 설정이 바뀌었어요. 편집 중인 설정은 저장할 수 없어요. 닫고 다시 열어 주세요.';
   if(mode==='inbox')refreshInbox();else{dialog.querySelector('#comfort-notice').textContent=notice;refreshUpcoming();}
  }
  if(dialog&&openedPublication!==pubKey(context()))changedPublication();
 });
 // Foreground refresh never reloads an editable repository's compare-and-write token.
 function tick(){if(!dialog||document.visibilityState!=='visible')return;if(openedPublication!==pubKey(context()))changedPublication();else if(mode==='inbox')refreshInbox();else if(mode==='settings')refreshUpcoming();}
 window.addEventListener('focus',tick);document.addEventListener('visibilitychange',tick);
 let timer=setInterval(tick,60000);
 window.addEventListener('pagehide',()=>clearInterval(timer));
 window.addEventListener('pageshow',()=>{clearInterval(timer);timer=setInterval(tick,60000);tick();});
 decorate();
}
