import test from 'node:test';
import assert from 'node:assert/strict';
import {recordsForPatient,usableSource} from '../source-library.js';
test('all plan sections have diverse confirmed source choices when the case has no hard medication conflict',()=>{
 for(const patient of ['SYN-001','SYN-002','SYN-004'])
  for(const section of ['today','medication','followup','warning','contact','support']){
   const matches=recordsForPatient(patient).filter(r=>usableSource(r,'item',section,patient));
   assert.ok(matches.length>=2,patient+' '+section+' options '+matches.length);
   assert.ok(matches.every(r=>r.isSynthetic&&r.patientId===patient));
  }
});
test('SYN-003 keeps conflicting medication evidence blocked while other topics have diverse choices',()=>{
 const id='SYN-003',records=recordsForPatient(id);
 assert.equal(records.filter(r=>usableSource(r,'item','medication',id)).length,0);
 for(const section of ['today','followup','warning','contact','support'])
  assert.ok(records.filter(r=>usableSource(r,'item',section,id)).length>=2,section);
});
test('foreign and unconfirmed sources cannot satisfy publication evidence contract',()=>{
 for(const r of recordsForPatient('SYN-003'))if(r.verificationStatus!=='CONFIRMED')
  assert.equal(usableSource(r,'item',r.sections[0],'SYN-003'),false);
 for(const r of recordsForPatient('SYN-002'))
  assert.equal(usableSource(r,'item',r.sections[0],'SYN-001'),false);
});
