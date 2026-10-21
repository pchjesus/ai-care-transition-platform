// A2 v0.5 approved baseline mirrored for a read-only A3 simulation.
// NOT connected to a live A2 browser state or clinical record.
export const DOMAINS = [
 {id:'medical',title:'의료',fields:[
  ['followup','퇴원 후 외래·추적 계획',1,[['confirmed','확정됨',0],['routine','일반 추적 검토',1],['pending','미확정·조정 필요',2]]],
  ['condition','퇴원 직전 상태 관련 검토',1,[['reviewed','담당의 확인 완료',0],['needsReview','추가 확인 필요',2],['unresolved','퇴원 전 우선 확인할 사항 있음',3]]],
  ['warningGuide','문제 발생 시 안내·문의처',1,[['approved','안내 승인됨',0],['draft','안내 수정 필요',1],['missing','안내 준비되지 않음',2]]],
  ['testResults','남아 있는 검사·결과 확인',0,[['none','미결과 없음',0],['plan','추적 계획 있음',1],['pending','확인 책임자·일정 미정',2]]],
  ['complexity','동반질환·추적진료 조정',0,[['ordinary','추가 조정 없음',0],['multi','여러 진료일정 조정',1],['unresolved','진료 간 조정 필요',2]]]
 ]},
 {id:'nursing',title:'간호',fields:[
  ['selfCare','가정 내 자가간호 수행',1,[['independent','설명 후 스스로 가능',0],['training','재교육·확인 필요',1],['help','일부 도움이 필요',2],['unable','수행 불가능·대체 지원 필요',3]]],
  ['wound','드레싱·상처관리 계획',1,[['notNeeded','해당 없음',0],['approved','관리법 안내 승인됨',1],['needsReview','교육 또는 담당자 확인 필요',2]]],
  ['education','퇴원교육 이해 확인',1,[['documented','내용 확인 기록됨',0],['partial','추가 설명이 필요',1],['notDone','미시행·재교육 필요',2]]],
  ['careDevice','기구·처치 관련 관리',0,[['none','해당 없음',0],['guided','개인별 사용 안내 있음',1],['unguided','안내 자료 확인 필요',2]]],
  ['symptomMonitoring','집에서 관찰할 내용',0,[['notNeeded','별도 관찰 항목 없음',0],['approved','관찰 안내 있음',1],['unclear','관찰 항목·문의기준 미확정',2]]]
 ]},
 {id:'medication',title:'약료',fields:[
  ['reconciliation','퇴원약 목록 조정(대조)',1,[['complete','대조 완료',0],['pending','대조 미완료',2],['conflict','목록 간 상충·확인 요청',3]]],
  ['medUnderstanding','약물 변경·복약 교육',1,[['confirmed','이해 확인됨',0],['review','재설명 필요',1],['missing','교육 미실시·안내 누락',2]]],
  ['administration','퇴원 후 약물 관리 도움',1,[['independent','스스로 관리 가능',0],['help','보조 인력·보호자 도움 필요',2],['unable','실행 담당자 미확보',3]]],
  ['access','약 수령·구입 계획',0,[['secured','확인됨',0],['uncertain','확인 필요',1],['barrier','구입·수령에 제약 있음',2]]],
  ['changes','퇴원 전후 약물 변경',0,[['none','없음',0],['documented','변경내역 문서화됨',1],['unclear','변경 내역 확인 필요',2]]]
 ]},
 {id:'function',title:'기능',fields:[
  ['gait','보행/이동',1,[['independent','독립 이동',0],['device','보조기 사용',2],['assistance','인적 도움 필요',3]]],
  ['transfer','침대·의자 등 이동',1,[['independent','독립 가능',0],['supervision','감독 필요',1],['assistance','인적 도움 필요',3]]],
  ['adl','기본 일상생활 수행(ADL)',1,[['independent','독립적',0],['partial','일부 도움 필요',2],['dependent','상당한 도움 필요',3]]],
  ['iadl','도구적 일상생활(IADL)',0,[['independent','독립 가능',0],['someHelp','일부 지원 필요',1],['dependent','지속 지원 필요',2]]],
  ['assistDevice','보조기 사용방법 확인',0,[['notNeeded','해당 없음',0],['approved','개인별 안내 확인됨',1],['needsTeaching','재교육·조정 필요',2]]]
 ]},
 {id:'social',title:'사회환경',fields:[
  ['caregiver','도움이 필요한 시간대의 지원',1,[['available','충분히 확보됨',0],['limited','시간·범위가 제한됨',2],['none','확보되지 않음',2]]],
  ['housing','실제 가정 내 이동 환경',1,[['accessible','현 이동능력에 적합',0],['needsCheck','현장 확인 필요',1],['barrier','이동 장벽 확인됨',2]]],
  ['travel','퇴원 후 통원·이동 수단',1,[['available','이동 수단 확보',0],['someBarrier','이용 제약 있음',2],['unavailable','대안 마련 필요',3]]],
  ['living','생활·동거 상황',0,[['withSupport','필요 지원 확보',0],['aloneSupported','독거·지원 확보됨',0],['aloneNoSupport','독거·지원 공백 확인',2]]],
  ['cost','지원 이용 비용·접근 제약',0,[['noBarrier','확인된 제약 없음',0],['needsInfo','지원정보 안내 필요',1],['costBarrier','비용상 장벽 호소',2]]]
 ]},
 {id:'continuity',title:'돌봄 연속성',fields:[
  ['appointment','후속 외래·진료 약속',1,[['confirmed','예약 확인됨',0],['notNeeded','추적 불필요 확인',0],['pending','아직 미확정',2]]],
  ['contact','환자가 연락할 담당·문의처',1,[['documented','연락처 안내 완료',0],['missing','미확인·안내 누락',2]]],
  ['dischargeEducation','최종 퇴원안내 전달',1,[['completed','전달·확인 완료',0],['needsReview','변경내용 재설명 필요',1],['notSent','전달 전',2]]],
  ['referral','지역사회 서비스 의뢰 상태',0,[['notNeeded','의뢰 불필요 판단',0],['draft','의뢰 검토 중',1],['requested','모의 신청·접수 단계',2]]],
  ['consent','공적 지원 신청 동의 상태',0,[['notApplicable','해당 없음',0],['secured','동의 확인됨',0],['notYet','동의 확인 전',2]]]
 ]},
];
export const CASES=[
 {id:'SYN-001',name:'이정희',age:75,context:'근골격계 수술 후 퇴원',discharge:'2026-10-21',values:{medical:{followup:'confirmed',condition:'reviewed',warningGuide:'approved',testResults:'plan',complexity:'ordinary'},nursing:{selfCare:'training',wound:'approved',education:'partial',careDevice:'guided',symptomMonitoring:'approved'},medication:{reconciliation:'complete',medUnderstanding:'review',administration:'independent',access:'secured',changes:'documented'},function:{gait:'device',transfer:'supervision',adl:'partial',iadl:'someHelp',assistDevice:'needsTeaching'},social:{caregiver:'limited',housing:'barrier',travel:'someBarrier',living:'withSupport',cost:'needsInfo'},continuity:{appointment:'confirmed',contact:'documented',dischargeEducation:'needsReview',referral:'draft',consent:'notYet'}}},
 {id:'SYN-002',name:'윤미경',age:68,context:'근골격계 치료 후 퇴원',discharge:'2026-10-23',values:{medical:{followup:'confirmed',condition:'reviewed',warningGuide:'approved',testResults:'none',complexity:'ordinary'},nursing:{selfCare:'independent',wound:'notNeeded',education:'documented',careDevice:'none',symptomMonitoring:'notNeeded'},medication:{reconciliation:'complete',medUnderstanding:'confirmed',administration:'independent',access:'secured',changes:'none'},function:{gait:'independent',transfer:'independent',adl:'independent',iadl:'independent',assistDevice:'notNeeded'},social:{caregiver:'available',housing:'accessible',travel:'available',living:'withSupport',cost:'noBarrier'},continuity:{appointment:'confirmed',contact:'documented',dischargeEducation:'completed',referral:'notNeeded',consent:'notApplicable'}}},
 {id:'SYN-003',name:'최도현',age:79,context:'퇴원자료 미완성',discharge:'2026-10-24',values:{medical:{followup:'pending',condition:'needsReview',warningGuide:'missing',testResults:'pending',complexity:'unresolved'},nursing:{selfCare:'help',wound:'needsReview',education:null,careDevice:'unguided',symptomMonitoring:'unclear'},medication:{reconciliation:'conflict',medUnderstanding:null,administration:'help',access:'uncertain',changes:'unclear'},function:{gait:'assistance',transfer:null,adl:'dependent',iadl:'dependent',assistDevice:'needsTeaching'},social:{caregiver:null,housing:'needsCheck',travel:'unavailable',living:'aloneNoSupport',cost:'costBarrier'},continuity:{appointment:null,contact:'missing',dischargeEducation:'notSent',referral:'draft',consent:'notYet'}}}
];
export const SECTIONS=[
 {id:'today',label:'오늘 해야 할 일',domain:'nursing',defaultText:'퇴원 전 받은 자가관리 안내문을 확인해 주세요.'},
 {id:'medication',label:'복약·약물 안내',domain:'medication',defaultText:'퇴원 시 확인된 약물 목록과 의료진 안내를 확인하세요. 복용 방법이 불확실하면 담당 의료진 또는 약사에게 문의하세요.'},
 {id:'followup',label:'외래·검사 일정',domain:'medical',defaultText:'퇴원 안내문에서 확정된 다음 진료 일정을 확인해 주세요.'},
 {id:'warning',label:'주의사항',domain:'medical',defaultText:'개인별 주의사항은 승인된 안내문을 확인하고, 위급한 경우에는 119에 연락하세요.'},
 {id:'contact',label:'도움이 필요할 때',domain:'continuity',defaultText:'퇴원 시 안내받은 담당 의료기관의 공식 문의처를 확인하세요.'},
 {id:'support',label:'생활·이동 지원',domain:'social',defaultText:'이동과 돌봄에 도움이 필요한 경우 병원 상담 담당자와 확인해 주세요.'}
];

// Fourth patient is unique to the A3 teaching prototype, never inserted into the approved A2 v0.5.
CASES.push({id:'SYN-004',name:'한서윤',age:72,context:'퇴원 후 외래 일정 변경',discharge:'2026-10-25',values:structuredClone(CASES[1].values)});
