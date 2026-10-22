import {loadRepository,STORAGE_KEYS} from '../a3/storage.js';
import {encounterFor,projectCurrentPublication} from './publication.js';
// Validated, identifier-only lifecycle history. No draft or withdrawn text/documents.
export function publicationEvents(storage,patientId,encounterId){
 if(encounterFor(patientId)!==encounterId)return [];
 const loaded=loadRepository(storage,STORAGE_KEYS.normal);if(loaded.error)return [];
 const r=loaded.records[patientId];if(!r||r.encounterId!==encounterId)return [];
 const current=projectCurrentPublication(loaded.records,patientId,encounterId);
 return r.publications.flatMap(p=>{
  if(!p.id.startsWith('PUB-')||p.encounterId!==encounterId||!p.assessmentId?.startsWith('AS-'+patientId+'-')||!Number.isFinite(Date.parse(p.approvedAt))||Date.parse(p.approvedAt)>Date.parse(p.snapshot.issuedAt)||p.approvedAt!==p.snapshot.approvedAt||!Number.isFinite(Date.parse(p.snapshot.issuedAt))||!/^\d+\.\d+$/.test(p.snapshot.planVersion)||!['PUBLISHED','SUPERSEDED','REVOKED'].includes(p.status))return [];
  if(p.status==='PUBLISHED'&&current?.publicationId!==p.id)return [];
  const base={publicationId:p.id,version:p.snapshot.planVersion,at:Date.parse(p.snapshot.issuedAt)};
  const newer=r.publications.some(other=>other!==p&&Number.parseFloat(other.snapshot.planVersion)<Number.parseFloat(p.snapshot.planVersion)&&Date.parse(other.snapshot.issuedAt)<=base.at);
  return [{...base,id:'ISSUED:'+p.id,title:(newer?'계획 개정·재발행 · v':'계획 발행 · v')+p.snapshot.planVersion},...(p.status==='SUPERSEDED'?[{...base,id:'SUPERSEDED:'+p.id,title:'이전 계획이 새 발행본으로 변경됐어요'}]:[]),...(p.status==='REVOKED'?[{...base,id:'REVOKED:'+p.id,title:'발행본이 철회됐어요. 이전 안내를 사용하지 마세요.'}]:[])];
 }).sort((a,b)=>b.at-a.at);
}
