import {gradeMeter,priorityDomains} from './review-display.js';
import {validDestination} from '../shared/destinations.js';
import {stagePublishedDocuments} from '../shared/published-documents.js';
import {openPatientTour} from './tutorial-tour.js';
import {chooseAction,TIER_LABELS} from '../a2/engine.js';
import {editEvaluation,commitEvaluation} from '../shared/evaluation-edit.js';
import {DOMAINS as ENGINE_DOMAINS,SOURCES} from '../a2/data.js';
import {CASES,DOMAINS,SECTIONS} from './data.js';
import {recordsForPatient,findSource,usableSource,CASE_MISSIONS} from './source-library.js';
import {deepCopy,now,evaluateA2,makeInitial,currentPublished,blockers,fingerprint,mayApprove,mayPublish,audit,publishedPayload,makeRevision,linkedSources,validItemSources,canRequestRevocation,validAppointment} from './workflow.js';
import {STORAGE_KEYS,loadRepository,initializePatients,persistRepository} from './storage.js';
import {HANDOFF_KEY,readPendingHandoff,clearPendingHandoff} from '../shared/handoff.js';
import {applyAssessmentHandoff} from '../shared/apply-handoff.js';
import {encounterFor,projectCurrentPublication} from '../shared/publication.js';
const $=s=>document.querySelector(s);
const safe=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const dateTime=v=>v?new Date(v).toLocaleString('ko-KR',{year:'numeric',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
const roleLabel={NURSE:'작성 간호사',PHARMACIST:'약사',PHYSICIAN:'담당 의사',APPROVER:'지정 최종 승인자',system:'시스템'};
const statusLabel={DRAFT:'초안 작성 중',REVIEW_REQUESTED:'의료진 검토 요청',CHANGES_REQUESTED:'보완 요청',APPROVED:'승인 완료',PUBLISHED:'발행 완료',REVOKED:'발행 철회'};
const fileStore=new Map();
const storage=(()=>{try{return localStorage}catch{return null}})();
const normalState=loadRepository(storage,STORAGE_KEYS.normal),studyState=loadRepository(storage,STORAGE_KEYS.study);
const repository=initializePatients(normalState.records),studyRepo=studyState.records;
let practiceMode=false,priorContext=null,learningUnit='intro',learningHint=0,sourceTarget=null,learnFilter='';
let selectedId=CASES[0].id,activeTab='plan',selectedDomain='function',role='NURSE',previewMode='draft',collapsed=false,previewCollapsed=true,screen='plan';
const requestedPatient=new URLSearchParams(window.location.search).get('patient')||new URLSearchParams(window.location.search).get('handoff');
if(CASES.some(c=>c.id===requestedPatient))selectedId=requestedPatient;
const screens=['patients','assessment','plan','patient-preview','compare','learn'];
const initialScreen=new URLSearchParams(location.search).get('screen');
if(screens.includes(initialScreen))screen=initialScreen;
if(new URLSearchParams(location.search).get('mode')==='study'&&studyRepo[selectedId])practiceMode=true;
let journey=[],journeyIndex=-1;
let expandedPlanItems=new Set(['today']);
try{previewCollapsed=localStorage.getItem('a3-preview-collapsed-v04')!=='0'}catch{}
try{collapsed=localStorage.getItem('a3-rail-collapsed-v04')==='1'}catch{}
let toastTimer;
let bootstrapping=true;
function currentStore(){return practiceMode?studyRepo:repository}
function get(){return currentStore()[selectedId]}
function validSource(id,type,target){return usableSource(findSource(id,selectedId,get().unlockedSources||[]),type,target,selectedId)}
function save(){try{persistRepository(storage,practiceMode?STORAGE_KEYS.study:STORAGE_KEYS.normal,practiceMode?studyState:normalState);$('#save-state').textContent='저장됨';return true}catch{$('#save-state').textContent='저장 불가';if(!bootstrapping)announce('로컬 저장에 실패했습니다. 브라우저 저장 공간과 다른 탭의 변경을 확인해 주세요.');return false}}
function saveWorkflow(before){if(save())return true;currentStore()[selectedId]=before;render();return false;}
function announce(message){const t=$('#toast');t.textContent=message;t.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{t.hidden=true},4200)}

function refreshIntegrationInbox(){
 const label=$('#integrated-a3-status'),button=$('#integrated-receive'),discard=$('#integrated-discard');
 try{
  const packet=readPendingHandoff(storage);
  if(!packet){label.textContent='대기 중인 A2 평가 없음 · A2에서 먼저 인계하세요.';button.disabled=true;discard.hidden=true;return;}
  label.textContent=packet.patientId+' · '+packet.capturedAt.slice(0,10)+' 평가가 도착했습니다. 반영 전 검토 상태를 확인하세요.';
  button.disabled=button.hasAttribute('aria-busy')||practiceMode||packet.patientId!==selectedId;discard.hidden=false;
  if(packet.patientId!==selectedId)label.textContent+=' 해당 환자를 선택한 뒤 반영하세요.';
 }catch(error){
  label.textContent='인계 자료를 검증할 수 없습니다. 삭제 또는 A2에서 재작성하세요. ('+(error?.message||'검증 실패')+')';
  button.disabled=true;discard.hidden=false;
 }
}
async function receiveIntegratedAssessment(){
 if(practiceMode){announce('실습 모드에서는 일반 자료 인계 불가. 일반 작업으로 돌아가세요.');return;}
 if(normalState.error){announce('기존 A3 저장자료 오류가 있어 인계를 중지했습니다. 원본을 덮어쓰지 않습니다.');return;}
 const receiveButton=$('#integrated-receive');
 if(receiveButton.hasAttribute('aria-busy'))return;
 receiveButton.setAttribute('aria-busy','true');receiveButton.disabled=true;
 try{
  const packet=readPendingHandoff(storage);
  if(!packet){refreshIntegrationInbox();return;}
  if(packet.patientId!==selectedId)throw Error('선택 환자와 인계 환자가 다릅니다. 해당 환자를 먼저 선택하세요.');
  if(storage.getItem(STORAGE_KEYS.normal)!==normalState.serialized)throw Error('A3 저장자료가 다른 탭에서 변경됐습니다. 새로고침 후 다시 확인하세요.');
  const original=repository[selectedId];
  if(!original)throw Error('A3에 등록되지 않은 환자입니다.');
  const before=JSON.stringify(original);
  const {record:next,duplicate}=applyAssessmentHandoff(original,packet);
  if(!duplicate){
   if(!window.confirm(packet.patientId+' 평가를 A3에 반영할까요? 기존 검토·승인은 무효화되며 환자 공개 항목은 재검토가 필요합니다.'))return;
   // Let storage events from other tabs reach this document after the blocking dialog.
   await new Promise(resolve=>setTimeout(resolve,0));
   if(practiceMode||selectedId!==packet.patientId||repository[selectedId]!==original||JSON.stringify(original)!==before)
    throw Error('확인 중 작업 대상이 변경됐습니다. 다시 확인하세요.');
   if(JSON.stringify(readPendingHandoff(storage))!==JSON.stringify(packet))throw Error('확인 중 인계 자료가 변경됐습니다. 최신 자료를 다시 확인하세요.');
   repository[packet.patientId]=next;
   try{persistRepository(storage,STORAGE_KEYS.normal,normalState);}
   catch(error){repository[packet.patientId]=original;throw Error('A3 저장 실패·동시 탭 충돌: '+(error?.message||'재시도 필요'));}
  }
  selectedId=packet.patientId;activeTab='issues';selectedDomain='function';previewMode='draft';
  render();
  try{
   if(!clearPendingHandoff(storage,packet.assessmentId))announce('평가는 저장됐지만 다른 탭에서 대기자료가 변경됐습니다. 확인하세요.');
   else announce(duplicate?'동일 평가가 이미 인계됐습니다.':'A2 평가 저장 완료. 자료·안내 항목을 다시 검토하세요.');
  }catch{announce('평가는 저장됐지만 인계함 정리에 실패했습니다. 확인하세요.');}
  refreshIntegrationInbox();
 }catch(error){announce('인계 실패: '+(error?.message||'검증 오류'));}
 finally{receiveButton.removeAttribute('aria-busy');refreshIntegrationInbox();}
}

function docsAvailable(){return new Set([...fileStore.keys()])}
function canEdit(){return !['PUBLISHED','REVOKED'].includes(get().draft.status)}
function protectEdit(){if(!canEdit()){announce('발행된 계획은 편집할 수 없습니다. 새 버전 개정을 선택하세요.');return false}return true}
function mutateBeforeEdit(){if(!protectEdit())return false;const d=get().draft;if(d.status==='APPROVED'||d.status==='REVIEW_REQUESTED'||d.status==='CHANGES_REQUESTED'){d.status='DRAFT';d.approval=null;audit(get(),role,'APPROVAL_INVALIDATED','계획 또는 문서 변경으로 재검토 필요')}return true}
function permitted(section){if(role==='APPROVER')return true;if(['medication'].includes(section))return ['PHARMACIST','PHYSICIAN'].includes(role);if(['followup','warning'].includes(section))return role==='PHYSICIAN';return ['NURSE','PHYSICIAN'].includes(role)}
function canResolve(domain){if(role==='APPROVER')return true;if(domain==='medication')return ['PHARMACIST','PHYSICIAN'].includes(role);if(domain==='medical')return role==='PHYSICIAN';return ['NURSE','PHYSICIAN'].includes(role)}
function noBlock(){return blockers(get(),docsAvailable())}
function viewTitle(){const d=get().draft,p=currentPublished(get());return p&&d.status==='PUBLISHED'?'발행 완료':d.status==='DRAFT'&&p?'새 버전 초안':statusLabel[d.status]||'계획 상태'}
function renderGate(){const r=get(),blocked=noBlock(),p=currentPublished(r),isPublished=r.draft.status==='PUBLISHED';
 const hard=blocked.length;let kind=hard?'':'good';if(isPublished)kind='issued';
 const title=isPublished?'계획이 발행되었습니다':hard?`발행 전 해결할 사항 ${hard}건`:'발행 전 필수 확인사항 없음';
 const brief=isPublished?'승인된 계획 및 이력을 확인할 수 있습니다.':hard?'눌러서 해결할 항목을 확인하세요.': '담당자 검토와 승인을 진행하세요.';
 $('#gate-banner').className=`gate-banner ${kind}`;
 $('#gate-banner').innerHTML=`<span class="gate-left"><span class="gate-icon" aria-hidden="true">${hard?'!':'✓'}</span><span><strong>${safe(title)}</strong><span class="gate-sub">${safe(brief)}</span></span></span><span class="gate-number">${isPublished?'이력 보기':hard?`${hard}건 확인`:'확인하기'}　→</span>`;
 $('#gate-banner').setAttribute('aria-label',title+' · 상세 항목 보기');
 if(screen==='assessment'){const evaluation=evaluateA2({values:r.a2Values});const summary=evaluation.reduce((n,d)=>n+d.requiredDone,0);$('#gate-banner .gate-sub').textContent=`평가 필수 ${summary}/18 · 미평가·상충 ${evaluation.filter(d=>d.status!=='READY').length}영역 · 우선 검토 ${evaluation.filter(d=>d.status==='READY'&&d.grade===3).length}영역 · ${r.a2Dirty?'변경 평가 반영 필요 · ':''}`+brief;}
 const ready=r.assessment.domainResults.filter(d=>d.status==='READY').length;
 $('#context-summary').textContent=`평가 확정 ${ready}/6영역 · 우선 검토 ${priorityDomains(r).length}영역 · ${r.a2Dirty?'A2 변경 반영 필요':'계획에 인계된 평가'}`;
 $('#issue-count').textContent=r.draft.issues.filter(x=>x.status!=='RESOLVED').length||'';
 $('#workflow-state').textContent=viewTitle();
 $('#workflow-sub').textContent=p?`현재 발행본 v${p.snapshot.planVersion} · ${dateTime(p.snapshot.issuedAt)}`:'최근 수정 내용 저장됨';
 $('#version-chip').textContent=`${viewTitle()} · v${r.draft.version}`;
}

function renderDomains(){const r=get();$('#assessment-stamp').textContent=`A2 평가 ${r.assessment.id} · 규칙 ${r.assessment.ruleVersion}`;$('#help-assessment-ref').textContent=`A2 평가 ${r.assessment.id} · 규칙 ${r.assessment.ruleVersion}`;
 $('#domain-grid').innerHTML=r.assessment.domainResults.map((d,i)=>`<button class="domain ${selectedDomain===d.id?'selected':''}" data-domain="${d.id}" aria-pressed="${selectedDomain===d.id}"><div class="domain-top"><span class="domain-name">${safe(d.title)}</span><span class="domain-n">0${i+1}</span></div>${gradeMeter(d.status==='READY'?d.grade:null)}<div class="domain-meta"><span>필수 ${d.requiredDone}/${d.requiredTotal}</span><span class="grade ${d.status!=='READY'?'pending':d.grade===3?'priority':''}">${d.status==='CONFLICTING'?'상충':d.status==='UNKNOWN'?'미평가':d.grade+'등급'}</span></div></button>`).join('');
}
function fieldRefLabel(ref){const [id,key]=ref.split('.'),domain=ENGINE_DOMAINS.find(d=>d.id===id),field=domain?.fields.find(f=>f.id===key);return domain?domain.title+(field?' · '+field.label:' · 영역 자료'):'연결된 원천 항목';}
function sourceTitle(id){const s=findSource(id,selectedId,get().unlockedSources||[]);return s?s.title:'연결된 자료 없음'}
function renderPlan(){const r=get(),d=r.draft,readonly=!canEdit();const approvedMessage=readonly?'발행 완료된 계획은 수정할 수 없습니다. 새 버전 개정을 사용하세요.':'';
 $('#work-pane').innerHTML=`<div class="pane-head"><div><h3>환자용 계획 편집</h3><p>환자가 해야 할 행동부터 작성합니다. 항목별 출처와 직종 검토를 확인하세요.</p></div><div class="a3-plan-head-actions"><button type="button" class="mini-button" data-action="jump-followup">외래 일정 입력 ↗</button><span class="subtle-count">${d.items.filter(x=>x.verified).length}/${d.items.length} 확인됨</span></div></div>${approvedMessage?`<p class="notice">${safe(approvedMessage)}</p>`:''}
 ${d.items.map((item,i)=>`<details class="edit-card ${item.visibility==='INTERNAL'?'internal':''}" data-item="${safe(item.id)}" ${expandedPlanItems.has(item.id)?'open':''}><summary class="edit-title"><b>${String(i+1).padStart(2,'0')} · ${safe(item.title)}</b><span class="status-pill ${item.verified&&validItemSources(r,item)?'green':'red'}">${item.verified&&validItemSources(r,item)?'근거 확인됨':'확인 필요'}</span></summary><div class="edit-card-body">
 <label for="text-${safe(item.id)}">환자에게 전달할 안내문</label><textarea class="edit-textarea" id="text-${safe(item.id)}" data-edit="text" ${readonly?'disabled':''}>${safe(item.text)}</textarea>
 ${item.section==='followup'?`<fieldset class="a3-appointment" aria-label="외래 일정 입력">
 <legend>외래·검사 일정 (가상 입력)</legend>
 <p>실제 예약이 아니에요. <b>확정됨</b>으로 표시하고 날짜·시간·장소를 모두 입력한 뒤, 담당 의사가 안내를 확인하고 최종 승인·발행해야 환자용 일정에 표시돼요.</p>
 <div class="a3-appointment-fields">
 <label>일정 상태<select data-appointment="status" data-item-id="${safe(item.id)}" ${readonly?'disabled':''}><option value="PENDING" ${item.appointment?.status!=='CONFIRMED'?'selected':''}>미확정 / 확인 필요</option><option value="CONFIRMED" ${item.appointment?.status==='CONFIRMED'?'selected':''}>확정됨 (가상)</option></select></label>
 <label>날짜<input type="date" data-appointment="date" data-item-id="${safe(item.id)}" value="${safe(item.appointment?.date||'')}" ${readonly?'disabled':''}></label>
 <label>시간<input type="time" data-appointment="time" data-item-id="${safe(item.id)}" value="${safe(item.appointment?.time||'')}" ${readonly?'disabled':''}></label>
 <label>장소<input type="text" maxlength="160" placeholder="가상 진료 장소" data-appointment="place" data-item-id="${safe(item.id)}" value="${safe(item.appointment?.place||'')}" ${readonly?'disabled':''}></label>
 </div><details class="a3-destination" ${item.appointment?.destination?'open':''}><summary>병원 길찾기 목적지 (선택)</summary><p>실제 병원 공식 안내의 주소·지도 좌표를 대조한 경우에만 확인하세요. 현재 가상병원에 주소를 임의로 만들지 마세요. 이 확인은 실제 의료인 인증이 아닙니다. 변경 후 재검토·승인·발행이 필요합니다.</p><div class="a3-appointment-fields">${[['name','병원명'],['address','공식 병원 주소'],['latitude','위도'],['longitude','경도'],['sourceUrl','공식 확인 출처 HTTPS URL']].map(([field,label])=>`<label>${label}<input type="text" data-destination="${field}" data-item-id="${safe(item.id)}" value="${safe(item.appointment?.destination?.[field]||'')}" maxlength="${field==='sourceUrl'?500:180}" ${readonly?'disabled':''}></label>`).join('')}</div><label><input type="checkbox" data-destination="verified" data-item-id="${safe(item.id)}" ${item.appointment?.destination?.verified?'checked':''} ${readonly||!['PHYSICIAN','APPROVER'].includes(role)?'disabled':''}> 담당 의사/최종 승인자가 공식 주소·좌표와 대조함</label></details><small>확정 전에는 입력한 일시가 환자 B에 예약으로 나타나지 않아요. 역할: 담당 의사 또는 최종 승인자 검토.</small>
 </fieldset>`:''}
 <div class="edit-meta"><div><label>관련 원천자료</label><div class="multi-source-area"><div class="multi-source-list">${linkedSources(item).length?linkedSources(item).map(id=>`<div class="multi-source-row"><strong>${safe(sourceTitle(id))}</strong><span class="source-status">${validSource(id,'item',item.section)?'확인 자료':'재확인 필요'}</span><button type="button" class="mini-button" data-action="view-source" data-source-id="${safe(id)}">자료 보기</button><button type="button" class="mini-button" data-action="remove-item-source" data-source-target="${safe(item.id)}" data-source-id="${safe(id)}" ${readonly?'disabled':''} aria-label="${safe(sourceTitle(id))} 근거 연결 해제">연결 해제</button></div>`).join(''):'<span class="source-status">연결된 원천자료가 없습니다.</span>'}</div><button type="button" class="mini-button" data-action="select-source" data-source-kind="item" data-source-target="${safe(item.id)}" ${readonly?'disabled':''}>+ 기록 추가 (${linkedSources(item).length}건)</button></div></div><div><label for="visibility-${safe(item.id)}">공개 범위</label><select data-edit="visibility" id="visibility-${safe(item.id)}" ${readonly?'disabled':''}><option value="PATIENT" ${item.visibility==='PATIENT'?'selected':''}>환자 공개</option><option value="INTERNAL" ${item.visibility==='INTERNAL'?'selected':''}>의료진 전용</option></select></div></div>
 <div class="edit-actions"><label class="inline-check"><input type="checkbox" data-edit="verified" ${item.verified?'checked':''} ${readonly?'disabled':''}> 확인된 내용 (직종 권한 검증)</label><small class="help-text">${safe(DOMAINS.find(x=>x.id===SECTIONS.find(s=>s.id===item.section)?.domain)?.title||'담당자')} 검토</small></div></div></details>`).join('')}
`;
}
function renderIssues(){const r=get(),issues=r.draft.issues,grade=r.assessment.domainResults.find(d=>d.id===selectedDomain),domain=DOMAINS.find(d=>d.id===selectedDomain),facts=grade?.facts||[];
 $('#work-pane').innerHTML=`<div class="pane-head"><div><h3>근거·미해결 사항</h3><p>자료의 출처를 확인하고 필요한 검토를 마무리하세요.</p></div><span class="subtle-count">${issues.filter(x=>x.status==='OPEN').length}건 미해결</span></div>
 <div class="notice">${gradeMeter(grade.status==='READY'?grade.grade:null)}<b>${safe(domain.title)} · 현재 평가</b> — ${grade.status==='READY'?`${grade.grade}등급`:(grade.status==='UNKNOWN'?'미평가':'상충')} / ${grade.requiredDone}·${grade.requiredTotal}개 필수 확인<br></div>
 <details style="margin-bottom:17px"><summary class="help-text" style="cursor:pointer">${safe(domain.title)} 평가값 ${facts.length}개 보기</summary><div class="issue-card">${facts.map(x=>`<p>${safe(x.label)} · <b>${safe(x.value)}</b></p>`).join('')||'확인된 값 없음'}</div></details>
 <button type="button" class="mini-button" data-review-domain="${safe(selectedDomain)}">A2 원 입력·판단 확인 ↗</button><details class="assessment-link"><summary>평가 인계·원본 기록 보기</summary><p>${safe(r.assessment.id)} · 규칙 ${safe(r.assessment.ruleVersion)} · ${r.a2Dirty?'현재 A2 변경 미반영':'인계된 평가 기준'}</p></details>
 ${issues.length?issues.map(issue=>`<article class="issue-card ${issue.status==='RESOLVED'?'resolved':''}" data-issue="${safe(issue.id)}"><div class="issue-head"><strong>${safe(DOMAINS.find(x=>x.id===issue.domain)?.title)} · ${safe(issue.title)}</strong><span class="status-pill ${issue.status==='RESOLVED'?'green':'red'}">${issue.status==='RESOLVED'?'해결 기록됨':'HARD · 발행 보류'}</span></div><p>${safe(issue.reason)}</p>
 ${issue.status==='RESOLVED'?`<div class="issue-line">근거: ${safe(sourceTitle(issue.source))}<details><summary>원천자료 식별정보</summary>${safe(issue.source)}</details>확인: ${safe(issue.resolution)}<br>확인 역할: ${safe(issue.reviewer)}</div>`:
 `<div class="issue-form"><div><label>확인한 원천자료</label><div class="source-choose"><strong>${safe(sourceTitle(issue.source))}</strong><button type="button" class="mini-button" data-action="select-source" data-source-kind="issue" data-source-target="${safe(issue.id)}" ${!canEdit()?'disabled':''}>기록 선택</button>${issue.source?`<button type="button" class="mini-button" data-action="view-source" data-source-id="${safe(issue.source)}">자료 보기</button>`:''}</div></div><div><label>해결 내용 및 확인 이유 (10자 이상)</label><textarea data-issue-edit="resolution" placeholder="어떤 기록을 확인하여 상충·누락이 해소됐는지 설명" ${!canEdit()?'disabled':''}>${safe(issue.resolution)}</textarea></div><div><button class="mini-button" data-action="resolve" ${!canEdit()?'disabled':''}>담당 역할로 확인·해결</button></div></div>`}</article>`).join(''):'<div class="empty">현재 A2 입력에서 생성된 별도 검토 이슈가 없습니다. 환자용 계획 항목의 근거도 추가로 확인해야 합니다.</div>'}`;
}
function renderDocs(){const d=get().draft;
 $('#work-pane').innerHTML=`<div class="pane-head"><div><h3>PDF·첨부 문서</h3><p>외부 PDF의 내용 검토와 계획서 인쇄/PDF 저장을 구분합니다.</p></div><span class="subtle-count">첨부 ${d.docs.length}건</span></div>
 <div class="file-input"><label for="file-attach" style="font-weight:750;font-size:12px">PDF 첨부</label><input type="file" id="file-attach" accept=".pdf,application/pdf" ${!canEdit()?'disabled':''}><small class="help-text">PDF 파일만 첨부 · 최대 4MB</small></div>
 ${d.docs.map(doc=>`<div class="doc-card" data-doc="${safe(doc.id)}"><div class="doc-title"><strong>▤ ${safe(doc.name)}</strong><span class="status-pill ${doc.status==='REVIEWED'?'green':'red'}">${doc.status==='REVIEWED'?'내용 검토됨':'검토 전'}</span></div><p class="help-text">${(doc.size/1024).toFixed(1)} KB · SHA-256 ${safe(doc.fileHash.slice(0,14))}… · ${fileStore.has(doc.id)?'현재 세션의 파일 사용 가능':'파일 다시 첨부 필요'}</p><div class="doc-settings"><label>공개 범위</label><select data-doc-edit="visibility" ${!canEdit()?'disabled':''}><option value="INTERNAL" ${doc.visibility==='INTERNAL'?'selected':''}>의료진 전용</option><option value="PATIENT" ${doc.visibility==='PATIENT'?'selected':''}>환자 공개</option></select><label>문서 구분<select data-doc-category ${!canEdit()?'disabled':''}><option value="GENERAL" ${doc.category!=='MEDICATION'?'selected':''}>일반 안내문</option><option value="MEDICATION" ${doc.category==='MEDICATION'?'selected':''}>복약 관련 PDF</option></select></label><button class="mini-button" data-action="open-doc" ${!fileStore.has(doc.id)?'disabled':''}>PDF 보기</button><button class="mini-button" data-action="review-doc" ${!canEdit()?'disabled':''}>검토 확인</button><button class="mini-button" data-action="remove-doc" ${!canEdit()?'disabled':''}>제외</button></div></div>`).join('')||'<div class="empty">추가된 PDF가 없습니다.<br>환자 공개 파일은 최종 승인 전에 내용·버전을 확인해야 합니다.</div>'}
 <div class="divider"></div><div class="pane-head"><div><h3>승인 계획 PDF 생성</h3><p>웹 미리보기와 동일한 계획 데이터를 인쇄용 문서로 구성합니다.</p></div></div><div class="button-row"><button class="btn outline" data-action="print-draft">검토용 계획서 출력</button><button class="btn primary" data-action="print-published" ${currentPublished(get())?'':'disabled'}>현재 발행본 PDF 저장</button></div>`;
}
function renderHistory(){const r=get(),d=r.draft,p=currentPublished(r);$('#work-pane').innerHTML=`<div class="pane-head"><div><h3>승인·발행 이력</h3><p>평가·계획 버전과 최종 승인자, 환자 공개 스냅샷을 구분합니다.</p></div><span class="subtle-count">감사 이벤트 ${r.audit.length}건</span></div>
 <div class="edit-card"><div class="edit-title"><b>현재 계획</b><span class="status-pill ${d.status==='APPROVED'||d.status==='PUBLISHED'?'green':''}">${safe(viewTitle())}</span></div><p class="help-text">계획 버전: v${safe(d.version)}<br>연결된 A2: ${safe(r.assessment.id)} (${safe(r.assessment.ruleVersion)})<br>검토 요약: ${d.issues.filter(x=>x.status==='RESOLVED').length}건 해결 / ${d.issues.length}건 이슈<br>승인: ${d.approval?safe(d.approval.role)+' · '+dateTime(d.approval.at):'아직 없음'}<br>발행: ${p?'v'+safe(p.snapshot.planVersion)+' · '+dateTime(p.snapshot.issuedAt):'아직 없음'}</p></div>
 <div class="edit-title"><b>버전별 발행 기록</b></div>${r.publications.length?r.publications.map(x=>`<div class="doc-card"><strong>v${safe(x.snapshot.planVersion)}</strong> <span class="status-pill ${x.status==='PUBLISHED'?'green':''}">${safe(x.status)}</span><p class="help-text">${dateTime(x.snapshot.issuedAt)} · 환자 공개 항목 ${x.snapshot.items.length}개 · 문서 ${x.snapshot.documents.length}개</p></div>`).join(''):'<div class="empty">아직 발행된 계획이 없습니다.</div>'}
 <div class="divider"></div><div class="edit-title"><b>변경 이력</b></div><div class="audit-box timeline">${r.audit.map(ev=>`<div class="timeline-item"><strong>${safe(ev.event)} · ${safe(roleLabel[ev.role]||ev.role)}</strong><time>${dateTime(ev.at)}</time><div>${safe(ev.details)}</div></div>`).join('')}</div>`;
}
function previewItems(items,meta,isPublished=false){return `<div class="patient-mini-header"><div class="patient-logo">D.　퇴원 후, 나의 하루</div><h4>지금 필요한 일부터 모았어요.</h4><p>${safe(meta)}</p></div><div class="patient-mini-body">${items.length?items.map(item=>`<div class="patient-mini-card"><b>${safe(item.title)}</b><p>${safe(item.text)}</p><span class="patient-mini-tag">${isPublished?'의료진 검토 완료':'검토 중'}</span></div>`).join(''):'<div class="preview-empty">환자에게 공개할 계획 항목이 없습니다.</div>'}</div>`}
function renderPreview(){const r=get(),p=currentPublished(r);const published=previewMode==='published'&&p;const items=published?p.snapshot.items:r.draft.items.filter(x=>x.visibility==='PATIENT');
 $('#preview-mark').textContent=published?`발행 v${p.snapshot.planVersion}`:'편집 중';$('#preview-mark').classList.toggle('live',!!published);
 $('#preview-frame').innerHTML=previewItems(items,published?`의료진 승인 · ${dateTime(p.snapshot.issuedAt)}`:'계획 초안',!!published);
 $('#show-current').textContent=p?(published?'편집 중인 계획 보기':`현재 발행본 v${p.snapshot.planVersion} 보기`):'현재 발행본 없음';$('#show-current').disabled=!p;
}
function renderButtons(){
 const r=get(),d=r.draft,p=currentPublished(r),pending=!!(p&&r.revocationRequest?.status==='PENDING'&&r.revocationRequest.publicationId===p.id);
 for(const id of ['revise','request','return','approve','publish','request-revoke','reject-revoke','revoke'])$('#'+id).hidden=true;
 $('#revise').textContent=d.status==='REVOKED'?'철회 후 새 버전 작성':'새 버전 개정';
 if(d.status==='REVOKED')$('#revise').hidden=false;
 else if(d.status==='PUBLISHED')$('#revise').hidden=false;
 else if(d.status==='REVIEW_REQUESTED'){
  $('#return').hidden=false;$('#approve').hidden=false;
  $('#approve').disabled=!mayApprove(r,role,docsAvailable());
  $('#return').disabled=role!=='APPROVER';
 }else if(d.status==='APPROVED'){
  $('#publish').hidden=false;$('#publish').disabled=!mayPublish(r,role,docsAvailable());
 }else if(d.status==='DRAFT'||d.status==='CHANGES_REQUESTED')$('#request').hidden=false;
 if(p){
  if(role==='APPROVER'){
   $('#revoke').hidden=false;
   $('#revoke').textContent=pending?'철회 요청 승인·발행 철회':'발행 철회';
   if(pending)$('#reject-revoke').hidden=false;
  }else{
   $('#request-revoke').hidden=false;$('#request-revoke').disabled=!canRequestRevocation(r,role);
   $('#request-revoke').textContent=pending?'철회 요청 검토 대기':'발행 철회 요청';
  }
 }
 const hint=$('#revocation-status');hint.hidden=!pending;
 if(pending)hint.textContent='철회 검토 대기 · '+(roleLabel[r.revocationRequest.requestedRole]||r.revocationRequest.requestedRole)+' 요청 · 계획은 아직 환자에게 공개 중';
 const steps={DRAFT:'① 분야별 근거 확인 → ② 검토 요청 → ③ 지정 최종 승인자로 역할 전환',CHANGES_REQUESTED:'보완한 항목을 재검토한 뒤 다시 검토 요청하세요.',REVIEW_REQUESTED:'검토 요청 완료. 약사·담당 의사는 전문영역 검토를, 지정 최종 승인자는 계획 전체 승인을 진행합니다.',APPROVED:'지정 최종 승인자가 계획 발행을 눌러야 환자용 B에 표시됩니다.',PUBLISHED:'현재 발행 완료. 환자용 B 열기로 같은 환자와 입원건의 발행본을 확인하세요.',REVOKED:'철회 완료. 이 발행본은 환자에게 보여주지 않고 재발행 시 새 승인이 필요합니다.'};
 $('#workflow-guidance').textContent=(steps[d.status]||'현재 상태를 확인하세요.')+' · 역할 선택은 가상 시연용이며 실제 의료인 인증은 아닙니다.';
}
function render(){const c=CASES.find(x=>x.id===selectedId);$('#patient-name').textContent=`${c.name} · ${c.age}세`;
 // A prior patient's print DOM must not survive navigation or plan edits.
 $('#print-sheet').replaceChildren();
 $('#patient-detail').textContent=`${practiceMode?'실습 사본 · ':''}${c.id} · ${encounterFor(c.id)} · ${c.context} · 퇴원 예정 ${c.discharge}`;
 $('#patient-select').value=selectedId;$('#actor').value=role;
 renderGate();renderDomains();
 renderAuxiliary();renderNav();applyPreviewLayout();
 for(const b of document.querySelectorAll('[data-tab]'))b.setAttribute('aria-selected',String(b.dataset.tab===activeTab));
 ({plan:renderPlan,issues:renderIssues,documents:renderDocs,history:renderHistory}[activeTab]||renderPlan)();renderPreview();renderButtons();refreshIntegrationInbox();
}
function updatePlan(target){const article=target.closest('[data-item]');if(!article)return;const item=get().draft.items.find(x=>x.id===article.dataset.item);if(!item)return;
 const key=target.dataset.edit;
 // Denied review action must not invalidate an existing approval.
 if(key==='verified'&&target.checked&&!permitted(item.section)){announce('해당 항목을 확인할 권한이 없는 역할입니다.');render();return}
 if(!mutateBeforeEdit())return;
 if(key==='verified'){
   if(target.checked){if(!validItemSources(get(),item)||!item.text.trim()){announce('해당 환자·항목과 일치하는 확인 자료 및 안내문이 필요합니다.');render();return}}
   item.verified=target.checked;
 }else if(key==='visibility'){item.visibility=target.value;item.verified=false;}
 else if(key==='text'){item.text=target.value;item.verified=false;}
 audit(get(),role,'PLAN_EDIT',`${item.title}: ${key} 변경`);save();render();
}
function updateAppointment(input){
 const r=get(),item=r.draft.items.find(i=>i.id===input.dataset.itemId);
 if(!item||item.section!=='followup')return;
 const status=input.dataset.appointment;
 if(!['status','date','time','place'].includes(status))return;
 if(!protectEdit())return;
 const previous=deepCopy(r),appointment={status:item.appointment?.status||'PENDING',date:item.appointment?.date||'',time:item.appointment?.time||'',place:item.appointment?.place||'',...(item.appointment?.destination?{destination:deepCopy(item.appointment.destination)}:{})};
 appointment[status]=input.value;if(status==='place'&&appointment.destination)appointment.destination.verified=false;
 // An empty, pending schedule can stay absent for legacy drafts.
 if(!validAppointment(appointment)){announce('가상 일정을 확정하려면 날짜·시간·장소를 모두 먼저 입력해 주세요.');render();return;}
 if(!mutateBeforeEdit())return;
 item.appointment=appointment;
 item.verified=false;
 audit(r,role,'SYNTHETIC_APPOINTMENT_EDIT','외래 일정 '+status+' 수정 · 다시 검토 필요');
 if(!saveWorkflow(previous))return;
 render();announce(appointment.status==='CONFIRMED'?'가상 일정 입력을 저장했어요. 의료진 검토와 전체 승인·발행이 필요해요.':'미확정 일정으로 저장했어요. 날짜는 환자 예약으로 표시되지 않아요.');
}
function updateDestination(input){
 const r=get(),item=r.draft.items.find(i=>i.id===input.dataset.itemId),field=input.dataset.destination;
 if(!item||item.section!=='followup'||!['name','address','latitude','longitude','sourceUrl','verified'].includes(field)||!protectEdit())return;
 if(field==='verified'&&!['PHYSICIAN','APPROVER'].includes(role)){announce('담당 의사 또는 최종 승인자 확인이 필요해요.');render();return;}
 const before=deepCopy(r),a=deepCopy(item.appointment||{status:'PENDING',date:'',time:'',place:''});
 const dest=a.destination||{name:'',address:'',latitude:'',longitude:'',sourceUrl:'',verified:false};
 dest[field]=field==='verified'?input.checked:input.value; if(field!=='verified')dest.verified=false;
 if(!validDestination(dest)){announce('공식 병원명·주소·좌표·HTTPS 출처를 모두 확인해 주세요.');render();return;}
 if(!mutateBeforeEdit())return;a.destination=dest;item.appointment=a;item.verified=false;
 audit(r,role,'DESTINATION_EDIT','공식 병원 목적지 변경 · 다시 검토 필요');if(saveWorkflow(before))render();
}
function updateIssue(target){const article=target.closest('[data-issue]');if(!article)return;const issue=get().draft.issues.find(x=>x.id===article.dataset.issue);if(!issue||!mutateBeforeEdit())return;issue[target.dataset.issueEdit]=target.value;save();/* deliberately no full render: preserve form typing */}
function resolveIssue(target){const article=target.closest('[data-issue]'),issue=get().draft.issues.find(x=>x.id===article?.dataset.issue);if(!issue)return;
 if(!canResolve(issue.domain)){announce('이 영역의 근거를 확인할 담당 권한이 없습니다.');return}
 const source=issue.source||'',resolution=article.querySelector('[data-issue-edit="resolution"]')?.value.trim()||'';
 if(!validSource(source,'issue',issue)||resolution.length<10){announce('해당 문제와 일치하는 확인 자료를 선택하고 해결 사유를 10자 이상 입력하세요.');return}
 if(!mutateBeforeEdit())return;
 issue.source=source;issue.resolution=resolution;issue.reviewer=roleLabel[role];issue.status='RESOLVED';audit(get(),role,'ISSUE_RESOLVED',`${issue.title} · ${source}`);save();render();announce('검토 해결 기록을 저장했습니다. 환자용 계획 내용도 별도로 확인해야 합니다.');
}
async function addDoc(file){if(!file||!protectEdit())return;
 // Bind asynchronous reads/hashes to the initiating record and workspace.
 const owner=get(),ownerStore=currentStore(),ownerRole=role;
 if(file.size>4*1024*1024||file.size<5||!file.name.toLowerCase().endsWith('.pdf')){announce('4MB 이하의 PDF 파일만 첨부할 수 있습니다.');return}
 const buffer=await file.arrayBuffer(); const magic=new TextDecoder().decode(buffer.slice(0,5));if(magic!=='%PDF-'){announce('PDF 형식의 파일이 아닙니다.');return}
 if(!globalThis.crypto?.subtle){announce('이 브라우저 환경에서는 SHA-256을 사용할 수 없어 첨부를 보류합니다.');return}
 const hashed=await crypto.subtle.digest('SHA-256',buffer);const hash=[...new Uint8Array(hashed)].map(b=>b.toString(16).padStart(2,'0')).join('');
 if(get()!==owner||currentStore()!==ownerStore||role!==ownerRole){announce('작업 대상이 변경되어 첨부를 취소했습니다. 해당 환자에서 다시 첨부하세요.');return}
 const existing=owner.draft.docs.find(doc=>doc.fileHash===hash&&doc.size===file.size&&doc.name===file.name);
 if(existing){
  // Exact bytes restore availability only; reviewed metadata and approval stay unchanged.
  fileStore.set(existing.id,file);audit(owner,role,'PDF_RESTORED',file.name);save();render();announce('동일한 PDF 원본을 복원했습니다.');return;
 }
 if(!mutateBeforeEdit())return;
 const id=`DOC-${Date.now()}-${Math.round(Math.random()*99999)}`;
 fileStore.set(id,file);get().draft.docs.push({id,name:file.name,size:file.size,fileHash:hash,visibility:'INTERNAL',status:'REGISTERED',at:now()});
 audit(get(),role,'PDF_ATTACHED',file.name+' · 임시 파일');save();render();announce('PDF를 첨부했습니다. 공개 전 검토 및 공개범위를 설정하세요.');
}
function docAction(action,button){const root=button.closest('[data-doc]');const id=root?.dataset.doc;const d=get().draft.docs.find(x=>x.id===id);if(!d)return;
 if(action==='open-doc'){const file=fileStore.get(id);if(file){const url=URL.createObjectURL(file);const wnd=window.open(url,'_blank','noopener');if(!wnd)announce('브라우저에서 팝업이 차단되었습니다.');setTimeout(()=>URL.revokeObjectURL(url),60000)}return}
 if(action==='review-doc'&&role!=='APPROVER'&&role!=='PHYSICIAN'){announce('PDF 검토 확인은 담당 의사 또는 최종 승인자 역할이 필요합니다.');return}
 if(action==='review-doc'&&!fileStore.has(d.id)){announce('PDF 원본 파일이 현재 브라우저 세션에 없습니다.');return}
 if(!mutateBeforeEdit())return;
 if(action==='remove-doc'){get().draft.docs=get().draft.docs.filter(x=>x.id!==id);fileStore.delete(id);audit(get(),role,'PDF_REMOVED',d.name)}
 if(action==='review-doc'){d.status='REVIEWED';audit(get(),role,'PDF_REVIEWED',d.name)}
 save();render();
}
function buildPrint(snapshot,isDraft){const r=get(),c=CASES.find(c=>c.id===r.patientId),items=snapshot?.items||r.draft.items.filter(i=>i.visibility==='PATIENT');
 const title=isDraft?'검토용 계획 초안 · 환자에게 발행되지 않음':`의료진 승인 계획 · v${snapshot.planVersion}`;
 $('#print-sheet').innerHTML=`<div class="print-heading"><div style="font-weight:900;color:#214B3B">D.　퇴원 후, 나의 하루</div><h1>퇴원 후 관리계획</h1><div>${safe(c.name)} · ${safe(c.id)} · 퇴원예정 ${safe(c.discharge)}</div><p class="${isDraft?'print-watermark':''}">${safe(title)}</p></div>${items.map(i=>`<section><h2>${safe(i.title)}</h2><p>${safe(i.text)}</p></section>`).join('')}<div class="print-footer">${isDraft?'검토용 문서 · 발행 전':'계획 v'+safe(snapshot.planVersion)+' / 발행 '+safe(dateTime(snapshot.issuedAt))}</div>`;
 window.print();
}
function requestReview(){if(!protectEdit())return;const d=get().draft;if(!['DRAFT','CHANGES_REQUESTED'].includes(d.status))return;const before=deepCopy(get());d.status='REVIEW_REQUESTED';audit(get(),role,'REVIEW_REQUESTED','계획 검토 요청 (발행 게이트는 별도)');if(!saveWorkflow(before))return;render();announce('검토 요청을 기록했어요. 담당 역할을 지정 최종 승인자로 전환하고 필수 확인사항을 점검한 뒤 승인하세요.');}
function returnReview(){const d=get().draft;if(d.status!=='REVIEW_REQUESTED'||role!=='APPROVER')return;const before=deepCopy(get());d.status='CHANGES_REQUESTED';d.approval=null;audit(get(),role,'CHANGES_REQUESTED','최종 승인자가 보완 요청');if(!saveWorkflow(before))return;render();announce('보완 요청 상태로 변경했습니다.');}
function approve(){const r=get();if(!mayApprove(r,role,docsAvailable())){announce('권한 또는 발행 전 필수 검증 조건을 충족하지 못했습니다.');return}
 const before=deepCopy(r);
 const d=r.draft;if(!r.publications.length&&d.version==='0.1')d.version='1.0';d.status='APPROVED';d.approval={by:'SIM-APPROVER',role:roleLabel[role],at:now(),digest:fingerprint(r)};
 audit(r,role,'APPROVED',`계획 v${d.version} 내용 고정 · fingerprint ${d.approval.digest}`);if(!saveWorkflow(before))return;render();announce('승인이 완료되었습니다.');}
async function publish(){
 const button=$('#publish');if(button.hasAttribute('aria-busy'))return;
 const r=get();if(!mayPublish(r,role,docsAvailable())){announce('승인 상태·첨부 원본·내용 일치 검증에 실패했습니다.');return;}
 const originalDigest=fingerprint(r),originalMode=practiceMode,owner=selectedId,serialized=(practiceMode?studyState:normalState).serialized;
 const publication={id:`PUB-${crypto.randomUUID()}`,snapshot:publishedPayload(r),status:'PUBLISHED',encounterId:encounterFor(r.patientId),assessmentId:r.assessment.id,approvedAt:r.draft.approval.at};
 button.setAttribute('aria-busy','true');button.disabled=true;
 try{
  if((r.encounterId&&r.encounterId!==publication.encounterId)||(r.assessment.encounterId&&r.assessment.encounterId!==publication.encounterId))throw Error('현재 환자의 입원건과 평가 입원건이 일치하지 않습니다.');
  const before=deepCopy(r),next=deepCopy(r),previous=currentPublished(next);
  if(previous)previous.status='SUPERSEDED';next.encounterId=publication.encounterId;next.publications.unshift(publication);next.draft.status='PUBLISHED';
  if(!projectCurrentPublication({[owner]:next},owner,publication.encounterId))throw Error('환자용 공개 항목의 개수·길이·발행 정보를 확인하세요.');
  if(!practiceMode&&r.draft.docs.some(d=>d.visibility==='PATIENT'))publication.documentManifest=await stagePublishedDocuments(deepCopy(r),publication,new Map(fileStore));
  if(get()!==r||selectedId!==owner||practiceMode!==originalMode||fingerprint(r)!==originalDigest||!mayPublish(r,role,docsAvailable())||storage.getItem(practiceMode?STORAGE_KEYS.study:STORAGE_KEYS.normal)!==serialized)throw Error('발행 준비 중 환자·자료·저장 상태가 변경됐습니다. 새로고침 후 다시 확인하세요.');
  audit(next,role,'PUBLISHED','모의 공개 v'+next.draft.version+' · 승인 PDF와 동일 브라우저 B에서 확인 가능');
  currentStore()[owner]=next;
  if(!saveWorkflow(before))return;previewMode='published';render();announce('계획이 발행되었습니다.');
 }catch(error){announce('발행하지 못했습니다: '+error.message);}
 finally{button.removeAttribute('aria-busy');renderButtons();}
}
function revise(){if(!['PUBLISHED','REVOKED'].includes(get().draft.status))return;const before=deepCopy(get());try{currentStore()[selectedId]=makeRevision(get());}catch(error){announce(error.message);return;}if(!saveWorkflow(before))return;previewMode='draft';render();announce(before.draft.status==='REVOKED'?'철회 기록을 유지하고 새 초안을 만들었습니다. 재검토·승인·발행 전에는 공개하지 않습니다.':'새 버전 초안을 만들었습니다. 기존 발행본은 유지됩니다.');}
function requestRevocation(){
 const r=get(),p=currentPublished(r);
 if(!p||!canRequestRevocation(r,role)){announce('현재 역할에서 새로운 철회 요청을 생성할 수 없습니다.');return}
 const answer=window.prompt('철회 요청 사유를 10~500자로 작성해 주세요. 요청만으로 환자 안내가 철회되지는 않습니다.','');
 if(answer===null)return;
 const reason=answer.trim();
 if(reason.length<10||reason.length>500){announce('철회 사유는 10~500자로 입력해 주세요.');return}
 const before=deepCopy(r);
 r.revocationRequest={publicationId:p.id,requestedRole:role,requestedAt:now(),reason,status:'PENDING'};
 audit(r,role,'REVOCATION_REQUESTED','발행 '+p.id+' 철회 요청: '+reason);
 if(!saveWorkflow(before))return;
 render();announce('철회 요청을 기록했습니다. 발행본은 승인자 검토 전까지 유지됩니다.');
}
function rejectRevocation(){
 const r=get(),p=currentPublished(r),q=r.revocationRequest;
 if(role!=='APPROVER'||!p||q?.status!=='PENDING'||q.publicationId!==p.id){announce('검토 대기 중인 철회 요청이 없습니다.');return}
 if(!window.confirm('철회 요청을 반려하고 현재 발행본을 유지할까요?'))return;
 const before=deepCopy(r);
 q.status='REJECTED';q.reviewedBy='APPROVER';q.reviewedAt=now();
 audit(r,role,'REVOCATION_REJECTED','발행 '+p.id+' 철회 요청 반려');
 if(!saveWorkflow(before))return;
 render();announce('철회 요청을 반려했습니다. 기존 발행본은 그대로 유지됩니다.');
}
function revoke(){
 const r=get(),p=currentPublished(r);
 if(role!=='APPROVER'||!p){announce('지정 최종 승인자만 기존 발행을 철회할 수 있습니다.');return}
 if(!window.confirm('발행본 v'+p.snapshot.planVersion+'을 철회할까요?'))return;
 const before=deepCopy(r);
 const q=r.revocationRequest;
 if(q?.status==='PENDING'&&q.publicationId===p.id){q.status='EXECUTED';q.reviewedBy='APPROVER';q.reviewedAt=now();}
 p.status='REVOKED';
 if(r.draft.status==='PUBLISHED')r.draft.status='REVOKED';
 audit(r,role,'REVOKED','발행본 v'+p.snapshot.planVersion+' 모의 철회');
 if(!saveWorkflow(before))return;
 previewMode='draft';render();announce('발행본을 철회했습니다. 환자용 B에서 현재 발행본을 숨깁니다.');
}
// Navigation and auxiliary clinical workspace are separate from the immutable A2 v0.5 baseline.
function renderNav(){
 $('#a3-screen').hidden=screen!=='plan';$('#aux-screen').hidden=screen==='plan';
 for(const b of document.querySelectorAll('[data-nav]')){
  const active=b.dataset.nav===screen;
  b.classList.toggle('active',active);
  if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
 }
 $('.breadcrumb b').textContent={plan:'A3',assessment:'A2',patients:'A1',learn:'학습',compare:'비교','patient-preview':'환자용 미리보기'}[screen];
 const titles={plan:['A3 · 퇴원계획','퇴원 후 관리계획'],assessment:['A2 · 다영역 평가','퇴원 후 관리 필요도 평가'],patients:['A1 · 환자 목록','환자 선택'],learn:['사용법·학습','사용법과 합성 실습'],compare:['화면 비교','평가 화면 비교'],'patient-preview':['B · 시연 미리보기','환자에게 보이는 계획']};
 $('#common-context .eyebrow').textContent=titles[screen][0];$('#common-context h1').textContent=titles[screen][1];
 $('#common-context .headline p').textContent=screen==='assessment'?'6영역·30항목 · A2 v0.5 평가 규칙을 사용합니다.':'평가를 확인하고, 환자가 이해할 수 있는 안내로 완성합니다.';
}
function routeEntry(){return {screen,patient:selectedId,practiceMode}}
function updateJourney(){
 $('#journey-back').disabled=journeyIndex<=0;
 $('#journey-next').disabled=journeyIndex>=journey.length-1;
}
function routeURL(){
 const url=new URL(location.href);url.searchParams.set('screen',screen);url.searchParams.set('patient',selectedId);url.searchParams.delete('handoff');
 if(practiceMode)url.searchParams.set('mode','study');else url.searchParams.delete('mode');
 history.replaceState(null,'',url);
}
function mayLeaveWork(){
 const field=document.activeElement;
 if(field?.matches('[data-edit],[data-appointment],[data-destination],[data-issue-edit],[data-a2-field]'))field.blur();
 if($('#save-state').textContent==='저장 불가'){announce('저장하지 못한 변경이 있어 이동을 멈췄습니다. 입력과 저장 상태를 다시 확인하세요.');return false;}
 return true;
}
function go(screenName){
 if(!screens.includes(screenName)||!mayLeaveWork())return;
 screen=screenName;
 const entry=routeEntry(),prior=journey[journeyIndex];
 if(prior&&prior.practiceMode!==practiceMode){journey=[];journeyIndex=-1;}
 if(!prior||JSON.stringify(prior)!==JSON.stringify(entry)){
  journey=journey.slice(0,journeyIndex+1);journey.push(entry);journeyIndex++;
 }
 routeURL();render();updateJourney();window.scrollTo({top:0,behavior:'instant'});
}
function traverseJourney(offset){
 const target=journeyIndex+offset;if(target<0||target>=journey.length)return;
 const entry=journey[target];
 // Study sessions have separate data. Never restore their context as normal patient work.
 if(entry.practiceMode!==practiceMode){announce('실습 시작·종료는 학습 화면에서 선택하세요.');return;}
 journeyIndex=target;selectedId=entry.patient;screen=entry.screen;routeURL();render();updateJourney();
}
function choosePatient(id,destination='plan'){
 if(!mayLeaveWork())return;
 if(!CASES.some(c=>c.id===id))return;
 if(practiceMode)leavePractice();
 selectedId=id;activeTab='plan';selectedDomain='function';previewMode='draft';expandedPlanItems=new Set(['today']);
 $('#patient-dialog').close();go(destination);
}
function showPatientDialog(){
 $('#patient-list').innerHTML=CASES.map(c=>{
  const r=practiceMode&&studyRepo[c.id]?studyRepo[c.id]:repository[c.id];const unresolved=blockers(r,docsAvailable()).length;
  return `<article class="patient-list-card ${c.id===selectedId?'current':''}"><div class="patient-list-main"><strong>${safe(c.name)} · ${c.age}세</strong><span>${safe(c.id)} · ${safe(c.context)}</span><small>퇴원 예정 ${safe(c.discharge)} · ${unresolved?`확인 필요 ${unresolved}건`:'검토 준비'}</small></div><div class="patient-list-actions"><button type="button" class="mini-button" data-patient-pick="${safe(c.id)}" data-target-screen="plan">계획 검토</button><button type="button" class="mini-button" data-patient-pick="${safe(c.id)}" data-target-screen="assessment">다영역 평가</button></div></article>`;
 }).join('');$('#patient-dialog').showModal();
}
function applyPreviewLayout(){
 $('#shell').classList.toggle('preview-collapsed',previewCollapsed);
 $('#preview-toggle').textContent=previewCollapsed?'미리보기 펼치기':'미리보기 접기';
 $('#preview-toggle').setAttribute('aria-expanded',String(!previewCollapsed));
 $('#preview-pane').hidden=previewCollapsed;
}
function togglePreview(){previewCollapsed=!previewCollapsed;try{localStorage.setItem('a3-preview-collapsed-v04',previewCollapsed?'1':'0')}catch{}applyPreviewLayout()}
function renderAuxiliary(){
 if(screen==='plan')return;
 if(screen==='learn'){renderLearning();return;}
 const root=$('#aux-screen'),r=get(),c=CASES.find(x=>x.id===selectedId);
 if(screen==='patients'){
  root.innerHTML=`<div class="patient-list">${CASES.map(patient=>`<article class="patient-list-card"><div class="patient-list-main"><strong>${safe(patient.name)} · ${safe(patient.age)}세</strong><span>${safe(patient.id)} · ${safe(patient.context)}</span><small>${safe(statusLabel[repository[patient.id].draft.status])}</small></div><div class="patient-list-actions"><button class="btn primary" data-patient-pick="${safe(patient.id)}" data-target-screen="assessment">평가 시작</button><button class="btn outline" data-patient-pick="${safe(patient.id)}" data-target-screen="plan">계획 검토</button></div></article>`).join('')}</div>`;return;
 }
 if(screen==='compare'){
  root.innerHTML=`<p>원본은 별도 저장소의 독립 화면입니다. 양쪽 입력은 자동 동기화하지 않습니다.</p><div class="comparison-grid"><section><h2>A2 v0.5 원본</h2><a href="../../hospital-a2/index.html" target="_blank" rel="noopener">원본 새 창</a><iframe title="보존된 A2 v0.5 원본" src="../../hospital-a2/index.html"></iframe></section><section><h2>통합 A2</h2><button class="btn outline" data-open-assessment>현재 환자 평가로 이동</button><p>A3 공통 디자인 · 원본과 동일한 엔진 · 저장·승인 연계</p><ul>${evaluateA2({values:r.a2Values}).map(d=>`<li>${safe(d.title)}: ${d.status==='READY'?d.grade+'등급':safe(d.status)}</li>`).join('')}</ul></section></div>`;return;
 }
 if(screen==='patient-preview'){
  const live=currentPublished(r),isLive=previewMode==='published'&&live;
  const items=isLive?live.snapshot.items:r.draft.items.filter(x=>x.visibility==='PATIENT');
  root.innerHTML=`<div class="aux-heading"><div><p class="eyebrow">B · 환자용 미리보기</p><h1>환자에게 보이는 계획</h1><p>${safe(c.name)} · ${safe(c.id)} · ${isLive?`발행 v${safe(live.snapshot.planVersion)}`:'편집 중인 계획'}</p></div><div class="aux-actions"><button class="btn outline" id="back-to-plan">계획 검토로 돌아가기</button>${live?`<button class="btn outline" id="aux-switch-preview">${isLive?'편집본 보기':'발행본 보기'}</button>`:''}</div></div><div class="full-patient-preview">${previewItems(items,isLive?'발행된 계획':'계획 초안',isLive)}</div>`;
  return;
 }
 const domains=evaluateA2({...c,values:r.a2Values});
 const done=domains.reduce((n,d)=>n+d.requiredDone,0);
 root.innerHTML=`<div class="aux-heading"><div><h2>평가 입력·판단 근거</h2><p>필수 ${done}/18개 확인 · 6영역·30항목</p></div><div class="aux-actions"><button class="btn outline" id="reset-evaluation" ${canEdit()?'':'disabled'}>평가 입력 초기값 복원</button><button class="btn outline" id="back-to-plan">계획 검토로 돌아가기</button><button class="btn primary" id="handoff-a2" ${r.a2Dirty&&canEdit()?'':'disabled'}>변경된 평가 A3로 인계</button></div></div>
 <div class="a2-migration-note">${r.a2Dirty?'변경된 평가가 있습니다. 인계하기 전까지 기존 계획은 유지됩니다.':'현재 평가가 계획에 반영되어 있습니다.'}</div>
 <details class="assessment-actions"><summary>검토할 행동 초안 · 평가에서 확인한 업무 제안</summary>${domains.filter(d=>d.status==='READY'&&d.grade>0).map(d=>{const action=chooseAction(d.id,d.grade);return `<p><strong>${safe(action.title)} · ${d.grade}등급</strong><br>${safe(action.detail)} · ${safe(action.category)}</p>`}).join('')||'<p>추가 검토 초안이 없습니다.</p>'}<p>미평가·상충 영역은 자료 확인 후 판단합니다. 안내문을 자동 생성하거나 승인하지 않습니다.</p></details>
 <div class="a2-three-column"><nav class="a2-domains" id="a2-domain-tabs" aria-label="평가영역 선택">${domains.map((d,i)=>`<button type="button" data-a2-domain="${safe(d.id)}" class="a2-domain-btn ${selectedDomain===d.id?'selected':''}"><span>${String(i+1).padStart(2,'0')} · ${safe(d.title)}</span><b>${d.status==='READY'?d.grade+'등급':d.status==='CONFLICTING'?'상충':'미평가'}</b></button>`).join('')}</nav>
 <div class="a2-work-layout"><section class="a2-input-panel"><div class="pane-head"><h2>${safe(DOMAINS.find(d=>d.id===selectedDomain).title)}</h2><span class="status-pill">영역별 입력</span></div>${DOMAINS.find(d=>d.id===selectedDomain).fields.map(([id,label,required,options],i)=>{
 const v=r.a2Values[selectedDomain]?.[id]??'';
 return `<div class="a2-field"><label for="a2-field-${safe(id)}"><span>${i+1}. ${safe(label)}</span>${required?'<small>필수</small>':'<small>추가 확인</small>'}</label><select id="a2-field-${safe(id)}" data-a2-field="${safe(id)}" ${canEdit()?'':'disabled'}><option value="" ${v===''?'selected':''}>미확인 · 자료 없음</option><option value="CONFLICT" ${v==='CONFLICT'?'selected':''}>상충 · 자료 간 불일치</option>${options.map(([value,text])=>`<option value="${safe(value)}" ${v===value?'selected':''}>${safe(text)}</option>`).join('')}</select></div>`;
 }).join('')}<details class="field-guidance"><summary>항목별 입력 안내</summary>${ENGINE_DOMAINS.find(d=>d.id===selectedDomain).fields.map(f=>`<p><b>${safe(f.label)}</b><br>${safe(f.note||'별도의 상세 설명 없음')} · 자료 확인 또는 기록 대조</p>`).join('')}</details></section><aside class="a2-judgment-panel"><h2>판단과 우선 확인사항</h2>${(()=>{const d=domains.find(x=>x.id===selectedDomain);return `${gradeMeter(d.status==='READY'?d.grade:null)}<div class="a2-big-grade">${d.status==='READY'?d.grade+'등급 · '+safe(TIER_LABELS[d.grade]):d.status==='CONFLICTING'?'상충 · 보류':'미평가'}</div><p>${[d.missing.length?'미확인: '+d.missing.join(', '):'',d.conflicting.length?'상충: '+d.conflicting.join(', '):''].filter(Boolean).map(safe).join('<br>')||'입력된 근거를 확인하세요.'}</p><h3>${safe(d.title)} · 현재 입력 근거</h3><p>등급은 업무 검토 우선도이며 임상 위험도가 아닙니다.</p>${d.traces.map(x=>`<div class="a2-fact"><b>${safe(x.name)}</b><span>${safe(x.reason)} · ${x.severity===null?'판단 보류':x.severity+'등급'}${gradeMeter(x.severity)}<details class="trace-technical"><summary>원본 규칙 보기</summary><small>${safe(x.id)} · 자체 검토규칙</small></details></span></div>`).join('')}<details><summary>계산 방식·참고 자료</summary><p>${TIER_LABELS.map((label,i)=>`${i}: ${safe(label)}`).join('<br>')}</p><p>확인된 항목 중 최고 등급을 사용합니다. 필수 결측 또는 상충 시 등급을 확정하지 않습니다. 사회환경 복합 지원 공백 규칙을 보존합니다. 검증된 임상 척도가 아닙니다.</p>${(ENGINE_DOMAINS.find(x=>x.id===selectedDomain).sources||[]).map(id=>`<p><a href="${safe(SOURCES[id].url)}" target="_blank" rel="noopener">${safe(SOURCES[id].label)}</a></p>`).join('')}</details>`})()}</aside></div></div>`;
}
function handoffAssessment(){
 const r=get();if(!r.a2Dirty)return;
 if(r.draft.status==='PUBLISHED'||r.draft.status==='REVOKED'){
  announce('발행된 계획은 변경할 수 없습니다. 새 버전 개정 후 평가를 인계하세요.');return;
 }
 if(!confirm('현재 A2 평가 변경을 계획에 반영할까요? 검토 해결 기록과 항목 확인 상태를 다시 검토하게 됩니다.'))return;
 const before=deepCopy(r);
 try{currentStore()[selectedId]=commitEvaluation(r,role);if(!saveWorkflow(before))return;}
 catch(error){announce(error.message);return;}
 activeTab='issues';go('plan');announce('새 평가가 반영되었습니다. 안내 항목과 PDF를 다시 확인하세요.');
}
function showBlockers(){
 const r=get(),problems=blockers(r,docsAvailable());
 $('#blockers-description').textContent=problems.length?'항목을 선택하면 해당 위치로 이동합니다.':'현재 해결해야 할 차단 항목이 없습니다.';
 const groupText={evidence:'근거·미해결',plan:'계획 편집',docs:'PDF·첨부'};
 $('#blockers-list').innerHTML='<section><h3>발행 차단 사항 · '+problems.length+'건</h3><p>아래 조건은 모두 해결해야 승인·발행할 수 있습니다.</p>'+ (problems.length?problems.map((b,i)=>`<button type="button" class="blocker-jump" data-blocker-id="${safe(b.id)}"><span class="blocker-index">${String(i+1).padStart(2,'0')}</span><span><b>${safe(b.label)}</b><small>${safe(groupText[b.group]||'검토')}</small></span><span aria-hidden="true">↗</span></button>`).join(''):'<div class="empty">필수 검토사항이 모두 해결되었습니다.</div>')+'</section>'+
 `<section class="review-priorities"><h3>우선 검토 사항 · ${priorityDomains(r).length}영역</h3><p>3등급 영역의 업무 검토 우선도입니다. 발행 차단 여부는 위 조건으로 따로 확인합니다.</p>${priorityDomains(r).map(d=>`<button type="button" class="blocker-jump" data-review-domain="${safe(d.id)}">${safe(d.title)} · ${d.grade}등급 · 입력·판단 확인 ↗</button>`).join('')||'<p>확정된 3등급 영역이 없습니다.</p>'}</section><section><h3>참고·권장 확인 사항</h3><p>결측·상충은 등급을 확정하지 않습니다. 원 입력과 인계 기록을 함께 확인하세요.</p><button type="button" class="mini-button" data-review-domain="${safe(selectedDomain)}">A2 평가 원 입력 확인</button><p>PDF ${r.draft.docs.length}건 · 공개 문서의 필수 검토는 발행 차단 항목에 포함됩니다.</p></section>`;
 $('#blockers-dialog').showModal();
}
function jumpToBlocker(id){
 const b=blockers(get(),docsAvailable()).find(x=>x.id===id);if(!b)return;
 $('#blockers-dialog').close();
 if(id==='assessment-dirty'){go('assessment');$('#handoff-a2')?.focus();return;}
 screen='plan';
 activeTab=b.group==='evidence'?'issues':b.group==='docs'?'documents':'plan';
 render();
 let locator;
 if(b.group==='evidence')locator=[...document.querySelectorAll('[data-issue]')].find(el=>el.dataset.issue===id);
 else if(b.group==='docs')locator=[...document.querySelectorAll('[data-doc]')].find(el=>id.endsWith(el.dataset.doc));
 else if(id.startsWith('section-'))locator=[...document.querySelectorAll('[data-item]')].find(el=>el.dataset.item===id.slice('section-'.length));
 else locator=[...document.querySelectorAll('[data-item]')].find(el=>id.includes(el.dataset.item));
 if(locator){if(locator.matches('details[data-item]')){locator.open=true;expandedPlanItems.add(locator.dataset.item)}locator.classList.add('jump-highlight');locator.scrollIntoView({behavior:'instant',block:'center'});const input=locator.querySelector('textarea,input,select,button');if(input)input.focus({preventScroll:true});}
 else $('#work-pane').scrollIntoView({behavior:'instant',block:'start'});
}

// v0.3: mock evidence picker with source/role validation, no EMR or external data connection.
function openSourceDialog(kind,target=null,viewId=null,patientOverride=null){
 sourceTarget={kind,target};
 const canChoose=kind==='item'||kind==='issue';
 $('#source-dialog-title').textContent=viewId?'원천자료 상세':'관련 원천자료 선택';
 $('#source-dialog-description').textContent=viewId?'원천자료 요약과 연결 관계를 확인하세요.':'현재 항목에 연결 가능한 확인된 기록을 먼저 보여줍니다. 다른 기록은 참고만 가능하며 승인되지 않은 기록은 연결할 수 없습니다.';
 const sourcePatient=patientOverride||selectedId;
 const all=recordsForPatient(sourcePatient,sourcePatient===selectedId?(get().unlockedSources||[]):[]);
 const targetValue=kind==='issue'?get().draft.issues.find(i=>i.id===target):get().draft.items.find(i=>i.id===target)?.section;
 const applicable=rec=>canChoose&&validSource(rec.id,kind,targetValue);
 const sources=viewId?all.filter(s=>s.id===viewId):[...all].sort((a,b)=>Number(applicable(b))-Number(applicable(a))||a.title.localeCompare(b.title,'ko'));

 $('#source-list').innerHTML=sources.length?sources.map(rec=>{
  const valid=applicable(rec),selected=kind==='item'&&linkedSources(get().draft.items.find(i=>i.id===target)||{}).includes(rec.id);
  const status={CONFIRMED:'확인됨',PENDING:'추가 확인',CONFLICTING:'상충',LOCKED:'회신 대기'}[rec.verificationStatus]||'자료 확인';
  return `<article class="source-card ${valid?'':'no-use'}"><div class="source-card-actions"><h3>${safe(rec.title)}</h3><span class="source-flag">${status}</span></div><p>${safe(rec.summary)}</p><p>${safe(rec.detail)}</p><small>분야 ${safe(DOMAINS.find(d=>d.id===rec.domain)?.title||rec.domain)} · 기준 ${safe(rec.observedAt)} · 연결 ${safe(rec.fieldRefs.map(fieldRefLabel).join(', '))}</small><details><summary class="learn-copy" style="cursor:pointer;margin-top:8px">기록 식별·기술 정보 보기</summary><p class="learn-copy">${safe(rec.id)} · ${safe(rec.encounterId)} · 문서 v${safe(rec.documentVersion)}<br>원본 연결 항목: ${safe(rec.fieldRefs.join(', '))}</p></details><div class="source-card-actions">${rec.exampleFile?`<a class="mini-button" href="${safe(rec.exampleFile)}" target="_blank" rel="noopener noreferrer">예시 PDF 열기 ↗</a>`:''}${canChoose?`<button type="button" class="mini-button" data-connect-source="${safe(rec.id)}" ${valid||selected?'':'disabled'}>${selected?'연결 해제':valid?'이 근거 추가':'확인·대상 불일치'}</button>`:''}${rec.verificationStatus==='LOCKED'&&practiceMode&&selectedId==='SYN-003'?`<button type="button" class="mini-button" data-unlock-source="${safe(rec.id)}">가상 담당자 회신 받기</button>`:''}</div></article>`;
 }).join(''):'<p class="empty">연결된 원천자료를 찾지 못했습니다.</p>';
 if(!$('#source-dialog').open)$('#source-dialog').showModal();
}
// Item sources form an additive, ordered set; legacy item.source stays its first ID.
function changeItemSource(itemId,id,removeOnly=false){
 const r=get(),item=r.draft.items.find(i=>i.id===itemId);
 if(!item){announce('선택한 계획 항목을 찾을 수 없습니다.');return false;}
 const previous=linkedSources(item);
 const already=previous.includes(id);
 if(removeOnly&&!already)return false;
 if(!already&&!validSource(id,'item',item.section)){announce('확인되지 않았거나 해당 환자·항목과 다른 기록은 연결할 수 없습니다.');return false;}
 if(!already&&previous.length>=12){announce('계획 항목에는 최대 12건까지 근거를 연결할 수 있어요.');return false;}
 const before=deepCopy(r);
 if(!mutateBeforeEdit())return false;
 const next=already?previous.filter(x=>x!==id):[...previous,id];
 if(next.length)item.sources=next;else delete item.sources;
 item.source=next[0]||'';
 item.verified=false;
 audit(r,role,already?'EVIDENCE_UNLINKED':'EVIDENCE_LINKED',item.title+': '+id);
 if(!saveWorkflow(before))return false;
 render();
 return true;
}
function selectSource(id){
 const {kind,target}=sourceTarget||{};
 if(!['item','issue'].includes(kind))return;
 if(kind==='item'){
  const box=$('#source-list'),scroll=box.scrollTop;
  if(!changeItemSource(target,id))return;
  openSourceDialog(kind,target);
  $('#source-list').scrollTop=scroll;
  announce('근거 연결 목록을 변경했어요. 전체 자료를 확인한 뒤 직종별 검토를 다시 완료하세요.');
  return;
 }
 const r=get(),entry=r.draft.issues.find(i=>i.id===target);
 if(!entry||!validSource(id,'issue',entry)){announce('해당 환자 또는 검토 항목과 일치하지 않는 자료입니다.');return;}
 const before=deepCopy(r);
 if(!mutateBeforeEdit())return;
 entry.source=id;entry.status='OPEN';entry.reviewer='';
 audit(r,role,'EVIDENCE_LINKED',entry.title+': '+id);
 if(!saveWorkflow(before))return;
 $('#source-dialog').close();render();announce('자료가 연결되었습니다. 담당 역할로 검토를 완료해야 합니다.');
}
function unlockSource(id){
 if(!practiceMode||selectedId!=='SYN-003'||!id.endsWith('MED-C'))return;
 if(!get().unlockedSources.includes(id))get().unlockedSources.push(id);
 audit(get(),role,'SYNTHETIC_REPLY_RECEIVED','약료 담당자의 가상 회신을 수신');save();
 $('#source-dialog').close();render();announce('가상 확인 회신을 받았습니다. A2 평가도 직접 수정하고 인계하세요.');
}
const LEARN_TABS=[['intro','01 · 시작하기'],['screen','02 · 화면 읽기'],['source','03 · 원천자료'],['practice','04 · 케이스 실습'],['terms','05 · 용어·FAQ']];
const FAQ=[
 ['A2의 0~3등급','퇴원 위험도나 퇴원 허가 점수가 아닌 자체 업무 검토 우선도입니다. 결측·상충은 0점으로 대체하지 않습니다.'],
 ['원천자료와 자료 ID','환자별 기록을 구분하는 식별자입니다. 사용자는 자료 제목으로 선택하고 ID는 상세에서 확인하면 됩니다.'],
 ['미평가와 상충','미평가는 필수정보 부족, 상충은 서로 맞지 않는 기록이 있어 판단을 보류하는 상태입니다.'],
 ['스냅샷','그 시점의 A2 입력·결과 또는 승인된 공개 계획을 고정하여 남긴 기록입니다.'],
 ['검토 완료','자료 연결만으로 검토가 끝나지 않습니다. 담당 역할로 환자에게 제공할 내용을 확인해야 합니다.'],
 ['승인과 발행','지정 최종 승인자가 내용을 확인한 후, 별도의 발행 동작으로 환자에게 공개될 스냅샷을 생성합니다.'],
 ['발행 전 해결사항','원천자료 미해결, 확인되지 않은 환자 안내, 공개 PDF 미검토 등 핵심 사유가 하나라도 있으면 전체 발행이 보류됩니다.'],
 ['발행본·개정·철회','발행된 계획은 그대로 보존됩니다. 수정하려면 새 버전을 만들고 승인해야 하며, 철회본은 현재 유효한 안내가 아닙니다.'],
 ['PDF 첨부와 생성','첨부 PDF는 세션 메모리에 존재하므로 새로고침 후 원본이 없어질 수 있습니다. 인쇄/PDF 저장은 서버의 PDF 영구 저장이나 원자적 발행이 아닙니다.'],
 ['실습과 실제 의료업무','모든 사례는 합성 데이터이며 역할 선택은 모의 권한입니다. 임상적 의사결정·실환자 인증·실제 처방 변경이나 기관 전송이 구현된 것은 아닙니다.'],
 ['공적 통합돌봄과 6영역','A2 자체 6개 평가영역은 공적 통합돌봄 선별 6문항과 별개입니다. 지자체 지원 확정은 병원 계획 승인과 같지 않습니다.']
];
function learningStatusFor(id){
 const r=practiceMode&&selectedId===id?get():studyRepo[id];
 if(!r)return '시작 전';
 if(id==='SYN-004'&&r.publications.filter(p=>p.status==='PUBLISHED'||p.status==='SUPERSEDED').length>=2)return '실습 완료';
 if(id==='SYN-003'&&r.draft.status==='PUBLISHED'&&blockers(r,docsAvailable()).length===0)return '실습 완료';
 if(['SYN-001','SYN-002'].includes(id)&&r.draft.status==='PUBLISHED'&&blockers(r,docsAvailable()).length===0)return '실습 완료';
 return '진행 중';
}
function renderLearning(){
 const root=$('#aux-screen');const count=Object.keys(studyRepo).length;
 const card=(title,body,action)=>`<div class="learning-card"><h3>${title}</h3><p>${body}</p>${action}</div>`;
 let content='';
 if(learningUnit==='intro') content=`<section class="learning-panel"><div class="learning-kicker">L01 · 시작하기</div><h2>퇴원 후 관리계획, 이렇게 연결돼요</h2><p>환자의 관리 필요도를 확인하고, 담당 의료진이 근거를 검토한 뒤 환자에게 필요한 계획만 발행하는 흐름입니다. 각 단계를 눌러 실제 화면으로 이동할 수 있어요.</p><div class="learning-flow">${[['A1','환자 선택','patients'],['A2','평가 입력·인계','assessment'],['A3','계획 검토·발행','plan'],['B','환자 화면','patient-preview']].map(([id,t,target])=>`<button data-learn-go="${target}">${id}<small>${t}</small></button>`).join('')}</div></section><section class="learning-panel"><h3>1분 실습 안내</h3><p>처음이라면 SYN-002부터 시작하세요. 계획을 읽고, 검토 요청 후 담당 역할을 최종 승인자로 바꿔 승인·발행하는 순서를 직접 경험할 수 있습니다.</p><div class="tour-learning-actions"><button class="btn primary" data-learn-guided-tour="1">화면 따라 체험하기 · 튜토리얼 →</button><button class="mini-button" data-study-start="SYN-002">A3 업무 직접 실습</button></div><p class="learn-copy">튜토리얼은 실제 업무 화면을 읽기 전용으로 둘러보며 승인·발행 기록은 바꾸지 않아요. 마지막에는 기존 환자용 B 예시를 바로 열 수 있습니다.</p></section>`;
 else if(learningUnit==='screen') content=`<section class="learning-panel"><div class="learning-kicker">L02 · 화면 읽기</div><h2>무엇부터 봐야 할까요?</h2><div class="learning-cards">${card('환자 정보','지금 선택한 환자와 입원 건을 확인합니다.','<button class="mini-button" data-learn-go="plan">위치 보기</button>')}${card('발행 전 해결할 사항','숫자를 선택하면 어떤 작업이 남았는지 확인하고 그곳으로 이동할 수 있습니다.','<button class="mini-button" data-learn-go="blockers">확인사항 열기</button>')}${card('A2 6영역','평가 등급은 업무 검토 우선도이고 발행 가능 여부와는 별개입니다.','<button class="mini-button" data-learn-go="assessment">평가 열기</button>')}${card('계획 편집·근거','환자 안내와 원천자료를 연결하고 담당자의 확인을 기록합니다.','<button class="mini-button" data-learn-go="plan">편집으로 이동</button>')}${card('PDF·첨부','자료를 첨부한 뒤 검토·공개 범위를 따로 확인해야 합니다.','<button class="mini-button" data-learn-go="documents">첨부 화면 보기</button>')}${card('승인·발행·이력','역할에 따라 검토 요청, 승인, 발행과 개정·철회를 구분합니다.','<button class="mini-button" data-learn-go="history">이력으로 이동</button>')}</div></section>`;
 else if(learningUnit==='source') content=`<section class="learning-panel"><div class="learning-kicker">L03 · 원천자료 이해</div><h2>원천자료를 읽고 연결하기</h2><p>자료 ID를 기억할 필요는 없습니다. 제목으로 내용을 확인하고, 해당 환자·항목에 맞는 자료를 선택하세요. 연결만으로 검토가 끝나지는 않습니다.</p><div class="learning-cards">${CASES.map(c=>card(`${safe(c.name)} · ${safe(c.id)}`,`${recordsForPatient(c.id).length}개 가상 원천자료 · ${safe(c.context)}`,`<button class="mini-button" data-learn-source-patient="${c.id}">자료 목록 보기</button>`)).join('')}</div></section><section class="learning-panel"><h3>상충된 기록의 예시</h3><p>SYN-003에는 상충하는 퇴원약 목록 A/B와 잠긴 담당자 회신 C가 있어요. 어느 하나를 임의로 선택해서 해결 완료하면 안 됩니다. 담당자 회신을 받은 다음 A2 자료도 수정하여 인계해야 합니다.</p><button class="mini-button" data-study-start="SYN-003">상충 실습 시작</button></section>`;
 else if(learningUnit==='practice') content=`<section class="learning-panel"><div class="learning-kicker">L04 · 직접 해보기</div><div class="tour-learning-actions"><button class="btn primary" data-learn-guided-tour="1">실제 화면 둘러보기 · 튜토리얼 →</button></div><h2>케이스별로 실제 조작해 보세요</h2><p>실습 시작 시 별도의 사본을 사용합니다. 일반 작성 이력은 수정되지 않으며, 다른 화면을 다녀와도 실습 상태를 보존합니다.</p><div class="learning-cards">${CASES.map(c=>{const m=CASE_MISSIONS[c.id];return card(`${safe(c.id)} · ${safe(m.title)} <span class="source-flag">${safe(m.difficulty)}</span>`,`${safe(m.description)}<br><b>상태: ${learningStatusFor(c.id)}</b>`,`<button class="mini-button" data-study-start="${c.id}">${studyRepo[c.id]?'처음부터 다시 실습':'실습 시작'}</button><button class="mini-button" data-study-resume="${c.id}" ${studyRepo[c.id]?'':'disabled'}>이어하기</button>`)}).join('')}</div></section>${practiceMode?`<section class="learning-panel"><h3>현재 실습: ${safe(selectedId)} · ${safe(CASE_MISSIONS[selectedId].title)}</h3>${CASE_MISSIONS[selectedId].steps.map((t,i)=>`<div class="learn-task ${i===0?'completed':''}">${String(i+1).padStart(2,'0')} · ${safe(t)}</div>`).join('')}<p>현재 상태: <b>${learningStatusFor(selectedId)}</b> · 발행 전 확인 ${blockers(get(),docsAvailable()).length}건</p><button class="mini-button" data-learn-go="plan">현재 실습 계속</button><button class="mini-button" data-learn-hint="1">단계별 힌트</button><p class="learn-copy" id="learn-hint-text"></p></section>`:''}`;
 else content=`<section class="learning-panel"><div class="learning-kicker">L05 · 용어 및 FAQ</div><h2>헷갈리는 개념 찾아보기</h2><label for="learn-search">설명 검색</label><input id="learn-search" type="search" value="${safe(learnFilter)}" placeholder="예: 스냅샷, 승인, 상충" style="width:100%;padding:12px;margin:10px 0 18px;border:1px solid var(--line);border-radius:9px"><div class="learn-faq">${FAQ.filter(([a,b])=>(a+b).includes(learnFilter)).map(([a,b])=>`<details><summary>${safe(a)}</summary><p>${safe(b)}</p></details>`).join('')||'<p>일치하는 설명이 없습니다.</p>'}</div></section>`;
 root.innerHTML=`<header class="learning-head"><p class="eyebrow">학습 · 가상 사례로 이해하기</p><h1>설명과 실습</h1><p>업무 흐름을 배우고, 실제 화면에서 직접 확인해 보세요.</p></header>${practiceMode?`<div class="study-banner"><strong>실습 모드 · ${safe(selectedId)} · ${safe(CASE_MISSIONS[selectedId].title)}</strong><div><button class="mini-button" data-learn-go="plan">실습 계속</button><button class="mini-button" data-study-leave="1">일반 작업으로 돌아가기</button></div></div>`:''}<div class="learning-layout"><nav class="learning-nav" aria-label="학습 단원">${LEARN_TABS.map(([id,title])=>`<button data-learn-unit="${id}" class="${id===learningUnit?'active':''}" aria-current="${id===learningUnit?'page':'false'}">${title}</button>`).join('')}</nav><div class="learning-body">${content}</div></div>`;
}
function startPractice(id,reset=true){
 if(!CASES.some(c=>c.id===id))return;
 if(!practiceMode){priorContext={selectedId,activeTab,selectedDomain,previewMode,screen,previewCollapsed};}
 if(reset||!studyRepo[id])studyRepo[id]=makeInitial(id);
 practiceMode=true;selectedId=id;activeTab='plan';selectedDomain='function';previewMode='draft';expandedPlanItems=new Set(['today']);
 save();go('plan');announce('독립 학습 사본을 열었습니다. 일반 작업 기록은 보존됩니다.');
}
function leavePractice(){
 if(!practiceMode)return;
 practiceMode=false;
 const previous=priorContext||{selectedId:'SYN-001',activeTab:'plan',selectedDomain:'function',previewMode:'draft',screen:'learn',previewCollapsed:true};
 selectedId=previous.selectedId;activeTab=previous.activeTab;selectedDomain=previous.selectedDomain;previewMode=previous.previewMode;previewCollapsed=previous.previewCollapsed;
 priorContext=null;save();go(previous.screen||'learn');
 announce('일반 작업으로 돌아왔습니다. 실습 기록은 별도로 보관됩니다.');
}
function learnNavigate(target){
 if(target==='blockers'){go('plan');showBlockers();return}
 if(['documents','history','issues'].includes(target)){activeTab=target;go('plan');return}
 if(target==='patients'){showPatientDialog();return}
 go(target);
}

// Tour-only display bridge: no go(), save(), role/patient or record mutation.
const tourBridge={
 capture:()=>({screen,activeTab,selectedDomain,previewCollapsed,previewMode,expanded:[...expandedPlanItems]}),
 show(step){
  screen=step.screen;activeTab='plan';
  if(screen==='plan'){expandedPlanItems=new Set(['today']);if(step.target==='preview')previewCollapsed=false;}
  render();
 },
 target(name){
  const selectors={patients:'#aux-screen .patient-list','patient-context':'#common-context .patient-strip','assessment-domains':'#a2-domain-tabs','assessment-work':'.a2-work-layout','plan-item':'#work-pane [data-item="today"]','plan-sources':'#work-pane [data-item="today"] .multi-source-area',roles:'.actor-box',workflow:'#workflow-guidance',preview:'#preview-pane'};
  return document.querySelector(selectors[name]);
 },
 context:()=>`${selectedId} · ${encounterFor(selectedId)}${practiceMode?' · 실습 사본':''}`,
 restore(before){screen=before.screen;activeTab=before.activeTab;selectedDomain=before.selectedDomain;previewCollapsed=before.previewCollapsed;previewMode=before.previewMode;expandedPlanItems=new Set(before.expanded);render();},
 returnTarget:()=>document.querySelector('[data-learn-guided-tour]')
};

// Root event handlers
$('#patient-select').innerHTML=CASES.map(c=>`<option value="${c.id}">${safe(c.name)} · ${c.id}</option>`).join('');
$('#patient-select').addEventListener('change',e=>{const patientId=e.target.value;if(!mayLeaveWork()){e.target.value=selectedId;return;}if(practiceMode)leavePractice();selectedId=patientId;activeTab='plan';selectedDomain='function';previewMode='draft';expandedPlanItems=new Set(['today']);go(screen)});
$('#actor').addEventListener('change',e=>{role=e.target.value;render()});
$('#domain-grid').addEventListener('click',e=>{const button=e.target.closest('[data-domain]');if(!button)return;selectedDomain=button.dataset.domain;activeTab='issues';render()});
$('.tabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(!b)return;activeTab=b.dataset.tab;render()});
$('#work-pane').addEventListener('change',e=>{
 if(e.target.matches('[data-edit]'))updatePlan(e.target);
 if(e.target.matches('[data-destination]'))updateDestination(e.target);
 if(e.target.matches('[data-appointment]'))updateAppointment(e.target);
 if(e.target.matches('[data-issue-edit]'))updateIssue(e.target);
 if(e.target.matches('[data-doc-category]')){const doc=get().draft.docs.find(d=>d.id===e.target.closest('[data-doc]')?.dataset.doc);if(doc&&['MEDICATION','GENERAL'].includes(e.target.value)){const before=deepCopy(get());if(mutateBeforeEdit()){doc.category=e.target.value;doc.status='REGISTERED';audit(get(),role,'PDF_CATEGORY_CHANGED','문서 구분 변경 · 재검토 필요');if(saveWorkflow(before))render();}}}
 if(e.target.matches('[data-doc-edit]')){const doc=get().draft.docs.find(d=>d.id===e.target.closest('[data-doc]')?.dataset.doc);if(doc&&mutateBeforeEdit()){doc.visibility=e.target.value;doc.status='REGISTERED';audit(get(),role,'PDF_SCOPE_CHANGED',`${doc.name}: ${doc.visibility}`);save();render()}}
 if(e.target.id==='file-attach')addDoc(e.target.files?.[0]);
});
$('#work-pane').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action;
 if(a==='jump-followup'){
  expandedPlanItems.add('followup');
  renderPlan();
  const section=document.querySelector('#work-pane details[data-item="followup"]');
  section?.scrollIntoView({behavior:'smooth',block:'start'});
  section?.querySelector('summary')?.focus({preventScroll:true});
  if(!canEdit())announce('이미 발행된 계획은 새 버전 개정 후 외래 일정을 수정할 수 있어요.');
  return;
 }
 if(a==='resolve')resolveIssue(b);
 if(['open-doc','review-doc','remove-doc'].includes(a))docAction(a,b);
 if(a==='select-source')openSourceDialog(b.dataset.sourceKind,b.dataset.sourceTarget);
 if(a==='remove-item-source')changeItemSource(b.dataset.sourceTarget,b.dataset.sourceId,true);
 if(a==='view-source')openSourceDialog('view',null,b.dataset.sourceId);
 if(a==='print-draft')buildPrint(null,true);
 if(a==='print-published'){const p=currentPublished(get());if(p)buildPrint(p.snapshot,false)}
});
$('#show-current').addEventListener('click',()=>{if(!currentPublished(get()))return;previewMode=previewMode==='published'?'draft':'published';renderPreview()});
$('#integrated-receive').addEventListener('click',receiveIntegratedAssessment);
$('#integrated-discard').addEventListener('click',()=>{
 try{
  const prior=storage.getItem(HANDOFF_KEY);
  if(prior===null)return refreshIntegrationInbox();
  if(!window.confirm('미처리 A2 평가를 삭제할까요? 기존 A3 계획은 변경되지 않습니다.'))return;
  if(storage.getItem(HANDOFF_KEY)!==prior)throw Error('다른 탭에서 인계 정보가 변경되었습니다.');
  storage.removeItem(HANDOFF_KEY);refreshIntegrationInbox();announce('미처리 인계 자료를 삭제했습니다.');
 }catch(error){announce('인계함 정리 실패: '+(error?.message||'저장소 오류'));}
});
$('#request').addEventListener('click',requestReview);$('#return').addEventListener('click',returnReview);$('#approve').addEventListener('click',approve);$('#publish').addEventListener('click',publish);$('#revise').addEventListener('click',revise);$('#request-revoke').addEventListener('click',requestRevocation);$('#reject-revoke').addEventListener('click',rejectRevocation);$('#revoke').addEventListener('click',revoke);
$('#reset').addEventListener('click',()=>{if(!confirm(`현재 ${selectedId}의 작성 내용과 이력을 초기화할까요?`))return;const currentDocIds=new Set(get()?.draft?.docs?.map(d=>d.id)||[]);currentStore()[selectedId]=makeInitial(selectedId);for(const key of currentDocIds)fileStore.delete(key);activeTab='plan';previewMode='draft';expandedPlanItems=new Set(['today']);save();render();announce('작성 내용을 초기화했습니다.')});
function toggleRail(flag){collapsed=flag;$('#shell').classList.toggle('rail-collapsed',collapsed);$('#rail-toggle').setAttribute('aria-expanded',String(!collapsed));$('#rail-toggle').setAttribute('aria-label',collapsed?'사이드바 펼치기':'사이드바 접기');$('#rail-toggle').title=collapsed?'사이드바 펼치기':'사이드바 접기';try{localStorage.setItem('a3-rail-collapsed-v04',collapsed?'1':'0')}catch{}}
$('#rail-toggle').addEventListener('click',()=>toggleRail(!collapsed));toggleRail(collapsed);save();journey=[routeEntry()];journeyIndex=0;routeURL();render();updateJourney();bootstrapping=false;
$('#journey-back').addEventListener('click',()=>traverseJourney(-1));$('#journey-next').addEventListener('click',()=>traverseJourney(1));
window.addEventListener('storage',e=>{if(e.key===HANDOFF_KEY||e.key===null)refreshIntegrationInbox();});

