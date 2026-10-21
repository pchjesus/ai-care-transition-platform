import test from 'node:test';import assert from 'node:assert/strict';
import {makeInitial,publishedPayload,fingerprint,makeRevision} from '../a3/workflow.js';
import {projectCurrentPublication,encounterFor,PUBLICATION_STORAGE_KEY} from './publication.js';
import {stagePublishedDocuments,readPublishedDocument,pdfDigest} from './published-documents.js';
async function setup(){
 const r=makeInitial('SYN-002'),blob=new Blob(['%PDF-1.4\nsynthetic example']);
 r.draft.docs=[{id:'DOC-1',name:'synthetic.pdf',size:blob.size,fileHash:await pdfDigest(blob),visibility:'PATIENT',status:'REVIEWED'}];
 r.draft.status='APPROVED';r.draft.version='1.0';r.draft.approval={by:'SIM-APPROVER',role:'지정 최종 승인자',at:new Date().toISOString(),digest:fingerprint(r)};
 const pub={id:'PUB-doc',status:'PUBLISHED',snapshot:publishedPayload(r),encounterId:encounterFor(r.patientId),assessmentId:r.assessment.id,approvedAt:r.draft.approval.at};
 const map=new Map(),store={putAll:async entries=>entries.forEach(e=>map.set(e.key,e)),get:async key=>map.get(key)};
 pub.documentManifest=await stagePublishedDocuments(r,pub,new Map([['DOC-1',blob]]),store);r.publications=[pub];r.draft.status='PUBLISHED';
 let serialized=JSON.stringify({'SYN-002':r});const storage={getItem:key=>key===PUBLICATION_STORAGE_KEY?serialized:null,set:value=>serialized=value};
 return {r,pub,blob,map,store,storage,read:()=>readPublishedDocument(storage,r.patientId,pub.encounterId,pub.id,'DOC-1',store)};
}
test('only reviewed exact PDF bytes are staged; public projection exposes no hash or manifest',async()=>{
 const x=await setup(),result=await x.read();assert.equal(await result.blob.text(),await x.blob.text());assert.equal(result.name,'synthetic.pdf');
 const publicData=projectCurrentPublication({'SYN-002':x.r},x.r.patientId,x.pub.encounterId);assert.deepEqual(publicData.documents,[{id:'DOC-1',name:'synthetic.pdf'}]);assert(!JSON.stringify(publicData).includes('fileHash'));
 x.r.draft.docs[0].fileHash='wrong';await assert.rejects(stagePublishedDocuments(x.r,x.pub,new Map([['DOC-1',x.blob]]),x.store));
});
test('document bytes cannot be read for another patient, publication, removed document or corrupt blob',async()=>{
 const x=await setup();await assert.rejects(readPublishedDocument(x.storage,'SYN-001',encounterFor('SYN-001'),x.pub.id,'DOC-1',x.store));await assert.rejects(readPublishedDocument(x.storage,x.r.patientId,x.pub.encounterId,'PUB-old','DOC-1',x.store));
 [...x.map.values()][0].blob=new Blob(['%PDF-corrupt']);await assert.rejects(x.read());
});
test('withdrawal during asynchronous document read rejects and storage failure never mutates publication',async()=>{
 const x=await setup(),before=JSON.stringify(x.r);
 await assert.rejects(stagePublishedDocuments(x.r,x.pub,new Map([['DOC-1',x.blob]]),{putAll:async()=>{throw Error('quota')}}));assert.equal(JSON.stringify(x.r),before);
 const store={get:async key=>{x.r.publications[0].status='REVOKED';x.storage.set(JSON.stringify({'SYN-002':x.r}));return x.map.get(key)}};
 await assert.rejects(readPublishedDocument(x.storage,x.r.patientId,x.pub.encounterId,x.pub.id,'DOC-1',store),/변경/);
});

test('a revision requires fresh public PDF review while the original valid publication stays readable',async()=>{
 const x=await setup(),next=makeRevision(x.r);assert.equal(next.draft.docs[0].status,'REGISTERED');assert.deepEqual(next.publications,x.r.publications);
 x.storage.set(JSON.stringify({'SYN-002':next}));const doc=await x.read();assert.equal(await doc.blob.text(),await x.blob.text());
});
