import test from 'node:test';import assert from 'node:assert/strict';
import {createPatientRepository,personalKey} from '../patient/storage.js';
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),map}};
test('patient-local profile starts blank and is isolated by patient/encounter',()=>{
 const store=memory(),a=createPatientRepository(store,'SYN-002','ENC-SYN-002-DEMO'),b=createPatientRepository(store,'SYN-001','ENC-SYN-001-DEMO');
 const next=a.load().data;assert.deepEqual(next.profile,{address:'',contact:''});next.profile={address:'<img src=x onerror=alert(1)>',contact:'DEMO-123'};next.revision=1;a.save(next);
 assert.equal(createPatientRepository(store,'SYN-002','ENC-SYN-002-DEMO').load().data.profile.address,next.profile.address);assert.equal(b.load().data.profile.address,'');
 assert(createPatientRepository(store,'SYN-002','ENC-SYN-001-DEMO').load().error);
});
test('corrupt, foreign, denied and stale local records cannot be silently replaced',()=>{
 const store=memory(),key=personalKey('SYN-002','ENC-SYN-002-DEMO');store.map.set(key,'{broken');
 const broken=createPatientRepository(store,'SYN-002','ENC-SYN-002-DEMO');assert(broken.load().error);assert.throws(()=>broken.save(broken.load().data));assert.equal(store.getItem(key),'{broken');store.map.delete(key);
 const a=createPatientRepository(store,'SYN-002','ENC-SYN-002-DEMO'),b=createPatientRepository(store,'SYN-002','ENC-SYN-002-DEMO');const next=a.load().data;b.load();next.revision=1;a.save(next);assert.throws(()=>b.save(next),/다른 탭/);
 const denied=createPatientRepository({...store,setItem(){throw Error('quota')}},'SYN-002','ENC-SYN-002-DEMO');const data=denied.load().data;data.revision++;assert.throws(()=>denied.save(data));assert.equal(JSON.parse(store.getItem(key)).revision,1);
});
test('understanding records are scoped to publication; requests are local-only and revision-bound',()=>{
 const store=memory(),repo=createPatientRepository(store,'SYN-002','ENC-SYN-002-DEMO'),data=repo.load().data;
 data.understanding={'PUB-v1':{today:'HELP'}};data.revision=1;data.lastRequest={id:'DEMO-1',revision:1,createdAt:new Date().toISOString(),status:'LOCAL_ONLY'};repo.save(data);
 const restored=repo.load().data;assert.equal(restored.understanding['PUB-v2'],undefined);assert.equal(restored.lastRequest.status,'LOCAL_ONLY');restored.lastRequest.status='SENT';assert.throws(()=>repo.save(restored));
});
