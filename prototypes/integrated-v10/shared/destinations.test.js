import test from 'node:test';import assert from 'node:assert/strict';
import {validDestination,directionsURL} from './destinations.js';
import {makeInitial,publishedPayload,fingerprint} from '../a3/workflow.js';
import {projectCurrentPublication,encounterFor} from './publication.js';
import {validStoredRecord} from '../a3/storage.js';
import {publicationEvents} from './publication-events.js';
const destination=()=>({name:'합성 기능검사 전용 목적지',address:'합성 주소 — 실제 길찾기 사용 금지',latitude:'37.5',longitude:'127.0',sourceUrl:'https://hospital.example.org/directions',verified:true});
function issued(dest=destination()){
 const r=makeInitial('SYN-002');r.encounterId=encounterFor(r.patientId);r.draft.items.find(i=>i.section==='followup').appointment={status:'CONFIRMED',date:'2030-01-03',time:'10:00',place:'합성 장소',destination:dest};r.draft.docs=[{id:'DOC-X',name:'분류된 자료.pdf',size:20,fileHash:'x',visibility:'PATIENT',status:'REVIEWED',category:'MEDICATION'}];r.draft.status='APPROVED';r.draft.version='1.0';r.draft.approval={by:'SIM-APPROVER',role:'지정 최종 승인자',at:new Date(Date.now()-1000).toISOString(),digest:fingerprint(r)};r.publications=[{id:'PUB-X',status:'PUBLISHED',encounterId:r.encounterId,assessmentId:r.assessment.id,approvedAt:r.draft.approval.at,snapshot:publishedPayload(r)}];r.draft.status='PUBLISHED';return r;
}
test('verified destination uses official HTTPS Kakao URL, no patient/origin/clinical parameters',()=>{
 const d=destination(),url=directionsURL(d);assert(url.startsWith('https://map.kakao.com/link/to/'));assert(url.endsWith(',37.5,127'));assert(!url.includes('patient'));assert(!url.includes('origin'));
 for(const bad of [{...d,verified:false},{...d,sourceUrl:'javascript:alert(1)'},{...d,latitude:'999'},{...d,patientId:'secret'},null])assert.equal(directionsURL(bad),null);
});
test('old records remain compatible; only verified approved metadata and explicit PDF category are projected',()=>{
 const r=issued();assert(validStoredRecord(r,r.patientId));let pub=projectCurrentPublication({[r.patientId]:r},r.patientId,r.encounterId);assert(pub);assert.equal(pub.items.find(i=>i.section==='followup').appointment.destination.address,destination().address);assert.equal(pub.documents[0].category,'MEDICATION');
 const old=makeInitial('SYN-002');assert(validStoredRecord(old,old.patientId));const partial=issued({...destination(),verified:false});pub=projectCurrentPublication({[partial.patientId]:partial},partial.patientId,partial.encounterId);assert(!pub.items.find(i=>i.section==='followup').appointment.destination);
});
test('destination/category edit changes approval digest; tampered or revoked publication is hidden',()=>{
 for(const change of [r=>r.draft.docs[0].category='GENERAL',r=>r.draft.items.find(i=>i.section==='followup').appointment.destination.address='다른 주소']){const r=issued(),digest=fingerprint(r);change(r);assert.notEqual(fingerprint(r),digest);assert.equal(projectCurrentPublication({[r.patientId]:r},r.patientId,r.encounterId),null);}
 const r=issued();r.publications[0].status='REVOKED';r.draft.status='REVOKED';assert.equal(projectCurrentPublication({[r.patientId]:r},r.patientId,r.encounterId),null);
});
test('lifecycle exposes only actual bound issuance/status metadata, no withdrawn clinical text',()=>{
 const r=issued(),storage={getItem:()=>JSON.stringify({[r.patientId]:r})};let events=publicationEvents(storage,r.patientId,r.encounterId);assert.equal(events.length,1);assert(!JSON.stringify(events).includes('합성 장소'));r.publications[0].status='REVOKED';events=publicationEvents(storage,r.patientId,r.encounterId);assert.equal(events.length,2);assert(events.some(e=>e.id==='REVOKED:PUB-X'));assert.deepEqual(publicationEvents(storage,r.patientId,'wrong'),[]);assert.deepEqual(publicationEvents({getItem:()=>'{bad'},r.patientId,r.encounterId),[]);
});
test('publication versions compare integer components rather than floating decimals',()=>{
 const r=issued();r.draft.version='1.10';r.draft.approval.digest=fingerprint(r);r.publications[0].snapshot=publishedPayload(r);
 const old=structuredClone(r.publications[0]);old.id='PUB-old';old.status='SUPERSEDED';old.snapshot.planVersion='1.9';r.publications.push(old);
 const events=publicationEvents({getItem:()=>JSON.stringify({[r.patientId]:r})},r.patientId,r.encounterId);assert.match(events.find(e=>e.id==='ISSUED:PUB-X').title,/개정·재발행/);
});
