import test from 'node:test';
import assert from 'node:assert/strict';
import {recordsForPatient,findSource,usableSource,CASE_MISSIONS} from '../source-library.js';
import {makeInitial,blockers,makeRevision,currentPublished} from '../workflow.js';

test('case library has four dedicated scenarios and per-patient records',()=>{
 assert.equal(Object.keys(CASE_MISSIONS).length,4);
 for(const id of Object.keys(CASE_MISSIONS)){const list=recordsForPatient(id);assert.ok(list.length>=6);assert.ok(list.every(s=>s.patientId===id&&s.isSynthetic));}
});
test('cross-patient or unrelated evidence cannot count as a reviewed plan source',()=>{
 const a=makeInitial('SYN-001');const source=findSource('SRC-SYN002-NUR-01','SYN-001');
 assert.equal(source,null);
 assert.equal(usableSource(findSource('SRC-SYN001-NUR-01','SYN-001'),'item','medication','SYN-001'),false);
 assert.equal(usableSource(findSource('SRC-SYN001-NUR-01','SYN-001'),'item','today','SYN-001'),true);
 assert.ok(blockers(a).some(x=>x.id==='item-today-source'));
});
test('pending medication record cannot satisfy a medical review, confirmed reply can',()=>{
 const pending=findSource('SRC-SYN001-MED-01','SYN-001');
 assert.equal(usableSource(pending,'item','medication','SYN-001'),false);
 const verified=findSource('SRC-SYN001-MED-02','SYN-001');
 assert.equal(usableSource(verified,'item','medication','SYN-001'),true);
});
test('medication conflict remains hard blocker even if review text and linked evidence are filled',()=>{
 const r=makeInitial('SYN-003');const issue=r.draft.issues.find(i=>i.id==='ISS-medication-reconciliation');
 issue.source='SRC-SYN003-MED-C';issue.resolution='약료 확인 회신으로 검토하였습니다.';issue.status='RESOLVED';
 r.unlockedSources.push('SRC-SYN003-MED-C');
 assert.ok(blockers(r).some(x=>x.id===issue.id),'A2 raw conflict must be corrected and handed off');
});
test('SYN002 complete draft references real synthetic source records',()=>{
 const r=makeInitial('SYN-002');assert.equal(blockers(r).length,0);
 for(const item of r.draft.items){assert.equal(usableSource(findSource(item.source,r.patientId),'item',item.section,r.patientId),true)}
});
test('SYN004 contains immutable v1 publication and requires fresh review for v2',()=>{
 const r=makeInitial('SYN-004');assert.equal(currentPublished(r).snapshot.planVersion,'1.0');
 const clone=makeRevision(r);
 assert.equal(clone.draft.version,'2.0');assert.ok(clone.draft.items.every(i=>!i.verified));
 assert.equal(r.draft.status,'PUBLISHED');assert.equal(currentPublished(clone).snapshot.planVersion,'1.0');
});
