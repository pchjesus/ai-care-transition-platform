import { DOMAINS } from './data.js';

/** Only demonstrates prioritization of manual workflow review; not a validated clinical scale. */
export function evaluateDomain(domain, selections) {
  let totalRequired=0,knownRequired=0;
  const missing=[], confusions=[],observed=[], traces=[];
  let peak=0;
  for (const field of domain.fields){
    const value=selections?.[field.id] ?? null;
    if(field.required)totalRequired++;
    if(value==='CONFLICT') {confusions.push(field.label);traces.push({id:`${domain.id}.${field.id}.CONFLICT`,name:field.label,reason:'서로 다른 근거가 상충하여 판단 보류',severity:null});continue;}
    const match=field.options.find(([id])=>id===value);
    if(!match){if(field.required)missing.push(field.label);continue;}
    if(field.required)knownRequired++;
    const tier=match[2];
    peak=Math.max(peak,tier);
    observed.push({label:field.label,value:match[1],tier,required:field.required});
    traces.push({id:`${domain.id}.${field.id}.${value}`,name:field.label,reason:match[1],severity:tier});
  }
  // Social tier 3 reflects multiple confirmed support barriers, not independent living or age alone.
  if(domain.id==='social' && selections?.caregiver==='none' && selections?.housing==='barrier' && selections?.travel==='unavailable'){
    peak=Math.max(peak,3);
    traces.push({id:'social.combination.01',name:'지원 공백 복합 확인',reason:'지원자·주거 장벽·이동 수단 부재가 모두 확인됨',severity:3});
  }
  const uncertain=missing.length>0 || confusions.length>0;
  const status=confusions.length?'CONFLICTING':missing.length?'UNKNOWN':'READY';
  return {domain:domain.id,tier:uncertain?null:peak,provisionalTier:peak,status,missing,confusions,observed,traces,totalRequired,knownRequired,completeness:`${knownRequired}/${totalRequired}`};
}
export function evaluateAll(values){return DOMAINS.map(d=>evaluateDomain(d,values[d.id]||{}));}
export function chooseAction(domainId, tier){
  const map={
    medical:{title:'진료·추적계획 확인',detail:'담당 의료진에게 미확정 진료·결과 확인을 요청',category:'의료'},
    nursing:{title:'자가간호 교육 검토',detail:'필요한 교육 내용을 확인하고 쉬운 안내를 작성',category:'간호'},
    medication:{title:'퇴원약 조정 확인',detail:'약물 목록 대조와 복약 안내를 처방권자·약사와 검토',category:'약료'},
    function:{title:'이동·일상생활 지원 검토',detail:'이동 보조·ADL 관련 교육과 필요한 지원 논의',category:'기능'},
    social:{title:'가정 복귀 지원 검토',detail:'실제 지원 가능 인력·이동·주거 장벽 확인',category:'사회환경'},
    continuity:{title:'후속관리·연락체계 정리',detail:'확정된 방문 일정과 문의처를 환자에게 전달',category:'연속성'}
  };
  if(tier===0)return null;
  return map[domainId];
}
export const TIER_LABELS=['추가 지원 미확인','일반 안내 검토','추가 지원 검토','퇴원 전 우선 검토'];
