import test from 'node:test';
import assert from 'node:assert/strict';
import {makeInitial,publishedPayload,makeRevision,fingerprint} from '../a3/workflow.js';
import {validStoredRecord,STORAGE_KEYS} from '../a3/storage.js';
import {projectCurrentPublication,readPatientPublication,encounterFor} from './publication.js';

function published(version='1.0'){
 const r=makeInitial('SYN-002');
 r.draft.status='APPROVED';r.draft.version=version;
 r.draft.approval={by:'SIM-APPROVER',role:'지정 최종 승인자',at:new Date(Date.now()-1000).toISOString(),digest:fingerprint(r)};
 const snapshot=publishedPayload(r);
 r.publications.unshift({id:'PUB-test-'+version,status:'PUBLISHED',snapshot,
  encounterId:encounterFor('SYN-002'),assessmentId:r.assessment.id,approvedAt:snapshot.approvedAt});
 r.draft.status='PUBLISHED';
 assert(validStoredRecord(r,'SYN-002'));
 return r;
}
const project=(r,id='SYN-002',encounter=encounterFor(id))=>
 projectCurrentPublication({[r.patientId]:r},id,encounter);
test('A3 projection emits exact allowlist and preserves patient/encounter binding',()=>{
 const r=published();
 r.audit.push({at:new Date().toISOString(),role:'APPROVER',event:'SECRET',details:'INTERNAL SECRET'});
 const result=project(r);
 assert.equal(result.status,'PUBLISHED');
 assert.equal(result.patientId,'SYN-002');
 assert.equal(result.encounterId,'ENC-SYN-002-DEMO');
 assert.deepEqual(Object.keys(result).sort(),['schemaVersion','isSynthetic','patientId','encounterId','publicationId','assessmentId','planVersion','approvedAt','issuedAt','status','items','documents'].sort());
 assert(!JSON.stringify(result).includes('SECRET'));
 assert.equal(projectCurrentPublication({'SYN-002':r},'SYN-002','ENC-SYN-001-DEMO'),null);
 assert.equal(projectCurrentPublication({'SYN-002':r},'SYN-001','ENC-SYN-001-DEMO'),null);
});
test('draft, APPROVED-but-unpublished and revoked do not display',()=>{
 const r=published();r.publications=[];
 assert.equal(project(r),null);
 r.draft.status='APPROVED';
 assert.equal(project(r),null);
 const again=published();again.publications[0].status='REVOKED';again.draft.status='REVOKED';
 assert.equal(project(again),null);
});
test('revision does not replace old published until re-approval and re-issue',()=>{
 const r=published();
 const next=makeRevision(r);
 assert.equal(next.draft.version,'2.0');
 assert.equal(project(next).planVersion,'1.0');
 // Re-approved simulated plan: replace publication; v1 is no longer current.
 next.draft.status='APPROVED';
 next.draft.approval={by:'SIM-APPROVER',role:'지정 최종 승인자',at:new Date().toISOString(),digest:fingerprint(next)};
 const snapshot=publishedPayload(next);
 next.publications[0].status='SUPERSEDED';
 next.publications.unshift({id:'PUB-test-v2',status:'PUBLISHED',snapshot,
  encounterId:encounterFor('SYN-002'),assessmentId:next.assessment.id,approvedAt:snapshot.approvedAt});
 next.draft.status='PUBLISHED';
 assert.equal(project(next).planVersion,'2.0');
 assert.equal(next.publications[1].status,'SUPERSEDED');
 next.publications[0].status='REVOKED';next.draft.status='REVOKED';
 assert.equal(project(next),null);
});
test('legacy and malformed wrappers fail closed, as do multiple simultaneous publications',()=>{
 const a=published();delete a.publications[0].encounterId;
 assert.equal(project(a),null);
 const b=published();b.publications.push(structuredClone(b.publications[0]));
 assert.equal(project(b),null);
 const c=published();c.publications[0].snapshot.approvedAt='2030-01-01T00:00:00.000Z';
 assert.equal(project(c),null);
 const d=published();d.publications[0].snapshot.items=[{id:'bad',section:'today',title:'',text:'x'}];
 assert.equal(project(d),null);
});
test('same-origin reader returns EMPTY/ERROR instead of standalone published default',()=>{
 const storage=new Map(),adapter={
  getItem:key=>storage.has(key)?storage.get(key):null,
  setItem:(key,value)=>storage.set(key,value)
 };
 assert.equal(readPatientPublication(adapter,'SYN-002',encounterFor('SYN-002')).status,'EMPTY');
 const records={};for(const id of ['SYN-001','SYN-002','SYN-003','SYN-004'])records[id]=id==='SYN-002'?published():makeInitial(id);
 storage.set(STORAGE_KEYS.normal,JSON.stringify(records));
 assert.equal(readPatientPublication(adapter,'SYN-002',encounterFor('SYN-002')).status,'PUBLISHED');
 assert.equal(readPatientPublication(adapter,'SYN-003',encounterFor('SYN-003')).status,'EMPTY');
 storage.set(STORAGE_KEYS.normal,'{not json');
 assert.equal(readPatientPublication(adapter,'SYN-002',encounterFor('SYN-002')).status,'ERROR');
 assert.equal(readPatientPublication(null,'SYN-002',encounterFor('SYN-002')).status,'ERROR');
 assert.equal(readPatientPublication(adapter,'SYN-002','ENC-SYN-003-DEMO').status,'MISMATCH');
});
test('published record cannot disagree with wrapper encounter, assessment or approval',()=>{
 for(const mutate of [r=>r.encounterId='ENC-SYN-003-DEMO',r=>r.assessment.id='AS-SYN-002-other',r=>r.draft.approval=null,r=>delete r.draft.approval.by,r=>r.draft.approval.role='작성 간호사',r=>r.publications[0].snapshot.items[0].text='changed without approval',r=>r.draft.approval.at=new Date(Date.now()-10000).toISOString()]){
  const r=published();mutate(r);assert.equal(project(r),null);
 }
});
test('an initial draft cannot claim a later or same-version publication as a revision',()=>{
 const r=published();r.draft.status='DRAFT';assert.equal(project(r),null);
 r.draft.version='0.1';assert.equal(project(r),null);
});
test('withdrawn plan can start a fresh revision without restoring revoked publication or approval',()=>{
 const r=published();r.publications[0].status='REVOKED';r.draft.status='REVOKED';const history=structuredClone(r.publications);
 const next=makeRevision(r);assert.equal(next.draft.status,'DRAFT');assert.equal(next.draft.version,'2.0');assert.equal(next.draft.approval,null);assert(next.draft.items.every(i=>!i.verified));assert.deepEqual(next.publications,history);assert.equal(project(next),null);
});
