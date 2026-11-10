import {zoneLabel,commonZones} from './time-zones.js';
import {createReminderRepository,planPreferences,calculateReminders,inboxEvents,validZone,localInstant} from './reminders.js';
import {directionsURL} from '../shared/destinations.js';
import {openPatientTour} from '../a3/tutorial-tour.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const steps=[
 {screen:'today',target:'today-task',title:'오늘: 발행된 안내를 읽어요',body:'먼저 읽을 안내를 눌러 의료진이 발행한 내용을 확인하세요. PDF가 발행되지 않았다면 임의의 문서는 표시하지 않아요.',tryLabel:'안내 상세 화면 살펴보기',tryScreen:'detail',tryTarget:'detail',tryBody:'본문과 발행된 PDF를 확인하세요. 이해 확인 기록은 실제 수행 완료나 의료진 전송이 아니에요.'},
 {screen:'today',target:'schedule-tab',title:'일정: 진료를 준비해요',body:'일정 메뉴에서 발행된 날짜·시간·장소를 확인하세요. 실제 예약이 완료됐는지는 의료진에게 별도로 확인해야 해요.',tryLabel:'일정 화면 살펴보기',tryScreen:'schedule',tryTarget:'schedule',tryBody:'확인된 목적지가 있을 때만 외부 지도 링크가 열려요. 택시 화면은 준비 안내이며 예약·호출은 하지 않아요.'},
 {screen:'schedule',target:'help-tab',title:'도움: 의료진에게 질문해요',body:'도움 메뉴에서 발행된 주의사항과 문의 방법을 확인하고, 의료진에게 확인할 질문을 살펴보세요.',tryLabel:'도움 화면 살펴보기',tryScreen:'help',tryTarget:'help',tryBody:'질문 목록은 의료진에게 자동 전송되지 않아요. 실제 연락은 발행된 문의 방법으로 확인하세요.'},
 {screen:'help',target:'reminders-tab',title:'알림: 개인 준비를 확인해요',body:'알림에서 발행 변경 소식과 개인이 정한 준비 알림을 확인할 수 있어요. 약 복용 시각을 임의로 만들지 않아요.',tryLabel:'알림 화면 살펴보기',tryScreen:'reminders',tryTarget:'reminders',tryBody:'이 브라우저의 알림 설정은 실제 병원에 전송되지 않아요. 예약 확인이나 응급 연락을 대신하지 않아요.'},
 {screen:'reminders',target:'profile-tab',title:'내 정보: 버전과 글씨를 확인해요',body:'내 정보에서 가상 환자·입원건·발행 버전을 확인하고 필요하면 큰 글씨를 선택하세요.',tryLabel:'내 정보 화면 살펴보기',tryScreen:'profile',tryTarget:'profile',tryBody:'여기서 수정한 가상 연락 정보는 병원 기록에 반영되지 않아요. 의료진의 승인·발행 내용도 바뀌지 않아요.'}
];
export function installPatientComfort(adapter){
 let storage;try{storage=localStorage}catch{}
 let savedForms=[];
 let repo,loaded,contextKey='',dialog=null,returnSelector=null,returnTrigger=null,mode='settings',openedPublication=null,notice='',mapItem=null,taxiChoice='regular',taxiStep=1,taxiDraft=null;
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
 function close(){if(!dialog)return;const inline=dialog.classList.contains('comfort-inline');cancelAnimationFrame(dialogFrame);dialogFrame=0;if(saving){pendingSave?.abort();const toast=document.createElement('p');toast.className='comfort-toast';toast.setAttribute('role','status');toast.textContent='대기 중이던 알림 저장을 취소했어요. 다시 열어 설정을 확인해 주세요.';document.body.append(toast);setTimeout(()=>toast.remove(),6000);}if(!inline)dialog.close();dialog.remove();dialog=null;const target=returnTrigger?.isConnected?returnTrigger:returnSelector&&document.querySelector(returnSelector);(target||document.querySelector('#main-content'))?.focus({preventScroll:true});}
 function open(kind,trigger,itemId){
  close();mode=kind;mapItem=itemId;taxiChoice='regular';taxiStep=1;taxiDraft=kind==='taxi'?{pickup:'',destinationId:'',demoDestination:'',equipment:[],arrivalHelp:[],companion:'unknown'}:null;notice='';returnTrigger=trigger;returnSelector=trigger?.id?'#'+CSS.escape(trigger.id):trigger?.dataset.comfort?`[data-comfort="${trigger.dataset.comfort}"]`:null;
  refreshPreferences();openedPublication=pubKey(context());draw();dialog.querySelector('[data-comfort="close"]')?.focus();
 }
 function plan(){return planPreferences(currentData(),context().publication);}
 let saving=false,pendingSave=null,refreshQueued=false;
 async function write(mutator,submitted=null){
  if(saving)return false;
  const owner={repo,dialog,publication:openedPublication};
  const failed=error=>{if(dialog===owner.dialog){notice='저장하지 못했어요. '+error.message;draw(true);}return false;};
  const commit=()=>{try{
   if(owner.dialog!==dialog||owner.repo!==repo)throw Error('화면이 바뀌어 저장을 취소했어요.');
   const c=context();if(owner.publication!==pubKey(c))throw Error('발행본이 바뀌었어요. 알림 관리를 다시 열어 주세요.');
   const next=structuredClone(currentData());mutator(next,c);next.revision++;repo.save(next);loaded={data:next,error:null};return true;
  }catch(error){return failed(error);}};
  saving=true;pendingSave=new AbortController();dialog?.setAttribute('aria-busy','true');notice='저장 중이에요.';const status=dialog?.querySelector('#comfort-notice');if(status)status.textContent=notice;dialog?.querySelectorAll('form input,form select,form button,[data-comfort^=personal],[data-comfort=seen]').forEach(e=>e.disabled=true);
  try{
   // Participating same-origin tabs serialize the compare-and-write operation.
   if(!navigator.locks)throw Error('동시 탭 보호를 지원하는 HTTPS/localhost 브라우저가 필요해요.');
   const committed=await navigator.locks.request('carebridge:'+repo.key,{signal:pendingSave.signal},commit);
   if(!committed)return false;
   if(dialog===owner.dialog){notice='이 브라우저에 저장했어요. 외부로 전송하지 않았어요.';const inline=dialog.classList.contains('comfort-inline');draw(inline);if(inline&&submitted){const f=[...dialog.querySelectorAll('form')].find(f=>f.dataset.comfortForm===submitted.kind&&f.dataset.id===submitted.id);f?.reset();}decorate();}return true;
  }catch(error){return failed(error);}
  finally{saving=false;pendingSave=null;dialog?.removeAttribute('aria-busy');if(refreshQueued){refreshQueued=false;refreshInbox();}}
 }
 function changePlan(mutator,submitted=null){return write((next,c)=>{if(c.status!=='PUBLISHED'||!c.publication)throw Error('유효한 발행본이 없어요.');next.plans[c.publication.publicationId]=structuredClone(planPreferences(next,c.publication));mutator(next.plans[c.publication.publicationId],next,c);},submitted);}
 function settings(c,data){
  const pub=c.publication;
  if(!pub)return '<p>현재 유효한 발행본이 없어 알림을 활성화할 수 없어요. 철회된 계획의 알림은 표시하지 않아요.</p>';
  const s=plan(),follow=pub.items.filter(i=>i.section==='followup');
  const check=(name,value,label)=>`<label class="comfort-check"><input type="checkbox" name="${name}" ${value?'checked':''}> ${label}</label>`;
  return `<p class="comfort-bound">${c.source==='independent'?'독립 합성 예시 · 실제 처방/예약 아님':'승인된 발행본'} · ${esc(c.patientId)} · ${esc(c.encounterId)} · v${esc(pub.planVersion)}</p>
  <details id="reminder-personal" class="reminder-group"><summary class="reminder-sections"><h2>개인 준비 알림</h2><small>직접 정한 준비 시각 · 의료진 처방 아님</small></summary><p>확인된 구조화 복약 시각이 없어 처방 알림을 만들지 않아요. PDF에서 약·용량·시각을 추정하지 않아요. <b>사전 알림은 일찍 약을 먹으라는 지시가 아니에요.</b></p>
  <form data-comfort-form="personal"><input name="id" type="hidden"><label>개인 알림 이름<input name="label" maxlength="80" placeholder="예: 안내문 확인 준비" required></label><label>날짜<input type="date" name="date" required></label><label>개인이 정한 시각<input type="time" name="time" required></label><label>준비 알림<select name="lead"><option value="0">정시</option><option value="10">10분 전</option><option value="30">30분 전</option></select></label><button type="submit">개인 알림 저장</button></form>
  <ul class="comfort-list">${s.personal.map(m=>`<li><strong>${esc(m.label)}</strong><p>${esc(m.date)} ${esc(m.time)} · ${m.lead?m.lead+'분 전':'정시'} · ${m.enabled?'켜짐':'꺼짐'} · 개인 입력</p>${button('personal-toggle',m.enabled?'끄기':'켜기',`data-id="${esc(m.id)}"`)} ${button('personal-edit','변경',`data-id="${esc(m.id)}"`)} ${button('personal-delete','삭제',`data-id="${esc(m.id)}"`)}</li>`).join('')||'<li>저장한 개인 알림이 없어요.</li>'}</ul></details>
  <details id="reminder-followup" class="reminder-group"><summary><h2>외래 알림 설정</h2><small>발행된 확정 일정만 사용해요</small></summary><p>하루 전 오전 9시가 기본 선택이에요. 켠 뒤 저장하세요. ${esc(zoneLabel(data.zone))} 기준이며 알림 시각은 진료 시각과 달라요.</p>
  ${follow.map(i=>{const a=i.appointment,f=s.followups[i.id]||{enabled:false,dayBefore:true,sameDay:false,time:'09:00'};return a?`<form data-comfort-form="followup" data-id="${esc(i.id)}"><h4>${esc(i.title)}</h4><p>${esc(a.date)} ${esc(a.time||'진료 시각 미제공')} · ${esc(a.place)}</p>${check('enabled',f.enabled,'알림 켜기')}${check('dayBefore',f.dayBefore,'하루 전')}${check('sameDay',f.sameDay,'당일')}<label>알림 시각<input type="time" name="time" value="${esc(f.time)}" required></label><button type="submit">외래 알림 저장</button></form>`:'<p>일정 확인 필요 · 확정 날짜가 없어 예약 알림을 만들지 않아요.</p>';}).join('')||'<p>발행된 외래 일정이 없어요.</p>'}</details>
  <details id="reminder-options" class="reminder-options"><summary>시간대·추가 설정·예정 알림</summary><form data-comfort-form="zone"><label>알림 기준 시간<select name="zone">${commonZones(data.zone).map(zone=>`<option value="${esc(zone)}" ${zone===data.zone?'selected':''}>${esc(zoneLabel(zone))}</option>`).join('')}</select></label><details id="reminder-zone-custom"><summary>다른 지역 시간 직접 입력</summary><label>지역 코드<input name="custom-zone" placeholder="예: Europe/Berlin" aria-describedby="zone-code-help"></label><small id="zone-code-help">목록에 없는 지역을 사용할 때만 입력하세요. 기기에서 확인한 시간대는 자동으로 바꾸지 않아요.</small></details><button type="submit">시간대 저장</button></form>
  <form data-comfort-form="important"><h3>추가 안내</h3>${check('important',s.important,'중요 안내를 아직 확인하지 않았을 때 앱 내 알림 표시')}<button type="submit">중요 안내 설정 저장</button></form>
  <section class="comfort-upcoming"><h3>예정 알림</h3><div data-upcoming>${upcoming(c,data)}</div></section></details>`;
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
 function travelSvg(kind){
 const path=kind==='map'?'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>':kind==='taxi'?'<path d="m5 17 1-8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2l1 8M4 13h16v5H4z"/><path d="M8 18v2m8-2v2M7 10h10M8 4h8"/>':kind==='assist'?'<circle cx="12" cy="4" r="2"/><path d="M12 7v6h-4M12 10h5l2 6h2"/><circle cx="10" cy="17" r="5"/><path d="m14 20 3 2"/>':'<path d="M12 2v20M2 12h20"/>';
 return '<svg aria-hidden="true" viewBox="0 0 24 24" width="27" height="27" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round">'+path+'</svg>';
}
function maps(c){
 const item=c.publication?.items.find(i=>i.id===mapItem), d=item?.appointment?.destination, url=directionsURL(d);
 if(!url)return `<section class="v19-map-empty" role="status">
   <div class="v19-map-illustration" aria-hidden="true">${travelSvg('map')}</div>
   <span class="v19-kicker">주소 확인이 먼저 필요해요</span>
   <h3>아직 지도를 열 수 없어요</h3>
   <p>이 발행본에는 의료진이 확인한 공식 목적지 주소가 없어요. 임의의 장소를 지도에 표시하지 않습니다.</p>
   <div class="v19-explain-steps"><div><b>1</b><span>퇴원 안내문에서 병원명과 주소를 확인해 주세요.</span></div><div><b>2</b><span>실제 방문할 병원에 위치와 출입구를 확인해 주세요.</span></div></div>
   <p class="v19-boundary-text">이 화면은 지도 검색·실시간 위치 확인·병원 예약을 제공하지 않습니다.</p>
 </section>`;
 return `<section class="v19-map-confirmed">
   <span class="v19-kicker">의료진이 확인·발행한 장소</span>
   <h3>${esc(d.name)}</h3>
   <div class="v19-address-card">${travelSvg('map')}<p>${esc(d.address)}</p></div>
   <p>외부 카카오맵을 새 창에서 열어요. 출발지와 현재 위치는 외부 서비스에서 직접 설정해 주세요.</p>
   <a class="v19-primary-link" data-map-link href="${esc(url)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">카카오맵 길찾기 열기 ↗</a>
   <p class="v19-boundary-text">연결 여부·도착 시각·실제 예약은 이 앱에서 확인할 수 없어요. 환자정보나 계획 내용은 지도 링크에 넣지 않습니다.</p>
   ${button('map-fallback','지도 연결이 안 될 때')}<div id="map-fallback" class="v19-map-fallback" hidden><label>주소를 선택해서 복사해 보세요<textarea readonly>${esc(d.address)}</textarea></label><a href="${esc(d.sourceUrl)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">의료진이 확인한 공식 출처 열기 ↗</a></div>
 </section>`;
}

  // Taxi preview is ephemeral. No real passenger data, call payload, or booking is persisted/sent.
 const gearChoices=[['none','없음'],['folding','접이식 휠체어'],['powered','전동 휠체어'],['walker','워커·보행기'],['cane','지팡이·목발']];
 const helpChoices=[['none','필요 없음'],['entrance','병원 출입구·승하차 위치 안내'],['assist','하차 시 부축 문의'],['rental','병원 휠체어 대여 문의'],['meet','보호자·동행인과 합류']];
 const choiceLabels=(keys,choices)=>keys.map(key=>choices.find(x=>x[0]===key)?.[1]).filter(Boolean).join(', ')||'아직 선택하지 않았어요';
 function taxiDestinations(c){
  return (c.publication?.items||[]).filter(i=>i.section==='followup'&&directionsURL(i.appointment?.destination)).map(i=>({id:String(i.id),label:i.title,d:i.appointment.destination}));
 }
 function taxiChoiceDetails(){
  const steps=taxiChoice==='assisted'
   ?['휠체어 탑승, 부축 등 필요한 도움과 차량 이용 가능 여부를 확인하세요.','교통약자 이동지원기관에 이용 자격과 서비스 가능 여부를 직접 문의하세요.','병원 도착 후 도움은 병원 측에 별도로 확인해야 해요.']
   :['가상 출발지와 병원 목적지를 확인하세요.','실제 택시 이용 시 외부 앱에서 직접 위치와 차량 조건을 확인하세요.','탑승 인원과 차량 이용 가능 여부는 별도 확인이 필요해요.'];
  return `<details class="travel-tips"><summary>이용 전에 알아둘 점</summary><section class="travel-steps" aria-label="택시 이용 안내"><ol>${steps.map((step,i)=>`<li><span class="travel-step-index">${i+1}</span><span>${step}</span></li>`).join('')}</ol></section></details>`;
 }
 function taxiCheckedGroup(group,options,label){
  return `<fieldset class="travel-options" aria-label="${label}"><legend>${label}</legend><div class="travel-check-grid">${options.map(([value,name])=>`<label class="travel-check"><input type="checkbox" data-taxi-group="${group}" value="${value}" ${taxiDraft[group].includes(value)?'checked':''}><span>${name}</span></label>`).join('')}</div></fieldset>`;
 }
 function taxiBuilder(c){
  const destinations=taxiDestinations(c),only=destinations.length===1?destinations[0]:null;
  if(only&&!taxiDraft.destinationId)taxiDraft.destinationId=only.id;
  if(!destinations.some(x=>x.id===taxiDraft.destinationId))taxiDraft.destinationId=only?.id||'';
  const chosen=destinations.find(x=>x.id===taxiDraft.destinationId);
  let inner='';
  if(taxiStep===1){
   inner=`<div class="travel-stage"><h3>1. 어디에서 출발하시나요?</h3>
      <label class="travel-input-label" for="taxi-pickup">출발 장소 메모 <small>선택 사항 · 실제 집 주소 입력 금지</small></label>
      <input id="taxi-pickup" data-taxi-field="pickup" maxlength="80" autocomplete="off" placeholder="예: 가상 아파트 앞 승차 위치" value="${esc(taxiDraft.pickup)}">
      <h3>어느 병원으로 가시나요?</h3>
      ${destinations.length?`<label class="travel-input-label" for="taxi-destination">의료진이 확인해 발행한 목적지</label><select id="taxi-destination" data-taxi-field="destinationId">
      <option value="">${destinations.length>1?'방문할 병원을 선택하세요':'목적지 선택'}</option>
      ${destinations.map(x=>`<option value="${esc(x.id)}" ${taxiDraft.destinationId===x.id?'selected':''}>${esc(x.label)} · ${esc(x.d.name)}</option>`).join('')}</select>
      ${chosen?`<div class="travel-destination"><strong>확인된 병원 정보</strong><p>${esc(chosen.d.name)}</p><p class="travel-address">${esc(chosen.d.address)}</p></div>`:''}`
      :c.source==='independent'
       ?`<label class="travel-input-label" for="taxi-demo-dest">가상 목적지 메모 <small>병원 확인 주소가 아닙니다</small></label><input id="taxi-demo-dest" data-taxi-field="demoDestination" maxlength="80" autocomplete="off" placeholder="예: 가상병원 정문 (예시)" value="${esc(taxiDraft.demoDestination)}"><p class="travel-pending-text">이 앱에 확인된 병원 주소가 없어요. 실제 호출을 위한 목적지가 아니에요.</p>`
       :'<p class="travel-pending-text">의료진이 확인·발행한 병원 주소가 없어요. 병원에 목적지를 먼저 확인해 주세요.</p>'}
      <p class="travel-hint">이 화면에 입력한 정보는 시연용으로만 표시돼요. 다른 앱이나 병원으로 전송되지 않아요.</p>
   </div>`;
  }else if(taxiStep===2){
   inner=`<div class="travel-stage"><h3>2. 가지고 탈 물건과 이동 도움</h3>
     ${taxiCheckedGroup('equipment',gearChoices,'차량에 가지고 탈 보조기구')}
     ${taxiCheckedGroup('arrivalHelp',helpChoices,'병원에 내린 뒤 필요한 도움')}
     <label class="travel-input-label" for="taxi-companion">동행하는 사람이 있나요?</label>
     <select id="taxi-companion" data-taxi-field="companion"><option value="unknown" ${taxiDraft.companion==='unknown'?'selected':''}>아직 모르겠어요</option><option value="alone" ${taxiDraft.companion==='alone'?'selected':''}>혼자 이동해요</option><option value="with" ${taxiDraft.companion==='with'?'selected':''}>보호자·동행인과 함께 가요</option></select>
     <p class="travel-hint">전동 휠체어 등은 일반 택시 탑승이 어려울 수 있어요. 차량 조건 및 이동지원 서비스 자격은 별도로 확인하세요. 병원에는 요청이 자동 전달되지 않아요.</p>
   </div>`;
  }else{
   const destinationText=chosen?`${chosen.d.name} · ${chosen.d.address}`:c.source==='independent'?`${taxiDraft.demoDestination||'가상 목적지 미입력'} (확인되지 않은 예시)`:'확인된 병원 목적지 없음';
   const companionName={alone:'혼자 이동',with:'보호자·동행인 동행',unknown:'미정'}[taxiDraft.companion];
   inner=`<div class="travel-stage travel-preview" data-taxi-preview><h3>선택한 이동 준비 내용</h3><p class="v12-scope">선택한 사항과 현재 진행 상태를 한눈에 확인해 주세요.</p>
     <dl class="travel-preview-list"><div><dt>이용 방법</dt><dd>${taxiChoice==='assisted'?'이동지원 필요':'일반 택시'}</dd></div><div><dt>출발 장소</dt><dd>${esc(taxiDraft.pickup||'외부 앱에서 직접 설정')}</dd></div><div><dt>병원 목적지</dt><dd>${esc(destinationText)}</dd></div><div><dt>가지고 탈 보조기구</dt><dd>${esc(choiceLabels(taxiDraft.equipment,gearChoices))}</dd></div><div><dt>병원에서 필요한 도움</dt><dd>${esc(choiceLabels(taxiDraft.arrivalHelp,helpChoices))}</dd></div><div><dt>동행 여부</dt><dd>${companionName}</dd></div></dl>
     <section class="travel-state-summary" aria-label="현재 진행 상태"><h4>현재 진행 상태</h4><ul><li class="prepared"><span class="state-indicator" aria-hidden="true">✓</span><div><strong>선택 내용이 화면에 정리됐어요</strong><small>입력한 준비사항을 이 화면에서 확인할 수 있어요.</small></div></li><li class="pending"><span class="state-indicator" aria-hidden="true">○</span><div><strong>택시 예약은 아직 하지 않았어요</strong><small>차량 예약·배차는 별도로 진행해야 해요.</small></div></li><li class="pending"><span class="state-indicator" aria-hidden="true">○</span><div><strong>병원에 도움 요청이 전달되지 않았어요</strong><small>병원 측에 직접 문의해야 해요.</small></div></li></ul></section>
     <div class="travel-share-boundary"><strong>이 정보는 전송되지 않습니다</strong><p>출발지·목적지 입력을 외부 택시 앱에 연결하는 방식은 추후 공식 제공 범위와 동의를 확인해 설계할 예정이에요.</p><p><strong>보조기구·도착 후 도움 정보는 현재 병원이나 택시 회사에 전송되지 않아요.</strong> 향후에도 별도 동의와 실제 지원 가능 여부 확인이 필요해요.</p></div>
     <section class="travel-next-action"><h4>다음에 할 일</h4><p>실제 예약이 필요하면 이용할 택시 업체나 이동지원기관에 직접 문의해 주세요. 병원에서 필요한 도움도 별도로 확인해야 해요.</p></section><button type="button" class="travel-future-action" disabled aria-disabled="true">택시 앱 연결 · 준비 중</button>
     <p class="travel-hint">현재는 택시 호출, 배차, 요금 조회, 결제, 의료기관 도움 요청이 실행되지 않아요.</p>
   </div>`;
  }
  const stepNames=['출발지','이동 도움','내용 확인'];
  const steps=[1,2,3].map(n=>`<span class="v19-progress-item ${n===taxiStep?'current':''}" ${n===taxiStep?'aria-current="step"':''}><b>${n}</b><small>${stepNames[n-1]}</small></span>`).join('');
  const controls=`<div class="travel-stage-actions">${taxiStep>1?button('taxi-prev','이전 단계'):''}${taxiStep<3?button('taxi-next',taxiStep===1?'다음 · 보조기구 선택':'선택 내용 확인'):''}</div>`;
  return `<section class="travel-builder" data-taxi-builder aria-label="이동 준비 3단계 가상 시연"><div class="travel-progress" aria-label="3단계 준비 과정">${steps}</div>${inner}${controls}</section>`;
 }
 function taxiPanel(c){
  return `<div class="travel-screen" data-travel-screen="taxi">
    <div class="v19-travel-intro"><span class="v19-kicker">가상 체험 · 총 3단계</span><h3>병원에 갈 준비를 정리해요</h3><p>일반 택시 또는 이동지원 확인 중 하나를 선택해 필요한 준비사항을 살펴보세요.</p></div>
    <div class="travel-choice-grid" role="group" aria-label="이동 방법 선택">
      <button type="button" class="travel-choice" data-comfort="taxi-option" data-choice="regular" aria-pressed="${taxiChoice==='regular'}"><span class="travel-choice-icon" aria-hidden="true">${travelSvg('taxi')}</span><strong>일반 택시</strong><small>외부 앱에서 직접 호출해요</small></button>
      <button type="button" class="travel-choice" data-comfort="taxi-option" data-choice="assisted" aria-pressed="${taxiChoice==='assisted'}"><span class="travel-choice-icon" aria-hidden="true">${travelSvg('assist')}</span><strong>이동지원 확인</strong><small>휠체어·부축 등 가능 여부 문의</small></button>
    </div>
    <div data-taxi-steps>${taxiChoiceDetails()}</div>
    ${taxiBuilder(c)}
    <p class="travel-limitation"><strong>이 화면에서는 택시가 호출되지 않아요.</strong> 택시 예약·요금 조회·결제·배차 및 병원 지원 요청은 연결되지 않았어요. 의료적 이송이 필요한 경우 일반 택시를 대안으로 판단하지 마세요.</p>
  </div>`;
 }
 function documents(c){
  const docs=c.publication?.documents||[];
  return `<p class="comfort-document-intro">${c.source==='independent'?'독립 예시 자료이며 A3 발행본이 아니에요.':'현재 승인·발행된 문서만 열 수 있어요.'} PDF 내용을 복약 시각이나 처방으로 자동 변환하지 않아요. 이미 내려받은 PDF는 철회 후 회수할 수 없어요.</p>${['MEDICATION','GENERAL'].map(cat=>`<section class="comfort-document-group"><h3>${cat==='MEDICATION'?'복약 관련 PDF':'일반 안내문'}</h3>${docs.filter(d=>(d.category||'GENERAL')===cat).map(d=>`<article class="comfort-document-item"><strong>${esc(d.name)}</strong><p>${cat==='MEDICATION'?'복약 관련 발행 자료예요. 정확한 내용은 원문을 확인해 주세요.':'의료진이 제공한 상세 안내문이에요. 필요한 내용을 원문으로 확인할 수 있어요.'}</p>${button('document-open','안내문 열어보기 (PDF)',`data-id="${esc(d.id)}"`)}</article>`).join('')||'<p>이 분류에 제공된 문서가 없어요.</p>'}</section>`).join('')}`;
 }
 function snapshotForms(node){return [...node.querySelectorAll('form')].map(f=>({kind:f.dataset.comfortForm,id:f.dataset.id,values:[...f.elements].filter(e=>e.name).map(e=>({name:e.name,value:e.value,checked:e.checked}))}));}
 function restoreForms(drafts){for(const draft of drafts){const f=[...dialog.querySelectorAll('form')].find(f=>f.dataset.comfortForm===draft.kind&&f.dataset.id===draft.id);if(f)for(const v of draft.values){const e=f.elements.namedItem(v.name);if(e){e.value=v.value;if(e.type==='checkbox')e.checked=v.checked;}}}}
 function hasUnsaved(){return !!(adapter.hasUnsaved?.()||(dialog?.classList.contains('comfort-inline')&&JSON.stringify(snapshotForms(dialog))!==JSON.stringify(savedForms)));}
 function permitNavigation(){
  if((saving||hasUnsaved())&&!window.confirm(saving?'대기 중인 저장을 취소하고 이동할까요?':'아직 저장하지 않은 입력이 있어요. 입력을 버리고 이동할까요?'))return false;
  if(saving)pendingSave?.abort();return true;
 }
 function draw(preserve=false){
  const folds=dialog?.querySelector('#comfort-title')?[...dialog.querySelectorAll('details[id]')].map(e=>({id:e.id,open:e.open})):null;
  const inline=dialog?.classList.contains('comfort-inline'),mount=inline?dialog.parentElement:document.body;
  const drafts=preserve&&dialog?snapshotForms(dialog):[],oldScroll=dialog?.scrollTop||0;
  if(dialog){dialog.remove();dialog=null;}
  const c=context(),data=currentData();dialog=document.createElement(inline?'section':'dialog');dialog.id='comfort-dialog';dialog.className='comfort-dialog'+(inline?' comfort-inline':'');dialog.setAttribute('aria-labelledby','comfort-title');
  const title=inline?'알림':{settings:'알림 관리',inbox:'앱 내 알림함',map:'병원 위치·길찾기',taxi:'택시·이동지원 준비',documents:'안내 문서'}[mode];
  const body=inline?`<section id="reminder-settings" aria-label="알림 설정">${settings(c,data)}</section><details id="reminder-inbox" class="reminder-group" open><summary><h2 id="inbox-title">최근 알림 내역</h2><small>받은 안내와 확인 상태</small></summary><div data-live-inbox>${inbox(c,data)}</div></details>`:mode==='map'?maps(c):mode==='taxi'?taxiPanel(c):documents(c);
  dialog.innerHTML=`<header><h${inline?'1':'2'} id="comfort-title">${title}</h${inline?'1':'2'}>${inline?'':button('close','닫기')}</header><p class="comfort-scope">${inline?'앱을 열었을 때 확인하는 로컬 알림이에요. 백그라운드·외부 메시지 발송은 하지 않아요.':mode==='map'?'길찾기는 주소 확인 후 외부 지도에서 열려요. 실제 예약이나 병원 시스템 연동은 아니에요.':mode==='taxi'?'화면 구성 시연입니다. 실제 택시 호출·예약·결제 및 이동지원기관 연동은 하지 않아요.':'앱 내 시연입니다. 실제 의료 안내와 문서의 발행 범위만 확인해 주세요.'}</p><p id="comfort-notice" role="status" tabindex="-1">${esc(notice)}</p>${inline?button('reload','최신 설정 다시 읽기',(loaded?.error||notice.includes('다른 탭')||notice.startsWith('저장하지 못했어요.')?'':'hidden')):''}${loaded?.error?'<p role="alert">저장 자료를 읽지 못했어요. 기존 자료를 덮어쓰지 않아요.</p>':''}${body}`;
  mount?.append(dialog);
  if(inline){const options=dialog.querySelector('#reminder-options');if(options)dialog.append(options);for(const f of folds||[]){const el=dialog.querySelector('#'+f.id);if(el)el.open=f.open;}}
  if(!inline){dialog.addEventListener('cancel',e=>{e.preventDefault();close()});dialog.showModal();fitDialog();}
  savedForms=snapshotForms(dialog);restoreForms(drafts);
  dialog.scrollTop=oldScroll;if(!inline||notice)dialog.querySelector(inline?'#comfort-notice':'[data-comfort=close]')?.focus({preventScroll:true});
 }
 function refreshHub(){if(!dialog?.isConnected||!dialog.classList.contains('comfort-inline'))return;const c=context(),fresh=createReminderRepository(storage,c).load();refreshUpcoming();const el=dialog.querySelector('[data-live-inbox]');if(el){const html=(fresh.error?'<p role="alert">저장 자료를 읽지 못했어요. 알림을 숨겼어요.</p>':'')+inbox(c,fresh.data);if(el.innerHTML!==html){const id=el.contains(document.activeElement)?document.activeElement.dataset.id:null;el.innerHTML=html;if(id){const next=[...el.querySelectorAll('[data-id]')].find(e=>e.dataset.id===id);(next||dialog.querySelector('[data-comfort=reload]'))?.focus({preventScroll:true});}}}}
 function patientNavigation(main){
  const header=document.querySelector('.topline'),side=document.querySelector('.side'),nav=header?.querySelector('.patient-journey,.connected-controls');
  // Apply visual branding only; never replace publication/patient content.
  const sideBrand=side?.querySelector('.side-brand');
  if(sideBrand){
   const mark=sideBrand.querySelector('.side-logo');
   if(mark)mark.innerHTML='<svg viewBox="0 0 48 48" width="39" height="39" fill="none" aria-hidden="true"><circle cx="24" cy="8" r="4" fill="currentColor"/><path d="M8 38C9 28 16 20 24 20c8 0 15 8 16 18" stroke="currentColor" stroke-width="5.5" stroke-linecap="round"/><path d="M18 36c1-6 3-9 6-9s5 3 6 9" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>';
   const heading=sideBrand.querySelector('b'),subtitle=sideBrand.querySelector('small');
   if(heading)heading.textContent='나의 퇴원안내';
   if(subtitle)subtitle.textContent='퇴원 후 필요한 안내';
   const sectionLabel=side.querySelector('.side-cap');
   if(sectionLabel)sectionLabel.textContent='나의 퇴원안내';
  }
  header?.querySelector('.top-profile')?.remove();
  if(nav){
   // Keep the normal 통합 홈 link in the visible sidebar and mobile journey.
   nav.classList.add('patient-sidebar-journey');for(const b of nav.querySelectorAll('button')){const previous=['back','patient-back'].includes(b.dataset.action),next=['next','patient-next'].includes(b.dataset.action);if(previous||next){const label=previous?'이전':'다음';b.setAttribute('aria-label',label);b.title=label;b.innerHTML=`<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="${previous?'m15 5-7 7 7 7':'m9 5 7 7-7 7'}"/></svg>`;}}
   side?.querySelector('.side-brand')?.after(nav);
   const mobile=nav.cloneNode(true);mobile.classList.add('patient-mobile-journey');mobile.classList.remove('patient-sidebar-journey');const toolbar=document.createElement('div');toolbar.className='patient-mobile-toolbar';toolbar.append(mobile);main.prepend(toolbar);
  }
  const example=header?.querySelector('.independent-demo-link');if(example){example.textContent='최신 독립 예시 보기';side?.querySelector('.side-end')?.append(example);}
  const font=header?.querySelector('[data-action=font]');if(font){const tools=document.createElement('div');tools.className='patient-page-tools';tools.append(font);if(context().publication){const guide=document.createElement('button');guide.type='button';guide.className='patient-header-help';guide.dataset.comfort='tour';guide.textContent='사용 안내';(header?.querySelector('.meta')||tools).append(guide);}const mobile=main.querySelector('.patient-mobile-journey');if(mobile)mobile.parentElement.append(tools);else main.prepend(tools);}
 }
 function attachNotifications(hub,c){
  if(dialog?.classList.contains('comfort-inline')&&openedPublication===pubKey(c)){hub.append(dialog);refreshHub();}
  else{close();refreshPreferences();openedPublication=pubKey(c);mode='settings';notice='';dialog=document.createElement('section');dialog.className='comfort-inline';hub.append(dialog);draw();}
 }
 function decorate(){
  const c=context();if(!bound(c))return;
  const bottom=document.querySelector('.bottom-nav');if(c.source==='independent'&&bottom&&!bottom.querySelector('[data-nav="profile"]')){const b=document.createElement('button');b.dataset.nav='profile';b.innerHTML='<svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg>내 정보';if(c.view==='profile')b.setAttribute('aria-current','page');bottom.append(b);}
  bottom?.classList.add('comfort-five-tabs');
  const main=document.querySelector('#main-content');if(!main)return;if(main.dataset.comfortDecorated){refreshHub();return;}main.dataset.comfortDecorated='true';patientNavigation(main);
  const oldInline=dialog?.classList.contains('comfort-inline');if(oldInline&&c.view!=='reminders')close();
  const add=(where,html)=>{if(where)where.insertAdjacentHTML('beforeend',html)};
  if(c.publication){
   const hub=main.querySelector('[data-reminder-hub]');
   if(hub)attachNotifications(hub,c);
   if(!main.querySelector('.v12-read-note'))add(main.querySelector('.insight-strip,.overview-layout'),'<div class="integrated-documents">'+button('documents',c.publication.documents?.length?'안내문 열어보기 (PDF)':'안내 문서 제공 여부 확인')+'</div>');
   if(c.view==='profile')add(main.querySelector('.profile-layout'),'<section class="comfort-quick" aria-label="알림과 사용 안내">'+button('settings','알림 관리')+button('inbox','알림함')+'</section>');
   if(c.section==='medication'&&c.view==='detail')add(main.querySelector('.detail-secondary-row'),'<div class="comfort-med-link">'+button('settings','복약 관련 개인 알림')+'</div>');
  }else if(c.view==='reminders'){const hub=document.createElement('div');hub.dataset.reminderHub='';main.append(hub);attachNotifications(hub,c);}else add(main,'<section class="comfort-quick">'+button('inbox','발행·철회 알림함')+'</section>');

  if(c.publication&&['schedule','help'].includes(c.view)){
   const appointments=c.publication.items.filter(i=>i.section==='followup');
   const routeCards=appointments.map(i=>{
    const confirmed=!!directionsURL(i.appointment?.destination);
    return `<button type="button" class="travel-entry travel-route" data-comfort="map" data-id="${esc(i.id)}" ${confirmed||c.source==='independent'?'':'disabled'}><span class="travel-entry-icon" aria-hidden="true">${travelSvg('map')}</span><span class="travel-entry-text"><strong>${confirmed?'병원 길찾기':'병원 위치 확인'}</strong><small>${esc(i.title)} · ${confirmed?'발행된 주소로 외부 지도 열기':'주소가 없어 지도는 열 수 없어요'}</small></span><span class="travel-entry-arrow" aria-hidden="true">→</span></button>`;
   }).join('');
   const route=routeCards||(c.source==='independent'?'<button type="button" class="travel-entry travel-route" data-comfort="map"><span class="travel-entry-icon" aria-hidden="true">🗺️</span><span class="travel-entry-text"><strong>병원 길찾기</strong><small>병원 주소 확인 방법 보기</small></span><span class="travel-entry-arrow" aria-hidden="true">→</span></button>':'<p class="travel-no-address">발행된 외래 목적지가 없어 길찾기를 시작할 수 없어요.</p>');
   const travelMarkup=`<section class="comfort-map-section travel-entry-section" aria-labelledby="travel-section-title"><div class="travel-section-heading"><span class="v19-kicker">병원 방문 준비</span><h2 id="travel-section-title">어떻게 이동할까요?</h2><p>지도 확인과 택시·이동지원 준비를 따로 살펴볼 수 있어요.</p></div><div class="travel-entry-grid">${route}<button type="button" class="travel-entry travel-taxi" data-comfort="taxi"><span class="travel-entry-icon" aria-hidden="true">${travelSvg('taxi')}</span><span class="travel-entry-text"><strong>택시·이동지원</strong><small>차량과 도움이 필요한 부분 미리 정리하기</small></span><span class="travel-entry-arrow" aria-hidden="true">→</span></button></div><p class="travel-section-note">실제 예약·차량 호출이나 위치 추적은 하지 않아요. 확인된 병원 주소가 없으면 외부 지도를 열지 않습니다.</p></section>`;
   // Keep the approved primary information first: appointment before travel, help cards before travel.
   const anchor=c.view==='schedule'
     ?(main.querySelector('.schedule-layout .v12-confirmed')||main.querySelector('.schedule-layout .timeline')||main.querySelector('.schedule-layout .sublead'))
     :(main.querySelector('.service-page .services-panel')||main.querySelector('.service-page .service-lead'));
   if(anchor)anchor.insertAdjacentHTML('afterend',travelMarkup);else add(main,travelMarkup);
  }
 }
 document.addEventListener('click',e=>{
  const nav=e.target.closest('[data-nav],[data-view],[data-action=home],[data-action=back],[data-action=next],[data-action=patient-home],[data-action=patient-back],[data-action=patient-next],[data-action=logout],.patient-sidebar-journey a,.patient-mobile-journey a,.independent-demo-link');if(nav&&!permitNavigation()){e.preventDefault();e.stopImmediatePropagation();return;}
  const b=e.target.closest('[data-comfort]');if(!b||b.disabled)return;e.preventDefault();e.stopImmediatePropagation();const a=b.dataset.comfort,c=context();if(!bound(c))return;
  if(a==='close'){close();return;}
  if(a==='settings'||a==='inbox'){if(!permitNavigation())return;if(c.view!=='reminders')adapter.navigate('reminders');const el=document.querySelector(a==='inbox'?'#reminder-inbox':b.dataset.reminderTarget==='followup'?'#reminder-followup':'#reminder-personal');if(el?.tagName==='DETAILS')el.open=true;el?.scrollIntoView({block:'start'});el?.querySelector('summary,input,button')?.focus({preventScroll:true});return;}
  if(a==='reload'){if(!permitNavigation())return;refreshPreferences();openedPublication=pubKey(context());notice='최신 설정을 다시 읽었어요.';draw();return;}
  if(['documents','map','taxi'].includes(a)){open(a,b,b.dataset.id);return;}
  if(a==='taxi-option'&&mode==='taxi'&&dialog){const choice=b.dataset.choice;if(!['regular','assisted'].includes(choice))return;taxiChoice=choice;dialog.querySelectorAll('[data-comfort=taxi-option]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.choice===choice)));const target=dialog.querySelector('[data-taxi-steps]');if(target)target.innerHTML=taxiChoiceDetails();if(taxiStep===3)dialog.querySelector('[data-taxi-builder]').outerHTML=taxiBuilder(c);return;}
  if((a==='taxi-next'||a==='taxi-prev')&&mode==='taxi'&&dialog){taxiStep=Math.max(1,Math.min(3,taxiStep+(a==='taxi-next'?1:-1)));dialog.querySelector('[data-taxi-builder]').outerHTML=taxiBuilder(c);dialog.querySelector('.travel-stage h3')?.focus({preventScroll:true});if(taxiStep===3)dialog.scrollTop=0;else dialog.querySelector('[data-taxi-builder]')?.scrollIntoView({block:'nearest'});return;}
  if(a==='map-fallback'){dialog.querySelector('#map-fallback').hidden=false;dialog.querySelector('textarea').focus();return;}
  if(a==='document-open'){const id=b.dataset.id;close();adapter.openDocument(id);return;}
  if(a==='tour'){
   if(!c.publication||!permitNavigation())return;
   const bridge={capture:()=>adapter.capture(),show:s=>adapter.showTour(s.screen),target:name=>{const selectors={'today-task':'.tasks .task',detail:'.detail-wrap',schedule:'.schedule-layout',help:'.v17-help',reminders:'.reminder-sections',profile:'.profile-layout','schedule-tab':'.side [data-view=schedule],.side [data-nav=schedule]','help-tab':'.side [data-view=help],.side [data-nav=help]','reminders-tab':'.side [data-view=reminders],.side [data-nav=reminders]','profile-tab':'.side [data-view=profile],.side [data-nav=profile]'};const navName=({'schedule-tab':'schedule','help-tab':'help','reminders-tab':'reminders','profile-tab':'profile'})[name]||null;return navName?[...document.querySelectorAll(selectors[name]+`,.bottom-nav [data-view=${navName}],.bottom-nav [data-nav=${navName}]`)].find(e=>e.getClientRects().length):document.querySelector(selectors[name]);},context:()=>c.source==='independent'?'독립 합성 예시':'현재 발행된 합성 안내 · v'+c.publication.planVersion,restore:x=>adapter.restore(x),returnTarget:()=>document.querySelector('[data-comfort="tour"]')};
   openPatientTour(b,bridge,{brief:true,steps});return;
  }
  if(a==='seen'){write(next=>next.seen[b.dataset.id]=true);return;}
  if(a==='personal-edit'){const m=plan().personal.find(m=>m.id===b.dataset.id),f=dialog.querySelector('[data-comfort-form="personal"]');if(!m)return;for(const k of ['id','label','date','time','lead'])f.elements[k].value=m[k];f.scrollIntoView({block:'center'});f.elements.label.focus();return;}
  if(a==='personal-toggle'||a==='personal-delete')changePlan(s=>{if(a==='personal-delete')s.personal=s.personal.filter(m=>m.id!==b.dataset.id);else{const m=s.personal.find(m=>m.id===b.dataset.id);if(m)m.enabled=!m.enabled;}});
 },true);
 document.addEventListener('input',e=>{
  if(mode!=='taxi'||!dialog||!dialog.contains(e.target)||!taxiDraft)return;
  const field=e.target.dataset.taxiField;
  if(['pickup','demoDestination'].includes(field))taxiDraft[field]=String(e.target.value).slice(0,80);
 },true);
 document.addEventListener('change',e=>{
  if(mode!=='taxi'||!dialog||!dialog.contains(e.target)||!taxiDraft)return;
  const el=e.target,field=el.dataset.taxiField,group=el.dataset.taxiGroup;
  if(['destinationId','companion'].includes(field)){taxiDraft[field]=String(el.value);if(field==='destinationId'){const builder=dialog.querySelector('[data-taxi-builder]');if(builder)builder.outerHTML=taxiBuilder(context());}return;}
  if(!['equipment','arrivalHelp'].includes(group))return;
  const allowed=(group==='equipment'?gearChoices:helpChoices).map(x=>x[0]);
  if(!allowed.includes(el.value))return;
  if(el.checked){taxiDraft[group]=el.value==='none'?['none']:[...taxiDraft[group].filter(v=>v!=='none'&&v!==el.value),el.value];}
  else taxiDraft[group]=taxiDraft[group].filter(v=>v!==el.value);
  dialog.querySelectorAll('[data-taxi-group="'+group+'"]').forEach(input=>{input.checked=taxiDraft[group].includes(input.value)});
 },true);
 document.addEventListener('submit',e=>{
  const f=e.target;if(!f.matches('[data-comfort-form]'))return;e.preventDefault();e.stopImmediatePropagation();const values=new FormData(f),kind=f.dataset.comfortForm,submitted={kind,id:f.dataset.id};
  if(kind==='zone'){const zone=String(values.get('custom-zone')||values.get('zone')).trim();if(!validZone(zone)){notice='시간대를 확인해 주세요. 목록에서 지역을 선택하거나 직접 입력한 지역 코드를 확인하세요.';draw(true);return;}write(n=>n.zone=zone,submitted);}
  if(kind==='personal')changePlan(s=>{const m={id:String(values.get('id')||crypto.randomUUID()),label:String(values.get('label')).trim(),date:String(values.get('date')),time:String(values.get('time')),lead:Number(values.get('lead')),enabled:s.personal.find(x=>x.id===String(values.get('id')))?.enabled??true};if(!Number.isFinite(localInstant(m.date,m.time,currentData().zone))||localInstant(m.date,m.time,currentData().zone)<=Date.now())throw Error('유효한 미래 날짜·시각을 입력해 주세요.');const duplicate=s.personal.find(x=>x.id!==m.id&&x.date===m.date&&x.time===m.time&&x.lead===m.lead&&x.label===m.label);if(duplicate)throw Error('같은 개인 알림이 이미 있어요.');s.personal=s.personal.filter(x=>x.id!==m.id);s.personal.push(m);},submitted);
  if(kind==='followup')changePlan(s=>{const item=context().publication.items.find(i=>i.id===f.dataset.id&&i.appointment);if(!item)throw Error('확정 일정이 없어요.');if(values.has('enabled')&&!values.has('dayBefore')&&!values.has('sameDay'))throw Error('하루 전 또는 당일 알림을 선택해 주세요.');s.followups[item.id]={enabled:values.has('enabled'),dayBefore:values.has('dayBefore'),sameDay:values.has('sameDay'),time:String(values.get('time'))};},submitted);
  if(kind==='important')changePlan(s=>s.important=values.has('important'),submitted);
 },true);
 document.addEventListener('keydown',e=>{
  if(e.key==='Tab'&&dialog?.open){const nodes=[...dialog.querySelectorAll('button:not([disabled]),input:not([type=hidden]),select,a[href],textarea')].filter(n=>n.getClientRects().length);if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes.at(-1)?.focus()}else if(!e.shiftKey&&document.activeElement===nodes.at(-1)){e.preventDefault();nodes[0]?.focus()}}
 });
 function changedPublication(){
  if(!dialog)return;
  notice='발행 상태가 바뀌었어요. 이전 알림은 비활성화됐어요. 새 발행본은 다시 설정하세요.';
  if(mode==='inbox'){openedPublication=pubKey(context());refreshInbox();}else draw();
 }
 window.addEventListener('patient-render',()=>{decorate();if(dialog&&(!bound(context())||openedPublication!==pubKey(context())))changedPublication();});
 window.addEventListener('storage',e=>{
  refreshHub();
  if(repo&&(e.key===repo.key||e.key===null)&&dialog){
   // A delayed storage event must not erase the failed compare-and-write result.
   if(!notice.startsWith('저장하지 못했어요.'))notice='다른 탭에서 설정이 바뀌었어요. 편집 중인 설정은 저장할 수 없어요. 입력을 확인한 뒤 최신 설정을 다시 읽어 주세요.';
   if(mode==='inbox')refreshInbox();else{dialog.querySelector('#comfort-notice').textContent=notice;dialog.querySelector('[data-comfort=reload]')?.removeAttribute('hidden');refreshUpcoming();}
  }
  if(dialog&&openedPublication!==pubKey(context()))changedPublication();
 });
 // Foreground refresh never reloads an editable repository's compare-and-write token.
 function tick(){refreshHub();if(!dialog||document.visibilityState!=='visible')return;if(openedPublication!==pubKey(context()))changedPublication();else if(mode==='inbox')refreshInbox();else if(mode==='settings')refreshUpcoming();}
 window.addEventListener('beforeunload',e=>{if(saving||hasUnsaved()){e.preventDefault();e.returnValue='';}});
 window.addEventListener('focus',tick);document.addEventListener('visibilitychange',tick);
 let timer=setInterval(tick,60000);
 window.addEventListener('pagehide',()=>clearInterval(timer));
 window.addEventListener('pageshow',()=>{clearInterval(timer);timer=setInterval(tick,60000);tick();});
 decorate();
}
