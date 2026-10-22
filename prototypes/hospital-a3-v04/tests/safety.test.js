import test from 'node:test';
import assert from 'node:assert/strict';
import {makeInitial,makeRevision,blockers,mayApprove,issuesFromValues} from '../workflow.js';
import {findSource,usableSource} from '../source-library.js';

test('missing assessment issues cannot bypass review after revision',()=>{
 const r=makeInitial('SYN-004');
 r.assessment.values.medication.medUnderstanding=null;
 const v=makeRevision(r);
 for(const item of v.draft.items)item.verified=true;
 v.draft.status='REVIEW_REQUESTED';
 assert.equal(mayApprove(v,'APPROVER',new Set()),false);
 assert.ok(blockers(v).some(b=>b.id==='ISS-medication-medUnderstanding'));
});
test('unknown required option is an assessment issue, never silently accepted',()=>{
 const r=makeInitial('SYN-002');
 r.assessment.values.medication.medUnderstanding='obsolete-option';
 assert.ok(issuesFromValues(r.assessment.values).some(i=>i.id==='ISS-medication-medUnderstanding'));
 r.draft.status='REVIEW_REQUESTED';
 assert.equal(mayApprove(r,'APPROVER',new Set()),false);
});
test('absent issue target is rejected safely',()=>{
 assert.equal(usableSource(findSource('SRC-SYN002-NUR-01','SYN-002'),'issue',null,'SYN-002'),false);
});
test('unrecognized source target kind cannot count as an issue',()=>{
 assert.equal(usableSource(findSource('SRC-SYN002-NUR-01','SYN-002'),'unknown',{id:'ISS-nursing-education'},'SYN-002'),false);
});
test('different encounter and unrelated field references are rejected',()=>{
 const s=findSource('SRC-SYN002-NUR-01','SYN-002');
 assert.equal(usableSource({...s,encounterId:'ENC-SYN002-02'},'item','today','SYN-002'),false);
 assert.equal(usableSource(s,'issue',{id:'ISS-medication-reconciliation'},'SYN-002'),false);
});
