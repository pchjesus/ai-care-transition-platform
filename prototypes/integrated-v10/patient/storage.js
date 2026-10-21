import {encounterFor} from '../shared/publication.js';
export const personalKey=(patient,encounter)=>`care-transition-connected-b-personal-v1:${patient}:${encounter}`;
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function validPersonal(data,patientId,encounterId){
 return object(data)&&data.schema===1&&data.patientId===patientId&&data.encounterId===encounterId&&
  object(data.profile)&&typeof data.profile.address==='string'&&data.profile.address.length<=120&&typeof data.profile.contact==='string'&&data.profile.contact.length<=50&&
  Number.isSafeInteger(data.revision)&&data.revision>=0&&object(data.understanding)&&Object.entries(data.understanding).every(([pub,items])=>pub.startsWith('PUB-')&&object(items)&&Object.values(items).every(v=>['UNDERSTOOD','HELP'].includes(v)))&&
  (data.lastRequest===null||(object(data.lastRequest)&&data.lastRequest.status==='LOCAL_ONLY'&&typeof data.lastRequest.id==='string'&&data.lastRequest.revision===data.revision&&Number.isFinite(Date.parse(data.lastRequest.createdAt))));
}
export function createPatientRepository(storage,patientId,encounterId){
 const key=personalKey(patientId,encounterId);let serialized,error;
 const empty=()=>({schema:1,patientId,encounterId,profile:{address:'',contact:''},revision:0,lastRequest:null,understanding:{}});
 function load(){
  try{
   if(!encounterFor(patientId)||encounterFor(patientId)!==encounterId)throw Error('환자·입원건 불일치');
   serialized=storage.getItem(key);const data=serialized===null?empty():JSON.parse(serialized);
   if(!validPersonal(data,patientId,encounterId))throw Error('저장 자료 오류');error=null;return {data,error:null};
  }catch(cause){error=cause;return {data:empty(),error:cause};}
 }
 return {key,load,save(data){
  if(error)throw Error('기존 저장 자료를 확인할 수 없어 덮어쓰지 않았습니다.');
  if(!validPersonal(data,patientId,encounterId))throw Error('입력 자료를 확인해 주세요.');
  if(storage.getItem(key)!==serialized)throw Error('다른 탭에서 정보가 변경됐습니다. 편집을 취소하고 최신 내용을 확인하세요.');
  const next=JSON.stringify(data);storage.setItem(key,next);serialized=next;
 }};
}
