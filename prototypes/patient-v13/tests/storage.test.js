import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoRepository,PROFILE_KEY,PLAN_KEY,FONT_KEY,LEGACY_PROFILE_KEY,LEGACY_FONT_KEY} from '../storage.js';
import {initialProfile} from '../data.js';
const memory=()=>{const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};};
const fixture=()=>({schemaVersion:1,profile:{address:'서울시 가상구 저장주소 (가상)',contact:'010-0000-0000 (가상)'},revision:3,lastRequest:{requestId:'DEMO-0003',revision:3,createdAt:'2026-10-21T00:00:00Z',status:'LOCAL_ONLY'}});
test('v1.2 profile, revision and local request migrate without touching the original',()=>{
 const storage=memory(),legacy=JSON.stringify(fixture());storage.setItem(LEGACY_PROFILE_KEY,legacy);
 const repo=createDemoRepository(storage),data=repo.load();assert.deepEqual(data,{profile:fixture().profile,revision:3,lastRequest:fixture().lastRequest});
 assert.deepEqual(JSON.parse(storage.getItem(PROFILE_KEY)),fixture());assert.equal(storage.getItem(LEGACY_PROFILE_KEY),legacy);
 assert.deepEqual(createDemoRepository(storage).load(),data);
});
test('v1.3 values take precedence over v1.2 and font fallback is compatible',()=>{
 const storage=memory();storage.setItem(LEGACY_PROFILE_KEY,JSON.stringify(fixture()));storage.setItem(LEGACY_FONT_KEY,'true');
 const newer=fixture();newer.profile.address='새로운 가상 주소';storage.setItem(PROFILE_KEY,JSON.stringify(newer));
 const repo=createDemoRepository(storage);assert.equal(repo.load().profile.address,newer.profile.address);assert.equal(repo.loadLarge(),true);repo.saveLarge(false);assert.equal(repo.loadLarge(),false);assert.equal(storage.getItem(LEGACY_FONT_KEY),'true');
});
test('corrupt or incompatible storage is never silently overwritten',()=>{
 for(const raw of ['{broken','null','[]',JSON.stringify({...fixture(),lastRequest:{...fixture().lastRequest,status:'SENT'}}),JSON.stringify({...fixture(),revision:2})]){
  const storage=memory();storage.setItem(PROFILE_KEY,raw);const repo=createDemoRepository(storage);assert.deepEqual(repo.load().profile,initialProfile);assert.equal(repo.failed,true);
  assert.equal(repo.persist({profile:initialProfile,revision:1,lastRequest:null}),false);assert.equal(storage.getItem(PROFILE_KEY),raw);
 }
});
test('storage quota failure cannot be reported as a successful write',()=>{
 const storage=memory(),repo=createDemoRepository(storage);repo.load();storage.setItem=()=>{throw Error('quota')};assert.equal(repo.persist({profile:initialProfile,revision:1,lastRequest:null}),false);assert.equal(storage.getItem(PROFILE_KEY),null);
});
test('stale profile snapshot cannot overwrite another tab',()=>{
 const storage=memory(),a=createDemoRepository(storage),b=createDemoRepository(storage);a.load();b.load();
 assert.equal(a.persist({profile:{...initialProfile,address:'First tab 가상'},revision:1,lastRequest:null}),true);
 assert.equal(b.persist({profile:{...initialProfile,address:'Stale tab 가상'},revision:1,lastRequest:null}),false);
 assert.equal(createDemoRepository(storage).load().profile.address,'First tab 가상');
});
test('withdrawn and revised plan survives fresh repository load',()=>{
 const storage=memory(),repo=createDemoRepository(storage);repo.loadPlan();const plan={published:false,version:2,planChanged:true};assert.equal(repo.persistPlan(plan),true);assert.deepEqual(createDemoRepository(storage).loadPlan(),plan);
});
test('invalid plan data fails closed without replacing its bytes',()=>{
 const storage=memory();storage.setItem(PLAN_KEY,'{broken');const repo=createDemoRepository(storage);assert.equal(repo.loadPlan().published,false);assert.equal(repo.persistPlan({published:true,version:1,planChanged:false}),false);assert.equal(storage.getItem(PLAN_KEY),'{broken');
});
test('reset prevents old legacy profile from reappearing and keeps font preference',()=>{
 const storage=memory();storage.setItem(LEGACY_PROFILE_KEY,JSON.stringify(fixture()));storage.setItem(FONT_KEY,'true');const repo=createDemoRepository(storage);repo.load();repo.loadPlan();assert.equal(repo.clear(),true);
 assert.deepEqual(createDemoRepository(storage).load(),{profile:initialProfile,revision:0,lastRequest:null});assert.equal(storage.getItem(FONT_KEY),'true');assert.equal(JSON.parse(storage.getItem(LEGACY_PROFILE_KEY)).revision,3);
});
test('failed migration preserves v1.2 bytes and does not claim saved data',()=>{
 const storage=memory(),raw=JSON.stringify(fixture());storage.setItem(LEGACY_PROFILE_KEY,raw);storage.setItem=()=>{throw Error('quota')};const repo=createDemoRepository(storage);repo.load();assert.equal(repo.failed,true);assert.equal(storage.getItem(LEGACY_PROFILE_KEY),raw);assert.equal(storage.getItem(PROFILE_KEY),null);
});
test('reset rolls profile back if plan write fails',()=>{
 const storage=memory(),repo=createDemoRepository(storage);repo.load();repo.loadPlan();const changed={profile:{...initialProfile,address:'보존할 가상 주소'},revision:1,lastRequest:null};repo.persist(changed);
 const before=storage.getItem(PROFILE_KEY),write=storage.setItem;storage.setItem=(k,v)=>{if(k===PLAN_KEY)throw Error('quota');write(k,v)};
 assert.equal(repo.clear(),false);assert.equal(storage.getItem(PROFILE_KEY),before);
});
