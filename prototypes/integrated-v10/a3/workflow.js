import {evaluateForReview} from '../shared/assessment-adapter.js';
import {DOMAINS, CASES, SECTIONS} from './data.js';
import {findSource,usableSource} from './source-library.js';
export const deepCopy=x=>structuredClone(x);
export const now=()=>new Date().toISOString();
export const evaluateA2=caseData=>evaluateForReview(caseData.values);
export function issuesFromValues(values){
 const issues=[];
 for(const domain of DOMAINS){for(const [id,label,required,options] of domain.fields){
   const raw=values?.[domain.id]?.[id];
   if((required && !options.some(option=>option[0]===raw)) || raw==='CONFLICT' || (domain.id==='medication'&&id==='reconciliation'&&raw==='conflict')){
     issues.push({id:`ISS-${domain.id}-${id}`,domain:domain.id,title:label,reason:raw===null||raw===undefined||raw===''?'필수 평가자료가 아직 확인되지 않았습니다.':'서로 다른 약물 목록 또는 기록의 상충 사항이 남아 있습니다.',status:'OPEN',source:'',resolution:'',reviewer:''});
   }
 }}
 return issues;
}
export function makeInitial(caseId){
 const c=CASES.find(c=>c.id===caseId);if(!c)throw Error('No synthetic case');
 const result=evaluateA2(c),issues=issuesFromValues(c.values);
 const complete=caseId==='SYN-002';
 const sourceSuffix={today:'NUR-01',medication:'MED-01',followup:'APT-01',warning:'WARN-01',contact:'CON-01',support:'SOC-01'};
 const items=SECTIONS.map(s=>({id:s.id,section:s.id,title:s.label,text:s.defaultText,source:complete||caseId==='SYN-004'?`SRC-${caseId.replace('SYN-','SYN')}-${sourceSuffix[s.id]}`:'',verified:complete||caseId==='SYN-004',visibility:'PATIENT'}));
 if(caseId==='SYN-001')issues.push({id:'ISS-plan-med-original',domain:'medication',title:'환자용 복약 안내의 확인된 원문',reason:'복약 안내문 원천자료를 확인하고 담당자의 검토를 완료해 주세요.',status:'OPEN',source:'',resolution:'',reviewer:''});
 const created=now();
 const record={schema:2,unlockedSources:[],patientId:c.id,a2Values:deepCopy(c.values),a2Dirty:false,assessment:{id:`AS-${c.id}-001`,ruleVersion:'v0.1',capturedAt:created,values:deepCopy(c.values),domainResults:result},draft:{version:'0.1',status:'DRAFT',items,docs:[],issues,approval:null,createdAt:created,updatedAt:created},publications:[],audit:[{at:created,role:'system',event:'INIT',details:'합성 환자 A2 스냅샷에서 최초 계획 초안 생성'}]};
 if(caseId==='SYN-004'){
  record.draft.version='1.0';record.draft.status='PUBLISHED';record.draft.approval={by:'SIM-APPROVER',role:'지정 최종 승인자',at:created,digest:'historical-demo-approval'};
  const snapshot=publishedPayload(record);snapshot.issuedAt=created;record.publications.push({id:'PUB-SYN004-V1',snapshot,status:'PUBLISHED'});
  audit(record,'system','PUBLISHED','사전 발행된 합성 v1.0 학습 시나리오');
 }
 return record;
}
// Support old single-source drafts without mutating their saved fingerprint.
export function linkedSources(item){
 if(Array.isArray(item.sources))return item.sources;
 return typeof item.source==='string'&&item.source?[item.source]:[];
}
export function validItemSources(record,item){
 const ids=linkedSources(item);
 return ids.length>0&&ids.length<=12&&new Set(ids).size===ids.length&&
  (!Array.isArray(item.sources)||item.source===ids[0])&&
  ids.every(id=>typeof id==='string'&&usableSource(findSource(id,record.patientId,record.unlockedSources||[]),'item',item.section,record.patientId));
}
export function currentPublished(record){return record.publications.find(p=>p.status==='PUBLISHED')||null;}
export function blockers(record, availableDocs=new Set()){
 const d=record.draft,res=[],assessmentIssues=issuesFromValues(record.assessment.values);
 if(record.a2Dirty)res.push({id:'assessment-dirty',label:'변경된 A2 평가를 계획에 인계해야 합니다',group:'evidence'});
 // Re-derive hard assessment gates; a missing draft issue must never remove them.
 for(const issue of assessmentIssues){
  if(!d.issues.some(existing=>existing.id===issue.id))res.push({id:issue.id,label:`${issue.title}: A2 원자료 수정·인계 필요`,group:'evidence'});
 }
 for(const issue of d.issues){
  const src=findSource(issue.source,record.patientId,record.unlockedSources||[]);
  const unresolvedAssessment=assessmentIssues.some(required=>required.id===issue.id);
  if(issue.status!=='RESOLVED'||!usableSource(src,'issue',issue,record.patientId)||unresolvedAssessment)res.push({id:issue.id,label:`${issue.title}: 확인 기록 필요${unresolvedAssessment?' · A2 원자료 수정·인계 필요':''}`,group:'evidence'});
 }
 const patientItems=d.items.filter(x=>x.visibility==='PATIENT');
 for(const sec of ['today','medication','followup','warning','contact']){
   if(!patientItems.some(i=>i.section===sec&&i.text.trim()))res.push({id:`section-${sec}`,label:`필수 안내 '${SECTIONS.find(s=>s.id===sec).label}' 없음`,group:'plan'});
 }
 for(const item of patientItems){if(!item.text.trim())res.push({id:`item-${item.id}-text`,label:`${item.title}: 안내 내용이 비어 있음`,group:'plan'});
   if(!item.verified||!validItemSources(record,item))res.push({id:`item-${item.id}-source`,label:`${item.title}: 확인된 원천정보·검토 누락`,group:'plan'});
 }
 for(const doc of d.docs.filter(x=>x.visibility==='PATIENT')){
   if(doc.status!=='REVIEWED')res.push({id:`doc-${doc.id}`,label:`${doc.name}: 환자 공개용 PDF 검토 미완료`,group:'docs'});
   if(!availableDocs.has(doc.id))res.push({id:`file-${doc.id}`,label:`${doc.name}: PDF 파일 원본을 다시 첨부해야 합니다`,group:'docs'});
 }
 return res;
}
export function fingerprint(record){
 const d=record.draft;const str=JSON.stringify({patientId:record.patientId,assessment:record.assessment,version:d.version,items:d.items,docs:d.docs.map(({id,name,size,visibility,status,fileHash})=>({id,name,size,visibility,status,fileHash})),issues:d.issues});
 let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0');
}
export function mayApprove(record,role,availableDocs){return record.draft.status==='REVIEW_REQUESTED'&&role==='APPROVER'&&blockers(record,availableDocs).length===0;}
export function mayPublish(record,role,availableDocs){return role==='APPROVER'&&record.draft.status==='APPROVED'&&!!record.draft.approval&&record.draft.approval.digest===fingerprint(record)&&blockers(record,availableDocs).length===0;}
export function audit(record,role,event,details=''){record.audit.unshift({at:now(),role,event,details});record.audit=record.audit.slice(0,120);record.draft.updatedAt=now();}
export function publishedPayload(record){
 // Explicit patient-facing projection: never copy internal source IDs, audit or reviewer identifiers.
 return {patientId:record.patientId,planVersion:record.draft.version,approvedAt:record.draft.approval?.at||null,
 items:deepCopy(record.draft.items.filter(i=>i.visibility==='PATIENT').map(({id,title,section,text})=>({id,title,section,text}))),
 documents:deepCopy(record.draft.docs.filter(d=>d.visibility==='PATIENT').map(({id,name})=>({id,name}))),issuedAt:now()};
}
export function makeRevision(record){
 const p=currentPublished(record)||(record.draft.status==='REVOKED'?record.publications.find(p=>p.status==='REVOKED'):null);if(!p||!['PUBLISHED','REVOKED'].includes(record.draft.status))throw Error('No publication available for revision');
 const clone=deepCopy(record); const prev=p.snapshot.planVersion.split('.');
 clone.draft.version=`${Number(prev[0])+1}.0`;
 clone.draft.status='DRAFT';clone.draft.approval=null;clone.draft.updatedAt=now();
 clone.draft.issues=deepCopy(record.draft.issues); // Preserve review evidence and unresolved gates.
 for(const item of clone.draft.items)item.verified=false; // Every new published version requires review.
 for(const doc of clone.draft.docs)if(doc.visibility==='PATIENT')doc.status='REGISTERED';
 audit(clone,'system','REVISION_START',`새 초안 ${clone.draft.version}, 기존 ${p.status==='REVOKED'?'철회 기록':'발행'} ${p.snapshot.planVersion} 유지`);
 return clone;
}
