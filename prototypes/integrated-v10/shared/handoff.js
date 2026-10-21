import {CASES, DOMAINS} from '../a2/data.js';
import {evaluateAll} from '../a2/engine.js';

// In-browser synthetic-only inbox. This is NOT authentication, an EMR interface or secure transport.
export const HANDOFF_KEY = 'care-transition-integrated-v10-a2-inbox';
export const HANDOFF_RULE_VERSION = 'a2-v0.5';
export const HANDOFF_SCHEMA_VERSION = 1;
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const copy=x=>structuredClone(x);
const keys=(x)=>Object.keys(x).sort().join('|');
const PATIENT_IDS=new Set(CASES.map(c=>c.id));
const packetFields=['assessmentId','capturedAt','domainResults','encounterId','isSynthetic','patientId','ruleVersion','schemaVersion','values'];

export function summarizeAssessment(values) {
 return evaluateAll(values).map(({domain,status,tier,provisionalTier,knownRequired,totalRequired,missing,confusions})=>({
  domain,status,tier,provisionalTier,knownRequired,totalRequired,missing,confusions
 }));
}
export function normalizeSelections(values) {
 if(!object(values)||keys(values)!==DOMAINS.map(d=>d.id).sort().join('|'))throw Error('6개 영역의 평가 입력이 필요합니다.');
 const result={};
 for(const domain of DOMAINS){
  const input=values[domain.id];
  if(!object(input)||keys(input)!==domain.fields.map(f=>f.id).sort().join('|'))throw Error(domain.title+' 평가항목 구성이 다릅니다.');
  result[domain.id]={};
  for(const field of domain.fields){
   const v=input[field.id];
   if(v!==null&&v!=='CONFLICT'&&!field.options.some(([id])=>id===v))throw Error('허용되지 않은 평가 선택값: '+domain.id+'.'+field.id);
   result[domain.id][field.id]=v;
  }
 }
 return result;
}
export function createAssessmentHandoff(patientId,values,time=new Date()) {
 if(!PATIENT_IDS.has(patientId))throw Error('A2 원본에 없는 가상 환자입니다.');
 const capturedAt=time.toISOString();
 const stamp=time.getTime();
 if(!Number.isSafeInteger(stamp)||stamp<0)throw Error('잘못된 시각입니다.');
 const normalized=normalizeSelections(values);
 const packet={schemaVersion:HANDOFF_SCHEMA_VERSION,isSynthetic:true,patientId,
  encounterId:'ENC-'+patientId+'-DEMO',assessmentId:'AS-'+patientId+'-'+stamp,
  ruleVersion:HANDOFF_RULE_VERSION,capturedAt,values:normalized,
  domainResults:summarizeAssessment(normalized)};
 validateAssessmentHandoff(packet);
 return packet;
}
export function validateAssessmentHandoff(packet) {
 if(!object(packet)||keys(packet)!==packetFields.join('|'))throw Error('인계 자료의 형식이 올바르지 않습니다.');
 if(packet.schemaVersion!==HANDOFF_SCHEMA_VERSION||packet.isSynthetic!==true||!PATIENT_IDS.has(packet.patientId))throw Error('합성 환자 전용 인계가 아닙니다.');
 if(packet.encounterId!=='ENC-'+packet.patientId+'-DEMO'||packet.ruleVersion!==HANDOFF_RULE_VERSION)throw Error('환자 입원건 또는 평가 규칙 버전이 다릅니다.');
 const match=/-(\d+)$/.exec(packet.assessmentId||'');
 if(!match||packet.assessmentId!=='AS-'+packet.patientId+'-'+match[1]||!Number.isSafeInteger(Number(match[1])))throw Error('평가 식별자가 올바르지 않습니다.');
 if(typeof packet.capturedAt!=='string'||new Date(packet.capturedAt).toISOString()!==packet.capturedAt||Number(match[1])!==Date.parse(packet.capturedAt))throw Error('평가 시각이 올바르지 않습니다.');
 const values=normalizeSelections(packet.values);
 const expected=summarizeAssessment(values);
 if(!Array.isArray(packet.domainResults)||JSON.stringify(packet.domainResults)!==JSON.stringify(expected))throw Error('평가 결과가 입력값·원본 A2 엔진과 불일치합니다.');
 return copy(packet);
}
export function readPendingHandoff(storage) {
 if(!storage)throw Error('브라우저 저장소에 접근할 수 없습니다.');
 const raw=storage.getItem(HANDOFF_KEY);
 if(raw===null)return null;
 if(raw.length>25000)throw Error('인계 자료가 허용 범위를 초과했습니다.');
 let parsed;
 try{parsed=JSON.parse(raw)}catch{throw Error('인계 자료가 손상되었습니다.');}
 return validateAssessmentHandoff(parsed);
}
export function writePendingHandoff(storage,packet) {
 const valid=validateAssessmentHandoff(packet);
 if(!storage)throw Error('브라우저 저장소를 사용할 수 없습니다.');
 const before=storage.getItem(HANDOFF_KEY);
 if(before!==null) {
  const existing=readPendingHandoff(storage);
  if(existing.patientId!==valid.patientId)throw Error('다른 환자의 미처리 인계가 있습니다. A3에서 먼저 확인하세요.');
 }
 if(storage.getItem(HANDOFF_KEY)!==before)throw Error('다른 탭이 인계 정보를 변경했습니다. 다시 확인하세요.');
 storage.setItem(HANDOFF_KEY,JSON.stringify(valid));
 if(storage.getItem(HANDOFF_KEY)!==JSON.stringify(valid))throw Error('인계 자료를 저장할 수 없습니다.');
 return valid.assessmentId;
}
export function clearPendingHandoff(storage,assessmentId) {
 const pending=readPendingHandoff(storage);
 if(!pending)return true;
 if(pending.assessmentId!==assessmentId)return false;
 storage.removeItem(HANDOFF_KEY);
 return storage.getItem(HANDOFF_KEY)===null;
}
