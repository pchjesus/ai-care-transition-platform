import test from 'node:test';
import assert from 'node:assert/strict';
import {gradeMeter,priorityDomains,formatAuditEvent} from '../review-display.js';
import {makeInitial,blockers} from '../workflow.js';
test('three segments fill exactly 0/1/2/3 steps without a misleading baseline cell',()=>{
 for(let grade=0;grade<=3;grade++){
  const html=gradeMeter(grade);
  assert.equal((html.match(/class="grade-cell /g)||[]).length,3);
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

test('audit UI translates known clinical field IDs without modifying stored audit',()=>{
 const event={event:'EVALUATION_EDITED',role:'NURSE',details:'function.gait · 승인 무효화, 평가 반영 및 재검토 필요'};
 const original=JSON.stringify(event);
 assert.deepEqual(formatAuditEvent(event),{title:'평가 수정 · 보행/이동',description:'승인 무효화, 평가 반영 및 재검토 필요'});
 assert.equal(JSON.stringify(event),original);
 assert.deepEqual(formatAuditEvent({event:'APPROVED',details:'fingerprint abc'}),{title:'최종 승인',description:'최종 승인자가 계획을 승인했습니다.'});
 assert.deepEqual(formatAuditEvent({event:'ASSESSMENT_IMPORTED',details:'AS-SYN-002-...'}),{title:'평가 A3 반영',description:'A2 평가를 계획에 반영했습니다. 관련 항목을 다시 검토하세요.'});
 assert.deepEqual(formatAuditEvent({event:'CUSTOM_UNKNOWN',details:'custom data'}),{title:'CUSTOM_UNKNOWN',description:'custom data'});
});
