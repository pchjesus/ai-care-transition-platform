import test from 'node:test';
import assert from 'node:assert/strict';
import {CASES} from '../a2/data.js';
import {HANDOFF_KEY,createAssessmentHandoff,validateAssessmentHandoff,writePendingHandoff,readPendingHandoff,clearPendingHandoff} from './handoff.js';
const data=()=>structuredClone(CASES[1].values);
const time=new Date('2026-10-21T09:00:00.000Z');
const storage=()=>{
 const m=new Map();
 return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};
};
test('SYN-002 exports its exact values and checks against A2 rules',()=>{
 const p=createAssessmentHandoff('SYN-002',data(),time);
 assert.equal(p.patientId,'SYN-002');
 assert.equal(p.encounterId,'ENC-SYN-002-DEMO');
 assert.equal(p.domainResults.length,6);
 assert.deepEqual(validateAssessmentHandoff(p),p);
 assert.ok(p.domainResults.every(d=>d.status==='READY'));
});
test('missing and conflicting data cannot silently become ready',()=>{
 const v=data();v.medical.followup=null;v.medication.reconciliation='CONFLICT';
 const p=createAssessmentHandoff('SYN-002',v,time);
 assert.equal(p.domainResults.find(x=>x.domain==='medical').status,'UNKNOWN');
 assert.equal(p.domainResults.find(x=>x.domain==='medication').status,'CONFLICTING');
 assert.equal(p.domainResults.find(x=>x.domain==='medication').tier,null);
});
test('reject invalid option, unknown patient, forged result and forged encounter',()=>{
 const v=data();v.medical.followup='<script>alert(1)</script>';
 assert.throws(()=>createAssessmentHandoff('SYN-002',v,time));
 assert.throws(()=>createAssessmentHandoff('SYN-004',data(),time));
 const p=createAssessmentHandoff('SYN-002',data(),time);
 p.domainResults[0].tier=3;
 assert.throws(()=>validateAssessmentHandoff(p));
 const p2=createAssessmentHandoff('SYN-002',data(),time);p2.encounterId='ENC-SYN-001-DEMO';
 assert.throws(()=>validateAssessmentHandoff(p2));
});
test('inbox writes, reads, rejects cross-patient overwrite and clears with token',()=>{
 const s=storage(),p=createAssessmentHandoff('SYN-002',data(),time);
 assert.equal(readPendingHandoff(s),null);
 writePendingHandoff(s,p);
 assert.deepEqual(readPendingHandoff(s),p);
 assert.throws(()=>writePendingHandoff(s,createAssessmentHandoff('SYN-001',CASES[0].values,time)));
 assert.equal(clearPendingHandoff(s,'wrong-id'),false);
 assert.equal(clearPendingHandoff(s,p.assessmentId),true);
 assert.equal(s.getItem(HANDOFF_KEY),null);
});
test('corrupt inbox fails closed',()=>{
 const s=storage();s.setItem(HANDOFF_KEY,'{"bad":true}');
 assert.throws(()=>readPendingHandoff(s));
 assert.throws(()=>writePendingHandoff(s,createAssessmentHandoff('SYN-002',data(),time)));
});
