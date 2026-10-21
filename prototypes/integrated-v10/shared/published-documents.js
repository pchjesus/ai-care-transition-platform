// Local synthetic document transport only. No external URLs or unrelated example files.
import {readPatientPublication,PUBLICATION_STORAGE_KEY} from './publication.js';
export const DOCUMENT_DB='care-transition-published-pdfs-v1';
const STORE='documents';
export function createDocumentStore(factory=globalThis.indexedDB){
 async function open(){
  if(!factory)throw Error('이 브라우저에서 문서 저장소를 사용할 수 없습니다.');
  return new Promise((resolve,reject)=>{
   const request=factory.open(DOCUMENT_DB,1);
   request.onupgradeneeded=()=>request.result.createObjectStore(STORE,{keyPath:'key'});
   request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('문서 저장소가 다른 탭에서 사용 중입니다.'));
  });
 }
 return {
  async putAll(entries){const db=await open();try{await new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,'readwrite');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('문서 저장 중단'));
   try{for(const entry of entries)tx.objectStore(STORE).put(entry);}catch(error){tx.abort();reject(error);}
  });}finally{db.close();}},
  async get(key){const db=await open();try{return await new Promise((resolve,reject)=>{
   const request=db.transaction(STORE).objectStore(STORE).get(key);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });}finally{db.close();}}
 };
}
const keyFor=(patient,encounter,pub,doc)=>JSON.stringify([patient,encounter,pub,doc]);
export async function pdfDigest(blob){
 if(!(blob instanceof Blob)||blob.size<5||blob.size>4*1024*1024)throw Error('4MB 이하의 PDF 파일이 필요합니다.');
 const bytes=await blob.arrayBuffer();if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Error('PDF 형식을 확인할 수 없습니다.');
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
}
export async function stagePublishedDocuments(record,publication,files,store=createDocumentStore()){
 const manifests=[],entries=[];
 for(const doc of record.draft.docs.filter(d=>d.visibility==='PATIENT')){
  const blob=files.get(doc.id);
  if(doc.status!=='REVIEWED'||!blob||blob.size!==doc.size||await pdfDigest(blob)!==doc.fileHash)throw Error('검토한 PDF 원본이 일치하지 않습니다. 다시 첨부하세요.');
  const manifest={id:doc.id,name:doc.name,size:doc.size,fileHash:doc.fileHash};
  manifests.push(manifest);entries.push({key:keyFor(record.patientId,publication.encounterId,publication.id,doc.id),patientId:record.patientId,encounterId:publication.encounterId,publicationId:publication.id,...manifest,blob});
 }
 if(entries.length)await store.putAll(entries);
 return manifests;
}
export async function readPublishedDocument(storage,patientId,encounterId,publicationId,documentId,store=createDocumentStore()){
 const before=storage?.getItem(PUBLICATION_STORAGE_KEY);
 const current=()=>readPatientPublication(storage,patientId,encounterId).publication;
 const pub=current();if(!pub||pub.publicationId!==publicationId||!pub.documents.some(d=>d.id===documentId))throw Error('현재 유효한 발행 자료가 아닙니다.');
 const wrapper=JSON.parse(before)[patientId].publications.find(p=>p.id===publicationId);
 const manifest=Array.isArray(wrapper.documentManifest)?wrapper.documentManifest.find(d=>d?.id===documentId):null;
 if(!manifest||manifest.name!==pub.documents.find(d=>d.id===documentId).name)throw Error('현재 발행본에 제공된 PDF 원본이 없습니다. 의료진에게 자료를 요청하세요.');
 const document=await store.get(keyFor(patientId,encounterId,publicationId,documentId));
 if(!manifest||!document||document.patientId!==patientId||document.encounterId!==encounterId||document.publicationId!==publicationId||document.id!==documentId||document.name!==manifest.name||document.fileHash!==manifest.fileHash||document.size!==manifest.size||document.blob?.size!==manifest.size||await pdfDigest(document.blob)!==manifest.fileHash)throw Error('승인된 PDF 원본을 찾을 수 없습니다. 의료진에게 다시 제공해 달라고 요청하세요.');
 if(storage.getItem(PUBLICATION_STORAGE_KEY)!==before||current()?.publicationId!==publicationId)throw Error('자료를 여는 중 발행 상태가 변경됐습니다. 다시 확인하세요.');
 return {blob:document.blob,name:document.name};
}
