import {CASES,DOMAINS,SECTIONS} from './data.js';
import {deepCopy,makeInitial} from './workflow.js';

// Candidate data must never overwrite the read-only v0.3 baseline on a shared origin.
export const STORAGE_KEYS={normal:'a3-prototype-v04-synthetic-only',study:'a3-study-v04-synthetic-only'};
const isObject=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const strings=(v,keys)=>isObject(v)&&keys.every(k=>typeof v[k]==='string');
export function validStoredRecord(r,id){
 if(!isObject(r)||r.schema!==2||r.patientId!==id||!CASES.some(c=>c.id===id))return false;
 const a=r.assessment,d=r.draft;
 if(!strings(a,['id','ruleVersion','capturedAt'])||!a.id.startsWith(`AS-${id}-`)||!isObject(a.values))return false;
 if(!DOMAINS.every(domain=>isObject(a.values[domain.id])))return false;
 if(!Array.isArray(a.domainResults)||a.domainResults.length!==DOMAINS.length||!DOMAINS.every(domain=>a.domainResults.some(result=>result.id===domain.id&&Array.isArray(result.facts)&&Array.isArray(result.missing)&&Array.isArray(result.conflicting))))return false;
 if(!strings(d,['version','status','createdAt','updatedAt'])||!['DRAFT','REVIEW_REQUESTED','CHANGES_REQUESTED','APPROVED','PUBLISHED','REVOKED'].includes(d.status))return false;
 if(!Array.isArray(d.items)||!d.items.every(i=>strings(i,['id','section','title','text','source','visibility'])&&SECTIONS.some(s=>s.id===i.section)&&typeof i.verified==='boolean'))return false;
 if(!Array.isArray(d.docs)||!d.docs.every(doc=>strings(doc,['id','name','fileHash','visibility','status'])&&Number.isFinite(doc.size)))return false;
 if(!Array.isArray(d.issues)||!d.issues.every(i=>strings(i,['id','domain','title','reason','status','source','resolution','reviewer'])))return false;
 if(!Array.isArray(r.audit)||!r.audit.every(e=>strings(e,['at','role','event','details'])))return false;
 if(!Array.isArray(r.publications)||!r.publications.every(p=>strings(p,['id','status'])&&p.snapshot?.patientId===id&&strings(p.snapshot,['planVersion','issuedAt'])&&Array.isArray(p.snapshot.items)&&p.snapshot.items.every(i=>strings(i,['id','title','section','text']))&&Array.isArray(p.snapshot.documents)))return false;
 if(r.unlockedSources!==undefined&&(!Array.isArray(r.unlockedSources)||!r.unlockedSources.every(s=>typeof s==='string')))return false;
 if(r.a2Values!==undefined&&(!isObject(r.a2Values)||!DOMAINS.every(domain=>isObject(r.a2Values[domain.id]))))return false;
 return true;
}
export function loadRepository(storage,key){
 try{
  if(!storage)throw Error('Local storage unavailable');
  const raw=storage.getItem(key),records=raw===null?{}:JSON.parse(raw);
  if(!isObject(records)||!Object.entries(records).every(([id,r])=>validStoredRecord(r,id)))throw Error('Invalid patient repository');
  return {records,error:null,serialized:raw};
 }catch(error){return {records:{},error};}
}
export function initializePatients(records){
 for(const c of CASES){
  if(!records[c.id])records[c.id]=makeInitial(c.id);
  if(!records[c.id].a2Values)records[c.id].a2Values=deepCopy(records[c.id].assessment.values);
  if(records[c.id].a2Dirty===undefined)records[c.id].a2Dirty=false;
 }
 return records;
}
export function persistRepository(storage,key,state){
 // Do not destroy unreadable or cross-patient records with a freshly initialized default.
 if(state.error)throw state.error;
 if(storage.getItem(key)!==state.serialized)throw Error('Storage changed in another tab; reload before saving');
 const serialized=JSON.stringify(state.records);
 storage.setItem(key,serialized);
 state.serialized=serialized;
}
