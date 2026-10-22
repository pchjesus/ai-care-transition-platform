import test from 'node:test';import assert from 'node:assert/strict';
import {emptyPreferences,createReminderRepository,reminderKey,planPreferences,localInstant,calculateReminders,inboxEvents} from '../patient/reminders.js';
const c=()=>({source:'connected',patientId:'SYN-002',encounterId:'ENC-SYN-002-DEMO',status:'PUBLISHED',publication:{patientId:'SYN-002',encounterId:'ENC-SYN-002-DEMO',publicationId:'PUB-A',planVersion:'1.0',assessmentId:'AS-SYN-002-A',items:[{id:'follow',section:'followup',title:'합성 외래',appointment:{date:'2030-01-03',time:'10:00',place:'합성 장소'}},{id:'warning',section:'warning',title:'주의 안내'},{id:'med',section:'medication',text:'오전 8시에 먹는다는 자유 서술'}]}});
function prefs(ctx=c()){const d=emptyPreferences(ctx);d.zone='Asia/Seoul';d.plans['PUB-A']={...planPreferences(d,ctx.publication),personal:[],followups:{},important:false};return d;}
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)}};
test('personal preparation supports 0/10/30 minutes; never infers schedule from medication prose',()=>{
 const ctx=c(),d=prefs(),now=localInstant('2030-01-01','00:00',d.zone);
 assert.deepEqual(calculateReminders(ctx,d,now),[]);
 for(const lead of [0,10,30]){d.plans['PUB-A'].personal=[{id:'m',label:'개인 준비',date:'2030-01-02',time:'08:00',lead,enabled:true}];const [r]=calculateReminders(ctx,d,now);assert.equal(r.at,localInstant('2030-01-02','08:00',d.zone)-lead*60000);assert(r.personal);d.plans['PUB-A'].personal[0].enabled=false;assert.deepEqual(calculateReminders(ctx,d,now),[]);}
});
test('confirmed appointment previous day and same-day use chosen zone and prevent expired schedules',()=>{
 const ctx=c(),d=prefs();d.plans['PUB-A'].followups.follow={enabled:true,dayBefore:true,sameDay:true,time:'09:00'};
 const rows=calculateReminders(ctx,d,localInstant('2030-01-01','00:00',d.zone));assert.equal(rows.length,2);assert.equal(rows[0].at,Date.parse('2030-01-02T00:00:00Z'));assert.equal(rows[1].at,Date.parse('2030-01-03T00:00:00Z'));
 assert.deepEqual(calculateReminders(ctx,d,localInstant('2030-01-03','10:01',d.zone)),[]);delete ctx.publication.items[0].appointment;assert.deepEqual(calculateReminders(ctx,d,Date.parse('2030-01-01')),[]);
});
test('calendar timezone arithmetic handles DST and rejects nonexistent dates/times',()=>{
 assert.equal(localInstant('2030-01-03','09:00','Asia/Seoul'),Date.parse('2030-01-03T00:00Z'));
 assert(Number.isNaN(localInstant('2030-02-30','09:00','UTC')));assert(Number.isNaN(localInstant('2030-03-10','02:30','America/New_York')));
 const ctx=c(),d=prefs();d.zone='America/New_York';ctx.publication.items[0].appointment={date:'2030-03-11',time:'10:00',place:'합성'};d.plans['PUB-A'].followups.follow={enabled:true,dayBefore:true,sameDay:true,time:'09:00'};const out=calculateReminders(ctx,d,Date.parse('2030-03-09'));assert.equal(out[0].at,Date.parse('2030-03-10T13:00Z'));assert.equal(out[1].at,Date.parse('2030-03-11T13:00Z'));
});
test('date-only appointment clearly uses selected reminder time without inventing appointment time',()=>{
 const ctx=c(),d=prefs();ctx.publication.items[0].appointment.time='';d.plans['PUB-A'].followups.follow={enabled:true,dayBefore:true,sameDay:true,time:'09:00'};assert(calculateReminders(ctx,d,Date.parse('2030-01-01')).every(x=>x.dateOnly));
});
test('revision retains valid old publication; replacement, withdrawal and mismatched identity never reuse settings',()=>{
 const ctx=c(),d=prefs();d.plans['PUB-A'].followups.follow={enabled:true,dayBefore:true,sameDay:true,time:'09:00'};const now=Date.parse('2030-01-01');assert.equal(calculateReminders(ctx,d,now).length,2);
 ctx.publication.publicationId='PUB-B';assert.deepEqual(calculateReminders(ctx,d,now),[]);ctx.publication.publicationId='PUB-A';ctx.publication.planVersion='2.0';assert.deepEqual(calculateReminders(ctx,d,now),[]);ctx.publication.planVersion='1.0';ctx.status='EMPTY';assert.deepEqual(calculateReminders(ctx,d,now),[]);ctx.status='PUBLISHED';ctx.publication.encounterId='other';assert.deepEqual(calculateReminders(ctx,d,now),[]);
});
test('settings restore and source/patient/encounter namespaces remain separate without clinical writes',()=>{
 const ctx=c(),storage=memory(),r=createReminderRepository(storage,ctx);const original=r.load().data;r.save(original);assert.deepEqual(createReminderRepository(storage,ctx).load().data,original);
 for(const other of [{...ctx,patientId:'SYN-001'},{...ctx,encounterId:'other'},{...ctx,source:'independent'}])assert.notEqual(reminderKey(ctx),reminderKey(other));
});
test('quota, permission denial, corrupt data and concurrent stale writers fail without overwriting',()=>{
 const ctx=c(),storage=memory(),r=createReminderRepository(storage,ctx),d=r.load().data,other=createReminderRepository(storage,ctx);other.load();r.save(d);assert.throws(()=>other.save(d),/다른 탭/);
 const before=storage.getItem(r.key);storage.setItem=()=>{throw Error('QuotaExceededError')};assert.throws(()=>r.save(d),/Quota/);assert.equal(storage.getItem(r.key),before);
 for(const storage of [{getItem:()=>'{bad',setItem:()=>assert.fail()},{getItem:()=>{throw Error('SecurityError')},setItem:()=>assert.fail()}]){const broken=createReminderRepository(storage,ctx);assert(broken.load().error);assert.throws(()=>broken.save(d));}
});
test('inbox lifecycle, due alert and optional important reminder are stable and not understanding records',()=>{
 const ctx=c(),d=prefs();ctx.events=[{id:'ISSUED:PUB-A',title:'계획 발행'},{id:'ISSUED:PUB-A',title:'계획 발행'}];d.plans['PUB-A'].important=true;
 let events=inboxEvents(ctx,d);assert.equal(events.length,2);d.seen[events[0].id]=true;assert(inboxEvents(ctx,d)[0].seen);assert.equal(ctx.understanding,undefined);ctx.understanding={warning:'UNDERSTOOD'};assert.equal(inboxEvents(ctx,d).length,1);ctx.status='EMPTY';assert.equal(inboxEvents(ctx,d).length,1);
});