// A1, A2 and standalone patient preview are navigable local screens; no A2 baseline files are mutated.
document.querySelectorAll('[data-nav]').forEach(button=>button.addEventListener('click',()=>{
 go(button.dataset.nav);
}));
$('#top-help').addEventListener('click',()=>$('#help-dialog').showModal());
$('#help-dialog').addEventListener('click',e=>{if(e.target.closest('[data-open-learning]')){$('#help-dialog').close();learningUnit='intro';go('learn')}});
$('#gate-banner').addEventListener('click',()=>{if(get().draft.status==='PUBLISHED'&&!noBlock().length){activeTab='history';go('plan')}else showBlockers()});
$('#patient-list').addEventListener('click',e=>{const b=e.target.closest('[data-patient-pick]');if(b)choosePatient(b.dataset.patientPick,b.dataset.targetScreen)});
document.querySelectorAll('[data-close-dialog]').forEach(button=>button.addEventListener('click',()=>document.getElementById(button.dataset.closeDialog).close()));
$('#blockers-list').addEventListener('click',e=>{const b=e.target.closest('[data-blocker-id]');if(b)jumpToBlocker(b.dataset.blockerId)});
$('#preview-toggle').addEventListener('click',togglePreview);
$('#open-preview-page').addEventListener('click',()=>go('patient-preview'));
$('#open-patient-b').addEventListener('click',()=>{if(practiceMode){announce('실습 사본은 환자 앱에 공개되지 않습니다.');return;}const url=new URL('../patient/index.html',location.href);url.searchParams.set('patient',selectedId);url.searchParams.set('encounter',encounterFor(selectedId));window.location.assign(url.href);});
$('#aux-screen').addEventListener('click',e=>{
 const pick=e.target.closest('[data-patient-pick]');if(pick){choosePatient(pick.dataset.patientPick,pick.dataset.targetScreen);return;}
 if(e.target.closest('[data-open-assessment]')){go('assessment');return;}
 const domain=e.target.closest('[data-a2-domain]');if(domain){selectedDomain=domain.dataset.a2Domain;renderAuxiliary();return}
 if(e.target.closest('#back-to-plan'))go('plan');
 if(e.target.closest('#reset-evaluation')){
  if(!canEdit()||!confirm('현재 환자의 평가 입력만 합성 초기값으로 복원할까요? 승인 무효화 및 평가 재반영이 필요합니다.'))return;
  const before=deepCopy(get());let next=get();
  try{const initial=CASES.find(c=>c.id===selectedId).values;for(const d of ENGINE_DOMAINS)for(const f of d.fields)next=editEvaluation(next,d.id,f.id,initial[d.id]?.[f.id]??null,role);currentStore()[selectedId]=next;if(saveWorkflow(before))render();}
  catch(error){currentStore()[selectedId]=before;announce(error.message);render();}return;
 }
 if(e.target.closest('#handoff-a2'))handoffAssessment();
 if(e.target.closest('#aux-switch-preview')){previewMode=previewMode==='published'?'draft':'published';renderAuxiliary()}
});
$('#aux-screen').addEventListener('change',e=>{
 const input=e.target.closest('[data-a2-field]');if(!input)return;
 const before=deepCopy(get()),fieldId=input.id;
 try{currentStore()[selectedId]=editEvaluation(get(),selectedDomain,input.dataset.a2Field,input.value||null,role);if(!saveWorkflow(before))return;render();document.getElementById(fieldId)?.focus();}
 catch(error){announce(error.message);render();}
});


