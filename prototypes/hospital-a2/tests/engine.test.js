import test from 'node:test';import assert from 'node:assert/strict';
import {CASES,DOMAINS} from '../data.js';import {evaluateAll,evaluateDomain} from '../engine.js';
test('All 6 domain scores deterministic',()=>{
 for (const c of CASES){assert.deepEqual(evaluateAll(c.values),evaluateAll(c.values));assert.equal(evaluateAll(c.values).length,6);}
});
test('fully described patient gets 0 and no unknown',()=>{
 const rr=evaluateAll(CASES[1].values);assert.ok(rr.every(x=>x.tier===0));assert.ok(rr.every(x=>x.status==='READY'));
});
test('missing required fields yield unknown not score 0, even if other risk flags',()=>{
 const r=evaluateAll(CASES[2].values);assert.equal(r.find(x=>x.domain==='function').status,'UNKNOWN');assert.equal(r.find(x=>x.domain==='function').tier,null);assert.ok(r.find(x=>x.domain==='function').provisionalTier>=3);assert.equal(r.find(x=>x.domain==='medication').tier,null);
});
test('conflicting observation yields explicit CONFLICTING even if severe',()=>{
 const d=DOMAINS.find(x=>x.id==='medication');const vals={...CASES[0].values.medication,reconciliation:'CONFLICT'};const r=evaluateDomain(d,vals);assert.equal(r.status,'CONFLICTING');assert.equal(r.tier,null);assert.ok(r.confusions.length>0);
});
test('social living alone not automatically grade 3',()=>{
 const d=DOMAINS.find(x=>x.id==='social');let v={...CASES[1].values.social,living:'aloneSupported'};assert.equal(evaluateDomain(d,v).tier,0);v={...CASES[1].values.social,caregiver:'none',housing:'barrier',travel:'unavailable'};assert.equal(evaluateDomain(d,v).tier,3);
});