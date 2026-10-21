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