$('#source-list').addEventListener('click',e=>{
 const c=e.target.closest('[data-connect-source]');if(c){selectSource(c.dataset.connectSource);return}
 const u=e.target.closest('[data-unlock-source]');if(u)unlockSource(u.dataset.unlockSource);
});
$('#aux-screen').addEventListener('click',e=>{
 if(e.target.closest('[data-learn-guided-tour]')){openPatientTour(e.target.closest('[data-learn-guided-tour]'),tourBridge);return;}
 const unit=e.target.closest('[data-learn-unit]');if(unit){learningUnit=unit.dataset.learnUnit;renderLearning();return}
 const start=e.target.closest('[data-study-start]');if(start){startPractice(start.dataset.studyStart,true);return}
 const resume=e.target.closest('[data-study-resume]');if(resume){startPractice(resume.dataset.studyResume,false);return}
 if(e.target.closest('[data-study-leave]')){leavePractice();return}
 const nav=e.target.closest('[data-learn-go]');if(nav){learnNavigate(nav.dataset.learnGo);return}
 const src=e.target.closest('[data-learn-source-patient]');if(src){openSourceDialog('learn',null,null,src.dataset.learnSourcePatient);return}
 if(e.target.closest('[data-learn-hint]')){
  learningHint++;const instructions=CASE_MISSIONS[selectedId].steps;
  const tips=['먼저 발행 전 확인사항에서 남은 항목을 살펴보세요.',`관련 케이스의 첫 목표: ${instructions[0]}`,`실행 순서: ${instructions.join(' → ')}`];
  const dest=$('#learn-hint-text');if(dest)dest.textContent=tips[Math.min(learningHint-1,tips.length-1)];
 }
});
$('#aux-screen').addEventListener('input',e=>{
 if(e.target.id!=='learn-search')return;
 learnFilter=e.target.value;
 const container=$('.learn-faq');if(!container)return;
 container.innerHTML=FAQ.filter(([a,b])=>(a+b).includes(learnFilter)).map(([a,b])=>`<details><summary>${safe(a)}</summary><p>${safe(b)}</p></details>`).join('')||'<p>일치하는 설명이 없습니다.</p>';
});

// Remember expansion synchronously; a fast field change can render before native toggle fires.
$('#work-pane').addEventListener('click',e=>{const summary=e.target.closest('summary.edit-title');const card=summary?.parentElement;if(!card?.matches('details[data-item]'))return;if(card.open)expandedPlanItems.delete(card.dataset.item);else expandedPlanItems.add(card.dataset.item);},true);
$('#work-pane').addEventListener('toggle',e=>{const details=e.target.closest('details[data-item]');if(!details)return;if(details.open)expandedPlanItems.add(details.dataset.item);else expandedPlanItems.delete(details.dataset.item)},true);

document.addEventListener('click',e=>{const b=e.target.closest('[data-review-domain]');if(!b)return;selectedDomain=b.dataset.reviewDomain;$('#blockers-dialog').close();go('assessment');document.querySelector('.a2-input-panel h2')?.scrollIntoView({block:'center'});document.querySelector('.a2-input-panel select')?.focus({preventScroll:true});});

window.addEventListener('beforeunload',event=>{if(!mayLeaveWork()){event.preventDefault();event.returnValue='';}});
document.querySelector('.journey-nav a').addEventListener('click',event=>{if(!mayLeaveWork())event.preventDefault();});
