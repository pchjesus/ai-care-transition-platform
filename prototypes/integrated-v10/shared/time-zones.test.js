import test from 'node:test';import assert from 'node:assert/strict';
import {zoneLabel,commonZones} from '../patient/time-zones.js';
import {localInstant,emptyPreferences,planPreferences,calculateReminders} from '../patient/reminders.js';
test('friendly timezone labels preserve stored identifiers and actual DST offsets',()=>{
 assert.equal(zoneLabel('Asia/Seoul',Date.parse('2030-01-01')),'한국 시간(서울, UTC+9)');assert.equal(zoneLabel('UTC'),'세계 표준시(UTC+0)');assert.match(zoneLabel('America/New_York',Date.parse('2030-01-01')),/뉴욕, UTC-5/);assert.match(zoneLabel('America/New_York',Date.parse('2030-07-01')),/뉴욕, UTC-4/);
 assert.equal(commonZones('Asia/Kathmandu')[0],'Asia/Kathmandu');assert.match(zoneLabel('Asia/Kathmandu'),/UTC\+5:45/);assert.equal(zoneLabel('Bad/Zone'),'시간대를 확인해 주세요');assert.equal(new Set(commonZones('UTC')).size,commonZones('UTC').length);
});
test('personal preparation at a date boundary and repeated DST hour creates one reminder',()=>{
 const c={source:'connected',patientId:'SYN-002',encounterId:'ENC-SYN-002-DEMO',status:'PUBLISHED',publication:{patientId:'SYN-002',encounterId:'ENC-SYN-002-DEMO',publicationId:'PUB-TZ',assessmentId:'AS-SYN-002-TZ',planVersion:'1.0',items:[]}};
 const d=emptyPreferences(c);d.zone='Asia/Seoul';d.plans['PUB-TZ']={...planPreferences(d,c.publication),personal:[{id:'M',label:'개인 준비',date:'2030-01-02',time:'00:10',lead:30,enabled:true}],followups:{},important:false};
 assert.equal(calculateReminders(c,d,localInstant('2030-01-01','23:45',d.zone))[0].at,Date.parse('2030-01-01T14:40Z'));
 d.zone='America/New_York';d.plans['PUB-TZ'].personal[0]={id:'M',label:'개인 준비',date:'2030-11-03',time:'01:30',lead:0,enabled:true};const result=calculateReminders(c,d,Date.parse('2030-11-02'));assert.equal(result.length,1);assert.equal(result[0].at,Date.parse('2030-11-03T05:30Z'));
});
