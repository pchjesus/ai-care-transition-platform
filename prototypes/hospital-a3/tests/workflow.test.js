import test from 'node:test';
import assert from 'node:assert/strict';
import {CASES,DOMAINS} from '../data.js';
import {evaluateA2,makeInitial,blockers,mayApprove,mayPublish,fingerprint,publishedPayload,currentPublished,makeRevision} from '../workflow.js';

const readyApproved = () => {
  const r=makeInitial('SYN-002');
  r.draft.status='REVIEW_REQUESTED';
  assert.equal(blockers(r).length,0);
  return r;
};

test('A2 read-only import has six domains and 30 fields (18 required)',()=>{
 assert.equal(DOMAINS.length,6);
 assert.equal(DOMAINS.reduce((n,d)=>n+d.fields.length,0),30);
 assert.equal(DOMAINS.reduce((n,d)=>n+d.fields.filter(f=>f[2]).length,0),18);
 assert.equal(CASES.length,4);
});
test('SYN-002 all six domains 0, but six basic plan sections still exist',()=>{
 const r=readyApproved();
 assert.ok(r.assessment.domainResults.every(x=>x.status==='READY'&&x.grade===0));
 assert.equal(r.draft.items.length,6);
 assert.ok(r.draft.items.some(x=>x.section==='medication'));
});
test('SYN-003 has missing fields and medication conflict block even though A2 assigns 3',()=>{
 const r=makeInitial('SYN-003');
 const med=r.assessment.domainResults.find(x=>x.id==='medication');
 assert.equal(med.status,'UNKNOWN'); // Missing medication education takes precedence, A2 raw conflict remains a tier 3 choice.
 assert.equal(med.provisionalGrade,3);
 assert.ok(r.draft.issues.some(i=>i.id==='ISS-medication-reconciliation'));
 assert.ok(blockers(r).some(x=>x.id==='ISS-medication-reconciliation'));
 assert.equal(mayApprove(r,'APPROVER',new Set()),false);
});
test('SYN-001 requires an independent, reviewed medication patient instruction',()=>{
 const r=makeInitial('SYN-001');
 assert.equal(r.assessment.domainResults.length,6);
 assert.ok(r.draft.issues.some(x=>x.id==='ISS-plan-med-original'));
 assert.ok(blockers(r).some(b=>b.group==='plan'));
});
test('only designated approver can approve and publish a clean, unchanged request',()=>{
 const r=readyApproved();
 assert.equal(mayApprove(r,'NURSE',new Set()),false);
 assert.equal(mayApprove(r,'APPROVER',new Set()),true);
 r.draft.status='APPROVED';r.draft.approval={at:'2026-10-21T01:00:00Z',digest:fingerprint(r)};
 assert.equal(mayPublish(r,'APPROVER',new Set()),true);
 assert.equal(mayPublish(r,'PHYSICIAN',new Set()),false);
 r.draft.items[0].text+=' changed';
 assert.equal(mayPublish(r,'APPROVER',new Set()),false);
});
test('a reviewed patient PDF needs live file bytes during publication',()=>{
 const r=readyApproved();
 r.draft.docs.push({id:'DOC-A',name:'synthetic-guide.pdf',size:80,fileHash:'abcdef',visibility:'PATIENT',status:'REVIEWED'});
 assert.ok(blockers(r,new Set()).some(x=>x.id==='file-DOC-A'));
 assert.equal(blockers(r,new Set(['DOC-A'])).length,0);
 r.draft.docs[0].status='REGISTERED';
 assert.ok(blockers(r,new Set(['DOC-A'])).some(x=>x.id==='doc-DOC-A'));
});
test('patient-facing projection excludes internal items, raw source IDs, PDF hashes, reviewer identifiers',()=>{
 const r=readyApproved();r.draft.approval={by:'SIM-APPROVER',at:'2026-10-21T01:00:00Z',digest:'123'};
 r.draft.items[0].source='PRIVATE-SOURCE-ID';r.draft.items[0].visibility='INTERNAL';
 r.draft.docs.push({id:'doc',name:'safe.pdf',size:25,fileHash:'privateHash',visibility:'PATIENT',status:'REVIEWED'});
 const p=publishedPayload(r);
 assert.equal(p.items.length,5);
 assert.equal(p.documents.length,1);
 assert.ok(!JSON.stringify(p).includes('PRIVATE-SOURCE-ID'));
 assert.ok(!JSON.stringify(p).includes('privateHash'));
 assert.ok(!JSON.stringify(p).includes('SIM-APPROVER'));
});
test('new revision keeps existing published snapshot and resets approval',()=>{
 const r=readyApproved();r.draft.status='PUBLISHED';r.draft.version='1.0';r.draft.approval={at:'2026-10-21T01:00:00Z'};
 r.publications=[{id:'p-1',status:'PUBLISHED',snapshot:{planVersion:'1.0',issuedAt:'2026-10-21T01:00:00Z',items:[],documents:[]}}];
 const v=makeRevision(r);
 assert.equal(v.draft.version,'2.0');assert.equal(v.draft.status,'DRAFT');assert.equal(v.draft.approval,null);
 assert.equal(currentPublished(v).snapshot.planVersion,'1.0');
 assert.equal(r.draft.version,'1.0');
});
test('fingerprint changes when underlying A2 input snapshot changes',()=>{
 const r=readyApproved();const f=fingerprint(r);r.assessment.values.function.gait='device';
 assert.notEqual(fingerprint(r),f);
});
