// Synthetic, same-origin, browser-local A3 -> patient B read projection.
// This is not an authentication or server authorization boundary.
import {fingerprint,publishedPayload,validAppointment} from '../a3/workflow.js';
import {STORAGE_KEYS,loadRepository} from '../a3/storage.js';
import {CASES} from '../a3/data.js';

export const PUBLICATION_STORAGE_KEY=STORAGE_KEYS.normal;
export const ENCOUNTERS=Object.freeze({
 'SYN-001':'ENC-SYN-001-DEMO',
 'SYN-002':'ENC-SYN-002-DEMO',
 'SYN-003':'ENC-SYN-003-DEMO',
 'SYN-004':'ENC-SYN-004-DEMO'
});
export const encounterFor=id=>ENCOUNTERS[id]||null;
// Controlled synthetic identity labels, only after patient and encounter match.
export function syntheticPatientName(id,encounterId){
 if(ENCOUNTERS[id]!==encounterId)return null;
 const patient=CASES.find(c=>c.id===id);
 return patient&&typeof patient.name==='string'?patient.name:null;
}
const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const str=(x,max=1000)=>typeof x==='string'&&x.length>0&&x.length<=max;
const instant=x=>str(x,35)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
const publicSection=new Set(['today','medication','followup','warning','contact','support']);

function project(records, patientId, encounterId){
 if(!Object.hasOwn(ENCOUNTERS,patientId)||ENCOUNTERS[patientId]!==encounterId)return null;
 if(!plain(records)||!plain(records[patientId]))return null;
 const r=records[patientId],pubs=r.publications;
 if(r.patientId!==patientId||(r.encounterId!==undefined&&r.encounterId!==encounterId)||!Array.isArray(pubs)||pubs.length>100)return null;
 if(pubs.some(p=>!plain(p)||!['PUBLISHED','SUPERSEDED','REVOKED'].includes(p.status)))return null;
 const current=pubs.filter(p=>p.status==='PUBLISHED');
 if(current.length!==1||r.draft?.status==='REVOKED')return null;
 const p=current[0],s=p.snapshot;
 // Old records without a complete publication wrapper are deliberately NOT promoted.
 if(!str(p.id,100)||!/^PUB-/.test(p.id)||p.encounterId!==encounterId||
    !str(p.assessmentId,100)||!p.assessmentId.startsWith('AS-'+patientId+'-')||
    !instant(p.approvedAt)||!plain(s)||s.patientId!==patientId||
    !str(s.planVersion,30)||!/^([1-9]\d*)\.\d+$/.test(s.planVersion)||
    !instant(s.approvedAt)||p.approvedAt!==s.approvedAt||!instant(s.issuedAt)||
    Date.parse(s.approvedAt)>Date.parse(s.issuedAt)||
    !['DRAFT','REVIEW_REQUESTED','CHANGES_REQUESTED','APPROVED','PUBLISHED'].includes(r.draft?.status)||
    (r.draft.status==='PUBLISHED'&&r.draft.version!==s.planVersion))return null;
 if(r.draft.status==='PUBLISHED'){
  if(r.assessment?.id!==p.assessmentId||(r.assessment.encounterId!==undefined&&r.assessment.encounterId!==encounterId)||!r.draft.approval||
     r.draft.approval.by!=='SIM-APPROVER'||r.draft.approval.role!=='지정 최종 승인자'||r.draft.approval.at!==p.approvedAt||
     r.draft.approval.digest!==fingerprint(r))return null;
  const expected=publishedPayload(r);
  if(JSON.stringify(s.items)!==JSON.stringify(expected.items)||JSON.stringify(s.documents)!==JSON.stringify(expected.documents))return null;
 }else{
  // An older publication may remain visible during a strictly newer revision only.
  const version=r.draft.version;
  if(!str(version,30)||!/^([1-9]\d*)\.\d+$/.test(version))return null;
  const [major,minor]=version.split('.').map(Number),[oldMajor,oldMinor]=s.planVersion.split('.').map(Number);
  if(!Number.isSafeInteger(major)||!Number.isSafeInteger(minor)||major<oldMajor||(major===oldMajor&&minor<=oldMinor))return null;
 }
 if(pubs.some(x=>x!==p&&x.id===p.id))return null;
 if(!Array.isArray(s.items)||s.items.length===0||s.items.length>20||
    !s.items.every(i=>plain(i)&&str(i.id,80)&&str(i.title,150)&&str(i.text,4000)&&publicSection.has(i.section)&&
     (i.appointment===undefined||(i.section==='followup'&&plain(i.appointment)&&
      Object.keys(i.appointment).sort().join(',')==='date,place,time'&&
      validAppointment({...i.appointment,status:'CONFIRMED'}))))||
    new Set(s.items.map(i=>i.id)).size!==s.items.length)return null;
 if(!Array.isArray(s.documents)||s.documents.length>20||
    !s.documents.every(d=>plain(d)&&str(d.id,100)&&str(d.name,250))||
    new Set(s.documents.map(d=>d.id)).size!==s.documents.length)return null;
 return {
  schemaVersion:1,isSynthetic:true,patientId,encounterId,
  publicationId:p.id,assessmentId:p.assessmentId,planVersion:s.planVersion,
  approvedAt:s.approvedAt,issuedAt:s.issuedAt,status:'PUBLISHED',
  items:s.items.map(({id,title,section,text,appointment})=>({id,title,section,text,...(appointment?{appointment:{date:appointment.date,time:appointment.time,place:appointment.place}}:{})})),
  documents:s.documents.map(({id,name})=>({id,name}))
 };
}
export function projectCurrentPublication(records,patientId,encounterId){
 try{return project(records,patientId,encounterId)}catch{return null}
}
export function readPatientPublication(storage,patientId,encounterId){
 if(!encounterFor(patientId)||encounterFor(patientId)!==encounterId)
  return {status:'MISMATCH',publication:null};
 const loaded=loadRepository(storage,STORAGE_KEYS.normal);
 if(loaded.error)return {status:'ERROR',publication:null};
 const publication=projectCurrentPublication(loaded.records,patientId,encounterId);
 return {status:publication?'PUBLISHED':'EMPTY',publication};
}
