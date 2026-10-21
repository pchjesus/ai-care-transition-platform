import {CASES,DOMAINS,SOURCES} from './data.js';
import {evaluateAll,evaluateDomain,chooseAction,TIER_LABELS} from './engine.js';

const $=(sel)=>document.querySelector(sel);
const escapeHtml=(raw)=>String(raw??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let selectedCase=0,selectedDomain='function';
let values=structuredClone(CASES[0].values);
const dialog=$('#modal');
function setHtml(el,html){$(el).innerHTML=html;}
const domainById=(id)=>DOMAINS.find(d=>d.id===id);
const cls=(assessment)=>assessment.status!=='READY'?'unknown':assessment.tier===3?'priority':'';
function statusText(r){return r.status==='CONFLICTING'?'상충 · 보류':r.status==='UNKNOWN'?'미평가':`${r.tier} · ${TIER_LABELS[r.tier]}`;}
function gradeText(r){return r.status!=='READY'? '판단 보류' :`${r.tier}등급`}
function drawDomainList(all){
 setHtml('#domains',DOMAINS.map((d,i)=>{
 const r=all[i];return `<button type="button" class="domain-item ${selectedDomain===d.id?'is-selected':''}" data-domain="${d.id}" aria-pressed="${selectedDomain===d.id}"><span><strong>${String(i+1).padStart(2,'0')} · ${d.title}</strong><small>${d.hint}</small></span><span class="domain-value ${cls(r)}">${r.status==='READY'?r.tier+'등급':r.status==='CONFLICTING'?'상충':'미평가'}</span></button>`;
 }).join(''));
}
function drawForm(domain,r){
 setHtml('#domain-kicker',`DOMAIN ${String(DOMAINS.indexOf(domain)+1).padStart(2,'0')} / 06`);
 $('#detail-domain-name').textContent=domain.title;
 $('#detail-domain-hint').textContent=domain.hint;
 $('#detail-count').textContent=`필수 ${r.totalRequired}개 · 전체 ${domain.fields.length}개`;
 setHtml('#detail-grade',`<span class="grade-main ${cls(r)}">${statusText(r)}</span>`);
 setHtml('#assessment-form',domain.fields.map((field,index)=>{
 const value=values[domain.id][field.id]||'';
 const opts=[['','미확인 · 자료 없음'],['CONFLICT','상충 · 자료 간 불일치'],...field.options.map(([v,label])=>[v,label])];
 return `<div class="field"><div class="field-top"><label for="field-${field.id}">${String(index+1).padStart(2,'0')}. ${escapeHtml(field.label)}</label>${field.required?'<span class="required">필수 확인</span>':'<span class="option-extra">추가 확인</span>'}</div><select id="field-${field.id}" data-field="${field.id}">${opts.map(([v,label])=>`<option value="${escapeHtml(v)}" ${v===value?'selected':''}>${escapeHtml(label)}</option>`).join('')}</select> </div>`;
 }).join(''));
 setHtml('#field-guidance',domain.fields.map((field,index)=>`<p><b>${String(index+1).padStart(2,'0')}. ${escapeHtml(field.label)}</b><br>${escapeHtml(field.note||'별도의 상세 설명 없음')} · 자료 확인 또는 기록 대조</p>`).join(''));
}
function drawInsight(d,r){
 const issueLines=[...r.confusions.map(x=>({text:`${x} — 기록 상충, 원천 확인 필요`,warn:true})),...r.missing.map(x=>({text:`${x} — 필수자료 확인 필요`,warn:true}))];
 for(const o of r.observed.filter(x=>x.tier>=2))issueLines.push({text:`${o.label} — ${o.value}`,warn:false});
 const highest = r.traces.filter(x=>x.severity!==null&&x.severity>0).sort((a,b)=>b.severity-a.severity).slice(0,5);
 $('#grade-description').textContent=r.status!=='READY'?'누락·상충 정보를 확인한 후 판단할 수 있습니다.':'';
 setHtml('#side-grade',`<div class="grade-value ${cls(r)}">${gradeText(r)}</div>`);
 setHtml('#findings',issueLines.length?issueLines.slice(0,2).map(x=>`<div class="findings-line ${x.warn?'warn':''}"><span class="dot"></span><span>${escapeHtml(x.text)}</span></div>`).join('')+(issueLines.length>2?`<details class="additional-findings"><summary>그 밖의 확인사항 ${issueLines.length-2}건 보기</summary>${issueLines.slice(2).map(x=>`<div class="findings-line ${x.warn?'warn':''}"><span class="dot"></span><span>${escapeHtml(x.text)}</span></div>`).join('')}</details>`:''):`<p class="empty-note">추가 확인사항이 없습니다.</p>`);
 setHtml('#trace',highest.length?highest.map(x=>`<div class="trace-line"><strong>${escapeHtml(x.name)}</strong><p>${escapeHtml(x.reason)}</p><span class="rule-id">${escapeHtml(x.id)} · 자체 검토규칙</span></div>`).join(''):`<p class="empty-note">해당 영역에서 추가 검토 사유가 계산되지 않았습니다.</p>`);
 setHtml('#sources',d.sources.map(x=>`<a href="${SOURCES[x].url}" target="_blank" rel="noopener noreferrer">${escapeHtml(SOURCES[x].label)} ↗</a>`).join(''));
}
function render(){
 const patient=CASES[selectedCase];
 $('#patient-name').textContent=`${patient.name} · ${patient.age}세`;
 $('#patient-subtitle').textContent=`${patient.id} · ${patient.label} · 퇴원예정 ${patient.discharge}`;
 const all=evaluateAll(values);
 let known=0, required=0;
 for(const r of all){known+=r.knownRequired;required+=r.totalRequired;}
 $('#total-complete').textContent=`${known} / ${required}`;
 $('#total-unknown').textContent=`${all.filter(r=>r.status!=='READY').length}건`;
 $('#total-priority').textContent=`${all.filter(r=>r.status==='READY' && r.tier===3).length}영역`;
 drawDomainList(all);
 const d=domainById(selectedDomain),r=all.find(x=>x.domain===selectedDomain);
 $('#selected-domain-label').textContent=d.title;
 drawForm(d,r);
 drawInsight(d,r);
}
function openModal(title,content){$('#modal-title').textContent=title;setHtml('#modal-content',content);if(!dialog.open)dialog.showModal();}
function showMethod(){openModal('업무 검토등급 기준',`<h3>등급 의미</h3><ul><li>0: 현재 자료에서 추가 지원 확인되지 않음</li><li>1: 일반 안내·교육 검토</li><li>2: 추가 지원 검토</li><li>3: 퇴원 전 우선 검토</li></ul><h3>정보 부족·상충</h3><p>필수 자료가 없으면 미평가, 서로 다른 기록이 충돌하면 상충으로 표시합니다. 두 상태 모두 등급 계산을 보류합니다.</p><h3>판단 근거</h3><p>세부 판단 근거와 해당 규칙 ID는 아래 '세부 판단 근거·참고자료 보기'에서 확인할 수 있습니다.</p>`);}
function showA1(){openModal('A1 · 환자 목록',`${CASES.map((c,i)=>`<div class="review-item"><b>${c.name} · ${c.id}</b><div>${c.label} · 퇴원예정 ${c.discharge}</div><button type="button" class="text-btn" data-pick="${i}">이 환자 선택 →</button></div>`).join('')}`);}
function showA3(){const all=evaluateAll(values),ready=all.filter(x=>x.status==='READY'),needs=all.filter(x=>x.status!=='READY');const candidates=ready.filter(x=>x.tier>=1).map(x=>{const act=chooseAction(x.domain,x.tier);return {act,tier:x.tier,domain:x.domain};}).filter(x=>x.act);openModal('A3 · 퇴원계획 검토 초안',`<div class="review-stage">${CASES[selectedCase].name} · 검토 대기</div>${needs.length?`<h3>추가 확인 필요</h3><ul>${needs.map(x=>`<li>${domainById(x.domain).title}: ${x.status==='CONFLICTING'?'기록 상충':'필수 정보 누락'}</li>`).join('')}</ul>`:''}<h3>검토할 행동 초안 (${candidates.length}개)</h3>${candidates.length?candidates.map(x=>`<div class="review-item"><b>${escapeHtml(x.act.title)} · ${x.tier}등급</b><div>${escapeHtml(x.act.detail)}</div><small>분류 ${escapeHtml(x.act.category)}</small></div>`).join(''):'<p>추가 검토 초안이 없습니다.</p>'}`);}
const railToggle=$('#toggle-rail');
const shell=$('.shell');
const railKey='a2-workbench-rail-collapsed-v04';
function setRailCollapsed(collapsed,{persist=true}={}){
  shell.classList.toggle('is-rail-collapsed',collapsed);
  railToggle.setAttribute('aria-expanded',String(!collapsed));
  railToggle.setAttribute('aria-label',collapsed?'사이드바 펼치기':'사이드바 접기');
  railToggle.title=collapsed?'사이드바 펼치기':'사이드바 접기';
  railToggle.textContent=collapsed?'›':'‹';
  if(persist){try{localStorage.setItem(railKey,collapsed?'1':'0');}catch{ /* storage may be unavailable */ }}
}
let initialCollapsed=false;
try{initialCollapsed=localStorage.getItem(railKey)==='1';}catch{}
setRailCollapsed(initialCollapsed,{persist:false});
railToggle.addEventListener('click',()=>setRailCollapsed(!shell.classList.contains('is-rail-collapsed')));
$('#patient-select').innerHTML=CASES.map((c,i)=>`<option value="${i}">${c.name} (${c.id})</option>`).join('');
$('#patient-select').addEventListener('change',e=>{selectedCase=Number(e.target.value);values=structuredClone(CASES[selectedCase].values);selectedDomain='function';render();});
$('#domains').addEventListener('click',e=>{const btn=e.target.closest('[data-domain]');if(!btn)return;selectedDomain=btn.dataset.domain;render();});
$('#assessment-form').addEventListener('change',e=>{if(!e.target.matches('[data-field]'))return;const field=e.target.dataset.field;const v=e.target.value;values[selectedDomain][field]=v||null;render();document.querySelector(`[data-field="${field}"]`)?.focus({preventScroll:true});});
$('#reset').addEventListener('click',()=>{values=structuredClone(CASES[selectedCase].values);render();});
for(const id of ['#open-a1'])$(id).addEventListener('click',showA1);
for(const id of ['#open-a2'])$(id).addEventListener('click',()=>{$('#domains').scrollIntoView({behavior:'smooth',block:'nearest'});});
for(const id of ['#open-a3','#open-a3-bottom'])$(id).addEventListener('click',showA3);
$('#show-method').addEventListener('click',showMethod);
$('#modal-content').addEventListener('click',e=>{const b=e.target.closest('[data-pick]');if(!b)return;selectedCase=Number(b.dataset.pick);$('#patient-select').value=String(selectedCase);values=structuredClone(CASES[selectedCase].values);dialog.close();render();});
$('#modal-close').addEventListener('click',()=>dialog.close());$('#modal-dismiss').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
render();