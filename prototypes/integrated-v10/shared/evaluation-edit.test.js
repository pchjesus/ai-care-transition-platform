import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DOMAINS,CASES} from '../a2/data.js';
import {evaluateAll} from '../a2/engine.js';
import {evaluateAll as original} from '../../hospital-a2/engine.js';
import {evaluateForReview} from './assessment-adapter.js';
import {editEvaluation,commitEvaluation} from './evaluation-edit.js';
import {makeInitial,makeRevision,mayPublish,fingerprint} from '../a3/workflow.js';
import {validStoredRecord} from '../a3/storage.js';
test('single engine is byte identical to preserved A2 v0.5; all choices and social combinations agree',()=>{
 assert.equal(readFileSync(new URL('../a2/engine.js',import.meta.url),'utf8'),readFileSync(new URL('../../hospital-a2/engine.js',import.meta.url),'utf8'));
 const check=values=>{
  const raw=original(values),adapted=evaluateForReview(values);
  assert.deepEqual(evaluateAll(values),raw);
  raw.forEach((d,i)=>{
   const a=adapted[i];assert.deepEqual([a.grade,a.provisionalGrade,a.status,a.requiredDone,a.requiredTotal,a.missing,a.conflicting,a.traces],[d.tier,d.provisionalTier,d.status,d.knownRequired,d.totalRequired,d.missing,d.confusions,d.traces]);
   assert.deepEqual(a.facts.map(({id,raw,...fact})=>fact),d.observed);
  });
 };
 for(const c of CASES)check(c.values);
 for(const d of DOMAINS)for(const f of d.fields)for(const v of [null,'CONFLICT','invalid',...f.options.map(o=>o[0])]){
  const values=structuredClone(CASES[1].values);values[d.id][f.id]=v;check(values);
 }
 const social=DOMAINS.find(d=>d.id==='social');
 for(const a of social.fields.find(f=>f.id==='caregiver').options)for(const b of social.fields.find(f=>f.id==='housing').options)for(const c of social.fields.find(f=>f.id==='travel').options){
  const values=structuredClone(CASES[1].values);Object.assign(values.social,{caregiver:a[0],housing:b[0],travel:c[0]});check(values);
 }
});
test('evaluation edit immediately invalidates approval without changing committed assessment or another patient',()=>{
 const r=makeInitial('SYN-002'),other=makeInitial('SYN-001'),before=structuredClone(r);
 r.draft.status='APPROVED';r.draft.approval={digest:fingerprint(r)};
 const edited=editEvaluation(r,'function','gait','device');
 assert.equal(edited.draft.status,'DRAFT');assert.equal(edited.draft.approval,null);assert.equal(edited.a2Dirty,true);
 assert.deepEqual(edited.assessment,before.assessment);assert.equal(r.a2Values.function.gait,'independent');assert.equal(other.patientId,'SYN-001');assert.equal(mayPublish(edited,'APPROVER'),false);
});
test('commit rederives issues, invalidates PDF review and plan checks, preserves publication and unrelated issue',()=>{
 const r=makeInitial('SYN-002');r.draft.docs=[{visibility:'PATIENT',status:'REVIEWED'},{visibility:'INTERNAL',status:'REVIEWED'}];
 r.draft.issues.push({id:'clinical-other',status:'OPEN'});r.publications=[{id:'historical',status:'SUPERSEDED',snapshot:{patientId:r.patientId}}];
 const edited=editEvaluation(r,'function','gait','CONFLICT'),next=commitEvaluation(edited);
 assert.equal(next.assessment.domainResults.find(d=>d.id==='function').status,'CONFLICTING');assert.equal(next.a2Dirty,false);assert.notEqual(next.assessment.id,r.assessment.id);
 assert(next.draft.issues.some(i=>i.id==='clinical-other'));assert(next.draft.issues.some(i=>i.id==='ISS-function-gait'));
 assert(next.draft.items.every(i=>!i.verified));assert.equal(next.draft.docs[0].status,'REGISTERED');assert.equal(next.draft.docs[1].status,'REVIEWED');assert.deepEqual(next.publications,r.publications);
});
test('published and revoked assessments reject edits and commit; revision permits edits while preserving snapshot',()=>{
 const r=makeInitial('SYN-004');assert.throws(()=>editEvaluation(r,'function','gait','device'));assert.throws(()=>commitEvaluation(r));
 const next=commitEvaluation(editEvaluation(makeRevision(r),'function','gait','device'));assert.deepEqual(next.publications,r.publications);assert.equal(next.draft.version,'2.0');assert(validStoredRecord(next,'SYN-004'));
 r.draft.status='REVOKED';assert.throws(()=>editEvaluation(r,'function','gait','device'));
});
test('invalid evaluation target or option cannot mutate a record',()=>{
 const r=makeInitial('SYN-002'),before=JSON.stringify(r);
 for(const args of [['unknown','gait','device'],['function','gait','unknown'],['function','unknown','device']])assert.throws(()=>editEvaluation(r,...args));
 assert.equal(JSON.stringify(r),before);
});
test('all four scenarios remain valid after evaluation commit; missing and medication conflict remain blocked',()=>{
 for(const id of ['SYN-001','SYN-002','SYN-003','SYN-004']){
  let r=makeInitial(id);if(id==='SYN-004')r=makeRevision(r);
  const next=commitEvaluation(editEvaluation(r,'function','gait',null));assert(validStoredRecord(next,id));assert(next.draft.issues.some(i=>i.id==='ISS-function-gait'));
  if(id==='SYN-003')assert(next.draft.issues.some(i=>i.id==='ISS-medication-reconciliation'));
 }
});
test('Phase 1 approved repository loads without changing its fingerprint, assessment or approval',async()=>{
 const {loadRepository,initializePatients}=await import('../a3/storage.js');
 const serialized=readFileSync(new URL('../tests/fixtures/phase1-approved-syn002.json',import.meta.url),'utf8');
 const state=loadRepository({getItem:()=>serialized},'fixture');assert.equal(state.error,null);
 const before=structuredClone(state.records['SYN-002']);initializePatients(state.records);
 assert.deepEqual(state.records['SYN-002'],before);assert(mayPublish(before,'APPROVER',new Set()));
 const edited=editEvaluation(before,'function','gait','device');assert.equal(edited.draft.approval,null);assert(!mayPublish(edited,'APPROVER',new Set()));
});
