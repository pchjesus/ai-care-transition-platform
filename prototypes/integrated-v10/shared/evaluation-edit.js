import {DOMAINS} from '../a2/data.js';
import {evaluateForReview} from './assessment-adapter.js';
import {issuesFromValues,audit} from '../a3/workflow.js';
function editable(record){
 if(!record||!['DRAFT','REVIEW_REQUESTED','CHANGES_REQUESTED','APPROVED'].includes(record.draft?.status))
  throw Error('발행된 계획은 새 버전 개정 후 평가를 변경하세요.');
}
// Pure transitions let the UI persist atomically or restore the unchanged record on failure.
export function editEvaluation(record,domainId,fieldId,value,role='system'){
 editable(record);
 const field=DOMAINS.find(d=>d.id===domainId)?.fields.find(f=>f.id===fieldId);
 if(!field||!(value===null||value==='CONFLICT'||field.options.some(o=>o[0]===value)))throw Error('알 수 없는 평가 입력입니다.');
 if((record.a2Values[domainId]?.[fieldId]??null)===value)return record;
 const next=structuredClone(record);
 next.a2Values[domainId]??={};next.a2Values[domainId][fieldId]=value;next.a2Dirty=true;
 next.draft.status='DRAFT';next.draft.approval=null;
 audit(next,role,'EVALUATION_EDITED',domainId+'.'+fieldId+' · 승인 무효화, 평가 반영 및 재검토 필요');
 return next;
}
export function commitEvaluation(record,role='system'){
 editable(record);if(!record.a2Dirty)return record;
 const next=structuredClone(record),capturedAt=new Date().toISOString();
 next.assessment={id:'AS-'+record.patientId+'-'+crypto.randomUUID(),
  ...(record.encounterId?{encounterId:record.encounterId}:{}),ruleVersion:'v0.1',capturedAt,
  values:structuredClone(next.a2Values),domainResults:evaluateForReview(next.a2Values)};
 next.a2Dirty=false;next.draft.status='DRAFT';next.draft.approval=null;
 // Preserve non-assessment clinical issues; assessment-derived resolutions must be reviewed anew.
 const assessmentIds=new Set(DOMAINS.flatMap(d=>d.fields.map(f=>'ISS-'+d.id+'-'+f.id)));
 next.draft.issues=[...issuesFromValues(next.a2Values),...next.draft.issues.filter(i=>!assessmentIds.has(i.id))];
 for(const item of next.draft.items)item.verified=false;
 for(const doc of next.draft.docs)if(doc.visibility==='PATIENT')doc.status='REGISTERED';
 audit(next,role,'ASSESSMENT_IMPORTED',next.assessment.id+' · A2 엔진 평가 반영, 항목 및 PDF 재검토 필요');
 return next;
}
