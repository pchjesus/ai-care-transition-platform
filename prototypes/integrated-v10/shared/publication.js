// Synthetic, same-origin, browser-local A3 -> patient B read projection.
// This is not an authentication or server authorization boundary.
import {STORAGE_KEYS,loadRepository} from '../a3/storage.js';

export const ENCOUNTERS=Object.freeze({
 'SYN-001':'ENC-SYN-001-DEMO',
 'SYN-002':'ENC-SYN-002-DEMO',
 'SYN-003':'ENC-SYN-003-DEMO',
 'SYN-004':'ENC-SYN-004-DEMO'
});
export const encounterFor=id=>ENCOUNTERS[id]||null;
const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const str=(x,max=1000)=>typeof x==='string'&&x.length>0&&x.length<=max;
const instant=x=>str(x,35)&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d/.test(x)&&Number.isFinite(Date.parse(x));
const publicSection=new Set(['today','medication','followup','warning','contact','support']);

export function projectCurrentPublication(records, patientId, encounterId){
 if(!Object.hasOwn(ENCOUNTERS,patientId)||ENCOUNTERS[patientId]!==encounterId)return null;
 if(!plain(records)||!plain(records[patientId]))return null;
 const r=records[patientId],pubs=r.publications;
 if(r.patientId!==patientId||!Array.isArray(pubs)||pubs.length>100)return null;
 if(pubs.some(p=>!plain(p)||!['PUBLISHED','SUPERSEDED','REVOKED'].includes(p.status)))return null;
 const current=pubs.filter(p=>p.status==='PUBLISHED');
 if(current.length!==1||r.draft?.status==='REVOKED')return null;
 const p=current[0],s=p.snapshot;
 // Old records without a complete publication wrapper are deliberately NOT promoted.
 if(!str(p.id,100)||!/^PUB-/.test(p.id)||p.encounterId!==encounterId||
    !str(p.assessmentId,100)||!p.assessmentId.startsWith('AS-'+patientId+'-')||
    !instant(p.approvedAt)||!plain(s)||s.patientId!==patientId||
    !/^([1-9]\d*)\.\d+$/.test(s.planVersion||'')||
    !instant(s.approvedAt)||p.approvedAt!==s.approvedAt||!instant(s.issuedAt)||
    Date.parse(s.approvedAt)>Date.parse(s.issuedAt)||
    !['DRAFT','REVIEW_REQUESTED','CHANGES_REQUESTED','APPROVED','PUBLISHED'].includes(r.draft?.status)||
    (r.draft.status==='PUBLISHED'&&r.draft.version!==s.planVersion))return null;
 if(pubs.some(x=>x!==p&&x.id===p.id))return null;
 if(!Array.isArray(s.items)||s.items.length===0||s.items.length>20||
    !s.items.every(i=>plain(i)&&str(i.id,80)&&str(i.title,150)&&str(i.text,4000)&&publicSection.has(i.section))||
    new Set(s.items.map(i=>i.id)).size!==s.items.length)return null;
 if(!Array.isArray(s.documents)||s.documents.length>20||
    !s.documents.every(d=>plain(d)&&str(d.id,100)&&str(d.name,250))||
    new Set(s.documents.map(d=>d.id)).size!==s.documents.length)return null;
 return {
  schemaVersion:1,isSynthetic:true,patientId,encounterId,
  publicationId:p.id,assessmentId:p.assessmentId,planVersion:s.planVersion,
  approvedAt:s.approvedAt,issuedAt:s.issuedAt,status:'PUBLISHED',
  items:s.items.map(({id,title,section,text})=>({id,title,section,text})),
  documents:s.documents.map(({id,name})=>({id,name}))
 };
}
export function readPatientPublication(storage,patientId,encounterId){
 if(!encounterFor(patientId)||encounterFor(patientId)!==encounterId)
  return {status:'MISMATCH',publication:null};
 const loaded=loadRepository(storage,STORAGE_KEYS.normal);
 if(loaded.error)return {status:'ERROR',publication:null};
 const publication=projectCurrentPublication(loaded.records,patientId,encounterId);
 return {status:publication?'PUBLISHED':'EMPTY',publication};
}
