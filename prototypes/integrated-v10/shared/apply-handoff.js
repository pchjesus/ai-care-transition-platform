import {evaluateA2,issuesFromValues,audit} from '../a3/workflow.js';
import {validateAssessmentHandoff} from './handoff.js';

// Pure transformation: callers must persist before announcing import success.
export function applyAssessmentHandoff(record,packet) {
 const handoff=validateAssessmentHandoff(packet);
 if(!record||record.patientId!==handoff.patientId)throw Error('환자 식별자가 서로 다릅니다.');
 if(record.encounterId&&record.encounterId!==handoff.encounterId)throw Error('서로 다른 입원건입니다.');
 if(record.assessment?.id===handoff.assessmentId)return {record,duplicate:true};
 if(!record.draft||['PUBLISHED','REVOKED'].includes(record.draft.status))
  throw Error('발행된 계획은 먼저 새 버전 개정을 시작해야 합니다.');
 if(!['DRAFT','REVIEW_REQUESTED','CHANGES_REQUESTED','APPROVED'].includes(record.draft.status))throw Error('인계할 수 없는 계획 상태입니다.');
 const computed=evaluateA2({values:handoff.values});
 for(const [i,d] of computed.entries()){
  const fromA2=handoff.domainResults[i];
  if(d.id!==fromA2.domain||d.status!==fromA2.status||d.grade!==fromA2.tier||
     d.provisionalGrade!==fromA2.provisionalTier||d.requiredDone!==fromA2.knownRequired||
     d.requiredTotal!==fromA2.totalRequired)throw Error('A2·A3 평가 엔진 결과 불일치: '+d.id);
 }
 const next=structuredClone(record);
 next.encounterId=handoff.encounterId;
 next.integration={source:'A2_V05',lastAssessmentId:handoff.assessmentId,lastImportedAt:new Date().toISOString()};
 next.a2Values=structuredClone(handoff.values);
 next.a2Dirty=false;
 next.assessment={id:handoff.assessmentId,encounterId:handoff.encounterId,
  ruleVersion:handoff.ruleVersion,capturedAt:handoff.capturedAt,
  values:structuredClone(handoff.values),domainResults:computed};
 next.draft.status='DRAFT';
 next.draft.approval=null;
 next.draft.issues=issuesFromValues(next.assessment.values);
 if(handoff.patientId==='SYN-001')next.draft.issues.push({
  id:'ISS-plan-med-original',domain:'medication',title:'환자용 복약 안내의 확인된 원문',
  reason:'복약 정보에 대한 확인된 원천자료가 필요합니다.',
  status:'OPEN',source:'',resolution:'',reviewer:''
 });
 for(const item of next.draft.items)item.verified=false;
 for(const doc of next.draft.docs)if(doc.visibility==='PATIENT')doc.status='REGISTERED';
 audit(next,'system','ASSESSMENT_IMPORTED',handoff.assessmentId+' · A2 원본에서 명시적으로 인계, 재검토 필요');
 return {record:next,duplicate:false};
}
