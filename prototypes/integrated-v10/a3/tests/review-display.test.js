import test from 'node:test';
import assert from 'node:assert/strict';
import {gradeMeter,priorityDomains} from '../review-display.js';
import {makeInitial,blockers} from '../workflow.js';
test('four segments preserve the zero baseline and exactly 0/1/2/3 filled steps',()=>{
 for(let grade=0;grade<=3;grade++){
  const html=gradeMeter(grade);
  assert.equal((html.match(/class="grade-cell /g)||[]).length,4);
  assert.equal((html.match(/ filled /g)||[]).length,grade);
  assert.match(html,new RegExp(grade+'등급'));assert.match(html,/임상 위험도 아님/);
 }
});
test('unknown/conflicting grades do not look like a confirmed zero',()=>{
 for(const grade of [null,undefined,-1,4]){const html=gradeMeter(grade);assert.match(html,/등급 미확정/);assert(!html.includes(' filled '));assert(!html.includes(' current'));}
});
test('priority presentation never changes the assessment, blockers, or workflow',()=>{
 const r=makeInitial('SYN-003'),before=JSON.stringify(r),gates=blockers(r);
 assert(priorityDomains(r).every(d=>d.status==='READY'&&d.grade===3));
 for(const d of r.assessment.domainResults)gradeMeter(d.status==='READY'?d.grade:null);
 assert.equal(JSON.stringify(r),before);assert.deepEqual(blockers(r),gates);
});
