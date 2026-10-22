import test from 'node:test';
import assert from 'node:assert/strict';
import {STORAGE_KEYS,loadRepository,initializePatients,persistRepository,validStoredRecord} from '../storage.js';
import {makeInitial} from '../workflow.js';
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
test('normal, study and baseline use distinct keys and roundtrip patient data',()=>{
 const storage=memory();storage.setItem('a3-prototype-v03-synthetic-only','baseline');
 const state=loadRepository(storage,STORAGE_KEYS.normal);initializePatients(state.records);
 state.records['SYN-001'].draft.items[0].text='Edited guide';persistRepository(storage,STORAGE_KEYS.normal,state);
 const restored=loadRepository(storage,STORAGE_KEYS.normal);assert.equal(restored.error,null);
 assert.equal(restored.records['SYN-001'].draft.items[0].text,'Edited guide');
 assert.notEqual(restored.records['SYN-002'].draft.items[0].text,'Edited guide');
 assert.deepEqual(loadRepository(storage,STORAGE_KEYS.study).records,{});
 assert.equal(storage.getItem('a3-prototype-v03-synthetic-only'),'baseline');
});
test('corrupt JSON, wrong shapes and foreign-patient records remain untouched',()=>{
 for(const raw of ['{broken','[]','null',JSON.stringify({'SYN-001':makeInitial('SYN-002')}),JSON.stringify({'SYN-001':{schema:2,patientId:'SYN-001'}})]){
  const storage=memory();storage.setItem(STORAGE_KEYS.normal,raw);
  const state=loadRepository(storage,STORAGE_KEYS.normal);assert.ok(state.error);
  initializePatients(state.records);assert.throws(()=>persistRepository(storage,STORAGE_KEYS.normal,state));
  assert.equal(storage.getItem(STORAGE_KEYS.normal),raw);
 }
});
test('quota and denied storage errors propagate without claiming a successful save',()=>{
 const state={records:{},error:null,serialized:null};assert.throws(()=>persistRepository({getItem(){return null},setItem(){throw Error('Quota exceeded')}},'key',state),/Quota/);
 assert.ok(loadRepository(null,'key').error);
});
test('a stale repository cannot overwrite edits saved by another tab',()=>{
 const storage=memory(),first=loadRepository(storage,'key'),second=loadRepository(storage,'key');
 initializePatients(first.records);initializePatients(second.records);
 first.records['SYN-001'].draft.items[0].text='First tab';persistRepository(storage,'key',first);
 second.records['SYN-001'].draft.items[0].text='Stale tab';
 assert.throws(()=>persistRepository(storage,'key',second),/another tab/);
 assert.equal(loadRepository(storage,'key').records['SYN-001'].draft.items[0].text,'First tab');
});
test('foreign publication snapshots and malformed view models are rejected',()=>{
 const r=makeInitial('SYN-004');assert.equal(validStoredRecord(r,'SYN-004'),true);
 r.publications[0].snapshot.patientId='SYN-002';assert.equal(validStoredRecord(r,'SYN-004'),false);
 const t=makeInitial('SYN-001');t.draft.items[0].text={};assert.equal(validStoredRecord(t,'SYN-001'),false);
});

test('legacy records and multi-source drafts both roundtrip, malformed or inconsistent arrays fail closed',()=>{
 const old=makeInitial('SYN-002');
 assert.equal(validStoredRecord(old,'SYN-002'),true);
 const item=old.draft.items.find(i=>i.section==='support');
 item.sources=[item.source,'SRC-SYN002-FUN-01'];
 assert.equal(validStoredRecord(old,'SYN-002'),true);
 const store=memory(),s=loadRepository(store,'sources');
 s.records['SYN-002']=old;persistRepository(store,'sources',s);
 const loaded=loadRepository(store,'sources');
 assert.equal(loaded.error,null);
 assert.deepEqual(loaded.records['SYN-002'].draft.items.find(i=>i.section==='support').sources,item.sources);
 const malformed=structuredClone(old);
 malformed.draft.items[5].sources=['SRC-SYN002-FUN-01','SRC-SYN002-SOC-01'];
 assert.equal(validStoredRecord(malformed,'SYN-002'),false);
 malformed.draft.items[5].sources=[item.source,item.source];
 assert.equal(validStoredRecord(malformed,'SYN-002'),false);
});

test('optional revocation request validates without corrupting prior saved records',()=>{
 const r=makeInitial('SYN-004');
 assert.equal(validStoredRecord(r,'SYN-004'),true);
 r.revocationRequest={publicationId:'PUB-SYN004-V1',requestedRole:'NURSE',requestedAt:'2026-10-22T01:00:00.000Z',reason:'퇴원 안내문 재확인이 필요합니다.',status:'PENDING'};
 assert.equal(validStoredRecord(r,'SYN-004'),true);
 r.revocationRequest.status='REJECTED';r.revocationRequest.reviewedAt='2026-10-22T01:01:00.000Z';r.revocationRequest.reviewedBy='APPROVER';
 assert.equal(validStoredRecord(r,'SYN-004'),true);
 r.revocationRequest.publicationId='PUB-SYN001-V1';
 assert.equal(validStoredRecord(r,'SYN-004'),false);
});
