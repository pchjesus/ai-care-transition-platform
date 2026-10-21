import {REVIEW_DOMAINS} from '../shared/assessment-adapter.js';
export const DOMAINS=REVIEW_DOMAINS;
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
