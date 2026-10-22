// Every record is fictional. These IDs are references for the teaching prototype only.
const record=(patient,suffix,title,domain,fields,sections,verificationStatus,summary,detail,observedAt='2026-10-21 09:00')=>({
 id:`SRC-${patient.replace('SYN-','SYN')}-${suffix}`,patientId:patient,encounterId:`ENC-${patient.replace('SYN-','SYN')}-01`,title,domain,
 fieldRefs:fields,sections,verificationStatus,sourceType:'synthetic_demo_record',observedAt,documentVersion:'1',isSynthetic:true,summary,detail
});
const base=(patient)=>[
 record(patient,'MED-01','퇴원약 목록 대조 기록','medication',['medication.reconciliation','medication.medUnderstanding'],['medication'],'CONFIRMED','퇴원약 대조 검토 기록.','개별 약물명·용량은 포함하지 않으며 시연에서는 대조 여부만 확인합니다.'),
 record(patient,'NUR-01','퇴원교육 이해 확인지','nursing',['nursing.education','nursing.selfCare'],['today'],'CONFIRMED','자가관리 안내와 이해 확인 기록.','안내 내용을 환자에게 다시 설명하고 이해 여부를 확인하는 사례입니다.'),
 record(patient,'APT-01','외래 예약 확인서','medical',['medical.followup','continuity.appointment'],['followup'],'CONFIRMED','가상 외래 후속관리 예약 확인.','이 문서는 실제 병원 예약을 뜻하지 않습니다. 구체적 진료 시각을 생성하지 않았습니다.'),
 record(patient,'WARN-01','주의사항 검토 기록','medical',['medical.warningGuide','medical.condition'],['warning'],'CONFIRMED','담당 진료팀의 개인별 주의사항 검토.','구체적인 진단·지시를 자동 생성하지 않고 확인된 안내문의 존재를 검토합니다.'),
 record(patient,'CON-01','문의 경로 안내 기록','continuity',['continuity.contact'],['contact'],'CONFIRMED','퇴원 후 문의 경로를 확인한 기록.','실제 병원 전화번호를 제공하지 않는 가상 문의 경로 자료입니다.'),
 record(patient,'SOC-01','가정 복귀·이동 상담 기록','social',['social.caregiver','social.housing','social.travel','function.gait'],['support'],'CONFIRMED','이동과 돌봄 지원 필요 사항을 검토.','기능 관찰 및 주거 지원 필요도 확인을 위해 사용됩니다.'),
 record(patient,'FUN-01','보행·이동 관찰 기록','function',['function.gait','function.transfer'],['today','support'],'CONFIRMED','이동 능력 및 보조기 안내 확인.','체중부하 허용 범위는 본 자료로 판단할 수 없습니다.'),
 record(patient,'NUR-02','퇴원 간호 교육 점검표','nursing',['nursing.education','nursing.selfCare'],['today'],'CONFIRMED','퇴원 자가관리 설명을 확인한 기록.','합성 교육 기록이며 구체적 의료 처치 지시는 포함하지 않습니다.'),
 record(patient,'NUR-03','생활 자가관리 안내 대조','nursing',['nursing.selfCare'],['today'],'CONFIRMED','가정에서 확인할 생활 안내문을 대조.','진단별 처치 방법은 별도의 임상 검토 대상입니다.'),
 record(patient,'MED-03','약물 안내문 이해 확인 기록','medication',['medication.medUnderstanding'],['medication'],'CONFIRMED','약물 안내문 이해 확인을 기록.','용량·횟수·복용 시간은 없는 가상 기록입니다.'),
 record(patient,'APT-02','외래 일정 안내 전달 기록','medical',['medical.followup'],['followup'],'CONFIRMED','후속 외래 관련 안내 전달 기록.','실제 예약 날짜·장소의 확정을 뜻하지 않습니다.'),
 record(patient,'WARN-02','퇴원 주의사항 재확인 기록','medical',['medical.warningGuide'],['warning'],'CONFIRMED','주의사항 안내문 확인 여부 기록.','증상별 임상 판단이나 처방은 포함하지 않습니다.'),
 record(patient,'FUN-02','이동 보조도구 교육 확인','function',['function.gait','function.assistDevice'],['support','today'],'CONFIRMED','보행 보조도구 사용 안내를 확인.','실제 보행 허용 범위는 추정하지 않습니다.'),
 record(patient,'SOC-02','가정 복귀 환경 상담 기록','social',['social.housing','social.caregiver','social.travel'],['support'],'CONFIRMED','돌봄 지원·이동·주거 환경 상담을 확인.','서비스 적격 여부나 접수 완료 의미가 아닙니다.'),
 record(patient,'CON-02','퇴원 후 문의 안내 전달 기록','continuity',['continuity.contact'],['contact'],'CONFIRMED','문의 경로에 관한 합성 안내 전달 확인.','실제 병원 연락처와 기관 연동은 제공하지 않습니다.'),
 record(patient,'EDU-01','보행보조기 교육자료 (예시)','function',['function.assistDevice'],['support'],'PENDING','환자 교육용 자료 내용 검토 대기.','자료를 읽어보는 것과 최종 PDF 첨부 승인은 별개의 절차입니다.')
];
const CASE_LIBRARY=[
 ...base('SYN-001').map(r=>r.id.endsWith('MED-01')?{...r,verificationStatus:'PENDING',summary:'복약 안내 원문과 대조 완료 여부를 추가 확인해야 합니다.'}:r),
 record('SYN-001','MED-02','약료 담당자 최종 확인 기록','medication',['medication.reconciliation','medication.medUnderstanding'],['medication'],'CONFIRMED','추가 대조를 거쳐 약료 안내 존재를 확인했습니다.','원천자료의 확인 기록에 기반해 계획을 검토하는 학습 예시입니다.'),
 ...base('SYN-002'),
 ...base('SYN-003').map(r=>r.domain==='medication'?{...r,verificationStatus:'CONFLICTING',summary:'서로 다른 퇴원약 목록이 존재해 아직 채택 불가.'}:r),
 record('SYN-003','MED-A','퇴원약 목록 A','medication',['medication.reconciliation'],['medication'],'CONFLICTING','원천 기록 A의 약물 대조 결과.','기록 B와 다르므로 어느 하나만 선택하여 해결할 수 없습니다.'),
 record('SYN-003','MED-B','퇴원약 목록 B','medication',['medication.reconciliation'],['medication'],'CONFLICTING','원천 기록 B의 약물 대조 결과.','기록 A와 상충하며 추가 확인 회신이 필요합니다.'),
 record('SYN-003','MED-C','약료 담당자 대조 완료 회신','medication',['medication.reconciliation','medication.medUnderstanding'],['medication'],'LOCKED','실습에서 추가 확인 절차를 진행하면 열리는 회신.','실습 버튼으로 가상 회신을 받은 다음 A2의 자료 상태도 수정하여 재인계해야 합니다.'),
 ...base('SYN-004'),
 record('SYN-004','APT-OLD','기존 발행 외래 일정 확인서','medical',['medical.followup','continuity.appointment'],['followup'],'CONFIRMED','기존 발행 계획 v1.0이 참조한 자료.','이전 발행 내용은 편집하지 않습니다.','2026-10-20 14:00'),
 record('SYN-004','APT-NEW','새 외래 일정 확인서','medical',['medical.followup','continuity.appointment'],['followup'],'CONFIRMED','후속 확인을 거친 새로운 가상 일정 기록.','새 버전의 외래 안내를 작성·승인하는 학습용입니다.','2026-10-21 10:00')
];
// Links are local, hand-authored study PDFs; they are not automatically attached to patient plans.
for(const rec of CASE_LIBRARY){
 if(rec.id==='SRC-SYN001-EDU-01')rec.exampleFile='examples/SYN-001_보행보조기_교육예시.pdf';
 if(rec.id==='SRC-SYN002-NUR-01')rec.exampleFile='examples/SYN-002_sample_care_plan.pdf';
 if(['SRC-SYN004-APT-OLD','SRC-SYN004-APT-NEW'].includes(rec.id))rec.exampleFile='examples/SYN-004_일정변경_확인예시.pdf';
 if(['SRC-SYN003-MED-A','SRC-SYN003-MED-B','SRC-SYN003-MED-C'].includes(rec.id))rec.exampleFile='examples/SYN-003_약료상충_비교예시.pdf';
}
export const SOURCE_LIBRARY=CASE_LIBRARY;
export const recordsForPatient=(id,unlocked=[])=>SOURCE_LIBRARY.filter(s=>s.patientId===id).map(s=>({...s,verificationStatus:s.verificationStatus==='LOCKED'&&unlocked.includes(s.id)?'CONFIRMED':s.verificationStatus}));
export const findSource=(id,patient,unlocked=[])=>recordsForPatient(patient,unlocked).find(s=>s.id===id)||null;
export function usableSource(s,targetType,target,caseId){
 if(!s||typeof caseId!=='string'||s.patientId!==caseId||s.encounterId!==`ENC-${caseId.replace('SYN-','SYN')}-01`||s.verificationStatus!=='CONFIRMED')return false;
 if(targetType==='item')return s.sections.includes(target);
 if(targetType!=='issue'||!target||typeof target.id!=='string')return false;
 return s.fieldRefs.some(f=>target.id===`ISS-${f.replace('.','-')}`)||(target.id==='ISS-plan-med-original'&&s.domain==='medication');
}
export const CASE_MISSIONS={
 'SYN-001':{title:'발행 전 보완',difficulty:'중간',description:'근거 확인과 6개 계획 항목 검토 후 승인·발행',steps:['발행 전 확인사항 열기','확인된 원천자료 연결','영역별 역할로 계획 검토','최종 승인자 역할로 발행']},
 'SYN-002':{title:'기본 안내 발행',difficulty:'쉬움',description:'0등급 평가에서도 기본 안내를 승인하고 발행',steps:['계획 미리보기','의료진 검토 요청','지정 승인자 승인','발행 후 환자 화면 확인']},
 'SYN-003':{title:'누락·상충 해결',difficulty:'어려움',description:'충돌 기록 비교, 추가 회신, A2 수정과 재인계',steps:['충돌 기록 A/B 비교','가상 약료 확인 회신 받기','A2 값 수정·인계','남은 확인사항 보완']},
 'SYN-004':{title:'발행 이후 개정',difficulty:'중간',description:'기존 v1.0을 유지하면서 새 버전을 검토·발행',steps:['기존 발행본 확인','새 버전 개정','새 일정 기록 연결','재승인·발행 및 이력 비교']}
};
