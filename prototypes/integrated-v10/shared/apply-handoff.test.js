import test from 'node:test';
import assert from 'node:assert/strict';
import {CASES} from '../a2/data.js';
import {createAssessmentHandoff} from './handoff.js';
import {applyAssessmentHandoff} from './apply-handoff.js';
import {makeInitial} from '../a3/workflow.js';
const packet=()=>createAssessmentHandoff('SYN-002',structuredClone(CASES[1].values),new Date('2026-10-21T09:00:00.000Z'));
test('A2 handoff creates new immutable A3 assessment and invalidates reviews',()=>{
 const initial=makeInitial('SYN-002'),input=packet();
 initial.draft.status='APPROVED';initial.draft.approval={digest:'old'};
 const before=structuredClone(initial);
 const {record:next,duplicate}=applyAssessmentHandoff(initial,input);
 assert.equal(duplicate,false);
 assert.notEqual(next,initial);
 assert.deepEqual(initial,before);
 assert.equal(next.assessment.id,input.assessmentId);
 assert.equal(next.assessment.domainResults.length,6);
 assert.equal(next.draft.status,'DRAFT');
 assert.equal(next.draft.approval,null);
 assert.ok(next.draft.items.every(i=>!i.verified));
 assert.equal(next.audit[0].event,'ASSESSMENT_IMPORTED');
 const dup=applyAssessmentHandoff(next,input);
 assert.equal(dup.duplicate,true);
});
test('cross-patient import and currently published plan reject safely',()=>{
 const p=packet();
 assert.throws(()=>applyAssessmentHandoff(makeInitial('SYN-001'),p));
 const published=makeInitial('SYN-002');published.draft.status='PUBLISHED';
 assert.throws(()=>applyAssessmentHandoff(published,p));
});
test('A2 missing/CONFLICT values remain blocked in A3',()=>{
 const values=structuredClone(CASES[1].values);
 values.medication.medUnderstanding=null;values.medical.condition='CONFLICT';
 const p=createAssessmentHandoff('SYN-002',values,new Date('2026-10-21T09:00:00.000Z'));
 const result=applyAssessmentHandoff(makeInitial('SYN-002'),p).record;
 assert.equal(result.assessment.domainResults.find(d=>d.id==='medical').status,'CONFLICTING');
 assert.equal(result.assessment.domainResults.find(d=>d.id==='medication').status,'UNKNOWN');
 assert.ok(result.draft.issues.length>=2);
});
test('same assessment ID with different values is not silently treated as a duplicate',()=>{
 const first=packet(),record=applyAssessmentHandoff(makeInitial('SYN-002'),first).record;
 const values=structuredClone(CASES[1].values);values.function.gait='device';
 const collision=createAssessmentHandoff('SYN-002',values,new Date(first.capturedAt));
 assert.equal(collision.assessmentId,first.assessmentId);
 assert.throws(()=>applyAssessmentHandoff(record,collision),/식별자|내용/);
});
test('older assessment cannot replace a newer imported assessment',()=>{
 const newer=createAssessmentHandoff('SYN-002',CASES[1].values,new Date('2026-10-21T10:00:00.000Z'));
 const record=applyAssessmentHandoff(makeInitial('SYN-002'),newer).record;
 assert.throws(()=>applyAssessmentHandoff(record,packet()),/이전|오래된/);
});
test('handoff invalidates reviewed patient PDFs but preserves publications and internal docs',()=>{
 const r=makeInitial('SYN-002');r.draft.docs=[{id:'patient',visibility:'PATIENT',status:'REVIEWED'},{id:'internal',visibility:'INTERNAL',status:'REVIEWED'}];
 const published={id:'previous',status:'PUBLISHED',snapshot:{planVersion:'1.0',items:[]}};r.publications=[published];
 const result=applyAssessmentHandoff(r,packet()).record;
 assert.equal(result.draft.docs[0].status,'REGISTERED');assert.equal(result.draft.docs[1].status,'REVIEWED');assert.deepEqual(result.publications,[published]);assert.equal(r.draft.docs[0].status,'REVIEWED');
});
